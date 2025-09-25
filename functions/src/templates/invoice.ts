// functions/src/templates/invoice.ts
import type { JacketData, Company, Party } from "../types";
import { Timestamp } from "firebase-admin/firestore";

// ---------- money & math ----------
type MiscFee = { description: string; amount: number; paid: boolean };

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function computeTotals(input: {
  itemPrice?: unknown;
  buyerFee?: unknown;
  onlineFee?: unknown;
  managementFee?: unknown;
  miscFees?: MiscFee[] | null;
  isAuctionPaid?: boolean | null;
  isMgmtFeePaid?: boolean | null;
}) {
  const item = n(input.itemPrice);
  const buyer = n(input.buyerFee);
  const online = n(input.onlineFee);
  const mgmt = n(input.managementFee);
  const misc = Array.isArray(input.miscFees) ? input.miscFees : [];
  const miscTotal = misc.reduce((s, f) => s + n(f?.amount), 0);

  const total = item + buyer + online + mgmt + miscTotal;

  const auctionPaid = input.isAuctionPaid ? item + buyer + online : 0;
  const mgmtPaid = input.isMgmtFeePaid ? mgmt : 0;
  const miscPaid = misc.filter(f => !!f?.paid).reduce((s, f) => s + n(f.amount), 0);

  const amountPaid = auctionPaid + mgmtPaid + miscPaid;
  const balanceDue = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
  const isPaid = balanceDue === 0;

  return { item, buyer, online, mgmt, miscTotal, total, auctionPaid, mgmtPaid, miscPaid, amountPaid, balanceDue, isPaid };
}

// ---------- date helpers ----------
/** Prefer auctionSaleDate, then auctionDate, then invoiceDate. */
function pickInvoiceDate(j: Partial<JacketData> & Record<string, any>) {
  return j?.auctionSaleDate ?? j?.auctionDate ?? j?.invoiceDate ?? null;
}

/** Render Timestamp | Date | ISO | YYYY-MM-DD without TZ drift. */
function fmtDateAny(d: Timestamp | Date | string | null | undefined): string {
  if (!d) return "N/A";

  // Firestore Timestamp
  if (d instanceof Timestamp) {
    return d.toDate().toLocaleDateString("en-US");
  }

  // Date-only string
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`; // MM/DD/YYYY
  }

  // Date or ISO string
  const dt = new Date(d as any);
  if (Number.isNaN(dt.getTime())) return "N/A";
  // Use UTC parts to avoid +/-1 day rendering drift
  const MM = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(dt.getUTCDate()).padStart(2, "0");
  const YY = dt.getUTCFullYear();
  return `${MM}/${DD}/${YY}`;
}

// ---------- tiny utils ----------
const esc = (s: any) =>
  (s ?? "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const usd = (v: unknown) => (n(v)).toLocaleString("en-US", { style: "currency", currency: "USD" });

// ---------- main renderer ----------
export function renderInvoiceHTML(j: JacketData, seller: Company, buyer: Party): string {
  const {
    vin, year, make, model, color, odometer,
    itemPrice, buyerFee, onlineFee, managementFee,
    miscFees = [], isAuctionPaid, isMgmtFeePaid,
    invoiceId, jacketNumber,
  } = (j || {}) as any;

  const t = computeTotals({ itemPrice, buyerFee, onlineFee, managementFee, miscFees, isAuctionPaid, isMgmtFeePaid });
  const watermark = t.isPaid ? '<div class="watermark">PAID</div>' : "";

  const miscRows = (miscFees || [])
    .map((f: MiscFee) =>
      `<tr><td class="desc">${esc(f.description || "")}</td><td class="amt">${usd(f.amount)}</td></tr>`)
    .join("");

  const invoiceDate = fmtDateAny(pickInvoiceDate(j));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Invoice ${esc(invoiceId || "")}</title>
<style>
  @page{margin:24mm 16mm}
  html,body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";color:#111;margin:0;padding:0;font-size:12px}
  .container{max-width:800px;margin:0 auto;position:relative}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
  .brand h1{margin:0;font-size:20px;letter-spacing:.3px}
  .brand .dba{font-size:12px;color:#333}
  .brand .contact{font-size:12px;color:#333;margin-top:4px}
  .doc-title{text-align:right}.doc-title .title{font-size:22px;font-weight:800;margin:0}
  .meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0}
  .meta .cell{background:#f7f7f7;padding:8px;border:1px solid #e5e5e5;border-radius:4px}
  .block{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:10px 0 16px}
  .card{border:1px solid #e5e5e5;border-radius:6px;padding:10px}
  .card h3{margin:0 0 6px;font-size:13px;letter-spacing:.2px}
  table.items{width:100%;border-collapse:collapse;margin-top:6px}
  table.items th,table.items td{border-bottom:1px solid #e5e5e5;padding:8px 6px;vertical-align:top}
  table.items th{text-align:left;background:#fafafa;font-weight:700}
  table.items td.amt{text-align:right;white-space:nowrap}
  .totals{width:40%;margin-left:60%;margin-top:10px;border-collapse:collapse}
  .totals td{padding:6px}.totals .label{text-align:right}.totals .value{text-align:right;white-space:nowrap}
  .notice{margin:20px 0 0;font-weight:700;font-size:11px;text-align:center}
  .footer{text-align:center;font-size:10px;color:#444;margin-top:16px;line-height:1.4;border-top:1px solid #e5e5e5;padding-top:8px}
  .watermark{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;font-weight:800;color:rgba(0,128,0,0.15);z-index:-1;letter-spacing:10px}
  .sign-row{display:flex;gap:16px;margin-top:25px}.sign{flex:1}.sign .label{margin-bottom:32px;border-bottom:1px solid #999;height:0}.sign .caption{font-size:11px;color:#333;margin-top:4px}
</style>
</head>
<body>
  <div class="container">
    ${watermark}
    <div class="header">
      <div class="brand">
        <h1 style="font-weight:800;text-transform:uppercase;">${esc(seller.name || "")}</h1>
        ${ (seller as any).dba ? `<div class="dba">DBA ${esc((seller as any).dba)}</div>` : "" }
        <div class="contact">${esc((seller as any).phone || "")} | ${esc((seller as any).email || "")}</div>
      </div>
      <div class="doc-title"><p class="title">INVOICE</p></div>
    </div>

    <div class="meta">
      <div class="cell"><strong>Invoice ID:</strong> ${esc(invoiceId || "")}</div>
      <div class="cell"><strong>Jacket #:</strong> ${esc(jacketNumber || "")}</div>
      <div class="cell"><strong>Invoice Date:</strong> ${esc(invoiceDate)}</div>
      <div class="cell"><strong>VIN:</strong> ${esc(vin || "")}</div>
      <div class="cell"><strong>Vehicle:</strong> ${esc(year ?? "")} ${esc(make || "")} ${esc(model || "")}</div>
      <div class="cell"><strong>Color / Odometer:</strong> ${esc(color || "")} / ${(Number(odometer) || 0).toLocaleString()}</div>
    </div>

    <div class="block">
      <div class="card">
        <h3>SOLD FROM</h3>
        <div><strong>${esc(((seller as any).name || "").toUpperCase())}</strong></div>
        <div>${esc((seller as any).line1 || "")}</div>
        <div>${esc((seller as any).line2 || "")}</div>
      </div>
      <div class="card">
        <h3>SOLD TO</h3>
        <div><strong>${esc(buyer.name || "")}</strong></div>
        <div>${esc(buyer.line1 || "")}</div>
        <div>${esc(buyer.line2 || "")}</div>
        <div>Phone: ${esc(buyer.phone || "")}</div>
        <div>Email: ${esc(buyer.email || "")}</div>
      </div>
    </div>

    <table class="items">
      <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
      <tbody>
        <tr><td class="desc">Item Price</td><td class="amt">${usd(t.item)}</td></tr>
        <tr><td class="desc">Buyer Fee</td><td class="amt">${usd(t.buyer)}</td></tr>
        <tr><td class="desc">Online Fee</td><td class="amt">${usd(t.online)}</td></tr>
        <tr><td class="desc">Management Fee</td><td class="amt">${usd(t.mgmt)}</td></tr>
        ${miscRows}
      </tbody>
    </table>

    <table class="totals">
      <tr><td class="label"><strong>Total</strong></td><td class="value"><strong>${usd(t.total)}</strong></td></tr>
      <tr><td class="label">Amount Paid</td><td class="value">${usd(t.amountPaid)}</td></tr>
      <tr><td class="label"><strong>Balance Due</strong></td><td class="value"><strong>${usd(t.balanceDue)}</strong></td></tr>
    </table>

    <div class="notice">*This is a Dealer to Dealer Transaction: Authorized Seller and Buyer Signatures are on file.</div>

    <div class="sign-row">
      <div class="sign"><div class="label"></div><div class="caption">Authorized Seller Signature (Signature on File)</div></div>
      <div class="sign"><div class="label"></div><div class="caption">Authorized Buyer Signature (Signature on File)</div></div>
    </div>

    <div class="footer">
      RIZEUP VENTURES, LLC • PO BOX 66741, ST PETE BEACH, FL 33706 • ${esc((seller as any).phone || "616-318-1991")} • ${esc((seller as any).email || "ADMIN@RIZEUPVENTURES.COM")}<br/>
      ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES. ALL PAYMENTS MUST BE MADE BY WIRE, PAYABLE TO: RIZEUP VENTURES, LLC.<br/>
      Unit purchase price and other fees applicable to unit sale are due immediately. A late payment fee of 3% will be applied to any overdue invoice.<br/>
      If units are not picked up within 7 business days from warehouse, a storage fee will be applied to each unit, per day.
    </div>
  </div>
</body>
</html>`;
}
