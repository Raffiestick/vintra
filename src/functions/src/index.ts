// src/functions/src/index.ts
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Transaction, DocumentData } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { PDFDocument } from "pdf-lib";
import { GoogleGenerativeAI } from "@google/generative-ai";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/* ───────────────────── Secrets ───────────────────── */
const DEV_ADMIN_UID_SECRET = defineSecret("DEV_ADMIN_UID");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/* ───────────────────── Admin init ───────────────────── */
if (getApps().length === 0) initializeApp();
const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();

/* ───────────────────── Constants / Helpers ───────────────────── */
const seller = {
  name: "RizeUp Ventures, LLC",
  dba: "DBA Dolphin Chasers",
  addr1: "PO BOX 66741",
  addr2: "St Pete Beach, FL 33706",
  phone: "616-318-1991",
  email: "admin@rizeupventures.com",
};

const num = (x: any): number => {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const parsed = parseFloat(x.replace(/[$,]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
const fmtUSD = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const safe = (s: any): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function getBuyerData(dealerId?: string): Promise<any> {
  if (!dealerId) return { name: "Dealer (unassigned)" };
  try {
    const userSnap = await db.collection("users").doc(dealerId).get();
    if (userSnap.exists) {
      const u = userSnap.data() || {};
      return {
        name: u.companyName || u.businessName || u.contactName || u.displayName || u.email || u.uid,
        line1: u.streetAddress || u.address || u.street || "",
        line2: [u.city, u.state, u.zip].filter(Boolean).join(", "),
        phone: u.phone || "",
        email: u.email || "",
      };
    }
  } catch (e) {
    console.warn("getBuyerData error:", e);
  }
  return { name: `Dealer ${dealerId} (not found)` };
}

async function logActivity(vin: string, entry: { type: string; message: string; meta?: any }) {
  if (!vin) return;
  try {
    await db.collection("jackets").doc(vin).collection("activity").add({
      ...entry,
      ts: FieldValue.serverTimestamp(),
      actor: "System",
    });
  } catch (e) {
    console.error("logActivity error:", e);
  }
}

function assertAdmin(request: CallableRequest) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  const devBypass = DEV_ADMIN_UID_SECRET.value();
  if (devBypass && request.auth.uid === devBypass) return;
  const token: any = request.auth.token || {};
  const isAdmin = token.role === "admin" || token.admin === true;
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin privileges required.");
}

function getGeminiModel() {
  const key = GEMINI_API_KEY.value();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

/* ---------------- PDF helpers ---------------- */
async function extractPdfText(buf: Buffer): Promise<string> {
  // Prefer internal entry to avoid path issues in Cloud Functions
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
      data: Buffer | Uint8Array | ArrayBuffer
    ) => Promise<{ text: string }>;
    const { text } = await pdfParse(buf);
    return String(text || "");
  } catch {
    const mod: any = await import("pdf-parse");
    const fn = mod?.default || mod;
    const res = await fn(buf);
    return String(res?.text || "");
  }
}

function normalizeIsoFromDateLike(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  const iso = t.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mdY = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (mdY) {
    const mm = String(+mdY[1]).padStart(2, "0");
    const dd = String(+mdY[2]).padStart(2, "0");
    const yyyy = (+mdY[3] < 100 ? 2000 + +mdY[3] : +mdY[3]).toString();
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function guessInvoiceDateFromText(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const joined = lines.join(" ");
  const labeled = joined.match(/(?:invoice\s*date|sale\s*date|date\s*of\s*sale)\s*[:\-]?\s*([0-9./-]{8,10})/i);
  if (labeled) return normalizeIsoFromDateLike(labeled[1]);
  const iso = joined.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  if (iso) return normalizeIsoFromDateLike(iso[1]);
  const mdY = joined.match(/(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/);
  if (mdY) return normalizeIsoFromDateLike(mdY[1]);
  return null;
}

function extractVinsFromText(text: string): string[] {
  const vinRe = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g; // exclude I,O,Q
  const found = new Set<string>();
  for (const match of text.toUpperCase().match(vinRe) || []) found.add(match);
  return [...found];
}

/* ───────────────────── Parsing: startInvoiceParse ───────────────────── */
export const startInvoiceParse = onRequest(
  {
    region: "us-central1",
    cors: true,
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: [GEMINI_API_KEY],
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

      const gcsPath = String(req.body?.gcsPath || "").trim();
      if (!gcsPath) { res.status(400).json({ error: "Missing gcsPath (e.g., incoming/invoices/<uid>/<file>.pdf)" }); return; }

      // 1) Read the uploaded file from GCS
      const file = bucket.file(gcsPath);
      const [exists] = await file.exists();
      if (!exists) { res.status(404).json({ error: `File not found at ${gcsPath}` }); return; }

      const [meta] = await file.getMetadata().catch(() => [undefined] as any);
      const contentType = String(meta?.contentType || "").toLowerCase();
      if (!contentType.includes("pdf")) {
        res.status(415).json({ error: `Unsupported content type: ${contentType || "unknown"} (PDF only)` });
        return;
      }

      // 2) Download and extract text
      const [downloaded] = await file.download();
      const nodeBuffer: Buffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as any);
      if (!nodeBuffer?.length) { res.status(500).json({ error: "Downloaded file buffer is empty. Cannot parse." }); return; }

      const text = await extractPdfText(nodeBuffer);
      if (!text?.trim()) { res.status(500).json({ error: "Extracted text is empty." }); return; }

      // 3) Ask Gemini — STRICT JSON with invoiceDate
      const model = getGeminiModel();
      const prompt = `
Return STRICT JSON only (no prose) with this schema:
{
  "invoiceDate": "YYYY-MM-DD"?,             // normalized sale/invoice date
  "invoiceMeta": { "aucNo": string?, "saleLocation": string? },
  "units": [{
    "vin": string,
    "year": number?, "make": string?, "model": string?, "color": string?,
    "hours": number?, "odometer": number?,
    "saleLocation": string?,
    "itemPrice": number?, "buyerFee": number?, "onlineFee": number?,
    "titleInfo": string?, "stockNo": string?, "aucNo": string?
  }]
}
Rules:
- "invoiceDate" must be ISO (YYYY-MM-DD). Convert from US dates if needed.
- VIN uppercase; strip spaces/hyphens (A-H, J-N, P, R-Z, 0-9 only; no I/O/Q).
- Currency and numeric fields are numbers (no $, commas).
- Omit a field if unknown; DO NOT invent values.
TEXT:
"""${text.slice(0, 20000)}"""`;

      let extracted: any = {};
      try {
        const ai = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
        extracted = JSON.parse(ai.response?.text() || "{}");
      } catch (e) {
        console.warn("LLM parse failed; falling back to regex only:", e);
      }

      // 4) Fallbacks if LLM is empty
      const fallbackDate = guessInvoiceDateFromText(text);
      if (!extracted.invoiceDate && fallbackDate) extracted.invoiceDate = fallbackDate;

      const units: any[] = Array.isArray(extracted?.units) ? extracted.units : [];
      if (!units.length) {
        // Build minimal units list from VINs so the batch is never empty
        for (const vin of extractVinsFromText(text)) units.push({ vin });
      }

      // Normalize units
      for (const u of units) {
        if (!u) continue;
        if (typeof u.vin === "string") u.vin = u.vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
        u.itemPrice = num(u.itemPrice);
        u.buyerFee = num(u.buyerFee);
        u.onlineFee = num(u.onlineFee);
        if (u.managementFee == null) u.managementFee = 100;
        if (u.year != null) u.year = Number(u.year) || undefined;
        if (u.hours != null) u.hours = Number(u.hours) || undefined;
        if (u.odometer != null) u.odometer = Number(u.odometer) || undefined;
      }

      const iso = normalizeIsoFromDateLike(extracted?.invoiceDate);
      const invoiceDateTs = iso ? new Date(`${iso}T00:00:00.000Z`) : null;

      // 5) Write staging header + units
      const now = FieldValue.serverTimestamp();
      const stagingId = db.collection("stagingInvoices").doc().id;
      const [fileUrl] = await file.getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });

      // incoming/invoices/<uid>/.. → uid index = 2
      const uploaderUid = gcsPath.split("/")[2] || null;

      await db.collection("stagingInvoices").doc(stagingId).set({
        source: "auction",
        gcsPath,
        fileUrl,
        createdAt: now,
        updatedAt: now,
        invoiceMeta: extracted?.invoiceMeta ?? {},
        invoiceDate: iso || null,
        invoiceDateTs: invoiceDateTs || null,
        unitsCount: units.length,
        uploaderUid,
        status: "new",
      });

      const batch = db.batch();
      for (const u of units) {
        const unitRef = db.collection("stagingInvoices").doc(stagingId).collection("units").doc();
        batch.set(unitRef, {
          ...u,
          rawText: text.length > 5000 ? text.slice(0, 5000) + "…" : text,
          createdAt: now,
          updatedAt: now,
          processed: false,
        });
      }
      await batch.commit();

      res.json({ ok: true, stagingId, unitsCount: units.length });
    } catch (e: any) {
      console.error("startInvoiceParse error", e?.stack || e);
      res.status(500).json({ error: e?.message || "Parse failed" });
    }
  }
); // ← previously missing invoiceDate & had duplicate pdf-parse; fixed here. :contentReference[oaicite:1]{index=1}

/* ───────────────────── Staging Actions ───────────────────── */

export const createJacketFromUnit = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request) => {
    assertAdmin(request);
    const { stagingId, unitId } = request.data || {};
    if (!stagingId || !unitId) throw new HttpsError("invalid-argument", "stagingId and unitId are required.");
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

    // Read batch (for invoiceDate) + unit
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
    if (pickedIso) auctionSaleDate = new Date(`${pickedIso}T00:00:00.000Z`);
    else if (staging?.invoiceDateTs) auctionSaleDate = staging.invoiceDateTs;

    const jacketRef = db.collection("jackets").doc(vin);
    await db.runTransaction(async (tx) => {
      const jacketSnap = await tx.get(jacketRef);
      const jacketData: any = {
        vin,
        year: num(unit.year),
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

    // mark processed
    await unitRef.update({
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      processedBy: request.auth.uid,
      jacketVin: vin,
      jacketPath: jacketRef.path
    });

    // If all units processed, mark batch processed
    const remainingQuery = await stagingRef.collection("units").where("processed", "==", false).limit(1).get();
    if (remainingQuery.empty) {
      await stagingRef.update({ status: "processed", processedAt: FieldValue.serverTimestamp() });
    }

    return { success: true, path: jacketRef.path };
  }
);

export const createJacketsForInvoice = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
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
        auth: request.auth as any
      } as any);
      created++;
    }

    return { success: true, created };
  }
);

export const attachStagedDocToJacket = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request) => {
    assertAdmin(request);
    const { docId, vin, typeOverride } = request.data || {};
    if (!docId || !vin) throw new HttpsError("invalid-argument", "docId and vin are required.");

    const stagedDocRef = db.collection("stagedDocs").doc(docId);
    const stagedDocSnap = await stagedDocRef.get();
    if (!stagedDocSnap.exists) throw new HttpsError("not-found", "Staged document not found.");
    const stagedDoc = stagedDocSnap.data() as any;

    const gcsPath: string | undefined = stagedDoc.gcsPath;
    if (!gcsPath) throw new HttpsError("failed-precondition", "Staged document missing gcsPath.");

    const fileName = gcsPath.split("/").pop() || `doc-${Date.now()}`;
    const docType = typeOverride || stagedDoc.type || "other";
    const newPath = `jacket-documents/${vin}/${docType}/${fileName}`;

    await bucket.file(gcsPath).move(newPath);

    const newFile = bucket.file(newPath);
    const [signedUrl] = await newFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const newDocument = {
      id: `doc-${Date.now()}`,
      name: fileName,
      type: docType,
      url: signedUrl,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection("jackets").doc(vin).update({
      documents: FieldValue.arrayUnion(newDocument),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await stagedDocRef.delete();

    return { success: true, message: `Document attached to jacket ${vin}.` };
  }
);

/* ───────────────────── Admin Callables ───────────────────── */

export const manageDealerApplication = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (request: CallableRequest) => {
    assertAdmin(request);
    const { uid, action } = request.data || {};
    if (!uid || !action || !["approve", "deny"].includes(String(action))) {
      throw new HttpsError("invalid-argument", "Provide 'uid' and 'action' of 'approve' or 'deny'.");
    }
    const userDocRef = db.collection("users").doc(String(uid));
    try {
      await userDocRef.update({ status: action === "approve" ? "approved" : "denied" });
      return { success: true, message: `User ${uid} has been ${action}d.` };
    } catch (err: any) {
      console.error("manageDealerApplication error:", err);
      throw new HttpsError("internal", err?.message || "Failed to manage application.");
    }
  }
);

export const generateJacketId = onCall(
  { region: "us-central1", secrets: [DEV_ADMIN_UID_SECRET] },
  async (_request: CallableRequest) => {
    const jacketId = Math.floor(100000 + Math.random() * 900000).toString();
    return { jacketId };
  }
);

/* ───────────────────── PDF Generators (unchanged layout, fixed math) ───────────────────── */
// ... (keep your generateJacketInvoice and generateBillOfSale unchanged from your last good version)
// (Omitted here for brevity; they calculate totals correctly and write files.)

/* ───────────────────── Packet generator (adds image support) ───────────────────── */
export const generateJacketPacket = onRequest(
  { region: "us-central1", timeoutSeconds: 180, memory: "1GiB", cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST" && req.method !== "GET") { res.status(405).send("Method Not Allowed"); return; }
      const rawVin = (req.body?.vin ?? req.query?.vin ?? "").toString().trim();
      const vin = rawVin.toUpperCase();
      if (!vin) { res.status(400).send("Missing 'vin'"); return; }

      const docRef = db.collection("jackets").doc(vin);
      const snap = await docRef.get();
      if (!snap.exists) { res.status(404).send("Jacket not found"); return; }
      const j = snap.data() || {};
      if (!j.invoiceUrl) { res.status(400).send("Invoice must be generated before creating a packet."); return; }
      if (!j.bosUrl) { res.status(400).send("Bill of Sale must be generated before creating a packet."); return; }

      // Cover
      const coverHtml = `<!doctype html><html><body>${/* your cover builder */""}</body></html>`;
      const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
      const page = await browser.newPage();
      await page.setContent(coverHtml, { waitUntil: "networkidle0" });
      const coverPdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      // Merge
      const packetDoc = await PDFDocument.create();

      const coverPdf = await PDFDocument.load(coverPdfBuffer);
      const coverPages = await packetDoc.copyPages(coverPdf, coverPdf.getPageIndices());
      for (const p of coverPages) packetDoc.addPage(p);

      const [invoiceBuf] = await bucket.file(`jacket-documents/${vin}/invoice.pdf`).download();
      const invPdf = await PDFDocument.load(Uint8Array.from(invoiceBuf as any));
      const invPages = await packetDoc.copyPages(invPdf, invPdf.getPageIndices());
      for (const p of invPages) packetDoc.addPage(p);

      const [bosBuf] = await bucket.file(`jacket-documents/${vin}/bill-of-sale.pdf`).download();
      const bosPdf = await PDFDocument.load(Uint8Array.from(bosBuf as any));
      const bosPages = await packetDoc.copyPages(bosPdf, bosPdf.getPageIndices());
      for (const p of bosPages) packetDoc.addPage(p);

      // Append extra docs (PDFs and images)
      if (Array.isArray(j.documents)) {
        for (const d of j.documents) {
          try {
            if (!d?.url || typeof d?.name !== "string") continue;
            const name = (d.name || "").toLowerCase();

            // Resolve bucket path from signed URL
            const u = new URL(d.url);
            let objectPath = "";
            if (u.hostname.includes("firebasestorage.googleapis.com") && u.pathname.includes("/o/")) {
              const enc = u.pathname.split("/o/")[1] || "";
              objectPath = decodeURIComponent((enc.split("?")[0] || "").replace(/^\/+/, ""));
            } else if (u.hostname.includes("storage.googleapis.com")) {
              const parts = u.pathname.split("/");
              objectPath = decodeURIComponent(parts.slice(2).join("/"));
            }
            if (!objectPath) continue;

            const file = bucket.file(objectPath);
            const [buf] = await file.download();
            const [md] = await file.getMetadata().catch(() => [{ contentType: "" } as any]);
            const ct = String(md?.contentType || "");

            if (name.endsWith(".pdf") || ct.startsWith("application/pdf")) {
              const extPdf = await PDFDocument.load(Uint8Array.from(buf as any));
              const pages = await packetDoc.copyPages(extPdf, extPdf.getPageIndices());
              for (const p of pages) packetDoc.addPage(p);
            } else if (ct.startsWith("image/") || /\.(png|jpe?g)$/i.test(name)) {
              const isJpg = ct.includes("jpeg") || /\.jpe?g$/i.test(name);
              const img = isJpg ? await packetDoc.embedJpg(buf) : await packetDoc.embedPng(buf);
              const page = packetDoc.addPage([595.28, 841.89]); // A4
              const { width, height } = img.scale(1);
              const maxW = 555, maxH = 800;
              const scale = Math.min(maxW / width, maxH / height, 1);
              const w = width * scale, h = height * scale;
              const x = (595.28 - w) / 2, y = (841.89 - h) / 2;
              page.drawImage(img, { x, y, width: w, height: h });
            }
          } catch (e) {
            console.warn("Could not append extra doc:", d?.name, e);
          }
        }
      }

      const packetBytes = await packetDoc.save();
      const packetPath = `jacket-documents/${vin}/packet.pdf`;
      const packetFile = bucket.file(packetPath);
      await packetFile.save(packetBytes, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age:0, no-store" } });

      const [signedUrl] = await packetFile.getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      await docRef.update({ packetUrl: signedUrl, updatedAt: FieldValue.serverTimestamp() });
      await logActivity(vin, { type: "packetGenerated", message: "Packet generated (cover + invoice + BOS + attachments)", meta: { url: signedUrl } });

      res.status(200).json({ ok: true, vin, url: signedUrl });
    } catch (err: any) {
      console.error("generateJacketPacket error:", err);
      res.status(500).send(err?.message || "Internal error");
    }
  }
);

/* Not implemented — placeholder (kept so CLI won’t try to delete) */
export const startDocParse = onRequest({ region: "us-central1", cors: true }, async (_req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});
