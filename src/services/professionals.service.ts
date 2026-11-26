import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import {
  buildProfessionalSearchTokens,
  filterAndSortProfessionals,
  SEARCH_CAPABILITIES,
  type ProfessionalSearchParams,
  type ProfessionalSearchResult,
} from '@/lib/search/provider';
import { SAMPLE_SHOWCASE_PROFESSIONALS } from '@/lib/sample-data/marketplace-samples';
import { calculateProfessionalCompletion, slugify } from '@/lib/utils';
import type {
  AvailabilitySchedule,
  ProfessionalProfile,
  VerificationRecord,
} from '@/types/domain';

export const DEFAULT_AVAILABILITY_SCHEDULE = (uid: string): AvailabilitySchedule => ({
  uid,
  flexibleScheduling: true,
  temporaryUnavailable: false,
  weeklyHours: {
    mon: { enabled: true, start: '09:00', end: '19:00' },
    tue: { enabled: true, start: '09:00', end: '19:00' },
    wed: { enabled: true, start: '09:00', end: '19:00' },
    thu: { enabled: true, start: '09:00', end: '19:00' },
    fri: { enabled: true, start: '09:00', end: '19:00' },
    sat: { enabled: true, start: '09:00', end: '20:00' },
    sun: { enabled: false, start: '10:00', end: '17:00' },
  },
  daysOff: [],
  dateOverrides: {},
  updatedAt: new Date().toISOString(),
});

export async function getProfessionalProfile(uid: string): Promise<ProfessionalProfile | null> {
  const services = getFirebaseServices();
  if (!services) {
    return SAMPLE_SHOWCASE_PROFESSIONALS.find((p) => p.uid === uid || p.slug === uid) ?? null;
  }

  const direct = await getDoc(doc(services.db, 'professionalProfiles', uid));
  if (direct.exists()) {
    return direct.data() as ProfessionalProfile;
  }

  // Fallback lookup by slug if a profile URL uses a slug
  const bySlug = await getDocs(
    query(
      collection(services.db, 'professionalProfiles'),
      where('slug', '==', uid),
      where('profileStatus', '==', 'active'),
      limit(1)
    )
  );
  if (!bySlug.empty) {
    return bySlug.docs[0]!.data() as ProfessionalProfile;
  }

  return SAMPLE_SHOWCASE_PROFESSIONALS.find((p) => p.uid === uid || p.slug === uid) ?? null;
}

export async function fetchFeaturedProfessionals(count = 6): Promise<{
  items: ProfessionalProfile[];
  usingSampleFallback: boolean;
}> {
  const services = getFirebaseServices();
  if (!services) {
    return {
      items: SAMPLE_SHOWCASE_PROFESSIONALS.slice(0, count),
      usingSampleFallback: true,
    };
  }

  try {
    const featuredSnap = await getDocs(
      query(
        collection(services.db, 'professionalProfiles'),
        where('profileStatus', '==', 'active'),
        where('isFeatured', '==', true),
        orderBy('ratingAverage', 'desc'),
        limit(count)
      )
    );

    if (!featuredSnap.empty) {
      return {
        items: featuredSnap.docs.map((d) => d.data() as ProfessionalProfile),
        usingSampleFallback: false,
      };
    }

    const activeSnap = await getDocs(
      query(
        collection(services.db, 'professionalProfiles'),
        where('profileStatus', '==', 'active'),
        limit(count)
      )
    );

    if (!activeSnap.empty) {
      return {
        items: activeSnap.docs.map((d) => d.data() as ProfessionalProfile),
        usingSampleFallback: false,
      };
    }

    return {
      items: SAMPLE_SHOWCASE_PROFESSIONALS.slice(0, count),
      usingSampleFallback: true,
    };
  } catch {
    return {
      items: SAMPLE_SHOWCASE_PROFESSIONALS.slice(0, count),
      usingSampleFallback: true,
    };
  }
}

export async function searchProfessionals(
  params: ProfessionalSearchParams
): Promise<ProfessionalSearchResult> {
  const pageSize = params.pageSize ?? 12;
  const services = getFirebaseServices();

  if (!services) {
    const filtered = filterAndSortProfessionals(SAMPLE_SHOWCASE_PROFESSIONALS, params);
    return {
      items: filtered.slice(0, pageSize),
      nextCursor: null,
      hasMore: false,
      source: 'sample_fallback',
      capabilitiesNote: SEARCH_CAPABILITIES.note,
    };
  }

  try {
    const constraints: QueryConstraint[] = [where('profileStatus', '==', 'active')];

    if (params.category) {
      constraints.push(where('categories', 'array-contains', params.category));
    } else if (params.verifiedOnly) {
      constraints.push(where('isVerified', '==', true));
    }

    constraints.push(orderBy('ratingAverage', 'desc'));

    if (params.cursor) {
      const cursorDoc = await getDoc(doc(services.db, 'professionalProfiles', params.cursor));
      if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc));
      }
    }

    constraints.push(limit(Math.max(pageSize * 2, 24)));

    const snap = await getDocs(query(collection(services.db, 'professionalProfiles'), ...constraints));

    if (snap.empty && !params.cursor) {
      const sampleFiltered = filterAndSortProfessionals(SAMPLE_SHOWCASE_PROFESSIONALS, params);
      return {
        items: sampleFiltered.slice(0, pageSize),
        nextCursor: null,
        hasMore: false,
        source: 'sample_fallback',
        capabilitiesNote: SEARCH_CAPABILITIES.note,
      };
    }

    const rawItems = snap.docs.map((d) => d.data() as ProfessionalProfile);
    const refined = filterAndSortProfessionals(rawItems, params);
    const paged = refined.slice(0, pageSize);
    const lastVisible = snap.docs[snap.docs.length - 1];

    return {
      items: paged,
      nextCursor: snap.docs.length >= pageSize * 2 && lastVisible ? lastVisible.id : null,
      hasMore: snap.docs.length >= pageSize * 2,
      source: 'firestore',
      capabilitiesNote: SEARCH_CAPABILITIES.note,
    };
  } catch {
    const sampleFiltered = filterAndSortProfessionals(SAMPLE_SHOWCASE_PROFESSIONALS, params);
    return {
      items: sampleFiltered.slice(0, pageSize),
      nextCursor: null,
      hasMore: false,
      source: 'sample_fallback',
      capabilitiesNote: SEARCH_CAPABILITIES.note,
    };
  }
}

export async function saveProfessionalProfile(
  uid: string,
  updates: Partial<ProfessionalProfile>
): Promise<ProfessionalProfile> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const existing = await getProfessionalProfile(uid);
  const now = new Date().toISOString();

  const mergedServices = updates.services ?? existing?.services ?? [];
  const priceMins = mergedServices.map((s) => s.priceMin).filter((p) => p > 0);
  const priceMaxs = mergedServices.map((s) => s.priceMax || s.priceMin).filter((p) => p > 0);

  const computedPriceRange =
    priceMins.length > 0
      ? {
          min: Math.min(...priceMins),
          max: Math.max(...priceMaxs),
          currency: mergedServices[0]?.currency || 'INR',
        }
      : updates.priceRange ?? existing?.priceRange ?? { min: 0, max: 0, currency: 'INR' };

  const displayName = updates.displayName ?? existing?.displayName ?? '';
  const businessName = updates.businessName ?? existing?.businessName ?? '';
  const baseSlug = slugify(businessName || displayName || uid) || uid;

  const merged: ProfessionalProfile = {
    uid,
    slug: existing?.slug || `${baseSlug}-${uid.slice(0, 6).toLowerCase()}`,
    displayName,
    businessName,
    headline: updates.headline ?? existing?.headline ?? '',
    bio: updates.bio ?? existing?.bio ?? '',
    profilePhotoUrl:
      updates.profilePhotoUrl !== undefined
        ? updates.profilePhotoUrl
        : (existing?.profilePhotoUrl ?? null),
    coverImageUrl:
      updates.coverImageUrl !== undefined
        ? updates.coverImageUrl
        : (existing?.coverImageUrl ?? null),
    experienceYears: updates.experienceYears ?? existing?.experienceYears ?? 0,
    categories: updates.categories ?? existing?.categories ?? [],
    subcategories: updates.subcategories ?? existing?.subcategories ?? [],
    services: mergedServices,
    location: updates.location ??
      existing?.location ?? {
        city: '',
        locality: '',
        country: 'India',
      },
    serviceAreas: updates.serviceAreas ?? existing?.serviceAreas ?? [],
    serviceRadiusKm: updates.serviceRadiusKm ?? existing?.serviceRadiusKm ?? 15,
    serviceModes: updates.serviceModes ?? existing?.serviceModes ?? ['at_home'],
    languages: updates.languages ?? existing?.languages ?? ['English'],
    productsUsed: updates.productsUsed ?? existing?.productsUsed ?? [],
    productsSummary: updates.productsSummary ?? existing?.productsSummary ?? '',
    portfolio: updates.portfolio ?? existing?.portfolio ?? [],
    priceRange: computedPriceRange,
    // Server-governed protected metrics preserved from existing record
    ratingAverage: existing?.ratingAverage ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    completedBookingsCount: existing?.completedBookingsCount ?? 0,
    responseRate: existing?.responseRate ?? null,
    avgResponseMinutes: existing?.avgResponseMinutes ?? null,
    verificationStatus: existing?.verificationStatus ?? 'not_submitted',
    isVerified: existing?.isVerified ?? false,
    profileStatus:
      existing?.profileStatus === 'suspended'
        ? 'suspended'
        : updates.profileStatus ?? existing?.profileStatus ?? 'draft',
    isFeatured: existing?.isFeatured ?? false,
    onboardingStep: updates.onboardingStep ?? existing?.onboardingStep ?? 1,
    onboardingCompleted: updates.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
    profileCompletion: 0,
    searchTokens: [],
    lastActiveAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  merged.profileCompletion = calculateProfessionalCompletion(merged);
  merged.searchTokens = buildProfessionalSearchTokens({
    displayName: merged.displayName,
    businessName: merged.businessName,
    headline: merged.headline,
    city: merged.location.city,
    locality: merged.location.locality,
    categories: merged.categories,
    subcategories: merged.subcategories,
    services: merged.services,
  });

  await setDoc(doc(services.db, 'professionalProfiles', uid), merged, { merge: true });

  await updateDoc(doc(services.db, 'users', uid), {
    displayName: merged.displayName,
    photoURL: merged.profilePhotoUrl,
    lastActiveAt: now,
    updatedAt: now,
  }).catch(() => undefined);

  return merged;
}

export async function getProfessionalAvailability(uid: string): Promise<AvailabilitySchedule> {
  const services = getFirebaseServices();
  if (!services) return DEFAULT_AVAILABILITY_SCHEDULE(uid);
  const snap = await getDoc(doc(services.db, 'availability', uid));
  return snap.exists()
    ? (snap.data() as AvailabilitySchedule)
    : DEFAULT_AVAILABILITY_SCHEDULE(uid);
}

export async function saveProfessionalAvailability(
  schedule: AvailabilitySchedule
): Promise<AvailabilitySchedule> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const updated: AvailabilitySchedule = {
    ...schedule,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(services.db, 'availability', schedule.uid), updated, { merge: true });
  return updated;
}

export async function getVerificationRecord(uid: string): Promise<VerificationRecord | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snap = await getDoc(doc(services.db, 'verificationRecords', uid));
  return snap.exists() ? (snap.data() as VerificationRecord) : null;
}

export async function submitVerificationRecord(
  uid: string,
  payload: Omit<VerificationRecord, 'uid' | 'status' | 'submittedAt' | 'reviewedAt' | 'reviewedBy' | 'reviewerNotes' | 'rejectionReason' | 'history'>
): Promise<VerificationRecord> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const existing = await getVerificationRecord(uid);
  const now = new Date().toISOString();
  const record: VerificationRecord = {
    uid,
    status: 'pending',
    legalName: payload.legalName,
    governmentIdType: payload.governmentIdType,
    businessRegistrationNumber: payload.businessRegistrationNumber || '',
    documentUrls: payload.documentUrls,
    portfolioProofNote: payload.portfolioProofNote,
    submittedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNotes: null,
    rejectionReason: null,
    history: [
      ...(existing?.history ?? []),
      {
        status: 'pending',
        note: 'Verification packet submitted by professional.',
        actorId: uid,
        timestamp: now,
      },
    ],
  };

  await setDoc(doc(services.db, 'verificationRecords', uid), record, { merge: true });
  return record;
}
