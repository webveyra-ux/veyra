import type {
  AvailabilitySchedule,
  ProfessionalProfile,
  RequestMatch,
  RequestMatchScoreBreakdown,
  ServiceRequest,
  WeekdayKey,
} from '@/types/domain';

const WEEKDAY_MAP: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isDateAvailable(
  schedule: AvailabilitySchedule | undefined,
  desiredDate: string,
  flexibleDate: boolean
): { ok: boolean; bonus: number; reason?: string } {
  if (!schedule) {
    return { ok: true, bonus: 6, reason: 'Open calendar configuration' };
  }
  if (schedule.temporaryUnavailable) {
    return { ok: false, bonus: 0, reason: 'Temporarily unavailable' };
  }
  if (schedule.flexibleScheduling || flexibleDate) {
    return { ok: true, bonus: 10, reason: 'Supports flexible scheduling' };
  }
  if (schedule.daysOff.includes(desiredDate)) {
    return { ok: false, bonus: 0, reason: 'Requested date marked as day off' };
  }
  const override = schedule.dateOverrides?.[desiredDate];
  if (override) {
    return override.available
      ? { ok: true, bonus: 10, reason: 'Date explicitly open in schedule' }
      : { ok: false, bonus: 0, reason: 'Date blocked by override' };
  }

  const parsed = new Date(desiredDate);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: true, bonus: 6 };
  }
  const weekday = WEEKDAY_MAP[parsed.getDay()];
  const dayConfig = schedule.weeklyHours?.[weekday];
  if (dayConfig && !dayConfig.enabled) {
    return { ok: false, bonus: 0, reason: `Not working on ${weekday.toUpperCase()}` };
  }
  return { ok: true, bonus: 9, reason: 'Available on requested weekday' };
}

export interface MatchCandidateInput {
  professional: ProfessionalProfile;
  availability?: AvailabilitySchedule;
}

export interface EvaluatedMatch {
  match: Omit<RequestMatch, 'createdAt' | 'updatedAt'>;
}

/**
 * Pure rule-based matching engine for VEYRA.
 * Uses explicit hard filters + transparent weighted criteria derived solely from real profile data.
 */
export function evaluateMatchingCandidates(
  request: ServiceRequest,
  candidates: MatchCandidateInput[],
  options: { requireVerified?: boolean; maxMatches?: number } = {}
): EvaluatedMatch[] {
  const reqCity = request.location.city.trim().toLowerCase();
  const reqLocality = request.location.locality.trim().toLowerCase();
  const results: EvaluatedMatch[] = [];

  for (const { professional, availability } of candidates) {
    // Hard filter 1: cannot match customer's own profile
    if (professional.uid === request.customerId) continue;

    // Hard filter 2: active non-sample professional profile
    if (professional.profileStatus !== 'active' || professional.isSampleData) continue;

    // Hard filter 3: verification requirement (optional)
    if (options.requireVerified && !professional.isVerified) continue;

    // Hard filter 4: category compatibility
    if (!professional.categories.includes(request.categorySlug)) continue;

    // Hard filter 5: service mode compatibility
    if (!professional.serviceModes.includes(request.serviceMode)) continue;

    // Hard filter 6: service area / city compatibility (unless remote)
    const areas = [
      professional.location.city,
      professional.location.locality,
      ...professional.serviceAreas,
    ].map((a) => a.toLowerCase());

    const cityMatches =
      request.serviceMode === 'remote' ||
      areas.some((area) => area === reqCity || area.includes(reqCity) || reqCity.includes(area));

    if (!cityMatches) continue;

    // Hard filter 7: availability compatibility
    const availabilityCheck = isDateAvailable(
      availability,
      request.desiredDate,
      request.flexibleDate
    );
    if (!availabilityCheck.ok) continue;

    // Weighted Score Breakdown (Total 100)
    const reasons: string[] = [];

    // 1. Location relevance (25)
    let locationScore = 15;
    if (request.serviceMode === 'remote') {
      locationScore = 22;
      reasons.push('Remote service available');
    } else if (areas.some((a) => a.includes(reqLocality))) {
      locationScore = 25;
      reasons.push(`Covers ${request.location.locality}, ${request.location.city}`);
    } else {
      locationScore = 20;
      reasons.push(`Serves ${request.location.city}`);
    }

    // 2. Service & subcategory compatibility (25)
    let serviceScore = 14;
    const hasSubcategory = professional.subcategories.includes(request.subcategorySlug);
    const hasNamedService = professional.services.some(
      (s) =>
        s.subcategorySlug === request.subcategorySlug ||
        s.name.toLowerCase().includes(request.serviceName.toLowerCase())
    );
    if (hasNamedService) {
      serviceScore = 25;
      reasons.push(`Lists matching ${request.subcategoryName} service`);
    } else if (hasSubcategory) {
      serviceScore = 21;
      reasons.push(`Specialises in ${request.subcategoryName}`);
    } else {
      reasons.push(`Active in ${request.categoryName}`);
    }

    // 3. Budget compatibility (20)
    let budgetScore = 10;
    const proMin = professional.priceRange.min;
    const proMax = professional.priceRange.max || proMin;
    if (proMin <= 0) {
      budgetScore = 12;
    } else if (proMin <= request.budgetMax && (proMax === 0 || proMax >= request.budgetMin)) {
      budgetScore = 20;
      reasons.push('Pricing overlaps requested budget');
    } else if (request.budgetFlexible && proMin <= request.budgetMax * 1.2) {
      budgetScore = 13;
      reasons.push('Near flexible budget range');
    } else {
      budgetScore = 6;
    }

    // 4. Availability (10)
    const availabilityScore = availabilityCheck.bonus;
    if (availabilityCheck.reason) reasons.push(availabilityCheck.reason);

    // 5. Reputation from real completed data only (10)
    let reputationScore = 2;
    if (professional.reviewCount > 0) {
      reputationScore = Math.min(10, Math.round((professional.ratingAverage / 5) * 8 + Math.min(2, professional.completedBookingsCount * 0.4)));
      reasons.push(
        `${professional.ratingAverage.toFixed(1)} rating (${professional.reviewCount} reviews)`
      );
    } else if (professional.completedBookingsCount > 0) {
      reputationScore = Math.min(7, 2 + professional.completedBookingsCount);
    }

    // 6. Real responsiveness & activity (10)
    let responsivenessScore = 4;
    if (typeof professional.responseRate === 'number') {
      responsivenessScore = Math.min(10, Math.round((professional.responseRate / 100) * 10));
      reasons.push(`${professional.responseRate}% observed response rate`);
    } else if (professional.isVerified) {
      responsivenessScore = 7;
      reasons.push('Verified profile');
    }

    const scoreBreakdown: RequestMatchScoreBreakdown = {
      location: locationScore,
      service: serviceScore,
      budget: budgetScore,
      availability: availabilityScore,
      reputation: reputationScore,
      responsiveness: responsivenessScore,
    };

    const matchScore = Math.min(
      100,
      locationScore +
        serviceScore +
        budgetScore +
        availabilityScore +
        reputationScore +
        responsivenessScore
    );

    results.push({
      match: {
        id: `${request.id}_${professional.uid}`,
        requestId: request.id,
        customerId: request.customerId,
        professionalId: professional.uid,
        categorySlug: request.categorySlug,
        city: request.location.city,
        serviceMode: request.serviceMode,
        matchScore,
        scoreBreakdown,
        matchReasons: reasons,
        matchStatus: 'matched',
        notificationStatus: 'pending',
      },
    });
  }

  results.sort((a, b) => b.match.matchScore - a.match.matchScore);
  const limit = options.maxMatches ?? 25;
  return results.slice(0, limit);
}
