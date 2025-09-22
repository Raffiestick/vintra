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
exports.generateJacketPacket = void 0;
var https_1 = require("firebase-functions/v2/https");
var chromium_1 = __importDefault(require("@sparticuz/chromium"));
var puppeteer_core_1 = __importDefault(require("puppeteer-core"));
var pdf_lib_1 = require("pdf-lib");
var config_1 = require("../config");
exports.generateJacketPacket = (0, https_1.onCall)({ region: "us-central1", timeoutSeconds: 180, memory: "1GiB" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var rawVin, docRef, snap, j, coverHtml, browser, _a, _b, page, coverPdfBuffer, packet_2, coverPdf, coverPages, _i, coverPages_1, p, invBuf, invPdf, invPages, bosBuf, bosPdf, bosPages, _c, _d, d, u, objectPath, enc, parts, file, buf, md, ct, extPdf, pages, isJpg, img, _e, page_1, _f, width, height, maxW, maxH, scale, w, h, x, y, e_1, packetBytes, packetPath, signedUrl, err_1;
    var _g;
    var _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                _k.label = 1;
            case 1:
                _k.trys.push([1, 38, , 39]);
                rawVin = ((_j = (_h = request.data) === null || _h === void 0 ? void 0 : _h.vin) !== null && _j !== void 0 ? _j : "").toString().trim().toUpperCase();
                if (!rawVin) {
                    throw new https_1.HttpsError("invalid-argument", "Missing 'vin'");
                }
                docRef = config_1.db.collection("jackets").doc(rawVin);
                return [4 /*yield*/, docRef.get()];
            case 2:
                snap = _k.sent();
                if (!snap.exists) {
                    throw new https_1.HttpsError("not-found", "Jacket not found");
                }
                j = snap.data() || {};
                if (!j.invoiceUrl) {
                    throw new https_1.HttpsError("failed-precondition", "Invoice must be generated before creating a packet.");
                }
                if (!j.bosUrl) {
                    throw new https_1.HttpsError("failed-precondition", "Bill of Sale must be generated before creating a packet.");
                }
                coverHtml = "<!doctype html><html><body style=\"font-family:system-ui; padding:48px\">\n        <h1 style=\"margin:0 0 8px\">DEALER JACKET</h1>\n        <div>VIN: ".concat(j.vin, "</div>\n        <div>Vehicle: ").concat([j.year, j.make, j.model].filter(Boolean).join(" "), "</div>\n        <div>Auction Date: ").concat(j.invoiceDateDisplay || "", "</div>\n      </body></html>");
                _b = (_a = puppeteer_core_1.default).launch;
                _g = { args: chromium_1.default.args };
                return [4 /*yield*/, chromium_1.default.executablePath()];
            case 3: return [4 /*yield*/, _b.apply(_a, [(_g.executablePath = _k.sent(), _g.headless = true, _g)])];
            case 4:
                browser = _k.sent();
                return [4 /*yield*/, browser.newPage()];
            case 5:
                page = _k.sent();
                return [4 /*yield*/, page.setContent(coverHtml, { waitUntil: "networkidle0" })];
            case 6:
                _k.sent();
                return [4 /*yield*/, page.pdf({ format: "A4", printBackground: true })];
            case 7:
                coverPdfBuffer = _k.sent();
                return [4 /*yield*/, browser.close()];
            case 8:
                _k.sent();
                return [4 /*yield*/, pdf_lib_1.PDFDocument.create()];
            case 9:
                packet_2 = _k.sent();
                return [4 /*yield*/, pdf_lib_1.PDFDocument.load(coverPdfBuffer)];
            case 10:
                coverPdf = _k.sent();
                return [4 /*yield*/, packet_2.copyPages(coverPdf, coverPdf.getPageIndices())];
            case 11:
                coverPages = _k.sent();
                for (_i = 0, coverPages_1 = coverPages; _i < coverPages_1.length; _i++) {
                    p = coverPages_1[_i];
                    packet_2.addPage(p);
                }
                return [4 /*yield*/, config_1.bucket.file("jacket-documents/".concat(rawVin, "/invoice.pdf")).download()];
            case 12:
                invBuf = (_k.sent())[0];
                return [4 /*yield*/, pdf_lib_1.PDFDocument.load(invBuf)];
            case 13:
                invPdf = _k.sent();
                return [4 /*yield*/, packet_2.copyPages(invPdf, invPdf.getPageIndices())];
            case 14:
                invPages = _k.sent();
                invPages.forEach(function (p) { return packet_2.addPage(p); });
                return [4 /*yield*/, config_1.bucket.file("jacket-documents/".concat(rawVin, "/bill-of-sale.pdf")).download()];
            case 15:
                bosBuf = (_k.sent())[0];
                return [4 /*yield*/, pdf_lib_1.PDFDocument.load(bosBuf)];
            case 16:
                bosPdf = _k.sent();
                return [4 /*yield*/, packet_2.copyPages(bosPdf, bosPdf.getPageIndices())];
            case 17:
                bosPages = _k.sent();
                bosPages.forEach(function (p) { return packet_2.addPage(p); });
                _c = 0, _d = Array.isArray(j.documents) ? j.documents : [];
                _k.label = 18;
            case 18:
                if (!(_c < _d.length)) return [3 /*break*/, 32];
                d = _d[_c];
                _k.label = 19;
            case 19:
                _k.trys.push([19, 30, , 31]);
                if (!(d === null || d === void 0 ? void 0 : d.url) || typeof (d === null || d === void 0 ? void 0 : d.name) !== "string")
                    return [3 /*break*/, 31];
                u = new URL(d.url);
                objectPath = "";
                if (u.hostname.includes("firebasestorage.googleapis.com") && u.pathname.includes("/o/")) {
                    enc = u.pathname.split("/o/")[1] || "";
                    objectPath = decodeURIComponent((enc.split("?")[0] || "").replace(/^\/+/, ""));
                }
                else if (u.hostname.includes("storage.googleapis.com")) {
                    parts = u.pathname.split("/");
                    objectPath = decodeURIComponent(parts.slice(2).join("/"));
                }
                if (!objectPath)
                    return [3 /*break*/, 31];
                file = config_1.bucket.file(objectPath);
                return [4 /*yield*/, file.download()];
            case 20:
                buf = (_k.sent())[0];
                return [4 /*yield*/, file.getMetadata().catch(function () { return [{ contentType: "" }]; })];
            case 21:
                md = (_k.sent())[0];
                ct = String((md === null || md === void 0 ? void 0 : md.contentType) || "");
                if (!ct.startsWith("application/pdf")) return [3 /*break*/, 24];
                return [4 /*yield*/, pdf_lib_1.PDFDocument.load(buf)];
            case 22:
                extPdf = _k.sent();
                return [4 /*yield*/, packet_2.copyPages(extPdf, extPdf.getPageIndices())];
            case 23:
                pages = _k.sent();
                pages.forEach(function (p) { return packet_2.addPage(p); });
                return [3 /*break*/, 29];
            case 24:
                if (!(ct.startsWith("image/") || /\.(png|jpe?g)$/i.test(d.name))) return [3 /*break*/, 29];
                isJpg = ct.includes("jpeg") || /\.jpe?g$/i.test(d.name);
                if (!isJpg) return [3 /*break*/, 26];
                return [4 /*yield*/, packet_2.embedJpg(buf)];
            case 25:
                _e = _k.sent();
                return [3 /*break*/, 28];
            case 26: return [4 /*yield*/, packet_2.embedPng(buf)];
            case 27:
                _e = _k.sent();
                _k.label = 28;
            case 28:
                img = _e;
                page_1 = packet_2.addPage([595.28, 841.89]);
                _f = img.scale(1), width = _f.width, height = _f.height;
                maxW = 555, maxH = 800;
                scale = Math.min(maxW / width, maxH / height, 1);
                w = width * scale, h = height * scale;
                x = (595.28 - w) / 2, y = (841.89 - h) / 2;
                page_1.drawImage(img, { x: x, y: y, width: w, height: h });
                _k.label = 29;
            case 29: return [3 /*break*/, 31];
            case 30:
                e_1 = _k.sent();
                console.warn("Could not append doc:", d === null || d === void 0 ? void 0 : d.name, e_1);
                return [3 /*break*/, 31];
            case 31:
                _c++;
                return [3 /*break*/, 18];
            case 32: return [4 /*yield*/, packet_2.save()];
            case 33:
                packetBytes = _k.sent();
                packetPath = "jacket-documents/".concat(rawVin, "/packet.pdf");
                return [4 /*yield*/, config_1.bucket.file(packetPath).save(packetBytes, { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0, no-store" } })];
            case 34:
                _k.sent();
                return [4 /*yield*/, config_1.bucket.file(packetPath).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })];
            case 35:
                signedUrl = (_k.sent())[0];
                return [4 /*yield*/, docRef.update({ packetUrl: signedUrl, updatedAt: config_1.FieldValue.serverTimestamp() })];
            case 36:
                _k.sent();
                return [4 /*yield*/, (0, config_1.logActivity)(rawVin, { type: "packetGenerated", message: "Packet generated (cover + invoice + BOS + attachments)", meta: { url: signedUrl } })];
            case 37:
                _k.sent();
                return [2 /*return*/, { ok: true, vin: rawVin, url: signedUrl }];
            case 38:
                err_1 = _k.sent();
                console.error("generateJacketPacket error:", err_1);
                if (err_1 instanceof https_1.HttpsError)
                    throw err_1;
                throw new https_1.HttpsError("internal", (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || "Internal error");
            case 39: return [2 /*return*/];
        }
    });
}); });
