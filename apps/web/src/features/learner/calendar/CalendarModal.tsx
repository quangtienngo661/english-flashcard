'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { Dialog as AriaDialog, Modal, ModalOverlay } from 'react-aria-components';
import { cn } from '@/lib/cn';

const WIDTH = { month: 'md:max-w-180', day: 'md:max-w-160' } as const;
// raw-ok: the centred modal keeps 16 px above and below on a short window; its content scrolls inside (Ngày is taller than 780 px)
const MODAL = 'relative max-h-dvh w-full overflow-y-auto rounded-t-wm-modal bg-wm-surface text-wm-ink shadow-wm-pop outline-none md:max-h-[calc(100dvh-2rem)] md:rounded-wm-modal';

const keepKeys = (event: KeyboardEvent) => {
  if (!['Escape', 'Tab', 'l', 'L'].includes(event.key)) event.stopPropagation();
};

/** Keys typed into a field stay there (the `N` guard of add-word-context). */
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

/**
 * The frame of Lịch (720 px) and Ngày (640 px), Figma 102:3502 / 103:4044: the motion and backdrop of `ui/Dialog` (scrim 200 ms with its
 * blur, R10; the modal rises 12 px and scales from .97 in 240 ms, the phone sheet comes from 60 px; both close in 150 ms), radius 16, a
 * bottom sheet below 768 px with a drag handle. The header is the caller's: its `Heading slot="title"` names the dialog. Esc and the
 * scrim call `onDismiss`; `data-wm-calendar` lets the host's `L` key close it from inside.
 */
export function CalendarModal({ size, onDismiss, children }: { size: 'month' | 'day'; onDismiss: () => void; children: ReactNode }) {
  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => !open && onDismiss()}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-wm-scrim backdrop-blur-wm-overlay md:items-center md:p-4 motion-safe:data-entering:animate-wm-overlay-in motion-safe:data-exiting:animate-wm-pop-out"
    >
      <Modal
        className={cn(
          MODAL,
          'motion-safe:data-entering:animate-wm-sheet-in motion-safe:data-exiting:animate-wm-pop-out md:motion-safe:data-entering:animate-wm-dialog-in',
          WIDTH[size],
        )}
      >
        <AriaDialog data-wm-calendar="" className="outline-none">
          {/* Keys stay in the dialog: a session below answers on 1 / 2 from a window listener (final review #5). Esc and Tab belong to the
              overlay, L to the host. */}
          <div onKeyDown={keepKeys}>
            <div aria-hidden className="mx-auto mt-2 h-1.25 w-10 rounded-full bg-wm-line md:hidden" />
            {children}
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
