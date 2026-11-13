# Production operations (API and worker on the VPS)

The runbook (when to do what, quality gates, who does it) is `docs/deliveries/deploy-production-runbook.md`. This page is how.

```
/srv/wordmet/
  app/        clone of the repo; the scripts run from app/deploy/scripts
  .env        API + worker settings and secrets (from deploy/env.production.example), chmod 600
  ops.env     backup and alert settings (from deploy/ops.env.example), chmod 600
  state/      current and previous: the SHA running now and the one before
  backups/    the 3 newest database dumps (14 more on R2)
  logs/       cron output
```

## Prepare the server (once)

1. Ubuntu 24.04, SSH by key only (`/etc/ssh/sshd_config.d/00-hardening.conf`: `PasswordAuthentication no`,
   `PermitRootLogin prohibit-password`).
2. Docker Engine with the compose plugin, plus `jq` and `git`.
3. Firewall: `ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable`.
   Docker publishes ports past `ufw`; compose publishes only Caddy's 80 and 443, nothing else.
4. Outbound mail: `nc -vz smtp.resend.com 465` must connect. If the provider blocks it, use port 587 with `SMTP_SECURE=false`.
5. `mkdir -p /srv/wordmet/{state,backups,logs}`, `git clone <repo> /srv/wordmet/app`.
6. `.env` and `ops.env`: copy the two templates, fill every `<…>`, `chmod 600`. Secrets come from `node scripts/gen-secret.mjs` or the
   provider consoles; never paste them anywhere else.
7. DNS: `api` and `admin-api` A records point at this server, grey cloud. Caddy gets the certificates on the first start.

## Deploy

```bash
/srv/wordmet/app/deploy/scripts/deploy.sh <sha>
```

Order: refuse a checkout with local changes → check out `<sha>` → build `wordmet-api:<sha>` and `wordmet-api-migrate:<sha>` → backup
(skipped on the first deploy) → migrate → start → wait up to 120 s for `/v1/health/ready`.

- Ready: `state/current` = `<sha>`, the one before goes to `state/previous`; images older than the 3 newest are removed.
- Not ready: the previous version is started again and the script exits 1; `<sha>` is not recorded.
- Not ready on the first deploy: there is nothing to go back to. The containers stay up for `compose logs api`; the script exits 1.

Deploy the API before the web: the web build reads prices and FAQ from it (`LANDING_DATA_REQUIRED=1`).

### After the first deploy

```bash
cd /srv/wordmet/app && alias compose=deploy/scripts/compose.sh
compose exec api node dist/cli/admin-grant.js <owner email>   # after registering that account on wordmet.com
compose exec worker node dist/cli/tts-backfill.js            # voices for senses published before TTS was on; 0 queued is fine
```

Check one published sense: `speech_audio` has two `ready` rows, and `curl -sI https://audio.wordmet.com/tts/v1/<key>.mp3` returns `200`
with `audio/mpeg`.

## Roll back

```bash
/srv/wordmet/app/deploy/scripts/rollback.sh <sha>   # 7+ characters are enough
```

It only starts an image that is already on the machine (the 3 newest), never builds and never migrates: migrations are add-only, so
earlier code runs on the newer database.

| Layer | Command |
|---|---|
| API | `rollback.sh <sha>` |
| Web | `pnpm exec wrangler rollback --name wordmet-web` (in `apps/web`), or the Cloudflare dashboard → Deployments |
| Admin | `pnpm exec wrangler rollback --name wordmet-admin` (in `apps/admin`) |

## Backup and restore

`backup.sh` runs before every deploy and daily from cron: `pg_dump -Fc` → `backups/` → R2 bucket `wordmet-backups`.

Restore (the database is lost or wrong):

```bash
cd /srv/wordmet/app && alias compose=deploy/scripts/compose.sh
compose exec api node dist/cli/accounts-deletions.js export --out /tmp/deletions.txt   # if the database still answers
docker cp "$(compose ps -q api)":/tmp/deletions.txt /srv/wordmet/backups/deletions.txt
compose stop api worker
compose exec -T postgres pg_restore -U <POSTGRES_USER> -d <POSTGRES_DB> --clean --if-exists < /srv/wordmet/backups/<file>.dump
compose up -d api worker
docker cp /srv/wordmet/backups/deletions.txt "$(compose ps -q api)":/tmp/deletions.txt
compose exec api node dist/cli/accounts-deletions.js replay --from /tmp/deletions.txt
```

The replay deletes again the accounts deleted after the dump was taken. A dump older than `backups/` is on R2: download it with the same
`amazon/aws-cli` command `backup.sh` uses (`s3 cp s3://wordmet-backups/<file> …`).

## Admin web (by hand)

```bash
cd apps/admin
VITE_API_BASE_URL=https://admin-api.wordmet.com VITE_TURNSTILE_SITE_KEY=<site key> pnpm build && pnpm exec wrangler deploy
```

## Everyday commands

```bash
cd /srv/wordmet/app && alias compose=deploy/scripts/compose.sh
compose ps                     # what runs, and health
compose logs --tail 200 api    # or worker, caddy
cat /srv/wordmet/state/current # the SHA in production
```

## Monitoring and cron (M7)

- `watch.sh` (every 5 minutes): log events `request_failed` (5 or more), `maintenance_job_failed`, `account_deletion_failed`,
  `turnstile_bypassed`; disk above 80 %; less than 300 MB of memory; a service not running or unhealthy; an api or worker restart. One email
  per kind of problem per hour, through the Resend HTTP API (`send-alert.sh`), so it still works when the app's own mail is broken.
- `daily-report.sh` (08:00): yesterday's accounts, learners, practice sessions, AI calls and cost, paid orders, mails sent; 5xx count and
  p95 latency from the Caddy access log; disk and memory.
- A missing `ops.env` key stops the script and names the key (it lands in `logs/cron.log`).

`crontab -e` as root:

```
CRON_TZ=Asia/Ho_Chi_Minh
WORDMET_HOME=/srv/wordmet
*/5 * * * * /srv/wordmet/app/deploy/scripts/watch.sh >> /srv/wordmet/logs/cron.log 2>&1
0 8 * * *   /srv/wordmet/app/deploy/scripts/daily-report.sh >> /srv/wordmet/logs/cron.log 2>&1
0 3 * * *   /srv/wordmet/app/deploy/scripts/backup.sh >> /srv/wordmet/logs/cron.log 2>&1
15 * * * *  /srv/wordmet/app/deploy/scripts/compose.sh exec -T worker node dist/cli/run-maintenance.js >> /srv/wordmet/logs/cron.log 2>&1
```

Check that cron runs: `tail /srv/wordmet/logs/cron.log` after 5 minutes shows a `watch.sh` line only when something was wrong; force one with
`WATCH_DISK_PERCENT=1 /srv/wordmet/app/deploy/scripts/watch.sh`.
