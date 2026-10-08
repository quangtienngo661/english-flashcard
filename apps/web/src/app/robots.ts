import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

// W14: block everything until NEXT_PUBLIC_INDEXABLE=true at launch.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: site.indexable ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' },
    sitemap: new URL('/sitemap.xml', site.url).toString(),
  };
}
