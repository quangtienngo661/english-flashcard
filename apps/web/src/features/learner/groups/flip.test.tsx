// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { ms, rememberRect, useFlipFrom } from './flip';

let reduced = false;
vi.mock('@/lib/use-reduced-motion', () => ({ useReducedMotion: () => reduced }));

function Head() {
  const ref = useRef<HTMLDivElement>(null);
  useFlipFrom('group-stack', ref);
  return <div ref={ref}>head</div>;
}

const rect = (x: number, y: number, w: number, h: number) => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect;

describe('useFlipFrom (motion doc §3: the stack flies from the carousel to the page head)', () => {
  let animate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    reduced = false;
    animate = vi.fn();
    Element.prototype.animate = animate as unknown as Element['animate'];
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect(100, 200, 210, 267));
  });
  afterEach(() => vi.restoreAllMocks());

  it('with no remembered rect: no animation', () => {
    render(<Head />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('with a rect and motion allowed: one animation of 380 ms from that rect', () => {
    const from = document.createElement('div');
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValueOnce(rect(500, 300, 290, 368));
    rememberRect('group-stack', from);
    render(<Head />);
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0];
    expect(options).toMatchObject({ duration: 380 });
    expect(frames[0].transform).toBe(`translate(400px, 100px) scale(${290 / 210})`);
    expect(frames[1].transform).toBe('none');
  });

  it('with reduced motion: no animation, and the rect is not kept for later', () => {
    reduced = true;
    rememberRect('group-stack', document.createElement('div'));
    render(<Head />);
    expect(animate).not.toHaveBeenCalled();
    reduced = false;
    render(<Head />);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('useFlipFrom with a class for the arriving parts (motion doc §3: back on Nhóm the parts sharpen in without a lift)', () => {
  function Carousel() {
    const page = useRef<HTMLDivElement>(null);
    const stack = useRef<HTMLDivElement>(null);
    useFlipFrom('back', stack, page, 'wm-carousel-in');
    return (
      <div ref={page} data-testid="page">
        <div ref={stack}>stack</div>
      </div>
    );
  }

  beforeEach(() => {
    reduced = false;
    Element.prototype.animate = vi.fn() as unknown as Element['animate'];
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect(100, 200, 290, 368));
  });
  afterEach(() => vi.restoreAllMocks());

  it('adds the class named by the caller to the page', () => {
    rememberRect('back', document.createElement('div'));
    const { getByTestId } = render(<Carousel />);
    expect(getByTestId('page')).toHaveClass('wm-carousel-in');
    expect(getByTestId('page')).not.toHaveClass('wm-page-in');
  });
});

describe('ms (motion tokens as the browser reads them)', () => {
  it.each([['380ms', 380], ['.38s', 380], ['0.17s', 170], ['1.5s', 1500], [' 150ms ', 150]])('%s → %i', (value, expected) => {
    expect(ms(value)).toBe(expected);
  });
});
