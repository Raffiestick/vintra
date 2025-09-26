"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketPacket = void 0;
// functions/src/modules/packet.ts
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
// ---------------- helpers ----------------
async function getParticipantData(j) {
    const seller = {
        name: "RizeUp Ventures, LLC",
        dba: "Dolphin Chasers",
        line1: "PO BOX 66741",
        line2: "St Pete Beach, FL 33706",
        fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
        phone: "616-318-1991",
        email: "admin@rizeupventures.com",
    };
    let buyer = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
    if (j.dealerId) {
        const snap = await config_1.db.collection("users").doc(j.dealerId).get();
        if (snap.exists) {
            const d = snap.data();
            buyer = {
                name: d.companyName || "N/A",
                line1: d.address1 || "",
                line2: `${d.city || ""}, ${d.state || ""} ${d.zip || ""}`,
                phone: d.phone || "",
                email: d.email || "",
            };
        }
    }
    return { seller, buyer };
}
// Always return Uint8Array so pdf-lib types are consistent
async function htmlToPdf(html) {
    const browser = await puppeteer_core_1.default.launch({
        args: chromium_1.default.args,
        executablePath: await chromium_1.default.executablePath(),
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buf = await page.pdf({ format: "A4", printBackground: true }); // Buffer
    await browser.close();
    return new Uint8Array(buf);
}
/** Return {bucket, path} from any Firebase Storage URL. */
function parseGcsTarget(u) {
    try {
        const url = new URL(u);
        // Case A: firebasestorage(.app|.googleapis.com)/v0/b/<bucket>/o/<path>?...
        const mA = url.pathname.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
        if (mA)
            return { bucket: mA[1], path: decodeURIComponent(mA[2]) };
        // Case B: storage.googleapis.com/<bucket>/<path>
        if (url.hostname === "storage.googleapis.com") {
            const [, bucket, ...rest] = url.pathname.split("/"); // ["", "<bucket>", "path", ...]
            if (bucket && rest.length)
                return { bucket, path: decodeURIComponent(rest.join("/")) };
        }
        // Case C: <bucket>.storage.googleapis.com/<path>
        const mC = url.hostname.match(/^([^.]+)\.storage\.googleapis\.com$/);
        if (mC) {
            const bucket = mC[1];
            const path = url.pathname.replace(/^\/+/, "");
            if (bucket && path)
                return { bucket, path: decodeURIComponent(path) };
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
/** Map backend doc.type -> human label (fallback to inferred type -> filename). */
function docTypeLabel(type, fallbackName) {
    const key = (type || "").toUpperCase().trim();
    switch (key) {
        case "TITLE_FRONT": return "Title – Front";
        case "TITLE_BACK": return "Title – Back";
        case "POA": return "Power of Attorney";
        case "REASSIGNMENT": return "Reassignment";
        case "REPOSSESSION": return "Repossession Docs";
        case "AFFIDAVIT": return "Affidavit";
        case "LIEN_RELEASE": return "Release of Lien";
        case "STRIKE_ACCEPTANCE": return "Strike Acceptance";
        case "MISC":
        case "MISC_DOC": return "Misc Document";
    }
    // Infer from filename if type missing/unknown
    const name = (fallbackName || "").toLowerCase();
    if (/title.*(front|frnt|frontside|fnt)|\bfront\b/.test(name))
        return "Title – Front";
    if (/title.*(back|bck|backside)|\bback\b/.test(name))
        return "Title – Back";
    if (/\bpoa\b|power[-\s]?of[-\s]?attorney/.test(name))
        return "Power of Attorney";
    if (/reassign|re-assignment|reassignment/.test(name))
        return "Reassignment";
    if (/repo|repossession/.test(name))
        return "Repossession Docs";
    if (/affidavit/.test(name))
        return "Affidavit";
    if (/lien.*release|release.*lien/.test(name))
        return "Release of Lien";
    if (/strike.*accept/.test(name))
        return "Strike Acceptance";
    if (/misc|document|doc/.test(name))
        return "Misc Document";
    return fallbackName || "Document";
}
// ---------------- main callable ----------------
exports.generateJacketPacket = (0, https_1.onCall)({ cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180 }, async (request) => {
    (0, utils_1.assertAdmin)(request);
    const { vin } = request.data;
    if (!vin)
        throw new https_1.HttpsError("invalid-argument", "VIN is required.");
    try {
        const jacketRef = config_1.db.collection("jackets").doc(vin);
        const snap = await jacketRef.get();
        if (!snap.exists)
            throw new https_1.HttpsError("not-found", "Jacket not found.");
        const j = snap.data();
        const storage = (0, storage_1.getStorage)();
        // ---- Cover contents (labels only) ----
        const contents = ["Invoice", "Bill of Sale"];
        if (j.reassignmentUrl)
            contents.push("Reassignment");
        for (const d of j.documents || [])
            contents.push(docTypeLabel(d.type, d.name));
        // ---- Participants ----
        const { seller, buyer } = await getParticipantData(j);
        // ---- Render PDFs (as Uint8Array) ----
        const coverHtml = (0, cover_1.renderCoverHTML)(j, seller, contents);
        const invoiceHtml = (0, invoice_1.renderInvoiceHTML)(j, seller, buyer);
        const bosHtml = (0, bos_1.renderBoSHTML)(j, seller, buyer);
        const pdfParts = await Promise.all([
            htmlToPdf(coverHtml),
            htmlToPdf(invoiceHtml),
            htmlToPdf(bosHtml),
        ]);
        // ---- Reassignment (PDF) right after BoS ----
        if (j.reassignmentUrl) {
            const tgt = parseGcsTarget(j.reassignmentUrl);
            if (tgt) {
                try {
                    const [buf] = await storage.bucket(tgt.bucket).file(tgt.path).download();
                    pdfParts.push(new Uint8Array(buf));
                }
                catch (err) {
                    console.error("Reassignment fetch failed:", tgt, err);
                }
            }
            else {
                console.warn("Cannot parse reassignmentUrl:", j.reassignmentUrl);
            }
        }
        // ---- Uploaded documents ----
        for (const d of j.documents || []) {
            const tgt = parseGcsTarget(d.url);
            if (!tgt)
                continue;
            try {
                const file = storage.bucket(tgt.bucket).file(tgt.path);
                const [buf] = await file.download();
                const [meta] = await file.getMetadata();
                const ct = (meta === null || meta === void 0 ? void 0 : meta.contentType) || "";
                if (ct.includes("pdf")) {
                    pdfParts.push(new Uint8Array(buf));
                }
                else if (ct.startsWith("image/")) {
                    const pdf = await pdf_lib_1.PDFDocument.create();
                    const page = pdf.addPage();
                    const { width, height } = page.getSize();
                    const embedded = ct === "image/png" ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
                    const dims = embedded.scaleToFit(width - 50, height - 50);
                    page.drawImage(embedded, {
                        x: (width - dims.width) / 2,
                        y: (height - dims.height) / 2,
                        width: dims.width,
                        height: dims.height,
                    });
                    pdfParts.push(await pdf.save());
                }
                else {
                    const errPdf = await pdf_lib_1.PDFDocument.create();
                    const p = errPdf.addPage();
                    p.drawText(`Unsupported file type for "${d.name || tgt.path}"`, {
                        x: 50, y: p.getHeight() - 50, size: 12, color: (0, pdf_lib_1.rgb)(1, 0, 0),
                    });
                    pdfParts.push(await errPdf.save());
                }
            }
            catch (error) {
                console.error(`Failed to load document ${d.name}:`, error);
                const errPdf = await pdf_lib_1.PDFDocument.create();
                const p = errPdf.addPage();
                p.drawText(`Error: Could not load "${d.name}"`, {
                    x: 50, y: p.getHeight() - 50, size: 12, color: (0, pdf_lib_1.rgb)(1, 0, 0),
                });
                pdfParts.push(await errPdf.save());
            }
        }
        // ---- Merge Cover → Invoice → BoS → Reassignment → Docs ----
        const merged = await pdf_lib_1.PDFDocument.create();
        for (const part of pdfParts) {
            try {
                const pdf = await pdf_lib_1.PDFDocument.load(part);
                const pages = await merged.copyPages(pdf, pdf.getPageIndices());
                pages.forEach((pg) => merged.addPage(pg));
            }
            catch (e) {
                console.warn("Skipping invalid PDF during merge:", e);
            }
        }
        const mergedBytes = await merged.save(); // Uint8Array
        // ---- Save packet ----
        const filePath = `jacket-packets/${vin}/Jacket-${j.jacketNumber || vin}.pdf`;
        const file = storage.bucket().file(filePath);
        await file.save(Buffer.from(mergedBytes), { contentType: "application/pdf" });
        const [url] = await file.getSignedUrl({ action: "read", expires: "03-09-2491" });
        await jacketRef.update({ packetUrl: url, updatedAt: new Date() });
        return { success: true, url };
    }
    catch (error) {
        console.error("Error generating jacket packet:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
});
//# sourceMappingURL=packet.js.map