'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AddWordProvider } from '@/features/learner/add-word/add-word-context';
import { cn } from '@/lib/cn';
import { AddFab } from './AddFab';
import { AppChrome } from './AppChrome';
import { BackLink as BackLinkView } from './BackLink';
import { CardFrame } from './CardFrame';
import { PageColumns } from './PageColumns';

export type BackLink = { href: string; label: string };

type Props = {
  variant: 'main' | 'sub' | 'full' | 'bare';
  children: ReactNode;
  aside?: ReactNode;
  back?: BackLink;
  fab?: boolean;
};

/** Temporary (giao diện mới M1.9): renders the new chrome so every page keeps compiling; M1.10 moves the chrome into layouts and deletes it. */
export function AppShell({ variant, children, aside, back, fab = false }: Props) {
  if (variant === 'full') return <>{children}</>;
  if (variant === 'bare') return <CardFrame>{children}</CardFrame>;
  return (
    <AddWordProvider>
      <AppChrome>
        {back && <BackLinkView href={back.href} label={back.label} />}
        <PageColumns aside={aside}>{children}</PageColumns>
      </AppChrome>
      {fab && <AddFab />}
    </AddWordProvider>
  );
}

/** "‹ Nhóm", "‹ Cài đặt"… (copy doc §12, point 5). */
export function SubpageBack({ back, tone = 'navy' }: { back: BackLink; tone?: 'navy' | 'surface' }) {
  return (
    <Link
      href={back.href}
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-control py-1 pr-2 text-body font-semibold outline-none focus-visible:ring-2',
        tone === 'navy' ? 'text-on-navy focus-visible:ring-accent' : 'text-primary focus-visible:ring-primary',
      )}
    >
      <ChevronLeft aria-hidden className="size-5 shrink-0" />
      <span className="truncate">{back.label}</span>
    </Link>
  );
}

/**
 * "(mờ) Nền họa tiết học từ (web)": decoration only, drawn as one hidden SVG at 12% so it is never read as text, hidden on
 * phones.
 */
export function StudyPattern() {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 hidden size-full select-none text-ink opacity-12 md:block"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="70" y="110" width="150" height="44" rx="22" />
        <rect x="780" y="70" width="190" height="120" rx="20" transform="rotate(6 875 130)" />
        <rect x="60" y="760" width="190" height="120" rx="20" transform="rotate(-4 155 820)" />
        <circle cx="880" cy="350" r="32" />
        <path d="M830 470h40M890 470h40M950 470h40" />
      </g>
      <g fill="currentColor" fontFamily="inherit" fontWeight="700">
        <text x="95" y="140" fontSize="22">✓ Đã biết</text>
        <rect x="390" y="122" width="190" height="22" className="fill-accent" />
        <text x="395" y="140" fontSize="34">remember</text>
        <text x="830" y="140" fontSize="32">cache</text>
        <text x="110" y="830" fontSize="34">went</text>
        <text x="380" y="930" fontSize="32">leave · left · left</text>
        <text x="830" y="860" fontSize="90">?</text>
      </g>
    </svg>
  );
}
