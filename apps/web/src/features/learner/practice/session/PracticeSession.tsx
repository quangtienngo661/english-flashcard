'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NetworkError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { Button } from '@/app-ui/Button';
import { ErrorState, FullScreenSpinner } from '@/app-ui/States';
import { cn } from '@/lib/cn';
import { useGroups } from '../../groups/groups-api';
import { useSourceLabel } from '../CurrentSessionCard';
import type { PracticeSessionView } from '../practice-api';
import { AnswerFeedback } from './AnswerFeedback';
import { HintPanel, hintLevels } from './HintPanel';
import { Choices, chosenChoice } from './McqQuestion';
import { KBD, PromptTitle, QuestionCard, promptKind } from './QuestionCard';
import { ReportDialog } from './ReportDialog';
import { RoundPrompt } from './RoundPrompt';
import { SessionSummary } from './SessionSummary';
import { TrueFalseChoices } from './TrueFalseQuestion';
import { focusAnswer, TryAgainActions, TypeWordInput } from './TypeWordQuestion';
import { usePracticeSession, type Item, type PracticeSessionState } from './use-practice-session';

const AI_TYPES = ['meaning_in_sentence', 'mcq_sentence'];

/** K/60–K/67 `/app/practice/session`: the open practice session, full screen. */
export function PracticeSession() {
  const t = useTranslations('App.practice.session');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const state = usePracticeSession();
  const { phase, session } = state;
  const groups = useGroups();
  const label = useSourceLabel();
  const [reporting, setReporting] = useState(false);
  const sourceLabel = session ? label({ session, item: null, preparing: false }, groups.data?.items ?? []) : '';
  const practiceHref = `/${locale}/app/practice`;

  // Keys (K/51 "Phím tắt"): 1–4 choose, 1/2 Cần ôn lại / Đã biết after a result, Enter next, H hint, Esc stop.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || reporting) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      // A graded typed answer keeps its (read-only) field focused; Enter there moves on like anywhere else.
      const field = target?.closest('input, textarea') as HTMLInputElement | null;
      const typing = Boolean(field && !field.readOnly);
      if (e.key === 'Escape') {
        if (phase?.kind === 'question' || phase?.kind === 'round') {
          e.preventDefault();
          if (phase.kind === 'round') void state.continueRound(false);
          else void state.stop();
        }
        return;
      }
      if (typing) return;
      if ((e.key === 'Enter' || e.key === ' ') && target?.closest('button, a')) return;
      if (phase?.kind === 'round') {
        if (e.key === 'Enter') void state.continueRound(true);
        return;
      }
      if (phase?.kind === 'summary') {
        if (e.key === 'Enter') hardReplace(practiceHref);
        return;
      }
      if (phase?.kind !== 'question') return;
      const { item, outcome } = phase;
      if (outcome?.kind === 'final') {
        if (e.key === '1') void state.review('needs_review');
        else if (e.key === '2' && outcome.result.show_known) void state.review('known');
        else if (e.key === 'Enter') void state.next();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        const next = hintLevels(item).find((n) => n > item.hint_level);
        if (next) state.setHintLevel(next);
        return;
      }
      if (outcome?.kind === 'try_again' && e.key === 'Enter') {
        focusAnswer();
        return;
      }
      const n = Number(e.key);
      if (item.prompt.kind === 'true_false' && (n === 1 || n === 2)) void state.answer({ is_true: n === 1 });
      else if ('options' in item.prompt && n >= 1 && n <= item.prompt.options.length) void state.answer({ choice: n - 1 });
    };
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  let body: ReactNode;
  if (state.load.isError) body = <ErrorState message={errorText(state.load.error)} onRetry={() => void state.load.refetch()} />;
  else if (phase === null || phase.kind === 'advancing' || !session && phase.kind !== 'none') body = state.error ? <Ended message={errorText(state.error)} href={practiceHref} /> : <FullScreenSpinner />;
  else if (phase.kind === 'none') body = <Ended message={t('none')} href={practiceHref} />;
  else if (phase.kind === 'closed') body = <Ended message={t('closed')} href={practiceHref} />;
  else if (phase.kind === 'round') body = <RoundPrompt session={session!} onContinue={(go) => void state.continueRound(go)} busy={state.busy} />;
  else if (phase.kind === 'summary') body = <SessionSummary session={session!} sourceLabel={sourceLabel} />;
  else body = <Question state={state} item={phase.item} onReport={() => setReporting(true)} />;

  const done = phase?.kind === 'summary';
  const total = session?.target_count ?? 0;
  const position = done ? total : (session?.asked ?? 0);
  const progressText = done ? t('progressDone', { total }) : t('progress', { n: position, total });
  const stoppable = phase?.kind === 'question' || phase?.kind === 'round';
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between gap-3 px-4 pt-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {stoppable ? (
            <button type="button" aria-label={t('close')} onClick={() => void state.stop()} className="rounded-sm p-1 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X aria-hidden className="size-5" />
            </button>
          ) : (
            <Link href={practiceHref} aria-label={tc('close')} className="rounded-sm p-1 text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X aria-hidden className="size-5" />
            </Link>
          )}
          <kbd className={`${KBD} border-border-strong text-ink`}>Esc</kbd>
          {session && <span className="truncate text-ui text-ink">{t('header', { source: sourceLabel })}</span>}
        </div>
        {session && total > 0 && (
          <div className="flex shrink-0 items-center gap-3">
            <Progress results={state.results} position={position} total={total} done={done} label={progressText} />
            <span className="text-ui font-semibold text-ink">{progressText}</span>
          </div>
        )}
      </header>
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6">
        {body}
      </main>
      {phase?.kind === 'question' && session && (
        <ReportDialog
          key={phase.item.item_id}
          itemId={phase.item.item_id}
          kind={isAi(phase.item, session) ? 'ai' : 'non_ai'}
          subtitle={reportSubtitle(phase.item, t(`kind.${promptKind(phase.item.prompt)}`))}
          isOpen={reporting}
          onClose={() => setReporting(false)}
          onSent={() => state.markReported(phase.item.item_id)}
        />
      )}
    </div>
  );
}

const isAi = (item: Item, session: PracticeSessionView) =>
  AI_TYPES.includes(item.type) || (item.type === 'cloze' && session.cloze_source === 'ai');

function reportSubtitle(item: Item, kind: string): string {
  const prompt = item.prompt;
  return 'meaning' in prompt ? `${kind} · ${prompt.meaning}` : kind;
}

/** The question on screen, its answer controls, hints and the result. */
function Question({ state, item, onReport }: { state: PracticeSessionState; item: Item; onReport: () => void }) {
  const t = useTranslations('App.practice.session');
  const errorText = useErrorMessage();
  const phase = state.phase?.kind === 'question' ? state.phase : null;
  const outcome = phase?.outcome ?? null;
  const final = outcome?.kind === 'final' ? outcome : null;
  const prompt = item.prompt;
  const levels = hintLevels(item);
  const nextHint = levels.find((n) => n > item.hint_level);
  const typed = prompt.kind === 'type_meaning' || prompt.kind === 'type_sentence' || prompt.kind === 'cloze';

  let question: ReactNode;
  if (prompt.kind === 'mcq') {
    question = (
      <>
        <PromptTitle text={prompt.meaning} label={prompt.context_label} />
        <Choices options={prompt.options} rightIndex={final?.result.correct.choice_index ?? null} chosenIndex={chosenChoice(outcome)} onChoose={(choice) => void state.answer({ choice })} disabled={state.busy} />
      </>
    );
  } else if (prompt.kind === 'true_false') {
    question = (
      <>
        <PromptTitle text={prompt.lemma} sub={prompt.meaning} label={prompt.context_label} />
        <TrueFalseChoices outcome={outcome} onAnswer={(is_true) => void state.answer({ is_true })} disabled={state.busy} />
      </>
    );
  } else if (prompt.kind === 'type_meaning') {
    question = <PromptTitle text={prompt.meaning} label={prompt.context_label} />;
  } else if ('sentence' in prompt) {
    question = <p className="break-words text-title font-semibold text-ink">{prompt.sentence}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <QuestionCard prompt={prompt} reportable={item.reportable} reported={state.reported.has(item.item_id)} onReport={onReport}>
        {question}
        <HintPanel item={item} onOpen={state.setHintLevel} locked={final !== null} />
      </QuestionCard>
      {typed && <TypeWordInput key={item.item_id} outcome={outcome} onSubmit={(text) => void state.answer({ text })} disabled={state.busy} />}
      {state.error !== null && (
        <p role="alert" className="text-ui text-danger">
          {state.error instanceof NetworkError ? t('failed') : errorText(state.error)}
        </p>
      )}
      {final ? (
        <AnswerFeedback result={final.result} onReview={(action) => void state.review(action)} onNext={() => void state.next()} busy={state.busy} />
      ) : outcome?.kind === 'try_again' ? (
        <>
          <div role="status" className="flex flex-col gap-0.5 rounded-inner bg-danger-soft p-4">
            <p className="text-title font-bold text-danger">{t('wrong')}</p>
            <p className="text-ui font-semibold text-ink">{t('tryAgainBody')}</p>
          </div>
          <TryAgainActions
            onRetry={focusAnswer}
            onHint={() => nextHint && state.setHintLevel(nextHint)}
            hintAvailable={nextHint !== undefined}
            onReveal={() => void state.skip()}
            busy={state.busy}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {item.hint_level === 0 && nextHint !== undefined ? (
            <Button variant="quiet" onPress={() => state.setHintLevel(nextHint)}>
              {t('hint.button')}
              <kbd className={`${KBD} border-border-strong`}>H</kbd>
            </Button>
          ) : (
            <span />
          )}
          {item.hint_level > 0 && <p className="text-caption text-muted">{t('noteHint')}</p>}
          {!typed && <p className="text-caption text-muted md:hidden">{t('phoneHint')}</p>}
        </div>
      )}
    </div>
  );
}

/** Segments of the session (K/60): green right, red wrong, blue the current one; earlier ones of a reload look "done". */
function Progress({ results, position, total, done, label }: { results: Record<number, 'correct' | 'wrong'>; position: number; total: number; done: boolean; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done ? total : Math.max(0, position - 1)} className="hidden w-48 gap-1 sm:flex">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const result = results[n];
        return (
          <span
            key={n}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              result === 'correct' ? 'bg-success' : result === 'wrong' ? 'bg-danger' : n === position && !done ? 'bg-primary' : n < position || done ? 'bg-muted' : 'bg-neutral-soft',
            )}
          />
        );
      })}
    </div>
  );
}

function Ended({ message, href }: { message: string; href: string }) {
  const t = useTranslations('App.practice.session');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
      <p className="text-title font-bold text-ink">{message}</p>
      <Link href={href} className="font-semibold text-primary underline underline-offset-2">
        {t('back')}
      </Link>
    </div>
  );
}
