'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { POPULAR_CITIES } from '@/config/site';
import { useAuth } from '@/features/authentication/AuthContext';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications.service';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    firebaseUser,
    userRecord,
    isAdmin,
    notifications,
    unreadNotificationsCount,
    selectedCity,
    setSelectedCity,
    signOutUser,
  } = useAuth();

  const [mobileMenuPath, setMobileMenuPath] = React.useState<string | null>(null);
  const [cityModalOpen, setCityModalOpen] = React.useState(false);
  const [customCity, setCustomCity] = React.useState(selectedCity);
  const [notifPath, setNotifPath] = React.useState<string | null>(null);
  const [accountMenuPath, setAccountMenuPath] = React.useState<string | null>(null);

  const mobileMenuOpen = mobileMenuPath === pathname;
  const notifOpen = notifPath === pathname;
  const accountMenuOpen = accountMenuPath === pathname;

  const setMobileMenuOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(mobileMenuOpen) : next;
    setMobileMenuPath(resolved ? pathname : null);
  };
  const setNotifOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(notifOpen) : next;
    setNotifPath(resolved ? pathname : null);
  };
  const setAccountMenuOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(accountMenuOpen) : next;
    setAccountMenuPath(resolved ? pathname : null);
  };

  const dashboardHref = isAdmin
    ? '/admin'
    : userRecord?.role === 'professional'
      ? '/professional/dashboard'
      : '/customer/dashboard';

  const messagesHref =
    userRecord?.role === 'professional' ? '/professional/messages' : '/customer/messages';

  const notificationsHref =
    userRecord?.role === 'professional'
      ? '/professional/notifications'
      : '/customer/notifications';

  function handleSelectCity(city: string) {
    setSelectedCity(city);
    setCustomCity(city);
    setCityModalOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E9E5EF] bg-[#FFFCF8]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-5">
            <BrandLogo />
            <button
              type="button"
              onClick={() => setCityModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E9E5EF] bg-white px-3 py-1.5 text-xs font-medium text-[#242331] hover:border-[#7655D9]/50 cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-[#7655D9]" />
              <span>{selectedCity || 'All cities'}</span>
              <ChevronDown className="h-3 w-3 text-[#6B6879]" />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#6B6879]">
            <Link
              href="/explore"
              className={cn(
                'hover:text-[#242331] transition-colors',
                pathname.startsWith('/explore') && 'text-[#7655D9] font-semibold'
              )}
            >
              Explore Professionals
            </Link>
            <Link
              href="/categories"
              className={cn(
                'hover:text-[#242331] transition-colors',
                pathname.startsWith('/categories') && 'text-[#7655D9] font-semibold'
              )}
            >
              Categories
            </Link>
            <Link
              href="/customer/requests/new"
              className={cn(
                'inline-flex items-center gap-1.5 hover:text-[#242331] transition-colors',
                pathname.startsWith('/customer/requests/new') && 'text-[#7655D9] font-semibold'
              )}
            >
              <PlusCircle className="h-4 w-4 text-[#7655D9]" />
              Post a Request
            </Link>
            {!firebaseUser && (
              <Link
                href="/auth/register?role=professional"
                className="hover:text-[#242331] transition-colors"
              >
                Join as Professional
              </Link>
            )}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {firebaseUser ? (
              <>
                <Link
                  href={messagesHref}
                  aria-label="Messages"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9E5EF] bg-white text-[#242331] hover:border-[#7655D9]/50"
                >
                  <MessageSquare className="h-4 w-4" />
                </Link>

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen((prev) => !prev);
                      setAccountMenuOpen(false);
                    }}
                    aria-label="Notifications"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9E5EF] bg-white text-[#242331] hover:border-[#7655D9]/50 cursor-pointer"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7655D9] px-1 text-[10px] font-bold text-white">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#E9E5EF] bg-white p-3 shadow-xl z-50">
                      <div className="flex items-center justify-between border-b border-[#E9E5EF] pb-2 mb-2">
                        <span className="text-sm font-semibold text-[#242331]">
                          Notifications
                        </span>
                        <div className="flex items-center gap-2">
                          {unreadNotificationsCount > 0 && (
                            <button
                              type="button"
                              onClick={() => void markAllNotificationsRead(notifications)}
                              className="text-xs font-medium text-[#7655D9] hover:underline cursor-pointer"
                            >
                              Mark all read
                            </button>
                          )}
                          <Link
                            href={notificationsHref}
                            className="text-xs text-[#6B6879] hover:text-[#242331]"
                          >
                            View all
                          </Link>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto space-y-1">
                        {notifications.length === 0 ? (
                          <p className="py-6 text-center text-xs text-[#6B6879]">
                            You have no notifications yet.
                          </p>
                        ) : (
                          notifications.slice(0, 6).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                void markNotificationRead(item.id);
                                setNotifOpen(false);
                                router.push(item.actionUrl || dashboardHref);
                              }}
                              className={cn(
                                'w-full rounded-xl p-2.5 text-left transition-colors cursor-pointer',
                                item.read ? 'hover:bg-[#F5F0FF]/40' : 'bg-[#F5F0FF]'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-[#242331]">
                                  {item.title}
                                </p>
                                <span className="text-[10px] text-[#6B6879] shrink-0">
                                  {formatRelativeTime(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-[#6B6879] line-clamp-2">
                                {item.message}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen((prev) => !prev);
                      setNotifOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5EF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#242331] hover:border-[#7655D9]/50 cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE5FF] text-[#5B3EB5] font-semibold">
                      {(userRecord?.displayName || firebaseUser.email || 'V')[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:inline max-w-[110px] truncate">
                      {userRecord?.displayName || 'Account'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#6B6879]" />
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#E9E5EF] bg-white p-2 shadow-xl z-50">
                      <div className="border-b border-[#E9E5EF] px-3 py-2 mb-1">
                        <p className="text-xs font-semibold text-[#242331] truncate">
                          {userRecord?.displayName || firebaseUser.email}
                        </p>
                        <p className="text-[11px] capitalize text-[#7655D9]">
                          {isAdmin ? 'Administrator' : userRecord?.role || 'Customer'} account
                        </p>
                      </div>

                      <Link
                        href={dashboardHref}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#242331] hover:bg-[#F5F0FF]"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#7655D9]" />
                        Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#242331] hover:bg-[#F5F0FF]"
                        >
                          <ShieldCheck className="h-4 w-4 text-[#7655D9]" />
                          Admin Portal
                        </Link>
                      )}
                      <Link
                        href={
                          userRecord?.role === 'professional'
                            ? '/professional/profile'
                            : '/customer/profile'
                        }
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#242331] hover:bg-[#F5F0FF]"
                      >
                        <UserIcon className="h-4 w-4 text-[#7655D9]" />
                        Profile & Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => void signOutUser().then(() => router.push('/'))}
                        className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-[#FFF0F3] cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Get started
                  </Button>
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-[#E9E5EF] bg-white text-[#242331] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E9E5EF] bg-[#FFFCF8] px-4 py-4 space-y-3">
            <button
              type="button"
              onClick={() => setCityModalOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-[#E9E5EF] bg-white px-3.5 py-2.5 text-sm font-medium text-[#242331]"
            >
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#7655D9]" />
                Location: {selectedCity || 'All cities'}
              </span>
              <span className="text-xs text-[#7655D9]">Change</span>
            </button>

            <div className="flex flex-col space-y-1">
              <Link
                href="/explore"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#242331] hover:bg-[#F5F0FF]"
              >
                Explore Professionals
              </Link>
              <Link
                href="/categories"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#242331] hover:bg-[#F5F0FF]"
              >
                Service Categories
              </Link>
              <Link
                href="/customer/requests/new"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#5B3EB5] bg-[#F5F0FF]"
              >
                Post a Requirement
              </Link>
              <Link
                href="/about"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#242331] hover:bg-[#F5F0FF]"
              >
                About VEYRA
              </Link>
            </div>

            {!firebaseUser ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E9E5EF]">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" className="w-full">
                    Create account
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#E9E5EF]">
                <Link href={dashboardHref}>
                  <Button variant="primary" className="w-full">
                    Open Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <Modal
        open={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title="Select your city"
        description="Filter professionals and requests around your preferred location."
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Enter any city or locality..."
              className="flex-1 min-h-11 rounded-xl border border-[#E9E5EF] bg-white px-3.5 text-sm"
            />
            <Button onClick={() => handleSelectCity(customCity.trim())}>Apply</Button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6879] mb-2">
              Popular cities
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectCity('')}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer',
                  !selectedCity
                    ? 'border-[#7655D9] bg-[#F5F0FF] text-[#5B3EB5]'
                    : 'border-[#E9E5EF] bg-white text-[#242331]'
                )}
              >
                All cities
              </button>
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer',
                    selectedCity === city
                      ? 'border-[#7655D9] bg-[#F5F0FF] text-[#5B3EB5]'
                      : 'border-[#E9E5EF] bg-white text-[#242331] hover:border-[#7655D9]/40'
                  )}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
