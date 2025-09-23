// functions/src/modules/staging.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config";
import { assertAdmin } from "../utils";

export const createStagingBatchFromManualEntry = onCall({ cors: true, region: "us-central1" }, async (request) => {
  assertAdmin(request);
  const { auctionSaleDate, auctionInvoiceNumber, units } = request.data;
  const actorUid = request.auth?.uid;

  if (!Array.isArray(units) || units.length === 0) {
    throw new HttpsError("invalid-argument", "The 'units' array is required.");
  }

  try {
    const stagingRef = await db.collection("stagingInvoices").add({
      // --- LINE CHANGED HERE ---
      // Convert the date string to a proper Date object before saving
      auctionSaleDate: auctionSaleDate ? new Date(auctionSaleDate) : null,
      auctionInvoiceNumber: auctionInvoiceNumber || null,
      status: "manual-entry",
      uploaderUid: actorUid,
      fileName: "Manual Entry",
      unitCount: units.length,
      createdAt: FieldValue.serverTimestamp(),
    });
    const sid = stagingRef.id;

    const batch = db.batch();
    for (const unit of units) {
      const unitRef = stagingRef.collection("units").doc();
      const cleanUnit = Object.fromEntries(
        Object.entries(unit).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      batch.set(unitRef, {
        ...cleanUnit,
        processed: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return { success: true, sid };
  } catch (error: any)    {
    console.error("Error in createStagingBatchFromManualEntry:", error);
    throw new HttpsError("internal", error.message || "Failed to create staging batch.");
  }
});