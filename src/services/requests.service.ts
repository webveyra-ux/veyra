import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { REQUEST_EXPIRY_DAYS } from '@/config/site';
import { getFirebaseServices } from '@/lib/firebase/client';
import { addDaysIso } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import type {
  RequestMatch,
  RequestPrivateDetails,
  ServiceRequest,
} from '@/types/domain';

export function allocateNewRequestId(): string {
  const services = getFirebaseServices();
  if (!services) return `req_${Date.now()}`;
  return doc(collection(services.db, 'requests')).id;
}

export async function saveRequestDraft(
  requestId: string,
  payload: Omit<
    ServiceRequest,
    | 'id'
    | 'proposalsCount'
    | 'shortlistedProposalIds'
    | 'acceptedProposalId'
    | 'bookingId'
    | 'expiresAt'
    | 'isFlagged'
    | 'createdAt'
    | 'updatedAt'
  >,
  privateDetails?: Omit<RequestPrivateDetails, 'updatedAt'>
): Promise<ServiceRequest> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const ref = doc(services.db, 'requests', requestId);
  const existingSnap = await getDoc(ref);
  const now = new Date().toISOString();
  const existing = existingSnap.exists() ? (existingSnap.data() as ServiceRequest) : null;

  const record: ServiceRequest = {
    ...payload,
    id: requestId,
    status: payload.status === 'open' ? 'open' : 'draft',
    proposalsCount: existing?.proposalsCount ?? 0,
    shortlistedProposalIds: existing?.shortlistedProposalIds ?? [],
    acceptedProposalId: existing?.acceptedProposalId ?? null,
    bookingId: existing?.bookingId ?? null,
    expiresAt: existing?.expiresAt ?? addDaysIso(REQUEST_EXPIRY_DAYS),
    isFlagged: existing?.isFlagged ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await setDoc(ref, record, { merge: true });

  if (privateDetails && (privateDetails.exactAddress || privateDetails.contactPhone || privateDetails.accessNotes)) {
    await setDoc(
      doc(services.db, 'requests', requestId, 'privateDetails', 'contact'),
      {
        ...privateDetails,
        updatedAt: now,
      } satisfies RequestPrivateDetails,
      { merge: true }
    );
  }

  return record;
}

export async function publishServiceRequest(requestId: string): Promise<{
  matchedCount: number;
  notificationCount: number;
}> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  await updateDoc(doc(services.db, 'requests', requestId), {
    status: 'open',
    expiresAt: addDaysIso(REQUEST_EXPIRY_DAYS),
    updatedAt: new Date().toISOString(),
  });

  // Trigger rule-based matching engine & professional notifications on server
  return callAuthedApi<{ matchedCount: number; notificationCount: number }>(
    '/api/requests/distribute',
    {
      method: 'POST',
      body: { requestId },
    }
  ).catch(() => ({ matchedCount: 0, notificationCount: 0 }));
}

export async function getRequestById(requestId: string): Promise<ServiceRequest | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snap = await getDoc(doc(services.db, 'requests', requestId));
  return snap.exists() ? (snap.data() as ServiceRequest) : null;
}

export async function getRequestPrivateDetails(
  requestId: string
): Promise<RequestPrivateDetails | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  try {
    const snap = await getDoc(
      doc(services.db, 'requests', requestId, 'privateDetails', 'contact')
    );
    return snap.exists() ? (snap.data() as RequestPrivateDetails) : null;
  } catch {
    return null;
  }
}

export async function listCustomerRequests(customerId: string): Promise<ServiceRequest[]> {
  const services = getFirebaseServices();
  if (!services) return [];
  const snap = await getDocs(
    query(
      collection(services.db, 'requests'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  ).catch(async () => {
    return getDocs(
      query(collection(services.db, 'requests'), where('customerId', '==', customerId), limit(50))
    );
  });

  return snap.docs
    .map((d) => d.data() as ServiceRequest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateRequestStatusCustomer(
  requestId: string,
  status: 'cancelled' | 'closed'
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'requests', requestId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDraftRequest(requestId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'requests', requestId));
}

export async function listProfessionalMatchedRequests(professionalId: string): Promise<{
  matches: RequestMatch[];
  requestsById: Record<string, ServiceRequest>;
}> {
  const services = getFirebaseServices();
  if (!services) return { matches: [], requestsById: {} };

  const matchSnap = await getDocs(
    query(
      collection(services.db, 'requestMatches'),
      where('professionalId', '==', professionalId),
      orderBy('matchScore', 'desc'),
      limit(40)
    )
  ).catch(async () => {
    return getDocs(
      query(
        collection(services.db, 'requestMatches'),
        where('professionalId', '==', professionalId),
        limit(40)
      )
    );
  });

  const matches = matchSnap.docs.map((d) => d.data() as RequestMatch);
  const requestsById: Record<string, ServiceRequest> = {};

  await Promise.all(
    matches.map(async (m) => {
      const req = await getRequestById(m.requestId).catch(() => null);
      if (req) requestsById[req.id] = req;
    })
  );

  return { matches, requestsById };
}

export async function listOpenRequestsByCategories(
  categorySlugs: string[]
): Promise<ServiceRequest[]> {
  const services = getFirebaseServices();
  if (!services || categorySlugs.length === 0) return [];

  const targetCategories = categorySlugs.slice(0, 10);
  const snap = await getDocs(
    query(
      collection(services.db, 'requests'),
      where('status', 'in', ['open', 'matching', 'proposals_received', 'shortlisted']),
      where('categorySlug', 'in', targetCategories),
      limit(30)
    )
  ).catch(async () => {
    return getDocs(
      query(
        collection(services.db, 'requests'),
        where('status', 'in', ['open', 'matching', 'proposals_received']),
        limit(30)
      )
    );
  });

  return snap.docs
    .map((d) => d.data() as ServiceRequest)
    .filter((r) => targetCategories.includes(r.categorySlug))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateMatchStatus(
  matchId: string,
  matchStatus: 'viewed' | 'saved' | 'ignored' | 'proposal_submitted'
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) return;
  await updateDoc(doc(services.db, 'requestMatches', matchId), {
    matchStatus,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);
}
