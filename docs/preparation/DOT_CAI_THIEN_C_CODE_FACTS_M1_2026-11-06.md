# Đợt cải thiện C, M1 (Học / Ôn, streak) — code facts (06/11/2026)

Read-only survey of the worktree `.claude/worktrees/dot-cai-thien-c` (branch `docs/dot-cai-thien-c`, HEAD `0bd3eac6`). Every
path is relative to the repo root; line numbers were read in this session. "INFERENCE" marks a conclusion not shown directly
by one line of code. Note: this HEAD does **not** contain commits `0c73b987`, `d6cd8cc8`, `5682910c` (empty-deck "add word"
fix on `fix/web-empty-group-add-word`); checked with `git merge-base --is-ancestor`.

Path correction to the brief: `TodayPage.tsx`, `GroupCard.tsx`, `GroupPage.tsx` and `Flashcard.tsx` are **not** in
`apps/web/src/app-ui/`; they live in `apps/web/src/features/learner/{today,groups,review}/`. `app-ui/` holds only shared
widgets (`Toast.tsx`, `Button.tsx`, …).

---

## A. Schedule and flashcards

### 1. `applyAnswer`, its callers, the flashcard endpoint, priority

**Constants** — `apps/api/src/learning/learning.constants.ts:2-3`: `LEVEL_INTERVALS = [1, 3, 7, 14, 30]`, `MAX_LEVEL = 5`.

**Pure rules** — `apps/api/src/learning/schedule/schedule.ts`:
- `ItemState = { level, dueDate, priority }` (:7); `Section = 'priority' | 'due' | 'new' | 'backlog' | 'early'` (:9);
  `Answer = 'known' | 'review'` (:10).
- `newItem(today)` → `{ level: 0, dueDate: today, priority: false }` (:13-15). `relearn` = `newItem` (:18-20).
- `sectionOf` (:22-28): backlog wins, then `priority`, then `level === 0` → `new`, else `dueDate <= today` ? `due` : `early`.
- `isDueNow` (:31-33): `priority || level === 0 || dueDate <= today`.
- `applyAnswer(state, answer, today, backlogDays)` (:35-50):
  ```ts
  if (answer === 'review') next = { level: 1, dueDate: today, priority: true };
  else if (wasDue) { const level = Math.min(state.level + 1, MAX_LEVEL);
                     next = { level, dueDate: addDays(today, LEVEL_INTERVALS[level - 1]), priority: false }; }
  else next = state; // Known before it is due: nothing changes.
  ```
  Returns `{ next, section, wasDue, rating: 'Good'|'Again', changed }`.
- `isBacklog` (:53-55): level ≥ 1 and overdue by more than `backlogDays` (default 60, `apps/api/src/settings/settings.definitions.ts:71`).

Behaviour per level:
| state | "known" (Đã biết) | "review" (Cần ôn lại) |
|---|---|---|
| level 0 (always due) | → level 1, due today+1 | → level 1, due **today**, priority **true** |
| level n≥1, due (or priority) | → level min(n+1,5), due today+interval[level-1], priority false | same as left column "review" |
| level n≥1, not due ("early") | no change | → level 1, due today, priority true |
| level 5, due | stays 5, due today+30 | → level 1, due today, priority true |

**Priority ("ưu tiên")**: set only by "review" (`schedule.ts:40`), cleared by a "known" that was due (:43). A priority item is
always due (`isDueNow`), sorts first in the queue (`queue.queries.ts:77-80`) and is not capped (`queue.service.ts` today():
`priority: row.priority`, lines 28-35 of that file). A priority item overdue past the backlog days counts as backlog (D48,
`schedule.ts:23-24`).

**Callers of `applyAnswer`** (grep `applyAnswer` over `apps/api/src`, specs excluded):
1. `apps/api/src/learning/reviews/reviews.service.ts:55` — flashcards.
2. `apps/api/src/learning/practice/practice-review.service.ts:65` — "Cần ôn lại"/"Đã biết" pressed in a **practice** session.

**Flashcard endpoint** — `POST /v1/reviews`, `apps/api/src/learning/reviews/reviews.controller.ts`:
- body (:7-12): `{ item_id: uuid, group_id: uuid, answer: 'known'|'review', review_id: uuid }` (strict). `@RateLimit('learning.review')` (:23),
  idempotent by `review_id`, no `Idempotency-Key`.
- `ReviewsService.answer` (`reviews.service.ts:33-85`): locks the item row (`FOR UPDATE`, :40-41), requires the item to be in
  `group_id` (:46-49), `today = localDate(profile.timezone, now)` (:53), `applyAnswer` (:55), updates `learning_items` incl.
  `lastReviewedAt` (:56-62), writes `learning_log` row `kind: 'review'` with `groupId`, `section`, `wasDue`, `reviewId` (:63-69),
  then `recordActivityIn` (:71). Response `{ item_id, level, due_date, priority, section }` (:72-75). A replayed `review_id` returns the stored
  result (:87-101); same id with another payload → 400.

### 2. Today page and group page: counts and cards

**`GET /v1/groups`** — `apps/api/src/learning/groups/groups.controller.ts:19-22` → `QueueService.list`
(`apps/api/src/learning/queue/queue.service.ts:49-61`). Item shape `GroupSummary` (:16-21):
`{ id, name, version, total, today: { priority, due, new }, cells: [{ level, total, due }] (levels 0–5), backlog, available: { due, new } }`.
- Counts come from ONE SQL `groupStatsQuery` (`apps/api/src/learning/queue/queue.queries.ts:20-64`): `priority` (not backlog),
  `due_available` = not priority, level ≥ 1, due ≤ today, not backlog (:40), `new_available` = not priority, level 0 (:41),
  `backlog` (:42), `cell_total` / `cell_due` per level (:22-24), and today's `due_done` / `new_done` from `learning_log`
  rows with `kind='review' AND group_id IS NOT NULL` by `section` (:46-53).
- Caps applied in `today()` (`queue.service.ts:28-35`): `due = min(due_available, reviewsPerGroupPerDay − due_done)` (null cap =
  no limit), `new = min(new_available, newPerGroupPerDay − new_done)`. Defaults: `newPerGroupPerDay: 20`,
  `reviewsPerGroupPerDay: 100` (`settings.definitions.ts:71`).
- Sort (`queue.service.ts:57-59`): groups with priority first, then most waiting, then name. The web re-sorts with `sortForToday`
  (`apps/web/src/features/learner/groups/GroupCard.tsx:14-22`).

**`GET /v1/groups/:id/queue?mode=due|all`** — `apps/api/src/learning/queue/queue.controller.ts:7,14-21` → `QueueService.queue`
(`queue.service.ts:74-110`):
- `mode=all` (:81-82): every visible item of the group, `ORDER BY random()` (`queue.queries.ts:87-88`), **no cap**.
- `mode=due` (:84-93): priority part (all, `ORDER BY added_at, id`, `queue.queries.ts:77-80`) + due part limited by
  reviews cap left (`ORDER BY due_date, level, added_at, id`, :81-84) + new part limited by new cap left (`ORDER BY added_at, id`, :85-86).
- Card shape `Card` (`queue.service.ts:22-25`): `{ item_id, sense_id, level, due_date, priority, section, content: WordSense & { sentences } }`.
- There is **no cross-group flashcard queue endpoint** (only `groups/:id/queue`; grep of `@Get` in `apps/api/src/learning/**/*.controller.ts`).

**Web**:
- `apps/web/src/features/learner/today/TodayPage.tsx`: `useGroups()` (:28); hero = first sorted group with `waiting > 0` (:30-31);
  hero shows priority/due/new chips (:120-136) and links `review?group=<id>` and `&mode=all` (:137-144). Up to 6 decks (:20, :89).
  Side column sums `cells` per stage (:156-160). Today has no session of its own: every button opens one group's review.
- `GroupCard.tsx:46-88`: one link, `review` when `waiting>0`, else `&mode=all` "studyAgain" (:78-84); menu item "studyAll" (:108-110).
- `apps/web/src/features/learner/groups/GroupPage.tsx`: summary from `useGroups()` list (:85), not a separate endpoint; meta line
  `t('meta', { count: detail.item_count, date })` (:107; vi copy `"{count, number} từ · tạo ngày {date}"`, `apps/web/messages/vi.json:716`);
  chips priority/due/new (:109-115); main button `review` or `studyAll` (:116-125); stage chart from `summary.cells` (:218-258);
  word list `useDeckWords` with filters all/priority/due/new/stage-1..5 (:94-100).
- Session: `apps/web/src/features/learner/review/use-review-queue.ts`: reads `GET /v1/groups/${groupId}/queue?mode=${mode}` once
  (:23-35), each press `POST /v1/reviews` with a new `review_id` (kept on network retry) (:49-73), invalidates `groups` queries (:63-64).
  Buttons in `ReviewSession.tsx:100-107` (keys 1 = review, 2 = known, :50-51). `Flashcard.tsx` only renders the card (and reads
  `/v1/words/:lemma`, :18).

### 3. Level 0 / "new"

- Defined by `newItem` (`schedule.ts:13-15`); `sectionOf` returns `'new'` for `level === 0` (:26); SQL uses `i.level = 0`
  (`queue.queries.ts:41,86`).
- An item is created at level 0 when a word is added to a group: `ItemsService.ensureItems` uses `newItem(today)`
  (`apps/api/src/learning/items/items.service.ts:231`). "Học lại" from the backlog also resets to level 0 (`backlog.service.ts`, relearn).
- Today a word reaches level 1 only via `applyAnswer`: "known" on level 0 → level 1, due today+1; "review" on any level → level 1 due
  **today** with priority. Both via flashcards (`POST /v1/reviews`) or practice (`POST /v1/practice/items/:id/review`; "known"
  only when `show_known`).

### 4. `learning_activity_days`

- Model `apps/api/prisma/models/learning.prisma:82-88`: columns `user_id uuid`, `local_date date`; PK `(user_id, local_date)`.
  Migration `apps/api/prisma/migrations/20261030150000_nhom_b_m6_learning_activity_days/migration.sql`.
- Writer: `recordActivityIn` (`apps/api/src/learning/activity/record-activity.ts:9-10`), `createMany(..., skipDuplicates: true)`;
  exposed to other modules as `LearningService.recordActivity` (`apps/api/src/learning/learning.service.ts:62-64`).
- Called from (grep `recordActivityIn|recordActivity`):
  - flashcard review — `reviews.service.ts:71`;
  - practice "Cần ôn lại"/"Đã biết" — `practice-review.service.ts:90` (only when a log row was written);
  - **every final practice answer, skip included** — `apps/api/src/practice/answers/answers.service.ts:145` (in `writeFinal`);
  - **adding a new word to a group** — `items.service.ts:247`;
  - **removing a word** — `items.service.ts:262`;
  - **deleting a group that removed words** — `apps/api/src/learning/groups/groups.service.ts:122`;
  - **"Học lại" from backlog** — `apps/api/src/learning/backlog/backlog.service.ts:94`.
- Timezone: every caller passes `localDate(profile.timezone, now)` (`apps/api/src/common/time/local-date.ts:32-35`, IANA zone from
  the Identity profile), e.g. `reviews.service.ts:53`, `answers.service.ts:136`.
- Readers: only `RetentionService` (D7/D30 report, `apps/api/src/learning/retention/retention.service.ts:52-56,70-73`) and
  account erase (`apps/api/src/learning/account-eraser.provider.ts:21`).
- **No streak computation exists**: grep `streak|chuỗi|consecutive` (case-insensitive) over `apps/api/src`, `apps/web/src`,
  `apps/admin/src` matched only `apps/api/src/content/inflections/agid-inflections.json` (word data). Control: the same grep
  found that file, so the search ran.

## B. Practice module

### 5. Question types

- `apps/api/src/practice/practice.types.ts:8-11`: `'mcq_definition' | 'true_false_definition' | 'type_word' | 'cloze' |
  'meaning_in_sentence' | 'mcq_sentence'`. AI types: `meaning_in_sentence`, `mcq_sentence` always; `cloze` when
  `cloze_source = 'ai'` (:16-20). Non-AI: `mcq_definition`, `true_false_definition`, `type_word`, and `cloze` with `cloze_source='own'`.
- **"Choose the word from its meaning/definition" exists** = `mcq_definition`: prompt `{ kind: 'mcq', meaning, meaning_language,
  context_label, options: lemmas }` (`practice.types.ts:29`), built in `apps/api/src/practice/questions/question-builder.service.ts:155-165`.
  `meaning` is the learner-language meaning (`sense.meaning.text`, vi or en), not specifically the English definition;
  `definition_en` is used for hints.
- **"Type the word from its meaning/definition" exists** = `type_word` with prompt style `meaning` → prompt `type_meaning`
  (`question-builder.service.ts:193-200`). With style `sentence`/`mixed` it may instead ask a masked example sentence
  (`type_sentence`, :181-191; `typingStyle`, `apps/api/src/practice/questions/question-types.ts:45-49`; `SENTENCE_SHARE = 0.5`,
  `practice.constants.ts:12`). To get "from meaning" only, a session must send `prompt_style: 'meaning'`.
- Availability (`question-types.ts:23-35`): typing always; `mcq_definition` needs `MCQ_OPTIONS − 1 = 3` eligible distractors
  (`practice.constants.ts:10`); function words take typing only.
- Distractors (`apps/api/src/practice/questions/distractors.ts`): candidates are the asked word's **group mates** — visible senses
  sharing any of the learner's groups with it, any level (`LearningService.practiceGroupMates` → `groupMatesQuery`,
  `apps/api/src/learning/practice/practice-reads.queries.ts:118`). `eligibleCandidates` (:48-68) drops same sense/lemma, form-of
  links, shared sub-meanings (also via other senses of either lemma), one per lemma; `pickDistractors` (:80-88) prefers ones not
  used before in the session. Choice and order are random (`shuffle`, :70-77).

### 6. Session lifecycle

- Routes `apps/api/src/practice/sessions/sessions.controller.ts`: `POST /v1/practice/sessions` (:40-46, Idempotency-Key, `user.write`),
  `GET current` (:48), `POST :id/next` (:53), `:id/prepare` (:65), `:id/continue` (:72), `:id/finish` (:83).
- Start body (:15-29): `source: 'today'|'all'|'group'|'weak'|'priority'`, `group_id` (required with `group`), `group_filter:
  'all'|'due'|'priority'|'0'..'5'` (only with `group`), `sort`, `types` (1–6 distinct), `prompt_style`, `count`, `cloze_source`.
  **Scoped to a group: yes. Scoped to specific sense ids: no** (no such field; `strictObject`). The Learning scope type does have
  `{ kind: 'senses', senseIds }` (`practice-reads.service.ts:23-25`), used internally (`sessions.service.ts` `usable`, :384-390).
- Group filters map in `practice-reads.service.ts` `whereOf` (:32-39): `due` → today's flashcard list of the group **with
  priority and new words and the caps** (`todayIdsQuery`, `practice-reads.queries.ts:27-65`); `'0'..'5'` → exactly that level
  (:79). There is **no "level ≥ 1" filter**.
- Size: `count ?? practice.defaultQuestionsPerSession` (10), max `maxQuestionsPerSession` (20) (`sessions.service.ts:94-98`;
  defaults `settings.definitions.ts` practice block). Round 1 walks the kept sense ids once (:441); if round 1 ends short of
  `targetCount`, status `waiting_continue` asks whether to go on (:475); later rounds reshuffle (:451). Finishes when answered ≥ target.
- **One open session per learner**: `start` sets every `active`/`waiting_continue` session to `abandoned` (`sessions.service.ts:143-145`).
- Grading `apps/api/src/practice/answers/answers.service.ts`: `POST /v1/practice/items/:id/answer|skip|hint`
  (`answers.controller.ts:20,25,38,45`). MCQ: `choice === correct_index` (:66-68); typing: `matchesAnswer` against normalized
  accepted set; wrong with retries left → `try_again` (:72-81). `writeFinal` (:132-147) stores the result on
  `practice_session_items`, calls `entitlements.recordPracticeSession` (:143) and `learning.recordActivity` (:145).
- **Answering never changes the schedule.** Only the separate button does: `POST /v1/practice/items/:id/review`
  `{ action: 'needs_review'|'known' }` (`apps/api/src/practice/reviews/practice-reviews.controller.ts:10,18-27`) and
  `POST sessions/:id/review-all` (:34-41) → `LearningService.practiceReview` → `applyAnswer` (`practice-review.service.ts:65`),
  log row `groupId: null, origin: 'practice'` (:76-82).
- Suggestion after an answer (`answers.service.ts:153-167`): `show_known = in learning && correct && hintLevel === 0 && due_now`;
  `highlight_needs_review = in learning && !correct`. "known" when not `show_known` → 409 `known-not-allowed`
  (`practice-reviews.service.ts:46-48`). Web: `AnswerFeedback.tsx:12-13,72`; summary "review all": `SessionSummary.tsx:59,74`.

### 7. Daily session quota

- Settings: `free_practice_sessions_per_day` default 3, `pro_practice_sessions_per_day` default 30
  (`settings.definitions.ts:79`, bounds :120-121, key map :268-269).
- Check: `EntitlementsService.checkQuota(userId, 'practice_sessions', tx?)` (`apps/api/src/entitlements/entitlements.service.ts:107-120`):
  limit from the resolved plan (:113), used = count of `usage_records` `pool='practice_sessions', kind='use', status='confirmed'`
  on the local date (`apps/api/src/entitlements/usage/usage.queries.ts:70-74`); refusal `quota-exhausted` with `resets_at`.
- Called in `SessionsService.start` twice: early (`sessions.service.ts:101-102`) and inside the transaction after closing open
  sessions (:148-149).
- Spent: `recordPracticeSession` (`entitlements.service.ts:123-128`) inserts one `usage_records` row keyed by session id, called
  from `writeFinal` on the first final answer (`answers.service.ts:143`). Snapshot for the UI counts the same rows (`entitlements.service.ts:148-150`).
- INFERENCE — an exempt session kind needs: (a) a marker on `practice_sessions` (no `kind`/`purpose` column today,
  `apps/api/prisma/models/practice.prisma:3-35`; `source` is the closest field), (b) skip both `checkQuota` calls in `start`,
  (c) skip `recordPracticeSession` in `writeFinal`, (d) decide whether starting it still abandons the open practice session.

### 8. Module boundaries

- Learning's only public entry: `apps/api/src/learning/index.ts` (exports `LearningModule`, `LearningService`, types);
  `learning.module.ts:39` exports only `LearningService`.
- `LearningService` (`learning.service.ts:15-65`): `cardsLeftToday`, `practiceItems(userId, scope, db?)`, `practiceGroupMates`,
  `groupsOfSenses`, `practiceCheck`, `practiceReview(tx, userId, inputs)`, `recordActivity(userId, localDate, db?)`.
  Practice uses it in `sessions.service.ts` (`this.learning.practiceItems`, :380, :386-387), `answers.service.ts:145,156`,
  `practice-reviews.service.ts:49,76`, `question-builder.service.ts:124`. Notifications uses `cardsLeftToday`.
- Practice-side Learning writes run **inside Practice's transaction** (`practiceReview` takes `tx`, `practice-review.service.ts:32`).

## C. Reminder email

### 9. Reminder

- Files: `apps/api/src/notifications/` — `scheduler/reminder-tick.service.ts`, `scheduler/reminder-send.service.ts`,
  `scheduler/eligibility.ts`, `scheduler/reminder-queue.service.ts`, `provider/email.provider.ts`, `provider/reminder-message.ts`,
  `prefs/reminder-prefs.service.ts`, `prefs/reminders.controller.ts`.
- Schedule: a BullMQ Job Scheduler adds a `tick` every `reminders.tickSeconds` (`reminder-queue.service.ts:27,59`); `tick`
  (`reminder-tick.service.ts:42-60`) pages candidates from `IdentityService.listReminderCandidates`, filters opt-outs
  (`ReminderPref.enabled=false`), skips learners with a `ReminderDelivery` row today (:81-85), runs `eligibility` and keeps only
  learners with **a card left today after caps** (`learning.cardsLeftToday`, :99-100). Send job re-checks day, prefs and cards
  (`reminder-send.service.ts:46-55`), writes `ReminderDelivery` `sending` → `sent`/`failed`.
- `eligibility.ts:31-45`: not before `sendTime` (default `'20:00'` local); stop after `stopAfterDays` (60) absent; `inactive`
  kind after `inactiveAfterDays` (7) absent (at most once per 7 days); else `regular` only if the last sent reminder is
  ≥ `minGapDays` (default **2**) days ago (`settings.definitions.ts:70`). Absence uses `lastSeenAt` (login/refresh,
  `identity/sessions/session.service.ts:54,208`), not learning activity.
- Models (`apps/api/prisma/models/notifications.prisma`): `ReminderPref { userId PK, enabled, updatedAt }` (:2-8);
  `ReminderDelivery { id, userId, localDate, kind 'regular'|'inactive', state, createdAt, sentAt }`, unique `(userId, localDate)` (:12-23).
- Content (`reminder-message.ts:16-33`): plain text, fixed copy per kind and language (vi: subject "Tới giờ học từ vựng", body
  "Hôm nay bạn còn từ cần ôn. Mở app để học vài phút nhé.") plus the settings link; **no per-learner data at all**.
  `EmailProvider.send(userId, { kind, language })` (`email.provider.ts:22-36`); job data `ReminderSendData =
  { userId, localDate, kind, language }` (`reminder-queue.service.ts:13`).
- Streak number: nothing provides it. INFERENCE: it would need a new `LearningService` method (e.g. streak as of a local date from
  `learning_activity_days`), passed through `ReminderSendData` or computed in `ReminderSendService`/`EmailProvider`, and a
  `reminderMail` parameter.

## D. Web

### 10. Toast; detecting the first learning action of the day

- `apps/web/src/app-ui/Toast.tsx`: React Aria `UNSTABLE_ToastQueue` (`toastQueue`, max 3 visible, :21-32);
  `showToast(text, tone = 'neutral'|'success'|'danger')` fixed 5 s timeout (:35-37); `ToastRegion` (:41-62) mounted once in
  `apps/web/src/app-shell/AppProviders.tsx:53`. Text only, no icon/action slot beyond "close".
- Used in (grep `showToast`): add-word sheets (`AddSentenceSheet`, `AddWordSheet`, `BulkAddSheet`, `DeckPickerDialog`),
  `VerifyEmailForm`, `BacklogPage`, `GroupDialogs`, `GroupPage`, `TopicPickerPage`, `SubscriptionRows`, practice `ReportDialog`,
  `AccountPage`, `SettingsPage`, `MyWordDialogs`, `SavedSentencesDialog`.
- First action of the day: **no existing response field says so.** `POST /v1/reviews` returns `{ item_id, level, due_date,
  priority, section }` (`reviews.service.ts:72-75`); practice answer returns `AnswerResult` (`answers.service.ts:18-24`);
  `GET /v1/me` has no activity field (`identity/profile/profile.controller.ts:23-50`, grep `activity|streak` in identity found
  nothing). INFERENCE: `recordActivityIn` uses `createMany(skipDuplicates)`, whose `{ count }` would be 1 exactly when the
  row is new, so the API could report "first today" cheaply; the web could alternatively keep a per-day flag in
  `localStorage` (per device only).

### 11. Existing tests (file names)

- Schedule / Learning API: `apps/api/src/learning/schedule/schedule.spec.ts`, `reviews/reviews.service.spec.ts`,
  `queue/queue-list.spec.ts`, `activity/record-activity.spec.ts`, `practice/practice-review.service.spec.ts`,
  `practice/practice-reads.service.spec.ts`, `items/items.service.spec.ts`, `groups/groups.service.spec.ts`,
  `backlog/backlog.service.spec.ts`, `learning.service.spec.ts`, `retention/retention.service.spec.ts`.
- Practice API: `apps/api/src/practice/sessions/sessions.service.spec.ts`, `sessions.ai.spec.ts`, `order.spec.ts`,
  `session-views.spec.ts`, `answers/answers.service.spec.ts`, `answers/answers.controller.spec.ts`,
  `reviews/practice-reviews.service.spec.ts`, `questions/question-builder.service.spec.ts`, `questions/question-types.spec.ts`,
  `questions/distractors.spec.ts`, `questions/hints.spec.ts`.
- Entitlements: `apps/api/src/entitlements/entitlements.service.spec.ts`, `entitlements.locks.spec.ts`.
- Notifications: `apps/api/src/notifications/scheduler/eligibility.spec.ts`, `scheduler/reminder-send.service.spec.ts`,
  `provider/reminder-message.spec.ts`, `provider/email.provider.spec.ts`.
- Settings: `apps/api/src/settings/settings.definitions.spec.ts`.
- Web: `apps/web/src/features/learner/today/today.test.tsx`, `review/review-session.test.tsx`, `groups/group-page.test.tsx`,
  `groups/group-list.test.tsx`, `practice/practice-home.test.tsx`, `practice/session/practice-session.test.tsx`,
  `apps/web/src/app-ui/toast.test.tsx`.
- Smokes: `apps/api/scripts/smoke-buoc-4.mjs` (practice), `smoke-buoc-5.mjs` (quota), `smoke-nhom-b.mjs` (activity days, M6).

---

## Surprises / conflicts with the planned behaviour

1. **Practice already changes the schedule.** The brief says practice does not; in code the answer does not, but the
   "Đã biết"/"Cần ôn lại" buttons after an answer and "review all" in the summary call `applyAnswer`
   (`practice-reviews.service.ts:49,76` → `practice-review.service.ts:65`). "Đã biết" there = level up when due — close to the
   planned Ôn rule, but it is a button press, not automatic on a correct answer, and needs correct + no hint + due
   (`answers.service.ts:164`). The plan must say whether the Practice page keeps these buttons ("Practice page stays exactly as it is").
2. **"Cần ôn lại" today = level 1, due today, priority true** (`schedule.ts:40`). The plan says "back to level 1"; it does not
   say due today vs today+1, nor whether priority stays. Priority makes the word count as due (`isDueNow`), so in Ôn a correct
   answer right after "Cần ôn lại" would level it up again the same day.
3. **Học "known" on level ≥1 changes the schedule today** (`schedule.ts:41-43`, flashcards in `mode=due`). Planned Học never
   changes it except level 0 → 1 and "Cần ôn lại": `applyAnswer` (shared by flashcards and practice) needs a new rule set or a
   separate function; `reviews.service.ts` replay logic assumes `priority = answer === 'review'` (:99).
4. **Daily caps are counted from `learning_log` rows with a `group_id` and `section`** (`queue.queries.ts:46-53`,
   `practice-reads.queries.ts:37-41`). If Ôn writes level-ups through `POST /v1/reviews` (group set) they would consume the
   group's review cap; through `practiceReview` (group null) they would not. If Học no longer levels due words, the "due" cap
   and the `today.due` count lose their meaning for Học.
5. **No "level ≥ 1 in group" practice scope.** `group_filter: 'due'` is today's flashcard list incl. priority **and new words**
   and caps (`practice-reads.service.ts:36`, `practice-reads.queries.ts:27-65`); `'1'..'5'` is one level each. Ôn needs a new
   scope, and the Today-level Ôn needs an all-groups "learned" scope (`source: 'all'` includes level 0).
6. **One open practice session per learner**: starting any session abandons the open one (`sessions.service.ts:143-145`), and
   `GET /v1/practice/sessions/current` would return an Ôn session on the Practice page (`CurrentSessionCard`). Ôn built on
   Practice sessions would interfere with the Practice page unless separated.
7. **Quota is spent on the first final answer, not on start** (`answers.service.ts:143`) and checked twice in `start`
   (`sessions.service.ts:101,148`); `practice_sessions` has no kind column, so exemption needs a schema change or a rule on `source`.
8. **Ôn answers would feed weak words and history**: weak words and "least practised" are computed from
   `practice_session_items` (`apps/api/src/practice/weak/practice-stats.ts:28`). INFERENCE: an Ôn session stored as a practice
   session shows up in Practice history and weak words unless filtered.
9. **MCQ needs 3 eligible distractors from group mates** (`question-types.ts:33`, `distractors.ts`): a group with fewer than 4
   usable distinct words gets typing only. Distractors include new (level 0) words — allowed by the plan? (only the *asked*
   word must be learned).
10. **"Meaning/definition" prompt**: MCQ and typing show the learner-language meaning (`sense.meaning`), and typing may show a
    sentence unless `prompt_style: 'meaning'` is sent.
11. **Streak source is broader than planned**: `learning_activity_days` is also written by adding a word, removing a word,
    deleting a group and "Học lại" (`items.service.ts:247,262`, `groups.service.ts:122`, `backlog.service.ts:94`), not only by
    review/practice answers. Either the streak counts those days too, or it needs its own source (e.g. `learning_log`
    `kind='review'` + practice final answers).
12. **Flashcard "known" before due in `mode=all` writes a log row and an activity day while changing nothing** (`schedule.ts:45-46`,
    `reviews.service.ts:63-71`): "studying all" already counts as a learning day.
13. **Reminder cannot carry a streak today and is not daily**: copy is fixed text with no data (`reminder-message.ts:16-33`); sent only when
    cards are left today (`reminder-tick.service.ts:99-100`, `reminder-send.service.ts:55`) and at most every `minGapDays` = 2
    days (`eligibility.ts:44`); it does not check whether the learner already studied today. A "sắp mất chuỗi N ngày" line can
    therefore be missing on the very evening the streak is at risk, or appear after the learner already studied.
14. **Today page has no session of its own**: hero and cards open one group's flashcards (`TodayPage.tsx:109,138-143`); there is
    no cross-group flashcard queue API. Today-level "Học"/"Ôn" needs a new queue (Học) and an all-groups learned scope (Ôn).
15. **"Đã thuộc" (level ≥ 4) is derivable without API change**: `GroupSummary.cells[4].total + cells[5].total` is already on
    `GET /v1/groups` (`queue.service.ts:16-21`). Note: level 4 is reached by "known" at level 3, i.e. the answer given at the
    7-day review (interval index 2 = 7 days, then level 4 interval 14) — consistent with the plan.
16. **No "first action today" signal** in any response (see 10); the toast needs an API field or a client-side per-day flag.
