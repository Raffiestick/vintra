"use strict";
// functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBillOfSale = exports.generateJacketInvoice = exports.processStagedUnit = exports.createStagingBatchFromManualEntry = exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
/**
 * This line is CRUCIAL. It imports and runs the Firebase Admin configuration
 * which initializes the app. It must be the first line of this file.
 */
require("./config");
// --- Authentication & User Management ---
var auth_1 = require("./modules/auth");
Object.defineProperty(exports, "signInWithCustomToken", { enumerable: true, get: function () { return auth_1.signInWithCustomToken; } });
Object.defineProperty(exports, "manageDealerApplication", { enumerable: true, get: function () { return auth_1.manageDealerApplication; } });
Object.defineProperty(exports, "generateJacketId", { enumerable: true, get: function () { return auth_1.generateJacketId; } });
// --- Staging & Processing ---
var staging_1 = require("./modules/staging");
Object.defineProperty(exports, "createStagingBatchFromManualEntry", { enumerable: true, get: function () { return staging_1.createStagingBatchFromManualEntry; } });
var process_1 = require("./modules/process");
Object.defineProperty(exports, "processStagedUnit", { enumerable: true, get: function () { return process_1.processStagedUnit; } });
// --- Document & Packet Generation ---
// export { attachStagedDocToJacket } from "./modules/docs"; // Temporarily disabled for debugging
var invoices_1 = require("./modules/invoices");
Object.defineProperty(exports, "generateJacketInvoice", { enumerable: true, get: function () { return invoices_1.generateJacketInvoice; } });
Object.defineProperty(exports, "generateBillOfSale", { enumerable: true, get: function () { return invoices_1.generateBillOfSale; } });
//# sourceMappingURL=index.js.map