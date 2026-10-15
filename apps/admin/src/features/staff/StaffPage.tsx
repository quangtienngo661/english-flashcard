import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi, useSession } from '../../auth/session-context';
import { PageActions } from '../../app/shell-slots';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { DataList, type Column } from '../../ui/DataList';
import { TextField } from '../../ui/TextField';
import { CreateAccountDialog } from './CreateAccountDialog';
import { RoleDialog } from './RoleDialog';
import { findUser, listStaff, type StaffRole, type StaffUser } from './staff-api';

const panel = 'flex flex-col gap-3 rounded-panel border-2 border-border p-4';

function UserCard({ user, onChoose }: { user: StaffUser; onChoose: (role: StaffRole | null) => void }) {
  const t = useTranslations();
  return (
    <section aria-label={user.email} className={panel}>
      <h2 className="wrap-anywhere text-ui font-semibold text-ink">{user.email}</h2>
      <p className="text-xs text-muted">
        {user.email_verified ? t('staff.card.verified') : t('staff.card.unverified')} · {user.staff_role ?? t('staff.card.noRole')}
      </p>
      {!user.email_verified && <Banner variant="info">{t('staff.card.unverifiedHint')}</Banner>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" isDisabled={!user.email_verified || user.staff_role === 'editor'} onPress={() => onChoose('editor')}>
          {t('staff.card.grantEditor')}
        </Button>
        <Button variant="secondary" isDisabled={!user.email_verified || user.staff_role === 'admin'} onPress={() => onChoose('admin')}>
          {t('staff.card.grantAdmin')}
        </Button>
        <Button variant="danger" isDisabled={user.staff_role === null} onPress={() => onChoose(null)}>
          {t('staff.card.remove')}
        </Button>
      </div>
    </section>
  );
}

export function StaffPage() {
  const t = useTranslations();
  const api = useApi();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const { state, store } = useSession();
  const meId = state.status === 'signed-in' ? state.me.id : '';

  const list = useInfiniteQuery({
    queryKey: ['staff'],
    queryFn: ({ pageParam }) => listStaff(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const [email, setEmail] = useState('');
  const [target, setTarget] = useState<StaffUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [change, setChange] = useState<{ role: StaffRole | null } | null>(null);
  const [creating, setCreating] = useState(false);
  const searchBusy = useRef(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    const wanted = email.trim();
    if (!wanted || searchBusy.current) return;
    searchBusy.current = true;
    setSearching(true);
    setSearchError(null);
    setNotFound(false);
    try {
      const found = await findUser(api, wanted);
      setTarget(found);
      setNotFound(found === null);
    } catch (e) {
      setSearchError(errorMessage(e));
    } finally {
      searchBusy.current = false;
      setSearching(false);
    }
  }

  const refreshList = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const columns: Column<StaffUser>[] = [
    // Shares, not fixed widths, so a wide screen spreads the columns out (owner, Checkpoint A); short cells never wrap.
    { key: 'email', header: t('staff.list.email'), className: 'w-2/5', cell: (u) => u.email },
    {
      key: 'role',
      header: t('staff.list.role'),
      className: 'w-1/5',
      cell: (u) => (u.staff_role ? <Badge tone={u.staff_role === 'admin' ? 'primary' : 'neutral'}>{u.staff_role}</Badge> : '—'),
    },
    {
      key: 'verified',
      header: t('staff.list.verified'),
      className: 'w-1/5 whitespace-nowrap',
      cell: (u) =>
        u.email_verified ? (
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden className="size-4 shrink-0" />
            {t('staff.list.isVerified')}
          </span>
        ) : (
          <span className="text-muted">{t('staff.list.notVerified')}</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-1/5',
      card: 'action',
      cell: (u) => (
        <Button variant="ghost" onPress={() => { setTarget(u); setNotFound(false); }}>
          {t('staff.list.change')}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button onPress={() => setCreating(true)}>{t('staff.createAccount')}</Button>
      </PageActions>

      <form onSubmit={search} className={`${panel} gap-3 shell:flex-row shell:items-end`} noValidate>
        <div className="min-w-0 flex-1 shell:max-w-md">
          <TextField label={t('staff.search.label')} type="email" autoComplete="off" spellCheck={false} placeholder={t('staff.search.placeholder')} value={email} onChange={setEmail} />
        </div>
        <Button type="submit" isPending={searching}>
          {t('staff.search.submit')}
        </Button>
      </form>

      {searchError && <Banner variant="error">{searchError}</Banner>}
      {notFound && (
        <div className={panel}>
          <Banner variant="info">{t('staff.search.notFound')}</Banner>
        </div>
      )}
      {target && <UserCard user={target} onChoose={(role) => setChange({ role })} />}

      <DataList
        rows={rows}
        rowKey={(u) => u.id}
        columns={columns}
        state={list.isPending ? 'loading' : list.isError && rows.length === 0 ? 'error' : 'ready'}
        emptyText={t('staff.list.empty')}
        onRetry={() => void list.refetch()}
      />

      {rows.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {list.hasNextPage && (
            <Button variant="secondary" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
              {t('common.loadMore')}
            </Button>
          )}
          <p className="text-xs text-muted">{t('staff.list.shown', { count: rows.length })}</p>
        </div>
      )}

      {change && target && (
        <RoleDialog
          target={target}
          role={change.role}
          isSelf={target.id === meId}
          onClose={() => setChange(null)}
          onDone={(updated) => {
            setChange(null);
            setTarget(updated);
            void refreshList();
            if (updated.id === meId) void store.recheck();
          }}
        />
      )}
      {creating && <CreateAccountDialog onClose={() => setCreating(false)} onCreated={() => void refreshList()} />}
    </div>
  );
}
