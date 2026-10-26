'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { ENTITLEMENTS_KEY, useEntitlements } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { Button } from '@/app-ui/Button';
import { Checkbox } from '@/app-ui/Checkbox';
import { LockedFeature } from '@/app-ui/Locked';
import { refillKind } from '../settings/refill';
import { useAiLookup, type AiLookupResult } from './ai-lookup-api';

type Failure = { kind: 'locked' } | { kind: 'failed'; retryable: boolean } | { kind: 'quota'; resetsAt: string | null } | { kind: 'other'; text: string };

/**
 * K/85, K/85t, K/85b, K/85c: [Tra bằng AI] and [Tự nhập nghĩa] side by side, the lookups left under the AI button (§15 row 13),
 * the box that sends the sentence (unticked, D20 Bước 7) and the states of a lookup. AI errors say only "the system has a
 * problem" (D11).
 */
export function AiLookupPanel({ text, sentence, onManual, onResult, accent = true }: {
  text: string;
  /** False when the sheet already has its yellow [Lưu …] (one yellow button per screen). */
  accent?: boolean;
  sentence: string;
  onManual: () => void;
  onResult: (result: AiLookupResult) => void;
}) {
  const t = useTranslations('App.addWord.ai');
  const tUi = useTranslations('App.ui');
  const client = useQueryClient();
  const format = useFormat();
  const { state } = useSession();
  const zone = state.status === 'signed-in' ? state.me.timezone : 'UTC';
  const errorText = useErrorMessage();
  const entitlements = useEntitlements().data;
  const lookup = useAiLookup();
  const [sendSentence, setSendSentence] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const allowed = entitlements?.features?.['ai.lookup']?.allowed ?? true;
  const pool = entitlements?.pools?.ai_lookup;
  const withSentence = sentence.trim().length > 0;

  async function run() {
    if (!allowed) return setFailure({ kind: 'locked' });
    setFailure(null);
    try {
      const result = await lookup.run({ text, ...(withSentence && sendSentence ? { context_sentence: sentence.trim() } : {}) });
      if (!result) return;
      void client.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      onResult(result);
    } catch (error) {
      const slug = error instanceof ApiError ? error.problem.slug : '';
      if (slug === 'entitlement-required') {
        void client.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        setFailure({ kind: 'locked' });
      } else if (slug === 'ai-lookup-failed') setFailure({ kind: 'failed', retryable: (error as ApiError).problem.extensions?.retryable === true });
      else if (slug === 'ai-unavailable') setFailure({ kind: 'failed', retryable: false });
      else if (slug === 'quota-exhausted') {
        const resetsAt = (error as ApiError).problem.extensions?.resets_at;
        setFailure({ kind: 'quota', resetsAt: typeof resetsAt === 'string' ? resetsAt : null });
      } else setFailure({ kind: 'other', text: errorText(error) });
    }
  }

  let refill = '';
  if (failure?.kind === 'quota' && failure.resetsAt) {
    refill = refillKind(failure.resetsAt, new Date(), zone) === 'time'
      ? t('refillTime', { time: format.resetAt(failure.resetsAt) })
      : t('refillDate', { date: format.date(failure.resetsAt, 'dayMonth') });
  }

  return (
    <div className="flex flex-col gap-3">
      {withSentence && (
        <Checkbox isSelected={sendSentence} onChange={setSendSentence}>
          {t('sendSentence')}
        </Checkbox>
      )}
      <div className="grid grid-cols-2 items-start gap-3">
        <div className="flex flex-col items-stretch gap-1">
          <Button variant={!allowed ? 'quiet' : accent ? 'sticker' : 'primary'} isPending={lookup.busy} onPress={() => void run()} className="w-full">
            {t('button')}
            {!allowed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">
                <Lock aria-hidden className="size-3" />
                {tUi('proBadge')}
              </span>
            )}
          </Button>
          {allowed && pool && pool.limit > 0 && (
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-caption text-muted">
              {entitlements?.plan === 'trial' && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-ink">{t('trial')}</span>
              )}
              <span>{t('left', { count: pool.remaining })}</span>
            </p>
          )}
        </div>
        <Button variant="quiet" onPress={onManual} className="w-full">
          {t('manual')}
        </Button>
      </div>
      {lookup.busy && (
        <p role="status" className="text-ui text-muted">
          {t('looking')}
        </p>
      )}
      {failure?.kind === 'locked' && <LockedFeature />}
      {failure && failure.kind !== 'locked' && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-inner bg-accent-soft p-3">
          <p className="text-ui text-ink">
            {failure.kind === 'failed' ? t('failed') : failure.kind === 'quota' ? [t('quota'), refill].filter(Boolean).join(' ') : failure.text}
          </p>
          {failure.kind === 'failed' && failure.retryable && (
            <Button variant="quiet" isPending={lookup.busy} onPress={() => void run()}>
              {t('retry')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
