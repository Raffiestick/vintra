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
const node_fetch_1 = __importDefault(require("node-fetch"));
const invoice_1 = require("../templates/invoice");
const bos_1 = require("../templates/bos");
const cover_1 = require("../templates/cover");
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
async function createPdfFromHtml(html) {
    const browser = await puppeteer_core_1.default.launch({
        args: chromium_1.default.args,
        executablePath: await chromium_1.default.executablePath(),
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' } });
    await browser.close();
    return pdfBuffer;
}
async function createPdfFromImage(imageBuffer, contentType) {
    const base64Image = imageBuffer.toString('base64');
    const html = `
        <!DOCTYPE html>
        <html>
            <head><style>body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; width: 100vw; height: 100vh; } img { max-width: 100%; max-height: 100%; object-fit: contain; }</style></head>
            <body><img src="data:${contentType};base64,${base64Image}" /></body>
        </html>`;
    return createPdfFromHtml(html);
}
exports.generateJacketPacket = (0, https_1.onCall)({
    cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180
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
        const rawData = jacketSnap.data() || {};
        const jacketData = Object.assign({}, rawData);
        if (rawData.auctionSaleDate && typeof rawData.auctionSaleDate.toDate === 'function') {
            jacketData.auctionSaleDate = rawData.auctionSaleDate.toDate();
        }
        else {
            jacketData.auctionSaleDate = new Date();
        }
        const { seller, buyer } = await getParticipantData(jacketData);
        const coverHtml = (0, cover_1.renderCoverHTML)(jacketData, seller);
        const invoiceHtml = (0, invoice_1.renderInvoiceHTML)(jacketData, seller, buyer);
        const bosHtml = (0, bos_1.renderBoSHTML)(jacketData, seller, buyer);
        const [coverPdf, invoicePdf, bosPdf] = await Promise.all([
            createPdfFromHtml(coverHtml),
            createPdfFromHtml(invoiceHtml),
            createPdfFromHtml(bosHtml)
        ]);
        const mergedPdf = await pdf_lib_1.PDFDocument.create();
        const pdfsToMerge = [coverPdf, invoicePdf, bosPdf];
        const attachmentPromises = (jacketData.documents || []).map(async (doc) => {
            try {
                const response = await (0, node_fetch_1.default)(doc.url);
                if (!response.ok)
                    throw new Error(`Failed to fetch ${doc.name}`);
                const fileBuffer = await response.buffer();
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('pdf')) {
                    return fileBuffer;
                }
                else if (contentType.startsWith('image/')) {
                    return await createPdfFromImage(fileBuffer, contentType);
                }
                console.warn(`Skipping unsupported document type: ${contentType} for ${doc.name}`);
                return null;
            }
            catch (error) {
                console.error(`Failed to process attached document ${doc.name}:`, error);
                return null;
            }
        });
        const additionalPdfBuffers = (await Promise.all(attachmentPromises)).filter(b => b !== null);
        pdfsToMerge.push(...additionalPdfBuffers);
        for (const pdfBuffer of pdfsToMerge) {
            const pdf = await pdf_lib_1.PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const mergedPdfBytes = await mergedPdf.save();
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