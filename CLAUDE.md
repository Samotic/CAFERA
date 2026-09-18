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

- `--color-accent` is the decorative caramel fill. **Never use it for text.**
- `--color-accent-text` (`#8B613E`) is the legible one — 4.5:1+ on every surface.
- `--color-accent-line` (`#AE7A4E`) is the 3:1 UI-boundary variant.

If you add a colour, verify it against `page`, `card` **and** `sunken` before
committing. The existing values were solved for, not eyeballed.

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

## Verify, don't assume

The specification's standard is _"do not claim functionality works without
testing it."_ Run it and look: `npm run build && npm run start -w web`, then the
`browser-automation` skill for the console report and the accessibility tree.
That is how the contrast failures and the redundant logo link above were found.
