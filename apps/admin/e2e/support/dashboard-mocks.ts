import type { MockHandler } from './mock-api';

const totals = (calls: number, cost_vnd: number) => ({
  calls, input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00315870', cost_vnd, unknown_cost_calls: 0,
});
const OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];

/** The three reads of `/dashboard`, answered with the numbers of the first real AI run (28/10/2026); the range is echoed back. */
export const dashboardMocks: Record<string, MockHandler> = {
  'GET /v1/admin/ai/dashboard': ({ query }) => ({ json: {
    from: query.get('from'), to: query.get('to'), ai_enabled: true,
    today: { calls: 14, cap: 500, failed_calls: 0, failed_cost_usd: '0.00000000', cost_usd: '0.00315870', cost_vnd: 82 },
    operations: OPERATIONS.map((operation) => ({
      operation, ready: operation !== 'translate_sentence', reason: operation === 'translate_sentence' ? 'model-not-set' : null,
      model: operation === 'translate_sentence' ? null : { provider: 'anthropic', model_id: 'claude-haiku-5-5' }, last_error: null,
    })),
    total: totals(14, 82),
    days: [{ date: query.get('to'), calls: 14, cost_usd: '0.00315870', cost_vnd: 82, learner_calls: 10, learner_failed: 0 }],
    by_operation: [{ key: 'generate_cloze', ...totals(4, 36) }, { key: 'lookup_word', ...totals(3, 11) }],
    by_model: [{ key: 'anthropic/claude-haiku-5-5', ...totals(14, 82) }],
    by_purpose: [{ key: 'learner', ...totals(10, 66) }, { key: 'test', ...totals(4, 16) }],
    learner_health: [{ operation: 'generate_cloze', calls: 3, failed: 0, p50_ms: 3766, p95_ms: 4946, outcomes: { succeeded: 3 } }],
  } }),
  'GET /v1/admin/practice/ai-quality': ({ query }) => ({ json: {
    from: query.get('from'), to: query.get('to'),
    questions: [
      { source: 'ai', type: 'cloze', asked: 3, answered: 3, correct: 3, skipped: 0, hinted: 3 },
      { source: 'rule', type: 'type_word', asked: 1, answered: 1, correct: 1, skipped: 0, hinted: 0 },
    ],
    ai_requests: [{ type: 'cloze', state: 'ready', failure: null, count: 3 }],
    ai_sessions: [{ stopped: null, count: 1 }],
    reports: [], ai_report_reasons: [], unknown_forms: { new_forms: 0, rejected_seen: 0 }, word_checks: [],
  } }),
  'GET /v1/admin/entitlements/ai-usage/days': ({ query }) => ({ json: {
    from: query.get('from'), to: query.get('to'),
    today: { date: query.get('to'), used: 10, confirmed: 10, reserved: 0, cap: 1000, alert_percent: 75, alert_reached: false, enabled: true },
    days: [{ date: query.get('to'), ai_practice: 10, ai_lookup: 0, total: 10, learners: 1 }],
    refunds: 0, days_at_cap: 0,
  } }),
};
