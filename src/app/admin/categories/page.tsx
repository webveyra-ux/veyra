'use client';

import * as React from 'react';
import { Database, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { slugify } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import {
  fetchAllCategoriesForAdmin,
  saveCategoryAdmin,
  saveSubcategoryAdmin,
  toggleCategoryStatusAdmin,
} from '@/services/categories.service';
import type { CategoryRecord, SubcategoryRecord } from '@/types/domain';

export default function AdminCategoriesPage() {
  const { notify } = useToast();
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [catName, setCatName] = React.useState('');
  const [catDesc, setCatDesc] = React.useState('');
  const [catCover, setCatCover] = React.useState('/images/categories/makeup.jpg');
  const [catSort, setCatSort] = React.useState('11');
  const [catFeatured, setCatFeatured] = React.useState(false);

  const [subCategorySlug, setSubCategorySlug] = React.useState('makeup');
  const [subName, setSubName] = React.useState('');
  const [subDesc, setSubDesc] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetchAllCategoriesForAdmin();
    setCategories(res.categories);
    setSubcategories(res.subcategories);
    if (res.categories[0]) setSubCategorySlug(res.categories[0].slug);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let active = true;
    void fetchAllCategoriesForAdmin().then((res) => {
      if (!active) return;
      setCategories(res.categories);
      setSubcategories(res.subcategories);
      if (res.categories[0]) setSubCategorySlug(res.categories[0].slug);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSeed() {
    setSaving(true);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: { action: 'seed_categories' },
      });
      await load();
      notify({ tone: 'success', title: 'Initial 10 categories seeded into Firestore' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Seed failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const slug = slugify(catName);
    const now = new Date().toISOString();
    await saveCategoryAdmin({
      id: slug,
      name: catName.trim(),
      slug,
      description: catDesc.trim(),
      icon: 'Sparkles',
      coverImageUrl: catCover.trim(),
      sortOrder: Number(catSort) || categories.length + 1,
      active: true,
      featured: catFeatured,
      createdAt: now,
      updatedAt: now,
    });
    setCatName('');
    setCatDesc('');
    await load();
    notify({ tone: 'success', title: 'Category saved' });
  }

  async function handleAddSubcategory(e: React.FormEvent) {
    e.preventDefault();
    if (!subName.trim()) return;
    const slug = slugify(subName);
    const now = new Date().toISOString();
    await saveSubcategoryAdmin({
      id: slug,
      categoryId: subCategorySlug,
      categorySlug: subCategorySlug,
      name: subName.trim(),
      slug,
      description: subDesc.trim() || subName.trim(),
      sortOrder: subcategories.length + 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    setSubName('');
    setSubDesc('');
    await load();
    notify({ tone: 'success', title: 'Subcategory added' });
  }

  if (loading) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dynamic Taxonomy"
        title="Categories & Subcategories"
        description="Categories stored in Firestore dynamically drive homepage grids, search filters, and post-a-request flows."
        actions={
          <Button size="sm" variant="soft" loading={saving} onClick={handleSeed}>
            <Database className="h-4 w-4" />
            Seed Default Launch Categories
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-[#242331] mb-4">Add / Update Category</h2>
          <form onSubmit={handleAddCategory} className="space-y-3">
            <Input
              label="Category Name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              rows={2}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cover Image URL"
                value={catCover}
                onChange={(e) => setCatCover(e.target.value)}
                required
              />
              <Input
                label="Sort Order"
                type="number"
                value={catSort}
                onChange={(e) => setCatSort(e.target.value)}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={catFeatured}
                onChange={(e) => setCatFeatured(e.target.checked)}
                className="accent-[#7655D9]"
              />
              Featured on homepage
            </label>
            <div>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                Save Category
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-[#242331] mb-4">Add Subcategory</h2>
          <form onSubmit={handleAddSubcategory} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-[#242331]">Parent Category</label>
              <select
                value={subCategorySlug}
                onChange={(e) => setSubCategorySlug(e.target.value)}
                className="w-full min-h-11 rounded-xl border border-[#E9E5EF] px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Subcategory Name"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              required
            />
            <Input
              label="Short Description"
              value={subDesc}
              onChange={(e) => setSubDesc(e.target.value)}
            />
            <Button type="submit" size="sm" variant="soft">
              <Plus className="h-4 w-4" />
              Add Subcategory
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#242331]">
          Firestore Categories ({categories.length})
        </h2>
        {categories.length === 0 ? (
          <p className="text-xs text-[#6B6879]">
            No categories stored in Firestore yet. Click &ldquo;Seed Default Launch Categories&rdquo; above to populate them.
          </p>
        ) : (
          <div className="space-y-2.5">
            {categories.map((cat) => {
              const subs = subcategories.filter((s) => s.categorySlug === cat.slug);
              return (
                <div
                  key={cat.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E9E5EF] p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#242331]">{cat.name}</span>
                      <Badge tone={cat.active ? 'mint' : 'neutral'}>
                        {cat.active ? 'Active' : 'Archived'}
                      </Badge>
                      {cat.featured && <Badge tone="lavender">Featured</Badge>}
                    </div>
                    <p className="text-xs text-[#6B6879] mt-0.5">
                      Order #{cat.sortOrder} &middot; {subs.length} subcategories:{' '}
                      {subs.map((s) => s.name).join(', ')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await toggleCategoryStatusAdmin(cat.id, !cat.active);
                      await load();
                    }}
                  >
                    {cat.active ? 'Archive' : 'Activate'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
