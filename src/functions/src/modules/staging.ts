
// functions/src/modules/staging.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue, Transaction, DocumentReference } from "firebase-admin/firestore";
import { db, assertAdmin } from "../config";

/**
 * Internal helper function to create a single jacket from a staging unit.
 * This contains the core logic and can be safely called from other functions.
 */
async function _createJacketFromUnit(stagingId: string, unitId: string, actorUid: string): Promise<{ success: true, path: string, vin: string }> {
  const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
  const stagingSnap = await stagingRef.get();
  if (!stagingSnap.exists) {
    throw new HttpsError("not-found", "Staging batch not found.");
  }
  const staging = stagingSnap.data() as any;

  const unitRef = stagingRef.collection("units").doc(String(unitId));
  const unitSnap = await unitRef.get();
  if (!unitSnap.exists) {
    throw new HttpsError("not-found", "Staged unit not found for this batch.");
  }
  const unit = unitSnap.data() as any;
  
  if (unit.processed) {
      console.log(`Unit ${unitId} already processed. Skipping.`);
      return { success: true, path: unit.jacketPath, vin: unit.jacketVin };
  }

  const vin: string | undefined = unit?.vin?.toString()?.trim()?.toUpperCase();
  if (!vin) {
    console.error("_createJacketFromUnit: unit has no VIN", { stagingId, unitId, unit });
    throw new HttpsError("failed-precondition", "Staged unit has no VIN.");
  }

  const isIso = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const pickedIso: string | null =
    isIso(staging?.invoiceDate) ? staging.invoiceDate :
    isIso(unit?.invoiceDate)    ? unit.invoiceDate    : null;

  let auctionSaleDate: any = FieldValue.serverTimestamp();
  if (pickedIso) {
    auctionSaleDate = new Date(`${pickedIso}T12:00:00.000Z`);
  } else if (staging?.invoiceDateTs) {
    auctionSaleDate = staging.invoiceDateTs;
  }

  const jacketRef = db.collection("jackets").doc(vin);

  await db.runTransaction(async (tx: Transaction) => {
    const jacketSnap = await tx.get(jacketRef);
    const num = (x: any) =>
      typeof x === "number" ? x :
      typeof x === "string" ? Number(x.replace(/[$,]/g, "")) || 0 : 0;

    const jacketData: any = {
      vin,
      year: num(unit.year) || undefined,
      make: unit.make || "",
      model: unit.model || "",
      color: unit.color || "",
      odometer: num(unit.odometer) || num(unit.hours) || 0,
      saleLocation: unit.saleLocation || staging?.invoiceMeta?.saleLocation || "",
      itemPrice: num(unit.itemPrice),
      buyerFee: num(unit.buyerFee),
      onlineFee: num(unit.onlineFee),
      managementFee: num(unit.managementFee) || 100,
      auctionSaleDate,
      invoiceDate: pickedIso || null,
      isAuctionPaid: false,
      isMgmtFeePaid: false,
      miscFees: [],
      documents: [],
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!jacketSnap.exists) {
      jacketData.createdAt = FieldValue.serverTimestamp();
      jacketData.jacketId = `J${Date.now()}`;
      tx.set(jacketRef, jacketData);
    } else {
      tx.update(jacketRef, jacketData);
    }
  });

  await unitRef.update({
    processed: true,
    processedAt: FieldValue.serverTimestamp(),
    processedBy: actorUid,
    jacketVin: vin,
    jacketPath: jacketRef.path,
  });

  // If all units processed, mark header as processed
  const remaining = await stagingRef
    .collection("units")
    .where("processed", "==", false)
    .limit(1)
    .get();

  if (remaining.empty) {
    await stagingRef.update({
      status: "processed",
      processedAt: FieldValue.serverTimestamp(),
    });
  }

  return { success: true, path: jacketRef.path, vin };
}


export const createJacketFromUnit = onCall(
  { region: "us-central1", secrets: [] },
  async (request: CallableRequest) => {
    try {
      assertAdmin(request);
      const { stagingId, unitId } = request.data || {};
      if (!stagingId || !unitId) {
        throw new HttpsError("invalid-argument", "stagingId and unitId are required.");
      }
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Authentication required for this action.");
      }

      return await _createJacketFromUnit(stagingId, unitId, request.auth.uid);

    } catch (err: any) {
      console.error("[createJacketFromUnit] ERROR", err?.stack || err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "An internal error occurred while creating the jacket.");
    }
  }
);


export const createJacketsForInvoice = onCall(
  { region: "us-central1", secrets: [] },
  async (request) => {
    try {
      assertAdmin(request);
      const { stagingId } = request.data || {};
      if (!stagingId) throw new HttpsError("invalid-argument", "stagingId required");
      if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Authentication required.");

      const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
      const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
      if (unitsSnap.empty) {
        console.log(`No unprocessed units found for stagingId: ${stagingId}`);
        return { success: true, created: 0 };
      }

      let created = 0;
      
      for (const unitDoc of unitsSnap.docs) {
        try {
          await _createJacketFromUnit(stagingId, unitDoc.id, request.auth.uid);
          created++;
        } catch (e: any) {
          console.error(`Failed to process unit ${unitDoc.id} in batch ${stagingId}:`, e?.message);
        }
      }
      
      return { success: true, created };

    } catch (err: any) {
      console.error("[createJacketsForInvoice] ERROR", err?.stack || err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "An internal error occurred during batch creation.");
    }
  }
);
