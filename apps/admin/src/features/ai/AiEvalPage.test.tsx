import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { URL, evalExample, evalRoutes, evalRun } from './prompt-test-support';

const t = vi.ai.eval;
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);
const examplesReply = (...items: ReturnType<typeof evalExample>[]) => () => Response.json({ items });
const runButton = () => screen.getByRole('button', { name: t.run.start });

async function openPage(over = {}, path = '/ai/eval') {
  const r = renderApp(path, evalRoutes(over));
  await screen.findByRole('button', { name: t.run.start });
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
      'example-input-word', 'example-input-part_of_speech', 'example-input-level', 'example-input-meaning_vi', 'example-input-context_label', 'example-note',
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
    expect(patch?.body).toEqual({ input: { word: 'went', part_of_speech: 'verb', level: 'A1', meaning_vi: 'đi', context_label: null }, note: null });
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

  it('§6.5: 409 model-not-set → the Prompt copy and a link to Thao tác', async () => {
    await openPage({ [URL.startRun]: () => problem(409, 'model-not-set') });
    await userEvent.click(runButton());
    expect(await screen.findByText(vi.errors['model-not-set'])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: vi.ai.prompts.test.openOperations })).toHaveAttribute('href', '/ai/operations');
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
