// @vitest-environment jsdom
import { act, fireEvent, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { renderApp } from '@/test-utils/render-app';
import type { Card } from '../groups/groups-api';
import { CardStack, type CardStackHandle } from './CardStack';
import { useCardDrag } from './useCardDrag';

// M5.7: the Học card stack (motion doc §2, prototype chong-the-mo.html).
vi.setConfig({ testTimeout: 30_000 });

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

function DragProbe({ onRate, flipped = true }: { onRate: (rating: 'known' | 'review') => void; flipped?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { stamp } = useCardDrag(ref, { enabled: true, flipped, onRate: (rating) => onRate(rating) });
  return (
    <div ref={ref} data-testid="card">
      {stamp ?? 'none'}
    </div>
  );
}

/** A drag from x 0 to `to`, `steps` moves `ms` apart. */
function drag(el: HTMLElement, to: number, { steps = 4, ms = 50 } = {}) {
  fireEvent.pointerDown(el, { clientX: 0, clientY: 0, button: 0, isPrimary: true, pointerId: 1 });
  for (let i = 1; i <= steps; i++) {
    now += ms;
    fireEvent.pointerMove(el, { clientX: (to * i) / steps, clientY: 0, pointerId: 1 });
  }
  fireEvent.pointerUp(el, { clientX: to, clientY: 0, pointerId: 1 });
}

describe('useCardDrag', () => {
  it('a drag of 120 px to the right rates the card known', () => {
    const onRate = vi.fn();
    renderApp(<DragProbe onRate={onRate} />, { session: true, chrome: false });
    drag(screen.getByTestId('card'), 120, { steps: 6, ms: 80 });
    expect(onRate).toHaveBeenCalledExactlyOnceWith('known');
  });

  it('a drag of 120 px to the left rates it to review', () => {
    const onRate = vi.fn();
    renderApp(<DragProbe onRate={onRate} />, { session: true, chrome: false });
    drag(screen.getByTestId('card'), -120, { steps: 6, ms: 80 });
    expect(onRate).toHaveBeenCalledExactlyOnceWith('review');
  });

  it('a slow drag of 80 px rates nothing and the card goes back', () => {
    const onRate = vi.fn();
    renderApp(<DragProbe onRate={onRate} />, { session: true, chrome: false });
    const card = screen.getByTestId('card');
    drag(card, 80, { steps: 4, ms: 100 });
    expect(onRate).not.toHaveBeenCalled();
    expect(card.style.transform).toBe('');
  });

  it('a fast flick (60 px in 100 ms) rates the card', () => {
    const onRate = vi.fn();
    renderApp(<DragProbe onRate={onRate} />, { session: true, chrome: false });
    drag(screen.getByTestId('card'), 60, { steps: 2, ms: 50 });
    expect(onRate).toHaveBeenCalledExactlyOnceWith('known');
  });

  it('the stamp shows once the drag passes half the threshold', () => {
    renderApp(<DragProbe onRate={() => {}} />, { session: true, chrome: false });
    const card = screen.getByTestId('card');
    fireEvent.pointerDown(card, { clientX: 0, clientY: 0, button: 0, isPrimary: true, pointerId: 1 });
    now += 100;
    fireEvent.pointerMove(card, { clientX: 40, clientY: 0, pointerId: 1 });
    expect(card).toHaveTextContent('none');
    now += 100;
    fireEvent.pointerMove(card, { clientX: 60, clientY: 0, pointerId: 1 });
    expect(card).toHaveTextContent('known');
  });

  it('a rating drag clears its stamp, so the next card turned over shows none (final review I2)', () => {
    renderApp(<DragProbe onRate={() => {}} />, { session: true, chrome: false });
    const card = screen.getByTestId('card');
    drag(card, 130, { steps: 6, ms: 80 });
    expect(card).toHaveTextContent('none');
  });

  it('a card not turned over never rates, whatever the drag', () => {
    const onRate = vi.fn();
    renderApp(<DragProbe onRate={onRate} flipped={false} />, { session: true, chrome: false });
    drag(screen.getByTestId('card'), 200, { steps: 2, ms: 50 });
    expect(onRate).not.toHaveBeenCalled();
  });
});

const card = (n: number): Card => ({
  item_id: `item-${n}`, sense_id: `sense-${n}`, level: 1, due_date: '2026-11-11', priority: false, section: 'due',
  content: {
    sense_id: `sense-${n}`, scope: 'catalog', lemma: `word${n}`, pos: 'verb', level: 'B1', context_label: null,
    meaning: { text: `nghĩa ${n}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [], form_of: null, sentences: [],
  },
});

describe('CardStack', () => {
  it('only the top card loads its word page (the cards behind draw a light front)', async () => {
    const view = renderApp(<CardStack cards={[card(1), card(2), card(3), card(4)]} current={0} flipped={false} onFlip={() => {}} onRate={() => {}} />, {
      session: true,
      chrome: false,
      routes: {
        'GET /v1/words/word1': () => Response.json({ inflections: [] }),
        'GET /v1/words/word2': () => Response.json({ inflections: [] }),
        'GET /v1/words/word3': () => Response.json({ inflections: [] }),
      },
    });
    await screen.findAllByText('word1');
    expect(screen.getAllByText('word2')).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(view.calls.filter((c) => c.path.startsWith('/v1/words/')).map((c) => c.path)).toEqual(['/v1/words/word1']);
  });

  it('with reduced motion, rating animates only opacity, within 200 ms', async () => {
    const animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: () => {}, onfinish: null }));
    Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true });
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('reduce'), media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }) as MediaQueryList);
    const onRate = vi.fn();
    const ref = { current: null as null | CardStackHandle };
    // The parent moves to the next card as soon as a card is rated (QM5-2 a).
    function Harness() {
      const [current, setCurrent] = useState(0);
      return (
        <CardStack ref={ref} cards={[card(1), card(2)]} current={current} flipped={current === 0} onFlip={() => {}}
          onRate={(rating) => { onRate(rating); setCurrent((c) => c + 1); }} />
      );
    }
    renderApp(<Harness />, {
      session: true,
      chrome: false,
      routes: { 'GET /v1/words/word1': () => Response.json({ inflections: [] }), 'GET /v1/words/word2': () => Response.json({ inflections: [] }) },
    });
    await screen.findAllByText('word1');
    act(() => ref.current!.rate('known'));
    expect(onRate).toHaveBeenCalledExactlyOnceWith('known');
    await screen.findAllByText('word2');
    expect(animate).toHaveBeenCalled();
    for (const [keyframes, options] of animate.mock.calls as unknown as Array<[Keyframe[], KeyframeAnimationOptions]>) {
      for (const frame of keyframes) expect(Object.keys(frame).filter((k) => k !== 'offset' && k !== 'easing')).toEqual(['opacity']);
      expect(Number(options.duration)).toBeLessThanOrEqual(200);
    }
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('with reduced motion, the card behind does not scale or blur while the top card is dragged (final review #3)', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('reduce'), media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }) as MediaQueryList);
    const { container } = renderApp(<CardStack cards={[card(1), card(2)]} current={0} flipped onFlip={() => {}} onRate={() => {}} label="Card 1" />, {
      session: true,
      chrome: false,
      routes: { 'GET /v1/words/word1': () => Response.json({ inflections: [] }) },
    });
    const top = await screen.findByRole('group', { name: 'Card 1' });
    fireEvent.pointerDown(top, { clientX: 0, clientY: 0, button: 0, isPrimary: true, pointerId: 1 });
    now += 100;
    fireEvent.pointerMove(top, { clientX: 80, clientY: 0, pointerId: 1 });
    const behind = container.querySelector<HTMLElement>('[data-depth="1"]')!;
    expect(behind.style.transform).not.toMatch(/scale/);
    expect(behind.style.filter).toBe('');
  });
});
