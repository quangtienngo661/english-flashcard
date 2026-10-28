# Market and unit economics: a paid English-vocabulary app for Vietnamese learners (checked 19/10/2026)

Notes by the research sub-agent. All App Store prices were read from `apps.apple.com/vn` on **19/10/2026**. A storefront page lists at most ~10 in-app purchase items with generic names and no duration, so mapping a price to "monthly" or "yearly" is an inference unless the item name says so. Exchange rate used throughout: **1 USD = 26,300 VND (ASSUMPTION)**, based on Vietcombank's 02/07/2026 quote of 26,105 (buy, transfer) / 26,465 (sell) ([topi.vn](https://topi.vn/usd-to-vnd-theo-ty-gia-vietcombank.html)). Labels: **ESTIMATE** = my calculation from stated assumptions; **UNVERIFIED** = claim I could not confirm from a primary source this session; **ASSUMPTION** = an input I chose.

## 0. What the existing repo docs already cover, and what is outdated or unsourced

### Takeaway
The two named docs contain no prices, market numbers or conversion data, so they cannot back a monetization decision. The earlier cost doc (`DATA_COST_LICENSE_RESEARCH_2026-10-02.md`) has AI prices that now check out on official pages. Two things in it are out of date: Claude Haiku 4.5 is now a "legacy" model, and a 10× cheaper Haiku 5.5 exists. It also budgets AI grading that the current product scope (rule-based grading) no longer needs.

### Cited Findings
- `COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md` compares features only (ELSA, Speak, Duolingo Max, Loora, Praktika vs ChatGPT/Gemini). It says itself that it is not evidence of learner progress or payment. It covers no prices and no Vietnamese or vocabulary-focused competitors (MochiVocab, TFlat, Lingoland, Prep). Source: the file itself.
- That doc lists Video Call under "Duolingo Max". **This is outdated.** Duolingo's Q2 2026 shareholder letter says "most new Super Duolingo subscribers now have access to Video Call", with existing Super subscribers to follow later in 2026 — [Duolingo Q2 2026 shareholder letter (SEC 8-K)](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- `SURVEY_ANALYSIS_2026-09-30.md` has 13 usable responses, mostly university students, self-selected. 7/13 reported no language-learning spend in the last 3 months, 4 paid themselves, 1 was paid for by someone else and 1 shared the cost. 5/6 open answers said AI chat was "enough". It explicitly says it shows nothing about willingness to pay for a new app. Source: the file itself.
- `DATA_COST_LICENSE_RESEARCH_2026-10-02.md` §3.1 took Gemini/OpenAI prices from a secondary site (morphllm). Official pages checked today match: Gemini 2.5 Flash-Lite $0.10/$0.40, Gemini 3.5 Flash-Lite $0.30/$2.50 — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing); GPT-5.4-nano $0.20/$1.25 — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing). Claude Haiku 4.5 at $1/$5 is now under "Legacy models", and **Haiku 5.5 is $0.10 input / $0.50 output** per MTok (prompts ≤100K tokens) — [Claude pricing](https://claude.com/pricing)
- The same doc's AI estimate includes "5 câu chấm" (AI grading of 5 answers per session). The current product context says fill-in-the-blank is graded by rule, so per-session AI cost is generation only. Source: the file plus the task's product context.
- The same doc lists Google Play subscriptions at 15% (still correct for Vietnam, see §4) and payment-gateway fees as "chưa tra". §4 below partly fills that gap.

### Inferences
- No earlier repo doc estimates the number of paying users or revenue. Everything in §5 is new and rests on the stated assumptions.

### Gaps
- I did not re-read `PRODUCT_DISCOVERY.md` §18 or `PROJECT_ASSESSMENT_2026-10-15.md` in full. They may contain pricing ideas this note does not reconcile.

## 1. Market: size, growth, digital reach, and whether Vietnamese learners pay

### Takeaway
Credible market sizes disagree by two orders of magnitude, depending on scope. The narrowest relevant figure is IMARC's **US$43.1M (2025) for Vietnam's digital English-learning market**, growing about 12%/yr. Vietnam has 85.6M internet users, but I found no Vietnam-specific survey of the share of users who pay for education apps. The best proxies (RevenueCat IN/SEA 0.7% download-to-paid; 7–10% of Vietnamese mobile gamers pay) point to a low payer share.

### Cited Findings
- **Vietnam digital English-learning market:** US$43.1M in 2025, forecast US$123.0M by 2034, CAGR 11.98% over 2026–2034. Paid report; methodology not visible — [IMARC](https://www.imarcgroup.com/report/en/vietnam-digital-english-language-learning-market)
- **Vietnam e-learning and digital upskilling:** US$1.2B (2025), forecast US$3.174B by 2031 (another Ken Research report gives US$2.81B by 2031 from the same base). About 750 edtech businesses; about US$15–16M raised across 8 disclosed edtech deals in 2024 — [Ken Research](https://www.kenresearch.com/vietnam-e-learning-and-digital-upskilling-market.md), [Ken Research (skilling)](https://www.kenresearch.com/vietnam-e-learning-and-digital-skilling-market.md)
- **Vietnam EdTech (wide scope):** US$3.7B revenue in 2025, CAGR 11.4% (2020–25); K-12 is about 81.6% of value — [GlobalData](https://www.globaldata.com/store/report/vietnam-edtech-market-analysis/)
- **Vietnam EdTech White Paper 2025, via VnEconomy (17/08/2025):** market about US$5B (estimate) but 2024 revenue about US$360M (the article does not reconcile the two), about 750 companies, 11–13% growth for 2025–2026, about 60% of Vietnamese edtech products using AI. "Online Education" revenue US$397.5M in 2025, CAGR 12.08% for 2025–2029, ARPU about US$42.18, 11.8M users by 2029. These last figures look like Statista Market Insights output, but their origin is not stated — **UNVERIFIED origin** — [VnEconomy](https://vneconomy.vn/techconnect/viet-nam-nam-trong-top-10-thi-truong-edtech-the-gioi-top-3-thi-truong-dong-nam-a.htm)
- **Older figure:** an undated VIR article gives US$364.71M and an 11.1% CAGR, with language learning as one main sector. Treat it as older — [VIR](https://vir.com.vn/rising-demand-fuels-new-edtech-promise-122958.html)
- **Digital reach:** 85.6M internet users at end-2025 (84.2% penetration), 79.0M social media identities (Oct 2025, 77.6% of the population), 137M cellular connections (134%, not all with internet) — [DataReportal Digital 2026: Vietnam](https://datareportal.com/reports/digital-2026-vietnam)
- **App installs:** 2.17B installs in Vietnam in 2024, slightly down in 2025. iOS share of installs rose from 22% (2017) to 33% (2025); Android was 66% in 2025. UA spend was US$397M (Q3 2023–Q2 2025). The report has **no education-category, retention or revenue figures** for Vietnam — [AppsFlyer State of App Marketing Vietnam](https://www.appsflyer.com/resources/reports/app-marketing-vietnam-report/)
- **Propensity to pay (games proxy):** Vietnam's mobile game revenue was US$825M in 2025 (+9.16% YoY). "Only around 7% to 10% of users currently spend on mobile games" (Gamota report) — [PocketGamer.biz](https://www.pocketgamer.biz/vietnams-mobile-games-market-reached-825m-in-revenue-in-2025)
- **Low-price-market subscription benchmark:** RevenueCat's IN/SEA segment (India + Southeast Asia) has a 0.7% median download-to-paid rate at day 35 (top quartile 1.9%), versus 2.0% globally — [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- **Repo survey (not representative):** 4/13 respondents self-paid for language learning in the last 3 months, and 7/13 had no spend — `SURVEY_ANALYSIS_2026-09-30.md`
- **Older Vietnam signals:** Brands Vietnam said Vietnam was about 3% of Duolingo's DAU, using 2020–2021 data (**old**) — [Brands Vietnam](https://www.brandsvietnam.com/22659-viet-nam-thi-truong-mau-mo-cho-app-day-tieng-anh). An undated Vietnamnet article says ELSA had 4M+ users, about 2M of them in Vietnam, "growing organically" (**likely old, undated**) — [Vietnamnet](https://vietnamnet.vn/en/vietnams-app-for-english-pronunciation-wins-over-learners-E218938.html)

### Inferences
- For a consumer vocabulary app, use IMARC's ~US$43M (~1,130 billion VND) as the order of magnitude. If that is right, a solo app earning 20M VND/month (240M VND/yr) needs roughly 0.02% of the segment. The binding constraint is distribution and conversion, not market size.
- Vietnam's iOS share (33% of installs, rising) matters. iOS users usually monetize better, and iOS forces Apple In-App Purchase (IAP) for unlocking features (see §4).

### Gaps
- **No Vietnam-specific measurement of the share of people who pay for education or language apps** (searched Q&Me, Decision Lab, and Vietnamese-language survey terms; nothing found).
- No Sensor Tower or data.ai figure for Vietnam's total non-game app consumer spend in 2025–2026 (only the US$825M game figure).
- The Statista "Language Learning – Vietnam" outlook page rendered global figures (US$40.58B, 2026), not Vietnam's, so it was not used.

## 2. Paying competitors in Vietnam and their VND prices (App Store VN, 19/10/2026)

### Takeaway
Yearly prices cluster at **~600k–1.1M VND** for mainstream apps: Duolingo Super 599k–860k, ELSA Pro 769k–1,095k, MochiVocab 999k, Lingoland 599k–799k, Cake Plus ~869k. TFlat is the extreme low anchor at **199k/yr, and 199k "forever"**. Lifetime plans are common (ELSA, Memrise, LingoDeer, Lingoland, Monkey, TFlat). The two closest competitors to this product are Vietnamese vocabulary + spaced-repetition (SRS) apps: **MochiVocab** (999k/yr) and **Lingoland** (199k/month, 599k–799k/yr, lifetime 1.4M–2M).

### Cited Findings
Ranks are the app's position in the Vietnam App Store Top Free **Education** chart on 19/10/2026.

| App | Focus | VND prices as listed (19/10/2026) | Rank / ratings | Source |
|---|---|---|---|---|
| Duolingo | General, gamified | "Super Duolingo" items at 599,000 / 689,000 / 860,000 (durations not labelled; likely yearly variants); Family Plan 899,000. No monthly or Max item among the 10 shown | #2; 771k | [App Store VN](https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128) |
| ELSA Speak | Pronunciation/speaking | Monthly 145,000; 3 months 345,000–365,000 ("3 months Elsa Pro" 365,000); 1 year 769,000 / 1,095,000; "1 Year Elsa Premium" 1,590,000; other "3 months" items 1,259,000–1,299,000 (probably Premium) | #33; 283k | [App Store VN](https://apps.apple.com/vn/app/elsa-speak-ti%E1%BA%BFng-anh-ai/id1083804886) |
| ELSA (older retail prices) | — | Pro lifetime 2,195,000; 1 year 1,095,000; 6 months 645,000 (Sforum updated 03/05/2024 — **older**); Chiaki promo lifetime 1,565,000 (undated) | — | [FPT Shop](https://fptshop.com.vn/tin-tuc/giai-tri/elsa-speak-la-gi-199928), [Sforum](https://cellphones.com.vn/sforum/elsa-speak), [Chiaki](https://chiaki.vn/phan-mem-elsa-speak-pro-goi-tron-doi-kem-qua-tu-tin-giao-tiep-tieng-anh-voi-10-phut-moi-ngay) |
| Quizlet | Flashcards (general) | Quizlet Plus 299,000 and 1,299,000 (likely monthly and yearly; unlabelled); Quizlet Go 1,299,000; Teacher 629,000 | #38; 100k | [App Store VN](https://apps.apple.com/vn/app/id546473125) |
| TFlat / "Dịch Tiếng Anh KALA" | Dictionary + vocab (VN) | VIP 1 month 19,000; 3 months 59,000; 1 year 199,000; "VIP member forever" 199,000 | #54; 155k; developer "Thang Le" (individual account) | [App Store VN](https://apps.apple.com/vn/app/id591049834) |
| MochiVocab (MochiMochi) | **Vocabulary + SRS (VN)** | 6 months 699,000; 12 months 999,000 / 1,049,000; 3 years 1,999,000 / 2,099,000 | #94; 45k; developer "Anh Quach" (individual account) | [App Store VN](https://apps.apple.com/vn/app/id1484058499) |
| Lingoland | **Vocabulary + SRS + AI chatbot (VN company)** | Monthly 199,000; 3 months 299,000 / 499,000; 1 year 599,000–799,000; lifetime 1,399,000–1,999,000; 1000 gems 34,000 | #109; 5.7k; Lingoland Company Limited | [App Store VN](https://apps.apple.com/vn/app/id1616303464) |
| LingoDeer | General, multilingual | Monthly 499,000; quarterly 809,000; 6 months 2,499,000; annual 2,999,000 (discount 2,599,000); lifetime 3,999,000–4,999,000 (and 9,999,000) | #137; 11k | [App Store VN](https://apps.apple.com/vn/app/id1261193709) |
| Prep | Exam prep (IELTS/TOEIC/VSTEP) | IELTS Pro 1 month 299,000; 6 months 999,000; 90-day IELTS practice 2,000,000; 90-day TOEIC practice 1,500,000; course packages 800,000–7,500,000 | #142; 6.5k | [App Store VN](https://apps.apple.com/vn/app/id1513736434) |
| Cake | Speaking/expressions (Korean company) | Cake Plus 229,000 / 869,000 / 1,199,000 (unlabelled); Family 2,399,000; "Class" 119,000–999,000. US listing: Cake Plus US$13.99/month | #151; 44k | [App Store VN](https://apps.apple.com/vn/app/id1350420987) |
| Memrise | General vocab/video | Weekly 29,000; monthly 280,000; 3 months 199,000; annual 1,199,000 (Pro 1,350,000; offers 1,129,000–1,499,000); lifetime 5,399,000 (offer 1,599,000) | #171; 54k | [App Store VN](https://apps.apple.com/vn/app/id635966718) |
| eJOY | Video-based vocab | Monthly 399,000; 3 months 899,000; 6 months 1,549,000; 1 year 2,399,000; 12-month promo 1,109,000 / 1,699,000 | not shown; 870 | [App Store VN](https://apps.apple.com/vn/app/id1258329729) |
| VoiceTube | Video-based listening | Pro 1 month 240,000 / 279,000; 6 months 980,000–1,439,000; 12 months 979,000–1,599,000; Tier 1/2 yearly 1,249,000 / 1,799,000 | not shown; 755 | [App Store VN](https://apps.apple.com/vn/app/id641446200) |
| AnkiMobile | SRS flashcards | Paid app 799,000 (one-time) | 116 ratings (VN) | [App Store VN](https://apps.apple.com/vn/app/id373493387) |
| Monkey (Junior/Stories/Math) | Kids (parents pay) | Junior or Stories: 1 year 799,000 (list 1,359,000), lifetime 1,399,000 (list 2,799,000); Math: 1 year 499,000, lifetime 1,099,000; Monkey Pro combo 1 year 1,299,000 (list 2,599,000); undated web price page | claims "15+ triệu" children | [monkey.edu.vn/bang-gia](https://monkey.edu.vn/bang-gia), [monkey.edu.vn](https://monkey.edu.vn/) |

- Prep: Series A of US$7M (May 2024) led by Northstar Ventures and Cercano; claims 600,000+ domestic learners (self-reported, undated); expanded to Indonesia in Aug 2025 — [Techleap finder](https://finder.techleap.nl/news/feed/prep-raises-7m-for-global-expansion), search summary of [prepedu.com news](https://prepedu.com/en/news/prep-at-holoniq-2025)
- **Scale estimates from a third party (AppGoblin, iOS only, labelled estimates):**
  - TFlat: 8.1M installs, ~127K MAU, "$10K+" monthly revenue (est.), split IAP 24% / ads 76%, released Jan 2013 — [AppGoblin](https://appgoblin.info/apps/591049834)
  - MochiVocab: 2.4M installs, ~43K MAU, "$<10K" monthly revenue (est.), IAP 100% / no ads, +9.2K installs/month, released May 2021 — [AppGoblin](https://appgoblin.info/apps/1484058499)

### Inferences
- **Price positioning:** a Pro tier at **~399k–599k VND/yr** sits below Duolingo Super (599k–860k) and half of MochiVocab (999k). It is still 2–3× TFlat. A monthly price of **~59k–99k** sits below Lingoland (199k) and ELSA (145k). These are positioning ESTIMATES, not tested prices.
- The Vietnam market expects **lifetime and multi-year plans**: MochiVocab 3-year, TFlat "forever" at the yearly price, and Lingoland, ELSA, Memrise and Monkey lifetime. Offering lifetime raises cash early but caps lifetime value (LTV) and future revenue, and AI cost keeps running for a lifetime user.
- Vocabulary-focused apps: MochiVocab, Lingoland, TFlat, Quizlet, Memrise, eJOY, Anki. General or other focus: Duolingo, ELSA, Cake, LingoDeer, Prep, VoiceTube, Monkey.

### Gaps
- Google Play VN prices (`hl=vi&gl=VN`) were not checked. Android is 66% of installs in Vietnam, and Play prices may differ.
- Duolingo monthly and Duolingo Max VND prices did not appear among the 10 items shown. The meaning of each unlabelled item (monthly vs yearly, intro vs regular) is inferred.
- Laban Dictionary was not checked.
- MochiMochi's own revenue and users: no primary source found (searches returned unrelated "Mochi" companies).
- The ELSA and Duolingo reseller listings on Chiaki could not be verified (the Duolingo page returned HTTP 410 on 19/10/2026).

## 3. Funnel and retention benchmarks for freemium education/language apps

### Takeaway
Use low-price-market numbers, not global ones. RevenueCat's IN/SEA segment converts **0.7% of downloads to paid by day 35** (top quartile 1.9%), with trial-to-paid at 15.2% and a median yearly price of $18.32. Education apps keep only about **14–15% of users on day 1, ~6% on day 7 and ~2–3% on day 30**. Duolingo, the best-in-class reference, has ~9% of MAU paying.

### Cited Findings
- **RevenueCat 2026, Education category (global medians):** download-to-trial (D30) 6.5%; 78.5% of trial starts happen on day 0; 50.3% of trials run 5–9 days; 28.5% of conversions happen on day 0; D14 revenue per install (RPI) $0.30; realized LTV per payer in year 1 $22.82; median yearly price $44.99 (the highest of any category); median monthly price $9.99. The page reports no Education trial-to-paid, retention or churn figures — [RevenueCat Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education)
- **RevenueCat 2026, IN/SEA (all categories):** D14 RPI $0.08; D60 RPI $0.11; trial-to-paid 15.2%; D35 download-to-paid 0.7% (top quartile 1.9%); median yearly $18.32; median monthly $3.75; download-to-trial 3.0–3.7% (shared range with LATAM, MEA and ROW); web share of revenue 0.8% — [RevenueCat Education page](https://www.revenuecat.com/state-of-subscription-apps-2026-education), [RevenueCat main report](https://www.revenuecat.com/state-of-subscription-apps)
- **RevenueCat 2026, global:** download-to-paid (D35) 2.0%; hard paywall 10.7% vs freemium 2.1%; trial-to-paid by trial length: ≤4 days 25.5%, 5–9 days 37.4%, 17–32 days 42.5%. Only **17.3% of apps reach US$1K MRR and 4.6% reach US$10K MRR within their first 2 years**. Revenue mix: subscriptions only 63.5%, subscriptions + lifetime 23.2% — [RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)
- **RevenueCat 2026 headline:** 115,000+ apps, US$16B+ revenue. The top 25% of apps grew MRR 80% YoY while the bottom quartile fell 33% (via 9to5mac in the search summary) — [RevenueCat Education page](https://www.revenuecat.com/state-of-subscription-apps-2026-education), [9to5mac](https://9to5mac.com/?p=1042212)
- **Adapty 2026 (16,000+ apps, US$3B+ revenue, 2025 data):**
  - Global: install→trial 11.2%, trial→paid 27.8%, refund 8.3%. Renewal curve: 1st renewal 59.2%, 2nd 45.1%, 3rd 37.1%, 4th 31.6%, 5th 27.6%. Install→paid in-app 1.60% vs web 1.10%. North America install→trial 14.5% vs 7.6–10.2% elsewhere.
  - Education: median 1-year install LTV $1.06; 12-month LTV $45.10; 14.3% of Education apps offer discounts (highest of any category); **the top 10% of Education apps take 96.0% of category revenue**.
  - Pricing index: India 0.6, Indonesia 0.7 (UK = 1.2).
  - Source: [Adapty State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions-report/)
- **Education retention (secondary aggregation of Statista H1 2024, AppsFlyer, Adjust, Business of Apps 2026):** Day 1 ~14–15%, Day 7 ~6%, Day 30 ~2–3%, versus a cross-industry average of ~25–26% / 11–13% / 5–7%. iOS averages D1 ~24% and D30 3.7%; Android ~21% and 2.1% — [Phiture](https://phiture.com/mobilegrowthstack/managing-retention-rate-benchmarks-and-expectations/). An AppsFlyer-via-Business-of-Apps figure gives education D30 at 2.7% (iOS) and 2.2% (Android); a OneSignal dataset reports 8.02% for Education D30, showing how much method changes the number — search summary citing [Braze](https://www.braze.com/resources/articles/mobile-app-retention) and [Passion.io](https://passion.io/blog/mobile-app-retention-benchmarks-for-creators-course-coaching-apps) (**secondary**)
- **Duolingo Q2 2026 (quarter ended 30/06/2026):** DAU 58.7M (+23%); MAU 140.6M (+10%); paid subscribers 12.7M (+17%); subscription revenue US$258.0M (+22%). It is testing "longer free trials". In China, Indonesia and India "roughly two thirds of our social impressions have come from influencer-generated content". FY2026 guidance: revenue US$1,207M, gross margin ~71.6% — [Duolingo Q2 2026 shareholder letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)

### Inferences
- Duolingo, calculated from the figures above (ESTIMATE): paid ≈ **9.0% of MAU** (12.7M / 140.6M; the measures differ, period-end vs quarterly average); DAU/MAU ≈ **41.7%**; subscription revenue per paid subscriber ≈ US$258.0M / 12.7M / 3 ≈ **US$6.8/month** (global average, including Max and Family). A new solo app should plan for a fraction of Duolingo's 9%. I use **2–5% of MAU** as the planning range (ESTIMATE).
- In Vietnamese terms, IN/SEA medians of $3.75/month and $18.32/yr ≈ **~99k VND/month and ~482k VND/yr**. That matches the observed Vietnam competitor band in §2.
- A 0.7% download-to-paid rate means about 143 installs per payer at the median, or about 53 at the top quartile (1.9%).
- RevenueCat's IN/SEA trial-to-paid (15.2%) is about half of the global figure. If the app uses a 14-day trial (the project's plan per `PROJECT_CONTEXT.md`), expect ~15% of trials to convert, not ~30%.

### Gaps
- No Vietnam-only figures for conversion, retention or churn from any source (the RevenueCat IN/SEA segment mixes India and all of SEA).
- The RevenueCat Education category's 12-month retention, refund and trial-to-paid figures sit behind the full PDF and were not read.
- A secondary claim that annual plans churn 48% vs monthly 79% by year 1 could not be traced to a primary source — **UNVERIFIED**, not used.

## 4. Costs: store and payment fees, tax, AI per question, hosting

### Takeaway
After store fees and possible taxes, keep **~76–83% of the price for store sales**, and **~96–99% for web sales by bank-QR transfer** (VietQR), but web payments have no automatic renewal. AI generation costs are negligible on current small models. A fill-in-the-blank question costs **~2–3 VND** on Claude Haiku 5.5 or Gemini 2.5 Flash-Lite, so a heavy Pro user costs ~1,000–2,000 VND/month in AI. Fixed hosting for a small NestJS + Postgres + Redis stack is roughly **US$25–60/month**.

### Cited Findings
- **Google Play (official, read 19/10/2026):** for "all other markets" (Vietnam is not in the AU/EEA/JP/UK/US group), auto-renewing subscriptions pay **15% regardless of revenue**; other transactions pay 15% on the first US$1M/yr and 30% above. The new 10% + 5% billing-fee structure applies only to EEA/UK/US (from 30/06/2026) and AU/JP (from 30/09/2026) — [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- **Apple:** 15% under the Small Business Program (repo doc §3.2, citing Apple). Rule 3.1.1 requires IAP for unlocking features in the app; 3.1.3(b) allows using a web purchase in the app only if the same plan is also sold by IAP (repo doc §4). Source: `DATA_COST_LICENSE_RESEARCH_2026-10-02.md`.
- **Apple Vietnam tax changes (effective 21/08/2025), secondary report:** for developers based in Vietnam, Apple stops remitting foreign contractor tax (FCT) on sales to end customers. A 5% FCT applies to Apple's commission. Individual developers in Vietnam get a **2% personal income tax (PIT)** in place of corporate income tax. Foreign developers' VAT on Vietnam sales rises from 5% to 10% — [PPC Land](https://ppc.land/apple-announces-tax-and-pricing-updates-affecting-global-developers/) (**primary Apple notice not located this session — UNVERIFIED**). In Oct 2022, Apple raised Vietnam prices to collect 5% VAT + 5% CIT and computes proceeds on the tax-exclusive price — search summary of [Apple developer news](https://developer.apple.com/news/?id=qs5bol0)
- **Vietnamese tax for individuals selling apps (Gonnapass, 05/10/2026):**
  - Software products/services: PIT 2% of revenue, and software meeting the legal definition is not subject to VAT.
  - In-app advertising or digital content: 5% VAT + 5% PIT.
  - Apple's commission is treated as 15%, and Apple declares and pays VAT/CIT as a foreign supplier.
  - Source: [Gonnapass](https://gonnapass.com/viet-app-qua-nen-tang-chiu-thue-nao-shopify-google-apple-store/) (tax-advice blog, not legal advice)
- **Revenue threshold for household/individual businesses:** Decree 141/2026/NĐ-CP (signed 29/04/2026, effective retroactively from 01/01/2026) raises the threshold below which a household business pays no VAT or PIT from 500M to **1 billion VND/year**. It also exempts businesses with revenue ≤1 billion VND/year from CIT — [Thời báo Tài chính Việt Nam](https://thoibaotaichinhvietnam.vn/nang-nguong-doanh-thu-khong-phai-nop-thue-len-1-ty-dong-dieu-ho-kinh-doanh-mong-cho-da-thanh-hien-thuc-196524.html), [Tạp chí Công Thương](https://tapchicongthuong.vn/chinh-thuc--nang-nguong-chiu-thue-voi-ho-kinh-doanh-len-1-ty-dong-nam--ap-dung-tu-1-1-2026-514336.htm), [MISA eShop](https://www.misaeshop.vn/?p=40801). The earlier 500M threshold came from the amended PIT law passed 10/12/2025 — same search set.
- **payOS (bank-QR collection):**
  - Plan "BIDV-1K": free, 1,000 transactions/year, valid until 31/12/2026.
  - Individuals can register a collection channel with a national ID card (CCCD).
  - It claims no intermediary fee.
  - Its page does not mention subscriptions or recurring billing.
  - Source: [payOS](https://payos.vn/)
- **QR merchant fee via VNPAY partner bank:** Nam A Bank's schedule effective 15/06/2026 charges ordinary merchants 0.5% of value for QR payments funded domestically (domestic card, bank account, e-wallet). POS domestic card fees run ~0.85–1.6% — search summary of [Nam A Bank fee schedule](https://www.namabank.com.vn/Data/Sites/1/media/bieu-phi/doanh-nghiep/2026/website_bi%E1%BB%81u-ph%C3%AD-d%E1%BB%8Bch-v%E1%BB%A5-%C3%A1p-d%E1%BB%A5ng-cho-%C4%91%C6%A1n-v%E1%BB%8B-ch%E1%BA%A5p-nh%E1%BA%ADn-thanh-to%C3%A1n---15.06.2026.pdf)
- **MoMo:** the only official fee found is 0.3% (max 15,000 VND/transaction, excluding VAT) for the National Public Service Portal (Feb 2023). No general online-merchant rate was found; the business version needs a separate account at business.momo.vn — [MoMo](https://www.momo.vn/tin-tuc/thong-bao/momo-cap-nhat-muc-phi-thanh-toan-tren-cong-dich-3990)
- **AI list prices (official pages, 19/10/2026), USD per 1M tokens, input / output:**
  - Anthropic — [Claude pricing](https://claude.com/pricing):
    - Claude Haiku 5.5: $0.10 / $0.50 (≤100K-token prompts); cache read $0.01; batch is 50% off.
    - Claude Haiku 4.5 (legacy): $1 / $5.
    - Claude Sonnet 5.5: $2 / $10.
  - Google — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing):
    - Gemini 2.5 Flash-Lite: $0.10 / $0.40.
    - Gemini 3.1 Flash-Lite: $0.25 / $1.50.
    - Gemini 3.5 Flash-Lite: $0.30 / $2.50.
    - Gemini 3.6 / 3.8 Flash: $0.75 / $3.75 through 31/12/2026, doubling to $1.50 / $7.50 from 01/01/2027.
    - Free tiers exist, and the earlier repo doc notes that free-tier content may be used to improve Google's products.
  - OpenAI — [OpenAI pricing](https://developers.openai.com/api/docs/pricing):
    - gpt-5-nano: $0.05 / $0.40.
    - gpt-5.4-nano: $0.20 / $1.25.
    - gpt-4o-mini: $0.15 / $0.60.
    - Batch is half price.
- **Hosting (DigitalOcean Basic Droplets):** 1 GiB/1 vCPU $6; 2 GiB/1 vCPU $12; 2 GiB/2 vCPU $18; 4 GiB/2 vCPU $24; 8 GiB/4 vCPU $48 per month. Managed DB prices were not shown on the page — [DigitalOcean](https://www.digitalocean.com/pricing/droplets). Hetzner's page did not render prices (Singapore location listed) — [Hetzner](https://www.hetzner.com/cloud)
- **Other fixed costs (repo doc §3.2):** Apple Developer US$99/yr; Google Play US$25 one-time; Codemagic free 500 macOS min/month. Source: `DATA_COST_LICENSE_RESEARCH_2026-10-02.md`.

### Inferences

**AI cost per generated question (ESTIMATE).** ASSUMPTION: one fill-in-the-blank question = **~400 input tokens** (instructions, word, sense, level, JSON schema; amortized by generating 5 questions per call) + **~150 output tokens** (sentence, blank, answer, one hint). There are no reasoning tokens and no AI grading (grading is by rule).

| Model | USD / question | VND / question | 300 questions/month ×1.3 retry overhead (VND/user/month) |
|---|---|---|---|
| gpt-5-nano (no reasoning tokens) | $0.00008 | ~2.1 | ~820 |
| Gemini 2.5 Flash-Lite | $0.00010 | ~2.6 | ~1,030 |
| **Claude Haiku 5.5** | $0.000115 | ~3.0 | ~1,180 |
| gpt-5.4-nano | $0.00027 | ~7.0 | ~2,740 |
| Gemini 3.1 Flash-Lite | $0.000325 | ~8.5 | ~3,330 |
| Gemini 3.5 Flash-Lite | $0.000495 | ~13 | ~5,080 |
| Claude Haiku 4.5 (legacy) | $0.00115 | ~30 | ~11,800 |
| Claude Sonnet 5.5 | $0.0023 | ~60 | ~23,600 |

- If a reasoning model emits ~500 hidden reasoning tokens per question, gpt-5-nano rises to ~$0.00028 (~7 VND). Measure real tokens on a prototype.
- Shared catalog words (not private words) can have their questions generated once and reused for everyone. That makes the per-user AI cost even smaller; the remaining cost driver is private and quick-added words.
- Conclusion: on any small model, AI is **<5% of a 40k-VND/month net payer contribution** (see §5). AI cost only becomes material on Sonnet-class models or with unlimited free AI.

**Net revenue factor per 100 VND of sticker price (ESTIMATE):**
- App Store / Google Play, Vietnam-based individual seller, auto-renewing: 15% commission, 2% PIT, and possibly a VAT carve-out (UNVERIFIED whether the VND sticker includes VAT for a Vietnam-based seller of "software"). Without VAT: 100 × 0.85 × 0.98 = **83.3**. If a 10% VAT is carved out first: 100 / 1.1 × 0.85 × 0.98 = **75.7**. The model uses **~78–80**.
- Web via VietQR/payOS: ~0–0.5% fee, minus 2% PIT if not exempt. That keeps **~97.5–100**; under the 1 billion VND/yr threshold (Decree 141/2026), PIT/VAT may be 0 (UNVERIFIED for an individual developer without a household-business registration). But there is **no automatic renewal**: each renewal is a manual payment.
- Blended **0.80** is used in §5 (conservative: assumes mostly store sales).

**Fixed monthly cost (ESTIMATE) ≈ 1.5M VND:**
- API + worker + Postgres + Redis on one or two VPS: US$24–48.
- Backups, domain, transactional email: ~US$5–10.
- Apple US$99/yr ≈ 217k VND/month.
- About **US$35–60 ≈ 0.9–1.6M VND/month** at <~50k MAU. The admin and landing already run on Cloudflare Workers per `CLAUDE.md` (cost not checked).

### Gaps
- Apple's primary Vietnam tax notice (Aug 2025) was not retrieved, so whether Apple withholds the 2% PIT for Vietnamese individuals is from secondary sources only.
- Whether a solo developer with app income must register as a household business to use the 1 billion VND exemption is not answered by any source found. **Needs a tax adviser.**
- No official current MoMo, ZaloPay or VNPAY online-card gateway rates were found. The ~1–3% card-gateway figure in the brief is **UNVERIFIED**.
- payOS: whether its terms allow selling digital subscriptions as an individual, and its fees after 31/12/2026, are not stated.

## 5. Unit-economics model: users needed for 5M, 20M and 50M VND/month

### Takeaway
At a mid price (79k/month, 499k/yr) one paying user contributes **~40k VND/month** after fees and AI. That makes **~160 / ~535 / ~1,280 paying users** for **5M / 20M / 50M VND/month profit** after ~1.5M fixed costs (ESTIMATE). At 3% of MAU paying, that means **~5k / ~18k / ~43k monthly active users**. At the IN/SEA median conversion (0.7%) it needs **~2.3k / ~7.6k / ~18k new installs every month**, sustained. 20M VND/month (~US$1K gross MRR) is roughly what only **17.3% of RevenueCat apps reach within 2 years**.

### Cited Findings
- Inputs come from §2 (prices), §3 (conversion 0.7% / 1.9%, IN/SEA medians, Adapty renewal curve, RevenueCat MRR milestones) and §4 (fees, AI, hosting). Key ones:
  - IN/SEA D35 download-to-paid 0.7% (top quartile 1.9%); D60 RPI $0.11 — [RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)
  - 17.3% of apps reach US$1K MRR and 4.6% reach US$10K MRR in their first 2 years — [RevenueCat](https://www.revenuecat.com/state-of-subscription-apps)
  - Renewal curve 59.2% → 45.1% → 37.1% → 31.6% → 27.6% — [Adapty](https://adapty.io/state-of-in-app-subscriptions-report/)
  - Duolingo paid ≈ 9% of MAU (calculated) — [Duolingo Q2 2026](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)

### Inferences

**Assumptions (all ASSUMPTION/ESTIMATE):**
1. Plan mix by paying user: 70% yearly, 30% monthly. Vietnamese competitors push long plans, and annual retains better.
2. Net revenue factor 0.80 (§4).
3. AI cost 2,000 VND per paying user per month (≈2× the Haiku 5.5 / Flash-Lite heavy-user figure, as buffer). Free tier has no AI (per `PROJECT_CONTEXT.md`); trial AI cost per converted payer ≈ 6.6 trials × ~600 VND ≈ 4k VND one-time, ignored.
4. Fixed cost 1.5M VND/month.
5. Average paid lifetime **L = 10 months**. This is conservative: the Adapty curve implies ~5.5 paid months for a monthly subscriber; a yearly subscriber pays 12 months up front plus some renewals.
6. Payers as a share of MAU: 3% (range 2–5%).
7. Target = monthly profit after all listed costs, before the owner's time and before any income tax beyond the 2% assumed.

**Revenue per paying user per month:**

| Scenario | Monthly price | Yearly price | Gross per payer-month (70/30 mix) | Net ×0.80 | Minus AI 2k = contribution |
|---|---|---|---|---|---|
| Low (TFlat/Lingoland-adjacent) | 49,000 | 299,000 | 32,100 | 25,700 | **23,700** |
| Mid (below Duolingo Super) | 79,000 | 499,000 | 52,800 | 42,200 | **40,200** |
| High (ELSA/MochiVocab level) | 129,000 | 899,000 | 91,100 | 72,900 | **70,900** |

Example (Mid): 0.7 × 499,000/12 + 0.3 × 79,000 = 29,110 + 23,700 = 52,810 VND.

**Paying users needed = (target + 1.5M fixed) / contribution:**

| Target profit / month | Low | Mid | High |
|---|---|---|---|
| 5M VND (~US$190) | ~274 | **~162** | ~92 |
| 20M VND (~US$760) | ~907 | **~535** | ~303 |
| 50M VND (~US$1,900) | ~2,173 | **~1,281** | ~726 |

**Monthly active users needed (payers ÷ payer share of MAU):**

| Target | Low @3% / @5% | Mid @3% / @5% | High @3% / @5% |
|---|---|---|---|
| 5M | 9.1k / 5.5k | **5.4k / 3.2k** | 3.1k / 1.8k |
| 20M | 30k / 18k | **18k / 11k** | 10k / 6.1k |
| 50M | 72k / 43k | **43k / 26k** | 24k / 14.5k |

**New installs needed every month in steady state = payers / L / download-to-paid:**

| Target | Low @0.7% / @1.9% | Mid @0.7% / @1.9% | High @0.7% / @1.9% |
|---|---|---|---|
| 5M | 3.9k / 1.4k | **2.3k / 0.85k** | 1.3k / 0.5k |
| 20M | 13k / 4.8k | **7.6k / 2.8k** | 4.3k / 1.6k |
| 50M | 31k / 11.4k | **18.3k / 6.7k** | 10.4k / 3.8k |

**Cross-checks (ESTIMATE):**
- Using IN/SEA D60 RPI US$0.11: 7,600 installs/month × $0.11 ≈ $836 ≈ 22M VND gross within each cohort's first 60 days. That is the same order as the Mid/20M case.
- Mid/20M case: 535 payers × 52.8k gross ≈ 28M VND gross ≈ US$1,070 MRR, i.e. RevenueCat's US$1K milestone (17.3% of apps within 2 years). Mid/50M: 1,281 × 52.8k ≈ 67.6M VND ≈ US$2,570 gross MRR.
- Market comparators (third-party estimates, iOS only): MochiVocab ~43K MAU, +9.2K installs/month, "<$10K" revenue/month; TFlat ~127K MAU, "$10K+"/month, mostly ads ([AppGoblin](https://appgoblin.info/apps/1484058499), [AppGoblin](https://appgoblin.info/apps/591049834)). At the median conversion, this app's Mid/20M case needs ~7.6k installs/month, close to MochiVocab's estimated iOS pace (~9.2k/month). At top-quartile conversion it needs ~2.8k/month.

**Paid acquisition does not pay back (ESTIMATE):**
- LTV per payer (Mid) ≈ 42.2k net × 10 months ≈ 422k VND ≈ US$16.
- Break-even cost per install = LTV × conversion ≈ US$0.11 (at 0.7%) to US$0.30 (at 1.9%).
- Available CPI benchmarks are US$1.50–3.00 for APAC in 2025 (not Vietnam- or education-specific) and US$104 for Facebook education installs across all countries ([Mapendo](https://mapendo.co/blog/cost-per-install-by-country-2025), [Superads](https://www.superads.ai/facebook-ads-costs/cost-per-app-install/education)). On those numbers, paid installs cost **~5–27× what a payer returns**. Growth has to be organic.

**Sensitivity (ESTIMATE):**
- The result is most sensitive to **conversion** and **price**, and barely sensitive to AI cost.
- Halving L to 5 months doubles the installs needed.
- Moving all sales to web/VietQR (factor ~0.97 vs 0.80) cuts the number of payers needed by ~18%, at the price of manual renewals.
- A 299k lifetime plan (TFlat-style) would require continuous new-user flow just to cover AI and hosting for old lifetime users.

### Gaps
- L, the payer share of MAU and the plan mix are not observed for Vietnam. They should be replaced with pilot data. The pilot metrics exist in `docs/specs/DECISIONS_2026-10-04.md` §8; their thresholds are open (Q-D in `CLAUDE.md`).
- The model ignores refunds (Adapty global 8.3%), discounts and promotions (14.3% of Education apps discount), and the owner's own time cost.

## 6. Acquisition: CPI/CAC, organic channels, solo/tiny-team examples

### Takeaway
No Vietnam education CPI was found. Benchmarks imply paid installs cost far more than a Vietnamese payer is worth (§5). The evidence for organic growth is creator and influencer content (Duolingo: two thirds of social impressions in China, Indonesia and India), TikTok education content, and long-lived store search positions. Two Vietnamese vocabulary or dictionary apps published under individual developer accounts, TFlat and MochiVocab, show that a tiny team can reach paying users at scale.

### Cited Findings
- **CPI:** no 2025 Vietnam-specific or education-specific CPI found. Mapendo gives APAC US$1.50–3.00 (2025) and global iOS ~$3.60, Android ~$1.20 (another Mapendo page: iOS $4.70, Android $3.70) — [Mapendo by country](https://mapendo.co/blog/cost-per-install-by-country-2025), [Mapendo report](https://mapendo.co/blog/cost-per-install-2025-the-ultimate-report-to-grow-your-app-worldwide). Superads: Facebook education CPI averages US$104 across all countries (May 2025–May 2026, ~US$3B spend) vs US$13.43 for all industries, with high volatility — [Superads](https://www.superads.ai/facebook-ads-costs/cost-per-app-install/education). AppsFlyer's Vietnam report gives no CPI by category — [AppsFlyer](https://www.appsflyer.com/resources/reports/app-marketing-vietnam-report/)
- **Influencer and social content:** Duolingo says that "in countries like China, Indonesia, and India, roughly two thirds of our social impressions have come from influencer-generated content." Q2 2026 DAU growth was driven by product changes, marketing and a streak-restore campaign (15M+ learners restored streaks) — [Duolingo Q2 2026](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- **TikTok education content in Vietnam:** #LearnOnTikTok's first year had 3.7M+ educational videos, ~140B views and 700+ creators. This is **old (18/08/2021)** — [VietTimes](https://viettimes.vn/chien-dich-learn-on-tiktok-hon-37-trieu-video-mang-noi-dung-giao-duc-va-140-ti-luot-xem-post149414.html)
- **Creator prices:** Scrumball's Oct 2026 ranking of Vietnamese "teacher" TikTokers lists, for example, "King English Kids" at 6.7M followers with an estimated US$10.8K–16.1K price, and creators with 130K–260K followers at ~US$216–616. The basis (per post?) is not stated and the figures are not independently verified — [Scrumball](https://www.scrumball.com/ranking/top-teacher-influencers-on-tiktok-in-vietnam)
- **Solo/tiny-team examples:**
  - TFlat: developer "Thang Le" on the App Store; released 2013; 155k ratings in Vietnam; ~8.1M iOS installs and "$10K+"/month (AppGoblin estimates; 76% ads) — [App Store VN](https://apps.apple.com/vn/app/id591049834), [AppGoblin](https://appgoblin.info/apps/591049834)
  - MochiVocab: developer "Anh Quach"; 45k ratings; ~2.4M iOS installs, ~43K MAU, "<$10K"/month, no ads (AppGoblin estimates) — [App Store VN](https://apps.apple.com/vn/app/id1484058499), [AppGoblin](https://appgoblin.info/apps/1484058499)
  - Both are listed under individual developer names. Whether the teams behind them are actually one person is **UNVERIFIED** (PrepEdu describes TFlat as built by "đội ngũ người Việt", search summary of [prepedu.com](https://prepedu.com/vi/blog/app-tu-dien-tieng-anh)).
- **ELSA** reportedly grew "organically" in Vietnam to ~2M users (undated, likely old) — [Vietnamnet](https://vietnamnet.vn/en/vietnams-app-for-english-pronunciation-wins-over-learners-E218938.html)

### Inferences
- Channels to test first, cheapest to most expensive (ESTIMATE, untested):
  1. App Store / Play search for Vietnamese queries ("học từ vựng", "từ vựng IELTS") — MochiVocab sits at #94 and TFlat at #54 in the Education chart.
  2. Short-form "word of the day / common mistakes" videos made by the owner on TikTok, Reels and Shorts.
  3. Facebook study groups (IELTS/TOEIC/THPT).
  4. Teachers and English centres giving classes a shared word list (B2B2C).
  5. Paid micro-creators (~US$200–600 per creator by Scrumball's estimates) only once organic conversion is measured.
- Because a payer is worth ~US$10–28 net over 10 months (Low to High scenarios), any paid channel must deliver installs at **US$0.07–0.53** (break-even CPI across the Low/High × 0.7%/1.9% cases), which is implausible on Meta/Google ads.

### Gaps
- No primary 2025–2026 Vietnam CPI or CAC for education apps; no data on the Facebook-group or SEO channel performance of Vietnamese learning apps.
- Founder interviews or revenue disclosures for TFlat, MochiMochi or Lingoland were not found.

## 7. Risks: price sensitivity, sharing/piracy, free alternatives, seasonality

### Takeaway
The main risks are:
- A **low price anchor** (TFlat 199k/yr or lifetime) and strong free substitutes (Duolingo free, Quizlet free, Anki, free AI chat, which 5/6 survey answers called "enough").
- **Revenue concentration:** the top 10% of Education apps take 96% of revenue.
- A **shrinking compulsory-exam driver:** English became an elective in the THPT graduation exam in 2025, and English test-takers fell from ~907k (2024) to ~335k (2026).

### Cited Findings
- **English in the THPT exam:** "Tiếng Anh là môn tự chọn từ năm 2025". English papers: 906,549 (2024), 351,848 (2025), 334,547 (2026). Below-average results: 55.6% in 2026 by the article's own counts (186,102/334,547), 45% in 2025 — [Đại biểu Nhân dân (01/07/2026)](https://daibieunhandan.vn/50-diem-thi-tieng-anh-duoi-trung-binh-danh-gia-sat-nang-luc-hoc-sinh-10422161.html). The 2026 exam ran 11–12 June, with electives (including English) on the morning of 12 June. English average 4.75 vs 5.25 in 2025 — [VOV (01/07/2026)](https://vov.vn/xa-hoi/diem-mon-tieng-anh-tot-nghiep-thpt-ty-le-bai-thi-duoi-diem-5-da-vuot-nguong-50-post1311241.vov). Strong candidates may be exempted from the exam or have certificate scores converted (no counts given) — same article.
- **Concentration:** in Adapty's data the top 10% of Education apps earn 96.0% of the category's revenue — [Adapty](https://adapty.io/state-of-in-app-subscriptions-report/). In RevenueCat's data the top 25% of apps grew MRR 80% while the bottom quartile fell 33% — [9to5mac](https://9to5mac.com/?p=1042212) (via search summary)
- **Price anchors and lifetime plans:** TFlat VIP 199k/yr and 199k forever; Lingoland, ELSA, Memrise, LingoDeer and Monkey all sell lifetime plans (§2 table).
- **Sharing:** family plans exist at low per-head cost: Duolingo Family 899k/yr ([App Store VN](https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128)) and Cake Plus Family 2,399k ([App Store VN](https://apps.apple.com/vn/app/id1350420987)). A Chiaki listing selling "Nâng cấp Duolingo Super 01 năm" for 550k (from 900k) appeared in search results, but the page returned HTTP 410 on 19/10/2026 — **UNVERIFIED** — [Chiaki](https://chiaki.vn/nang-cap-duolingo-super-01-nam)
- **Free alternatives:**
  - The repo survey found 5/6 open answers saying AI chat already meets their need, and one respondent said free AI tools are good enough (`SURVEY_ANALYSIS_2026-09-30.md`).
  - ChatGPT Study Mode and Gemini Guided Learning/Study Notebooks offer quizzes and study plans (`COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md`).
  - AnkiMobile costs 799k on iOS ([App Store VN](https://apps.apple.com/vn/app/id373493387)). Anki on Android and desktop is free (well known; **not re-verified this session**).
- **Web payment friction:** RevenueCat finds only 0.8% of IN/SEA revenue comes from web purchases — [RevenueCat](https://www.revenuecat.com/state-of-subscription-apps). payOS's page does not mention recurring billing — [payOS](https://payos.vn/)

### Inferences
- **Seasonality (ESTIMATE):** the THPT driver peaks before mid-June, but with English elective it now concerns only ~27% of exam-takers (334,547 of the ~1.22M registered candidates; the 1.22M figure comes from a search summary attributed to [Báo Mới](https://baomoi.com/xu-huong-moi-trong-lua-chon-mon-thi-tot-nghiep-thpt-2026-c55100666.epi), UNVERIFIED). Certificate-based exemption and conversion suggests demand is shifting to IELTS/TOEIC-style certificates, which run all year. Expect Pro sign-ups to bunch around exam dates and the start of the school year, and churn after them.
- **Sharing risk** is limited for a vocabulary app whose value is the learner's own review history (sharing one account mixes two people's schedules). Family plans and gift-code resale are the more realistic leak. **Lifetime plans** are the bigger revenue risk.
- **Strong free substitutes** mean the paid tier must sell what free tools do not package: quick-add from anywhere, an automatic review schedule across web and mobile, and level/topic catalogs. AI questions alone are matched by free chat. This aligns with the repo competitor doc's conclusion.
- **Platform risk:** iOS requires IAP (15%). Selling on web at a lower price and steering iOS users there is restricted by Apple's 3.1.1/3.1.3 (repo doc). Plan on store fees for iOS buyers.

### Gaps
- No data on IELTS/TOEIC test volumes in Vietnam (2024–2026) or on monthly search seasonality (Google Trends not queried).
- No data on account-sharing prevalence for Vietnamese learning apps.
- No price-sensitivity or willingness-to-pay measurement for Vietnamese learners (no Van Westendorp-style or conjoint study found); the repo survey is too small (n=13).
