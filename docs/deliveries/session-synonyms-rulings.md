# Session synonyms — rulings made while building (07/11/2026)

Decisions the building session took where the plan was silent, wrong or impossible to follow as written. The design and the plan stayed the authority; none of
these changes what Lan sees or what the owner must do. Each line: what was decided, why, and what it costs if wrong. Context: [session-synonyms.md](session-synonyms.md).

| # | When | Ruling | Why | Cost if wrong |
|---|---|---|---|---|
| 1 | Start | Commit trailer names Claude Sonnet 5.5, the model that wrote the code, not the plan's Opus 5.5. | The harness gives the true author for commits. | A name in a trailer. |
| 2 | Task 1 | `pnpm test` is not green between the Task 1 and Task 2 commits: one test, `initial-prompts.spec.ts` "every initial prompt passes promptViolations", fails because the required `also_accepted` output field makes the revision 2 seed examples invalid. Task 2 replaces them. The full suite was run green at Task 2 and nothing was pushed before then. | The plan's Step 4 says the suite passes after Task 1, which cannot hold once the output field is required. | None. |
| 3 | Task 3 | `pickSessionWords` lists in `senses` every sense whose word was sent, including a repeated lemma-and-meaning pair that is sent once in `words`. | A private duplicate of a catalog word must still mark the question private. | A private mark on a question that only repeated a catalog entry (the safer side). |
| 4 | Task 3 | The stored input type of a fill-in has `session_words` optional, because rows written before have none. | Old stored AI inputs and eval examples must still parse. | None. |
| 5 | Task 7 | `clozeInput(sense)` called without a list leaves `session_words` out; the plan said default `[]`. The generator always passes a list. | A rebuilt eval example has no known session, and the nhóm B smoke (M4.12) and the delivery records say a rebuilt input has five fields. | None. |
| 6 | Task 7 | `smoke:nhom-b` failed 36 of 89 steps on its first run; both causes were fixed in the smoke. (1) Step M2.9 and the 18 steps after it: a failure already on `dev` (`chuan-bi-launch-a.md`), because the smoke holds the pointer lock 8 s while the publish transaction stops waiting after Prisma's default 5 s. The hold is now 3 s. (2) Step M4.3 put the editor's private word in the same fill-in session as W1–W3, so every fill-in there counts as private (design §5.5) and the real-judge passes selected 2 questions, not 5. The private word now has its own group and session; M4.12 compares the rebuilt input with the stored one minus `session_words`. | Keep the smoke measuring the behaviour it was written for. | The smoke measures the same behaviour with another session layout. |
| 7 | M2 | The branch of milestone 2 was cut from the head of milestone 1 while PR #228 was in CI, not from `dev` after the merge. After #228 merged, `origin/dev` was merged into it, so PR #229 shows only milestone 2. | Use the CI wait. | A rebase if #228 had needed a change. |
| 8 | M3 | Same for milestone 3 on top of #229. | Same. | Same. |
| 9 | Final fix | The seed prompt fix is a new migration (`20261111110000_cloze_session_words_prompt_by_text`), not an edit of the first one. | The first migration was already on `dev`; editing an applied migration breaks its checksum. | None. |

## Deferred minors from the final review

Not fixed, by design of the process (a minor never enters the fix pass). Details and grading: the "Final review" table in [session-synonyms.md](session-synonyms.md).

- Weak-word stats credit is covered by unit tests on the SQL text and a hand run, not by a smoke step.
- Deleting a private word typed as an alternative, while that session is open, deletes an answered item of a still-usable asked word (accepted; rare).
- "Câu tiếp" shows a spinner while a row's review is in flight.
- The history chip of an alternative answer after a hint drops "có gợi ý".
- A 409 `review-already-set` on a row (pressed in another tab) leaves the row's buttons and shows the generic error.
- No `reviewAll` test for a word typed as an alternative on one item and asked on a later one.
- The test rows stop at B2 (CEFR-J has no C1).
- The nhóm B smoke change (pointer hold 3 s, M4.3 layout), named in the as-built.
