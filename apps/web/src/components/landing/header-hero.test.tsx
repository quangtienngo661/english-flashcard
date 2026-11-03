// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { Hero } from './Hero';
import { LandingHeader } from './LandingHeader';
import { landing, renderLanding } from './test-utils';

describe('LandingHeader', () => {
  it('LR20 Đăng ký goes to the account registration, Đăng nhập to the login page', () => {
    renderLanding(<LandingHeader copy={landing.nav} locale="vi" />);
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/vi/app/register');
    expect(header.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/vi/app/login');
  });

  it('L4 has the page anchors and no language switch', () => {
    renderLanding(<LandingHeader copy={landing.nav} locale="vi" />);
    const nav = within(screen.getByRole('navigation', { name: landing.nav.label }));
    expect(nav.getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['#tinh-nang', '#bai-tap', '#goi', '#hoi-dap']);
    expect(screen.queryByRole('link', { name: /english/i })).toBeNull();
  });

  it('L1 has the theme toggle, labelled for the switch it would make', () => {
    renderLanding(<LandingHeader copy={landing.nav} locale="vi" />);
    expect(screen.getByRole('button', { name: landing.nav.themeToDark })).toBeInTheDocument();
  });
});

describe('Hero', () => {
  it('C2 the heading is the approved two lines, each its own block so that each balances alone', () => {
    const { container } = renderLanding(<Hero copy={landing.hero} locale="vi" />);
    const h1 = container.querySelector('h1')!;
    expect(h1).toHaveTextContent('Học từ vựng tiếng Anh, ghi nhớ và vận dụng');
    expect([...h1.children].map((line) => line.textContent)).toEqual(['Học từ vựng tiếng Anh,', 'ghi nhớ và vận dụng']);
  });

  it('C3 the sign-up button comes before the login link, both in the left column', () => {
    renderLanding(<Hero copy={landing.hero} locale="vi" />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/vi/app/register', '/vi/app/login']);
    expect(screen.getByText(landing.hero.note)).toBeInTheDocument();
  });
});
