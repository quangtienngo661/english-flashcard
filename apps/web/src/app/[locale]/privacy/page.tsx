import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { PrivacyPolicy } from '@/components/sections/PrivacyPolicy';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return { title: t('privacyTitle'), description: t('privacy.intro'), alternates: { canonical: `/${locale}/privacy` } };
}

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
