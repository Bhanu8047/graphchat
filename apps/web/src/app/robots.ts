import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/capabilities', '/docs', '/changelog', '/legal/'],
        disallow: [
          '/api/',
          '/auth/',
          '/admin/',
          '/ai/',
          '/dashboard/',
          '/export/',
          '/graphs/',
          '/repos/',
          '/search/',
          '/settings/',
          '/usage/',
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
