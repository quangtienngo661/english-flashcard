'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useApi } from '@/app-shell/session/session-context';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY, type Entitlements } from '@/app-shell/queries';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { showToast } from '@/app-ui/Toast';
import { isAutoRenewing, subscriptionsOf } from './auto-renewing';

type Source = Entitlements['sources'][number];

/**
 * Design §8.2: one row per subscription the learner has. Renewing: "Gia hạn ngày …" and [Hủy gói]; cancelled: "Gói kết thúc ngày …".
 * A plan a staff member granted is not a subscription and has no button (it does not renew).
 */
export function SubscriptionRows({ sources }: { sources: Source[] }) {
  const t = useTranslations('App.plans.subscriptions');
  const subscriptions = subscriptionsOf(sources);
  if (subscriptions.length === 0) return null;
  return (
    <section aria-label={t('title')} className="flex w-full max-w-4xl flex-col gap-2">
      <h2 className="text-caption font-semibold text-muted">{t('title')}</h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4 md:px-5">
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
  const renewing = isAutoRenewing(source);
  const end = source.renews_at ?? source.ends_at;
  const endText = end ? format.date(new Date(end), 'full') : null;

  // One Idempotency-Key per press (useSubmitOnce): a retry after a network error is the same write.
  const cancel = useSubmitOnce(async (key) => {
    await api.post(`/v1/me/subscriptions/${source.id}/cancel`, undefined, { idempotencyKey: key });
  });

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
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <span className="text-ui font-semibold text-ink">{line}</span>
      {renewing && !requested && (
        <Button variant="quiet" onPress={() => setOpen(true)}>
          {t('cancel')}
        </Button>
      )}
      {open && (
        <Dialog
          isOpen
          onOpenChange={(next) => { if (!cancel.busy) setOpen(next); }}
          isDismissable={!cancel.busy}
          title={t('dialogTitle')}
          footer={
            <>
              <Button variant="quiet" onPress={() => setOpen(false)} isDisabled={cancel.busy}>
                {t('keep')}
              </Button>
              <Button variant="sticker" onPress={() => void confirm()} isPending={cancel.busy}>
                {t('confirm')}
              </Button>
            </>
          }
        >
          <p className="text-body text-ink">{endText ? t('dialogBody', { date: endText }) : t('dialogBodyNoDate')}</p>
        </Dialog>
      )}
    </li>
  );
}
