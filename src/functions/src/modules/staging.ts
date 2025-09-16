
// functions/src/modules/staging.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue, Transaction } from "firebase-admin/firestore";
import { db, assertAdmin } from "../config";
import { httpsCallable } from "firebase-functions/v2";

export const createJacketFromUnit = onCall(
  { region: "us-central1", secrets: [] },
  async (request: CallableRequest) => {
    try {
      console.log("[createJacketFromUnit] incoming", {
        auth: !!request.auth,
        uid: request.auth?.uid,
        data: request.data,
      });

      // Admin gate
      assertAdmin(request);
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
      }

      const { stagingId, unitId } = request.data || {};
      if (!stagingId || !unitId) {
        throw new HttpsError(
          "invalid-argument",
          "stagingId and unitId are required."
        );
      }

      const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
      const stagingSnap = await stagingRef.get();
      if (!stagingSnap.exists) {
        throw new HttpsError("not-found", "Staging batch not found.");
      }
      const staging = stagingSnap.data() as any;

      const unitRef = stagingRef.collection("units").doc(String(unitId));
      const unitSnap = await unitRef.get();
      if (!unitSnap.exists) {
        throw new HttpsError("not-found", "Staged unit not found.");
      }
      const unit = unitSnap.data() as any;

      const vin: string | undefined = unit?.vin?.toString()?.trim()?.toUpperCase();
      if (!vin) {
        console.error("createJacketFromUnit: unit has no VIN", { stagingId, unitId, unit });
        throw new HttpsError("failed-precondition", "Staged unit has no VIN.");
      }

      // Prefer ISO on staging header; fall back to unit; else keep server time
      const isIso = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
      const pickedIso: string | null =
        isIso(staging?.invoiceDate) ? staging.invoiceDate :
        isIso(unit?.invoiceDate)    ? unit.invoiceDate    : null;

      let auctionSaleDate: any = FieldValue.serverTimestamp();
      if (pickedIso) {
        // Noon UTC avoids day shifts around local TZ midnight
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
        processedBy: request.auth.uid ?? null, // ✅ defensive
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

      console.log("[createJacketFromUnit] OK", { vin });

      return { success: true, path: jacketRef.path, vin };
    } catch (err: any) {
      console.error("[createJacketFromUnit] ERROR", err?.stack || err);
      // Ensure client sees a proper Functions error, not a generic 500
      if (err?.code && typeof err.code === "string") throw err;
      throw new HttpsError("internal", err?.message || "Internal error");
    }
  }
);

export const createJacketsForInvoice = onCall(
  { region: "us-central1", secrets: [] },
  async (request) => {
    assertAdmin(request);
    const { stagingId } = request.data || {};
    if (!stagingId) throw new HttpsError("invalid-argument", "stagingId required");
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

    const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
    const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
    if (unitsSnap.empty) return { success: true, created: 0 };

    let created = 0;
    
    // We cannot reliably call an onCall function from another onCall function
    // in all environments. Instead, we'll invoke it via its internal trigger.
    // For simplicity and since we are in the same module, we'll just loop and process.
    const createUnitCallable = httpsCallable(request.rawRequest.url.includes("localhost") ? "createJacketFromUnit" : "createJacketFromUnit", { region: "us-central1" });

    for (const doc of unitsSnap.docs) {
        try {
            await createUnitCallable({ stagingId, unitId: doc.id });
            created++;
        } catch (e) {
            console.error(`Failed to process unit ${doc.id} in batch ${stagingId}`, e);
            // Decide if we should continue or stop on first error.
            // For now, we'll log and continue.
        }
    }
    
    return { success: true, created };
  }
);
