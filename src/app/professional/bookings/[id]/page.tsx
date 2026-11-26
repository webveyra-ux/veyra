'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { BookingDetailWorkspace } from '@/components/common/BookingDetailWorkspace';
import { LoadingSkeleton } from '@/components/ui/StateBlocks';

function ProfessionalBookingDetailInner() {
  const params = useParams<{ id: string }>();
  return <BookingDetailWorkspace bookingId={params.id} viewerRole="professional" />;
}

export default function ProfessionalBookingDetailPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton className="h-80" />}>
      <ProfessionalBookingDetailInner />
    </React.Suspense>
  );
}
