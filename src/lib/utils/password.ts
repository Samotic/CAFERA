import { PASSWORD_MIN_LENGTH } from '../constants/limits';

/**
 * Password strength scoring for the registration meter.
 *
 * This is user guidance, not a security control — the server enforces the real
 * rules through `passwordSchema`. It lives in `shared` so the meter can never
 * congratulate a password the server would go on to reject.
 */

export const PASSWORD_STRENGTH_LEVELS = ['weak', 'fair', 'good', 'strong'] as const;
export type PasswordStrengthLevel = (typeof PASSWORD_STRENGTH_LEVELS)[number];

export interface PasswordStrength {
  /** 0-4, suitable for driving a four-segment meter. */
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  /** The single most useful next improvement, or `null` once the password is strong. */
  hint: string | null;
}

/** Shapes that look complex but appear in every cracking dictionary. */
const COMMON_PATTERNS: readonly RegExp[] = [
  /^(.)\1+$/,
  /^(?:012|123|234|345|456|567|678|789|890)+/,
  /(?:password|qwerty|letmein|welcome|admin|coffee123|iloveyou)/i,
];

export function scorePassword(password: string): PasswordStrength {
  const value = password ?? '';

  if (value.length === 0) {
    return { score: 0, level: 'weak', label: 'Enter a password', hint: null };
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9]/.test(value);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const looksCommon = COMMON_PATTERNS.some((pattern) => pattern.test(value));

  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (classes >= 3) score += 1;
  if (value.length >= 16 || (classes === 4 && value.length >= 12)) score += 1;
  if (looksCommon) score = Math.min(score, 1);

  score = Math.max(0, Math.min(4, score));

  const hint = buildHint({ value, hasDigit, classes, looksCommon });
  const level = PASSWORD_STRENGTH_LEVELS[Math.max(0, score - 1)] ?? 'weak';
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

  return { score, level, label, hint };
}

function buildHint(input: {
  value: string;
  hasDigit: boolean;
  classes: number;
  looksCommon: boolean;
}): string | null {
  if (input.looksCommon) return 'Avoid common words and repeated characters';
  if (input.value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!input.hasDigit) return 'Add at least one number';
  if (input.value.length < 12) return 'Longer passwords are much harder to guess';
  if (input.classes < 3) return 'Mix uppercase, lowercase and symbols';
  return null;
}
