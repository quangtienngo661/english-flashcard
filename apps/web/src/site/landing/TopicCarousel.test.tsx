// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import vi_ from '../../../messages/vi.json';
import { AUTO_MS, TopicCarousel } from './TopicCarousel';
import { topicSlot } from './topic-arc';

let showCarousel: (visible: boolean) => void;

class CarouselObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    showCarousel = (isIntersecting) =>
      this.callback([{ target, isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    showCarousel(true);
  }

  unobserve() {}
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: reduce && media === '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
  }));
}

const next = () => screen.getByRole('button', { name: 'Nhóm sau' });
const prev = () => screen.getByRole('button', { name: 'Nhóm trước' });
const carousel = () => screen.getByRole('region', { name: 'Các nhóm chủ đề mẫu' });
const words = () => within(screen.getByRole('list'));
const renderCarousel = () => render(<TopicCarousel copy={vi_.Landing.groups} />);
const advance = (ms = AUTO_MS) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.classList.add('js');
  stubReducedMotion(false);
  vi.stubGlobal('IntersectionObserver', CarouselObserver);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1440);
});

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('js');
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TopicCarousel', () => {
  it('starts with all five Travel words, their rest count and the first word in the footer', () => {
    renderCarousel();
    expect(words().getAllByRole('listitem').map((chip) => chip.textContent)).toEqual([
      'destination', 'accommodation', 'departure', 'baggage', 'customs', '+124 từ',
    ]);
    expect(within(screen.getByRole('list').parentElement!).getByText('Bắt đầu với')).toHaveTextContent('Bắt đầu với destination');
    expect(screen.getByText('Chủ đề có sẵn ·')).toHaveTextContent('Chủ đề có sẵn · B1');
  });

  it('moves to the next deck after 3500 ms', () => {
    renderCarousel();
    advance(AUTO_MS - 1);
    expect(words().getByText('destination')).toBeInTheDocument();
    advance(1);
    expect(words().getByText('ingredient')).toBeInTheDocument();
    expect(words().queryByText('destination')).toBeNull();
  });

  it('wraps and stops advancing for good once the visitor steps by hand', () => {
    renderCarousel();
    fireEvent.click(prev());
    expect(words().getByText('assignment')).toBeInTheDocument();
    fireEvent.click(next());
    expect(words().getByText('destination')).toBeInTheDocument();
    fireEvent.click(next());
    expect(words().getByText('ingredient')).toBeInTheDocument();
    advance(AUTO_MS * 3);
    expect(words().getByText('ingredient')).toBeInTheDocument();
  });

  it('waits while focus moves inside the carousel and while the mouse is over it', () => {
    renderCarousel();
    fireEvent.focusIn(prev());
    advance(AUTO_MS * 2);
    expect(words().getByText('destination')).toBeInTheDocument();
    fireEvent.focusOut(prev(), { relatedTarget: next() });
    advance(AUTO_MS * 2);
    expect(words().getByText('destination')).toBeInTheDocument();
    fireEvent.focusOut(next());
    fireEvent.pointerEnter(carousel(), { pointerType: 'mouse' });
    advance(AUTO_MS * 2);
    expect(words().getByText('destination')).toBeInTheDocument();
    fireEvent.pointerLeave(carousel(), { pointerType: 'mouse' });
    advance();
    expect(words().getByText('ingredient')).toBeInTheDocument();
  });

  it('advances on a horizontal swipe and ignores the click at the end of it', () => {
    renderCarousel();
    const start = words().getByText('destination');
    fireEvent.pointerDown(start, { button: 0, clientX: 180, clientY: 70, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(start, { clientX: 125, clientY: 75, pointerId: 1, pointerType: 'touch' });
    expect(words().getByText('ingredient')).toBeInTheDocument();
    fireEvent.click(words().getByText('ingredient'));
    advance(AUTO_MS * 2);
    expect(words().getByText('ingredient')).toBeInTheDocument();
  });

  it('keeps Travel in place when motion is reduced', () => {
    stubReducedMotion(true);
    renderCarousel();
    advance(AUTO_MS * 3);
    expect(words().getByText('destination')).toBeInTheDocument();
  });

  it('keeps Travel visible without the js class', () => {
    document.documentElement.classList.remove('js');
    renderCarousel();
    advance(AUTO_MS * 3);
    expect(words().getByText('destination')).toBeInTheDocument();
  });

  it('does not advance while the tab is hidden and resumes when visible', () => {
    const hidden = vi.mocked(Object.getOwnPropertyDescriptor(document, 'hidden')!.get!);
    hidden.mockReturnValue(true);
    renderCarousel();
    advance(AUTO_MS * 3);
    expect(words().getByText('destination')).toBeInTheDocument();
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    advance();
    expect(words().getByText('ingredient')).toBeInTheDocument();
  });

  it('does not advance out of view and resumes on return', () => {
    renderCarousel();
    act(() => showCarousel(false));
    advance(AUTO_MS * 3);
    expect(words().getByText('destination')).toBeInTheDocument();
    act(() => showCarousel(true));
    advance();
    expect(words().getByText('ingredient')).toBeInTheDocument();
  });

  it('re-spaces the stacks when the window is resized across desktop and phone widths', () => {
    renderCarousel();
    const slot = screen.getByText('Work & Jobs').closest<HTMLElement>('[style]')!;
    const viewport = vi.mocked(Object.getOwnPropertyDescriptor(document.documentElement, 'clientWidth')!.get!);
    expect(slot.style.getPropertyValue('--x')).toBe(String(topicSlot(2, 1440).x));
    for (const width of [1024, 390]) {
      viewport.mockReturnValue(width);
      fireEvent(window, new Event('resize'));
      expect(slot.style.getPropertyValue('--x')).toBe(String(topicSlot(2, width).x));
    }
  });
});
