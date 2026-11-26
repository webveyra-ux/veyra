'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, EyeOff, Inbox, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getProfessionalProfile } from '@/services/professionals.service';
import {
  listOpenRequestsByCategories,
  listProfessionalMatchedRequests,
  updateMatchStatus,
} from '@/services/requests.service';
import type { RequestMatch, ServiceRequest } from '@/types/domain';

export default function ProfessionalRequestFeedPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();

  const [matches, setMatches] = React.useState<RequestMatch[]>([]);
  const [requestsById, setRequestsById] = React.useState<Record<string, ServiceRequest>>({});
  const [categoryOpenReqs, setCategoryOpenReqs] = React.useState<ServiceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'matched' | 'saved' | 'category'>('matched');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [pro, matchRes] = await Promise.all([
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
        listProfessionalMatchedRequests(firebaseUser.uid).catch(() => ({
          matches: [],
          requestsById: {},
        })),
      ]);
      const openReqs =
        pro && pro.categories.length > 0
          ? await listOpenRequestsByCategories(pro.categories).catch(() => [])
          : [];
      if (!active) return;
      setMatches(matchRes.matches);
      setRequestsById(matchRes.requestsById);
      setCategoryOpenReqs(openReqs.filter((r) => r.customerId !== firebaseUser.uid));
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  async function handleMatchAction(matchId: string, nextStatus: 'saved' | 'ignored') {
    await updateMatchStatus(matchId, nextStatus);
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, matchStatus: nextStatus } : m))
    );
    notify({
      tone: 'info',
      title: nextStatus === 'saved' ? 'Request saved' : 'Request hidden from feed',
    });
  }

  const visibleMatches = matches.filter((m) =>
    tab === 'saved' ? m.matchStatus === 'saved' : m.matchStatus !== 'ignored'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Request Feed"
        title="Customer Requirements & Matches"
        description="Review customer briefs matching your craft and area. Customer phone numbers and street addresses remain private until confirmed booking."
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === 'matched' ? 'primary' : 'outline'}
          onClick={() => setTab('matched')}
        >
          Matched For You ({matches.filter((m) => m.matchStatus !== 'ignored').length})
        </Button>
        <Button
          size="sm"
          variant={tab === 'saved' ? 'primary' : 'outline'}
          onClick={() => setTab('saved')}
        >
          Saved ({matches.filter((m) => m.matchStatus === 'saved').length})
        </Button>
        <Button
          size="sm"
          variant={tab === 'category' ? 'primary' : 'outline'}
          onClick={() => setTab('category')}
        >
          Open in Your Categories ({categoryOpenReqs.length})
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
      ) : tab === 'category' ? (
        categoryOpenReqs.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="No open requests in your categories right now"
            description="Check your profile categories and service areas to make sure they are active."
          />
        ) : (
          <div className="space-y-3">
            {categoryOpenReqs.map((req) => (
              <Card key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="lavender">{req.categoryName}</Badge>
                    <span className="text-xs text-[#6B6879]">
                      {SERVICE_MODE_LABELS[req.serviceMode]}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#242331]">{req.title}</h3>
                  <p className="text-xs text-[#6B6879]">
                    {req.location.locality}, {req.location.city} &middot; {formatDate(req.desiredDate)} &middot;{' '}
                    {formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)}
                  </p>
                </div>
                <Link href={`/professional/requests/${req.id}`}>
                  <Button size="sm">View &amp; Submit Proposal</Button>
                </Link>
              </Card>
            ))}
          </div>
        )
      ) : visibleMatches.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No matched requests in this tab"
          description="Keep your profile active and check Open in Your Categories to discover new briefs."
        />
      ) : (
        <div className="space-y-3">
          {visibleMatches.map((m) => {
            const req = requestsById[m.requestId];
            if (!req) return null;
            return (
              <Card key={m.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="lavender">{m.matchScore}% rule match</Badge>
                      <Badge tone="neutral">{req.categoryName}</Badge>
                      <span className="text-xs text-[#6B6879] capitalize">
                        {m.matchStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#242331]">{req.title}</h3>
                    <p className="text-xs text-[#6B6879]">
                      {req.location.locality}, {req.location.city} &middot;{' '}
                      {formatDate(req.desiredDate)} &middot; {formatCurrency(req.budgetMin)} –{' '}
                      {formatCurrency(req.budgetMax)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleMatchAction(m.id, 'saved')}
                    >
                      <Bookmark className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleMatchAction(m.id, 'ignored')}
                    >
                      <EyeOff className="h-4 w-4" />
                      Ignore
                    </Button>
                    <Link href={`/professional/requests/${req.id}`}>
                      <Button size="sm">Submit Proposal</Button>
                    </Link>
                  </div>
                </div>
                {m.matchReasons.length > 0 && (
                  <p className="text-xs text-[#5B3EB5] bg-[#F5F0FF] rounded-xl px-3 py-1.5">
                    Why matched: {m.matchReasons.join(' • ')}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
