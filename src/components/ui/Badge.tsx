import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'lavender'
  | 'blush'
  | 'peach'
  | 'mint'
  | 'neutral'
  | 'danger'
  | 'amber';

const TONE_CLASSES: Record<BadgeTone, string> = {
  lavender: 'bg-[#EDE5FF] text-[#5B3EB5] border-[#7655D9]/20',
  blush: 'bg-[#FFF0F3] text-[#9D2E4D] border-[#F7C7D3]',
  peach: 'bg-[#FFF1E7] text-[#9C4A1A] border-[#F8D5BD]',
  mint: 'bg-[#E8F7F0] text-[#176846] border-[#BEEAD6]',
  neutral: 'bg-[#F6F4FA] text-[#504D61] border-[#E9E5EF]',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = 'lavender', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
