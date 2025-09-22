"use strict";
/**
 * Main entry point for all Cloud Functions.
 * We are using explicit named exports to avoid conflicts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketInvoice = exports.generateBillOfSale = exports.processStagedUnit = exports.createStagingBatchFromManualEntry = void 0;
// Functions for the new staging workflow
var staging_1 = require("./modules/staging");
Object.defineProperty(exports, "createStagingBatchFromManualEntry", { enumerable: true, get: function () { return staging_1.createStagingBatchFromManualEntry; } });
var process_1 = require("./modules/process");
Object.defineProperty(exports, "processStagedUnit", { enumerable: true, get: function () { return process_1.processStagedUnit; } });
// Existing functions from the invoices module
var invoices_1 = require("./modules/invoices");
Object.defineProperty(exports, "generateBillOfSale", { enumerable: true, get: function () { return invoices_1.generateBillOfSale; } });
Object.defineProperty(exports, "generateJacketInvoice", { enumerable: true, get: function () { return invoices_1.generateJacketInvoice; } });
// Other function modules like auth, docs, and packet are ignored for now
// to ensure the build succeeds. We can add them back later if needed.
//# sourceMappingURL=index.js.map