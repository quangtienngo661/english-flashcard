import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { cn } from '@/lib/cn';

/**
 * "← Nhóm", "← Cài đặt": the way back, at the top of a page under a tab (Figma: inside the content, "Nút chữ" look). `prefetch` loads
 * the whole page ahead, so going back shows it at once instead of the loading skeleton (owner 13/11/2026).
 */
export function BackLink({ href, label, onClick, prefetch }: { href: string; label: string; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void; prefetch?: boolean }) {
  return (
    <Link href={href} onClick={onClick} prefetch={prefetch ? true : undefined} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'mb-3 flex w-fit max-w-full')}>
      <ArrowLeft aria-hidden className="size-4 shrink-0" />
      {/* A deck name of 60 letters with no space must not widen the page (e2e overflow on Backlog). */}
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}
