import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Router } from 'express';
import { getDatabaseState } from '../config/database.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * Health endpoints.
 *
 * These are two different questions wearing similar names, and conflating them
 * causes a specific, expensive outage:
 *
 *   LIVENESS  — "is this process alive?"        Never touches a dependency.
 *   READINESS — "can it serve traffic?"          Checks every dependency.
 *
 * Container platforms (Railway, Render, Fly, Kubernetes) point their **liveness**
 * probe at a health URL and **kill and restart the process** when it fails. If
 * that probe checks the database, a transient Atlas blip — a failover, a brief
 * network partition, exactly the events Atlas is designed to ride out — restarts
 * a perfectly healthy process, drops every in-flight request, and turns a
 * five-second hiccup into a longer outage with a cold start on the end of it.
 * Meanwhile the database recovers on its own and the restart accomplished nothing.
 *
 * So: `/live` must never reach for a dependency, no matter how tempting. `/ready`
 * checks everything and returns 503 when it cannot serve, which is what a load
 * balancer needs in order to route around this instance without killing it.
 *
 * Neither endpoint leaks connection strings, hostnames, versions or credentials.
 * A health endpoint is public by necessity, and it is a favourite first stop for
 * anyone fingerprinting a service.
 */
export const healthRouter = Router();

/**
 * Event-loop delay, sampled continuously at negligible cost.
 *
 * Reported for observability only — it never changes the status code. A process
 * whose loop is briefly busy is not a process that should be killed, and making
 * liveness conditional on a latency threshold would reintroduce the restart loop
 * this file exists to prevent.
 */
const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();
loopDelay.unref?.();

function eventLoopDelayMs(): number {
  return Math.round(loopDelay.mean / 1e6);
}

/**
 * GET /api/health/live — liveness.
 *
 * Reached only if the event loop is turning, which is the whole question. Always
 * 200. Point the PLATFORM LIVENESS PROBE here and nothing else.
 */
healthRouter.get('/live', (_req, res) => {
  sendSuccess(res, {
    status: 'alive' as const,
    uptime: Math.floor(process.uptime()),
    eventLoopDelayMs: eventLoopDelayMs(),
  });
});

/**
 * GET /api/health/ready — readiness.
 *
 * 200 when every dependency is reachable, 503 otherwise, with a per-dependency
 * breakdown. Point the LOAD-BALANCER TRAFFIC GATE and the EXTERNAL UPTIME
 * MONITOR here.
 */
healthRouter.get('/ready', (_req, res) => {
  const dependencies = {
    database: getDatabaseState(),
  };

  const isReady = Object.values(dependencies).every((state) => state === 'up');

  sendSuccess(
    res,
    {
      status: isReady ? ('ready' as const) : ('degraded' as const),
      uptime: Math.floor(process.uptime()),
      dependencies,
      timestamp: new Date().toISOString(),
    },
    isReady ? 200 : 503,
  );
});

/**
 * GET /api/health — deprecated alias of `/ready`.
 *
 * @deprecated Kept so anything already pointing here keeps working. New probes
 * must target `/live` or `/ready` explicitly; the distinction is the point.
 */
healthRouter.get('/', (_req, res) => {
  const dependencies = { database: getDatabaseState() };
  const isReady = dependencies.database === 'up';

  sendSuccess(
    res,
    {
      status: isReady ? ('ok' as const) : ('degraded' as const),
      uptime: Math.floor(process.uptime()),
      database: dependencies.database === 'up' ? ('connected' as const) : ('disconnected' as const),
      timestamp: new Date().toISOString(),
    },
    isReady ? 200 : 503,
  );
});
