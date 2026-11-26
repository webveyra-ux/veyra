import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import { calculateCustomerCompletion } from '@/lib/utils';
import type {
  CustomerProfile,
  SavedAddress,
  ShortlistRecord,
  UserPreferences,
} from '@/types/domain';

export async function getCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snap = await getDoc(doc(services.db, 'customerProfiles', uid));
  return snap.exists() ? (snap.data() as CustomerProfile) : null;
}

export async function upsertCustomerProfile(
  uid: string,
  updates: Partial<CustomerProfile>
): Promise<CustomerProfile> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const existing = await getCustomerProfile(uid);
  const now = new Date().toISOString();
  const merged: CustomerProfile = {
    uid,
    fullName: updates.fullName ?? existing?.fullName ?? '',
    email: updates.email !== undefined ? updates.email : (existing?.email ?? null),
    phone: updates.phone !== undefined ? updates.phone : (existing?.phone ?? null),
    photoURL: updates.photoURL !== undefined ? updates.photoURL : (existing?.photoURL ?? null),
    defaultLocation: updates.defaultLocation ??
      existing?.defaultLocation ?? {
        city: '',
        locality: '',
        country: 'India',
      },
    preferredCategories: updates.preferredCategories ?? existing?.preferredCategories ?? [],
    savedProfessionalIds: updates.savedProfessionalIds ?? existing?.savedProfessionalIds ?? [],
    profileCompletion: 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  merged.profileCompletion = calculateCustomerCompletion(merged);
  await setDoc(doc(services.db, 'customerProfiles', uid), merged, { merge: true });

  await updateDoc(doc(services.db, 'users', uid), {
    displayName: merged.fullName,
    photoURL: merged.photoURL,
    updatedAt: now,
  }).catch(() => undefined);

  return merged;
}

export async function listCustomerAddresses(uid: string): Promise<SavedAddress[]> {
  const services = getFirebaseServices();
  if (!services) return [];
  const snap = await getDocs(
    query(
      collection(services.db, 'addresses'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    )
  ).catch(async () => {
    return getDocs(query(collection(services.db, 'addresses'), where('userId', '==', uid)));
  });
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedAddress, 'id'>) }));
}

export async function saveCustomerAddress(
  uid: string,
  addressInput: Omit<SavedAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  addressId?: string
): Promise<SavedAddress> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const now = new Date().toISOString();
  const id = addressId || doc(collection(services.db, 'addresses')).id;

  if (addressInput.isDefault) {
    const existing = await listCustomerAddresses(uid);
    await Promise.all(
      existing
        .filter((a) => a.id !== id && a.isDefault)
        .map((a) => updateDoc(doc(services.db, 'addresses', a.id), { isDefault: false, updatedAt: now }))
    );
  }

  const record: SavedAddress = {
    ...addressInput,
    id,
    userId: uid,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(services.db, 'addresses', id), record, { merge: true });
  return record;
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'addresses', addressId));
}

export async function getFavouriteProfessionalIds(uid: string): Promise<string[]> {
  const services = getFirebaseServices();
  if (!services) return [];
  const snap = await getDocs(
    query(collection(services.db, 'shortlists'), where('customerId', '==', uid))
  );
  return snap.docs.map((d) => (d.data() as ShortlistRecord).professionalId);
}

export async function toggleFavouriteProfessional(
  customerId: string,
  professionalId: string,
  currentlySaved: boolean
): Promise<boolean> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const docId = `${customerId}_pro_${professionalId}`;
  const ref = doc(services.db, 'shortlists', docId);

  if (currentlySaved) {
    await deleteDoc(ref);
    return false;
  }

  const record: ShortlistRecord = {
    id: docId,
    customerId,
    professionalId,
    type: 'professional',
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, record);
  return true;
}

export async function updateUserPreferences(
  uid: string,
  preferences: UserPreferences
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'users', uid), {
    preferences,
    updatedAt: new Date().toISOString(),
  });
}
