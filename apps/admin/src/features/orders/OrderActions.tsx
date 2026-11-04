import { useMutation, type QueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { useIdempotencyKey } from '../../api/idempotency';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Dialog } from '../../ui/Dialog';
import { TextArea } from '../../ui/TextArea';
import { TextField } from '../../ui/TextField';
import { useOrderFormat } from './order-format';
import {
  cancelOrder, confirmPayment, MAX_AMOUNT, MAX_REFERENCE, MAX_TEXT, resolveOrder, revokePeriod, type AdminOrderDetail,
} from './orders-api';

/** Every list and detail of orders, after a change the server accepted. */
export function refreshOrders(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ['orders'] });
}

/**
 * One staff action: a request with an Idempotency-Key that stays the same while the form's content does (a retry is the same write), the
 * server's refusal shown inside the form, and a press while the request runs ignored.
 */
function useAction<T>(run: (key: string) => Promise<T>, fingerprint: string, onDone: (result: T) => void) {
  const errorDetails = useErrorDetails();
  const idempotency = useIdempotencyKey(fingerprint);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const mutation = useMutation({ mutationFn: (key: string) => run(key), onSuccess: onDone, onError: (failure) => setError(errorDetails(failure)) });
  return {
    error,
    pending: mutation.isPending,
    send() {
      if (mutation.isPending) return;
      setError(null);
      mutation.mutate(idempotency.key);
    },
  };
}

function Form({ onSubmit, children, footer }: { onSubmit: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <form
      noValidate
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {children}
      <div className="flex flex-wrap justify-end gap-2">{footer}</div>
    </form>
  );
}

const Invalid = ({ text }: { text: string }) => (
  <p role="alert" className="text-xs text-danger">
    {text}
  </p>
);

type Done = (order: AdminOrderDetail | null) => void;

/** "Đã nhận tiền": the bank reference, the amount and why staff are sure. The order's own rules (T11–T14) answer 409 when it cannot be. */
export function ConfirmPaymentDialog({ order, onClose, onDone }: { order: AdminOrderDetail; onClose: () => void; onDone: Done }) {
  const t = useTranslations();
  const api = useApi();
  const format = useOrderFormat();
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const number = /^\d+$/.test(amount.trim()) ? Number(amount.trim()) : Number.NaN;
  const action = useAction(
    (key) => confirmPayment(api, order.id, { reference: reference.trim(), amount: number, reason: reason.trim() }, key),
    `${reference.trim()}|${amount.trim()}|${reason.trim()}`,
    onDone,
  );

  function submit() {
    const ok = reference.trim() !== '' && reference.trim().length <= MAX_REFERENCE && Number.isSafeInteger(number) && number > 0
      && number <= MAX_AMOUNT && reason.trim() !== '' && reason.trim().length <= MAX_TEXT;
    setInvalid(!ok);
    if (ok) action.send();
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && !action.pending && onClose()} isDismissable={!action.pending} size="md" title={t('orders.confirm.title')}>
      <Form
        onSubmit={submit}
        footer={
          <>
            <Button variant="secondary" isDisabled={action.pending} onPress={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isPending={action.pending}>
              {t('orders.confirm.submit')}
            </Button>
          </>
        }
      >
        <p className="break-words text-ui text-muted">{t('orders.confirm.body', { amount: format.money(order.amount), code: order.description })}</p>
        {action.error && <Banner variant="error" code={action.error.code}>{action.error.message}</Banner>}
        <TextField label={t('orders.confirm.reference')} value={reference} onChange={setReference} maxLength={MAX_REFERENCE} spellCheck={false} autoComplete="off" />
        <TextField label={t('orders.confirm.amount')} value={amount} onChange={setAmount} inputMode="numeric" autoComplete="off" />
        <TextArea label={t('orders.confirm.reason')} value={reason} onChange={setReason} rows={3} maxLength={MAX_TEXT} counter />
        {invalid && <Invalid text={t('orders.confirm.invalid')} />}
      </Form>
    </Dialog>
  );
}

/** "Hủy đơn": payOS is asked to cancel the link first; if it does not answer the order stays pending and the refusal shows here. */
export function CancelOrderDialog({ order, onClose, onDone }: { order: AdminOrderDetail; onClose: () => void; onDone: Done }) {
  const t = useTranslations();
  const api = useApi();
  const action = useAction((key) => cancelOrder(api, order.id, key), order.id, onDone);
  return (
    <ConfirmDialog
      isOpen
      title={t('orders.cancel.title')}
      confirmLabel={t('orders.cancel.confirm')}
      cancelLabel={t('orders.cancel.keep')}
      tone="danger"
      isPending={action.pending}
      onConfirm={action.send}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-3">
        <p>{t('orders.cancel.body', { code: order.description })}</p>
        {action.error && <Banner variant="error" code={action.error.code}>{action.error.message}</Banner>}
      </div>
    </ConfirmDialog>
  );
}

/** "Đã xử lý": what staff did about an order that needed a look (a refund by hand, a transfer sorted out); the note is kept. */
export function ResolveOrderDialog({ order, onClose, onDone }: { order: AdminOrderDetail; onClose: () => void; onDone: Done }) {
  const t = useTranslations();
  const api = useApi();
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState(false);
  const action = useAction((key) => resolveOrder(api, order.id, note.trim(), key), note.trim(), onDone);

  function submit() {
    const ok = note.trim() !== '' && note.trim().length <= MAX_TEXT;
    setInvalid(!ok);
    if (ok) action.send();
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && !action.pending && onClose()} isDismissable={!action.pending} title={t('orders.resolve.title')}>
      <Form
        onSubmit={submit}
        footer={
          <>
            <Button variant="secondary" isDisabled={action.pending} onPress={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isPending={action.pending}>
              {t('orders.resolve.submit')}
            </Button>
          </>
        }
      >
        <p className="break-words text-ui text-muted">{t('orders.resolve.body')}</p>
        {action.error && <Banner variant="error" code={action.error.code}>{action.error.message}</Banner>}
        <TextArea label={t('orders.resolve.note')} value={note} onChange={setNote} rows={3} maxLength={MAX_TEXT} counter placeholder={t('orders.resolve.placeholder')} />
        {invalid && <Invalid text={t('orders.resolve.invalid')} />}
      </Form>
    </Dialog>
  );
}

/** "Thu hồi kỳ": the period stops counting from now; later periods do not move and the money record stays. */
export function RevokePeriodDialog({ periodId, range, onClose, onDone }: { periodId: string; range: string; onClose: () => void; onDone: Done }) {
  const t = useTranslations();
  const api = useApi();
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const action = useAction((key) => revokePeriod(api, periodId, reason.trim(), key), `${periodId}|${reason.trim()}`, () => onDone(null));

  function submit() {
    const ok = reason.trim() !== '' && reason.trim().length <= MAX_TEXT;
    setInvalid(!ok);
    if (ok) action.send();
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && !action.pending && onClose()} isDismissable={!action.pending} title={t('orders.revoke.title')}>
      <Form
        onSubmit={submit}
        footer={
          <>
            <Button variant="secondary" isDisabled={action.pending} onPress={onClose}>
              {t('orders.revoke.keep')}
            </Button>
            <Button type="submit" variant="danger" isPending={action.pending}>
              {t('orders.revoke.submit')}
            </Button>
          </>
        }
      >
        <p className="break-words text-ui font-semibold text-ink">{range}</p>
        <p className="break-words text-ui text-muted">{t('orders.revoke.body')}</p>
        {action.error && <Banner variant="error" code={action.error.code}>{action.error.message}</Banner>}
        <TextArea label={t('orders.revoke.reason')} value={reason} onChange={setReason} rows={3} maxLength={MAX_TEXT} counter />
        {invalid && <Invalid text={t('orders.revoke.invalid')} />}
      </Form>
    </Dialog>
  );
}
