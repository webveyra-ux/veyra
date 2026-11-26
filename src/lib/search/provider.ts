import type { ProfessionalProfile, ServiceMode } from '@/types/domain';

export type SearchSortOption =
  | 'relevance'
  | 'rating'
  | 'price_asc'
  | 'price_desc'
  | 'recently_active';

export interface ProfessionalSearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  city?: string;
  budgetMax?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  serviceMode?: ServiceMode | '';
  minExperienceYears?: number;
  sortBy?: SearchSortOption;
  pageSize?: number;
  cursor?: string | null;
}

export interface ProfessionalSearchResult {
  items: ProfessionalProfile[];
  nextCursor: string | null;
  hasMore: boolean;
  source: 'firestore' | 'sample_fallback';
  capabilitiesNote: string;
}

export const SEARCH_CAPABILITIES = {
  backend: 'Firestore Indexed Queries',
  supportsPrefixAndTokenFilter: true,
  supportsFuzzyTypoSearch: false,
  note:
    'Current search uses indexed Firestore queries with normalized keyword tokens and paginated page-level filtering. Fuzzy typo matching and geo-radius ranking can be added by swapping the SearchProvider implementation (e.g. Algolia or Typesense) without changing UI components.',
} as const;

export function buildProfessionalSearchTokens(input: {
  displayName: string;
  businessName: string;
  headline: string;
  city: string;
  locality: string;
  categories: string[];
  subcategories: string[];
  services: Array<{ name: string }>;
}): string[] {
  const combined = [
    input.displayName,
    input.businessName,
    input.headline,
    input.city,
    input.locality,
    ...input.categories,
    ...input.subcategories,
    ...input.services.map((s) => s.name),
  ]
    .join(' ')
    .toLowerCase();

  const words = combined
    .split(/[^a-z0-9]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  return Array.from(new Set(words)).slice(0, 60);
}

export function filterAndSortProfessionals(
  candidates: ProfessionalProfile[],
  params: ProfessionalSearchParams
): ProfessionalProfile[] {
  const q = (params.query || '').trim().toLowerCase();
  const qTokens = q.split(/\s+/).filter(Boolean);
  const cityQuery = (params.city || '').trim().toLowerCase();

  const filtered = candidates.filter((pro) => {
    if (pro.profileStatus !== 'active') return false;

    if (params.category && !pro.categories.includes(params.category)) {
      return false;
    }

    if (params.subcategory && !pro.subcategories.includes(params.subcategory)) {
      return false;
    }

    if (cityQuery) {
      const matchesCity =
        pro.location.city.toLowerCase().includes(cityQuery) ||
        pro.location.locality.toLowerCase().includes(cityQuery) ||
        pro.serviceAreas.some((area) => area.toLowerCase().includes(cityQuery));
      if (!matchesCity) return false;
    }

    if (params.verifiedOnly && !pro.isVerified) {
      return false;
    }

    if (params.serviceMode && !pro.serviceModes.includes(params.serviceMode)) {
      return false;
    }

    if (
      typeof params.minRating === 'number' &&
      params.minRating > 0 &&
      (pro.reviewCount === 0 || pro.ratingAverage < params.minRating)
    ) {
      return false;
    }

    if (
      typeof params.budgetMax === 'number' &&
      params.budgetMax > 0 &&
      pro.priceRange.min > params.budgetMax
    ) {
      return false;
    }

    if (
      typeof params.minExperienceYears === 'number' &&
      params.minExperienceYears > 0 &&
      pro.experienceYears < params.minExperienceYears
    ) {
      return false;
    }

    if (qTokens.length > 0) {
      const searchable = [
        pro.displayName,
        pro.businessName,
        pro.headline,
        pro.bio,
        pro.location.city,
        pro.location.locality,
        ...pro.categories,
        ...pro.subcategories,
        ...pro.services.map((s) => s.name),
      ]
        .join(' ')
        .toLowerCase();

      const allMatch = qTokens.every((tok) => searchable.includes(tok));
      if (!allMatch) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (params.sortBy) {
    case 'rating':
      sorted.sort((a, b) => {
        if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
        return b.reviewCount - a.reviewCount;
      });
      break;
    case 'price_asc':
      sorted.sort((a, b) => a.priceRange.min - b.priceRange.min);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.priceRange.min - a.priceRange.min);
      break;
    case 'recently_active':
      sorted.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
      break;
    case 'relevance':
    default:
      sorted.sort((a, b) => {
        const aScore = (a.isVerified ? 20 : 0) + (a.isFeatured ? 10 : 0) + a.ratingAverage * 4;
        const bScore = (b.isVerified ? 20 : 0) + (b.isFeatured ? 10 : 0) + b.ratingAverage * 4;
        return bScore - aScore;
      });
      break;
  }

  return sorted;
}
