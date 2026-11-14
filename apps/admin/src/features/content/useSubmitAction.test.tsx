import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it, vi } from 'vitest';
import en from '../../../messages/en.json';
import { ApiError, NetworkError, type Problem } from '../../api/problem';
import { useSubmitAction } from './useSubmitAction';

const wrapper = ({ children }: { children: ReactNode }) => (
  <IntlProvider locale="en" messages={en}>{children}</IntlProvider>
);

const problem = (over: Partial<Problem>): Problem => ({ type: 'x/validation-failed', slug: 'validation-failed', status: 400, title: 't', ...over });

describe('useSubmitAction', () => {
  it('problem is null before any failure', () => {
    const { result } = renderHook(() => useSubmitAction(async () => 1, 'f', () => {}), { wrapper });
    expect(result.current.problem).toBeNull();
  });

  it('exposes the raw problem (violations, reason) after a 400', async () => {
    const run = vi.fn().mockRejectedValue(new ApiError(problem({ violations: ['name: too short'], reason: 'r' }), null));
    const { result } = renderHook(() => useSubmitAction(run, 'f', () => {}), { wrapper });
    await act(async () => result.current.submit());
    await waitFor(() => expect(result.current.problem?.violations).toEqual(['name: too short']));
    expect(result.current.problem?.reason).toBe('r');
    expect(result.current.error?.message).toBe('The data is not valid');
  });

  it('clears the problem and the error on the next submission', async () => {
    const run = vi.fn().mockRejectedValueOnce(new ApiError(problem({}), null)).mockResolvedValueOnce('ok');
    const onDone = vi.fn();
    const { result } = renderHook(() => useSubmitAction(run, 'f', onDone), { wrapper });
    await act(async () => result.current.submit());
    expect(result.current.problem).not.toBeNull();
    await act(async () => result.current.submit());
    expect(onDone).toHaveBeenCalledWith('ok');
    expect(result.current.problem).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('problem stays null after a network error', async () => {
    const run = vi.fn().mockRejectedValue(new NetworkError());
    const { result } = renderHook(() => useSubmitAction(run, 'f', () => {}), { wrapper });
    await act(async () => result.current.submit());
    expect(result.current.problem).toBeNull();
    expect(result.current.canRetry).toBe(true);
  });
});
