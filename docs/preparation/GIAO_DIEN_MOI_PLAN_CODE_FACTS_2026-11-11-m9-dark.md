# Giao diện mới M9, chế độ tối: code facts (11/11/2026)

**Source:** worktree `gm-plan-9` at HEAD `4bb42658` (= `origin/refactor/giao-dien-moi` @ `1c4c752e`, merge of PR #263, plus the docs-only
commits of plan Part 8). Every `path:line` below is on that tree. The UI audit of 11/11 was read from the main checkout
(`E:/Working/Working project/english-learning/docs/audit/2026-11-11-ui-audit/`; it is not in this tree). M8 is planned (Part 8) but not built:
anything said about M8 is a projection from the plan text, UNVERIFIED until M8 merges.

**Method.** `git grep`, `sed`, `grep` on the tree. Three throwaway Node scripts in the session scratchpad (not in the repo): (1) a key/value diff
of `web.css` against `web-dark.css`; (2) a scanner that strips `/* */` and `//` comments, then counts old-token utility classes
(`bg|text|border|ring|outline|fill|stroke|…-<theme.css colour>`, `rounded-<theme.css radius>`, `shadow-ledge*`, old motion utilities and
`var(--motion-*|--ease-*|…)`, `pastel-island`) and `var(--color-<old>)` in every `.ts`, `.tsx`, `.css` file under `apps/web/src`; it scans whole
file text, not only string literals, so a class name inside prose that survived comment stripping would be counted (none seen in the
sample column); (3) WCAG contrast arithmetic on token values (same formula as `web-tokens.test.ts:20-32`). Contrast numbers are arithmetic on
declared values, not measured in a browser. Controls: the diff script found all 68 `--color-wm-*` keys (15 base + 2 practice + 19 stage + 32
group); the scanner found the 406 old colour uses the M8 cleanup facts led me to expect, and `pastel-island` = 0 was cross-checked with a
raw `git grep` (only the comment `globals.css:5`). `node_modules` is absent in this worktree, so the Tailwind `dark:` default was read in
the main checkout's `apps/web/node_modules/tailwindcss` (4.3.3), which matches this tree's lockfile (`pnpm-lock.yaml:6854`,
`apps/web/package.json:58`). CI result of PR #263 read with `gh pr view 263` (all four checks SUCCESS).

## 0. Big picture

Surprises first.

1. **The white glow on Nhóm is one class with a light-only colour.** `.gcar-halo` (`apps/web/src/app/globals.css:730-737`: absolute,
   `border-radius: 50%`, `filter: blur(60px)`, `opacity: 0.9`) is painted with the group's `-wash` class, behind the carousel
   (`features/learner/groups/GroupCarousel.tsx:95`) and behind the stack and title of Một nhóm (`GroupPage.tsx:163`, `-z-10`). The dark value of
   every `--color-wm-group-N-wash` is the light formula `color-mix(in srgb, <colour> 12%, #ffffff)` (`packages/design-tokens/web-dark.css:49,
   53, 57, 61, 65, 69, 73, 77`), which computes to `#e3f2f0`…`#fcece8`: near white. Dark `--color-wm-ink` `#eceef5` on it is 1.00–1.05:1, so
   the group title disappears. The selected row of the group picker uses the same token (`GroupPicker.tsx:189`) with the name in
   `text-wm-ink` (`:194`), so it is also ~1:1 (arithmetic; no dark shot of the picker exists, as the audit says).
2. **Axe in CI does not catch it.** `e2e/app/m2.spec.ts:202-206` (Hôm nay, `groups`, `group?id=`) and `e2e/app/cai-thien-a-group.spec.ts:103-118`
   (`group?id=`) run `seriousViolations` in dark at 390 and 1440, not skipped, and the web job (lint, unit, build, e2e; `ci.yml:105`) of PR #263
   was SUCCESS. So these pages pass axe in dark while the title sits at ~1:1. Why axe misses it (blurred, absolutely positioned halo; possibly
   reported as "incomplete", which the helper ignores, `e2e/support/axe.ts:26-28`) is UNVERIFIED. M9 cannot lean on axe for halos and glows.
3. **54 of the 68 dark colour keys are copies of the light value** (diff script): all 19 stage keys (`web-dark.css:25-43`), all 32 group keys
   (`:47-78`), `practice` (`:20`, ruling R124 "tạm"), and `mark`, `mark-ink` (`:13-14`, which Figma Dark really has equal, design §7.2).
   Only 14 keys have a dark value: the 13 Figma ones plus `practice-ink` `#e0b450` (`:21`, R124, temporary). Group `-ink` on the dark surface
   `#171b2a` is 2.17–3.61:1 (below 3:1 for six of eight), and it colours the big waiting numbers: `TodayPage.tsx:136`, `GroupStack.tsx:62`,
   `GroupPage.tsx:188`, `GroupPicker.tsx:199`. Group `-soft` (50 % white) gives pastel borders to the cards behind each stack
   (`GroupStack.tsx:52`) and to the picker trigger (`GroupPicker.tsx:45`).
4. **Only six stage colours matter in dark.** Code uses only `bg-wm-stage-{0..4}-dot` and `bg-wm-stage-5-solid` (one `STAGE_*` array in each of
   7 files, §3.3). `stage-N-bg`, `stage-N-ink`, `stage-5-bg` and `stage-5-dot` (the gradients) are read only by `web-tokens.test.ts:99-107`.
   The six used colours already reach 4.98–7.63:1 on the dark surface.
5. **No dark shadows exist, and the only proposal covers 3 of 9.** `web-dark.css` holds colour keys only (68 keys, 0 shadow keys). The 9
   `--shadow-wm-*` (`web.css:38-47`) are navy `rgb(27 36 68 / …)` or accent, pass, fail; navy `#1b2444` is *lighter* than the dark bg
   `#0f1220` and surface, so in dark they read as a faint haze, not a shadow. Uses: 91 in 58 files (`card` 54, `pop` 12, `row` 8, `lift` 5,
   `soft` 5, `btn` 4, `btn-pass` 1, `btn-fail` 1, `pro` 1). Raw navy shadows in `globals.css`: `.gstack-face` `:597`, `.lk-paper` `:830`,
   `.lk-card` `:845`. The dark mockup page proposes only `--sh-card`, `--sh-pop`, `--sh-btn` (`docs/mockups/2026-11-05-redesign-concepts/toi-5-man.html:25-28`).
6. **The five dark mockups are not recorded as approved, and they predate the mesh.** Delivery record: "mockup tối chờ chủ dự án duyệt"
   (`docs/deliveries/giao-dien-moi.md:250`); artifact link `:239`. The page itself asks for the dark shadows, the seven group colours and the
   stage colours to be decided "trước M9" (`toi-5-man.html:110`); it draws the old dot grid (`:46-47`), not the mesh (QBG, 10/11), and has no
   carousel halo; its group colours are the light ones (`:118-120`, `:133-135`). Design §14 needs "5 mockup tối đã duyệt" (`design:900`).
7. **`color-scheme: dark` and two global rules still come from the old set.** `color-scheme: dark` is only in `packages/design-tokens/dark.css:6`
   (grep `color-scheme` over `apps/web`, `packages`: that line plus `dark-pastel.css:52,81`, which is not imported). `body` reads old
   `--color-surface` and `--color-ink` (`globals.css:514-515`; dark `#242b3d`, `#eceef5` from `dark.css:15,18`), and the global focus ring is old
   `--color-primary` (`:527`; dark `#8da2ff`). The `/app` root wrapper is old `bg-canvas text-ink` (`app/[locale]/app/layout.app.tsx:55`; dark
   `#10131c`), not `wm-bg` `#0f1220`. The polish round (before M9) owns moving these (`docs/deliveries/giao-dien-moi.md:186-189`); M9 can only
   delete `dark.css` after `globals.css:4` and `styles/tokens.test.ts:9` stop reading it.
8. **Seven places use `bg-wm-ink` as a dark fill, which turns light in dark** (`#eceef5`), most with `text-wm-surface` text:
   `app-chrome/CalendarButton.tsx:82` (tooltip), `calendar/DayDialog.tsx:190` (filter tab), `groups/GroupPage.tsx:259` (filter chip),
   `practice/session/HintPanel.tsx:47,57`, `today/TodayPage.tsx:104,121` (legend square, "đến hạn" bar segment). The audit lists these
   (code-consistency.md:350-351).
9. **Tra từ's paper stays light in dark but its focus ring does not.** `.lk-paper` is raw `#fbfaf6` (`globals.css:826-831`), and dark rules re-set
   only `text-wm-ink`, `text-wm-muted`, `text-wm-accent`, `border-wm-ink` (`:834-837`, R71, R80, R81). `DictionaryPage.tsx` also uses
   `outline-wm-accent` (3 times) and `bg-wm-ink/4`; dark `#8da2ff` on `#fbfaf6` is 2.30:1, under 3:1 for a focus indicator.
10. **The browser bar follows the OS, not the in-app choice.** `viewport.themeColor` uses `media: '(prefers-color-scheme: dark)'`
    (`app/[locale]/layout.tsx:38`; still the old navy `#121833` / `#1b2444`); `manifest.ts:9-10` has one colour `#faf8f5`. M8 Part 8 changes the
    values to `#f6f7fa` / `#0f1220` (plan `:3626`) but keeps the media-query mechanism.
11. **Tailwind `dark:` would ignore the toggle.** No `dark:` variant and no `@custom-variant dark` exist in `apps/web/src` (only
    `@custom-variant placement-top`, `globals.css:370`). Tailwind 4.3.3's default `dark` variant is `@media (prefers-color-scheme: dark)`
    (`tailwindcss/dist/lib.js`, main checkout), so any `dark:` class added in M9 follows the OS, not `data-theme`.
12. **Dark screenshots exist only for `gm-m1`.** `shots.spec.ts` shoots dark only in `gmM1` (`:131-167`: login, Hôm nay, Nhóm, Một nhóm, Cài đặt
    at 390, 1440); `gm-m2` sets light (`:174`); `gm-m3`, `gm-m4`, `gm-m6`, `gm-m7a`, `gm-m7b` never call `emulateMedia` (Playwright default
    light). `gm-m5a`, `gm-m5b` were temporary spec files, not committed (`giao-dien-moi.md:399-402, 440`). No `gm-m9` set.

## 1. `web.css` against `web-dark.css`

### 1.1 Key sets

| Prefix | `web.css` | `web-dark.css` |
|---|---|---|
| `--color-wm-*` | 68 | 68 (same names; `web-tokens.test.ts:40-43` pins parity) |
| `--radius-wm-*` | 9 | 0 |
| `--shadow-wm-*` | 9 | 0 |
| `--text-wm-*` (incl. `--line-height`, `--letter-spacing`, `--font-weight`) | 84 | 0 |
| `--blur-wm-*` | 5 | 0 |
| `--transition-duration-wm-*` | 12 | 0 |
| `--ease-wm-*` | 6 | 0 |
| `--animate-wm-*` | 1 (`pulse`, with `@keyframes wm-pulse`, `web.css:224-230`) | 0 |

`web.css` is one `@theme { … }` block (`:4-231`), so utilities read `var(--…)` and a `[data-theme='dark']` override works for any key, as it
already does for colours. `web-dark.css` is one `[data-theme='dark'] { … }` block (`:3-79`) and declares no `color-scheme`.

### 1.2 Colour keys with a real dark value (14)

`bg` `#0f1220`, `surface` `#171b2a`, `ink` `#eceef5`, `muted` `#a6adc4`, `ghost` `#353c53`, `line` `#2a3044`, `accent` `#8da2ff`,
`accent-soft` `#1f2747`, `on-accent` `#0f1220`, `pass` / `pass-soft` `#62c98f` / `#142a1e`, `fail` / `fail-soft` `#ff8d80` / `#311a18`
(`web-dark.css:4-18`, Figma Dark, design §7.2), and `practice-ink` `#e0b450` (`:21`, chosen in code, R124).

### 1.3 Colour keys that copy the light value (54)

| Group | Lines | Status in code comments and docs |
|---|---|---|
| `mark` `#ffd84a`, `mark-ink` `#1b2444` | `web-dark.css:13-14` | Equal in Figma Dark too (design §7.2 table); not temporary |
| `practice` `#d99a17` | `:20` | "No dark mockup yet (GM4, M9)" (`:19`); R124 "tạm" |
| 19 stage keys (`stage-0..4-bg/dot/ink`, `stage-5-bg/dot/ink/solid`) | `:25-43` | "Same light values until the dark mockups (GM4, M9)" (`:23`); design §7.3 (`design:405`) |
| 32 group keys (`group-0..6`, `-soft`, `-wash`, `-ink`; `group-empty*`) | `:47-78` | No comment in the dark file; design §7.4 "Bản Dark của bảy màu chốt cùng mockup tối" (`design:422`) |

Shadows: none in the dark file; header comment "Dark shadows wait for the dark mockups (GM4, M9)" (`web-dark.css:1-2`); R161 "`web-dark.css`
chưa có bóng tối (GM4)" (`rulings:191`).

### 1.4 Dark contrast arithmetic (not in any test unless marked)

| Pair | Ratio |
|---|---|
| Tested `TEXT_PAIRS` in dark (`web-tokens.test.ts:34-37`) | ink/bg 16.06, ink/surface 14.77, muted/bg 8.33, muted/surface 7.66, on-accent/accent 7.75, accent/surface 7.13, pass/pass-soft 7.44, fail/fail-soft 7.26, mark-ink/mark 10.98 |
| Group colour on dark surface (`#e5603f`, `#149384`, `#7a55d3`, `#d99a17`, `#4a9637`, `#d2427a`, `#2a86d1`, empty `#64708c`) | 4.95, 4.51, 3.32, 7.00, 4.65, 3.91, 4.43, 3.46 |
| Group `-ink` on dark surface (same order) | 2.74, 2.67, 2.17, 3.61, 2.80, 2.32, 2.71, 2.52 |
| Dark `ink` on group `-wash` (light formula) | 1.00–1.05 |
| Stage dots used in code on dark surface (`0..4-dot`, `5-solid`) | 6.72, 4.98, 6.63, 7.63, 5.00, 6.55 |
| Stage `-ink` on dark surface (unused in code) | 1.47–2.52 |
| `practice` / `practice-ink` on dark surface | 7.00 / 8.82 |
| `ghost`, `line` on dark surface (borders) | 1.57, 1.31 |
| Dark `accent` on `.lk-paper` `#fbfaf6` (focus ring) | 2.30 |

### 1.5 What the tests check for dark

`apps/web/src/styles/web-tokens.test.ts`:
- `:40-43` the two files have exactly the same `--color-wm-*` keys.
- `:45-49` the 9 `TEXT_PAIRS` reach 4.5:1 in light and in dark. The `luminance` helper (`:20-24`) parses `#rrggbb` only; no pair touches a
  `color-mix` or gradient value.
- `:62` pins dark `accent` `#8da2ff`.
- Not checked for dark: group colours, `-ink` (checked only in light, on white, `:122-125`), `-wash`, `-soft`, stage, `practice*`, `ghost` and
  `line` as 3:1 control colours, and shadows (the shadow count `:57` reads `web.css` only).

`apps/web/src/styles/app-background.test.ts:34-39` checks the light grain (`opacity .4`, `multiply`); the dark branch (`screen`, `.12`) is
not checked.

`apps/web/src/styles/tokens.test.ts` (old set) still checks dark for `dark.css`: parity with `theme.css` (`:79-82`), app pairs in light and
dark (`:84-90`), the pastel variant (`:120-136`), `island.css` (`:138-152`), navy cards in both themes (`:154-161`).

## 2. How dark mode is switched

| Piece | Where | What it does |
|---|---|---|
| Stored choice | `app-shell/theme/theme.ts:5` | `localStorage['wordmet-web.theme']` = `light` / `dark` / `system`; read and write guarded (`:8-23`); `resolveTheme` (`:25-27`) |
| First paint | `app-shell/theme/theme-script.ts:3-4` | Inline script sets `document.documentElement.dataset.theme` from storage or `prefers-color-scheme`; CSP hash `:6` (recomputed by `theme-script.test.ts`) |
| Script mounted | `app/[locale]/app/layout.app.tsx:52` (every `/app` route); `app/[locale]/(site)/layout.tsx:23` (public pages) | Both also mount `ThemeProvider` (`AppProviders.tsx:48`; `(site)/layout.tsx:24`) |
| After hydration | `app-shell/theme/ThemeProvider.tsx:39-63` | `useSyncExternalStore` over storage, `matchMedia('(prefers-color-scheme: dark)')` (`:9`, `:16`) and the `storage` event (other tabs); writes `data-theme` (`:44-46`); deletes it on unmount (`:49-54`) so a client navigation to the other layout does not keep it |
| Cài đặt | `features/learner/settings/SettingsPage.tsx:62, 161-177` | `Segmented` with Sáng / Tối / Theo hệ thống |
| Avatar menu | `app-chrome/AvatarMenu.tsx:40, 45, 78-81` | One item toggles to explicit `dark` or `light` (never back to `system`); R12 (`rulings:23`) |
| Landing header | `app-chrome/ThemeToggle.tsx:18-44` via `components/landing/LandingHeader.tsx:2, 34` | Same toggle, old-token styling (`text-on-navy hover:bg-navy-raised ring-accent`, `:36`). M8 moves it to `site/layout/ThemeToggle.tsx` restyled in `wm-` (plan `:3361`) and adds a phone "Giao diện" control in the footer (plan `:3439`) |
| Root `<html>` | `app/[locale]/layout.tsx:47-50` | `suppressHydrationWarning`; no `data-theme` from the server |
| Browser bar | `app/[locale]/layout.tsx:38`; `app/manifest.ts:9-10` | Follows the OS via media query; old navy values (surprise 10) |

`prefers-color-scheme` appears only in `ThemeProvider.tsx:9`, the theme script, and `layout.tsx:38`; no CSS media query reads it
(`grep prefers-color globals.css`: none).

**Old `dark.css` wiring today:** imported globally at `globals.css:4` (comment `:3` says only the learner app sets `data-theme`; stale, the
public layout does too). Its rules are scoped `[data-theme='dark'] { … }` (`dark.css:5`), so they apply on `/app` and on the public pages, never
in admin (admin never sets `data-theme`: `git grep "data-theme|dataTheme" apps/admin` is empty). It sets `color-scheme: dark` (`:6`) and the dark
value of every `theme.css` colour (`:7-44`), so every old colour class still in `apps/web/src` (§5.3) is themed by it.

## 3. Places in `apps/web/src` that ignore dark

### 3.1 Raw colours

No `bg-white`, `text-white`, `white/`, `black`, `rgb(255…` class or arbitrary `[#…]` value in any `.ts`/`.tsx` (grep of every
`(bg|text|border|ring|…)-(white|black)` form: 0). No inline colour style (`style={{…}}` with colour: 0; the only `style` hit is the width in
`ui/StageBar.tsx:45`). Hex literals in `.tsx`/`.ts`:

| File | What | Dark relevance |
|---|---|---|
| `app/[locale]/layout.tsx:38` | `themeColor` `#121833` (dark media) / `#1b2444` | Old navy; OS-driven (surprise 10); M8 changes values |
| `app/manifest.ts:9-10` | `#faf8f5` | One colour; M8 changes to `#f6f7fa` |
| `app/[locale]/opengraph-image.tsx:34-44`, `app/apple-icon.tsx:10-12` | Image colours | None (images); M8 redoes them |
| `ui/Flag.tsx:7-18`, `ui/GoogleButton.tsx:27-30` | Flag and Google brand colours | None (fixed brand art) |

Hex and raw `rgb` in `globals.css` (excluding the grain `data:` URI): `.lk-paper` `#fbfaf6`, border `#e8e4d8`, text `#1b2444` (`:826-831`);
dark-mode overrides `#1b2444`, `#525a78`, `#1e3a8a` (`:834-837`); `.lk-rule` `#e8e4d8` (`:838`); `.lk-entry[aria-current]` navy outline and
background (`:841-843`); `.lk-card` shadow (`:845`); `.gstack-face` navy contact shadow (`:597`). The `globals.css` `@theme` block also defines old
app shadows over old colour variables (`--shadow-sheet`, `-button*`, `-dialog`, `-menu`, `-toast`, `-soft-card`, `:117-127`), used only in
`app-ui/` (Button 3, Select 1, StreakToast 1) and `components/` (6 files).

### 3.2 Tailwind `dark:` variants

None (surprise 11).

### 3.3 `wm-` tokens whose dark value is wrong or still light, by screen

| Screen / component | Location | Token | Effect in dark (arithmetic) |
|---|---|---|---|
| Nhóm carousel halo | `groups/GroupCarousel.tsx:44, 95`; `globals.css:730-737` | `bg-wm-group-N-wash` | Near-white blurred blob (surprise 1) |
| Một nhóm head halo | `groups/GroupPage.tsx:142, 163` | same | Title ~1:1 (audit compare-m3-m4 #3) |
| Group picker selected row | `groups/GroupPicker.tsx:177, 189` | same | Name ~1:1 |
| Stack cards behind, picker trigger | `groups/GroupStack.tsx:52`; `groups/GroupPicker.tsx:45` | `border-wm-group-N-soft` | Pastel borders on dark cards |
| Waiting numbers | `today/TodayPage.tsx:136`; `groups/GroupStack.tsx:62`; `groups/GroupPage.tsx:188`; `groups/GroupPicker.tsx:199` | `text-wm-group-N-ink` | 2.17–3.61:1 on surface |
| Stack face tinted shadow | `globals.css:596-598` (`--gstack-tone` `:913-920`) | group colour 70 % | Coloured glow under every stack (by design in light; dark look unreviewed) |
| Stage dots and squares | `add-word/GroupPicker.tsx:120`, `groups/GroupPage.tsx:53`, `practice/CustomizeDialog.tsx:58`, `practice/WeakWordsPage.tsx:26`, `practice/session/AnswerFeedback.tsx:14`, `today/TodayPage.tsx:256`, `word/LearningBlock.tsx:16` | `bg-wm-stage-*-dot`, `-5-solid` | Readable (4.98–7.63:1); light values |
| Practice dot and count | calendar (R124) | `practice`, `practice-ink` | Readable (7.00, 8.82); values temporary |
| Ink fills | 7 sites in surprise 8 | `bg-wm-ink` (+ `text-wm-surface`) | Become light chips |
| Every card, row, popover, button | 58 files | `shadow-wm-*` | Light navy shadows (surprise 5) |
| Tra từ paper | `lookup/DictionaryPage.tsx:39, 97`; `globals.css:826-845` | raw + `outline-wm-accent`, `bg-wm-ink/4` | Paper light by ruling; focus ring 2.30:1 |
| Mesh background | `globals.css:424-444` | `wm-bg`, `accent`, `mark`, `pass` | See §4 |
| Auth glows | `globals.css:447-460` | `accent`, `mark`, `surface` mixes | Follow tokens; dark look unreviewed beyond the `gm-m1` login shot |

Readable as is (checked): toasts `bg-wm-pass` / `bg-wm-fail` with `text-wm-surface` (`ui/Toast.tsx:45-46`); dialog overlay
`bg-wm-mark-ink/30` (`ui/Dialog.tsx:43`, `calendar/CalendarModal.tsx:31`, navy in both modes by R10); glass bars `bg-wm-surface/80|90`
(`TopBar.tsx:29`, `PhoneHeader.tsx:14`, `MobileTabBar.tsx:17`). Every `bg-wm-mark` keeps `text-wm-mark-ink` except a decorative dot
(`auth/AuthShowcase.tsx:20`).

### 3.4 New code still on the old token set (themed by `dark.css`)

From the scanner (production files outside `app-ui/` and `components/`): `app/[locale]/app/layout.app.tsx:55` (`bg-canvas text-ink`, 2);
`app-shell/AppProviders.tsx:67-69` (`OfflineBand`: `bg-danger-soft text-ink`, `text-primary`, 3); `features/learner/groups/highlight.tsx:18`
(`text-primary`, the target word on Học and "Thêm câu"; dark `#8da2ff`); `ui/PronunciationLine.tsx` (`text-muted text-ink`, 2);
`app-chrome/Logo.tsx` (4) and `app-chrome/ThemeToggle.tsx` (3 colour, 1 radius), both landing-only; `app/[locale]/(site)/not-found.tsx` (2);
`practice/session/ReportDialog.tsx:133` (`rounded-control`), `practice/session/SessionNotice.tsx:64` (`rounded-sm`, 8 px from `theme.css`,
4 px Tailwind default without it). These are the polish round's item 6 (`giao-dien-moi.md:190-193`).

Also dead: `auth/AuthShowcase.tsx:17` uses class `dot-grid`, which has no CSS any more (`app-background.test.ts:22` asserts the utility is
gone; `git grep dot-grid` finds no definition). The sign-in brand panel's dot layer renders nothing in either mode.

## 4. `DotGridBackground` (mesh + grain)

- Component: `apps/web/src/ui/DotGridBackground.tsx:5-7`, one `div` with `app-mesh pointer-events-none fixed inset-0 -z-10`, `aria-hidden`.
  Comment `:2-3`: name kept until M9.
- Import sites (4 production + 1 test):
  - `app-chrome/AppChrome.tsx:5, 23` (every tab page; parent `relative isolate`, `:22`);
  - `app-chrome/CardFrame.tsx:6, 26` (card sign-in pages and onboarding);
  - `app/[locale]/app/(member)/(focus)/layout.app.tsx:3, 10` (sessions);
  - `features/learner/auth/SplitFrame.tsx:9, 20` (login, register);
  - test `ui/actions.test.tsx:5, 52-61`.
  Each parent is `relative isolate`, so the fixed `-z-10` layer paints above the root wrapper's old `bg-canvas`. Docs naming the component:
  design `:459`, plan (7 hits), decisions QBG `:331`, 9 earlier facts files. Stale "dot grid" wording remains in comments `AppChrome.tsx:16`,
  `CardFrame.tsx:22`, `(focus)/layout.app.tsx:5`.
- CSS: `@utility app-mesh` (`globals.css:424-444`). Background colour `--color-wm-bg`; four radial halos `accent` 20 %, `mark` 34 %, `pass` 18 %,
  `accent` 12 % (`:427-430`). In dark these resolve to `#8da2ff`, `#ffd84a` (mark has no dark value, so the yellow halo is the same strength
  as in light), `#62c98f`, `#8da2ff` over `#0f1220`.
- Grain: `::before` SVG `feTurbulence` in a `data:` URI, colour matrix navy (`0.1 0.14 0.27`, alpha `.45`), `opacity 0.4`, `multiply`
  (`:431-438`). Dark: `html[data-theme='dark'] &::before { mix-blend-mode: screen; opacity: 0.12; }` (`:439-443`), comment "Dark is tuned
  with the dark mockups in M9". Decision QBG records the 12 % screen as temporary (`decisions:331-332`).
- Neighbours on the same pages: `auth-card-glow` (`:447-452`, `accent` 16 %, `mark` 26 %, blur `--blur-wm-md`) and `auth-panel-glow`
  (`:455-460`, includes `surface` 70 %).

## 5. Old token files

### 5.1 Who imports or reads each

| File | `apps/web` | `apps/admin` | Tests | Package `exports` |
|---|---|---|---|---|
| `theme.css` | `globals.css:2` | `src/styles/globals.css:2` | web `styles/tokens.test.ts:6`, `styles/text-classes.test.ts:9`; admin `src/styles/tokens.test.ts:8` | `package.json:6` |
| `dark.css` | `globals.css:4` | no | web `styles/tokens.test.ts:9` | `:7` |
| `dark-pastel.css` | no (asserted, `tokens.test.ts:125-127`) | no | web `tokens.test.ts:122-135` | `:8` |
| `island.css` | `globals.css:6` | no | web `tokens.test.ts:140-152` (`:142-144` asserts the import) | `:9` |

Admin imports only `theme.css` (`git grep design-tokens apps/admin`: `globals.css:2`, `tokens.test.ts:8`, `package.json:19`). It imports
neither `dark.css`, `island.css` nor `dark-pastel.css`, and never sets `data-theme`. Other references: `Dockerfile:28` copies the package
`package.json`; `packages/design-tokens/README.md:56-78` documents the dark, pastel and island files and `:110` says the old set stays "until
its old screens are gone (M8)" (now the polish round).

### 5.2 Classes and variables still used in `apps/web/src`

- `island.css`: `pastel-island` / `md:pastel-island` used 0 times (only the comment `globals.css:5`). Dropping it changes nothing visible.
- `dark-pastel.css`: nothing (not imported).
- `dark.css`: defines no class; it re-themes every old colour token, so its reach = the old colour uses below.
- `theme.css` (scanner totals, `apps/web/src`): 406 old colour uses in 36 production files (+3 test files), 49 old radius, 15 `shadow-ledge*`,
  61 old motion uses. Most-used: `text-ink` 97, `text-muted` 34, `bg-surface` 31, `text-primary` 20, `text-on-navy` 15, `bg-primary-soft` 14,
  `border-border` 12, `bg-accent` 11.

### 5.3 Per file (production; colour / radius / ledge shadow / motion)

| Area | File | Counts |
|---|---|---|
| `globals.css` | `app/globals.css` | 20 / 0 / 0 / 45 (body, focus ring, old app shadows, old animations) |
| New code | `app/[locale]/app/layout.app.tsx` | 2 / 0 / 0 / 0 |
| | `app-shell/AppProviders.tsx` | 3 / 0 / 0 / 0 |
| | `features/learner/groups/highlight.tsx` | 1 / 0 / 0 / 0 |
| | `ui/PronunciationLine.tsx` | 2 / 0 / 0 / 0 |
| | `features/learner/practice/session/ReportDialog.tsx`, `SessionNotice.tsx` | 0 / 1 / 0 / 0 each |
| | `app-chrome/Logo.tsx` | 4 / 0 / 0 / 0 |
| | `app-chrome/ThemeToggle.tsx` | 3 / 1 / 0 / 0 |
| | `app/[locale]/(site)/not-found.tsx` | 2 / 0 / 0 / 0 |
| `app-ui/` (polish round) | `Button.tsx` | 20 / 1 / 2 / 2 |
| | `Select.tsx` | 15 / 3 / 0 / 0 |
| | `States.tsx` | 17 / 3 / 0 / 0 |
| | `Locked.tsx` | 4 / 0 / 0 / 0 |
| | `StreakToast.tsx` | 4 / 0 / 0 / 2 |
| `components/` (M8 rewrites) | `landing/exercises/ExerciseGallery.tsx` | 58 / 7 / 1 / 2 |
| | `landing/MetOutside.tsx` | 20 / 4 / 2 / 0 |
| | `landing/ReviewTiming.tsx` | 18 / 2 / 0 / 0 |
| | `landing/WhyForget.tsx` | 18 / 1 / 0 / 0 |
| | `landing/showcase/ReviewCardDemo.tsx` | 18 / 1 / 1 / 1 |
| | `sections/LegalDocument.tsx` | 18 / 0 / 0 / 0 |
| | `landing/showcase/LookupDemo.tsx` | 15 / 2 / 0 / 0 |
| | `landing/Plans.tsx` | 14 / 5 / 1 / 0 |
| | `landing/showcase/AppShowcase.tsx`, `GroupsDemo.tsx`, `sections/SourcesList.tsx` | 11 each (radius 2, 2, 0) |
| | `landing/showcase/PracticeDemo.tsx` | 10 / 2 / 1 / 0 |
| | `landing/showcase/AddWordDemo.tsx` | 8 / 3 / 1 / 0 |
| | `landing/Faq.tsx` | 7 / 2 / 0 / 1 |
| | `landing/Hero.tsx`, `LandingHeader.tsx` | 6 each (radius 0, 2) |
| | `landing/ExercisesSection.tsx`, `FinalCta.tsx`, `layout/Logo.tsx`, `layout/SiteFooter.tsx` | 4 each |
| | `sections/LegalDraft.tsx` | 3 |
| | `layout/SkipLink.tsx` | 2 / 1 |
| | `ui/Button.tsx` | 23 / 1 / 3 / 2 |
| | `interactive/Reveal.tsx` | 0 / 0 / 0 / 2 |

Tests with old classes: `components/ui/ui.test.tsx` (15), `components/interactive/reveal.test.tsx` (motion 2), `styles/tokens.test.ts` (1).

## 6. The white glow on Nhóm in dark (audit compare-m3-m4 #3)

Audit text: "Quầng sáng trắng lớn sau băng chuyền Nhóm và sau tiêu đề Một nhóm, chữ tiêu đề chìm vào quầng" (`compare-m3-m4.md:32-34`, `:304-306`;
README `:52`, `:77`). Cause in code, step by step:

1. `groupTone(id, total)` returns static class strings; `wash` is `bg-wm-group-N-wash` (`lib/group-color.ts:15-37`; empty group:
   `bg-wm-group-empty-wash`, `:30`).
2. The carousel draws `<div className="gcar-halo {wash}">` behind the track for the centre group (`GroupCarousel.tsx:44, 95`); Một nhóm draws
   the same behind its head section (`GroupPage.tsx:142, 163`, `-z-10` inside `relative isolate`, `:162`).
3. `.gcar-halo` is a large ellipse, `blur(60px)`, `opacity: 0.9`, background-colour transition 700 ms (`globals.css:730-737`).
4. In dark, `--color-wm-group-N-wash` stays `color-mix(in srgb, <colour> 12%, #ffffff)` (`web-dark.css:49-77`): 88 % white.
5. The head title and meta use `text-wm-ink` / `text-wm-muted`, which are light in dark, so they sit on a near-white field.

Fix options are a token decision (a dark `-wash` mixed toward the dark surface, or a lower halo opacity in dark), not a component change;
which one is for the owner with the dark mockups. The same `-wash` token feeds the picker row (`GroupPicker.tsx:189`).

## 7. Screenshot and e2e tooling for dark

- `apps/web/playwright.shots.config.ts`: one Desktop Chrome project, `testDir ./e2e-shots`, base URL `SHOTS_BASE_URL` or `:3001`; no colour
  scheme set (Playwright default light). Script `shots` (`apps/web/package.json:16`).
- `apps/web/e2e-shots/shots.spec.ts` sets by `SHOTS_MILESTONE`:

| Set | Dark? | Where |
|---|---|---|
| `gm-m1` | Yes: login; Hôm nay, Nhóm, Một nhóm, Cài đặt; 390, 1440 | `:131-167` |
| `gm-m2` | No (light only) | `:172-174` |
| `gm-m3`, `gm-m4`, `gm-m6`, `gm-m7a`, `gm-m7b` | No (no `emulateMedia`, default light) | `:198`, `:429`, `:288`, `:329`, `:370` |
| `gm-m5a`, `gm-m5b` | Not in the file (temporary specs, `giao-dien-moi.md:399-402, 440`) | — |
| Old round `m1`…`m5b` | Yes (`COMBOS` vi/en × light/dark, `:514`) but for the old screens | `:521-795` |

  An unknown key (for example `gm-m5`) falls through to the old `m1` path (`:73-123`). M8 Part 8 adds `gm-m8` (public pages, light and dark,
  390/1024/1440; plan `:3667-3670`). No `gm-m9` exists.
- e2e axe in dark (`seriousViolations`, `e2e/support/axe.ts:13-29`, serious and critical only): `e2e/a11y.spec.ts:7-10` (public pages),
  `landing.spec.ts:158-186, 244-248, 337-339`, and the app specs `m1`, `m2`, `m3`, `m4`, `m4b`, `m5a`, `m5b`, `recall`, `cai-thien-a-{group,
  practice,speak}`. Light only: `m6` (calendar), `m7a` (settings, account), `m7b` (plans, orders). `visual.spec.ts` shoots the landing in both
  schemes with no assertion.

## 8. "M9" and "until M9" about dark, in code and docs

Code:
- `apps/web/src/app/globals.css:439` grain "tuned with the dark mockups in M9".
- `apps/web/src/ui/DotGridBackground.tsx:3` name kept until M9.
- `packages/design-tokens/web-dark.css:2` dark shadows wait (GM4, M9); `:19` practice; `:23` stage "same light values until the dark mockups".
- No other `M9` in `apps/web`, `packages` (the `M9` hits in `apps/api`, `apps/admin` are unrelated review IDs).

Docs:
- Design: §7.1 delete `dark.css`, `island.css`, `dark-pastel.css` only in M9 after checking admin (`:344`); §7.2 dark shadows from the mockups
  (`:376`); §7.3 (`:405`); §7.4 (`:422`); §7.5 `DotGridBackground` name (`:459`); §9 M1 mockups, "phần tối sửa ở M9" (`:533-534`); §9 M9
  (`:648-649`); §14 (`:900`); §15 dark not yet seen (`:913`).
- Decisions: GM4 (`:73-85`), GM7 order (`:20`), QBG grain 12 % and component name until M9 (`:331-332`).
- Rulings: R124 (`:150`), R161 (`:191`); paper light in dark R71 (`:91`), R80 (`:100`), R81 (`:101`); overlay navy in both modes R10 (`:21`); theme
  item in the avatar menu R12 (`:23`). R155 (`:185`) and R173 (`:202`) say "M9" but mean review finding M9, not the milestone.
- Delivery record: polish round must finish before the M9 PR (`:168`), its item 5 moves `color-scheme: dark` off `dark.css` (`:186-189`);
  mockup artifact (`:239`); mockups awaiting approval (`:250`); group and stage dark values light until M9 (`:332`).
- Plan: M9 row "dark fixes; `scripts/compare-bundle-stats.mjs`; Lighthouse, frame-rate numbers; PR → `dev`" (`:72`; the script does not exist
  yet in `apps/web/scripts/`); `:353`, `:573`, `:983`, `:3192`.
- Mockup page `toi-5-man.html:110` (what must be decided before M9).
- Facts: M8 site `:143`, `:208` (public pages need working dark colours in M8 already, because LR27 and LP25 run axe in dark); M8 Figma A
  `:392`; M8 cleanup `:267`, `:376`.
- Audit (main checkout): `compare-m3-m4.md:32-34, 300-309, 351`; `compare-m1-m2.md:34-35, 93` (dark button body same tone as the page, no
  edge), `:245`; `compare-m5-m6.md:58, 156, 276`; `code-consistency.md:146, 350-351, 479-480`; `README.md:52, 77, 86`.

## 9. Not checked

- Nothing was looked at in a browser; every dark effect above is token arithmetic or code reading. The `gm-m1` dark shots in the audit folder
  were not opened.
- Why axe passes on the halo pages (surprise 2) and whether the Today waiting number in `m2.spec.ts` dark has a group whose `-ink` is under
  3:1 (the mock group `22222222-…` maps to index 6, `#29629d`, 2.71:1, but whether the number renders in that test was not checked).
- The dark look of the mesh halos (yellow `mark` 34 % unchanged in dark), the auth glows and the stack's tinted shadow.
- Figma: no dark frames were read; design §7.2 says Figma has Dark variables for the 15 base colours only.
- M8 is not built; the M8 plan items cited (theme toggle move, `themeColor`, new `wm-` tokens such as `ai-from`, `glow-accent` that will need
  dark values, `gm-m8` shots) are projections.
