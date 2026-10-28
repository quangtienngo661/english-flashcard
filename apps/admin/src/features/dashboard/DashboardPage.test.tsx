import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { AI_OPERATION_ORDER } from '../ai/ai-api';
import { todayInAdminZone } from '../ai/cost-range';
import { renderApp } from '../staff/test-utils';
import type { AiDashboard, AiQuality, AiUsageDays, AiUsagePro } from './dashboard-api';

const t = vi.dashboard;
const PRO_URL = 'GET /v1/admin/entitlements/ai-usage/pro';
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
  ai_second_tries: [
    { type: 'cloze', first_answers: 24, second_tries: 3 },
    { type: 'meaning_in_sentence', first_answers: 10, second_tries: 0 },
  ],
  ...over,
});
const proReply = (over: Partial<AiUsagePro> = {}): AiUsagePro => ({
  pro_learners: 12, no_limit: 0, truncated: false,
  buckets: [
    { key: '0', learners: 3 }, { key: '1-49', learners: 5 }, { key: '50-79', learners: 2 }, { key: '80-99', learners: 1 },
    { key: '100', learners: 1 },
  ],
  ...over,
});
const usageReply = (over: Partial<AiUsageDays> = {}): AiUsageDays => ({
  from: back(29), to: TODAY,
  today: { date: TODAY, used: 10, cap: 1000, alert_percent: 75, alert_reached: false, enabled: true },
  days: [{ date: TODAY, ai_practice: 8, ai_lookup: 2, total: 10, learners: 1 }],
  refunds: 1, days_at_cap: 0,
  ...over,
});
const routes = (u = urls(), replies: { ai?: AiDashboard; quality?: AiQuality; usage?: AiUsageDays; pro?: AiUsagePro } = {}) => ({
  [u.ai]: () => Response.json(replies.ai ?? aiReply()),
  [u.quality]: () => Response.json(replies.quality ?? qualityReply()),
  [u.usage]: () => Response.json(replies.usage ?? usageReply()),
  [PRO_URL]: () => Response.json(replies.pro ?? proReply()),
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

  it('charts: each section is a card; the meters carry today against the caps; AI and non-AI shares side by side', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    for (const title of [t.today.title, t.health.title, t.cost.title, t.quality.title, t.impact.title, t.usage.title]) {
      expect(screen.getByRole('heading', { level: 2, name: title }).closest('section')).toBeInTheDocument();
    }
    const units = screen.getByRole('meter', { name: t.today.units });
    expect(units).toHaveAttribute('aria-valuenow', '10');
    expect(units).toHaveAttribute('aria-valuemax', '1000');
    const compare = screen.getByRole('list', { name: t.quality.compare });
    // Correct: AI 135/180 answered, non-AI 90/100; hints: AI 50/200 asked.
    expect(within(compare).getByText(/^75\s?%$/)).toBeInTheDocument();
    expect(within(compare).getByText(/^90\s?%$/)).toBeInTheDocument();
    expect(within(compare).getByText(/^25\s?%$/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: t.impact.failures })).toHaveTextContent(t.failures.rejected);
  });

  it('quality: per AI question type, the share rewritten after the first try failed the rules, with its counts', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.quality.title });
    const list = screen.getByRole('list', { name: t.quality.retry.title });
    const cloze = within(list).getByText(new RegExp(`^${t.types.cloze} \\(3 / 24\\)$`)).closest('li') as HTMLElement;
    expect(within(cloze).getByText(/^12,5\s?%$/)).toBeInTheDocument();
    const meaning = within(list).getByText(new RegExp(`^${t.types.meaning_in_sentence} \\(0 / 10\\)$`)).closest('li') as HTMLElement;
    expect(within(meaning).getByText(/^0\s?%$/)).toBeInTheDocument();
    expect(within(list).queryByText(new RegExp(t.types.mcq_sentence))).not.toBeInTheDocument();
  });

  it('quality: no AI answer in the range → the empty text instead of the list', async () => {
    renderApp('/dashboard', routes(urls(), { quality: qualityReply({ ai_second_tries: [] }) }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.quality.title })).closest('section') as HTMLElement;
    expect(within(card).queryByRole('list', { name: t.quality.retry.title })).not.toBeInTheDocument();
    expect(within(card).getByRole('heading', { level: 3, name: t.quality.retry.title })).toBeInTheDocument();
    expect(within(card).getAllByText(t.empty).length).toBeGreaterThan(0);
  });

  it('usage: Pro learners by share of limit used, in the five buckets, with the number of Pro learners', async () => {
    renderApp('/dashboard', routes());
    const card = (await screen.findByRole('heading', { level: 2, name: t.usage.title })).closest('section') as HTMLElement;
    expect(within(card).getByRole('heading', { level: 3, name: t.usage.pro.title })).toBeInTheDocument();
    expect(within(tile(t.usage.pro.learners)).getByText('12')).toBeInTheDocument();
    const list = within(card).getByRole('list', { name: t.usage.pro.chart });
    const counts = [
      [t.usage.pro.bucketZero, '3'], [t.usage.pro.bucketLow, '5'], [t.usage.pro.bucketMid, '2'], [t.usage.pro.bucketHigh, '1'],
      [t.usage.pro.bucketFull, '1'],
    ];
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(counts.map(([label, n]) => `${label}${n}`));
    expect(within(card).queryByText(t.usage.pro.truncated)).not.toBeInTheDocument();
    expect(within(card).queryByText(/không có hạn mức AI/)).not.toBeInTheDocument();
  });

  it('usage: no Pro learner → the empty state, no list', async () => {
    renderApp('/dashboard', routes(urls(), { pro: proReply({ pro_learners: 0, buckets: proReply().buckets.map((b) => ({ ...b, learners: 0 })) }) }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.usage.title })).closest('section') as HTMLElement;
    expect(within(card).getByText(t.usage.pro.none)).toBeInTheDocument();
    expect(within(card).queryByRole('list', { name: t.usage.pro.chart })).not.toBeInTheDocument();
  });

  it('usage: Pro learners without an AI limit and a truncated read are each said in one line', async () => {
    renderApp('/dashboard', routes(urls(), { pro: proReply({ no_limit: 2, truncated: true }) }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.usage.title })).closest('section') as HTMLElement;
    expect(within(card).getByText('2 người dùng gói Pro không có hạn mức AI nên không nằm trong các nhóm trên.')).toBeInTheDocument();
    expect(within(card).getByText(t.usage.pro.truncated)).toBeInTheDocument();
  });

  it('a column takes keyboard focus and shows its day with every series in a tooltip', async () => {
    renderApp('/dashboard', routes());
    const chart = await screen.findByRole('group', { name: t.health.chart });
    const columns = chart.querySelectorAll('rect[tabindex="0"]');
    expect(columns).toHaveLength(1);
    (columns[columns.length - 1] as SVGRectElement).focus();
    const tip = await screen.findByRole('status');
    expect(tip).toHaveTextContent(t.health.ok);
    expect(tip).toHaveTextContent(t.health.failedCalls);
    expect(within(tip).getByText('9')).toBeInTheDocument();
    expect(within(tip).getByText('1')).toBeInTheDocument();
  });

  it('a 7-day range asks the APIs again for 7 days', async () => {
    const user = userEvent.setup();
    const r = renderApp('/dashboard', { ...routes(), ...routes(urls(back(6))) });
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    await user.click(screen.getByRole('button', { name: new RegExp(t.range) }));
    await user.click(await screen.findByRole('option', { name: '7 ngày gần nhất' }));
    await waitFor(() => expect(r.count('GET', urls(back(6)).ai.slice(4))).toBe(1));
    expect(r.count('GET', urls(back(6)).usage.slice(4))).toBe(1);
    // The Pro spread is of the current cycle, not of the range: it is not asked again.
    expect(r.count('GET', PRO_URL.slice(4))).toBe(1);
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

  it('a 403 from the Pro spread alone → the forbidden banner too', async () => {
    renderApp('/dashboard', { ...routes(), [PRO_URL]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});
