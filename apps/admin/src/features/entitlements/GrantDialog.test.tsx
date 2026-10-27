import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, rateLimited, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.entitlements;
const n = t.new;
const LAN_ID = '6b1f0000-0000-4000-8000-00000000e42a';
const LIST = 'GET /v1/admin/entitlements/grants?page_size=20';
const USAGE = 'GET /v1/admin/entitlements/ai-usage';
const CREATE = 'POST /v1/admin/entitlements/grants';
const lookupPath = (email: string) => `GET /v1/admin/entitlements/lookup?email=${encodeURIComponent(email)}`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit', 'entitlements.grant'] });
const page = (items: unknown[] = []) => ({ items, next_page_token: null });
const usage = { date: '2026-10-27', used: 812, confirmed: 800, reserved: 12, cap: 1000, alert_percent: 80, alert_reached: false, enabled: true };
const found = (over: Record<string, unknown> = {}) => ({ user: { id: LAN_ID, email: 'lan@example.com' }, grantable: true, reason: null, ...over });
const created = (over: Record<string, unknown> = {}) => ({
  id: 'g1', user_id: LAN_ID, kind: 'plan', plan: 'pro', limits: null, starts_at: '2026-10-27T01:00:00.000Z', ends_at: '2026-12-01T17:00:00.000Z',
  reason: 'Giải IELTS', granted_by: 'me-1', granted_by_role: 'admin', revoked_at: null, revoked_by: null, revoke_reason: null, paid_renewal_action: null,
  created_at: '2026-10-27T01:00:00.000Z', user: { id: LAN_ID, email: 'lan@example.com' }, granted_by_user: { id: 'me-1', email: 'admin@wordmet.com' },
  revoked_by_user: null, status: 'active', last_change: null, ...over,
});
const calls = (all: Call[], method: string, prefix: string) => all.filter((c) => c.method === method && c.path.startsWith(prefix));
const base = { [LIST]: () => json(page()), [USAGE]: () => json(usage) };
const confirmedText = n.confirmed.replace('{email}', 'lan@example.com');

async function checkEmail(email = 'lan@example.com') {
  await userEvent.type(await screen.findByLabelText(n.email), email);
  await userEvent.click(screen.getByRole('button', { name: n.check }));
}
async function fillEnd(day = '2026-12-01', reason = 'Giải IELTS') {
  await userEvent.type(screen.getByLabelText(n.to), day);
  await userEvent.type(screen.getByLabelText(n.reason), reason);
}
const submit = () => screen.getByRole('button', { name: n.submit });

describe('new grant dialog', { timeout: 20_000 }, () => {
  it('§6.11: the list page has a [Cấp mới] that opens the dialog at /entitlements/new', async () => {
    const r = renderApp('/entitlements', base);
    await userEvent.click((await screen.findAllByRole('button', { name: n.open }))[0]!);
    expect(await screen.findByRole('dialog', { name: n.title })).toBeInTheDocument();
    expect(r.router.state.location.pathname).toBe('/entitlements/new');
  });

  it('§8.8: an empty list offers [Cấp mới] under the empty text', async () => {
    renderApp('/entitlements', base);
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: n.open })).toHaveLength(2);
  });

  it('§6.11: an editor email answers grantable:false target-is-staff with its sentence and [Cấp] stays disabled', async () => {
    renderApp(
      '/entitlements/new',
      {
        ...base,
        [lookupPath('minh@wordmet.com')]: () => json(found({ user: { id: 'e1', email: 'minh@wordmet.com' }, grantable: false, reason: 'target-is-staff' })),
      },
      EDITOR,
    );
    await checkEmail('minh@wordmet.com');
    expect(await screen.findByText('Editor không cấp được cho tài khoản staff.')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('§6.11: 404 says there is no account with this email', async () => {
    renderApp('/entitlements/new', { ...base, [lookupPath('none@example.com')]: () => problem(404, 'not-found') });
    await checkEmail('none@example.com');
    expect(await screen.findByText(n.notFound)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('§6.11: leaving the field also looks the email up, once', async () => {
    const r = renderApp('/entitlements/new', { ...base, [lookupPath('lan@example.com')]: () => json(found()) });
    await userEvent.type(await screen.findByLabelText(n.email), 'lan@example.com');
    await userEvent.tab();
    expect(await screen.findByText(confirmedText)).toBeInTheDocument();
    expect(calls(r.calls, 'GET', '/v1/admin/entitlements/lookup')).toHaveLength(1);
  });

  it('§6.11: a clicked [Kiểm] (which blurs the field first) looks the same email up only once', async () => {
    const r = renderApp('/entitlements/new', { ...base, [lookupPath('lan@example.com')]: () => json(found()) });
    await checkEmail();
    await screen.findByText(confirmedText);
    expect(calls(r.calls, 'GET', '/v1/admin/entitlements/lookup')).toHaveLength(1);
  });

  it('§6.11: an edit after [Kiểm] drops the confirmation, so [Cấp] is disabled until the new email is checked', async () => {
    renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [lookupPath('lan@example.comx')]: () => json(found({ user: { id: 'x', email: 'lan@example.comx' } })),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    expect(submit()).toBeEnabled();
    await userEvent.type(screen.getByLabelText(n.email), 'x');
    expect(screen.queryByText(confirmedText)).not.toBeInTheDocument();
    expect(submit()).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: n.check }));
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it('§6.11: lookup 429 shows the general rate-limited sentence with a retry time under the field and [Cấp] stays disabled', async () => {
    renderApp('/entitlements/new', { ...base, [lookupPath('lan@example.com')]: () => rateLimited(120) });
    await checkEmail();
    const text = await screen.findByText(new RegExp(vi.errors['rate-limited']));
    expect(text.textContent).toMatch(/Thử lại lúc \d{2}:\d{2}/);
    expect(submit()).toBeDisabled();
  });

  it('§6.11: a Pro grant starting now shows the replace note before sending; a future start hides it', async () => {
    renderApp('/entitlements/new', base);
    expect(await screen.findByText(n.note)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(n.from), '2099-01-01');
    expect(screen.queryByText(n.note)).not.toBeInTheDocument();
  });

  it('§6.11: an editor sees only the sessions-per-day number for custom limits', async () => {
    renderApp('/entitlements/new', base, EDITOR);
    await userEvent.click(await screen.findByRole('radio', { name: t.kinds.limits }));
    expect(screen.getByLabelText(n.practiceSessions)).toBeInTheDocument();
    expect(screen.queryByLabelText(n.aiPractice)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(n.aiLookup)).not.toBeInTheDocument();
  });

  it('§6.11: an admin sees the two AI numbers too', async () => {
    renderApp('/entitlements/new', base);
    await userEvent.click(await screen.findByRole('radio', { name: t.kinds.limits }));
    expect(screen.getByLabelText(n.practiceSessions)).toBeInTheDocument();
    expect(screen.getByLabelText(n.aiPractice)).toBeInTheDocument();
    expect(screen.getByLabelText(n.aiLookup)).toBeInTheDocument();
  });

  it('§6.11: Pro sends the confirmed user_id, ends_at = midnight after the last day and an Idempotency-Key, then closes with a toast and refreshes the list', async () => {
    const r = renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: () => json(created(), 201),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd('2026-12-01');
    await userEvent.click(submit());
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/entitlements'));
    const post = calls(r.calls, 'POST', '/v1/admin/entitlements/grants')[0]!;
    expect(post.body).toEqual({ user_id: LAN_ID, kind: 'plan', plan: 'pro', ends_at: '2026-12-02T00:00:00+07:00', reason: 'Giải IELTS' });
    expect(post.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText(n.done.replace('{email}', 'lan@example.com'))).toBeInTheDocument();
    await waitFor(() => expect(calls(r.calls, 'GET', '/v1/admin/entitlements/grants?page_size=20').length).toBeGreaterThan(1));
  });

  it('§6.11: custom numbers send only the filled limits; a future start day goes as midnight +07:00', async () => {
    const r = renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: () => json(created({ kind: 'limits', plan: null, limits: { practice_sessions_per_day: 30, ai_lookup_per_cycle: 0 } }), 201),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await userEvent.click(screen.getByRole('radio', { name: t.kinds.limits }));
    await userEvent.type(screen.getByLabelText(n.practiceSessions), '30');
    await userEvent.type(screen.getByLabelText(n.aiLookup), '0');
    await userEvent.type(screen.getByLabelText(n.from), '2099-01-01');
    await fillEnd('2099-02-01');
    await userEvent.click(submit());
    await waitFor(() => expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')).toHaveLength(1));
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')[0]!.body).toEqual({
      user_id: LAN_ID,
      kind: 'limits',
      limits: { practice_sessions_per_day: 30, ai_lookup_per_cycle: 0 },
      starts_at: '2099-01-01T00:00:00+07:00',
      ends_at: '2099-02-02T00:00:00+07:00',
      reason: 'Giải IELTS',
    });
  });

  it('§6.11: custom numbers with every number empty are refused before sending', async () => {
    const r = renderApp('/entitlements/new', { ...base, [lookupPath('lan@example.com')]: () => json(found()) });
    await checkEmail();
    await screen.findByText(confirmedText);
    await userEvent.click(screen.getByRole('radio', { name: t.kinds.limits }));
    await fillEnd();
    await userEvent.click(submit());
    expect(await screen.findByText(n.limitsRequired)).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')).toHaveLength(0);
  });

  it('§6.11: a missing end day or reason is refused before sending', async () => {
    const r = renderApp('/entitlements/new', { ...base, [lookupPath('lan@example.com')]: () => json(found()) });
    await checkEmail();
    await screen.findByText(confirmedText);
    await userEvent.click(submit());
    expect(await screen.findByText(n.toRequired)).toBeInTheDocument();
    expect(screen.getByText(n.reasonInvalid)).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')).toHaveLength(0);
  });

  it('§6.11: 409 target-has-paid-subscription asks A/79b, and [Cấp và tắt tự gia hạn] resends with confirm_turn_off_paid_renewal and a new key', async () => {
    const r = renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: (call) =>
        (call.body as { confirm_turn_off_paid_renewal?: boolean }).confirm_turn_off_paid_renewal
          ? json(created({ paid_renewal_action: 'turned_off' }), 201)
          : problem(409, 'grant-not-allowed', { reason: 'target-has-paid-subscription' }),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    await userEvent.click(submit());
    const ask = await screen.findByRole('dialog', { name: n.confirm.title.replace('{email}', 'lan@example.com') });
    expect(within(ask).getByText(n.confirm.turnOff)).toBeInTheDocument();
    await userEvent.click(within(ask).getByRole('button', { name: n.confirm.ok }));
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/entitlements'));
    const posts = calls(r.calls, 'POST', '/v1/admin/entitlements/grants');
    expect(posts).toHaveLength(2);
    expect((posts[0]!.body as Record<string, unknown>).confirm_turn_off_paid_renewal).toBeUndefined();
    expect((posts[1]!.body as Record<string, unknown>).confirm_turn_off_paid_renewal).toBe(true);
    expect(posts[1]!.headers['Idempotency-Key']).not.toBe(posts[0]!.headers['Idempotency-Key']);
  });

  it('§6.11: [Giữ nguyên] on A/79b sends nothing more and keeps the form', async () => {
    const r = renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: () => problem(409, 'grant-not-allowed', { reason: 'target-has-paid-subscription' }),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    await userEvent.click(submit());
    const title = n.confirm.title.replace('{email}', 'lan@example.com');
    const ask = await screen.findByRole('dialog', { name: title });
    await userEvent.click(within(ask).getByRole('button', { name: n.confirm.keep }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument());
    expect(calls(r.calls, 'POST', '/v1/admin/entitlements/grants')).toHaveLength(1);
    expect(screen.getByLabelText(n.reason)).toHaveValue('Giải IELTS');
  });

  it('§6.11: paid_renewal_action not_supported shows the warning sentence', async () => {
    renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: () => json(created({ paid_renewal_action: 'not_supported' }), 201),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    await userEvent.click(submit());
    expect(await screen.findByText(n.notSupported)).toBeInTheDocument();
  });

  it('§6.11: another 409 grant-not-allowed reason shows its own sentence in the dialog', async () => {
    renderApp(
      '/entitlements/new',
      {
        ...base,
        [lookupPath('lan@example.com')]: () => json(found()),
        [CREATE]: () => problem(409, 'grant-not-allowed', { reason: 'ai-limits-admin-only' }),
      },
      EDITOR,
    );
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    await userEvent.click(submit());
    expect(await screen.findByText(t.refusal['ai-limits-admin-only'])).toBeInTheDocument();
  });

  it('§6.11: a 400 violation lands on its field and moves focus there', async () => {
    renderApp('/entitlements/new', {
      ...base,
      [lookupPath('lan@example.com')]: () => json(found()),
      [CREATE]: () => problem(400, 'validation-failed', { violations: ['reason: Too long'] }),
    });
    await checkEmail();
    await screen.findByText(confirmedText);
    await fillEnd();
    await userEvent.click(submit());
    expect(await screen.findByText('Too long')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(n.reason)).toHaveFocus());
  });

  it('§4.3: cancelling a dirty dialog asks before discarding', async () => {
    const r = renderApp('/entitlements/new', base);
    await userEvent.type(await screen.findByLabelText(n.reason), 'x');
    await userEvent.click(screen.getByRole('button', { name: vi.common.cancel }));
    expect(await screen.findByText(vi.leave.discardTitle)).toBeInTheDocument();
    expect(r.router.state.location.pathname).toBe('/entitlements/new');
  });

  it('§6.11: [Hủy] on a clean dialog goes back to the list', async () => {
    const r = renderApp('/entitlements/new', base);
    await userEvent.click(await screen.findByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/entitlements'));
  });

  it('§6.11: a user without entitlements.grant gets the no-access card and no request', async () => {
    const r = renderApp('/entitlements/new', {}, makeMe({ staff_role: 'editor', permissions: ['content.edit'] }));
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(calls(r.calls, 'GET', '/v1/admin/entitlements')).toHaveLength(0);
  });
});
