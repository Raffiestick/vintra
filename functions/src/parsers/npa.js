"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNpaInvoiceText = parseNpaInvoiceText;
var config_2 = require("../config");
/** Heuristic, deterministic parser for NPA-style invoices. */
function parseNpaInvoiceText(text) {
    var _a, _b, _c, _d;
    var out = { invoiceDate: (0, config_2.pickInvoiceDateFromHeader)(text), invoiceMeta: {}, units: [] };
    // normalize spacing but keep line breaks (some values appear on next line)
    var norm = text.replace(/\r/g, '');
    // find all VINs; for boats this is the HIN; same 17‑char pattern is used in the sample PDFs
    var VIN_RE = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
    var matches = __spreadArray([], norm.matchAll(VIN_RE), true);
    for (var i = 0; i < matches.length; i++) {
        var v = matches[i];
        var start = (_a = v.index) !== null && _a !== void 0 ? _a : 0;
        var end = i < matches.length - 1 ? ((_b = matches[i + 1].index) !== null && _b !== void 0 ? _b : norm.length) : norm.length;
        // include a prefix window to capture STOCK# / AUC# that can appear before VIN
        var pre = norm.slice(Math.max(0, start - 400), start);
        var chunk = norm.slice(start, end);
        var unit = { vin: v[0].toUpperCase() };
        // Year Make Model — very stable in invoice block
        var ymm = (chunk.match(/(?:^|\n|\s)(\d{4})\s+([A-Z][A-Z-]+)\s+([A-Z0-9][A-Z0-9 /()'*-]+?)(?=\n| SALE LOC:| [A-Z]{2}\s+TITLE| Item Price| PRICE| Sub-Total)/) ||
            chunk.match(/(\d{4})\s+([A-Z][A-Z-]+)\s+(.+?)\n/));
        if (ymm) {
            unit.year = +ymm[1];
            unit.make = ymm[2].trim();
            unit.model = ymm[3].replace(/\s+/g, ' ').trim();
        }
        // Color & Odometer/Hours:
        var colorM = chunk.match(/\[([A-Z/ ]+?)\]/);
        if (colorM)
            unit.color = colorM[1].replace(/\s+/g, '').toUpperCase();
        // hours like "914H" (boats)
        var hoursM = chunk.match(/(\d{1,6})\s*H\b/i);
        if (hoursM)
            unit.hours = +hoursM[1];
        // odometer: number immediately before the [COLOR] or a standalone 4–6 digit line
        if (!unit.hours) {
            if (colorM) {
                var idx = chunk.indexOf(colorM[0]);
                var look = chunk.slice(Math.max(0, idx - 14), idx);
                var odo = look.match(/(\d{4,6})\s*$/);
                if (odo)
                    unit.odometer = +odo[1];
            }
            if (!unit.odometer) {
                var loneOdo = chunk.match(/\n\s*(\d{4,6})\s*\n/);
                if (loneOdo)
                    unit.odometer = +loneOdo[1];
            }
        }
        // Title info (FL TITLE | ME TITLE | OH TITLE /TRL)
        var titleM = chunk.match(/([A-Z]{2})\s+TITLE(?:\s*\/\s*TRL)?/i);
        if (titleM)
            unit.titleInfo = titleM[0].replace(/\s+/g, ' ').toUpperCase();
        // SALE LOC
        var saleM = (chunk.match(/SALE LOC:\s*([A-Z ]{3,})/i) || pre.match(/SALE LOC:\s*([A-Z ]{3,})/i));
        if (saleM)
            unit.saleLocation = saleM[1].replace(/\s+/g, ' ').trim();
        // STOCK# may be before VIN
        var stockM = (pre.match(/STOCK#\s*([0-9]{5,})/i) || chunk.match(/STOCK#\s*([0-9]{5,})/i));
        if (stockM)
            unit.stockNo = stockM[1];
        // AUC# occasionally printed near row header
        var aucM = (pre.match(/\bAUC#\s*([0-9]+)\b/i) || chunk.match(/\bAUC#\s*([0-9]+)\b/i));
        if (aucM)
            unit.aucNo = aucM[1];
        // Fees — allow for line breaks after the label
        var numFrom = function (s) { return (s ? parseFloat(s.replace(/[, ]/g, '')) : undefined); };
        var priceM = chunk.match(/Item Price:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Item Price:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        var bfeeM = chunk.match(/Buyer Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Buyer Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        var ofeeM = chunk.match(/Online Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Online Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        if (priceM)
            unit.itemPrice = numFrom(priceM[1]);
        if (bfeeM)
            unit.buyerFee = numFrom(bfeeM[1]);
        if (ofeeM)
            unit.onlineFee = numFrom(ofeeM[1]);
        // Fallback from Sub-Total if present (don’t invent fees; only set itemPrice if all fees missing)
        if (!unit.itemPrice && !unit.buyerFee && !unit.onlineFee) {
            var subM = chunk.match(/Sub-Total\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
            if (subM)
                unit.itemPrice = numFrom(subM[1]); // you can edit fees later in the Jacket UI
        }
        if (unit.managementFee == null)
            unit.managementFee = 100;
        out.units.push(unit);
    }
    // Header-level sale location if visible before first VIN
    if (!((_c = out.invoiceMeta) === null || _c === void 0 ? void 0 : _c.saleLocation)) {
        var preHeaderSale = norm.slice(0, matches.length ? ((_d = matches[0].index) !== null && _d !== void 0 ? _d : 0) : 2000);
        var headerSale = preHeaderSale.match(/SALE LOC:\s*([A-Z ]{3,})/i);
        if (headerSale)
            out.invoiceMeta = __assign(__assign({}, (out.invoiceMeta || {})), { saleLocation: headerSale[1].trim() });
    }
    return out;
}
