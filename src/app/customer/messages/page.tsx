'use client';

import { MessagingWorkspace } from '@/components/common/MessagingWorkspace';
import { PageHeader } from '@/components/ui/StateBlocks';

export default function CustomerMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        description="Real-time chat with professionals about your requests, proposals, and confirmed bookings."
      />
      <MessagingWorkspace />
    </div>
  );
}
