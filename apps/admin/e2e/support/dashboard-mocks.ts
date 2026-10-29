import type { MockHandler } from './mock-api';

const totals = (calls: number, cost_vnd: number) => ({
  calls, input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00315870', cost_vnd, unknown_cost_calls: 0,
});
const OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];

/** Zero for every counter of an eval half; a test or mock overrides the few it needs. */
const split = (over: Record<string, number>) => ({
  total: 0, pending: 0, skipped: 0, shape_pass: 0, shape_fail: 0, shape_transient: 0, rule_pass: 0, rule_fail: 0, rule_skipped: 0, rule_not_applicable: 0,
  expected_pass: 0, expected_fail: 0, expected_none: 0, failing: 0, ...over,
});
const verdicts = (over: Record<string, number>) => ({ pass: 0, fail_major: 0, fail_minor: 0, unscored: 0, ...over });

/** The seeded judge "Chỉ một đáp án" saved twice: revision 1 agrees with the owner's labels, revision 2 has too few. */
export const JUDGE_REVISIONS = [
  { id: '5c2f0a52-2b3e-4a37-9d77-0c0c2b6a1a01', judge_id: 'a1d0d5c2-6f58-4a53-8e0a-1a0f6b2b7c01', judge_name: 'Chỉ một đáp án', revision: 1,
    saved_at: '2026-10-27T01:00:00.000Z', criteria: [{ code: 'single_answer', labeled: 20, agree: 19, calibrated: true }] },
  { id: '5c2f0a52-2b3e-4a37-9d77-0c0c2b6a1a02', judge_id: 'a1d0d5c2-6f58-4a53-8e0a-1a0f6b2b7c01', judge_name: 'Chỉ một đáp án', revision: 2,
    saved_at: '2026-10-29T01:00:00.000Z', criteria: [{ code: 'single_answer', labeled: 4, agree: 3, calibrated: false }] },
];
const judgeGroup = (source: 'eval' | 'real', revision: 0 | 1, number: number, firstScoredAt: string, counts: Record<string, number>) => ({
  operation: 'generate_cloze', source, config_number: number, model: 'claude-haiku-5-5', judge_revision_id: JUDGE_REVISIONS[revision].id,
  criterion: 'single_answer', counts: verdicts(counts), first_scored_at: firstScoredAt,
});
/** The four reads of `/dashboard`, answered with the numbers of the first real AI run (28/10/2026); the range is echoed back. */
export const dashboardMocks: Record<string, MockHandler> = {
  'GET /v1/admin/ai/dashboard': ({ query }) => ({ json: {
    from: query.get('from'), to: query.get('to'), ai_enabled: true,
    today: {
      calls: 14, cap: 500, failed_calls: 0, failed_cost_usd: '0.00000000', cost_usd: '0.00315870', cost_vnd: 82, admin_cost_usd: '0.42000000', admin_usd_cap: 2,
    },
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
    // One operation with a complete eval, the others without a frozen version of the example set yet.
    latest_evals: OPERATIONS.map((operation) => (operation === 'generate_cloze'
      ? {
        operation, set: { id: '0b0e8d2e-62d6-4e5d-8f0a-6e8f3a9c1b01', version: 2 }, live: { config_id: '7d3c1d9a-5d3b-4c88-9c36-0f3f1b2a4e01', number: 2, model: 'claude-haiku-5-5' },
        run: {
          id: 'c9e1f6a0-3c1d-4b0a-8c3e-2d1b0a9f8e01', created_at: '2026-10-29T03:00:00.000Z', model: 'claude-haiku-5-5',
          stats: {
            dev: split({ total: 20, shape_pass: 20, rule_pass: 18, rule_fail: 2, expected_pass: 9, expected_fail: 1, expected_none: 10, failing: 3 }),
            held_out: split({ total: 6, shape_pass: 6, rule_pass: 5, rule_fail: 1, failing: 1 }),
          },
          judge: [{ judge_revision_id: JUDGE_REVISIONS[1].id, criterion: 'single_answer', dev: verdicts({ pass: 17, fail_major: 1, fail_minor: 1, unscored: 1 }), held_out: verdicts({ pass: 5, fail_major: 1 }) }],
        },
      }
      : { operation, set: null, live: { config_id: '7d3c1d9a-5d3b-4c88-9c36-0f3f1b2a4e02', number: 1, model: 'claude-haiku-5-5' }, run: null })),
    judge_scores: [
      judgeGroup('eval', 0, 1, '2026-10-27T03:00:00.000Z', { pass: 16, fail_major: 2, fail_minor: 2 }),
      judgeGroup('eval', 1, 2, '2026-10-29T03:00:00.000Z', { pass: 17, fail_major: 1, fail_minor: 1, unscored: 1 }),
    ],
    judge_revisions: JUDGE_REVISIONS,
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
    ai_second_tries: [{ type: 'cloze', first_answers: 3, second_tries: 0 }],
    real_judge_scores: [judgeGroup('real', 1, 2, '2026-10-29T08:00:00.000Z', { pass: 9, fail_major: 1 })],
    real_judge_latest: [{
      operation: 'generate_cloze', pass_id: 'f1a2b3c4-5d6e-4f70-8a9b-0c1d2e3f4a01', judge_revision_id: JUDGE_REVISIONS[1].id, criterion: 'single_answer',
      counts: verdicts({ pass: 9, fail_major: 1 }), scored_at: '2026-10-29T08:00:00.000Z',
    }],
  } }),
  'GET /v1/admin/entitlements/ai-usage/pro': () => ({ json: {
    pro_learners: 1, no_limit: 0, truncated: false,
    buckets: [
      { key: '0', learners: 1 }, { key: '1-49', learners: 0 }, { key: '50-79', learners: 0 }, { key: '80-99', learners: 0 },
      { key: '100', learners: 0 },
    ],
  } }),
  'GET /v1/admin/entitlements/ai-usage/days': ({ query }) => ({ json: {
    from: query.get('from'), to: query.get('to'),
    today: { date: query.get('to'), used: 10, confirmed: 10, reserved: 0, cap: 1000, alert_percent: 75, alert_reached: false, enabled: true },
    days: [{ date: query.get('to'), ai_practice: 10, ai_lookup: 0, total: 10, learners: 1, cap: 1000, at_cap: false }],
    refunds: 0, days_at_cap: 0,
  } }),
};
