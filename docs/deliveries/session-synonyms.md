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
