import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants/site';
import { RECIPE_SEED } from '@/lib/seed/recipes';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/discover`, changeFrequency: 'weekly', priority: 0.9 },
  ];

  return [
    ...staticRoutes,
    ...RECIPE_SEED.map((recipe) => ({
      url: `${SITE.url}/recipes/${recipe.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
