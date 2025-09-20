import * as functions from "firebase-functions";

export const startDocParse = functions.https.onCall(async (data, context) => {
  // placeholder callable to keep deployment happy; replace with real logic later
  return { ok: true, placeholder: true };
});
