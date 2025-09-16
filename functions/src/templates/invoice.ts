import type { DocumentData } from "firebase-admin/firestore";
import { fmtUSD, safe, seller } from "../config";

export function renderInvoiceHTML(j: DocumentData, buyer: any) {
  const itm = Number(j.itemPrice||0);
  const buy = Number(j.buyerFee||0);
  const onl = Number(j.onlineFee||0);
  const mgt = Number(j.managementFee||100);
  const total = itm + buy + onl + mgt;

  const invoiceDate = j.invoiceDateDisplay || (j.invoiceDate ? new Date(`${j.invoiceDate}T12:00:00Z`).toLocaleDateString('en-US') : '');

  const left = `${safe(seller.name)}${seller.dba ? " dba " + safe(seller.dba) : ""}<br/>
  ${safe(seller.addr1)}<br/>${safe(seller.addr2)}<br/>${safe(seller.phone)}<br/>${safe(seller.email)}`;

  const right = `${safe(buyer?.name || "")}<br/>
  ${safe(buyer?.line1 || "")}<br/>${safe(buyer?.line2 || "")}<br/>${safe(buyer?.phone || "")}<br/>${safe(buyer?.email || "")}`;

  return `<!doctype html>
<html><head><meta charset="UTF-8">
  <style>
    body{font-family: Arial, Helvetica, sans-serif; color:#111; font-size: 14px; }
    .wrap{width: 780px; margin: 24px auto;}
    .hdr{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;}
    .title{font-size: 32px; font-weight:700; letter-spacing:1px;}
    .box{border:1px solid #ddd; padding:12px; border-radius:6px;}
    table{width:100%; border-collapse:collapse; margin-top:16px;}
    th,td{border:1px solid #e5e5e5; padding:8px; text-align:left;}
    th{background:#f6f6f6; font-weight:600;}
    .totals td{border:none; padding:4px 8px;}
    .right{text-align:right;}
    .muted{color:#666;}
    .label{font-weight:600; color:#444;}
    .vehicle-table td { padding: 10px; vertical-align: top; }
  </style>
</head>
<body><div class="wrap">
  <div class="hdr">
    <div class="title">INVOICE</div>
    <div class="box">
      <div><span class="label">Date:</span> ${invoiceDate || '—'}</div>
      <div><span class="label">Jacket #:</span> ${j.jacketId || '—'}</div>
      <div><span class="label">VIN:</span> ${j.vin || ''}</div>
    </div>
  </div>

  <table style="margin: 0;">
    <thead><tr><th>Seller</th><th>Buyer</th></tr></thead>
    <tbody><tr><td>${left}</td><td>${right}</td></tr></tbody>
  </table>

  <table class="vehicle-table">
    <thead>
      <tr>
        <th>Vehicle</th><th>Color</th><th>Odometer/Hrs</th><th>Sale Location</th><th>Title Info</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${[j.year, j.make, j.model].filter(Boolean).join(' ') || '—'}</td>
        <td>${j.color || '—'}</td>
        <td>${j.odometer || j.hours || '—'}</td>
        <td>${j.saleLocation || '—'}</td>
        <td>${j.titleInfo || '—'}</td>
      </tr>
    </tbody>
  </table>

  <div style="width: 400px; margin-left: auto; margin-top: 16px;">
    <table class="totals">
      <tbody>
        <tr><td>Item Price</td><td class="right">${fmtUSD(itm)}</td></tr>
        <tr><td>Buyer Fee</td><td class="right">${fmtUSD(buy)}</td></tr>
        <tr><td>Online Fee</td><td class="right">${fmtUSD(onl)}</td></tr>
        <tr><td>Management Fee</td><td class="right">${fmtUSD(mgt)}</td></tr>
        <tr style="font-weight:700; font-size: 16px; border-top: 2px solid #333;">
          <td style="padding-top: 8px;">Total Due</td>
          <td class="right" style="padding-top: 8px;">${fmtUSD(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div></body></html>`;
}
