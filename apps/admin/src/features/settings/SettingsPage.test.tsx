import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { SECTIONS, SETTINGS_LAYOUT, type Values } from './settings-api';

// These pages mount the whole app (session, shell, several queries): the first render can pass 1 s on a busy machine.
configure({ asyncUtilTimeout: 4000 });

const s = vi.settings;

function values(): Values {
  const out = {} as Values;
  for (const section of SECTIONS) {
    out[section] = {};
    for (const { key, kind } of SETTINGS_LAYOUT[section]) out[section][key] = kind === 'bool' ? true : kind === 'time' ? '20:00' : 10;
  }
  out.practice.max_questions_per_session = 20;
  out.entitlements.renewal_notice_days_before = 5;
  return out;
}
function bounds() {
  const out: Record<string, Record<string, unknown>> = {};
  for (const section of SECTIONS) {
    out[section] = {};
    for (const { key, kind } of SETTINGS_LAYOUT[section]) {
      if (kind === 'time') out[section][key] = { min: '06:00', max: '22:00', step_minutes: 15 };
      else if (kind === 'int') out[section][key] = { min: 1, max: 1000 };
    }
  }
  out.entitlements.renewal_notice_days_before = { min: 1, max: 30, nullable: true };
  out.practice.default_questions_per_session = { min: 1, max: 100 };
  return out;
}
const VIEW = (version = 3) => ({ version, values: values(), defaults: values(), bounds: bounds() });
const GET = 'GET /v1/admin/settings';
const PUT = 'PUT /v1/admin/settings';
const USAGE = 'GET /v1/admin/entitlements/ai-usage';
const usage = (alert: boolean) => () =>
  Response.json({ date: '2026-10-27', used: 812, confirmed: 790, reserved: 22, cap: 1000, alert_percent: 75, alert_reached: alert, enabled: true });

afterEach(() => sessionStorage.clear());

async function setNumber(label: string, value: string) {
  const input = screen.getByRole('textbox', { name: label });
  await userEvent.clear(input);
  if (value) await userEvent.type(input, value);
  await userEvent.tab();
}
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });
const dot = (name: string) => within(tab(name)).queryByTestId('tab-dot');

describe('SettingsPage (A/70a–A/70f, design §6.7)', () => {
  it('shows the first tab with each field and its hint "key · range · default"; the tab is in the URL', async () => {
    renderApp('/settings', { [GET]: () => Response.json(VIEW()) });
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.settings })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days })).toHaveValue('10');
    expect(screen.getByText('min_gap_days · 1–1.000 ngày · mặc định 10')).toBeInTheDocument();
    expect(screen.getByText('send_time · 06:00–22:00, mỗi 15 phút · mặc định 20:00')).toBeInTheDocument();
    expect(screen.getByText(s.emailTemplates)).toBeInTheDocument();
    expect(tab(s.tabs.reminders)).toHaveAttribute('aria-selected', 'true');
  });

  it('§6.7: changes on two tabs → one PUT with both keys and an Idempotency-Key; toast "Đã lưu", dots gone', async () => {
    let saved: Call | undefined;
    const r = renderApp('/settings', {
      [GET]: () => Response.json(VIEW()),
      [PUT]: (call) => {
        saved = call;
        const next = values();
        next.reminders.min_gap_days = 3;
        next.content.sentences_per_sense = 50;
        return Response.json({ version: 4, values: next });
      },
    });
    await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days });
    await setNumber(s.fields.reminders.min_gap_days, '3');
    expect(dot(s.tabs.reminders)).not.toBeNull();
    await userEvent.click(tab(s.tabs.content));
    await setNumber(s.fields.content.sentences_per_sense, '50');
    expect(dot(s.tabs.content)).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: s.save }));
    await waitFor(() => expect(r.count('PUT', '/v1/admin/settings')).toBe(1));
    expect(saved?.body).toEqual({ version: 3, values: { reminders: { min_gap_days: 3 }, content: { sentences_per_sense: 50 } } });
    expect(saved?.headers['Idempotency-Key']).toBeTruthy();
    expect(await screen.findByText(s.saved)).toBeInTheDocument();
    await waitFor(() => expect(dot(s.tabs.reminders)).toBeNull());
    expect(dot(s.tabs.content)).toBeNull();
    expect(screen.getByRole('button', { name: s.save })).toBeDisabled();
  });

  it('§6.7: switching tab while dirty asks nothing and keeps the change; a value set back clears the dot and leaving asks nothing', async () => {
    renderApp('/settings', { [GET]: () => Response.json(VIEW()), 'GET /v1/admin/staff?page_size=20': () => Response.json({ items: [], next_page_token: null }) });
    await setNumber(await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days }).then(() => s.fields.reminders.min_gap_days), '4');
    await userEvent.click(tab(s.tabs.ai));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText(vi.leave.title)).toBeNull();
    await userEvent.click(tab(s.tabs.reminders));
    expect(screen.getByRole('textbox', { name: s.fields.reminders.min_gap_days })).toHaveValue('4');
    await setNumber(s.fields.reminders.min_gap_days, '10');
    expect(dot(s.tabs.reminders)).toBeNull();
    await userEvent.click(screen.getAllByRole('link', { name: vi.nav.staff })[0]);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.staff));
    expect(screen.queryByText(vi.leave.title)).toBeNull();
  });

  it('§6.7: leaving the page with an unsaved change asks "Rời trang?"', async () => {
    renderApp('/settings', { [GET]: () => Response.json(VIEW()) });
    await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days });
    await setNumber(s.fields.reminders.min_gap_days, '4');
    await userEvent.click(screen.getAllByRole('link', { name: vi.nav.staff })[0]);
    expect(await screen.findByText(vi.leave.title)).toBeInTheDocument();
  });

  it('§6.7: a violation on default_questions_per_session opens tab Luyện tập and focuses that field', async () => {
    renderApp('/settings', {
      [GET]: () => Response.json(VIEW()),
      [PUT]: () => problem(400, 'validation-failed', { violations: ['values.practice.default_questions_per_session: Expected at most max_questions_per_session'] }),
    });
    await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days });
    await setNumber(s.fields.reminders.min_gap_days, '4');
    await userEvent.click(screen.getByRole('button', { name: s.save }));
    const field = await screen.findByRole('textbox', { name: s.fields.practice.default_questions_per_session });
    expect(tab(s.tabs.practice)).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(field).toHaveFocus());
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText(s.outOfRange).length).toBeGreaterThan(0);
  });

  it('§6.7: version-conflict shows the copy and [Tải lại]; with changes it asks first, then reloads the new version', async () => {
    let gets = 0;
    const r = renderApp('/settings', {
      [GET]: () => Response.json(VIEW(++gets === 1 ? 3 : 4)),
      [PUT]: () => problem(409, 'version-conflict'),
    });
    await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days });
    await setNumber(s.fields.reminders.min_gap_days, '4');
    await userEvent.click(screen.getByRole('button', { name: s.save }));
    expect(await screen.findByText(vi.errors['version-conflict'])).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: s.reload }));
    const ask = await screen.findByRole('dialog', { name: s.reloadTitle });
    await userEvent.click(within(ask).getByRole('button', { name: s.reload }));
    await waitFor(() => expect(r.count('GET', '/v1/admin/settings')).toBe(2));
    await waitFor(() => expect(screen.getByRole('textbox', { name: s.fields.reminders.min_gap_days })).toHaveValue('10'));
    expect(screen.queryByText(vi.errors['version-conflict'])).toBeNull();
  });

  it('§6.7: an emptied nullable field sends null; its hint says what empty means', async () => {
    let body: unknown;
    renderApp('/settings?tab=entitlements', {
      [GET]: () => Response.json(VIEW()),
      [USAGE]: usage(false),
      [PUT]: (call) => {
        body = call.body;
        return Response.json({ version: 4, values: values() });
      },
    });
    const label = s.fields.entitlements.renewal_notice_days_before;
    await screen.findByRole('textbox', { name: label });
    expect(screen.getByText(/renewal_notice_days_before · 1–30 ngày hoặc để trống = không gửi/)).toBeInTheDocument();
    await setNumber(label, '');
    await userEvent.click(screen.getByRole('button', { name: s.save }));
    await waitFor(() => expect(body).toEqual({ version: 3, values: { entitlements: { renewal_notice_days_before: null } } }));
  });

  it('A/70d: tab Gói và lượt starts with today\'s AI uses, yellow once the alert is reached', async () => {
    renderApp('/settings?tab=entitlements', { [GET]: () => Response.json(VIEW()), [USAGE]: usage(true) });
    const block = (await screen.findByText('Lượt AI hôm nay: 812/1.000 (81%)')).closest('[role="status"]') as HTMLElement;
    expect(block.className).toContain('bg-accent-soft');
    expect(within(block).getByText('Đã xác nhận 790 · đang giữ chỗ 22')).toBeInTheDocument();
  });

  it('[Lịch sử thay đổi]: key, old → new, email, time; "Tải thêm" loads the next page', async () => {
    const row = (key: string, email: string | null) => ({
      key, old_value: 2, new_value: 3, changed_by: { id: 'u9', email }, changed_at: '2026-10-27T02:12:00.000Z',
    });
    const r = renderApp('/settings', {
      [GET]: () => Response.json(VIEW()),
      'GET /v1/admin/settings/history?page_size=20': () => Response.json({ items: [row('reminders.min_gap_days', 'an.admin@wordmet.com')], next_page_token: 'p2' }),
      'GET /v1/admin/settings/history?page_size=20&page_token=p2': () => Response.json({ items: [row('ai.usd_vnd_rate', null)], next_page_token: null }),
    });
    await screen.findByRole('textbox', { name: s.fields.reminders.min_gap_days });
    await userEvent.click(screen.getByRole('button', { name: s.history }));
    const dialog = await screen.findByRole('dialog', { name: s.historyDialog.title });
    expect(await within(dialog).findByText('reminders.min_gap_days')).toBeInTheDocument();
    expect(within(dialog).getAllByText('2 → 3').length).toBe(1);
    expect(within(dialog).getByText('an.admin@wordmet.com · 27/10/2026 09:12')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.loadMore }));
    expect(await within(dialog).findByText('ai.usd_vnd_rate')).toBeInTheDocument();
    expect(within(dialog).getByText(`${s.historyDialog.unknownUser} · 27/10/2026 09:12`)).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/settings/history?page_size=20&page_token=p2')).toBe(1);
  });

  it('§4.6: a draft kept from a session that ended is offered back; [Khôi phục] puts it back with its dot', async () => {
    sessionStorage.setItem('wordmet-admin.draft.me-1.settings', JSON.stringify({ reminders: { min_gap_days: 6 } }));
    renderApp('/settings', { [GET]: () => Response.json(VIEW()) });
    expect(await screen.findByText(vi.draft.message)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.draft.restore }));
    expect(screen.getByRole('textbox', { name: s.fields.reminders.min_gap_days })).toHaveValue('6');
    expect(dot(s.tabs.reminders)).not.toBeNull();
    expect(screen.queryByText(vi.draft.message)).toBeNull();
  });
});
