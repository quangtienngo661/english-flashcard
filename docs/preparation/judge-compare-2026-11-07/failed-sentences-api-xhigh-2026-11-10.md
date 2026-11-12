# Failed fill-in sentences: Haiku 5.5 xhigh and Terra xhigh, judged by Opus 5.5 medium (10/11/2026)

Real API calls made by the owner with [terra-write-judge.mjs](terra-write-judge.mjs). Each writer wrote one sentence for each of the
words with id 0–99 of [inputs-v1.jsonl](inputs-v1.jsonl), from the approved prompt [writer-prompt-draft.md](writer-prompt-draft.md).
Claude Opus 5.5 at medium effort judged every sentence once, through the Message Batches API, with judge text
[v2](judge-instructions-v2.md) (criterion `single_answer`). Raw data: `items-api-*`, `calls-api-*`, `verdicts-api-*-opus-medium-v2.jsonl`.

| Writer | pass | fail_minor | fail_major | writer cost per sentence | median time |
|---|---|---|---|---|---|
| Claude Haiku 5.5, xhigh | 39 | 29 | 32 | US$0.0013 | 9.6 s |
| GPT-6.1 Terra, xhigh | 45 | 36 | 19 | US$0.0077 | 20 s |

## Why the majors happen

In 50 of the 51 majors a common word fits the blank: a word with the same meaning in 28 (raise for increase, employ for hire,
neat for tidy, income for revenue), a broader everyday word in 22 (make for bake, piece for slice, bag for suitcase, change for upgrade).
The last one is a missing form: "worked" also fits Terra's sentence for work, but only "works" is accepted.

**The main cause is the word, not the writer.** 12 words are major in both runs here: estimate, increase, slice, hire, suitcase, landmark,
manage, organize, deploy, tidy, revenue, lucrative. Ten of them (all but estimate and landmark) were also major in all seven earlier sets
judged by Sonnet 5.5 high (Terra old prompt; Haiku medium, xhigh, max; Sonnet medium, high, xhigh), so in nine writer runs, two models
and two judges. Each has a near-synonym a learner knows that fits almost any natural sentence about that meaning. Prompt wording, model
and effort have not moved them; a fix has to come from the exercise itself.

**The rest is writer quality, and a better writer fixes part of it.** Terra avoided 10 of Haiku's majors with a tighter collocation:
"I can ___, but I can't cook; my cakes are good" (bake), "deep-___ them in hot oil" (fry), "Can I ___ your bike from you" (borrow).
Haiku avoided 4 of Terra's (boil, download, cuisine, work).

**Showing the first letter would rule out the competing word in 46 of the 51 majors** (29 of Haiku's 32, 17 of Terra's 19; one more,
revenue, partly). It does not help with payment for purchase (p), Wi-Fi for wireless (w), chaos for clutter (c), and the two missing
forms (worked; the plural revenues). This matches the earlier sets (31 of 34, 41 of 44). The `first letter rules it out` column below
gives it per sentence.

## Other problems the judge does not look for

- **Spelling clues instead of meaning (Terra, 4 sentences):** #57 embark ("had lost its first two letters, leaving only 'BARK'"), #93
  garnish ("the answer … has seven letters"), #94 layover ("that word that starts with L"), #97 delicious ("my favorite word that starts
  with D"). Three passed and one is minor; none teaches the word. The writer prompt has no rule against this.
- **The word given away (Haiku, 1 sentence):** #64 "We left all our ___ at the station's left luggage office". Rule 1 of the prompt forbids
  it. The app would not show it: practice drops a sentence that shows the word outside the blank (`apps/api/src/practice/ai/ai-checks.ts`,
  `checkCloze` and `revealsWord`), so it costs a call but does not reach the learner.
- **The judge at medium is not steady on near-identical sentences:** turnover "had a ___ of £…" is major for Haiku and minor for Terra;
  clutter "visual ___" is minor for Haiku and major for Terra; download with "get" fitting is pass for Haiku and major for Terra. Each
  sentence was judged once, so run-to-run noise is not measured.

## The judge's criteria (text v2)

Full text: [judge-instructions-v2.md](judge-instructions-v2.md). One criterion, `single_answer`: "Is the given word, in the forms of
accepted_answers, the only answer that fits the blank?" The judge works it in two steps:

1. **Find candidates:** at least three English words a learner might write in the blank instead: synonyms of the word, more general
   words, and words that fit the sentence's grammar and clues. The forms in accepted_answers are left out.
2. **Judge each candidate:** a candidate fits when the completed sentence is natural English and keeps the meaning in meaning_vi.

| Verdict | When |
|---|---|
| `fail_major` | A fitting candidate is a common word a learner at the given level or below knows (most A1–B1 words), even when the given word is the more usual collocation; or a word in the session's words fits |
| `fail_minor` | Every fitting candidate is rare, formal, regional, or a close variant of the word ("though" for "although") |
| `pass` | No candidate fits |

The reason names the word that fits (a fail) or the closest candidate tried and why it does not fit (a pass). Four worked examples in the
text: begin → "start" fits (major); cook → "make" fits although "cook dinner" is the usual phrase (major); although → only "though" fits
(minor); thirsty → "hot" is natural but means nóng (pass).

**What the criterion does not check:** whether the sentence teaches the word (the spelling clues above pass), whether the word appears
elsewhere in the sentence, grammar or naturalness beyond the blank, the level of the other words, and the Vietnamese translation. Per
[comparison.md](comparison.md), the app only uses pass against fail (a fail_minor counts as a fail).

## The failed sentences

The `also fits` and `cause` columns are a hand reading of the judge's reason: `synonym` is a common word with the same meaning,
`general` a broader everyday word. Minors are mostly rare or formal words a learner at the level would not type; the app counts them as
fails all the same.

## Claude Haiku 5.5, xhigh: 32 major

| id | word (level) | sentence | accepted | also fits | cause | first letter rules it out | judge reason |
|---|---|---|---|---|---|---|---|
| 12 | install (B1) | You need administrator rights to ___ new programs on this shared computer. | install | set up | synonym | yes | Common words such as "set up", "put" (put programs on a computer) and "add" fit naturally and keep the meaning "cài đặt", so a learner writing one of them would be marked wrong. |
| 13 | stressful (B1) | Unlike my relaxing weekends by the lake, the last weeks before the merger were very ___ for everyone in the office. | stressful | tense | synonym | yes | "Tense" (căng thẳng) fits naturally and keeps the meaning, and common words like "difficult" or "hard" also fit the contrast with "relaxing". |
| 17 | estimate (B1) | The builder ___ the cost of the new kitchen at about 8,000 dollars, based on the plans. | estimated | calculated | synonym | yes | "Calculated" (a common B1 word) fits naturally: "calculated the cost ... at about 8,000 dollars, based on the plans" keeps the sense of ước tính, and "put the cost at" also works. |
| 19 | bake (A2) | Every morning, the café staff arrive before dawn to ___ fresh bread in the oven. | bake | make | general | yes | "Make" fits naturally ("make fresh bread in the oven") and is a common A1 word, so a learner who writes it would be marked wrong. |
| 21 | souvenir (B1) | Tourists usually buy a cheap ___ at the airport, like a keyring or a mug printed with the city name. | souvenir | gift | general | yes | "Gift" (or "present") fits naturally, as in "buy a cheap gift at the airport, like a keyring or a mug", and is a common A2 word that keeps the sense of quà. |
| 22 | increase (A2) | As soon as the road was clear, the driver ___ his speed and overtook the truck. | increased | raised | synonym | yes | The common words 'raised' and 'picked up' fit naturally ('raised his speed', 'picked up his speed') and keep the meaning 'tăng', but would be marked wrong. |
| 31 | purchase (B1) | Please keep your receipt as proof of ___ if you want to return the shoes. | purchase | payment | synonym | no (p) | "Payment" fits naturally ("proof of payment" is a very common phrase for a receipt), and a B1 learner knows it, so that learner would be marked wrong. |
| 35 | slice (A2) | Add a thin ___ of lemon to your tea for extra flavour. | slice | piece | general | yes | "Piece" fits naturally in "a thin piece of lemon", keeps the meaning "miếng mỏng", and is a common A1 word. |
| 38 | hire (B1) | The shop plans to ___ three extra staff for the busy Christmas season. | hire | employ | synonym | yes | "Employ" fits naturally ("plans to employ three extra staff") with the same meaning and is a common word at B1 level; "recruit" also fits. |
| 43 | fry (A2) | Crispy chips are made by ___ thin potato slices in hot oil until golden brown. | frying | cooking | general | yes | "Cooking" fits naturally ("made by cooking thin potato slices in hot oil"), keeps the frying meaning because of "in hot oil", and is a common A1 word. |
| 50 | stakeholder (B2) | Unlike shareholders, who mainly care about profit, every ___ with an interest in the company, from workers to local residents, deserves a voice in major decisions. | stakeholder | party | general | yes | The common words "party" and "group" fit naturally ("every party/group with an interest in the company"), and the phrase "with an interest in" already supplies the meaning "bên liên quan". |
| 54 | developer (B2) | She works as a freelance web ___ and builds online shops for small businesses. | developer | programmer | synonym | yes | "Programmer" fits: "a freelance web programmer" is natural, means exactly "lập trình viên", and is a common word a B2 learner knows. |
| 57 | embark (B2) | The soldiers ___ for France at dawn, their boots still wet from the quay. | embarked | sailed | general | yes | "Sailed" (and also "left" or "set off") fits naturally in "___ for France at dawn" with the quay as a clue, and these are common words a B2 learner knows. |
| 58 | suitcase (A2) | Before the trip, I spent an hour packing my clothes into a large ___ with wheels. | suitcase | bag | general | yes | The common A1 word "bag" fits naturally ("packing my clothes into a large bag with wheels"), and so does "case", so a learner who writes either would be marked wrong. |
| 64 | luggage (A2) | We left all our ___ at the station's left luggage office while we visited the museum. | luggage | bags | synonym; the word is also in the sentence | yes | "Bags" fits naturally ("left all our bags at the left luggage office") and is a common A1 word meaning luggage; "baggage" and "things" also fit. |
| 65 | merger (B2) | Regulators approved the ___ of the two banks, creating the largest lender in the country. | merger | combination | general | yes | "Combination" fits naturally ("approved the combination of the two banks"), keeps the meaning of sáp nhập, and is a common word a B2 learner knows; formal options like "consolidation" and "amalgamation" also fit. |
| 69 | wireless (B2) | Staff can connect their laptops from any room because the office has a ___ network. | wireless | Wi-Fi | synonym | no (w) | "Wi-Fi" fits naturally ("the office has a Wi-Fi network"), keeps the meaning of "không dây", and is a word almost every learner knows. |
| 70 | urgent (B1) | The letter was stamped ___, so the courier delivered it to the office within the hour. | urgent | express | synonym | yes | "Express" (and "priority") fits naturally, as in "stamped express," keeps the sense of fast, urgent handling, and is a word B1 learners know. |
| 73 | landmark (B2) | The old clock tower is a well-known city ___ that tourists photograph from every angle. | landmark | attraction | synonym | yes | "Attraction" (a common B1 word) fits naturally, as in "a well-known city attraction that tourists photograph", and keeps the sense of a famous place, as does "monument". |
| 74 | upgrade (B2) | My old laptop is too slow for video editing, so I plan to ___ its processor to a faster model this summer. | upgrade | change | general | yes | "Change" fits naturally ("change its processor to a faster model") and is a common A1 word, so a learner could write it and be marked wrong. |
| 76 | manage (A2) | The new director will ___ a budget of two million dollars for the whole department. | manage | control | synonym | yes | "Control" (and also "handle") fits naturally in "will ___ a budget" with the meaning of managing it, and both are common words an A2–B1 learner knows. |
| 77 | wash (A1) | Mum put the dirty socks in the machine to ___ them. | wash | clean | general | yes | "Clean" fits naturally ("put the dirty socks in the machine to clean them"), keeps the meaning of giặt, and is a common A1 word. |
| 78 | borrow (A1) | Can I ___ your pen for a minute? I'll give it back after class. | borrow | use | general | yes | The common A1 words "use", "have" and "take" all fit naturally ("Can I use your pen for a minute? I'll give it back"), and in this context they convey borrowing. |
| 79 | organize (A2) | Parents at our school ___ a bake sale every spring to raise money for the library. | organize, organise | hold | synonym | yes | "Hold" (and also "have" or "run") fits naturally in "hold a bake sale" with the meaning tổ chức, and A2 learners commonly know it. |
| 88 | deploy (B2) | If the new build crashes, the engineers can ___ the previous version to the servers within minutes. | deploy | push | synonym | yes | Common words like "push" or "upload" (and the variant "redeploy") fit naturally in "___ the previous version to the servers" with the same meaning, so a learner who writes them would be marked wrong. |
| 89 | turnover (B2) | Last year the company had a ___ of £50 million, up 10% on the year before. | turnover | revenue | synonym | yes | "Revenue" fits naturally ("had a revenue of £50 million"), means total sales, and is a business word a B2 learner is likely to know. |
| 90 | tidy (A2) | Mum asked us to keep our bedrooms ___ and put all the toys back in the box. | tidy | neat | synonym | yes | "Neat" (and also "clean") fits naturally in "keep our bedrooms ___" with the meaning gọn gàng, and both are common words an A2 learner knows. |
| 93 | garnish (B2) | Before serving the soup, the chef will ___ it with a sprig of parsley, mainly for colour. | garnish | decorate | general | yes | "Decorate" fits naturally ("decorate it with a sprig of parsley, mainly for colour"), keeps the meaning "trang trí", and is a common word learners know; "top" also fits. |
| 94 | layover (B2) | The airline offered us a free hotel room during our ___ in Istanbul, because our connecting flight was cancelled. | layover | stop | general | yes | The common word "stop" (and the synonym "stopover") fits naturally, as in "during our stop in Istanbul", and keeps the meaning of a connecting-flight stop. |
| 96 | revenue (B2) | Falling tax ___ forced the city council to cut spending on parks and libraries. | revenue | income | synonym; plural "revenues" missing | partly | The common B1 word "income" fits naturally ("falling tax income" keeps the meaning of public earnings), and the plural "revenues", which is very common in this phrase, is not among the accepted answers. |
| 97 | delicious (A1) | The bakery on our street smells absolutely ___ every morning, like warm bread and cinnamon. | delicious | amazing | general | yes | Common words like "amazing" or "wonderful" fit naturally ("smells absolutely amazing"), and "yummy" keeps the meaning "ngon", so a learner could be marked wrong. |
| 99 | lucrative (B2) | After ten years of teaching, she quit to pursue a ___ career in investment banking that could make her a millionaire. | lucrative | well-paid | synonym | yes | "Well-paid" (or "profitable") fits the blank naturally and keeps the meaning of high earnings, and both are common words a B2 learner knows. |

## Claude Haiku 5.5, xhigh: 29 minor

| id | word (level) | sentence | accepted | judge reason |
|---|---|---|---|---|
| 1 | attention (A2) | Please pay ___ to the teacher while she explains the new grammar. | attention | Only the rare, formal word "heed" ("pay heed to") fits with the same meaning; "respect" also fits the grammar but means "tôn trọng", not "sự chú ý". |
| 2 | scenic (B1) | Rather than rushing down the highway, we took the slower ___ route through the hills, stopping often to admire the lakes. | scenic | Only the less common 'picturesque' fits well, since 'the slower beautiful route' sounds awkward without 'more' or a comma, and 'country' or 'mountain' route fit the grammar but do not mean 'có phong cảnh đẹp'. |
| 6 | compete (B1) | Small shops find it hard to ___ with large supermarkets on price. | compete | Only rare or formal words such as "vie" or "contend" fit naturally with "with ... on price", while common words like "fight" or "deal" sound unnatural or change the meaning. |
| 8 | receipt (A2) | Please keep your ___ as proof of purchase if you want to return the item. | receipt | Only the formal word "invoice" fits naturally; "bill" means a request for payment and "ticket" is not proof of purchase for returns. |
| 10 | partner (A1) | Our company has signed a deal with a new business ___ in Japan, and we will share the profits equally. | partner | 'Associate' (business associate) could fit, but it is a less common, more formal word than A1 level; 'client' and 'customer' do not fit the equal profit-sharing clue. |
| 11 | app (A2) | The bank has a new mobile ___ that lets you check your balance and pay bills. | app | Only "application", the full form of "app", fits naturally ("mobile application"); "service" and "website" change the meaning away from "ứng dụng". |
| 14 | menu (A2) | The waiter handed us the ___ so we could choose two starters and a main course. | menu | No other common word fits ("list" and "card" sound unnatural here), but the plural "menus" is natural and is missing from accepted_answers. |
| 16 | laundry (A2) | The hotel's ___ service washed and ironed my shirts overnight. | laundry | Only less natural options fit, such as the redundant "washing" service or the formal "valet" service; "cleaning" service suggests room cleaning, not đồ giặt. |
| 18 | meeting (A1) | Our weekly team ___ every Monday morning lasts about an hour. | meeting | Only less common words such as "briefing" or "catch-up" fit as a meeting; "call" (a phone call) and "practice" (a training session) are natural but change the meaning away from "cuộc họp". |
| 23 | department (B1) | Dr. Lee is a professor in the chemistry ___ at our university. | department | "Faculty" could fit ("the chemistry faculty"), but it is a less common, more formal word above B1; "lab" and "class" do not keep the meaning or sound natural. |
| 25 | investor (B1) | A wealthy ___ agreed to put two million dollars into the start-up, hoping to sell its shares for a much higher price later. | investor | Only the less common near-synonym "backer" (or "venture capitalist") keeps the meaning; "businessman" is natural but means "doanh nhân", not "nhà đầu tư". |
| 27 | remember (A1) | I still ___ the first time I saw the sea, when the water looked so bright and blue. | remember | "Recall" fits naturally and means nhớ, but it is a more formal word that few A1 learners would write; "love" and "picture" change the meaning or sound unnatural. |
| 30 | raw (A2) | Doctors warn people not to eat cookie dough made with ___ eggs, because they can carry harmful bacteria. | raw | "Uncooked" fits with the same meaning, but it is a less common, more formal word for an A2 learner; "fresh" and "rotten" change the meaning. |
| 36 | brand (A2) | The cheaper medicine works just as well as the expensive ___ name, but it costs much less. | brand | Only the rare, technical 'trade' (trade name) also fits; common words like 'company' or 'product' sound unnatural before 'name' here. |
| 45 | profit (B1) | The bakery sold all its bread by noon, and after paying rent and wages it made a small ___. | profit | Only the formal word "surplus" fits naturally with the meaning of lợi nhuận; common words like "gain" or "amount" sound awkward, and "loss" reverses the meaning. |
| 46 | screen (A1) | My phone's ___ is cracked, so I can barely read the messages on it. | screen | "Display" fits and means màn hình, but it is less common than "screen" and above A1 level; "glass" and "case" change the meaning. |
| 49 | maintain (B1) | Airlines are required by law to ___ their aircraft to strict safety standards. | maintain | "Service" fits with the meaning bảo dưỡng, but as a verb it is less common at B1; "keep" is awkward without "up to", and "build" changes the meaning. |
| 55 | strategy (A2) | Chess is a game of ___, and the best players think several moves ahead. | strategy | "Tactics" fits naturally and is close in meaning, but it is a less common B2+ word; "skill" also fits but means "kỹ năng", not "chiến lược". |
| 62 | hungry (A1) | I'm not ___ right now because I just had a big lunch. | hungry | Only less common variants like "starving" or the British "peckish" fit; common words such as "thirsty" or "full" clash with the meaning or the logic of the sentence. |
| 63 | friend (A1) | When we moved to a new city, it took my son a long time to make new ___. | friends | Only informal or regional variants such as "buddies", "pals" or the British "mates" fit "make new ___", and few A1 learners would write them. |
| 68 | tea (A1) | My grandmother likes to add fresh mint leaves to hot water and make a pot of ___ after dinner. | tea | Only rare or formal words like "infusion" or "tisane" also fit, while the common "coffee" does not fit because the drink is made from mint leaves in hot water. |
| 71 | busy (A1) | I can't go out tonight because I am too ___ with my homework. | busy | Only less common words like "occupied" or "swamped" fit with the meaning "bận rộn"; common words like "tired" do not fit naturally with "with my homework" and change the meaning. |
| 75 | encrypt (B2) | Before sending the file, ___ it so that only a recipient with the matching decryption key can read its contents. | encrypt, encrypting | Only the close variant "encode" (also 'mã hóa') fits, while "lock" and "secure" do not mean 'mã hóa' and clash with the 'decryption key' clue. |
| 82 | automate (B2) | Since the new robots arrived, the factory can now ___ most of its assembly line, so machines do the work with little human help. | automate | Only rarer close variants such as "mechanize" or "robotize" fit, while common words like "run" or "operate" do not mean "tự động hóa". |
| 84 | online (A2) | She signed up for an ___ English course so she can study from home on her laptop. | online | The article 'an' rules out 'virtual' and 'distance', but 'internet' or 'e-learning' could fit; these are marginal variants, as 'an internet English course' sounds dated and 'e-learning' is formal. |
| 85 | annual (B1) | Shareholders will vote on the new budget at the company's ___ general meeting in March. | annual | "Yearly" keeps the meaning, but "yearly general meeting" is an unusual variant of the fixed term "annual general meeting"; "next" fits the grammar but loses the meaning "hằng năm". |
| 86 | clutter (B2) | Her minimalist apartment felt calm and spacious because it had no visual ___ on the counters or floors. | clutter | The modifier 'visual' strongly favours 'clutter'; 'mess' is awkward after 'visual', and only less common options like 'chaos' or 'noise' fit, with a slightly different meaning. |
| 92 | abroad (A2) | She hopes to study ___ next year, so she practises her English every day. | abroad | "Overseas" fits with the same meaning, but it is a less common, higher-level synonym; "hard" also fits the grammar but changes the meaning away from "ở nước ngoài". |
| 95 | remote (A2) | Our tour guide took us to a ___ mountain village where there is no electricity and the nearest road is two days away. | remote | Only less common words like "isolated", "distant" or "faraway" also fit with the meaning "hẻo lánh"; common A2 words such as "small" or "poor" are natural but change the meaning. |

## GPT-6.1 Terra, xhigh: 19 major

| id | word (level) | sentence | accepted | also fits | cause | first letter rules it out | judge reason |
|---|---|---|---|---|---|---|---|
| 2 | scenic (B1) | We followed the signs for the ___ route and drove past lakes and mountains instead of taking the motorway. | scenic | beautiful | general | yes | "Beautiful" is a common A1 word that fits the blank and keeps the meaning 'có phong cảnh đẹp' ("the beautiful route ... past lakes and mountains"), even though "scenic route" is the usual phrase on signs. |
| 5 | boil (A2) | I'll ___ the kettle; it's full of water, and we need hot water for tea. | boil | heat | general | yes | "Heat" (or "turn on") fits naturally in "I'll ___ the kettle" with the meaning of heating water, and both are common at A2 level. |
| 17 | estimate (B1) | From photos taken from above, the team ___ the number of people in the crowd to be somewhere between 1,000 and 2,000. | estimated | calculated | synonym | yes | "Calculated" (and loosely "guessed") fits naturally, as in "the team calculated the number of people to be between 1,000 and 2,000", and keeps the meaning of ước tính; both are common words a B1 learner knows. |
| 22 | increase (A2) | The teacher wants to ___ the amount of time we spend reading by 10 minutes a day so we can read more books. | increase | raise | synonym | yes | "Raise" (and also "extend") fits naturally, as in "raise the amount of time by 10 minutes a day", keeps the meaning "tăng", and is a common word a learner at this level may write. |
| 35 | slice (A2) | At this shop, you can buy pizza by the ___ instead of ordering a whole one. | slice | piece | general | yes | The common A1 word "piece" fits: "buy pizza by the piece" is natural English and keeps the meaning "miếng". |
| 38 | hire (B1) | As manager, she can ___ and fire staff, so she decides who joins the team and who has to leave. | hire | employ | synonym | yes | "Employ" (a common B1 word) also fits: "she can employ and fire staff" is natural and keeps the meaning, even though "hire and fire" is the usual phrase. |
| 49 | maintain (B1) | The school pays workers to ___ its buildings: they clean them, paint them, and fix anything that breaks. | maintain | look after | synonym | yes | Common phrases like "look after" or "take care of" fit the blank naturally and keep the meaning of caring for the buildings by cleaning, painting and fixing them. |
| 53 | download (A2) | There isn't enough space on my phone to ___ the video over Wi-Fi. | download | get | general | yes | The common A1 word "get" fits naturally ("to get the video over Wi-Fi") with the meaning of downloading, and the space clue also invites "save". |
| 58 | suitcase (A2) | Dad spends so much time on business trips that he lives out of a ___. | suitcase | bag | general | yes | "Bag" fits naturally ("he lives out of a bag" is a common phrasing for a traveller's luggage), and it is a common A1 word. |
| 59 | cuisine (B2) | Italian and Japanese are two of my favourite ___; each has a wide range of traditional dishes. | cuisines | foods | general | yes | "Foods" fits naturally ("Italian and Japanese are two of my favourite foods") and is a common A1 word that keeps the meaning of ẩm thực. |
| 73 | landmark (B2) | The old stone bridge isn't a tourist attraction, but it's a well-known local ___ that people use when giving directions. | landmark | place | general | yes | The common word "place" (and also "spot") fits naturally in "a well-known local ___ that people use when giving directions" and keeps the meaning of a well-known local site. |
| 76 | manage (A2) | At our family shop, my aunt has to ___ both the workers and the money. | manage | handle | synonym | yes | "Handle" (and arguably "control") fits naturally: "my aunt has to handle both the workers and the money" keeps the meaning of managing, and learners at this level commonly know it. |
| 79 | organize (A2) | Can you ___ the school trip, not just plan it, but also book the bus and buy the tickets? | organize, organise | arrange | synonym | yes | "Arrange" fits naturally ("Can you arrange the school trip... book the bus and buy the tickets?"), keeps the meaning of tổ chức, and is a common word learners at this level know. |
| 83 | work (A1) | My mother ___ for a bank from nine to five, Monday to Friday. | works | worked | form missing from the answers | no | The past form 'worked' also fits naturally, since nothing in the sentence forces the present tense, but only 'works' is accepted; other candidates such as 'labours' or 'toils' are rare. |
| 86 | clutter (B2) | A few baskets can keep toys and books out of sight and reduce visual ___ in the room. | clutter | mess | synonym | no (chaos) | Common words like "mess" or "chaos" also fit naturally ("reduce visual mess/chaos in the room") and keep the meaning of untidiness, but they would be marked wrong. |
| 88 | deploy (B2) | We will use Helm to ___ the app to Kubernetes after pushing its image to a registry. | deploy | install | synonym | yes | The common word "install" (Helm's own command is "helm install") fits naturally and keeps the meaning of putting the app onto Kubernetes, and "ship" or "roll out" could also fill the blank. |
| 90 | tidy (A2) | I always put my toys away to keep my room clean and ___. | tidy | neat | synonym | yes | "Neat" fits naturally ("clean and neat"), means gọn gàng, and is a common word learners at this level know. |
| 96 | revenue (B2) | Last year, the shop's gross sales ___ was $2 million, but it made no profit after paying its costs. | revenue | income | synonym | yes | Common words like "income" or "total" ("the shop's gross sales income/total was $2 million") fit naturally and keep the meaning, and "turnover" also fits. |
| 99 | lucrative (B2) | She accepted a highly ___ job offer that would pay her $500,000 a year. | lucrative | paid | general | yes | "Paid" fits naturally ("a highly paid job offer"), keeps the meaning of high earnings, and is a common word learners at B2 or below know. |

## GPT-6.1 Terra, xhigh: 36 minor

| id | word (level) | sentence | accepted | judge reason |
|---|---|---|---|---|
| 1 | attention (A2) | Please pay ___ to the teacher when she speaks. | attention | Only the rare, formal word "heed" ("pay heed to") also fits; "respect" fits the grammar but means honour, not "sự chú ý". |
| 4 | contract (B1) | I signed a three-year ___ of employment with the company. | contract | 'Agreement' could fill the blank, but 'agreement of employment' is less natural than the fixed phrase 'contract of employment', so few learners would choose it. |
| 10 | partner (A1) | Lan is my business ___; we started a shop together and we each own half of it. | partner | Only the formal, less common 'associate' (or the close variant 'co-owner') could fit; common words like 'colleague' or 'friend' do not match the co-ownership clue. |
| 11 | app (A2) | I downloaded a weather ___ on my phone to see if it will rain. | app | Only the close variant "application" fits naturally; "program" and "widget" sound unnatural or are rare for a phone weather download. |
| 13 | stressful (B1) | The work was easy, but the short deadline made it ___; I felt under pressure until I finished. | stressful | "Tense" also fits and means căng thẳng, but it is a less common B2 word here; "hard" and "difficult" are natural but mean khó, not căng thẳng. |
| 18 | meeting (A1) | The teacher called a ___ with the parents to talk about the school trip. | meeting | Only the more formal 'conference' fits naturally ('called a conference with the parents'), while words like 'talk', 'discussion' or 'meet' sound unnatural after 'called a'. |
| 21 | souvenir (B1) | I bought myself a tiny model of the Eiffel Tower as a ___ to remember my trip to Paris. | souvenir | Only the less common near-synonyms "keepsake" and "memento" fit naturally; "gift" clashes with "bought myself", and "reminder" sounds redundant before "to remember". |
| 23 | department (B1) | The company has a ___ of Human Resources, which is divided into three teams. | department, Department | "Division" also fits ("a division of Human Resources"), but it is a less common, B2-level word; "office" is blocked by the article "a", and "section" would mean only part of HR. |
| 24 | debt (B1) | After buying the car, Lan was $5,000 in ___ to the bank. | debt | Only rare or informal words like "arrears" or "hock" also fit "in ___ to the bank"; common words like "trouble" or "loan" do not fit naturally. |
| 27 | remember (A1) | I met her yesterday, but I can't ___ her name. What is it? | remember | "Recall" fits naturally and means nhớ, but it is a more formal B2 word that few A1 learners would write; "know" and "say" are unnatural or change the meaning. |
| 30 | raw (A2) | I like my carrots ___, so I eat them without cooking them. | raw | Only "uncooked" fits with the meaning "chưa nấu chín", and it is a less common close variant; "fresh" and "crunchy" are natural but mean "tươi" and "giòn", not "sống". |
| 31 | purchase (B1) | We put off the ___ of a new car until we had saved enough money. | purchase | Only the formal 'acquisition' and the stilted 'buying' ('the buying of a new car') fit; the common verb 'buy' does not fit after 'the ... of'. |
| 33 | trip (A1) | We went on a day ___ to see Grandma and came home that evening. | trip | Only the British 'day out' or the rarer 'day outing' fit here; common words like 'journey' or 'visit' sound unnatural after 'a day'. |
| 34 | click (A1) | Use your mouse to ___ on the picture. | click | Only close variants such as "double-click" or "right-click" fit; "press" and "tap" sound unnatural with a mouse, and "point" needs "at", not "on". |
| 36 | brand (A2) | My shoes and my bag are both the same ___: Nike. | brand | Only less common words like "make" or "label" fit; "company" sounds awkward without "from", so a learner at A2 would rarely be marked wrong. |
| 42 | deal (A2) | I offered $20 for the bike, and she said, 'It's a ___!' | deal | "Bargain" could fit ("It's a bargain!" can mean agreed), but it is less common here and usually means a cheap buy. "Steal" means very cheap, not an agreed transaction, so the fixed phrase "It's a deal!" is clearly the intended answer. |
| 45 | profit (B1) | The shop earned $500 more than it spent last year, so it made a ___. | profit | Only less common or formal words such as "surplus" or "gain" could fill the blank; "money" needs no article and "benefit" is unnatural here, so few learners would write anything other than "profit". |
| 46 | screen (A1) | My phone is on, but I can't see anything on its ___. | screen | "Display" also fits naturally ("nothing on its display"), but it is a more technical, above-A1 near-synonym; "monitor" does not suit a phone. |
| 55 | strategy (A2) | Chess is a game of ___, not luck, so you need to plan several moves ahead. | strategy | "Tactics" is a close, less common variant that fits the blank, while the common word "skill" is natural but means "kỹ năng", not "chiến lược". |
| 56 | map (A1) | We used a ___ of the city to find our way from the hotel to the train station. | map | Only the uncommon British usage 'plan' (a plan of the city) fits with the meaning 'bản đồ'; 'guide' needs 'to' rather than 'of', and 'app' takes 'an', not 'a'. |
| 62 | hungry (A1) | I'm so ___ I could eat a horse! | hungry | Only stronger, less common synonyms such as "starving" or "famished" could fit, and "so starving" sounds awkward; these words are above A1 level, so few learners would write them. |
| 64 | luggage (A2) | At the station, we paid to leave our bags at the left-___ office. | luggage | Only the close variant "baggage" could fit, and "left-baggage office" is far less usual than the fixed compound "left-luggage office"; "bags" and "suitcase" do not form a natural compound here. |
| 65 | merger (B2) | The two banks agreed to a ___ of equals, forming one new company with neither side taking control. | merger | 'Union' could just about fit ('a union of equals'), but it is far less natural here than the fixed phrase 'merger of equals'; 'partnership' does not fit because a partnership does not form one new company. |
| 67 | sell (A1) | I bought a bike for $50 and then ___ it to a friend for $70. | sold | Only the close variant "resold" fits with the meaning 'bán'; "rented" is natural but means 'cho thuê', and "gave" clashes with 'for $70'. |
| 69 | wireless (B2) | My phone supports both wired and ___ charging, so I can put it on a charging pad instead of plugging it in. | wireless | Only rare or technical variants such as "inductive" or "cordless" could fit; common candidates like "fast" do not fit because the contrast with "wired" and the charging-pad clue require "wireless". |
| 70 | urgent (B1) | Please mark the email as ___, not just important; we need a reply within the hour. | urgent | The clues 'not just important' and 'within the hour' rule out most common words, but less common options like 'time-sensitive' or 'high-priority' could still fit the blank. |
| 75 | encrypt (B2) | This app uses the same secret key to ___ and decrypt messages. | encrypt | The pairing with "decrypt" strongly cues "encrypt", but the less common close variants "encode" or "encipher" (also "mã hóa") could fit. |
| 77 | wash (A1) | Before lunch, please ___ with soap and water, then dry your hands. | wash | The common word "clean" sounds unnatural without an object here, but the less common word "scrub" (above A1) could fit the blank. |
| 82 | automate (B2) | The factory plans to fully ___ the packing process, so machines can do every step without human help. | automate | "Mechanize" could fit "fully ___ the packing process" with a close meaning, but it is a less common, more formal word; common words such as "change" or "improve" lose the meaning of tự động hóa. |
| 84 | online (A2) | Today's lesson was ___, not in a classroom, so we all joined it on our computers from home. | online | "Virtual" (and less naturally "remote") also fits, but these are less common words above A2, so few learners would write them. |
| 85 | annual (B1) | Every June, club members vote for a new president at the ___ general meeting. | annual | "Yearly" fits with the same meaning but is a close variant and less natural in the fixed phrase "annual general meeting"; other candidates like "next" or "big" change the meaning. |
| 89 | turnover (B2) | Last year, the bookshop had a ___ of £200,000, but it made a loss after paying its costs. | turnover | 'Revenue' could fit ('had a revenue of £200,000'), but it is a more formal, higher-level word and awkward with 'a'; 'income' is blocked by the article 'a', and 'profit' contradicts the loss. |
| 92 | abroad (A2) | The company sells its shoes both at home in Vietnam and ___ in Laos and Cambodia. | abroad | "Overseas" could fill the blank with the same meaning, but it is a less common B1 synonym and sounds odd for neighbouring countries reached by land, while "also" fits the grammar but loses the meaning "ở nước ngoài". |
| 95 | remote (A2) | This is one of the most ___ villages in the country. The nearest town is two days away. | remote | "Isolated" (and "distant") fit the blank with the meaning hẻo lánh, but both are B2 words above the A2 level, and "far" does not work in "the most ___". |
| 97 | delicious (A1) | This cake is ___—that's my favorite word that starts with D! | delicious | The 'starts with D' clue rules out common words like 'tasty', 'good' and 'yummy', but the rare, formal 'delectable' still fits and means 'ngon'. |
| 98 | procrastinate (B2) | I often ___ by watching videos instead of starting my homework, even though I know I'll have to stay up late to finish it. | procrastinate | Only the less common 'stall' (or rare 'dawdle') fits naturally with the meaning 'trì hoãn'; common words like 'delay' need an object, and 'relax' changes the meaning. |

