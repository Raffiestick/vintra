import { fmtUSD, safe, seller } from "../config";

export function renderBoSHTML(j: any, buyer: any) {
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
      <tr><th>Seller</th><td>${safe(seller.name)}${seller.dba ? " dba " + safe(seller.dba) : ""}, ${safe(seller.addr1)}, ${safe(seller.addr2)}</td></tr>
      <tr><th>Buyer</th><td>${safe(buyer?.name || "")}, ${safe(buyer?.line1 || "")} ${safe(buyer?.line2 || "")}</td></tr>
      <tr><th>Vehicle</th><td>${[j.year, j.make, j.model].filter(Boolean).join(" ")} — VIN ${safe(j.vin || "")}</td></tr>
      <tr><th>Sale Location</th><td>${safe(j.saleLocation || "—")}</td></tr>
      <tr><th>Sale Date</th><td>${safe(j.invoiceDateDisplay || "")}</td></tr>
      <tr><th>Amount</th><td>${fmtUSD(total)}</td></tr>
    </table>

    <p style="margin-top:12px">Seller hereby sells the vehicle described above to the Buyer. Titles and documents will be provided as applicable.</p>
  </div>
</body></html>`;
}
