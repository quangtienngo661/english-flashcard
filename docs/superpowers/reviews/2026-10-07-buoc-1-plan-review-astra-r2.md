**Verdict: not ready.** Revision 2 fixes most original issues, but introduces several concrete concurrency and mail-outcome problems.

I read the [revised plan](</E:/Working/Working project/english-learning/docs/superpowers/plans/2026-10-07-buoc-1-identity-core.md>), [design](</E:/Working/Working project/english-learning/docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md>), [first review](</E:/Working/Working project/english-learning/docs/superpowers/reviews/2026-10-07-buoc-1-plan-review-astra.md>), and existing API implementation and test harness. I also inspected installed library sources and ran in-memory API probes. No files were modified; no migrations or database tests were run.

**A. Status of the 20 original findings**

“Resolved” here means resolved by the plan/design, pending implementation.

| # | Original finding | Status | Why |
|---|---|---|---|
| 1 | Security writes rolled back with HTTP errors | resolved | Transactions now return outcomes, with expected HTTP errors raised after commit and persisted-state assertions. |
| 2 | Non-atomic OTP transitions | resolved | Issuance and checking share the user lock; conditional consumption and failure counting explicitly depend on `count === 1`. |
| 3 | Refresh CAS did not protect the session invariant | resolved | Refresh and revocation share serialization, followed by fresh token, chain, successor and clock reads. |
| 4 | Login lockout and password-update races | resolved | Credential decisions are serialized and revalidate the verified hash; a separate rehash regression remains below. |
| 5 | Missing DI and guard registration | resolved | Global CommonModule exports and route-level `UseGuards` composition are explicit, including staff write limits. |
| 6 | Tasks consumed later artifacts | partially resolved | Shared artifacts moved earlier, but Task 2 changes SampleController to AppLogger before Task 3 updates the standalone sample test’s CommonModule wiring. |
| 7 | Validation schemas were not bound | resolved | Explicit schema decorators and strict objects are specified; the installed Nest implementation supports the syntax. |
| 8 | Parser/bootstrap could not satisfy body-error tests | resolved | D15 resolves the size contract; request context precedes parsing, with deliberate 400/413 mappings. |
| 9 | JWT claims were optional | partially resolved | Required claims, UUIDs and configured keys are addressed; explicit finite numeric-date validation and complete malformed-claim tests remain unspecified. |
| 10 | Verification replay contract contradicted itself | resolved | D14 consistently selects 409 for already-verified users and moves consumed-code replay coverage to reset. |
| 11 | Mail was not reliably post-commit/post-response | partially resolved | The scheduling architecture is corrected, but job composition, rejection-path scheduling and drain lifecycle need fixes below. |
| 12 | Timing-equality rationale was inaccurate | resolved | Actual Argon2 calls are tested; reset account work is explicitly deferred instead of claiming nonexistent hashing. |
| 13 | Parallel e2e global-state contamination | resolved | Global-state suites receive separate databases, with explicit Prisma disconnection in test shutdown. |
| 14 | Unsafe `trustProxy: true` toggle | resolved | Boolean `true` is rejected; trusted ranges, deployment requirements and spoofing tests are specified. |
| 15 | Invalid AES key and incomplete configuration | resolved | Exactly 32 bytes, environment/default mappings, shared budget namespace and accepted fixed security constants are explicit. |
| 16 | Incomplete clean-checkout workflow | resolved | Environment loading, PowerShell commands, migrated-database generation and generated-model checks are included. |
| 17 | Criterion references lacked assertions | partially resolved | Most missing assertions were added, but explicit web-login cookie coverage and locked reset-submission coverage remain absent. |
| 18 | SMTP phase timeouts mistaken for total deadline | resolved | B1E34 explicitly accepts phase/inactivity limits rather than a total deadline. |
| 19 | `needsRehash` lacked target options | partially resolved | Explicit options and current/weaker-hash tests are present; treatment of stronger stored parameters remains undefined. |
| 20 | Logging/maintenance interfaces were insufficient | resolved | Severity, safe error serialization, injectable capture, background operation IDs and Identity-owned cleanup are specified. |

**B. New findings**

1. **Major — Slow hashing still occurs inside the new user-lock transactions.**

   **Task/step:** Task 4 Step 2; Task 10 Step 2; Task 11 Step 2; design §4b.

   Verification is explicitly outside the lock, but password change places “new hash” inside it, and login does not move rehash computation outside it. Reset likewise lacks a precomputed-hash boundary.

   **Failure scenario:** A password change waits for the Argon2 semaphore while holding its transaction, connection and user lock. Other requests for that user occupy additional connections waiting for the lock. Under load, unrelated users then encounter pool contention. Prisma’s default interactive-transaction timeout is 5 seconds; `maxWait` defaults to 2 seconds and concerns transaction acquisition, not advisory-lock acquisition. An application timeout also should not be assumed to cancel an already-blocked PostgreSQL statement immediately. [Prisma transaction options](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions), [node-postgres pool behavior](https://node-postgres.com/apis/pool).

   **Concrete fix:** Compute replacement and rehash values before opening the transaction, then revalidate credentials under the lock. Specify bounded lock acquisition, transaction and pool settings, plus the retry/error policy. Test semaphore saturation, a lock wait exceeding the configured bound, and subsequent pool recovery. Increasing the transaction timeout alone is insufficient.

2. **Major — Transparent rehashing can turn correct concurrent logins into failures and lockouts.**

   **Task/step:** Task 10 Step 2, `decideCredential`; shared use in Task 11 Step 2.

   The new decision function treats any difference from `verifiedHash` as a wrong password and increments the failure counter.

   **Failure scenario:** Several requests successfully verify the same old-parameter hash. The first acquires the lock and transparently rehashes it. Subsequent requests acquire the lock, see a different hash, return 401 and increment failures—even though every password was correct. Enough overlapping requests can establish a login lock.

   **Concrete fix:** Distinguish credential replacement from hash maintenance, preferably using a credential version that changes on password replacement but not transparent rehashing. Alternatively, retry verification outside the transaction when the hash changes. A stale verification result must not automatically count as an incorrect-password attempt. Add a concurrent successful-login test against a hash requiring rehash.

3. **Major — Deferred OTP jobs do not compose with the declared `MailJob` type.**

   **Task/step:** Task 6 Step 2; Task 9 Step 2; Task 10 Step 2.

   `MailJob` returns `Promise<MailMessage | null>`, but `issueInTx` returns `Promise<MailJob | null>`. The deferred reset and registration jobs run a transaction invoking `issueInTx`; that produces another function, not a message.

   **Failure scenario:** Returning that transaction result fails type checking. Loosening the type would let the dispatcher pass a function to `mailer.send`, or silently discard the actual send job.

   **Concrete fix:** Define the composition explicitly. Either make `issueInTx` return a prepared `MailMessage | null`, or await the transaction and invoke its returned job **after commit**, returning that job’s message. Preserve the captured operation ID across both stages. Test registration and reset through the dispatcher, including deferred transaction failure.

4. **Major — The 21st OTP failure has inconsistent status and notification ordering.**

   **Task/step:** Task 9 Steps 1–2; Task 11 Step 2.

   `checkInTx` can return `kind: 'wrong', lockedJustNow: true`. `verifyEmail` maps `wrong` to 400, while Task 9’s test requires the lock-triggering request to return 429. Both verification and reset describe throwing their rejection before processing the lock notification.

   **Failure scenario:** The lock commits correctly, but the triggering verification returns 400 instead of 429. Following the documented sequence literally also makes the notification scheduling unreachable after the throw.

   **Concrete fix:** Return an explicit lock-transition outcome containing the lock deadline and notification jobs. After successful commit, schedule jobs first, then map the HTTP result: verification’s transition returns 429; reset retains its generic 400. Assert exactly one notification after draining both rejection paths.

   Also narrow “no exception escapes after security writes” to **expected domain denials**. Unexpected database or programming failures must still abort the transaction; they must not be converted into outcomes that commit partial successful operations.

5. **Minor — The dispatcher’s pending-response and shutdown lifecycle is unspecified.**

   **Task/step:** Task 2 Step 4; Task 6 Steps 1–2; OTP/password controller implementation.

   The design tracks running promises, but `afterResponse` first creates work waiting for a future event. It does not define whether `drain()` includes those pending batches, nor what happens when a response closes without `finish`. TestApp also does not expose the drain operation used repeatedly by later tests.

   **Failure scenario:** `drain()` observes no running jobs while a batch still awaits `finish`, then Prisma is disconnected before that batch starts. Conversely, counting pending batches without handling an aborted response can make draining hang forever.

   **Concrete fix:** Define pending/running/completed batch states; settle pending batches on premature `close` with an explicit logged cancellation policy; expose `drainMail()` in TestApp; stop accepting requests before final draining. Specify `@Res({ passthrough: true })` wherever Nest still owns response completion. Test normal finish, premature close and two concurrent requests whose mail logs retain their respective operation IDs.

   Capturing the ID at registration and re-entering it with `runWithOperationId` is otherwise the correct approach. `finish` means server-side handoff to the operating system, not client receipt. [Node HTTP documentation](https://nodejs.org/api/http.html#event-finish).

6. **Minor — B1#38’s proposed test needs explicit instrumentation and positive assertions.**

   **Task/step:** Task 2 test harness; Task 9 Step 1.

   The existing Prisma provider does not enable query-event logging, and the new harness contract adds no query capture. The proposed test only names user queries, although B1#38 also covers code creation and mail work.

   **Failure scenario:** An empty query-event collection passes “no user query before finish,” including when event logging was never enabled. Comparing callback arrival time can also conceal a query started earlier but completed later.

   **Concrete fix:** Add test-only query capture or operation-entry hooks, register a server-side finish marker before dispatch, and assert ordering for lookup, OTP creation and mail. After draining, require positive evidence that the known-account branch performed the expected work. Cover the unknown-account branch too.

   The installed Prisma runtime records query-start time in `event.timestamp` but emits the event after execution. That timestamp is usable after draining; callback arrival time is not an equivalent measurement. Prefer ordered markers over millisecond equality at the boundary.

The requested library checks also produced three important **non-findings**:

- **Advisory-lock `SELECT`:** `$executeRaw` is appropriate here. The installed adapter returns `rowCount` without converting result-column types. An in-memory probe confirmed that the same `void` result fails through `$queryRaw`, but succeeds through `$executeRaw`.
- **Schema binding:** All three proposed forms—`@Body({ schema })`, `@Query({ schema })`, and `@Param('id', { schema })`—produce schema metadata in Nest 12.1.2. The pipe probe returned the expected 400 message array.
- **Database isolation:** Separate database URLs work with the existing `PrismaPg({ connectionString })` provider; no schema-adapter workaround is required. The isolated URL must feed both migration deployment and the app provider.

I found no demonstrated advisory-lock cycle among the documented single-user operations when every helper uses the caller’s transaction. However, §4b’s blanket “no deadlock” claim is broader than that result: PostgreSQL also acquires implicit row/table locks. The concrete current concern is slow lock ownership and connection exhaustion, not a proven two-user advisory deadlock. [PostgreSQL locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html).

**C. Verdict**

**Not ready.** Fix the four major findings before implementation, and make the dispatcher lifecycle and B1#38 test instrumentation explicit. The broader architecture is substantially improved.