import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { type Company, type Party, type JacketData } from "../types";
import { renderReassignmentHTML } from "../templates/reassignment";

export const generateReassignmentForm = onCall({ cors: true, memory: "1GiB", timeoutSeconds: 60, region: "us-central1" }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) throw new HttpsError("invalid-argument", "A VIN is required.");

    const jacketRef = db.collection("jackets").doc(vin);
    const jacketSnap = await jacketRef.get();
    if (!jacketSnap.exists) throw new HttpsError("not-found", "Jacket not found.");

    const jacketData = jacketSnap.data() as JacketData;

    const seller: Company = { name: "RizeUp Ventures, LLC", dba: "Dolphin Chasers", line1: "PO BOX 66741", line2: "St Pete Beach, FL 33706", fullAddress: "PO BOX 66741, St Pete Beach, FL 33706", phone: "616-318-1991", email: "admin@rizeupventures.com" };
    
    let buyer: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (jacketData.dealerId) {
        const dealerSnap = await db.collection("users").doc(jacketData.dealerId).get();
        if (dealerSnap.exists) {
            const d = dealerSnap.data()!;
            buyer = { name: d.companyName || 'N/A', line1: d.address1 || '', line2: `${d.city||''}, ${d.state||''} ${d.zip||''}`, phone: d.phone||'', email: d.email||'' };
        }
    }
    
    const html = renderReassignmentHTML(jacketData, seller, buyer);

    const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const fileName = `Reassignment-${vin}.pdf`;
    const filePath = `jacket-reassignments/${vin}/${fileName}`;
    const file = getStorage().bucket().file(filePath);
    
    await file.save(pdfBuffer, { contentType: 'application/pdf' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

    await jacketRef.update({ reassignmentUrl: url, updatedAt: new Date() });

    return { success: true, url };
});

