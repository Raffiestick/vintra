"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJacketFromUnit = void 0;
// functions/src/modules/staging.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config"); // ✅ make sure this path is exactly ../config
exports.createJacketFromUnit = (0, https_1.onCall)({ region: "us-central1", secrets: [] }, // DEV_ADMIN_UID used inside assertAdmin which already has the secret registered there.
async (request) => {
    try {
        console.log("[createJacketFromUnit] incoming", {
            auth: !!request.auth,
            uid: request.auth?.uid,
            data: request.data,
        });
        // Admin gate
        (0, config_1.assertAdmin)(request);
        if (!request.auth?.uid) {
            throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
        }
        const { stagingId, unitId } = request.data || {};
        if (!stagingId || !unitId) {
            throw new https_1.HttpsError("invalid-argument", "stagingId and unitId are required.");
        }
        const stagingRef = config_1.db.collection("stagingInvoices").doc(String(stagingId));
        const stagingSnap = await stagingRef.get();
        if (!stagingSnap.exists) {
            throw new https_1.HttpsError("not-found", "Staging batch not found.");
        }
        const staging = stagingSnap.data();
        const unitRef = stagingRef.collection("units").doc(String(unitId));
        const unitSnap = await unitRef.get();
        if (!unitSnap.exists) {
            throw new https_1.HttpsError("not-found", "Staged unit not found.");
        }
        const unit = unitSnap.data();
        const vin = unit?.vin?.toString()?.trim()?.toUpperCase();
        if (!vin) {
            throw new https_1.HttpsError("failed-precondition", "Staged unit has no VIN.");
        }
        // Prefer ISO on staging header; fall back to unit; else keep server time
        const isIso = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
        const pickedIso = isIso(staging?.invoiceDate) ? staging.invoiceDate :
            isIso(unit?.invoiceDate) ? unit.invoiceDate : null;
        let auctionSaleDate = firestore_1.FieldValue.serverTimestamp();
        if (pickedIso) {
            // Noon UTC avoids day shifts around local TZ midnight
            auctionSaleDate = new Date(`${pickedIso}T12:00:00.000Z`);
        }
        else if (staging?.invoiceDateTs) {
            auctionSaleDate = staging.invoiceDateTs;
        }
        const jacketRef = config_1.db.collection("jackets").doc(vin);
        await config_1.db.runTransaction(async (tx) => {
            const jacketSnap = await tx.get(jacketRef);
            const num = (x) => typeof x === "number" ? x :
                typeof x === "string" ? Number(x.replace(/[$,]/g, "")) || 0 : 0;
            const jacketData = {
                vin,
                year: num(unit.year) || undefined,
                make: unit.make || "",
                model: unit.model || "",
                color: unit.color || "",
                odometer: num(unit.odometer) || num(unit.hours) || 0,
                saleLocation: unit.saleLocation || staging?.invoiceMeta?.saleLocation || "",
                itemPrice: num(unit.itemPrice),
                buyerFee: num(unit.buyerFee),
                onlineFee: num(unit.onlineFee),
                managementFee: num(unit.managementFee) || 100,
                auctionSaleDate,
                invoiceDate: pickedIso || null,
                isAuctionPaid: false,
                isMgmtFeePaid: false,
                miscFees: [],
                documents: [],
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            };
            if (!jacketSnap.exists) {
                jacketData.createdAt = firestore_1.FieldValue.serverTimestamp();
                jacketData.jacketId = `J${Date.now()}`;
                tx.set(jacketRef, jacketData);
            }
            else {
                tx.update(jacketRef, jacketData);
            }
        });
        await unitRef.update({
            processed: true,
            processedAt: firestore_1.FieldValue.serverTimestamp(),
            processedBy: request.auth.uid ?? null, // ✅ defensive
            jacketVin: vin,
            jacketPath: jacketRef.path,
        });
        // If all units processed, mark header as processed
        const remaining = await stagingRef
            .collection("units")
            .where("processed", "==", false)
            .limit(1)
            .get();
        if (remaining.empty) {
            await stagingRef.update({
                status: "processed",
                processedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        console.log("[createJacketFromUnit] OK", { vin });
        return { success: true, path: jacketRef.path, vin };
    }
    catch (err) {
        console.error("[createJacketFromUnit] ERROR", err?.stack || err);
        // Ensure client sees a proper Functions error, not a generic 500
        if (err?.code && typeof err.code === "string")
            throw err;
        throw new https_1.HttpsError("internal", err?.message || "Internal error");
    }
});
//# sourceMappingURL=staging.js.map