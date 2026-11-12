'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { NotFoundState } from '@/app-ui/States';
import { isId } from '../groups/groups-api';
import { PracticeSession } from '../practice/session/PracticeSession';

/** Đợt C §4.4 `/app/recall?group=`: an Ôn session of one deck, on the practice session screen without its setup step. */
export function RecallSession() {
  const t = useTranslations('App.group');
  const locale = useLocale();
  const raw = useSearchParams().get('group');
  if (!isId(raw))
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center bg-canvas px-4 py-6">
        <NotFoundState title={t('notFound')} back={{ href: `/${locale}/app/groups`, label: t('toList') }} />
      </main>
    );
  return <PracticeSession recall={{ groupId: raw.toLowerCase() }} />;
}
