import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { ADMIN_LEVEL_PERMISSIONS } from '@/config/design-tokens';
import type { AdminLevel, AdminPermission, UserRecord } from '@/types/domain';

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

function isConfiguredValue(val?: string): boolean {
  return Boolean(val && !val.startsWith('your-') && !val.includes('YOUR_'));
}

export function isFirebaseAdminConfigured(): boolean {
  if (useEmulators || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return true;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  return (
    isConfiguredValue(process.env.FIREBASE_PROJECT_ID) &&
    isConfiguredValue(process.env.FIREBASE_CLIENT_EMAIL) &&
    isConfiguredValue(process.env.FIREBASE_PRIVATE_KEY)
  );
}

let cachedAdminApp: App | null = null;

export function getAdminApp(): App {
  if (cachedAdminApp) return cachedAdminApp;
  if (getApps().length > 0) {
    cachedAdminApp = getApps()[0]!;
    return cachedAdminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    (useEmulators ? 'demo-veyra' : undefined);

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined);

  if (useEmulators) {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:9099`;
    }
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = `${host}:8080`;
    }
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${host}:9199`;
    }
    cachedAdminApp = initializeApp({ projectId, storageBucket });
    return cachedAdminApp;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (isConfiguredValue(projectId) && isConfiguredValue(clientEmail) && isConfiguredValue(privateKey)) {
    cachedAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket,
    });
    return cachedAdminApp;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    cachedAdminApp = initializeApp({ projectId, storageBucket });
    return cachedAdminApp;
  }

  throw new Error(
    'Firebase Admin SDK is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or enable emulators).'
  );
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export interface AuthenticatedContext {
  uid: string;
  token: DecodedIdToken;
  user: UserRecord | null;
}

export async function verifyRequestAuth(
  request: Request,
  options: { requireActiveAccount?: boolean } = {}
): Promise<AuthenticatedContext> {
  if (!isFirebaseAdminConfigured()) {
    throw new HttpError(
      503,
      'Server Firebase credentials are not configured. Set server environment variables to enable trusted operations.'
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required.');
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    throw new HttpError(401, 'Invalid authentication token.');
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken, true);
  } catch {
    throw new HttpError(401, 'Session expired or invalid. Please sign in again.');
  }

  const db = getAdminDb();
  const userSnap = await db.collection('users').doc(decoded.uid).get();
  const userData = userSnap.exists ? (userSnap.data() as UserRecord) : null;

  if (options.requireActiveAccount !== false && userData) {
    if (userData.accountStatus === 'suspended') {
      throw new HttpError(403, 'Your account is currently suspended. Contact support for assistance.');
    }
    if (userData.accountStatus === 'deleted_pending' || userData.accountStatus === 'anonymized') {
      throw new HttpError(403, 'This account is no longer active.');
    }
  }

  return {
    uid: decoded.uid,
    token: decoded,
    user: userData,
  };
}

export async function verifyAdminAuth(
  request: Request,
  requiredPermission?: AdminPermission
): Promise<AuthenticatedContext & { adminLevel: AdminLevel }> {
  const ctx = await verifyRequestAuth(request);
  const isClaimAdmin = ctx.token.admin === true;
  const adminLevel = ctx.token.adminLevel as AdminLevel | undefined;

  if (!isClaimAdmin || !adminLevel || !(adminLevel in ADMIN_LEVEL_PERMISSIONS)) {
    throw new HttpError(403, 'Administrator privileges are required.');
  }

  const db = getAdminDb();
  const adminRoleDoc = await db.collection('adminRoles').doc(ctx.uid).get();
  if (adminRoleDoc.exists && adminRoleDoc.data()?.active === false) {
    throw new HttpError(403, 'This administrator role has been deactivated.');
  }

  if (requiredPermission) {
    const allowedPerms = ADMIN_LEVEL_PERMISSIONS[adminLevel] as readonly AdminPermission[];
    const customPerms = adminRoleDoc.exists
      ? ((adminRoleDoc.data()?.permissions as AdminPermission[] | undefined) ?? allowedPerms)
      : allowedPerms;
    if (!allowedPerms.includes(requiredPermission) && !customPerms.includes(requiredPermission)) {
      throw new HttpError(403, `Missing required admin permission: ${requiredPermission}.`);
    }
  }

  return {
    ...ctx,
    adminLevel,
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  console.error('[VEYRA API Error]', err);
  return Response.json(
    { error: process.env.NODE_ENV === 'development' ? message : 'Unable to complete request right now.' },
    { status: 500 }
  );
}
