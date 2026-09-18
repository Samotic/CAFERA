import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, isProduction, isTest } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { sanitizeRequest } from './middleware/sanitize.middleware.js';
import { healthRouter } from './routes/health.route.js';
import { ApiError } from './utils/ApiError.js';
import { logger } from './utils/logger.js';

/**
 * The Express application, assembled in the order the middleware has to run in.
 *
 * The ordering is not cosmetic:
 *   1. Security headers before anything can produce a response.
 *   2. CORS before the body is parsed, so a rejected origin costs nothing.
 *   3. Body limits before parsing, so an oversized payload is refused rather
 *      than buffered into memory.
 *   4. Sanitisation after parsing but before any route sees the values.
 *   5. Rate limiting before routes, so a flood never reaches the database.
 *   6. The error handler last, because Express only recognises a 4-arity
 *      handler registered after the routes it protects.
 */
export function createApp(): Express {
  const app = express();

  /* Trust the first proxy hop so `req.ip` is the client address rather than the
     load balancer's — rate limiting keyed on the balancer's IP would throttle
     every user as if they were one. Left off in development, where a spoofable
     X-Forwarded-For header would be a way to bypass limits entirely. */
  app.set('trust proxy', isProduction ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      /* The frontend is a separate origin and never embeds this API in a
         document, so the strictest possible policy applies here. The page-level
         CSP that governs the site itself is emitted by the web app's proxy. */
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      /* helmet defaults to SAMEORIGIN; this API is never framed at all, so DENY
         is both correct and what §25 requires. */
      frameguard: { action: 'deny' },
      hsts: isProduction ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
    }),
  );

  app.use(
    cors({
      /* An explicit allow-list, never a reflected origin. `credentials: true`
         means the browser will send the refresh cookie, so a permissive origin
         check here would hand any website a logged-in session. */
      origin(origin, callback) {
        // Same-origin and server-to-server requests arrive without an Origin.
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
        logger.warn({ origin }, 'Blocked cross-origin request');
        return callback(ApiError.forbidden('Origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      maxAge: 86_400,
    }),
  );

  if (!isTest) {
    app.use(
      pinoHttp({
        logger,
        /* Health checks fire every few seconds; logging them buries everything
           that matters. */
        autoLogging: { ignore: (req: { url?: string }) => req.url === '/api/health' },
      }),
    );
  }

  app.use(compression());

  /* 100 KB covers the largest legitimate payload (a custom recipe with thirty
     ingredients and thirty steps) with room to spare. Image bytes never travel
     through here — uploads go straight to Cloudinary with a signed request. */
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  app.use('/api', generalLimiter);

  /* Health is mounted BEFORE the CSRF gate: probes are unauthenticated GETs from
     a load balancer that has no cookie jar and no token to present. */
  app.use('/api/health', healthRouter);

  /* Everything below this line is CSRF-protected. Safe methods pass straight
     through; state-changing ones must prove they came from our own origin.
     Mounting it once here rather than per-route means a new endpoint is
     protected by default instead of protected if someone remembers. */
  app.use('/api', csrfProtection);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
