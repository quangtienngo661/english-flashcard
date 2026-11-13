'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouteLocale } from '@/app-shell/route-locale';
import { NotFoundState } from '@/ui/NotFoundState';
import { isId } from '../groups/groups-api';
import { PracticeSession } from '../practice/session/PracticeSession';

/** Đợt C §4.4 `/app/recall?group=`: an Ôn session of one deck, on the practice session screen without its setup step. */
export function RecallSession() {
  const t = useTranslations('App.group');
  const locale = useRouteLocale();
  const raw = useSearchParams().get('group');
  if (!isId(raw))
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-6">
        <NotFoundState title={t('notFound')} back={{ href: `/${locale}/app/groups`, label: t('toList') }} />
      </div>
    );
  return <PracticeSession recall={{ groupId: raw.toLowerCase() }} />;
}
