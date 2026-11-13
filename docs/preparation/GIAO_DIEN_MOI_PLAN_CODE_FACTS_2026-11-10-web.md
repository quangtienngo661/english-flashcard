# Giao diện mới M1 ("Nền"): web code facts for the plan (10/11/2026)

Read-only survey for the M1 plan of `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` (§5, §6, §7, §8, §9 M1).
Branch `docs/giao-dien-moi-design`, HEAD `777f74cd` (= `origin/dev` `50b632e7` + four docs commits; `git status` shows no change under
`apps/` or `packages/` except the untracked `apps/web/logo/`). Paths are relative to the repo root unless they start with `src/`, which
means `apps/web/src/`. Line numbers are from this HEAD. No code was changed.

What was run (not only read): an importer count script over `apps/web/src` (resolves `@/` and relative imports); `tailwind-merge` on
`wm-` class pairs (§13); the ESLint programmatic API on a virtual file (§5); `font-data.json` of Next 16.4.3 (§6); the Tailwind 4.3.3
default theme (§1). Everything else is read from source. No test suite, build or e2e was run.

---

## 1. `packages/design-tokens`

### 1.1 `package.json` (11 lines)

- `name`: `@wordmet/design-tokens` (`packages/design-tokens/package.json:2`), `private: true` (:4), no dependencies, no scripts.
- `exports`, exactly (:5–10):
  ```json
  "exports": {
    "./theme.css": "./theme.css",
    "./dark.css": "./dark.css",
    "./dark-pastel.css": "./dark-pastel.css",
    "./island.css": "./island.css"
  }
  ```
  A new `web.css` / `web-dark.css` must be added here, or `@import '@wordmet/design-tokens/web.css'` and
  `createRequire(import.meta.url).resolve(...)` in the tests fail (design §7.1 says the same).
- Consumers (grep over `apps/`, `packages/`): `apps/web/package.json:28`, `apps/admin/package.json:19` (`workspace:*`);
  `apps/admin/src/styles/globals.css:2` imports **only** `theme.css`; `apps/web/src/app/globals.css:2,4,6` imports `theme.css`, `dark.css`,
  `island.css`; tests: `src/styles/tokens.test.ts:6,9,122,140`, `src/styles/text-classes.test.ts:9`, `apps/admin/src/styles/tokens.test.ts:8`.
- Docker: `apps/web/scripts/cf-docker.mjs:25` mounts the whole repo live, so new package files need no copy step.

### 1.2 `theme.css` (79 lines): one Tailwind v4 `@theme { … }` block (:3–79), nothing outside it

Tailwind emits `@theme` variables on `:root, :host` (checked in `node_modules/.pnpm/tailwindcss@4.3.3/.../dist/lib.js`) inside the
`theme` layer; each `--<namespace>-<name>` also creates utilities (`bg-*`, `text-*`, `rounded-*`, `shadow-*`, `duration-*`, `ease-*`).

| Group | Lines | Tokens (value) |
|---|---|---|
| Font | :6 | `--font-sans: var(--font-lexend, 'Lexend'), ui-sans-serif, system-ui, sans-serif` (overrides Tailwind's default `--font-sans`) |
| Colour, B direction | :9–33 | `primary #2445d6`, `primary-deep #1a32a6`, `primary-soft #eceffe`, `on-primary #ffffff`, `on-primary-muted #dfe5ff`, `accent #ffd84a`, `accent-deep #c9a21a`, `accent-soft #fff4c7`, `ink #0f1a3d`, `muted #4d5577`, `placeholder #5f6688`, `surface #ffffff`, `canvas #f1f3fd`, `canvas-deep #dde1f5`, `border #e3e6f4`, `border-strong #7d84a8`, `success #1b7a46`, `success-soft #e3f4ea`, `warning #7a5200`, `danger #b8352a`, `danger-soft #fde8e5`, `danger-deep #8a2219`, `neutral-soft #eef0f5`, `wrong-chip #ffd3cd`, `wrong-chip-deep #d99b92` (all `--color-*`) |
| Colour, learner app | :36–50 | `navy #1b2444`, `navy-raised #2c3760`, `navy-card #121833`, `hero #eceffe`, `hero-raised #ffffff`, `on-hero #0f1a3d`, `on-hero-muted #4d5577`, `on-navy #f1f3fd`, `on-navy-muted #b9c1e0`, `session-card: var(--color-canvas)` (alias), `on-accent #0f1a3d`, `highlight #ffd84a`, `shadow-ink: rgb(15 26 61 / 0.35)` |
| Radius | :53–58 | `--radius-sm 0.5rem` (overrides Tailwind's 0.25rem), `--radius-control 0.75rem`, `--radius-inner 0.875rem`, `--radius-panel 1rem`, `--radius-card 1.25rem`, `--radius-feature 1.5rem` |
| Shadow ("ledge") | :61–65 | `--shadow-ledge: 0 0.25rem 0 var(--color-shadow-ink)`, `-ledge-accent` (accent-deep), `-ledge-wrong` (wrong-chip-deep), `-ledge-card: 0 1.5rem 0 var(--color-primary-deep)`, `-ledge-soft: 0 0.3rem 0 var(--color-border)` |
| Duration | :68–71 | `--transition-duration-instant 100ms`, `-fast 150ms`, `-base 250ms`, `-slow 400ms` (Tailwind's `duration-*` only reads this namespace, comment :67, README :101–102) |
| Motion (plain vars) | :72–74 | `--motion-wiggle 300ms`, `--motion-pop 320ms`, `--motion-toast 300ms` |
| Easing | :75–78 | `--ease-standard cubic-bezier(0.2, 0, 0, 1)`, `--ease-enter cubic-bezier(0.05, 0.7, 0.1, 1)`, `--ease-exit cubic-bezier(0.3, 0, 0.8, 0.15)`, `--ease-spring cubic-bezier(0.34, 1.56, 0.64, 1)` |

No spacing or type tokens here; those live in each app (`apps/web/src/app/globals.css`, `apps/admin/src/styles/globals.css`).

### 1.3 `dark.css` (45 lines)

- One rule `[data-theme='dark'] { color-scheme: dark; … }` (:5–45) redefining **every** colour of `theme.css` (35 `--color-*`), values
  from Figma file `7HcPAKLrWu32C27qYMJUOA` "Wordmet B" Dark mode. `border-strong #6b7491` is a contrast fix (:22). No radius/shadow/motion.
- Comment :3 says both the `/app` layout **and the landing** set `data-theme` (correct; see §7).

### 1.4 `dark-pastel.css` (83 lines), not imported anywhere

- `[data-theme='dark'] { … }` (:8–16) puts the light pastels back on the six soft tokens.
- `[data-theme='dark'] :is(.bg-primary-soft, …)` plus state variants (:21–53) re-apply the full light palette inside those surfaces;
  `@media (width >= 48rem) [data-theme='dark'] .md\:bg-accent-soft` (:54–83) likewise.
- `tokens.test.ts:125–127` asserts `globals.css` does **not** import it.

### 1.5 `island.css` (46 lines), imported by web (`globals.css:6`)

- `[data-theme='dark'] .pastel-island { … }` (:6–14): soft tokens become `#242b3d`, `surface` `#2f364a`.
- `--tone` per soft background (:15–18) and a 5px `border-top` stripe (:19–22); deck-card variant through
  `li:has(> .pastel-island…:first-child)` (:25–34); title icon colour (:35–37); `@media (width >= 48rem) .md\:pastel-island` left stripe (:39–46).
- It implements "option B" (neutral dark card + coloured stripe, header comment :1–5); see Surprises S9 for the README drift.

### 1.6 README rules (`packages/design-tokens/README.md`, 102 lines)

- Usage: `@import 'tailwindcss'; @import '@wordmet/design-tokens/theme.css';` (:7–10); each app adds its own type/density/container
  tokens after the import (:12).
- "Colours are declared **only** here; `apps/web/src/styles/tokens.test.ts` checks contrast (LP12) and that the app declares none of its
  own (UBC1)" (:12–13).
- Font section: Lexend via `next/font/google` `variable: '--font-lexend'` (:15–19).
- Colour table (:21–54), dark theme (:56–63), pastel variant (:65–71), islands (:73–77), LP12 pairs (:79–87), motion table (:89–102).

---

## 2. `apps/web/src/app/globals.css` (447 lines)

- Imports (:1–6): `tailwindcss`, `@wordmet/design-tokens/theme.css`, `…/dark.css`, `…/island.css`. No `@source`, no `@plugin`.
- One `@theme` block (:8–301) with:
  - Type scale `--text-*` with `--line-height`/`--letter-spacing` sub-tokens (:10–41): `display`, `landing-h1`, `cta`, `h2` (clamp), `title-lg`,
    `h3`, `title`, `lead`, `subtitle`, `body-lg`, `body`, `label`, `small`, `caption`; `ui` (:59–60).
  - Containers `--container-*` (:44–52): `content`, `cta`, `faq`, `heading`, `prose`, `practice`, `copy`, `aside`, `landing-hero`.
  - `--spacing-header 4.5rem` (:55), `--spacing-control 2.5rem` (:61), `--spacing-control-touch 2.75rem` (:62).
  - Shadows (:63–73): `--shadow-sheet`, `-button`, `-button-secondary`, `-button-danger`, `-dialog`, `-menu`, `-toast`, `-soft-card`
    (`color-mix` on `primary-deep`).
  - Durations: `--motion-overlay 200ms` (:74), `--transition-duration-faq 280ms` (:153), `--transition-duration-flip 280ms` (:165).
  - **`--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)` at :155** (used by `ease-out-strong` in `components/landing/exercises/ExerciseGallery.tsx:203,242`,
    `components/landing/Faq.tsx:23,25`, `components/landing/showcase/AppShowcase.tsx:88`, and `.faq-item` at :371–372).
  - `--animate-*` tokens: `overlay-in` :75, `overlay-out` :76, `dialog-in` :77, `dialog-out` :78, `sheet-in` :79, `sheet-out` :80, `menu-in` :81,
    `menu-in-up` :82, `menu-out` :83, `toast-in` :84, `theme-icon-in` :86, `theme-icon-out` :87, `card-in` :158, `wiggle` :159, `pop` :160,
    `slide-out-left` :167, `slide-out-right` :168, `slide-in-right` :169, `slide-in-left` :170, `card-rise` :200, `feedback-in` :201,
    `wiggle-soft` :202, `pop-in` :203, `summary-in` :205, `streak-flame` :207, `hero-in` :221, `hero-window-in` :222.
  - Keyframes inside `@theme`: `fade-in` :89–93, `fade-out` :94–98, `dialog-in` :99–104, `dialog-out` :105–110, `theme-icon-in` :111–116,
    `theme-icon-out` :117–122, `sheet-in` :123–127 (`translateY(100%)`), `sheet-out` :128–132, `menu-in` :133–138, `menu-in-up` :139–144,
    `toast-in` :145–150, `slide-out-left` :172–177, `slide-out-right` :179–184, `slide-in-right` :186–191, `slide-in-left` :193–198,
    `streak-flame` :209–219, `summary-in` :224–229, `hero-in` :231–236, `hero-window-in` :238–243, `card-rise` :245–250, `feedback-in` :252–257,
    `wiggle-soft` :259–269, `pop-in` :271–275, `card-in` :277–282, `wiggle` :284–294, `pop` :296–300.
- Outside `@theme`: `@custom-variant placement-top` (:304); view transitions for toasts (`:root { view-transition-name: none }` :309–311,
  `::view-transition*` :313–324, `@keyframes toast-out` :326–331; comment :306–308 says any later view transition must name its own parts).
- `@utility`: `pressed` (`translate: 0 0.18rem`, :334–336), `highlighter` (:339–341), `pb-safe` (:344–346), `tilt-card` (:349–351),
  `no-scrollbar` (:353–358).
- `.faq-item` disclosure animation under `@supports` (:361–386) with its own reduced-motion `@media` (:381–385).
- `@layer base` (:389–447): `scroll-behavior: smooth` (:390–392), `scroll-padding-top` from md (:396–400), `body` background `surface`,
  colour `ink`, `font-family: var(--font-sans)` (:402–409), focus ring `3px solid var(--color-primary)` (:415–418) and its overrides on
  `.bg-primary`/`.bg-accent` (:421–432).
- **Reduced-motion rule (:434–446)**: `@media (prefers-reduced-motion: reduce)` sets `html { scroll-behavior: auto }` and
  `*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }`.
- UBC1 holds today: no `--color-…:` declaration in the file (uses only `var(--color-…)` and `color-mix`).

---

## 3. Token tests

### 3.1 `apps/web/src/styles/tokens.test.ts` (162 lines, Vitest `node` env by default)

How files are read: `createRequire(import.meta.url).resolve('@wordmet/design-tokens/<file>.css')` + `readFileSync` for `theme.css` (:6–7),
`dark.css` (:9), `dark-pastel.css` (:122), `island.css` (:140); `globals.css` by `new URL('../app/globals.css', import.meta.url)` (:10).
`tokens(css, prefix)` (:12–16) collects `--<prefix>-<name>: <value>;` by regex. `hexOf` (:43–47) follows one `var(--color-x)` alias;
`luminance` (:36–40) parses only `#rrggbb` (an `rgb()` or 3-digit value would break it).

| Test | Lines | Asserts |
|---|---|---|
| LP12 | :58–77 | Text ≥ 4.5 for 20 pairs (`ink`/`surface`, `canvas`, `accent`, `accent-soft`, `wrong-chip`; `muted`/…; `primary`/…; `success`, `danger`, `warning`, `placeholder`); controls ≥ 3 for 8 pairs incl. `danger`/`accent` (:70). Light values of `theme.css` only. |
| D3 | :79–82 | Every `--color-*` key of `theme.css` has one in `dark.css` and vice versa. |
| App pairs light + dark | :84–90 | `APP_TEXT` (:23–28, 19 pairs incl. `on-navy`/`navy`, `ink`/`highlight`, `ink`/`session-card`) ≥ 4.5 and `APP_CONTROLS` (:29–31) ≥ 3, in both maps. |
| LP31 | :92–112 | Every `--text-*`/`--container-*` of `globals.css` and `--radius-*`/`--shadow-*` of **`theme.css`** has no `\dpx` (:98); the `display`, `cta`, `h2` clamps hit 36/60, 28/44, 28/40 px at 390/1440 (:107–111). |
| UBC1 | :114–117 | `globals.css` has no `--color-[a-z0-9-]+\s*:` declaration. |
| Pastel | :121–136 | not imported (:125–127); text on its pastels ≥ 4.5 (:129–135). |
| Islands | :139–162 | `globals.css` contains `@import '@wordmet/design-tokens/island.css'` (:142–144); text on island surfaces ≥ 4.5 dark (:146–152); `on-navy`/`navy-card`, `on-hero`/`hero` pairs ≥ 4.5 both themes (:154–161). |

### 3.2 `apps/web/src/styles/text-classes.test.ts` (39 lines)

- Builds `allowed` from `--color-*` names of `theme.css` and `globals.css`, `--text-*` names of `globals.css` (sub-tokens stripped by the
  regex at :14) plus a built-in list (`left`…`9xl`, :15–18); `allowed` at :19.
- Walks `src/` for `*.tsx` that are not `*.test.tsx` (:21–27; includes `.app.tsx`, excludes `.ts`) and flags any `text-<x>` class (regex :33)
  whose `<x>` is not allowed. **A `text-wm-…` class fails this test unless the test also reads `web.css`.**

### 3.3 `apps/admin/src/styles/tokens.test.ts` (67 lines, `// @vitest-environment node` :1)

- Reads `theme.css` via `createRequire` (:8–9) and admin `globals.css` (:10); colours = `--color-x: #rrggbb` only (:13).
- UBC1 (:33–37): no `--color-…:` declaration **and** no raw `#hex`, `rgb(`, `hsl(` in admin `globals.css`.
- UBC2 text pairs ≥ 4.5 (:39–48), controls ≥ 3 (:50–56); `PANEL_SPLIT_QUERY` equals `--breakpoint-panel` (:58–61); `danger-deep` and
  `canvas-deep` exact values (:63–66). Unaffected by new package files as long as `theme.css` is untouched.

---

## 4. `apps/web/scripts/check-tailwind-raw.mjs` (47 lines)

- Rule W7 / LP13 (:1–2): in `src/**/*.tsx`, no Tailwind arbitrary value and no inline `style`.
- `ARBITRARY = /(?<![\w-])[\w:.-]*-\[[^\]\s]+\][\w:/.-]*/g` (:7): any `-[…]` without whitespace inside, including variants like
  `data-[state=open]:x` (test `check-tailwind-raw.test.ts:17–20`). Tailwind v4's `bg-(--var)` parenthesis form is **not** matched.
- `INLINE_STYLE = /\bstyle=\{/g` (:8).
- Escape: a match is skipped only when **the line directly above** matches `/\/\/\s*raw-ok:/` (:15). A JSX comment `{/* raw-ok: … */}`
  does not match. 14 uses today, e.g. `src/app-ui/Toast.tsx:48`, `src/features/learner/groups/GroupCard.tsx:38`.
- Checked files (:22–27): `*.tsx` but not `*.test.tsx` and not `opengraph-image|twitter-image|icon|apple-icon.tsx`.
- Run by `pnpm lint` (`apps/web/package.json:11`: `eslint . && node scripts/check-tailwind-raw.mjs`); exits 1 listing `file:line match` (:43–46).
- Consequence for M1: a CSS dot-grid (`DotGridBackground`) or a group colour by index cannot use `bg-[radial-gradient(...)]` or `style=`
  without `// raw-ok:`; it needs a `@utility` or token classes.

---

## 5. `apps/web/eslint.config.mjs` (9 lines)

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**', '.open-next/**', '.wrangler/**', '.docker-out/**', 'cloudflare-env.d.ts']),
]);
```

- ESLint `9.39.5` (`apps/web/package.json:53`), `eslint-config-next` `16.4.3` (:54). The Next configs have 4 + 5 entries; the only
  import-related rule they set is `import/no-anonymous-default-export` (checked by loading both configs). **No `no-restricted-imports`
  anywhere** in web or admin (`apps/admin/eslint.config.*` uses `typescript-eslint`, no import rule).
- Per-folder override in this flat config: append objects after `...nextTs`, e.g.
  `{ files: ['src/ui/**/*.{ts,tsx}'], ignores: [...], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['@/features/*', …], message: '…' }] }] } }`.
  In flat config a later object that sets the same rule for the same file **replaces** its options (no merge), so keep the folder globs
  disjoint. Patterns match the import string as written: relative escapes (`../features/...`) are not caught by `@/features/*`.
  Today the only relative imports leaving a top folder are message JSON in tests (`src/app-ui/test-utils.tsx:5–6`,
  `src/components/landing/test-utils.tsx:4`, `copy.ts:2`, `copy.test.ts:1–2`).
- **No test runs ESLint programmatically** (grep for `from 'eslint'`, `new ESLint`, `loadESLint` over `apps/`, `packages/`, `scripts/`:
  none). Probe run from `apps/web` (10/11/2026): `new ESLint({ cwd }).lintText(code, { filePath: 'src/ui/Probe.tsx' })` works on a
  file that does not exist, took **3.2 s cold**, returned no messages for an `@/features/...` import (control: `calculateConfigForFile`
  reports `no-restricted-imports` not configured). Vitest's default test timeout is 5 s, so a lint test needs its own timeout.
  A fixture written to disk under `src/` would make `eslint .` (CI `pnpm lint`) fail; `lintText` with a virtual path avoids that.
- Cross-folder imports today that the §6 deny-list would hit (non-test unless noted):
  - `src/app-ui/PronunciationLine.tsx:3` → `@/features/learner/word/pronunciation` (the reason for `lib/speech/`).
  - `src/app-ui/TurnstileWidget.tsx:5` → `@/app-shell/config`.
  - `src/app-ui/test-utils.tsx:7–10` → `@/app-shell/session/*`, `@/app-shell/theme/ThemeProvider` (test helper; 41 test files import it).
  - `src/components/landing/LandingHeader.tsx:1–2` → `@/app-chrome/Logo`, `@/app-chrome/ThemeToggle`; `src/components/layout/SiteFooter.tsx:1`
    → `@/app-chrome/Logo` (the future `site/` → `app-chrome/` ban, M8).
  - `src/app-chrome/AppShell.tsx:7`, `TopBar.tsx:7` → `@/features/learner/add-word/add-word-context`; `SearchStrip.tsx:8` →
    `@/features/learner/lookup/lookup-api` (allowed by §6 for `app-chrome/`).
  - `src/app-shell/*` → `@/app-ui/*`: `AppProviders.tsx:8–9` (StreakToast, Toast), `RequireSession.tsx:6` (States),
    `use-turnstile.tsx:4` (TurnstileWidget). `app-shell` is not in the §6 table, so `app-shell` → `ui/` is allowed and `ui/` → `app-shell` is not.

---

## 6. Fonts

- `src/app/[locale]/layout.tsx` (48 lines): `import { Lexend } from 'next/font/google'` (:5); `const lexend = Lexend({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-lexend' })`
  (:12–16); `<html lang={locale} className={lexend.variable} suppressHydrationWarning>` (:41); `<body className="min-h-dvh font-sans">` (:42);
  `NextIntlClientProvider messages={null}` (:44). `viewport.themeColor` is hard-coded `#121833` (dark) / `#1b2444` (:32), commented as the
  `navy`/`navy-card` tokens.
- `--font-lexend` feeds `--font-sans` in `theme.css:6`. `font-sans` is the only font utility used in `src` (grep `font-(display|mono|sans|serif)`:
  only `layout.tsx:42`); the landing H1 (`components/landing/Hero.tsx:21`, `text-landing-h1 font-extrabold`) inherits it.
- Next 16.4.3 `font-data.json` (read 10/11/2026): `Noto Sans` subsets incl. `vietnamese`, axes `wdth` 62.5–100 and `wght` 100–900;
  `Bricolage Grotesque` subsets `latin`, `latin-ext`, `vietnamese`, axes `opsz` 12–96, `wdth` 75–100, `wght` 200–800; `JetBrains Mono`
  incl. `vietnamese`, axis `wght` 100–800. Matches design §5.8.
- CSP: `font-src 'self'` in both policies (`src/lib/csp.ts:27`, `:64`), which fits self-hosted `next/font`.
- `apps/web/scripts/gen-og-fonts.mjs` (16 lines): reads `../assets/fonts/Lexend-Regular.ttf` and `Lexend-ExtraBold.ttf` as base64 (:3–6)
  and writes `src/app/[locale]/og-fonts.generated.ts` with `export const lexendRegular` / `lexendExtraBold` (:8–16). Script `gen:og-fonts`
  (`package.json:18`). The generated file is **274,560 bytes**.
- `src/app/[locale]/og-fonts.test.ts` (11 lines): imports `lexendExtraBold, lexendRegular` (:1) and asserts each decodes to a TrueType
  header `00 01 00 00` (:5–9).
- `src/app/[locale]/opengraph-image.tsx` (55 lines): imports the two embeds (:5); `fontFamily: 'Lexend'` (:34); `fonts: [{ name: 'Lexend', data: regular, weight: 400 }, { name: 'Lexend', data: extraBold, weight: 800 }]`
  (:49–52); hex colours inline (:34–44, allowed: image routes are skipped by `check-tailwind-raw.mjs:23`).
- `apps/web/assets/fonts/`: `Lexend-ExtraBold.ttf` 105,516 B, `Lexend-Regular.ttf` 100,264 B, `OFL.txt` 4,529 B, `README.md` 616 B
  (README :3–8: source repo, licence, "after changing a file, run `pnpm gen:og-fonts`").
- `apps/web/e2e/chrome.spec.ts:4–15`: test "Review#1 H1 renders in Lexend with Vietnamese glyphs" on `/vi`; takes the first family of
  `getComputedStyle(h1).fontFamily` (:10) and asserts `toMatch(/Lexend/)` (:13) and `document.fonts.check(...)` true (:14).
  Other Lexend references: only the files above (grep over `src`, `e2e`, `scripts`, `e2e-shots`, `e2e-audit`).

---

## 7. Theme (`src/app-shell/theme/`)

| File | Exports | Notes |
|---|---|---|
| `theme.ts` (27 lines) | `ThemeChoice` (:2), `ResolvedTheme` (:3), `THEME_STORAGE_KEY = 'wordmet-web.theme'` (:5), `readThemeChoice` (:8), `writeThemeChoice` (:17), `resolveTheme` (:25) | storage guarded (E21) |
| `theme-script.ts` (6 lines) | `THEME_SCRIPT` (:3–4), `THEME_SCRIPT_HASH = "'sha256-4qCbwRV0mTFT1agN4flhun8CI1pHQO8k/Bd4U69TcB0='"` (:6) | the script sets `document.documentElement.dataset.theme` to `'dark'` or `'light'` from storage, else `prefers-color-scheme` |
| `ThemeProvider.tsx` (69 lines) | `ThemeProvider` (:39), `useTheme` (:65, throws outside the provider :67) | `useSyncExternalStore` over storage + `matchMedia` (:15–35); effect writes `dataset.theme` (:44–46); **unmount deletes `data-theme`** (:49–54) |
| tests | `theme.test.ts`, `theme-script.test.ts` (hash recomputed :18–20), `ThemeProvider.test.tsx` | |

- Values: `data-theme` is `light` or `dark` on `<html>`; dark tokens apply via `[data-theme='dark']` (`dark.css:5`).
- `THEME_SCRIPT_HASH` use: `next.config.ts:6` import, `scriptHashes: [THEME_SCRIPT_HASH]` in the static policy (:22); `src/lib/app-csp.ts:2`
  import, `themeHash: THEME_SCRIPT_HASH` in the per-request `/app` policy (:36). Editing `THEME_SCRIPT` means updating the hash
  (the test catches it).
- `(site)/layout.tsx` (35 lines): renders `<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />` (:23) and wraps the landing in
  `<ThemeProvider>` (:24–32). So **the landing is themed too**.
- `/app`: `app/layout.app.tsx:17` renders the same script; `ThemeProvider` is inside `AppProviders` (`src/app-shell/AppProviders.tsx:48`).
- `ThemeToggle` (`src/app-chrome/ThemeToggle.tsx`): `ThemeToggle()` (:12) reads `App.chrome.themeToLight/themeToDark`;
  `ThemeToggleButton({ toLight, toDark })` (:18) uses `useTheme` (:19), flips choice (:31–35), icon swap uses `animate-theme-icon-in/out`
  (:39–40). Used by `TopBar.tsx:73` and the landing `components/landing/LandingHeader.tsx:2`. Test `theme-toggle-button.test.tsx`.

---

## 8. Learner app routing

### 8.1 Every file under `src/app/[locale]/app/`

| File | Renders | Wrapped in `<Suspense>` |
|---|---|---|
| `layout.app.tsx` | layout (below) | |
| `(auth)/layout.app.tsx` | `<AuthGate>{children}</AuthGate>` (:5–7) | |
| `(auth)/login/page.app.tsx` | `LoginForm` (`features/learner/auth/LoginForm`) | yes |
| `(auth)/register/page.app.tsx` | `RegisterForm` | yes |
| `(auth)/verify-email/page.app.tsx` | `VerifyEmailForm` | yes |
| `(auth)/forgot-password/page.app.tsx` | `ForgotPasswordForm` | yes |
| `(auth)/reset-password/page.app.tsx` | `ResetPasswordForm` | yes |
| `(auth)/google/complete/page.app.tsx` | `GoogleComplete` | no |
| `(auth)/account-deleted/page.app.tsx` | `AccountDeleted` | yes |
| `(member)/layout.app.tsx` | layout (below) | |
| `(member)/page.app.tsx` | `TodayPage` (`features/learner/today`) | no |
| `(member)/groups/page.app.tsx` | `GroupListPage` | no |
| `(member)/group/page.app.tsx` | `GroupPage` | yes |
| `(member)/group/backlog/page.app.tsx` | `BacklogPage` | yes |
| `(member)/topic/page.app.tsx` | `TopicPickerPage` | yes |
| `(member)/lookup/page.app.tsx` | `LookupPage` | yes |
| `(member)/word/page.app.tsx` | `WordPage` | yes |
| `(member)/practice/page.app.tsx` | `PracticePage` | no |
| `(member)/practice/weak/page.app.tsx` | `WeakWordsPage` | no |
| `(member)/practice/history/page.app.tsx` | `HistoryPage` | yes |
| `(member)/practice/session/page.app.tsx` | `PracticeSession` | no |
| `(member)/review/page.app.tsx` | `ReviewSession` | yes |
| `(member)/recall/page.app.tsx` | `RecallSession` | yes |
| `(member)/settings/page.app.tsx` | `SettingsPage` | no |
| `(member)/settings/account/page.app.tsx` | `AccountPage` | no |
| `(member)/settings/delete-account/page.app.tsx` | `DeleteAccountPage` | yes |
| `(member)/settings/transactions/page.app.tsx` | `TransactionsPage` (`features/learner/transactions`) | no |
| `(member)/plans/page.app.tsx` | `PlansPage` | no |
| `(member)/plans/order/page.app.tsx` | `OrderReturnPage` | yes |
| `(member)/complete-profile/page.app.tsx` | `<AppShell variant="bare"><Suspense><CompleteProfile/></Suspense></AppShell>` (:8–12) | yes |
| `(member)/welcome/page.app.tsx` | `<AppShell variant="bare"><Suspense><WelcomeLanguage/></Suspense></AppShell>` (:8–12) | yes |

No `loading.*`, `error.*`, `template.*`, `default.*` or `global-error.*` exists anywhere under `src/app/` (only `(site)/not-found.tsx` and
the catch-all `(site)/[...rest]/page.tsx` that calls `notFound()`). Only `layout.app.tsx` exports metadata (`robots: noindex`, :9).

### 8.2 Layout contents

- `app/layout.app.tsx` (25 lines): `await connection()` (:13); `<script … THEME_SCRIPT />` (:17); `<AppIntl><AppProviders><div className="min-h-dvh bg-canvas text-ink">{children}</div></AppProviders></AppIntl>` (:18–22).
  `AppIntl` (`src/app-shell/AppIntl.tsx:4–7`) sends only `{ App: messages.App }`. `AppProviders` (`AppProviders.tsx:25–62`): one
  `QueryClient` (`retry: false`, offline band, `profile-incomplete` → `/welcome`, :29–42), `SessionProvider` (:47), `ThemeProvider` (:48),
  React Aria `RouterProvider navigate={router.push}` (:50), `OfflineBand` (:52), `ToastRegion` (:54), `StreakToast` (:55).
- `(auth)/layout.app.tsx`: `AuthGate` only.
- `(member)/layout.app.tsx` (21 lines): server component; `nonceFromPolicy((await headers()).get('content-security-policy'))` (:13);
  `<RequireSession>{children}<HouseAd /><AdsenseLoader nonce={nonce} /></RequireSession>` (:15–19).

### 8.3 How `.app.tsx` is enabled

- `src/lib/learner-app-flag.ts`: `LEARNER_APP_ENABLED = process.env.NEXT_PUBLIC_LEARNER_APP === 'on'` (:2); `learnerAppRedirect` (:7–11);
  `appPageExtensions(enabled)` returns `['app.tsx', 'tsx', 'ts', 'jsx', 'js']` when on, else the four base extensions (:14–17).
- `next.config.ts:29`: `pageExtensions: appPageExtensions(LEARNER_APP_ENABLED)`.
- Special files: Next's webpack app loader resolves `layout`, `template`, `error`, `loading`, `global-error`, `global-not-found` and the
  HTTP fallbacks with the `pageExtensions` list (`node_modules/.pnpm/next@16.4.3…/dist/build/webpack/loaders/next-app-loader/index.js:91–99`,
  `:309–312`, `:638–640`). `ASSUMPTION`: Turbopack (Next 16's default `next build`, used by `cf:build`) does the same; the existing
  `layout.app.tsx` files prove it for layouts only.

### 8.4 `src/proxy.ts` (50 lines) and the CSP nonce

- With the app off, `/{locale}/app/*` → 307 to `/{locale}` (:14–22).
- Every path but `/` goes through `withAppCsp(request, handleI18nRouting)` (:33). `src/lib/app-csp.ts:27–43`: only in production builds and
  only for `/vi/app`, `/en/app` (`isAppPath` :6), it makes `nonce = btoa(crypto.randomUUID())`, builds the policy (`buildAppCsp`, includes
  `themeHash` :36) and sets `Content-Security-Policy` on the **request** headers (Next stamps the nonce on its scripts) and the response (:38–41).
- `(member)/layout.app.tsx:13` reads the nonce back from the request header for `AdsenseLoader`. Any new layout that adds a script needs the
  same `headers()` read. `next.config.ts:38` keeps the static policy off `/vi/app` and `/en/app`.

---

## 9. Chrome (`src/app-chrome/`)

### 9.1 Files, exports, props

| File | Exports and props | Depends on |
|---|---|---|
| `AppShell.tsx` (177) | `BackLink = { href; label }` (:17); `AppShell({ variant, children, aside?, back?, features = { addWord: true }, fab = false })` (:19–34); `SubpageBack({ back, tone? })` (:94); `StudyPattern()` (:150); private `PhoneHeader` (:76), `Fab` (:110), `AuthFrame` (:131) | `@/features/learner/add-word/add-word-context` (:7), `@/lib/cn`, sibling chrome |
| `TopBar.tsx` (79) | `ChromeFeatures = { addWord: boolean }` (:15); `TopBar({ features, onAddWord? })` (:18) | `currentTab(usePathname())` (:21), `useAddWord()` (:22), `PlanChip`, `ThemeToggle` (:73), `AvatarMenu` (:74) |
| `MobileTabBar.tsx` (38) | `MobileTabBar()` (:10); `fixed inset-x-0 bottom-0 z-40 … md:hidden` (:18) | `currentTab`, `TABS` |
| `SearchStrip.tsx` (105) | `SearchStrip()` (:30) | `@/app-ui/Select` (:7), **`@/features/learner/lookup/lookup-api`** `LEVELS, lookupHref, parseLookup` (:8), `useSearchParams` |
| `AvatarMenu.tsx` (65) | `displayName(me, locale)` (:11); `AvatarMenu()` (:20) | `@/app-shell/session/session-context` (:6), RAC `Button, Menu, MenuItem, MenuTrigger, Popover` (:5), `PlanChip`; no `features/` |
| `PlanChip.tsx` (22) | `PlanChip({ tone = 'navy' \| 'light' })` (:8) | `useEntitlements` from `@/app-shell/queries` (:4); no `features/` |
| `AppFooter.tsx` (73) | `AppFooter()` (:15) | `@/lib/site`, `Logo` |
| `Logo.tsx` (19) | `Logo({ tone = 'navy' \| 'surface' })` (:5) | `useTranslations('App.chrome')`; also used by landing and Plans pages |
| `PageTitle.tsx` (17) | `PageTitle({ children, aside?, meta? })` (:7), `<h1 className="highlighter …">` (:11) | 11 importers |
| `ThemeToggle.tsx` (44) | §7 | |
| `nav.ts` (17) | `TabId` (:3); `TABS` (:6–11: today `/app` `^/app$`; groups `/app/groups` `^/app/(groups\|group\|topic\|review)`; practice `/app/practice`; lookup `/app/(lookup\|word)`); `currentTab(pathname)` strips `/vi\|/en` and returns the matching id or `null` (:14–17) | used by `TopBar`, `MobileTabBar` |
| tests | `chrome.test.tsx` (TopBar, PlanChip, AvatarMenu, AppFooter, MobileTabBar; mocks `next/link` and `next/navigation` :13–22), `theme-toggle-button.test.tsx` | |

### 9.2 `AppShell` variants (`AppShell.tsx:34–73`)

- `full` (:36): renders children only. **No call site uses it.**
- `bare` (:37): `AuthFrame` — `<main id="main">` on `bg-canvas`, `StudyPattern`, logo link to `/{locale}`, card `max-w-md` (:131–144).
- `main` / `sub` (:39–72): `<AddWordProvider>` (:40) → skip link `#main` (:42–44) → `<header>`: `TopBar` from md (:46–48), `PhoneHeader`
  with `SubpageBack` only when `variant === 'sub'` (:49), `<Suspense><SearchStrip/></Suspense>` (:51–53) → `<main id="main" tabIndex={-1} className="mx-auto w-full max-w-360 flex-1 px-4 pb-24 pt-5 … md:pb-10 lg:px-8">`
  (:55) with optional `aside` as an `xl:flex-row` second column `xl:w-90` (:56–60) → `AppFooter` from md (:65–67) → `Fab` when
  `fab && features.addWord` (:68, phone only, `fixed bottom-20 right-4`, :118) → `MobileTabBar` (:69).
- The `features` prop is never passed by a caller (only `AppShell.tsx:47` forwards it); `ChromeFeatures.addWord = false` exists only for
  `chrome.test.tsx:48–51`.

### 9.3 Every `<AppShell` call site (17, non-test; no test renders `AppShell` directly)

| # | File:line | Variant | Props |
|---|---|---|---|
| 1 | `src/app/[locale]/app/(member)/complete-profile/page.app.tsx:8` | bare | |
| 2 | `src/app/[locale]/app/(member)/welcome/page.app.tsx:8` | bare | |
| 3 | `src/features/learner/auth/AuthGate.tsx:35` | bare | |
| 4 | `src/features/learner/groups/BacklogPage.tsx:44` | sub | `back` (:41, dynamic label `backlog.back`) |
| 5 | `src/features/learner/groups/GroupListPage.tsx:44` | main | `fab` |
| 6 | `src/features/learner/groups/GroupPage.tsx:60` | sub | `back` → `/app/groups`, `fab` |
| 7 | `src/features/learner/groups/TopicPickerPage.tsx:44` | sub | `back` → `/app/groups` |
| 8 | `src/features/learner/lookup/LookupPage.tsx:39` | main | `fab`, `aside={preview ? <WordPreview/> : undefined}` |
| 9 | `src/features/learner/practice/HistoryPage.tsx:40` | sub | `back` (:33 → `/app/practice`) |
| 10 | `src/features/learner/practice/PracticePage.tsx:183` | main | |
| 11 | `src/features/learner/practice/WeakWordsPage.tsx:55` | sub | `back` (:49), `aside` (navy card, :58–) |
| 12 | `src/features/learner/settings/AccountPage.tsx:28` | sub | `back` → `/app/settings`, `aside={<AccountAside/>}` |
| 13 | `src/features/learner/settings/DeleteAccountPage.tsx:56` | sub | `back` → `/app/settings` |
| 14 | `src/features/learner/settings/SettingsPage.tsx:80` | sub | `back` → `/app` |
| 15 | `src/features/learner/today/TodayPage.tsx:39` | main | `fab`, `aside` (`QuickAddBox`, `TodayAside`, :42–47) |
| 16 | `src/features/learner/transactions/TransactionsPage.tsx:65` | sub | `back` (:25 → `/app/settings`), `aside={<TransactionsAside/>}` |
| 17 | `src/features/learner/word/WordPage.tsx:34` | sub | `back` → `/app/lookup`, `aside` when data (:37) |

Other `AppShell.tsx` importer: `features/learner/review/ReviewSession.tsx:8` imports `StudyPattern` (used :120).

Member pages that draw their own frame (no `AppShell`): `PlansPage.tsx` (own `<header>` :165, `<main id="main">` :177, `Logo` :8),
`OrderReturnPage.tsx` (`<header>` :147, `<main id="main">` :152), `PracticeSession.tsx` (`<header>` :162, `<main id="main">` :183),
`ReviewSession.tsx` (`<header>` :121, `<main id="main">` :152), `RecallSession.tsx` (`<main id="main">` :16).

### 9.4 `AddWordProvider` and `useAddWord`

- Defined in `src/features/learner/add-word/add-word-context.tsx`: `AddWordProvider` (:11–43) holds the sheet state, renders
  `<AddWordSheet>` (:39) and registers a **global `keydown` handler for `N`** (:23–33; skips inputs, textareas, selects, contenteditable,
  `[role="dialog"]`); `useAddWord = () => useContext(AddWordContext)` (:45) — the default context is a **no-op** `open: () => {}` (:7), so a
  consumer outside the provider silently does nothing; `useAddWordScope(groupId)` (:47–54).
- Provided today only by `AppShell` main/sub (`AppShell.tsx:40`). Consumers: `AppShell.tsx:112` (Fab), `TopBar.tsx:22`,
  `features/learner/groups/GroupCard.tsx:59`, `GroupPage.tsx:80–81` (scope + open), `LookupPage.tsx:111,153,163`,
  `today/QuickAddBox.tsx:10`, `word/WordPage.tsx:158`; test `add-word/locked-add-word.test.tsx` wraps its own provider (:209–243).
- Session screens (`practice/session`, `review`, `recall`) are **not** inside a provider today, so `N` does nothing there.
- Other chrome shortcut: `/` focuses the search box (`SearchStrip.tsx:50–60`).

---

## 10. Session gating

- `src/app-shell/RequireSession.tsx` (82 lines), client component: state from `useSession()` (:31). States handled:
  `loading` → spinner; `unavailable` → `<OfflineScreen onRetry={() => void store?.bootstrap()} />` (**:54**); not `signed-in` or a redirect
  pending → `<FullScreenSpinner />` (**:55**); otherwise `children` (:56). `redirectFor` (:59–82): signed-out → `/app/login?next=…&reason=…`
  (:65–69); `change-password` → forgot-password (:70); unverified → verify-email (:72); locale prefix fix (:73–74); missing birth date /
  consent / `terms_outdated` → `/app/complete-profile?next=` unless already there (:75–77); no `native_language` → `/app/welcome?next=`
  unless on welcome/complete-profile (:78–80; regexes :16, :18). Redirects use `hardReplace` (:38–40). Time zone sync once (:43–52).
- `FullScreenSpinner` (`src/app-ui/States.tsx:10–18`): `role="status"`, `min-h-dvh`, `LoaderCircle motion-safe:animate-spin`, text
  `App.common.loading`. `RequireSession.test.tsx:57–63` asserts `getByRole('status')` has text `Đang tải…`.
- `src/features/learner/auth/AuthGate.tsx` (36 lines): `OPEN_WHEN_SIGNED_IN = /\/app\/(forgot|reset)-password\/?$/` (:13, B8-2);
  effect (:27–33) redirects only when the **first** answer was `signed-in` (:30) and **the B8-2 exception** is line **:31**
  (`if (OPEN_WHEN_SIGNED_IN.test(pathname)) return;`); then `hardReplace(safeNext(?next))` (:32). Renders `<AppShell variant="bare">` (:35).
  Tests: `AuthGate.test.tsx`, `auth.test.tsx`.
- `(member)/layout.app.tsx`: `HouseAd` (`features/learner/house-ad/HouseAd.tsx:22`, uses `usePathname` :29) and `AdsenseLoader`
  (`features/learner/ads/AdsenseLoader.tsx:20`, `usePathname` :21, `hardReplace(window.location.href)` :32 when ads are allowed/shown:
  the DB38 full reload) sit **inside** `RequireSession`, after `children` (:15–19).

---

## 11. `src/app-ui/*` and `src/components/ui/*`

Importer counts from the resolver script (all `.ts`/`.tsx` under `src`, `@/` and relative paths, the file itself excluded).

| File | Exports (props, short) | react-aria-components | Importers (tests) | Examples |
|---|---|---|---|---|
| `app-ui/Button.tsx` | `ButtonVariant = 'sticker'\|'primary'\|'quiet'\|'ink'\|'danger'\|'ghost'` (:9); `Button({ variant='primary', size='md'\|'lg', className, isPending, onPress, type, …AriaButtonProps })` (:20–31) | `Button`, `ButtonProps` | 51 (0) | `app-ui/States.tsx`, `features/learner/add-word/AddSentenceSheet.tsx` |
| `app-ui/Checkbox.tsx` | `Checkbox({ isSelected, onChange, children, isDisabled?, isInvalid? })` (:13–24) | `Checkbox` | 9 (1) | `auth/CompleteProfile.tsx`, `lookup/LookupFilters.tsx` |
| `app-ui/DateOfBirthField.tsx` | `DateOfBirthField({ label, initial?, description?, onChange, serverError?, today? })` (:8–25) | none (uses `TextField`) | 5 (1) | `auth/RegisterForm.tsx`, `settings/AccountPage.tsx` |
| `app-ui/Dialog.tsx` | `Dialog({ isOpen, onOpenChange, title, titleAside?, closeLabel?, wide?, children?, footer?, isDismissable=true })` (:8–29) | `Button, Dialog, Heading, Modal, ModalOverlay` | 17 (1) | `add-word/AddWordSheet.tsx`, `add-word/AddSentenceSheet.tsx` |
| `app-ui/Flag.tsx` | `Flag({ code: 'vi'\|'en' })` (:3), inline SVG with hex fills | none | 1 (0) | `auth/WelcomeLanguage.tsx` |
| `app-ui/Locked.tsx` | `ProBadge()` (:8), `LockedFeature()` (:19) | none | 3 (0) | `app-ui/Switch.tsx`, `practice/CustomizeDialog.tsx` |
| `app-ui/PronunciationLine.tsx` | `PronunciationLine({ text, line, align?, className? })` (:11) | none | 4 (0) | `review/Flashcard.tsx`, `word/SenseBlock.tsx` |
| `app-ui/Segmented.tsx` | `Segmented<T>({ label, value, options, onChange, isDisabled? })` (:5–14) | `Label, Radio, RadioGroup` | 2 (0) | `plans/PlansPage.tsx`, `settings/SettingsPage.tsx` |
| `app-ui/Select.tsx` | `SelectItem` (:7); `Select({ label, hideLabel?, items, value, onChange, isDisabled?, placeholder?, error?, display?, className? })` (:9–25) | `Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Text` | 12 (0) | `app-chrome/SearchStrip.tsx`, `add-word/AddWordSheet.tsx` |
| `app-ui/SpeakButtons.tsx` | `SpeakWord({ text })` (:37), `SpeakSentence({ text, private? })` (:48), `Pronounce({ text, voice: 'uk'\|'us', audioUrl, className? })` (:65) | none | 9 (2) | `practice/session/AnswerFeedback.tsx`, `review/Flashcard.tsx` |
| `app-ui/States.tsx` | `FullScreenSpinner()` (:10), `OfflineScreen({ onRetry })` (:21), `EmptyState({ title, body?, action? })` (:34), `ErrorState({ message, onRetry })` (:45), `NotFoundState({ title?, back? })` (:58) | none | 22 (0) | `app-shell/RequireSession.tsx`, `add-word/AddWordSheet.tsx` |
| `app-ui/StreakToast.tsx` | `showStreak(days)` (:21), `StreakToast()` (:36) | none | 6 (3) | `app-shell/AppProviders.tsx`, `practice/session/use-practice-session.ts` |
| `app-ui/Switch.tsx` | `Switch({ label, description?, isSelected, onChange, isDisabled?, locked? })` (:7–20) | `Switch` | 4 (1) | `practice/AiTypesToggle.tsx`, `settings/SettingsPage.tsx` |
| `app-ui/TextField.tsx` | `TextField({ label, value, onChange, type?, min?, max?, name?, autoComplete?, placeholder?, description?, error?, isDisabled?, isReadOnly?, isRequired?, maxLength?, showCount?, spellCheck?, inputMode?, onBlur?, autoFocus? })` (:6–33) | `FieldError, Input, Label, Text, TextField` | 14 (1) | `app-ui/DateOfBirthField.tsx`, `add-word/AddSentenceSheet.tsx` |
| `app-ui/Toast.tsx` | `ToastTone` (:17), `ToastMessage` (:18), `toastQueue` (:21, max 3 visible), `showToast(text, tone)` (:35), `ToastRegion()` (:41); view-transition close (`// raw-ok` :48) | `Button, Text, UNSTABLE_Toast, UNSTABLE_ToastContent, UNSTABLE_ToastQueue, UNSTABLE_ToastRegion` | 28 (12) | `app-shell/AppProviders.tsx`, `add-word/AddSentenceSheet.tsx` |
| `app-ui/TurnstileWidget.tsx` | `FAKE_TURNSTILE_TOKEN` (:11), `TurnstileHandle` (:20), `TurnstileWidget({ onToken, ref? })` (:27); imports `@/app-shell/config` (:5) | none | 2 (1) | `app-shell/use-turnstile.tsx` |
| `app-ui/date-of-birth.ts` | `MIN_AGE`, `BirthDateProblem`, `parseBirthDate`, `isOldEnough`, `birthDateProblem`, `deviceToday`, `formatBirthDate` | — | 4 (3) | `app-ui/DateOfBirthField.tsx` |
| `app-ui/test-utils.tsx` | §12 | — | 41 (41) | |
| `components/ui/Button.tsx` | `ButtonVariant = 'primary'\|'secondary'\|'accent'\|'ink'\|'sticker'\|'quiet'\|'navy'` (:4), `buttonVariants` (:7), `buttonBase` (:18), `Button({ variant, fullWidth?, className?, type='button', …button })` (:27); plain `<button>` | none | 3 (1) | `components/landing/exercises/ExerciseGallery.tsx`, `components/ui/ButtonLink.tsx` |
| `components/ui/ButtonLink.tsx` | `ButtonLink({ variant, fullWidth?, className?, …Link })` (:10) | none | 6 (1) | `app/[locale]/(site)/not-found.tsx`, `components/landing/Hero.tsx` |
| `components/ui/Container.tsx` | `Container({ as='div', children, className })` (:7) | none | 14 (0) | `(site)/not-found.tsx`, `components/landing/ExercisesSection.tsx` |

Tests in `app-ui/`: `ui-kit.test.tsx` (Checkbox, DateOfBirthField, Dialog, Switch, TextField), `SpeakButtons.test.tsx`, `pronounce.test.tsx`,
`speech.test.ts`, `toast.test.tsx`, `streak-toast.test.tsx`, `TurnstileWidget.test.tsx`, `date-of-birth.test.ts`; `components/ui/ui.test.tsx`.
Outside `app-ui/`, 7 non-test `.tsx` files in `features/`, `app-chrome/`, `components/` import `react-aria-components` directly
(most used: `Button` 4, `Menu`/`MenuItem`/`MenuTrigger`/`Popover` 3 each, `Tabs` set 1 in `HistoryPage.tsx`).

### 11.1 Speech and pronunciation files (the M1 move to `lib/speech/`)

| File | Exports | Importers |
|---|---|---|
| `app-ui/speech.ts` | `useVoices()` (:58), `speak(text, voice)` (:63) | `app-ui/SpeakButtons.tsx:8`; test `app-ui/speech.test.ts:5` |
| `app-ui/audio-player.ts` | `playAudio(url)` (:7) | `app-ui/SpeakButtons.tsx:7` only |
| `features/learner/word/pronunciation.ts` | `Pronunciation` (:2), `PronLine` (:8), `NO_PRONUNCIATION` (:11), `blockPronunciation(senses)` (:21) | `app-ui/PronunciationLine.tsx:3`, `features/learner/groups/groups-api.ts:7`, `word/SenseBlock.tsx:13`, `word/word-api.ts:5`, `word/WordPage.tsx:18`; test `word/pronunciation.test.ts:1` |
| `app-ui/speech-test-support.ts` (not in the design's move list) | `makeVoice` (:1), `FakeUtterance` (:5), `installSpeech` (:12) | tests only: `app-ui/pronounce.test.tsx:5`, `SpeakButtons.test.tsx:5`, `speech.test.ts:6`, `features/learner/practice/session/practice-session.test.tsx:4`, `review/review-session.test.tsx:4`, `word/word-page.test.tsx:6` |

No `vi.mock` targets `speech`, `audio-player` or `pronunciation` (all `vi.mock` calls mock `next/navigation`, `@/app-shell/navigate`,
`./timezone-sync` or `@/app-ui/TurnstileWidget` — the last one at `features/learner/auth/auth-turnstile.test.tsx:17`, which must follow a move of
`TurnstileWidget`).

---

## 12. Tests

### 12.1 Vitest

- `apps/web/vitest.config.ts`: `@vitejs/plugin-react`; alias `@` → `./src` (:8); `globals: true` (:11); **`environment: 'node'`** (:12);
  `include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']` (:13); `setupFiles: ['./vitest.setup.ts']` (:14). DOM tests opt in per file
  with `// @vitest-environment jsdom` (e.g. `app-ui/ui-kit.test.tsx:1`).
- `apps/web/vitest.setup.ts`: `@testing-library/jest-dom/vitest` (:1); clears `sessionStorage` after each test (:4); polyfills
  `AnimationEvent` (:7–9) and `matchMedia` (`matches: false`, :12–15) under jsdom.
- `src/app-ui/test-utils.tsx` exports **`renderApp(ui, { locale='vi', me=makeMe(), routes={}, instantWaits=false })`** (:13–40) and
  **`pickDate(label, iso)`** (:43–45). `renderApp` wraps `NextIntlClientProvider locale messages={{ App: (vi|en).App }} timeZone="UTC"` →
  `QueryClientProvider` (`retry: false`) → `SessionProvider` (a `SessionStore` whose fetch answers `POST /v1/auth/refresh`, `GET /v1/me` and
  `routes`) → `ThemeProvider` (:30–38); returns the render result plus `store`, `client` and the fetch spy. It does **not** add
  `AddWordProvider`, `RouterProvider`, `ToastRegion`, or a `next/navigation` mock: each test mocks `next/navigation` itself
  (e.g. `ui-kit.test.tsx:12`, `groups/group-list.test.tsx:8–12`). Messages come from `apps/web/messages/{vi,en}.json` by relative import
  (:5–6). Landing tests use `components/landing/test-utils.tsx` (`renderLanding`, `landing`, `appCopy`; messages `{ App, Landing }`, :9–18).
- Representative component test: `src/app-ui/ui-kit.test.tsx` — queries by role and name (`getByRole('dialog', { name: 'Tạo nhóm' })`, :26),
  but also one class assertion (`bg-navy/45`, :31–36).
- Representative screen test: `src/features/learner/groups/group-list.test.tsx` — `renderApp(<GroupListPage />, { routes })`, then
  `findByText`, `getByRole('button', { name: … })`, `within(list)…`; it opens the Thêm từ sheet from a group card and expects
  `Lưu vào nhóm: test 1` (:56–57), which only works because `GroupListPage` renders `AppShell` → `AddWordProvider`.
- Screen tests that depend on chrome rendered inside the page: `groups/group-page.test.tsx:69` (the phone `Fab`, `aria-label` "Thêm từ"),
  `:60`, `:300`, `:319` (`getByRole('main')` from `AppShell`), `:307` (sheet opens); `group-list.test.tsx:56–57` (sheet). Tests per AppShell
  page: `backlog`, `group-list`, `group-page`, `topic-picker`, `lookup`, `weak-history` (History + Weak), `ai-toggle` + `practice-home`,
  `settings` (Settings + Account), `delete-account`, `today`, `transactions`, `m3-review` + `my-word` + `word-page`, `auth` + `AuthGate`.
- `src/i18n/messages.test.ts`: numeric placeholders formatted as numbers (:27–32); **LP3** identical keys and no empty values in `vi`/`en`
  (:34–41); **LP3** rich tags only `br, b, hl, terms, privacy, mail` and balanced (:43–54); no "Vui lòng"/"please"/"sorry"/`...` in `App.*` (:56–60).

### 12.2 Playwright

- `apps/web/playwright.config.ts`: `testDir: './e2e'` (:8); `retries` 1 on CI (:11); projects `desktop` 1440×900 and `mobile` 390×844
  `hasTouch` (:14–17); **`webServer.command: 'pnpm cf:build && node scripts/e2e-cf.mjs && pnpm cf:dev'`** (:19) on port 3100 (:4),
  `reuseExistingServer: !CI` (:21), env `NEXT_PUBLIC_LEARNER_APP=on`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`, audio base,
  Turnstile test key (:23–31). The API is mocked inside the specs (`e2e/support/mock-api.ts`).
- Specs: `e2e/a11y.spec.ts`, `chrome.spec.ts`, `csp.spec.ts`, `landing.spec.ts`, `locale.spec.ts`, `privacy.spec.ts`, `seo.spec.ts`,
  `visual.spec.ts` (screenshots only, no assertions), and `e2e/app/{b8-set-password, cai-thien-a-group, cai-thien-a-practice,
  cai-thien-a-speak, m1, m2, m3, m4, m4b, m5a, m5b, overflow}.spec.ts`. Support: `e2e/copy.ts`, `e2e/support/{axe,fixtures,mock-api}.ts`.
  Separate: `e2e-audit/audit.spec.ts` + `playwright.audit.config.ts`.
- `e2e/support/axe.ts` exports `seriousViolations(page)` (:13–29): waits until no finite animation runs and every dialog is fully opaque
  (:14–24), runs `AxeBuilder`, returns only `serious`/`critical` violations as `id: targets` (:25–28). Used in every `e2e/app/*` spec except
  `b8-set-password` and `overflow`, and in `landing.spec.ts` (7 calls).
- `apps/web/playwright.shots.config.ts`: `testDir: './e2e-shots'`, 1 worker, 30 min timeout, `baseURL` `SHOTS_BASE_URL` or `http://localhost:3001`
  (`pnpm dev:app`), not in CI (:3–11). `e2e-shots/shots.spec.ts` (378 lines): needs `SHOTS_EMAIL`/`SHOTS_PASSWORD` of a real learner
  (:9–11); widths **390, 1024, 1440** (:6); `SHOTS_MILESTONE` (default `m1`, :5) selects sets **named after the old learner-UI round**
  (`m1` signed-out pages light/dark + Today/Settings/Account; `m2`…`m5b` :59–82); output `test-results/shots/<milestone>/<name>-<width>.png` (:28).

---

## 13. `src/lib/`

- `cn.ts` (17 lines): `cn(...inputs)` = `twMerge(clsx(inputs))` (:15–17) with `extendTailwindMerge` teaching the `font-size` group the custom
  sizes `display, cta, h2, title-lg, h3, title, lead, subtitle, body-lg, body, label, small, caption, ui` (:5–13). Run 10/11/2026 with
  `tailwind-merge` 3.7.0: `twMerge('text-wm-body text-wm-ink')` → `text-wm-ink` (the size is dropped as a conflicting colour); with
  `text: ['wm-body']` added to `font-size` both survive; `twMerge('shadow-wm-card shadow-ledge')` → `shadow-ledge`;
  `twMerge('rounded-wm-button rounded-control')` keeps both.
- `use-reduced-motion.ts` (20 lines): `'use client'`; `useReducedMotion()` (:14) over `matchMedia('(prefers-reduced-motion: reduce)')` (:5) with
  server snapshot `true` (:18). One importer: `components/interactive/Reveal.tsx`.
- `site.ts` (7 lines): `site = { url, indexable, contactEmail, supportEmail }` from `NEXT_PUBLIC_*` env (:1–7). 9 importers (e.g. `app/robots.ts`, `app/sitemap.ts`, `app-chrome/AppFooter.tsx`).
- `metadata.ts` (32 lines): `buildMetadata(locale, { title, description })` (:10) — canonical, hreflang from `LANDING_LOCALES`, OG/Twitter,
  robots from `site.indexable`. Importer: `app/[locale]/layout.tsx:8`.
- `landing-locale.ts` (11 lines): `LANDING_LOCALES = ['vi']` (:5); `landingLocaleRedirect(pathname)` sends `/en` home to `/vi` (:8–11).
  Importers: `proxy.ts:6`, `lib/metadata.ts:3`, `app/sitemap.ts`.
- Also in `lib/`: `app-csp.ts`, `csp.ts`, `fly-into.ts`, `format-day.ts`, `learner-app-flag.ts`, `legal*.ts`, `security-headers.ts`, `sources.ts`.
  No `lib/speech/` yet. `lib/` imports `@/app-shell` twice (`legal.ts`, `sources.ts` read config) and `app-csp.ts:2` imports
  `../app-shell/theme/theme-script` relatively.

---

## 14. Root and CI

- `apps/web/package.json` scripts (:6–24): `dev`, `dev:app` (`node scripts/dev-app.mjs`), `build` (`next build`), `start`, **`lint`
  (`eslint . && node scripts/check-tailwind-raw.mjs`)**, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch`, `test:e2e`
  (`playwright test`), `shots` (`playwright test --config playwright.shots.config.ts`), `assert:render-mode`, `gen:og-fonts`, `cf:build`
  (`opennextjs-cloudflare build`), `cf:dev` (`wrangler dev --port 3100`), `deploy`, `cf-typegen`, `cf:docker`.
- `.github/workflows/ci.yml`: `on: pull_request:` with **no branch filter** (:6–7), so PRs into `refactor/giao-dien-moi` run it.
  Job `web` (:70–112), `working-directory: apps/web`, steps in order: checkout, pnpm 11.6.0, Node 24.11.0, `pnpm install --frozen-lockfile`
  (:90), **`pnpm lint`** (:93), **`pnpm typecheck`** (:96), **`pnpm test`** (:99), `pnpm exec playwright install --with-deps chromium` (:102),
  **`pnpm test:e2e`** (:105; its `webServer` runs `cf:build`, which is the only production build in the job — there is no separate
  `pnpm build` step), **`pnpm assert:render-mode`** (:108) with `NEXT_PUBLIC_LEARNER_APP: 'on'` (:109–112), reading the `.next` that `cf:build`
  left (`scripts/assert-render-mode.mjs:22`; requires `/vi`, `/en` prerendered and no `/vi/app…` route prerendered, :10–19).
  Job `admin` (:114–163): lint, typecheck, test, build, e2e build, e2e. `admin-e2e-real` (:165–).
- `git`: no branch `refactor/giao-dien-moi` locally or on `origin`, no `archive/*` tag yet (design §4 steps not done).

---

## Surprises / things the design gets wrong or leaves open

- **S1. `AddWordProvider` in `(member)/layout` turns on the `N` shortcut in sessions and onboarding.** The handler is global
  (`add-word-context.tsx:23–33`); today sessions are outside any provider. Design §5.4 puts the provider at `(member)` "để hộp Thêm từ mở được
  từ mọi màn có thanh trên", but `(member)` also wraps `(focus)` (`practice/session`, `review`, `recall`) and `(onboarding)`. Either place it in
  `(chrome)` or gate the key.
- **S2. "Chữ đang gõ ở ô tìm còn nguyên" (§5.4 table) is false for Nhóm → Một nhóm with the current `SearchStrip`.** It resets `q` and `level`
  whenever `useSearchParams().toString()` changes (`SearchStrip.tsx:40–46`); `/app/groups` → `/app/group?id=…` changes it, and so will
  `?lich=`/`?ngay=` (§5.6). Only moves between query-less paths keep the text.
- **S3. Old screens cannot "chạy tạm trong khung mới" with `AppShell` left in place.** All 17 call sites (§9.3) render a second header,
  `<main id="main">`, footer and tab bar, and `PlansPage`/`OrderReturnPage`/sessions render their own `<main id="main">`. M1 must strip
  `AppShell` from the 17 sites and move `back` (10 sites) and `aside` (6 sites) into page content, or make `AppShell` a pass-through.
- **S4. Screen tests lose the provider and `<main>`.** `renderApp` has no `AddWordProvider` (`test-utils.tsx:30–38`) and the default context is a
  no-op (`add-word-context.tsx:7`), so `group-list.test.tsx:56–57`, `group-page.test.tsx:69,307` fail (no sheet), and
  `group-page.test.tsx:60,300,319` (`getByRole('main')`) fail once pages stop rendering `AppShell`. `RequireSession.test.tsx:57–63` pins
  `role="status"` + `Đang tải…` for the spinner the skeleton replaces.
- **S5. Fonts: `--font-sans` and `--font-mono` names collide, and JetBrains Mono at the `/app` layout will not reach Tailwind's `:root` token.**
  `theme.css:6` already declares `--font-sans` in `@theme` (shared with admin, must stay); Tailwind's default theme has `--font-mono`. A next/font
  `variable` class sits on the element that gets `className`: `<html>` for the root layout, but only a `<div>` for `app/layout.app.tsx`
  (`:20`). `@theme` variables are declared on `:root` (`lib.js` `":root, :host"`), and a `var()` inside a custom property resolves where it is
  declared, so `--font-mono: var(--font-jetbrains-mono)` on `:root` would not see a variable set on the `/app` div. Use `@theme inline`
  (supported in 4.3.3) or different variable names. Reasoned from CSS custom-property rules and Tailwind's emitted selector; **not run**.
- **S6. "Test đỏ ngay … LP12 trong `tokens.test.ts`" (§9 M1) will not happen by itself.** LP12 (`tokens.test.ts:58–77`) reads only
  `theme.css`, which §7.1 forbids touching; adding `web.css` changes nothing it reads. Only `chrome.spec.ts:13` goes red (font). New tests are
  needed for `web.css`/`web-dark.css`: contrast, light/dark key parity (like D3 :79–82), and `text-classes.test.ts:19` must add their names or every
  `text-wm-*` class fails. §7.1 mentions only "hai test".
- **S7. Size tokens in px vs LP31.** Design §7.2 gives radii in px (6, 10, 14, 20, 28, 999) and shadows in px; LP31 (`tokens.test.ts:92–98`)
  forbids `\dpx` in `--radius-*`/`--shadow-*` of `theme.css` and `theme.css:2` says "Sizes in rem". Decide: write `wm-` sizes in rem, or scope LP31.
- **S8. Motion tokens break the `wm-` rule and collide.** §8.1 adds unprefixed `--ease-out-strong` (already `globals.css:155`, same value),
  `--ease-spring` (already `theme.css:78`, same value per `motion-va-chuyen-canh.md:138`) and `--blur-sm 6px`, `--blur-md 12px`, `--blur-lg 18px`,
  which redefine Tailwind 4.3.3 defaults (`theme.css:477–479` of tailwindcss: 8/12/16 px) for every `blur-*`/`backdrop-blur-*` utility (none
  used in `src` today). "Dưới 768 px `--blur-lg` = 12px" cannot sit inside `@theme` (Tailwind: `@theme` may only contain custom properties or
  `@keyframes`); it needs a `@media` rule outside it.
- **S9. Token README is stale in two places.** `README.md:59` says only the `/app` layout sets `data-theme`, but `(site)/layout.tsx:23–24` does too
  (and `dark.css:3` already says so). `README.md:73–77` describes `island.css` as giving the light palette; the file implements option B (dark
  card + stripe, `island.css:1–5`).
- **S10. `ui/` deny-list vs test helpers.** `renderApp` lives in `app-ui/test-utils.tsx` and imports `@/app-shell/*` (:7–10); `ui/*.test.tsx`
  will need it. The `ui/` rule needs `ignores` for tests/helpers, or the helper moves out (e.g. `src/test/`). `TurnstileWidget` cannot move to `ui/`
  (imports `@/app-shell/config`, `:5`).
- **S11. `speech-test-support.ts` is missing from the `lib/speech/` move list** (§6). It has 6 test importers across `app-ui/` and `features/`.
- **S12. The skeleton for hard loads sits above the sub-groups.** `RequireSession` is in `(member)/layout` (`:15`), above `(chrome)`, `(focus)` and
  `(onboarding)`; a skeleton "có hình khung app (thanh trên, tab dưới)" would also show on session and onboarding pages unless it picks the shape
  from `usePathname()`.
- **S13. `tailwind-merge` drops new type sizes.** `cn.ts:9` lists the size tokens by name; any `text-wm-<size>` not added there is dropped when
  combined with a `text-wm-<colour>` (run in §13).
- **S14. Smaller drift.** `ci.yml` web job has no `pnpm build` step (§13 of the design lists one; the build is `cf:build` inside `test:e2e`).
  `chrome.spec.ts` pin is lines 4–15 (design says 4–13). `pnpm shots` milestone keys `m1`…`m5b` belong to the old round (`shots.spec.ts:43–82`)
  and its widths include 1024 (`:6`); the new round needs new keys. The OG image's font change is in §5.8 (M1) but §15 says "đo ở M8".
  Comments in `complete-profile/page.app.tsx:5` and `welcome/page.app.tsx:5` say "split layout" though `AuthFrame` is a centred card since 03/11.
