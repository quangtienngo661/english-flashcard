# Production deploy path (M1–M5, M7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the API and worker run on one VPS behind Caddy, deploy and roll back by SHA with one script each, back up Postgres to R2, build
the web Worker with the learner app on, email the owner when something breaks, and stop the plan cards from promising "no ads" while
ads are off.

**Architecture:** One `docker compose` project on the VPS (`deploy/compose.prod.yml`): Caddy terminates TLS for `api.wordmet.com` and
`admin-api.wordmet.com` and proxies both to one `api` container; `worker`, `postgres`, `redis` beside it; a `migrate` service runs once per
deploy. The API image is built once per SHA, with no database at build time (TypedSQL removed), and starts with `node dist/main.js`.
Shell scripts in `deploy/scripts/` drive deploy, rollback, backup and monitoring; cron runs them.

**Tech Stack:** Docker Compose, Caddy 2, Postgres 17, Redis 7.4, NestJS 11 + Prisma 7.10.1, bash, `jq`, `curl`, Resend HTTP API, AWS CLI
image for R2, GitHub Actions.

**Spec:** `docs/deliveries/deploy-production-runbook.md` on local branch `docs/deploy-checklist-pre-launch` (sections 1, 2, 5, 6, 7).
Decisions approved 13/11/2026: Q5 one VPS (4 CPU, 8 GB), Q6 DNS straight to the VPS (grey cloud), Q9 replace TypedSQL and build a
multi-stage image, Q10 deploy and roll back with scripts run by hand on the VPS (image built on the VPS), Q14 `WEB_DEPLOY_PAUSED`.
Owner 13/11/2026 (after the sync): no AdSense at launch, and every mention of ads leaves the landing pricing and the learner plans page
for now (Task 8).

## Global Constraints

- Branch `feat/prod-deploy` from `origin/dev` (rebased 13/11/2026 onto `2d858021`, after the new UI landed in PR #271); one PR into `dev`.
- Node `24.11.0`, pnpm `11.6.0`, Prisma `7.10.1` (as pinned in the repo). Add no npm dependency.
- Every image tag in `deploy/` is an exact version (`postgres:17`, `redis:7.4-alpine` as in `docker-compose.yml`; Caddy and helper images
  pinned to an exact tag checked on Docker Hub when the task is done).
- Secrets live only in `/srv/wordmet/.env` (API and worker) and `/srv/wordmet/ops.env` (scripts) on the VPS. Never in the repo, never in
  chat. The repo holds `deploy/env.production.example` and `deploy/ops.env.example` with names and placeholders only.
- `rollback.sh` never runs a migration. Migrations stay add-only (expand/contract).
- Production API env: `BILLING_PRODUCTION=true`, `TURNSTILE_MODE=real`, `TRUST_PROXY=uniquelocal`, no `*_FAKE_ENABLED`, Google sign-in,
  TTS and audio storage unset (Q4 proposal), `MAINTENANCE_ENABLED=false` on `api`, `true` on `worker`.
- Commits: Conventional Commits, scopes `api`, `deploy`, `ci`, `web`, `docs`.

## Review Focus

1. Parameter types in the two rewritten raw queries: an untyped parameter in `$1 || ':'` can make Postgres refuse to choose an operator.
   Every parameter gets an explicit cast; Task 1 runs both queries against a real Postgres, not only mocks.
2. A hung database or Redis must not hang `/v1/health/ready`: each check has a 2 s limit and the endpoint answers 503 within about 2 s
   (Task 3 test with fake timers).
3. `deploy.sh` when the new API never becomes ready: it puts the previous tag back and exits non-zero, and does not record the new tag as
   current (Task 5, checked in the local rehearsal by deploying an image whose `DATABASE_URL` is wrong).
4. The first deploy, when there is no previous tag: a failed readiness wait leaves the new containers up, prints that there is nothing to
   go back to, and exits non-zero (Task 5).
5. An alert that keeps firing must send at most one email per type per hour, and a missing `ops.env` key must stop the script with a clear
   message instead of sending nothing silently (Task 7).

---

### Task 1: Replace TypedSQL with `$queryRaw` (M1, part 1)

**Files:**
- Modify: `apps/api/src/common/idempotency/idempotency.service.ts:2,36`
- Modify: `apps/api/src/identity/auth/otp.service.ts:12,146`
- Modify (tests): `apps/api/src/common/idempotency/idempotency.service.spec.ts`, `apps/api/src/identity/auth/otp.service.spec.ts`,
  `apps/api/src/identity/auth/otp.controller.spec.ts`, `apps/api/src/ai/api/admin-ai-configs.controller.spec.ts`,
  `apps/api/src/ai/api/admin-ai-eval.controller.spec.ts`
- Delete: `apps/api/prisma/sql/recordOtpFailure.sql`, `apps/api/prisma/sql/tryAdvisoryLock.sql`
- Modify: `apps/api/prisma/schema.prisma:4` (drop `previewFeatures = ["typedSql"]`), `apps/api/package.json` (`db:setup`),
  `apps/api/prisma.config.ts:1` (comment), `apps/api/test/setup/postgres-global-setup.ts:22`, `.github/workflows/ci.yml:21,50`,
  `README.md:83`, `CLAUDE.md` (the `db:setup` paragraph under "Local setup")

**Interfaces:**
- Produces: `db:setup` = `prisma migrate deploy && prisma generate`. `prisma generate` needs no live database (Task 2 relies on this).

- [ ] **Step 1: Change the specs to the new call.** Every `$queryRawTyped` mock becomes `$queryRaw` with the same resolved rows
  (`[{ locked: true }]`, `[{ failures: 1, locked_until: null }]`). Remove the `vi.mock('../../generated/prisma/sql.js', …)` lines. The
  assertion at `otp.service.spec.ts:236` becomes:

```ts
const sql = tx.$queryRaw.mock.calls[0][0] as Prisma.Sql;
expect(sql.values[0]).toBe(userId);
expect(sql.values[1]).toBe('verify_email');
expect(sql.values.slice(2).every((v) => v === clock.now())).toBe(true);
```

- [ ] **Step 2: Run the specs, see them fail.** `cd apps/api && pnpm exec vitest run src/common/idempotency src/identity/auth src/ai/api`
  Expected: FAIL (`tx.$queryRaw` never called / `$queryRawTyped` is not a function).
- [ ] **Step 3: Rewrite the two calls.** Keep the SQL text of the deleted `.sql` files and replace `$1…$3` with `Prisma.sql` template
  values, each cast: `${key}::text`, `${userId}::text`, `${endpoint}::text` in the advisory lock; `${userId}::uuid`, `${purpose}::text`,
  `${now}::timestamptz` in the OTP upsert. Result types written by hand:
  `tx.$queryRaw<Array<{ locked: boolean }>>(…)` and `tx.$queryRaw<Array<{ failures: number; locked_until: Date | null }>>(…)`.
- [ ] **Step 4: Remove TypedSQL.** Delete `prisma/sql/`, drop the preview feature, set `db:setup` to `prisma migrate deploy && prisma generate`,
  drop `--sql` in `postgres-global-setup.ts`, update the CI step name and comment, the `prisma.config.ts` comment, `README.md:83` and the
  CLAUDE.md paragraph (it says `db:setup` runs `prisma generate --sql` and warns that a second plain `generate` wipes TypedSQL: both lines go).
- [ ] **Step 5: Run unit tests, typecheck, lint.** `pnpm exec prisma generate && pnpm test && pnpm exec tsc --noEmit && pnpm lint`
  Expected: all pass; `grep -rn "queryRawTyped\|generated/prisma/sql" src test` prints nothing.
- [ ] **Step 6: Check `generate` needs no database.** `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x pnpm exec prisma generate` Expected: exit 0.
- [ ] **Step 7: Run both queries against real Postgres.** Local stack up (`docker compose up -d` at the repo root), fresh database
  `english_learning_prod_deploy`, `pnpm db:setup && pnpm build && pnpm run:dev` with `TURNSTILE_MODE=fake`, `BILLING_PRODUCTION=false`, then
  `pnpm smoke:buoc-8` (it sends `Idempotency-Key`, so it runs the advisory lock). Then register one account by `curl`, request an email OTP,
  send one wrong code, and read `select failures from otp_failure_windows` with `docker compose exec postgres psql`. Expected: smoke passes;
  `failures` = 1.
- [ ] **Step 8: Commit** `refactor(api): replace typedsql queries with raw queries`

### Task 2: Production API image (M1, part 2)

**Files:**
- Modify: `Dockerfile` (add stages `api-build`, `api-prod-deps`, `api-prod`; update the header comment; the `api` target used by
  `pnpm bootstrap` stays and only loses the TypedSQL wording)

**Interfaces:**
- Consumes: Task 1 (`prisma generate` without a database).
- Produces: `docker build --target api-prod -t wordmet-api:<sha> .` (runs `node dist/main.js`; the worker overrides the command with
  `node dist/worker.js`); `docker build --target api-build -t wordmet-api-migrate:<sha> .` (has the Prisma CLI; runs
  `pnpm exec prisma migrate deploy`). Both images: working directory `/app/apps/api`.

- [ ] **Step 1: Add the stages.**
  - `api-build` from `api-deps`: copy `apps/api`, set a placeholder `ENV DATABASE_URL=postgresql://build:build@127.0.0.1:1/build` (only so
    `prisma.config.ts` can read it), run `pnpm exec prisma generate && pnpm build`.
  - `api-prod-deps` from `manifests`: `pnpm install --frozen-lockfile --prod --filter "api..."` with the same pnpm store cache mount.
  - `api-prod` from `node:${NODE_VERSION}-bookworm-slim` with `openssl ca-certificates`: copy `/app/node_modules` and
    `/app/apps/api/node_modules` from `api-prod-deps`, `/app/apps/api/dist` and `/app/apps/api/package.json` from `api-build`;
    `ENV NODE_ENV=production`; `USER node`; `CMD ["node", "dist/main.js"]`. No `ENV DATABASE_URL` in this stage.
- [ ] **Step 2: Build with no database running.** `docker compose stop postgres` then both `docker build` commands above with tag `local`.
  Expected: both succeed.
- [ ] **Step 3: Check the image.**
  - `docker run --rm wordmet-api:local whoami` prints `node`.
  - `docker run --rm wordmet-api:local ls dist/content/inflections` lists the JSON asset.
  - `docker image ls wordmet-api:local` shows the size; write it in the PR.
- [ ] **Step 4: Run it against the local stack.** `docker compose start postgres`, then
  `docker run --rm --network english-learning_default --env-file <local env> -e DATABASE_URL=postgresql://dev:dev@postgres:5432/english_learning_prod_deploy -e REDIS_URL=redis://redis:6379 -p 3005:3000 wordmet-api:local`.
  Then `curl -s localhost:3005/v1/health` returns `{"status":"ok"}`. `docker stop` that container: its log shows Nest shutdown hooks ran, not
  a kill after 10 s.
- [ ] **Step 5: Commit** `build(api): add production api image built without a database`

### Task 3: `GET /v1/health/ready` (M2)

**Files:**
- Create: `apps/api/src/health/readiness.service.ts`, `apps/api/src/health/readiness.service.spec.ts`,
  `apps/api/src/health/health.controller.spec.ts`
- Modify: `apps/api/src/health/health.controller.ts`, `apps/api/src/app.module.ts:25-26` (provider)

**Interfaces:**
- Produces:
  - `READINESS_REDIS` (injection token, a `Pick<Redis, 'ping' | 'quit'>` built from `config.redisUrl` with `lazyConnect: true`,
    `connectTimeout: 2000`, `commandTimeout: 2000`, `maxRetriesPerRequest: 1`).
  - `ReadinessService.check(): Promise<{ database: 'ok' | 'fail'; redis: 'ok' | 'fail' }>`: `SELECT 1` through `PRISMA_CLIENT` and Redis
    `PING`, each raced against a 2 000 ms timer.
  - `GET /v1/health/ready`, `@Public()`. All ok → 200 `{ status: 'ok', checks }`. Else → 503 `{ status: 'unavailable', checks }`, the plain
    JSON body (not Problem Details), so `curl -f` and the compose healthcheck read it the same way. `GET /v1/health` is unchanged.

- [ ] **Step 1: Write the failing tests.**
  - `readiness.service.spec.ts`: both ok → `{ database: 'ok', redis: 'ok' }`; `$queryRaw` rejects → `database: 'fail'`; `ping` rejects →
    `redis: 'fail'`; `$queryRaw` never settles, advance fake timers 2 000 ms → `database: 'fail'`, and the promise settles.
  - `health.controller.spec.ts`: service ok → status 200 and body `{ status: 'ok', checks: { database: 'ok', redis: 'ok' } }`; one check fail
    → status 503 and `status: 'unavailable'`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/health`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the service, the token's provider in `AppModule` (`OnModuleDestroy` quits the Redis client), and the route.
  The route sets the status with `@Res({ passthrough: true })`.
- [ ] **Step 4: Run** `pnpm exec vitest run src/health && pnpm test`. Expected: PASS.
- [ ] **Step 5: Check on the local stack.**
  - `curl -i localhost:3000/v1/health/ready` returns 200.
  - `docker compose stop redis`: the same call returns 503 with `"redis":"fail"` in about 2 s.
  - `docker compose start redis`: it returns 200 again.
- [ ] **Step 6: Commit** `feat(api): add a readiness endpoint that checks postgres and redis`

### Task 4: Compose file, Caddy and production env template (M3)

**Files:**
- Create: `deploy/compose.prod.yml`, `deploy/Caddyfile`, `deploy/env.production.example`, `deploy/ops.env.example`

**Interfaces:**
- Consumes: Task 2 images, Task 3 route.
- Produces:
  - Compose project name `wordmet`. Services `caddy`, `api`, `worker`, `migrate` (profile `migrate`), `postgres`, `redis`.
  - Variables read from the shell: `API_TAG`, `HTTP_PORT` (default 80), `HTTPS_PORT` (default 443), `CADDY_SITES` (default
    `api.wordmet.com, admin-api.wordmet.com`), `CADDY_LOG_DIR` (default `/var/log/caddy`).
  - The API env file is `${WORDMET_HOME:-/srv/wordmet}/.env`.

- [ ] **Step 1: Write `compose.prod.yml`.**
  - `api`:
    - image `wordmet-api:${API_TAG:?}`, env file as above;
    - `environment`: `PORT=3000`, `MAINTENANCE_ENABLED=false`, `DATABASE_URL` built from `POSTGRES_*`, `REDIS_URL=redis://redis:6379`;
    - no host ports, `init: true`, `stop_grace_period: 30s`, `restart: unless-stopped`;
    - logging `json-file` with `max-size: 10m`, `max-file: 5`;
    - healthcheck `node -e "fetch('http://127.0.0.1:3000/v1/health/ready').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"`,
      `interval: 10s`, `start_period: 30s`;
    - `depends_on` healthy `postgres` and `redis`.
  - `worker`: same image, `command: ["node", "dist/worker.js"]`, `MAINTENANCE_ENABLED=true`, no healthcheck.
  - `migrate`: image `wordmet-api-migrate:${API_TAG:?}`, `command: ["pnpm", "exec", "prisma", "migrate", "deploy"]`, same `DATABASE_URL`,
    `depends_on` healthy `postgres` (so `compose run migrate` starts Postgres on the first deploy).
  - `postgres:17`:
    - `command: ["postgres", "-c", "statement_timeout=300s", "-c", "idle_in_transaction_session_timeout=300s"]`;
    - volume `postgres_data`, healthcheck as in `docker-compose.yml`, no host port.
  - `redis:7.4-alpine`: `redis-server --maxmemory-policy noeviction --appendonly yes`, volume `redis_data`, no host port.
  - `caddy` (exact `caddy:2.x.y` tag):
    - ports `${HTTP_PORT:-80}:80`, `${HTTPS_PORT:-443}:443`, `${HTTPS_PORT:-443}:443/udp`;
    - volumes: `./Caddyfile:/etc/caddy/Caddyfile:ro`, `caddy_data`, `caddy_config`, `${CADDY_LOG_DIR:-/var/log/caddy}:/var/log/caddy`;
    - `environment`: `ACME_EMAIL: ${ACME_EMAIL}`, `CADDY_SITES: ${CADDY_SITES:-api.wordmet.com, admin-api.wordmet.com}`;
    - `depends_on: api`.
- [ ] **Step 2: Write `Caddyfile`.**
  - Global options block with `email {$ACME_EMAIL}`.
  - One site block for `{$CADDY_SITES:api.wordmet.com, admin-api.wordmet.com}` with `reverse_proxy api:3000`.
  - `log { output file /var/log/caddy/access.log { roll_keep_for 168h } format json }`.
- [ ] **Step 3: Write the two env templates.**
  - `env.production.example`: every key of `apps/api/.env.example`, with production values or `<generate: node scripts/gen-secret.mjs>`.
    It includes `TRUST_PROXY=uniquelocal`, `BILLING_PRODUCTION=true`, `TURNSTILE_MODE=real`,
    `TURNSTILE_ALLOWED_HOSTNAMES=wordmet.com,www.wordmet.com,admin.wordmet.com`, `JWT_ISSUER=https://api.wordmet.com`,
    `PROBLEM_TYPE_BASE=https://api.wordmet.com/problems/`, `CORS_ORIGINS=https://wordmet.com,https://www.wordmet.com,https://admin.wordmet.com`,
    `ADMIN_APP_URL=https://admin.wordmet.com`, `LEARNER_APP_URL=https://wordmet.com`, SMTP for Resend (`smtp.resend.com`, user `resend`),
    `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, and `ACME_EMAIL` (read by Caddy through compose).
  - `ops.env.example`: `R2_BACKUP_ENDPOINT`, `R2_BACKUP_BUCKET`, `R2_BACKUP_ACCESS_KEY_ID`, `R2_BACKUP_SECRET_ACCESS_KEY`,
    `ALERT_RESEND_API_KEY`, `ALERT_FROM`, `ALERT_TO`. The scripts read `MAIL_DAILY_BUDGET`, `MAIL_BUDGET_KEY` and `POSTGRES_*` from `.env`.
- [ ] **Step 4: Validate.**
  - `API_TAG=x docker compose -f deploy/compose.prod.yml --env-file deploy/env.production.example config -q` exits 0.
  - `docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:<tag> caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`
    prints `Valid configuration`.
  - A diff of key names between `apps/api/.env.example` and `deploy/env.production.example` shows no key missing.
- [ ] **Step 5: Commit** `build(deploy): add production compose file and caddy config`

### Task 5: Deploy, rollback and backup scripts (M4)

**Files:**
- Create: `deploy/scripts/common.sh`, `deploy/scripts/deploy.sh`, `deploy/scripts/rollback.sh`, `deploy/scripts/backup.sh`,
  `deploy/README.md`

**Interfaces:**
- Consumes: Task 4 compose file, env files.
- Produces:
  - `common.sh`:
    - `WORDMET_HOME` (default `/srv/wordmet`);
    - `compose()` = `docker compose -p wordmet -f "$REPO/deploy/compose.prod.yml" --env-file "$WORDMET_HOME/.env" "$@"`;
    - `load_ops_env()` fails with the name of each missing key;
    - `wait_ready <seconds>` polls the `api` container health until `healthy`, else returns 1;
    - state files `$WORDMET_HOME/state/current` and `$WORDMET_HOME/state/previous`, each holding one SHA.
  - `deploy.sh <sha>`, `rollback.sh <sha>`, `backup.sh`. Each exits non-zero on any failure (`set -euo pipefail`).

- [ ] **Step 1: Write `deploy.sh <sha>`.** Order:
  1. refuse a dirty checkout;
  2. `git fetch origin && git checkout --detach <sha>`;
  3. build `wordmet-api:<sha>` and `wordmet-api-migrate:<sha>`;
  4. run `backup.sh`; stop if it fails. On the first deploy (`state/current` empty) skip it and print `first deploy: no backup`, since
     Postgres is not running yet;
  5. `API_TAG=<sha> compose --profile migrate run --rm migrate`; stop if it fails;
  6. `API_TAG=<sha> compose up -d postgres redis api worker caddy`;
  7. `wait_ready 120`.
  - **Ready:** move `current` to `previous`, write `<sha>` to `current`, then remove `wordmet-api` and `wordmet-api-migrate` images other
    than the 3 newest SHAs.
  - **Not ready, a previous SHA exists:** `API_TAG=<current> compose up -d api worker`, print what happened, exit 1.
  - **Not ready, no previous SHA (first deploy):** print `no previous version to return to`, leave the containers up, exit 1.
- [ ] **Step 2: Write `rollback.sh <sha>`.**
  - Refuse when the image `wordmet-api:<sha>` is not on the machine.
  - Run `API_TAG=<sha> compose up -d api worker`, then `wait_ready 120`. Update the state files; exit 1 when not ready.
  - It never calls `migrate` and never builds.
- [ ] **Step 3: Write `backup.sh`.**
  - `compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"` to `$WORDMET_HOME/backups/wordmet-<UTC yyyymmddTHHMMSSZ>.dump`.
  - Upload it with the pinned `amazon/aws-cli` image: `s3 cp … --endpoint-url "$R2_BACKUP_ENDPOINT"`, credentials from `ops.env`.
  - Keep the 14 newest on R2 (`s3 ls`, sort, `s3 rm` the rest) and the 3 newest locally.
  - Print the uploaded object name.
- [ ] **Step 4: Write `deploy/README.md`** (the operator's page):
  - prepare the server: Docker, `jq`, `ufw` allowing 22, 80, 443; key-only SSH; `/srv/wordmet` with `app/` (a clone of the repo), `.env`,
    `ops.env`, `state/`, `backups/`;
  - first deploy;
  - deploy, roll back and restore a backup (`pg_restore --clean --if-exists` into a stopped stack, then `accounts:replay-deletions`);
  - the admin deploy, run by hand in `apps/admin`:
    `VITE_API_BASE_URL=https://admin-api.wordmet.com VITE_TURNSTILE_SITE_KEY=<key> pnpm build && pnpm exec wrangler deploy`;
  - `wrangler rollback` for both Workers.
- [ ] **Step 5: Lint.** `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:<tag> deploy/scripts/*.sh` Expected: no output.
- [ ] **Step 6: Commit** `build(deploy): add deploy, rollback and backup scripts`

### Task 6: Web deploy builds the learner app, with a pause switch (M5)

**Files:**
- Modify: `.github/workflows/deploy-web.yml`

- [ ] **Step 1: Edit.**
  - Job-level `if: github.event_name == 'workflow_dispatch' || vars.WEB_DEPLOY_PAUSED != 'true'`.
  - Add these to `env:`:
    - `NEXT_PUBLIC_LEARNER_APP: 'on'`;
    - `NEXT_PUBLIC_API_BASE_URL: https://api.wordmet.com`;
    - `NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${{ vars.TURNSTILE_SITE_KEY }}`;
    - `LANDING_DATA_REQUIRED: '1'` (`next.config.ts` then fails the build when the landing's prices and FAQ cannot be read from the API, so the API is
      deployed first).
  - Header comment: one line on the switch and on deploying the API first.
- [ ] **Step 2: Lint.** `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:<tag>` Expected: no finding in `deploy-web.yml`.
- [ ] **Step 3: Commit** `ci(web): build the learner app on deploy and add a pause switch`

### Task 7: Simple monitoring by email (M7)

**Files:**
- Create: `deploy/scripts/send-alert.sh`, `deploy/scripts/watch.sh`, `deploy/scripts/daily-report.sh`, `deploy/scripts/daily-report.sql`
- Modify: `deploy/README.md` (crontab section)

**Interfaces:**
- Consumes: `common.sh` (`compose`, `load_ops_env`).
- Produces:
  - `send-alert.sh <type> <subject> <body-file>`:
    - returns 0 without sending when `$WORDMET_HOME/state/alerts/<type>` is younger than 3 600 s (`watch.sh` passes its alert type; the
      daily report passes a unique type per day);
    - otherwise POSTs `https://api.resend.com/emails` with `Authorization: Bearer $ALERT_RESEND_API_KEY` and JSON
      `{ from, to: [ALERT_TO], subject, text }`, then touches the state file;
    - a non-2xx answer exits 1.

- [ ] **Step 1: Write `watch.sh`.** Over the last 5 minutes it checks the following; each line is one alert type.
  - `compose logs --since 5m --no-log-prefix api worker`, counting lines that contain `"event":"<name>"`:
    `request_failed` ≥ 5, `maintenance_job_failed` ≥ 1, `account_deletion_failed` ≥ 1, `turnstile_bypassed` ≥ 1.
  - Disk use of `/` above `WATCH_DISK_PERCENT` (default 80).
  - `MemAvailable` below `WATCH_MEM_MB` (default 300).
  - Any of the five services that is not `running`, or is `unhealthy`.
  - The restart count of `api` or `worker` has risen since the last run (kept in `state/restarts`).
  - The body lists the count and the last 20 matching log lines.
- [ ] **Step 2: Write `daily-report.sql` and `daily-report.sh`.**
  - The SQL takes the day before today in `Asia/Ho_Chi_Minh` and returns one row:
    - new `users`;
    - distinct `learning_activity_days.user_id` with `studied` on that `local_date`;
    - `practice_sessions` by `started_at`;
    - `ai_calls` count and `sum(cost_usd)`;
    - `billing_orders` with `status = 'paid'` (count and `sum(amount_minor)`, by `created_at`);
    - `mail_budget_buckets.sent` for the UTC date of the bucket key `<MAIL_BUDGET_KEY>:<yyyy-mm-dd>`.
  - The script adds the following, then sends one email of type `daily-<date>`:
    - 5xx count and p95 `duration` of that day from the Caddy JSON access log, with `jq`;
    - disk and memory use;
    - `MAIL_DAILY_BUDGET`.
- [ ] **Step 3: Run the SQL on the local database.** `docker compose exec -T postgres psql -U dev -d english_learning_prod_deploy -f - < deploy/scripts/daily-report.sql`
  Expected: one row, no error (zeros are fine on the smoke database).
- [ ] **Step 4: Add the crontab block to `deploy/README.md`.**
  - `CRON_TZ=Asia/Ho_Chi_Minh`.
  - `watch.sh` every 5 minutes; `daily-report.sh` at 08:00; `backup.sh` at 03:00.
  - Hourly: `docker compose … exec -T worker node dist/cli/run-maintenance.js`.
  - Each line appends to `$WORDMET_HOME/logs/cron.log`.
- [ ] **Step 5: Lint** with shellcheck as in Task 5. Expected: no output.
- [ ] **Step 6: Commit** `build(deploy): add alert and daily report scripts`

### Task 8: No mention of ads on the plan cards while ads are off

Why: the admin switch `ads_enabled` (default off, `settings.definitions.ts:103`) only drives `ads.show`, which gates the AdSense loader and
the Pro intro dialog. The copy below is static, so with the switch off the landing still says Free "may have ads" and Pro has "no ads".
Checked 13/11/2026 on the bootstrap stack: `curl localhost:3001/vi` contains "Có thể có quảng cáo." and "Không quảng cáo". Only the copy
goes; the loader, the dialog, the `ads` field of the API and the CSP stay, so reverting this one commit brings the copy back.

**Files:**
- Modify: `apps/web/src/site/landing/PricingSection.tsx:46` (drop the `copy.freeAds` line),
  `apps/web/src/features/learner/plans/PlansPage.tsx:108` (drop the `freeAds` line from the Free footer) and `:150` (drop the
  `proList.ads` perk), `apps/web/src/features/learner/plans/CompareTable.tsx:29` (drop the `noAds` row),
  `apps/web/src/features/learner/house-ad/HouseAd.tsx:92` (drop the `noAds` perk)
- Modify: `apps/web/messages/vi.json`, `apps/web/messages/en.json`: remove `Landing.plans.freeAds`, the "Không quảng cáo" item of
  `Landing.plans.proList`, `App.plans.freeAds`, `App.plans.proList.ads`, `App.plans.compareTable.noAds`, `App.houseAd.noAds`; set
  `App.houseAd.lead` to "Gói Pro có nhiều phiên luyện và nhiều lượt AI hơn mỗi tháng." / "The Pro plan has more practice sessions and more
  AI uses each month."
- Test: `apps/web/src/site/landing/landing.test.tsx:94`, `apps/web/src/features/learner/plans/plans.test.tsx:76,93-94,330`,
  `apps/web/src/features/learner/house-ad/house-ad.test.tsx`

- [ ] **Step 1: Write the failing tests.**
  - `landing.test.tsx`: replace line 94 with `expect(pricing().queryByText(/quảng cáo/i)).not.toBeInTheDocument();`.
  - `plans.test.tsx`: line 76 becomes `expect(within(free).queryByText(/quảng cáo/i)).not.toBeInTheDocument();`; the Pro perks test is
    renamed "…the five perks…", its list drops 'Không quảng cáo' and adds
    `expect(within(pro).queryByText(/quảng cáo/i)).not.toBeInTheDocument();`; line 330 becomes
    `expect(within(table).queryByRole('row', { name: /quảng cáo/i })).not.toBeInTheDocument();`, and the body rows are pinned in order by
    their label: `'Ôn thẻ và lịch ôn', 'Nhắc học qua email', 'Số nhóm', 'Phiên luyện mỗi ngày', 'Câu AI mới mỗi tháng', 'Lượt tra AI mỗi tháng'`
    (six rows, `App.plans.compareTable` in `vi.json`).
  - `house-ad.test.tsx`, test `LB2A1` (line 66): once the dialog is open, add
    `expect(within(dialog).queryByText(/quảng cáo/i)).not.toBeInTheDocument();`.
- [ ] **Step 2: Run** `pnpm --filter web exec vitest run src/site/landing src/features/learner/plans src/features/learner/house-ad`.
  Expected: the four changed tests FAIL on the ad text.
- [ ] **Step 3: Implement** the file list above.
- [ ] **Step 4: Run** the same command, then `pnpm --filter web exec tsc --noEmit`, `pnpm --filter web lint` and
  `node apps/web/scripts/check-message-keys.mjs`. Expected: all pass.
- [ ] **Step 5: Control.** `grep -rn -i "quảng cáo" apps/web/src apps/web/messages` Expected: no line outside test files and comments
  (before this task it listed 7 message strings).
- [ ] **Step 6: Run it.** `pnpm bootstrap` (rebuilds the web image), then `curl -s localhost:3001/vi | grep -c "quảng cáo"` Expected: `0`.
  Open `/vi/app/plans` as a Free learner: no ad line on either card, no ad row in the table.
- [ ] **Step 7: Commit** `fix(web): drop ad mentions from the plan cards while ads are off`

Not in code: one of the two `legal_versions` rows in the local DB mentions ads or AdSense; the owner edits the privacy text in admin
`/legal` before publishing (runbook G0). The six landing FAQ rows in the local DB do not mention ads.

### Task 9: Local rehearsal, then PR

**Files:** none new (fixes go to the task that owns the file).

- [ ] **Step 1: Run the whole path on this machine (Git Bash and Docker Desktop).**
  - Setup: `WORDMET_HOME` is a scratch folder holding a clone of this branch; `.env` from `env.production.example` with `TURNSTILE_MODE=fake`,
    `BILLING_PRODUCTION=false` and SMTP pointed at Mailpit; `CADDY_SITES=:80`, `HTTP_PORT=8088`, `HTTPS_PORT=8448`.
  - First deploy that fails: `POSTGRES_PASSWORD` wrong only for `api`, run `deploy.sh <HEAD>`. Expected: prints
    `no previous version to return to`, exits 1. Fix the password.
  - Deploy: run `deploy.sh <HEAD>`. Expected: `curl -s localhost:8088/v1/health/ready` returns `"status":"ok"`.
  - Second deploy and rollback: make one empty commit, then `deploy.sh <new>`, then `rollback.sh <first>`. Expected: API ready again, and
    the script log shows no `migrate`.
  - Failed deploy: set `POSTGRES_PASSWORD` wrong only for `api`, then `deploy.sh`. Expected: exits 1 and the previous tag is running.
  - `watch.sh` with `WATCH_DISK_PERCENT=1` and `ALERT_*` pointed at a Resend test key, or at Mailpit if no key: one alert, then none on a
    second run. Remove `ALERT_TO` from `ops.env`: `watch.sh` exits 1 and names `ALERT_TO`.
- [ ] **Step 2: Remove the scratch stack** (`compose down -v` with `-p wordmet` and the scratch home).
- [ ] **Step 3: Push and open the PR into `dev` with the `ship-pr` skill.** The body lists:
  - what the local rehearsal showed;
  - what only G1 on the VPS can show: real certificates, R2 upload and restore, Resend from the VPS, `TRUST_PROXY` (G3-14).

Backup upload to R2 needs real credentials, so it is first checked at G1 (runbook §5). Everything else in G1 repeats Task 9 on the VPS.
