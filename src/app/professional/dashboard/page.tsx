'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  FileCheck2,
  Inbox,
  Sparkles,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { listUserBookings } from '@/services/bookings.service';
import { getProfessionalProfile } from '@/services/professionals.service';
import { listProfessionalProposals } from '@/services/proposals.service';
import { listProfessionalMatchedRequests } from '@/services/requests.service';
import type { Booking, ProfessionalProfile, Proposal, RequestMatch, ServiceRequest } from '@/types/domain';

export default function ProfessionalDashboardPage() {
  const { firebaseUser } = useAuth();
  const [pro, setPro] = React.useState<ProfessionalProfile | null>(null);
  const [matches, setMatches] = React.useState<RequestMatch[]>([]);
  const [requestsById, setRequestsById] = React.useState<Record<string, ServiceRequest>>({});
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
      setPro(profile && !profile.isSampleData ? profile : null);
      setMatches(matchData.matches);
      setRequestsById(matchData.requestsById);
      setProposals(propsList);
      setBookings(books);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-28" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
        </div>
      </div>
    );
  }

  const upcomingBookings = bookings.filter((b) =>
    ['confirmed', 'reschedule_requested', 'in_progress'].includes(b.status)
  );
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Professional Studio"
        title={pro?.businessName || pro?.displayName || 'Your Studio Dashboard'}
        description="Respond to matched briefs, manage your calendar and portfolio, and track confirmed bookings."
        actions={
          <div className="flex flex-wrap gap-2">
            {pro && (
              <Link href={`/professionals/${pro.slug || pro.uid}`}>
                <Button variant="outline" size="sm">
                  View Public Profile
                </Button>
              </Link>
            )}
            <Link href="/professional/requests">
              <Button size="sm">
                <Inbox className="h-4 w-4" />
                Browse Requests
              </Button>
            </Link>
          </div>
        }
      />

      {/* Onboarding / Profile Completion & Verification Banners */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5 bg-[#F5F0FF]/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#242331]">Profile Completion</span>
            <span className="text-xs font-bold text-[#5B3EB5]">
              {pro?.profileCompletion ?? 15}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white overflow-hidden">
            <div
              className="h-full bg-[#7655D9]"
              style={{ width: `${pro?.profileCompletion ?? 15}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#6B6879]">
              Status: <strong className="capitalize">{pro?.profileStatus || 'draft'}</strong>
            </span>
            <Link href={pro?.onboardingCompleted ? '/professional/profile' : '/professional/onboarding'}>
              <Button size="sm" variant="soft">
                {pro?.onboardingCompleted ? 'Update Profile' : 'Resume Setup Wizard'}
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#242331] flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-[#7655D9]" />
                Verification Status
              </p>
              <p className="text-xs text-[#6B6879] mt-1">
                Verified practitioners carry an admin-reviewed badge on search cards and proposals.
              </p>
            </div>
            <Badge
              tone={
                pro?.verificationStatus === 'approved'
                  ? 'mint'
                  : pro?.verificationStatus === 'pending'
                    ? 'lavender'
                    : pro?.verificationStatus === 'rejected'
                      ? 'danger'
                      : 'neutral'
              }
              className="capitalize shrink-0"
            >
              {(pro?.verificationStatus || 'not_submitted').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex justify-end">
            <Link href="/professional/verification">
              <Button size="sm" variant="outline">
                Manage Verification
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Real Database Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <Sparkles className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{matches.length}</p>
          <p className="text-xs text-[#6B6879]">Matched Requests</p>
        </Card>
        <Card className="p-4">
          <FileCheck2 className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{proposals.length}</p>
          <p className="text-xs text-[#6B6879]">Proposals Sent</p>
        </Card>
        <Card className="p-4">
          <CalendarCheck className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{upcomingBookings.length}</p>
          <p className="text-xs text-[#6B6879]">Upcoming Bookings</p>
        </Card>
        <Card className="p-4">
          <Star className="h-5 w-5 text-amber-400 mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">
            {pro && pro.reviewCount > 0 ? pro.ratingAverage.toFixed(1) : '—'}
          </p>
          <p className="text-xs text-[#6B6879]">
            {pro && pro.reviewCount > 0
              ? `${pro.reviewCount} reviews • ${completedBookings.length} completed`
              : `${completedBookings.length} completed bookings`}
          </p>
        </Card>
      </div>

      {/* Recent Matched Requests & Upcoming Bookings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331]">Matched Customer Briefs</h2>
            <Link
              href="/professional/requests"
              className="text-xs font-semibold text-[#5B3EB5] hover:underline inline-flex items-center gap-1"
            >
              Open Feed
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {matches.length === 0 ? (
            <EmptyState
              title="No matched briefs yet"
              description="Activate your profile and select your categories & service areas to receive matched requests."
              action={
                <Link href="/professional/requests">
                  <Button size="sm" variant="soft">
                    Explore Open Category Requests
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {matches.slice(0, 4).map((m) => {
                const req = requestsById[m.requestId];
                if (!req) return null;
                return (
                  <Link
                    key={m.id}
                    href={`/professional/requests/${req.id}`}
                    className="block rounded-xl border border-[#E9E5EF] p-3.5 hover:border-[#7655D9]/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#242331] truncate">{req.title}</p>
                      <Badge tone="lavender">{m.matchScore}% match</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#6B6879]">
                      {req.location.locality}, {req.location.city} &middot;{' '}
                      {formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331]">Upcoming Bookings</h2>
            <Link
              href="/professional/bookings"
              className="text-xs font-semibold text-[#5B3EB5] hover:underline inline-flex items-center gap-1"
            >
              Manage all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              title="No upcoming bookings"
              description="Accepted proposals turn into confirmed bookings right here."
            />
          ) : (
            <div className="space-y-2.5">
              {upcomingBookings.slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  href={`/professional/bookings/${b.id}`}
                  className="block rounded-xl border border-[#E9E5EF] p-3.5 hover:border-[#7655D9]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#242331] truncate">{b.serviceName}</p>
                    <Badge tone="mint" className="capitalize">
                      {b.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#6B6879]">
                    {b.customerName} &middot; {formatDate(b.scheduledDate)} &middot;{' '}
                    {formatCurrency(b.agreedPrice, b.currency)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
