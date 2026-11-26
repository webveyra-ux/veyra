'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { deleteStorageAsset } from '@/lib/storage/upload';
import { formatPriceRange } from '@/lib/utils';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import { getProfessionalProfile, saveProfessionalProfile } from '@/services/professionals.service';
import type {
  CategoryRecord,
  PortfolioItem,
  ProfessionalProfile,
  ProfessionalServiceItem,
  ServiceMode,
  SubcategoryRecord,
} from '@/types/domain';

export default function ProfessionalPortfolioAndServicesPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();

  const [pro, setPro] = React.useState<ProfessionalProfile | null>(null);
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [portfolio, setPortfolio] = React.useState<PortfolioItem[]>([]);
  const [newPortfolioFiles, setNewPortfolioFiles] = React.useState<UploadedItem[]>([]);
  const [newPortfolioCat, setNewPortfolioCat] = React.useState('makeup');
  const [newPortfolioTitle, setNewPortfolioTitle] = React.useState('');
  const [newPortfolioDesc, setNewPortfolioDesc] = React.useState('');

  const [services, setServices] = React.useState<ProfessionalServiceItem[]>([]);
  const [srvCat, setSrvCat] = React.useState('makeup');
  const [srvSub, setSrvSub] = React.useState('bridal-makeup');
  const [srvName, setSrvName] = React.useState('');
  const [srvDesc, setSrvDesc] = React.useState('');
  const [srvMin, setSrvMin] = React.useState('4000');
  const [srvMax, setSrvMax] = React.useState('10000');
  const [srvDuration, setSrvDuration] = React.useState('90');
  const [srvModes, setSrvModes] = React.useState<ServiceMode[]>(['at_home']);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [catRes, profile] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
      ]);
      if (!active) return;
      setCategories(catRes.categories);
      setSubcategories(catRes.subcategories);
      if (profile && !profile.isSampleData) {
        setPro(profile);
        setPortfolio(profile.portfolio || []);
        setServices(profile.services || []);
        if (profile.categories[0]) {
          setNewPortfolioCat(profile.categories[0]);
          setSrvCat(profile.categories[0]);
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  async function persistAll(nextPortfolio: PortfolioItem[], nextServices: ProfessionalServiceItem[]) {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const updated = await saveProfessionalProfile(firebaseUser.uid, {
        portfolio: nextPortfolio.map((item, idx) => ({ ...item, sortOrder: idx + 1 })),
        services: nextServices,
      });
      setPro(updated);
      notify({ tone: 'success', title: 'Portfolio & services saved' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPortfolioItems() {
    if (newPortfolioFiles.length === 0) return;
    const added: PortfolioItem[] = newPortfolioFiles.map((f, idx) => ({
      id: f.id,
      url: f.url,
      storagePath: f.storagePath,
      mediaType: f.mimeType?.startsWith('video/') ? 'video' : 'image',
      categorySlug: newPortfolioCat,
      title: newPortfolioTitle.trim() || f.name || 'Portfolio Item',
      description: newPortfolioDesc.trim(),
      isCover: portfolio.length === 0 && idx === 0,
      sortOrder: portfolio.length + idx + 1,
      createdAt: new Date().toISOString(),
    }));
    const next = [...portfolio, ...added];
    setPortfolio(next);
    setNewPortfolioFiles([]);
    setNewPortfolioTitle('');
    setNewPortfolioDesc('');
    await persistAll(next, services);
  }

  async function handleDeletePortfolio(item: PortfolioItem) {
    const next = portfolio.filter((p) => p.id !== item.id);
    setPortfolio(next);
    await deleteStorageAsset(item.storagePath);
    await persistAll(next, services);
  }

  async function handleSetCover(itemId: string) {
    const next = portfolio.map((p) => ({ ...p, isCover: p.id === itemId }));
    setPortfolio(next);
    await persistAll(next, services);
  }

  async function handleReorder(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= portfolio.length) return;
    const next = [...portfolio];
    const current = next[index]!;
    next[index] = next[target]!;
    next[target] = current;
    setPortfolio(next);
    await persistAll(next, services);
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!srvName.trim() || srvDesc.trim().length < 5) return;
    const next: ProfessionalServiceItem[] = [
      ...services,
      {
        id: `srv_${Date.now()}`,
        categorySlug: srvCat,
        subcategorySlug: srvSub,
        name: srvName.trim(),
        description: srvDesc.trim(),
        priceMin: Number(srvMin) || 0,
        priceMax: Number(srvMax) || 0,
        currency: 'INR',
        durationMinutes: Number(srvDuration) || 60,
        serviceModes: srvModes,
      },
    ];
    setServices(next);
    setSrvName('');
    setSrvDesc('');
    await persistAll(portfolio, next);
  }

  if (loading) return <LoadingSkeleton className="h-[480px]" />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Studio Showcase"
        title="Portfolio & Service Catalogue"
        description={`Upload work samples and keep your service pricing current (${pro?.services.length || 0} services, ${portfolio.length} portfolio items).`}
      />

      {/* Portfolio Uploader & Grid */}
      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-[#242331]">Portfolio Manager</h2>

        <div className="rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category Tag"
              value={newPortfolioCat}
              onChange={(e) => setNewPortfolioCat(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              label="Work Title"
              value={newPortfolioTitle}
              onChange={(e) => setNewPortfolioTitle(e.target.value)}
              placeholder="e.g., Dewy Bridal Reception Look"
            />
          </div>
          <Input
            label="Short Description"
            value={newPortfolioDesc}
            onChange={(e) => setNewPortfolioDesc(e.target.value)}
            placeholder="Notes on style, finish, or occasion..."
          />
          {firebaseUser && (
            <ImageUploader
              folder={{ type: 'professional_portfolio', uid: firebaseUser.uid }}
              items={newPortfolioFiles}
              onChange={setNewPortfolioFiles}
              maxFiles={6}
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              label="Upload Media (Images or MP4/WebM)"
            />
          )}
          <Button
            size="sm"
            loading={saving}
            disabled={newPortfolioFiles.length === 0}
            onClick={() => void handleAddPortfolioItems()}
          >
            <Plus className="h-4 w-4" />
            Add Uploaded Items to Portfolio
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#E9E5EF] overflow-hidden bg-white flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-[#F5F0FF]">
                {item.mediaType === 'video' ? (
                  <video src={item.url} controls className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                )}
                {item.isCover && (
                  <Badge tone="lavender" className="absolute left-2.5 top-2.5">
                    Cover
                  </Badge>
                )}
              </div>
              <div className="p-3.5 space-y-2 flex-1 flex flex-col">
                <p className="text-sm font-semibold text-[#242331] truncate">{item.title}</p>
                <p className="text-xs text-[#6B6879] capitalize">
                  {item.categorySlug.replace('-', ' ')}
                </p>
                <div className="mt-auto pt-2 flex items-center justify-between border-t border-[#E9E5EF]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleReorder(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                      className="p-1.5 rounded-lg hover:bg-[#F5F0FF] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReorder(idx, 1)}
                      disabled={idx === portfolio.length - 1}
                      aria-label="Move down"
                      className="p-1.5 rounded-lg hover:bg-[#F5F0FF] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSetCover(item.id)}
                      aria-label="Set as cover"
                      className="p-1.5 rounded-lg hover:bg-[#F5F0FF] text-[#5B3EB5] cursor-pointer"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeletePortfolio(item)}
                    aria-label="Delete item"
                    className="p-1.5 rounded-lg hover:bg-[#FFF0F3] text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Services Catalogue */}
      <Card className="p-6 space-y-5">
        <h2 className="text-lg font-semibold text-[#242331]">Services &amp; Pricing</h2>

        <form
          onSubmit={handleAddService}
          className="rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={srvCat}
              onChange={(e) => {
                setSrvCat(e.target.value);
                const firstSub = subcategories.find((s) => s.categorySlug === e.target.value);
                if (firstSub) setSrvSub(firstSub.slug);
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              label="Subcategory"
              value={srvSub}
              onChange={(e) => setSrvSub(e.target.value)}
            >
              {subcategories
                .filter((s) => s.categorySlug === srvCat)
                .map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
            </Select>
            <Input
              label="Service Name"
              value={srvName}
              onChange={(e) => setSrvName(e.target.value)}
              required
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={srvDuration}
              onChange={(e) => setSrvDuration(e.target.value)}
              required
            />
            <Input
              label="Minimum Price (INR)"
              type="number"
              value={srvMin}
              onChange={(e) => setSrvMin(e.target.value)}
              required
            />
            <Input
              label="Maximum Price (INR)"
              type="number"
              value={srvMax}
              onChange={(e) => setSrvMax(e.target.value)}
              required
            />
          </div>
          <Textarea
            label="Service Description"
            value={srvDesc}
            onChange={(e) => setSrvDesc(e.target.value)}
            rows={2}
            required
          />
          <div className="flex flex-wrap gap-3 items-center">
            {(['at_home', 'studio', 'remote'] as const).map((m) => (
              <label key={m} className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={srvModes.includes(m)}
                  onChange={(e) =>
                    setSrvModes((prev) =>
                      e.target.checked
                        ? [...prev, m]
                        : prev.length > 1
                          ? prev.filter((x) => x !== m)
                          : prev
                    )
                  }
                  className="accent-[#7655D9]"
                />
                {m.replace('_', ' ')}
              </label>
            ))}
          </div>
          <Button type="submit" size="sm" loading={saving}>
            <Plus className="h-4 w-4" />
            Save New Service
          </Button>
        </form>

        <div className="space-y-2.5">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#E9E5EF] p-4"
            >
              <div>
                <p className="text-sm font-semibold text-[#242331]">{srv.name}</p>
                <p className="text-xs text-[#6B6879] mt-0.5">{srv.description}</p>
                <p className="text-xs font-medium text-[#5B3EB5] mt-1">
                  {formatPriceRange(srv.priceMin, srv.priceMax, srv.currency)} &middot;{' '}
                  {srv.durationMinutes} mins
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = services.filter((s) => s.id !== srv.id);
                  setServices(next);
                  await persistAll(portfolio, next);
                }}
                aria-label="Remove service"
                className="p-2 text-[#6B6879] hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
