import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallQueue } from './call-queue.js';

// Fake timers also move performance.now() (checked in vitest 4), so deadlines are performance.now() + budget as in the runner.
const deadlineIn = (ms: number) => performance.now() + ms;

async function fill(queue: CallQueue, n: number): Promise<Array<() => void>> {
  const releases: Array<() => void> = [];
  for (let i = 0; i < n; i += 1) {
    const release = await queue.acquire(deadlineIn(10_000));
    if (!release) throw new Error('expected a slot');
    releases.push(release);
  }
  return releases;
}

describe('CallQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('B6E25: the 51st waits and runs when a slot frees at 2 s', async () => {
    const queue = new CallQueue(() => 50);
    const releases = await fill(queue, 50);
    let got: (() => void) | null | undefined;
    void queue.acquire(deadlineIn(10_000)).then((release) => { got = release; });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(got).toBeUndefined();
    releases[0]();
    await vi.advanceTimersByTimeAsync(1);
    expect(typeof got).toBe('function');
    expect(queue.inFlight()).toBe(50);
  });

  it('B6E26: no slot before the deadline → null, and it never takes a slot later', async () => {
    const queue = new CallQueue(() => 1);
    const [release] = await fill(queue, 1);
    let got: (() => void) | null | undefined;
    void queue.acquire(deadlineIn(10_000)).then((value) => { got = value; });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(got).toBeNull();
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(queue.inFlight()).toBe(0);
  });

  it('a deadline already passed → null at once without a slot', async () => {
    const queue = new CallQueue(() => 5);
    await expect(queue.acquire(deadlineIn(0))).resolves.toBeNull();
    expect(queue.inFlight()).toBe(0);
  });

  it('B6E27: limit 1 while 10 run → a new caller waits until all 10 release', async () => {
    let limit = 50;
    const queue = new CallQueue(() => limit);
    const releases = await fill(queue, 10);
    limit = 1;
    let got: (() => void) | null | undefined;
    void queue.acquire(deadlineIn(10_000)).then((value) => { got = value; });
    for (let i = 0; i < 9; i += 1) releases[i]();
    await vi.advanceTimersByTimeAsync(0);
    expect(got).toBeUndefined();
    expect(queue.inFlight()).toBe(1);
    releases[9]();
    await vi.advanceTimersByTimeAsync(0);
    expect(typeof got).toBe('function');
    expect(queue.inFlight()).toBe(1);
  });

  it('raising the limit from 5 to 50 while 30 wait → the waiters start at the next acquire or release, up to 50', async () => {
    let limit = 5;
    const queue = new CallQueue(() => limit);
    const releases = await fill(queue, 5);
    const started: number[] = [];
    for (let i = 0; i < 30; i += 1) void queue.acquire(deadlineIn(10_000)).then((value) => { if (value) started.push(i); });
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toHaveLength(0);
    limit = 50;
    releases[0]();
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toHaveLength(30);
    expect(queue.inFlight()).toBe(34);
  });

  it('raising the limit wakes waiters on the next acquire too', async () => {
    let limit = 1;
    const queue = new CallQueue(() => limit);
    await fill(queue, 1);
    const started: number[] = [];
    for (let i = 0; i < 3; i += 1) void queue.acquire(deadlineIn(10_000)).then((value) => { if (value) started.push(i); });
    await vi.advanceTimersByTimeAsync(0);
    limit = 10;
    const fresh = await queue.acquire(deadlineIn(10_000));
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toEqual([0, 1, 2]);
    expect(typeof fresh).toBe('function');
    expect(queue.inFlight()).toBe(5);
  });

  it('FIFO', async () => {
    const queue = new CallQueue(() => 1);
    const [release] = await fill(queue, 1);
    const order: string[] = [];
    const take = (name: string) => queue.acquire(deadlineIn(10_000)).then((value) => {
      order.push(name);
      return value;
    });
    const a = take('a');
    const b = take('b');
    const c = take('c');
    release();
    (await a)?.();
    (await b)?.();
    await c;
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('a waiter that timed out is skipped; the next one gets the slot', async () => {
    const queue = new CallQueue(() => 1);
    const [release] = await fill(queue, 1);
    let early: (() => void) | null | undefined;
    let late: (() => void) | null | undefined;
    void queue.acquire(deadlineIn(1_000)).then((value) => { early = value; });
    void queue.acquire(deadlineIn(10_000)).then((value) => { late = value; });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(early).toBeNull();
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(typeof late).toBe('function');
    expect(queue.inFlight()).toBe(1);
  });

  it('release twice frees one slot', async () => {
    const queue = new CallQueue(() => 2);
    const [first] = await fill(queue, 2);
    first();
    first();
    expect(queue.inFlight()).toBe(1);
  });
});
