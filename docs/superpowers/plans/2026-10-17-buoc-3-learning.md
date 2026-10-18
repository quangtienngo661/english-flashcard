# Bước 3 — Learning Implementation Plan (system part)

> **Status 17/10/2026:** written on the owner's request ("viết implementation plan đi") while the design doc is still marked
> "chưa duyệt". **This plan covers the system only (API, worker, database).** The learner web app in
> `apps/web` and the admin screens (settings page, "entries without a meaning" export option) are a **separate UI plan**,
> written and implemented in another session after this plan is settled (owner, 17/10/2026). Implementation started 17/10 in
> sessions step-3-impl-A…D. No open gate (G5: the owner declares Bước 3 done, D45; G6: AGID, D46).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner
> implements in a separate session (17/10/2026; not the Codex loop). Which tasks can run side by side: "Parallel tracks" below.

**Goal:** The API lets learners collect words from the catalog, as their own private words or as inflected forms, review them
per group on a fixed ladder with two answers, and receive at most one reminder email a day; admins tune the numbers through
the API; the catalog can be published without topics and exported as "entries without a meaning".

**Architecture:** Three new API modules — **Learning** (groups, items, queue, reviews, backlog, quick add), **Notifications**
(reminder preferences, a `NotificationProvider` port with an email implementation, a channel chooser, a 15-minute BullMQ Job
Scheduler that enqueues one send job per learner per local day) and **Settings** (admin-tunable values with bounds, version
and history) — plus Content extensions (private words, context sentences, inflection table, word pages, lookup) and Pipeline
extensions (inflection columns, form-of links, a backfill job, export of entries without senses). Mail sending moves to
`src/common/mail`. The learner app (in `apps/web`, under `/vi/app` and `/en/app`, G1) and the admin screens are built by the
UI plan on top of the routes of design §10.

**Tech Stack:** API unchanged (NestJS `12.1.2`, Prisma `7.10.0`, Postgres 17, BullMQ `6.3.12`, ioredis `6.0.0`, Vitest 4 +
Testcontainers) plus **`compromise@14.18.0`** (MIT; fallback for verbs and nouns, D46) and **`pluralize@8.0.0`** (MIT;
uncountable nouns, D47), both approved by the owner 17/10. Inflection data: AGID 2016.01.19 (D46). No other new dependency
without asking the owner.

**Spec:** [`docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md`](../specs/2026-10-16-buoc-3-learning-design.md) — read the
section named in each task. Decisions: [`../decisions/2026-10-16-buoc-3-learning-decisions.md`](../decisions/2026-10-16-buoc-3-learning-decisions.md).
Every test name starts with the `B3#`/`B3E#` (or `D#`) it proves and asserts every clause of that criterion's Then, including
state read back by a fresh query after a refused request.

**Branches:** this plan lives on `docs/buoc-3-design`. Implementation: one branch per **track** (see "Parallel tracks"), each
cut from the latest `dev`, each in its own git worktree when tracks run at the same time, each merged into `dev` by PR once CI
is green. A track that needs another track's task merges `dev` into its branch after that task's PR is merged.

## Decision gates (owner answers first, Claude proposes after — CLAUDE.md, Bước 3 rule)

| Gate | Question for the owner | Needed before | Context (no option is favoured) |
|---|---|---|---|
| G1 | **Answered 17/10:** the learner app lives under the landing's language prefix, `/vi/app/...` and `/en/app/...` (D39). | Task 20 | The reminder email links to `<LEARNER_APP_URL>/<native_language>/app/settings` (`vi` when the profile has none). Claude's added proposal, awaiting the owner: the prefix always follows the profile's `native_language` (the UI plan redirects a mismatch). |
| G2 | **Answered 17/10 (D44):** two regular reminders to one learner are at least N local days apart; admin sets N from 1 to 7, default 2. Replaces "at most N emails a week". | Task 21 | Task 9 (merged) has `reminders.weeklyMax` (0–7, default 3); Task 21 renames it to `reminders.minGapDays` (1–7, default 2). No real data yet, so nothing to migrate. The inactive email stays at most once in 7 days (D26). |
| G3 | **Answered 17/10:** light/dark follows the learner's system (D40). | — | Stored on the device by the UI plan; no API change. |
| G6 | **Answered 17/10 (D46):** AGID 2016.01.19 is the main source (level-0 forms, questionable entries skipped); `compromise` is a fallback for verbs and nouns missing from AGID only; adjectives missing from AGID get no comparative/superlative; measured first against the same bar (50/50, ≥ 95/100), else stop and measure `en-inflectors`. AGID is registered as a `data_sources` row and credited in a third-party notice file. Before: Task 4 measured 17/10 (track A): `compromise@14.18.0` **failed** the bar — 47/50 fixture cases (past participle of run, come, become wrong) and about 81/100 random CEFR-J rows (long adjectives given -er/-est such as "transitiver", "thoughtlesser"; redo → "redid"; no plural for self). Which source for library forms: compromise for verbs and nouns only plus a hand-written irregular list, AGID (licence unchecked), Wiktionary data (CC BY-SA), no library set (reviewed CSV forms only), or a lower bar? | Task 4b, the library parts of Tasks 5 and 7 | Coordinator split 17/10: Task 4a (table, columns, `InflectionKind`, `replaceInflections`, `entriesByForm`) and Task 5 without library forms go in PR A1; Task 4b (generator + measurement) and Task 7's library parts (forms on import, backfill job) wait for G6 and go in PR A3. Final behaviour unchanged once G6 is answered. |
| G5 | **Answered 17/10 (D45):** the owner declares when Bước 3 is done ("mình sẽ báo cho bạn đến khi bước 3 xong"); no fixed checklist is set in advance. | Task 22 | Task 22 still runs its gate, the manual system walkthrough and the as-built report, and hands them to the owner; it does not call Bước 3 done. The UI plan adds its own checks. |

The group picker for up to 100 groups (former G4) belongs to the UI plan: `POST /v1/quick-add` and `POST /v1/groups/{id}/items`
take any `group_id`, so no API task waits for it. Design cases left to the UI plan: B3E32 (the learner app blocked in
production) and B3E34 (the reminder link opened while signed out); every other `B3#`/`B3E#` has a test in this plan.

## Parallel tracks (checked 17/10/2026 against each task's Files and Interfaces)

| Track | Tasks, in order | Starts | Waits for |
|---|---|---|---|
| A — Content | 1 → 2 → 3 → 4a → 5, **PR A1**; 6 → 7 (no library parts) → 8, **PR A2**; 4b → 7 library parts, **PR A3** (after G6) | day one | PR A3: G6 |
| B — Platform | 9, **PR B1**; 17 → 18 → 19 → 20, **PR B2** | day one | nothing (edits no Content or Learning file) |
| C — Learning | 10 → 11; 12 → 13; 14, **PR C1**; 15 → 16, **PR C2** | day one (10, 11) | 12–13: PR A1 (Tasks 3, 5). 14: PR A2 (Tasks 6, 8) and PR B1 (Task 9). 16: PR A1, A2 |
| D — Reminders | 21 → 22 | after PR B2 and PR C1 | 21: Tasks 14 and 20. 22: every PR merged |

Each PR merges into `dev` as soon as its CI is green, so a waiting track merges `dev` into its branch and goes on; nobody waits
for a whole track to finish (B opens PR B1 right after Task 9, C opens PR C1 right after Task 14).

Why (from the Interfaces blocks):
- **B** uses only Identity and common code: Settings (9), the mail move (17), identity reads (18) and preferences (19) need
  nothing else; the email provider (20) needs 9, 17, 18 and 19, all inside B.
- **C** Tasks 10 and 11 need nothing (an item stores `sense_id` as a plain uuid; the schedule rules are pure functions).
  Task 12 needs `visibleSenseIds`/`bulkCandidates` and private words (Task 5); 13 needs 12; 14 needs `cardContent` (8),
  `listSentences` (6) and settings (9); 15 needs 14; 16 needs 5, 6 and 12. C edits no Content file except one export line in
  Task 10.
- **A** stays one session: its tasks share `content.service.ts`, `content.prisma`, `index.ts` and the admin queries. Optional:
  after Task 4, Task 7 (mostly `src/content-pipeline/**`) can run in a second worktree beside 5, 6, 8.
- **D** needs `cardsLeftToday` (14) and the provider (20).

Files edited by more than one track (small conflicts, resolved by hand when merging): `src/app.module.ts` (Tasks 9, 10, 19 —
one import line each), `src/content/index.ts` (track A, and Task 10's `LearnerContent` export), new migration folders (rename
rule in Global Constraints), `test/support/create-test-app.ts` (17 in B, 21 in D — never at the same time).

Critical path: A (Tasks 1–8) → C (14 → 15, 16) → D (21 → 22). B and C's 10–11 fit inside A's time, so at most three sessions
run at once. The UI plan can build on each PR as it lands: the "entries without a meaning" option after A's PR 1 (Task 2), the
admin settings page after B's PR (Task 9), the learner screens after C's PR.

## Verified on 17/10/2026

| Check | Result |
|---|---|
| `compromise` | `npm view`: `14.18.0`, licence MIT. Accuracy on CEFR-J **not** measured (Task 4). |
| BullMQ `6.3.12` (docs via context7, 16/10) | `upsertJobScheduler(id, { every }, template)`; a job added with an existing stored `jobId` is ignored; a stalled job goes back to waiting (delivery is at least once). Bước 2 measured that `removeOnComplete: true` lets the same `jobId` run again, so reminder de-duplication rests on `reminder_deliveries`, not on Redis. |
| Repo facts | `ContentService` writes take `tx`. `MailBudget` buckets by **UTC** day (`<MAIL_BUDGET_KEY>:YYYY-MM-DD`) and `tryConsume` increments before comparing; its model `MailBudgetBucket` lives in `identity.prisma`. `SessionChain.lastUsedAt` is set on refresh (`session.service.ts:184`). `LearnerContentGuard` gives 403 `profile-incomplete` without `native_language`. `PublishViolation` includes `topic-missing` (`publish.service.ts:9,35`). `Entry` has `@@unique([language, lemma, pos])`. The senses partial index `senses_entry_label_live_key` allows one null-label live sense per entry. The API listens on 3000. |
| **Not verified** | Inflection accuracy (Task 4 measures); tick cost beyond a few thousand learners; how Prisma treats a migration with an older folder name merged after a newer one (parallel tracks rename before merging, see "Parallel tracks"). |

## Global Constraints

- Paths are under `apps/api/` unless they start with `docs/`. Commands run from `apps/api/` in **PowerShell**; Docker Desktop
  must be running. No task edits `apps/web` or `apps/admin` (UI plan).
- API conventions as Bước 2: ESM imports end in `.js`; JSON `snake_case`; routes under `/v1`; `z.strictObject` bound with
  `@Body({ schema })`/`@Query({ schema })`/`@Param({ schema })`; bad input is 400 `validation-failed`, never 500.
- New problem slugs: `version-conflict` (409), `group-name-taken` (409), `group-limit-reached` (409), `group-full` (409),
  `private-word-limit-reached` (409), `private-word-exists` (409), `sentence-limit-reached` (409);
  everything missing or not visible to the caller is 404 `not-found`.
- **Module boundaries (D3 of Bước 1):** new model files `prisma/models/{learning,notifications,settings}.prisma`; Learning
  imports Content only through `src/content/index.ts`; Notifications imports Learning only through `src/learning/index.ts`;
  Learning and Notifications import Settings only through `src/settings/index.ts`; Identity is reached only through `IdentityService`; Content never imports
  Learning; `src/common/**` imports none of them. No Prisma `@relation` across modules.
- **Privacy (S6, B3#12):** every learner read of entries/senses filters `scope = 'catalog'` (published, open) `OR owner_user_id =
  <caller>`; every staff read filters `scope = 'catalog'`. A private id of another learner is 404, never 403.
- **Time:** `Clock.now()` only. "Today" = `localDate(profile.timezone, now)`; `due_date` and `local_date` are Postgres `date`.
  Never `now()`/`CURRENT_DATE` in schedule or reminder decisions. Test zones: `Asia/Ho_Chi_Minh`, `Pacific/Kiritimati` (UTC+14),
  `Etc/GMT+12` (UTC−12), `America/New_York` (DST end 2026-11-01).
- **Fixed numbers (design §6, §7, §9, D21–D23):** ladder `[1, 3, 7, 14, 30]` days, levels 0–5; per group per local day 20 new
  and 100 due (priority not counted); backlog = level ≥ 1 and overdue > 60 days; ≤ 100 groups/learner, ≤ 2,000 items/group,
  ≤ 1,000 private entries/learner; group name 1–60, lemma 1–100, meaning 1–300, sentence 1–300 **code points after NFC + trim**;
  ≤ 5 sentences per (learner, sense); reminder tick 15 min; reminders stop at 80% of `MAIL_DAILY_BUDGET`; settings defaults and
  bounds of design §9. Limits that Bước 5 turns into quotas live in one constants file per module.
- **Writes (design §10: every write carries `Idempotency-Key`):** every new `POST`/`PATCH`/`PUT`/`DELETE` route — learner and
  admin — has `@Idempotent()` (the interceptor then requires the header: 400 without it, `idempotency.interceptor.ts:38-40`;
  the key is scoped to the real path, so one key on two ids never replays the wrong result) and learner routes also
  `@RateLimit('user.write')`. The one exception is `POST /v1/reviews`: idempotent by its `review_id` instead of the header
  (same `review_id` + same body → the stored result; same `review_id` + a different `item_id`/`group_id`/`answer` → 400, like a
  reused `Idempotency-Key` with another payload), and limited by its own rule `learning.review` (per user, 120 per 60 s) instead
  of `user.write` (30 per 60 s would stop a learner flipping a card every 2 s mid-session) — coordinator decision 17/10 on
  track C's question; the rule goes into `DEFAULT_LIMITS` in `src/common/config/app-config.ts`.
- **Logs:** `AppLogger` only; never a context sentence, a private meaning, an email address or a token. Reminder logs carry
  `user_id`, `local_date`, `kind`, outcome.
- **Tests:** real Postgres, Redis, Mailpit through Testcontainers; `FakeClock` for dates; suites with global counts use
  `createIsolatedDatabase()`. Unit `*.spec.ts`, e2e `*.e2e-spec.ts`.
- **Migrations on parallel tracks:** before a track's PR merges, its migration folders are renamed to a timestamp later than
  the newest migration on `dev`, then `pnpm db:setup` and the suites re-run on the merged result.
- **Git:** commit after every task on the track branch, Conventional Commits (`feat(learning): …`, lower case, imperative)
  ending with the `Co-Authored-By` line. Push and open a PR into `dev` without asking; merge a PR once its CI is green (owner,
  16/10/2026); `dev` → `main` only when the owner asks. Scan for secrets before every push.

## Review Focus

1. **Day boundaries in unusual zones** — UTC+14, UTC−12, the New York DST day — "today", due dates, cap resets and the send time
   must follow the learner's local day; Tasks 11, 21.
2. **Another learner's private data on any read path** — word page, headword search, lookup, `items?sense_ids`, queue card,
   sentences, quick add with someone else's `sense_id` — must be absent or 404; Tasks 3, 6, 8, 12, 16.
3. **Long or odd text sent to the API** — a 100-character lemma, a 300-character meaning or sentence, emoji, NFD input, a
   group name differing only by case or composition — must be counted per code point after NFC and compared consistently;
   Tasks 5, 6, 10.
4. **Two worker processes running at once** (a restart overlap, or two workers by mistake) — the 15-minute tick runs in both,
   yet a learner still gets at most one email per local day; Task 21.
5. **A learner with 100 groups of 2,000 words** — `GET /v1/groups` must not query per group and must answer in under 500 ms on
   the dev machine (threshold `ASSUMPTION`, printed for the owner); Task 14.

---

# Milestone M1 — Content (track A)

### Task 1: Publish without a topic (D7)

**Files:**
- Modify: `src/content/senses/publish.service.ts`, `src/content/catalog/admin-catalog.queries.ts` (the `missing` list),
  `test/content/publish.e2e-spec.ts`, `test/pipeline/export.e2e-spec.ts`, `test/pipeline/publish-jobs.e2e-spec.ts`

**Interfaces:**
- Produces: `type PublishViolation = 'gloss-missing' | 'example-missing' | 'level-missing'`.

- [ ] **Step 1: Failing tests.** `B3#14: a sense with gloss, example and level but no topic publishes and appears in search`;
  `B3E33: that sense is absent from GET /v1/senses?topic=food`; the B2#44 case now expects only the three remaining
  violations; `unpublishable export rows no longer name topic in _missing`. Control: `grep -rn "topic-missing" apps/admin/src`
  returns nothing (checked 16/10; re-run).
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.e2e.ts test/content/publish.e2e-spec.ts` → FAIL.
- [ ] **Step 3: Implement.** Drop the topic condition and the `topic-missing` member; archived topics are still refused when
  given explicitly (Bước 2 rules unchanged).
- [ ] **Step 4:** Re-run, then `pnpm test; pnpm test:e2e` → green; report counts.
- [ ] **Step 5: Commit** `feat(content): publish senses without a topic`.

### Task 2: Export entries that have no sense (D34)

**Files:**
- Modify: `src/content-pipeline/export/export.service.ts`, `src/content-pipeline/export/senses-export.controller.ts` (add a
  second controller class in the same file), `src/content/catalog/admin-catalog.queries.ts`, `src/content/content.service.ts`
- Test: `test/pipeline/export-entries.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /v1/admin/content/entries/export?has_sense=false&level=` (`content.edit`; `has_sense` must be `false`; `level`
  optional) streaming CSV with columns `headword, pos, gloss_vi, definition_en, example_en_1, example_en_2, example_en_3,
  topics, accepted_forms, context_label, _level` (content cells empty), same BOM/formula guard/`exportMaxRows` rule
  (`export-too-large`) as the sense export; `ContentService.listEntriesWithoutSense(filter: { level?: Level }, limit: number):
  Promise<{ rows: Array<{ headword: string; pos: string; _level: Level | null }> } | { tooMany: true }>` (catalog only, entries
  with no non-retired sense); `Content-Disposition` file name `entries-without-sense.csv`. The admin export option that
  calls it is in the UI plan; until then the owner downloads it with curl.

- [ ] **Step 1: Failing tests.** API: `B3#15: after importing a level-only CEFR-J sample, the export lists exactly the entries
  without a sense, one row each with _level and empty content cells`; `B3#15 (round trip): filling gloss_vi and example_en_1 in
  that file and uploading it without a level source creates one draft sense per filled row and leaves empty rows unchanged`;
  `level=A1 limits the rows`; `more rows than exportMaxRows → 400 export-too-large and nothing streamed`; `has_sense=true or
  missing → 400 validation-failed`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces, reusing `toCsv`/`csvRow` and `writeChunk`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(pipeline): export entries that have no sense`.

### Task 3: Private entry scope and the catalog boundary

**Files:**
- Modify: `prisma/models/content.prisma`, new migration `<ts>_private_entries`, `src/content/catalog/entries.service.ts`,
  `src/content/catalog/admin-catalog.queries.ts`, `src/content/learner/learner-content.service.ts`,
  `src/content/senses/publish.service.ts`, `src/content/catalog/revert.service.ts`, every other `entries` read found by
  `grep -rn "entries\b\|tx.entry\|prisma.entry" src/content src/content-pipeline`
- Test: `test/content/schema.e2e-spec.ts`, new `test/content/private-boundary.e2e-spec.ts`

**Interfaces:**
- Produces: `Entry.scope String @default("catalog")` and `Entry.ownerUserId String? @map("owner_user_id") @db.Uuid` (no FK);
  CHECKs `scope IN ('catalog','private')` and `(scope = 'catalog') = (owner_user_id IS NULL)`. `@@unique([language, lemma, pos])`
  is replaced by hand-written partial indexes `entries_catalog_key ON entries (language, lemma, pos) WHERE scope = 'catalog'`
  and `entries_private_key ON entries (owner_user_id, language, lemma, pos) WHERE scope = 'private'`; code that used the
  compound unique (`language_lemma_pos`, `entries.service.ts:51`) switches to `findFirst` with `scope: 'catalog'`. **Every
  `ON CONFLICT` on `entries` names the index predicate**: `ensureEntry`'s `ON CONFLICT (language, lemma, pos) DO NOTHING`
  (`entries.service.ts:49`) becomes `ON CONFLICT (language, lemma, pos) WHERE scope = 'catalog' DO NOTHING` — without it Postgres
  17 fails with "there is no unique or exclusion constraint matching the ON CONFLICT specification" (checked 17/10 on a temp
  table). Private writes lock `content.private:<owner>:<lemma>:<pos>` (catalog lock key unchanged).

- [ ] **Step 1: Failing tests.** `schema: catalog (language, lemma, pos) stays unique among catalog rows; two learners may each
  own deploy/verb next to the catalog deploy/verb; a private row without owner or a catalog row with an owner is refused`;
  `B2#69 (scope): with private rows seeded by SQL, the entries list, senses list, sense detail, both exports and a publish-job
  snapshot return catalog rows only`; `B3#12 (Bước 2 learner routes): /v1/senses/search, /v1/senses and /v1/senses/:id never
  return private senses, the caller's own included`; `import: a CSV row deploy,verb attaches to the catalog entry when private
  deploy/verb entries exist`; `B2E9 (after the index change): ten concurrent ensureEntry calls for one new catalog key still leave
  exactly one entry and none fails`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Generate the migration with `prisma migrate diff … --script`, append the CHECKs and partial indexes
  by hand, and note in the commit whether `migrate diff` afterwards proposes dropping them (as Bước 2 Task 2).
- [ ] **Step 4:** `pnpm db:setup`; run the new specs and the whole Bước 2 suite → PASS.
- [ ] **Step 5: Commit** `feat(content): add private entry scope and keep catalog reads catalog-only`.

### Task 4: Inflection table and generator (D29)

**Files:**
- Create: `src/content/inflections/inflect.ts` (+ `inflect.spec.ts`), `src/content/inflections/inflections.service.ts`,
  `test/fixtures/irregular-forms.ts`, `test/content/inflections.e2e-spec.ts`
- Modify: `prisma/models/content.prisma` + migration, `src/content/content.service.ts`, `src/content/index.ts`, `package.json`

**Interfaces:**
- Produces: `type InflectionKind = 'third_person' | 'present_participle' | 'past' | 'past_participle' | 'plural' |
  'comparative' | 'superlative'`; `generateInflections(lemma: string, pos: string): Array<{ form: string; kind:
  InflectionKind }>` (verb → the four verb kinds, noun → plural, adjective → comparative and superlative, anything else or a
  multi-word lemma → `[]`; a form equal to the lemma is dropped). **Source (D46, Task 4b):** a compact data file generated
  from AGID 2016.01.19 (level-0 forms only, entries marked `?` `~` `<` `!` skipped, several level-0 forms all kept, the first
  one shown); a lemma missing from AGID falls back to `compromise` for verbs and nouns, and gets nothing for adjectives.
  **Adjectives (D46 round 2, after the 419-row audit found ~23% wrong AGID comparatives):** AGID forms are kept only for
  one-syllable adjectives, two-syllable ones ending in -y, -ly, -le, -er, -ow, and a small irregular set (good, bad, well, ill,
  far, little, old); measured on the 419 audited rows, ≥ 95% of the forms still shown must be right, otherwise adjectives get no
  library forms at all. **Measured 17/10: 92.1% (24 wrong forms got through) → adjectives have no library forms**; only reviewed
  CSV forms. The 50-case fixture becomes 40 verb/noun cases + 10 adjective cases expected empty. **Uncountable nouns (D47):**
  `pluralize@8.0.0` (MIT) is added; a noun whose `pluralize.plural(lemma)` equals the lemma gets no library plural (music,
  software, information…); reviewed CSV forms are never filtered. All level-0 forms of a kind are stored and returned in AGID order (ring: ringed, rang). Model `EntryInflection` (`entry_inflections`: `entryId` FK
  cascade, `form`, `formKey` lower-case NFC, `kind`, `source` `library | reviewed`; unique `(entry_id, form, kind)`; index
  `form_key`). Revision columns `formOfEntryId` (`form_of_entry_id`, uuid, same module FK) and `formKind`.
  `ContentService.replaceInflections(tx, entryId: string, source: 'library' | 'reviewed', forms: Array<{ form; kind }>):
  Promise<void>` (a reviewed set replaces every row of the entry; a library set replaces only library rows and is skipped when
  reviewed rows exist); `ContentService.entriesByForm(formKey: string, viewerId: string): Promise<Array<{ entryId; lemma; pos;
  kind }>>` (visible entries only).

- [ ] **Step 1: Measure first.** In a scratch folder outside the repo, install `compromise@14.18.0`, run the candidate
  `generateInflections` over the 7,799 CEFR-J rows and over the 50 cases of `test/fixtures/irregular-forms.ts` (30 irregular
  verbs incl. go/went/gone, be, have, leave/left; 10 irregular plurals incl. mouse/mice, child/children, leaf/leaves; 10
  adjectives incl. good/better/best, bad/worse/worst). Pass bar (`ASSUMPTION`, owner may change): all 50 correct and ≥ 95 of a
  100-row random sample correct by hand. Record the numbers in the commit message. **If it fails, stop and report** (AGID:
  licence unchecked; Wiktionary data: CC BY-SA) — do not pick another source alone.
- [ ] **Step 2: Failing tests.** `inflect.spec.ts`: the 50 fixture cases; `deploy → deploys, deploying, deployed (past),
  deployed (past_participle)`; `a preposition and "turn to" yield []`. e2e: `B3E13: entriesByForm("leaves") returns leaf
  (plural) and leave (third_person) when both are catalog entries`; `a reviewed set replaces library rows and a later library
  run leaves them alone`.
- [ ] **Step 3:** `pnpm add -E compromise@14.18.0`; run → FAIL.
- [ ] **Step 4: Implement** per the interfaces; run → PASS.
- [ ] **Step 5: Commit** `feat(content): add the inflection table and generator`.

### Task 5: Private words (write path)

**Files:**
- Create: `src/content/private/private-words.service.ts`, `src/content/private/my-words.controller.ts`,
  `src/content/private/my-words.schemas.ts`, `test/content/private-words.e2e-spec.ts`
- Modify: `src/content/content.service.ts`, `src/content/content.constants.ts`, `src/content/index.ts`, migration (CHECK on
  `entry_levels.basis` gains `user` and `derived`; `sense_revisions.draft_source` gains `user`)

**Interfaces:**
- Produces: constants `PRIVATE_WORDS_MAX = 1000`, `MEANING_MAX = 300`, `PRIVATE_POS_UNSET = 'unspecified'` (stored when the
  learner gives no part of speech; never valid for catalog rows). `type Meaning = { text: string; language: 'vi' | 'en' }`
  (`vi` → `gloss`/`vi` text, `en` → `definition`/`en` text). `ContentService.createPrivateSense(tx, input: { ownerId: string;
  lemma: string; pos: string | null; meaning: Meaning; level: Level | null; topicCodes: string[]; formOf: { entryId: string;
  kind: InflectionKind } | null }): Promise<{ entryId: string; senseId: string; createdEntry: boolean; catalogMatch: { entryId:
  string } | null }>` — refuses the 1,001st private entry (`PrivateWordLimitError`); a new meaning for an existing private
  lemma/pos becomes another sense of that entry with internal `context_label` `p2`, `p3`, … (plan proposal: the live-sense
  index allows one null label per entry; private labels are never shown); revision 1 is published immediately (`status
  published`, `live_revision_id` set, `draft_source 'user'`); level stored with basis `user`; a newly created private entry
  gets `library` inflections from Task 4 (design 7.3: private words have only the library set); with `level` null and `formOf`
  set, the level is stored with basis `derived`, equal to the base entry's displayed level (design 7.3).
  `ContentService.updatePrivateWord(tx, ownerId, entryId, patch: { lemma?; pos?; senses?: Array<{ senseId; meaning }>; level?;
  topicCodes? })` (a changed meaning publishes a new revision, the old one becomes `superseded`; lemma/pos clash →
  `private-word-exists`); `ContentService.deletePrivateEntryContent(tx, ownerId, entryId): Promise<{ senseIds: string[] }>`
  (deletes the entry and, by cascade or explicitly, its senses, revisions, texts, levels and inflections — Task 6 adds its
  context sentences; not exposed as a route — Learning calls it in Task 16). Route: `PATCH /v1/my-words/:id` (learner guard).
  For Learning (Task 12): `ContentService.visibleSenseIds(viewerId: string, senseIds: string[]): Promise<Set<string>>`
  (catalog published-open senses plus the viewer's private ones) and `ContentService.bulkCandidates(filter: { level?: Level;
  topic?: string; pos?: string }, limit: number): Promise<{ senseIds: string[]; skippedFunctionWords: number }>` (catalog,
  published, function words excluded — K11).

- [ ] **Step 1: Failing tests.** `B3E12: with 1,000 private entries seeded, the next create is 409 private-word-limit-reached and
  adding a catalog sense still works`; `CR13: creating deploy/verb privately next to the catalog deploy/verb is allowed and
  returns catalogMatch`; `meaning language: a vi learner's meaning is stored as gloss vi, an en learner's as definition en`;
  `a second meaning for one private lemma/pos becomes a second sense of the same entry`; `PATCH changes the meaning through a new
  live revision; PATCH by another learner → 404`; `a new private verb gets library forms that only its owner finds through
  entriesByForm`; `a private word with form_of and no level gets a derived level equal to the base entry's`; `Review Focus 3: 300 code points (emoji counted once) accepted, 301 → 400, whitespace-only → 400, NFD input
  stored NFC`; `visibleSenseIds returns catalog published senses and the viewer's own private ones, never another learner's`;
  `bulkCandidates excludes function words, unpublished senses and private entries and reports skippedFunctionWords`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(content): add learners' private words`.

### Task 6: Context sentences (design 7.4)

**Files:**
- Create: `src/content/sentences/sentences.service.ts`, `src/content/sentences/sentences.controller.ts`,
  `test/content/sentences.e2e-spec.ts`
- Modify: `prisma/models/content.prisma` + migration, `src/content/content.service.ts`, `src/content/index.ts`

**Interfaces:**
- Produces: model `ContextSentence` (`context_sentences`: `id`, `userId` uuid no FK, `senseId` FK → `senses` on delete cascade,
  `text`, `createdAt`; index `(user_id, sense_id)`). `ContentService.addSentence(tx, input: { userId: string; senseId: string;
  text: string }): Promise<{ id: string; text: string; createdAt: Date }>` (sense must be visible to the user, else
  `NotVisibleError` → 404; 6th sentence → `SentenceLimitError`); `listSentences(userId: string, senseIds: string[]):
  Promise<Map<string, Array<{ id: string; text: string; createdAt: Date }>>>`; `deleteSentence(userId: string, id: string):
  Promise<boolean>`. Routes: `POST /v1/senses/:id/sentences` `{ text }` → 201 `{ id, text, created_at }`; `DELETE
  /v1/sentences/:id` → 204.

- [ ] **Step 1: Failing tests.** `CR14: the 6th sentence for one (learner, sense) → 409 sentence-limit-reached; another sense or
  learner is independent`; `B3#12 (sentences): learner B cannot add to A's private sense, delete A's sentence or read it (404)`;
  `SR10: a sentinel sentence never appears in any log entry of add, list or delete`; `Review Focus 3: 300 code points accepted,
  301 refused`; `deletePrivateEntryContent removes that entry's sentences`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(content): store learners' context sentences`.

### Task 7: Inflections in the CSV flow, form-of links and the backfill job

**Files:**
- Modify: `src/content-pipeline/upload/columns.ts` (+ spec), `src/content-pipeline/upload/row-normalizer.ts` (+ spec),
  `src/content-pipeline/upload/row-errors.ts`, `src/content-pipeline/import/row-processor.ts`,
  `src/content-pipeline/import/prefilter.ts`, `src/content/senses/import-content.ts`, `src/content/senses/revision-content.ts`,
  `src/content-pipeline/export/export.service.ts`, `src/content/catalog/admin-catalog.queries.ts`,
  `src/content-pipeline/jobs/job-types.ts`, `prisma/models/pipeline.prisma` + migration (row-key kind `inflection`)
- Create: `src/content-pipeline/inflections/inflections-backfill.handler.ts`,
  `src/content-pipeline/inflections/inflections-backfill.controller.ts`, `test/pipeline/inflections.e2e-spec.ts`

**Interfaces:**
- Produces: CSV column `inflections` (entry level; `kind:form; kind:form`; empty keeps; the file's rows for one entry must carry
  the same value or leave it empty) and `form_of` (sense level; `lemma/pos:kind`, e.g. `go/verb:past_participle`; empty keeps;
  `-` clears). Row errors `invalid-inflection` (message lists the 7 kinds), `form-of-not-found`, `inflections-differ-in-file`.
  `RevisionContent` gains `formOf: { entryId: string; kind: InflectionKind } | null`. **`contentHash` adds `formOf` to the hashed
  object only when it is not null**, so every existing revision keeps its stored hash (`revision-content.ts:64-68` hashes an
  explicit object; adding a key unconditionally would change all of them and turn re-uploads of unchanged files into new
  drafts). Import: after
  the level step, a non-empty cell → `replaceInflections(…, 'reviewed', …)`; a newly created entry without reviewed forms gets
  `library` forms in the same transaction; a revision with `formOf` on an entry without any level adds an `entry_levels` row
  `basis 'derived'`, `source OWNER_SOURCE_ID`, equal to the base entry's displayed level. Prefilter key kind `inflection` =
  `(lemma, pos)` hashed over the normalized cell. Both exports gain `inflections` (**reviewed forms only**; empty when the entry
  has only library forms), `_inflections` (the library forms, for the reviewer to read; ignored on upload like every `_`
  column) and `form_of`. So exporting and uploading a file unchanged never turns library forms into reviewed ones. Job queue
  `content-inflections` (Bước 2 framework, `exclusiveKey 'content-inflections'`): processes catalog entries that have no
  inflection rows in chunks of 500 per `ctx.tx`; re-runs skip done entries. Route `POST /v1/admin/content/inflections/backfill`
  (`content.import`, `Idempotency-Key` required) → 202 `{ job_id }`; status through the existing job tables.

- [ ] **Step 1: Failing tests.** `D29 (import): a row went,verb with form_of go/verb:past creates the went sense linked to go
  and a derived level equal to go's`; `a reviewed inflections cell replaces library rows, an empty cell keeps them`; `an unknown
  kind → invalid-inflection listing the kinds`; `form_of naming a missing entry → form-of-not-found`; `two rows of one entry with
  different inflections → second row inflections-differ-in-file`; `export → upload with the new columns is unchanged and the
  entry's library forms stay library`; `B2#10 still holds: re-uploading an unchanged file reports every row unchanged`; `hash
  stability: contentHash of a revision without formOf equals the value the Bước 2 function gives (a fixed expected hex string in
  the test)`; `backfill over the real CEFR-J levels creates
  forms for verbs, nouns and adjectives, a re-run creates nothing, a crash after one chunk resumes without duplicates`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run these and the Bước 2 pipeline suites → PASS.
- [ ] **Step 5: Commit** `feat(pipeline): carry inflections and form-of links through csv and backfill them`.

### Task 8: Word pages, headword search, lookup and the M1 gate

**Files:**
- Create: `src/content/words/words.service.ts`, `src/content/words/words.controller.ts`, `src/content/words/words.schemas.ts`,
  `test/content/words.e2e-spec.ts`
- Modify: `src/content/content.module.ts`, `src/content/index.ts`

**Interfaces:**
- Produces: `type WordSense = { sense_id; entry_id; scope: 'catalog' | 'private'; lemma; pos; level: Level | null;
  context_label: string | null; meaning: { text; language; translation_missing }; definition_en; examples: string[]; topics;
  form_of: { entry_id; lemma; pos; kind } | null }` (meaning rules of Bước 2 `view()`; private `context_label` hidden).
  `GET /v1/words?q&level&topic&pos&mine&page_size&page_token` → one row per lemma `{ lemma, pos_list, level, meaning_preview,
  has_private }` (rank exact → prefix → contains on lemma and variants as B2#58; bound page tokens; `mine=true` = only the
  caller's private entries). `GET /v1/words/:lemma` → `{ lemma, inflections: Array<{ kind; form; has_page: boolean }>,
  sections: Array<{ pos; senses: WordSense[] }> }` (catalog published + caller's private; 404 when empty). **Upper and lower
  case are separate words** (owner 17/10, D42): `GET /v1/words` returns one row per exact lemma (`March` and `march` are two
  rows), `GET /v1/words/:lemma` matches the lemma exactly; the search and `GET /v1/lookup` stay case-insensitive and return
  both.
  `GET /v1/lookup?q` → `{ senses: WordSense[]; via_inflection: Array<{ kind; base: { entry_id; lemma; pos }; senses: WordSense[]
  }> }`. `ContentService.cardContent(viewerId, senseIds, nativeLanguage): Promise<Map<string, WordSense>>` for Learning.

- [ ] **Step 1: Failing tests.** `B3#10: lookup "went" returns the went sense and via_inflection go/past`; `B3E13: lookup
  "leaves" → leaf (plural) and leave (third_person)`; `B3E14: lookup "deployed" with no deployed entry → deploy (past,
  past_participle)`; `B3E15: an unknown form → empty arrays`; `B3#11: GET /v1/words/left shows every pos of left and only the
  verb sense has form_of leave/past`; `D42: March (noun) and march (verb) are two rows in GET /v1/words?q=march, two pages
  (/v1/words/March, /v1/words/march), and lookup "march" returns both`; `the go page lists goes, going, went, gone with has_page
  true for went`; `B3#12 (words):
  learner B never sees A's private entries through /v1/words, /v1/words/:lemma, /v1/lookup or mine=true`; `the level filter uses
  the displayed level, derived included`; `B3E16: a private word's form_of link survives the base entry's sense being replaced
  (the link is to the entry id)`; `no native_language → 403 profile-incomplete`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces (one SQL statement per read, as `learner-content.service.ts`).
- [ ] **Step 4: Milestone gate M1.** Clean shell: `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test;
  pnpm test:e2e` — all green, counts reported. Then the implementer runs the built API + worker against Docker and walks with curl: import a CEFR-J sample → run the
  inflection backfill → export entries without senses → upload two filled rows → publish one without a topic → create a private
  word → lookup `went` and `leaves`. Output in the PR description.
- [ ] **Step 5: Commit** `feat(content): add word pages, headword search and lookup`.

---

# Milestone M2 — Learning and Settings (tracks B and C)

### Task 9: Settings module (design §9, D24)

**Files:**
- Create: `prisma/models/settings.prisma` + migration, `src/settings/settings.module.ts`, `src/settings/settings.definitions.ts`
  (+ spec), `src/settings/settings.service.ts`, `src/settings/admin-settings.controller.ts`, `src/settings/index.ts`,
  `test/settings/settings.e2e-spec.ts`
- Modify: `src/identity/identity.types.ts` (+ spec), `src/app.module.ts`

**Interfaces:**
- Produces: `Permission` gains `'settings.manage'` (`admin` only). Models `AppSetting` (`app_settings`: `key` PK, `value` jsonb,
  `version`, `updatedBy`, `updatedAt`) holding **one row `key = 'global'`** with every value (plan proposal: one version for the
  page the admin saves), and `AppSettingChange` (`app_setting_changes`: one row per changed key). `type AppSettings = {
  reminders: { enabled: boolean; sendTime: string /* HH:MM, 15-min steps */; weeklyMax: number; inactiveAfterDays: number;
  stopAfterDays: number }; learning: { newPerGroupPerDay: number; reviewsPerGroupPerDay: number; backlogAfterDays: number } }`
  with defaults `true, '20:00', 3, 7, 60, 20, 100, 60` and bounds `06:00–22:00, 0–7, 3–30, 30–180 (and > inactiveAfterDays),
  1–100, 10–500, 30–365`. `SettingsService.get(): Promise<AppSettings>` (defaults when no row); `update(actorId: string, version:
  number, patch: DeepPartial<AppSettings>): Promise<{ version: number; values: AppSettings }>`; `history(page)`. Routes
  (`settings.manage`): `GET /v1/admin/settings` → `{ version, values, bounds }`; `PUT /v1/admin/settings` `{ version, values }`;
  `GET /v1/admin/settings/history` → items `{ key, old_value, new_value, changed_by: { id, email }, changed_at }` (email through
  `IdentityService.getProfile`).

- [ ] **Step 1: Failing tests.** `B3#19: PUT changes a value, GET returns it, history has actor, time, old and new value for each
  changed key only`; `B3E30: send_time 23:00, weekly_max 8, stop_after ≤ inactive_after → 400 validation-failed naming the key,
  nothing stored`; `B3E31: two PUTs with the same version → the second 409 version-conflict and the stored value is the first`;
  `editor and learner get 403; GET /v1/me lists settings.manage for admin only`; the B2#66 route audit passes.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(settings): add admin-tunable settings with bounds and history`.

### Task 10: Learning schema, module and groups

**Files:**
- Create: `prisma/models/learning.prisma` + migration, `src/learning/learning.module.ts`, `src/learning/learning.constants.ts`,
  `src/learning/index.ts`, `src/learning/groups/groups.service.ts`, `src/learning/groups/groups.controller.ts`,
  `src/learning/groups/groups.schemas.ts`, `test/learning/schema.e2e-spec.ts`, `test/learning/groups.e2e-spec.ts`
- Modify: `src/content/index.ts` (export `LearnerContent`, `CurrentLearner`, `type Learner`), `src/app.module.ts`

**Interfaces:**
- Produces: models of design 5.1 — `LearningGroup` (`learning_groups`; unique `(user_id, name_key)`; **no default group**,
  owner 17/10, D43), `LearningItem` (`learning_items`; CHECK level 0–5; unique `(user_id, sense_id)`), `GroupItem` (`group_items`; PK
  `(group_id, item_id)`, FKs cascade), `LearningLogEntry` (`learning_log`; no FK to items; adds column `section` `priority | due
  | new | early` — plan proposal, needed to count caps without counting priority; partial unique `(user_id, review_id) WHERE
  review_id IS NOT NULL`; index `(user_id, group_id, local_date)`). Constants `LEVEL_INTERVALS = [1, 3, 7, 14, 30] as const`,
  `MAX_LEVEL = 5`, `GROUPS_MAX = 100`, `GROUP_ITEMS_MAX = 2000`, `GROUP_NAME_MAX = 60`. `GroupsService`: `create(userId, name)`,
  `rename(userId, id, name, version)`, `get(userId, id)` (with `removable_items` = items in no other group), `delete(userId,
  id)` (one transaction: remove group links, delete items left in no group, log `item_removed` with `group_id`; any group,
  the learner's last one included), `assertOwned(tx, userId, groupId)` (404 otherwise). Routes: `POST /v1/groups` `{ name }`, `PATCH /v1/groups/:id` `{ name, version }`, `GET
  /v1/groups/:id`, `DELETE /v1/groups/:id` (all with the learner guard). `GET /v1/groups` (list) arrives in Task 14. `LearningService` is the façade exported from
  `src/learning/index.ts` (later tasks add methods; Notifications uses only it). `LearningModule` imports `IdentityModule`
  (the learner guard needs `IdentityService` in the module that hosts the controller), `ContentModule` and, from Task 14,
  `SettingsModule`.

- [ ] **Step 1: Failing tests.** `schema: names unique per learner case-insensitively, one item per
  (learner, sense), deleting an item cascades its group links and keeps its log rows`; `B3E7: two renames with one version →
  the second 409 version-conflict, the stored name is the first`; `B3E18/B3#13: deleting group A removes from learning exactly the
  items in no other group, keeps items also in B, logs item_removed for each, and GET before delete reported that number`; `D43:
  the learner's only group can be renamed and deleted`; `the 101st group → 409 group-limit-reached`; `name 60 code points ok, 61 →
  400, blank → 400, "Food" next to "food" → 409 group-name-taken`; `B3#12 (groups): another learner's group id → 404 on every
  route`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): add learning schema and groups`.

### Task 11: Schedule rules and local dates (pure)

**Files:**
- Create: `src/common/time/local-date.ts` (+ spec), `src/learning/schedule/schedule.ts` (+ `schedule.spec.ts`)

**Interfaces:**
- Produces: `localDate(timeZone: string, at: Date): string` (`YYYY-MM-DD`); `localTime(timeZone: string, at: Date): string`
  (`HH:MM`); `addDays(date: string, days: number): string`; `daysBetween(from: string, to: string): number`.
  `type ItemState = { level: number; dueDate: string; priority: boolean }`; `type Section = 'priority' | 'due' | 'new' |
  'early'`; `sectionOf(state: ItemState, today: string): Section` (priority → `priority`; level 0 → `new`; due ≤ today → `due`;
  else `early`); `applyAnswer(state: ItemState, answer: 'known' | 'review', today: string): { next: ItemState; section: Section;
  wasDue: boolean; rating: 'Good' | 'Again'; changed: boolean }` implementing design 6.1 exactly; `newItem(today): ItemState`;
  `relearn(today): ItemState`; `isBacklog(state: ItemState, today: string, backlogDays: number): boolean` (level ≥ 1 and
  `daysBetween(dueDate, today) > backlogDays`).

- [ ] **Step 1: Failing tests.** `design 6.4 rows 1–10 as one table-driven test (each row's before → action → after exactly)`;
  `B3E2: known at 23:59 then again at 00:01 → the second is early and changes nothing`; `B3E3: level 5 known → stays 5, due +30`;
  `B3E1: a stored due date does not move when the zone changes, only "today" does`; `Review Focus 1: 2026-11-01T10:30Z is
  2026-11-02 in Pacific/Kiritimati and 2026-10-31 in Etc/GMT+12; America/New_York maps 05:30Z and 06:30Z on 2026-11-01 to
  01:30 and 01:30 (DST end) and both to 2026-11-01`; `D22/B3E35: level 0 is never backlog however old; level 4 overdue 61 days
  is, 60 days is not`.
- [ ] **Step 2:** `pnpm test src/learning src/common/time` → FAIL.
- [ ] **Step 3: Implement** with `Intl.DateTimeFormat(…, { timeZone })`; no date library.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): add the fixed-ladder schedule rules`.

### Task 12: Items — add, bulk add, remove, state lookup

**Files:**
- Create: `src/learning/items/items.service.ts`, `src/learning/items/items.controller.ts`, `src/learning/items/items.schemas.ts`,
  `test/learning/items.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 11 `newItem`, Task 10 `GroupsService.assertOwned`, `IdentityService.getProfile` (timezone), Task 5
  `ContentService.visibleSenseIds` and `ContentService.bulkCandidates` (this task edits no Content file).
- Produces: Routes: `POST
  /v1/groups/:id/items` `{ sense_id }` → 201 `{ item_id, level, due_date, created }`; `POST /v1/groups/:id/items/bulk` `{ level?,
  topic?, pos? }` → `{ added, already_in_group, skipped_function_words, skipped_group_full }` (adds up to the 2,000 cap); `DELETE
  /v1/groups/:id/items/:itemId` → `{ removed_from_learning }`; `DELETE /v1/items/:id` (remove from learning); `GET
  /v1/items?sense_ids=` (≤ 100) → `{ items: [{ sense_id, item_id, level, due_date, priority, group_ids }] }`; `GET
  /v1/groups/:id/items?cell=0..5|priority&page_size&page_token` → items with level, due date, priority, `group_count`,
  `sense_changed`.

- [ ] **Step 1: Failing tests.** `B3#1: the first add creates level 0 due today in the learner's zone in the chosen group; another
  learner's group id → 404 and nothing stored`; `adding a learnt sense to a second group links the same item`; `B3E19: removing from the
  last group deletes the item and logs item_removed, removing from one of two keeps it`; `DELETE /v1/items/:id removes the item
  from every group, logs item_removed and keeps earlier log rows`; `B3E20: re-adding a removed sense
  starts a new item at level 0`; `B3E22: bulk add of A2 + food skips function words and existing items and returns the counts`;
  `B3E33 (bulk): senses without a topic are not added by a topic filter`; `group-full: with 2,000 seeded items a single add is
  409 group-full and bulk reports skipped_group_full`; `B3#12 (items): another learner's private sense_id → 404; items?sense_ids
  never reveals other learners`; `cell=3 lists only level-3 items of the group`; `two adds of the same sense sent at the same moment
  (to one group or two) leave one item and both requests succeed`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces; every write in one transaction with the item row locked; a new item is created
  with `INSERT … ON CONFLICT (user_id, sense_id) DO NOTHING` and read back, so two adds of one sense at the same moment give one
  item, never a 500.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): add, bulk add and remove items`.

### Task 13: Reviews and the learning log

**Files:**
- Create: `src/learning/reviews/reviews.service.ts`, `src/learning/reviews/reviews.controller.ts`,
  `test/learning/reviews.e2e-spec.ts`, `test/support/learning-metrics.ts`, `test/learning/metrics.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 11 `applyAnswer`, `sectionOf`.
- Produces: `POST /v1/reviews` `{ item_id, group_id, answer: 'known' | 'review', review_id: uuid }` → `{ item_id, level,
  due_date, priority, section }`; one transaction: `SELECT … FOR UPDATE` on the item; a logged `review_id` returns its stored
  result; item or group link missing → 404. The log row carries every column of design 5.1 plus `section`.
  `learningMetrics(prisma, userId, from, to)` (test support only): words added per ISO week, share of due items answered within
  48 h of their due date, active days (LR14, B3#20).

- [ ] **Step 1: Failing tests.** `B3#2, B3#3, B3#4 over HTTP with read-back of item and log`; `B3E4: one review_id sent twice →
  identical responses and one log row`; `B3E5: two concurrent answers on one item serialize — known+known: the second is early
  and changes nothing; known+review: review applies`; `B3E6: answering an item removed meanwhile → 404`; `B3#5: 90 FakeClock days
  without answers change neither level nor due date`; `B3#20: from a seeded month of answers learningMetrics returns the
  expected weekly adds, 48-hour share and active days`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): record reviews and the learning log`.

### Task 14: Group counts and the review queue

**Files:**
- Create: `src/learning/queue/queue.queries.ts`, `src/learning/queue/queue.service.ts`, `src/learning/queue/queue.controller.ts`,
  `test/learning/queue.e2e-spec.ts`, `test/learning/scale.e2e-spec.ts`
- Modify: `src/learning/groups/groups.controller.ts`, `src/learning/index.ts`

**Interfaces:**
- Consumes: `SettingsService.get()` (caps, backlog days), `ContentService.cardContent`, `ContentService.listSentences`, and
  `visibleSenseCondition(senseIdColumn: Prisma.Sql, viewerId: string): Prisma.Sql` — a Content-owned SQL fragment ("catalog
  open and published, or the viewer's own private sense") that Learning embeds in the single counting statement, because
  `visibleSenseIds` cannot take 200,000 ids (Postgres parameter limit 65,535). Added in this task by track C as a coordinator-
  approved exception (17/10) in `src/content/learner/visible-senses.ts`; `ContentService.visibleSenseIds` is rewritten on the
  same fragment so one definition of "visible" exists; Content tests prove both give the same set. A private sense is visible
  only to its owner **and** while open with a live revision (private words are never retired; deleting removes them).
  `words.service.ts`'s own `visible()` moves onto the same fragment in PR A3.
- Produces: `GET /v1/groups` → `{ items: [{ id, name, version, total, today: { priority, due, new }, cells: Array<{
  level: 0..5; total; due }>, backlog }] }` ordered by `today.priority > 0` first, then `priority + due + new` descending, then
  name; `due = min(due available, reviewCap − due reviews logged today in this group)`, `new = min(level-0 items, newCap − new
  reviews logged today in this group)` (`section` column of the log); computed by **one** SQL statement for all groups.
  `GET /v1/groups/:id/queue?mode=due|all` → `{ cards: Array<{ item_id; sense_id; level; due_date; priority; section; content:
  WordSense & { sentences: string[] } }> }` — `due`: priority (all) → due (most overdue first, then lower level) → new (earliest
  added first), caps as above, backlog items left out; `all`: every item of the group once in random order, no caps, backlog
  items included (design 6.2: "mọi từ trong nhóm"). Both leave out senses retired or replaced (`sense_changed`). `LearningService.cardsLeftToday(entries: Array<{ userId: string; today:
  string }>): Promise<Set<string>>` (users with at least one card left after caps — for Task 21).

- [ ] **Step 1: Failing tests.** `B3#6: 3 priority, 150 due, 30 new and caps 100/20 → 3 priority, 100 due in order, 20 new in
  order; after 40 due reviews today the next read gives 60 due`; `B3#4 (queue): an item answered "review" is first in its group's
  next queue`; `priority answers never use the cap`; `B3E9: lowering the review
  cap mid-day applies on the next read and today's reviews still count`; `B3E10: a word in A and B answered in A counts for A only
  and is no longer due in B`; `B3E8: 59 days overdue is due; level ≥ 1 at 61 days leaves the queue and counts as backlog`;
  `B3E35: 2,000 new words → 20 new per day, never backlog`; `B3E21: a retired sense stays in the group list with sense_changed and
  is absent from queue and counts`; `mode=all returns every other item exactly once and ignores caps`; `caps reset at the
  learner's local midnight (FakeClock across Asia/Ho_Chi_Minh midnight)`. `scale.e2e-spec.ts` (isolated DB, 5-minute timeout):
  `Review Focus 5: 100 groups × 2,000 items seeded with generate_series → GET /v1/groups prints its duration and is < 500 ms`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces; measure the scale case before adding any index.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): add group counts and the review queue`.

### Task 15: Backlog list and relearn (D22)

**Files:**
- Create: `src/learning/backlog/backlog.service.ts`, `src/learning/backlog/backlog.controller.ts`,
  `test/learning/backlog.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /v1/groups/:id/backlog?page_size&page_token` → items `{ item_id, sense_id, level, due_date, days_overdue,
  content }`; `POST /v1/items/relearn` `{ item_ids }` (1–100) → `{ relearned }` (level 0, due today, no priority, log `relearn`;
  ids of other learners are ignored and not counted). "Bỏ khỏi việc học" is `DELETE /v1/items/:id` (Task 12); "Để đó" sends
  nothing.

- [ ] **Step 1: Failing tests.** `B3#7: a level-2 item 61 days overdue is listed in backlog and absent from the queue; relearn
  makes it level 0, counted as new, with a relearn log row`; `B3E35 (backlog): level-0 items are never listed`; `relearn ignores
  another learner's ids`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(learning): add the backlog list and relearn`.

### Task 16: Quick add, deleting a private word and the M2 gate

**Files:**
- Create: `src/learning/quick-add/quick-add.service.ts`, `src/learning/quick-add/quick-add.controller.ts`,
  `src/learning/my-words/my-words-delete.controller.ts`, `test/learning/quick-add.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 5 `createPrivateSense`, `deletePrivateEntryContent`; Task 6 `addSentence`; Task 12 item creation.
- Produces: `POST /v1/quick-add` `{ group_id, sense_id?, new_word?: { lemma, pos?, meaning, level?, topics?, form_of?: {
  entry_id, kind } }, sentence? }` (exactly one of `sense_id`/`new_word`; `group_id` **required**, no default group — D43;
  missing → 400) → 201 `{ item_id,
  sense_id, created_item, created_word, sentence_id }`; one `$transaction` — private word, sentence, item, group link — so any
  refusal (`private-word-limit-reached`, `sentence-limit-reached`, `group-full`, 404) stores nothing. `DELETE /v1/my-words/:id`
  is served by **Learning** (design §4, §10: Learning orchestrates and Content must not call Learning): one transaction calls `deletePrivateEntryContent`, then deletes the items of the returned senses and
  their log rows (CR23).

- [ ] **Step 1: Failing tests.** `B3#8: quick add of a catalog sense creates no private word and saves item and sentence`; `B3#9 /
  B3E11: quick add with new_word creates word, sentence, item and link together; a sixth sentence on an existing word makes the
  whole request fail with nothing stored; the same Idempotency-Key replays without a duplicate`; `already learning → no new item,
  the sentence is saved`; `B3E14: new_word with form_of deploy/past stores the link`; `B3E17: DELETE /v1/my-words/:id removes
  entry, senses, sentences, items, links and their log rows in one transaction; another learner → 404`; `B3#12 (quick add): a
  sense_id of another learner's private sense → 404, nothing stored`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4: Milestone gate M2.** Clean shell, API gate as Task 8. The implementer then walks with curl against the built API:
  register → verify (Mailpit OTP) → set `native_language` → create a group → quick add a catalog word with a sentence → queue →
  answer known and review → move a due date back 61 days with SQL → backlog → relearn → admin changes the review cap → queue
  reflects it. Output in the PR description.
- [ ] **Step 5: Commit** `feat(learning): add quick add and private word deletion`.

---

# Milestone M3 — Reminders (tracks B and D)

### Task 17: Move mail sending and the budget to `src/common/mail`

**Files:**
- Move: `src/identity/mailer/{mailer.ts, smtp-mailer.ts (+ spec), fake-mailer.ts, mail-budget.service.ts (+ spec),
  mail-dispatcher.service.ts (+ spec)}` → `src/common/mail/`; `templates.ts` (+ spec) stays in Identity.
- Create: `src/common/mail/mail.module.ts`
- Modify: `prisma/models/identity.prisma` → `prisma/models/common.prisma` (model `MailBudgetBucket` moves, table unchanged),
  `src/identity/identity.module.ts`, every importer (`grep -rn "mailer/" src test`), `test/support/create-test-app.ts`

**Interfaces:**
- Produces: `REMINDER_MAIL_SHARE = 0.8` and `mailLimit(budget: number, share: number): number` (`Math.floor(share × budget)`),
  exported from `src/common/mail/mail-budget.service.ts` — the **only** place the 80% line is computed (Task 21's tick uses the
  same function, so tick and provider stop at the same count; the existing `mail_budget_80` warning log keeps its own
  rounding, it decides nothing). `MailBudget.tryConsume(opts?: { ceiling?: number }): Promise<boolean>` — with `ceiling` (0–1)
  one statement increments only while `sent < mailLimit(MAIL_DAILY_BUDGET, ceiling)` and returns false otherwise; without it,
  behaviour is exactly today's. `MailBudget.sentToday(): Promise<number>`. `MailModule` provides `Mailer` (`SmtpMailer`), `MailBudget`,
  `MailDispatcher`, exported to Identity and Notifications.

- [ ] **Step 1: Failing tests.** `B3#18 (budget): with budget 10, tryConsume({ ceiling: 0.8 }) succeeds 8 times then fails while
  plain tryConsume still reaches 10`; `mailLimit(7, 0.8) is 5 and with budget 7 the ceiling consumer stops after 5`; `two concurrent ceiling consumers never pass the ceiling`; `migrate diff after the model
  move is empty`. Existing identity mail suites keep passing with only import paths changed.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** the move and the ceiling statement (`INSERT … ON CONFLICT DO UPDATE SET sent = sent + 1 WHERE
  mail_budget_buckets.sent < $limit RETURNING sent`).
- [ ] **Step 4:** `pnpm test; pnpm test:e2e` → green.
- [ ] **Step 5: Commit** `refactor(api): move mail sending and the mail budget to common`.

### Task 18: Identity reads for reminders

**Files:**
- Modify: `src/identity/profile/identity.service.ts` (+ spec)
- Test: `test/identity/reminder-reads.e2e-spec.ts`

**Interfaces:**
- Produces: `IdentityService.listReminderCandidates(input: { afterUserId: string | null; limit: number }): Promise<Array<{
  userId: string; timezone: string; nativeLanguage: 'vi' | 'en' | null; createdAt: Date; lastSeenAt: Date | null }>>` (verified
  and active users, ordered by id; `lastSeenAt = max(session_chains.last_used_at)`); `IdentityService.verifiedEmails(userIds:
  string[]): Promise<Map<string, string>>`.

- [ ] **Step 1: Failing tests.** `D36: unverified users are never listed`; `lastSeenAt is the latest last_used_at over the
  user's chains and moves after POST /v1/auth/refresh`; `verifiedEmails omits unverified and unknown ids`; `paging by afterUserId
  visits every user once`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(identity): expose reminder candidates and verified emails`.

### Task 19: Notifications schema and reminder preferences

**Files:**
- Create: `prisma/models/notifications.prisma` + migration, `src/notifications/notifications.module.ts`,
  `src/notifications/prefs/reminder-prefs.service.ts`, `src/notifications/prefs/reminders.controller.ts`,
  `test/notifications/prefs.e2e-spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: models of design 5.3; `reminder_deliveries.state` is `sending | sent | failed` (plan proposal: `failed` marks a day
  whose send exhausted its attempts, so the 15-minute tick does not retry all day; design 8.3 is silent). `GET /v1/me/reminders`
  → `{ enabled, email_verified }`; `PATCH /v1/me/reminders` `{ enabled }` (authentication only, `user.write` limit).

- [ ] **Step 1: Failing tests.** `D25: enabled by default; PATCH false persists and another learner is unaffected`; `B3E28:
  email_verified is false for an unverified learner`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(notifications): add reminder preferences`.

### Task 20: Notification provider, channel chooser and the reminder email

**Files:**
- Create: `src/notifications/provider/notification-provider.ts`, `src/notifications/provider/email.provider.ts`,
  `src/notifications/provider/channel-chooser.ts`, `src/notifications/provider/reminder-message.ts` (+ spec),
  `test/notifications/provider.e2e-spec.ts`
- Modify: `src/common/config/app-config.ts` (+ spec), `test/support/test-config.ts`, `.env.example`

**Interfaces:**
- Produces: `type ReminderKind = 'regular' | 'inactive'`; `abstract class NotificationProvider { abstract readonly channel:
  'email' | 'push'; abstract send(userId: string, message: { kind: ReminderKind; language: 'vi' | 'en' }): Promise<'sent' |
  'no-address' | 'budget-exhausted'> }` (throws on a transient transport error); `EmailProvider` (address from
  `verifiedEmails`, budget `tryConsume({ ceiling: 0.8 })`, then `Mailer.send`); `ChannelChooser.choose(userId: string):
  Promise<NotificationProvider[]>` (Bước 3: `[EmailProvider]` when the system and the learner have reminders on, else `[]`).
  `reminderMail(to: string, kind: ReminderKind, language: 'vi' | 'en', settingsUrl: string): MailMessage` — plain text; subjects
  vi `Tới giờ học từ vựng` / `Đã lâu rồi bạn chưa vào học`, en `Time to study your words` / `It's been a while since you
  studied`; body names no word and ends with the settings link line (vi `Tắt nhắc học trong Cài đặt: <url>`, en `Turn reminders
  off in Settings: <url>`). Language = `native_language`, `vi` when null. `AppConfig.learnerAppUrl` (env `LEARNER_APP_URL`,
  required URL, origin only; `.env.example` `http://localhost:3001`); the link is `<learnerAppUrl>/<language>/app/settings`
  (G1, D39), built by `reminderSettingsUrl(learnerAppUrl, language)`; the UI plan must serve that path.

- [ ] **Step 1: Failing tests.** `8.4: the vi regular reminder has subject "Tới giờ học từ vựng", contains no lemma of the
  learner's items and ends with <learnerAppUrl>/vi/app/settings`; `the en and inactive variants (an en learner's link is
  /en/app/settings, a learner without native_language gets /vi/app/settings)`; `EmailProvider returns no-address for an
  unverified learner and sends nothing`; `at 80% of the budget it returns budget-exhausted and sends nothing`; `the chooser returns
  [] when the learner or the system has reminders off`; `config: a missing LEARNER_APP_URL fails fast naming it`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(notifications): add the notification provider port and email reminders`.

### Task 21: Reminder scheduler and send jobs

**Files:**
- Create: `src/notifications/scheduler/eligibility.ts` (+ spec), `src/notifications/scheduler/reminder-queue.service.ts`,
  `src/notifications/scheduler/reminder-tick.service.ts`, `src/notifications/scheduler/reminder-send.service.ts`,
  `test/notifications/reminders.e2e-spec.ts`
- Modify: `src/common/config/app-config.ts` (+ spec), `test/support/test-config.ts` (`reminders.tickSeconds` low for tests),
  `test/support/create-test-app.ts` (close hook for the reminder queue), `src/common/mail/fake-mailer.ts`
  (`failNext(err?: Error, times = 1)`: the next `times` sends throw), `src/settings/settings.definitions.ts` (+ spec) and
  `test/settings/settings.e2e-spec.ts` (D44: `reminders.weeklyMax` → `reminders.minGapDays`, bounds 1–7, default 2; JSON key
  `min_gap_days`; a stored value under the old key is ignored and the default applies)

**Interfaces:**
- Consumes: Tasks 9, 11, 14 (`cardsLeftToday`), 17 (`mailLimit`, `REMINDER_MAIL_SHARE`, `sentToday`), 18, 19, 20.
- Produces: `AppConfig.reminders: { tickSeconds: number }` (env `REMINDER_TICK_SECONDS`, default 900; tests and the real-stack
  suite lower it). `ReminderQueueService` owns BullMQ queue `reminders` (own `Queue`/`Worker` on `redisUrl`, prefix
  `pipeline.queuePrefix`, Worker connection `maxRetriesPerRequest: null`); **only when `pipeline.runWorkers`** it calls
  `upsertJobScheduler('reminder-tick', { every: tickSeconds * 1000 }, { name: 'tick' })` and starts the Worker.
  `eligibility(input: { now: Date; timezone: string; createdAt: Date; lastSeenAt: Date | null; settings: AppSettings['reminders'];
  sentDates: string[] /* local dates of sent rows, last 7 days */ }): { kind: ReminderKind; today: string } | { skip: 'before-time'
  | 'stopped' | 'gap' | 'inactive-cap' }` — absence `d = daysBetween(localDate(timezone, lastSeenAt ?? createdAt),
  localDate(timezone, now))` (difference of **local dates**, like `due_date` in Task 11, never hours ÷ 24): `d < inactiveAfterDays` →
  `regular`, `inactiveAfterDays ≤ d ≤ stopAfterDays` → `inactive` (only when no email of any kind was sent in the last 7 local
  days, else `inactive-cap`), `d > stopAfterDays` → `stopped`;
  `regular` also needs `daysBetween(latest of sentDates, today) ≥ settings.minGapDays` (no sent date → allowed), else `gap`
  (D44). Tick: skip entirely when `MailBudget.sentToday() ≥ mailLimit(MAIL_DAILY_BUDGET,
  REMINDER_MAIL_SHARE)` (the same line the provider's `tryConsume({ ceiling })` stops at); page candidates 500 at a time;
  drop learners with prefs off or a delivery row for their local date; `eligibility`; `cardsLeftToday`; add `send` jobs with
  `jobId reminder-<userId>-<localDate>`, `attempts 3`, exponential backoff, `removeOnComplete`, `removeOnFail`. Send (design 8.3):
  delivery `sent`/`sending`/`failed` → done; none → re-check chooser and cards → insert `sending` (unique conflict → done) →
  provider: `sent` → `sent` + `sent_at`; `no-address`/`budget-exhausted` → delete the row; a transient error → delete the row and
  rethrow; on the last attempt → `failed`.

- [ ] **Step 1: Failing tests.** `eligibility.spec.ts`: `tiers: 6 days regular, 7 and 60 inactive, 61 stopped`; `before
  send_time skip`; `Review Focus 1: local date and time in Pacific/Kiritimati, Etc/GMT+12 and America/New_York on 2026-11-01`;
  `D44: with minGapDays 2 an absent learner is eligible on every second local date (T5, T7, T2, …); with 1 on every date;
  with 7 once a week`; `absence counts local dates: last seen 23:50 local and now 00:10 the next local day is d = 1; across the
  America/New_York DST day, 7 local dates later is d = 7`. `reminders.e2e-spec.ts` (workers on, FakeClock, FakeMailer, low tickSeconds): `B3#16: an eligible learner
  gets exactly one email in that local day across many ticks`; `B3#17 / B3E24: off (learner or system) or unverified → no email;
  turning off while the job waits → no email`; `B3#18 / B3E23: at 80% of the budget nothing is enqueued or sent and an OTP still
  goes out`; `with budget 7 the tick stops enqueueing at exactly the count where the provider starts refusing (5), so no job
  is enqueued only to be refused`; `B3E25: a job that finds sending sends nothing`; `B3E26: a re-run after sent sends nothing`; `B3E27: two ticks for one
  learner and day leave one job`; `D27: a learner with no card left today gets no email`; `a transient SMTP error is retried
  into one email; three errors (FakeMailer.failNext(err, 3)) leave failed and no further try that day; each attempt used one
  budget slot`; `inactive: 10 days absent → the inactive email at most
  once in 7 days; 61 days → none`; `B3E29: a zone change during the day sends at most one email per local date`; `the API process
  (runWorkers false) creates no scheduler and no worker`; `Review Focus 4: two test apps with runWorkers on, sharing one database
  and one queue prefix; because both upsert the same `reminder-tick` scheduler only one tick would fire, so the test calls
  both apps' `ReminderTickService.tick()` at once (`Promise.all`) with both Workers running, and the emails summed over **both**
  apps' FakeMailers are exactly one for that learner and local day`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces; logs `reminder_sent`, `reminder_skipped` with `user_id`, `local_date`, `kind`,
  reason — no email address.
- [ ] **Step 4:** `pnpm build`; run → PASS; `worker-process.e2e-spec.ts` still passes.
- [ ] **Step 5: Commit** `feat(notifications): schedule reminder emails per local day`.

### Task 22: System gate and docs (the owner declares Bước 3 done, D45)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md` (§17 as-built for the system part, any `ASSUMPTION`
  that became fact, Task 4 accuracy and Review Focus 5 numbers), `docs/superpowers/decisions/2026-10-16-buoc-3-learning-decisions.md`
  (only if a gate changed a decision), `docs/deliveries/buoc-3.md` (`— as-built (hệ thống)` section), `apps/api/.env.example`

- [ ] **Step 1: Clean shell gate.** `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test; pnpm test:e2e`
  (API), plus the admin suites `pnpm test; pnpm build:e2e; pnpm test:e2e; pnpm test:e2e:real` in `apps/admin` to show the API
  changes broke nothing there. All green; counts compared with the end of Bước 2.5 (API 578 unit + 475 e2e; admin 219 unit + 67
  mocked e2e + 7 real-stack e2e — `docs/deliveries/buoc-2-5.md`, 15/10/2026).
- [ ] **Step 2: Manual run** of the system part, handed to the owner who declares Bước 3 done (D45), on a fresh database with the real CEFR-J file: import
  → inflection backfill → export entries without senses → upload filled rows → publish without topics → as a learner: quick add,
  queue, review, backlog, private word create/delete → API + worker with `REMINDER_TICK_SECONDS=60`, `send_time` set through
  `PUT /v1/admin/settings` to the next quarter hour → exactly one reminder in Mailpit for a verified learner with a card left,
  none for an unverified one. Output kept for the PR.
- [ ] **Step 3:** Write the as-built notes and numbers into the files above. `CLAUDE.md` and
  `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 go in the separate small docs PR of design §18.
- [ ] **Step 4: Report** to the owner: what passed, the numbers, open risks (design §19), the PR list, and the API contract the
  UI plan builds on (routes of design §10 as built).
- [ ] **Step 5: Commit** `docs: record the bước 3 system as-built`.
