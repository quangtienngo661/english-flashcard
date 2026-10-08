# apps/web — Wordmet landing page

Next.js 16 (App Router) landing page in Vietnamese and English. Design and decisions:
`docs/superpowers/specs/2026-10-08-landing-page-design.md`, plan: `docs/superpowers/plans/2026-10-08-landing-page.md`.

## Run

From the repo root: `pnpm install`. Then from `apps/web`:

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on http://localhost:3000 (`/` redirects to `/vi` or `/en`) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint plus `scripts/check-tailwind-raw.mjs` (no arbitrary Tailwind values or inline styles) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit and component tests |
| `pnpm test:e2e` | Playwright (builds and starts the app on port 3100; desktop 1440 and mobile 390, with axe) |
| `pnpm assert:static` | After a build: fails unless `/vi` and `/en` are prerendered |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs in metadata, sitemap and JSON-LD |
| `NEXT_PUBLIC_INDEXABLE` | off | Set to `true` at launch; until then robots.txt disallows everything and pages are `noindex` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@wordmet.com` | Footer contact link (domain not bought yet) |

## Not production-ready yet

The waitlist form stores emails **in memory only** (`src/features/waitlist/memory-store.ts`); they are lost on restart.
Wire a real `WaitlistStore` (Resend) before any public deploy. Privacy and Terms pages are drafts (`noindex`).

## Windows: `ERR_SWC_NATIVE_CACHE` during build

`next-intl`'s plugin loads `@swc/core` 1.16, which refuses a cache directory that other accounts can write to. If the
build fails with that error, point it at a directory only you can write, for example:

```powershell
$env:SWC_NATIVE_BINDING_CACHE = "$env:USERPROFILE\.cache\swc-native"
```

## Structure

- `src/app/[locale]/page.tsx` only composes sections; components live in `src/components/{ui,layout,sections,interactive,seo}`.
- Client components (hooks only): `WaitlistForm`, `ClozeCarousel`, `Flashcard`, `Reveal`, `LanguageSwitch`.
- Copy: `messages/vi.json` and `messages/en.json` (line-break tags `<br>`, `<brMd>`, `<brSm>`).
- Tokens: `src/app/globals.css` (`@theme`, rem units, WCAG-checked colours in `src/styles/tokens.test.ts`).
