'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useAdminOverview } from '@/features/admin/useAdminOverview';

export default function AdminAnalyticsPage() {
  const { data, loading, error, reload } = useAdminOverview();

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { metrics, requests, professionals, bookings } = data;

  const conversionRate =
    metrics.totalRequests > 0
      ? Math.round((metrics.totalBookings / metrics.totalRequests) * 100)
      : 0;
  const cancellationRate =
    metrics.totalBookings > 0
      ? Math.round((metrics.cancelledBookings / metrics.totalBookings) * 100)
      : 0;

  // Group requests by category
  const byCategory: Record<string, number> = {};
  for (const r of requests) {
    byCategory[r.categoryName || r.categorySlug] =
      (byCategory[r.categoryName || r.categorySlug] || 0) + 1;
  }

  // Group active professionals & requests by city
  const byCity: Record<string, { pros: number; requests: number }> = {};
  for (const p of professionals) {
    const city = p.location.city || 'Unspecified';
    byCity[city] = byCity[city] || { pros: 0, requests: 0 };
    byCity[city]!.pros += 1;
  }
  for (const r of requests) {
    const city = r.location.city || 'Unspecified';
    byCity[city] = byCity[city] || { pros: 0, requests: 0 };
    byCity[city]!.requests += 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform Intelligence"
        title="Marketplace Analytics"
        description="Calculated exclusively from live Firestore records across users, requests, proposals, and bookings."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[#6B6879]">Request &rarr; Booking Rate</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[#5B3EB5]">
            {metrics.totalRequests > 0 ? `${conversionRate}%` : 'No data'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B6879]">Booking Cancellation Rate</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[#242331]">
            {metrics.totalBookings > 0 ? `${cancellationRate}%` : 'No data'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B6879]">Verified Pro Share</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[#176846]">
            {metrics.totalProfessionals > 0
              ? `${Math.round((metrics.verifiedProfessionals / metrics.totalProfessionals) * 100)}%`
              : 'No data'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[#6B6879]">Completed Bookings</p>
          <p className="mt-1 font-display text-2xl font-semibold text-[#242331]">
            {bookings.filter((b) => b.status === 'completed').length}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold text-[#242331]">Requests by Category</h2>
          {Object.keys(byCategory).length === 0 ? (
            <p className="text-xs text-[#6B6879]">No request activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span>{cat}</span>
                    <span className="font-semibold text-[#5B3EB5]">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold text-[#242331]">Geographic Activity</h2>
          {Object.keys(byCity).length === 0 ? (
            <p className="text-xs text-[#6B6879]">No geographic records yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(byCity).map(([city, counts]) => (
                <div key={city} className="flex items-center justify-between text-sm">
                  <span>{city}</span>
                  <span className="text-xs text-[#6B6879]">
                    {counts.pros} pros &middot; {counts.requests} requests
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
