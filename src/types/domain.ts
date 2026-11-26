export type UserRole = 'customer' | 'professional' | 'admin';

export type AdminLevel =
  | 'super_admin'
  | 'operations_admin'
  | 'verification_admin'
  | 'support_admin'
  | 'content_admin';

export type AdminPermission =
  | 'manage_users'
  | 'manage_professionals'
  | 'verify_professionals'
  | 'manage_categories'
  | 'manage_requests'
  | 'manage_bookings'
  | 'moderate_reviews'
  | 'manage_reports'
  | 'manage_content'
  | 'view_analytics'
  | 'manage_admin_roles'
  | 'view_audit_logs';

export type AccountStatus = 'active' | 'suspended' | 'deleted_pending' | 'anonymized';

export type ServiceMode = 'at_home' | 'studio' | 'remote';

export type VerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'more_info_required'
  | 'suspended';

export type RequestStatus =
  | 'draft'
  | 'open'
  | 'matching'
  | 'proposals_received'
  | 'shortlisted'
  | 'booked'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'closed';

export type ProposalStatus =
  | 'submitted'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export type BookingStatus =
  | 'confirmed'
  | 'reschedule_requested'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'no_show';

export type ReviewModerationStatus = 'published' | 'flagged' | 'hidden' | 'removed';

export type ReportTargetType =
  | 'customer'
  | 'professional'
  | 'profile'
  | 'request'
  | 'booking'
  | 'conversation'
  | 'review'
  | 'content';

export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'escalated';

export type TimePreference = 'morning' | 'afternoon' | 'evening' | 'full_day' | 'flexible';

export type NotificationType =
  | 'request_created'
  | 'request_matched'
  | 'new_request'
  | 'proposal_received'
  | 'proposal_shortlisted'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'proposal_withdrawn'
  | 'new_message'
  | 'booking_confirmed'
  | 'booking_rescheduled'
  | 'reschedule_requested'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'review_received'
  | 'verification_update'
  | 'account_update';

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingOptIn: boolean;
  profileVisibility: 'standard' | 'minimal';
  showLastActive: boolean;
}

export interface UserRecord {
  uid: string;
  role: UserRole;
  displayName: string;
  email: string | null;
  phone: string | null;
  photoURL: string | null;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface LocationSummary {
  city: string;
  locality: string;
  postalCode?: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  line1: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  uid: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  photoURL: string | null;
  defaultLocation: LocationSummary;
  preferredCategories: string[];
  savedProfessionalIds: string[];
  profileCompletion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalServiceItem {
  id: string;
  categorySlug: string;
  subcategorySlug: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  durationMinutes: number;
  serviceModes: ServiceMode[];
}

export interface PortfolioItem {
  id: string;
  url: string;
  storagePath: string;
  mediaType: 'image' | 'video';
  categorySlug: string;
  title: string;
  description: string;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProfessionalProfile {
  uid: string;
  slug: string;
  displayName: string;
  businessName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string | null;
  coverImageUrl: string | null;
  experienceYears: number;
  categories: string[];
  subcategories: string[];
  services: ProfessionalServiceItem[];
  location: LocationSummary;
  serviceAreas: string[];
  serviceRadiusKm: number;
  serviceModes: ServiceMode[];
  languages: string[];
  portfolio: PortfolioItem[];
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  ratingAverage: number;
  reviewCount: number;
  completedBookingsCount: number;
  responseRate: number | null;
  avgResponseMinutes: number | null;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  profileStatus: 'draft' | 'active' | 'paused' | 'suspended';
  isFeatured: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
  profileCompletion: number;
  searchTokens: string[];
  isSampleData?: boolean;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  storagePath: string;
  mimeType: string;
  uploadedAt: string;
}

export interface VerificationRecord {
  uid: string;
  status: VerificationStatus;
  legalName: string;
  businessRegistrationNumber?: string;
  governmentIdType: string;
  documentUrls: VerificationDocument[];
  portfolioProofNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerNotes: string | null;
  rejectionReason: string | null;
  history: Array<{
    status: VerificationStatus;
    note?: string;
    actorId: string;
    timestamp: string;
  }>;
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface AvailabilitySchedule {
  uid: string;
  flexibleScheduling: boolean;
  temporaryUnavailable: boolean;
  unavailableReason?: string;
  weeklyHours: Record<WeekdayKey, { enabled: boolean; start: string; end: string }>;
  daysOff: string[];
  dateOverrides: Record<string, { available: boolean; slots?: string[]; note?: string }>;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  coverImageUrl: string;
  sortOrder: number;
  active: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubcategoryRecord {
  id: string;
  categoryId: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTypeRecord {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredImageAsset {
  id: string;
  url: string;
  storagePath: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string;
  subcategoryName: string;
  serviceName: string;
  title: string;
  description: string;
  referenceImages: StoredImageAsset[];
  desiredDate: string;
  flexibleDate: boolean;
  timePreference: TimePreference;
  location: {
    city: string;
    locality: string;
    postalCode?: string;
  };
  serviceMode: ServiceMode;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  budgetFlexible: boolean;
  peopleCount: number;
  additionalNotes: string;
  status: RequestStatus;
  proposalsCount: number;
  shortlistedProposalIds: string[];
  acceptedProposalId: string | null;
  bookingId: string | null;
  expiresAt: string;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestPrivateDetails {
  exactAddress: string;
  contactPhone?: string;
  accessNotes?: string;
  updatedAt: string;
}

export interface RequestMatchScoreBreakdown {
  location: number;
  service: number;
  budget: number;
  availability: number;
  reputation: number;
  responsiveness: number;
}

export interface RequestMatch {
  id: string;
  requestId: string;
  customerId: string;
  professionalId: string;
  categorySlug: string;
  city: string;
  serviceMode: ServiceMode;
  matchScore: number;
  scoreBreakdown: RequestMatchScoreBreakdown;
  matchReasons: string[];
  matchStatus: 'matched' | 'viewed' | 'saved' | 'ignored' | 'proposal_submitted' | 'closed';
  notificationStatus: 'pending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  requestId: string;
  professionalId: string;
  customerId: string;
  professionalSnapshot: {
    displayName: string;
    businessName: string;
    profilePhotoUrl: string | null;
    isVerified: boolean;
    ratingAverage: number;
    reviewCount: number;
    city: string;
  };
  price: number;
  currency: string;
  serviceDescription: string;
  includedServices: string[];
  excludedServices: string[];
  durationMinutes: number;
  additionalChargesNote: string;
  proposedDate: string;
  proposedTimeWindow: string;
  terms: string;
  message: string;
  status: ProposalStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShortlistRecord {
  id: string;
  customerId: string;
  professionalId: string;
  type: 'professional';
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'request' | 'proposal' | 'booking' | 'direct';
  participantIds: string[];
  customerId: string;
  professionalId: string;
  participantMeta: Record<
    string,
    {
      displayName: string;
      photoURL: string | null;
      role: UserRole;
    }
  >;
  requestId: string | null;
  proposalId: string | null;
  bookingId: string | null;
  subjectTitle: string;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageSenderId: string | null;
  unreadCountByUser: Record<string, number>;
  blockedBy: string[];
  status: 'active' | 'blocked' | 'moderated_closed';
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  url: string;
  storagePath: string;
  name: string;
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'system';
  text: string;
  attachments: MessageAttachment[];
  readBy: string[];
  moderationStatus: 'visible' | 'flagged' | 'removed';
  createdAt: string;
}

export interface Booking {
  id: string;
  requestId: string;
  proposalId: string;
  customerId: string;
  professionalId: string;
  customerName: string;
  professionalName: string;
  professionalBusinessName: string;
  categorySlug: string;
  serviceName: string;
  agreedPrice: number;
  currency: string;
  paymentStatus: 'offline_agreed';
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  location: {
    city: string;
    locality: string;
    addressNote?: string;
  };
  serviceMode: ServiceMode;
  status: BookingStatus;
  cancellation: {
    cancelledBy: string;
    role: UserRole;
    reason: string;
    cancelledAt: string;
  } | null;
  reschedule: {
    requestedBy: string;
    proposedDate: string;
    proposedTime: string;
    reason: string;
    status: 'pending' | 'approved' | 'declined';
    requestedAt: string;
  } | null;
  hasReview: boolean;
  reviewId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  professionalId: string;
  overallRating: number;
  serviceQuality: number;
  professionalism: number;
  communication: number;
  punctuality: number;
  comment: string;
  images: StoredImageAsset[];
  professionalResponse: {
    text: string;
    respondedAt: string;
  } | null;
  moderationStatus: ReviewModerationStatus;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId: string;
  relatedEntityType: 'request' | 'proposal' | 'booking' | 'conversation' | 'review' | 'verification' | 'account';
  actionUrl: string;
  read: boolean;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterRole: UserRole;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string;
  status: ReportStatus;
  assignedAdminId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: 'hero_announcement' | 'mid_banner' | 'category_spotlight';
  accentTone: 'lavender' | 'blush' | 'peach' | 'mint';
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'customers' | 'professionals' | 'bookings' | 'safety';
  sortOrder: number;
}

export interface PlatformSettings {
  id: 'public_content';
  announcementText: string;
  announcementActive: boolean;
  heroTitle: string;
  heroSubtitle: string;
  aboutIntro: string;
  supportEmail: string;
  contactPlaceholderNote: string;
  featuredCategorySlugs: string[];
  featuredProfessionalIds: string[];
  faqs: FaqItem[];
  updatedAt: string;
}

export interface AdminRoleRecord {
  uid: string;
  email: string;
  displayName: string;
  adminLevel: AdminLevel;
  permissions: AdminPermission[];
  active: boolean;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  adminId: string;
  adminEmail: string;
  affectedEntity: string;
  affectedEntityId: string;
  beforeSummary?: string;
  afterSummary?: string;
  details: string;
  createdAt: string;
}
