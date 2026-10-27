import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, tokenResponse } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { GUARD, URL, evalRoutes, evalRun, example, promptRoutes, promptView } from './prompt-test-support';

const t = vi.ai.prompts;
const DRAFT_KEY = 'wordmet-admin.draft.me-1.ai-prompt:generate_cloze';
const instructions = () => screen.getByLabelText(t.instructions);
const saveButton = () => screen.getByRole('button', { name: t.save });
const puts = (calls: { method: string; body: unknown }[]) => calls.filter((c) => c.method === 'PUT');

async function openPage(routes = promptRoutes(), path = '/ai/prompts') {
  const r = renderApp(path, routes);
  await screen.findByLabelText(t.instructions);
  return r;
}

async function retype(text: string) {
  await userEvent.clear(instructions());
  await userEvent.click(instructions());
  await userEvent.paste(text);
}

beforeEach(() => sessionStorage.clear());

describe('AiPromptsPage (A/82)', () => {
  it('shows the instructions, the input fields, the read-only guard, the revision and its author ("Hệ thống" for the seed)', async () => {
    await openPage();
    expect(instructions()).toHaveValue('Write one short sentence.');
    expect(screen.getByText(t.inputFields.replace('{fields}', 'word, part_of_speech, level, meaning_vi, context_label'))).toBeInTheDocument();
    expect(screen.getByText(GUARD)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: t.guard })).not.toBeInTheDocument();
    expect(screen.getByText(t.revision.replace('{revision}', '3'))).toBeInTheDocument();
    expect(screen.getByText(t.updated.replace('{at}', '15/10/2026 09:12').replace('{by}', vi.common.system))).toBeInTheDocument();
    const first = screen.getByRole('group', { name: t.example.replace('{n}', '1') });
    expect(within(first).getByLabelText('word')).toHaveValue('go');
    expect(within(first).getByLabelText('context_label')).toHaveValue('');
    expect(saveButton()).toBeDisabled();
  });

  it('the operation picker lives in the URL: ?op=lookup_word loads that prompt; a bad op falls back to generate_cloze', async () => {
    const r = await openPage({ ...promptRoutes(), ...promptRoutes({}, 'lookup_word') }, '/ai/prompts?op=lookup_word');
    expect(r.count('GET', '/v1/admin/ai/prompts/lookup_word')).toBe(1);
    cleanup();
    const r2 = await openPage(promptRoutes(), '/ai/prompts?op=nope');
    expect(r2.count('GET', '/v1/admin/ai/prompts/generate_cloze')).toBe(1);
  });

  it('[Lưu] PUTs the text and examples with expected_revision, toasts, clears the kept draft and the page is clean', async () => {
    const r = await openPage(promptRoutes({
      [URL.save()]: (call) => Response.json(promptView({ ...(call.body as object), revision: 4 })),
    }));
    await retype('Write two short sentences.');
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    await userEvent.click(saveButton());
    expect(await screen.findByText(t.saved.replace('{revision}', '4'))).toBeInTheDocument();
    expect(puts(r.calls)[0].body).toEqual({ expected_revision: 3, instructions: 'Write two short sentences.', examples: [example()] });
    expect(screen.getByText(t.revision.replace('{revision}', '4'))).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('§6.4: over 8.000 characters the counter turns red and [Lưu] still works; the API 400 lands on the field, which gets focus', async () => {
    await openPage(promptRoutes({
      [URL.save()]: () => problem(400, 'validation-failed', { violations: ['instructions: Expected at most 8000 characters'] }),
    }));
    await retype('a'.repeat(8001));
    expect(screen.getByText('8.001/8.000')).toHaveAttribute('data-over');
    expect(saveButton()).toBeEnabled();
    await userEvent.click(saveButton());
    expect(await screen.findByText(t.errors.tooLong)).toBeInTheDocument();
    await waitFor(() => expect(instructions()).toHaveFocus());
    expect(instructions()).toHaveAttribute('aria-invalid', 'true');
  });

  it('an output that is not a JSON object is flagged on its box and nothing is sent', async () => {
    const r = await openPage();
    const first = screen.getByRole('group', { name: t.example.replace('{n}', '1') });
    const output = within(first).getByLabelText(t.output);
    await userEvent.clear(output);
    await userEvent.click(output);
    await userEvent.paste('{oops');
    await userEvent.click(saveButton());
    expect(await within(first).findByText(t.errors.outputJson)).toBeInTheDocument();
    expect(puts(r.calls)).toHaveLength(0);
  });

  it('[Thêm ví dụ] adds an empty pair with a box per input field; up to 10; [Xóa ví dụ] removes one', async () => {
    await openPage();
    await userEvent.click(screen.getByRole('button', { name: t.addExample }));
    const second = screen.getByRole('group', { name: t.example.replace('{n}', '2') });
    expect(within(second).getAllByRole('textbox').map((box) => box.getAttribute('id'))).toEqual([
      'example-1-input-word', 'example-1-input-part_of_speech', 'example-1-input-level', 'example-1-input-meaning_vi',
      'example-1-input-context_label', 'example-1-output',
    ]);
    for (let i = 0; i < 8; i += 1) await userEvent.click(screen.getByRole('button', { name: t.addExample }));
    expect(screen.getByRole('button', { name: t.addExample })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t.removeExample.replace('{n}', '10') }));
    expect(screen.getByRole('button', { name: t.addExample })).toBeEnabled();
    expect(saveButton()).toBeEnabled();
  });

  it('§6.4: 409 prompt-revision-conflict keeps the text, [Lưu] waits for [Tải bản mới], which shows the newer revision beside it', async () => {
    const newer = promptView({ instructions: 'Someone else wrote this.', revision: 4 });
    let current = promptView();
    const r = await openPage(promptRoutes({
      [URL.prompt()]: () => Response.json(current),
      [URL.save()]: (call) => {
        if ((call.body as { expected_revision: number }).expected_revision === 3) {
          current = newer;
          return problem(409, 'prompt-revision-conflict');
        }
        return Response.json(promptView({ ...(call.body as object), revision: 5 }));
      },
    }));
    await retype('My own text.');
    await userEvent.click(saveButton());
    expect(await screen.findByText(vi.errors['prompt-revision-conflict'])).toBeInTheDocument();
    expect(instructions()).toHaveValue('My own text.');
    expect(saveButton()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: t.loadNewer }));
    const beside = screen.getByRole('region', { name: t.newerTitle.replace('{revision}', '4') });
    expect(within(beside).getByText('Someone else wrote this.')).toBeInTheDocument();
    expect(instructions()).toHaveValue('My own text.');
    await userEvent.click(saveButton());
    expect(await screen.findByText(t.saved.replace('{revision}', '5'))).toBeInTheDocument();
    expect(puts(r.calls).map((c) => (c.body as { expected_revision: number }).expected_revision)).toEqual([3, 4]);
  });

  it('a 409 re-reads the prompt and the revision list too, so the history shows the newer revision', async () => {
    let current = promptView();
    const r = await openPage(promptRoutes({
      [URL.prompt()]: () => Response.json(current),
      [URL.save()]: () => {
        current = promptView({ instructions: 'Someone else wrote this.', revision: 4 });
        return problem(409, 'prompt-revision-conflict');
      },
    }));
    await retype('My own text.');
    expect(r.count('GET', '/v1/admin/ai/prompts/generate_cloze/revisions?page_size=20')).toBe(1);
    await userEvent.click(saveButton());
    await screen.findByText(vi.errors['prompt-revision-conflict']);
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/prompts/generate_cloze/revisions?page_size=20')).toBe(2));
  });

  it('a 409 whose re-read fails keeps the editor and the text, with [Lưu] off and [Tải bản mới] offered', async () => {
    let reads = 0;
    await openPage(promptRoutes({
      [URL.prompt()]: () => {
        reads += 1;
        return reads === 1 ? Response.json(promptView()) : problem(500, 'internal-error');
      },
      [URL.save()]: () => problem(409, 'prompt-revision-conflict'),
    }));
    await retype('My own text.');
    await userEvent.click(saveButton());
    expect(await screen.findByText(vi.errors['prompt-revision-conflict'])).toBeInTheDocument();
    expect(instructions()).toHaveValue('My own text.');
    expect(saveButton()).toBeDisabled();
  });

  it('removing an example clears the field errors, so a later example does not inherit them', async () => {
    const two = promptView({ examples: [example('go'), example('see')] });
    await openPage(promptRoutes({ [URL.prompt()]: () => Response.json(two) }));
    const outputOf = (n: number) => within(screen.getByRole('group', { name: t.example.replace('{n}', String(n)) })).getByLabelText(t.output);
    await userEvent.clear(outputOf(1));
    await userEvent.click(outputOf(1));
    await userEvent.paste('not json');
    await userEvent.click(saveButton());
    expect(await screen.findByText(t.errors.outputJson)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.removeExample.replace('{n}', '1') }));
    expect(screen.queryByText(t.errors.outputJson)).not.toBeInTheDocument();
    expect(outputOf(1)).toBeValid();
  });

  it('while a save is pending the instructions and the examples cannot be edited', async () => {
    let release: () => void = () => {};
    await openPage(promptRoutes({
      [URL.save()]: (call) => new Promise<Response>((resolve) => {
        release = () => resolve(Response.json(promptView({ ...(call.body as object), revision: 4 })));
      }),
    }));
    await retype('Changed.');
    await userEvent.click(saveButton());
    await waitFor(() => expect(instructions()).toBeDisabled());
    expect(screen.getByRole('button', { name: t.addExample })).toBeDisabled();
    release();
    await screen.findByText(t.saved.replace('{revision}', '4'));
    expect(instructions()).toBeEnabled();
  });

  it('§4.6 / Review Focus 2: a 409 after our own lost save, where the newer revision equals the screen, says "Đã lưu"', async () => {
    let current = promptView();
    await openPage(promptRoutes({
      [URL.prompt()]: () => Response.json(current),
      [URL.save()]: (call) => {
        const body = call.body as { instructions: string; examples: unknown[] };
        // The first request landed (jsonb reorders keys); its reply was lost and the resend hit the conflict.
        current = promptView({ instructions: body.instructions, examples: [{ output: example().output, input: example().input }], revision: 4 });
        return problem(409, 'prompt-revision-conflict');
      },
    }));
    await retype('Saved by me.');
    await userEvent.click(saveButton());
    expect(await screen.findByText(t.saved.replace('{revision}', '4'))).toBeInTheDocument();
    expect(screen.queryByText(vi.errors['prompt-revision-conflict'])).not.toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });

  it('§6.4: a dirty prompt and a menu link ask "Rời trang?"; [Rời trang] drops the kept draft; switching the operation does not ask', async () => {
    const r = await openPage({
      ...promptRoutes(), ...promptRoutes({}, 'lookup_word'),
      'GET /v1/admin/ai/status': () => Response.json({
        operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0 }, ai_enabled: true,
        providers: { openai: true, anthropic: false, fake: false },
      }),
    });
    await retype('Unsaved.');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`${t.operation}$`) }));
    await userEvent.click(await screen.findByRole('option', { name: new RegExp('lookup_word') }));
    await waitFor(() => expect(r.router.state.location.search).toBe('?op=lookup_word'));
    expect(screen.queryByText(vi.leave.title)).not.toBeInTheDocument();
    await waitFor(() => expect(instructions()).toHaveValue('Write one short sentence.'));

    await retype('Unsaved lookup.');
    await userEvent.click(screen.getAllByRole('link', { name: vi.nav.aiStatus })[0]);
    expect(await screen.findByText(vi.leave.title)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.leave.leave }));
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/status'));
    expect(sessionStorage.getItem('wordmet-admin.draft.me-1.ai-prompt:lookup_word')).toBeNull();
  });

  it('§4.6: the session ends mid-edit → /login; signing in again comes back and [Khôi phục] puts the text back', async () => {
    const r = await openPage(promptRoutes({
      'POST /v1/auth/logout': () => new Response(null, { status: 204 }),
      'POST /v1/auth/login': () => tokenResponse('tok-2'),
    }));
    await retype('Kept through sign-out.');
    await act(async () => {
      await r.store.logout('expired');
    });
    await screen.findByRole('heading', { name: vi.account.login.title });
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)!)).toMatchObject({ instructions: 'Kept through sign-out.' });

    await userEvent.type(screen.getByLabelText(vi.account.login.email), 'admin@wordmet.com');
    await userEvent.type(screen.getByLabelText(vi.account.login.password), 'pw');
    await userEvent.click(screen.getByRole('button', { name: vi.account.login.submit }));
    await screen.findByLabelText(t.instructions, {}, { timeout: 5000 });
    expect(instructions()).toHaveValue('Write one short sentence.');
    expect(screen.getByText(vi.draft.message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.draft.restore }));
    expect(instructions()).toHaveValue('Kept through sign-out.');
    expect(screen.queryByText(vi.draft.message)).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('switching operation with unsaved text keeps it for that operation only: back on it, the restore banner offers it', async () => {
    const r = await openPage({ ...promptRoutes(), ...promptRoutes({}, 'lookup_word') });
    await retype('Half done.');
    const pickOp = async (op: string) => {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`${t.operation}$`) }));
      await userEvent.click(await screen.findByRole('option', { name: new RegExp(op) }));
    };
    await pickOp('lookup_word');
    await waitFor(() => expect(r.router.state.location.search).toBe('?op=lookup_word'));
    await waitFor(() => expect(instructions()).toHaveValue('Write one short sentence.'));
    expect(screen.queryByText(vi.draft.message)).not.toBeInTheDocument();
    await pickOp('generate_cloze');
    await waitFor(() => expect(r.router.state.location.search).toBe(''));
    expect(await screen.findByText(vi.draft.message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.draft.restore }));
    expect(instructions()).toHaveValue('Half done.');
  });

  it('a kept draft of the wrong shape (an older build) is not offered', async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ text: 'old shape' }));
    await openPage();
    expect(screen.queryByText(vi.draft.message)).not.toBeInTheDocument();
  });

  it('[Bỏ] on the restore banner drops the kept draft', async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ instructions: 'Old draft.', examples: [] }));
    await openPage();
    await userEvent.click(screen.getByRole('button', { name: vi.draft.discard }));
    expect(screen.queryByText(vi.draft.message)).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(instructions()).toHaveValue('Write one short sentence.');
  });

  it('a 403 shows the forbidden text', async () => {
    renderApp('/ai/prompts', promptRoutes({ [URL.prompt()]: () => problem(403, 'forbidden') }));
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});

describe('AiPromptsPage [Chạy bộ ví dụ với bản này] (A/82 → A/83)', () => {
  const evalButton = () => screen.getByRole('button', { name: vi.ai.eval.fromPrompt.button });
  const runRoutes = () => ({
    ...evalRoutes(),
    ...promptRoutes(),
    [URL.startRun]: () => Response.json({ run_id: 'r1', status: 'queued' }, { status: 202 }),
    [URL.run()]: () => Response.json(evalRun({ prompt_revision: null })),
  });

  it('a clean prompt: sends the editor content as the draft with an Idempotency-Key and opens the run without asking "Rời trang?"', async () => {
    const r = await openPage(runRoutes());
    await userEvent.click(evalButton());
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/eval/runs/r1'));
    expect(screen.queryByText(vi.leave.title)).not.toBeInTheDocument();
    const sent = r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/runs');
    expect(sent[0].body).toEqual({ operation: 'generate_cloze', prompt: { instructions: 'Write one short sentence.', examples: [example()] } });
    expect(sent[0].headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/test-quota')).toBeGreaterThanOrEqual(2));
  });

  it('an unsaved prompt: the run uses the unsaved text, and leaving asks "Rời trang?"; [Ở lại] keeps the text and links the run', async () => {
    const r = await openPage(runRoutes());
    await retype('Unsaved draft text.');
    await userEvent.click(evalButton());
    expect(await screen.findByText(vi.leave.title)).toBeInTheDocument();
    const sent = r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/runs');
    expect((sent[0].body as { prompt: { instructions: string } }).prompt.instructions).toBe('Unsaved draft text.');
    await userEvent.click(screen.getByRole('button', { name: vi.leave.stay }));
    expect(instructions()).toHaveValue('Unsaved draft text.');
    expect(screen.getByRole('link', { name: vi.ai.eval.fromPrompt.open })).toHaveAttribute('href', '/ai/eval/runs/r1?op=generate_cloze');
  });

  it('a network error, then an edit: [Thử lại] is gone and the next press sends the new text with a new key', async () => {
    let n = 0;
    const r = await openPage({
      ...runRoutes(),
      [URL.startRun]: () => {
        n += 1;
        if (n === 1) throw new TypeError('Failed to fetch');
        return Response.json({ run_id: 'r1', status: 'queued' }, { status: 202 });
      },
    });
    await userEvent.click(evalButton());
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    await retype('Edited after the error.');
    expect(screen.queryByRole('button', { name: vi.common.retry })).not.toBeInTheDocument();
    await userEvent.click(evalButton());
    await screen.findByText(vi.leave.title);
    const sent = r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/ai/eval/runs');
    expect(sent).toHaveLength(2);
    expect((sent[1].body as { prompt: { instructions: string } }).prompt.instructions).toBe('Edited after the error.');
    expect(sent[1].headers['Idempotency-Key']).not.toBe(sent[0].headers['Idempotency-Key']);
  });

  it('409 model-not-set → the copy and a link to Thao tác; nothing navigates', async () => {
    const r = await openPage({ ...runRoutes(), [URL.startRun]: () => problem(409, 'model-not-set') });
    await userEvent.click(evalButton());
    expect(await screen.findByText(vi.errors['model-not-set'])).toBeInTheDocument();
    expect(r.router.state.location.pathname).toBe('/ai/prompts');
  });
});
