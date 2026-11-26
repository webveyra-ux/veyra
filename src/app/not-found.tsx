import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">404</p>
      <h1 className="font-display text-3xl font-semibold text-[#242331]">Page not found</h1>
      <p className="text-sm text-[#6B6879]">
        The page or listing you requested could not be found on VEYRA.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
        <Link href="/explore">
          <Button variant="outline">Explore Professionals</Button>
        </Link>
      </div>
    </div>
  );
}
