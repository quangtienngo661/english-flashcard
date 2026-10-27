import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { userLabel } from '../../api/user-ref';
import { useErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { PageActions } from '../../app/shell-slots';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { Switch } from '../../ui/Switch';
import { ReasonDialog } from './ReasonDialog';
import { listReportReasons, updateReportReason, type ReportReason } from './reports-api';

/** A/75: the report reasons in the API's `position` order (the seed's "Khác" is last because it has 1000; the screen does not move it). Admin only. */
export function ReportReasonsPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const list = useQuery({ queryKey: ['report-reasons'], queryFn: () => listReportReasons(api) });
  const rows = list.data?.items ?? [];

  const isNew = useMatch('/report-reasons/new') !== null;
  const editCode = useMatch('/report-reasons/:code')?.params.code;
  const editing = !isNew && editCode !== undefined ? rows.find((r) => r.code === editCode) : undefined;
  // A link to a code that is not in the list (once it has loaded) goes back to the list instead of an empty dialog.
  const unknownCode = !isNew && editCode !== undefined && list.isSuccess && editing === undefined;
  useEffect(() => {
    if (unknownCode) void navigate('/report-reasons', { replace: true });
  }, [unknownCode, navigate]);

  const toggle = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) => updateReportReason(api, code, { active }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['report-reasons'] }),
  });

  const yesNo = (value: boolean) => (value ? t('reportReasons.yes') : t('reportReasons.no'));
  const columns: Column<ReportReason>[] = [
    { key: 'position', header: t('reportReasons.cols.position'), className: 'tabular-nums', cell: (r) => r.position },
    { key: 'code', header: t('reportReasons.cols.code'), cell: (r) => <span data-testid="reason-code" className="font-mono text-xs">{r.code}</span> },
    { key: 'labelVi', header: t('reportReasons.cols.labelVi'), cell: (r) => r.label_vi },
    { key: 'labelEn', header: t('reportReasons.cols.labelEn'), cell: (r) => r.label_en },
    { key: 'appliesTo', header: t('reportReasons.cols.appliesTo'), cell: (r) => t(`reportReasons.appliesTo.${r.applies_to}`) },
    { key: 'noteRequired', header: t('reportReasons.cols.noteRequired'), cell: (r) => yesNo(r.note_required) },
    { key: 'refundable', header: t('reportReasons.cols.refundable'), cell: (r) => yesNo(r.refundable) },
    {
      key: 'active',
      header: t('reportReasons.cols.active'),
      cell: (r) => (
        <Switch
          hideLabel
          label={t('reportReasons.activeFor', { code: r.code })}
          isSelected={toggle.isPending && toggle.variables?.code === r.code ? toggle.variables.active : r.active}
          isDisabled={toggle.isPending && toggle.variables?.code === r.code}
          onChange={(active) => toggle.mutate({ code: r.code, active })}
        />
      ),
    },
    { key: 'updatedBy', header: t('reportReasons.cols.updatedBy'), cell: (r) => (r.updated_by_user ? userLabel(r.updated_by_user, t) : '—') },
    {
      key: 'actions',
      header: t('reportReasons.cols.actions'),
      card: 'action',
      cell: (r) => (
        <Button variant="secondary" aria-label={t('reportReasons.editFor', { code: r.code })} onPress={() => void navigate(`/report-reasons/${encodeURIComponent(r.code)}`)}>
          {t('reportReasons.edit')}
        </Button>
      ),
    },
  ];

  const toggleError = toggle.isError ? errorDetails(toggle.error) : null;
  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onPress={() => void navigate('/report-reasons/new')}>{t('reportReasons.add')}</Button>
      </PageActions>
      {toggleError && <Banner variant="error" code={toggleError.code}>{toggleError.message}</Banner>}
      <DataList
        rows={rows}
        rowKey={(r) => r.code}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        emptyText={t('reportReasons.empty')}
        emptyHint={t('reportReasons.emptyHint')}
        onRetry={() => void list.refetch()}
      />
      <p className="text-xs text-muted">{t('reportReasons.note')}</p>
      {isNew && <ReasonDialog key="new" reason={null} />}
      {editing && <ReasonDialog key={editing.code} reason={editing} />}
    </div>
  );
}
