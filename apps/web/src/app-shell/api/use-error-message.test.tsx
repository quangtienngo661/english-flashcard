// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { ApiError, NetworkError, type Problem } from './problem';
import { useErrorDetails, useErrorMessage } from './use-error-message';

const messages = {
  App: {
    errors: {
      generic: 'Có lỗi xảy ra. Thử lại sau.',
      inProgress: 'Đang xử lý lần bấm trước.',
      'rate-limited': 'Bạn thao tác hơi nhanh. Thử lại sau {seconds} giây.',
      'email-taken': 'Email này đã có tài khoản.',
    },
    offline: { message: 'Không kết nối được. Kiểm tra mạng rồi thử lại.' },
  },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="vi" messages={messages}>
    {children}
  </NextIntlClientProvider>
);
const apiError = (over: Partial<Problem>, retry: number | null = null) =>
  new ApiError({ type: 'about:blank', slug: '', status: 400, title: 't', ...over }, retry);

describe('useErrorMessage (App namespace)', () => {
  it('a known slug has its own text', () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current(apiError({ slug: 'email-taken', status: 409 }))).toBe('Email này đã có tài khoản.');
  });

  it('E15: a 429 says how many seconds to wait, from Retry-After', () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current(apiError({ slug: 'rate-limited', status: 429 }, 12))).toBe('Bạn thao tác hơi nhanh. Thử lại sau 12 giây.');
  });

  it('a network error reads as offline', () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current(new NetworkError())).toBe('Không kết nối được. Kiểm tra mạng rồi thử lại.');
  });

  it('an unknown problem is generic and carries its operation id', () => {
    const { result } = renderHook(() => useErrorDetails(), { wrapper });
    expect(result.current(apiError({ slug: 'mystery', status: 500, operation_id: 'op-1' }))).toEqual({
      message: 'Có lỗi xảy ra. Thử lại sau.',
      code: 'op-1',
    });
  });
});
