'use client';

import * as React from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getFirebaseServices,
  initClientAppCheckIfConfigured,
  isFirebaseClientConfigured,
} from '@/lib/firebase/client';
import { formatFirebaseError } from '@/lib/firebase/errors';
import { subscribeUserNotifications } from '@/services/notifications.service';
import type {
  AdminLevel,
  AppNotification,
  CustomerProfile,
  ProfessionalProfile,
  UserRecord,
  UserRole,
} from '@/types/domain';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userRecord: UserRecord | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  adminLevel: AdminLevel | null;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  signInWithEmail: (email: string, password: string) => Promise<UserRecord | null>;
  registerWithEmail: (input: {
    displayName: string;
    email: string;
    password: string;
    role: 'customer' | 'professional';
  }) => Promise<UserRecord>;
  ensureUserProvisioned: (
    fbUser: FirebaseUser,
    role?: 'customer' | 'professional',
    displayName?: string
  ) => Promise<UserRecord>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshUserRecord: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const CITY_STORAGE_KEY = 'veyra_selected_city';

async function provisionUserDocuments(
  fbUser: FirebaseUser,
  role: 'customer' | 'professional',
  explicitName?: string
): Promise<UserRecord> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const userRef = doc(services.db, 'users', fbUser.uid);
  const existingSnap = await getDoc(userRef);
  const now = new Date().toISOString();

  if (existingSnap.exists()) {
    return existingSnap.data() as UserRecord;
  }

  const displayName =
    explicitName?.trim() || fbUser.displayName || fbUser.email?.split('@')[0] || 'VEYRA User';

  const newUser: UserRecord = {
    uid: fbUser.uid,
    role,
    displayName,
    email: fbUser.email || null,
    phone: fbUser.phoneNumber || null,
    photoURL: fbUser.photoURL || null,
    accountStatus: 'active',
    emailVerified: fbUser.emailVerified,
    phoneVerified: Boolean(fbUser.phoneNumber),
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      marketingOptIn: false,
      profileVisibility: 'standard',
      showLastActive: true,
    },
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  };

  await setDoc(userRef, newUser);

  if (role === 'customer') {
    const customerDoc: CustomerProfile = {
      uid: fbUser.uid,
      fullName: displayName,
      email: newUser.email,
      phone: newUser.phone,
      photoURL: newUser.photoURL,
      defaultLocation: { city: '', locality: '', country: 'India' },
      preferredCategories: [],
      savedProfessionalIds: [],
      profileCompletion: 35,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(services.db, 'customerProfiles', fbUser.uid), customerDoc, { merge: true });
  } else {
    const proDoc: ProfessionalProfile = {
      uid: fbUser.uid,
      slug: `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fbUser.uid.slice(0, 6).toLowerCase()}`,
      displayName,
      businessName: '',
      headline: '',
      bio: '',
      profilePhotoUrl: newUser.photoURL,
      coverImageUrl: null,
      experienceYears: 0,
      categories: [],
      subcategories: [],
      services: [],
      location: { city: '', locality: '', country: 'India' },
      serviceAreas: [],
      serviceRadiusKm: 15,
      serviceModes: ['at_home'],
      languages: ['English'],
      portfolio: [],
      priceRange: { min: 0, max: 0, currency: 'INR' },
      ratingAverage: 0,
      reviewCount: 0,
      completedBookingsCount: 0,
      responseRate: null,
      avgResponseMinutes: null,
      verificationStatus: 'not_submitted',
      isVerified: false,
      profileStatus: 'draft',
      isFeatured: false,
      onboardingStep: 2,
      onboardingCompleted: false,
      profileCompletion: 15,
      searchTokens: [],
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(services.db, 'professionalProfiles', fbUser.uid), proDoc, { merge: true });
  }

  return newUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = React.useState<FirebaseUser | null>(null);
  const [userRecord, setUserRecord] = React.useState<UserRecord | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminLevel, setAdminLevel] = React.useState<AdminLevel | null>(null);
  const [loading, setLoading] = React.useState(() => Boolean(getFirebaseServices()));
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [selectedCity, setSelectedCityState] = React.useState<string>('');

  React.useEffect(() => {
    void initClientAppCheckIfConfigured();
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(CITY_STORAGE_KEY);
      if (saved) {
        Promise.resolve().then(() => setSelectedCityState(saved));
      }
    }
  }, []);

  const setSelectedCity = React.useCallback((city: string) => {
    setSelectedCityState(city);
    if (typeof window !== 'undefined') {
      if (city) {
        window.localStorage.setItem(CITY_STORAGE_KEY, city);
      } else {
        window.localStorage.removeItem(CITY_STORAGE_KEY);
      }
    }
  }, []);

  const loadSessionRecord = React.useCallback(async (fbUser: FirebaseUser | null) => {
    const services = getFirebaseServices();
    if (!fbUser || !services) {
      setUserRecord(null);
      setIsAdmin(false);
      setAdminLevel(null);
      return null;
    }

    try {
      const [tokenResult, userSnap] = await Promise.all([
        fbUser.getIdTokenResult(),
        getDoc(doc(services.db, 'users', fbUser.uid)),
      ]);

      const claimAdmin = tokenResult.claims.admin === true;
      const claimLevel = (tokenResult.claims.adminLevel as AdminLevel | undefined) ?? null;
      setIsAdmin(claimAdmin && Boolean(claimLevel));
      setAdminLevel(claimAdmin && claimLevel ? claimLevel : null);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserRecord;
        // Override role safely if trusted custom claims identify an admin
        const effectiveRole: UserRole = claimAdmin ? 'admin' : data.role;
        const resolved = { ...data, role: effectiveRole, emailVerified: fbUser.emailVerified };
        setUserRecord(resolved);
        return resolved;
      }

      setUserRecord(null);
      return null;
    } catch {
      setUserRecord(null);
      setIsAdmin(false);
      setAdminLevel(null);
      return null;
    }
  }, []);

  React.useEffect(() => {
    const services = getFirebaseServices();
    if (!services) {
      return;
    }

    const unsub = onAuthStateChanged(services.auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await loadSessionRecord(fbUser);
      setLoading(false);
    });

    return () => unsub();
  }, [loadSessionRecord]);

  React.useEffect(() => {
    if (!firebaseUser) {
      return;
    }
    const unsub = subscribeUserNotifications(firebaseUser.uid, setNotifications);
    return () => unsub();
  }, [firebaseUser]);

  const signInWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const services = getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured. Add credentials in .env.local.');

      try {
        const cred = await signInWithEmailAndPassword(services.auth, email, password);
        const record = await loadSessionRecord(cred.user);
        if (!record) {
          return await provisionUserDocuments(cred.user, 'customer');
        }
        return record;
      } catch (err) {
        throw new Error(formatFirebaseError(err, 'Unable to sign in.'));
      }
    },
    [loadSessionRecord]
  );

  const registerWithEmail = React.useCallback(
    async (input: {
      displayName: string;
      email: string;
      password: string;
      role: 'customer' | 'professional';
    }) => {
      const services = getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured. Add credentials in .env.local.');

      try {
        const cred = await createUserWithEmailAndPassword(
          services.auth,
          input.email,
          input.password
        );
        await updateProfile(cred.user, { displayName: input.displayName.trim() });
        await sendEmailVerification(cred.user).catch(() => undefined);
        const created = await provisionUserDocuments(cred.user, input.role, input.displayName);
        setUserRecord(created);
        return created;
      } catch (err) {
        throw new Error(formatFirebaseError(err, 'Unable to create your account.'));
      }
    },
    []
  );

  const ensureUserProvisioned = React.useCallback(
    async (
      fbUser: FirebaseUser,
      role: 'customer' | 'professional' = 'customer',
      displayName?: string
    ) => {
      const record = await provisionUserDocuments(fbUser, role, displayName);
      setUserRecord(record);
      return record;
    },
    []
  );

  const sendPasswordReset = React.useCallback(async (email: string) => {
    const services = getFirebaseServices();
    if (!services) throw new Error('Firebase is not configured.');
    try {
      await sendPasswordResetEmail(services.auth, email);
    } catch (err) {
      throw new Error(formatFirebaseError(err, 'Unable to send password reset email.'));
    }
  }, []);

  const resendVerificationEmail = React.useCallback(async () => {
    const services = getFirebaseServices();
    if (!services || !services.auth.currentUser) throw new Error('Please sign in first.');
    try {
      await sendEmailVerification(services.auth.currentUser);
    } catch (err) {
      throw new Error(formatFirebaseError(err, 'Unable to send verification email.'));
    }
  }, []);

  const signOutUser = React.useCallback(async () => {
    const services = getFirebaseServices();
    if (!services) return;
    await signOut(services.auth);
    setUserRecord(null);
    setIsAdmin(false);
    setAdminLevel(null);
  }, []);

  const refreshUserRecord = React.useCallback(async () => {
    const services = getFirebaseServices();
    if (!services?.auth.currentUser) return;
    await services.auth.currentUser.reload().catch(() => undefined);
    await loadSessionRecord(services.auth.currentUser);
  }, [loadSessionRecord]);

  const activeNotifications = React.useMemo(
    () => (firebaseUser ? notifications : []),
    [firebaseUser, notifications]
  );

  const unreadNotificationsCount = React.useMemo(
    () => activeNotifications.filter((n) => !n.read).length,
    [activeNotifications]
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userRecord,
        loading,
        isConfigured: isFirebaseClientConfigured,
        isAdmin,
        adminLevel,
        notifications: activeNotifications,
        unreadNotificationsCount,
        selectedCity,
        setSelectedCity,
        signInWithEmail,
        registerWithEmail,
        ensureUserProvisioned,
        sendPasswordReset,
        resendVerificationEmail,
        signOutUser,
        refreshUserRecord,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return ctx;
}
