import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { adminAuth, assertAdmin, db } from "../config";

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
    try {
      await userDocRef.update({ status: action === "approve" ? "approved" : "denied" });
      return { success: true, message: `User ${uid} has been ${action}d.` };
    } catch (err: any) {
      console.error("manageDealerApplication error:", err);
      throw new HttpsError("internal", err?.message || "Failed to manage application.");
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
