import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, rateLimited, type Call } from '../../auth/test-support';
import { ME_ADMIN, renderApp } from '../staff/test-utils';

const t = vi.entitlements;
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const ADMIN_ID = '7c2f0000-0000-4000-8000-00000000a001';
const G1 = '9a000000-0000-4000-8000-000000000001';
const G2 = '9a000000-0000-4000-8000-000000000002';
const LIST = 'GET /v1/admin/entitlements/grants?page_size=20';
const USAGE = 'GET /v1/admin/entitlements/ai-usage';
const REVOKE = (id: string) => `POST /v1/admin/entitlements/grants/${id}/revoke`;
const PATCH = (id: string) => `PATCH /v1/admin/entitlements/grants/${id}`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit', 'entitlements.grant'] });

const grant = (over: Record<string, unknown> = {}) => ({
  id: G1, user_id: LAN_ID, kind: 'plan', plan: 'pro', limits: null,
  // 22/10/2026 00:00 → last day 21/11/2026 (both +07:00)
  starts_at: '2026-10-21T17:00:00.000Z', ends_at: '2026-11-21T17:00:00.000Z', reason: 'Giải IELTS tháng 10',
  granted_by: ADMIN_ID, granted_by_role: 'admin', revoked_at: null, revoked_by: null, revoke_reason: null, paid_renewal_action: null,
  created_at: '2026-10-21T10:00:00.000Z', user: { id: LAN_ID, email: 'lan@example.com' }, granted_by_user: { id: ADMIN_ID, email: 'an.admin@wordmet.com' },
  revoked_by_user: null, status: 'active', last_change: null, ...over,
});
const page = (items: unknown[], next: string | null = null) => ({ items, next_page_token: next });
const usage = { date: '2026-10-27', used: 812, confirmed: 800, reserved: 12, cap: 1000, alert_percent: 80, alert_reached: true, enabled: true };
const calls = (all: Call[], method: string, prefix: string) => all.filter((c) => c.method === method && c.path.startsWith(prefix));

describe('grants list', { timeout: 20_000 }, () => {
  it('§6.11: the list asks for 20, newest first, and shows learner, kind, numbers, dates, grantor and reason', async () => {
    const r = renderApp('/entitlements', {
      [LIST]: () => json(page([
        grant(),
        grant({
          id: G2, kind: 'limits', plan: null, limits: { practice_sessions_per_day: 30, ai_practice_per_cycle: 100 },
          granted_by_role: 'editor', granted_by_user: { id: 'e1', email: 'minh@wordmet.com' }, reason: 'Lớp thử',
        }),
      ])),
      [USAGE]: () => json(usage),
    });
    expect((await screen.findAllByText('lan@example.com')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.kinds.plan).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.kinds.limits).length).toBeGreaterThan(0);
    expect(screen.getAllByText('30 phiên luyện mỗi ngày').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100 lượt câu AI mỗi tháng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('22/10/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('21/11/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('an.admin@wordmet.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Giải IELTS tháng 10').length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/entitlements/grants?page_size=20')).toBe(1);
  });

  it('§6.11: the status badge follows the API status, with five labels including "Bị thay thế"', async () => {
    renderApp('/entitlements', {
      [LIST]: () => json(page([
        grant({ id: 'a', status: 'active' }),
        grant({ id: 'b', status: 'scheduled' }),
        grant({ id: 'c', status: 'revoked', revoked_at: '2026-10-22T01:00:00.000Z', revoke_reason: 'Nhầm người' }),
        grant({ id: 'd', status: 'expired' }),
        grant({ id: 'e', status: 'replaced', revoked_at: '2026-10-22T01:00:00.000Z', revoke_reason: 'replaced' }),
      ])),
      [USAGE]: () => json(usage),
    });
    await screen.findAllByText(t.statuses.replaced);
    for (const label of Object.values(t.statuses)) expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    expect(vi.entitlements.statuses.replaced).toBe('Bị thay thế');
  });

  it('§6.11: [Lọc] writes the four filters in the URL and asks the API with them', async () => {
    const asked = 'GET /v1/admin/entitlements/grants?user_email=lan%40example.com&granted_by_email=an%40wordmet.com&active=true&expiring_within_days=7&page_size=20';
    const r = renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [asked]: () => json(page([])), [USAGE]: () => json(usage) });
    await screen.findAllByText('lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.learner), 'lan@example.com');
    await userEvent.type(screen.getByLabelText(t.filters.grantedBy), 'an@wordmet.com');
    await userEvent.click(screen.getByRole('button', { name: new RegExp(t.filters.active) }));
    await userEvent.click(await screen.findByRole('option', { name: t.filters.activeYes }));
    await userEvent.type(screen.getByLabelText(t.filters.expiring), '7');
    await userEvent.click(screen.getByRole('button', { name: t.filters.apply }));
    await waitFor(() => expect(r.count('GET', asked.slice(4))).toBe(1));
    expect(r.router.state.location.search).toBe('?user_email=lan%40example.com&granted_by_email=an%40wordmet.com&active=true&expiring_within_days=7');
    expect(await screen.findByText(t.emptyFiltered)).toBeInTheDocument();
  });

  it('§6.11: a link with filters in the URL asks with them and fills the boxes', async () => {
    const asked = 'GET /v1/admin/entitlements/grants?user_email=lan%40example.com&active=false&page_size=20';
    const r = renderApp('/entitlements?user_email=lan%40example.com&active=false', { [asked]: () => json(page([grant({ status: 'expired' })])), [USAGE]: () => json(usage) });
    await screen.findAllByText('lan@example.com');
    expect(r.count('GET', asked.slice(4))).toBe(1);
    expect(screen.getByLabelText(t.filters.learner)).toHaveValue('lan@example.com');
  });

  it('§6.11: "Tải thêm" sends the page_token of the first page', async () => {
    const r = renderApp('/entitlements', {
      [LIST]: () => json(page([grant()], 'tok-2')),
      'GET /v1/admin/entitlements/grants?page_size=20&page_token=tok-2': () => json(page([grant({ id: G2, user: { id: 'x', email: 'binh@example.com' } })])),
      [USAGE]: () => json(usage),
    });
    await userEvent.click(await screen.findByRole('button', { name: vi.common.loadMore }));
    expect((await screen.findAllByText('binh@example.com')).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/entitlements/grants?page_size=20&page_token=tok-2')).toBe(1);
  });

  it('§6.11: an empty list says nothing was granted yet', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([])), [USAGE]: () => json(usage) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('§6.11: the "Lượt AI hôm nay" block shows for an admin (settings.manage) as 812/1.000', async () => {
    const r = renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [USAGE]: () => json(usage) });
    expect(await screen.findByText('Lượt AI hôm nay: 812/1.000')).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/entitlements/ai-usage')).toBe(1);
  });

  it('§6.11: an editor sees the list but no block, and no ai-usage request is sent', async () => {
    const r = renderApp('/entitlements', { [LIST]: () => json(page([grant()])) }, EDITOR);
    expect((await screen.findAllByText('lan@example.com')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Lượt AI hôm nay/)).not.toBeInTheDocument();
    expect(calls(r.calls, 'GET', '/v1/admin/entitlements/ai-usage')).toHaveLength(0);
  });

  it('§6.11: a user without entitlements.grant sees the no-access card and no request goes out', async () => {
    const r = renderApp('/entitlements', {}, makeMe({ staff_role: 'editor', permissions: ['content.edit'] }));
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(calls(r.calls, 'GET', '/v1/admin/entitlements')).toHaveLength(0);
  });

  it('§6.11: only grants that can still change get the two row actions', async () => {
    renderApp('/entitlements', {
      [LIST]: () => json(page([
        grant({ id: 'a', user: { id: 'a', email: 'a@example.com' } }),
        grant({ id: 'b', status: 'expired', user: { id: 'b', email: 'b@example.com' } }),
        grant({ id: 'c', status: 'revoked', user: { id: 'c', email: 'c@example.com' } }),
      ])),
      [USAGE]: () => json(usage),
    });
    await screen.findAllByText('a@example.com');
    expect(screen.getAllByRole('button', { name: t.actions.revokeFor.replace('{email}', 'a@example.com') }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: t.actions.revokeFor.replace('{email}', 'b@example.com') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.actions.editDatesFor.replace('{email}', 'c@example.com') })).not.toBeInTheDocument();
  });
});

const openRevoke = async () => {
  await userEvent.click((await screen.findAllByRole('button', { name: t.actions.revokeFor.replace('{email}', 'lan@example.com') }))[0]!);
  return screen.findByRole('dialog', { name: t.revoke.title.replace('{email}', 'lan@example.com') });
};
const openEdit = async () => {
  await userEvent.click((await screen.findAllByRole('button', { name: t.actions.editDatesFor.replace('{email}', 'lan@example.com') }))[0]!);
  return screen.findByRole('dialog', { name: t.editDates.title.replace('{email}', 'lan@example.com') });
};

describe('revoke dialog', { timeout: 20_000 }, () => {
  it('§6.11: a reason of 1–300 is required; a good one posts it, closes the dialog, shows a toast and reloads the list', async () => {
    let revoked = false;
    const r = renderApp('/entitlements', {
      [LIST]: () => json(page([revoked ? grant({ status: 'revoked', revoked_at: '2026-10-27T01:00:00.000Z', revoke_reason: 'Nhầm người' }) : grant()])),
      [REVOKE(G1)]: () => {
        revoked = true;
        return json(grant({ status: 'revoked' }));
      },
      [USAGE]: () => json(usage),
    });
    const dialog = await openRevoke();
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    expect(await within(dialog).findByText(t.revoke.reasonInvalid)).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')).toHaveLength(0);
    await userEvent.type(within(dialog).getByLabelText(t.revoke.reason), '  Nhầm người  ');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.revoke.title.replace('{email}', 'lan@example.com') })).not.toBeInTheDocument());
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')[0]!.body).toEqual({ reason: 'Nhầm người' });
    expect(await screen.findByText(t.revoke.done.replace('{email}', 'lan@example.com'))).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/entitlements/grants?page_size=20')).toBe(2));
  });

  it('§6.11: revoking a grant that has expired meanwhile (409 grant-not-active) shows "Lần cấp này đã thu hồi hoặc đã hết hạn."', async () => {
    renderApp('/entitlements', {
      [LIST]: () => json(page([grant()])),
      [REVOKE(G1)]: () => problem(409, 'grant-not-active'),
      [USAGE]: () => json(usage),
    });
    const dialog = await openRevoke();
    await userEvent.type(within(dialog).getByLabelText(t.revoke.reason), 'Hết lớp');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    expect(await within(dialog).findByText(vi.errors['grant-not-active'])).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: t.revoke.title.replace('{email}', 'lan@example.com') })).toBeInTheDocument();
  });

  it.each([
    ['self-grant', t.refusal['self-grant']],
    ['target-is-admin', t.refusal['target-is-admin']],
    ['target-is-staff', t.refusal['target-is-staff']],
    ['ai-limits-admin-only', t.refusal['ai-limits-admin-only']],
  ])('§4.5: an editor revoking → 409 grant-not-allowed reason %s shows its own sentence', async (reason, sentence) => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [REVOKE(G1)]: () => problem(409, 'grant-not-allowed', { reason }) }, EDITOR);
    const dialog = await openRevoke();
    await userEvent.type(within(dialog).getByLabelText(t.revoke.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    expect(await within(dialog).findByText(sentence)).toBeInTheDocument();
    expect(within(dialog).queryByText(vi.errors['grant-not-allowed'])).not.toBeInTheDocument();
  });

  it('§4.5: grant-not-allowed with no known reason falls back to the general sentence', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [REVOKE(G1)]: () => problem(409, 'grant-not-allowed') }, EDITOR);
    const dialog = await openRevoke();
    await userEvent.type(within(dialog).getByLabelText(t.revoke.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    expect(await within(dialog).findByText(vi.errors['grant-not-allowed'])).toBeInTheDocument();
  });

  it('§6.11: a 429 on revoke shows the rate-limited sentence', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [REVOKE(G1)]: () => rateLimited(30), [USAGE]: () => json(usage) });
    const dialog = await openRevoke();
    await userEvent.type(within(dialog).getByLabelText(t.revoke.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revoke.confirm }));
    expect(await within(dialog).findByText(vi.errors['rate-limited'])).toBeInTheDocument();
  });
});

describe('edit-dates dialog', { timeout: 20_000 }, () => {
  const changed = grant({
    last_change: {
      id: 'c1', grant_id: G1, changed_by: ADMIN_ID, changed_by_role: 'admin', changed_by_user: { id: ADMIN_ID, email: 'an.admin@wordmet.com' },
      old_starts_at: '2026-10-21T17:00:00.000Z', new_starts_at: '2026-10-21T17:00:00.000Z',
      old_ends_at: '2026-11-21T17:00:00.000Z', new_ends_at: '2026-12-21T17:00:00.000Z', reason: 'Kéo dài cho lớp IELTS', created_at: '2026-10-20T03:00:00.000Z',
    },
  });

  it('§6.11: a started grant has "Từ ngày" read-only; only "Tới ngày" is a field; the summary and "Lần sửa trước" come from the row', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([changed])), [USAGE]: () => json(usage) });
    const dialog = await openEdit();
    expect(within(dialog).getByText('Gói Pro · đang hiệu lực từ 22/10/2026')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(t.editDates.from)).not.toBeInTheDocument();
    expect(within(dialog).getByText(t.editDates.fromLocked)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(t.editDates.to)).toHaveValue('2026-11-21');
    expect(within(dialog).getByText('Lần sửa trước: 20/10/2026 · an.admin@wordmet.com · tới 21/11 → 21/12 · Kéo dài cho lớp IELTS')).toBeInTheDocument();
    expect(within(dialog).getByText(t.editDates.hint)).toBeInTheDocument();
  });

  it('§6.11: a grant never edited has no "Lần sửa trước" line', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [USAGE]: () => json(usage) });
    const dialog = await openEdit();
    expect(within(dialog).queryByText(/Lần sửa trước/)).not.toBeInTheDocument();
  });

  it('§6.11: saving sends only the changed end, as the midnight after the chosen last day, with the reason', async () => {
    const r = renderApp('/entitlements', {
      [LIST]: () => json(page([grant()])),
      [PATCH(G1)]: () => json(grant({ ends_at: '2026-12-31T17:00:00.000Z' })),
      [USAGE]: () => json(usage),
    });
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(t.editDates.to), { target: { value: '2026-12-31' } });
    await userEvent.type(within(dialog).getByLabelText(t.editDates.reason), 'Kéo dài thêm');
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    await waitFor(() => expect(calls(r.calls, 'PATCH', '/v1/admin/entitlements/grants/')).toHaveLength(1));
    expect(calls(r.calls, 'PATCH', '/v1/admin/entitlements/grants/')[0]!.body).toEqual({ ends_at: '2027-01-01T00:00:00+07:00', reason: 'Kéo dài thêm' });
    expect(await screen.findByText(t.editDates.done.replace('{email}', 'lan@example.com'))).toBeInTheDocument();
  });

  it('§6.11: saving with no date changed sends nothing and says so; a missing reason is flagged', async () => {
    const r = renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [USAGE]: () => json(usage) });
    const dialog = await openEdit();
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    expect(await within(dialog).findByText(t.editDates.noChange)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(t.editDates.to), { target: { value: '2026-12-31' } });
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    expect(await within(dialog).findByText(t.editDates.reasonInvalid)).toBeInTheDocument();
    expect(calls(r.calls, 'PATCH', '/v1/admin/entitlements/grants/')).toHaveLength(0);
  });

  it('§6.11: a grant that has not started lets "Từ ngày" change, sent as the start of that Vietnam day', async () => {
    const scheduled = grant({ status: 'scheduled', starts_at: '2026-12-31T17:00:00.000Z', ends_at: '2027-01-31T17:00:00.000Z' });
    const r = renderApp('/entitlements', {
      [LIST]: () => json(page([scheduled])),
      [PATCH(G1)]: () => json(scheduled),
      [USAGE]: () => json(usage),
    });
    const dialog = await openEdit();
    expect(within(dialog).getByLabelText(t.editDates.from)).toHaveValue('2027-01-01');
    fireEvent.change(within(dialog).getByLabelText(t.editDates.from), { target: { value: '2027-01-05' } });
    await userEvent.type(within(dialog).getByLabelText(t.editDates.reason), 'Dời lịch');
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    await waitFor(() => expect(calls(r.calls, 'PATCH', '/v1/admin/entitlements/grants/')).toHaveLength(1));
    expect(calls(r.calls, 'PATCH', '/v1/admin/entitlements/grants/')[0]!.body).toEqual({ starts_at: '2027-01-05T00:00:00+07:00', reason: 'Dời lịch' });
  });

  it('§6.11: 409 grant-not-active → "Lần cấp này đã thu hồi hoặc đã hết hạn."', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [PATCH(G1)]: () => problem(409, 'grant-not-active'), [USAGE]: () => json(usage) });
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(t.editDates.to), { target: { value: '2026-12-31' } });
    await userEvent.type(within(dialog).getByLabelText(t.editDates.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    expect(await within(dialog).findByText(vi.errors['grant-not-active'])).toBeInTheDocument();
  });

  it.each([
    ['self-grant', t.refusal['self-grant']],
    ['target-is-admin', t.refusal['target-is-admin']],
    ['target-is-staff', t.refusal['target-is-staff']],
    ['ai-limits-admin-only', t.refusal['ai-limits-admin-only']],
  ])('§4.5: an editor editing dates → 409 grant-not-allowed reason %s shows its own sentence', async (reason, sentence) => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [PATCH(G1)]: () => problem(409, 'grant-not-allowed', { reason }) }, EDITOR);
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(t.editDates.to), { target: { value: '2026-12-31' } });
    await userEvent.type(within(dialog).getByLabelText(t.editDates.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    expect(await within(dialog).findByText(sentence)).toBeInTheDocument();
  });

  it('§6.11: a server 400 on the dates shows the general error', async () => {
    renderApp('/entitlements', { [LIST]: () => json(page([grant()])), [PATCH(G1)]: () => problem(400, 'validation-failed'), [USAGE]: () => json(usage) }, ME_ADMIN);
    const dialog = await openEdit();
    fireEvent.change(within(dialog).getByLabelText(t.editDates.to), { target: { value: '2026-12-31' } });
    await userEvent.type(within(dialog).getByLabelText(t.editDates.reason), 'Lý do');
    await userEvent.click(within(dialog).getByRole('button', { name: t.editDates.confirm }));
    expect(await within(dialog).findByText(vi.errors['validation-failed'])).toBeInTheDocument();
  });
});
