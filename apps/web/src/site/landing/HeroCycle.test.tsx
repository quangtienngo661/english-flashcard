// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import vi_ from '../../../messages/vi.json';
import { HeroCycle } from './HeroCycle';

/** motion.ts keeps one observer for the whole file, so the stub reads this flag when an element is watched. */
let onScreen = true;

/** An observer that reports "on screen" (or not, per `onScreen`) as soon as an element is watched. */
const watching: { el: Element; obs: VisibleObserver }[] = [];
/** Reports every watched element as on or off screen, the way scrolling away and back does. */
function setOnScreen(visible: boolean) {
  watching.forEach(({ el, obs }) => obs.report(el, visible));
}

class VisibleObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  report(el: Element, visible: boolean) {
    act(() => this.cb([{ target: el, isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
  observe(el: Element) {
    watching.push({ el, obs: this });
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
  watching.length = 0;
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
  });

  it('keeps its height: all five words share one grid cell, only the current one is visible, and assistive tech gets one static copy', () => {
    const { container } = render(<HeroCycle copy={stage} />);
    const cell = container.querySelectorAll('.grid.min-h-15 > p');
    expect(cell).toHaveLength(5);
    expect([...cell].every((p) => p.classList.contains('col-start-1') && p.classList.contains('row-start-1'))).toBe(true);
    expect([...cell].filter((p) => !p.classList.contains('invisible'))).toHaveLength(1);
    expect(cell[0]).not.toHaveClass('invisible');
    expect(cell[1]).toHaveClass('invisible');
    // The cycling layer is hidden from assistive tech; one static sr-only copy of mitigate stays.
    expect(container.querySelector('.grid.min-h-15')).toHaveAttribute('aria-hidden', 'true');
    const sr = container.querySelector('.sr-only') as HTMLElement;
    expect(sr).toHaveTextContent('mitigate');
    expect(sr).toHaveTextContent('Cities need clear plans to mitigate');
    expect(screen.queryByText('allocate', { selector: 'p' })?.closest('[aria-hidden="true"]')).not.toBeNull();
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

  it('keeps the swapped word drawn across leaving and re-entering the screen: the fade class is the same on the same node (no replay)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    document.documentElement.classList.add('js');
    mockReducedMotion(false);
    const { container } = render(<HeroCycle copy={stage} />);
    act(() => void vi.advanceTimersByTime(1700 + 900 + 100 * 8 + 320 + 260 + 5000));
    const frame = () => container.querySelectorAll('.grid.min-h-15 > p')[1] as HTMLElement;
    const before = frame();
    expect(before).not.toHaveClass('invisible');
    expect(before).toHaveClass('animate-wm-showcase-swap');
    setOnScreen(false);
    setOnScreen(true);
    // jsdom runs no animations, so the pin is the cause: the class must not be dropped and re-added (that restarts the fade from opacity 0).
    expect(frame()).toBe(before);
    expect(frame()).toHaveClass('animate-wm-showcase-swap');
    expect(frame()).not.toHaveClass('invisible');
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
