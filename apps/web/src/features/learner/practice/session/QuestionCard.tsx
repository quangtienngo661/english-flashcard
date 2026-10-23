'use client';

import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { Prompt } from './use-practice-session';

export const KBD = 'hidden rounded-sm border px-1.5 text-caption font-semibold md:inline';

export type PromptKind = 'mcq' | 'true_false' | 'type_meaning' | 'type_sentence' | 'other';
export const promptKind = (prompt: Prompt): PromptKind =>
  prompt.kind === 'mcq' || prompt.kind === 'true_false' || prompt.kind === 'type_meaning' || prompt.kind === 'type_sentence' ? prompt.kind : 'other';

/** The question card of K/60–K/64: type chip, what to do, [Báo lỗi], then the question itself. */
export function QuestionCard({ prompt, reportable, reported, onReport, children }: {
  prompt: Prompt;
  reportable: boolean;
  reported: boolean;
  onReport: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('App.practice.session');
  const kind = promptKind(prompt);
  return (
    <section className="flex flex-col gap-5 rounded-feature border-2 border-border-strong bg-surface p-5 shadow-ledge md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{t(`kind.${kind}`)}</span>
          <span className="text-caption text-muted">{t(`ask.${kind}`)}</span>
        </div>
        {reportable && (
          <button
            type="button"
            onClick={onReport}
            disabled={reported}
            className="flex shrink-0 items-center gap-1.5 rounded-sm px-1 text-caption font-semibold text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary disabled:text-muted disabled:no-underline"
          >
            <Flag aria-hidden className="size-4" />
            {reported ? t('report.sent') : t('report.button')}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** The meaning (or word) in large type, with its context label ("phần mềm"). */
export function PromptTitle({ text, label, sub }: { text: string; label?: string | null; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-words text-h2 font-extrabold text-ink">{text}</p>
        {label && <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold text-ink">{label}</span>}
      </div>
      {sub && <p className="break-words text-title font-semibold text-muted">{sub}</p>}
    </div>
  );
}
