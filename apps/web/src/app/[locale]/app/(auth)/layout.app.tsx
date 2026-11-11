import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AuthGate } from '@/features/learner/auth/AuthGate';
import { routing } from '@/i18n/routing';
import { authMetadata } from '@/lib/metadata';

// Design §11: a shared link to a sign-in page shows its own title, not the home page's; still noindex (the learner app's layout).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [auth, meta] = await Promise.all([
    getTranslations({ locale, namespace: 'App.auth.login' }),
    getTranslations({ locale, namespace: 'Metadata' }),
  ]);
  return authMetadata(locale, { title: auth('title'), description: meta('description') });
}

// Sign-in pages: a learner already signed in goes on into the app (except the password pages, B8-2). The frame is drawn by the two
// sub-groups: (split) for sign-in and sign-up, (card) for the rest (design §5.4).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
