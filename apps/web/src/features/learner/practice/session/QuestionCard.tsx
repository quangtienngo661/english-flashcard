'use client';

import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Kbd } from '@/ui/Kbd';
import { Tag } from '@/ui/Tag';
import { TextButton } from '@/ui/TextButton';
import type { Prompt } from './use-practice-session';

/** The old key cap class: only the summary still uses it, until M5.5 rebuilds it. */
export const KBD = 'hidden rounded-sm border px-1.5 text-caption font-semibold md:inline';

export type PromptKind = Prompt['kind'];
export const promptKind = (prompt: Prompt): PromptKind => prompt.kind;

/** A key cap that shows from `md` up (phones have no keyboard): inside session buttons. */
export function ButtonKey({ children }: { children: ReactNode }) {
  return (
    <span className="hidden opacity-85 md:inline-flex">
      <Kbd>{children}</Kbd>
    </span>
  );
}

/**
 * The question card (Figma 100:3164 "Câu hỏi và kết quả", M5 Figma A §3): kind chip, "câu AI" chip, [Báo lỗi] at the right,
 * the mono instruction, then the question. The result panel tucks under it (`AnswerFeedback`).
 */
export function QuestionCard({ prompt, ai = false, reportable, reported, onReport, children }: {
  prompt: Prompt;
  ai?: boolean;
  reportable: boolean;
  reported: boolean;
  onReport: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('App.practice.session');
  const kind = promptKind(prompt);
  return (
    // 2A (owner 27/10/2026): each question is a new card (keyed by item) and rises in.
    <section className="relative z-10 flex flex-col gap-4 rounded-wm-xl border border-wm-line bg-wm-surface px-5 pb-6 pt-5 shadow-wm-card motion-safe:animate-card-rise md:px-8 md:pt-7">
      <div className="flex flex-wrap items-center gap-2">
        {/* Figma writes the chip and the instruction in lower case; the copy keeps its capital for other places. */}
        <span className="lowercase">
          <Tag mono>{t(`kind.${kind}`)}</Tag>
        </span>
        {ai && <Tag tone="accent">{t('aiChip')}</Tag>}
        <span className="flex-1" />
        {reportable && (
          <TextButton tone="muted" onPress={onReport} isDisabled={reported}>
            <Flag aria-hidden className="size-4" />
            {reported ? t('report.sent') : t('report.button')}
          </TextButton>
        )}
      </div>
      <p className="font-wm-mono text-wm-mono text-wm-muted first-letter:lowercase">{t(`ask.${kind}`)}</p>
      {children}
    </section>
  );
}

/** The meaning (or word) in large type, with its context label ("phần mềm"). */
export function PromptTitle({ text, label, sub }: { text: string; label?: string | null; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="break-words font-wm-display text-wm-card-title text-wm-ink md:text-wm-lemma">{text}</p>
        {label && <Tag>{label}</Tag>}
      </div>
      {sub && <p className="break-words font-wm-sans text-wm-lead text-wm-muted">{sub}</p>}
    </div>
  );
}
