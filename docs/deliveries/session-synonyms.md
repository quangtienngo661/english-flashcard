# Session synonyms — plan summary (07/11/2026)

Plan: [`../superpowers/plans/2026-11-07-session-synonyms.md`](../superpowers/plans/2026-11-07-session-synonyms.md). Design:
[`../superpowers/specs/2026-11-06-cloze-session-synonyms-design.md`](../superpowers/specs/2026-11-06-cloze-session-synonyms-design.md). Four milestones,
one branch and one PR into `dev` each, in order. Written in English because the owner switched the conversation to English.

## M1 — Writing (API)

1. The fill-in operation takes the session's words and returns the declared alternatives; the fake AI learns a scenario that declares one.
2. The new fill-in prompt ships as starter revision 3, only where nobody published another prompt.
3. Practice sends the session's other words, with their meanings, to the writer.
4. Practice checks the declared alternatives and keeps them, with private marks, in the answer key.
5. A question with a private session word is never judged or copied, and staff see private alternatives masked.
6. The eval rule lists unknown alternatives without failing the question.
7. Old smokes re-run; PR.

## M2 — Grading and credit (API)

8. A pure function sorts a typed answer into right, alternative, another session word, or other.
9. Grading writes alternative answers and session-word tries; a session-word try never uses up a try.
10. The answer reply carries the two rows (typed word, asked word).
11. A review names its word; reviewing an alternative without a word is refused.
12. The summary lists and reviews alternative answers per word, and counts them.
13. Stats, history, the delete check and private-word cleanup follow the typed word.
14. New smoke `smoke:session-synonyms`, old smokes re-run; PR.

## M3 — Learner web

15. The `c___` hint and the session-word message.
16. The "Alternative answer" card: two rows, keys off, rows review without moving on.
17. Summary rows by word, the alternatives line, history and Recent lines.
18. Browser pass with screenshots, e2e; PR.

## M4 — Test set and close-out

19. Test rows with session words and hard vocabulary, plus multiple-choice rows with near-synonyms, for the owner to import.
20. As-built record and the owner's steps (prompts, judges, import, eval); PR.


---

# Session synonyms — as-built (07/11/2026)

Built by one session working through the plan task by task (the "Native" method the owner chose), then one fresh review of the whole change on the most
capable model. Written in English, like the design. Nothing here was run against a real AI model: the writer's behaviour with real models is still
unmeasured (design §14).

## What merged

| PR | Tasks | Merge into `dev` | What |
|---|---|---|---|
| [#228](https://github.com/quangtienngo661/english-flashcard/pull/228) | 1–7 | `6e080f34` | Writing: `generate_cloze` v2 (`session_words`, `also_accepted`), fake model `fake:alternative`, seed config 3 of the fill-in prompt, session words sent and stored, declared alternatives kept in the answer key with private marks, eval rule `unknown-alternative`. Also the design, decisions, review, plan and code facts. |
| [#229](https://github.com/quangtienngo661/english-flashcard/pull/229) | 8–14 | `6ab84d35` | Grading and credit: the typed-answer match, alternative answers and session-word tries, the two-row reply, per-word reviews, summary and Review all, stats, history, probe and cleanup, `smoke:session-synonyms`. |
| [#230](https://github.com/quangtienngo661/english-flashcard/pull/230) | 15–18 | `41afb2f5` | Learner web: the session-word message, the `c___` hint, the "Alternative answer" card, summary rows by word, history and Recent lines, browser pass. |
| [#231](https://github.com/quangtienngo661/english-flashcard/pull/231) | review fixes | 4d977142 | Two fixes from the final review (below). |
| this PR | 19–20 | — | Test rows for the owner to import, this record, the saved smoke output, the browser screenshots. |

## Evidence

- API 4784 unit tests (335 files), web 933 (90 files); admin untouched. `pnpm lint`, typecheck and the schema drift check are clean.
- Smokes on fresh databases against the built API and worker (fake provider, exported variables only): `smoke:session-synonyms` 12 steps, `smoke:buoc-4`
  all checks, `smoke:buoc-7` 30 steps, `smoke:nhom-b` 89 steps. Output of the last run, on the build that includes the review fixes:
  [`session-synonyms-smoke-output.txt`](session-synonyms-smoke-output.txt).
- Web e2e `m5a.spec.ts` in the Linux container: 20 passed, 2 flaky that passed on retry (5 s first-load timeouts in the AI-states and long-sentence tests).
- Browser pass (one session of three AI fill-ins, learner web on a private API with `fake:alternative`): [`session-synonyms-screens/`](session-synonyms-screens/).
  Seen: the alternative card with its label, the sentence with the asked word bold, the reveal line, the translation and two rows; Enter, 1 and 2 changed
  nothing (no review, no next question, one item in the database); the typed row's button wrote only `alternative_review_action`; an undeclared session
  word gave "Đây là một từ khác trong phiên này. Gõ lại." with "Lần 1"; hint 1 showed `z___`; after the hint neither row had Know; the summary said "Trong đó 2
  đáp án thay thế", kept a word pressed earlier as pressed, and its row button wrote the typed column of its own item.

## Decided while building (the plan stayed the authority)

- Small choices on points the plan left open or got wrong (every one is a `Ruling:` line in [`session-synonyms-rulings.md`](session-synonyms-rulings.md)): `pickSessionWords` lists every sense whose word was sent, a repeated lemma-and-meaning pair included, so a private duplicate
  of a catalog word still marks the question private; `clozeInput(sense)` without a list leaves `session_words` out (a rebuilt eval example has no known session), while the
  generator always passes a list; `AnswersService` gets `ContentService` to read the session's senses at grading; the card shows a pending row with the project's
  Button spinner (React Aria drops `aria-busy`).
- `smoke:nhom-b` was changed in two ways, both named here so the nhóm B record does not describe a smoke that no longer exists: (1) M4.3 now practises the editor's
  private word in a session of its own, because a fill-in written in a session that holds a private word counts as private (design §5.5) and the real-judge passes
  selected 2 questions instead of 5; M4.12 compares the rebuilt example input with the data the AI was sent minus `session_words`. (2) M2.9 holds the pointer lock 3 s instead
  of 8 s: that step was already failing on `dev` (the publish transaction stops waiting after Prisma's default 5 s; see `chuan-bi-launch-a.md`), and it hid 18 later steps.
- Milestones 2 and 3 were cut from the previous milestone's head while its CI ran, and `dev` was merged in after each merge, so every PR showed only its own work.
- The review fix for the seed prompt is a new migration: the first one was already on `dev`, and editing an applied migration breaks its checksum.
- Environment: no `.env` was written in the worktree (a hook blocks it); the API and worker ran on port 3010 with exported variables, the learner web in a container on
  3011, so the owner's containers on 3000, 3001 and 5173 were left alone. The database `english_learning_smoke_nb`, which `smoke:nhom-b` requires fresh by name, was dropped
  and created again (nothing was connected to it).

## Final review

A fresh reviewer on the most capable model read the whole change (design, plan, ledger and code): 0 Critical, 2 Important, 8 Minor, 10 lines it set aside.

| # | Finding | Result |
|---|---|---|
| 1 Important | A group deleted in another tab turned a wrong typed answer into a 404 (grading reads the group; before, it never did) | Fixed in #231: a 404 from reading the session's words means no session words; test red first |
| 2 Important | The seed migration replaced the prompt only if it was published by the system actor, but nhóm B's switch-over copied the admin who chose a model into `published_by`, so on the owner's database it very likely only printed a notice | Fixed in #231: a new migration replaces the live config wherever its text equals seed revision 2; two simulated owner databases checked |
| 3 Minor | Weak-word stats credit is covered by unit tests on the SQL text and a hand run, not by a smoke step | Deferred |
| 4 Minor | Deleting a private word that was typed as an alternative, while that session is open, deletes an answered item of a still-usable asked word; the round-1 cursor can move back and the word may be planned again (one more question, one more AI unit) | Accepted: rare (the learner deletes her own word mid-session); a later fix could null the typed columns instead of deleting when the session is open |
| 5 Minor | "Câu tiếp" shows a spinner while a row's review is in flight | Deferred |
| 6 Minor | The history chip of an alternative answer after a hint drops "có gợi ý" | Deferred |
| 7 Minor | A 409 `review-already-set` on a row (pressed in another tab) leaves the row's buttons and shows the generic error, as today's card does | Deferred |
| 8 Minor | No `reviewAll` test for a word typed as an alternative on one item and asked on a later one | Deferred |
| 9 Minor | The test rows stop at B2: CEFR-J has no C1 | Documented in `docs/preparation/eval-sets/README.md`; the owner accepts it when reviewing the rows |
| 10 Minor | The nhóm B smoke change | Named above |

The reviewer's lines it set aside (for example the report snapshot showing a learner's typed answers to staff, and a private word's lemma staying in the AI input for 7 days) follow
the design as written (§5.5, D13).

## Not verified

- Anything with a real model: whether a writer avoids or declares session words reliably, keeps to the meanings given, and how often the rules reject a sentence.
  The judge criteria `session_single_answer` and `single_correct_option` have no labels yet; calibration restarts from zero (design §6.3).
- The migrations on the owner's own database. The prompt migration has two simulated owner states behind it (a model chosen by an admin; an edited text), not the real one.
- The learner web in dark mode, on a phone and in English; with a screen reader; or a web build from before this change against the new API.
- A group deleted during a session, and the weak-word stats credit, have no smoke step.

## The owner's steps, in order

1. Check the live fill-in prompt. After the next deploy of the API, open Admin → AI → Prompts → `generate_cloze`: the text should start "You write one English practice sentence…" and mention
   `session_words`. If it is still the old text, the migration found an edited prompt and printed a notice: create a draft with plan Appendix A, run the eval, publish.
2. Add a revision to the multiple-choice prompt with plan Appendix B (the rule "prefer candidates that are not synonyms or near-synonyms of answer_form").
3. On the Judge page add the new revision of "Chỉ một đáp án" (criterion `session_single_answer`, plan Appendix C1) and the new judge "Một lựa chọn đúng" (C2), and choose their models
   (the judge must be an Anthropic model).
4. Import the rows in `docs/preparation/eval-sets/` (README there), review them, freeze the set as a new version.
5. Run the eval on the new version and label some results; calibration restarts (design §6.3).
6. Start real-question passes with the config filter set to the new prompt's config number, since older questions have no `session_words`.
