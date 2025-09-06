
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

// Secret to allow one dev UID to bypass claim check (only if set)
const DEV_ADMIN_UID = defineSecret("DEV_ADMIN_UID");

// Initialize lazily
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Require admin privileges.
 * If DEV_ADMIN_UID is set and matches the caller’s UID, bypass for development.
 */
function assertAdmin(request: CallableRequest) {
  // Must be signed in
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  // Optional dev bypass via secret (safe: inert if unset)
  const devBypass = DEV_ADMIN_UID.value(); // empty string if not defined
  if (devBypass && request.auth.uid === devBypass) {
    logger.info(`Bypassing admin check for dev UID: ${request.auth.uid}`);
    return; // bypass granted for development
  }

  // Normal path: check custom claim
  const role = (request.auth.token as any)?.role;
  if (role !== "admin") {
    logger.warn(`Admin check failed for UID: ${request.auth.uid}. Role is: ${role}`);
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


export const manageDealerApplication = onCall({ secrets: [DEV_ADMIN_UID] }, async (request: CallableRequest) => {
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

export const generateJacketId = onCall({ secrets: [DEV_ADMIN_UID] }, async (request: CallableRequest) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});

export const parseAuctionInvoice = onCall(
  { region: "us-central1", timeoutSeconds: 540, memory: "1GiB", secrets: [DEV_ADMIN_UID] },
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
