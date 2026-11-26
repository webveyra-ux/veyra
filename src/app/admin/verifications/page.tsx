'use client';

import * as React from 'react';
import { ExternalLink, FileCheck2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { formatDateTime } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import type { VerificationStatus } from '@/types/domain';

export default function AdminVerificationsPage() {
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();
  const [notesByUid, setNotesByUid] = React.useState<Record<string, string>>({});
  const [busyUid, setBusyUid] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('pending');

  async function handleDecision(
    uid: string,
    decision: Extract<VerificationStatus, 'approved' | 'rejected' | 'more_info_required' | 'suspended'>
  ) {
    setBusyUid(uid);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'verify_professional',
          uid,
          decision,
          note: notesByUid[uid] || undefined,
        },
      });
      notify({
        tone: 'success',
        title: `Verification ${decision.replace(/_/g, ' ')}`,
      });
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Verification update failed',
        description: err instanceof Error ? err.message : 'Check permissions.',
      });
    } finally {
      setBusyUid(null);
    }
  }

  async function openPrivateDocument(storagePath: string) {
    try {
      const res = await callAuthedApi<{ url: string }>(
        `/api/admin/verification-doc?path=${encodeURIComponent(storagePath)}`,
        { method: 'GET' }
      );
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Cannot open verification file',
        description: err instanceof Error ? err.message : 'Check storage configuration.',
      });
    }
  }

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const list = (data?.verifications || []).filter((v) =>
    statusFilter === 'all' ? true : v.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Verification Queue"
        title="Professional Verification Review"
        description="Inspect private credential uploads via short-lived signed URLs and issue auditable verification decisions."
      />

      <div className="flex flex-wrap gap-2">
        {['pending', 'more_info_required', 'approved', 'rejected', 'suspended', 'all'].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={statusFilter === st ? 'primary' : 'outline'}
            onClick={() => setStatusFilter(st)}
            className="capitalize"
          >
            {st.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-6 w-6" />}
          title="No verification packets in this queue"
          description="Submitted professional verification records appear here for admin review."
        />
      ) : (
        <div className="space-y-4">
          {list.map((v) => {
            const proProfile = data?.professionals.find((p) => p.uid === v.uid);
            return (
              <Card key={v.uid} className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#242331]">{v.legalName}</h3>
                      <Badge tone="lavender" className="capitalize">
                        {v.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B6879] mt-0.5">
                      Studio: {proProfile?.businessName || proProfile?.displayName || v.uid} &middot; ID:{' '}
                      {v.governmentIdType} &middot; Submitted {formatDateTime(v.submittedAt)}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#242331]">{v.portfolioProofNote}</p>

                <div className="flex flex-wrap gap-2">
                  {v.documentUrls.map((docItem) => (
                    <Button
                      key={docItem.id}
                      size="sm"
                      variant="outline"
                      onClick={() => void openPrivateDocument(docItem.storagePath)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View {docItem.name}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-[#E9E5EF]">
                  <div className="sm:col-span-5">
                    <Input
                      label="Reviewer Note / Rejection Reason"
                      value={notesByUid[v.uid] || ''}
                      onChange={(e) =>
                        setNotesByUid((prev) => ({ ...prev, [v.uid]: e.target.value }))
                      }
                      placeholder="Optional note for approval or required reason for rejection..."
                    />
                  </div>
                  <div className="sm:col-span-7 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={busyUid === v.uid}
                      onClick={() => void handleDecision(v.uid, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      loading={busyUid === v.uid}
                      onClick={() => void handleDecision(v.uid, 'more_info_required')}
                    >
                      Request Info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busyUid === v.uid}
                      onClick={() => void handleDecision(v.uid, 'rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busyUid === v.uid}
                      onClick={() => void handleDecision(v.uid, 'suspended')}
                    >
                      Suspend
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
