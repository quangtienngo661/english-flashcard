import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { useUrlFilters } from '../../api/use-url-filters';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { PageActions } from '../../app/shell-slots';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { Select } from '../../ui/Select';
import { showToast } from '../../ui/Toast';
import { TextField } from '../../ui/TextField';
import { getAiUsage } from '../settings/settings-api';
import { BreakableEmail } from './BreakableEmail';
import { EditDatesDialog } from './EditDatesDialog';
import { GrantDialog } from './GrantDialog';
import {
  LIMIT_KEYS,
  listGrants,
  MAX_EMAIL,
  MAX_EXPIRING_DAYS,
  type AdminGrant,
  type GrantFilters,
  type GrantStatus,
} from './entitlements-api';
import { RevokeDialog } from './RevokeDialog';
import { useGrantFormat } from './use-grant-format';

const emailOk = (v: string) => v.length > 0 && v.length <= MAX_EMAIL && v === v.trim();
const daysOk = (v: string) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_EXPIRING_DAYS;
const FILTERS = {
  user_email: { default: '', valid: emailOk },
  granted_by_email: { default: '', valid: emailOk },
  active: { default: 'all', valid: (v: string) => v === 'true' || v === 'false' },
  expiring_within_days: { default: '', valid: daysOk },
};

const STATUS_TONE: Record<GrantStatus, 'success' | 'primary' | 'danger' | 'neutral'> = {
  active: 'success', scheduled: 'primary', revoked: 'danger', expired: 'neutral', replaced: 'neutral',
};
/** Revoke and edit-dates only make sense while a grant is running or waiting to start. */
const canChange = (g: AdminGrant) => g.status === 'active' || g.status === 'scheduled';
const panel = 'flex flex-col gap-1 rounded-panel border-2 border-border p-4';

/** A/78 `/entitlements` (`entitlements.grant`: admin and editor): every grant, filtered, newest first; revoke and edit dates per row. */
export function GrantsPage() {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const format = useGrantFormat();
  const navigate = useNavigate();
  // `/entitlements/new` keeps the list and opens the form over it.
  const isNew = useMatch('/entitlements/new') !== null;
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const [action, setAction] = useState<{ kind: 'revoke' | 'edit'; grant: AdminGrant } | null>(null);

  // The boxes hold what is typed; [Lọc] writes it to the URL, and Back or a pasted link fills the boxes again.
  const [draft, setDraft] = useState<GrantFilters>(filters);
  const [seen, setSeen] = useState<GrantFilters>(filters);
  const [daysInvalid, setDaysInvalid] = useState(false);
  if (seen !== filters) {
    setSeen(filters);
    setDraft(filters);
  }

  const list = useInfiniteQuery({
    queryKey: ['grants', filters],
    queryFn: ({ pageParam }) => listGrants(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = Object.entries(filters).some(([key, value]) => value !== FILTERS[key as keyof typeof FILTERS].default);

  function apply(event: FormEvent) {
    event.preventDefault();
    const days = draft.expiring_within_days.trim();
    if (days !== '' && !daysOk(days)) {
      setDaysInvalid(true);
      return;
    }
    setDaysInvalid(false);
    setFilters({ user_email: draft.user_email.trim(), granted_by_email: draft.granted_by_email.trim(), active: draft.active, expiring_within_days: days });
  }

  function done(message: string) {
    setAction(null);
    showToast(message);
    void queryClient.invalidateQueries({ queryKey: ['grants'] });
  }

  const two = (top: ReactNode, bottom: string) => (
    <span className="flex flex-col">
      <span>{top}</span>
      <span className="text-xs text-muted">{bottom}</span>
    </span>
  );
  const limitLines = (g: AdminGrant) =>
    g.limits === null
      ? null
      : LIMIT_KEYS.filter((key) => g.limits![key] !== undefined).map((key) => (
          <span key={key}>{t(`entitlements.limitLines.${key}`, { n: g.limits![key] ?? 0 })}</span>
        ));

  const columns: Column<AdminGrant>[] = [
    { key: 'learner', header: t('entitlements.cols.learner'), className: 'w-1/6 wrap-anywhere font-semibold', cell: (g) => <BreakableEmail email={userLabel(g.user, t)} /> },
    {
      key: 'kind', header: t('entitlements.cols.kind'), className: 'whitespace-nowrap', card: 'field',
      cell: (g) => <Badge tone="primary">{t(`entitlements.kinds.${g.kind}`)}</Badge>,
    },
    {
      key: 'limits', header: t('entitlements.cols.limits'), card: 'field',
      cell: (g) => (g.limits === null ? '—' : <span className="flex flex-col">{limitLines(g)}</span>),
    },
    { key: 'from', header: t('entitlements.cols.from'), className: 'whitespace-nowrap', card: 'field', cell: (g) => format.date(g.starts_at) },
    { key: 'to', header: t('entitlements.cols.to'), className: 'whitespace-nowrap', card: 'field', cell: (g) => format.lastDate(g.ends_at) },
    {
      key: 'grantedBy', header: t('entitlements.cols.grantedBy'), className: 'wrap-anywhere', card: 'field',
      cell: (g) => two(<BreakableEmail email={userLabel(g.granted_by_user, t)} />, g.granted_by_role === 'admin' || g.granted_by_role === 'editor' ? t(`users.roles.${g.granted_by_role}`) : g.granted_by_role),
    },
    {
      key: 'reason', header: t('entitlements.cols.reason'), className: 'wrap-anywhere', card: 'field',
      cell: (g) =>
        g.status === 'revoked' && g.revoke_reason ? two(g.reason, t('entitlements.revokedNote', { reason: g.revoke_reason })) : g.reason,
    },
    {
      key: 'status', header: t('entitlements.cols.status'), className: 'whitespace-nowrap', card: 'field',
      cell: (g) => <Badge tone={STATUS_TONE[g.status]}>{t(`entitlements.statuses.${g.status}`)}</Badge>,
    },
    {
      key: 'actions', header: t('entitlements.cols.actions'), card: 'action',
      cell: (g) =>
        canChange(g) ? (
          <span className="flex flex-wrap gap-1">
            <Button variant="ghost" aria-label={t('entitlements.actions.editDatesFor', { email: userLabel(g.user, t) })} onPress={() => setAction({ kind: 'edit', grant: g })}>
              {t('entitlements.actions.editDates')}
            </Button>
            <Button variant="ghost" aria-label={t('entitlements.actions.revokeFor', { email: userLabel(g.user, t) })} onPress={() => setAction({ kind: 'revoke', grant: g })}>
              {t('entitlements.actions.revoke')}
            </Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button onPress={() => void navigate('/entitlements/new')}>{t('entitlements.new.open')}</Button>
      </PageActions>
      <AiTodayBlock />
      <form onSubmit={apply} noValidate className="grid gap-3 shell:grid-cols-5 shell:items-start">
        <TextField
          label={t('entitlements.filters.learner')}
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('entitlements.filters.emailPlaceholder')}
          value={draft.user_email}
          onChange={(user_email) => setDraft({ ...draft, user_email })}
        />
        <TextField
          label={t('entitlements.filters.grantedBy')}
          type="email"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('entitlements.filters.emailPlaceholder')}
          value={draft.granted_by_email}
          onChange={(granted_by_email) => setDraft({ ...draft, granted_by_email })}
        />
        <Select
          label={t('entitlements.filters.active')}
          value={draft.active}
          onChange={(active) => setDraft({ ...draft, active })}
          items={[
            { id: 'all', label: t('entitlements.filters.activeAll') },
            { id: 'true', label: t('entitlements.filters.activeYes') },
            { id: 'false', label: t('entitlements.filters.activeNo') },
          ]}
        />
        <TextField
          label={t('entitlements.filters.expiring')}
          inputMode="numeric"
          autoComplete="off"
          value={draft.expiring_within_days}
          onChange={(expiring_within_days) => {
            setDaysInvalid(false);
            setDraft({ ...draft, expiring_within_days });
          }}
          description={t('entitlements.filters.expiringHint')}
          error={daysInvalid ? t('entitlements.filters.expiringHint') : undefined}
        />
        <Button type="submit" className="w-fit shell:mt-7">
          {t('entitlements.filters.apply')}
        </Button>
      </form>

      <DataList
        rows={rows}
        rowKey={(g) => g.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={filtered ? t('entitlements.emptyFiltered') : t('entitlements.empty')}
        onRetry={() => void list.refetch()}
      />
      {!list.isPending && !list.isError && rows.length === 0 && !filtered && (
        <Button variant="secondary" className="mx-auto w-fit" onPress={() => void navigate('/entitlements/new')}>
          {t('entitlements.new.open')}
        </Button>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('entitlements.footer')}</p>
        </div>
      )}

      {isNew && <GrantDialog />}
      {action?.kind === 'revoke' && (
        <RevokeDialog
          grant={action.grant}
          onClose={() => setAction(null)}
          onRevoked={(g) => done(t('entitlements.revoke.done', { email: userLabel(g.user, t) }))}
        />
      )}
      {action?.kind === 'edit' && (
        <EditDatesDialog
          grant={action.grant}
          onClose={() => setAction(null)}
          onSaved={(g) => done(t('entitlements.editDates.done', { email: userLabel(g.user, t) }))}
        />
      )}
    </div>
  );
}

/** A/78 head, admin only: today's system AI uses. `ai-usage` needs `settings.manage`, so an editor sends no request at all. */
function AiTodayBlock() {
  const t = useTranslations('entitlements');
  const api = useApi();
  const format = useFormatter();
  const allowed = useCan('settings.manage');
  const usage = useQuery({ queryKey: ['entitlements', 'ai-usage'], queryFn: () => getAiUsage(api), enabled: allowed });
  if (!allowed || usage.isPending) return null;
  if (!usage.data) return <Banner variant="error">{t('aiTodayError')}</Banner>;
  return (
    <div role="status" className={`${panel} ${usage.data.alert_reached ? 'bg-accent-soft' : 'bg-primary-soft'}`}>
      <p className="text-ui font-extrabold text-ink">{t('aiToday', { used: format.number(usage.data.used), cap: format.number(usage.data.cap) })}</p>
    </div>
  );
}
