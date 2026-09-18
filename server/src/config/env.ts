import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Environment validation.
 *
 * The process refuses to start if configuration is missing or nonsensical. That
 * is deliberate: a server that boots with an undefined JWT secret will happily
 * sign tokens with the string "undefined", and the failure surfaces months later
 * as a security incident rather than immediately as a crash.
 *
 * Production has stricter rules than development. Secure cookies, real secrets
 * and a non-wildcard CORS list are optional on a laptop and mandatory on the
 * internet, and the schema encodes that difference instead of trusting a
 * deployment checklist.
 */

loadDotenv();

const durationPattern = /^\d+(ms|s|m|h|d)$/;

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PUBLIC_URL: z.url().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.url().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_URI_TEST: z.string().optional(),

  /* 32 bytes of entropy minimum. A short secret is a brute-forceable secret. */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().regex(durationPattern).default('15m'),
  JWT_REFRESH_TTL: z.string().regex(durationPattern).default('30d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).max(15).default(12),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('cafera'),

  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('CAFERA <no-reply@cafera.app>'),

  AI_FEATURE_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-5'),
  AI_MAX_TOKENS: z.coerce.number().int().min(64).max(4096).default(512),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SENTRY_DSN: z.string().optional(),
});

/**
 * Rules that only apply once the service is reachable from the internet. Each
 * one is a mistake that is invisible in development and serious in production.
 */
const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;

  if (!env.COOKIE_SECURE) {
    ctx.addIssue({
      code: 'custom',
      path: ['COOKIE_SECURE'],
      message:
        'COOKIE_SECURE must be true in production — a refresh cookie sent over HTTP is a free session',
    });
  }

  if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
    ctx.addIssue({
      code: 'custom',
      path: ['COOKIE_SAMESITE'],
      message: 'SameSite=None requires Secure=true; browsers reject the combination otherwise',
    });
  }

  if (env.CORS_ORIGINS.includes('*')) {
    ctx.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'A wildcard CORS origin with credentials lets any site act as a signed-in user',
    });
  }

  if (env.CORS_ORIGINS.some((origin) => origin.startsWith('http://'))) {
    ctx.addIssue({
      code: 'custom',
      path: ['CORS_ORIGINS'],
      message: 'Production CORS origins must be https',
    });
  }

  if (env.AI_FEATURE_ENABLED && !env.ANTHROPIC_API_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['ANTHROPIC_API_KEY'],
      message: 'AI_FEATURE_ENABLED is true but no API key is configured',
    });
  }

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message:
        'Access and refresh secrets must differ, or an access token can be replayed as a refresh token',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    /* Print every problem at once rather than one per restart. Only the names
       are logged — never the values, which are the secrets themselves. */
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    console.error('See server/.env.example for the full list of expected variables.\n');
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

/** Cloudinary is optional; uploads degrade to a clear error when it is absent. */
export const hasCloudinary = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
