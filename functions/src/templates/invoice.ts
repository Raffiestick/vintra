import { fmtUSD, safe, seller } from "../config";

export function renderInvoiceHTML(j: any, buyer: any) {
  const itm = Number(j.itemPrice || 0);
  const buy = Number(j.buyerFee || 0);
  const onl = Number(j.onlineFee || 0);
  const mgt = Number(j.managementFee || 0);
  const total = itm + buy + onl + mgt;

  const left = `${safe(seller.name)}${seller.dba ? " dba " + safe(seller.dba) : ""}<br/>
  ${safe(seller.addr1)}<br/>${safe(seller.addr2)}<br/>${safe(seller.phone)}<br/>${safe(seller.email)}`;

  const right = `${safe(buyer?.name || "")}<br/>
  ${safe(buyer?.line1 || "")}<br/>${safe(buyer?.line2 || "")}<br/>${safe(buyer?.phone || "")}<br/>${safe(buyer?.email || "")}`;

  return `<!doctype html>
<html><head><meta charset="UTF-8"/>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111; }
  .wrap { max-width: 800px; margin: 24px auto; }
  .hdr { display:flex; justify-content:space-between; align-items:flex-start; }
  h1 { margin: 0 0 8px; letter-spacing: 2px; }
  .muted { color:#666; }
  table { width:100%; border-collapse: collapse; margin-top: 18px; }
  th, td { border:1px solid #ddd; padding:8px; font-size: 14px; }
  th { background:#f5f5f5; text-align:left; }
  .right { text-align:right; }
  .totals { margin-top:12px; width: 320px; margin-left:auto; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div>
        <h1>INVOICE</h1>
        <div class="muted">Jacket: ${safe(j.jacketId || "")}</div>
        <div class="muted">VIN: ${safe(j.vin || "")}</div>
        <div class="muted">Auction Date: ${safe(j.invoiceDateDisplay || "")}</div>
      </div>
      <div></div>
    </div>

    <table>
      <tr><th>Seller</th><th>Buyer</th></tr>
      <tr><td>${left}</td><td>${right}</td></tr>
    </table>

    <table>
      <tr>
        <th>Vehicle</th><th>Title</th><th>Sale Location</th><th class="right">Item</th>
      </tr>
      <tr>
        <td>${[j.year, j.make, j.model].filter(Boolean).join(" ")}<br/>
            Color: ${safe(j.color || "—")} • Odometer/Hrs: ${safe(String(j.odometer || j.hours || "—"))}</td>
        <td>${safe(j.titleInfo || "—")}</td>
        <td>${safe(j.saleLocation || "—")}</td>
        <td class="right">${fmtUSD(itm)}</td>
      </tr>
    </table>

    <table class="totals">
      <tr><th>Buyer Fee</th><td class="right">${fmtUSD(buy)}</td></tr>
      <tr><th>Online Fee</th><td class="right">${fmtUSD(onl)}</td></tr>
      <tr><th>Management Fee</th><td class="right">${fmtUSD(mgt)}</td></tr>
      <tr><th>Total</th><td class="right"><strong>${fmtUSD(total)}</strong></td></tr>
    </table>
  </div>
</body></html>`;
}
