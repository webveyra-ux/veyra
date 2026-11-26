'use client';

import { MessagingWorkspace } from '@/components/common/MessagingWorkspace';
import { PageHeader } from '@/components/ui/StateBlocks';

export default function ProfessionalMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Client Conversations"
        description="Clarify requirements, discuss proposals, and coordinate confirmed bookings."
      />
      <MessagingWorkspace />
    </div>
  );
}
