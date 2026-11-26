import * as React from 'react';
import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { Footer } from '@/components/common/Footer';
import { Header } from '@/components/common/Header';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { SITE_CONFIG } from '@/config/site';
import { AuthProvider } from '@/features/authentication/AuthContext';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.appUrl),
  title: {
    default: 'VEYRA — Discover. Connect. Create.',
    template: '%s | VEYRA',
  },
  description: SITE_CONFIG.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VEYRA',
  },
  openGraph: {
    type: 'website',
    siteName: 'VEYRA',
    title: 'VEYRA — One request. Multiple professionals. Better choices.',
    description: SITE_CONFIG.description,
    images: [{ url: '/images/hero/hero-editorial.jpg', width: 1024, height: 1024 }],
  },
};

export const viewport: Viewport = {
  themeColor: '#7655D9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#FFFCF8] text-[#242331]">
        <ToastProvider>
          <AuthProvider>
            <React.Suspense fallback={<div className="h-16 border-b border-[#E9E5EF] bg-[#FFFCF8]" />}>
              <Header />
            </React.Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
