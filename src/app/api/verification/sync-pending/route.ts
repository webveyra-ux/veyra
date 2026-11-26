import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import type { VerificationRecord } from '@/types/domain';

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const db = getAdminDb();

    const verifSnap = await db.collection('verificationRecords').doc(authCtx.uid).get();
    if (!verifSnap.exists) {
      throw new HttpError(404, 'Verification submission not found.');
    }

    const verif = verifSnap.data() as VerificationRecord;
    if (verif.status !== 'pending') {
      throw new HttpError(400, 'Verification packet is not in pending state.');
    }

    await db.collection('professionalProfiles').doc(authCtx.uid).update({
      verificationStatus: 'pending',
      isVerified: false,
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ ok: true, verificationStatus: 'pending' });
  } catch (err) {
    return toErrorResponse(err);
  }
}
