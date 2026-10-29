import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { AiCall } from './ai-api';

const t = vi.ai.calls;
const callsUrl = (id: string) => `GET /v1/admin/ai/calls?operation_id=${encodeURIComponent(id)}`;
const call = (over: Partial<AiCall> = {}): AiCall => ({
  id: 'c1', attempt: 1, purpose: 'learner', operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null,
  prompt_revision: 3, outcome: 'timeout', http_status: null, provider_error_code: null, latency_ms: 10000, input_tokens: 120, cached_input_tokens: 20,
  output_tokens: 0, reasoning_tokens: 0, cost_usd: '0.00010000', cost_known: true, created_at: '2026-10-25T02:12:00.000Z', held_out: false,
  content: { request: { messages: ['hi'] }, response: '{"sentence":"I ___ home."}', expires_at: '2026-10-25T10:00:00.000Z' }, ...over,
});
const reply = (...items: AiCall[]) => () => Response.json({ items });
const OP = 'op-123';

describe('AiCallsPage (A/86)', () => {
  it('without a code it asks for one and sends nothing', async () => {
    const r = renderApp('/ai/calls', {});
    expect(await screen.findByRole('heading', { level: 1, name: 'Các lần gọi' })).toBeInTheDocument();
    expect(screen.getByLabelText(t.search.label)).toHaveValue('');
    expect(screen.getByText(t.hint)).toBeInTheDocument();
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/calls'))).toHaveLength(0);
  });

  it('?operation_id= fills the box and loads the calls; a row has attempt, purpose, operation, model, outcome and HTTP', async () => {
    const r = renderApp(`/ai/calls?operation_id=${OP}`, {
      [callsUrl(OP)]: reply(call(), call({ id: 'c2', attempt: 2, outcome: 'succeeded', http_status: 200, content: null })),
    });
    expect(await screen.findAllByText('timeout')).not.toHaveLength(0);
    expect(screen.getByLabelText(t.search.label)).toHaveValue(OP);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Sinh câu điền từ');
    expect(rows[0]).toHaveTextContent('gpt-x');
    expect(rows[1]).toHaveTextContent('200');
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/calls'))).toHaveLength(1);
  });

  it('a judge call has its own purpose and operation names: "judge" and "Judge chấm điểm"', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call({ purpose: 'judge', operation: 'judge', prompt_revision: null })) });
    expect(await screen.findAllByText('timeout')).not.toHaveLength(0);
    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveTextContent('judge');
    expect(row).toHaveTextContent('Judge chấm điểm');
  });

  it('[Tìm] writes the code to the URL (trimmed) and loads it', async () => {
    const r = renderApp('/ai/calls', { [callsUrl(OP)]: reply(call()) });
    await screen.findByText(t.hint);
    await userEvent.type(screen.getByLabelText(t.search.label), `  ${OP}  `);
    await userEvent.click(screen.getByRole('button', { name: t.search.submit }));
    expect(await screen.findAllByText('timeout')).not.toHaveLength(0);
    expect(r.router.state.location.search).toBe(`?operation_id=${OP}`);
  });

  it('empty list → "Không có lời gọi nào với mã này."', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply() });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('content kept → "Còn tới 25/10" and [Xem]; null → "Không còn nội dung" and no button', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call(), call({ id: 'c2', attempt: 2, content: null })) });
    await screen.findAllByText('timeout');
    const [kept, gone] = screen.getAllByRole('row').slice(1);
    expect(kept).toHaveTextContent('Còn tới 25/10');
    expect(within(kept).getByRole('button', { name: /Xem/ })).toBeInTheDocument();
    expect(gone).toHaveTextContent(t.noContent);
    expect(within(gone).queryByRole('button', { name: /Xem/ })).not.toBeInTheDocument();
  });

  it('[Xem] opens the stored request and response as formatted JSON in a dialog', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call()) });
    await userEvent.click((await screen.findAllByRole('button', { name: /Xem/ }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.content.title });
    expect(within(dialog).getByText(t.content.request)).toBeInTheDocument();
    expect(within(dialog).getByText(t.content.response)).toBeInTheDocument();
    expect(dialog.textContent).toContain('"messages": [\n    "hi"\n  ]');
    expect(dialog.textContent).toContain('"sentence": "I ___ home."');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.close }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('nhóm B M1: a call made for a held-out example shows "held-out" and "Nội dung được ẩn", with no [Xem]', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call({ purpose: 'eval', held_out: true, content: null })) });
    await screen.findAllByText(t.heldOut);
    const [row] = screen.getAllByRole('row').slice(1);
    expect(row).toHaveTextContent(t.heldOut);
    expect(row).toHaveTextContent(t.hiddenContent);
    expect(row).not.toHaveTextContent(t.noContent);
    expect(within(row).queryByRole('button', { name: /Xem/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.viewFor.replace('{attempt}', '1') })).not.toBeInTheDocument();
  });

  it('nhóm B M1: held-out wins over a stored content: no [Xem] and no content either way', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call({ purpose: 'eval', held_out: true })) });
    await screen.findAllByText(t.hiddenContent);
    expect(screen.queryByRole('button', { name: /Xem/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Còn tới 25/10')).not.toBeInTheDocument();
  });

  it('nhóm B M1: a call that is not held-out and has no content still reads "Không còn nội dung", with no badge', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call({ purpose: 'eval', held_out: false, content: null })) });
    await screen.findAllByText(t.noContent);
    expect(screen.queryByText(t.heldOut)).not.toBeInTheDocument();
    expect(screen.queryByText(t.hiddenContent)).not.toBeInTheDocument();
  });

  it('an unknown cost shows "Chưa có giá"', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: reply(call({ cost_usd: null, cost_known: false })) });
    expect(await screen.findAllByText(t.costUnknown)).not.toHaveLength(0);
  });

  it('403 shows the forbidden text', async () => {
    renderApp(`/ai/calls?operation_id=${OP}`, { [callsUrl(OP)]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});
