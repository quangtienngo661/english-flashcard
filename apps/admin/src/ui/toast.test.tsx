import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'use-intl';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../messages/vi.json';
import { showToast, ToastRegion } from './Toast';

const wrap = () =>
  render(
    <IntlProvider locale="vi" messages={vi}>
      <ToastRegion />
    </IntlProvider>,
  );

afterEach(() => vitest.useRealTimers());

describe('Toast', () => {
  it('UBE33 a toast closes itself after 5 s', () => {
    vitest.useFakeTimers();
    wrap();
    act(() => showToast('Đã cấp vai trò editor cho a@x.co.'));
    expect(screen.getByText('Đã cấp vai trò editor cho a@x.co.')).toBeInTheDocument();
    act(() => vitest.advanceTimersByTime(4999));
    expect(screen.getByText('Đã cấp vai trò editor cho a@x.co.')).toBeInTheDocument();
    act(() => vitest.advanceTimersByTime(1));
    expect(screen.queryByText('Đã cấp vai trò editor cho a@x.co.')).toBeNull();
  });

  it('"Đóng" closes it at once', async () => {
    wrap();
    act(() => showToast('Đã gỡ vai trò của a@x.co.'));
    await userEvent.click(screen.getByRole('button', { name: vi.common.close }));
    expect(screen.queryByText('Đã gỡ vai trò của a@x.co.')).toBeNull();
  });

  it('three toasts stack', () => {
    wrap();
    act(() => {
      showToast('một');
      showToast('hai');
      showToast('ba');
    });
    for (const text of ['một', 'hai', 'ba']) expect(screen.getByText(text)).toBeInTheDocument();
  });
});
