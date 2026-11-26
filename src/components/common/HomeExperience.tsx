'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  FileText,
  Lock,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ProfessionalCard } from '@/components/common/ProfessionalCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/ToastProvider';
import { POPULAR_CITIES, SITE_CONFIG } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { cn } from '@/lib/utils';
import { fetchActiveCategoriesAndSubcategories } from '@/services/categories.service';
import { DEFAULT_PLATFORM_SETTINGS, fetchPublicContent } from '@/services/content.service';
import {
  getFavouriteProfessionalIds,
  toggleFavouriteProfessional,
} from '@/services/customers.service';
import { fetchFeaturedProfessionals } from '@/services/professionals.service';
import type {
  CategoryRecord,
  PlatformSettings,
  ProfessionalProfile,
  PromotionBanner,
  SubcategoryRecord,
} from '@/types/domain';

const POPULAR_SERVICE_CHIPS = [
  { label: 'Bridal makeup', category: 'makeup', sub: 'bridal-makeup' },
  { label: 'Hair styling', category: 'hair', sub: 'hair-styling' },
  { label: 'Bridal mehendi', category: 'mehendi', sub: 'bridal-mehendi' },
  { label: 'Nail art', category: 'nails', sub: 'nail-art' },
  { label: 'Personal styling', category: 'styling', sub: 'personal-styling' },
  { label: 'Room design', category: 'interior-design', sub: 'room-design' },
  { label: 'Logo & branding', category: 'graphic-design', sub: 'branding' },
  { label: 'Portrait photography', category: 'photography', sub: 'portraits' },
];

export function HomeExperience() {
  const router = useRouter();
  const { firebaseUser, selectedCity, setSelectedCity } = useAuth();
  const { notify } = useToast();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [cityOverride, setCityOverride] = React.useState<string | null>(null);
  const cityInput = cityOverride ?? selectedCity;
  const setCityInput = (val: string) => setCityOverride(val);
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = React.useState<SubcategoryRecord[]>([]);
  const [professionals, setProfessionals] = React.useState<ProfessionalProfile[]>([]);
  const [usingSampleFallback, setUsingSampleFallback] = React.useState(false);
  const [settings, setSettings] = React.useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [promotions, setPromotions] = React.useState<PromotionBanner[]>([]);
  const [favourites, setFavourites] = React.useState<Set<string>>(new Set());
  const [openFaqId, setOpenFaqId] = React.useState<string>('faq-1');

  React.useEffect(() => {
    let active = true;
    async function loadHome() {
      const [catRes, proRes, contentRes] = await Promise.all([
        fetchActiveCategoriesAndSubcategories(),
        fetchFeaturedProfessionals(6),
        fetchPublicContent(),
      ]);
      if (!active) return;
      setCategories(catRes.categories);
      setSubcategories(catRes.subcategories);
      setProfessionals(proRes.items);
      setUsingSampleFallback(proRes.usingSampleFallback);
      setSettings(contentRes.settings);
      setPromotions(contentRes.promotions);
    }
    void loadHome();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!firebaseUser) return;
    void getFavouriteProfessionalIds(firebaseUser.uid).then((ids) => setFavourites(new Set(ids)));
  }, [firebaseUser]);

  const activeFavourites = firebaseUser ? favourites : new Set<string>();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (cityInput.trim()) {
      params.set('city', cityInput.trim());
      setSelectedCity(cityInput.trim());
    }
    router.push(`/explore?${params.toString()}`);
  }

  async function handleToggleFavourite(proId: string) {
    if (!firebaseUser) {
      router.push('/auth/login?next=/');
      return;
    }
    const currentlySaved = favourites.has(proId);
    try {
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
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Unable to update favourites',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    }
  }

  return (
    <div className="bg-[#FFFCF8]">
      {/* Announcement Strip */}
      {settings.announcementActive && settings.announcementText && (
        <div className="border-b border-[#EDE5FF] bg-[#F5F0FF] px-4 py-2 text-center text-xs font-medium text-[#5B3EB5]">
          {settings.announcementText}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#E9E5EF]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#EDE5FF] bg-[#F5F0FF] px-3.5 py-1.5 text-xs font-semibold text-[#5B3EB5]">
                <Sparkles className="h-3.5 w-3.5" />
                {SITE_CONFIG.headlineProposition}
              </div>

              <h1 className="font-display text-4xl font-semibold tracking-tight text-[#242331] sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                {settings.heroTitle}
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-[#6B6879] sm:text-lg">
                {settings.heroSubtitle}
              </p>

              {/* Search & Location Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="rounded-2xl border border-[#E9E5EF] bg-white p-2 shadow-[0_8px_30px_rgba(36,35,49,0.05)]"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <div className="relative sm:col-span-6 flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-[#6B6879]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Makeup, bridal mehendi, hair, interior design..."
                      aria-label="Search beauty and creative services"
                      className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-[#242331] placeholder:text-[#6B6879]/80 focus:outline-none"
                    />
                  </div>
                  <div className="relative sm:col-span-4 flex items-center border-t sm:border-t-0 sm:border-l border-[#E9E5EF]">
                    <MapPin className="absolute left-3.5 h-4 w-4 text-[#7655D9]" />
                    <input
                      type="text"
                      list="veyra-city-list"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="City or locality"
                      aria-label="City or locality"
                      className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-[#242331] placeholder:text-[#6B6879]/80 focus:outline-none"
                    />
                    <datalist id="veyra-city-list">
                      {POPULAR_CITIES.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full h-12 rounded-xl">
                      Search
                    </Button>
                  </div>
                </div>
              </form>

              {/* Popular Service Quick Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#6B6879] mr-1">Popular:</span>
                {POPULAR_SERVICE_CHIPS.map((chip) => (
                  <Link
                    key={chip.sub}
                    href={`/explore?category=${chip.category}&subcategory=${chip.sub}`}
                    className="rounded-full border border-[#E9E5EF] bg-white px-3 py-1 text-xs font-medium text-[#242331] hover:border-[#7655D9]/50 hover:bg-[#F5F0FF]"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>

              {/* Dual Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/customer/requests/new">
                  <Button size="lg">
                    Post a Requirement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth/register?role=professional">
                  <Button variant="outline" size="lg">
                    Become a Professional
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Editorial Visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="overflow-hidden rounded-3xl border border-[#E9E5EF] bg-white p-2.5 shadow-[0_18px_50px_rgba(91,62,181,0.09)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/hero/hero-editorial.jpg"
                    alt="Curated beauty, styling, and design toolkit on warm ivory stone"
                    className="aspect-[4/4] w-full rounded-2xl object-cover"
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-[#E9E5EF] bg-[#FFF0F3] p-3 text-center">
                    <p className="text-xs font-semibold text-[#242331]">10 Categories</p>
                    <p className="text-[11px] text-[#6B6879]">Beauty &amp; Creative</p>
                  </div>
                  <div className="rounded-2xl border border-[#E9E5EF] bg-[#F5F0FF] p-3 text-center">
                    <p className="text-xs font-semibold text-[#242331]">Compare Quotes</p>
                    <p className="text-[11px] text-[#6B6879]">Side-by-side proposals</p>
                  </div>
                  <div className="rounded-2xl border border-[#E9E5EF] bg-[#FFF1E7] p-3 text-center">
                    <p className="text-xs font-semibold text-[#242331]">Privacy First</p>
                    <p className="text-[11px] text-[#6B6879]">Protected address</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Admin Promotions */}
      {promotions.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E9E5EF] p-5',
                  promo.accentTone === 'blush'
                    ? 'bg-[#FFF0F3]'
                    : promo.accentTone === 'peach'
                      ? 'bg-[#FFF1E7]'
                      : promo.accentTone === 'mint'
                        ? 'bg-[#E8F7F0]'
                        : 'bg-[#F5F0FF]'
                )}
              >
                <div>
                  <h3 className="text-base font-semibold text-[#242331]">{promo.title}</h3>
                  <p className="mt-1 text-sm text-[#6B6879]">{promo.subtitle}</p>
                </div>
                <Link href={promo.ctaUrl || '/explore'}>
                  <Button size="sm" variant="secondary">
                    {promo.ctaLabel || 'Explore'}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">
              Service Directory
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#242331] mt-1">
              Explore by craft &amp; category
            </h2>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B3EB5] hover:underline"
          >
            View all {categories.length} categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => {
            const subCount = subcategories.filter((s) => s.categorySlug === cat.slug).length;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group overflow-hidden rounded-2xl border border-[#E9E5EF] bg-white transition-all hover:-translate-y-0.5 hover:border-[#7655D9]/50 shadow-xs"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#F5F0FF]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.coverImageUrl}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="text-sm font-semibold text-[#242331] group-hover:text-[#7655D9]">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#6B6879]">
                    {subCount} specialties
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured & Discover Professionals */}
      <section className="border-y border-[#E9E5EF] bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">
                Discover Talent
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#242331] mt-1">
                Featured professionals
              </h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B3EB5] hover:underline"
            >
              Browse full directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {usingSampleFallback && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              <strong>Sample Layout Preview:</strong> No published professionals exist in Firestore yet, so clearly labelled sample showcase cards are shown below without fabricated ratings or verified badges. Real practitioners appear here automatically as soon as they publish profiles.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {professionals.map((pro) => (
              <ProfessionalCard
                key={pro.uid}
                professional={pro}
                isFavourited={activeFavourites.has(pro.uid)}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How VEYRA Works */}
      <section id="how-veyra-works" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">
            How VEYRA Works
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#242331] mt-1">
            From inspiration to confirmed booking in four structured steps
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              tone: 'bg-[#F5F0FF]',
              icon: FileText,
              title: 'Post your requirement',
              body: 'Choose a category, upload inspiration photos, and specify your date, area, service mode, and budget range.',
            },
            {
              step: '02',
              tone: 'bg-[#FFF0F3]',
              icon: Sparkles,
              title: 'Matched pros respond',
              body: 'VEYRA’s rule-based matching alerts suitable professionals who send tailored quotes with clear inclusions.',
            },
            {
              step: '03',
              tone: 'bg-[#FFF1E7]',
              icon: MessageSquare,
              title: 'Compare & message',
              body: 'Review portfolios, compare pricing side by side, shortlist favourites, and chat directly inside VEYRA.',
            },
            {
              step: '04',
              tone: 'bg-[#E8F7F0]',
              icon: CalendarCheck,
              title: 'Book & review',
              body: 'Accept your chosen proposal to confirm a booking, track completion, and submit a verified booking review.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', item.tone)}>
                    <Icon className="h-5 w-5 text-[#5B3EB5]" />
                  </div>
                  <span className="font-display text-xl font-semibold text-[#6B6879]/60">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#242331]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6879]">{item.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Trust Commitments (Honest platform architecture without fake reviews) */}
      <section className="border-y border-[#E9E5EF] bg-[#F5F0FF]/55 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6">
              <BadgeCheck className="h-6 w-6 text-[#7655D9] mb-3" />
              <h3 className="text-base font-semibold text-[#242331]">
                Admin-Reviewed Verification
              </h3>
              <p className="mt-2 text-sm text-[#6B6879]">
                Verified badges are granted only after an administrator reviews submitted identification and practice records stored in private Storage paths.
              </p>
            </Card>
            <Card className="p-6">
              <Lock className="h-6 w-6 text-[#7655D9] mb-3" />
              <h3 className="text-base font-semibold text-[#242331]">
                Address &amp; Contact Privacy
              </h3>
              <p className="mt-2 text-sm text-[#6B6879]">
                Open requests show only your city and locality. Exact venue addresses are protected and released strictly upon confirmed booking.
              </p>
            </Card>
            <Card className="p-6">
              <ShieldCheck className="h-6 w-6 text-[#7655D9] mb-3" />
              <h3 className="text-base font-semibold text-[#242331]">
                Booking-Verified Reviews
              </h3>
              <p className="mt-2 text-sm text-[#6B6879]">
                Ratings are calculated exclusively from reviews submitted on eligible completed bookings—never fabricated or inflated.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Dual CTA Banner */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-[#EDE5FF] bg-[#F5F0FF] p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <Badge tone="lavender">For Customers</Badge>
              <h3 className="font-display text-2xl font-semibold text-[#242331] mt-3">
                Have an event, shoot, or makeover coming up?
              </h3>
              <p className="mt-2 text-sm text-[#6B6879]">
                Share your requirements once instead of chasing dozens of DMs. Receive structured quotes tailored to your date and budget.
              </p>
            </div>
            <div className="mt-6">
              <Link href="/customer/requests/new">
                <Button>
                  Post a Requirement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[#F7C7D3]/60 bg-[#FFF0F3] p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <Badge tone="blush">For Independent Professionals</Badge>
              <h3 className="font-display text-2xl font-semibold text-[#242331] mt-3">
                Grow your beauty, styling, or creative studio
              </h3>
              <p className="mt-2 text-sm text-[#6B6879]">
                Create your portfolio, define service areas and modes, receive matched customer briefs, and manage bookings in one workspace.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth/register?role=professional">
                <Button variant="secondary">
                  Join as a Professional
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/legal/professional-terms">
                <Button variant="outline">Review Terms</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="border-t border-[#E9E5EF] bg-white py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">
              Answers
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#242331] mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {settings.faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-sm text-[#242331] cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-[#7655D9] shrink-0 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#E9E5EF] bg-white px-5 py-4 text-sm leading-relaxed text-[#6B6879]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#6B6879]">
            <CheckCircle2 className="h-4 w-4 text-[#7655D9]" />
            <span>
              {SITE_CONFIG.attributionLine} &middot; Built for web and mobile browsers.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
