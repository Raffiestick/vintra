# Vintra — Migration Plan: Firebase → Supabase + Vercel

**Date:** 2026-08-05
**Companion to:** `VINTRA_PRD.md` (what to build) and `/CLAUDE.md` (how to build)

---

## Phase 0 — Recovery and architecture ✅ COMPLETE

Done in commit `a9dabda` on this branch. Summary (full detail in `REPO-AUDIT.md`):

- All 11 repositories audited; three lineages identified, four repos empty/dead
- Canonical source: **`rizeup-dealer-connect/main`** (580 commits, strict superset of `vintra`) — consolidated into the `vintra` repo with full history
- Build artifacts stripped (289 → 164 tracked files), `.gitignore` fixed
- Legacy specs and the `riseup` domain model preserved in `docs/legacy/`
- `next build` and functions `tsc` verified passing
- Security sweep: no real credentials in any repo or history

### Repository classification

| Repo | Classification | Notes |
|---|---|---|
| `vintra` | **Canonical** (this repo) | Now carries dealer-connect history + docs |
| `rizeup-dealer-connect` | Merged → freeze read-only | History preserved here |
| `riseup` | **Feature donor** | Domain model, title mgmt, 7 report types |
| `riseup-app-v2` | **Feature donor** | 5-role model, role dashboards, approvals |
| `jacketmaster` | Historical reference | PDF/jacket spec; freeze |
| `rizeup-dealer-hub` | Broken/obsolete | Auth debugging dead-end; freeze |
| `rizeup-crm` | Broken/obsolete | 4-commit scaffold; freeze |
| `rize-portal`, `vintra-invoice`, `rize-dealer`, `rize-v3` | Delete | Empty or single junk file |

### Feature matrix — where each Release 1 module lives today

| PRD module | Best existing implementation | State | Carries over |
|---|---|---|---|
| Auth & roles (6 roles) | `riseup-app-v2` (5 roles) / current build (2 claims) | Partial | Role list + approval flow shape; rebuilt on Supabase Auth + RLS |
| Dealer management | Current build (`users`, approval, dealer profile, tax cert) | Working | Flow shape; expanded fields per PRD §2 |
| PO intake (manual + review) | Current build (`stagingInvoices` → review → commit) | **Working** | Workflow shape carries over directly |
| PO intake (AI parsing) | Current build (`parsers/npa.ts`, Gemini flows) | Brittle | Phase 3 input only |
| Dynamic inventory | `riseup` (`InventoryItem`, unit types, dispositions) | Working (old stack) | Domain model → Supabase schema |
| Invoice math | Current build (`invoice-math.ts`) | **Working, clean** | Verbatim port + unit tests |
| Invoice PDF | Current build (Puppeteer HTML templates) | Working, unportable | Templates re-authored in `@react-pdf/renderer` |
| Invoice statuses/void/credits | Nowhere complete | Missing | New build per PRD §5 |
| Dealer portal | Current build (dealer routes + `getDealerJackets`) | Working | UI shape; data access becomes RLS |
| Title management | `riseup` (title fields, lifecycle, report) | Working (old stack) | Model + statuses; Title Clerk dashboard is new |
| Payment tracking | Current build (paid flags in jacket) | Partial | Becomes a proper `payments` table |
| Reporting | `riseup` (7 report pages) | Working (old stack) | Report list; rebuilt as SQL views |
| Audit trail | Current build (`jackets/{vin}/activity`) | Partial | Generalized `audit_log` table |

### Current live architecture (item 12 of the audit asks)

Firebase project `rizeup-dealer-connect-n6k7r`: App Hosting (Next.js 14), Firestore, Storage, 11 callable Cloud Functions (Node 20, us-central1), Gemini via secret. This stays running untouched until cutover.

---

## Target architecture

| Concern | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| Hosting | Vercel |
| Database | Supabase Postgres, migrations tracked in `supabase/migrations/` |
| Auth | Supabase Auth; role in JWT claim; RLS enforces everything |
| Files | Supabase Storage, private buckets, short-lived signed URLs only |
| Trusted ops | Next.js server actions/route handlers; Supabase Edge Functions where service-role isolation is needed |
| PDFs | `@react-pdf/renderer` — server-side, no headless browser (the one Firebase piece that cannot port as-is; see SYSTEM-OVERVIEW.md) |
| AI (Phase 3) | Controlled job pipeline per PRD; Claude/Gemini behind schema validation |

Target repo structure (adopted incrementally — `apps/web` first, packages split only when a second consumer exists):

```
vintra/
├── apps/web/                # Next.js app
├── packages/                # ui / database / validation / shared — as needed
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   └── config.toml
├── docs/                    # PRD, this plan, audit, architecture, legacy
└── CLAUDE.md
```

### Schema starting point

`docs/legacy/riseup-domain-model.ts` normalized into Postgres. Core tables:

`companies` · `users` (+role, status) · `dealers` (profile + documents) · `purchase_orders` · `units` (surrogate PK, unique VIN index, `type_attributes jsonb` for per-unit-type fields) · `invoices` · `invoice_lines` · `payments` · `titles` (or title columns + `title_events`) · `documents` (polymorphic attachment) · `audit_log`

Every table: `company_id`, `created_at`, `updated_at`. Money as `numeric(12,2)`. Enums as Postgres enums or lookup tables.

---

## Migration sequence

**Operating principle (binding):** Do not rebuild working functionality merely to make it stylistically cleaner. Document what works, preserve validated business logic, isolate broken or duplicated implementations, and migrate **one workflow at a time**. Every migration has acceptance criteria and regression testing before the previous implementation is retired.

### Phase 1 — Operational core (first usable release)

Order of work, each step deployable:

1. **Foundation** — Supabase project, base schema migration, Supabase Auth wired into Next.js on Vercel, RLS policies, role-based routing, invite flow, audit_log
2. **Dealer management** — registration, approval queue, profiles, documents upload
3. **Inventory + PO intake (manual)** — PO record + original file upload, unit entry with review screen, dynamic fields by unit type, assignment
4. **Invoicing** — generation from unbilled units, review, PDF (`@react-pdf/renderer`), statuses, void/release, company config + required footer
5. **Payments** — manual payment logging, partials, balances
6. **Dealer portal** — dashboard, invoices, inventory (all via RLS)
7. **Titles** — unit title fields, Title Clerk dashboard, blocking alerts
8. **Reporting** — the 13 Release 1 reports as SQL views + CSV export

Acceptance gate for Phase 1: RizeUp can run one real auction purchase end-to-end — PO in, units created, dealer assigned, invoice PDF out, payment logged, title tracked — with the numbers matching a hand calculation.

### Data migration (Firestore → Postgres)

- Export `users`, `jackets` (+subcollections), `stagingInvoices` via Firebase Admin SDK script
- Transform: Timestamps → `timestamptz`; VIN-keyed jackets → `units` rows with surrogate ids; paid flags → synthesized `payments` rows; jacket `activity` → `audit_log`
- Copy Storage objects → Supabase Storage private buckets; regenerate all document URLs (kills the never-expiring signed URLs as a side effect)
- Verification: row counts match, spot-check 10 jackets field-by-field, recompute every invoice total with ported `invoice-math` and diff against stored values
- Firebase stays live and read-write until cutover day; migration script is re-runnable (upsert) so it can run once for rehearsal and again at cutover

### Cutover

1. Rehearsal migration → staging Supabase project; RizeUp runs a parallel week if practical
2. Freeze Firebase writes → final migration run → verification → DNS/entry point to Vercel
3. Firebase kept read-only for 60 days, then decommissioned
4. Old repos archived per the classification table; `vintra` default branch set to `main`; repo flipped private

### Phases 2–5

Per PRD "Later phases" — each phase gets its own plan when its predecessor ships.

---

## Risks

| Risk | Mitigation |
|---|---|
| PDF fidelity vs existing invoices | Re-author in react-pdf against a printed sample of the current output; Robert signs off before cutover |
| Company address/email discrepancy (66741 vs 66471) | Blocked as a launch item in PRD §5 — confirm before first production invoice |
| Firestore data quality (typo'd VINs as doc IDs) | Migration script flags un-parseable/duplicate VINs for manual review instead of silently importing |
| Scope creep from feature-donor repos | Feature matrix above is the contract; anything not in it is a phase 2+ ticket |
| Single operator, no staging discipline historically | Small PRs, deploy previews on Vercel, migrations only via files in `supabase/migrations/` |
