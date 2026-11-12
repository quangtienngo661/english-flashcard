import { Check, Minus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Perk = { text: string; included: boolean };

/**
 * One plan of Gói học (M7 Figma B §1.1–§1.2): a `section` named by its `h2`, the tags beside the name, what comes before the perks, the
 * check rows, and what comes after them. Radius 20 (R8), padding 28 / 20 on phones. Pro has the 2 px accent border and its own shadow.
 */
export function PlanCard({ name, tags, intro, perks, footer, highlight = false, className }: {
  name: string;
  tags?: ReactNode;
  intro?: ReactNode;
  perks: Perk[];
  footer?: ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-wm-card bg-wm-surface p-5 md:p-7',
        highlight ? 'border-2 border-wm-accent shadow-wm-pro' : 'border border-wm-line shadow-wm-card',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className="font-wm-display text-wm-card-title font-extrabold text-wm-ink">
          {name}
        </h2>
        {tags}
      </div>
      {intro}
      <ul className="flex flex-col gap-4">
        {perks.map((perk) => (
          <li key={perk.text} className={`flex items-start gap-2 font-wm-sans text-wm-small ${perk.included ? 'text-wm-ink' : 'text-wm-muted'}`}>
            {perk.included ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-wm-pass" /> : <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />}
            {perk.text}
          </li>
        ))}
      </ul>
      {footer}
    </section>
  );
}
