import type { PublicUser } from './user';

/**
 * Authentication request shapes.
 *
 * What is deliberately absent: `accessToken`, `expiresIn`, `csrfToken` and
 * `AccessTokenClaims`. Those described a hand-rolled JWT scheme that Better
 * Auth replaces in Phase 3 — it owns session issuance, storage, CSRF and
 * rotation, and a second set of token types sitting beside it would be two
 * session models that agree only by coincidence.
 *
 * The form shapes below survive because they describe what a *user* submits,
 * which is the same question regardless of what validates it. Each is the
 * inferred output of a schema in `@/lib/validation/auth`, so the schema stays
 * the source of truth.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

/**
 * Forgot-password always resolves to an identical response whether or not the
 * address exists, so the endpoint cannot be used to enumerate accounts.
 */
export interface MessageResponse {
  message: string;
}

/** What a signed-in session exposes to the UI. Better Auth supplies it. */
export interface SessionUser {
  user: PublicUser;
}
