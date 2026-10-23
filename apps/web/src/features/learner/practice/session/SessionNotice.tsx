'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useFormat } from '@/app-shell/format';
import { useApi, useSession } from '@/app-shell/session/session-context';
import { refillKind } from '../../settings/refill';
import { wordHref } from '../../word/word-api';
import type { SessionNotice as Notice } from './use-practice-session';

/** The learner's own word behind a `sense_id` (the API sends no lemma with `word-not-recognized`). */
export function useSenseLemma(senseId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ['sense', senseId],
    queryFn: () => api.get<{ lemma: string }>(`/v1/senses/${senseId}`),
    enabled: senseId !== null,
    staleTime: Infinity,
  }).data?.lemma;
}

/** "Lượt câu AI mới có vào 15/11." or "… lúc 0:00." (D15). */
export function useAiRefillLine() {
  const t = useTranslations('App.practice.session.ai');
  const format = useFormat();
  const { state } = useSession();
  const zone = state.status === 'signed-in' ? state.me.timezone : 'UTC';
  return (resetsAt: string | null) => {
    if (!resetsAt) return '';
    return refillKind(resetsAt, new Date(), zone) === 'time'
      ? t('refillTime', { time: format.resetAt(resetsAt) })
      : t('refillDate', { date: format.date(resetsAt, 'dayMonth') });
  };
}

/** The link to the learner's word (K/74a, K/76): "Xem lại từ trong Từ của tôi" (copy doc §17.1). */
export function SeeWordLink({ lemma }: { lemma: string }) {
  const t = useTranslations('App.practice.session.ai');
  const locale = useLocale();
  return (
    <Link href={wordHref(locale, lemma)} className="font-semibold text-primary underline underline-offset-2">
      {t('seeWord')}
    </Link>
  );
}

/** K/75 (one general line, D11), K/75b (credits ran out, with the refill), K/76 (the learner's word AI did not recognise); closable. */
export function SessionNotice({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const t = useTranslations('App.practice.session.ai');
  const refill = useAiRefillLine();
  const lemma = useSenseLemma(notice.kind === 'word-not-recognized' ? notice.senseId : null);
  let text: string | null;
  if (notice.kind === 'word-not-recognized') text = lemma ? t('notRecognized', { lemma }) : null;
  else if (notice.reason === 'quota-exhausted') text = [t('fallbackQuota'), refill(notice.resetsAt)].filter(Boolean).join(' ');
  else text = t('fallback');
  if (text === null) return null;
  return (
    <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-inner border-2 border-accent bg-accent-soft px-4 py-3">
      <p className="text-ui text-ink">
        {text}
        {notice.kind === 'word-not-recognized' && lemma && (
          <>
            {' '}
            <SeeWordLink lemma={lemma} />
          </>
        )}
      </p>
      <button
        type="button"
        aria-label={t('dismiss')}
        onClick={onDismiss}
        className="shrink-0 rounded-sm p-0.5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
