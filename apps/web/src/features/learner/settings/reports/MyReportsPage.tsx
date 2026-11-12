'use client';

import { useLocale, useTranslations } from 'next-intl';
import { BackLink } from '@/app-chrome/BackLink';
import { PageTitle } from '@/app-chrome/PageTitle';
import { useFormat } from '@/app-shell/format';
import { useSession } from '@/app-shell/session/session-context';
import { useLearnerZone } from '@/lib/learner-date';
import { groupByMonth } from '@/lib/month-groups';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState, ErrorState } from '@/ui/States';
import { ReportRow } from './ReportRow';
import { useMyReports } from './reports-api';

/**
 * "Báo lỗi của tôi" `/app/settings/reports` (Figma 211:5827 / 211:6061, design §9 M6, QR1): back to Cài đặt, one card per month in the
 * learner's zone, newest first, "Xem thêm" for older pages, and the footnote.
 */
export function MyReportsPage() {
  const t = useTranslations('App.practice.reports');
  const locale = useLocale();
  const { state } = useSession();
  const zone = useLearnerZone();
  const format = useFormat();
  const list = useMyReports();
  if (state.status !== 'signed-in') return null;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const months = groupByMonth(items, (report) => report.created_at, zone);

  let content;
  if (list.isPending) {
    content = (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">{t('loading')}</span>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-40 w-full rounded-wm-xl" />
      </div>
    );
  } else if (list.isError) {
    content = <ErrorState message={t('error')} onRetry={() => void list.refetch()} />;
  } else if (items.length === 0) {
    content = (
      <EmptyState
        title={t('emptyTitle')}
        body={t('emptyBody')}
        action={<ButtonLink href={`/${locale}/app/practice`} variant="secondary">{t('toPractice')}</ButtonLink>}
      />
    );
  } else {
    content = (
      <>
        {months.map((month) => (
          <section key={month.key} aria-labelledby={`reports-${month.key}`} className="flex flex-col gap-3">
            <h2 id={`reports-${month.key}`} className="text-wm-meta font-medium text-wm-muted">{format.date(month.items[0].created_at, 'monthLabel')}</h2>
            <ul className="rounded-wm-xl border border-wm-line bg-wm-surface px-4 py-1 shadow-wm-card md:px-3 md:py-1.5">
              {month.items.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </ul>
          </section>
        ))}
        {list.hasNextPage && (
          <Button variant="secondary" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
            {t('more')}
          </Button>
        )}
        <p className="text-wm-meta text-wm-muted">{t('foot')}</p>
      </>
    );
  }

  return (
    <div>
      <BackLink href={`/${locale}/app/settings`} label={t('back')} />
      <PageTitle>{t('title')}</PageTitle>
      <div className="flex flex-col gap-4 md:gap-5">{content}</div>
    </div>
  );
}
