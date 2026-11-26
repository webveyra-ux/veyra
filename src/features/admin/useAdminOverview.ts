'use client';

import * as React from 'react';
import { callAuthedApi } from '@/services/api-client';
import type {
  AdminRoleRecord,
  AuditLog,
  Booking,
  ModerationReport,
  ProfessionalProfile,
  Review,
  ServiceRequest,
  UserRecord,
  VerificationRecord,
} from '@/types/domain';

export interface AdminOverviewData {
  metrics: {
    totalUsers: number;
    totalCustomers: number;
    totalProfessionals: number;
    verifiedProfessionals: number;
    pendingVerifications: number;
    activeRequests: number;
    totalRequests: number;
    totalProposals: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    openReports: number;
  };
  users: UserRecord[];
  professionals: ProfessionalProfile[];
  verifications: VerificationRecord[];
  requests: ServiceRequest[];
  bookings: Booking[];
  reviews: Review[];
  reports: ModerationReport[];
  auditLogs: AuditLog[];
  adminRoles: AdminRoleRecord[];
}

export function useAdminOverview() {
  const [data, setData] = React.useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAuthedApi<AdminOverviewData>('/api/admin/overview', {
        method: 'GET',
      });
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    void callAuthedApi<AdminOverviewData>('/api/admin/overview', { method: 'GET' })
      .then((res) => {
        if (!active) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load admin overview.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error, reload };
}
