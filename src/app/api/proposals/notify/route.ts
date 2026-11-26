import { z } from 'zod';
import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import { createServerNotification } from '@/services/server/marketplace';
import type { Proposal, ServiceRequest } from '@/types/domain';

const bodySchema = z.object({
  proposalId: z.string().min(1),
  requestId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid proposal payload.');
    }

    const db = getAdminDb();
    const [proposalSnap, requestSnap] = await Promise.all([
      db.collection('proposals').doc(parsed.data.proposalId).get(),
      db.collection('requests').doc(parsed.data.requestId).get(),
    ]);

    if (!proposalSnap.exists || !requestSnap.exists) {
      throw new HttpError(404, 'Proposal or request not found.');
    }

    const proposal = proposalSnap.data() as Proposal;
    const req = requestSnap.data() as ServiceRequest;

    if (proposal.professionalId !== authCtx.uid) {
      throw new HttpError(403, 'Not authorised for this proposal.');
    }

    const countSnap = await db
      .collection('proposals')
      .where('requestId', '==', req.id)
      .where('status', 'in', ['submitted', 'shortlisted', 'accepted'])
      .get();

    await Promise.all([
      db.collection('requests').doc(req.id).update({
        proposalsCount: countSnap.size,
        status: ['open', 'matching'].includes(req.status) ? 'proposals_received' : req.status,
        updatedAt: new Date().toISOString(),
      }),
      db
        .collection('requestMatches')
        .doc(`${req.id}_${authCtx.uid}`)
        .update({
          matchStatus: 'proposal_submitted',
          updatedAt: new Date().toISOString(),
        })
        .catch(() => undefined),
      createServerNotification(db, {
        userId: req.customerId,
        type: 'proposal_received',
        title: `New proposal from ${proposal.professionalSnapshot.displayName}`,
        message: `${proposal.currency} ${proposal.price.toLocaleString()} quoted for "${req.title}".`,
        relatedEntityId: req.id,
        relatedEntityType: 'request',
        actionUrl: `/customer/requests/${req.id}`,
      }),
    ]);

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
