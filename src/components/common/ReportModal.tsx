'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { submitReport } from '@/services/reports.service';
import type { ReportTargetType } from '@/types/domain';

const REPORT_REASONS = [
  'Misleading or inaccurate profile details',
  'Unauthorised portfolio or fake identity',
  'Inappropriate conduct or harassment',
  'Spam or external solicitation',
  'No-show or service dispute',
  'Other policy violation',
];

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}) {
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();
  const [reason, setReason] = React.useState(REPORT_REASONS[0]!);
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) {
      notify({
        tone: 'error',
        title: 'Sign in required',
        description: 'Please sign in before submitting a moderation report.',
      });
      return;
    }
    if (description.trim().length < 10) {
      notify({
        tone: 'error',
        title: 'More details needed',
        description: 'Please provide at least 10 characters explaining the issue.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        reporterId: firebaseUser.uid,
        reporterRole: userRecord?.role || 'customer',
        targetType,
        targetId,
        reason,
        description,
      });
      notify({
        tone: 'success',
        title: 'Report submitted',
        description: 'Our trust & safety team will review this report.',
      });
      setDescription('');
      onClose();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Unable to submit report',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report ${targetLabel || targetType}`}
      description="Moderation reports are confidential and reviewed by VEYRA Support Admins."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Textarea
          label="Details"
          placeholder="Describe what happened so our moderation team can investigate..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={submitting}>
            Submit report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
