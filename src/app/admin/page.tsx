'use client';

import * as React from 'react';
import Link from 'next/link';
import { BadgeCheck, Database, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { formatDateTime } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();
  const [seeding, setSeeding] = React.useState(false);

  async function handleSeedCategories() {
    setSeeding(true);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: { action: 'seed_categories' },
      });
      notify({
        tone: 'success',
        title: 'Categories seeded into Firestore',
        description: 'Initial 10 categories, subcategories, and public settings are stored.',
      });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Seed failed',
        description: err instanceof Error ? err.message : 'Check admin permissions.',
      });
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-24" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
          <LoadingSkeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const { metrics } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations Command"
        title="Platform Overview"
        description="Real-time metrics derived directly from Cloud Firestore collections and server audit logs."
        actions={
          <Button variant="soft" size="sm" loading={seeding} onClick={handleSeedCategories}>
            <Database className="h-4 w-4" />
            Seed Initial Categories
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: metrics.totalUsers },
          { label: 'Customers', value: metrics.totalCustomers },
          { label: 'Professionals', value: metrics.totalProfessionals },
          { label: 'Verified Pros', value: metrics.verifiedProfessionals },
          { label: 'Pending Verifications', value: metrics.pendingVerifications },
          { label: 'Active Requests', value: metrics.activeRequests },
          { label: 'Total Proposals', value: metrics.totalProposals },
          { label: 'Bookings (Completed)', value: `${metrics.totalBookings} (${metrics.completedBookings})` },
          { label: 'Cancelled Bookings', value: metrics.cancelledBookings },
          { label: 'Open Reports', value: metrics.openReports },
        ].map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs text-[#6B6879]">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#242331]">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331] inline-flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-[#7655D9]" />
              Verification Queue ({metrics.pendingVerifications} pending)
            </h2>
            <Link href="/admin/verifications" className="text-xs font-semibold text-[#5B3EB5]">
              Open Queue
            </Link>
          </div>
          {data.verifications.filter((v) => v.status === 'pending').length === 0 ? (
            <p className="text-xs text-[#6B6879]">No pending verification packets.</p>
          ) : (
            <div className="space-y-2">
              {data.verifications
                .filter((v) => v.status === 'pending')
                .slice(0, 5)
                .map((v) => (
                  <div
                    key={v.uid}
                    className="flex items-center justify-between rounded-xl border border-[#E9E5EF] p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#242331]">{v.legalName}</p>
                      <p className="text-[#6B6879]">
                        {v.governmentIdType} &middot; {v.documentUrls.length} file(s)
                      </p>
                    </div>
                    <Link href="/admin/verifications">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#242331] inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[#7655D9]" />
              Recent Registrations
            </h2>
            <Link href="/admin/users" className="text-xs font-semibold text-[#5B3EB5]">
              Manage Users
            </Link>
          </div>
          <div className="space-y-2">
            {data.users.slice(0, 5).map((u) => (
              <div
                key={u.uid}
                className="flex items-center justify-between rounded-xl border border-[#E9E5EF] p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-[#242331]">{u.displayName}</p>
                  <p className="text-[#6B6879]">
                    {u.email || u.phone || u.uid} &middot; {formatDateTime(u.createdAt)}
                  </p>
                </div>
                <Badge tone="lavender" className="capitalize">
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 flex items-center gap-3 text-xs text-[#6B6879]">
        <ShieldCheck className="h-5 w-5 text-[#7655D9] shrink-0" />
        <span>
          Admin privileges are enforced via Firebase Custom Claims (`admin: true`, `adminLevel`) and verified server-side on every endpoint.
        </span>
      </Card>
    </div>
  );
}
