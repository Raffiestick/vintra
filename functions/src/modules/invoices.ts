import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { format } from "date-fns";
import { type Company, type Party, type JacketData } from "../types"; // CORRECTED: Imports from master types
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";

async function createPdfDocument(vin: string, type: 'invoice' | 'bos'): Promise<{ url: string, id: string }> {
    const jacketRef = db.collection("jackets").doc(vin);
    const jacketSnap = await jacketRef.get();
    if (!jacketSnap.exists) {
        throw new HttpsError("not-found", "Jacket not found.");
    }
    const jacketData = jacketSnap.data() as JacketData;

    const sellerInfo: Company = { name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers", line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706", fullAddress: "PO BOX 66741, St Pete Beach, FL 33706", phone: "616-318-1991", email: "admin@rizeupventures.com" };
    let buyerInfo: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const dealer = dealerSnap.data()!;
            buyerInfo = { name: dealer.companyName || 'N/A', line1: dealer.address1 || '', line2: `${dealer.city || ''}, ${dealer.state || ''} ${dealer.zip || ''}`, phone: dealer.phone || '', email: dealer.email || '' };
        }
    }

    const html = type === 'invoice'
        ? renderInvoiceHTML(jacketData, sellerInfo, buyerInfo)
        : renderBoSHTML(jacketData, sellerInfo, buyerInfo);
        
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const docId = `${type.toUpperCase()}-${jacketData.jacketNumber || vin.slice(-6)}-${format(new Date(), 'yyyyMMddHHmmss')}`;
    const filePath = `jacket-${type}s/${vin}/${docId}.pdf`;
    const urlField = type === 'invoice' ? 'invoiceUrl' : 'bosUrl';
    const idField = type === 'invoice' ? 'invoiceId' : 'bosId';

    const file = getStorage().bucket().file(filePath);
    await file.save(pdfBuffer, { contentType: 'application/pdf' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

    await jacketRef.update({
        [urlField]: url,
        [idField]: docId,
        updatedAt: new Date(),
    });

    return { url, id: docId };
}

export const generateJacketInvoice = onCall({ cors: true, memory: '1GiB', timeoutSeconds: 60 }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");
    try {
        const { url, id } = await createPdfDocument(vin, 'invoice');
        return { success: true, url, invoiceId: id };
    } catch (error: any) {
        console.error("Error generating invoice:", error);
        throw new HttpsError("internal", error.message || "Failed to generate invoice.");
    }
});

export const regenerateInvoiceOnChange = onCall({ cors: true, memory: '1GiB', timeoutSeconds: 60 }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required for regeneration.");
    try {
        await createPdfDocument(vin, 'invoice');
        return { success: true, message: `Invoice for ${vin} regenerated.` };
    } catch (error: any) {
        console.error("Error regenerating invoice:", error);
        return { success: false, error: error.message };
    }
});

export const generateBillOfSale = onCall({ cors: true, memory: '1GiB', timeoutSeconds: 60 }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required for Bill of Sale.");
    try {
        const { url } = await createPdfDocument(vin, 'bos');
        return { success: true, url };
    } catch (error: any) {
        console.error("Error generating Bill of Sale:", error);
        throw new HttpsError("internal", error.message || "Failed to generate Bill of Sale.");
    }
});
