import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import { callAuthedApi } from '@/services/api-client';
import type { Booking } from '@/types/domain';

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snap = await getDoc(doc(services.db, 'bookings', bookingId));
  return snap.exists() ? (snap.data() as Booking) : null;
}

export async function listUserBookings(
  uid: string,
  role: 'customer' | 'professional'
): Promise<Booking[]> {
  const services = getFirebaseServices();
  if (!services) return [];

  const field = role === 'customer' ? 'customerId' : 'professionalId';
  const snap = await getDocs(
    query(
      collection(services.db, 'bookings'),
      where(field, '==', uid),
      orderBy('scheduledDate', 'asc'),
      limit(60)
    )
  ).catch(async () => {
    return getDocs(query(collection(services.db, 'bookings'), where(field, '==', uid), limit(60)));
  });

  return snap.docs
    .map((d) => d.data() as Booking)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

export type BookingTransitionAction =
  | { action: 'start_service' }
  | { action: 'complete_service' }
  | { action: 'cancel'; reason: string }
  | { action: 'request_reschedule'; proposedDate: string; proposedTime: string; reason: string }
  | { action: 'respond_reschedule'; decision: 'approve' | 'decline' }
  | { action: 'report_no_show'; reason: string };

export async function transitionBookingStatus(
  bookingId: string,
  payload: BookingTransitionAction
): Promise<{ booking: Booking }> {
  return callAuthedApi<{ booking: Booking }>(`/api/bookings/${bookingId}/transition`, {
    method: 'POST',
    body: payload,
  });
}
