// functions/src/lib/invoice-math.ts
export type MiscFee = { description: string; amount: number; paid: boolean };

export interface InvoiceMathInput {
  itemPrice: number | string | null | undefined;
  buyerFee: number | string | null | undefined;
  onlineFee: number | string | null | undefined;
  managementFee: number | string | null | undefined;
  miscFees: MiscFee[] | null | undefined;
  isAuctionPaid: boolean | null | undefined;
  isMgmtFeePaid: boolean | null | undefined;
}

/** Normalize possibly-null/strings to a non-negative number (floats allowed). */
const nn = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : 0;
};

export function computeInvoiceTotals(input: InvoiceMathInput) {
  const itemPrice      = nn(input.itemPrice);
  const buyerFee       = nn(input.buyerFee);
  const onlineFee      = nn(input.onlineFee);
  const managementFee  = nn(input.managementFee);

  const safeMisc = Array.isArray(input.miscFees) ? input.miscFees : [];

  const miscTotal = safeMisc.reduce((sum, f) => sum + nn(f?.amount), 0);

  // GRAND TOTAL
  const total = itemPrice + buyerFee + onlineFee + managementFee + miscTotal;

  // WHAT'S BEEN PAID
  const auctionPaid = input.isAuctionPaid ? (itemPrice + buyerFee + onlineFee) : 0;
  const mgmtPaid    = input.isMgmtFeePaid ? managementFee : 0;
  const miscPaid    = safeMisc.filter(f => !!f?.paid).reduce((sum, f) => sum + nn(f.amount), 0);

  const amountPaid = auctionPaid + mgmtPaid + miscPaid;

  // Float safety: treat ≤ 0.5 cents as zero
  const rawBalance = total - amountPaid;
  const balanceDue = Math.max(0, Math.round(rawBalance * 100) / 100);
  const isPaid = balanceDue <= 0.0;

  return {
    // inputs normalized
    itemPrice, buyerFee, onlineFee, managementFee,
    miscTotal,
    total,
    auctionPaid, mgmtPaid, miscPaid,
    amountPaid,
    balanceDue,
    isPaid,
  };
}
