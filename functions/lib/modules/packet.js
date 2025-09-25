"use strict";
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
// --- Helper Functions ---
async function getParticipantData(jacketData) {
    const seller = { name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers", line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706", fullAddress: "PO BOX 66741, St Pete Beach, FL 33706", phone: "616-318-1991", email: "admin@rizeupventures.com" };
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
    const browser = await puppeteer_core_1.default.launch({ args: chromium_1.default.args, executablePath: await chromium_1.default.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdfBuffer;
}
function getPathFromUrl(url) {
    try {
        const urlParts = new URL(url);
        const path = urlParts.pathname.split('/o/')[1].split('?')[0]; // Also remove query params
        return path ? decodeURIComponent(path) : null;
    }
    catch (e) {
        console.error("Could not parse storage URL:", url);
        return null;
    }
}
// --- Main Function ---
exports.generateJacketPacket = (0, https_1.onCall)({ cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180 }, async (request) => {
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
        const storage = (0, storage_1.getStorage)();
        const contents = ["Invoice", "Bill of Sale"];
        const hasReassignment = !!jacketData.reassignmentUrl;
        if (hasReassignment) {
            contents.push("Reassignment Form");
        }
        (jacketData.documents || []).forEach(doc => contents.push(doc.name));
        const { seller, buyer } = await getParticipantData(jacketData);
        const coverHtml = (0, cover_1.renderCoverHTML)(jacketData, seller, contents);
        const invoiceHtml = (0, invoice_1.renderInvoiceHTML)(jacketData, seller, buyer);
        const bosHtml = (0, bos_1.renderBoSHTML)(jacketData, seller, buyer);
        const pdfsToMerge = await Promise.all([
            createPdfFromHtml(coverHtml),
            createPdfFromHtml(invoiceHtml),
            createPdfFromHtml(bosHtml),
        ]);
        if (hasReassignment) {
            const reassignmentPath = getPathFromUrl(jacketData.reassignmentUrl);
            if (reassignmentPath) {
                try {
                    const [fileBuffer] = await storage.bucket().file(reassignmentPath).download();
                    pdfsToMerge.push(fileBuffer);
                }
                catch (err) {
                    console.error("Could not find generated Reassignment Form in storage:", err);
                }
            }
        }
        const mergedPdf = await pdf_lib_1.PDFDocument.create();
        for (const pdfBuffer of pdfsToMerge) {
            try {
                const pdf = await pdf_lib_1.PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }
            catch (err) {
                console.warn("Could not merge a generated PDF, skipping:", err);
            }
        }
        for (const doc of (jacketData.documents || [])) {
            const filePath = getPathFromUrl(doc.url);
            if (!filePath)
                continue;
            try {
                const file = storage.bucket().file(filePath);
                const [fileBuffer] = await file.download();
                const [metadata] = await file.getMetadata();
                const contentType = (metadata === null || metadata === void 0 ? void 0 : metadata.contentType) || '';
                if (contentType.includes('pdf')) {
                    const pdf = await pdf_lib_1.PDFDocument.load(fileBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                }
                else if (contentType.startsWith('image/')) {
                    const image = contentType === 'image/png' ? await mergedPdf.embedPng(fileBuffer) : await mergedPdf.embedJpg(fileBuffer);
                    const page = mergedPdf.addPage();
                    const { width, height } = page.getSize();
                    const imageDims = image.scaleToFit(width - 50, height - 50);
                    page.drawImage(image, { x: (width - imageDims.width) / 2, y: (height - imageDims.height) / 2, width: imageDims.width, height: imageDims.height });
                }
            }
            catch (error) {
                console.error(`Failed to process document ${doc.name}:`, error);
                const page = mergedPdf.addPage();
                page.drawText(`Error: Could not load document "${doc.name}"`, { x: 50, y: page.getHeight() - 50, size: 12, color: (0, pdf_lib_1.rgb)(1, 0, 0) });
            }
        }
        const mergedPdfBytes = await mergedPdf.save();
        const packetFilePath = `jacket-packets/${vin}/Jacket-${jacketData.jacketNumber || vin}.pdf`;
        const packetFile = storage.bucket().file(packetFilePath);
        await packetFile.save(Buffer.from(mergedPdfBytes), { contentType: 'application/pdf' });
        const [url] = await packetFile.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        await jacketRef.update({ packetUrl: url, updatedAt: new Date() });
        return { success: true, url };
    }
    catch (error) {
        console.error("Error generating jacket packet:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
});
//# sourceMappingURL=packet.js.map