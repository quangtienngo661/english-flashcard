# Wordmet

An English vocabulary app for Vietnamese learners, organised by CEFR level (A1–C2) and topic. Learners save words into groups,
review them with flashcards on an automatic schedule (Leitner boxes), and practise with non-AI questions and AI-written questions
(graded by rules, never by the AI). The content team (`admin`, `editor`) writes, reviews and publishes words and grants plans in
the admin app.

> **Status:** in development, not deployed for real users. Only the landing page runs in production; the learner app
> (`/vi/app`, `/en/app`) stays blocked in production until the Deploy step. There is no real payment provider yet (a fake one
> only). Per-step status: [CLAUDE.md](CLAUDE.md) and [docs/deliveries/](docs/deliveries/).

## What's inside

| Folder | What it is | Stack |
|---|---|---|
| [apps/api](apps/api) | The `/v1` API and the background worker | NestJS, Prisma, PostgreSQL, BullMQ + Redis |
| [apps/web](apps/web) | Landing page and learner app (`/vi/app`, `/en/app`) | Next.js (App Router), next-intl, Cloudflare Workers |
| [apps/admin](apps/admin) | Admin app for `admin` / `editor` | Vite, React |
| [packages/design-tokens](packages/design-tokens) | Shared colours and font (design direction B) | Tailwind v4 `@theme` |

A mobile app (Flutter) will share the same API; it has not been started.

```
 apps/web (learners) ──┐
                       ├──► apps/api ──► PostgreSQL
 apps/admin (staff) ───┘        │
                                ├──► Redis ◄── worker (CSV import, publish, review reminder emails, AI eval)
                                ├──► SMTP (locally: Mailpit)
                                └──► OpenAI / Anthropic (through the `ai` module, with a fake provider)
```

## Prerequisites

- Node `24.11.0` (see [.node-version](.node-version)) and pnpm 11
- Docker Desktop running (Postgres, Redis and Mailpit run in containers)

## Quick start: the whole app in Docker

From the repo root:

```powershell
pnpm install
pnpm bootstrap         # creates .env if missing, builds the images, starts everything, waits until healthy
pnpm bootstrap seed    # sample content + one admin account + one learner on the Pro plan
```

The first `pnpm bootstrap` takes a few minutes (image build, then the API migrates and builds itself when its container starts).
Then open:

| URL | What it is |
|---|---|
| http://localhost:5173 | Admin app |
| http://localhost:3001/vi/app | Learner app |
| http://localhost:3000/v1/health | API `healthcheck` |
| http://localhost:8025 | Mailpit: every email the app sends (e.g. the 6-digit sign-up code) |

The `seed` test accounts are `admin.local@example.com` and `lan.local@example.com`; their fixed password is in
[apps/api/scripts/learner-test-setup.mjs](apps/api/scripts/learner-test-setup.mjs) (local use only). Other commands:
`pnpm bootstrap status`, `pnpm bootstrap logs api`, `pnpm bootstrap down`. Environment variables, port changes and how the script
picks its `.env` file: [docs/deliveries/docker-bootstrap.md](docs/deliveries/docker-bootstrap.md) (in Vietnamese).

AI: with `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` left empty, only fake models are available. To call a real provider, put the keys in
`.env`, then choose a model for each AI operation in the admin app (no operation has a model by default).

## Running each app on the host (for development)

Start only Postgres (port **5434**), Redis (**6380**) and Mailpit in Docker:

```powershell
pnpm install
docker compose up -d
```

**API + worker** (`apps/api`):

```powershell
Set-Location apps/api
Copy-Item .env.example .env
node scripts/gen-secret.mjs     # run once per secret and replace each placeholder in .env
pnpm db:setup                   # migrate + generate the Prisma client and TypedSQL
pnpm build
pnpm run:dev                    # API on :3000 and the worker together
```

Keep the `k1:` prefix in front of the JWT secret. `pnpm start` on its own only queues background jobs (CSV import, publish) and
nothing processes them: you need the worker too (`pnpm start:worker`, or `pnpm run:dev` as above). First admin: register through the
API, take the OTP from Mailpit, then run `pnpm admin:grant <email>`.

**Admin** (`apps/admin`): `pnpm dev`, served on http://localhost:5173 with `VITE_API_BASE_URL=http://localhost:3000`.

**Web** (`apps/web`): `pnpm dev` for the landing page. The learner app needs `NEXT_PUBLIC_LEARNER_APP=on`; on Windows use
`pnpm dev:app` (runs in a Linux container on port 3001). Details: [apps/web/README.md](apps/web/README.md).

## Tests

The default commands need no Docker and no running services. Run them inside each app:

| App | Commands | Notes |
|---|---|---|
| api | `pnpm lint`, `pnpm test` | Unit tests (Vitest). The API has no e2e suite. |
| web | `pnpm lint`, `pnpm typecheck`, `pnpm test` | `pnpm test:e2e` (Playwright) builds the Worker; on Windows use `pnpm cf:docker` |
| admin | `pnpm lint`, `pnpm typecheck`, `pnpm test` | `pnpm test:e2e` (mocked API), `pnpm test:e2e:real` (real API, Postgres, Redis, Mailpit) |

End-to-end checks on a fresh database: the `pnpm smoke:*` scripts in `apps/api` (they need the API and worker running; each script's
requirements are at the top of its file in `apps/api/scripts/` and in the matching file under `docs/deliveries/`).

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request: `api` (lint, typecheck, build, unit, schema
drift check), `web`, `admin` and `admin-e2e-real`.

## Documentation

Most project documents are written in Vietnamese.

| To learn | Read |
|---|---|
| Who the product is for and what it does | [PRODUCT.md](PRODUCT.md) |
| Current status and how work is done in this repo | [CLAUDE.md](CLAUDE.md) |
| Design and decisions of each step | [docs/superpowers/specs/](docs/superpowers/specs/), [docs/superpowers/decisions/](docs/superpowers/decisions/) |
| What was built and how to test it by hand | [docs/deliveries/](docs/deliveries/) |
| What must be done before launch | [docs/deliveries/deploy-checklist.md](docs/deliveries/deploy-checklist.md) |
| The original V1 specs (starting skeleton, no longer kept in sync) | [docs/specs/](docs/specs/) |

## Contributing

- Branches: `feat/*`, `fix/*`, `docs/*` from `dev`, with a PR into `dev`. Never open a PR straight into `main`; `dev` → `main` is the QA gate.
- Commits follow Conventional Commits: `type(scope): subject` (e.g. `feat(api): add the lookup endpoint`).
- New code starts only after the design doc and plan for that piece of work are approved.

## Third-party data

Verb and noun inflections come from AGID; copyright terms: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
