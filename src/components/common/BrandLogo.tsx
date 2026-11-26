import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandLogo({
  href = '/',
  className,
  showTagline = false,
}: {
  href?: string;
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 group', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/veyra-mark.svg"
        alt="VEYRA"
        className="h-9 w-9 rounded-xl shadow-xs transition-transform group-hover:scale-[1.03]"
      />
      <div className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-tight text-[#242331]">
          VEYRA
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wider uppercase text-[#7655D9]">
            Discover. Connect. Create.
          </span>
        )}
      </div>
    </Link>
  );
}
