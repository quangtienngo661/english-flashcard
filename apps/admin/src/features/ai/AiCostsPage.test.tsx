import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { CostsReply } from './ai-api';
import { todayInAdminZone } from './cost-range';

const t = vi.ai.costs;
const TODAY = todayInAdminZone(new Date());
const costsUrl = (from = TODAY, to = TODAY, group = 'day') => `GET /v1/admin/ai/costs?from=${from}&to=${to}&group_by=${group}`;
const totals = (over = {}) => ({
  calls: 10, input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50, cost_usd: '0.01230000', cost_vnd: 321, unknown_cost_calls: 0, ...over,
});
const reply = (over: Partial<CostsReply> = {}): CostsReply => ({
  items: [{ key: '2026-10-15', ...totals() }, { key: '2026-10-16', ...totals({ calls: 5, unknown_cost_calls: 2 }) }],
  total: totals({ calls: 15, unknown_cost_calls: 2, cost_usd: '0.02000000', cost_vnd: 522 }),
  ...over,
});
const costCalls = (calls: Call[]) => calls.filter((c) => c.path.startsWith('/v1/admin/ai/costs'));
const field = (label: string) => screen.getByLabelText(label);

describe('AiCostsPage (A/85)', () => {
  it('opens on today, grouped by day: one row per group, a total row, and the estimate note', async () => {
    const r = renderApp('/ai/costs', { [costsUrl()]: () => Response.json(reply()) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Chi phí' })).toBeInTheDocument();
    expect(await screen.findAllByText('15/10/2026')).not.toHaveLength(0);
    expect(screen.getAllByText('16/10/2026')).not.toHaveLength(0);
    expect(field(t.filters.from)).toHaveValue(TODAY);
    expect(field(t.filters.to)).toHaveValue(TODAY);
    expect(screen.getByText(t.note)).toBeInTheDocument();
    const total = screen.getAllByRole('row').find((row) => within(row).queryByText(t.total))!;
    expect(total).toHaveTextContent('15');
    expect(total).toHaveTextContent('522');
    expect(within(total).getByText('2')).toBeInTheDocument(); // calls without a price
    expect(costCalls(r.calls)).toHaveLength(1);
  });

  it('has the nine columns of the copy deck', async () => {
    renderApp('/ai/costs', { [costsUrl()]: () => Response.json(reply()) });
    await screen.findAllByText('15/10/2026');
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(heads).toEqual([t.cols.group, t.cols.calls, t.cols.input, t.cols.cached, t.cols.output, t.cols.reasoning, t.cols.usd, t.cols.vnd, t.cols.unknown]);
  });

  it('offers the five group-by choices; picking one asks again and writes group_by to the URL', async () => {
    const r = renderApp('/ai/costs', {
      [costsUrl()]: () => Response.json(reply()),
      [costsUrl(TODAY, TODAY, 'operation')]: () => Response.json({ items: [{ key: 'generate_cloze', ...totals() }], total: totals() }),
    });
    await screen.findAllByText('15/10/2026');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.filters.groupBy) }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(Object.values(t.groups));
    await userEvent.click(screen.getByRole('option', { name: t.groups.operation }));
    expect((await screen.findAllByText('Sinh câu điền từ')).length).toBeGreaterThan(0);
    expect(r.router.state.location.search).toBe('?group_by=operation');
  });

  it('reads from, to and group_by from the URL', async () => {
    const r = renderApp('/ai/costs?from=2026-10-01&to=2026-10-20&group_by=model', {
      [costsUrl('2026-10-01', '2026-10-20', 'model')]: () => Response.json({ items: [{ key: 'openai/gpt-x', ...totals() }], total: totals() }),
    });
    expect(await screen.findAllByText('openai/gpt-x')).not.toHaveLength(0);
    expect(field(t.filters.from)).toHaveValue('2026-10-01');
    expect(field(t.filters.to)).toHaveValue('2026-10-20');
    expect(costCalls(r.calls)).toHaveLength(1);
  });

  it('applying a range writes it to the URL and asks for it', async () => {
    const r = renderApp('/ai/costs', {
      [costsUrl()]: () => Response.json(reply()),
      [costsUrl('2026-09-01', '2026-10-01')]: () => Response.json(reply({ items: [{ key: '2026-09-30', ...totals() }] })),
    });
    await screen.findAllByText('15/10/2026');
    await userEvent.clear(field(t.filters.from));
    await userEvent.type(field(t.filters.from), '2026-09-01');
    await userEvent.clear(field(t.filters.to));
    await userEvent.type(field(t.filters.to), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    expect(await screen.findAllByText('30/09/2026')).not.toHaveLength(0);
    expect(r.router.state.location.search).toBe('?from=2026-09-01&to=2026-10-01');
  });

  it('from after to → error on the From field, and no request is sent', async () => {
    const r = renderApp('/ai/costs', { [costsUrl()]: () => Response.json(reply()) });
    await screen.findAllByText('15/10/2026');
    await userEvent.clear(field(t.filters.from));
    await userEvent.type(field(t.filters.from), '2999-01-01');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    expect(await screen.findByText(t.errors.fromAfterTo)).toBeInTheDocument();
    expect(field(t.filters.from)).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(field(t.filters.from)).toHaveFocus());
    expect(costCalls(r.calls)).toHaveLength(1);
  });

  it('more than 366 days → error on the To field, and no request is sent', async () => {
    const r = renderApp('/ai/costs', { [costsUrl()]: () => Response.json(reply()) });
    await screen.findAllByText('15/10/2026');
    await userEvent.clear(field(t.filters.from));
    await userEvent.type(field(t.filters.from), '2000-01-01');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    expect(await screen.findByText(t.errors.tooLong)).toBeInTheDocument();
    expect(field(t.filters.to)).toHaveAttribute('aria-invalid', 'true');
    expect(costCalls(r.calls)).toHaveLength(1);
  });

  it('a link with a bad range shows the field error and asks nothing', async () => {
    const r = renderApp('/ai/costs?from=2026-10-27&to=2026-10-01', {});
    expect(await screen.findByText(t.errors.fromAfterTo)).toBeInTheDocument();
    expect(costCalls(r.calls)).toHaveLength(0);
  });

  it('an API 400 on the range is put on the date field it names', async () => {
    renderApp('/ai/costs?from=2026-10-01&to=2026-10-02', {
      [costsUrl('2026-10-01', '2026-10-02')]: () => problem(400, 'validation-failed', { violations: ['to: The range must be at most 366 days'] }),
    });
    expect(await screen.findByText(t.errors.tooLong)).toBeInTheDocument();
    expect(field(t.filters.to)).toHaveAttribute('aria-invalid', 'true');
  });

  it('an API 400 that names no date field goes in a banner', async () => {
    renderApp('/ai/costs', { [costsUrl()]: () => problem(400, 'validation-failed', { violations: ['group_by: Invalid option'] }) });
    expect(await screen.findByText(/group_by: Invalid option/)).toBeInTheDocument();
  });

  it('nothing in the range → the empty text', async () => {
    renderApp('/ai/costs', { [costsUrl()]: () => Response.json({ items: [], total: totals({ calls: 0, cost_usd: '0.00000000', cost_vnd: 0 }) }) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('403 shows the forbidden text, not the generic list error', async () => {
    renderApp('/ai/costs', { [costsUrl()]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
  });
});
