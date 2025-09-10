import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
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
function assertAdmin(request) {
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
    const role = request.auth.token?.role;
    if (role !== "admin") {
        logger.warn(`Admin check failed for UID: ${request.auth.uid}. Role is: ${role}`);
        throw new HttpsError("permission-denied", "Admin privileges required.");
    }
}
export const manageDealerApplication = onCall({ region: "us-central1", secrets: [DEV_ADMIN_UID] }, async (request) => {
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
        }
        else if (action === "deny") {
            await userDocRef.update({ status: "denied" });
        }
        return { success: true, message: `User ${uid} has been ${action}d.` };
    }
    catch (error) {
        logger.error("Error managing dealer application:", error);
        throw new HttpsError("internal", "An error occurred while managing the application.");
    }
});
export const generateJacketId = onCall({ region: "us-central1", secrets: [DEV_ADMIN_UID] }, async (request) => {
    assertAdmin(request);
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
});
// Placeholder for the PDF generation function. We will implement this later.
export const generateJacketDocuments = onCall({ region: "us-central1", secrets: [DEV_ADMIN_UID] }, async (request) => {
    assertAdmin(request);
    const { vin } = request.data;
    if (!vin) {
        throw new HttpsError("invalid-argument", "The function must be called with a 'vin'.");
    }
    // TODO: Implement PDF generation logic using Puppeteer.
    logger.info(`Placeholder: Document generation requested for VIN: ${vin}`);
    // For now, return a placeholder URL.
    return {
        pdfUrl: `https://example.com/placeholder-for-${vin}.pdf`
    };
});
// --- BEGIN grantAdminRole (secure) ---
/**
 * POST https://us-central1-<PROJECT-ID>.cloudfunctions.net/grantAdminRole
 * Headers:  x-admin-seed: <SECRET>
 * Body:     { "targetUid": "<FIREBASE_UID>" }
 */
export const grantAdminRole = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }
        const cfg = functions.config();
        const seed = (cfg.admin && cfg.admin.seed_token) ? String(cfg.admin.seed_token) : "";
        const header = String(req.get("x-admin-seed") || "");
        if (!seed || header !== seed) {
            functions.logger.warn("Unauthorized attempt to grant admin role.");
            return res.status(401).send("Unauthorized");
        }
        const { targetUid } = req.body || {};
        if (!targetUid || typeof targetUid !== "string") {
            return res.status(400).send("Missing targetUid");
        }
        await admin.auth().setCustomUserClaims(targetUid, { role: "admin", admin: true });
        functions.logger.info(`Successfully granted admin role to ${targetUid}`);
        return res.json({ ok: true, targetUid });
    }
    catch (err) {
        functions.logger.error("grantAdminRole error", err);
        return res.status(500).send(err?.message || "Internal error");
    }
});
// --- END grantAdminRole (secure) ---
