// functions/src/parsers/npa.ts
import { pickInvoiceDateFromHeader } from "../config";
import type { JacketUnit } from "../models/jacket";

// This regex finds lines that are LIKELY a VIN, HIN, or other unique ID.
const ID_RE = /^(?![0-9]{5,8}$)(?=[A-Z0-9-]{12,18}$)[A-Z0-9-]+$/;

// This regex finds the year, make, and model on a single line.
const YMM_RE = /^(\d{4})\s+([A-Z][A-Z\s\-]+?)\s{2,}(.+)$/;

export function parseNpaInvoiceText(text: string): {
  invoiceDate?: string | null;
  units: Partial<JacketUnit>[];
} {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let currentUnit: Partial<JacketUnit> | null = null;
  const units: Partial<JacketUnit>[] = [];

  for (const line of lines) {
    // Check if the line is a vehicle identifier
    if (ID_RE.test(line)) {
      // If we were already building a unit, save it before starting a new one.
      if (currentUnit) {
        units.push(currentUnit);
      }
      // Start a new unit
      currentUnit = { vinOrHin: line };
      if (line.length === 17) currentUnit.vin = line;
      if (line.length === 12) currentUnit.hin = line;
      continue;
    }

    // If we haven't found the first vehicle yet, skip until we do.
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
      currentUnit.odometer = parseInt(odoColorMatch[1], 10);
      currentUnit.color = odoColorMatch[2];
      continue;
    }

    // --- Check for Title Info ---
    const titleMatch = line.match(/^(AZ TITLE|BOS ONLY|FL TITLE|FL REPO TITLE|SC TITLE|ME TITLE|BOS)$/);
    if (titleMatch) {
      currentUnit.titleInfo = titleMatch[1];
      continue;
    }

    // --- Check for Fees ---
    const feeMatch = line.match(/^(Item Price|Buyer Fee|Online Fee):\s*\$?([\d,]+\.\d{2})$/);
    if (feeMatch) {
        const feeName = feeMatch[1];
        const amount = parseFloat(feeMatch[2].replace(/,/g, ''));
        if (feeName === 'Item Price') currentUnit.itemPrice = amount;
        if (feeName === 'Buyer Fee') currentUnit.buyerFee = amount;
        if (feeName === 'Online Fee') currentUnit.onlineFee = amount;
        continue;
    }
  }

  // Add the last processed unit to the array
  if (currentUnit) {
    units.push(currentUnit);
  }
  
  return {
    invoiceDate: pickInvoiceDateFromHeader(text),
    units,
  };
}