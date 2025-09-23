// functions/src/modules/packet.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertAdmin } from "../utils"; 
// import { FieldValue } from "firebase-admin/firestore"; // REMOVED
// import { db, bucket, seller } from "../config"; // REMOVED

// This file has duplicate functions that need to be cleaned up later.
// For now, we are disabling them to allow deployment.

export const generateJacketInvoice = onCall({ cors: true, region: "us-central1" }, async (request) => {
    assertAdmin(request);
    throw new HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});

export const generateBillOfSale = onCall({ cors: true, region: "us-central1" }, async (request) => {
    assertAdmin(request);
    throw new HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});