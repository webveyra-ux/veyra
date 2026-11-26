'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  Heart,
  MessageSquare,
  PlusCircle,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { listUserBookings } from '@/services/bookings.service';
import {
  getCustomerProfile,
  getFavouriteProfessionalIds,
} from '@/services/customers.service';
import { listCustomerRequests } from '@/services/requests.service';
import type { Booking, CustomerProfile, ServiceRequest } from '@/types/domain';

export default function CustomerDashboardPage() {
  const { firebaseUser, userRecord, notifications } = useAuth();
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [requests, setRequests] = React.useState<ServiceRequest[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [favCount, setFavCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [cust, reqs, books, favs] = await Promise.all([
        getCustomerProfile(firebaseUser.uid).catch(() => null),
        listCustomerRequests(firebaseUser.uid).catch(() => []),
        listUserBookings(firebaseUser.uid, 'customer').catch(() => []),
        getFavouriteProfessionalIds(firebaseUser.uid).catch(() => []),
      ]);
      if (!active) return;
      setProfile(cust);
      setRequests(reqs);
      setBookings(books);
      setFavCount(favs.length);
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
        <LoadingSkeleton className="h-24" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
      </div>
    );
  }

  const activeRequests = requests.filter((r) =>
    ['open', 'matching', 'proposals_received', 'shortlisted'].includes(r.status)
  );
  const upcomingBookings = bookings.filter((b) =>
    ['confirmed', 'reschedule_requested', 'in_progress'].includes(b.status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer Dashboard"
        title={`Welcome, ${userRecord?.displayName || 'there'}`}
        description="Manage your requirements, compare incoming proposals, chat with professionals, and track upcoming bookings."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/explore">
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4" />
                Explore Professionals
              </Button>
            </Link>
            <Link href="/customer/requests/new">
              <Button size="sm">
                <PlusCircle className="h-4 w-4" />
                Post Requirement
              </Button>
            </Link>
          </div>
        }
      />

      {/* Profile Completion Bar */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F5F0FF]/60">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#242331] mb-1.5">
            <span>Profile Completion</span>
            <span>{profile?.profileCompletion ?? 35}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white overflow-hidden">
            <div
              className="h-full bg-[#7655D9]"
              style={{ width: `${profile?.profileCompletion ?? 35}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[#6B6879]">
            Add a default locality and preferred categories for faster request creation.
          </p>
        </div>
        <Link href="/customer/profile">
          <Button variant="soft" size="sm">
            Complete Profile
          </Button>
        </Link>
      </Card>

      {/* Key Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <FileText className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{activeRequests.length}</p>
          <p className="text-xs text-[#6B6879]">Active Requests</p>
        </Card>
        <Card className="p-4">
          <CalendarCheck className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{upcomingBookings.length}</p>
          <p className="text-xs text-[#6B6879]">Upcoming Bookings</p>
        </Card>
        <Card className="p-4">
          <Heart className="h-5 w-5 text-rose-500 mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">{favCount}</p>
          <p className="text-xs text-[#6B6879]">Saved Professionals</p>
        </Card>
        <Card className="p-4">
          <MessageSquare className="h-5 w-5 text-[#7655D9] mb-2" />
          <p className="text-2xl font-semibold text-[#242331]">
            {notifications.filter((n) => !n.read).length}
          </p>
          <p className="text-xs text-[#6B6879]">Unread Alerts</p>
        </Card>
      </div>

      {/* Active Requests & Upcoming Bookings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331]">Recent Requests</h2>
            <Link
              href="/customer/requests"
              className="text-xs font-semibold text-[#5B3EB5] hover:underline inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Post your first beauty or creative requirement to receive tailored proposals."
              action={
                <Link href="/customer/requests/new">
                  <Button size="sm">Post a Requirement</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {requests.slice(0, 4).map((req) => (
                <Link
                  key={req.id}
                  href={
                    req.status === 'draft'
                      ? `/customer/requests/new?draftId=${req.id}`
                      : `/customer/requests/${req.id}`
                  }
                  className="block rounded-xl border border-[#E9E5EF] p-3.5 hover:border-[#7655D9]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#242331] truncate">{req.title}</p>
                    <Badge tone="lavender" className="capitalize">
                      {req.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#6B6879]">
                    {req.categoryName} &middot; {req.proposalsCount} proposal
                    {req.proposalsCount === 1 ? '' : 's'} &middot; {formatDate(req.desiredDate)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331]">Upcoming Bookings</h2>
            <Link
              href="/customer/bookings"
              className="text-xs font-semibold text-[#5B3EB5] hover:underline inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              title="No upcoming bookings"
              description="Accept a proposal on an open request to create a confirmed booking."
            />
          ) : (
            <div className="space-y-2.5">
              {upcomingBookings.slice(0, 4).map((b) => (
                <Link
                  key={b.id}
                  href={`/customer/bookings/${b.id}`}
                  className="block rounded-xl border border-[#E9E5EF] p-3.5 hover:border-[#7655D9]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#242331] truncate">
                      {b.serviceName}
                    </p>
                    <Badge tone="mint" className="capitalize">
                      {b.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#6B6879]">
                    {b.professionalBusinessName} &middot; {formatDate(b.scheduledDate)} &middot;{' '}
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
