import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const emulatorHost = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';

const rawConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (useEmulators ? 'demo-veyra-api-key' : ''),
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    (useEmulators ? 'demo-veyra.firebaseapp.com' : ''),
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (useEmulators ? 'demo-veyra' : ''),
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (useEmulators ? 'demo-veyra.appspot.com' : ''),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    (useEmulators ? '1:000000000000:web:veyra' : ''),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

function isPlaceholder(value: string): boolean {
  return !value || value.startsWith('your-') || value.includes('YOUR_');
}

export const isFirebaseClientConfigured: boolean =
  useEmulators ||
  (!isPlaceholder(rawConfig.apiKey) &&
    !isPlaceholder(rawConfig.authDomain) &&
    !isPlaceholder(rawConfig.projectId) &&
    !isPlaceholder(rawConfig.appId));

export const isUsingFirebaseEmulators: boolean = useEmulators;

export const isPhoneAuthConfigured: boolean =
  isFirebaseClientConfigured &&
  (process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === 'true' || useEmulators);

export const isPushNotificationsConfigured: boolean =
  isFirebaseClientConfigured &&
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) &&
  !isPlaceholder(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '');

const globalForFirebase = globalThis as typeof globalThis & {
  __VEYRA_EMULATORS_CONNECTED__?: boolean;
  __VEYRA_APPCHECK_INIT__?: boolean;
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured) return null;
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(rawConfig);
  return cachedApp;
}

function attachEmulators(auth: Auth, db: Firestore, storage: FirebaseStorage) {
  if (!useEmulators || globalForFirebase.__VEYRA_EMULATORS_CONNECTED__) return;
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectStorageEmulator(storage, emulatorHost, 9199);
    globalForFirebase.__VEYRA_EMULATORS_CONNECTED__ = true;
  } catch {
    // Already connected during HMR
  }
}

export function getFirebaseServices(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
} | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!cachedAuth) cachedAuth = getAuth(app);
  if (!cachedDb) cachedDb = getFirestore(app);
  if (!cachedStorage) cachedStorage = getStorage(app);

  attachEmulators(cachedAuth, cachedDb, cachedStorage);

  return {
    app,
    auth: cachedAuth,
    db: cachedDb,
    storage: cachedStorage,
  };
}

export async function initClientAppCheckIfConfigured(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (globalForFirebase.__VEYRA_APPCHECK_INIT__) return true;
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY;
  if (!siteKey || isPlaceholder(siteKey) || useEmulators) return false;
  const app = getFirebaseApp();
  if (!app) return false;

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    globalForFirebase.__VEYRA_APPCHECK_INIT__ = true;
    return true;
  } catch {
    return false;
  }
}

export async function requestWebPushToken(): Promise<{
  token: string | null;
  reason?: string;
}> {
  if (typeof window === 'undefined') {
    return { token: null, reason: 'Web push is only available in the browser.' };
  }
  if (!isPushNotificationsConfigured) {
    return {
      token: null,
      reason:
        'Firebase Cloud Messaging VAPID key is not configured. In-app notifications remain active.',
    };
  }
  const app = getFirebaseApp();
  if (!app) {
    return { token: null, reason: 'Firebase client is not configured.' };
  }

  try {
    const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      return {
        token: null,
        reason: 'This browser does not support Firebase Web Push notifications.',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, reason: 'Browser notification permission was not granted.' };
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return { token: token || null };
  } catch (err) {
    return {
      token: null,
      reason: err instanceof Error ? err.message : 'Unable to register push token.',
    };
  }
}
