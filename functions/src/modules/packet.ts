import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument, rgb } from "pdf-lib";
import { type Company, type Party, type JacketData } from "../types"; // CORRECTED: Imports from the master types file
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";
import { renderCoverHTML } from "../templates/cover";

// --- Helper Functions ---

async function getParticipantData(jacketData: JacketData): Promise<{ seller: Company, buyer: Party }> {
    const seller: Company = { name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers", line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706", fullAddress: "PO BOX 66741, St Pete Beach, FL 33706", phone: "616-318-1991", email: "admin@rizeupventures.com" };
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
    const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdfBuffer;
}

function getPathFromUrl(url: string): string | null {
    try {
        const urlParts = new URL(url);
        const path = urlParts.pathname.split('/o/')[1].split('?')[0]; // Also remove query params
        return path ? decodeURIComponent(path) : null;
    } catch (e) {
        console.error("Could not parse storage URL:", url);
        return null;
    }
}

// --- Main Function ---

export const generateJacketPacket = onCall({ cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180 }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");

    try {
        const jacketRef = db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();
        if (!jacketSnap.exists) throw new HttpsError("not-found", "Jacket not found.");

        const jacketData = jacketSnap.data() as JacketData;
        const storage = getStorage();

        const contents: string[] = ["Invoice", "Bill of Sale"];
        const hasReassignment = !!jacketData.reassignmentUrl;
        if (hasReassignment) {
            contents.push("Reassignment Form");
        }
        (jacketData.documents || []).forEach(doc => contents.push(doc.name));

        const { seller, buyer } = await getParticipantData(jacketData);
        
        const coverHtml = renderCoverHTML(jacketData, seller, contents);
        const invoiceHtml = renderInvoiceHTML(jacketData, seller, buyer);
        const bosHtml = renderBoSHTML(jacketData, seller, buyer);
        
        const pdfsToMerge: Buffer[] = await Promise.all([
            createPdfFromHtml(coverHtml),
            createPdfFromHtml(invoiceHtml),
            createPdfFromHtml(bosHtml),
        ]);

        if (hasReassignment) {
            const reassignmentPath = getPathFromUrl(jacketData.reassignmentUrl!);
            if (reassignmentPath) {
                try {
                    const [fileBuffer] = await storage.bucket().file(reassignmentPath).download();
                    pdfsToMerge.push(fileBuffer);
                } catch (err) {
                    console.error("Could not find generated Reassignment Form in storage:", err);
                }
            }
        }
        
        const mergedPdf = await PDFDocument.create();
        for (const pdfBuffer of pdfsToMerge) {
            try {
                const pdf = await PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            } catch (err) {
                console.warn("Could not merge a generated PDF, skipping:", err);
            }
        }

        for (const doc of (jacketData.documents || [])) {
            const filePath = getPathFromUrl(doc.url);
            if (!filePath) continue;

            try {
                const file = storage.bucket().file(filePath);
                const [fileBuffer] = await file.download();
                const [metadata] = await file.getMetadata();
                const contentType = metadata?.contentType || '';

                if (contentType.includes('pdf')) {
                    const pdf = await PDFDocument.load(fileBuffer);
                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                } else if (contentType.startsWith('image/')) {
                    const image = contentType === 'image/png' ? await mergedPdf.embedPng(fileBuffer) : await mergedPdf.embedJpg(fileBuffer);
                    const page = mergedPdf.addPage();
                    const { width, height } = page.getSize();
                    const imageDims = image.scaleToFit(width - 50, height - 50);
                    page.drawImage(image, { x: (width - imageDims.width) / 2, y: (height - imageDims.height) / 2, width: imageDims.width, height: imageDims.height });
                }
            } catch (error) {
                console.error(`Failed to process document ${doc.name}:`, error);
                const page = mergedPdf.addPage();
                page.drawText(`Error: Could not load document "${doc.name}"`, { x: 50, y: page.getHeight() - 50, size: 12, color: rgb(1, 0, 0) });
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const packetFilePath = `jacket-packets/${vin}/Jacket-${jacketData.jacketNumber || vin}.pdf`;
        const packetFile = storage.bucket().file(packetFilePath);
        await packetFile.save(Buffer.from(mergedPdfBytes), { contentType: 'application/pdf' });
        
        const [url] = await packetFile.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        
        await jacketRef.update({ packetUrl: url, updatedAt: new Date() });
        return { success: true, url };

    } catch (error: any) {
        console.error("Error generating jacket packet:", error);
        throw new HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
});

