<div align="center">

# ☕ CAFERA

### Discover. Brew. Enjoy.

**A premium coffee discovery and recipe platform.**
Explore specialty coffee drinks, learn to make them properly, save favourites, and build your own collection.

</div>

---

## Contents

- [What CAFERA is](#what-cafera-is)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup and seeding](#database-setup-and-seeding)
- [API overview](#api-overview)
- [Security](#security)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Deployment](#deployment)
- [Build status](#build-status)
- [Roadmap](#roadmap)

---

## What CAFERA is

CAFERA is a responsive web application for people who want to make better coffee at
home. It combines a curated recipe library with the practical detail a recipe app
usually leaves out: correct ratios, the equipment you actually need, per-step
timings, and a distraction-free brewing mode that runs alongside you at the machine.

**Core features**

| Feature                | What it does                                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discovery**          | Browse and filter 25+ specialty recipes by category, temperature, difficulty, strength, time, milk and sweetness — all filter state lives in the URL, so results are shareable and survive a refresh |
| **Recipe detail**      | Hero photography, scalable ingredients, equipment, numbered steps, ratings and reviews, with schema.org `Recipe` structured data                                                                     |
| **Brew Mode**          | A full-viewport, wake-lock-backed brewing flow with a drift-free per-step timer and keyboard shortcuts                                                                                               |
| **Serving adjustment** | Ingredient quantities scale 1–6 servings with kitchen-sensible rounding, plus a metric/imperial toggle                                                                                               |
| **Favourites**         | Account-bound and optimistic, so they follow you across devices                                                                                                                                      |
| **My Café**            | Recently viewed, brew history, want-to-try, and your own custom recipes                                                                                                                              |
| **Search**             | Debounced, abortable search across name, ingredient, category and origin, with a ⌘K command palette                                                                                                  |
| **Profile**            | Coffee preferences that personalise recommendations, theme and unit settings, and full account control                                                                                               |

---

## Screenshots

> Captured from the running application.

| Home      | Discover  | Recipe detail | Brew Mode |
| --------- | --------- | ------------- | --------- |
| _Phase 5_ | _Phase 5_ | _Phase 5_     | _Phase 5_ |

---

## Technology stack

**Frontend**

|           |                                                           |
| --------- | --------------------------------------------------------- |
| Framework | Next.js 16 (App Router) with React 19                     |
| Language  | TypeScript, `strict` — no `any` in committed code         |
| Styling   | Tailwind CSS v4 over a CSS custom-property token layer    |
| State     | Server Components; Redux Toolkit for client-only UI state |
| Animation | Framer Motion                                             |
| Forms     | react-hook-form + zod                                     |
| Icons     | lucide-react                                              |
| Images    | `next/image` with AVIF/WebP and blur placeholders         |

**Backend**

|          |                                                        |
| -------- | ------------------------------------------------------ |
| Runtime  | Node.js 22 on Vercel functions                         |
| Data     | Server Components and Server Actions — no REST service |
| Database | MongoDB Atlas via Mongoose                             |
| Auth     | Better Auth (Phase 3)                                  |
| Media    | Vercel Blob (Phase 4)                                  |

**Quality**

Vitest · Testing Library · Playwright · axe-core · ESLint · Prettier · Husky · GitHub Actions

---

## Architecture

CAFERA is **one Next.js application** deployed to Vercel. There is no separate
API service and no workspaces — server code, client code and the contracts
between them all live under `src/`.

```
src/
├── app/          App Router — (app) chrome, (auth) bare, (focus) full-viewport
├── components/   ui/ primitives, recipe/, layout/, brand/
├── hooks/
├── lib/
│   ├── constants/   domain vocabulary and site constants
│   ├── utils/       pure functions shared by server and client
│   ├── validation/  zod schemas — the single source of validation truth
│   ├── db.ts        Mongoose connection, sized for serverless
│   ├── env.ts       the only place process.env is read
│   └── auth.ts      Phase 3 — Better Auth
├── models/       Mongoose models
├── types/
└── proxy.ts      headers for private routes only
```

### Why one tree

The frontend validates a registration form and the server validates the same
registration. Written twice, those rules _will_ drift — and the half that drifts
silently is the client, so the server ends up the only real enforcement point and
nobody notices until it rejects something the UI accepted.

With one tree there is nothing to synchronise: a Server Action and the form that
calls it import the same schema object. This is the main thing the collapse from
three workspaces bought.

### Route groups

```
src/app/
├── (app)/      Header + bottom nav + footer — Home, Discover, recipes, Favorites, My Café, Profile
├── (auth)/     Centred single column, no navigation
└── (focus)/    Full-viewport, no chrome — /welcome and Brew Mode
```

Grouped by _chrome_ rather than by audience: Brew Mode and the auth pages need
genuinely different layouts from the browsing screens, and a route group is the
only way to give sibling routes different ones.

### Rendering and caching

| Routes                                                 | Rendering           | Cache                       |
| ------------------------------------------------------ | ------------------- | --------------------------- |
| `/`, `/discover`, `/recipes/*`                         | Static, prerendered | Shared-cacheable at the CDN |
| `/profile`, `/favorites`, `/my-cafe`, `/welcome`, auth | Session-rendered    | `private, no-store`         |

Both directions are enforced by tests. A public page that gains `no-store`
silently disables the CDN; a private page that becomes shared-cacheable serves
one person's data to the next visitor.

## Getting started

**Prerequisites** — Node.js ≥ 22, npm ≥ 10, and a MongoDB Atlas cluster (or a
local `mongod` for development).

```bash
git clone <repository-url> cafera
cd cafera
npm install
cp .env.example .env.local
npm run dev
```

That is the whole setup. There is no workspace to build first.

### Commands

| Command                | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Development server                                       |
| `npm run build`        | Production build                                         |
| `npm start`            | Serve the production build                               |
| `npm run typecheck`    | `tsc --noEmit`                                           |
| `npm run lint`         | ESLint                                                   |
| `npm test`             | Vitest                                                   |
| `npm run test:e2e`     | Playwright — Chromium, Firefox, WebKit, mobile Safari    |
| `npm run scan:secrets` | Fail if anything secret-shaped reached the client bundle |
| `npm run analyze`      | Production build with the bundle analyser                |

## Environment variables

One file: `.env.local`, from the committed `.env.example`. It is never itself
committed.

Every variable is validated by `src/lib/env.ts` at module load, with `.min(1)` on
every required string. That is not ceremony: **an unset variable in a `.env` file
is an empty string, not `undefined`**, so `??` passes it through as though it
were configuration. That exact bug made an API rewrite resolve to a path pointing
at itself, and every call 404'd with nothing logged. An ESLint rule bans
`process.env` outside that one module so it cannot come back.

| Variable                | Purpose                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`           | Atlas connection string. Checked for a host — `.url()` alone accepts `mongodb+srv://`, which has none.                                                 |
| `NEXT_PUBLIC_SITE_URL`  | Public origin, for canonicals, Open Graph and the sitemap.                                                                                             |
| `BETTER_AUTH_SECRET`    | Phase 3. Optional until then, but the 32-character floor applies now: a short signing secret does not fail, it quietly weakens every session it signs. |
| `BETTER_AUTH_URL`       | Phase 3.                                                                                                                                               |
| `BLOB_READ_WRITE_TOKEN` | Phase 4, Vercel Blob.                                                                                                                                  |

Only `NEXT_PUBLIC_`-prefixed variables reach the browser, and everything with
that prefix is public — visible in DevTools to anyone who loads the site.
`npm run scan:secrets` enforces that against the built output, and now matters
more than it did: server and client code share one tree, so an accidental import
crosses the boundary silently rather than failing to resolve.

## Database setup and seeding

1. Create a MongoDB Atlas cluster.
2. Add a database user with `readWrite` on the `cafera` database only — never the
   Atlas admin user, and never a cluster-wide role.
3. Restrict the IP access list to your deployment's egress addresses.
4. Put the SRV connection string in `server/.env`.

```bash
npm run seed              # idempotent — safe to run repeatedly
npm run seed:fresh             # drops and rebuilds from scratch
```

The seed creates 25 complete recipes with real ingredients, ratios and brewing
steps, the equipment reference collection, a demo account and a set of realistic
reviews so rating displays are not uniformly empty.

**Collections** — `users`, `recipes`, `favorites`, `reviews`, `customRecipes`,
`refreshTokens`, `equipment`, `userActivity`.

Indexes: unique on `users.email` (lowercased) and `recipes.slug`; compound unique
`{ userId, recipeId }` on `favorites` and `reviews` (one review per person per
recipe, enforced by the database rather than by a client check); a text index
across name, description, tags, ingredient names and origin; filter indexes on
`category`, `temperature`, `difficulty`, `preparationTime` and `rating`; and a TTL
index on `refreshTokens.expiresAt`.

---

## API overview

There is no REST API. Reads happen in Server Components and mutations in Server
Actions, so there is no HTTP surface to version, document or secure separately —
and no second place for validation to drift to.

Actions return a discriminated result rather than throwing:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ApiErrorCode; message: string; fields?: FieldError[] };
    };
```

A thrown error in a Server Action reaches the client as an opaque digest with no
field detail — right for an unexpected fault, useless for "that email is already
registered". Callers narrow on `ok` and map `code` to copy; raw server messages
are never rendered.

## Security

**Sessions** are Better Auth's (Phase 3). It owns issuance, storage, CSRF and
rotation. Running a hand-rolled scheme alongside it would give the app two
session mechanisms that agree only by coincidence, so the v1 JWT/refresh-cookie
implementation was removed rather than kept "just in case" — it is recoverable at
tag `v1-express-final`.

> **No token is ever written to `localStorage` or `sessionStorage`.** Any XSS can
> read web storage, so a token stored there is an account-takeover primitive. An
> ESLint rule blocks it, one audited module is the only code allowed near web
> storage, and `npm run scan:secrets` fails the build on a token-shaped key in
> the built bundle.

**Content Security Policy.** Static, served from `next.config.ts`. `script-src`
carries `'unsafe-inline'` — a deliberate, measured trade rather than an
oversight, and the reasoning is recorded in full in `src/lib/security-headers.ts`
and in CLAUDE.md. Short version: a hash-based policy was implemented and tested
in a real browser, and the App Router's per-page inline flight scripts make it
unworkable. Everything else stays locked: no `unsafe-eval`, `object-src 'none'`,
`base-uri 'none'`, `frame-ancestors 'none'`, and a `connect-src` naming only this
origin.

**Other controls.** HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `X-Frame-Options: DENY` · NoSQL injection defence via
Mongoose `sanitizeFilter` · zod validation on every Server Action input ·
`upgrade-insecure-requests` gated on the actual deployment rather than on
`NODE_ENV`, because on a plain-HTTP origin it renders the page completely
unstyled in WebKit.

## Performance

Targets: **LCP < 2.0 s**, **INP < 200 ms**, **CLS < 0.1**, Lighthouse ≥ 90 on
mobile, and initial JS on `/` under 200 KB gzipped.

Server Components by default with `'use client'` only where interaction demands
it · route-level code splitting with heavy client components dynamically imported
· `next/font` self-hosted, subset and preloaded · `next/image` with explicit
dimensions, correct `sizes` and a blur placeholder on every image so nothing
shifts · static prerendering with CDN caching for public pages · API
pagination everywhere with `lean()` reads over indexed fields · and a bundle
analyser check before release.

---

## Accessibility

Target: **WCAG 2.1 AA**, verified with `@axe-core/playwright` in CI on every
primary route plus a manual keyboard-only pass per page.

The brand palette does not pass on its own, and pretending otherwise would have
been the easy mistake. Measured against the cream backgrounds, **Caramel
`#C68B59` is 2.71:1** and **Muted `#8B7D74` is 3.72:1** — both fail AA for body
text. So the raw brand colours are used only as decorative fills, and the text
tokens are darkened variants derived from them and verified at **≥ 4.5:1 against
every surface they appear on**. The numbers are recorded in `globals.css`.

Also: semantic landmarks with one `h1` per page · a skip link as the first
focusable element · full keyboard operability with a visible `:focus-visible`
ring everywhere · accessible names on every icon-only control · live regions for
async status · 44×44px minimum touch targets · and **no state conveyed by colour
alone** — the active nav item carries an underline and a weight change alongside
its colour, and every filter chip exposes `aria-pressed`.

---

## Testing

| Layer          | Tooling                  | Covers                                                                                                         |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Shared logic   | Vitest                   | Ingredient scaling and rounding, unit conversion, ISO durations, slugs, the daily rotation, every zod contract |
| Infrastructure | Vitest                   | Environment validation, serverless connection pooling and cache behaviour, the two-directional cache guard     |
| Components     | Vitest + Testing Library | The accessibility contracts of the primitives, dialog behaviour and scroll locking                             |
| Design system  | Vitest                   | 81 contrast assertions over the real `globals.css`, both theme halves                                          |
| End-to-end     | Playwright               | Chromium, Firefox, WebKit and mobile Safari                                                                    |

```bash
npm test                    # 198 unit and integration tests
npm run test:e2e            # 39 end-to-end tests, four browser engines
```

The cross-browser run is not optional decoration. Every engine-specific bug in
this codebase — WebKit rendering unstyled under `upgrade-insecure-requests`,
Safari dropping focus after a programmatic `dialog.close()`, Safari not focusing
a button on click — was invisible in Chromium.

## Deployment

One target: **Vercel**. No second service to deploy or keep in step.

| Piece       | Target                                                      | Region             |
| ----------- | ----------------------------------------------------------- | ------------------ |
| Application | Vercel (Next.js)                                            | `fra1` — Frankfurt |
| Database    | MongoDB Atlas, IP allow-list, least-privilege user, backups | AWS `eu-central-1` |
| Media       | Vercel Blob                                                 | —                  |

### Region pinning is mandatory, not a default

Stated explicitly rather than left to platform defaults, because the defaults do
not agree: Vercel functions default to `iad1` (Washington) and Atlas free tiers
frequently land in `us-east-1`, silently putting an ocean between the functions
and the database. A cross-region cluster costs **100 ms or more per query**, paid
again for every query a page issues.

### Connection pooling is sized for functions, not for a server

`minPoolSize: 0`, `maxPoolSize: 10`. There is no single long-lived process — as
many function instances exist as concurrency demands, each with its own pool.
Holding five warm sockets per instance across a hundred instances is five hundred
connections, and an Atlas shared tier caps at 500. The failure is not a clean
refusal; it is random connection errors under load that read like an application
bug. See `src/lib/db.ts`.

### Release checklist

Real `NEXT_PUBLIC_SITE_URL` · custom domain with HTTPS and HSTS · `robots.txt`
and a dynamic `sitemap.xml` · structured data validated in Google's Rich Results
Test · PWA manifest and offline fallback · error tracking · analytics behind a
consent banner · Privacy Policy and Terms pages · Atlas backups enabled.

> **TTFB baseline: not yet measured.** The four-number breakdown (edge TTFB, Next
> render, Atlas query, total load) requires a real deploy. See
> [Build status](#build-status).

## Build status

Built in the phases set out in the specification. The project was rescoped from a
two-service architecture (v1) to a single serverless app (v2); the port is
complete and the v1 state is recoverable at tag `v1-express-final`.

| Phase               | Status                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Foundation**  | ✅ Strict TypeScript, ESLint/Prettier/Husky, CI, route skeleton and layouts, design-token system with verified contrast, UI primitives                             |
| **1.5 — Hardening** | ✅ Contrast audit of both theme halves, dialog scroll lock and exit transitions verified across four browser engines, region pinning                               |
| **Serverless port** | ✅ Collapsed to one app, Express deleted, static CSP with a two-directional cache guard, serverless connection pooling, whole-environment validation, CI typecheck |
| **2 — Data layer**  | ⏳ Models, indexes, seed data, Server Actions                                                                                                                      |
| **3 — Auth**        | ⏳ Better Auth                                                                                                                                                     |
| **4 — Core UI**     | ⏳ Onboarding, auth pages, Home, Discover, recipe detail, Brew Mode, Favorites, My Café, Profile                                                                   |
| **5 — Content**     | ⏳ 25 seeded recipes, imagery, search and filtering, SEO layer                                                                                                     |
| **6 — Polish**      | ⏳ Animation, full state coverage, accessibility and performance passes                                                                                            |
| **7 — Testing**     | ⏳ Full E2E coverage, axe in CI, dependency review                                                                                                                 |
| **8 — Production**  | ⏳ Deployment, PWA, monitoring, legal pages, final QA                                                                                                              |

Green today: **198 unit and integration tests**, **39 end-to-end tests** across
Chromium, Firefox, WebKit and mobile Safari, clean typecheck, clean lint, clean
production build, and a passing client-bundle secret scan. `/` prerenders as
static.

**Open, and blocked on access rather than on code:** the deployed TTFB baseline.
It needs a Vercel deployment, and no credentials are available in the build
environment. It is not estimated anywhere.

## Roadmap

Deliberately designed for, not built yet: AI coffee recommendations
(`POST /api/ask`, contract defined, feature-flagged) · a coffee bean scanner ·
coffee shop discovery · barista profiles · challenges and achievements · Web Push ·
internationalisation (EN/TR/FA) · equipment recommendations · shopping lists ·
bean inventory · community recipes · social sharing.

The seams these need already exist — the `equipment` reference collection, the
`userActivity` model behind brewing streaks, the admin role on the user model, and
the AI contract in `shared/` — so none of them requires a rewrite.

---

<div align="center">

**CAFERA** · Discover. Brew. Enjoy.

</div>
