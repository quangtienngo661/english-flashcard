# AI workspace implementation plan

Approved: user's plan in chat 01/11/2026. Mockup: docs/mockups/2026-10-31-ai-workspace/index.html. Implement task-by-task, TDD, fake provider only. No real-provider calls, no reading secret files, no migration on the owner's database. One integration branch/PR; retain all data. Do not push unless asked.

## Contract locked for parallel implementation

Config content shape (`ConfigContent` / `configContentSchema` in src/ai/configs/config-snapshot.ts): `{instructions:string, examples:PromptExample[], model_ref:string|null, effort:string|null, thinking:'off'|null, max_output_tokens:number|null}`. Canonical fingerprint includes operation and these fields, recursive object-key sort, preserve array order and string content. No name/note/price/version. Export `configFingerprint(op, content): string` (SHA256), `contentOfConfig(row): ConfigContent`. Same normalization/content validation as saving a draft. Resolve model/settings with ConfigsService `prepare(op, content)` -> `{content, fingerprint, selection, prompt}`; selection model required for execution, null allowed for save/turn-off.

### Shared schema (main agent owns Prisma and migration)
- AiConfig: `name String?`, `deletedAt DateTime?`, `updatedAt DateTime @default(now()) @updatedAt`, `fingerprint String?`.
- AiConfigRevision: id UUID, configId UUID, version Int, content Json, fingerprint String, name String?, note String?, savedBy UUID, savedAt DateTime; unique(configId,version). Config FK RESTRICT. Map ai_config_revisions. Initial backfill current rows only.
- AiEvalRun: snapshot Json?, fingerprint String?, batchId UUID?; snapshot stores instructions/examples alongside run's existing resolved model/settings/prices. Keep legacy config_id/version checks; temporary runs still attach configId/version to draft provenance and snapshot prevents worker re-reading draft. Existing rows snapshot NULL use legacy path.
- AiCall: batchId UUID? indexed (plain UUID, within AI).
- AiBatch: id UUID, kind String(test/eval/judge), operation String, status String(queued/running/finished/failed/cancelled), configId UUID?, configVersion Int?, fingerprint String?, snapshot Json?, sourceId UUID? unique (eval run or judge pass), parentId UUID?, model String, provider String, total Int, actorId UUID, createdAt/start/finish timestamptz nullable. snapshot config metadata only; test output from expiring call_contents, not permanently duplicated. Map ai_batches. Register user-pointer columns in deletion map.

### Draft API (config agent)
Plural routes under /configs/:op/drafts: GET list paged -> `{items:ConfigView[],next_page_token}`; POST create `{from_config_id?,name?}` -> ConfigView; GET/PUT/DELETE /:id; GET /:id/revisions paged -> `{items:[{id,config_id,version,content,fingerprint,name,note,saved_by_user,saved_at}],next_page_token}`. PUT extends existing SaveDraftBody with optional name. ConfigView adds name,fingerprint,updated_at. Legacy get configs returns live,previous,draft only when 0/1; when >1 return draft:null and draft_count (do not make page unavailable); legacy singular mutation/check uses legacyDraft(op) -> 404 if none, 409 draft-selection-required if >1. Plural create allows copying a draft too (clone); soft-deleted source rejected. config service exports getDraft(op,id), legacyDraft(op), prepare(op,content). `check(op,draftId?)`, `publish(actor,op,body,draftId?)` reuse fingerprint evidence for SAME configId/current latest set, fallback exact version for pre-snapshot legacy rows, enforce deletedAt null in reads and publish transaction.

### Execution API (main agent)
POST /eval/runs accepts exactly one of legacy config/prompt or target: `{kind:'live'}` | `{kind:'draft',draft_id}` | `{kind:'temporary',draft_id,content:ConfigContent}`. Snapshot every new config/target run; do not rely on mutable config. Runs return existing fields plus batch_id,fingerprint. IDs in target validated against operation and nondeleted draft. POST /configs/:op/drafts/:id/test accepts `{example_ids?:string[],snapshot?:ConfigContent}`; without snapshot run saved content. Return existing `{items}` plus batch_id,fingerprint. May inject batch service optionally for constructor-fixture compatibility but production module always provides it. Keep max5, heldout server checks, rate/price/spend guards BEFORE paid work; run count one ai.test slot.

### Batch service/API (batch agent)
`AiBatchesService.create({kind,operation,configId?,configVersion?,fingerprint?,snapshot?,sourceId?,parentId?,model,provider,total,actorId,status?}): Promise<string>`; `start(id)`, `finish(id,status='finished')`. Registered in AI module by main agent. Runner ExecuteInput admin `batchId?:string`; context and CallRecord propagate batchId to every ledger attempt. Judge integration creates one batch per pass (sourceId pass.id idempotent), parent eval batch if present. Main integrates eval/test. List GET /admin/ai/batches filters from/to (existing Vietnam day range semantics max366), operation?, kind?, status?, page_size/page_token. View: `{id,kind,operation,status,config_id,config_version,fingerprint,source_id,parent_id,model,provider,total,done,started_by_user,created_at,started_at,finished_at,cost_usd:string|null,known_cost_usd:string,unknown_cost_calls:number,calls:number,retries:number,input_tokens,cached_input_tokens,output_tokens,reasoning_tokens}`. Detail same plus `snapshot`, `items` (test only, expiring call content; no heldout content); eval/judge detail links by source_id. Decimal/SQL sums, not JS floats; outputs never include heldout. Pagination token bound to filters. ActorIds keep-id in data map. Legacy backfill deterministic eval/judge calls, no fake quick-test batches.

### Bulk examples (bulk agent)
POST /eval/examples/bulk-delete `{operation,ids:UUID[1..1000]}` dedupe; prevalidate any found wrong-operation ->400 no deletes; existing missing -> already_missing_ids. Response `{deleted_ids,already_missing_ids}`. Transaction and proper locking/concurrency; same idempotency convention. Frontend new examples-workspace-api.ts to avoid shared ai-api.ts edits; existing DataList selection,20/page, search/level dev-only, selections survive page/filter, reset operation, bulk confirm, no hidden content side channels. Bulk agent owns example list UI/API files only; messages emitted in separate docs artifacts for main merge.

## Tasks and acceptance
- [x] Bulk API + examples UI: read -> red -> implement -> green.
- [x] Schema migration + fingerprint pure tests. Fresh + seeded DB, drift 0.
- [x] Multiple drafts/revisions + publish ID paths, tests optimistic lock/operation/deletion/evidence.
- [x] Snapshot eval/test execution, worker uses frozen payload; test edit while queued/running, matching vs different fingerprint.
- [x] Batch ledger/reports, all attempts/unknown price/partial/expiry/legacy/filters with SQL assertions.
- [x] Configs UI: list/edit/history nested routes; sticky live w/o create; dev picker; unsaved snapshots; save then recheck publish. Costs defaults batch, aggregate retained.
- [x] Integrate messages/route/module wiring and convert scripts to draft IDs; add two-draft eval-temp-save-publish real-stack scenario and preserve old smokes.
- [x] Self-review privacy/races/compatibility and fix findings. No independent agent review after the owner's instruction to stop using agents.
- [x] Complete local API/admin unit gates, typecheck/lint/build, mocked e2e/axe/responsive and delivery records. Exact phased outputs are in docs/deliveries/ai-workspace-verification.txt.
- [ ] Complete real-stack e2e, smoke twice on fresh databases and affected old smokes. BLOCKED: Docker engine unavailable; final PostgreSQL execution/locking checks remain unverified.

## Progress / rulings
Record actual tests and deviations here as tasks complete. No claim of real provider quality; all verification fake only.

- Schema and canonical fingerprint red/green: 3 focused tests. Snapshot worker/create tests: 127 focused tests passing. Fresh scratch `english_learning_ai_workspace`: 45 migrations deploy successfully; Prisma drift reports empty migration.
- Migration fingerprints are NULL only for imported current revisions. Services derive their canonical fingerprint on read; new saves write it. No historical revisions are invented.

- Bulk selection/deletion implemented: focused API 79/79, UI 60/60 green. Commit `4557b94e`.
- Follow-up runtime blocker: Docker engine unavailable; backend reports dockerInference socket initialization failure. No settings/data cleanup attempted. See `docs/deliveries/ai-workspace-runtime-blocker.txt`; final real-stack gate must remain explicitly unverified until Docker is available.
- Added real-stack story `apps/admin/e2e-real/ai-workspace.real.spec.ts` (Playwright discovers it in 30 tests/11 files); not executed yet. It covers two temporary targets, snapshot/save reuse, publish and batch/live UI.

- Final self-review (owner requested no further subagents): fixed publish/remove evidence race with run FOR UPDATE + in-transaction event recheck; added same-transaction waiting judge batch, cancel durability, model label and latest quick-test in draft list. API full4026/4026 green.
- Full mocked e2e:299 passed/3 failed/68 skipped. Failures were old inline-config routes + incomplete fixture metadata; all three re-run green (3passed/1existingmobile skip). Focused workspace/costs/axe41passed/1skipped earlier. No real-stack claim.
- Restored quick-run regression coverage on new route/picker: quota,429 Retry-After,offline,double-click,per-item reason and unsaved run;25/25 focused tests green including prompt history/workspace.

- Full admin intermediate runs:1312 passed/4 failed (first four cold-render/time-limit checks, then three config checks and one bulk test loaded before its final timeout adjustment). Scoped files passed60/60 and24/24. After bounded waits for the measured transitions, final full run:99 files,1316/1316 passed,313.10s,exit0. All functional assertions retained.
- Final batch cursor review: JS Date could round imported PostgreSQL timestamps. SQL boundary now resolves the immutable cursor row. RED test committed7110432b, fix f7eebce3;21 focused batch/controller tests and API typecheck passed. This verifies query construction, not final PostgreSQL integration.
