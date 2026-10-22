'use client';

import { useTranslations } from 'next-intl';
import { AppShell } from '@/app-chrome/AppShell';
import { PageTitle } from '@/app-chrome/PageTitle';

/** M1 stand-in for Today (K/10); the real screen comes with M2 (Task 15). */
export function TodayPlaceholder() {
  const t = useTranslations('App.chrome.tabs');
  return (
    <AppShell variant="main">
      <PageTitle>{t('today')}</PageTitle>
    </AppShell>
  );
}
