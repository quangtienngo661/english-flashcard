import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { checkPasswordPolicy } from '../../auth/password-policy';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Dialog } from '../../ui/Dialog';
import { TextField } from '../../ui/TextField';
import { PasswordRules } from '../account/PasswordRules';
import { resetUserPassword, type AdminUserDetail } from './users-api';

/** AD18: a generated or typed password, mailed to the user; every session of theirs is signed out. Never shows a password. */
export function ResetPasswordDialog({ user, onClose, onDone }: {
  user: AdminUserDetail; onClose: () => void; onDone: (result: AdminUserDetail) => void;
}) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [generate, setGenerate] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const violations = generate ? [] : checkPasswordPolicy(password);

  const reset = useMutation({
    mutationFn: () => resetUserPassword(api, user.id, { ...(generate ? {} : { password }), must_change_password: mustChange }),
    onSuccess: onDone,
    onError: (e) => setBanner(errorDetails(e)),
  });

  function submit() {
    setBanner(null);
    const mismatch = !generate && password !== confirmPassword;
    setConfirmError(mismatch ? t('account.changePassword.mismatch') : null);
    if (mismatch || violations.length > 0) return;
    reset.mutate();
  }

  return (
    <Dialog
      isOpen
      size="md"
      onOpenChange={(open) => !open && !reset.isPending && onClose()}
      isDismissable={!reset.isPending}
      title={t('users.reset.title', { email: user.email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="break-words text-ui text-muted">{t('users.reset.body')}</p>
        {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
        <div className="flex flex-col gap-1.5">
          <Checkbox isSelected={generate} onChange={setGenerate}>
            {t('staff.create.generate')}
          </Checkbox>
          {generate && <p className="text-xs text-muted">{t('staff.create.generateHint')}</p>}
        </div>
        {!generate && (
          <>
            <TextField label={t('staff.create.password')} type="password" autoComplete="new-password" value={password} onChange={setPassword} />
            <TextField
              label={t('staff.create.confirmPassword')}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={confirmError ?? undefined}
            />
            <PasswordRules violations={violations} />
          </>
        )}
        <Checkbox isSelected={mustChange} onChange={setMustChange}>
          {t('users.reset.mustChange')}
        </Checkbox>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={reset.isPending} onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" isPending={reset.isPending}>
            {t('users.reset.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
