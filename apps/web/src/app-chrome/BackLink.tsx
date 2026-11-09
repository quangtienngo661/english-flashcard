import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import { cn } from '@/lib/cn';

/** "← Nhóm", "← Cài đặt": the way back, at the top of a page under a tab (Figma: inside the content, "Nút chữ" look). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(TEXT_BUTTON_BASE, TEXT_BUTTON_TONE.normal, 'mb-3 self-start')}>
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
