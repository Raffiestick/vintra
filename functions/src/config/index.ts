import * as admin from "firebase-admin";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import pdf from "pdf-parse";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
export const bucket = storage.bucket();

export const seller = {
    name: "RIZEUP VENTURES LLC DBA DOLPHIN CHASERS",
    line1: "4336 BELLA VISTA DR",
    line2: "ST PETE BEACH, FL 33706",
    phone: "616-318-1991",
};

export function assertAdmin(request: CallableRequest): void {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "This function can only be called by an admin.");
  }
}

export async function logActivity(vin: string, entry: object) {
    if (!vin) return;
    const activityRef = db.collection('jackets').doc(vin).collection('activity');
    await activityRef.add({
        ...entry,
        timestamp: FieldValue.serverTimestamp(),
    });
}

export async function extractPdfText(buf: Buffer): Promise<string> {
    const data = await pdf(buf);
    return data.text;
}

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
