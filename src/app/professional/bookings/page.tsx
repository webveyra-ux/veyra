'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { listUserBookings } from '@/services/bookings.service';
import type { Booking } from '@/types/domain';

export default function ProfessionalBookingsPage() {
  const { firebaseUser } = useAuth();
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void listUserBookings(firebaseUser.uid, 'professional')
      .then((items) => {
        if (active) setBookings(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const visible = React.useMemo(() => {
    if (tab === 'upcoming') {
      return bookings.filter((b) =>
        ['confirmed', 'reschedule_requested', 'in_progress'].includes(b.status)
      );
    }
    if (tab === 'completed') return bookings.filter((b) => b.status === 'completed');
    if (tab === 'cancelled') {
      return bookings.filter((b) => ['cancelled', 'no_show', 'disputed'].includes(b.status));
    }
    return bookings;
  }, [bookings, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="Studio Bookings"
        description="Manage confirmed client bookings, handle reschedules, start/complete appointments, and respond to reviews."
      />

      <div className="flex flex-wrap gap-2">
        {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'primary' : 'outline'}
            onClick={() => setTab(key)}
            className="capitalize"
          >
            {key}
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
          icon={<CalendarCheck className="h-6 w-6" />}
          title="No bookings in this view"
          description="Accepted customer proposals appear here with protected venue details and schedule controls."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((booking) => (
            <Card
              key={booking.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      booking.status === 'completed'
                        ? 'mint'
                        : booking.status === 'cancelled' || booking.status === 'no_show'
                          ? 'danger'
                          : 'lavender'
                    }
                    className="capitalize"
                  >
                    {booking.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-[#6B6879]">
                    {SERVICE_MODE_LABELS[booking.serviceMode]}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#242331]">{booking.serviceName}</h3>
                <p className="text-xs text-[#6B6879]">
                  Client: {booking.customerName} &middot; {formatDate(booking.scheduledDate)} (
                  {booking.scheduledTime}) &middot;{' '}
                  {formatCurrency(booking.agreedPrice, booking.currency)}
                </p>
              </div>

              <Link href={`/professional/bookings/${booking.id}`}>
                <Button size="sm" variant="soft">
                  Manage Booking
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
