'use client';

import { Plus } from 'lucide-react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '@/lib/cn';

// Figma "Nút chữ" (166:326): no fill, no underline, 14px semibold. Thêm: + icon, navy; Thường: navy; Phụ: muted; Xóa: red.
// The touch area reaches 44px on phones.
export type TextButtonTone = 'add' | 'normal' | 'muted' | 'delete';

const TONE: Record<TextButtonTone, string> = {
  add: 'text-wm-accent',
  normal: 'text-wm-accent',
  muted: 'text-wm-muted',
  delete: 'text-wm-fail',
};

export const TEXT_BUTTON_BASE =
  'inline-flex min-h-11 items-center gap-1.5 rounded-wm-sm font-wm-sans text-wm-small-strong outline-none md:min-h-0 ' +
  'hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const TEXT_BUTTON_TONE = TONE;

type Props = Omit<AriaButtonProps, 'className'> & { tone?: TextButtonTone; className?: string };

export function TextButton({ tone = 'normal', className, children, ...rest }: Props) {
  return (
    <AriaButton {...rest} className={cn(TEXT_BUTTON_BASE, TONE[tone], className)}>
      {(values) => (
        <>
          {tone === 'add' && <Plus aria-hidden className="size-4" />}
          {typeof children === 'function' ? children(values) : children}
        </>
      )}
    </AriaButton>
  );
}
