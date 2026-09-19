import mongoose from 'mongoose';
import { env, isTest } from './env';

/**
 * MongoDB connection for a serverless runtime.
 *
 * ---------------------------------------------------------------------------
 * WHY THE POOL SETTINGS ARE THE OPPOSITE OF THE EXPRESS ONES
 * ---------------------------------------------------------------------------
 * The previous version ran inside one long-lived Express process, where holding
 * warm sockets open is free and reconnecting is the expensive thing. So it set
 * `minPoolSize: 5` — five sockets always ready.
 *
 * On Vercel that arithmetic inverts. There is no single process: there are as
 * many function instances as concurrency demands, each with its own module
 * scope and its own pool. `minPoolSize: 5` across a hundred warm instances is
 * **five hundred connections**, and an Atlas shared tier tops out at 500. The
 * failure is not a clean refusal either — it surfaces as random connection
 * errors under load, on the requests that happen to arrive after the cap,
 * which reads like an application bug rather than a configuration one.
 *
 * So: many small pools that release, not few warm ones that hold.
 *   minPoolSize 0   — an idle instance holds nothing
 *   maxPoolSize 10  — a busy instance is still bounded
 *
 * ---------------------------------------------------------------------------
 * WHY THE CACHE IS ON `globalThis`
 * ---------------------------------------------------------------------------
 * A module-scoped variable does not reliably survive between invocations on a
 * warm instance — in development, Next's hot reload re-evaluates modules, and a
 * fresh module scope each time means a fresh pool each time until Atlas refuses
 * them. `globalThis` outlives module re-evaluation, so the same instance reuses
 * the same connection.
 *
 * What is cached is the **promise**, not the resolved connection. Two requests
 * arriving before the first connect settles would otherwise both see "not
 * connected" and both open a pool; awaiting one shared promise means the second
 * waits for the first. A rejected promise is explicitly evicted, or every later
 * retry would resolve to the same stale failure and the instance could never
 * recover.
 */

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var -- `var` is required for a globalThis declaration
  var __caferaMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__caferaMongoose ?? { connection: null, promise: null };
globalThis.__caferaMongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    /* `sanitizeFilter` is the load-bearing security setting: it makes Mongoose
       reject query operators arriving inside user-supplied values, so a login
       body of `{ email: { $ne: null } }` cannot become a query that matches
       every user. */
    mongoose.set('sanitizeFilter', true);
    mongoose.set('strictQuery', true);

    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        /* See the note above: an idle instance must hold nothing. */
        minPoolSize: 0,
        maxPoolSize: 10,
        /* Release idle sockets quickly — an instance that has finished its
           burst should not sit on connections another instance could use. */
        maxIdleTimeMS: 10_000,

        /**
         * Fail fast rather than hang.
         *
         * With `bufferCommands` left on, a query issued before the connection is
         * ready is queued silently; if the connection never arrives, the
         * function sits there until the platform's timeout kills it, and the
         * user gets a generic gateway error with nothing in the logs. Off, the
         * query rejects immediately with a real message.
         */
        bufferCommands: false,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,

        /* Index builds belong in a migration, not on the hot path of a cold
           start where they block the first request. */
        autoIndex: false,
        compressors: ['zlib'],
      })
      .then((connection) => {
        cache.connection = connection;
        return connection;
      })
      .catch((error: unknown) => {
        // Never cache a rejection, or the instance can never recover.
        cache.promise = null;
        throw error;
      });
  }

  return cache.promise;
}

/**
 * The underlying driver client.
 *
 * Better Auth's MongoDB adapter takes a `MongoClient`. Handing it this one
 * means the two share a single pool; letting it open its own would double every
 * instance's connection count, which is exactly the arithmetic the pool settings
 * above exist to control.
 *
 * Phase 3 wires this into the adapter.
 */
export async function getClient() {
  const connection = await connectToDatabase();
  return connection.connection.getClient();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/** Test-only: lets a suite assert on the cache without reaching into globalThis. */
export function getConnectionCache(): Readonly<MongooseCache> {
  return cache;
}

/** Test-only: drops the cached connection so the next call reconnects. */
export async function disconnectFromDatabase(): Promise<void> {
  if (!isTest && cache.connection) {
    // Serverless functions are torn down by the platform; closing a shared pool
    // from application code would strand concurrent invocations on the instance.
    return;
  }
  cache.promise = null;
  cache.connection = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
