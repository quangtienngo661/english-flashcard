import { cn } from '@/lib/cn';

type Props = { value: number; max: number; label: string; className?: string };

/** One continuous bar (app-redesign-plan 447): track `line`, fill `accent`, 6 px. The fill width is the only inline style. */
export function ProgressBar({ value, max, label, className }: Props) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-1.5 w-full overflow-hidden rounded-wm-pill bg-wm-line', className)}
    >
      <div
        className="h-full rounded-wm-pill bg-wm-accent transition-all duration-300 ease-wm-out-strong"
        // raw-ok: the fill width is data, not a design value
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
