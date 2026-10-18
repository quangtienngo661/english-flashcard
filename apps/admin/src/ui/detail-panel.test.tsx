import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { IntlProvider } from 'use-intl';
import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../messages/vi.json';
import { ShellSlotsContext } from '../app/shell-slots';
import { DetailPanel, PanelBody, PanelFooter, PanelHead } from './DetailPanel';
import { Dialog } from './Dialog';
import { focusRowLink } from './focus-row-link';
import { useMediaQuery } from './use-media-query';
import { useRetained } from './use-retained';

/** A `matchMedia` whose answer the test flips; listeners hear the change like a real MediaQueryList. */
function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    matches,
    media: '',
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vitest.stubGlobal('matchMedia', vitest.fn(() => list));
  return {
    set(next: boolean) {
      list.matches = next;
      listeners.forEach((l) => l());
    },
  };
}

function Harness({ isOpen, onClose, onExited, focusKey = 'a', children }: { isOpen: boolean; onClose: () => void; onExited?: () => void; focusKey?: string; children?: ReactNode }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <IntlProvider locale="vi" messages={vi}>
      <ShellSlotsContext.Provider value={{ actions: null, panel: slot }}>
        <button type="button">outside</button>
        <DetailPanel isOpen={isOpen} onClose={onClose} onExited={onExited} focusKey={focusKey}>
          <PanelHead title="cefr-j-1.5.csv" status={<span>Một phần</span>} />
          <PanelBody>{children ?? <p>body</p>}</PanelBody>
          <PanelFooter>
            <button type="button">Publish</button>
          </PanelFooter>
        </DetailPanel>
      </ShellSlotsContext.Provider>
      <div data-testid="slot" ref={setSlot} />
    </IntlProvider>
  );
}

/** jsdom has no Web Animations API: give every element the animations a test wants `getAnimations()` to report. */
function stubAnimations(animations: Array<{ finished: Promise<unknown> }>) {
  Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => animations });
}

afterEach(() => {
  vitest.unstubAllGlobals();
  vitest.restoreAllMocks();
  delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
});

describe('DetailPanel', () => {
  it("UB22 from 87rem the panel is a non-modal aside in the sheet's panel slot", async () => {
    stubMedia(true);
    render(<Harness isOpen onClose={() => {}} />);
    const panel = await screen.findByTestId('detail-panel');
    expect(panel.tagName).toBe('ASIDE');
    expect(screen.getByTestId('slot')).toContainElement(panel);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'outside' })).toBeVisible();
  });

  it('UB22 below 87rem the panel is a modal dialog', async () => {
    stubMedia(false);
    render(<Harness isOpen onClose={() => {}} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-testid', 'detail-panel');
    expect(dialog).toHaveAccessibleName('cefr-j-1.5.csv');
  });

  it('Escape inside the side panel calls onClose', async () => {
    stubMedia(true);
    const onClose = vitest.fn();
    render(<Harness isOpen onClose={onClose} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('an Escape that bubbles from a dialog opened inside the side panel does not close the panel (Review Focus 1)', async () => {
    stubMedia(true);
    const onClose = vitest.fn();
    const onDialogChange = vitest.fn();
    render(
      <Harness isOpen onClose={onClose}>
        <Dialog isOpen onOpenChange={onDialogChange} title="Hoàn tác lô?" actions={<button type="button">Hủy</button>} />
      </Harness>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Hủy' }));
    await userEvent.keyboard('{Escape}');
    expect(onDialogChange).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('UBE24 opening focuses the panel title; a new focusKey focuses it again', async () => {
    stubMedia(true);
    const { rerender } = render(<Harness isOpen onClose={() => {}} focusKey="a" />);
    const title = await screen.findByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' });
    await waitFor(() => expect(title).toHaveFocus());
    screen.getByRole('button', { name: 'outside' }).focus();
    rerender(<Harness isOpen onClose={() => {}} focusKey="b" />);
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 })).toHaveFocus());
  });

  it('keeps the side panel while its exit animation runs, then removes it and reports onExited', async () => {
    stubMedia(true);
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const onExited = vitest.fn();
    const { rerender } = render(<Harness isOpen onClose={() => {}} onExited={onExited} />);
    await screen.findByTestId('detail-panel');
    stubAnimations([{ finished }]);
    rerender(<Harness isOpen={false} onClose={() => {}} onExited={onExited} />);
    expect(screen.getByTestId('detail-panel')).toHaveAttribute('data-exiting');
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByTestId('detail-panel')).toBeNull());
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('a second ✕ or Escape while the side panel is closing does not close it again (review M3)', async () => {
    stubMedia(true);
    const onClose = vitest.fn();
    function Closing() {
      const [open, setOpen] = useState(true);
      return (
        <Harness
          isOpen={open}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      );
    }
    render(<Closing />);
    const close = await screen.findByRole('button', { name: vi.common.close });
    stubAnimations([{ finished: new Promise(() => {}) }]);
    await userEvent.click(close);
    expect(screen.getByTestId('detail-panel')).toHaveAttribute('data-exiting');
    await userEvent.click(close);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('removes the side panel even when its exit animation is cancelled (UBE22)', async () => {
    stubMedia(true);
    const { rerender } = render(<Harness isOpen onClose={() => {}} />);
    await screen.findByTestId('detail-panel');
    const cancelled = Promise.reject(new DOMException('cancelled', 'AbortError'));
    cancelled.catch(() => {});
    stubAnimations([{ finished: cancelled }]);
    rerender(<Harness isOpen={false} onClose={() => {}} />);
    await waitFor(() => expect(screen.queryByTestId('detail-panel')).toBeNull());
  });
});

describe('focusRowLink', () => {
  it('an id with selector characters does not throw and still finds its link (review M4)', () => {
    render(
      <main>
        <h1 id="page-title" tabIndex={-1}>
          Lô nhập
        </h1>
        <a href={'/uploads/x"]'}>Chi tiết</a>
      </main>,
    );
    expect(() => focusRowLink('/uploads/x"]')).not.toThrow();
    expect(screen.getByRole('link', { name: 'Chi tiết' })).toHaveFocus();
  });
});

describe('panel hooks', () => {
  it('useMediaQuery follows change events', () => {
    const media = stubMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 87rem)', true));
    expect(result.current).toBe(false);
    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('useMediaQuery falls back when matchMedia is missing', () => {
    vitest.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(min-width: 87rem)', true));
    expect(result.current).toBe(true);
  });

  it('useRetained keeps the last defined value', () => {
    const { result, rerender } = renderHook(({ value }: { value?: string }) => useRetained(value), { initialProps: { value: 'b1' as string | undefined } });
    expect(result.current).toBe('b1');
    rerender({ value: undefined });
    expect(result.current).toBe('b1');
    rerender({ value: 'b2' });
    expect(result.current).toBe('b2');
  });
});
