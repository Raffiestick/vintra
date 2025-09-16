
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const startDocParse = onCall(async () => {
  throw new HttpsError("failed-precondition", "Not implemented yet.");
});
