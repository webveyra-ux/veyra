'use client';

import * as React from 'react';
import { BadgeCheck, Lock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUploader, type UploadedItem } from '@/components/ui/ImageUploader';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import {
  getVerificationRecord,
  submitVerificationRecord,
} from '@/services/professionals.service';
import type { VerificationRecord } from '@/types/domain';

export default function ProfessionalVerificationPage() {
  const { firebaseUser } = useAuth();
  const { notify } = useToast();

  const [record, setRecord] = React.useState<VerificationRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const [legalName, setLegalName] = React.useState('');
  const [governmentIdType, setGovernmentIdType] = React.useState('national_id');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = React.useState('');
  const [portfolioProofNote, setPortfolioProofNote] = React.useState('');
  const [docs, setDocs] = React.useState<UploadedItem[]>([]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void getVerificationRecord(firebaseUser.uid)
      .then((rec) => {
        if (!active) return;
        setRecord(rec);
        if (rec) {
          setLegalName(rec.legalName);
          setGovernmentIdType(rec.governmentIdType);
          setBusinessRegistrationNumber(rec.businessRegistrationNumber || '');
          setPortfolioProofNote(rec.portfolioProofNote);
          setDocs(
            rec.documentUrls.map((d) => ({
              id: d.id,
              url: '',
              storagePath: d.storagePath,
              name: d.name,
              mimeType: d.mimeType,
            }))
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    if (docs.length === 0) {
      notify({
        tone: 'error',
        title: 'Document required',
        description: 'Please upload at least one identification or credential document.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitVerificationRecord(firebaseUser.uid, {
        legalName: legalName.trim(),
        governmentIdType,
        businessRegistrationNumber: businessRegistrationNumber.trim(),
        documentUrls: docs.map((d) => ({
          id: d.id,
          name: d.name || 'Verification Document',
          storagePath: d.storagePath,
          mimeType: d.mimeType || 'image/jpeg',
          uploadedAt: new Date().toISOString(),
        })),
        portfolioProofNote: portfolioProofNote.trim(),
      });
      await callAuthedApi('/api/verification/sync-pending', { method: 'POST' });
      setRecord(saved);
      notify({
        tone: 'success',
        title: 'Verification submitted for review',
        description: 'Verification Admins will review your documents shortly.',
      });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton className="h-[440px]" />;

  const status = record?.status || 'not_submitted';
  const canSubmit = ['not_submitted', 'rejected', 'more_info_required'].includes(status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trust & Credentials"
        title="Professional Verification"
        description="Only admin-approved verification displays the Verified badge on VEYRA. Uploaded files are restricted and never public."
      />

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <BadgeCheck className="h-6 w-6 text-[#7655D9] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#242331] capitalize">
              Current Status: {status.replace(/_/g, ' ')}
            </p>
            {record?.reviewerNotes && (
              <p className="text-xs text-[#6B6879] mt-1">
                Admin note: {record.reviewerNotes}
              </p>
            )}
            {record?.rejectionReason && (
              <p className="text-xs text-rose-700 mt-1">
                Reason: {record.rejectionReason}
              </p>
            )}
          </div>
        </div>
        <Badge
          tone={
            status === 'approved'
              ? 'mint'
              : status === 'pending'
                ? 'lavender'
                : status === 'rejected' || status === 'suspended'
                  ? 'danger'
                  : 'neutral'
          }
          className="capitalize"
        >
          {status.replace(/_/g, ' ')}
        </Badge>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-[#5B3EB5] bg-[#F5F0FF] rounded-xl px-3.5 py-2.5">
          <Lock className="h-4 w-4 shrink-0" />
          Documents upload to private path <code className="font-mono">verification/{firebaseUser?.uid}/documents/</code> protected by Firebase Storage security rules.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Legal Full Name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!canSubmit}
              required
            />
            <Select
              label="ID / Credential Type"
              value={governmentIdType}
              onChange={(e) => setGovernmentIdType(e.target.value)}
              disabled={!canSubmit}
            >
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="business_licence">Studio / Trade Licence</option>
            </Select>
          </div>
          <Input
            label="Business / Tax Registration Number (Optional)"
            value={businessRegistrationNumber}
            onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
            disabled={!canSubmit}
          />
          <Textarea
            label="Training, Certifications & Practice Context"
            value={portfolioProofNote}
            onChange={(e) => setPortfolioProofNote(e.target.value)}
            disabled={!canSubmit}
            required
          />

          {firebaseUser && (
            <ImageUploader
              folder={{ type: 'verification_document', uid: firebaseUser.uid }}
              items={docs}
              onChange={setDocs}
              maxFiles={4}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              label="Verification Documents (Images or PDF)"
              disabled={!canSubmit}
            />
          )}

          {canSubmit ? (
            <Button type="submit" loading={submitting}>
              <ShieldCheck className="h-4 w-4" />
              Submit Verification Packet
            </Button>
          ) : (
            <p className="text-xs text-[#6B6879]">
              Your verification packet is locked while status is <strong>{status}</strong>.
            </p>
          )}
        </form>
      </Card>

      {record && record.history.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#242331]">Verification History</h3>
          <div className="space-y-2 text-xs">
            {record.history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[#E9E5EF]/70 pb-2 last:border-none"
              >
                <div>
                  <span className="font-semibold capitalize">{h.status.replace(/_/g, ' ')}</span>
                  {h.note && <span className="text-[#6B6879]"> — {h.note}</span>}
                </div>
                <span className="text-[#6B6879]">{formatDateTime(h.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
