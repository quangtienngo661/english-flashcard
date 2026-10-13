# Bước 2 — plan tóm tắt (12/10/2026)

Plan đầy đủ: `docs/superpowers/plans/2026-10-12-buoc-2-content-pipeline.md` (24 task, 3 milestone).

- **M1 — Content core:** quyền + route audit → schema catalog → entry/variant/level → sense/revision →
  publish/unpublish/retire/quick-publish → đọc catalog cho staff (phân trang) → tìm kiếm/duyệt cho learner →
  sources/topics/hồ sơ learner.
- **M2 — Pipeline:** thêm Redis/BullMQ/csv-parse → schema job + import batch → khung job (lease/epoch) →
  producer/worker/reconciler → đọc file CSV → chuẩn hoá/validate dòng → endpoint upload (idempotent) → xử lý
  dòng entry/level → luật nhập sense qua CSV → handler xử lý batch (có prefilter) → báo cáo batch + tải file
  dòng lỗi → test import file CEFR-J/Octanove thật.
- **M3 — Finishing:** hoàn tác batch → export + list theo batch → publish theo filter (job nền) → ghi lại số
  đo + as-built.

# Bước 2 — as-built (12–13/10/2026)

Design `docs/superpowers/specs/2026-10-12-buoc-2-content-pipeline-design.md` (D1–D20, criteria `B2#1–B2#71`,
edge cases `B2E1–B2E18`), decisions `docs/superpowers/decisions/2026-10-12-buoc-2-content-pipeline-decisions.md`,
plan `docs/superpowers/plans/2026-10-12-buoc-2-content-pipeline.md` (24 tasks across M1/M2/M3). Implemented on
`feat/buoc-2-m2-pipeline` (M1+M2, tasks 1–20) and `feat/buoc-2-m3-finish` (M3, tasks 21–24, cut from M2's tip
since `dev` did not yet have M2 merged — see "Open items" below).

- `src/content/`: catalog (`Entry`/`EntryVariant`/`EntryLevel`/`Sense`/`SenseRevision`), entry/variant/level
  write path, sense authoring and publish/unpublish/retire/quick-publish, staff reads with keyset pagination,
  learner search/browse/detail, CSV export (`GET .../senses/export`, RFC 4180 + formula-guard round trip),
  batch revert (`POST .../uploads/:id/revert`). Only `src/content/**` touches these tables (D3); other modules
  call `ContentService`, the module's one export.
- `src/content-pipeline/`: one shared background-job framework (`background_jobs` + `lease_epoch` + reconciler,
  D14) under two real handlers — `ImportBatchHandler` (`content-import`, CSV upload → entries/levels/senses,
  with a prefilter so an unchanged re-upload opens no row transactions) and `PublishJobHandler`
  (`content-publish`, bulk publish by filter, `POST .../senses/publish-jobs`). `BatchScopeModule` (`@Global()`,
  own module so `ContentModule` can inject `BATCH_SCOPE` without importing Pipeline) resolves a batch's own
  entries/senses from `batch_records` for the `batch_id` filter on every list/export/publish-job endpoint.
- Tests: 575 unit + 457 e2e (real Postgres + Redis + Mailpit via Testcontainers; up from Bước 1's 339 unit +
  182 e2e). `test/pipeline/real-files.e2e-spec.ts` imports the real CEFR-J 1.5 and Octanove 1.0 word lists to
  the exact predicted counts (B2#70); manually verified against the real built API + a separate worker
  process end to end: register a source → upload the real CEFR-J file → kill the worker mid-batch → restart
  it → batch finishes correctly with no duplicates; a second walkthrough covered the rest of the surface —
  small CSV with a deliberately invalid row → report → download `rejected.csv` → fix → re-upload → export the
  unpublishable list → fill the gaps → re-upload → publish one item by explicit list, another by publish-job
  filter → search as a learner with `native_language` set, meaning and topic names rendered in Vietnamese.
- **B2#71 measured 13/10/2026** (isolated run): importing the real 7,799-row CEFR-J file takes 130,757 ms,
  17,508 `pg_stat_database.xact_commit` transactions, 493.4 MB peak RSS; the unchanged re-import (prefilter
  working) takes 1,044 ms, 103 transactions, 541.5 MB peak RSS. The same import under full e2e-suite
  contention (40+ concurrent Testcontainers files) takes roughly double — this is host contention, not a
  regression, and is why several e2e tests carry generous (not tight) timeout budgets with the reasoning
  recorded in their own comments.
- **Real production bug found and fixed (13/10/2026, during Task 23):** `JobRunnerService` gave every BullMQ
  `Worker` the same `ioredis` connection; a BullMQ Worker needs its own dedicated connection for its blocking
  reads, so sharing one silently starves every worker after the first (no error, no log — it just never
  receives a job). This was present since the job framework was first written but never exercised with two
  real handlers contending for it until Task 23 added the second one (`content-publish`). Fixed by giving
  each Worker its own connection.
- Execution: Codex `gpt-6.1-sol` implemented each task from a detailed per-task prompt; Claude self-reviewed
  every diff and verified for real against Docker Postgres/Redis before committing (no second Codex reviewer
  this round — see `feedback_codex_review_workflow` in Claude's own memory). Caught and fixed, beyond what
  Codex's own sandbox could verify (no Docker access): the shared-Redis-connection bug above, a route-ordering
  conflict between `GET senses/export` and `GET senses/:id` across modules (fixed by constraining `:id`'s own
  path pattern to a literal UUID hyphen shape, since the installed Express adapter rejects inline param
  regexes), and several pre-existing tests whose exact-shape assertions needed updating once new fields
  (`errorMessages`, `replacedRevisionPreviousStatus`) were added to already-existing JSON columns.

Bước 2 open items: all lease/heartbeat/reconciler-interval numbers (60 s/20 s/30 s) stay `ASSUMPTION`; Excel's
own CSV behaviour (`;` separator under a Vietnamese locale, encoding, a lost leading `'`) is untested on a
real Excel install; CEFR-J 1.6 was never checked for (still only 1.5 in the repo); search has no index yet
(sequential scan accepted at ~9,800 entries); `entitlements.grant` vs. "editor không đụng chi phí AI" (D6) is
unresolved, deferred to Bước 5.

## Open items for the next session

PR #15 (`feat/buoc-2-m2-pipeline` → `dev`, carrying M1+M2 since M1 was never separately merged) is open with
CI green, awaiting the owner's merge. `feat/buoc-2-m3-finish` was cut from M2's own tip rather than from `dev`
(which does not have M2 yet) — once PR #15 merges, confirm `dev`'s new tip is identical to M2's and open M3's
own PR from `feat/buoc-2-m3-finish` into `dev` the normal way. **Next: Bước 3 (Learning)** per the fixed build
order (HANDOFF §2) — the earliest pilot milestone.
