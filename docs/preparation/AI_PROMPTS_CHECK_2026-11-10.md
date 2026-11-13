# AI prompts checked against the 10/11/2026 decisions

Each AI task's approved writer prompt and judge ([AI_SETUP_APPROVED_2026-11-07.md](AI_SETUP_APPROVED_2026-11-07.md)) read against what the
10/11 tests and owner decisions settled. Nothing here is changed yet; the approved setup stays as it is until the owner approves a
change. Evidence for the decisions: [judge-compare-2026-11-07/owner-labels-vs-judges-2026-11-10.txt](judge-compare-2026-11-07/owner-labels-vs-judges-2026-11-10.txt),
[judge-compare-2026-11-07/judge-instructions-6-criteria-split.md](judge-compare-2026-11-07/judge-instructions-6-criteria-split.md) (its header).

## What was settled on 10/11/2026

1. No level check in the judge (owner). Readability is not checked either (owner: "not a big issue until now").
2. Fill-in judge: a more general word that fits passes (clean for wash); a common word with the same meaning fails (employ for hire)
   (owner, both). Reason: a typed answer gets "try again" while `practice.type_word_max_retries` allows it, unset by default
   (`apps/api/src/practice/answers/answers.service.ts`), and the try-again box says to check the spelling (`apps/web/messages/vi.json`,
   `tryAgainBody`), which is wrong for a same-meaning word.
   **Reversed later on 10/11 (owner):** this repeated a choice already made in the session-synonyms decisions of 06/11, D1 (a word from
   outside the learner's session is ignored by the judge), D10 (the spelling line stays, knowingly) and D11 (the judge checks only session
   words); Claude had not read that record before asking. The owner kept D1: the fill-in judge has no `single_answer` (finding B).
3. Sonnet 5.5 at high effort through the API, with the app's request shape (structured output, no `thinking` field), gave 0 thinking
   tokens on all 200 answers of the 7-criteria judge; adding "Think the problem through before you answer." at the end of the
   instructions gave thinking on 98 of the 100 later answers (five runs of 20; medians 438 to 566 tokens) and stricter, more specific
   verdicts.
4. A clue about letters or spelling is a major fault (Terra wrote four: "seven letters", "starts with D", …).
5. Haiku 5.5 at max is too slow for a call made during practice: 40.7 s for one fill-in sentence, and 117 s to past 145 s on hard words,
   some with no answer (09/11 measurements in the approved doc).

## Per task

| Task | Approved writer | Approved judge | Status after 10/11 |
|---|---|---|---|
| `generate_cloze` | Haiku max, [writer-prompt-draft.md](judge-compare-2026-11-07/writer-prompt-draft.md) | v2, `single_answer` only, no think line | **Writer and judge both out of date** (A, B, E) |
| `generate_sentence_mcq` | Haiku max, [mcq-writer-prompt.md](judge-compare-2026-11-07/mcq-writer-prompt.md) | [mcq-judge-instructions.md](judge-compare-2026-11-07/mcq-judge-instructions.md), no think line | Judge needs the think line (C); writer effort (E) |
| `generate_meaning_question` | Haiku max, [meaning-writer-prompt.md](judge-compare-2026-11-07/meaning-writer-prompt.md) | [meaning-judge-instructions.md](judge-compare-2026-11-07/meaning-judge-instructions.md), no think line | Judge needs the think line (C); writer effort (E) |
| `lookup_word` | Haiku medium, [lookup-writer-prompt.md](judge-compare-2026-11-07/lookup-writer-prompt.md) | [lookup-judge-instructions.md](judge-compare-2026-11-07/lookup-judge-instructions.md), no think line | Judge needs the think line (C) |
| `check_private_word` | Haiku medium, [private-writer-prompt.md](judge-compare-2026-11-07/private-writer-prompt.md) | none (scored against a key) | No change |
| `translate_sentence` | none | none | No app feature calls it |

## Findings

**A. The fill-in writer still forbids more general words, which the judge now allows.** Draft 1 (approved) task step 3, rules 2 and 3
(`writer-prompt-draft.md` lines 53, 58, 59) and draft 2.1 (lines 25, 32, 34) tell the writer that "more general words that a learner at
this level or below knows must not fit", with "cook fits most sentences about roast" as the example. Under decision 2 that work is no
longer needed. It is likely what produces the "name the competing word and rule it out" sentences ("I can ___, but I can't cook"),
two of which the owner marked unclear, and it adds thinking time. Proposal: a draft 3 that asks only that no common word with the same
meaning fits, keeps draft 2's rules on meaning-only clues (rule 3), answer forms (rules 8, 9) and the translation (rule 10), and drops
the "rule it out" technique. **Written 10/11 (owner approved):**
[judge-compare-2026-11-07/writer-prompt-draft-3.md](judge-compare-2026-11-07/writer-prompt-draft-3.md). **Tested 10/11 on the 20
words:** Terra xhigh 19 of 20 with no major (draft 1: 15), 12.9 s a sentence (23.3 s), half the cost; Haiku xhigh unchanged in quality
(16 of 20), median 9.1 s (10.8 s). Table and sentences at the end of the draft. **Adopted 10/11 (owner)** as the approved fill-in
writer prompt ([AI_SETUP_APPROVED_2026-11-07.md](AI_SETUP_APPROVED_2026-11-07.md)); then replaced the same day by
[draft 3.1](judge-compare-2026-11-07/writer-prompt-draft-3-1.md), which asks for a sign of the form when two forms fit (owner), with a
matching fail_minor in the judge's `grammar_natural`; draft 3.1 is not tested. Writing it found
that the split judge's own example ("clean" for wash) used a test word; it now uses "say" for whisper, and the judge file notes that the
10/11 runs had the old wording.

**B. The fill-in judge in the approved setup is v2 with one criterion.** Replace it with
[judge-instructions-6-criteria-split.md](judge-compare-2026-11-07/judge-instructions-6-criteria-split.md) (6 criteria, the split,
the think line). On the 40 hand-labelled sentences it matched the owner on 23 of 37 (v2 with Opus: 15 of 37). Also settles the approved
doc's open item "whether to keep `single_answer` next to `session_single_answer`": keep both. **Approved 10/11 (owner)** as the
fill-in judge ([AI_SETUP_APPROVED_2026-11-07.md](AI_SETUP_APPROVED_2026-11-07.md)). **Then archived the same day (owner)** in favour
of design D1: the fill-in judge is [judge-compare-2026-11-07/judge-instructions-5-criteria.md](judge-compare-2026-11-07/judge-instructions-5-criteria.md),
the split judge without `single_answer`; the open item is settled the way design §6.1 had it (dropped). Not run as a judge yet; the
draft-3 verdicts recounted without `single_answer` give Haiku 18 and Terra 17 of 20 passing every criterion.

**C. The three other judges have no think line.** `mcq-judge-instructions.md`, `meaning-judge-instructions.md` and
`lookup-judge-instructions.md` end at the answer format. Their 20/20 results came from Claude Code sessions, where the model reasons in
the conversation, as the first 7-criteria results did; through the API they may not think at all (decision 3). Not measured for these
three. Proposal: add the line to each, then run each judge once through the API on its 20 test answers and read the thinking tokens.
**Line added 10/11 (owner approved)** to all three files; `terra-write-judge.mjs judge --items <file>` now runs a judge on another
task's saved answers. **Run 10/11 by the owner** (Batch API, US$0.11 for 60 answers): with the line, most answers still had no
thinking (median 0; 12, 16 and 17 of 20 with none for multiple choice, meaning and lookup). Verdicts: 20, 20 and 19 of 20 pass, the one
minor fair (the lookup of "mice" defines the plural). So these simpler judges agree with the 07/11 results, but the test sets contain no
bad answer, so it is not shown that the judges would catch one. Still open: a few deliberately wrong answers per task (a distractor that
fits, a sentence that allows another meaning, a wrong lemma) would show it; or effort xhigh, which the guidance doc names as the other
way to get thinking.

**D. A "minor" verdict is a fail in the app.** The publish gate counts only pass as passed (`apps/api/src/ai/judge/judge-stats.ts`,
`gateTally`), and a real question with any minor is failing (`apps/api/src/practice/quality/real-questions.ts`, `isFailing`). The split
judge gives minor when only a rare same-meaning word fits (memento for souvenir, case for suitcase, encode for encrypt: 5 of 40), so
those sentences count as failures. Open decision (the approved doc's "rare synonym (heed for attention)" item). **Moot since 10/11:**
the approved fill-in judge has no `single_answer`. A minor still counts as a fail for the other criteria, by design (D11: a declared
session word is minor).

**E. Haiku max is the approved effort for three writers** (fill-in, multiple choice, meaning) but is too slow for a call made during
practice (decision 5). Open decision, tied to where questions are written: during practice (the app's 10 s limit applies) or ahead of
time in a shared bank (time does not matter). Measured on the API on 10/11 (fill-in only): Haiku xhigh 11.2 s a sentence, Terra xhigh
23.3 s on the 20 hard words; nothing under 10 s yet. **Decided 10/11 (owner):** fill-in GPT-6.1 Terra xhigh (with draft 3: 19 of
20 with no major, 12.9 s); multiple choice and meaning Haiku xhigh (not tried at that effort); lookup and private-word check Haiku
medium; judges Sonnet high with the think line; AI call time limit 30 s (`ai.call_timeout_seconds`, the highest allowed). Recorded in
[AI_SETUP_APPROVED_2026-11-07.md](AI_SETUP_APPROVED_2026-11-07.md).

**Not a change: multiple choice keeps failing any distractor that fits.** The split of decision 2 is for typed answers only. A chosen
option has no retry (`answers.service.ts`: an `mcq` answer is right or wrong at once), so a more general word among the options marks the
learner wrong. `mcq-judge-instructions.md` already says "fail_major when a distractor also fits the blank naturally".
