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
import { TextArea } from '../../ui/TextArea';
import { MAX_REASON, revokeGrant, type AdminGrant } from './entitlements-api';
import { useGrantErrorDetails } from './use-grant-error';
import { useGrantFormat } from './use-grant-format';

/** A/78 "Thu hồi": one reason (1–300) and the grant stops. The text lives in here, so closing the dialog drops it. */
export function RevokeDialog({ grant, onClose, onRevoked }: { grant: AdminGrant; onClose: () => void; onRevoked: (result: AdminGrant) => void }) {
  const t = useTranslations();
  const api = useApi();
  const format = useGrantFormat();
  const errorDetails = useGrantErrorDetails();
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const email = userLabel(grant.user, t);

  const revoke = useMutation({
    mutationFn: (text: string) => revokeGrant(api, grant.id, text),
    onSuccess: onRevoked,
    onError: (e) => setError(errorDetails(e)),
  });
  const requestClose = useDialogDirtyClose(reason !== '' && !revoke.isPending, onClose);

  function submit() {
    const text = reason.trim();
    if (text === '' || text.length > MAX_REASON) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setError(null);
    revoke.mutate(text);
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !revoke.isPending && requestClose()}
      isDismissable={!revoke.isPending}
      title={t('entitlements.revoke.title', { email })}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <p className="break-words text-ui font-semibold text-ink">{format.summary('revoke.summary', grant)}</p>
        <p className="break-words text-ui text-muted">{t('entitlements.revoke.body')}</p>
        {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
        <TextArea
          label={t('entitlements.revoke.reason')}
          value={reason}
          onChange={(v) => {
            setReason(v);
            setInvalid(false);
          }}
          rows={3}
          maxLength={MAX_REASON}
          counter
          error={invalid ? t('entitlements.revoke.reasonInvalid') : undefined}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" isDisabled={revoke.isPending} onPress={requestClose}>
            {t('entitlements.revoke.keep')}
          </Button>
          <Button type="submit" variant="danger" isPending={revoke.isPending}>
            {t('entitlements.revoke.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
