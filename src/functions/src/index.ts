// src/functions/src/index.ts

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Transaction, DocumentData } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { PDFDocument } from "pdf-lib";
import { GoogleGenerativeAI } from "@google/generative-ai";


// Use Chromium bundle that works on Firebase (no Chrome install needed)
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/** Optional dev bypass: set secret DEV_ADMIN_UID if you want one UID to bypass admin claims */
const DEV_ADMIN_UID_SECRET = defineSecret("DEV_ADMIN_UID");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");


// Init Admin SDK once
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();


// --- SHARED HELPERS ---

const seller = {
    name: "RizeUp Ventures, LLC",
    dba: "DBA Dolphin Chasers",
    addr1: "PO BOX 66741",
    addr2: "St Pete Beach, FL 33706",
    phone: "616-318-1991",
    email: "admin@rizeupventures.com"
};

const num = (x: any): number => {
    if (typeof x === 'number') return x;
    if (typeof x === 'string') {
        const parsed = parseFloat(x.replace(/[$,]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};
const fmtUSD = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtDateUTC = (d?: Date): string => d ? d.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '';
const safe = (s: any): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function buildCoverHtml(opts: {
  jacketId?: string; vin: string; year?: number; make?: string; model?: string;
}) {
  const { jacketId, vin, year, make, model } = opts;
  const ymm = [year, make, model].filter(Boolean).join(" ") || "—";
  const jn = jacketId || "—";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { height:100%; }
    body { margin:0; font-family: Arial, sans-serif; color:#111; }
    .page {
      min-height: 100vh;
      padding: 72px;
      display:flex; align-items:center; justify-content:center;
      box-sizing: border-box;
    }
    .grid {
      width: 82%;
      max-width: 700px;
      border: 2px solid #111;
      border-radius: 12px;
      padding: 32px 40px;
      box-sizing: border-box;
      background-image:
        linear-gradient(#eef2f7 1px, transparent 1px),
        linear-gradient(90deg, #eef2f7 1px, transparent 1px);
      background-size: 24px 24px;
      background-position: center center;
    }
    .title {
      text-align:center; font-size: 26px; font-weight: 800; letter-spacing: .8px;
      margin: 0 0 14px 0;
    }
    .subtitle {
      text-align:center; font-size: 12px; color:#6b7280; margin: 0 0 22px 0;
    }
    .kv {
      margin: 8px auto 10px auto; max-width: 520px;
      display:grid; grid-template-columns: 1fr; row-gap: 10px;
    }
    .label { font-size: 11px; color:#6b7280; text-transform:uppercase; letter-spacing:.06em; }
    .value { font-size: 16px; font-weight: 600; color:#111; margin-top: 2px; }
    .toc { margin: 18px auto 0 auto; max-width: 520px; text-align:left; }
    .toc h3 {
      margin: 8px 0 4px 0; font-size: 12px; color:#6b7280; text-transform:uppercase; letter-spacing:.06em; text-align:center;
    }
    .toc ul { list-style: disc; padding-left: 24px; margin: 8px auto 0 auto; width: fit-content; }
    .footer {
      margin: 28px auto 0 auto; max-width: 520px;
      text-align:center; color:#6b7280; font-size: 11px; line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="grid">
      <div class="title">RIZEUP VENTURES DEALER JACKET</div>
      <div class="subtitle">Professional packet for your records</div>

      <div class="kv">
        <div>
          <div class="label">Jacket Number</div>
          <div class="value">${safe(jn)}</div>
        </div>
        <div>
          <div class="label">Vehicle</div>
          <div class="value">${safe(ymm)}</div>
        </div>
        <div>
          <div class="label">VIN</div>
          <div class="value">${safe(vin)}</div>
        </div>
        <div>
          <div class="label">Make</div>
          <div class="value">${safe(make || "—")}</div>
        </div>
        <div>
          <div class="label">Model</div>
          <div class="value">${safe(model || "—")}</div>
        </div>
        <div>
          <div class="label">Year</div>
          <div class="value">${year ? safe(year) : "—"}</div>
        </div>
      </div>

      <div class="toc">
        <h3>Jacket Includes</h3>
        <ul>
          <li>Invoice</li>
          <li>Bill of Sale</li>
        </ul>
      </div>

      <div class="footer">
        RizeUp Ventures, LLC • PO BOX 66741 • St Pete Beach, FL 33706 • 616-318-1991 • admin@rizeupventures.com<br/>
        ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES.<br/>
        ALL PAYMENTS MUST BE MADE BY WIRE, PAYABLE TO: RIZEUP VENTURES, LLC.
      </div>
    </div>
  </div>
</body>
</html>`;
}


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
            actor: "System" 
        });
    } catch (error) {
        console.error(`Failed to log activity for VIN ${vin}:`, error);
    }
}

function assertAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  const devBypass = DEV_ADMIN_UID_SECRET.value();
  if (devBypass && request.auth.uid === devBypass) return;

  const token: any = request.auth.token || {};
  const isAdmin = token.role === "admin" || token.admin === true;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

function getGeminiModel() {
    const key = GEMINI_API_KEY.value();
    if (!key) throw new Error("GEMINI_API_KEY missing");
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}


// --- ADMIN CALLABLE FUNCTIONS ---

export const startInvoiceParse = onRequest(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: [GEMINI_API_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    const { gcsPath } = req.body;
    if (!gcsPath) {
      res.status(400).send({ error: "Missing gcsPath" });
      return;
    }

    try {
      const file = bucket.file(gcsPath);
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).send({ error: "File not found at gcsPath" });
        return;
      }
      
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || "application/pdf";

      let text = "";
      if (contentType.includes("pdf")) {
        const pdfParse = (await import("pdf-parse")).default;
        const [buffer] = await file.download();
        const data = await pdfParse(buffer);
        text = data.text;
      } else if (contentType.includes("image")) {
        res.status(400).send({ error: "Images not supported yet in MVP" });
        return;
      } else {
        res.status(400).send({ error: `Unsupported content type: ${contentType}` });
        return;
      }

      if (!text.trim()) {
        throw new Error("Extracted text is empty.");
      }

      // Call Gemini
      const model = getGeminiModel();
      const prompt = `
       You are an invoice extraction agent for NPA-style auction invoices.
       Return STRICT JSON only matching this schema:
       {
         "invoiceMeta": { "aucNo": "string?", "saleLocation": "string?" },
         "units": [{
           "vin": "string",
           "year": "number?",
           "make": "string?",
           "model": "string?",
           "color": "string?",
           "hours": "number?",
           "odometer": "number?",
           "saleLocation": "string?",
           "itemPrice": "number?",
           "buyerFee": "number?",
           "onlineFee": "number?",
           "titleInfo": "string?",
           "stockNo": "string?",
           "aucNo": "string?"
         }]
       }
       Normalize: VIN uppercase, numbers bare (no $ or commas).
       Text:
       """${text.substring(0, 20000)}"""
     `;
     
     const result = await model.generateContent(prompt);
     const raw = result.response?.text() || "{}";
     let extracted: any = {};
     try {
       extracted = JSON.parse(raw);
     } catch (e) {
        console.error("Failed to parse JSON from LLM response:", raw);
        throw new Error("LLM output was not valid JSON.");
     }

      const units = Array.isArray(extracted?.units) ? extracted.units : [];
      if (units.length === 0) {
        throw new Error("Parsed data does not contain a 'units' array.");
      }
      for (const u of units) { if (u && u.managementFee == null) u.managementFee = 100; }
      
      // Write to Firestore
      const stagingId = db.collection("stagingInvoices").doc().id;
      const [fileUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      
      const uploaderUid = gcsPath.split('/')[1];

      await db.collection("stagingInvoices").doc(stagingId).set({
        source: "npa",
        gcsPath,
        fileUrl,
        rawText: text,
        createdAt: FieldValue.serverTimestamp(),
        uploaderUid: uploaderUid || null,
        ...(extracted.invoiceMeta || {}),
      });

      const unitsCollection = db.collection("stagingInvoices").doc(stagingId).collection("units");
      for (const unit of units) {
        if (!unit.vin) continue;
        const normalizedUnit = {
          ...unit,
          vin: unit.vin.trim().toUpperCase(),
          itemPrice: num(unit.itemPrice),
          buyerFee: num(unit.buyerFee),
          onlineFee: num(unit.onlineFee),
        };
        await unitsCollection.add(normalizedUnit);
      }

      res.status(200).json({ ok: true, stagingId, unitsCount: units.length });

    } catch (err: any) {
      console.error(`Error in startInvoiceParse for ${gcsPath}:`, err);
      res.status(500).send({ error: err.message || "An internal error occurred." });
    }
  }
);

export const startDocParse = onRequest(
  {
    region: "us-central1",
    cors: true
  },
  (req, res) => {
    res.status(501).send({ error: "Not implemented yet" });
  }
);

export const createJacketFromUnit = onCall({
    region: "us-central1",
    secrets: [DEV_ADMIN_UID_SECRET]
}, async (request) => {
    assertAdmin(request);
    const { stagingId, unitId } = request.data;
    if (!stagingId || !unitId) {
        throw new HttpsError("invalid-argument", "stagingId and unitId are required.");
    }

    const unitRef = db.collection('stagingInvoices').doc(stagingId).collection('units').doc(unitId);
    const unitSnap = await unitRef.get();
    if (!unitSnap.exists) {
        throw new HttpsError("not-found", "Staged unit not found.");
    }
    const unit = unitSnap.data() as any;
    const vin = unit.vin?.trim().toUpperCase();
    if (!vin) {
        throw new HttpsError("failed-precondition", "Staged unit has no VIN.");
    }
    
    const jacketRef = db.collection('jackets').doc(vin);
    
    await db.runTransaction(async (transaction) => {
        const jacketSnap = await transaction.get(jacketRef);
        
        const jacketData: any = {
            vin: vin,
            year: num(unit.year),
            make: unit.make || "",
            model: unit.model || "",
            color: unit.color || "",
            odometer: num(unit.odometer) || num(unit.hours) || 0,
            saleLocation: unit.saleLocation || "",
            itemPrice: num(unit.itemPrice),
            buyerFee: num(unit.buyerFee),
            onlineFee: num(unit.onlineFee),
            managementFee: num(unit.managementFee) || 100,
            auctionSaleDate: FieldValue.serverTimestamp(), // Placeholder
            isAuctionPaid: false,
            isMgmtFeePaid: false,
            miscFees: [],
            documents: [],
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (!jacketSnap.exists) {
            jacketData.createdAt = FieldValue.serverTimestamp();
            jacketData.jacketId = `J${Date.now()}`;
            transaction.set(jacketRef, jacketData);
        } else {
            transaction.update(jacketRef, jacketData);
        }
    });

    return { success: true, path: jacketRef.path };
});

export const attachStagedDocToJacket = onCall({
    region: "us-central1",
    secrets: [DEV_ADMIN_UID_SECRET]
}, async (request) => {
    assertAdmin(request);
    const { docId, vin, typeOverride } = request.data;
    if (!docId || !vin) {
        throw new HttpsError("invalid-argument", "docId and vin are required.");
    }

    const stagedDocRef = db.collection('stagedDocs').doc(docId);
    const stagedDocSnap = await stagedDocRef.get();
    if (!stagedDocSnap.exists) {
        throw new HttpsError("not-found", "Staged document not found.");
    }
    const stagedDoc = stagedDocSnap.data() as any;
    
    const gcsPath = stagedDoc.gcsPath;
    const fileName = gcsPath.split('/').pop();
    const docType = typeOverride || stagedDoc.type || 'other';
    const newPath = `jacket-documents/${vin}/${docType}/${fileName}`;

    await storage.bucket(stagedDoc.gcsPath.split('/')[2]).file(gcsPath.split('/').slice(3).join('/')).move(newPath);

    const newFile = bucket.file(newPath);
    const [signedUrl] = await newFile.getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    const newDocument = {
        id: `doc-${Date.now()}`,
        name: fileName,
        type: docType,
        url: signedUrl,
        createdAt: FieldValue.serverTimestamp(),
    };

    const jacketRef = db.collection('jackets').doc(vin);
    await jacketRef.update({
        documents: FieldValue.arrayUnion(newDocument),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await stagedDocRef.delete();

    return { success: true, message: `Document attached to jacket ${vin}.` };
});



// --- EXISTING FUNCTIONS (UNCHANGED) ---

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

export const generateJacketId = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
  }
);

export const generateJacketInvoice = onRequest(
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
      let snap = await docRef.get();
      if (!snap.exists) {
        res.status(404).send("Jacket not found");
        return;
      }
      let j: DocumentData = snap.data() || {};
      
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
          j.invoiceId = newInvoiceId;
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
      const isFullyPaid = !!(j.isAuctionPaid && isMgmtFeePaid);


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
    .wm {
      position: fixed; inset: 0; display:flex; align-items:center; justify-content:center;
      font-size: 120px; font-weight: 900; color: #16a34a;
      opacity: 0.08; transform: rotate(-24deg);
      pointer-events: none; user-select: none;
    }
  </style>
</head>
<body>
${isFullyPaid ? '<div class="wm">PAID</div>' : ''}
<div class="page">
  <div class="header">
    <div class="company-name">${safe(seller.name)}</div>
    <div class="company-dba">${safe(seller.dba)}</div>
    <div class="company-contact">${safe(seller.phone)} | ${safe(seller.email)}</div>
  </div>

  <div class="invoice-title">
    <h1>INVOICE</h1>
    <div class="invoice-meta">
      <div class="meta-item"><strong>Jacket #:</strong> ${safe(j.jacketId || '—')}</div>
      <div class="meta-item"><strong>Invoice ID:</strong> ${safe(j.invoiceId)}</div>
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

      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await browser.close();

      const filePath = `jacket-documents/${vin}/invoice.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-store" },
      });

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

      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      await browser.close();

      const filePath = `jacket-documents/${vin}/bill-of-sale.pdf`;
      const file = bucket.file(filePath);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-store" },
      });

      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires });

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
        
        if (!j.invoiceUrl) {
             res.status(400).send("Invoice must be generated before creating a packet.");
             return;
        }
        if (!j.bosUrl) {
             res.status(400).send("Bill of Sale must be generated before creating a packet.");
             return;
        }
        
        const coverHtml = buildCoverHtml({
            jacketId: j.jacketId,
            vin,
            year: j.year,
            make: j.make,
            model: j.model,
        });
        
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(coverHtml, { waitUntil: "networkidle0" });
        const coverPdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        const invoicePath = `jacket-documents/${vin}/invoice.pdf`;
        const bosPath = `jacket-documents/${vin}/bill-of-sale.pdf`;
        
        const [invoiceFile] = await bucket.file(invoicePath).download();
        const [bosFile] = await bucket.file(bosPath).download();

        const packetDoc = await PDFDocument.create();
        
        const coverPdf = await PDFDocument.load(coverPdfBuffer);
        const [coverPage] = await packetDoc.copyPages(coverPdf, [0]);
        packetDoc.addPage(coverPage);

        const invoicePdf = await PDFDocument.load(invoiceFile);
        const [invoicePage] = await packetDoc.copyPages(invoicePdf, [0]);
        packetDoc.addPage(invoicePage);

        const bosPdf = await PDFDocument.load(bosFile);
        const [bosPage] = await packetDoc.copyPages(bosPdf, [0]);
        packetDoc.addPage(bosPage);
        
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

        const packetPath = `jacket-documents/${vin}/packet.pdf`;
        const packetFile = bucket.file(packetPath);
        await packetFile.save(packetBytes, {
            contentType: "application/pdf",
            resumable: false,
            metadata: { cacheControl: "private, max-age=0, no-store" },
        });

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
