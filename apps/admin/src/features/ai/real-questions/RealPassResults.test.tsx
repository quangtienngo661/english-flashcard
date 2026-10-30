import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { problem, type Call } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import { PASS_ID, RURL, realItem, realPass, realRoutes, sourcePreview } from './real-test-support';

const t = vi.ai.real;
const verdicts = vi.ai.eval.detail.judge.verdicts;
const PATH = `/ai/real-questions?pass=${PASS_ID}`;
// The visible text is "Đưa vào bộ ví dụ"; the accessible name adds the question, so the buttons of two rows differ.
const ADD_BUTTON = new RegExp(`^${t.add.button}`);
const items = () => [
  realItem(),
  realItem({
    question_id: 'q2', input: { word: 'run', part_of_speech: 'verb' }, output: { sentence: 'They ___ daily.' },
    scores: [{ criterion: 'single_answer', verdict: 'pass', problem: null, reason: 'Only run fits.' }], failed: false, can_add_to_examples: false, config_number: 5,
  }),
];
const withPass = (list = items(), pass = realPass()) => ({ [RURL.pass()]: () => Response.json({ pass, items: list }) });
const panel = async () => within(await screen.findByTestId('detail-panel'));
const table = async () => within(within(await screen.findByTestId('detail-panel')).getByRole('table'));
const puts = (calls: Call[]) => calls.filter((c) => c.method === 'PUT' && c.path === '/v1/admin/ai/labels');

async function open(over: Record<string, (c: Call) => Response | Promise<Response>> = {}, path = PATH) {
  const r = renderApp(path, realRoutes(over));
  await screen.findByTestId('detail-panel', undefined, { timeout: 4000 });
  return r;
}

beforeEach(() => sessionStorage.clear());

describe('RealPassResults (nhóm B M4-T9)', { timeout: 20_000 }, () => {
  it('the head names the pass by its time and says its judge, operation, filters, starter and cost', async () => {
    await open(withPass());
    const p = await panel();
    expect(await p.findByRole('heading', { level: 2, name: 'Lượt chấm · 15/10/2026 09:12' })).toBeInTheDocument();
    expect(p.getByText('Chỉ một đáp án bản 2 · fake:ok')).toBeInTheDocument();
    expect(p.getByText(vi.ai.operations.names.generate_cloze)).toBeInTheDocument();
    expect(p.getByText(t.results.allPairs)).toBeInTheDocument();
    expect(p.getByText('lan@wordmet.com')).toBeInTheDocument();
    expect(p.getByText('0,003 USD')).toBeInTheDocument();
    expect(p.getByText(vi.ai.eval.detail.judge.statuses.finished)).toBeInTheDocument();
  });

  it('the filters of the pass: the pair and "Chỉ tài khoản test"; what was skipped for a private word', async () => {
    await open(withPass(items(), realPass({
      filters: { operation: 'generate_cloze', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true, limit: 200, since: '2026-10-08T02:12:00.000Z', skipped: { private_word: 2, no_content: 0, already_judged: 0 } },
    })));
    const p = await panel();
    expect(await p.findByText('Cấu hình 4 · fake:ok · Chỉ tài khoản test')).toBeInTheDocument();
    expect(p.getByText(vi.ai.real.estimate.skippedPrivate.replace('{count}', '2'))).toBeInTheDocument();
  });

  it('a row shows the verdict of the judge, its reason and the pair the question was made with', async () => {
    await open(withPass());
    const rows = await table();
    expect(rows.getByText('go · verb')).toBeInTheDocument();
    expect(rows.getByText(`single_answer: ${verdicts.fail_major}`)).toBeInTheDocument();
    expect(rows.getByText('come fits too')).toBeInTheDocument();
    expect(rows.getByText('Cấu hình 4 · fake:ok')).toBeInTheDocument();
    expect(rows.getByText(`single_answer: ${verdicts.pass}`)).toBeInTheDocument();
    expect(rows.getByText('Cấu hình 5 · fake:ok')).toBeInTheDocument();
  });

  it('a score with no verdict reads "Không chấm được" with its problem', async () => {
    await open(withPass([realItem({ scores: [{ criterion: 'single_answer', verdict: null, problem: 'invalid-shape', reason: null }] })]));
    const rows = await table();
    expect(rows.getByText(`single_answer: ${verdicts.unjudged}`)).toBeInTheDocument();
    expect(rows.getByText('invalid-shape')).toBeInTheDocument();
  });

  it('"Đưa vào bộ ví dụ" only on the rows that can be added; it asks the preview by question_id and opens the dialog', async () => {
    const r = await open({ ...withPass(), [RURL.preview('q1')]: () => Response.json(sourcePreview()) });
    const rows = await table();
    expect(rows.getAllByRole('button', { name: ADD_BUTTON })).toHaveLength(1);
    await userEvent.click(rows.getByRole('button', { name: ADD_BUTTON }));
    const dialog = await screen.findByRole('dialog', { name: t.add.title });
    expect(within(dialog).getByText('go · verb')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label })).toHaveValue('go, goes, going');
    expect(r.count('GET', '/v1/admin/practice/eval-examples/from-source?question_id=q1')).toBe(1);
  });

  it('adding sends the question id and the corrected forms, says so with a toast and closes the dialog', async () => {
    const r = await open({
      ...withPass(),
      [RURL.preview('q1')]: () => Response.json(sourcePreview()),
      [RURL.addExample]: () => Response.json({ id: 'e9', operation: 'generate_cloze', rebuilt: false }, { status: 201 }),
    });
    await userEvent.click((await table()).getByRole('button', { name: ADD_BUTTON }));
    const dialog = await screen.findByRole('dialog', { name: t.add.title });
    const box = within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label });
    await userEvent.clear(box);
    await userEvent.type(box, 'go, goes');
    await userEvent.click(within(dialog).getByRole('button', { name: t.add.confirm }));
    expect(await screen.findByText(t.add.added)).toBeInTheDocument();
    const [call] = r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/eval-examples/from-source'));
    expect(call!.body).toEqual({ question_id: 'q1', expected: { forms: ['go', 'goes'] }, note: null });
    expect(call!.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.add.title })).toBeNull());
  });

  it('a preview the API refuses (a private word, the sense gone) says why above the table and opens no dialog', async () => {
    await open({ ...withPass(), [RURL.preview('q1')]: () => problem(409, 'source-not-eligible', { reason: 'sense-gone' }) });
    await userEvent.click((await table()).getByRole('button', { name: ADD_BUTTON }));
    expect(await (await panel()).findByText(t.add.notEligible['sense-gone'])).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: t.add.title })).toBeNull();
  });

  it('a label chosen in the table PUTs the real question, the criterion and the verdict, and the table shows it at once', async () => {
    const r = await open({
      ...withPass(),
      [RURL.label]: (call) => Response.json({ ...(call.body as object), labeled_by_user: null, labeled_at: null }),
    });
    const rows = await table();
    await userEvent.click(rows.getAllByRole('button', { name: /Nhãn · go · verb · single_answer/ })[0]!);
    await userEvent.click(await screen.findByRole('option', { name: verdicts.fail_major }));
    await waitFor(() => expect(puts(r.calls)).toHaveLength(1));
    expect(puts(r.calls)[0]!.body).toEqual({ subject_kind: 'real_question', subject_id: 'q1', criterion: 'single_answer', verdict: 'fail_major' });
    await waitFor(() => expect(rows.getAllByRole('button', { name: /Nhãn · go · verb · single_answer/ })[0]).toHaveTextContent(verdicts.fail_major));
  });

  it('a label already given is shown, and "Chưa gắn" takes it back with verdict null', async () => {
    const r = await open({
      ...withPass([realItem({ labels: [{ criterion: 'single_answer', verdict: 'pass' }] })]),
      [RURL.label]: (call) => Response.json({ ...(call.body as object), labeled_by_user: null, labeled_at: null }),
    });
    const rows = await table();
    const control = rows.getAllByRole('button', { name: /Nhãn · go · verb · single_answer/ })[0]!;
    expect(control).toHaveTextContent(verdicts.pass);
    await userEvent.click(control);
    await userEvent.click(await screen.findByRole('option', { name: vi.ai.eval.detail.judge.labelNone }));
    await waitFor(() => expect(puts(r.calls)).toHaveLength(1));
    expect(puts(r.calls)[0]!.body).toMatchObject({ subject_kind: 'real_question', subject_id: 'q1', verdict: null });
  });

  it('the judge\'s model and a question both made by Anthropic: the same-provider warning shows once', async () => {
    await open(withPass(
      [realItem({ provider: 'anthropic' }), realItem({ question_id: 'q2', provider: 'anthropic', failed: false, can_add_to_examples: false })],
      realPass({ judge_model: { provider: 'anthropic', model_id: 'claude-x' } }),
    ));
    const p = await panel();
    expect(await p.findByText(vi.ai.eval.detail.judge.sameProvider)).toBeInTheDocument();
  });

  it('no warning when only one side is Anthropic', async () => {
    await open(withPass([realItem({ provider: 'openai' })], realPass({ judge_model: { provider: 'anthropic', model_id: 'claude-x' } })));
    await table();
    expect(screen.queryByText(vi.ai.eval.detail.judge.sameProvider)).toBeNull();
  });

  it('a question deleted since (no date, no pair) is still listed from the snapshot, says so, and has no add button', async () => {
    await open(withPass([realItem({ created_at: null, config_number: null, model: null, provider: null, can_add_to_examples: false })]));
    const rows = await table();
    expect(rows.getByText('go · verb')).toBeInTheDocument();
    expect(rows.getByText(t.results.deleted)).toBeInTheDocument();
    expect(rows.queryByRole('button', { name: ADD_BUTTON })).toBeNull();
  });

  it('a pass still running lists a question with no score yet as "Chưa chấm" and says how far it is', async () => {
    await open(withPass([realItem({ scores: [], failed: false, can_add_to_examples: false })], realPass({ status: 'running', judged: 1 })));
    const rows = await table();
    expect(rows.getByText(t.results.pending)).toBeInTheDocument();
    expect((await panel()).getByText(t.results.running.replace('{judged}', '1').replace('{total}', '3'))).toBeInTheDocument();
  });

  it('a queued pass says it waits for the worker', async () => {
    await open(withPass([], realPass({ status: 'queued', judged: 0 })));
    expect(await (await panel()).findByText(t.results.queued)).toBeInTheDocument();
  });

  it('a stopped pass says why in words, and an unknown reason as it is', async () => {
    await open(withPass(items(), realPass({ status: 'failed', error: 'admin-usd-cap' })));
    expect(await (await panel()).findByText(vi.ai.eval.detail.judge.errors['admin-usd-cap'])).toBeInTheDocument();
  });

  it('a pass with no question says so', async () => {
    await open(withPass([]));
    expect(await (await panel()).findByText(t.results.empty)).toBeInTheDocument();
  });

  it('an unknown pass (404) says it was not found', async () => {
    await open({ [RURL.pass()]: () => problem(404, 'not-found') });
    expect(await (await panel()).findByText(t.results.notFound)).toBeInTheDocument();
  });

  it('a pass id that is no UUID says not found without asking the API', async () => {
    const r = await open({}, '/ai/real-questions?pass=not-a-uuid');
    expect(await (await panel()).findByText(t.results.notFound)).toBeInTheDocument();
    expect(r.calls.filter((c) => c.path.includes('/passes/not-a-uuid'))).toHaveLength(0);
  });

  it('a failed read offers "Thử lại"', async () => {
    let n = 0;
    await open({
      [RURL.pass()]: () => (++n === 1 ? problem(500, 'internal') : Response.json({ pass: realPass(), items: items() })),
    });
    await userEvent.click(await (await panel()).findByRole('button', { name: vi.common.retry }));
    expect(await (await table()).findByText('come fits too')).toBeInTheDocument();
  });
});
