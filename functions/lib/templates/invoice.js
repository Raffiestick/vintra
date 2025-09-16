"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInvoiceHTML = renderInvoiceHTML;
const config_1 = require("../config");
function renderInvoiceHTML(j, buyer) {
    const itm = Number(j.itemPrice || 0);
    const buy = Number(j.buyerFee || 0);
    const onl = Number(j.onlineFee || 0);
    const mgt = Number(j.managementFee || 0);
    const total = itm + buy + onl + mgt;
    const left = `${(0, config_1.safe)(config_1.seller.name)}${config_1.seller.dba ? " dba " + (0, config_1.safe)(config_1.seller.dba) : ""}<br/>
  ${(0, config_1.safe)(config_1.seller.addr1)}<br/>${(0, config_1.safe)(config_1.seller.addr2)}<br/>${(0, config_1.safe)(config_1.seller.phone)}<br/>${(0, config_1.safe)(config_1.seller.email)}`;
    const right = `${(0, config_1.safe)(buyer?.name || "")}<br/>
  ${(0, config_1.safe)(buyer?.line1 || "")}<br/>${(0, config_1.safe)(buyer?.line2 || "")}<br/>${(0, config_1.safe)(buyer?.phone || "")}<br/>${(0, config_1.safe)(buyer?.email || "")}`;
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
        <div class="muted">Jacket: ${(0, config_1.safe)(j.jacketId || "")}</div>
        <div class="muted">VIN: ${(0, config_1.safe)(j.vin || "")}</div>
        <div class="muted">Auction Date: ${(0, config_1.safe)(j.invoiceDateDisplay || "")}</div>
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
            Color: ${(0, config_1.safe)(j.color || "—")} • Odometer/Hrs: ${(0, config_1.safe)(String(j.odometer || j.hours || "—"))}</td>
        <td>${(0, config_1.safe)(j.titleInfo || "—")}</td>
        <td>${(0, config_1.safe)(j.saleLocation || "—")}</td>
        <td class="right">${(0, config_1.fmtUSD)(itm)}</td>
      </tr>
    </table>

    <table class="totals">
      <tr><th>Buyer Fee</th><td class="right">${(0, config_1.fmtUSD)(buy)}</td></tr>
      <tr><th>Online Fee</th><td class="right">${(0, config_1.fmtUSD)(onl)}</td></tr>
      <tr><th>Management Fee</th><td class="right">${(0, config_1.fmtUSD)(mgt)}</td></tr>
      <tr><th>Total</th><td class="right"><strong>${(0, config_1.fmtUSD)(total)}</strong></td></tr>
    </table>
  </div>
</body></html>`;
}
//# sourceMappingURL=invoice.js.map