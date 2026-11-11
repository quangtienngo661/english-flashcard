import type { Metadata } from 'next';
import { Suspense } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/features/learner/auth/RegisterForm';
import { routing } from '@/i18n/routing';
import { authMetadata } from '@/lib/metadata';

// The sign-in layout titles every page "Đăng nhập"; the sign-up page, the one the home page links to, names itself (design §11).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [auth, meta] = await Promise.all([
    getTranslations({ locale, namespace: 'App.auth.register' }),
    getTranslations({ locale, namespace: 'Metadata' }),
  ]);
  return authMetadata(locale, { title: auth('title'), description: meta('description') });
}

// Static shell; the form reads its query string in the browser (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
