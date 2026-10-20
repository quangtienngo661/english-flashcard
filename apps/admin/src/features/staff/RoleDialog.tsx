import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { setStaffRole, type StaffRole, type StaffUser } from './staff-api';

type Props = {
  target: StaffUser;
  /** The role to set; `null` removes the role. */
  role: StaffRole | null;
  /** The signed-in admin is the target. */
  isSelf: boolean;
  onClose: () => void;
  onDone: (updated: StaffUser) => void;
};

/** Confirmation for granting or removing a role (Figma `roles/dialog/*`). */
export function RoleDialog({ target, role, isSelf, onClose, onDone }: Props) {
  const t = useTranslations();
  const api = useApi();
  const errorDetails = useErrorDetails();
  const [error, setError] = useState<ErrorDetails | null>(null);
  const busy = useRef(false);
  const losesAdmin = target.staff_role === 'admin' && role !== 'admin';
  const selfDemotion = isSelf && losesAdmin;

  const mutation = useMutation({ mutationFn: () => setStaffRole(api, target.id, role) });

  let title: string;
  let body: string;
  let confirmLabel = t('common.confirm');
  let danger = false;
  if (selfDemotion) {
    title = t('staff.dialog.selfTitle');
    body = t('staff.dialog.selfBody');
    confirmLabel = t('staff.dialog.selfConfirm');
    danger = true;
  } else if (role === null) {
    title = t('staff.dialog.removeTitle', { email: target.email });
    body = t('staff.dialog.removeBody');
    confirmLabel = t('staff.card.remove');
    danger = true;
  } else {
    title = t('staff.dialog.grantTitle', { role });
    body = t(role === 'admin' ? 'staff.dialog.grantAdminBody' : 'staff.dialog.grantEditorBody', { email: target.email });
  }

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      onDone(await mutation.mutateAsync());
    } catch (e) {
      if (e instanceof ApiError && e.problem.slug === 'staff-role-rule') {
        // The API names one rule for two cases: the last admin cannot be demoted; an unverified user cannot be granted.
        setError({ message: t(losesAdmin ? 'staff.dialog.lastAdmin' : 'staff.card.unverifiedHint'), code: null });
      } else {
        setError(errorDetails(e));
      }
    } finally {
      busy.current = false;
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
      isDismissable={!mutation.isPending}
      title={title}
      actions={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onPress={() => void confirm()} isPending={mutation.isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="break-words text-ui text-muted">{body}</p>
      {error && <Banner variant="error" code={error.code}>{error.message}</Banner>}
    </Dialog>
  );
}
