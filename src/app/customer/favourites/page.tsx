'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProfessionalCard } from '@/components/common/ProfessionalCard';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import {
  getFavouriteProfessionalIds,
  toggleFavouriteProfessional,
} from '@/services/customers.service';
import { getProfessionalProfile } from '@/services/professionals.service';
import type { ProfessionalProfile } from '@/types/domain';

export default function CustomerFavouritesPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();
  const [pros, setPros] = React.useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const ids = await getFavouriteProfessionalIds(firebaseUser.uid).catch(() => []);
      const profiles = await Promise.all(
        ids.map((id) => getProfessionalProfile(id).catch(() => null))
      );
      if (!active) return;
      setPros(profiles.filter((p): p is ProfessionalProfile => Boolean(p && !p.isSampleData)));
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  async function handleRemove(proId: string) {
    if (!firebaseUser) return;
    await toggleFavouriteProfessional(firebaseUser.uid, proId, true);
    setPros((prev) => prev.filter((p) => p.uid !== proId));
    notify({ tone: 'info', title: 'Removed from favourites' });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shortlist"
        title="Saved Professionals"
        description="Your bookmarked makeup artists, stylists, designers, and creative specialists."
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <LoadingSkeleton className="h-72" />
          <LoadingSkeleton className="h-72" />
        </div>
      ) : pros.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="No favourite professionals saved yet"
          description="Tap the heart icon on any professional profile or listing to shortlist them here."
          action={
            <Link href="/explore">
              <Button size="sm">Explore Professionals</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((pro) => (
            <ProfessionalCard
              key={pro.uid}
              professional={pro}
              isFavourited
              onToggleFavourite={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
