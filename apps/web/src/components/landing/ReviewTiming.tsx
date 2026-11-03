import { Check, Target } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import type { LandingCopy } from './copy';

// Sample numbers for the app's boxes (they add up to the 430 in the panel title). They are labelled "Dữ liệu mẫu" on the page.
const BOXES = [
  { label: 'b0', count: 180 },
  { label: 'b1', count: 64 },
  { label: 'b2', count: 48 },
  { label: 'b3', count: 52 },
  { label: 'b4', count: 46 },
  { label: 'b5', count: 40 },
] as const;
const TOTAL = BOXES.reduce((sum, box) => sum + box.count, 0);

export function ReviewTiming({ copy }: { copy: LandingCopy['review'] }) {
  return (
    <section id="on-lai" aria-labelledby="review-title" className="scroll-mt-16 bg-surface py-14 md:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 id="review-title" className="text-h2 font-extrabold text-ink">
            {copy.title}
          </h2>
          <p className="text-body-lg text-ink">{copy.lead}</p>
          <ul className="flex flex-col gap-2 text-body text-ink">
            {[copy.p1, copy.p2].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-5 lg:col-span-3">
          <div data-ui className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5 shadow-sheet sm:col-span-3">
            <p className="flex flex-wrap items-center gap-2 text-body font-bold text-ink">
              {copy.panelTitle}
              <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold">{copy.sample}</span>
            </p>
            <ul aria-label={copy.panelTitle} className="flex flex-col gap-2.5 text-small text-ink tabular-nums">
              {BOXES.map(({ label, count }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="w-18 shrink-0">{copy[label]}</span>
                  <span aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-primary">
                    <span
                      className="block h-full bg-primary"
                      // raw-ok: sample proportion of the box counts, not a design value
                      style={{ width: `${Math.round((count / TOTAL) * 100)}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-bold">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div data-ui className="flex flex-col gap-2 self-start rounded-card bg-danger-soft p-4 sm:col-span-2">
            <b className="flex items-center gap-2 text-title text-ink">
              <Target aria-hidden className="size-5" />
              {copy.weakTitle}
            </b>
            <p className="text-small text-ink">{copy.weakBody}</p>
            <div className="flex flex-wrap gap-1.5" lang="en">
              {[copy.w1, copy.w2].map((chip) => (
                <span key={chip} className="rounded-full bg-surface px-2.5 py-0.5 text-caption font-semibold text-ink ring-2 ring-ink">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
