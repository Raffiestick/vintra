
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Helper function to check for admin role from Firestore
const isAdmin = async (uid: string): Promise<boolean> => {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return false;
  return userDoc.data()?.role === "admin";
};

export const manageDealerApplication = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  const callerUid = request.auth.uid;
  if (!(await isAdmin(callerUid))) {
    throw new HttpsError("permission-denied", "The caller does not have administrative privileges.");
  }

  const { uid, action } = request.data;
  if (!uid || !action || !["approve", "deny"].includes(action)) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'uid' and 'action' ('approve' or 'deny').");
  }

  const userDocRef = db.collection("users").doc(uid);

  try {
    if (action === "approve") {
      await userDocRef.update({ status: "approved" });
    } else if (action === "deny") {
      await userDocRef.update({ status: "denied" });
    }
    return { success: true, message: `User ${uid} has been ${action}d.` };
  } catch (error) {
    console.error("Error managing dealer application:", error);
    throw new HttpsError("internal", "An error occurred while managing the application.");
  }
});


export const generateJacketId = onCall(async (request) => {
    // For now, this function generates a simple random ID.
    // This can be replaced with a more robust sequential ID generator if needed.
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});

export const parseAuctionInvoice = onCall(async(request) => {
  // Placeholder for AI-based invoice parsing logic
  // It would receive file data (e.g., a data URI) and use Genkit to extract details.
  return { 
    vin: "VIN_FROM_AI",
    year: "YEAR_FROM_AI",
    make: "MAKE_FROM_AI",
    model: "MODEL_FROM_AI",
  }
});
