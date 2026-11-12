'use client';

import { CalendarBarButton } from '@/app-chrome/CalendarBarButton';
import { Check, Layers2, LoaderCircle, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NetworkError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { ErrorState } from '@/ui/States';
import { Button } from '@/ui/Button';
import { KeyLegend } from '@/ui/KeyLegend';
import { ProgressBar } from '@/ui/ProgressBar';
import { Tag } from '@/ui/Tag';
import { TextButton } from '@/ui/TextButton';
import { useGroups } from '../../groups/groups-api';
import { CompareLine } from '../../recall/CompareLine';
import { RecallSummary } from '../../recall/RecallSummary';
import { useSourceLabel } from '../CurrentSessionCard';
import { AiUnavailableState } from './AiUnavailableState';
import { AlternativeFeedback } from './AlternativeFeedback';
import { AnswerFeedback, feedbackCase } from './AnswerFeedback';
import { HintPanel, hintLevels } from './HintPanel';
import { Choices, chosenChoice } from './McqQuestion';
import { PreparingState } from './PreparingState';
import { ButtonKey, PromptTitle, QuestionCard, promptKind } from './QuestionCard';
import { ReportDialog } from './ReportDialog';
import { RoundPrompt } from './RoundPrompt';
import { SentenceText, type BlankFill } from './SentenceQuestions';
import { SessionNotice } from './SessionNotice';
import { SessionSummary } from './SessionSummary';
import { TrueFalseChoices } from './TrueFalseQuestion';
import { focusAnswer, TryAgainPanel, TypeWordInput } from './TypeWordQuestion';
import { usePracticeSession, type Item, type Outcome, type PracticeSessionState } from './use-practice-session';

/**
 * K/60–K/67 `/app/practice/session`: the open practice session, full screen. Đợt C §4.4: with `recall`, the Ôn session of that deck
 * (`/app/recall`): no Đã biết (the answer moved the word already), its own summary, and every way out leads back to the deck.
 */
export function PracticeSession({ recall }: { recall?: { groupId: string } } = {}) {
  const t = useTranslations('App.practice.session');
  const tr = useTranslations('App.recall');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const errorText = useErrorMessage();
  const state = usePracticeSession(recall);
  const { phase, session } = state;
  const groups = useGroups();
  const label = useSourceLabel();
  const [reporting, setReporting] = useState(false);
  const deckName = recall ? groups.data?.items.find((g) => g.id === recall.groupId)?.name : undefined;
  const sourceLabel = session && !recall ? label({ session, item: null, preparing: false }, groups.data?.items ?? []) : '';
  const headerText = recall ? (deckName ? tr('header', { group: deckName }) : tr('headerNoName')) : t('header', { source: sourceLabel });
  const practiceHref = recall ? `/${locale}/app/group?id=${recall.groupId}` : `/${locale}/app/practice`;
  const backLabel = recall ? tr('back') : undefined;

  // Keys (K/51): 1–4 choose; on results Enter follows the bold button, 1 reviews, 2 knows in case 1; H hint, Esc stop.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || reporting) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      // A graded typed answer keeps its read-only field focused; Enter there follows the result's primary action.
      const field = target?.closest('input, textarea') as HTMLInputElement | null;
      const typing = Boolean(field && !field.readOnly);
      if (e.key === 'Escape' && (typing || e.isComposing)) {
        // Esc in the answer field (or closing an IME list) leaves the field; a second Esc ends the session.
        if (!e.isComposing) field?.blur();
        return;
      }
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
        // An alternative answer has two rows, each with its own buttons: no shortcut acts on a word the learner did not choose (§3.2).
        if (outcome.result.alternative) return;
        if (e.repeat && (e.key === 'Enter' || e.key === '1' || e.key === '2')) return;
        const kind = feedbackCase(outcome.result);
        if (e.key === '1' && kind !== null) void state.review('needs_review');
        else if (e.key === '2' && kind === 1) void state.review('known');
        else if (e.key === 'Enter') {
          if (kind === 1) void state.review('known');
          else if (kind === 4) void state.review('needs_review');
          else void state.next();
        }
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
  else if (phase === null || phase.kind === 'advancing' || !session && phase.kind !== 'none' && phase.kind !== 'nothing_learned')
    body = state.error ? <Ended message={errorText(state.error)} href={practiceHref} label={backLabel} /> : <Loading />;
  else if (phase.kind === 'none') body = <Ended message={t('none')} href={practiceHref} label={backLabel} />;
  else if (phase.kind === 'nothing_learned') body = recall ? <NothingLearned groupId={recall.groupId} /> : <Ended message={t('none')} href={practiceHref} />;
  else if (phase.kind === 'closed') body = <Ended message={t('closed')} href={practiceHref} label={backLabel} />;
  else if (phase.kind === 'round') body = <RoundPrompt session={session!} onContinue={(go) => void state.continueRound(go)} busy={state.busy} />;
  else if (phase.kind === 'summary') body = recall ? <RecallSummary session={session!} /> : <SessionSummary session={session!} sourceLabel={sourceLabel} />;
  else if (phase.kind === 'preparing') body = <PreparingState />;
  else if (phase.kind === 'ai_stopped')
    body = (
      <AiUnavailableState
        reason={phase.reason}
        resetsAt={phase.resetsAt}
        lemma={phase.lemma}
        error={state.error ? errorText(state.error) : null}
        busy={state.busy}
        onRetry={() => void state.retryAi()}
        onLater={() => hardReplace(practiceHref)}
      />
    );
  else
    body = (
      <>
        {phase.notice && <SessionNotice notice={phase.notice} answered={phase.outcome?.kind === 'final'} onDismiss={state.dismissNotice} />}
        <Question state={state} item={phase.item} recall={recall !== undefined} onReport={() => setReporting(true)} />
      </>
    );

  const done = phase?.kind === 'summary';
  const total = session?.target_count ?? 0;
  const position = done ? total : (session?.asked ?? 0);
  const progressText = done ? t('progressDone', { total }) : t('progress', { n: position, total });
  const stoppable = phase?.kind === 'question' || phase?.kind === 'round';
  // Figma: the session column is 760 wide, the summary 880 (119:4608).
  const width = done ? 'max-w-220' : 'max-w-190';
  const legend = phase?.kind === 'question' ? legendItems(phase.item, phase.outcome) : [];
  const closeClass =
    'flex size-11 shrink-0 items-center justify-center rounded-wm-control border border-wm-line bg-wm-surface text-wm-ink outline-none ' +
    'hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent md:size-9';
  return (
    <div className="flex flex-1 flex-col">
      {/* Figma "Thanh phiên" (100:3164): close, the source, one progress bar, "câu n / N", the ✓ and ✗ counts. */}
      <header className={`mx-auto flex w-full ${width} items-center gap-3 px-4 pt-4 md:px-0 md:pt-10`}>
        {stoppable ? (
          <button type="button" aria-label={t('close')} onClick={() => void state.stop()} className={closeClass}>
            <X aria-hidden className="size-4.5" />
          </button>
        ) : (
          <Link href={practiceHref} aria-label={tc('close')} className={closeClass}>
            <X aria-hidden className="size-4.5" />
          </Link>
        )}
        {session && <span className="hidden max-w-64 truncate font-wm-sans text-wm-small-strong text-wm-ink md:block">{headerText}</span>}
        {session && total > 0 && (
          <>
            <ProgressBar value={position} max={total} label={progressText} className="min-w-12 flex-1" />
            <span className="shrink-0 text-wm-meta text-wm-muted">{progressText}</span>
            <span role="img" aria-label={t('countRight', { count: state.counts.correct })}>
              <Tag tone="pass">
                <Check aria-hidden className="size-3" />
                {state.counts.correct}
              </Tag>
            </span>
            <span role="img" aria-label={t('countWrong', { count: state.counts.wrong })}>
              <Tag tone="fail">
                <X aria-hidden className="size-3" />
                {state.counts.wrong}
              </Tag>
            </span>
          </>
        )}
        <CalendarBarButton />
      </header>
      <div className={`mx-auto flex w-full ${width} flex-1 flex-col gap-5 px-4 py-6 md:px-0 md:pb-10`}>
        {body}
        {legend.length > 0 && (
          <KeyLegend aria-label={t('legend.label')} items={legend.map(([keys, key]) => ({ keys, label: t(`legend.${key}`) }))} className="mt-auto pt-4" />
        )}
      </div>
      {phase?.kind === 'question' && session && (
        <ReportDialog
          key={phase.item.item_id}
          itemId={phase.item.item_id}
          kind={phase.item.ai === true ? 'ai' : 'non_ai'}
          privateWord={phase.item.private_word === true}
          lemma={phase.outcome?.kind === 'final' ? phase.outcome.result.correct.lemma : null}
          subtitle={reportSubtitle(phase.item, t(`kind.${promptKind(phase.item.prompt)}`))}
          isOpen={reporting}
          onClose={() => setReporting(false)}
          onSent={() => state.markReported(phase.item.item_id)}
        />
      )}
    </div>
  );
}

type LegendKey = 'choose' | 'check' | 'hint' | 'stop' | 'know' | 'review' | 'next' | 'retry';

/** The keys of what is on screen (Figma "Phím" under each session frame): the same keys the handler above acts on. */
function legendItems(item: Item, outcome: Outcome | null): Array<[string[], LegendKey]> {
  const stop: [string[], LegendKey] = [['Esc'], 'stop'];
  const hint: Array<[string[], LegendKey]> = hintLevels(item).some((n) => n > item.hint_level) ? [[['H'], 'hint']] : [];
  if (outcome?.kind === 'final') {
    if (outcome.result.alternative) return [stop];
    const kind = feedbackCase(outcome.result);
    if (kind === 1) return [[['Enter'], 'know'], [['1'], 'review'], stop];
    if (kind === 4) return [[['Enter'], 'review'], stop];
    if (kind === null) return [[['Enter'], 'next'], stop];
    return [[['Enter'], 'next'], [['1'], 'review'], stop];
  }
  if (outcome?.kind === 'try_again') return [[['Enter'], 'retry'], ...hint, stop];
  const prompt = item.prompt;
  const choices = prompt.kind === 'true_false' ? 2 : 'options' in prompt ? prompt.options.length : 0;
  return [choices > 0 ? [[`1–${choices}`], 'choose'] : [['Enter'], 'check'], ...hint, stop];
}

function reportSubtitle(item: Item, kind: string): string {
  const prompt = item.prompt;
  return 'meaning' in prompt ? `${kind} · ${prompt.meaning}` : kind;
}

/** What fills a sentence's blank once answered: the right word, and a wrong typed one (struck once the answer is shown). */
function blankFill(item: Item, outcome: Outcome | null): BlankFill | null {
  if (outcome?.kind === 'try_again') return outcome.typed ? { wrong: outcome.typed } : null;
  if (outcome?.kind !== 'final' || outcome.result.alternative) return null;
  const { result, chosen } = outcome;
  const prompt = item.prompt;
  const right = prompt.kind === 'mcq_sentence' && result.correct.choice_index !== null ? prompt.options[result.correct.choice_index] : result.correct.text;
  const typed = chosen && 'text' in chosen && result.result === 'wrong' ? chosen.text : undefined;
  return { right, wrong: typed };
}

/** The question on screen, its answer controls, hints and the result. */
function Question({ state, item, recall, onReport }: { state: PracticeSessionState; item: Item; recall: boolean; onReport: () => void }) {
  const t = useTranslations('App.practice.session');
  const errorText = useErrorMessage();
  const phase = state.phase?.kind === 'question' ? state.phase : null;
  const outcome = phase?.outcome ?? null;
  const final = outcome?.kind === 'final' ? outcome : null;
  const prompt = item.prompt;
  const levels = hintLevels(item);
  const nextHint = levels.find((n) => n > item.hint_level);
  const typed = prompt.kind === 'type_meaning' || prompt.kind === 'type_sentence' || prompt.kind === 'cloze';
  const fill = blankFill(item, outcome);
  const choices = (options: string[]) => (
    <Choices
      options={options}
      rightIndex={final?.result.correct.choice_index ?? null}
      chosenIndex={chosenChoice(outcome)}
      onChoose={(choice) => void state.answer({ choice })}
      disabled={state.busy}
    />
  );

  let question: ReactNode;
  if (prompt.kind === 'mcq') {
    question = (
      <>
        <PromptTitle text={prompt.meaning} label={prompt.context_label} />
        {choices(prompt.options)}
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
  } else if (prompt.kind === 'meaning_in_sentence') {
    question = (
      <>
        <SentenceText sentence={prompt.sentence} highlight={prompt.highlight} />
        {choices(prompt.options)}
      </>
    );
  } else if (prompt.kind === 'mcq_sentence') {
    question = (
      <>
        <SentenceText sentence={prompt.sentence} fill={fill} />
        {choices(prompt.options)}
      </>
    );
  } else {
    // type_sentence, cloze (K/78a): the sentence with its blank, filled once answered (Figma 178:5326, 178:5546).
    question = <SentenceText sentence={prompt.sentence} fill={fill} />;
  }

  // One live region from the start of the question, so screen readers hear the result (audit 26/10/2026 #8).
  const announce = final
    ? `${final.result.alternative ? t('alternativeLabel') : final.result.result === 'correct' ? t('right') : t('wrong')}. ${t('revealLine', { lemma: final.result.correct.lemma, meaning: final.result.meaning })}`
    : outcome?.kind === 'try_again' ? t('wrong') : '';

  return (
    <div className="flex flex-col">
      <p data-live="result" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>
      {/* Keyed per item so each question mounts again and rises in (2A); not the bare id, which the answer field below uses.
          Ôn never shows the AI label or Báo lỗi (app-redesign-plan 512). */}
      <QuestionCard
        key={`card-${item.item_id}`}
        prompt={prompt}
        ai={!recall && item.ai === true}
        reportable={!recall && item.reportable}
        reported={state.reported.has(item.item_id)}
        onReport={onReport}
      >
        {question}
        {typed && <TypeWordInput key={item.item_id} outcome={outcome} onSubmit={(text) => void state.answer({ text })} disabled={state.busy} />}
        <HintPanel item={item} onOpen={state.setHintLevel} locked={final !== null} />
      </QuestionCard>
      {final?.result.alternative ? (
        <AlternativeFeedback
          result={final.result}
          sentence={prompt.kind === 'cloze' ? prompt.sentence : ''}
          onReviewWord={(senseId, action) => void state.reviewWord(senseId, action)}
          onNext={() => void state.next()}
          busy={state.busy}
        />
      ) : final ? (
        <>
          <AnswerFeedback result={final.result} onReview={(action) => void state.review(action)} onNext={() => void state.next()} busy={state.busy} focusPrimary={!typed} />
          {/* M5.9, Figma 209:5902: in Ôn a wrong typed word is set against the answer, letter by letter, once the answer is shown. */}
          {recall && final.result.result === 'wrong' && final.chosen && 'text' in final.chosen && (
            <div className="mt-4 motion-safe:animate-wm-feedback-in">
              <CompareLine typed={final.chosen.text} answer={final.result.correct.text} />
            </div>
          )}
        </>
      ) : outcome?.kind === 'try_again' ? (
        <TryAgainPanel
          sessionWord={outcome.reason === 'session_word'}
          onRetry={focusAnswer}
          onHint={() => nextHint && state.setHintLevel(nextHint)}
          hintAvailable={nextHint !== undefined}
          onReveal={() => void state.skip()}
          busy={state.busy}
        />
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {item.hint_level === 0 && nextHint !== undefined ? (
            <Button variant="secondary" onPress={() => state.setHintLevel(nextHint)}>
              {t('hint.button')}
              <ButtonKey>H</ButtonKey>
            </Button>
          ) : (
            <span />
          )}
          {item.hint_level > 0 && <p className="font-wm-sans text-wm-caption text-wm-muted">{t('noteHint')}</p>}
          {prompt.kind === 'cloze' && (
            // K/78a: an AI cloze can be given up before any try (copy doc §17.1 "[Xem đáp án]").
            <TextButton tone="muted" isDisabled={state.busy} onPress={() => void state.skip()}>
              {t('reveal')}
            </TextButton>
          )}
          {!typed && <p className="font-wm-sans text-wm-caption text-wm-muted md:hidden">{t('phoneHint')}</p>}
        </div>
      )}
      {state.error !== null && (
        <p role="alert" className="mt-3 font-wm-sans text-wm-small text-wm-fail">
          {state.error instanceof NetworkError ? t('failed') : errorText(state.error)}
        </p>
      )}
    </div>
  );
}

function Loading() {
  const t = useTranslations('App.common');
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-wm-muted">
      <LoaderCircle aria-hidden className="size-8 motion-safe:animate-spin" />
      <span className="font-wm-sans text-wm-small">{t('loading')}</span>
    </div>
  );
}

function Ended({ message, href, label }: { message: string; href: string; label?: string }) {
  const t = useTranslations('App.practice.session');
  return (
    <div className="flex flex-col items-start gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-card">
      <p className="font-wm-display text-wm-word text-wm-ink">{message}</p>
      <Link
        href={href}
        className="font-wm-sans text-wm-small-strong text-wm-accent outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
      >
        {label ?? t('back')}
      </Link>
    </div>
  );
}

/** Đợt C: Ôn needs learned words; the deck has only new ones, so Học comes first. */
function NothingLearned({ groupId }: { groupId: string }) {
  const t = useTranslations('App.recall');
  const tDeck = useTranslations('App.deck');
  const locale = useLocale();
  return (
    <div className="flex flex-col items-start gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-6 shadow-wm-card">
      <p className="font-wm-display text-wm-word text-wm-ink">{t('nothingTitle')}</p>
      <p className="font-wm-sans text-wm-base text-wm-muted">{t('nothingBody')}</p>
      <Link
        href={`/${locale}/app/review?group=${groupId}&mode=new`}
        className="inline-flex min-h-11 items-center gap-2 rounded-wm-control bg-wm-accent px-5 font-wm-sans text-wm-button text-wm-on-accent shadow-wm-btn outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
      >
        <Layers2 aria-hidden className="size-5 shrink-0" />
        {tDeck('learn')}
      </Link>
    </div>
  );
}
