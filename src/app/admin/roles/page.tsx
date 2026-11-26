'use client';

import * as React from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/ui/StateBlocks';
import { useToast } from '@/components/ui/ToastProvider';
import { ADMIN_LEVEL_PERMISSIONS } from '@/config/design-tokens';
import { useAdminOverview } from '@/features/admin/useAdminOverview';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { callAuthedApi } from '@/services/api-client';
import type { AdminLevel } from '@/types/domain';

export default function AdminRolesAndAuditPage() {
  const { adminLevel } = useAuth();
  const { data, loading, error, reload } = useAdminOverview();
  const { notify } = useToast();

  const [targetEmail, setTargetEmail] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<AdminLevel>('operations_admin');
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await callAuthedApi('/api/admin/action', {
        method: 'POST',
        body: {
          action: 'assign_admin_role',
          targetEmail: targetEmail.trim(),
          adminLevel: selectedLevel,
          active,
        },
      });
      notify({
        tone: 'success',
        title: 'Admin claims & role record updated',
        description: 'The user must refresh their session (sign out and back in) for claims to apply.',
      });
      setTargetEmail('');
      await reload();
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Role update failed',
        description: err instanceof Error ? err.message : 'Only Super Admins can manage roles.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton className="h-96" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security & Governance"
        title="Admin Roles & Audit Logs"
        description="Server-enforced administrative permission levels using Firebase Custom Claims and immutable audit trails."
      />

      {adminLevel === 'super_admin' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#7655D9]" />
            <h2 className="text-base font-semibold text-[#242331]">
              Assign or Revoke Admin Privileges (Super Admin Only)
            </h2>
          </div>
          <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Input
                label="Existing User Email"
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="operator@example.com"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <Select
                label="Admin Level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as AdminLevel)}
              >
                {Object.keys(ADMIN_LEVEL_PERMISSIONS).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-3 flex gap-2 items-center">
              <Select
                label="Status"
                value={active ? 'active' : 'revoked'}
                onChange={(e) => setActive(e.target.value === 'active')}
              >
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </Select>
              <Button type="submit" loading={saving} className="mt-6">
                Apply
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#242331]">Configured Admin Roles</h2>
        <div className="space-y-2">
          {(data?.adminRoles || []).map((role) => (
            <div
              key={role.uid}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#E9E5EF] p-3 text-xs"
            >
              <div>
                <p className="font-semibold text-[#242331]">{role.email}</p>
                <p className="text-[#6B6879]">
                  Permissions: {role.permissions.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="lavender" className="capitalize">
                  {role.adminLevel.replace(/_/g, ' ')}
                </Badge>
                <Badge tone={role.active ? 'mint' : 'danger'}>
                  {role.active ? 'Active' : 'Revoked'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card id="audit" className="p-5 space-y-3">
        <h2 className="text-base font-semibold text-[#242331]">
          Audit Trail ({data?.auditLogs.length || 0} recent entries)
        </h2>
        <div className="space-y-2">
          {(data?.auditLogs || []).map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-[#E9E5EF] p-3 text-xs space-y-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#242331]">
                  {log.action} &rarr; {log.affectedEntity} ({log.affectedEntityId})
                </span>
                <span className="text-[#6B6879]">{formatDateTime(log.createdAt)}</span>
              </div>
              <p className="text-[#6B6879]">
                Actor: {log.adminEmail} &middot; {log.details}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
