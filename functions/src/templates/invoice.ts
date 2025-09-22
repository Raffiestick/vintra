"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmtUSD = void 0;
exports.renderInvoiceHTML = renderInvoiceHTML;
const fmtUSD = (n) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
exports.fmtUSD = fmtUSD;
function renderInvoiceHTML(j, seller, buyer) {
    const item = Number(j.itemPrice || 0), buyerFee = Number(j.buyerFee || 0), online = Number(j.onlineFee || 0), mgmt = Number(j.managementFee || 100);
    const subtotal = item + buyerFee + online + mgmt;
    const invoiceDate = j.invoiceDate ? new Date(`${j.invoiceDate}T00:00:00Z`).toLocaleDateString('en-US') : '';
    return `<!doctype html>
<html><head><meta charset="UTF-8">
  <style>
    body{font-family: Arial, Helvetica, sans-serif; color:#111; }
    .wrap{width: 760px; margin: 20px auto;}
    .hdr{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 16px;}
    .title{font-size: 28px; font-weight:700; letter-spacing:1px;}
    .box{border:1px solid #ddd; padding:12px; border-radius:6px; font-size:14px;}
    table{width:100%; border-collapse:collapse; margin-top:12px;}
    th,td{border:1px solid #e5e5e5; padding:8px; text-align:left; font-size:13px;}
    th{background:#f6f6f6; font-weight:600;}
    .totals td{border:none; padding:4px 0;}
    .right{text-align:right;}
    .muted{color:#666;}
  </style>
</head>
<body><div class="wrap">
  <div class="hdr">
    <div class="title">INVOICE</div>
    <div class="box">
      <div><b>Date:</b> ${invoiceDate || '—'}</div>
      <div><b>Jacket VIN:</b> ${j.vin || ''}</div>
    </div>
  </div>

  <div style="display:flex; gap:12px;">
    <div class="box" style="flex:1">
      <div><b>Seller:</b> ${seller.name}${seller.dba ? ` (${seller.dba})` : ''}</div>
      <div>${seller.addr1}</div><div>${seller.addr2}</div>
      <div>${seller.phone}</div><div class="muted">${seller.email}</div>
    </div>
    <div class="box" style="flex:1">
      <div><b>Buyer:</b> ${buyer.name || '—'}</div>
      ${buyer.line1 ? `<div>${buyer.line1}</div>` : ''}
      ${buyer.line2 ? `<div>${buyer.line2}</div>` : ''}
      ${buyer.phone ? `<div>${buyer.phone}</div>` : ''}
      ${buyer.email ? `<div class="muted">${buyer.email}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Year</th><th>Make</th><th>Model</th><th>VIN</th><th>Color</th><th>Odom/Hrs</th><th>Sale Loc</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${j.year ?? ''}</td>
        <td>${j.make ?? ''}</td>
        <td>${j.model ?? ''}</td>
        <td>${j.vin ?? ''}</td>
        <td>${j.color ?? ''}</td>
        <td>${j.odometer || j.hours || ''}</td>
        <td>${j.saleLocation || ''}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex; gap:12px; margin-top:12px;">
    <div class="box" style="flex:1">
      <table>
        <tbody class="totals">
          <tr><td>Item Price</td><td class="right">${(0, exports.fmtUSD)(item)}</td></tr>
          <tr><td>Buyer Fee</td><td class="right">${(0, exports.fmtUSD)(buyerFee)}</td></tr>
          <tr><td>Online Fee</td><td class="right">${(0, exports.fmtUSD)(online)}</td></tr>
          <tr><td>Management Fee</td><td class="right">${(0, exports.fmtUSD)(mgmt)}</td></tr>
          <tr><td><b>Subtotal</b></td><td class="right"><b>${(0, exports.fmtUSD)(subtotal)}</b></td></tr>
        </tbody>
      </table>
    </div>
    <div class="box" style="flex:1">
      <div class="muted">Notes:</div>
      <div>${j.titleInfo ? `Title: ${j.titleInfo}` : ''}</div>
    </div>
  </div>
</div></body></html>`;
}
