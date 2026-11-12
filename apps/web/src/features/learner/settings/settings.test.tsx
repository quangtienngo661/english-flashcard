// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMe, problem } from '@/app-shell/session/test-support';
import { THEME_STORAGE_KEY } from '@/app-shell/theme/theme';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { pickDate, renderApp } from '@/test-utils/render-app';
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
    free: { practice_sessions_per_day: 3, ai_practice_per_cycle: 15, ai_lookup_per_cycle: 5 },
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

describe('SettingsPage (K/50, Figma 120:4295 / 120:4559)', () => {
  it('shows the six section headings in order, under the title "Cài đặt"', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Thông tin cá nhân', 'Gói và mức sử dụng', 'Học tập', 'Thông báo', 'Phím tắt', 'Tài khoản',
    ]);
    expect(screen.queryByRole('link', { name: /Quay lại/ })).not.toBeInTheDocument();
  });

  it('Mục lục links the six sections; pressing "Tài khoản" marks it and moves focus to its heading', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    const toc = await screen.findByRole('navigation', { name: 'Mục lục' });
    const links = within(toc).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#personal', '#plan', '#learning', '#notifications', '#shortcuts', '#account']);
    expect(links[0]).toHaveAttribute('aria-current', 'true');
    const account = within(toc).getByRole('link', { name: 'Tài khoản' });
    await userEvent.click(account);
    expect(account).toHaveAttribute('aria-current', 'true');
    expect(links[0]).not.toHaveAttribute('aria-current');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Tài khoản' }));
  });

  it('personal details: name with "Sửa Họ và tên", birth date as dd/mm/yyyy with no action, email', async () => {
    renderApp(<SettingsPage />, { routes: routes(), me: makeMe({ birth_date: '2004-03-14' }) });
    expect(await screen.findByText('Nguyễn Lan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sửa Họ và tên' })).toHaveAttribute('href', '/vi/app/settings/account');
    expect(screen.getByText('14/03/2004')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Sửa/ })).toHaveLength(1);
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
  });

  it('Gói hiện tại: Pro until the last day of pro_until in the learner zone, and "Xem gói học"', async () => {
    renderApp(<SettingsPage />, {
      routes: routes('pro', { 'GET /v1/me/entitlements': () => Response.json(entitlements('pro', { pro_until: '2027-02-07T17:00:00Z' })) }),
    });
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Pro · tới hết 07/02/2027')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói học' })).toHaveAttribute('href', '/vi/app/plans');
  });

  it('Gói hiện tại while the plan loads reads "Đang tải…", not an ellipsis', async () => {
    renderApp(<SettingsPage />, { routes: routes('free', { 'GET /v1/me/entitlements': () => new Promise<Response>(() => {}) }) });
    await screen.findByRole('heading', { level: 1, name: 'Cài đặt' });
    expect(screen.getAllByText('Đang tải…')).toHaveLength(1);
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('Gói hiện tại reads "Miễn phí" for Free', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    expect(await screen.findByText('Miễn phí')).toBeInTheDocument();
    expect(screen.queryByText(/tới hết/)).not.toBeInTheDocument();
  });

  it('D15: practice usage says "đã dùng 1/3" and when it reopens, in the learner zone, with no full stop', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    expect(await screen.findByText('đã dùng 1/3')).toBeInTheDocument();
    expect(screen.getByText('Còn 2 phiên, mở lại lúc 0:00')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Phiên luyện hôm nay' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('LA3#13: Free with the monthly allowance: both AI rows show what is left and the first of next month (1/12), and no "Cần gói Pro"', async () => {
    const free = entitlements('free', { pools: {
      practice_sessions: pool(3, 1, MIDNIGHT), ai_practice: pool(15, 3, '2026-11-30T17:00:00.000Z'), ai_lookup: pool(5, 0, '2026-11-30T17:00:00.000Z'),
    } });
    renderApp(<SettingsPage />, { routes: routes('free', { 'GET /v1/me/entitlements': () => Response.json(free) }) });
    expect(await screen.findByText('còn 12/15')).toBeInTheDocument();
    expect(screen.getByText('Lượt câu AI mới vào 1/12')).toBeInTheDocument();
    expect(screen.getByText('còn 5/5')).toBeInTheDocument();
    expect(screen.getByText('Lượt tra AI mới vào 1/12')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Lượt câu AI' })).toHaveAttribute('aria-valuenow', '12');
    expect(screen.queryByText('Cần gói Pro')).not.toBeInTheDocument();
  });

  it('Free with AI switched off (LA3#11): both AI rows say "Cần gói Pro" and show no refill line', async () => {
    renderApp(<SettingsPage />, { routes: routes('free') });
    await screen.findByText('đã dùng 1/3');
    expect(screen.getAllByText('Cần gói Pro')).toHaveLength(2);
    expect(screen.queryByText(/mới vào/)).not.toBeInTheDocument();
  });

  it('Pro: AI rows show what is left and the refill date', async () => {
    renderApp(<SettingsPage />, { routes: routes('pro') });
    expect(await screen.findByText('còn 287/300')).toBeInTheDocument();
    expect(screen.getByText('Lượt câu AI mới vào 15/11')).toBeInTheDocument();
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

  it('Ngôn ngữ is a select: picking "English" stores it, then moves to the other prefix', async () => {
    const { calls } = renderApp(<SettingsPage />, { routes: routes('free', { 'PATCH /v1/me': () => Response.json(makeMe({ native_language: 'en' })) }) });
    await userEvent.click(await screen.findByRole('button', { name: /Ngôn ngữ/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'English' }));
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
    expect(await screen.findByText('Sáng, tối hoặc theo máy')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('radio', { name: 'Tối' }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('the reminder switch sends PATCH /v1/me/reminders with an Idempotency-Key', async () => {
    const { calls } = renderApp(<SettingsPage />, {
      routes: routes('free', { 'PATCH /v1/me/reminders': () => Response.json({ enabled: false, email_verified: true }) }),
    });
    expect(await screen.findByText('Lúc 20:00 giờ của bạn, chỉ khi có từ đến hạn')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('switch', { name: /Nhắc học qua email/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH' && c.path === '/v1/me/reminders')).toBe(true));
    const call = calls.find((c) => c.method === 'PATCH' && c.path === '/v1/me/reminders')!;
    expect(call.body).toEqual({ enabled: false });
    expect(call.headers['Idempotency-Key']).toMatch(/[0-9a-f-]{36}/);
  });

  it('Phím tắt lists the five shortcuts with their keys', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    const section = await screen.findByRole('region', { name: 'Phím tắt' });
    expect(within(section).getAllByText(/^(N|\/|Space|1|2|Esc)$/).map((k) => k.textContent)).toEqual(['N', '/', 'Space', '1', '2', 'Esc']);
    expect(within(section).getByText('Cần ôn lại · Đã biết')).toBeInTheDocument();
  });

  it.each([true, false])('the email row shows only the email, without a verification invitation (verified=%s)', async (verified) => {
    renderApp(<SettingsPage />, { me: makeMe({ email_verified: verified }), routes: routes() });
    expect(await screen.findByText('lan@example.com')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa xác minh|Đã xác minh/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Xác minh email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác minh email' })).not.toBeInTheDocument();
  });
});

describe('SettingsPage account section (Bước 8, Figma 120:4507)', () => {
  it('rows in order: Đăng nhập bằng, Lịch sử giao dịch, Báo lỗi của tôi, Đăng xuất, Xóa tài khoản', async () => {
    renderApp(<SettingsPage />, { routes: routes() });
    const section = await screen.findByRole('region', { name: 'Tài khoản' });
    const text = section.textContent ?? '';
    const at = ['Đăng nhập bằng', 'Lịch sử giao dịch', 'Báo lỗi của tôi', 'Đăng xuất', 'Xóa tài khoản'].map((label) => text.indexOf(label));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('lists each sign-in method; links read with their row; "Xóa tài khoản" goes to the delete page', async () => {
    renderApp(<SettingsPage />, { routes: routes(), me: makeMe({ sign_in_methods: ['password', 'google'] }) });
    const methods = await screen.findByRole('list', { name: 'Đăng nhập bằng' });
    expect(within(methods).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Mật khẩu', 'Google']);
    expect(screen.getByRole('link', { name: 'Xem Lịch sử giao dịch' })).toHaveAttribute('href', '/vi/app/settings/transactions');
    expect(screen.getByRole('link', { name: 'Xem Báo lỗi của tôi' })).toHaveAttribute('href', '/vi/app/settings/reports');
    expect(screen.getByRole('link', { name: 'Xóa tài khoản' })).toHaveAttribute('href', '/vi/app/settings/delete-account');
    expect(screen.queryByRole('link', { name: /Đặt mật khẩu/ })).not.toBeInTheDocument();
  });

  it('one "Đăng xuất" button, which posts /v1/auth/logout once', async () => {
    const { count } = renderApp(<SettingsPage />, { routes: routes('free', { 'POST /v1/auth/logout': () => new Response(null, { status: 204 }) }) });
    await screen.findByText('Đăng nhập bằng');
    const buttons = screen.getAllByRole('button', { name: 'Đăng xuất' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(count('POST', '/v1/auth/logout')).toBe(1));
  });

  it('a Google-only account gets "Đặt mật khẩu", which goes to forgot password', async () => {
    renderApp(<SettingsPage />, { routes: routes(), me: makeMe({ auth_method: 'google', sign_in_methods: ['google'] }) });
    const set = await screen.findByRole('link', { name: /Đặt mật khẩu/ });
    expect(set).toHaveAttribute('href', '/vi/app/forgot-password');
    const methods = screen.getByRole('list', { name: 'Đăng nhập bằng' });
    expect(within(methods).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Google']);
  });

  it('a staff account sees "Liên hệ admin để xóa tài khoản" and no link to the delete page', async () => {
    renderApp(<SettingsPage />, { routes: routes(), me: makeMe({ staff_role: 'editor', permissions: ['content.edit'] }) });
    expect(await screen.findByText('Liên hệ admin để xóa tài khoản')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Xóa tài khoản/ })).not.toBeInTheDocument();
  });

  it('an older API answer without sign_in_methods is treated as password only', async () => {
    renderApp(<SettingsPage />, { routes: routes(), me: makeMe({ sign_in_methods: undefined, auth_method: undefined }) });
    const methods = await screen.findByRole('list', { name: 'Đăng nhập bằng' });
    expect(within(methods).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Mật khẩu']);
    expect(screen.queryByText('Đặt mật khẩu')).not.toBeInTheDocument();
  });
});

describe('AccountPage (K/91, K/92)', () => {
  it('M7.4: "Hồ sơ" and "Email đăng nhập" headings; the email is text with "Đã xác minh", not a field', async () => {
    renderApp(<AccountPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 2, name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Email đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.getByText('lan@example.com')).toBeInTheDocument();
    expect(screen.getByText('Đã xác minh')).toBeInTheDocument();
    expect(screen.getByText('Wordmet dành cho người từ 13 tuổi.')).toBeInTheDocument();
  });

  it('M7.4: an unverified email has no "Đã xác minh"', async () => {
    renderApp(<AccountPage />, { routes: routes(), me: makeMe({ email_verified: false }) });
    expect(await screen.findByText('lan@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Đã xác minh')).not.toBeInTheDocument();
  });

  it('M7.4: the plan card under the form: Pro, 30 sessions a day, "Xem gói →" to the plans page; no aside', async () => {
    renderApp(<AccountPage />, { routes: routes('pro') });
    expect(await screen.findByText('30 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(screen.getByText('Gói Pro')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem gói →' })).toHaveAttribute('href', '/vi/app/plans');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('M7.4: a Free learner sees "Gói Miễn phí" and the Free count', async () => {
    renderApp(<AccountPage />, { routes: routes('free') });
    expect(await screen.findByText('3 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(screen.getByText('Gói Miễn phí')).toBeInTheDocument();
  });

  it('K/92: a birth date under 13 shows the line at once and sends nothing', async () => {
    const { count } = renderApp(<AccountPage />, { routes: routes() });
    await screen.findByLabelText('Ngày sinh');
    pickDate('Ngày sinh', '2015-05-14');
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
    await screen.findByLabelText('Ngày sinh');
    pickDate('Ngày sinh', '2000-01-02');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Bạn cần đủ 13 tuổi để dùng Wordmet.')).toBeInTheDocument();
  });
});
