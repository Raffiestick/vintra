"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageDealerApplication = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
exports.manageDealerApplication = (0, https_1.onCall)(async (request) => {
    // Check authentication and admin role.
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    const userRecord = await auth.getUser(callerUid);
    const customClaims = userRecord.customClaims;
    if ((customClaims === null || customClaims === void 0 ? void 0 : customClaims.role) !== "admin") {
        throw new https_1.HttpsError("permission-denied", "The caller does not have administrative privileges.");
    }
    const { uid, action } = request.data;
    if (!uid || !action || !["approve", "deny"].includes(action)) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with a 'uid' and 'action' ('approve' or 'deny').");
    }
    const userDocRef = db.collection("users").doc(uid);
    try {
        if (action === "approve") {
            // Set custom claim for the user to give them dealer role
            await auth.setCustomUserClaims(uid, { role: "dealer" });
            // Update user status in Firestore
            await userDocRef.update({ status: "approved" });
        }
        else if (action === "deny") {
            // Update user status in Firestore
            await userDocRef.update({ status: "denied" });
        }
        return { success: true, message: `User ${uid} has been ${action}d.` };
    }
    catch (error) {
        console.error("Error managing dealer application:", error);
        throw new https_1.HttpsError("internal", "An error occurred while managing the application.");
    }
});
//# sourceMappingURL=index.js.map