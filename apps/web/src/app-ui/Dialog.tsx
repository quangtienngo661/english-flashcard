'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { cn } from '@/lib/cn';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Next to the title ("Theo nhóm" chip of K/54). */
  titleAside?: ReactNode;
  /** Shows a close (×) button with this name at the top right. */
  closeLabel?: string;
  /** The wider dialog of K/54 (640 px) instead of 512 px. */
  wide?: boolean;
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
export function Dialog({ isOpen, onOpenChange, title, titleAside, closeLabel, wide, children, footer, isDismissable = true }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-ink/45 md:items-center md:p-4 motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out"
    >
      <Modal
        className={cn(
          'max-h-dvh w-full overflow-y-auto rounded-t-feature bg-surface px-5 pb-6 pt-5 shadow-dialog outline-none md:rounded-feature md:p-7 motion-safe:data-entering:animate-sheet-in motion-safe:data-exiting:animate-sheet-out md:motion-safe:data-entering:animate-dialog-in md:motion-safe:data-exiting:animate-dialog-out',
          wide ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
      >
        <AriaDialog className="flex flex-col gap-4 outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Heading slot="title" className="break-words text-title font-bold text-ink">
                    {title}
                  </Heading>
                  {titleAside}
                </div>
                {closeLabel && (
                  <Button
                    aria-label={closeLabel}
                    onPress={close}
                    isDisabled={!isDismissable}
                    className="shrink-0 rounded-sm p-1 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    <X aria-hidden className="size-5" />
                  </Button>
                )}
              </div>
              {children}
              {footer && <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">{footer}</div>}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
