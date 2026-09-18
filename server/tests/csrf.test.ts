import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, REFRESH_COOKIE_NAME } from '@cafera/shared';
import { createApp } from '../src/app.js';
import { createCsrfToken, csrfProtection } from '../src/middleware/csrf.middleware.js';
import {
  clearSessionCookies,
  describeRefreshCookie,
  isThirdPartyCookieConfiguration,
  setCsrfCookie,
  setRefreshCookie,
} from '../src/utils/cookies.js';
import { errorHandler } from '../src/middleware/error.middleware.js';

/**
 * CSRF is the control that stops a page on another origin acting as a
 * logged-in user. The cookie is attached by the browser to requests the user
 * never made, so without this every state-changing endpoint is reachable from
 * any website the user happens to visit while signed in.
 *
 * These tests use a small harness rather than the real routes, because the auth
 * endpoints do not exist yet — the point is to have the protection in place and
 * proven *before* Phase 2 builds the pages that depend on it.
 */

/** A minimal app that exercises only the CSRF gate. */
function harness() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(csrfProtection);

  app.post('/change', (_req, res) => {
    res.status(200).json({ success: true, data: { changed: true } });
  });
  app.get('/read', (_req, res) => {
    res.status(200).json({ success: true, data: { read: true } });
  });

  app.use(errorHandler);
  return app;
}

const app = harness();
const token = createCsrfToken();
const cookie = `${CSRF_COOKIE_NAME}=${token}`;

describe('forged cross-origin requests are rejected', () => {
  it('rejects a state-changing request the browser reports as cross-site', async () => {
    /* This is the attack: evil.example submits a form, the browser attaches the
       session cookie, and without this check the request succeeds. */
    const response = await request(app)
      .post('/change')
      .set('Sec-Fetch-Site', 'cross-site')
      .set('Origin', 'https://evil.example')
      .set('Cookie', cookie)
      .set(CSRF_HEADER_NAME, token)
      .send({ name: 'attacker' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an unknown Origin even when Sec-Fetch-Site is absent', async () => {
    // Older browsers send Origin but not Sec-Fetch-Site.
    const response = await request(app)
      .post('/change')
      .set('Origin', 'https://evil.example')
      .set('Cookie', cookie)
      .set(CSRF_HEADER_NAME, token)
      .send({});

    expect(response.status).toBe(403);
  });

  it('rejects a request carrying the cookie but no header', async () => {
    /* The heart of double-submit: a cross-origin page can make the browser SEND
       the cookie, but cannot READ it, so it cannot produce the header. */
    const response = await request(app).post('/change').set('Cookie', cookie).send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_FAILED');
  });

  it('rejects a header that does not match the cookie', async () => {
    const response = await request(app)
      .post('/change')
      .set('Cookie', cookie)
      .set(CSRF_HEADER_NAME, createCsrfToken())
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_FAILED');
  });

  it('rejects a guessed header when no cookie is present at all', async () => {
    const response = await request(app)
      .post('/change')
      .set(CSRF_HEADER_NAME, createCsrfToken())
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_FAILED');
  });
});

describe('legitimate requests succeed', () => {
  it('accepts a same-origin request with a matching token', async () => {
    const response = await request(app)
      .post('/change')
      .set('Sec-Fetch-Site', 'same-origin')
      .set('Cookie', cookie)
      .set(CSRF_HEADER_NAME, token)
      .send({ name: 'Sam' });

    expect(response.status).toBe(200);
    expect(response.body.data.changed).toBe(true);
  });

  it('accepts same-site, which is what the proxy topology produces', async () => {
    const response = await request(app)
      .post('/change')
      .set('Sec-Fetch-Site', 'same-site')
      .set('Cookie', cookie)
      .set(CSRF_HEADER_NAME, token)
      .send({});

    expect(response.status).toBe(200);
  });

  it('lets safe methods through without a token', async () => {
    // GET must not change state, so a forged one accomplishes nothing — and
    // requiring a token would break every ordinary page load.
    const response = await request(app).get('/read');
    expect(response.status).toBe(200);
  });
});

describe('every state-changing API route is protected by default', () => {
  it('applies the gate at the /api mount, not per route', async () => {
    const realApp = createApp();

    /* An endpoint that does not exist still has to pass CSRF before it can 404.
       That ordering is the proof: protection is inherited by anything mounted
       under /api rather than remembered route by route. */
    const response = await request(realApp)
      .post('/api/some/future/endpoint')
      .set('Origin', 'https://evil.example')
      .send({});

    expect(response.status).toBe(403);
  });

  it('leaves health probes reachable, since they carry no cookies', async () => {
    const realApp = createApp();
    const response = await request(realApp).get('/api/health/live');
    expect(response.status).toBe(200);
  });
});

describe('cookie attributes', () => {
  function captureCookies(set: (res: express.Response) => void): string[] {
    const captured: string[] = [];
    const res = {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        const parts = [`${name}=${value}`];
        if (options.httpOnly) parts.push('HttpOnly');
        if (options.secure) parts.push('Secure');
        if (options.sameSite) parts.push(`SameSite=${String(options.sameSite)}`);
        if (options.path) parts.push(`Path=${String(options.path)}`);
        captured.push(parts.join('; '));
        return this;
      },
      clearCookie(name: string, options: Record<string, unknown>) {
        captured.push(`CLEAR ${name} Path=${String(options.path)}`);
        return this;
      },
    } as unknown as express.Response;

    set(res);
    return captured;
  }

  it('makes the refresh cookie unreadable to JavaScript and scoped to the auth routes', () => {
    const [refresh] = captureCookies((res) => setRefreshCookie(res, 'token-value'));

    // httpOnly is the whole defence against an XSS exfiltrating the session.
    expect(refresh).toContain('HttpOnly');
    expect(refresh).toContain(`Path=/api/auth`);
    expect(refresh).toContain(REFRESH_COOKIE_NAME);
  });

  it('makes the CSRF cookie readable, because double-submit depends on it', () => {
    const [csrf] = captureCookies((res) => setCsrfCookie(res, 'csrf-value'));

    expect(csrf).not.toContain('HttpOnly');
    expect(csrf).toContain(CSRF_COOKIE_NAME);
  });

  it('clears both cookies on logout, never just one', () => {
    const cleared = captureCookies((res) => clearSessionCookies(res));
    expect(cleared).toHaveLength(2);
    expect(cleared.join(' ')).toContain(REFRESH_COOKIE_NAME);
    expect(cleared.join(' ')).toContain(CSRF_COOKIE_NAME);
  });

  it('never produces a third-party cookie configuration', () => {
    /* SameSite=None would make the refresh cookie third-party, which Safari's
       ITP blocks outright and Firefox blocks under Total Cookie Protection.
       Login would appear to work and the session would silently not persist. */
    expect(isThirdPartyCookieConfiguration()).toBe(false);
    expect(describeRefreshCookie()).not.toContain('SameSite=None');
  });

  it('documents its own attribute string, so the README cannot drift', () => {
    const described = describeRefreshCookie();
    expect(described).toContain('HttpOnly');
    expect(described).toContain('Path=/api/auth');
    expect(described).toMatch(/SameSite=(Lax|Strict)/);
  });
});
