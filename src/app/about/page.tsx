import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/StateBlocks';
import { SITE_CONFIG } from '@/config/site';

export const metadata = {
  title: 'About VEYRA',
  description:
    'Learn about VEYRA — connecting customers with independent beauty, styling, and creative professionals. A product of Damayanti Network.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        eyebrow="About VEYRA"
        title={SITE_CONFIG.headlineProposition}
        description={SITE_CONFIG.description}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-3">
          <Badge tone="lavender">Our Purpose</Badge>
          <h2 className="text-xl font-semibold text-[#242331]">
            Built around real creative briefs, not endless searching
          </h2>
          <p className="text-sm leading-relaxed text-[#6B6879]">
            Finding the right bridal makeup artist, henna designer, fashion stylist, interior decorator, or photographer shouldn&apos;t mean messaging twenty accounts separately and repeating your brief. VEYRA lets you describe your vision once, attach inspiration images, and compare clear, itemised proposals side by side.
          </p>
        </Card>

        <Card className="p-6 space-y-3 bg-[#F5F0FF]/50">
          <Badge tone="blush">Brand &amp; Organisation</Badge>
          <h2 className="text-xl font-semibold text-[#242331]">
            {SITE_CONFIG.attributionLine}
          </h2>
          <p className="text-sm leading-relaxed text-[#6B6879]">
            VEYRA is developed and operated by <strong>{SITE_CONFIG.parentDivision}</strong>, a division of{' '}
            <strong>{SITE_CONFIG.parentOrganisation}</strong>. Our platform focuses on transparent workflows, privacy-first location handling, verified credentials, and sustainable tools for independent practitioners.
          </p>
        </Card>
      </div>

      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#242331]">Ready to get started?</h3>
          <p className="text-sm text-[#6B6879]">
            Post a requirement as a customer or build your independent studio profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/customer/requests/new">
            <Button>Post a Requirement</Button>
          </Link>
          <Link href="/auth/register?role=professional">
            <Button variant="outline">Become a Professional</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
