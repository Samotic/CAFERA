/**
 * Test environment.
 *
 * These are set before any module is imported, because `config/env.ts` validates
 * and freezes configuration at import time. Anything assigned after that point
 * would be ignored.
 *
 * The secrets here are throwaway values that exist only to satisfy the schema —
 * no test ever asserts on them, and none of them is a real credential.
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cafera_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-to-pass-validation';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-different-and-long-enough-too';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';
/* Keep bcrypt at its minimum allowed cost: the suite hashes many passwords, and
   cost 12 would add minutes to every run without testing anything extra. */
process.env.BCRYPT_ROUNDS = '12';
