// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../../../messages/vi.json';
import { DeckRow } from './DeckRow';

// jsdom has no layout: the row is 1000px of cards in a 400px window.
function sized(scrollLeft = 0) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 1000 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, get: () => scrollLeft, set: () => {} });
}
const renderRow = () =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ App: vi_.App }}>
      <DeckRow label="Nhóm của bạn">
        <li>
          <a href="#g1">Nhóm 1</a>
        </li>
      </DeckRow>
    </NextIntlClientProvider>,
  );

describe('DeckRow (owner 10/11/2026: drag, arrows both sides, a card still opens on a click)', () => {
  let scrollBy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollBy = vi.fn();
    Element.prototype.scrollBy = scrollBy as unknown as Element['scrollBy'];
  });

  it('at the start only the "next" arrow shows; it scrolls one window to the right', () => {
    sized(0);
    renderRow();
    expect(screen.queryByRole('button', { name: 'Nhóm trước' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Nhóm sau' }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 320 }));
  });

  it('in the middle both arrows show; "previous" scrolls left', () => {
    sized(300);
    renderRow();
    fireEvent.scroll(screen.getByRole('list', { name: 'Nhóm của bạn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nhóm trước' }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: -320 }));
    expect(screen.getByRole('button', { name: 'Nhóm sau' })).toBeInTheDocument();
  });

  it('a drag with the mouse scrolls and does not open the card under it; a plain click still opens it', () => {
    sized(0);
    renderRow();
    const list = screen.getByRole('list', { name: 'Nhóm của bạn' });
    const link = screen.getByRole('link', { name: 'Nhóm 1' });
    const opened = vi.fn((e: Event) => e.preventDefault());
    link.addEventListener('click', opened);
    fireEvent.pointerDown(list, { pointerType: 'mouse', button: 0, clientX: 200 });
    fireEvent.pointerMove(list, { pointerType: 'mouse', clientX: 120 });
    fireEvent.pointerUp(list, { pointerType: 'mouse', clientX: 120 });
    fireEvent.click(link);
    expect(opened).not.toHaveBeenCalled();
    fireEvent.pointerDown(list, { pointerType: 'mouse', button: 0, clientX: 200 });
    fireEvent.pointerUp(list, { pointerType: 'mouse', clientX: 201 });
    fireEvent.click(link);
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
