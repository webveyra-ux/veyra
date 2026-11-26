'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { formatDateTime } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import type { ReportStatus } from '@/types/domain';

export default function AdminModerationPage() {
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();
  const [tab, setTab] = React.useState<'reports' | 'reviews'>('reports');
  const [noteById, setNoteById] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function resolveReport(reportId: string, status: ReportStatus) {
    setBusyId(reportId);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'resolve_report',
          reportId,
          status,
          resolutionNote: noteById[reportId] || undefined,
        },
      });
      notify({ tone: 'success', title: `Report marked ${status}` });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Report update failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function moderateReview(
    reviewId: string,
    moderationStatus: 'published' | 'hidden' | 'removed'
  ) {
    setBusyId(reviewId);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'moderate_review',
          reviewId,
          moderationStatus,
          reason: noteById[reviewId] || undefined,
        },
      });
      notify({ tone: 'success', title: `Review ${moderationStatus}` });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Review moderation failed',
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
        eyebrow="Trust & Safety"
        title="Reports & Review Moderation"
        description="Handle safety reports, customer disputes, support tickets, and review moderation with automatic rating recalculation."
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === 'reports' ? 'primary' : 'outline'}
          onClick={() => setTab('reports')}
        >
          Reports Queue ({data?.reports.length || 0})
        </Button>
        <Button
          size="sm"
          variant={tab === 'reviews' ? 'primary' : 'outline'}
          onClick={() => setTab('reviews')}
        >
          Reviews ({data?.reviews.length || 0})
        </Button>
      </div>

      {tab === 'reports' ? (
        <div className="space-y-3">
          {(data?.reports || []).map((rep) => (
            <Card key={rep.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone="lavender" className="capitalize">
                    {rep.targetType}
                  </Badge>
                  <Badge
                    tone={
                      rep.status === 'resolved'
                        ? 'mint'
                        : rep.status === 'escalated'
                          ? 'danger'
                          : 'amber'
                    }
                    className="capitalize"
                  >
                    {rep.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <span className="text-xs text-[#6B6879]">{formatDateTime(rep.createdAt)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#242331]">{rep.reason}</p>
                <p className="text-sm text-[#6B6879] mt-1">{rep.description}</p>
                <p className="text-xs text-[#6B6879] mt-1">
                  Target ID: <code className="font-mono">{rep.targetId}</code>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-[#E9E5EF]">
                <div className="sm:col-span-5">
                  <Input
                    label="Resolution Note"
                    value={noteById[rep.id] || ''}
                    onChange={(e) =>
                      setNoteById((prev) => ({ ...prev, [rep.id]: e.target.value }))
                    }
                    placeholder="Record decision or follow-up notes..."
                  />
                </div>
                <div className="sm:col-span-7 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busyId === rep.id}
                    onClick={() => void resolveReport(rep.id, 'under_review')}
                  >
                    Under Review
                  </Button>
                  <Button
                    size="sm"
                    loading={busyId === rep.id}
                    onClick={() => void resolveReport(rep.id, 'resolved')}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    loading={busyId === rep.id}
                    onClick={() => void resolveReport(rep.id, 'rejected')}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === rep.id}
                    onClick={() => void resolveReport(rep.id, 'escalated')}
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.reviews || []).map((rev) => (
            <Card key={rev.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#242331]">
                    {rev.customerName} &middot; {rev.overallRating}/5 stars
                  </p>
                  <p className="text-xs text-[#6B6879]">
                    Booking {rev.bookingId} &middot; Pro {rev.professionalId}
                  </p>
                </div>
                <Badge
                  tone={rev.moderationStatus === 'published' ? 'mint' : 'danger'}
                  className="capitalize"
                >
                  {rev.moderationStatus}
                </Badge>
              </div>
              <p className="text-sm text-[#242331]">{rev.comment}</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-[#E9E5EF]">
                <div className="sm:col-span-6">
                  <Input
                    label="Moderation Reason"
                    value={noteById[rev.id] || ''}
                    onChange={(e) =>
                      setNoteById((prev) => ({ ...prev, [rev.id]: e.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-6 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busyId === rev.id}
                    onClick={() => void moderateReview(rev.id, 'published')}
                  >
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="soft"
                    loading={busyId === rev.id}
                    onClick={() => void moderateReview(rev.id, 'hidden')}
                  >
                    Hide
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busyId === rev.id}
                    onClick={() => void moderateReview(rev.id, 'removed')}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
