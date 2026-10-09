# Landing page Wordmet (`apps/web`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web`, a Next.js 16 landing page for Wordmet in Vietnamese and English that matches the Figma mockup, renders statically, and collects waitlist emails through a Server Action.

**Architecture:** `app/[locale]` pages are prerendered for `vi` and `en` with next-intl (root params). `page.tsx` only composes Server Component sections. Five client islands need hooks: `WaitlistForm`, `ClozeCarousel`, `Flashcard`, `Reveal` and `LanguageSwitch`. They receive translated strings as props, so no client i18n provider is needed. `proxy.ts` picks a locale for `/` only (cookie → country header → `Accept-Language` → `en`) and hands every other path to next-intl. Styling uses Tailwind 4 tokens declared in `@theme`; arbitrary values are blocked by a checker script.

**Tech Stack:** `next` 16.4.0, `react`/`react-dom` 19.3.0, `next-intl` 4.14.9, `tailwindcss` + `@tailwindcss/postcss` 4.3.3, `zod` 4.6.5, `clsx` 2.1.1, `tailwind-merge` 3.7.0, TypeScript 6.0.3, ESLint 10.12.0 + `eslint-config-next` 16.4.0, Vitest 4.1.11 + jsdom 30.1.2 + `@vitejs/plugin-react` 6.1.2 + Testing Library (`react` 16.3.3, `dom` 10.4.2, `jest-dom` 7.0.1, `user-event` 14.6.7), `@playwright/test` 1.64.0 + `@axe-core/playwright` 4.13.0.

**Spec:** [`docs/superpowers/specs/2026-10-08-landing-page-design.md`](../specs/2026-10-08-landing-page-design.md). Read §4–§8 (including §6.4 units) before any task. Decisions W1–W16, criteria `LP1–LP32`, edge cases `LPE1–LPE12`. Option trade-offs: [`../decisions/2026-10-08-landing-page-decisions.md`](../decisions/2026-10-08-landing-page-decisions.md). Every test name starts with the `LP#`/`LPE#` it proves and asserts every clause of that criterion's Then. Figma: https://www.figma.com/design/NVyO0njIAcOUTAl85a1Xdx (pages `2:25` VI desktop, `18:27` VI mobile, `20:51` EN desktop, `20:276` EN mobile; board `30:312` email states).

## Global Constraints

- Paths are under `apps/web/` unless they start with `docs/`, `.github/` or are repo-root files. Commands run from `apps/web/` in PowerShell (`pnpm --filter web <script>` from the root also works).
- Dependencies pinned exactly (no `^`) at the Tech Stack versions; `@types/react`/`@types/react-dom` 19.3.0, `@types/node` 24.19.1 (same major as Node 24.11 in CI). TypeScript and Vitest stay on the versions `apps/api` already uses (6.0.3, 4.1.11).
- **Load the `frontend-design:frontend-design` skill before Task 3** and follow it for every UI task. Where it conflicts with the spec or Figma, the spec wins.
- **Design plugin skills (W16):** `design:ux-copy` (Task 2), `design:design-system` (Task 3), `design:accessibility-review` and `design:design-critique` (Task 11). If a skill is not loaded in the session, read `C:\Users\Tien Ngo\.claude\plugins\cache\knowledge-work-plugins\design\1.2.0\skills\<name>\SKILL.md` and follow it. Report each skill's findings to the owner as options; do not change approved design or copy on your own.
- **Units (W15, spec §6.4):** tokens in rem (only border widths in px); `display`/`h2`/`cta` use the `clamp()` values from spec §6.1; Figma fixed widths become `max-w-*` tokens or fractions (`w-4/5`); no fixed heights (`min-h-*`, grid `subgrid` for equal cards); breakpoints `md` and `xl` only.
- **W6:** `page.tsx` files only import and arrange sections. No component is defined inside a page or layout file.
- **W7:** no Tailwind arbitrary values (`-[...]`) and no inline `style` in `src/**/*.tsx`, except a line marked `// raw-ok: <reason>` directly above it. Colors, type sizes, radii, shadows and durations come only from `@theme` tokens (Task 3).
- **W8:** a file gets `'use client'` only when it calls a React hook. Today that is exactly `WaitlistForm`, `ClozeCarousel` (and its `ClozeCard`), `Flashcard`, `Reveal` and `LanguageSwitch` (`usePathname`, to keep the current path when switching). Pages never read `cookies()` or `headers()`.
- Copy lives only in `messages/{vi,en}.json`, taken from Figma at Task 2 time. Headings have no trailing period. Line breaks use the rich tags `<br></br>`, `<brMd></brMd>`, `<brSm></brSm>` (spec §4.4).
- Locales `['vi', 'en']`, default `vi`, `localePrefix: 'always'`, locale cookie `NEXT_LOCALE` with `maxAge` 31 536 000.
- Env: `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`), `NEXT_PUBLIC_INDEXABLE` (`'true'` enables indexing; default off), `NEXT_PUBLIC_CONTACT_EMAIL` (default `hello@wordmet.com`, **ASSUMPTION**: domain not bought).
- Accessibility floor: every interactive target ≥ 44 px tall, visible `focus-visible` ring from the `primary` token, `prefers-reduced-motion: reduce` disables all transforms and transitions.
- Commits: Conventional Commits on `feat/landing-page` (branched from `main`), ending with the `Co-Authored-By` line from the session. Per the owner's global rules, **every commit is proposed and waits for approval**; never push.

## Review Focus

1. **Vietnamese diacritics rendered in the fallback font.** A missing `vietnamese` subset would show "ữ, ặ" in another font. Task 4 e2e asserts `document.fonts.check('16px "Be Vietnam Pro"', 'Học những từ bạn thật sự gặp')` and that the H1 computed `font-family` starts with the next/font family.
2. **A 320 px phone.** LP24 only checks 390. Task 9 e2e repeats the no-horizontal-scroll check at 320×640 for `/vi` and `/en`.
3. **Keyboard-only visitor.** Task 9 e2e tabs from the skip link through nav, carousel arrows, options, email, checkbox and submit. Each focused element has a non-`none` outline.
4. **Pasted or oversized emails.** `"  Foo@Example.COM "` is stored as `foo@example.com`; a 255-character address returns `invalid_email` (Task 8 unit tests).
5. **Longer English copy on mobile.** Task 9 e2e at 390 on `/en` asserts every carousel card and step card has `scrollWidth <= clientWidth`, so no text is clipped.

---

### Task 1: Scaffold `apps/web` with next-intl routing and a static skeleton

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `next-env.d.ts` (generated), `.gitignore`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/global.d.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/globals.css`, `messages/vi.json`, `messages/en.json`, `scripts/assert-static.mjs`
- Modify: `pnpm-workspace.yaml` (`allowBuilds`)
- Test: `src/i18n/messages.test.ts`

**Interfaces:**
- Produces: `routing` (`defineRouting({ locales: ['vi','en'], defaultLocale: 'vi', localePrefix: 'always', localeCookie: { name: 'NEXT_LOCALE', maxAge: 31536000 } })`), `type AppLocale = 'vi' | 'en'`, `Link`, `redirect`, `usePathname`, `getPathname` from `createNavigation(routing)`; `AppConfig` augmentation with `Locale` and `Messages: typeof en`. Scripts: `dev`, `build`, `start`, `lint` (`eslint . && node scripts/check-tailwind-raw.mjs` from Task 3; until then `eslint .`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `assert:static`.

- [ ] **Step 1:** Create `package.json` (`"name": "web"`, `"private": true`, `"type": "module"`) with the pinned dependencies, then `pnpm install` from the repo root. pnpm 11 reports blocked build scripts as `ERR_PNPM_IGNORED_BUILDS`. Add each listed package to `allowBuilds` in `pnpm-workspace.yaml` with a one-line comment: `true` only for packages needed at build or test time (e.g. `sharp` if Next lists it, `unrs-resolver` for ESLint), `false` otherwise. Re-run until install is clean.
- [ ] **Step 2:** Write `next.config.ts` (`createNextIntlPlugin('./src/i18n/request.ts')`, `reactStrictMode: true`, `poweredByHeader: false`). Write `src/i18n/request.ts` exactly as the next-intl 4.14 docs pattern with `next/root-params` (`rootParams.locale()`, `hasLocale`, `notFound()`), loading `messages/${locale}.json`. Write `layout.tsx` with `generateStaticParams` returning both locales and `<html lang={locale}>`. Write `page.tsx` rendering `Hero.title` through `getTranslations`. Seed both message files with `{"Hero": {"title": "…"}}` (the Figma H1).
- [ ] **Step 3: Write the failing test `LP3 vi and en messages have identical keys and no empty values`.** Flatten both JSON files to dotted keys; assert the key sets are equal (report the difference) and no value is `""`.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS (seeded keys match). Temporarily delete one key in `vi.json` and confirm it FAILS with the key named, then restore.
- [ ] **Step 5:** Write `scripts/assert-static.mjs`: read `.next/prerender-manifest.json` and exit 1 unless `routes` contains `/vi` and `/en`. If Next 16.4 stores this elsewhere, read the build output instead and record the source in a comment (**ASSUMPTION**, verify here).
- [ ] **Step 6:** Run `pnpm build; pnpm assert:static`. Expected: build passes with no type or lint errors (`LP1`), assert passes (`LP2`).
- [ ] **Step 7:** Propose commit `build(web): scaffold next.js app with next-intl routing` (with the four docs files as a preceding `docs(web): add landing page context, design, decisions and plan` commit). Wait for approval.

### Task 2: Messages from Figma

**Files:**
- Modify: `messages/vi.json`, `messages/en.json`
- Test: `src/i18n/messages.test.ts` (extend)

**Interfaces:**
- Produces: the namespaces every later task reads. Keys are fixed here:
  - `Metadata{title,description,ogAlt}`
  - `Nav{howItWorks,faq,cta,skipToContent,languageLabel}`
  - `Hero{chip,title,description,note}`
  - `Cloze{header,sourceChip,instruction,prev,next,correctTitle,wrongTitle,nextSentence,doneTitle,doneBody,doneCta,replay,region}`
  - `Cloze.items.{deploy,assume,borrow}{before,answer,after,options{o1..o4},hint,explanation,translation}`
  - `Problem{eyebrow,title,description,before{label,word,hint,meaning,caption},after{label,caption,s1..s3{before,word,after}}}`
  - `Steps{eyebrow,title,step1{title,body,wordLabel,wordValue,sentenceLabel,sentenceValue,save},step2{title,body,sentenceBefore,sentenceAfter,chips{c1..c3}},step3{title,body,rows{r1..r3{word,status}}}}`
  - `Ai{eyebrow,title,description,benefits{b1..b3},chip,card{label,before,word,after,explanation,translation,report}}`
  - `Plans{eyebrow,title,description,free{name,chip,items{i1..i4}},trial{name,chip,items{i1..i4}}}`
  - `Faq{eyebrow,title,items{q1..q4{question,answer}}}`
  - `FinalCta{title}`
  - `Waitlist{emailLabel,emailPlaceholder,submit,submitting,consent,invalidEmail,missingConsent,error,success}`
  - `Footer{privacy,terms,contact,switchLanguage,copyright}`
  - `Legal{privacyTitle,termsTitle,draftNotice}`
  - `NotFound{title,body,home}`

  `Cloze.header` uses ICU `{current}`/`{total}`; `Footer.copyright` uses `{year}`; `Waitlist.consent` uses the rich tag `<link></link>`.

- [ ] **Step 1:** Read all text from the four Figma pages, the `Cloze demo / VI|EN` and `FAQ/Accordion` instances (Answer property) and board `30:312`. Use a read-only `use_figma` script (load the `figma-use` skill first). Fill both files with the current copy. Apply the break tags exactly where spec §4.4's table says.
- [ ] **Step 2:** Write the copy Figma lacks: `hint`, `explanation` and `translation` for `assume` and `borrow` in both languages (spec §5, owner reviews at review time), and the EN state messages for `Waitlist` (translate the VI board). Mark these keys in the task report so the owner can review them.
- [ ] **Step 2b:** Run `design:ux-copy` in review mode over the new keys from Step 2 and over every `Waitlist` and `Cloze` string (errors, CTAs, feedback), in both languages. Keep the Figma copy unless the owner accepts a suggestion; list the suggestions in the task report.
- [ ] **Step 3: Extend the test:** `LP3 every rich break tag is one of br, brMd, brSm and every tag is closed`, and `LP30 Faq.items has exactly q1..q4 in both locales`.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Propose commit `feat(web): add vi and en copy from the figma mockup`. Wait.

### Task 3: Design tokens, raw-value checker and UI primitives

**Files:**
- Create: `src/app/globals.css` (replace), `scripts/check-tailwind-raw.mjs`, `src/lib/cn.ts`, `src/lib/rich-breaks.tsx`, `src/components/ui/{Button,ButtonLink,Chip,Container,SectionHeading,VisuallyHidden,Icon}.tsx`
- Test: `src/styles/tokens.test.ts`, `scripts/check-tailwind-raw.test.ts`, `src/lib/rich-breaks.test.tsx`, `src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces:
  - Tokens (spec §6.1, all in rem except colors and durations), named:
    - `--color-{bg,surface,ink,muted,border,border-strong,primary,primary-soft,on-primary,marker,success,success-soft,success-strong,danger,danger-strong}`
    - `--text-{display,cta,h2,title-lg,h3,title,lead,subtitle,body-lg,body,label,small,caption}`, each with `--line-height` and `--letter-spacing` companions
    - `--radius-{sm,control,inner,panel,card,feature}`
    - `--shadow-{card,control}`
    - `--container-{content,cta,faq,heading,prose,carousel,aside,copy}`
    - `--duration-{fast,base,reveal,flip}`, `--ease-out`
    - `@theme inline { --font-sans: var(--font-be-vietnam-pro) }`
  - `findRawClasses(source: string): string[]` (exported for the test).
  - `cn(...inputs: ClassValue[]): string`.
  - `richBreaks: { br, brMd, brSm }`, tag renderers for `t.rich`.
  - `Button({ variant: 'primary' | 'secondary' | 'inverse', fullWidth?, ...button props })` and `ButtonLink` with the same variants on `<a>`.
  - `Chip({ children })`, `Container({ as?, children, className? })`.
  - `SectionHeading({ id?, eyebrow, title: ReactNode, description?: ReactNode, align: 'center' | 'start' })`, rendering `<h2>`.
  - `VisuallyHidden`, `Icon({ name: 'chevron-left' | 'chevron-right' | 'check' | 'flag' })` from inline SVG paths.

- [ ] **Step 1: Write the failing test `LP12 text and control colors meet WCAG contrast`.** Parse `--color-*` hex values from `globals.css`. Assert ≥ 4.5 for text pairs `ink/bg`, `muted/bg`, `muted/surface`, `primary/surface`, `on-primary/primary`, `primary/primary-soft`, `success-strong/success-soft`, `success-strong/bg`, `danger-strong/bg`, `danger-strong/surface`, `ink/marker`. Assert ≥ 3 for `border-strong/surface` and `on-primary/primary` (inverse checkbox border). Use the relative-luminance formula from WCAG 2.2.
- [ ] **Step 2:** Write `globals.css` with the Figma values (spec §6.1). Start `success-strong` at `#15803D`, `danger-strong` at `#B42318`, `border-strong` at `#8A8697`. Run the test: it FAILS on `success-strong/success-soft` (4.47). Darken `success-strong` in small steps until it passes and record the final hex in the spec §6.2 row.
- [ ] **Step 2b: Write the failing test `LP31 size tokens use rem and the clamp tokens hit the Figma sizes`.**
  - No `--text-*`, `--radius-*`, `--shadow-*` or `--container-*` value contains `px`.
  - Evaluating each `clamp(a, b + c vw, d)` at 16px root gives `display` 36/60, `cta` 28/44 and `h2` 28/40 at 390/1440 widths (±0.5).
  - Then add the tokens until it passes.
- [ ] **Step 2c:** Run `design:design-system` in audit mode on `globals.css` against the Figma variable collection `Landing tokens` (read-only `use_figma`). Report naming or value mismatches to the owner before Step 4.
- [ ] **Step 3: Write the failing tests for the checker:** `LP13 flags text-[#2F5BEA] and p-[13px]`, `LP13 ignores a line marked raw-ok`, `LP13 ignores md:hidden; flags data-[state=open]:x`. Then implement `findRawClasses` (scan string literals and template literals in `className`/`cn(...)` for `-[`), plus a CLI that walks `src/**/*.tsx`, prints `file:line class` and exits 1 on findings. Wire it into `lint`.
- [ ] **Step 4: Write the failing tests:** `richBreaks renders brMd as a br hidden below md and brSm as a br hidden from md`. `Button exposes variant styles and has min height 44 (min-h-11)`. `SectionHeading renders an h2 with the given id`. Implement the primitives; variants live in a `const variants = {...} satisfies Record<Variant, string>` map in each file.
- [ ] **Step 5:** Run `pnpm test; pnpm lint`. Expected: PASS, checker prints nothing.
- [ ] **Step 6:** Propose commit `feat(web): add design tokens, contrast test and ui primitives`. Wait.

### Task 4: Root layout, font and site chrome

**Files:**
- Create: `src/components/layout/{SiteHeader,LanguageSwitch,SiteFooter,SkipLink,Logo}.tsx`, `src/lib/site.ts`, `e2e/chrome.spec.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Test: `src/components/layout/language-switch.test.tsx`

**Interfaces:**
- Consumes: Task 1 `Link`, Task 2 `Nav`/`Footer`, Task 3 primitives.
- Produces: `site = { url: string; indexable: boolean; contactEmail: string }` from env. Layout renders `SkipLink`, `SiteHeader`, `<main id="main">{children}</main>`, `SiteFooter`. `Be_Vietnam_Pro({ weight: ['400','500','600','700','800'], subsets: ['latin','vietnamese'], display: 'swap', variable: '--font-be-vietnam-pro' })`.

- [ ] **Step 1: Write the failing test `LanguageSwitch marks the current locale with aria-current and links the other locale to the same path`.** Mock `usePathname` from `src/i18n/navigation`.
- [ ] **Step 2:** Implement the chrome per spec §5 Nav/Footer. Header and footer are Server Components. `LanguageSwitch` is `'use client'` (it needs `usePathname`) and renders next-intl `Link`s with `locale`; its labels come in as props. Desktop links show from `md`; mobile shows logo + switch only.
- [ ] **Step 3:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 4: Write e2e** `chrome.spec.ts`: `Review#1 H1 renders in Be Vietnam Pro with Vietnamese glyphs` (the Review Focus check). `skip link moves focus to main`. `footer contact is a mailto link`.
- [ ] **Step 5:** Run `pnpm test:e2e chrome`. Expected: PASS. Propose commit `feat(web): add layout, font, header and footer`. Wait.

### Task 5: Locale choice at `/` (proxy)

**Files:**
- Create: `src/i18n/pick-locale.ts`, `src/proxy.ts`, `src/app/[locale]/[...rest]/page.tsx`, `src/app/[locale]/not-found.tsx`, `e2e/locale.spec.ts`
- Test: `src/i18n/pick-locale.test.ts`

**Interfaces:**
- Produces:
  - `pickLocale(input: { cookie?: string | null; country?: string | null; acceptLanguage?: string | null }): AppLocale`.
  - `readCountry(headers: Headers): string | null`: `x-vercel-ip-country` first, then `cf-ipcountry`. Returns `null` for empty, `XX` or `T1`.
  - `proxy(request: NextRequest)`: on `/`, it redirects 307 to `/${pickLocale(...)}` with `Cache-Control: private, no-store` and `Vary: Cookie, Accept-Language`. Every other path goes to `createMiddleware(routing)`. Matcher is the next-intl default (`/((?!api|trpc|_next|_vercel|.*\\..*).*)`).

- [ ] **Step 1: Write the failing unit tests:**
  - `LP4 country VN without cookie → vi`
  - `LP5 cookie en beats country VN`
  - `LP6 Accept-Language vi-VN without country → vi`
  - `LP7 Accept-Language en-US without country → en`
  - `LPE1 country XX/T1/empty is ignored`
  - `LPE2 cookie fr is ignored`
  - `LPE3 x-vercel-ip-country wins over cf-ipcountry`
  - `no signals → en`
- [ ] **Step 2:** Implement `pickLocale` and `readCountry`. Parse `Accept-Language` by language range and q-value (no dependency). Match the primary subtag `vi`.
- [ ] **Step 3:** Run unit tests. Expected: PASS.
- [ ] **Step 4:** Implement `proxy.ts`. Add the catch-all page calling `notFound()` and a localized `not-found.tsx`.
- [ ] **Step 5: Write e2e** `locale.spec.ts` with `request.get(url, { headers, maxRedirects: 0 })`:
  - LP4–LP7 assert status 307, `location`, and the `cache-control` header.
  - `LP8 /vi with an English Accept-Language returns 200 Vietnamese`.
  - `LPE4 /vi/khong-ton-tai returns 404 with Vietnamese not-found copy`.
  - `LPE5 /fr ends on a 404 page`: follow redirects, then assert the final status 404 and record the redirect chain in the test report.
  - `LP9 clicking EN on /vi lands on /en, and a fresh request to / from that browser context redirects to /en` (uses the context's cookies).
- [ ] **Step 6:** Run `pnpm test:e2e locale`. Expected: PASS. Propose commit `feat(web): pick locale at the root by cookie, country and language`. Wait.

### Task 6: `Reveal` and `Flashcard`

**Files:**
- Create: `src/components/interactive/Reveal.tsx`, `src/components/interactive/Flashcard.tsx`, `src/lib/use-reduced-motion.ts`
- Test: `src/components/interactive/flashcard.test.tsx`, `src/components/interactive/reveal.test.tsx`

**Interfaces:**
- Produces:
  - `Reveal({ children, step?: 0 | 1 | 2, as?: 'div' | 'li' })`. It renders visible content in SSR HTML. After hydration it hides and reveals once per element via IntersectionObserver (`threshold` 0.15, `rootMargin` `0px 0px -10% 0px`). It does nothing when reduced motion is on.
  - `Flashcard({ word, meaning, hint })` renders one `<button aria-pressed>`; the faces use Tailwind 4's built-in 3D utilities (`perspective-*`, `transform-3d`, `rotate-y-180`, `backface-hidden`) and `duration-flip` from the tokens.

- [ ] **Step 1: Write the failing tests:**
  - `LP22 click and Enter flip the card and toggle aria-pressed`.
  - `LP26 with matchMedia reduce, Flashcard has no transition class and Reveal never hides content`.
  - `Reveal content is present before the observer fires`.
- [ ] **Step 2:** Implement both, then run the tests. Expected: PASS.
- [ ] **Step 3:** Propose commit `feat(web): add reveal-on-scroll and flip flashcard`. Wait.

### Task 7: `ClozeCarousel`

**Files:**
- Create: `src/components/interactive/cloze/{cloze-state.ts,ClozeCard.tsx,ClozeCarousel.tsx}`
- Test: `src/components/interactive/cloze/cloze-state.test.ts`, `src/components/interactive/cloze/cloze-carousel.test.tsx`

**Interfaces:**
- Consumes: Task 2 `Cloze`, Task 3 `Button`/`Icon`/`Chip`.
- Produces:
  - `type ClozeItem = { id: string; before: string; answer: string; after: string; options: [string, string, string, string]; hint: string; explanation: string; translation: string }`.
  - `type ClozeLabels` holds the `Cloze` strings, with `header` already formatted per index by the server: `headers: string[]`.
  - `clozeReducer(state: ClozeState, action: { type: 'pick'; word: string } | { type: 'next' } | { type: 'prev' } | { type: 'goTo'; index: number } | { type: 'restart' }): ClozeState`.
  - `ClozeState = { index: number; done: boolean; results: Array<{ status: 'unanswered' | 'wrong' | 'correct'; picked?: string }> }`.
  - `ClozeCarousel({ items: ClozeItem[]; labels: ClozeLabels; ctaHref: string })` with `'use client'`.

- [ ] **Step 1: Write the failing reducer tests:**
  - `LP20 wrong pick sets wrong with picked word, then the right pick sets correct`.
  - `picking after correct does nothing`.
  - `LP21 next from the last item sets done; restart resets everything to item 0 unanswered`.
  - `prev at 0 stays at 0`.
- [ ] **Step 2:** Implement `clozeReducer`. Run the tests. Expected: PASS.
- [ ] **Step 3: Write the failing component tests:**
  - `LP20 the live region announces the wrong title, then the correct title with explanation and translation`.
  - `LP21 ArrowRight/ArrowLeft on the focused region change the sentence; prev/next buttons have accessible names`.
  - `option buttons expose aria-pressed for the picked option and are disabled after correct`.
  - `LPE9 with matchMedia reduce, changing the sentence adds no transition classes`.
- [ ] **Step 4:** Implement `ClozeCard` and `ClozeCarousel` per spec §5. The track is a horizontal scroll-snap list; the active index syncs from scroll position (IntersectionObserver on cards) and from the buttons (`scrollIntoView({ inline: 'center' })`). Side cards use `scale-86 opacity-50`, active uses `scale-100` (Tailwind 4 numeric utilities, not arbitrary values; confirm `scale-86` compiles, **ASSUMPTION**). Height follows the active card (no fixed height). The Done view's CTA is a `ButtonLink` to `ctaHref`. Reduced motion removes scale transitions.
- [ ] **Step 5:** Run the tests. Expected: PASS. Propose commit `feat(web): add interactive cloze carousel`. Wait.

### Task 8: Waitlist (schema, store, action, form)

**Files:**
- Create: `src/features/waitlist/{schema.ts,store.ts,memory-store.ts,join.ts,actions.ts}`, `src/components/interactive/WaitlistForm.tsx`
- Test: `src/features/waitlist/join.test.ts`, `src/components/interactive/waitlist-form.test.tsx`

**Interfaces:**
- Produces:
  - `type WaitlistState = { status: 'idle' | 'invalid_email' | 'missing_consent' | 'success' | 'error'; email?: string }`.
  - `interface WaitlistStore { add(email: string, locale: AppLocale): Promise<'created' | 'exists'> }`, plus `createMemoryStore(): WaitlistStore & { list(): string[] }`.
  - `getWaitlistStore(): WaitlistStore` (module singleton). When `NODE_ENV === 'production'` it logs a warning once that only the memory store is configured (LPE12).
  - `handleJoin(store: WaitlistStore, prev: WaitlistState, form: FormData): Promise<WaitlistState>` in `join.ts`.
  - `joinWaitlist(prev, form)` in `actions.ts` (`'use server'`) is `handleJoin(getWaitlistStore(), prev, form)`.
  - `type WaitlistLabels = Record<'emailLabel' | 'emailPlaceholder' | 'submit' | 'submitting' | 'invalidEmail' | 'missingConsent' | 'error' | 'success', string> & { consent: ReactNode }` (`consent` rendered on the server with `t.rich` and its `<link>` tag).
  - `WaitlistForm({ idPrefix: 'hero' | 'cta'; tone: 'default' | 'inverse'; layout: 'inline' | 'stacked'; labels: WaitlistLabels; privacyHref: string })` with `'use client'`.

  Form fields: `email`, `consent` (`'on'`), `locale`, `company` (honeypot, visually hidden, `tabIndex={-1}`, `autoComplete="off"`).

- [ ] **Step 1: Write the failing tests for `handleJoin`** (memory store, plus a throwing store):
  - `LP14 invalid email → invalid_email, email echoed, nothing stored`.
  - `LP15 missing consent → missing_consent, nothing stored`.
  - `LP16 valid → success, store has the normalized email`.
  - `LP17 same email again → success, one record`.
  - `LP18 honeypot filled → success, nothing stored`.
  - `LP19 store throws → error, email echoed`.
  - `LPE7 "  Foo@Example.COM " stored as foo@example.com`.
  - `Review#4 255-character address → invalid_email`.
  - `LPE6 two concurrent identical submits leave one record`.
  - `LPE12 getWaitlistStore warns exactly once when NODE_ENV is production`.
- [ ] **Step 2:** Implement the schema (spec §8), store, `handleJoin` and the action. Run. Expected: PASS.
- [ ] **Step 3: Write the failing form tests:**
  - `LP14 invalid_email state sets aria-invalid and aria-describedby on the email input and keeps its value`.
  - `LP15 missing_consent marks the checkbox the same way`.
  - `LP16 success renders the success copy in role=status and hides the inputs`.
  - `submit is disabled with the submitting label while pending`.
  - `LPE8 two forms on one page have distinct input ids`.
- [ ] **Step 4:** Implement `WaitlistForm` with `useActionState(joinWaitlist, { status: 'idle' })` and the checkbox design from spec §8 (default and inverse tones). Run. Expected: PASS.
- [ ] **Step 5:** Propose commit `feat(web): add waitlist server action and form`. Wait.

### Task 9: Sections and page composition

**Files:**
- Create: `src/components/sections/{Hero,Problem,HowItWorks,AiPractice,Plans,Faq,FinalCta}.tsx`, `e2e/page.spec.ts`, `e2e/a11y.spec.ts`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–8. Each section is an async Server Component using `getTranslations(namespace)` and passing plain strings to client islands. `Hero` passes `ctaHref="#waitlist-hero"`; `Faq` has `id="faq"`, `HowItWorks` has `id="how-it-works"`.

- [ ] **Step 1:** Build each section to spec §5 at both breakpoints, comparing against the Figma frames while building (`get_screenshot` of the section node). `Faq` uses `<details name="faq">`, first item `open`, open item border `primary`; `+`/`−` comes from the `open` state via `group-open:` utilities. `HowItWorks` mobile is a scroll-snap row with `scroll-px-5` and a trailing spacer so the end gap equals the start gap. Wrap section content in `Reveal` per spec §5.
- [ ] **Step 2:** `page.tsx` renders the seven sections in order and nothing else.
- [ ] **Step 3: Write e2e** `page.spec.ts` (projects `desktop` 1440×900 and `mobile` 390×844):
  - `LP20/LP21` carousel by mouse and keyboard.
  - `LP28 correct state grows the carousel; no descendant is clipped`.
  - `LP22` flashcard.
  - `LP23 opening an FAQ item closes the open one` (skip if `'name' in HTMLDetailsElement.prototype` is false).
  - `LP24 scrollWidth ≤ 390`.
  - `Review#2 scrollWidth ≤ 320 at 320×640`.
  - `LP29 end gap of the steps row equals the start gap (20 px)`.
  - `LP30 FAQ has 4 items with the first open; both forms show the consent checkbox`.
  - `LP14–LP16 form flow in the browser`.
  - `LP26` with `reducedMotion: 'reduce'`, no element has a running animation (`document.getAnimations().length === 0` after scrolling).
  - `LP27` with `javaScriptEnabled: false`, the copy is present, FAQ toggles, and form submit returns the success copy.
  - `Review#3` keyboard path with visible focus.
  - `Review#5` no clipped text on `/en` at 390.
  - `LP32` sets `document.documentElement.style.fontSize = '125%'` via `addStyleTag` at 390 and 768. Body text computed size is 20px, `scrollWidth ≤ innerWidth`, and no card or text block has `scrollWidth > clientWidth`.
  - `steps equal height` at 1440: the three step cards' visual, number, title and body tops are aligned (±1px) via subgrid.
- [ ] **Step 4: Write** `a11y.spec.ts`: `LP25 axe has no serious or critical violations` for `/vi`, `/en` × both projects, after opening the carousel's correct state.
- [ ] **Step 5:** Run `pnpm test:e2e`. Expected: PASS. Propose commit `feat(web): compose landing sections`. Wait.

### Task 10: Metadata, SEO files and draft legal pages

**Files:**
- Create: `src/app/[locale]/opengraph-image.tsx`, `src/app/apple-icon.tsx`, `src/app/icon.svg`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/manifest.ts`, `src/components/seo/JsonLd.tsx`, `src/app/[locale]/privacy/page.tsx`, `src/app/[locale]/terms/page.tsx`, `src/components/sections/LegalDraft.tsx`, `assets/fonts/BeVietnamPro-{Regular,ExtraBold}.ttf`, `assets/fonts/OFL.txt`, `e2e/seo.spec.ts`
- Modify: `src/app/[locale]/layout.tsx` (`generateMetadata`, `viewport`)

**Interfaces:**
- Consumes: `site` (Task 4), `Metadata` and `Legal` messages.

- [ ] **Step 1:** Add the TTF files and `OFL.txt` from the `google/fonts` repository (`ofl/bevietnampro/`). Record the source URL in `assets/fonts/README.md`.
- [ ] **Step 2:** Implement metadata exactly per spec §7: `metadataBase`, title template `%s · Wordmet`, canonical, `alternates.languages` `{ vi: '/vi', en: '/en', 'x-default': '/' }`, `openGraph` (`vi_VN`/`en_US`), `twitter` (`summary_large_image`), `robots` from `site.indexable`, `formatDetection.telephone: false`, and `viewport.themeColor` from the `bg` token hex. Add JSON-LD `WebSite` + `SoftwareApplication` (escape `<` as `<`), the OG image (1200×630, alt from messages), robots, sitemap with alternates, manifest and icons. Legal pages render `LegalDraft` with `robots: { index: false }`.
- [ ] **Step 3: Write e2e** `seo.spec.ts`:
  - `LP10` parses `/vi` and `/en` HTML and asserts title, description, canonical, three hreflang links, `og:title|description|image|locale`, `twitter:card`, `html[lang]` and a JSON-LD that `JSON.parse`s with both `@type`s.
  - `LP11` without `NEXT_PUBLIC_INDEXABLE`: `robots.txt` disallows `/`, and pages carry `noindex`.
  - `sitemap lists /vi and /en with alternates`.
  - `opengraph-image returns image/png 1200x630`.
- [ ] **Step 4:** Run `pnpm build; pnpm test:e2e seo`. Expected: PASS. Propose commit `feat(web): add metadata, og images, sitemap and robots`. Wait.

### Task 11: CI job and end-to-end verification

**Files:**
- Modify: `.github/workflows/ci.yml` (new job `web`)
- Create: `README.md` (run, test, env), `e2e/visual.spec.ts`

- [ ] **Step 1:** Add the `web` job: same pnpm/Node setup as `api`, working directory `apps/web`, steps `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → `pnpm assert:static` → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`. The `api` job is unchanged.
- [ ] **Step 2:** Write `visual.spec.ts`. It saves full-page screenshots of `/vi` and `/en` at 1440 and 390 into `test-results/visual/` and has no assertions (evidence for the manual check).
- [ ] **Step 3:** Run every command in the CI job locally from a clean `.next`. Expected: all green. Compare the four screenshots with the Figma frames section by section and list any visible difference in the task report. Fix it, or record it as intended (spec §6.2 color changes, consent checkbox).
- [ ] **Step 4:** Run `design:accessibility-review` on the running `/vi` and `/en` (desktop and mobile), and `design:design-critique` on the four screenshots against the Figma frames. Add the `frontend-design` self-critique. Write all findings to `docs/superpowers/reviews/2026-10-08-landing-page-design-review.md` and report them to the owner as options. Do not change the approved design on your own.
- [ ] **Step 5:** Propose commit `ci(web): add web job` and the final summary. Wait. Pushing and opening a PR happen only when the owner asks.
