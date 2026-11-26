'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/StateBlocks';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import type { CategoryRecord, SubcategoryRecord } from '@/types/domain';

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [source, setSource] = React.useState<'firestore' | 'seed_fallback'>('seed_fallback');

  React.useEffect(() => {
    void fetchActiveCategoriesAndSubcategories().then((res) => {
      setCategories(res.categories);
      setSubcategories(res.subcategories);
      setSource(res.source);
    });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Marketplace Categories"
        title="Beauty, Styling & Creative Categories"
        description="Browse dynamic marketplace categories and specialised services. Post a request in any category to compare proposals."
        actions={
          <Link href="/customer/requests/new">
            <Button>Post a Requirement</Button>
          </Link>
        }
      />

      {source === 'seed_fallback' && (
        <div className="mb-6 rounded-xl border border-[#EDE5FF] bg-[#F5F0FF] px-4 py-2.5 text-xs text-[#5B3EB5]">
          Showing default launch category schema. Once seeded in Firestore, Admin Category Management updates propagate here dynamically.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {categories.map((cat) => {
          const subs = subcategories.filter((s) => s.categorySlug === cat.slug);
          return (
            <Card key={cat.id} className="overflow-hidden flex flex-col sm:flex-row">
              <div className="sm:w-48 shrink-0 bg-[#F5F0FF]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.coverImageUrl}
                  alt={cat.name}
                  className="h-48 sm:h-full w-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-[#242331]">{cat.name}</h2>
                  {cat.featured && <Badge tone="lavender">Featured</Badge>}
                </div>
                <p className="mt-1.5 text-sm text-[#6B6879]">{cat.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {subs.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/explore?category=${cat.slug}&subcategory=${sub.slug}`}
                      className="rounded-lg border border-[#E9E5EF] bg-[#FFFCF8] px-2.5 py-1 text-xs text-[#504D61] hover:border-[#7655D9]"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center gap-3">
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B3EB5] hover:underline"
                  >
                    Explore {cat.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/customer/requests/new?category=${cat.slug}`}
                    className="text-xs font-medium text-[#6B6879] hover:text-[#242331]"
                  >
                    Post {cat.name} request
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
