
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { adminAuth, assertAdmin, db, FieldValue } from "../config";

export const signInWithCustomToken = onCall({ region: "us-central1" }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  const uid = request.auth.uid;
  try {
    const customToken = await adminAuth.createCustomToken(uid);
    return { token: customToken };
  } catch (error: any) {
    console.error("Error creating custom token:", error);
    throw new HttpsError("internal", "Unable to create custom token.", error.message);
  }
});

export const manageDealerApplication = onCall(
  { region: "us-central1" },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const { uid, action } = request.data || {};
    if (!uid || !action || !["approve", "deny"].includes(String(action))) {
      throw new HttpsError("invalid-argument", "Provide 'uid' and 'action' of 'approve' or 'deny'.");
    }

    const userDocRef = db.collection("users").doc(String(uid));

    if (action === 'deny') {
        try {
            await userDocRef.update({ status: "denied" });
            return { success: true, message: `User ${uid} has been denied.` };
        } catch (err: any) {
            console.error("manageDealerApplication (deny) error:", err);
            throw new HttpsError("internal", err?.message || "Failed to deny application.");
        }
    }
    
    // --- Approval Logic ---
    try {
        const snap = await userDocRef.get();
        if (!snap.exists) throw new HttpsError("not-found", "User not found");
        const user = snap.data() || {};
        const now = FieldValue.serverTimestamp();

        // 1. Set custom claims
        await adminAuth.setCustomUserClaims(uid, { dealer: true });

        // 2. Update user profile
        await userDocRef.set({
            status: "approved",
            approvedAt: now,
            approvedBy: request.auth?.uid,
            updatedAt: now,
        }, { merge: true });

        // 3. Upsert into approvedDealers collection
        const approvedRef = db.collection("approvedDealers").doc(uid);
        await approvedRef.set({
            uid,
            companyName: user.companyName ?? "",
            contactName: user.contactName ?? "",
            email: user.email ?? "",
            createdAt: user.createdAt ?? now,
            approvedAt: now,
            updatedAt: now,
        }, { merge: true });

        // 4. Audit log
        await userDocRef.collection("activity").add({
            type: "approved",
            actorUid: request.auth?.uid,
            at: now,
            meta: {},
        });

        return { success: true, message: `User ${uid} has been approved.` };
    } catch (err: any) {
        console.error("manageDealerApplication (approve) error:", err);
        throw new HttpsError("internal", err?.message || "Failed to approve application.");
    }
  }
);

export const generateJacketId = onCall(
  { region: "us-central1" },
  async (_request: CallableRequest) => {
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
  }
);
