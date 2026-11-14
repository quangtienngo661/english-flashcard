// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { ApiError, NetworkError } from './api/problem';
import { useSubmitOnce } from './use-submit-once';

let leaving = false;
vi.mock('./navigate', () => ({ isLeaving: () => leaving }));

const conflict = (slug: string, retryAfter: number | null) =>
  new ApiError({ type: slug ? `http://api.test/problems/${slug}` : 'about:blank', slug, status: 409, title: 'c' }, retryAfter);

afterEach(() => {
  vi.useRealTimers();
  leaving = false;
});

describe('useSubmitOnce (E12–E14, Review Focus 1)', () => {
  it('a second press while the first is pending sends nothing', async () => {
    let release!: (v: string) => void;
    const fn = vi.fn(() => new Promise<string>((r) => (release = r)));
    const { result } = renderHook(() => useSubmitOnce(fn));
    let first!: Promise<string | undefined>;
    act(() => {
      first = result.current.submit();
    });
    expect(result.current.busy).toBe(true);
    let second!: Promise<string | undefined>;
    act(() => {
      second = result.current.submit();
    });
    await act(async () => {
      release('ok');
      await first;
    });
    expect(await second).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
  });

  it('Review Focus 1: a press that leaves the page stays busy, so a second press sends nothing', async () => {
    const fn = vi.fn(async () => {
      leaving = true;
      return 'ok';
    });
    const { result } = renderHook(() => useSubmitOnce(fn));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      await result.current.submit();
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('E12: each press gets a new key; a retry after a NetworkError reuses it', async () => {
    const keys: string[] = [];
    let fail = true;
    const fn = vi.fn(async (key: string) => {
      keys.push(key);
      if (fail) {
        fail = false;
        throw new NetworkError();
      }
      return 'ok';
    });
    const { result } = renderHook(() => useSubmitOnce(fn));
    await act(async () => {
      await expect(result.current.submit()).rejects.toBeInstanceOf(NetworkError);
    });
    await act(async () => {
      await result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('E13: a 409 in progress is sent again with the same key after Retry-After', async () => {
    vi.useFakeTimers();
    const keys: string[] = [];
    const fn = vi.fn(async (key: string) => {
      keys.push(key);
      if (keys.length === 1) throw conflict('', 2);
      return 'done';
    });
    const { result } = renderHook(() => useSubmitOnce(fn));
    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.submit();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(await pending).toBe('done');
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('E14: idempotency-key-abandoned is sent again once with a new key', async () => {
    const keys: string[] = [];
    const fn = vi.fn(async (key: string) => {
      keys.push(key);
      throw conflict('idempotency-key-abandoned', null);
    });
    const { result } = renderHook(() => useSubmitOnce(fn));
    await act(async () => {
      await expect(result.current.submit()).rejects.toBeInstanceOf(ApiError);
    });
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it('M4 review: after a NetworkError the same payload reuses the key, a different payload gets a new one', async () => {
    const keys: string[] = [];
    let fail = true;
    const fn = vi.fn(async (key: string) => {
      keys.push(key);
      if (fail) throw new NetworkError();
      return 'ok';
    });
    const { result } = renderHook(() => useSubmitOnce(fn));
    await act(async () => {
      await result.current.submit('choice:0').catch(() => {});
    });
    await act(async () => {
      await result.current.submit('choice:0').catch(() => {});
    });
    fail = false;
    await act(async () => {
      await result.current.submit('choice:1');
    });
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });
});
