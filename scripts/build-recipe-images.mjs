#!/usr/bin/env node
/**
 * Turns the remote recipe photography into committed local assets.
 *
 * This is a one-shot import, not part of the build. It runs when the source
 * photography changes, writes everything into `public/images/coffee/`, and
 * regenerates the manifest the recipe data reads. After it has run, the
 * application makes no request to any third-party image host — which is the
 * point: v3 has no backend and no uploads, so a CDN dependency bought nothing
 * but an origin the CSP had to allow and a service that can disappear.
 *
 *   node scripts/build-recipe-images.mjs
 *
 * For each drink it produces four files and one placeholder:
 *
 *   <slug>.avif          1600x900   16:9 — hero and featured card
 *   <slug>.webp          1600x900   fallback for browsers without AVIF
 *   <slug>-square.avif    800x800   1:1  — grid cards
 *   <slug>-square.webp    800x800   fallback
 *   blurDataURL          20px wide  inline base64, ships in the HTML
 *
 * The two crops are generated independently from the source with attention-based
 * cropping. Deriving the square by letterboxing the 16:9 would put bars on a
 * grid card, and deriving it by centre-cropping would cut the cup in half as
 * often as not.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const OUT_DIR = join(process.cwd(), 'public', 'images', 'coffee');
const MANIFEST_TS = join(process.cwd(), 'src', 'lib', 'seed', 'recipe-images.generated.ts');
/* The data lives in JSON, not in the TypeScript module. The build-time
   assertion reads this file directly: parsing a .ts with a regex meant a
   formatter changing quote style silently broke the check. */
const MANIFEST_JSON = join(process.cwd(), 'src', 'lib', 'seed', 'recipe-images.generated.json');
const SOURCE_MANIFEST = join(process.cwd(), 'src', 'lib', 'seed', 'recipe-images.source.json');

/**
 * Landscape is sized for the largest realistic delivery: the detail hero is
 * 50vw from `lg` up, so ~768 CSS px on a 1536px viewport, doubled for retina.
 * Square is sized the same way for a 20vw grid card at 2xl.
 */
const LANDSCAPE = { width: 1600, height: 900 };
const SQUARE = { width: 800, height: 800 };

/** Budget from the spec: <=200 KB delivered at the largest common breakpoint. */
const SIZE_BUDGET_BYTES = 200 * 1024;

/* AVIF is dramatically more efficient than WebP at the same perceived quality,
   so the two formats are tuned separately rather than sharing a number. */
const AVIF_OPTIONS = { quality: 55, effort: 6, chromaSubsampling: '4:2:0' };
const WEBP_OPTIONS = { quality: 78, effort: 5 };

async function fetchSource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * `fit: 'cover'` with attention-based positioning crops to the most visually
 * salient region rather than the geometric centre — which for a cup of coffee
 * shot off-centre is the difference between a portrait and a saucer.
 */
async function renderCrop(source, { width, height }) {
  const base = sharp(source).resize({
    width,
    height,
    fit: 'cover',
    position: sharp.strategy.attention,
  });

  const [avif, webp] = await Promise.all([
    base.clone().avif(AVIF_OPTIONS).toBuffer(),
    base.clone().webp(WEBP_OPTIONS).toBuffer(),
  ]);

  return { avif, webp };
}

/**
 * A 20px-wide WebP, inlined as a data URI.
 *
 * It ships inside the HTML, so it must stay tiny — this is typically under
 * 400 bytes. Its whole job is to occupy the reserved box with something
 * colour-accurate while the real photograph downloads.
 */
async function renderBlurPlaceholder(source) {
  const buffer = await sharp(source)
    .resize({ width: 20, height: 20, fit: 'cover' })
    .webp({ quality: 40, alphaQuality: 40 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString('base64')}`;
}

async function main() {
  const sources = JSON.parse(await readFile(SOURCE_MANIFEST, 'utf8'));
  const slugs = Object.keys(sources);

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Importing ${slugs.length} recipe images into public/images/coffee/\n`);

  const manifest = {};
  const oversized = [];
  let totalBytes = 0;

  for (const slug of slugs) {
    const source = await fetchSource(sources[slug]);

    const [landscape, square, blurDataURL] = await Promise.all([
      renderCrop(source, LANDSCAPE),
      renderCrop(source, SQUARE),
      renderBlurPlaceholder(source),
    ]);

    const files = [
      [`${slug}.avif`, landscape.avif],
      [`${slug}.webp`, landscape.webp],
      [`${slug}-square.avif`, square.avif],
      [`${slug}-square.webp`, square.webp],
    ];

    for (const [name, buffer] of files) {
      await writeFile(join(OUT_DIR, name), buffer);
      totalBytes += buffer.length;
    }

    /* Only the AVIF counts against the budget: it is what a modern browser
       actually downloads, and the WebP exists for the ones that cannot. */
    if (landscape.avif.length > SIZE_BUDGET_BYTES) {
      oversized.push([`${slug}.avif`, landscape.avif.length]);
    }

    manifest[slug] = {
      image: `/images/coffee/${slug}.avif`,
      imageSquare: `/images/coffee/${slug}-square.avif`,
      blurDataURL,
    };

    console.log(
      `  ${slug.padEnd(24)} ` +
        `16:9 ${String(Math.round(landscape.avif.length / 1024)).padStart(4)} KB avif / ` +
        `${String(Math.round(landscape.webp.length / 1024)).padStart(4)} KB webp   ` +
        `1:1 ${String(Math.round(square.avif.length / 1024)).padStart(3)} KB   ` +
        `blur ${blurDataURL.length} B`,
    );
  }

  await writeFile(
    MANIFEST_JSON,
    `${JSON.stringify(manifest, null, 2)}
`,
  );

  const body = `/**
 * Generated by \`npm run images:build\`. Do not edit manually.
 *
 * Local, committed assets — the application makes no request to any external
 * image host. Each entry carries both crops and an inline blur placeholder.
 *
 * The data itself lives in \`recipe-images.generated.json\`; this module only
 * adds types. The build-time assertion reads the JSON directly, so a formatter
 * changing quote style here cannot silently disable the check.
 */
import generated from './recipe-images.generated.json';

export interface RecipeImageSet {
  /** 16:9 landscape, for the detail hero and the featured card. */
  image: string;
  /** 1:1 square, for grid cards. Cropped from the source, never letterboxed. */
  imageSquare: string;
  /** 20px WebP data URI, inlined so the reserved box is never blank. */
  blurDataURL: string;
}

export const GENERATED_RECIPE_IMAGES: Record<string, RecipeImageSet> = generated;
`;

  await writeFile(MANIFEST_TS, body);

  console.log(
    `\nWrote ${slugs.length * 4} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`,
  );

  if (oversized.length > 0) {
    console.error(
      `\n${oversized.length} image(s) exceed the ${SIZE_BUDGET_BYTES / 1024} KB budget:`,
    );
    for (const [name, size] of oversized) {
      console.error(`  ${name}: ${Math.round(size / 1024)} KB`);
    }
    process.exit(1);
  }

  console.log(`All images within the ${SIZE_BUDGET_BYTES / 1024} KB budget.`);
}

await main();
