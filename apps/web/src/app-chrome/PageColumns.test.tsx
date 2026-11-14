// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { PageColumns } from './PageColumns';

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

/** A matchMedia whose width can change; `set` fires the change listeners as a resize would. */
function controllable(width: number) {
  const listeners = new Set<() => void>();
  let current = width;
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    return {
      get matches() {
        return min ? current >= Number(min[1]) : false;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
  }) as unknown as typeof window.matchMedia;
  return (next: number) => {
    current = next;
    act(() => listeners.forEach((fn) => fn()));
  };
}

describe('PageColumns asideFirstBelow', () => {
  it('moves the columns when the width crosses 1280 px instead of remounting them', () => {
    const set = controllable(390);
    render(
      <PageColumns asideFirstBelow aside={<button>Luyện</button>}>
        <p>Danh sách</p>
      </PageColumns>,
    );
    const button = screen.getByRole('button', { name: 'Luyện' });
    const list = screen.getByText('Danh sách');
    expect(button.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    set(1280);
    expect(button.isConnected).toBe(true);
    expect(list.isConnected).toBe(true);
    expect(screen.getByRole('button', { name: 'Luyện' })).toBe(button);
    expect(list.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
