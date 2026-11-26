import { z } from 'zod';
import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import { acceptProposalServer } from '@/services/server/marketplace';

const bodySchema = z.object({
  proposalId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, 'Proposal ID is required.');
    }

    const db = getAdminDb();
    const { booking } = await acceptProposalServer(db, parsed.data.proposalId, authCtx.uid);
    return Response.json({ bookingId: booking.id, booking });
  } catch (err) {
    return toErrorResponse(err);
  }
}
