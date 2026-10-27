import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { userLabel } from '../../api/user-ref';
import { useApi, useSession } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { PanelBody, PanelFooter, PanelHead } from '../../ui/DetailPanel';
import { ListState } from '../../ui/ListState';
import { showToast } from '../../ui/Toast';
import { LockDialog } from './LockDialog';
import { getUser, STATUS_TONE, unlockUser, UUID, type AdminUserDetail } from './users-api';

const userKey = (id: string) => ['user', id] as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="wrap-anywhere text-ui text-ink">{children}</dd>
    </div>
  );
}

/** The user beside the list (A/72): profile fields, the lock line, and [Khóa tài khoản] or [Mở khóa]. */
export function UserDetail({ id, listSearch }: { id: string; listSearch: string }) {
  const t = useTranslations();
  const api = useApi();
  const queryClient = useQueryClient();
  const format = useFormatter();
  const dateTime = useDateTime();
  const errorDetails = useErrorDetails();
  const { state } = useSession();
  const meId = state.status === 'signed-in' ? state.me.id : null;
  const [locking, setLocking] = useState(false);
  const [unlockError, setUnlockError] = useState<ErrorDetails | null>(null);
  // An id that is no UUID cannot exist (the API would answer 400): same as a 404, and the API is not asked.
  const query = useQuery({ queryKey: userKey(id), queryFn: () => getUser(api, id), enabled: UUID.test(id) });

  const saved = (result: AdminUserDetail) => {
    queryClient.setQueryData(userKey(id), result);
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  };
  const unlock = useMutation({
    mutationFn: () => unlockUser(api, id),
    onMutate: () => setUnlockError(null),
    onSuccess: (result) => {
      saved(result);
      showToast(t('users.detail.unlocked', { email: result.email }));
    },
    onError: (error) => setUnlockError(errorDetails(error)),
  });

  const user = query.data;
  if (!user) {
    const missing = !UUID.test(id) || (query.error instanceof ApiError && query.error.problem.status === 404);
    return (
      <>
        <PanelHead title={t('users.detail.titleUnknown')} />
        <PanelBody>
          {missing ? (
            <>
              <p className="text-ui text-ink">{t('users.detail.notFound')}</p>
              <Link to={`/users${listSearch}`} className="w-fit rounded-control text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
                {t('users.detail.backToList')}
              </Link>
            </>
          ) : (
            <ListState state={query.isPending ? 'loading' : 'error'} onRetry={() => void query.refetch()} />
          )}
        </PanelBody>
      </>
    );
  }

  let birth: string | null = null;
  if (user.birth_date !== null) {
    const [y, m, d] = user.birth_date.split('-').map(Number);
    birth = format.dateTime(new Date(Date.UTC(y!, m! - 1, d!)), { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
  }
  const isLocked = user.status === 'locked';
  // Locking is refused for yourself and for an admin (409 `lock-rule`); the screen does not offer it.
  const canLock = !isLocked && user.id !== meId && user.staff_role !== 'admin';
  const none = <span className="text-muted">—</span>;

  return (
    <>
      <PanelHead
        title={user.email}
        status={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[user.status]}>{t(`users.statuses.${user.status}`)}</Badge>
            <span className="text-ui text-muted">{t(`users.roles.${user.staff_role ?? 'learner'}`)}</span>
          </div>
        }
      />
      <PanelBody>
        {unlockError && <Banner variant="error" code={unlockError.code}>{unlockError.message}</Banner>}
        {isLocked && (
          <section className="flex flex-col gap-1 rounded-panel bg-danger-soft px-4 py-3 text-ui text-ink">
            <p className="font-semibold">
              {t('users.detail.lockedLine', {
                time: user.locked_at ? dateTime(user.locked_at) : '—',
                who: user.locked_by ? userLabel(user.locked_by, t) : '—',
              })}
            </p>
            {user.lock_reason && <p className="wrap-anywhere">{t('users.detail.lockReason', { reason: user.lock_reason })}</p>}
          </section>
        )}
        <dl className="flex flex-col gap-3">
          <Row label={t('users.detail.email')}>{user.email}</Row>
          <Row label={t('users.detail.givenName')}>{user.given_name ?? none}</Row>
          <Row label={t('users.detail.familyName')}>{user.family_name ?? none}</Row>
          <Row label={t('users.detail.birthDate')}>{birth ?? none}</Row>
          <Row label={t('users.detail.terms')}>
            {user.terms_accepted_at
              ? t('users.detail.termsValue', { time: dateTime(user.terms_accepted_at), version: user.terms_version ?? '—' })
              : none}
          </Row>
          <Row label={t('users.detail.role')}>{t(`users.roles.${user.staff_role ?? 'learner'}`)}</Row>
          <Row label={t('users.cols.verified')}>{t(user.email_verified ? 'users.verified.yes' : 'users.verified.no')}</Row>
          <Row label={t('users.cols.created')}>{dateTime(user.created_at)}</Row>
          <Row label={t('users.cols.lastSeen')}>{user.last_seen_at ? dateTime(user.last_seen_at) : none}</Row>
        </dl>
      </PanelBody>
      {(canLock || isLocked) && (
        <PanelFooter>
          {isLocked ? (
            <Button variant="secondary" isPending={unlock.isPending} onPress={() => unlock.mutate()}>
              {t('users.detail.unlock')}
            </Button>
          ) : (
            <Button variant="danger" onPress={() => setLocking(true)}>
              {t('users.detail.lock')}
            </Button>
          )}
        </PanelFooter>
      )}
      {locking && (
        <LockDialog
          user={user}
          onClose={() => setLocking(false)}
          onLocked={(result) => {
            saved(result);
            setLocking(false);
            showToast(t('users.detail.locked', { email: result.email }));
          }}
        />
      )}
    </>
  );
}
