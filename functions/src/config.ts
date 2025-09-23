// functions/src/config.ts

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Initialize the Firebase Admin SDK.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export handles to Firebase services.
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
export const bucket = storage.bucket();

// Export static seller info.
export const seller = {
    name: "RIZEUP VENTURES LLC DBA DOLPHIN CHASERS",
    line1: "4336 BELLA VISTA DR",
    line2: "ST PETE BEACH, FL 33706",
    phone: "616-318-1991",
};