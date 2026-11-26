import { describe, expect, it } from 'vitest';
import { evaluateMatchingCandidates } from '@/features/matching/engine';
import { filterAndSortProfessionals } from '@/lib/search/provider';
import {
  proposalSchema,
  registerSchema,
  reviewSchema,
  serviceRequestSchema,
} from '@/lib/validation/schemas';
import type { AvailabilitySchedule, ProfessionalProfile, ServiceRequest } from '@/types/domain';

function makePro(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    uid: 'pro-1',
    slug: 'ananya-bridal',
    displayName: 'Ananya',
    businessName: 'Ananya Bridal Studio',
    headline: 'Bridal Makeup Artist',
    bio: 'Experienced bridal makeup artist working across Hyderabad.',
    profilePhotoUrl: null,
    coverImageUrl: null,
    experienceYears: 5,
    categories: ['makeup'],
    subcategories: ['bridal-makeup'],
    services: [
      {
        id: 's1',
        categorySlug: 'makeup',
        subcategorySlug: 'bridal-makeup',
        name: 'Bridal Makeup',
        description: 'Full bridal look',
        priceMin: 8000,
        priceMax: 15000,
        currency: 'INR',
        durationMinutes: 150,
        serviceModes: ['at_home', 'studio'],
      },
    ],
    location: { city: 'Hyderabad', locality: 'Jubilee Hills', country: 'India' },
    serviceAreas: ['Hyderabad', 'Jubilee Hills'],
    serviceRadiusKm: 25,
    serviceModes: ['at_home', 'studio'],
    languages: ['English', 'Hindi'],
    portfolio: [],
    priceRange: { min: 8000, max: 15000, currency: 'INR' },
    ratingAverage: 4.8,
    reviewCount: 12,
    completedBookingsCount: 15,
    responseRate: 92,
    avgResponseMinutes: 25,
    verificationStatus: 'approved',
    isVerified: true,
    profileStatus: 'active',
    isFeatured: false,
    onboardingStep: 12,
    onboardingCompleted: true,
    profileCompletion: 100,
    searchTokens: ['ananya', 'bridal', 'makeup', 'hyderabad'],
    lastActiveAt: '2026-11-20T10:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'req-1',
    customerId: 'cust-1',
    customerName: 'Priya',
    categorySlug: 'makeup',
    categoryName: 'Makeup',
    subcategorySlug: 'bridal-makeup',
    subcategoryName: 'Bridal makeup',
    serviceName: 'Bridal Makeup',
    title: 'Bridal Makeup in Jubilee Hills',
    description: 'Looking for soft natural bridal makeup for morning ceremony.',
    referenceImages: [],
    desiredDate: '2026-12-20',
    flexibleDate: false,
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
    expiresAt: '2026-12-30T00:00:00.000Z',
    isFlagged: false,
    createdAt: '2026-11-25T10:00:00.000Z',
    updatedAt: '2026-11-25T10:00:00.000Z',
    ...overrides,
  };
}

describe('VEYRA Rule-Based Matching Engine', () => {
  it('filters out mismatched category, city, self-owned, sample, and unavailable pros', () => {
    const req = makeRequest();
    const validPro = makePro({ uid: 'pro-valid' });
    const wrongCategory = makePro({ uid: 'pro-hair', categories: ['hair'] });
    const wrongCity = makePro({
      uid: 'pro-mumbai',
      location: { city: 'Mumbai', locality: 'Bandra', country: 'India' },
      serviceAreas: ['Mumbai'],
    });
    const ownPro = makePro({ uid: 'cust-1' });
    const samplePro = makePro({ uid: 'pro-sample', isSampleData: true });
    const pausedPro = makePro({ uid: 'pro-paused', profileStatus: 'paused' });
    const dayOffPro = makePro({ uid: 'pro-off' });
    const dayOffSchedule: AvailabilitySchedule = {
      uid: 'pro-off',
      flexibleScheduling: false,
      temporaryUnavailable: false,
      weeklyHours: {
        mon: { enabled: true, start: '09:00', end: '18:00' },
        tue: { enabled: true, start: '09:00', end: '18:00' },
        wed: { enabled: true, start: '09:00', end: '18:00' },
        thu: { enabled: true, start: '09:00', end: '18:00' },
        fri: { enabled: true, start: '09:00', end: '18:00' },
        sat: { enabled: true, start: '09:00', end: '18:00' },
        sun: { enabled: true, start: '09:00', end: '18:00' },
      },
      daysOff: ['2026-12-20'],
      dateOverrides: {},
      updatedAt: '2026-11-20T00:00:00.000Z',
    };

    const results = evaluateMatchingCandidates(req, [
      { professional: validPro },
      { professional: wrongCategory },
      { professional: wrongCity },
      { professional: ownPro },
      { professional: samplePro },
      { professional: pausedPro },
      { professional: dayOffPro, availability: dayOffSchedule },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]!.match.professionalId).toBe('pro-valid');
    expect(results[0]!.match.matchScore).toBeGreaterThan(75);
    expect(results[0]!.match.matchReasons.length).toBeGreaterThan(0);
  });

  it('allows remote requests to match across cities', () => {
    const req = makeRequest({
      categorySlug: 'graphic-design',
      categoryName: 'Graphic Design',
      subcategorySlug: 'branding',
      subcategoryName: 'Branding',
      serviceMode: 'remote',
      location: { city: 'Chennai', locality: 'Adyar' },
    });
    const remotePro = makePro({
      uid: 'pro-design',
      categories: ['graphic-design'],
      subcategories: ['branding'],
      serviceModes: ['remote'],
      location: { city: 'Bengaluru', locality: 'Indiranagar', country: 'India' },
      serviceAreas: ['Bengaluru'],
    });

    const results = evaluateMatchingCandidates(req, [{ professional: remotePro }]);
    expect(results).toHaveLength(1);
    expect(results[0]!.match.matchReasons).toContain('Remote service available');
  });
});

describe('VEYRA Search Filter & Sort', () => {
  it('filters by verifiedOnly, serviceMode, budgetMax, and sorts by price_asc', () => {
    const a = makePro({
      uid: 'a',
      priceRange: { min: 12000, max: 20000, currency: 'INR' },
      isVerified: true,
    });
    const b = makePro({
      uid: 'b',
      priceRange: { min: 6000, max: 9000, currency: 'INR' },
      isVerified: true,
    });
    const unverified = makePro({
      uid: 'c',
      priceRange: { min: 4000, max: 7000, currency: 'INR' },
      isVerified: false,
    });

    const filtered = filterAndSortProfessionals([a, b, unverified], {
      verifiedOnly: true,
      budgetMax: 13000,
      sortBy: 'price_asc',
    });

    expect(filtered.map((p) => p.uid)).toEqual(['b', 'a']);
  });
});

describe('VEYRA Zod Validation Schemas', () => {
  it('rejects requests where budgetMax < budgetMin', () => {
    const res = serviceRequestSchema.safeParse({
      categorySlug: 'makeup',
      subcategorySlug: 'bridal-makeup',
      serviceName: 'Bridal',
      title: 'Bridal makeup needed',
      description: 'Looking for bridal makeup for my wedding morning.',
      desiredDate: '2026-12-20',
      flexibleDate: false,
      timePreference: 'morning',
      city: 'Hyderabad',
      locality: 'Banjara Hills',
      serviceMode: 'at_home',
      budgetMin: 15000,
      budgetMax: 8000,
      budgetFlexible: false,
      peopleCount: 1,
    });
    expect(res.success).toBe(false);
  });

  it('rejects non-positive proposal prices and out-of-range ratings', () => {
    const propRes = proposalSchema.safeParse({
      requestId: 'req-1',
      price: 0,
      serviceDescription: 'Complete bridal package with hair styling.',
      includedServices: ['Makeup'],
      excludedServices: [],
      durationMinutes: 120,
      proposedDate: '2026-12-20',
      proposedTimeWindow: 'Morning',
      message: 'Happy to assist you!',
    });
    expect(propRes.success).toBe(false);

    const revRes = reviewSchema.safeParse({
      bookingId: 'b-1',
      overallRating: 6,
      serviceQuality: 5,
      professionalism: 5,
      communication: 5,
      punctuality: 5,
      comment: 'Great service experience overall!',
    });
    expect(revRes.success).toBe(false);
  });

  it('requires terms acceptance and valid role on registration', () => {
    const res = registerSchema.safeParse({
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'Password123',
      role: 'admin',
      acceptedTerms: true,
    });
    expect(res.success).toBe(false);
  });
});
