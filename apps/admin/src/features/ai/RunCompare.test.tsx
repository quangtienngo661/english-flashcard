import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { RunComparison } from './ai-api';
import { JURL, judgeRevision, judgeView, pass, tally } from './judges/judge-test-support';
import { URL, evalRoutes, evalRun, runStats } from './prompt-test-support';

const t = vi.ai.eval.compare;
const OPEN = 'aaaaaaaa-0000-4000-8000-000000000001';
const BEFORE = 'aaaaaaaa-0000-4000-8000-000000000002';
const OLDER = 'aaaaaaaa-0000-4000-8000-000000000003';
const PATH = `/ai/eval/runs/${OPEN}`;
const onVersion = { set_id: 'S1', set_version: 1 };

const region = async () => {
  const heading = await screen.findByRole('heading', { level: 3, name: t.title }, { timeout: 3000 });
  return within(heading.closest('section') as HTMLElement);
};
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const select = (scope: ReturnType<typeof within>) => scope.getByRole('button', { name: new RegExp(`${escape(t.select)}$`) });

const comparison = (over: Partial<RunComparison> = {}): RunComparison => ({
  a: evalRun({ id: BEFORE, ...onVersion }),
  b: evalRun({ id: OPEN, ...onVersion }),
  stats: {
    a: runStats({ total: 3, shape_pass: 3, rule_pass: 2, rule_fail: 0, expected_pass: 3 }, { total: 2, shape_pass: 2, rule_pass: 2, expected_pass: 2 }),
    b: runStats({ total: 3, shape_pass: 3, rule_pass: 1, rule_fail: 1, expected_pass: 2, expected_fail: 1 }, { total: 2, shape_pass: 1, shape_fail: 1, rule_pass: 1, rule_fail: 1, expected_pass: 1 }),
  },
  regressions: { dev: [{ example_id: 'x1', input: { word: 'go', part_of_speech: 'verb' }, failed: ['rule'] }], held_out: 1 },
  judge: [], judge_unmatched: [], ...over,
});

const routes = (over = {}) => evalRoutes({
  [URL.run()]: () => Response.json(evalRun({ ...onVersion })),
  [URL.runsOfSet('S1')]: () => Response.json({
    items: [
      evalRun({ id: OPEN, ...onVersion }),
      evalRun({ id: BEFORE, model: 'gpt-before', ...onVersion }),
      evalRun({ id: OLDER, model: 'gpt-older', ...onVersion }),
    ],
    next_page_token: null,
  }),
  ...over,
});

describe('RunCompare in the run panel (nhóm B M1, D20)', () => {
  it('the select lists the other runs of the same version, fetched with set_id, and not the open run', async () => {
    const r = renderApp(PATH, routes());
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['15/10/2026 09:12 · gpt-before', '15/10/2026 09:12 · gpt-older']);
    expect(r.count('GET', '/v1/admin/ai/eval/runs?operation=generate_cloze&page_size=20&set_id=S1')).toBe(1);
  });

  it('choosing a run compares it ("trước") with the open one ("nay"): GET …/compare?a=<chosen>&b=<open>', async () => {
    const r = renderApp(PATH, routes({ [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison()) }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    expect(await scope.findByRole('heading', { level: 4, name: t.devRegressions.replace('{count}', '1') })).toBeInTheDocument();
    expect(r.count('GET', `/v1/admin/ai/eval/runs/compare?a=${BEFORE}&b=${OPEN}`)).toBe(1);
  });

  it('the table gives the pass rate of shape, rules and expected answer for dev and held-out, before and now ("—" when nothing was judged)', async () => {
    renderApp(PATH, routes({
      [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison({
        stats: {
          a: runStats({ total: 3, shape_pass: 3, rule_pass: 2, rule_fail: 0 }, { total: 2, shape_pass: 2 }),
          b: runStats({ total: 3, shape_pass: 2, shape_fail: 1, rule_pass: 1, rule_fail: 1 }, { total: 2, shape_pass: 2 }),
        },
      })),
    }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    const table = await scope.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      t.cols.criterion, t.cols.devBefore, t.cols.devNow, t.cols.heldOutBefore, t.cols.heldOutNow,
    ]);
    const row = (name: string) => within(table).getByRole('row', { name: new RegExp(`^${escape(name)}`) });
    const cells = (name: string) => within(row(name)).getAllByRole('cell').map((cell) => cell.textContent);
    expect(within(row(t.rows.rule)).getByRole('rowheader')).toHaveTextContent(t.rows.rule);
    expect(cells(t.rows.rule)).toEqual(['100%', '50%', '—', '—']);
    expect(cells(t.rows.shape)).toEqual(['100%', '67%', '100%', '100%']);
    expect(cells(t.rows.expected)).toEqual(['—', '—', '—', '—']);
  });

  it('dev examples that passed and now fail are listed with what failed; held-out ones are only counted', async () => {
    renderApp(PATH, routes({
      [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison({
        regressions: {
          dev: [
            { example_id: 'x1', input: { word: 'go', part_of_speech: 'verb' }, failed: ['rule'] },
            { example_id: 'x2', input: { word: 'run', part_of_speech: 'verb' }, failed: ['shape', 'expected'] },
          ],
          held_out: 1,
        },
      })),
    }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    expect(await scope.findByRole('heading', { level: 4, name: t.devRegressions.replace('{count}', '2') })).toBeInTheDocument();
    const [first, second] = scope.getAllByRole('listitem');
    expect(first).toHaveTextContent('go · verb');
    expect(first).toHaveTextContent(t.criteria.rule);
    expect(second).toHaveTextContent('run · verb');
    expect(second).toHaveTextContent(`${t.criteria.shape}, ${t.criteria.expected}`);
    expect(scope.getByText(t.heldOutRegressions.replace('{count}', '1'))).toBeInTheDocument();
    expect(scope.queryByText(t.noRegressions)).not.toBeInTheDocument();
  });

  it('no regression at all: "Không có ví dụ nào trước đạt, nay trượt."', async () => {
    renderApp(PATH, routes({
      [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison({ regressions: { dev: [], held_out: 0 } })),
    }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    expect(await scope.findByText(t.noRegressions)).toBeInTheDocument();
    expect(scope.queryByText(/Held-out: /)).not.toBeInTheDocument();
  });

  it('only held-out regressions: their count, and not the "no regression" sentence', async () => {
    renderApp(PATH, routes({
      [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison({ regressions: { dev: [], held_out: 2 } })),
    }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    expect(await scope.findByText(t.heldOutRegressions.replace('{count}', '2'))).toBeInTheDocument();
    expect(scope.queryByText(t.noRegressions)).not.toBeInTheDocument();
    expect(scope.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
  });

  it('a run on the working set cannot be compared: the sentence, no select, and no request for other runs', async () => {
    const r = renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun()) }));
    const scope = await region();
    expect(scope.getByText(t.workingSet)).toBeInTheDocument();
    expect(scope.queryByText(t.select)).not.toBeInTheDocument();
    expect(r.calls.filter((c: Call) => c.path.includes('set_id='))).toHaveLength(0);
  });

  it('a run from before versions existed cannot be compared either', async () => {
    renderApp(PATH, evalRoutes({ [URL.run()]: () => Response.json(evalRun({ legacy: true })) }));
    expect((await region()).getByText(t.workingSet)).toBeInTheDocument();
  });

  it('a version with no other run says there is nothing to compare with', async () => {
    renderApp(PATH, routes({ [URL.runsOfSet('S1')]: () => Response.json({ items: [evalRun({ id: OPEN, ...onVersion })], next_page_token: null }) }));
    const scope = await region();
    expect(await scope.findByText(t.noOther)).toBeInTheDocument();
    expect(scope.queryByText(t.select)).not.toBeInTheDocument();
  });

  it('409 eval-set-mismatch: "Hai lần chạy không cùng phiên bản bộ ví dụ nên không so được."', async () => {
    renderApp(PATH, routes({ [URL.compare(BEFORE, OPEN)]: () => problem(409, 'eval-set-mismatch') }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    expect(await scope.findByText(vi.errors['eval-set-mismatch'])).toBeInTheDocument();
    expect(scope.queryByRole('table')).not.toBeInTheDocument();
  });

  it('the other runs that cannot be read say so with [Thử lại]', async () => {
    renderApp(PATH, routes({ [URL.runsOfSet('S1')]: () => problem(500, 'internal-error') }));
    const scope = await region();
    expect(await scope.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
  });
});

describe('RunCompare judge rows (nhóm B M3-T17)', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer',
    a: { dev: tally({ pass: 9, fail_major: 1 }), held_out: tally({ pass: 3 }) }, b: { dev: tally({ pass: 8, fail_major: 1, fail_minor: 1 }), held_out: tally({ pass: 2, fail_minor: 1 }) },
    ...over,
  });
  const unmatched = (scored: 'a' | 'b', over: Record<string, unknown> = {}) => ({
    judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, scored, ...over,
  });
  const judgePass = (runId: string) => `POST /v1/admin/ai/eval/runs/${runId}/judge-passes`;
  const judgesRoute = (revision = 2) => ({
    [URL.judges]: () => Response.json({ items: [judgeView({ latest: judgeRevision({ id: 'JR2', revision, model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' } }) })] }),
  });

  async function openComparison(extra: Partial<RunComparison>, over = {}) {
    const r = renderApp(PATH, routes({ [URL.compare(BEFORE, OPEN)]: () => Response.json(comparison(extra)), ...judgesRoute(), ...over }));
    const scope = await region();
    await waitFor(() => expect(select(scope)).toBeEnabled());
    await userEvent.click(select(scope));
    await userEvent.click(await screen.findByRole('option', { name: /gpt-before/ }));
    await scope.findByRole('table');
    return { r, scope };
  }

  it('a judge row per revision and criterion: the four percents, judged = pass + fail, "—" when nothing was judged', async () => {
    const { scope } = await openComparison({
      judge: [
        row() as never,
        row({ criterion: 'natural', a: { dev: tally(), held_out: tally({ unjudged: 2 }) }, b: { dev: tally({ unjudged: 1 }), held_out: tally() } }) as never,
      ],
    });
    const table = scope.getByRole('table');
    const cells = (name: string) => within(within(table).getByRole('row', { name: new RegExp(`^${escape(name)}`) })).getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells('Judge Chỉ một đáp án bản 2 · single_answer')).toEqual(['90%', '80%', '100%', '67%']);
    expect(cells('Judge Chỉ một đáp án bản 2 · natural')).toEqual(['—', '—', '—', '—']);
    expect(within(table).getByRole('rowheader', { name: 'Judge Chỉ một đáp án bản 2 · single_answer' })).toBeInTheDocument();
  });

  it('with no judge row there is no judge line in the table', async () => {
    const { scope } = await openComparison({ judge: [] });
    expect(within(scope.getByRole('table')).queryByRole('rowheader', { name: /^Judge/ })).not.toBeInTheDocument();
  });

  it('a revision that scored only one run says so, and "Chấm cả hai bằng …" posts one pass on the run that lacks scores', async () => {
    const { r, scope } = await openComparison({ judge_unmatched: [unmatched('a') as never] }, {
      [judgePass(OPEN)]: () => Response.json(pass({ status: 'queued', judged: 0 }), { status: 202 }),
    });
    expect(scope.getByText('Chỉ một đáp án: chỉ một lần chạy có điểm của bản 2.')).toBeInTheDocument();
    await userEvent.click(scope.getByRole('button', { name: 'Chấm cả hai bằng Chỉ một đáp án' }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/judge-passes'))).toHaveLength(1));
    const sent = r.calls.find((c) => c.method === 'POST' && c.path.endsWith('/judge-passes'))!;
    expect(sent.path).toBe(`/v1/admin/ai/eval/runs/${OPEN}/judge-passes`);
    expect(sent.body).toEqual({ judge_id: 'J1' });
    expect(sent.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('when only the earlier run lacks the scores, the pass goes to the earlier run', async () => {
    const { r, scope } = await openComparison({ judge_unmatched: [unmatched('b') as never] }, {
      [judgePass(BEFORE)]: () => Response.json(pass({ status: 'queued', judged: 0 }), { status: 202 }),
    });
    await userEvent.click(scope.getByRole('button', { name: 'Chấm cả hai bằng Chỉ một đáp án' }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/judge-passes'))).toHaveLength(1));
    expect(r.calls.find((c) => c.method === 'POST' && c.path.endsWith('/judge-passes'))!.path).toBe(`/v1/admin/ai/eval/runs/${BEFORE}/judge-passes`);
  });

  it('when the judge has a newer revision than the one that scored, both runs get a pass (each judges only what it lacks)', async () => {
    const { r, scope } = await openComparison({ judge_unmatched: [unmatched('a', { revision: 1, judge_revision_id: 'JR1' }) as never] }, {
      ...judgesRoute(2),
      [judgePass(OPEN)]: () => Response.json(pass({ id: 'P1', status: 'queued' }), { status: 202 }),
      [judgePass(BEFORE)]: () => Response.json(pass({ id: 'P2', status: 'queued' }), { status: 202 }),
    });
    await userEvent.click(scope.getByRole('button', { name: 'Chấm cả hai bằng Chỉ một đáp án' }));
    await waitFor(() => expect(r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/judge-passes'))).toHaveLength(2));
    expect(r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/judge-passes')).map((c) => c.path).sort()).toEqual([
      `/v1/admin/ai/eval/runs/${OPEN}/judge-passes`, `/v1/admin/ai/eval/runs/${BEFORE}/judge-passes`,
    ]);
  });

  it('while the passes run the button says so; when they end the comparison is read again', async () => {
    let status: 'running' | 'finished' = 'running';
    const { r, scope } = await openComparison({ judge_unmatched: [unmatched('a') as never] }, {
      [judgePass(OPEN)]: () => Response.json(pass({ id: 'P1', status: 'queued' }), { status: 202 }),
      [JURL.passById('P1')]: () => Response.json(pass({ id: 'P1', status })),
    });
    await userEvent.click(scope.getByRole('button', { name: 'Chấm cả hai bằng Chỉ một đáp án' }));
    expect(await scope.findByText('Đang chấm. So sánh sẽ tự cập nhật khi xong.')).toBeInTheDocument();
    expect(r.count('GET', `/v1/admin/ai/eval/runs/compare?a=${BEFORE}&b=${OPEN}`)).toBe(1);
    status = 'finished';
    await waitFor(() => expect(r.count('GET', `/v1/admin/ai/eval/runs/compare?a=${BEFORE}&b=${OPEN}`)).toBe(2), { timeout: 5000 });
    await waitFor(() => expect(scope.queryByText('Đang chấm. So sánh sẽ tự cập nhật khi xong.')).not.toBeInTheDocument());
  });

  it('a refused pass shows why: 409 admin-usd-cap', async () => {
    const { scope } = await openComparison({ judge_unmatched: [unmatched('a') as never] }, { [judgePass(OPEN)]: () => problem(409, 'admin-usd-cap') });
    await userEvent.click(scope.getByRole('button', { name: 'Chấm cả hai bằng Chỉ một đáp án' }));
    expect(await scope.findByText(vi.errors['admin-usd-cap'])).toBeInTheDocument();
  });
});
