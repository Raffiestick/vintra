"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
exports.signInWithCustomToken = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const uid = request.auth.uid;
    try {
        const customToken = await config_1.auth.createCustomToken(uid);
        return { token: customToken };
    }
    catch (error) {
        console.error("Error creating custom token:", error);
        throw new https_1.HttpsError("internal", error.message || "Unable to create custom token.");
    }
});
exports.manageDealerApplication = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    var _a;
    (0, config_1.assertAdmin)(request);
    const { uid, action } = request.data;
    if (!uid || !action || !["approve", "deny"].includes(action)) {
        throw new https_1.HttpsError("invalid-argument", "UID and a valid action ('approve' or 'deny') are required.");
    }
    const userDocRef = config_1.db.collection("users").doc(uid);
    if (action === 'deny') {
        await userDocRef.update({ status: "denied" });
        return { success: true, message: `User ${uid} has been denied.` };
    }
    if (action === 'approve') {
        await config_1.auth.setCustomUserClaims(uid, { dealer: true });
        await userDocRef.update({
            status: "approved",
            approvedAt: firestore_1.FieldValue.serverTimestamp(),
            approvedBy: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
        });
        return { success: true, message: `User ${uid} has been approved.` };
    }
    // This line will only be reached if the action is invalid.
    throw new https_1.HttpsError("invalid-argument", "Action must be 'approve' or 'deny'.");
});
exports.generateJacketId = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async () => {
    const jacketId = `J${Date.now()}`;
    return { jacketId };
});
//# sourceMappingURL=auth.js.map