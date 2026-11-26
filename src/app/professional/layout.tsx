'use client';

import * as React from 'react';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CalendarCheck,
  FileCheck2,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { WorkspaceLayout } from '@/components/common/WorkspaceLayout';
import { useAuth } from '@/features/authentication/AuthContext';

export default function ProfessionalWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { unreadNotificationsCount } = useAuth();

  return (
    <WorkspaceLayout
      allowedRoles={['professional', 'admin']}
      title="Professional Studio"
      subtitle="Requests, proposals & bookings"
      navItems={[
        {
          href: '/professional/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: '/professional/requests',
          label: 'Request Feed',
          icon: <Inbox className="h-4 w-4" />,
        },
        {
          href: '/professional/proposals',
          label: 'My Proposals',
          icon: <FileCheck2 className="h-4 w-4" />,
        },
        {
          href: '/professional/bookings',
          label: 'Bookings',
          icon: <CalendarCheck className="h-4 w-4" />,
        },
        {
          href: '/professional/messages',
          label: 'Messages',
          icon: <MessageSquare className="h-4 w-4" />,
        },
        {
          href: '/professional/portfolio',
          label: 'Portfolio & Services',
          icon: <ImageIcon className="h-4 w-4" />,
        },
        {
          href: '/professional/availability',
          label: 'Availability',
          icon: <Calendar className="h-4 w-4" />,
        },
        {
          href: '/professional/verification',
          label: 'Verification',
          icon: <BadgeCheck className="h-4 w-4" />,
        },
        {
          href: '/professional/analytics',
          label: 'Analytics',
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          href: '/professional/profile',
          label: 'Edit Profile',
          icon: <UserIcon className="h-4 w-4" />,
        },
        {
          href: '/professional/onboarding',
          label: 'Setup Wizard',
          icon: <Briefcase className="h-4 w-4" />,
        },
        {
          href: '/professional/notifications',
          label: 'Notifications',
          icon: <Bell className="h-4 w-4" />,
          badge: unreadNotificationsCount,
        },
        {
          href: '/professional/settings',
          label: 'Settings',
          icon: <Settings className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </WorkspaceLayout>
  );
}
