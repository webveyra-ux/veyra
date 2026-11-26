'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/common/AuthGuard';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/domain';

export interface WorkspaceNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function WorkspaceNav({
  title,
  subtitle,
  navItems,
}: {
  title: string;
  subtitle?: string;
  navItems: WorkspaceNavItem[];
}) {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border border-[#E9E5EF] bg-white p-3 sm:p-4 lg:sticky lg:top-20">
      <div className="mb-3 px-2 hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7655D9]">
          {title}
        </p>
        {subtitle && <p className="text-xs text-[#6B6879] mt-0.5">{subtitle}</p>}
      </div>

      <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' &&
              item.href !== '/customer/dashboard' &&
              item.href !== '/professional/dashboard' &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-[#7655D9] text-white shadow-xs'
                  : 'text-[#242331] hover:bg-[#F5F0FF]'
              )}
            >
              <span className="inline-flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    active
                      ? 'bg-white text-[#5B3EB5]'
                      : 'bg-[#EDE5FF] text-[#5B3EB5]'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function WorkspaceLayout({
  allowedRoles,
  title,
  subtitle,
  navItems,
  children,
}: {
  allowedRoles: UserRole[];
  title: string;
  subtitle?: string;
  navItems: WorkspaceNavItem[];
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Desktop Sidebar / Mobile Scrollable Tabs */}
          <aside className="lg:col-span-3">
            <React.Suspense
              fallback={<div className="h-64 rounded-2xl border border-[#E9E5EF] bg-white animate-pulse" />}
            >
              <WorkspaceNav title={title} subtitle={subtitle} navItems={navItems} />
            </React.Suspense>
          </aside>

          <section className="lg:col-span-9 min-w-0">{children}</section>
        </div>
      </div>
    </AuthGuard>
  );
}
