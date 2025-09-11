// src/functions/src/index.ts

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Transaction, DocumentData } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { PDFDocument } from "pdf-lib";


// Use Chromium bundle that works on Firebase (no Chrome install needed)
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/** Optional dev bypass: set secret DEV_ADMIN_UID if you want one UID to bypass admin claims */
const DEV_ADMIN_UID_SECRET = defineSecret("DEV_ADMIN_UID");

// Init Admin SDK once
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const bucket = getStorage().bucket();

// --- SHARED HELPERS ---

const seller = {
    name: "RizeUp Ventures, LLC",
    dba: "DBA Dolphin Chasers",
    addr1: "PO BOX 66741",
    addr2: "St Pete Beach, FL 33706",
    phone: "616-318-1991",
    email: "admin@rizeupventures.com"
};

const num = (x: any): number => (typeof x === "number" ? x : Number(x || 0));
const fmtUSD = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtDateUTC = (d?: Date): string => d ? d.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '';
const safe = (s: any): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

async function getBuyerData(dealerId?: string): Promise<any> {
    if (!dealerId) return { name: "Dealer (unassigned)" };
    try {
        const userSnap = await db.collection("users").doc(dealerId).get();
        if (userSnap.exists) {
            const u = userSnap.data() || {};
            return {
                name: u.companyName || u.contactName || u.displayName || u.email || u.uid,
                line1: u.streetAddress || u.address || u.street || "",
                line2: [u.city, u.state, u.zip].filter(Boolean).join(", "),
                phone: u.phone || "",
                email: u.email || "",
            };
        }
    } catch (error) {
        console.warn(`Could not fetch buyer data for dealerId ${dealerId}:`, error);
    }
    return { name: `Dealer ${dealerId} (not found)` };
}

async function logActivity(vin: string, entry: { type: string; message: string; meta?: any }) {
    if (!vin) return;
    try {
        const activityCol = db.collection("jackets").doc(vin).collection("activity");
        await activityCol.add({
            ...entry,
            ts: FieldValue.serverTimestamp(),
            // In a Cloud Function, there is no `auth` context unless it's a Callable function.
            // We can't log the actor automatically here for onRequest functions.
            actor: "System" 
        });
    } catch (error) {
        console.error(`Failed to log activity for VIN ${vin}:`, error);
    }
}


/** Require admin privileges (claims), with optional DEV UID bypass via secret. */
function assertAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  const devBypass = DEV_ADMIN_UID_SECRET.value(); // '' if not set
  if (devBypass && request.auth.uid === devBypass) return;

  const token: any = request.auth.token || {};
  const isAdmin = token.role === "admin" || token.admin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

/** Approve / deny dealer application (admin only) */
export const manageDealerApplication = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);

    const { uid, action } = request.data || {};
    if (!uid || !action || !["approve", "deny"].includes(String(action))) {
      throw new HttpsError(
        "invalid-argument",
        "Provide 'uid' and 'action' of 'approve' or 'deny'."
      );
    }

    const userDocRef = db.collection("users").doc(String(uid));
    try {
      await userDocRef.update({
        status: action === "approve" ? "approved" : "denied",
      });
      return { success: true, message: `User ${uid} has been ${action}d.` };
    } catch (err: any) {
      console.error("manageDealerApplication error:", err);
      throw new HttpsError("internal", err?.message || "Failed to manage application.");
    }
  }
);

/** Simple jacket ID generator (admin only) */
export const generateJacketId = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
  }
);

/**
 * Generate invoice PDF and store to:
 *   jacket-documents/{vin}/invoice.pdf
 * Update Firestore jacket with a 7-day URL in `invoiceUrl`.
 * Gen 2 HTTP function (v2) named generateJacketInvoice.
 * ✅ CORS enabled so your workspace URL can call it from the browser.
 */
export const generateJacketInvoice = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "1GiB",
    cors: true, // <— THIS fixes the CORS “failed to fetch”
  },
  async (req, res) => {
    try {
      if (req.method !== "POST" && req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim();
      const vin = rawVin.toUpperCase();
      if (!vin) {
        res.status(400).send("Missing 'vin'");
        return;
      }

      const docRef = db.collection("jackets").doc(vin);
      let snap = await docRef.get();
      if (!snap.exists) {
        res.status(404).send("Jacket not found");
        return;
      }
      let j: DocumentData = snap.data() || {};
      
      // If no invoice ID, generate one transactionally
      if (!j.invoiceId) {
        const counterRef = db.collection("counters").doc("invoices");
        await db.runTransaction(async (transaction: Transaction) => {
          const counterDoc = await transaction.get(counterRef);
          const newSeq = (counterDoc.data()?.seq || 0) + 1;
          
          transaction.set(counterRef, { seq: newSeq }, { merge: true });

          const now = new Date();
          const yyyy = now.getUTCFullYear();
          const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
          const paddedSeq = newSeq.toString().padStart(4, '0');
          const newInvoiceId = `INV-${yyyy}${mm}-${paddedSeq}`;

          transaction.update(docRef, { invoiceId: newInvoiceId });
          j.invoiceId = newInvoiceId; // Update local object
        });
      }
      
      const buyerData = await getBuyerData(j.dealerId);

      const auctionDue = num(j.itemPrice) + num(j.buyerFee) + num(j.onlineFee);
      const mgmtDue = num(j.managementFee);
      const miscTotal = Array.isArray(j.miscFees)
        ? j.miscFees.reduce((s: number, f: any) => s + num(f?.amount), 0)
        : 0;
      const subtotal = auctionDue + mgmtDue + miscTotal;
      const isMgmtFeePaid = j.isMgmtFeePaid ?? j.isMgmtPaid ?? false;
      const amountPaid = (j.isAuctionPaid ? auctionDue : 0) + (isMgmtFeePaid ? mgmtDue : 0);
      const balanceDue = Math.max(0, subtotal - amountPaid);

      const yearMakeModel = [j.year, j.make, j.model].filter(Boolean).join(" ");
      
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-size: 10px; color: #333; }
    .page { padding: 40px; }
    .header { text-align: left; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
    .header .company-name { font-size: 16px; font-weight: bold; }
    .header .company-dba { font-size: 11px; color: #777; }
    .header .company-contact { font-size: 9px; color: #555; margin-top: 4px; }
    .invoice-title { text-align: center; margin: 20px 0; }
    .invoice-title h1 { font-size: 28px; font-weight: 300; letter-spacing: 2px; margin: 0; }
    .invoice-meta { text-align: right; margin-bottom: 20px; font-size: 11px; }
    .meta-item { margin-bottom: 3px; }
    .addresses { display: -webkit-box; display: flex; -webkit-box-pack: justify; justify-content: space-between; margin-bottom: 30px; }
    .address-block { width: 48%; }
    .address-block h3 { margin: 0 0 5px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .address-block p { margin: 0; line-height: 1.6; }
    .item-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .item-table thead { background-color: #222; color: #fff; }
    .item-table th, .item-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    .item-table th:last-child, .item-table td:last-child { text-align: right; }
    .item-table .vehicle-desc { font-weight: bold; }
    .summary-table { width: 40%; margin-left: 60%; border-collapse: collapse; }
    .summary-table td { padding: 8px; }
    .summary-table td:last-child { text-align: right; }
    .summary-table .total-row td { font-weight: bold; border-top: 2px solid #333; font-size: 12px; }
    .signatures { margin: 40px 0; }
    .signatures p { font-size: 10px; color: #555; }
    .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
    .footer p { margin: 2px 0; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company-name">${safe(seller.name)}</div>
    <div class="company-dba">${safe(seller.dba)}</div>
    <div class="company-contact">${safe(seller.phone)} | ${safe(seller.email)}</div>
  </div>

  <div class="invoice-title">
    <h1>INVOICE</h1>
    <div class="invoice-meta">
      <div class="meta-item"><strong>Invoice ID:</strong> ${safe(j.invoiceId)}</div>
      <div class="meta-item"><strong>Jacket #:</strong> ${safe(j.jacketId || '—')}</div>
      <div class="meta-item"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div class="meta-item"><strong>VIN:</strong> ${safe(vin)}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>SOLD FROM</h3>
      <p><strong>${safe(seller.name)}</strong></p>
      <p>${safe(seller.addr1)}</p>
      <p>${safe(seller.addr2)}</p>
      <p>Phone: ${safe(seller.phone)}</p>
      <p>Email: ${safe(seller.email)}</p>
    </div>
    <div class="address-block">
      <h3>SOLD TO</h3>
      <p><strong>${safe(buyerData.name)}</strong></p>
      ${buyerData.line1 ? `<p>${safe(buyerData.line1)}</p>` : ''}
      ${buyerData.line2 ? `<p>${safe(buyerData.line2)}</p>` : ''}
      ${buyerData.phone ? `<p>Phone: ${safe(buyerData.phone)}</p>` : ''}
      ${buyerData.email ? `<p>Email: <a href="mailto:${safe(buyerData.email)}">${safe(buyerData.email)}</a></p>` : ''}
    </div>
  </div>

  <table class="item-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="vehicle-desc">${safe(yearMakeModel)} — VIN: ${safe(vin)}</td>
        <td>${fmtUSD(num(j.itemPrice))}</td>
      </tr>
      ${num(j.buyerFee) > 0 ? `<tr><td>Buyer Fee</td><td>${fmtUSD(num(j.buyerFee))}</td></tr>` : ''}
      ${num(j.onlineFee) > 0 ? `<tr><td>Online Fee</td><td>${fmtUSD(num(j.onlineFee))}</td></tr>` : ''}
      <tr><td>Management Fee</td><td>${fmtUSD(num(j.managementFee))}</td></tr>
      ${Array.isArray(j.miscFees) ? j.miscFees.map((f: any) =>
        `<tr><td>${safe(f?.description || "Misc Fee")}</td><td>${fmtUSD(num(f?.amount))}</td></tr>`
      ).join('') : ''}
    </tbody>
  </table>

  <table class="summary-table">
    <tbody>
      <tr>
        <td>Total</td>
        <td>${fmtUSD(subtotal)}</td>
      </tr>
      <tr>
        <td>Amount Paid</td>
        <td>${fmtUSD(amountPaid)}</td>
      </tr>
      <tr class="total-row">
        <td>Balance Due</td>
        <td>${fmtUSD(balanceDue)}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
      <p>Authorized Seller Signature: _________________________ &nbsp;&nbsp;&nbsp;&nbsp; Authorized Buyer Signature: _________________________</p>
      <p style="margin-top: 5px;">(Signature on File)</p>
  </div>

  <div class="footer">
    <p>${safe(seller.name)} • ${safe(seller.addr1)}, ${safe(seller.addr2)} • ${safe(seller.phone)} • ${safe(seller.email)}</p>
    <p>ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES.</p>
    <p>ALL PAYMENTS MUST BE MADE BY WIRE, PAYABLE TO: RIZEUP VENTURES, LLC.</p>
    <p>Unit purchase price and other fees applicable to unit sale are due immediately. A late payment fee of 3% will be applied to any overdue invoice. If units are not picked up within 10 business days, a storage fee will be applied to each unit, per day.</p>
  </div>
</div>
</body>
</html>`;

      // Launch Chromium that works on Firebase
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await browser.close();

      // Save to Storage
      const filePath = `jacket-documents/${vin}/invoice.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-store" },
      });

      // Signed URL (7 days)
      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires });

      await docRef.update({
        invoiceUrl: signedUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      await logActivity(vin, {
          type: "invoiceGenerated",
          message: `Invoice generated ${j.invoiceId ? "— " + j.invoiceId : ""}`,
          meta: { invoiceId: j.invoiceId, url: signedUrl }
      });

      res.status(200).json({ ok: true, vin, url: signedUrl, invoiceId: j.invoiceId });
    } catch (err: any) {
      console.error("generateJacketInvoice error:", err);
      res.status(500).send(err?.message || "Internal error");
    }
  }
);


/**
 * Generate Bill of Sale PDF.
 * This function is very similar to the invoice generator but creates a BoS.
 */
export const generateBillOfSale = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "1GiB",
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST" && req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim();
      const vin = rawVin.toUpperCase();
      if (!vin) {
        res.status(400).send("Missing 'vin'");
        return;
      }

      const docRef = db.collection("jackets").doc(vin);
      const snap = await docRef.get();
      if (!snap.exists) {
        res.status(404).send("Jacket not found");
        return;
      }
      const j: DocumentData = snap.data() || {};
      
      const buyerData = await getBuyerData(j.dealerId);

      const auctionDue = num(j.itemPrice) + num(j.buyerFee) + num(j.onlineFee);
      const mgmtDue = num(j.managementFee);
      const miscTotal = Array.isArray(j.miscFees) ? j.miscFees.reduce((s: number, f: any) => s + num(f?.amount), 0) : 0;
      const subtotal = auctionDue + mgmtDue + miscTotal;

      const saleDate = j.auctionSaleDate?.toDate()?.toLocaleDateString() || new Date().toLocaleDateString();
      const yearMakeModel = [j.year, j.make, j.model].filter(Boolean).join(" ");
      
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #333; }
    .page { padding: 40px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header .company-name { font-size: 18px; font-weight: bold; }
    .header .company-dba { font-size: 12px; color: #777; }
    .header .company-contact { font-size: 10px; color: #555; margin-top: 5px; }
    .title-block { text-align: center; margin: 20px 0; }
    .title-block h1 { font-size: 24px; font-weight: 500; letter-spacing: 1px; margin: 0; }
    .title-block .meta-id { font-size: 12px; color: #555; margin-top: 4px; }
    .party-block { display: -webkit-box; display: flex; -webkit-box-pack: justify; justify-content: space-between; margin: 30px 0; }
    .party { width: 48%; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    .party h3 { margin: 0 0 10px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .party p { margin: 0 0 4px; line-height: 1.5; }
    .vehicle-block { margin-bottom: 30px; }
    .vehicle-block table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
    .vehicle-block th, .vehicle-block td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    .vehicle-block th { background-color: #f9f9f9; width: 150px; }
    .consideration-block { margin-bottom: 30px; }
    .consideration-block p { line-height: 1.6; }
    .signatures { margin: 40px 0; padding-top: 20px; border-top: 1px solid #eee; }
    .signatures .sig-line { display: inline-block; width: 45%; margin-top: 40px; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; color: #555; }
    .signatures .sig-label { display: block; }
    .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
    .footer p { margin: 2px 0; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company-name">${safe(seller.name)}</div>
    <div class="company-dba">${safe(seller.dba)}</div>
    <div class="company-contact">${safe(seller.phone)} | ${safe(seller.email)}</div>
  </div>

  <div class="title-block">
    <h1>BILL OF SALE</h1>
    <div class="meta-id">
      Jacket #: ${safe(j.jacketId || '—')}
      ${j.invoiceId ? ` &nbsp;•&nbsp; Invoice ID: ${safe(j.invoiceId)}` : ''}
    </div>
  </div>

  <div class="party-block">
    <div class="party">
      <h3>SELLER</h3>
      <p><strong>${safe(seller.name)}</strong></p>
      <p>${safe(seller.addr1)}</p>
      <p>${safe(seller.addr2)}</p>
      <p>Phone: ${safe(seller.phone)}</p>
      <p>Email: ${safe(seller.email)}</p>
    </div>
    <div class="party">
      <h3>BUYER ("SOLD TO")</h3>
      <p><strong>${safe(buyerData.name)}</strong></p>
      ${buyerData.line1 ? `<p>${safe(buyerData.line1)}</p>` : ''}
      ${buyerData.line2 ? `<p>${safe(buyerData.line2)}</p>` : ''}
      ${buyerData.phone ? `<p>Phone: ${safe(buyerData.phone)}</p>` : ''}
      ${buyerData.email ? `<p>Email: ${safe(buyerData.email)}</p>` : ''}
    </div>
  </div>

  <div class="vehicle-block">
    <h3>VEHICLE INFORMATION</h3>
    <table>
      <tr><th>Vehicle</th><td>${safe(yearMakeModel)}</td></tr>
      <tr><th>VIN</th><td>${safe(vin)}</td></tr>
      <tr><th>Color</th><td>${safe(j.color)}</td></tr>
      <tr><th>Odometer</th><td>${j.odometer ? j.odometer.toLocaleString() : 'N/A'}</td></tr>
    </table>
  </div>
  
  <div class="consideration-block">
    <h3>CONSIDERATION</h3>
    <p>For the sum of <strong>${fmtUSD(subtotal)}</strong>, receipt of which is hereby acknowledged, the Seller sells and transfers to the Buyer the vehicle described above.</p>
    <p><strong>Date of Sale:</strong> ${safe(saleDate)}</p>
  </div>

  <div class="signatures">
    <div style="float: left;" class="sig-line">
      <span class="sig-label">Authorized Seller Signature</span>
      (Signature on File)
    </div>
    <div style="float: right;" class="sig-line">
      <span class="sig-label">Authorized Buyer Signature</span>
      (Signature on File)
    </div>
  </div>

  <div class="footer">
    <p>ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES.</p>
    <p>The undersigned seller affirms that they are the legal owner of the vehicle and have full authority to sell it. The vehicle is sold free and clear of all liens and encumbrances.</p>
  </div>
</div>
</body>
</html>`;

      // Launch Chromium
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await browser.close();

      // Save to Storage
      const filePath = `jacket-documents/${vin}/bill-of-sale.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-store" },
      });

      // Get Signed URL
      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires });

      // Update Firestore
      await docRef.update({
        bosUrl: signedUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      await logActivity(vin, {
          type: "bosGenerated",
          message: "Bill of Sale generated",
          meta: { url: signedUrl }
      });

      res.status(200).json({ ok: true, vin, url: signedUrl });
    } catch (err: any) {
      console.error("generateBillOfSale error:", err);
      res.status(500).send(err?.message || "Internal error");
    }
  }
);


export const generateJacketPacket = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 180,
    memory: "1GiB",
    cors: true,
  },
  async (req, res) => {
    try {
        if (req.method !== "POST" && req.method !== "GET") {
            res.status(405).send("Method Not Allowed");
            return;
        }

        const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim();
        const vin = rawVin.toUpperCase();
        if (!vin) {
            res.status(400).send("Missing 'vin'");
            return;
        }

        const docRef = db.collection("jackets").doc(vin);
        const snap = await docRef.get();
        if (!snap.exists) {
            res.status(404).send("Jacket not found");
            return;
        }
        
        const j = snap.data() || {};
        
        // Ensure invoice and BOS exist
        if (!j.invoiceUrl) {
             res.status(400).send("Invoice must be generated before creating a packet.");
             return;
        }
        if (!j.bosUrl) {
             res.status(400).send("Bill of Sale must be generated before creating a packet.");
             return;
        }
        
        const yearMakeModel = [j.year, j.make, j.model].filter(Boolean).join(" ");
        
        // 1. Generate Cover Page PDF
        const coverHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 80px; display: flex; flex-direction: column; justify-content: center; height: 100vh; text-align: center; }
    .title { font-size: 26px; font-weight: 800; letter-spacing: 1px; text-align:center; margin: 40px 0 20px; }
    .box { max-width: 520px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:10px; padding: 24px 28px; text-align: left; }
    .label { color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:.06em; margin-top:14px; }
    .value { font-size:16px; font-weight:600; margin-top:2px; }
    .footer { text-align:center; color:#6b7280; font-size:11px; position: absolute; bottom: 60px; left: 0; right: 0; line-height:1.5; }
  </style>
</head>
<body>
  <div>
    <h1 class="title">RIZEUP VENTURES DEALER JACKET</h1>
    <div class="box">
        <div class="label">Jacket #</div>
        <div class="value">${safe(j.jacketId || '—')}</div>
        <div class="label">Vehicle</div>
        <div class="value">${safe(yearMakeModel || '—')}</div>
        <div class="label">VIN</div>
        <div class="value">${safe(vin)}</div>
        <div class="label">Make</div>
        <div class="value">${safe(j.make || '—')}</div>
        <div class="label">Model</div>
        <div class="value">${safe(j.model || '—')}</div>
        <div class="label">Year</div>
        <div class="value">${safe(j.year || '—')}</div>
    </div>
  </div>
  <div class="footer">
    RizeUp Ventures, LLC • PO BOX 66741 • St Pete Beach, FL 33706<br/>616-318-1991 • admin@rizeupventures.com
  </div>
</body>
</html>`;
        
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(coverHtml, { waitUntil: "networkidle0" });
        const coverPdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        // 2. Fetch existing PDFs from storage
        const invoicePath = `jacket-documents/${vin}/invoice.pdf`;
        const bosPath = `jacket-documents/${vin}/bill-of-sale.pdf`;
        
        const [invoiceFile] = await bucket.file(invoicePath).download();
        const [bosFile] = await bucket.file(bosPath).download();

        // 3. Merge PDFs using pdf-lib
        const packetDoc = await PDFDocument.create();
        
        // Cover Page
        const coverPdf = await PDFDocument.load(coverPdfBuffer);
        const [coverPage] = await packetDoc.copyPages(coverPdf, [0]);
        packetDoc.addPage(coverPage);

        // Invoice
        const invoicePdf = await PDFDocument.load(invoiceFile);
        const [invoicePage] = await packetDoc.copyPages(invoicePdf, [0]);
        packetDoc.addPage(invoicePage);

        // Bill of Sale
        const bosPdf = await PDFDocument.load(bosFile);
        const [bosPage] = await packetDoc.copyPages(bosPdf, [0]);
        packetDoc.addPage(bosPage);
        
        // Add other documents from the jacket's `documents` array
        if (j.documents && Array.isArray(j.documents)) {
            for (const doc of j.documents) {
                if (doc.url && doc.name.toLowerCase().endsWith('.pdf')) {
                    try {
                        const url = new URL(doc.url);
                        const pathName = url.pathname;
                        const prefix = `/v0/b/${bucket.name}/o/`;
                        if (pathName.startsWith(prefix)) {
                            const filePath = decodeURIComponent(pathName.substring(prefix.length));
                            console.log(`Adding ${filePath} to packet...`);
                            const [fileBuffer] = await bucket.file(filePath).download();
                            const docPdf = await PDFDocument.load(fileBuffer);
                            const copiedPages = await packetDoc.copyPages(docPdf, docPdf.getPageIndices());
                            copiedPages.forEach(page => packetDoc.addPage(page));
                        }
                    } catch (e) {
                         console.warn(`Could not add document ${doc.name} to packet:`, e);
                    }
                }
            }
        }

        const packetBytes = await packetDoc.save();

        // 4. Save the merged PDF to storage
        const packetPath = `jacket-documents/${vin}/packet.pdf`;
        const packetFile = bucket.file(packetPath);
        await packetFile.save(packetBytes, {
            contentType: "application/pdf",
            resumable: false,
            metadata: { cacheControl: "private, max-age=0, no-store" },
        });

        // 5. Get signed URL and update Firestore
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const [signedUrl] = await packetFile.getSignedUrl({ action: "read", expires });

        await docRef.update({
            packetUrl: signedUrl,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(vin, {
            type: "packetGenerated",
            message: "Packet generated (cover + invoice + BOS)",
            meta: { url: signedUrl }
        });

        res.status(200).json({ ok: true, vin, url: signedUrl });
    } catch (err: any) {
        console.error("generateJacketPacket error:", err);
        res.status(500).send(err?.message || "Internal error");
    }
  }
);

    