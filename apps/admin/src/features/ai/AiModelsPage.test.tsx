import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { AiModel, AiStatus } from './ai-api';

const t = vi.ai.models;
const LIST = 'GET /v1/admin/ai/models';
const STATUS = 'GET /v1/admin/ai/status';
const CREATE = 'POST /v1/admin/ai/models';
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});

const model = (over: Partial<AiModel> = {}): AiModel => ({
  id: 'm1', provider: 'openai', model_id: 'gpt-test', shutdown_at: null, lifecycle: null, effort_choices: [], thinking_off_available: false,
  structured_outputs: true, max_output_tokens: null, price: { input: '2.5000', cached_input: null, output: '10.0000' }, note: null,
  info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [],
  estimate: { per_call_usd: '0.0065', per_call_vnd: 169, per_day_1000_vnd: 169000, max_call_usd: null, max_call_vnd: null }, ...over,
});
const status = (providers: AiStatus['providers']): AiStatus => ({
  operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0 }, ai_enabled: true, providers,
});
const KEYS = { openai: true, anthropic: false, fake: true };
const items = (...rows: AiModel[]) => () => Response.json({ items: rows });
const statusReply = (providers = KEYS) => () => Response.json(status(providers));
const writes = (calls: { method: string; path: string; body: unknown }[], method: string) =>
  calls.filter((c) => c.method === method && c.path.startsWith('/v1/admin/ai/models'));
const named = (template: string, model_id = 'gpt-test') => template.replace('{model}', model_id);

describe('AiModelsPage list (A/80)', () => {
  it('shows provider · model id, prices, "Chưa có giá", estimate or "—", used by, lifecycle and the last check', async () => {
    renderApp('/ai/models', {
      [LIST]: items(
        model({ used_by: ['generate_cloze', 'lookup_word'], lifecycle: 'active', shutdown_at: '2026-11-30T00:00:00.000Z', note: 'rẻ nhất' }),
        model({ id: 'm2', provider: 'anthropic', model_id: 'claude-bare', price: null, estimate: null }),
      ),
    });
    await screen.findAllByText(/gpt-test/);
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(heads).toEqual([t.cols.model, t.cols.price, t.cols.usedBy, t.cols.lifecycle, t.cols.estimate, t.cols.checked, t.cols.actions]);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('OpenAI · gpt-test');
    expect(rows[0]).toHaveTextContent('rẻ nhất');
    expect(rows[0]).toHaveTextContent(/2,50\s*\/\s*—\s*\/\s*10,00/);
    expect(rows[0]).toHaveTextContent('Sinh câu điền từ');
    expect(rows[0]).toHaveTextContent('Tra từ bằng AI');
    expect(rows[0]).toHaveTextContent('Ngừng ngày 30/11/2026');
    expect(rows[0]).toHaveTextContent(/0,0065\s*US\$\s*·\s*169\s*₫/);
    expect(rows[0]).toHaveTextContent('15/10/2026 9:12');
    expect(rows[1]).toHaveTextContent('Anthropic · claude-bare');
    expect(within(rows[1]).getByText(t.noPrice)).toBeInTheDocument();
    expect(within(rows[1]).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('empty list says so', async () => {
    renderApp('/ai/models', { [LIST]: items() });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('an editor gets the no-access view and the API is not called', async () => {
    const r = renderApp('/ai/models', { [LIST]: items() }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/ai/models')).toBe(0);
  });

  it('403 on the list shows the forbidden text, not the generic list error', async () => {
    renderApp('/ai/models', { [LIST]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});

describe('add model (A/80b)', () => {
  async function openAdd(over: Record<string, () => Response> = {}, providers = KEYS) {
    const r = renderApp('/ai/models', { [LIST]: items(), [STATUS]: statusReply(providers), ...over });
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    await screen.findByRole('dialog');
    return r;
  }
  const submit = () => userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.form.submitAdd }));

  it('offers only providers that have a key', async () => {
    await openAdd();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('button', { name: new RegExp(t.form.provider) }));
    const options = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(options).toEqual(['OpenAI', 'Fake']);
  });

  it('no provider has a key: says so and sends nothing', async () => {
    const r = await openAdd({}, { openai: false, anthropic: false, fake: false });
    expect(await screen.findByText(t.form.noProvider)).toBeInTheDocument();
    expect(writes(r.calls, 'POST')).toHaveLength(0);
  });

  it('posts the body (prices as numbers, empty ones null), closes, refreshes the list and confirms with a toast', async () => {
    const r = await openAdd({ [CREATE]: () => Response.json(model(), { status: 201 }) });
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.modelId), 'gpt-test');
    await userEvent.type(within(dialog).getByLabelText(t.form.priceInput), '2,5');
    await userEvent.type(within(dialog).getByLabelText(t.form.priceOutput), '10');
    await submit();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes(r.calls, 'POST')[0].body).toEqual({
      provider: 'openai', model_id: 'gpt-test', price_input: 2.5, price_cached_input: null, price_output: 10, note: null,
    });
    expect(await screen.findByText(named(t.toast.added))).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/ai/models')).toBeGreaterThanOrEqual(2);
  });

  it('an empty model id or an invalid price is refused in the form, the first bad field is focused, nothing is sent', async () => {
    const r = await openAdd();
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.priceInput), '1001');
    await submit();
    expect(await within(dialog).findByText(t.form.modelIdRequired)).toBeInTheDocument();
    expect(within(dialog).getByText(t.form.priceInvalid)).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText(t.form.modelId)).toHaveFocus());
    expect(writes(r.calls, 'POST')).toHaveLength(0);
  });

  it('5 decimals are refused', async () => {
    await openAdd();
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.modelId), 'gpt-test');
    await userEvent.type(within(dialog).getByLabelText(t.form.priceOutput), '1,12345');
    await submit();
    expect(await within(dialog).findByText(t.form.priceInvalid)).toBeInTheDocument();
  });

  it.each([
    [409, 'model-exists', 'Model đã có.'],
    [409, 'provider-not-configured', 'Nhà cung cấp chưa có key.'],
    [422, 'model-not-found', 'Nhà cung cấp không có model này. Kiểm lại tên model.'],
    [422, 'model-not-supported', 'Model này chưa dùng được với Wordmet.'],
    [503, 'provider-unavailable', 'Nhà cung cấp đang không trả lời. Thử lại sau ít phút.'],
  ])('%i %s shows its sentence and keeps the dialog open', async (code, slug, text) => {
    await openAdd({ [CREATE]: () => problem(code, slug) });
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.modelId), 'gpt-test');
    await submit();
    expect(await within(dialog).findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('a 400 that names a price field puts the message on that field', async () => {
    await openAdd({ [CREATE]: () => problem(400, 'validation-failed', { violations: ['price_output: must not be greater than 1000'] }) });
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.modelId), 'gpt-test');
    await submit();
    expect(await within(dialog).findByText('must not be greater than 1000')).toBeInTheDocument();
  });

  it('Fake has no price fields (the API forces 0) and says so', async () => {
    const r = await openAdd({ [CREATE]: () => Response.json(model({ provider: 'fake', model_id: 'fake-1' }), { status: 201 }) });
    const dialog = screen.getByRole('dialog');
    await userEvent.click(await within(dialog).findByRole('button', { name: new RegExp(t.form.provider) }));
    await userEvent.click(await screen.findByRole('option', { name: 'Fake' }));
    expect(within(dialog).queryByLabelText(t.form.priceInput)).not.toBeInTheDocument();
    expect(within(dialog).getByText(t.form.fakePrice)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(t.form.modelId), 'fake-1');
    await submit();
    await waitFor(() => expect(writes(r.calls, 'POST')).toHaveLength(1));
    expect(writes(r.calls, 'POST')[0].body).toEqual({ provider: 'fake', model_id: 'fake-1', note: null });
  });

  it('a typed id then [Hủy] asks "Bỏ thay đổi?" first', async () => {
    await openAdd();
    const dialog = screen.getByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText(t.form.modelId), 'gpt');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    expect(await screen.findByText(vi.leave.discardTitle)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.leave.discard }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('edit price', () => {
  const PATCH = 'PATCH /v1/admin/ai/models/m1';
  const open = (patch: () => Response = () => Response.json(model())) =>
    renderApp('/ai/models/m1', { [LIST]: items(model({ note: 'cũ' })), [PATCH]: patch });

  it('opens on the row with its prices filled in, the provider and id read-only', async () => {
    open();
    const dialog = await screen.findByRole('dialog', { name: named(t.form.editTitle) });
    expect(within(dialog).getByLabelText(t.form.priceInput)).toHaveValue('2,5');
    expect(within(dialog).getByLabelText(t.form.priceCached)).toHaveValue('');
    expect(within(dialog).getByLabelText(t.form.priceOutput)).toHaveValue('10');
    expect(within(dialog).getByLabelText(t.form.note)).toHaveValue('cũ');
    expect(within(dialog).queryByLabelText(t.form.modelId)).not.toBeInTheDocument();
  });

  it('PATCHes all prices and the note, then closes with a toast', async () => {
    const r = open();
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(t.form.priceCached), '0,25');
    await userEvent.clear(within(dialog).getByLabelText(t.form.priceOutput));
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitSave }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes(r.calls, 'PATCH')[0].body).toEqual({ price_input: 2.5, price_cached_input: 0.25, price_output: null, note: 'cũ' });
    expect(await screen.findByText(named(t.toast.saved))).toBeInTheDocument();
  });

  it('an invalid price shows the field error, focuses the field and sends nothing', async () => {
    const r = open();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText(t.form.priceInput);
    await userEvent.clear(input);
    await userEvent.type(input, '-1');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.submitSave }));
    expect(await within(dialog).findByText(t.form.priceInvalid)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveFocus());
    expect(writes(r.calls, 'PATCH')).toHaveLength(0);
  });

  it('an unknown id returns to the list', async () => {
    renderApp('/ai/models/nope', { [LIST]: items(model()) });
    await screen.findAllByText(/gpt-test/);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('refresh and delete', () => {
  it('[Đọc lại thông tin] posts refresh for that row, then refreshes the list with a toast', async () => {
    const r = renderApp('/ai/models', { [LIST]: items(model()), 'POST /v1/admin/ai/models/m1/refresh': () => Response.json(model()) });
    await userEvent.click((await screen.findAllByRole('button', { name: named(t.refreshFor) }))[0]);
    expect(await screen.findByText(named(t.toast.refreshed))).toBeInTheDocument();
    expect(writes(r.calls, 'POST')).toHaveLength(1);
  });

  it('a refresh error shows its sentence above the list', async () => {
    renderApp('/ai/models', { [LIST]: items(model()), 'POST /v1/admin/ai/models/m1/refresh': () => problem(503, 'provider-unavailable') });
    await userEvent.click((await screen.findAllByRole('button', { name: named(t.refreshFor) }))[0]);
    expect(await screen.findByText('Nhà cung cấp đang không trả lời. Thử lại sau ít phút.')).toBeInTheDocument();
  });

  it('[Xóa] asks first; confirming sends DELETE and removes the model', async () => {
    let gone = false;
    const r = renderApp('/ai/models', {
      [LIST]: () => Response.json({ items: gone ? [] : [model()] }),
      'DELETE /v1/admin/ai/models/m1': () => {
        gone = true;
        return new Response(null, { status: 204 });
      },
    });
    await userEvent.click((await screen.findAllByRole('button', { name: named(t.deleteFor) }))[0]);
    const dialog = await screen.findByRole('dialog', { name: named(t.deleteTitle) });
    expect(writes(r.calls, 'DELETE')).toHaveLength(0);
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(writes(r.calls, 'DELETE')).toHaveLength(1);
    expect(await screen.findByText(named(t.toast.deleted))).toBeInTheDocument();
  });

  it('cancelling the question sends nothing', async () => {
    const r = renderApp('/ai/models', { [LIST]: items(model()) });
    await userEvent.click((await screen.findAllByRole('button', { name: named(t.deleteFor) }))[0]);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes(r.calls, 'DELETE')).toHaveLength(0);
  });

  it('409 model-in-use: the sentence plus the operation names from the row, and the model stays', async () => {
    renderApp('/ai/models', {
      [LIST]: items(model({ used_by: ['generate_cloze', 'check_private_word'] })),
      'DELETE /v1/admin/ai/models/m1': () => problem(409, 'model-in-use'),
    });
    await userEvent.click((await screen.findAllByRole('button', { name: named(t.deleteFor) }))[0]);
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.deleteConfirm }));
    expect(await screen.findByText(/Model đang được thao tác dùng, chưa xóa được\./)).toBeInTheDocument();
    expect(screen.getByText(/Thao tác đang dùng: Sinh câu điền từ, Kiểm từ riêng\./)).toBeInTheDocument();
    expect(screen.getAllByText(/OpenAI · gpt-test/).length).toBeGreaterThan(0);
  });
});
