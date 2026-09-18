# CAFERA — working notes

Context for anyone (human or agent) picking this repository up. Conventions and
gotchas that are not obvious from the code, and that are expensive to rediscover.

## Layout

npm workspaces: `shared/` → `server/` + `web/`.

`shared/` compiles to `dist/` and the other two import it from there, so
**`npm run build -w @cafera/shared` must run before anything else typechecks.**
A fresh clone that skips it gets a wall of unresolved-import errors.

## Next.js 16 — differs from Next 14/15 in ways that matter

The installed version is 16.3.5. Its own docs ship at
`web/node_modules/next/dist/docs/` — read those rather than trusting recall.

- **`middleware.ts` is now `proxy.ts`**, and the exported function is `proxy`,
  not `middleware`. The edge runtime is not supported there; `proxy` runs on
  Node. Config flags renamed too (`skipMiddlewareUrlNormalize` →
  `skipProxyUrlNormalize`).
- **`params` and `searchParams` are Promises**, as are `cookies()`, `headers()`
  and `draftMode()`. Synchronous access was removed, not deprecated. Use the
  generated `PageProps<'/route'>` / `LayoutProps<'/route'>` helpers
  (`npx next typegen`).
- **`revalidateTag` takes a second argument** — a `cacheLife` profile.
  `revalidateTag('recipes')` alone is a type error; use
  `revalidateTag('recipes', 'max')`, or `updateTag` for immediate expiry.
- **`cacheLife` and `cacheTag` are stable** — drop the `unstable_` prefix.
- **PPR is now `cacheComponents: true`**, not `experimental.ppr`. Not enabled here.
- **`next lint` and the `eslint` key in `next.config.ts` were removed.** Linting
  is a separate `npm run lint`, enforced by the pre-commit hook and CI.
- **`images.qualities` defaults to `[75]`** and `imageSizes` no longer includes 16. Passing a `quality` outside the configured list silently coerces it.
- **Scroll behaviour is no longer overridden** during navigation unless
  `<html data-scroll-behavior="smooth">` is set. It is set in the root layout.

## Tailwind v4

- No `tailwind.config.js`. Tokens are declared in `@theme inline { … }` inside
  `src/app/globals.css`.
- `@theme inline` keeps the `var()` reference in the output, which is what lets
  `bg-page` follow the theme at runtime instead of being frozen at build time.
- The v3 shorthand `bg-[--my-var]` is gone. Use `bg-[var(--my-var)]`, or better,
  register the token so a plain utility name works.
- Theming uses `light-dark()` with `color-scheme`, so each colour pair is
  declared once. `[data-theme]` pins it; the OS setting is the default.

## Design tokens — read before touching colours

Components reference **semantic** tokens (`bg-page`, `text-text-muted`,
`border-border-strong`), never brand colours directly.

The raw brand palette does not meet AA on its own, and this is measured, not
assumed. Against the cream backgrounds: **Caramel `#C68B59` is 2.71:1** and
**Muted `#8B7D74` is 3.72:1** — both fail for body text. So:

- `--color-accent` is the decorative caramel **fill**. **Never use it for text,
  and never for a meaningful graphic** — it measures 2.83:1 on a card, which is
  below the 3:1 that WCAG 1.4.11 asks of one.
- `--color-accent-text` (`#8B613E` / `#D9A978`) is the legible one — 4.5:1+.
- `--color-accent-line` (`#AE7A4E` / `#C68B59`) is the 3:1 UI-boundary variant.
  Use it for borders, indicators and graphics like the rating stars.

**`npm test -w web` runs the full audit** (`src/theme/contrast.test.ts`). It reads
the real `globals.css`, so it measures what ships, and it covers **both halves of
every `light-dark()` pair**. Adding a new colour pairing to the UI means adding a
row to its table.

### The focus ring is two-tone, and not themed

`--color-focus` (espresso) is banded by `--color-focus-halo` (latte), drawn by a
single `:focus-visible` rule in `globals.css`.

**Components must never declare their own focus outline.** A local
`focus-visible:outline-*` utility outranks the base rule and silently drops the
halo — which is the half that makes the ring visible on dark surfaces.

The reason it is two tones: a focus ring can land on anything, and no single
colour clears 3:1 against every surface. Measured failures from the attempts that
came first — a themed pair gave 2.66:1 light / 1.38:1 dark on the inverse
surface, and a single caramel gave **1.44:1 on the dark-theme primary button**, so
tabbing onto the main call to action showed no ring at all. Scanned across the
entire luminance range, espresso-banded-by-latte always leaves one tone at
**≥3.48:1**.

## Security invariants

These are not style preferences. Breaking one is a vulnerability:

1. **No token in `localStorage` or `sessionStorage`, ever.** Access token in
   memory, refresh token in an httpOnly cookie. An ESLint rule blocks it;
   `web/src/lib/storage.ts` is the only module allowed near web storage and its
   key list is exhaustive.
2. **Identity comes from the verified JWT only.** No handler reads a user id
   from a request body or query string.
3. **`process.env` is read in exactly three places** — `config/env.ts`,
   `server.ts` and the test setup. Everywhere else imports the validated `env`
   object. An ESLint rule enforces this.
4. **Never log a credential.** The pino redaction list in `utils/logger.ts`
   covers headers, cookies and password/token fields. Extend it when adding a
   field, don't work around it.
5. **`npm run build` then `node scripts/check-bundle-secrets.mjs`** before any
   release. It fails on secret-shaped strings and on a hardcoded localhost URL
   in a production bundle.

## Server conventions

- Express 5: async errors propagate automatically — no `asyncHandler` wrapper
  needed. Route wildcards changed syntax (`/*splat`, not `*`).
- `express-mongo-sanitize` is **incompatible** with Express 5 because `req.query`
  is a getter. `middleware/sanitize.middleware.ts` replaces it by mutating the
  parsed objects in place.
- Throw `ApiError`; never format an error response inside a handler. The single
  error middleware translates zod, Mongoose, duplicate-key, cast, body-parser and
  multer failures into the one envelope.
- Controllers parse and respond. Services decide. Business logic in a route
  handler is a bug in the layering.

## Testing

- `shared` and `server` use Vitest with the config named `vitest.config.mts` —
  the `.mts` extension is required for the native ESM config loader.
- Server tests are hermetic: `envDir: './tests'` stops Vite injecting a
  developer's real `.env`. A suite that passes only on one machine is not a test.
- `vitest.setup.ts` in `web/` stubs `matchMedia`, `HTMLDialogElement.showModal`
  and `IntersectionObserver` — jsdom implements none of them, and `Modal`/`Sheet`
  are built on native `<dialog>`.
- Vitest 5 uses rolldown. If it fails with "Cannot find native binding", install
  `@rolldown/binding-win32-x64-msvc` at the version matching `rolldown` — an npm
  optional-dependency bug, not a project one.

## Decisions that must not be silently reversed

Each of these is a deliberate trade with a non-obvious failure mode. Each is
protected by a test that will fail if it is undone. If you are about to change
one, read the reasoning first — the change will look like an improvement.

### 1. Nonce-bearing HTML is never shared-cached

CAFERA serves a nonce-based CSP with no `unsafe-inline` on `script-src`. A nonce
is only a control while it is unique per response, so:

- HTML is generated per request. **No literal ISR or `generateStaticParams` on
  recipe pages** while this policy stands. ISR's intent lives one layer down —
  recipe reads are cached and tag-invalidated.
- Document responses carry `private, no-store, must-revalidate`, applied
  unconditionally in `proxy.ts`, never opted into per route.
- **Never add `s-maxage`, `public` or `stale-while-revalidate` to a document
  response.** The CDN would cache the nonce with the HTML and serve one nonce to
  thousands of visitors. Nothing breaks, the header still looks right, and the
  policy becomes worth roughly `unsafe-inline`.

If static HTML is wanted later, the correct trade is a **hash-based CSP** for the
known inline scripts — not caching the nonce.

Guarded by `web/src/proxy.test.ts`. Assets, JSON and images are unaffected and
should stay aggressively cacheable; they are excluded by `config.matcher`.

### 2. `isDocumentRequest` fails closed

A client that sends no `Sec-Fetch-Dest` gets the CSP anyway. An earlier version
treated "cannot tell" as "not a document", and curl received no policy at all —
a security header a request can opt out of by saying less is not a security
header. Only positively identified non-documents (RSC payloads, `sec-fetch-dest`
of `image`/`script`/etc.) are skipped.

### 3. Cookie topology: same-origin via the Next proxy

The browser only ever talks to the web origin. `/api/*` is rewritten by Next
(`next.config.ts`) to the Express service, so every request is first-party.

**Do not move to a cross-site split** (frontend on `*.vercel.app`, API on
`*.railway.app`). That forces `SameSite=None`, making the refresh cookie a
third-party cookie — blocked outright by Safari's ITP and by Firefox's Total
Cookie Protection. Login appears to succeed and the session silently fails to
persist for a large share of real users, on browsers you are unlikely to be
developing in. A test asserts `isThirdPartyCookieConfiguration()` stays false.

Consequences that follow:

- Refresh cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth`. Strict is
  only viable _because_ everything is same-origin.
- CSRF: `csrfProtection` is mounted once at `/api`, so a new endpoint is
  protected by default rather than protected if someone remembers. Two
  independent checks — an `Origin`/`Sec-Fetch-Site` test, and a double-submit
  token compared in constant time.
- Health is mounted **before** the CSRF gate: probes carry no cookies.

One trap worth knowing: an unset variable in a `.env` file is an **empty
string**, not `undefined`, so `??` passes it straight through. That produced a
rewrite destination of `/api/:path*` pointing at itself, and every API call
404'd against the Next app. Use a non-empty check, not `??`.

### 4. `upgrade-insecure-requests` only on a genuinely secure origin

`proxy.ts` gates that directive on the actual protocol (or `x-forwarded-proto`),
never on `NODE_ENV`. On a plain-HTTP origin it rewrites every subresource URL to
`https://`, there is no TLS listener to reach, and **every stylesheet, script and
font fails with an SSL error** — the page renders completely unstyled.

Chromium and Firefox hide this by exempting loopback addresses. **WebKit does
not**, so gating on `NODE_ENV` made the production build untestable in Safari.
Found by the cross-browser Playwright run; invisible in the other two engines.

### 5. Dialogs restore focus manually, because Safari does not

Chromium and Firefox return focus to the element that opened a `<dialog>`.
Safari does not when `close()` is called programmatically — focus sits on the
dialog's close button briefly and then falls to `<body>`, stranding a keyboard
user at the top of the page.

`useNativeDialog` restores it, but only after checking the engine did not
already do so. Focusing unconditionally would fight the browsers that get it
right and would yank focus from wherever the user has since moved it.

Related Safari behaviour worth knowing: **Safari does not focus a button on
click** (macOS convention). So a mouse user there never had focus on the
trigger, and tests for focus restoration must open the dialog from the keyboard
or they assert something that cannot happen.

### 6. Components never declare their own focus outline

See the design-token section above. A local `focus-visible:outline-*` utility
outranks the base rule and silently drops the halo.

### 7. Control characters are matched with `\p{Cc}`, never a literal range

`shared/src/schemas/common.ts` uses the Unicode property escape. An explicit
`�-` range put **real control bytes, including NUL, into the source
file** — invisible in a diff, surviving copy-paste, and caught only when
something happened to lint that file.

## Verify, don't assume

The specification's standard is _"do not claim functionality works without
testing it."_ Run it and look: `npm run build && npm run start -w web`, then the
`browser-automation` skill for the console report and the accessibility tree.
That is how the contrast failures, the redundant logo link, the NUL bytes in
`common.ts` and the missing-CSP-under-curl bug were all found — none of them
showed up in a typecheck, a lint or a passing build.
