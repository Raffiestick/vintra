"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReassignmentForm = exports.getDealerJackets = exports.processStagedUnit = exports.createStagingBatchFromManualEntry = exports.generateJacketPacket = exports.regenerateInvoiceOnChange = exports.generateBillOfSale = exports.generateJacketInvoice = exports.attachStagedDocToJacket = exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
require("./config"); // This is critical, do not remove.
// --- Core Application Functions ---
var auth_1 = require("./modules/auth");
Object.defineProperty(exports, "signInWithCustomToken", { enumerable: true, get: function () { return auth_1.signInWithCustomToken; } });
Object.defineProperty(exports, "manageDealerApplication", { enumerable: true, get: function () { return auth_1.manageDealerApplication; } });
Object.defineProperty(exports, "generateJacketId", { enumerable: true, get: function () { return auth_1.generateJacketId; } });
var docs_1 = require("./modules/docs");
Object.defineProperty(exports, "attachStagedDocToJacket", { enumerable: true, get: function () { return docs_1.attachStagedDocToJacket; } });
var invoices_1 = require("./modules/invoices");
Object.defineProperty(exports, "generateJacketInvoice", { enumerable: true, get: function () { return invoices_1.generateJacketInvoice; } });
Object.defineProperty(exports, "generateBillOfSale", { enumerable: true, get: function () { return invoices_1.generateBillOfSale; } });
Object.defineProperty(exports, "regenerateInvoiceOnChange", { enumerable: true, get: function () { return invoices_1.regenerateInvoiceOnChange; } });
var packet_1 = require("./modules/packet");
Object.defineProperty(exports, "generateJacketPacket", { enumerable: true, get: function () { return packet_1.generateJacketPacket; } });
// --- Staging Workflow Functions ---
var staging_1 = require("./modules/staging");
Object.defineProperty(exports, "createStagingBatchFromManualEntry", { enumerable: true, get: function () { return staging_1.createStagingBatchFromManualEntry; } });
var process_1 = require("./modules/process");
Object.defineProperty(exports, "processStagedUnit", { enumerable: true, get: function () { return process_1.processStagedUnit; } });
// --- Newly Added Functions ---
// NOTE: The build will only succeed if these files and functions actually exist.
var dealer_1 = require("./modules/dealer");
Object.defineProperty(exports, "getDealerJackets", { enumerable: true, get: function () { return dealer_1.getDealerJackets; } });
var reassignment_1 = require("./modules/reassignment");
Object.defineProperty(exports, "generateReassignmentForm", { enumerable: true, get: function () { return reassignment_1.generateReassignmentForm; } });
//# sourceMappingURL=index.js.map