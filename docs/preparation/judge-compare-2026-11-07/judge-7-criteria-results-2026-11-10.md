# 7-criteria judge on the API: first run (10/11/2026)

Claude Sonnet 5.5 at high effort, Message Batches API, judged the same 200 sentences as the Opus 5.5 medium v2 run (Haiku 5.5 xhigh and
Terra xhigh, words 0–99) with the proposal's text [judge-instructions-7-criteria.md](judge-instructions-7-criteria.md), copied
unchanged from `docs/preparation/JUDGE_CRITERIA_PROPOSAL_2026-11-10.md` §7. Run by the owner with [terra-write-judge.mjs](terra-write-judge.mjs).
Every non-pass with its sentence and reason, and the cross-table against v2: [judge-7-criteria-details-2026-11-10.txt](judge-7-criteria-details-2026-11-10.txt).

| Criterion | Haiku pass / minor / major | Terra pass / minor / major |
|---|---|---|
| single_answer | 45 / 49 / 6 | 48 / 47 / 5 |
| session_single_answer | 100 / 0 / 0 | 100 / 0 / 0 |
| sense_match | 96 / 4 / 0 | 97 / 3 / 0 |
| enough_clue | 96 / 4 / 0 | 97 / 3 / 0 |
| grammar_natural | 96 / 4 / 0 | 93 / 6 / 1 |
| level_fit | 23 / 66 / 11 | 39 / 57 / 4 |
| translation_ok | 97 / 3 / 0 | 95 / 5 / 0 |
| every criterion pass | 9 | 20 |
| no major on any criterion | 85 | 90 |
| judge cost (batch) | US$0.41, US$0.0041 a sentence | US$0.41, US$0.0041 a sentence |

For comparison, Opus 5.5 medium with text v2 (single_answer only) on the same sentences: Haiku 39 / 29 / 32, Terra 45 / 36 / 19.

## Findings

1. **Sonnet did not think at all.** All 200 answers report 0 thinking tokens (`usage.output_tokens_details.thinking_tokens`); the median
   answer is 347 output tokens, about the length of seven one-sentence reasons. Opus medium thought about 200 tokens per sentence (2 and 5
   of 100 with none). The request omits `thinking`, as the app does, so adaptive thinking applies; at high effort Sonnet chose to skip it
   for this task. The guidance doc of 07/11 ([PROMPT_GUIDANCE](../PROMPT_GUIDANCE_HAIKU_SONNET_TERRA_2026-11-07.md), from Anthropic's
   Sonnet 5.5 prompting page) says: for JSON answers that need working out, add "Think the problem through before you answer." at the
   end of the system prompt, or use xhigh. Not tested yet. The earlier Sonnet-high judge results came from Claude Code sessions, where
   the model reasoned in the conversation, so they do not show this.
2. **single_answer majors fell from 32 and 19 to 6 and 5 on the same sentences.** The writers did not change; the judge did. 21 of
   Haiku's and 16 of Terra's v2 majors became minor, with reasons such as "Close synonyms such as employ … could fit, but hire is by far
   the most common choice" and "neat also fits … as a close synonym". Six Haiku v2 majors became pass, some with wrong reasons (wash:
   "clean does not fit after 'to'"; bake: "make or cook are less specific"). Likely causes, not separated yet: no thinking (finding 1),
   and the new text, which calls "close variants" minor and drops v2's candidate list, its worked examples, "or below" after the level,
   and "even when the given word is the more usual collocation". The v3 text showed the same drift on 07/11.
3. **level_fit fails most sentences.** 77 of Haiku's and 61 of Terra's. The majors are partly real (Haiku's A1 sentences use bristles,
   tangles, cartoon characters, cinnamon), but most minors are guesses about common words ("board" and "together" above A1, "met" above
   A1) or "the sentence is long". One major (#18 meeting, Terra) says in its own reason that no word is two levels above.
4. **enough_clue passed all four spelling-clue sentences** (embark "BARK", garnish "seven letters", layover "starts with L", delicious
   "starts with D"): the text does not say the clue must be about meaning.
5. **grammar_natural found real problems** the other criteria cannot: accepted_answers listing a form that does not fit (encrypting,
   interfaces). It missed work, where "worked" fits as well as "works": no criterion asks whether another form of the word also fits.
6. **session_single_answer is untested:** test set v1 has no session words, so every sentence passes it.
7. **sense_match and translation_ok** flagged a few sentences, mostly fair (tax revenue is not doanh thu), some nitpicks (Happy Birthday).
