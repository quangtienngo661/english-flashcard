# Cost and quality strategy for Wordmet (10/11/2026)

Analysis requested by the owner after the real AI calls of 09/11/2026: Pro sells at 79,000 VND a month, and writing practice questions with
Claude Sonnet 5.5 at xhigh effort would make every Pro learner a loss. This doc puts AI, infrastructure and maintenance costs side by side
and proposes how to keep question quality high while the business makes money. Analysis only; nothing here is decided or built.

Sources: plan prices and quotas in `apps/api/src/settings/settings.definitions.ts`; AI prices from Anthropic's API reference (Claude Code
`claude-api` skill, cached 06/10/2026); real calls in `judge-compare-2026-11-07/api-price-test-results.jsonl`; hosting, tax and payment
research in `BACKEND_HOSTING_OPTIONS_2026-11-04.md` and `PRICING_INPUTS_RESEARCH_2026-11-04.md` (branch `docs/web-launch-research`);
speech and storage in the round C decisions (`docs/superpowers/decisions/2026-11-06-dot-cai-thien-c-decisions.md`). Exchange rate: the app's
setting, 26,100 VND per USD.

## 1. Revenue per Pro learner

| Plan | Price | Per month | USD per month |
|---|---|---|---|
| Pro 1 month | 79,000 VND | 79,000 | $3.03 |
| Pro 3 months | 199,000 VND | 66,333 | $2.54 |
| Pro 12 months | 599,000 VND | 49,917 | $1.91 |

- **Tax:** none while revenue stays at or under 1 billion VND a year (decree 141/2026, as researched on 04/11/2026). Above it, 2% or 5% of the
  part over the threshold; which rate applies to a vocabulary app is not settled.
- **Payment:** payOS advertised free use with 600 transactions to start; its later fees were not found. Bank transfer itself is free.
- **What Pro includes today:** 300 AI practice questions and 100 AI lookups a month, 30 practice sessions a day. Free: 15 AI questions,
  5 AI lookups a month, 3 sessions a day.

## 2. What one AI question costs (measured or estimated)

| Writer for a fill-in question | Per question | Source | Quality (fill-in test, pass / major of 102) | Time |
|---|---|---|---|---|
| Claude Sonnet 5.5, xhigh | **~$0.0233** | average of 5 real calls ($0.017–0.031) | 54 / 30 | 13–25 s |
| same, with prompt caching | ~$0.0195 | estimate (input read from cache) | same | same |
| same, through the Batch API | ~$0.0117 | estimate: Anthropic batches cost 50% | same | minutes to hours (not for live use) |
| Claude Haiku 5.5, max | $0.0046–0.016, sometimes **no answer** | 4 real calls; 3 of 4 hard words hit the 32,000-token cap after ~145 s | 48 / 34 | 41–145 s |
| Claude Haiku 5.5, medium | ~$0.0005 | earlier real app calls at default effort | 24 / 60 | ~4 s |
| AI lookup, Haiku medium | ~$0.0002–0.0005 | earlier real app calls | 20/20 in test | ~2.5 s |

Thinking is almost all of the cost: Sonnet xhigh thinks ~1,900 tokens per sentence, Haiku max 8,700 to over 32,000.

## 3. The problem: AI cost grows with every learner and every question

Today each AI question is written for one learner and used once (`apps/api/src/practice/ai/unseen-questions.ts`: questions are looked up by
`userId` and must have no answered item). So the AI bill is roughly *learners × questions practised*.

One Pro learner who uses the whole monthly quota, per month:

| Writer, as the app works today | AI cost (300 questions + 100 lookups) | Revenue (1-month plan) | Margin before infrastructure |
|---|---|---|---|
| Sonnet xhigh | ~$7.00 | $3.03 | **−$3.97** |
| Haiku max | ~$1.40–4.90, and too slow for live practice | $3.03 | unusable |
| Haiku medium | ~$0.18 | $3.03 | +$2.85, but the questions are much weaker |

A Free learner using all 15 questions costs ~$0.35 a month on Sonnet xhigh, with no revenue unless ads pay for it. Not every learner uses the
full quota, but the price has to survive the ones who do.

## 4. The solution: write each question once, for everyone

Most practice words come from the shared catalog (target 8,812 meanings). A good question for *bake* (oven, bread) is good for every learner
who studies *bake*. So:

1. **A shared question bank per catalog meaning.** Write each meaning's questions once, with the best writer (Sonnet xhigh), and serve
   them to every learner. The AI bill then grows with the number of *words*, not with learners or practice sessions.
2. **Build the bank in the background, never during practice.** Use the Batch API (half price) and prompt caching. Practice then never waits
   on AI, so the 10-second limit and Haiku's slow thinking stop mattering, and the best quality setting is affordable.
3. **Fill the bank lazily.** Write a meaning's questions the first time any learner adds that word to a group, then keep them. The cost
   follows the words learners actually use. Seed the most common levels (A1–B1) ahead if wanted.
4. **Judge every bank question once before it is used** (Sonnet high, batch), rewrite the ones that fail, keep only passes; the owner
   spot-checks a sample and learner reports flag the rest. The judge then works on a fixed set, not on every question served.
5. **Keep the session-words feature without AI at serving time.** Store, with each sentence, the other words that also fit its blank (the
   writer and judge already find them). When a sentence is served, the app checks the session's words against that list in code: it picks
   another sentence, or accepts the session word as an alternative answer. No AI call is needed for this.
6. **Use live AI only for what cannot be shared:** the learner's own private words. Use their saved sentences first (already built), then a
   fast setting (Haiku medium or high), within a small quota.

### What the bank would cost

Per bank question with Sonnet xhigh through batches ~$0.0117, plus one judge pass ~$0.0075 (estimate: Sonnet high, batch) = **~$0.02, once**.

| Scope | Questions | One-time cost |
|---|---|---|
| A1–B1 core, 3,000 meanings × 2 fill-in sentences | 6,000 | ~$115 |
| Whole catalog target, 8,812 meanings × 2 fill-in sentences | ~17,600 | ~$340 |
| Same, plus 1 multiple-choice and 1 meaning question per meaning (Haiku or Sonnet, batch) | ~35,000 | ~$500–700 |

Lazy filling spreads this over time and only pays for words learners use. After that, serving a bank question costs no AI.

### What Pro would cost per learner afterwards

| | Per Pro learner per month |
|---|---|
| Bank questions | ~$0 at serving time |
| AI questions on private words (say 50 a month, Haiku medium/high) | ~$0.03–0.25 |
| AI lookups (100, Haiku medium) | ~$0.02–0.05 |
| **AI total** | **~$0.05–0.30** |
| Revenue (1-month / 12-month plan) | $3.03 / $1.91 |
| **Margin before infrastructure** | **~$1.60–2.98** |

## 5. Infrastructure

The app already runs as four Docker services (API, worker, Postgres, Redis) with `pnpm bootstrap`, which suits one small server.

| Part | Cheapest sensible option | Monthly cost | Notes |
|---|---|---|---|
| API + worker + Postgres + Redis | One VPS, 2 vCPU / 4 GB, `docker compose` (Vietnam providers 240k–400k VND before VAT; DigitalOcean Singapore 4 GB $24 + backups $7.20) | ~$10–31 | Railway Hobby ~$10–12 is the managed alternative but blocks SMTP (needs an email API) |
| Web and admin | Cloudflare Workers | $0–5 | Paid plan $5 only if the free limits are reached |
| Word audio | Google TTS WaveNet + Cloudflare R2 | ~$0 | Whole catalog ~1.1M characters, inside the 4M free a month; R2 10 GB free, downloads free |
| Backups | Nightly `pg_dump` to R2 | ~$0 | Inside R2's free 10 GB at this size |
| Email | Gmail SMTP from a server that allows port 587 | $0 | Within Gmail's sending limits; an email API if traffic grows |
| AI admin work (judge passes, evals) | Capped by the app's admin daily US$ cap (default $2) | ≤ ~$5–20 | Run judge passes in batches, on samples |
| **Fixed total** | | **~$15–35** | |

**Break-even:** with ~$25 fixed a month and ~$2.80 margin per 1-month Pro learner, about **9 paying learners** cover running costs
(about 14 on the 12-month plan). The one-time bank cost is paid back over the following months.

## 6. Maintenance

- **One server, Docker, scripts:** the same `docker compose` setup as local, so upgrades are one command. A monthly 30-minute routine:
  security updates, a restore drill from the R2 backup, a look at AI spend.
- **Spending guards already built:** `ai_daily_cap`, the Free daily AI cap, the admin daily US$ cap, the 75% alert. Set them before going
  live with real keys.
- **Quality loop:** bank questions are judged once; learners' reports (already built) remove bad ones; a monthly judge pass on a 200-question
  sample (the app's `real_judge_limit`) catches drift.
- **Prompt changes:** a new prompt version only rewrites bank questions that fail the judge or get reported, not the whole bank.

## 7. Options compared

| Option | Quality | AI cost per Pro learner per month | Practice speed | Work needed |
|---|---|---|---|---|
| A. As today, Sonnet xhigh live | High | ~$7 (loss) | 13–25 s per question | none |
| B. As today, Haiku medium live | Low (24/102) | ~$0.18 | ~4 s | none |
| C. As today, Haiku medium live + first-letter hint shown | Medium (most majors ruled out; not re-tested) | ~$0.18 | ~4 s | small product change |
| **D. Shared bank (Sonnet xhigh, batch, judged) + live Haiku for private words** | **High** | **~$0.05–0.30** | **instant** | a design and build round |

**Recommendation: D.** It is the only option that keeps the high-quality writer and makes Pro profitable. C is a reasonable stopgap if
launch comes before D is built. D needs its own design (question bank tables, background generation, serving logic, the session-word check
in code), and through the usual brainstorm, design and plan steps.

## 8. Not verified

- Costs are from 5 real Sonnet calls and 4 real Haiku calls; averages may differ. The Batch API discount (50%) and the caching savings are
  Anthropic's published terms applied to these calls, not measured on this app.
- Judge cost per question is an estimate; no judge call has been made through the API.
- How much of the quota real learners use is unknown.
- payOS fees after its free start, the hosting provider and email limits need checking when deploying.
- Whether a shared sentence plus a code check covers the session-words feature as well as a live writer does: needs a test.
