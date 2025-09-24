// functions/src/modules/reassignment.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { renderReassignmentHTML } from "../templates/reassignment";
import type { Company, Party, JacketData } from "../templates/invoice";

async function getParticipantData(jacketData: any): Promise<{ seller: Company, buyer: Party }> {
    const seller: Company = {
        name: "Dolphin Chasers, LLC", // As per PDF
        line1: "PO BOX 66741",
        line2: "St Pete Beach, FL 33706",
        phone: "616-318-1991",
        email: "admin@rizeupventures.com",
    };
    let buyer: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const d = dealerSnap.data()!;
            buyer = { name: d.companyName || 'Pulse Powersports, LLC', line1: d.address1 || '', line2: `${d.city||''}, ${d.state||''} ${d.zip||''}`, phone: d.phone||'', email: d.email||'' };
        }
    }
    return { seller, buyer };
}

export const generateReassignmentForm = onCall({ 
    cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 60,
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
        const html = renderReassignmentHTML(jacketData, seller, buyer);

        const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const filePath = `jacket-reassignments/${vin}/Reassignment-${vin}.pdf`;
        const file = getStorage().bucket().file(filePath);
        
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

        await jacketRef.update({ reassignmentUrl: url, updatedAt: new Date() });
        return { success: true, url };

    } catch (error: any) {
        console.error("Error generating reassignment form:", error);
        throw new HttpsError("internal", error.message || "Failed to generate form.");
    }
});