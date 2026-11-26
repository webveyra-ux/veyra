import { z } from 'zod';
import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import { distributeRequestMatchesServer } from '@/services/server/marketplace';

const bodySchema = z.object({
  requestId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid requestId.');
    }

    const db = getAdminDb();
    const result = await distributeRequestMatchesServer(db, parsed.data.requestId, authCtx.uid);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
