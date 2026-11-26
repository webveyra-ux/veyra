import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  acceptProposalServer,
  distributeRequestMatchesServer,
  submitReviewServer,
  transitionBookingServer,
} from '@/services/server/marketplace';
import type { ProfessionalProfile, Proposal, ServiceRequest } from '@/types/domain';

let db: Firestore;

beforeAll(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const app =
    getApps().find((a) => a.name === 'tx-test-app') ||
    initializeApp({ projectId: 'demo-veyra-tx-test' }, 'tx-test-app');
  db = getFirestore(app);
});

afterAll(async () => {
  const collections = [
    'professionalProfiles',
    'requests',
    'requestMatches',
    'requestRecipients',
    'proposals',
    'bookings',
    'reviews',
    'conversations',
    'notifications',
    'auditLogs',
  ];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
});

describe('VEYRA Server Marketplace Transactions (Firestore Emulator)', () => {
  it('distributes matches, accepts proposal atomically, blocks duplicate booking, transitions booking, and records single verified review', async () => {
    const now = new Date().toISOString();

    const pro1: ProfessionalProfile = {
      uid: 'tx-pro-1',
      slug: 'tx-pro-1',
      displayName: 'Ananya Bridal',
      businessName: 'Atelier Ananya',
      headline: 'Bridal Artist',
      bio: 'Specialized bridal makeup studio.',
      profilePhotoUrl: null,
      coverImageUrl: null,
      experienceYears: 6,
      categories: ['makeup'],
      subcategories: ['bridal-makeup'],
      services: [],
      location: { city: 'Hyderabad', locality: 'Jubilee Hills', country: 'India' },
      serviceAreas: ['Hyderabad', 'Jubilee Hills'],
      serviceRadiusKm: 20,
      serviceModes: ['at_home'],
      languages: ['English'],
      portfolio: [],
      priceRange: { min: 8000, max: 16000, currency: 'INR' },
      ratingAverage: 0,
      reviewCount: 0,
      completedBookingsCount: 0,
      responseRate: null,
      avgResponseMinutes: null,
      verificationStatus: 'approved',
      isVerified: true,
      profileStatus: 'active',
      isFeatured: false,
      onboardingStep: 12,
      onboardingCompleted: true,
      profileCompletion: 100,
      searchTokens: ['ananya', 'makeup'],
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const pro2: ProfessionalProfile = {
      ...pro1,
      uid: 'tx-pro-2',
      slug: 'tx-pro-2',
      displayName: 'Riya Makeup',
      businessName: 'Riya Studio',
    };

    const reqDoc: ServiceRequest = {
      id: 'tx-req-1',
      customerId: 'tx-cust-1',
      customerName: 'Neha',
      categorySlug: 'makeup',
      categoryName: 'Makeup',
      subcategorySlug: 'bridal-makeup',
      subcategoryName: 'Bridal makeup',
      serviceName: 'Bridal Makeup',
      title: 'Bridal Makeup Request',
      description: 'Looking for bridal makeup for morning ceremony.',
      referenceImages: [],
      desiredDate: '2026-12-22',
      flexibleDate: true,
      timePreference: 'morning',
      location: { city: 'Hyderabad', locality: 'Jubilee Hills' },
      serviceMode: 'at_home',
      budgetMin: 7000,
      budgetMax: 16000,
      currency: 'INR',
      budgetFlexible: false,
      peopleCount: 1,
      additionalNotes: '',
      status: 'open',
      proposalsCount: 0,
      shortlistedProposalIds: [],
      acceptedProposalId: null,
      bookingId: null,
      expiresAt: '2027-01-30T00:00:00.000Z',
      isFlagged: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('professionalProfiles').doc(pro1.uid).set(pro1);
    await db.collection('professionalProfiles').doc(pro2.uid).set(pro2);
    await db.collection('requests').doc(reqDoc.id).set(reqDoc);

    // 1. Distribute matches
    const dist = await distributeRequestMatchesServer(db, reqDoc.id, 'tx-cust-1');
    expect(dist.matchedCount).toBe(2);

    // 2. Seed two competing proposals
    const prop1: Proposal = {
      id: 'tx-prop-1',
      requestId: reqDoc.id,
      professionalId: pro1.uid,
      customerId: 'tx-cust-1',
      professionalSnapshot: {
        displayName: pro1.displayName,
        businessName: pro1.businessName,
        profilePhotoUrl: null,
        isVerified: true,
        ratingAverage: 0,
        reviewCount: 0,
        city: 'Hyderabad',
      },
      price: 12000,
      currency: 'INR',
      serviceDescription: 'Full bridal look',
      includedServices: ['Makeup', 'Draping'],
      excludedServices: [],
      durationMinutes: 150,
      additionalChargesNote: '',
      proposedDate: '2026-12-22',
      proposedTimeWindow: '6:00 AM',
      terms: 'Direct settlement on completion',
      message: 'Happy to work with you',
      status: 'submitted',
      expiresAt: '2027-01-30T00:00:00.000Z',
      createdAt: now,
      updatedAt: now,
    };
    const prop2: Proposal = {
      ...prop1,
      id: 'tx-prop-2',
      professionalId: pro2.uid,
      price: 13500,
    };
    await db.collection('proposals').doc(prop1.id).set(prop1);
    await db.collection('proposals').doc(prop2.id).set(prop2);

    // 3. Atomic acceptance of prop1 creates booking and rejects prop2
    const { booking } = await acceptProposalServer(db, prop1.id, 'tx-cust-1');
    expect(booking.status).toBe('confirmed');
    expect(booking.paymentStatus).toBe('offline_agreed');

    const prop2After = (await db.collection('proposals').doc(prop2.id).get()).data() as Proposal;
    expect(prop2After.status).toBe('rejected');

    // 4. Duplicate booking acceptance on prop2 or prop1 fails
    await expect(acceptProposalServer(db, prop2.id, 'tx-cust-1')).rejects.toThrow();
    await expect(acceptProposalServer(db, prop1.id, 'tx-cust-1')).rejects.toThrow();

    // 5. Booking reschedule + completion
    await transitionBookingServer(db, booking.id, 'tx-cust-1', 'customer', {
      action: 'request_reschedule',
      proposedDate: '2026-12-23',
      proposedTime: '7:00 AM',
      reason: 'Ceremony timing moved',
    });
    await transitionBookingServer(db, booking.id, pro1.uid, 'professional', {
      action: 'respond_reschedule',
      decision: 'approve',
    });
    const completed = await transitionBookingServer(db, booking.id, pro1.uid, 'professional', {
      action: 'complete_service',
    });
    expect(completed.booking.status).toBe('completed');
    expect(completed.booking.scheduledDate).toBe('2026-12-23');

    // 6. Submit verified review & block duplicate review
    const { review } = await submitReviewServer(db, 'tx-cust-1', {
      bookingId: booking.id,
      overallRating: 5,
      serviceQuality: 5,
      professionalism: 5,
      communication: 5,
      punctuality: 5,
      comment: 'Punctual, calming, and wonderful finish.',
    });
    expect(review.id).toBe(`booking_${booking.id}`);

    const updatedPro = (
      await db.collection('professionalProfiles').doc(pro1.uid).get()
    ).data() as ProfessionalProfile;
    expect(updatedPro.ratingAverage).toBe(5);
    expect(updatedPro.reviewCount).toBe(1);
    expect(updatedPro.completedBookingsCount).toBe(1);

    await expect(
      submitReviewServer(db, 'tx-cust-1', {
        bookingId: booking.id,
        overallRating: 4,
        serviceQuality: 4,
        professionalism: 4,
        communication: 4,
        punctuality: 4,
        comment: 'Duplicate attempt should fail.',
      })
    ).rejects.toThrow();
  });
});
