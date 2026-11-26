'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { listProfessionalProposals, withdrawProposal } from '@/services/proposals.service';
import type { Proposal } from '@/types/domain';

export default function ProfessionalProposalsPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string>('all');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void listProfessionalProposals(firebaseUser.uid)
      .then((items) => {
        if (active) setProposals(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const visible =
    filter === 'all' ? proposals : proposals.filter((p) => p.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Proposals"
        title="My Sent Proposals"
        description="Track submitted quotes, shortlisted proposals, accepted bookings, and withdrawn bids."
      />

      <div className="flex flex-wrap gap-2">
        {['all', 'submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={filter === st ? 'primary' : 'outline'}
            onClick={() => setFilter(st)}
            className="capitalize"
          >
            {st}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-6 w-6" />}
          title="No proposals found"
          description="Browse matched requests in your Request Feed to submit tailored proposals."
          action={
            <Link href="/professional/requests">
              <Button size="sm">Go to Request Feed</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((prop) => (
            <Card
              key={prop.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      prop.status === 'accepted'
                        ? 'mint'
                        : prop.status === 'shortlisted'
                          ? 'lavender'
                          : prop.status === 'rejected'
                            ? 'danger'
                            : 'neutral'
                    }
                    className="capitalize"
                  >
                    {prop.status}
                  </Badge>
                  <span className="text-sm font-semibold text-[#5B3EB5]">
                    {formatCurrency(prop.price, prop.currency)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#242331] line-clamp-1">
                  {prop.serviceDescription}
                </p>
                <p className="text-xs text-[#6B6879]">
                  Proposed date: {formatDate(prop.proposedDate)} ({prop.proposedTimeWindow}) &middot; Expires{' '}
                  {formatDate(prop.expiresAt)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/professional/requests/${prop.requestId}`}>
                  <Button size="sm" variant="soft">
                    View Brief
                  </Button>
                </Link>
                {['submitted', 'shortlisted'].includes(prop.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await withdrawProposal(prop.id);
                      setProposals((prev) =>
                        prev.map((x) => (x.id === prop.id ? { ...x, status: 'withdrawn' } : x))
                      );
                      notify({ tone: 'info', title: 'Proposal withdrawn' });
                    }}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
