import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.refunds;
const LIST = 'GET /v1/admin/practice/refunds?page_size=20';
const json = (body: unknown) => () => Response.json(body);
const ADMIN = makeMe({ staff_role: 'admin', permissions: ['content.edit', 'settings.manage'] });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });
const LAN = { id: 'u-lan', email: 'lan@example.com', system: false };
const MINH = { id: 'u-minh', email: 'minh@example.com', system: false };
const item = (over: Record<string, unknown> = {}) => ({
  report_id: '5b1f0000-0000-4000-8000-0000000000a1', user_id: LAN.id, user: LAN, resolved_by: MINH.id, resolved_by_role: 'editor',
  resolved_by_user: MINH, self_resolved: false, refunded: true, resolved_at: '2026-10-18T11:02:00.000Z', ...over,
});
const page = (items: unknown[], next: string | null = null) => ({ items, next_page_token: next });
const rowOf = async (text: string) => (await screen.findAllByText(text))[0]!.closest('tr, [data-testid="card"]') as HTMLElement;

describe('refunds list', { timeout: 20_000 }, () => {
  it('§6.9: columns show the report link, learner, resolver, role and time; the note sits under the list', async () => {
    renderApp('/refunds', { [LIST]: json(page([item()])) }, ADMIN);
    const row = await rowOf('lan@example.com');
    expect(within(row).getByRole('link')).toHaveAttribute('href', '/reports/5b1f0000-0000-4000-8000-0000000000a1');
    expect(within(row).getByText('minh@example.com')).toBeInTheDocument();
    expect(within(row).getByText('editor')).toBeInTheDocument();
    expect(within(row).getByText(t.refunded.true)).toBeInTheDocument();
    expect(within(row).queryByText(t.selfResolved)).toBeNull();
    expect(screen.getAllByText(t.note).length).toBeGreaterThan(0);
  });

  it('§6.9: refund state reads true = Đã trả, false = Không trả, null = Đang thử lại; a self-resolved report is marked', async () => {
    renderApp('/refunds', {
      [LIST]: json(page([
        item({ report_id: 'r-false', user: { id: 'u2', email: 'ngoc@example.com', system: false }, refunded: false }),
        item({ report_id: 'r-null', user: { id: 'u3', email: 'hoa@example.com', system: false }, refunded: null }),
        item({ report_id: 'r-self', user: { id: 'u4', email: 'tam@example.com', system: false }, resolved_by_user: { id: 'u4', email: 'tam@example.com', system: false }, self_resolved: true }),
      ])),
    }, ADMIN);
    expect(within(await rowOf('ngoc@example.com')).getByText(t.refunded.false)).toBeInTheDocument();
    expect(within(await rowOf('hoa@example.com')).getByText(t.refunded.null)).toBeInTheDocument();
    expect(within(await rowOf('tam@example.com')).getByText(t.selfResolved)).toBeInTheDocument();
  });

  it('§6.9: a resolver the API cannot name shows as the system label or a dash', async () => {
    renderApp('/refunds', { [LIST]: json(page([item({ resolved_by_user: { id: 'x', email: null, system: true } })])) }, ADMIN);
    expect(within(await rowOf('lan@example.com')).getByText(vi.common.system)).toBeInTheDocument();
  });

  it('§6.9: the empty list says "Chưa có lần xác nhận lỗi nào trong khoảng này."', async () => {
    renderApp('/refunds', { [LIST]: json(page([])) }, ADMIN);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('§6.9: the filters in the URL go into the request, dates as Vietnam days with an exclusive end', async () => {
    const want = '/v1/admin/practice/refunds?resolved_by_email=minh%40example.com&from=2026-10-01T00%3A00%3A00%2B07%3A00&to=2026-10-24T00%3A00%3A00%2B07%3A00&page_size=20';
    const r = renderApp('/refunds?resolved_by_email=minh%40example.com&from=2026-10-01&to=2026-10-23', { [`GET ${want}`]: json(page([])) }, ADMIN);
    await waitFor(() => expect(r.count('GET', want)).toBe(1));
  });

  it('§6.9: an invalid date in the URL is dropped from the request', async () => {
    const r = renderApp('/refunds?from=nope&to=2026-13-45', { [LIST]: json(page([])) }, ADMIN);
    await waitFor(() => expect(r.count('GET', '/v1/admin/practice/refunds?page_size=20')).toBe(1));
  });

  it('§6.9: typing the filters and applying sends them', async () => {
    const want = '/v1/admin/practice/refunds?resolved_by_email=minh%40example.com&from=2026-10-01T00%3A00%3A00%2B07%3A00&to=2026-10-24T00%3A00%3A00%2B07%3A00&page_size=20';
    const r = renderApp('/refunds', { [LIST]: json(page([item()])), [`GET ${want}`]: json(page([])) }, ADMIN);
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.resolver), 'minh@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.from), '2026-10-01');
    await userEvent.type(screen.getByLabelText(t.filters.to), '2026-10-23');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    await waitFor(() => expect(r.count('GET', want)).toBe(1));
  });

  it('after Back the filter boxes match the URL again', async () => {
    const r = renderApp('/refunds', { [LIST]: json(page([item()])), [`GET /v1/admin/practice/refunds?resolved_by_email=minh%40example.com&page_size=20`]: json(page([])) }, ADMIN);
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.resolver), 'minh@example.com');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    await waitFor(() => expect(r.router.state.location.search).toContain('minh'));
    await r.router.navigate(-1);
    await waitFor(() => expect(r.router.state.location.search).toBe(''));
    await waitFor(() => expect(screen.getByLabelText(t.filters.resolver)).toHaveValue(''));
  });

  it('§6.9: Tải thêm sends the page token', async () => {
    const r = renderApp('/refunds', {
      [LIST]: json(page([item()], 'tok1')),
      'GET /v1/admin/practice/refunds?page_size=20&page_token=tok1': json(page([item({ report_id: 'r2', user: { id: 'u9', email: 'bao@example.com', system: false } })])),
    }, ADMIN);
    await screen.findAllByText('lan@example.com');
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    expect((await screen.findAllByText('bao@example.com')).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/practice/refunds?page_size=20&page_token=tok1')).toBe(1);
  });

  it('an editor at /refunds sees the no-access view and the API is not called', async () => {
    const r = renderApp('/refunds', { 'GET /v1/admin/content/uploads?page_size=20': json(page([])) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.refunds);
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/practice/refunds'))).toBe(false);
  });
});
