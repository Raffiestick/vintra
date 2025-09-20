"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDocParse = void 0;
const https_1 = require("firebase-functions/v2/https");
exports.startDocParse = (0, https_1.onRequest)({ region: "us-central1", cors: true }, async (_req, res) => {
    res.status(501).json({ error: "Not implemented yet" });
});
