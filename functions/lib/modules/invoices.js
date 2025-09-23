"use strict";
// functions/src/modules/invoices.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = void 0;
const https_1 = require("firebase-functions/v2/https");
// import { db } from "../config"; // REMOVED
const utils_1 = require("../utils");
exports.generateJacketInvoice = (0, https_1.onCall)({
    cors: true,
    region: "us-central1",
    memory: '1GiB',
    timeoutSeconds: 60
}, async (request) => {
    (0, utils_1.assertAdmin)(request);
    console.log("Generating Jacket Invoice with data:", request.data);
    throw new https_1.HttpsError("unimplemented", "This function is temporarily disabled for debugging.");
});
exports.generateBillOfSale = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    (0, utils_1.assertAdmin)(request);
    console.log("Generating Bill of Sale with data:", request.data);
    throw new https_1.HttpsError("unimplemented", "This function is not fully implemented yet.");
});
//# sourceMappingURL=invoices.js.map