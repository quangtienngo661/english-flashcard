import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { pageMetadata } from '@/lib/metadata';
import { fetchSources } from '@/lib/sources';
import { SourcesPage as SourcesPageBody } from '@/site/sources/SourcesPage';

// Read from the API at each request: the list follows what learners can see, which changes whenever a word is published or retired.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Sources' });
  // noindex until launch (design §11).
  return pageMetadata(locale, { path: '/sources', title: t('title'), description: t('intro'), index: false });
}

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <SourcesPageBody items={await fetchSources()} />;
}
