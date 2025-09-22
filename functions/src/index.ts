import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getFunctions } from "firebase-admin/functions";
import { CallableRequest } from "firebase-functions/v2/https";
import pdf from "pdf-parse";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export core Firebase services
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
const functions = getFunctions();

// Helper function to assert admin privileges
function assertAdmin(request: CallableRequest): void {
  if (!request.auth?.token?.admin) {
    throw new HttpsError(
      "permission-denied",
      "This function can only be called by an admin."
    );
  }
}

// Helper to extract text from a document in Storage
async function extractTextFromDocument(sourceUrl: string): Promise<string> {
    const resp = await fetch(sourceUrl);
    const buf = Buffer.from(await resp.arrayBuffer());

    if (sourceUrl.toLowerCase().includes(".pdf")) {
        const data = await pdf(buf);
        return data.text;
    } else if (/\.(jpe?g|png|gif|webp)$/i.test(sourceUrl)) {
        console.warn("Image text extraction with Gemini is not yet implemented in this file.");
        return ""; 
    }
    throw new HttpsError('invalid-argument', 'sourceUrl must be a PDF or image file.');
}

export { 
  admin, 
  db, 
  auth, 
  storage,
  functions,
  assertAdmin, 
  extractTextFromDocument 
};