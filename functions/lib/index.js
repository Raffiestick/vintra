"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDealerJackets = exports.generateJacketPacket = exports.generateBillOfSale = exports.generateJacketInvoice = exports.createJacketsForInvoice = exports.processStagedUnit = exports.createStagingBatchFromManualEntry = exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
// functions/src/index.ts
require("./config");
var auth_1 = require("./modules/auth");
Object.defineProperty(exports, "signInWithCustomToken", { enumerable: true, get: function () { return auth_1.signInWithCustomToken; } });
Object.defineProperty(exports, "manageDealerApplication", { enumerable: true, get: function () { return auth_1.manageDealerApplication; } });
Object.defineProperty(exports, "generateJacketId", { enumerable: true, get: function () { return auth_1.generateJacketId; } });
var staging_1 = require("./modules/staging");
Object.defineProperty(exports, "createStagingBatchFromManualEntry", { enumerable: true, get: function () { return staging_1.createStagingBatchFromManualEntry; } });
var process_1 = require("./modules/process"); // Added here
Object.defineProperty(exports, "processStagedUnit", { enumerable: true, get: function () { return process_1.processStagedUnit; } });
Object.defineProperty(exports, "createJacketsForInvoice", { enumerable: true, get: function () { return process_1.createJacketsForInvoice; } });
var invoices_1 = require("./modules/invoices");
Object.defineProperty(exports, "generateJacketInvoice", { enumerable: true, get: function () { return invoices_1.generateJacketInvoice; } });
Object.defineProperty(exports, "generateBillOfSale", { enumerable: true, get: function () { return invoices_1.generateBillOfSale; } });
var packet_1 = require("./modules/packet");
Object.defineProperty(exports, "generateJacketPacket", { enumerable: true, get: function () { return packet_1.generateJacketPacket; } });
var dealer_1 = require("./modules/dealer");
Object.defineProperty(exports, "getDealerJackets", { enumerable: true, get: function () { return dealer_1.getDealerJackets; } });
//# sourceMappingURL=index.js.map