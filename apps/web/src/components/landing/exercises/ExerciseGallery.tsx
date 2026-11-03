'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { AppCopy, LandingCopy } from '../copy';
import { fill } from '../fill';
import { checkTyped } from './check';
import { EXERCISES, type Exercise } from './exercise-set';

type Phase = 'idle' | 'wrong' | 'right' | 'revealed' | 'picked';
type State = { phase: Phase; chosen: number | null; text: string; tries: number; hint: boolean };
const FRESH: State = { phase: 'idle', chosen: null, text: '', tries: 0, hint: false };

const KBD = 'hidden rounded-sm border border-current px-1.5 text-caption font-semibold opacity-70 md:inline';
const lang = (word: string) => (/^[a-z]+$/.test(word) ? 'en' : undefined);

function Blank({ label, filled }: { label: string; filled?: string }) {
  return filled ? (
    <strong className="font-extrabold">{filled}</strong>
  ) : (
    <span role="img" aria-label={label} className="mx-1 inline-block min-w-24 border-b-3 border-ink align-baseline">
      {' '}
    </span>
  );
}

// "Nhiều dạng bài luyện tập": the list of the seven kinds, and one live question card built like the practice session's
// (features/learner/practice/session: QuestionCard, Choices, TypeWordInput). No API call; everything comes from the messages.
export function ExerciseGallery({ copy, kinds }: { copy: LandingCopy['exercises']; kinds: AppCopy['kinds'] }) {
  const [current, setCurrent] = useState(0);
  const [state, setState] = useState<State>(FRESH);
  const [message, setMessage] = useState('');
  const fieldId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pickerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const ex = EXERCISES[current];
  const items = copy.items;
  const answered = state.phase === 'picked' || state.phase === 'right' || state.phase === 'revealed';

  const options = (e: Exercise): string[] => {
    if (e.id === 'tf') return [items.tf.true, items.tf.false];
    if (e.id === 'mcq') return [items.mcq.o1, items.mcq.o2, items.mcq.o3, items.mcq.o4];
    if (e.id === 'aiMeaning') return [items.aiMeaning.o1, items.aiMeaning.o2, items.aiMeaning.o3, items.aiMeaning.o4];
    if (e.id === 'aiMcq') return [items.aiMcq.o1, items.aiMcq.o2, items.aiMcq.o3, items.aiMcq.o4];
    return [];
  };
  const hints: Record<string, string> = { typeMeaning: items.typeMeaning.hint, savedCloze: items.savedCloze.hint, aiCloze: items.aiCloze.hint };

  const show = (index: number) => {
    flushSync(() => {
      setCurrent(index);
      setState(FRESH);
      setMessage('');
    });
  };
  const choose = (index: number) => {
    if (ex.mode !== 'choice' || answered) return;
    flushSync(() => setState({ ...state, phase: 'picked', chosen: index }));
    setMessage(index === ex.right ? copy.right : copy.wrong);
    nextRef.current?.focus();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (answered || ex.mode !== 'typed' || !state.text.trim()) return;
    if (checkTyped(ex.answer, state.text)) {
      flushSync(() => setState({ ...state, phase: 'right' }));
      setMessage(copy.right);
      nextRef.current?.focus();
    } else {
      const tries = state.tries + 1;
      flushSync(() => setState({ ...state, phase: 'wrong', tries }));
      // The same text twice would change nothing in the live region, so the try number goes in: every wrong try is heard.
      setMessage(`${copy.wrong}, ${fill(copy.attempt, { n: tries })}`);
      fieldRef.current?.focus();
      fieldRef.current?.select();
    }
  };
  const reveal = () => {
    flushSync(() => setState({ ...state, phase: 'revealed' }));
    nextRef.current?.focus();
  };
  const again = () => {
    show(current);
    if (ex.mode === 'typed') fieldRef.current?.focus();
    else stageRef.current?.querySelector<HTMLButtonElement>('button[data-option]')?.focus();
  };
  const next = () => {
    const index = (current + 1) % EXERCISES.length;
    show(index);
    pickerRefs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    const n = Number(event.key);
    if (ex.mode === 'choice' && n >= 1 && n <= options(ex).length) choose(n - 1);
    if (ex.mode === 'typed' && state.phase === 'wrong' && !state.hint && event.key.toLowerCase() === 'h') setState({ ...state, hint: true });
  };

  const sentence = (before: string, after: string, filled?: string) => (
    <p className="text-title font-semibold break-words text-ink" lang="en">
      {before} <Blank label={copy.blank} filled={filled} /> {after}
    </p>
  );
  const typedFill = state.phase === 'right' ? state.text.trim() : state.phase === 'revealed' && ex.mode === 'typed' ? ex.answer : undefined;
  const choiceFill = state.phase === 'picked' && ex.mode === 'choice' ? options(ex)[ex.right] : undefined;

  let prompt: ReactNode;
  switch (ex.id) {
    case 'mcq':
      prompt = (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-h2 font-extrabold break-words text-ink">{items.mcq.title}</p>
          <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-semibold text-ink">{items.mcq.label}</span>
        </div>
      );
      break;
    case 'tf':
      prompt = (
        <div className="flex flex-col gap-1">
          <p className="text-h2 font-extrabold break-words text-ink" lang="en">
            {items.tf.title}
          </p>
          <p className="text-title font-semibold text-muted">{items.tf.sub}</p>
        </div>
      );
      break;
    case 'typeMeaning':
      prompt = <p className="text-h2 font-extrabold break-words text-ink">{items.typeMeaning.title}</p>;
      break;
    case 'savedCloze':
      prompt = (
        <>
          <span className="w-fit rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-ink">{items.savedCloze.source}</span>
          {sentence(items.savedCloze.before, items.savedCloze.after, typedFill)}
        </>
      );
      break;
    case 'aiCloze':
      prompt = sentence(items.aiCloze.before, items.aiCloze.after, typedFill);
      break;
    case 'aiMeaning': {
      const at = items.aiMeaning.sentence.indexOf(items.aiMeaning.bold);
      prompt = (
        <p className="text-title font-semibold break-words text-ink" lang="en">
          {items.aiMeaning.sentence.slice(0, at)}
          <strong className="font-extrabold">{items.aiMeaning.bold}</strong>
          {items.aiMeaning.sentence.slice(at + items.aiMeaning.bold.length)}
        </p>
      );
      break;
    }
    case 'aiMcq':
      prompt = sentence(items.aiMcq.before, items.aiMcq.after, choiceFill);
      break;
  }

  const fieldState = state.phase === 'right' ? 'right' : state.phase === 'revealed' ? 'revealed' : state.phase === 'wrong' ? 'wrong' : 'idle';
  const shown = state.phase === 'revealed' && ex.mode === 'typed' ? ex.answer : state.text;

  return (
    <div className="grid gap-8 lg:grid-cols-4 lg:gap-10">
      <ul aria-label={copy.list} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:col-span-1 lg:flex-col lg:overflow-visible">
        {EXERCISES.map((item, index) => (
          <li key={item.id} className="shrink-0 lg:shrink">
            <button
              type="button"
              ref={(node) => {
                pickerRefs.current[index] = node;
              }}
              aria-pressed={index === current}
              onClick={() => show(index)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-3 rounded-inner px-3.5 py-3 text-left text-label font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary',
                index === current ? 'bg-surface ring-2 ring-ink' : 'hover:bg-canvas',
              )}
            >
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {kinds[item.kind]}
                {item.ai && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">{copy.aiChip}</span>}
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold', item.plan === 'pro' ? 'bg-primary-soft text-primary' : 'bg-success-soft text-success')}>
                {item.plan === 'pro' ? copy.pro : copy.free}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div ref={stageRef} onKeyDown={onKeyDown} className="min-w-0 lg:col-span-3">
        <section aria-label={kinds[ex.kind]} className="flex flex-col gap-5 rounded-feature border-2 border-border-strong bg-surface p-5 shadow-ledge motion-safe:animate-card-in md:p-6" key={ex.id}>
          <div className="flex flex-wrap items-center gap-2">
            {ex.ai && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary">{copy.aiChip}</span>}
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{kinds[ex.kind]}</span>
          </div>
          {prompt}

          {ex.mode === 'choice' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {options(ex).map((option, index) => {
                const right = answered && index === ex.right;
                const chosen = state.phase === 'picked' && index === state.chosen;
                const st = right ? 'right' : chosen ? 'wrong' : 'idle';
                return (
                  <button
                    key={option}
                    type="button"
                    data-option
                    data-state={st}
                    disabled={answered}
                    onClick={() => choose(index)}
                    className={cn(
                      'flex min-h-control-touch min-w-0 cursor-pointer items-center gap-3 rounded-inner border-2 px-3 py-2 text-left text-body font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default',
                      st === 'right' && 'border-success bg-success-soft',
                      st === 'wrong' && 'border-danger bg-danger-soft motion-safe:animate-wiggle-soft',
                      st === 'idle' && 'border-border-strong bg-surface enabled:hover:bg-primary-soft',
                    )}
                  >
                    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border-strong text-caption">
                      {index + 1}
                    </span>
                    <span lang={lang(option)} className="min-w-0 flex-1 break-words">
                      {option}
                    </span>
                    {st === 'right' && (
                      <span className="text-success">
                        <CircleCheck aria-hidden className="size-5" />
                        <span className="sr-only">{copy.right}</span>
                      </span>
                    )}
                    {st === 'wrong' && (
                      <span className="text-danger">
                        <CircleX aria-hidden className="size-5" />
                        <span className="sr-only">{copy.wrong}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
              <div className="relative min-w-0 flex-1">
                <label htmlFor={fieldId} className="sr-only">
                  {copy.answerLabel}
                </label>
                <input
                  ref={fieldRef}
                  id={fieldId}
                  lang="en"
                  value={shown}
                  readOnly={answered}
                  data-state={fieldState}
                  aria-invalid={state.phase === 'wrong' ? true : undefined}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={100}
                  placeholder={copy.placeholder}
                  onChange={(event) => setState({ ...state, text: event.target.value })}
                  className={cn(
                    'min-h-control-touch w-full rounded-inner border-2 px-3 pr-16 text-body font-semibold text-ink outline-none placeholder:font-normal placeholder:text-placeholder focus-visible:border-primary',
                    fieldState === 'right' && 'border-success bg-success-soft text-success',
                    (fieldState === 'wrong' || fieldState === 'revealed') && 'border-danger bg-danger-soft',
                    fieldState === 'idle' && 'border-border-strong bg-surface',
                  )}
                />
                {state.phase === 'wrong' && (
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-caption font-semibold text-danger">{fill(copy.attempt, { n: state.tries })}</span>
                )}
              </div>
              {!answered && (
                <Button type="submit" variant={state.phase === 'wrong' ? 'quiet' : 'sticker'} disabled={!state.text.trim()} className="min-h-control-touch px-8">
                  {copy.check}
                </Button>
              )}
            </form>
          )}

          {state.phase === 'wrong' && (
            <>
              {state.hint && <p className="text-small text-muted">{hints[ex.id]}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="quiet" disabled={state.hint} onClick={() => setState({ ...state, hint: true })} className="min-h-control-touch justify-between">
                  {copy.hintLabel}
                  <kbd aria-hidden className={KBD}>
                    H
                  </kbd>
                </Button>
                <Button variant="quiet" onClick={reveal} className="min-h-control-touch">
                  {copy.reveal}
                </Button>
              </div>
            </>
          )}
          {answered && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="quiet" onClick={again} className="min-h-control-touch">
                {copy.again}
              </Button>
              <Button variant="sticker" ref={nextRef} onClick={next} className="min-h-control-touch justify-between">
                {copy.next}
                <kbd aria-hidden className={KBD}>
                  Enter
                </kbd>
              </Button>
            </div>
          )}
        </section>
        <p aria-live="polite" className="sr-only">
          {message}
        </p>
      </div>
    </div>
  );
}
