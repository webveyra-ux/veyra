import { z } from 'zod';
import { getAdminDb, HttpError, toErrorResponse, verifyRequestAuth } from '@/lib/firebase/admin';
import { reviewSchema } from '@/lib/validation/schemas';
import { submitReviewServer } from '@/services/server/marketplace';

const extendedReviewSchema = reviewSchema.extend({
  images: z
    .array(
      z.object({
        id: z.string().min(1),
        url: z.string().url(),
        storagePath: z.string().min(1),
      })
    )
    .max(5)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const authCtx = await verifyRequestAuth(request);
    const parsed = extendedReviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Invalid review data.');
    }

    const db = getAdminDb();
    const { review } = await submitReviewServer(db, authCtx.uid, parsed.data);
    return Response.json({ review }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
