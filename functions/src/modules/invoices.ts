import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertAdmin } from "../config";

// Placeholder function to resolve the export error.
// The error code has been corrected to "unimplemented".
export const generateBillOfSale = onCall({ cors: true }, async (request) => {
  assertAdmin(request);
  console.log("Generating Bill of Sale with data:", request.data);
  throw new HttpsError("unimplemented", "This function is not fully implemented yet.");
});

// Placeholder function to resolve the export error.
// The error code has been corrected to "unimplemented".
export const generateJacketInvoice = onCall({ cors: true }, async (request) => {
  assertAdmin(request);
  console.log("Generating Jacket Invoice with data:", request.data);
  throw new HttpsError("unimplemented", "This function is not fully implemented yet.");
});