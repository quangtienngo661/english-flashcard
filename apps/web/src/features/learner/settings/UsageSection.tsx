'use client';

import { useTranslations } from 'next-intl';
import { useFormat } from '@/app-shell/format';
import { useEntitlements, type Pool } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { refillKind } from './refill';

/** K/50 "Gói và mức sử dụng" rows below the plan: practice sessions today, then the two AI pools (D15, E26). */
export function UsageRows() {
  const t = useTranslations('App.settings');
  const { data } = useEntitlements();
  if (!data) return null;
  const { practice_sessions: practice, ai_practice: aiPractice, ai_lookup: aiLookup } = data.pools;

  return (
    <>
      <li className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ui font-semibold text-ink">{t('practiceToday')}</span>
          <span className="text-ui font-semibold text-ink">{t('used', { used: practice.used, limit: practice.limit })}</span>
        </div>
        <Meter value={practice.used} max={practice.limit} label={t('practiceToday')} />
        <PracticeLeft pool={practice} />
      </li>
      <AiRow label={t('aiPractice')} pool={aiPractice} refill="aiPracticeRefill" />
      <AiRow label={t('aiLookup')} pool={aiLookup} refill="aiLookupRefill" />
    </>
  );
}

function useZone(): string {
  const { state } = useSession();
  return state.status === 'signed-in' ? state.me.timezone : 'UTC';
}

function PracticeLeft({ pool }: { pool: Pool }) {
  const t = useTranslations('App.settings');
  const format = useFormat();
  if (!pool.resets_at) return null;
  return <p className="text-caption text-muted">{t('practiceLeft', { remaining: pool.remaining, time: format.resetAt(pool.resets_at) })}</p>;
}

function AiRow({ label, pool, refill }: { label: string; pool: Pool; refill: 'aiPracticeRefill' | 'aiLookupRefill' }) {
  const t = useTranslations('App.settings');
  const format = useFormat();
  const zone = useZone();
  // Free has no AI pool at all: a limit of 0 means the plan does not include it (D6).
  if (pool.limit === 0) {
    return (
      <li className="flex items-center justify-between gap-3 py-3">
        <span className="text-ui font-semibold text-ink">{label}</span>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-ink">{t('needsPro')}</span>
      </li>
    );
  }
  const kind = pool.resets_at ? refillKind(pool.resets_at, new Date(), zone) : null;
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-ui font-semibold text-ink">{label}</span>
        <span className="text-ui font-semibold text-ink">{t('remaining', { remaining: pool.remaining, limit: pool.limit })}</span>
      </div>
      <Meter value={pool.remaining} max={pool.limit} label={label} />
      {pool.resets_at && kind === 'date' && <p className="text-caption text-muted">{t(refill, { date: format.date(pool.resets_at, 'dayMonth') })}</p>}
      {pool.resets_at && kind === 'time' && <p className="text-caption text-muted">{t(`${refill}Time`, { time: format.time(pool.resets_at) })}</p>}
    </li>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-neutral-soft">
      <div
        className="h-full rounded-full bg-primary"
        // raw-ok: the bar width is the value itself
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
