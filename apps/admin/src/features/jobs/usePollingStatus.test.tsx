import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTerminal, useQueuedTooLong, usePollingStatus, type JobStatus } from './usePollingStatus';

type Item = { status: JobStatus };

function setup(sequence: JobStatus[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  let calls = 0;
  const fetcher = vi.fn(async (): Promise<Item> => ({ status: sequence[Math.min(calls++, sequence.length - 1)] }));
  const hook = renderHook(() => usePollingStatus<Item>(['job', 'x'], fetcher), { wrapper });
  return { fetcher, hook };
}

/** Advance fake time inside `act`, so state updates caused by a finished fetch reach the rendered hook. */
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

const setVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  window.dispatchEvent(new Event('visibilitychange')); // React Query's focus manager listens on window
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  setVisibility('visible');
  vi.useRealTimers();
});

describe('isTerminal', () => {
  it('succeeded, partial and failed end polling; queued and running do not', () => {
    expect(['succeeded', 'partial', 'failed'].map((s) => isTerminal(s as JobStatus))).toEqual([true, true, true]);
    expect([isTerminal('queued'), isTerminal('running'), isTerminal(undefined)]).toEqual([false, false, false]);
  });
});

describe('usePollingStatus', () => {
  it('B25#13: queued → running → succeeded: fetches every 2 s and stops after succeeded', async () => {
    const { fetcher, hook } = setup(['queued', 'running', 'succeeded']);
    await tick(0);
    expect(hook.result.current.data?.status).toBe('queued');
    expect(fetcher).toHaveBeenCalledTimes(1);

    await tick(1999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(0); // let React Query's batched notification reach the hook
    await vi.waitFor(() => expect(hook.result.current.data?.status).toBe('running'));

    await tick(2000);
    await tick(0);
    await vi.waitFor(() => expect(hook.result.current.data?.status).toBe('succeeded'));
    expect(fetcher).toHaveBeenCalledTimes(3);

    await tick(10_000);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each(['partial', 'failed'] as const)('B25#13: %s also stops polling', async (final) => {
    const { fetcher } = setup(['running', final]);
    await tick(0);
    await tick(2000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(10_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('Review Focus 5: a hidden tab does not poll; showing it again fetches at once and shows the final status', async () => {
    const { fetcher, hook } = setup(['running', 'running', 'succeeded']);
    await tick(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    await tick(30_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await tick(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(2000);
    await tick(0);
    await vi.waitFor(() => expect(hook.result.current.data?.status).toBe('succeeded'));
  });
});

describe('useQueuedTooLong', () => {
  const created = '2026-10-14T10:00:00.000Z';
  const at = (seconds: number) => Date.parse(created) + seconds * 1000;

  it('B25E8: queued for 31 s shows the hint, 29 s does not (nor exactly 30 s)', () => {
    expect(useQueuedTooLong('queued', created, at(31))).toBe(true);
    expect(useQueuedTooLong('queued', created, at(30))).toBe(false);
    expect(useQueuedTooLong('queued', created, at(29))).toBe(false);
  });

  it('only a queued batch can be "too long in the queue"', () => {
    expect(useQueuedTooLong('running', created, at(120))).toBe(false);
    expect(useQueuedTooLong('succeeded', created, at(120))).toBe(false);
  });
});
