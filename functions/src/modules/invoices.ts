// functions/src/modules/invoices.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import { format } from "date-fns";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { renderInvoiceHTML, type Company, type Party, type JacketData } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";

// Helper function to get Seller and Buyer data
async function getParticipantData(jacketData: any): Promise<{ seller: Company, buyer: Party }> {
    const seller: Company = {
        name: "RizeUp Ventures, LLC",
        dba: "Dolphin Chasers",
        line1: "PO BOX 66741",
        line2: "St Pete Beach, FL 33706",
        fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
        phone: "616-318-1991",
        email: "admin@rizeupventures.com",
    };

    let buyer: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const dealer = dealerSnap.data()!;
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

export const generateJacketInvoice = onCall({ 
    cors: true, 
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
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

        // Smartly set the auctionSaleDate for the template
        // If it exists as a Timestamp, convert it. Otherwise, default to the current date.
        if (rawData.auctionSaleDate && typeof rawData.auctionSaleDate.toDate === 'function') {
            jacketData.auctionSaleDate = rawData.auctionSaleDate.toDate();
        } else {
            jacketData.auctionSaleDate = new Date();
        }

        const { seller, buyer } = await getParticipantData(jacketData);
        const html = renderInvoiceHTML(jacketData, seller, buyer);

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const invoiceId = `INV-${jacketData.jacketNumber || vin.slice(-6)}-${format(new Date(), 'yyyyMMdd')}`;
        const filePath = `jacket-invoices/${vin}/${invoiceId}.pdf`;
        const file = getStorage().bucket().file(filePath);
        
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

        await jacketRef.update({ invoiceId, invoiceUrl: url, updatedAt: new Date() });
        return { success: true, url, invoiceId };

    } catch (error: any) {
        console.error("Error generating invoice:", error);
        throw new HttpsError("internal", error.message || "Failed to generate invoice.");
    }
});

export const generateBillOfSale = onCall({ 
    cors: true, 
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 60,
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

        // Smartly set the auctionSaleDate for the template
        if (rawData.auctionSaleDate && typeof rawData.auctionSaleDate.toDate === 'function') {
            jacketData.auctionSaleDate = rawData.auctionSaleDate.toDate();
        } else {
            jacketData.auctionSaleDate = new Date();
        }

        const { seller, buyer } = await getParticipantData(jacketData);
        const html = renderBoSHTML(jacketData, seller, buyer);

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        
        const filePath = `jacket-bos/${vin}/BOS-${vin}.pdf`;
        const file = getStorage().bucket().file(filePath);

        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
        
        await jacketRef.update({ bosUrl: url, updatedAt: new Date() });
        return { success: true, url };

    } catch (error: any) {
        console.error("Error generating Bill of Sale:", error);
        throw new HttpsError("internal", error.message || "Failed to generate Bill of Sale.");
    }
});