'use client';

import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  /** Buttons: right-aligned on wide screens, full width under 768 px. */
  footer?: ReactNode;
  /** Off while a request is in flight, so Esc or an outside tap cannot hide a pending action. */
  isDismissable?: boolean;
};

/**
 * One component, two shapes (design §4.7, E42): a centred dialog from 768 px, a sheet from the bottom below it. The shape
 * follows the window width with CSS only, so resizing keeps whatever the learner typed.
 */
export function Dialog({ isOpen, onOpenChange, title, children, footer, isDismissable = true }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-ink/45 md:items-center md:p-4 motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out"
    >
      <Modal className="max-h-dvh w-full overflow-y-auto rounded-t-feature bg-surface px-5 pb-6 pt-5 shadow-dialog outline-none md:max-w-lg md:rounded-feature md:p-7 motion-safe:data-entering:animate-sheet-in motion-safe:data-exiting:animate-sheet-out md:motion-safe:data-entering:animate-dialog-in md:motion-safe:data-exiting:animate-dialog-out">
        <AriaDialog className="flex flex-col gap-4 outline-none">
          <Heading slot="title" className="break-words text-title font-bold text-ink">
            {title}
          </Heading>
          {children}
          {footer && <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">{footer}</div>}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
