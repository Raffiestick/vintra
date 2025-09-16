
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* --- secrets --- */
export const DEV_ADMIN_UID_SECRET = defineSecret("DEV_ADMIN_UID");
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/* --- admin init (once) --- */
if (getApps().length === 0) initializeApp();
export const db = getFirestore();
export const adminAuth = getAuth();
export const bucket = getStorage().bucket();
export { FieldValue }; // Export FieldValue

/* --- seller info (for PDFs) --- */
export const seller = {
  name: "RizeUp Ventures, LLC",
  dba: "DBA Dolphin Chasers",
  addr1: "PO BOX 66741",
  addr2: "St Pete Beach, FL 33706",
  phone: "616-318-1991",
  email: "admin@rizeupventures.com",
};

/* --- helpers --- */
export const num = (x: any): number => {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const parsed = parseFloat(x.replace(/[$,]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
export const fmtUSD = (n: number): string =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const safe = (s: any): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Return YYYY-MM-DD from "DATE: 5/2/2025" etc., if present. */
export function pickInvoiceDateFromHeader(text: string): string | null {
  const m = text.match(/DATE:\s*([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})/i);
  if (!m) return null;
  const mm = String(+m[1]).padStart(2, '0');
  const dd = String(+m[2]).padStart(2, '0');
  const yyyy = String(m[3].length === 2 ? 2000 + +m[3] : +m[3]);
  return `${yyyy}-${mm}-${dd}`;
}

export function toUsDate(iso?: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-');
  return `${+m}/${+d}/${y}`;
}

/** Normalize a date-like string to YYYY-MM-DD or null. */
export function normalizeIsoFromDateLike(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim();

  // "2024-05-15" (already ISO)
  const iso = t.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // "5/15/2024" or "5-15-24" etc.
  const mdY = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (mdY) {
    const mm = String(+mdY[1]).padStart(2, "0");
    const dd = String(+mdY[2]).padStart(2, "0");
    const yyyy = (+mdY[3] < 100 ? 2000 + +mdY[3] : +mdY[3]).toString();
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

export function assertAdmin(request: CallableRequest) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  const devBypass = DEV_ADMIN_UID_SECRET.value();
  if (devBypass && request.auth.uid === devBypass) return;
  const token: any = request.auth.token || {};
  const isAdmin = token.role === "admin" || token.admin === true;
  if (!isAdmin) throw new HttpsError("permission-denied", "Admin privileges required.");
}

export function getGeminiModel() {
  const key = GEMINI_API_KEY.value();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

/* --- PDF text extraction --- */
export async function extractPdfText(buf: Buffer): Promise<string> {
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

/* --- VIN extraction (used for fallback) --- */
export function extractVinsFromText(text: string): string[] {
  const vinRe = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
  const found = new Set<string>();
  for (const match of text.toUpperCase().match(vinRe) || []) found.add(match);
  return [...found];
}

/* --- log activity on a jacket --- */
export async function logActivity(vin: string, entry: { type: string; message: string; meta?: any }) {
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
