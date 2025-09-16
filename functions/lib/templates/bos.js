"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderBoSHTML = renderBoSHTML;
const config_1 = require("../config");
function renderBoSHTML(j, buyer) {
    const total = Number(j.itemPrice || 0) + Number(j.buyerFee || 0) + Number(j.onlineFee || 0) + Number(j.managementFee || 0);
    return `<!doctype html>
<html><head><meta charset="UTF-8"/>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #111; }
  .wrap { max-width: 800px; margin: 24px auto; }
  h1 { margin: 0 0 12px; letter-spacing: 2px; }
  table { width:100%; border-collapse: collapse; margin-top: 18px; }
  th, td { border:1px solid #ddd; padding:8px; font-size: 14px; }
  th { background:#f5f5f5; text-align:left; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>BILL OF SALE</h1>

    <table>
      <tr><th>Seller</th><td>${(0, config_1.safe)(config_1.seller.name)}${config_1.seller.dba ? " dba " + (0, config_1.safe)(config_1.seller.dba) : ""}, ${(0, config_1.safe)(config_1.seller.addr1)}, ${(0, config_1.safe)(config_1.seller.addr2)}</td></tr>
      <tr><th>Buyer</th><td>${(0, config_1.safe)(buyer?.name || "")}, ${(0, config_1.safe)(buyer?.line1 || "")} ${(0, config_1.safe)(buyer?.line2 || "")}</td></tr>
      <tr><th>Vehicle</th><td>${[j.year, j.make, j.model].filter(Boolean).join(" ")} — VIN ${(0, config_1.safe)(j.vin || "")}</td></tr>
      <tr><th>Sale Location</th><td>${(0, config_1.safe)(j.saleLocation || "—")}</td></tr>
      <tr><th>Sale Date</th><td>${(0, config_1.safe)(j.invoiceDateDisplay || "")}</td></tr>
      <tr><th>Amount</th><td>${(0, config_1.fmtUSD)(total)}</td></tr>
    </table>

    <p style="margin-top:12px">Seller hereby sells the vehicle described above to the Buyer. Titles and documents will be provided as applicable.</p>
  </div>
</body></html>`;
}
//# sourceMappingURL=bos.js.map