import type { MetadataRoute } from 'next';
import { INITIAL_CATEGORIES } from '@/config/categories-seed';
import { LEGAL_DOCUMENTS } from '@/config/legal-drafts';
import { SITE_CONFIG } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.appUrl.replace(/\/$/, '');
  const lastModified = new Date('2026-11-26T00:00:00.000Z');

  const staticRoutes = ['', '/explore', '/categories', '/about', '/contact'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  const categoryRoutes = INITIAL_CATEGORIES.map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const legalRoutes = Object.keys(LEGAL_DOCUMENTS).map((slug) => ({
    url: `${baseUrl}/legal/${slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  return [...staticRoutes, ...categoryRoutes, ...legalRoutes];
}
