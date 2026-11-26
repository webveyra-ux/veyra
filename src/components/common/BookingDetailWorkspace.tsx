'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  MapPin,
  MessageSquare,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { ReportModal } from '@/components/common/ReportModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StarRatingInput } from '@/components/ui/RatingStars';
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBookingById, transitionBookingStatus } from '@/services/bookings.service';
import { getOrCreateConversation } from '@/services/conversations.service';
import { getRequestPrivateDetails } from '@/services/requests.service';
import { replyToReview, submitBookingReview } from '@/services/reviews.service';
import type { Booking, RequestPrivateDetails } from '@/types/domain';

export function BookingDetailWorkspace({
  bookingId,
  viewerRole,
}: {
  bookingId: string;
  viewerRole: 'customer' | 'professional';
}) {
  const router = useRouter();
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();

  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [privateDetails, setPrivateDetails] = React.useState<RequestPrivateDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);

  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false);
  const [proposedDate, setProposedDate] = React.useState('');
  const [proposedTime, setProposedTime] = React.useState('');
  const [rescheduleReason, setRescheduleReason] = React.useState('');
  const [reportOpen, setReportOpen] = React.useState(false);

  // Review state (customer only when completed)
  const [overallRating, setOverallRating] = React.useState(5);
  const [serviceQuality, setServiceQuality] = React.useState(5);
  const [professionalism, setProfessionalism] = React.useState(5);
  const [communication, setCommunication] = React.useState(5);
  const [punctuality, setPunctuality] = React.useState(5);
  const [reviewComment, setReviewComment] = React.useState('');
  const [submittingReview, setSubmittingReview] = React.useState(false);

  // Professional response to review
  const [replyText, setReplyText] = React.useState('');

  const loadBooking = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookingById(bookingId);
      setBooking(data);
      if (data) {
        const priv = await getRequestPrivateDetails(data.requestId).catch(() => null);
        setPrivateDetails(priv);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load booking.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  React.useEffect(() => {
    let active = true;
    void getBookingById(bookingId)
      .then(async (data) => {
        if (!active) return;
        setBooking(data);
        if (data) {
          const priv = await getRequestPrivateDetails(data.requestId).catch(() => null);
          if (active) setPrivateDetails(priv);
        }
        if (active) setError(null);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load booking.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  async function runTransition(
    payload: Parameters<typeof transitionBookingStatus>[1],
    successMessage: string
  ) {
    setActionBusy(true);
    try {
      const res = await transitionBookingStatus(bookingId, payload);
      setBooking(res.booking);
      notify({ tone: 'success', title: successMessage });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Action could not be completed',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleOpenChat() {
    if (!booking || !firebaseUser || !userRecord) return;
    const conv = await getOrCreateConversation({
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      customerMeta: { displayName: booking.customerName, photoURL: null, role: 'customer' },
      professionalMeta: {
        displayName: booking.professionalBusinessName || booking.professionalName,
        photoURL: null,
        role: 'professional',
      },
      type: 'booking',
      subjectTitle: booking.serviceName,
      requestId: booking.requestId,
      proposalId: booking.proposalId,
      bookingId: booking.id,
    });
    const base = viewerRole === 'professional' ? '/professional/messages' : '/customer/messages';
    router.push(`${base}?conversationId=${conv.id}`);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    setSubmittingReview(true);
    try {
      await submitBookingReview({
        bookingId: booking.id,
        overallRating,
        serviceQuality,
        professionalism,
        communication,
        punctuality,
        comment: reviewComment,
      });
      notify({ tone: 'success', title: 'Thank you! Your booking review is published.' });
      await loadBooking();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Review failed',
        description: err instanceof Error ? err.message : 'Please check your review.',
      });
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleReplyReview(e: React.FormEvent) {
    e.preventDefault();
    if (!booking?.reviewId || !replyText.trim()) return;
    setActionBusy(true);
    try {
      await replyToReview(booking.reviewId, replyText);
      notify({ tone: 'success', title: 'Response added to review.' });
      setReplyText('');
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Unable to post response',
        description: err instanceof Error ? err.message : 'Please retry.',
      });
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return <LoadingSkeleton className="h-80" />;
  if (error) return <ErrorState message={error} onRetry={loadBooking} />;
  if (!booking) {
    return (
      <EmptyState
        title="Booking not found"
        description="This booking could not be located or you do not have permission to view it."
      />
    );
  }

  const canModify = ['confirmed', 'reschedule_requested', 'in_progress'].includes(booking.status);
  const pendingRescheduleForMe =
    booking.status === 'reschedule_requested' &&
    booking.reschedule?.status === 'pending' &&
    booking.reschedule.requestedBy !== firebaseUser?.uid;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Booking Record"
        title={booking.serviceName}
        description={`Booking ID: ${booking.id} • Scheduled for ${formatDate(booking.scheduledDate)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" size="sm" onClick={handleOpenChat}>
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="h-4 w-4" />
              Report
            </Button>
          </div>
        }
      />

      {pendingRescheduleForMe && booking.reschedule && (
        <Card className="border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-semibold text-[#242331]">
              Reschedule Requested: {formatDate(booking.reschedule.proposedDate)} at{' '}
              {booking.reschedule.proposedTime}
            </p>
            <p className="text-xs text-[#6B6879] mt-1">Reason: {booking.reschedule.reason}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={actionBusy}
              onClick={() =>
                void runTransition(
                  { action: 'respond_reschedule', decision: 'approve' },
                  'Reschedule approved'
                )
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={actionBusy}
              onClick={() =>
                void runTransition(
                  { action: 'respond_reschedule', decision: 'decline' },
                  'Reschedule declined'
                )
              }
            >
              Decline
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E9E5EF] pb-3">
            <span className="text-sm font-semibold text-[#242331]">Booking Details</span>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#6B6879]">Customer</p>
              <p className="font-semibold text-[#242331]">{booking.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B6879]">Professional</p>
              <p className="font-semibold text-[#242331]">
                {booking.professionalBusinessName || booking.professionalName}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B6879] inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#7655D9]" />
                Date &amp; Time
              </p>
              <p className="font-medium text-[#242331]">
                {formatDate(booking.scheduledDate)} &middot; {booking.scheduledTime}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B6879] inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#7655D9]" />
                Duration &amp; Mode
              </p>
              <p className="font-medium text-[#242331]">
                {booking.durationMinutes} mins &middot; {SERVICE_MODE_LABELS[booking.serviceMode]}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-[#6B6879] inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#7655D9]" />
                Location
              </p>
              <p className="font-medium text-[#242331]">
                {booking.location.locality}, {booking.location.city}
              </p>
              {privateDetails?.exactAddress && (
                <p className="mt-1 rounded-xl bg-[#F5F0FF] px-3 py-2 text-xs text-[#5B3EB5]">
                  Protected Venue Address (released on confirmed booking):{' '}
                  <strong>{privateDetails.exactAddress}</strong>
                  {privateDetails.contactPhone ? ` • Phone: ${privateDetails.contactPhone}` : ''}
                </p>
              )}
            </div>
          </div>

          {booking.cancellation && (
            <div className="rounded-xl border border-rose-200 bg-[#FFF0F3] p-3 text-xs text-rose-800">
              <strong>Recorded cancellation / no-show:</strong> {booking.cancellation.reason}
            </div>
          )}

          {canModify && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E9E5EF]">
              {viewerRole === 'professional' && booking.status === 'confirmed' && (
                <Button
                  size="sm"
                  variant="soft"
                  loading={actionBusy}
                  onClick={() =>
                    void runTransition({ action: 'start_service' }, 'Service marked in progress')
                  }
                >
                  Start Service
                </Button>
              )}
              {['confirmed', 'in_progress'].includes(booking.status) && (
                <Button
                  size="sm"
                  loading={actionBusy}
                  onClick={() =>
                    void runTransition(
                      { action: 'complete_service' },
                      'Booking marked completed'
                    )
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </Button>
              )}
              {booking.status === 'confirmed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setProposedDate(booking.scheduledDate);
                    setProposedTime(booking.scheduledTime);
                    setRescheduleModalOpen(true);
                  }}
                >
                  Request Reschedule
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle className="h-4 w-4 text-rose-600" />
                Cancel Booking
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#242331]">Agreed Pricing &amp; Policy</h3>
          <div>
            <p className="text-xs text-[#6B6879]">Agreed Proposal Value</p>
            <p className="font-display text-2xl font-semibold text-[#242331]">
              {formatCurrency(booking.agreedPrice, booking.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-[#EDE5FF] bg-[#F5F0FF] p-3 text-xs text-[#5B3EB5] space-y-1">
            <p className="font-semibold inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Direct Offline Settlement
            </p>
            <p>
              VEYRA records this agreed price for transparency. Online payments are not enabled in this initial launch; settle directly as agreed in the proposal.
            </p>
          </div>
          <p className="text-xs text-[#6B6879]">
            Review our{' '}
            <Link href="/legal/cancellation" className="text-[#5B3EB5] underline">
              Cancellation &amp; Rescheduling Policy
            </Link>
            .
          </p>
        </Card>
      </div>

      {/* Customer Review Submission (eligible completed booking only) */}
      {viewerRole === 'customer' && booking.status === 'completed' && !booking.hasReview && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#242331]">
            Rate &amp; Review Your Completed Booking
          </h2>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              <StarRatingInput label="Overall Rating" value={overallRating} onChange={setOverallRating} />
              <StarRatingInput label="Service Quality" value={serviceQuality} onChange={setServiceQuality} />
              <StarRatingInput label="Professionalism" value={professionalism} onChange={setProfessionalism} />
              <StarRatingInput label="Communication" value={communication} onChange={setCommunication} />
              <StarRatingInput label="Punctuality" value={punctuality} onChange={setPunctuality} />
            </div>
            <Textarea
              label="Written Review"
              placeholder="Share honest details about the work, preparation, and overall experience..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required
            />
            <Button type="submit" loading={submittingReview}>
              Publish Verified Review
            </Button>
          </form>
        </Card>
      )}

      {booking.hasReview && (
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold text-[#242331]">
            Verified review submitted for this booking
          </p>
          {viewerRole === 'professional' && booking.reviewId && (
            <form onSubmit={handleReplyReview} className="space-y-3 pt-2">
              <Textarea
                label="Respond to Customer Review (one-time response)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank your customer or share a polite follow-up note..."
                rows={3}
              />
              <Button type="submit" size="sm" loading={actionBusy}>
                Post Professional Response
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* Cancel Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel this booking"
        description="Please record a clear cancellation reason. Both parties will be notified immediately."
      >
        <div className="space-y-4">
          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Explain why you need to cancel..."
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              loading={actionBusy}
              onClick={async () => {
                if (cancelReason.trim().length < 4) return;
                await runTransition({ action: 'cancel', reason: cancelReason }, 'Booking cancelled');
                setCancelModalOpen(false);
              }}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Request Reschedule"
        description="Propose an alternate date and time window for confirmation."
      >
        <div className="space-y-4">
          <Input
            label="Proposed Date"
            type="date"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            required
          />
          <Input
            label="Proposed Time Window"
            placeholder="e.g., 10:30 AM"
            value={proposedTime}
            onChange={(e) => setProposedTime(e.target.value)}
            required
          />
          <Textarea
            label="Reason"
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            placeholder="Briefly explain why you are requesting a reschedule..."
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={actionBusy}
              onClick={async () => {
                if (!proposedDate || !proposedTime || rescheduleReason.trim().length < 4) return;
                await runTransition(
                  {
                    action: 'request_reschedule',
                    proposedDate,
                    proposedTime,
                    reason: rescheduleReason,
                  },
                  'Reschedule request sent'
                );
                setRescheduleModalOpen(false);
              }}
            >
              Send Reschedule Request
            </Button>
          </div>
        </div>
      </Modal>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="booking"
        targetId={booking.id}
        targetLabel="booking"
      />
    </div>
  );
}
