import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { cn } from '@/lib/cn';

/** "← Nhóm", "← Cài đặt": the way back, at the top of a page under a tab (Figma: inside the content, "Nút chữ" look). */
export function BackLink({ href, label, onClick }: { href: string; label: string; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'mb-3 flex w-fit max-w-full')}>
      <ArrowLeft aria-hidden className="size-4 shrink-0" />
      {/* A deck name of 60 letters with no space must not widen the page (e2e overflow on Backlog). */}
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}
