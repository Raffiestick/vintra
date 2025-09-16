import { onCall, HttpsError } from "firebase-functions/v2/https";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { bucket, db, FieldValue, seller } from "../config";
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";

type InvoiceInput = { vin?: string };

async function getBuyerData(dealerId?: string): Promise<any> {
  if (!dealerId) return { name: "Dealer (unassigned)" };
  try {
    const snap = await db.collection("users").doc(dealerId).get();
    if (snap.exists) {
      const u = snap.data() || {};
      return {
        name: u.companyName || u.businessName || u.contactName || u.displayName || u.email || u.uid,
        line1: u.streetAddress || u.address || u.street || "",
        line2: [u.city, u.state, u.zip].filter(Boolean).join(", "),
        phone: u.phone || "",
        email: u.email || "",
      };
    }
  } catch {}
  return { name: `Dealer ${dealerId || ""}` };
}

export const generateJacketInvoice = onCall(async (req) => {
  try {
    const { vin } = (req.data || {}) as InvoiceInput;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");
    const rawVin = vin.trim().toUpperCase();
    
    const ref = db.collection("jackets").doc(rawVin);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Jacket not found");
    
    const j = snap.data() || {};
    const buyer = await getBuyerData(j.dealerId);

    const html = renderInvoiceHTML(j, seller, buyer);
    const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const path = `jacket-documents/${rawVin}/invoice.pdf`;
    await bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
    const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    await ref.update({ invoiceUrl: url, updatedAt: FieldValue.serverTimestamp() });
    
    return { ok: true, vin: rawVin, url };
  } catch (err: any) {
    console.error("generateJacketInvoice error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err?.message || "Unexpected error generating invoice.");
  }
});

export const generateBillOfSale = onCall(async (req) => {
  try {
    const { vin } = (req.data || {}) as InvoiceInput;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");
    const rawVin = vin.trim().toUpperCase();

    const ref = db.collection("jackets").doc(rawVin);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Jacket not found");

    const j = snap.data() || {};
    const buyer = await getBuyerData(j.dealerId);

    const html = renderBoSHTML(j, seller, buyer);
    const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const path = `jacket-documents/${rawVin}/bill-of-sale.pdf`;
    await bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
    const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    await ref.update({ bosUrl: url, updatedAt: FieldValue.serverTimestamp() });

    return { ok: true, vin: rawVin, url };
  } catch (err: any) {
    console.error("generateBillOfSale error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err?.message || "Unexpected error generating bill of sale.");
  }
});
