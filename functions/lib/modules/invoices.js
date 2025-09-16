"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const config_1 = require("../config");
const invoice_1 = require("../templates/invoice");
const bos_1 = require("../templates/bos");
/* Buyer lookup */
async function getBuyerData(dealerId) {
    if (!dealerId)
        return { name: "Dealer (unassigned)" };
    try {
        const snap = await config_1.db.collection("users").doc(dealerId).get();
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
    }
    catch { }
    return { name: `Dealer ${dealerId || ""}` };
}
exports.generateJacketInvoice = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 60, memory: "1GiB", cors: true }, async (req, res) => {
    try {
        const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim().toUpperCase();
        if (!rawVin) {
            res.status(400).send("Missing 'vin'");
            return;
        }
        const ref = config_1.db.collection("jackets").doc(rawVin);
        const snap = await ref.get();
        if (!snap.exists) {
            res.status(404).send("Jacket not found");
            return;
        }
        const j = snap.data() || {};
        const buyer = await getBuyerData(j.dealerId);
        const html = (0, invoice_1.renderInvoiceHTML)(j, buyer);
        const browser = await puppeteer_core_1.default.launch({ args: chromium_1.default.args, executablePath: await chromium_1.default.executablePath(), headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();
        const path = `jacket-documents/${rawVin}/invoice.pdf`;
        await config_1.bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
        const [url] = await config_1.bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        await ref.update({ invoiceUrl: url, updatedAt: config_1.db.app.firestore.FieldValue.serverTimestamp() });
        res.json({ ok: true, vin: rawVin, url });
    }
    catch (e) {
        console.error("generateJacketInvoice error:", e);
        res.status(500).send(e?.message || "Internal error");
    }
});
exports.generateBillOfSale = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 60, memory: "1GiB", cors: true }, async (req, res) => {
    try {
        const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim().toUpperCase();
        if (!rawVin) {
            res.status(400).send("Missing 'vin'");
            return;
        }
        const ref = config_1.db.collection("jackets").doc(rawVin);
        const snap = await ref.get();
        if (!snap.exists) {
            res.status(404).send("Jacket not found");
            return;
        }
        const j = snap.data() || {};
        const buyer = await getBuyerData(j.dealerId);
        const html = (0, bos_1.renderBoSHTML)(j, buyer);
        const browser = await puppeteer_core_1.default.launch({ args: chromium_1.default.args, executablePath: await chromium_1.default.executablePath(), headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();
        const path = `jacket-documents/${rawVin}/bill-of-sale.pdf`;
        await config_1.bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
        const [url] = await config_1.bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        await ref.update({ bosUrl: url, updatedAt: config_1.db.app.firestore.FieldValue.serverTimestamp() });
        res.json({ ok: true, vin: rawVin, url });
    }
    catch (e) {
        console.error("generateBillOfSale error:", e);
        res.status(500).send(e?.message || "Internal error");
    }
});
//# sourceMappingURL=invoices.js.map