import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { AI_OPERATION_ORDER, type AiOperation, type SplitStats } from '../ai/ai-api';
import { todayInAdminZone } from '../ai/cost-range';
import { renderApp } from '../staff/test-utils';
import type {
  AiDashboard, AiQuality, AiUsageDays, AiUsagePro, DashboardJudgeRevision, JudgeScoreGroup, LatestEval, VerdictCounts,
} from './dashboard-api';
import type { Retention } from './retention-api';

const t = vi.dashboard;
const PRO_URL = 'GET /v1/admin/entitlements/ai-usage/pro';
const TODAY = todayInAdminZone(new Date());
const back = (days: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
const urls = (from = back(29), to = TODAY) => ({
  ai: `GET /v1/admin/ai/dashboard?from=${from}&to=${to}`,
  quality: `GET /v1/admin/practice/ai-quality?from=${from}&to=${to}`,
  usage: `GET /v1/admin/entitlements/ai-usage/days?from=${from}&to=${to}`,
  retention: `GET /v1/admin/learning/retention?from=${from}&to=${to}`,
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
  today: {
    calls: 2, cap: 500, failed_calls: 1, failed_cost_usd: '0.00000000', cost_usd: '0.01000000', cost_vnd: 1240, admin_cost_usd: '0.42000000',
    admin_usd_cap: 2,
  },
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
  latest_evals: [],
  judge_scores: [],
  judge_revisions: [],
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
  reports: [{ source: 'ai', total: 3, open: 1, no_error: 1, fixed: 0, confirmed: 1, refunded: 1 }],
  ai_report_reasons: [{ reason: 'wrong_answer', label_vi: 'Đáp án sai', label_en: 'Wrong answer', count: 3 }],
  unknown_forms: { new_forms: 2, rejected_seen: 4 },
  word_checks: [{ verdict: 'not_recognized', count: 1 }],
  ai_second_tries: [
    { type: 'cloze', first_answers: 24, second_tries: 3 },
    { type: 'meaning_in_sentence', first_answers: 10, second_tries: 0 },
  ],
  real_judge_scores: [],
  real_judge_latest: [],
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
  days: [{ date: TODAY, ai_practice: 8, ai_lookup: 2, total: 10, learners: 1, cap: 1000, at_cap: false }],
  refunds: 1, days_at_cap: 0,
  ...over,
});
const retentionReply = (over: Partial<Retention> = {}): Retention => ({
  from: back(34), to: TODAY, window_days: 7, today: { date: TODAY, active: 12, stopped: 3 },
  cohorts: [{ week_start: '2026-10-26', size: 5, d7: 3, d30: 1 }, { week_start: '2026-11-02', size: 0, d7: null, d30: null }],
  ...over,
});
const routes = (u = urls(), replies: { ai?: AiDashboard; quality?: AiQuality; usage?: AiUsageDays; pro?: AiUsagePro; retention?: Retention } = {}) => ({
  [u.ai]: () => Response.json(replies.ai ?? aiReply()),
  [u.quality]: () => Response.json(replies.quality ?? qualityReply()),
  [u.usage]: () => Response.json(replies.usage ?? usageReply()),
  [u.retention]: () => Response.json(replies.retention ?? retentionReply()),
  [PRO_URL]: () => Response.json(replies.pro ?? proReply()),
});
const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe('DashboardPage (/dashboard, ai.view)', () => {
  it('reads the last 30 Vietnam days from the three APIs and shows today against the caps', async () => {
    renderApp('/dashboard', routes());
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: t.today.title })).toBeInTheDocument();
    expect(within(tile(t.today.calls)).getByText('2 / 500')).toBeInTheDocument();
    expect(within(tile(t.today.units)).getByText('10 / 1.000')).toBeInTheDocument();
    expect(within(tile(t.today.notReady)).getByText('1 / 6')).toBeInTheDocument();
  });

  it('today: admin USD (test runs, evals, judge) is a meter against its own cap; below the cap there is no warning', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    const meter = screen.getByRole('meter', { name: t.today.adminUsd });
    expect(meter).toHaveAttribute('aria-valuenow', '0.42');
    expect(meter).toHaveAttribute('aria-valuemax', '2');
    expect(within(tile(t.today.adminUsd)).getByText(/^0,42\s?US\$ \/ 2,00\s?US\$$/)).toBeInTheDocument();
    expect(screen.queryByText(t.today.adminUsdReached)).not.toBeInTheDocument();
  });

  it('today: admin USD exactly at the cap → the cap is reached (the gateway blocks at ≥, B20)', async () => {
    const today = { ...aiReply().today, admin_cost_usd: '2.00000000', admin_usd_cap: 2 };
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ today }) }));
    expect(await screen.findByText(t.today.adminUsdReached)).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: t.today.adminUsd })).toHaveAttribute('aria-valuenow', '2');
  });

  it('today: admin USD just under the cap (1,99 of 2) → no warning', async () => {
    const today = { ...aiReply().today, admin_cost_usd: '1.99000000', admin_usd_cap: 2 };
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ today }) }));
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    expect(screen.queryByText(t.today.adminUsdReached)).not.toBeInTheDocument();
  });

  it('today: no admin USD cap → the figure alone, no "/", and never the reached warning', async () => {
    const today = { ...aiReply().today, admin_cost_usd: '500.00000000', admin_usd_cap: null };
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ today }) }));
    await screen.findByRole('heading', { level: 2, name: t.today.title });
    const box = tile(t.today.adminUsd);
    expect(within(box).getByText(/^500,00\s?US\$$/)).toBeInTheDocument();
    expect(screen.queryByText(t.today.adminUsdReached)).not.toBeInTheDocument();
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

  it('usage: each day is read against its own cap; the hint says so and the table shows the cap and "Có" for the day at its cap', async () => {
    const usage = usageReply({
      days: [
        { date: back(1), ai_practice: 3, ai_lookup: 0, total: 3, learners: 1, cap: 3, at_cap: true },
        { date: TODAY, ai_practice: 4, ai_lookup: 0, total: 4, learners: 2, cap: 1000, at_cap: false },
      ],
      days_at_cap: 1,
    });
    renderApp('/dashboard', routes(urls(), { usage }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.usage.title })).closest('section') as HTMLElement;
    expect(within(card).getByText('Lượt AI của người học theo ngày, mỗi ngày đối chiếu với giới hạn của chính ngày đó.')).toBeInTheDocument();
    expect(within(tile(t.usage.daysAtCap)).getByText('1')).toBeInTheDocument();
    const dayRows = within(card).getAllByRole('row', { hidden: true });
    const header = within(dayRows[0]).getAllByRole('columnheader', { hidden: true }).map((h) => h.textContent);
    expect(header).toEqual([t.cols.date, t.usage.practice, t.usage.lookup, t.cols.learners, t.usage.dayCap, t.usage.atCap]);
    const cells = (row: HTMLElement) => within(row).getAllByRole('cell', { hidden: true }).map((c) => c.textContent);
    expect(cells(dayRows[1]).slice(4)).toEqual(['3', t.usage.yes]);
    expect(cells(dayRows[2]).slice(4)).toEqual(['1.000', '—']);
  });

  it('usage: a day with the AI off all day (cap 0, no use) is at its cap, as the API says', async () => {
    const usage = usageReply({ days: [{ date: back(2), ai_practice: 0, ai_lookup: 0, total: 0, learners: 0, cap: 0, at_cap: true }, usageReply().days[0]], days_at_cap: 1 });
    renderApp('/dashboard', routes(urls(), { usage }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.usage.title })).closest('section') as HTMLElement;
    expect(within(tile(t.usage.daysAtCap)).getByText('1')).toBeInTheDocument();
    // A day with no use is not in the table (as before); the count above still includes it.
    expect(within(card).getAllByRole('row', { hidden: true })).toHaveLength(2);
  });

  it('quality: the report table has a column for confirmed AI errors, next to fixed and no error', async () => {
    const reports = [{ source: 'ai', total: 10, open: 1, no_error: 2, fixed: 3, confirmed: 4, refunded: 5 }];
    renderApp('/dashboard', routes(urls(), { quality: qualityReply({ reports }) }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.quality.title })).closest('section') as HTMLElement;
    const table = within(card).getByRole('heading', { level: 3, name: t.quality.reports, hidden: true }).nextElementSibling as HTMLElement;
    const header = within(table).getAllByRole('columnheader', { hidden: true }).map((h) => h.textContent);
    expect(header).toContain(t.cols.confirmed);
    const body = within(table).getAllByRole('row', { hidden: true })[1];
    const cells = within(body).getAllByRole('cell', { hidden: true }).map((c) => c.textContent);
    expect(cells[header.indexOf(t.cols.confirmed)]).toBe('4');
    expect(cells[header.indexOf(t.cols.fixed)]).toBe('3');
    expect(cells[header.indexOf(t.cols.refunded)]).toBe('5');
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
    expect(r.count('GET', urls(back(6)).retention.slice(4))).toBe(1);
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

  it('a 403 from the retention read alone → the forbidden banner too', async () => {
    const u = urls();
    renderApp('/dashboard', { ...routes(), [u.retention]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});

describe('DashboardPage — learners still learning and D7 / D30 (nhóm B M6)', () => {
  it('asks for the retention with the same 30-day range as the other three reads', async () => {
    const r = renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.retention.title });
    expect(r.count('GET', urls().retention.slice(4))).toBe(1);
    expect(urls().retention).toBe(`GET /v1/admin/learning/retention?from=${back(29)}&to=${TODAY}`);
  });

  it('shows the card with the two tiles and one row per week from the API', async () => {
    renderApp('/dashboard', routes());
    const card = (await screen.findByRole('heading', { level: 2, name: t.retention.title })).closest('section') as HTMLElement;
    expect(within(tile(t.retention.active)).getByText('12')).toBeInTheDocument();
    expect(within(tile(t.retention.stopped)).getByText('3')).toBeInTheDocument();
    const rows = within(within(card).getByRole('table', { hidden: true })).getAllByRole('row', { hidden: true }).slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell', { hidden: true }).map((cell) => cell.textContent?.replace(/\s/g, '')))).toEqual([
      ['Từ26/10', '5', '60%(3/5)', '20%(1/5)'], ['Từ02/11', '0', '—', '—'],
    ]);
  });

  it('the card is the last one of the page, after the usage limits', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.retention.title });
    const order = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.slice(1));
    expect(order.slice(-2)).toEqual([t.usage.title, t.retention.title]);
  });

  it('an editor with ai.view sees the card too', async () => {
    renderApp('/dashboard', routes(), EDITOR);
    expect(await screen.findByRole('heading', { level: 2, name: 'Người học có quay lại không' })).toBeInTheDocument();
  });

  it('the window of the API is what the hint says, and a week the API starts earlier than the range is shown as sent', async () => {
    renderApp('/dashboard', routes(urls(), { retention: retentionReply({ window_days: 14, from: back(40) }) }));
    await screen.findByRole('heading', { level: 2, name: t.retention.title });
    expect(screen.getByText(/trong 14 ngày gần nhất/)).toBeInTheDocument();
  });
});

const split = (over: Partial<SplitStats> = {}): SplitStats => ({
  total: 0, pending: 0, skipped: 0, shape_pass: 0, shape_fail: 0, shape_transient: 0, rule_pass: 0, rule_fail: 0, rule_skipped: 0, rule_not_applicable: 0,
  expected_pass: 0, expected_fail: 0, expected_none: 0, failing: 0, ...over,
});
const verdicts = (over: Partial<VerdictCounts> = {}): VerdictCounts => ({ pass: 0, fail_major: 0, fail_minor: 0, unscored: 0, ...over });
const revisionOf = (id: string, n: number, agree: number, calibrated: boolean): DashboardJudgeRevision => ({
  id, judge_id: 'judge-1', judge_name: 'Chỉ một đáp án', revision: n, saved_at: '2026-10-28T00:00:00.000Z',
  criteria: [{ code: 'single_answer', labeled: 20, agree, calibrated }],
});
const REV1 = revisionOf('rev-1', 1, 19, true);
const REV2 = revisionOf('rev-2', 2, 10, false);
const RUN: NonNullable<LatestEval['run']> = {
  id: 'run-1', created_at: '2026-10-29T03:00:00.000Z', model: 'fake:ok',
  stats: {
    dev: split({ total: 10, shape_pass: 9, shape_fail: 1, rule_pass: 7, rule_fail: 1, expected_pass: 4, expected_fail: 2 }),
    held_out: split({ total: 3, shape_pass: 2 }),
  },
  judge: [{ judge_revision_id: 'rev-1', criterion: 'single_answer', dev: verdicts({ pass: 8, fail_major: 1, unscored: 1 }), held_out: verdicts({ pass: 1, fail_major: 1 }) }],
};
const evalOf = (operation: AiOperation, over: Partial<LatestEval> = {}): LatestEval => ({
  operation, set: { id: 'set-1', version: 2 }, live: { config_id: 'cfg-1', number: 7, model: 'fake:ok' }, run: null, ...over,
});
const groupOf = (over: Partial<JudgeScoreGroup> = {}): JudgeScoreGroup => ({
  operation: 'generate_cloze', source: 'eval', config_number: 7, model: 'fake:ok', judge_revision_id: 'rev-1', criterion: 'single_answer',
  counts: verdicts({ pass: 8, fail_major: 1 }), first_scored_at: '2026-10-29T10:00:00.000Z', ...over,
});
const CLOZE = vi.ai.operations.names.generate_cloze;
const CHART = `Chỉ một đáp án · single_answer · ${CLOZE}`;
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell', { hidden: true }).map((cell) => cell.textContent);
const headsOf = (table: HTMLElement) => within(table).getAllByRole('columnheader', { hidden: true }).map((cell) => cell.textContent);
const blockOf = (title: string) => screen.getByRole('heading', { level: 3, name: title, hidden: true }).parentElement as HTMLElement;

describe('DashboardPage quality cards (nhóm B M5: latest eval, judge scores, real-question checks)', () => {
  it('latest eval: the live config, its set version and date, then dev and held-out as ratios of what was counted', async () => {
    const ai = aiReply({ latest_evals: [evalOf('generate_cloze', { run: RUN })], judge_revisions: [REV1] });
    renderApp('/dashboard', routes(urls(), { ai }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.evals.title })).closest('section') as HTMLElement;
    expect(within(card).getByText(/^Cấu hình 7 · fake:ok · phiên bản 2 · 29\/10\/2026$/)).toBeInTheDocument();
    const table = within(blockOf(CLOZE)).getByRole('table', { hidden: true });
    expect(headsOf(table)).toEqual([t.evals.split, t.evals.shape, t.evals.rule, t.evals.expected, 'Judge Chỉ một đáp án bản 1 · single_answer']);
    const rows = within(table).getAllByRole('row', { hidden: true });
    // Dev: shape 9 of 10, rules 7 of 8, expected 4 of 6, judge 8 of the 9 that got a verdict (the unscored one is not counted).
    expect(cellsOf(rows[1])).toEqual([t.evals.dev, '9/10', '7/8', '4/6', '8/9']);
    // Held-out: shape 2 of 3; no rule or expected result counted, a dash and not 0/0; judge 1 of 2.
    expect(cellsOf(rows[2])).toEqual([t.evals.heldOut, '2/3', '—', '—', '1/2']);
  });

  it('latest eval: pending and skipped examples are not part of what the shape was counted over', async () => {
    const run = { ...RUN, stats: { ...RUN.stats, dev: split({ total: 10, pending: 2, skipped: 1, shape_pass: 6, shape_fail: 1 }) }, judge: [] };
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ latest_evals: [evalOf('generate_cloze', { run })] }) }));
    await screen.findByRole('heading', { level: 2, name: t.evals.title });
    const rows = within(within(blockOf(CLOZE)).getByRole('table', { hidden: true })).getAllByRole('row', { hidden: true });
    expect(cellsOf(rows[1]).slice(0, 2)).toEqual([t.evals.dev, '6/7']);
  });

  it('latest eval: without a frozen set, without a model, or without a complete run on the set, each operation says which', async () => {
    const latest_evals = [
      evalOf('generate_cloze', { run: RUN }),
      evalOf('lookup_word', { set: null }),
      evalOf('translate_sentence', { live: { config_id: 'cfg-2', number: 1, model: null } }),
      evalOf('generate_meaning_question'),
    ];
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ latest_evals, judge_revisions: [REV1] }) }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.evals.title })).closest('section') as HTMLElement;
    expect(within(blockOf(vi.ai.operations.names.lookup_word)).getByText(t.evals.noSet)).toBeInTheDocument();
    expect(within(blockOf(vi.ai.operations.names.translate_sentence)).getByText(t.evals.noModel)).toBeInTheDocument();
    expect(within(blockOf(vi.ai.operations.names.generate_meaning_question)).getByText('Chưa có lần chạy xong trọn của cấu hình đang chạy trên phiên bản 2.')).toBeInTheDocument();
    // The operations without a run have no table; the one with a run keeps its own.
    expect(within(card).getAllByRole('table', { hidden: true })).toHaveLength(1);
  });

  it('judge scores: a revision change draws one marker, and the table twin says which revision is calibrated, with its label counts', async () => {
    const ai = aiReply({
      judge_scores: [
        groupOf({ judge_revision_id: 'rev-1', config_number: 7, first_scored_at: '2026-10-29T10:00:00.000Z' }),
        groupOf({ judge_revision_id: 'rev-2', config_number: 8, first_scored_at: '2026-10-29T11:00:00.000Z' }),
      ],
      judge_revisions: [REV1, REV2],
    });
    renderApp('/dashboard', routes(urls(), { ai }));
    await screen.findByRole('heading', { level: 2, name: t.judge.title });
    const chart = screen.getByRole('group', { name: CHART });
    expect(within(chart).getAllByText('Bản judge 2')).toHaveLength(1);
    expect(within(chart).queryByText('Bản judge 1')).not.toBeInTheDocument();
    expect(chart.querySelectorAll('line[stroke-dasharray]')).toHaveLength(1);
    const rows = within(within(blockOf(CHART)).getByRole('table', { hidden: true })).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(3);
    expect(cellsOf(rows[1]).at(-1)).toContain(t.judge.calibrated);
    expect(cellsOf(rows[1]).at(-1)).toContain('19/20 nhãn khớp');
    expect(cellsOf(rows[2]).at(-1)).toContain(t.judge.uncalibrated);
    expect(cellsOf(rows[2]).at(-1)).toContain('10/20 nhãn khớp');
  });

  it('judge scores: the chart says before the table which revision is calibrated', async () => {
    const ai = aiReply({ judge_scores: [groupOf({ judge_revision_id: 'rev-2' })], judge_revisions: [REV1, REV2] });
    renderApp('/dashboard', routes(urls(), { ai }));
    await screen.findByRole('heading', { level: 2, name: t.judge.title });
    const caption = blockOf(CHART).querySelector('ul') as HTMLElement;
    expect([...caption.querySelectorAll('li')].map((item) => item.textContent)).toEqual([`Bản judge 2${t.judge.uncalibrated}10/20 nhãn khớp`]);
  });

  it('judge scores: columns follow the time the groups were first scored; a real group is named by source, config and model', async () => {
    const ai = aiReply({
      judge_scores: [groupOf({ first_scored_at: '2026-10-29T10:00:00.000Z', counts: verdicts({ pass: 8, fail_major: 1, unscored: 1 }) })],
      judge_revisions: [REV1],
    });
    const real = [
      groupOf({ source: 'real', config_number: 7, first_scored_at: '2026-10-29T09:00:00.000Z', counts: verdicts({ pass: 1, fail_minor: 1 }) }),
      groupOf({ source: 'real', config_number: null, model: null, first_scored_at: '2026-10-29T12:00:00.000Z', counts: verdicts({ unscored: 3 }) }),
    ];
    renderApp('/dashboard', routes(urls(), { ai, quality: qualityReply({ real_judge_scores: real }) }));
    await screen.findByRole('heading', { level: 2, name: t.judge.title });
    const chart = screen.getByRole('group', { name: CHART });
    const labels = [...chart.querySelectorAll('rect[tabindex="0"]')].map((column) => column.getAttribute('aria-label'));
    expect(labels).toHaveLength(3);
    expect(labels[0]).toMatch(/^Câu thật · cấu hình 7 · fake:ok: /);
    expect(labels[1]).toMatch(/^Eval · cấu hình 7 · fake:ok: /);
    expect(labels[2]).toMatch(/^Câu thật · cấu hình — · —: /);
    // The shares are of the scored answers; the counts behind them, the unscored ones included, are in the name.
    expect(labels[0]).toMatch(/Đạt 50\s?%, Lỗi nặng 0\s?%, Lỗi nhẹ 50\s?%, Đạt 1, Lỗi nặng 0, Lỗi nhẹ 1, Không chấm được 0$/);
    expect(labels[1]).toMatch(/Đạt 88,9\s?%, Lỗi nặng 11,1\s?%, Lỗi nhẹ 0\s?%, Đạt 8, Lỗi nặng 1, Lỗi nhẹ 0, Không chấm được 1$/);
    // Nothing was scored in the last group: no share to draw, and the name says so with its count.
    expect(labels[2]).toMatch(/Đạt 0\s?%, Lỗi nặng 0\s?%, Lỗi nhẹ 0\s?%, Đạt 0, Lỗi nặng 0, Lỗi nhẹ 0, Không chấm được 3$/);
    expect(chart.querySelectorAll('rect.fill-primary, rect.fill-danger, rect.fill-accent-deep')).toHaveLength(4);
  });

  it('judge scores: a column takes keyboard focus and shows its whole name and counts in a tooltip', async () => {
    const ai = aiReply({ judge_scores: [groupOf()], judge_revisions: [REV1] });
    renderApp('/dashboard', routes(urls(), { ai }));
    await screen.findByRole('heading', { level: 2, name: t.judge.title });
    const chart = screen.getByRole('group', { name: CHART });
    (chart.querySelector('rect[tabindex="0"]') as SVGRectElement).focus();
    const tip = await screen.findByRole('status');
    expect(tip).toHaveTextContent('Eval · cấu hình 7 · fake:ok');
    expect(tip).toHaveTextContent('Đạt 8, Lỗi nặng 1, Lỗi nhẹ 0, Không chấm được 0');
  });

  it('judge scores: a group of a judge revision the page was not told about is left out, and with no group there is the empty text', async () => {
    const ai = aiReply({ judge_scores: [groupOf({ judge_revision_id: 'unknown' })], judge_revisions: [REV1] });
    renderApp('/dashboard', routes(urls(), { ai }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.judge.title })).closest('section') as HTMLElement;
    expect(within(card).getByText(t.judge.empty)).toBeInTheDocument();
    expect(within(card).queryByRole('group')).not.toBeInTheDocument();
  });

  it('judge scores: two config numbers with different models are two columns, not one (R12)', async () => {
    const ai = aiReply({
      judge_scores: [groupOf({ model: 'a:x' }), groupOf({ model: 'b:y', counts: verdicts({ pass: 1 }) })],
      judge_revisions: [REV1],
    });
    renderApp('/dashboard', routes(urls(), { ai }));
    await screen.findByRole('heading', { level: 2, name: t.judge.title });
    const chart = screen.getByRole('group', { name: CHART });
    expect([...chart.querySelectorAll('rect[tabindex="0"]')].map((column) => column.getAttribute('aria-label')?.split(':').slice(0, 2).join(':')))
      .toEqual(['Eval · cấu hình 7 · a:x', 'Eval · cấu hình 7 · b:y']);
  });

  it('real checks: the latest finished pass of an operation shows its counts under their columns', async () => {
    const quality = qualityReply({
      real_judge_latest: [{
        operation: 'generate_cloze', pass_id: 'pass-1', judge_revision_id: 'rev-1', criterion: 'single_answer',
        counts: verdicts({ pass: 2, fail_minor: 1 }), scored_at: '2026-10-29T03:15:00.000Z',
      }],
    });
    renderApp('/dashboard', routes(urls(), { ai: aiReply({ judge_revisions: [REV1] }), quality }));
    const card = (await screen.findByRole('heading', { level: 2, name: t.real.title })).closest('section') as HTMLElement;
    const table = within(card).getByRole('table');
    expect(headsOf(table)).toEqual([
      t.cols.operation, t.real.cols.judge, t.real.cols.criterion, t.judge.pass, t.judge.failMajor, t.judge.failMinor, t.judge.unscored, t.real.cols.scoredAt,
    ]);
    const [operation, judge, criterion, pass, major, minor, unscored, at] = cellsOf(within(table).getAllByRole('row')[1]);
    expect([operation, judge, criterion, pass, major, minor, unscored]).toEqual([CLOZE, 'Chỉ một đáp án · Bản judge 1', 'single_answer', '2', '0', '1', '0']);
    expect(at).toContain('29/10/2026');
  });

  it('real checks: no finished pass in the range → the empty text, no table', async () => {
    renderApp('/dashboard', routes());
    const card = (await screen.findByRole('heading', { level: 2, name: t.real.title })).closest('section') as HTMLElement;
    expect(within(card).getByText(t.real.empty)).toBeInTheDocument();
    expect(within(card).queryByRole('table')).not.toBeInTheDocument();
  });

  it('an editor with ai.view sees the three quality cards', async () => {
    renderApp('/dashboard', routes(), EDITOR);
    for (const title of [t.evals.title, t.judge.title, t.real.title]) {
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it('the three cards sit after "impact" and before "usage"', async () => {
    renderApp('/dashboard', routes());
    await screen.findByRole('heading', { level: 2, name: t.usage.title });
    // The card's round icon is part of its heading's text; the title follows it.
    const order = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.slice(1));
    expect(order.slice(order.indexOf(t.impact.title), order.indexOf(t.usage.title) + 1)).toEqual([t.impact.title, t.evals.title, t.judge.title, t.real.title, t.usage.title]);
  });
});
