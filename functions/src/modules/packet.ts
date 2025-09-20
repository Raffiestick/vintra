
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { PDFDocument, type PDFPage } from "pdf-lib";
import { bucket, db, logActivity, FieldValue, assertAdmin } from "../config";

export const generateJacketPacket = onCall(
  { region: "us-central1", timeoutSeconds: 180, memory: "1GiB" },
  async (request) => {
    assertAdmin(request);
    try {
      const rawVin = (request.data?.vin ?? "").toString().trim().toUpperCase();
      if (!rawVin) { 
        throw new HttpsError("invalid-argument", "Missing 'vin'");
      }

      const docRef = db.collection("jackets").doc(rawVin);
      const snap = await docRef.get();
      if (!snap.exists) { 
        throw new HttpsError("not-found", "Jacket not found");
      }
      const j = snap.data() || {};

      if (!j.invoiceUrl) { 
        throw new HttpsError("failed-precondition", "Invoice must be generated before creating a packet.");
      }
      if (!j.bosUrl) {
        throw new HttpsError("failed-precondition", "Bill of Sale must be generated before creating a packet.");
      }

      // Minimal cover page
      const coverHtml = `<!doctype html><html><body style="font-family:system-ui; padding:48px">
        <h1 style="margin:0 0 8px">DEALER JACKET</h1>
        <div>VIN: ${j.vin}</div>
        <div>Vehicle: ${[j.year,j.make,j.model].filter(Boolean).join(" ")}</div>
        <div>Auction Date: ${j.invoiceDateDisplay || ""}</div>
      </body></html>`;

      const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
      const page = await browser.newPage();
      await page.setContent(coverHtml, { waitUntil: "networkidle0" });
      const coverPdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const packet = await PDFDocument.create();

      const coverPdf = await PDFDocument.load(coverPdfBuffer);
      const coverPages = await packet.copyPages(coverPdf, coverPdf.getPageIndices());
      for (const p of coverPages) packet.addPage(p);

      // Append invoice + BoS (from bucket paths we control)
      const [invBuf] = await bucket.file(`jacket-documents/${rawVin}/invoice.pdf`).download();
      const invPdf = await PDFDocument.load(invBuf);
      const invPages = await packet.copyPages(invPdf, invPdf.getPageIndices());
      invPages.forEach((p: PDFPage) => packet.addPage(p));

      const [bosBuf] = await bucket.file(`jacket-documents/${rawVin}/bill-of-sale.pdf`).download();
      const bosPdf = await PDFDocument.load(bosBuf);
      const bosPages = await packet.copyPages(bosPdf, bosPdf.getPageIndices());
      bosPages.forEach((p: PDFPage) => packet.addPage(p));

      // Append any other attachments (PDFs and common images)
      for (const d of Array.isArray(j.documents) ? j.documents : []) {
        try {
          if (!d?.url || typeof d?.name !== "string") continue;
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

          if (ct.startsWith("application/pdf")) {
            const extPdf = await PDFDocument.load(buf);
            const pages = await packet.copyPages(extPdf, extPdf.getPageIndices());
            pages.forEach((p: PDFPage) => packet.addPage(p));
          } else if (ct.startsWith("image/") || /\.(png|jpe?g)$/i.test(d.name)) {
            const isJpg = ct.includes("jpeg") || /\.jpe?g$/i.test(d.name);
            const img = isJpg ? await packet.embedJpg(buf) : await packet.embedPng(buf);
            const page = packet.addPage([595.28, 841.89]); // A4
            const { width, height } = img.scale(1);
            const maxW = 555, maxH = 800;
            const scale = Math.min(maxW / width, maxH / height, 1);
            const w = width * scale, h = height * scale;
            const x = (595.28 - w) / 2, y = (841.89 - h) / 2;
            page.drawImage(img, { x, y, width: w, height: h });
          }
        } catch (e) {
          console.warn("Could not append doc:", d?.name, e);
        }
      }

      const packetBytes = await packet.save();
      const packetPath = `jacket-documents/${rawVin}/packet.pdf`;
      await bucket.file(packetPath).save(packetBytes, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } });

      const [signedUrl] = await bucket.file(packetPath).getSignedUrl({ action: "read", expires: Date.now() + 7*24*60*60*1000 });
      await docRef.update({ packetUrl: signedUrl, updatedAt: FieldValue.serverTimestamp() });
      await logActivity(rawVin, { type: "packetGenerated", message: "Packet generated (cover + invoice + BOS + attachments)", meta: { url: signedUrl } });

      return { ok: true, vin: rawVin, url: signedUrl };
    } catch (err: any) {
      console.error("generateJacketPacket error:", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "Internal error");
    }
  }
);
