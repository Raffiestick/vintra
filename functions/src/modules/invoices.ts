// functions/src/modules/invoices.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
// import { db } from "../config"; // REMOVED
import { assertAdmin } from "../utils";

export const generateJacketInvoice = onCall({ 
    cors: true, 
    region: "us-central1",
    memory: '1GiB', 
    timeoutSeconds: 60 
}, async (request) => {
    assertAdmin(request);
    console.log("Generating Jacket Invoice with data:", request.data);
    throw new HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});


export const generateBillOfSale = onCall({ cors: true, region: "us-central1" }, async (request) => {
  assertAdmin(request);
  console.log("Generating Bill of Sale with data:", request.data);
  throw new HttpsError("unimplemented", "This function is not fully implemented yet.");
});