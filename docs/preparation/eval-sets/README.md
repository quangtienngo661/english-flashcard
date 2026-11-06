# Eval sets for the session synonyms change (draft, 07/11/2026)

Two JSON Lines files for the owner to import into the AI test set (design `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` §7).
Written by the builder; **the owner reviews them before freezing**. Nothing here was run against a real model.

| File | Operation | Rows | `held_out` |
|---|---|---|---|
| `generate_cloze-session-words-2026-11.jsonl` | `generate_cloze` | 121 | 37 (31%) |
| `generate_sentence_mcq-near-synonyms-2026-11.jsonl` | `generate_sentence_mcq` | 20 | 6 (30%) |

## The fill-in file

- The first 100 rows are the draft golden set `golden-set-generate_cloze-100.jsonl` (from the `english-learning-ai-guide` worktree, untracked there)
  with its words, levels, meanings, `expected.forms` and `split` unchanged. 21 rows were added: B2 adjectives and verbs where synonyms are common
  (`crucial`, `vital`, `enhance`, `reluctant`, `unwilling`, `boost`, `probable`, `swift`, `adequate`, `fundamental`, `odd`, `contemporary`, `urge`,
  `supply`, `anticipate`, `assemble`, `purchase` (verb), `cure`, `neat`, and two with no partner, `exceed` and `tough`). Their levels come from the CEFR-J
  list `docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`; CEFR-J stops at B2, so there is no C1 row.
- Every row has `session_words`: 3 to 6 `{ word, meaning_vi }` entries, all of the same part of speech as the asked word, all lemmas of the CEFR-J
  list. 54 rows include a near-synonym partner of the asked word (`note` starts `pair:`, for example `pair: crucial ~ vital`); 67 include none (`note` is
  `no-pair`). The partners and their Vietnamese meanings are the builder's draft: check each one, since a weak partner (`game ~ sport`) only tests less.
- The two halves are not read separately: a run shows verdict counts per criterion, and held-out rows hide their notes (design §7, R14). The notes are
  for people reading the dev rows.
- The fill-in judge criterion `session_single_answer` reads `input.session_words`, so run it only on a new version made from this file; older versions
  have no `session_words` and are not scored by it (design §6.3).

Golden words that do not match CEFR-J, kept as the golden set has them: 12 have another level there (`contract` B1 → B2, `laundry` A2 → B2, `import`,
`investor`, `browser`, `purchase` (noun), `profit` B1 → B2, `click`, `screen`, `left` A1 → A2, `fry` A2 → B1, `luggage` A2 → B1) and 18 are app words that
CEFR-J does not have (`app`, `stakeholder`, `developer`, `embark`, `cuisine`, `wireless`, `landmark`, `encrypt`, `interface`, `ferment`, `automate`,
`clutter`, `deploy`, `turnover`, `liability`, `garnish`, `layover`, `procrastinate`). They stay as asked words but never appear as session words, which come from
CEFR-J lemmas only.

## The multiple-choice file

20 rows for `generate_sentence_mcq`: the asked word in its base form as `answer_form`, and 4 `candidates` in the same form, one of them a near-synonym of
the answer (named in `note`), the others unrelated words of the same part of speech. Base forms keep every candidate a CEFR-J lemma. The judge
`single_correct_option` (plan Appendix C2) should fail a run where the writer picks the near-synonym as a wrong option.

## Importing

Admin → AI → Eval → bulk import (`.jsonl`, at most 1000 rows, 2 MB). Choose the operation, then the file: every line is flat, with the input fields
beside `expected`, `split` and `note`; the import takes the input from every key except those three. Review the rows, then freeze the set as a new
version. **Scores on a version made from these files are not comparable with earlier versions** (design §7).

Each row was also checked against the gateway's input schema (`OPERATIONS.generate_cloze.validateInput` and `generate_sentence_mcq`): 0 invalid.
