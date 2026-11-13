// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import vi_ from '../../../messages/vi.json';
import { PricingSection } from '../landing/PricingSection';
import { FALLBACK_LANDING_DATA } from '../landing/landing-data.fallback';
import { whileInView } from './motion';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/** An IntersectionObserver the test drives: `report` tells every observed element it is (or is not) in view. */
class FakeObserver {
  static all: FakeObserver[] = [];
  targets = new Set<Element>();
  unobserved: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
    this.unobserved.push(el);
  }
  disconnect() {}
  takeRecords() {
    return [];
  }
  report(isIntersecting: boolean) {
    const records = [...this.targets].map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
    this.callback(records, this as unknown as IntersectionObserver);
  }
}

const realMatchMedia = window.matchMedia;

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  document.documentElement.classList.remove('js');
  window.matchMedia = realMatchMedia;
  vi.unstubAllGlobals();
});

describe('one element watched twice on the shared observer (I1 of the M8b review)', () => {
  it('calls both callbacks, and stops observing only when the last one is cleaned up', () => {
    // An option set no other test uses, so this test gets its own shared observer.
    const init = { threshold: 0.51 };
    const el = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = whileInView(el, first, init);
    const stopSecond = whileInView(el, second, init);
    expect(FakeObserver.all).toHaveLength(1);
    const io = FakeObserver.all[0];

    io.report(true);
    expect(first.mock.calls).toEqual([[true]]);
    expect(second.mock.calls).toEqual([[true]]);

    stopFirst();
    expect(io.unobserved).toEqual([]);
    io.report(false);
    expect(first.mock.calls).toEqual([[true]]);
    expect(second.mock.calls).toEqual([[true], [false]]);

    stopSecond();
    expect(io.unobserved).toEqual([el]);
  });
});

describe('the light on the Pro card border', () => {
  // Owner 13/11/2026: the blurred light that ran around the card bulged out past it; it now runs on the border only, like the closing card.
  it('lights the border ring once the card is reported in view, and no blurred light sits outside the card', () => {
    window.matchMedia = ((query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
    document.documentElement.classList.add('js');
    render(<PricingSection copy={vi_.Landing.plans} prices={FALLBACK_LANDING_DATA.prices} locale="vi" />);
    const ring = document.querySelector('[data-pro-ring]');
    expect(ring).not.toBeNull();
    expect(ring?.querySelector('[data-pro-card]')).not.toBeNull();
    expect(document.querySelector('[data-wm-sweep]')).toBeNull();
    // Control: the Pro card's heading is there and nothing is on before the observer reports.
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(ring?.hasAttribute('data-wm-on')).toBe(false);

    act(() => FakeObserver.all.forEach((io) => io.report(true)));
    expect(ring?.hasAttribute('data-wm-on')).toBe(true);
  });
});
