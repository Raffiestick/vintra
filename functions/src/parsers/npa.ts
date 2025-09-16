
import { normalizeIsoFromDateLike } from "../config";

/** Pull exact "DATE: 5/2/2025" from header and normalize to YYYY-MM-DD. */
function pickInvoiceDateFromHeader(text: string): string | null {
  const m = text.match(/DATE:\s*([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})/i);
  if (!m) return null;
  const mm = String(+m[1]).padStart(2, '0');
  const dd = String(+m[2]).padStart(2, '0');
  const yyyy = String(m[3].length === 2 ? 2000 + +m[3] : +m[3]);
  return `${yyyy}-${mm}-${dd}`;
}

function detectUnitType(block: string): 'Boat' | 'Motorcycle' | 'Other' {
  const b = block.toUpperCase();
  if (/HURRICANE|MERC|YAM|NAUTICSTAR|L=\d+|E=\d+|HOURS?\b/.test(b)) return 'Boat';
  if (/HARLEY|HONDA|KAWASAKI|SUZUKI|YAMAHA|ROAD KING|STREET GLIDE|SPORTSTER|FLH|VIN/.test(b)) return 'Motorcycle';
  return 'Other';
}

export function parseNpaInvoiceText(text: string): {
  invoiceDate: string | null;
  invoiceMeta: { aucNo?: string; saleLocation?: string };
  units: any[];
} {
  const out: { invoiceDate: string | null; invoiceMeta: any; units: any[] } =
    { invoiceDate: pickInvoiceDateFromHeader(text), invoiceMeta: {}, units: [] };
  
  const norm = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const VIN_RE = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g;
  const vins = [...norm.matchAll(VIN_RE)];

  for (let i = 0; i < vins.length; i++) {
    const v = vins[i];
    const start = v.index ?? 0;
    const end = i < vins.length - 1 ? (vins[i + 1].index ?? norm.length) : norm.length;
    const chunk = norm.slice(start, end);
    const pre = norm.slice(Math.max(0, start - 320), start + 40); // to catch STOCK# or AUC# placed before VIN
    
    const unit: any = { vin: v[0].toUpperCase() };
    
    // Year / Make / Model
    const ymm = chunk.match(/(?:^|\s)(\d{4})\s+([A-Z][A-Z-]+)\s+([A-Z0-9][A-Z0-9 /()'*\-\.]+?)(?=\s+(?:SALE LOC:|[A-Z]{2}\s+TITLE|Item Price|PRICE|Sub-Total))/);
    if (ymm) {
      unit.year = +ymm[1];
      unit.make = ymm[2];
      unit.model = ymm[3].replace(/\s+/g, ' ').trim();
    }
    
    // Color and Odometer/Hours
    const color = chunk.match(/\[([A-Z/ ]+?)\]/);
    if (color) unit.color = color[1].replace(/\s+/g, "").toUpperCase();

    const hours = chunk.match(/(\d{1,6})\s*H\b/i);
    if (hours) unit.hours = +hours[1];
    else if (color) {
        const idx = chunk.indexOf(color[0]);
        const look = chunk.slice(Math.max(0, idx - 12), idx);
        const odo = look.match(/(\d{4,6})\s*$/);
        if (odo) unit.odometer = +odo[1];
    }
    
    // Boat extras (L=, E=)
    const len = chunk.match(/\bL\s*=\s*([0-9]+)\b/i);
    if (len) unit.length = +len[1];
    const eng = chunk.match(/\bE\s*=\s*([0-9\-A-Z ]+)\b/i);
    if (eng) unit.engine = eng[1].trim();

    // Title info
    const t = chunk.match(/([A-Z]{2})\s+TITLE(?:\s*\/\s*TRL)?/i);
    if (t) unit.titleInfo = t[0].replace(/\s+/g, ' ').toUpperCase();
    
    // Trailer presence
    if (/\/\s*TRL\b|TRAILER\b/i.test(chunk)) unit.hasTrailer = true;

    // Sale location
    const sale = chunk.match(/SALE LOC:\s*([A-Z ]{3,})/i);
    if (sale) unit.saleLocation = sale[1].replace(/\s+/g, ' ').trim();

    // Stock# (may be before VIN)
    const stock = pre.match(/STOCK#\s*(\d{5,})/i) || chunk.match(/STOCK#\s*(\d{5,})/i);
    if (stock) unit.stockNo = stock[1];

    // Fees
    const price = chunk.match(/Item Price:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    const bfee = chunk.match(/Buyer Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    const ofee = chunk.match(/Online Fee:\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (price) unit.itemPrice = parseFloat(price[1].replace(/,/g,""));
    if (bfee) unit.buyerFee = parseFloat(bfee[1].replace(/,/g,""));
    if (ofee) unit.onlineFee = parseFloat(ofee[1].replace(/,/g,""));

    // Auction number for row
    const auc = pre.match(/\bAUC#\s*([0-9]+)\b/i) || chunk.match(/\bAUC#\s*([0-9]+)\b/i);
    if (auc) unit.aucNo = auc[1];
    
    // Default mgmt fee and unit type
    if (unit.managementFee == null) unit.managementFee = 100;
    unit.unitType = detectUnitType(chunk);

    out.units.push(unit);
  }

  // Header sale location if none on unit
  if (!out.invoiceMeta?.saleLocation) {
    const headerSale = norm.match(/SALE LOC:\s*([A-Z ]{3,})/i);
    if (headerSale) out.invoiceMeta.saleLocation = headerSale[1].trim();
  }

  // Normalize header date
  if (out.invoiceDate) out.invoiceDate = normalizeIsoFromDateLike(out.invoiceDate);

  return out;
}
