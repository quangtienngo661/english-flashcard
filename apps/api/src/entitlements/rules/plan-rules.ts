import { POOL_OF_LIMIT, type AiPool, type Interval, type LimitKey, type Pool, type SubscriptionStatus } from '../entitlements.types.js';

// "What does this user have now" (design §5.4, §5.5, §9.4), computed from sources on every call (D28). Pure: no I/O.

const DAY_MS = 86_400_000;

/** The numbers of each plan (Settings, design §13). Free AI is always 0. */
export type PlanNumbers = { free: Record<Pool, number>; pro: Record<Pool, number>; trial: Record<AiPool, number> };

export type SubscriptionSource = {
  id: string;
  provider: string;
  externalSubscriptionId: string;
  status: SubscriptionStatus;
  trialDenied: boolean;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  /** Shown as the source's `starts_at` (design §8.7); not used by the rules. */
  currentPeriodStart?: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  quotaAnchorAt: Date | null;
  interval: Interval;
  pendingInterval: Interval | null;
};

export type GrantSource = {
  id: string;
  kind: 'plan' | 'limits';
  limits: Partial<Record<LimitKey, number>> | null;
  startsAt: Date;
  endsAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export type Resolved = {
  plan: 'free' | 'trial' | 'pro';
  anchor: Date | null;
  limits: Record<Pool, number>;
  limitFrom: Record<Pool, { kind: 'plan' } | { kind: 'grant'; grantId: string }>;
  proSources: Array<{ kind: 'subscription' | 'grant'; id: string; anchor: Date }>;
};

/**
 * The §9.4 time transitions, applied when read: a trialing/active subscription past its end with no event stays as it is
 * (`overdue`) for `graceDays`, then `on_hold` (D31); `grace` past `graceEndsAt` → `on_hold`; a subscription cancelled at
 * period end → `expired` once that end (for `grace`, `graceEndsAt`) has passed. Every subscription renews automatically (D35).
 */
export function effectiveStatus(
  sub: SubscriptionSource, now: Date, graceDays: number,
): { status: SubscriptionStatus; overdue: boolean } {
  if (sub.status === 'trialing' || sub.status === 'active') {
    const end = sub.status === 'trialing' ? sub.trialEndsAt ?? sub.currentPeriodEnd : sub.currentPeriodEnd;
    if (!end || now < end) return { status: sub.status, overdue: false };
    if (sub.cancelAtPeriodEnd) return { status: 'expired', overdue: false };
    if (now.getTime() < end.getTime() + graceDays * DAY_MS) return { status: sub.status, overdue: true };
    return { status: 'on_hold', overdue: false };
  }
  if (sub.status === 'grace') {
    // A grace row without grace_ends_at (a fetched state copies only the status) still ends, so it is never Pro forever.
    const graceEnd = sub.graceEndsAt
      ?? (sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd.getTime() + graceDays * DAY_MS) : null);
    if (graceEnd && now >= graceEnd) return { status: sub.cancelAtPeriodEnd ? 'expired' : 'on_hold', overdue: false };
  }
  return { status: sub.status, overdue: false };
}

function grantActive(grant: GrantSource, now: Date): boolean {
  return grant.revokedAt === null && grant.startsAt <= now && now < grant.endsAt;
}

function hasAiLimit(grant: GrantSource): boolean {
  return (grant.limits?.ai_practice_per_cycle ?? 0) > 0 || (grant.limits?.ai_lookup_per_cycle ?? 0) > 0;
}

export function resolve(input: {
  subscriptions: SubscriptionSource[];
  grants: GrantSource[];
  numbers: PlanNumbers;
  graceDays: number;
  now: Date;
}): Resolved {
  const { numbers, now } = input;
  let pro = false;
  let trial = false;
  const anchors: Date[] = [];
  const proSources: Resolved['proSources'] = [];

  for (const sub of input.subscriptions) {
    const { status } = effectiveStatus(sub, now, input.graceDays);
    const isPro = status === 'active' || status === 'grace';
    const isTrial = status === 'trialing' && !sub.trialDenied;
    if (!isPro && !isTrial) continue;
    pro ||= isPro;
    trial ||= isTrial;
    if (!sub.quotaAnchorAt) continue;
    anchors.push(sub.quotaAnchorAt);
    if (isPro) proSources.push({ kind: 'subscription', id: sub.id, anchor: sub.quotaAnchorAt });
  }

  const active = input.grants.filter((grant) => grantActive(grant, now));
  for (const grant of active.filter((g) => g.kind === 'plan')) {
    pro = true;
    anchors.push(grant.startsAt);
    proSources.push({ kind: 'grant', id: grant.id, anchor: grant.startsAt });
  }

  const limitsGrants = active
    .filter((g) => g.kind === 'limits')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  // A limits grant anchors the AI cycle only for an account with no Pro or trial source (design §5.5).
  if (!pro && !trial) anchors.push(...limitsGrants.filter(hasAiLimit).map((g) => g.startsAt));

  const plan = pro ? 'pro' : trial ? 'trial' : 'free';
  const limits: Record<Pool, number> = plan === 'pro'
    ? { ...numbers.pro }
    : plan === 'trial'
      ? { practice_sessions: numbers.pro.practice_sessions, ...numbers.trial }
      : { ...numbers.free };
  const limitFrom: Resolved['limitFrom'] = {
    practice_sessions: { kind: 'plan' }, ai_practice: { kind: 'plan' }, ai_lookup: { kind: 'plan' },
  };
  // Oldest first, so the latest created grant that carries a key wins that pool (D19).
  for (const grant of limitsGrants) {
    for (const [key, value] of Object.entries(grant.limits ?? {}) as Array<[LimitKey, number | undefined]>) {
      if (value === undefined) continue;
      limits[POOL_OF_LIMIT[key]] = value;
      limitFrom[POOL_OF_LIMIT[key]] = { kind: 'grant', grantId: grant.id };
    }
  }

  const anchor = anchors.reduce<Date | null>((latest, at) => (latest === null || at > latest ? at : latest), null);
  return { plan, anchor, limits, limitFrom, proSources };
}
