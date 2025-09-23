"use strict";
// functions/src/modules/packet.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketPacket = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("../config");
const utils_1 = require("../utils");
const storage_1 = require("firebase-admin/storage");
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const pdf_lib_1 = require("pdf-lib");
const invoice_1 = require("../templates/invoice");
const bos_1 = require("../templates/bos");
const cover_1 = require("../templates/cover");
// Helper function to get Seller and Buyer data
async function getParticipantData(jacketData) {
    const seller = {
        name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers",
        line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706",
        fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
        phone: "616-318-1991", email: "admin@rizeupventures.com",
    };
    let buyer = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await config_1.db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const d = dealerSnap.data();
            buyer = { name: d.companyName || 'N/A', line1: d.address1 || '', line2: `${d.city || ''}, ${d.state || ''} ${d.zip || ''}`, phone: d.phone || '', email: d.email || '' };
        }
    }
    return { seller, buyer };
}
// Helper function to turn a single HTML string into a PDF buffer
async function createPdf(html) {
    const browser = await puppeteer_core_1.default.launch({
        args: chromium_1.default.args,
        executablePath: await chromium_1.default.executablePath(),
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdfBuffer;
}
exports.generateJacketPacket = (0, https_1.onCall)({
    cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 120
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
        // 1. Generate all three HTML documents
        const coverHtml = (0, cover_1.renderCoverHTML)(jacketData, seller);
        const invoiceHtml = (0, invoice_1.renderInvoiceHTML)(jacketData, seller, buyer);
        const bosHtml = (0, bos_1.renderBoSHTML)(jacketData, seller, buyer);
        // 2. Convert each HTML to a PDF in parallel
        const [coverPdf, invoicePdf, bosPdf] = await Promise.all([
            createPdf(coverHtml),
            createPdf(invoiceHtml),
            createPdf(bosHtml)
        ]);
        // 3. Merge the PDFs into a single document
        const mergedPdf = await pdf_lib_1.PDFDocument.create();
        const coverDoc = await pdf_lib_1.PDFDocument.load(coverPdf);
        const invoiceDoc = await pdf_lib_1.PDFDocument.load(invoicePdf);
        const bosDoc = await pdf_lib_1.PDFDocument.load(bosPdf);
        const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
        mergedPdf.addPage(coverPage);
        const invoicePages = await mergedPdf.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
        invoicePages.forEach(page => mergedPdf.addPage(page));
        const bosPages = await mergedPdf.copyPages(bosDoc, bosDoc.getPageIndices());
        bosPages.forEach(page => mergedPdf.addPage(page));
        const mergedPdfBytes = await mergedPdf.save();
        // 4. Save the final merged PDF to storage
        const filePath = `jacket-packets/${vin}/Jacket-${jacketData.jacketNumber || vin}.pdf`;
        const file = (0, storage_1.getStorage)().bucket().file(filePath);
        await file.save(Buffer.from(mergedPdfBytes), { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        await jacketRef.update({ packetUrl: url, updatedAt: new Date() });
        return { success: true, url };
    }
    catch (error) {
        console.error("Error generating jacket packet:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
});
//# sourceMappingURL=packet.js.map