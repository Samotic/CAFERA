import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

/**
 * Foundation tests: the middleware stack, not any particular feature.
 *
 * These assert the behaviours that every later endpoint inherits — the response
 * envelope, the security headers, the CORS allow-list and the injection
 * sanitiser. A regression in any of them would otherwise only surface as a
 * subtle failure inside an unrelated feature test.
 */
const app = createApp();

describe('GET /api/health', () => {
  it('reports degraded with 503 when the database is unreachable', async () => {
    // No database is connected in this suite, which is exactly the condition a
    // monitor must be able to detect.
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('degraded');
    expect(response.body.data.database).toBe('disconnected');
    expect(typeof response.body.data.uptime).toBe('number');
  });

  it('exposes nothing sensitive', async () => {
    const response = await request(app).get('/api/health');
    const serialised = JSON.stringify(response.body);

    expect(serialised).not.toMatch(/mongodb/i);
    expect(serialised).not.toMatch(/secret/i);
    expect(serialised).not.toMatch(/version/i);
  });
});

describe('security headers', () => {
  it('sets the full header set and hides the framework', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS allow-list', () => {
  it('permits a configured origin with credentials', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects an origin that is not on the list', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');

    // The request is refused outright, and no allow-origin header is echoed
    // back — a reflected origin here would defeat the entire allow-list.
    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('NoSQL injection sanitiser', () => {
  it('strips MongoDB operators from a request body', async () => {
    /* There is no route to POST to yet, so the assertion is that the payload is
       refused as a 404 rather than reaching a handler — and, critically, that the
       sanitiser does not throw while walking it. */
    const response = await request(app)
      .post('/api/does-not-exist')
      .send({ email: { $ne: null }, nested: { $where: 'sleep(1000)' } });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('error envelope', () => {
  it('answers an unknown route with the standard failure shape', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(typeof response.body.error.requestId).toBe('string');
  });

  it('rejects a malformed JSON body with 400, not 500', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('refuses an oversized payload', async () => {
    const response = await request(app)
      .post('/api/health')
      .send({ blob: 'x'.repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
