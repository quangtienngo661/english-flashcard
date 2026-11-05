import { Check, Crown, Minus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Perk = { text: string; included: boolean };

/**
 * One plan of K/52, K/53: the name, an optional badge beside it (yellow on Pro, "Gói hiện tại"), what it says, and its perks. Both cards
 * sit on the soft shadow (owner 05/11/2026); Pro keeps its yellow border.
 */
export function PlanCard({ name, crown, badge, chip, children, perks, highlight }: {
  name: string;
  crown?: boolean;
  badge?: string;
  chip?: string;
  children?: ReactNode;
  perks: Perk[];
  highlight?: boolean;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex min-w-0 flex-col rounded-feature bg-surface shadow-soft-card',
        highlight ? 'border-2 border-accent' : 'border border-border',
      )}
    >
      <div className="flex flex-col gap-3 p-5 md:p-6">
        {chip && <span className="w-fit rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-ink">{chip}</span>}
        <div className="flex items-center justify-between gap-3">
          <h2 id={id} className="flex items-center gap-2 text-h2 font-extrabold text-ink">
            {crown && <Crown aria-hidden className="size-6 text-accent-deep" />}
            {name}
          </h2>
          {badge && <p className="shrink-0 rounded-inner bg-accent-soft px-2.5 py-1 text-caption font-semibold text-warning">{badge}</p>}
        </div>
        {children}
        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {perks.map((perk) => (
            <li key={perk.text} className={cn('flex items-start gap-2 text-ui', perk.included ? 'text-ink' : 'text-muted')}>
              {perk.included ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />}
              {perk.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
