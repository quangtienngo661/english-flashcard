import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

// W14: block everything until NEXT_PUBLIC_INDEXABLE=true at launch. The learner app (/vi/app, /en/app) is never indexed (design §4.5).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: site.indexable
      ? { userAgent: '*', allow: '/', disallow: '/*/app' }
      : { userAgent: '*', disallow: ['/', '/*/app'] },
    sitemap: new URL('/sitemap.xml', site.url).toString(),
  };
}
