"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("../config");
exports.signInWithCustomToken = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    const uid = request.auth.uid;
    try {
        const customToken = await config_1.adminAuth.createCustomToken(uid);
        return { token: customToken };
    }
    catch (error) {
        console.error("Error creating custom token:", error);
        throw new https_1.HttpsError("internal", "Unable to create custom token.", error.message);
    }
});
exports.manageDealerApplication = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    (0, config_1.assertAdmin)(request);
    const { uid, action } = request.data || {};
    if (!uid || !action || !["approve", "deny"].includes(String(action))) {
        throw new https_1.HttpsError("invalid-argument", "Provide 'uid' and 'action' of 'approve' or 'deny'.");
    }
    const userDocRef = config_1.db.collection("users").doc(String(uid));
    try {
        await userDocRef.update({ status: action === "approve" ? "approved" : "denied" });
        return { success: true, message: `User ${uid} has been ${action}d.` };
    }
    catch (err) {
        console.error("manageDealerApplication error:", err);
        throw new https_1.HttpsError("internal", err?.message || "Failed to manage application.");
    }
});
exports.generateJacketId = (0, https_1.onCall)({ region: "us-central1" }, async (_request) => {
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});
//# sourceMappingURL=auth.js.map