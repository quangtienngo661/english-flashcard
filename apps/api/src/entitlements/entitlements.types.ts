// Types shared by every part of Entitlements (design §5–§9). Values match the CHECKs of the entitlements migration.

export type Pool = 'practice_sessions' | 'ai_practice' | 'ai_lookup';

export type AiPool = Exclude<Pool, 'practice_sessions'>;

/** The numbers a plan or a limits grant sets (design §5.2, §10). */
export type LimitKey = 'practice_sessions_per_day' | 'ai_practice_per_cycle' | 'ai_lookup_per_cycle';

export const POOL_OF_LIMIT: Record<LimitKey, Pool> = {
  practice_sessions_per_day: 'practice_sessions',
  ai_practice_per_cycle: 'ai_practice',
  ai_lookup_per_cycle: 'ai_lookup',
};

export type SubscriptionStatus = 'trialing' | 'active' | 'grace' | 'on_hold' | 'expired' | 'revoked';

export type Interval = 'month' | 'year';

export type BillingEnvironment = 'sandbox' | 'production';

export type NoticeKind = 'trial_started' | 'trial_reminder' | 'renewal_notice';
