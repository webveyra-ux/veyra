'use client';

import * as React from 'react';
import { Mail, MessageSquareHeart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { SITE_CONFIG } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { submitReport } from '@/services/reports.service';

export default function ContactPage() {
  const { firebaseUser, userRecord } = useAuth();
  const { notify } = useToast();
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) {
      notify({
        tone: 'info',
        title: 'Sign in required for tracked support tickets',
        description: 'Please sign in so our Support Admins can respond directly to your account.',
      });
      return;
    }
    if (subject.trim().length < 3 || message.trim().length < 10) {
      notify({
        tone: 'error',
        title: 'Please complete both subject and message',
      });
      return;
    }

    setSending(true);
    try {
      await submitReport({
        reporterId: firebaseUser.uid,
        reporterRole: userRecord?.role || 'customer',
        targetType: 'content',
        targetId: 'support_inquiry',
        reason: `Support inquiry: ${subject.trim()}`,
        description: message.trim(),
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
      notify({
        tone: 'success',
        title: 'Support inquiry recorded',
        description: 'Our Support Admin queue has logged your request.',
      });
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Unable to send support ticket',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        eyebrow="Contact VEYRA"
        title="Support & Inquiries"
        description="Reach the VEYRA support team or submit an account / marketplace inquiry directly into our moderation queue."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="p-6 md:col-span-5 space-y-4 bg-[#F5F0FF]/50">
          <Mail className="h-6 w-6 text-[#7655D9]" />
          <h2 className="text-lg font-semibold text-[#242331]">Official Contact Placeholders</h2>
          <div className="space-y-3 text-sm text-[#6B6879]">
            <div>
              <p className="font-semibold text-[#242331]">Support Email</p>
              <p className="text-xs">{SITE_CONFIG.supportEmailPlaceholder}</p>
            </div>
            <div>
              <p className="font-semibold text-[#242331]">Registered Office Address</p>
              <p className="text-xs">[Insert company legal address — Damayanti Network / Damayanti Crest]</p>
            </div>
            <div>
              <p className="font-semibold text-[#242331]">Support Phone</p>
              <p className="text-xs">[Insert official support phone if applicable]</p>
            </div>
          </div>
          <p className="text-xs text-[#6B6879] border-t border-[#E9E5EF] pt-3">
            Note: Placeholder details can be updated by Content Admins before public launch.
          </p>
        </Card>

        <Card className="p-6 md:col-span-7">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareHeart className="h-5 w-5 text-[#7655D9]" />
            <h2 className="text-lg font-semibold text-[#242331]">Send a Support Ticket</h2>
          </div>

          {submitted && (
            <div className="mb-4 rounded-xl border border-[#BEEAD6] bg-[#E8F7F0] px-4 py-3 text-xs text-[#176846]">
              Ticket logged in Firestore (`reports` queue) for Support Admin review.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Subject"
              placeholder="e.g., Verification question or booking help"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Textarea
              label="Message"
              placeholder="Describe how we can help..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button type="submit" loading={sending}>
              Submit Support Ticket
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
