import { onRequest } from "firebase-functions/v2/https";
export const startDocParse = onRequest({ region: "us-central1", cors: true }, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});
