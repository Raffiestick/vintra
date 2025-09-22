"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachStagedDocToJacket = void 0;
var https_1 = require("firebase-functions/v2/https");
var config_1 = require("../config");
exports.attachStagedDocToJacket = (0, https_1.onCall)({ region: "us-central1" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, docId, vin, typeOverride, stagedDocRef, stagedDocSnap, stagedDoc, gcsPath, fileName, docType, newPath, newFile, signedUrl, newDocument;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                _a = request.data || {}, docId = _a.docId, vin = _a.vin, typeOverride = _a.typeOverride;
                if (!docId || !vin)
                    throw new https_1.HttpsError("invalid-argument", "docId and vin are required.");
                stagedDocRef = config_1.db.collection("stagedDocs").doc(docId);
                return [4 /*yield*/, stagedDocRef.get()];
            case 1:
                stagedDocSnap = _b.sent();
                if (!stagedDocSnap.exists)
                    throw new https_1.HttpsError("not-found", "Staged document not found.");
                stagedDoc = stagedDocSnap.data();
                gcsPath = stagedDoc.gcsPath;
                if (!gcsPath)
                    throw new https_1.HttpsError("failed-precondition", "Staged document missing gcsPath.");
                fileName = gcsPath.split("/").pop() || "doc-".concat(Date.now());
                docType = typeOverride || stagedDoc.type || "other";
                newPath = "jacket-documents/".concat(vin, "/").concat(docType, "/").concat(fileName);
                return [4 /*yield*/, config_1.bucket.file(gcsPath).copy(newPath)];
            case 2:
                _b.sent(); // copy instead of move so staging remains intact
                newFile = config_1.bucket.file(newPath);
                return [4 /*yield*/, newFile.getSignedUrl({
                        action: "read",
                        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    })];
            case 3:
                signedUrl = (_b.sent())[0];
                newDocument = {
                    id: "doc-".concat(Date.now()),
                    name: fileName,
                    type: docType,
                    url: signedUrl,
                    createdAt: config_1.FieldValue.serverTimestamp(),
                };
                return [4 /*yield*/, config_1.db.collection("jackets").doc(vin).update({
                        documents: config_1.FieldValue.arrayUnion(newDocument),
                        updatedAt: config_1.FieldValue.serverTimestamp(),
                    })];
            case 4:
                _b.sent();
                return [4 /*yield*/, stagedDocRef.delete().catch(function () { })];
            case 5:
                _b.sent(); // optional
                return [2 /*return*/, { success: true, message: "Document attached to jacket ".concat(vin, ".") }];
        }
    });
}); });
