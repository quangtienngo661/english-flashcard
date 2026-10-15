import { X } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button as AriaButton, Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { useTranslations } from 'use-intl';
import { usePanelSlot } from '../app/shell-slots';
import { useMediaQuery } from './use-media-query';
import { usePresence } from './use-presence';

/** The panel sits beside the table only from here (UB22); keep equal to `--breakpoint-panel` in globals.css. */
export const PANEL_SPLIT_QUERY = '(min-width: 87rem)';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the panel has gone, and only when focus went with it (it was in the panel, or is on body), so the caller
   * can put it back on the row without pulling it away from where the user moved it (UBE26, review M1/M2). */
  onExited?: () => void;
  /** The panel title takes focus on open and whenever this changes (another row opened, UBE24). */
  focusKey: string;
  /** `PanelHead`, `PanelBody`, `PanelFooter`. Mounted inside the panel, so their data hooks stop when it closes. */
  children: ReactNode;
};

const PanelContext = createContext<{ titleId: string; onClose: () => void }>({ titleId: '', onClose: () => {} });

/**
 * Detail beside a list, its URL kept (design §6.3, UB8): from 87rem a non-modal column of the white sheet (the table stays
 * usable); narrower, a modal sheet that slides in from the right over a scrim, full screen on a phone (UB22, UBE29).
 */
export function DetailPanel(props: Props) {
  const split = useMediaQuery(PANEL_SPLIT_QUERY, true);
  // A closing panel ignores a second ✕ or Escape: each would push another list entry (review M3).
  const onClose = () => {
    if (props.isOpen) props.onClose();
  };
  return split ? <SidePanel {...props} onClose={onClose} /> : <OverlayPanel {...props} onClose={onClose} />;
}

/** Focus went with the panel: nothing has it (body), or it is still inside the panel that is about to go. */
function focusLeftWith(panel: Element | null): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || (panel?.contains(active) ?? false);
}

const motion = 'motion-safe:data-entering:animate-panel-in motion-safe:data-exiting:animate-panel-out';

function SidePanel({ isOpen, onClose, onExited, focusKey, children }: Props) {
  const slot = usePanelSlot();
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const { isMounted, state } = usePresence(isOpen, ref, () => {
    if (focusLeftWith(ref.current)) onExited?.();
  });
  useFocusTitle(titleId, isOpen && slot !== null, focusKey);

  if (!isMounted || !slot) return null;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // A dialog opened from inside the panel lives in a portal but its events still bubble here through React:
    // only an Escape pressed inside the panel itself closes it (Review Focus 1).
    if (event.key !== 'Escape' || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
    event.preventDefault();
    onClose();
  }

  return createPortal(
    <aside
      ref={ref}
      data-testid="detail-panel"
      aria-labelledby={titleId}
      data-entering={state === 'entering' || undefined}
      data-exiting={state === 'exiting' || undefined}
      onKeyDown={onKeyDown}
      className={`sticky top-0 flex h-panel-sticky w-panel flex-col border-l-2 border-border bg-surface outline-none ${motion}`}
    >
      <PanelContext.Provider value={{ titleId, onClose }}>{children}</PanelContext.Provider>
    </aside>,
    slot,
  );
}

function OverlayPanel({ isOpen, onClose, onExited, focusKey, children }: Props) {
  const titleId = useId();
  useFocusTitle(titleId, isOpen, focusKey);
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable
      className="fixed inset-0 z-40 overscroll-contain bg-ink/45 motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out"
    >
      <Modal className={`fixed inset-y-0 right-0 flex w-full max-w-panel flex-col bg-surface shadow-overlay-panel outline-none ${motion}`}>
        <Dialog data-testid="detail-panel" aria-labelledby={titleId} className="flex h-full min-h-0 flex-col outline-none">
          <PanelContext.Provider value={{ titleId, onClose }}>{children}</PanelContext.Provider>
          <OverlayExited onExited={onExited} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/**
 * Unmounts with the overlay, once its exit animation is over. React Aria then puts focus back on what opened the overlay,
 * in the next frame; when nothing focusable did (a mouse click on a row, a direct URL) focus stays on body, and a frame
 * later `onExited` places it (UBE26, review M2). A StrictMode remount is not a real exit.
 */
function OverlayExited({ onExited }: { onExited?: () => void }) {
  const latest = useRef(onExited);
  const gone = useRef(false);
  useEffect(() => {
    latest.current = onExited;
  });
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
      requestAnimationFrame(() => {
        if (gone.current && focusLeftWith(null)) latest.current?.();
      });
    };
  }, []);
  return null;
}

function useFocusTitle(titleId: string, active: boolean, focusKey: string) {
  useEffect(() => {
    if (active) document.getElementById(titleId)?.focus();
  }, [titleId, active, focusKey]);
}

/** Title (h2, the panel's name), a status line under it, and the ✕. */
export function PanelHead({ title, status }: { title: ReactNode; status?: ReactNode }) {
  const t = useTranslations();
  const { titleId, onClose } = useContext(PanelContext);
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id={titleId} tabIndex={-1} className="wrap-anywhere text-lg font-extrabold tracking-tight text-ink outline-none">
          {title}
        </h2>
        {status}
      </div>
      <AriaButton
        aria-label={t('common.close')}
        onPress={onClose}
        className="flex size-10 shrink-0 items-center justify-center rounded-control text-ink outline-none transition-colors duration-instant ease-standard hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X aria-hidden className="size-5" />
      </AriaButton>
    </div>
  );
}

export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-5">{children}</div>;
}

/** Actions, kept at the bottom of the panel. */
export function PanelFooter({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 flex-wrap gap-2.5 border-t-2 border-border px-6 py-4">{children}</div>;
}
