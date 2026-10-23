'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { useApi } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { EmptyState, ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import type { MyReport } from './practice-api';

const STATUS_TONE: Record<MyReport['status'], string> = {
  open: 'bg-primary-soft',
  fixed: 'bg-success-soft',
  no_error: 'bg-neutral-soft',
  confirmed: 'bg-accent-soft',
};

/** K/82, K/83: the learner's reports, newest first, with their outcome and the AI credit line (copy doc §7.14). */
export function MyReportsTab() {
  const t = useTranslations('App.practice.reports');
  const locale = useLocale();
  const api = useApi();
  const format = useFormat();
  const errorText = useErrorMessage();
  const list = useInfiniteQuery({
    queryKey: ['practice', 'my-reports'],
    queryFn: ({ pageParam }) =>
      api.get<{ items: MyReport[]; next_page_token: string | null }>(`/v1/practice/reports?page_size=20${pageParam ? `&page_token=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  if (list.isPending) return <FullScreenSpinner />;
  if (list.isError) return <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />;
  const reports = list.data.pages.flatMap((p) => p.items);
  if (reports.length === 0) {
    return (
      <EmptyState
        title={t('emptyTitle')}
        body={t('emptyBody')}
        action={
          <Link href={`/${locale}/app/practice`} className="font-semibold text-primary underline underline-offset-2">
            {t('toPractice')}
          </Link>
        }
      />
    );
  }
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div aria-hidden className="hidden grid-cols-12 gap-3 border-b border-border pb-2 text-caption text-muted md:grid">
        <span className="col-span-2">{t('cols.word')}</span>
        <span className="col-span-5">{t('cols.reason')}</span>
        <span className="col-span-2">{t('cols.date')}</span>
        <span className="col-span-3">{t('cols.status')}</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id} className="grid grid-cols-2 gap-x-3 gap-y-1 py-3 md:grid-cols-12 md:items-center">
            <ReportWord senseId={r.sense_id} />
            <span className="text-right text-caption text-muted md:order-none md:col-span-2 md:col-start-8 md:row-start-1 md:text-left md:text-ui md:text-ink">
              {format.date(r.created_at, 'dayMonth')}
            </span>
            <span className="col-span-2 min-w-0 break-words text-ui text-ink md:col-span-5 md:col-start-3 md:row-start-1">{r.reason_label}</span>
            <span className="col-span-2 flex flex-col items-start gap-1 md:col-span-3 md:col-start-10 md:row-start-1">
              <span className={cn('rounded-full px-2 py-0.5 text-caption font-semibold text-ink', STATUS_TONE[r.status])}>{t(`status.${r.status}`)}</span>
              {r.status === 'confirmed' && (
                <span className={cn('text-caption', r.refunded === true ? 'text-success' : 'text-muted')}>
                  {r.refunded === true ? t('refunded') : r.refunded === null ? t('refunding') : t('notRefundable')}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {list.hasNextPage && (
        <Button variant="quiet" className="w-fit" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
          {t('more')}
        </Button>
      )}
    </section>
  );
}

/** The report list has the sense id only; its word comes from `GET /senses/{id}` (a sense no longer shown → "—"). */
function ReportWord({ senseId }: { senseId: string }) {
  const t = useTranslations('App.practice.reports');
  const api = useApi();
  const sense = useQuery({
    queryKey: ['sense', senseId],
    queryFn: () => api.get<{ lemma: string }>(`/v1/senses/${senseId}`),
    staleTime: Infinity,
    retry: (count, error) => !(error instanceof ApiError && error.problem.status === 404) && count < 2,
  });
  return (
    <span className="min-w-0 break-words text-ui font-semibold text-ink md:col-span-2 md:row-start-1">
      {sense.data?.lemma ?? (sense.isError ? t('unknownWord') : '')}
    </span>
  );
}
