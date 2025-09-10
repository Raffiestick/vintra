
'use client';
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import puppeteer from "puppeteer";


// Secret to allow one dev UID to bypass claim check (only if set)
const DEV_ADMIN_UID_SECRET = defineSecret("DEV_ADMIN_UID");

// Initialize lazily
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const storageBucket = getStorage().bucket();


/**
 * Require admin privileges.
 * If DEV_ADMIN_UID is set and matches the caller’s UID, bypass for development.
 */
function assertAdmin(request: CallableRequest) {
  // Must be signed in
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // Optional dev bypass via secret (safe: inert if unset)
  const devBypass = DEV_ADMIN_UID_SECRET.value(); // empty string if not defined
  if (devBypass && request.auth.uid === devBypass) {
    logger.info(`Bypassing admin check for dev UID: ${request.auth.uid}`);
    return; // bypass granted for development
  }

  // Normal path: check custom claim
  const role = (request.auth.token as any)?.role;
  if (role !== "admin") {
    logger.warn(`Admin check failed for UID: ${request.auth.uid}. Role is: ${role}`);
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

export const manageDealerApplication = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);
    
    const { uid, action } = request.data;
    if (!uid || !action || !["approve", "deny"].includes(action)) {
        throw new HttpsError("invalid-argument", "The function must be called with a 'uid' and 'action' ('approve' or 'deny').");
    }

    const userDocRef = db.collection("users").doc(uid);

    try {
        if (action === "approve") {
            await userDocRef.update({ status: "approved" });
        } else if (action === "deny") {
            await userDocRef.update({ status: "denied" });
        }
        return { success: true, message: `User ${uid} has been ${action}d.` };
    } catch (error) {
        logger.error("Error managing dealer application:", error);
        throw new HttpsError("internal", "An error occurred while managing the application.");
    }
});

export const generateJacketId = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});

export const generateJacketDocuments = functions
  .runWith({ timeoutSeconds: 120, memory: "1GB" })
  .https.onRequest(async (req, res) => {
    try {
      if (req.method !== "POST") {
        // allow GET with ?vin= for quick tests
        if (req.method === "GET") {
          // fall through
        } else {
          res.status(405).send("Method Not Allowed");
          return;
        }
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

      // numeric helpers
      const num = (x: any) => (typeof x === "number" ? x : Number(x || 0));
      const auctionDue = num(j.itemPrice) + num(j.buyerFee) + num(j.onlineFee);
      const mgmtDue = num(j.managementFee);
      const miscTotal = Array.isArray(j.miscFees)
        ? j.miscFees.reduce((s: number, f: any) => s + num(f?.amount), 0)
        : 0;
      const subtotal = auctionDue + mgmtDue + miscTotal;
      const outstanding =
        (j.isAuctionPaid ? 0 : auctionDue) +
        (j.isMgmtFeePaid ? 0 : mgmtDue) +
        miscTotal;

      const fmtUSD = (n: number) =>
        n.toLocaleString("en-US", { style: "currency", currency: "USD" });

      const safe = (s: any) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const yearMakeModel = [j.year, j.make, j.model].filter(Boolean).join(" ");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .sub { color: #555; margin: 0 0 12px; }
    .badges span { display: inline-block; padding: 4px 8px; border-radius: 6px; margin-right: 8px; font-weight: 600; font-size: 11px; }
    .paid { background: #e6ffed; color: #036c3e; border: 1px solid #a7f3d0; }
    .unpaid { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th.right, td.right { text-align: right; }
    tfoot th { background: #fafafa; }
    .muted { color: #666; }
  </style>
</head>
<body>
  <h1>Invoice — ${safe(vin)}</h1>
  <div class="sub">${safe(yearMakeModel)}${j.color ? " · " + safe(j.color) : ""}</div>
  <div class="badges">
    <span class="${j.isAuctionPaid ? "paid" : "unpaid"}">Auction ${j.isAuctionPaid ? "Paid" : "Unpaid"}</span>
    <span class="${j.isMgmtFeePaid ? "paid" : "unpaid"}">Mgmt ${j.isMgmtFeePaid ? "Paid" : "Unpaid"}</span>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Item Price</td><td class="right">${fmtUSD(num(j.itemPrice))}</td></tr>
      <tr><td>Buyer Fee</td><td class="right">${fmtUSD(num(j.buyerFee))}</td></tr>
      <tr><td>Online Fee</td><td class="right">${fmtUSD(num(j.onlineFee))}</td></tr>
      <tr><td>Management Fee</td><td class="right">${fmtUSD(num(j.managementFee))}</td></tr>
      ${
        Array.isArray(j.miscFees)
          ? j.miscFees
              .map(
                (f: any) =>
                  `<tr><td>Misc — ${safe(f?.description || "Item")}</td><td class="right">${fmtUSD(num(f?.amount))}</td></tr>`
              )
              .join("")
          : ""
      }
    </tbody>
    <tfoot>
      <tr><th>Subtotal</th><th class="right">${fmtUSD(subtotal)}</th></tr>
      <tr><th>Outstanding</th><th class="right">${fmtUSD(outstanding)}</th></tr>
    </tfoot>
  </table>
</body>
</html>`;

      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const filePath = `jacket-documents/${vin}/invoice.pdf`;
      const file = storageBucket.file(filePath);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0, no-store" }
      });

      const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      const [signedUrl] = await file.getSignedUrl({ action: "read", expires });

      await docRef.update({
        invoiceUrl: signedUrl,
        updatedAt: FieldValue.serverTimestamp()
      });

      res.status(200).json({ ok: true, vin, url: signedUrl });
    } catch (err: any) {
      console.error("generateJacketDocuments error:", err);
      functions.logger.error("generateJacketDocuments error:", err);
      res.status(500).send(err?.message || "Internal error");
    }
  });

