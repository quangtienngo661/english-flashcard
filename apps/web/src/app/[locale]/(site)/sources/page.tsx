import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { SourcesList } from '@/components/sections/SourcesList';
import { routing } from '@/i18n/routing';
import { fetchSources } from '@/lib/sources';

// Read from the API at each request: the list follows what learners can see, which changes whenever a word is published or retired.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Sources' });
  return { title: t('title'), robots: { index: false, follow: false }, alternates: { canonical: `/${locale}/sources` } };
}

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [sources, t] = await Promise.all([fetchSources(), getTranslations({ locale, namespace: 'Sources' })]);
  return (
    <SourcesList
      sources={sources}
      labels={{ title: t('title'), intro: t('intro'), empty: t('empty'), license: t('license'), version: t('version'), link: t('link') }}
    />
  );
}
