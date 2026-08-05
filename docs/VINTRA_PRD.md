# Vintra — Recovery, Migration & Relaunch PRD

**Status:** Authoritative product brief for the rebuild
**Date:** 2026-08-05
**Owner:** Robert Raff, RizeUp Ventures, LLC

| Fact | Value |
|---|---|
| App name | **Vintra** |
| Repository | **`Raffiestick/VintraOS`** (private) |
| Live domain | **https://vintra.app** (points to Vercel at cutover) |
| Initial Super Admin | Robert Raff — robert.raff@me.com |
| Primary auction source | National Powersport Auctions (NPA), buyer #128011 |

This document defines product behavior and requirements. It distinguishes three things:

1. **What already exists** — see `SYSTEM-OVERVIEW.md` and the feature matrix in `VINTRA_MIGRATION_PLAN.md`
2. **What must work for RizeUp immediately** — Release 1, defined below
3. **What belongs in later versions** — Phases 2–5, defined at the end

## Objective

Consolidate Vintra into one stable production repository, migrate the operational backend to Supabase, deploy through Vercel, preserve usable functionality from the existing builds, and launch the smallest complete version RizeUp Ventures can use daily.

## Release 1 scope

The complete operational cycle:

**Dealer onboarding → inventory acquisition → unit assignment → invoicing → payment tracking → title/document management**

That is enough to make the app useful to the company now. AI-powered intake, automation, and SaaS features are explicitly deferred (Phases 3–5).

---

## Release 1 modules

### 1. Authentication and permissions

Roles:

- Super Admin
- Admin
- Operations/Staff
- Finance
- Title Clerk
- Dealer

Requirements:

- Secure login (Supabase Auth, email/password)
- Invite-based internal users — internal roles are never self-service
- Dealer registration and approval workflow (register → pending → approved/rejected)
- Role-based routes in the app
- Row-Level Security in Supabase as the actual enforcement layer — UI checks are convenience only
- Suspend, reactivate, reject and archive users
- Audit trail for sensitive actions (approvals, role changes, invoice voids, fee edits, payments)

> Prior art: `riseup-app-v2` had 5 roles with role-based dashboards; the current build collapsed to admin/dealer custom claims. This release restores the full role model, adding Super Admin.

### 2. Dealer management

Each dealer profile contains:

- Legal business name, DBA
- Contact name, email, phone
- Business address, mailing address
- Dealer type
- Documents: resale certificate, government ID, W-9, dealer agreement
- Approval status, account status
- Internal notes
- Assigned units, open invoices, balance due
- Document expiration dates (drive alerts — see module 7)

### 3. Purchase-order intake

Admins can:

- Upload auction invoices and purchase orders (PDF, image, multi-page; multiple units per invoice)
- The original document is always preserved in Storage and linked to everything created from it
- Extract line items using AI *(Phase 3 — Release 1 ships manual entry with the same review screen)*
- Review extracted/entered units before committing them; correct mistakes
- Prevent duplicate imports (same auction invoice number / same VIN warnings)
- Every created unit is attached to its source purchase order

> Prior art: the staging → review → commit flow in the current build (`stagingInvoices` → `processStagedUnit`) is the correct shape and carries over. The NPA regex parser is Phase 3 input, not Release 1.

**Reference input:** real NPA invoices are preserved in `docs/samples/` (VintraOS repo). Confirmed intake fields per line item — AUC# (with ONLINE/SCAST sale channel), STOCK#, VIN, year/make/model, mileage [color], sale location, title info (e.g. `MI TITLE`, `IN REPO TITLE`, `WI TITLE`, `BOS ONLY`), item price, buyer fee, online fee, per-unit sub-total. Invoice-level: invoice number, date, buyer number, adjustments, tax, doc/license/other fees, total due, and an alert line for title signing instructions (e.g. "SIGN TITLES: DOLPHIN CHASERS BOAT RENTALS LLC"). The manual-entry form and the Phase 3 extraction schema must both cover exactly this field set.

### 4. Dynamic inventory

Common fields for every unit:

- Internal unit ID (surrogate key — **not** the VIN; VIN gets a unique index)
- Source purchase order
- Unit type
- VIN, HIN or serial number
- Year, make, model, trim, color, description
- Item cost, buyer fee, online fee (**default $0**), management fee (**default $100, editable**)
- Total acquisition cost (computed)
- Sale location
- Mileage, hours
- Title type, title status
- Assigned dealer, invoice linkage
- Inventory status
- Created and updated timestamps

Dynamic fields appear by unit type: Motorcycle, ATV/UTV, Boat/PWC, RV, Trailer, Golf cart, E-bike, Other.
(Boats: length, engines with hours per engine — see `docs/legacy/riseup-domain-model.ts` for the proven field set.)

Assignment choices: **Not Assigned · In-House · Approved dealer**

Admins can: edit a unit, reassign it, archive it, attach documents, correct fees, and view its complete timeline (audit trail of every change).

### 5. Invoice management

Vintra shall:

- Generate invoices from assigned, unbilled units
- Allow invoice review before creation
- Include editable management fees; default optional online fees to $0
- Generate a professional PDF
- Mark included inventory as billed
- Support **paid, unpaid, overdue, voided** statuses
- Void an invoice and release its units back to unbilled
- Edit due dates and notes
- Record sent date, payment date and method
- Add credits or adjustments as new line entries — never mutate historical records

Company block on every invoice:

```
RizeUp Ventures, LLC
Wholesale Powersport Dealer
PO Box 66741
St Pete Beach, FL 33706
Phone: 616-318-1991
Email: rizeupv@gmail.com
```

> ✅ **Confirmed by Robert 2026-08-05** (resolves the earlier discrepancy — PO Box 66741 is correct; the email is `rizeupv@gmail.com`, replacing the legacy `admin@rizeupventures.com`). The company block is **configuration, not hardcode**.

**Reference output:** invoice `11-0001` to Pulse Powersports (`docs/samples/` in the VintraOS repo) is the approved format. The generated PDF must match it:

- **Invoice number** format `11-0001` (sequential)
- Header fields: invoice no, invoice date, due date, **payment terms** (e.g. "BANK WIRE - DUE TODAY")
- **Reference line** citing the source auction invoice number(s) and freight bill(s), plus pickup notes
- Line items of two kinds: **vehicles** (VIN, year/make/model, mileage/color, sale location, single unit sub-total) and **fee lines** (e.g. transport fee, tied to a VIN)
- Subtotal · Sales tax · Total due
- **Payment instructions** block: bank wire only, payable to RizeUp Ventures, LLC; wire instructions provided separately for security
- **Terms and conditions** (verbatim from the approved invoice):

> **Late payment:** A fee equal to 4% of the total invoice will be assessed after 3 calendar days if the invoice remains unpaid.
> **Storage:** Each vehicle includes a 10-day pickup grace period. After the grace period, storage is charged at $100 per vehicle, per day.
> **Title delivery:** Titles will be properly executed within 3 business days after receipt by RizeUp Ventures, LLC and mailed to the buyer address on file.
> **Final sale:** ALL SALES ARE FINAL. VEHICLES ARE SOLD AS-IS, WHERE-IS. NO RETURNS OR EXCHANGES.

> Historical note: the legacy app's footer (2% late fee, $20/day storage) was copied from **NPA's own invoice footer** — those were NPA's terms toward RizeUp, not RizeUp's terms toward dealers. Do not resurrect them.

Invoice math carries over from `functions/src/lib/invoice-math.ts` (validated logic):

```
total      = itemPrice + buyerFee + onlineFee + managementFee + Σ miscFees
amountPaid = (auction settled ? itemPrice+buyerFee+onlineFee : 0)
           + (mgmt fee settled ? managementFee : 0)
           + Σ (misc fees settled individually)
balanceDue = max(0, round(total − amountPaid, 2))
```

### 6. Dealer portal

Dealers see only their own information — enforced by RLS, not by the UI.

Dashboard: total outstanding, overdue balance, paid invoices, assigned units, units awaiting invoice, recent activity, document alerts, support access.

Invoices: view invoice and line items, download/print PDF, see due date and payment status.

Inventory: search VIN/HIN, view assigned units, see invoice association, title status, pickup/delivery status.

### 7. Title and document management

**In Release 1 — not postponed.**

Per unit: title status, title received date, title holder/name, original-title location, BOS status, MSO status, missing-document alerts, dealer delivery status, tracking number, notes, uploaded scans.

Title Clerk dashboard: titles missing · received but unprocessed · ready to mail · mailed · dealer documents expiring · units blocked by missing paperwork.

> Prior art: `riseup` had title management and a title-status report; the current build lost this. The title lifecycle in `docs/legacy/riseup-domain-model.ts` (Pending From Auction → Received → Transferred/Sent To Buyer, plus Problem/NA) is the starting model.

### 8. Payment tracking

Manual in Release 1. Capture: invoice, amount, payment date, method, reference number, notes, entered by, full/partial flag, remaining balance (computed).

Methods: ACH, Wire, Check, Cash, Credit card, Other.

Online payments and accounting integrations follow later (Phase 4).

### 9. Reporting

Release 1 reports: available inventory · assigned inventory · in-house inventory · unbilled units · open receivables · overdue invoices · payments received · acquisition cost by date · management-fee revenue · gross amount billed · titles outstanding · dealer balances · inventory aging.

These are Postgres views/queries with date-range filters and CSV export — not a BI platform.

---

## AI processing principle (applies whenever AI intake ships)

AI extraction runs as a controlled backend job:

1. Upload source file → 2. create processing record → 3. extract text/image content → 4. structured extraction request → 5. validate response against a schema → 6. human-review screen → 7. commit approved units.

**AI never silently creates final financial records without review.**

---

## Later phases

| Phase | Contents |
|---|---|
| **2 — Documents & titles, deepened** | Registration documents, expanded title workflows, missing-document and expiration alerts, dealer document portal |
| **3 — AI intake** | Automated PO parsing, confidence scoring, human review, duplicate detection, unit-type classification, dynamic extracted fields |
| **4 — Automation** | Transactional email, invoice delivery, payment reminders, document reminders, scheduled reports, accounting integrations |
| **5 — Commercial SaaS** | Multi-company tenancy, subscriptions, usage limits, white labeling, enterprise permissions, marketplace integrations |

Phase 5 is why Release 1 tables carry a `company_id` from day one even though only one company exists — retrofitting tenancy is far more expensive than carrying one column.
