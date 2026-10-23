'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/app-ui/Button';
import { SeeWordLink, useAiRefillLine, useSenseLemma } from './SessionNotice';
import type { AiReason } from './use-practice-session';

type Props = {
  reason: AiReason;
  resetsAt: string | null;
  senseId: string | null;
  busy: boolean;
  onRetry: () => void;
  onLater: () => void;
};

/**
 * K/74a–K/74d: the session asks only AI questions and none can be made now. One general line for a failure (D11, E30); the
 * credits and plan cases say why and offer only [Để sau], since trying again cannot help (E31). The session stays open.
 */
export function AiUnavailableState({ reason, resetsAt, senseId, busy, onRetry, onLater }: Props) {
  const t = useTranslations('App.practice.session.ai');
  const refill = useAiRefillLine();
  const lemma = useSenseLemma(senseId);
  const retryable = reason === 'ai-failed' || reason === 'ai-unavailable';
  let title: string;
  let body: string | null = null;
  if (reason === 'quota-exhausted') {
    title = t('quotaTitle');
    body = refill(resetsAt) || null;
  } else if (reason === 'plan-required') {
    title = t('planTitle');
    body = t('planBody');
  } else if (lemma) {
    title = t('notRecognizedStop', { lemma });
  } else {
    title = t('errorTitle');
  }
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-card bg-surface p-6">
      <h1 className="text-title font-bold text-ink">{title}</h1>
      {body && <p className="text-body text-ink">{body}</p>}
      {lemma && retryable && (
        <p className="text-body">
          <SeeWordLink lemma={lemma} />
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {retryable && (
          <Button variant="sticker" isPending={busy} onPress={onRetry}>
            {t('retry')}
          </Button>
        )}
        <Button variant={retryable ? 'quiet' : 'sticker'} onPress={onLater}>
          {t('later')}
        </Button>
      </div>
      <p className="text-caption text-muted">{t('stayOpen')}</p>
    </section>
  );
}
