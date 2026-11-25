# Production operations (API and worker on the VPS)

The runbook (when to do what, quality gates, who does it) is `docs/deliveries/deploy-production-runbook.md`. This page is how.

```
/srv/wordmet/
  app/        clone of the repo; the scripts run from app/deploy/scripts
  .env        API + worker settings and secrets (from deploy/env.production.example), chmod 600
  ops.env     backup and alert settings (from deploy/ops.env.example), chmod 600
  walg.env    WAL-G settings and the R2 key for WAL and base backups (from deploy/walg.env.example), chmod 600; only postgres reads it
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
7. `walg.env`: copy `deploy/walg.env.example` to `/srv/wordmet/walg.env`, fill every `<…>` (a dedicated R2 bucket and a token limited to it)
   and `chmod 600`. Only the `postgres` service reads it: the key can overwrite the backups, so api and worker never get it. With the file
   missing, `compose up` and `compose run` stop with "env file … not found" before they start anything, so `deploy.sh` and `rollback.sh` stop
   too (`compose ps` and `exec` still work). Checked with the compose of Docker Desktop only, not with the one on the VPS.
8. DNS: `api` and `admin-api` A records point at this server, grey cloud. Caddy gets the certificates on the first start.

### Database roles and WAL-G (first rollout)

Three database logins: `POSTGRES_USER` (superuser, for ops only: backup, restore, reports), `wordmet_migrator` (owns every table; only the
`migrate` service uses it) and `wordmet_app` (reads and writes rows; api, worker and the CLIs use it and cannot create or alter tables).
`db-roles.sh` creates and repairs the two roles from `deploy/sql/roles.sql`; it is safe to run again.

The design's "deploy the code first, then change the roles" does not apply here: the compose change in `deploy/compose.prod.yml` (the
`DATABASE_URL` of api, worker and migrate, and the Postgres image) is itself the role and image change, so it cannot reach the server before
the roles exist. The order below is therefore fixed: do steps 0 to 6 **before** merging this change into `main`.

On the running server, at night (Vietnam time). Step 4 restarts Postgres: plan for a few minutes of downtime. That figure is an estimate;
the restart was rehearsed only on Docker Desktop with about 270 KB of data, never on the VPS.

0. Pause continuous deployment: repository variable `DEPLOY_PAUSED=true` (see "Continuous deployment"), and check in the Actions tab that no
   run is in progress. Then, in `/srv/wordmet/app`, get the new files without deploying anything:
   `git fetch origin && git checkout --detach <sha>` (`<sha>` is the head of this change's branch). `db-roles.sh`, `deploy/sql/roles.sql`,
   `deploy/postgres/` and the `build:` section of the compose file exist only from that commit on, and step 2 needs them.
1. `walg.env` as in step 7 above. In `.env` add the four role variables of `deploy/env.production.example`: `APP_DB_USER=wordmet_app`,
   `MIGRATOR_DB_USER=wordmet_migrator` and a generated `APP_DB_PASSWORD` and `MIGRATOR_DB_PASSWORD`.
2. Build the Postgres image first, because `deploy.sh` runs `compose up` without `--build`:
   `deploy/scripts/compose.sh build postgres` (tag `wordmet-postgres:17-walg-3.0.9`: Postgres 17 and the WAL-G binary).
3. `deploy/scripts/db-roles.sh` with api and worker stopped or at low traffic. It hands the tables to the migrator (a short `ACCESS EXCLUSIVE`
   lock per table) and gives up after 5 s on a lock, rolling back whole: on a lock timeout error, run it again. It prints `left over: 0`
   when the split is complete and exits 1 otherwise. Its failure line never shows the SQL (the statements hold the passwords).
4. `deploy/scripts/compose.sh up -d postgres` recreates Postgres from the new image with archiving on (the one restart), then
   `deploy/scripts/compose.sh up -d api worker` so they log in as `wordmet_app`. Read `compose logs --tail 100 api worker` for
   `permission denied` or `must be owner`: that would be DDL at run time, which the roles forbid. The api was checked on `wordmet_app` with
   the code built from this branch, not with the production image; that api and worker run no DDL at run time is an **assumption**. If it
   fails, use "Back to one login" below.
5. `BACKUP_KIND=deploy deploy/scripts/backup.sh` by hand: the first WAL-G base backup (`BACKUP_KIND=deploy` keeps manual dumps out of the locked `daily/` prefix). Check that WAL reaches R2:

```bash
deploy/scripts/compose.sh exec -T postgres psql -X -U <POSTGRES_USER> -d <POSTGRES_DB> -c 'SELECT archived_count, failed_count, last_archived_wal FROM pg_stat_archiver'
```

6. `deploy/scripts/deploy.sh <sha>`: it migrates as `wordmet_migrator`, starts everything and writes `state/current`. Only then set
   `DEPLOY_PAUSED` back to `false` and merge into `main`; the push deploys the merge commit (the same tree again changes nothing).

If `main` is deployed before these steps:

- `.env` has no `APP_DB_*` / `MIGRATOR_DB_*` yet: the new compose file refuses to load for `up`, `run`, `ps` and `logs` (`required variable
  APP_DB_USER is missing a value`); `exec` still works (all checked with the compose of Docker Desktop). `deploy.sh` has already checked out
  the new commit; its dump (`exec`) succeeds, then the migration (`run`) fails and it stops with "migration failed". `state/current` stays the
  old SHA and the old containers keep running. But `rollback.sh` (`up`) fails, and so do the `compose ps` calls of `watch.sh`,
  because the cron scripts and `rollback.sh` read the compose file of the checked-out clone, until `.env` is fixed. What `watch.sh` then reports was not checked. Fix `.env`, run steps 2 to 5, then `deploy.sh <sha>`.
- `.env` has the variables but `db-roles.sh` has not run: the migration cannot log in as `wordmet_migrator`, `deploy.sh` stops at
  "migration failed" and the old version keeps running. Nothing is half changed; run `db-roles.sh` and deploy again.

Each manual `BACKUP_KIND=deploy deploy/scripts/backup.sh` adds a base backup; see "Backup and restore" for what that does to the 14-day window.

A new, empty database: Postgres needs R2 reachable at its first start (archiving is on from the start; with R2 down the first start fails).
Order: start Postgres alone, create the roles, migrate, create the roles again so `_prisma_migrations` is closed to the app role.

```bash
cd /srv/wordmet/app
deploy/scripts/compose.sh up -d --wait postgres   # --wait: until Postgres answers; db-roles.sh needs it
deploy/scripts/db-roles.sh
deploy/scripts/deploy.sh <sha>     # migrates as wordmet_migrator, then starts everything
deploy/scripts/db-roles.sh
```

## Deploy

```bash
/srv/wordmet/app/deploy/scripts/deploy.sh <sha>
```

Order: refuse a checkout with local changes → check out `<sha>` → build `wordmet-api:<sha>` and `wordmet-api-migrate:<sha>` → database dump
(skipped on the first deploy; no WAL-G base backup, that runs from cron only) → migrate → start → wait up to 120 s (`WAIT_READY_TIMEOUT`) for api and worker to be healthy.
The Postgres image is not built here: after a change to `deploy/postgres/Dockerfile` run `compose build postgres` first.

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

### Roll back the database logins and the Postgres image

`rollback.sh` touches neither. The logins and the image roll back separately.

**Back to one login (the superuser).** In `/srv/wordmet/.env` set `APP_DB_USER` and `MIGRATOR_DB_USER` to the value of `POSTGRES_USER`, and
`APP_DB_PASSWORD` and `MIGRATOR_DB_PASSWORD` to the value of `POSTGRES_PASSWORD`, then `deploy/scripts/compose.sh up -d api worker`. The two
roles stay in the database, unused, and nothing changes in the database. In this state `db-roles.sh` refuses to run (it needs the real role
names in `.env`).

**A migration ran as the superuser while the split was on** (for example `migrate` ran with the superuser in `MIGRATOR_DB_USER`): the new
tables belong to the superuser and the app reports `permission denied` on them. Put the role names back in `.env` and run
`deploy/scripts/db-roles.sh` again: it hands those tables to the migrator and grants the app role its rows.

**Back to the plain `postgres:17` image** (no WAL-G, no archiving). Do not check out an older commit for this: cron runs the scripts from the
clone, so the older scripts (no archive check in `watch.sh`) would run too, and the next continuous deployment would put the WAL-G image back.
Use a compose override file instead; the scripts and the code stay as they are. Needs a compose that knows `!reset` (2.24 or newer).

1. Pause continuous deployment (`DEPLOY_PAUSED=true`): any `compose up` without the override puts the WAL-G image back.
2. Write `/srv/wordmet/compose.pg17.yml`:

```yaml
services:
  postgres:
    image: postgres:17
    build: !reset null
    env_file: !reset []      # no walg.env: this image cannot read it and needs none
    command:                 # the base file's list without the three archive_* flags
      [
        'postgres',
        '-c', 'statement_timeout=300s',
        '-c', 'idle_in_transaction_session_timeout=300s',
      ]
```

3. Check, then recreate Postgres only. The override has to be named on every command that changes the stack:

```bash
cd /srv/wordmet/app
pg17() { API_TAG="$(cat /srv/wordmet/state/current)" docker compose -p wordmet -f deploy/compose.prod.yml -f /srv/wordmet/compose.pg17.yml --env-file /srv/wordmet/.env "$@"; }
pg17 config --quiet && pg17 up -d postgres
deploy/scripts/compose.sh exec -T postgres psql -X -U <POSTGRES_USER> -d <POSTGRES_DB> -Atc 'SHOW archive_mode'   # off
```

The api, worker and migrate keep their role logins: the roles are in the database, so nothing else changes. (To drop them too, use "Back to
one login".) The data volume is the same one, and Postgres 17 should open it as it is: **measured** only with the `compose.prod.yml` from before
the WAL-G commit on Docker Desktop (about 270 KB of data, same rows, `archive_mode` off), not on the VPS and not with this override. Expect a
few minutes of downtime (an estimate). Without archiving there is no point-in-time restore, and `watch.sh` raises the `archive` alert "off or
unreadable" once an hour: expected; the daily dump is the only backup meanwhile.

To go back to the WAL-G image: `deploy/scripts/compose.sh up -d postgres` (no override), unpause continuous deployment, and **run
`BACKUP_KIND=deploy deploy/scripts/backup.sh` at once**. While archiving was off, no WAL reached R2, so the archive has a gap; a restore from a base backup older
than the gap stops at it. Only a base backup taken after the switch back has no gap before it.

## Backup and restore

Two independent copies of the database:

| | What | When | Kept | Restore to |
|---|---|---|---|---|
| WAL archive + base backup (WAL-G) | Postgres ships every WAL file to the WAL-G bucket (`archive_timeout=60`: at least one file a minute while the database is written); `backup.sh` adds a base backup | WAL continuously; base backup daily from cron (03:00 Vietnam time) | newest 14 base backups = 14 days (cron only; `wal-g delete retain FULL 14`) | any moment from the oldest kept base backup to the last WAL that reached R2 |
| `pg_dump -Fc` | `backup.sh` → `backups/` → R2 bucket `wordmet-backups` (`daily/` and `deploy/`) | before every deploy (`deploy/`) and daily from cron (`daily/`) | 3 on the VPS; 14 days in `daily/` and 5 in `deploy/` on R2 | the moment of the dump |

`deploy.sh` runs `backup.sh` with `BACKUP_KIND=deploy BACKUP_SKIP_BASE=1`: the deploy takes the dump only, so a WAL-G problem cannot block a deploy. The WAL-G
base backup runs only from the cron line below (or a manual run).

`wal-g delete retain FULL 14` keeps the newest 14 **base backups**, not 14 days. With one cron backup a day that is 14 days, but every manual
`BACKUP_KIND=deploy deploy/scripts/backup.sh` (the first rollout, after a restore, after a `backup` alert) adds one more and pushes the oldest day out of the window. Always pass `BACKUP_KIND=deploy` on manual runs so ad-hoc dumps land in `deploy/` instead of the locked `daily/` prefix, and run it
by hand only where a step asks for it.

Lost with a restore from the WAL archive: what was written after the last WAL file that reached R2, up to about 60 s plus the upload time.
Lost with a dump: everything since the dump. Not covered by either: Redis (queues; not backed up) and the R2 buckets of audio and the
deletion journal. An application mistake (a bad deploy, a wrong delete) can be undone to any time in the 14 days only while a base
backup from before it still exists; the restore starts from the newest base backup older than the mistake.

### Alerts and what to do

`watch.sh` (every 5 minutes) and `backup.sh` email the owner through `send-alert.sh`, one email per kind per hour.

| Alert | It fires when | First action |
|---|---|---|
| `archive`: "WAL archiving to R2 is behind" | the last WAL file reached R2 more than 15 min ago while files are waiting, or more than 20 files (`.ready`) wait in `pg_wal/archive_status` | The body shows `pg_stat_archiver` and the last `wal-g` lines. Check R2 (status page, token not revoked, `walg.env` unchanged). Waiting WAL stays in `pg_wal` and is shipped late once R2 answers; `compose exec -T -u postgres postgres wal-g backup-list` tests the key. Until it is fixed `pg_wal` grows (design estimate for sustained heavy writes: up to ~23 GB a day; the production WAL measured 104 MB a day) |
| `archive`: "WAL archiving is off or unreadable" | `archive_mode` is not `on`, or `pg_wal/archive_status` is missing | Postgres runs without the archive flags: `compose up -d postgres` with the current `compose.prod.yml`. Until fixed there is no point-in-time restore and nothing else warns |
| `disk-low` | less than 15 GB free | Look for the cause: if an `archive` alert is open, fix R2 first (it fills `pg_wal`); else images (`docker image prune`), logs. Never delete files from `pg_wal` by hand |
| `disk-critical` | less than 8 GB free | Same, now: Postgres stops writing when the disk is full |

The older `disk` alert (more than 80 % used) and `disk-low` (less than 15 GB free) fire at nearly the same moment on a 79 GB disk (80 % is
about 63 GB used, about 16 GB free): two emails for one cause, expected.
| `backup` | `backup.sh` failed: dump, upload to R2 or the WAL-G base backup (the dump is already on R2 when only WAL-G failed) | Read `logs/cron.log`, run `BACKUP_KIND=deploy deploy/scripts/backup.sh` by hand |

The daily report has one line, for example `PITR: last WAL 20 s ago, .ready 0, newest base backup base_0000…, 2026-11-20T20:00:11Z`. A large
age with `.ready 0` is a quiet database (a WAL file is shipped only after writes); a large age with `.ready` above 0 is the `archive` alert.
`PITR: unavailable` means neither Postgres nor R2 could be asked.

Rehearsed with an S3-compatible fake (SeaweedFS) using these scripts; the same flow was measured on real R2 on 21/11/2026 on a local Docker machine (RTO 41.97 s, including `wal-g backup-fetch`, PITR promote, and two idempotent `accounts:replay-deletions --journal` runs — see `docs/audit/2026-11-21-pitr-drill/README.md`).

> **Production prefix warning:** `s3://wordmet-wal/spike` is the production archive despite its name; never delete or rename it.

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

### Which restore

- **Restore order (B12):** always try **PITR (WAL-G)** first. Fall back to a **dump** (`daily/` or `deploy/`) only when PITR is impossible, and after a dump restore always run `orders:probe-payos` for the gap window and grant Pro manually as rehearsed on 21/11/2026 (`docs/audit/2026-11-21-pitr-drill/README.md`).
- **Complete VPS loss:** follow the 10-step runbook in [`docs/deliveries/runbook-vps-loss.md`](../docs/deliveries/runbook-vps-loss.md).
- **Restore to a point in time (WAL-G)** is the default: while archiving is healthy it loses about the last 60 s of writes plus the upload
  time, not a day, and it can stop just before a mistake.
- **Restore from a dump** when the WAL archive cannot be used (R2 bucket gone, no base backup old enough), or to build a database from
  a dump on another cluster.

Both start from an empty database and end the same way: roles repaired, migrations applied to the running code, deletions replayed, API and
worker started, payments reconciled. Keep API and worker stopped from the first command to the last.

Before replacing the database, verify that the deletion journal covers the interval since the backup: neither kind of backup can recover a
deletion request made after it, and the journal can. If the original database is readable, stop writes and export its deletion list first
(the export block in "Restore from a dump" below) as additional evidence. If coverage is unknown, keep traffic stopped while resolving it.

### Restore to a point in time (WAL-G)

Choose the time: a moment just before the mistake, in UTC (`2026-11-20 03:41:00+00`), or none to replay every WAL file that reached R2. The
time must be later than the end of a base backup: `wal-g backup-list` (needs no running Postgres) shows them, newest last. `LATEST` is the
newest; for a time before it, put the name of an older base backup (`base_…`) in place of `LATEST`.

```bash
cd /srv/wordmet/app
compose() { deploy/scripts/compose.sh "$@"; }
L="$(compose run --rm --no-deps -T --entrypoint wal-g postgres backup-list)"; echo "$L"
echo "$L" | grep -c '^base_'     # must print 1 or more
```

**Do not go on unless that command lists at least one `base_…` backup.** An error or a count of 0 means the WAL-G bucket cannot be read
or is empty: use "Restore from a dump" instead. The next block deletes the old data directory, so first keep a copy of it while it still
exists (a bad deploy or a wrong delete, not a lost machine). The command lists the backups only; whether `backup-fetch` can read the chosen
one is known only when the restore block runs it, which is why the copy is not optional:

```bash
BACKUP_KIND=deploy BACKUP_SKIP_BASE=1 deploy/scripts/backup.sh  # a dump to backups/ and R2; works only while Postgres still answers
compose stop postgres
df -h /srv/wordmet/backups                      # the copy is about as big as the database
docker run --rm -v wordmet_postgres_data:/from:ro -v /srv/wordmet/backups:/to --entrypoint tar \
  wordmet-postgres:17-walg-3.0.9 czf /to/postgres_data-before-restore.tgz -C /from .
```

Delete that file once the restored database is checked. A brand-new machine has neither Postgres nor a volume: skip this copy, and note it
has no `state/current` either, so `compose` runs with `API_TAG=none`. Before the first command below, run `deploy/scripts/compose.sh build
postgres` and build the API images the way `deploy.sh` does (`docker build --target api-prod -t wordmet-api:<sha> .` and `docker build
--target api-build -t wordmet-api-migrate:<sha> .`), then `export API_TAG=<sha>` in the shell you restore from and write `<sha>` to
`state/current` at the end. `deploy.sh` itself would migrate and start api and worker before the deletion replay, so do not use it here.
That sequence was not run end to end.

The restore. Stop on a command error and read it; a restore that goes wrong is started again from the first step.

```bash
cd /srv/wordmet/app
compose() { deploy/scripts/compose.sh "$@"; }
U='<POSTGRES_USER>'; D='<POSTGRES_DB>'
T='<time in UTC, e.g. 2026-11-20 03:41:00+00; empty to replay all WAL>'

compose stop api worker
compose rm -sf postgres
docker volume rm wordmet_postgres_data   # the old data directory; "no such volume" is fine after a lost machine

# New data directory: the base backup, then Postgres replays WAL from R2 up to $T and promotes itself.
compose run --rm --no-deps -T -e T="$T" --entrypoint bash postgres -s <<'EOF'
set -e
wal-g backup-fetch "$PGDATA" LATEST
touch "$PGDATA/recovery.signal"
{
  echo "restore_command = 'wal-g wal-fetch %f %p'"
  [ -z "$T" ] || echo "recovery_target_time = '$T'"
  echo "recovery_target_action = 'promote'"
} >> "$PGDATA/postgresql.auto.conf"
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
EOF

compose up -d postgres
ok=''; for i in $(seq 300); do   # up to 10 minutes
  compose exec -T postgres psql -X -U "$U" -d "$D" -Atc 'SELECT NOT pg_is_in_recovery()' 2>/dev/null | grep -qx t && { ok=1; break; }
  sleep 2
done
[ -n "$ok" ] || { echo 'not promoted after 10 minutes: read compose logs --tail 100 postgres'; false; }
compose logs --no-log-prefix postgres | grep -E 'recovery stopping|last completed transaction|selected new timeline|archive recovery complete'
compose exec -T postgres psql -X -U "$U" -d "$D" -c 'ALTER SYSTEM RESET restore_command' -c 'ALTER SYSTEM RESET recovery_target_time' \
  -c 'ALTER SYSTEM RESET recovery_target_action'

deploy/scripts/db-roles.sh                   # repairs the roles and grants; must print "left over: 0"
compose --profile migrate run --rm migrate   # the restored schema is as old as the backup: bring it to the running code
compose run --rm --no-deps -T api node dist/cli/accounts-deletions.js replay --journal
compose up -d api worker
BACKUP_KIND=deploy deploy/scripts/backup.sh  # a new base backup on the new timeline
```

What to read in the output:

- `last completed transaction was at log time …`: the moment the restored data ends (with a `T`, `recovery stopping before commit …` shows
  the first transaction left out). Write that time down, in UTC: it is the `--from` of the payment check below. Without `T` it is the last
  commit that reached R2.
- `selected new timeline ID: <n>` and `archive recovery complete`: the cluster was promoted. If the container exits instead, `compose logs
  postgres`: `recovery ended before configured recovery target was reached` means `T` is later than the WAL on R2 (take an earlier `T` or none).
- `left over: 0` from `db-roles.sh`. A restored cluster keeps its roles and grants, so the script normally changes nothing; it confirms
  the split is intact.
- Then `/v1/health/ready` and `compose logs --tail 50 api`.

The restored cluster archives to the same bucket on the new timeline, next to the old one. Old base backups stay valid until
`retain FULL 14` removes them.

Replaying the deletion journal is the step for deletions between the end of the restored data and the failure; the rules for it are in
"Set up the deletion journal" above and in the dump restore below (`replay --journal --from /dev/stdin < "$J"` when you also have an export).

### Restore from a dump into an empty database

Restore into an **empty** database, then migrate it to the running code. `pg_restore --clean` on the live database would keep tables
created after the dump and rewind `_prisma_migrations`, and the next deploy would fail on "relation already exists".

If the original database is readable, export its deletion list now, and keep the result outside it:

```bash
cd /srv/wordmet/app
compose() { deploy/scripts/compose.sh "$@"; }
U='<POSTGRES_USER>'; D='<POSTGRES_DB>'; F='/srv/wordmet/backups/<file>.dump'
compose stop api worker

umask 077
J="$(mktemp /srv/wordmet/backups/deletions.XXXXXXXX.jsonl)"
compose run --rm --no-deps -T api sh -c \
  'node dist/cli/accounts-deletions.js export --out /tmp/deletions.jsonl >&2 && cat /tmp/deletions.jsonl' > "$J"
```

Continue with the verified dump. Stop on any command error. Recovery reads the R2 journal even when the original DB is gone. A
missing initialization marker, unreadable journal or pending deletion produces a nonzero exit code. `compose run` executes the
CLI in a temporary container while the serving API and worker are stopped.

On a cluster that has never had the two roles (a new server) `pg_restore` needs them first: the dump gives its tables to
`wordmet_migrator`, and without the roles it stops at the first such statement (`role "wordmet_migrator" does not exist`). The first
`db-roles.sh` creates the roles and sets the grants on the database itself (`CONNECT` for the app role, closed to `PUBLIC`): a dump does not
carry those. The second checks the restored tables and must print `left over: 0`.

```bash
compose exec -T postgres dropdb -U "$U" --force "$D"
compose exec -T postgres createdb -U "$U" "$D"
deploy/scripts/db-roles.sh                   # creates the roles (a no-op when they exist)
compose exec -T postgres pg_restore --exit-on-error -U "$U" -d "$D" < "$F"
deploy/scripts/db-roles.sh                   # must print "left over: 0"
compose --profile migrate run --rm migrate
compose run --rm --no-deps -T api node dist/cli/accounts-deletions.js replay --journal
compose up -d api worker
```

If you also have a verified export from the original database, use `replay --journal --from /dev/stdin < "$J"` in that last
command to combine it with R2. Replay skips accounts that are already absent.

### After a restore: payments

A restore loses the orders written after the end of the restored data, but payOS still has their payment links and may hold the money. Since
the 18/11/2026 rollout (PR #303 / #307, `cad0b96a`), order codes are derived from the clock (`>= 1_100_000_000`), so a restored database never
reuses the code of a lost order (provided the server clock does not move backwards). The `orders-probe-payos` CLI lists the payOS links whose
code falls in a time window; it only reads payOS and needs no database.

With API and worker started, run the CLI for the smallest window that covers the gap: from the time the restored data ends (the
`last completed transaction` time above, or the time of the dump) to the time of the failure, both in UTC. The CLI makes about 3 payOS calls
per second of window; at an **assumed** 100 ms a call (not measured against real payOS) ten minutes would take about three minutes.

```bash
compose run --rm --no-deps -T api node dist/cli/orders-probe-payos.js --from 2026-11-20T03:41:00Z --to 2026-11-20T03:55:00Z
```

Output is one tab-separated line per link found (order code, description, status, amount, paid amount, time, payer names), printed as it is
found. A payOS error other than "not found" stops the walk: the lines already printed are real, so run it again with a later `--from`.
Exit 2 is a wrong argument (a time must be ISO 8601 with a zone, a window at most 24 hours, not before 2026-11-17).
Handling each paid link found by the CLI:
- If the `billing_orders` row **exists** in the restored database (the order was created before the backup and paid after it), confirm it with
  "Xác nhận thanh toán" in admin (`/orders`).
- If the `billing_orders` row **does not exist** in the restored database (the order was created after the backup), payOS does not store the
  buyer's `user_id`, so "Xác nhận thanh toán" has no order to attach to: match the payer's name or support receipt to the learner and grant the
  Pro period manually via "Cấp gói" (`entitlement_grants`) in admin.

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
r2 's3 ls "s3://$R2_BACKUP_BUCKET/daily/"'
r2 's3 ls "s3://$R2_BACKUP_BUCKET/deploy/"'
r2 's3 ls "s3://$R2_BACKUP_BUCKET/"'   # legacy root dumps kept for 14 days after prefix rollout
r2 's3 cp "s3://$R2_BACKUP_BUCKET/daily/<file>.dump" /backups/'
```

To protect daily dumps from accidental deletion or overwrite, lock only the `daily/` prefix of the dump bucket (never lock the WAL bucket):

```bash
wrangler r2 bucket lock add wordmet-backups daily-13d daily/ --retention-days 13
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
  `turnstile_bypassed`; disk above 80 %; less than 300 MB of memory; a service not running or unhealthy; an api or worker restart; WAL not reaching R2 or archiving
  off; less than 15 GB and less than 8 GB of free disk (what each means: "Alerts and what to do"). One email
  per kind of problem per hour, through the Resend HTTP API (`send-alert.sh`), so it still works when the app's own mail is broken.
- `daily-report.sh` (08:00 Vietnam time): yesterday's accounts, learners, practice sessions, AI calls and cost, paid orders, mails sent; 5xx count and
  p95 latency from the Caddy access log; the newest backup; the PITR line (last WAL shipped, newest WAL-G base backup); disk and memory.
- `backup.sh` (03:00 Vietnam time, and before every deploy): a failure emails the owner (alert type `backup`). The WAL-G base backup runs
  only from cron; `deploy.sh` sets `BACKUP_SKIP_BASE=1`, so a deploy takes the dump only.
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
