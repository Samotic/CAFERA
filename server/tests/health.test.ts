import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as database from '../src/config/database.js';

/**
 * The property these tests protect is the one that causes an outage when it is
 * wrong: a liveness probe that fails on a database blip restarts a healthy
 * process and turns a five-second hiccup into a real outage.
 *
 * So the central assertion is the pair — with the database forced down, `/live`
 * must be 200 and `/ready` must be 503. Either one alone proves nothing.
 */
const app = createApp();

describe('liveness and readiness are genuinely separate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps /live at 200 while /ready reports 503, with the database down', async () => {
    vi.spyOn(database, 'getDatabaseState').mockReturnValue('down');

    const live = await request(app).get('/api/health/live');
    const ready = await request(app).get('/api/health/ready');

    // The whole point: a dependency outage must not get the process killed.
    expect(live.status).toBe(200);
    expect(live.body.data.status).toBe('alive');

    expect(ready.status).toBe(503);
    expect(ready.body.data.status).toBe('degraded');
    expect(ready.body.data.dependencies.database).toBe('down');
  });

  it('reports ready with 200 when the database is up', async () => {
    vi.spyOn(database, 'getDatabaseState').mockReturnValue('up');

    const ready = await request(app).get('/api/health/ready');

    expect(ready.status).toBe(200);
    expect(ready.body.data.status).toBe('ready');
    expect(ready.body.data.dependencies.database).toBe('up');
  });

  it('never consults a dependency for liveness', async () => {
    const spy = vi.spyOn(database, 'getDatabaseState');

    await request(app).get('/api/health/live');

    /* If this ever fails, someone has added a dependency check to the liveness
       path. Read the comment at the top of health.route.ts before "fixing" it. */
    expect(spy).not.toHaveBeenCalled();
  });

  it('answers liveness regardless of database state', async () => {
    for (const state of ['up', 'down'] as const) {
      vi.spyOn(database, 'getDatabaseState').mockReturnValue(state);
      const live = await request(app).get('/api/health/live');
      expect(live.status).toBe(200);
    }
  });
});

describe('deprecated /api/health alias', () => {
  it('still behaves as a readiness check so existing probes keep working', async () => {
    vi.spyOn(database, 'getDatabaseState').mockReturnValue('down');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.data.database).toBe('disconnected');
  });
});

describe('health endpoints leak nothing', () => {
  it('exposes no connection details, hostnames or versions', async () => {
    vi.spyOn(database, 'getDatabaseState').mockReturnValue('down');

    for (const path of ['/api/health/live', '/api/health/ready', '/api/health']) {
      const response = await request(app).get(path);
      const serialised = JSON.stringify(response.body);

      // A public health endpoint is a favourite first stop for fingerprinting.
      expect(serialised).not.toMatch(/mongodb|mongo\+srv/i);
      expect(serialised).not.toMatch(/secret|password|token/i);
      expect(serialised).not.toMatch(/localhost|127\.0\.0\.1|\.net\b|\.com\b/i);
      expect(serialised).not.toMatch(/"version"/i);
      expect(serialised).not.toMatch(/node|express|v\d+\.\d+\.\d+/i);
    }
  });
});
