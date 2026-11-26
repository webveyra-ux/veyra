'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  Flag,
  Globe,
  Heart,
  MapPin,
  MessageSquare,
  Share2,
  Sparkles,
} from 'lucide-react';
import { ReportModal } from '@/components/common/ReportModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/ui/RatingStars';
import { EmptyState, LoadingSkeleton } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { cn, formatDate, formatPriceRange } from '@/lib/utils';
import { getOrCreateConversation } from '@/services/conversations.service';
import {
  getFavouriteProfessionalIds,
  toggleFavouriteProfessional,
} from '@/services/customers.service';
import {
  DEFAULT_AVAILABILITY_SCHEDULE,
  getProfessionalAvailability,
  getProfessionalProfile,
} from '@/services/professionals.service';
import { listProfessionalReviews } from '@/services/reviews.service';
import type { AvailabilitySchedule, ProfessionalProfile, Review } from '@/types/domain';

function ProfessionalPublicProfileInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();

  const [pro, setPro] = React.useState<ProfessionalProfile | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilitySchedule | null>(null);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFav, setIsFav] = React.useState(false);
  const [portfolioFilter, setPortfolioFilter] = React.useState<string>('all');
  const [reportOpen, setReportOpen] = React.useState(false);
  const [startingChat, setStartingChat] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const profile = await getProfessionalProfile(params.id);
      if (!active) return;
      setPro(profile);
      if (profile && !profile.isSampleData) {
        const [avail, revList] = await Promise.all([
          getProfessionalAvailability(profile.uid).catch(() =>
            DEFAULT_AVAILABILITY_SCHEDULE(profile.uid)
          ),
          listProfessionalReviews(profile.uid).catch(() => []),
        ]);
        if (!active) return;
        setAvailability(avail);
        setReviews(revList);
      } else if (profile) {
        setAvailability(DEFAULT_AVAILABILITY_SCHEDULE(profile.uid));
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  React.useEffect(() => {
    if (!firebaseUser || !pro || pro.isSampleData) return;
    void getFavouriteProfessionalIds(firebaseUser.uid).then((ids) => {
      setIsFav(ids.includes(pro.uid));
    });
  }, [firebaseUser, pro]);

  async function handleShare() {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator
        .share({
          title: pro?.businessName || pro?.displayName || 'VEYRA Professional',
          url: shareUrl,
        })
        .catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(shareUrl);
    notify({ tone: 'success', title: 'Profile link copied to clipboard' });
  }

  async function handleToggleFav() {
    if (!pro || pro.isSampleData) return;
    if (!firebaseUser) {
      router.push(`/auth/login?next=/professionals/${params.id}`);
      return;
    }
    const next = await toggleFavouriteProfessional(firebaseUser.uid, pro.uid, isFav);
    setIsFav(next);
    notify({
      tone: 'success',
      title: next ? 'Saved to favourites' : 'Removed from favourites',
    });
  }

  async function handleContact() {
    if (!pro || pro.isSampleData) return;
    if (!firebaseUser || !userRecord) {
      router.push(`/auth/login?next=/professionals/${params.id}`);
      return;
    }
    if (firebaseUser.uid === pro.uid) {
      notify({ tone: 'info', title: 'This is your own public profile.' });
      return;
    }
    setStartingChat(true);
    try {
      const conv = await getOrCreateConversation({
        customerId: firebaseUser.uid,
        professionalId: pro.uid,
        customerMeta: {
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          role: userRecord.role,
        },
        professionalMeta: {
          displayName: pro.businessName || pro.displayName,
          photoURL: pro.profilePhotoUrl,
          role: 'professional',
        },
        type: 'direct',
        subjectTitle: `Inquiry for ${pro.businessName || pro.displayName}`,
      });
      const base =
        userRecord.role === 'professional' ? '/professional/messages' : '/customer/messages';
      router.push(`${base}?conversationId=${conv.id}`);
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not start conversation',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setStartingChat(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <LoadingSkeleton className="h-56 w-full" />
        <LoadingSkeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14">
        <EmptyState
          title="Professional profile not found"
          description="This listing may be private, paused, or removed."
          action={
            <Link href="/explore">
              <Button>Back to Explore</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const portfolioCategories = Array.from(new Set(pro.portfolio.map((p) => p.categorySlug)));
  const visiblePortfolio =
    portfolioFilter === 'all'
      ? pro.portfolio
      : pro.portfolio.filter((p) => p.categorySlug === portfolioFilter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {pro.isSampleData && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Sample Preview Profile:</strong> This is an illustrative sample profile showing how VEYRA displays portfolios, services, and availability. Messaging and bookings are enabled for real registered professionals.
        </div>
      )}

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="h-44 sm:h-60 w-full bg-[#EDE5FF] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pro.coverImageUrl || pro.profilePhotoUrl || '/images/hero/hero-editorial.jpg'}
            alt={pro.businessName || pro.displayName}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between -mt-14 sm:-mt-16 mb-5">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border-4 border-white bg-[#F5F0FF] shadow-md shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pro.profilePhotoUrl || '/images/categories/makeup.jpg'}
                  alt={pro.displayName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#242331]">
                    {pro.businessName || pro.displayName}
                  </h1>
                  {pro.isVerified && !pro.isSampleData && (
                    <Badge tone="lavender">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified Professional
                    </Badge>
                  )}
                  {pro.isSampleData && <Badge tone="amber">Sample Preview</Badge>}
                </div>
                <p className="text-sm text-[#6B6879] mt-0.5">
                  {pro.headline} &middot; {pro.displayName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!pro.isSampleData && (
                <>
                  <Button variant="outline" size="sm" onClick={handleToggleFav}>
                    <Heart
                      className={cn('h-4 w-4', isFav && 'fill-rose-500 text-rose-500')}
                    />
                    {isFav ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    loading={startingChat}
                    onClick={handleContact}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message on VEYRA
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              {!pro.isSampleData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportOpen(true)}
                  aria-label="Report profile"
                >
                  <Flag className="h-4 w-4 text-[#6B6879]" />
                </Button>
              )}
              <Link href={`/customer/requests/new?category=${pro.categories[0] || ''}`}>
                <Button size="sm">
                  <Sparkles className="h-4 w-4" />
                  Create Request
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 pt-4 border-t border-[#E9E5EF]">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B6879]">
                <RatingDisplay rating={pro.ratingAverage} reviewCount={pro.reviewCount} />
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#7655D9]" />
                  {pro.location.locality}, {pro.location.city}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-[#7655D9]" />
                  {pro.experienceYears} yr{pro.experienceYears === 1 ? '' : 's'} experience
                </span>
                {typeof pro.responseRate === 'number' && (
                  <span>{pro.responseRate}% response rate</span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-[#242331]">{pro.bio}</p>

              {(pro.productsUsed?.length || pro.productsSummary) && (
                <div className="rounded-xl border border-[#E9E5EF] bg-[#F5F0FF]/55 p-3.5 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5B3EB5]">
                    Products &amp; Brands Used
                  </p>
                  {pro.productsUsed && pro.productsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pro.productsUsed.map((item) => (
                        <Badge key={item} tone="neutral">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {pro.productsSummary && (
                    <p className="text-xs text-[#6B6879]">{pro.productsSummary}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {pro.categories.map((cat) => (
                  <Link key={cat} href={`/categories/${cat}`}>
                    <Badge tone="lavender" className="capitalize">
                      {cat.replace('-', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E9E5EF] bg-[#FFFCF8] p-4 space-y-3 text-xs">
              <div>
                <p className="font-semibold text-[#242331]">Service Modes</p>
                <p className="text-[#6B6879] mt-0.5">
                  {pro.serviceModes.map((m) => SERVICE_MODE_LABELS[m]).join(' • ')}
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#242331]">Service Areas</p>
                <p className="text-[#6B6879] mt-0.5">
                  {pro.serviceAreas.join(', ')} ({pro.serviceRadiusKm} km radius)
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#242331] inline-flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-[#7655D9]" />
                  Languages
                </p>
                <p className="text-[#6B6879] mt-0.5">{pro.languages.join(', ')}</p>
              </div>
              <div>
                <p className="font-semibold text-[#242331] inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#7655D9]" />
                  Availability
                </p>
                <p className="text-[#6B6879] mt-0.5">
                  {availability?.temporaryUnavailable
                    ? 'Temporarily unavailable'
                    : availability?.flexibleScheduling
                      ? 'Accepts flexible request scheduling'
                      : 'Scheduled weekly hours'}
                </p>
              </div>
              <p className="pt-2 border-t border-[#E9E5EF] text-[11px] text-[#6B6879]">
                Personal phone and street details stay protected inside VEYRA until booking confirmation.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Services & Pricing */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#242331]">
          Services &amp; Indicative Pricing
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pro.services.map((srv) => (
            <Card key={srv.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#242331]">{srv.name}</h3>
                  <span className="text-sm font-semibold text-[#5B3EB5] shrink-0">
                    {formatPriceRange(srv.priceMin, srv.priceMax, srv.currency)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[#6B6879]">{srv.description}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-[#E9E5EF]/70 flex items-center justify-between text-xs text-[#6B6879]">
                <span>Approx. {srv.durationMinutes} mins</span>
                <span>{srv.serviceModes.map((m) => SERVICE_MODE_LABELS[m].split(' ')[0]).join(' / ')}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#242331]">Portfolio</h2>
          {portfolioCategories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPortfolioFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium border cursor-pointer ${
                  portfolioFilter === 'all'
                    ? 'bg-[#7655D9] text-white border-[#7655D9]'
                    : 'bg-white text-[#242331] border-[#E9E5EF]'
                }`}
              >
                All
              </button>
              {portfolioCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPortfolioFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border capitalize cursor-pointer ${
                    portfolioFilter === cat
                      ? 'bg-[#7655D9] text-white border-[#7655D9]'
                      : 'bg-white text-[#242331] border-[#E9E5EF]'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {visiblePortfolio.length === 0 ? (
          <EmptyState
            title="No portfolio items added yet"
            description="Portfolio photographs or videos will appear here once uploaded."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePortfolio.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-[4/3] bg-[#F5F0FF]">
                  {item.mediaType === 'video' ? (
                    <video src={item.url} controls className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold text-[#242331]">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-[#6B6879] mt-0.5">{item.description}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Customer Reviews */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#242331]">
          Verified Booking Reviews
        </h2>
        {reviews.length === 0 ? (
          <Card className="p-6 text-sm text-[#6B6879]">
            No published reviews yet. Reviews appear here after customers complete a booking on VEYRA.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reviews.map((rev) => (
              <Card key={rev.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#242331]">{rev.customerName}</p>
                    <p className="text-xs text-[#6B6879]">{formatDate(rev.createdAt)}</p>
                  </div>
                  <Badge tone="lavender">{rev.overallRating.toFixed(1)} / 5</Badge>
                </div>
                <p className="text-sm text-[#242331]">{rev.comment}</p>
                {rev.professionalResponse && (
                  <div className="rounded-xl bg-[#F5F0FF] p-3 text-xs">
                    <p className="font-semibold text-[#5B3EB5]">Response from professional:</p>
                    <p className="mt-1 text-[#242331]">{rev.professionalResponse.text}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="profile"
        targetId={pro.uid}
        targetLabel={pro.businessName || pro.displayName}
      />
    </div>
  );
}

export default function ProfessionalPublicProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10">
          <LoadingSkeleton className="h-96" />
        </div>
      }
    >
      <ProfessionalPublicProfileInner />
    </React.Suspense>
  );
}
