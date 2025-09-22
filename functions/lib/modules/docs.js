"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachStagedDocToJacket = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
exports.attachStagedDocToJacket = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    (0, config_1.assertAdmin)(request);
    const { docId, vin, typeOverride } = request.data || {};
    if (!docId || !vin) {
        throw new https_1.HttpsError("invalid-argument", "docId and vin are required.");
    }
    const stagedDocRef = config_1.db.collection("stagedDocs").doc(docId);
    const stagedDocSnap = await stagedDocRef.get();
    if (!stagedDocSnap.exists) {
        throw new https_1.HttpsError("not-found", "Staged document not found.");
    }
    const stagedDoc = stagedDocSnap.data();
    const gcsPath = stagedDoc.gcsPath;
    if (!gcsPath) {
        throw new https_1.HttpsError("failed-precondition", "Staged document is missing the gcsPath.");
    }
    const fileName = gcsPath.split("/").pop() || `doc-${Date.now()}`;
    const docType = typeOverride || stagedDoc.type || "other";
    const newPath = `jacket-documents/${vin}/${docType}/${fileName}`;
    await config_1.bucket.file(gcsPath).copy(newPath);
    const newFile = config_1.bucket.file(newPath);
    const [signedUrl] = await newFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const newDocument = {
        id: `doc-${Date.now()}`,
        name: fileName,
        type: docType,
        url: signedUrl,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await config_1.db.collection("jackets").doc(vin).update({
        documents: firestore_1.FieldValue.arrayUnion(newDocument),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await stagedDocRef.delete().catch(() => { });
    return { success: true, message: `Document attached to jacket ${vin}.` };
});
//# sourceMappingURL=docs.js.map