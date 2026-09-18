# CAFERA — Build Specification Amendments

**Status:** Phase 1.5 complete · **Applies to:** the master build command document

The master document is not held in this repository, so these are amendments
keyed by its existing section numbers rather than an edited copy. Each one
replaces or extends the named text and leaves the numbering and structure
intact, so the master still diffs cleanly against the mobile original.

Every amendment below reflects code that is committed, tested and verified —
not a plan.

---

## §23 — Backend API

### Replace the `/api/health` line

The single health endpoint is split, because the two questions it conflated have
different consumers and opposite failure behaviour.

```
GET    /api/health/live            liveness  — always 200 while the process runs
GET    /api/health/ready           readiness — 200/503 with a dependency breakdown
GET    /api/health                 deprecated alias of /ready
```

**The liveness probe must never check the database.** Container platforms kill
and restart a process whose liveness probe fails, so a liveness check that
consults Atlas turns a transient failover — an event Atlas is designed to ride
out — into a restart loop that drops in-flight requests and ends in a cold start.

`/ready` returns a per-dependency breakdown (`{ database: 'up' | 'down' }`) and
never exposes connection strings, hostnames or versions.

---

## §25 — Security

### Add: nonce and shared caching are mutually exclusive

A nonce is only a control while it is unique per response. Three consequences
follow, and they are a package:

1. HTML is generated per request.
2. Therefore **no literal ISR or `generateStaticParams`** on recipe pages while
   the nonce CSP stands. ISR's intent is preserved at the data layer instead —
   recipe reads are cached and tag-invalidated, so the database is not touched
   per request.
3. **Nonce-bearing HTML must never be shared-cached.** Adding `s-maxage`,
   `public` or `stale-while-revalidate` to a document response causes the CDN to
   cache the nonce with the HTML and serve one nonce to thousands of visitors.
   Nothing breaks, the header still looks correct, and the policy becomes worth
   approximately `unsafe-inline`.

Document responses carry `private, no-store, must-revalidate`, applied
unconditionally rather than opted into per route. Static assets, JSON and images
are unaffected and stay aggressively cacheable.

If static HTML is wanted later, the correct trade is a **hash-based CSP** for the
known inline scripts — not caching the nonce.

### Add: `upgrade-insecure-requests` is gated on the actual protocol

Never on `NODE_ENV`. On a plain-HTTP origin the directive rewrites every
subresource URL to `https://`, there is no TLS listener to reach, and the page
renders completely unstyled. Chromium and Firefox mask this by exempting
loopback; **WebKit does not**.

### Add: the cookie topology is fixed (see §37)

CSRF is mounted once at the `/api` router so a new endpoint is protected by
default. Two independent checks: an `Origin` / `Sec-Fetch-Site` test, and a
double-submit token compared in **constant time**. Health probes are mounted
before the gate because they carry no cookies.

---

## §30 — Project structure

### `middleware.ts` no longer exists

Next.js 16 renamed it. Update the structure tree and every reference:

```diff
  ├── web/
- │   └── middleware.ts
+ │   └── src/proxy.ts
```

The exported function must be named `proxy`, not `middleware`. The edge runtime
is not supported there — `proxy` runs on Node and that is not configurable.
Config flags renamed too: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### Async request APIs

`params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are **all
Promises**. Synchronous access was removed in 16, not deprecated. Any code sample
in the master document that destructures `params` synchronously is now invalid:

```diff
- export default function Page({ params }: { params: { slug: string } }) {
-   const { slug } = params;
+ export default async function Page(props: PageProps<'/recipes/[slug]'>) {
+   const { slug } = await props.params;
```

Use the generated `PageProps<'/route'>` and `LayoutProps<'/route'>` helpers
(`npx next typegen`).

### Actual route-group structure

The `(marketing)` / `(app)` split cannot express the layouts this product needs,
because Brew Mode and the auth pages require genuinely different chrome from the
browsing screens and a route group is the only way to give sibling routes
different layouts. Grouping by _chrome_ rather than by _audience_:

```
web/src/app/
├── (app)/      Header + bottom nav + footer — Home, Discover, recipes, Favorites, My Café, Profile
├── (auth)/     Centred single column, no navigation
└── (focus)/    Full-viewport, no chrome — /welcome and Brew Mode
```

---

## §33 — Performance

### Add: region pinning is mandatory

All three services are pinned to **one region** (Frankfurt: Vercel `fra1`, API
host `europe-west4`, Atlas AWS `eu-central-1`). This is stated explicitly rather
than left to platform defaults, because the defaults disagree with each other —
Vercel functions default to `iad1` and Atlas free tiers frequently land in
`us-east-1`, silently putting an ocean between the API and its database.

The request chain on a recipe page is `edge → Next → Express → Atlas`: four hops
before first byte. A cross-region cluster adds **100 ms or more per query**, paid
again for every query a page issues. That, not the rendering mode, is what misses
the LCP target.

Pooling matches: one connection per process reused for its lifetime, the
connection _promise_ cached so concurrent callers at startup cannot open
competing pools, and `minPoolSize: 5` so warm sockets are already open.

### Add: TTFB baseline

**Not yet measured.** The four-number breakdown (edge TTFB, Next render, Express
handler, Atlas query) requires a real deploy, which has not happened. Measured
locally so far: MongoDB cold connect 45 ms, cached connect 0 ms; total client
chunks 196.7 KB gzipped.

---

## §37 — Deployment and production readiness

### Replace the monitoring line

| Probe                      | URL                 |
| -------------------------- | ------------------- |
| Platform liveness probe    | `/api/health/live`  |
| Load-balancer traffic gate | `/api/health/ready` |
| External uptime monitor    | `/api/health/ready` |

State explicitly in the platform configuration that **the liveness probe must not
check the database**.

### Add: cookie topology — same-origin via proxy

The browser only ever talks to the web origin; `/api/*` is rewritten by Next to
the Express service, so every request is first-party.

**The exact attribute string:**

```
cafera_rt=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000
```

> **A cross-site `SameSite=None` refresh cookie must not be used.** A frontend on
> `*.vercel.app` talking to an API on `*.railway.app` makes the refresh cookie a
> **third-party cookie**, which Safari blocks outright via ITP and Firefox blocks
> under Total Cookie Protection. Login appears to succeed and the session
> silently fails to persist for a large share of real users, on browsers that are
> not the one you develop in.

`SameSite=Strict` is viable _because_ the topology is same-origin; a cross-site
setup could not use it at all.

### Add: host build configuration

Set these explicitly rather than relying on framework detection. Installing from
a workspace subdirectory is the failure mode to avoid — npm then cannot see the
sibling package and `@cafera/shared` fails to resolve at build time, with no
local reproduction.

| Setting        | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| Root directory | repository root (**not** `web/` or `server/`)                |
| Install        | `npm ci`                                                     |
| Build (web)    | `npm run build -w @cafera/shared && npm run build -w web`    |
| Build (API)    | `npm run build -w @cafera/shared && npm run build -w server` |

---

## Outstanding — requires a deploy

Two items in the Phase 1.5 brief could not be completed because no deployment
target is available from this environment. They are **not** done, and are not
recorded as done anywhere:

- **§33 TTFB baseline** — the four measured numbers from a real preview.
- **Workspace build verification on a host** — one throwaway preview of both
  `web` and `server` confirming they build and boot with the commands above.

The configuration both depend on is in place and documented; only the
verification is missing.
