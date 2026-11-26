import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/StateBlocks';
import { LEGAL_DOCUMENTS } from '@/config/legal-drafts';

export async function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const docData = LEGAL_DOCUMENTS[slug];
  if (!docData) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        eyebrow="Draft Policy Document"
        title={docData.title}
        description={`${docData.subtitle} Effective date: ${docData.lastUpdated}`}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>{docData.draftNotice}</p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6">
        {docData.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-base font-semibold text-[#242331]">{section.heading}</h2>
            {section.body.map((paragraph, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-[#6B6879]">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </Card>

      <div className="flex flex-wrap gap-3 text-xs text-[#6B6879]">
        {Object.values(LEGAL_DOCUMENTS).map((other) => (
          <Link
            key={other.slug}
            href={`/legal/${other.slug}`}
            className={`rounded-full border px-3 py-1 ${
              other.slug === slug
                ? 'border-[#7655D9] bg-[#F5F0FF] text-[#5B3EB5] font-semibold'
                : 'border-[#E9E5EF] bg-white hover:border-[#7655D9]/50'
            }`}
          >
            {other.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
