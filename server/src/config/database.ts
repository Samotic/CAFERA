import mongoose from 'mongoose';
import { env, isTest } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * MongoDB connection lifecycle.
 *
 * `sanitizeFilter` is the load-bearing security setting: it makes Mongoose reject
 * query operators that arrive inside user-supplied values, so a login body of
 * `{ email: { $ne: null } }` cannot turn into a query that matches every user.
 * That is NoSQL injection, and this is the driver-level defence against it — the
 * request-level sanitiser in the middleware stack is the second layer.
 *
 * ---------------------------------------------------------------------------
 * LATENCY — why the pool settings below are not arbitrary
 * ---------------------------------------------------------------------------
 * The request chain on a recipe page is: edge -> Next server -> Express -> Atlas.
 * Four hops before first byte, and the Atlas hop is the one that varies most.
 * A cross-region cluster adds 100ms+ *per query*, and a page issuing three
 * queries pays it three times.
 *
 * Two consequences are encoded here:
 *
 *   1. The connection is established once and reused for the process lifetime.
 *      Connecting per request would add a TCP handshake, a TLS handshake and an
 *      SDAM server-selection round trip to every single request — on a
 *      cross-region link that is most of a second before any query runs.
 *
 *   2. `minPoolSize` is non-zero so warm sockets are already open when a request
 *      arrives. A pool that drains to zero pays the handshake again on the next
 *      request, which is the same cost wearing a different hat.
 *
 * The API is a long-running Express service, not a serverless function, so a
 * module-scoped cache is the correct shape. If it is ever moved behind a
 * serverless runtime, this cache must move to `globalThis` to survive module
 * re-evaluation between invocations.
 *
 * Region pinning is a deployment concern and is documented in README.md; it is
 * the single largest lever on the numbers above and cannot be fixed in code.
 */

/**
 * The in-flight or settled connection.
 *
 * Caching the *promise* rather than a boolean closes a race: two requests
 * arriving during startup would both see `isConnected === false` and both call
 * `mongoose.connect`. Awaiting one shared promise means the second waits for the
 * first rather than opening a second pool.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

/** Attached once per process, not once per connect call. */
let listenersBound = false;

function bindConnectionListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    /* Let the driver reconnect on its own — it retries with backoff and keeps
       the pool. Clearing the cached promise here would let the next caller open
       a competing connection while that recovery is still in progress. */
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

export async function connectDatabase(): Promise<typeof mongoose> {
  if (connectionPromise) return connectionPromise;

  const uri = isTest && env.MONGODB_URI_TEST ? env.MONGODB_URI_TEST : env.MONGODB_URI;

  mongoose.set('sanitizeFilter', true);
  /* Reject writes containing fields absent from the schema, rather than silently
     dropping them — a typo in a field name should fail loudly. */
  mongoose.set('strictQuery', true);

  bindConnectionListeners();

  connectionPromise = mongoose
    .connect(uri, {
      /* Fail fast on an unreachable cluster instead of hanging the request that
         triggered the connection. */
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      /* Sized for a single service instance. Atlas shared tiers cap total
         connections low, so a large pool per instance starves the others. */
      maxPoolSize: 20,
      /* Keeps warm sockets open: see the latency note above. */
      minPoolSize: 5,
      maxIdleTimeMS: 60_000,
      /* Index builds belong in the seed and migration paths, not on the hot
         path of a production boot where they block startup. */
      autoIndex: !isTest,
      /* zlib is built into Node; zstd and snappy each need an extra native package,
         and a missing one makes connect fail at boot rather than degrade. */
      compressors: ['zlib'],
    })
    .then((connection) => {
      logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
      return connection;
    })
    .catch((error: unknown) => {
      // A failed attempt must not be cached, or every later retry resolves to
      // the same rejection and the process can never recover.
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

export async function disconnectDatabase(): Promise<void> {
  if (!connectionPromise) return;
  connectionPromise = null;
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/** Exposed for the readiness probe: the pool's own view of its health. */
export function getDatabaseState(): 'up' | 'down' {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}
