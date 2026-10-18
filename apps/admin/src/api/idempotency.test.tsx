import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKey } from './idempotency';

describe('useIdempotencyKey', () => {
  it('B25#11 (hook part): same fingerprint keeps the key, a new fingerprint or renew() makes a new one', () => {
    const { result, rerender } = renderHook(({ fp }) => useIdempotencyKey(fp), { initialProps: { fp: 'file-a|src-1' } });
    const first = result.current.key;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);

    rerender({ fp: 'file-a|src-1' });
    expect(result.current.key).toBe(first);

    rerender({ fp: 'file-b|src-1' });
    const second = result.current.key;
    expect(second).not.toBe(first);

    act(() => result.current.renew());
    expect(result.current.key).not.toBe(second);
  });
});
