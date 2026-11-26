'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { cn } from '@/lib/utils';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import { getProfessionalProfile, saveProfessionalProfile } from '@/services/professionals.service';
import type { CategoryRecord, ServiceMode, SubcategoryRecord } from '@/types/domain';

export default function ProfessionalProfileEditorPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);

  const [displayName, setDisplayName] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [headline, setHeadline] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [experienceYears, setExperienceYears] = React.useState('0');
  const [city, setCity] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [serviceAreas, setServiceAreas] = React.useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = React.useState('15');
  const [languages, setLanguages] = React.useState('English');
  const [productsUsed, setProductsUsed] = React.useState('');
  const [productsSummary, setProductsSummary] = React.useState('');
  const [profileStatus, setProfileStatus] = React.useState<'draft' | 'active' | 'paused'>('active');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = React.useState<string[]>([]);
  const [serviceModes, setServiceModes] = React.useState<ServiceMode[]>(['at_home']);
  const [avatarItems, setAvatarItems] = React.useState<UploadedItem[]>([]);
  const [coverItems, setCoverItems] = React.useState<UploadedItem[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [catRes, pro] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
      ]);
      if (!active) return;
      setCategories(catRes.categories);
      setSubcategories(catRes.subcategories);
      if (pro && !pro.isSampleData) {
        setDisplayName(pro.displayName);
        setBusinessName(pro.businessName);
        setHeadline(pro.headline);
        setBio(pro.bio);
        setExperienceYears(String(pro.experienceYears));
        setCity(pro.location.city);
        setLocality(pro.location.locality);
        setServiceAreas(pro.serviceAreas.join(', '));
        setServiceRadiusKm(String(pro.serviceRadiusKm));
        setLanguages(pro.languages.join(', '));
        setProductsUsed((pro.productsUsed || []).join(', '));
        setProductsSummary(pro.productsSummary || '');
        if (pro.profileStatus !== 'suspended') setProfileStatus(pro.profileStatus);
        setSelectedCategories(pro.categories);
        setSelectedSubcategories(pro.subcategories);
        setServiceModes(pro.serviceModes.length ? pro.serviceModes : ['at_home']);
        if (pro.profilePhotoUrl) {
          setAvatarItems([{ id: 'avatar', url: pro.profilePhotoUrl, storagePath: '' }]);
        }
        if (pro.coverImageUrl) {
          setCoverItems([{ id: 'cover', url: pro.coverImageUrl, storagePath: '' }]);
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await saveProfessionalProfile(firebaseUser.uid, {
        displayName: displayName.trim(),
        businessName: businessName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        experienceYears: Number(experienceYears) || 0,
        location: { city: city.trim(), locality: locality.trim(), country: 'India' },
        serviceAreas: serviceAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        serviceRadiusKm: Number(serviceRadiusKm) || 15,
        languages: languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        productsUsed: productsUsed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        productsSummary: productsSummary.trim(),
        categories: selectedCategories,
        subcategories: selectedSubcategories,
        serviceModes,
        profileStatus,
        profilePhotoUrl: avatarItems[0]?.url || null,
        coverImageUrl: coverItems[0]?.url || null,
      });
      notify({ tone: 'success', title: 'Professional profile saved' });
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

  if (loading) return <LoadingSkeleton className="h-[540px]" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio Profile"
        title="Edit Professional Profile"
        description="Update your branding, service areas, categories, and public visibility."
      />

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {firebaseUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ImageUploader
                folder={{ type: 'user_profile', uid: firebaseUser.uid }}
                items={avatarItems}
                onChange={setAvatarItems}
                maxFiles={1}
                label="Profile Photo"
              />
              <ImageUploader
                folder={{ type: 'professional_portfolio', uid: firebaseUser.uid }}
                items={coverItems}
                onChange={setCoverItems}
                maxFiles={1}
                label="Cover Banner Image"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              label="Shop / Studio Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <Input
              label="Professional Title"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              required
            />
            <Select
              label="Listing Status"
              value={profileStatus}
              onChange={(e) =>
                setProfileStatus(e.target.value as 'draft' | 'active' | 'paused')
              }
            >
              <option value="active">Active (Visible in directory &amp; matching)</option>
              <option value="paused">Paused (Hidden from new requests)</option>
              <option value="draft">Draft</option>
            </Select>
          </div>

          <Textarea label="Brief Description / Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Products & Brands Used (comma-separated)"
              placeholder="e.g. MAC Cosmetics, Huda Beauty, Organic Sojat Henna"
              value={productsUsed}
              onChange={(e) => setProductsUsed(e.target.value)}
            />
            <Input
              label="Product & Hygiene Notes"
              placeholder="e.g. Dermatologically tested, single-use applicators"
              value={productsSummary}
              onChange={(e) => setProductsSummary(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
            <Input
              label="Locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              required
            />
            <Input
              label="Service Radius (km)"
              type="number"
              value={serviceRadiusKm}
              onChange={(e) => setServiceRadiusKm(e.target.value)}
            />
            <Input
              label="Service Areas (comma-separated)"
              value={serviceAreas}
              onChange={(e) => setServiceAreas(e.target.value)}
            />
            <Input
              label="Experience (years)"
              type="number"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
            <Input
              label="Languages (comma-separated)"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#242331]">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        active ? prev.filter((c) => c !== cat.slug) : [...prev, cat.slug]
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium cursor-pointer',
                      active
                        ? 'border-[#7655D9] bg-[#7655D9] text-white'
                        : 'border-[#E9E5EF] bg-white text-[#242331]'
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#242331]">Subcategories</p>
            <div className="flex flex-wrap gap-1.5">
              {subcategories
                .filter((s) => selectedCategories.includes(s.categorySlug))
                .map((sub) => {
                  const active = selectedSubcategories.includes(sub.slug);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubcategories((prev) =>
                          active ? prev.filter((x) => x !== sub.slug) : [...prev, sub.slug]
                        )
                      }
                      className={cn(
                        'rounded-xl border px-2.5 py-1 text-xs cursor-pointer',
                        active
                          ? 'border-[#7655D9] bg-[#F5F0FF] text-[#5B3EB5] font-semibold'
                          : 'border-[#E9E5EF] bg-white text-[#6B6879]'
                      )}
                    >
                      {sub.name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#242331]">Service Modes</p>
            <div className="flex flex-wrap gap-2">
              {(['at_home', 'studio', 'remote'] as const).map((mode) => {
                const active = serviceModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setServiceModes((prev) =>
                        active && prev.length > 1
                          ? prev.filter((m) => m !== mode)
                          : active
                            ? prev
                            : [...prev, mode]
                      )
                    }
                    className={cn(
                      'rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer',
                      active
                        ? 'border-[#7655D9] bg-[#F5F0FF] text-[#5B3EB5]'
                        : 'border-[#E9E5EF] bg-white text-[#242331]'
                    )}
                  >
                    {SERVICE_MODE_LABELS[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" loading={saving}>
            Save Profile Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
