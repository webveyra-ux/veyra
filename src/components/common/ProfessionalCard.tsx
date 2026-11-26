'use client';

import Link from 'next/link';
import { BadgeCheck, Heart, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/ui/RatingStars';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { cn, formatPriceRange } from '@/lib/utils';
import type { ProfessionalProfile } from '@/types/domain';

export function ProfessionalCard({
  professional,
  isFavourited = false,
  onToggleFavourite,
}: {
  professional: ProfessionalProfile;
  isFavourited?: boolean;
  onToggleFavourite?: (professionalId: string) => void;
}) {
  const coverPreview =
    professional.portfolio.find((p) => p.isCover)?.url ||
    professional.portfolio[0]?.url ||
    professional.coverImageUrl ||
    professional.profilePhotoUrl ||
    '/images/hero/hero-editorial.jpg';

  return (
    <Card className="group overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7655D9]/40">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5F0FF]">
        <Link href={`/professionals/${professional.slug || professional.uid}`} className="block h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverPreview}
            alt={professional.businessName || professional.displayName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {professional.isSampleData && (
            <Badge tone="amber">Sample Preview</Badge>
          )}
          {professional.isVerified && !professional.isSampleData && (
            <Badge tone="lavender">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </Badge>
          )}
        </div>

        {onToggleFavourite && !professional.isSampleData && (
          <button
            type="button"
            onClick={() => onToggleFavourite(professional.uid)}
            aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
            className={cn(
              'absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-xs transition-colors cursor-pointer',
              isFavourited
                ? 'border-rose-200 text-rose-600'
                : 'border-[#E9E5EF] text-[#6B6879] hover:text-rose-600'
            )}
          >
            <Heart className={cn('h-4 w-4', isFavourited && 'fill-current')} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/professionals/${professional.slug || professional.uid}`}
              className="block truncate text-base font-semibold text-[#242331] hover:text-[#7655D9]"
            >
              {professional.businessName || professional.displayName}
            </Link>
            <p className="truncate text-xs text-[#6B6879]">{professional.headline || professional.displayName}</p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
          <RatingDisplay
            rating={professional.ratingAverage}
            reviewCount={professional.reviewCount}
            compact
          />
          <span className="inline-flex items-center gap-1 text-[#6B6879] truncate">
            <MapPin className="h-3.5 w-3.5 text-[#7655D9] shrink-0" />
            {professional.location.city}
          </span>
        </div>

        {professional.services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {professional.services.slice(0, 2).map((srv) => (
              <span
                key={srv.id}
                className="rounded-lg bg-[#FFFCF8] border border-[#E9E5EF] px-2 py-0.5 text-[11px] text-[#504D61] truncate max-w-[160px]"
              >
                {srv.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#E9E5EF]/70 mt-4">
          <div>
            <p className="text-[11px] text-[#6B6879]">
              {professional.serviceModes.map((m) => SERVICE_MODE_LABELS[m].split(' ')[0]).join(' • ')}
            </p>
            <p className="text-sm font-semibold text-[#242331]">
              {formatPriceRange(
                professional.priceRange.min,
                professional.priceRange.max,
                professional.priceRange.currency
              )}
            </p>
          </div>

          <Link
            href={`/professionals/${professional.slug || professional.uid}`}
            className="inline-flex items-center gap-1 rounded-xl bg-[#F5F0FF] px-3 py-2 text-xs font-semibold text-[#5B3EB5] hover:bg-[#EDE5FF]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            View profile
          </Link>
        </div>
      </div>
    </Card>
  );
}
