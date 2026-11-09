'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { cn } from '@/lib/cn';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Next to the title (a chip). */
  titleAside?: ReactNode;
  /** Shows a close (×) button with this name at the top right. */
  closeLabel?: string;
  /** The wider dialog (640 px) instead of 512 px. */
  wide?: boolean;
  children?: ReactNode;
  /** Buttons: right-aligned on wide screens, full width under 768 px. */
  footer?: ReactNode;
  /** Off while a request is in flight, so Esc or an outside tap cannot hide a pending action. */
  isDismissable?: boolean;
};

/**
 * Same props as app-ui/Dialog. From 48rem a centred modal, below it a bottom sheet; the shape follows the width with CSS only, so
 * resizing keeps what the learner typed. Motion (GM15, motion §5–§6): the backdrop fades in 200ms; the modal rises 12px in 240ms, the
 * sheet comes from 60px while fading in; both close in 150ms on the accelerating curve. The backdrop is mark-ink, the same navy in
 * both themes (ink turns light in dark mode).
 */
export function Dialog({ isOpen, onOpenChange, title, titleAside, closeLabel, wide, children, footer, isDismissable = true }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-wm-mark-ink/30 backdrop-blur-wm-overlay md:items-center md:p-4 motion-safe:data-entering:animate-wm-overlay-in motion-safe:data-exiting:animate-wm-pop-out"
    >
      <Modal
        className={cn(
          'max-h-dvh w-full overflow-y-auto rounded-t-wm-modal bg-wm-surface px-5 pb-6 pt-5 shadow-wm-pop outline-none md:rounded-wm-modal md:p-7',
          'motion-safe:data-entering:animate-wm-sheet-in motion-safe:data-exiting:animate-wm-pop-out md:motion-safe:data-entering:animate-wm-dialog-in',
          wide ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
      >
        <AriaDialog className="flex flex-col gap-4 outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Heading slot="title" className="break-words font-wm-display text-wm-card-title text-wm-ink">
                    {title}
                  </Heading>
                  {titleAside}
                </div>
                {closeLabel && (
                  <Button
                    aria-label={closeLabel}
                    onPress={close}
                    isDisabled={!isDismissable}
                    className="flex size-11 shrink-0 items-center justify-center rounded-wm-md text-wm-muted outline-none hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-wm-accent disabled:opacity-50 md:size-9"
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
