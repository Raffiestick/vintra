// functions/src/modules/packet.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { assertAdmin } from "../utils";
import { getStorage } from "firebase-admin/storage";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument, rgb } from "pdf-lib";
import { type Company, type Party, type JacketData } from "../types";
import { renderInvoiceHTML } from "../templates/invoice";
import { renderBoSHTML } from "../templates/bos";
import { renderCoverHTML } from "../templates/cover";

// ---------------- helpers ----------------

async function getParticipantData(j: JacketData): Promise<{ seller: Company; buyer: Party }> {
  const seller: Company = {
    name: "RizeUp Ventures, LLC",
    dba: "Dolphin Chasers",
    line1: "PO BOX 66741",
    line2: "St Pete Beach, FL 33706",
    fullAddress: "PO BOX 66741, St Pete Beach, FL 33706",
    phone: "616-318-1991",
    email: "admin@rizeupventures.com",
  };

  let buyer: Party = { name: "N/A", line1: "", line2: "", phone: "", email: "" };
  if (j.dealerId) {
    const snap = await db.collection("users").doc(j.dealerId).get();
    if (snap.exists) {
      const d = snap.data()!;
      buyer = {
        name: d.companyName || "N/A",
        line1: d.address1 || "",
        line2: `${d.city || ""}, ${d.state || ""} ${d.zip || ""}`,
        phone: d.phone || "",
        email: d.email || "",
      };
    }
  }
  return { seller, buyer };
}

// Always return Uint8Array so pdf-lib types are consistent
async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buf = await page.pdf({ format: "A4", printBackground: true }); // Buffer
  await browser.close();
  return new Uint8Array(buf);
}

/** Return {bucket, path} from any Firebase Storage URL. */
function parseGcsTarget(u: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(u);

    // Case A: firebasestorage(.app|.googleapis.com)/v0/b/<bucket>/o/<path>?...
    const mA = url.pathname.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (mA) return { bucket: mA[1], path: decodeURIComponent(mA[2]) };

    // Case B: storage.googleapis.com/<bucket>/<path>
    if (url.hostname === "storage.googleapis.com") {
      const [ , bucket, ...rest ] = url.pathname.split("/"); // ["", "<bucket>", "path", ...]
      if (bucket && rest.length) return { bucket, path: decodeURIComponent(rest.join("/")) };
    }

    // Case C: <bucket>.storage.googleapis.com/<path>
    const mC = url.hostname.match(/^([^.]+)\.storage\.googleapis\.com$/);
    if (mC) {
      const bucket = mC[1];
      const path = url.pathname.replace(/^\/+/, "");
      if (bucket && path) return { bucket, path: decodeURIComponent(path) };
    }

    return null;
  } catch {
    return null;
  }
}

/** Map backend doc.type -> human label (fallback to inferred type -> filename). */
function docTypeLabel(type?: string, fallbackName?: string): string {
  const key = (type || "").toUpperCase().trim();
  switch (key) {
    case "TITLE_FRONT":       return "Title – Front";
    case "TITLE_BACK":        return "Title – Back";
    case "POA":               return "Power of Attorney";
    case "REASSIGNMENT":      return "Reassignment";
    case "REPOSSESSION":      return "Repossession Docs";
    case "AFFIDAVIT":         return "Affidavit";
    case "LIEN_RELEASE":      return "Release of Lien";
    case "STRIKE_ACCEPTANCE": return "Strike Acceptance";
    case "MISC":
    case "MISC_DOC":          return "Misc Document";
  }
  // Infer from filename if type missing/unknown
  const name = (fallbackName || "").toLowerCase();
  if (/title.*(front|frnt|frontside|fnt)|\bfront\b/.test(name)) return "Title – Front";
  if (/title.*(back|bck|backside)|\bback\b/.test(name))         return "Title – Back";
  if (/\bpoa\b|power[-\s]?of[-\s]?attorney/.test(name))         return "Power of Attorney";
  if (/reassign|re-assignment|reassignment/.test(name))         return "Reassignment";
  if (/repo|repossession/.test(name))                           return "Repossession Docs";
  if (/affidavit/.test(name))                                   return "Affidavit";
  if (/lien.*release|release.*lien/.test(name))                 return "Release of Lien";
  if (/strike.*accept/.test(name))                              return "Strike Acceptance";
  if (/misc|document|doc/.test(name))                           return "Misc Document";
  return fallbackName || "Document";
}

// ---------------- main callable ----------------

export const generateJacketPacket = onCall(
  { cors: true, region: "us-central1", memory: "1GiB", timeoutSeconds: 180 },
  async (request) => {
    assertAdmin(request);
    const { vin } = request.data as { vin?: string };
    if (!vin) throw new HttpsError("invalid-argument", "VIN is required.");

    try {
      const jacketRef = db.collection("jackets").doc(vin);
      const snap = await jacketRef.get();
      if (!snap.exists) throw new HttpsError("not-found", "Jacket not found.");

      const j = snap.data() as JacketData;
      const storage = getStorage();

      // ---- Cover contents (labels only) ----
      const contents: string[] = ["Invoice", "Bill of Sale"];
      if (j.reassignmentUrl) contents.push("Reassignment");
      for (const d of j.documents || []) contents.push(docTypeLabel(d.type, d.name));

      // ---- Participants ----
      const { seller, buyer } = await getParticipantData(j);

      // ---- Render PDFs (as Uint8Array) ----
      const coverHtml   = renderCoverHTML(j, seller, contents);
      const invoiceHtml = renderInvoiceHTML(j, seller, buyer);
      const bosHtml     = renderBoSHTML(j, seller, buyer);

      const pdfParts: Uint8Array[] = await Promise.all([
        htmlToPdf(coverHtml),
        htmlToPdf(invoiceHtml),
        htmlToPdf(bosHtml),
      ]);

      // ---- Reassignment (PDF) right after BoS ----
      if (j.reassignmentUrl) {
        const tgt = parseGcsTarget(j.reassignmentUrl);
        if (tgt) {
          try {
            const [buf] = await storage.bucket(tgt.bucket).file(tgt.path).download();
            pdfParts.push(new Uint8Array(buf));
          } catch (err) {
            console.error("Reassignment fetch failed:", tgt, err);
          }
        } else {
          console.warn("Cannot parse reassignmentUrl:", j.reassignmentUrl);
        }
      }

      // ---- Uploaded documents ----
      for (const d of j.documents || []) {
        const tgt = parseGcsTarget(d.url);
        if (!tgt) continue;

        try {
          const file = storage.bucket(tgt.bucket).file(tgt.path);
          const [buf] = await file.download();
          const [meta] = await file.getMetadata();
          const ct = meta?.contentType || "";

          if (ct.includes("pdf")) {
            pdfParts.push(new Uint8Array(buf));
          } else if (ct.startsWith("image/")) {
            const pdf = await PDFDocument.create();
            const page = pdf.addPage();
            const { width, height } = page.getSize();
            const embedded =
              ct === "image/png" ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
            const dims = embedded.scaleToFit(width - 50, height - 50);
            page.drawImage(embedded, {
              x: (width - dims.width) / 2,
              y: (height - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
            pdfParts.push(await pdf.save());
          } else {
            const errPdf = await PDFDocument.create();
            const p = errPdf.addPage();
            p.drawText(`Unsupported file type for "${d.name || tgt.path}"`, {
              x: 50, y: p.getHeight() - 50, size: 12, color: rgb(1, 0, 0),
            });
            pdfParts.push(await errPdf.save());
          }
        } catch (error) {
          console.error(`Failed to load document ${d.name}:`, error);
          const errPdf = await PDFDocument.create();
          const p = errPdf.addPage();
          p.drawText(`Error: Could not load "${d.name}"`, {
            x: 50, y: p.getHeight() - 50, size: 12, color: rgb(1, 0, 0),
          });
          pdfParts.push(await errPdf.save());
        }
      }

      // ---- Merge Cover → Invoice → BoS → Reassignment → Docs ----
      const merged = await PDFDocument.create();
      for (const part of pdfParts) {
        try {
          const pdf = await PDFDocument.load(part);
          const pages = await merged.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((pg) => merged.addPage(pg));
        } catch (e) {
        console.warn("Skipping invalid PDF during merge:", e);
        }
      }

      const mergedBytes = await merged.save(); // Uint8Array

      // ---- Save packet ----
      const filePath = `jacket-packets/${vin}/Jacket-${j.jacketNumber || vin}.pdf`;
      const file = storage.bucket().file(filePath);
      await file.save(Buffer.from(mergedBytes), { contentType: "application/pdf" });

      const [url] = await file.getSignedUrl({ action: "read", expires: "03-09-2491" });
      await jacketRef.update({ packetUrl: url, updatedAt: new Date() });

      return { success: true, url };
    } catch (error: any) {
      console.error("Error generating jacket packet:", error);
      throw new HttpsError("internal", error.message || "Failed to generate jacket packet.");
    }
  }
);
