'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SERVICE_MODE_LABELS } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { proposalSchema } from '@/lib/validation/schemas';
import { getOrCreateConversation } from '@/services/conversations.service';
import { getProfessionalProfile } from '@/services/professionals.service';
import {
  listProfessionalProposals,
  submitOrUpdateProposal,
  withdrawProposal,
} from '@/services/proposals.service';
import { getRequestById } from '@/services/requests.service';
import type { ProfessionalProfile, Proposal, ServiceRequest } from '@/types/domain';

function ProfessionalRequestDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();

  const [request, setRequest] = React.useState<ServiceRequest | null>(null);
  const [pro, setPro] = React.useState<ProfessionalProfile | null>(null);
  const [existingProposal, setExistingProposal] = React.useState<Proposal | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Proposal form
  const [price, setPrice] = React.useState('');
  const [serviceDescription, setServiceDescription] = React.useState('');
  const [includedText, setIncludedText] = React.useState('');
  const [excludedText, setExcludedText] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState('120');
  const [additionalChargesNote, setAdditionalChargesNote] = React.useState('');
  const [proposedDate, setProposedDate] = React.useState('');
  const [proposedTimeWindow, setProposedTimeWindow] = React.useState('Morning / Flexible');
  const [terms, setTerms] = React.useState('');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    async function load() {
      if (!firebaseUser) return;
      setLoading(true);
      const [req, profile, myProps] = await Promise.all([
        getRequestById(params.id).catch(() => null),
        getProfessionalProfile(firebaseUser.uid).catch(() => null),
        listProfessionalProposals(firebaseUser.uid).catch(() => []),
      ]);
      if (!active) return;
      setRequest(req);
      setPro(profile);
      const matchProp = myProps.find((p) => p.requestId === params.id) ?? null;
      setExistingProposal(matchProp);

      if (matchProp) {
        setPrice(String(matchProp.price));
        setServiceDescription(matchProp.serviceDescription);
        setIncludedText(matchProp.includedServices.join('\n'));
        setExcludedText(matchProp.excludedServices.join('\n'));
        setDurationMinutes(String(matchProp.durationMinutes));
        setAdditionalChargesNote(matchProp.additionalChargesNote);
        setProposedDate(matchProp.proposedDate);
        setProposedTimeWindow(matchProp.proposedTimeWindow);
        setTerms(matchProp.terms);
        setMessage(matchProp.message);
      } else if (req) {
        setProposedDate(req.desiredDate);
        setPrice(String(req.budgetMin || 5000));
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [firebaseUser, params.id]);

  async function handleSubmitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !request || !pro) return;

    const includedServices = includedText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const excludedServices = excludedText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed = proposalSchema.safeParse({
      requestId: request.id,
      price: Number(price),
      currency: request.currency || 'INR',
      serviceDescription,
      includedServices,
      excludedServices,
      durationMinutes: Number(durationMinutes),
      additionalChargesNote,
      proposedDate,
      proposedTimeWindow,
      terms,
      message,
    });

    if (!parsed.success) {
      notify({
        tone: 'error',
        title: 'Check proposal details',
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    setSubmitting(true);
    try {
      const saved = await submitOrUpdateProposal(
        {
          requestId: request.id,
          professionalId: firebaseUser.uid,
          customerId: request.customerId,
          professionalSnapshot: {
            displayName: pro.displayName,
            businessName: pro.businessName,
            profilePhotoUrl: pro.profilePhotoUrl,
            isVerified: pro.isVerified,
            ratingAverage: pro.ratingAverage,
            reviewCount: pro.reviewCount,
            city: pro.location.city,
          },
          price: parsed.data.price,
          currency: parsed.data.currency,
          serviceDescription: parsed.data.serviceDescription,
          includedServices: parsed.data.includedServices,
          excludedServices: parsed.data.excludedServices,
          durationMinutes: parsed.data.durationMinutes,
          additionalChargesNote: parsed.data.additionalChargesNote || '',
          proposedDate: parsed.data.proposedDate,
          proposedTimeWindow: parsed.data.proposedTimeWindow,
          terms: parsed.data.terms || '',
          message: parsed.data.message,
        },
        existingProposal?.id
      );
      setExistingProposal(saved);
      notify({
        tone: 'success',
        title: existingProposal ? 'Proposal updated' : 'Proposal submitted!',
        description: 'The customer has been notified.',
      });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not submit proposal',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAskQuestion() {
    if (!request || !firebaseUser || !userRecord) return;
    const conv = await getOrCreateConversation({
      customerId: request.customerId,
      professionalId: firebaseUser.uid,
      customerMeta: { displayName: request.customerName, photoURL: null, role: 'customer' },
      professionalMeta: {
        displayName: pro?.businessName || userRecord.displayName,
        photoURL: pro?.profilePhotoUrl || null,
        role: 'professional',
      },
      type: 'request',
      subjectTitle: request.title,
      requestId: request.id,
    });
    router.push(`/professional/messages?conversationId=${conv.id}`);
  }

  if (loading) return <LoadingSkeleton className="h-[520px]" />;
  if (!request) {
    return (
      <EmptyState
        title="Request unavailable"
        description="This request may be closed, cancelled, or no longer accessible."
        action={
          <Link href="/professional/requests">
            <Button>Back to Request Feed</Button>
          </Link>
        }
      />
    );
  }

  const requestOpen = ['open', 'matching', 'proposals_received', 'shortlisted'].includes(
    request.status
  );
  const canEditProposal =
    requestOpen &&
    (!existingProposal || ['submitted', 'shortlisted'].includes(existingProposal.status));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${request.categoryName} • ${request.subcategoryName}`}
        title={request.title}
        description={`Requested by ${request.customerName} • ${request.location.locality}, ${request.location.city} • ${formatDate(request.desiredDate)}`}
        actions={
          <Button variant="soft" size="sm" onClick={() => void handleAskQuestion()}>
            <MessageSquare className="h-4 w-4" />
            Ask Customer a Question
          </Button>
        }
      />

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Badge tone="lavender" className="capitalize">
            {request.status.replace(/_/g, ' ')}
          </Badge>
          <span className="font-semibold text-[#242331]">
            Customer Budget: {formatCurrency(request.budgetMin)} – {formatCurrency(request.budgetMax)}
            {request.budgetFlexible ? ' (Flexible)' : ''}
          </span>
          <span className="text-[#6B6879]">{SERVICE_MODE_LABELS[request.serviceMode]}</span>
          <span className="text-[#6B6879]">People / Units: {request.peopleCount}</span>
        </div>

        <p className="text-sm leading-relaxed text-[#242331] whitespace-pre-wrap">
          {request.description}
        </p>

        {request.additionalNotes && (
          <p className="text-xs text-[#6B6879]">
            <strong>Additional notes:</strong> {request.additionalNotes}
          </p>
        )}

        {request.referenceImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {request.referenceImages.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt="Customer inspiration"
                className="aspect-square rounded-xl object-cover border border-[#E9E5EF]"
              />
            ))}
          </div>
        )}
      </Card>

      {/* Proposal Builder */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#242331]">
              {existingProposal ? 'Your Submitted Proposal' : 'Build Your Proposal'}
            </h2>
            <p className="text-xs text-[#6B6879]">
              Clearly separate included vs. excluded items so customers can compare fairly.
            </p>
          </div>
          {existingProposal && (
            <Badge tone="lavender" className="capitalize">
              {existingProposal.status}
            </Badge>
          )}
        </div>

        {!pro || pro.isSampleData ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            Complete your studio profile first before submitting proposals.{' '}
            <Link href="/professional/onboarding" className="underline font-semibold">
              Open Setup Wizard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitProposal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Quoted Price (INR)"
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!canEditProposal}
                required
              />
              <Input
                label="Proposed Date"
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                disabled={!canEditProposal}
                required
              />
              <Input
                label="Available Time Window"
                value={proposedTimeWindow}
                onChange={(e) => setProposedTimeWindow(e.target.value)}
                disabled={!canEditProposal}
                required
              />
            </div>

            <Textarea
              label="Proposal Summary"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              disabled={!canEditProposal}
              placeholder="Explain your creative approach, materials/products used, and deliverables..."
              rows={3}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Included Services (one per line)"
                value={includedText}
                onChange={(e) => setIncludedText(e.target.value)}
                disabled={!canEditProposal}
                placeholder={'HD bridal makeup\nHair styling & pinning\nLashes & draping'}
                rows={4}
                required
              />
              <Textarea
                label="Excluded / Optional Add-ons (one per line)"
                value={excludedText}
                onChange={(e) => setExcludedText(e.target.value)}
                disabled={!canEditProposal}
                placeholder={'Travel beyond city limits\nHair extensions purchase'}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Estimated Duration (minutes)"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={!canEditProposal}
                required
              />
              <Input
                label="Additional Charges Note (optional)"
                value={additionalChargesNote}
                onChange={(e) => setAdditionalChargesNote(e.target.value)}
                disabled={!canEditProposal}
                placeholder="e.g., Early morning before 6 AM transport fee if applicable"
              />
            </div>

            <Input
              label="Terms & Conditions (optional)"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={!canEditProposal}
              placeholder="e.g., Direct payment settled on completion date"
            />

            <Textarea
              label="Personal Message to Customer"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!canEditProposal}
              rows={3}
              required
            />

            {canEditProposal && (
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={submitting}>
                  <Send className="h-4 w-4" />
                  {existingProposal ? 'Update Proposal' : 'Submit Proposal'}
                </Button>
                {existingProposal && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      await withdrawProposal(existingProposal.id);
                      setExistingProposal({ ...existingProposal, status: 'withdrawn' });
                      notify({ tone: 'info', title: 'Proposal withdrawn' });
                    }}
                  >
                    Withdraw Proposal
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ProfessionalRequestDetailPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton className="h-[520px]" />}>
      <ProfessionalRequestDetailInner />
    </React.Suspense>
  );
}
