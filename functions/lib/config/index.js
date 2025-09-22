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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seller = exports.bucket = exports.storage = exports.auth = exports.db = void 0;
exports.assertAdmin = assertAdmin;
exports.logActivity = logActivity;
exports.extractPdfText = extractPdfText;
exports.pickInvoiceDateFromHeader = pickInvoiceDateFromHeader;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.db = (0, firestore_1.getFirestore)();
exports.auth = (0, auth_1.getAuth)();
exports.storage = (0, storage_1.getStorage)();
exports.bucket = exports.storage.bucket();
exports.seller = {
    name: "RIZEUP VENTURES LLC DBA DOLPHIN CHASERS",
    line1: "4336 BELLA VISTA DR",
    line2: "ST PETE BEACH, FL 33706",
    phone: "616-318-1991",
};
function assertAdmin(request) {
    var _a, _b;
    if (!((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin)) {
        throw new https_1.HttpsError("permission-denied", "This function can only be called by an admin.");
    }
}
async function logActivity(vin, entry) {
    if (!vin)
        return;
    const activityRef = exports.db.collection('jackets').doc(vin).collection('activity');
    await activityRef.add(Object.assign(Object.assign({}, entry), { timestamp: firestore_1.FieldValue.serverTimestamp() }));
}
async function extractPdfText(buf) {
    const data = await (0, pdf_parse_1.default)(buf);
    return data.text;
}
function pickInvoiceDateFromHeader(text) {
    const dateMatch = text.match(/DATE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (!dateMatch)
        return null;
    try {
        const date = new Date(dateMatch[1]);
        return date.toISOString().split('T')[0];
    }
    catch (e) {
        return null;
    }
}
//# sourceMappingURL=index.js.map