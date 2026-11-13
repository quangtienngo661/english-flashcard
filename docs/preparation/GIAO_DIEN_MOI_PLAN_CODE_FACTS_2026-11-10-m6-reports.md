# Giao diện mới M6, "Báo lỗi của tôi" (`/app/settings/reports`): code facts (10/11/2026)

Source: `origin/refactor/giao-dien-moi` (tip `f415b383`), read with `git show` / `git grep`. Read-only survey. Line numbers are on that branch. Overlap section (§9) also reads `origin/feat/giao-dien-moi-m4` (`31cc035a`) and `origin/feat/giao-dien-moi-m5a` (`590ef3d7`).
Shorthands: `APP` = `apps/web/src/app/[locale]/app/(member)/(chrome)`, `PR` = `apps/web/src/features/learner/practice`, `ST` = `apps/web/src/features/learner/settings`, `TX` = `apps/web/src/features/learner/transactions`, `CH` = `apps/web/src/app-chrome`, `MSG` = `apps/web/messages`.
Design = `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` (§9 M6 at lines 606-620, §10.4 at 751-756, QR1 at 69). Plan = `docs/superpowers/plans/2026-11-10-giao-dien-moi.md`.

## 0. Big picture

- M6 part for reports = four small moves: (a) new page `APP/settings/reports/page.app.tsx` rebuilt from `PR/MyReportsTab.tsx`; (b) a row "Báo lỗi của tôi" in Settings and an AvatarMenu link repoint; (c) `report.done` copy change; (d) `/app/practice/history?tab=reports` redirect (server page, shared with the Lịch redirect of §10.4).
- **Everything involved today is old UI** (`@/app-ui/*`, old tokens `bg-surface`, `rounded-card`, `text-caption`): `MyReportsTab`, `HistoryPage`, `SettingsPage`, `TransactionsPage`. Only `CH/*` (AvatarMenu, BackLink, PageTitle, PageColumns) and `@/ui/*` are new. `ui/States.tsx` (new-look EmptyState/ErrorState) exists **only on `feat/giao-dien-moi-m4`** (`apps/web/src/ui/States.tsx:9-29`), not on the base branch.
- **The list API returns no lemma and no question type** (§1.3). Figma wants "từ · lý do" and "kiểu câu" per row; today's tab gets the lemma by one extra `GET /v1/senses/{id}` per row and has no question type at all. QR2 (design §10.5) lists four API additions and none is for reports.
- **TransactionsPage does not group by month** (§3). "Chia theo tháng" in the design is new work; no month-heading format exists in `app-shell/format.ts`.
- **Route and gating are already right:** a new file under `APP/settings/reports/` is in route group `(chrome)` (chrome + `AddWordProvider`), `currentTab()` returns `null` for `/app/settings/*` (no tab highlighted = "Tab=Không"), and `chromeShape` returns `'chrome'` (§7).

## 1. `MyReportsTab` and its API

### 1.1 Component (`PR/MyReportsTab.tsx`, 103 lines)
- `'use client'`; exported `MyReportsTab()` (line 23); single consumer: `PR/HistoryPage.tsx:19,58` (`TabPanel id="reports"`). No props. i18n namespace `App.practice.reports`.
- Query (29-35): `useInfiniteQuery({ queryKey: ['practice','my-reports'], queryFn: api.get('/v1/practice/reports?page_size=20[&page_token=<encoded>]'), initialPageParam: '', getNextPageParam: last.next_page_token ?? undefined })`. Page size 20 hard-coded in the URL string. `api = useApi()` from `@/app-shell/session/session-context`.
- States: pending → `FullScreenSpinner` (36); error → `ErrorState message={useErrorMessage()(error)} onRetry={refetch}` (37); empty → `EmptyState title=emptyTitle body=emptyBody action=<Link href=/${locale}/app/practice>toPractice</Link>` (39-51); all three from `@/app-ui/States`.
- List (52-85): `<section rounded-card border bg-surface p-5>`; header row `aria-hidden hidden md:grid grid-cols-12` with cols `word`(2) `reason`(5) `date`(2) `status`(3) (54-59); `<ul divide-y>` of `<li key=r.id>`; each row:
  - `ReportWord senseId` (63, def 89-103): `useQuery(['sense', senseId], GET /v1/senses/{id}, staleTime Infinity, retry: not on 404 and < 2)`; shows `sense.data?.lemma`, or `t('unknownWord')` ("—") on error, or empty while loading.
  - date: `format.date(r.created_at, 'dayMonth')` (65) ("18/10", en "Oct 18"; learner zone via `useFormat`).
  - reason: `r.reason_label` (67).
  - status chip: `STATUS_TONE` map (15-20: open `bg-primary-soft`, fixed `bg-success-soft`, no_error `bg-neutral-soft`, confirmed `bg-accent-soft`) with `t('status.<status>')` (69).
  - refund line only when `status === 'confirmed'` (70-74): `refunded === true` → `refunded` (success colour), `null` → `refunding`, `false` → `notRefundable`.
- Paging (79-83): `list.hasNextPage` → `Button variant="quiet" isPending={isFetchingNextPage} onPress={fetchNextPage}` labelled `t('more')`.
- No question type, no note, no resolved date is rendered even though `resolved_at` is in the type.

### 1.2 Type and client (`PR/practice-api.ts:166-176`)
`MyReport = { id; item_id; sense_id; reason_label; status: 'open'|'no_error'|'fixed'|'confirmed'; refunded: boolean|null; created_at; resolved_at: string|null }`. No dedicated hook; the fetch is inline in the component (no `useMyReports`). Doc comment says D27 Bước 7.

### 1.3 API (`apps/api/src/practice/reports/`)
- `reports.controller.ts:41-51`: `@Controller('practice/reports') MyReportsController`, `@Get()` → `ReportsService.listMine(learner.userId, { pageSize, pageToken })`; query `page_size` 1..100 default 20, `page_token` (19-21).
- `reports.service.ts:41-46` `myReportView`: `{ id, item_id, sense_id, reason_label, status, refunded, created_at, resolved_at }` (ISO strings). **No `lemma`, no `question_type`/`kind`, no `note`, no `reason` code.**
- `listMine` (147-171): rows `where userId`, `orderBy createdAt desc, id asc`, `take pageSize+1`, token bound to `route: 'practice-my-reports'` + userId; response `{ items, next_page_token|null }`.
- The data for "kiểu câu" exists in the DB: `PracticeReport.questionSnapshot` (JSON, `type` first key via `buildSnapshot`, `snapshot.ts:39-40`) and `questionSource` (`'rule'|'ai'`) at `apps/api/prisma/models/practice.prisma:123,133`; `myReportView` does not expose them. `itemId` is nullable (cleanup sets null, `practice.prisma:121`).
- `refunded` semantics: `true` refunded, `null` none tried yet, `false` tried and not refundable (service comment line 42; web labels at §1.1).
- Report creation (`POST /v1/practice/items/:id/report`, 201, `reports.controller.ts:29-38`) is untouched by M6.

### 1.4 Tests of the tab (only in `PR/weak-history.test.tsx`)
- Fixture `REPORTS` (108-117): three rows `r1` open/null `s-deploy`, `r2` confirmed/true `s-cache`, `r3` confirmed/false `s-gone`; route `'GET /v1/practice/reports?page_size=20'` (118); `'GET /v1/senses/s-gone'` → 404 (121).
- `K/82` (187-200): tab selected via `search = { tab: 'reports' }`; asserts reason text, lemma `deploy`, chip texts `Đang xem`, `Đã xác nhận lỗi`, `Đã trả lại 1 lượt câu AI`, `Lượt câu AI này không trả lại được`, and `—` for the 404 sense. `K/83` (202-206): empty → `Bạn chưa báo lỗi câu nào.`. `switching tabs` (208-): clicks tab `Báo lỗi của tôi`.
- All three render `<HistoryPage />`, not `<MyReportsTab />`; they die with HistoryPage (design §10.4 deletes it). They are the closest test model for the new page. No error-state or "Xem thêm" test exists for reports.
- e2e: `apps/web/e2e/app/m4.spec.ts:253-262` "history and my reports": opens `/vi/app/practice/history`, clicks tab `vi.history.tabs.reports`, expects `vi.reports.refunded` and `deploy`, reloads and expects the tab still selected (`?tab=reports` via `replaceState`). Mock route `'GET /v1/practice/reports'` at 139. Screenshot sweep `m4.spec.ts:285-286` has `practice/history` and `practice/history?tab=reports` entries (ready = text `Câu sai ngữ pháp hoặc không tự nhiên`). `apps/web/e2e-shots/shots.spec.ts:393-394` lists the same two paths.

### 1.5 Messages
`App.practice.reports` (`MSG/vi.json:1510-1531`, en `1510-1531`): `cols.{word:Từ, reason:Lý do, date:Ngày gửi, status:Kết quả}`, `status.{open:Đang xem, fixed:Đã sửa, no_error:Không có lỗi, confirmed:Đã xác nhận lỗi}`, `refunded` "Đã trả lại 1 lượt câu AI", `refunding` "Đang trả lại 1 lượt câu AI", `notRefundable` "Lượt câu AI này không trả lại được", `emptyTitle` "Bạn chưa báo lỗi câu nào.", `emptyBody` "Gặp câu sai khi luyện tập, bấm Báo lỗi ngay trên câu đó. Kết quả hiện ở đây.", `toPractice` "Về Luyện tập", `unknownWord` "—", `more` "Xem thêm". en: Word/Reason/Sent/Outcome; Under review/Fixed/No error found/Error confirmed; "1 AI credit returned", "Returning 1 AI credit", "This AI credit can't be returned"; "You haven't reported any questions."; "Show more".
Related keys: `App.practice.history.tabs.reports` "Báo lỗi của tôi" (vi 1463), `App.practice.types.*` (labels of question types, used by HistoryPage `tp('types.<type>')` at `HistoryPage.tsx:174-178`; usable for "kiểu câu" if the API ever returns the type).
`messages.test.ts:1-40`: vi/en key parity and no empty values; numeric placeholders must be `{count, number}`; any new key must exist in both files.

## 2. Settings page today

- Route: `APP/settings/page.app.tsx` (6 lines): renders `<SettingsPage />` (no `Suspense`). Siblings: `settings/account/page.app.tsx`, `settings/delete-account/page.app.tsx` (wrapped in `<Suspense>`), `settings/transactions/page.app.tsx`. Group `(chrome)`; no `loading`/`error` file per settings route, so the group-wide `APP/loading.app.tsx:8-19` (neutral skeleton, `role="status"`, sr-only `App.common.loading`) and `APP/error.app.tsx:7-9` (`ErrorView retry`) apply.
- `ST/SettingsPage.tsx` (275 lines) is **old UI** (`@/app-ui/{Button,Dialog,Segmented,Switch,Toast}`, old tokens) with new `CH/{BackLink,PageTitle}` and `displayName` from `CH/AvatarMenu`. M7 rebuilds it (design §9 M7; table lists `/app/settings` as Figma `120:4295` / `120:4559`).
- Structure: `BackLink` to `/${locale}/app` (`tCommon('back')`) → `PageTitle` `App.settings.title` → `max-w-3xl` stack of local `Section`s (240-247, `<ul divide-y rounded-card border bg-surface>`): `personal` (name, birth date, email), `planUsage` (plan row link + `UsageRows`), `learning` (language, theme `Choice`), `notifications` (reminder `Switch`), `shortcuts` (md+ only), `account`.
- **Section "Tài khoản"** (160-198), in order: row `transactions` (161-167; `SHOW_TRANSACTIONS` const = `true`, line 30, also exported; `Row href=/${locale}/app/settings/transactions`, `title=t('transactions')`, `action=<ChevronRight>`); row `logout` (md+ only); `signInMethods`; `setPassword` (Google-only accounts); `deleteAccount` (link, or text for staff). Then a phone-only full-width logout button (200-202).
- `Row` (249-275): with `href` the whole `<li><Link …min-h-control-touch…>` is the link (title + optional detail + `action`); without, a plain `<li>`.
- **To add the row:** a new `Row` right after the `transactions` row (design: "cạnh Lịch sử giao dịch"): `title={t('reports')}`, `href={/${locale}/app/settings/reports}`, `action=<ChevronRight …/>`, plus new key `App.settings.reports` in vi+en. `SHOW_TRANSACTIONS` is not a model (always true); no flag needed for reports. Design: "Nếu M7 chưa làm lại Cài đặt thì thêm dòng vào trang Cài đặt cũ" (design line 613).
- Tests `ST/settings.test.tsx` (`describe 'SettingsPage (K/50)'` 67-): `:148` "Lịch sử giao dịch opens its page" asserts `findByRole('link', { name: /Lịch sử giao dịch/ })` `href` `/vi/app/settings/transactions`; `:154` whole-row link. Nothing pins the full row list of the Tài khoản section, so adding a row breaks no existing assertion. Messages: `App.settings.transactions` = "Lịch sử giao dịch" (vi `518`, en `518` "Transaction history").
- e2e touching Settings: `b8-set-password.spec.ts:22-23`, `m1.spec.ts:90-116,126` (`MEMBER_PAGES` includes `settings`), `m4b.spec.ts:43-45` (Settings → click link `App.settings.transactions` → URL `/vi/app/settings/transactions`), `overflow.spec.ts:15` (paths `''`, `/settings`, `/settings/account`, long names, no sideways scroll).

## 3. Transactions page (`/app/settings/transactions`), the model for the new page

- Route `APP/settings/transactions/page.app.tsx` → `<TransactionsPage />` (`TX/TransactionsPage.tsx`, 108 lines). **Old UI** (`@/app-ui/{Button,States}`, `rounded-card`, `shadow-ledge-accent`). Files in `TX/`: `TransactionsPage.tsx`, `TransactionRow.tsx`, `TransactionDetail.tsx`, `transactions-api.ts`, `transactions.test.tsx`.
- Data hook `useTransactions()` (`transactions-api.ts:30-42`): `useInfiniteQuery(['me','transactions'], GET /v1/me/transactions?page_size=20[&page_token=], getNextPageParam next_page_token)`. Same pattern as the reports query (the reports one is inline).
- Layout (64-73): `<BackLink href=/${locale}/app/settings label=t('back')/>` (key `App.transactions.back`) → `PageColumns aside={<TransactionsAside/>}` → `PageTitle` → content. Aside = plan card + "about" card (web only); reports needs no aside (Figma frames show none, UNVERIFIED, Figma not read).
- State handling (28-62): pending → `FullScreenSpinner`; error → inline `role="alert"` card with title/body/`Thử lại` (`errorTitle`, `errorBody`, `retry`; not `ErrorState`); empty → `EmptyState`; else a `<section rounded-card …>` with `hidden md:grid grid-cols-7` header, `<ul divide-y>` of rows, "Xem thêm" quiet `Button isPending`, then foot text.
- **No month grouping:** the list is flat, newest first; dates are `format.date(…, 'full')` per row (`TransactionRow.tsx:42`). Rows are a `react-aria-components` `Button` (whole row opens a detail dialog); two layouts drawn `aria-hidden` (phone 3 stacked lines `54-61`, md+ 7-col grid `62-73`) with one `aria-label` (`rowLabel`) for screen readers (46,50).
- `StatusChip` (`TransactionRow.tsx:10-20`) = coloured pill per status; the reports page needs a similar chip, with a **dot** per the Figma note (design line 617: "trạng thái có chấm màu").
- Tests (`transactions.test.tsx`, `describe` at 54 and 76): rows, aside, detail dialog, pagination via `next_page_token` (121), empty (134), error + retry (140), English (154).
- Back link component: `CH/BackLink.tsx` (`Link` with `TEXT_BUTTON_BASE`, `ArrowLeft`, truncating label, `mb-3`). `SettingsPage`, `AccountPage:30`, `TransactionsPage` all use it with href `/${locale}/app/settings`.
- Dates/months: `app-shell/format.ts:8` `DateStyle = 'weekdayDayMonth' | 'dayMonth' | 'full'` (M4 branch adds `'numeric'`, §9). **No "month + year" style.** A month heading needs a new `DateStyle` (and a test) or a local `Intl.DateTimeFormat` in the learner zone; grouping by month must use `useFormat`'s zone (`state.me.timezone`), not the device's (format.ts comment line 41).

## 4. `CH/AvatarMenu.tsx`

- 82 lines; `react-aria-components` `MenuTrigger/Popover/Menu/MenuItem/Separator`; i18n `App.chrome`. Items in order (lines 53-77):
  1. `href /${locale}/app/settings/account` · `UserRound` · `t('menu.account')`
  2. `href /${locale}/app/settings` · `Settings` · `t('settings')`
  3. `href /${locale}/app/settings/transactions` · `ReceiptText` · `t('menu.transactions')`
  4. **`href /${locale}/app/practice/history?tab=reports`** (line 65) · `Flag` · `t('menu.reports')` ("Báo lỗi của tôi", en "My reports"; `MSG/vi.json:336-340`)
  5. `onAction` theme toggle (`Moon`/`Sun`; `themeToDark`/`themeToLight`) — no href
  6. Separator, `onAction` logout · `LogOut` · `t('logout')`
- The report item **already exists**, with the Flag icon and the key. M6 change = one string: line 65 href → `` `/${locale}/app/settings/reports` ``; the doc comment lines 20-24 ("until M6 adds /app/settings/reports (ruling R6)") should be updated. No new import, no new key.
- Used by `TopBar.tsx:9,60` and `PhoneHeader.tsx:6,26`; `displayName` also imported by `ST/SettingsPage.tsx:9`.
- Test pinning the list: `CH/chrome.test.tsx:68-77` expects `menuitem` texts `['Tài khoản','Cài đặt','Lịch sử giao dịch','Báo lỗi của tôi','Chuyển sang giao diện tối','Đăng xuất']`. It pins labels and order only; **no assertion on any `href` in AvatarMenu**, so repointing the link breaks no existing test, and nothing guards the new href (add an `href` assertion for the "Báo lỗi của tôi" item).

## 5. Report confirmation copy

- Key `App.practice.session.report.done`: vi `MSG/vi.json:1391` = "Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo lỗi của tôi."; en `MSG/en.json:1391` = "Report sent. See the outcome in History → My reports." Target (design line 614): "Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi." (en suggestion: "Report sent. See the outcome in Settings → My reports.", UNVERIFIED wording, not in design).
- The only code user: `PR/session/ReportDialog.tsx:71` `showToast(t('done'), 'success')` (a toast, not inline text), with `useTranslations('App.practice.session.report')` at line 43. `ReportDialog` component at `ReportDialog.tsx:31` (props `itemId, kind, privateWord, lemma, subtitle, isOpen, onClose, onSent`); single consumer `PracticeSession.tsx:24,187`.
- Tests that pin the text: `PR/session/practice-session.test.tsx:504` (`findByText('Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo l…')`, line is cut at 210 chars in the grep; read the whole line before editing); `apps/web/e2e/app/m4.spec.ts:162` uses `vi.session.report.done` (reads the JSON, follows the change automatically); `m5a.spec.ts:162-167` opens/sends the dialog (check whether it asserts the toast). `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md:170` quotes the old step (docs, optional).
- Plan Part 5 constraint (`plan:1700`): "The report confirmation keeps today's text until M6 builds `/app/settings/reports`. M6 changes it (QR1)." So M5 must not touch this key; M6 owns the change (vi+en JSON + `practice-session.test.tsx:504`).
- `origin/feat/giao-dien-moi-m5a` does **not** change `ReportDialog.tsx` or the `done` key (§9). The plan's M5.4 rebuilds the report dialog (plan:2005), which would be on a later M5 branch; M6 planner should state the order (M6 edits the JSON key only; a rebuilt dialog keeps `t('done')`).

## 6. Redirect `/app/practice/history?tab=reports` → `/app/settings/reports`

- Today `APP/practice/history/page.app.tsx` (11 lines): server component (no `'use client'`), renders `<Suspense><HistoryPage/></Suspense>`; `HistoryPage` (`PR/HistoryPage.tsx`) is a client component reading `useSearchParams().get('tab')` (31) and writing `?tab=reports` by `window.history.replaceState` (36). Comment: "the tab is in the query (design §4.1)".
- **No `redirect(` / `permanentRedirect` / `notFound(` exists anywhere under `apps/web/src/app/[locale]/app`**; no `searchParams` prop is used in any app page (`git grep searchParams -- apps/web/src/app` → none). `next.config.ts:25-41` has no `redirects()`. The only server redirects are in `src/proxy.ts` (`learnerAppRedirect`, locale redirects; 307 with `Cache-Control: no-store`).
- Client-side redirects use `hardReplace(path)` from `@/app-shell/navigate` (`navigate.ts:8`; comment: on the Worker build `router.replace` called right after load was sometimes dropped). `RequireSession` also uses it for the login `?next=`.
- Design §10.4 says the page becomes a **server page that only redirects, keeping locale**: `/{locale}/app/practice?ngay=<date>` when `?date=`, `/{locale}/app/practice?lich` otherwise, and `?tab=reports` → `/{locale}/app/settings/reports`. It needs the `[locale]` param and `searchParams` (both Promises in Next 16; async server component, `redirect()` from `next/navigation`). Reading `searchParams` makes the route dynamic: fine on the OpenNext Worker build, but UNVERIFIED on this repo's build (no existing dynamic app page to copy; `cf:build` is only runnable via `pnpm cf:docker` on Windows).
- The redirect page sits **inside** `(member)/(chrome)`, so `RequireSession` + `AppChrome` wrap it; a server `redirect()` runs before the client tree renders, so there is no flash and no session needed for the redirect itself.
- Gating by `NEXT_PUBLIC_LEARNER_APP`: `learner-app-flag.ts:2-17`. With the flag off, `pageExtensions` excludes `app.tsx` (D21), so `page.app.tsx` files do not exist as routes, and `proxy.ts:14-22` 307-redirects every `/{locale}/app/**` to `/{locale}` (query dropped) before any page. The new `page.app.tsx` files need no extra gating.
- Entry points that will point at the old history URL (the redirect covers them, but they also should be repointed): `CH/AvatarMenu.tsx:65` (M6, this survey), `PR/PracticePage.tsx:257` (history link, belongs to M5/M6 calendar work), `features/learner/today/TodayPage.tsx:198` + pin `today.test.tsx:81` (`href '/vi/app/practice/history'`; design line 569/606 changes it to a Lịch dialog opener in M6).
- Tests needed: none exist for a server redirect page. A unit test would call the page function with `{ params, searchParams }` and mock `next/navigation` `redirect`; e2e (`m4.spec.ts:253-262` "history and my reports") must be rewritten to open `/vi/app/practice/history?tab=reports` and expect URL `/vi/app/settings/reports`.

## 7. Route conventions

- File suffix: `page.app.tsx`, `layout.app.tsx`, `loading.app.tsx`, `error.app.tsx` (D21; `learner-app-flag.ts:13-17`). New route = `APP/settings/reports/page.app.tsx` with `import { … } from '@/features/learner/…'` and a one-line comment citing the design item (siblings do: `// K/95–K/95d, M/95–M/95c.`).
- Layout chain for the new page: `app/layout.app.tsx` → `(member)/layout.app.tsx:11-21` (`RequireSession`, `HouseAd`, `AdsenseLoader`) → `(chrome)/layout.app.tsx:9-15` (`AddWordProvider > AppChrome`). Page must be a client-free server file or a thin wrapper around a `'use client'` component (siblings do the latter).
- `(chrome)/loading.app.tsx:8-19` and `(chrome)/error.app.tsx:7-9` apply to any page in the group with no own file; per-route `loading.app.tsx` exist only for `(today)`, `group`, `group/backlog` (M3) and (on the M4 branch) `lookup`, `word`. Design §5.5 asks for route-specific loading only for those; Settings pages use the generic one. A reports `loading.app.tsx` is optional.
- `chromeShape(pathname)` (`app-shell/skeleton-shape.ts:2-7`): `BARE` regex lists `practice/session|review|recall|complete-profile|welcome|login|register|verify-email|forgot-password|reset-password|google/complete|account-deleted`; everything else is `'chrome'`. `/vi/app/settings/reports` → `'chrome'` with **no edit**. Its test `skeleton-shape.test.ts:5-19` includes `/vi/app/settings/account` → chrome; optional to add `/vi/app/settings/reports`.
- Tab: `app-chrome/nav.ts:6-17` `TABS[].owns` regexes cover `/app`, `/app/(groups|group|topic|review)`, `/app/practice`, `/app/(lookup|word)`; `/app/settings/*` matches none → `currentTab` = `null` (no highlighted tab). `chrome.test.tsx:48` pins `/vi/app/settings` → `[]`.
- Back link: `BackLink` to `/${locale}/app/settings` (as `TransactionsPage`, `AccountPage`). Title: `PageTitle` inside the content (h1 with highlighter). Width: `AppChrome` main is `max-w-290`; `PageColumns` only matters with an `aside`.
- `RequireSession` (`app-shell/RequireSession.tsx:58`) shows `<SkeletonPage shape={chromeShape(pathname)}/>` until signed in; a page component can still guard with `state.status !== 'signed-in'` → `null` as TransactionsPage does (24).
- e2e: every new `/vi/app/...` page should be added where relevant to `overflow.spec.ts` (long names) and use `signedInAs(page, plan, routes)` from `e2e/support/mock-api` (routes keyed `'GET /v1/practice/reports'`).

## 8. e2e specs that open the reports tab or Settings (summary)

| Spec | What it asserts | M6 impact |
|---|---|---|
| `e2e/app/m4.spec.ts:253-262` | `/vi/app/practice/history` → click tab `vi.history.tabs.reports` → `vi.reports.refunded` and `deploy` visible → reload keeps tab | Rewrite: open `/vi/app/settings/reports`; refund line + lemma; no tab |
| `m4.spec.ts:285-286` | screenshot sweep of `practice/history` and `practice/history?tab=reports` (ready text `Câu sai ngữ pháp hoặc không tự nhiên`) | Replace reports entry with `settings/reports`; history entry is gone/redirect |
| `m4.spec.ts:128-139` | mock routes `GET /v1/practice/history`, `/reports`, `/v1/senses/{id}` in `practiceApi()` | `reports` and `senses` mocks reused; `history` mock may stay |
| `m4.spec.ts:158-162` | report dialog → `vi.session.report.done` visible (toast) | follows JSON change; no edit |
| `m5a.spec.ts:162-167` | opens/sends the report dialog (does not assert `done` in the grep) | none expected (UNVERIFIED, read before M6) |
| `e2e-shots/shots.spec.ts:393-394` | shot paths `practice/history`, `practice/history?tab=reports` | update paths |
| `m4b.spec.ts:43-45,58-68` | Settings → transactions link → URL; transactions page in both locales | none; model for a Settings → reports journey |
| `m1.spec.ts:90-126`, `overflow.spec.ts:15`, `b8-set-password.spec.ts:22` | Settings loads, no sideways scroll, set-password link | none; consider adding `/settings/reports` to `overflow.spec.ts:15` |

## 9. Overlap with open branches

- **`origin/feat/giao-dien-moi-m4`** (PR #257; `git diff --stat origin/refactor/giao-dien-moi...` = 70 files) touches **none** of: `CH/AvatarMenu.tsx`, `ST/*`, `TX/*`, `PR/MyReportsTab.tsx`, `PR/HistoryPage.tsx`, `ReportDialog.tsx`. It touches:
  - `MSG/vi.json` + `MSG/en.json` (63 lines each; hunks around lines 327 (`App.chrome.search` trimmed to `placeholder` only — directly above `App.chrome.menu`, 336-340), 852-1027 (`App.lookup`, word)); **no** change to `menu`, `settings`, `practice.reports`, `session.report.done`. Merge risk for M6: JSON hunks are adjacent to `chrome.menu` but M6 does not edit `menu`; still, rebase M6 after M4.
  - `CH/chrome.test.tsx` (-25 lines: removes the `SearchStrip` test and its imports); the AvatarMenu tests at 68-93 are untouched, but this file is the one M6 may edit (add an href assertion) — same file, different hunk.
  - `CH/TopBar.tsx` (+/-16), deletes `CH/SearchStrip.tsx`, adds `CH/TopSearch.tsx`.
  - `apps/web/src/ui/States.tsx` (new, +29): `EmptyState({title, body, action})` and `ErrorState({message, onRetry})` in wm tokens. **Available to the reports page only if M6 is stacked on/after M4**; on the base branch use `@/app-ui/States` (old look) or build local markup.
  - `app-shell/format.ts`: adds `DateStyle` `'numeric'` (`dd/mm/yyyy`; en "Nov 5, 2026"). Same file M6 may touch for a month-heading style (adjacent lines in `DATE_OPTIONS`; likely textual conflict).
  - `e2e/app/overflow.spec.ts` (+20, appends a Tra từ test after line 101) — M6 edit of `overflow.spec.ts:15` is a different hunk. `e2e/app/{cai-thien-a-group,m3,m5b}.spec.ts` are unrelated to reports.
  - `ui/Dialog.tsx`, `ui/Toast.tsx` (+/-) touched: `showToast` used by `ReportDialog` (call signature unchanged, UNVERIFIED; read the M4 diff of `ui/Toast.tsx` before relying on it).
- **`origin/feat/giao-dien-moi-m5a`** (merge-base with the base is `2cb4b0ba`, **53 commits behind** the base tip; own commits since: 5, of which 2 are code). Its own diff (`git diff 2cb4b0ba origin/feat/giao-dien-moi-m5a -- apps/web/src apps/web/messages`) = 4 new `ui/*` files (`AnswerOption`, `KeyLegend`, `ProgressBar`, `Stepper`) + `practice-kit.test.tsx` + `messages` `App.ui.stepper.{decrease,increase}` (4 lines each locale). It does **not** touch AvatarMenu, settings, transactions, MyReportsTab, HistoryPage, ReportDialog, nor `session.report.done`. (A plain two-dot `git diff origin/refactor/... origin/feat/...m5a` is misleading: it shows the 53 base-only commits as deletions.) The M5 plan (plan:2005) says the report dialog and current-session card are rebuilt in M5.4/M5.5, which are **not yet on this branch**; UNVERIFIED whether they will change `ReportDialog` props or the `report.done` namespace.

## Surprises / risks for the planner

1. **API gap:** `GET /v1/practice/reports` rows have no `lemma` and no question type (`reports.service.ts:43-46`). Figma "từ · lý do, kiểu câu" needs either (a) keep the N+1 `GET /v1/senses/{id}` for the lemma and drop "kiểu câu", or (b) an API change (add `lemma`, `question_type` from `questionSnapshot.type`; not in QR2's four additions, §10.5). Needs a decision before the plan; type and fixture updates in `practice-api.ts:166`, `weak-history.test.tsx:108`, `m4.spec.ts:139`.
2. **Month grouping is new work:** the "Lịch sử giao dịch" page it is "built from" is a flat list (`TransactionsPage.tsx:49-53`); there is no month `DateStyle` and `format.ts` is also edited on the M4 branch (`'numeric'`), so expect a merge conflict if both add a style.
3. **Redirect has no precedent:** no server `redirect()` or `searchParams` use in `apps/web/src/app`; the history page must become async server code reading `params` + `searchParams` (Next 16 Promises), and it must share logic with the Lịch redirect (`?date=` → `?ngay=`, none → `?lich`). Dynamic-render behaviour on the OpenNext Worker is UNVERIFIED here. The old redirect-on-client helper `hardReplace` is the only existing alternative.
4. **Old UI everywhere:** the new page needs `@/ui/*` pieces (chip with dot, EmptyState/ErrorState) that exist only partly; `ui/States.tsx` lives on the M4 branch. The plan must say whether M6 builds on M4 (then use `@/ui/States`) or ships old `@/app-ui/States` until M7.
5. **Test debt on delete:** the three reports tests live inside `weak-history.test.tsx` (`K/82`, `K/83`, tab switch) and die with `HistoryPage`; `practice-session.test.tsx:504` and `m4.spec.ts:253-262,285-286` + `e2e-shots/shots.spec.ts:393-394` must change in the same PR. No test pins AvatarMenu hrefs, so the repoint (`AvatarMenu.tsx:65`) has no guard unless one is added.
