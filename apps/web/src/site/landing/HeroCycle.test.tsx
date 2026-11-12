// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import vi_ from '../../../messages/vi.json';
import { HeroCycle } from './HeroCycle';

/** motion.ts keeps one observer for the whole file, so the stub reads this flag when an element is watched. */
let onScreen = true;

/** An observer that reports "on screen" (or not, per `onScreen`) as soon as an element is watched. */
class VisibleObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    if (onScreen) this.cb([{ target: el, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const realMatchMedia = window.matchMedia;
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) =>
    ({ matches: reduce && query.includes('prefers-reduced-motion: reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const stage = vi_.Landing.stage;
const html = () => document.body.textContent ?? '';

beforeEach(() => {
  onScreen = true;
});

afterEach(() => {
  document.documentElement.classList.remove('js');
  window.matchMedia = realMatchMedia;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HeroCycle (F.18)', () => {
  it('the server render is the final frame of mitigate: typed in, green, "Đúng · lên Bậc 3"', () => {
    const markup = renderToStaticMarkup(<HeroCycle copy={stage} />);
    expect(markup).toContain('Thẻ từ · ôn lại sau 3 ngày');
    expect(markup).toContain('Đúng · lên Bậc 3');
    expect(markup).toContain('Cities need clear plans to ');
    expect(markup).toContain('border-wm-pass');
  });

  it('with reduced motion it stays on the final frame', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    document.documentElement.classList.add('js');
    mockReducedMotion(true);
    render(<HeroCycle copy={stage} />);
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByText('Thẻ từ · ôn lại sau 3 ngày')).toBeInTheDocument();
    expect(html()).toContain('Đúng · lên Bậc 3');
  });

  it('with motion allowed it moves on to allocate (7 days, Bậc 4)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    document.documentElement.classList.add('js');
    mockReducedMotion(false);
    render(<HeroCycle copy={stage} />);
    expect(screen.getByText('Thẻ từ · ôn lại sau 3 ngày')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1700 + 900 + 100 * 8 + 320 + 260 + 5000));
    expect(screen.getByText('Thẻ từ · ôn lại sau 7 ngày')).toBeInTheDocument();
    expect(screen.getByText('allocate', { selector: 'p' })).toBeInTheDocument();
  });

  it('stays still while off screen', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    onScreen = false;
    document.documentElement.classList.add('js');
    mockReducedMotion(false);
    render(<HeroCycle copy={stage} />);
    act(() => void vi.advanceTimersByTime(30000));
    expect(screen.getByText('Thẻ từ · ôn lại sau 3 ngày')).toBeInTheDocument();
  });
});
