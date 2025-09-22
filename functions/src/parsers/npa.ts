import { pickInvoiceDateFromHeader } from "../config";

/** Heuristic, deterministic parser for NPA-style invoices. */
export function parseNpaInvoiceText(text: string): {
  invoiceDate?: string | null;
  invoiceMeta?: { aucNo?: string; saleLocation?: string };
  units: any[];
} {
  const out: { invoiceDate: string | null; invoiceMeta: { aucNo?: string; saleLocation?: string }; units: any[] } =
    { invoiceDate: pickInvoiceDateFromHeader(text), invoiceMeta: {}, units: [] };

  // normalize spacing but keep line breaks (some values appear on next line)
  const norm = text.replace(/\r/g, '');

  // find all VINs; for boats this is the HIN; same 17‑char pattern is used in the sample PDFs
  const VIN_RE = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
  const matches = [...norm.matchAll(VIN_RE)];

  for (let i = 0; i < matches.length; i++) {
    const v = matches[i];
    const start = v.index ?? 0;
    const end = i < matches.length - 1 ? (matches[i + 1].index ?? norm.length) : norm.length;

    // include a prefix window to capture STOCK# / AUC# that can appear before VIN
    const pre = norm.slice(Math.max(0, start - 400), start);
    const chunk = norm.slice(start, end);

    const unit: any = { vin: v[0].toUpperCase() };

    // Year Make Model — very stable in invoice block
    const ymm = (chunk.match(/(?:^|\n|\s)(\d{4})\s+([A-Z][A-Z-]+)\s+([A-Z0-9][A-Z0-9 /()'*-]+?)(?=\n| SALE LOC:| [A-Z]{2}\s+TITLE| Item Price| PRICE| Sub-Total)/) ||
                 chunk.match(/(\d{4})\s+([A-Z][A-Z-]+)\s+(.+?)\n/));
    if (ymm) {
      unit.year = +ymm[1];
      unit.make = ymm[2].trim();
      unit.model = ymm[3].replace(/\s+/g, ' ').trim();
    }

    // Color & Odometer/Hours:
    const colorM = chunk.match(/\[([A-Z/ ]+?)\]/);
    if (colorM) unit.color = colorM[1].replace(/\s+/g, '').toUpperCase();

    // hours like "914H" (boats)
    const hoursM = chunk.match(/(\d{1,6})\s*H\b/i);
    if (hoursM) unit.hours = +hoursM[1];

    // odometer: number immediately before the [COLOR] or a standalone 4–6 digit line
    if (!unit.hours) {
      if (colorM) {
        const idx = chunk.indexOf(colorM[0]);
        const look = chunk.slice(Math.max(0, idx - 14), idx);
        const odo = look.match(/(\d{4,6})\s*$/);
        if (odo) unit.odometer = +odo[1];
      }
      if (!unit.odometer) {
        const loneOdo = chunk.match(/\n\s*(\d{4,6})\s*\n/);
        if (loneOdo) unit.odometer = +loneOdo[1];
      }
    }

    // Title info (FL TITLE | ME TITLE | OH TITLE /TRL)
    const titleM = chunk.match(/([A-Z]{2})\s+TITLE(?:\s*\/\s*TRL)?/i);
    if (titleM) unit.titleInfo = titleM[0].replace(/\s+/g, ' ').toUpperCase();

    // SALE LOC
    const saleM = (chunk.match(/SALE LOC:\s*([A-Z ]{3,})/i) || pre.match(/SALE LOC:\s*([A-Z ]{3,})/i));
    if (saleM) unit.saleLocation = saleM[1].replace(/\s+/g, ' ').trim();

    // STOCK# may be before VIN
    const stockM = (pre.match(/STOCK#\s*([0-9]{5,})/i) || chunk.match(/STOCK#\s*([0-9]{5,})/i));
    if (stockM) unit.stockNo = stockM[1];

    // AUC# occasionally printed near row header
    const aucM = (pre.match(/\bAUC#\s*([0-9]+)\b/i) || chunk.match(/\bAUC#\s*([0-9]+)\b/i));
    if (aucM) unit.aucNo = aucM[1];

    // Fees — allow for line breaks after the label
    const numFrom = (s?: string) => (s ? parseFloat(s.replace(/[, ]/g, '')) : undefined);
    const priceM = chunk.match(/Item Price:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Item Price:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    const bfeeM  = chunk.match(/Buyer Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Buyer Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    const ofeeM  = chunk.match(/Online Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i) || chunk.match(/Online Fee:\s*\n\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);

    if (priceM) unit.itemPrice  = numFrom(priceM[1]);
    if (bfeeM)  unit.buyerFee   = numFrom(bfeeM[1]);
    if (ofeeM)  unit.onlineFee  = numFrom(ofeeM[1]);

    // Fallback from Sub-Total if present (don’t invent fees; only set itemPrice if all fees missing)
    if (!unit.itemPrice && !unit.buyerFee && !unit.onlineFee) {
      const subM = chunk.match(/Sub-Total\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
      if (subM) unit.itemPrice = numFrom(subM[1]); // you can edit fees later in the Jacket UI
    }

    if (unit.managementFee == null) unit.managementFee = 100;
    out.units.push(unit);
  }

  // Header-level sale location if visible before first VIN
  if (!out.invoiceMeta?.saleLocation) {
    const preHeaderSale = norm.slice(0, matches.length ? (matches[0].index ?? 0) : 2000);
    const headerSale = preHeaderSale.match(/SALE LOC:\s*([A-Z ]{3,})/i);
    if (headerSale) out.invoiceMeta = { ...(out.invoiceMeta || {}), saleLocation: headerSale[1].trim() };
  }

  return out;
}