import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import { useTranslations } from 'use-intl';
import { useUrlFilters } from '../../api/use-url-filters';
import { PageActions } from '../../app/shell-slots';
import { useApi } from '../../auth/session-context';
import { useCan } from '../../auth/use-can';
import { CreateAccountDialog } from '../staff/CreateAccountDialog';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { DetailPanel } from '../../ui/DetailPanel';
import { focusRowLink } from '../../ui/focus-row-link';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { useRetained } from '../../ui/use-retained';
import { UserDetail } from './UserDetail';
import { codePoints, fullName, listUsers, MAX_SEARCH, MIN_SEARCH, normalizeSearch, STATUS_TONE, type AdminUser, type UserStatus } from './users-api';

const STATUSES: UserStatus[] = ['active', 'locked'];
const SEARCH_DELAY_MS = 300;
const FILTERS = {
  q: { default: '', valid: (v: string) => codePoints(v) >= MIN_SEARCH && codePoints(v) <= MAX_SEARCH && v === normalizeSearch(v) },
  status: { default: 'all', valid: (v: string) => (STATUSES as string[]).includes(v) },
};

/** A/71 `/users` (`users.read`: admin and editor read; AD18: only `roles.manage` creates, from [Tạo người dùng]): search by 2+ characters, filter by status, 20 per page; a row opens its detail (A/72). */
export function UsersPage() {
  const t = useTranslations();
  const api = useApi();
  const navigate = useNavigate();
  const { search } = useLocation();
  const dateTime = useDateTime();
  const [filters, setFilters] = useUrlFilters(FILTERS);
  const queryClient = useQueryClient();
  const canManage = useCan('roles.manage');
  const [creating, setCreating] = useState(false);
  const panelId = useMatch('/users/:id')?.params.id;
  const shownId = useRetained(panelId);

  // The box holds what is typed; the URL (and the request) follow once it is empty or at least 2 characters (design §6.10).
  const [draft, setDraft] = useState(filters.q);
  const [seenQ, setSeenQ] = useState(filters.q);
  // Back or forward changes the URL under the box: the box follows (adjusted while rendering, not in an effect).
  if (seenQ !== filters.q) {
    setSeenQ(filters.q);
    if (normalizeSearch(draft) !== filters.q && codePoints(normalizeSearch(draft)) !== 1) setDraft(filters.q);
  }
  useEffect(() => {
    const next = normalizeSearch(draft);
    if (codePoints(next) === 1 || next === filters.q) return;
    const timer = setTimeout(() => setFilters({ q: next }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, filters.q, setFilters]);

  const list = useInfiniteQuery({
    queryKey: ['users', filters],
    queryFn: ({ pageParam }) => listUsers(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const href = (u: AdminUser) => `/users/${u.id}${search}`;

  const allColumns: Column<AdminUser>[] = [
    {
      key: 'email', header: t('users.cols.email'), className: 'wrap-anywhere font-semibold',
      cell: (u) => (
        <Link to={href(u)} className="rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          {u.email}
        </Link>
      ),
    },
    { key: 'name', header: t('users.cols.name'), card: 'field', className: 'wrap-anywhere', cell: (u) => fullName(u) || '—' },
    { key: 'role', header: t('users.cols.role'), card: 'field', className: 'whitespace-nowrap', cell: (u) => t(`users.roles.${u.staff_role ?? 'learner'}`) },
    {
      key: 'verified', header: t('users.cols.verified'), card: 'field', className: 'whitespace-nowrap',
      cell: (u) => t(u.email_verified ? 'users.verified.yes' : 'users.verified.no'),
    },
    {
      key: 'status', header: t('users.cols.status'), card: 'field', className: 'whitespace-nowrap',
      cell: (u) => <Badge tone={STATUS_TONE[u.status]}>{t(`users.statuses.${u.status}`)}</Badge>,
    },
    { key: 'created', header: t('users.cols.created'), card: 'field', className: 'whitespace-nowrap', cell: (u) => dateTime(u.created_at) },
    { key: 'lastSeen', header: t('users.cols.lastSeen'), card: 'field', className: 'whitespace-nowrap', cell: (u) => (u.last_seen_at ? dateTime(u.last_seen_at) : '—') },
  ];
  // Beside the open user the table only has room for the email, the role and the status.
  const columns = panelId === undefined ? allColumns : allColumns.filter((c) => ['email', 'role', 'status'].includes(c.key));

  const shortSearch = codePoints(normalizeSearch(draft)) === 1;
  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <PageActions>
          <Button onPress={() => setCreating(true)}>{t('users.create')}</Button>
        </PageActions>
      )}
      {creating && (
        <CreateAccountDialog
          allowLearner
          onClose={() => setCreating(false)}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['users'] })}
        />
      )}
      <div className="grid gap-3 shell:grid-cols-2 shell:items-start">
        <TextField
          label={t('users.search')}
          value={draft}
          onChange={setDraft}
          autoComplete="off"
          maxLength={MAX_SEARCH}
          description={shortSearch ? t('users.searchShort') : t('users.searchHint')}
        />
        <Select
          label={t('users.filters.status')}
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          items={[{ id: 'all', label: t('users.filters.all') }, ...STATUSES.map((s) => ({ id: s, label: t(`users.filters.${s}`) }))]}
        />
      </div>
      <DataList
        rows={rows}
        rowKey={(u) => u.id}
        columns={columns}
        rowHref={href}
        selectedKey={panelId}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={filters.q !== '' ? t('users.emptySearch', { q: filters.q }) : filters.status !== 'all' ? t('users.emptyFiltered') : t('users.empty')}
        onRetry={() => void list.refetch()}
      />
      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('users.footer')}</p>
        </div>
      )}
      {shownId && (
        <DetailPanel
          isOpen={panelId !== undefined}
          onClose={() => void navigate(`/users${search}`)}
          onExited={() => focusRowLink(`/users/${shownId}${search}`)}
          focusKey={shownId}
        >
          <UserDetail key={shownId} id={shownId} listSearch={search} />
        </DetailPanel>
      )}
    </div>
  );
}
