import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '../lib/seo';

const publicRoutes = [
  '/',
  '/capabilities',
  '/docs',
  '/changelog',
  '/legal/privacy',
  '/legal/terms',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: resolveSiteUrl(route),
    lastModified: now,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
