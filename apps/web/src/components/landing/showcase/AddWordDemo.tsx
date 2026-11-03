import { cn } from '@/lib/cn';
import type { AppCopy, LandingCopy } from '../copy';
import { fill } from '../fill';

function Field({ label, value, lang, className }: { label: string; value: string; lang?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-caption font-semibold text-muted">{label}</span>
      <span lang={lang} className="min-h-control-touch rounded-inner border-2 border-border-strong bg-surface px-3 py-2.5 text-body break-words text-ink lg:min-h-10 lg:py-1.5">
        {value}
      </span>
    </div>
  );
}

// The "Thêm từ" box (features/learner/add-word/AddWordSheet.tsx), filled in with a past form Wordmet recognises. Every label comes from the app's strings.
export function AddWordDemo({ copy, app }: { copy: LandingCopy['showcase']['addWord']; app: AppCopy }) {
  const a = app.addWord;
  return (
    <div data-ui role="group" aria-label={a.title} className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-3 rounded-card bg-accent-soft p-5 shadow-ledge-accent lg:gap-2 lg:p-4">
      <b className="text-title text-ink">{a.title}</b>
      <Field label={a.word} value={copy.word} lang="en" />
      <p className="rounded-control bg-success-soft px-3 py-1.5 text-small text-success">{fill(a.recognized, { kind: a.pastKind, base: copy.base })}</p>
      <Field label={a.sentence} value={copy.sentence} lang="en" />
      <Field label={a.deck} value={copy.deck} className="lg:hidden" />
      <span className="inline-flex min-h-control-touch w-fit items-center rounded-inner bg-accent px-6 text-body font-semibold text-on-accent shadow-ledge-accent lg:hidden">
        {fill(a.save, { word: copy.base })}
      </span>
    </div>
  );
}
