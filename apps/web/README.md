# apps/web — Wordmet landing page

Next.js 16 (App Router) landing page in Vietnamese and English. Design and decisions:
`docs/superpowers/specs/2026-10-08-landing-page-design.md`, plan: `docs/superpowers/plans/2026-10-08-landing-page.md`.

## Run

From the repo root: `pnpm install`. Then from `apps/web`:

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on http://localhost:3000 (`/` redirects to `/vi` or `/en`) |
| `pnpm build` / `pnpm start` | Next.js build and Node server |
| `pnpm lint` | ESLint plus `scripts/check-tailwind-raw.mjs` (no arbitrary Tailwind values or inline styles) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit and component tests |
| `pnpm test:e2e` | Playwright on the Worker (builds, migrates local D1 and starts on port 3100; desktop 1440 and mobile 390, with axe) |
| `pnpm assert:static` | After a build: fails unless `/vi` and `/en` are prerendered |

## Environment

| Variable | Default | Production | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://wordmet.com` | Absolute URLs in metadata, sitemap and JSON-LD |
| `NEXT_PUBLIC_INDEXABLE` | off | `true` | Set to `true` at launch; until then robots.txt disallows everything and pages are `noindex` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@wordmet.com` | `hello@wordmet.com` | Footer and privacy contact link |

`NEXT_PUBLIC_*` values are baked into the build. Changing them on the Cloudflare dashboard takes effect only after
the next build and deploy.

## Deploy (Cloudflare)

OpenNext builds the landing for Cloudflare Workers (`wordmet-web`); the waitlist uses D1 (`wordmet-waitlist`, binding
`DB`). Workers Builds deploys `main` from `apps/web`. Configuration and setup:
`docs/superpowers/specs/2026-10-08-landing-deploy-design.md`, `docs/superpowers/plans/2026-10-08-landing-deploy.md`.
Run these commands from `apps/web`:

| Command | What it does |
|---|---|
| `pnpm cf:build` | Build the Worker and assets with OpenNext |
| `pnpm cf:dev` | Run the built Worker with `wrangler dev --port 3100` |
| `pnpm deploy` | Build with OpenNext and deploy to Cloudflare |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from Wrangler bindings |
| `pnpm db:migrate:local` | Apply migrations to local D1 |
| `pnpm db:migrate:remote` | Apply migrations to production D1 |
| `pnpm cf:docker [Playwright args]` | Build the Worker, run Playwright e2e and check static pages in Linux |
| `pnpm gen:og-fonts` | Re-embed OG fonts as base64 in `src/app/[locale]/og-fonts.generated.ts` after changing font files |

Local D1 persists in `.wrangler/state`. Run `pnpm db:migrate:local` before `pnpm dev` or `pnpm cf:dev`.
Playwright's webServer runs `cf:build`, `db:migrate:local`, `scripts/e2e-cf.mjs` and `cf:dev`; the helper pins a
geolocation-free `request.cf` via `CLOUDFLARE_CF_FETCH_PATH`.

Run `pnpm db:migrate:remote` before the first deploy and before deploying a new migration. Workers Builds does not
apply migrations automatically. Set the Production environment values above before building.

View the waitlist (add `--json` to export):

```sh
pnpm exec wrangler d1 execute wordmet-waitlist --remote --command "SELECT * FROM waitlist ORDER BY created_at"
```

For an email deletion request, remove the address within 30 days and confirm with the requester. Replace the example
with the normalized email (trimmed, lowercase); escape any SQL single quote as two single quotes.
**`--remote` targets production**, including the deletion below:

```sh
pnpm exec wrangler d1 execute wordmet-waitlist --remote --command "DELETE FROM waitlist WHERE email = 'person@example.com'"
```

D1 Time Travel is always enabled and keeps 7 days of history on Free.

## Windows

OpenNext cannot build on plain Windows. Run Worker build, e2e and static checks with `pnpm cf:docker` (optional
Playwright arguments, for example `pnpm cf:docker --project=desktop`). It uses a `node:24.11.0-bookworm` Linux container
and copies Playwright reports to `.docker-out/`. WSL Ubuntu is planned later; `pnpm dev`, unit tests, lint and typecheck
still run on Windows.

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
