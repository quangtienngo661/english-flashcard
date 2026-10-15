import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

// `onPrimary`: on the blue header field; `default`: on white (design §5.1).
export function Logo({ tone = 'default' }: { tone?: 'default' | 'onPrimary' }) {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-control" aria-label="Wordmet">
      <span aria-hidden="true" className="rounded-sm bg-accent px-2 py-1 text-body font-extrabold text-ink">
        _ _
      </span>
      <span className={cn('text-title font-extrabold', tone === 'onPrimary' ? 'text-on-primary' : 'text-ink')}>Wordmet</span>
    </Link>
  );
}
