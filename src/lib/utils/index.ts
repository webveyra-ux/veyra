import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CustomerProfile, ProfessionalProfile } from '@/types/domain';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatPriceRange(min: number, max: number, currency = 'INR'): string {
  if (min <= 0 && max <= 0) return 'Custom quote';
  if (min === max || max <= 0) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}

export function formatDate(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return 'Flexible';
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return formatDate(iso);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function calculateCustomerCompletion(profile: Partial<CustomerProfile>): number {
  const checks = [
    Boolean(profile.fullName && profile.fullName.trim().length >= 2),
    Boolean(profile.email || profile.phone),
    Boolean(profile.photoURL),
    Boolean(profile.defaultLocation?.city),
    Boolean(profile.defaultLocation?.locality),
    Boolean(profile.preferredCategories && profile.preferredCategories.length > 0),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return Math.min(100, Math.max(0, score));
}

export function calculateProfessionalCompletion(profile: Partial<ProfessionalProfile>): number {
  const checks = [
    Boolean(profile.displayName && profile.displayName.trim().length >= 2),
    Boolean(profile.headline && profile.headline.trim().length >= 4),
    Boolean(profile.bio && profile.bio.trim().length >= 30),
    Boolean(profile.profilePhotoUrl),
    Boolean(profile.categories && profile.categories.length > 0),
    Boolean(profile.services && profile.services.length > 0),
    Boolean(profile.location?.city && profile.location?.locality),
    Boolean(profile.serviceModes && profile.serviceModes.length > 0),
    Boolean(profile.portfolio && profile.portfolio.length > 0),
    Boolean(profile.languages && profile.languages.length > 0),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return Math.min(100, Math.max(0, score));
}

export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
