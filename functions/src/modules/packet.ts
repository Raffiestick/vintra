// functions/src/modules/packet.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import { renderInvoiceHTML, type Company, type Party, type JacketData } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";
import { renderCoverHTML } from "../templates/cover";

// Helper function to get Seller and Buyer data
async function getParticipantData(jacketData: any): Promise<{ seller: Company, buyer: Party }> {
    const seller: Company = {
        name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers",
        line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706",
        fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
        phone: "616-318-1991", email: "admin@rizeupventures.com",
    };
    let buyer: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const d = dealerSnap.data()!;
            buyer = { name: d.companyName || 'N/A', line1: d.address1 || '', line2: `${d.city||''}, ${d.state||''} ${d.zip||''}`, phone: d.phone||'', email: d.email||'' };
        }
    }
    return { seller, buyer };
}

// Helper function to turn a single HTML string into a PDF buffer
async function createPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdfBuffer;
}

export const generateJacketPacket = onCall({ 
    cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 120 
}, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");

    try {
        const jacketRef = db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();
        if (!jacketSnap.exists) throw new HttpsError("not-found", "Jacket not found.");

        const jacketData = jacketSnap.data() as JacketData;
        const { seller, buyer } = await getParticipantData(jacketData);

        // 1. Generate all three HTML documents
        const coverHtml = renderCoverHTML(jacketData, seller);
        const invoiceHtml = renderInvoiceHTML(jacketData, seller, buyer);
        const bosHtml = renderBoSHTML(jacketData, seller, buyer);

        // 2. Convert each HTML to a PDF in parallel
        const [coverPdf, invoicePdf, bosPdf] = await Promise.all([
            createPdf(coverHtml),
            createPdf(invoiceHtml),
            createPdf(bosHtml)
        ]);
        
        // 3. Merge the PDFs into a single document
        const mergedPdf = await PDFDocument.create();
        const coverDoc = await PDFDocument.load(coverPdf);
        const invoiceDoc = await PDFDocument.load(invoicePdf);
        const bosDoc = await PDFDocument.load(bosPdf);

        const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
        mergedPdf.addPage(coverPage);
        const invoicePages = await mergedPdf.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
        invoicePages.forEach(page => mergedPdf.addPage(page));
        const bosPages = await mergedPdf.copyPages(bosDoc, bosDoc.getPageIndices());
        bosPages.forEach(page => mergedPdf.addPage(page));

        const mergedPdfBytes = await mergedPdf.save();
        
        // 4. Save the final merged PDF to storage
        const filePath = `jacket-packets/${vin}/Jacket-${jacketData.jacketNumber || vin}.pdf`;
        const file = getStorage().bucket().file(filePath);
        await file.save(Buffer.from(mergedPdfBytes), { contentType: 'application/pdf' });
        
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        
        await jacketRef.update({ packetUrl: url, updatedAt: new Date() });
        return { success: true, url };

    } catch (error: any) {
        console.error("Error generating jacket packet:", error);
        throw new HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
});