import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { PageActions } from '../../app/shell-slots';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { showToast } from '../../ui/Toast';
import { createLegalDraft, legalKeys, listLegalVersions, type LegalStatus, type LegalSummary } from './legal-api';

const TONE: Record<LegalStatus, 'primary' | 'success' | 'neutral'> = { draft: 'primary', published: 'success', superseded: 'neutral' };

/** `2026-11-10` as `10/11/2026`, without a time zone (the date is a calendar day, not a moment). */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/** `/legal`: the versions of the Privacy Policy and the Terms of Use, newest first; one is published at a time. */
export function LegalPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const dateTime = useDateTime();
  const [problem, setProblem] = useState<ErrorDetails | null>(null);
  const list = useQuery({ queryKey: legalKeys.list, queryFn: () => listLegalVersions(api) });
  const rows = list.data?.items ?? [];
  const published = rows.find((row) => row.status === 'published');

  const create = useMutation({
    mutationFn: () => createLegalDraft(api, null, crypto.randomUUID()),
    onMutate: () => setProblem(null),
    onSuccess: async (draft) => {
      await queryClient.invalidateQueries({ queryKey: legalKeys.list });
      showToast(t('legal.toast.created', { number: draft.number }));
      void navigate(`/legal/${draft.id}`);
    },
    onError: (e) => setProblem(errorDetails(e)),
  });

  const columns: Column<LegalSummary>[] = [
    { key: 'number', header: t('legal.list.number'), className: 'w-1/12 tabular-nums', cell: (row) => row.number },
    {
      key: 'status', header: t('legal.list.status'), className: 'w-1/6',
      cell: (row) => <Badge tone={TONE[row.status]}>{t(`legal.status.${row.status}`)}</Badge>,
    },
    { key: 'effective', header: t('legal.list.effective'), className: 'w-1/6', cell: (row) => (row.effective_date ? formatDay(row.effective_date) : '—') },
    { key: 'updated', header: t('legal.list.updated'), className: 'w-1/5', cell: (row) => dateTime(row.updated_at) },
    { key: 'publishedBy', header: t('legal.list.publishedBy'), className: 'w-1/4', cell: (row) => row.published_by?.email ?? '—' },
    { key: 'english', header: t('legal.list.english'), card: 'field', cell: (row) => (row.has_english ? t('legal.list.yes') : t('legal.list.no')) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button isPending={create.isPending} onPress={() => create.mutate()}>{t('legal.create')}</Button>
      </PageActions>
      <p className="max-w-3xl text-sm text-muted">{t('legal.intro')}</p>
      {problem && <Banner variant="error" code={problem.code}>{problem.message}</Banner>}
      {!list.isPending && !list.isError && (
        <Banner variant="info">
          {published && published.effective_date
            ? t('legal.current', { number: published.number, date: formatDay(published.effective_date) })
            : published
              ? t('legal.current', { number: published.number, date: '—' })
              : t('legal.noCurrent')}
        </Banner>
      )}
      <DataList
        rows={rows}
        rowKey={(row) => row.id}
        columns={columns}
        rowHref={(row) => `/legal/${row.id}`}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        emptyText={t('legal.empty')}
        emptyHint={t('legal.emptyHint')}
        onRetry={() => void list.refetch()}
      />
    </div>
  );
}
