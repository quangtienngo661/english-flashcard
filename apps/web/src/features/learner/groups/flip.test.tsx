// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { rememberRect, useFlipFrom } from './flip';

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
