import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONE = {
  pass: { dot: 'bg-wm-pass', text: 'text-wm-pass' },
  accent: { dot: 'bg-wm-accent', text: 'text-wm-accent' },
  muted: { dot: 'bg-wm-muted', text: 'text-wm-muted' },
  // "Đã hoàn tiền" (M7 Figma A §6.1): a ghost dot, but a muted label, since ghost text would not reach 4.5:1.
  ghost: { dot: 'bg-wm-ghost', text: 'text-wm-muted' },
  fail: { dot: 'bg-wm-fail', text: 'text-wm-fail' },
} as const;

/** A status with its 8 px dot ("Thành công", "Đã sửa"…): the label in Noto Sans SemiBold 14, coloured by the tone. */
export function StatusDot({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-wm-sans text-wm-small-strong', TONE[tone].text)}>
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE[tone].dot)} />
      {children}
    </span>
  );
}
