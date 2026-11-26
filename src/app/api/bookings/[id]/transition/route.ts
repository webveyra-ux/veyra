import { z } from 'zod';
import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import { transitionBookingServer } from '@/services/server/marketplace';
import type { UserRole } from '@/types/domain';

const transitionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_service') }),
  z.object({ action: z.literal('complete_service') }),
  z.object({ action: z.literal('cancel'), reason: z.string().trim().min(4).max(400) }),
  z.object({
    action: z.literal('request_reschedule'),
    proposedDate: z.string().min(4),
    proposedTime: z.string().trim().min(2).max(60),
    reason: z.string().trim().min(4).max(400),
  }),
  z.object({
    action: z.literal('respond_reschedule'),
    decision: z.enum(['approve', 'decline']),
  }),
  z.object({
    action: z.literal('report_no_show'),
    reason: z.string().trim().min(4).max(400),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const { id } = await context.params;
    const parsed = transitionSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid booking transition.');
    }

    const role: UserRole =
      authCtx.token.admin === true ? 'admin' : authCtx.user?.role ?? 'customer';

    const db = getAdminDb();
    const result = await transitionBookingServer(db, id, authCtx.uid, role, parsed.data);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
