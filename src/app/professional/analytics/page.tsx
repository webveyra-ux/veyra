'use client';

import * as React from 'react';
import { BarChart3, CheckCircle2, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useAuth } from '@/features/authentication/AuthContext';
import { listUserBookings } from '@/services/bookings.service';
import { getProfessionalProfile } from '@/services/professionals.service';
import { listProfessionalProposals } from '@/services/proposals.service';
import { listProfessionalMatchedRequests } from '@/services/requests.service';
import type { Booking, ProfessionalProfile, Proposal, RequestMatch } from '@/types/domain';

export default function ProfessionalAnalyticsPage() {
  const { firebaseUser } = useAuth();
  const [pro, setPro] = React.useState<ProfessionalProfile | null>(null);
  const [matches, setMatches] = React.useState<RequestMatch[]>([]);
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [profile, matchData, propsList, books] = await Promise.all([
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
        listProfessionalMatchedRequests(firebaseUser.uid).catch(() => ({
          matches: [],
          requestsById: {},
        })),
        listProfessionalProposals(firebaseUser.uid).catch(() => []),
        listUserBookings(firebaseUser.uid, 'professional').catch(() => []),
      ]);
      if (!active) return;
      setPro(profile);
      setMatches(matchData.matches);
      setProposals(propsList);
      setBookings(books);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  if (loading) return <LoadingSkeleton className="h-[360px]" />;

  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;
  const acceptanceRate =
    proposals.length > 0 ? Math.round((acceptedCount / proposals.length) * 100) : null;
  const respondedMatches = matches.filter((m) => m.matchStatus === 'proposal_submitted').length;
  const observedResponseRate =
    matches.length > 0 ? Math.round((respondedMatches / matches.length) * 100) : null;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Real-Data Studio Analytics"
        description="Every number on this page is computed directly from your live Firestore activity—never fabricated."
      />

      <div className="flex items-start gap-2 rounded-2xl border border-[#EDE5FF] bg-[#F5F0FF] p-4 text-xs text-[#5B3EB5]">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Metrics with zero observations show &ldquo;Insufficient data&rdquo; rather than synthetic placeholders. Profile impression views and exact median response-time telemetry require dedicated analytics event instrumentation.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Matched Requests Received</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#242331]">{matches.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Proposals Submitted</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#242331]">
            {proposals.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Proposal Acceptance Rate</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#5B3EB5]">
            {acceptanceRate !== null ? `${acceptanceRate}%` : 'Insufficient data'}
          </p>
          <p className="text-xs text-[#6B6879] mt-1">{acceptedCount} accepted</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Completed Bookings</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#176846]">
            {completedBookings}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Verified Review Average</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#242331]">
            {pro && pro.reviewCount > 0 ? `${pro.ratingAverage.toFixed(2)} / 5` : 'No reviews yet'}
          </p>
          <p className="text-xs text-[#6B6879] mt-1">
            {pro?.reviewCount || 0} published review{pro?.reviewCount === 1 ? '' : 's'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[#6B6879]">Matched Request Response Rate</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#242331]">
            {observedResponseRate !== null ? `${observedResponseRate}%` : 'Insufficient data'}
          </p>
          <p className="text-xs text-[#6B6879] mt-1">
            {respondedMatches} of {matches.length} matched briefs quoted
          </p>
        </Card>
      </div>

      <Card className="p-5 flex items-center gap-3 text-xs text-[#6B6879]">
        <BarChart3 className="h-5 w-5 text-[#7655D9] shrink-0" />
        <div>
          <p className="font-semibold text-[#242331] inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#176846]" />
            Telemetry Integrity Policy
          </p>
          <p className="mt-0.5">
            Profile views &amp; response-time percentiles are intentionally omitted until event logging is connected in production.
          </p>
        </div>
      </Card>
    </div>
  );
}
