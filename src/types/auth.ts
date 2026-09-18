import type { PublicUser } from './user';

/**
 * Authentication payloads.
 *
 * The access token is returned in the body and held in memory only. The refresh
 * token never appears here: it is set by the server as an httpOnly cookie and is
 * therefore unreadable to JavaScript by design.
 */
export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  /** Seconds until the access token expires, so the client can refresh proactively. */
  expiresIn: number;
  /** Double-submit CSRF token, mirrored in a readable cookie. */
  csrfToken: string;
}

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
 * Forgot-password always resolves to this identical response whether or not the
 * address exists, so the endpoint cannot be used to enumerate accounts.
 */
export interface MessageResponse {
  message: string;
}

/** Decoded access-token claims. Identity always comes from here, never from the body. */
export interface AccessTokenClaims {
  sub: string;
  role: 'user' | 'admin';
  /** Token family id, used to detect refresh-token reuse. */
  sid: string;
  iat: number;
  exp: number;
}
