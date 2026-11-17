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

### Continuous deployment

Merging into `main` runs the GitHub workflow **Deploy** (`.github/workflows/deploy-web.yml`):

```
job api   SSH to root@VPS_HOST with the deploy key, send the commit SHA → ci-deploy.sh → deploy.sh <sha>
            fails (deploy.sh already put the previous version back) → the run stops, web and admin unchanged
job web   (after api) build apps/web at the same SHA → wrangler deploy (wordmet.com)
job admin (after api) build apps/admin at the same SHA → wrangler deploy (admin.wordmet.com)
```

- Only a commit on `main` deploys. A manual run (Actions tab → Deploy → Run workflow) takes an optional full SHA on `main`; empty means the
  head of `main`. Redeploying the running SHA is safe: nothing to migrate, the containers are not recreated, the web picks up new prices.
- Pause: repository variable `DEPLOY_PAUSED=true` skips the run on push; a manual run still deploys.
- One run at a time (`concurrency: deploy`). Running `deploy.sh` by hand while a run is in progress is not guarded: check the Actions tab first.
- The key: secret `VPS_SSH_KEY` (environment `deploy-env`), its public half in `/root/.ssh/authorized_keys` as
  `restrict,command="/srv/wordmet/bin/ci-deploy.sh" ssh-ed25519 … github-actions-deploy@wordmet`. `restrict` refuses a shell, a terminal
  and port forwarding; the forced command accepts only a 40-character SHA. `ci-deploy.sh` lives outside the clone because `deploy.sh`
  checks out other commits; after changing it in the repo: `install -m 755 deploy/scripts/ci-deploy.sh /srv/wordmet/bin/`.
- The host key is pinned in repository variable `VPS_KNOWN_HOSTS` (`ssh-keyscan -t rsa <ip>`, compared with
  `ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub` on the server). Rotate the deploy key: make a new pair, replace the line in
  `authorized_keys`, `gh secret set VPS_SSH_KEY --env deploy-env < key`, delete the private file.

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

### Set up the deletion journal

Create a private R2 bucket for the journal and give API/worker an Object Read & Write token scoped to that bucket. Keep its
credentials separate from the backup and audio buckets. Set the four `DELETION_JOURNAL_*` variables from
`deploy/env.production.example`. Retain journal records for as long as any backup they cover can be restored.

At cutover, stop API and worker and seed from the authoritative database with the new image. The one-off command copies
completed and in-progress deletions, then writes the marker required by recovery. Run it again if it fails. Use the authoritative
database for this one-time initialization, since a restored snapshot may be missing records from after the dump.

```bash
deploy/scripts/compose.sh stop api worker
deploy/scripts/compose.sh run --rm --no-deps -T api node dist/cli/accounts-deletions.js seed-journal
deploy/scripts/compose.sh up -d api worker
```

Production deletion requests report success or pending only after R2 accepts their record. If R2 fails after the account is
marked `deleting`, the request fails and the deletion retry job attempts to journal and finish it. An outage before the write
can leave a locally pending request absent from the journal if the original DB is lost at the same time. If a rollback runs an
older image that does not journal, stop deletion writers and backfill from the authoritative DB again before relying on recovery.

### Restore and replay

Restore into an **empty** database, then migrate it to the running code. `pg_restore --clean` on the live database would keep tables
created after the dump and rewind `_prisma_migrations`, and the next deploy would fail on "relation already exists".

Keep API and worker stopped from the export through deletion replay and payment reconciliation. Before replacing the database,
verify that the journal covers the interval since the dump. If the original DB is readable, stop writes and export its deletion
list and sequence position as additional evidence. The regular database backup alone cannot recover deletion requests made after
the dump. If coverage is unknown, keep traffic stopped while resolving it.

```bash
cd /srv/wordmet/app
compose() { deploy/scripts/compose.sh "$@"; }
U='<POSTGRES_USER>'; D='<POSTGRES_DB>'; F='/srv/wordmet/backups/<file>.dump'
compose stop api worker

# If the original database is readable, keep these results outside it.
umask 077
J="$(mktemp /srv/wordmet/backups/deletions.XXXXXXXX.jsonl)"
compose run --rm --no-deps -T api sh -c \
  'node dist/cli/accounts-deletions.js export --out /tmp/deletions.jsonl >&2 && cat /tmp/deletions.jsonl' > "$J"
compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U "$U" -d "$D" -Atc 'SELECT last_value FROM billing_order_code_seq'
```

Continue with the verified dump. Stop on any command error. Recovery reads the R2 journal even when the original DB is gone. A
missing initialization marker, unreadable journal or pending deletion produces a nonzero exit code. `compose run` executes the
CLI in a temporary container while the serving API and worker are stopped.

```bash
compose exec -T postgres dropdb -U "$U" --force "$D"
compose exec -T postgres createdb -U "$U" "$D"
compose exec -T postgres pg_restore --exit-on-error -U "$U" -d "$D" < "$F"
compose --profile migrate run --rm migrate
compose run --rm --no-deps -T api node dist/cli/accounts-deletions.js replay --journal
```

If you also have a verified export from the original database, use `replay --journal --from /dev/stdin < "$J"` in that last
command to combine it with R2. Replay skips accounts that are already absent.

Before restarting, reconcile transfers and orders since the dump against the payment provider's records. Match using the original
payment link and independently verified order ownership. Review any transfer whose order is missing. Determine an upper bound on
issued order codes from evidence outside the restored DB and set `billing_order_code_seq` to at least that value and the current
sequence position. Keep traffic stopped if deletion coverage, payment ownership or the upper bound cannot be verified.

```bash
MAX_ISSUED='<verified upper bound>'
compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -v max_issued="$MAX_ISSUED" -U "$U" -d "$D" <<'SQL'
SELECT setval('billing_order_code_seq', GREATEST(last_value, :'max_issued'::bigint), true)
FROM billing_order_code_seq;
SQL
```

Once those checks pass, run `compose up -d api worker` and check `/v1/health/ready`.

Check a backup without touching production (G1): load it into a scratch database and compare counts.

```bash
compose exec -T postgres createdb -U "$U" wordmet_restore_check
compose exec -T postgres pg_restore -U "$U" -d wordmet_restore_check < "$F"
for db in "$D" wordmet_restore_check; do compose exec -T postgres psql -U "$U" -d "$db" -tAc "select count(*) from users"; done
compose exec -T postgres dropdb -U "$U" wordmet_restore_check
```

A dump older than the 3 kept in `backups/` is on R2. List and download it (the keys stay inside the container):

```bash
r2() { docker run --rm --env-file /srv/wordmet/ops.env -e AWS_DEFAULT_REGION=auto   -e AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED -e AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED   -v /srv/wordmet/backups:/backups --entrypoint sh amazon/aws-cli:2.40.2 -c   'AWS_ACCESS_KEY_ID=$R2_BACKUP_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_BACKUP_SECRET_ACCESS_KEY aws --endpoint-url "$R2_BACKUP_ENDPOINT" '"$*"; }
r2 's3 ls "s3://$R2_BACKUP_BUCKET/"'
r2 's3 cp "s3://$R2_BACKUP_BUCKET/<file>.dump" /backups/'
```

## Admin web (by hand, when CD is not available)

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
- `daily-report.sh` (08:00 Vietnam time): yesterday's accounts, learners, practice sessions, AI calls and cost, paid orders, mails sent; 5xx count and
  p95 latency from the Caddy access log; the newest backup; disk and memory.
- `backup.sh` (03:00 Vietnam time, and before every deploy): a failure emails the owner (alert type `backup`).
- A missing `ops.env` key stops the script and names the key (it lands in `logs/cron.log`).

`crontab -e` as root. The times are UTC: Ubuntu's cron runs on the server clock, and whether it honours `CRON_TZ` is not verified, so
check `timedatectl` shows `Time zone: Etc/UTC` first (or `timedatectl set-timezone Etc/UTC`). 01:00 UTC is 08:00 in Vietnam, 20:00 UTC
is 03:00.

```
WORDMET_HOME=/srv/wordmet
*/5 * * * * /srv/wordmet/app/deploy/scripts/watch.sh >> /srv/wordmet/logs/cron.log 2>&1
0 1 * * *   /srv/wordmet/app/deploy/scripts/daily-report.sh >> /srv/wordmet/logs/cron.log 2>&1
0 20 * * *  /srv/wordmet/app/deploy/scripts/backup.sh >> /srv/wordmet/logs/cron.log 2>&1
15 * * * *  /srv/wordmet/app/deploy/scripts/compose.sh exec -T worker node dist/cli/run-maintenance.js >> /srv/wordmet/logs/cron.log 2>&1
```

Check that cron runs: `tail /srv/wordmet/logs/cron.log` after 5 minutes shows a `watch.sh` line only when something was wrong; force one with
`WATCH_DISK_PERCENT=1 /srv/wordmet/app/deploy/scripts/watch.sh`.
