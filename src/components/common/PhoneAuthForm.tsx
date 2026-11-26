'use client';

import * as React from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { AlertCircle, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/authentication/AuthContext';
import { getFirebaseServices, isPhoneAuthConfigured } from '@/lib/firebase/client';
import { formatFirebaseError } from '@/lib/firebase/errors';

export function PhoneAuthForm({
  role = 'customer',
  onSuccess,
}: {
  role?: 'customer' | 'professional';
  onSuccess: (resolvedRole: 'customer' | 'professional' | 'admin') => void;
}) {
  const { ensureUserProvisioned } = useAuth();
  const [phone, setPhone] = React.useState('+91');
  const [otp, setOtp] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [confirmation, setConfirmation] = React.useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const recaptchaRef = React.useRef<RecaptchaVerifier | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  React.useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  if (!isPhoneAuthConfigured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Phone OTP requires Firebase Phone Provider configuration
        </div>
        <p>
          To enable real SMS verification on VEYRA, enable <strong>Phone</strong> in Firebase Authentication &rarr; Sign-in method, register your authorized domain, link Firebase billing if required for SMS regions, and set{' '}
          <code className="rounded bg-white px-1 py-0.5 font-mono">
            NEXT_PUBLIC_ENABLE_PHONE_AUTH=true
          </code>{' '}
          (or test locally using Firebase Auth Emulator).
        </p>
      </div>
    );
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const services = getFirebaseServices();
    if (!services) {
      setError('Firebase client is not configured.');
      return;
    }

    setError(null);
    setSending(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(services.auth, 'veyra-recaptcha-container', {
          size: 'invisible',
        });
      }
      const result = await signInWithPhoneNumber(
        services.auth,
        phone.trim(),
        recaptchaRef.current
      );
      setConfirmation(result);
      setCooldown(60);
    } catch (err) {
      setError(formatFirebaseError(err, 'Could not send OTP to this phone number.'));
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmation) return;
    setError(null);
    setVerifying(true);
    try {
      const cred = await confirmation.confirm(otp.trim());
      const userRecord = await ensureUserProvisioned(cred.user, role, displayName);
      onSuccess(userRecord.role);
    } catch (err) {
      setError(formatFirebaseError(err, 'Invalid or expired OTP code.'));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div id="veyra-recaptcha-container" />
      {error && (
        <div className="rounded-xl border border-rose-200 bg-[#FFF0F3] px-3.5 py-2.5 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {!confirmation ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <Input
            label="Full Name (for new accounts)"
            placeholder="Your full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            label="Phone Number (with country code)"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={sending}>
            <Phone className="h-4 w-4" />
            Send Verification OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-xs text-[#6B6879]">
            Enter the 6-digit verification code sent to <strong>{phone}</strong>.
          </p>
          <Input
            label="6-Digit OTP Code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" loading={verifying}>
            Verify &amp; Continue
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setConfirmation(null);
                setOtp('');
              }}
              className="text-[#6B6879] hover:text-[#242331] cursor-pointer"
            >
              Change phone number
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={handleSendOtp}
              className="inline-flex items-center gap-1 font-medium text-[#5B3EB5] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
