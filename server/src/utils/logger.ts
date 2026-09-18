import pino from 'pino';
import { env, isDevelopment, isTest } from '../config/env.js';

/**
 * Structured logging.
 *
 * The redaction list is the important part. Pino serialises whole objects, so a
 * single `logger.info({ req })` would otherwise write an Authorization header or
 * a refresh cookie straight into the log file — where it is retained, shipped to
 * a log aggregator, and readable by anyone with dashboard access. Everything
 * credential-shaped is stripped before it is written.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  'password',
  'confirmPassword',
  'currentPassword',
  '*.password',
  '*.confirmPassword',
  'accessToken',
  'refreshToken',
  '*.accessToken',
  '*.refreshToken',
  'token',
  'body.password',
  'body.confirmPassword',
  'body.token',
];

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  /* Human-readable in development; newline-delimited JSON everywhere else, so
     log aggregators can parse it. */
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
  base: { service: 'cafera-api' },
});

export type Logger = typeof logger;
