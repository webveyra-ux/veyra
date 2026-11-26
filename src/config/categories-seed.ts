import type { CategoryRecord, SubcategoryRecord, FaqItem } from '@/types/domain';

const SEED_TS = '2026-01-01T00:00:00.000Z';

export const INITIAL_CATEGORIES: CategoryRecord[] = [
  {
    id: 'makeup',
    name: 'Makeup',
    slug: 'makeup',
    description:
      'Bridal artistry, editorial glam, party looks, and skin-first makeup tailored to your occasion and lighting.',
    icon: 'Sparkles',
    coverImageUrl: '/images/categories/makeup.jpg',
    sortOrder: 1,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'hair',
    name: 'Hair',
    slug: 'hair',
    description:
      'Precision haircuts, event hair styling, dimensional colouring, and restorative scalp & hair treatments.',
    icon: 'Scissors',
    coverImageUrl: '/images/categories/hair.jpg',
    sortOrder: 2,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'mehendi',
    name: 'Mehendi',
    slug: 'mehendi',
    description:
      'Intricate bridal henna, traditional motifs, contemporary minimal lines, and organic natural-stain mehendi.',
    icon: 'Flower2',
    coverImageUrl: '/images/categories/mehendi.jpg',
    sortOrder: 3,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'nails',
    name: 'Nails',
    slug: 'nails',
    description:
      'Custom nail art, clean Russian & classic manicures, spa pedicures, and structured gel extensions.',
    icon: 'Gem',
    coverImageUrl: '/images/categories/nails.jpg',
    sortOrder: 4,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'skincare-beauty',
    name: 'Skincare and Beauty',
    slug: 'skincare-beauty',
    description:
      'Pre-event glow facials, targeted barrier-focused skincare rituals, and personal grooming treatments.',
    icon: 'Droplets',
    coverImageUrl: '/images/categories/skincare-beauty.jpg',
    sortOrder: 5,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'styling',
    name: 'Styling',
    slug: 'styling',
    description:
      'Personal styling, seasonal wardrobe edits, event look curation, and colour-harmony consultations.',
    icon: 'Shirt',
    coverImageUrl: '/images/categories/styling.jpg',
    sortOrder: 6,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'fashion-design',
    name: 'Fashion Design',
    slug: 'fashion-design',
    description:
      'Bespoke occasionwear, custom garment pattern design, trousseau craftsmanship, and precision alterations.',
    icon: 'Ruler',
    coverImageUrl: '/images/categories/fashion-design.jpg',
    sortOrder: 7,
    active: true,
    featured: false,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'interior-design',
    name: 'Interior Design',
    slug: 'interior-design',
    description:
      'Warm residential interiors, boutique commercial spaces, room refreshes, and spatial moodboards.',
    icon: 'Lamp',
    coverImageUrl: '/images/categories/interior-design.jpg',
    sortOrder: 8,
    active: true,
    featured: false,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    slug: 'graphic-design',
    description:
      'Brand identities, logo systems, custom invitations, campaign posters, and digital visual assets.',
    icon: 'PenTool',
    coverImageUrl: '/images/categories/graphic-design.jpg',
    sortOrder: 9,
    active: true,
    featured: false,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: 'photography',
    name: 'Photography',
    slug: 'photography',
    description:
      'Editorial portraits, intimate weddings, brand campaigns, events, and studio product photography.',
    icon: 'Camera',
    coverImageUrl: '/images/categories/photography.jpg',
    sortOrder: 10,
    active: true,
    featured: true,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
];

interface SubcategoryInput {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
}

const SUBCATEGORY_SPECS: SubcategoryInput[] = [
  { categorySlug: 'makeup', name: 'Bridal makeup', slug: 'bridal-makeup', description: 'Long-wear wedding & ceremony makeup.' },
  { categorySlug: 'makeup', name: 'Party makeup', slug: 'party-makeup', description: 'Cocktail, reception, and festive looks.' },
  { categorySlug: 'makeup', name: 'Engagement makeup', slug: 'engagement-makeup', description: 'Soft luminous looks for ceremonies.' },
  { categorySlug: 'makeup', name: 'Photoshoot makeup', slug: 'photoshoot-makeup', description: 'Camera-ready editorial & studio finishes.' },
  { categorySlug: 'makeup', name: 'Everyday makeup', slug: 'everyday-makeup', description: 'Natural effortless daytime styling.' },

  { categorySlug: 'hair', name: 'Haircuts', slug: 'haircuts', description: 'Tailored cuts, trims, and shaping.' },
  { categorySlug: 'hair', name: 'Hair styling', slug: 'hair-styling', description: 'Blowouts, bridal updos, and waves.' },
  { categorySlug: 'hair', name: 'Hair colouring', slug: 'hair-colouring', description: 'Balayage, glossing, and global colour.' },
  { categorySlug: 'hair', name: 'Hair treatments', slug: 'hair-treatments', description: 'Keratin, scalp therapy, and repair rituals.' },

  { categorySlug: 'mehendi', name: 'Bridal mehendi', slug: 'bridal-mehendi', description: 'Full-arm and foot bridal henna art.' },
  { categorySlug: 'mehendi', name: 'Traditional mehendi', slug: 'traditional-mehendi', description: 'Classic paisleys, mandalas, and heritage patterns.' },
  { categorySlug: 'mehendi', name: 'Party mehendi', slug: 'party-mehendi', description: 'Sangeet, festive, and guest group mehendi.' },
  { categorySlug: 'mehendi', name: 'Custom designs', slug: 'custom-mehendi-designs', description: 'Personalized motifs and minimal linework.' },

  { categorySlug: 'nails', name: 'Nail art', slug: 'nail-art', description: 'Hand-painted, chrome, pearl, and 3D nail design.' },
  { categorySlug: 'nails', name: 'Manicure', slug: 'manicure', description: 'Cuticle care, shaping, and gel polish.' },
  { categorySlug: 'nails', name: 'Pedicure', slug: 'pedicure', description: 'Restorative foot spa and polish care.' },
  { categorySlug: 'nails', name: 'Extensions', slug: 'nail-extensions', description: 'Gel-X, builder gel, and acrylic extensions.' },

  { categorySlug: 'skincare-beauty', name: 'Facials', slug: 'facials', description: 'Hydrating, brightening, and soothing facials.' },
  { categorySlug: 'skincare-beauty', name: 'Skincare services', slug: 'skincare-services', description: 'Customized skincare consultations and rituals.' },
  { categorySlug: 'skincare-beauty', name: 'Beauty treatments', slug: 'beauty-treatments', description: 'Brow lamination, lash lift, and grooming.' },

  { categorySlug: 'styling', name: 'Personal styling', slug: 'personal-styling', description: 'One-on-one silhouette and image styling.' },
  { categorySlug: 'styling', name: 'Wardrobe styling', slug: 'wardrobe-styling', description: 'Closet edits, capsule planning, and pairing.' },
  { categorySlug: 'styling', name: 'Fashion consultation', slug: 'fashion-consultation', description: 'Event & trousseau direction.' },

  { categorySlug: 'fashion-design', name: 'Custom designs', slug: 'custom-fashion-designs', description: 'Made-to-measure original garments.' },
  { categorySlug: 'fashion-design', name: 'Outfit design', slug: 'outfit-design', description: 'Bridal, festive, and evening outfit creation.' },
  { categorySlug: 'fashion-design', name: 'Alterations', slug: 'alterations', description: 'Precision tailoring and fit refinement.' },

  { categorySlug: 'interior-design', name: 'Residential interiors', slug: 'residential-interiors', description: 'Homes, apartments, and bespoke corners.' },
  { categorySlug: 'interior-design', name: 'Commercial interiors', slug: 'commercial-interiors', description: 'Studios, salons, cafes, and workspaces.' },
  { categorySlug: 'interior-design', name: 'Room design', slug: 'room-design', description: 'Single-room styling, lighting, and decor.' },

  { categorySlug: 'graphic-design', name: 'Logos', slug: 'logos', description: 'Distinctive logomarks and brand marks.' },
  { categorySlug: 'graphic-design', name: 'Branding', slug: 'branding', description: 'Visual identity systems, type, and palettes.' },
  { categorySlug: 'graphic-design', name: 'Posters', slug: 'posters', description: 'Editorial print, event posters, and signage.' },
  { categorySlug: 'graphic-design', name: 'Digital designs', slug: 'digital-designs', description: 'Social kits, pitch decks, and digital invites.' },

  { categorySlug: 'photography', name: 'Portraits', slug: 'portraits', description: 'Personal, editorial, and creative portraits.' },
  { categorySlug: 'photography', name: 'Weddings', slug: 'weddings', description: 'Intimate ceremonies, pre-wedding, and candid coverage.' },
  { categorySlug: 'photography', name: 'Events', slug: 'events', description: 'Launches, celebrations, and gatherings.' },
  { categorySlug: 'photography', name: 'Product photography', slug: 'product-photography', description: 'Styled studio shots for brands and artisans.' },
];

export const INITIAL_SUBCATEGORIES: SubcategoryRecord[] = SUBCATEGORY_SPECS.map((item, idx) => ({
  id: item.slug,
  categoryId: item.categorySlug,
  categorySlug: item.categorySlug,
  name: item.name,
  slug: item.slug,
  description: item.description,
  sortOrder: idx + 1,
  active: true,
  createdAt: SEED_TS,
  updatedAt: SEED_TS,
}));

export const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'customers',
    sortOrder: 1,
    question: 'How does posting a request on VEYRA work?',
    answer:
      'Share what you are imagining — select your category, upload reference photos, set your location, preferred date, service mode, and budget range. VEYRA matches your brief with suitable independent professionals so you can compare tailored proposals side by side.',
  },
  {
    id: 'faq-2',
    category: 'customers',
    sortOrder: 2,
    question: 'Are ratings and verification badges on VEYRA verified?',
    answer:
      'Yes. Verification badges appear only after an administrator reviews and approves a professional’s submitted identity and practice credentials. Ratings are calculated strictly from reviews left on eligible completed bookings.',
  },
  {
    id: 'faq-3',
    category: 'bookings',
    sortOrder: 3,
    question: 'How do payments work on VEYRA right now?',
    answer:
      'In this launch release, VEYRA records the agreed proposal price and booking terms transparently inside your booking record, while payment settlement takes place directly offline between customer and professional. VEYRA does not process online card or wallet payments yet.',
  },
  {
    id: 'faq-4',
    category: 'professionals',
    sortOrder: 4,
    question: 'Can professionals serve both at-home and studio or remote requests?',
    answer:
      'Yes. During onboarding and in profile settings, each professional chooses their supported service modes (at-home / on-location, studio / salon visit, or remote) along with their city, service areas, and travel radius.',
  },
  {
    id: 'faq-5',
    category: 'safety',
    sortOrder: 5,
    question: 'Is my street address or phone number visible publicly?',
    answer:
      'No. Public listings and open requests display only city and locality level information. Exact private venue details are restricted and shared only with the booked professional after a proposal is accepted.',
  },
];
