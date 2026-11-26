export const SITE_CONFIG = {
  name: 'VEYRA',
  tagline: 'Discover. Connect. Create.',
  headlineProposition: 'One request. Multiple professionals. Better choices.',
  shortMarketingLine: 'Find the right professional for what you imagine.',
  description:
    'VEYRA connects customers with independent beauty, styling, and creative service professionals through structured requests, tailored proposals, and verified profiles.',
  parentDivision: 'Damayanti Network',
  parentOrganisation: 'Damayanti Crest',
  attributionLine: 'A product of Damayanti Network',
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'INR',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  supportEmailPlaceholder: '[support@veyra-platform.example — replace with active company email]',
} as const;

export const POPULAR_CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Chennai',
  'Pune',
  'Kolkata',
  'Jaipur',
  'Ahmedabad',
  'Kochi',
] as const;

export const SERVICE_MODE_LABELS = {
  at_home: 'At-home / On-location',
  studio: 'Studio / Salon visit',
  remote: 'Remote / Online',
} as const;

export const REQUEST_EXPIRY_DAYS = 14;
export const PROPOSAL_EXPIRY_DAYS = 7;
