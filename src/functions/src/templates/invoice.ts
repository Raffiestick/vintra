import type { DocumentData } from "firebase-admin/firestore";

export const fmtUSD = (n: number) => (n || 0).toLocaleString("en-US",{style:"currency",currency:"USD"});

export function renderInvoiceHTML(j: DocumentData, seller: any, buyer: any) {
  const item = Number(j.itemPrice||0), buyerFee = Number(j.buyerFee||0), online = Number(j.onlineFee||0), mgmt = Number(j.managementFee||100);
  const subtotal = item + buyerFee + online + mgmt;

  const invoiceDate = j.invoiceDate ? new Date(`${j.invoiceDate}T00:00:00Z`).toLocaleDateString('en-US') : '';

  return `<!doctype html>
<html><head><meta charset="UTF-8">
  <style>
    body{font-family: 'Inter', Arial, sans-serif; color:#111; background-color: #fff; -webkit-print-color-adjust: exact;}
    .wrap{width: 760px; margin: 40px auto; padding: 20px;}
    .hdr{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px;}
    .title{font-size: 32px; font-weight: 700; color: #17181c; letter-spacing: -0.5px;}
    .box{border:1px solid #e2e8f0; padding:12px 16px; border-radius: 8px; font-size:14px;}
    table{width:100%; border-collapse:collapse; margin-top:24px;}
    th,td{border:1px solid #e2e8f0; padding:10px 12px; text-align:left; font-size:13px;}
    th{background-color: #f7fafc; font-weight:600; color: #4a5568;}
    td{color: #2d3748;}
    .totals td{border:none; padding:6px 0;}
    .right{text-align:right;}
    .muted{color:#718096;}
    .address-box { flex:1; line-height: 1.6; }
    .address-box b { color: #2d3748; }
  </style>
</head>
<body><div class="wrap">
  <div class="hdr">
    <div class="title">INVOICE</div>
    <div class="box" style="min-width:220px; text-align:right;">
      <div><b>Date:</b> ${invoiceDate || '—'}</div>
      <div><b>Jacket VIN:</b> ${j.vin || ''}</div>
    </div>
  </div>

  <div style="display:flex; gap:16px;">
    <div class="box address-box">
      <div><b>Seller:</b> ${seller.name}${seller.dba ? ` (${seller.dba})` : ''}</div>
      <div>${seller.addr1}</div><div>${seller.addr2}</div>
      <div>${seller.phone}</div><div class="muted">${seller.email}</div>
    </div>
    <div class="box address-box">
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

  <div style="display:flex; gap:16px; margin-top:24px;">
    <div class="box" style="flex:1">
      <table style="margin-top:0;">
        <tbody class="totals">
          <tr><td>Item Price</td><td class="right">${fmtUSD(item)}</td></tr>
          <tr><td>Buyer Fee</td><td class="right">${fmtUSD(buyerFee)}</td></tr>
          <tr><td>Online Fee</td><td class="right">${fmtUSD(online)}</td></tr>
          <tr><td>Management Fee</td><td class="right">${fmtUSD(mgmt)}</td></tr>
          <tr style="border-top: 1px solid #e2e8f0;"><td style="padding-top:12px;"><b>Subtotal</b></td><td class="right" style="padding-top:12px;"><b>${fmtUSD(subtotal)}</b></td></tr>
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
