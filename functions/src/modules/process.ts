// functions/src/modules/process.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config"; // CORRECTED
import { assertAdmin } from "../utils"; // CORRECTED
import { FieldValue } from "firebase-admin/firestore";

export const processStagedUnit = onCall({ cors: true, region: "us-central1" }, async (request) => {
  assertAdmin(request);
  const { sid, unitId, updates } = request.data as { sid: string; unitId: string; updates: any };
  if (!sid || !unitId) throw new HttpsError("invalid-argument", "sid and unitId are required");

  const stageRef = db.collection("stagingInvoices").doc(sid);
  const unitRef = stageRef.collection("units").doc(unitId);
  const stageSnap = await stageRef.get();
  const unitSnap = await unitRef.get();

  if (!stageSnap.exists || !unitSnap.exists) {
    throw new HttpsError("not-found", "Staging invoice or unit not found");
  }

  const stage = stageSnap.data() || {};
  const unit = { ...(unitSnap.data() || {}), ...(updates || {}) };

  const vinOrHin = unit.vin;
  if (!vinOrHin) throw new HttpsError("failed-precondition", "VIN/HIN is required to create a jacket");

  const jacketId = (unit.vin?.toString() || vinOrHin).toUpperCase();
  const jacketNumber = vinOrHin.slice(-6); 

  const jacketRef = db.collection("jackets").doc(jacketId);
  await jacketRef.set({
    ...unit,
    jacketNumber, 
    auctionSaleDate: stage.auctionSaleDate || null,
    invoiceNumber: stage.auctionInvoiceNumber || null,
    stagedSid: sid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    processedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await unitRef.update({
    processed: true,
    processedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, jacketId };
});