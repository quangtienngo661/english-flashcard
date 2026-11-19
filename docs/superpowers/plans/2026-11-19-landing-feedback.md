# Landing feedback fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 8 approved design-feedback fixes to the landing page (`apps/web`) and the answer-number badge of the learner practice screen.

**Architecture:** Landing sections live in `apps/web/src/site/landing/` and get their copy as props from `messages/{vi,en}.json` (`Landing`
tree). The new topic-deck carousel is one client component that reuses the app's deck-stack CSS (`.gstack-*`, `.gcar-slot`) and pure arc
helpers (`features/learner/groups/carousel.ts`), plus one small pure module for the landing's width-dependent spacing.

**Tech Stack:** Next 16 App Router, React 19, next-intl 4, Tailwind 4 (`wm-` tokens from `packages/design-tokens`), Vitest 4 + Testing
Library (jsdom), Playwright 1.63 (run on Windows through `pnpm cf:docker`).

**Spec:** `docs/superpowers/specs/2026-11-19-landing-feedback-design.md` (decisions:
`docs/superpowers/decisions/2026-11-19-landing-feedback-decisions.md`; approved mock-up: `docs/mockups/2026-11-18-landing-gop-y/index.html`).

## Global Constraints

- All commands run from `apps/web` unless stated. Default test command: `pnpm test` (Vitest, no Docker).
- Commits: Conventional Commits `type(web): subject`, lower case, imperative, ≤ 72 chars, ending with the line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Branch `fix/landing-feedback` from `origin/dev`; the PR targets `dev`.
- Tailwind arbitrary values (`text-[…]`, `w-[…]`, …) need a `raw-ok` comment on the line above, or `pnpm lint` (`check-tailwind-raw`) fails.
- Tests query by role and visible text, never by class or test id (`~/.claude/rules/testing-boundaries.md`).
- `vi.json` and `en.json` keep identical `Landing` keys (`copy.test.ts`). EN copy: "deck", never "group"/"stack"; never "wrong" or "box"; no "!".
- Topic names are the English names of `apps/api/prisma/migrations/20261114200000_topics_seed/migration.sql`, identical in both locales.
- Decision F.22 stands: no "IELTS" on the landing (owner decision D17, 19/11/2026: the 5th deck is Education, not IELTS).
- Reduced motion (`prefers-reduced-motion: reduce`) and no-JS must show finished, static content (`motionAllowed()` in `site/interactive/motion.ts`).
- Do not touch the hero stage (`HeroCycle`, floating cards), Pricing, FAQ or Final CTA.

## Review Focus

- A keyboard or screen-reader user tabs into the carousel while it auto-advances → it must stop moving while focus is inside (Task 6 test).
- The tab is hidden or the carousel is scrolled out of view → no advancing in the background (Task 6 tests).
- The window is resized across 768 px or from 1440 to 1024 px → the stacks re-space without a page reload (Task 6 test on `resize`).
- Dark mode: word chips (`wash` background, `ink` text of the deck colour) and the badge of Task 3 stay readable → checked by eye in Task 8.
- No JavaScript: the first deck sits in the centre with its words visible and nothing waits hidden for an observer (Task 7 test).

---

### Task 0: Branch and design documents

**Files:**
- Create (copy from the main checkout `E:\Working\Working project\english-learning`): `docs/superpowers/specs/2026-11-19-landing-feedback-design.md`,
  `docs/superpowers/decisions/2026-11-19-landing-feedback-decisions.md`, `docs/superpowers/plans/2026-11-19-landing-feedback.md`,
  `docs/deliveries/landing-feedback.md`, the folder `docs/mockups/2026-11-18-landing-gop-y/` (`index.html` and `truoc/1.png`…`5.png`).

- [ ] **Step 1:** `git fetch origin && git worktree add ../english-learning-wt-landing-feedback -b fix/landing-feedback origin/dev`, then work in that worktree.
- [ ] **Step 2:** Copy the files above into the same paths in the worktree.
- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-11-19-landing-feedback-design.md docs/superpowers/decisions/2026-11-19-landing-feedback-decisions.md docs/superpowers/plans/2026-11-19-landing-feedback.md docs/deliveries/landing-feedback.md docs/mockups/2026-11-18-landing-gop-y
git commit -m "docs(web): add landing feedback design, decisions and plan"
```

### Task 1: Hero title in one colour

**Files:**
- Modify: `apps/web/src/site/landing/Hero.tsx` (the `before/accent/after` split and the `segments` of `SplitWords`)
- Modify: `apps/web/messages/vi.json`, `apps/web/messages/en.json` (remove `Landing.hero.accent`)
- Test: `apps/web/src/site/landing/copy.test.ts`

- [ ] **Step 1: Change the tests.** In `copy.test.ts` replace the two `line2 … toContain(…accent)` assertions with:

```ts
expect('accent' in vi.Landing.hero).toBe(false);
expect('accent' in en.Landing.hero).toBe(false);
```

  and rename the vi test to `'the hero heading is Figma\'s, in one colour (no accent key)'`.
- [ ] **Step 2:** `pnpm test src/site/landing/copy.test.ts` → FAIL (`accent` still present).
- [ ] **Step 3:** Remove `accent` from both message files. In `Hero.tsx` drop `at/before/after`; `segments` become
  `[{ text: \`${copy.line1} \` }, { br: 'md:hidden' }, { text: copy.line2 }]`. Update the JSDoc line that mentions "trong câu" in the accent colour.
- [ ] **Step 4:** `pnpm test src/site/landing` → PASS; `pnpm typecheck` → no errors.
- [ ] **Step 5: Commit** `fix(web): set the landing hero title in one colour`

### Task 2: Remove the sliding word strip

**Files:**
- Delete: `apps/web/src/site/landing/WordStrip.tsx`, `apps/web/src/site/interactive/Marquee.tsx`
- Modify: `apps/web/src/site/landing/HomePage.tsx`, `apps/web/src/site/interactive/motion.test.tsx` (drop `describe('Marquee')` and its import),
  `apps/web/src/app/globals.css` (the `[data-wm-marquee]` rules near line 1241), both message files (remove `Landing.strip`)
- Test: `apps/web/src/site/landing/landing.test.tsx`

- [ ] **Step 1: Write the failing test** in `landing.test.tsx`, `describe('home page …')`:

```ts
it('has no sliding word strip: its words are gone from the page', () => {
  renderHome();
  for (const word of ['feasible', 'alleviate', 'detrimental', 'incentive']) expect(screen.queryByText(word)).toBeNull();
});
```

- [ ] **Step 2:** `pnpm test src/site/landing/landing.test.tsx` → FAIL (words found).
- [ ] **Step 3:** Delete the files, remove `<WordStrip …/>` and its import from `HomePage.tsx`, the Marquee test and CSS, and `Landing.strip`.
- [ ] **Step 4:** `pnpm test` → PASS; `pnpm lint && pnpm typecheck` → clean (no unused import).
- [ ] **Step 5: Commit** `fix(web): drop the sliding word strip from the landing`

### Task 3: Answer-number badge on right and wrong rows (item 4)

**Files:**
- Modify: `apps/web/src/ui/AnswerOption.tsx:46-49` (the `<kbd>`), `apps/web/src/site/landing/parts.tsx:82` (the number `<span>` of `ChoiceRow`)

No unit test: the change is colour only and the project's tests do not assert classes. It is checked by eye in Task 8.

- [ ] **Step 1:** In both places the badge classes depend on the row state:
  idle / dim / no state → `bg-wm-accent-soft text-wm-accent` (unchanged);
  correct / `'right'` → `bg-wm-surface text-wm-pass ring-1 ring-inset ring-wm-pass`;
  wrong → `bg-wm-surface text-wm-fail ring-1 ring-inset ring-wm-fail`.
- [ ] **Step 2:** `pnpm test src/ui src/features/learner/practice src/site/landing` → PASS (behaviour unchanged).
- [ ] **Step 3: Commit** `fix(web): give answer numbers the row colour once answered`

### Task 4: Practice demo — one tally line, a clear question, a green fill, no right/wrong words (items 5, 6, 7)

**Files:**
- Modify: `apps/web/src/site/landing/LearnSection.tsx` (`PracticeDemo`), `apps/web/src/site/landing/parts.tsx` (`ChoiceRow`: drop the `note`
  prop and its ✓/✕ text; add `Filled`), `apps/web/src/site/landing/styles.ts` (replace `SENTENCE_22` with `QUESTION`), both message files
- Test: `apps/web/src/site/landing/landing.test.tsx`, `apps/web/src/site/landing/copy.test.ts`

**Interfaces:**
- Produces: `export function Filled({ sentence, target }: { sentence: string; target: string })` in `parts.tsx` — like `Marked`, but the
  first `target` sits in a box `rounded-wm-control border-[1.5px] border-wm-pass bg-wm-pass-soft px-2 text-wm-ink` (raw-ok comment: the app's
  answered blank, 1.5 px). `Marked` stays for `HeroCycle`.
- Produces: `QUESTION = 'font-wm-display text-[1.375rem]/[1.4] font-medium md:text-[1.625rem]/[1.4]'` in `styles.ts` (raw-ok comment: the
  question is the largest text of the demo, 22 / 26 px).
- Copy, `Landing.learn.practice` (both locales unless shown): `count`: `"7/20"`; remove `scores`, `right`, `wrong`; add
  `tally: { right: 5, wrong: 1, rightLabel: "{count} câu đúng" | "{count} correct", wrongLabel: "{count} câu sai" | "{count} incorrect" }`.

- [ ] **Step 1: Write the failing tests.** In `landing.test.tsx`:

```ts
it('the practice demo has one tally line like the app: 7/20, ✓ 5, ✕ 1, and no right/wrong words on the rows', () => {
  renderHome();
  const learn = within(screen.getByRole('region', { name: 'Từ lúc gặp đến lúc dùng được' }));
  expect(learn.getByText('7/20')).toBeInTheDocument();
  expect(learn.getByRole('img', { name: '5 câu đúng' })).toBeInTheDocument();
  expect(learn.getByRole('img', { name: '1 câu sai' })).toBeInTheDocument();
  expect(learn.queryByText(/câu còn lại|từ ôn lại sau 7 ngày/)).toBeNull();
  expect(learn.queryByText('Đúng', { exact: true })).toBeNull();
  expect(learn.queryByText('Sai', { exact: true })).toBeNull();
});
```

  Remove `expect(screen.getByText('từ ôn lại sau 7 ngày'))…` from the QM8-6 test. In `copy.test.ts` replace
  `expect([en.Landing.learn.practice.right, en.Landing.learn.practice.wrong]).toEqual(['Correct', 'Incorrect']);` with
  `expect(fill(en.Landing.learn.practice.tally.wrongLabel, { count: 1 })).toBe('1 incorrect');`.
- [ ] **Step 2:** `pnpm test src/site/landing` → FAIL.
- [ ] **Step 3:** Change the copy. In `PracticeDemo` (keep `hidden md:flex` on the header block and the `shown = [0, 3]` phone rule):
  header row = `demoTitle` (left) · `count` · two `Tag`s from `@/ui/Tag` each wrapped like `PracticeSession.tsx:188-199`
  (`<span role="img" aria-label={fill(tally.rightLabel, { count: tally.right })}><Tag tone="pass"><Check …/>{tally.right}</Tag></span>`, same with
  `fail`/`X`/`wrong`); then `<Progress done={6} total={20} />`; the sentence `<p className={cn(QUESTION, 'py-4 text-wm-ink md:py-5')}>` with
  `<Filled …/>`; the choices without `note`. Delete `SENTENCE_22` if nothing else uses it.
- [ ] **Step 4:** `pnpm test src/site/landing` → PASS; `pnpm lint` → clean.
- [ ] **Step 5: Commit** `fix(web): make the landing practice demo read like the app`

### Task 5: "Từ lúc gặp đến lúc dùng được" as four ordered steps (item 8)

**Files:**
- Modify: `apps/web/src/site/landing/LearnSection.tsx`
- Test: `apps/web/src/site/landing/landing.test.tsx` (the test `LearnSection has its four cards…`)

- [ ] **Step 1: Change the test** to:

```ts
it('LearnSection lists its four steps in learning order, the listen step on every width', () => {
  renderHome();
  const learn = within(screen.getByRole('region', { name: 'Từ lúc gặp đến lúc dùng được' }));
  const steps = learn.getAllByRole('listitem').filter((li) => li.parentElement?.tagName === 'OL' && li.querySelector('h3'));
  expect(steps.map((li) => within(li).getByRole('heading', { level: 3 }).textContent)).toEqual([
    'Lưu từ trong vài giây',
    'Nghe giọng Anh-Anh, Anh-Mỹ và đọc phiên âm',
    'Luyện từ trong câu thật',
    'Ôn đúng lúc sắp quên',
  ]);
});
```

- [ ] **Step 2:** `pnpm test src/site/landing/landing.test.tsx` → FAIL (order).
- [ ] **Step 3:** Inside `DemoLoops` render an `<ol>`; each `<li>` = a number circle (`aria-hidden`, `size-10 rounded-full bg-wm-accent
  text-wm-on-accent font-wm-display`) with a 2 px `bg-wm-line` connector down to the next number (none after step 4), and the existing `Card`
  (still an `<article>`, so `DemoLoops` finds the typing and bins). From `lg` the card puts eyebrow/title/body in a 300 px column left of the
  demo (`lg:grid lg:grid-cols-[300px_1fr]`, raw-ok comment); below `lg` the demo sits under the text. Order: note, listen, practice, review.
  The listen card loses `hidden md:flex`. Keep the `Reveal` delays 0 / 120 / 220 / 300 in the new order.
- [ ] **Step 4:** `pnpm test` → PASS; `pnpm lint && pnpm typecheck` → clean.
- [ ] **Step 5: Commit** `fix(web): order the how-it-works steps from saving to review`

### Task 6: Arc spacing and fixed deck colours (pure)

**Files:**
- Create: `apps/web/src/site/landing/topic-arc.ts`, `apps/web/src/site/landing/topic-arc.test.ts`
- Modify: `apps/web/src/lib/group-color.ts` (+ a case in its existing test file if there is one, else in `topic-arc.test.ts`)

**Interfaces:**
- Consumes: `arcSlot(k, phone): ArcSlot` and `type ArcSlot` from `@/features/learner/groups/carousel`.
- Produces: `export function topicStep(viewportWidth: number): number` — 128 below 768; else
  `Math.min(230, Math.max(150, (viewportWidth / 2 - Math.min(viewportWidth * 0.09, 120) - 230) / 1.68))`.
- Produces: `export function topicSlot(k: number, viewportWidth: number): ArcSlot` — `{ ...arcSlot(k, viewportWidth < 768), x: k * topicStep(viewportWidth) * 0.84 }`.
- Produces: `export function groupToneAt(index: number): GroupTone` in `group-color.ts` — `TONES[((index % 7) + 7) % 7]`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('topicStep keeps the phone step, fits wide screens, and stays within 150–230', () => {
  expect(topicStep(390)).toBe(128);
  expect(topicStep(767)).toBe(128);
  expect(topicStep(1024)).toBe(150);
  expect(topicStep(1280)).toBeCloseTo(175.476, 2);
  expect(topicStep(1440)).toBeCloseTo(220.238, 2);
  expect(topicStep(2560)).toBe(230);
});
it('topicSlot moves x with the step and keeps the app arc for the rest', () => {
  expect(topicSlot(2, 1440)).toMatchObject({ y: 64, rotate: 16, scale: 0.8, opacity: 0.5, z: 8 });
  expect(topicSlot(2, 1440).x).toBeCloseTo(370.0, 1);
  expect(topicSlot(-1, 390).x).toBeCloseTo(-107.52, 2);
  expect(topicSlot(0, 1440)).toMatchObject({ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, z: 10 });
});
it('groupToneAt walks the seven deck colours and wraps', () => {
  expect(groupToneAt(0).border).toBe('border-wm-group-0');
  expect(groupToneAt(6).ink).toBe('text-wm-group-6-ink');
  expect(groupToneAt(7)).toEqual(groupToneAt(0));
  expect(groupToneAt(-1)).toEqual(groupToneAt(6));
});
```

- [ ] **Step 2:** `pnpm test src/site/landing/topic-arc.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement the three functions.
- [ ] **Step 4:** `pnpm test src/site/landing/topic-arc.test.ts src/lib` → PASS.
- [ ] **Step 5: Commit** `feat(web): add arc spacing and fixed deck colours for the landing`

### Task 7: TopicCarousel component

**Files:**
- Create: `apps/web/src/site/landing/TopicCarousel.tsx` (`'use client'`), `apps/web/src/site/landing/TopicCarousel.test.tsx`
- Modify: `apps/web/src/app/globals.css` (new rules next to the `.gcar-*` block, ~line 530)

**Interfaces:**
- Consumes: `topicSlot`, `groupToneAt` (Task 6); `stepTo` from `@/features/learner/groups/carousel`; `motionAllowed`, `whileInView` from
  `../interactive/motion`; `fill` from `./copy`; CSS `.gstack`, `.gstack-face`, `.gstack-behind`, `.gstack-meta`, `.gstack-name`,
  `.gstack-foot`, `.gcar-slot` from `globals.css`.
- Produces: `export const AUTO_MS = 3500;` and
  `export function TopicCarousel({ copy }: { copy: LandingCopy['groups'] })` where `copy` has (Task 8 adds it to the messages)
  `kind, words ("{count} từ"), more ("+{count} từ"), start, prev, next, label` and
  `topics: Array<{ name: string; level: string; total: number; words: string[] }>` (exactly 5 words each).
- Tone of topic `i` = `groupToneAt([6, 0, 2, 1, 5][i])`.

**Markup and CSS decisions:**
- Root `<div role="region" aria-roledescription="carousel" aria-label={copy.label}>`, full window width
  (`relative left-1/2 w-screen -translate-x-1/2`), inside it the track `div.wm-topic-track` and below it the caption and controls.
- Each topic is a `div.gcar-slot` with `data-k`, `data-abs`, custom properties `--x` and `--xp` (both `topicSlot(k, vw).x`), `--y`, `--r`,
  `--s`, `--o`, `--z` from `topicSlot`; slots with `|k| > 2` are not rendered (as in the app); `|k| ≥ 1` slots get `inert` and `aria-hidden`.
  Inside: `div.gstack[data-size=carousel][data-layers=2]` with two `.gstack-behind` (`tone.soft`) and a `.gstack-face` (`tone.border`)
  holding `.gstack-meta` (`fill(copy.words, { count: total })`), `.gstack-name`, then **only on the centre slot** `ul.wm-topic-words` (the 5
  words as `li` with `style={{ '--i': j }}` and `tone.wash tone.ink`, then a last `li` `fill(copy.more, { count: total - 5 })` with
  `border border-wm-line text-wm-muted`, `--i: 5`) keyed by the centre index so it re-mounts and replays, and `p.gstack-foot`
  (`copy.start` + `<b>{words[0]}</b>`; side slots show it too).
- Caption `p` under the track: `${copy.kind} · ${topic.level}` with the level in `text-wm-muted`.
- Controls: two round buttons (`aria-label` `copy.prev` / `copy.next`, lucide `ChevronLeft` / `ChevronRight`) and between them five dots
  (`aria-hidden`; active dot `w-5.5 bg-wm-accent`, others `size-1.75 bg-wm-line`).
- `globals.css`: `.wm-topic-track { position: relative; height: 23rem; mask-image: linear-gradient(90deg, transparent, #000 28px, #000
  calc(100% - 28px), transparent); }` and from `48rem` `height: 33.5rem` with the fade `min(9vw, 120px)`; `.wm-topic-words` = flex, wrap,
  `align-content: center`, `flex: 1`, gap `0.4em`, margin `0.9em 0 0.6em`; `.wm-topic-words > li` = `font: 600 1em/1 var(--font-wm-display)`,
  padding `0.45em 0.65em`, radius `0.6em`, and the rise `animation: wm-rise var(--transition-duration-wm-rise) var(--ease-wm-rise) both;
  animation-delay: calc(220ms + var(--i) * 70ms)`; under `prefers-reduced-motion: reduce` no animation.
  The face keeps the app's height (`23em`); the `.gcar-slot` transition is the app's (660 ms carousel curve).

**Behaviour:**
- State `centre` (starts 0) and `manual` (starts false). `go(i)` wraps with `((i % 5) + 5) % 5`.
- Viewport width from `document.documentElement.clientWidth`, read on mount and on `resize`; before mount (server) use 1440.
- Auto-advance every `AUTO_MS` while all hold: `motionAllowed()`, the root is in view (`whileInView`), `!document.hidden`, no mouse
  pointer over the root (`pointerenter`/`pointerleave` with `pointerType === 'mouse'`), focus not inside (`focusin`/`focusout`), `!manual`.
- Prev/next buttons, a click on a side slot (`|k| ≤ 2`, by `data-k` of the slot under the pointer, as `GroupCarousel.onTrackClick`), and a
  horizontal swipe over 40 px set `manual = true` and step.

- [ ] **Step 1: Write the failing tests** (jsdom; `vi.useFakeTimers()`; add class `js` to `<html>`; stub `matchMedia` to report no reduced
  motion; stub `IntersectionObserver` with a class that calls its callback with `[{ isIntersecting: true, intersectionRatio: 1 }]` on
  `observe`, as `motion.test.tsx` stubs it; restore all in `afterEach`). In this step add to `Landing.groups` of **both** message files
  the new keys of Task 8 (`label`, `kind`, `words`, `more`, `start`, `prev`, `next`, `topics`, with the EN values listed there) and leave
  `title`, `lead` and `cards` as they are, so the current section and `copy.test.ts` keep passing until Task 8.

```ts
it('starts on Travel with its five words, the rest count and the first word', () => {
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  for (const w of ['destination', 'accommodation', 'departure', 'baggage', 'customs']) expect(screen.getByText(w)).toBeInTheDocument();
  expect(screen.getByText('+124 từ')).toBeInTheDocument();
  expect(screen.getByText('Chủ đề có sẵn · B1')).toBeInTheDocument();
  expect(screen.queryByText('ingredient')).toBeNull();
});
it('moves to the next deck after 3500 ms', () => {
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  act(() => vi.advanceTimersByTime(AUTO_MS));
  expect(screen.getByText('ingredient')).toBeInTheDocument();
  expect(screen.queryByText('destination')).toBeNull();
});
it('stops advancing for good once the visitor steps by hand', async () => {
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  fireEvent.click(screen.getByRole('button', { name: 'Nhóm sau' }));
  expect(screen.getByText('ingredient')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(AUTO_MS * 3));
  expect(screen.getByText('ingredient')).toBeInTheDocument();
});
it('waits while focus is inside and while the mouse is over it', () => {
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  const region = screen.getByRole('region', { name: 'Các nhóm chủ đề mẫu' });
  fireEvent.focusIn(screen.getByRole('button', { name: 'Nhóm trước' }));
  act(() => vi.advanceTimersByTime(AUTO_MS * 2));
  expect(screen.getByText('destination')).toBeInTheDocument();
  fireEvent.focusOut(screen.getByRole('button', { name: 'Nhóm trước' }));
  fireEvent.pointerEnter(region, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(AUTO_MS * 2));
  expect(screen.getByText('destination')).toBeInTheDocument();
  fireEvent.pointerLeave(region, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(AUTO_MS));
  expect(screen.getByText('ingredient')).toBeInTheDocument();
});
it('does not advance with reduced motion', () => {
  stubReducedMotion(true); // matchMedia('(prefers-reduced-motion: reduce)').matches === true
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  act(() => vi.advanceTimersByTime(AUTO_MS * 3));
  expect(screen.getByText('destination')).toBeInTheDocument();
});
it('does not advance while the tab is hidden', () => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  act(() => vi.advanceTimersByTime(AUTO_MS * 3));
  expect(screen.getByText('destination')).toBeInTheDocument();
});
it('re-spaces the stacks when the window is resized', () => {
  setClientWidth(1440); // Object.defineProperty(document.documentElement, 'clientWidth', { value, configurable: true })
  render(<TopicCarousel copy={vi_.Landing.groups} />);
  const slot = () => screen.getByText('Work & Jobs').closest<HTMLElement>('[style]')!;
  expect(slot().style.getPropertyValue('--x')).toBe(String(topicSlot(2, 1440).x));
  setClientWidth(1024);
  fireEvent(window, new Event('resize'));
  expect(slot().style.getPropertyValue('--x')).toBe(String(topicSlot(2, 1024).x));
});
```

  `stubReducedMotion` and `setClientWidth` are small helpers in the test file. Reading `--x` is the only way to see the spacing; it is a
  geometry check, not a markup check.
- [ ] **Step 2:** `pnpm test src/site/landing/TopicCarousel.test.tsx` → FAIL (component missing).
- [ ] **Step 3:** Implement the component and the CSS as decided above.
- [ ] **Step 4:** `pnpm test src/site/landing/TopicCarousel.test.tsx` → PASS; `pnpm lint && pnpm typecheck` → clean.
- [ ] **Step 5: Commit** `feat(web): add the auto-advancing topic deck carousel`

### Task 8: Swap the groups section and close out

**Files:**
- Modify: `apps/web/src/site/landing/GroupsSection.tsx` (keep `section#nhom-tu`, the two `Glow`s and `SectionHead`; replace the grid and
  `FlyIn` with `<TopicCarousel copy={copy} />`; keep `overflow-x-clip` on the section)
- Delete: `apps/web/src/site/interactive/FlyIn.tsx`; CSS `[data-wm-fly]` and `[data-group-card]` rules in `globals.css` (~lines 1161, 1253, 1256)
- Modify: both message files — `Landing.groups` becomes:

```json
"groups": {
  "title": "Học theo nhóm chủ đề",
  "lead": "Chọn chủ đề và trình độ, Wordmet tạo sẵn nhóm từ. Mỗi từ có lịch ôn riêng.",
  "label": "Các nhóm chủ đề mẫu",
  "kind": "Chủ đề có sẵn",
  "words": "{count} từ",
  "more": "+{count} từ",
  "start": "Bắt đầu với",
  "prev": "Nhóm trước",
  "next": "Nhóm sau",
  "topics": [
    { "name": "Travel", "level": "B1", "total": 129, "words": ["destination", "accommodation", "departure", "baggage", "customs"] },
    { "name": "Food & Drink", "level": "B1", "total": 73, "words": ["ingredient", "flavour", "appetite", "nutrition", "feast"] },
    { "name": "Work & Jobs", "level": "B1–B2", "total": 179, "words": ["colleague", "career", "agenda", "client", "contract"] },
    { "name": "Body & Health", "level": "B1", "total": 63, "words": ["injury", "infection", "muscle", "pharmacy", "clinic"] },
    { "name": "Education", "level": "B1", "total": 157, "words": ["assignment", "curriculum", "deadline", "admission", "certificate"] }
  ]
}
```

  EN: `title` "Learn with topic decks", `lead` "Pick a topic and a level, and Wordmet builds the deck. Each word has its own review schedule.",
  `label` "Sample topic decks", `kind` "Ready-made topic", `words` "{count} words", `more` "+{count} words", `start` "Start with",
  `prev` "Previous deck", `next` "Next deck", `topics` identical to vi.
- Test: `landing.test.tsx`, `copy.test.ts`, `docs/deliveries/landing-feedback.md` (as-built)

- [ ] **Step 1: Change the tests.** `landing.test.tsx`: in the headings test `'H2 Tạo nhóm từ cho mỗi bài đọc'` → `'H2 Học theo nhóm chủ đề'`;
  in the anchors test the `nhom-tu` region name likewise; in QM8-6 replace `'Mỗi từ có lịch ôn riêng, đến hạn là Wordmet nhắc.'` with the new
  lead; add:

```ts
it('the groups section shows five ready-made topic decks by their app names, the first in the centre, no waiting count', () => {
  renderHome();
  const groups = within(screen.getByRole('region', { name: 'Học theo nhóm chủ đề' }));
  for (const name of ['Travel', 'Food & Drink', 'Work & Jobs', 'Body & Health', 'Education']) expect(groups.getByText(name)).toBeInTheDocument();
  expect(groups.getByText('destination')).toBeInTheDocument();
  expect(groups.queryByText(/thẻ chờ/)).toBeNull();
  expect(groups.queryByText('fluctuate')).toBeNull();
});
```

  `copy.test.ts`: the gloss count becomes `toHaveLength(6)` with the comment "6 glosses: 5 in the hero cycle, 1 in the note demo"; keep
  `expect(en.Landing.groups.title).toContain('deck')`.
- [ ] **Step 2:** `pnpm test src/site/landing` → FAIL.
- [ ] **Step 3:** Swap `GroupsSection`, delete `FlyIn` and its CSS, set the new `title` and `lead` in both locales and remove `groups.cards`.
- [ ] **Step 4:** `pnpm test` (whole web suite) → PASS; `pnpm lint && pnpm typecheck` → clean.
- [ ] **Step 5: Run the Worker build and e2e** (Docker Desktop running; `docker info` first): `pnpm cf:docker` → all Playwright specs pass,
  including `e2e/landing.spec.ts` and `e2e/a11y.spec.ts` (axe on `/vi` and `/en`). Fix failures in the task that owns the code.
- [ ] **Step 6: Look at it.** `pnpm cf:docker --dev` (http://localhost:3000/vi), compare with the mock-up at 1440, 1280, 1024 and 390 px, light
  and dark: hero title one colour; no strip; 5 stacks visible at 1440 and 1280, outer two fading at 1024; words rise on the centre deck and it
  advances every 3,5 s; practice demo badge, tally line, question size, green fill; the four steps in order. Also open a practice session in the
  learner app (`pnpm cf:docker --dev-app`, http://localhost:3001) and answer one multiple-choice question: the numbers on the right and wrong
  rows have a white background. Save screenshots in `docs/deliveries/landing-feedback-shots/`.
- [ ] **Step 7:** Append `# Landing feedback — as-built (<date>)` to `docs/deliveries/landing-feedback.md`: what shipped, test counts, e2e result,
  what was only checked by eye, anything not done.
- [ ] **Step 8: Commit** `feat(web): show topic decks in the landing groups section` (code) and `docs(web): record landing feedback as-built` (docs).
- [ ] **Step 9:** Open the PR into `dev` with the `ship-pr` skill.
