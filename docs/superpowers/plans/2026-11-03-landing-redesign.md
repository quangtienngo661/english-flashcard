# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/vi` landing with mockup 5. The page introduces the app through its own UI, lets visitors try the exercise types,
and leads to account registration. It has light and dark themes and no waitlist.

**Architecture:** `app/[locale]/(site)/page.tsx` reads the `Landing` messages once on the server and passes plain copy objects to
synchronous section components in `components/landing/`. Every section is therefore testable with Testing Library against `vi.json`.
Three client islands carry the interaction: the app showcase tabs with the flip card, the exercise gallery and the theme toggle. Pure
helpers (`checkTyped`, `forgettingCurve`) hold the logic. The waitlist, D1 and the old sections are removed. `/en` (home only) redirects
to `/vi`.

**Tech Stack:** Next 16.4.3 App Router, next-intl 4.14.9, Tailwind 4 with `@wordmet/design-tokens`, Vitest 4.1.11 + Testing Library,
Playwright 1.63.0 + axe, OpenNext on Cloudflare Workers (`pnpm cf:docker` for e2e on Windows).

**Spec:** `docs/superpowers/specs/2026-11-03-landing-redesign-design.md` (copy deck §3, behaviour §3.1, criteria §11, edge cases §12).
Visual reference: `docs/mockups/2026-11-02-landing-v2/5-gioi-thieu.html` + `app.css`, `exercises.js`.

## Global Constraints

- Branch `feat/landing-redesign` from `docs/landing-redesign`. One PR into `dev` at the end. Conventional Commits, scope `web`.
- No new dependency (D5). Icons come from `lucide-react`, which is already used by the app.
- No Tailwind arbitrary values and no inline `style` (`pnpm lint` runs `check-tailwind-raw.mjs`). Exception: data-driven widths, with
  `// raw-ok: <reason>` on the line above. New values become tokens in `src/app/globals.css` `@theme`.
- Copy: exact Vietnamese strings from design §3. `en.json` gets the same `Landing` keys holding the same Vietnamese text (D3). Exercise
  kind labels come from `App.practice.session.kind`; review buttons from `App.review` (`stillLearning`, `know`, `hintWeb`, `card`); add-word
  labels from `App.addWord` (D4).
- No "!", no "Vui lòng", no "Chưa mở bán", no price. Section titles have no highlighter. H1 max `3.5rem`, line break after "Anh,".
- Motion: reuse `components/interactive/Reveal` as it is (0/40/60 ms steps). Flip 320 ms, FAQ 280 ms, both
  `cubic-bezier(0.23, 1, 0.32, 1)` (new token `--ease-out-strong`). Wrong choice wiggles 300 ms (existing `animate-wiggle-soft`). Nothing
  moves under `prefers-reduced-motion`. Key hints (`kbd`) only from `md` (48rem), as in the app.
- Breakpoints: header links from 60rem; group cards side by side from 36rem; exercise list as a column from 60rem, a horizontal strip below.
- Commands, run from `apps/web`: unit `pnpm test <path>`; all `pnpm lint && pnpm typecheck && pnpm test`; e2e on Windows
  `pnpm cf:docker [playwright args]` (Docker Desktop running).

## Review Focus

1. **Keyboard-only visitor in the exercise gallery:** after answering, focus lands on "Dạng bài tiếp theo"; after a wrong typed answer,
   focus returns to the field with the text selected. Tests in Task 8.
2. **Client-side navigation from the landing into the app keeps the theme:** `ThemeProvider`'s unmount cleanup deletes `data-theme`.
   Clicking Đăng nhập with dark chosen must still show the app dark. Test in Task 13 (LR23).
3. **320 px phones:** header, the window's tab bar, the review card and the two review buttons must stay inside their boxes. This is
   where every overflow in the mockups happened. Tests in Task 13 (LR22), with component guards in Tasks 5 and 6.
4. **Dark theme contrast on the landing-only surfaces** (navy bands, sample cards): axe in both themes. Test in Task 13 (LR27).
5. **No-JS visitor:** the first showcase panel, all section copy and the FAQ must work without client JS; hidden panels are `hidden`, not
   removed. Test in Task 13 (LR26) and the panel markup test in Task 6.

---

### Task 1: Theme on the landing (L1, D1)

**Files:**
- Modify: `src/app-chrome/ThemeToggle.tsx`
- Create: `src/app-chrome/theme-toggle-button.test.tsx`
- Modify: `src/app/[locale]/(site)/layout.tsx`, `src/app/[locale]/layout.tsx` (viewport), `packages/design-tokens/dark.css` (comment only)

**Interfaces:**
- Produces: `ThemeToggleButton({ toLight, toDark }: { toLight: string; toDark: string })`, the existing button with its labels as
  props. `ThemeToggle()` (the app) becomes `<ThemeToggleButton toLight={t('themeToLight')} toDark={t('themeToDark')} />`.
- Produces: `(site)/layout.tsx` renders `<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />` and wraps its tree in
  `ThemeProvider` from `@/app-shell/theme/ThemeProvider`.

- [ ] **Step 1: Write the failing test** `theme-toggle-button.test.tsx` (jsdom). Inside a `ThemeProvider`, with `matchMedia` light:
  - the button's accessible name is the `toDark` label;
  - after a click, `localStorage['wordmet-web.theme'] === 'dark'` and the name becomes the `toLight` label.
- [ ] **Step 2: Run** `pnpm test src/app-chrome/theme-toggle-button.test.tsx`. Expected: FAIL (`ThemeToggleButton` is not exported).
- [ ] **Step 3: Implement** `ThemeToggleButton` by moving the body of `ThemeToggle` and reading the labels from props; `ThemeToggle`
  wraps it. Add the script and provider to `(site)/layout.tsx`. Change `viewport.themeColor` to
  `[{ media: '(prefers-color-scheme: dark)', color: '#121833' }, { color: '#1b2444' }]` (navy-card / navy). Update the `dark.css` comment:
  the landing sets `data-theme` too.
- [ ] **Step 4: Run** `pnpm test src/app-chrome src/app-shell/theme`. Expected: the new and existing theme tests PASS.
- [ ] **Step 5: Commit** `feat(web): let the landing use the app theme and toggle`

### Task 2: `Landing` messages and copy types (D3, D4)

**Files:**
- Modify: `messages/vi.json`, `messages/en.json` (add `Landing`; update `Metadata.title`, `Metadata.description`, `Metadata.ogAlt`)
- Create: `src/components/landing/copy.ts`, `src/components/landing/copy.test.ts`

**Interfaces:**
- Produces: `export type LandingCopy = (typeof import('../../../messages/vi.json'))['Landing']`, and
  `export async function getLandingCopy(): Promise<LandingCopy>` (reads `getMessages()` and returns `.Landing`). Also exports
  `export type ExerciseKindKey = 'mcq' | 'true_false' | 'type_meaning' | 'cloze' | 'meaning_in_sentence' | 'mcq_sentence'`,
  `getAppCopy(): Promise<{ kinds: Record<ExerciseKindKey, string>; review: { card: string; hintWeb: string; stillLearning: string; know: string }; addWord: { title: string; word: string; sentence: string; deck: string; save: string; recognized: string } }>`,
  which picks only those `App` strings, and `export type AppCopy = Awaited<ReturnType<typeof getAppCopy>>`.
- Produces the `Landing` key tree. Keyed objects, no arrays, strings only (the LP3 test flattens them). Values are design §3:
  - `nav { features, exercises, plans, faq, login, signup, label, themeToLight, themeToDark }`
  - `hero { line1, line2, lead, signup, haveAccount, login, note }`
  - `showcase { label, tabs { review, groups, practice, lookup, addWord }, review { title, body, p1, p2, deck, progress, word, pos, meaning, exampleLabel, example, seenLabel, seen }, groups { title, body, p1, g1Name, g1Count, g1Waiting, g2Name, g2Count, g2Waiting, quickTitle, w1, w1m, w2, w2m, w3, w3m, w4, w4m }, practice { title, body, p1, p2, sentenceBefore, word, sentenceAfter, answer, translationLabel, translation }, lookup { title, body, p1, word, level, forms, pos, meaning, definition, example, status }, addWord { title, body, p1, word, recognized, sentence, deck, save } }`
  - `why { title, r1Title, r1Body, r2Title, r2Body, legendYes, legendNo, legendNote, axisRemember, axisDays, figureLabel }`
  - `exercises { title, lead, rule, again, next, check, placeholder, hintLabel, reveal, attempt, items { mcq { title, label, o1..o4 }, tf { title, sub, true, false }, typeMeaning { title, hint }, savedCloze { source, before, after, hint }, aiCloze { before, after, hint }, aiMeaning { sentence, bold, o1..o4 }, aiMcq { before, after, o1..o4 } }, free, pro, aiChip }`
  - `review { title, lead, p1, p2, panelTitle, sample, b0..b5 (box labels), weakTitle, weakBody }`
  - `metOutside { title, lead, arrow, savedLabel }`
  - `plans { title, free, freeP1, freeP2, freeP3, pro, proP1, proP2, proP3, proP4, trial, signup }`
  - `faq { title, q1, a1, q2, a2, q3, a3, q4, a4 }`
  - `final { title, signup, note }`

- [ ] **Step 1: Write the failing test** `copy.test.ts`:
  - `vi.Landing` and `en.Landing` flatten to identical keys and non-empty values;
  - `vi.Landing.hero.line1 === 'Học từ vựng tiếng Anh,'` and `line2 === 'ghi nhớ và vận dụng'`;
  - no `Landing` string matches `/!|vui lòng|chưa mở bán/i`;
  - `vi.Metadata.title === 'Wordmet · Học từ vựng tiếng Anh, ghi nhớ và vận dụng'`.
- [ ] **Step 2: Run** `pnpm test src/components/landing/copy.test.ts`. Expected: FAIL (no `Landing` key).
- [ ] **Step 3: Implement** both JSON trees (en = vi text for `Landing`, D3) and `copy.ts`.
- [ ] **Step 4: Run** `pnpm test src/components/landing src/i18n`. Expected: PASS, LP3 included.
- [ ] **Step 5: Commit** `feat(web): add the landing copy`

### Task 3: Landing button variants and tokens

**Files:**
- Modify: `src/components/ui/Button.tsx`, `src/components/ui/ui.test.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: `ButtonVariant` gains `'sticker' | 'quiet' | 'navy'`. Their class strings match `app-ui/Button.tsx`: sticker =
  `bg-accent text-on-accent shadow-ledge-accent`, quiet = `bg-surface text-ink ring-2 ring-inset ring-border-strong
  shadow-button-secondary`, navy = `bg-navy-raised text-on-navy`. Pressing removes the shadow, as it does today.
- Produces tokens: `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)`, `--transition-duration-flip: 320ms`,
  `--transition-duration-faq: 280ms` (reuse if an equal token exists), `--container-landing-hero: 40rem`.

- [ ] **Step 1: Failing test** in `ui.test.tsx`: `<ButtonLink variant="sticker" href="/vi/app/register">Đăng ký</ButtonLink>` renders a
  link whose class contains `bg-accent` and `shadow-ledge-accent`; variant `quiet` contains `ring-border-strong`.
- [ ] **Step 2: Run** `pnpm test src/components/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** the variants and tokens.
- [ ] **Step 4: Run** `pnpm test src/components/ui && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the app button variants to the landing kit`

### Task 4: Pure helpers (LR1, LR2, LRE4)

**Files:**
- Create: `src/components/landing/exercises/check.ts`, `src/components/landing/exercises/check.test.ts`
- Create: `src/components/landing/forgetting-curve.ts`, `src/components/landing/forgetting-curve.test.ts`

**Interfaces:**
- Produces: `checkTyped(answer: string, input: string): boolean`, which trims both and compares case-insensitively.
- Produces: `forgettingCurve(opts?: { reviews?: number[]; width?: number; height?: number }): { withReview: string; withoutReview: string; reviewDots: { x: number; y: number }[]; ticks: { day: number; x: number }[] }`.
  Defaults: reviews `[1, 3, 7, 14, 30]`, viewBox `600 × 230`, plot from x=40 to 584 and y=16 (memory 1) to 192 (memory 0). The decay after
  the k-th meeting is `exp(-(d - start) / s[k])` with `s = [1.6, 3.5, 7, 14, 28]`; the no-review line is `exp(-d / 2)`.
  `reviewDots` has one dot per review before day 30.

- [ ] **Step 1: Failing tests:**
  - `checkTyped('deployed', '  Deployed ')` is true; `checkTyped('deployed', 'deploy')` is false; `checkTyped('assume', '')` is false.
  - `forgettingCurve()`: `withReview` starts with `M40.0,16.0`; it contains the point `X(r),16.0` for each r in 1, 3, 7, 14;
    `withoutReview` ends at y ≥ 190; `reviewDots.map(d => d.x)` equals `[58.1, 94.4, 166.9, 293.9]` (1 decimal);
    `ticks.map(t => t.day)` equals `[1, 3, 7, 14, 30]`.
- [ ] **Step 2: Run** `pnpm test src/components/landing`. Expected: FAIL.
- [ ] **Step 3: Implement** both helpers.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the landing answer check and forgetting curve`

### Task 5: Header and hero

**Files:**
- Create: `src/components/landing/LandingHeader.tsx`, `src/components/landing/Hero.tsx`, `src/components/landing/header-hero.test.tsx`
- Modify: `src/app/[locale]/(site)/layout.tsx` (use `LandingHeader` in place of `SiteHeader`)
- Delete: `src/components/layout/SiteHeader.tsx`, `LanguageSwitch.tsx`, `language-switch.test.tsx` (L4)

**Interfaces:**
- Consumes: `LandingCopy`, `ButtonLink` variants (Task 3), `ThemeToggleButton` (Task 1), `Logo` from `@/app-chrome/Logo`.
- Produces: `LandingHeader({ copy, locale }: { copy: LandingCopy['nav']; locale: AppLocale })` and
  `Hero({ copy, locale }: { copy: LandingCopy['hero']; locale: AppLocale })`. Links: `/${locale}/app/register`, `/${locale}/app/login`;
  anchors `#tinh-nang`, `#bai-tap`, `#goi`, `#hoi-dap`.

- [ ] **Step 1: Failing tests** (render with `vi.Landing`):
  - the header has a navigation landmark labelled `copy.label`;
  - "Đăng ký" links to `/vi/app/register` and "Đăng nhập" to `/vi/app/login`;
  - no link named "English";
  - the hero `h1` text is `Học từ vựng tiếng Anh, ghi nhớ và vận dụng` with a `<br>` between the lines;
  - the hero's primary link precedes its login link in DOM order (C3).
- [ ] **Step 2: Run** `pnpm test src/components/landing/header-hero.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** to mockup 5:
  - header: navy, 64 px; anchor links hidden below 60rem; the Đăng nhập button hidden below 36rem;
  - hero: H1 `clamp(2rem, 1rem + 3.2vw, 3.5rem)`, lead in full ink, actions block left-aligned, max width token `landing-hero`.
- [ ] **Step 4: Run** the test and `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the landing header and hero`

### Task 6: App showcase (LR3, LR4, LR5, LRE3)

**Files:**
- Create: `src/components/landing/showcase/AppShowcase.tsx` (client), `ReviewCardDemo.tsx` (client), `GroupsDemo.tsx`, `PracticeDemo.tsx`,
  `LookupDemo.tsx`, `AddWordDemo.tsx`, `showcase.test.tsx`

**Interfaces:**
- Consumes: `LandingCopy['showcase']`, the `App` strings from `getAppCopy()` (Task 2).
- Produces: `AppShowcase({ copy, app }: { copy: LandingCopy['showcase']; app: AppCopy })`, the window with
  `role="tablist"` and five `role="tabpanel"` (ids `p1`..`p5`). Inactive panels keep their markup with `hidden`. Each demo root carries
  `data-ui`.
- Produces: `ReviewCardDemo({ copy, app })`, a button with `aria-pressed`. Both faces sit in one grid cell (`grid-area: 1 / 1`) so the
  card is as tall as its longer face.

- [ ] **Step 1: Failing tests:**
  - LR3: clicking tab "Tra từ" leaves exactly one visible tabpanel, whose heading is "Tra cứu từ vựng"; that tab has
    `aria-selected="true"`.
  - LR4: focus tab 1, press ArrowRight → tab 2 is selected and focused; press End → tab 5; Home → tab 1.
  - LR5: clicking the card sets `aria-pressed="true"` and shows "đàm phán, thương lượng".
  - All five panels are in the DOM on first render, four with `hidden` (no-JS reading order).
  - The review buttons read `App.review.stillLearning` and `App.review.know`.
- [ ] **Step 2: Run** `pnpm test src/components/landing/showcase`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Tab pattern: roving tabindex; ArrowLeft/Right wrap around; Home and End jump to the ends.
  - The tab bar scrolls horizontally inside the window below 60rem.
  - Panels are a two-column grid from 60rem, and every grid child gets `min-w-0`.
  - Groups grid: two columns only from 36rem.
  - Review header progress track `flex: 1 1 4rem; min-width: 0`.
  - Front word `clamp(1.75rem, 1.2rem + 2.4vw, 3rem)` with `overflow-wrap: anywhere`.
  - Flip uses the Task 3 tokens; `motion-reduce` swaps faces without rotation.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the app showcase window to the landing`

### Task 7: Why words fade (forgetting curve section)

**Files:**
- Create: `src/components/landing/WhyForget.tsx`, `src/components/landing/why-forget.test.tsx`

**Interfaces:**
- Consumes: `forgettingCurve()` (Task 4), `LandingCopy['why']`.
- Produces: `WhyForget({ copy }: { copy: LandingCopy['why'] })`, a `figure` labelled `copy.figureLabel` with an inline SVG (viewBox
  `0 0 600 230`, axis label font 16 user units) and a legend.

- [ ] **Step 1: Failing test:** the heading is "Vì sao từ vựng nhanh bị quên"; the figure has accessible name `copy.figureLabel`; two
  `path` elements have the `d` values from `forgettingCurve()`; 4 review dots; the legend shows "Hình minh họa".
- [ ] **Step 2: Run** `pnpm test src/components/landing/why-forget.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as a server-safe component (no hooks).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the forgetting curve section`

### Task 8: Exercise gallery (LR6–LR10, LRE4, LRE5, Review Focus 1)

**Files:**
- Create: `src/components/landing/exercises/exercise-set.ts`, `ExerciseGallery.tsx` (client), `exercise-gallery.test.tsx`

**Interfaces:**
- Consumes: `checkTyped` (Task 4), `LandingCopy['exercises']`, `AppCopy.kinds`.
- Produces: `EXERCISES: readonly Exercise[]` in this order: mcq, tf, typeMeaning, savedCloze, aiCloze, aiMeaning, aiMcq.

  ```ts
  // ExerciseKindKey is imported from ../copy (Task 2).
  type Exercise =
    | { id: string; kind: ExerciseKindKey; plan: 'free' | 'pro'; ai: boolean; mode: 'choice'; right: number }
    | { id: string; kind: ExerciseKindKey; plan: 'free' | 'pro'; ai: boolean; mode: 'typed'; answer: string };
  ```

  Answers: mcq right 0; tf right 1; typeMeaning `assume`; savedCloze `borrow`; aiCloze `deployed`; aiMeaning right 0; aiMcq right 0.
- Produces: `ExerciseGallery({ copy, kinds }: { copy: LandingCopy['exercises']; kinds: AppCopy['kinds'] })`.

- [ ] **Step 1: Failing tests** (Testing Library + `user-event`):
  - LR6: in Trắc nghiệm, click "delay". Option "delay" has the wrong state (`data-state="wrong"`) and "deploy" has `data-state="right"`.
    All options are disabled. Buttons "Làm lại" and "Dạng bài tiếp theo" exist, and the latter has focus.
  - LR7: in "Gõ từ · theo nghĩa", type "x" and press Kiểm tra. The field has `aria-invalid="true"`, "Lần 1" is shown, buttons Gợi ý and
    Xem đáp án exist, and there is no text "Đúng rồi" or "Chưa đúng" anywhere. Focus is on the field with its text selected.
  - LR8: then Gợi ý shows the hint text and becomes disabled.
  - LR9: Xem đáp án puts `assume` in the read-only field with `data-state="revealed"`.
  - LR10: "Dạng bài tiếp theo" on the last item selects the first, and focus goes to its picker button.
  - LRE4: typing ` Assume ` and Kiểm tra gives `data-state="right"`.
  - LRE5: with an empty field the Kiểm tra button is disabled.
  - The list shows 7 pickers. Labels come from `kinds` (e.g. "Điền từ vào câu" appears twice, once with the "Câu AI" chip).
  - No item shows a report link or an instruction line.
- [ ] **Step 2: Run** `pnpm test src/components/landing/exercises`. Expected: FAIL.
- [ ] **Step 3: Implement** to design §3.1 and the mockup `exercises.js` behaviour (lean version, C1).
  - States are exposed as `data-state` for styling.
  - The wiggle uses `motion-safe:animate-wiggle-soft`.
  - Kbd hints are `hidden md:inline`.
  - A live region announces "Đúng"/"Chưa đúng" for screen readers only (`sr-only`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the try-it exercise gallery`

### Task 9: Review timing, met outside, plans, FAQ, final call, footer

**Files:**
- Create: `src/components/landing/ReviewTiming.tsx`, `MetOutside.tsx`, `Plans.tsx`, `Faq.tsx`, `FinalCta.tsx`, `sections.test.tsx`
- Modify: `src/components/layout/SiteFooter.tsx`; delete `FooterLanguageLink.tsx`
- Modify: `src/app/globals.css` (FAQ `::details-content` motion, rotating plus)

**Interfaces:**
- Produces: each component takes `{ copy: LandingCopy[<key>] }` (`Plans` also takes `locale`). `SiteFooter` drops the language link and
  adds anchors Gói học (`#goi`) and Hỏi đáp (`#hoi-dap`).

- [ ] **Step 1: Failing tests:**
  - Plans: the Free card lists exactly 3 items, none containing "AI". The page text contains neither "Chưa mở bán" nor "₫". The Pro card
    shows "Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không mất phí.". The Free "Đăng ký" links to `/vi/app/register`.
  - FAQ: 4 `details` share `name="faq"`; the first is `open`; the summaries are the 4 questions of design §3.
  - ReviewTiming: shows the chip "Dữ liệu mẫu" and 6 box rows whose counts sum to 430.
  - Footer: no link named "English"; has a `mailto:` link.
- [ ] **Step 2: Run** `pnpm test src/components/landing/sections.test.tsx src/components/layout`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Proportional bars use `style={{ width }}` behind `// raw-ok: sample proportions`.
  - FAQ CSS: `interpolate-size: allow-keywords`, `::details-content` from `block-size: 0` to `auto` over `--transition-duration-faq`; the
    plus rotates 45°; reduced motion has no transition.
  - The FAQ is full width; answers are capped at 60ch.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the plans, faq and closing sections`

### Task 10: Assemble the page and remove the old landing (LR11)

**Files:**
- Modify: `src/app/[locale]/(site)/page.tsx`
- Delete: `src/components/sections/{Hero,Problem,HowItWorks,AiPractice,Plans,Faq,FinalCta}.tsx`, `src/components/interactive/cloze/**`,
  `Flashcard.tsx`, `flashcard.test.tsx`, `ui/Section.tsx`, `ui/SectionHeading.tsx`, `ui/Chip.tsx` (only those left unused)
- Modify: `messages/vi.json`, `messages/en.json` (remove `Hero`, `Cloze`, `Problem`, `Steps`, `Ai`, `Plans`, `Faq`, `FinalCta`; keep `Nav`
  only if still used)
- Modify: `src/i18n/messages.test.ts` (allowed rich tags: drop `brMd`, `brSm` if unused)

**Interfaces:**
- Consumes: every component from Tasks 5–9, `getLandingCopy`, `getAppCopy`.
- Produces: `page.tsx` order Hero → AppShowcase → WhyForget → ExerciseGallery → ReviewTiming → MetOutside → Plans → Faq → FinalCta. Each
  section after the hero is wrapped in `Reveal`; the hero and the showcase are not. Section ids are `tinh-nang`, `vi-sao`, `bai-tap`,
  `on-lai`, `gap-tu`, `goi`, `hoi-dap`.

- [ ] **Step 1: Failing test** in `copy.test.ts`: `vi` has none of the old landing namespaces listed above.
- [ ] **Step 2: Run** `pnpm test src/components/landing/copy.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Assemble the page, delete the old files and keys, then fix the imports `pnpm typecheck` reports.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): assemble the new landing and remove the old sections`

### Task 11: Remove the waitlist and D1 (L2, LR30)

**Files:**
- Delete: `src/features/waitlist/**`, `src/components/interactive/WaitlistForm.tsx`, `waitlist-form.test.tsx`, `migrations/`,
  `src/test/d1.ts`, `e2e/waitlist.spec.ts`, `e2e/d1.ts`
- Modify:
  - `wrangler.jsonc`: remove `d1_databases`.
  - `cloudflare-env.d.ts`: regenerate with `pnpm exec wrangler types`, or remove `DB` by hand.
  - `package.json`: remove `db:migrate:local` and `db:migrate:remote`.
  - `playwright.config.ts`: webServer command becomes `pnpm cf:build && node scripts/e2e-cf.mjs && pnpm cf:dev`.
  - `scripts/cf-docker.mjs`: drop `pnpm db:migrate:local`.
  - `.github/workflows/deploy-web.yml`: delete the D1 comment lines 6–7, keep the secrets line without "D1: Edit".
  - `messages/*.json` `Legal.privacy`: remove the waitlist paragraphs only.
  - The privacy page components that render them.

- [ ] **Step 1: Failing test** in `copy.test.ts`: no string under `Legal` matches `/waitlist|danh sách chờ|nhận tin ra mắt/i`; the
  `Waitlist` namespace is gone.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement** the deletions and edits.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test`, and `rg -n "waitlist|d1_databases|wordmet-waitlist" apps/web .github`
  (expected: no hit outside `docs/`).
- [ ] **Step 5: Commit** `refactor(web): remove the waitlist and its d1 database binding`

### Task 12: `/en` home redirect, metadata and sitemap (L4, D2, LR21)

**Files:**
- Modify: `src/proxy.ts`, `src/lib/metadata.ts`, `src/app/sitemap.ts`, `src/app/[locale]/opengraph-image.tsx` (title text from `Metadata`)
- Create: `src/lib/landing-locale.ts`, `src/lib/landing-locale.test.ts`; extend `src/lib/metadata` tests if present

**Interfaces:**
- Produces: `landingLocaleRedirect(pathname: string): string | null`, which returns `'/vi'` for `/en` and `/en/`, and `null` for
  everything else (`/en/app/...`, `/en/privacy`, `/en/terms`). `proxy` applies it after the learner-app redirect, as a 307 that keeps the
  query.

- [ ] **Step 1: Failing tests:**
  - `landingLocaleRedirect('/en')` and `('/en/')` give `'/vi'`; `/en/app`, `/en/app/login`, `/en/privacy`, `/vi` give `null`.
  - `buildMetadata('vi', …).alternates.languages` equals `{ vi: '/vi', 'x-default': '/' }`.
  - `sitemap()` lists only `/vi`.
- [ ] **Step 2: Run** `pnpm test src/lib src/app`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): send the english landing to vietnamese until it is translated`

### Task 13: End-to-end specs (LR20–LR30, Review Focus 2–5)

**Files:**
- Create: `e2e/landing.spec.ts`
- Modify: `e2e/page.spec.ts` (delete; covered by landing.spec), `e2e/a11y.spec.ts` (light and dark, `/vi` only), `e2e/chrome.spec.ts`
  (drop the footer language test), `e2e/locale.spec.ts` (LP7/LP9 become: `/` with en signals → `/en` → `/vi`), `e2e/seo.spec.ts`
  (sitemap `/vi` only), `e2e/visual.spec.ts` (new baseline, `/vi` light and dark), `e2e/privacy.spec.ts` (no consent label test)

- [ ] **Step 1: Write the specs** (use `copy.vi.Landing` for every string):
  - LR20: hero Đăng ký → `/vi/app/register`.
  - LR21: `request.get('/en', { maxRedirects: 0 })` gives 307 with location `/vi`; `/vi` has no "English" link.
  - LR22: at 320, 390, 768, 1440, open each tab, flip the card, open each exercise. No element sticks out of its nearest `[data-ui]`,
    `.panel`, `details[open]` or card box, and `scrollWidth === innerWidth`. Port the scan from the mockup session.
  - LR23: toggle to dark, reload, click Đăng nhập. The landing and `/vi/app/login` both have `html[data-theme="dark"]`.
  - LR24: with `colorScheme: 'dark'` and no stored choice, the first paint has `data-theme="dark"`.
  - LR25: with `reducedMotion: 'reduce'`, after scrolling the whole page no `.reveal`-wrapped section has a non-`none` transform and all
    are visible.
  - LR26: with `javaScriptEnabled: false`: the hero, tab 1 panel, every section title and the FAQ open/close work.
  - LR27: axe has no serious or critical violation in light and in dark.
  - LR28: no CSP violation event on `/vi`.
  - LR29: open FAQ 2. FAQ 1 closes. FAQ 2's height 90 ms later is between its closed and final heights.
  - LR30: `/vi` has no `input[type=email]`; no request whose body names the old waitlist action.
- [ ] **Step 2: Run** `pnpm cf:docker` (all e2e in the Linux container). Expected: every spec PASS. Update visual snapshots once with
  `pnpm cf:docker --update-snapshots` and look at them before committing.
- [ ] **Step 3: Commit** `test(web): cover the new landing end to end`

### Task 14: Gates, as-built and pointers

**Files:**
- Create: `docs/deliveries/landing-redesign.md` (plan summary already there; append as-built), screenshots under
  `docs/deliveries/landing-redesign/`
- Modify: `docs/deliveries/deploy-checklist.md` (landing needs `NEXT_PUBLIC_LEARNER_APP=on` and a live API; D1 `wordmet-waitlist` can be
  deleted in the dashboard), `CLAUDE.md` (one pointer line in the Landing section)

- [ ] **Step 1: Run the gates:**
  - `node <taste-skill>/scripts/lint.mjs src/components/landing src/app/globals.css`, then `inspect.mjs` on the e2e server URL with
    `--allow gradient,shadow,button-fx`.
  - `impeccable detect --json` on the landing components.
  - Record every remaining finding with a reason in the delivery doc.
- [ ] **Step 2: Manual run:** `pnpm dev`, then compare against mockup 5 at 1440, 768, 390 and 320, light and dark. Save 8 screenshots.
- [ ] **Step 3: Commit** `docs(web): record the landing redesign as-built`

---

## Self-review notes

- **Spec coverage:**
  - §3 copy is covered by Tasks 2, 5–9.
  - §3.1 is covered by Task 8.
  - §4 (structure, deletions) by Tasks 5–11.
  - §5 by Task 1.
  - §6 by Tasks 3, 6, 8–10 (CSS motion) and 13 (LR25, LR29).
  - §7 by Task 12.
  - §8 by Tasks 2 (metadata) and 12 (OG).
  - §9 by Task 14 (deploy checklist).
  - §11 by Tasks 4, 6, 8, 10, 13.
  - §12: LRE1 relies on the existing `theme.ts` behaviour and is covered by its tests. LRE2 → LR22. LRE3 → Task 6. LRE4/5 → Task 8.
    LRE6 → CSS fallback, no test (old browsers are not in CI). LRE7 → Task 14 checklist. LRE8 → Task 13 locale spec.
- **Deviation from design §6:** the reveal stagger stays at the existing 0/40/60 ms, not 70 ms. This reuses `Reveal` unchanged (D5, UB18).
- **Open item carried from design §13:** the add-word sample line "dạng quá khứ của go" must use the real `App.addWord.recognized` pattern
  (`{kind}` of `{base}`). In Task 6 Step 3 the implementer finds the label the app passes as `{kind}` for a past tense, in the add-word
  feature code and its messages. If no such label exists, they drop the kind and show only "went → go". No guessed wording ships.
