# Decisions — AI practice questions: synonyms inside a session

Date: 06/11/2026. Goes with the design doc
[`../specs/2026-11-06-cloze-session-synonyms-design.md`](../specs/2026-11-06-cloze-session-synonyms-design.md).
This file gathers every decision settled in chat on 06/11/2026: the options that were actually put forward, their trade-offs, the
choice and who made it. The design doc says how; this file says why, and what was dropped. Written in English because the owner
switched the conversation to English.

Revised 07/11/2026: an independent review of the design
([`../reviews/2026-11-06-cloze-session-synonyms-design-review.md`](../reviews/2026-11-06-cloze-session-synonyms-design-review.md),
findings R1–R29) changed none of D1–D14 but showed gaps in how the design carried them out. Claude listed a fix per finding in chat;
the owner answered "Apply all fixes". The notes under D7, D8, D13 and D14 and the last section record what changed.

**Labels:** ✅ = chosen. **Who:** "Owner" = chosen directly in chat; "With the design" = Claude's call, listed in design §11, approved
when the owner approves the design.

Example used throughout: Lan's session holds `crucial`, `vital`, `habit`, `routine`.

## Summary

| # | Decision | Chosen | Who |
|---|---|---|---|
| D1 | A fitting word from outside the learner's set | Ignored by the judge; normal "Not quite" and retry | Owner |
| D2 | The learner's set: deck or session | The current session's words; only those go into the prompt | Owner |
| D3 | A fitting word from inside the session | Writer avoids it; if impossible, declares it and the app accepts it | Owner |
| D4 | Credit for an alternative answer | A full right for the word typed; nothing for the asked word | Owner |
| D5 | Screen after an alternative answer | Label "Alternative answer" + original sentence, no explanation | Owner |
| D6 | Still learning / Know after an alternative answer | Two rows, one per word, only on that card | Owner |
| D7 | Enter key on that card | Shortcut off; click or tap required | Owner |
| D8 | Multiple choice in a sentence | Exactly one right option of four, no synonyms among them | Owner |
| D9 | First-letter hint format | `c___`: first letter + three underscores, length hidden | Owner |
| D10 | "Check the spelling and try again" | Keep | Owner |
| D11 | Judge levels for the fill-in criterion | pass / minor (declared) / major (undeclared) | Owner |
| D12 | Test set | Sample sessions on every row; add hard vocabulary | Owner |
| D13 | Learner's private words in the session list | Sent to the writer; such a question is never judged nor copied into the test set | Owner, on Claude's proposal |
| D14 | A session word the sentence did not declare | Its own try-again message, no credit | Owner, on Claude's proposal |

## D1 — A fitting word from outside the learner's set

Context: B1 (29/10/2026) found another fitting word in most sentences; for B2 words nearly every sentence has one. The seeded judge
(`single_answer`) counts a common outside word as major.

Round 1. Claude asked whether "You are driving too ___" (answer `fast`, Lan types `quickly`) is major or minor.

| Option | Trade-off |
|---|---|
| Major | The judge fails most sentences for words like `fast`, `although`; the prompt must find better sentences |
| Minor | Accepts that learners are sometimes marked wrong for that group of words |

Owner: "50:50": learners practise by groups and know the target word; for synonyms inside the group, see D3.

Round 2. Claude, after checking the code (a wrong typed answer gets "Try again" with unlimited retries; the first hint is the first
letter):

| Option | Trade-off |
|---|---|
| Three levels: major = session word fits; minor = common outside word fits; pass = rest | Follows the owner's frame; still fails many B2 sentences as minor |

Round 3. For B2 words (`crucial`: `important`, `vital`, `critical` all fit), Claude proposed refinements:

| Option | Trade-off |
|---|---|
| Minor only when the outside word shares the first letter (the hint cannot separate it) | Mechanical; an outside critique pasted by the owner called it arbitrary ("penalised by the alphabet"); Claude noted the verdict grades the sentence, not the learner |
| Writer lists every word that fits; app recognises them; judge checks the list is complete | No dictionary needed; per-word feedback possible; larger output, harder judge task |

Round 4. Owner: learners practise by decks, so they should not use words outside it.

| Option | Trade-off |
|---|---|
| ✅ Outside words ignored entirely | Simple and matches how learners practise; Lan typing `important` still gets "Not quite" and a retry |

## D2 — The learner's set: deck or session

| Option | Trade-off |
|---|---|
| The deck (owner's wording) | Matches deck sessions; wrong for "Words due today", "Weak words", "Priority words", "All your words", which mix decks |
| ✅ The current session (Claude) | Always the words Lan is facing |

Follow-up: the prompt gets only the words picked for the session, not the whole deck (owner: "yup").

## D3 — A fitting word from inside the session

| Option | Trade-off |
|---|---|
| A (owner, round 1): detect synonyms when a word is added to a group, mark them, accept two answers when unavoidable | Needs a synonym source (none in the app) or an AI call per added word; a question written before the second word was added only accepts one |
| B (Claude): give the writer the session's words to avoid; if Lan types one, "Try again" with a specific message | No dictionary; one word credited per sentence; the avoiding can fail and Lan is still not accepted |
| Writer lists every fitting word (see D1 round 3) | Superseded by D1 round 4 |
| ✅ Merged (Claude, owner agreed): writer gets the session's words and avoids them; when impossible it declares which session words also fit, and the app accepts them | The owner's two answers without a dictionary; changes the rule that accepted answers are only forms of the asked word |

## D4 — Credit for an alternative answer

Round 1. Claude asked which word counts as practised: `crucial` (asked), `vital` (typed), or both. Owner: "vital, perhaps, or show
the actual answer". Claude: both ideas together, or credit neither (cheaper, loses a real data point).

Round 2. Owner: two sentences exist, one per word; accept either word and show the original sentence. Claude listed the cases
(normal, swapped, same word twice):

| Option | Trade-off |
|---|---|
| Credit the word the sentence asks | In "same word twice", a word Lan never typed gets a right |
| ✅ Credit the word typed (Claude) | True in every case; differs only in "same word twice" |

Round 3. Weight of an alternative answer:

| Option | Trade-off |
|---|---|
| ✅ A full right for the word typed (owner: "it's ok if she can make it as a turn to re-learn") | The asked word gets nothing and comes back later |
| Not counted, like a right answer after a hint | No credit for a word Lan did produce |

## D5 — Screen after an alternative answer

| Option | Trade-off |
|---|---|
| "Right! vital works too. This sentence was looking for crucial." (Claude) | Explains; the owner found it unnecessary |
| Plain "Right" + the original sentence (owner, round 1) | Lan may doubt she was right when she sees another word |
| ✅ "Alternative answer" label + the original sentence, no explanation (owner, round 2) | Not a straight "Right"; a fourth result to show in the summary and history |

## D6 — Still learning / Know after an alternative answer

| Option | Trade-off |
|---|---|
| The word typed only | Simple; the asked word cannot be marked |
| Hide the buttons | Simplest; no way to mark either word |
| Both words with one tap (owner) | Lan's own claim; one habitual tap moves a word she never typed |
| ✅ Two rows, one per word (Claude), shown only on the alternative card (owner: a right answer keeps today's card) | Lan decides each word; a bit more on screen; each Know follows today's rule (right, no hint, word due today) |

## D7 — Enter key on the alternative card

| Option | Trade-off |
|---|---|
| Know for both words | One key moves two schedules |
| Know for the word typed | Still moves a schedule by habit |
| Next question, both words unchanged (Claude's reading of the owner's "use the mouse") | Habitual Enter skips the buttons |
| ✅ Shortcut off (owner); a button reached with Tab and pressed still works (Claude, owner: "fine with all") | No change by habit; keyboard-only users can still leave the card |

After the review (R1, 07/11/2026): on a result card the keys `1` (Still learning) and `2` (Know) also review, and the server applies
any review to the asked word. Same intent as D7, so the design turns every result shortcut off on that card, and the server refuses a
review of an alternative item that does not name its word (design §3.2, call 15).

## D8 — Multiple choice in a sentence

Owner: the AI creates one right answer out of four, with no synonyms. Claude: the prompt already asks for it and the wrong options come
from the learner's deck mates; what is missing is the judge's measurement (`single_correct_option`). ✅

Correction after the review (R15, 07/11/2026): Claude's "the prompt already asks for it" was half true. The seed prompt's Task steps
2–3 ask that only the answer fits; nothing asks the writer to avoid a synonym that does not fit. The design adds that rule to a new
multiple-choice prompt revision (design §3.4, call 18). The criterion needs its own judge, since a judge applies every criterion of a
revision to every question (R12, design §6.2).

## D9 — First-letter hint format

| Option | Trade-off |
|---|---|
| First letter only (today; Bước 7 D9) | Cannot separate `crucial` from `critical` |
| `c______`: first letter + one underscore per letter (owner, round 1) | Separates them; reveals the length and reverses Bước 7 D9 |
| ✅ `c___`: first letter + always three underscores (owner, round 2) | Cosmetic; length stays hidden |

## D10 — "Check the spelling and try again"

| Option | Trade-off |
|---|---|
| ✅ Keep (owner) | Misleading when Lan types a correctly spelled other word |
| Neutral text, e.g. "Not the word we're looking for. Try again." | Accurate; changes existing copy |

## D11 — Judge levels for the fill-in criterion

| Option | Trade-off |
|---|---|
| Seeded `single_answer`: major = common outside word or session word fits; minor = rare word | Fails most real sentences; mixes in outside words (dropped by D1) |
| Three levels with outside words (D1 round 2), first-letter rule (round 3), complete list (round 3) | See D1 |
| ✅ pass = no other session word fits; minor = one fits and is declared; major = one fits and is not declared | Measures exactly the harm in G1 and the avoiding in G2 |

## D12 — Test set

| Option | Trade-off |
|---|---|
| ✅ Every fill-in sample gets a sample session list, about half with a near-synonym of the asked word (owner: "fine with all") | The judge can find "major" in eval runs; someone writes the lists and the choice drives the score; one fixed session per word; a new test-set version, not comparable with old scores; a little more cost per run |
| No sample sessions | No work; "major" only appears later, on real learners' questions |

Hard vocabulary: owner, "enhance the test with high level vocab" ✅ (at least 15 B2–C1 abstract adjectives and verbs with their
near-synonym partners).

## D13 — Learner's private words in the session list

Context: the first draft put Lan's private words (words she added herself) into `session_words` as Claude's call. The builder check
found that this list is stored with the question, then sent to the judge and copied into the shared test set, which breaks nhóm B
rule R6 (the judge never sees private words). The owner asked for Claude's recommendation before answering ("give you rec").

| Option | Trade-off |
|---|---|
| (a) Leave private words out of the list | Nothing private leaks; if one of her own words fits and she types it, "Not quite" |
| (b) Send them to the writer, strip them before judging and before copying | Lan protected; more code; the judge cannot see those cases; after Lan deletes a word, its spelling stays in her other stored questions |
| ✅ (c) Claude: send them to the writer; a question whose list holds a private word counts as touching a private word, so it is never judged nor copied | Today's rule for multiple choice (`touchesPrivateWord`: a private candidate sent to the AI keeps the question out even when not chosen); one more check in that function; fewer real questions judged; the deletion gap is the same as (b) and as today's private wrong options |

Owner: "Yes, both" (06/11/2026).

After the review (R11, 07/11/2026), with D13 unchanged: the stored input that held the session list is deleted after 7 days while the
question stays up to 6 months, so the "private" mark moves into the question's answer key (as `asked_private` and `option_private`
are today); a declared alternative that is a private word's form is masked in report snapshots; deleting a private word also deletes
the alternative items that credited it (design §5.5, call 21).

## D14 — A session word the sentence did not declare

Context: the builder check asked what Lan sees when the writer fails to declare a fitting session word. "Running every morning has
become a ___ for me." (asked `habit`), `routine` in her session, `also_accepted: []`: Lan types `routine` and gets "Not quite. Check
the spelling…". The app cannot accept any session word, since it cannot tell whether one fits (`habit` into "Sleep is ___ for good
health."). The owner asked for Claude's recommendation first, then for the life cycle of writing, eval and judging; Claude showed
that the judge never runs between the writer and Lan (only code checks run live; real questions are judged days later, when an
admin starts a pass).

| Option | Trade-off |
|---|---|
| (a) Leave it; rely on the writer declaring and the judge measuring | No work; Lan sees the misleading spelling message until the prompt is fixed |
| ✅ (b) A fallback message without credit: "That's another word from this session. Try again." (Claude) | The same three places (check, grading, answer card) already change; one more message in two languages and its tests; shown also for a session word that does not fit, and still true |

Owner: "Yes, both" (06/11/2026). D10 stays for words outside the session.

After the review (07/11/2026), with D14 unchanged: the message shows on every typed question, not only AI fill-in (R24, call 13); it
does not use up a try when an admin caps retries (R9, call 14); and its reason survives a reload (R20, call 22).

## Technical proposals approved with the design

Listed in design §11; they stand once the owner approves the design:
1. An alternative that is not a form of a session word is dropped and logged; the question is kept; it is not recorded as an unknown
   form.
2. In eval, a dropped entry is a problem on a passing rule result, not a rule failure (R13).
3. Only words of the same part of speech go into the list.
4. Session words carry their Vietnamese meaning; a word with none is avoided and never declared (R6).
5. No reuse rule for questions written ahead; grading uses the current session (R5).
6. A declared alternative that does not fit: major (R23). A synonym wrong option that does not fit: minor.
7. After an alternative answer, the summary lists neither word without a hint and both after a hint (R22).
8. The judge reads `input.session_words`, so eval runs need no separate session context.
9. A typed form that belongs to more than one session word (two senses of `critical`; `found` as a form of `find` and `found`):
   alternative answer, no credit, only the asked word's row (from the builder check).
10. The test set's two halves are not read separately; the run's verdict counts are read (R14).
11. The builder also drafts multiple-choice test rows with near-synonym candidates, so `single_correct_option` can fail in an eval
    run (from the builder check).
12. The session-word message covers every word of the current session, whatever its part of speech.
13. The session-word message shows on every typed question (R24).
14. A session-word try does not use up a try under a retry cap (R9).
15. Every result shortcut is off on the alternative card; the server refuses a review of an alternative item that does not name its
    word (R1).
16. The `c___` hint is formatted in the web from the hint kind (R18).
17. The new fill-in prompt ships as seed revision 3, replacing only an untouched seed revision 2 (R7).
18. The multiple-choice prompt gains a rule to prefer wrong options that are not synonyms (R15).
19. The AI quality dashboard counts an alternative answer as correct (R10).
20. A word's history shows an alternative item under both words (R10).
21. Deleting a private word also deletes the alternative items that credited it (R11).
22. The session-word reason and the alternative card survive a reload (R20).
23. The summary says how many right answers were alternative answers (R21).

Changed after the review, and why:

| Earlier proposal | Now | Why (finding) |
|---|---|---|
| A written-ahead question is reused only if the current session's same-part-of-speech words were all in its list | Dropped; proposal 5 | The list is deleted with the AI request after 7 days while an unseen question is kept up to 6 months; three places look up unseen questions; every question older than the change would be thrown away with its charged unit (R5) |
| The two halves of the test set are told apart by a `pair:` / `no-pair:` tag in each row's note and read by hand | Dropped; proposal 10 | A run never shows the notes of held-out rows (30% by default) (R14) |
| A declared alternative that does not fit: minor | Major (proposal 6) | At grading it is accepted and credited: Lan is told she is right for a word that does not fit (R23) |
| The asked word is not put on the end-of-session review list after an alternative answer | Neither without a hint, both after a hint (proposal 7) | The hints are the asked word's, so a hint says Lan needed help with it (R22) |
| The session-word message is for AI fill-in questions only | Every typed question (proposal 13) | It needs no declaration; one grading path (R24) |
| The forms for the session-word message may be computed at grading or stored when writing (left to the builder) | Computed at grading only | Stored forms would miss words of a later session and every older question (R4) |
| Session words sent as bare lemmas | With their Vietnamese meaning (proposal 4) | A lemma alone lets the writer declare a meaning Lan is not learning (R6) |

The first draft's proposal "private words go into the session list (the judge cannot see them)" became D13.

Dropped: a synonym dictionary or synonym marking when words are added (no data source); feedback naming the other fitting word.
