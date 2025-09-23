// functions/src/utils.ts

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./config";

/**
 * Checks if the request is coming from an authenticated admin user.
 * Throws a "permission-denied" error if not.
 * @param {CallableRequest} request The function request context.
 */
export function assertAdmin(request: CallableRequest): void {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "This function can only be called by an admin.");
  }
}

/**
 * Logs an activity entry to a specific jacket's subcollection in Firestore.
 * @param {string} vin The VIN of the jacket.
 * @param {object} entry The activity data to log.
 */
export async function logActivity(vin: string, entry: object) {
    if (!vin) return;
    const activityRef = db.collection('jackets').doc(vin).collection('activity');
    await activityRef.add({
        ...entry,
        timestamp: FieldValue.serverTimestamp(),
    });
}

/**
 * Extracts a date from a raw text string based on a specific format.
 * @param {string} text The text to parse.
 * @returns {string | null} The date in YYYY-MM-DD format or null.
 */
export function pickInvoiceDateFromHeader(text: string): string | null {
    const dateMatch = text.match(/DATE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (!dateMatch) return null;
    try {
        const date = new Date(dateMatch[1]);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
}