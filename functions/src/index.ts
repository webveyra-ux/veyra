import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();
const db = getFirestore();

/**
 * Keeps professionalProfiles.verificationStatus synchronized when a verification packet is submitted.
 */
export const onVerificationWritten = onDocumentWritten(
  'verificationRecords/{uid}',
  async (event) => {
    const after = event.data?.after.data();
    if (!after) return;

    const uid = event.params.uid;
    const status = String(after.status || 'not_submitted');
    await db
      .collection('professionalProfiles')
      .doc(uid)
      .set(
        {
          verificationStatus: status,
          isVerified: status === 'approved',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  }
);

/**
 * Updates professional rating summary when a review is created or moderated.
 */
export const onReviewWritten = onDocumentWritten('reviews/{reviewId}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  const professionalId = String(after?.professionalId || before?.professionalId || '');
  if (!professionalId) return;

  const snap = await db
    .collection('reviews')
    .where('professionalId', '==', professionalId)
    .where('moderationStatus', '==', 'published')
    .get();

  const reviewCount = snap.size;
  const sum = snap.docs.reduce((acc, docSnap) => acc + Number(docSnap.data().overallRating || 0), 0);
  const ratingAverage = reviewCount === 0 ? 0 : Number((sum / reviewCount).toFixed(2));

  await db
    .collection('professionalProfiles')
    .doc(professionalId)
    .set(
      {
        ratingAverage,
        reviewCount,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
});

/**
 * Updates proposal count when a new proposal is submitted directly.
 */
export const onProposalCreated = onDocumentCreated('proposals/{proposalId}', async (event) => {
  const proposal = event.data?.data();
  if (!proposal) return;

  const requestId = String(proposal.requestId || '');
  if (!requestId) return;

  const countSnap = await db
    .collection('proposals')
    .where('requestId', '==', requestId)
    .where('status', 'in', ['submitted', 'shortlisted', 'accepted'])
    .get();

  await db
    .collection('requests')
    .doc(requestId)
    .update({
      proposalsCount: countSnap.size,
      updatedAt: new Date().toISOString(),
    })
    .catch(() => undefined);
});

/**
 * Scheduled job: expires past-due open requests and pending proposals daily.
 */
export const expireStaleRequestsAndProposals = onSchedule('every 24 hours', async () => {
  const nowIso = new Date().toISOString();

  const [staleRequests, staleProposals] = await Promise.all([
    db
      .collection('requests')
      .where('status', 'in', ['open', 'matching', 'proposals_received', 'shortlisted'])
      .where('expiresAt', '<', nowIso)
      .limit(200)
      .get(),
    db
      .collection('proposals')
      .where('status', 'in', ['submitted', 'shortlisted'])
      .where('expiresAt', '<', nowIso)
      .limit(200)
      .get(),
  ]);

  const batch = db.batch();
  staleRequests.docs.forEach((d) =>
    batch.update(d.ref, { status: 'expired', updatedAt: nowIso })
  );
  staleProposals.docs.forEach((d) =>
    batch.update(d.ref, { status: 'expired', updatedAt: nowIso })
  );

  if (!staleRequests.empty || !staleProposals.empty) {
    await batch.commit();
  }
});
