import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getLegal, pickLanguage } from '@/lib/legal';
import { LegalDraft } from '@/site/legal/LegalDraft';
import { LegalLayout } from '@/site/legal/LegalLayout';

// Read from the API at each request: an admin publishes a new version without a deploy.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return { title: t('termsTitle'), robots: { index: false, follow: false }, alternates: { canonical: `/${locale}/terms` } };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [legal, t] = await Promise.all([getLegal(), getTranslations({ locale, namespace: 'Legal' })]);
  const title = t('termsTitle');
  const lead = t('termsLead');
  if (!legal) return <LegalDraft title={title} lead={lead} />;
  return (
    <LegalLayout
      kind="terms"
      title={title}
      lead={lead}
      version={legal.version}
      effectiveDate={legal.effective_date}
      markdown={pickLanguage(legal.terms, locale)}
    />
  );
}
