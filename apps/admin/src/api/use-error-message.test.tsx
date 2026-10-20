import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { ApiError, type Problem } from './problem';
import { useErrorDetails, useErrorMessage } from './use-error-message';

const wrapper = ({ children }: { children: ReactNode }) => (
  <IntlProvider locale="en" messages={en}>{children}</IntlProvider>
);

const apiError = (over: Partial<Problem>) =>
  new ApiError({ type: 'about:blank', slug: '', status: 500, title: 't', ...over } as Problem, null);

describe('useErrorDetails', () => {
  it('B25#19: an unknown problem with operation_id "op-123" gives the generic message and the code', () => {
    const { result } = renderHook(() => useErrorDetails(), { wrapper });
    expect(result.current(apiError({ type: 'https://api.test/problems/brand-new', operation_id: 'op-123' }))).toEqual({
      message: 'Something went wrong',
      code: 'op-123',
    });
  });

  it('a mapped problem shows no code', () => {
    const { result } = renderHook(() => useErrorDetails(), { wrapper });
    const details = result.current(
      apiError({ type: 'https://api.test/problems/email-taken', slug: 'email-taken', status: 409, operation_id: 'op-9' }),
    );
    expect(details.code).toBeNull();
  });

  it('an unknown problem without operation_id has no code', () => {
    const { result } = renderHook(() => useErrorDetails(), { wrapper });
    expect(result.current(apiError({})).code).toBeNull();
  });

  it('useErrorMessage still returns just the message', () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current(apiError({ operation_id: 'op-1' }))).toBe('Something went wrong');
  });
});

describe('error code messages', () => {
  it('errors.code and errors.copyCode exist in both languages', () => {
    expect(vi.errors.code).toBe('Mã: {code}');
    expect(vi.errors.copyCode).toBe('Chép mã');
    expect(en.errors.code).toBe('Code: {code}');
    expect(en.errors.copyCode).toBe('Copy code');
  });
});
