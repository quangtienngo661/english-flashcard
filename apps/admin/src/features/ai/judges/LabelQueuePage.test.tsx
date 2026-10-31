import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { makeMe, problem } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import { RUN_ID, URL, evalRun, runItem, runStats } from '../prompt-test-support';
import { JURL, judgeOnFake, judgeRevision, judgeView, label, score } from './judge-test-support';

const t = vi.ai.judges.label;
const PATH = `/ai/judges/label?run=${RUN_ID}&judge=J1`;
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});
const CRITERIA = [{ code: 'single_answer', question: 'Is the given word the only answer that fits?' }, { code: 'natural', question: 'Is the sentence natural English?' }];
const twoJudge = () => judgeOnFake({ latest: judgeRevision({ id: 'JR2', revision: 2, criteria: CRITERIA, model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' } }) });

const items = () => [
  runItem({
    item_id: 'd1', example_id: 'e1', position: 0, input: { word: 'go', part_of_speech: 'verb' }, output: { sentence: 'I ___ home.', accepted_answers: ['go'], translation_vi: 'Tôi về nhà.' },
    labels: [label({ subject_id: 'd1', criterion: 'single_answer' }), label({ subject_id: 'd1', criterion: 'natural' })],
  }),
  runItem({ item_id: 'd2', example_id: 'e2', position: 1, input: { word: 'come', part_of_speech: 'verb' }, status: 'transient_failure', output: null }),
  runItem({
    item_id: 'd3', example_id: 'e3', position: 2, input: { word: 'run', part_of_speech: 'verb' }, output: { sentence: 'They ___ every day.', accepted_answers: ['run', 'runs'], translation_vi: 'Họ chạy mỗi ngày.' },
    // A score that must never be shown while the owner labels (no anchoring, D16).
    scores: [score({ verdict: 'fail_major', reason: 'ran fits too' })],
  }),
];
const itemsReply = (list = items()) => () => Response.json({ items: list, stats: runStats({ total: list.length }), passes: [], judge_stats: [] });
const routes = (over: Record<string, unknown> = {}) => ({
  [JURL.list]: () => Response.json({ items: [twoJudge()] }),
  [URL.runItems()]: itemsReply(),
  [URL.run()]: () => Response.json(evalRun()),
  ...over,
}) as Record<string, never>;
const position = () => screen.getByText(/^\d+\/\d+$/);
const putCalls = (calls: { method: string; path: string; body: unknown }[]) => calls.filter((c) => c.method === 'PUT' && c.path === '/v1/admin/ai/labels');

async function open(over = {}, path = PATH) {
  const r = renderApp(path, routes(over));
  await screen.findByRole('heading', { level: 2, name: /^Gắn nhãn · / }, { timeout: 4000 });
  return r;
}

beforeEach(() => sessionStorage.clear());

describe('LabelQueuePage (nhóm B M3-T18)', () => {
  it('opens at the first task without a label: "3/4", with the output and the question of its criterion', async () => {
    await open();
    expect(screen.getByRole('heading', { level: 2, name: 'Gắn nhãn · Chỉ một đáp án' })).toBeInTheDocument();
    expect(position()).toHaveTextContent('3/4');
    expect(screen.getByText('They ___ every day.')).toBeInTheDocument();
    expect(screen.getByText('run, runs')).toBeInTheDocument();
    expect(screen.getByText('Họ chạy mỗi ngày.')).toBeInTheDocument();
    expect(screen.getByText('run', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('verb', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Is the given word the only answer that fits?')).toBeInTheDocument();
    expect(screen.getByText('single_answer')).toBeInTheDocument();
    expect(screen.getByText(t.hint)).toBeInTheDocument();
  });

  it('never shows what the judge said: no level, no reason of its score is on the screen before the owner labels', async () => {
    await open();
    expect(screen.queryByText('ran fits too')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Đã gắn:/)).not.toBeInTheDocument();
  });

  it('key 2 PUTs "Không đạt nặng" for that output and criterion and moves on to "4/4"', async () => {
    const r = await open({ [JURL.label]: () => Response.json(label({ subject_id: 'd3', criterion: 'single_answer', verdict: 'fail_major' })) });
    await userEvent.keyboard('2');
    await waitFor(() => expect(putCalls(r.calls)).toHaveLength(1));
    expect(putCalls(r.calls)[0]!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'd3', criterion: 'single_answer', verdict: 'fail_major' });
    await waitFor(() => expect(position()).toHaveTextContent('4/4'));
    expect(screen.getByText('Is the sentence natural English?')).toBeInTheDocument();
  });

  it('the buttons do the same as the keys: "Đạt (1)", "Không đạt nặng (2)", "Không đạt nhẹ (3)"', async () => {
    const r = await open({ [JURL.label]: (call: { body: { verdict: 'pass' } }) => Response.json(label({ subject_id: 'd3', verdict: call.body.verdict })) });
    expect(screen.getByRole('button', { name: 'Đạt (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Không đạt nặng (2)' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Không đạt nhẹ (3)' }));
    await waitFor(() => expect(putCalls(r.calls)).toHaveLength(1));
    expect(putCalls(r.calls)[0]!.body).toMatchObject({ verdict: 'fail_minor' });
  });

  it('"Trước" goes back and shows what was labelled; key 1 there overrides it with "Đạt"', async () => {
    const r = await open({
      [JURL.label]: (call: { body: { verdict: 'pass' | 'fail_major'; subject_id: string; criterion: string } }) => Response.json(label({ subject_id: call.body.subject_id, criterion: call.body.criterion, verdict: call.body.verdict })),
    });
    await userEvent.keyboard('2');
    await waitFor(() => expect(position()).toHaveTextContent('4/4'));
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(position()).toHaveTextContent('3/4');
    expect(await screen.findByText('Đã gắn: Không đạt nặng')).toBeInTheDocument();
    await userEvent.keyboard('1');
    await waitFor(() => expect(putCalls(r.calls)).toHaveLength(2));
    expect(putCalls(r.calls)[1]!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'd3', criterion: 'single_answer', verdict: 'pass' });
  });

  it('"Bỏ qua" moves on without a label; "Trước" is off on the first task', async () => {
    const r = await open();
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(position()).toHaveTextContent('4/4');
    expect(putCalls(r.calls)).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(position()).toHaveTextContent('2/4');
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    await userEvent.click(screen.getByRole('button', { name: 'Trước' }));
    expect(position()).toHaveTextContent('1/4');
    expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled();
  });

  it('after the last task: "Đã đi hết 2 đầu ra." and a link back to the run', async () => {
    await open({ [JURL.label]: (call: { body: { verdict: 'pass' } }) => Response.json(label({ subject_id: 'd3', verdict: call.body.verdict })) });
    await userEvent.keyboard('1');
    await waitFor(() => expect(position()).toHaveTextContent('4/4'));
    await userEvent.keyboard('1');
    expect(await screen.findByText('Đã đi hết 2 đầu ra.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.backToRun })).toHaveAttribute('href', `/ai/eval/runs/${RUN_ID}?op=generate_cloze`);
    expect(screen.queryByRole('button', { name: 'Đạt (1)' })).not.toBeInTheDocument();
  });

  it('a run with no dev output has nothing to label', async () => {
    renderApp(PATH, routes({ [URL.runItems()]: itemsReply([]) }));
    expect(await screen.findByText(t.empty, undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('typing in a box does not label: keys 1, 2, 3 only count when no box has the focus', async () => {
    const r = await open();
    const area = document.createElement('input');
    document.body.append(area);
    area.focus();
    await userEvent.keyboard('2');
    area.remove();
    expect(putCalls(r.calls)).toHaveLength(0);
  });

  it('a failed label stays on the task and says why', async () => {
    await open({ [JURL.label]: () => problem(409, 'example-held-out') });
    await userEvent.keyboard('1');
    expect(await screen.findByText(vi.errors['example-held-out'])).toBeInTheDocument();
    expect(position()).toHaveTextContent('3/4');
  });

  it('a missing run or judge in the address, or an unknown judge, says where this screen is opened from', async () => {
    renderApp('/ai/judges/label', routes());
    expect(await screen.findByText(t.missing, undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('an editor has no access (the entry needs settings.manage) and nothing is read', async () => {
    const r = renderApp(PATH, routes(), EDITOR);
    expect(await screen.findByText(vi.noAccess.title, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/ai/judges')).toBe(0);
  });

  it('the tasks follow the judge\'s newest criteria, in their order', async () => {
    const one = judgeView({ latest: judgeRevision({ criteria: [CRITERIA[1]!] }) });
    renderApp(PATH, routes({ [JURL.list]: () => Response.json({ items: [one] }) }));
    await screen.findByRole('heading', { level: 2, name: /^Gắn nhãn · / }, { timeout: 4000 });
    expect(position()).toHaveTextContent('2/2');
    expect(within(document.body).getByText('natural')).toBeInTheDocument();
  });
});
