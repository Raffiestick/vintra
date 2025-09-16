
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const generateJacketInvoice = onCall(async () => {
  throw new HttpsError("failed-precondition", "Not implemented yet.");
});

export const generateBillOfSale = onCall(async () => {
  throw new HttpsError("failed-precondition", "Not implemented yet.");
});
