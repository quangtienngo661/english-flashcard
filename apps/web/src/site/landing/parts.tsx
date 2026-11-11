import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BORDER_15, SECTION_TITLE, TEXT_17 } from './styles';

/**
 * A soft halo behind a section ("Quầng sáng", Figma SVG ellipses): a radial gradient of `--color-wm-glow-accent` or `-mark`, placed
 * from the section's centre with margins so M8.6 can drift it with `transform`.
 */
export function Glow({ tone, className }: { tone: 'accent' | 'mark'; className: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full bg-radial to-transparent to-70%',
        tone === 'accent' ? 'from-wm-glow-accent' : 'from-wm-glow-mark',
        className,
      )}
    />
  );
}

/** A section title and its one-line lead, centred (left on a phone where Figma draws it so). */
export function SectionHead({ id, title, lead, align = 'center' }: { id: string; title: string; lead: string; align?: 'center' | 'phone-left' }) {
  const place = align === 'center' ? 'items-center text-center' : 'items-start text-left md:items-center md:text-center';
  return (
    <div className={cn('flex flex-col gap-3', place)}>
      <h2 id={id} className={SECTION_TITLE}>
        {title}
      </h2>
      <p className={cn(TEXT_17, 'max-w-160 text-wm-muted')}>{lead}</p>
    </div>
  );
}

/** `sentence` with its first `target` on the yellow mark (Figma: `--mark`, radius 3, px 3). */
export function Marked({ sentence, target }: { sentence: string; target: string }) {
  const at = sentence.indexOf(target);
  if (at < 0) return sentence;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded-wm-xs bg-wm-mark px-0.75 text-wm-mark-ink">{target}</mark>
      {sentence.slice(at + target.length)}
    </>
  );
}

const WAVE = ['h-1.5', 'h-3.5', 'h-4.5', 'h-2.5', 'h-1.75'];

/** "Sóng âm": the pronunciation bars (3 px, `--accent`). M8.6 moves them. */
export function WaveBars({ count = 5 }: { count?: 4 | 5 }) {
  return (
    <span aria-hidden data-wave="" className="inline-flex h-4.5 items-center gap-0.5">
      {WAVE.slice(0, count).map((height) => (
        <span key={height} className={cn('w-0.75 rounded-wm-xs bg-wm-accent', height)} />
      ))}
    </span>
  );
}

/**
 * A still "Lựa chọn" (3:51) in a mock-up: the key chip, the word, and for a judged row the icon and "Đúng" / "Sai". Plain markup, not a
 * control: nothing on the page can be answered.
 */
export function ChoiceRow({ n, word, state, note, className }: { n: number; word: string; state?: 'right' | 'wrong'; note?: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-wm-md px-3 py-2 font-wm-sans text-wm-base text-wm-ink',
        BORDER_15,
        state === 'right' ? 'border-wm-pass bg-wm-pass-soft' : state === 'wrong' ? 'border-wm-fail bg-wm-fail-soft' : 'border-wm-line bg-wm-surface',
        className,
      )}
    >
      <span className="inline-flex size-5.5 shrink-0 items-center justify-center rounded-wm-sm bg-wm-accent-soft font-wm-sans text-wm-label text-wm-accent">{n}</span>
      <span className="min-w-0 flex-1 truncate">{word}</span>
      {state && note && (
        <span className={cn('inline-flex items-center gap-1 font-wm-sans text-wm-label', state === 'right' ? 'text-wm-pass' : 'text-wm-fail')}>
          {state === 'right' ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
          {note}
        </span>
      )}
    </div>
  );
}

/** Rows with Figma's "Dấu tích" 18 in front (pricing cards). */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 font-wm-sans text-wm-base text-wm-ink">
          <Check aria-hidden className="mt-0.75 size-4.5 shrink-0 text-wm-accent" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** The progress bars of a practice mock-up: done (`--accent`), current (`--ink`), left (`--line`). */
export function Progress({ done, total }: { done: number; total: number }) {
  return (
    <span aria-hidden className="flex gap-0.75">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-1.25 flex-1 rounded-wm-xs', i < done ? 'bg-wm-accent' : i === done ? 'bg-wm-ink' : 'bg-wm-line')} />
      ))}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-wm-sans text-wm-label text-wm-accent">{children}</p>;
}
