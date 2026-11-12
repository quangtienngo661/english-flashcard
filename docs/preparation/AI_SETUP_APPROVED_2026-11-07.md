# AI setup approved by the owner (07/11/2026)

The model, effort, prompt and judge for each AI task, approved by the owner on 07/11/2026 after the tests in
[`judge-compare-2026-11-07/comparison.md`](judge-compare-2026-11-07/comparison.md). Nothing here is published in the app yet; the owner
publishes later in Admin → AI (a draft per task, a run on the task's frozen test set, then Publish).

## Per task

| Task (admin label) | Model | Effort | Prompt | Judge (criterion) | Test result |
|---|---|---|---|---|---|
| Sinh câu điền từ (`generate_cloze`) | GPT-6.1 Terra (since 10/11; was Claude Haiku 5.5) | xhigh (was max) | [writer-prompt-draft-3-1.md](judge-compare-2026-11-07/writer-prompt-draft-3-1.md) (since 10/11: draft 3 plus the tense-sign line; was [writer-prompt-draft.md](judge-compare-2026-11-07/writer-prompt-draft.md)) | [judge-instructions-5-criteria.md](judge-compare-2026-11-07/judge-instructions-5-criteria.md) (since 10/11: `session_single_answer`, `sense_match`, `enough_clue`, `grammar_natural`, `translation_ok`, following design D1; was "Chỉ một đáp án", [judge-instructions-v2.md](judge-compare-2026-11-07/judge-instructions-v2.md)) | 07/11: 48/102 pass, 34 major. 10/11, draft 3 on the 20 hardest words, recounted without single_answer: every criterion pass Terra xhigh 17/20, Haiku xhigh 18/20 |
| Sinh câu chọn đáp án (`generate_sentence_mcq`) | Claude Haiku 5.5 | xhigh (since 10/11; was max) | [mcq-writer-prompt.md](judge-compare-2026-11-07/mcq-writer-prompt.md) (starter + plan Appendix B) | "Một lựa chọn đúng", [mcq-judge-instructions.md](judge-compare-2026-11-07/mcq-judge-instructions.md) (`single_correct_option`, plan Appendix C2) | 20/20 pass |
| Sinh câu hỏi nghĩa (`generate_meaning_question`) | Claude Haiku 5.5 | xhigh (since 10/11; was max) | starter, [meaning-writer-prompt.md](judge-compare-2026-11-07/meaning-writer-prompt.md) | "Một nghĩa đúng", [meaning-judge-instructions.md](judge-compare-2026-11-07/meaning-judge-instructions.md) (`single_meaning`, new) | 20/20 pass |
| Tra từ bằng AI (`lookup_word`) | Claude Haiku 5.5 | medium | starter, [lookup-writer-prompt.md](judge-compare-2026-11-07/lookup-writer-prompt.md) | "Đúng nghĩa tra", [lookup-judge-instructions.md](judge-compare-2026-11-07/lookup-judge-instructions.md) (`right_meaning`, new) | 20/20 on the key and the judge |
| Kiểm từ riêng (`check_private_word`) | Claude Haiku 5.5 | medium | starter, [private-writer-prompt.md](judge-compare-2026-11-07/private-writer-prompt.md) | none (yes/no answer, scored against a key) | 20/20 on the key |
| Dịch câu (`translate_sentence`) | none | — | — | — | no app feature calls it |

Every judge runs on **Claude Sonnet 5.5 at high effort**, its text ending with "Think the problem through before you answer." (since
10/11); the app accepts only an Anthropic model for a judge.

## Before publishing

1. **Time one real call of each max task.** No real call was timed: all tests ran as Claude Code sessions. The app stops a call after 10 s
   (Cài đặt hệ thống, `callTimeoutSeconds`), and earlier Haiku calls at default effort took up to 8.6 s. If a max call is cut off, raise the
   limit rather than the model. Needs the Anthropic key in the root `.env`.
   **First measurement (09/11/2026, one real call, `judge-compare-2026-11-07/api-price-test.mjs`, fill-in, word brush):** 40.7 s,
   2,153 tokens in, 8,839 out of which 8,743 thinking, US$0.00463. So a max call takes about four times the app's limit, and nearly all
   of its cost is thinking. One call only; the spread and the time at high or xhigh are not measured yet.
   For comparison, Claude Sonnet 5.5 at xhigh on the same word: 16.3 s, 2,153 in, 1,807 out of which 1,690 thinking, US$0.02238. It
   thinks about a fifth as much as Haiku max, so it is faster, but at 20 times the price per token it costs about five times more per
   sentence. Both are over the 10 s limit.
   On a hard word with its synonym in the session (increase, with raise and grow): Haiku max 117.5 s, 26,489 tokens out (26,382 thinking),
   US$0.01347; on revenue it ran past a 2-minute timeout. Sonnet xhigh 16.1 s, 1,654 out, US$0.02101. Neither declared raise. So Haiku
   max cannot write questions during practice; the owner stopped the remaining challenge calls.
   Re-run with a 5-minute timeout (revenue, strategy, slice): Haiku max spent the whole 32,000-token cap on thinking each time
   (about 145 s, US$0.01622 each) and returned no answer. Sonnet xhigh answered all three in 13–25 s for US$0.017–0.031; its strategy
   sentence ("I prefer ___ games to action games…") leaves no session word room, while "paper-thin ___" (slice, with piece in the
   session) and "Tax ___ fell" (revenue, with income) leave the session synonym barely possible and undeclared.
2. **Show the two Claude models in the model list.** On the local database `claude-haiku-5-5` and `claude-sonnet-5-5` are marked hidden
   (AI → Model, "Đã ẩn").
3. **Review the test material written for these tests:** the inputs, answer keys and the three new judge texts (meaning, lookup and the
   multiple-choice one taken from plan Appendix C2) were written by Claude and have not been reviewed.
4. **Added 10/11:** set the AI call time limit to 30 s; check that `gpt-6.1-terra` is in the model list and not hidden, with the
   OpenAI key set; time 20 multiple-choice and 20 meaning questions at Haiku xhigh (never tried at that effort); and give each judge a
   few deliberately wrong answers, since every test set so far had none to catch. Risk: a hard fill-in word can still pass 30 s (Terra
   took 40.9 s once with draft 1), and a call cut off at the limit leaves that question unasked.

## Changes after approval

- **10/11/2026, owner:** the fill-in writer prompt is now [writer-prompt-draft-3.md](judge-compare-2026-11-07/writer-prompt-draft-3.md).
  It asks only that no common word with the same meaning fits the blank (a more general word may), and keeps draft 2's rules on
  meaning-only clues and answer forms. On the 20 hardest words: Terra xhigh 19 of 20 with no major (draft 1: 15), Haiku xhigh 16 of 20
  (unchanged), judged by [judge-instructions-6-criteria-split.md](judge-compare-2026-11-07/judge-instructions-6-criteria-split.md).
  Why and how it was tested: [AI_PROMPTS_CHECK_2026-11-10.md](AI_PROMPTS_CHECK_2026-11-10.md), finding A.
- **10/11/2026, owner:** the multiple-choice, meaning and lookup judge texts end with "Think the problem through before you answer."
  (finding C of the same doc). Their verdicts on the saved answers did not change.
- **10/11/2026, owner:** the fill-in judge is now
  [judge-instructions-6-criteria-split.md](judge-compare-2026-11-07/judge-instructions-6-criteria-split.md): six criteria in one judge,
  Sonnet 5.5 high with the think line. single_answer fails only a common word with the same meaning (employ for hire), not a more general
  one (clean for wash); a clue about letters or spelling and a missing answer form are major; no level or readability check. On 37
  sentences the owner labelled by hand it gave the owner's verdict on 23 (v2 with Opus: 15). Why each rule: the judge file's header and
  [AI_PROMPTS_CHECK_2026-11-10.md](AI_PROMPTS_CHECK_2026-11-10.md), finding B.
- **10/11/2026, owner, later the same day: the split judge is archived; the fill-in judge is
  [judge-instructions-5-criteria.md](judge-compare-2026-11-07/judge-instructions-5-criteria.md)**, the split judge without
  `single_answer`. Its `single_answer` failed a common same-meaning word from outside the learner's session (employ for hire), which
  contradicts D1 of the session-synonyms decisions (06/11: such a word is ignored by the judge; the learner gets "Not quite" and a
  retry) and D11 (the fill-in judge checks only session words). Owner: "use d1 instead as following the current design". Session words
  stay covered by `session_single_answer`, and the app accepts a declared one as an alternative answer (D3; built, PR #228–#231 on
  `dev`). The rare-synonym question goes with it. Recounted on the draft-3 runs without re-judging: sentences passing every criterion,
  Haiku 18 of 20 and Terra 17 of 20 (12 each with `single_answer`).
- **10/11/2026, owner: a sign of the form.** "It should have specific moment or sign in the sentence so that the user can know what to
  fill." The fill-in writer is now [writer-prompt-draft-3-1.md](judge-compare-2026-11-07/writer-prompt-draft-3-1.md): draft 3 with task
  step 3 asking, when more than one form fits, for a sentence with a clear sign (a time word for the tense, a subject for the verb form,
  "a" or a number for singular or plural); not tested yet. The 5-criteria judge's `grammar_natural` gives fail_minor when two forms fit
  and both are listed (unchanged: major when a fitting form is not listed). In the draft-3 run 2 of 40 sentences had no sign (Haiku:
  bake, garnish).
- **10/11/2026, owner:** writers and the time limit (finding E). Haiku max is out: one fill-in sentence took 40.7 s, hard words 117 s to
  past 145 s, some with no answer (09/11).
  - Fill-in: **GPT-6.1 Terra xhigh**. With draft 3 on the 20 hardest words: 19 of 20 with no major (Haiku xhigh 16), 12.9 s a
    sentence on average, slowest 24.9 s, US$0.0037 a sentence (Haiku xhigh US$0.0013). Needs the OpenAI key in production.
  - Multiple choice and meaning question: **Haiku xhigh**, between medium (18/20 each on 07/11) and max (20/20). Not tried at xhigh.
  - Lookup and private-word check: Haiku medium, unchanged (same as max on 07/11).
  - Judges: Sonnet high with the think line, unchanged.
  - **AI call time limit 30 s** (Cài đặt hệ thống, `ai.call_timeout_seconds`, default 10, allowed 3 to 30). It covers writers and judges
    alike (`apps/api/src/ai/runner/runner.service.ts`): fill-in writers took up to 25.6 s on 10/11, the fill-in judge up to 10.6 s
    (median 8.0 s, one call each). The app writes 2 practice questions ahead (`practice.ai_prefetch_count`), so a 13 s call should
    seldom make the learner wait; not timed in a real session.

## Still open (not part of this approval)

- ~~Whether a rare synonym (heed for attention) fails a fill-in question under the v2 judge.~~ Moot since 10/11: the fill-in judge has no `single_answer`.
- ~~Whether to keep `single_answer` next to the session-words criterion `session_single_answer` (design §6.1 of the session synonyms work drops it).~~ Settled 10/11: dropped, as design §6.1 and D1 say.
- The 21 fill-in words no writer could make single-answer (increase/raise, revenue/income…); showing the first letter was the product option found.
- How much of the differences is chance: every set was written and judged once.
