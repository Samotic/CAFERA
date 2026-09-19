/**
 * TODO(phase-3): Better Auth.
 *
 * This file is intentionally a placeholder. v2 has **no authentication at all**
 * right now, and that is the correct state rather than a gap: Phase 1 shipped no
 * auth pages, so nothing user-facing depends on it, and a half-built scheme
 * sitting here would be something Phase 3 has to remove before it can start.
 *
 * What was deleted and why it is not coming back in this shape: the v1 build had
 * hand-rolled JWT signing, refresh-token rotation with reuse detection, bcrypt
 * hashing, a double-submit CSRF token and an httpOnly cookie topology. Better
 * Auth owns every one of those. Keeping ours alongside it would give the app two
 * session mechanisms that agree only by coincidence — worse than either alone.
 *
 * When this lands it must:
 *   - take the shared MongoClient from `getClient()` in `@/lib/db`, so the auth
 *     adapter reuses this instance's pool instead of opening a second one;
 *   - read `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` from `@/lib/env`, where the
 *     32-character floor on the secret is already enforced.
 *
 * The recoverable v1 implementation is at tag `v1-express-final`.
 */

export {};
