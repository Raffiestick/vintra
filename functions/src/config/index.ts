import * as admin from "firebase-admin";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import pdf from "pdf-parse";

// Initialize Firebase Admin SDK if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export core Firebase services
export const db = getFirestore();
export const auth = getAuth();

// Helper to assert admin privileges
export function assertAdmin(request: CallableRequest): void {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "This function can only be called by an admin.");
  }
}

// Helper to extract text from a PDF
export async function extractPdfText(buf: Buffer): Promise<string> {
    const data = await pdf(buf);
    return data.text;
}

// ADDED BACK: This function is needed by the npa parser
export function pickInvoiceDateFromHeader(text: string): string | null {
    const dateMatch = text.match(/DATE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (!dateMatch) return null;
    try {
        const date = new Date(dateMatch[1]);
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) {
        return null;
    }
}
