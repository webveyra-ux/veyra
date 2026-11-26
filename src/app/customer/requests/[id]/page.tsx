'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/ui/RatingStars';
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getOrCreateConversation } from '@/services/conversations.service';
import {
  acceptProposalAndCreateBooking,
  listProposalsForRequest,
  updateProposalStatusByCustomer,
} from '@/services/proposals.service';
import {
  getRequestById,
  updateRequestStatusCustomer,
} from '@/services/requests.service';
import type { Proposal, ServiceRequest } from '@/types/domain';

function CustomerRequestDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();

  const [request, setRequest] = React.useState<ServiceRequest | null>(null);
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [req, props] = await Promise.all([
        getRequestById(params.id),
        listProposalsForRequest(params.id),
      ]);
      setRequest(req);
      setProposals(props);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load request.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    let active = true;
    void Promise.all([getRequestById(params.id), listProposalsForRequest(params.id)])
      .then(([req, props]) => {
        if (!active) return;
        setRequest(req);
        setProposals(props);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load request.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function handleProposalToggle(proposal: Proposal, nextStatus: 'shortlisted' | 'rejected' | 'submitted') {
    setBusyId(proposal.id);
    try {
      await updateProposalStatusByCustomer(proposal.id, nextStatus);
      setProposals((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, status: nextStatus } : p))
      );
      notify({
        tone: 'success',
        title: `Proposal marked ${nextStatus}`,
      });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(proposal: Proposal) {
    setBusyId(proposal.id);
    try {
      const { bookingId } = await acceptProposalAndCreateBooking(proposal.id);
      notify({
        tone: 'success',
        title: 'Booking Confirmed!',
        description: 'Other proposals were closed and your booking record is ready.',
      });
      router.push(`/customer/bookings/${bookingId}`);
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not accept proposal',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleChat(proposal: Proposal) {
    if (!request || !firebaseUser || !userRecord) return;
    const conv = await getOrCreateConversation({
      customerId: firebaseUser.uid,
      professionalId: proposal.professionalId,
      customerMeta: { displayName: userRecord.displayName, photoURL: userRecord.photoURL, role: 'customer' },
      professionalMeta: {
        displayName: proposal.professionalSnapshot.businessName || proposal.professionalSnapshot.displayName,
        photoURL: proposal.professionalSnapshot.profilePhotoUrl,
        role: 'professional',
      },
      type: 'proposal',
      subjectTitle: request.title,
      requestId: request.id,
      proposalId: proposal.id,
    });
    router.push(`/customer/messages?conversationId=${conv.id}`);
  }

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!request) {
    return (
      <EmptyState
        title="Request not found"
        description="This request may have been removed."
        action={
          <Link href="/customer/requests">
            <Button>Back to My Requests</Button>
          </Link>
        }
      />
    );
  }

  const canAccept =
    !request.bookingId &&
    ['open', 'matching', 'proposals_received', 'shortlisted'].includes(request.status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${request.categoryName} • ${request.subcategoryName}`}
        title={request.title}
        description={`${request.location.locality}, ${request.location.city} • ${formatDate(request.desiredDate)} • ${SERVICE_MODE_LABELS[request.serviceMode]}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {request.bookingId && (
              <Link href={`/customer/bookings/${request.bookingId}`}>
                <Button size="sm">View Confirmed Booking</Button>
              </Link>
            )}
            {canAccept && (
              <>
                <Link href={`/customer/requests/new?editId=${request.id}`}>
                  <Button variant="outline" size="sm">
                    Edit Brief
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await updateRequestStatusCustomer(request.id, 'cancelled');
                    await load();
                    notify({ tone: 'info', title: 'Request cancelled' });
                  }}
                >
                  Cancel Request
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Brief Overview */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="lavender" className="capitalize">
              Status: {request.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm font-semibold text-[#242331]">
              Budget: {formatCurrency(request.budgetMin)} – {formatCurrency(request.budgetMax)}
            </span>
          </div>
          <span className="text-xs text-[#6B6879]">
            Expires {formatDate(request.expiresAt)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-[#242331] whitespace-pre-wrap">
          {request.description}
        </p>

        {request.referenceImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-2">
            {request.referenceImages.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt="Reference"
                className="aspect-square rounded-xl object-cover border border-[#E9E5EF]"
              />
            ))}
          </div>
        )}
      </Card>

      {/* Proposals Comparison */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-[#242331]">
            Proposals Received ({proposals.length})
          </h2>
          <span className="text-xs text-[#6B6879]">
            Accepting one proposal atomically creates a booking and closes competing quotes.
          </span>
        </div>

        {proposals.length === 0 ? (
          <EmptyState
            title="Awaiting proposals from matched professionals"
            description="Professionals matching your category, area, and date have been notified. Check back soon or explore professionals directly."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {proposals.map((prop) => {
              const isActionable =
                canAccept && ['submitted', 'shortlisted'].includes(prop.status);
              return (
                <Card
                  key={prop.id}
                  className={
                    prop.status === 'shortlisted'
                      ? 'p-5 sm:p-6 border-[#7655D9] bg-[#F5F0FF]/35 space-y-4'
                      : 'p-5 sm:p-6 space-y-4'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/professionals/${prop.professionalId}`}
                          className="text-base font-semibold text-[#242331] hover:text-[#7655D9]"
                        >
                          {prop.professionalSnapshot.businessName ||
                            prop.professionalSnapshot.displayName}
                        </Link>
                        {prop.professionalSnapshot.isVerified && (
                          <BadgeCheck className="h-4 w-4 text-[#7655D9]" />
                        )}
                      </div>
                      <RatingDisplay
                        rating={prop.professionalSnapshot.ratingAverage}
                        reviewCount={prop.professionalSnapshot.reviewCount}
                        compact
                      />
                    </div>

                    <div className="text-right">
                      <p className="font-display text-xl font-semibold text-[#5B3EB5]">
                        {formatCurrency(prop.price, prop.currency)}
                      </p>
                      <Badge
                        tone={
                          prop.status === 'accepted'
                            ? 'mint'
                            : prop.status === 'shortlisted'
                              ? 'lavender'
                              : prop.status === 'rejected'
                                ? 'danger'
                                : 'neutral'
                        }
                        className="capitalize mt-1"
                      >
                        {prop.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-[#242331]">{prop.serviceDescription}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#E9E5EF] bg-white p-3.5 text-xs">
                    <div>
                      <p className="font-semibold text-[#176846] mb-1">Included</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[#6B6879]">
                        {prop.includedServices.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#9D2E4D] mb-1">Excluded</p>
                      {prop.excludedServices.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-0.5 text-[#6B6879]">
                          {prop.excludedServices.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[#6B6879]">No exclusions listed</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#6B6879] space-y-1">
                    <p>
                      <strong>Availability:</strong> {formatDate(prop.proposedDate)} ({prop.proposedTimeWindow}) &middot; Approx. {prop.durationMinutes} mins
                    </p>
                    {prop.additionalChargesNote && (
                      <p>
                        <strong>Additional charges note:</strong> {prop.additionalChargesNote}
                      </p>
                    )}
                    {prop.terms && (
                      <p>
                        <strong>Terms:</strong> {prop.terms}
                      </p>
                    )}
                    {prop.message && (
                      <p className="rounded-xl bg-[#FFFCF8] border border-[#E9E5EF] p-2.5 text-[#242331] mt-2">
                        &ldquo;{prop.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E9E5EF]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleChat(prop)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </Button>

                    {isActionable && (
                      <>
                        <Button
                          size="sm"
                          variant="soft"
                          loading={busyId === prop.id}
                          onClick={() =>
                            void handleProposalToggle(
                              prop,
                              prop.status === 'shortlisted' ? 'submitted' : 'shortlisted'
                            )
                          }
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          {prop.status === 'shortlisted' ? 'Remove Shortlist' : 'Shortlist'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busyId === prop.id}
                          onClick={() => void handleProposalToggle(prop, 'rejected')}
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          loading={busyId === prop.id}
                          onClick={() => void handleAccept(prop)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Accept &amp; Book
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CustomerRequestDetailPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton className="h-96" />}>
      <CustomerRequestDetailInner />
    </React.Suspense>
  );
}
