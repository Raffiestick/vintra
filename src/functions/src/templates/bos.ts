import type { DocumentData } from "firebase-admin/firestore";

export function renderBoSHTML(j: DocumentData, seller: any, buyer: any) {
    const bosDate = j.invoiceDate ? new Date(`${j.invoiceDate}T00:00:00Z`).toLocaleDateString('en-US') : '';
    return `<!doctype html>
<html><head><meta charset="UTF-8">
  <style>
    body{font-family: 'Inter', Arial, sans-serif; color: #111; background-color: #fff; -webkit-print-color-adjust: exact;}
    .wrap{width: 760px; margin: 40px auto; padding: 20px;}
    h1{font-size: 28px; font-weight: 700; color: #17181c; letter-spacing: -0.5px; margin-bottom: 24px;}
    .box{border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px;}
    .box b { font-weight: 600; color: #4a5568;}
    table{width: 100%; border-collapse: collapse; margin-top: 24px;}
    th,td{border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 13px;}
    th{background-color: #f7fafc; font-weight: 600; color: #4a5568;}
    td{color: #2d3748;}
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

  ${j.saleLocation ? `<div class="box" style="margin-top:24px;"><b>Sale Location:</b> ${j.saleLocation}</div>` : '' }
  ${j.titleInfo ? `<div class="box"><b>Title Info:</b> ${j.titleInfo}</div>` : '' }
</div></body></html>`;
}
