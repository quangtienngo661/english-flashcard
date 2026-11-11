// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import vi_ from '../../../messages/vi.json';
import { HomePage } from '../landing/HomePage';
import { FALLBACK_LANDING_DATA } from '../landing/landing-data.fallback';
import { Marquee } from './Marquee';
import { HIDDEN_START } from './motion';
import { SplitWords } from './SplitWords';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/** An observer that never reports: whatever waits for it stays in its start state. */
class SilentObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const realMatchMedia = window.matchMedia;

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduce && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const renderHome = () => render(<HomePage copy={vi_.Landing} data={FALLBACK_LANDING_DATA} locale="vi" />);

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', SilentObserver);
});

afterEach(() => {
  document.documentElement.classList.remove('js');
  window.matchMedia = realMatchMedia;
  vi.unstubAllGlobals();
});

describe('SplitWords', () => {
  it('keeps the exact sentence as the accessible name: one sr-only copy, the word spans aria-hidden', () => {
    render(
      <SplitWords
        as="h1"
        id="hero-title"
        segments={[{ text: 'Ôn từ đúng lúc, ' }, { br: 'md:hidden' }, { text: 'luyện từ ' }, { text: 'trong câu', className: 'text-wm-accent' }, { text: '.' }]}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAccessibleName('Ôn từ đúng lúc, luyện từ trong câu.');
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByText('Ôn từ đúng lúc, luyện từ trong câu.')).toHaveClass('sr-only');

    const words = [...h1.querySelectorAll('[data-wm-word]')];
    expect(words.map((w) => w.textContent)).toEqual(['Ôn', 'từ', 'đúng', 'lúc,', 'luyện', 'từ', 'trong', 'câu', '.']);
    expect(words.every((w) => w.closest('[aria-hidden="true"]') !== null)).toBe(true);
    expect(words.filter((w) => w.classList.contains('text-wm-accent')).map((w) => w.textContent)).toEqual(['trong', 'câu']);
  });
});

describe('the home page before and after JavaScript', () => {
  it('control: with the js class and motion allowed, blocks below the hero wait hidden for the observer', () => {
    mockReducedMotion(false);
    document.documentElement.classList.add('js');
    renderHome();
    expect(document.querySelectorAll(HIDDEN_START).length).toBeGreaterThan(5);
  });

  it('reduced motion: no element is left in its hidden start state after mount', () => {
    mockReducedMotion(true);
    document.documentElement.classList.add('js');
    renderHome();
    expect(document.querySelectorAll(HIDDEN_START)).toHaveLength(0);
  });

  it('without the js class nothing is hidden', () => {
    mockReducedMotion(false);
    renderHome();
    expect(document.querySelectorAll(HIDDEN_START)).toHaveLength(0);
  });

  it('server HTML: the hero plays on load (marked in), the section titles wait for scroll', () => {
    const html = renderToStaticMarkup(<HomePage copy={vi_.Landing} data={FALLBACK_LANDING_DATA} locale="vi" />);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h1')?.hasAttribute('data-wm-in')).toBe(true);
    const h2s = [...doc.querySelectorAll('h2')];
    expect(h2s).toHaveLength(5);
    expect(h2s.every((h) => h.hasAttribute('data-wm-reveal') && !h.hasAttribute('data-wm-in'))).toBe(true);
  });
});

describe('Marquee', () => {
  it('repeats its children once and hides the copy from screen readers', () => {
    render(
      <Marquee>
        <span>mitigate</span>
        <span>allocate</span>
      </Marquee>,
    );
    expect(screen.getAllByText('mitigate').map((el) => el.closest('[aria-hidden="true"]') !== null)).toEqual([false, true]);
    expect(screen.getAllByText('allocate')).toHaveLength(2);
  });
});
