
import { onCall, HttpsError } from "firebase-functions/v2/https";

/** Replace these placeholders with the real implementations later. */
export const signInWithCustomToken = onCall(async () => {
  throw new HttpsError("failed-precondition", "Not implemented yet.");
});

export const manageDealerApplication = onCall(async () => {
  throw new HttpsError("failed-precondition", "Not implemented yet.");
});

export const generateJacketId = onCall(async () => {
  // Return a dummy value so callers don't crash during test calls.
  return { jacketId: "J1000" };
});
