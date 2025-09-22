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
exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
var https_1 = require("firebase-functions/v2/https");
var config_1 = require("../config");
exports.signInWithCustomToken = (0, https_1.onCall)({ region: "us-central1" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, customToken, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth)
                    throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
                uid = request.auth.uid;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, config_1.adminAuth.createCustomToken(uid)];
            case 2:
                customToken = _a.sent();
                return [2 /*return*/, { token: customToken }];
            case 3:
                error_1 = _a.sent();
                console.error("Error creating custom token:", error_1);
                throw new https_1.HttpsError("internal", "Unable to create custom token.", error_1.message);
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.manageDealerApplication = (0, https_1.onCall)({ region: "us-central1" }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, uid, action, userDocRef, err_1, snap, user, now, approvedRef, err_2;
    var _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                (0, config_1.assertAdmin)(request);
                _a = request.data || {}, uid = _a.uid, action = _a.action;
                if (!uid || !action || !["approve", "deny"].includes(String(action))) {
                    throw new https_1.HttpsError("invalid-argument", "Provide 'uid' and 'action' of 'approve' or 'deny'.");
                }
                userDocRef = config_1.db.collection("users").doc(String(uid));
                if (!(action === 'deny')) return [3 /*break*/, 4];
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 4]);
                return [4 /*yield*/, userDocRef.update({ status: "denied" })];
            case 2:
                _h.sent();
                return [2 /*return*/, { success: true, message: "User ".concat(uid, " has been denied.") }];
            case 3:
                err_1 = _h.sent();
                console.error("manageDealerApplication (deny) error:", err_1);
                throw new https_1.HttpsError("internal", (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || "Failed to deny application.");
            case 4:
                _h.trys.push([4, 10, , 11]);
                return [4 /*yield*/, userDocRef.get()];
            case 5:
                snap = _h.sent();
                if (!snap.exists)
                    throw new https_1.HttpsError("not-found", "User not found");
                user = snap.data() || {};
                now = config_1.FieldValue.serverTimestamp();
                // 1. Set custom claims
                return [4 /*yield*/, config_1.adminAuth.setCustomUserClaims(uid, { dealer: true })];
            case 6:
                // 1. Set custom claims
                _h.sent();
                // 2. Update user profile
                return [4 /*yield*/, userDocRef.set({
                        status: "approved",
                        approvedAt: now,
                        approvedBy: (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid,
                        updatedAt: now,
                    }, { merge: true })];
            case 7:
                // 2. Update user profile
                _h.sent();
                approvedRef = config_1.db.collection("approvedDealers").doc(uid);
                return [4 /*yield*/, approvedRef.set({
                        uid: uid,
                        companyName: (_c = user.companyName) !== null && _c !== void 0 ? _c : "",
                        contactName: (_d = user.contactName) !== null && _d !== void 0 ? _d : "",
                        email: (_e = user.email) !== null && _e !== void 0 ? _e : "",
                        createdAt: (_f = user.createdAt) !== null && _f !== void 0 ? _f : now,
                        approvedAt: now,
                        updatedAt: now,
                    }, { merge: true })];
            case 8:
                _h.sent();
                // 4. Audit log
                return [4 /*yield*/, userDocRef.collection("activity").add({
                        type: "approved",
                        actorUid: (_g = request.auth) === null || _g === void 0 ? void 0 : _g.uid,
                        at: now,
                        meta: {},
                    })];
            case 9:
                // 4. Audit log
                _h.sent();
                return [2 /*return*/, { success: true, message: "User ".concat(uid, " has been approved.") }];
            case 10:
                err_2 = _h.sent();
                console.error("manageDealerApplication (approve) error:", err_2);
                throw new https_1.HttpsError("internal", (err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || "Failed to approve application.");
            case 11: return [2 /*return*/];
        }
    });
}); });
exports.generateJacketId = (0, https_1.onCall)({ region: "us-central1" }, function (_request) { return __awaiter(void 0, void 0, void 0, function () {
    var jacketId;
    return __generator(this, function (_a) {
        jacketId = Math.floor(100000 + Math.random() * 900000).toString();
        return [2 /*return*/, { jacketId: jacketId }];
    });
}); });
