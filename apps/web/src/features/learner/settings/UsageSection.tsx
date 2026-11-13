'use client';

import { useTranslations } from 'next-intl';
import { useFormat } from '@/app-shell/format';
import { useEntitlements, type Pool } from '@/app-shell/queries';
import { useSession } from '@/app-shell/session/session-context';
import { Tag } from '@/ui/Tag';
import { refillKind } from './refill';
import { SettingsRow } from './SettingsRows';

const COUNT = 'whitespace-nowrap text-wm-meta font-medium text-wm-muted';

/**
 * Cài đặt "Gói và mức sử dụng" rows below the plan (Figma 120:4385 rows 5–7; D15, E26): practice sessions today, then the two AI pools.
 * Each bar fills by the number its text shows: used for practice, remaining for AI (M7 Figma A Conflict 7).
 */
export function UsageRows() {
  const t = useTranslations('App.settings');
  const format = useFormat();
  const { data } = useEntitlements();
  if (!data) return null;
  const { practice_sessions: practice, ai_practice: aiPractice, ai_lookup: aiLookup } = data.pools;

  return (
    <>
      <SettingsRow
        label={t('practiceToday')}
        hint={practice.resets_at ? t('practiceLeft', { remaining: practice.remaining, time: format.resetAt(practice.resets_at) }) : undefined}
        value={<Meter value={practice.used} max={practice.limit} label={t('practiceToday')} />}
        control={<span className={COUNT}>{t('used', { used: practice.used, limit: practice.limit })}</span>}
      />
      <AiRow label={t('aiPractice')} pool={aiPractice} refill="aiPracticeRefill" />
      <AiRow label={t('aiLookup')} pool={aiLookup} refill="aiLookupRefill" />
    </>
  );
}

function useZone(): string {
  const { state } = useSession();
  return state.status === 'signed-in' ? state.me.timezone : 'UTC';
}

function AiRow({ label, pool, refill }: { label: string; pool: Pool; refill: 'aiPracticeRefill' | 'aiLookupRefill' }) {
  const t = useTranslations('App.settings');
  const format = useFormat();
  const zone = useZone();
  // A limit of 0 means this account has no AI of this kind: a Free account whose allowance the admin set to 0, or a limits grant of 0 (D6).
  if (pool.limit === 0) return <SettingsRow label={label} control={<Tag tone="accent">{t('needsPro')}</Tag>} />;
  const kind = pool.resets_at ? refillKind(pool.resets_at, new Date(), zone) : null;
  const hint =
    pool.resets_at && kind === 'date'
      ? t(refill, { date: format.date(pool.resets_at, 'dayMonth') })
      : pool.resets_at && kind === 'time'
        ? t(`${refill}Time`, { time: format.time(pool.resets_at) })
        : undefined;
  return (
    <SettingsRow
      label={label}
      hint={hint}
      value={<Meter value={pool.remaining} max={pool.limit} label={label} />}
      control={<span className={COUNT}>{t('remaining', { remaining: pool.remaining, limit: pool.limit })}</span>}
    />
  );
}

/** Track `--line` 6 px, fill `--accent`, both fully round (radius 3). */
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1.5 w-full overflow-hidden rounded-wm-pill bg-wm-line">
      <div
        className="h-full rounded-wm-pill bg-wm-accent"
        // raw-ok: the bar width is the value itself
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
