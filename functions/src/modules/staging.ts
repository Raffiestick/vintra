"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJacketsForInvoice = exports.createJacketFromUnit = void 0;

// functions/src/modules/staging.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
const npa_1 = require("../parsers/npa");

// NEW: Define more robust data structures to support all your requirements.
// This is our blueprint for what a "Jacket" document will look like.
interface VehicleUnit {
  vinOrHin?: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  odometer?: number;
  hours?: number;
  lengthFeet?: number;
  engine?: string;
}

interface Financials {
  itemPrice: number;
  buyerFee: number;
  onlineFee: number;
  managementFee: number;
  miscFees: { name: string; amount: number }[]; // For easy editing
  totalPurchasePrice: number;
}

interface Jacket {
  vin: string; // The primary VIN is the document ID
  jacketId: string;
  primaryUnit: VehicleUnit;
  trailerUnit?: VehicleUnit; // Handles the boat+trailer case
  financials: Financials;

  // Metadata
  auctionSaleDate: Date | firestore_1.FieldValue;
  invoiceDate?: string | null;
  saleLocation?: string;
  titleInfo?: string;
  stockNo?: string;
  aucNo?: string;

  // Statuses
  isAuctionPaid: boolean;
  isMgmtFeePaid: boolean;

  // System Timestamps
  documents: any[];
  createdAt: firestore_1.FieldValue;
  updatedAt: firestore_1.FieldValue;
}

/**
 * UPDATED: This helper function now builds a more robust Jacket document
 * based on our new, flexible data structure.
 */
async function _createJacketFromUnit(stagingId, unitId, actorUid) {
    const stagingRef = config_1.db.collection("stagingInvoices").doc(String(stagingId));
    const stagingSnap = await stagingRef.get();
    if (!stagingSnap.exists) {
        throw new https_1.HttpsError("not-found", "Staging batch not found.");
    }
    const staging = stagingSnap.data();

    const unitSnap = await stagingRef.collection("units").doc(String(unitId)).get();
    if (!unitSnap.exists) {
        throw new https_1.HttpsError("not-found", "Staged unit not found.");
    }
    const unit = unitSnap.data();

    if (unit.processed) {
        console.log(`Unit ${unitId} already processed. Skipping.`);
        return { success: true, path: unit.jacketPath, vin: unit.jacketVin };
    }

    // UPDATED: Prefer a 17-digit VIN, but fall back to HIN or even Stock # for ID
    const vin = (unit?.vin?.toString() || unit?.hin?.toString() || unit?.stockNo?.toString() || "")
        .trim().toUpperCase();

    if (!vin) {
        console.error("_createJacketFromUnit: unit has no valid identifier (VIN, HIN, or Stock #)", { stagingId, unitId, unit });
        throw new https_1.HttpsError("failed-precondition", "Staged unit has no valid identifier.");
    }
    
    // Date handling logic remains the same
    const isIso = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const pickedIso = isIso(staging?.invoiceDate) ? staging.invoiceDate :
        isIso(unit?.invoiceDate) ? unit.invoiceDate : null;
    let auctionSaleDate = firestore_1.FieldValue.serverTimestamp();
    if (pickedIso) {
        auctionSaleDate = new Date(`${pickedIso}T12:00:00.000Z`);
    } else if (staging?.invoiceDateTs) {
        auctionSaleDate = staging.invoiceDateTs;
    }

    const jacketRef = config_1.db.collection("jackets").doc(vin);
    
    await config_1.db.runTransaction(async (tx) => {
        const jacketSnap = await tx.get(jacketRef);
        
        const num = (x) => typeof x === "number" ? x :
            typeof x === "string" ? Number(x.replace(/[$,]/g, "")) || 0 : 0;
            
        // UPDATED: Map parsed data to the new, richer Jacket structure.
        // This is designed for flexibility and easy admin editing later.
        const itemPrice = num(unit.itemPrice);
        const buyerFee = num(unit.buyerFee);
        const onlineFee = num(unit.onlineFee);
        const managementFee = num(unit.managementFee) || 100; // Default

        const jacketData = {
            vin,
            primaryUnit: {
                vinOrHin: unit.vinOrHin || vin,
                year: num(unit.year) || undefined,
                make: unit.make || "",
                model: unit.model || "",
                color: unit.color || "",
                odometer: num(unit.odometer) || undefined,
                hours: num(unit.hours) || undefined,
                lengthFeet: num(unit.lengthFeet) || undefined,
                engine: unit.engine || "",
            },
            // trailerUnit: {}, // Logic to populate this will be added when we tune the parser
            financials: {
                itemPrice,
                buyerFee,
                onlineFee,
                managementFee,
                miscFees: [], // Admins can add fees to this array later
                totalPurchasePrice: itemPrice + buyerFee + onlineFee + managementFee,
            },
            auctionSaleDate,
            invoiceDate: pickedIso || null,
            saleLocation: unit.saleLocation || staging?.invoiceMeta?.saleLocation || "",
            titleInfo: unit.titleInfo || "",
            stockNo: unit.stockNo || "",
            aucNo: unit.aucNo || "",
            isAuctionPaid: false,
            isMgmtFeePaid: false,
            documents: [],
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };

        if (!jacketSnap.exists) {
            jacketData.createdAt = firestore_1.FieldValue.serverTimestamp();
            jacketData.jacketId = `J${Date.now()}`;
            tx.set(jacketRef, jacketData);
        } else {
            tx.update(jacketRef, jacketData);
        }
    });

    await unitSnap.ref.update({
        processed: true,
        processedAt: firestore_1.FieldValue.serverTimestamp(),
        processedBy: actorUid,
        jacketVin: vin,
        jacketPath: jacketRef.path,
    });

    // Mark header as processed if all units are done
    const remaining = await stagingRef.collection("units").where("processed", "==", false).limit(1).get();
    if (remaining.empty) {
        await stagingRef.update({ status: "processed", processedAt: firestore_1.FieldValue.serverTimestamp() });
    }

    return { success: true, path: jacketRef.path, vin };
}

// No significant changes needed to the callable function wrappers below.
// The core logic change is all in _createJacketFromUnit.
exports.createJacketFromUnit = (0, https_1.onCall)({ region: "us-central1", secrets: [] }, async (request) => {
    try {
        (0, config_1.assertAdmin)(request);
        const { stagingId, unitId } = request.data || {};
        if (!stagingId || !unitId) throw new https_1.HttpsError("invalid-argument", "stagingId and unitId are required.");
        if (!request.auth?.uid) throw new https_1.HttpsError("unauthenticated", "Authentication required.");
        return await _createJacketFromUnit(stagingId, unitId, request.auth.uid);
    } catch (err) {
        console.error("[createJacketFromUnit] ERROR", err?.stack || err);
        if (err?.code && typeof err.code === "string") throw err;
        throw new https_1.HttpsError("internal", err?.message || "An internal error occurred.");
    }
});

exports.createJacketsForInvoice = (0, https_1.onCall)({ region: "us-central1", secrets: ["GEMINI_API_KEY"], memory: '1GiB', timeoutSeconds: 300 }, async (request) => {
    (0, config_1.assertAdmin)(request);
    const actorUid = request.auth?.uid;
    if (!actorUid) throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    let sid = request.data?.sid || "";
    let sourceUrl = request.data?.sourceUrl || "";

    if (sid) {
        const docRef = config_1.db.collection("stagingInvoices").doc(sid);
        const snap = await docRef.get();
        if (!snap.exists) throw new https_1.HttpsError("not-found", `stagingInvoices/${sid} not found`);
        const stg = snap.data() || {};
        if (!stg.sourceUrl && sourceUrl) {
            await docRef.set({ sourceUrl, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        }
        sourceUrl = stg.sourceUrl || sourceUrl;
        if (!sourceUrl) throw new https_1.HttpsError("failed-precondition", "sourceUrl missing on staging invoice");
    } else if (sourceUrl) {
        const ref = await config_1.db.collection("stagingInvoices").add({
            sourceUrl, parseStatus: "uploaded", createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        sid = ref.id;
    }
    if (!sid || !sourceUrl) throw new https_1.HttpsError("invalid-argument", "Provide either { sid } or { sourceUrl }");

    try {
        const stagingRef = config_1.db.collection("stagingInvoices").doc(sid);
        
        console.log("--- RAW INVOICE TEXT ---", JSON.stringify("")); // Keep this for our next step!
        
        const text = await (0, config_1.extractTextFromDocument)(sourceUrl);
        const parsed = (0, npa_1.parseNpaInvoiceText)(text);
        
        await stagingRef.set({
            invoiceDate: parsed.invoiceDate || null, invoiceMeta: parsed.invoiceMeta || {}, parseStatus: 'parsed', updatedAt: firestore_1.FieldValue.serverTimestamp()
        }, { merge: true });
        
        const batch = config_1.db.batch();
        for (const unit of parsed.units) {
            const unitRef = stagingRef.collection("units").doc();
            batch.set(unitRef, { ...unit, createdAt: firestore_1.FieldValue.serverTimestamp(), processed: false });
        }
        await batch.commit();

        const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
        if (unitsSnap.empty) return { success: true, created: 0, sid };
        
        let created = 0;
        const vins = [];
        for (const unitDoc of unitsSnap.docs) {
            try {
                const result = await _createJacketFromUnit(sid, unitDoc.id, actorUid);
                if (result.vin) vins.push(result.vin);
                created++;
            } catch (e) {
                console.error(`Failed to process unit ${unitDoc.id} in batch ${sid}:`, e?.message);
            }
        }
        return { success: true, created, sid, vins, vin: vins[0] };
    } catch (err) {
        console.error("[createJacketsForInvoice] ERROR", err?.stack || err);
        if (err?.code && typeof err.code === "string") throw err;
        throw new https_1.HttpsError("internal", err?.message || "An internal error occurred.");
    }
});