import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { AppNotification } from '@/types/domain';

export function subscribeUserNotifications(
  uid: string,
  onData: (items: AppNotification[]) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(services.db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AppNotification));
    },
    () => {
      onData([]);
    }
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, 'notifications', notificationId), { read: true }).catch(
    () => undefined
  );
}

export async function markAllNotificationsRead(items: AppNotification[]): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  const unread = items.filter((i) => !i.read);
  if (unread.length === 0) return;

  const batch = writeBatch(services.db);
  for (const item of unread) {
    batch.update(doc(services.db, 'notifications', item.id), { read: true });
  }
  await batch.commit();
}

export async function deleteNotificationItem(notificationId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await deleteDoc(doc(services.db, 'notifications', notificationId));
}
