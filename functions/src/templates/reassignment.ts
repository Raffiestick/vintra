// functions/src/templates/reassignment.ts

import type { JacketData, Company, Party } from "./invoice";

const fmtCurrency = (n: number): string => (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { timeZone: 'UTC' });
};

export function renderReassignmentHTML(jacketData: JacketData, seller: Company, buyer: Party): string {
  const {
    vin, year, make, model, bodyType, color, odometer, itemPrice, buyerFee,
    onlineFee, managementFee, miscFees = [], auctionSaleDate, titleNumber,
    titleState, saleLocation,
  } = jacketData;

  const total = (Number(itemPrice) || 0) + (Number(buyerFee) || 0) + (Number(onlineFee) || 0) + (Number(managementFee) || 0) + miscFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  
  // Base64 encoded SVG for a cursive "Sarah Krieger" signature
  const signatureSvg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAyMDAgNTAiPjxwYXRoIGQ9Ik0xMCwyNSBTMTUsMTAsMjUsMjUgUzQwLDQwLDUwLDI1IFM2NSwxMCw3NSwyNSBNODAsMjUgUzg1LDQ1LDk1LDI1IFMxMDUsNSwxMTUsMjUgUzEyNSw0NSwxMzUsMjUgUzE0NSwxMCwxNTUsMjUgQzE2NSw0NSwxODAsMTUsMTkwLDM1IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Motor Vehicle Title Reassignment Supplement</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font-family: "Times New Roman", Times, serif; color: #222; font-size: 11px; }
  .doc { border: 1.5px solid #444; padding: 18px 20px; }
  h1 { font-size: 18px; margin: 0; text-transform: uppercase; text-align: center; }
  .subtitle { text-align:center; font-size:10.5px; margin:6px 0 12px; }
  h2 { font-size: 13px; margin: 12px 0 6px; border-bottom: 1px solid #444; padding-bottom: 4px; }
  .table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .table th, .table td { border: 1px solid #777; padding: 6px 8px; vertical-align: middle; }
  .table th { width: 28%; background: #f1f1f1; text-align: left; }
  .row { display:flex; gap:10px; }
  .checks { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  .box { display:inline-block; width:12px; height:12px; border:1px solid #333; margin-right:6px; line-height: 12px; text-align: center; font-weight: bold; }
  .muted { font-size:10.5px; color:#444; }
</style>
</head>
<body>
  <div class="doc">
    <h1>Motor Vehicle Title Reassignment Supplement</h1>
    <div class="subtitle">(Companion to HSMV 82994 Secure Paper — Attach to Original Certificate of Title)</div>
    <h2>Vehicle / Title Information</h2>
    <table class="table">
      <tr><th>VIN</th><td>${vin || ""}</td></tr>
      <tr><th>Year / Make / Model</th><td>${[year, make, model].filter(Boolean).join(" ")}</td></tr>
      <tr><th>Body Type / Color</th><td>${[bodyType, color].filter(Boolean).join(" / ")}</td></tr>
      <tr><th>Odometer Reading</th><td><div class="row"><div>${odometer != null ? Number(odometer).toLocaleString() : ""}</div><div class="checks"><span><span class="box"></span> Actual</span><span><span class="box"></span> Not Actual</span><span><span class="box"></span> Exceeds Mechanical Limits</span></div></div></td></tr>
      <tr><th>Title Number</th><td>${titleNumber || ""}</td></tr>
      <tr><th>State of Issue</th><td>${titleState || ""}</td></tr>
      <tr><th>Is the Title Electronic?</th><td class="checks"><span><span class="box"></span> Yes</span><span><span class="box">X</span> No</span></td></tr>
      <tr><th>Auction Through Which Vehicle Was Sold</th><td>${saleLocation || ""}</td></tr>
    </table>
    <h2>Reassignment by Licensed Dealer</h2>
    <table class="table">
      <tr><th>Seller (Dealer)</th><td>${seller?.name || ""}</td></tr>
      <tr><th>Buyer (Dealer)</th><td>${buyer?.name || ""}</td></tr>
      <tr><th>Date of Transfer</th><td>${fmtDate(auctionSaleDate)}</td></tr>
      <tr><th>Purchase Price</th><td>${fmtCurrency(total)}</td></tr>
    </table>
    <h2>Authorized Signatures</h2>
    <table class="table">
      <tr><th>Seller’s Printed Name & Title</th><td>Sarah Krieger, Authorized Agent</td></tr>
      <tr><th>Seller’s Signature / Date</th><td style="display: flex; align-items: center; gap: 20px;"><img src="${signatureSvg}" alt="Signature" style="height: 25px;" /> ${fmtDate(auctionSaleDate)}</td></tr>
      <tr><th>Buyer’s Printed Name & Title</th><td style="height:24px"></td></tr>
      <tr><th>Buyer’s Signature / Date</th><td style="height:24px"></td></tr>
    </table>
    <h2>Lien Information (if any)</h2>
    <table class="table">
      <tr><th>Status</th><td class="checks"><span><span class="box">X</span> No Lien</span><span><span class="box"></span> Add Lienholder Listed Below</span></td></tr>
      <tr><th>Lienholder Name</th><td></td></tr>
      <tr><th>Lienholder Address</th><td></td></tr>
    </table>
    <p class="muted" style="margin-top:10px">This is a companion printout for recordkeeping and packet clarity. Execute the actual reassignment on Florida secure paper (HSMV 82994 / 82091 as applicable) and staple/attach to the original title.</p>
  </div>
</body>
</html>`;
}