# Admin client code facts for the "Đợt giao diện admin" plan (27/10/2026)

Source: `origin/dev` at `5a60dce`, read with `git show` / `git grep` only. Paths are under `apps/admin/` unless they say otherwise.
Library facts are from `apps/admin/node_modules/react-router` (installed version printed: `8.4.0`).

## 1. App shell and routing

**`src/app/App.tsx`** (39 lines). Provider order (`App.tsx:25-37`): `LocaleProvider` > `QueryClientProvider` > `OfflineContext.Provider` >
`SessionProvider` > { `<BrowserRouter><AppRoutes/></BrowserRouter>` (`:29-31`), `<ToastRegion/>` (`:33`, outside the router) }.
`BrowserRouter` imported from `'react-router'` (`:3`). `main.tsx` wraps `<App/>` in `<StrictMode>`.

**`src/app/routes.tsx`** (56 lines). `export function AppRoutes()` (`:24`) returns JSX `<Routes>`:
```tsx
<Route path="login" .../> <Route path="forgot-password" .../> <Route path="change-password" .../>   // :27-29
<Route element={<RequireSession />}>                                                               // :30
  <Route element={<Shell />}>                                                                      // :31
    <Route index element={<Home />} />                                                             // :32, Home = Navigate to homePath (:18-22)
    <Route path="uploads" element={<UploadsPage />}><Route path="new" element={null}/><Route path=":id" element={null}/></Route>  // :34-37
    <Route path="publish-jobs" ...> same new/:id children                                          // :38-41
    <Route path="export" .../>  <Route path="sources" ...><Route path="new" element={null}/></Route> // :42-45
    <Route path="transactions" .../>  <Route path="staff" .../>                                    // :46-47
    {NAV.filter((e) => !e.available).map((e) => <Route key={e.path} path={e.path.slice(1)} element={<ComingSoonPage item={e} />} />)}  // :48-50
<Route path="*" element={<Navigate to="/" replace />} />                                           // :53
```
Child routes with `element={null}`: the list page reads the URL (`useParams`/`useMatch`) and opens a dialog/panel itself.

**`src/app/Shell.tsx`** (226 lines).
- Hooks all run before the early returns (`:121-128`: `useSession`, `useTranslations`, `useLocation`, `useOffline`, 3× `useState`, `useMemo`).
  A new `useBlocker` must go in that block, before `:130`.
- `:130` `if (state.status !== 'signed-in') return null;`
- `:132` the silent redirect: `if (!canAccess(pathname, me.permissions)) return <Navigate to={homePath(me.permissions)} replace />;`
- Page title: `:134` `const labelKey = navLabelKey(pathname);` rendered in `<h1 id="page-title" tabIndex={-1}>` (`:180-182`), `labelKey ? t(labelKey) : ''`.
  So the title comes only from the NAV entry matching the path prefix (`nav.ts:55-56,65-67`); a "no permission" view inside the sheet keeps
  the title for free if `:132` renders it in place of `<Outlet/>` (`:197`) instead of returning early.
- Layout: skip link (`:139-148`), sticky sidebar `aside` `shell:flex` (`:150-158`: Logo, `SidebarNav`, `SidebarFoot` = LanguageSwitch + AccountMenu),
  blue top bar below 64rem (`:161-170`), `<ShellSlotsContext.Provider value={slots}>` (`:172`) around `<main id="main">` (`:173-200`) which holds
  `<header>` with h1 and the actions slot `<div ref={setActions} className="... empty:hidden" />` (`:183`), the offline `Banner` (`:185-196`),
  `<Outlet/>` (`:197`), then the panel slot `<div ref={setPanel} />` (`:199`). Drawer = `ModalOverlay`/`Modal`/`Dialog` (`:204-223`).
- `SidebarNav` (`:16-56`) groups consecutive `visibleNav(permissions)` entries by `group`; heading text `t(\`navGroups.${group}\`)` (`:29`);
  each item is a `NavLink` with icon `NAV_ICONS[entry.path]` (`:32`, `:44`) and label `t(entry.labelKey)`.

**`src/app/shell-slots.tsx`** (20 lines) — the pattern to copy:
```tsx
export type ShellSlots = { actions: HTMLElement | null; panel: HTMLElement | null };
export const ShellSlotsContext = createContext<ShellSlots>({ actions: null, panel: null });
export function PageActions({ children }: { children: ReactNode }) {
  const { actions } = useContext(ShellSlotsContext);
  return actions ? createPortal(children, actions) : null;
}
export function usePanelSlot(): HTMLElement | null { return useContext(ShellSlotsContext).panel; }
```
(`:9-20`). Comment `:5-7` says portals were chosen *because* the app uses `<Routes>` (no data-router `handle`) — after the switch, `handle` +
`useMatches` becomes available but nothing requires it.

**`src/app/RequireSession.tsx`** (16 lines): `loading`/`unavailable` → `<SessionLoading/>` (`:10`); `signed-out` →
`<Navigate to="/login" replace state={{ from: pathname+search }} />` (`:11-13`); `change-password` → `<Navigate to="/change-password" replace />` (`:14`); else `<Outlet/>`.

**`src/app/nav.ts`** (67 lines).
- `NavGroup = 'overview' | 'content' | 'practice' | 'learners' | 'ai' | 'system'` (`:3`).
- `NavEntry = { group; path; labelKey; needs: Permission[]; available: boolean; plannedStep?: string; etaNote?: 'apiReady' | 'unconfirmed' }` (`:5-16`).
- `const ADMIN: Permission[] = ['roles.manage']` stands in for AI pages (`:18-19`). `NAV` = 17 entries (`:22-40`); available: `/uploads`, `/publish-jobs`,
  `/export`, `/sources`, `/transactions`, `/staff`. `/words`, `/senses` have `needs: []` (`:28-29`); `/reported`, `/irregular-forms` in `practice` (`:31-32`);
  `/ai/settings`, `/ai/costs`, `/ai/eval-sets` (`:36-38`).
- Exports: `visibleNav(perms)` (`:42`), `firstVisiblePath` (`:46`), `homePath` (`:51`, `/uploads` if allowed else first visible), `canAccess(pathname, perms)`
  (`:59-62`, unknown path → allowed), `navLabelKey(pathname)` (`:65`). Matching is `pathname === path || startsWith(path + '/')` (`:55-56`).

**`src/app/nav-icons.ts`**: `export const NAV_ICONS: Record<string, LucideIcon>` keyed by NAV `path` (`:23-41`), lucide-react imports (`:1-20`). A new
path without an entry renders no icon (`Shell.tsx:44` `{Icon && ...}`); no test enforces one per entry (not checked further).

**`src/features/coming-soon/ComingSoonPage.tsx`** (23 lines): `ComingSoonPage({ item }: { item: NavEntry })`; purpose text key
`comingSoon.purpose.${item.labelKey.replace('nav.', '')}` (`:9,19`); eta from `plannedStep`/`etaNote` (`:10-12`). Test `ComingSoonPage.test.tsx:34-41`
requires `comingSoon.purpose.<id>` in vi **and** en for every `available: false` entry.

## 2. Tests that render routes

- `src/features/staff/test-utils.tsx` `renderApp(path, routes, me = ME_ADMIN)` (`:29-50`): `IntlProvider(vi, timeZone Asia/Ho_Chi_Minh)` > `QueryClientProvider`
  (retry false) > `SessionProvider store` > `<MemoryRouter initialEntries={[path]}><AppRoutes/></MemoryRouter>` + `<ToastRegion/>` (`:41-44`).
  `ME_ADMIN.permissions` = `content.edit, content.import, content.publish, taxonomy.manage, roles.manage` (`:16`) — **no `settings.manage`, no
  `entitlements.grant`**; `TransactionsPage.test.tsx` passes its own `ADMIN`/`EDITOR` me.
- `renderApp` users (12 files): `app/routes.test.tsx`, `app/shell-slots.test.tsx`, `export/ExportPage.test.tsx`, `publish-jobs/PublishJobs.test.tsx`,
  `sources/SourcesPage.test.tsx`, `staff/CreateAccount.test.tsx`, `staff/StaffPage.test.tsx`, `transactions/TransactionsPage.test.tsx`,
  `uploads/BatchPanel.test.tsx`, `uploads/UploadForm.test.tsx`, `uploads/UploadsPage.test.tsx` (+ the util itself).
- `src/app/session-loading.test.tsx` `renderWith` (`:12-24`): same stack with `<MemoryRouter initialEntries={[path]}><AppRoutes/></MemoryRouter>` (`:17-19`).
- `src/features/account/test-utils.tsx` `renderAccount(element, { path, routes, state })` (`:19-38`): its own `<MemoryRouter><Routes><Route path=... element/>
  <Route path="*" element={<Where/>}/></Routes>` (`:28-33`); does not use `AppRoutes`/`Shell`. Used by Login/ForgotPassword/ChangePassword tests.
- `src/ui/ui.test.tsx` `wrap(ui, path)` = `IntlProvider(en)` + `<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>` (`:17-22`); no `Shell`.
- Who imports `AppRoutes`: only `App.tsx:8`, `staff/test-utils.tsx:6`, `session-loading.test.tsx:10` (git grep). Turning it into a route-object array
  breaks exactly those three call sites (JSX `<AppRoutes/>`).
- `routes.test.tsx` (`:12-25`): `/` → h1 `vi.nav.uploads`; loops `NAV.filter(!available)` and expects `vi.comingSoon.title` and h1 = nav label.
- `shell-slots.test.tsx` (`:9-23`): `PageActions` button sits in the `header` with the h1, inside `main`.
- `nav.test.ts` hard-codes `FIGMA_ORDER` (17 paths, `:8-26`), "available only for" 6 paths (`:32`), editor sees 12 / admin 17 (`:38,43`), AI needs
  `roles.manage` implicitly (`:71-72`). The 24-entry menu rewrites this file.
- Unit fetch double `auth/test-support.ts` `makeFetch(routes)` (`:36-58`): key `"METHOD /path?query"` **including the query string** (`:40,52`);
  an unscripted request throws (`:53`). `makeMe` default = editor perms (`:5-15`).

## 3. API layer

**`src/api/client.ts`** (46 lines):
```ts
export type ApiClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  postForm<T>(path: string, form: FormData, opts: { idempotencyKey: string }): Promise<T>;
  getBlob(path: string): Promise<Blob>;
};
```
(`:5-11`). **No `patch`, no `delete`**, and `put` takes no idempotency option. 204 → `undefined` (`:27`). Non-ok → `throw await toApiError(res)` (`:21`);
fetch rejection → `NetworkError` (`:18-19`). Components get it with **`useApi()`** from `src/auth/session-context.tsx:50-53` (`createApiClient({ send: store.send })`).

**`src/api/problem.ts`** (96 lines):
- `Problem = { type; slug; status; title; detail?; operation_id?; violations?: string[] }` (`:1-9`). **No `extensions`**: `toApiError` (`:70-90`) copies
  only those fields; any other body member is dropped.
- `ApiError(problem, retryAfterSeconds: number | null)` (`:11-19`); `NetworkError` (`:21-26`). `retryAfterSeconds` from the `retry-after` header (`:88-89`).
- `problemSlug(type)` = last path segment, `''` for `about:blank` (`:65-68`). `KNOWN_ERROR_SLUGS` (28 slugs, `:32-61`).
- `errorMessageKey(problem)`: known slug → `errors.<slug>`; 409 with empty slug → `errors.inProgress`; else `errors.generic` (`:92-96`).
- `problem.test.ts:57-63` checks every `errors.<slug>` (+ `generic`, `inProgress`, `noAccess`) exists in vi and en.
- API side: the filter spreads `extensions` at the **top level** of the body (`apps/api/src/common/problem-details/problem-details.filter.ts:42-43`,
  `...extensions`), e.g. `grant-not-allowed` carries `reason` as a top-level member (`grants.service.spec.ts:252-305`: `extensions: { reason: 'target-is-admin' | 'self-grant' | 'ai-limits-admin-only' | 'target-has-paid-subscription' }`).
  Violations are `"<path.joined>: <message>"` strings (`apps/api/src/ai/models/models.service.ts:70`, `operation-settings.service.ts:76`).

**`src/api/use-error-message.ts`**: `useErrorDetails(): (error) => { message; code: string | null }` (`:11-26`; `code` = `operation_id` only for the generic
text); NetworkError/TypeError → `t('offline.message')` (`:19-21`). `useErrorMessage()` = message only (`:28-31`). Key pattern `errors.<slug>`.

**`src/api/idempotency.ts`**: `useIdempotencyKey(fingerprint): { key; renew() }` (`:6-15`), new UUID when the fingerprint changes.

## 4. Shared hooks and the reference list page

**`features/content/useSubmitAction.ts`**: `useSubmitAction<T>(run: (key: string) => Promise<T>, fingerprint: string, onDone: (result: T) => void)` (`:18`)
returns `{ submit: () => Promise<void>, pending: boolean, error: ErrorDetails | null, canRetry: boolean, waitSeconds: number }` (`:57`).
Rules: re-entry ignored (`:33`); NetworkError → `canRetry` (`:43`); 429 → countdown (`:45`); `idempotency-key-abandoned` → renew (`:46`); 409 empty slug →
auto-resubmit after Retry-After or 2 s (`:47-48`). It sets `error` but does **not** expose `violations` or the raw ApiError (only `ErrorDetails`), so
"focus the field of each violation" cannot be built on its return value as-is.

**`features/jobs/usePollingStatus.ts`**: `usePollingStatus<T extends { status: JobStatus }>(key: unknown[], fetcher): UseQueryResult<T>` (`:17-24`), polls
every `POLL_INTERVAL_MS = 2000` (`:7`) until `isTerminal` (`succeeded|partial|failed`, `:11`); `useQueuedTooLong(status, createdAt, now)` (`:27`, 30 s).
`JobStatus` comes from `content/content-api`.

**`features/transactions/transactions-api.ts`**: `TransactionFilters = { email; kind: TransactionKind | ''; from; to }` (`:24`), `NO_FILTERS` (`:26`),
`ADMIN_ZONE = 'Asia/Ho_Chi_Minh'` (`:27`), `PAGE_SIZE = 50` (`:28`, private). Date conversion is inline in **`transactionsQuery(filters, pageToken?)`**
(`:38-47`): `from` → `${from}T00:00:00+07:00`, `to` → `${nextDay(to)}T00:00:00+07:00` (exclusive end; `nextDay` private, `:31-35`). No exported
date helper. `listTransactions(api, filters, pageToken?)` (`:49-51`).

**`features/transactions/TransactionsPage.tsx`** (201 lines):
- Filters: two `useState<TransactionFilters>` — `draft` (form) and `filters` (applied) (`:60-61`); `<form onSubmit={apply}>` sets `filters = draft` (`:109-112,117`).
- Query: `useInfiniteQuery({ queryKey: ['transactions', filters], queryFn: ({ pageParam }) => listTransactions(api, filters, pageParam), initialPageParam: undefined, getNextPageParam: (last) => last.next_page_token ?? undefined })` (`:64-69`); rows = flatten pages (`:70`).
- Pagination is **"Tải thêm" (load more)**, not "Trang sau": `list.hasNextPage && <Button variant="secondary" isPending={isFetchingNextPage} onPress={fetchNextPage}>{t('common.loadMore')}</Button>` + count footer (`:149-158`).
- DataList: `rows, rowKey, columns, state={isPending ? 'loading' : isError && rows.length === 0 ? 'error' : 'ready'}, emptyText, onRetry` (`:140-147`).
  Columns use `card: 'field' | 'action'` (`:86-107`). Detail = `Dialog size="md"` (`:160-198`).
- Formatting: local `useTransactionFormat()` with `Intl.DateTimeFormat(..., { timeZone: ADMIN_ZONE })` (`:29-53`), not `useDateTime`.
- **`useSearchParams` is not used anywhere in `apps/admin`** (git grep: 0 hits; also 0 for `useBlocker`, `useBeforeUnload`, `beforeunload`).

## 5. `src/ui/*`

| Component | Props (origin/dev) |
|---|---|
| `Badge` | `{ tone?: 'primary'|'neutral'|'success'|'warning'|'danger'; children }` (`Badge.tsx:3,17`) |
| `Banner` | `{ variant: 'info'|'error'|'offline'; children; action?: ReactNode; code?: string|null }` (`Banner.tsx:5,16-27`); error/offline = `role="alert"` |
| `Button` | `Omit<AriaButtonProps,'className'> & { variant?: 'primary'|'secondary'|'danger'|'ghost'; size?: 'md'|'touch'; className?: string }` (`Button.tsx:14-19`); own `isPending` handling (`:26-33`) |
| `Checkbox` | `{ isSelected: boolean; onChange: (v: boolean) => void; children; isDisabled? }` (`Checkbox.tsx:5`) — no `aria-label`/no-children form |
| `DataList<T>` | `{ rows; rowKey; columns: Column<T>[]; state: 'loading'|'error'|'ready'; emptyText?; emptyHint?; onRetry?; rowHref?: (row) => string; selectedKey?: string }` (`DataList.tsx:15-27`); `Column<T> = { key; header: string; cell; className?; card?: 'title'|'field'|'action' }` (`:5-13`) |
| `DetailPanel` | `{ isOpen; onClose; onExited?; focusKey: string; children }` (`DetailPanel.tsx:13-23`) + `PanelHead({ title, status? })`, `PanelBody`, `PanelFooter` |
| `Dialog` | `{ isOpen; onOpenChange; title: string; children?; actions?: ReactNode; size?: 'sm'|'md'|'lg'; isDismissable?: boolean }` (`Dialog.tsx:4-14`) |
| `ListState` | `{ state: 'loading'|'empty'|'error'; emptyText?; emptyHint?; onRetry? }` (`ListState.tsx:5`) |
| `Select` | `{ label; items: Array<{ id; label }>; value: string; onChange: (id) => void; isDisabled?; placeholder?; error?: string }` (`Select.tsx:4-12`) |
| `Stat` / `StatTotal` | `{ label; value: string; tone?: 'primary'|'accent'|'neutral'|'danger' }` / `{ label; value }` (`Stat.tsx:11,21`) |
| `TextField` | `{ label; value; onChange; type?: 'text'|'email'|'password'|'url'|'date'; name?; autoComplete?; placeholder?; description?; error?: string; isDisabled?; maxLength?; spellCheck?; inputMode?: 'text'|'numeric'|'email'|'url' }` (`TextField.tsx:3-18`) |
| `Toast` | `showToast(text: string): void` (`Toast.tsx:23-25`, 5 s); `ToastRegion` (`:27`); `toastQueue` (`:20`) |

- **DataList row selection: none.** Rows render twice (table + cards, container query, `:53-112`); a selection column must work in both.
- **TextField**: no `'number'` type, no multiline, no `isInvalid`/`errorMessage` (invalid = `error !== undefined`, `:23`), no `id`/`ref`/`isRequired`
  pass-through — focusing a field after a 400 needs a new prop or ref forwarding.
- react-aria-components already imported: `Button, ButtonProps, Checkbox, Dialog, FieldError, FileTrigger, Heading, Input, Label, ListBox, ListBoxItem,
  Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Select, SelectValue, Text, TextField, UNSTABLE_Toast*` (named imports, aliased `as Aria*`
  when the wrapper has the same name, e.g. `TextField as AriaTextField`, `Button as AriaButton`). Version `1.22.1`. None of `Tabs`, `Switch`,
  `NumberField`, `RadioGroup`, `TextArea` used yet.
- `use-presence.ts`: keeps a non-React-Aria element (side panel) mounted through its enter/exit animation; returns `{ isMounted, state }` (`:11-42`).
- `use-retained.ts`: last defined value while `value` is undefined, so a closing panel keeps its content (`:4-8`).
- Lint `scripts/check-tailwind-raw.mjs` (run by `pnpm lint`): no Tailwind arbitrary values `-[...]` and no inline `style={` in `src/**/*.tsx` unless the line
  above has `// raw-ok: <reason>` (`:1-2,7-8`).

## 6. i18n

- `messages/vi.json` and `en.json` top-level namespaces (same set, same order): `errors notice common shell nav session offline list account transactions
  staff navGroups comingSoon status sources uploads batch export publishJobs`. `common` = `retry cancel confirm loadMore loading close`. `errors` has 35 keys
  incl. `noAccess` ("Bạn không có quyền truy cập trang web này" — the sign-in gate text, not the per-page text).
- **No full vi/en key-parity test.** Existing checks: `problem.test.ts:57` (error slugs), `ComingSoonPage.test.tsx:34-41` (purposes),
  `i18n/messages.test.ts:10-15` (curly quotes, single-char ellipsis in every string). No typed messages (`AppConfig`) declaration.
- `i18n/use-date-time.ts`: `useDateTime(): (iso: string) => string` → `dd/MM/yyyy HH:mm` via `useFormatter`, in the IntlProvider zone (`:5-16`).
- `i18n/locale-context.tsx`: `LocaleProvider` (IntlProvider with the **browser's** time zone, `:29`), `useLocaleSwitch()` → `{ locale, setLocale }` (`:10`).
  Admin zone `Asia/Ho_Chi_Minh` is applied per call (`TransactionsPage.tsx:32-33`), not by the provider.

## 7. Auth

- `Permission` = `'roles.manage' | 'content.edit' | 'content.publish' | 'content.import' | 'taxonomy.manage' | 'settings.manage' | 'entitlements.grant'`
  (`auth/session-store.ts:5-12`).
- `Me = { id; email; email_verified; must_change_password; native_language: 'vi'|'en'|null; timezone; staff_role: 'admin'|'editor'|null; permissions: Permission[] }` (`:14-23`).
- `SessionState` (`:30-37`): `loading{retryAt?}` | `signed-out{notice}` | `unavailable` | `change-password{me}` | `signed-in{me}`.
- `recheck()` (`:169-176`): `GET /v1/me`; failure leaves state; gate → `signed-in` / `change-password` / `logout('no-access')` (`gate.ts`: `staff_role === null` → no-access).
- **The transport already reacts to 403**: `send` (`:179-193`) on 403 `forbidden` refreshes then calls `recheck()`; on `password-change-required` calls `recheck()`.
  Screens do not need to call `recheck()` themselves.
- `auth/use-can.ts`: `useCan(permission): boolean` (`:5-8`).
- `auth/session-context.tsx` exports: `SessionProvider({ children, store? })` (`:18`), `useSession(): { state, store }` (`:44`), `useApi(): ApiClient` (`:50`).
  SessionProvider re-runs `recheck()` on window focus while signed in (`:27-33`).

## 8. e2e

- `e2e/support/mock-api.ts`: `mockApi(page, handlers)` (`:40-79`) routes `http://localhost:3000/v1/**`; handler key `"METHOD /v1/path"` **without query**
  (`:67`), exact path (no params pattern); unscripted → 404 `not-found` problem, still logged. Handler gets `{ method, path, query: URLSearchParams, body, headers }`
  (`:3`) and returns `{ status?, json?, body?, headers?, abort? }` (`:4-11`). Helpers: `problem(status, slug, extra)` (`:25-29`, extra spread top-level),
  `signedInAs(page, role, extra, me)` (`:101-113`), `meBody` (`:86-98`), `PERMISSIONS.editor` = content.*, taxonomy.manage, entitlements.grant; `admin` adds
  roles.manage, settings.manage (`:81-84`), `requestCount`/`requests` (`:115-121`).
- `e2e/transactions.spec.ts` (69 lines) structure: `test.describe('Giao dịch (A/90)')`, `test.use({ locale: 'vi-VN' })`, `signedInAs(page, 'admin', { 'GET ...': (req) => { seen.push(req); return { json } } })`,
  `page.goto('/uploads')`, `openNavIfCollapsed` (width < 1024 → click ☰, `:14-16`), click nav link, `seriousViolations(page)` from `support/axe` (`:21-52`).
- `e2e/a11y.spec.ts`: `const pages = ['/uploads', '/uploads/b1', '/uploads/new', '/publish-jobs', \`/publish-jobs/${JOB}\`, '/sources', '/sources/new', '/export', '/ai/costs', '/transactions'];`
  (`:42`), looped × vi/en (`:44-65`) with a shared `mocks` map (`:25-40`) and `waitForContent(page, path)` (`:81-87`; `/ai/costs` treated as a static page — it
  becomes a real list in M1b and needs a mock + wait branch).
- `e2e/ui-guidelines.spec.ts`: single-page tests with `page.goto(...)` (`:20-202`) and a `wideLists` map `{ '/uploads', '/publish-jobs', '/staff' }` with column
  shares (`:129-149`), looped at `:151-170`.
- Silent-redirect assertions that change with the "no permission" page:
  - `e2e/shell.spec.ts:73-77` `'an editor opening /staff is sent to the first visible page'` → `await expect(page).toHaveURL(/\/uploads$/);`
  - `e2e/transactions.spec.ts:54-68` `'editor: no menu entry, and /transactions sends them home without calling the API'` → `toHaveURL(/\/uploads$/)` (`:64`), `calls === 0`.
  - `src/features/transactions/TransactionsPage.test.tsx:36-41` `'... is sent away from /transactions'` (h1 Giao dịch absent — with the new page the h1 stays).
  - `src/features/staff/StaffPage.test.tsx:142-160, 162-177` (self-demotion → h1 becomes `vi.nav.uploads`).
- Configs: `apps/admin/playwright.config.ts` (projects `desktop` 1440×900, `mobile` 390×844 touch; webServer `pnpm build:e2e && vite preview`, port
  `ADMIN_E2E_PORT ?? 5173`); `apps/admin/playwright.real.config.ts` (testDir `e2e-real`, `globalSetup: './e2e-real/global-setup.ts'`, 1 worker, desktop only).

## 9. `apps/admin/package.json`

Scripts: `lint` = `eslint . && node scripts/check-tailwind-raw.mjs`; `typecheck` = `tsc --noEmit`; `test` = `vitest run`; `test:e2e` = `playwright test --pass-with-no-tests`;
`test:e2e:real` = `playwright test -c playwright.real.config.ts`; `build` = `tsc --noEmit && vite build`; `build:e2e` = `vite build --mode e2e`.
Versions: `react-router 8.4.0`, `react-aria-components 1.22.1`, `@tanstack/react-query 5.104.2`, `use-intl 4.14.9`, `vitest 4.1.11`, `@playwright/test 1.63.0`,
`react 19.3.0`, `zod 4.6.5`, `msw 3.0.3` (dev; not used by the tests read here).

## 10. react-router 8.4.0 (`node_modules/react-router/dist/development/`)

- Runtime check of `require('./index.js')`: `createBrowserRouter`, `createMemoryRouter`, `RouterProvider`, `createRoutesFromElements`, `useBlocker`,
  `useBeforeUnload` are all functions exported from **`'react-router'`**. `'react-router/dom'` (`dom-export.js`) exports only `RouterProvider` (and HydratedRouter)
  — a variant with `flushSync` wired in: `type RouterProviderProps$1 = Omit<RouterProviderProps, "flushSync">` (`lib/dom-export/dom-router-provider.d.ts:5-6`).
- `declare function createBrowserRouter(routes: RouteObject[], opts?: DOMRouterOpts): Router;` (`lib/dom/lib.d.ts:525`)
- `declare function createMemoryRouter(routes: RouteObject[], opts?: MemoryRouterOpts): Router$1;` (`lib/components.d.ts:152`)
- `declare const createRoutesFromElements: typeof createRoutesFromChildren;` (`lib/components.d.ts:964`) — lets the existing JSX tree become route objects unchanged.
- `declare function useBlocker(shouldBlock: boolean | BlockerFunction): Blocker;` (`lib/hooks.d.ts:880`)
- Blocker types (`lib/router/router.d.ts:608-631`):
```ts
interface BlockerBlocked    { state: "blocked";    reset: () => void; proceed: () => void; location: Location; }
interface BlockerUnblocked  { state: "unblocked";  reset: undefined;  proceed: undefined;  location: undefined; }
interface BlockerProceeding { state: "proceeding"; reset: undefined;  proceed: undefined;  location: Location; }
type Blocker = BlockerUnblocked | BlockerBlocked | BlockerProceeding;
type BlockerFunction = (args: { currentLocation: Location; nextLocation: Location; historyAction: Action; }) => boolean;
```
- `useBlocker` (`lib/hooks.js:1253-1286`) calls `useDataRouterContext("useBlocker")` first → throws "`useBlocker must be used within a data router`" (`:819-821`)
  under `MemoryRouter`/`BrowserRouter`. More than one blocker → only `warning(false, "A router only supports one blocker at a time")` (`lib/router/router.js:1221`).
- `declare function useBeforeUnload(callback: (event: BeforeUnloadEvent) => any, options?: { capture?: boolean }): void;` (`lib/dom/lib.d.ts:1969-1971`).
- Also present: `unstable_usePrompt({ when, message })` (`lib/dom/lib.js:1227`), not needed.

## Surprises

1. **Design §4.2 says the old unit tests keep `MemoryRouter` "because old screens don't call `useBlocker`" — false for 13 test files.** The blocker lives in
   `Shell`, and `staff/test-utils.tsx:41-43` (`renderApp`, used by 11 test files) and `session-loading.test.tsx:17-19` render `<AppRoutes/>` (with `Shell`)
   inside `MemoryRouter` → `useBlocker` throws. Those two helpers must move to `createMemoryRouter` in M0 (they are also two of the three `AppRoutes`
   importers). Only `account/test-utils.tsx` and `ui/ui.test.tsx` (no `Shell`) can stay.
2. **`extensions.reason` does not exist on the wire** (design §4.5): the API spreads extensions top-level (`problem-details.filter.ts:43`), and the client's
   `toApiError` drops every unknown member (`problem.ts:79-87`). M4 needs `Problem` to keep e.g. `reason` (or a generic `extra` record).
3. `ApiClient` has **no `patch` / `delete`** and `put` has no `idempotencyKey` (`client.ts:5-11`). Any new screen whose endpoint is PATCH/DELETE (or PUT with
   `Idempotency-Key`, e.g. "lưu Cài đặt") needs the client extended — not listed in the design's M0 scope.
4. `useSubmitAction` returns only `ErrorDetails` (`useSubmitAction.ts:23,42,57`), not the `ApiError` — the §4.3 "focus the field of each `violations[]`" and the
   409-conflict handling can't read `violations` through it without a change. `TextField` also has no ref/`id` pass-through to focus.
5. Design §4.6 "screen calls `SessionStore.recheck()` on 403 `forbidden`" is already done by the transport (`session-store.ts:181-186`); screens need only show the text.
6. Reference list pagination is "Tải thêm" (`useInfiniteQuery`, `common.loadMore`), not "Trang sau". No `useSearchParams` anywhere yet, so URL filters are new code.
7. The silent-redirect change touches more than `e2e/shell.spec.ts`: also `e2e/transactions.spec.ts:54-68`, `TransactionsPage.test.tsx:36-41`, and the two
   self-demotion tests `StaffPage.test.tsx:142-177`.
8. `staff/test-utils.tsx` `ME_ADMIN` lacks `settings.manage` and `entitlements.grant` (`:16`); every AI/settings/refunds screen test needs a fuller `me`.
9. No vi/en key-parity test exists (AD11 "every string in both") — only partial checks; worth adding in M0 if parity is to be enforced.
