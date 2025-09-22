import { onCall, HttpsError } from "firebase-functions/v2/https";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { FieldValue } from "firebase-admin/firestore";
import { db, bucket, seller, assertAdmin } from "../config";
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";

async function getBuyerData(dealerId: string) {
    if (!dealerId) return { name: "Dealer (unassigned)" };
    try {
        const snap = await db.collection("users").doc(dealerId).get();
        if (snap.exists) {
            const u = snap.data() || {};
            return {
                name: u.companyName || u.displayName || u.email,
                line1: u.streetAddress || "",
                line2: [u.city, u.state, u.zip].filter(Boolean).join(", "),
                phone: u.phone || "",
                email: u.email || "",
            };
        }
    } catch (e) {
        console.error(`Could not fetch buyer data for ${dealerId}`, e);
    }
    return { name: `Dealer ${dealerId}` };
}

export const generateJacketInvoice = onCall({ cors: true, region: "us-central1", timeoutSeconds: 60, memory: "1GiB" }, async (request) => {
    assertAdmin(request);
    try {
        const rawVin = (request.data?.vin ?? "").toString().trim().toUpperCase();
        if (!rawVin) throw new HttpsError("invalid-argument", "Missing 'vin'");

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
        await bucket.file(path).save(pdf, { contentType: "application/pdf" });
        const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        
        await ref.update({ invoiceUrl: url, updatedAt: FieldValue.serverTimestamp() });
        return { ok: true, vin: rawVin, url };
    } catch (e: any) {
        console.error("generateJacketInvoice error:", e);
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", e?.message || "Internal error");
    }
});

export const generateBillOfSale = onCall({ cors: true, region: "us-central1", timeoutSeconds: 60, memory: "1GiB" }, async (request) => {
    assertAdmin(request);
    try {
        const rawVin = (request.data?.vin ?? "").toString().trim().toUpperCase();
        if (!rawVin) throw new HttpsError("invalid-argument", "Missing 'vin'");

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
        await bucket.file(path).save(pdf, { contentType: "application/pdf" });
        const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

        await ref.update({ bosUrl: url, updatedAt: FieldValue.serverTimestamp() });
        return { ok: true, vin: rawVin, url };
    } catch (e: any) {
        console.error("generateBillOfSale error:", e);
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", e?.message || "Internal error");
    }
});
