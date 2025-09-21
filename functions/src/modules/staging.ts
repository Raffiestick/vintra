
// functions/src/modules/staging.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { FieldValue, Transaction, DocumentReference } from "firebase-admin/firestore";
import { db, assertAdmin, extractPdfText, getGeminiModel } from "../config";
import { parseNpaInvoiceText } from '../parsers/npa';


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
      if (err?.code && typeof err.code === "string") throw err;
      throw new HttpsError("internal", err?.message || "An internal error occurred while creating the jacket.");
    }
  }
);


export const createJacketsForInvoice = onCall(
  { region: "us-central1", secrets: ["GEMINI_API_KEY"], memory: '1GiB', timeoutSeconds: 300 },
  async (request) => {
    assertAdmin(request);
    const actorUid = request.auth?.uid;
    if (!actorUid) throw new HttpsError("unauthenticated", "Authentication required.");

    let sid = (request.data?.sid as string) || "";
    let sourceUrl = (request.data?.sourceUrl as string) || "";

    // Case A: called with sid
    if (sid) {
      const docRef = db.collection("stagingInvoices").doc(sid);
      const snap = await docRef.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", `stagingInvoices/${sid} not found`);
      }
      const stg = snap.data() || {};
      if (!stg.sourceUrl && sourceUrl) {
        await docRef.set({ sourceUrl, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      sourceUrl = stg.sourceUrl || sourceUrl;
      if (!sourceUrl) {
        throw new HttpsError("failed-precondition", "sourceUrl missing on staging invoice");
      }
    }

    // Case B: called without sid but with sourceUrl (server will create a staging doc)
    if (!sid && sourceUrl) {
      const ref = await db.collection("stagingInvoices").add({
        sourceUrl,
        parseStatus: "uploaded",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      sid = ref.id;
    }

    if (!sid || !sourceUrl) {
      throw new HttpsError("invalid-argument", "Provide either { sid } or { sourceUrl }");
    }
    
    // --- Main Parsing & Jacket Creation Logic ---
    try {
        const stagingRef = db.collection("stagingInvoices").doc(sid);

        const isPdf = (sourceUrl || "").toLowerCase().includes(".pdf");
        const isImage = /\.(jpe?g|png|gif|webp)$/i.test(sourceUrl);

        let text = "";
        if (isPdf) {
            const resp = await fetch(sourceUrl);
            const buf = Buffer.from(await resp.arrayBuffer());
            text = await extractPdfText(buf);
        } else if (isImage) {
            const model = getGeminiModel();
            const resp = await fetch(sourceUrl);
            const imageBuf = Buffer.from(await resp.arrayBuffer());
            const result = await model.generateContent(["Extract text from this document image.", {
                inlineData: { data: imageBuf.toString("base64"), mimeType: "image/jpeg" }
            }]);
            text = result.response.text();
        } else {
            throw new HttpsError('invalid-argument', 'sourceUrl must be a PDF or image file.');
        }

        const parsed = parseNpaInvoiceText(text);

        await stagingRef.set({
            invoiceDate: parsed.invoiceDate || null,
            invoiceMeta: parsed.invoiceMeta || {},
            parseStatus: 'parsed',
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        const batch = db.batch();
        for (const unit of parsed.units) {
            const unitRef = stagingRef.collection("units").doc();
            batch.set(unitRef, { ...unit, createdAt: FieldValue.serverTimestamp(), processed: false });
        }
        await batch.commit();

        const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
        if (unitsSnap.empty) {
            return { success: true, created: 0, sid };
        }

        let created = 0;
        const vins: string[] = [];
        for (const unitDoc of unitsSnap.docs) {
            try {
                const result = await _createJacketFromUnit(sid, unitDoc.id, actorUid);
                if (result.vin) vins.push(result.vin);
                created++;
            } catch (e: any) {
                console.error(`Failed to process unit ${unitDoc.id} in batch ${sid}:`, e?.message);
            }
        }
        
        return { success: true, created, sid, vins, vin: vins[0] };

    } catch (err: any) {
      console.error("[createJacketsForInvoice] ERROR", err?.stack || err);
      if (err?.code && typeof err.code === "string") throw err;
      throw new HttpsError("internal", err?.message || "An internal error occurred during batch creation.");
    }
  }
);
