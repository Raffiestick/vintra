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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJacketsForInvoice = exports.createJacketFromUnit = void 0;
// functions/src/modules/staging.ts
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var config_1 = require("../config");
var npa_1 = require("../parsers/npa");
/**
 * UPDATED: This helper function now builds a more robust Jacket document
 * based on our new, flexible data structure.
 */
function _createJacketFromUnit(stagingId, unitId, actorUid) {
    return __awaiter(this, void 0, void 0, function () {
        var stagingRef, stagingSnap, staging, unitSnap, unit, vin, isIso, pickedIso, auctionSaleDate, jacketRef, remaining;
        var _this = this;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    stagingRef = config_1.db.collection("stagingInvoices").doc(String(stagingId));
                    return [4 /*yield*/, stagingRef.get()];
                case 1:
                    stagingSnap = _d.sent();
                    if (!stagingSnap.exists) {
                        throw new https_1.HttpsError("not-found", "Staging batch not found.");
                    }
                    staging = stagingSnap.data();
                    return [4 /*yield*/, stagingRef.collection("units").doc(String(unitId)).get()];
                case 2:
                    unitSnap = _d.sent();
                    if (!unitSnap.exists) {
                        throw new https_1.HttpsError("not-found", "Staged unit not found.");
                    }
                    unit = unitSnap.data();
                    if (unit.processed) {
                        console.log("Unit ".concat(unitId, " already processed. Skipping."));
                        return [2 /*return*/, { success: true, path: unit.jacketPath, vin: unit.jacketVin }];
                    }
                    vin = (((_a = unit === null || unit === void 0 ? void 0 : unit.vin) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = unit === null || unit === void 0 ? void 0 : unit.hin) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = unit === null || unit === void 0 ? void 0 : unit.stockNo) === null || _c === void 0 ? void 0 : _c.toString()) || "")
                        .trim().toUpperCase();
                    if (!vin) {
                        console.error("_createJacketFromUnit: unit has no valid identifier (VIN, HIN, or Stock #)", { stagingId: stagingId, unitId: unitId, unit: unit });
                        throw new https_1.HttpsError("failed-precondition", "Staged unit has no valid identifier.");
                    }
                    isIso = function (s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); };
                    pickedIso = isIso(staging === null || staging === void 0 ? void 0 : staging.invoiceDate) ? staging.invoiceDate :
                        isIso(unit === null || unit === void 0 ? void 0 : unit.invoiceDate) ? unit.invoiceDate : null;
                    auctionSaleDate = firestore_1.FieldValue.serverTimestamp();
                    if (pickedIso) {
                        auctionSaleDate = new Date("".concat(pickedIso, "T12:00:00.000Z"));
                    }
                    else if (staging === null || staging === void 0 ? void 0 : staging.invoiceDateTs) {
                        auctionSaleDate = staging.invoiceDateTs;
                    }
                    jacketRef = config_1.db.collection("jackets").doc(vin);
                    return [4 /*yield*/, config_1.db.runTransaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var jacketSnap, num, itemPrice, buyerFee, onlineFee, managementFee, jacketData;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, tx.get(jacketRef)];
                                    case 1:
                                        jacketSnap = _b.sent();
                                        num = function (x) { return typeof x === "number" ? x :
                                            typeof x === "string" ? Number(x.replace(/[$,]/g, "")) || 0 : 0; };
                                        itemPrice = num(unit.itemPrice);
                                        buyerFee = num(unit.buyerFee);
                                        onlineFee = num(unit.onlineFee);
                                        managementFee = num(unit.managementFee) || 100;
                                        jacketData = {
                                            vin: vin,
                                            primaryUnit: {
                                                vinOrHin: unit.vinOrHin || vin,
                                                year: num(unit.year) || undefined,
                                                make: unit.make || "",
                                                model: unit.model || "",
                                                color: unit.color || "",
                                                odometer: num(unit.odometer) || undefined,
                                                hours: num(unit.hours) || undefined,
                                                lengthFeet: num(unit.lengthFeet) || undefined,
                                                engine: unit.engine || "",
                                            },
                                            // trailerUnit: {}, // Logic to populate this will be added when we tune the parser
                                            financials: {
                                                itemPrice: itemPrice,
                                                buyerFee: buyerFee,
                                                onlineFee: onlineFee,
                                                managementFee: managementFee,
                                                miscFees: [], // Admins can add fees to this array later
                                                totalPurchasePrice: itemPrice + buyerFee + onlineFee + managementFee,
                                            },
                                            auctionSaleDate: auctionSaleDate,
                                            invoiceDate: pickedIso || null,
                                            saleLocation: unit.saleLocation || ((_a = staging === null || staging === void 0 ? void 0 : staging.invoiceMeta) === null || _a === void 0 ? void 0 : _a.saleLocation) || "",
                                            titleInfo: unit.titleInfo || "",
                                            stockNo: unit.stockNo || "",
                                            aucNo: unit.aucNo || "",
                                            isAuctionPaid: false,
                                            isMgmtFeePaid: false,
                                            documents: [],
                                            updatedAt: firestore_1.FieldValue.serverTimestamp(),
                                        };
                                        if (!jacketSnap.exists) {
                                            jacketData.createdAt = firestore_1.FieldValue.serverTimestamp();
                                            jacketData.jacketId = "J".concat(Date.now());
                                            tx.set(jacketRef, jacketData);
                                        }
                                        else {
                                            tx.update(jacketRef, jacketData);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, unitSnap.ref.update({
                            processed: true,
                            processedAt: firestore_1.FieldValue.serverTimestamp(),
                            processedBy: actorUid,
                            jacketVin: vin,
                            jacketPath: jacketRef.path,
                        })];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, stagingRef.collection("units").where("processed", "==", false).limit(1).get()];
                case 5:
                    remaining = _d.sent();
                    if (!remaining.empty) return [3 /*break*/, 7];
                    return [4 /*yield*/, stagingRef.update({ status: "processed", processedAt: firestore_1.FieldValue.serverTimestamp() })];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7: return [2 /*return*/, { success: true, path: jacketRef.path, vin: vin }];
            }
        });
    });
}
// No significant changes needed to the callable function wrappers below.
// The core logic change is all in _createJacketFromUnit.
exports.createJacketFromUnit = (0, https_1.onCall)({ region: "us-central1", secrets: [] }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, stagingId, unitId, err_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                (0, config_1.assertAdmin)(request);
                _a = request.data || {}, stagingId = _a.stagingId, unitId = _a.unitId;
                if (!stagingId || !unitId)
                    throw new https_1.HttpsError("invalid-argument", "stagingId and unitId are required.");
                if (!((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid))
                    throw new https_1.HttpsError("unauthenticated", "Authentication required.");
                return [4 /*yield*/, _createJacketFromUnit(stagingId, unitId, request.auth.uid)];
            case 1: return [2 /*return*/, _c.sent()];
            case 2:
                err_1 = _c.sent();
                console.error("[createJacketFromUnit] ERROR", (err_1 === null || err_1 === void 0 ? void 0 : err_1.stack) || err_1);
                if ((err_1 === null || err_1 === void 0 ? void 0 : err_1.code) && typeof err_1.code === "string")
                    throw err_1;
                throw new https_1.HttpsError("internal", (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || "An internal error occurred.");
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.createJacketsForInvoice = (0, https_1.onCall)({ region: "us-central1", secrets: ["GEMINI_API_KEY"], memory: '1GiB', timeoutSeconds: 300 }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var actorUid, sid, sourceUrl, docRef, snap, stg, ref, stagingRef, text, parsed, batch, _i, _a, unit, unitRef, unitsSnap, created, vins, _b, _c, unitDoc, result, e_1, err_2;
    var _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                actorUid = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid;
                if (!actorUid)
                    throw new https_1.HttpsError("unauthenticated", "Authentication required.");
                sid = ((_e = request.data) === null || _e === void 0 ? void 0 : _e.sid) || "";
                sourceUrl = ((_f = request.data) === null || _f === void 0 ? void 0 : _f.sourceUrl) || "";
                if (!sid) return [3 /*break*/, 4];
                docRef = config_1.db.collection("stagingInvoices").doc(sid);
                return [4 /*yield*/, docRef.get()];
            case 1:
                snap = _g.sent();
                if (!snap.exists)
                    throw new https_1.HttpsError("not-found", "stagingInvoices/".concat(sid, " not found"));
                stg = snap.data() || {};
                if (!(!stg.sourceUrl && sourceUrl)) return [3 /*break*/, 3];
                return [4 /*yield*/, docRef.set({ sourceUrl: sourceUrl, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true })];
            case 2:
                _g.sent();
                _g.label = 3;
            case 3:
                sourceUrl = stg.sourceUrl || sourceUrl;
                if (!sourceUrl)
                    throw new https_1.HttpsError("failed-precondition", "sourceUrl missing on staging invoice");
                return [3 /*break*/, 6];
            case 4:
                if (!sourceUrl) return [3 /*break*/, 6];
                return [4 /*yield*/, config_1.db.collection("stagingInvoices").add({
                        sourceUrl: sourceUrl,
                        parseStatus: "uploaded", createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    })];
            case 5:
                ref = _g.sent();
                sid = ref.id;
                _g.label = 6;
            case 6:
                if (!sid || !sourceUrl)
                    throw new https_1.HttpsError("invalid-argument", "Provide either { sid } or { sourceUrl }");
                _g.label = 7;
            case 7:
                _g.trys.push([7, 18, , 19]);
                stagingRef = config_1.db.collection("stagingInvoices").doc(sid);
                console.log("--- RAW INVOICE TEXT ---", JSON.stringify("")); // Keep this for our next step!
                return [4 /*yield*/, (0, config_1.extractTextFromDocument)(sourceUrl)];
            case 8:
                text = _g.sent();
                parsed = (0, npa_1.parseNpaInvoiceText)(text);
                return [4 /*yield*/, stagingRef.set({
                        invoiceDate: parsed.invoiceDate || null, invoiceMeta: parsed.invoiceMeta || {}, parseStatus: 'parsed', updatedAt: firestore_1.FieldValue.serverTimestamp()
                    }, { merge: true })];
            case 9:
                _g.sent();
                batch = config_1.db.batch();
                for (_i = 0, _a = parsed.units; _i < _a.length; _i++) {
                    unit = _a[_i];
                    unitRef = stagingRef.collection("units").doc();
                    batch.set(unitRef, __assign(__assign({}, unit), { createdAt: firestore_1.FieldValue.serverTimestamp(), processed: false }));
                }
                return [4 /*yield*/, batch.commit()];
            case 10:
                _g.sent();
                return [4 /*yield*/, stagingRef.collection("units").where("processed", "in", [false, null]).get()];
            case 11:
                unitsSnap = _g.sent();
                if (unitsSnap.empty)
                    return [2 /*return*/, { success: true, created: 0, sid: sid }];
                created = 0;
                vins = [];
                _b = 0, _c = unitsSnap.docs;
                _g.label = 12;
            case 12:
                if (!(_b < _c.length)) return [3 /*break*/, 17];
                unitDoc = _c[_b];
                _g.label = 13;
            case 13:
                _g.trys.push([13, 15, , 16]);
                return [4 /*yield*/, _createJacketFromUnit(sid, unitDoc.id, actorUid)];
            case 14:
                result = _g.sent();
                if (result.vin)
                    vins.push(result.vin);
                created++;
                return [3 /*break*/, 16];
            case 15:
                e_1 = _g.sent();
                console.error("Failed to process unit ".concat(unitDoc.id, " in batch ").concat(sid, ":"), e_1 === null || e_1 === void 0 ? void 0 : e_1.message);
                return [3 /*break*/, 16];
            case 16:
                _b++;
                return [3 /*break*/, 12];
            case 17: return [2 /*return*/, { success: true, created: created, sid: sid, vins: vins, vin: vins[0] }];
            case 18:
                err_2 = _g.sent();
                console.error("[createJacketsForInvoice] ERROR", (err_2 === null || err_2 === void 0 ? void 0 : err_2.stack) || err_2);
                if ((err_2 === null || err_2 === void 0 ? void 0 : err_2.code) && typeof err_2.code === "string")
                    throw err_2;
                throw new https_1.HttpsError("internal", (err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || "An internal error occurred.");
            case 19: return [2 /*return*/];
        }
    });
}); });
