// functions/src/modules/packet.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import fetch from "node-fetch";
import { renderInvoiceHTML, type Company, type Party, type JacketData } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";
import { renderCoverHTML } from "../templates/cover";
import { renderReassignmentHTML } from "../templates/reassignment"; // ADDED

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

async function createPdfFromHtml(html: string): Promise<Buffer> {
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

async function createPdfFromImage(imageBuffer: Buffer, contentType: string): Promise<Buffer> {
    const base64Image = imageBuffer.toString('base64');
    const html = `<!DOCTYPE html><html><head><style>body { margin: 0; } img { width: 100%; height: 100%; object-fit: contain; }</style></head><body><img src="data:${contentType};base64,${base64Image}" /></body></html>`;
    return createPdfFromHtml(html);
}

export const generateJacketPacket = onCall({ 
    cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180 
}, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");

    try {
        const jacketRef = db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();
        if (!jacketSnap.exists) throw new HttpsError("not-found", "Jacket not found.");

        const rawData = jacketSnap.data() || {};
        const jacketData = { ...rawData } as JacketData;
        
        if (rawData.auctionSaleDate && typeof rawData.auctionSaleDate.toDate === 'function') {
            jacketData.auctionSaleDate = rawData.auctionSaleDate.toDate();
        } else {
            jacketData.auctionSaleDate = new Date();
        }

        const { seller, buyer } = await getParticipantData(jacketData);

        const coverHtml = renderCoverHTML(jacketData, seller);
        const invoiceHtml = renderInvoiceHTML(jacketData, seller, buyer);
        const bosHtml = renderBoSHTML(jacketData, seller, buyer);
        const reassignmentHtml = renderReassignmentHTML(jacketData, seller, buyer); // ADDED

        const [coverPdf, invoicePdf, bosPdf, reassignmentPdf] = await Promise.all([ // ADDED
            createPdfFromHtml(coverHtml),
            createPdfFromHtml(invoiceHtml),
            createPdfFromHtml(bosHtml),
            createPdfFromHtml(reassignmentHtml), // ADDED
        ]);
        
        const mergedPdf = await PDFDocument.create();
        // The order is Cover, Invoice, BOS, Reassignment, then other docs
        const pdfsToMerge = [coverPdf, invoicePdf, bosPdf, reassignmentPdf]; // ADDED reassignmentPdf

        const attachmentPromises = (jacketData.documents || []).map(async (doc) => {
            try {
                const response = await fetch(doc.url);
                if (!response.ok) throw new Error(`Failed to fetch ${doc.name}`);
                const fileBuffer = await response.buffer();
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('pdf')) { return fileBuffer; } 
                else if (contentType.startsWith('image/')) { return await createPdfFromImage(fileBuffer, contentType); }
                return null;
            } catch (error) {
                console.error(`Failed to process attached document ${doc.name}:`, error);
                return null;
            }
        });

        const additionalPdfBuffers = (await Promise.all(attachmentPromises)).filter(b => b !== null) as Buffer[];
        pdfsToMerge.push(...additionalPdfBuffers);

        for (const pdfBuffer of pdfsToMerge) {
            const pdf = await PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        
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