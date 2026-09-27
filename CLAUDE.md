# CAFERA — working notes

Context for anyone (human or agent) picking this repository up. Conventions and
gotchas that are not obvious from the code, and that are expensive to rediscover.

**Master specification:** `CAFERA-BUILD-COMMAND-V2-SERVERLESS.md`.

> That document is not currently committed to this repository. It is referenced
> throughout as the target state, so commit it here — several decisions below
> cite its section numbers, and they cannot be checked against a document nobody
> can find.

## Architecture

One Next.js app on Vercel. No separate API service, no workspaces, one
`package.json`. Server code, client code and the contracts between them all live
under `src/`, which is what lets a Server Action and the form that calls it
validate against the same schema object rather than two copies of it.

```
src/
├── app/          App Router — (app) chrome, (auth) bare, (focus) full-viewport
├── components/   ui/ primitives, recipe/, layout/, brand/
├── hooks/
├── lib/
│   ├── constants/   domain vocabulary and site constants
│   ├── utils/       pure functions shared by server and client
│   ├── validation/  zod schemas — the single source of validation truth
│   ├── db.ts        Mongoose connection (serverless-shaped, see below)
│   ├── env.ts       the ONLY place process.env is read
│   └── auth.ts      TODO(phase-3): Better Auth
├── models/       Mongoose models
├── types/
└── proxy.ts      private-route headers only
```

`npm install` then `npm run dev`. There is no build step for a sibling package
any more.

## Next.js 16 — differs from Next 14/15 in ways that matter

Its own docs ship at `node_modules/next/dist/docs/` — read those rather than
trusting recall.

- **`middleware.ts` is now `proxy.ts`**, and the exported function is `proxy`.
  The edge runtime is not supported there; it runs on Node.
- **`params` and `searchParams` are Promises**, as are `cookies()`, `headers()`
  and `draftMode()`. Synchronous access was removed, not deprecated. Use the
  generated `PageProps<'/route'>` / `LayoutProps<'/route'>` helpers.
- **`revalidateTag` takes a second argument** — a `cacheLife` profile.
- **`cacheLife` and `cacheTag` are stable** — drop the `unstable_` prefix.
- **PPR is `cacheComponents: true`**, not `experimental.ppr`. Not enabled.
- **`next lint` and the `eslint` config key were removed.** Linting is a separate
  `npm run lint`, enforced by the pre-commit hook and by CI.
- **`images.qualities` defaults to `[75]`.** A `quality` outside the configured
  list is silently coerced.

## Tailwind v4

- No `tailwind.config.js`. Tokens live in `@theme inline { … }` in `globals.css`.
- `@theme inline` keeps the `var()` reference in the output, which is what lets
  `bg-page` follow the theme at runtime instead of being frozen at build time.
- The v3 shorthand `bg-[--my-var]` is gone. Register the token instead.
- Theming uses `light-dark()` with `color-scheme`, so each colour pair is
  declared once. `[data-theme]` pins it; the OS setting is the default.

## Security invariants

Breaking one of these is a vulnerability, not a style regression:

1. **No token in `localStorage` or `sessionStorage`, ever.** An ESLint rule
   blocks it, `src/lib/storage.ts` is the only module allowed near web storage,
   and `npm run scan:secrets` fails on a token-shaped key in the built bundle.
2. **`process.env` is read in exactly one place** — `src/lib/env.ts`. See
   decision 3 below.
3. **`npm run build && npm run scan:secrets`** before any release. Server and
   client code share one tree now, so an accidental import crosses that boundary
   silently rather than failing to resolve — this matters more than it did under
   the workspace split, not less.

## Testing

- Vitest config is `vitest.config.mts` — the `.mts` extension is required for the
  native ESM config loader.
- `vitest.setup.ts` stubs `matchMedia`, `HTMLDialogElement.showModal` and
  `IntersectionObserver`; jsdom implements none of them, and `Modal`/`Sheet` are
  built on native `<dialog>`. It also dispatches `cancel` on Escape — without
  that, "Esc does not close a non-dismissible dialog" passes vacuously.
- Vitest 5 uses rolldown. On "Cannot find native binding", install
  `@rolldown/binding-win32-x64-msvc` at the version matching `rolldown` — an npm
  optional-dependency bug, not a project one.
- Playwright runs Chromium, Firefox, WebKit and mobile Safari. Run it: the
  engine-specific failures below were all invisible in Chromium.

---

# Decisions that must not be silently reversed

Each is a deliberate trade with a non-obvious failure mode, and each is protected
by a test. If you are about to change one, read the reasoning first — the change
will look like an improvement.

## 1. The CSP is static, and `script-src` carries `unsafe-inline`

This is the least comfortable decision in the codebase, so here is exactly what
was measured.

v1 used a nonce CSP. A nonce must be unique per response, so the HTML had to be
generated per request, so it could never be shared-cached — which is precisely
what static rendering exists to enable. v2 requires static recipe pages, so the
nonce had to go.

The intended replacement was a **hash-based** policy over the one inline script.
It was implemented and tested in a real browser, and it does not work with the
App Router, for two independent reasons:

1. `'strict-dynamic'` **disables host-based allow-listing**, so `'self'` stops
   permitting `/_next/static/chunks/*.js`. Under a nonce, trust propagates from
   the nonced bootstrap to the chunks it loads. A hash on an unrelated script
   propagates nothing, and every chunk is blocked.
2. Next emits inline flight scripts (`self.__next_f.push(...)`) whose content
   varies per page and per build. Four distinct hashes were demanded on the home
   page alone. They cannot be enumerated when a static header is built.

A second attempt kept the theme-script hash _alongside_ `'unsafe-inline'`.
**A browser ignores `'unsafe-inline'` when a hash or nonce is present in the same
directive**, so that silently reactivated the broken policy and the page rendered
as a bare "Loading". Also observed, not theorised.

So the real options are:

| policy                   | script integrity | static caching      |
| ------------------------ | ---------------- | ------------------- |
| nonce + per-request HTML | strong           | none                |
| hash only                | —                | does not run at all |
| `'self' 'unsafe-inline'` | none for inline  | yes                 |

The third is in force. The honest cost: an injected inline `<script>` would
execute. What still holds: no `unsafe-eval`, `object-src 'none'`,
`base-uri 'none'`, `frame-ancestors 'none'`, `connect-src` naming only this
origin, and React escaping every interpolated value.

**⚠ If nonce CSP is ever reintroduced:** nonce-bearing HTML must never carry
`s-maxage`, `public` or `stale-while-revalidate`. A CDN-cached nonce served to
thousands of visitors is worth roughly `unsafe-inline`.

### 1b. The cache split runs in both directions

- **Public** (`/`, `/discover`, `/recipes/*`) — shared-cacheable, and must **not**
  carry `no-store`. Adding it disables the CDN silently and costs every visitor a
  full origin render.
- **Private** (`/profile`, `/favorites`, `/my-cafe`, `/welcome`, auth) —
  `private, no-store`. A shared cache holding one serves one person's favourites
  to the next visitor.

Guarded by `src/lib/security-headers.test.ts`, verified by sabotaging each
direction.

### 1c. `proxy.ts` matches only private routes

Anything the proxy matches is routed through a function before it can be served
from the CDN's static cache. A matcher of `/:path*` would quietly undo the static
rendering above while every header still looked correct.

### 1d. `upgrade-insecure-requests` keys on `VERCEL`, not `NODE_ENV`

On a plain-HTTP origin it rewrites every subresource to `https://`, finds no TLS
listener, and the page renders completely unstyled. Chromium and Firefox mask
this by exempting loopback; **WebKit does not**. This bug has now been introduced
and caught twice — once in Phase 1.5, once when the CSP moved to a static header
and `isSecure` quietly came to mean "built for production".

## 2. `minPoolSize: 0`, and one shared `MongoClient`

`minPoolSize: 5` is right for a long-lived process and catastrophic on Vercel.
There is no single process — there are as many function instances as concurrency
demands, each with its own module scope and its own pool. Five warm sockets
across a hundred instances is **five hundred connections**, and an Atlas shared
tier caps at 500. The failure is not a clean refusal: it appears as random
connection errors under load and reads like an application bug.

So: many small pools that release, not few warm ones that hold.

- The **promise** is cached, not the resolved connection — two requests racing a
  cold start would otherwise both open a pool.
- A rejected promise is evicted, or the instance can never recover from a
  transient blip.
- The cache lives on `globalThis`, because a module-scoped variable does not
  survive Next's hot-reload re-evaluation.
- `bufferCommands: false`, so a query issued before the connection is ready fails
  immediately instead of hanging the function until the platform kills it.
- **`getClient()` exists so Better Auth reuses this pool.** Letting its adapter
  open its own client would double every instance's connection count — the exact
  arithmetic this decision exists to control.

## 3. `process.env` is read in exactly one place

An unset variable in a `.env` file is an **empty string**, not `undefined`, so
`??` passes it through as though it were configuration. That produced a Next
rewrite destination of `/api/:path*` — pointing at itself — and every API call
404'd with nothing logged.

`src/lib/env.ts` parses at module load with `.min(1)` on every required string.
An ESLint rule bans `process.env` everywhere else. The schema lives separately in
`env.schema.ts` so tests exercise the real rules without parsing against whatever
`.env.local` the machine happens to have.

Related: `.url()` accepts `mongodb+srv://` — a scheme with no host is a valid URL
— so `MONGODB_URI` checks for a host explicitly.

## 4. The focus ring is two-tone, and not themed

`--color-focus` (espresso) banded by `--color-focus-halo` (latte), drawn by one
`:focus-visible` rule in `globals.css`.

**Components must never declare their own focus outline.** A local
`focus-visible:outline-*` utility outranks the base rule and silently drops the
halo — the half that makes the ring visible on dark surfaces.

Why two tones: a ring can land on anything, and no single colour clears 3:1
against every surface. Measured failures from the attempts that came first — a
themed pair gave 2.66:1 light / 1.38:1 dark on the inverse surface, and a single
caramel gave **1.44:1 on the dark-theme primary button**, so tabbing onto the main
call to action showed no ring at all. Scanned across the entire luminance range,
espresso-banded-by-latte always leaves one tone at **≥3.48:1**.

## 5. Design tokens are measured, not eyeballed

The raw brand palette does not meet AA. Against the cream backgrounds, Caramel
`#C68B59` is **2.71:1** and Muted `#8B7D74` is **3.72:1**.

- `--color-accent` is the decorative fill. **Never text, never a meaningful
  graphic** — 2.83:1 on a card.
- `--color-accent-text` is the legible one.
- `--color-accent-line` is the 3:1 UI-boundary variant. Borders, indicators,
  rating stars.

`src/theme/contrast.test.ts` reads the real `globals.css` and covers **both
halves of every `light-dark()` pair** — 81 assertions. Adding a colour pairing to
the UI means adding a row.

## 6. Dialogs restore focus manually, because Safari does not

Chromium and Firefox return focus to the element that opened a `<dialog>`. Safari
does not when `close()` is called programmatically — focus falls to `<body>`,
stranding a keyboard user at the top of the page. `useNativeDialog` restores it,
but only after checking the engine did not.

Also: **Safari does not focus a button on click** (macOS convention). A test for
focus restoration must open the dialog from the keyboard, or it asserts something
that cannot happen.

## 7. Control characters use `\p{Cc}`, never a literal range

`src/lib/validation/common.ts` uses the Unicode property escape. An explicit
`\u0000-\u001F` range put **real control bytes, including NUL, into the source
file** — invisible in a diff, surviving copy-paste, caught only when something
happened to lint that file.

## 8. The service worker has no build step, and no precache manifest

`public/sw.js` is a plain static file. The obvious alternative — a build plugin
emitting a manifest of hashed chunks — has to be written _after_ `next build`
but read _from_ `public/`, which Vercel uploads from the build. The window is
wrong in both directions, and the failure is a worker that precaches URLs which
404; `install` treats that as fatal, so the worker never activates and offline
silently does nothing.

Instead it discovers its own asset list: it fetches the pages it wants to serve
offline, then reads the `/_next/static/...` and `/_next/image?...` URLs back out
of that HTML. Whatever the build emitted is by definition what the HTML
references. The page list comes from `/sitemap.xml`, which is already generated
from `RECIPE_SEED`, so "every recipe" cannot drift from "every recipe cached".

- `cache.addAll` is **not** used. It rejects the whole batch on one failure, and
  a rejected install leaves the worker permanently unactivated. One missing
  chunk should cost that chunk, not offline support.
- Navigations are **network-first**. Cache-first would serve a stale recipe to
  an online visitor; these pages are CDN-cached already, so the network path is
  fast and the cache is the fallback.
- `/_next/image` misses fall back to **any cached width of the same source**.
  `next/image` picks a width from DPR and viewport, so the URL requested offline
  is frequently not the one precached; without this the photograph is simply
  absent.
- Private routes are skipped by prefix **and** any response carrying `no-store`
  or `private` is refused. Two checks, because the first is a list and lists go
  stale. `src/lib/service-worker.test.ts` asserts the list still matches
  `PRIVATE_ROUTE_PREFIXES`.

Measured: 25/25 recipe pages plus `/` and `/discover` render styled with the
network disabled, after a single load of `/`.

## 9. `prefetch` policy is `false` or `undefined` — never `true`

`src/lib/prefetch.ts` owns this, and the distinction is easy to get backwards:

| value       | behaviour                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------- |
| `undefined` | static route prefetched in full; **dynamic** route only to the nearest `loading` boundary |
| `true`      | full route prefetched **even when dynamic**                                               |
| `false`     | never, on viewport or hover                                                               |

So `prefetch={!isPrivate(href)}` is not "leave public links alone" — it is an
upgrade from auto to full. `/discover` is dynamic, and that spelling turned its
prefetch into a **28 KB** `text/x-component` response occupying 341-820 ms of a
throttled mobile load of the home page. This was introduced and caught inside one
session; `src/lib/prefetch.test.ts` asserts the public case is `undefined` and
explicitly not `true`.

Private routes get `false`: they answer `private, no-store` and render per
session, so the payload is not reusable, and prefetching them pointed a
signed-out visitor's browser at `/profile`, `/favorites`, `/my-cafe` and
`/register` on every page load — eight requests per load of `/`, now zero.

---

# What the serverless port deleted

Phase 1.5 was written against the v1 architecture. Roughly half of it became
architecture-dead when the project moved to one Next app.

| Phase 1.5 task                      | Fate                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — nonce CSP cache guard           | **Inverted**, not deleted. See decision 1.                                                                                                                        |
| 2 — region pinning, pooling         | Kept; pool settings corrected for serverless.                                                                                                                     |
| 3 — liveness/readiness split        | **Deleted.** A Vercel function has no process for a liveness probe to kill and nothing to report readiness to.                                                    |
| 4 — contrast audit                  | Kept, untouched. Protected suite.                                                                                                                                 |
| 5 — dialog scroll lock, transitions | Kept, untouched. Protected suite.                                                                                                                                 |
| 6 — workspace build strategy        | **Deleted.** There is no second package to build.                                                                                                                 |
| 7 — CSRF, cookie topology           | **Deleted.** Better Auth owns sessions, CSRF and rotation; running our own alongside it would give the app two session mechanisms that agree only by coincidence. |
| 8 — spec amendments doc             | **Deleted.** It amended v1 sections that no longer exist.                                                                                                         |

Everything deleted is recoverable at tag **`v1-express-final`**.

Tests: 200 → 198. Removed 31 Express tests (app 10, csrf 15, health 6) and 13
nonce-guard tests; added 42 (env 9, db 8, security-headers 25).

## Regenerating package-lock.json

**Use npm 11.20.0 or newer, and delete `node_modules` first.**

```bash
rm -rf node_modules package-lock.json
npx npm@11.20.0 install
```

Two separate failures come from getting this wrong, and both are invisible on
Windows while breaking Linux CI at `npm ci` in about fifteen seconds:

1. **Regenerating with `node_modules` present** makes npm read the existing tree
   instead of re-resolving, so it records only the _host platform's_ optional
   binaries. `@tailwindcss/oxide` declared 12 platform packages and the lockfile
   held 1. Linux CI then cannot find
   `tailwindcss-oxide.linux-x64-gnu.node` and the build dies.

2. **npm 11.5.1 writes lockfiles it then rejects.** After a full clean install it
   omitted nested duplicate versions — `ajv@6.15.0` under both `eslint` and
   `@eslint/eslintrc` — and its own `npm ci` failed with
   `Missing: ajv@6.15.0 from lock file`. npm 11.20.0 records all three copies.

Do **not** patch around this by pinning individual platform binaries in
`optionalDependencies` or forcing versions through `overrides`. That was tried
three times (rolldown, then lightningcss, then oxide would have been next); each
pin fixes one package and leaves the cause in place, and the rolldown pins
froze 1.2.9 while the tree had moved to 1.2.11. A correctly generated lockfile
carries **54 linux packages** and needs no pins at all.

CI is the check that catches this — it runs `npm ci` on Linux, which is the only
place the gap is visible.

## Verify, don't assume

The standard is _"do not claim functionality works without testing it."_ Run it
and look: `npm run build && npm run start`, then the `browser-automation` skill
for the console report and the accessibility tree.

That is how the contrast failures, the NUL bytes, the missing-CSP-under-curl bug,
the WebKit `upgrade-insecure-requests` failure (twice), the hash-CSP
incompatibility, the ignored-`unsafe-inline` trap, the self-referential rewrite
and the stale secret-scanner path were all found. None of them showed up in a
typecheck, a lint, or a passing build.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
