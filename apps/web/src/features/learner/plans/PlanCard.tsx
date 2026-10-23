import { Check, Crown, Minus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Perk = { text: string; included: boolean };

/** One plan of K/52, K/53: an optional strip on top (yellow for Pro), the name, what it says, and its perks. */
export function PlanCard({ name, crown, strip, chip, children, perks, footnote, highlight }: {
  name: string;
  crown?: boolean;
  strip?: string;
  chip?: string;
  children?: ReactNode;
  perks: Perk[];
  footnote?: string;
  highlight?: boolean;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-feature bg-surface',
        highlight ? 'border-2 border-accent shadow-ledge-accent' : 'border border-border shadow-ledge-card',
      )}
    >
      {strip && <p className="bg-accent px-4 py-1.5 text-center text-caption font-semibold text-on-accent">{strip}</p>}
      <div className="flex flex-col gap-3 p-5 md:p-6">
        {chip && <span className="w-fit rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-ink">{chip}</span>}
        <h2 id={id} className="flex items-center gap-2 text-h2 font-extrabold text-ink">
          {crown && <Crown aria-hidden className="size-6 text-accent-deep" />}
          {name}
        </h2>
        {children}
        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {perks.map((perk) => (
            <li key={perk.text} className={cn('flex items-start gap-2 text-ui', perk.included ? 'text-ink' : 'text-muted')}>
              {perk.included ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />}
              {perk.text}
            </li>
          ))}
        </ul>
        {footnote && <p className="text-caption text-muted">{footnote}</p>}
      </div>
    </section>
  );
}
