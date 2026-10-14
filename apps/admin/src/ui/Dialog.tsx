import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  /** Buttons, right-aligned. */
  actions: ReactNode;
  size?: 'sm' | 'md';
  /** Off while a request is in flight, so Esc or an outside click cannot hide a pending action. */
  isDismissable?: boolean;
};

export function Dialog({ isOpen, onOpenChange, title, children, actions, size = 'sm', isDismissable = true }: Props) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-page-pad-min shell:items-center"
    >
      <Modal className={`my-auto w-full rounded-panel bg-surface p-6 shadow-card outline-none ${size === 'md' ? 'max-w-md' : 'max-w-sm'}`}>
        <AriaDialog className="flex flex-col gap-4 outline-none">
          <Heading slot="title" className="break-words text-xl font-semibold text-ink">
            {title}
          </Heading>
          {children}
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
