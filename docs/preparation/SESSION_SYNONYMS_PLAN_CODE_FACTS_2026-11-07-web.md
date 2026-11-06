# Session synonyms: web code facts for the plan (07/11/2026)

Read-only survey of the worktree `.claude/worktrees/cloze-session-synonyms` (branch `docs/cloze-session-synonyms`, HEAD `01f62a0d`),
for the plan of `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` §3.1–§3.3, §8. Paths are under `apps/web/src/`
unless stated otherwise. Line numbers are from this HEAD. No code was changed and no test was run (see §8: this worktree has no
`node_modules`).

## 1. `features/learner/practice/session/PracticeSession.tsx` (338 lines)

### 1.1 Keyboard handler, verbatim (lines 47–112)

```tsx
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
```

Facts the plan hooks into:
- The result branch is lines 82–93 (`if (outcome?.kind === 'final') { … return; }`). `kind` there is `feedbackCase(outcome.result)` (line 84).
  Enter/`1`/`2` on a result are decided only from `feedbackCase`; nothing in the handler knows about an alternative answer today.
- Line 71: Enter or Space whose target is inside a `button` or `a` returns before any result logic, so a Tab-focused button keeps its
  native activation. This already gives the design's "a button reached with Tab and pressed with Enter or Space still works" (§3.2).
- Lines 55–56, 70: an editable field (`input`/`textarea` not `readOnly`) swallows every key except Esc. After a final result the
  typed-answer field is `readOnly` (`TypeWordInput`, `TypeWordQuestion.tsx:37`), so Enter/`1`/`2` typed while it keeps focus reach the
  result branch.
- Line 83: held keys (`e.repeat`) are ignored on a result.
- Lines 99–102: on a try-again, Enter focuses the answer field (`focusAnswer`).

### 1.2 How `final`, `outcome`, `typed`, `kind` are derived

- In the key handler: `const { item, outcome } = phase;` (line 81); `const kind = feedbackCase(outcome.result);` (line 84).
- In `Question` (lines 199–208), verbatim:

```tsx
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
```

- `typed` covers Bước 4 `type_word` (`type_meaning` / `type_sentence` prompts) and every `cloze` (AI and own-sentence). It is passed
  as `focusPrimary={!typed}` to `AnswerFeedback` (line 268) and gates `<TypeWordInput>` (line 261).
- Other readers of `outcome.result`: `ReportDialog lemma={phase.outcome?.kind === 'final' ? phase.outcome.result.correct.lemma : null}`
  (line 179); `<Choices rightIndex={final?.result.correct.choice_index ?? null} …>` (lines 215, 231, 238); `HintPanel locked={final !== null}` (line 259).

### 1.3 Live-region `announce` (lines 246–255), verbatim

```tsx
  // One live region from the start of the question, so screen readers hear the result (audit 26/10/2026 #8).
  const announce = final
    ? `${final.result.result === 'correct' ? t('right') : t('wrong')}. ${t('revealLine', { lemma: final.result.correct.lemma, meaning: final.result.meaning })}`
    : outcome?.kind === 'try_again' ? t('wrong') : '';

  return (
    <div className="flex flex-col gap-4">
      <p data-live="result" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>
```

A try-again announces only `t('wrong')` ("Chưa đúng" / "Not quite"), not the body text.

### 1.4 Result / try-again block (lines 267–282), verbatim

```tsx
      {final ? (
        <AnswerFeedback result={final.result} onReview={(action) => void state.review(action)} onNext={() => void state.next()} busy={state.busy} focusPrimary={!typed} />
      ) : outcome?.kind === 'try_again' ? (
        <>
          <div data-feedback className="flex flex-col gap-0.5 rounded-inner bg-danger-soft p-4 motion-safe:animate-feedback-in">
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
```

- Line 273 is the single place the try-again body text is chosen; it is always `t('tryAgainBody')` (the spelling text). The
  `try_again` outcome carries only `tries` (no reason), see §3.1.
- `TryAgainActions` (`TypeWordQuestion.tsx:61–89`): [Làm lại / Try again] (`retry`, kbd `Enter`), [Gợi ý / Hint] when a level is
  left (kbd `H`), [Xem đáp án / Show answer] (`reveal`), then the note `t('tryAgainNote')`.
- `TypeWordInput` (`TypeWordQuestion.tsx:11–58`) styles the field red and shows `t('attempt', { n: outcome.tries })` ("Lần N") only when
  `outcome?.kind === 'try_again'` (lines 17, 46, 49).

## 2. `features/learner/practice/session/AnswerFeedback.tsx` (93 lines)

### 2.1 `feedbackCase()` (lines 11–15), verbatim

```tsx
export function feedbackCase(result: AnswerResult): 1 | 2 | 3 | 4 | null {
  if (result.result === 'wrong') return result.highlight_needs_review ? 4 : null;
  if (result.show_known) return 1;
  return result.hint_level === 0 ? 2 : 3;
}
```

Also exported and used by the key handler (`PracticeSession.tsx:17, 84`).

### 2.2 Props type (lines 23–30), verbatim

```tsx
export function AnswerFeedback({ result, onReview, onNext, busy, focusPrimary = false }: {
  result: AnswerResult;
  onReview: (action: 'needs_review' | 'known') => void;
  onNext: () => void;
  busy: boolean;
  /** A chosen answer disables the option that held focus; the primary action takes it (audit 26/10/2026 #8). A typed answer keeps its field focused. */
  focusPrimary?: boolean;
}) {
```

`onReview` takes only the action; there is no word / `sense_id` parameter.

### 2.3 Body (lines 31–92)

- Namespace `useTranslations('App.practice.session')` (line 31); `useLocale()` (line 32).
- `right = result.result === 'correct'` (33), `kind = feedbackCase(result)` (34), icon `CircleCheck`/`CircleX` (35).
- `noteKey` (line 36): `kind === 1 ? 'noteKnowEnter' : kind === 2 ? 'noteNotDue' : kind === 3 ? 'noteHint' : kind === 4 ? 'noteWrong' : null`,
  rendered at line 90 as `t(noteKey, { lemma: result.correct.lemma })`.
- Result box (lines 41–53): `data-feedback`, `bg-success-soft` / `bg-danger-soft`; title `{right ? t('right') : t('wrong')}` (44);
  reveal line `t('revealLine', { lemma: result.correct.lemma, meaning: result.meaning })` (46); `<SpeakWord text={result.correct.lemma} />`
  (48, from `@/app-ui/SpeakButtons`); `definition_en` caption when present and different from `meaning` (51).
- Translation box (lines 54–63): only when `result.translation && locale === 'vi'`; heading `t('translation')` + chip `t('translationAi')`.
- Button block (lines 64–89), verbatim:

```tsx
      <div className={cn('grid gap-3', kind !== null && 'sm:grid-cols-2')}>
        {kind !== null && (
          <Button
            variant={kind === 4 ? 'sticker' : 'quiet'}
            size="lg"
            className={cn('justify-between', kind === 4 && 'font-bold')}
            autoFocus={focusPrimary && kind === 4}
            isDisabled={busy}
            onPress={() => onReview('needs_review')}
          >
            {t('stillLearning')}
            <kbd className={`${KBD} border-current`}>{kind === 4 ? 'Enter' : '1'}</kbd>
          </Button>
        )}
        {kind === 1 ? (
          <Button variant="sticker" size="lg" className="justify-between font-bold" autoFocus={focusPrimary} isDisabled={busy} onPress={() => onReview('known')}>
            {t('know')}
            <kbd className={`${KBD} border-current`}>Enter</kbd>
          </Button>
        ) : (
          <Button variant={kind === 4 ? 'quiet' : 'sticker'} size="lg" className={cn('justify-between', kind !== 4 && 'font-bold')} autoFocus={focusPrimary && kind !== 4} isPending={busy} onPress={onNext}>
            {t('next')}
            {kind !== 4 && <kbd className={`${KBD} border-current`}>Enter</kbd>}
          </Button>
        )}
      </div>
```

Summary of the buttons by case: case 1 = [Still learning `1`] + [Know `Enter`, sticker]; cases 2, 3 = [Still learning `1`] + [Next
`Enter`, sticker]; case 4 = [Still learning `Enter`, sticker] + [Next, quiet, no kbd]; `null` (wrong outside learning) = [Next `Enter`].
The kbd labels are string literals (`'Enter'`, `'1'`), not i18n keys. `KBD` = `'hidden rounded-sm border px-1.5 text-caption font-semibold md:inline'`
(`QuestionCard.tsx:8`). `Button` (`app-ui/Button.tsx`) exposes `data-variant={variant}`; variants `'sticker' | 'primary' | 'quiet' | 'ink' | 'danger' | 'ghost'`, sizes `'md' | 'lg'`.

### 2.4 `focusPrimary`

Passed as `focusPrimary={!typed}` (`PracticeSession.tsx:268`), so it is `false` for every typed question (the alternative card is
always a typed question). It drives `autoFocus` at lines 70 (`focusPrimary && kind === 4`), 79 (`focusPrimary`) and 84 (`focusPrimary && kind !== 4`).

## 3. `features/learner/practice/session/use-practice-session.ts` (320 lines)

### 3.1 Types (all in this file unless stated; there is no `api-types.ts` / `types.ts` file in `apps/web/src`)

Verbatim, lines 12–80:

```ts
export type Prompt =
  | { kind: 'mcq'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null; options: string[] }
  | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
  | { kind: 'type_meaning'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
  | { kind: 'type_sentence'; sentence: string }
  | { kind: 'cloze'; sentence: string }
  | { kind: 'meaning_in_sentence'; sentence: string; highlight: string; options: string[]; meaning_language: 'vi' | 'en' }
  | { kind: 'mcq_sentence'; sentence: string; options: string[] };

/** `ItemView` of the API: never the answer or the hint texts. */
export type Item = {
  item_id: string;
  round: number;
  position: number;
  type: QuestionType;
  prompt_style: 'meaning' | 'sentence';
  prompt: Prompt;
  hints_available: { level1: boolean; level2: boolean; level3: boolean };
  hint_level: number;
  state: 'unanswered' | 'try_again';
  tries: number;
  reportable: boolean;
  /** The asked word is the learner's own (K/81). Absent from an older API: treated as false. */
  private_word?: boolean;
};

export type AnswerResult = {
  result: 'correct' | 'wrong';
  skipped: boolean;
  tries: number;
  hint_level: number;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  meaning: string;
  definition_en: string | null;
  show_known: boolean;
  highlight_needs_review: boolean;
  translation: string | null;
};

export type AnswerBody = { choice: number } | { is_true: boolean } | { text: string };
export type AiReason = 'ai-failed' | 'quota-exhausted' | 'plan-required' | 'ai-unavailable';
/** Bước 7 §6.6 fields sent with a question or with `ai_unavailable`. */
type AiFields = { notice?: string; ai_reason?: AiReason; resets_at?: string; sense_id?: string; lemma?: string | null };
type NextResult =
  | ({ state: 'question'; session: PracticeSessionView; item: Item } & AiFields)
  | { state: 'waiting_continue' | 'finished'; session: PracticeSessionView }
  | { state: 'preparing'; session: PracticeSessionView; retry_after_seconds: number }
  | ({ state: 'ai_unavailable'; session: PracticeSessionView; reason: AiReason } & AiFields);

/** The band over a question (K/75, K/75b, K/76): shown once, the API sends it once per session. */
export type SessionNotice =
  | { kind: 'ai-fallback'; reason: AiReason; resetsAt: string | null }
  | { kind: 'word-not-recognized'; senseId: string; lemma: string | null };

export type Outcome = { kind: 'try_again'; tries: number } | { kind: 'final'; result: AnswerResult; chosen: AnswerBody | null };
export type Phase =
  | { kind: 'question'; item: Item; outcome: Outcome | null; notice?: SessionNotice | null }
  /** K/73: the next AI question is still being written. */
  | { kind: 'preparing' }
  /** K/74a–K/74d: no AI question can be made now; the session stays open. */
  | { kind: 'ai_stopped'; reason: AiReason; resetsAt: string | null; lemma: string | null }
  | { kind: 'round' }
  | { kind: 'summary' }
  | { kind: 'advancing' }
  | { kind: 'none' }
  | { kind: 'closed' };

export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: 'needs_review' | 'known' | null };
export type Summary = { session: PracticeSessionView; asked: number; correct: number; wrong: number; words: SummaryWord[] };
```

- The try-again reply has no named type: it is the inline `{ result: 'try_again'; tries: number }` in the `api.post` generic (line 231).
- The `current` reply is the inline `{ session: PracticeSessionView; item: Item | null; preparing: boolean }` (line 109).
- `features/learner/practice/practice-api.ts` holds `PracticeSessionView` (lines 46–62), `CurrentItem = { item_id: string; state: 'unanswered' | 'try_again' }`
  and `CurrentSession` (lines 64–65; used by the practice home's `useCurrentSession`, not by the session page), and `HistoryItem` (§6).
- API side, for cross-reference: `ItemView` `apps/api/src/practice/sessions/session-views.ts:15–21`, `state: item.tries > 0 ? 'try_again' : 'unanswered'`
  (line 42); `AnswerResult` `apps/api/src/practice/answers/answers.service.ts:18–24`; the try-again return `{ result: 'try_again', tries: item.tries + 1 }`
  (line 80) in `answer(...): Promise<AnswerResult | { result: 'try_again'; tries: number }>` (line 59).

### 3.2 State shape (lines 104–136)

- `load` = `useQuery` keyed `['practice', 'session-load']`, `GET /v1/practice/sessions/current`, read once (`enabled: !loaded`,
  `staleTime: Infinity`, `gcTime: 0`, no refetch on focus/reconnect); 404 → `null` (lines 104–125).
- `own: { phase: Phase; session: PracticeSessionView | null } | null` (126); `error: unknown` (127); `reported: Set<string>` of item ids
  (128); `results: Record<number, 'correct' | 'wrong'>` keyed by question number for the progress bar (130); `busy` + `busyRef` (131–132);
  `advanceStarted` ref (133). Returned `busy` is `busy || answerOnce.busy` (270).
- There is no `final` field in the hook: `final` is derived in the component (§1.2). There is no per-word pressed state anywhere.
- `set(next, view?)` (145) replaces the phase, keeping the last session view when `view` is omitted.

### 3.3 `current` → phase on load (lines 135–143), verbatim

```ts
  let phase: Phase | null = own?.phase ?? null;
  let session = own?.session ?? null;
  if (!own && load.data !== undefined) {
    const data = load.data;
    session = data?.session ?? null;
    phase = data === null ? { kind: 'none' }
      : data.item ? { kind: 'question', item: data.item, outcome: null }
        : data.session.status === 'waiting_continue' ? { kind: 'round' } : { kind: 'advancing' };
  }
```

Fact: on load the outcome is **always `null`**, whatever `data.item.state` is. `item.state` and `item.tries` are kept in `item` but
nothing reads them (grep: no reader of `item.state` in `apps/web/src`; `tries` is read only from `outcome.tries` in `TypeWordInput`).
So after a reload on a try-again item the page today shows the question as unanswered: no red field, no "Lần N", no try-again block,
no `tryAgainBody`. (The design §3.1 says "the web always shows the spelling text" after a reload; the code shows no try-again text
at all.) A final result is never in `current`: the API returns only the pending item, `items.find((item) => item.result === null)`
(`apps/api/src/practice/sessions/sessions.service.ts:161–174, 409`), so a reload after an answer lands on the next slot (web phase
`advancing` → `POST …/next`). There is no load path to a `final` outcome today. No test covers a reload with `state: 'try_again'`.
The API's `current` reply may also carry `notice?` (`sessions.service.ts:161`), which the web's inline type at line 109 omits.

### 3.4 `answer()` (lines 227–262), verbatim

```ts
  const chosenRef = useRef<{ itemId: string; body: AnswerBody } | null>(null);
  const answerOnce = useSubmitOnce(async (key) => {
    const { itemId, body } = chosenRef.current!;
    try {
      return await api.post<AnswerResult | { result: 'try_again'; tries: number }>(`/v1/practice/items/${itemId}/answer`, body, { idempotencyKey: key });
    } catch (e) {
      // E36: answered in another tab; the API sends the result.
      const other = e instanceof ApiError && e.problem.slug === 'already-answered' ? e.problem.extensions?.result : undefined;
      if (other) return other as AnswerResult;
      throw e;
    }
  });

  function recordFinal(item: Item, result: AnswerResult, chosen: AnswerBody | null) {
    if (session) setResults((r) => ({ ...r, [session!.asked]: result.result }));
    // The band stays with its question: K/76 names the word and links to it once the answer is shown (review I3).
    const notice = phase?.kind === 'question' ? phase.notice : null;
    set({ kind: 'question', item: { ...item, hint_level: result.hint_level }, outcome: { kind: 'final', result, chosen }, notice });
  }

  async function answer(body: AnswerBody) {
    if (phase?.kind !== 'question' || phase.outcome?.kind === 'final' || answerOnce.busy || busyRef.current) return;
    const item = phase.item;
    chosenRef.current = { itemId: item.item_id, body };
    setError(null);
    try {
      const response = await answerOnce.submit(`${item.item_id}:${JSON.stringify(body)}`);
      if (!response) return;
      if (response.result === 'try_again') {
        set({ kind: 'question', item: { ...item, state: 'try_again', tries: response.tries }, outcome: { kind: 'try_again', tries: response.tries }, notice: phase.notice });
      }
      else recordFinal(item, response, body);
    } catch (e) {
      fail(e);
    }
  }
```

- `POST /v1/practice/items/{itemId}/answer`, body `AnswerBody` (`{ text }` for typed), `Idempotency-Key` from `useSubmitOnce` keyed by
  `${item_id}:${JSON.stringify(body)}`.
- Line 256 builds the `try_again` outcome from `response.tries` only; any extra reply field (a future `reason`) is dropped here.
- Lines 234–235: an `already-answered` 409 returns `e.problem.extensions.result` cast to `AnswerResult` and goes through `recordFinal`
  like a normal reply (test "E36", `practice-session.test.tsx:460`).
- `skip()` (lines 274–279): `POST /v1/practice/items/{id}/skip` with `{}` → `recordFinal(item, result, null)`.

### 3.5 `review(action)` and `next()` (lines 280–291), verbatim

```ts
    /** Cần ôn lại / Đã biết on a result, then the next question (K/61, K/62). */
    review: (action: 'needs_review' | 'known') =>
      guarded(async () => {
        if (phase?.kind !== 'question' || !session) return;
        await api.post(`/v1/practice/items/${phase.item.item_id}/review`, { action });
        void client.invalidateQueries({ queryKey: GROUPS_KEY });
        await advanceNow(session.id);
      }),
    next: () =>
      guarded(async () => {
        if (session) await advanceNow(session.id);
      }),
```

- Path `POST /v1/practice/items/{item_id}/review`, body exactly `{ action }`, no `Idempotency-Key`, reply ignored.
- `review` **always advances** to the next question after the POST (`advanceNow`). There is no review-without-advance function.
- `guarded` (lines 157–170) drops presses while busy and routes errors to `fail` (`session-closed` → phase `closed`, else `setError`).
- `advanceNow(id, retryAi?, waited?)` (lines 172–197): `POST /v1/practice/sessions/{id}/next` with `{}` (or `{ retry_ai: true }`).
- API side: the review body schema is `z.strictObject({ action: z.enum(['needs_review', 'known']) })`
  (`apps/api/src/practice/reviews/practice-reviews.controller.ts:10`), so today an extra body field (for example `sense_id`) is refused
  by validation.

## 4. `features/learner/practice/session/HintPanel.tsx` (79 lines)

- Types, verbatim (lines 12–14):

```tsx
type HintStep = { kind: 'definition' | 'example' | 'meaning' | 'first_letter'; text: string };
type LegacyLetters = { first_letter: string; length: number };
export type HintValue = HintStep | LegacyLetters;
```

- Props: `HintPanel({ item, onOpen, locked }: { item: Item; onOpen: (level: number) => void; locked: boolean })` (line 23);
  namespace `useTranslations('App.practice.session.hint')` (24).
- Each opened level is fetched with `api.post<{ level: number; hint: HintValue }>(`/v1/practice/items/${item.item_id}/hint`, { level })`,
  query key `['practice', 'hint', item.item_id, level]`, `staleTime: Infinity` (lines 28–35).
- Rendering of a value, verbatim (lines 53–64):

```tsx
          const value = n <= item.hint_level ? hints[index]?.data?.hint : undefined;
          return (
            <li key={n} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex shrink-0 items-center gap-2 text-caption font-semibold text-ink sm:w-44">
                <span className={cn('flex size-5 items-center justify-center rounded-full border border-ink', n <= item.hint_level && 'bg-ink text-surface')}>{n}</span>
                {value ? ('kind' in value ? t(`kinds.${value.kind}`) : t('kinds.letters')) : t('locked', { n })}
              </span>
              {value ? (
                <span className="min-w-0 break-words text-ui text-ink">
                  {'kind' in value ? value.text : t('letters', { first: value.first_letter, length: value.length })}
                </span>
```

- Line 62 is where a `first_letter` step's text is printed raw (`value.text`); the `c___` format hooks in there for
  `value.kind === 'first_letter'`. The legacy branch uses `t('letters', { first, length })`.
- API facts: the `{ kind: 'first_letter', text }` step is built only in `clozeHints` (`apps/api/src/practice/ai/ai-question.ts:29–37`,
  `text: [...main][0] ?? ''`), used by `aiQuestion` (line 60) and `ownSentenceQuestion` (line 103). The `{ first_letter, length }` shape
  is **still produced today** for every new Bước 4 `type_word` question as level 2 (`apps/api/src/practice/questions/hints.ts:31–33`);
  it is not only stored legacy data.
- Test fixtures use `text: 'd…'` (with the ellipsis) for a `first_letter` step and assert the exact text `'d…'`:
  `practice-session.test.tsx:520, 524`, `ai-questions.test.tsx:124, 129`, and the e2e `apps/web/e2e/app/m5a.spec.ts:53, 91`. The real
  API sends the letter alone (`'d'`).

## 5. `features/learner/practice/session/SessionSummary.tsx` (167 lines)

- Props: `SessionSummary({ session, sourceLabel }: { session: PracticeSessionView; sourceLabel: string })` (line 42). Rendered from
  `PracticeSession.tsx:120`.
- Data: `useSummary(sessionId)` (lines 20–26) = `useQuery` key `['practice', 'summary', sessionId]`,
  `GET /v1/practice/sessions/{id}/summary` → `Summary` (type in `use-practice-session.ts:79–80`, §3.1).
- Namespaces: `t = useTranslations('App.practice')` (43) and `ts = useTranslations('App.practice.session.summary')` (44).
- `pressing: string | null` holds an **item id** (line 53); `refresh()` invalidates the summary and `GROUPS_KEY` (54–57).
- `reviewAll` (lines 58–62), verbatim: `await api.post(`/v1/practice/sessions/${session.id}/review-all`, undefined, { idempotencyKey: key });`
  then `refresh()`. Called from the button at line 123 (`onPress={run(reviewAll.submit)}`), shown when `left > 0`
  (`left = data?.words.filter((w) => w.action === null).length ?? 0`, line 93); label `ts('reviewAll', { count: left })`.
- `reviewOne(itemId)` (lines 69–81), verbatim:

```tsx
  async function reviewOne(itemId: string) {
    if (pressing) return;
    setPressing(itemId);
    setError(null);
    try {
      await api.post(`/v1/practice/items/${itemId}/review`, { action: 'needs_review' });
      refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPressing(null);
    }
  }
```

- Counts block (lines 104–115): `<dl>` with two cells, `ts('correct')` / `data.correct` (`text-success`) and `ts('wrong')` /
  `data.wrong` (`text-danger`). No other line under it today.
- List (lines 116–147): heading `ts('listTitle', { count: data.words.length })` (`id="summary-words"`); `<ul aria-labelledby="summary-words">`;
  each row `<li key={word.sense_id}>` shows `word.lemma`, `word.meaning`, then either `<Check/> ts('added')` when `word.action !== null`
  or `<Button variant="quiet" isPending={pressing === word.item_id} onPress={() => void reviewOne(word.item_id)}>{ts('review')}</Button>`
  (lines 129–144). The button's accessible name is just `ts('review')` (no word).
- Facts relevant to two rows on one item: rows are keyed by `sense_id` (unique per word), but `pressing` and the review call use only
  `item_id`, so two rows that share an item id would both show pending and both post the same body.
- `SessionSummary` has no test file of its own; it is tested through `PracticeSession` (§8).

## 6. History and the Recent list

- Item type: `HistoryItem` (`features/learner/practice/practice-api.ts:78–97`), verbatim:

```ts
/** `GET /v1/practice/history` row (Bước 4 §8). `answer`: "0"…"3" for a choice, "true"/"false", or the typed text. */
export type HistoryItem = {
  item_id: string;
  session_id: string;
  sense_id: string;
  lemma: string;
  type: QuestionType;
  prompt_style: string;
  prompt: { kind: string; options?: string[]; meaning?: string; lemma?: string; sentence?: string };
  answer: string | null;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  result: 'correct' | 'wrong';
  skipped: boolean;
  tries: number;
  hint_level: number;
  review_action: string | null;
  answered_at: string;
  local_date: string;
  translation: string | null;
};
```

- `features/learner/practice/history-format.ts` (17 lines), verbatim:

```ts
import type { HistoryItem } from './practice-api';

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * One line for a question in history (K/51 "Gần đây", K/57): "đúng", or what the learner gave and the right answer.
 * `t` reads `App.practice.recent`.
 */
export function answerSummary(item: HistoryItem, t: Translate): string {
  const correct = item.correct.text;
  if (item.skipped) return t('skipped', { correct });
  if (item.result === 'correct') return t('correct');
  const options = item.prompt.options;
  if (options && item.answer !== null && /^\d$/.test(item.answer)) return t('chose', { answer: options[Number(item.answer)] ?? item.answer, correct });
  if (item.type === 'true_false_definition' && (item.answer === 'true' || item.answer === 'false')) return t('choseTf', { answer: t(item.answer) });
  return t('typed', { answer: item.answer ?? '', correct });
}
```

  A right answer always returns `t('correct')` ("đúng" / "right") at line 12, before the `typed` line; so today a right alternative
  answer would print "right", never "you typed …".
- Components that render history items (only two):
  1. **Recent list**: `Recent()` in `features/learner/practice/PracticePage.tsx:242–285`. `t = useTranslations('App.practice')`,
     `tRecent = useTranslations('App.practice.recent')` (244–245); data `useRecentHistory(3)` (`practice-api.ts:131–137`,
     `GET /v1/practice/history?page_size=3`, key `['practice', 'recent', 3]`). Each row (267–279): `CircleCheck aria-label={tRecent('right')}`
     or `CircleX aria-label={tRecent('wrong')}` by `item.result`; `item.lemma`; `t(`types.${item.type}`)`; then
     `{answerSummary(item, (key, values) => tRecent(key as 'correct', values))}` (line 276); `format.time(item.answered_at)`.
  2. **History page**: `HistoryRow({ item, withDate })` in `features/learner/practice/HistoryPage.tsx:172–214`, list in `AnswersTab()`
     (66–158; `GET /v1/practice/history?{date&}page_size=50{&page_token}`, `useInfiniteQuery` key `['practice', 'history', day]`).
     `HistoryRow` does **not** use `answerSummary`: it renders separate cells `answer` (183–184: option text, True/False, or the typed
     text; `text-ink` when right, `text-danger` when wrong, line 202), `correct` (`item.correct.text`, 185), and a result chip
     (187–190): `result.skipped` / `result.wrong` / `result.hinted` (when `hint_level > 0`) / `result.retried` (`tries > 1`) /
     `result.correct`; chip colour `bg-accent-soft` for hinted, `bg-success-soft` right, `bg-danger-soft` wrong (209). The header counts
     right as `items.filter((i) => i.result === 'correct').length` (98). Namespaces `App.practice.history` (`t`) and `App.practice` (`tp`).
- The API supports `sense_id` on `GET /v1/practice/history` (`apps/api/src/practice/history/history.controller.ts:14`), but **no web
  code passes it** (grep `sense_id=` in `apps/web/src`: no hit). There is no per-word history view in the web.
- The "you typed {answer}, answer {correct}" key is `App.practice.recent.typed` (`messages/en.json:1197`, `vi.json:1197`).

## 7. i18n

- Files: `apps/web/messages/en.json`, `apps/web/messages/vi.json`. The two files are line-aligned for every key below (same line numbers).
  Production loads `messages/${locale}.json` (`src/i18n/request.ts:17`); `src/global.d.ts:2,7` types `Messages` from `en.json`, so
  `pnpm typecheck` rejects a `t()` key missing from `en.json`. Tests load `{ App: … }` only (`app-ui/test-utils.tsx:29`).
- Namespace mapping: `useTranslations('App.practice.session')` reads the object at `App.practice.session` (`en.json:1265`); the top
  `App` object starts at `en.json:284`, `App.practice` at `1088`.

| Key (under `App.practice`) | line | en | vi |
|---|---|---|---|
| `session.right` | 1326 | Right | Đúng rồi |
| `session.wrong` | 1327 | Not quite | Chưa đúng |
| `session.tryAgainBody` | 1322 | Check the spelling and try again. The answer stays hidden. | Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án. |
| `session.tryAgainNote` | 1325 | A right answer on a retry still counts as right. Showing the answer counts as wrong. | Làm lại mà đúng vẫn tính là đúng. Xem đáp án thì tính là sai. |
| `session.revealLine` | 1328 | {lemma} · {meaning} | {lemma} · {meaning} |
| `session.translation` | 1269 | Translation | Bản dịch |
| `session.translationAi` | 1270 | AI translation | AI dịch |
| `session.stillLearning` | 1329 | Still learning | Cần ôn lại |
| `session.know` | 1330 | Know | Đã biết |
| `session.next` | 1331 | Next question | Câu tiếp |
| `session.retry` | 1323 | Try again | Làm lại |
| `session.reveal` | 1324 | Show answer | Xem đáp án |
| `session.attempt` | 1321 | Try {n, number} | Lần {n, number} |
| `session.noteKnowEnter` | 1333 | Enter means Know: {lemma} moves up a stage. Not sure? Choose Still learning. | Nhấn Enter là Đã biết: {lemma} lên một ngăn. Chưa chắc thì bấm Cần ôn lại. |
| `session.noteHint` | 1334 | Hints don't change the grading, but a right answer after a hint has no Know button. | Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết. |
| `session.noteWrong` | 1332 | Enter moves {lemma} to the top of its deck, back to stage 1. Next question keeps its schedule. | Nhấn Enter để đưa {lemma} lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn. |
| `session.noteNotDue` | 1396 | {lemma} isn't due yet, so its schedule stays the same. | {lemma} chưa tới hạn ôn nên lịch ôn giữ nguyên. |
| `session.hint.letters` | 1346 | {first}… · {length} letters | {first}… · {length} chữ |
| `session.hint.kinds.first_letter` | 1351 | First letter | Chữ cái đầu |
| `session.hint.kinds.letters` | 1352 | First letter and length | Chữ cái đầu và số chữ |
| `session.summary.correct` | 1387 | Right | Đúng |
| `session.summary.wrong` | 1388 | Wrong | Sai |
| `session.summary.listTitle` | 1389 | Still learning · {count, plural, one {# word} other {# words}} | Cần ôn lại · {count, number} từ |
| `session.summary.added` | 1390 | Added to priority | Đã đưa vào ưu tiên |
| `session.summary.review` | 1391 | Still learning | Cần ôn lại |
| `session.summary.reviewAll` | 1392 | Add the other {count, plural, one {# word} other {# words}} to priority | Đưa {count, number} từ còn lại vào ưu tiên |
| `recent.correct` | 1196 | right | đúng |
| `recent.typed` | 1197 | you typed {answer}, answer {correct} | bạn gõ {answer}, đáp án {correct} |
| `recent.right` / `recent.wrong` | 1203 / 1204 | Right / Wrong | Đúng / Sai |
| `history.result.correct` … `retried` | 1465–1469 | Right; Wrong; Wrong · skipped; Right · with hint; Right · try {n, number} | Đúng; Sai; Sai · bỏ qua; Đúng · có gợi ý; Đúng · lần {n, number} |
| `history.actions.needs_review` / `known` | 1472 / 1473 | Still learning / Know | Cần ôn lại / Đã biết |

- Kbd labels are not i18n keys: literals `Enter`, `1`, `H`, `Esc` in JSX (`AnswerFeedback.tsx:75, 81, 86`; `TypeWordQuestion.tsx:74, 79`;
  `PracticeSession.tsx:160, 288`). The practice home's shortcut box lists `'1–4'`, `'Enter'`, `'H'`, `'Esc'` with `App.practice.shortcuts.*`
  (`PracticePage.tsx:288–295`).
- Message tests: `src/i18n/messages.test.ts`:
  - "LP3 vi and en messages have identical keys and no empty values" (line 34): key parity of the whole files.
  - "every numeric placeholder in App is formatted as a number" (line 27): a placeholder named in `NUMERIC` (lines 21–22: `count`,
    `total`, `n`, `left`, `added`, …) must be written `{name, number}` (or inside a plural).
  - Rich tags allowed: `br, b, hl, terms, privacy, mail` (line 45).
  - "the learner app never says "Vui lòng", "please" or "sorry", and uses one-character ellipses" (line 56): no `...` in `App.*`.

## 8. Tests

- Runner: Vitest 4.1.11 (`apps/web/vitest.config.ts`: `globals: true`, default `environment: 'node'`, include
  `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`, setup `vitest.setup.ts` loads `@testing-library/jest-dom/vitest`). Component
  files start with `// @vitest-environment jsdom`. Testing Library: `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7.
  Tests sit next to the code (`*.test.tsx`).
- API mocking: **not msw** (msw 3.0.3 is a devDependency but these tests do not use it). `renderApp(ui, { locale?, me?, routes? })`
  (`src/app-ui/test-utils.tsx:13–40`) wraps `NextIntlClientProvider`, a `QueryClient` (`retry: false`), `SessionProvider` and
  `ThemeProvider`, with a fake `fetch` from `makeFetch(routes)` (`src/app-shell/session/test-support.ts:45–67`). Routes are
  `Record<'METHOD /path?query', (call) => Response>`; an unscripted request throws `unscripted request: …`. The return has `calls`
  (`{ method, path, headers, body (JSON-parsed), keepalive }[]`) and `count(method, path)`. Default `locale` is `'vi'`.
  `next/navigation` and `@/app-shell/navigate` are `vi.mock`ed per file.
- Existing test files (no separate file for `AnswerFeedback`, `HintPanel`, `SessionSummary`, `use-practice-session` or
  `history-format`; all are exercised through `PracticeSession` / pages):
  - `features/learner/practice/session/practice-session.test.tsx` (640 lines; fixtures `view`, `mcq`, `trueFalse`, `typed`, `result`,
    `SUMMARY`, `routes`, `posts` at lines 22–92). Examples: `'A16-1: case 1, Enter → review known, then next'` (cases table line 96,
    `it.each` line 102); `'case $id: key $key follows its available review action'` (174); `'TV12, K/64: [Kiểm tra] sends the typed word;
    try_again keeps the question with [Làm lại]; [Xem đáp án] skips'` (367); `'K/67: Esc ends the session into the summary; [Cần ôn lại]
    per word and for the rest'` (433, the only summary test); `'Review Focus 4: a reload with a hint already opened shows its text
    again'` (516); `'E36: already answered elsewhere → the result the API sends is shown, no error'` (460).
  - `features/learner/practice/session/ai-questions.test.tsx` (187 lines; fixtures `cloze`, `meaning`, `sentenceMcq`, `result`, `routes(item, over)`).
    Examples: `'K/78a cloze: "Câu AI", the sentence with its blank, [Kiểm tra] sends the typed word'` (71); `'copy doc §15 row 10: [Gợi ý]
    opens hint 1 in the numbered list with progress, then [Mở gợi ý 2]'` (122); `'K/79a: a Vietnamese learner sees "Bản dịch · AI dịch"
    with the translated sentence'` (135).
  - `features/learner/practice/session/ai-states.test.tsx` (217 lines): preparing / ai_unavailable / notices.
  - `features/learner/practice/weak-history.test.tsx`: `HistoryPage` tests, e.g. `'Câu đã làm: type with style, answer, right answer,
    result and what was pressed'` (125); fixture `historyItem(over)` (93–98).
  - `features/learner/practice/practice-home.test.tsx`: `PracticePage`; its routes return `GET /v1/practice/history?page_size=3` →
    `{ items: [] }` (line 63). **No unit test renders a Recent row with items** and none asserts an `answerSummary` line.
  - E2E (Playwright, `apps/web/e2e/app/m4.spec.ts`, `m5a.spec.ts`) cover the session, retry, summary and hint (`m5a.spec.ts:91` asserts `'d…'`).
- Commands (from `apps/web/package.json` scripts and CI `.github/workflows/ci.yml:89–105`, which runs them in `apps/web`):
  `pnpm lint` (= `eslint . && node scripts/check-tailwind-raw.mjs`), `pnpm typecheck` (= `tsc --noEmit`), `pnpm test` (= `vitest run`,
  all web unit tests), `pnpm test:e2e` (= `playwright test`). One file: `pnpm exec vitest run src/features/learner/practice/session/practice-session.test.tsx`
  in `apps/web`, or `pnpm --filter web exec vitest run <path>` from the repo root (the form used in the project's delivery docs; package
  name is `web`). **Not run this session:** this worktree has no `node_modules` (neither at the root nor in `apps/web`), so it needs
  `pnpm install` before any of these commands works here.

## 9. Admin `apps/admin/src/features/reports/ReportDetail.tsx`

- Snapshot type `ReportSnapshot` (`apps/admin/src/features/reports/reports-api.ts:9–30`); `correct` is
  `{ lemma?: string; meaning?: string; option_index?: number; is_true?: boolean; main?: string; accepted?: string[] }` (lines 19–26).
  No `also_accepted` field.
- Rendering (lines 132–141, 203), verbatim:

```tsx
  const snapshot = report.question_snapshot;
  const { prompt, correct, learner } = snapshot;
  …
  const correctText =
    correct.option_index !== undefined ? options[correct.option_index]
    : correct.is_true !== undefined ? t(correct.is_true ? 'reports.detail.true' : 'reports.detail.false')
    : correct.main ?? correct.lemma;
  …
            {correctText !== undefined && <Row label={t('reports.detail.correctAnswer')}>{correctText}</Row>}
```

- `correct.accepted` is typed but **never rendered**: the only `accepted` hit in `apps/admin/src/features/reports` is the type line
  `reports-api.ts:25`. So an added `correct.also_accepted` would be **ignored** by the admin page as it stands (not typed, not shown).
  Showing it (and the private-word mask of CS16) would need new admin code.
- Hints there: `hintText()` (lines 59–66) prints a step's `text` as is (so a `first_letter` step shows the bare letter `c`), and a
  legacy `{ first_letter, length }` as `` `${first_letter}… (${length})` ``. Unaffected by a web-only `c___` format.
- API side: `buildSnapshot` (`apps/api/src/practice/reports/snapshot.ts:13–45`) builds `correct` as `{ ...key.reveal }` plus, for
  `key.kind === 'type_word'`, `main: key.main, accepted: key.accepted` (line 33). An `also_accepted` reaches the snapshot only if this
  function adds it.
- Admin report tests: `apps/admin/src/features/reports/ReportsPage.test.tsx` (e.g. `'§6.8: two masked options without option_index →
  "Không rõ lựa chọn nào"'`, line 142).
