// @vitest-environment jsdom
import { act, screen, within } from '@testing-library/react';
import { renderApp } from './test-utils';
import { ToastRegion, showToast, toastQueue } from './Toast';

// Motion audit #5: a toast closes inside a view transition (styled in globals.css); adding one never starts a transition.
// A stand-in for the browser API: the test only needs to see whether the toast queue asks for a transition.
const doc = document as unknown as { startViewTransition?: (cb: () => void) => unknown };

const close = (text: string) => within(screen.getByText(text).closest<HTMLElement>('[role="alertdialog"]')!).getByRole('button').click();

function motion(matches: boolean) {
  window.matchMedia = ((query: string) => ({ matches, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  act(() => toastQueue.clear());
  delete doc.startViewTransition;
});

describe('Toast exit', () => {
  it('closing runs a view transition; adding does not; each toast has its own transition name', () => {
    const start = vi.fn((cb: () => void) => cb());
    doc.startViewTransition = start;
    motion(true);
    renderApp(<ToastRegion />);
    act(() => showToast('Đã lưu'));
    expect(start).not.toHaveBeenCalled();
    const toast = screen.getByText('Đã lưu').closest<HTMLElement>('[role="alertdialog"]')!;
    expect(toast.style.viewTransitionName).toMatch(/^_/);
    expect(toast).toHaveClass('[view-transition-class:toast]');

    act(() => close('Đã lưu'));
    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Đã lưu')).toBeNull();
  });

  it('with reduced motion, or without View Transitions, the toast just closes', () => {
    const start = vi.fn((cb: () => void) => cb());
    doc.startViewTransition = start;
    motion(false);
    renderApp(<ToastRegion />);
    act(() => showToast('Đã lưu'));
    act(() => close('Đã lưu'));
    expect(start).not.toHaveBeenCalled();
    expect(screen.queryByText('Đã lưu')).toBeNull();

    delete doc.startViewTransition;
    motion(true);
    act(() => showToast('Đã xóa'));
    act(() => close('Đã xóa'));
    expect(screen.queryByText('Đã xóa')).toBeNull();
  });
});
