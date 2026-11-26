'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { BookingDetailWorkspace } from '@/components/common/BookingDetailWorkspace';
import { LoadingSkeleton } from '@/components/ui/StateBlocks';

function CustomerBookingDetailInner() {
  const params = useParams<{ id: string }>();
  return <BookingDetailWorkspace bookingId={params.id} viewerRole="customer" />;
}

export default function CustomerBookingDetailPage() {
  return (
    <React.Suspense fallback={<LoadingSkeleton className="h-80" />}>
      <CustomerBookingDetailInner />
    </React.Suspense>
  );
}
