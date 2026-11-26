'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BrandLogo } from '@/components/common/BrandLogo';
import { PhoneAuthForm } from '@/components/common/PhoneAuthForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton } from '@/components/ui/StateBlocks';
import { useAuth } from '@/features/authentication/AuthContext';
import { signInSchema } from '@/lib/validation/schemas';

type SignInValues = z.infer<typeof signInSchema>;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { signInWithEmail, isConfigured } = useAuth();

  const [mode, setMode] = React.useState<'email' | 'phone'>('email');
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
  });

  function redirectAfterLogin(role?: string) {
    if (nextUrl && nextUrl.startsWith('/')) {
      router.replace(nextUrl);
      return;
    }
    if (role === 'admin') router.replace('/admin');
    else if (role === 'professional') router.replace('/professional/dashboard');
    else router.replace('/customer/dashboard');
  }

  async function onSubmit(values: SignInValues) {
    setAuthError(null);
    try {
      const record = await signInWithEmail(values.email, values.password);
      redirectAfterLogin(record?.role);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="mb-6 text-center space-y-2">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#242331]">
          Welcome back to VEYRA
        </h1>
        <p className="text-sm text-[#6B6879]">
          Sign in to manage your requests, proposals, messages, and bookings.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        {!isConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Firebase is not configured yet in <code className="font-mono">.env.local</code>. Configure Firebase web keys or enable emulators to authenticate.
          </div>
        )}

        <div className="grid grid-cols-2 rounded-xl bg-[#F5F0FF] p-1">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
              mode === 'email' ? 'bg-white text-[#242331] shadow-xs' : 'text-[#6B6879]'
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => setMode('phone')}
            className={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
              mode === 'phone' ? 'bg-white text-[#242331] shadow-xs' : 'text-[#6B6879]'
            }`}
          >
            Phone OTP
          </button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <div className="rounded-xl border border-rose-200 bg-[#FFF0F3] px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {authError}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-[#5B3EB5] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        ) : (
          <PhoneAuthForm onSuccess={(role) => redirectAfterLogin(role)} />
        )}

        <p className="border-t border-[#E9E5EF] pt-4 text-center text-xs text-[#6B6879]">
          New to VEYRA?{' '}
          <Link href="/auth/register" className="font-semibold text-[#5B3EB5] hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16">
          <LoadingSkeleton className="h-96" />
        </div>
      }
    >
      <LoginPageInner />
    </React.Suspense>
  );
}
