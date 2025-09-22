"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
if (k2 === undefined)
    k2 = k;
var desc = Object.getOwnPropertyDescriptor(m, k);
if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function () { return m[k]; } };
}
Object.defineProperty(o, k2, desc);
(function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    o[k2] = m[k];
});
;
Object.defineProperty(o, "default", { enumerable: true, value: v });
function (o, v) {
    o["default"] = v;
}
;
var ownKeys = function (o) {
    ownKeys = Object.getOwnPropertyNames || function (o) {
        var ar = [];
        for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k))
                ar[ar.length] = k;
        return ar;
    };
    return ownKeys(o);
};
return function (mod) {
    if (mod && mod.__esModule)
        return mod;
    var result = {};
    if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default")
                __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
};
();
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
var params_1 = require("firebase-functions/params");
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
var auth_1 = require("firebase-admin/auth");
var storage_1 = require("firebase-admin/storage");
var https_1 = require("firebase-functions/v2/https");
var generative_ai_1 = require("@google/generative-ai");
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
var num = function (x) {
    if (typeof x === "number")
        return x;
    if (typeof x === "string") {
        var parsed = parseFloat(x.replace(/[$,]/g, ""));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};
exports.num = num;
var fmtUSD = function (n) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }); };
exports.fmtUSD = fmtUSD;
var safe = function (s) { return String(s !== null && s !== void 0 ? s : "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;"); };
exports.safe = safe;
/** Return YYYY-MM-DD from "DATE: 5/2/2025" etc., if present. */
function pickInvoiceDateFromHeader(text) {
    var m = text.match(/DATE:\s*([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})/i);
    if (!m)
        return null;
    var mm = String(+m[1]).padStart(2, '0');
    var dd = String(+m[2]).padStart(2, '0');
    var yyyy = String(m[3].length === 2 ? 2000 + +m[3] : +m[3]);
    return "".concat(yyyy, "-").concat(mm, "-").concat(dd);
}
function toUsDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso))
        return null;
    var _a = iso.split('-'), y = _a[0], m = _a[1], d = _a[2];
    return "".concat(+m, "/").concat(+d, "/").concat(y);
}
/** Normalize a date-like string to YYYY-MM-DD or null. */
function normalizeIsoFromDateLike(s) {
    if (!s)
        return null;
    var t = s.trim();
    // "2024-05-15" (already ISO)
    var iso = t.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
    if (iso)
        return "".concat(iso[1], "-").concat(iso[2], "-").concat(iso[3]);
    // "5/15/2024" or "5-15-24" etc.
    var mdY = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (mdY) {
        var mm = String(+mdY[1]).padStart(2, "0");
        var dd = String(+mdY[2]).padStart(2, "0");
        var yyyy = (+mdY[3] < 100 ? 2000 + +mdY[3] : +mdY[3]).toString();
        return "".concat(yyyy, "-").concat(mm, "-").concat(dd);
    }
    return null;
}
function assertAdmin(request) {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    // The bypass now uses a standard environment variable, which is safer for local dev
    // and doesn't crash if unset. It's ignored in production.
    var bypass = process.env.DEV_ADMIN_UID;
    if (bypass && request.auth.uid === bypass)
        return;
    var token = request.auth.token || {};
    var isAdmin = token.role === "admin" || token.admin === true;
    if (!isAdmin)
        throw new https_1.HttpsError("permission-denied", "Admin privileges required.");
}
function getGeminiModel() {
    var key = exports.GEMINI_API_KEY.value();
    if (!key)
        throw new Error("GEMINI_API_KEY missing");
    var genAI = new generative_ai_1.GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}
/* --- PDF text extraction --- */
function extractPdfText(buf) {
    return __awaiter(this, void 0, void 0, function () {
        var pdf, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("pdf-parse")); })];
                case 1:
                    pdf = (_a.sent()).default;
                    return [4 /*yield*/, pdf(buf)];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data.text];
            }
        });
    });
}
/* --- VIN extraction (used for fallback) --- */
function extractVinsFromText(text) {
    var vinRe = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
    var found = new Set();
    for (var _i = 0, _a = text.toUpperCase().match(vinRe) || []; _i < _a.length; _i++) {
        var match = _a[_i];
        found.add(match);
    }
    return __spreadArray([], found, true);
}
/* --- log activity on a jacket --- */
function logActivity(vin, entry) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!vin)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, exports.db.collection("jackets").doc(vin).collection("activity").add(__assign(__assign({}, entry), { ts: firestore_1.FieldValue.serverTimestamp(), actor: "System" }))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error("logActivity error:", e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
