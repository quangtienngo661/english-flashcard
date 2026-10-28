import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { codePoints, lockUser, type AdminUserDetail } from './users-api';

const MAX_REASON = 500;
const CONTROL = /\p{Cc}/u;

/** A/72b: lock one account with a one-line reason (1–500). The text lives in here, so closing the dialog drops it. */
export function LockDialog({ user, onClose, onLocked }: { user: AdminUserDetail; onClose: () => void; onLocked: (result: AdminUserDetail) => void }) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);

  const lock = useMutation({
    mutationFn: (text: string) => lockUser(api, user.id, text),
    onSuccess: onLocked,
    onError: (e) => setError(errorDetails(e)),
  });
  const requestClose = useDialogDirtyClose(reason !== '' && !lock.isPending, onClose);

  function submit() {
    const text = reason.normalize('NFC').trim();
    if (text === '' || codePoints(text) > MAX_REASON || CONTROL.test(text)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setError(null);
    lock.mutate(text);
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !lock.isPending && requestClose()}
      isDismissable={!lock.isPending}
      title={t('users.lock.title', { email: user.email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="break-words text-ui text-muted">{t('users.lock.body')}</p>
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        <TextField
          label={t('users.lock.reason')}
          value={reason}
          onChange={(v) => {
            setReason(v);
            setInvalid(false);
          }}
          autoComplete="off"
          error={invalid ? t('users.lock.reasonInvalid') : undefined}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={lock.isPending} onPress={requestClose}>
            {t('users.lock.keep')}
          </Button>
          <Button type="submit" variant="danger" isPending={lock.isPending}>
            {t('users.lock.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
