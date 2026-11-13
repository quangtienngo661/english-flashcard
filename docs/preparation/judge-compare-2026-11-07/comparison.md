# Opus 5.5 vs Sonnet 5.5 as the fill-in judge (07/11/2026)

**Outcome:** the owner approved the whole AI setup on 07/11/2026 (Haiku 5.5 for every task; max for fill-in, multiple choice and meaning questions, medium for lookup and the private-word check; Sonnet 5.5 high for judges): [AI_SETUP_APPROVED_2026-11-07.md](../AI_SETUP_APPROVED_2026-11-07.md).

Two Claude Code sessions, one per model, both at high effort, judged the same 102 fill-in questions on their own and blind to each other. The questions are the outputs of the golden-set eval run `57c2f4ff` (`gpt-6.1-terra`, config 10, test set version 1, 31/10/2026). Each followed the app's judge text "Chỉ một đáp án" revision 1, criterion `single_answer` ([judge-instructions.md](judge-instructions.md)), with each question worded as the app words it ([items.jsonl](items.jsonl)). Verdicts: [verdicts-opus.jsonl](verdicts-opus.jsonl), [verdicts-sonnet.jsonl](verdicts-sonnet.jsonl).

**Not the app's own judge run.** The app sends one API call per question with nothing else in context; here each model read all 102 in one conversation, under Claude Code's own instructions. Use this to choose the judge model, not as the scores the app would show. No labels exist, so this shows where the models differ, not which one is right.

## Totals

| | pass | fail_minor | fail_major | fails in all |
|---|---|---|---|---|
| Opus 5.5 | 45 | 22 | 35 | 57 |
| Sonnet 5.5 | 52 | 25 | 25 | 50 |

## Agreement

- Same verdict: **78 of 102** (Cohen's kappa 0.63).
- Same pass-or-fail: **89 of 102** (kappa 0.75).
- When both fail a question, they name at least one same other word in **46 of 47** (the 47th: `calculated` vs `calculate`, the same word).

Rows Opus, columns Sonnet:

| Opus ↓ · Sonnet → | pass | fail_minor | fail_major |
|---|---|---|---|
| pass | 42 | 3 | 0 |
| fail_minor | 7 | 13 | 2 |
| fail_major | 3 | 9 | 23 |

## What stands out

- **Opus is stricter.** It fails 57 questions to Sonnet's 50, and gives fail_major 35 times to Sonnet's 25. Most of the gap is severity: when a very common word also fits ('clean' my teeth, 'buy' oil, 'change' a ticket), Opus says major and Sonnet says minor (9 such rows, 2 the other way). The judge text says fail_major when the other word "is a very common word at the given level", which is the wording Opus's reasons follow.
- **They find the same problems.** When both fail a question, they name the same other word in 46 of 47.
- **Sonnet's passes are not explained.** All 52 of its passes carry the same sentence, "No other common word fits the blank with the same meaning."; Opus wrote a reason for each of its 45. Either Sonnet did not reason per question on passes, or the script it used to write the file filled a default for passes; this run cannot tell which. 10 of the 13 pass-or-fail disagreements are a Sonnet pass with that sentence against an Opus fail with a named word; the other 3 are Opus passes against a Sonnet fail_minor.
- **No drift through the file.** Fails in the first and second half of the ids: Opus 27 and 30, Sonnet 21 and 29.

## The 24 questions they disagree on

Held-out rows of version 1 are marked; that version is being replaced by the session-words test set. Fill the last column with your own verdict (pass / minor / major).

### Pass or fail differs (13)

| id | word (level, meaning) | sentence · accepted | Opus | Sonnet | You |
|---|---|---|---|---|---|
| 2 | scenic (B1, có phong cảnh đẹp) | We took the ___ route, which was longer but had beautiful views of the mountains. · scenic | pass: Only "scenic" fits a route chosen for its beautiful views. | minor (beautiful): 'Beautiful route' is acceptable; 'scenic' is the stronger collocation. |  |
| 6 | compete (B1, cạnh tranh) | At the Olympics, athletes from many countries ___ against one another in different sports. · compete | minor (play): "Play against one another" fits loosely, but "compete" is clearly the expected word. | pass: No other common word fits the blank with the same meaning. |  |
| 23 | department (B1, phòng, ban) | The sales ___ has three teams, each with its own manager. · department | minor (division, office): Only less common near-synonyms like "division" or "office" also fit. | pass: No other common word fits the blank with the same meaning. |  |
| 26 | recycle (A2, tái chế) | We ___ old paper by turning it into new paper instead of throwing it away. · recycle | minor (reuse): "Reuse" might be written, but turning paper into new paper is recycling. | pass: No other common word fits the blank with the same meaning. |  |
| 31 | purchase (B1, món hàng đã mua, việc mua hàng) | Keep your receipt as proof of ___ in case you need to return the item. · purchase | **major** (payment): "Proof of payment" is natural and common with the same meaning. | pass: No other common word fits the blank with the same meaning. |  |
| 33 | trip (A1, chuyến đi) | We went on a day ___ to the zoo and came home that evening. · trip | minor (out, excursion): "Day out" or "day excursion" could fit, but "day trip" is the expected phrase. | pass: No other common word fits the blank with the same meaning. |  |
| 40 (held-out) | ingredient (B1, nguyên liệu) | The recipe lists every ___ you need to make the cake, from flour and sugar to eggs. · ingredient | minor (item): "Every item you need" could fit, but "ingredient" is the expected word. | pass: No other common word fits the blank with the same meaning. |  |
| 47 (held-out) | arrive (A1, đến nơi) | Please call me as soon as you ___ at the airport. · arrive | minor (land): "As soon as you land at the airport" fits, but "land" is less basic at A1. | pass: No other common word fits the blank with the same meaning. |  |
| 53 | download (A2, tải xuống) | Click the down arrow to ___ the file from the website to your computer. · download | **major** (save): "Save the file from the website to your computer" fits naturally. | pass: No other common word fits the blank with the same meaning. |  |
| 63 | friend (A1, bạn, bạn bè) | Mai is my best ___; we play together every day. · friend | pass: "Best friend" is the only natural fit. | minor (mate): 'Best mate' is a common informal variant. |  |
| 65 | merger (B2, sự sáp nhập) | The two banks agreed to a ___, combining into a single company. · merger | minor (deal): "Agreed to a deal" fits loosely, but "merger" is the expected word. | pass: No other common word fits the blank with the same meaning. |  |
| 78 | borrow (A1, mượn) | I want to ___ a book from the library and give it back next week. · borrow | **major** (get, take): "Get/take a book from the library" fits naturally at A1. | pass: No other common word fits the blank with the same meaning. |  |
| 98 | procrastinate (B2, trì hoãn, chần chừ) | When I have an essay due, I tend to ___ by cleaning my room instead of starting it. · procrastinate | pass: No single common word fits "tend to ___ by cleaning my room". | minor (delay, stall): 'Delay' or 'stall' could fill the blank, though less naturally. |  |

### Both fail, severity differs (11)

| id | word (level, meaning) | sentence · accepted | Opus | Sonnet | You |
|---|---|---|---|---|---|
| 0 | brush (A1, chải, đánh (răng, tóc)) | I ___ my teeth twice a day, in the morning and before bed. · brush | **major** (clean): "Clean my teeth" is a natural, very common alternative to "brush my teeth" (esp. British English). | minor (clean): 'Clean my teeth' is natural too, though 'brush' is the usual collocation. |  |
| 13 | stressful (B1, căng thẳng, gây áp lực) | Having too much work and too little time can make your job very ___ and leave you feeling under pressure. · stressful | **major** (hard, difficult): "Make your job very hard/difficult" fits naturally and these are very common words. | minor (difficult, hard): 'Difficult' or 'hard' could fill the blank, though 'stressful' matches 'under pressure' best. |  |
| 20 (held-out) | import (B1, nhập khẩu) | Japan has to ___ much of its oil from other countries because it has little oil of its own. · import | **major** (buy): "Japan has to buy much of its oil from other countries" fits naturally. | minor (buy): 'Buy much of its oil from other countries' also fits, though it is less precise. |  |
| 58 | suitcase (A2, va li) | She packed her clothes in a ___ and pulled it on its wheels through the airport. · suitcase | minor (case, bag): Only "case" or a wheeled "bag" could also fit. | **major** (bag, case): 'Packed her clothes in a bag' is natural and 'bag' is very common. |  |
| 74 (held-out) | upgrade (B2, nâng cấp) | For $100, you can ___ your economy ticket to business class. · upgrade | **major** (change): "Change your economy ticket to business class" fits naturally. | minor (change, switch): 'Change your ticket to business class' fits, though it is less specific. |  |
| 77 (held-out) | wash (A1, rửa, giặt) | Please ___ your hands with soap and water before you eat. · wash | **major** (clean): "Clean your hands with soap and water" fits naturally and "clean" is very common. | minor (clean): 'Clean your hands' also fits, though 'wash' is the standard collocation. |  |
| 82 | automate (B2, tự động hóa) | We can ___ invoice payments so the system sends them on the due date without anyone having to do it. · automate | **major** (schedule): "Schedule invoice payments so the system sends them on the due date" fits naturally. | minor (schedule): 'Schedule invoice payments' also fits the sentence. |  |
| 88 | deploy (B2, triển khai (đưa phần mềm, hệ thống hoặc dịch vụ vào sử dụng thực tế trên máy chủ)) | After testing, the team will ___ the app to the production server so users can access it. · deploy | **major** (upload, release): "Upload the app to the production server" fits naturally. | minor (upload, release, push): 'Upload' or 'release' could also fit, but 'deploy' is the precise word. |  |
| 92 | abroad (A2, ở nước ngoài, ra nước ngoài) | My sister wants to study ___, in a country that is not her own. · abroad | minor (overseas): Only the close synonym "overseas" also fits. | **major** (overseas): 'Study overseas' means the same and is a very common word. |  |
| 93 | garnish (B2, trang trí món ăn) | Before serving the soup, ___ it with a few fresh parsley leaves. · garnish | **major** (decorate, top): "Decorate/top it with a few fresh parsley leaves" fits naturally. | minor (decorate, sprinkle): 'Decorate' or 'sprinkle' also fits. |  |
| 96 | revenue (B2, doanh thu) | The company's sales ___ was $1 million, before any costs were taken away. · revenue | **major** (total, turnover): "The company's sales total was $1 million" fits naturally. | minor (turnover): 'Sales turnover' is a synonym that fits, though less common. |  |


## Round 2: Sonnet 5.5 with the tuned text (07/11/2026)

Same 102 questions, same method and effort; only the judge text changed: [judge-instructions-v2.md](judge-instructions-v2.md). Verdicts: [verdicts-sonnet-v2.jsonl](verdicts-sonnet-v2.jsonl).

| | pass | fail_minor | fail_major |
|---|---|---|---|
| Opus 5.5 | 45 | 22 | 35 |
| Sonnet 5.5, round 1 | 52 | 25 | 25 |
| Sonnet 5.5, tuned | 30 | 28 | 44 |

Rows Opus, columns tuned Sonnet:

| Opus ↓ · tuned Sonnet → | pass | fail_minor | fail_major |
|---|---|---|---|
| pass | 30 | 15 | 0 |
| fail_minor | 0 | 13 | 9 |
| fail_major | 0 | 0 | 35 |

- **Nothing Opus fails is passed any more.** All 10 questions only Opus failed in round 1 now fail; all 9 that Opus called major and Sonnet minor are now major. No question is pass for one judge and major for the other (round 1 had 3).
- **Every pass has its own reason:** 30 distinct reasons for 30 passes (round 1: one sentence for all 52).
- **It overshot.** Same verdict as Opus 78 of 102, same pass-or-fail 87 of 102 (round 1: 78 and 89). The 24 differences all go one way, Sonnet stricter:
  - 15 questions Opus passed are now fail_minor, for rare words such as heed (attention), atlas (map), occupied (busy). The judge text says a rare synonym is fail_minor, so here the tuned Sonnet follows the text and Opus is the lenient one.
  - 9 questions Opus called minor are now major, for a more general word that drops part of the meaning: deal (merger), protect (encrypt), thing (ingredient), bag (suitcase). The judge text asks for a word with the same meaning, so Opus's reading looks closer here. The likely cause is the tuned text itself: it asks for more general words as candidates and says major holds even when the asked word is the usual phrase.

## Round 3: Sonnet 5.5 with the v3 text, at high and at xhigh effort (07/11/2026)

Same 102 questions and method; text [judge-instructions-v3.md](judge-instructions-v3.md) (a major needs a common word with the same meaning; a more general word is minor at most). Two sessions differ only in effort. Verdicts: [verdicts-sonnet-v3.jsonl](verdicts-sonnet-v3.jsonl) (high), [verdicts-sonnet-v3-xhigh.jsonl](verdicts-sonnet-v3-xhigh.jsonl) (xhigh).

| Run | pass | fail_minor | fail_major | same verdict as Opus | same pass-or-fail as Opus |
|---|---|---|---|---|---|
| Opus 5.5, round 1 text, high | 45 | 22 | 35 | — | — |
| Sonnet 5.5, round 1 text, high | 52 | 25 | 25 | 78 | 89 |
| Sonnet 5.5, v2 text, high | 30 | 28 | 44 | 78 | 87 |
| Sonnet 5.5, v3 text, high | 23 | 54 | 25 | 57 | 80 |
| Sonnet 5.5, v3 text, xhigh | 33 | 47 | 22 | 67 | 86 |

- **v3 overcorrected.** Its rule "a more general word is minor at most" turned 16 of Opus's majors into minor at xhigh (17 at high): cook for bake and fry, clean for wash and brush, buy for import, change for upgrade, get for borrow, save for download. A learner who writes "cook the eggs in a pan" is still marked wrong, which is what the judge text calls major, so the rule was wrong, not the judge. The 9 vaguer-word rows of round 2 did go back to minor (7 of 9 at high, 9 of 9 at xhigh).
- **Effort, with the text held the same:** high and xhigh give the same verdict on 85 of 102. xhigh passes 11 questions that high failed as minor for far-fetched words (list for menu, money for currency, gain for profit); Opus passed 9 of those 11. Majors barely move (25 at high, 22 at xhigh). So the higher effort mainly cuts weak minor flags; it does not change what counts as major. Its cost was not measured here.
- **Pass-or-fail is steady, severity is not.** Across Sonnet runs, pass-or-fail agreement with Opus stays at 80 to 89 of 102, while the major count swings from 22 to 44 with the wording. Where the line between major and minor sits is a choice in the text; without labels, each round only moves Sonnet towards or away from Opus.

## Round 4: Sonnet 5.5 with the v2 text at xhigh effort (07/11/2026)

Same 102 questions, v2 text, xhigh effort, chosen by the owner after round 3. Verdicts: [verdicts-sonnet-v2-xhigh.jsonl](verdicts-sonnet-v2-xhigh.jsonl).

| Run | pass | fail_minor | fail_major | same verdict as Opus | same pass-or-fail as Opus |
|---|---|---|---|---|---|
| Opus 5.5, round 1 text, high | 45 | 22 | 35 | — | — |
| Sonnet 5.5, v2 text, high | 30 | 28 | 44 | 78 | 87 |
| Sonnet 5.5, v2 text, xhigh | 28 | 21 | 53 | 65 | 83 |

- **Stricter, not closer.** xhigh gives 53 majors to high's 44 (Opus 35). 16 of Opus's minors become major, some defensible (uncooked for raw, yearly for annual, baggage for luggage), some not (round for game, system for database, change for ferment, extra for service: Opus and v2 at high passed all four).
- **Still catches what Opus catches, but one:** compete, where it passes "play against one another".
- **Effort works differently per text.** With v3, xhigh mainly removed weak minors; with v2, it mainly adds majors. v2's rule that any common word a learner knows makes a major gives a judge that looks harder more words to flag.
- **Run-to-run noise is not measured.** The same model and text at high and xhigh differ on 22 of 102 (v3: 17). Without the same setup run twice, part of that difference may be chance rather than effort.

## Recommendation after four rounds (07/11/2026)

- **Model: Sonnet 5.5.** With the v2 text it fails every question Opus fails, at half Opus's price per token.
- **Effort: high.** xhigh changed pass or fail on 10 to 12 questions per text without catching anything high missed; with v2 it lost one real catch (compete).
- **Text: v2, with one change still to decide and test:** whether a rare or formal synonym that a learner at the level would not write (heed, atlas, famished) makes a question fail. v2 says fail_minor, which the app counts as a fail; Opus passed those 15 questions.
- **Only pass or fail matters in the app:** the publish warning is a pass-rate drop of more than 5 points, and a judge is trusted at 85% pass-or-fail agreement with at least 30 labels. Major against minor changes no decision.
- **Not measured:** the same setup run twice (run-to-run noise, which could trip the 5-point warning on its own); the cost of a real judge pass in the app; agreement with the owner's labels.
- **Session words:** the session synonyms design replaces `single_answer` with `session_single_answer`, which ignores every word outside the session. Keeping this check means giving the new judge revision both criteria.

## Writer test: Claude Haiku 5.5 with the revised fill-in prompt (07/11/2026)

Haiku 5.5 (medium effort) wrote 102 sentences for the words of test set version 1 in a Claude Code session, from [writer-prompt-draft.md](writer-prompt-draft.md) and [inputs-v1.jsonl](inputs-v1.jsonl) only: [items-haiku.jsonl](items-haiku.jsonl). Sonnet 5.5 judged them with the v2 text at high effort, blind: [verdicts-haiku-sonnet-v2.jsonl](verdicts-haiku-sonnet-v2.jsonl). The old sentences (gpt-6.1-terra, old prompt, run of 31/10) were judged the same way in round 2.

| Sentences | pass | fail_minor | fail_major |
|---|---|---|---|
| Terra, old prompt (31/10) | 30 | 28 | 44 |
| Haiku 5.5, revised prompt | 24 | 18 | 60 |

- **Worse overall.** Per word, 11 sentences got a better verdict and 24 a worse one; pass-or-fail turned from pass to fail on 14 words and from fail to pass on 8.
- **Shorter, plainer sentences with weaker clues** (12.0 words on average against 13.3): "exchanged my dollars for the local ___" (money), "spoons of ___ in your tea" (honey), "the soup smells ___" (good), "closed a big ___" (contract). The self-check step in the prompt did not stop these.
- **Some improved:** pay close ___ (attention), played a board ___ (game), Double-___ the icon (click), made a ___ of two million dollars (profit).
- **Cannot be split between model and prompt:** both changed. Two free checks would split them: Haiku with the old prompt, and Haiku at high effort with the revised prompt. Terra with the revised prompt needs the API (about $0.20 on the OpenAI key).
- **Same caveats as the judge rounds:** Haiku wrote all 102 in one Claude Code conversation, not one API call per question as the app does; the judge's run-to-run noise is not measured.

## Writer test: Haiku 5.5 at xhigh and max effort (07/11/2026)

Same revised prompt and inputs; one Claude Code session per effort level wrote the 102 sentences ([items-haiku-xhigh.jsonl](items-haiku-xhigh.jsonl), [items-haiku-max.jsonl](items-haiku-max.jsonl)); a fresh Sonnet 5.5 session judged each blind with the v2 text at high effort ([verdicts-haiku-xhigh-sonnet-v2.jsonl](verdicts-haiku-xhigh-sonnet-v2.jsonl), [verdicts-haiku-max-sonnet-v2.jsonl](verdicts-haiku-max-sonnet-v2.jsonl)).

| Sentences | pass | fail_minor | fail_major | words per sentence |
|---|---|---|---|---|
| Terra, old prompt (31/10) | 30 | 28 | 44 | 13.3 |
| Haiku 5.5, revised prompt, medium | 24 | 18 | 60 | 12.0 |
| Haiku 5.5, revised prompt, xhigh | 30 | 17 | 55 | 12.7 |
| Haiku 5.5, revised prompt, max | 48 | 20 | 34 | 13.4 |

- **Only max clearly beats the old sentences.** Against Terra, max turns 27 failing words into passes and 9 passing ones into fails; xhigh turns 12 each way. From xhigh to max: 22 fail to pass, 4 pass to fail.
- **24 words fail as major in all four sets:** brush, bake, souvenir, increase, purchase, slice, hire, maintain, download, developer, strategy, suitcase, urgent, manage, wash, organize, clutter, deploy, turnover, tidy, garnish, layover, revenue, lucrative. A common word with nearly the same meaning exists for each (clean, cook, piece, plan, save…); a prompt may not be able to fix these.
- **One sample per effort level.** Neither the writer nor the judge was run twice, so how much of the xhigh-to-max jump is chance is not known.
- **Not measured: time and cost of one call in the app.** Max wrote 102 sentences in about 7 minutes in one conversation, about 4 s a sentence; the app stops a call after 10 s (setting `callTimeoutSeconds`), and earlier Haiku calls at default effort took up to 8.6 s.

## Why the majors stay high (07/11/2026)

- **The same 24 words fail as major in every set.** All 24 are among Haiku max's 34 majors. Each has a real near-synonym that a learner knows: cook for bake, piece for slice, plan for strategy, programmer for developer, yearly for annual, overseas for abroad, neat for tidy, income for revenue, profitable for lucrative, mess for clutter. One natural sentence can rarely shut such a word out.
- **The rule counts these as major** (v2: any common word a learner knows that fits with the same meaning), even where the learner's word is correct English.
- **A first-letter hint would rule out almost all of them.** In 31 of Haiku max's 34 majors, and 41 of the 44 majors of the old Terra sentences, every competing word starts with a different letter from the asked word (b___ rules out cook). The exceptions: remember/recall, purchase/payment, revenue/receipts, ingredient/item, cuisine/cooking. The app already has this hint (hint 1 of a fill-in, c___), but the learner opens it and loses Know; showing it from the start would be a product decision, not a prompt change.

## Writer test: Sonnet 5.5 at medium effort (07/11/2026)

Same revised prompt and inputs ([items-sonnet-medium.jsonl](items-sonnet-medium.jsonl)), judged the same way ([verdicts-sonnet-medium-writer-sonnet-v2.jsonl](verdicts-sonnet-medium-writer-sonnet-v2.jsonl)).

| Writer | pass | fail_minor | fail_major |
|---|---|---|---|
| Terra, old prompt (31/10) | 30 | 28 | 44 |
| Haiku 5.5 medium | 24 | 18 | 60 |
| Haiku 5.5 xhigh | 30 | 17 | 55 |
| Haiku 5.5 max | 48 | 20 | 34 |
| Sonnet 5.5 medium | 39 | 19 | 44 |

- **Sonnet at medium sits between Terra and Haiku at max.** Against Haiku max it passes 11 words Haiku failed and fails 20 Haiku passed.
- **23 words fail as major in all five sets** (the 24 of the earlier section without download).
- **A first letter would rule out 43 of Sonnet's 44 majors** (the exception: server, where computer and system remain).
- One sample each; per-call time and cost in the app not measured (Haiku max needs a real call; Sonnet costs 20 times Haiku per token).

## Writer test: all seven sets (07/11/2026)

Sonnet 5.5 at high and xhigh added ([items-sonnet-high.jsonl](items-sonnet-high.jsonl), [items-sonnet-xhigh.jsonl](items-sonnet-xhigh.jsonl)), judged the same way ([verdicts-sonnet-high-writer-sonnet-v2.jsonl](verdicts-sonnet-high-writer-sonnet-v2.jsonl), [verdicts-sonnet-xhigh-writer-sonnet-v2.jsonl](verdicts-sonnet-xhigh-writer-sonnet-v2.jsonl)).

| Writer | pass | fail_minor | fail_major | words per sentence | majors a first letter would not rule out |
|---|---|---|---|---|---|
| Terra, old prompt (31/10) | 30 | 28 | 44 | 13.3 | 3 |
| Haiku 5.5 medium | 24 | 18 | 60 | 12.0 | 5 |
| Haiku 5.5 xhigh | 30 | 17 | 55 | 12.7 | 3 |
| Haiku 5.5 max | 48 | 20 | 34 | 13.4 | 3 |
| Sonnet 5.5 medium | 39 | 19 | 44 | 12.9 | 1 |
| Sonnet 5.5 high | 37 | 17 | 48 | 14.3 | 4 |
| Sonnet 5.5 xhigh | 54 | 18 | 30 | 16.0 | 1 |

- **Only the top effort of each model stands out:** Sonnet xhigh (54 pass) and Haiku max (48). Below that the order is not steady (Sonnet high under medium; Haiku xhigh level with Terra), which suggests one run moves by several passes on chance alone.
- **Sonnet xhigh against Haiku max:** 16 words fail to pass, 10 pass to fail; 6 more passes and 4 fewer majors. Sonnet costs 20 times Haiku per token, and xhigh thinks more, so per question it likely costs several times Haiku max; not measured.
- **21 words fail as major in all seven sets.** In every set a first letter would rule out all but 1 to 5 of the majors.

## Outcome (owner, 07/11/2026)

The experiment ends here. The owner will use, and publish later in the admin, the two texts tested here:

- **Judge:** [judge-instructions-v2.md](judge-instructions-v2.md) ("Chỉ một đáp án", criterion single_answer), measured on Claude Sonnet 5.5 at high effort. The v2.1 variant (same rules, examples moved to the examples field) was not run.
- **Fill-in writer:** [writer-prompt-draft.md](writer-prompt-draft.md) (plan Appendix A plus the self-check, the reasons and new examples).

Still open when they are published: the writer model and effort (Haiku 5.5 max and Sonnet 5.5 xhigh led; neither timed or priced on a real call, and the app stops a call after 10 s); whether rare synonyms fail a question under v2; whether to keep single_answer next to the session-words criterion (design §6.1 drops it); and the 21 words no writer could make single-answer, for which a first-letter hint is the product option found here. All runs here were Claude Code sessions, not the app's per-question API calls, each run once.

## Multiple-choice writer test: Haiku 5.5 at medium and max (07/11/2026)

The 20 near-synonym rows (one near-synonym of the answer among 4 candidates each), notes removed: [mcq-inputs.jsonl](mcq-inputs.jsonl). Prompt: the starter multiple-choice prompt with the plan Appendix B rule, [mcq-writer-prompt.md](mcq-writer-prompt.md). Judge: plan Appendix C2 ("Một lựa chọn đúng"), [mcq-judge-instructions.md](mcq-judge-instructions.md), Sonnet 5.5 at high effort, blind.

| Writer | near-synonym used as a wrong choice | pass | fail_minor | fail_major |
|---|---|---|---|---|
| Haiku 5.5 medium ([items](mcq-items-haiku-medium.jsonl), [verdicts](verdicts-mcq-haiku-medium.jsonl)) | 0 of 20 | 18 | 0 | 2 |
| Haiku 5.5 max ([items](mcq-items-haiku-max.jsonl), [verdicts](verdicts-mcq-haiku-max.jsonl)) | 0 of 20 | 20 | 0 | 0 |

- **The Appendix B rule works at both levels:** neither writer used the near-synonym as a wrong choice.
- **Medium's two majors** are wrong choices that fit the sentence frame: "The engineer will ___ that the bridge is safe" takes repeat; "The mistake was ___ to everyone" was judged to take hidden ("hidden from" is the usual phrase, so this one is arguable).
- **20 questions only**, each set written and judged once: 2 against 0 is a weak signal, in the same direction as the fill-in test.

## Meaning-question writer test: Haiku 5.5 at medium and max (07/11/2026)

20 inputs written for the test ([meaning-inputs.jsonl](meaning-inputs.jsonl)): 15 words with several meanings (match, spring, note, interest, capital, order, party…) where the wrong choices include other meanings of the same word, as the app picks them first, and 5 easy words. The local catalog has one meaning per word, so it could not supply these. Prompt: the starter prompt unchanged ([meaning-writer-prompt.md](meaning-writer-prompt.md)). Judge: a new draft, "Một nghĩa đúng", criterion single_meaning ([meaning-judge-instructions.md](meaning-judge-instructions.md)), Sonnet 5.5 at high effort, blind.

| Writer | pass | fail_minor | fail_major |
|---|---|---|---|
| Haiku 5.5 medium ([items](meaning-items-haiku-medium.jsonl), [verdicts](verdicts-meaning-haiku-medium.jsonl)) | 18 | 0 | 2 |
| Haiku 5.5 max ([items](meaning-items-haiku-max.jsonl), [verdicts](verdicts-meaning-haiku-max.jsonl)) | 20 | 0 | 0 |

- **Medium's two majors used the wrong meaning:** asked for party as "đảng (chính trị)", it wrote "a birthday party at my house"; asked for order as "trật tự, thứ tự", it wrote "the waiter brought my order". In both it fell back to the word's most common meaning. The app's rule check (word_in_sentence) cannot catch this. Max wrote "The party wants to help all the people in our country."
- 20 questions only, each set written and judged once; the inputs and the judge text were written for this test and are unreviewed.

## AI lookup and private-word check: Haiku 5.5 at medium and max (07/11/2026)

Starter prompts, copied from the code ([lookup-writer-prompt.md](lookup-writer-prompt.md), [private-writer-prompt.md](private-writer-prompt.md)). Inputs and answer keys written for the test: [lookup-inputs.jsonl](lookup-inputs.jsonl) with [lookup-answers.jsonl](lookup-answers.jsonl) (irregular forms, misspellings, a phrasal verb, words whose sentence picks a less common meaning) and [private-inputs.jsonl](private-inputs.jsonl) with [private-answers.jsonl](private-answers.jsonl) (10 real words incl. slang, idiom, product name, rare word; 10 to reject: misspellings, a Vietnamese word, a made-up word, false friends such as library = hiệu sách). The lookup meaning was also judged blind by Sonnet 5.5 at high effort with a new draft judge ([lookup-judge-instructions.md](lookup-judge-instructions.md)).

| Haiku 5.5 | private-word check, right verdicts | lookup: lemma and part of speech on the key | lookup judge: pass / minor / major |
|---|---|---|---|
| medium | 20 of 20 | 20 of 20 | 20 / 0 / 0 ([verdicts](verdicts-lookup-haiku-medium.jsonl)) |
| max | 20 of 20 | 20 of 20 | 20 / 0 / 0 ([verdicts](verdicts-lookup-haiku-max.jsonl)) |

- No difference between the two levels on either task, so medium is enough for both: the lookup is the one AI task the learner waits for.
- 20 inputs each, run once; inputs, keys and the judge text were written for the test and are unreviewed.
