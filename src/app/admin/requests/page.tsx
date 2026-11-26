'use client';

import * as React from 'react';
import { Flag, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { formatCurrency, formatDate } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';

export default function AdminRequestsAndBookingsPage() {
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();
  const [tab, setTab] = React.useState<'requests' | 'bookings'>('requests');
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function moderateRequest(requestId: string, mode: 'flag' | 'unflag' | 'close') {
    setBusyId(requestId);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: { action: 'moderate_request', requestId, mode },
      });
      notify({ tone: 'success', title: `Request ${mode} applied` });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Moderation failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace Activity"
        title="Requests & Bookings Oversight"
        description="Monitor active customer briefs, moderate flagged requests, and audit booking lifecycles."
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === 'requests' ? 'primary' : 'outline'}
          onClick={() => setTab('requests')}
        >
          Requests ({data?.requests.length || 0})
        </Button>
        <Button
          size="sm"
          variant={tab === 'bookings' ? 'primary' : 'outline'}
          onClick={() => setTab('bookings')}
        >
          Bookings ({data?.bookings.length || 0})
        </Button>
      </div>

      {tab === 'requests' ? (
        <div className="space-y-3">
          {(data?.requests || []).map((req) => (
            <Card
              key={req.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="lavender">{req.categoryName}</Badge>
                  <Badge tone="neutral" className="capitalize">
                    {req.status.replace(/_/g, ' ')}
                  </Badge>
                  {req.isFlagged && <Badge tone="danger">Flagged</Badge>}
                </div>
                <p className="text-sm font-semibold text-[#242331] truncate">{req.title}</p>
                <p className="text-xs text-[#6B6879]">
                  {req.customerName} &middot; {req.location.city} &middot;{' '}
                  {formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)} &middot;{' '}
                  {req.proposalsCount} proposals
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  loading={busyId === req.id}
                  onClick={() =>
                    void moderateRequest(req.id, req.isFlagged ? 'unflag' : 'flag')
                  }
                >
                  <Flag className="h-3.5 w-3.5" />
                  {req.isFlagged ? 'Unflag' : 'Flag'}
                </Button>
                {req.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === req.id}
                    onClick={() => void moderateRequest(req.id, 'close')}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Close
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.bookings || []).map((b) => (
            <Card key={b.id} className="p-4 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#242331]">{b.serviceName}</p>
                <Badge
                  tone={
                    b.status === 'completed'
                      ? 'mint'
                      : b.status === 'cancelled' || b.status === 'no_show'
                        ? 'danger'
                        : 'lavender'
                  }
                  className="capitalize"
                >
                  {b.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-[#6B6879]">
                Customer: {b.customerName} &rarr; Pro: {b.professionalBusinessName} &middot;{' '}
                {formatDate(b.scheduledDate)} &middot;{' '}
                {formatCurrency(b.agreedPrice, b.currency)} ({b.paymentStatus})
              </p>
              {b.cancellation && (
                <p className="text-xs text-rose-700">Cancellation: {b.cancellation.reason}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
