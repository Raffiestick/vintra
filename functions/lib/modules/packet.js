"use strict";
// functions/src/modules/packet.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
const utils_1 = require("../utils");
// import { FieldValue } from "firebase-admin/firestore"; // REMOVED
// import { db, bucket, seller } from "../config"; // REMOVED
// This file has duplicate functions that need to be cleaned up later.
// For now, we are disabling them to allow deployment.
exports.generateJacketInvoice = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    (0, utils_1.assertAdmin)(request);
    throw new https_1.HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});
exports.generateBillOfSale = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    (0, utils_1.assertAdmin)(request);
    throw new https_1.HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});
//# sourceMappingURL=packet.js.map