import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { PROPOSAL_EXPIRY_DAYS } from '@/config/site';
import { getFirebaseServices } from '@/lib/firebase/client';
import { addDaysIso } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import type { Proposal } from '@/types/domain';

export async function submitOrUpdateProposal(
  input: Omit<Proposal, 'id' | 'status' | 'expiresAt' | 'createdAt' | 'updatedAt'>,
  existingProposalId?: string
): Promise<Proposal> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const now = new Date().toISOString();
  const id = existingProposalId || doc(collection(services.db, 'proposals')).id;

  const proposal: Proposal = {
    ...input,
    id,
    status: 'submitted',
    expiresAt: addDaysIso(PROPOSAL_EXPIRY_DAYS),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(services.db, 'proposals', id), proposal, { merge: true });

  // Notify customer & update request counter via trusted endpoint
  await callAuthedApi('/api/proposals/notify', {
    method: 'POST',
    body: { proposalId: id, requestId: input.requestId },
  }).catch(() => undefined);

  return proposal;
}

export async function listProposalsForRequest(requestId: string): Promise<Proposal[]> {
  const services = getFirebaseServices();
  if (!services) return [];

  const snap = await getDocs(
    query(
      collection(services.db, 'proposals'),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  ).catch(async () => {
    return getDocs(
      query(collection(services.db, 'proposals'), where('requestId', '==', requestId), limit(50))
    );
  });

  return snap.docs
    .map((d) => d.data() as Proposal)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listProfessionalProposals(professionalId: string): Promise<Proposal[]> {
  const services = getFirebaseServices();
  if (!services) return [];

  const snap = await getDocs(
    query(
      collection(services.db, 'proposals'),
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc'),
      limit(60)
    )
  ).catch(async () => {
    return getDocs(
      query(
        collection(services.db, 'proposals'),
        where('professionalId', '==', professionalId),
        limit(60)
      )
    );
  });

  return snap.docs
    .map((d) => d.data() as Proposal)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateProposalStatusByCustomer(
  proposalId: string,
  status: 'shortlisted' | 'rejected' | 'submitted'
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'proposals', proposalId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function withdrawProposal(proposalId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await updateDoc(doc(services.db, 'proposals', proposalId), {
    status: 'withdrawn',
    updatedAt: new Date().toISOString(),
  });
}

export async function acceptProposalAndCreateBooking(proposalId: string): Promise<{
  bookingId: string;
}> {
  return callAuthedApi<{ bookingId: string }>('/api/proposals/accept', {
    method: 'POST',
    body: { proposalId },
  });
}
