import { Link } from '@/i18n/navigation';

export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-control" aria-label="Wordmet">
      <span aria-hidden="true" className="rounded-sm bg-marker px-2 py-1 text-body font-extrabold text-ink">
        _ _
      </span>
      <span className="text-title font-extrabold text-ink">Wordmet</span>
    </Link>
  );
}
