// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { problem } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AccountDeleted } from './AccountDeleted';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => search, usePathname: () => '/vi/app/account-deleted' }));

const signedOut = { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') };

// Plan part 2, M2.9 (Figma 36:549): the success circle, the title, and a secondary button back to sign-in.
describe('AccountDeleted', () => {
  beforeEach(() => {
    search = new URLSearchParams();
  });

  it('says the account was deleted and links back to sign-in', () => {
    renderApp(<AccountDeleted />, { routes: signedOut });
    expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản của bạn đã được xóa.' })).toBeInTheDocument();
    expect(screen.getByText('Cảm ơn bạn đã học cùng Wordmet. Thư xác nhận đã gửi tới email của bạn.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute('href', '/vi/app/login');
  });

  it('?pending=1 says the deletion is being finished', () => {
    search = new URLSearchParams({ pending: '1' });
    renderApp(<AccountDeleted />, { routes: signedOut });
    expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản đang được xóa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute('href', '/vi/app/login');
  });
});
