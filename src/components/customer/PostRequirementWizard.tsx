'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Save, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { POPULAR_CITIES, SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { addDaysIso, cn, formatCurrency } from '@/lib/utils';
import { serviceRequestSchema } from '@/lib/validation/schemas';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import { listCustomerAddresses } from '@/services/customers.service';
import {
  allocateNewRequestId,
  getRequestById,
  getRequestPrivateDetails,
  publishServiceRequest,
  saveRequestDraft,
} from '@/services/requests.service';
import type {
  CategoryRecord,
  SavedAddress,
  ServiceMode,
  SubcategoryRecord,
  TimePreference,
} from '@/types/domain';

const STEP_TITLES = [
  'Category',
  'Subcategory & Service',
  'Requirements',
  'Reference Images',
  'Date & Time',
  'Location',
  'Service Mode',
  'Budget',
  'Additional Details',
  'Review & Submit',
] as const;

export function PostRequirementWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, userRecord, selectedCity } = useAuth();
  const { notify } = useToast();

  const existingDraftId = searchParams.get('draftId') || searchParams.get('editId');
  const presetCategory = searchParams.get('category') || '';

  const [requestId, setRequestId] = React.useState<string>('');
  const [step, setStep] = React.useState<number>(1);
  const [loadingInit, setLoadingInit] = React.useState(true);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [savedAddresses, setSavedAddresses] = React.useState<SavedAddress[]>([]);

  // Form fields
  const [categorySlug, setCategorySlug] = React.useState(presetCategory);
  const [subcategorySlug, setSubcategorySlug] = React.useState('');
  const [serviceName, setServiceName] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [referenceImages, setReferenceImages] = React.useState<UploadedItem[]>([]);
  const [desiredDate, setDesiredDate] = React.useState('');
  const [flexibleDate, setFlexibleDate] = React.useState(false);
  const [timePreference, setTimePreference] = React.useState<TimePreference>('flexible');
  const [city, setCity] = React.useState(selectedCity || '');
  const [locality, setLocality] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [exactAddressPrivate, setExactAddressPrivate] = React.useState('');
  const [serviceMode, setServiceMode] = React.useState<ServiceMode>('at_home');
  const [budgetMin, setBudgetMin] = React.useState('3000');
  const [budgetMax, setBudgetMax] = React.useState('12000');
  const [budgetFlexible, setBudgetFlexible] = React.useState(true);
  const [peopleCount, setPeopleCount] = React.useState('1');
  const [additionalNotes, setAdditionalNotes] = React.useState('');

  React.useEffect(() => {
    let active = true;
    async function init() {
      setLoadingInit(true);
      const [catData, addrList] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        firebaseUser ? listCustomerAddresses(firebaseUser.uid).catch(() => []) : Promise.resolve([]),
      ]);

      if (!active) return;
      setCategories(catData.categories);
      setSubcategories(catData.subcategories);
      setSavedAddresses(addrList);

      if (existingDraftId) {
        const [req, priv] = await Promise.all([
          getRequestById(existingDraftId),
          getRequestPrivateDetails(existingDraftId),
        ]);
        if (req && active) {
          setRequestId(req.id);
          setCategorySlug(req.categorySlug);
          setSubcategorySlug(req.subcategorySlug);
          setServiceName(req.serviceName);
          setTitle(req.title);
          setDescription(req.description);
          setReferenceImages(req.referenceImages);
          setDesiredDate(req.desiredDate);
          setFlexibleDate(req.flexibleDate);
          setTimePreference(req.timePreference);
          setCity(req.location.city);
          setLocality(req.location.locality);
          setPostalCode(req.location.postalCode || '');
          setServiceMode(req.serviceMode);
          setBudgetMin(String(req.budgetMin));
          setBudgetMax(String(req.budgetMax));
          setBudgetFlexible(req.budgetFlexible);
          setPeopleCount(String(req.peopleCount));
          setAdditionalNotes(req.additionalNotes);
          if (priv?.exactAddress) setExactAddressPrivate(priv.exactAddress);
          setLoadingInit(false);
          return;
        }
      }

      setRequestId(allocateNewRequestId());
      if (addrList.length > 0) {
        const def = addrList.find((a) => a.isDefault) ?? addrList[0]!;
        setCity((prev) => prev || def.city);
        setLocality((prev) => prev || def.locality);
        setPostalCode((prev) => prev || def.postalCode);
        setExactAddressPrivate((prev) => prev || def.line1);
      }
      setLoadingInit(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [existingDraftId, firebaseUser]);

  const selectedCategory = categories.find((c) => c.slug === categorySlug);
  const filteredSubs = subcategories.filter((s) => s.categorySlug === categorySlug);
  const selectedSub = filteredSubs.find((s) => s.slug === subcategorySlug);

  async function persistDraftSilently(): Promise<string> {
    if (!firebaseUser || !userRecord) {
      throw new Error('Sign in required to save your draft.');
    }
    const id = requestId || allocateNewRequestId();
    if (!requestId) setRequestId(id);

    await saveRequestDraft(
      id,
      {
        customerId: firebaseUser.uid,
        customerName: userRecord.displayName || 'Customer',
        categorySlug: categorySlug || categories[0]?.slug || 'makeup',
        categoryName: selectedCategory?.name || categories[0]?.name || 'Makeup',
        subcategorySlug: subcategorySlug || filteredSubs[0]?.slug || '',
        subcategoryName: selectedSub?.name || filteredSubs[0]?.name || '',
        serviceName: serviceName || selectedSub?.name || 'Custom Service',
        title: title || `${selectedCategory?.name || 'Service'} requirement`,
        description,
        referenceImages: referenceImages.map((img) => ({
          id: img.id,
          url: img.url,
          storagePath: img.storagePath,
        })),
        desiredDate: desiredDate || addDaysIso(7).slice(0, 10),
        flexibleDate,
        timePreference,
        location: {
          city: city || 'Hyderabad',
          locality: locality || 'City Center',
          postalCode,
        },
        serviceMode,
        budgetMin: Number(budgetMin) || 0,
        budgetMax: Number(budgetMax) || 0,
        currency: 'INR',
        budgetFlexible,
        peopleCount: Math.max(1, Number(peopleCount) || 1),
        additionalNotes,
        status: 'draft',
      },
      {
        exactAddress: exactAddressPrivate,
      }
    );

    return id;
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await persistDraftSilently();
      notify({ tone: 'success', title: 'Draft saved', description: 'Resume anytime from My Requests.' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not save draft',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGoNext() {
    if (step === 1 && !categorySlug) {
      notify({ tone: 'error', title: 'Select a category first' });
      return;
    }
    if (step === 2 && !subcategorySlug) {
      notify({ tone: 'error', title: 'Choose a subcategory or specialty' });
      return;
    }
    if (step === 3 && (title.trim().length < 5 || description.trim().length < 20)) {
      notify({
        tone: 'error',
        title: 'Complete your brief',
        description: 'Add a clear title (5+ chars) and description (20+ chars).',
      });
      return;
    }
    // Ensure draft record exists in Firestore before uploading images to Storage (required by storage.rules)
    if (step === 3 && firebaseUser) {
      try {
        await persistDraftSilently();
      } catch {
        // Non-fatal if user isn't fully provisioned yet; uploader error explains
      }
    }
    setStep((s) => Math.min(10, s + 1));
  }

  async function handlePublishSubmit() {
    if (!firebaseUser) return;
    const validation = serviceRequestSchema.safeParse({
      categorySlug,
      subcategorySlug,
      serviceName: serviceName || selectedSub?.name || 'Custom Service',
      title,
      description,
      desiredDate,
      flexibleDate,
      timePreference,
      city,
      locality,
      postalCode,
      exactAddressPrivate,
      serviceMode,
      budgetMin: Number(budgetMin) || 0,
      budgetMax: Number(budgetMax) || 0,
      budgetFlexible,
      peopleCount: Number(peopleCount) || 1,
      additionalNotes,
    });

    if (!validation.success) {
      notify({
        tone: 'error',
        title: 'Please check required details',
        description: validation.error.issues[0]?.message,
      });
      return;
    }

    setSubmitting(true);
    try {
      const id = await persistDraftSilently();
      const matchRes = await publishServiceRequest(id);
      notify({
        tone: 'success',
        title: 'Request published on VEYRA!',
        description:
          matchRes.matchedCount > 0
            ? `Notified ${matchRes.matchedCount} matching professional${matchRes.matchedCount === 1 ? '' : 's'}.`
            : 'Your requirement is live and visible to relevant professionals.',
      });
      router.push(`/customer/requests/${id}`);
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Unable to publish request',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInit) {
    return <LoadingSkeleton className="h-[460px]" />;
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between text-xs font-medium text-[#6B6879] mb-2">
          <span>
            Step {step} of 10: <strong className="text-[#242331]">{STEP_TITLES[step - 1]}</strong>
          </span>
          <span>{step * 10}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#EDE5FF] overflow-hidden">
          <div
            className="h-full bg-[#7655D9] transition-all duration-300"
            style={{ width: `${step * 10}%` }}
          />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {STEP_TITLES.map((label, idx) => {
            const num = idx + 1;
            return (
              <button
                key={label}
                type="button"
                onClick={() => num <= step && setStep(num)}
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

      {/* Step Content */}
      <Card className="p-5 sm:p-8 space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              1. Which category fits your request?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategorySlug(cat.slug);
                    setSubcategorySlug('');
                  }}
                  className={cn(
                    'overflow-hidden rounded-2xl border text-left transition-all cursor-pointer',
                    categorySlug === cat.slug
                      ? 'border-[#7655D9] ring-2 ring-[#7655D9]/25 bg-[#F5F0FF]'
                      : 'border-[#E9E5EF] bg-white hover:border-[#7655D9]/50'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.coverImageUrl}
                    alt={cat.name}
                    className="h-24 w-full object-cover"
                  />
                  <p className="p-2.5 text-xs font-semibold text-[#242331]">{cat.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              2. Choose specialty &amp; specific service
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSubs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSubcategorySlug(sub.slug);
                    if (!serviceName) setServiceName(sub.name);
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left cursor-pointer',
                    subcategorySlug === sub.slug
                      ? 'border-[#7655D9] bg-[#F5F0FF]'
                      : 'border-[#E9E5EF] bg-white hover:border-[#7655D9]/50'
                  )}
                >
                  <p className="text-sm font-semibold text-[#242331]">{sub.name}</p>
                  <p className="text-xs text-[#6B6879] mt-0.5">{sub.description}</p>
                </button>
              ))}
            </div>
            <Input
              label="Specific Service Name"
              placeholder="e.g., Soft glam bridal makeup with saree draping"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              3. Describe what you imagine
            </h2>
            <Input
              label="Request Title"
              placeholder="e.g., Morning South Indian Bridal Makeup & Hair in Jubilee Hills"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Detailed Requirements"
              rows={5}
              placeholder="Share skin/hair preferences, style notes, outfit colours, occasion lighting, or brand deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              hint="Minimum 20 characters. Clear briefs attract more accurate quotations."
              required
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              4. Upload reference or inspiration images
            </h2>
            <p className="text-sm text-[#6B6879]">
              Attach moodboard shots, dress photos, room angles, or henna inspiration (optional, up to 6 images).
            </p>
            {requestId && (
              <ImageUploader
                folder={{ type: 'request_image', requestId }}
                items={referenceImages}
                onChange={setReferenceImages}
                maxFiles={6}
                label="Inspiration & Reference Photos"
              />
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              5. Preferred date &amp; time window
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Desired Date"
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                required
              />
              <Select
                label="Time Preference"
                value={timePreference}
                onChange={(e) => setTimePreference(e.target.value as TimePreference)}
              >
                <option value="morning">Morning (6 AM – 12 PM)</option>
                <option value="afternoon">Afternoon (12 PM – 4 PM)</option>
                <option value="evening">Evening (4 PM – 9 PM)</option>
                <option value="full_day">Full Day</option>
                <option value="flexible">Flexible</option>
              </Select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[#242331] cursor-pointer">
              <input
                type="checkbox"
                checked={flexibleDate}
                onChange={(e) => setFlexibleDate(e.target.checked)}
                className="h-4 w-4 accent-[#7655D9]"
              />
              My dates are flexible within a few days
            </label>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              6. Location &amp; privacy-protected address
            </h2>
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#6B6879]">Quick-fill from saved addresses:</p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setCity(addr.city);
                        setLocality(addr.locality);
                        setPostalCode(addr.postalCode);
                        setExactAddressPrivate(addr.line1);
                      }}
                      className="rounded-xl border border-[#E9E5EF] bg-[#FFFCF8] px-3 py-1.5 text-xs font-medium hover:border-[#7655D9] cursor-pointer"
                    >
                      {addr.label}: {addr.locality}, {addr.city}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Input
                  label="City"
                  list="wizard-cities"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                <datalist id="wizard-cities">
                  {POPULAR_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <Input
                label="Locality / Area"
                placeholder="e.g., Indiranagar"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
              />
              <Input
                label="Postal Code (optional)"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <Textarea
              label="Private Venue / Street Address (Optional)"
              rows={2}
              placeholder="Never shown publicly or to browsing professionals—shared ONLY after you confirm a booking."
              value={exactAddressPrivate}
              onChange={(e) => setExactAddressPrivate(e.target.value)}
              hint="Stored separately in restricted privateDetails subcollection."
            />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              7. Choose preferred service mode
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['at_home', 'studio', 'remote'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setServiceMode(mode)}
                  className={cn(
                    'rounded-2xl border p-4 text-left cursor-pointer',
                    serviceMode === mode
                      ? 'border-[#7655D9] bg-[#F5F0FF]'
                      : 'border-[#E9E5EF] bg-white hover:border-[#7655D9]/50'
                  )}
                >
                  <p className="text-sm font-semibold text-[#242331]">
                    {SERVICE_MODE_LABELS[mode]}
                  </p>
                  <p className="text-xs text-[#6B6879] mt-1">
                    {mode === 'at_home'
                      ? 'Professional travels to your home or event venue.'
                      : mode === 'studio'
                        ? 'You visit the professional’s salon or studio.'
                        : 'Delivered remotely or online (ideal for design & consultations).'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              8. What is your indicative budget range?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Minimum Budget (INR)"
                type="number"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                required
              />
              <Input
                label="Maximum Budget (INR)"
                type="number"
                min={1}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                required
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[#242331] cursor-pointer">
              <input
                type="checkbox"
                checked={budgetFlexible}
                onChange={(e) => setBudgetFlexible(e.target.checked)}
                className="h-4 w-4 accent-[#7655D9]"
              />
              Open to proposals slightly above budget for exceptional scope
            </label>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              9. Additional context
            </h2>
            <Input
              label="Number of People / Units (where applicable)"
              type="number"
              min={1}
              max={100}
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
            />
            <Textarea
              label="Additional Requirements or Questions"
              placeholder="Trial session preferences, sensitivity/allergy notes, deliverables, language preference..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </div>
        )}

        {step === 10 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#242331]">
                10. Review &amp; Submit Requirement
              </h2>
              <Badge tone="lavender">Ready to publish</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-5 text-sm">
              <div>
                <p className="text-xs text-[#6B6879]">Category &amp; Specialty</p>
                <p className="font-semibold text-[#242331]">
                  {selectedCategory?.name} &rarr; {selectedSub?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B6879]">Title</p>
                <p className="font-semibold text-[#242331]">{title}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6879]">Schedule</p>
                <p className="font-medium text-[#242331]">
                  {desiredDate} ({timePreference}){flexibleDate ? ' • Flexible' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B6879]">Area &amp; Mode</p>
                <p className="font-medium text-[#242331]">
                  {locality}, {city} &middot; {SERVICE_MODE_LABELS[serviceMode]}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B6879]">Budget Range</p>
                <p className="font-semibold text-[#5B3EB5]">
                  {formatCurrency(Number(budgetMin) || 0)} – {formatCurrency(Number(budgetMax) || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B6879]">Reference Images</p>
                <p className="font-medium text-[#242331]">{referenceImages.length} attached</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[#6B6879]">Brief</p>
                <p className="text-[#242331] mt-0.5 whitespace-pre-wrap">{description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E9E5EF]">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button variant="soft" loading={savingDraft} onClick={handleSaveDraft}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>

          {step < 10 ? (
            <Button onClick={() => void handleGoNext()}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={submitting} onClick={handlePublishSubmit}>
              <Sparkles className="h-4 w-4" />
              Submit &amp; Match Professionals
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
