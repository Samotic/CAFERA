import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';
import { sendSuccess } from '../utils/respond.js';

/**
 * GET /api/health — the endpoint uptime monitoring polls.
 *
 * It reports the database as well as the process, because a service that
 * answers HTTP while its database is unreachable is down from every user's point
 * of view. A degraded result returns 503 so a monitor alerts instead of seeing a
 * cheerful 200 in front of a broken system.
 *
 * It deliberately exposes nothing sensitive: no versions, no hostnames, no
 * connection strings — a health endpoint is public by necessity.
 */
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const databaseConnected = isDatabaseConnected();

  const payload = {
    status: databaseConnected ? ('ok' as const) : ('degraded' as const),
    uptime: Math.floor(process.uptime()),
    database: databaseConnected ? ('connected' as const) : ('disconnected' as const),
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, payload, databaseConnected ? 200 : 503);
});
