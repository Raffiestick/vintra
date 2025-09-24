// functions/src/templates/invoice.ts

interface JacketDocument {
  name: string;
  type: string;
  url: string;
}

export interface JacketData {
vin: string; year: number; make: string; model: string; color: string; odometer: number; itemPrice: number;
buyerFee: number; onlineFee: number; managementFee: number;
miscFees: { description: string; amount: number; paid: boolean }[];
isAuctionPaid: boolean; isMgmtFeePaid: boolean;
invoiceId: string; jacketNumber: string; auctionSaleDate: Date | string;
documents?: JacketDocument[];
bodyType?: string;
titleNumber?: string;
titleState?: string;
isElectronicTitle?: boolean;
auctionName?: string;
auctionDealerNo?: string;
saleLocation?: string; // This property was added
}

export interface Company { name: string; dba?: string; line1: string; line2: string; fullAddress?: string; phone: string; email: string; }
export interface Party { name: string; line1: string; line2: string; phone: string; email: string; }

function fmtCurrency(n: number): string {
return (n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(d: Date | string | null | undefined): string {
if (!d) return 'N/A';
const date = new Date(d);
if (isNaN(date.getTime())) return 'N/A';
return date.toLocaleDateString('en-US');
}

export function renderInvoiceHTML(jacketData: JacketData, seller: Company, buyer: Party): string {
const { vin, year, make, model, color, odometer, itemPrice, buyerFee, onlineFee, managementFee, miscFees = [], isAuctionPaid, isMgmtFeePaid, invoiceId, jacketNumber, auctionSaleDate } = jacketData;
const miscTotal = miscFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
const total = (Number(itemPrice)||0) + (Number(buyerFee)||0) + (Number(onlineFee)||0) + (Number(managementFee)||0) + miscTotal;
const auctionPaid = isAuctionPaid ? ((Number(itemPrice)||0) + (Number(buyerFee)||0) + (Number(onlineFee)||0)) : 0;
const mgmtPaid = isMgmtFeePaid ? (Number(managementFee)||0) : 0;
const miscPaid = miscFees.filter(f => !!f.paid).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
const amountPaid = auctionPaid + mgmtPaid + miscPaid;
const balanceDue = Math.max(0, total - amountPaid);
const paidWatermark = balanceDue === 0 ? '<div class="watermark">PAID</div>' : '';
const miscRows = miscFees.map(f => `<tr><td class="desc">${f.description || ''}</td><td class="amt">${fmtCurrency(Number(f.amount)||0)}</td></tr>`).join('');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${invoiceId || ''}</title><style>@page{margin:24mm 16mm}html,body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";color:#111;margin:0;padding:0;font-size:12px}.container{max-width:800px;margin:0 auto;position:relative}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}.brand h1{margin:0;font-size:20px;letter-spacing:.3px}.brand .dba{font-size:12px;color:#333}.brand .contact{font-size:12px;color:#333;margin-top:4px}.doc-title{text-align:right}.doc-title .title{font-size:22px;font-weight:800;margin:0}.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0}.meta .cell{background:#f7f7f7;padding:8px;border:1px solid #e5e5e5;border-radius:4px}.block{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:10px 0 16px}.card{border:1px solid #e5e5e5;border-radius:6px;padding:10px}.card h3{margin:0 0 6px;font-size:13px;letter-spacing:.2px}table.items{width:100%;border-collapse:collapse;margin-top:6px}table.items th,table.items td{border-bottom:1px solid #e5e5e5;padding:8px 6px;vertical-align:top}table.items th{text-align:left;background:#fafafa;font-weight:700}table.items td.amt{text-align:right;white-space:nowrap}.totals{width:40%;margin-left:60%;margin-top:10px;border-collapse:collapse}.totals td{padding:6px}.totals .label{text-align:right}.totals .value{text-align:right;white-space:nowrap}.notice{margin:20px 0 0;font-weight:700;font-size:11px;text-align:center}.footer{text-align:center;font-size:10px;color:#444;margin-top:16px;line-height:1.4;border-top:1px solid #e5e5e5;padding-top:8px}.watermark{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;font-weight:800;color:rgba(0,128,0,0.15);z-index:-1;letter-spacing:10px}.sign-row{display:flex;gap:16px;margin-top:25px}.sign{flex:1}.sign .label{margin-bottom:32px;border-bottom:1px solid #999;height:0}.sign .caption{font-size:11px;color:#333;margin-top:4px}</style></head>
<body><div class="container">${paidWatermark}<div class="header"><div class="brand"><h1>${seller.name}</h1>${seller.dba?`<div class="dba">DBA ${seller.dba}</div>`:""}<div class="contact">${seller.phone} | ${seller.email}</div></div><div class="doc-title"><p class="title">INVOICE</p></div></div><div class="meta"><div class="cell"><strong>Invoice ID:</strong> ${invoiceId}</div><div class="cell"><strong>Jacket #:</strong> ${jacketNumber}</div><div class="cell"><strong>Date:</strong> ${fmtDate(auctionSaleDate)}</div><div class="cell"><strong>VIN:</strong> ${vin}</div><div class="cell"><strong>Vehicle:</strong> ${year} ${make} ${model}</div><div class="cell"><strong>Color / Odometer:</strong> ${color} / ${odometer?.toLocaleString()}</div></div><div class="block"><div class="card"><h3>SOLD FROM</h3><div>${seller.name}</div><div>${seller.line1}</div><div>${seller.line2}</div></div><div class="card"><h3>SOLD TO</h3><div><strong>${buyer.name}</strong></div><div>${buyer.line1}</div><div>${buyer.line2}</div><div>Phone: ${buyer.phone}</div><div>Email: ${buyer.email}</div></div></div><table class="items"><thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead><tbody><tr><td class="desc">Item Price</td><td class="amt">${fmtCurrency(Number(itemPrice)||0)}</td></tr><tr><td class="desc">Buyer Fee</td><td class="amt">${fmtCurrency(Number(buyerFee)||0)}</td></tr><tr><td class="desc">Online Fee</td><td class="amt">${fmtCurrency(Number(onlineFee)||0)}</td></tr><tr><td class="desc">Management Fee</td><td class="amt">${fmtCurrency(Number(managementFee)||0)}</td></tr>${miscRows}</tbody></table><table class="totals"><tr><td class="label"><strong>Total</strong></td><td class="value"><strong>${fmtCurrency(total)}</strong></td></tr><tr><td class="label">Amount Paid</td><td class="value">${fmtCurrency(amountPaid)}</td></tr><tr><td class="label"><strong>Balance Due</strong></td><td class="value"><strong>${fmtCurrency(balanceDue)}</strong></td></tr></table><div class="notice">*This is a Dealer to Dealer Transaction: Authorized Seller and Buyer Signatures are on file.</div><div class="sign-row"><div class="sign"><div class="label"></div><div class="caption">Authorized Seller Signature (Signature on File)</div></div><div class="sign"><div class="label"></div><div class="caption">Authorized Buyer Signature (Signature on File)</div></div></div><div class="footer">RizeUp Ventures, LLC • PO BOX 66741, St Pete Beach, FL 33706 • ${seller.phone} • ${seller.email}<br/>ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES. ALL PAYMENTS MUST BE MADE BY WIRE, PAYABLE TO: RIZEUP VENTURES, LLC.<br/>Unit purchase price and other fees applicable to unit sale are due immediately. A late payment fee of 3% will be applied to any overdue invoice.<br/>If units are not picked up within 7 business days from warehouse, a storage fee will be applied to each unit, per day.</div></div></body></html>`;
return html;
}