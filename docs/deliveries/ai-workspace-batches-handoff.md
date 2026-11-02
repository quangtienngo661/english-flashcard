> Archived intermediate handoff. The final implementation and verification status are in [ai-workspace.md](ai-workspace.md); the integration TODO list below records the handoff stage, not remaining work. Runtime SQL verification is still blocked as documented there.

# AI workspace — batch backend handoff

Worktree: `E:/Working/Working project/english-learning-nhomb-m6`, branch `codex/ai-workspace`.
No staging, commit, push, merge, secret/env reads, provider calls, dependency installs or migration performed by this agent.

## Files owned and changed

- `apps/api/src/ai/batches/ai-batches.service.ts` and `.spec.ts` (new).
- `apps/api/src/ai/api/admin-ai-batches.controller.ts` and `.spec.ts` (new).
- `apps/api/src/ai/runner/runner.service.ts` and `.spec.ts`.
- `apps/api/src/ai/runner/call-ledger.service.ts` and `.spec.ts`.
- `apps/api/src/ai/judge/judge-job.ts` and `.spec.ts`.
- `apps/api/src/ai/judge/judge-passes.repository.ts` and `.spec.ts`.
- `apps/api/src/ai/eval/eval-runs.repository.ts` and `.spec.ts` (ownership explicitly extended by main).
- `apps/api/src/ai/maintenance/ai-maintenance.ts` and `.spec.ts` (follow-up ownership explicitly extended by main).
- This handoff. No config, UI, schema, migration, identity map, registry or eval-service changes by this agent.

## Contract / behavior

- `AiBatchesService(prisma, identity, clock)` exports `create(input, tx?: Prisma.TransactionClient): Promise<string>`, `start(id)`, `finish(id, status = 'finished')`, `list(query)`, `get(id)`.
- **Config integration:** inside the existing draft-lock transaction call `batches.create(input, tx)`. The optional transaction handles both create and source upsert. Omitting it uses the shared Prisma client for compatibility.
- List/detail and status filters use the same SQL CASE: source status `failed` with error `cancelled` is exposed as `cancelled`; otherwise source status wins, with durable batch status as fallback.
- Eval progress/total use the source run/items. Judge progress/total use the pass. Test total comes from the batch; done counts distinct call operation IDs, so a retry does not double count progress.
- Ledger sums all attempts in PostgreSQL; currency stays a decimal string. Unknown price/usage makes `cost_usd` null, retaining `known_cost_usd` and `unknown_cost_calls` separately.
- Filters are strict metadata only. Vietnam dates are inclusive with at most 366 days. Cursor binds resolved date range, operation, kind and status, and pages by created_at/id.
- Only test batch detail reads `ai_call_contents`, only before expiry, with the latest attempt per operation ID. Eval/judge details return source links, configuration snapshot and no item content. Snapshot whitelist preserves prompt few-shot, excluding subject input/output/items.
- Runner forwards optional admin batchId to CallRecord and every persisted aiCall attempt. It does not reach adapter request data.
- Judge passes use sourceId=pass.id upsert, parentId=evalRun.batchId. Repository create/release and JudgeJob ensure the batch. Worker retries/resumption keep the same source batch.
- Judge repository start/finish/fail now sync durable total/status/timestamps with guarded source updates using CTEs. Release of a failed run does the same for its queued passes. Taking the subject snapshot copies the resolved total inside the same transaction, including the zero-subject branch that ends immediately. These updates do not rewrite the immutable batch configuration snapshot.
- Eval repository start/finish/fail now update the matching batch in the **same SQL statement**, using only the run rows actually changed by the guarded UPDATE. Start preserves its first timestamp. Terminal status/timestamps/total remain when the source run is later removed; a late worker cannot overwrite a terminal run/batch.
- Maintenance eval/judge stalled transitions now sync durable batch metadata in the same statement, using the existing 15-minute heartbeat cutoff. Independent job `ai.test-batches-recover` marks only test batches still queued/running with COALESCE(started_at,created_at) older than the same 15-minute cutoff as failed, preserving ledger/content. This also recovers a process dying after creating the batch but before start. The scheduler remains hourly; 15 minutes is the eligibility threshold, not a new scheduler interval.

## Main integration remaining outside owned files

1. Config agent must pass the held transaction to `batches.create(input, tx)`.
2. Eval service cancel remains main-owned. Maintenance stalled transitions are now handled by this agent. For cancel, the equivalent statement shape is:

```sql
WITH cancelled AS (
  UPDATE ai_eval_runs SET status = 'failed', error = 'cancelled', finished_at = $2
  WHERE id = $1::uuid AND status IN ('queued', 'running')
  RETURNING id, batch_id, started_at, finished_at, total
), synced AS (
  UPDATE ai_batches b SET status = 'cancelled',
    started_at = COALESCE(b.started_at, c.started_at), finished_at = c.finished_at, total = c.total
  FROM cancelled c WHERE b.id = c.batch_id AND b.kind = 'eval'
  RETURNING b.id
)
SELECT id FROM cancelled;
```

Use returned cancelled rows for the existing run-not-active refusal. Any pass transitions performed directly by eval-service also need their batch updated by source_id within the same transaction. The read-time source derivation masks stale durable metadata only while the source exists; source deletion requires these writes.

3. Main owns immediate queued automatic judge batch insertion in the same eval transaction from its immutable judge revision. Repository.release/ensureBatch remain the idempotent recovery path; no API-create dependency was added.
4. Registry and list-routes integration belong to main. Main's migration already uses the suggested deterministic full-string joins, confirmed by reading it: eval calls match purpose plus `eval-<run.id>-<item.example_id>`; judge calls match purpose plus `judge-<pass.id>-<item.id>`. No quick-test backfill is inferred.

## Verification output

Initial RED → GREEN:

```text
runner/ledger RED: 2 files failed; 4 failed | 75 passed (79)
  expected batch UUID, received undefined on each attempt
runner/ledger GREEN: 2 files passed; 79 passed (79)
batch initial RED: 13 failed (13), not-implemented service stubs
batch initial GREEN: 13 passed (13)
HTTP RED: 5 failed (5), missing routes returned 404
HTTP GREEN: 5 passed (5)
judge integration RED: 4 failed | 31 passed (35)
judge integration GREEN (including service regressions): 51 passed (51)
```

Quality follow-up RED (new transaction routing + cancelled CASE + eval lifecycle):

```text
pnpm exec vitest run src/ai/batches/ai-batches.service.spec.ts src/ai/eval/eval-runs.repository.spec.ts --reporter=dot
Test Files 2 failed (2)
Tests 7 failed | 23 passed (30)
```

Follow-up GREEN: same command → `2 passed (2); 30 passed (30)`.

Focused command before maintenance/judge durability follow-up:

```text
pnpm exec vitest run src/ai/batches src/ai/api/admin-ai-batches.controller.spec.ts src/ai/runner/runner.service.spec.ts src/ai/runner/call-ledger.service.spec.ts src/ai/judge/judge-job.spec.ts src/ai/judge/judge-passes.repository.spec.ts src/ai/judge/judge-passes.service.spec.ts src/ai/eval/eval-runs.repository.spec.ts src/ai/eval/eval-job.spec.ts --reporter=dot
Test Files 9 passed (9)
Tests 198 passed (198)
Duration 12.74s
```

`pnpm exec tsc --noEmit --pretty false` → exit 0, no diagnostics.
Focused oxlint over owned production/test files → exit 0, no diagnostics.
`git diff --check` over owned files → exit 0.

Maintenance/judge durability follow-up RED → GREEN:

```text
maintenance RED: 4 failed | 16 passed (20)
maintenance GREEN: 20 passed (20)
judge repository RED: 6 failed | 16 passed (22)
judge repository + job + service + maintenance GREEN: 4 files passed; 74 passed (74)
```

The judge RED cases caught missing atomic start/finish/fail sync, missing run-failed release sync, and missing total updates for populated and empty subject snapshots. The losing-snapshot-claim control verifies no batch update occurs when another caller already took the snapshot.

Final verification after the maintenance/judge follow-up:

```text
pnpm exec vitest run src/ai/batches src/ai/api/admin-ai-batches.controller.spec.ts src/ai/runner/runner.service.spec.ts src/ai/runner/call-ledger.service.spec.ts src/ai/judge/judge-job.spec.ts src/ai/judge/judge-passes.repository.spec.ts src/ai/judge/judge-passes.service.spec.ts src/ai/eval/eval-runs.repository.spec.ts src/ai/eval/eval-job.spec.ts src/ai/maintenance/ai-maintenance.spec.ts --reporter=dot
Test Files 10 passed (10)
Tests 221 passed (221)
Duration 21.16s
```

Fresh `pnpm exec tsc --noEmit --pretty false` → exit 0, no diagnostics.
Fresh oxlint over maintenance and judge repository production/test files → exit 0, no diagnostics.

## Unverified / risk

The follow-up attempted a PostgreSQL check against the explicitly named scratch database `english_learning_ai_workspace` at 127.0.0.1:5434, with a current_database/table control before any write. It stopped at that first read: `DatabaseNotReachable`, `Can't reach database server at 127.0.0.1:5434`. The listener check also returned no listener at that port. No verification data was written. Therefore the new CTEs and rollback behavior are **not re-verified on PostgreSQL in this follow-up**; focused tests assert emitted SQL and API behavior. Re-run scratch DB verification after main makes it available. No claim about real AI/provider quality.

The maintenance follow-up repeated the scratch control with the installed pg client and explicit scratch target. Output: `{"check":"scratch_database_control","reachable":false,"code":"ECONNREFUSED"}`. No SQL or verification writes executed on that attempt.
