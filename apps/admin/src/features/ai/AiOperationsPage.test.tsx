import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { AI_OPERATION_ORDER, type AiModel, type AiOperation, type AiOperationSetting } from './ai-api';

const t = vi.ai.operations.row;
const OPS = 'GET /v1/admin/ai/operations';
const MODELS = 'GET /v1/admin/ai/models';
const PUT = (op: string) => `PUT /v1/admin/ai/operations/${op}`;
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});

const model = (over: Partial<AiModel> = {}): AiModel => ({
  id: 'm1', provider: 'openai', model_id: 'gpt-x', shutdown_at: null, lifecycle: null, effort_choices: ['low', 'high'], thinking_off_available: true,
  structured_outputs: true, max_output_tokens: 4000, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, ...over,
});
const m1 = model();
const m2 = model({ id: 'm2', provider: 'anthropic', model_id: 'claude-x', effort_choices: ['low'], thinking_off_available: false });
const setting = (operation: AiOperation, over: Partial<AiOperationSetting> = {}): AiOperationSetting => ({
  operation, model: null, effort: null, thinking: null, max_output_tokens: null, version: 1, input_fields: [], estimate: null, ...over,
});
const rows = (over: Partial<Record<AiOperation, Partial<AiOperationSetting>>> = {}) =>
  [...AI_OPERATION_ORDER].sort().map((op) => setting(op, over[op]));
const withM1 = { model: { id: 'm1', provider: 'openai' as const, model_id: 'gpt-x' }, effort: 'high', thinking: 'off' as const, max_output_tokens: 800, version: 3 };
const list = (items: AiOperationSetting[]) => () => Response.json({ items });
const models = (...items: AiModel[]) => () => Response.json({ items });
const rowOf = (op: string) => screen.getByRole('group', { name: new RegExp(op) });
const saveName = (op: string) => t.saveFor.replace('{operation}', op);
const puts = (calls: { method: string; path: string; body: unknown }[]) => calls.filter((c) => c.method === 'PUT');
const pick = async (row: HTMLElement, label: string, option: string) => {
  await userEvent.click(within(row).getByRole('button', { name: new RegExp(label) }));
  await userEvent.click(await screen.findByRole('option', { name: option }));
};

describe('AiOperationsPage (A/81)', () => {
  it('six rows in the copy deck order, each with model, effort, thinking and max tokens filled from the server row', async () => {
    renderApp('/ai/operations', { [OPS]: list(rows({ lookup_word: withM1 })), [MODELS]: models(m1, m2) });
    await screen.findByRole('group', { name: /generate_cloze/ });
    const order = screen.getAllByRole('group').map((g) => AI_OPERATION_ORDER.find((op) => g.getAttribute('aria-label')?.includes(op))).filter(Boolean);
    expect(order).toEqual([...AI_OPERATION_ORDER]);
    const row = rowOf('lookup_word');
    expect(within(row).getByRole('button', { name: new RegExp(`OpenAI · gpt-x.*${t.model}`) })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: new RegExp(`high.*${t.effort}`) })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: new RegExp(`${t.thinkingOff}.*${t.thinking}`) })).toBeInTheDocument();
    expect(within(row).getByLabelText(t.maxTokens)).toHaveValue('800');
    const idle = rowOf('generate_cloze');
    expect(within(idle).getByRole('button', { name: new RegExp(`${t.noModel}.*${t.model}`) })).toBeInTheDocument();
  });

  it('switching to a model without the chosen effort resets effort to Mặc định and says which level went', async () => {
    renderApp('/ai/operations', { [OPS]: list(rows({ lookup_word: { ...withM1, effort: 'high', thinking: null } })), [MODELS]: models(m1, m2) });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.model, 'Anthropic · claude-x');
    expect(within(row).getByRole('button', { name: new RegExp(`${t.effortDefault}.*${t.effort}`) })).toBeInTheDocument();
    expect(within(row).getByText(t.effortDropped.replace('{effort}', 'high'))).toBeInTheDocument();
  });

  it('a model that cannot turn thinking off hides the "Tắt" choice', async () => {
    const onM2 = { ...withM1, model: { id: 'm2', provider: 'anthropic' as const, model_id: 'claude-x' }, effort: null, thinking: null };
    renderApp('/ai/operations', { [OPS]: list(rows({ lookup_word: onM2 })), [MODELS]: models(m1, m2) });
    await screen.findByRole('group', { name: /lookup_word/ });
    await userEvent.click(within(rowOf('lookup_word')).getByRole('button', { name: new RegExp(t.thinking) }));
    expect(await screen.findAllByRole('option')).toHaveLength(1);
    expect(screen.queryByRole('option', { name: t.thinkingOff })).not.toBeInTheDocument();
  });

  it('[Lưu] PUTs all five fields with the row version, toasts, and the row is clean again', async () => {
    const saved = setting('lookup_word', { ...withM1, effort: 'low', version: 4 });
    const r = renderApp('/ai/operations', { [OPS]: list(rows({ lookup_word: withM1 })), [MODELS]: models(m1, m2), [PUT('lookup_word')]: () => Response.json(saved) });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.effort, 'low');
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    expect(await screen.findByText(t.saved)).toBeInTheDocument();
    expect(puts(r.calls)).toHaveLength(1);
    expect(puts(r.calls)[0].body).toEqual({ expected_version: 3, model_ref: 'm1', effort: 'low', thinking: 'off', max_output_tokens: 800 });
    await waitFor(() => expect(within(row).getByRole('button', { name: saveName('lookup_word') })).toBeDisabled());
  });

  it('"Không có model" is sent as model_ref null', async () => {
    const r = renderApp('/ai/operations', { [OPS]: list(rows({ lookup_word: withM1 })), [MODELS]: models(m1), [PUT('lookup_word')]: () => Response.json(setting('lookup_word', { version: 4 })) });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.model, t.noModel);
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    await screen.findByText(t.saved);
    expect(puts(r.calls)[0].body).toEqual({ expected_version: 3, model_ref: null, effort: null, thinking: null, max_output_tokens: 800 });
  });

  it.each([
    ['thinking: this model cannot turn thinking off', t.thinkingCannotOff],
    ['thinking: off needs effort high or below', t.thinkingNeedsEffort],
  ])('the 400 "%s" shows its copy under the Thinking field', async (violation, copy) => {
    renderApp('/ai/operations', {
      [OPS]: list(rows({ lookup_word: { ...withM1, thinking: null } })), [MODELS]: models(m1),
      [PUT('lookup_word')]: () => problem(400, 'validation-failed', { violations: [violation] }),
    });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.thinking, t.thinkingOff);
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    expect(await within(row).findByText(copy)).toBeInTheDocument();
  });

  it('409 operation-settings-conflict: the conflict copy and [Tải lại], the edited fields stay and Lưu is off until it is pressed', async () => {
    const serverRow = setting('lookup_word', { ...withM1, effort: 'low', version: 4 });
    const r = renderApp('/ai/operations', {
      [OPS]: () => Response.json({ items: rows().map((s) => (s.operation === 'lookup_word' ? serverRow : s)) }),
      [MODELS]: models(m1),
      [PUT('lookup_word')]: () => problem(409, 'operation-settings-conflict'),
    });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.effort, 'high');
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    expect(await within(row).findByText(vi.errors['operation-settings-conflict'])).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: new RegExp(`high.*${t.effort}`) })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: saveName('lookup_word') })).toBeDisabled();
    await userEvent.click(within(row).getByRole('button', { name: t.reload }));
    await waitFor(() => expect(within(row).getByRole('button', { name: new RegExp(`low.*${t.effort}`) })).toBeInTheDocument());
    expect(within(row).queryByText(vi.errors['operation-settings-conflict'])).not.toBeInTheDocument();
    expect(puts(r.calls)).toHaveLength(1);
  });

  it('a 409 whose re-read fails still marks the conflict: Lưu stays off and [Tải lại] is offered', async () => {
    let reads = 0;
    renderApp('/ai/operations', {
      [OPS]: () => {
        reads += 1;
        return reads === 1 ? Response.json({ items: rows({ lookup_word: withM1 }) }) : problem(500, 'internal-error');
      },
      [MODELS]: models(m1),
      [PUT('lookup_word')]: () => problem(409, 'operation-settings-conflict'),
    });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.effort, 'low');
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    expect(await within(row).findByText(t.reload)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: saveName('lookup_word') })).toBeDisabled();
  });

  it('Review Focus 2: a 409 after our own lost save, where the reloaded row equals the screen, says "Đã lưu"', async () => {
    let serverRow = setting('lookup_word', withM1);
    renderApp('/ai/operations', {
      [OPS]: () => Response.json({ items: rows().map((s) => (s.operation === 'lookup_word' ? serverRow : s)) }),
      [MODELS]: models(m1),
      [PUT('lookup_word')]: () => {
        serverRow = { ...serverRow, effort: 'low', version: 4 }; // the first request landed; its reply was lost
        return problem(409, 'operation-settings-conflict');
      },
    });
    await screen.findByRole('group', { name: /lookup_word/ });
    const row = rowOf('lookup_word');
    await pick(row, t.effort, 'low');
    await userEvent.click(within(row).getByRole('button', { name: saveName('lookup_word') }));
    expect(await screen.findByText(t.saved)).toBeInTheDocument();
    expect(within(row).queryByText(vi.errors['operation-settings-conflict'])).not.toBeInTheDocument();
  });

  it('saving one row leaves another dirty row dirty; a dirty row and a nav link ask "Rời trang?"', async () => {
    renderApp('/ai/operations', {
      [OPS]: list(rows({ lookup_word: withM1, translate_sentence: withM1 })), [MODELS]: models(m1, m2),
      [PUT('lookup_word')]: () => Response.json(setting('lookup_word', { ...withM1, effort: 'low', version: 4 })),
      'GET /v1/admin/ai/status': () => Response.json({
        operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0 }, ai_enabled: true,
        providers: { openai: true, anthropic: false, fake: false },
      }),
    });
    await screen.findByRole('group', { name: /lookup_word/ });
    await pick(rowOf('lookup_word'), t.effort, 'low');
    await pick(rowOf('translate_sentence'), t.effort, 'low');
    await userEvent.click(within(rowOf('lookup_word')).getByRole('button', { name: saveName('lookup_word') }));
    await screen.findByText(t.saved);
    expect(within(rowOf('translate_sentence')).getByRole('button', { name: saveName('translate_sentence') })).toBeEnabled();
    await userEvent.click(screen.getAllByRole('link', { name: vi.nav.aiStatus })[0]);
    expect(await screen.findByText(vi.leave.title)).toBeInTheDocument();
  });

  it('a 403 shows the forbidden text', async () => {
    renderApp('/ai/operations', { [OPS]: () => problem(403, 'forbidden'), [MODELS]: models(m1) });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });

  it('an editor gets the no-access view and never reaches the API', async () => {
    const r = renderApp('/ai/operations', { [OPS]: list(rows()), [MODELS]: models(m1) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/ai/operations')).toBe(0);
  });
});
