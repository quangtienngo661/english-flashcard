import type { Plan } from './mock-api';

const pool = (limit: number, used: number, resets_at: string | null) => ({ limit, used, remaining: limit - used, resets_at });

/** The next midnight in Ho Chi Minh City after now, as the API's practice pool reports it. */
export function nextHcmMidnight(now = new Date()): string {
  const hcm = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(Date.UTC(hcm.getUTCFullYear(), hcm.getUTCMonth(), hcm.getUTCDate() + 1) - 7 * 3_600_000).toISOString();
}

export function entitlementsBody(plan: Plan) {
  const later = new Date(Date.now() + 23 * 86_400_000).toISOString();
  return {
    plan,
    sources: [],
    pools: {
      practice_sessions: pool(plan === 'free' ? 3 : 30, 1, nextHcmMidnight()),
      ai_practice: plan === 'free' ? pool(0, 0, null) : pool(300, 13, later),
      ai_lookup: plan === 'free' ? pool(0, 0, null) : pool(100, 4, later),
    },
    features: {
      'ai.practice': { allowed: plan !== 'free', reason: plan === 'free' ? 'plan-required' : null },
      'ai.lookup': { allowed: plan !== 'free', reason: plan === 'free' ? 'plan-required' : null },
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
    free: { practice_sessions_per_day: 3 },
    trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
    pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
  },
};

/** The longest names of the copy doc (§4.10): 60-character deck name, long Vietnamese words. */
export const LONG = {
  givenName: 'Nguyễn Thị Phương Thảo Ngọc Bích Hoàng Anh Minh Châu',
  familyName: 'Tôn Nữ Huyền Trang Diệp Lam',
  email: 'phuong.thao.ngoc.bich.hoang.anh.minh.chau.2008@example-school.edu.vn',
};
