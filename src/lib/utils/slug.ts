/**
 * Slug generation. Used by the seed script, by admin recipe creation and by
 * custom recipes, so a user-authored "Café Bombón" and a seeded one produce the
 * same `cafe-bombon` shape.
 */

/** Strips diacritics so accented names survive as readable ASCII slugs. */
function deaccent(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function slugify(value: string): string {
  return deaccent(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

/**
 * Appends a numeric suffix until the slug is free. The caller supplies the
 * existence check so this stays a pure function and remains testable.
 */
export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  const root = slugify(base) || 'recipe';
  if (!exists(root)) return root;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!exists(candidate)) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}
