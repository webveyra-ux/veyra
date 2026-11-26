import type { Firestore } from 'firebase-admin/firestore';
import { evaluateMatchingCandidates } from '@/features/matching/engine';
import { HttpError } from '@/lib/firebase/admin';
import type {
  AppNotification,
  AvailabilitySchedule,
  Booking,
  Conversation,
  ProfessionalProfile,
  Proposal,
  Review,
  ServiceRequest,
  StoredImageAsset,
  UserRole,
} from '@/types/domain';

export async function createServerNotification(
  db: Firestore,
  input: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  const ref = db.collection('notifications').doc();
  const payload: AppNotification = {
    ...input,
    id: ref.id,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await ref.set(payload);
}

export async function writeServerAuditLog(
  db: Firestore,
  entry: {
    action: string;
    adminId: string;
    adminEmail: string;
    affectedEntity: string;
    affectedEntityId: string;
    beforeSummary?: string;
    afterSummary?: string;
    details: string;
  }
): Promise<void> {
  const ref = db.collection('auditLogs').doc();
  await ref.set({
    id: ref.id,
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

export async function distributeRequestMatchesServer(
  db: Firestore,
  requestId: string,
  actorUid: string
): Promise<{ matchedCount: number; notificationCount: number }> {
  const reqRef = db.collection('requests').doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) {
    throw new HttpError(404, 'Service request not found.');
  }

  const serviceRequest = reqSnap.data() as ServiceRequest;
  if (serviceRequest.customerId !== actorUid) {
    throw new HttpError(403, 'You do not own this request.');
  }

  if (!['open', 'matching', 'proposals_received', 'shortlisted'].includes(serviceRequest.status)) {
    throw new HttpError(400, 'This request is not open for professional matching.');
  }

  // Indexed category-scoped candidate query (avoids scanning the entire database)
  const prosSnap = await db
    .collection('professionalProfiles')
    .where('profileStatus', '==', 'active')
    .where('categories', 'array-contains', serviceRequest.categorySlug)
    .limit(100)
    .get();

  const pros = prosSnap.docs.map((d) => d.data() as ProfessionalProfile);
  const availabilities = await Promise.all(
    pros.map(async (p) => {
      const snap = await db.collection('availability').doc(p.uid).get();
      return snap.exists ? (snap.data() as AvailabilitySchedule) : undefined;
    })
  );

  const candidates = pros.map((professional, idx) => ({
    professional,
    availability: availabilities[idx],
  }));

  const matches = evaluateMatchingCandidates(serviceRequest, candidates, {
    maxMatches: 25,
  });

  const now = new Date().toISOString();
  const batch = db.batch();

  for (const { match } of matches) {
    const matchRef = db.collection('requestMatches').doc(match.id);
    batch.set(
      matchRef,
      {
        ...match,
        notificationStatus: 'sent',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    const recipientRef = db.collection('requestRecipients').doc(match.id);
    batch.set(
      recipientRef,
      {
        id: match.id,
        requestId,
        customerId: serviceRequest.customerId,
        professionalId: match.professionalId,
        status: 'sent',
        createdAt: now,
      },
      { merge: true }
    );
  }

  batch.update(reqRef, {
    status: matches.length > 0 ? 'matching' : 'open',
    updatedAt: now,
  });

  await batch.commit();

  // Notify matched professionals + customer
  await Promise.all([
    ...matches.map(({ match }) =>
      createServerNotification(db, {
        userId: match.professionalId,
        type: 'new_request',
        title: `New ${serviceRequest.categoryName} request in ${serviceRequest.location.city}`,
        message: `${serviceRequest.title} (${match.matchScore}% match score based on your profile & area).`,
        relatedEntityId: requestId,
        relatedEntityType: 'request',
        actionUrl: `/professional/requests/${requestId}`,
      })
    ),
    createServerNotification(db, {
      userId: serviceRequest.customerId,
      type: matches.length > 0 ? 'request_matched' : 'request_created',
      title:
        matches.length > 0
          ? `Matched with ${matches.length} professional${matches.length === 1 ? '' : 's'}`
          : 'Your request is live on VEYRA',
      message:
        matches.length > 0
          ? `We notified ${matches.length} matching professionals for "${serviceRequest.title}".`
          : `Your request "${serviceRequest.title}" is published and visible to relevant professionals.`,
      relatedEntityId: requestId,
      relatedEntityType: 'request',
      actionUrl: `/customer/requests/${requestId}`,
    }),
  ]);

  return {
    matchedCount: matches.length,
    notificationCount: matches.length,
  };
}

export async function acceptProposalServer(
  db: Firestore,
  proposalId: string,
  customerUid: string
): Promise<{ booking: Booking }> {
  const proposalRef = db.collection('proposals').doc(proposalId);
  const bookingRef = db.collection('bookings').doc();
  const now = new Date().toISOString();

  let resultBooking: Booking | null = null;
  let rejectedPros: Array<{ professionalId: string; proposalId: string }> = [];
  let requestTitle = '';

  await db.runTransaction(async (tx) => {
    const proposalSnap = await tx.get(proposalRef);
    if (!proposalSnap.exists) {
      throw new HttpError(404, 'Proposal not found.');
    }
    const proposal = proposalSnap.data() as Proposal;

    if (proposal.customerId !== customerUid) {
      throw new HttpError(403, 'You are not authorised to accept this proposal.');
    }

    if (!['submitted', 'shortlisted'].includes(proposal.status)) {
      throw new HttpError(400, `Cannot accept a proposal with status "${proposal.status}".`);
    }

    if (proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now()) {
      throw new HttpError(400, 'This proposal has expired. Ask the professional for a refreshed quote.');
    }

    const requestRef = db.collection('requests').doc(proposal.requestId);
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) {
      throw new HttpError(404, 'Associated service request not found.');
    }
    const serviceRequest = requestSnap.data() as ServiceRequest;
    requestTitle = serviceRequest.title;

    if (serviceRequest.customerId !== customerUid) {
      throw new HttpError(403, 'You do not own the associated request.');
    }

    if (serviceRequest.bookingId || serviceRequest.acceptedProposalId) {
      throw new HttpError(409, 'A booking has already been created for this request.');
    }

    if (!['open', 'matching', 'proposals_received', 'shortlisted'].includes(serviceRequest.status)) {
      throw new HttpError(400, `Request status "${serviceRequest.status}" cannot be booked.`);
    }

    const proRef = db.collection('professionalProfiles').doc(proposal.professionalId);
    const proSnap = await tx.get(proRef);
    if (!proSnap.exists) {
      throw new HttpError(404, 'Professional profile no longer exists.');
    }
    const pro = proSnap.data() as ProfessionalProfile;
    if (pro.profileStatus === 'suspended') {
      throw new HttpError(403, 'This professional account is currently suspended.');
    }

    const otherProposalsSnap = await tx.get(
      db
        .collection('proposals')
        .where('requestId', '==', proposal.requestId)
        .where('status', 'in', ['submitted', 'shortlisted'])
    );

    const booking: Booking = {
      id: bookingRef.id,
      requestId: serviceRequest.id,
      proposalId: proposal.id,
      customerId: customerUid,
      professionalId: proposal.professionalId,
      customerName: serviceRequest.customerName,
      professionalName: pro.displayName,
      professionalBusinessName: pro.businessName || pro.displayName,
      categorySlug: serviceRequest.categorySlug,
      serviceName: serviceRequest.serviceName || serviceRequest.title,
      agreedPrice: proposal.price,
      currency: proposal.currency || serviceRequest.currency || 'INR',
      paymentStatus: 'offline_agreed',
      scheduledDate: proposal.proposedDate || serviceRequest.desiredDate,
      scheduledTime: proposal.proposedTimeWindow || serviceRequest.timePreference,
      durationMinutes: proposal.durationMinutes,
      location: {
        city: serviceRequest.location.city,
        locality: serviceRequest.location.locality,
      },
      serviceMode: serviceRequest.serviceMode,
      status: 'confirmed',
      cancellation: null,
      reschedule: null,
      hasReview: false,
      reviewId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(bookingRef, booking);
    tx.update(proposalRef, { status: 'accepted', updatedAt: now });
    tx.update(requestRef, {
      status: 'booked',
      acceptedProposalId: proposal.id,
      bookingId: booking.id,
      updatedAt: now,
    });

    rejectedPros = [];
    for (const docSnap of otherProposalsSnap.docs) {
      if (docSnap.id !== proposal.id) {
        const other = docSnap.data() as Proposal;
        tx.update(docSnap.ref, { status: 'rejected', updatedAt: now });
        rejectedPros.push({ professionalId: other.professionalId, proposalId: other.id });
      }
    }

    resultBooking = booking;
  });

  if (!resultBooking) {
    throw new HttpError(500, 'Booking transaction did not complete.');
  }

  const booking = resultBooking as Booking;

  // Create or link booking conversation
  const convId = [booking.customerId, booking.professionalId].sort().join('_') + `_req_${booking.requestId}`;
  const convRef = db.collection('conversations').doc(convId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    const conv: Conversation = {
      id: convId,
      type: 'booking',
      participantIds: [booking.customerId, booking.professionalId],
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      participantMeta: {
        [booking.customerId]: { displayName: booking.customerName, photoURL: null, role: 'customer' },
        [booking.professionalId]: {
          displayName: booking.professionalName,
          photoURL: null,
          role: 'professional',
        },
      },
      requestId: booking.requestId,
      proposalId: booking.proposalId,
      bookingId: booking.id,
      subjectTitle: requestTitle || booking.serviceName,
      lastMessageText: 'Booking confirmed on VEYRA.',
      lastMessageAt: now,
      lastMessageSenderId: null,
      unreadCountByUser: { [booking.customerId]: 0, [booking.professionalId]: 1 },
      blockedBy: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await convRef.set(conv);
  } else {
    await convRef.update({
      type: 'booking',
      bookingId: booking.id,
      updatedAt: now,
    });
  }

  await Promise.all([
    createServerNotification(db, {
      userId: booking.customerId,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      message: `Your booking with ${booking.professionalName} for ${booking.serviceName} is confirmed.`,
      relatedEntityId: booking.id,
      relatedEntityType: 'booking',
      actionUrl: `/customer/bookings/${booking.id}`,
    }),
    createServerNotification(db, {
      userId: booking.professionalId,
      type: 'proposal_accepted',
      title: 'Your proposal was accepted!',
      message: `${booking.customerName} accepted your proposal for ${booking.serviceName} on ${booking.scheduledDate}.`,
      relatedEntityId: booking.id,
      relatedEntityType: 'booking',
      actionUrl: `/professional/bookings/${booking.id}`,
    }),
    ...rejectedPros.map((rp) =>
      createServerNotification(db, {
        userId: rp.professionalId,
        type: 'proposal_rejected',
        title: 'Request fulfilled',
        message: `Another proposal was selected for "${requestTitle}".`,
        relatedEntityId: booking.requestId,
        relatedEntityType: 'request',
        actionUrl: `/professional/proposals`,
      })
    ),
    writeServerAuditLog(db, {
      action: 'booking_created_from_proposal',
      adminId: customerUid,
      adminEmail: 'customer-action',
      affectedEntity: 'booking',
      affectedEntityId: booking.id,
      afterSummary: `Confirmed booking for request ${booking.requestId} at ${booking.currency} ${booking.agreedPrice}`,
      details: `Proposal ${booking.proposalId} accepted atomically.`,
    }),
  ]);

  return { booking };
}

export async function transitionBookingServer(
  db: Firestore,
  bookingId: string,
  actorUid: string,
  actorRole: UserRole,
  payload:
    | { action: 'start_service' }
    | { action: 'complete_service' }
    | { action: 'cancel'; reason: string }
    | { action: 'request_reschedule'; proposedDate: string; proposedTime: string; reason: string }
    | { action: 'respond_reschedule'; decision: 'approve' | 'decline' }
    | { action: 'report_no_show'; reason: string }
): Promise<{ booking: Booking }> {
  const bookingRef = db.collection('bookings').doc(bookingId);
  const now = new Date().toISOString();
  let updatedBooking: Booking | null = null;
  let notifyUserId = '';
  let notifyTitle = '';
  let notifyMessage = '';
  let notifyType: AppNotification['type'] = 'booking_confirmed';

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists) throw new HttpError(404, 'Booking not found.');
    const booking = snap.data() as Booking;

    const isCustomer = booking.customerId === actorUid;
    const isPro = booking.professionalId === actorUid;
    if (!isCustomer && !isPro && actorRole !== 'admin') {
      throw new HttpError(403, 'You are not a participant of this booking.');
    }

    const participantRole: UserRole = isPro ? 'professional' : isCustomer ? 'customer' : 'admin';
    notifyUserId = isPro ? booking.customerId : booking.professionalId;
    const requestRef = db.collection('requests').doc(booking.requestId);

    switch (payload.action) {
      case 'start_service': {
        if (!isPro && actorRole !== 'admin') {
          throw new HttpError(403, 'Only the professional can mark service in progress.');
        }
        if (booking.status !== 'confirmed') {
          throw new HttpError(400, 'Only confirmed bookings can be started.');
        }
        updatedBooking = { ...booking, status: 'in_progress', updatedAt: now };
        tx.update(bookingRef, { status: 'in_progress', updatedAt: now });
        notifyTitle = 'Service started';
        notifyMessage = `${booking.professionalName} marked "${booking.serviceName}" as in progress.`;
        notifyType = 'booking_confirmed';
        break;
      }

      case 'complete_service': {
        if (!['confirmed', 'in_progress'].includes(booking.status)) {
          throw new HttpError(400, 'Only confirmed or in-progress bookings can be completed.');
        }
        const proRef = db.collection('professionalProfiles').doc(booking.professionalId);
        const proSnap = await tx.get(proRef);
        const currentCompleted = proSnap.exists
          ? ((proSnap.data() as ProfessionalProfile).completedBookingsCount ?? 0)
          : 0;

        updatedBooking = {
          ...booking,
          status: 'completed',
          completedAt: now,
          updatedAt: now,
        };
        tx.update(bookingRef, { status: 'completed', completedAt: now, updatedAt: now });
        tx.update(requestRef, { status: 'completed', updatedAt: now });
        if (proSnap.exists) {
          tx.update(proRef, { completedBookingsCount: currentCompleted + 1, updatedAt: now });
        }

        notifyUserId = booking.customerId;
        notifyTitle = 'Service completed — leave a review';
        notifyMessage = `${booking.serviceName} has been marked completed. You can now submit your verified review.`;
        notifyType = 'booking_completed';
        break;
      }

      case 'cancel': {
        if (!['confirmed', 'reschedule_requested', 'in_progress'].includes(booking.status)) {
          throw new HttpError(400, 'This booking can no longer be cancelled.');
        }
        const cancellation = {
          cancelledBy: actorUid,
          role: participantRole,
          reason: payload.reason.trim(),
          cancelledAt: now,
        };
        updatedBooking = {
          ...booking,
          status: 'cancelled',
          cancellation,
          updatedAt: now,
        };
        tx.update(bookingRef, { status: 'cancelled', cancellation, updatedAt: now });
        tx.update(requestRef, { status: 'cancelled', updatedAt: now });
        notifyTitle = 'Booking cancelled';
        notifyMessage = `Booking for ${booking.serviceName} was cancelled. Reason: ${cancellation.reason}`;
        notifyType = 'booking_cancelled';
        break;
      }

      case 'request_reschedule': {
        if (booking.status !== 'confirmed') {
          throw new HttpError(400, 'Only confirmed bookings can be rescheduled.');
        }
        const reschedule = {
          requestedBy: actorUid,
          proposedDate: payload.proposedDate,
          proposedTime: payload.proposedTime,
          reason: payload.reason.trim(),
          status: 'pending' as const,
          requestedAt: now,
        };
        updatedBooking = {
          ...booking,
          status: 'reschedule_requested',
          reschedule,
          updatedAt: now,
        };
        tx.update(bookingRef, {
          status: 'reschedule_requested',
          reschedule,
          updatedAt: now,
        });
        notifyTitle = 'Reschedule requested';
        notifyMessage = `A new time was proposed (${payload.proposedDate}, ${payload.proposedTime}).`;
        notifyType = 'reschedule_requested';
        break;
      }

      case 'respond_reschedule': {
        if (booking.status !== 'reschedule_requested' || !booking.reschedule) {
          throw new HttpError(400, 'No pending reschedule request exists.');
        }
        if (booking.reschedule.requestedBy === actorUid && actorRole !== 'admin') {
          throw new HttpError(403, 'The other booking participant must respond to this reschedule request.');
        }
        const approved = payload.decision === 'approve';
        const nextReschedule = {
          ...booking.reschedule,
          status: approved ? ('approved' as const) : ('declined' as const),
        };
        const nextDate = approved ? booking.reschedule.proposedDate : booking.scheduledDate;
        const nextTime = approved ? booking.reschedule.proposedTime : booking.scheduledTime;

        updatedBooking = {
          ...booking,
          status: 'confirmed',
          scheduledDate: nextDate,
          scheduledTime: nextTime,
          reschedule: nextReschedule,
          updatedAt: now,
        };
        tx.update(bookingRef, {
          status: 'confirmed',
          scheduledDate: nextDate,
          scheduledTime: nextTime,
          reschedule: nextReschedule,
          updatedAt: now,
        });
        notifyTitle = approved ? 'Reschedule approved' : 'Reschedule declined';
        notifyMessage = approved
          ? `Booking moved to ${nextDate} (${nextTime}).`
          : `Original booking schedule (${nextDate}) remains active.`;
        notifyType = 'booking_rescheduled';
        break;
      }

      case 'report_no_show': {
        if (!['confirmed', 'in_progress'].includes(booking.status)) {
          throw new HttpError(400, 'No-show can only be reported on active bookings.');
        }
        updatedBooking = {
          ...booking,
          status: 'no_show',
          cancellation: {
            cancelledBy: actorUid,
            role: participantRole,
            reason: `No-show reported: ${payload.reason.trim()}`,
            cancelledAt: now,
          },
          updatedAt: now,
        };
        tx.update(bookingRef, {
          status: 'no_show',
          cancellation: updatedBooking.cancellation,
          updatedAt: now,
        });
        notifyTitle = 'No-show recorded';
        notifyMessage = `A no-show report was logged for ${booking.serviceName}.`;
        notifyType = 'booking_cancelled';
        break;
      }
    }
  });

  if (!updatedBooking) {
    throw new HttpError(500, 'Unable to update booking status.');
  }

  const finalBooking = updatedBooking as Booking;
  if (notifyUserId) {
    const targetPrefix = notifyUserId === finalBooking.customerId ? '/customer' : '/professional';
    await createServerNotification(db, {
      userId: notifyUserId,
      type: notifyType,
      title: notifyTitle,
      message: notifyMessage,
      relatedEntityId: finalBooking.id,
      relatedEntityType: 'booking',
      actionUrl: `${targetPrefix}/bookings/${finalBooking.id}`,
    });
  }

  return { booking: finalBooking };
}

export async function recomputeProfessionalRating(
  db: Firestore,
  professionalId: string
): Promise<{ ratingAverage: number; reviewCount: number }> {
  const snap = await db
    .collection('reviews')
    .where('professionalId', '==', professionalId)
    .where('moderationStatus', '==', 'published')
    .get();

  const reviews = snap.docs.map((d) => d.data() as Review);
  const reviewCount = reviews.length;
  const ratingAverage =
    reviewCount === 0
      ? 0
      : Number(
          (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviewCount).toFixed(2)
        );

  await db
    .collection('professionalProfiles')
    .doc(professionalId)
    .update({
      ratingAverage,
      reviewCount,
      updatedAt: new Date().toISOString(),
    })
    .catch(() => undefined);

  return { ratingAverage, reviewCount };
}

export async function submitReviewServer(
  db: Firestore,
  customerUid: string,
  input: {
    bookingId: string;
    overallRating: number;
    serviceQuality: number;
    professionalism: number;
    communication: number;
    punctuality: number;
    comment: string;
    images?: StoredImageAsset[];
  }
): Promise<{ review: Review }> {
  const reviewId = `booking_${input.bookingId}`;
  const reviewRef = db.collection('reviews').doc(reviewId);
  const bookingRef = db.collection('bookings').doc(input.bookingId);
  const now = new Date().toISOString();
  let createdReview: Review | null = null;

  await db.runTransaction(async (tx) => {
    const [bookingSnap, existingReviewSnap] = await Promise.all([
      tx.get(bookingRef),
      tx.get(reviewRef),
    ]);

    if (!bookingSnap.exists) {
      throw new HttpError(404, 'Booking not found.');
    }
    const booking = bookingSnap.data() as Booking;

    if (booking.customerId !== customerUid) {
      throw new HttpError(403, 'Only the booking customer can submit a review.');
    }
    if (booking.status !== 'completed') {
      throw new HttpError(400, 'Reviews can only be submitted after the booking is completed.');
    }
    if (booking.hasReview || existingReviewSnap.exists) {
      throw new HttpError(409, 'A review has already been submitted for this booking.');
    }

    const review: Review = {
      id: reviewId,
      bookingId: booking.id,
      customerId: customerUid,
      customerName: booking.customerName,
      professionalId: booking.professionalId,
      overallRating: input.overallRating,
      serviceQuality: input.serviceQuality,
      professionalism: input.professionalism,
      communication: input.communication,
      punctuality: input.punctuality,
      comment: input.comment.trim(),
      images: input.images ?? [],
      professionalResponse: null,
      moderationStatus: 'published',
      moderationReason: null,
      createdAt: now,
      updatedAt: now,
    };

    tx.set(reviewRef, review);
    tx.update(bookingRef, {
      hasReview: true,
      reviewId,
      updatedAt: now,
    });
    createdReview = review;
  });

  if (!createdReview) {
    throw new HttpError(500, 'Failed to save review.');
  }

  const finalReview = createdReview as Review;
  await recomputeProfessionalRating(db, finalReview.professionalId);
  await createServerNotification(db, {
    userId: finalReview.professionalId,
    type: 'review_received',
    title: `New ${finalReview.overallRating}-star review received`,
    message: `${finalReview.customerName} left feedback on your recent booking.`,
    relatedEntityId: finalReview.bookingId,
    relatedEntityType: 'review',
    actionUrl: `/professional/bookings/${finalReview.bookingId}`,
  });

  return { review: finalReview };
}
