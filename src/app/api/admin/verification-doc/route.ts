import { getAdminStorage, HttpError, toErrorResponse, verifyAdminAuth } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  try {
    await verifyAdminAuth(request, 'verify_professionals');
    const url = new URL(request.url);
    const storagePath = url.searchParams.get('path') || '';

    if (!storagePath.startsWith('verification/')) {
      throw new HttpError(400, 'Invalid verification document path.');
    }

    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpError(404, 'Verification document not found in Storage.');
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    });

    return Response.json({ url: signedUrl });
  } catch (err) {
    return toErrorResponse(err);
  }
}
