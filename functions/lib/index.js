"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJacketPacket = exports.generateBillOfSale = exports.generateJacketInvoice = exports.attachStagedDocToJacket = exports.createJacketsForInvoice = exports.createJacketFromUnit = exports.generateJacketId = exports.manageDealerApplication = exports.signInWithCustomToken = void 0;
// Re-export all your functions from small modules
var auth_1 = require("./modules/auth");
Object.defineProperty(exports, "signInWithCustomToken", { enumerable: true, get: function () { return auth_1.signInWithCustomToken; } });
Object.defineProperty(exports, "manageDealerApplication", { enumerable: true, get: function () { return auth_1.manageDealerApplication; } });
Object.defineProperty(exports, "generateJacketId", { enumerable: true, get: function () { return auth_1.generateJacketId; } });
var staging_1 = require("./modules/staging");
Object.defineProperty(exports, "createJacketFromUnit", { enumerable: true, get: function () { return staging_1.createJacketFromUnit; } });
Object.defineProperty(exports, "createJacketsForInvoice", { enumerable: true, get: function () { return staging_1.createJacketsForInvoice; } });
var docs_1 = require("./modules/docs");
Object.defineProperty(exports, "attachStagedDocToJacket", { enumerable: true, get: function () { return docs_1.attachStagedDocToJacket; } });
var invoices_1 = require("./modules/invoices");
Object.defineProperty(exports, "generateJacketInvoice", { enumerable: true, get: function () { return invoices_1.generateJacketInvoice; } });
Object.defineProperty(exports, "generateBillOfSale", { enumerable: true, get: function () { return invoices_1.generateBillOfSale; } });
var packet_1 = require("./modules/packet");
Object.defineProperty(exports, "generateJacketPacket", { enumerable: true, get: function () { return packet_1.generateJacketPacket; } });
// Keep placeholder so CLI won't try to delete if you had this name deployed.
// export { startDocParse } from "./placeholder";
