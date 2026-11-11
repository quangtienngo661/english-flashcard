// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { Hero } from './Hero';
import { landing, renderLanding } from './test-utils';

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
