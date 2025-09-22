import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth, assertAdmin } from "../config";

export const signInWithCustomToken = onCall({ cors: true, region: "us-central1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
    const uid = request.auth.uid;
    try {
        const customToken = await auth.createCustomToken(uid);
        return { token: customToken };
    } catch (error: any) {
        console.error("Error creating custom token:", error);
        throw new HttpsError("internal", error.message || "Unable to create custom token.");
    }
});

export const manageDealerApplication = onCall({ cors: true, region: "us-central1" }, async (request) => {
    assertAdmin(request);
    const { uid, action } = request.data;
    if (!uid || !action || !["approve", "deny"].includes(action)) {
        throw new HttpsError("invalid-argument", "UID and a valid action ('approve' or 'deny') are required.");
    }
    
    const userDocRef = db.collection("users").doc(uid);
    if (action === 'deny') {
        await userDocRef.update({ status: "denied" });
        return { success: true, message: `User ${uid} has been denied.` };
    }

    if (action === 'approve') {
        await auth.setCustomUserClaims(uid, { dealer: true });
        await userDocRef.update({
            status: "approved",
            approvedAt: FieldValue.serverTimestamp(),
            approvedBy: request.auth?.uid,
        });
        return { success: true, message: `User ${uid} has been approved.` };
    }
    
    // This line will only be reached if the action is invalid.
    throw new HttpsError("invalid-argument", "Action must be 'approve' or 'deny'.");
});

export const generateJacketId = onCall({ cors: true, region: "us-central1" }, async () => {
    const jacketId = `J${Date.now()}`;
    return { jacketId };
});

