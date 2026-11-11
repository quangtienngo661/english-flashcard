'use client';

import { useLocale, useTranslations } from 'next-intl';
import { BackLink } from '@/app-chrome/BackLink';
import { useFormat } from '@/app-shell/format';
import { useSession } from '@/app-shell/session/session-context';
import { monthOf, todayIn, useLearnerZone } from '@/lib/learner-date';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState, ErrorState } from '@/ui/States';
import { ReportRow } from './ReportRow';
import { useMyReports, type MyReport } from './reports-api';

// raw-ok: Figma 211:5827 / 211:6061 title Bricolage ExtraBold 44 / 30 (page-title-mobile is 38)
const TITLE = 'font-wm-display text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.023em] text-wm-ink md:text-wm-page-title';

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
  const months: { key: string; label: string; reports: MyReport[] }[] = [];
  for (const report of items) {
    const key = monthOf(todayIn(zone, new Date(report.created_at)));
    const last = months.at(-1);
    if (last?.key === key) last.reports.push(report);
    else months.push({ key, label: format.date(report.created_at, 'monthLabel'), reports: [report] });
  }

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
            <h2 id={`reports-${month.key}`} className="font-wm-mono text-wm-mono font-medium text-wm-muted">{month.label}</h2>
            <ul className="rounded-wm-xl border border-wm-line bg-wm-surface px-4 py-1 shadow-wm-card md:px-3 md:py-1.5">
              {month.reports.map((report) => (
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
        <p className="font-wm-mono text-wm-mono text-wm-muted">{t('foot')}</p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div>
        <BackLink href={`/${locale}/app/settings`} label={t('back')} />
        <h1 className={TITLE}>{t('title')}</h1>
      </div>
      {content}
    </div>
  );
}
