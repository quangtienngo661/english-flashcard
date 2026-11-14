# Giao diện mới M8, dọn code cũ: code facts (11/11/2026)

**Source:** `origin/refactor/giao-dien-moi` at `df32b3b821482c8743f1a96d7b06e9ab761d4645` (merge of PR #262, fetched 11/11/2026). Line numbers are on that
ref. Plan Part 7 was read from this worktree's HEAD `e4f02eb4` (`docs/giao-dien-moi-plan-8`; Part 7 is not on the ref yet). M7 in progress:
local branch `feat/giao-dien-moi-m7a` at `d0d799ee` (not pushed; based on `ad63f653`, one merge behind the ref: it lacks PR #262), tasks M7.1–M7.5
committed, `git diff --stat origin/refactor/giao-dien-moi...feat/giao-dien-moi-m7a` = 40 files, +2987 / −518 (settings, account, delete-account,
`ui/StatusDot`, `ui/Skeleton` `SkeletonBlocks`, `lib/month-groups`, `plans/pro-last-day`, `web.css` +9, docs). No `feat/giao-dien-moi-m7b` yet.

**Method.** `git show` / `git grep` on the ref; the ref and M7a trees exported with `git archive` and scanned by two throwaway Node scripts (not in
the repo): an import resolver (alias `@/`, relative `./`, `../`, from `src/`, `e2e/`, `e2e-shots/`, `scripts/`) and a class scanner that blanks
comments and code and scans only string and template literals (so prose such as "a pressed card" is not counted). Class names built at runtime
would be missed; a grep for `` (bg|text|border|ring|rounded|shadow)-${ `` found none. "After M7" means: Part 7 does exactly what its task file lists
say. That is a projection, not a measurement (UNVERIFIED until M7b merges; re-run the greps when M8 starts).

## 0. Big picture

Surprises first.

1. **Dropping the old imports breaks things no test sees.** `globals.css` itself reads the old set: `body` takes `var(--color-surface)` and
   `var(--color-ink)` (`globals.css:519-520`), and the global focus ring is `outline: 3px solid var(--color-primary)` (`:531-533`, overrides
   `:537-548`). Nine old animations that **new** code uses (`menu-in`, `menu-in-up`, `menu-out`, `toast-in`, `feedback-in`, `pop-in`, `wiggle-soft`, `card-rise`, `summary-in`) are defined with `theme.css` motion variables (`--ease-enter`, `--ease-spring`,
   `--ease-standard`, `--ease-exit`, `--transition-duration-*`, `--motion-toast`, `--motion-wiggle`; `globals.css:129-141, 254-263`), and so is the
   toast exit view transition (`:383-390`). Users: `ui/Select.tsx:62`, `ui/Toast.tsx:58`, `ui/HelpTip.tsx:21`, `ui/AnswerOption.tsx:55`,
   `app-chrome/AvatarMenu.tsx:44`, the practice session and Review summary (§2.3). Without `theme.css` these `var()`s resolve to nothing, so the
   declarations become invalid at computed time and the animation or ring is dropped (CSS custom-property rules; not observed in a browser). jsdom
   computes no CSS, so `pnpm test` stays green.
2. **`color-scheme: dark` comes only from `dark.css:6`.** `web-dark.css` does not set it, and nothing in `src/` does (grep `color-scheme|colorScheme`:
   only `prefers-color-scheme` media queries). Without `dark.css`, native controls (the `type="date"` picker of `DateOfBirthField`, scrollbars,
   select popups) stay light in dark mode.
3. **`renderApp` has no home.** `app-ui/test-utils.tsx` is imported by **63** test files (6 of them in `ui/`, 6 in `app-chrome/`). It imports
   `@/app-shell/*`, `@/app-chrome/AppChrome` and `@/features/learner/add-word/add-word-context` (`test-utils.tsx:7-12`). Design §6 names no folder
   for it. A `src/ui/test-utils.tsx` would break the `ui/` lint rule, which exempts only `*.test.{ts,tsx}` (`eslint.config.mjs:10`).
4. **After M7, `app-ui/` still has seven live files** besides `test-utils.tsx`: `States.tsx` (7 non-test importers in app-shell, practice, recall,
   review), `StreakToast.tsx` (3), the `Toast.tsx` re-export (`AppProviders` + 13 tests), `Locked.tsx` (1), the `SpeakButtons.tsx` re-export (2),
   the `date-of-birth.ts` re-export (2 tests), and `Button.tsx` (kept alive by `States.tsx:7`). `ui/States.tsx` has only `EmptyState` and
   `ErrorState`; `FullScreenSpinner`, `OfflineScreen` and `NotFoundState` have no new version, and there is no new `StreakToast`.
5. **M7.12's importer grep misses relative imports.** It runs `git grep -l "app-ui/<Name>'"`; `app-ui/States.tsx:7` imports `'./Button'`, so
   `Button` looks orphaned and its deletion breaks typecheck (Step 2 would catch it). `TextField` ← `DateOfBirthField.tsx:6` and `Locked` ←
   `Switch.tsx:5` are relative too, but those pairs leave together or stay. All nine cases of `app-ui/ui-kit.test.tsx` belong to the five files M7.12
   deletes, so the file must be deleted rather than emptied (an empty Vitest file fails).
6. **`site/` may not import `@/app-chrome/*`** (`eslint.config.mjs:11`; pinned by `scripts/import-rules.test.ts:27-30`), but
   `components/landing/LandingHeader.tsx:1-2` imports `Logo` and `ThemeToggleButton` from `app-chrome`, and `components/layout/SiteFooter.tsx:1`
   imports `Logo`. Moving them to `site/` as they are fails lint. The old `Logo` export (`app-chrome/Logo.tsx:5`) and `ThemeToggle.tsx` serve only
   the landing (ruling R14). The new `AppLogo` (`Logo.tsx:22`) is used by `CardFrame`, `PhoneHeader`, `TopBar`.
7. **Real old-class residue outside `app-ui/`, `components/` and Part 7 is small:** 9 files with old colour, size, radius or container classes,
   plus 13 files that use old animations (§2.3). The public side carries 552 uses in 28 files (§2.4).
8. **A live `tailwind-merge` defect.** `lib/cn.ts:12-15` lists 15 `wm-` sizes but not `wm-page-title`, `wm-page-title-mobile`, `wm-card-heading`,
   `wm-card-heading-mobile` (nor `wm-app-title*`, which M7a adds to `web.css`). `features/learner/recall/RecallSummary.tsx:47` runs
   `cn('… text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading', …)`, and merging drops the mobile size: tailwind-merge 3.7.0 with a
   copy of the `cn.ts` config returned `text-balance font-wm-display text-wm-ink md:text-wm-card-heading`. Control: `text-wm-base text-wm-ink`
   kept both. Verified with the copy only, not through the app's own `cn`.
9. **`docs/deliveries/giao-dien-cu-map.md` has no row for the public pages** (`/`, `/privacy`, `/terms`, `/sources`, `not-found`, `[...rest]`), the
   root layout, `opengraph-image.tsx` or `globals.css`, and M8 is the milestone that rewrites them (§5.2).
10. **`island.css` is imported but unused:** `pastel-island` appears in no string in `src/` (only the comment `globals.css:5`). Dropping it changes
    nothing visible. The only thing that fails is `tokens.test.ts:142-144`, which asserts the import.
11. **`e2e/landing.spec.ts:2` imports `../src/components/landing/exercises/exercise-set`**, the only reference to `components/` from outside `src/`.
    Also `apps/web/README.md:73` names `src/components/{ui,layout,landing,sections,interactive,seo}`.

## 1. Every file in `app-ui/` and `components/`, its importers, and what Part 7 does to them

### 1.1 `apps/web/src/app-ui/` (20 files)

"M7" = the importer is rewritten by Part 7 (M7.3–M7.11). Test files that only import `renderApp` are counted in the last row.

| File (lines) | Non-test importers on the ref | Test importers | Part 7 | After M7b |
|---|---|---|---|---|
| `Button.tsx` (55) | M7: `settings/SettingsPage.tsx:19`, `AccountPage.tsx:14`, `DeleteAccountPage.tsx:15`, `transactions/TransactionsPage.tsx:11`, `TransactionDetail.tsx:5`, `plans/PlansPage.tsx:14`, `SubscriptionRows.tsx:11`; **`app-ui/States.tsx:7` (`./Button`)** | — | M7.12 lists it | **Kept**: only importer `States.tsx` (surprise 5) |
| `Checkbox.tsx` (51) | M7: `DeleteAccountPage.tsx:16` | `ui-kit.test.tsx:5` | deleted M7.12 | gone |
| `DateOfBirthField.tsx` (47) | M7: `AccountPage.tsx:15` | `ui-kit.test.tsx:6` | deleted M7.12 | gone |
| `Dialog.tsx` (72) | M7: `house-ad/HouseAd.tsx:10`, `SettingsPage.tsx:20`, `SubscriptionRows.tsx:12`, `TransactionDetail.tsx:6` | `ui-kit.test.tsx:7` | deleted M7.12 | gone |
| `Flag.tsx` (2, re-export of `@/ui/Flag`) | none | none | — | **dead now** |
| `Locked.tsx` (30) | `practice/CustomizeDialog.tsx:11` (`LockedFeature`); `app-ui/Switch.tsx:5` | — | Switch deleted | `CustomizeDialog` only; `ui/ProBadge.tsx:19` has the same `LockedFeature` |
| `PronunciationLine.tsx` (2, re-export) | none | none | — | **dead now** |
| `Segmented.tsx` (38) | M7: `SettingsPage.tsx:21`, `PlansPage.tsx:15` | — | deleted M7.12 | gone |
| `Select.tsx` (86) | none | none | not in M7.12 | **dead now** (12 importers in the archive tag, 0 on the ref) |
| `SpeakButtons.tsx` (2, re-export of `@/ui/SpeakButton`) | `practice/session/AlternativeFeedback.tsx:6`, `AnswerFeedback.tsx:6` (`SpeakWord`) | — | — | residue; plan line 1683 "M8 switches the imports" |
| `States.tsx` (72) | `app-shell/RequireSession.tsx:6` (`OfflineScreen`); `practice/PracticePage.tsx:11`; `practice/WeakWordsPage.tsx:14`; `practice/session/PracticeSession.tsx:11`; `recall/RecallSession.tsx:5`; `recall/RecallSummary.tsx:7`; `review/ReviewSession.tsx:12`; M7: `plans/OrderReturnPage.tsx:14`, `PlansPage.tsx:16`, `DeleteAccountPage.tsx:18`, `TransactionsPage.tsx:12` | — | "stays for M8" (plan line 3085) | residue: 7 files |
| `StreakToast.tsx` (72) | `app-shell/AppProviders.tsx:8`; `practice/session/use-practice-session.ts:9`; `review/use-review-queue.ts:7` (`showStreak`) | `app-ui/streak-toast.test.tsx:4`, `recall/recall-session.test.tsx:5`, `review/review-session.test.tsx:5` | — | residue |
| `Switch.tsx` (70) | M7: `SettingsPage.tsx:22` | `ui-kit.test.tsx:8` | deleted M7.12 | gone |
| `TextField.tsx` (67) | M7: `AccountPage.tsx:16`, `DeleteAccountPage.tsx:17`; `DateOfBirthField.tsx:6` (`./`) | `ui-kit.test.tsx:9` | deleted M7.12 | gone |
| `Toast.tsx` (2, re-export of `@/ui/Toast`) | `app-shell/AppProviders.tsx:9` (`ToastRegion`); M7: `AccountPage.tsx:17`, `SettingsPage.tsx:23`, `SubscriptionRows.tsx:13` | 13: `add-word/{add-word,edit-suggestion,locked-add-word,m3-review,m5b-review,sentence-bulk}.test.tsx`, `groups/topic-picker.test.tsx`, `lookup/lookup.test.tsx`, `plans/plans.test.tsx`, `practice/session/practice-session.test.tsx`, `word/{my-word,word-page}.test.tsx`, `app-ui/toast.test.tsx` | "stays for M8" | residue: `AppProviders` + 13 tests |
| `date-of-birth.ts` (2, re-export of `@/lib/date-of-birth`) | `DateOfBirthField.tsx:5` (`./`) | `auth/auth.test.tsx:7`, `auth/auth-turnstile.test.tsx:9` (`parseBirthDate`) | — | residue: 2 tests |
| `test-utils.tsx` (60; `renderApp`, `pickDate`) | — | **63**: add-word 8, ads 1, auth 6, calendar 4, groups 5, house-ad 1, lookup 1, plans 2, practice 7, recall 2, review 3, settings 3, today 2, transactions 1, word 2, `ui/` 6, `app-chrome/` 6, `app-ui/` 3 | — | residue: every one |
| `streak-toast.test.tsx` (45) | | | — | moves with `StreakToast` |
| `toast.test.tsx` (54) | | | — | **holds the only tests of the toast exit view transition** (`:21-45`); `ui/overlays.test.tsx:57-84` covers show, link and timeout only. Move to `ui/`, do not delete |
| `ui-kit.test.tsx` (111) | | | all 9 cases go in M7.12 | delete the file |

Part 7's own check (`rg "@/app-ui/" src/features/learner/{settings,transactions,plans,house-ad} --glob '!*.test.*'`, plan lines 2540-2541, 3088)
excludes tests, so every rewritten M7 test keeps `@/app-ui/test-utils`.

### 1.2 `apps/web/src/components/` (45 files)

| Folder | Files | Importers outside `components/` | Design §6 target |
|---|---|---|---|
| `interactive/` | `Reveal.tsx`, `reveal.test.tsx` | `(site)/page.tsx:2` | `site/interactive/` |
| `landing/` | 30: 9 section components, `copy.ts`, `fill.ts`, `forgetting-curve.ts`, `test-utils.tsx`, 5 tests, `exercises/` 5 (2 tests), `showcase/` 7 (1 test) | `(site)/layout.tsx:7-8` (`getLandingCopy`, `LandingHeader`); `(site)/page.tsx:3-12`; **`e2e/landing.spec.ts:2`** (`exercise-set`) | `site/landing/` |
| `layout/` | `Logo.tsx` (**0 importers**), `SiteFooter.tsx`, `SkipLink.tsx` | `(site)/layout.tsx:5-6`; `landing/sections.test.tsx:8` | `site/layout/` |
| `sections/` | `LegalDocument.tsx` (+test), `LegalDraft.tsx`, `SourcesList.tsx` (+test) | `privacy/page.tsx:5-6`, `terms/page.tsx:5-6`, `sources/page.tsx:5` | `site/legal/` (design names only `legal/`; `SourcesList` is the sources page) |
| `seo/` | `JsonLd.tsx` | `(site)/layout.tsx:9` | `site/seo/` |
| `ui/` | `Button.tsx`, `ButtonLink.tsx`, `Container.tsx`, `ui.test.tsx` | `(site)/not-found.tsx:2-3`; inside: `Button` ← `ExerciseGallery.tsx:6`, `ButtonLink.tsx:3`; `ButtonLink` ← `FinalCta`, `Hero`, `LandingHeader`, `Plans`; `Container` ← 13 component files | "replaced by `ui/*`" (§6 row 3). `ui/Button.tsx`, `ui/ButtonLink.tsx` exist; there is no `ui/Container` |

Outbound imports that matter for the move: `LandingHeader.tsx:1-2` and `SiteFooter.tsx:1` → `@/app-chrome/*` (banned in `site/`, surprise 6);
`landing/test-utils.tsx:5` → `@/app-shell/theme/ThemeProvider` (allowed in `site/`). `(site)/layout.tsx:3-4` imports `@/app-shell/theme/*`; `app/`
routes have no lint rule. `components/layout/Logo.tsx` is the only importer of `i18n/navigation.ts` (`:1`); deleting it orphans that file.

### 1.3 Residue after M7b, by feature (M8's work)

| Feature | Files still on old UI after M7 (non-test) | Old import | New piece exists? |
|---|---|---|---|
| App shell | `app-shell/AppProviders.tsx:8-9` | `StreakToast`, `ToastRegion` | `ToastRegion`: yes (`ui/Toast`); `StreakToast`: no |
| App shell | `app-shell/RequireSession.tsx:6` | `OfflineScreen` | no |
| Practice home, Từ hay sai | `practice/PracticePage.tsx:11`, `practice/WeakWordsPage.tsx:14` | `ErrorState`, `EmptyState`, `FullScreenSpinner` | Error/Empty yes; spinner no |
| Tùy chỉnh phiên | `practice/CustomizeDialog.tsx:11` | `LockedFeature` | yes (`ui/ProBadge`) |
| Practice session | `practice/session/PracticeSession.tsx:11`; `AlternativeFeedback.tsx:6`, `AnswerFeedback.tsx:6`; `use-practice-session.ts:9` | `ErrorState`; `SpeakWord`; `showStreak` | yes; yes (`ui/SpeakButton`); no |
| Ôn (recall) | `recall/RecallSession.tsx:5`, `recall/RecallSummary.tsx:7` | `NotFoundState`; `ErrorState`, `FullScreenSpinner` | no; partly |
| Học (review) | `review/ReviewSession.tsx:12`, `review/use-review-queue.ts:7` | `EmptyState`, `FullScreenSpinner`, `NotFoundState`; `showStreak` | partly; no |
| Public site | 7 route files under `app/[locale]/(site)/` + 33 non-test files in `components/` | `@/components/*`, `@/app-chrome/{Logo,ThemeToggle}` | moves to `site/` |
| Tests | 63 (`renderApp`/`pickDate`), 13 (`ToastRegion`), 2 (`parseBirthDate`), 2 (`StreakToast`); `e2e/landing.spec.ts:2` | `@/app-ui/*`, `../src/components/*` | — |
| Dead, delete | `app-ui/{Flag,PronunciationLine,Select}.tsx`, `components/layout/Logo.tsx` | — | — |

## 2. Old token classes

### 2.1 What the old set exposes

| Source | Names (utility forms) |
|---|---|
| `theme.css` colours (`:9-50`, 38) | `primary`, `primary-deep`, `primary-soft`, `on-primary`, `on-primary-muted`, `accent`, `accent-deep`, `accent-soft`, `ink`, `muted`, `placeholder`, `surface`, `canvas`, `canvas-deep`, `border`, `border-strong`, `success`, `success-soft`, `warning`, `danger`, `danger-soft`, `danger-deep`, `neutral-soft`, `wrong-chip`, `wrong-chip-deep`, `navy`, `navy-raised`, `navy-card`, `hero`, `hero-raised`, `on-hero`, `on-hero-muted`, `on-navy`, `on-navy-muted`, `session-card`, `on-accent`, `highlight`, `shadow-ink` (with `bg-`, `text-`, `border-*`, `ring-`, `ring-offset-`, `outline-`, `fill-`, `stroke-`, `divide-`, …) |
| `theme.css` radii (`:53-58`) | `rounded-{sm,control,inner,panel,card,feature}` (`sm` = 0.5rem overrides Tailwind's 0.25rem, `tailwindcss/theme.css:398`, 4.3.3) |
| `theme.css` shadows (`:61-65`) | `shadow-ledge`, `-ledge-accent`, `-ledge-wrong`, `-ledge-card`, `-ledge-soft` |
| `theme.css` motion (`:68-78`), font (`:6`) | `duration-{instant,fast,base,slow}`, `ease-{standard,enter,exit,spring}`, vars `--motion-{wiggle,pop,toast}`, `--font-sans` (Lexend) |
| `dark.css` | same colour names under `[data-theme='dark']`, plus `color-scheme: dark` (`:6`) |
| `island.css` | `pastel-island`, `md:pastel-island` (0 uses) |
| `dark-pastel.css` | not imported (`tokens.test.ts:125-127` pins that) |
| web-local old tokens in `globals.css` 2nd `@theme` (`:62-367`) | `text-{display,landing-h1,cta,h2,title-lg,h3,title,lead,subtitle,body-lg,body,label,small,caption,ui}`; `max-w-{content,cta,faq,heading,prose,practice,copy,aside,landing-hero}`; `--spacing-{header,control,control-touch}`; `shadow-{sheet,button,button-secondary,button-danger,dialog,menu,toast,soft-card}` (built on old colours, `:117-127`); `--motion-overlay`; `duration-{faq,flip}`; `ease-out-strong`; `animate-{overlay-in/out,dialog-in/out,sheet-in/out,menu-in,menu-in-up,menu-out,toast-in,theme-icon-in/out,card-in,wiggle,pop,slide-*,card-rise,feedback-in,panel-drop,wiggle-soft,pop-in,summary-in,streak-flame,hero-in,hero-window-in}` |
| `globals.css` utilities | `pressed` (`:400`), `highlighter` (`:405`), `pb-safe` (`:410`), `tilt-card` (`:415`), `no-scrollbar` (`:419`), `app-mesh` (`:429`), `auth-card-glow` (`:452`), `auth-panel-glow` (`:460`), class `.faq-item` (`:468-493`), variant `placement-top:` (`:370`) |

Note: `max-w-*` resolves `--max-width` before `--container` (`tailwindcss/dist/lib.mjs`: `"max-w",["--max-width","--spacing","--container"]`), and
Tailwind's default theme still declares `--max-width-prose: 65ch` (`tailwindcss/theme.css:509`, deprecated block). So `max-w-prose` is probably
65ch today and `--container-prose: 40rem` probably does nothing (UNVERIFIED: built CSS not inspected).

### 2.2 Uses on the ref, by bucket

| Bucket | Uses | Files |
|---|---|---|
| Part 7 rewrites (ignore; `app-chrome/AvatarMenu.tsx` excepted, below) | 382 | 21 |
| Public pages (`components/**`, `app/[locale]/(site)/**`) | 552 | 28 |
| `app-ui/` survivors (`Button`, `Locked`, `Select`, `States`, `StreakToast`) | 106 | 5 |
| `app/globals.css` | 93 | 1 |
| Everything else, non-test | 64 | 33 |
| Tests | 19 | 9 |

The 64 "everything else" uses include web-local utilities the new UI still needs: `ease-out-strong` ×12, `app-mesh`, `auth-card-glow` ×2,
`auth-panel-glow`, `pb-safe`, `no-scrollbar`, `placement-top:`. `--ease-out-strong` (`globals.css:209`) has the same value as `--ease-wm-out`
(`web.css:196`, `cubic-bezier(0.23, 1, 0.32, 1)`).

On M7a the Part 7 bucket is already down to 277 uses in 15 files (settings and account done). `AvatarMenu.tsx:63` (`:44` on the ref) keeps `animate-menu-in` there,
so it stays residue after M7.

### 2.3 Residue M8 must convert (outside Part 7, public pages, `app-ui/`)

Old colour, size, radius and container classes:

| File:line | Classes | Note |
|---|---|---|
| `app/[locale]/app/layout.app.tsx:20` | `bg-canvas text-ink` | wrapper of every `/app` page |
| `app-chrome/Logo.tsx:11-14` | `fill-accent`, `stroke-on-accent`, `text-on-navy`, `text-ink`, `text-title` | old `Logo` export, landing only (R14) |
| `app-chrome/ThemeToggle.tsx:36,39-40` | `rounded-control`, `text-on-navy`, `hover:bg-navy-raised`, `focus-visible:ring-accent`, `animate-theme-icon-out/in` | landing only |
| `app-shell/AppProviders.tsx:67,69` | `bg-danger-soft`, `text-ui`, `text-ink`, `text-primary` | `OfflineBand` |
| `features/learner/groups/highlight.tsx:18` | `text-primary` | `highlightWord`, used by `add-word/AddSentenceSheet.tsx`, `review/CardStack.tsx` |
| `ui/PronunciationLine.tsx:28,31` | `text-caption`, `text-muted`, `text-body`, `text-ink` | inside `ui/` |
| `practice/session/ReportDialog.tsx:133` | `rounded-control` | |
| `practice/session/SessionNotice.tsx:64` | `rounded-sm` | becomes 0.25rem without `theme.css` |
| `groups/GroupPage.tsx:341` | `max-w-prose` | see note in §2.1 |

Old animations (defined in `globals.css` on `theme.css` variables, surprise 1): `app-chrome/AvatarMenu.tsx:44` `menu-in`; `ui/Select.tsx:62`
`menu-in`, `menu-in-up`, `menu-out`; `ui/Toast.tsx:58` `toast-in`; `ui/HelpTip.tsx:21` `feedback-in`; `ui/AnswerOption.tsx:55` `pop-in`;
`practice/CustomizeDialog.tsx:333,443,458` `feedback-in`; `practice/session/AlternativeFeedback.tsx:31` `feedback-in`; `AnswerFeedback.tsx:87`
`panel-drop` (literal curve, no old var); `McqQuestion.tsx:39` `wiggle-soft`; `PracticeSession.tsx:356` `feedback-in`; `QuestionCard.tsx:39`
`card-rise`; `TypeWordQuestion.tsx:80` `panel-drop`; `review/ReviewSummary.tsx:14-18` `summary-in` ×5.

Tests that pin old class names: `practice/session/practice-session.test.tsx:343-370, 462` (`animate-card-rise`, `animate-wiggle-soft`,
`animate-pop-in`, `animate-panel-drop`, `animate-summary-in`), `review/review-session.test.tsx:136` (`animate-summary-in`),
`components/ui/ui.test.tsx:16-32` (goes with `components/ui`), `app-ui/ui-kit.test.tsx:34` (goes in M7.12).

`app-ui/` survivors: `Button.tsx` 33 uses, `Select.tsx` 29, `States.tsx` 28, `StreakToast.tsx` 10 (`bg-navy`, `text-on-navy`, `fill-accent`,
`text-accent-deep`, `shadow-toast`, `animate-toast-in`, `animate-streak-flame`), `Locked.tsx` 6.

### 2.4 Public pages (552 uses, 28 files)

| Area | Uses | Heaviest files |
|---|---|---|
| `components/landing/**` | 416 | `exercises/ExerciseGallery.tsx` 100, `MetOutside.tsx` 38, `showcase/ReviewCardDemo.tsx` 32, `ReviewTiming.tsx` 30, `Plans.tsx` 28, `WhyForget.tsx` 25, `showcase/LookupDemo.tsx` 25 |
| `components/sections/**` | 57 | `LegalDocument.tsx` 29, `SourcesList.tsx` 21, `LegalDraft.tsx` 7 |
| `components/ui/**` | 51 | `Button.tsx` 31, `ui.test.tsx` 19, `Container.tsx` 1 |
| `components/layout/**` | 19 | `Logo.tsx` 8 (dead), `SiteFooter.tsx` 7, `SkipLink.tsx` 4 |
| `components/interactive/**` | 4 | `Reveal.tsx` 2 (`duration-slow`, `ease-enter`), its test 2 |
| `app/[locale]/(site)/not-found.tsx` | 5 | the other `(site)` route files have none |

Most-used old utilities overall: `text-ink` 152, `text-muted` 76, `text-caption` 67, `text-ui` 56, `text-body` 52, `bg-surface` 49,
`border-border` 32, `text-primary` 30, `rounded-card` 26, `text-h2` 20, `text-title` 19, `min-h-control-touch` 18, `rounded-inner` 18.

### 2.5 Custom CSS in `globals.css` beyond the `@import` lines (`:1-9`)

| Lines | What | Users | Depends on old set |
|---|---|---|---|
| 13-17 | `@theme inline` `--font-wm-{sans,display,mono}` | everywhere | no |
| 20-53 | `--animate-wm-{overlay-in,dialog-in,sheet-in,pop-out,picker-in}` + keyframes | `ui/Dialog.tsx`, `calendar/CalendarModal.tsx`, `DayDialog.tsx`, `groups/FloatingBar.tsx`, `GroupPicker.tsx`, `AvatarMenu.tsx` | `wm-overlay-in` uses keyframe `fade-in` (`:143`) and `--ease-out-strong` (`:209`), both in the old block |
| 56-60 | `--blur-wm-lg` 12px below 48rem | wm blur | no |
| 62-367 | old `@theme` block (§2.1) | §2.3, §2.4 | yes: shadows `:117-127`, animations `:129-141, 212-263` |
| 370 | `@custom-variant placement-top` | `ui/Select.tsx:62` | no |
| 375-397 | toast view transition | `ui/Toast.tsx` | yes: `--transition-duration-fast`, `--ease-standard`, `--ease-exit` |
| 400 | `@utility pressed` | `app-ui/Button.tsx:41` only | no |
| 405 | `@utility highlighter` | `app-chrome/PageTitle.tsx:11`, removed by M7.1 | `--color-highlight` |
| 410, 419 | `pb-safe`, `no-scrollbar` | `MobileTabBar.tsx:17`; `GroupPage.tsx:247`, `showcase/AppShowcase.tsx:67` | no |
| 415 | `tilt-card` | none | no |
| 429-465 | `app-mesh`, `auth-card-glow`, `auth-panel-glow` | `ui/DotGridBackground.tsx:6`; `CardFrame.tsx:29`, `SplitFrame.tsx:24`; `AuthShowcase.tsx:16` | no (wm colours) |
| 468-493 | `.faq-item` | `landing/Faq.tsx:6,22` | no |
| 496-563 | `@layer base`: html scroll, font-size above 90rem, `scroll-padding-top: var(--spacing-header)`, `body`, `summary` marker, `:focus-visible`, reduced motion | global | **yes**: `body` `:519-520`, focus `:532-548` |
| 565-675, 809-812, 918-925, 943-945 | `.gstack*` | `groups/GroupStack.tsx`, `today/TodayPage.tsx`, `DeckRow.tsx` | no |
| 679-780, 861-864 | `.gcar-*` | `GroupCarousel.tsx`, `GroupListPage.tsx`, `GroupPage.tsx` | no |
| 784-805, 866-915 | `.wm-page-in/out`, `.wm-carousel-in/out`, `.wm-card-lift` | `groups/flip.ts`, `GroupListPage.tsx`, `TodayPage.tsx` | no |
| 813-858 | `.lk-*` (raw hex, R71, R80) | `lookup/DictionaryPage.tsx`, `LiftedCard.tsx`, `StackTargets.tsx` | no |
| 822-830 | `.wd-title` | `word/WordPage.tsx` | no |
| 932-945 | `.deck-row*` | `today/DeckRow.tsx`, `TodayPage.tsx` | no |
| 950-992 | `.cstack*` | `review/CardStack.tsx` | uses `--ease-out-strong` |

## 3. Tests and lint rules that guard tokens today

| Guard | What it checks | Reads the old set | M8 impact |
|---|---|---|---|
| `src/styles/text-classes.test.ts` | every `text-*` in non-test `.tsx` names a colour, type token or built-in (regex `:37`, walker `:25-31`) | allowed names from `theme.css` (`:9`) and `globals.css` (`:10`, colour and text) plus `web.css` (`:12`) | Narrow to `web.css` + built-ins + kept web-local names, and it becomes half of the "no old class" test |
| `src/styles/tokens.test.ts` | LP12 contrast of `theme.css` (`:58-77`); D3 every light colour has a dark one (`:79-82`); app pairs light and dark (`:84-90`); LP31 rem sizes and clamps of `globals` `text-display/cta/h2` (`:92-112`); UBC1 web declares no `--color-` (`:114-117`); `dark-pastel` not imported and readable (`:121-136`); **`island.css` imported** (`:142-144`); island and navy-card contrast (`:146-161`); brace balance of `globals.css` (`:165-175`) | `theme.css`, `dark.css`, `island.css`, `dark-pastel.css`, `globals.css` | `:142-144` fails when the import goes. LP31 fails if the clamp tokens leave `globals.css` (the public pages use `text-h2`, `text-cta`). The rest tests package files web no longer uses |
| `src/styles/web-tokens.test.ts` | `web.css` vs `web-dark.css` key parity, contrast, rem rule, pinned values, stage, group and motion tokens | `web.css`, `web-dark.css` | none; M7a adds 7 lines |
| `src/styles/app-background.test.ts` | the `app-mesh` background | `globals.css` | none |
| `apps/admin/src/styles/tokens.test.ts` | UBC1 for admin (`:33-37`), admin contrast pairs from `theme.css` (`:8`) | `theme.css` | none (`theme.css` is not touched, design §7.1) |
| `packages/design-tokens` | no test files (package = 6 CSS, `README.md`, `package.json`) | — | — |
| `src/lib/cn.ts` | `tailwind-merge` `font-size` group: 14 old sizes (`:9`) + 15 `wm-` sizes (`:12-15`) | names, not files | drop `:9`; add the missing `wm-` sizes (surprise 8) |
| `scripts/check-tailwind-raw.mjs` (in `pnpm lint`) | no `-[…]` arbitrary values and no `style={` in non-test `.tsx` outside image routes, unless `// raw-ok:` (`:7-27`) | — | none; its shape (pure `findRawClasses` + `check-tailwind-raw.test.ts`, walker `:29-35`) is a model for a `findOldClasses` check |
| `scripts/import-rules.test.ts` | folder deny-lists through `ESLint.lintText` on virtual paths (`:9-12`) | — | model for banning `@/app-ui/*`, `@/components/*` after deletion (typecheck already fails on a deleted path) |

**Is there a list of old class names?** No static list in code or docs (grep for "old class", "OLD_", "LEGACY" in `apps/web`: only an unrelated
type in `practice/session/HintPanel.tsx:13`). What a new test can reuse:
- `names(css, prefix)` (`text-classes.test.ts:15-16`) and `tokens(css, prefix)` (`tokens.test.ts:12-16`) derive the old colour, radius and shadow
  names from `theme.css`, which stays in the package for admin, so the list follows any change there.
- The web-local old names (§2.1 last two rows) and `pastel-island` must be written by hand once `globals.css` drops them.
- Names that are also Tailwind defaults need a decision: `rounded-sm`, `max-w-prose`, `font-sans`.
- `ease-out-strong` and `placement-top:` are web-local and still used by `ui/`.
- What worked here: blank comments and code, scan only string and template literals, match
  `(?<![\w-])(?:variant:)*(prefix)-(oldname)(?:/\d+)?(?![\w-])` where `oldname` is not `wm-…`.

## 4. `packages/design-tokens`

- `package.json` `exports`: `./theme.css`, `./dark.css`, `./dark-pastel.css`, `./island.css`, `./web.css`, `./web-dark.css`.
- Admin imports only `theme.css`: `apps/admin/src/styles/globals.css:2` and `apps/admin/src/styles/tokens.test.ts:8`. Its only other reference is the
  dependency in `apps/admin/package.json:19`.
- Web imports `theme.css`, `dark.css`, `island.css`, `web.css`, `web-dark.css` (`globals.css:2,4,6,8,9`).
- Web tests read `theme.css` (`tokens.test.ts:6`, `text-classes.test.ts:9`), `dark.css` (`tokens.test.ts:9`), `dark-pastel.css` (`:122`),
  `island.css` (`:140`), `web.css` and `web-dark.css` (`web-tokens.test.ts:7-8`, `text-classes.test.ts:12`).
- README rules:
  - colours only in the package, and web `tokens.test.ts` checks LP12 and UBC1 (`README.md:12-13`);
  - the dark theme is web only, and web `tokens.test.ts` checks it (`:56-63`);
  - `dark-pastel` is not on (`:65-71`);
  - `island.css` is "imported by `apps/web`" (`:73-78`);
  - the `wm-` set: "`apps/web` imports both sets until its old screens are gone (M8) … Admin imports neither" (`:105-112`).
  - After M8, lines 13, 59-63, 75 and 110-111 are stale; the README is a document promise (rule `testing-boundaries`).
- Design §7.1: M8 drops the old imports from web once `grep` finds no old class, and adds a test for it (`design:340`). `theme.css` is never edited
  (`:341`). `dark.css`, `island.css` and `dark-pastel.css` are deleted only in M9, after checking admin does not import them (`:342`).
- **"The four admin checks"** = `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in `apps/admin`, run whenever `packages/design-tokens`
  changes. Defined at plan line 803 (M2.5), named "the four admin checks" at plan lines 2599, 2893 and 3114, and listed in design §13 (`design:847`).
  - `build` needs the CI variables: `VITE_API_BASE_URL=https://admin-api.wordmet.com` and `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
    (`.github/workflows/ci.yml:146-150`; delivery `giao-dien-moi.md:188`).
  - The deliveries record admin tests timing out when the machine is busy; rerunning them alone passed (`giao-dien-moi.md:236, 263, 306, 387`).
  - M8 needs these checks only if it edits the package (README, or `color-scheme` in `web-dark.css`).

## 5. Other leftovers from design §14

### 5.1 `HistoryPage.tsx`

Gone. No file matches `HistoryPage|MyReportsTab|AppShell|SearchStrip|AppFooter` under `apps/web/src` on the ref. `HistoryPage` survives only
as a type name in `calendar/calendar-api.ts:36`. M6.7 deleted it (delivery `giao-dien-moi.md:381`; plan line 2358).
`/app/practice/history` is a server redirect (`(chrome)/practice/history/page.app.tsx`, `history-target.ts`).

### 5.2 `docs/deliveries/giao-dien-cu-map.md` (167 lines)

What it lists:
- tag `50b632e7…` (`:3`);
- 28 `/app` screens (`:12-39`): 7 auth, 21 member, `/practice/history` included;
- three layouts (`:43-45`);
- `app-chrome/` 13 files, `app-ui/` 29, `components/` 45;
- the four token CSS files;
- 14 feature folders (`:154-167`).

Missing:
- the public routes `(site)/page.tsx`, `privacy`, `terms`, `sources`, `not-found.tsx`, `[...rest]/page.tsx`, and `(site)/layout.tsx`;
- the root `app/[locale]/layout.tsx`, `opengraph-image.tsx`, `apple-icon.tsx`, `icon.svg`, `manifest.ts` and `app/globals.css`, all present in the tag;
- `lib/` and `app-shell/` (not screens, so arguably fine).

The `components/` list does cover the public sections. Every file named was checked against the tag's route list (`git ls-tree` on the tag).

### 5.3 Tag

`archive/giao-dien-cu-2026-11` exists locally and on GitHub. `git ls-remote --tags origin 'archive/*'` →
`50b632e77175d249333add42afdbe07a4381bea3 refs/tags/archive/giao-dien-cu-2026-11`. No peeled `^{}` line, so it is a lightweight tag.

### 5.4 Helpers used only by old UI

These are non-test modules in `lib/`, `app-shell/`, `features/`, `app-chrome/`, `ui/`, `styles/` and `i18n/` with no live importer outside
`app-ui/`, `components/`, `(site)` and tests:

| Module | Importers | Verdict |
|---|---|---|
| `app-chrome/ThemeToggle.tsx` | `components/landing/LandingHeader.tsx:2`, `app-chrome/theme-toggle-button.test.tsx:6`. Its `ThemeToggle` export has no user; only `ThemeToggleButton` is used | public site only; cannot stay in `app-chrome` once the landing is in `site/` |
| `app-chrome/Logo.tsx` `Logo` export | `LandingHeader.tsx:1`, `SiteFooter.tsx:1` | same; `AppLogo` in the same file is live |
| `i18n/navigation.ts` | `components/layout/Logo.tsx:1` (dead file) | orphan after M8 |
| `lib/format-day.ts`, `lib/legal.ts`, `lib/legal-outline.ts`, `lib/sources.ts` | `(site)` pages, `components/sections/*` | live public-site helpers; design §6 keeps them in `lib/` |
| `lib/fly-into.ts`, `app-shell/api/idempotency.ts` | own tests only, on the ref **and** in the archive tag | pre-existing dead code, not caused by the new UI (leave unless asked) |
| `ui/Card.tsx` | none | new kit, unused so far (not old UI) |
| `ui/Dialog.tsx` `wide` prop (`:18-19, 35, 47`) | only `ui/overlays.test.tsx:73-74` ("until M8"); no caller passes `wide` | drop the alias and the case in M8 (R62) |

No module under `features/**` is used only by old pieces.

Hex values of the old palette outside classes:
- `app/[locale]/opengraph-image.tsx:34-44`: `#1b2444`, `#0f1a3d`, `#ffd84a`, `#b9c1e0`;
- `layout.tsx:38` `themeColor` `#121833` / `#1b2444`;
- `manifest.ts:9-10` `#faf8f5`;
- `apple-icon.tsx`, `icon.svg`.

These belong to the public/SEO half (design §11, §5.8). A class test does not see them.

## 6. Top-level entries of `apps/web/src`

| Entry | Design §6 says | State on the ref |
|---|---|---|
| `app/` | routes only | routes plus `globals.css`, `icon.svg`, `apple-icon.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `[locale]/opengraph-image.tsx`, `og-fonts.generated.ts`, `practice/history/history-target.ts` |
| `app-chrome/` | rewritten chrome | holds the landing-only `Logo` and `ThemeToggle` (§5.4) |
| `app-shell/` | keep | — |
| `app-ui/` | delete (M1–M8) | 20 files (§1.1) |
| `components/` | move to `site/` and `ui/` (M8) | 45 files (§1.2) |
| `features/` | `features/learner/<khu>/` | only `learner/` (15 areas) |
| `i18n/`, `lib/` | keep | `i18n/navigation.ts` orphaned by M8 |
| `styles/` | `fonts.ts`, mesh + grain background, motion keyframes, token tests | **only the 4 token tests**. Fonts are in `app/[locale]/layout.tsx:5`; mesh and keyframes are in `globals.css`. No milestone named |
| `ui/` | one kit | 31 components, `field-styles.ts`, 7 tests |
| `site/` | public parts | **does not exist yet**; the lint rule already covers `src/site/**` (`eslint.config.mjs:11`) |
| `global.d.ts` | not mentioned | next-intl `AppConfig` augmentation |
| `proxy.ts` | not mentioned | Next.js 16 proxy (CSP nonce, locale); stays at `src/` root (Next convention, not re-checked in docs) |
| (none) | — | no folder for test helpers: `app-ui/test-utils.tsx`, `app-shell/session/test-support.ts`, `components/landing/test-utils.tsx`, `lib/speech/speech-test-support.ts` |

## 7. Risks and open questions for the plan

1. **Where `renderApp` and `pickDate` go** (63 test files, surprise 3). Options:
   - a new `src/test/` folder, not in §6;
   - `app-shell/` (no lint rule there, but app-shell would then import `app-chrome` and `features`);
   - `ui/` plus widening its lint exemption.
   The edit itself is mechanical (one import line each).
2. **How to keep the motion and base styles once `theme.css` leaves web** (surprise 1). Options:
   - move the needed motion values into `web.css` as `wm-` names (package change → the four admin checks);
   - declare them in `globals.css` (UBC1 forbids only colours);
   - re-point to existing `wm-` easings (`--ease-wm-out` equals `--ease-out-strong`).
   Same question for `body` and `:focus-visible` (`globals.css:519-548`). No test fails either way, so the plan needs a browser or `cf:docker`
   check (toast exit, select menu, focus ring on a plain link).
3. **`color-scheme: dark`** must move somewhere (surprise 2). `web-dark.css` is a package change; `globals.css` is not.
4. **Which old animations count as "old classes".** `feedback-in`, `pop-in`, `summary-in`, `card-rise`, `wiggle-soft`, `panel-drop`, `menu-*` and
   `toast-in` live in web's own `globals.css`, not in the package, and new code uses them. Rename to `wm-` (tests at
   `practice-session.test.tsx:343-370, 462` and `review-session.test.tsx:136` change), or keep the names and only fix their variables.
5. **New pieces needed before `app-ui/` can go:** `FullScreenSpinner`, `OfflineScreen`, `NotFoundState` (no `ui/` version; `SkeletonPage` and
   M7a's `SkeletonBlocks` may replace the spinner), and a new-look `StreakToast`. Figma frames for them were not checked in this survey.
6. **`site/` cannot import `app-chrome`** (surprise 6). Options:
   - move `AppLogo` to `ui/`, `ThemeToggleButton` (it needs `@/app-shell/theme`, which `ui/` may not import) to `site/layout/`, and drop the old `Logo`;
   - or relax the rule.
   This depends on what the public-pages half draws (Figma `3:14`).
7. **Overlap with the public-pages half of M8.** 552 old-class uses in 28 public files. If those pages are rebuilt from Figma, moving
   `components/landing/**` to `site/` first and restyling second is double work. The plan should order the two halves and say which files are
   moved as they are (`copy.ts`, `fill.ts`, `forgetting-curve.ts`, `exercise-set.ts`, `check.ts`, `JsonLd.tsx`, `SkipLink.tsx`, tests). Also
   `e2e/landing.spec.ts:2` and `apps/web/README.md:73`.
8. **Test changes the import drop forces:** `tokens.test.ts:142-144` (island import); LP31 `:92-112` if the clamp tokens leave `globals.css`; the
   LP12, D3 and pastel tests then check package files web no longer uses (keep them until M9, or move them?). `text-classes.test.ts` must lose
   `theme.css` names. README `:13` promises those tests.
9. **Silent value changes when `theme.css` goes:**
   - `rounded-sm` 0.5rem → 0.25rem (`SessionNotice.tsx:64`; Tailwind default verified in `tailwindcss/theme.css:398`);
   - `font-sans` → Tailwind default (only `html`; `body` sets `--font-wm-sans`);
   - `max-w-prose` probably unchanged (§2.1 note, UNVERIFIED).
10. **`cn.ts` defect** (surprise 8). A red test, then the fix: two commits (`git-conventions`). It is a defect today, not cleanup; it may belong in
    M8 when `cn.ts:9` is edited anyway, or earlier.
11. **M7.12 grep gap** (surprise 5). M8 inherits `app-ui/Button.tsx` until `States` is replaced. Use an import-resolving check (or `pnpm typecheck`
    after each deletion), not `git grep` on the path string.
12. **`app-ui/toast.test.tsx`** holds the only toast exit tests; move it to `ui/` with `streak-toast.test.tsx`, do not delete it with the folder.
13. **`giao-dien-cu-map.md` lacks the public pages** (§5.2). Add them before M8 changes those files, or §14 "đủ màn" is not met.
14. **`styles/` content** (§6): design §6 puts fonts, mesh and keyframes there, but no milestone names the move. Decide whether M8 does it or it
    stays as is.
15. **Dead files to delete in M8:**
    - `app-ui/{Flag,PronunciationLine,Select}.tsx`;
    - `components/layout/Logo.tsx`, then `i18n/navigation.ts` if nothing else needs `next-intl/navigation`;
    - the `Dialog` `wide` alias.
    `lib/fly-into.ts` and `app-shell/api/idempotency.ts` were dead before the new UI: leave them unless the owner asks.
16. **Projection risk.** Everything marked "after M7" assumes Part 7 lands as written. M7a is not merged and M7b is not started; M7a is one merge
    behind the ref (no PR #262). Re-run the importer and class scans on `origin/refactor/giao-dien-moi` after M7b merges.

**UNVERIFIED in this survey:**
- runtime effect of the unresolved `var()`s (no browser run);
- whether `max-w-prose` uses 65ch today (built CSS not read);
- `cn` behaviour, checked with a copy of the config, not the app's module;
- Figma frames for the missing state components;
- the content of the parallel M8 survey files (`…-m8-site.md`, `…FIGMA_FACTS…-m8-a/b.md`), not read.
