I reviewed the [plan](</E:/Working/Working project/english-learning/docs/superpowers/plans/2026-10-07-buoc-1-identity-core.md>), [design](</E:/Working/Working project/english-learning/docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md>), existing API implementation and test harness, and relevant installed/library sources. No files were modified. This is a static review; I did not run migrations or tests.

1. **Blocker — Security writes would roll back with the errors they are meant to record.**  
   **Task/step:** Task 7 Step 2; Task 9 Step 2; Task 11 Step 2.  
   **Problem:** `checkCode(tx, ...)` explicitly increments attempts/failures and then throws. Refresh similarly performs revocation and returns an error inside “one transaction.” An exception escaping a Prisma interactive transaction rolls back its writes.  
   **Failure scenario:** Every incorrect reset code returns 400 while its attempt count remains unchanged. A reused refresh token returns 401 while its chain remains usable. OTP notification mail might nevertheless escape the rolled-back transaction.  
   **Fix:** Return a discriminated outcome from the transaction, commit security state, then translate the outcome into an HTTP exception. Dispatch notifications only after commit. Assert persisted state using a separate query after each rejected request. Prisma documents this rollback behavior explicitly. [Prisma 7 transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)

2. **Blocker — OTP validation is not an atomic state transition.**  
   **Task/step:** Task 9 Steps 1–2; Task 11 Steps 1–2.  
   **Problem:** The wrong-code path does not condition `recordOtpFailure` on `updateMany.count === 1`; the correct-code path merely “sets `consumed_at`.” Checking the cumulative lock and consuming a code are not serialized with concurrent failures. Issuance also lacks an explicit serialization rule.  
   **Failure scenario:** Ten concurrent wrong submissions increment `attempts` only five times but cumulative failures ten times. Two reset requests can both read the same unconsumed code and both replace the password. A correct request can consume a code after another transaction exhausts its attempts or locks the purpose. Two overlapping issuances can leave two live codes.  
   **Fix:** Serialize operations for each `(userId, purpose)` using a stable row/advisory lock, with a documented lock order. Make successful consumption conditional on all validity predicates, including `attempts < 5`; increment cumulative failures only when an attempt was actually claimed. Commit the 21st-failure lock transition and emit one post-commit notification. Add controlled concurrent tests for these interleavings.

3. **Major — Refresh CAS protects the token row, not the complete session invariant.**  
   **Task/step:** Task 7 Steps 1–2.  
   **Problem:** The initial chain check and successor check can become stale while another transaction revokes the chain or rotates its successor. The loser is instructed to reread “the row,” without explicitly rereading the chain, successor, and current clock after waiting.  
   **Failure scenario:** Refresh reads an active chain, logout commits, then refresh rotates and returns a newly signed access token. Because ordinary access-token validation is stateless, that token remains useful. A grace request can likewise return a successor already rotated by another request.  
   **Fix:** Establish a serialization point shared by refresh, logout, reuse revocation and password-driven revocation—such as locking the chain row before checking state. Recheck chain, successor and `Clock.now()` after acquiring the lock. Document lock ordering and transaction bounds. Use barriers to test revocation and successor rotation between the original read and write, rather than only testing revocation completed beforehand.  
   The underlying claim that a competing PostgreSQL `UPDATE` waits and re-evaluates its predicate under READ COMMITTED is correct; it does not extend automatically to earlier reads of other rows. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

4. **Major — Login lockout and password updates have concurrency races.**  
   **Task/step:** Task 10 Step 2; Task 11 Step 2.  
   **Problem:** Atomic increment followed by a separate threshold/reset update is not an atomic lockout transition. The locked check happens earlier. Credential verification and successful rehash/change also lack a stale-credential check.  
   **Failure scenario:** Concurrent failures pass the unlocked check and later increment or extend a newly established lock. A successful login resets a counter while another failure establishes a lock. More seriously, login verifies an old password, reset commits a new password, then login creates a session—or its rehash overwrites the reset password.  
   **Fix:** Share one concurrency-safe credential/lockout implementation between login and password change. Use a conditional SQL transition or user-row locking, and revalidate the credential version/hash before committing successful authentication or replacement. Serialize reset/change with these transitions. Add concurrent threshold, success-versus-failure and reset-versus-login tests.

5. **Major — Required dependency injection and guard registration are unspecified.**  
   **Task/step:** Task 2 Steps 2–4; Task 3 Steps 2–3; Tasks 8–13 implementation steps.  
   **Problem:** Providing `APP_CONFIG` and `Clock` in `AppModule` does not make them available automatically to imported modules. No common module/export arrangement is supplied. The new `RateLimit` decorator is described as metadata, while Identity routes omit `@UseGuards(RateLimitGuard)` and no global rate-limit guard is registered.  
   **Failure scenario:** Nest cannot construct `IdentityModule` or `SampleModule`; alternatively, Identity endpoints run with their IP/write limits silently inactive. Existing sample tests also construct `SampleModule` independently and are not scheduled to receive its new dependencies.  
   **Fix:** Define an explicit common/config/rate-limit module graph and exports. Register rate limiting globally after authentication, or make its decorator apply the guard. Update `sample.module.ts` and `sample.e2e-spec.ts` in Task 3. Include the staff-role write endpoint’s `user.write` limit.

6. **Major — Several tasks consume artifacts produced later.**  
   **Task/step:** Tasks 2, 3, 6, 8 and 9, before their pass/commit steps.  
   **Problem and consequence:**

   | Consumer | Later producer | Consequence |
   |---|---|---|
   | Task 3 `normalizeEmail` | Task 4 | Missing import |
   | Task 6 mail templates’ `OtpPurpose` | Task 9 | Missing type/module |
   | Task 8 helper’s `StaffRole` | Task 12 | Missing type/module |
   | Task 9 modifies `auth.schemas.ts` | Task 10 creates it | Conflicting ownership/order |
   | Tasks 2/6 capturing-log tests | Task 14 adds `logs` sink | Tests cannot use the promised harness |
   | Task 2 config/default-limit implementation | Task 3 fills rule definitions | Intermediate contract is incomplete |

   **Fix:** Move shared domain types and logging support to their first consumers, and make Task 9 the initial owner of OTP schemas. Define usable rule defaults in Task 2. Also resolve `SessionService`’s “all errors: 401” against its required chain-rate-limit 429, and Task 3’s exception example against the existing required `title` field.

7. **Major — Validation schemas are not connected to Nest’s parameter metadata.**  
   **Task/step:** Task 2 Step 2; Tasks 8–13 controller implementation steps.  
   **Problem:** Installing `StandardSchemaValidationPipe` globally does not discover standalone Zod schemas or TypeScript types. The installed pipe validates only when `metadata.schema` exists. The plan also promises rejection of extra fields but does not require strict object schemas.  
   **Failure scenario:** An engineer writes `@Body() body: RegisterInput`; malformed input reaches services unchecked. An invalid admin UUID reaches Prisma and becomes 500. Ordinary Zod objects can strip extra properties instead of rejecting them.  
   **Fix:** Specify `@Body({ schema: registerSchema })` and equivalent query/parameter bindings, with strict schemas where extra fields must fail. Define schemas for every endpoint, including pagination bounds and UUID parameters. Add malformed-input tests beyond registration.  
   The pipe’s default error shape **is** a message array, but the filter must read `exception.getResponse().message`, not `exception.message`.

8. **Major — The planned bootstrap cannot satisfy the malformed/oversized-body tests.**  
   **Task/step:** Task 2 Steps 3–4; Task 10 Step 1.  
   **Problem:** Installed body-parser defaults to 100 KiB, so a 1 MB password never reaches login’s length check. The filter only recognizes Nest `HttpException`, while the oversized-body error is an Express error. Also, Nest registers its parser before module middleware, so malformed JSON can fail before `operationIdMiddleware` runs.  
   **Failure scenario:** B1E2 returns 500 through the custom filter instead of the required login 401; malformed JSON has no `operation_id`.  
   **Fix:** Register request context before parsing. Explicitly choose a bounded parser limit large enough for the promised 1 MB test, and map parser errors deliberately. Alternatively, revise and explicitly accept B1E2’s transport-level status. Test oversized registration as well as login.

9. **Major — JWT verification does not require the claims the contract assumes.**  
   **Task/step:** Task 5 Steps 1–3.  
   **Problem:** `algorithms`, `issuer`, `audience` and `currentDate` do not require `exp`, `sub` or custom `sid`. `jose` validates expiration when present; it does not require it by default.  
   **Failure scenario:** A correctly signed malformed token without `exp` is accepted indefinitely, or missing/malformed identifiers produce invalid `RequestUser` values and downstream database failures.  
   **Fix:** Require `exp`, `iat`, `sub` and `sid`; validate finite numeric dates and identifier types/formats before constructing `RequestUser`. Require a configured string `kid`. Add missing-claim and malformed-claim tests, alongside the existing algorithm/key tests. [jose 6.2.12 source](https://raw.githubusercontent.com/panva/jose/v6.2.12/src/lib/jwt_claims_set.ts)

10. **Major — B1#7 and B1E22 are mutually contradictory.**  
    **Task/step:** Task 9 Step 1 and `verifyEmail` implementation.  
    **Problem:** The task requires a successful verification followed by replay to return 400, but also requires every already-verified user’s verification call to return 200 without checking the code. The design contains the same contradiction.  
    **Failure scenario:** The second request satisfies both conditions, so no implementation can pass both tests.  
    **Fix:** Resolve the endpoint contract explicitly. For example, keep already-verified verification idempotent at 200 and test consumed-code rejection directly through `checkCode` or the reset flow; amend B1#7 accordingly.

11. **Major — Mail dispatch is neither guaranteed post-response nor consistently post-commit.**  
    **Task/step:** Task 6 Step 2; Task 9 Step 2; Tasks 10–11 Step 2.  
    **Problem:** Calling an async operation without awaiting it starts work immediately; it does not schedule it after the response. OTP locking dispatches from inside the transaction. Registration’s post-commit OTP creation also has no defined error boundary.  
    **Failure scenario:** SMTP starts before the HTTP response, a lock notification is sent for a rolled-back lock, or registration returns an error after its user/session transaction already committed.  
    **Fix:** Separate committed domain outcomes from outbound work. Attach a dispatch batch to response completion, capture its operation ID, and make all deferred creation/sending failures observable without changing the completed response. Define whether OTP persistence happens before response and test that SMTP is not invoked before completion.

12. **Major — The timing-equality rationale overstates what the plan does.**  
    **Task/step:** Task 9 Step 1; Task 10 Step 1; design B1E28.  
    **Problem:** B1E28 says Argon2 dominates both failed-login and reset-request branches, but neither reset-request branch calls Argon2. Known reset requests perform extra OTP writes. A spy on `verify-or-verifyDummy` also does not prove that `verifyDummy` actually invokes Argon2 once.  
    **Failure scenario:** Tests pass while unknown-email reset requests have materially less work; the documented acceptance is based on a mitigation that does not exist.  
    **Fix:** Separate the two claims. Verify actual Argon2 invocation for failed-login branches, including the dummy path. For resets, explicitly accept the remaining database-work timing difference or specify a concrete mitigation. Preserve the already accepted residual difference without claiming equal timing.

13. **Major — Parallel e2e isolation does not cover global state.**  
    **Task/step:** Task 2 Step 2; Task 13 Step 1; Task 14 Step 1.  
    **Problem:** Existing global setup shares one database across test files. Unique emails, random HMAC keys and per-app mail-budget keys do not isolate global staff counts or unscoped cleanup.  
    **Failure scenario:** An “only admin” test sees admins seeded by earlier tests. Staff pagination includes unrelated fixtures. Maintenance using a future FakeClock deletes another suite’s sessions, OTPs or counters.  
    **Fix:** Allocate separate databases/schemas to suites that operate on global state, with correct adapter configuration; alternatively serialize those suites and explicitly reset their complete state. Keep individual assertions scoped where possible. Ensure `close()` drains mail and disconnects Prisma—the existing Prisma provider does not supply a disconnect lifecycle hook.

14. **Major — `trustProxy: true` is treated as a deployment toggle without its security prerequisites.**  
    **Task/step:** Task 2 Step 2; Task 10 Step 1; Task 14 Step 4.  
    **Problem:** Boolean `true` trusts the leftmost forwarded address. The plan documents the danger of leaving it disabled behind a proxy, but not the danger of enabling it with untrusted forwarding headers.  
    **Failure scenario:** A client changes `X-Forwarded-For` to evade login, registration and mail IP limits.  
    **Fix:** Support explicit trusted proxy addresses/subnets or document and enforce a topology where the final proxy overwrites forwarding headers and the API cannot be reached directly. Test spoofed headers from an untrusted peer. [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/)

15. **Major — Configuration accepts an invalid AES key and leaves operational settings undefined.**  
    **Task/step:** Task 2 Steps 1–2; Task 7 Step 2.  
    **Problem:** “Secrets must decode to ≥32 bytes” is insufficient for `REFRESH_GRACE_KEY`: AES-256 requires exactly 32 bytes. New settings such as `MAIL_BUDGET_KEY`, maintenance enablement and SMTP secure mode have no complete environment/default mapping. The design says limits are configurable, while most security durations/counts are only constants in the plan.  
    **Failure scenario:** A 48-byte grace key passes startup validation and refresh fails at runtime. A random production budget key gives each instance a separate provider budget.  
    **Fix:** Validate the AES key at exactly 32 bytes, define all environment names/defaults, and require a stable production budget namespace shared across instances. Either expose the promised security settings or explicitly accept fixed values. Keep token `expires_in` consistent with configurable `accessTtlSeconds`.

16. **Major — The documented clean-checkout and local verification workflow is incomplete.**  
    **Task/step:** Task 1 Step 4; Task 9 Step 2; Task 13 Step 2; Task 14 Steps 2–3.  
    **Problem:** Copying `.env.example` to `.env` does not load it into the current application or Prisma config. Existing e2e global setup migrates but does not generate the ignored Prisma/TypedSQL artifacts. The migration-directory diff requires shadow-database configuration absent from the plan. Commands use POSIX environment assignment despite the PowerShell workspace.  
    **Failure scenario:** A new engineer follows the instructions and encounters missing environment variables, generated imports, or a failing schema comparison before implementation tests can run.  
    **Fix:** Add explicit environment loading for API, CLI and Prisma; provide executable PowerShell commands and key-generation instructions. Make the clean-checkout pipeline start a database, migrate, generate TypedSQL/client once, then run tests. Configure a shadow database or compare the migrated datasource against the schema. Verify the generated `User` export after Task 4, using the actual generated `.ts` files. TypedSQL’s live-database requirement is real. [Prisma TypedSQL](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/typedsql)

17. **Major — Nominal criterion coverage leaves material assertions missing.**  
    **Task/step:** Task 7 Step 1; Task 8 Step 1; Task 9 Step 1; Tasks 10–13 Step 1.  
    **Problem:** Every B1 criterion is referenced, but a reference does not prove its full behavior. Missing assertions include:

    - **B1#6:** the same normalized email sharing limits across both OTP purposes.
    - **B1#9:** the reverse purpose mismatch—verification code used for reset.
    - **B1#10/B1E17:** locked reset submissions, 24-hour lock duration/unlock, window reset, purpose independence and no counting when no eligible code exists.
    - **B1#15–16:** persisted `lastUsedAt`, a fresh access-token expiry on grace, and `refresh_grace_used`.
    - **B1#21:** web login and cookie expiry near the absolute 365-day limit.
    - **B1#22:** preservation of device label/client type.
    - **B1#23:** persisted code consumption, replay rejection and reset notification.
    - **B1#27:** an actual permission change on the next request, beyond profile display.
    - **B1E13:** ordinary routes still accepting an otherwise-valid token after revocation.
    - **B1E10:** both transport-mismatch directions and logout behavior.

    **Failure scenario:** These behaviors can be omitted while the named tests remain green.  
    **Fix:** Add the assertions to their owning tasks and maintain an assertion-level traceability matrix. Keep explicitly accepted exceptions separate from executable coverage.

18. **Minor — Nodemailer’s three timeout settings do not impose a ten-second send deadline.**  
    **Task/step:** Task 6 Steps 1–2.  
    **Problem:** Connection and greeting timeouts cover separate phases; socket timeout measures inactivity. DNS has another timeout.  
    **Failure scenario:** A slowly progressing SMTP exchange lasts far longer than ten seconds and leaves dispatcher work pending.  
    **Fix:** Either describe these accurately as phase/inactivity limits or implement a total deadline with actual transport cancellation/closure. Add a stalled/slow-server test; `Promise.race` alone does not cancel sending. [Nodemailer timeout definitions](https://nodemailer.com/smtp)

19. **Minor — `needsRehash` needs explicit target options and stronger tests.**  
    **Task/step:** Task 4 Step 1; Task 10 Steps 1–2.  
    **Problem:** `argon2.needsRehash(hash)` compares against library defaults, not the parameters used by the previous `hash()` call. It detects parameter differences, not specifically weaker parameters.  
    **Failure scenario:** Every successful login unnecessarily rehashes an already-current credential; a stronger stored configuration may be downgraded unintentionally.  
    **Fix:** Pass the shared explicit parameter object. Test that current hashes return false and define behavior for stronger hashes. The synchronous boolean return type in the plan is correct. [argon2 0.45.1 source](https://raw.githubusercontent.com/ranisalt/node-argon2/v0.45.1/argon2.cjs)

20. **Minor — Logging and maintenance interfaces do not fully support their requirements.**  
    **Task/step:** Task 2 Steps 2–3; Task 6 Step 2; Task 14 Steps 1–2.  
    **Problem:** The logger contract exposes only `log()`, although reuse and budget events require warn severity. `/health` currently produces no application log for the proposed capture assertion. Key-based redaction does not protect secrets embedded in arbitrary error strings. Maintenance in `common` directly accessing Identity tables conflicts with D3.  
    **Failure scenario:** Audit tests miss required severity, an SMTP error embeds a recipient address, or implementation violates the declared module boundary.  
    **Fix:** Define structured severity-aware logging and safe error serialization, inject the sink from Task 2, and create operation IDs for CLI/background work. Test an actual request log and hostile error content. Keep Identity cleanup inside Identity behind an explicit service contract.

The coverage mapping is complete at the **task-reference level**, subject to the failures and missing assertions above:

| Design criteria | Planned task ownership |
|---|---|
| B1#1–3 | Tasks 4, 10, 11 |
| B1#4–10 | Tasks 9, 11 |
| B1#11–13 | Task 10 |
| B1#14 | Task 5 |
| B1#15–19 | Tasks 7, 10 |
| B1#20–21 | Tasks 8, 10 |
| B1#22–23 | Task 11 |
| B1#24–25 | Task 12 |
| B1#26–29 | Task 13 |
| B1#30 | Tasks 6, 9, 10 |
| B1#31 | Task 5 |
| B1#32 | Task 14 |
| B1#33 | Task 3 |

| Edge cases | Coverage or acceptance |
|---|---|
| B1E1–4 | Tasks 4, 10, 11; E2 transport conflict noted above |
| B1E5–7 | Task 7; concurrent interleavings need stronger tests |
| B1E8 | Tasks 7, 14; delayed physical erasure explicitly accepted |
| B1E9 | Concurrent cap overshoot explicitly accepted |
| B1E10 | Task 7, incomplete transport coverage |
| B1E11 | Chromium localhost behavior explicitly accepted; no browser test |
| B1E12–14 | Tasks 5, 13; ordinary-route E13 assertion missing |
| B1E15 | Task 6 |
| B1E16 | Crash-related mail loss explicitly accepted; failing-mailer test is not a crash test |
| B1E17 | Task 9, incomplete |
| B1E18 | Reset-lock denial of service explicitly accepted |
| B1E19–23 | Tasks 9–12; E22 contradicts B1#7 |
| B1E24 | Tasks 2, 10; isolation incomplete |
| B1E25 | Task 10; deployment requirement needs concrete documentation |
| B1E26–27 | Tasks 4, 10, 13 |
| B1E28 | Residual timing accepted, but stated Argon2 rationale is wrong for resets |
| B1E29–30 | Tasks 8, 14 |
| B1E31 | Tasks 1, 4; explicit generated-`User` assertion missing |

Other library claims checked: Prisma `updateMany()` returning `{ count }` is correct; `schema: 'prisma'` is the correct multi-file arrangement with the generator and migrations at that level; manually supplying Secure cookies in HTTP supertest requests is appropriate. These do not eliminate the transaction, schema-generation or browser-coverage issues above. [Prisma updateMany](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference#updatemany), [multi-file schema configuration](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/location)

**Verdict: not ready.**