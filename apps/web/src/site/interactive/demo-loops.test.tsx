// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { DemoLoops } from './DemoLoops';
import { setMotionChoice } from './motion';

/** Reports every watched element on screen at once (motion.ts keeps one observer per option set for the whole file). */
class VisibleObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb([{ target: el, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const realMatchMedia = window.matchMedia;

function renderDemo() {
  return render(
    <DemoLoops>
      <article>
        <span data-typed="">mitigate</span>
        <p data-result="">Added</p>
      </article>
    </DemoLoops>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', VisibleObserver);
  window.matchMedia = ((query: string) =>
    ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  document.documentElement.classList.add('js');
});

afterEach(() => {
  document.documentElement.classList.remove('js');
  document.documentElement.removeAttribute('data-wm-motion');
  localStorage.clear();
  window.matchMedia = realMatchMedia;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// T10 (QA7): the footer switch stops a running loop on its end state, and starting motion again starts the loop again.
describe('DemoLoops and the motion switch', () => {
  it('control: with motion on, the word is typed again letter by letter', () => {
    renderDemo();
    act(() => void vi.advanceTimersByTime(85 * 3));
    expect(screen.getByText('mit')).toBeInTheDocument();
    expect(screen.getByText('Added')).toHaveAttribute('data-wm-off');
  });

  it('switching motion off mid-word puts the end state back and nothing moves after; switching on types again', () => {
    renderDemo();
    act(() => void vi.advanceTimersByTime(85 * 3));
    expect(screen.getByText('mit')).toBeInTheDocument();

    act(() => setMotionChoice(false));
    expect(screen.getByText('mitigate')).toBeInTheDocument();
    expect(screen.getByText('Added')).not.toHaveAttribute('data-wm-off');
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText('mitigate')).toBeInTheDocument();
    expect(screen.getByText('Added')).not.toHaveAttribute('data-wm-off');

    act(() => setMotionChoice(true));
    act(() => void vi.advanceTimersByTime(85 * 2));
    expect(screen.getByText('mi')).toBeInTheDocument();
  });

  it('a page loaded with motion off starts the loop once the switch turns motion on', () => {
    document.documentElement.classList.remove('js');
    document.documentElement.setAttribute('data-wm-motion', 'off');
    renderDemo();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText('mitigate')).toBeInTheDocument();

    act(() => setMotionChoice(true));
    act(() => void vi.advanceTimersByTime(85));
    expect(screen.getByText('m')).toBeInTheDocument();
  });
});
