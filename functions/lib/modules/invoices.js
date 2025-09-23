"use strict";
// functions/src/modules/invoices.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("../config");
const utils_1 = require("../utils");
const storage_1 = require("firebase-admin/storage");
const date_fns_1 = require("date-fns");
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const invoice_1 = require("../templates/invoice");
const bos_1 = require("../templates/bos");
// Helper function to get Seller and Buyer data
async function getParticipantData(jacketData) {
    const seller = {
        name: "RizeUp Ventures, LLC",
        dba: "Dolphin Chasers",
        line1: "PO BOX 66741",
        line2: "St Pete Beach, FL 33706",
        fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
        phone: "616-318-1991",
        email: "admin@rizeupventures.com",
    };
    let buyer = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await config_1.db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const dealer = dealerSnap.data();
            buyer = {
                name: dealer.companyName || 'N/A',
                line1: dealer.address1 || '',
                line2: `${dealer.city || ''}, ${dealer.state || ''} ${dealer.zip || ''}`,
                phone: dealer.phone || '',
                email: dealer.email || '',
            };
        }
    }
    return { seller, buyer };
}
exports.generateJacketInvoice = (0, https_1.onCall)({
    cors: true,
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
}, async (request) => {
    (0, utils_1.assertAdmin)(request);
    const { vin } = request.data;
    if (!vin)
        throw new https_1.HttpsError("invalid-argument", "VIN is required.");
    try {
        const jacketRef = config_1.db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();
        if (!jacketSnap.exists)
            throw new https_1.HttpsError("not-found", "Jacket not found.");
        const jacketData = jacketSnap.data();
        const { seller, buyer } = await getParticipantData(jacketData);
        const html = (0, invoice_1.renderInvoiceHTML)(jacketData, seller, buyer);
        const browser = await puppeteer_core_1.default.launch({
            args: chromium_1.default.args,
            executablePath: await chromium_1.default.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        const invoiceId = `INV-${jacketData.jacketNumber || vin.slice(-6)}-${(0, date_fns_1.format)(new Date(), 'yyyyMMdd')}`;
        const filePath = `jacket-invoices/${vin}/${invoiceId}.pdf`;
        const file = (0, storage_1.getStorage)().bucket().file(filePath);
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        await jacketRef.update({ invoiceId, invoiceUrl: url, updatedAt: new Date() });
        return { success: true, url, invoiceId };
    }
    catch (error) {
        console.error("Error generating invoice:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate invoice.");
    }
});
exports.generateBillOfSale = (0, https_1.onCall)({
    cors: true,
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
}, async (request) => {
    (0, utils_1.assertAdmin)(request);
    const { vin } = request.data;
    if (!vin)
        throw new https_1.HttpsError("invalid-argument", "VIN is required.");
    try {
        const jacketRef = config_1.db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();
        if (!jacketSnap.exists)
            throw new https_1.HttpsError("not-found", "Jacket not found.");
        const jacketData = jacketSnap.data();
        const { seller, buyer } = await getParticipantData(jacketData);
        const html = (0, bos_1.renderBoSHTML)(jacketData, seller, buyer);
        const browser = await puppeteer_core_1.default.launch({
            args: chromium_1.default.args,
            executablePath: await chromium_1.default.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        const filePath = `jacket-bos/${vin}/BOS-${vin}.pdf`;
        const file = (0, storage_1.getStorage)().bucket().file(filePath);
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        await jacketRef.update({ bosUrl: url, updatedAt: new Date() });
        return { success: true, url };
    }
    catch (error) {
        console.error("Error generating Bill of Sale:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate Bill of Sale.");
    }
});
//# sourceMappingURL=invoices.js.map