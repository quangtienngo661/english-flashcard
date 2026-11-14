# Bước 8 — final independent code review (29/10/2026)

Scope: `git diff origin/dev..feat/buoc-8-m7` (165 files). Spec used: design `2026-10-28-buoc-8-identity-remainder-design.md` (§5–§9, §15),
decisions D1–D33, the rulings file `docs/deliveries/buoc-8-rulings.md`. Read-only review: no source file was changed, nothing was run
except `git diff` / `grep` / a small `node -e` that compares the i18n key sets.

What "verified" means below: I read the lines named and traced the scenario through the code by hand. Nothing here was executed against
a database or against Google. Unit tests and the smoke were already green (stated by the requester), so every finding below is about a
path those do not exercise.

Counts: **Critical 1, Important 3, Minor 8.**

---

## Critical

### C1. The Google "reauth" step before deletion can be skipped: the 2-minute start ticket is accepted as the 5-minute `google_reauth` cookie

- **Where:** `apps/api/src/identity/google/google-auth.service.ts:133` (ticket), `:179` (cookie), `:139-141` (`reauthUserOf`), used by
  `apps/api/src/identity/deletion/account-deletion.controller.ts` (`deleteMyAccount`, reads the cookie) and
  `apps/api/src/identity/deletion/account-deletion-requests.service.ts:48-50` (`deleteOwn`, accepts it for a Google-only account).
- **What is wrong:** the three Google values are all "sealed" (encrypted and signed with AES-256-GCM) with the **same key**
  (`OAUTH_COOKIE_KEY`) and the **same envelope** `{exp, v}`, with no field saying what the value is for. Two of them have the identical
  payload `{ userId }`:
  - the *ticket* that `POST /v1/auth/google/reauth` returns inside `start_url` (line 133, TTL 120 s), which needs only a Bearer token;
  - the *`google_reauth` cookie* that the callback sets only after the person picked the right Google account (line 179, TTL 300 s).
  `reauthUserOf` (line 141) opens whatever it is given with that key and returns `userId` if it has not expired. It cannot tell the
  ticket from the cookie.
- **Failure scenario:** an attacker holds Lan's access token (stolen device, XSS, a leaked log; the 15-minute token is exactly what the
  reauth step is meant to be stronger than, D25 / SE6). Lan's account is Google-only. The attacker:
  1. `POST /v1/auth/google/reauth` with the Bearer token → `{ start_url: ".../start?intent=reauth&locale=vi&ticket=<T>" }`;
  2. `POST /v1/me/account/delete` with the Bearer token, `Cookie: google_reauth=<T>`, body `{ confirm_email: <Lan's email from GET /v1/me>, acknowledged: true }`.
  `reauthUserOf(T)` returns Lan's id, `deleteOwn` sees `googleReauthUserId === account.id`, and the account is erased (irreversibly). No
  Google account was ever chosen. From a browser (XSS on the learner web) the cookie can be planted with `document.cookie` on the
  parent domain when the web and the API share one (e.g. `wordmet.com` / `api.wordmet.com`); from curl it is trivial.
- **Fix direction:** put a purpose tag inside the sealed payload (`{ kind: 'reauth-ticket', userId }` vs `{ kind: 'reauth-proof', userId }`,
  likewise `oauth-state`, `signup`) and have each reader require its own kind; or derive a separate key per purpose (HKDF of
  `OAUTH_COOKIE_KEY` with a label).
- **Confidence:** verified by reading the four places above; the payload types are literally the same `ReauthTicket` type
  (`satisfies ReauthTicket` at both 133 and 179).

---

## Important

### I1. Google sign-up completion can recreate a just-deleted account under the **old id**, which the sweep then erases for 24 hours and a backup replay deletes later

- **Where:** `apps/api/src/identity/google/google-auth.service.ts:243-256`.
- **What is wrong:** `complete()` reads the unverified account for the email **outside** the transaction (`known`, line 243) and takes its id
  (`userId = known?.id ?? randomUUID()`, line 244). Inside the transaction, under the user lock, it reads again; when the row is gone
  (`!existing`, line 255) it **creates a new user with that same id** (line 256). The password registration in `auth.service.ts:63-74` does
  not have this problem: it reads inside the transaction and answers `email-taken` when the row vanished.
- **Failure scenario:** X registered `minh@gmail.com` with a password 8 days ago and never verified. The hourly `identity.unverified-cleanup`
  starts deleting that account (id U). At the same moment the real Minh finishes the Google sign-up page: `known.id = U`; his transaction
  waits on `identity.user:U` while the cleanup's Tx B holds it; Tx B commits (`users` row U gone, `deleted_accounts(U, 'cleanup')`
  written); Minh's transaction gets the lock, finds no row and creates his new, verified account **with id U**. Consequences:
  `identity.deletion-sweep` (`deletion-jobs.service.ts:213-230`) re-runs every module eraser for U every hour for 24 hours, so Minh's
  groups, review schedule, private words, sentences, practice history, subscriptions and grants are silently erased as he creates them;
  and `pnpm accounts:replay-deletions` after any later backup restore deletes his whole account (U is in `deleted_accounts`). The same
  happens if an admin deletes the unverified account at that moment.
- **How likely:** rare (needs the cleanup or an admin delete to overlap the completion within the same seconds), but the damage is silent
  and repeated.
- **Fix direction:** when `existing` is null inside the transaction, create with a fresh `randomUUID()` (never `known.id`), or answer
  409 `email-taken` like `register` does; optionally also refuse any id present in `deleted_accounts`.
- **Confidence:** verified by reading `complete()` and the sweep; the sweep's selection is "every `deleted_accounts.user_id` in the last
  24 hours", with no check that no `users` row exists again.

### I2. An account stuck in `deleting` because its plan renews again (B8E52) can never be finished: the retry fails every hour and the admin "delete" deliberately skips turning renewal off

- **Where:** `apps/api/src/entitlements/account-deletion.provider.ts:87` (eraser throws while a subscription renews),
  `apps/api/src/identity/deletion/account-deletion-requests.service.ts:60-62` (admin path skips the turn-off for a `deleting` target),
  `apps/api/src/identity/deletion/deletion-jobs.service.ts:195-206` (retry, `checks: 'normal'`).
- **What is wrong:** design B8E52 says a `cancel_unscheduled` webhook arriving between Tx A and Tx B makes Tx B fail "and the retry job tries
  again". But nothing ever turns the renewal off again: the learner cannot sign in (`deleting` is refused by the guard, refresh and
  login), the retry job runs Tx B with the same check and fails each hour, and when an admin presses "Xóa tài khoản" (B8E43) the code
  skips `turnOffRenewalForAdminDelete` because of `target.status !== 'deleting'`, with the comment "its plans are already gone or a retry is
  finishing them" — false in exactly this case. Each admin press returns 202 "pending".
- **Failure scenario:** Lan cancels her Pro plan, presses delete; Tx A commits; a `cancel_unscheduled` event (e.g. she had re-enabled
  renewal in the store earlier and the provider delivers it late) is applied in the window (the event applier still knows the user while
  the row exists) → Tx B throws `renewing subscription` → `deleting`. From then on: retry fails hourly, `account_deletion_stuck` is
  logged after 24 h, the admin's delete returns 202 forever, and the provider keeps charging her. The legal 20-day deletion deadline
  (§1) is missed with no in-app way out; only manual SQL fixes it. `retryStuck` also takes only the 100 oldest stuck accounts
  (`take: 100`), so a backlog of such accounts would starve newer ones.
- **Fix direction:** in `deleteByAdmin`, run the D31 turn-off also when the target is `deleting` (the comment's premise is wrong); and/or
  let the retry job call the turn-off before Tx B when the eraser refused for this reason.
- **Confidence:** verified by reading the three places; the `cancel_unscheduled` transition exists (`subscription-machine.ts:173-176`).
  Very rare in practice, but the outcome has no recovery path.

### I3. A Google-only learner whose 5-minute Google proof expired is told to confirm again but cannot (B8E19)

- **Where:** `apps/web/src/features/learner/settings/DeleteAccountPage.tsx:102`, `:145`.
- **What is wrong:** the page decides "proven" from the address `?reauth=ok` and disables the "Xác nhận bằng Google" button whenever
  `reauth === 'ok'` (line 145, label "Đã xác nhận bằng Google"). When the API answers 403 `reauth-required` (cookie older than 5 minutes,
  B8E19), the page only shows the text "Hãy xác nhận lại bằng tài khoản Google…" (`onSubmit` → `setError`); `?reauth=ok` stays in the
  address, so the button stays disabled and the red button stays enabled. Design B8E19: "màn hiện lại nút 'Xác nhận bằng Google'".
- **Failure scenario:** Minh (Google only) confirms with Google, reads the warning list for 6 minutes, ticks, types his email, presses
  "Xóa vĩnh viễn" → 403 → message asks him to confirm again; the only Google button is greyed out. Pressing delete again gives the same
  403. He has to edit the URL or leave and come back.
- **Test gap:** `delete-account.test.tsx:160-168` checks only that the text appears, not that the button becomes usable.
- **Fix direction:** on `reauth-required`, drop `reauth=ok` from the address (or keep a local "proof expired" state) so the Google button is
  enabled again and the red button disabled.
- **Confidence:** verified by reading the component and its test.

---

## Minor

### M1. `accounts:replay-deletions` never finishes a restored account that was `deleting` with `by='self'`
`apps/api/src/identity/deletion/account-deletion.service.ts:94-96`: `if (user.status === 'deleting') return by === 'self' ? 'pending' : 'go';`
ignores `mode`. A backup taken while a learner's deletion was under way (or stuck, I2) restores the row as `deleting`; replay
(`cli/accounts-deletions-args.ts:111-118`) passes `by` from `deleted_accounts` (`'self'`) → Tx A returns `'pending'` → the CLI lists it as
pending and exits 2, telling the operator to run it again, which gives the same result forever. The hourly retry job eventually finishes it,
but with `checks: 'normal'` (B8E53 says a replay skips the checks), so a restored "renewing" row would block it (I2). Fix: treat
`mode === 'replay'` like the admin branch (`'go'`). Verified by reading.

### M2. The `next` page is lost on the Google sign-up path
`google-auth.service.ts:208` stores `next` in the sign-up ticket (design §5.4 lists it), but nothing reads it: `GoogleComplete.tsx:69`
always goes to `/{locale}/app`. A new person who pressed Google on `/vi/app/login?next=/vi/app/groups` lands on `/vi/app`. (B8E46 is only
written for the login path, so this is a gap, not a contradiction.) Verified by reading.

### M3. A partial D31 turn-off returns 409 "nothing was changed" but some plans were already cancelled
`entitlements/account-deletion.provider.ts:65-79`: with two renewing subscriptions where one provider call succeeds and one times out,
the successful one is written `cancel_at_period_end = true`, then `'not_supported'` → 409 `renewal-not-cancelled` ("Chưa tắt được gia hạn…
nên chưa xóa"). The account stays, one plan will now end, and the admin message does not say so. Also, the turn-off happens before Tx A's
`last-admin` check, so in the two-admins-delete-each-other race (B8E40) the losing request has already cancelled the target's renewal.
Low impact. Verified by reading.

### M4. Admin deletion of an unverified account mails "your account was deleted" to an address nobody confirmed
`account-deletion.service.ts:144` sends the mail for every `by` except `cleanup`/replay. An admin deleting a never-verified sign-up (often a
typo or a squatted address) sends the mail to that unconfirmed address — a stranger who never had an account. Suggest skipping the mail
when `email_verified_at` was null. Verified by reading.

### M5. Any page address with `?signed_in=google` clears the "sign-out did not reach the server" flag
`apps/web/src/app-shell/session/session-store.ts:245-246` clears `logout-pending` whenever the URL has `signed_in=google`, then refreshes
with whatever `refresh_token` cookie exists. If a sign-out failed (offline) and the tab later opens any link carrying that parameter, the
old session — the one the person tried to end — resumes silently (FE38's purpose). Narrow (same tab, sessionStorage), but the parameter
is not tied to a real Google return. Verified by reading.

### M6. "Xóa tài khoản" is shown for the last admin
`apps/admin/src/features/users/UserDetail.tsx:102` (`canDelete = canManage && user.id !== meId`): design §10 says the button is hidden for the
last admin; the code relies on the API's 409 `last-admin` (the comment says so). Cosmetic spec deviation. Verified by reading.

### M7. The late-row sweep re-processes every clean-up deletion for 24 hours
`deletion-jobs.service.ts:213-230` sweeps every `deleted_accounts` row of the last 24 h, including `by='cleanup'` ones, which never had a
session and so cannot have late rows. With the cleanup at up to 200 accounts/hour, that is up to ~4,800 six-eraser transactions per hour,
in both the API and the worker. Performance only; filter on `by <> 'cleanup'`. Verified by reading.

### M8. A rate-limited Google callback shows raw JSON instead of returning to the app
`google-auth.controller.ts` puts `@RateLimit('auth.google.ip')` (20/min/IP) on `GET /callback` and `GET /start`, which are browser
navigations; a 429 there renders a Problem Details JSON page instead of `/{locale}/app/login?error=…`. Several people behind one NAT
(school, office) can hit 20/min. Suspected from reading (the rate-limit guard throws before the handler); not run.

---

## Checked and found fine

- `state` is compared to the sealed `google_oauth` cookie, the cookie is cleared on every callback outcome, Google `error=` and a missing
  `code` short-circuit before any exchange (B8E1).
- PKCE: verifier 48 random bytes, S256 challenge sent, verifier sent in the exchange; nonce 24 random bytes, checked against the ID token.
- AES-256-GCM sealing uses a fresh random 12-byte IV each time (`grace-cipher.ts`), and expiry is inside the sealed text.
- Real client ID-token checks: signature via Google JWKS, `iss` ∈ both Google forms, `aud` = client id, `exp` (jose default), nonce,
  algorithms limited to RS256/ES256, `sub` and `email` required, `email_verified` accepts `true` and `"true"` only.
- `next`: parsed with `new URL` against `LEARNER_APP_URL`, same origin required, path must start `/vi/app` or `/en/app`; dot segments,
  `//host`, backslashes resolve before the check (B8E39). All redirects are absolute URLs on the learner web.
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, paths `/v1/auth/google` and `/v1/me/account`, TTLs 600/900/300 s as designed.
- `POST /v1/auth/google/complete` requires `X-CSRF-Protection: 1`; reauth and delete routes are Bearer-only (no cookie-only CSRF path).
- K8 decision table: lookup by `sub` first; email auto-link only to a verified, `active` account with no identity yet; `locked`/`deleting`
  refused without linking; an unverified account goes through the sign-up page; under-13 writes nothing and clears the ticket; a second
  completion hits the unique index → 409.
- Unverified-account takeover direction (B8E6): the Google owner overwrites the squatter's profile, password is deleted, sessions revoked.
- Fake Google: route answers 404 unless mode is `fake`; config refuses `GOOGLE_FAKE_ENABLED` with `BILLING_PRODUCTION`; `redirect_uri`
  must equal the configured one.
- Guard (D24, D29): every non-public route reads the chain joined to the user; missing chain, chain of another user, revoked chain,
  `locked`, `deleting` → 401. Public routes do not use `req.user` for writes. Refresh revokes a `deleting` chain; password login treats
  `deleting` as a generic failure without counting it; password reset and OTP only for `active`.
- Google sessions refused on every staff route (all `admin/*` controllers use `@RequirePermission` → `PermissionGuard`); `/v1/me` returns
  `auth_method` and `sign_in_methods`; admin store logs out on `auth_method = google` and on 403 `password-login-required`.
- Deletion Tx A: staff-role lock before the user lock (same order as `setStaffRole`), staff hint re-checked under the lock with one retry;
  last-admin count excludes `deleting` both here and in `setStaffRole`; `self-delete`, `staff-account`, `subscription-renewing` re-checked
  inside Tx A; sessions revoked and OTPs invalidated in Tx A.
- Tx B: own 120 s timeout plus `SET LOCAL statement_timeout`; re-reads the row under the lock (missing = done); one random anon id; fail-closed
  registry (missing eraser/precondition/settings port throws); `deleted_accounts` with `skipDuplicates`; mail after commit, failure logged
  only.
- Every column in `account-data-map.ts` matches what the erasers actually do (checked each eraser against the map and against all
  `@db.Uuid` columns in `prisma/models/*.prisma`): Practice (items before questions, private-sense reports deleted, other reports
  anonymised with note and learner answer fields blanked — the JSON paths match `snapshot.ts`), Learning, Content (bulk private entries,
  sentences), Notifications, Entitlements (events by user/app user/subscription, grants with cascading changes, subscriptions, trial
  history, notices by user or recipient, fake rows; usage and transactions anonymised), AI (contents, operations, `ai_calls.user_id` null),
  idempotency keys. No cross-module FK blocks the deletes (`practice_reports.item_id` is SET NULL, grant changes CASCADE).
- Late billing events for an unknown user are stored without `app_user_id`, `user_id`, payload or raw payload (B8E25).
- D31 admin path: provider called outside any transaction and lock, bounded by `callAdapter`'s timeout (never throws), local flag written
  under `entitlements.user`, logs carry only subscription ids.
- Cancel endpoint: own subscriptions only (others look "not cancellable"), `Idempotency-Key` required, provider failure → 503, store
  subscription → 409 `cancel-in-store`.
- Unverified clean-up re-checks verified/role/status/cut-off under the lock; transactions-expire is one idempotent `DELETE`.
- Re-registration while `deleting` → 409 `email-taken` with `reason: account-deleting`; web shows the dedicated text.
- Web: Google button builds the start URL with `URLSearchParams`; `signed_in=google` is removed from the address; delete uses
  `useSubmitOnce`; `endAfterDeletion` signs out every tab; Google completion uses a plain credentialed `fetch` with the CSRF header.
- i18n: web and admin `vi.json`/`en.json` have identical key sets (checked with a script); every new API error slug the screens can get
  is in the known-slug lists with a message.
- Logs and mails: deletion, linking and sign-up logs carry only `user_id`/`subscription_id`; the two new mails carry no other person's data.

## Declined to judge

- **Browser cookie behaviour after the Google redirect** (`refresh_token` is `SameSite=Strict`, set on a navigation that started at
  `accounts.google.com`) and **PKCE acceptance by a Web client with a secret**: both are the open `ASSUMPTION`s N2 of the rulings; only the
  real Google run (D32) can settle them.
- **Clock skew on the real ID token:** `jwtVerify` is called without `clockTolerance`. If Google's tokens carry `nbf`/`iat` slightly ahead
  of the server clock, sign-ins could fail intermittently. I could not confirm from the code which time claims Google sends; worth a
  `clockTolerance` of a few seconds if the real run shows `google-failed` spikes.
- **Fake Google as an authentication bypass:** with `GOOGLE_FAKE_ENABLED=true` anyone can mint a verified ID token for any email and, via
  K8, sign into any verified account. The only production guard is `BILLING_PRODUCTION=true`. Whether every internet-reachable
  environment (staging, a demo box) will set that flag is a Deploy decision, not visible in code; the deploy checklist should say so
  explicitly because the impact is account takeover, not fake payments.
- **Request duration:** a deletion request can legitimately take up to 120 s (Tx B). Whether the future reverse proxy / hosting allows
  that (many cut at 60–100 s) is a Deploy question; a cut connection still leaves the deletion committed or `deleting`, so the data side is
  safe, but the web would show a network error.
- **Lock-order deadlocks** beyond the one the design already accepts (`deleteMyWord`): I checked the advisory-lock call sites and found
  the same order everywhere (identity.user → practice → learning → content.private → entitlements.user → pools), but row-lock ordering
  inside bulk deletes cannot be decided from code alone.
- **`google-round1-account.mjs`** marks an existing unverified account verified and has no database-name guard; it is a documented
  test-only helper, so I did not rate it, but it should never be pointed at a shared database.
