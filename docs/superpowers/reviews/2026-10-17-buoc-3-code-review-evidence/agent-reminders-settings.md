# Review — Settings, mail move + budget, Identity reads, Notifications/reminders

Scope: `apps/api` diff `4651fbe..5aa4085` (detached worktree `buoc-3-review`). Paths below are relative to `apps/api`.
Method: read every file in scope, traced the send job end to end, read BullMQ 6.3.12 sources in
`node_modules/bullmq/dist/esm` (job.js, worker.js, backoffs.js, Lua scripts). Ran the unit suites
(`vitest run src/notifications src/settings src/common/mail src/common/time src/common/config src/identity/identity.types.spec.ts`
→ 10 files, 77 tests passed) and a pure probe of `eligibility()` / `Intl` (scratch `review/copy/probe.ts`,
`review/intl-check.mjs`). No e2e, no Docker.

Headline: **no interleaving of ticks, workers, stalls or retries sends two emails for one stored (user, local_date)**.
The only duplicate path is an SMTP error that happens after the server already accepted the message (M1). Three real
but narrow issues (M1–M3), five low, six test gaps.

---

## Findings

### M1 — medium — ambiguous SMTP failure is retried as transient → possible duplicate email (SUSPECTED for real SMTP; code path CONFIRMED-BY-READING)

`src/notifications/scheduler/reminder-send.service.ts:56-66`

```ts
try {
  outcome = await provider.send(userId, { kind, language });
} catch (error) {
  if (attempt.lastAttempt) { ...update failed... }
  else { await this.prisma.reminderDelivery.delete({ where: key }); }
  throw error;
}
```

Scenario: nodemailer sends the body, the server takes > 10 s to answer the final `.` (socketTimeout 10 s,
`src/common/mail/smtp-mailer.ts`), nodemailer rejects with `ETIMEDOUT` (command `CONN`, `smtp-connection/index.js:907-908`),
but the server delivers. The row is deleted, BullMQ retries 5 s later, the retry finds no row, creates `sending`, sends
again → learner gets 2 emails for the same local date. Same for a connection reset after `DATA` was accepted.
Design 8.3 step 4 prescribes exactly this ("Lỗi SMTP tạm thời → xóa sending, BullMQ thử lại"), so it is a design-level
residual, but it contradicts D37's own rationale (lose one rather than duplicate, because duplicates hurt the sender
reputation shared with OTP). nodemailer's `command` does not separate "timeout after DATA" from "connect timeout"
(both `CONN`), so the safe split is by phase only if the code tracks it.
Decision for owner: keep (accept rare duplicates) or treat `ETIMEDOUT`/`ECONNECTION` after a successful connection as
ambiguous → keep `sending` (D37 rule).
Test that proves the mechanism (fixture only, not real SMTP): a `Mailer` override whose `send` pushes the message to
`sent` and then throws once; workers on; `await vi.waitFor(() => expect(mailer.sent).toHaveLength(2))` passes today.

### M2 — medium — permanent SMTP rejections are retried 3× per day, and `failed` days do not count toward `min_gap_days` or the weekly inactive cap (CONFIRMED-BY-READING)

`src/notifications/scheduler/reminder-send.service.ts:56-66` (every thrown error is "transient");
`src/notifications/scheduler/reminder-tick.service.ts:85,88`:

```ts
if (own.some((row) => dateString(row.localDate) === todayDate)) continue;          // only TODAY's row blocks
...
sentDates: own.filter((row) => row.state === 'sent').map(...)                      // failed rows ignored
```

Scenario: SMTP answers 5xx for a learner (e.g. Gmail `550 5.4.5` daily quota, a policy rejection, a dead local
mailbox). Day D: 3 attempts, 3 budget units (`email.provider.ts:49` consumes before `mailer.send`), row `failed`.
Day D+1: today's row absent, `sentDates` has no D → eligible again → 3 more attempts and units. For an inactive learner
(D26 "at most once a week") `sinceLast` stays `Infinity`, so the inactive email is attempted **every day** instead of
weekly, until `stop_after_days`. Each attempt is another delivery attempt to a rejecting server.
Fix options: count `failed` (and older `sending`, see L3) as "attempted" in `sentDates` for the gap/cap; and/or throw
BullMQ `UnrecoverableError` for `responseCode >= 500` so a permanent rejection costs one unit, not three.
Test (workers off, tick level): learner 10 days away with a `failed` row dated yesterday → `tick()` → expect no job
(today: an `inactive` job is enqueued). Second case: regular learner, `min_gap_days` 2, `failed` row yesterday → expect
no job (today: one job).

### M3 — medium — `lastSeenAt` disappears when the hourly cleanup deletes the learner's session chains; the `createdAt` fallback then overstates absence (CONFIRMED-BY-READING; eligibility executed)

`src/identity/profile/identity.service.ts:72` reads `max(session_chains.last_used_at)`;
`src/identity/maintenance/identity-cleanup.service.ts:32-33` deletes chains revoked > 30 days ago and never-revoked
chains idle > 120 days; `src/notifications/scheduler/eligibility.ts:129` falls back to `createdAt`.

Scenario: account created 2026-07-01, last used and logged out (chain revoked) 2026-09-01. On 2026-10-02 the chain is
deleted. Expected (design 8.2): d = 31 → `inactive`. Actual: `lastSeenAt` null → d from 07-01 = 93 → `stopped`.
Probe output: `chain kept { kind: 'inactive' }`, `chain deleted { skip: 'stopped' }`. Same for `stop_after_days` > 120
(admin max 180) with idle, never-revoked chains. Effect is only fewer emails (the fallback can only increase d).
Including revoked chains (asked in Q10) is correct and tested (`test/identity/reminder-reads.e2e-spec.ts:50-52`); the gap
is deletion. Fix: a durable "last seen" (e.g. `users.last_seen_at` written on refresh) or exclude deleted-chain users
from the fallback — owner decision, it touches Identity's write path (design 4 said "no new write").
Test: e2e — seed the scenario above, run `IdentityCleanupService.runOnce(now)`, then `tick()` with `enqueueSend` spied →
expect one `inactive` job (fails today: none).

### L1 — low — a send job that runs after its local day ended still sends, with yesterday's date and card counts (CONFIRMED-BY-READING)

`src/notifications/scheduler/reminder-send.service.ts:40-49` never compares `data.localDate` with the learner's current
local date (nor the send time). Scenario: worker dies at 20:05 after a tick enqueued jobs; restarted 08:00 next day →
all waiting jobs send "Hôm nay bạn còn từ cần ôn" at 08:00, `cardsLeftToday` evaluated for yesterday. Same with a queue
backlog crossing midnight (concurrency 1, `send_time` up to 22:00). With `min_gap_days = 1` the learner then gets
today's regular email too: two emails physically in one local day, recorded under two dates.
Test: `send.send(sendData(user.userId, '2026-10-16'), …)` with the clock at 2026-10-17 20:30 HCM → expect no email and a
`reminder_skipped` reason like `stale-day` (today: one email, row dated 10-16).

### L2 — low — the `mail_budget_80` warning practically never fires once reminders fill the 80% (CONFIRMED-BY-READING)

`src/common/mail/mail-budget.service.ts:45` warns only when a **plain** `tryConsume` lands exactly on
`ceil(0.8 × budget)`; reminders now move the counter through `tryConsumeBelow` (lines 57-65), which never logs. Budget
1500: reminders take the bucket 1199 → 1200 silently; the next OTP makes 1201 → equality never hits. The plan says the
warning "decides nothing", but it was the operator's 80% signal; the only remaining signal is info-level
`reminder_tick_skipped`. Test: budget 10, eight `tryConsume({ ceiling: 0.8 })`, then one plain `tryConsume()` → expect a
`mail_budget_80` log entry (fails today).

### L3 — low — a past day's stuck `sending` row (B3E25 crash, maybe delivered) does not count toward `min_gap_days` (CONFIRMED-BY-READING)

`src/notifications/scheduler/reminder-tick.service.ts:88` keeps only `state === 'sent'`. After a crash on day D the
learner may have received D's email, yet D+1 is allowed with `min_gap_days` 2. Same fix as M2: let every earlier row (`sent`,
`failed`, `sending`) count as an attempt for the gap and the weekly cap. Test: `sending` row dated yesterday, `min_gap_days` 2 → `tick()` → expect no job.

### L4 — low — retry backoff reuses the import job's base (5 s): attempts at t, t+5 s, t+15 s (SUSPECTED operational)

`src/notifications/scheduler/reminder-queue.service.ts:75` uses `pipeline.jobBackoffMs` (`IMPORT_JOB_BACKOFF_MS`, default
5000, `app-config.ts:181`); BullMQ exponential = `2^(attemptsMade) × delay` via `shouldRetryJob` (`job.js:446-449`,
`backoffs.js:35`). An SMTP 421 throttle lasting > 15 s marks the learner's whole day `failed` and burns 3 units. Not
wrong per design ("hữu hạn, có backoff"), but coupled to an unrelated knob. Option: a reminder-specific delay (e.g. 60 s).

### L5 — low (note) — `verifiedEmails` does not filter `status = 'active'`

`src/identity/profile/identity.service.ts:82-88`. Harmless today (no code sets another `status`; grep of `src/identity`),
but when Bước 8 adds disable/delete, a user disabled between tick and send would still get the email. Add the filter then.

Also note: `LEARNER_APP_URL` is now required (`app-config.ts:163-167`); every developer's existing `apps/api/.env` made
from the old `.env.example` makes the API and worker fail at start until the line is added. CI was updated
(`.github/workflows/ci.yml`, admin real-stack env; `test/support/worker-env.ts`).

---

## Test gaps (all low)

T1 — **Review Focus 4 test does not make two Workers race on one learner** (`test/notifications/reminders.e2e-spec.ts:333-345`).
Both processes tick, but BullMQ ignores a second `add` with the same `jobId` while the job exists
(`commands/addStandardJob-9.lua:92` → `handleDuplicatedJob`), so one Worker runs the only job; the DB guard
(`unique(user_id, local_date)` + "row exists → skip") is never contended. The test passes if *either* guard works, so it
isolates neither. Add: (a) `await Promise.all([aSend.send(data, {lastAttempt:false}), bSend.send(data, {lastAttempt:false})])`
→ exactly 1 email across both FakeMailers, 1 row `sent`, one `reminder_skipped` with reason `delivery-exists` or
`delivery-sending`; (b) slow variant: a Mailer whose `send` awaits a deferred, start attempt 1, run attempt 2 to
completion (expect `delivery-sending`), then release attempt 1 → 1 email.

T2 — **B3E27 (jobId dedupe) is not actually proven** (`reminders.e2e-spec.ts:307-318`): "one email" also holds if dedupe
were broken, because the second job finds `sent`. Add: app with `runWorkers: true` but the reminder Worker paused
(`worker.pause()`), `tick()` twice, then `queue.getJobs(['waiting','delayed'])` → exactly one job with id
`reminder-<userId>-2026-10-17`.

T3 — **"a transient SMTP error is retried into one email" (plan Task 21 Step 1) is missing with workers on.** The test at
`:165-177` calls `send.send` by hand. Add: workers on, `mailer.failNext(err, 1)` → wait for row `sent`; assert
`mailer.sent` length 1 and `sentToday()` 2. (The 3-failure test at `:320-331` does pin the `lastAttempt` off-by-one: an
early `true` would leave `sentToday` 2, a late one would send on a 4th attempt.)

T4 — **B3E29 east move is vacuous** (`:276-289`): Kiritimati at 03:30 is skipped by `before-time`, not by any date logic.
Use a time past the send time there (e.g. clock 2026-10-18T06:30Z = 20:30 on 10-18 in Kiritimati after a 10-17 row) and
assert the outcome the design accepts (with `min_gap_days` 2: no job; with 1: one job dated 10-18).

T5 — **No tick-level test where the learner's local date differs from the UTC date for an eligible learner.** HCM at
13:30Z has the same date as UTC. Add `Etc/GMT+12` at 2026-10-18T09:00Z (21:00 on 10-17 there) → job `localDate`
`2026-10-17`.

T6 — **B3#18 "OTP still goes out"** is checked only as `MailBudget.tryConsume()` → `true` (`:273`), not as a real OTP
request reaching FakeMailer at ≥ 80%. Add: fill to `mailLimit`, call the OTP send route, `drainMail()`, expect the OTP
in `mailer.sent`.

Covered well: B3#19 history (actor, time, old, new, changed keys only, paging), B3E30 bounds + cross-field on merged
values, B3E31 incl. a concurrent race, D44 rename and old-key drop, B3E25/B3E26 rows, D27 at tick and send, budget
ceiling incl. 30 concurrent consumers and "refused consume does not increment", schema drift after the model move.

---

## Answers to the 11 questions

1. **At most one email per stored local date: holds.** Send order `reminder-send.service.ts:40-74`: read row (any state →
   skip) → chooser → `cardsLeftToday` → insert `sending` (P2002 → skip) → provider → `sent` / delete / `failed`.
   Only the execution that created the row deletes or updates it, and a second execution can create a row only after
   that delete, so no attempt deletes another attempt's row. A lost ack after SMTP success (`update sent` fails) leaves
   `sending` → retry skips (no duplicate). Re-add after `removeOnComplete`/`removeOnFail` is possible (job hash gone) and
   harmless: the tick filters any row for today (`reminder-tick.service.ts:85`) and the send re-reads it.
   `lastAttempt = attemptsMade + 1 >= attempts` (`reminder-queue.service.ts:85`) equals BullMQ's retry rule
   `attemptsMade + 1 < attempts` (`job.js:446`); `atm` is read from Redis (`redis-queue-backend.js:2044`) and stalls do
   not increment it (`moveStalledJobsToWait-9.lua` only `HINCRBY stc`). No off-by-one. A `failed` row blocks the rest of
   that day (line 85). Duplicate only via M1. Timezone change: one row per stored local date; two emails in ~24 h across
   dates are possible and accepted by B3E29 (probe: moved east, `min_gap_days` 1 → `regular` on 10-18).
2. Eligibility matches design 8.2 / plan (`eligibility.ts:127-136`): local time, local-date difference, tiers, gap.
   `sentDates` = rows with `local_date ≥ (earliest today on the page) − 7`, `sent` only. Boundary: with
   `min_gap_days` 7, a row dated today−7 gives 7 ≥ 7 (allowed) and its exclusion gives `Infinity` (allowed) — same
   outcome, so the window is sufficient (probe: t−7 regular, t−6 gap). `failed`/`sending` excluded → M2, L3. Rows from an
   older zone dated after today give a negative gap → skipped (conservative; probe "future row → gap").
   `lastSeenAt ?? createdAt` is right except after chain deletion (M3).
3. `"HH:MM"` string compare is safe: `send_time` is zero-padded by the schema regex, `localTime` uses `hourCycle: 'h23'`
   (executed: midnight prints `00:00`, never `24`). New York 2026-11-01: 20:00 EST eligible, 19:59 before-time (executed).
   `send_time` ≤ 22:00, so at least 8 ticks remain before local midnight; the only cross-midnight case is a late job (L1).
4. Ceiling SQL (`mail-budget.service.ts:57-65`) is one `INSERT … ON CONFLICT DO UPDATE … WHERE sent < $limit RETURNING`;
   Postgres returns no row when the WHERE fails → `false`; a refused consume does not increment (e2e asserts 8 then 8).
   Tick gate `sentToday() >= mailLimit(...)` (`reminder-tick.service.ts:46-47`) and provider `tryConsume({ ceiling: 0.8 })`
   (`email.provider.ts:49`) stop at the same count. OTP path (plain `tryConsume`) unchanged → reaches 100%.
   UTC buckets: the budget resets at 00:00 UTC = 07:00 in Vietnam, 20:00 EDT in New York. "Stopped until tomorrow"
   means until the UTC reset; learners whose local day is still running get their reminder after the reset (still one
   per local date). OTPs sent 00:00–07:00 Vietnam time count against the previous evening's bucket.
5. Tick (`reminder-tick.service.ts:42-98`): settings read once per tick (plus one read inside each `cardsLeftToday`);
   `reminders.enabled` false → returns before budget or candidates, queued jobs then skip at the chooser with no row.
   Per page of 500: one candidates query, prefs + deliveries in parallel, one `cardsLeftToday` statement — no per-learner
   DB query. Enqueue is one Redis call per job, sequential (could be `addBulk`; perf only). Budget is checked once per
   tick, not per page: refused jobs cost ~8 queries each, no mail, no unit, bounded to that tick.
6. Queue and Worker only when `pipeline.runWorkers && reminders.runScheduler` (`reminder-queue.service.ts:54`);
   `runScheduler` is always `true` from env (`app-config.ts:237`), `runWorkers` only from `src/worker.ts:12`. Both
   connections `maxRetriesPerRequest: null` (line 92); prefix `pipeline.queuePrefix`; shutdown closes worker, queue and
   connections, idempotent via `closing ??=`; `createTestApp` registers the hook.
7. `verifiedEmails` lookup per send; `no-address` / `budget-exhausted` delete the row (intended, design 8.3 step 3); no
   15-minute loop because the next tick is gated by the same budget line and lists only verified users. Language =
   `native_language ?? 'vi'`; link `<LEARNER_APP_URL>/<lang>/app/settings`; body takes no word (`reminderMail` has no
   word parameter). Logs: every logger call in `src/notifications` carries only `user_id`, `local_date`, `kind`, reason,
   channel; errors are reduced to `{ name, code }` by `AppLogger` (`app-logger.ts:19-31`) — no address.
8. Settings: one row `key='global'`; version check inside the transaction plus `updateMany … WHERE version = $v`
   (count 0 → 409) and P2002 on the first-save race → 409 (`settings.service.ts:158-189`) — atomic. Bounds, 15-minute
   step, 06:00–22:00, cross-field on merged values, D44 rename (old `weeklyMax` dropped by `withDefaults`), history per
   changed key with actor/time/old/new, `settings.manage` admin only, `@Idempotent()` + `user.write` on PUT, partial PUT
   merge, defaults for a missing row or missing keys — all correct. A PUT with `values: {}` bumps the version with no
   history row (harmless).
9. Mail move: files are byte-identical apart from import paths (diff with CR stripped), plus `mailLimit`,
   `REMINDER_MAIL_SHARE`, `sentToday`, `tryConsumeBelow`, `failNext(err, times)`. `src/common/**` imports nothing from
   Identity (grep: only a comment). `MailBudgetBucket` moved to `common.prisma`, table unchanged, guarded by
   `test/common/schema-drift.e2e-spec.ts`. One `MailModule` instance shared by Identity and Notifications, so the test
   `Mailer` override applies to both.
10. `listReminderCandidates` (`identity.service.ts:63-79`): verified, `status='active'`, `id > afterUserId`, ordered by id,
    `take: limit`; revoked chains count (correct). Deletion issue → M3. `verifiedEmails` omits unverified/unknown,
    de-duplicates ids; no status filter (L5).
11. See Test gaps T1–T6. Biggest: T1 (Review Focus 4 not really racing) and T2 (B3E27 not isolated).

## Checked, no issue

- `src/notifications/scheduler/reminder-send.service.ts:40-53` — unique guard + skip on any existing state; no cross-attempt delete.
- `src/notifications/scheduler/reminder-send.service.ts:68-71` — `sent` written after SMTP success; a failed write leaves `sending` (no duplicate).
- `src/notifications/scheduler/reminder-queue.service.ts:22-24` — job id has no `:` (BullMQ rejects `:` unless 3 parts, `job.js:907-909`).
- `src/notifications/scheduler/reminder-queue.service.ts:85` — last-attempt rule matches BullMQ 6.3.12.
- `src/notifications/scheduler/reminder-tick.service.ts:69-76` — 7-day window sufficient for `min_gap_days` ≤ 7 and the inactive cap.
- `src/notifications/scheduler/eligibility.ts:128-136` — tiers, local time, local-date absence, gap (probe executed).
- `src/common/time/local-date.ts:7-48` — `h23`, UTC-midnight date math, `daysBetween` exact across DST.
- `src/common/mail/mail-budget.service.ts:13-15,35-65` — one 80% line, atomic ceiling, refused consume does not increment.
- `src/notifications/provider/email.provider.ts:45-53`, `channel-chooser.ts:19-22`, `reminder-message.ts:109-135`.
- `src/notifications/prefs/reminders.controller.ts:20-26` — `@Idempotent`, `user.write`, strict body.
- `src/settings/settings.service.ts:156-191`, `src/settings/settings.definitions.ts:32-111`, `admin-settings.controller.ts:17-41`.
- `src/identity/identity.types.ts:4-11` — `settings.manage` admin only.
- `src/common/config/app-config.ts:163-167,183,237` — `LEARNER_APP_URL` origin-only, `REMINDER_TICK_SECONDS` default 900.
- `prisma/migrations/20261017130000_notifications/migration.sql` — unique `(user_id, local_date)`, kind/state CHECKs.
- `prisma/migrations/20261017120000_settings/migration.sql` — matches `settings.prisma`.
