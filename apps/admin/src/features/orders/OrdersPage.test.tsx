import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

vitest.setConfig({ testTimeout: 30_000 });

const t = vi.orders;
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant', 'users.read', 'ai.view'],
});
const LIST = 'GET /v1/admin/orders?page_size=50';
const USER = { id: '6b1f0000-0000-4000-8000-00000000e42a', email: 'lan@example.com' };

const order = (id: string, over: Record<string, unknown> = {}) => ({
  id, status: 'paid', review_reason: null, needs_attention: false, period_months: 3, amount: 199000, description: 'WM0XSNJGK', paid_via: 'webhook',
  created_at: '2026-11-05T03:00:00.000Z', expires_at: '2026-11-05T03:15:00.000Z', user: USER, ...over,
});
const PERIOD = { id: 'pp1', starts_at: '2026-11-05T03:02:00.000Z', ends_at: '2027-02-04T17:00:00.000Z', revoked_at: null, revoke_reason: null };
const PAYMENT = {
  id: 'pay1', source: 'webhook', reference: 'FT26309ABC', amount: 199000, provider_time: '2026-11-05 10:02:00', outcome: 'opened-period', period_id: 'pp1',
  confirmed_by: null, reason: null, received_at: '2026-11-05T03:02:05.000Z',
};
const detail = (id: string, over: Record<string, unknown> = {}) => ({
  ...order(id), order_code: 1000000123, payments: [PAYMENT], periods: [PERIOD], refund: null, resolution: null,
  pro: { until: '2027-02-04T17:00:00.000Z', sources: [{ kind: 'prepaid', id: 'pp1', starts_at: PERIOD.starts_at, ends_at: PERIOD.ends_at }] },
  ...over,
});
const page = (items: unknown[], next: string | null = null) => () => Response.json({ items, next_page_token: next });
const PAID = order('o-paid');
const REVIEW = order('o-review', { status: 'needs_review', review_reason: 'amount-short', needs_attention: true, paid_via: null, description: 'WM0XSNJGM', user: { id: 'u2', email: 'ngoc.tran@example.com' } });
const PENDING = order('o-pending', { status: 'pending', paid_via: null, description: 'WM0XSNJGN', user: { id: 'u3', email: 'minh@example.com' } });
const dong = (n: number) => new RegExp(`${n.toLocaleString('vi-VN')}\\s₫`);

async function openDetail(email: string) {
  await userEvent.click((await screen.findAllByRole('button', { name: t.detailFor.replace('{email}', email) }))[0]);
  return screen.findByRole('dialog', { name: t.detail.title });
}

describe('OrdersPage (launch prep B design §3.9)', () => {
  it('the admin menu has Đơn hàng; an editor neither sees it nor opens it, and no order is asked for', async () => {
    renderApp('/orders', { [LIST]: page([PAID]) });
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.orders })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: vi.nav.orders }).length).toBeGreaterThan(0);
    const editor = renderApp('/orders', { 'GET /v1/admin/content/uploads?page_size=20': page([]) }, EDITOR);
    expect(await screen.findAllByText(vi.noAccess.title)).not.toHaveLength(0);
    expect(editor.calls.some((c) => c.path.startsWith('/v1/admin/orders'))).toBe(false);
  });

  it('rows: learner, period and amount, the transfer note, when, status; a needs_review order carries its reason', async () => {
    renderApp('/orders', { [LIST]: page([PAID, REVIEW]) });
    const paid = (await screen.findAllByText('lan@example.com'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(paid).getByText(new RegExp(`^3 tháng · ${(199000).toLocaleString('vi-VN')}\\s₫$`))).toBeInTheDocument();
    expect(within(paid).getByText('WM0XSNJGK')).toBeInTheDocument();
    expect(within(paid).getByText(t.statuses.paid)).toBeInTheDocument();
    const review = (await screen.findAllByText('ngoc.tran@example.com'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(review).getByText(t.statuses.needs_review)).toBeInTheDocument();
    expect(within(review).getByText(t.reasons['amount-short'])).toBeInTheDocument();
    expect(screen.getAllByText('2 đơn · mới nhất trước · ngày giờ theo múi giờ Asia/Ho_Chi_Minh').length).toBeGreaterThan(0);
  });

  it('filters become query params: status, Cần xem, email, the Vietnam day boundaries of the dates (inclusive) and the WM… note', async () => {
    const want = '/v1/admin/orders?status=needs_review&needs_attention=true&email=lan%40example.com&from=2026-11-01T00%3A00%3A00%2B07%3A00&to=2026-11-06T00%3A00%3A00%2B07%3A00&q=WM0X&page_size=50';
    const r = renderApp('/orders', { [LIST]: page([PAID]), [`GET ${want}`]: page([REVIEW]) });
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.email), 'lan@example.com');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.filters.status) }));
    await userEvent.click(await screen.findByRole('option', { name: t.statuses.needs_review }));
    await userEvent.click(screen.getByRole('checkbox', { name: t.filters.needsAttention }));
    await userEvent.type(screen.getByLabelText(t.filters.from), '2026-11-01');
    await userEvent.type(screen.getByLabelText(t.filters.to), '2026-11-05');
    await userEvent.type(screen.getByLabelText(t.filters.code), 'wm0x');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    await waitFor(() => expect(r.count('GET', want)).toBe(1));
    expect((await screen.findAllByText('ngoc.tran@example.com')).length).toBeGreaterThan(0);
  });

  it('nothing matches → the empty text; a load error offers retry', async () => {
    renderApp('/orders', { [LIST]: page([]) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    const failing = renderApp('/orders', { [LIST]: () => problem(500, '') });
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    failing.unmount();
  });

  it('Chi tiết: payments, periods with their last day, the learner\'s Pro now, the reason, the transfer note and the order code', async () => {
    renderApp('/orders', { [LIST]: page([PAID]), 'GET /v1/admin/orders/o-paid': () => Response.json(detail('o-paid')) });
    const dialog = await openDetail('lan@example.com');
    expect(await within(dialog).findByText('FT26309ABC')).toBeInTheDocument();
    expect(within(dialog).getByText('1000000123')).toBeInTheDocument();
    expect(within(dialog).getByText('WM0XSNJGK')).toBeInTheDocument();
    expect(within(dialog).getByText(t.outcomes['opened-period'])).toBeInTheDocument();
    expect(within(dialog).getAllByText(t.sources.webhook).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('05/11/2026 – 04/02/2027').length).toBeGreaterThan(0);
    expect(within(dialog).getByText(t.detail.proUntil.replace('{date}', '04/02/2027'))).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(`^${t.proSources.prepaid} · 05/11/2026 – 04/02/2027$`))).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: t.actions.confirm })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: t.actions.cancel })).toBeNull();
  });

  it('a needs_review order shows why and the refund information kept for a deleted account; a closed one shows how it was closed', async () => {
    const refund = { payer_name: 'NGUYEN VAN A', payer_account: '0123456789', payer_bank: 'MB Bank', saved_at: '2026-11-06T03:00:00.000Z' };
    renderApp('/orders', {
      [LIST]: page([REVIEW]),
      'GET /v1/admin/orders/o-review': () => Response.json(detail('o-review', {
        status: 'needs_review', review_reason: 'account-deleted', paid_via: null, periods: [], pro: null, refund,
        payments: [{ ...PAYMENT, outcome: 'refund-needed', period_id: null }],
      })),
    });
    const dialog = await openDetail('ngoc.tran@example.com');
    expect(await within(dialog).findByText(t.reasons['account-deleted'])).toBeInTheDocument();
    expect(within(dialog).getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(within(dialog).getByText('0123456789')).toBeInTheDocument();
    expect(within(dialog).getByText('MB Bank')).toBeInTheDocument();
    expect(within(dialog).getByText(t.outcomes['refund-needed'])).toBeInTheDocument();
  });

  describe('Đã nhận tiền', () => {
    const pendingDetail = () => detail('o-pending', { status: 'pending', paid_via: null, payments: [], periods: [], pro: null, user: { id: 'u3', email: 'minh@example.com' }, description: 'WM0XSNJGN' });
    const routes = (extra: Record<string, () => Response> = {}) => ({
      [LIST]: page([PENDING]), 'GET /v1/admin/orders/o-pending': () => Response.json(pendingDetail()), ...extra,
    });

    it('only an order with no period offers it; the form needs the bank reference, the amount and a reason, and sends nothing until it has them', async () => {
      const r = renderApp('/orders', routes());
      const dialog = await openDetail('minh@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.confirm }));
      const form = await screen.findByRole('dialog', { name: t.confirm.title });
      await userEvent.click(within(form).getByRole('button', { name: t.confirm.submit }));
      expect(await within(form).findByText(t.confirm.invalid)).toBeInTheDocument();
      expect(r.calls.some((c) => c.method === 'POST' && c.path.startsWith('/v1/admin/'))).toBe(false);
    });

    it('sends the reference, the amount as a number and the reason with an Idempotency-Key, then closes and reads the order again', async () => {
      let paid = false;
      const r = renderApp('/orders', {
        [LIST]: page([PENDING]),
        'GET /v1/admin/orders/o-pending': () => Response.json(paid ? detail('o-pending', { user: { id: 'u3', email: 'minh@example.com' }, paid_via: 'manual' }) : pendingDetail()),
        'POST /v1/admin/orders/o-pending/confirm-payment': () => { paid = true; return Response.json(detail('o-pending', { paid_via: 'manual' })); },
      });
      const dialog = await openDetail('minh@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.confirm }));
      const form = await screen.findByRole('dialog', { name: t.confirm.title });
      await userEvent.type(within(form).getByLabelText(t.confirm.reference), 'FT2611-BANK');
      await userEvent.type(within(form).getByLabelText(t.confirm.amount), '199000');
      await userEvent.type(within(form).getByLabelText(t.confirm.reason), 'thấy trong app ngân hàng');
      await userEvent.dblClick(within(form).getByRole('button', { name: t.confirm.submit }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: t.confirm.title })).toBeNull());
      const posts = r.calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/orders/o-pending/confirm-payment');
      expect(posts).toHaveLength(1);
      expect(posts[0].body).toEqual({ reference: 'FT2611-BANK', amount: 199000, reason: 'thấy trong app ngân hàng' });
      expect(posts[0].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
      await waitFor(() => expect(r.count('GET', '/v1/admin/orders/o-pending')).toBeGreaterThan(1));
    });

    it('LB1E5: a 409 order-already-paid says "Đơn đã có kỳ." inside the form, which stays open', async () => {
      renderApp('/orders', routes({ 'POST /v1/admin/orders/o-pending/confirm-payment': () => problem(409, 'order-already-paid') }));
      const dialog = await openDetail('minh@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.confirm }));
      const form = await screen.findByRole('dialog', { name: t.confirm.title });
      await userEvent.type(within(form).getByLabelText(t.confirm.reference), 'FT2611-BANK');
      await userEvent.type(within(form).getByLabelText(t.confirm.amount), '199000');
      await userEvent.type(within(form).getByLabelText(t.confirm.reason), 'lần hai');
      await userEvent.click(within(form).getByRole('button', { name: t.confirm.submit }));
      expect(await within(form).findByText(vi.errors['order-already-paid'])).toBeInTheDocument();
      expect(vi.errors['order-already-paid']).toBe('Đơn đã có kỳ.');
      expect(screen.getByRole('dialog', { name: t.confirm.title })).toBeInTheDocument();
    });
  });

  describe('Hủy đơn', () => {
    it('is offered for a pending order only; confirming posts once, and a 409 order-not-pending is told', async () => {
      const r = renderApp('/orders', {
        [LIST]: page([PENDING]),
        'GET /v1/admin/orders/o-pending': () => Response.json(detail('o-pending', { status: 'pending', paid_via: null, payments: [], periods: [], pro: null, user: { id: 'u3', email: 'minh@example.com' } })),
        'POST /v1/admin/orders/o-pending/cancel': () => problem(409, 'order-not-pending'),
      });
      const dialog = await openDetail('minh@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.cancel }));
      const confirm = await screen.findByRole('dialog', { name: t.cancel.title });
      await userEvent.click(within(confirm).getByRole('button', { name: t.cancel.confirm }));
      expect(await within(confirm).findByText(vi.errors['order-not-pending'])).toBeInTheDocument();
      expect(r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/cancel'))).toHaveLength(1);
    });

    it('a cancel that works closes the dialogs and the list reads again', async () => {
      let cancelled = false;
      const r = renderApp('/orders', {
        [LIST]: () => Response.json({ items: [cancelled ? order('o-pending', { status: 'cancelled' }) : PENDING], next_page_token: null }),
        'GET /v1/admin/orders/o-pending': () => Response.json(detail('o-pending', { status: cancelled ? 'cancelled' : 'pending', paid_via: null, payments: [], periods: [], pro: null, user: { id: 'u3', email: 'minh@example.com' } })),
        'POST /v1/admin/orders/o-pending/cancel': () => { cancelled = true; return Response.json(detail('o-pending', { status: 'cancelled' })); },
      });
      const dialog = await openDetail('minh@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.cancel }));
      await userEvent.click(within(await screen.findByRole('dialog', { name: t.cancel.title })).getByRole('button', { name: t.cancel.confirm }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: t.cancel.title })).toBeNull());
      await waitFor(() => expect(r.count('GET', LIST.replace('GET ', ''))).toBeGreaterThan(1));
    });
  });

  describe('Đã xử lý', () => {
    const reviewDetail = () => detail('o-review', {
      status: 'needs_review', review_reason: 'account-deleted', paid_via: null, periods: [], pro: null, user: { id: 'u2', email: 'ngoc.tran@example.com' },
    });

    it('a needs_review order: the note is required; it posts {note} with an Idempotency-Key', async () => {
      const r = renderApp('/orders', {
        [LIST]: page([REVIEW]), 'GET /v1/admin/orders/o-review': () => Response.json(reviewDetail()),
        'POST /v1/admin/orders/o-review/resolve': () => Response.json(detail('o-review', { status: 'closed' })),
      });
      const dialog = await openDetail('ngoc.tran@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.resolve }));
      const form = await screen.findByRole('dialog', { name: t.resolve.title });
      await userEvent.click(within(form).getByRole('button', { name: t.resolve.submit }));
      expect(await within(form).findByText(t.resolve.invalid)).toBeInTheDocument();
      expect(r.calls.some((c) => c.method === 'POST' && c.path.startsWith('/v1/admin/'))).toBe(false);
      await userEvent.type(within(form).getByLabelText(t.resolve.note), 'Đã hoàn 199.000 ₫ qua ngân hàng ngày 06/11');
      await userEvent.click(within(form).getByRole('button', { name: t.resolve.submit }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: t.resolve.title })).toBeNull());
      const post = r.calls.find((c) => c.method === 'POST' && c.path === '/v1/admin/orders/o-review/resolve');
      expect(post?.body).toEqual({ note: 'Đã hoàn 199.000 ₫ qua ngân hàng ngày 06/11' });
      expect(post?.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('a paid order is offered it only when it carries a flag; a plain paid order is not', async () => {
      const flagged = renderApp('/orders', {
        [LIST]: page([PAID]),
        'GET /v1/admin/orders/o-paid': () => Response.json(detail('o-paid', { review_reason: 'extra-payment', needs_attention: true })),
      });
      const open = await openDetail('lan@example.com');
      expect(await within(open).findByRole('button', { name: t.actions.resolve })).toBeInTheDocument();
      flagged.unmount();
      renderApp('/orders', { [LIST]: page([PAID]), 'GET /v1/admin/orders/o-paid': () => Response.json(detail('o-paid')) });
      const plain = await openDetail('lan@example.com');
      await within(plain).findByText('FT26309ABC');
      expect(within(plain).queryByRole('button', { name: t.actions.resolve })).toBeNull();
    });
  });

  describe('Thu hồi kỳ', () => {
    it('the reason is required; it posts {reason} for that period with an Idempotency-Key, and a revoked period shows as revoked without the button', async () => {
      const revokedPeriod = { ...PERIOD, id: 'pp2', revoked_at: '2026-11-07T03:00:00.000Z', revoke_reason: 'ghi nhầm' };
      const r = renderApp('/orders', {
        [LIST]: page([PAID]),
        'GET /v1/admin/orders/o-paid': () => Response.json(detail('o-paid', { periods: [PERIOD, revokedPeriod] })),
        'POST /v1/admin/prepaid-periods/pp1/revoke': () => Response.json({ id: 'pp1', revoked_at: '2026-11-08T03:00:00.000Z' }),
      });
      const dialog = await openDetail('lan@example.com');
      const buttons = await within(dialog).findAllByRole('button', { name: t.actions.revoke });
      expect(buttons).toHaveLength(1);
      expect(within(dialog).getByText(new RegExp(`^${t.periods.revoked.replace('{date}', '07/11/2026')}`))).toBeInTheDocument();
      await userEvent.click(buttons[0]);
      const form = await screen.findByRole('dialog', { name: t.revoke.title });
      await userEvent.click(within(form).getByRole('button', { name: t.revoke.submit }));
      expect(await within(form).findByText(t.revoke.invalid)).toBeInTheDocument();
      await userEvent.type(within(form).getByLabelText(t.revoke.reason), 'ghi nhầm người học');
      await userEvent.click(within(form).getByRole('button', { name: t.revoke.submit }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: t.revoke.title })).toBeNull());
      const post = r.calls.find((c) => c.method === 'POST' && c.path === '/v1/admin/prepaid-periods/pp1/revoke');
      expect(post?.body).toEqual({ reason: 'ghi nhầm người học' });
      expect(post?.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('a 409 period-already-revoked is told in the form', async () => {
      renderApp('/orders', {
        [LIST]: page([PAID]), 'GET /v1/admin/orders/o-paid': () => Response.json(detail('o-paid')),
        'POST /v1/admin/prepaid-periods/pp1/revoke': () => problem(409, 'period-already-revoked'),
      });
      const dialog = await openDetail('lan@example.com');
      await userEvent.click(await within(dialog).findByRole('button', { name: t.actions.revoke }));
      const form = await screen.findByRole('dialog', { name: t.revoke.title });
      await userEvent.type(within(form).getByLabelText(t.revoke.reason), 'lần hai');
      await userEvent.click(within(form).getByRole('button', { name: t.revoke.submit }));
      expect(await within(form).findByText(vi.errors['period-already-revoked'])).toBeInTheDocument();
    });
  });

  it('the amount in the list uses dong', async () => {
    renderApp('/orders', { [LIST]: page([PAID]) });
    expect((await screen.findAllByText(dong(199000))).length).toBeGreaterThan(0);
  });
});
