'use client';

import * as React from 'react';
import {
  BadgeCheck,
  BarChart3,
  ClipboardList,
  FileText,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { WorkspaceLayout } from '@/components/common/WorkspaceLayout';
import { useAuth } from '@/features/authentication/AuthContext';

export default function AdminWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminLevel } = useAuth();

  return (
    <WorkspaceLayout
      allowedRoles={['admin']}
      title="VEYRA Admin Portal"
      subtitle={adminLevel ? `Role: ${adminLevel.replace(/_/g, ' ')}` : 'Protected Operations'}
      navItems={[
        {
          href: '/admin',
          label: 'Overview',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: '/admin/verifications',
          label: 'Verifications',
          icon: <BadgeCheck className="h-4 w-4" />,
        },
        {
          href: '/admin/users',
          label: 'Users & Pros',
          icon: <Users className="h-4 w-4" />,
        },
        {
          href: '/admin/categories',
          label: 'Categories',
          icon: <FolderTree className="h-4 w-4" />,
        },
        {
          href: '/admin/requests',
          label: 'Requests & Bookings',
          icon: <FileText className="h-4 w-4" />,
        },
        {
          href: '/admin/moderation',
          label: 'Reviews & Reports',
          icon: <ShieldAlert className="h-4 w-4" />,
        },
        {
          href: '/admin/content',
          label: 'Content & Promos',
          icon: <Megaphone className="h-4 w-4" />,
        },
        {
          href: '/admin/analytics',
          label: 'Analytics',
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          href: '/admin/roles',
          label: 'Admin Roles & Logs',
          icon: <Shield className="h-4 w-4" />,
        },
        {
          href: '/admin/roles#audit',
          label: 'Audit Trail',
          icon: <ClipboardList className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </WorkspaceLayout>
  );
}
