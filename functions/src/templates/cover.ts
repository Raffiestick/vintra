// functions/src/templates/cover.ts

import type { JacketData, Company } from "./invoice";

export function renderCoverHTML(jacketData: JacketData, seller: Company): string {
  const { jacketNumber, year, make, model, vin } = jacketData;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>RizeUp Ventures Dealer Jacket</title>
  <style>
    @page { margin: 24mm 16mm; }
    html, body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111; margin: 0; padding: 0; font-size: 12px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 25px; }
    .header .title { font-size: 22px; font-weight: 800; letter-spacing: 0.4px; margin: 0; }
    .subtitle { font-size: 12px; color: #333; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
    .cell { background: #f7f7f7; padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; }
    .label { font-size: 11px; color: #444; letter-spacing: 0.4px; text-transform: uppercase; }
    .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .list { margin-top: 30px; }
    .list h3 { margin: 0 0 8px; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .list ul { margin: 0 0 0 20px; padding: 0; }
    .list li { margin-bottom: 5px; }
    .footer { text-align: center; font-size: 10px; color: #444; margin-top: 40px; line-height: 1.4; border-top: 1px solid #e5e5e5; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">RIZEUP VENTURES DEALER JACKET</div>
      <div class="subtitle">Professional packet for your records</div>
    </div>
    <div class="grid">
      <div class="cell"><div class="label">JACKET NUMBER</div><div class="value">${jacketNumber}</div></div>
      <div class="cell"><div class="label">VEHICLE</div><div class="value">${year} ${make} ${model}</div></div>
      <div class="cell"><div class="label">VIN</div><div class="value">${vin}</div></div>
    </div>
    <div class="list">
      <h3>JACKET INCLUDES</h3>
      <ul><li>Invoice</li><li>Bill of Sale</li></ul>
    </div>
    <div class="footer">
      ${seller.name} • ${seller.line1}, ${seller.line2}<br/>
      ${seller.phone} • ${seller.email}<br/>
      ALL SALES FINAL. ALL UNITS ARE SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES.<br/>
      ALL PAYMENTS MUST BE MADE BY WIRE, PAYABLE TO: RIZEUP VENTURES, LLC.
    </div>
  </div>
</body>
</html>`;
  return html;
}