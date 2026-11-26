import { collection, doc, setDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { ModerationReport, ReportTargetType, UserRole } from '@/types/domain';

export async function submitReport(input: {
  reporterId: string;
  reporterRole: UserRole;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description: string;
}): Promise<ModerationReport> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const ref = doc(collection(services.db, 'reports'));
  const now = new Date().toISOString();
  const report: ModerationReport = {
    id: ref.id,
    reporterId: input.reporterId,
    reporterRole: input.reporterRole,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason.trim(),
    description: input.description.trim(),
    status: 'open',
    assignedAdminId: null,
    resolutionNote: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, report);
  return report;
}
