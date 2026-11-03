import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { LegalDocument } from '@/components/sections/LegalDocument';
import { LegalDraft } from '@/components/sections/LegalDraft';
import { routing } from '@/i18n/routing';
import { getLegal, pickLanguage } from '@/lib/legal';
import { formatDay } from '@/lib/format-day';

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
  const legal = await getLegal();
  if (!legal) return <LegalDraft titleKey="termsTitle" />;
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return (
    <LegalDocument
      title={t('termsTitle')}
      source={pickLanguage(legal.terms, locale)}
      effective={legal.effective_date ? t('effective', { date: formatDay(legal.effective_date) }) : null}
    />
  );
}
