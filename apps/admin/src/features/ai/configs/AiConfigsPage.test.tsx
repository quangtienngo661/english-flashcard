import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { makeMe, problem } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import type { ConfigsView, SaveDraftBody } from '../ai-api';
import { example, evalRun, succeeded } from '../prompt-test-support';
import { FAKE_OK, RUN_ID, URL, configRoutes, configView, configsView, draftView, modelRow } from './config-test-support';

const t = vi.ai.configs;
const PATH = '/ai/configs';
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});
const instructions = () => screen.getByLabelText(vi.ai.prompts.instructions);
const button = (name: string) => screen.getByRole('button', { name });
const live = (over: Partial<ConfigsView> = {}) => () => Response.json(configsView(over));
const withDraft = (draft = draftView(), over: Partial<ConfigsView> = {}) => live({ draft, ...over });
const calls = (all: { method: string; path: string; body: unknown; headers: Record<string, string> }[], method: string, suffix: string) =>
  all.filter((c) => c.method === method && c.path.endsWith(suffix));

async function openPage(routes = configRoutes(), path = PATH) {
  const r = renderApp(path, routes);
  await screen.findByRole('heading', { name: /^Bản đang chạy/ });
  return r;
}

async function retype(text: string) {
  await userEvent.clear(instructions());
  await userEvent.click(instructions());
  await userEvent.paste(text);
}

beforeEach(() => sessionStorage.clear());

describe('AiConfigsPage: the live config and creating a draft (M2-T6)', () => {
  it('shows the live config with its model; [Tạo nháp] posts {} and opens the draft "Nháp · cấu hình 4 · lần sửa 0"', async () => {
    let created = false;
    const r = await openPage(configRoutes({
      [URL.configs()]: () => Response.json(configsView({ draft: created ? draftView() : null })),
      [URL.createDraft()]: () => {
        created = true;
        return Response.json(draftView(), { status: 201 });
      },
    }));
    expect(screen.getByRole('heading', { name: t.live.title.replace('{number}', '3') })).toBeInTheDocument();
    expect(screen.getByText('Fake · fake:ok')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Nháp ·/ })).not.toBeInTheDocument();
    await userEvent.click(button(t.draft.create));
    expect(await screen.findByRole('heading', { name: t.draft.title.replace('{number}', '4').replace('{version}', '0') })).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/configs/generate_cloze/draft').map((c) => c.body)).toEqual([{}]);
    expect(screen.queryByRole('button', { name: t.draft.create })).not.toBeInTheDocument();
  });

  it('a live config without a model says the operation is off', async () => {
    await openPage(configRoutes({ [URL.configs()]: live({ live: configView({ model: null }) }) }));
    expect(screen.getByText(t.live.noModel)).toBeInTheDocument();
  });

  it('?op= picks the operation; a bad op falls back to generate_cloze', async () => {
    const r = await openPage({ ...configRoutes(), ...configRoutes({}, 'lookup_word') }, `${PATH}?op=lookup_word`);
    expect(r.count('GET', '/v1/admin/ai/configs/lookup_word')).toBe(1);
    cleanup();
    const r2 = await openPage(configRoutes(), `${PATH}?op=nope`);
    expect(r2.count('GET', '/v1/admin/ai/configs/generate_cloze')).toBe(1);
  });

  it('an editor gets the API 403 and the page shows the forbidden banner', async () => {
    renderApp(PATH, configRoutes({ [URL.configs()]: () => problem(403, 'forbidden') }), EDITOR);
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });

  it('409 draft-exists reads the configs again, so the draft somebody else made appears', async () => {
    let theirs = false;
    await openPage(configRoutes({
      [URL.configs()]: () => Response.json(configsView({ draft: theirs ? draftView() : null })),
      [URL.createDraft()]: () => {
        theirs = true;
        return problem(409, 'draft-exists');
      },
    }));
    await userEvent.click(button(t.draft.create));
    expect(await screen.findByRole('heading', { name: /^Nháp · cấu hình 4/ })).toBeInTheDocument();
    expect(screen.getByText(vi.errors['draft-exists'])).toBeInTheDocument();
  });
});

describe('AiConfigsPage: editing and saving the draft (M2-T6)', () => {
  it('[Lưu nháp] PUTs everything with expected_version, toasts "lần sửa 1" and leaves the form clean', async () => {
    const r = await openPage(configRoutes({
      [URL.configs()]: withDraft(),
      [URL.saveDraft()]: (call) => Response.json(draftView({ ...(call.body as Partial<SaveDraftBody>), version: 1, model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' } } as never)),
    }));
    expect(button(t.draft.save)).toBeDisabled();
    await retype('Write two short sentences.');
    expect(button(t.draft.save)).toBeEnabled();
    await userEvent.click(button(t.draft.save));
    expect(await screen.findByText(t.draft.saved.replace('{version}', '1'))).toBeInTheDocument();
    expect(calls(r.calls, 'PUT', '/draft')[0]!.body).toEqual({
      expected_version: 0, instructions: 'Write two short sentences.', examples: [example()], model_ref: 'M1', effort: null, thinking: null,
      max_output_tokens: null, note: null,
    });
    expect(screen.getByRole('heading', { name: t.draft.title.replace('{number}', '4').replace('{version}', '1') })).toBeInTheDocument();
    await waitFor(() => expect(button(t.draft.save)).toBeDisabled());
  });

  it('the note and the token limit are sent as typed; an empty note is null', async () => {
    const r = await openPage(configRoutes({ [URL.configs()]: withDraft(), [URL.saveDraft()]: () => Response.json(draftView({ version: 1 })) }));
    await userEvent.type(screen.getByLabelText(t.draft.note), 'thử model mới');
    await userEvent.type(screen.getByLabelText(vi.ai.operations.row.maxTokens), '1200');
    await userEvent.click(button(t.draft.save));
    await screen.findByText(t.draft.saved.replace('{version}', '1'));
    expect(calls(r.calls, 'PUT', '/draft')[0]!.body).toMatchObject({ note: 'thử model mới', max_output_tokens: 1200 });
  });

  it('an output that is not a JSON object is flagged on its box and nothing is sent', async () => {
    const r = await openPage(configRoutes({ [URL.configs()]: withDraft() }));
    const first = screen.getByRole('group', { name: vi.ai.prompts.example.replace('{n}', '1') });
    const output = within(first).getByLabelText(vi.ai.prompts.output);
    await userEvent.clear(output);
    await userEvent.click(output);
    await userEvent.paste('{oops');
    await userEvent.click(button(t.draft.save));
    expect(await within(first).findByText(vi.ai.prompts.errors.outputJson)).toBeInTheDocument();
    expect(calls(r.calls, 'PUT', '/draft')).toHaveLength(0);
  });

  it('409 draft-version-conflict keeps the text; [Lưu nháp] waits for [Tải bản mới], which shows the newer draft beside it and saves over it', async () => {
    let server = draftView();
    const r = await openPage(configRoutes({
      [URL.configs()]: () => Response.json(configsView({ draft: server })),
      [URL.saveDraft()]: (call) => {
        if ((call.body as SaveDraftBody).expected_version === 0) {
          server = draftView({ instructions: 'Someone else wrote this.', version: 1 });
          return problem(409, 'draft-version-conflict');
        }
        return Response.json(draftView({ ...(call.body as object), version: 2 } as never));
      },
    }));
    await retype('My own text.');
    await userEvent.click(button(t.draft.save));
    expect(await screen.findByText(t.draft.conflict)).toBeInTheDocument();
    expect(instructions()).toHaveValue('My own text.');
    expect(button(t.draft.save)).toBeDisabled();
    await userEvent.click(button(t.draft.reload));
    const beside = await screen.findByRole('region', { name: t.draft.newerTitle.replace('{version}', '1') });
    expect(within(beside).getByText('Someone else wrote this.')).toBeInTheDocument();
    expect(instructions()).toHaveValue('My own text.');
    await userEvent.click(button(t.draft.save));
    expect(await screen.findByText(t.draft.saved.replace('{version}', '2'))).toBeInTheDocument();
    expect(calls(r.calls, 'PUT', '/draft').map((c) => (c.body as SaveDraftBody).expected_version)).toEqual([0, 1]);
  });

  it('a 409 whose newer draft is exactly what was sent means the reply was lost: it counts as saved', async () => {
    let server = draftView();
    await openPage(configRoutes({
      [URL.configs()]: () => Response.json(configsView({ draft: server })),
      [URL.saveDraft()]: (call) => {
        server = draftView({ ...(call.body as object), version: 1, model: { id: 'M1', provider: 'fake', model_id: 'fake:ok' } } as never);
        return problem(409, 'draft-version-conflict');
      },
    }));
    await retype('Landed text.');
    await userEvent.click(button(t.draft.save));
    expect(await screen.findByText(t.draft.saved.replace('{version}', '1'))).toBeInTheDocument();
    expect(screen.queryByText(t.draft.conflict)).not.toBeInTheDocument();
  });

  it('422 few-shot-invalid puts the problems on the output box of that example only', async () => {
    const two = draftView({ examples: [example('go'), example('see')] });
    await openPage(configRoutes({
      [URL.configs()]: withDraft(two),
      [URL.saveDraft()]: () => problem(422, 'few-shot-invalid', { examples: [{ index: 1, problems: ['not-a-form'] }] }),
    }));
    await retype('Changed.');
    await userEvent.click(button(t.draft.save));
    const second = screen.getByRole('group', { name: vi.ai.prompts.example.replace('{n}', '2') });
    const text = t.draft.fewShotInvalid.replace('{n}', '2').replace('{problems}', 'not-a-form');
    expect(await within(second).findByText(text)).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: vi.ai.prompts.example.replace('{n}', '1') })).queryByText(/không qua luật/)).not.toBeInTheDocument();
  });

  it('a 400 that names the instructions, the model or the limit puts the text on that box', async () => {
    await openPage(configRoutes({
      [URL.configs()]: withDraft(),
      [URL.saveDraft()]: () => problem(400, 'validation-failed', {
        violations: ['instructions: Must not be blank', 'max_output_tokens: must be at most 4000', 'thinking: this model cannot turn thinking off'],
      }),
    }));
    await retype('x');
    await userEvent.click(button(t.draft.save));
    expect(await screen.findByText(vi.ai.prompts.errors.blank)).toBeInTheDocument();
    expect(screen.getByText('must be at most 4000')).toBeInTheDocument();
    expect(screen.getByText(vi.ai.operations.row.thinkingCannotOff)).toBeInTheDocument();
  });

  it('the model select offers "Không có model" first, then the models; choosing one drops an effort it does not have', async () => {
    const withEffort = modelRow('M2', 'openai', 'gpt-x', { effort_choices: ['low', 'high'], thinking_off_available: true });
    const r = await openPage(configRoutes({
      [URL.configs()]: withDraft(draftView({ effort: 'low' })),
      [URL.models]: () => Response.json({ items: [{ ...FAKE_OK, effort_choices: ['low'] }, withEffort] }),
    }));
    await userEvent.click(screen.getByRole('button', { name: /Model$/ }));
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([vi.ai.operations.row.noModel, 'Fake · fake:ok', 'OpenAI · gpt-x']);
    await userEvent.click(screen.getByRole('option', { name: 'OpenAI · gpt-x' }));
    expect(screen.getByRole('button', { name: new RegExp(`OpenAI · gpt-x.*Model$`) })).toBeInTheDocument();
    expect(r.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(button(t.draft.save)).toBeEnabled();
  });

  it('B50: hidden and retired models are not offered; the draft\'s own saved model still is, even when retired', async () => {
    const models = [
      FAKE_OK,
      modelRow('M2', 'anthropic', 'claude-old', { lifecycle: 'retired' }),
      modelRow('M3', 'openai', 'gpt-x'),
      modelRow('M4', 'openai', 'gpt-hid', { hidden: true }),
    ];
    await openPage(configRoutes({ [URL.configs()]: withDraft(), [URL.models]: () => Response.json({ items: models }) }));
    await userEvent.click(screen.getByRole('button', { name: /Model$/ }));
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      vi.ai.operations.row.noModel, 'Fake · fake:ok', 'OpenAI · gpt-x',
    ]);
    cleanup();
    await openPage(configRoutes({
      [URL.configs()]: withDraft(draftView({ model: { id: 'M2', provider: 'anthropic', model_id: 'claude-old' } })),
      [URL.models]: () => Response.json({ items: models }),
    }));
    await userEvent.click(screen.getByRole('button', { name: /Model$/ }));
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      vi.ai.operations.row.noModel, 'Fake · fake:ok', 'Anthropic · claude-old', 'OpenAI · gpt-x',
    ]);
  });
});

describe('AiConfigsPage: testing and running the draft (M2-T6)', () => {
  const START = { run_id: RUN_ID, status: 'queued' };
  const startRoutes = (over = {}) => configRoutes({
    [URL.configs()]: withDraft(),
    [URL.startRun]: () => Response.json(START, { status: 202 }),
    [URL.run(RUN_ID)]: () => Response.json(evalRun({ status: 'queued', done: 0, created_at: new Date().toISOString() })),
    [URL.runItems(RUN_ID)]: () => Response.json({ items: [], stats: { dev: {}, held_out: {} } }),
    ...over,
  });

  it('with unsaved edits the test and run-set buttons are off and the page says to save first; saved, they work again', async () => {
    await openPage(configRoutes({ [URL.configs()]: withDraft(), [URL.saveDraft()]: () => Response.json(draftView({ instructions: 'x', version: 1 })) }));
    expect(button(vi.ai.prompts.test.run)).toBeEnabled();
    expect(button(t.draft.runSet)).toBeEnabled();
    expect(screen.queryByText(t.draft.saveFirst)).not.toBeInTheDocument();
    await retype('x');
    expect(button(vi.ai.prompts.test.run)).toBeDisabled();
    expect(button(t.draft.runSet)).toBeDisabled();
    expect(screen.getByText(t.draft.saveFirst)).toBeInTheDocument();
    await userEvent.click(button(t.draft.save));
    await screen.findByText(t.draft.saved.replace('{version}', '1'));
    expect(button(t.draft.runSet)).toBeEnabled();
    expect(screen.queryByText(t.draft.saveFirst)).not.toBeInTheDocument();
  });

  it('[Chạy bộ ví dụ với nháp] starts { operation, set_id: <newest version>, config: "draft" } with an Idempotency-Key and opens the run', async () => {
    const r = await openPage(startRoutes());
    await userEvent.click(button(t.draft.runSet));
    await waitFor(() => expect(r.router.state.location.pathname).toBe(`/ai/eval/runs/${RUN_ID}`));
    const sent = calls(r.calls, 'POST', '/v1/admin/ai/eval/runs');
    expect(sent[0]!.body).toEqual({ operation: 'generate_cloze', set_id: 'S2', config: 'draft' });
    expect(sent[0]!.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.router.state.location.search).toBe('?op=generate_cloze');
  });

  it('with no frozen version the run button is off and the page points to Bộ ví dụ', async () => {
    await openPage(startRoutes({ [URL.sets()]: () => Response.json({ items: [] }) }));
    expect(button(t.draft.runSet)).toBeDisabled();
    expect(screen.getByText(t.publish.noSet)).toBeInTheDocument();
  });

  it('a draft without a model: the run fails with the model-not-set sentence from the API', async () => {
    await openPage(startRoutes({ [URL.startRun]: () => problem(409, 'model-not-set') }));
    await userEvent.click(button(t.draft.runSet));
    expect(await screen.findByText(vi.errors['model-not-set'])).toBeInTheDocument();
  });

  it('[Chạy thử] posts to the draft test with {} and shows the samples; chosen examples are sent as example_ids', async () => {
    const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
    const r = await openPage(configRoutes({
      [URL.configs()]: withDraft(),
      [URL.examples()]: () => Response.json({ items: [
        { id: ids[0], operation: 'generate_cloze', input: example('go').input, note: null, split: 'dev', expected: null, source: 'manual', source_ref: null, revealed_at: null,
          created_by: 'u9', created_by_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, created_at: '2026-10-15T02:12:00.000Z', updated_at: '2026-10-15T02:12:00.000Z' },
        { id: ids[1], operation: 'generate_cloze', input: example('see').input, note: null, split: 'dev', expected: null, source: 'manual', source_ref: null, revealed_at: null,
          created_by: 'u9', created_by_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, created_at: '2026-10-15T02:12:00.000Z', updated_at: '2026-10-15T02:12:00.000Z' },
      ] }),
      [URL.testDraft()]: () => Response.json({ items: [succeeded('go')] }),
    }));
    await userEvent.click(await screen.findByRole('button', { name: vi.ai.prompts.test.run }));
    expect(await screen.findByText('They ___ (go) out.', { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /see/ }));
    await userEvent.click(button(vi.ai.prompts.test.run));
    await waitFor(() => expect(calls(r.calls, 'POST', '/draft/test')).toHaveLength(2));
    expect(calls(r.calls, 'POST', '/draft/test').map((c) => c.body)).toEqual([{}, { example_ids: [ids[1]] }]);
    expect(screen.getByText(t.draft.testNote)).toBeInTheDocument();
  });

  it('a draft test on a draft without a model says to choose one, with no link to the old Thao tác page', async () => {
    await openPage(configRoutes({ [URL.configs()]: withDraft(), [URL.testDraft()]: () => problem(409, 'model-not-set') }));
    await userEvent.click(button(vi.ai.prompts.test.run));
    expect(await screen.findByText(t.draft.noModelToTest)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: vi.ai.prompts.test.openOperations })).not.toBeInTheDocument();
  });
});

describe('AiConfigsPage: deleting the draft (M2-T6)', () => {
  it('[Xóa nháp] asks "Xóa nháp cấu hình 4?"; confirming deletes it and the page goes back to the live config only', async () => {
    let gone = false;
    const r = await openPage(configRoutes({
      [URL.configs()]: () => Response.json(configsView({ draft: gone ? null : draftView() })),
      [URL.deleteDraft()]: () => {
        gone = true;
        return new Response(null, { status: 204 });
      },
    }));
    await userEvent.click(button(t.draft.delete));
    const dialog = await screen.findByRole('dialog', { name: t.draft.deleteConfirm.replace('{number}', '4') });
    expect(calls(r.calls, 'DELETE', '/draft')).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: t.draft.delete }));
    expect(await screen.findByText(t.draft.deleted)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: t.draft.create })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Nháp ·/ })).not.toBeInTheDocument();
  });

  it('409 draft-busy says a run is going; the draft stays', async () => {
    await openPage(configRoutes({ [URL.configs()]: withDraft(), [URL.deleteDraft()]: () => problem(409, 'draft-busy') }));
    await userEvent.click(button(t.draft.delete));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.draft.delete }));
    expect(await screen.findByText(t.draft.busy)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Nháp · cấu hình 4/ })).toBeInTheDocument();
  });

  it('[Hủy] on the question sends nothing', async () => {
    const r = await openPage(configRoutes({ [URL.configs()]: withDraft() }));
    await userEvent.click(button(t.draft.delete));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls(r.calls, 'DELETE', '/draft')).toHaveLength(0);
  });
});

describe('AiConfigsPage: the prompt history from before configs (M2-T6)', () => {
  it('lists the old revisions under its own heading; with a draft open a revision can be copied into it', async () => {
    await openPage(configRoutes({ [URL.configs()]: withDraft() }));
    expect(screen.getByRole('heading', { name: t.oldPrompts })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: vi.ai.prompts.history.viewFor.replace('{revision}', '1') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Text of revision 1.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.ai.prompts.copyToEditor }));
    await waitFor(() => expect(instructions()).toHaveValue('Text of revision 1.'));
    expect(button(t.draft.save)).toBeEnabled();
  });

  it('without a draft a revision can only be read', async () => {
    await openPage();
    await userEvent.click(await screen.findByRole('button', { name: vi.ai.prompts.history.viewFor.replace('{revision}', '1') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: vi.ai.prompts.copyToEditor })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: vi.common.close })).toBeInTheDocument();
  });
});
