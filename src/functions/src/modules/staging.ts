
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { db, bucket, FieldValue, normalizeIsoFromDateLike, extractVinsFromText, toUsDate, assertAdmin, getGeminiModel, num } from "../config";
import { parseNpaInvoiceText } from "../parsers/npa";
import type { Transaction } from "firebase-admin/firestore";

/** helper: copy the auction PDF to the jacket folder (keeps original in staging) */
async function copyAuctionPdfToJacket(stagingGcsPath: string, vin: string) {
  if (!stagingGcsPath) return null;
  const src = bucket.file(stagingGcsPath);
  const dstPath = `jacket-documents/${vin}/auction-invoice.pdf`;
  await src.copy(bucket.file(dstPath));
  const [url] = await bucket.file(dstPath).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return { dstPath, url };
}

/* ---------------- startInvoiceParse ---------------- */
export const startInvoiceParse = onRequest(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: ["GEMINI_API_KEY"],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

      const gcsPath = String(req.body?.gcsPath || "").trim();
      if (!gcsPath) { res.status(400).json({ error: "Missing gcsPath (e.g., incoming/invoices/<uid>/<file>.pdf)" }); return; }

      const file = bucket.file(gcsPath);
      const [exists] = await file.exists();
      if (!exists) { res.status(404).json({ error: `File not found at ${gcsPath}` }); return; }
      
      const [meta] = await file.getMetadata().catch(() => [undefined] as any);
      const contentType = String(meta?.contentType || "").toLowerCase();
      if (!contentType.includes("pdf")) {
        res.status(415).json({ error: `Unsupported content type: ${contentType || "unknown"} (PDF only)` });
        return;
      }
      
      const [downloaded] = await file.download();
      const nodeBuffer: Buffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as any);
      if (!nodeBuffer?.length) { res.status(500).json({ error: "Downloaded file buffer is empty. Cannot parse." }); return; }

      const { extractPdfText } = await import("../config/index.js");
      const text = await extractPdfText(nodeBuffer);
      if (!text?.trim()) { res.status(500).json({ error: "Extracted text is empty." }); return; }

      // 1) Deterministic parse
      let extracted = parseNpaInvoiceText(text);

      // 2) If zero units, try LLM enrich (kept optional)
      if (!extracted.units.length) {
        try {
          const model = getGeminiModel();
          const prompt = `Return STRICT JSON: { invoiceDate?: "YYYY-MM-DD", invoiceMeta?: { aucNo?: string, saleLocation?: string }, units: [{ vin: string, year?: number, make?: string, model?: string, color?: string, hours?: number, odometer?: number, saleLocation?: string, itemPrice?: number, buyerFee?: number, onlineFee?: number, titleInfo?: string, stockNo?: string, aucNo?: string }] } from the following TEXT.\nTEXT:\n"""${text.slice(0,20000)}"""`;
          const ai = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
          const llm = JSON.parse(ai.response?.text() || "{}");
          extracted = {
            invoiceDate: extracted.invoiceDate || llm.invoiceDate,
            invoiceMeta: { ...(extracted.invoiceMeta || {}), ...(llm.invoiceMeta || {}) },
            units: (Array.isArray(llm.units) ? llm.units : []).map((u: any, i: number) => ({ ...(extracted.units[i] || {}), ...u }))
          };
        } catch { /* ignore */ }
      }

      // 3) Seed with VINs if still empty
      if (!Array.isArray(extracted.units) || !extracted.units.length) {
        for (const vin of extractVinsFromText(text)) extracted.units.push({ vin, managementFee: 100 });
      }

      // 4) Normalize values
      for (const u of extracted.units) {
        if (!u) continue;
        if (typeof u.vin === "string") u.vin = u.vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
        u.itemPrice    = num(u.itemPrice);
        u.buyerFee     = num(u.buyerFee);
        u.onlineFee    = num(u.onlineFee);
        u.managementFee = u.managementFee == null ? 100 : num(u.managementFee);
        if (u.year != null) u.year = Number(u.year) || undefined;
        if (u.hours != null) u.hours = Number(u.hours) || undefined;
        if (u.odometer != null) u.odometer = Number(u.odometer) || undefined;
      }

      // 5) Correct invoice date & ts (pin to noon UTC to avoid UTC shift)
      const iso = normalizeIsoFromDateLike(extracted.invoiceDate);
      const invoiceDateTs = iso ? new Date(`${iso}T12:00:00.000Z`) : null;

      // 6) Create a stable copy of the original invoice alongside the batch
      const stagingId = db.collection("stagingInvoices").doc().id;
      const srcFile = bucket.file(gcsPath);
      const dstPath = `staging-invoices/${stagingId}/original.pdf`;
      await srcFile.copy(bucket.file(dstPath));
      const [fileUrl] = await bucket.file(dstPath).getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      await db.collection("stagingInvoices").doc(stagingId).set({
        source: "auction",
        gcsPath: dstPath,              // point to the stable copy
        fileUrl,                       // signed URL to stable copy
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        invoiceMeta: extracted.invoiceMeta ?? {},
        invoiceDate: iso || null,
        invoiceDateTs: invoiceDateTs || null,
        unitsCount: extracted.units.length,
        uploaderUid: gcsPath.split("/")[2] || null,
        status: "new",
      });

      // 7) write units
      const batch = db.batch();
      for (const u of extracted.units) {
        const unitRef = db.collection("stagingInvoices").doc(stagingId).collection("units").doc();
        batch.set(unitRef, { ...u, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), processed: false });
      }
      await batch.commit();

      res.json({ ok: true, stagingId, unitsCount: extracted.units.length, invoiceDate: iso, invoiceDateDisplay: toUsDate(iso) });

    } catch (e: any) {
      console.error("startInvoiceParse error", e?.stack || e);
      res.status(500).json({ error: e?.message || "Parse failed" });
    }
  }
);

/* ---------------- createJacketFromUnit / createJacketsForInvoice ---------------- */

export const createJacketFromUnit = onCall(
  { region: "us-central1" },
  async (request) => {
    assertAdmin(request);
    const { stagingId, unitId } = request.data || {};
    if (!stagingId || !unitId) throw new HttpsError("invalid-argument", "stagingId and unitId are required.");
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

    const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
    const stagingSnap = await stagingRef.get();
    if (!stagingSnap.exists) throw new HttpsError("not-found", "Staging batch not found.");
    const staging = stagingSnap.data() as any;

    const unitRef = stagingRef.collection("units").doc(String(unitId));
    const unitSnap = await unitRef.get();
    if (!unitSnap.exists) throw new HttpsError("not-found", "Staged unit not found.");

    const unit = unitSnap.data() as any;
    const vin = unit.vin?.trim()?.toUpperCase();
    if (!vin) throw new HttpsError("failed-precondition", "Staged unit has no VIN.");

    const isIso = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const pickedIso: string | null = isIso(staging?.invoiceDate)
      ? staging.invoiceDate
      : isIso(unit?.invoiceDate)
      ? unit.invoiceDate
      : null;

    let auctionSaleDate: any = FieldValue.serverTimestamp();
    if (pickedIso) auctionSaleDate = new Date(`${pickedIso}T12:00:00.000Z`);
    else if (staging?.invoiceDateTs) auctionSaleDate = staging.invoiceDateTs;

    const jacketRef = db.collection("jackets").doc(vin);
    await db.runTransaction(async (tx: Transaction) => {
      const jacketSnap = await tx.get(jacketRef);
      const jacketData: any = {
        vin,
        year: Number(unit.year || 0) || undefined,
        make: unit.make || "",
        model: unit.model || "",
        color: unit.color || "",
        odometer: Number(unit.odometer || unit.hours || 0) || 0,
        hours: Number(unit.hours || 0) || undefined,
        unitType: unit.unitType || "Other",
        hasTrailer: !!unit.hasTrailer,
        length: Number(unit.length || 0) || undefined,
        engine: unit.engine || undefined,

        saleLocation: unit.saleLocation || staging?.invoiceMeta?.saleLocation || "",
        titleInfo: unit.titleInfo || "",

        itemPrice: Number(unit.itemPrice || 0),
        buyerFee: Number(unit.buyerFee || 0),
        onlineFee: Number(unit.onlineFee || 0),
        managementFee: Number(unit.managementFee || 100),

        auctionSaleDate,
        invoiceDate: pickedIso || null,
        invoiceDateDisplay: staging?.invoiceDateDisplay || null,

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

    // reference back and mark processed
    await unitRef.update({
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      processedBy: request.auth.uid,
      jacketVin: vin,
      jacketPath: jacketRef.path,
    });

    // copy the auction PDF into the jacket
    if (staging?.gcsPath) {
      await copyAuctionPdfToJacket(staging.gcsPath, vin).catch(() => {});
    }

    // If all units processed, mark batch processed
    const remainingQuery = await stagingRef.collection("units").where("processed", "==", false).limit(1).get();
    if (remainingQuery.empty) {
      await stagingRef.update({ status: "processed", processedAt: FieldValue.serverTimestamp() });
    }

    return { success: true, path: jacketRef.path, vin };
  }
);

export const createJacketsForInvoice = onCall(
  { region: "us-central1" },
  async (request) => {
    assertAdmin(request);
    const { stagingId } = request.data || {};
    if (!stagingId) throw new HttpsError("invalid-argument", "stagingId required");
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

    const stagingRef = db.collection("stagingInvoices").doc(String(stagingId));
    const unitsSnap = await stagingRef.collection("units").where("processed", "in", [false, null]).get();
    if (unitsSnap.empty) return { success: true, created: 0 };

    let created = 0;
    for (const doc of unitsSnap.docs) {
      const unitId = doc.id;
      await createJacketFromUnit.run({
        data: { stagingId, unitId },
        auth: request.auth as any,
      } as any);
      created++;
    }

    return { success: true, created };
  }
);
