import { headers } from 'next/headers';
import {
  isFirebaseClientConfigured,
  isPhoneAuthConfigured,
  isPushNotificationsConfigured,
} from '@/lib/firebase/client';
import { isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import { mapsProvider } from '@/lib/maps/provider';

export async function GET() {
  await headers();
  return Response.json({
    ok: true,
    service: 'veyra-marketplace',
    capabilities: {
      firebaseClientConfigured: isFirebaseClientConfigured,
      firebaseAdminConfigured: isFirebaseAdminConfigured(),
      phoneAuthConfigured: isPhoneAuthConfigured,
      pushNotificationsConfigured: isPushNotificationsConfigured,
      mapsConfigured: mapsProvider.getStatus().configured,
      paymentsEnabled: false,
      aiFeaturesEnabled: false,
    },
    timestamp: new Date().toISOString(),
  });
}
