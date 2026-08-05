# Vintra

Powersport dealer management system. Manages the pipeline from auction purchase through to dealer resale: unit intake, deal jackets, invoicing, title tracking and document generation.

**This repository is the single source of truth.** It consolidates the work previously spread across 11 repositories — see [`docs/REPO-AUDIT.md`](docs/REPO-AUDIT.md).

## Documentation

| Document | What it covers |
|---|---|
| [`docs/REPO-AUDIT.md`](docs/REPO-AUDIT.md) | Which repo held what, how they related, what was consolidated |
| [`docs/SYSTEM-OVERVIEW.md`](docs/SYSTEM-OVERVIEW.md) | How the system works today, code health, migration notes |
| [`docs/legacy/`](docs/legacy/) | Specs and domain models from earlier builds — input for the rebuild |

## Current stack

Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Firebase (Auth, Firestore, Storage, Functions, App Hosting)

A rebuild onto **Vercel + Supabase** is planned. See the migration notes in `docs/SYSTEM-OVERVIEW.md`.

## Local development

```bash
npm install
npm run dev          # http://localhost:9011

cd functions
npm install
npm run build        # tsc
```

Firebase project: `rizeup-dealer-connect-n6k7r`. The Gemini API key is supplied at runtime via a secret (`GEMINI_API_KEY`) and is not stored in this repo.

## Layout

```
src/app/(site)/       public marketing pages
src/app/(app)/admin/  admin — jackets, staging, dealer management
src/app/(app)/dealer/ dealer portal — jackets, profile, documents
src/lib/              firebase client, auth helpers, parsers
functions/src/
  modules/            callable cloud functions
  templates/          HTML templates for invoice / BOS / packet / reassignment
  parsers/            auction invoice parsing
  lib/invoice-math.ts fee and balance calculation
```
