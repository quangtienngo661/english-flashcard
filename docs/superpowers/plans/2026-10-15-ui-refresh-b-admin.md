# Làm mới giao diện admin theo hướng B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi lớp nhìn của `apps/admin` sang hướng B (Lexend, nền `canvas`, tờ trắng có gờ, nút dày có gờ, sidebar của admin A), mở chi tiết lô nhập và publish job thành panel cạnh bảng, mở ba form thành dialog (URL giữ nguyên), thêm toast cho đổi/gỡ vai trò và sửa B25E30; hành vi còn lại giữ nguyên.

**Architecture:** Màu, font, bo góc, motion lấy từ `@wordmet/design-tokens` (đã có từ plan landing); `src/styles/globals.css` của admin chỉ giữ mật độ, bố cục, bóng (màu tham chiếu `var(--color-*)`) và keyframes. `Shell` có hai "khe" (portal): nút chính của trang ở đầu tờ trắng và cột panel bên phải. Danh sách là route cha; `/…/:id` và `/…/new` là route con không có element, trang danh sách tự đọc URL bằng `useMatch` và tự vẽ `DetailPanel` hoặc `Dialog`, nhờ vậy hiệu ứng đóng chạy được (UB23). `DetailPanel` là `aside` không modal từ `84rem`, là dialog modal trượt từ phải dưới `84rem` (UB22).

**Tech Stack:** Vite 8.3.4, React 19.3.0, react-router 8.4.0, react-aria-components 1.22.1, TanStack Query 5.104.2, use-intl 4.14.9, Tailwind 4.3.3 (`@tailwindcss/vite`), Vitest 4.1.11 + Testing Library, Playwright 1.63.0 + axe 4.13.0. Không thêm dependency ngoài `@wordmet/design-tokens` (`workspace:*`).

**Spec:** [`../specs/2026-10-15-ui-refresh-b-design.md`](../specs/2026-10-15-ui-refresh-b-design.md) (đọc §2, §3, §4, §6, §7.5–§7.7, §8, §10 trước mọi task; UB22, UB23 chốt lúc viết plan này). Phương án đã bỏ: [`../decisions/2026-10-15-ui-refresh-b-decisions.md`](../decisions/2026-10-15-ui-refresh-b-decisions.md). Hành vi gốc của admin: [`../specs/2026-10-14-buoc-2-5-admin-web-design.md`](../specs/2026-10-14-buoc-2-5-admin-web-design.md) (B25#, B25E#). Hình tham chiếu: [`../../mockups/2026-10-15/admin-b.html`](../../mockups/2026-10-15/admin-b.html). As-built landing và ba điểm mở cho admin: [`../../deliveries/ui-refresh-b.md`](../../deliveries/ui-refresh-b.md).

## Global Constraints

- Đường dẫn tính từ `apps/admin/` trừ khi bắt đầu bằng `packages/`, `docs/` hoặc là file ở gốc repo. Lệnh chạy từ `apps/admin/`. Trên Windows mọi lệnh chạy trực tiếp (Vite, Playwright Chromium). `pnpm build` cần `VITE_API_BASE_URL=https://admin-api.wordmet.com`; e2e tự chạy `build:e2e`. Không chạy `pnpm test` của admin cùng lúc với test của API (hết giờ, ghi ở `docs/deliveries/buoc-2-5-test-flow.md` §1).
- Nhánh `feat/ui-b-admin` cắt từ nhánh chứa plan này (`claude/gifted-booth-9229f5` = `feat/ui-b-landing` + commit docs của plan; `feat/ui-b-landing` có `packages/design-tokens`, `dev` chưa có cho tới khi PR #22 merge), làm trong worktree riêng (`superpowers:using-git-worktrees`). Commit local bình thường; push và mở PR không cần hỏi; **mọi lần merge (kể cả đưa `dev` vào nhánh) phải hỏi chủ dự án trước**; quét secret trước mỗi lần push. Conventional Commits, kết bằng dòng `Co-Authored-By` của phiên.
- Không thêm thư viện (UB1). Ngoại lệ duy nhất: `"@wordmet/design-tokens": "workspace:*"` trong `apps/admin/package.json`.
- Chữ chỉ đổi đúng các chỗ sau ở `messages/{vi,en}.json`: thêm `common.close` (Task 6), `staff.toast.granted`, `staff.toast.removed` (Task 10), `shell.sessionRetry` (Task 11); `navGroups.*` viết thường như câu (Task 4, design §6.1); xóa `batch.back`, `publishJobs.back` (Task 7, 8: hết chỗ dùng). Chuỗi mới dùng `…` một ký tự và ngoặc cong (test `messages.test.ts`).
- Giữ code hành vi (UB1): phiên và luật cổng, API client (`Idempotency-Key`, Problem Details), polling 2 giây, bảng câu lỗi, B25E1–E29. Ngoại lệ: UB8 (panel), UB9 (dialog), UB10 (B25E30), UB12 (toast), UB22, UB23. Mọi điều hướng mở/đóng panel và dialog là `push` như link hiện nay; riêng bấm dòng đang mở thì `replace`.
- **Màu chỉ ở package (UBC1):** `src/styles/globals.css` của admin không có `--color-`, không có mã `#…`, `rgb(`, `hsl(`. Bóng tham chiếu `var(--color-…)` hoặc `color-mix(in srgb, var(--color-ink) N%, transparent)`. Màu mới của mockup admin vào package: `--color-danger-deep: #8a2219` (gờ nút đỏ), `--color-canvas-deep: #dde1f5` (gờ tờ trắng; giải điểm mở 1 của as-built: `--shadow-ledge-soft` của landing giữ `#e3e6f4`, admin dùng token riêng `--shadow-sheet`).
- **Bo góc (giải điểm mở 2):** admin bỏ `--radius-control`/`--radius-panel` riêng (0,375rem); dùng giá trị của package: nút, ô nhập `rounded-control` 0,75rem; ô số liệu, khối trong tờ `rounded-panel` 1rem; tờ trắng `rounded-card` 1,25rem; dialog `rounded-feature` 1,5rem; menu, toast `rounded-inner` 0,875rem; mục menu, ô tick `rounded-sm` 0,5rem.
- W7 (không giá trị Tailwind tùy ý `-[...]`, không `style={}` trừ dòng có `// raw-ok:` ngay trên; `pnpm lint` kiểm). Giá trị lạ đặt thành token hoặc `@utility` trong `globals.css`.
- **Tên token Tailwind v4 (landing đã kiểm 15/10/2026):** `duration-*` chỉ đọc `--transition-duration-*`; `animate-*` đọc `--animate-*`; `ring-*`/`border-*` chỉ nhận số px nguyên, nên viền ô nhập là 2px thay 1,5px của design (ghi lệch vào delivery).
- **Motion:** chỉ gắn qua `data-entering`/`data-exiting` (React Aria, hoặc `usePresence` của Task 6) và luôn trong `motion-safe:`; không gắn/gỡ class hay đổi `display` của phần tử đang `data-exiting` (UBE22). Trạng thái app không chờ chuyển động. Thời lượng ≤ 250ms, riêng toast hiện 300ms (UBC15). UB23: 4 hộp xác nhận (`RevertDialog`, `RoleDialog`, `CreateAccountDialog`, hộp "publish toàn bộ" trong `PublishJobForm`) giữ kiểu "mount khi mở" nên đóng ngay; toast hiện bằng keyframe lúc mount, ẩn ngay.
- **Ngưỡng panel (UB22):** `--breakpoint-panel: 84rem` trong `globals.css` và `PANEL_SPLIT_QUERY = '(min-width: 84rem)'` trong `src/ui/DetailPanel.tsx`; test giữ hai giá trị bằng nhau. 84rem = 15,5rem sidebar + 0,75rem lề + 26rem panel + 40rem bảng + chỗ cho thanh cuộn Windows.
- Test e2e đặt bề rộng riêng thì bỏ qua project `mobile` (`test.skip(test.info().project.name !== 'desktop', …)` như `ui-guidelines.spec.ts`).

## Review Focus

1. **Esc trong hộp "Hoàn tác lô" đang nằm trên panel cạnh bảng:** người dùng mong chỉ hộp đóng, panel còn. Sự kiện React đi xuyên portal lên `onKeyDown` của panel. Test ở Task 7.
2. **Bấm đúp một dòng của bảng:** mong chỉ một mục lịch sử, Back một lần là đóng panel. Test ở Task 7.
3. **Kéo cửa sổ qua 84rem khi panel đang mở** (1280 → 1440 và ngược lại): mong panel vẫn hiện đúng lô, không còn nền mờ treo. Test ở Task 7.
4. **Admin tự gỡ quyền admin của mình:** `/staff` thành cấm và trang chuyển đi; mong toast vẫn hiện (vùng toast nằm ngoài route). Test ở Task 10.
5. **Back sau khi bấm "Publish lô này" trong panel:** mong về `/uploads/<id>` với panel mở và polling chạy lại. Test ở Task 8.

---

### Task 1: Admin dùng `@wordmet/design-tokens`; màu thật được kiểm

**Files:**
- Modify: `packages/design-tokens/theme.css`, `packages/design-tokens/README.md`, `apps/admin/package.json`, `pnpm-lock.yaml` (qua `pnpm install`), `src/styles/globals.css`, `index.html`, mọi `src/**/*.tsx` dùng tên token bị đổi
- Create: `src/styles/tokens.test.ts`, `e2e/theme.spec.ts`

**Interfaces:**
- Produces: `globals.css` của admin là hợp đồng cho mọi task sau:

```css
@import 'tailwindcss';
@import '@wordmet/design-tokens/theme.css';

@theme {
  --text-ui: 0.875rem;
  --spacing-control: 2.5rem;         --spacing-control-touch: 2.75rem;
  --spacing-sidebar: 15.5rem;        --spacing-drawer: 17rem;        --spacing-panel: 26rem;
  --spacing-auth-card-max: 25rem;    --spacing-page-pad-min: 1rem;   --spacing-page-pad-max: 1.75rem;
  --breakpoint-shell: 64rem;         --breakpoint-panel: 84rem;      --container-list: 40rem;
  --shadow-sheet: 0 0.3rem 0 var(--color-canvas-deep);
  --shadow-button: 0 0.18rem 0 var(--color-primary-deep);
  --shadow-button-secondary: 0 0.18rem 0 var(--color-border-strong);
  --shadow-button-danger: 0 0.18rem 0 var(--color-danger-deep);
  --shadow-dialog: 0 0.5rem 0 color-mix(in srgb, var(--color-ink) 18%, transparent);
  --shadow-menu: 0 0 0 1px var(--color-border), 0 0.35rem 0 color-mix(in srgb, var(--color-ink) 12%, transparent);
  --shadow-toast: 0 0.3rem 0 color-mix(in srgb, var(--color-ink) 25%, transparent);
  --shadow-overlay-panel: -0.4rem 0 0 color-mix(in srgb, var(--color-ink) 12%, transparent);
}
```

`body` giữ khối hiện có, đổi `--color-bg` thành `--color-canvas`. Xóa khỏi admin: mọi `--color-*`, `--font-sans`, `--radius-*`, `--shadow-card`, `--shadow-nav`, `--spacing-topbar-min`, `--spacing-sidebar-min/max`. Đổi tên cơ học trong `src/**/*.tsx` (gồm tiền tố như `hover:`): `bg-bg` → `bg-canvas`; `*-danger-strong` → `*-danger`; `shadow-card`, `shadow-nav` → `shadow-sheet`; `w-60 min-w-sidebar-min max-w-sidebar-max` → `w-sidebar`; `min-h-topbar-min` → `min-h-control-touch`. `index.html`: font `https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;800&display=swap` thay Be Vietnam Pro; `theme-color` `#2445d6` (khớp thanh trên màu `primary` ở điện thoại). Package thêm `--color-danger-deep: #8a2219`, `--color-canvas-deep: #dde1f5` và hai dòng README.

- [ ] **Step 1: Viết test đỏ** `src/styles/tokens.test.ts` (đọc theme bằng `createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css')`, tách `--color-<tên>: #xxxxxx;` thành map, hàm tương phản WCAG như `apps/web/src/styles/tokens.test.ts`):
  - `UBC1 apps/admin declares no colour`: `globals.css` không khớp `/--color-|#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i`.
  - `UBC2 admin text pairs reach 4.5:1`: `ink/surface, ink/canvas, ink/primary-soft, ink/accent, ink/accent-soft, ink/neutral-soft, muted/surface, muted/canvas, muted/primary-soft, muted/accent-soft, muted/neutral-soft, muted/danger-soft, primary/surface, primary/primary-soft, on-primary/primary, on-primary/danger, on-primary/ink, accent/ink, success/success-soft, warning/accent-soft, danger/surface, danger/danger-soft, placeholder/surface, placeholder/canvas`.
  - `UBC2 admin control and focus pairs reach 3:1`: `border-strong/surface, border-strong/canvas, border-strong/primary-soft, primary/surface, primary/canvas, accent/primary`.
  - `the package declares danger-deep and canvas-deep`.
- [ ] **Step 2:** `pnpm test src/styles/tokens.test.ts` → FAIL (không resolve được package).
- [ ] **Step 3:** Thêm dependency, `pnpm install` ở gốc repo; sửa package, `globals.css`, `index.html`; đổi tên cơ học.
- [ ] **Step 4: Viết test e2e đỏ rồi cho xanh** `e2e/theme.spec.ts` → `UBC1 admin paints with the package palette and Lexend` (cả hai project, `/uploads`, `signedInAs('editor')` với danh sách 1 lô): `body` có `background-color` `rgb(241, 243, 253)`; nút `uploads.upload` có nền `rgb(36, 69, 214)`; `font-family` của `h1` khớp `/^"?Lexend/`; có `link[href*="family=Lexend"]`, không có `link[href*="Be+Vietnam"]`. (Giải điểm mở 3 của as-built: đây là lần kiểm màu thật đầu tiên; việc font tải được kiểm bằng mắt ở Checkpoint A.)
- [ ] **Step 5:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` → PASS. `rg "bg-bg|danger-strong|shadow-card|shadow-nav|sidebar-min|sidebar-max|topbar-min" src` → không có dòng nào.
- [ ] **Step 6: Commit** `feat(admin): use the shared design tokens and lexend`

### Task 2: Nút, ô nhập, Select, ô tick, vùng thả file

**Files:**
- Modify: `src/ui/{Button,TextField,Select,Checkbox,FileDrop}.tsx`, `src/styles/globals.css`, `src/ui/ui.test.tsx`

**Interfaces:**
- Consumes: token của Task 1.
- Produces: `ButtonVariant` giữ `'primary' | 'secondary' | 'danger' | 'ghost'`, `size` giữ `'md' | 'touch'`, hành vi `isPending` giữ nguyên. `@utility pressed { translate: 0 0.18rem; }`.

Kiểu (design §6.2, mockup `.btn`, `.field`):
- Nút gốc: `rounded-control px-4 text-ui font-semibold whitespace-nowrap transition duration-instant ease-standard pointer-coarse:min-h-control-touch motion-safe:data-pressed:pressed motion-safe:data-pressed:shadow-none disabled:opacity-50`, giữ viền focus hiện có.
- `primary` `bg-primary text-on-primary shadow-button hover:bg-primary/90`; `secondary` `bg-surface text-ink ring-2 ring-inset ring-border-strong shadow-button-secondary hover:bg-primary/4`; `danger` `bg-danger text-on-primary shadow-button-danger hover:bg-danger/90`; `ghost` `text-primary hover:bg-primary-soft` (không gờ).
- Ô nhập và nút của Select: `min-h-control rounded-control bg-canvas px-3 ring-2 ring-inset ring-border-strong placeholder:text-placeholder focus-visible:bg-surface focus-visible:ring-primary`, lỗi `ring-danger`. Popover của Select: `rounded-inner bg-surface p-1 shadow-menu`, mục `rounded-sm data-focused:bg-primary-soft`.
- Ô tick: `size-5 rounded-sm border-2 border-border-strong bg-canvas`, đã chọn `border-primary bg-primary`, dấu ✓ `size-3.5 text-on-primary`.
- Vùng thả file: `rounded-panel border-2 border-dashed border-border-strong bg-primary-soft`; đang kéo `border-primary bg-primary/10`; lỗi `border-danger bg-danger-soft`.

- [ ] **Step 1: Viết test đỏ** trong `ui.test.tsx`:
  - `Button each variant carries its B background and ledge` (primary `bg-primary` + `shadow-button`; secondary `bg-surface` + `ring-border-strong` + `shadow-button-secondary`; danger `bg-danger` + `shadow-button-danger`; ghost `text-primary`, không có class bắt đầu bằng `shadow-`).
  - `Button presses down only with motion allowed and grows on coarse pointers` (`motion-safe:data-pressed:pressed`, `pointer-coarse:min-h-control-touch`).
  - `TextField input sits on canvas with a border-strong ring and the placeholder colour`.
  - `Checkbox box is size-5 with a border-strong edge`.
  - `FileDrop at rest is primary-soft with a dashed border-strong edge`.
  - Giữ `a pending Button ignores a second click` và test `TextField` hiện có.
- [ ] **Step 2:** `pnpm test src/ui` → FAIL.
- [ ] **Step 3:** Sửa năm component, thêm `@utility pressed`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS; `pnpm build` rồi `rg -c "pointer: ?coarse" dist/assets/*.css` ≥ 1.
- [ ] **Step 5: Commit** `feat(admin): restyle buttons and form controls for direction b`

### Task 3: Nhãn trạng thái, ô số liệu, banner, bảng

**Files:**
- Modify: `src/ui/{Badge,Banner,Stat,ListState,DataList}.tsx`, `src/features/jobs/StatusBadge.tsx`, `src/ui/ui.test.tsx`, `e2e/ui-guidelines.spec.ts`
- Create: `src/features/jobs/status-badge.test.tsx`

**Interfaces:**
- Produces:
  - `Badge({ tone?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger'; children })`: viên `rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap`; nền/chữ: `primary-soft/primary`, `neutral-soft/muted`, `success-soft/success`, `accent-soft/warning`, `danger-soft/danger`.
  - `StatusBadge({ status: JobStatus | 'reverted'; progress?: { done: number; total: number } })`; tone: queued neutral, running primary, succeeded success, **partial warning**, failed danger, reverted neutral. Khi `running` và có `progress`: dưới viên là thanh `aria-hidden` `h-1.5 w-30 rounded-full bg-primary-soft`, phần đã chạy `bg-primary` rộng theo phần trăm (`style` có `// raw-ok: progress width is data`).
  - `Stat({ label; value; tone?: 'primary' | 'accent' | 'neutral' | 'danger' })` (mặc định `neutral`): `rounded-panel px-4 py-3`, nền `*-soft` theo tone (`accent` → `accent-soft`), số `text-2xl font-extrabold tabular-nums`, `danger` thì số `text-danger`. `StatTotal({ label; value })`: dòng `flex justify-between border-t-2 border-border pt-3 font-semibold tabular-nums`.
  - `Banner`: bỏ viền; `rounded-panel px-4 py-3`; info `bg-primary-soft text-ink`, error `bg-danger-soft text-danger`, offline `bg-accent-soft text-ink`.
  - `DataList` thêm `rowHref?: (row: T) => string` và `selectedKey?: string`. Bảng không còn thẻ bọc (nằm thẳng trên tờ trắng): khung `overflow-clip` (không phải `overflow-hidden`, để tiêu đề cột dính được), lề ngang âm `-mx-page-pad-min shell:-mx-page-pad-max` để chạm mép tờ, ô đầu/cuối `pl-/pr-page-pad-*`. `th`: `sticky top-0 z-10 bg-surface border-b-2 border-border font-medium text-muted`, bỏ `uppercase`. Dòng có `rowHref`: `cursor-pointer hover:bg-primary/4`, `data-selected` khi `rowKey(row) === selectedKey` → `data-selected:bg-accent-soft`; bấm dòng gọi `navigate(href, { replace: href === location.pathname })`, bỏ qua khi `event.target` nằm trong `a, button` hoặc đang có chữ được bôi đen. Thẻ xếp dọc (dưới `@list`) giữ, kiểu `rounded-panel border-2 border-border bg-surface`, cũng nhận `data-selected`.
- [ ] **Step 1: Viết test đỏ:**
  - `ui.test.tsx` (bọc `MemoryRouter`, hiện `location.pathname` để kiểm): `DataList a click on a cell opens rowHref`; `DataList a click on the row's own link navigates once` (đếm số lần đổi location); `DataList clicking the open row replaces instead of pushing`; `DataList marks the selected row and card with data-selected`; `Stat tones map to their soft backgrounds`; `Banner info, error and offline use the B fills`.
  - `status-badge.test.tsx`: `partial uses the warning tone`; `running with progress 1200/3200 draws a 37.5% bar hidden from screen readers`; `a finished status draws no bar`.
  - `e2e/ui-guidelines.spec.ts` (desktop): `the table header stays at the top while a 40-row list scrolls` (cuộn 800px, `thead` có `boundingBox().y` trong [0, 2]).
- [ ] **Step 2:** `pnpm test src/ui src/features/jobs` → FAIL.
- [ ] **Step 3:** Sửa các component.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS; `pnpm test:e2e e2e/ui-guidelines.spec.ts` → PASS (gồm test "Chi tiết" một dòng và chữ số đều hiện có).
- [ ] **Step 5: Commit** `feat(admin): restyle status pills, stats, banners and tables for direction b`

### Task 4: Khung: sidebar trên nền, tờ trắng có khe nút chính, thanh trên điện thoại

**Files:**
- Create: `src/app/shell-slots.tsx`, `src/app/shell-slots.test.tsx`, `src/ui/Logo.tsx`
- Modify: `src/app/Shell.tsx`, `src/features/account/AuthCard.tsx`, `src/features/coming-soon/ComingSoonPage.tsx`, `src/features/{uploads/UploadsPage,publish-jobs/PublishJobsPage,sources/SourcesPage,staff/StaffPage}.tsx` (`StaffPage` thêm khối tìm kiếm và thẻ người dùng), `src/styles/globals.css`, `messages/{vi,en}.json`, `e2e/shell.spec.ts`

**Interfaces:**
- Produces:
  - `shell-slots.tsx`: `ShellSlotsContext` (`{ actions: HTMLElement | null; panel: HTMLElement | null }`), `PageActions({ children }): ReactPortal | null` (portal vào `actions`), `usePanelSlot(): HTMLElement | null` (Task 6 dùng). Chọn portal vì app dùng `<BrowserRouter>` + `<Routes>`, không có `handle` của data router; đẩy nút lên Shell bằng state sẽ phải đồng bộ qua effect.
  - `Logo({ tone?: 'default' | 'onPrimary' })`: miếng `_ _` `rounded-sm bg-accent px-1.5 text-xs font-extrabold tracking-widest text-ink` (`aria-hidden`) + `shell.brand` (`translate="no"`, `font-extrabold`; `onPrimary` → `text-on-primary`).
  - `<h1 id="page-title" tabIndex={-1}>` trong đầu tờ trắng (Task 7 trả focus về đây).
  - `@utility highlighter { background: linear-gradient(transparent 50%, var(--color-accent) 50%, var(--color-accent) 92%, transparent 92%); }`, `@utility min-h-sheet { min-height: calc(100dvh - 1.75rem); }`, `@utility grid-sheet { grid-template-columns: minmax(0, 1fr) auto; }`.

Bố cục (design §6.1, mockup `.shell`):
- Từ `shell`: `aside` `sticky top-0 h-dvh w-sidebar` trên nền `canvas`, không nền, không bóng. Trong đó `Logo`, nav, chân sidebar (`mt-auto`): VI/EN (mục đang chọn `bg-ink text-on-primary`, mục khác `text-muted hover:bg-primary/7`) và nút tài khoản (ô `size-8 rounded-sm bg-primary text-on-primary` với hai chữ đầu của email như hiện nay, rồi email `truncate`; giữ `aria-label` `${shell.account}: ${email}`); menu tài khoản giữ đúng mục "Đăng xuất", `Popover placement="top start" offset={4}`.
- Mục menu: `rounded-sm px-2.5 py-1.5 hover:bg-primary/7`, đang mở `font-semibold` và nhãn có `highlighter`; giữ icon (UB13). Tiêu đề nhóm `text-xs font-medium text-muted`, bỏ `uppercase`; `navGroups` VI: "Tổng quan", "Nội dung", "Luyện tập", "Người học", "AI", "Hệ thống"; EN: "Overview", "Content", "Practice", "Learners", "AI", "System".
- Tờ trắng là `<main id="main" tabIndex={-1}>`: `bg-surface overflow-clip`; từ `shell`: `rounded-card shadow-sheet min-h-sheet`, cột phải lề `0.75rem`; dưới `shell`: `rounded-t-card -mt-2`, không bóng. Từ `panel`: `grid grid-sheet`, cột 1 chứa đầu tờ + banner mất mạng + `<Outlet />` (lề `px-page-pad-min shell:px-page-pad-max`), cột 2 là `<div ref={setPanelSlot} />` (rỗng thì rộng 0). Đầu tờ: `<header>` `flex flex-wrap items-end justify-between gap-4`, `h1` `text-3xl font-extrabold tracking-tight` (lấy `navLabelKey` như hiện nay), khe `actions`.
- Dưới `shell`: thanh trên `bg-primary text-on-primary` (☰ + `Logo tone="onPrimary"`); ngăn kéo `ModalOverlay` `bg-ink/45`, `Modal` `fixed inset-y-0 left-0 w-drawer max-w-full bg-canvas` gồm logo, ✕, nav, VI/EN, tài khoản.
- Bốn trang danh sách đưa nút chính vào `PageActions` (bỏ khối `flex shell:justify-end` và `w-full shell:w-auto`); điều kiện quyền giữ nguyên. Khối tìm kiếm và thẻ người dùng ở Vai trò: `rounded-panel border-2 border-border p-4`. `ComingSoonPage` bỏ thẻ bọc. `AuthCard`: nền `canvas`, `Logo` ở trên, thẻ `rounded-card bg-surface p-7 shadow-sheet`, tiêu đề `font-extrabold`.

- [ ] **Step 1: Viết test đỏ:**
  - `shell-slots.test.tsx` (qua `renderApp('/uploads', …)`): `PageActions puts "Upload CSV" in the sheet header beside the h1` (nút và `h1` cùng nằm trong một `header` trong `main`); `an editor without content.edit sees no page action`.
  - `e2e/shell.spec.ts`:
    - `UBC10 at 1440 the sidebar sits on the canvas, the active item is highlighted, and VI/EN and the account sit at its foot` (desktop): `aside` có `box-shadow` `none` và nền trong suốt; nhãn mục đang mở có `background-image` chứa `linear-gradient`; mỗi link nav có `svg`; nhóm ngôn ngữ và nút tài khoản nằm trong `aside`; menu tài khoản mở lên trên (`menu` có `boundingBox().y` nhỏ hơn của nút).
    - `UBC11 at 390 the top bar is primary, ☰ opens the drawer from the left with VI/EN and the account; nothing scrolls sideways` (mobile): nền thanh trên `rgb(36, 69, 214)`; `dialog` có `x` = 0; nhóm ngôn ngữ nằm trong `dialog`; `scrollWidth ≤ clientWidth`.
    - Sửa `B25#22`: ở mobile mở ngăn kéo (`openNavIfCollapsed`) trước khi bấm `EN`.
- [ ] **Step 2:** `pnpm test src/app` và `pnpm test:e2e e2e/shell.spec.ts` → FAIL.
- [ ] **Step 3:** Viết `shell-slots.tsx`, `Logo.tsx`, viết lại `Shell.tsx`, sửa các trang và messages.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` → PASS (cả `account.spec.ts`: axe màn đăng nhập ở 390 và 1440).
- [ ] **Step 5: Commit** `feat(admin): put the sidebar on the canvas and pages on one white sheet`

### Task 5: Chuyển động của dialog, menu, ngăn kéo

**Files:**
- Modify: `src/styles/globals.css`, `src/ui/{Dialog,Select}.tsx`, `src/app/Shell.tsx`
- Create: `e2e/motion.spec.ts`

**Interfaces:**
- Produces (trong `globals.css`, dùng cho Task 6–10):
  - `@theme` thêm `--motion-overlay: 200ms` và `--animate-{overlay-in, overlay-out, dialog-in, dialog-out, menu-in, menu-in-up, menu-out, drawer-in, drawer-out, panel-in, panel-out, toast-in}` cùng `@keyframes`, số theo design §6.2/§6.3/§6.6 và mockup: overlay 200ms vào (`--ease-standard`) / 150ms ra; dialog 250ms (`opacity 0, translateY(0.5rem) scale(0.97)`, `--ease-enter`) / 150ms (`opacity 0, scale(0.98)`, `--ease-exit`); menu 200ms (`translateY(∓0.25rem)`) / 150ms; ngăn kéo 250ms (`translateX(-100%)`) / 150ms; panel 250ms (`opacity 0, translateX(1.5rem)`) / 150ms; toast 300ms `--ease-spring` (`opacity 0, translateY(0.9rem) scale(0.96)`). Thời lượng dùng `var(--transition-duration-*)`, `var(--motion-overlay)`, `var(--motion-toast)`.
  - `@custom-variant placement-top (&[data-placement='top']);`
  - `Dialog` props: `actions?: ReactNode` (không có thì không vẽ hàng nút), `size?: 'sm' | 'md' | 'lg'` (`max-w-sm`, `max-w-120`, `max-w-2xl`); hộp `rounded-feature bg-surface p-7 shadow-dialog`, tiêu đề `text-xl font-extrabold tracking-tight`.

Gắn: `ModalOverlay` của `Dialog` và ngăn kéo `motion-safe:data-entering:animate-overlay-in motion-safe:data-exiting:animate-overlay-out`; `Modal` của `Dialog` `…animate-dialog-in / …animate-dialog-out`; `Modal` của ngăn kéo `…animate-drawer-in / …animate-drawer-out`; `Popover` của Select và menu tài khoản `motion-safe:data-entering:animate-menu-in motion-safe:placement-top:data-entering:animate-menu-in-up motion-safe:data-exiting:animate-menu-out`, `offset={4}`. Không nảy ở dialog.

- [ ] **Step 1: Viết test đỏ** `e2e/motion.spec.ts`:
  - `UBE22 opening and closing the account menu ten times fast leaves no menu` (desktop: bấm, `Escape` ngay, ×10; chờ 400ms; `menu` 0, không còn `[data-exiting]`).
  - `UBE22 the drawer opened and closed ten times fast leaves no overlay` (mobile: ☰ rồi `Escape` ×10; chờ 400ms; `dialog` 0).
  - `UBE23 reopening the account menu while it closes leaves it open` (bấm, `Escape`, bấm ngay; chờ 400ms; `menu` hiện).
  - `UBE20 with reduced motion the menu and the drawer run no animation and vanish at once` (`page.emulateMedia({ reducedMotion: 'reduce' })`; sau khi mở: `document.getAnimations().length` = 0; sau `Escape` và hai `requestAnimationFrame`: `menu` 0).
  - `the revert dialog enters in 250ms and the account menu in 200ms` (ngay sau khi mở, `Math.max(...getAnimations().map(a => a.effect.getTiming().duration))` bằng 250 / 200).
- [ ] **Step 2:** `pnpm test:e2e e2e/motion.spec.ts` → FAIL.
- [ ] **Step 3:** Thêm keyframes, token, variant; sửa `Dialog`, `Select`, `Shell`.
- [ ] **Step 4: Kiểm `ASSUMPTION` UBE21** (Playwright có làm tab ẩn được không): trong một test tạm, mở trang thứ hai cùng context, `bringToFront()`, đọc `document.visibilityState` của trang đầu. Nếu là `hidden`: thêm test `UBE21 a dialog closed while the tab is hidden is gone when the tab shows again` (đóng menu, đổi sang trang kia, chờ 1 giây, quay lại, sau hai khung hình `menu` 0). Nếu vẫn `visible`: xóa test tạm và chuyển UBE21 thành bước chạy tay ở Task 13. Ghi kết quả vào delivery.
- [ ] **Step 5:** `pnpm test`, `pnpm lint`, `pnpm test:e2e` → PASS.
- [ ] **Step 6: Commit** `feat(admin): animate dialogs, menus and the drawer only when motion is allowed`

### Checkpoint A: chủ dự án duyệt ảnh khung admin (UB11, UBC18)

- [ ] Tạo `e2e/visual.spec.ts` (chỉ chụp ảnh, không kiểm; `test.skip(process.env.VISUAL !== '1')` để CI không chạy), dùng `signedInAs` với dữ liệu giả, lưu `test-results/visual/<tên>-<project>.png` (thư mục đã bị git bỏ qua). Ảnh ở 1440 và 390 (VI; thêm EN ở 1440): đăng nhập, Lô nhập (có dữ liệu), Vai trò và staff, Xuất CSV, một trang "Tính năng chưa có", ngăn kéo mở (390), menu tài khoản mở, hộp "Hoàn tác lô". Chạy `VISUAL=1 pnpm test:e2e e2e/visual.spec.ts`; commit spec `test(admin): add an opt-in screenshot spec`.
- [ ] Gửi ảnh cho chủ dự án và **dừng** cho tới khi được duyệt. Sửa theo góp ý trước Task 6; mỗi lần sửa là một commit `fix(admin): …`.

### Task 6: `DetailPanel` (cạnh bảng từ 84rem, đè từ phải khi hẹp hơn)

**Files:**
- Create: `src/ui/use-media-query.ts`, `src/ui/use-retained.ts`, `src/ui/use-presence.ts`, `src/ui/DetailPanel.tsx`, `src/ui/detail-panel.test.tsx`, `src/ui/focus-row-link.ts`
- Modify: `src/styles/globals.css` (`@utility h-panel-sticky { height: calc(100dvh - 1.75rem); }`), `messages/{vi,en}.json` (`common.close`: "Đóng" / "Close")

**Interfaces:**
- Consumes: `usePanelSlot()` (Task 4), `--animate-panel-*` (Task 5).
- Produces:
  - `useMediaQuery(query: string, fallback: boolean): boolean` (`useSyncExternalStore` trên `matchMedia(query)`, nghe `change`; không có `window.matchMedia` thì trả `fallback`).
  - `useRetained<T>(value: T | undefined): T | undefined`: trả `value`, hoặc giá trị đã định nghĩa gần nhất khi `value` là `undefined` (giữ bằng state, không đọc `ref.current` lúc render: luật `react-hooks` 7).
  - `usePresence(isOpen: boolean, ref: RefObject<HTMLElement | null>): { isMounted: boolean; state: 'entering' | 'open' | 'exiting' }`: mở → mount, `entering` cho tới khi mọi `ref.current.getAnimations()` xong, rồi `open`; đóng → `exiting`, chờ `Promise.allSettled` của các animation (bị hủy vẫn tính là xong, khác React Aria) rồi unmount; không có `getAnimations` (jsdom) hoặc không có animation thì unmount ngay.
  - `PANEL_SPLIT_QUERY = '(min-width: 84rem)'`.
  - `DetailPanel({ isOpen, onClose, onExited, focusKey, title, status, footer, children }: { isOpen: boolean; onClose: () => void; onExited?: () => void; focusKey: string; title: ReactNode; status?: ReactNode; footer?: ReactNode; children: ReactNode })`. Đầu: `<h2 id={useId()} tabIndex={-1}>` (`text-lg font-extrabold wrap-anywhere`), `status`, nút ✕ (`aria-label` `common.close`); thân cuộn được; `footer` dính đáy (`border-t-2 border-border`). Focus vào `h2` khi mở và khi `focusKey` đổi (UBE24). Cả hai dạng có `data-testid="detail-panel"`.
    - Từ 84rem: `createPortal(<aside aria-labelledby=… tabIndex={-1} data-entering/data-exiting …>, panelSlot)`, `sticky top-3 h-panel-sticky w-panel border-l-2 border-border bg-surface`, animation `panel-in/out` qua `usePresence`; `Escape` trong `aside` gọi `onClose` trừ khi `event.defaultPrevented` hoặc sự kiện đến từ một dialog khác (`event.target` không nằm trong `aside` → bỏ qua, Review Focus 1); `onExited` gọi khi unmount xong.
    - Dưới 84rem: `ModalOverlay isOpen isDismissable` (`bg-ink/45`, animation overlay) + `Modal` `fixed inset-y-0 right-0 w-full max-w-panel bg-surface shadow-overlay-panel` (animation `panel-in/out`) + `Dialog aria-labelledby`; `onOpenChange(false)` gọi `onClose`.
  - `focusRowLink(href: string): void`: focus `a[href="<href>"]` đầu tiên đang hiện trong `main`, nếu không có thì `#page-title`.

- [ ] **Step 1: Viết test đỏ** `detail-panel.test.tsx` (stub `window.matchMedia` theo từng test):
  - `UB22 from 84rem the panel is a non-modal aside in the sheet's panel slot`.
  - `UB22 below 84rem the panel is a modal dialog`.
  - `Escape inside the side panel calls onClose; an Escape that bubbles from a nested dialog does not`.
  - `UBE24 opening focuses the panel title; a new focusKey focuses it again`.
  - `usePresence keeps the element while its exit animation runs, then unmounts; a cancelled animation still unmounts` (stub `getAnimations` trả animation có `finished` resolve muộn / reject).
  - `useMediaQuery follows change events`; `useRetained keeps the last defined value`.
  - `PANEL_SPLIT_QUERY matches --breakpoint-panel in globals.css`.
- [ ] **Step 2:** `pnpm test src/ui/detail-panel.test.tsx` → FAIL.
- [ ] **Step 3:** Viết các hook, `DetailPanel`, `focusRowLink` (khe panel đã có từ Task 4).
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(admin): add the detail panel that sits beside the table or slides over it`

### Task 7: Chi tiết lô nhập thành panel (UB8)

**Files:**
- Rename: `src/features/uploads/BatchPage.tsx` → `BatchPanel.tsx`, `BatchPage.test.tsx` → `BatchPanel.test.tsx` (`git mv`)
- Modify: `src/app/routes.tsx`, `src/features/uploads/UploadsPage.tsx`, `src/features/uploads/UploadsPage.test.tsx`, `messages/{vi,en}.json` (xóa `batch.back`), `e2e/batch.spec.ts`, `e2e-real/admin.real.spec.ts`

**Interfaces:**
- Consumes: `DetailPanel`, `useRetained`, `focusRowLink` (Task 6); `DataList rowHref/selectedKey`, `StatusBadge progress`, `Stat`, `StatTotal` (Task 3).
- Produces: `BatchPanel({ id, isOpen, onClose, onExited }: { id: string; isOpen: boolean; onClose: () => void; onExited: () => void })`. Route:

```tsx
<Route path="uploads" element={<UploadsPage />}>
  <Route path=":id" element={null} />
</Route>
<Route path="uploads/new" element={<UploadForm />} />   {/* Task 9 đưa vào trong */}
```

`UploadsPage`: `const isNew = useMatch('/uploads/new') !== null; const idMatch = useMatch('/uploads/:id'); const panelId = isNew ? undefined : idMatch?.params.id; const shownId = useRetained(panelId);` (`useMatch('/uploads/:id')` cũng khớp `new`, nên phải kiểm `isNew` trước). `DataList rowHref={(b) => \`/uploads/${b.id}\`} selectedKey={panelId}`; khi có `shownId` thì vẽ `<BatchPanel id={shownId} isOpen={panelId !== undefined} onClose={() => navigate('/uploads')} onExited={() => focusRowLink(\`/uploads/${shownId}\`)} />`.

`BatchPanel` lấy toàn bộ logic của `BatchPage` (polling, `useSubmitAction`, B25E28, tải rejected, `RevertDialog`, banner) và đổi cách vẽ theo mockup `.panel`: `title` tên file (đang tải: `common.loading`); `status` = `StatusBadge` (kèm `progress` khi `running`: `processed`/`row_count`) + dòng thời gian như hiện nay; thân: banner → lưới `grid-cols-2` gồm Tạo mới `primary`, Cập nhật `accent`, Không đổi `neutral`, Bị loại `danger` → `StatTotal` "Tổng" → câu số dòng bị loại → cảnh báo; `footer`: Publish (`primary`), Tải rejected.csv (`secondary`), Hoàn tác lô (`danger`), cùng điều kiện như hiện nay. Bỏ link "← quay lại". UBE27: giữ trạng thái trước trong `useRef` (đọc/ghi trong effect); khi đổi từ `queued`/`running` sang kết thúc thì `invalidateQueries({ queryKey: ['uploads'] })`.

- [ ] **Step 1: Viết test đỏ:**
  - `BatchPanel.test.tsx`: thêm handler danh sách `'GET /v1/admin/content/uploads?page_size=20'` (một mục `b1`) vào mọi `renderApp`; giữ mọi test hiện có; thêm `UBC12 /uploads/b1 shows the list and the panel, and the b1 row is selected`; `UBE26 ✕ returns to /uploads and focuses the row's link`; `UBE24 opening /uploads/b1 directly focuses the panel title`; `UBE24 an unknown id shows the error state in the panel and the list still works`; `UBE28 a 403 forbidden on the panel's poll for a user who lost the role ends at /login with "no access"` (`/me` lần hai trả người không có vai trò).
  - `e2e/batch.spec.ts`: thêm handler danh sách vào mọi test; câu trạng thái tìm trong `getByTestId('detail-panel')`; thêm:
    - `UBC12 at 1440 a row click opens the panel beside the table and the table stays clickable` (desktop).
    - `UB22 at 1280 the panel slides over the table as a modal and the table stays a table` (`setViewportSize(1280, 800)`: `table` hiện, không có `[data-testid=card]` hiện, panel có role `dialog`).
    - `UBE25 another row swaps the panel without a new entrance animation` (sau khi panel mở xong, bấm dòng 2: URL đổi, `getAnimations()` của panel không có animation nào).
    - `UBE26 Back closes the panel and returns to /uploads`.
    - `UBE27 the row's pill turns "Hoàn tất" when the panel's polling sees the batch finish` (danh sách trả `running` lần đầu, `succeeded` từ lần thứ hai).
    - `UBE29 at 390 the panel covers the screen and keeps focus inside` (mobile: rộng 390; Tab 10 lần vẫn trong panel).
    - `Review Focus 1: Esc in the revert dialog over the side panel closes only the dialog`.
    - `Review Focus 2: double-clicking a row leaves one history entry` (Back một lần → `/uploads`).
    - `Review Focus 3: resizing 1280 → 1440 → 1280 with the panel open keeps it open with no leftover overlay`.
  - `e2e-real/admin.real.spec.ts` luồng 3: các `getByText(vi.status.partial/succeeded)` tìm trong `getByTestId('detail-panel')`.
- [ ] **Step 2:** `pnpm test src/features/uploads` và `pnpm test:e2e e2e/batch.spec.ts` → FAIL.
- [ ] **Step 3:** Đổi route, viết `BatchPanel` từ `BatchPage`, sửa `UploadsPage`, xóa `batch.back`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` → PASS.
- [ ] **Step 5: Commit** `feat(admin): open a batch in a panel beside the uploads table`

### Task 8: Chi tiết publish job thành panel (UB8)

**Files:**
- Rename: `src/features/publish-jobs/PublishJobPage.tsx` → `PublishJobPanel.tsx`
- Modify: `src/app/routes.tsx`, `src/features/publish-jobs/PublishJobsPage.tsx`, `src/features/publish-jobs/PublishJobs.test.tsx`, `messages/{vi,en}.json` (xóa `publishJobs.back`), `e2e/publish-jobs.spec.ts`, `e2e-real/admin.real.spec.ts`

**Interfaces:**
- Consumes: như Task 7.
- Produces: `PublishJobPanel({ id, isOpen, onClose, onExited })` cùng hình dạng với `BatchPanel`. Route `publish-jobs` thành cha của `:id` (giữ `publish-jobs/new` ngoài như Task 7). `PublishJobsPage` làm như `UploadsPage` (`rowHref` `/publish-jobs/${j.id}`). Nội dung: `title` = `publishJobs.jobTitle`; `status` = `StatusBadge` (+ `progress` `processed`/`snapshot_count` khi `running`) + `publishJobs.createdAt`; thân: banner → lưới `grid-cols-3` gồm Đã publish `primary`, Đã publish trước đó `neutral`, Bị từ chối `danger` → `StatTotal` snapshot → câu bị từ chối; `footer`: Tải report.csv (`secondary`). UBE27 cho `['publish-jobs']`.

- [ ] **Step 1: Viết test đỏ:**
  - `PublishJobs.test.tsx`: thêm handler danh sách vào các test chi tiết; giữ mọi test hiện có; thêm `UBC12 /publish-jobs/<id> shows the list and the panel`.
  - `e2e/publish-jobs.spec.ts`: vòng axe giữ ba đường dẫn; thêm `UBE27 the job row turns "Hoàn tất" when the panel sees it finish`; `Review Focus 5: Back after "Publish lô này" in the batch panel reopens that batch's panel and polls again` (từ `/uploads/b1` bấm Publish → URL `/publish-jobs/<id>`; `goBack()` → `/uploads/b1`, panel hiện, số lần `GET …/uploads/b1` tăng).
  - `e2e-real`: câu trạng thái của job tìm trong `detail-panel`.
- [ ] **Step 2:** chạy → FAIL. **Step 3:** sửa như trên.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` → PASS.
- [ ] **Step 5: Commit** `feat(admin): open a publish job in a panel beside its table`

### Task 9: Ba form thành dialog giữ URL (UB9)

**Files:**
- Modify: `src/app/routes.tsx`, `src/app/nav.ts`, `src/features/uploads/{UploadsPage,UploadForm}.tsx`, `src/features/publish-jobs/{PublishJobsPage,PublishJobForm}.tsx`, `src/features/sources/SourcesPage.tsx`, `src/features/uploads/UploadForm.test.tsx`, `src/features/publish-jobs/PublishJobs.test.tsx`, `src/features/sources/SourcesPage.test.tsx`, `e2e/{uploads,publish-jobs,motion}.spec.ts`, `e2e-real/admin.real.spec.ts`

**Interfaces:**
- Consumes: `Dialog` (`actions?`, `size`) của Task 5.
- Produces: `UploadForm`, `PublishJobForm`, `SourceForm` nhận `{ onPendingChange?: (pending: boolean) => void }` (báo qua effect khi `pending` / `action.pending` / `mutation.isPending` đổi); thẻ `<form>` bỏ kiểu thẻ (`rounded-panel bg-surface p-4 shadow-card`), giữ hàng nút "Hủy"/gửi của chính nó. Route:

```tsx
<Route path="uploads" element={<UploadsPage />}><Route path="new" element={null} /><Route path=":id" element={null} /></Route>
<Route path="publish-jobs" element={<PublishJobsPage />}><Route path="new" element={null} /><Route path=":id" element={null} /></Route>
<Route path="sources" element={<SourcesPage />}><Route path="new" element={null} /></Route>
```

Mỗi trang danh sách luôn vẽ `<Dialog isOpen={isNew} onOpenChange={(open) => !open && navigate('<list>')} isDismissable={!formPending} title={t('<ns>.formTitle')} size=…>` với form bên trong (`uploads` và `publish-jobs` `md`, `sources` `lg`); `formPending` là state nhận từ `onPendingChange`. Vì `Dialog` luôn được vẽ, React Aria giữ form tới khi hiệu ứng đóng xong rồi mới gỡ, nên lần mở sau là form mới (khóa `Idempotency-Key` mới). `navLabelKey` bỏ `FORM_TITLES`: `h1` luôn là tên mục menu, tiêu đề form nằm trong dialog. Hộp "publish toàn bộ" lồng trong dialog giữ nguyên (UB23).

- [ ] **Step 1: Viết test đỏ:**
  - Unit: `UploadForm.test.tsx` thêm handler danh sách; `UBC13 "Upload CSV" opens a dialog over the list at /uploads/new; "Hủy" returns to /uploads`; `UBE32 a user with content.import but not content.edit opening /uploads/new sees the dialog as today, and no "Upload CSV" button`. `PublishJobs.test.tsx` và helper `confirmAll` của `e2e/publish-jobs.spec.ts`: hộp xác nhận tìm bằng `getByRole('dialog', { name: t.confirmAllTitle })` (giờ có hai dialog); `UBC13 /publish-jobs/new is a dialog over the list`. `SourcesPage.test.tsx`: `UBC13 a saved source closes the dialog and the list shows it`.
  - E2E `uploads.spec.ts`: test "upload success" đổi kiểm `h1` thành tiêu đề trong `dialog`; thêm `UBC13 a successful upload closes the dialog and opens the batch panel`; `UBE30 Back during a pending upload closes the dialog and the panel opens when the POST returns` (POST chậm 600ms; `goBack()` → `/uploads`, dialog 0; rồi URL `/uploads/batch-1`, panel hiện); `Esc and a click outside do not close the dialog while the upload is pending`; `UBE31 after upload the dialog closes and the panel opens with no overlay left` (chờ 400ms: chỉ còn panel).
  - `motion.spec.ts`: thêm Upload dialog vào vòng UBE22 (mở bằng nút, `Escape` ngay, ×10); `UB23 the upload dialog fades out in 150ms` (ngay sau `Escape` có `[data-exiting]` và animation 150ms; sau 400ms không còn dialog).
  - `e2e-real`: form nguồn và upload giờ nằm trong `dialog` (bộ chọn theo nhãn vẫn dùng được; kiểm lại khi chạy ở Task 12).
- [ ] **Step 2:** chạy → FAIL. **Step 3:** sửa route, ba trang, ba form, `nav.ts`.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` → PASS.
- [ ] **Step 5: Commit** `feat(admin): open the upload, publish job and source forms as dialogs over their lists`

### Task 10: Toast khi đổi hoặc gỡ vai trò (UB12)

**Files:**
- Create: `src/ui/Toast.tsx`, `src/ui/toast.test.tsx`
- Modify: `src/app/App.tsx`, `src/features/staff/StaffPage.tsx`, `src/features/staff/StaffPage.test.tsx`, `src/features/staff/test-utils.tsx` (`renderApp` vẽ thêm `<ToastRegion />`), `vitest.setup.ts` (`afterEach(() => toastQueue.clear())`), `messages/{vi,en}.json`, `e2e/staff.spec.ts`

**Interfaces:**
- Produces:
  - `type ToastContent = { text: string }`; `toastQueue = new UNSTABLE_ToastQueue<ToastContent>({ maxVisibleToasts: 3 })` (một bản cho cả app); `showToast(text: string): void` (`timeout: 5000`); `ToastRegion(): JSX.Element`: `UNSTABLE_ToastRegion` `fixed inset-x-4 bottom-5 z-60 flex flex-col items-center gap-2`, mỗi `UNSTABLE_Toast` `flex max-w-120 items-center gap-4 rounded-inner bg-ink px-4 py-3 text-ui text-on-primary shadow-toast motion-safe:animate-toast-in wrap-anywhere`, `UNSTABLE_ToastContent` chứa `Text slot="title"`, nút `slot="close"` chữ `common.close` màu `text-accent font-semibold`. Chỉ file này import `UNSTABLE_*`.
  - `App` vẽ `<ToastRegion />` trong `LocaleProvider`, ngoài `<BrowserRouter>` (Review Focus 4).
  - `StaffPage` `onDone`: `showToast(updated.staff_role ? t('staff.toast.granted', { role: updated.staff_role, email: updated.email }) : t('staff.toast.removed', { email: updated.email }))`; `RoleDialog` không đổi.
  - Chuỗi: `staff.toast.granted` VI "Đã cấp vai trò {role} cho {email}." / EN "Granted the {role} role to {email}."; `staff.toast.removed` VI "Đã gỡ vai trò của {email}." / EN "Removed the role from {email}." (theo mockup; câu cấp vai trò thêm `{role}` vì có hai vai trò để cấp).
- [ ] **Step 1: Viết test đỏ:**
  - `toast.test.tsx`: `UBE33 a toast closes itself after 5 s` (fake timers); `"Đóng" closes it at once`; `three toasts stack`.
  - `StaffPage.test.tsx`: `UBC14 granting editor shows "Đã cấp vai trò editor cho …"`; `UBC14 removing the role shows the removal toast`; `Review Focus 4: an admin who removes their own admin role still sees the toast after being moved off /staff`.
  - `e2e/staff.spec.ts`: `UBE33 the role toast is in a labelled region, and axe has no serious or critical violations`; `with reduced motion the toast appears with no animation`; `a 320-character email in the toast does not widen the page at 390`.
- [ ] **Step 2:** chạy → FAIL. **Step 3:** viết `Toast.tsx`, nối `App`, `StaffPage`, thêm chuỗi.
- [ ] **Step 4:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` → PASS.
- [ ] **Step 5: Commit** `feat(admin): confirm role changes with a toast`

### Task 11: B25E30, refresh bị 429 không làm mất phiên (UB10, hai commit)

**Files:**
- Create: `src/app/SessionLoading.tsx`
- Modify: `src/auth/session-store.ts`, `src/auth/session-store.test.ts`, `src/app/RequireSession.tsx`, `src/features/account/LoginPage.tsx`, `messages/{vi,en}.json`, `e2e/account.spec.ts`

**Interfaces:**
- Produces:
  - `SessionState` thêm `retryAt?: number` cho `loading` (`{ status: 'loading'; retryAt?: number }`, mốc thời gian ms của lần thử kế); `Notice` thêm `'rate-limited'`.
  - Constructor `opts` thêm `wait?: (ms: number) => Promise<void>` (mặc định `setTimeout`) và `now?: () => number` (mặc định `Date.now`). Hằng `REFRESH_TRIES = 3`, `REFRESH_RETRY_DEFAULT_S = 10`.
  - `runRefresh(): Promise<'ok' | 'failed' | 'rate-limited'>`: tối đa 3 lần gọi `POST /v1/auth/refresh`; lần 1, 2 bị 429 → số giây từ `Retry-After` (thiếu hoặc không phải số dương thì 10), nếu đang `loading` thì đặt `retryAt = now() + giây × 1000`, `await wait(giây × 1000)`, gọi lại; lần 3 bị 429 → `'rate-limited'`. Mã khác 2xx và khác 429 → `'failed'` như hiện nay. Các request đang chờ dùng chung promise này (`refresh()` đã gộp).
  - `'rate-limited'` ở cả lúc khởi động (`runBootstrap`) và giữa phiên (`authed`, nhánh 403 `forbidden` của `send`): `set({ status: 'signed-out', notice: 'rate-limited' })`, **không** gọi `POST /v1/auth/logout`, **không** broadcast (cookie còn hợp lệ, tab khác giữ phiên). `'failed'` giữ hành vi cũ.
  - `SessionLoading()`: `role="status"`, chữ `shell.loadingSession`; khi `state.retryAt` có thì thêm `shell.sessionRetry` với `seconds = max(0, ceil((retryAt − now) / 1000))`, đếm lùi bằng `useNow(1000, true)`. `RequireSession` và `LoginPage` dùng nó thay đoạn `<p role="status">` hiện có. `LoginPage`: notice `'rate-limited'` → `<Banner variant="info">{t('errors.rate-limited')}</Banner>` (chuỗi có sẵn).
  - Chuỗi `shell.sessionRetry`: VI "Máy chủ đang bận. Thử lại sau {seconds} giây…" / EN "The server is busy. Trying again in {seconds} s…".
- [ ] **Step 1: Viết test tái hiện lỗi** trong `session-store.test.ts`: `B25E30 a 429 from the bootstrap refresh keeps the session: wait Retry-After, refresh again, signed in` (refresh trả `rateLimited(2)` rồi `tokenResponse`; `wait` giả ghi lại số ms; kỳ vọng các lần chờ là `[2000]`, 2 lần refresh, state `signed-in`).
- [ ] **Step 2:** `pnpm test src/auth/session-store.test.ts` → FAIL (state `signed-out`). **Commit 1** chỉ gồm test: `test(admin): reproduce b25e30, a rate-limited refresh drops the session`.
- [ ] **Step 3: Viết thêm test đỏ:** `without Retry-After the store waits 10 s`; `three 429s in a row end signed-out with notice rate-limited, no POST /v1/auth/logout and no broadcast`; `mid-session a 401 whose refresh gets 429 waits, refreshes and retries the request once`; `while the store waits at start, the loading state carries retryAt`; `a 401 from refresh still signs out as before` (giữ). Component: `RequireSession shows "Thử lại sau 2 giây" while the store waits`. E2E `account.spec.ts`: `UBC17 a 429 on the first refresh shows the retry countdown, then the app opens /uploads` (refresh lần đầu 429 `Retry-After: 2`, sau đó token).
- [ ] **Step 4:** Sửa `session-store.ts`, viết `SessionLoading`, sửa `RequireSession`, `LoginPage`, thêm chuỗi.
- [ ] **Step 5:** `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e e2e/account.spec.ts` → PASS. **Commit 2:** `fix(admin): keep the session when the refresh is rate limited (b25e30)`.

### Task 12: Kiểm toàn app: chuyển động, axe, chữ dài, e2e thật

**Files:**
- Modify: `e2e/motion.spec.ts`, `e2e/ui-guidelines.spec.ts`, `e2e-real/admin.real.spec.ts` (nếu lần chạy lộ chỗ hỏng)
- Create: `e2e/a11y.spec.ts`

- [ ] **Step 1: Viết test đỏ** (hoặc xanh ngay, nếu các task trước đã đúng):
  - `motion.spec.ts` → `UBC15 nothing in the admin moves longer than 300ms, and page changes run no animation` (desktop và mobile): lần lượt mở/đóng menu tài khoản, ngăn kéo (mobile), dialog upload, panel lô, toast; sau mỗi lần lấy max của `transitionDuration`/`animationDuration` mọi phần tử (danh sách cách nhau dấu phẩy, `s`/`ms`) và `getAnimations()` (`effect.getTiming().duration`), **bỏ qua** animation lặp vô hạn (vòng xoay đang tải); kỳ vọng ≤ 300, và ≤ 250 với mọi thứ không phải toast. Bấm một mục menu: ngay sau đó số animation không lặp vô hạn là 0.
  - `a11y.spec.ts` → `axe has no serious or critical violations` cho VI/EN × (1440, 390) trên: `/login`, `/uploads`, `/uploads/b1`, `/uploads/new`, `/publish-jobs`, `/publish-jobs/<id>`, `/sources`, `/sources/new`, `/export`, `/staff` (sau khi đổi vai trò, có toast), `/ai/costs`.
  - `ui-guidelines.spec.ts` → `UBE35 a 60-character file name wraps inside the panel title, "Chi tiết" stays on one line and nothing scrolls sideways` ở 1440 và 1280.
- [ ] **Step 2:** `pnpm test:e2e` → sửa mọi chỗ đỏ (mỗi chỗ một commit `fix(admin): …`, test trước nếu là lỗi hành vi).
- [ ] **Step 3: Chạy e2e thật** theo `docs/deliveries/buoc-2-5-test-flow.md` §1–§2 (Docker, API + worker, `pnpm test:e2e:real`) → 7/7. Sửa bộ chọn nếu cần.
- [ ] **Step 4:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `VITE_API_BASE_URL=https://admin-api.wordmet.com pnpm build`, `pnpm test:e2e`, `pnpm test:e2e:real` → PASS; ghi số test.
- [ ] **Step 5: Commit** `test(admin): audit motion, accessibility and long names across the refreshed admin`

### Task 13: Kiểm cuối, rà soát, chạy tay, tài liệu, PR

**Files:**
- Modify: `docs/deliveries/ui-refresh-b.md` (as-built admin), `CLAUDE.md` (dòng UI refresh B: admin xong, trỏ delivery), `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md` §9 (một dòng: Figma `coVHz…` lỗi thời, xem design B)

- [ ] **Step 1:** Nếu PR #22 đã merge: **hỏi chủ dự án** rồi mới đưa `origin/dev` mới nhất vào nhánh (luật merge), sau đó chạy lại toàn bộ gate của Task 12 Step 4.
- [ ] **Step 2:** Rà soát trên app thật bằng `design:accessibility-review` và `design:design-critique`; báo phát hiện cho chủ dự án dưới dạng phương án, không tự sửa phần đã duyệt.
- [ ] **Step 3: Chạy tay "Xong khi"** (design §1): luồng "Xong khi" của Bước 2.5 (`docs/deliveries/buoc-2-5-test-flow.md` §2) trên admin mới ở 1440; thêm 1280 (panel đè), 390 (ngăn kéo, panel cả màn hình), bật giảm chuyển động; tải lại trang hơn 10 lần trong một phút để thấy B25E30 đếm lùi rồi vào lại; UBE21 bằng tay nếu Task 5 Step 4 chuyển sang chạy tay. Chụp ảnh 1440/1280/390 (VI, thêm EN ở 1440) gồm panel, dialog, toast; gửi chủ dự án duyệt (UB11). Ghi kết quả.
- [ ] **Step 4:** Cập nhật ba tài liệu. Commit `docs: record the admin refresh as-built`.
- [ ] **Step 5:** Quét secret trên `git diff <base>...HEAD`. Push `feat/ui-b-admin`; mở PR vào `dev` nếu PR #22 đã merge, nếu chưa thì mở PR với base `feat/ui-b-landing` và ghi trong mô tả "đổi base sang `dev` sau khi #22 merge". Báo nhánh, upstream, `git log --oneline <base>..HEAD`. **Không merge.**
