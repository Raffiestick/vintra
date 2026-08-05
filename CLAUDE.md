# CLAUDE.md — Vintra build instructions

Permanent conventions and non-negotiable business rules for anyone (human or Claude) working in this repository.

## What this is

Vintra is the dealer management system for RizeUp Ventures, LLC — a powersports wholesaler buying units at auction and reselling to dealers. This repo is the **single source of truth**; the other 10 historical repos are frozen references (see `docs/REPO-AUDIT.md`).

Read before building anything:

- `docs/VINTRA_PRD.md` — what to build (Release 1 scope is binding)
- `docs/VINTRA_MIGRATION_PLAN.md` — sequence, target architecture, feature matrix
- `docs/SYSTEM-OVERVIEW.md` — how the legacy Firebase system works
- `docs/legacy/riseup-domain-model.ts` — the proven domain model; schema starting point

## Operating principle (binding)

Do not rebuild working functionality merely to make it stylistically cleaner. First document what works, preserve validated business logic, isolate broken or duplicated implementations, and migrate **one workflow at a time**. Every migration must have acceptance criteria and regression testing before the previous implementation is retired.

## Stack (decided — do not relitigate)

Next.js App Router + TypeScript + Tailwind + shadcn/ui on **Vercel**. Postgres/Auth/Storage on **Supabase** with **RLS as the enforcement layer** — UI role checks are convenience only. PDFs via `@react-pdf/renderer` (no headless browsers). Schema changes only through files in `supabase/migrations/` — never ad-hoc against a live database.

## Non-negotiable business rules

1. **Fees:** management fee defaults to **$100 and is editable per unit/invoice**; online fee defaults to **$0**. Invoice math is the ported `invoice-math` logic — auction charges (item + buyer fee + online fee) settle as one block, management fee settles separately, misc fees settle individually. `balanceDue = max(0, round(total − amountPaid, 2))`.
2. **Invoice footer**, verbatim on every invoice PDF:
   > ALL SALES FINAL. VEHICLES SOLD AS-IS, WHERE-IS. NO RETURNS/EXCHANGES.
   > MAKE PAYABLE TO: RizeUp Ventures, LLC
   > A late payment fee of 2% will be applied to any overdue invoices. If units are not picked up within 10 business days of auction sale, a storage fee of $20 per day will be applied to each unit, per day.
3. **Company identity is configuration, never hardcoded.** ⚠️ Unresolved discrepancy: PRD says `235 Cory Ave. #66471` / `rizeupv@gmail.com`; legacy code says `PO BOX 66741` / `admin@rizeupventures.com`. Confirm with Robert before the first production invoice.
4. **Financial history is append-only.** Credits/adjustments are new entries; voiding an invoice releases its units but never deletes the record. Sensitive actions (approvals, role changes, voids, fee edits, payments) write to `audit_log`.
5. **AI never silently creates financial records.** Extraction always lands in a staging/review screen; a human commits.
6. **Dealers see only their own data**, enforced by RLS policies, not application code.
7. **Documents are private.** Supabase Storage buckets are private; access via short-lived signed URLs minted behind an auth check. Never repeat the legacy bug of signed URLs expiring in 2491.
8. **Units use surrogate primary keys** with a unique index on VIN/HIN — never VIN as PK.
9. **Every table carries `company_id`** (single-tenant today, multi-tenant in Phase 5).

## Conventions

- **Roles:** `super_admin`, `admin`, `staff`, `finance`, `title_clerk`, `dealer`. Internal roles are invite-only; dealers register and await approval.
- Money is `numeric(12,2)` in Postgres; never floats in application math without the rounding guard.
- Validation with zod at every boundary (forms, server actions, AI output).
- Small, single-purpose PRs; Vercel preview per PR; `main` is always deployable.
- Tests required for: invoice math, RLS policies (dealer isolation), any parser, migration transforms. The legacy codebase had zero tests — do not continue that.
- Secrets only in Vercel/Supabase env config. `.env*` is gitignored; committing any credential is a hard failure. This repo is public until flipped private — assume everything committed is world-readable.
- Never commit build output (`.next/`, `functions/lib/`, `.firebase/`) — this bloated the legacy repos to 289 tracked files.

## Legacy Firebase (until cutover)

Firebase project `rizeup-dealer-connect-n6k7r` is the live production system. Do not modify it except for critical fixes. Cutover procedure is in `VINTRA_MIGRATION_PLAN.md`.
