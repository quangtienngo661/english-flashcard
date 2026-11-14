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
import { deleteUser, fullName, type AdminUserDetail } from './users-api';

/**
 * Design §10: who is being deleted, a line when a renewing plan will be switched off first (D31), and the typed email (D17).
 * No reason field. The email is checked by the API too (400 `confirm-email-mismatch`), which keeps the dialog open.
 */
export function DeleteUserDialog({
  user, onClose, onDone,
}: { user: AdminUserDetail; onClose: () => void; onDone: (outcome: 'deleted' | 'pending') => void }) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<ErrorDetails | null>(null);

  const remove = useMutation({
    mutationFn: () => deleteUser(api, user.id, typed.trim()),
    onSuccess: (result) => onDone(result?.status === 'pending' ? 'pending' : 'deleted'),
    onError: (e) => setError(errorDetails(e)),
  });
  const requestClose = useDialogDirtyClose(typed !== '' && !remove.isPending, onClose);
  const name = fullName(user);

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !remove.isPending && requestClose()}
      isDismissable={!remove.isPending}
      title={t('users.delete.title', { email: user.email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          remove.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <dl className="flex flex-col gap-1 text-ui text-ink">
          {name !== '' && <div><dt className="inline text-muted">{t('users.cols.name')}: </dt><dd className="inline">{name}</dd></div>}
          <div><dt className="inline text-muted">{t('users.detail.email')}: </dt><dd className="inline wrap-anywhere">{user.email}</dd></div>
          <div><dt className="inline text-muted">{t('users.detail.role')}: </dt><dd className="inline">{t(`users.roles.${user.staff_role ?? 'learner'}`)}</dd></div>
        </dl>
        <p className="break-words text-ui text-muted">{t('users.delete.body')}</p>
        {user.auto_renewing === true && <Banner variant="info">{t('users.delete.renewing')}</Banner>}
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        <TextField label={t('users.delete.typeEmail')} value={typed} onChange={setTyped} autoComplete="off" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={remove.isPending} onPress={requestClose}>
            {t('users.delete.keep')}
          </Button>
          <Button type="submit" variant="danger" isPending={remove.isPending} isDisabled={typed.trim() === ''}>
            {t('users.delete.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
