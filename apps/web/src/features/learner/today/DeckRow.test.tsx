// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import { DeckRow } from './DeckRow';

// jsdom has no layout: the row's width, the card's smallest width (--deck-min) and the gap are stubbed.
let width = 0;
let observed: (() => void) | null = null;
function layout(w: number, min: string, gap: string) {
  width = w;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  const real = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const style = real(el);
    return new Proxy(style, {
      get: (target, key) => {
        if (key === 'getPropertyValue') return (name: string) => (name === '--deck-min' ? min : target.getPropertyValue(name));
        if (key === 'columnGap') return gap;
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  });
}
const names = (n: number) => Array.from({ length: n }, (_, i) => `Nhóm ${i + 1}`);
const renderRow = (n: number) =>
  render(
    <DeckRow label="Nhóm của bạn">
      {names(n).map((name) => (
        <li key={name}>
          <a href={`#${name}`}>{name}</a>
        </li>
      ))}
    </DeckRow>,
  );
const shown = () => within(screen.getByRole('list', { name: 'Nhóm của bạn' })).getAllByRole('link').map((a) => a.textContent);
const columns = () => (screen.getByRole('list', { name: 'Nhóm của bạn' }) as HTMLElement).style.gridTemplateColumns;

describe('DeckRow (owner 11/11/2026: the cards share the width evenly; only the cards that fit, the rest behind Xem tất cả)', () => {
  beforeEach(() => {
    observed = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observed = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('desktop, 800 px, cards at least 176 px with a 20 px gap: 4 columns, 4 of 6 cards, no arrows', () => {
    layout(800, '176px', '20px');
    renderRow(6);
    expect(shown()).toEqual(names(4));
    expect(columns()).toBe('repeat(4, minmax(0, 1fr))');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('phone, 358 px, cards at least 150 px with a 14 px gap: 2 columns, 2 cards', () => {
    layout(358, '150px', '14px');
    renderRow(5);
    expect(shown()).toEqual(names(2));
    expect(columns()).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('fewer cards than columns: every card, still in the 4 even columns (a lone card does not stretch)', () => {
    layout(800, '176px', '20px');
    renderRow(2);
    expect(shown()).toEqual(names(2));
    expect(columns()).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('exactly at the edge: 4 × 176 + 3 × 20 = 764 px fits 4; 763 px fits 3', () => {
    layout(764, '176px', '20px');
    const { unmount } = renderRow(6);
    expect(shown()).toEqual(names(4));
    unmount();
    vi.restoreAllMocks();
    layout(763, '176px', '20px');
    renderRow(6);
    expect(shown()).toEqual(names(3));
  });

  it('narrower than one card still shows one card', () => {
    layout(120, '150px', '14px');
    renderRow(3);
    expect(shown()).toEqual(names(1));
  });

  it('when the row is resized the count follows', () => {
    layout(800, '176px', '20px');
    renderRow(6);
    expect(shown()).toHaveLength(4);
    width = 560;
    act(() => observed?.());
    expect(shown()).toEqual(names(2));
  });

  it('before the row has a width (no layout yet): every card', () => {
    layout(0, '176px', '20px');
    renderRow(6);
    expect(shown()).toEqual(names(6));
    expect(columns()).toBe('');
  });
});
