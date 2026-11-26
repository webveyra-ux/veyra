'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { POPULAR_CITIES, SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { cn } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import {
  DEFAULT_AVAILABILITY_SCHEDULE,
  getProfessionalAvailability,
  getProfessionalProfile,
  saveProfessionalAvailability,
  saveProfessionalProfile,
  submitVerificationRecord,
} from '@/services/professionals.service';
import type {
  AvailabilitySchedule,
  CategoryRecord,
  PortfolioItem,
  ProfessionalServiceItem,
  ServiceMode,
  SubcategoryRecord,
  WeekdayKey,
} from '@/types/domain';

const ONBOARDING_STEPS = [
  'Account Verified',
  'Personal Info',
  'Profession & Bio',
  'Categories',
  'Services & Rates',
  'Experience & Languages',
  'Location & Areas',
  'Service Modes',
  'Portfolio',
  'Availability',
  'Verification',
  'Review & Publish',
] as const;

export default function ProfessionalOnboardingPage() {
  const router = useRouter();
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();

  const [step, setStep] = React.useState(2);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);

  // Step fields
  const [displayName, setDisplayName] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [profilePhotos, setProfilePhotos] = React.useState<UploadedItem[]>([]);
  const [headline, setHeadline] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = React.useState<string[]>([]);
  const [services, setServices] = React.useState<ProfessionalServiceItem[]>([]);
  const [experienceYears, setExperienceYears] = React.useState('2');
  const [languagesInput, setLanguagesInput] = React.useState('English, Hindi');
  const [city, setCity] = React.useState('');
  const [locality, setLocality] = React.useState('');
  const [serviceAreasInput, setServiceAreasInput] = React.useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = React.useState('20');
  const [serviceModes, setServiceModes] = React.useState<ServiceMode[]>(['at_home']);
  const [portfolioItems, setPortfolioItems] = React.useState<UploadedItem[]>([]);
  const [availability, setAvailability] = React.useState<AvailabilitySchedule | null>(null);

  // Verification optional packet inside step 11
  const [legalName, setLegalName] = React.useState('');
  const [govIdType, setGovIdType] = React.useState('national_id');
  const [portfolioProofNote, setPortfolioProofNote] = React.useState('');
  const [verificationDocs, setVerificationDocs] = React.useState<UploadedItem[]>([]);

  // Draft service form helper
  const [newSrvName, setNewSrvName] = React.useState('');
  const [newSrvDesc, setNewSrvDesc] = React.useState('');
  const [newSrvMin, setNewSrvMin] = React.useState('3500');
  const [newSrvMax, setNewSrvMax] = React.useState('9000');
  const [newSrvDur, setNewSrvDur] = React.useState('90');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [catRes, pro, avail] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
        getProfessionalAvailability(firebaseUser.uid).catch(() =>
          DEFAULT_AVAILABILITY_SCHEDULE(firebaseUser.uid)
        ),
      ]);
      if (!active) return;
      setCategories(catRes.categories);
      setSubcategories(catRes.subcategories);
      setAvailability(avail);

      if (pro && !pro.isSampleData) {
        setStep(Math.max(2, Math.min(12, pro.onboardingStep || 2)));
        setDisplayName(pro.displayName || userRecord?.displayName || '');
        setBusinessName(pro.businessName || '');
        if (pro.profilePhotoUrl) {
          setProfilePhotos([{ id: 'avatar', url: pro.profilePhotoUrl, storagePath: '' }]);
        }
        setHeadline(pro.headline || '');
        setBio(pro.bio || '');
        setSelectedCategories(pro.categories || []);
        setSelectedSubcategories(pro.subcategories || []);
        setServices(pro.services || []);
        setExperienceYears(String(pro.experienceYears ?? 2));
        setLanguagesInput((pro.languages || ['English']).join(', '));
        setCity(pro.location?.city || '');
        setLocality(pro.location?.locality || '');
        setServiceAreasInput((pro.serviceAreas || []).join(', '));
        setServiceRadiusKm(String(pro.serviceRadiusKm || 20));
        setServiceModes(pro.serviceModes?.length ? pro.serviceModes : ['at_home']);
        setPortfolioItems(
          pro.portfolio.map((p) => ({
            id: p.id,
            url: p.url,
            storagePath: p.storagePath,
            name: p.title,
            mimeType: p.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          }))
        );
      } else {
        setDisplayName(userRecord?.displayName || '');
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser, userRecord]);

  async function persistProgress(nextStep: number, publish = false) {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      const portfolio: PortfolioItem[] = portfolioItems.map((item, idx) => ({
        id: item.id,
        url: item.url,
        storagePath: item.storagePath,
        mediaType: item.mimeType?.startsWith('video/') ? 'video' : 'image',
        categorySlug: selectedCategories[0] || 'makeup',
        title: item.name || `Work sample ${idx + 1}`,
        description: '',
        isCover: idx === 0,
        sortOrder: idx + 1,
        createdAt: new Date().toISOString(),
      }));

      await saveProfessionalProfile(firebaseUser.uid, {
        displayName: displayName.trim() || userRecord?.displayName || 'Professional',
        businessName: businessName.trim(),
        profilePhotoUrl: profilePhotos[0]?.url || null,
        headline: headline.trim(),
        bio: bio.trim(),
        categories: selectedCategories,
        subcategories: selectedSubcategories,
        services,
        experienceYears: Number(experienceYears) || 0,
        languages: languagesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        location: {
          city: city.trim(),
          locality: locality.trim(),
          country: 'India',
        },
        serviceAreas: serviceAreasInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        serviceRadiusKm: Number(serviceRadiusKm) || 15,
        serviceModes,
        portfolio,
        onboardingStep: nextStep,
        onboardingCompleted: publish,
        profileStatus: publish ? 'active' : 'draft',
      });

      if (availability) {
        await saveProfessionalAvailability(availability);
      }

      if (publish && verificationDocs.length > 0 && legalName.trim()) {
        await submitVerificationRecord(firebaseUser.uid, {
          legalName: legalName.trim(),
          governmentIdType: govIdType,
          businessRegistrationNumber: '',
          documentUrls: verificationDocs.map((d) => ({
            id: d.id,
            name: d.name || 'Document',
            storagePath: d.storagePath,
            mimeType: d.mimeType || 'image/jpeg',
            uploadedAt: new Date().toISOString(),
          })),
          portfolioProofNote: portfolioProofNote.trim() || bio.trim(),
        });
        await callAuthedApi('/api/verification/sync-pending', { method: 'POST' }).catch(
          () => undefined
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function addServiceItem() {
    if (!newSrvName.trim()) return;
    const catSlug = selectedCategories[0] || categories[0]?.slug || 'makeup';
    const subSlug =
      selectedSubcategories[0] ||
      subcategories.find((s) => s.categorySlug === catSlug)?.slug ||
      '';
    setServices((prev) => [
      ...prev,
      {
        id: `srv_${Date.now()}`,
        categorySlug: catSlug,
        subcategorySlug: subSlug,
        name: newSrvName.trim(),
        description: newSrvDesc.trim() || 'Tailored session tailored to your brief.',
        priceMin: Number(newSrvMin) || 0,
        priceMax: Number(newSrvMax) || 0,
        currency: 'INR',
        durationMinutes: Number(newSrvDur) || 60,
        serviceModes,
      },
    ]);
    setNewSrvName('');
    setNewSrvDesc('');
  }

  if (loading) return <LoadingSkeleton className="h-[480px]" />;

  const visibleSubs = subcategories.filter((s) =>
    selectedCategories.includes(s.categorySlug)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Professional Onboarding"
        title="Set up your studio profile"
        description="Complete each step or save progress to resume anytime. Your profile goes live in VEYRA search upon final publication."
      />

      {/* Stepper */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-xs font-medium text-[#6B6879] mb-2">
          <span>
            Step {step} of 12: <strong className="text-[#242331]">{ONBOARDING_STEPS[step - 1]}</strong>
          </span>
          <span>{Math.round((step / 12) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[#EDE5FF] overflow-hidden">
          <div
            className="h-full bg-[#7655D9] transition-all"
            style={{ width: `${(step / 12) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {ONBOARDING_STEPS.map((label, idx) => {
            const num = idx + 1;
            return (
              <button
                key={label}
                type="button"
                onClick={() => num >= 2 && setStep(num)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap cursor-pointer',
                  num === step
                    ? 'bg-[#7655D9] text-white'
                    : num < step
                      ? 'bg-[#F5F0FF] text-[#5B3EB5]'
                      : 'bg-[#F6F4FA] text-[#6B6879]'
                )}
              >
                {num}. {label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">2. Personal Information</h2>
            {firebaseUser && (
              <ImageUploader
                folder={{ type: 'user_profile', uid: firebaseUser.uid }}
                items={profilePhotos}
                onChange={setProfilePhotos}
                maxFiles={1}
                label="Profile Picture"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Input
                label="Studio / Business Name (optional)"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Atelier Lumière"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">3. Profession &amp; Bio</h2>
            <Input
              label="Professional Title / Headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Bridal Makeup & Editorial Hair Artist"
              required
            />
            <Textarea
              label="About Your Craft"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your training, style aesthetic, hygiene standards, and approach with clients..."
              hint="Aim for at least 30 characters."
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">4. Select Categories &amp; Specialties</h2>
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
                      'rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer',
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

            {visibleSubs.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-[#6B6879]">Subcategories</p>
                <div className="flex flex-wrap gap-2">
                  {visibleSubs.map((sub) => {
                    const active = selectedSubcategories.includes(sub.slug);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() =>
                          setSelectedSubcategories((prev) =>
                            active ? prev.filter((s) => s !== sub.slug) : [...prev, sub.slug]
                          )
                        }
                        className={cn(
                          'rounded-xl border px-3 py-1 text-xs cursor-pointer',
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
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">5. Services &amp; Price Ranges</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-4">
              <Input
                label="Service Name"
                value={newSrvName}
                onChange={(e) => setNewSrvName(e.target.value)}
                placeholder="e.g., Signature Bridal Makeup"
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={newSrvDur}
                onChange={(e) => setNewSrvDur(e.target.value)}
              />
              <Input
                label="Min Price (INR)"
                type="number"
                value={newSrvMin}
                onChange={(e) => setNewSrvMin(e.target.value)}
              />
              <Input
                label="Max Price (INR)"
                type="number"
                value={newSrvMax}
                onChange={(e) => setNewSrvMax(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Short Description"
                  value={newSrvDesc}
                  onChange={(e) => setNewSrvDesc(e.target.value)}
                  placeholder="What is included in this service..."
                />
              </div>
              <div className="sm:col-span-2">
                <Button size="sm" variant="soft" onClick={addServiceItem}>
                  <Plus className="h-4 w-4" />
                  Add Service
                </Button>
              </div>
            </div>

            {services.length > 0 && (
              <div className="space-y-2">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between rounded-xl border border-[#E9E5EF] p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[#242331]">{srv.name}</p>
                      <p className="text-xs text-[#6B6879]">
                        INR {srv.priceMin} – {srv.priceMax} &middot; {srv.durationMinutes} mins
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setServices((prev) => prev.filter((s) => s.id !== srv.id))}
                      className="text-[#6B6879] hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">6. Experience &amp; Languages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Years of Experience"
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
              <Input
                label="Languages Spoken (comma-separated)"
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="English, Hindi, Telugu"
              />
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">7. Location &amp; Service Areas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Base City"
                  list="pro-cities"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <datalist id="pro-cities">
                  {POPULAR_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <Input
                label="Primary Locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
              <Input
                label="Service Radius (km)"
                type="number"
                min={1}
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(e.target.value)}
              />
            </div>
            <Input
              label="Service Areas Covered (comma-separated cities/localities)"
              value={serviceAreasInput}
              onChange={(e) => setServiceAreasInput(e.target.value)}
              placeholder="Hyderabad, Jubilee Hills, Banjara Hills, Gachibowli"
            />
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">8. Supported Service Modes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      'rounded-2xl border p-4 text-left cursor-pointer',
                      active
                        ? 'border-[#7655D9] bg-[#F5F0FF]'
                        : 'border-[#E9E5EF] bg-white'
                    )}
                  >
                    <p className="text-sm font-semibold text-[#242331]">
                      {SERVICE_MODE_LABELS[mode]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 9 && firebaseUser && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">9. Portfolio Uploads</h2>
            <ImageUploader
              folder={{ type: 'professional_portfolio', uid: firebaseUser.uid }}
              items={portfolioItems}
              onChange={setPortfolioItems}
              maxFiles={12}
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              label="Upload Work Samples (images or short videos)"
            />
          </div>
        )}

        {step === 10 && availability && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">10. Availability Preferences</h2>
            <label className="flex items-center gap-2 text-sm text-[#242331]">
              <input
                type="checkbox"
                checked={availability.flexibleScheduling}
                onChange={(e) =>
                  setAvailability({ ...availability, flexibleScheduling: e.target.checked })
                }
                className="h-4 w-4 accent-[#7655D9]"
              />
              Accept flexible customer dates &amp; custom schedule requests
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(availability.weeklyHours) as WeekdayKey[]).map((day) => {
                const cfg = availability.weeklyHours[day];
                return (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded-xl border border-[#E9E5EF] px-3 py-2 text-xs"
                  >
                    <label className="inline-flex items-center gap-2 font-semibold uppercase">
                      <input
                        type="checkbox"
                        checked={cfg.enabled}
                        onChange={(e) =>
                          setAvailability({
                            ...availability,
                            weeklyHours: {
                              ...availability.weeklyHours,
                              [day]: { ...cfg, enabled: e.target.checked },
                            },
                          })
                        }
                        className="accent-[#7655D9]"
                      />
                      {day}
                    </label>
                    <span className="text-[#6B6879]">
                      {cfg.enabled ? `${cfg.start} – ${cfg.end}` : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 11 && firebaseUser && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#242331]">
              11. Verification Packet (Optional Now, Required for Verified Badge)
            </h2>
            <p className="text-xs text-[#6B6879]">
              Verification documents are stored in strictly private Storage paths readable only by you and authorised Verification Admins.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Legal Full Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
              <Select
                label="Government ID Type"
                value={govIdType}
                onChange={(e) => setGovIdType(e.target.value)}
              >
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="business_licence">Business Registration</option>
              </Select>
            </div>
            <Textarea
              label="Credentials / Practice Summary"
              value={portfolioProofNote}
              onChange={(e) => setPortfolioProofNote(e.target.value)}
              rows={3}
            />
            <ImageUploader
              folder={{ type: 'verification_document', uid: firebaseUser.uid }}
              items={verificationDocs}
              onChange={setVerificationDocs}
              maxFiles={3}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              label="Upload ID / Business Document (Private)"
            />
          </div>
        )}

        {step === 12 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#242331]">12. Review &amp; Publish Profile</h2>
              <Badge tone="lavender">Ready</Badge>
            </div>
            <div className="rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-4 text-sm space-y-2">
              <p>
                <strong>Name / Studio:</strong> {businessName || displayName}
              </p>
              <p>
                <strong>Headline:</strong> {headline || '—'}
              </p>
              <p>
                <strong>Categories:</strong> {selectedCategories.join(', ') || 'None selected'}
              </p>
              <p>
                <strong>Services Listed:</strong> {services.length}
              </p>
              <p>
                <strong>Location:</strong> {locality}, {city}
              </p>
              <p>
                <strong>Portfolio Assets:</strong> {portfolioItems.length}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E9E5EF]">
          <div className="flex gap-2">
            {step > 2 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              variant="soft"
              loading={saving}
              onClick={async () => {
                await persistProgress(step, false);
                notify({ tone: 'success', title: 'Onboarding progress saved' });
              }}
            >
              <Save className="h-4 w-4" />
              Save Progress
            </Button>
          </div>

          {step < 12 ? (
            <Button
              loading={saving}
              onClick={async () => {
                const next = step + 1;
                await persistProgress(next, false);
                setStep(next);
              }}
            >
              Save &amp; Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              loading={saving}
              onClick={async () => {
                if (!city.trim() || selectedCategories.length === 0) {
                  notify({
                    tone: 'error',
                    title: 'Select at least one category and city before publishing',
                  });
                  return;
                }
                await persistProgress(12, true);
                notify({
                  tone: 'success',
                  title: 'Professional profile published!',
                  description: 'You can now receive matched customer requests.',
                });
                router.push('/professional/dashboard');
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Publish Studio Profile
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
