"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.safe = exports.fmtUSD = exports.num = exports.seller = exports.FieldValue = exports.bucket = exports.adminAuth = exports.db = exports.GEMINI_API_KEY = exports.DEV_ADMIN_UID_SECRET = void 0;
exports.pickInvoiceDateFromHeader = pickInvoiceDateFromHeader;
exports.toUsDate = toUsDate;
exports.normalizeIsoFromDateLike = normalizeIsoFromDateLike;
exports.assertAdmin = assertAdmin;
exports.getGeminiModel = getGeminiModel;
exports.extractPdfText = extractPdfText;
exports.extractVinsFromText = extractVinsFromText;
exports.logActivity = logActivity;
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const generative_ai_1 = require("@google/generative-ai");
/* --- secrets --- */
// DEV_ADMIN_UID_SECRET is no longer used in assertAdmin, but other functions might use it.
// We keep it defined to avoid breaking other parts of the app if they rely on it.
exports.DEV_ADMIN_UID_SECRET = (0, params_1.defineSecret)("DEV_ADMIN_UID");
exports.GEMINI_API_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
/* --- admin init (once) --- */
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
exports.adminAuth = (0, auth_1.getAuth)();
exports.bucket = (0, storage_1.getStorage)().bucket();
/* --- seller info (for PDFs) --- */
exports.seller = {
    name: "RizeUp Ventures, LLC",
    dba: "DBA Dolphin Chasers",
    addr1: "PO BOX 66741",
    addr2: "St Pete Beach, FL 33706",
    phone: "616-318-1991",
    email: "admin@rizeupventures.com",
};
/* --- helpers --- */
const num = (x) => {
    if (typeof x === "number")
        return x;
    if (typeof x === "string") {
        const parsed = parseFloat(x.replace(/[$,]/g, ""));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};
exports.num = num;
const fmtUSD = (n) => Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
exports.fmtUSD = fmtUSD;
const safe = (s) => String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
exports.safe = safe;
/** Return YYYY-MM-DD from "DATE: 5/2/2025" etc., if present. */
function pickInvoiceDateFromHeader(text) {
    const m = text.match(/DATE:\s*([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})/i);
    if (!m)
        return null;
    const mm = String(+m[1]).padStart(2, '0');
    const dd = String(+m[2]).padStart(2, '0');
    const yyyy = String(m[3].length === 2 ? 2000 + +m[3] : +m[3]);
    return `${yyyy}-${mm}-${dd}`;
}
function toUsDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso))
        return null;
    const [y, m, d] = iso.split('-');
    return `${+m}/${+d}/${y}`;
}
/** Normalize a date-like string to YYYY-MM-DD or null. */
function normalizeIsoFromDateLike(s) {
    if (!s)
        return null;
    const t = s.trim();
    // "2024-05-15" (already ISO)
    const iso = t.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
    if (iso)
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
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
function assertAdmin(request) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    // The bypass now uses a standard environment variable, which is safer for local dev
    // and doesn't crash if unset. It's ignored in production.
    const bypass = process.env.DEV_ADMIN_UID;
    if (bypass && request.auth.uid === bypass)
        return;
    const token = request.auth.token || {};
    const isAdmin = token.role === "admin" || token.admin === true;
    if (!isAdmin)
        throw new https_1.HttpsError("permission-denied", "Admin privileges required.");
}
function getGeminiModel() {
    const key = exports.GEMINI_API_KEY.value();
    if (!key)
        throw new Error("GEMINI_API_KEY missing");
    const genAI = new generative_ai_1.GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}
/* --- PDF text extraction --- */
async function extractPdfText(buf) {
    // Use dynamic import for pdf-parse
    const pdf = (await Promise.resolve().then(() => __importStar(require("pdf-parse")))).default;
    const data = await pdf(buf);
    return data.text;
}
/* --- VIN extraction (used for fallback) --- */
function extractVinsFromText(text) {
    const vinRe = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
    const found = new Set();
    for (const match of text.toUpperCase().match(vinRe) || [])
        found.add(match);
    return [...found];
}
/* --- log activity on a jacket --- */
async function logActivity(vin, entry) {
    if (!vin)
        return;
    try {
        await exports.db.collection("jackets").doc(vin).collection("activity").add({
            ...entry,
            ts: firestore_1.FieldValue.serverTimestamp(),
            actor: "System",
        });
    }
    catch (e) {
        console.error("logActivity error:", e);
    }
}
