import { cn } from '@/lib/cn';
import { Kbd } from './Kbd';

type Props = { items: Array<{ keys: string[]; label: string }>; className?: string; 'aria-label'?: string };

/** The key legend under a session (Figma "Phím" chips + 13 px labels; owner 18/11/2026: ink, muted sank into the page). Desktop only: phones have no keyboard. */
export function KeyLegend({ items, className, 'aria-label': label }: Props) {
  return (
    <ul aria-label={label} className={cn('hidden flex-wrap items-center gap-x-5 gap-y-2 md:flex', className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5 font-wm-sans text-wm-label text-wm-ink">
          {item.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
