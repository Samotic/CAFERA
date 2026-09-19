import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

/**
 * Pool configuration is the kind of thing that is verified by reading the file
 * and then goes wrong in production anyway, because the failure only appears
 * under concurrency. These assertions pin the two decisions that matter on
 * Vercel and the one bug that has already happened once.
 */

const MONGO_URI = 'mongodb://127.0.0.1:27017/cafera_test';

async function freshDb() {
  vi.resetModules();
  // The module reads env at import time, so it is set before the import.
  vi.stubEnv('MONGODB_URI', MONGO_URI);
  return import('./db');
}

beforeEach(() => {
  globalThis.__caferaMongoose = undefined;
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.__caferaMongoose = undefined;
  vi.unstubAllEnvs();
});

describe('serverless pool sizing', () => {
  it('holds no idle connections, because every instance has its own pool', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockResolvedValue(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();
    await connectToDatabase();

    const options = connect.mock.calls[0]?.[1];

    /* minPoolSize 5 was correct for one long-lived Express process and is
       catastrophic here: a hundred warm function instances would hold five
       hundred connections and exhaust an Atlas shared tier, surfacing as random
       errors under load rather than a clean refusal. */
    expect(options?.minPoolSize).toBe(0);
    expect(options?.maxPoolSize).toBeGreaterThanOrEqual(5);
    expect(options?.maxPoolSize).toBeLessThanOrEqual(10);
  });

  it('fails fast instead of queueing a query until the function times out', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockResolvedValue(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();
    await connectToDatabase();

    /* With buffering on, a query issued before the connection is ready is queued
       silently and the function sits until the platform kills it — a gateway
       error with nothing in the logs. */
    expect(connect.mock.calls[0]?.[1]?.bufferCommands).toBe(false);
  });

  it('does not build indexes on the cold-start path', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockResolvedValue(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();
    await connectToDatabase();

    expect(connect.mock.calls[0]?.[1]?.autoIndex).toBe(false);
  });
});

describe('connection caching', () => {
  it('opens one pool when concurrent callers race a cold start', async () => {
    let resolveConnect: (value: typeof mongoose) => void = () => {};
    const pending = new Promise<typeof mongoose>((resolve) => {
      resolveConnect = resolve;
    });
    const connect = vi.spyOn(mongoose, 'connect').mockReturnValue(pending as never);

    const { connectToDatabase } = await freshDb();

    /* The bug the promise cache prevents: two requests arriving before the first
       connect settles both see "not connected" and both open a pool. */
    const first = connectToDatabase();
    const second = connectToDatabase();
    resolveConnect(mongoose);
    await Promise.all([first, second]);

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached connection on a warm invocation', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockResolvedValue(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();
    await connectToDatabase();
    await connectToDatabase();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('survives module re-evaluation via globalThis', async () => {
    vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();
    await connectToDatabase();

    /* Next re-evaluates modules on hot reload. A module-scoped cache would be
       fresh each time and open a new pool until Atlas refused them. */
    vi.resetModules();
    const again = await import('./db');

    expect(again.getConnectionCache().connection).not.toBeNull();
  });

  it('does not cache a rejection, so the next call retries', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error('cluster unreachable'))
      .mockResolvedValueOnce(mongoose as unknown as typeof mongoose);

    const { connectToDatabase } = await freshDb();

    await expect(connectToDatabase()).rejects.toThrow('cluster unreachable');

    /* A cached rejected promise would make every later retry resolve to the same
       stale failure, and the instance could never recover from a transient
       Atlas blip. */
    await expect(connectToDatabase()).resolves.toBeDefined();
    expect(connect).toHaveBeenCalledTimes(2);
  });
});

describe('client sharing', () => {
  it('exposes the driver client so Better Auth reuses this pool', async () => {
    const fakeClient = { id: 'shared-client' };
    vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as unknown as typeof mongoose);
    vi.spyOn(mongoose.connection, 'getClient').mockReturnValue(fakeClient as never);

    const { getClient } = await freshDb();

    /* Letting the auth adapter open its own client would double every
       instance's connection count — the exact arithmetic the pool sizing above
       exists to control. */
    await expect(getClient()).resolves.toBe(fakeClient);
  });
});
