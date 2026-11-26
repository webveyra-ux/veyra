import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import { callAuthedApi } from '@/services/api-client';
import type { Review, StoredImageAsset } from '@/types/domain';

export async function listProfessionalReviews(
  professionalId: string,
  maxCount = 20
): Promise<Review[]> {
  const services = getFirebaseServices();
  if (!services) return [];

  const snap = await getDocs(
    query(
      collection(services.db, 'reviews'),
      where('professionalId', '==', professionalId),
      where('moderationStatus', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    )
  ).catch(async () => {
    return getDocs(
      query(
        collection(services.db, 'reviews'),
        where('professionalId', '==', professionalId),
        limit(maxCount)
      )
    );
  });

  return snap.docs
    .map((d) => d.data() as Review)
    .filter((r) => r.moderationStatus === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitBookingReview(input: {
  bookingId: string;
  overallRating: number;
  serviceQuality: number;
  professionalism: number;
  communication: number;
  punctuality: number;
  comment: string;
  images?: StoredImageAsset[];
}): Promise<{ review: Review }> {
  return callAuthedApi<{ review: Review }>('/api/reviews', {
    method: 'POST',
    body: input,
  });
}

export async function replyToReview(reviewId: string, text: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'reviews', reviewId), {
    professionalResponse: {
      text: text.trim(),
      respondedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  });
}
