import type { Plan } from './mock-api';

const pool = (limit: number, used: number, resets_at: string | null) => ({ limit, used, remaining: limit - used, resets_at });

/** The next midnight in Ho Chi Minh City after now, as the API's practice pool reports it. */
export function nextHcmMidnight(now = new Date()): string {
  const hcm = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(Date.UTC(hcm.getUTCFullYear(), hcm.getUTCMonth(), hcm.getUTCDate() + 1) - 7 * 3_600_000).toISOString();
}

/**
 * A Free account has the monthly AI allowance since launch prep A (15 questions and 5 lookups, 3 and 0 used); `freeAi: false` is a Free
 * account whose AI the admin switched off (both numbers 0): the pools are empty and both AI features say plan-required.
 */
export function entitlementsBody(plan: Plan, { freeAi = true }: { freeAi?: boolean } = {}) {
  const later = new Date(Date.now() + 23 * 86_400_000).toISOString();
  const noAi = plan === 'free' && !freeAi;
  return {
    plan,
    sources: [],
    pools: {
      practice_sessions: pool(plan === 'free' ? 3 : 30, 1, nextHcmMidnight()),
      ai_practice: noAi ? pool(0, 0, null) : plan === 'free' ? pool(15, 3, later) : pool(300, 13, later),
      ai_lookup: noAi ? pool(0, 0, null) : plan === 'free' ? pool(5, 0, later) : pool(100, 4, later),
    },
    features: {
      'ai.practice': { allowed: !noAi, reason: noAi ? 'plan-required' : null },
      'ai.lookup': { allowed: !noAi, reason: noAi ? 'plan-required' : null },
    },
    ai_available: { enabled: true, cap_reached: false },
    trial_eligible: false,
  };
}

export const APP_CONFIG = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' },
  learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: {
    free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 },
    trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
    pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100, prices: { '1': 79000, '3': 199000, '12': 599000 } },
  },
};

/** The longest names of the copy doc (§4.10): 60-character deck name, long Vietnamese words. */
export const LONG = {
  givenName: 'Nguyễn Thị Phương Thảo Ngọc Bích Hoàng Anh Minh Châu',
  familyName: 'Tôn Nữ Huyền Trang Diệp Lam',
  email: 'phuong.thao.ngoc.bich.hoang.anh.minh.chau.2008@example-school.edu.vn',
  /** 60 characters, the deck name limit. */
  deckName: 'Từ vựng chuyên ngành công nghệ thông tin phát triển phần mềm',
  /** 60 characters with no space (the API allows it): the word breaks nowhere on its own (audit 26/10/2026 #1, #11). */
  unbrokenDeckName: 'Supercalifragilisticexpialidociousantidisestablishmentarianism'.slice(0, 60),
  /** A 280-character saved sentence. */
  sentence: `We deploy ${'the newest internationalization-ready microservices '.repeat(5)}every Friday afternoon.`.slice(0, 280),
};
