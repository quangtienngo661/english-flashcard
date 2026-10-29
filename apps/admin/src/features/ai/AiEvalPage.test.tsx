import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { judgeOnFake, judgeView } from './judges/judge-test-support';
import { URL, evalExample, evalRoutes, evalRun, evalSet, example, heldOutExample, operationsFor, setDetail, setItem } from './prompt-test-support';

const t = vi.ai.eval;
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);
const examplesReply = (...items: ReturnType<typeof evalExample>[]) => () => Response.json({ items });
const runButton = () => screen.getByRole('button', { name: t.run.start });

async function openPage(over = {}, path = '/ai/eval') {
  const r = renderApp(path, evalRoutes(over));
  // The run button waits for the list of versions (it names the version the run takes).
  const button = await screen.findByRole('button', { name: t.run.start });
  await waitFor(() => expect(button).toBeEnabled());
  return r;
}

describe('AiEvalPage examples (A/83)', () => {
  it('lists the examples of the operation: input, note and who added it; the count is out of 100', async () => {
    const note = { ...evalExample('e2', 'bank'), note: 'river bank', created_by_user: { id: 'sys', email: null, system: true } };
    await openPage({ [URL.examples()]: examplesReply(evalExample('e1', 'go'), note) });
    expect(await screen.findByRole('heading', { level: 2, name: t.examples.replace('{count}', '2') })).toBeInTheDocument();
    const rows = screen.getAllByRole('row').filter((row) => within(row).queryByText(/go · verb|bank · verb/));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('lan@wordmet.com');
    expect(rows[1]).toHaveTextContent('river bank');
    expect(rows[1]).toHaveTextContent(vi.common.system);
  });

  it('403 on the examples shows the forbidden text, not the generic list error', async () => {
    renderApp('/ai/eval', evalRoutes({ [URL.examples()]: () => problem(403, 'forbidden') }));
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });

  it('[Thêm ví dụ] opens /ai/eval/new with a box per input field of the operation; it POSTs the input (empty → null) and the note', async () => {
    let items = [evalExample('e1', 'go')];
    const r = await openPage({
      [URL.examples()]: () => Response.json({ items }),
      [URL.forms('run', 'verb')]: () => Response.json({ forms: ['run', 'ran', 'running', 'runs'] }),
      [URL.addExample]: (call: Call) => {
        const added = { ...evalExample('e2', 'run'), ...(call.body as object) };
        items = [...items, added];
        return Response.json(added, { status: 201 });
      },
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.form.addTitle });
    expect(r.router.state.location.pathname).toBe('/ai/eval/new');
    expect(within(dialog).getAllByRole('textbox').map((box) => box.getAttribute('id'))).toEqual([
      'example-input-word', 'example-input-part_of_speech', 'example-input-level', 'example-input-meaning_vi', 'example-input-context_label',
      'example-expected-forms', 'example-note',
    ]);
    await userEvent.type(within(dialog).getByLabelText('word'), 'run');
    await userEvent.type(within(dialog).getByLabelText('part_of_speech'), 'verb');
    await userEvent.type(within(dialog).getByLabelText(t.form.note), 'motion');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await screen.findByText(t.toast.added)).toBeInTheDocument();
    expect(posts(r.calls, '/v1/admin/ai/eval/examples')[0].body).toEqual({
      operation: 'generate_cloze',
      input: { word: 'run', part_of_speech: 'verb', level: null, meaning_vi: null, context_label: null },
      note: 'motion',
      expected: { forms: ['run', 'ran', 'running', 'runs'] },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('heading', { level: 2, name: t.examples.replace('{count}', '2') })).toBeInTheDocument();
  });

  it('§6.5: the 1001st example → "Mỗi thao tác tối đa 1.000 ví dụ."; an input violation lands on its box', async () => {
    let reply = () => problem(400, 'validation-failed', { violations: ['operation: at most 1000 examples'] });
    await openPage({ [URL.addExample]: () => reply() });
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('word'), 'go');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await within(dialog).findByText(t.form.tooMany)).toBeInTheDocument();

    reply = () => problem(400, 'validation-failed', { violations: ['input.word: Too small: expected string to have >=1 characters'] });
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    await waitFor(() => expect(within(dialog).getByLabelText('word')).toHaveAttribute('aria-invalid', 'true'));
    expect(within(dialog).queryByText(t.form.tooMany)).not.toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText('word')).toHaveFocus());
  });

  it('[Sửa] fills the form with the example and PATCHes the input and note', async () => {
    const r = await openPage({
      [URL.examples()]: examplesReply(evalExample('e1', 'go')),
      [URL.example('e1')]: (call: Call) => Response.json({ ...evalExample('e1', 'went'), ...(call.body as object) }),
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.editFor.replace('{summary}', 'go · verb') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.form.editTitle });
    expect(within(dialog).getByLabelText('word')).toHaveValue('go');
    await userEvent.clear(within(dialog).getByLabelText('word'));
    await userEvent.type(within(dialog).getByLabelText('word'), 'went');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitSave }));
    expect(await screen.findByText(t.toast.saved)).toBeInTheDocument();
    const patch = r.calls.find((c) => c.method === 'PATCH');
    expect(patch?.body).toEqual({ input: { word: 'went', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null }, note: null, expected: { forms: ['go'] } });
  });

  it('[Xóa] asks first, then DELETEs and toasts', async () => {
    const r = await openPage({
      [URL.examples()]: examplesReply(evalExample('e1', 'go')),
      [URL.example('e1', 'DELETE')]: () => new Response(null, { status: 204 }),
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.deleteFor.replace('{summary}', 'go · verb') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.deleteTitle });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText(t.toast.deleted)).toBeInTheDocument();
    expect(r.count('DELETE', '/v1/admin/ai/eval/examples/e1')).toBe(1);
  });
});

describe('AiEvalPage example dialog: the expected answer (nhóm B M1)', () => {
  const DEPLOY_FORMS = ['deploy', 'deployed', 'deploying', 'deploys'];
  const formsBox = (dialog: HTMLElement) => within(dialog).getByRole('textbox', { name: t.form.expected.forms.label });
  const formsRequests = (calls: Call[]) => calls.filter((c) => c.path.startsWith('/v1/admin/ai/eval/examples/forms'));
  async function openAdd(over = {}) {
    const r = await openPage(over);
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.form.addTitle });
    return { r, dialog };
  }
  const added = (call: Call) => ({ ...evalExample('e9', 'deploy'), ...(call.body as object) });
  const addedBody = (calls: Call[]) => posts(calls, '/v1/admin/ai/eval/examples')[0].body as Record<string, unknown>;

  it('leaving the word and the part of speech fills the forms of the catalog; the admin removes two and the POST carries the rest', async () => {
    const { r, dialog } = await openAdd({
      [URL.forms('deploy', 'verb')]: () => Response.json({ forms: DEPLOY_FORMS }),
      [URL.addExample]: (call: Call) => Response.json(added(call), { status: 201 }),
    });
    expect(within(dialog).getByText(t.form.expected.title)).toBeInTheDocument();
    expect(formsBox(dialog)).toHaveValue('');
    await userEvent.type(within(dialog).getByLabelText('word'), 'deploy');
    await userEvent.type(within(dialog).getByLabelText('part_of_speech'), 'verb');
    await userEvent.tab();
    await waitFor(() => expect(formsBox(dialog)).toHaveValue('deploy, deployed, deploying, deploys'));
    expect(within(dialog).getByText(t.form.expected.forms.filled.replace('{count}', '4'))).toBeInTheDocument();
    expect(within(dialog).getByText(t.form.expected.forms.hint)).toBeInTheDocument();

    await userEvent.clear(formsBox(dialog));
    await userEvent.type(formsBox(dialog), 'deploy, deployed');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await screen.findByText(t.toast.added)).toBeInTheDocument();
    expect(addedBody(r.calls).expected).toEqual({ forms: ['deploy', 'deployed'] });
  });

  it('forms the admin typed are not replaced when the part of speech is set later; no request is made without a part of speech', async () => {
    const { r, dialog } = await openAdd({ [URL.forms('deploy', 'verb')]: () => Response.json({ forms: DEPLOY_FORMS }) });
    await userEvent.type(within(dialog).getByLabelText('word'), 'deploy');
    await userEvent.tab();
    expect(formsRequests(r.calls)).toHaveLength(0);
    await userEvent.type(formsBox(dialog), 'mine');
    await userEvent.type(within(dialog).getByLabelText('part_of_speech'), 'verb');
    await userEvent.tab();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(formsBox(dialog)).toHaveValue('mine');
    expect(formsRequests(r.calls)).toHaveLength(0);
  });

  it('a word the catalog does not know ({ forms: null }) says so and leaves the box empty to type in', async () => {
    const { dialog } = await openAdd({ [URL.forms('lit', 'adjective')]: () => Response.json({ forms: null }) });
    await userEvent.type(within(dialog).getByLabelText('word'), 'lit');
    await userEvent.type(within(dialog).getByLabelText('part_of_speech'), 'adjective');
    await userEvent.tab();
    expect(await within(dialog).findByText(t.form.expected.forms.notFound)).toBeInTheDocument();
    expect(formsBox(dialog)).toHaveValue('');
  });

  it('422 expected-invalid: the violation lands under "Các dạng được nhận" and the box is focused; nothing else is flagged', async () => {
    const { dialog } = await openAdd({ [URL.addExample]: () => problem(422, 'expected-invalid', { violations: ['expected.forms: at least one form'] }) });
    await userEvent.type(within(dialog).getByLabelText('word'), 'go');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await within(dialog).findByText('at least one form')).toBeInTheDocument();
    await waitFor(() => expect(formsBox(dialog)).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(formsBox(dialog)).toHaveFocus());
    expect(within(dialog).getByLabelText('word')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('a violation that names no box ("expected: required for …") goes under the first box of the section', async () => {
    const { dialog } = await openAdd({ [URL.addExample]: () => problem(422, 'expected-invalid', { violations: ['expected: required for generate_cloze'] }) });
    await userEvent.type(within(dialog).getByLabelText('word'), 'go');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await within(dialog).findByText('required for generate_cloze')).toBeInTheDocument();
    expect(formsBox(dialog)).toHaveAttribute('aria-invalid', 'true');
  });

  it('a new example that lands in the hidden held-out part is not echoed: the toast says it went there', async () => {
    const { dialog } = await openAdd({ [URL.addExample]: () => Response.json({ id: 'h9', split: 'held_out' }, { status: 201 }) });
    await userEvent.type(within(dialog).getByLabelText('word'), 'go');
    await userEvent.type(formsBox(dialog), 'go');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await screen.findByText(t.toast.addedHeldOut)).toBeInTheDocument();
    expect(screen.queryByText(t.toast.added)).not.toBeInTheDocument();
  });

  const OTHER_OPERATIONS = ['lookup_word', 'translate_sentence', 'check_private_word'];
  const otherRoutes = Object.fromEntries(OTHER_OPERATIONS.flatMap((op) => [
    [URL.examples(op), () => Response.json({ items: [] })],
    [URL.runs(op), () => Response.json({ items: [], next_page_token: null })],
    [URL.sets(op), () => Response.json({ items: [] })],
  ]));
  async function openOp(op: string, over = {}) {
    const r = renderApp(`/ai/eval?op=${op}`, evalRoutes({
      [URL.operations]: operationsFor({ lookup_word: ['text', 'context_sentence'], translate_sentence: ['text'], check_private_word: ['word', 'part_of_speech', 'meaning_vi'] }),
      ...otherRoutes,
      [URL.addExample]: (call: Call) => Response.json(added(call), { status: 201 }),
      ...over,
    }));
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    return { r, dialog: await screen.findByRole('dialog', { name: t.form.addTitle }) };
  }

  it('lookup_word asks for "Lemma" and "Từ loại" and sends them as the expected answer', async () => {
    const { r, dialog } = await openOp('lookup_word');
    expect(within(dialog).getByText(t.form.expected.title)).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox', { name: t.form.expected.forms.label })).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('text'), 'ran');
    await userEvent.type(within(dialog).getByLabelText(t.form.expected.lemma), 'run');
    await userEvent.type(within(dialog).getByLabelText(t.form.expected.partOfSpeech), 'verb');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    await screen.findByText(t.toast.added);
    expect(addedBody(r.calls)).toEqual({
      operation: 'lookup_word', input: { text: 'ran', context_sentence: null }, note: null, expected: { lemma: 'run', part_of_speech: 'verb' },
    });
  });

  it('a lookup violation on the part of speech lands under "Từ loại", not under "Lemma"', async () => {
    const { dialog } = await openOp('lookup_word', {
      [URL.addExample]: () => problem(422, 'expected-invalid', { violations: ['expected.part_of_speech: not a part of speech'] }),
    });
    await userEvent.type(within(dialog).getByLabelText('text'), 'ran');
    await userEvent.type(within(dialog).getByLabelText(t.form.expected.lemma), 'run');
    await userEvent.type(within(dialog).getByLabelText(t.form.expected.partOfSpeech), 'vrb');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    expect(await within(dialog).findByText('not a part of speech')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(t.form.expected.partOfSpeech)).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText(t.form.expected.lemma)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('check_private_word asks for a "Kết luận" (ok or not_recognized)', async () => {
    const { r, dialog } = await openOp('check_private_word');
    await userEvent.type(within(dialog).getByLabelText('word'), 'blorf');
    await userEvent.click(within(dialog).getByRole('button', { name: new RegExp(`${t.form.expected.verdict}$`) }));
    await userEvent.click(await screen.findByRole('option', { name: 'not_recognized' }));
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    await screen.findByText(t.toast.added);
    expect(addedBody(r.calls).expected).toEqual({ verdict: 'not_recognized' });
  });

  it('translate_sentence has no expected answer: no section, and no "expected" in the POST', async () => {
    const { r, dialog } = await openOp('translate_sentence');
    expect(within(dialog).queryByText(t.form.expected.title)).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('text'), 'Hello');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitAdd }));
    await screen.findByText(t.toast.added);
    expect(addedBody(r.calls)).toEqual({ operation: 'translate_sentence', input: { text: 'Hello' }, note: null });
  });

  it('[Sửa] shows the stored forms and leaving the word does not replace them', async () => {
    const stored = { ...evalExample('e1', 'go'), expected: { forms: ['go', 'goes'] } };
    const r = await openPage({ [URL.examples()]: examplesReply(stored) });
    await userEvent.click((await screen.findAllByRole('button', { name: t.editFor.replace('{summary}', 'go · verb') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.form.editTitle });
    expect(formsBox(dialog)).toHaveValue('go, goes');
    await userEvent.clear(within(dialog).getByLabelText('word'));
    await userEvent.type(within(dialog).getByLabelText('word'), 'went');
    await userEvent.tab();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(formsBox(dialog)).toHaveValue('go, goes');
    expect(formsRequests(r.calls)).toHaveLength(0);
  });

  it('[Sửa] on an example with no expected answer yet (migrated): leaving the word fills the forms, and saving PATCHes them', async () => {
    const migrated = { ...evalExample('e1', 'go'), expected: null };
    const r = await openPage({
      [URL.examples()]: examplesReply(migrated),
      [URL.forms('go', 'verb')]: () => Response.json({ forms: ['go', 'goes', 'going', 'went', 'gone'] }),
      [URL.example('e1')]: (call: Call) => Response.json({ ...migrated, ...(call.body as object) }),
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.editFor.replace('{summary}', 'go · verb') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.form.editTitle });
    expect(formsBox(dialog)).toHaveValue('');
    await userEvent.click(within(dialog).getByLabelText('word'));
    await userEvent.tab();
    await waitFor(() => expect(formsBox(dialog)).toHaveValue('go, goes, going, went, gone'));
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitSave }));
    await screen.findByText(t.toast.saved);
    expect(r.calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ expected: { forms: ['go', 'goes', 'going', 'went', 'gone'] } });
  });
});

describe('AiEvalPage held-out rows, reveal, freeze and versions (nhóm B M1)', () => {
  const MIXED = [evalExample('e1', 'go'), evalExample('e2', 'run'), evalExample('e3', 'come'), heldOutExample('e4'), heldOutExample('e5')];
  const mixedReply = () => Response.json({ items: MIXED });
  const SETS = 'GET /v1/admin/ai/eval/sets?operation=generate_cloze';
  const FREEZE = 'POST /v1/admin/ai/eval/sets';

  it('shows "3 dev · 2 held-out"; a held-out row hides its content and offers [Mở ví dụ held-out] and [Xóa], never [Sửa]', async () => {
    await openPage({ [URL.examples()]: mixedReply });
    expect(await screen.findByText('3 dev · 2 held-out')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: t.examples.replace('{count}', '5') })).toBeInTheDocument();
    expect(screen.getByText(t.examplesHint)).toBeInTheDocument();
    const section = screen.getByRole('region', { name: t.examples.replace('{count}', '5') });
    expect(within(section).getAllByRole('columnheader').map((h) => h.textContent)).toContain(t.cols.split);
    const rows = within(section).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    const heldOut = rows.filter((row) => within(row).queryByText(t.heldOutHidden));
    expect(heldOut).toHaveLength(2);
    for (const row of heldOut) {
      expect(row).toHaveTextContent(t.split.heldOut);
      expect(within(row).getByRole('button', { name: t.reveal.button })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: t.delete })).toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: /^Sửa/ })).not.toBeInTheDocument();
    }
    expect(rows.filter((row) => within(row).queryByRole('button', { name: /^Sửa ví dụ / }))).toHaveLength(3);
  });

  it('[Mở ví dụ held-out] asks first (Hủy sends nothing); [Mở ví dụ] POSTs /reveal, toasts and reads the examples again', async () => {
    let revealed = false;
    const r = await openPage({
      [URL.examples()]: () => Response.json({ items: revealed ? [...MIXED.slice(0, 3), evalExample('e4', 'rise'), MIXED[4]] : MIXED }),
      [URL.reveal('e4')]: () => {
        revealed = true;
        return Response.json({ id: 'e4', operation: 'generate_cloze', split: 'dev', input: {}, expected: null, note: null, revealed_at: '2026-10-15T02:12:00.000Z', deleted: false });
      },
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.reveal.button }))[0]);
    let dialog = await screen.findByRole('dialog', { name: t.reveal.title });
    expect(dialog).toHaveTextContent(t.reveal.body);
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(r.count('POST', '/v1/admin/ai/eval/examples/e4/reveal')).toBe(0);

    await userEvent.click((await screen.findAllByRole('button', { name: t.reveal.button }))[0]);
    dialog = await screen.findByRole('dialog', { name: t.reveal.title });
    await userEvent.click(within(dialog).getByRole('button', { name: t.reveal.confirm }));
    expect(await screen.findByText(t.toast.revealed)).toBeInTheDocument();
    expect(r.count('POST', '/v1/admin/ai/eval/examples/e4/reveal')).toBe(1);
    expect(await screen.findByText('4 dev · 1 held-out')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: t.editFor.replace('{summary}', 'rise · verb') }).length).toBeGreaterThan(0);
  });

  it('opening an example that is no longer held-out (409 example-not-held-out) says so inside the question and reads the list again', async () => {
    const r = await openPage({ [URL.examples()]: mixedReply, [URL.reveal('e4')]: () => problem(409, 'example-not-held-out') });
    await userEvent.click((await screen.findAllByRole('button', { name: t.reveal.button }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.reveal.title });
    await userEvent.click(within(dialog).getByRole('button', { name: t.reveal.confirm }));
    expect(await within(dialog).findByText(vi.errors['example-not-held-out'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/eval/examples?operation=generate_cloze')).toBeGreaterThanOrEqual(2));
  });

  it('[Xóa] on a held-out row asks and DELETEs it like any example', async () => {
    const r = await openPage({ [URL.examples()]: mixedReply, [URL.example('e4', 'DELETE')]: () => new Response(null, { status: 204 }) });
    const heldOutRow = (await screen.findAllByRole('row')).filter((row) => within(row).queryByText(t.heldOutHidden))[0];
    await userEvent.click(within(heldOutRow).getByRole('button', { name: t.delete }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: t.deleteTitle })).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText(t.toast.deleted)).toBeInTheDocument();
    expect(r.count('DELETE', '/v1/admin/ai/eval/examples/e4')).toBe(1);
  });

  // The button waits for the examples and the versions: the question names the next version and the counts.
  async function pressFreeze() {
    const button = (await screen.findAllByRole('button', { name: t.freeze.button }))[0];
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
  }

  const V1 = evalSet({ id: 'S1', version: 1, dev_count: 7, held_out_count: 3 });

  it('[Chốt phiên bản] names the next version and the counts; confirming POSTs the operation, toasts and reads the versions again', async () => {
    let sets = [V1];
    const r = await openPage({
      [URL.examples()]: mixedReply,
      [SETS]: () => Response.json({ items: sets }),
      [FREEZE]: () => {
        sets = [evalSet({ id: 'S2', version: 2, dev_count: 3, held_out_count: 2 }), V1];
        return Response.json(sets[0], { status: 201 });
      },
    });
    await screen.findByText('3 dev · 2 held-out');
    await pressFreeze();
    const dialog = await screen.findByRole('dialog', { name: t.freeze.title.replace('{version}', '2') });
    expect(dialog).toHaveTextContent(t.freeze.body.replace('{dev}', '3').replace('{heldOut}', '2').replace('{version}', '2'));
    await userEvent.click(within(dialog).getByRole('button', { name: t.freeze.confirm }));
    expect(await screen.findByText(t.toast.frozen.replace('{version}', '2'))).toBeInTheDocument();
    expect(posts(r.calls, '/v1/admin/ai/eval/sets')[0].body).toEqual({ operation: 'generate_cloze' });
    const versions = screen.getByRole('region', { name: t.sets.title });
    expect((await within(versions).findAllByRole('button', { name: t.sets.version.replace('{version}', '2') })).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/ai/eval/sets?operation=generate_cloze')).toBe(2);
  });

  it('with no version yet the first one is "Chốt phiên bản 1" and the list says "Chưa có phiên bản nào."', async () => {
    await openPage({ [URL.examples()]: mixedReply });
    expect(await screen.findByText(t.sets.empty)).toBeInTheDocument();
    await pressFreeze();
    expect(await screen.findByRole('dialog', { name: t.freeze.title.replace('{version}', '1') })).toBeInTheDocument();
  });

  it('422 eval-set-incomplete: "Chưa chốt được phiên bản." with how many examples lack an expected answer and that no held-out exists', async () => {
    await openPage({
      [URL.examples()]: mixedReply,
      [FREEZE]: () => problem(422, 'eval-set-incomplete', { missing_expected: ['e1'], no_held_out: true }),
    });
    await screen.findByText('3 dev · 2 held-out');
    await pressFreeze();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.freeze.confirm }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(t.freeze.incomplete);
    expect(within(alert).getByText(t.freeze.missingExpected.replace('{count}', '1'))).toBeInTheDocument();
    expect(within(alert).getByText(t.freeze.noHeldOut)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('422 with only missing expected answers names only that; the rows concerned are marked until they get one', async () => {
    const lacking = { ...evalExample('e1', 'go'), expected: null };
    await openPage({
      [URL.examples()]: () => Response.json({ items: [lacking, evalExample('e2', 'run'), heldOutExample('e4')] }),
      [FREEZE]: () => problem(422, 'eval-set-incomplete', { missing_expected: ['e1'], no_held_out: false }),
    });
    await screen.findByText('2 dev · 1 held-out');
    await pressFreeze();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.freeze.confirm }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(t.freeze.missingExpected.replace('{count}', '1'))).toBeInTheDocument();
    expect(within(alert).queryByText(t.freeze.noHeldOut)).not.toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.filter((row) => within(row).queryByText(t.freeze.rowMissing))).toHaveLength(1);
    expect(rows.find((row) => within(row).queryByText(t.freeze.rowMissing))).toHaveTextContent('go · verb');
  });

  it('409 eval-set-conflict: the conflict sentence, and the versions are read again', async () => {
    const r = await openPage({ [URL.examples()]: mixedReply, [FREEZE]: () => problem(409, 'eval-set-conflict') });
    await screen.findByText('3 dev · 2 held-out');
    await pressFreeze();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.freeze.confirm }));
    expect(await screen.findByText(vi.errors['eval-set-conflict'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/eval/sets?operation=generate_cloze')).toBe(2));
  });

  it('a version row: "Phiên bản 1", its counts and "1 ví dụ held-out đã bị xem"; a version nobody looked into has no such line', async () => {
    await openPage({
      [SETS]: () => Response.json({ items: [evalSet({ id: 'S2', version: 2, revealed_count: 0 }), evalSet({ id: 'S1', version: 1, revealed_count: 1 })] }),
    });
    const versions = await screen.findByRole('region', { name: t.sets.title });
    const [two, one] = (await within(versions).findAllByRole('row')).slice(1);
    expect(one).toHaveTextContent(t.sets.version.replace('{version}', '1'));
    expect(one).toHaveTextContent('7 dev · 3 held-out');
    expect(one).toHaveTextContent(t.sets.revealed.replace('{count}', '1'));
    expect(two).toHaveTextContent('7 dev · 3 held-out');
    expect(two).not.toHaveTextContent('đã bị xem');
  });

  it('a version opens its items: a deleted hidden held-out item can be opened from there, a seen one shows its input and "Đã bị xem"', async () => {
    let seen = false;
    const items = () => [
      setItem({ example_id: 'e1', position: 0 }),
      setItem({
        example_id: 'e9', position: 1, split: 'held_out', in_working_set: false, revealed_at: seen ? '2026-10-16T02:00:00.000Z' : null,
        input: seen ? example('fall').input : null, expected: seen ? { forms: ['fall'] } : null,
      }),
      setItem({ example_id: 'e8', position: 2, split: 'held_out', revealed_at: '2026-10-16T01:00:00.000Z', input: example('rise').input, expected: { forms: ['rise'] } }),
    ];
    const r = await openPage({
      [SETS]: () => Response.json({ items: [evalSet({ id: 'S1', version: 1, revealed_count: 1 })] }),
      [URL.set('S1')]: () => Response.json({ ...setDetail({ id: 'S1', version: 1, revealed_count: 1 }, items()) }),
      [URL.reveal('e9')]: () => {
        seen = true;
        return Response.json({ id: 'e9', operation: 'generate_cloze', split: 'dev', input: example('fall').input, expected: { forms: ['fall'] }, note: null, revealed_at: '2026-10-16T02:00:00.000Z', deleted: true });
      },
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.sets.version.replace('{version}', '1') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.sets.version.replace('{version}', '1') });
    const rows = await within(dialog).findAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('go · verb');
    expect(rows[1]).toHaveTextContent(t.heldOutHidden);
    expect(rows[1]).toHaveTextContent(t.sets.deleted);
    expect(rows[2]).toHaveTextContent('rise · verb');
    expect(rows[2]).toHaveTextContent(t.sets.seen);
    expect(rows[2]).not.toHaveTextContent(t.heldOutHidden);
    expect(within(rows[0]).queryByRole('button', { name: t.reveal.button })).not.toBeInTheDocument();
    expect(within(rows[2]).queryByRole('button', { name: t.reveal.button })).not.toBeInTheDocument();

    await userEvent.click(within(rows[1]).getByRole('button', { name: t.reveal.button }));
    const ask = await screen.findByRole('dialog', { name: t.reveal.title });
    await userEvent.click(within(ask).getByRole('button', { name: t.reveal.confirm }));
    expect(await screen.findByText(t.toast.revealedDeleted)).toBeInTheDocument();
    expect(r.count('POST', '/v1/admin/ai/eval/examples/e9/reveal')).toBe(1);
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')[1]).toHaveTextContent('fall · verb'));
    expect(within(dialog).getAllByRole('listitem')[1]).toHaveTextContent(t.sets.seen);
  });
});

describe('AiEvalPage runs (A/83)', () => {
  it('[Chạy bộ ví dụ] sends prompt "current" with an Idempotency-Key, opens the run and reads the quota again', async () => {
    const r = await openPage({
      [URL.examples()]: examplesReply(evalExample('e1', 'go')),
      [URL.startRun]: () => Response.json({ run_id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'queued' }, { status: 202 }),
      [URL.run()]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
    });
    expect(await screen.findByText(t.run.quota.replace('{remaining}', '17').replace('{limit}', '20'))).toBeInTheDocument();
    await userEvent.click(runButton());
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001'));
    const sent = posts(r.calls, '/v1/admin/ai/eval/runs');
    expect(sent[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current' });
    expect(sent[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/test-quota')).toBe(2));
  });

  it('a second run after the first one finished is a new submission (a new key)', async () => {
    let n = 0;
    const r = await openPage({
      [URL.examples()]: examplesReply(evalExample('e1', 'go')),
      [URL.startRun]: () => Response.json({ run_id: `aaaaaaaa-0000-4000-8000-00000000000${++n}`, status: 'queued' }, { status: 202 }),
      [URL.run()]: () => Response.json(evalRun()),
      [URL.run('aaaaaaaa-0000-4000-8000-000000000002')]: () => Response.json(evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000002' })),
    });
    await userEvent.click(runButton());
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001'));
    await userEvent.click(runButton());
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000002'));
    const keys = posts(r.calls, '/v1/admin/ai/eval/runs').map((c) => c.headers['Idempotency-Key']);
    expect(new Set(keys).size).toBe(2);
  });

  it('§6.5: 409 model-not-set → the copy and a link to Cấu hình of that operation', async () => {
    await openPage({ [URL.startRun]: () => problem(409, 'model-not-set') });
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.errors['model-not-set'])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: vi.ai.prompts.test.openConfigs })).toHaveAttribute('href', '/ai/configs?op=generate_cloze');
  });

  it('an empty set → "needs an example" copy', async () => {
    await openPage({ [URL.startRun]: () => problem(400, 'validation-failed', { violations: ['examples: at least one example is needed'] }) });
    await userEvent.click(runButton());
    expect(await screen.findByText(t.run.needExample)).toBeInTheDocument();
  });

  it('§6.5: a network error on [Chạy bộ ví dụ], then [Thử lại], sends the same Idempotency-Key', async () => {
    let n = 0;
    const r = await openPage({
      [URL.startRun]: () => {
        n += 1;
        if (n === 1) throw new TypeError('Failed to fetch');
        return Response.json({ run_id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'queued' }, { status: 202 });
      },
      [URL.run()]: () => Response.json(evalRun()),
    });
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.offline.message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.common.retry }));
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval/runs/aaaaaaaa-0000-4000-8000-000000000001'));
    const keys = posts(r.calls, '/v1/admin/ai/eval/runs').map((c) => c.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('a network error, then another operation: [Thử lại] is gone (it would send the old operation)', async () => {
    await openPage({
      [URL.startRun]: () => {
        throw new TypeError('Failed to fetch');
      },
      [URL.examples('lookup_word')]: () => Response.json({ items: [] }),
      [URL.runs('lookup_word')]: () => Response.json({ items: [], next_page_token: null }),
      [URL.sets('lookup_word')]: () => Response.json({ items: [] }),
    });
    await userEvent.click(runButton());
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`${t.operation}$`) }));
    await userEvent.click(await screen.findByRole('option', { name: /lookup_word/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: vi.common.retry })).not.toBeInTheDocument());
  });

  it('lists the runs: status, progress, valid, prompt revision ("Bản nháp" for a draft) and who started it', async () => {
    await openPage({
      [URL.runs()]: () => Response.json({
        items: [
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000002', prompt_revision: null, status: 'running', done: 12 }),
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000001', started_by_user: { id: 'u8', email: 'minh@wordmet.com', system: false } }),
        ],
        next_page_token: null,
      }),
    });
    const section = await screen.findByRole('region', { name: t.runs.title });
    await within(section).findAllByText(t.detail.draft);
    const rows = within(section).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(t.status.running);
    expect(rows[0]).toHaveTextContent('12/20');
    expect(rows[0]).toHaveTextContent(t.detail.draft);
    expect(rows[1]).toHaveTextContent(t.status.finished);
    expect(rows[1]).toHaveTextContent(t.detail.revision.replace('{revision}', '3'));
    expect(rows[1]).toHaveTextContent('minh@wordmet.com');
  });

  it('a stopped run (failed, error "cancelled") reads "Đã dừng" in the list; a run that really failed keeps "Lỗi"', async () => {
    await openPage({
      [URL.runs()]: () => Response.json({
        items: [
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000002', status: 'failed', error: 'cancelled' }),
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'failed', error: 'stalled' }),
        ],
        next_page_token: null,
      }),
    });
    const section = await screen.findByRole('region', { name: t.runs.title });
    const rows = await within(section).findAllByRole('row');
    expect(rows[1]).toHaveTextContent(t.status.cancelled);
    expect(rows[1]).not.toHaveTextContent(t.status.failed);
    expect(rows[2]).toHaveTextContent(t.status.failed);
    expect(rows[2]).not.toHaveTextContent(t.status.cancelled);
  });
});

describe('AiEvalPage runs on a version (nhóm B M1)', () => {
  const S1 = evalSet({ id: 'S1', version: 1 });
  const S2 = evalSet({ id: 'S2', version: 2 });
  const START = { run_id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'queued' };
  const setSelect = () => screen.getByRole('button', { name: new RegExp(`${t.set.label}$`) });
  const versionsReply = () => Response.json({ items: [S2, S1] });
  const startRoute = () => ({
    [URL.startRun]: () => Response.json(START, { status: 202 }),
    [URL.run()]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
  });

  it('the run select defaults to the newest version and [Chạy bộ ví dụ] sends its set_id', async () => {
    const r = await openPage({ [URL.sets()]: versionsReply, ...startRoute() });
    await waitFor(() => expect(setSelect()).toHaveTextContent(t.set.version.replace('{version}', '2')));
    await userEvent.click(runButton());
    await waitFor(() => expect(r.router.state.location.pathname).toBe(`/ai/eval/runs/${START.run_id}`));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current', set_id: 'S2' });
  });

  it('an older version can be chosen; its id is sent', async () => {
    const r = await openPage({ [URL.sets()]: versionsReply, ...startRoute() });
    await waitFor(() => expect(setSelect()).toHaveTextContent(t.set.version.replace('{version}', '2')));
    await userEvent.click(setSelect());
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      t.set.version.replace('{version}', '2'), t.set.version.replace('{version}', '1'), t.set.working,
    ]);
    await userEvent.click(screen.getByRole('option', { name: t.set.version.replace('{version}', '1') }));
    await userEvent.click(runButton());
    await waitFor(() => expect(posts(r.calls, '/v1/admin/ai/eval/runs')).toHaveLength(1));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current', set_id: 'S1' });
  });

  it('"Bộ đang soạn (chỉ để thử nhanh, không so được)" runs the working set: no set_id', async () => {
    const r = await openPage({ [URL.sets()]: versionsReply, ...startRoute() });
    await waitFor(() => expect(setSelect()).toHaveTextContent(t.set.version.replace('{version}', '2')));
    await userEvent.click(setSelect());
    await userEvent.click(await screen.findByRole('option', { name: t.set.working }));
    await userEvent.click(runButton());
    await waitFor(() => expect(posts(r.calls, '/v1/admin/ai/eval/runs')).toHaveLength(1));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current' });
  });

  it('with no version the select offers only the working set, and the run goes without set_id', async () => {
    const r = await openPage(startRoute());
    expect(setSelect()).toHaveTextContent(t.set.working);
    await userEvent.click(runButton());
    await waitFor(() => expect(posts(r.calls, '/v1/admin/ai/eval/runs')).toHaveLength(1));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current' });
  });

  it('the run button waits for the versions, so a run never starts on the working set by mistake', async () => {
    let release: () => void = () => {};
    renderApp('/ai/eval', evalRoutes({
      [URL.sets()]: () => new Promise<Response>((resolve) => {
        release = () => resolve(versionsReply());
      }),
    }));
    const button = await screen.findByRole('button', { name: t.run.start });
    expect(button).toBeDisabled();
    release();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('after a network error, choosing another version takes [Thử lại] away (it would send the old one)', async () => {
    await openPage({
      [URL.sets()]: versionsReply,
      [URL.startRun]: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await waitFor(() => expect(setSelect()).toHaveTextContent(t.set.version.replace('{version}', '2')));
    await userEvent.click(runButton());
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    await userEvent.click(setSelect());
    await userEvent.click(await screen.findByRole('option', { name: t.set.version.replace('{version}', '1') }));
    await waitFor(() => expect(screen.queryByRole('button', { name: vi.common.retry })).not.toBeInTheDocument());
  });

  it('the runs list names the version of each run: "Phiên bản 1", "Bộ đang soạn", "Trước khi có phiên bản"', async () => {
    await openPage({
      [URL.runs()]: () => Response.json({
        items: [
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000003', set_id: 'S1', set_version: 1 }),
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000002' }),
          evalRun({ id: 'aaaaaaaa-0000-4000-8000-000000000001', legacy: true }),
        ],
        next_page_token: null,
      }),
    });
    const section = await screen.findByRole('region', { name: t.runs.title });
    const headers = await within(section).findAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toContain(t.runs.cols.set);
    const rows = within(section).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(t.set.version.replace('{version}', '1'));
    expect(rows[1]).toHaveTextContent(t.set.workingShort);
    expect(rows[2]).toHaveTextContent(t.set.legacy);
  });
});

describe('AiEvalPage runs with a judge (nhóm B M3-T16)', () => {
  const START = { run_id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'queued' };
  const startRoute = () => ({
    [URL.startRun]: () => Response.json({ ...START, judge_pass_id: 'P1' }, { status: 202 }),
    [URL.run()]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
  });
  const judges = (...items: ReturnType<typeof judgeView>[]) => ({ [URL.judges]: () => Response.json({ items }) });
  const tick = () => screen.getByRole('checkbox', { name: t.run.judge });
  const judgeSelect = () => screen.getByRole('button', { name: /Judge$/ });

  it('a judge that scores this operation: ticking "Chấm bằng judge" and picking it posts the run with judge_id', async () => {
    const r = await openPage({ ...judges(judgeOnFake()), ...startRoute() });
    expect(screen.queryByRole('button', { name: /Judge$/ })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('checkbox', { name: t.run.judge }));
    await userEvent.click(judgeSelect());
    await userEvent.click(await screen.findByRole('option', { name: 'Chỉ một đáp án' }));
    await userEvent.click(runButton());
    await waitFor(() => expect(posts(r.calls, '/v1/admin/ai/eval/runs')).toHaveLength(1));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current', judge_id: 'J1' });
  });

  it('not ticked: the run goes without a judge', async () => {
    const r = await openPage({ ...judges(judgeOnFake()), ...startRoute() });
    expect(await screen.findByRole('checkbox', { name: t.run.judge })).not.toBeChecked();
    await userEvent.click(runButton());
    await waitFor(() => expect(posts(r.calls, '/v1/admin/ai/eval/runs')).toHaveLength(1));
    expect(posts(r.calls, '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', prompt: 'current' });
  });

  it('a judge with no model is listed disabled "(chưa chọn model)"; with nothing else to pick the run button stays off while ticked', async () => {
    await openPage({ ...judges(judgeView()), ...startRoute() });
    await userEvent.click(await screen.findByRole('checkbox', { name: t.run.judge }));
    expect(runButton()).toBeDisabled();
    await userEvent.click(judgeSelect());
    expect(await screen.findByRole('option', { name: 'Chỉ một đáp án (chưa chọn model)' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(tick());
    expect(runButton()).toBeEnabled();
  });

  it('only active judges that score the operation are offered; with none, the page has no judge box at all', async () => {
    await openPage({
      ...judges(
        judgeOnFake({ active: false }), judgeOnFake({ id: 'J2', name: 'Chỉ tra từ', operations: ['lookup_word'] }),
      ),
      ...startRoute(),
    });
    await screen.findByRole('button', { name: t.run.start });
    expect(screen.queryByRole('checkbox', { name: t.run.judge })).not.toBeInTheDocument();
  });

  it('a failed list of judges is not an error of the page: the run goes on without the judge box', async () => {
    await openPage({ [URL.judges]: () => problem(500, 'internal-error'), ...startRoute() });
    expect(runButton()).toBeEnabled();
    expect(screen.queryByRole('checkbox', { name: t.run.judge })).not.toBeInTheDocument();
  });

  it.each(['admin-usd-cap', 'model-price-missing', 'judge-pass-running'])('409 %s when starting a run with a judge reads its own sentence', async (slug) => {
    await openPage({ ...judges(judgeOnFake()), [URL.startRun]: () => problem(409, slug) });
    await userEvent.click(await screen.findByRole('checkbox', { name: t.run.judge }));
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.errors[slug as 'admin-usd-cap'])).toBeInTheDocument();
  });
});
