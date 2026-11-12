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
  /** Max width from 48rem: `md` 512 px (default), `lg` 672 px, `xl` 860 px (Overlay 4, two columns). */
  size?: 'md' | 'lg' | 'xl';
  /** Alias of `size="lg"`, kept until M8 so untouched callers compile. */
  wide?: boolean;
  children?: ReactNode;
  /** Buttons: right-aligned on wide screens, full width under 768 px. */
  footer?: ReactNode;
  /** Off while a request is in flight, so Esc or an outside tap cannot hide a pending action. */
  isDismissable?: boolean;
  /** `pro`: a 2 px accent border on every side (Giới thiệu Pro, M7 Figma B §5.2); the sheet keeps its top corners only. */
  tone?: 'default' | 'pro';
};

/**
 * A controlled dialog (`isOpen`, `onOpenChange`) with a title, content and footer buttons. From 48rem a centred modal, below it a
 * bottom sheet; the shape follows the width with CSS only, so resizing keeps what the learner typed. Motion (GM15, motion §5–§6): the
 * backdrop fades in 200ms; the modal rises 12px in 240ms, the sheet comes from 60px while fading in; both close in 150ms on the
 * accelerating curve. The backdrop is the `scrim` token (navy 30 % in light, black 55 % in dark).
 */
const WIDTH = { md: 'md:max-w-lg', lg: 'md:max-w-2xl', xl: 'md:max-w-215' } as const;

export function Dialog({ isOpen, onOpenChange, title, titleAside, closeLabel, size, wide, children, footer, isDismissable = true, tone = 'default' }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-wm-scrim backdrop-blur-wm-overlay md:items-center md:p-4 motion-safe:data-entering:animate-wm-overlay-in motion-safe:data-exiting:animate-wm-pop-out"
    >
      <Modal
        className={cn(
          'max-h-dvh w-full overflow-y-auto rounded-t-wm-modal bg-wm-surface px-5 pb-6 pt-5 shadow-wm-pop outline-none md:rounded-wm-modal md:p-7',
          'motion-safe:data-entering:animate-wm-sheet-in motion-safe:data-exiting:animate-wm-pop-out md:motion-safe:data-entering:animate-wm-dialog-in',
          WIDTH[size ?? (wide ? 'lg' : 'md')],
          tone === 'pro' && 'border-2 border-wm-accent',
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
