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
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { registerSchema } from '@/lib/validation/schemas';

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole =
    searchParams.get('role') === 'professional' ? 'professional' : 'customer';

  const { registerWithEmail, isConfigured } = useAuth();
  const { notify } = useToast();
  const [authMethod, setAuthMethod] = React.useState<'email' | 'phone'>('email');
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [selectedRole, setSelectedRole] = React.useState<'customer' | 'professional'>(initialRole);

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: initialRole,
    },
  });

  async function onSubmit(values: RegisterValues) {
    setAuthError(null);
    try {
      await registerWithEmail({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
        role: values.role,
      });
      notify({
        tone: 'success',
        title: 'Account created',
        description:
          values.role === 'professional'
            ? 'Let’s finish setting up your professional studio profile.'
            : 'Welcome to VEYRA! Verify your email via the link sent to your inbox.',
      });
      router.replace(
        values.role === 'professional'
          ? '/professional/onboarding'
          : '/customer/dashboard'
      );
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to register.');
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="mb-6 text-center space-y-2">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#242331]">
          Create your VEYRA account
        </h1>
        <p className="text-sm text-[#6B6879]">
          Join as a customer requesting services or an independent professional submitting quotes.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        {!isConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Firebase is not configured yet in <code className="font-mono">.env.local</code>.
          </div>
        )}

        {/* Role Selector (strictly customer or professional; never admin) */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: 'customer' as const,
              title: 'I am a Customer',
              subtitle: 'Post requests & compare quotes',
            },
            {
              value: 'professional' as const,
              title: 'I am a Professional',
              subtitle: 'Receive briefs & grow studio',
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSelectedRole(opt.value);
                setValue('role', opt.value, { shouldValidate: true });
              }}
              className={`rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${
                selectedRole === opt.value
                  ? 'border-[#7655D9] bg-[#F5F0FF]'
                  : 'border-[#E9E5EF] bg-white hover:border-[#7655D9]/40'
              }`}
            >
              <p className="text-sm font-semibold text-[#242331]">{opt.title}</p>
              <p className="text-xs text-[#6B6879] mt-0.5">{opt.subtitle}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-[#F5F0FF] p-1">
          <button
            type="button"
            onClick={() => setAuthMethod('email')}
            className={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
              authMethod === 'email' ? 'bg-white text-[#242331] shadow-xs' : 'text-[#6B6879]'
            }`}
          >
            Register with Email
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('phone')}
            className={`rounded-lg py-2 text-xs font-semibold cursor-pointer ${
              authMethod === 'phone' ? 'bg-white text-[#242331] shadow-xs' : 'text-[#6B6879]'
            }`}
          >
            Register with Phone OTP
          </button>
        </div>

        {authMethod === 'email' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <div className="rounded-xl border border-rose-200 bg-[#FFF0F3] px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {authError}
              </div>
            )}

            <Input
              label="Full Name"
              placeholder="e.g., Ananya Sharma"
              error={errors.displayName?.message}
              {...register('displayName')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="space-y-1">
              <label className="flex items-start gap-2.5 text-xs text-[#6B6879] cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-[#7655D9]"
                  {...register('acceptedTerms')}
                />
                <span>
                  I agree to the VEYRA{' '}
                  <Link href="/legal/terms" className="text-[#5B3EB5] underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/legal/privacy" className="text-[#5B3EB5] underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptedTerms && (
                <p className="text-xs font-medium text-rose-600">
                  {errors.acceptedTerms.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Create {selectedRole === 'professional' ? 'Professional' : 'Customer'} Account
            </Button>
          </form>
        ) : (
          <PhoneAuthForm
            role={selectedRole}
            onSuccess={(resolvedRole) => {
              router.replace(
                resolvedRole === 'professional'
                  ? '/professional/onboarding'
                  : '/customer/dashboard'
              );
            }}
          />
        )}

        <p className="border-t border-[#E9E5EF] pt-4 text-center text-xs text-[#6B6879]">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-[#5B3EB5] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16">
          <LoadingSkeleton className="h-[440px]" />
        </div>
      }
    >
      <RegisterPageInner />
    </React.Suspense>
  );
}
