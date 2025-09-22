"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketInvoice = exports.generateBillOfSale = void 0;
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("../config");
// Placeholder function to resolve the export error.
// The error code has been corrected to "unimplemented".
exports.generateBillOfSale = (0, https_1.onCall)({ cors: true }, async (request) => {
    (0, config_1.assertAdmin)(request);
    console.log("Generating Bill of Sale with data:", request.data);
    throw new https_1.HttpsError("unimplemented", "This function is not fully implemented yet.");
});
// Placeholder function to resolve the export error.
// The error code has been corrected to "unimplemented".
exports.generateJacketInvoice = (0, https_1.onCall)({ cors: true }, async (request) => {
    (0, config_1.assertAdmin)(request);
    console.log("Generating Jacket Invoice with data:", request.data);
    throw new https_1.HttpsError("unimplemented", "This function is not fully implemented yet.");
});
//# sourceMappingURL=invoices.js.map