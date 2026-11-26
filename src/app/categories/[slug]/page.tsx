'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ProfessionalCard } from '@/components/common/ProfessionalCard';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import { searchProfessionals } from '@/services/professionals.service';
import type { CategoryRecord, ProfessionalProfile, SubcategoryRecord } from '@/types/domain';

function CategoryDetailInner() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [category, setCategory] = React.useState<CategoryRecord | null>(null);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [selectedSub, setSelectedSub] = React.useState<string>('');
  const [pros, setPros] = React.useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [catRes, proRes] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        searchProfessionals({ category: slug, subcategory: selectedSub || undefined }),
      ]);
      if (!active) return;
      setCategory(catRes.categories.find((c) => c.slug === slug) ?? null);
      setSubcategories(catRes.subcategories.filter((s) => s.categorySlug === slug));
      setPros(proRes.items);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, selectedSub]);

  if (!loading && !category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <EmptyState
          title="Category not found"
          description="This category may be archived or does not exist."
          action={
            <Link href="/categories">
              <Button>View all categories</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B6879] hover:text-[#242331] mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Categories
      </Link>

      <PageHeader
        eyebrow="Category"
        title={category?.name || 'Loading category...'}
        description={category?.description}
        actions={
          <Link href={`/customer/requests/new?category=${slug}`}>
            <Button>
              <Sparkles className="h-4 w-4" />
              Post {category?.name || ''} Requirement
            </Button>
          </Link>
        }
      />

      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedSub('')}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
              !selectedSub
                ? 'border-[#7655D9] bg-[#7655D9] text-white'
                : 'border-[#E9E5EF] bg-white text-[#242331]'
            }`}
          >
            All {category?.name}
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSub(sub.slug)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer ${
                selectedSub === sub.slug
                  ? 'border-[#7655D9] bg-[#7655D9] text-white'
                  : 'border-[#E9E5EF] bg-white text-[#242331]'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
          <LoadingSkeleton className="h-80" />
        </div>
      ) : pros.length === 0 ? (
        <EmptyState
          title={`No active professionals listed in ${category?.name || slug} yet`}
          description="Post a requirement so professionals joining this category can send proposals directly."
          action={
            <Link href={`/customer/requests/new?category=${slug}`}>
              <Button>Post a Requirement</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((pro) => (
            <ProfessionalCard key={pro.uid} professional={pro} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10">
          <LoadingSkeleton className="h-96" />
        </div>
      }
    >
      <CategoryDetailInner />
    </React.Suspense>
  );
}
