'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useFormat } from '@/app-shell/format';
import { hardReplace } from '@/app-shell/navigate';
import { ENTITLEMENTS_KEY, useEntitlements } from '@/app-shell/queries';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { sortForToday } from '../groups/GroupCard';
import { useGroups } from '../groups/groups-api';
import { ResumeDialog } from './CurrentSessionCard';
import { CustomizeDialog, type CustomizeTarget } from './CustomizeDialog';
import { useCurrentSession, useStartSession, type AiStartProblem, type StartBody } from './practice-api';

const NO_WORDS_REASONS = ['group-empty', 'source-empty', 'no-word-fits-types'] as const;

/** 403 ai-quota-insufficient (K/71, extension members `needed`, `remaining`, `resets_at`), 503 ai-unavailable (K/72), 403 entitlement-required (E24). */
function aiRefusal(error: unknown): AiStartProblem | null {
  if (!(error instanceof ApiError)) return null;
  const ext = error.problem.extensions ?? {};
  switch (error.problem.slug) {
    case 'ai-quota-insufficient':
      return {
        kind: 'quota', needed: Number(ext.needed ?? 0), remaining: Number(ext.remaining ?? 0),
        resetsAt: typeof ext.resets_at === 'string' ? ext.resets_at : null,
      };
    case 'ai-unavailable':
      return { kind: 'unavailable' };
    case 'entitlement-required':
      return { kind: 'locked' };
    default:
      return null;
  }
}

/**
 * Starting a session from any button (K/51, K/56): one write per press, K/77 first when a session is open (E35), K/55 on
 * 403 quota-exhausted (E25), the 409 practice-no-words reason next to the button pressed, and the customise dialog (K/54).
 * `Origin` names the button, so its error and busy state show there.
 */
export function usePracticeStarter<Origin extends string>() {
  const t = useTranslations('App.practice');
  const locale = useLocale();
  const format = useFormat();
  const errorText = useErrorMessage();
  const groups = useGroups();
  const entitlements = useEntitlements();
  const current = useCurrentSession();
  const start = useStartSession();
  const [customize, setCustomize] = useState<CustomizeTarget | null>(null);
  const [asking, setAsking] = useState<{ origin: Origin | 'dialog'; body: StartBody } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Origin | 'dialog', string>>>({});
  const [refusedAt, setRefusedAt] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin | 'dialog' | null>(null);
  const [aiProblem, setAiProblem] = useState<AiStartProblem | null>(null);
  const client = useQueryClient();
  const requestRef = useRef<StartBody | null>(null);
  const { submit, busy } = useSubmitOnce(async (key) => {
    await start(requestRef.current!, key);
    hardReplace(`/${locale}/app/practice/session`);
    return true;
  });

  const decks = sortForToday(groups.data?.items ?? []);
  const pool = entitlements.data?.pools.practice_sessions;
  const out = refusedAt !== null || (pool !== undefined && pool.limit > 0 && pool.remaining === 0);
  const resetsAt = pool?.resets_at ?? refusedAt;
  const reopensAt = out && resetsAt ? format.resetAt(resetsAt) : null;

  async function run(from: Origin | 'dialog', body: StartBody) {
    requestRef.current = body;
    setOrigin(from);
    setErrors({});
    setAiProblem(null);
    try {
      await submit(JSON.stringify(body));
    } catch (error) {
      setAsking(null);
      if (error instanceof ApiError && error.problem.slug === 'quota-exhausted') {
        setCustomize(null);
        const at = error.problem.extensions?.resets_at;
        setRefusedAt(typeof at === 'string' ? at : '');
        return;
      }
      const ai = aiRefusal(error);
      if (ai) {
        // AI types come only from the customise dialog: the refusal is told there (K/71, K/72, E24).
        if (ai.kind === 'locked') void client.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        setAiProblem(ai);
        return;
      }
      const reason = error instanceof ApiError && error.problem.slug === 'practice-no-words' ? error.problem.extensions?.reason : undefined;
      const known = NO_WORDS_REASONS.find((r) => r === reason);
      setErrors({ [from]: known ? t(`noWords.${known}`) : errorText(error) } as Partial<Record<Origin | 'dialog', string>>);
    }
  }

  function request(from: Origin | 'dialog', body: StartBody) {
    if (busy) return;
    if (current.data) setAsking({ origin: from, body });
    else void run(from, body);
  }

  const dialogs = (
    <>
      <CustomizeDialog
        target={customize}
        onClose={() => {
          setCustomize(null);
          setAiProblem(null);
        }}
        groups={decks}
        onStart={(body) => request('dialog', body)}
        busy={busy && origin === 'dialog'}
        error={errors.dialog ?? null}
        outLine={reopensAt ? t('usage.outShort', { time: reopensAt }) : null}
        aiProblem={aiProblem}
        onClearAiProblem={() => setAiProblem(null)}
      />
      <ResumeDialog
        current={current.data ?? null}
        groups={decks}
        isOpen={asking !== null}
        onClose={() => setAsking(null)}
        onResume={() => hardReplace(`/${locale}/app/practice/session`)}
        onStartNew={() => asking && void run(asking.origin, asking.body)}
        busy={busy}
      />
    </>
  );

  return {
    request,
    pending: (from: Origin) => busy && origin === from,
    error: (from: Origin) => errors[from] ?? null,
    customize: setCustomize,
    out,
    reopensAt,
    current,
    decks,
    dialogs,
  };
}
