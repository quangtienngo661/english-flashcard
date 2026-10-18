// @vitest-environment jsdom
import { flyInto } from './fly-into';

// jsdom has no Web Animations API: each test controls when `finished` settles.
type Flight = { resolve: () => void; cancel: ReturnType<typeof vi.fn> };
let flight: Flight;

function mockAnimate() {
  Element.prototype.animate = vi.fn(function animate() {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    const finished = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const cancel = vi.fn(() => reject(new DOMException('The user aborted a request.', 'AbortError')));
    flight = { resolve, cancel };
    return { finished, cancel } as unknown as Animation;
  });
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

function setup() {
  const source = document.createElement('button');
  source.textContent = 'deploy';
  const target = document.createElement('span');
  // appendChild: the Workers types merge an HTMLRewriter `Element.append` that shadows the DOM one.
  document.body.appendChild(source);
  document.body.appendChild(target);
  return { source, target, onLand: vi.fn() };
}

const flyers = () => document.querySelectorAll('[data-flyer]');
const microtasks = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  mockAnimate();
  setVisibility('visible');
});

afterEach(() => {
  vi.useRealTimers();
  delete (Element.prototype as { animate?: unknown }).animate;
  document.body.innerHTML = '';
});

describe('flyInto', () => {
  it('UBE5 lands once when the animation finishes', async () => {
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    expect(flyers()).toHaveLength(1);
    flight.resolve();
    await microtasks();
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(flyers()).toHaveLength(0);
  });

  it('UBE6 lands at durationMs + 80 when finished never resolves', () => {
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    vi.advanceTimersByTime(479);
    expect(onLand).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(flyers()).toHaveLength(0);
  });

  it('UBE7 lands at once when the tab becomes visible', () => {
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onLand).not.toHaveBeenCalled();
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(flyers()).toHaveLength(0);
  });

  it('lands at most once when all three triggers fire', async () => {
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    document.dispatchEvent(new Event('visibilitychange'));
    flight.resolve();
    await microtasks();
    vi.advanceTimersByTime(1000);
    expect(onLand).toHaveBeenCalledTimes(1);
  });

  it('UBE8 cancel removes the clone without landing and stops the timer', async () => {
    const { source, target, onLand } = setup();
    const cancel = flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    cancel();
    await microtasks();
    vi.advanceTimersByTime(1000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onLand).not.toHaveBeenCalled();
    expect(flight.cancel).toHaveBeenCalledTimes(1);
    expect(flyers()).toHaveLength(0);
  });

  it('the clone is aria-hidden and ignores the pointer', () => {
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    const clone = flyers()[0] as HTMLElement;
    expect(clone).toHaveAttribute('aria-hidden', 'true');
    expect(clone.style.pointerEvents).toBe('none');
    expect(clone.style.position).toBe('fixed');
    expect(clone).not.toBe(source);
  });

  it('without the Web Animations API it lands immediately', () => {
    delete (Element.prototype as { animate?: unknown }).animate;
    const { source, target, onLand } = setup();
    flyInto(source, target, { durationMs: 400, easing: 'linear', onLand });
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(flyers()).toHaveLength(0);
  });
});
