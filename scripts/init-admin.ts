/**
 * VEYRA Trusted Admin Bootstrap Script
 * -----------------------------------------------------------------------------
 * Grants Super Admin (or specified AdminLevel) Firebase Custom Claims to an
 * existing Firebase Auth user and creates their `adminRoles/{uid}` record.
 *
 * Usage:
 *   npx tsx scripts/init-admin.ts --email admin@example.com --level super_admin
 *
 * Prerequisites:
 *   - Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *     (or GOOGLE_APPLICATION_CREDENTIALS / Firebase Emulators) in .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_LEVEL_PERMISSIONS } from '../src/config/design-tokens';
import { getAdminAuth, getAdminDb } from '../src/lib/firebase/admin';
import type { AdminLevel } from '../src/types/domain';

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

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  loadEnvLocal();
  const email = getArg('--email');
  const levelArg = (getArg('--level') || 'super_admin') as AdminLevel;

  if (!email) {
    console.error('Usage: npx tsx scripts/init-admin.ts --email <user-email> [--level super_admin]');
    process.exit(1);
  }

  if (!(levelArg in ADMIN_LEVEL_PERMISSIONS)) {
    console.error(`Invalid --level "${levelArg}". Allowed: ${Object.keys(ADMIN_LEVEL_PERMISSIONS).join(', ')}`);
    process.exit(1);
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  const user = await auth.getUserByEmail(email);
  const now = new Date().toISOString();

  await auth.setCustomUserClaims(user.uid, {
    admin: true,
    adminLevel: levelArg,
  });

  await db.collection('adminRoles').doc(user.uid).set({
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName || email,
    adminLevel: levelArg,
    permissions: [...ADMIN_LEVEL_PERMISSIONS[levelArg]],
    active: true,
    assignedBy: 'cli-bootstrap',
    createdAt: now,
    updatedAt: now,
  });

  await db
    .collection('users')
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        role: 'admin',
        displayName: user.displayName || email,
        email: user.email || email,
        phone: user.phoneNumber || null,
        photoURL: user.photoURL || null,
        accountStatus: 'active',
        emailVerified: user.emailVerified,
        phoneVerified: Boolean(user.phoneNumber),
        preferences: {
          emailNotifications: true,
          pushNotifications: false,
          marketingOptIn: false,
          profileVisibility: 'minimal',
          showLastActive: false,
        },
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
      },
      { merge: true }
    );

  await db.collection('auditLogs').doc().set({
    action: 'admin_bootstrapped',
    adminId: user.uid,
    adminEmail: user.email || email,
    affectedEntity: 'adminRole',
    affectedEntityId: user.uid,
    afterSummary: levelArg,
    details: `Bootstrapped ${levelArg} via scripts/init-admin.ts`,
    createdAt: now,
  });

  console.log(`Assigned ${levelArg} privileges to ${email} (uid=${user.uid}).`);
  console.log('Ask the admin user to sign out and sign back in to refresh their ID token claims.');
}

main().catch((err) => {
  console.error('Failed to bootstrap admin:', err);
  process.exit(1);
});
