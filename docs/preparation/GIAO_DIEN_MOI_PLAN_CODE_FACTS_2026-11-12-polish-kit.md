# Code facts: đợt polish (kit, token, dọn token cũ), 12/11/2026

Tree: `docs/giao-dien-moi-plan-polish` @ `2c885e75` (= `claude/giao-dien-moi-m9-3adf51` after M9). Read-only; every count from `git grep` run
12/11/2026 in this worktree. "non-test" = `':!*.test.*'`. Paths are under `apps/web/src/` unless written in full.
Mockup = `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`. Audit = `E:\Working\Working project\english-learning\docs\audit\2026-11-11-ui-audit\` (local).

## 0. Surprises (read first)

- **Mockup drops JetBrains Mono entirely** (mockup L15-16: labels, counts, keycaps in Noto Sans). Code: `font-wm-mono` 103 occurrences / 50 files; `text-wm-mono` 96 / 46.
- **New code depends on old `globals.css` tokens**: `--ease-out-strong` (`globals.css:209`) is read by the wm dialog animations (`globals.css:21-23`), 14 class uses (`ease-out-strong`) in `ui/` and features. Deleting old tokens must keep or rename it.
- **`theme.css` redefines `--radius-sm` to 0.5rem** (`packages/design-tokens/theme.css:53`); Tailwind's default is 0.25rem. `rounded-sm` (2 non-test uses) shrinks 8→4 px when the import goes.
- **`app-ui/Toast.tsx` and `app-ui/date-of-birth.ts` are re-export shims** (`app-ui/Toast.tsx:1-2`, `app-ui/date-of-birth.ts:1-2`); their 13 + 2 importers are almost all tests.
- **`island.css` is dead**: no `pastel-island` class left in `src` (only the comment `app/globals.css:5`).
- **`Dialog` `wide` alias has 0 production callers**; only `ui/overlays.test.tsx:87-89` uses it.
- **Seven copies of the same stage-colour array** (§12); `stage-*-bg`, `stage-*-ink`, `stage-5-bg`, `stage-5-dot` have 0 uses.
- **"→" is outside Google Fonts' `latin` subset** (evidence §8): range lists U+2191 and U+2193 but not U+2192.
- **No test pins chrome heights, radius classes, letter-spacing of Bricolage styles (except app-title, site-*), or mono.**

## 1. Fonts

- Loaded in `app/[locale]/layout.tsx:5,13-22` with `next/font/google`: `Noto_Sans`, `Bricolage_Grotesque`, `JetBrains_Mono` (all
  `subsets: ['latin','vietnamese']`, `display: 'swap'`, no `text`/`weight`; mono `preload: false` L21). Variables on `<html>` L49; `<body className="min-h-dvh font-wm-sans">` L51.
- Tokens: `app/globals.css:13-17` (`@theme inline`): `--font-wm-sans` L14, `--font-wm-display` L15, `--font-wm-mono: var(--font-jetbrains-mono), ui-monospace, monospace` L16.
  CSS users of the var: `.gstack-meta` `globals.css:617`. Size token `--text-wm-mono: 0.75rem` `packages/design-tokens/web.css:165-168`; `lib/cn.ts:14` lists `wm-mono`.
- `font-wm-mono`: 103 occurrences, 50 files (48 `.tsx` + `globals.css` 2). Top: `word/WordPage.tsx` 9, `today/TodayPage.tsx` 8, `add-word/AiLookupResult.tsx` 7,
  `lookup/DictionaryPage.tsx` 5, `groups/TopicPickerPage.tsx` 4, `calendar/DayDialog.tsx` 4; 3 each: `WeakWordsPage`, `GroupPage`, `BacklogPage`, `MonthDialog`.
  In `ui/`: `Tag.tsx`, `StageBar.tsx`, `ChoiceCard.tsx` (1 each); `ui/Tag.tsx:11` has a `mono` prop (7 `<Tag … mono` uses). Site: `site/legal/LegalArticle.tsx` 2.
- `font-wm-mono` lines without `text-wm-mono`: 11. `text-wm-mono` with `font-wm-sans` (already Noto): `app-chrome/TopBar.tsx:67`, `app-chrome/TopSearch.tsx:59`, `plans/PlansPage.tsx:197,200`.
- JetBrains named in `raw-ok` comments: `app-chrome/CalendarBarButton.tsx:12`, `app-chrome/CalendarButton.tsx:19`, `plans/CompareTable.tsx:6`, `ui/ChoiceCard.tsx:57`.
- Tailwind `font-mono`: 0 uses. `tabular-nums`: 5 non-test.
- Tests: no test (unit or `apps/web/e2e`) mentions mono / JetBrains (`git grep -i mono` on test files: 0).
- OG image: `app/[locale]/opengraph-image.tsx:5,30-31,53-56` uses **Lexend** (old font) from `og-fonts.generated.ts` (`scripts/gen-og-fonts.mjs`,
  `apps/web/assets/fonts/README.md`, test `app/[locale]/og-fonts.test.ts`), colours hard-coded old navy (L35-44). No mono. Other image route: `app/apple-icon.tsx`.
- **Change:** remove `JetBrains_Mono` + `--font-wm-mono`; map `font-wm-mono` sites to `font-wm-sans` (keep `text-wm-mono` size or rename to a label size); fix 4 raw-ok comments, `Tag` `mono` prop doc. OG image font is a separate decision (still Lexend).

## 2. Radius

- Scale `packages/design-tokens/web.css:48-58`: `xs` 0.1875rem (3), `sm` 0.375rem (6), `md` 0.625rem (10), `lg` 0.875rem (14), `xl` 1.25rem (20),
  `2xl` 1.75rem (28), `pill` 62.4375rem, `button` 0.625rem (10), `modal` 1rem (16).
- Uses (all non-test; incl. `rounded-t-`/`-r-` variants): xs 25/18 files, sm 60/39, md 62/42, lg 69/41, xl 76/44, 2xl 12/10, pill 32/23, button 8/8, modal 11/8.
- Arbitrary: `app-chrome/CalendarBarButton.tsx:13` `rounded-[0.5625rem]`, `app-chrome/CalendarButton.tsx:25` `rounded-[0.6875rem]`, `calendar/MonthDialog.tsx:49` `md:rounded-[0.75rem]`, plus `rounded-t-[0.5625rem]` (1).
- Tailwind defaults / old: `rounded-full` 32 in 22 files; `rounded-lg` `app-chrome/TopBar.tsx:42`; `rounded-xs` `add-word/GroupPicker.tsx:133`; `rounded-none` `ui/Skeleton.tsx:34,41`;
  `rounded-sm` `practice/session/SessionNotice.tsx:64`, `app-ui/Select.tsx:66`; `rounded-control` `practice/session/ReportDialog.tsx:133`, `app-ui/Select.tsx:36`;
  `rounded-card` `app-ui/States.tsx:36,48,63`; `rounded-inner` `app-ui/Button.tsx`, `app-ui/Select.tsx`.
- Kit: `ui/button-styles.ts` and `ui/GoogleButton.tsx` `rounded-wm-button` (10); `ui/field-styles.ts:5` `FIELD_BOX` and `ui/Select.tsx:39` `rounded-wm-md` (10);
  `ui/Card.tsx:8` `rounded-wm-xl` (20); `ui/Dialog.tsx:47` `rounded-t-wm-modal md:rounded-wm-modal` (16); close × `rounded-wm-md` L68; `ui/Kbd.tsx`, `ui/Tag.tsx` `rounded-wm-sm` (6);
  `ui/Select.tsx:62` popover `rounded-wm-modal`; `ui/Toast.tsx` `rounded-wm-modal`; `ui/Skeleton.tsx` `rounded-wm-xl` ×6.
- Tests: `styles/web-tokens.test.ts:52-59` "radius, shadow and text tokens are written in rem, never px" (pins **count 9** at L57);
  `:61-70` "pins the values the design names" (`button` 0.625rem L64, `xs` 0.1875rem L65). `styles/tokens.test.ts:92-112` "LP31 …" reads `theme.css` radius in rem (L95). No component test asserts a `rounded-*` class.
- Target C (mockup L82: `--r-key .25rem; --r-ctl .5rem; --r-row .625rem; --r-card .875rem; --r-dlg 1rem`). Map: key/label 4 ← now xs 3 / sm 6; button/input/chip 8 ← now button 10, md 10, sm 6;
  list row/menu 10 = md; card 14 = lg (but `Card` and most cards use xl 20, some 2xl 28); dialog/Học card 16 = modal.
- **Change:** redefine the scale (rename to roles or re-value), update the two pins at `web-tokens.test.ts:57,64-65`, then sweep ~350 class uses; `rounded-xs`, `rounded-lg`, `rounded-sm`, `rounded-control`, arbitrary radii go too.

## 3. Bricolage letter-spacing (chỗ 12 — decided "giữ hiện tại"; record only)

- Values written as −N px ÷ size (audit compare-m1-m2 §2.6 says Figma means −N %): `--text-wm-hero` −0.0313em (−2.5px @80) `web.css:86`; `section` −0.0385em (−2px @52) L90;
  `lemma` −0.0278em (−1px @36) L94; `card-title` −0.0417em (−1px @24) L123; `logo` −0.0455em (−1px @22) L127.
  Read as −1 %: `page-title` −0.025em L98, `app-title` −0.0255em L107, `card-heading` −0.01em L115, `site-*` L170-197. `.gstack-name` −0.021em `globals.css:633`.
- Raw `tracking-[…]`: 16 (−0.01em ×5, −0.02em ×4, −0.021em ×3, −0.015em ×2, −0.03em, −0.04em); `tracking-tight` 12; `tracking-wide` 1 (`recall/CompareLine.tsx:55`). Files: 27 lines, e.g. `today/TodayPage.tsx:47,114,136,161,277`, `site/landing/styles.ts:17-26`.
- Tests pin only `app-title*` (`web-tokens.test.ts:80-85`) and `site-*` (`:181-192`).

## 4. Typography helpers, Card, `cn`

- Page title: `app-chrome/PageTitle.tsx:7-17` (h1 `font-wm-display text-wm-app-title-mobile md:text-wm-app-title`; the audit's "old PageTitle with highlighter" is already replaced). 7 importers:
  `practice/PracticePage`, `practice/WeakWordsPage`, `settings/AccountPage`, `settings/DeleteAccountPage`, `settings/SettingsPage`, `settings/reports/MyReportsPage`, `transactions/TransactionsPage`.
  Same classes hand-written in `plans/PlansPage.tsx:80`. Nothing in `ui/`.
- h1 in learner (`features`, `app-chrome`, `app-shell`, non-test): 22. Variants: `text-wm-card-title` ×5 (+1 inside a card), `text-3xl … md:text-5xl` ×4, `text-3xl … md:text-4xl` ×1,
  `card-heading-mobile/md:card-heading` ×2, `app-title` ×2, `text-wm-word` ×2, `wd-title` ×1, `sr-only` ×1.
- No section-title component. h2 in `features`: 35, ≥ 20 class variants (e.g. `text-xl font-bold md:text-2xl` ×3, `text-wm-card-title` ×3, `text-wm-base-strong` ×3, mono label ×4). Mockup L589: section title Bricolage 22 desktop / 20 phone — no token at 20-22 (`card-title` 24, `word` 19).
- `ui/Card.tsx:7-9` (`rounded-wm-xl bg-wm-surface p-5 shadow-wm-card`): 3 importers, all `plans/` (`CompareTable`, `OrderReturnPage`, `SubscriptionRows`).
  Hand-built (line has `bg-wm-surface` + `shadow-wm-card`, excl. Card.tsx): 50 lines in 33 files; `shadow-wm-card` total 54 non-test. Mockup L140 / L589: card bo 14, đệm 24 (phone 20), no border.
- `lib/cn.ts:8-16` `font-size` group: old sizes L9; wm sizes L13-14 = hero, section, lemma, card-title, logo, word, lead, base, base-strong, button, small, small-strong, label, caption, mono.
  **Missing:** `wm-page-title`, `wm-page-title-mobile`, `wm-card-heading`, `wm-card-heading-mobile`, `wm-app-title`, `wm-app-title-mobile`, and all `wm-site-*` (7) from `web.css:96-120,170-197`.
- Test `lib/cn.test.ts:4-16` "cn with wm tokens" (3 cases: size+colour, later size wins, later shadow wins); none for the missing groups.
- **Change:** add the missing names to `cn.ts` (red test first: e.g. `cn('text-wm-card-heading-mobile text-wm-ink')` keeps both); add `PageTitle`/`SectionTitle` to `ui/`; adopt `Card` or change its radius/padding to mockup values.

## 5. Filters / tabs / segmented (chỗ 15)

| Kind | Where | Fill |
|---|---|---|
| `ui/Segmented` pill track `bg-wm-accent-soft`, selected `bg-wm-surface shadow-wm-row` | `ui/Segmented.tsx:34,39`; used `practice/CustomizeDialog.tsx:18`, `settings/SettingsPage.tsx:22` | — |
| Day dialog filter (box `rounded-wm-md border`, buttons `aria-pressed`) | `calendar/DayDialog.tsx:180-191` | **`bg-wm-ink text-wm-surface`** L190 |
| Một nhóm filter chips (`aria-pressed`) | `groups/GroupPage.tsx:250-262` | **`border-wm-ink bg-wm-ink text-wm-surface`** L259 |
| Word page tabs (anchor links, 2 px underline ink) | `word/WordPage.tsx:225-245` | — |
| Top bar tabs (`bg-wm-accent-soft text-wm-accent`, `rounded-lg`) | `app-chrome/TopBar.tsx:37-45` | — |
| Phone tab bar pill `h-7 w-12` accent-soft | `app-chrome/MobileTabBar.tsx:28` | — |
| Tra từ filter: accent underlined text opening a `Menu` | `lookup/LookupFilters.tsx:60-70` | — |
| Site footer theme switch (`RadioGroup`) | `site/layout/FooterThemeSwitch.tsx:19-34` | — |
| Month dialog day buttons `aria-pressed` | `calendar/MonthDialog.tsx:293` | — |

- Mockup L590-592: tabs = underline (as WordPage); level filters = chips coloured by level, count in its own small box, selected darker + border. No test asserts these classes.

## 6. `bg-wm-ink` fills (M9 dark facts §0.8, `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-dark.md:59-61`) — all 7 still present

- `app-chrome/CalendarButton.tsx:82` (tooltip), `calendar/DayDialog.tsx:190`, `groups/GroupPage.tsx:259`, `practice/session/HintPanel.tsx:47,57`, `today/TodayPage.tsx:104,121`.
- Also found: `site/layout/SkipLink.tsx:6`, `site/landing/parts.tsx:113` (public pages, no dark frame); alpha tints `bg-wm-ink/14` `add-word/GroupPicker.tsx:133`, `ui/StageBar.tsx:41`; `hover:bg-wm-ink/4` `lookup/DictionaryPage.tsx:98`.
- No test asserts `bg-wm-ink`. **Change:** per chỗ 15/level decision (TodayPage "đến hạn" → `level-due`; filters → chip style).

## 7. Dialogs (chỗ 11)

- `ui/Dialog.tsx:8-27` props: `closeLabel?` (× only when given, L63-72; × is `size-11 md:size-9 rounded-wm-md` icon only, no border, L68), `size?: 'md'|'lg'|'xl'` (L35 widths),
  `wide?` alias L18-19, used at L49. `wide` callers: 0 production; test `ui/overlays.test.tsx:87-89` "wide stays an alias of size=\"lg\" until M8".
- 15 files import `ui/Dialog` (18 `<Dialog` uses). **With ×:** `AddSentenceSheet`, `AddWordSheet`, `BulkAddSheet`, `DeckPickerDialog`, `HouseAd`, `CustomizeDialog`, `ReportDialog`, `TransactionDetail`.
  **Without ×:** `BacklogPage`, `GroupDialogs` (3), `GroupPage`, `SubscriptionRows`, `CurrentSessionCard`, `MyWordDialogs` (2), `SavedSentencesDialog`. Own modal: `calendar/CalendarModal.tsx:27-49`.
- "Hủy"/close button: **text** `TextButton tone="muted"` in `AddSentenceSheet:97`, `AddWordSheet:316,472,487`, `BulkAddSheet:82`, `DeckPickerDialog:96`, `HouseAd:70`;
  **outline** `Button variant="secondary"` in `GroupDialogs:85,132,175`, `MyWordDialogs:101,155`, `ReportDialog:89`, `BacklogPage:251`, `GroupPage:421`, `SubscriptionRows:102`, `TransactionDetail:61`, `SavedSentencesDialog:30`, `CurrentSessionCard:83`.
- Select background: `ui/Select.tsx:39` and `FIELD_BOX` (`ui/field-styles.ts:5`) are `bg-wm-surface` (white); grey `bg-wm-bg` fields: `groups/GroupPicker.tsx:108` (search box), panels `practice/CustomizeDialog.tsx:270,315`.
- Tests: `ui/overlays.test.tsx:31-89` (name, Esc, closeLabel closes L40, isDismissable, size widths ~L70, tone pro L73-84, wide L87).
- **Change:** drop `wide` + its test; decide × always/never and one "Hủy" style; × gets Figma box (36 px, line border, bo 10).

## 8. Arrow "→" (chỗ 14)

- Messages: `apps/web/messages/vi.json` 15 "→", `en.json` 15; e.g. vi L727, 743, 751, 766, 774, 876, 907, 1056, 1064, 1103; also inside text L898, 905, 1604, 1638. "⟶" literal: 0 in `src` and messages.
- JSX literals (non-comment): `add-word/AddWordSheet.tsx:387` `{' → '}`, `calendar/MonthDialog.tsx:250` (`<Kbd>→</Kbd>`), `review/ReviewSession.tsx:173` (key legend). lucide `ArrowRight`: 20 files.
- Font subset: `subsets: ['latin','vietnamese']`, no `text` option (`layout.tsx:13-22`). Evidence: built CSS from the main checkout
  (`apps/web/.docker-out/.open-next/assets/_next/static/chunks/3_v516uixsyfn.css`, 26/10, Lexend) shows the Google `latin` range `…U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215…`: no U+2192.
  **ASSUMPTION:** Noto Sans/Bricolage use the same `latin` range (not checked on a current build), so "→" falls back to a system font; which glyph Windows draws is not verified.
- **Change:** replace text arrows with an icon (or a font that has U+2192) — needs a decision; check on a fresh build first.

## 9. `app-ui/` left

- Non-test imports, 14 in 13 files: `app-shell/AppProviders.tsx:8` (`StreakToast`), `:9` (`ToastRegion`), `app-shell/RequireSession.tsx:6` (`OfflineScreen`), `practice/CustomizeDialog.tsx:11` (`LockedFeature`),
  `practice/PracticePage.tsx:11`, `practice/WeakWordsPage.tsx:14`, `practice/session/PracticeSession.tsx:11`, `recall/RecallSession.tsx:5`, `recall/RecallSummary.tsx:7`, `review/ReviewSession.tsx:12` (`States`),
  `practice/session/AlternativeFeedback.tsx:6`, `AnswerFeedback.tsx:6` (`SpeakWord`), `practice/session/use-practice-session.ts:9`, `review/use-review-queue.ts:7` (`showStreak`).
- Already in `ui/`: `EmptyState`, `ErrorState` (`ui/States.tsx:9,19`); `ProBadge`, `LockedFeature` (`ui/ProBadge.tsx:8,19`, same names as `app-ui/Locked.tsx:8,19`); `SpeakWord` (`ui/SpeakButton.tsx:37`; `app-ui/SpeakButtons.tsx:2` re-exports);
  `ToastRegion` (`ui/Toast.tsx`; `app-ui/Toast.tsx:1-2` re-exports). **Missing in `ui/`:** `FullScreenSpinner`, `OfflineScreen`, `NotFoundState` (`app-ui/States.tsx:10,21,58`), `StreakToast`/`showStreak`.
- Per file importers (abs paths, incl. tests): `States` 7, `Toast` 13 (12 tests: `add-word/*` 6, `topic-picker`, `lookup`, `plans`, `practice-session`, `my-word`, `word-page`), `StreakToast` 5 (2 tests: `recall/recall-session.test.tsx:5`, `review/review-session.test.tsx:5`),
  `date-of-birth` 2 (tests `auth/auth.test.tsx:7`, `auth/auth-turnstile.test.tsx:9`; shim of `lib/date-of-birth.ts`), `SpeakButtons` 2, `Locked` 1, `test-utils` 60 (+2 inside app-ui). Dead (0 importers): `Flag`, `PronunciationLine` (shim), `Select`; `Button` only via `./Button` in `States.tsx:7`.
- `app-ui/test-utils.tsx`: exports `renderApp` L15, `pickDate` L58; files using `renderApp` 63, `pickDate` 6. Lint `apps/web/eslint.config.mjs:10` bans `@/features/*`… in `src/ui/**` except `*.test.*` (so a helper in `ui/` must be a test file or live elsewhere).
- Tests that must move, not be deleted: `app-ui/toast.test.tsx:21-38` ("Toast exit": view-transition close; reduced motion), `app-ui/streak-toast.test.tsx:6-40` (DC9: 3 s, no pointer, replace, English).

## 10. Old token classes still in `src`

- Old colour classes (regex over `bg|text|border|ring|outline|fill|stroke|from|to|via|decoration|divide|caret|placeholder` + every `theme.css` colour): 72 occurrences, 43 lines.
  Outside `app-ui/`: `app/[locale]/app/layout.app.tsx:20` (`bg-canvas text-ink`), `app-shell/AppProviders.tsx:67,69` (`OfflineBand`: `bg-danger-soft text-ink text-ui`, `text-primary`),
  `groups/highlight.tsx:18` (`text-primary`, used by `add-word/AddSentenceSheet`, `review/CardStack`), `ui/PronunciationLine.tsx:28` (`text-caption text-muted`), `:31` (`text-body text-ink`), `globals.css:533-543` selectors.
  `app-ui/`: Button 7, Locked 3, Select 8, States 14, StreakToast 2.
- Other old utilities outside `app-ui/` (non-test): `animate-menu-in` `app-chrome/AvatarMenu.tsx`; `animate-menu-in/-in-up/-out` `ui/Select.tsx:62`; `animate-toast-in` `ui/Toast.tsx`;
  `animate-feedback-in` `CustomizeDialog` ×3, `AlternativeFeedback`, `PracticeSession`, `ui/HelpTip.tsx`; `animate-panel-drop` `AnswerFeedback`, `TypeWordQuestion`; `animate-wiggle-soft` `McqQuestion`, `ui/AnswerOption.tsx`;
  `animate-pop-in` `ui/AnswerOption.tsx`; `animate-card-rise` `QuestionCard`; `animate-summary-in` `review/ReviewSummary.tsx` ×5; `animate-theme-icon-in/out` `site/layout/ThemeToggle.tsx`;
  `text-ui` `AppProviders`; `text-body/text-caption` `ui/PronunciationLine`; `rounded-control` `ReportDialog:133`; `rounded-sm` `SessionNotice:64`; `text-h2` in `lib/cn.ts:9`;
  `ease-out-strong` 14 (TopBar, TopicSuggestions ×2, CustomizeDialog ×2, FooterThemeSwitch, ui: AnswerOption, ChoiceCard, GoogleButton, ProgressBar, Segmented, Switch ×2, button-styles). `pressed` utility: only `app-ui/Button.tsx`. `tilt-card`, `pastel-island`: 0 in tsx.
- `app/globals.css` (1415 lines): imports `theme.css` L2, `dark.css` L4, `island.css` L6. Old `@theme` L62-367: text L64-95, containers L98-106, `--spacing-header` L109, density/shadows L113-127,
  old animations L128-141, keyframes L143-205, `--transition-duration-faq` L207, **`--ease-out-strong` L209**, practice/landing animations L212-366.
  Lines reading `theme.css` vars: L117-141, 212-224, 254-263, 384-389 (toast close view-transition), 474-476 (FAQ), body `background-color: var(--color-surface); color: var(--color-ink)` **L514-516**,
  focus `outline … var(--color-primary)` **L527-544** (incl. `.bg-primary`, `.bg-accent` overrides). `scroll-padding-top: var(--spacing-header)` L510. `@utility pressed` L400, `tilt-card` L410.
- Tests: `styles/tokens.test.ts:6-9` (resolve `theme.css`, `dark.css`), `:92-112` LP31 (old clamp text `display/cta/h2` in globals, theme radius), `:121-136` dark-pastel, `:139-161` island (L142-143 asserts the import), `:164-175` brace balance (keep).
  `styles/text-classes.test.ts:9,22` allows names from `theme.css` and old globals `--text-*`. `apps/web/scripts/check-tailwind-raw.mjs:7-8` catches only `-[...]` and `style={`, `.tsx` only, skips `*.test.tsx` and image routes (L22-27); run by `apps/web/package.json:11` `lint`.
- **Change:** add a "no old class" test (list from `theme.css` + old globals tokens; handle `rounded-sm`, `max-w-prose` Tailwind collisions), move body/focus/animations to wm tokens, keep/rename `--ease-out-strong`, then drop the 3 imports and old `@theme`.

## 11. `dark.css`, `island.css`, `dark-pastel.css`

- Importers: `dark.css` and `island.css` only `apps/web/src/app/globals.css:4,6`; `dark-pastel.css` none (comment in itself L6; read by `styles/tokens.test.ts:122`). Admin imports none.
- `dark.css` (45 lines): `color-scheme: dark` L6 (duplicate of `web-dark.css:5`) + 38 old colours under `[data-theme='dark']` L7-44. Still feeds the old classes in §10.
- `island.css` (46 lines): rules on `.pastel-island` / `md:pastel-island` only; 0 users → dead. `dark-pastel.css` (83 lines): not imported.

## 12. Stage vs level colours

- Stage: `web.css:212-233` and identical in `web-dark.css:34-54` (comments L24, L34: "polish round replaces stage colours with level colours"). Level: `web.css:39-46`, `web-dark.css:100-108`; values equal mockup L80 (light) and L93 (dark).
- Stage classes: 42 occurrences, all in seven identical arrays `['bg-wm-stage-0-dot' … 'bg-wm-stage-4-dot','bg-wm-stage-5-solid']`: `add-word/GroupPicker.tsx:120`, `groups/GroupPage.tsx:53`, `practice/CustomizeDialog.tsx:58`,
  `practice/WeakWordsPage.tsx:26`, `practice/session/AnswerFeedback.tsx:14`, `today/TodayPage.tsx:256`, `word/LearningBlock.tsx:16`. Unused tokens: `stage-*-bg`, `stage-*-ink`, `stage-5-bg`, `stage-5-dot`. `wm-level-*` classes: 0 uses.
- Tests: `styles/web-tokens.test.ts:91-108` "declares the six stage colours"; `:244-251` level hex format and monotonic luminance (no exact hex pinned; M9 minor "ghim đúng hex level-* khi polish dùng lần đầu").
- **Change:** one shared level map, delete stage tokens + test L91-108, pin level hexes.

## 13. Skeleton (chỗ 24)

- `ui/Skeleton.tsx`: `Skeleton` L7-9 (`bg-wm-line`, `animate-pulse`); `SkeletonBlocks` L12-23; `SkeletonPage` L29-44: `bg-wm-bg` flat (L32, real app uses `ui/AppBackground.tsx:6` `app-mesh`),
  top bar `h-16 md:h-18` (64/72, L34) vs real `TopBar.tsx:29` `h-16` (64) and `PhoneHeader.tsx:14` `h-16`; phone tab bar `h-16` L41.
- Users: `app-shell/RequireSession.tsx:58` (`SkeletonPage`, shape from `app-shell/skeleton-shape.ts:6`), `SkeletonBlocks` in `(chrome)/loading.app.tsx:8`, `PlansPage.tsx:59`, `DeleteAccountPage.tsx:44`, `TransactionsPage.tsx:38`.
- Route loading files (named `loading.app.tsx`): 8 under `app/[locale]/app/(member)/`: `(chrome)/`, `(chrome)/(today)/`, `group/`, `group/backlog/`, `groups/`, `lookup/`, `word/`, `(focus)/`; per-route ones use `Skeleton` directly. `FullScreenSpinner` still in 4 non-test files (§9).
- Tests: `ui/overlays.test.tsx:52` (status "Đang tải…"), `app-shell/skeleton-shape.test.ts`; none on height or background.

## 14. Phone top bar and tab bar (chỗ 25)

- Phone header `app-chrome/PhoneHeader.tsx:14` `h-16` (64; Figma 56). Desktop `TopBar.tsx:29` `h-16`.
- Tab bar `app-chrome/MobileTabBar.tsx:17` `pt-1.5 pb-safe`, items `min-h-14` L26 → ~62 px + safe area (Figma 72); icon pill `h-7 w-12` L28, icon `size-5` L29, label `text-wm-caption` L31.
- Coupled offsets: `app-chrome/AppChrome.tsx:12` `MAIN` `pb-[calc(10.125rem+env(safe-area-inset-bottom))] md:pb-31`; `app-chrome/FloatingButtons.tsx:11` `bottom-[calc(4.75rem+…)]`; `ui/Skeleton.tsx:34,41`; `--spacing-header` 4.5rem `globals.css:109,510`.
- Tests: none pin these heights (`app-chrome/*.test.tsx`, `apps/web/e2e`: 0 hits).

## 15. Case transforms on labels

- `uppercase` in CSS: 0 (the 1 hit is a string, `auth/AuthHeading.tsx:117`). `lowercase`: `practice/WeakWordsPage.tsx:150`, `practice/session/QuestionCard.tsx:42`, `SentenceQuestions.tsx:34`, `TypeWordQuestion.tsx:54`, `word/LearningBlock.tsx:47`;
  `first-letter:lowercase`: `practice/PracticeHero.tsx:61,79`, `QuestionCard.tsx:54`. Total 8 sites / 6 files. `capitalize`, `text-transform` in CSS: 0. Tracking: §3.
- **Change:** write the cased text in `messages/*.json`, drop the 8 classes; check the tests of those screens that match text.

## 16. `apps/web/scripts/message-keys-allow.json` (28 lines, 26 entries)

- `Landing.*` L2 (197 leaves), `App.errors.*` L3 (53), `App.practice.recent.*` L14 (13), `App.transactions.*` L26 (42); `vi.json` has 1500 leaves. Prefix match `scripts/check-message-keys.mjs:28-31`; stale-entry check L50.
- **Change:** replace each prefix with exact keys (or narrower prefixes) read by variable.

## 17. M9 minors

- "dot grid": `styles/app-background.test.ts:5` (comment), `:21-22` (test "has no dot grid any more"); `ui/actions.test.tsx:81,84` ("AppBackground draws the mesh background, not the dot grid"); dead class `features/learner/auth/AuthShowcase.tsx:17` `dot-grid` (no CSS for it).
- `practice/CustomizeDialog.tsx:72` `if (!target) return null;` (callers pass `target: CustomizeTarget | null` L43).
- `house-ad/HouseAd.tsx:39-44`: `previous.current = pathname` (L41) runs before the `me`/`ads` guard (L44), so a navigation while those are null is consumed and never counted later.
- `packages/design-tokens/README.md`: L1-103 still document `theme.css` (Lexend, old colours, motion), `dark.css`, `dark-pastel.css`, `island.css`; L110 "until its old screens are gone (M8)", L117-118 "Stage and practice colours keep their light values in dark until the polish round".

## 18. Admin and the package

- `apps/admin/src/styles/globals.css:2` imports only `theme.css`; `apps/admin/src/styles/tokens.test.ts:8` resolves only `theme.css` (UBC1/UBC2 tests). No admin file names `dark.css`, `island.css`, `dark-pastel.css`, `web*.css`.
- `packages/design-tokens/package.json` `exports` lists all six files; removing `dark.css`, `island.css`, `dark-pastel.css` means deleting their 3 export lines. `Dockerfile:28` copies only the package's `package.json`; `pnpm-lock.yaml:16,270` reference the package by name.
- `theme.css` must stay for admin; apps/web can drop the import (also drops `--font-sans` Lexend and the `--radius-sm` override, §2).
