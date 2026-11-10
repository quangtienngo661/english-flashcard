# Giao diện mới M6 (Lịch học: hộp Lịch, hộp Ngày, nút lịch, bỏ trang Lịch sử): code facts (10/11/2026)

Source: `origin/refactor/giao-dien-moi` (tip `f415b383`, merge of PR #256), read with `git show` / `git grep`. Read-only survey. Paths are relative to the repo root; line numbers are on that branch unless noted. Open branches compared: `origin/feat/giao-dien-moi-m4` (tip `31cc035a`, PR #257, direct descendant of the tip) and `origin/feat/giao-dien-moi-m5a` (tip `590ef3d7`, based on older `2cb4b0ba`, git reports several merge bases).
Shorthands: `API` = `apps/api/src`, `W` = `apps/web/src`, `LR` = `W/features/learner`, `CH` = `W/app-chrome`, `MEM` = `W/app/[locale]/app/(member)`, `vi` = `apps/web/messages/vi.json` (line numbers on the branch; `en.json` mirrors it, its line numbers UNVERIFIED).
Design = `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` (§5.4, §5.6, §9 M6, §10.2–§10.5). Plan = `docs/superpowers/plans/2026-11-10-giao-dien-moi.md` (roadmap row 6 at line 69).

## 0. Big picture

- **The API for M6 is already built and merged** (Part 1 tasks A1–A5): `GET /v1/me/calendar`, `GET /v1/me/calendar/days/:date` (with the §10.5 extra fields) and `GET /v1/me/streak` all exist; the Practice side is the `PRACTICE_DAY_COUNTS` port. M6 is **web only** unless the planner wants the small API gaps in section 1.4.
- **No web code for M6 exists.** `grep` for `me/calendar`, `me/streak`, `lich=`, `ngay=` in `apps/web` returns nothing. No `CalendarButton`, no URL-param dialog helper, no streak query. The streak on the web today is only a toast fed by `streak: {days}` in answer responses (section 5).
- **The old history page is still live** at `MEM/(chrome)/practice/history/page.app.tsx` rendering `LR/practice/HistoryPage.tsx` (two tabs: answers, reports). Four places link to it (section 3.4). `/app/settings/reports` does not exist yet; `MyReportsTab` is the only reports UI.
- **Chrome has no calendar slot and no per-route "hide" logic.** `AddFab` is rendered by `TodayPage` itself, not by the layout; the layout `(chrome)/layout.app.tsx` only wraps `AddWordProvider > AppChrome`. The `(member)` layout already hosts overlays (`HouseAd`, `AdsenseLoader`) so it is the natural home for the dialog state (design §5.6 says so).
- **Tests are strict about unscripted requests**: `makeFetch` throws `unscripted request: …` (`W/app-shell/session/test-support.ts:62`) and the e2e mock returns a 404 problem (`apps/web/e2e/support/mock-api.ts:90`). A button mounted in `AppChrome` that calls `/v1/me/streak` breaks every test that renders the chrome unless a default route is added in both places (section 9.2).
- Overlap with open branches: m4 touches `Dialog.tsx`, `Toast.tsx`, `format.ts`, `TopBar.tsx`, `chrome.test.tsx`, messages; m5a touches only the ui kit, API answers and 4 message lines. Details in section 9.

## 1. Calendar and streak API as built

### 1.1 `GET /v1/me/calendar?month=YYYY-MM`
- Controller `API/learning/calendar/calendar.controller.ts:13-21`: `@Controller('me/calendar') @LearnerContent()`, `@Get()` → `CalendarService.month(learner.userId, query.month)`. Registered in `API/learning/learning.module.ts:35` (with `StreakController` at :36).
- Query schema `calendar.schemas.ts:4-9`: `z.strictObject({ month })`, regex `^\d{4}-(0[1-9]|1[0-2])$`, refine `'2026-01' <= m <= '2100-12'`. Any other key is rejected (strict). Missing/malformed/out-of-range → 400 `validation-failed` with `violations` naming `month` (design §10.3; spec test in `calendar.schemas.spec.ts`, content not re-read).
- Response (`API/learning/calendar/calendar.ts:32-36`):
  `{ month: 'YYYY-MM', days: [{ date, learned, reviewed, practice_sessions }], totals: { study_days, learned, reviewed, practice_sessions } }`. All numbers are non-null integers.
  - `days` has only dates where `learned + reviewed + practice_sessions > 0`, ascending (`calendar.ts:8-11` of the aggregate, lines 88-91 of the file).
  - `totals.learned/reviewed/practice_sessions` are sums of `days` (`calendar.ts` aggregate ~l.96-99), so a practice session crossing midnight counts in both days and in `totals`. `study_days` comes from `learning_activity_days.studied = true` count (`calendar.service.ts:90-92`), independent of `days`.
  - There is **no per-day `studied` flag** and **no streak** in the month response: a cell is "has activity" only by presence in `days` (see risk R3).
- Future month / month before the account / old month: 200 with empty `days`; practice numbers are 0 for months older than `historyMonths` (design §10.3). Not re-verified by running.

### 1.2 `GET /v1/me/calendar/days/:date?kind=&page_size=&page_token=`
- Controller `calendar.controller.ts:23-30`. Param schema `calendar.schemas.ts:13-21` (regex plus round-trip check, so `2026-02-30` → 400). Query `calendar.schemas.ts:24-28`: `kind` ∈ `all|learned|reviewed` default `all`; `page_size` int 1–100 default 20; `page_token` optional string; strict object.
- Response type `CalendarDayView` (`calendar.service.ts:22-48`):
  ```
  { date,
    counts: { learned, reviewed, reviewed_known, reviewed_again, learned_groups, practice_questions },
    items: [{ kind: 'learned'|'reviewed', item_id, lemma: string|null, group_id: string|null, result: 'known'|'again'|null, times }],
    practice_sessions: [{ session_id, first_position, last_position, questions, correct }],
    next_page_token: string|null }
  ```
  - `counts` are whole-day totals and do not change with `kind` (`calendar.service.ts:109-118`). `practice_questions` = sum of the sessions' `questions` (`:118`), not read from `countByLocalDate`.
  - `reviewed_known + reviewed_again = reviewed` only if every review row has a rating; the SQL CHECK says every `review` row has one (design §10.1); a `null` rating would make `result: null` (`calendar.ts` `resultOf`).
  - `item.group_id` is the group of the **latest** row of that `(item, kind)` (`calendar.ts` aggregate: item.groupId updated when `row.at >= item.lastAt`); `null` when the last row was a practice-session answer (design §10.2). No group **name** and no `sense_id`: the web joins names from `GET /v1/groups` and links by `lemma` (`wordHref`, `LR/word/word-api.ts:35` on m1 branch).
  - `lemma` `null` → "Từ không còn trong kho" (design §10.3); lemma comes from one `ContentService.cardContent` call per page (`calendar.service.ts:111-115`).
  - `learned_groups` counts distinct non-null `group_id` among `learned` rows (`calendar.ts` aggregateDay).
  - `practice_sessions` come from the port, ordered by first answer time (`API/practice/maintenance/practice-day-counts.provider.ts:49`); `first_position/last_position` = MIN/MAX `position` answered **that day**; counts only graded answers of sessions with `kind='practice'` (`:47`, so Ôn/recall never appears).
- Paging: token bound to `${date}|${kind}` (`calendar.service.ts:99`); wrong-date/wrong-kind/garbage token → 400 `validation-failed` (`:51-52, :101-103`). Sort: last time newest first, then `item_id`, learned before reviewed (`calendar.ts` compare).
- Future date: 200 with zero counts and empty arrays (no date-vs-today check in the service). "Chưa tới ngày này" must be decided on the web from `me.timezone`.
- No rate limit on either endpoint (design §10.3).

### 1.3 `GET /v1/me/streak`
- `API/learning/activity/streak.controller.ts:10-28`: `@Controller('me/streak') @LearnerContent()`, returns `{ days: number, studied_today: boolean }`. Today = `localDate(profile.timezone, clock.now())`; profile missing → 404 `not-found` (`:22`).

### 1.4 Gaps versus design §10.2 / §10.5 (none blocks M6)
- All four §10.5 rows for M6 are present (`reviewed_known`, `reviewed_again`, `learned_groups`, `practice_sessions[]`, streak endpoint). No gap in what the design lists.
- Things the Figma boxes may want that the API does not give (check Figma frames `102:3278`, `102:3948`, `103:3820`, `103:4248` before planning; I did not read Figma): (a) a per-day "studied" flag or `reviewed_known/again` per day in the **month** response; (b) group **name** or session **time/group** on `practice_sessions[]` (only ids, positions, counts); (c) a `session_id` filter on `GET /v1/practice/history` (section 2); (d) the streak inside the month response. All are web-joinable except (c).

## 2. `GET /v1/practice/history?date=` (the Ngày dialog's questions of the day)
- `API/practice/history/history.controller.ts:8-15, :32-35`. Query (strict): `page_size` 1–100 default 20, `page_token`, `date` (YYYY-MM-DD with round-trip check), `sense_id` (uuid). **No `session_id` filter.**
- Service `history.service.ts:90-132`: rows from `practice_session_items` where `result IN ('correct','wrong')` and `session.kind = 'practice'`, optional `localDate = date`; ordered `answeredAt desc, id desc`; `take page_size + 1`; token bound to `${date}|${sense_id}` (`:92`); bad token → 400.
- Item shape `HistoryItem` (`history.service.ts:18-26`, mirrored on the web at `LR/practice/practice-api.ts:80-101`): `item_id, session_id, sense_id, lemma, type, prompt_style, prompt, answer, correct{lemma,text,choice_index,is_true}, result, skipped, tries, hint_level, review_action, answered_at, local_date, alternative, translation`. `session_id` is present, so the web can group a page by session and match `calendar.practice_sessions[].session_id`.
- Skipped questions arrive as `result:'wrong', skipped:true`; they count in `practice_questions`.
- Web callers today: `useRecentHistory(size)` `practice-api.ts:135-141` (`['practice','recent',size]`, `?page_size=3`) for PracticePage "Gần đây"; `HistoryPage.AnswersTab` `HistoryPage.tsx:73-84` (`['practice','history',day]`, `?date=&page_size=50[&page_token]`, `useInfiniteQuery`, `getNextPageParam: last.next_page_token ?? undefined`). The `day` value is `'all'` (no date) or `localDay(at, zone)`.
- The history endpoint is not tied to the calendar's 6-month cleanup note, but the rows themselves are deleted by the same job (design §10.1), so old days return empty.

## 3. Old history page (to be replaced)

### 3.1 Route and component
- Route: `W/app/[locale]/app/(member)/(chrome)/practice/history/page.app.tsx:1-11` → `<Suspense><HistoryPage/></Suspense>`; comment `K/57, K/57b, K/82, K/83`. Under group `(chrome)` (so URL `/vi/app/practice/history`). Tab ownership: `CH/nav.ts:9` (`practice` tab owns `/app/practice(/|$)`), so it lights the Luyện tập tab.
- `LR/practice/HistoryPage.tsx`: tabs via `react-aria-components` `Tabs` (`:42-60`), `useState` initialised from `?tab=reports` (`:31`) and kept with `window.history.replaceState(null,'', id==='reports' ? '?tab=reports' : window.location.pathname)` (`:36`; drops other params, ignores `?date=`). `?date=` is **not read at all** by the current page (the day `Select` is local state, `:72`).
- `AnswersTab` `:65-157`: `DAYS_BACK = 7`, `PAGE = 50` (`:23-24`); day list built from `new Date()` minus 86 400 000 ms steps and `localDay(at, zone)` (`:86-94`); `useZone()` local helper `:216-219` (`state.me.timezone` or `'UTC'`). Row component `HistoryRow` `:171-214` (grid/table; reuses `App.practice.history.*` messages and `App.practice.types.*`).
- `LR/practice/history-format.ts`: `answerSummary(item, t)` for `App.practice.recent` (used by PracticePage "Gần đây" — **not** history-page-only; keep).
- `LR/practice/days.ts:2-4`: `localDay(at: Date, timeZone): string` via `Intl.DateTimeFormat('en-CA', …)`. Used by HistoryPage, `WeakWordsPage.tsx:17,145,163`.
- `LR/practice/MyReportsTab.tsx` (103+ lines): `useInfiniteQuery` key `['practice','my-reports']`, `GET /v1/practice/reports?page_size=20[&page_token=…]` (`:29-35`); `ReportWord` per row does `useQuery(['sense', senseId])` → `GET /v1/senses/{id}` with `staleTime: Infinity`, retry skip on 404 (`:89-103`); status chips `STATUS_TONE` `:15-20`; `MyReport` type at `practice-api.ts:167`. Backend `API/practice/reports/reports.controller.ts:42` (`@Controller('practice/reports')`). Uses old `app-ui/*` and `Button`, so `/app/settings/reports` is a rebuild (design §9 M6), not a move.

### 3.2 Query keys / API client conventions touched
- `['practice','history',day]`, `['practice','recent',size]`, `['practice','my-reports']`, `['sense',id]`. Nothing invalidates `['practice','history',…]` explicitly in the files read (UNVERIFIED by full grep of invalidations).

### 3.3 Messages used only by the history page (vi)
- `App.practice.history.*` lines 1458–1509 (title, back, tabs, day, allDays, today, yesterday, counts, cols, typeStyle, styles, result, actions, none, more, true, false, emptyTitle, emptyBody, emptyDay, toPractice). Only consumer: `HistoryPage.tsx:28,66,172`. Delete with the page; `i18n/messages.test.ts` (key-parity test, content not read) will want vi/en to stay equal.
- `App.practice.reports.*` lines 1510–~1531 (cols, status.{open,fixed,no_error,confirmed}, refunded, refunding, notRefundable, emptyTitle, emptyBody, toPractice, unknownWord, more). Only consumer: `MyReportsTab.tsx:24,90` → reused by the new settings page.
- Shared (keep): `App.practice.recent.*` (`history` link text at line 1212 `"Xem lịch sử"`, used by `PracticePage.tsx:257`); `App.practice.session.report.*` line ~1379–1392 (`done` at 1391 = "Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo lỗi của tôi.", design wants "…Xem kết quả trong Cài đặt → Báo lỗi của tôi."; parent key per design §9 M6 = `App.practice.session.report.done`, parent not re-confirmed from the JSON nesting).
- `App.chrome.menu.reports` = "Báo lỗi của tôi" (vi:336-340). `App.today.lastCalendar` = "Mở lịch học" (vi:681, block `today` starts 651).

### 3.4 Every place that links to `/app/practice/history` (web, non-test)
1. `LR/today/TodayPage.tsx:198` — `Link href={`/${locale}/app/practice/history`}` text `t('lastCalendar')`; comment at :197 "calendar comes with M6; until then the old history page". Inside `LastPractice` (renders only when `/v1/practice/sessions/last` returns a session; `TodayPage.tsx:~150-202`).
2. `LR/practice/PracticePage.tsx:257` — "Gần đây" box, `t('recent.history')` "Xem lịch sử" (plan line 1867 says M5.5 changes this to "Mở lịch học" pointing at `/app/practice/history` until M6, so after M5 the target stays this URL).
3. `CH/AvatarMenu.tsx:65` — `href=/…/app/practice/history?tab=reports` (ruling R11 in `docs/deliveries/giao-dien-moi-rulings.md:22`; header comment at :22-23).
4. No other `app/practice/history` literal in `apps/web/src` (grep over `apps/web apps/admin`); string `practice.history` appears only as message keys.
- Doc references (not code): `docs/deliveries/giao-dien-cu-map.md:27`.

### 3.5 Tests that visit or render the history page
- Unit: `LR/practice/weak-history.test.tsx` — **file also holds `WeakWordsPage` tests** (describe at line 55 for Weak; HistoryPage describes at lines 125, 143: alternative-answer chip, Câu đã làm columns, a11y labels, empty, day filter asks API for the local date (`?date=${day}&page_size=50`), my reports, empty reports, tab switch). Imports `HistoryPage` at :6. Must be split, not deleted. Mocks `usePathname → '/vi/app/practice/history'` (:11).
- Unit: `LR/today/today.test.tsx:81` expects "Mở lịch học" `href '/vi/app/practice/history'`. `CH/chrome.test.tsx:68-76` expects AvatarMenu item texts incl. "Báo lỗi của tôi" (hrefs not asserted in the lines read). `LR/practice/practice-home.test.tsx:63,374` and `ai-toggle.test.tsx:60` stub `GET /v1/practice/history?page_size=3` (PracticePage "Gần đây", unaffected).
- e2e: `apps/web/e2e/app/m4.spec.ts:128` (mock), `:252-261` test "history and my reports" (visits `/vi/app/practice/history`, clicks the reports tab, reloads and expects the tab selected), `:285-286` axe/overflow table rows `practice/history` and `practice/history?tab=reports`. `e2e/app/cai-thien-a-practice.spec.ts:46` and `e2e/app/m5a.spec.ts:65` only stub the endpoint. Screenshots: `apps/web/e2e-shots/shots.spec.ts:393-394` (`practice/history`, `practice/history?tab=reports`).

## 4. Web API client conventions

- Fetch helper: `W/app-shell/api/client.ts:6-14,16-45` — `ApiClient.get<T>(path)`; non-2xx → `toApiError`; **204 returns `undefined`** (`:31-34`). Hook: `useApi()` from `W/app-shell/session/session-context.tsx:64`; `useSession()` `:59` → `{ state, store }`.
- Query hooks live next to the feature, named `xxx-api.ts` / `use-xxx.ts`, with exported key constants. Examples to copy: `LR/today/last-session.ts:21-29` (`LAST_SESSION_KEY = ['practice','sessions','last']`, 204 → `null` via `?? null`), `LR/groups/groups-api.ts:97-103` (`GROUPS_KEY = ['groups']`, `useGroups()`), `W/app-shell/queries.ts:56-67` (`ENTITLEMENTS_KEY = ['me','entitlements']`, `APP_CONFIG_KEY`). No central key registry.
- Timezone: `Me.timezone: string` at `W/app-shell/session/session-store.ts:12`. There is **no shared hook**; the pattern `state.status === 'signed-in' ? state.me.timezone : 'UTC'` is copy-pasted in: `app-shell/format.ts:66` (also allows `change-password`), `LR/practice/HistoryPage.tsx:218`, `WeakWordsPage.tsx:174`, `CustomizeDialog.tsx:312`, `session/SessionNotice.tsx:17`, `settings/UsageSection.tsx:34`, `add-word/AiLookupPanel.tsx:38`. `HouseAd.tsx:45` uses `me.timezone` from a `useSession` read.
- "Today in the learner's zone": **three separate private/local copies with different argument order**: `LR/practice/days.ts:2` `localDay(at, timeZone)`; `LR/house-ad/house-ad-counter.ts:10` `localDay(zone, at)`; `LR/settings/refill.ts:2` private `localDay(at, timeZone)`. No "current month in zone" helper and no month-name formatter.
- `useFormat()` (`format.ts:63-68`) gives `date(at, 'weekdayDayMonth'|'dayMonth'|'full')`, `time`, `number`, `money` in the learner's zone, vi-VN/en-US. No month+year style ("Tháng 11, 2026") and no weekday-narrow style; the calendar header and the day-name row need either new `DateStyle`s or their own `Intl` use. m4 adds a `'numeric'` style to the same file (section 9).

## 5. Streak on the web today

- Only consumers: the toast. `W/app-ui/StreakToast.tsx:21` `showStreak(days)`, `:36` `StreakToast` (mounted in `W/app-shell/AppProviders.tsx:55`, i18n `App.streak`). Callers: `LR/practice/session/use-practice-session.ts:59-60` (type `streak?: {days:number}|null`) and `:280` (`if (result.streak) showStreak(result.streak.days)`); `LR/review/use-review-queue.ts:60-63` (`POST /v1/reviews` → `streak?: {days}|null`, `if (saved?.streak) showStreak(...)`). The recall (Ôn) session reuses the practice hook (test `recall-session.test.tsx:89-91`; direct call site in `RecallSession.tsx` not found by grep).
- API side: `API/learning/reviews/reviews.service.ts:16-18,82,108` — `streak: { days } | null`, set **only on the first study of the learner's day** (`firstStudied`), `null` on replays. The payload has `days` only, **no `studied_today`**.
- Nothing on the web calls `/v1/me/streak` or `/v1/me/calendar` (grep `apps/web`: no hit). No query key exists yet. Design §10.5 says the web updates the streak cache from the answer instead of refetching: that must write `{ days: result.streak.days, studied_today: true }` into the future streak key at both call sites above (and wherever Học/Ôn use `showStreak`). A study event that carries no `streak` (not first of day) leaves the cache valid; a day change without reload leaves it stale (R5).

## 6. Chrome (`W/app-chrome/*`)

- `AppChrome.tsx:16-40`: root `div.relative.isolate.flex.min-h-dvh`, `DotGridBackground`, skip link, `<header class="sticky top-0 z-40">` with `TopBar` (md+), `PhoneHeader` (<md), `Suspense > SearchStrip`; `<main id="main" class="mx-auto w-full max-w-290 flex-1 px-4 pb-28 pt-6 md:pb-12 lg:px-8">`; then `MobileTabBar`. No floating slot, no props, no route logic. (m4 replaces SearchStrip with `TopSearch` in `TopBar`; see 9.)
- `AddFab.tsx:8-21`: no props; `useAddWord().open()`; classes `fixed bottom-24 right-4 z-40 flex size-14 … rounded-wm-pill bg-wm-accent … md:hidden`. Rendered only by `LR/today/TodayPage.tsx:95` (inside TodayPage's fragment after `PageColumns`), so it exists only on Hôm nay and only below 768 px.
- `MobileTabBar.tsx:15-37`: `nav.fixed.inset-x-0.bottom-0.z-40.grid.grid-cols-4 … pb-safe pt-1.5 md:hidden`; each link `min-h-14` (so the bar is about 62 px + safe area). `nav.ts:6-17`: `TABS` today/groups/practice/lookup with `owns` regexes; `currentTab(pathname)` strips `/vi|/en`. `groups` owns `/app/(groups|group|topic|review)`; `practice` owns `/app/practice(/|$)`; Settings/Plans own no tab.
- `chromeShape(pathname)` is **not** in `app-chrome`: it is `W/app-shell/skeleton-shape.ts:5-7`, returns `'bare'` for `/{vi|en}/app/(practice/session|review|recall|complete-profile|welcome|login|register|verify-email|forgot-password|reset-password|google/complete|account-deleted)` else `'chrome'`; used only by `RequireSession.tsx:58` for the hard-load skeleton. It is not used to decide anything about floating buttons.
- `AvatarMenu.tsx:25-82`: react-aria `MenuTrigger`/`Menu`. Items in order: Tài khoản (`/app/settings/account`), Cài đặt (`/app/settings`), Lịch sử giao dịch (`/app/settings/transactions`), Báo lỗi của tôi (`/app/practice/history?tab=reports`, line 65), theme toggle, separator, Đăng xuất. Test asserts exact order (`chrome.test.tsx:70-74`).
- `PhoneHeader.tsx:10-30`: logo, search link to `/app/lookup`, `AvatarMenu`. No calendar button there (the session bar variant `95:344` is M5/M6 territory).
- Layout nesting at the branch: `(member)/layout.app.tsx:11-20` = `RequireSession > {children}, HouseAd, AdsenseLoader`; `(member)/(chrome)/layout.app.tsx:9-15` = `AddWordProvider > AppChrome` ('use client'); `(member)/(focus)/layout.app.tsx:5-12` = `<main id="main" class="relative isolate flex min-h-dvh flex-col">` + `DotGridBackground` (no AddWordProvider, no chrome); `(member)/(onboarding)/layout.app.tsx` = `CardFrame`. `(chrome)/(today)/page.app.tsx` is Hôm nay (extra route group for its `loading.app.tsx`).
- How "overlays/focus routes hide chrome": by route group only (`(focus)`, `(onboarding)`, `(auth)` have no `AppChrome`). Dialogs are `ui/Dialog` modals at `z-50` over the `z-40` chrome; nothing hides the chrome programmatically.
- "Từ tồn đọng" = `/app/group/backlog` (`MEM/(chrome)/group/backlog/page.app.tsx` → `LR/groups/BacklogPage.tsx`, reads `?id=`, `:42`). "Chủ đề" = `/app/topic` (`MEM/(chrome)/topic/page.app.tsx` → `TopicPickerPage.tsx`). Both are in `(chrome)` and under the Nhóm tab (`nav.ts:8`). Both render `LR/groups/FloatingBar.tsx` (`BacklogPage.tsx:232-242`, `TopicPickerPage.tsx:238-253`) only while words/topics are selected. `FloatingBar.tsx:13-16`: `fixed inset-x-3 bottom-21 z-30 … flex-col` on phone (just above the tab bar; stacked column), `md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:flex-row` on tablet/desktop. So on phones the bar spans the full width and would sit under a bottom-right button; desktop bar is centered, a bottom-right button may still collide at 768–1024 px (UNVERIFIED, depends on bar width and button size).
- Other fixed bottom things to avoid overlapping: toast region `ui/Toast.tsx:49` (`fixed inset-x-4 bottom-20 z-60 … md:bottom-6`); skeleton bottom bar `ui/Skeleton.tsx:27`.
- Design/Figma notes for the button (not Figma-verified): `docs/mockups/2026-11-05-redesign-concepts/app-redesign-plan.md:215` (little calendar sheet with navy strip "T11", today's number, yellow streak tag, bottom-right, phím `L`; "cuối mỗi màn chừa 124 px, điện thoại 100 px"), `:230` (attached to 28 frames, not overlays), `:250` (phone Hôm nay: "+" stays, calendar button stacked **just above** it), `:216` (phone in Luyện tập/Ôn: button on the top bar, not floating, "đề xuất, chờ chủ dự án duyệt"), `:432` (hidden on phone where a floating bar exists). Line 215 also says "trên thanh tab ở điện thoại", which contradicts :250 and design §5.4 (floating); planner should settle against Figma `95:343`/`95:344`. The main content bottom padding is `pb-28` (112 px) on phone, `md:pb-12` (`AppChrome.tsx:34`), vs the mockup's 100/124 px note.
- Design §5.4 says the calendar button sits in `(chrome)` layout and on the session bar for `(focus)`; neither layout has it.

## 7. Dialogs and URL params (design §5.6)

- **No URL-param dialog helper exists** on `refactor/giao-dien-moi` or on `feat/giao-dien-moi-m4` (grep for `pushState|replaceState|history.state|?them|them=` in `apps/web/src`: only `session-store.ts:401` (`replaceState` to strip `signed_in`) and `HistoryPage.tsx:36`). Existing dialogs keep their state in React (`add-word-context.tsx`, `useGroupDialogs`, `CustomizeDialog`). `useSearchParams` consumers are page-level readers (`GroupPage.tsx:62`, `BacklogPage.tsx:42`, `LookupPage.tsx:26`, `WordPage.tsx:28`, `TopicPickerPage.tsx:43`, …); `parseLookup` lives in `LR/lookup/lookup-api.ts`.
- `W/ui/Dialog.tsx:8-23,31-75` (react-aria `ModalOverlay > Modal > Dialog`): props `isOpen`, `onOpenChange(open)`, `title`, `titleAside`, `closeLabel` (shows ×), `wide` (640 px → actually `md:max-w-2xl` = 672 px; the doc comment says 640), `children`, `footer`, `isDismissable` (default true). Default width `md:max-w-lg` (512 px). Below 768 px it is a bottom sheet (`items-end`, `rounded-t-wm-modal`, `max-h-dvh overflow-y-auto`), from 768 px a centred modal. **There is no separate `onClose`**: Esc, outside click and the × all call `onOpenChange(false)`. No hook for "Esc goes back one level" (design: Esc in Ngày → Lịch; Esc in Lịch → close): the caller must do it inside `onOpenChange`.
  - m4 adds `size: 'md'|'lg'|'xl'` (`md:max-w-lg|2xl|215`, i.e. 512/672/860 px) and keeps `wide` as alias of `lg` (`git diff` of `ui/Dialog.tsx` on m4).
- Keyboard shortcuts precedent: `add-word-context.tsx:32-42` — `window` keydown `n`, ignoring `alt/ctrl/meta` and targets inside `input, textarea, select, [contenteditable="true"], [role="dialog"]`. The `L` key (design §3 line 128, §520) should copy that guard. m4 `TopSearch.tsx` does the same for `/`. `Shortcuts.tsx:5-11` (settings list) has no `L` row (`KEYS`: N, /, Space, 1·2, Esc).
- Closing patterns in existing code: state setters (`setSheet(null)`), and `add-word-context.tsx:25-30` closes Thêm từ when `usePathname()` changes. No `router.replace`/`router.back` pattern for dialogs.
- Tests mock `next/navigation` statically (`layouts.test.tsx:17-22`: `useSearchParams: () => new URLSearchParams('id=g1')`, `useRouter: () => ({replace, push})`), so tests that change the URL with `history.pushState` will not see `useSearchParams` update unless the mock reads `window.location.search`.
- Design claim to verify when implementing (UNVERIFIED by me this session): Next 16.4 `useSearchParams` follows `window.history.pushState/replaceState` (design §5.6 cites the "Linking and navigating" doc).

## 8. Hôm nay's "Mở lịch học" link

- `LR/today/TodayPage.tsx:197-200` — `<Link href={`/${locale}/app/practice/history`} className={LINK}>{t('lastCalendar')}</Link>`, message `App.today.lastCalendar` ("Mở lịch học", vi:681; `t` = `useTranslations('App.today')`). It is the second link in the right column of `LastPractice` (first is `lastRetry` → `/app/practice/weak`, :194-196). The section renders only when the learner has a last practice session (`useLastSession`, `LR/today/last-session.ts`), so brand-new learners have no calendar entry on Hôm nay except the new button.
- Test: `LR/today/today.test.tsx:81` pins `href '/vi/app/practice/history'` (must change to a `?lich=<YYYY-MM>` link or button). A `?lich=` link needs the current month in the learner's zone (client-computed; design §10.4 uses bare `?lich` only in the server redirect).

## 9. Overlap with open branches and files M6 will touch

### 9.1 Files M6 likely touches and whether m4 / m5a also change them
(`git diff --stat origin/refactor/giao-dien-moi...origin/feat/giao-dien-moi-m4` and `...-m5a` read this session.)

| File | m4 (PR #257) | m5a |
|---|---|---|
| `W/app-chrome/AppChrome.tsx`, `AddFab.tsx`, `MobileTabBar.tsx`, `PhoneHeader.tsx`, `nav.ts`, `AvatarMenu.tsx` | no | no |
| `W/app-chrome/TopBar.tsx` | **yes** (adds `TopSearch` in a `Suspense`, hides it on `/app/lookup`) | no |
| `W/app-chrome/SearchStrip.tsx` | **deleted** (replaced by `TopSearch.tsx`); `AppChrome.tsx` still imports `SearchStrip` on m4's base? (`AppChrome.tsx` not in the m4 diff list, UNVERIFIED how it compiles; check at integration) | no |
| `W/app-chrome/chrome.test.tsx` | **yes** (−25 lines, SearchStrip tests removed) | no |
| `W/ui/Dialog.tsx` | **yes** (`size` prop) | no |
| `W/ui/Toast.tsx` | **yes** (`link`, `timeout`) | no |
| `W/app-shell/format.ts` | **yes** (`'numeric'` DateStyle) | no |
| `W/app/[locale]/app/(member)/layout.app.tsx`, `(chrome)/layout.app.tsx`, `(focus)/layout.app.tsx` | no | no |
| `LR/today/TodayPage.tsx` | no | no |
| `LR/practice/HistoryPage.tsx`, `MyReportsTab.tsx`, `weak-history.test.tsx`, history route | no | no |
| `LR/practice/PracticePage.tsx` ("Gần đây" link) | no | not yet in diff (plan M5.5 will change it) |
| `LR/settings/SettingsPage.tsx` | no | no |
| `W/app-shell/session/test-support.ts`, `W/app-ui/test-utils.tsx`, `e2e/support/mock-api.ts` | no | no |
| `apps/web/messages/vi.json`, `en.json` | **yes** (hunks at about lines 330, 855–1030 of vi: chrome search block and App.lookup/word areas) | **yes** (4 lines: new `stepper` block at about line 346) |
| `apps/web/e2e/app/m4.spec.ts` | no | no |

- m4's message hunks sit in `App.chrome.search` (:330) and the Tra từ/word areas; M6's edits are in `App.chrome.menu` (:336-340, 6 lines from m4's hunk at :330 — adjacent, so a textual conflict is possible), `App.today` (:681), `App.practice.recent` (:1212), `App.practice.session.report` (:1391) and `App.practice.history/reports` (:1458-1531). Expect a trivial merge at the `chrome.menu` end if both edit that object.
- m5a's diff is against an older base (multiple merge bases) and only adds `ui/AnswerOption`, `KeyLegend`, `ProgressBar`, `Stepper`, API answers/session-views, docs. No M6 file overlap. But **M5a/M5b rebuild the session screens that need the session-bar calendar button** (`95:344`), so M6's session-bar part depends on M5 landing first (roadmap order is M5 before M6, plan line 69 vs M5 rows).

### 9.2 Test infrastructure M6 must extend
- `W/app-ui/test-utils.tsx:33-39` defaults `GET /v1/me`, `POST /v1/auth/refresh`, `GET /v1/practice/sessions/last` (204). Add `GET /v1/me/streak` default there (e.g. `{ days: 0, studied_today: false }`) the same way, or every test using `chrome: true` (`layouts.test.tsx`, `backlog.test.tsx` ×4, `group-list.test.tsx` ×20, `group-page.test.tsx` ×27, `topic-picker.test.tsx` ×11, `today.test.tsx` ×16) throws `unscripted request`.
- e2e: `apps/web/e2e/support/mock-api.ts:142` is the default-routes list (has `sessions/last` 204); unscripted → 404 problem (`:90`). Add `GET /v1/me/streak` there; the button will not crash on 404 only if the query is non-throwing/`retry` is limited (design for the button's error state UNVERIFIED).
- `renderApp({ chrome: true })` wraps `AddWordProvider > AppChrome` only (`test-utils.tsx:47`); the `(member)` layout (where the dialog host should live) is not part of it. A test of the dialog host needs `MemberLayout`-like wrapping (note `(member)/layout.app.tsx` is an async server component using `headers()`, so it cannot be rendered in jsdom as is; put the host in a client component and render that).

## 10. Surprises / risks for the planner

- **R1. Everything in the design's "Học / Ôn / Hôm nay" wording of "two links 'Xem lịch sử' at Hôm nay" is actually one link at Hôm nay** (`TodayPage.tsx:198`) plus one at Luyện tập "Gần đây" (`PracticePage.tsx:257`), plus AvatarMenu's reports link. The Luyện tập link keeps pointing to `/app/practice/history` after M5.5 (plan :1867), so M6 must retarget it (the redirect page of §10.4 alone would also work but costs a hop).
- **R2. `weak-history.test.tsx` mixes Weak-words and History tests**; removing `HistoryPage` means editing the file, not deleting it. `m4.spec.ts` (:252-261, :285-286) and `shots.spec.ts` (:393-394) also visit the page; the redirect page makes them follow a redirect to a URL with `?lich`.
- **R3. Month response cannot tell "studied" from "has any count"**; Figma may mark study days differently from activity days. `study_days` is only a total. Decide from Figma frames `102:3278`/`102:3948` before the plan fixes the cell logic. Also no per-day known/again in the month view (only in the day view).
- **R4. Ngày dialog needs two calls and a join**: calendar day (items + `practice_sessions[]` with ids and counts only) plus `GET /v1/practice/history?date=` (no `session_id` filter, max `page_size` 100, newest first). To show questions per session the web must group history items by `session_id`, and a day with more than 100 answers needs paging across sessions. Group names for `items[].group_id` need `GET /v1/groups`.
- **R5. Streak cache can go stale**: answers carry `streak` only on the first study of the day and without `studied_today`; writing the cache from three call sites (`use-practice-session.ts:280`, `use-review-queue.ts:63`, recall path) is easy to miss one. A tab left open across midnight (learner zone) shows yesterday's streak/today highlight until refetch (consider `staleTime`/refetchOnWindowFocus).
- **R6. No shared "today / current month in learner zone" helper**; three `localDay` copies with different argument order (`days.ts`, `house-ad-counter.ts`, `refill.ts`). `useFormat` has no month-year style. The M6 plan should add one shared helper (and tests at month boundaries and UTC+7 around 00:00–07:00) instead of a fourth copy.
- **R7. URL-driven dialogs are new infrastructure**: three history rules in design §5.6, `history.state` markers, `Suspense`, mocks of `useSearchParams` that do not follow `pushState`. `ui/Dialog` has no back-stack awareness; Esc-in-Ngày-goes-to-Lịch must be coded in the host. Next's `pushState` integration is UNVERIFIED here.
- **R8. Position of the button is spec'd by prose only on the phone**: stacked above the "+" on Hôm nay (`AddFab` is page-level, `bottom-24`), hidden on backlog/topic (route regexes needed: `/app/group/backlog`, `/app/topic`), `z-40` vs `FloatingBar` `z-30` / toast `z-60`. No existing mechanism for a layout-level FAB to know a page-level FAB exists; either move `AddFab` into the layout (changes which pages have it) or give the calendar button a CSS offset on Hôm nay only.
- **R9. `(focus)` layout has no provider/chrome**: the session-bar button must come from M5's session screen code, not the layout, unless the host is mounted in `(member)` (design says state lives there, so the button can call a context from `(member)`).
- **R10. Old `ReportDialog` copy and the `/app/settings/reports` page are part of M6** (design §9 M6): the new page is a rebuild of `MyReportsTab` (old `app-ui` imports), needs a Settings row beside `SettingsPage.tsx:160-167` (`Row`, flag `SHOW_TRANSACTIONS` at :30 is unrelated) and the AvatarMenu href change (:65); `chrome.test.tsx:70-74` and `weak-history` e2e assertions change with it.
- **R11. m4 integration**: m4 deletes `SearchStrip.tsx` and edits `chrome.test.tsx`, while the current `AppChrome.tsx` still imports `SearchStrip`; m4's diff list does not include `AppChrome.tsx` (UNVERIFIED whether it was already changed in a way I could not see; check when M6 branches off after m4 merges). Branch M6 from `refactor/giao-dien-moi` **after** PR #257 merges to avoid conflicts in `TopBar`/`Dialog`/messages.
- **Not verified in this survey:** Figma frames (not opened); behaviour of the three endpoints at runtime (read code only, not run); `en.json` line numbers; whether anything invalidates `['practice','history',…]`; the exact content of `calendar.schemas.spec.ts` / `streak.controller.spec.ts`.
