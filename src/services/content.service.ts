import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { INITIAL_FAQS } from '@/config/categories-seed';
import { SITE_CONFIG } from '@/config/site';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { PlatformSettings, PromotionBanner } from '@/types/domain';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 'public_content',
  announcementText:
    'VEYRA Launch Edition — Post one requirement and receive tailored proposals from independent beauty, styling & creative professionals.',
  announcementActive: true,
  heroTitle: 'Find the right professional for what you imagine.',
  heroSubtitle:
    'Describe your vision, share inspiration images, and compare tailored proposals from makeup artists, stylists, designers, and photographers near you.',
  aboutIntro:
    'VEYRA is a curated marketplace connecting customers with independent beauty, styling, and creative professionals across India. Built as a product of Damayanti Network, a division of Damayanti Crest.',
  supportEmail: SITE_CONFIG.supportEmailPlaceholder,
  contactPlaceholderNote:
    'Official support desk and business registration details are editable by Content Admins via the Admin Portal.',
  featuredCategorySlugs: ['makeup', 'hair', 'mehendi', 'nails', 'skincare-beauty', 'styling'],
  featuredProfessionalIds: [],
  faqs: INITIAL_FAQS,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function fetchPublicContent(): Promise<{
  settings: PlatformSettings;
  promotions: PromotionBanner[];
}> {
  const services = getFirebaseServices();
  if (!services) {
    return { settings: DEFAULT_PLATFORM_SETTINGS, promotions: [] };
  }

  try {
    const [settingsSnap, promosSnap] = await Promise.all([
      getDoc(doc(services.db, 'platformSettings', 'public_content')),
      getDocs(
        query(
          collection(services.db, 'promotions'),
          where('active', '==', true),
          orderBy('sortOrder', 'asc')
        )
      ).catch(() => null),
    ]);

    const settings = settingsSnap.exists()
      ? (settingsSnap.data() as PlatformSettings)
      : DEFAULT_PLATFORM_SETTINGS;

    const promotions = promosSnap
      ? promosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionBanner, 'id'>) }))
      : [];

    return { settings, promotions };
  } catch {
    return { settings: DEFAULT_PLATFORM_SETTINGS, promotions: [] };
  }
}

export async function savePlatformSettingsAdmin(settings: PlatformSettings): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await setDoc(
    doc(services.db, 'platformSettings', 'public_content'),
    { ...settings, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function savePromotionBannerAdmin(banner: PromotionBanner): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await setDoc(
    doc(services.db, 'promotions', banner.id),
    { ...banner, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
