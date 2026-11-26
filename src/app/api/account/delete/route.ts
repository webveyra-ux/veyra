import { z } from 'zod';
import {
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  HttpError,
  toErrorResponse,
  verifyRequestAuth,
} from '@/lib/firebase/admin';
import { writeServerAuditLog } from '@/services/server/marketplace';

const deleteSchema = z.object({
  confirmationPhrase: z.literal('DELETE MY VEYRA ACCOUNT'),
});

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request, { requireActiveAccount: false });
    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, 'Confirmation phrase must match "DELETE MY VEYRA ACCOUNT".');
    }

    // Require recent authentication within 15 minutes
    const authTimeSec = Number(authCtx.token.auth_time || 0);
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - authTimeSec > 900) {
      throw new HttpError(
        403,
        'Recent sign-in required for account deletion. Please sign in again to confirm.'
      );
    }

    const uid = authCtx.uid;
    const db = getAdminDb();
    const now = new Date().toISOString();

    // 1. Delete user-owned private/profile documents
    const batch = db.batch();
    batch.delete(db.collection('customerProfiles').doc(uid));
    batch.delete(db.collection('professionalProfiles').doc(uid));
    batch.delete(db.collection('availability').doc(uid));
    batch.delete(db.collection('verificationRecords').doc(uid));
    batch.delete(db.collection('users').doc(uid));

    const [addressesSnap, shortlistsSnap, notificationsSnap, draftRequestsSnap] = await Promise.all([
      db.collection('addresses').where('userId', '==', uid).get(),
      db.collection('shortlists').where('customerId', '==', uid).get(),
      db.collection('notifications').where('userId', '==', uid).get(),
      db.collection('requests').where('customerId', '==', uid).where('status', 'in', ['draft', 'open', 'matching']).get(),
    ]);

    addressesSnap.docs.forEach((d) => batch.delete(d.ref));
    shortlistsSnap.docs.forEach((d) => batch.delete(d.ref));
    notificationsSnap.docs.forEach((d) => batch.delete(d.ref));

    for (const reqDoc of draftRequestsSnap.docs) {
      batch.update(reqDoc.ref, {
        status: 'cancelled',
        customerName: 'Deleted User',
        description: '[Removed upon account deletion]',
        referenceImages: [],
        updatedAt: now,
      });
      batch.delete(reqDoc.ref.collection('privateDetails').doc('contact'));
    }

    // 2. Anonymise historical bookings & reviews retained for record integrity
    const [custBookingsSnap, proBookingsSnap, custReviewsSnap] = await Promise.all([
      db.collection('bookings').where('customerId', '==', uid).get(),
      db.collection('bookings').where('professionalId', '==', uid).get(),
      db.collection('reviews').where('customerId', '==', uid).get(),
    ]);

    custBookingsSnap.docs.forEach((d) =>
      batch.update(d.ref, { customerName: 'Deleted User', updatedAt: now })
    );
    proBookingsSnap.docs.forEach((d) =>
      batch.update(d.ref, {
        professionalName: 'Former Professional',
        professionalBusinessName: 'Former Professional',
        updatedAt: now,
      })
    );
    custReviewsSnap.docs.forEach((d) =>
      batch.update(d.ref, { customerName: 'Deleted User', updatedAt: now })
    );

    await batch.commit();

    // 3. Scrub private & profile Storage prefixes (best effort if storage bucket configured)
    try {
      const bucket = getAdminStorage().bucket();
      await Promise.all([
        bucket.deleteFiles({ prefix: `users/${uid}/` }).catch(() => undefined),
        bucket.deleteFiles({ prefix: `professionals/${uid}/` }).catch(() => undefined),
        bucket.deleteFiles({ prefix: `verification/${uid}/` }).catch(() => undefined),
      ]);
    } catch {
      // Storage bucket may not be configured in local dev
    }

    await writeServerAuditLog(db, {
      action: 'account_deleted_and_anonymized',
      adminId: uid,
      adminEmail: 'self-service',
      affectedEntity: 'user',
      affectedEntityId: uid,
      details:
        'User profile, verification documents, addresses, shortlists, and notifications deleted; historical bookings/reviews anonymised per retention policy.',
    });

    // 4. Delete Firebase Auth user record
    await getAdminAuth().deleteUser(uid);

    return Response.json({
      ok: true,
      message: 'Your account and personal records have been deleted or anonymised.',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
