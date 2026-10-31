import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { EvalRunDetail } from './ai-api';
import { JURL, judgeOnFake, judgeRevision, judgeView, label, pass, score, statsRow, tally } from './judges/judge-test-support';
import { RUN_ID, URL, evalRoutes, evalRun, runItem, runStats } from './prompt-test-support';

const t = vi.ai.eval;
const PATH = '/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001';
const panel = async () => {
  const heading = await screen.findByRole('heading', { level: 2, name: /^Lần chạy / }, { timeout: 3000 });
  return heading.closest('[data-testid="detail-panel"]') as HTMLElement ?? document.body;
};
const field = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

afterEach(() => vitest.useRealTimers());

describe('EvalRunPanel (A/83)', () => {
  it('a finished run: status, progress, valid, average time, cost in US$ and ₫ at today’s rate, model, prompt revision, who started it', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun()) }));
    await panel();
    expect(await screen.findByText(/261\s*₫/)).toBeInTheDocument();
    expect(screen.getAllByText(t.status.finished).length).toBeGreaterThan(0);
    expect(field(t.detail.progress)).toHaveTextContent('20/20');
    expect(field(t.detail.valid)).toHaveTextContent('18/20');
    expect(field(t.detail.avgLatency)).toHaveTextContent('812 ms');
    expect(field(t.detail.cost)).toHaveTextContent(/0,01\s*US\$\s*·\s*261\s*₫ theo tỷ giá hôm nay/);
    expect(field(t.detail.model)).toHaveTextContent('OpenAI · gpt-test');
    expect(field(t.detail.prompt)).toHaveTextContent(t.detail.revision.replace('{revision}', '3'));
    expect(field(t.detail.startedBy)).toHaveTextContent('lan@wordmet.com');
  });

  it('a run of a config reads "Cấu hình 4" (it has no prompt revision); a run of a draft that was deleted since says so', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ prompt_revision: null, config_id: 'C4', config_version: 1, config_number: 4 })),
    }));
    await panel();
    expect(await screen.findByText(t.detail.config.replace('{number}', '4'), { selector: 'dd' })).toBeInTheDocument();
    cleanup();
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ prompt_revision: null, config_id: 'C9', config_version: 1, config_number: null })),
    }));
    await panel();
    expect(await screen.findByText(t.detail.configGone, { selector: 'dd' })).toBeInTheDocument();
  });

  it('a run that ended with "config-changed" says the draft was saved again after it was made', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ status: 'failed', error: 'config-changed', prompt_revision: null, config_id: 'C4', config_version: 1, config_number: 4 })),
    }));
    await panel();
    expect(await screen.findByText(t.detail.configChanged)).toBeInTheDocument();
    expect(screen.queryByText(t.detail.failed.replace('{error}', 'config-changed'))).not.toBeInTheDocument();
  });

  it('a draft run reads "Bản nháp"; without the settings only US$ is shown; calls without a price are counted', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ prompt_revision: null, cost_unknown_count: 2 })),
      [URL.settings]: () => problem(500, ''),
    }));
    await panel();
    await waitFor(() => expect(field(t.detail.prompt)).toHaveTextContent(t.detail.draft));
    expect(field(t.detail.cost)).toHaveTextContent(/0,01\s*US\$/);
    expect(field(t.detail.cost)).not.toHaveTextContent('₫');
    expect(field(t.detail.cost)).toHaveTextContent(t.detail.unknownCost.replace('{count}', '2'));
  });

  it('§6.5: a running run is read again every 2 s and stops once it is finished', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const replies: Partial<EvalRunDetail>[] = [{ status: 'running', done: 4 }, { status: 'running', done: 12 }, { status: 'finished' }];
    let n = 0;
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(replies[Math.min(n++, replies.length - 1)])) }));
    await panel();
    expect(await screen.findByText(t.detail.running.replace('{done}', '4').replace('{total}', '20'))).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    expect(await screen.findByText(t.detail.running.replace('{done}', '12').replace('{total}', '20'))).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(field(t.detail.progress)).toHaveTextContent('20/20'));
    expect(r.count('GET', '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001')).toBe(3);
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001')).toBe(3);
  });

  it('§6.5: queued for 31 s → "Chưa có worker nhận lần chạy này."', async () => {
    const created = new Date(Date.now() - 31_000).toISOString();
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: created, started_at: null, finished_at: null })) }));
    expect(await screen.findByText(t.detail.queuedLong)).toBeInTheDocument();
  });

  it('§6.5: a failed run shows "Lỗi" and its error, and is not run again', async () => {
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'failed', done: 3, error: 'worker stopped' })) }));
    const scope = within(await panel());
    expect(await scope.findByText(t.detail.failed.replace('{error}', 'worker stopped'))).toBeInTheDocument();
    expect(scope.getAllByText(t.status.failed).length).toBeGreaterThan(0);
    expect(r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/runs')).toHaveLength(0);
  });

  it('an unknown run (404) says it is not found and is not read again', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => problem(404, 'not-found') }));
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001')).toBe(1);
  });

  it('an id that is no UUID cannot exist: it says not found, and the API is neither asked nor polled', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const r = renderApp('/ai/eval/runs/abc', evalRoutes());
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/eval/runs/'))).toHaveLength(0);
  });

  it('a run stopped by an admin (failed, error "cancelled") reads "Đã dừng" and its own sentence, not "Lỗi: cancelled"; a real failure keeps "Lỗi"', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'failed', done: 3, error: 'cancelled' })) }));
    const scope = within(await panel());
    expect(await scope.findByText(t.detail.cancelled)).toBeInTheDocument();
    expect(scope.getAllByText(t.status.cancelled).length).toBeGreaterThan(0);
    expect(scope.queryByText(t.status.failed)).not.toBeInTheDocument();
    expect(scope.queryByText(t.detail.failed.replace('{error}', 'cancelled'))).not.toBeInTheDocument();
  });

  it('the results come from the run itself: the input of each example is its snapshot, whatever the example list says', async () => {
    renderApp(PATH, evalRoutes({
      [URL.examples()]: () => problem(500, 'internal-error'),
      [URL.run()]: () => Response.json(evalRun()),
      [URL.runItems()]: () => Response.json({
        items: [runItem({ example_id: 'e1', input: { word: 'go', part_of_speech: 'verb' } })],
        stats: runStats({ total: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1 }),
        passes: [], judge_stats: [],
      }),
    }));
    const scope = within(await panel());
    const results = await scope.findByRole('region', { name: t.detail.results });
    await waitFor(() => expect(within(results).getAllByRole('row')[1]).toHaveTextContent('go · verb'));
    expect(results).not.toHaveTextContent(t.detail.deletedExample);
  });

  it('an item migrated from an old run whose example is gone has no input: it reads "Ví dụ đã xóa"', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun()),
      [URL.runItems()]: () => Response.json({ items: [runItem({ input: null, rule: null, expected_result: null })], stats: runStats({ total: 1, shape_pass: 1, expected_none: 1 }), passes: [], judge_stats: [] }),
    }));
    const results = await within(await panel()).findByRole('region', { name: t.detail.results });
    expect(within(results).getAllByRole('row')[1]).toHaveTextContent(t.detail.deletedExample);
  });

  it('per-example results: status, reason, output, rule and expected result; the raw output behind [Xem đầu ra gốc]', async () => {
    const items = [
      runItem({ example_id: 'e1', position: 0, output: { sentence: 'I ___ home.' }, raw_output: '{"sentence":"I ___ home."}', latency_ms: 700, cost_usd: '0.00100000' }),
      runItem({
        example_id: 'e2', position: 1, input: { word: 'come', part_of_speech: 'verb' }, status: 'permanent_failure', reason: 'invalid-shape', output: null,
        raw_output: 'not json at all', rule: null, expected_result: null, latency_ms: 300, cost_usd: null,
      }),
    ];
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 2 })),
      [URL.runItems()]: () => Response.json({ items, stats: runStats({ total: 2, shape_pass: 1, shape_fail: 1, rule_pass: 1, expected_pass: 1, expected_none: 0 }), passes: [], judge_stats: [] }),
    }));
    const scope = within(await panel());
    const results = await scope.findByRole('region', { name: t.detail.results });
    await waitFor(() => expect(within(results).getAllByRole('row')[1]).toHaveTextContent('go · verb'));
    const [, first, second] = within(results).getAllByRole('row');
    expect(within(results).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      t.detail.cols.example, t.detail.cols.status, t.detail.cols.reason, t.detail.cols.output, t.detail.cols.rule, t.detail.cols.expected, t.detail.cols.latency, t.detail.cols.cost,
    ]);
    expect(first).toHaveTextContent(vi.ai.prompts.test.statuses.succeeded);
    expect(first).toHaveTextContent('{"sentence":"I ___ home."}');
    expect(second).toHaveTextContent('come · verb');
    expect(second).toHaveTextContent(vi.ai.prompts.test.statuses.permanent_failure);
    expect(second).toHaveTextContent('invalid-shape');
    const details = within(second).getByText(t.detail.rawOutput).closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await userEvent.click(within(second).getByText(t.detail.rawOutput));
    expect(details.open).toBe(true);
    expect(within(details).getByText('not json at all')).toBeInTheDocument();
  });

  const SET_RUN = { set_id: 'S1', set_version: 3 };
  const STATS_RUN = {
    items: [
      runItem({ example_id: 'd1', position: 0, rule: { status: 'fail', problems: ['unknown-form:deployment'], reason: null }, expected_result: 'pass' }),
      runItem({ example_id: 'd2', position: 1, input: { word: 'lit', part_of_speech: 'adjective' }, rule: { status: 'skipped', problems: [], reason: 'not-in-catalog' }, expected_result: 'pass' }),
      runItem({ example_id: 'd3', position: 2, input: { word: 'run', part_of_speech: 'verb' }, status: 'transient_failure', reason: 'timeout', output: null, rule: null, expected_result: null }),
    ],
    stats: runStats(
      {
        total: 3, shape_pass: 2, shape_fail: 1, shape_transient: 1, rule_pass: 0, rule_fail: 1, rule_skipped: 1, rule_not_applicable: 0,
        expected_pass: 2, expected_fail: 0, expected_none: 0, failing: 2,
      },
      { total: 2, shape_pass: 2, rule_pass: 1, rule_skipped: 1, expected_pass: 1, expected_fail: 1 },
    ),
    passes: [],
    judge_stats: [],
  };

  it('rule and expected result per example, and the totals of dev and of held-out', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ ...SET_RUN, total: 5, done: 5 })),
      [URL.runItems()]: () => Response.json(STATS_RUN),
    }));
    const scope = within(await panel());
    const results = await scope.findByRole('region', { name: t.detail.results });
    await waitFor(() => expect(within(results).getAllByRole('row')).toHaveLength(4));
    const [, first, second, third] = within(results).getAllByRole('row');
    expect(first).toHaveTextContent('Không đạt: unknown-form:deployment');
    expect(first).toHaveTextContent(t.detail.expectedResult.pass);
    expect(second).toHaveTextContent('Bỏ qua: không có trong kho');
    expect(third).toHaveTextContent(t.detail.none);
    expect(within(results).getByText('Dev: khuôn 2/3 · luật 0/1 (1 bỏ qua) · mong đợi 2/2')).toBeInTheDocument();
    expect(within(results).getByText('Held-out (chỉ số tổng): khuôn 2/2 · luật 1/1 (1 bỏ qua) · mong đợi 1/2')).toBeInTheDocument();
    expect(within(results).getByText('1 ví dụ lỗi tạm thời, tính là không đạt khuôn.')).toBeInTheDocument();
    expect(within(results).getByText(t.detail.stats.heldOutHidden)).toBeInTheDocument();
  });

  it.each([
    [{ status: 'pass', problems: [], reason: null }, 'Đạt'],
    [{ status: 'skipped', problems: [], reason: 'no-rules' }, 'Bỏ qua: chưa có luật'],
    [{ status: 'not_applicable', problems: [], reason: null }, 'Không áp dụng'],
    [{ status: 'fail', problems: ['a', 'b'], reason: null }, 'Không đạt: a, b'],
  ] as const)('the rule cell of %j reads "%s"', async (rule, text) => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun()),
      [URL.runItems()]: () => Response.json({ items: [runItem({ rule: { ...rule, problems: [...rule.problems] }, expected_result: 'fail' })], stats: runStats({ total: 1, shape_pass: 1 }), passes: [], judge_stats: [] }),
    }));
    const results = await within(await panel()).findByRole('region', { name: t.detail.results });
    await waitFor(() => expect(within(results).getAllByRole('row')).toHaveLength(2));
    const row = within(results).getAllByRole('row')[1];
    expect(row).toHaveTextContent(text);
    expect(row).toHaveTextContent(t.detail.expectedResult.fail);
  });

  it('a run with no held-out example shows no held-out line and no transient-failure line', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun()),
      [URL.runItems()]: () => Response.json({ items: [runItem()], stats: runStats({ total: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1 }), passes: [], judge_stats: [] }),
    }));
    const results = await within(await panel()).findByRole('region', { name: t.detail.results });
    expect(await within(results).findByText('Dev: khuôn 1/1 · luật 1/1 (0 bỏ qua) · mong đợi 1/1')).toBeInTheDocument();
    expect(within(results).queryByText(/Held-out/)).not.toBeInTheDocument();
    expect(within(results).queryByText(/lỗi tạm thời/)).not.toBeInTheDocument();
  });

  it('the line "Bộ" names the version the run took its examples from, "Bộ đang soạn" or "Trước khi có phiên bản"', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ ...SET_RUN })) }));
    await panel();
    expect(await screen.findByText(t.set.version.replace('{version}', '3'), { selector: 'dd' })).toBeInTheDocument();
  });

  it.each([
    [{ set_id: null, set_version: null, legacy: false }, 'working'],
    [{ set_id: null, set_version: null, legacy: true }, 'legacy'],
  ] as const)('the line "Bộ" of %j', async (over, key) => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ ...over })) }));
    await panel();
    const text = key === 'working' ? t.set.workingShort : t.set.legacy;
    expect(await screen.findByText(text, { selector: 'dd' })).toBeInTheDocument();
  });

  it('the results are read again when the run moves on (done changes) and once more when it ends', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const replies: Partial<EvalRunDetail>[] = [{ status: 'running', done: 4 }, { status: 'running', done: 12 }, { status: 'finished', done: 20 }];
    let n = 0;
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(replies[Math.min(n++, replies.length - 1)])) }));
    const ITEMS = '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001/items';
    await panel();
    await waitFor(() => expect(r.count('GET', ITEMS)).toBe(1));
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(r.count('GET', ITEMS)).toBe(2));
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(r.count('GET', ITEMS)).toBe(3));
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', ITEMS)).toBe(3);
  });

  it('results that cannot be read say so with [Thử lại]; the rest of the panel stays', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun()), [URL.runItems()]: () => problem(500, 'internal-error') }));
    const scope = within(await panel());
    expect(await scope.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    expect(field(t.detail.progress)).toHaveTextContent('20/20');
  });
});

describe('EvalRunPanel stop and delete', () => {
  const RUN_PATH = '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001';
  const LIST_PATH = '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20';
  const stoppedRun = () => evalRun({ status: 'failed', done: 4, error: 'cancelled' });

  async function ask(scope: ReturnType<typeof within>, button: string, title: string) {
    await userEvent.click(await scope.findByRole('button', { name: button }));
    return screen.findByRole('dialog', { name: title });
  }

  it.each(['queued', 'running'] as const)('a %s run offers [Dừng lần chạy] and not [Xóa lần chạy]', async (status) => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status, done: 0 })) }));
    const scope = within(await panel());
    expect(await scope.findByRole('button', { name: t.stop.button })).toBeInTheDocument();
    expect(scope.queryByRole('button', { name: t.removeRun.button })).not.toBeInTheDocument();
  });

  it.each(['finished', 'failed'] as const)('a %s run offers [Xóa lần chạy] and not [Dừng lần chạy]', async (status) => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status, error: status === 'failed' ? 'worker stopped' : null })) }));
    const scope = within(await panel());
    expect(await scope.findByRole('button', { name: t.removeRun.button })).toBeInTheDocument();
    expect(scope.queryByRole('button', { name: t.stop.button })).not.toBeInTheDocument();
  });

  it('[Dừng lần chạy] asks first and says the calls already made are still charged; [Để chạy tiếp] sends nothing', async () => {
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 4 })) }));
    const dialog = await ask(within(await panel()), t.stop.button, t.stop.title);
    expect(dialog).toHaveTextContent(t.stop.body);
    expect(r.count('POST', `${RUN_PATH}/cancel`)).toBe(0);
    await userEvent.click(within(dialog).getByRole('button', { name: t.stop.keep }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(r.count('POST', `${RUN_PATH}/cancel`)).toBe(0);
  });

  it('confirming POSTs /cancel; the panel shows the run as stopped at once, toasts, offers [Xóa lần chạy], stops polling and the list is read again', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 4 })),
      [URL.cancelRun()]: () => Response.json(stoppedRun()),
    }));
    const scope = within(await panel());
    const dialog = await ask(scope, t.stop.button, t.stop.title);
    await userEvent.click(within(dialog).getByRole('button', { name: t.stop.confirm }));
    expect(await screen.findByText(t.toast.stopped)).toBeInTheDocument();
    expect(r.count('POST', `${RUN_PATH}/cancel`)).toBe(1);
    expect(await scope.findByText(t.detail.cancelled)).toBeInTheDocument();
    expect(scope.getAllByText(t.status.cancelled).length).toBeGreaterThan(0);
    expect(scope.queryByRole('button', { name: t.stop.button })).not.toBeInTheDocument();
    expect(scope.getByRole('button', { name: t.removeRun.button })).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', LIST_PATH)).toBeGreaterThanOrEqual(2));
    const reads = r.count('GET', RUN_PATH);
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', RUN_PATH)).toBe(reads);
  });

  it('stop → 409 run-not-active (it ended a moment earlier): the sentence, the run and the list are read again, [Xóa lần chạy] replaces [Dừng lần chạy]', async () => {
    let reads = 0;
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(reads++ === 0 ? evalRun({ status: 'running', done: 19 }) : evalRun()),
      [URL.cancelRun()]: () => problem(409, 'run-not-active'),
    }));
    const scope = within(await panel());
    const dialog = await ask(scope, t.stop.button, t.stop.title);
    await userEvent.click(within(dialog).getByRole('button', { name: t.stop.confirm }));
    expect(await screen.findByText(vi.errors['run-not-active'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', RUN_PATH)).toBeGreaterThanOrEqual(2));
    expect(await scope.findByRole('button', { name: t.removeRun.button })).toBeInTheDocument();
    expect(scope.queryByRole('button', { name: t.stop.button })).not.toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', LIST_PATH)).toBeGreaterThanOrEqual(2));
    expect(screen.queryByText(t.toast.stopped)).not.toBeInTheDocument();
  });

  it('stop → network error: the offline sentence, the dialog is closed and [Dừng lần chạy] can be pressed again', async () => {
    let n = 0;
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 4 })),
      [URL.cancelRun()]: () => {
        if (n++ === 0) throw new TypeError('Failed to fetch');
        return Response.json(stoppedRun());
      },
    }));
    const scope = within(await panel());
    await userEvent.click(within(await ask(scope, t.stop.button, t.stop.title)).getByRole('button', { name: t.stop.confirm }));
    expect(await screen.findByText(vi.offline.message)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(within(await ask(scope, t.stop.button, t.stop.title)).getByRole('button', { name: t.stop.confirm }));
    expect(await screen.findByText(t.toast.stopped)).toBeInTheDocument();
    expect(r.count('POST', `${RUN_PATH}/cancel`)).toBe(2);
    expect(screen.queryByText(vi.offline.message)).not.toBeInTheDocument();
  });

  it('[Xóa lần chạy] asks first; [Hủy] sends nothing', async () => {
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun()) }));
    const dialog = await ask(within(await panel()), t.removeRun.button, t.removeRun.title);
    expect(dialog).toHaveTextContent(t.removeRun.body);
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(r.count('DELETE', RUN_PATH)).toBe(0);
  });

  it('confirming DELETEs, toasts, closes the panel (back to /ai/eval with the query string) and reads the list again', async () => {
    let deleted = false;
    const r = renderApp(`${PATH}?op=generate_cloze`, evalRoutes({
      [URL.run()]: () => Response.json(evalRun()),
      [URL.runs()]: () => Response.json({ items: deleted ? [] : [evalRun()], next_page_token: null }),
      [URL.deleteRun()]: () => {
        deleted = true;
        return new Response(null, { status: 204 });
      },
    }));
    const dialog = await ask(within(await panel()), t.removeRun.button, t.removeRun.title);
    await userEvent.click(within(dialog).getByRole('button', { name: t.removeRun.confirm }));
    expect(await screen.findByText(t.toast.runDeleted)).toBeInTheDocument();
    expect(r.count('DELETE', RUN_PATH)).toBe(1);
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval'));
    expect(r.router.state.location.search).toBe('?op=generate_cloze');
    await waitFor(() => expect(r.count('GET', LIST_PATH)).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.queryByTestId('detail-panel')).not.toBeInTheDocument());
    expect(await screen.findByText(vi.ai.eval.runs.empty)).toBeInTheDocument();
  });

  it('delete → 409 run-active: the sentence, the panel stays and shows the run as it is now, with [Dừng lần chạy]', async () => {
    let reads = 0;
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(reads++ === 0 ? evalRun() : evalRun({ status: 'running', done: 2 })),
      [URL.deleteRun()]: () => problem(409, 'run-active'),
    }));
    const scope = within(await panel());
    const dialog = await ask(scope, t.removeRun.button, t.removeRun.title);
    await userEvent.click(within(dialog).getByRole('button', { name: t.removeRun.confirm }));
    expect(await screen.findByText(vi.errors['run-active'])).toBeInTheDocument();
    expect(await scope.findByRole('button', { name: t.stop.button })).toBeInTheDocument();
    expect(scope.queryByRole('button', { name: t.removeRun.button })).not.toBeInTheDocument();
    expect(r.router.state.location.pathname).toBe('/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001');
    expect(screen.queryByText(t.toast.runDeleted)).not.toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', LIST_PATH)).toBeGreaterThanOrEqual(2));
  });

  it('delete → 404 (someone else deleted it): the "not found" sentence and the list is read again', async () => {
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun()),
      [URL.deleteRun()]: () => problem(404, 'not-found'),
    }));
    const dialog = await ask(within(await panel()), t.removeRun.button, t.removeRun.title);
    await userEvent.click(within(dialog).getByRole('button', { name: t.removeRun.confirm }));
    expect(await screen.findByText(vi.errors['not-found'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', LIST_PATH)).toBeGreaterThanOrEqual(2));
  });
});

describe('EvalRunPanel judge (nhóm B M3-T16)', () => {
  const RUN_PATH = '/v1/admin/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001';
  const on = { set_id: 'S1', set_version: 3 };
  const twoItems = () => [
    runItem({ item_id: 'i1', example_id: 'd1', position: 0, scores: [score({ verdict: 'fail_major', reason: 'beat fits too' })] }),
    runItem({
      item_id: 'i2', example_id: 'd2', position: 1, input: { word: 'come', part_of_speech: 'verb' }, scores: [score({ verdict: 'pass', reason: 'Only come fits.' })],
      labels: [label({ subject_id: 'i2', verdict: 'fail_minor' })],
    }),
  ];
  const itemsWith = (over: Record<string, unknown> = {}) => () => Response.json({
    items: twoItems(), stats: runStats({ total: 2, shape_pass: 2 }), passes: [], judge_stats: [], ...over,
  });
  const judgeRoute = (judge = judgeOnFake()) => ({ [URL.judges]: () => Response.json({ items: [judge] }) });
  const judgePanel = async () => within(await screen.findByRole('region', { name: t.detail.judge.title }));
  const tableOf = async () => within(await within(await panel()).findByRole('table'));

  it('a dev item shows what the judge said, level and reason, per criterion', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute() }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3));
    const [, first, second] = table.getAllByRole('row');
    expect(first).toHaveTextContent('single_answer: Không đạt nặng');
    expect(first).toHaveTextContent('beat fits too');
    expect(second).toHaveTextContent('single_answer: Đạt');
    expect(table.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(expect.arrayContaining(['Judge', 'Nhãn']));
  });

  it('an output the judge could not score reads "Không chấm được" with the problem under it, and no verdict', async () => {
    const items = [runItem({ item_id: 'i1', scores: [score({ verdict: null, problem: 'duplicate', reason: null })] })];
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith({ items }), ...judgeRoute() }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2));
    expect(table.getAllByRole('row')[1]).toHaveTextContent('single_answer: Không chấm được');
    expect(table.getAllByRole('row')[1]).toHaveTextContent('duplicate');
  });

  it('choosing "Đạt" in "Nhãn" PUTs the label of that output and criterion; a label already there shows as chosen', async () => {
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(),
      [JURL.label]: (call: { body: unknown }) => Response.json(label({ subject_id: 'i1', verdict: (call.body as { verdict: 'pass' }).verdict })),
    }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3));
    const rows = table.getAllByRole('row');
    expect(within(rows[2]!).getByRole('button', { name: /Không đạt nhẹ.*Nhãn/ })).toBeInTheDocument();
    await userEvent.click(within(rows[1]!).getByRole('button', { name: /Chưa gắn.*Nhãn/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đạt' }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'PUT' && c.path === '/v1/admin/ai/labels')).toHaveLength(1));
    expect(r.calls.find((c) => c.method === 'PUT')!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass' });
    expect(await within(rows[1]!).findByRole('button', { name: /Đạt.*Nhãn/ })).toBeInTheDocument();
  });

  it('"Chưa gắn" takes a label back: verdict null', async () => {
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(),
      [JURL.label]: () => Response.json(label({ subject_id: 'i2', verdict: null, labeled_by_user: null, labeled_at: null })),
    }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3));
    await userEvent.click(within(table.getAllByRole('row')[2]!).getByRole('button', { name: /Không đạt nhẹ.*Nhãn/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Chưa gắn' }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
    expect(r.calls.find((c) => c.method === 'PUT')!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'i2', criterion: 'single_answer', verdict: null });
    expect(await within(table.getAllByRole('row')[2]!).findByRole('button', { name: /Chưa gắn.*Nhãn/ })).toBeInTheDocument();
  });

  it('a failed label says so above the table', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(),
      [JURL.label]: () => problem(409, 'example-held-out'),
    }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3));
    await userEvent.click(within(table.getAllByRole('row')[1]!).getByRole('button', { name: /Chưa gắn.*Nhãn/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đạt' }));
    expect(await screen.findByText(vi.errors['example-held-out'])).toBeInTheDocument();
  });

  it('the stats line of a judge revision: dev passes of those judged with the levels of the failures, held-out as totals, unjudged, and "Chưa hiệu chỉnh"', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)),
      [URL.runItems()]: itemsWith({ judge_stats: [statsRow({ dev: tally({ pass: 1, fail_major: 1 }), held_out: tally({ pass: 1 }) })] }),
      ...judgeRoute(),
    }));
    const scope = await judgePanel();
    expect(await scope.findByText('Judge Chỉ một đáp án bản 2 · single_answer: dev đạt 1/2 (nặng 1, nhẹ 0) · held-out đạt 1/1 · 0 không chấm được')).toBeInTheDocument();
    expect(scope.getByText('Chưa hiệu chỉnh')).toBeInTheDocument();
  });

  it('a calibrated revision says "Đã hiệu chỉnh"; unjudged counts add dev and held-out', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)),
      [URL.runItems()]: itemsWith({ judge_stats: [statsRow({ dev: tally({ pass: 3, fail_minor: 1, unjudged: 2 }), held_out: tally({ unjudged: 1 }), calibrated: true })] }),
      ...judgeRoute(),
    }));
    const scope = await judgePanel();
    expect(await scope.findByText('Judge Chỉ một đáp án bản 2 · single_answer: dev đạt 3/4 (nặng 0, nhẹ 1) · held-out đạt 0/0 · 3 không chấm được')).toBeInTheDocument();
    expect(scope.getByText('Đã hiệu chỉnh')).toBeInTheDocument();
  });

  it('a pass shows its judge, revision, status, count and cost; one stopped by the cap says why', async () => {
    const passes = [
      pass({ id: 'P2', status: 'failed', error: 'admin-usd-cap', judged: 3, total: 10, cost_usd: '0.01000000' }),
      pass({ id: 'P1', status: 'finished', judged: 2, total: 2, cost_usd: null }),
    ];
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith({ passes }), ...judgeRoute() }));
    const scope = await judgePanel();
    expect(await scope.findByText(/^Chỉ một đáp án bản 2 · Dừng · 3\/10 · 0,01\s*US\$$/)).toBeInTheDocument();
    expect(scope.getByText('Dừng vì đã tiêu tới trần USD việc admin hôm nay.')).toBeInTheDocument();
    expect(scope.getByText('Chỉ một đáp án bản 2 · Đã xong · 2/2 · —')).toBeInTheDocument();
  });

  it.each([
    ['stalled', 'Dừng vì worker không phản hồi.'],
    ['run-failed', 'Không chấm vì lần chạy không xong.'],
    ['model-price-missing', 'Model của judge chưa có giá.'],
  ])('a pass that ended with "%s" reads "%s"', async (error, text) => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)),
      [URL.runItems()]: itemsWith({ passes: [pass({ status: 'failed', error, total: null, judged: 0 })] }),
      ...judgeRoute(),
    }));
    expect(await (await judgePanel()).findByText(text)).toBeInTheDocument();
  });

  it('a pass waiting for its run has no total yet: "0/—"', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 1 })),
      [URL.runItems()]: itemsWith({ passes: [pass({ status: 'queued', total: null, judged: 0, cost_usd: null })] }),
      ...judgeRoute(),
    }));
    expect(await (await judgePanel()).findByText('Chỉ một đáp án bản 2 · Đang chờ · 0/— · —')).toBeInTheDocument();
  });

  it('[Chấm bằng judge] posts a pass with the Idempotency-Key and reads the results again; it is not offered while the run goes', async () => {
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(),
      [JURL.judgePass(RUN_ID)]: () => Response.json(pass({ status: 'queued', judged: 0 }), { status: 202 }),
    }));
    const scope = await judgePanel();
    await userEvent.click(await scope.findByRole('button', { name: t.detail.judge.start }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'POST' && c.path === `${RUN_PATH}/judge-passes`)).toHaveLength(1));
    const sent = r.calls.find((c) => c.method === 'POST' && c.path === `${RUN_PATH}/judge-passes`)!;
    expect(sent.body).toEqual({ judge_id: 'J1' });
    expect(sent.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(r.count('GET', `${RUN_PATH}/items`)).toBe(2));
    cleanup();
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ status: 'running', done: 3 })), [URL.runItems()]: itemsWith(), ...judgeRoute() }));
    const live = await judgePanel();
    expect(live.queryByRole('button', { name: t.detail.judge.start })).not.toBeInTheDocument();
  });

  it.each(['judge-pass-running', 'admin-usd-cap', 'model-price-missing'])('409 %s on a pass shows its own sentence', async (slug) => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(),
      [JURL.judgePass(RUN_ID)]: () => problem(409, slug),
    }));
    const scope = await judgePanel();
    await userEvent.click(await scope.findByRole('button', { name: t.detail.judge.start }));
    expect(await scope.findByText(vi.errors[slug as 'admin-usd-cap'])).toBeInTheDocument();
  });

  it('a judge with no model cannot be picked: the pass button stays off', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(judgeView()) }));
    const scope = await judgePanel();
    expect(await scope.findByRole('button', { name: t.detail.judge.start })).toBeDisabled();
  });

  it('the run and the judge both on Anthropic: the warning about a lenient judge; with the fake provider it is not shown', async () => {
    const anthropic = judgeOnFake({ latest: judgeRevision({ id: 'JR2', revision: 2, model: { id: 'M9', provider: 'anthropic', model_id: 'claude-x' } }) });
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ ...on, provider: 'anthropic', model: 'claude-y' })), [URL.runItems()]: itemsWith(), ...judgeRoute(anthropic),
    }));
    expect(await (await judgePanel()).findByText(t.detail.judge.sameProvider)).toBeInTheDocument();
    cleanup();
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun({ ...on, provider: 'anthropic', model: 'claude-y' })), [URL.runItems()]: itemsWith(), ...judgeRoute(judgeOnFake()),
    }));
    const scope = await judgePanel();
    await scope.findByRole('button', { name: t.detail.judge.start });
    expect(scope.queryByText(t.detail.judge.sameProvider)).not.toBeInTheDocument();
  });

  it('"Gắn nhãn lần lượt" opens the label screen for this run and the judge of the newest pass', async () => {
    renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith({ passes: [pass()] }), ...judgeRoute(),
    }));
    expect(await (await judgePanel()).findByRole('link', { name: t.detail.judge.labelQueue })).toHaveAttribute('href', `/ai/judges/label?run=${RUN_ID}&judge=J1`);
  });

  it('the results are read again every 2 s while a pass is queued or running, and no longer once it ends', async () => {
    vitest.useFakeTimers({ shouldAdvanceTime: true });
    let n = 0;
    const r = renderApp(PATH, evalRoutes({
      [URL.run()]: () => Response.json(evalRun(on)),
      [URL.runItems()]: () => Response.json({
        items: twoItems(), stats: runStats({ total: 2, shape_pass: 2 }), judge_stats: [],
        passes: [pass({ status: n++ < 2 ? 'running' : 'finished', judged: n })],
      }),
      ...judgeRoute(),
    }));
    await judgePanel();
    await waitFor(() => expect(r.count('GET', `${RUN_PATH}/items`)).toBe(1));
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(r.count('GET', `${RUN_PATH}/items`)).toBe(2));
    await act(async () => { await vitest.advanceTimersByTimeAsync(2000); });
    await waitFor(() => expect(r.count('GET', `${RUN_PATH}/items`)).toBe(3));
    await act(async () => { await vitest.advanceTimersByTimeAsync(10_000); });
    expect(r.count('GET', `${RUN_PATH}/items`)).toBe(3);
  });

  it('an operation with no judge and no score shows no Judge section and no extra columns', async () => {
    const plain = [runItem({ item_id: 'i1' }), runItem({ item_id: 'i2', position: 1, example_id: 'd2' })];
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith({ items: plain }) }));
    const results = await within(await panel()).findByRole('region', { name: t.detail.results });
    await waitFor(() => expect(within(results).getAllByRole('row')).toHaveLength(3));
    expect(screen.queryByRole('region', { name: t.detail.judge.title })).not.toBeInTheDocument();
    expect(within(results).queryByRole('columnheader', { name: 'Nhãn' })).not.toBeInTheDocument();
  });

  it('scores of a judge that was switched off since still show, with the label select, even with no active judge', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun(on)), [URL.runItems()]: itemsWith(), ...judgeRoute(judgeOnFake({ active: false })) }));
    const table = await tableOf();
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(3));
    expect(table.getAllByRole('row')[1]).toHaveTextContent('single_answer: Không đạt nặng');
    expect(screen.queryByRole('region', { name: t.detail.judge.title })).not.toBeInTheDocument();
  });
});
