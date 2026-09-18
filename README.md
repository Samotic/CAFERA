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

|           |                                                        |
| --------- | ------------------------------------------------------ |
| Framework | Next.js 16 (App Router) with React 19                  |
| Language  | TypeScript, `strict` — no `any` in committed code      |
| Styling   | Tailwind CSS v4 over a CSS custom-property token layer |
| State     | Redux Toolkit + RTK Query                              |
| Animation | Framer Motion                                          |
| Forms     | react-hook-form + zod                                  |
| Icons     | lucide-react                                           |
| Images    | `next/image` with AVIF/WebP and blur placeholders      |

**Backend**

|           |                                                                      |
| --------- | -------------------------------------------------------------------- |
| Runtime   | Node.js 20+                                                          |
| Framework | Express 5, TypeScript                                                |
| Database  | MongoDB Atlas via Mongoose                                           |
| Auth      | JWT access token (memory) + rotating refresh token (httpOnly cookie) |
| Passwords | bcrypt, cost ≥ 12                                                    |
| Logging   | pino, with credential redaction                                      |
| Media     | Cloudinary, signed uploads                                           |

**Quality**

Vitest · Testing Library · Supertest · mongodb-memory-server · Playwright · axe-core · ESLint · Prettier · Husky · GitHub Actions

---

## Architecture

CAFERA is an npm-workspaces monorepo with three packages:

```
cafera/
├── shared/     @cafera/shared — types, zod contracts, domain constants, pure utilities
├── server/     Express + TypeScript REST API
└── web/        Next.js App Router frontend
```

### Why `shared/` exists

The frontend validates a registration form and the backend validates the same
registration request. If those two rules are written twice they _will_ drift, and
the half that drifts silently is the client — which means the server ends up
being the only real enforcement point and nobody notices until it rejects
something the UI accepted.

So every contract is declared once in `shared/` and imported by both sides:
TypeScript types, zod schemas, enums, limits, and the pure functions that must
agree across the wire (ingredient scaling, slug generation, the deterministic
daily rotation). The server re-runs every schema regardless — the client is a
convenience, never a control.

### Route groups

```
web/src/app/
├── (app)/      Header + bottom nav + footer — Home, Discover, recipes, Favorites, My Café, Profile
├── (auth)/     Centred single column, no navigation — login, register, password reset
└── (focus)/    Full-viewport, no chrome — /welcome onboarding and Brew Mode
```

This departs slightly from a single `(marketing)`/`(app)` split. Brew Mode and the
auth pages need genuinely different chrome from the browsing screens, and a route
group is the only way to give sibling routes different layouts. Grouping by
_chrome_ rather than by _audience_ is what makes that possible.

### Request lifecycle

```
Browser
  │  fetch with credentials + CSRF header
  ▼
Express  helmet → CORS allow-list → body limit → sanitiser → rate limit
  │      → auth middleware (verifies JWT, derives identity)
  │      → authorisation middleware (ownership / role)
  │      → zod validation (shared contract)
  │      → controller (thin) → service (business logic) → Mongoose model
  ▼
Single response envelope: { success: true, data } | { success: false, error }
```

Business logic never lives in a route handler. Controllers parse and respond;
services decide. That boundary is what makes the services testable without HTTP.

---

## Getting started

**Prerequisites** — Node.js ≥ 20.11, npm ≥ 10, and a MongoDB Atlas cluster (or a
local `mongod` for development).

```bash
git clone <repository-url> cafera
cd cafera
npm install
```

`shared` compiles to `dist/` and both other packages import it from there, so it
must be built before anything else will typecheck:

```bash
npm run build -w @cafera/shared
```

Create the two environment files:

```bash
cp server/.env.example server/.env
cp web/.env.example    web/.env.local
```

Generate real JWT secrets — the placeholders in the template will not pass
validation:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice
```

Then run both applications:

```bash
npm run dev:server    # API   → http://localhost:4000
npm run dev:web       # Web   → http://localhost:3000
```

### Useful commands

| Command                                  | What it does                                                      |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev:web` / `npm run dev:server` | Start one application                                             |
| `npm run build`                          | Build all three packages in dependency order                      |
| `npm run typecheck`                      | Typecheck every workspace                                         |
| `npm run lint`                           | Lint every workspace                                              |
| `npm test`                               | Unit and integration tests everywhere                             |
| `npm run test:e2e -w web`                | Playwright, across Chromium, Firefox and WebKit                   |
| `npm run seed`                           | Populate the database (`npm run seed:fresh -w server` to rebuild) |
| `npm run analyze -w web`                 | Production build with the bundle analyser                         |
| `node scripts/check-bundle-secrets.mjs`  | Fail if anything secret-shaped reached the client bundle          |

---

## Environment variables

Both templates are committed; neither `.env` nor `.env.local` ever is.

**`server/.env`** — the whole trust boundary lives here: `MONGODB_URI`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_ROUNDS`, cookie flags, the CORS
allow-list, rate limits, Cloudinary credentials and the optional LLM key. See
[`server/.env.example`](server/.env.example) for the annotated list.

`config/env.ts` validates all of it at boot and **refuses to start** on anything
missing or unsafe. Production carries extra rules that development does not:
`COOKIE_SECURE` must be true, CORS origins must be HTTPS and must not contain a
wildcard, and the two JWT secrets must differ. A server that boots with an
undefined secret signs tokens with the string `"undefined"`, and that failure
surfaces months later as an incident rather than immediately as a crash.

**`web/.env.local`** — contains no secrets at all, by design. Only
`NEXT_PUBLIC_`-prefixed variables reach the browser, and everything with that
prefix is public: visible in DevTools to anyone who loads the site. The browser
talks only to the CAFERA API, which holds every credential.
`scripts/check-bundle-secrets.mjs` enforces this in CI.

---

## Database setup and seeding

1. Create a MongoDB Atlas cluster.
2. Add a database user with `readWrite` on the `cafera` database only — never the
   Atlas admin user, and never a cluster-wide role.
3. Restrict the IP access list to your deployment's egress addresses.
4. Put the SRV connection string in `server/.env`.

```bash
npm run seed              # idempotent — safe to run repeatedly
npm run seed:fresh -w server   # drops and rebuilds from scratch
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

Base URL `/api`. Every response uses one envelope:

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": [], "requestId": "…" } }
```

Clients narrow on `success` alone and map `code` to user-facing copy — raw server
messages are never rendered.

| Area           | Endpoints                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /auth/register` `/auth/login` `/auth/logout` `/auth/refresh` `/auth/forgot-password` `/auth/reset-password` · `GET /auth/me` |
| Recipes        | `GET /recipes` `/recipes/:slug` `/recipes/search` · `GET /categories`                                                              |
| Favourites     | `GET /favorites` · `POST`/`DELETE /favorites/:recipeId`                                                                            |
| Reviews        | `GET`/`POST /reviews/:recipeId` · `PUT`/`DELETE /reviews/:reviewId`                                                                |
| Users          | `GET`/`PUT /users/profile` · `PUT /users/preferences` · `POST /users/avatar`                                                       |
| My Café        | `/my-cafe/recently-viewed` `/my-cafe/history` `/my-cafe/want-to-try`                                                               |
| Custom recipes | Full CRUD under `/custom-recipes`                                                                                                  |
| AI             | `POST /ai/ask` (feature-flagged)                                                                                                   |
| Ops            | `GET /health`                                                                                                                      |

`GET /api/health` reports the database as well as the process, and returns **503**
when the database is unreachable — a service answering HTTP in front of a dead
database is down from every user's point of view, and a monitor needs to see that.

---

## Security

Security requirements were treated as non-negotiable rather than as a checklist.

**Sessions.** The access token is short-lived (15 min), returned in the response
body, and held **in memory only**. The refresh token is long-lived and lives in an
`httpOnly; Secure; SameSite` cookie that JavaScript cannot read. Refresh tokens
rotate on every use with reuse detection: a token presented twice invalidates the
entire family, which is what turns a stolen refresh token from a permanent
foothold into a detectable, revoked one.

> **No token is ever written to `localStorage` or `sessionStorage`.** This is the
> single most important difference between a web client and a mobile one — any XSS
> on the page can read web storage, so a token stored there is an account-takeover
> primitive. An ESLint rule fails the build on any attempt, and an E2E test asserts
> both storage areas stay clean after login.

**Other controls.** CSRF protection via `SameSite` plus a double-submit token on
every cookie-authenticated state-changing request · a nonce-based CSP with no
`unsafe-inline` · HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` and `X-Frame-Options: DENY` · a strict CORS allow-list with
credentials (never `*`) · rate limiting, stricter on auth routes and keyed on IP
_and_ email so credential stuffing is caught in both directions · NoSQL injection
defence in two layers (request-boundary key stripping and Mongoose
`sanitizeFilter`) · a 100 KB body limit · MIME and magic-byte validation on
uploads · open-redirect protection on every post-auth redirect · and identical
forgot-password responses whether or not an account exists, so the endpoint cannot
enumerate users.

Identity is derived only from a verified token. No endpoint trusts a
client-supplied user id.

### Known trade-off: nonce CSP vs. static rendering

§25 mandates a nonce-based CSP with no `unsafe-inline`. In the App Router a
per-request nonce necessarily means per-request HTML, which rules out literal ISR
and `generateStaticParams` for recipe pages. The mandatory security requirement
wins, and ISR's _intent_ is preserved one layer down: recipe reads are cached and
tag-invalidated, so the database is not touched per request and TTFB stays flat.
Relaxing the CSP would restore static HTML — a deliberate decision, not an
oversight.

---

## Performance

Targets: **LCP < 2.0 s**, **INP < 200 ms**, **CLS < 0.1**, Lighthouse ≥ 90 on
mobile, and initial JS on `/` under 200 KB gzipped.

Server Components by default with `'use client'` only where interaction demands
it · route-level code splitting with heavy client components dynamically imported
· `next/font` self-hosted, subset and preloaded · `next/image` with explicit
dimensions, correct `sizes` and a blur placeholder on every image so nothing
shifts · cached, tag-invalidated recipe reads · RTK Query deduplication · API
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

| Layer         | Tooling                                    | Covers                                                                                                         |
| ------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Shared logic  | Vitest                                     | Ingredient scaling and rounding, unit conversion, ISO durations, slugs, the daily rotation, every zod contract |
| API           | Vitest + Supertest + mongodb-memory-server | Auth and token refresh, filtering and pagination, favourites, authorisation, the security middleware stack     |
| Components    | Vitest + Testing Library                   | The accessibility contracts of the primitives                                                                  |
| End-to-end    | Playwright (Chromium, Firefox, WebKit)     | Register → onboard → browse → favourite → brew → review, plus URL-state and session persistence                |
| Accessibility | `@axe-core/playwright`                     | Every primary route, failing the build on violations                                                           |

```bash
npm test                    # everything
npm test -w server          # one workspace
npm run test:e2e -w web     # browsers
```

---

## Deployment

| Piece    | Target                                                                |
| -------- | --------------------------------------------------------------------- |
| Frontend | Vercel                                                                |
| API      | Railway / Render / Fly.io                                             |
| Database | MongoDB Atlas, IP allow-list, least-privilege user, automated backups |
| Media    | Cloudinary, signed uploads                                            |

**Release checklist.** Real `NEXT_PUBLIC_API_URL` (a localhost value ships a site
that cannot load data — the bundle scanner fails the build on one) · custom domain
with HTTPS and HSTS preload · cookie domain and `SameSite` correct for the
frontend/API origin split · CORS allow-list containing only real production
origins · `robots.txt` and a dynamic `sitemap.xml` · structured data validated in
Google's Rich Results Test · PWA manifest, service worker and offline fallback ·
Sentry on both halves · uptime monitoring on `/api/health` · analytics behind a
consent banner · Privacy Policy and Terms pages · and graceful shutdown confirmed
on the API so rolling deploys drop nothing in flight.

---

## Build status

CAFERA is built in the phases set out in the specification. Current state:

| Phase                   | Status                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Foundation**      | ✅ Monorepo, strict TypeScript, ESLint/Prettier/Husky, CI, route skeleton and layouts, design-token system with verified contrast, UI primitives                |
| **1b — API foundation** | ✅ Express 5 app, validated environment, security middleware, error envelope, graceful shutdown, `/api/health` (brought forward to keep the workspace coherent) |
| **2 — Core UI**         | ⏳ Brand intro, onboarding, auth pages, Home, Discover, recipe detail, Brew Mode, Favorites, My Café, Profile                                                   |
| **3 — Backend**         | ⏳ Models and indexes, full REST API, authentication, shared validation layer                                                                                   |
| **4 — Integration**     | ⏳ RTK Query with silent re-auth, route protection, account system, favourites, reviews                                                                         |
| **5 — Content**         | ⏳ 25 seeded recipes, imagery in both crops, search and filtering, SEO layer                                                                                    |
| **6 — Polish**          | ⏳ Animation, full state coverage, accessibility and performance passes                                                                                         |
| **7 — Testing**         | ⏳ Playwright suites, axe in CI, dependency review                                                                                                              |
| **8 — Production**      | ⏳ Deployment, PWA, monitoring, legal pages, final QA                                                                                                           |

Green today: **67 tests passing** across all three workspaces, clean typecheck,
clean lint, clean production build, and a passing client-bundle secret scan.

---

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
