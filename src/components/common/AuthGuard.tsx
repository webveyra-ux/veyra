'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton } from '@/components/ui/StateBlocks';
import { useAuth } from '@/features/authentication/AuthContext';
import type { UserRole } from '@/types/domain';

function AuthGuardInner({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { firebaseUser, userRecord, isAdmin, loading, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading || !isConfigured) return;
    if (!firebaseUser) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [firebaseUser, isConfigured, loading, pathname, router]);

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-700 mx-auto" />
          <h2 className="text-lg font-semibold text-[#242331]">
            Firebase Configuration Required
          </h2>
          <p className="text-sm text-[#6B6879]">
            Add your Firebase web credentials (or enable{' '}
            <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">
              NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
            </code>
            ) in <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">.env.local</code> to use authenticated accounts, dashboards, and database writes.
          </p>
          <div className="pt-2">
            <Link href="/explore">
              <Button variant="outline">Browse Public Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !firebaseUser) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <LoadingSkeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingSkeleton className="h-36" />
          <LoadingSkeleton className="h-36" />
          <LoadingSkeleton className="h-36" />
        </div>
      </div>
    );
  }

  if (userRecord?.accountStatus === 'suspended') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-[#242331]">Account Suspended</h1>
        <p className="text-sm text-[#6B6879]">
          Your VEYRA account is currently suspended by moderation. Please contact support for review.
        </p>
        <Link href="/contact">
          <Button variant="outline">Contact Support</Button>
        </Link>
      </div>
    );
  }

  const effectiveRole: UserRole = isAdmin ? 'admin' : userRecord?.role || 'customer';
  const permitted =
    allowedRoles.includes(effectiveRole) || (isAdmin && allowedRoles.includes('admin'));

  if (!permitted) {
    const homeHref = isAdmin
      ? '/admin'
      : effectiveRole === 'professional'
        ? '/professional/dashboard'
        : '/customer/dashboard';
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE5FF] text-[#5B3EB5]">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-[#242331]">Access Restricted</h1>
        <p className="text-sm text-[#6B6879]">
          This workspace requires {allowedRoles.join(' or ')} permissions. Your active account role is{' '}
          <strong className="capitalize">{effectiveRole}</strong>.
        </p>
        <div className="flex justify-center gap-3">
          <Link href={homeHref}>
            <Button>Go to your dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10">
          <LoadingSkeleton className="h-64" />
        </div>
      }
    >
      <AuthGuardInner allowedRoles={allowedRoles}>{children}</AuthGuardInner>
    </React.Suspense>
  );
}
