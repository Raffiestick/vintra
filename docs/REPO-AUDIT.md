# Vintra — Repository Audit & Consolidation

**Date:** 2026-08-05
**Purpose:** Determine which of the 11 repositories holds the authoritative code, consolidate to one, and establish a baseline for the rebuild on Vercel + Supabase.

---

## TL;DR

- The newest, most complete code was **`rizeup-dealer-connect/main`** — *not* `vintra`.
- `vintra` is a **fork of `rizeup-dealer-connect`** taken on 2025-09-20. It contains **zero** commits that `rizeup-dealer-connect` does not already have, and is **69 commits behind**.
- This branch consolidates `rizeup-dealer-connect/main` into the `vintra` repo, preserving all 580 commits of history. `vintra` is now the single source of truth.
- The **oldest** repos (`riseup`, `riseup-app-v2`) describe a **much broader product** than the newest one. Their domain model is the best written record of what Vintra is supposed to be, and is preserved in `docs/legacy/`.
- **No real credentials were leaked** in any repo. See [Security](#security).

---

## The 11 repositories

Three independent lineages, plus four dead/empty repos.

### Lineage A — "Jacket / Dealer Connect" (current product)

Root commit `305d91b`, 2025-08-23, "Initialized workspace with Firebase Studio".

| Repo | Last push | Commits | Source files | Verdict |
|---|---|---|---|---|
| **`rizeup-dealer-connect`** | 2025-09-26 | **580** | 289 (164 real) | ✅ **AUTHORITATIVE** — newest and a strict superset |
| `vintra` | 2025-09-20 | 511 | 186 | Fork of the above, 69 commits behind → **now the consolidation target** |
| `rizeup-dealer-hub` | 2025-08-31 | 41 | 103 | Dead-end branch off the same root. 40 unique commits, all auth-modal debugging. Nothing to salvage. |

Proof of the fork relationship:

```
merge-base(vintra/release, dealer-connect/main) = 1d3e465 "release: 2025-09-20 baseline"
commits in vintra NOT in dealer-connect:  0
commits in dealer-connect NOT in vintra: 69
```

Those 69 commits are substantial and are the ones you want — PDF generation for Invoice/BOS/Packet, dealer reassignment forms, the dealer portal UI, and the end-to-end jacket staging workflow.

> ⚠️ `vintra`'s default branch was `backup-sep16-1` — there was no `main`. Combined with 7 overlapping backup/snapshot/wip branches, this is why it looked like the newest repo when it wasn't.

### Lineage B — "JacketMaster" (PDF generation prototype)

| Repo | Last push | Commits | Verdict |
|---|---|---|---|
| `jacketmaster` | 2025-08-28 | 167 | Superseded. Its **blueprint is the clearest statement of the jacket/PDF requirement** — preserved in `docs/legacy/blueprint-jacketmaster.md`. |

This is where the Invoice + Bill of Sale → merged 2-page PDF concept was specified, including the file naming convention and the $100 management fee rule.

### Lineage C — "RizeUp Powersports Manager" (the full DMS)

| Repo | Last push | Commits | Verdict |
|---|---|---|---|
| `riseup` | 2025-06-13 | 147 | **Richest product spec.** Full DMS: inventory, dealers, purchase invoices, title management, 7 report types. |
| `riseup-app-v2` | 2025-06-19 | 162 | Role-based rebuild: admin / dealer / finance / staff / title-clerk dashboards, approvals, assignments, purchase orders. |
| `rizeup-crm` | 2025-07-22 | 4 | Scaffold only. Auth + role registration. Nothing to salvage. |

**This is the most important finding of the audit.** The newest code (Lineage A) is *narrower* than these older builds. Lineage A does jackets, staging and PDFs well; Lineage C had the whole dealer management system.

`riseup/src/types/index.ts` (preserved as `docs/legacy/riseup-domain-model.ts`) is a 342-line domain model covering unit types, dispositions, full cost breakdown, title lifecycle, location/logistics, sale info and lifecycle milestones. **It is a better specification than any of the blueprint files**, and should be the starting point for the Supabase schema.

### Dead repos — no action needed

| Repo | State |
|---|---|
| `rize-portal` | Empty — no commits, no branches |
| `vintra-invoice` | Empty — no commits, no branches |
| `rize-dealer` | 1 commit, single file named `test` |
| `rize-v3` | 1 commit, single file named `master` |

---

## What was done in this consolidation

1. Branch `claude/vintra-consolidate-rebuild-1ld5jg` in the `vintra` repo is based on `rizeup-dealer-connect/main` — **all 580 commits of history preserved**.
2. Verified every branch of `vintra` is fully contained. The only exception was one commit in `wip/20250918-065422` that changes a single line of the generated file `next-env.d.ts` — no content lost.
3. Removed committed build artifacts: `.firebase/` (106 files of deployed Next.js output), `functions/lib/`, `backups/`, a stray nested `vintra/` directory, and `*.tsbuildinfo`. **289 tracked files → 164.** All still recoverable from history.
4. Rewrote `.gitignore` so they don't come back.
5. Preserved the legacy specs and domain model under `docs/legacy/`.

Nothing was deleted from GitHub. Every original repo and branch is untouched.

---

## Security

Scanned all repos across full history for credentials.

- **No real secrets found.** ✅
- The `AIzaSy…` values throughout are **Firebase Web API keys**, which are designed to be public — they identify the project, they don't authorize anything. Access is controlled by Firestore/Storage rules.
- `vintra` correctly uses `defineSecret("GEMINI_API_KEY")` — the Gemini key is **not** in the repo, even though `vintra` is a public repo.
- `jacketmaster` history (commits around 2025-08-26) contains what looks alarming — a hardcoded `service_account` block with a `private_key`. **It is a placeholder**, containing the literal text `... many lines of key ...` and a fake `firebase-adminsdk-12345@` client email. No action required.

**Housekeeping recommendation:** `vintra` and `vintra-invoice` are **public** repos. Nothing sensitive is exposed, but there's no reason for a commercial DMS to be public. Suggest flipping both to private.

---

## Recommended repo actions

| Repo | Action |
|---|---|
| `vintra` | **Keep as the one true repo.** Set default branch to `main` after this branch merges. Flip to private. |
| `rizeup-dealer-connect` | Archive (read-only). Its history now lives in `vintra`. |
| `rizeup-dealer-hub`, `rizeup-crm` | Archive. |
| `jacketmaster` | Archive — spec preserved in `docs/legacy/`. |
| `riseup`, `riseup-app-v2` | **Do not archive yet.** Reference material for the rebuild scope. Archive once the Supabase schema is settled. |
| `rize-portal`, `vintra-invoice`, `rize-dealer`, `rize-v3` | Delete — empty or single junk file. |
