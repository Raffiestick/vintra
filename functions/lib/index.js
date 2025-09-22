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
exports.functions = exports.storage = exports.auth = exports.db = exports.admin = void 0;
exports.assertAdmin = assertAdmin;
exports.extractTextFromDocument = extractTextFromDocument;
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const https_2 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const functions_1 = require("firebase-admin/functions");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export core Firebase services
const db = (0, firestore_2.getFirestore)();
exports.db = db;
const auth = (0, auth_1.getAuth)();
exports.auth = auth;
const storage = (0, storage_1.getStorage)();
exports.storage = storage;
const functions = (0, functions_1.getFunctions)();
exports.functions = functions;
// Helper function to assert admin privileges
function assertAdmin(request) {
    var _a, _b;
    if (!((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin)) {
        throw new https_2.HttpsError("permission-denied", "This function can only be called by an admin.");
    }
}
// Helper to extract text from a document in Storage
async function extractTextFromDocument(sourceUrl) {
    const resp = await fetch(sourceUrl);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (sourceUrl.toLowerCase().includes(".pdf")) {
        const data = await (0, pdf_parse_1.default)(buf);
        return data.text;
    }
    else if (/\.(jpe?g|png|gif|webp)$/i.test(sourceUrl)) {
        console.warn("Image text extraction with Gemini is not yet implemented in this file.");
        return "";
    }
    throw new https_2.HttpsError('invalid-argument', 'sourceUrl must be a PDF or image file.');
}
//# sourceMappingURL=index.js.map