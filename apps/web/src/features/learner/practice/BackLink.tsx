import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/** "← Luyện tập" above a sub page title on the web (K/56, K/57); phones have the header back link instead. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-2 hidden w-fit items-center gap-1.5 rounded-sm text-ui text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary md:flex">
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
