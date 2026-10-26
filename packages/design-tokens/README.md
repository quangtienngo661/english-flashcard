# @wordmet/design-tokens

Shared design tokens for the Wordmet apps (direction B, design
`docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md` §4). One CSS file with a Tailwind v4 `@theme` block; no runtime
code and no dependencies.

```css
@import 'tailwindcss';
@import '@wordmet/design-tokens/theme.css';
```

Each app adds its own tokens (type scale, density, containers) after the import. Colours are declared **only** here;
`apps/web/src/styles/tokens.test.ts` checks contrast (LP12) and that the app declares none of its own (UBC1).

## Font

`--font-sans: var(--font-lexend, 'Lexend'), ui-sans-serif, system-ui, sans-serif`. Lexend is a variable font with
Latin and Vietnamese subsets. `apps/web` loads it with `next/font/google` (`variable: '--font-lexend'`); an app without
that variable loads the `Lexend` family itself (for example a Google Fonts `<link>`), which the fallback picks up.

## Colours

| Token | Value | Used for |
|---|---|---|
| `primary` | `#2445d6` | landing header and hero, primary buttons, admin mobile top bar, focus ring on light backgrounds |
| `primary-deep` | `#1a32a6` | ledge under primary buttons and under the practice card |
| `primary-soft` | `#eceffe` | stat tiles, the "AI practice" band, "running" status, file drop zone |
| `on-primary` | `#ffffff` | text and borders on `primary` |
| `on-primary-muted` | `#dfe5ff` | secondary text on `primary` |
| `accent` | `#ffd84a` | answer stickers, buttons on the blue field, final CTA band, highlighter of the active menu item, focus ring on blue |
| `accent-deep` | `#c9a21a` | ledge under stickers |
| `accent-soft` | `#fff4c7` | open table row, "partial" status, "updated" tile |
| `ink` | `#0f1a3d` | main text, buttons on `accent`, toasts |
| `muted` | `#4d5577` | secondary text |
| `placeholder` | `#5f6688` | input placeholder text |
| `surface` | `#ffffff` | cards, admin sheet, landing background |
| `canvas` | `#f1f3fd` | admin background, admin input fill |
| `canvas-deep` | `#dde1f5` | ledge under the admin white sheet |
| `border` | `#e3e6f4` | table rules, panel edges |
| `border-strong` | `#7d84a8` | input, checkbox and secondary-button borders |
| `success` / `success-soft` | `#1b7a46` / `#e3f4ea` | correct, done |
| `warning` | `#7a5200` | text on `accent-soft` |
| `danger` / `danger-soft` | `#b8352a` / `#fde8e5` | wrong, failed, destructive actions |
| `danger-deep` | `#8a2219` | ledge under the admin danger button |
| `neutral-soft` | `#eef0f5` | "queued", "reverted", "unchanged" |
| `wrong-chip` / `wrong-chip-deep` | `#ffd3cd` / `#d99b92` | a sticker picked wrongly, and its ledge |
| `navy` / `navy-raised` | `#1b2444` / `#2c3760` | learner app: top bar and lookup strip, raised items on it |
| `on-navy` / `on-navy-muted` | `#f1f3fd` / `#b9c1e0` | learner app: text on `navy` |
| `session-card` | `var(--color-canvas)` | learner app: card in review and practice sessions |
| `on-accent` | `#0f1a3d` | learner app: text on `accent` (stays dark in both themes) |
| `highlight` | `#ffd84a` | learner app: the word marked in a saved sentence |
| `band-blue` / `band-yellow` / `band-green` / `band-red` | `#eceffe` / `#fff4c7` / `#e3f4ea` / `#fde8e5` | learner app: the band on top of a deck card; same light tone in the dark theme, with `on-accent` bars |
| `shadow-ink` | `rgb(15 26 61 / 0.35)` | colour of the flat ledges and overlay shadows |

## Dark theme (learner app only)

`dark.css` redefines every colour under `[data-theme='dark']`, from the "Dark" mode of the Figma variables (file
`7HcPAKLrWu32C27qYMJUOA`, collection "Wordmet B"). Only the `/app` layout of `apps/web` sets `data-theme`, so the landing
and admin never change. Exceptions to the Figma values: `border-strong` is `#6b7491` (Figma `#59627d` is 2.33:1 on the dark
`surface`; inputs need 3:1), and `canvas-deep`, `danger-deep`, `wrong-chip`, `wrong-chip-deep` (not in Figma) are chosen
here. `apps/web/src/styles/tokens.test.ts` checks that every colour has a dark value and the learner app's pairs in both
modes.

## Contrast pairs checked (LP12)

- Text ≥ 4.5: `ink` on `surface`, `canvas`, `accent`, `accent-soft`, `wrong-chip`; `muted` on `surface`, `canvas`,
  `primary-soft`, `accent`; `primary` on `surface`, `primary-soft`; `on-primary` and `on-primary-muted` on `primary`;
  `success` on `surface`, `success-soft`; `danger` on `surface`, `danger-soft`; `warning` on `accent-soft`; `placeholder`
  on `surface`, `canvas`.
- Controls ≥ 3: `border-strong` on `surface`, `canvas`; `on-primary` on `primary`; `ink` on `accent`; `accent` on
  `primary`; `primary` on `accent`, `surface`.
- `danger` on `accent` is only 4.24: errors on the yellow band sit on a white pill.

## Motion

| Token | Value | Used for |
|---|---|---|
| `duration-instant` | 100ms | hover, button press |
| `duration-fast` | 150ms | colour change; closing menus, popovers, dialogs, panels |
| `duration-base` | 250ms | opening dialogs, panels, drawers; FAQ |
| `duration-slow` | 400ms | sticker flight, card drop-in, flashcard flip, reveal on scroll |
| `--motion-wiggle` / `--motion-pop` / `--motion-toast` | 300 / 320 / 300ms | wrong-answer wiggle, gap pop, toast entrance |
| `ease-standard` / `ease-enter` / `ease-exit` | M3 standard / emphasized decelerate / emphasized accelerate | in place / in / out |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | only sticker flight, gap pop, card drop-in, toast |

Durations are declared as `--transition-duration-*` because Tailwind v4's `duration-*` utility reads only that
namespace (a `--duration-fast` token generates no CSS; checked 15/10/2026).
