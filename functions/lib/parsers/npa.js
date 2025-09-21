"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNpaInvoiceText = parseNpaInvoiceText;
const config_1 = require("../config");
/** Heuristic, deterministic parser for NPA-style invoices (bikes + boats). */
function parseNpaInvoiceText(text) {
    const out = {
        invoiceDate: (0, config_1.pickInvoiceDateFromHeader)(text),
        invoiceMeta: {},
        units: [],
    };
    // normalize spacing but keep line breaks (some values appear on next line)
    const norm = text.replace(/\r/g, "");
    /**
     * NPA rows begin with either:
     *  - VIN (17 chars, no I/O/Q)
     *  - HIN/HULL (12 chars, letters+digits)
     * Detect both, but prefer 17 VIN if adjacent patterns overlap.
     */
    const VIN_OR_HIN_RE = /(?<![A-Z0-9])(?:[A-HJ-NPR-Z0-9]{17}|[A-Z0-9]{12})(?![A-Z0-9])/g;
    const matches = [...norm.matchAll(VIN_OR_HIN_RE)];
    for (let i = 0; i < matches.length; i++) {
        const v = matches[i];
        const start = v.index ?? 0;
        const end = i < matches.length - 1 ? (matches[i + 1].index ?? norm.length) : norm.length;
        // include a prefix window to capture STOCK# / AUC# that can appear before VIN/HIN
        const pre = norm.slice(Math.max(0, start - 400), start);
        const chunk = norm.slice(start, end);
        const id = v[0].toUpperCase();
        const unit = { vinOrHin: id };
        if (id.length === 17)
            unit.vin = id;
        if (id.length === 12)
            unit.hin = id; // boats
        // ---- Year Make Model ---- (very stable in invoice block)
        // ex: "2012 NAUTIC STAR BOATS 203SC SPORT DECK"
        const ymm = chunk.match(/(?:^|\n|\s)(\d{4})\s+([A-Z][A-Z- ]+?)\s+([A-Z0-9][A-Z0-9 /()'*\-+]+?)(?=\n| SALE LOC:| [A-Z]{2}\s+TITLE|\bREPO\b|\bBANK OWNED\b|\bBOS ONLY\b| Item Price| PRICE| Sub-Total)/) || chunk.match(/(\d{4})\s+([A-Z][A-Z- ]+?)\s+(.+?)\n/);
        if (ymm) {
            unit.year = +ymm[1];
            unit.make = ymm[2].replace(/\s+/g, " ").trim();
            unit.model = ymm[3].replace(/\s+/g, " ").trim();
        }
        // ---- Color / Hours / Odometer ----
        // Color like "[WHT/BLU]"
        const colorM = chunk.match(/\[([A-Z/ ]+?)\]/);
        if (colorM)
            unit.color = colorM[1].replace(/\s+/g, "").toUpperCase();
        // Hours like "914H" (boats). If present we will NOT try to infer odometer.
        const hoursM = chunk.match(/\b(\d{1,6})\s*H\b/i);
        if (hoursM)
            unit.hours = +hoursM[1];
        // Odometer: number immediately before the [COLOR] or a standalone 4–6 digit line
        if (unit.hours == null) {
            if (colorM) {
                const idx = chunk.indexOf(colorM[0]);
                const look = chunk.slice(Math.max(0, idx - 16), idx);
                const odo = look.match(/(\d{4,6})\s*$/);
                if (odo)
                    unit.odometer = +odo[1];
            }
            if (!unit.odometer) {
                const loneOdo = chunk.match(/\n\s*(\d{4,6})\s*\n/);
                if (loneOdo)
                    unit.odometer = +loneOdo[1];
            }
        }
        // ---- Boat-specifics ----
        // Length & Engine often encoded near the HIN block: "L=19" and "E=1-150HP MERC OB"
        const nearBlock = [
            chunk.split("\n")[1] || "",
            chunk.split("\n")[2] || "",
            chunk.split("\n")[3] || "",
            chunk.split("\n")[4] || "",
            chunk.split("\n")[5] || "",
        ].join(" ");
        const len = /L\s*=\s*(\d{1,2})\b/i.exec(nearBlock);
        if (len)
            unit.lengthFeet = +len[1];
        const eng = /E\s*=\s*([A-Z0-9\-+\/\s]+?)(?=\s|$|\[)/i.exec(nearBlock);
        if (eng)
            unit.engine = eng[1].replace(/\s+/g, " ").trim();
        // ---- Title info ----
        // Accept common variants: "FL TITLE", "ME TITLE", "OH TITLE / TRL", "REPO", "BANK OWNED", "BOS ONLY", "LEGAL DOCS"
        const titleBlock = [chunk, pre, nearBlock].join(" ");
        const title = /(REPO(?:\s+TITLE)?|BANK OWNED|FL\s+TITLE|GA\s+TITLE|OH\s+TITLE(?:\s*\/\s*TRL)?|ME\s+TITLE|SC\s+TITLE|BOS\s+ONLY|LEGAL\s+DOCS)/i.exec(titleBlock);
        if (title)
            unit.titleInfo = title[1].replace(/\s+/g, " ").toUpperCase();
        // ---- SALE LOC ----
        const saleM = chunk.match(/SALE LOC:\s*([A-Z ]{3,})/i) ||
            pre.match(/SALE LOC:\s*([A-Z ]{3,})/i);
        if (saleM)
            unit.saleLocation = saleM[1].replace(/\s+/g, " ").trim();
        // ---- STOCK# and AUC# ----
        const stockM = pre.match(/STOCK#\s*([0-9]{5,})/i) || chunk.match(/STOCK#\s*([0-9]{5,})/i);
        if (stockM)
            unit.stockNo = stockM[1];
        const aucM = pre.match(/\bAUC#\s*([0-9]+)\b/i) || chunk.match(/\bAUC#\s*([0-9]+)\b/i);
        if (aucM)
            unit.aucNo = aucM[1];
        // ---- Fees ----
        const numFrom = (s) => s ? parseFloat(s.replace(/[, ]/g, "")) : undefined;
        const priceM = chunk.match(/Item Price:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) ||
            chunk.match(/Item Price:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        const bfeeM = chunk.match(/Buyer Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) ||
            chunk.match(/Buyer Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        const ofeeM = chunk.match(/Online Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) ||
            chunk.match(/Online Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
        if (priceM)
            unit.itemPrice = numFrom(priceM[1]);
        if (bfeeM)
            unit.buyerFee = numFrom(bfeeM[1]);
        if (ofeeM)
            unit.onlineFee = numFrom(ofeeM[1]);
        // Fallback from Sub-Total if present (don’t invent fees; only set itemPrice if all fees missing)
        if (!unit.itemPrice && !unit.buyerFee && !unit.onlineFee) {
            const subM = chunk.match(/Sub-Total\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
            if (subM)
                unit.itemPrice = numFrom(subM[1]); // editable later in Jacket UI
        }
        // sensible default until mgmt fee is modeled
        if (unit.managementFee == null)
            unit.managementFee = 100;
        out.units.push(unit);
    }
    // Header-level sale location if visible before first VIN/HIN
    if (!out.invoiceMeta?.saleLocation) {
        const preHeaderSale = norm.slice(0, matches.length ? (matches[0].index ?? 0) : 2000);
        const headerSale = preHeaderSale.match(/SALE LOC:\s*([A-Z ]{3,})/i);
        if (headerSale)
            out.invoiceMeta = {
                ...(out.invoiceMeta || {}),
                saleLocation: headerSale[1].trim(),
            };
    }
    return out;
}
