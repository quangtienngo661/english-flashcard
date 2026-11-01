import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import en from '../../../messages/en.json';
import { problem } from '../../auth/test-support';
import { POLL_INTERVAL_MS } from '../jobs/usePollingStatus';
import { todayInAdminZone } from './cost-range';
import { batchRow, BATCH_ID, CONFIG_ID, renderCosts, SOURCE_ID } from './costs-test-support';

const t = vi.ai.costs.batches;
const today = todayInAdminZone(new Date());
const url = `/v1/admin/ai/batches?from=${today}&to=${today}&page_size=20`;
const list = (items = [batchRow()], next: string | null = null) => Response.json({ items, next_page_token: next });

describe('cost batches', () => {
  it('defaults to one row per admin batch using ledger totals including retry calls', async () => {
    const r = renderCosts('/ai/costs', { [`GET ${url}`]: () => list() });
    expect(await screen.findAllByText('fake:batch-model', {}, { timeout: 4000 })).not.toHaveLength(0);
    expect(screen.getByRole('tab', { name: t.tab })).toHaveAttribute('aria-selected', 'true');
    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveTextContent('10/10');
    expect(row).toHaveTextContent('12 calls · 2 retry');
    expect(row).toHaveTextContent('1.200');
    expect(row).toHaveTextContent('800');
    expect(row).toHaveTextContent('300');
    expect(row).toHaveTextContent('50');
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/costs'))).toHaveLength(0);
  });

  it('shows incomplete prices with a known subtotal and running totals explicitly partial', async () => {
    renderCosts('/ai/costs', { [`GET ${url}`]: () => list([batchRow({ status: 'running', done: 4, cost_usd: null, known_cost_usd: '0.00700000', unknown_cost_calls: 2 })]) });
    await screen.findAllByText(t.unknown);
    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveTextContent(t.partial);
    expect(row).toHaveTextContent('Phần đã biết giá:');
    expect(row).toHaveTextContent('2 calls chưa có giá');
    expect(row).toHaveTextContent('4/10');
    expect(row).not.toHaveTextContent('0,00 US$');
  });

  it('paginates, binds tokens to filters, and changes kind/status/operation in the URL', async () => {
    const r = renderCosts('/ai/costs', {
      [`GET ${url}`]: () => list([batchRow()], 'next+/='),
      [`GET ${url}&page_token=next%2B%2F%3D`]: () => list([batchRow({ id: SOURCE_ID, model: 'page-two' })]),
      [`GET ${url}&kind=test`]: () => list([batchRow({ model: 'tests-only' })]),
      [`GET ${url}&operation=lookup_word&kind=test`]: () => list([batchRow({ model: 'lookup-only' })]),
      [`GET ${url}&operation=lookup_word&kind=test&status=failed`]: () => list([]),
    });
    await screen.findAllByText('fake:batch-model', {}, { timeout: 4000 });
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    await screen.findAllByText('page-two');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.kind) }));
    await userEvent.click(screen.getByRole('option', { name: t.kinds.test }));
    await screen.findAllByText('tests-only');
    expect(screen.queryByText('page-two')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.operation) }));
    await userEvent.click(screen.getByRole('option', { name: vi.ai.operations.names.lookup_word }));
    await screen.findAllByText('lookup-only');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.status) }));
    await userEvent.click(screen.getByRole('option', { name: t.statuses.failed }));
    await screen.findByText(t.empty);
    expect(r.router.state.location.search).toBe('?kind=test&operation=lookup_word&status=failed');
  });

  it('keeps aggregate available by tab and by a legacy group_by URL', async () => {
    const r = renderCosts('/ai/costs?group_by=model', {
      [`GET /v1/admin/ai/costs?from=${today}&to=${today}&group_by=model`]: () => Response.json({ items: [], total: {} }),
      [`GET /v1/admin/ai/costs?from=${today}&to=${today}&group_by=day`]: () => Response.json({ items: [], total: {} }),
      [`GET ${url}`]: () => list(),
    });
    expect(await screen.findByText(vi.ai.costs.empty)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: t.aggregate })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: t.tab }));
    await screen.findAllByText('fake:batch-model', {}, { timeout: 4000 });
    expect(r.router.state.location.search).toBe('');
    await userEvent.click(screen.getByRole('tab', { name: t.aggregate }));
    await screen.findByText(vi.ai.costs.empty);
    expect(r.router.state.location.search).toBe('?group_by=day');
  });

  it('choosing day in the aggregate group selector keeps the aggregate tab selected', async () => {
    const r = renderCosts('/ai/costs?group_by=model', {
      [`GET /v1/admin/ai/costs?from=${today}&to=${today}&group_by=model`]: () => Response.json({ items: [], total: {} }),
      [`GET /v1/admin/ai/costs?from=${today}&to=${today}&group_by=day`]: () => Response.json({ items: [], total: {} }),
    });
    await screen.findByText(vi.ai.costs.empty);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(vi.ai.costs.filters.groupBy) }));
    await userEvent.click(screen.getByRole('option', { name: vi.ai.costs.groups.day }));
    expect(screen.getByRole('tab', { name: t.aggregate })).toHaveAttribute('aria-selected', 'true');
    expect(r.router.state.location.search).toBe('?group_by=day');
  });

  it('opens a URL-backed detail with frozen source, fingerprint, source links and no eval/held-out content', async () => {
    const r = renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow(), snapshot: { instructions: 'Frozen prompt', examples: [], model_ref: 'fake:old' }, items: [{ held_out: true, input: 'SECRET HELDOUT', output: 'SECRET OUTPUT' }] }),
    });
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByText(`Cấu hình ${CONFIG_ID} · v3`)).toBeInTheDocument();
    expect(within(panel).queryByText(t.temporary)).not.toBeInTheDocument();
    expect(within(panel).queryByText(t.saved)).not.toBeInTheDocument();
    expect(within(panel).queryByText(t.sourceUnknown)).not.toBeInTheDocument();
    expect(within(panel).getByText('a'.repeat(64))).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: t.evalSource })).toHaveAttribute('href', `/ai/eval/runs/${SOURCE_ID}?op=generate_cloze`);
    // A config may already be published/retired. The batch does not identify its current draft status.
    expect(within(panel).getByRole('link', { name: t.draft })).toHaveAttribute('href', '/ai/configs/history?op=generate_cloze');
    expect(panel).not.toHaveTextContent('SECRET');
    await userEvent.click(within(panel).getByText(t.snapshot));
    expect(panel).toHaveTextContent('Frozen prompt');
    await userEvent.click(within(panel).getByRole('button', { name: vi.common.close }));
    expect(r.router.state.location.search).toBe('');
  });

  it('shows test outputs with expiry, hides expired and held-out payloads, and marks missing outputs', async () => {
    renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow({ kind: 'test' }), snapshot: { instructions: 'Test prompt', examples: [], model_ref: 'fake:ok' }, items: [
        { call_id: 'available', operation_id: 'test-1', attempt: 1, outcome: 'success', held_out: false, content: { response: 'Visible output', expires_at: '2999-01-01T00:00:00Z' } },
        { call_id: 'expired', operation_id: 'test-2', attempt: 1, outcome: 'success', held_out: false, content: { response: 'EXPIRED SECRET', expires_at: '2000-01-01T00:00:00Z' } },
        { call_id: 'hidden', operation_id: 'test-3', attempt: 1, outcome: 'success', held_out: true, content: { response: 'HELDOUT SECRET', expires_at: '2999-01-01T00:00:00Z' } },
        { call_id: 'missing', operation_id: 'test-4', attempt: 1, outcome: 'success', held_out: false, content: null },
      ] }),
    });
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByText('Visible output')).toBeInTheDocument();
    expect(panel).toHaveTextContent(`Cấu hình ${CONFIG_ID} · v3`);
    expect(panel).toHaveTextContent('Output được giữ đến');
    expect(within(panel).getAllByText(t.expired)).toHaveLength(2);
    expect(panel).toHaveTextContent(t.heldOut);
    expect(panel).not.toHaveTextContent('SECRET');
  });

  it('removes an output when retention expires while the detail stays open', async () => {
    renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow({ kind: 'test' }), snapshot: null, items: [
        { call_id: 'short-lived', operation_id: 'test-1', attempt: 1, outcome: 'success', content: { response: 'Short-lived output', expires_at: new Date(Date.now() + 1300).toISOString() } },
      ] }),
    });
    expect(await screen.findByText('Short-lived output')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Short-lived output')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(t.expired)).toBeInTheDocument();
  });

  it('links judge source via its pass and parent batch without exposing source payloads', async () => {
    renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow({ kind: 'judge', parent_id: CONFIG_ID }), snapshot: null, items: [] }),
      [`GET /v1/admin/ai/judge-passes/${SOURCE_ID}`]: () => Response.json({ eval_run_id: CONFIG_ID }),
    });
    const link = await screen.findByRole('link', { name: t.judgeSource });
    expect(link).toHaveAttribute('href', `/ai/eval/runs/${CONFIG_ID}?op=generate_cloze`);
    expect(screen.getByRole('link', { name: t.parent })).toHaveAttribute('href', `/ai/costs?batch=${CONFIG_ID}`);
    expect(screen.getByText(t.noSnapshot)).toBeInTheDocument();
  });

  it('validates the date range before fetching and applies valid range filters', async () => {
    const r = renderCosts('/ai/costs?from=2026-10-27&to=2026-10-01', {
      'GET /v1/admin/ai/batches?from=2026-10-01&to=2026-10-01&page_size=20': () => list(),
    });
    expect(await screen.findByText(vi.ai.costs.errors.fromAfterTo)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/ai/batches'))).toBe(false);
    await userEvent.clear(screen.getByLabelText(vi.ai.costs.filters.from));
    await userEvent.type(screen.getByLabelText(vi.ai.costs.filters.from), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: vi.ai.costs.filters.apply }));
    await screen.findAllByText('fake:batch-model', {}, { timeout: 4000 });
  });

  it('reports a forbidden list explicitly and never requests malformed IDs', async () => {
    const r = renderCosts('/ai/costs?batch=bad-id', { [`GET ${url}`]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.endsWith('/bad-id'))).toBe(false);
  });

  it('reports 404 details and invalid IDs independently of a successful list', async () => {
    const r = renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => problem(404, 'not-found'),
    });
    expect(await screen.findByText(t.notFound)).toBeInTheDocument();
    await act(() => r.router.navigate('/ai/costs?batch=not-a-uuid'));
    expect(await screen.findByText(t.invalidId)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.endsWith('/not-a-uuid'))).toBe(false);
  });

  it('opens a row detail, preserves its filters, and Back returns to the list', async () => {
    const r = renderCosts('/ai/costs?kind=eval', {
      [`GET ${url}&kind=eval`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow(), snapshot: null, items: [] }),
    });
    await userEvent.click((await screen.findAllByRole('link', { name: `Chi tiết batch ${BATCH_ID}` }))[0]);
    await screen.findByText(t.noSnapshot);
    expect(r.router.state.location.search).toBe(`?kind=eval&batch=${BATCH_ID}`);
    await act(() => r.router.navigate(-1));
    expect(r.router.state.location.search).toBe('?kind=eval');
  });

  it('shows unknown legacy provenance explicitly when stable top-level metadata is missing', async () => {
    renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow({ config_id: null, config_version: null, fingerprint: null, source_id: null, parent_id: null }), snapshot: { instructions: 'Legacy content' }, items: [] }),
    });
    expect(await screen.findByText(t.sourceUnknown)).toBeInTheDocument();
    expect(screen.getByText(t.noConfig)).toBeInTheDocument();
    expect(screen.queryByText(t.saved)).not.toBeInTheDocument();
  });

  it('ignores invented snapshot provenance and never infers temporary from different execution content', async () => {
    renderCosts(`/ai/costs?batch=${BATCH_ID}`, {
      [`GET ${url}`]: () => list(),
      [`GET /v1/admin/ai/batches/${BATCH_ID}`]: () => Response.json({ ...batchRow(), snapshot: { source: 'temporary', temporary: true, fingerprint: 'different', instructions: 'Changed execution content' }, items: [] }),
    });
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByText('a'.repeat(64))).toBeInTheDocument();
    expect(within(panel).queryByText(t.temporary)).not.toBeInTheDocument();
    expect(within(panel).queryByText(t.saved)).not.toBeInTheDocument();
    expect(within(panel).getByText(`Cấu hình ${CONFIG_ID} · v3`)).toBeInTheDocument();
  });

  it('refreshes running batch progress and stops polling after it finishes', async () => {
    let requests = 0;
    const r = renderCosts('/ai/costs', { [`GET ${url}`]: () => list([batchRow(++requests === 1 ? { status: 'running', done: 2, model: 'running-model' } : { model: 'finished-model' })]) });
    await screen.findAllByText('running-model');
    await screen.findAllByText('finished-model', {}, { timeout: POLL_INTERVAL_MS + 1500 });
    const before = r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/batches')).length;
    await act(() => new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS + 100)));
    expect(r.calls.filter((c) => c.path.startsWith('/v1/admin/ai/batches'))).toHaveLength(before);
  }, 10000);

  it('renders English batch labels and retries a failed batch list', async () => {
    let attempt = 0;
    renderCosts('/ai/costs', { [`GET ${url}`]: () => ++attempt === 1 ? problem(500, 'internal-error') : list() }, 'en');
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findAllByText('fake:batch-model', {}, { timeout: 4000 })).not.toHaveLength(0);
    expect(screen.getByRole('tab', { name: en.ai.costs.batches.tab })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(attempt).toBe(2));
  });
});
