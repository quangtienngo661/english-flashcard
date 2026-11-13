import { ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';

/**
 * The current-plan card of Tài khoản and Lịch sử giao dịch (Figma 180:5423): radius 14, padding 20 × 16 (phone 16), a 40 px accent-soft
 * tile with a star, the plan as the title, one muted line, and a text link to the plans page.
 */
export function CurrentPlanCard({ title, line, href, linkLabel }: { title: string; line?: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-wm-card border border-wm-line bg-wm-surface p-4 shadow-wm-card md:px-5">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-wm-control bg-wm-accent-soft text-wm-accent">
        <Star className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-wm-sans text-wm-base font-bold text-wm-ink">{title}</p>
        {line && <p className="font-wm-sans text-wm-small text-wm-muted">{line}</p>}
      </div>
      <Link href={href} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'shrink-0')}>
        {linkLabel}
        <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
