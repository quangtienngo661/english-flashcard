import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { LegalDraft } from '@/components/sections/LegalDraft';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return { title: t('privacyTitle'), robots: { index: false, follow: false }, alternates: { canonical: `/${locale}/privacy` } };
}

export default function PrivacyPage() {
  return <LegalDraft titleKey="privacyTitle" />;
}
