'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Info, List, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import { ProfessionalCard } from '@/components/common/ProfessionalCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { POPULAR_CITIES } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { mapsProvider } from '@/lib/maps/provider';
import { SEARCH_CAPABILITIES, type SearchSortOption } from '@/lib/search/provider';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import {
  getFavouriteProfessionalIds,
  toggleFavouriteProfessional,
} from '@/services/customers.service';
import { searchProfessionals } from '@/services/professionals.service';
import type {
  CategoryRecord,
  ProfessionalProfile,
  ServiceMode,
  SubcategoryRecord,
} from '@/types/domain';

function ExploreDirectoryInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { firebaseUser, selectedCity } = useAuth();
  const { notify } = useToast();

  const [queryText, setQueryText] = React.useState(searchParams.get('q') || '');
  const [category, setCategory] = React.useState(searchParams.get('category') || '');
  const [subcategory, setSubcategory] = React.useState(searchParams.get('subcategory') || '');
  const [city, setCity] = React.useState(searchParams.get('city') || selectedCity || '');
  const [serviceMode, setServiceMode] = React.useState<ServiceMode | ''>(
    (searchParams.get('mode') as ServiceMode | '') || ''
  );
  const [verifiedOnly, setVerifiedOnly] = React.useState(searchParams.get('verified') === 'true');
  const [minRating, setMinRating] = React.useState<number>(Number(searchParams.get('rating') || 0));
  const [budgetMax, setBudgetMax] = React.useState<string>(searchParams.get('budgetMax') || '');
  const [minExp, setMinExp] = React.useState<string>(searchParams.get('exp') || '');
  const [sortBy, setSortBy] = React.useState<SearchSortOption>(
    (searchParams.get('sort') as SearchSortOption) || 'relevance'
  );
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');

  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [results, setResults] = React.useState<ProfessionalProfile[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [source, setSource] = React.useState<'firestore' | 'sample_fallback'>('firestore');
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [favourites, setFavourites] = React.useState<Set<string>>(new Set());

  const mapStatus = mapsProvider.getStatus();

  React.useEffect(() => {
    void fetchActiveCategoriesAndSubcategories().then((res) => {
      setCategories(res.categories);
      setSubcategories(res.subcategories);
    });
  }, []);

  React.useEffect(() => {
    if (!firebaseUser) return;
    void getFavouriteProfessionalIds(firebaseUser.uid).then((ids) => setFavourites(new Set(ids)));
  }, [firebaseUser]);

  const activeFavourites = firebaseUser ? favourites : new Set<string>();

  const executeSearch = React.useCallback(
    async (cursor: string | null = null, append = false) => {
      try {
        const res = await searchProfessionals({
          query: queryText,
          category: category || undefined,
          subcategory: subcategory || undefined,
          city: city || undefined,
          serviceMode,
          verifiedOnly,
          minRating: minRating || undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          minExperienceYears: minExp ? Number(minExp) : undefined,
          sortBy,
          pageSize: 12,
          cursor,
        });

        setResults((prev) => (append ? [...prev, ...res.items] : res.items));
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        setSource(res.source);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      budgetMax,
      category,
      city,
      minExp,
      minRating,
      queryText,
      serviceMode,
      sortBy,
      subcategory,
      verifiedOnly,
    ]
  );

  React.useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      return executeSearch(null, false);
    });
    return () => {
      active = false;
    };
  }, [executeSearch]);

  const filteredSubcategories = React.useMemo(
    () =>
      category
        ? subcategories.filter((s) => s.categorySlug === category)
        : subcategories,
    [category, subcategories]
  );

  async function handleToggleFavourite(proId: string) {
    if (!firebaseUser) {
      router.push('/auth/login?next=/explore');
      return;
    }
    const currentlySaved = favourites.has(proId);
    const nextSaved = await toggleFavouriteProfessional(firebaseUser.uid, proId, currentlySaved);
    setFavourites((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(proId);
      else next.delete(proId);
      return next;
    });
    notify({
      tone: 'success',
      title: nextSaved ? 'Saved to favourites' : 'Removed from favourites',
    });
  }

  function resetFilters() {
    setQueryText('');
    setCategory('');
    setSubcategory('');
    setCity('');
    setServiceMode('');
    setVerifiedOnly(false);
    setMinRating(0);
    setBudgetMax('');
    setMinExp('');
    setSortBy('relevance');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Discover Professionals"
        title="Explore beauty, styling & creative specialists"
        description="Search by name, studio, category, service mode, or city. Or post one request to receive tailored proposals."
        actions={
          <Link href="/customer/requests/new">
            <Button>Post a Requirement</Button>
          </Link>
        }
      />

      {/* Search & Filter Panel */}
      <Card className="p-4 sm:p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6B6879]" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Name, studio, or service..."
              className="w-full min-h-11 rounded-xl border border-[#E9E5EF] bg-white pl-10 pr-3 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory('');
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select
              aria-label="Subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">All Specialties</option>
              {filteredSubcategories.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Input
              aria-label="City"
              list="explore-city-list"
              placeholder="City / Area"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <datalist id="explore-city-list">
              {POPULAR_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 items-end pt-2 border-t border-[#E9E5EF]/70">
          <Select
            label="Service Mode"
            value={serviceMode}
            onChange={(e) => setServiceMode(e.target.value as ServiceMode | '')}
          >
            <option value="">Any mode</option>
            <option value="at_home">At-home / On-location</option>
            <option value="studio">Studio / Salon</option>
            <option value="remote">Remote / Online</option>
          </Select>

          <Input
            label="Max Starting Budget"
            type="number"
            min={0}
            placeholder="e.g. 15000"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
          />

          <Select
            label="Minimum Rating"
            value={String(minRating)}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value="0">Any rating</option>
            <option value="4">4.0+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </Select>

          <Input
            label="Min Experience (yrs)"
            type="number"
            min={0}
            placeholder="e.g. 3"
            value={minExp}
            onChange={(e) => setMinExp(e.target.value)}
          />

          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SearchSortOption)}
          >
            <option value="relevance">Relevance</option>
            <option value="rating">Highest Rating</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="recently_active">Recently Active</option>
          </Select>

          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#242331] cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded accent-[#7655D9]"
              />
              Verified only
            </label>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Toolbar: Results metadata + List/Map switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="text-xs text-[#6B6879] flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#7655D9]" />
          <span>
            Showing <strong>{results.length}</strong>{' '}
            {source === 'sample_fallback' ? 'sample layout preview' : 'active'} profile
            {results.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="inline-flex rounded-xl border border-[#E9E5EF] bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              viewMode === 'list' ? 'bg-[#7655D9] text-white' : 'text-[#6B6879]'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              viewMode === 'map' ? 'bg-[#7655D9] text-white' : 'text-[#6B6879]'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
        </div>
      </div>

      {/* Honest Firestore search capability note */}
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#E9E5EF] bg-white px-4 py-2.5 text-xs text-[#6B6879]">
        <Info className="h-4 w-4 text-[#7655D9] shrink-0 mt-0.5" />
        <span>{SEARCH_CAPABILITIES.note}</span>
      </div>

      {viewMode === 'map' ? (
        <Card className="p-8 text-center">
          {mapStatus.configured ? (
            <iframe
              title="VEYRA Professionals Map"
              className="h-[460px] w-full rounded-xl border border-[#E9E5EF]"
              src={mapsProvider.getEmbedSearchUrl(`${category || 'beauty creative'} ${city || 'India'}`) || ''}
              loading="lazy"
            />
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <MapIcon className="h-10 w-10 text-[#7655D9] mx-auto" />
              <h3 className="text-base font-semibold text-[#242331]">
                Map Provider Not Configured
              </h3>
              <p className="text-sm text-[#6B6879]">{mapStatus.reason}</p>
              <Button variant="soft" onClick={() => setViewMode('list')}>
                Return to List View
              </Button>
            </div>
          )}
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <LoadingSkeleton key={idx} className="h-80" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No professionals match your filters"
          description="Try broadening your city, budget, or category filters—or post a requirement so matching professionals can reach out to you."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
              <Link href="/customer/requests/new">
                <Button>Post a Requirement</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((pro) => (
              <ProfessionalCard
                key={pro.uid}
                professional={pro}
                isFavourited={activeFavourites.has(pro.uid)}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </div>

          {hasMore && nextCursor && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                loading={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  void executeSearch(nextCursor, true);
                }}
              >
                Load more professionals
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
        </div>
      }
    >
      <ExploreDirectoryInner />
    </React.Suspense>
  );
}
