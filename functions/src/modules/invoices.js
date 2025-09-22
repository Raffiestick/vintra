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
return (mod && mod.__esModule) ? mod : { "default": mod };
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = void 0;
var https_1 = require("firebase-functions/v2/https");
var chromium_1 = __importDefault(require("@sparticuz/chromium"));
var puppeteer_core_1 = __importDefault(require("puppeteer-core"));
var config_1 = require("../config");
var invoice_1 = require("../templates/invoice");
var bos_1 = require("../templates/bos");
/* Buyer lookup */
function getBuyerData(dealerId) {
    return __awaiter(this, void 0, void 0, function () {
        var snap, u, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!dealerId)
                        return [2 /*return*/, { name: "Dealer (unassigned)" }];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, config_1.db.collection("users").doc(dealerId).get()];
                case 2:
                    snap = _b.sent();
                    if (snap.exists) {
                        u = snap.data() || {};
                        return [2 /*return*/, {
                                name: u.companyName || u.businessName || u.contactName || u.displayName || u.email || u.uid,
                                line1: u.streetAddress || u.address || u.street || "",
                                line2: [u.city, u.state, u.zip].filter(Boolean).join(", "),
                                phone: u.phone || "",
                                email: u.email || "",
                            }];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, { name: "Dealer ".concat(dealerId || "") }];
            }
        });
    });
}
exports.generateJacketInvoice = (0, https_1.onCall)({ region: "us-central1", timeoutSeconds: 60, memory: "1GiB" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var rawVin, ref, snap, j, buyer, html, browser, _a, _b, page, pdf, path, url, e_1;
    var _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                _f.label = 1;
            case 1:
                _f.trys.push([1, 13, , 14]);
                rawVin = ((_e = (_d = request.data) === null || _d === void 0 ? void 0 : _d.vin) !== null && _e !== void 0 ? _e : "").toString().trim().toUpperCase();
                if (!rawVin) {
                    throw new https_1.HttpsError("invalid-argument", "Missing 'vin'");
                }
                ref = config_1.db.collection("jackets").doc(rawVin);
                return [4 /*yield*/, ref.get()];
            case 2:
                snap = _f.sent();
                if (!snap.exists) {
                    throw new https_1.HttpsError("not-found", "Jacket not found");
                }
                j = snap.data() || {};
                return [4 /*yield*/, getBuyerData(j.dealerId)];
            case 3:
                buyer = _f.sent();
                html = (0, invoice_1.renderInvoiceHTML)(j, config_1.seller, buyer);
                _b = (_a = puppeteer_core_1.default).launch;
                _c = { args: chromium_1.default.args };
                return [4 /*yield*/, chromium_1.default.executablePath()];
            case 4: return [4 /*yield*/, _b.apply(_a, [(_c.executablePath = _f.sent(), _c.headless = true, _c)])];
            case 5:
                browser = _f.sent();
                return [4 /*yield*/, browser.newPage()];
            case 6:
                page = _f.sent();
                return [4 /*yield*/, page.setContent(html, { waitUntil: "networkidle0" })];
            case 7:
                _f.sent();
                return [4 /*yield*/, page.pdf({ format: "A4", printBackground: true })];
            case 8:
                pdf = _f.sent();
                return [4 /*yield*/, browser.close()];
            case 9:
                _f.sent();
                path = "jacket-documents/".concat(rawVin, "/invoice.pdf");
                return [4 /*yield*/, config_1.bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } })];
            case 10:
                _f.sent();
                return [4 /*yield*/, config_1.bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })];
            case 11:
                url = (_f.sent())[0];
                return [4 /*yield*/, ref.update({ invoiceUrl: url, updatedAt: config_1.FieldValue.serverTimestamp() })];
            case 12:
                _f.sent();
                return [2 /*return*/, { ok: true, vin: rawVin, url: url }];
            case 13:
                e_1 = _f.sent();
                console.error("generateJacketInvoice error:", e_1);
                if (e_1 instanceof https_1.HttpsError)
                    throw e_1;
                throw new https_1.HttpsError("internal", (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || "Internal error");
            case 14: return [2 /*return*/];
        }
    });
}); });
exports.generateBillOfSale = (0, https_1.onCall)({ region: "us-central1", timeoutSeconds: 60, memory: "1GiB" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var rawVin, ref, snap, j, buyer, html, browser, _a, _b, page, pdf, path, url, e_2;
    var _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                _f.label = 1;
            case 1:
                _f.trys.push([1, 13, , 14]);
                rawVin = ((_e = (_d = request.data) === null || _d === void 0 ? void 0 : _d.vin) !== null && _e !== void 0 ? _e : "").toString().trim().toUpperCase();
                if (!rawVin) {
                    throw new https_1.HttpsError("invalid-argument", "Missing 'vin'");
                }
                ref = config_1.db.collection("jackets").doc(rawVin);
                return [4 /*yield*/, ref.get()];
            case 2:
                snap = _f.sent();
                if (!snap.exists) {
                    throw new https_1.HttpsError("not-found", "Jacket not found");
                }
                j = snap.data() || {};
                return [4 /*yield*/, getBuyerData(j.dealerId)];
            case 3:
                buyer = _f.sent();
                html = (0, bos_1.renderBoSHTML)(j, config_1.seller, buyer);
                _b = (_a = puppeteer_core_1.default).launch;
                _c = { args: chromium_1.default.args };
                return [4 /*yield*/, chromium_1.default.executablePath()];
            case 4: return [4 /*yield*/, _b.apply(_a, [(_c.executablePath = _f.sent(), _c.headless = true, _c)])];
            case 5:
                browser = _f.sent();
                return [4 /*yield*/, browser.newPage()];
            case 6:
                page = _f.sent();
                return [4 /*yield*/, page.setContent(html, { waitUntil: "networkidle0" })];
            case 7:
                _f.sent();
                return [4 /*yield*/, page.pdf({ format: "A4", printBackground: true })];
            case 8:
                pdf = _f.sent();
                return [4 /*yield*/, browser.close()];
            case 9:
                _f.sent();
                path = "jacket-documents/".concat(rawVin, "/bill-of-sale.pdf");
                return [4 /*yield*/, config_1.bucket.file(path).save(pdf, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } })];
            case 10:
                _f.sent();
                return [4 /*yield*/, config_1.bucket.file(path).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })];
            case 11:
                url = (_f.sent())[0];
                return [4 /*yield*/, ref.update({ bosUrl: url, updatedAt: config_1.FieldValue.serverTimestamp() })];
            case 12:
                _f.sent();
                return [2 /*return*/, { ok: true, vin: rawVin, url: url }];
            case 13:
                e_2 = _f.sent();
                console.error("generateBillOfSale error:", e_2);
                if (e_2 instanceof https_1.HttpsError)
                    throw e_2;
                throw new https_1.HttpsError("internal", (e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || "Internal error");
            case 14: return [2 /*return*/];
        }
    });
}); });
