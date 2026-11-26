'use client';

import * as React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/authentication/AuthContext';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="mb-6 text-center space-y-2">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="font-display text-2xl font-semibold text-[#242331]">Reset password</h1>
        <p className="text-sm text-[#6B6879]">
          Enter your registered email address and we will send a recovery link.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl border border-[#BEEAD6] bg-[#E8F7F0] p-4 text-xs text-[#176846]">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </div>
            <Link href="/auth/login">
              <Button className="w-full">Back to Sign in</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-[#FFF0F3] px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Send Recovery Email
            </Button>
            <p className="text-center text-xs text-[#6B6879]">
              <Link href="/auth/login" className="text-[#5B3EB5] hover:underline">
                Return to Sign in
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
