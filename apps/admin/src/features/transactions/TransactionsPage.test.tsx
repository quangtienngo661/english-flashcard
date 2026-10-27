import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.transactions;
const ADMIN = makeMe({
  id: 'me-1', email: 'admin@wordmet.com', staff_role: 'admin',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'roles.manage', 'settings.manage', 'entitlements.grant'],
});
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});
const LIST = 'GET /v1/admin/transactions?page_size=50';
const tx = (id: string, fields: Record<string, unknown>) => ({
  id, kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
  period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'pending', provider: 'fake',
  provider_transaction_id: 'fake_txn_8f2c41d9a7', user: { id: '6b1f0000-0000-4000-8000-00000000e42a', email: 'lan@example.com' }, ...fields,
});
const RENEWAL = tx('t1', {});
const GRANT = tx('g1', { kind: 'grant', interval: null, amount_minor: null, currency: null, status: 'succeeded', provider: null,
  provider_transaction_id: null, occurred_at: '2026-10-22T03:20:00.000Z', period_start: '2026-10-22T03:20:00.000Z',
  period_end: '2026-11-21T17:00:00.000Z', user: { id: 'u2', email: 'ngoc.tran@example.com' } });
const page = (items: unknown[], next: string | null = null) => () => Response.json({ items, next_page_token: next });

describe('TransactionsPage (A/90–A/90c)', () => {
  it('the admin menu has Giao dịch; an editor neither sees it nor opens it', async () => {
    renderApp('/transactions', { [LIST]: page([RENEWAL]) }, ADMIN);
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.transactions })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: vi.nav.transactions }).length).toBeGreaterThan(0);
  });

  it('an editor has no menu entry; /transactions keeps the title, says there is no access, and calls no API', async () => {
    const r = renderApp('/transactions', { 'GET /v1/admin/content/uploads?page_size=20': page([]) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.transactions);
    expect(screen.queryByRole('link', { name: vi.nav.transactions })).toBeNull();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/transactions'))).toBe(false);
  });

  it('rows: learner, kind, plan and period, time, amount and gateway, status', async () => {
    renderApp('/transactions', { [LIST]: page([RENEWAL, GRANT]) }, ADMIN);
    const renewal = (await screen.findAllByText('lan@example.com'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(renewal).getByText(t.kinds.renewal)).toBeInTheDocument();
    expect(within(renewal).getByText('Pro · theo tháng')).toBeInTheDocument();
    expect(within(renewal).getByText('15/10 → 14/11/2026')).toBeInTheDocument();
    expect(within(renewal).getByText(/^99\.000\s₫$/)).toBeInTheDocument();
    expect(within(renewal).getByText('Giả (thử) · fake_txn_8f2c41d9a7')).toBeInTheDocument();
    expect(within(renewal).getByText(t.statuses.pending)).toBeInTheDocument();
    const grant = (await screen.findAllByText('ngoc.tran@example.com'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(grant).getByText(t.kinds.grant)).toBeInTheDocument();
    expect(within(grant).getByText(t.noGateway)).toBeInTheDocument();
    expect(screen.getAllByText('2 giao dịch · mới nhất trước · ngày giờ theo múi giờ Asia/Ho_Chi_Minh').length).toBeGreaterThan(0);
  });

  it('filters become query params: email, kind, and the Vietnam day boundaries of Từ ngày / Tới ngày (inclusive)', async () => {
    const want = '/v1/admin/transactions?email=lan%40example.com&kind=renewal&from=2026-10-01T00%3A00%3A00%2B07%3A00&to=2026-10-24T00%3A00%3A00%2B07%3A00&page_size=50';
    const r = renderApp('/transactions', { [LIST]: page([RENEWAL]), [`GET ${want}`]: page([RENEWAL]) }, ADMIN);
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.email), 'lan@example.com');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.filters.kind) }));
    await userEvent.click(await screen.findByRole('option', { name: t.kinds.renewal }));
    await userEvent.type(screen.getByLabelText(t.filters.from), '2026-10-01');
    await userEvent.type(screen.getByLabelText(t.filters.to), '2026-10-23');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    await waitFor(() => expect(r.count('GET', want)).toBe(1));
  });

  it('Chi tiết opens the read-only detail: learner id, amount with currency, gateway environment, ids', async () => {
    renderApp('/transactions', { [LIST]: page([RENEWAL]) }, ADMIN);
    await screen.findAllByText('lan@example.com');
    await userEvent.click(screen.getAllByRole('button', { name: t.detailFor.replace('{email}', 'lan@example.com') })[0]);
    const dialog = await screen.findByRole('dialog', { name: t.detail.title });
    expect(within(dialog).getByText(/^99\.000\s₫ \(VND\)$/)).toBeInTheDocument();
    expect(within(dialog).getByText('Giả (thử) · môi trường test')).toBeInTheDocument();
    expect(within(dialog).getByText('fake_txn_8f2c41d9a7')).toBeInTheDocument();
    expect(within(dialog).getByText(RENEWAL.user.id)).toBeInTheDocument();
    expect(within(dialog).getByText(t.detail.readOnly)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t.detail.close }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('A/90c: nothing matches; a load error offers retry', async () => {
    renderApp('/transactions', { [LIST]: page([]) }, ADMIN);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('a load error offers retry', async () => {
    renderApp('/transactions', { [LIST]: () => problem(500, '') }, ADMIN);
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
  });
});
