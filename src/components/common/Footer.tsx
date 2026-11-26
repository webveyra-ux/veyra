import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { SITE_CONFIG } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-[#E9E5EF] bg-white text-[#6B6879]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <BrandLogo showTagline />
            <p className="text-sm leading-relaxed text-[#6B6879]">
              {SITE_CONFIG.headlineProposition} Discover independent beauty, styling, and creative professionals tailored to your brief.
            </p>
            <p className="text-xs font-medium text-[#5B3EB5]">
              {SITE_CONFIG.attributionLine}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#242331] mb-3">
              Marketplace
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="hover:text-[#7655D9]">
                  Explore Professionals
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[#7655D9]">
                  All Categories
                </Link>
              </li>
              <li>
                <Link href="/customer/requests/new" className="hover:text-[#7655D9]">
                  Post a Requirement
                </Link>
              </li>
              <li>
                <Link href="/auth/register?role=professional" className="hover:text-[#7655D9]">
                  Become a Professional
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#242331] mb-3">
              Company
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-[#7655D9]">
                  About VEYRA
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#7655D9]">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/#how-veyra-works" className="hover:text-[#7655D9]">
                  How VEYRA Works
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#7655D9]">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#242331] mb-3">
              Policies (Editable Drafts)
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal/terms" className="hover:text-[#7655D9]">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[#7655D9]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/professional-terms" className="hover:text-[#7655D9]">
                  Professional Terms
                </Link>
              </li>
              <li>
                <Link href="/legal/cancellation" className="hover:text-[#7655D9]">
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/guidelines" className="hover:text-[#7655D9]">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[#E9E5EF] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; 2026 VEYRA &mdash; {SITE_CONFIG.attributionLine} (division of{' '}
            {SITE_CONFIG.parentOrganisation}).
          </p>
          <p className="text-[#6B6879]">
            Built for web &amp; mobile PWA (offline payment settlement in initial launch).
          </p>
        </div>
      </div>
    </footer>
  );
}
