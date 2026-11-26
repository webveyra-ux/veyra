/**
 * Seeds initial VEYRA categories, subcategories, and public platformSettings into Firestore.
 * Usage: npx tsx scripts/seed-categories.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_CATEGORIES, INITIAL_FAQS, INITIAL_SUBCATEGORIES } from '../src/config/categories-seed';
import { SITE_CONFIG } from '../src/config/site';
import { getAdminDb } from '../src/lib/firebase/admin';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const db = getAdminDb();
  const batch = db.batch();

  for (const cat of INITIAL_CATEGORIES) {
    batch.set(db.collection('categories').doc(cat.id), cat, { merge: true });
  }
  for (const sub of INITIAL_SUBCATEGORIES) {
    batch.set(db.collection('subcategories').doc(sub.id), sub, { merge: true });
  }

  batch.set(
    db.collection('platformSettings').doc('public_content'),
    {
      id: 'public_content',
      announcementText:
        'VEYRA Launch Edition — Post one requirement and receive tailored proposals from independent beauty, styling & creative professionals.',
      announcementActive: true,
      heroTitle: SITE_CONFIG.shortMarketingLine,
      heroSubtitle:
        'Describe your vision, share inspiration images, and compare tailored proposals from makeup artists, stylists, designers, and photographers near you.',
      aboutIntro: SITE_CONFIG.description,
      supportEmail: SITE_CONFIG.supportEmailPlaceholder,
      contactPlaceholderNote:
        'Official support desk and business registration details are editable by Content Admins via the Admin Portal.',
      featuredCategorySlugs: ['makeup', 'hair', 'mehendi', 'nails', 'skincare-beauty', 'styling'],
      featuredProfessionalIds: [],
      faqs: INITIAL_FAQS,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await batch.commit();
  console.log(
    `Seeded ${INITIAL_CATEGORIES.length} categories, ${INITIAL_SUBCATEGORIES.length} subcategories, and platformSettings.`
  );
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
