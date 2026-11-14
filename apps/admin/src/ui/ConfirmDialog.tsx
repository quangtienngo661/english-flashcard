import type { ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { Button } from './Button';
import { Dialog } from './Dialog';

type Props = {
  isOpen: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  /** Defaults to [Hủy]. */
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  /** While the confirmed action runs, Esc, an outside click and both buttons do nothing. */
  isPending?: boolean;
  onConfirm: () => void;
  /** Cancel button, Esc and an outside click. */
  onCancel: () => void;
};

/** A yes/no question on the small `Dialog`: [cancel] [confirm], right-aligned. */
export function ConfirmDialog({ isOpen, title, children, confirmLabel, cancelLabel, tone = 'primary', isPending = false, onConfirm, onCancel }: Props) {
  const t = useTranslations();
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && !isPending && onCancel()}
      isDismissable={!isPending}
      size="sm"
      title={title}
      actions={
        <>
          <Button variant="secondary" onPress={onCancel} isDisabled={isPending}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button variant={tone} onPress={onConfirm} isPending={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children != null && <div className="break-words text-ui text-muted">{children}</div>}
    </Dialog>
  );
}
