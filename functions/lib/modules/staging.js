"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJacketsForInvoice = exports.createJacketFromUnit = exports.startInvoiceParse = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("../config");
const npa_1 = require("../parsers/npa");
/** helper: copy the auction PDF to the jacket folder (keeps original in staging) */
async function copyAuctionPdfToJacket(stagingGcsPath, vin) {
    if (!stagingGcsPath)
        return null;
    const src = config_1.bucket.file(stagingGcsPath);
    const dstPath = `jacket-documents/${vin}/auction-invoice.pdf`;
    await src.copy(config_1.bucket.file(dstPath));
    const [url] = await config_1.bucket.file(dstPath).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return { dstPath, url };
}
/* ---------------- startInvoiceParse ---------------- */
exports.startInvoiceParse = (0, https_1.onRequest)({
    region: "us-central1",
    cors: true,
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: ["GEMINI_API_KEY"],
}, async (req, res) => {
    try {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        const gcsPath = String(req.body?.gcsPath || "").trim();
        if (!gcsPath) {
            res.status(400).json({ error: "Missing gcsPath (e.g., incoming/invoices/<uid>/<file>.pdf)" });
            return;
        }
        // 1) Read the uploaded file from GCS
        const file = config_1.bucket.file(gcsPath);
        const [exists] = await file.exists();
        if (!exists) {
            res.status(404).json({ error: `File not found at ${gcsPath}` });
            return;
        }
        const [meta] = await file.getMetadata().catch(() => [undefined]);
        const contentType = String(meta?.contentType || "").toLowerCase();
        if (!contentType.includes("pdf")) {
            res.status(415).json({ error: `Unsupported content type: ${contentType || "unknown"} (PDF only)` });
            return;
        }
        // 2) Download and extract text
        const [downloaded] = await file.download();
        const nodeBuffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded);
        if (!nodeBuffer?.length) {
            res.status(500).json({ error: "Downloaded file buffer is empty. Cannot parse." });
            return;
        }
        const { extractPdfText } = await Promise.resolve().then(() => __importStar(require("../config/index.js")));
        const text = await extractPdfText(nodeBuffer);
        if (!text?.trim()) {
            res.status(500).json({ error: "Extracted text is empty." });
            return;
        }
        // 1) Deterministic parse
        let extracted = (0, npa_1.parseNpaInvoiceText)(text);
        // 2) If zero units, try LLM enrich (kept optional)
        if (!extracted.units.length) {
            try {
                const model = (0, config_1.getGeminiModel)();
                const prompt = `Return STRICT JSON: { invoiceDate?: "YYYY-MM-DD", invoiceMeta?: { aucNo?: string, saleLocation?: string }, units: [{ vin: string, year?: number, make?: string, model?: string, color?: string, hours?: number, odometer?: number, saleLocation?: string, itemPrice?: number, buyerFee?: number, onlineFee?: number, titleInfo?: string, stockNo?: string, aucNo?: string }] } from the following TEXT.\nTEXT:\n"""${text.slice(0, 20000)}"""`;
                const ai = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
                const llm = JSON.parse(ai.response?.text() || "{}");
                extracted = {
                    invoiceDate: extracted.invoiceDate || llm.invoiceDate,
                    invoiceMeta: { ...(extracted.invoiceMeta || {}), ...(llm.invoiceMeta || {}) },
                    units: (Array.isArray(llm.units) ? llm.units : []).map((u, i) => ({ ...(extracted.units[i] || {}), ...u }))
                };
            }
            catch { /* ignore */ }
        }
        // 3) Seed with VINs if still empty
        if (!Array.isArray(extracted.units) || !extracted.units.length) {
            for (const vin of (0, config_1.extractVinsFromText)(text))
                extracted.units.push({ vin, managementFee: 100 });
        }
        // 4) Normalize values
        for (const u of extracted.units) {
            if (!u)
                continue;
            if (typeof u.vin === "string")
                u.vin = u.vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
            u.itemPrice = (0, config_1.num)(u.itemPrice);
            u.buyerFee = (0, config_1.num)(u.buyerFee);
            u.onlineFee = (0, config_1.num)(u.onlineFee);
            u.managementFee = u.managementFee == null ? 100 : (0, config_1.num)(u.managementFee);
            if (u.year != null)
                u.year = Number(u.year) || undefined;
            if (u.hours != null)
                u.hours = Number(u.hours) || undefined;
            if (u.odometer != null)
                u.odometer = Number(u.odometer) || undefined;
        }
        // 5) Correct invoice date & ts (pin to noon UTC to avoid UTC shift)
        const iso = (0, config_1.normalizeIsoFromDateLike)(extracted.invoiceDate);
        const invoiceDateTs = iso ? new Date(`${iso}T12:00:00.000Z`) : null;
        // 6) Create a stable copy of the original invoice alongside the batch
        const stagingId = config_1.db.collection("stagingInvoices").doc().id;
        const srcFile = config_1.bucket.file(gcsPath);
        const dstPath = `staging-invoices/${stagingId}/original.pdf`;
        await srcFile.copy(config_1.bucket.file(dstPath));
        const [fileUrl] = await config_1.bucket.file(dstPath).getSignedUrl({
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        await config_1.db.collection("stagingInvoices").doc(stagingId).set({
            source: "auction",
            gcsPath: dstPath, // point to the stable copy
            fileUrl, // signed URL to stable copy
            createdAt: config_1.FieldValue.serverTimestamp(),
            updatedAt: config_1.FieldValue.serverTimestamp(),
            invoiceMeta: extracted.invoiceMeta ?? {},
            invoiceDate: iso || null,
            invoiceDateTs: invoiceDateTs || null,
            unitsCount: extracted.units.length,
            uploaderUid: gcsPath.split("/")[2] || null,
            status: "new",
        });
        // 7) write units
        const batch = config_1.db.batch();
        for (const u of extracted.units) {
            const unitRef = config_1.db.collection("stagingInvoices").doc(stagingId).collection("units").doc();
            batch.set(unitRef, { ...u, createdAt: config_1.FieldValue.serverTimestamp(), updatedAt: config_1.FieldValue.serverTimestamp(), processed: false });
        }
        await batch.commit();
        res.json({ ok: true, stagingId, unitsCount: extracted.units.length, invoiceDate: iso, invoiceDateDisplay: (0, config_1.toUsDate)(iso) });
    }
    catch (e) {
        console.error("startInvoiceParse error", e?.stack || e);
        res.status(500).json({ error: e?.message || "Parse failed" });
    }
});
/* ---------------- createJacketFromUnit / createJacketsForInvoice ---------------- */
exports.createJacketFromUnit = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    (0, config_1.assertAdmin)(request);
    const { stagingId, unitId } = request.data || {};
    if (!stagingId || !unitId)
        throw new https_1.HttpsError("invalid-argument", "stagingId and unitId are required.");
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    const stagingRef = config_1.db.collection("stagingInvoices").doc(String(stagingId));
    const stagingSnap = await stagingRef.get();
    if (!stagingSnap.exists)
        throw new https_1.HttpsError("not-found", "Staging batch not found.");
    const staging = stagingSnap.data();
    const unitRef = stagingRef.collection("units").doc(String(unitId));
    const unitSnap = await unitRef.get();
    if (!unitSnap.exists)
        throw new https_1.HttpsError("not-found", "Staged unit not found.");
    const unit = unitSnap.data();
    const vin = unit.vin?.trim()?.toUpperCase();
    if (!vin)
        throw new https_1.HttpsError("failed-precondition", "Staged unit has no VIN.");
    const isIso = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const pickedIso = isIso(staging?.invoiceDate)
        ? staging.invoiceDate
        : isIso(unit?.invoiceDate)
            ? unit.invoiceDate
            : null;
    let auctionSaleDate = config_1.FieldValue.serverTimestamp();
    if (pickedIso)
        auctionSaleDate = new Date(`${pickedIso}T12:00:00.000Z`);
    else if (staging?.invoiceDateTs)
        auctionSaleDate = staging.invoiceDateTs;
    const jacketRef = config_1.db.collection("jackets").doc(vin);
    await config_1.db.runTransaction(async (tx) => {
        const jacketSnap = await tx.get(jacketRef);
        const jacketData = {
            vin,
            year: Number(unit.year || 0) || undefined,
            make: unit.make || "",
            model: unit.model || "",
            color: unit.color || "",
            odometer: Number(unit.odometer || unit.hours || 0) || 0,
            hours: Number(unit.hours || 0) || undefined,
            unitType: unit.unitType || "Other",
            hasTrailer: !!unit.hasTrailer,
            length: Number(unit.length || 0) || undefined,
            engine: unit.engine || undefined,
            saleLocation: unit.saleLocation || staging?.invoiceMeta?.saleLocation || "",
            titleInfo: unit.titleInfo || "",
            itemPrice: Number(unit.itemPrice || 0),
            buyerFee: Number(unit.buyerFee || 0),
            onlineFee: Number(unit.onlineFee || 0),
            managementFee: Number(unit.managementFee || 100),
            auctionSaleDate,
            invoiceDate: pickedIso || null,
            invoiceDateDisplay: staging?.invoiceDateDisplay || null,
            isAuctionPaid: false,
            isMgmtFeePaid: false,
            miscFees: [],
            documents: [],
            updatedAt: config_1.FieldValue.serverTimestamp(),
        };
        if (!jacketSnap.exists) {
            jacketData.createdAt = config_1.FieldValue.serverTimestamp();
            jacketData.jacketId = `J${Date.now()}`;
            tx.set(jacketRef, jacketData);
        }
        else {
            tx.update(jacketRef, jacketData);
        }
    });
    // reference back and mark processed
    await unitRef.update({
        processed: true,
        processedAt: config_1.FieldValue.serverTimestamp(),
        processedBy: request.auth.uid,
        jacketVin: vin,
        jacketPath: jacketRef.path,
    });
    // copy the auction PDF into the jacket
    if (staging?.gcsPath) {
        await copyAuctionPdfToJacket(staging.gcsPath, vin).catch(() => { });
    }
    // If all units processed, mark batch processed
    const remainingQuery = await stagingRef.collection("units").where("processed", "==", false).limit(1).get();
    if (remainingQuery.empty) {
        await stagingRef.update({ status: "processed", processedAt: config_1.FieldValue.serverTimestamp() });
    }
    return { success: true, path: jacketRef.path, vin };
});
exports.createJacketsForInvoice = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    (0, config_1.assertAdmin)(request);
    const { stagingId } = request.data || {};
    if (!stagingId)
        throw new https_1.HttpsError("invalid-argument", "stagingId required");
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    const stagingRef = config_1.db.collection("stagingInvoices").doc(String(stagingId));
    const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
    if (unitsSnap.empty)
        return { success: true, created: 0 };
    let created = 0;
    for (const doc of unitsSnap.docs) {
        const unitId = doc.id;
        await exports.createJacketFromUnit.run({
            data: { stagingId, unitId },
            auth: request.auth,
        });
        created++;
    }
    return { success: true, created };
});
//# sourceMappingURL=staging.js.map