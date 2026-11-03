import { Plus } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import type { LandingCopy } from './copy';

// Native <details name> accordion: works without JS and keeps one item open (spec W11). The answer opens to its own height and the plus turns
// into a cross (globals.css `.faq-item::details-content`, `--transition-duration-faq`); reduced motion opens it at once.
export function Faq({ copy }: { copy: LandingCopy['faq'] }) {
  const items = [
    [copy.q1, copy.a1],
    [copy.q2, copy.a2],
    [copy.q3, copy.a3],
    [copy.q4, copy.a4],
  ];
  return (
    <section id="hoi-dap" aria-labelledby="faq-title" className="scroll-mt-16 bg-canvas py-14 md:py-24">
      <Container className="flex flex-col gap-8">
        <h2 id="faq-title" className="text-h2 font-extrabold text-balance text-ink">
          {copy.title}
        </h2>
        <div className="flex flex-col gap-3">
          {items.map(([question, answer], index) => (
            <details key={question} name="faq" open={index === 0} className="faq-item group rounded-panel bg-surface shadow-sheet">
              <summary className="flex min-h-control-touch cursor-pointer list-none items-center justify-between gap-4 rounded-panel px-5 py-4 text-body-lg font-semibold text-ink outline-none transition-transform duration-fast ease-out-strong focus-visible:ring-2 focus-visible:ring-primary motion-safe:active:scale-97 [&::-webkit-details-marker]:hidden">
                {question}
                <Plus aria-hidden className="size-5 shrink-0 text-muted transition-transform duration-faq ease-out-strong group-open:rotate-45" />
              </summary>
              <p className="max-w-prose px-5 pb-5 text-body text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
