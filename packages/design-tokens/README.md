# @wordmet/design-tokens

Design tokens for the Wordmet apps as Tailwind v4 `@theme` blocks; no runtime code and no dependencies. Three files:

| File | Imported by | Holds |
|---|---|---|
| `web.css` | `apps/web` | every token of the learner app and the public site, all named `wm-` (light values) |
| `web-dark.css` | `apps/web` | the dark value of every `--color-wm-*` and `--shadow-wm-*`, under `[data-theme='dark']` |
| `theme.css` | `apps/admin` only | admin's tokens (direction B, design `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md` §4) |

```css
/* apps/web/src/app/globals.css */
@import 'tailwindcss';
@import '@wordmet/design-tokens/web.css';
@import '@wordmet/design-tokens/web-dark.css';
```

Colours are declared **only** in this package. `apps/web/src/styles/no-old-tokens.test.ts` fails when `apps/web/src` names a `theme.css` token or
declares a non-`wm` theme token.

## `web.css` and `web-dark.css` (learner app and public site)

`web.css` and `web-dark.css` hold the tokens of the new web UI (design `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` §7, Figma
file `JKnyUUtGjpGpfKK4PqBfdY`). Every name carries `wm-` (`--color-wm-accent`, `--radius-wm-card`, `--shadow-wm-card`, `--text-wm-base`,
`--blur-wm-lg`, `--transition-duration-wm-in`, `--ease-wm-close`), so it never collides with `theme.css`, whose `accent`, `ink` and `primary`
mean other colours. `apps/web` imports only these two files since the polish round (P.6); admin imports neither. Sizes are in rem. `web-dark.css` redefines every `--color-wm-*` under `[data-theme='dark']`.
`apps/web/src/styles/web-tokens.test.ts` checks the light/dark key parity, text contrast in both modes and the rem rule.

Dark section (M9, mockup `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`): `web-dark.css` starts with `color-scheme: dark`, raises
`accent-soft`, `pass-soft`, `fail-soft` and the group `-wash` (16 % of the colour on the surface) and `-soft` (34 %), gives every `--shadow-wm-*` a
black version (buttons: `none`), and adds `scrim`, `paper`, `paper-line`, `halo-mark`, `wrong-soft/-line/-ink` and the `level-0` … `level-5`,
`level-priority`, `level-due` colours (light values in `web.css` equal the literals they replace). A dark colour a contrast test reads is `#rrggbb`, with the mix in a comment.

Levels (polish round P.1): SRS levels 0–5 ("Mới", "Bậc 1–5") use `level-0` … `level-5` through `apps/web/src/ui/levels.ts`; the old
stage colours are gone. `warn` is the "đến hạn" text: the mockup's `#b07a12` darkened to `#97680f` (same hue) to reach 4.5:1 on `surface`
and `bg`; dark `#f0c04a`. The contrast test pins every level hex and checks ink on each level tint (18 % and 40 % in oklab).

Radius scale C is by element role, not size: `--radius-wm-key` 4 px (keycaps, small labels, counts), `-control` 8 (buttons, inputs, chips), `-row` 10
(list rows, menus, popovers, toasts, hint blocks), `-card` 14, `-dialog` 16 (dialogs, sheets, the Học card) and `-pill`. An inner element is always smaller
than its container. Labels use Noto Sans (`--text-wm-meta`, 12 px / 500); the mono font is gone.

Motion curves: `--ease-wm-out` (carousel, open/close) and `--ease-wm-out-strong` (the same curve, kit transitions and dialogs), `--ease-wm-close`
(dialogs closing), and `--ease-wm-standard`, `-enter`, `-exit`, `-spring` (menus, toasts, answer feedback, the theme button), which keep the
values theme.css gave them before the polish round (P.6). The small kit animations that use them (`animate-wm-menu-in`, `animate-wm-toast-in`,
`animate-wm-feedback-in` …) are declared in `apps/web/src/app/globals.css`.

## `theme.css` (admin only)

```css
/* apps/admin/src/styles/globals.css */
@import 'tailwindcss';
@import '@wordmet/design-tokens/theme.css';
```

Admin adds its own tokens (density, containers, overlay motion) after the import. `apps/web/src/styles/tokens.test.ts` checks its contrast
pairs (LP12), its radius and shadow tokens in rem (LP31), and that `apps/web` declares no colour of its own (UBC1). The navy, hero and
session tokens below were the old learner app's; they stay because admin's file is not edited, and nothing in `apps/web` reads them.

### Font

`--font-sans: var(--font-lexend, 'Lexend'), ui-sans-serif, system-ui, sans-serif`. Lexend is a variable font with
Latin and Vietnamese subsets. An app without a `--font-lexend` variable loads the `Lexend` family itself (for example a Google Fonts `<link>`), which the fallback picks up.

### Colours

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
| `hero` / `hero-raised` / `on-hero` / `on-hero-muted` | light `#eceffe` / `#ffffff` / `#0f1a3d` / `#4d5577`; dark `#12151f` / `#2c3448` / `#f1f3fd` / `#b9c1e0` | learner app: the big "Hôm nay" cards on Today and Practice — light in the light theme, deep navy in the dark one |
| `navy-card` | `#121833` (dark `#12151f`) | learner app: the big navy cards (Hôm nay hero on Today and Practice, Từ hay sai), darker than `navy` |
| `on-navy` / `on-navy-muted` | `#f1f3fd` / `#b9c1e0` | learner app: text on `navy` |
| `session-card` | `var(--color-canvas)` | learner app: card in review and practice sessions |
| `on-accent` | `#0f1a3d` | learner app: text on `accent` (stays dark in both themes) |
| `highlight` | `#ffd84a` | learner app: the word marked in a saved sentence |
| `shadow-ink` | `rgb(15 26 61 / 0.35)` | colour of the flat ledges and overlay shadows |

### Contrast pairs checked (LP12)

- Text ≥ 4.5: `ink` on `surface`, `canvas`, `accent`, `accent-soft`, `wrong-chip`; `muted` on `surface`, `canvas`,
  `primary-soft`, `accent`; `primary` on `surface`, `primary-soft`; `on-primary` and `on-primary-muted` on `primary`;
  `success` on `surface`, `success-soft`; `danger` on `surface`, `danger-soft`; `warning` on `accent-soft`; `placeholder`
  on `surface`, `canvas`.
- Controls ≥ 3: `border-strong` on `surface`, `canvas`; `on-primary` on `primary`; `ink` on `accent`; `accent` on
  `primary`; `primary` on `accent`, `surface`.
- `danger` on `accent` is only 4.24: errors on the yellow band sit on a white pill.

### Motion

| Token | Value | Used for |
|---|---|---|
| `duration-instant` | 100ms | hover, button press |
| `duration-fast` | 150ms | colour change; closing menus, popovers, dialogs, panels |
| `duration-base` | 250ms | opening dialogs, panels, drawers |
| `duration-slow` | 400ms | sticker flight, card drop-in, flashcard flip, reveal on scroll |
| `--motion-wiggle` / `--motion-pop` / `--motion-toast` | 300 / 320 / 300ms | wrong-answer wiggle, gap pop, toast entrance |
| `ease-standard` / `ease-enter` / `ease-exit` | M3 standard / emphasized decelerate / emphasized accelerate | in place / in / out |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | only sticker flight, gap pop, card drop-in, toast |

Durations are declared as `--transition-duration-*` because Tailwind v4's `duration-*` utility reads only that
namespace (a `--duration-fast` token generates no CSS; checked 15/10/2026).

