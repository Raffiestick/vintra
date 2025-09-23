// functions/src/modules/process.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { FieldValue } from "firebase-admin/firestore";
import { assertAdmin } from "../utils";

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

export const createJacketsForInvoice = onCall({ cors: true, region: "us-central1" }, async (request) => {
  assertAdmin(request);
  const { stagingId } = request.data;
  if (!stagingId) {
    throw new HttpsError("invalid-argument", "stagingId is required.");
  }

  const stageRef = db.collection("stagingInvoices").doc(stagingId);
  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    throw new HttpsError("not-found", "Staging invoice not found.");
  }
  const stage = stageSnap.data() || {};

  const unitsRef = db.collection('stagingInvoices').doc(stagingId).collection('units');
  const unitsSnapshot = await unitsRef.get();

  let createdCount = 0;
  const promises = unitsSnapshot.docs.map(async (unitDoc) => {
    const unitData = unitDoc.data();
    if (unitData.processed) {
      return;
    }

    const vinOrHin = unitData.vin;
    if (!vinOrHin) {
      console.warn(`Skipping unit ${unitDoc.id} due to missing VIN.`);
      return;
    }

    const jacketId = vinOrHin.toUpperCase();
    const jacketNumber = vinOrHin.slice(-6);
    const jacketRef = db.collection("jackets").doc(jacketId);

    await jacketRef.set({
      ...unitData,
      jacketNumber,
      auctionSaleDate: stage.auctionSaleDate || null,
      invoiceNumber: stage.auctionInvoiceNumber || null,
      stagedSid: stagingId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      processedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await unitDoc.ref.update({
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
    });

    createdCount++;
  });

  await Promise.all(promises);

  await stageRef.update({
    status: 'processed',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { created: createdCount };
});