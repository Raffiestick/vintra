"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStagingBatchFromManualEntry = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
exports.createStagingBatchFromManualEntry = (0, https_1.onCall)({ cors: /.*/ }, async (request) => {
    var _a;
    (0, config_1.assertAdmin)(request);
    const { invoiceDate, invoiceUrl, invoiceNumber, units } = request.data;
    const actorUid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!Array.isArray(units) || units.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "The 'units' array is required.");
    }
    try {
        const stagingRef = await config_1.db.collection("stagingInvoices").add({
            invoiceDate: invoiceDate || null,
            invoiceNumber: invoiceNumber || null,
            invoiceUrl: invoiceUrl || null,
            status: "manual-entry",
            uploaderUid: actorUid,
            fileName: invoiceUrl ? "Uploaded Invoice" : "Manual Entry",
            unitCount: units.length,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const sid = stagingRef.id;
        const batch = config_1.db.batch();
        for (const unit of units) {
            const unitRef = stagingRef.collection("units").doc();
            // This ensures we don't save empty fields to Firestore
            const cleanUnit = Object.fromEntries(Object.entries(unit).filter(([_, v]) => v !== '' && v !== null && v !== undefined));
            batch.set(unitRef, Object.assign(Object.assign({}, cleanUnit), { processed: false, createdAt: firestore_1.FieldValue.serverTimestamp() }));
        }
        await batch.commit();
        return { success: true, sid };
    }
    catch (error) {
        console.error("Error in createStagingBatchFromManualEntry:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to create staging batch.");
    }
});
//# sourceMappingURL=staging.js.map