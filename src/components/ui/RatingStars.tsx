'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RatingDisplay({
  rating,
  reviewCount,
  compact = false,
}: {
  rating: number;
  reviewCount: number;
  compact?: boolean;
}) {
  if (!reviewCount || reviewCount <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#6B6879]">
        <Star className="h-3.5 w-3.5 text-[#E9E5EF]" />
        New on VEYRA
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#242331]">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span>{rating.toFixed(1)}</span>
      <span className="text-[#6B6879]">
        ({reviewCount}
        {compact ? '' : ` review${reviewCount === 1 ? '' : 's'}`})
      </span>
    </span>
  );
}

export function StarRatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-sm font-medium text-[#242331]">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${label}: ${star} star${star === 1 ? '' : 's'}`}
            className="p-1 rounded-lg hover:bg-[#F5F0FF] cursor-pointer"
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-[#E9E5EF] hover:text-amber-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
