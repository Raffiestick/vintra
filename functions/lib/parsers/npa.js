"use strict";
// functions/src/parsers/npa.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNpaInvoiceText = parseNpaInvoiceText;
const utils_1 = require("../utils");
// This regex finds lines that are LIKELY a VIN, HIN, or other unique ID.
const ID_RE = /^(?![0-9]{5,8}$)(?=[A-Z0-9-]{12,18}$)[A-Z0-9-]+$/;
// This regex finds the year, make, and model on a single line.
const YMM_RE = /^(\d{4})\s+([A-Z][A-Z\s\-]+?)\s{2,}(.+)$/;
function parseNpaInvoiceText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentUnit = null;
    const units = [];
    for (const line of lines) {
        // Check if the line is a vehicle identifier
        if (ID_RE.test(line)) {
            if (currentUnit) {
                units.push(currentUnit);
            }
            currentUnit = { vin: line };
            continue;
        }
        if (!currentUnit) {
            continue;
        }
        // --- Check for Year/Make/Model ---
        const ymmMatch = line.match(YMM_RE);
        if (ymmMatch) {
            currentUnit.year = parseInt(ymmMatch[1], 10);
            currentUnit.make = ymmMatch[2].trim();
            currentUnit.model = ymmMatch[3].trim();
            continue;
        }
        // --- Check for Odometer/Color ---
        const odoColorMatch = line.match(/^(\d{2,})\s+\[([A-Z\/]+)\]$/);
        if (odoColorMatch) {
            currentUnit.odometer = parseInt(odoColorMatch[1], 10); // CORRECTED
            currentUnit.color = odoColorMatch[2];
            continue;
        }
        // --- Check for Title Info ---
        const titleMatch = line.match(/^(AZ TITLE|BOS ONLY|FL TITLE|FL REPO TITLE|SC TITLE|ME TITLE|BOS)$/);
        if (titleMatch) {
            currentUnit.titleInfo = titleMatch[1]; // CORRECTED
            continue;
        }
        // --- Check for Fees ---
        const feeMatch = line.match(/^(Item Price|Buyer Fee|Online Fee):\s*\$?([\d,]+\.\d{2})$/);
        if (feeMatch) {
            const feeName = feeMatch[1];
            const amount = parseFloat(feeMatch[2].replace(/,/g, ''));
            if (feeName === 'Item Price')
                currentUnit.itemPrice = amount; // CORRECTED
            if (feeName === 'Buyer Fee')
                currentUnit.buyerFee = amount;
            if (feeName === 'Online Fee')
                currentUnit.onlineFee = amount;
            continue;
        }
    }
    if (currentUnit) {
        units.push(currentUnit);
    }
    return {
        auctionSaleDate: (0, utils_1.pickInvoiceDateFromHeader)(text),
        units,
    };
}
//# sourceMappingURL=npa.js.map