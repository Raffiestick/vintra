
import type { DocumentData } from "firebase-admin/firestore";
export function renderBoSHTML(j: DocumentData, seller: any, buyer: any) {
  const bosDate = j.invoiceDate ? new Date(`${j.invoiceDate}T00:00:00Z`).toLocaleDateString('en-US') : '';
  return `<!doctype html>
<html><head><meta charset="UTF-8">
  <style>
    body{font-family: Arial, Helvetica, sans-serif; color:#111;}
    .wrap{width:760px; margin:20px auto;}
    h1{font-size:26px; letter-spacing:1px;}
    .box{border:1px solid #ddd; padding:12px; border-radius:6px; font-size:14px; margin-bottom:12px;}
    table{width:100%; border-collapse:collapse; margin-top:8px;}
    th,td{border:1px solid #e5e5e5; padding:8px; text-align:left; font-size:13px;}
    th{background:#f6f6f6; font-weight:600;}
  </style>
</head>
<body><div class="wrap">
  <h1>Bill of Sale</h1>
  <div class="box"><b>Date:</b> ${bosDate || '—'}</div>
  <div class="box"><b>Seller:</b> ${seller.name}${seller.dba ? ` (${seller.dba})` : ''}</div>
  <div class="box"><b>Buyer:</b> ${buyer.name || '—'}</div>

  <table>
    <thead><tr><th>Year</th><th>Make</th><th>Model</th><th>VIN</th><th>Color</th><th>Odom/Hrs</th></tr></thead>
    <tbody><tr>
      <td>${j.year ?? ''}</td><td>${j.make ?? ''}</td><td>${j.model ?? ''}</td>
      <td>${j.vin ?? ''}</td><td>${j.color ?? ''}</td><td>${j.odometer || j.hours || ''}</td>
    </tr></tbody>
  </table>

  ${j.saleLocation ? `<div class="box"><b>Sale Location:</b> ${j.saleLocation}</div>` : '' }
  ${j.titleInfo ? `<div class="box"><b>Title Info:</b> ${j.titleInfo}</div>` : '' }
</div></body></html>`;
}
