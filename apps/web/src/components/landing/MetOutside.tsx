import { ArrowDown } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import type { AppCopy, LandingCopy } from './copy';
import { fill } from './fill';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-semibold text-muted">{label}</span>
      <span lang="en" className="min-h-control-touch rounded-inner border-2 border-border-strong bg-surface px-3 py-2.5 text-body break-words text-ink">
        {value}
      </span>
    </div>
  );
}

// "Từ gặp hằng ngày thành bài luyện tập" on a navy band: the add-word box (the app's words) and the fill-in-the-blank it turns into.
export function MetOutside({ copy, app }: { copy: LandingCopy['metOutside']; app: AppCopy }) {
  const a = app.addWord;
  return (
    <section id="gap-tu" aria-labelledby="met-title" className="scroll-mt-16 bg-navy py-14 text-on-navy md:py-24">
      <Container className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
        <div className="flex flex-col gap-4 lg:order-2 lg:col-span-2">
          <h2 id="met-title" className="text-h2 font-extrabold text-balance text-on-navy">
            {copy.title}
          </h2>
          <p className="text-body-lg text-on-navy">{copy.lead}</p>
        </div>
        <div className="flex flex-col gap-4 text-ink lg:order-1 lg:col-span-3">
          <div data-ui role="group" aria-label={a.title} className="flex max-w-xl flex-col gap-3 rounded-card bg-accent-soft p-5 shadow-ledge-accent">
            <b className="text-title text-ink">{a.title}</b>
            <Field label={a.word} value={copy.word} />
            <Field label={a.sentence} value={copy.sentence} />
            <span className="inline-flex min-h-control-touch w-fit items-center rounded-inner bg-accent px-6 text-body font-semibold text-on-accent shadow-ledge-accent">
              {fill(a.save, { word: copy.word })}
            </span>
          </div>
          <p className="flex max-w-xl items-center justify-center gap-2 text-small text-on-navy">
            <ArrowDown aria-hidden className="size-4" />
            {copy.arrow}
          </p>
          <div data-ui className="flex max-w-xl flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-sheet">
            <span className="w-fit rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-ink">{copy.savedLabel}</span>
            <p className="text-title text-ink" lang="en">
              {copy.before} <span role="img" aria-hidden className="mx-1 inline-block min-w-20 border-b-2 border-ink">{' '}</span> {copy.after}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
