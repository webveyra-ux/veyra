'use client';

import * as React from 'react';
import { Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { formatDate } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';

export default function AdminUsersPage() {
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function toggleSuspend(uid: string, currentStatus: string) {
    setBusyId(uid);
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'set_user_status',
          uid,
          accountStatus: nextStatus,
          reason: `Updated by admin to ${nextStatus}`,
        },
      });
      notify({ tone: 'success', title: `Account marked ${nextStatus}` });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Status update failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(uid: string, currentFeatured: boolean) {
    setBusyId(uid);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'feature_professional',
          uid,
          isFeatured: !currentFeatured,
        },
      });
      notify({
        tone: 'success',
        title: !currentFeatured ? 'Professional featured on homepage' : 'Removed from featured',
      });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const q = search.trim().toLowerCase();
  const users = (data?.users || []).filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Users & Professionals Management"
        description="Search accounts, review status, suspend or reactivate accounts, and manage featured professionals."
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6B6879]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full min-h-11 rounded-xl border border-[#E9E5EF] bg-white pl-10 pr-3 text-sm"
          />
        </div>
        <div className="sm:w-52">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="professional">Professionals</option>
            <option value="admin">Admins</option>
          </Select>
        </div>
      </Card>

      <div className="space-y-3">
        {users.map((u) => {
          const pro = data?.professionals.find((p) => p.uid === u.uid);
          return (
            <Card
              key={u.uid}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#242331]">{u.displayName}</p>
                  <Badge tone="lavender" className="capitalize">
                    {u.role}
                  </Badge>
                  <Badge
                    tone={u.accountStatus === 'suspended' ? 'danger' : 'mint'}
                    className="capitalize"
                  >
                    {u.accountStatus}
                  </Badge>
                  {pro?.isVerified && <Badge tone="lavender">Verified Pro</Badge>}
                  {pro?.isFeatured && <Badge tone="peach">Featured</Badge>}
                </div>
                <p className="text-xs text-[#6B6879] truncate">
                  {u.email || u.phone || u.uid} &middot; Joined {formatDate(u.createdAt)}
                  {pro ? ` • ${pro.location.city || 'No city'} • ${pro.completedBookingsCount} bookings` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {pro && (
                  <Button
                    size="sm"
                    variant="soft"
                    loading={busyId === u.uid}
                    onClick={() => void toggleFeatured(u.uid, pro.isFeatured)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {pro.isFeatured ? 'Unfeature' : 'Feature'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={u.accountStatus === 'suspended' ? 'outline' : 'danger'}
                  loading={busyId === u.uid}
                  onClick={() => void toggleSuspend(u.uid, u.accountStatus)}
                >
                  {u.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
