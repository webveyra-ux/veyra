'use client';

import * as React from 'react';
import { PostRequirementWizard } from '@/components/customer/PostRequirementWizard';
import { LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';

export default function NewRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Post a Requirement"
        title="Tell professionals what you imagine"
        description="Save a draft at any step or submit to notify matched beauty, styling, and creative specialists."
      />
      <React.Suspense fallback={<LoadingSkeleton className="h-[460px]" />}>
        <PostRequirementWizard />
      </React.Suspense>
    </div>
  );
}
