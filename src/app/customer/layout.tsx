'use client';

import * as React from 'react';
import {
  Bell,
  CalendarCheck,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { WorkspaceLayout } from '@/components/common/WorkspaceLayout';
import { useAuth } from '@/features/authentication/AuthContext';

export default function CustomerWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { unreadNotificationsCount } = useAuth();

  return (
    <WorkspaceLayout
      allowedRoles={['customer', 'admin']}
      title="Customer Workspace"
      subtitle="Requests, proposals & bookings"
      navItems={[
        {
          href: '/customer/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: '/customer/requests/new',
          label: 'Post Request',
          icon: <PlusCircle className="h-4 w-4" />,
        },
        {
          href: '/customer/requests',
          label: 'My Requests',
          icon: <FileText className="h-4 w-4" />,
        },
        {
          href: '/customer/bookings',
          label: 'Bookings',
          icon: <CalendarCheck className="h-4 w-4" />,
        },
        {
          href: '/customer/messages',
          label: 'Messages',
          icon: <MessageSquare className="h-4 w-4" />,
        },
        {
          href: '/customer/favourites',
          label: 'Favourites',
          icon: <Heart className="h-4 w-4" />,
        },
        {
          href: '/customer/profile',
          label: 'Profile & Addresses',
          icon: <UserIcon className="h-4 w-4" />,
        },
        {
          href: '/customer/notifications',
          label: 'Notifications',
          icon: <Bell className="h-4 w-4" />,
          badge: unreadNotificationsCount,
        },
        {
          href: '/customer/settings',
          label: 'Settings',
          icon: <Settings className="h-4 w-4" />,
        },
      ]}
    >
      {children}
    </WorkspaceLayout>
  );
}
