// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe, problem } from '@/app-shell/session/test-support';
import { THEME_STORAGE_KEY } from '@/app-shell/theme/theme';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { renderApp } from '@/app-ui/test-utils';
import { AccountPage } from './AccountPage';
import { SettingsPage } from './SettingsPage';

const replace = vi.fn();
vi.mock('@/app-shell/navigate', () => ({ hardReplace: (path: string) => replace(path), isLeaving: () => false }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/vi/app/settings',
  useSearchParams: () => new URLSearchParams(),
}));

vi.setConfig({ testTimeout: 20_000 });

// 12:00 on Sunday 18/10/2026 in Ho Chi Minh City; the practice pool refills at the next local midnight.
const NOW = new Date('2026-10-18T05:00:00Z');
const MIDNIGHT = '2026-10-18T17:00:00.000Z';

const pool = (limit: number, used: number, resets_at: string | null) => ({ limit, used, remaining: limit - used, resets_at });
const entitlements = (plan: 'free' | 'trial' | 'pro', over: Record<string, unknown> = {}) => ({
  plan,
  sources: [],
  pools: {
    practice_sessions: pool(plan === 'free' ? 3 : 30, 1, MIDNIGHT),
    ai_practice: plan === 'free' ? pool(0, 0, null) : pool(300, 13, '2026-11-15T03:00:00.000Z'),
    ai_lookup: plan === 'free' ? pool(0, 0, null) : pool(100, 4, '2026-11-15T03:00:00.000Z'),
  },
  features: {},
  ai_available: { enabled: true, cap_reached: false },
  trial_eligible: false,
  ...over,
});
const appConfig = {
  practice: { max_questions_per_session: 20, default_questions_per_session: 10 },
  reminders: { send_time: '20:00' },
  learning: { backlog_after_days: 60, groups_per_user: 100 },
  plans: {
    free: { practice_sessions_per_day: 3 },
    trial: { ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
    pro: { practice_sessions_per_day: 30, ai_practice_per_cycle: 300, ai_lookup_per_cycle: 100 },
  },
};
const routes = (plan: 'free' | 'trial' | 'pro' = 'free', extra = {}) => ({
  'GET /v1/me/entitlements': () => Response.json(entitlements(plan)),
  'GET /v1/me/app-config': () => Response.json(appConfig),
  'GET /v1/me/reminders': () => Response.json({ enabled: true, email_verified: true }),
  ...extra,
});

beforeEach(() => {
  replace.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('SettingsPage (K/50)', () => {
  it('D15: practice usage says "đã dùng 1/3" and when it reopens, in the learner zone', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    expect(await screen.findByText('đã dùng 1/3')).toBeInTheDocument();
    expect(screen.getByText('Còn 2 phiên, mở lại lúc 0:00.')).toBeInTheDocument();
  });

  it('Free: both AI rows say "Cần gói Pro" and show no refill line', async () => {
    renderApp(<SettingsPage />, { routes: routes('free') });
    await screen.findByText('đã dùng 1/3');
    expect(screen.getAllByText('Cần gói Pro')).toHaveLength(2);
    expect(screen.queryByText(/mới có vào/)).not.toBeInTheDocument();
  });

  it('Pro: AI rows show what is left and the refill date', async () => {
    renderApp(<SettingsPage />, { routes: routes('pro') });
    expect(await screen.findByText('còn 287/300')).toBeInTheDocument();
    expect(screen.getByText('Lượt câu AI mới có vào 15/11.')).toBeInTheDocument();
    expect(screen.getByText('còn 96/100')).toBeInTheDocument();
  });

  it('E26: a pool without resets_at shows no reset line', async () => {
    renderApp(<SettingsPage />, {
      routes: routes('free', {
        'GET /v1/me/entitlements': () =>
          Response.json(entitlements('free', { pools: { practice_sessions: pool(3, 1, null), ai_practice: pool(0, 0, null), ai_lookup: pool(0, 0, null) } })),
      }),
    });
    expect(await screen.findByText('đã dùng 1/3')).toBeInTheDocument();
    expect(screen.queryByText(/mở lại lúc/)).not.toBeInTheDocument();
  });

  it('changing the language stores it, then moves to the other prefix', async () => {
    const { calls } = renderApp(<SettingsPage />, { routes: routes('free', { 'PATCH /v1/me': () => Response.json(makeMe({ native_language: 'en' })) }) });
    await userEvent.click(await screen.findByRole('radio', { name: 'English' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/app/settings'));
    expect(calls.find((c) => c.method === 'PATCH' && c.path === '/v1/me')!.body).toEqual({ native_language: 'en' });
  });

  it('the theme choice is stored on this device', async () => {
    renderApp(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>,
      { routes: routes() },
    );
    await userEvent.click(await screen.findByRole('radio', { name: 'Tối' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('the reminder switch sends PATCH /v1/me/reminders with an Idempotency-Key', async () => {
    const { calls } = renderApp(<SettingsPage />, {
      routes: routes('free', { 'PATCH /v1/me/reminders': () => Response.json({ enabled: false, email_verified: true }) }),
    });
    await userEvent.click(await screen.findByRole('switch', { name: /Nhắc học qua email/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH' && c.path === '/v1/me/reminders')).toBe(true));
    const call = calls.find((c) => c.method === 'PATCH' && c.path === '/v1/me/reminders')!;
    expect(call.body).toEqual({ enabled: false });
    expect(call.headers['Idempotency-Key']).toMatch(/[0-9a-f-]{36}/);
  });

  it.each([true, false])('the email row shows only the email, without a verification invitation (verified=%s)', async (verified) => {
    renderApp(<SettingsPage />, { me: makeMe({ email_verified: verified }), routes: routes() });
    expect(await screen.findByText('lan@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa xác minh|Đã xác minh/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Xác minh email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác minh email' })).not.toBeInTheDocument();
  });

  it('Xóa tài khoản is "Sắp có" and not a control; Lịch sử giao dịch opens its page (M4b)', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    const row = (await screen.findByText('Xóa tài khoản')).closest('li')!;
    expect(within(row).getByText('Sắp có')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();
    expect(screen.getByRole('link', { name: /Lịch sử giao dịch/ })).toHaveAttribute('href', '/vi/app/settings/transactions');
  });

  it('the transactions and current plan rows are links over the whole row (audit 26/10/2026 #10)', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    const transactions = await screen.findByRole('link', { name: /Lịch sử giao dịch/ });
    expect(transactions).toContainElement(screen.getByText('Lịch sử giao dịch'));
    const plan = await screen.findByRole('link', { name: /Gói hiện tại/ });
    expect(plan).toHaveAttribute('href', '/vi/app/plans');
    expect(plan).toContainElement(screen.getByText('Gói hiện tại'));
  });
});

describe('AccountPage (K/91, K/92)', () => {
  it('K/92: a birth date under 13 shows the line at once and sends nothing', async () => {
    const { count } = renderApp(<AccountPage />, { routes: routes() });
    const field = await screen.findByRole('textbox', { name: 'Ngày sinh' });
    await userEvent.clear(field);
    await userEvent.type(field, '14/5/2015');
    expect(screen.getByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    expect(count('PATCH', '/v1/me')).toBe(0);
  });

  it('saves only what changed and confirms', async () => {
    const { calls } = renderApp(<AccountPage />, { routes: routes('free', { 'PATCH /v1/me': () => Response.json(makeMe({ given_name: 'Mai' })) }) });
    const name = await screen.findByRole('textbox', { name: 'Tên' });
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await userEvent.clear(name);
    await userEvent.type(name, 'Mai');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ given_name: 'Mai' }));
  });

  it('400 age-below-minimum from the API shows the same inline line', async () => {
    renderApp(<AccountPage />, { routes: routes('free', { 'PATCH /v1/me': () => problem(400, 'age-below-minimum') }) });
    const field = await screen.findByRole('textbox', { name: 'Ngày sinh' });
    await userEvent.clear(field);
    await userEvent.type(field, '1/1/2000');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
  });
});
