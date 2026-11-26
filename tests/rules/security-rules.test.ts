import fs from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-veyra-rules-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const firestoreRules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const storageRules = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: firestoreRules,
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: storageRules,
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('VEYRA Firestore & Storage Security Rules', () => {
  it('prevents unauthenticated reads on private user/request/booking data', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', 'cust-1'), {
        uid: 'cust-1',
        role: 'customer',
        accountStatus: 'active',
      });
      await setDoc(doc(db, 'verificationRecords', 'pro-1'), {
        uid: 'pro-1',
        status: 'pending',
        legalName: 'Private Name',
      });
      await setDoc(doc(db, 'bookings', 'book-1'), {
        id: 'book-1',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        status: 'confirmed',
      });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'users', 'cust-1')));
    await assertFails(getDoc(doc(anonDb, 'verificationRecords', 'pro-1')));
    await assertFails(getDoc(doc(anonDb, 'bookings', 'book-1')));
  });

  it('prevents users from granting themselves admin role or changing accountStatus', async () => {
    const attackerDb = testEnv.authenticatedContext('attacker-1').firestore();

    // Cannot create user doc with role: 'admin'
    await assertFails(
      setDoc(doc(attackerDb, 'users', 'attacker-1'), {
        uid: 'attacker-1',
        role: 'admin',
        accountStatus: 'active',
      })
    );

    // Can create customer user doc
    await assertSucceeds(
      setDoc(doc(attackerDb, 'users', 'attacker-1'), {
        uid: 'attacker-1',
        role: 'customer',
        displayName: 'User',
        accountStatus: 'active',
      })
    );

    // Cannot escalate own role to admin afterwards
    await assertFails(
      updateDoc(doc(attackerDb, 'users', 'attacker-1'), {
        role: 'admin',
      })
    );
  });

  it('prevents suspended accounts from creating requests or proposals', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'suspended-1'), {
        uid: 'suspended-1',
        role: 'customer',
        accountStatus: 'suspended',
      });
    });

    const suspDb = testEnv.authenticatedContext('suspended-1').firestore();
    await assertFails(
      setDoc(doc(suspDb, 'requests', 'req-susp'), {
        id: 'req-susp',
        customerId: 'suspended-1',
        status: 'open',
        bookingId: null,
        acceptedProposalId: null,
        budgetMin: 1000,
        budgetMax: 3000,
      })
    );
  });

  it('prevents professionals from self-verifying or forging ratings', async () => {
    const proDb = testEnv.authenticatedContext('pro-1').firestore();

    await assertFails(
      setDoc(doc(proDb, 'professionalProfiles', 'pro-1'), {
        uid: 'pro-1',
        isVerified: true,
        verificationStatus: 'approved',
        isFeatured: false,
        ratingAverage: 0,
        reviewCount: 0,
        completedBookingsCount: 0,
        profileStatus: 'active',
      })
    );

    await assertSucceeds(
      setDoc(doc(proDb, 'professionalProfiles', 'pro-1'), {
        uid: 'pro-1',
        isVerified: false,
        verificationStatus: 'not_submitted',
        isFeatured: false,
        ratingAverage: 0,
        reviewCount: 0,
        completedBookingsCount: 0,
        profileStatus: 'active',
      })
    );

    await assertFails(
      updateDoc(doc(proDb, 'professionalProfiles', 'pro-1'), {
        ratingAverage: 5,
        reviewCount: 10,
      })
    );
  });

  it('protects request privateDetails from non-booked browsing professionals', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'professionalProfiles', 'pro-browsing'), {
        uid: 'pro-browsing',
        profileStatus: 'active',
      });
      await setDoc(doc(db, 'requests', 'req-priv'), {
        id: 'req-priv',
        customerId: 'cust-1',
        status: 'open',
        bookingId: null,
      });
      await setDoc(doc(db, 'requests', 'req-priv', 'privateDetails', 'contact'), {
        exactAddress: 'Flat 402, Secret Villa',
      });
    });

    const proDb = testEnv.authenticatedContext('pro-browsing').firestore();
    await assertSucceeds(getDoc(doc(proDb, 'requests', 'req-priv')));
    await assertFails(getDoc(doc(proDb, 'requests', 'req-priv', 'privateDetails', 'contact')));

    const custDb = testEnv.authenticatedContext('cust-1').firestore();
    await assertSucceeds(getDoc(doc(custDb, 'requests', 'req-priv', 'privateDetails', 'contact')));
  });

  it('prevents duplicate booking acceptance or client-side booking creation, and enforces single review per completed booking', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'professionalProfiles', 'pro-1'), {
        uid: 'pro-1',
        profileStatus: 'active',
      });
      await setDoc(doc(db, 'requests', 'req-1'), {
        id: 'req-1',
        customerId: 'cust-1',
        status: 'open',
        bookingId: null,
      });
      await setDoc(doc(db, 'proposals', 'prop-1'), {
        id: 'prop-1',
        requestId: 'req-1',
        professionalId: 'pro-1',
        customerId: 'cust-1',
        price: 9000,
        status: 'submitted',
      });
      await setDoc(doc(db, 'bookings', 'book-open'), {
        id: 'book-open',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        status: 'confirmed',
      });
      await setDoc(doc(db, 'bookings', 'book-done'), {
        id: 'book-done',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        status: 'completed',
      });
    });

    const custDb = testEnv.authenticatedContext('cust-1').firestore();

    // Client cannot directly accept proposal or create booking directly
    await assertFails(updateDoc(doc(custDb, 'proposals', 'prop-1'), { status: 'accepted' }));
    await assertFails(
      setDoc(doc(custDb, 'bookings', 'fake-book'), {
        id: 'fake-book',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        status: 'completed',
      })
    );

    // Cannot review a non-completed booking
    await assertFails(
      setDoc(doc(custDb, 'reviews', 'booking_book-open'), {
        id: 'booking_book-open',
        bookingId: 'book-open',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        overallRating: 5,
        serviceQuality: 5,
        professionalism: 5,
        communication: 5,
        punctuality: 5,
        comment: 'Too early review',
        moderationStatus: 'published',
        professionalResponse: null,
      })
    );

    // Cannot submit review at non-deterministic ID (prevents duplicates)
    await assertFails(
      setDoc(doc(custDb, 'reviews', 'random-id'), {
        id: 'random-id',
        bookingId: 'book-done',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        overallRating: 5,
        serviceQuality: 5,
        professionalism: 5,
        communication: 5,
        punctuality: 5,
        comment: 'Duplicate attempt',
        moderationStatus: 'published',
        professionalResponse: null,
      })
    );

    // Valid deterministic review for completed booking succeeds
    await assertSucceeds(
      setDoc(doc(custDb, 'reviews', 'booking_book-done'), {
        id: 'booking_book-done',
        bookingId: 'book-done',
        customerId: 'cust-1',
        professionalId: 'pro-1',
        overallRating: 5,
        serviceQuality: 5,
        professionalism: 5,
        communication: 5,
        punctuality: 5,
        comment: 'Wonderful service and punctual arrival.',
        moderationStatus: 'published',
        professionalResponse: null,
      })
    );
  });

  it('restricts conversations to participants and enforces Storage rules on verification documents & MIME types', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'conversations', 'conv-1'), {
        id: 'conv-1',
        participantIds: ['cust-1', 'pro-1'],
        status: 'active',
      });
    });

    const outsiderDb = testEnv.authenticatedContext('outsider-1').firestore();
    await assertFails(getDoc(doc(outsiderDb, 'conversations', 'conv-1')));

    // Verification storage documents blocked for public/outsiders, allowed for owner & verification admin
    const proStorage = testEnv.authenticatedContext('pro-1').storage();
    const outsiderStorage = testEnv.authenticatedContext('outsider-1').storage();
    const adminStorage = testEnv
      .authenticatedContext('admin-1', { admin: true, adminLevel: 'verification_admin' })
      .storage();

    await assertSucceeds(
      uploadString(ref(proStorage, 'verification/pro-1/documents/id.png'), 'fake-png-bytes', 'raw', {
        contentType: 'image/png',
      })
    );
    // Reject invalid executable upload
    await assertFails(
      uploadString(ref(proStorage, 'users/pro-1/profile/malware.js'), 'console.log(1)', 'raw', {
        contentType: 'application/javascript',
      })
    );
    await assertFails(getBytes(ref(outsiderStorage, 'verification/pro-1/documents/id.png')));
    await assertSucceeds(getBytes(ref(adminStorage, 'verification/pro-1/documents/id.png')));
  });

  it('enforces admin custom claim boundaries on categories and auditLogs', async () => {
    const regularDb = testEnv.authenticatedContext('user-1').firestore();
    const adminDb = testEnv
      .authenticatedContext('admin-1', { admin: true, adminLevel: 'super_admin' })
      .firestore();

    await assertFails(
      setDoc(doc(regularDb, 'categories', 'makeup'), { name: 'Makeup', active: true })
    );
    await assertSucceeds(
      setDoc(doc(adminDb, 'categories', 'makeup'), { name: 'Makeup', active: true })
    );
    await assertFails(getDoc(doc(regularDb, 'auditLogs', 'log-1')));
    await assertSucceeds(getDoc(doc(adminDb, 'auditLogs', 'log-1')));
  });
});
