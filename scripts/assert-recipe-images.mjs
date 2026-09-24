#!/usr/bin/env node
/**
 * Build-time assertion: every image path referenced by the recipe data exists
 * on disk, in both formats and both crops.
 *
 * A missing image does not throw in Next.js. `next/image` renders a broken box,
 * the page still builds, the test suite still passes, and the first person to
 * notice is a visitor. That silence is the whole reason this check exists —
 * it converts a content mistake into a build failure, which is the only kind
 * anybody acts on.
 *
 * Runs as part of `npm run build`, before `next build`.
 */

import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const MANIFEST = join(ROOT, 'src', 'lib', 'seed', 'recipe-images.generated.json');

async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the generated manifest.
 *
 * It is JSON rather than the TypeScript module on purpose. An earlier version
 * regex-parsed the `.ts`, and the formatter rewriting double quotes to single
 * quotes made every match fail — the check reported "could not parse" instead of
 * checking anything. A data file has no such failure mode.
 */
async function readManifest() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const entries = Object.entries(manifest).map(([slug, set]) => ({ slug, ...set }));

  if (entries.length === 0) {
    throw new Error(`${MANIFEST} is empty. Run \`npm run images:build\` to regenerate it.`);
  }

  return entries;
}

const problems = [];
const entries = await readManifest();

for (const entry of entries) {
  for (const key of ['image', 'imageSquare']) {
    const value = entry[key];

    if (!value) {
      problems.push(`${entry.slug}: missing \`${key}\``);
      continue;
    }

    /* A remote URL here would defeat the whole exercise — the point of the
       import was that no request leaves the origin. */
    if (!value.startsWith('/images/coffee/')) {
      problems.push(`${entry.slug}: \`${key}\` is not a local asset (${value})`);
      continue;
    }

    if (!(await exists(join(PUBLIC_DIR, value)))) {
      problems.push(`${entry.slug}: \`${key}\` does not exist on disk (${value})`);
    }

    /* Every AVIF must be shipped with its WebP twin, or a browser without AVIF
       support gets nothing at all. */
    const fallback = value.replace(/\.avif$/, '.webp');
    if (fallback !== value && !(await exists(join(PUBLIC_DIR, fallback)))) {
      problems.push(`${entry.slug}: WebP fallback missing (${fallback})`);
    }
  }

  if (!entry.blurDataURL?.startsWith('data:image/')) {
    problems.push(`${entry.slug}: blurDataURL is missing or is not a data URI`);
  }
}

if (problems.length > 0) {
  console.error(`\nRecipe imagery check FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nRun `npm run images:build` to regenerate public/images/coffee/.\n');
  process.exit(1);
}

console.log(
  `Recipe imagery check passed — ${entries.length} recipes, ` +
    `${entries.length * 4} files, all present locally.`,
);
