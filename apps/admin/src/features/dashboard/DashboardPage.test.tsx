import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { AI_OPERATION_ORDER } from '../ai/ai-api';
import { todayInAdminZone } from '../ai/cost-range';
import { renderApp } from '../staff/test-utils';
import type { AiDashboard, AiQuality, AiUsageDays } from './dashboard-api';

const t = vi.dashboard;
const TODAY = todayInAdminZone(new Date());
const back = (days: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
const urls = (from = back(29), to = TODAY) => ({
  ai: `GET /v1/admin/ai/dashboard?from=${from}&to=${to}`,
  quality: `GET /v1/admin/practice/ai-quality?from=${from}&to=${to}`,
  usage: `GET /v1/admin/entitlements/ai-usage/days?from=${from}&to=${to}`,
});
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant', 'users.read', 'ai.view'],
});

const totals = (calls: number, cost_vnd: number) => ({
  calls, input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.01000000', cost_vnd, unknown_cost_calls: 0,
});
const aiReply = (over: Partial<AiDashboard> = {}): AiDashboard => ({
  from: back(29), to: TODAY, ai_enabled: true,
  today: { calls: 3, cap: 500, failed_calls: 1, failed_cost_usd: '0.00000000', cost_usd: '0.01000000', cost_vnd: 1240 },
  operations: AI_OPERATION_ORDER.map((operation) => ({
    operation, ready: operation !== 'translate_sentence', reason: operation === 'translate_sentence' ? 'model-not-set' : null,
    model: null, last_error: null,
  })),
  total: totals(14, 82),
  days: [{ date: TODAY, calls: 14, cost_usd: '0.01000000', cost_vnd: 82, learner_calls: 10, learner_failed: 1 }],
  by_operation: [{ key: 'generate_cloze', ...totals(4, 36) }],
  by_model: [{ key: 'anthropic/claude-haiku-5-5', ...totals(14, 82) }],
  by_purpose: [{ key: 'learner', ...totals(10, 66) }],
  learner_health: [{ operation: 'generate_cloze', calls: 4, failed: 1, p50_ms: 3766, p95_ms: 4946, outcomes: { succeeded: 3, timeout: 1 } }],
  ...over,
});
const qualityReply = (over: Partial<AiQuality> = {}): AiQuality => ({
  from: back(29), to: TODAY,
  questions: [
    { source: 'ai', type: 'cloze', asked: 200, answered: 180, correct: 135, skipped: 20, hinted: 50 },
    { source: 'rule', type: 'type_word', asked: 100, answered: 100, correct: 90, skipped: 0, hinted: 0 },
  ],
  ai_requests: [
    { type: 'cloze', state: 'ready', failure: null, count: 8 },
    { type: 'cloze', state: 'failed', failure: 'rejected', count: 2 },
  ],
  ai_sessions: [{ stopped: null, count: 5 }, { stopped: 'quota-exhausted', count: 1 }],
  reports: [{ source: 'ai', total: 3, open: 1, no_error: 1, fixed: 1, refunded: 1 }],
  ai_report_reasons: [{ reason: 'wrong_answer', label_vi: 'Đáp án sai', label_en: 'Wrong answer', count: 3 }],
  unknown_forms: { new_forms: 2, rejected_seen: 4 },
  word_checks: [{ verdict: 'not_recognized', count: 1 }],
  ...over,
});
const usageReply = (over: Partial<AiUsageDays> = {}): AiUsageDays => ({
  from: back(29), to: TODAY,
  today: { date: TODAY, used: 10, cap: 1000, alert_percent: 75, alert_reached: false, enabled: true },
  days: [{ date: TODAY, ai_practice: 8, ai_lookup: 2, total: 10, learners: 1 }],
  refunds: 1, days_at_cap: 0,
  ...over,
});
const routes = (u = urls(), replies: { ai?: AiDashboard; quality?: AiQuality; usage?: AiUsageDays } = {}) => ({
  [u.ai]: () => Response.json(replies.ai ?? aiReply()),
  [u.quality]: () => Response.json(replies.quality ?? qualityReply()),
  [u.usage]: () => Response.json(replies.usage ?? usageReply()),
});
const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe('DashboardPage (/dashboard, ai.view)', () => {
  it('reads the last 30 Vietnam days from the three APIs and shows today against the caps', async () => {
    renderApp('/dashboard', routes());
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: t.today.title })).toBeInTheDocument();
    expect(within(tile(t.today.calls)).getByText('3 / 500')).toBeInTheDocument();
    expect(within(tile(t.today.units)).getByText('10 / 1.000')).toBeInTheDocument();
    expect(within(tile(t.today.notReady)).getByText('1 / 6')).toBeInTheDocument();
  });

  it('health: failed share and p50/p95 per operation; an operation without calls shows dashes and its reason', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.health.title });
    expect(within(tile(t.health.failed)).getByText(/^25\s?%$/)).toBeInTheDocument();
    expect(screen.getAllByText('timeout × 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3.766 ms').length).toBeGreaterThan(0);
    expect(screen.getAllByText(vi.ai.reasons['model-not-set']).length).toBeGreaterThan(0);
  });

  it('quality: correct share is of answered questions; reports per 1,000 asked questions of the same source', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.quality.title });
    expect(screen.getAllByText(/^75\s?%$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    expect(screen.getByText('Đáp án sai')).toBeInTheDocument();
    expect(screen.getByText(t.failures.rejected)).toBeInTheDocument();
    expect(screen.getByText(t.impact.notStopped)).toBeInTheDocument();
  });

  it('a 7-day range asks the APIs again for 7 days', async () => {
    const user = userEvent.setup();
    const r = renderApp('/dashboard', { ...routes(), ...routes(urls(back(6))) });
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    await user.click(screen.getByRole('button', { name: new RegExp(t.range) }));
    await user.click(await screen.findByRole('option', { name: '7 ngày gần nhất' }));
    await waitFor(() => expect(r.count('GET', urls(back(6)).ai.slice(4))).toBe(1));
    expect(r.count('GET', urls(back(6)).usage.slice(4))).toBe(1);
  });

  it('an editor with ai.view sees the page and its menu item', async () => {
    renderApp('/dashboard', routes(), EDITOR);
    expect(await screen.findByRole('heading', { level: 2, name: t.cost.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('the AI switch off → a warning; a 403 → the forbidden banner', async () => {
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ ai_enabled: false }) }));
    expect(await screen.findByText(t.aiDisabled)).toBeInTheDocument();
  });

  it('a 403 from any part → the forbidden banner', async () => {
    const u = urls();
    renderApp('/dashboard', { ...routes(), [u.quality]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});
