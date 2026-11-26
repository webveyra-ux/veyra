import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.appUrl.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/categories', '/professionals/', '/about', '/contact', '/legal/'],
        disallow: ['/admin', '/customer', '/professional', '/auth', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
