import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { userLabel } from '../../api/user-ref';
import type { ErrorDetails } from '../../api/use-error-message';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import {
  endAfterDay,
  lastDay,
  MAX_REASON,
  startInstant,
  updateGrantDates,
  vnDay,
  type AdminGrant,
  type GrantDatesBody,
} from './entitlements-api';
import { useGrantErrorDetails } from './use-grant-error';
import { useGrantFormat } from './use-grant-format';

/**
 * A/78d "Sửa ngày": move the end (and the start while the grant has not started) with a reason. Only the dates that changed
 * are sent. The form lives in here, so closing the dialog drops it.
 */
export function EditDatesDialog({ grant, onClose, onSaved }: { grant: AdminGrant; onClose: () => void; onSaved: (result: AdminGrant) => void }) {
  const t = useTranslations();
  const api = useApi();
  const format = useGrantFormat();
  const errorDetails = useGrantErrorDetails();
  const started = grant.status !== 'scheduled';
  const initialFrom = vnDay(grant.starts_at);
  const initialTo = lastDay(grant.ends_at);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [reason, setReason] = useState('');
  const [problems, setProblems] = useState<{ dates?: string; reason?: boolean }>({});
  const [error, setError] = useState<ErrorDetails | null>(null);
  const email = userLabel(grant.user, t);
  const change = grant.last_change;

  const save = useMutation({
    mutationFn: (body: GrantDatesBody) => updateGrantDates(api, grant.id, body),
    onSuccess: onSaved,
    onError: (e) => setError(errorDetails(e)),
  });
  const dirty = from !== initialFrom || to !== initialTo || reason !== '';
  const requestClose = useDialogDirtyClose(dirty && !save.isPending, onClose);

  function submit() {
    setError(null);
    const body: Partial<GrantDatesBody> = {};
    if (!started && from !== '' && from !== initialFrom) body.starts_at = startInstant(from);
    if (to !== '' && to !== initialTo) body.ends_at = endAfterDay(to);
    const text = reason.trim();
    const next: typeof problems = {};
    if (to === '' || (!started && from === '')) next.dates = t('entitlements.editDates.dateRequired');
    else if (body.starts_at === undefined && body.ends_at === undefined) next.dates = t('entitlements.editDates.noChange');
    if (text === '' || text.length > MAX_REASON) next.reason = true;
    setProblems(next);
    if (next.dates || next.reason) return;
    save.mutate({ ...body, reason: text });
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !save.isPending && requestClose()}
      isDismissable={!save.isPending}
      title={t('entitlements.editDates.title', { email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="break-words text-ui font-semibold text-ink">{format.summary('editDates.summary', grant)}</p>
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        <div className="grid gap-4 shell:grid-cols-2">
          {started ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-ui font-medium text-ink">{t('entitlements.editDates.from')}</span>
              <span className="min-h-control rounded-control bg-neutral-soft px-3 py-1.5 text-ui text-ink">{format.date(grant.starts_at)}</span>
              <span className="text-xs text-muted">{t('entitlements.editDates.fromLocked')}</span>
            </div>
          ) : (
            <TextField label={t('entitlements.editDates.from')} type="date" value={from} onChange={setFrom} description={t('entitlements.editDates.fromHint')} />
          )}
          <TextField label={t('entitlements.editDates.to')} type="date" value={to} onChange={setTo} error={problems.dates} />
        </div>
        <TextField
          label={t('entitlements.editDates.reason')}
          value={reason}
          onChange={(v) => {
            setReason(v);
            setProblems((p) => ({ ...p, reason: false }));
          }}
          autoComplete="off"
          error={problems.reason ? t('entitlements.editDates.reasonInvalid') : undefined}
        />
        <p className="break-words text-xs text-muted">{t('entitlements.editDates.hint')}</p>
        {change && (
          <p className="break-words text-xs text-muted">
            {t('entitlements.editDates.lastChange', {
              date: format.date(change.created_at),
              email: userLabel(change.changed_by_user, t),
              change: format.change(change),
              reason: change.reason,
            })}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={save.isPending} onPress={requestClose}>
            {t('entitlements.editDates.keep')}
          </Button>
          <Button type="submit" isPending={save.isPending}>
            {t('entitlements.editDates.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
