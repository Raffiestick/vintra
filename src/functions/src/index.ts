
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";

// Initialize lazily
if (getApps().length === 0) {
  initializeApp();
}

function assertAdmin(request: CallableRequest) {
  if (request.auth?.token?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

export const getJacketByVin = onCall(async (request: CallableRequest) => {
    const db = getFirestore();
    const vin = request.data.vin;
    if (!vin || typeof vin !== 'string') {
        throw new HttpsError("invalid-argument", "The function must be called with a 'vin' string.");
    }

    try {
        const jacketRef = db.collection("jackets").doc(vin);
        const jacketSnap = await jacketRef.get();

        if (!jacketSnap.exists) {
            throw new HttpsError("not-found", `No jacket found with VIN: ${vin}`);
        }
        
        return jacketSnap.data();
    } catch (error) {
        logger.error(`Error fetching jacket for VIN ${vin}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError("internal", "An error occurred while fetching the jacket.");
    }
});


export const manageDealerApplication = onCall(async (request: CallableRequest) => {
    assertAdmin(request);
    const db = getFirestore();
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
        logger.error("Error managing dealer application:", error);
        throw new HttpsError("internal", "An error occurred while managing the application.");
    }
});

export const generateJacketId = onCall(async (request: CallableRequest) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});

export const parseAuctionInvoice = onCall(
  { region: "us-central1", timeoutSeconds: 540, memory: "1GiB" },
  async (request: CallableRequest) => {
    assertAdmin(request);
    // Placeholder for AI-based invoice parsing logic
    // It would receive file data (e.g., a data URI) and use Genkit to extract details.
    return { 
        vin: "VIN_FROM_AI",
        year: "YEAR_FROM_AI",
        make: "MAKE_FROM_AI",
        model: "MODEL_FROM_AI",
    }
});
