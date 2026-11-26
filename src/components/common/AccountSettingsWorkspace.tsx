'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Lock, MailCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { isPushNotificationsConfigured, requestWebPushToken } from '@/lib/firebase/client';
import { formatFirebaseError } from '@/lib/firebase/errors';
import { callAuthedApi } from '@/services/api-client';
import { updateUserPreferences } from '@/services/customers.service';
import type { UserPreferences } from '@/types/domain';

export function AccountSettingsWorkspace() {
  const router = useRouter();
  const { firebaseUser, userRecord, resendVerificationEmail, refreshUserRecord, signOutUser } =
    useAuth();
  const { notify } = useToast();

  const [draftPrefs, setDraftPrefs] = React.useState<UserPreferences | null>(null);
  const prefs: UserPreferences = draftPrefs ??
    userRecord?.preferences ?? {
      emailNotifications: true,
      pushNotifications: false,
      marketingOptIn: false,
      profileVisibility: 'standard',
      showLastActive: true,
    };
  const setPrefs = (updater: (prev: UserPreferences) => UserPreferences) => {
    setDraftPrefs(updater(prefs));
  };
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [reauthPassword, setReauthPassword] = React.useState('');
  const [confirmPhrase, setConfirmPhrase] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    setSavingPrefs(true);
    try {
      await updateUserPreferences(firebaseUser.uid, prefs);
      await refreshUserRecord();
      notify({ tone: 'success', title: 'Notification & privacy settings saved' });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    if (confirmPhrase !== 'DELETE MY VEYRA ACCOUNT') {
      notify({
        tone: 'error',
        title: 'Confirmation phrase does not match',
        description: 'Type DELETE MY VEYRA ACCOUNT exactly to proceed.',
      });
      return;
    }

    setDeleting(true);
    try {
      if (firebaseUser.email && reauthPassword.trim()) {
        const cred = EmailAuthProvider.credential(firebaseUser.email, reauthPassword);
        await reauthenticateWithCredential(firebaseUser, cred);
      }

      await callAuthedApi('/api/account/delete', {
        method: 'POST',
        body: { confirmationPhrase: confirmPhrase },
      });

      await signOutUser();
      notify({
        tone: 'success',
        title: 'Account deleted',
        description: 'Your personal profile data has been removed or anonymised.',
      });
      router.replace('/');
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Account deletion failed',
        description: formatFirebaseError(err, 'Please verify your credentials and try again.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Notifications, Privacy & Account"
        description="Manage alert channels, visibility preferences, email verification, and permanent account deletion."
      />

      {/* Email verification status */}
      {firebaseUser?.email && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {firebaseUser.emailVerified ? (
              <CheckCircle2 className="h-5 w-5 text-[#176846] mt-0.5 shrink-0" />
            ) : (
              <MailCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold text-[#242331]">
                Email Verification: {firebaseUser.emailVerified ? 'Verified' : 'Pending'}
              </p>
              <p className="text-xs text-[#6B6879]">{firebaseUser.email}</p>
            </div>
          </div>
          {!firebaseUser.emailVerified && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await resendVerificationEmail();
                notify({ tone: 'success', title: 'Verification email sent' });
              }}
            >
              Resend Verification Email
            </Button>
          )}
        </Card>
      )}

      {/* Notification & Privacy Settings */}
      <Card className="p-6">
        <form onSubmit={handleSavePreferences} className="space-y-4">
          <h2 className="text-base font-semibold text-[#242331]">
            Notifications &amp; Privacy Preferences
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-[#E9E5EF] p-3.5 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[#242331]">Email Updates</p>
                <p className="text-xs text-[#6B6879]">
                  Receive proposal, booking, and account alerts by email where configured.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.emailNotifications}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, emailNotifications: e.target.checked }))
                }
                className="h-4 w-4 accent-[#7655D9]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-[#E9E5EF] p-3.5 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[#242331]">Web Push Notifications</p>
                <p className="text-xs text-[#6B6879]">
                  {isPushNotificationsConfigured
                    ? 'Enable browser notifications via Firebase Cloud Messaging.'
                    : 'Requires VAPID key in environment configuration. In-app alerts remain active.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.pushNotifications}
                disabled={!isPushNotificationsConfigured}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    const res = await requestWebPushToken();
                    if (!res.token) {
                      notify({ tone: 'info', title: 'Push unavailable', description: res.reason });
                      return;
                    }
                  }
                  setPrefs((p) => ({ ...p, pushNotifications: checked }));
                }}
                className="h-4 w-4 accent-[#7655D9]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-[#E9E5EF] p-3.5 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[#242331]">Show Recently Active Status</p>
                <p className="text-xs text-[#6B6879]">
                  Allow recent activity signals to help rank responsiveness.
                </p>
              </div>
              <input
                type="checkbox"
                checked={prefs.showLastActive}
                onChange={(e) => setPrefs((p) => ({ ...p, showLastActive: e.target.checked }))}
                className="h-4 w-4 accent-[#7655D9]"
              />
            </label>

            <Select
              label="Profile Privacy Level"
              value={prefs.profileVisibility}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  profileVisibility: e.target.value as 'standard' | 'minimal',
                }))
              }
            >
              <option value="standard">Standard marketplace visibility</option>
              <option value="minimal">Minimal visibility (display first name / studio only)</option>
            </Select>
          </div>

          <Button type="submit" loading={savingPrefs}>
            Save Preferences
          </Button>
        </form>
      </Card>

      {/* Account Deletion */}
      <Card className="border-rose-200 bg-[#FFF0F3]/40 p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
          <Lock className="h-4 w-4" />
          Permanent Account Deletion
        </div>
        <p className="text-xs leading-relaxed text-[#6B6879]">
          Deleting your account permanently removes your profile, saved addresses, shortlists, notifications, and private verification documents. Historical confirmed bookings and reviews are anonymised rather than fabricated or silently erased in accordance with our Privacy Policy retention notice.
        </p>
        <div>
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Request Account Deletion
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deletion"
        description="This action cannot be undone. Reauthenticate and confirm below."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Your Firebase Auth account, profile documents, and uploaded personal/verification Storage assets will be removed immediately.
            </span>
          </div>

          {firebaseUser?.email && (
            <Input
              label="Current Password (for reauthentication)"
              type="password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          )}

          <Input
            label='Type "DELETE MY VEYRA ACCOUNT" to confirm'
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder="DELETE MY VEYRA ACCOUNT"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={deleting}>
              Permanently Delete Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
