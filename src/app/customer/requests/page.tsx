'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileText, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteDraftRequest, listCustomerRequests } from '@/services/requests.service';
import type { ServiceRequest } from '@/types/domain';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'awaiting', label: 'Awaiting Proposals' },
  { key: 'proposals', label: 'Proposals Received' },
  { key: 'booked', label: 'Booked & Completed' },
  { key: 'closed', label: 'Cancelled / Expired' },
] as const;

export default function CustomerRequestsPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();
  const [requests, setRequests] = React.useState<ServiceRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<(typeof TABS)[number]['key']>('all');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void listCustomerRequests(firebaseUser.uid)
      .catch(() => [] as ServiceRequest[])
      .then((list) => {
        if (!active) return;
        setRequests(list);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  const filtered = React.useMemo(() => {
    switch (tab) {
      case 'draft':
        return requests.filter((r) => r.status === 'draft');
      case 'awaiting':
        return requests.filter((r) => ['open', 'matching'].includes(r.status));
      case 'proposals':
        return requests.filter((r) =>
          ['proposals_received', 'shortlisted'].includes(r.status)
        );
      case 'booked':
        return requests.filter((r) => ['booked', 'completed'].includes(r.status));
      case 'closed':
        return requests.filter((r) =>
          ['cancelled', 'expired', 'closed'].includes(r.status)
        );
      default:
        return requests;
    }
  }, [requests, tab]);

  async function handleDeleteDraft(id: string) {
    await deleteDraftRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    notify({ tone: 'info', title: 'Draft deleted' });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests"
        title="My Service Requests"
        description="Track drafts, matching progress, incoming quotations, and converted bookings."
        actions={
          <Link href="/customer/requests/new">
            <Button size="sm">
              <PlusCircle className="h-4 w-4" />
              Post New Requirement
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'primary' : 'outline'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No requests in this view"
          description="Create a new service requirement to get matched with VEYRA professionals."
          action={
            <Link href="/customer/requests/new">
              <Button size="sm">Create Request</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="lavender">{req.categoryName}</Badge>
                  <Badge tone={req.status === 'booked' || req.status === 'completed' ? 'mint' : 'neutral'} className="capitalize">
                    {req.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-[#6B6879]">
                    {req.proposalsCount} proposal{req.proposalsCount === 1 ? '' : 's'}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#242331] truncate">{req.title}</h3>
                <p className="text-xs text-[#6B6879]">
                  {req.location.locality}, {req.location.city} &middot; {formatDate(req.desiredDate)} &middot;{' '}
                  {formatCurrency(req.budgetMin)} – {formatCurrency(req.budgetMax)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'draft' ? (
                  <>
                    <Link href={`/customer/requests/new?draftId=${req.id}`}>
                      <Button size="sm">Resume Draft</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDeleteDraft(req.id)}
                      aria-label="Delete draft"
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </>
                ) : (
                  <Link href={`/customer/requests/${req.id}`}>
                    <Button size="sm" variant="soft">
                      View &amp; Compare Proposals
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
