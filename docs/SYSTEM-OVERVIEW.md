# Vintra — How the System Works Today

A read of the consolidated codebase (`rizeup-dealer-connect/main` @ `84e440b`, 2025-09-26) as it stands before the rebuild.

---

## What the product does

Vintra is a **powersports dealer management system**. The business (RizeUp Ventures, LLC, dba Dolphin Chasers) buys units at auction and resells them to dealers. The app manages that pipeline.

The central object is a **jacket** — the document package for one unit, keyed by VIN/HIN.

### The pipeline

```
Auction invoice (NPA PDF)
        │
        ▼
  ┌───────────────┐   admin uploads or keys in a batch
  │ stagingInvoice│   → parsed into per-unit rows
  │   └─ units[]  │
  └───────────────┘
        │  processStagedUnit / createJacketsForInvoice
        ▼
  ┌───────────────┐   one doc per VIN, jacketNumber = last 6 of VIN
  │    jacket     │   costs, title info, dealer assignment
  │  ├─ activity  │
  │  └─ docs      │
  └───────────────┘
        │  PDF generation (Puppeteer → HTML → PDF)
        ▼
  Invoice · Bill of Sale · Reassignment form · merged Packet
        │
        ▼
  Dealer portal — dealer views their own jackets + downloads docs
```

### Roles

Two, both as Firebase Auth custom claims:

- `admin: true` — full access
- `dealer: true` — set by `manageDealerApplication` when an admin approves a signup

Dealer signups land as `users/{uid}` with `status: pending` → `approved` / `denied`.

> The older `riseup-app-v2` build had **five** roles — Admin, Dealer, Staff, Finance, Title Clerk. The current build dropped down to two. Worth deciding deliberately which you want.

---

## Architecture as-built

| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2 App Router, React 18, TypeScript |
| UI | Tailwind + shadcn/ui (Radix primitives), `lucide-react`, `recharts` |
| Forms | `react-hook-form` + `zod` |
| Auth | Firebase Auth (email/password) + custom claims |
| Database | Firestore |
| Files | Firebase Storage |
| Backend | Firebase Cloud Functions v2 (`onCall`), Node 20, `us-central1` |
| PDF | `puppeteer-core` + `@sparticuz/chromium` → HTML → PDF, merged with `pdf-lib` |
| Parsing | `pdf-parse` + hand-rolled regex (`functions/src/parsers/npa.ts`) |
| AI | Gemini via `@google/generative-ai`; a Genkit content-generator for dealer marketing copy |
| Hosting | Firebase App Hosting, project `rizeup-dealer-connect-n6k7r` |

### Backend surface (11 callable functions)

| Module | Functions |
|---|---|
| `auth.ts` | `signInWithCustomToken`, `manageDealerApplication`, `generateJacketId` |
| `staging.ts` | `createStagingBatchFromManualEntry` |
| `process.ts` | `processStagedUnit`, `createJacketsForInvoice` |
| `invoices.ts` | `generateJacketInvoice`, `generateBillOfSale`, `regenerateInvoiceOnChange` |
| `packet.ts` | `generateJacketPacket` |
| `reassignment.ts` | `generateReassignmentForm` |
| `docs.ts` | `attachStagedDocToJacket` |
| `dealer.ts` | `getDealerJackets` |

### Firestore collections

```
users/{uid}                     role, status, companyName, address, phone, tax cert
stagingInvoices/{sid}           auctionSaleDate, auctionInvoiceNumber, status, unitCount
  └─ units/{unitId}             parsed unit rows, processed flag
jackets/{VIN}                   the core record — see functions/src/types.ts
  ├─ activity/{id}              audit trail
  └─ docs/{id}                  attached documents
```

### Money

All invoice math is centralised in `functions/src/lib/invoice-math.ts` — this is the cleanest code in the repo and the logic should carry over verbatim:

```
total      = itemPrice + buyerFee + onlineFee + managementFee + Σ miscFees
amountPaid = (isAuctionPaid ? itemPrice+buyerFee+onlineFee : 0)
           + (isMgmtFeePaid ? managementFee : 0)
           + Σ (miscFees where paid)
balanceDue = max(0, round(total - amountPaid, 2))
```

Auction charges settle as one unit; the management fee settles separately. Misc fees settle individually.

---

## Code health

**Scale:** ~1,300 lines of backend, ~10,300 lines of frontend (a large share of that is shadcn/ui boilerplate). The genuine application logic is modest — roughly 4,000 lines. **This is very rebuildable.**

**Strengths**
- `invoice-math.ts` is well-factored and carefully handles float/rounding.
- Cloud Functions are small and single-purpose.
- Data model in `functions/src/types.ts` is coherent.

**Problems to fix in the rebuild**

1. **`src/app/(app)/admin/jackets/[vin]/page.tsx` is 2,184 lines** — a single component holding jacket detail, editing, fee management, payments, document generation and dealer assignment.

2. **PDF signed URLs never expire** — `expires: '03-09-2491'` in `invoices.ts` and `packet.ts`. Anyone who ever obtains a link keeps permanent, unauthenticated access to that customer's invoice and bill of sale. Should be short-lived URLs minted on demand behind an auth check.

3. **Seller identity is hardcoded in two places** — the RizeUp address block is duplicated in `invoices.ts` and `packet.ts`. Should be config/DB.

4. **Firestore rules can't support list queries.** `dealerOwnsJacket()` does a `get()` per document, so the `list` rule was removed and replaced by the `getDealerJackets` callable that queries with admin privileges. This works but is a workaround for the data model — with Postgres RLS this becomes a simple `WHERE dealer_id = auth.uid()` policy.

5. **VIN as primary key.** `jackets/{VIN}` means a typo'd VIN creates an unfixable document, and there's no way to hold two records for the same unit across time. A surrogate `id` with a unique index on VIN is safer.

6. **The NPA parser is brittle.** `parsers/npa.ts` is positional regex against text extracted from one auction house's PDF layout. Any format change breaks it silently. Needs test fixtures at minimum.

7. **No tests anywhere.** Zero test files across all 11 repos.

8. **Commit history is prompt-driven** — messages like `now all white page - what the fuck is going on here!` and `ROLL BACK TO THIS - 2141c64`. Not a criticism of the work, just a signal that changes were never reviewed in isolation. Worth adopting small PRs going forward.

---

## Notes for the Vercel + Supabase migration

**The one genuine technical blocker: PDF generation.** The current approach launches headless Chromium inside a Cloud Function. That does not port cleanly to Vercel — `@sparticuz/chromium` plus `puppeteer-core` sits near or above the serverless function size limit, and cold starts are slow. Options, roughly in order of preference:

1. **`@react-pdf/renderer`** — define the invoice/BOS/packet as React components. No browser needed, fast, runs anywhere, and the templates become type-safe. Requires rewriting the four HTML templates.
2. **A hosted rendering API** (Browserless, PDFShift, Doppio) — keeps the existing HTML templates unchanged, adds a vendor and a per-document cost.
3. **Chromium on a separate long-running host** (Fly.io/Render) called from Vercel — most faithful to current behaviour, most infrastructure.

**Everything else maps cleanly:**

| Firebase | Supabase |
|---|---|
| Firestore collections | Postgres tables — the model is already relational |
| Security rules | Row Level Security policies |
| Firebase Auth + custom claims | Supabase Auth + a `role` column / JWT claim |
| Storage + signed URLs | Supabase Storage + short-lived signed URLs |
| Callable Functions | Next.js server actions / route handlers on Vercel |
| App Hosting | Vercel |

**Schema starting point:** use `docs/legacy/riseup-domain-model.ts`, not the current `types.ts`. The legacy model is materially richer — unit types, dispositions, full cost breakdown, title lifecycle, location/logistics, sale info, lifecycle milestones — and represents the fuller product vision. The current `JacketData` is a subset shaped by what the jacket/PDF workflow happened to need.

**Data migration:** Firestore → Postgres. Volume is unknown but the collection count is small. Straightforward export/transform/load; the main care points are Timestamp → `timestamptz`, and re-hosting the Storage objects.
