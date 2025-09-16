import { onRequest } from "firebase-functions/v2/https";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { bucket, db } from "../config";
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";

/* Buyer lookup */
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

export const generateJacketInvoice = onRequest(
  { region: "us-central1", timeoutSeconds: 60, memory: "1GiB", cors: true },
  async (req, res) => {
    try {
      const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim().toUpperCase();
      if (!rawVin) { res.status(400).send("Missing 'vin'"); return; }

      const ref = db.collection("jackets").doc(rawVin);
      const snap = await ref.get();
      if (!snap.exists) { res.status(404).send("Jacket not found"); return; }
      const j = snap.data() || {};
      const buyer = await getBuyerData(j.dealerId);

      const html = renderInvoiceHTML(j, buyer);
      const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const path = `jacket-documents/${rawVin}/invoice.pdf`;
      await bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
      const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7*24*60*60*1000 });

      await ref.update({ invoiceUrl: url, updatedAt: db.app.firestore.FieldValue.serverTimestamp() });
      res.json({ ok: true, vin: rawVin, url });
    } catch (e: any) {
      console.error("generateJacketInvoice error:", e);
      res.status(500).send(e?.message || "Internal error");
    }
  }
);

export const generateBillOfSale = onRequest(
  { region: "us-central1", timeoutSeconds: 60, memory: "1GiB", cors: true },
  async (req, res) => {
    try {
      const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim().toUpperCase();
      if (!rawVin) { res.status(400).send("Missing 'vin'"); return; }

      const ref = db.collection("jackets").doc(rawVin);
      const snap = await ref.get();
      if (!snap.exists) { res.status(404).send("Jacket not found"); return; }
      const j = snap.data() || {};
      const buyer = await getBuyerData(j.dealerId);

      const html = renderBoSHTML(j, buyer);
      const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const path = `jacket-documents/${rawVin}/bill-of-sale.pdf`;
      await bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
      const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7*24*60*60*1000 });

      await ref.update({ bosUrl: url, updatedAt: db.app.firestore.FieldValue.serverTimestamp() });
      res.json({ ok: true, vin: rawVin, url });
    } catch (e: any) {
      console.error("generateBillOfSale error:", e);
      res.status(500).send(e?.message || "Internal error");
    }
  }
);
