import mongoose from 'mongoose';
import { env, isTest } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * MongoDB connection lifecycle.
 *
 * `sanitizeFilter` is the load-bearing setting here: it makes Mongoose reject
 * query operators that arrive inside user-supplied values, so a login body of
 * `{ email: { $ne: null } }` cannot turn into a query that matches every user.
 * That is NoSQL injection, and this is the driver-level defence against it —
 * the request-level sanitiser in the middleware stack is the second layer.
 */

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;

  const uri = isTest && env.MONGODB_URI_TEST ? env.MONGODB_URI_TEST : env.MONGODB_URI;

  mongoose.set('sanitizeFilter', true);
  /* Reject writes containing fields absent from the schema, rather than silently
     dropping them — a typo in a field name should fail loudly. */
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(uri, {
    /* Fail fast on an unreachable cluster instead of hanging the request that
       triggered the connection. */
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
    minPoolSize: 2,
    autoIndex: !isTest,
  });

  isConnected = true;
  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  logger.info('MongoDB connection closed');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
