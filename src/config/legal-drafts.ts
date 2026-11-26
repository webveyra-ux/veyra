export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocumentDraft {
  slug: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  draftNotice: string;
  sections: LegalSection[];
}

export const LEGAL_DRAFT_NOTICE =
  'Draft Document — Review Required: This page is an editable initial draft prepared for VEYRA (a product of Damayanti Network). Bracketed placeholders must be completed and reviewed by qualified legal counsel prior to commercial launch.';

export const LEGAL_DOCUMENTS: Record<string, LegalDocumentDraft> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    subtitle: 'Platform terms governing customer and professional use of VEYRA.',
    lastUpdated: '[Insert Effective Date]',
    draftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. About VEYRA and Contracting Entity',
        body: [
          'VEYRA is a marketplace platform operated as a product of Damayanti Network, a division of Damayanti Crest ("[Company Legal Name Placeholder]", registered at "[Registered Office Address Placeholder]").',
          'VEYRA connects customers seeking beauty, styling, and creative services with independent professionals. VEYRA is a marketplace facilitator and does not directly employ listed professionals.',
        ],
      },
      {
        heading: '2. Eligibility and Accounts',
        body: [
          'Users must provide accurate information when creating a customer or professional account and keep credentials secure. Accounts may be suspended or terminated for policy violations, misrepresentation, or abuse.',
        ],
      },
      {
        heading: '3. Requests, Proposals, and Bookings',
        body: [
          'Customers post structured service requests with approximate location, date, and budget preferences. Independent professionals submit proposals detailing scope, inclusions, exclusions, duration, and agreed price.',
          'Accepting a single proposal creates a booking record at the agreed price. In this initial launch version, VEYRA does not process online payments, escrow, or commissions; payment terms agreed in the proposal are settled directly between customer and professional.',
        ],
      },
      {
        heading: '4. Disputes, Reviews, and Moderation',
        body: [
          'Reviews may only be submitted for eligible completed bookings. Users may report listings, conversations, or bookings through built-in moderation tools. Platform administrators review reports and maintain audit records of enforcement actions.',
        ],
      },
      {
        heading: '5. Contact and Governing Law',
        body: [
          'Questions regarding these terms may be sent to [Insert Legal Contact Email] or [Insert Registered Physical Address]. Governing law and jurisdiction: [Insert Applicable Jurisdiction].',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How VEYRA collects, stores, protects, and deletes personal data.',
    lastUpdated: '[Insert Effective Date]',
    draftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Data We Collect',
        body: [
          'Account data: display name, email address, phone number (when provided), role, and authentication identifiers managed through Firebase Authentication.',
          'Marketplace data: saved addresses, request briefs, reference images, proposals, real-time messages, bookings, reviews, and support reports stored in Cloud Firestore and Firebase Storage.',
          'Verification records: identity and credential documents submitted by professionals are stored in access-restricted Firebase Storage paths accessible only to the submitting professional and authorised verification administrators.',
        ],
      },
      {
        heading: '2. Location and Privacy Safeguards',
        body: [
          'Open requests and public profiles expose only city and locality details. Exact venue street addresses are stored separately in restricted subcollections and shared only with the booked professional after booking confirmation.',
        ],
      },
      {
        heading: '3. Account Deletion and Retention Policy',
        body: [
          'Customers and professionals may request permanent account deletion from Account Settings after reauthenticating. Our deletion workflow removes or anonymises personal profile records, deletes private verification and profile files, and preserves anonymised booking or audit records only where strictly required for dispute resolution, safety, or applicable law ("[Insert Retention Period Placeholder, e.g., 180 days / statutory tax period]").',
        ],
      },
      {
        heading: '4. Data Controller Contact',
        body: [
          'Product of Damayanti Network (division of Damayanti Crest). Privacy inquiries: [Insert Privacy Officer Email] | [Insert Mailing Address].',
        ],
      },
    ],
  },
  'professional-terms': {
    slug: 'professional-terms',
    title: 'Professional Terms',
    subtitle: 'Standards and obligations for independent professionals on VEYRA.',
    lastUpdated: '[Insert Effective Date]',
    draftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Independent Status',
        body: [
          'Professionals on VEYRA operate as independent practitioners or independent studios. You control your pricing, service descriptions, portfolio assets, availability schedule, and proposal terms.',
        ],
      },
      {
        heading: '2. Accurate Representation and Portfolio Ownership',
        body: [
          'Portfolio images and videos must represent your genuine work or work you are licensed to showcase. Misrepresenting another artist’s portfolio, credentials, or verification status is grounds for suspension.',
        ],
      },
      {
        heading: '3. Verification',
        body: [
          'Verified status is granted solely after administrative review of submitted documentation. Verification does not constitute endorsement of third-party services outside VEYRA’s published criteria.',
        ],
      },
      {
        heading: '4. Direct Payment Disclosure',
        body: [
          'Because VEYRA does not process online payments in this initial release, professionals are responsible for issuing clear, lawful receipts or invoices directly to customers where required by local tax rules.',
        ],
      },
    ],
  },
  cancellation: {
    slug: 'cancellation',
    title: 'Cancellation & Rescheduling Policy',
    subtitle: 'Clear guidelines for modifying or cancelling confirmed bookings.',
    lastUpdated: '[Insert Effective Date]',
    draftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Proposal Withdrawal Before Acceptance',
        body: [
          'Professionals may edit or withdraw a submitted proposal at any time before the customer accepts it.',
        ],
      },
      {
        heading: '2. Rescheduling a Confirmed Booking',
        body: [
          'Either party may submit a reschedule request proposing a new date, time, and reason. The booking updates to confirmed with the new schedule once accepted by the other party.',
        ],
      },
      {
        heading: '3. Booking Cancellations and No-Shows',
        body: [
          'Cancellations require a recorded reason and trigger immediate notifications to both parties. Repeated unexcused cancellations or documented no-shows may affect account standing following moderation review. [Insert specific advance-notice window and fee policy placeholder once online billing is introduced].',
        ],
      },
    ],
  },
  guidelines: {
    slug: 'guidelines',
    title: 'Community Guidelines',
    subtitle: 'Keeping VEYRA respectful, transparent, and trustworthy.',
    lastUpdated: '[Insert Effective Date]',
    draftNotice: LEGAL_DRAFT_NOTICE,
    sections: [
      {
        heading: '1. Respectful Communication',
        body: [
          'Treat every customer, artist, designer, and support specialist with courtesy. Harassment, discrimination, spam, or unsolicited commercial solicitation is prohibited.',
        ],
      },
      {
        heading: '2. Authentic Reviews and Profiles',
        body: [
          'Never post fabricated reviews, solicit fake ratings, or submit fraudulent verification records. Only share authentic work and honest feedback based on real completed bookings.',
        ],
      },
      {
        heading: '3. Reporting Concerns',
        body: [
          'Use the Report option on profiles, requests, conversations, or reviews whenever you encounter unsafe conduct or policy violations.',
        ],
      },
    ],
  },
};
