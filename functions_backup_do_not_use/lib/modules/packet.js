"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketPacket = void 0;
const https_1 = require("firebase-functions/v2/https");
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const pdf_lib_1 = require("pdf-lib");
const config_1 = require("../config");
exports.generateJacketPacket = (0, https_1.onRequest)({ region: "us-central1", timeoutSeconds: 180, memory: "1GiB", cors: true }, async (req, res) => {
    try {
        const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim().toUpperCase();
        if (!rawVin) {
            res.status(400).send("Missing 'vin'");
            return;
        }
        const docRef = config_1.db.collection("jackets").doc(rawVin);
        const snap = await docRef.get();
        if (!snap.exists) {
            res.status(404).send("Jacket not found");
            return;
        }
        const j = snap.data() || {};
        if (!j.invoiceUrl) {
            res.status(400).send("Invoice must be generated before creating a packet.");
            return;
        }
        if (!j.bosUrl) {
            res.status(400).send("Bill of Sale must be generated before creating a packet.");
            return;
        }
        // Minimal cover page
        const coverHtml = `<!doctype html><html><body style="font-family:system-ui; padding:48px">
        <h1 style="margin:0 0 8px">DEALER JACKET</h1>
        <div>VIN: ${j.vin}</div>
        <div>Vehicle: ${[j.year, j.make, j.model].filter(Boolean).join(" ")}</div>
        <div>Auction Date: ${j.invoiceDateDisplay || ""}</div>
      </body></html>`;
        const browser = await puppeteer_core_1.default.launch({ args: chromium_1.default.args, executablePath: await chromium_1.default.executablePath(), headless: true });
        const page = await browser.newPage();
        await page.setContent(coverHtml, { waitUntil: "networkidle0" });
        const coverPdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();
        const packet = await pdf_lib_1.PDFDocument.create();
        const coverPdf = await pdf_lib_1.PDFDocument.load(coverPdfBuffer);
        const coverPages = await packet.copyPages(coverPdf, coverPdf.getPageIndices());
        for (const p of coverPages)
            packet.addPage(p);
        // Append invoice + BoS (from bucket paths we control)
        const [invBuf] = await config_1.bucket.file(`jacket-documents/${rawVin}/invoice.pdf`).download();
        const invPdf = await pdf_lib_1.PDFDocument.load(invBuf);
        const invPages = await packet.copyPages(invPdf, invPdf.getPageIndices());
        invPages.forEach(p => packet.addPage(p));
        const [bosBuf] = await config_1.bucket.file(`jacket-documents/${rawVin}/bill-of-sale.pdf`).download();
        const bosPdf = await pdf_lib_1.PDFDocument.load(bosBuf);
        const bosPages = await packet.copyPages(bosPdf, bosPdf.getPageIndices());
        bosPages.forEach(p => packet.addPage(p));
        // Append any other attachments (PDFs and common images)
        for (const d of Array.isArray(j.documents) ? j.documents : []) {
            try {
                if (!d?.url || typeof d?.name !== "string")
                    continue;
                const u = new URL(d.url);
                let objectPath = "";
                if (u.hostname.includes("firebasestorage.googleapis.com") && u.pathname.includes("/o/")) {
                    const enc = u.pathname.split("/o/")[1] || "";
                    objectPath = decodeURIComponent((enc.split("?")[0] || "").replace(/^\/+/, ""));
                }
                else if (u.hostname.includes("storage.googleapis.com")) {
                    const parts = u.pathname.split("/");
                    objectPath = decodeURIComponent(parts.slice(2).join("/"));
                }
                if (!objectPath)
                    continue;
                const file = config_1.bucket.file(objectPath);
                const [buf] = await file.download();
                const [md] = await file.getMetadata().catch(() => [{ contentType: "" }]);
                const ct = String(md?.contentType || "");
                if (ct.startsWith("application/pdf")) {
                    const extPdf = await pdf_lib_1.PDFDocument.load(buf);
                    const pages = await packet.copyPages(extPdf, extPdf.getPageIndices());
                    pages.forEach(p => packet.addPage(p));
                }
                else if (ct.startsWith("image/") || /\.(png|jpe?g)$/i.test(d.name)) {
                    const isJpg = ct.includes("jpeg") || /\.jpe?g$/i.test(d.name);
                    const img = isJpg ? await packet.embedJpg(buf) : await packet.embedPng(buf);
                    const page = packet.addPage([595.28, 841.89]); // A4
                    const { width, height } = img.scale(1);
                    const maxW = 555, maxH = 800;
                    const scale = Math.min(maxW / width, maxH / height, 1);
                    const w = width * scale, h = height * scale;
                    const x = (595.28 - w) / 2, y = (841.89 - h) / 2;
                    page.drawImage(img, { x, y, width: w, height: h });
                }
            }
            catch (e) {
                console.warn("Could not append doc:", d?.name, e);
            }
        }
        const packetBytes = await packet.save();
        const packetPath = `jacket-documents/${rawVin}/packet.pdf`;
        await config_1.bucket.file(packetPath).save(packetBytes, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });
        const [signedUrl] = await config_1.bucket.file(packetPath).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        await docRef.update({ packetUrl: signedUrl, updatedAt: config_1.FieldValue.serverTimestamp() });
        await (0, config_1.logActivity)(rawVin, { type: "packetGenerated", message: "Packet generated (cover + invoice + BOS + attachments)", meta: { url: signedUrl } });
        res.status(200).json({ ok: true, vin: rawVin, url: signedUrl });
    }
    catch (err) {
        console.error("generateJacketPacket error:", err);
        res.status(500).send(err?.message || "Internal error");
    }
});
//# sourceMappingURL=packet.js.map