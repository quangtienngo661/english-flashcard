import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  /** Buttons, right-aligned; a form that carries its own buttons leaves this out. */
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Off while a request is in flight, so Esc or an outside click cannot hide a pending action. */
  isDismissable?: boolean;
};

const SIZE = { sm: 'max-w-sm', md: 'max-w-120', lg: 'max-w-2xl' } as const;

/** A decision, not a celebration: it fades and lifts in 250ms and out in 150ms, with no bounce (design §6.2). */
export function Dialog({ isOpen, onOpenChange, title, children, actions, size = 'sm', isDismissable = true }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-ink/45 p-page-pad-min shell:items-center motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out"
    >
      <Modal
        className={`my-auto w-full rounded-feature bg-surface p-7 shadow-dialog outline-none motion-safe:data-entering:animate-dialog-in motion-safe:data-exiting:animate-dialog-out ${SIZE[size]}`}
      >
        <AriaDialog className="flex flex-col gap-4 outline-none">
          <Heading slot="title" className="break-words text-xl font-extrabold tracking-tight text-ink">
            {title}
          </Heading>
          {children}
          {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
