// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../../../messages/vi.json';
import { AuthShowcase } from './AuthShowcase';

// Part 10 P.14 (mockup L418-460, L1395-1480): the sign-in and sign-up panel tells the learning loop. Five words take turns in the word
// card; the practice card types the word into the blank, presses Enter and turns green; the due count falls one by one. With reduced
// motion the final frame shows at once and nothing animates.
function renderShowcase() {
  return render(
    <NextIntlClientProvider locale="vi" messages={vi_}>
      <AuthShowcase />
    </NextIntlClientProvider>,
  );
}

/** Advances fake time in small steps so each step's effect schedules the next timer. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += 10) act(() => vi.advanceTimersByTime(10));
}

function mockReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  );
}

describe('AuthShowcase', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is hidden from assistive technology as a whole', () => {
    mockReducedMotion(false);
    const { container } = renderShowcase();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows mitigate first, then allocate in the word card after one cycle', () => {
    mockReducedMotion(false);
    renderShowcase();
    expect(screen.getByText('to make something bad less serious')).toBeInTheDocument();
    advance(4200);
    expect(screen.getByText('to give a share of something for a purpose')).toBeInTheDocument();
    expect(screen.queryByText('to make something bad less serious')).not.toBeInTheDocument();
  });

  it('types the word, then the practice card ends with "Đúng · lên Bậc 2" and the due count falls from 12 to 11', () => {
    mockReducedMotion(false);
    renderShowcase();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('Đúng · lên Bậc 2')).not.toBeInTheDocument();
    advance(1250);
    expect(screen.getByText('miti')).toBeInTheDocument();
    advance(1150);
    expect(screen.getByText('Đúng · lên Bậc 2')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('names the six levels on the memory path with their intervals', () => {
    mockReducedMotion(false);
    renderShowcase();
    for (const label of ['Mới', 'Bậc 1 · 1 ngày', 'Bậc 2 · 3 ngày', 'Bậc 3 · 7 ngày', 'Bậc 4 · 14 ngày', 'Bậc 5 · 30 ngày']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('animates when motion is allowed (control for the reduced-motion case)', () => {
    mockReducedMotion(false);
    const { container } = renderShowcase();
    expect(container.querySelectorAll('[class*="animate-"]').length).toBeGreaterThan(0);
  });

  it('with reduced motion shows the final practice state at once and runs no animation', () => {
    mockReducedMotion(true);
    const { container } = renderShowcase();
    expect(screen.getByText('Đúng · lên Bậc 2')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(container.querySelectorAll('[class*="animate-"]')).toHaveLength(0);
    advance(8000);
    expect(screen.getByText('to make something bad less serious')).toBeInTheDocument();
  });
});
