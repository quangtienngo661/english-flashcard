'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '@/app-shell/session/session-context';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY, type Entitlements } from '@/app-shell/queries';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Dialog } from '@/ui/Dialog';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { isAutoRenewing, subscriptionsOf } from './auto-renewing';

type Source = Entitlements['sources'][number];

/**
 * Design §8.2: one row per subscription the learner has. Renewing: "Gia hạn ngày …" and [Hủy gói]; cancelled: "Gói kết thúc ngày …".
 * A plan a staff member granted is not a subscription and has no button (it does not renew). Only the fake provider makes subscriptions
 * today (payOS sells prepaid periods), so Figma has no frame: the rows and the dialog follow the M3 confirm dialogs (giao diện mới M7.9).
 */
export function SubscriptionRows({ sources }: { sources: Source[] }) {
  const t = useTranslations('App.plans.subscriptions');
  const subscriptions = subscriptionsOf(sources);
  if (subscriptions.length === 0) return null;
  return (
    <section aria-label={t('title')} className="flex w-full flex-col gap-2">
      <h2 className="text-wm-meta font-medium text-wm-muted">{t('title')}</h2>
      <ul className="flex flex-col gap-3">
        {subscriptions.map((source) => (
          <SubscriptionRow key={source.id} source={source} />
        ))}
      </ul>
    </section>
  );
}

function SubscriptionRow({ source }: { source: Source }) {
  const t = useTranslations('App.plans.subscriptions');
  const format = useFormat();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorText = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const lineRef = useRef<HTMLSpanElement>(null);
  const renewing = isAutoRenewing(source);
  const end = source.renews_at ?? source.ends_at;
  const endText = end ? format.date(new Date(end), 'numeric') : null;

  // One Idempotency-Key per press (useSubmitOnce): a retry after a network error is the same write.
  const cancel = useSubmitOnce(async (key) => {
    await api.post(`/v1/me/subscriptions/${source.id}/cancel`, undefined, { idempotencyKey: key });
  });

  // After a cancel the "Hủy gói" button that opened the dialog is gone, so the dialog cannot hand focus back to it: the line that now
  // tells the result takes it. Run once the dialog is closing (no longer containing focus), not while it still is.
  useEffect(() => {
    if (requested && !open) lineRef.current?.focus();
  }, [requested, open]);

  async function confirm() {
    try {
      await cancel.submit();
      setOpen(false);
      setRequested(true);
      showToast(t('requested'), 'success');
      await queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    } catch (error) {
      setOpen(false);
      showToast(errorText(error), 'danger');
      // The plan may already be cancelled (409): read it again so the row tells the truth.
      await queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    }
  }

  let line: string;
  if (renewing && requested) line = t('requested');
  else if (renewing) line = endText ? t('renewsOn', { date: endText }) : t('renews');
  else line = endText ? t('endsOn', { date: endText }) : t('ends');

  return (
    <Card as="li" className="flex flex-wrap items-center justify-between gap-3 border border-wm-line px-5 py-4">
      <span ref={lineRef} tabIndex={-1} className="font-wm-sans text-wm-small-strong text-wm-ink outline-none">{line}</span>
      {renewing && !requested && (
        <TextButton tone="delete" onPress={() => setOpen(true)}>
          {t('cancel')}
        </TextButton>
      )}
      {/* Always mounted, so closing plays the kit's exit motion (GM15). */}
      <Dialog
        isOpen={open}
        onOpenChange={(next) => { if (!cancel.busy) setOpen(next); }}
        isDismissable={!cancel.busy}
        title={t('dialogTitle')}
        footer={
          <>
            <Button variant="secondary" onPress={() => setOpen(false)} isDisabled={cancel.busy}>
              {t('keep')}
            </Button>
            <Button variant="danger" onPress={() => void confirm()} isPending={cancel.busy}>
              {t('confirm')}
            </Button>
          </>
        }
      >
        {/* The M3 confirm dialogs (Figma "Xác nhận xóa" 121:4597): what the learner gives up in a fail-soft block. */}
        <p role="note" className="flex items-start gap-2 rounded-wm-row bg-wm-fail-soft p-4 font-wm-sans text-wm-small-strong text-wm-fail">
          <AlertTriangle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          <span>{endText ? t('dialogBody', { date: endText }) : t('dialogBodyNoDate')}</span>
        </p>
      </Dialog>
    </Card>
  );
}
