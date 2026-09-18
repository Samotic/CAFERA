import type { Server } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

/**
 * Process bootstrap and shutdown.
 *
 * Graceful shutdown is what makes a rolling deploy invisible. On SIGTERM the
 * platform gives the process a short window to finish: we stop accepting new
 * connections, let in-flight requests complete, close the database cleanly, and
 * only then exit. Without it, every deploy drops whatever requests were in
 * flight and can leave a write half-finished.
 *
 * The forced-exit timer is the safety net. If a hung request would keep the
 * server alive past the platform's grace period, the process is killed anyway —
 * on our terms, with a log line, rather than by SIGKILL with none.
 */

const SHUTDOWN_TIMEOUT_MS = 15_000;

let server: Server | undefined;
let isShuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  // Do not let this timer alone keep the event loop alive.
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('HTTP server closed');
    }

    await disconnectDatabase();
    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

async function start(): Promise<void> {
  try {
    await connectDatabase();

    const app = createApp();
    server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, 'CAFERA API listening');
    });

    /* Keep-alive slightly longer than a typical load balancer's idle timeout, so
       the balancer closes idle connections rather than the server racing it and
       producing spurious 502s. */
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 70_000;
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

/* An unhandled rejection or uncaught exception leaves the process in an unknown
   state. Log it and restart rather than serving requests from a corrupted one. */
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

void start();
