// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';

let observerCallback: IntersectionObserverCallback | null = null;

beforeEach(() => {
  observerCallback = null;
  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      observerCallback = cb;
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
});

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('Reveal', () => {
  it('content is present and visible before the observer fires', () => {
    mockReducedMotion(false);
    render(<Reveal>Section copy</Reveal>);
    expect(screen.getByText('Section copy')).toBeInTheDocument();
    expect(screen.getByText('Section copy')).not.toHaveClass('opacity-0');
  });

  it('hides content below the fold, then reveals it once when it intersects', () => {
    mockReducedMotion(false);
    render(<Reveal>Below the fold</Reveal>);
    const el = screen.getByText('Below the fold');
    act(() => observerCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(el).toHaveClass('opacity-0');
    act(() => observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(el).not.toHaveClass('opacity-0');
  });

  it('UB18 step 2 uses a 60ms delay and the slow (400ms) duration', () => {
    mockReducedMotion(false);
    render(<Reveal step={2}>Third card</Reveal>);
    const el = screen.getByText('Third card');
    act(() => observerCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(el).toHaveClass('delay-60', 'duration-slow', 'ease-enter');
  });

  it('LP26 with reduced motion Reveal never hides content', () => {
    mockReducedMotion(true);
    render(<Reveal>Still here</Reveal>);
    act(() => observerCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByText('Still here')).not.toHaveClass('opacity-0');
  });
});
