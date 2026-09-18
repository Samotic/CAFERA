#!/usr/bin/env node
/**
 * Fails the build if anything secret-shaped reached the browser bundle.
 *
 * The rule "never expose secrets in the client" is easy to state and easy to
 * break by accident — one `NEXT_PUBLIC_` prefix on the wrong variable, one
 * server module imported from a client component. This turns that rule into a
 * check that runs in CI, which is the only form of it that keeps working after
 * everyone has forgotten the rule exists.
 *
 * Run after `next build`:  node scripts/check-bundle-secrets.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

const CLIENT_DIR = join(process.cwd(), 'web', '.next', 'static');

/**
 * Patterns that must never appear in client-side JavaScript. Each pairs a
 * regular expression with the reason it matters, so a failure explains itself.
 */
const FORBIDDEN = [
  { pattern: /mongodb(\+srv)?:\/\//i, reason: 'MongoDB connection string' },
  { pattern: /JWT_(ACCESS|REFRESH)_SECRET/, reason: 'JWT secret variable' },
  { pattern: /CLOUDINARY_API_SECRET/, reason: 'Cloudinary API secret' },
  { pattern: /ANTHROPIC_API_KEY|sk-ant-[a-zA-Z0-9-]{10,}/, reason: 'LLM API key' },
  { pattern: /SMTP_URL|smtps?:\/\/[^\s"']*:[^\s"']*@/i, reason: 'SMTP credentials' },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, reason: 'private key' },
  { pattern: /\bBCRYPT_ROUNDS\b/, reason: 'server-only auth configuration' },
];

/**
 * Also fail on a production build that still points at a developer machine —
 * the single most common way a release ships dead.
 */
const LOCALHOST = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/;

async function* walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.name.endsWith('.js')) {
      yield path;
    }
  }
}

const failures = [];
let scanned = 0;

for await (const file of walk(CLIENT_DIR)) {
  scanned += 1;
  const contents = await readFile(file, 'utf8');

  for (const { pattern, reason } of FORBIDDEN) {
    if (pattern.test(contents)) {
      failures.push(`${reason} found in ${file}`);
    }
  }

  if (process.env.NODE_ENV === 'production' && LOCALHOST.test(contents)) {
    failures.push(`hardcoded localhost URL found in ${file}`);
  }
}

if (scanned === 0) {
  console.error('No client bundle found at web/.next/static — run `next build` first.');
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`\nSecret scan FAILED across ${scanned} bundle files:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nMove the value behind the API and drop the NEXT_PUBLIC_ prefix.\n');
  process.exit(1);
}

console.log(`Secret scan passed — ${scanned} client bundle files clean.`);
