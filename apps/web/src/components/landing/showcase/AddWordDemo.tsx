import type { AppCopy, LandingCopy } from '../copy';
import { fill } from '../fill';

function Field({ label, value, lang }: { label: string; value: string; lang?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-semibold text-muted">{label}</span>
      <span lang={lang} className="min-h-10 rounded-inner border-2 border-border-strong bg-surface px-3 py-1.5 text-body break-words text-ink">
        {value}
      </span>
    </div>
  );
}

// The "Thêm từ" box (features/learner/add-word/AddWordSheet.tsx), filled in with a past form Wordmet recognises. Every label comes from the app's strings.
export function AddWordDemo({ copy, app }: { copy: LandingCopy['showcase']['addWord']; app: AppCopy }) {
  const a = app.addWord;
  return (
    <div data-ui role="group" aria-label={a.title} className="flex w-full min-w-0 flex-col gap-2 rounded-card bg-accent-soft p-4 shadow-ledge-accent">
      <b className="text-title text-ink">{a.title}</b>
      <Field label={a.word} value={copy.word} lang="en" />
      <p className="rounded-control bg-success-soft px-3 py-1.5 text-small text-success">{fill(a.recognized, { kind: a.pastKind, base: copy.base })}</p>
      <Field label={a.sentence} value={copy.sentence} lang="en" />
    </div>
  );
}
