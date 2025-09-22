// src/lib/parsers/snippetParser.ts
// No imports from functions/ to keep it browser-safe.
export type ParsedUnit = {
  vinOrHin?: string;
  vin?: string;
  hin?: string;
  year?: number | string;
  make?: string;
  model?: string;
  color?: string;
  odometer?: number | string;
  hours?: number | string;
  lengthFeet?: number | string;
  engine?: string;
  titleInfo?: string;
  saleLocation?: string;
  itemPrice?: number | string;
  buyerFee?: number | string;
  onlineFee?: number | string;
  managementFee?: number | string;
};

const MONEY_RE = /\$([\d,]+(?:\.\d{2})?)/;

export function parseSnippetText(text: string): Partial<ParsedUnit> {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const upper = lines.map(l => l.toUpperCase());
  const data: Partial<ParsedUnit> = { managementFee: 100 };

  // ===== VIN/HIN (More Flexible) =====
  for (const line of upper) {
    // Looks for a line that is purely alphanumeric, at least 10 chars long, and doesn't look like a year.
    if (/^[A-Z0-9]{10,}$/.test(line) && !/^(19|20)\d{2}/.test(line)) {
      data.vinOrHin = line;
      if (line.length === 17) data.vin = line;
      if (line.length === 12) data.hin = line;
      break;
    }
  }

  // ===== Year / Make / Model =====
  for (const line of upper) {
    const m = line.match(/^(\d{4})\s+(.+)$/);
    if (m) {
      data.year = parseInt(m[1], 10);
      const rest = m[2];
      const cutIdx =
        rest.search(/\s\d/) >= 0 ? rest.search(/\s\d/) :
        rest.indexOf(" - ") >= 0 ? rest.indexOf(" - ") :
        rest.indexOf("[") >= 0 ? rest.indexOf("[") :
        -1;

      const head = cutIdx > -1 ? rest.slice(0, cutIdx).trim() : rest.trim();
      const tail = cutIdx > -1 ? rest.slice(cutIdx).trim() : "";
      
      const headWords = head.split(/\s+/);
      if (headWords.length <= 2) {
        data.make = head;
        data.model = tail ? `${tail}`.trim() : "";
      } else {
        data.make = headWords.slice(0, 2).join(" ");
        data.model = headWords.slice(2).join(" ").trim() + (tail ? ` ${tail}` : "");
        data.model = data.model.trim();
      }
      break;
    }
  }

  // ===== Boat Series line: "SERIES L=19/E=1 150HP MERC OB" =====
  for (const line of upper) {
    const m = line.match(/L=(\d+)\s*\/\s*E=(.+)$/);
    if (m) {
      data.lengthFeet = parseInt(m[1], 10);
      data.engine = m[2].trim();
      break;
    }
  }

  // ===== Odometer / Hours + Color lines =====
  for (const line of upper) {
    const m = line.match(/^(\d+)(H)?\s+\[([A-Z\/]+)\]$/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (m[2]) data.hours = val; else data.odometer = val;
      data.color = m[3];
      break;
    }
  }

  // ===== Color-only lines like "UNK [BLK]" =====
  if (!data.color) {
    for (const line of upper) {
      const m = line.match(/\[([A-Z\/]+)\]/);
      if (m) {
        if (/^[A-Z]{2,4}(?:\/[A-Z]{2,4})?$/.test(m[1])) {
          data.color = m[1];
          break;
        }
      }
    }
  }

  // ===== Title Info =====
  for (const line of upper) {
    if (/\bTITLE\b/.test(line) || /\bBOS\b/.test(line) || /\bREPO\b/.test(line)) {
      data.titleInfo = line.replace(/\s+/g, " ").trim();
      break;
    }
  }

  // ===== Sale Location =====
  for (const line of upper) {
    if (line.startsWith("SALE LOC:")) {
      data.saleLocation = line.replace("SALE LOC:", "").trim();
      break;
    }
  }

  // ===== Financials listed BELOW "Sub-Total" =====
  const idx = upper.findIndex(l => /^SUB[-\s]?TOTAL$/.test(l));
  if (idx !== -1) {
    const amounts: number[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const raw = lines[i];
      if (/^[_-]{3,}$/.test(raw.replace(/\s+/g, ""))) break;
      const m = raw.match(MONEY_RE);
      if (m) amounts.push(parseFloat(m[1].replace(/,/g, "")));
      if (amounts.length >= 3) break;
    }
    if (amounts.length) data.itemPrice = amounts[0] ?? undefined;
    if (amounts.length > 1) data.buyerFee = amounts[1] ?? undefined;
    if (amounts.length > 2) data.onlineFee = amounts[2] ?? undefined;
  } else {
    // Fallback: inline search (older format)
    const joined = upper.join(" ");
    const priceMatch = joined.match(/ITEM PRICE:.*?\$([\d,]+(?:\.\d{2})?)/);
    const buyerMatch = joined.match(/BUYER FEE:.*?\$([\d,]+(?:\.\d{2})?)/);
    const onlineMatch = joined.match(/ONLINE FEE:.*?\$([\d,]+(?:\.\d{2})?)/);
    if (priceMatch) data.itemPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (buyerMatch) data.buyerFee = parseFloat(buyerMatch[1].replace(/,/g, ""));
    if (onlineMatch) data.onlineFee = parseFloat(onlineMatch[1].replace(/,/g, ""));
  }

  return data;
}