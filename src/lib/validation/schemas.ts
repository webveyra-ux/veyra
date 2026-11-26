import { z } from 'zod';

export const serviceModeEnum = z.enum(['at_home', 'studio', 'remote']);
export const timePreferenceEnum = z.enum(['morning', 'afternoon', 'evening', 'full_day', 'flexible']);

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
  role: z.enum(['customer', 'professional']),
  acceptedTerms: z.literal(true, {
    error: 'You must agree to the Terms of Service and Privacy Policy',
  }),
});

export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(80),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(60),
  locality: z.string().trim().min(2, 'Locality is required').max(80),
  postalCode: z.string().trim().max(16).optional().or(z.literal('')),
  preferredCategories: z.array(z.string()).max(10),
});

export const savedAddressSchema = z.object({
  label: z.string().trim().min(2, 'Address label is required').max(40),
  line1: z.string().trim().min(4, 'Street or building details are required').max(160),
  locality: z.string().trim().min(2, 'Locality is required').max(80),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().max(60).optional().or(z.literal('')),
  postalCode: z.string().trim().min(4, 'Postal code is required').max(16),
  country: z.string().trim().min(2).max(60).default('India'),
  isDefault: z.boolean().default(false),
});

export const professionalServiceSchema = z.object({
  id: z.string().min(1),
  categorySlug: z.string().min(1, 'Select category'),
  subcategorySlug: z.string().min(1, 'Select subcategory'),
  name: z.string().trim().min(3, 'Service name is required').max(90),
  description: z.string().trim().min(10, 'Describe what is included').max(400),
  priceMin: z.number().min(0, 'Minimum price cannot be negative'),
  priceMax: z.number().min(0),
  currency: z.string().default('INR'),
  durationMinutes: z.number().min(15).max(1440),
  serviceModes: z.array(serviceModeEnum).min(1, 'Select at least one service mode'),
});

export const professionalProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required').max(80),
  businessName: z.string().trim().max(100).optional().or(z.literal('')),
  headline: z.string().trim().min(4, 'Add a short professional title').max(120),
  bio: z.string().trim().min(30, 'Write at least 30 characters about your craft').max(1200),
  experienceYears: z.number().min(0).max(60),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  subcategories: z.array(z.string()),
  city: z.string().trim().min(2, 'City is required').max(60),
  locality: z.string().trim().min(2, 'Locality is required').max(80),
  postalCode: z.string().trim().max(16).optional().or(z.literal('')),
  state: z.string().trim().max(60).optional().or(z.literal('')),
  serviceAreas: z.array(z.string()).min(1, 'Add at least one service area'),
  serviceRadiusKm: z.number().min(1).max(200),
  serviceModes: z.array(serviceModeEnum).min(1, 'Choose at least one service mode'),
  languages: z.array(z.string()).min(1, 'Add at least one language'),
  productsUsed: z.array(z.string().trim().max(80)).optional(),
  productsSummary: z.string().trim().max(500).optional().or(z.literal('')),
});

export const serviceRequestSchema = z
  .object({
    categorySlug: z.string().min(1, 'Choose a category'),
    subcategorySlug: z.string().min(1, 'Choose a subcategory'),
    serviceName: z.string().trim().min(2, 'Specify the service').max(100),
    title: z.string().trim().min(5, 'Add a clear request title').max(120),
    description: z.string().trim().min(20, 'Describe your requirements in at least 20 characters').max(2000),
    desiredDate: z.string().min(4, 'Select a preferred date'),
    flexibleDate: z.boolean().default(false),
    timePreference: timePreferenceEnum,
    city: z.string().trim().min(2, 'City is required').max(60),
    locality: z.string().trim().min(2, 'Locality or neighbourhood is required').max(80),
    postalCode: z.string().trim().max(16).optional().or(z.literal('')),
    exactAddressPrivate: z.string().trim().max(240).optional().or(z.literal('')),
    serviceMode: serviceModeEnum,
    budgetMin: z.number().min(0, 'Budget must be zero or higher'),
    budgetMax: z.number().min(1, 'Maximum budget must be greater than zero'),
    budgetFlexible: z.boolean().default(false),
    peopleCount: z.number().int().min(1).max(100).default(1),
    additionalNotes: z.string().trim().max(800).optional().or(z.literal('')),
  })
  .refine((data) => data.budgetMax >= data.budgetMin, {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['budgetMax'],
  });

export const proposalSchema = z.object({
  requestId: z.string().min(1),
  price: z.number().positive('Quoted price must be greater than zero'),
  currency: z.string().default('INR'),
  serviceDescription: z.string().trim().min(15, 'Describe your proposal clearly').max(1500),
  includedServices: z.array(z.string().trim().min(2)).min(1, 'List at least one inclusion'),
  excludedServices: z.array(z.string().trim().min(1)),
  durationMinutes: z.number().min(15).max(2880),
  additionalChargesNote: z.string().trim().max(400).optional().or(z.literal('')),
  proposedDate: z.string().min(4, 'Select your available date'),
  proposedTimeWindow: z.string().trim().min(2, 'Specify your time window').max(80),
  terms: z.string().trim().max(800).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Include a personal introduction message').max(1000),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  overallRating: z.number().int().min(1).max(5),
  serviceQuality: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  punctuality: z.number().int().min(1).max(5),
  comment: z.string().trim().min(12, 'Please write at least 12 characters about your experience').max(1500),
});

export const reportSchema = z.object({
  targetType: z.enum([
    'customer',
    'professional',
    'profile',
    'request',
    'booking',
    'conversation',
    'review',
    'content',
  ]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3, 'Select a reason').max(120),
  description: z.string().trim().min(10, 'Provide brief context for our moderation team').max(1200),
});

export const verificationSubmissionSchema = z.object({
  legalName: z.string().trim().min(2, 'Legal full name is required').max(100),
  governmentIdType: z.enum(['national_id', 'passport', 'driving_licence', 'business_licence']),
  businessRegistrationNumber: z.string().trim().max(60).optional().or(z.literal('')),
  portfolioProofNote: z.string().trim().min(10, 'Describe your practice or credentials').max(800),
});

export const categoryAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(60),
  slug: z.string().trim().min(2, 'Slug is required').max(60),
  description: z.string().trim().min(10, 'Description is required').max(300),
  icon: z.string().trim().min(2).max(40),
  coverImageUrl: z.string().trim().min(1),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
  featured: z.boolean(),
});

export const rescheduleRequestSchema = z.object({
  proposedDate: z.string().min(4, 'Choose a new date'),
  proposedTime: z.string().trim().min(2, 'Specify proposed time').max(60),
  reason: z.string().trim().min(6, 'Provide a brief reason').max(400),
});
