# Review độc lập Bước 2 (Content + Pipeline) và Bước 2.5 (admin web) — 29/10/2026

Phạm vi: Bước 2 (catalog, CSV import, job nền BullMQ, revert, export, publish theo lô và theo job, tìm kiếm chỉ-đọc của người học) và
Bước 2.5 (`apps/admin`: đăng nhập, phiên, cấp vai trò, tạo tài khoản staff, luồng CSV), cộng các phần sau này sửa lên cùng chỗ (sửa/xóa
nguồn, xóa từ, dừng publish job của PR #169). Reviewer chỉ đọc code và tài liệu trên nhánh `docs/review-buoc-1-8` (cắt từ `origin/dev` @
`867d385`); không sửa code, không chạy migration, không đụng DB. **Không chạy được unit test** trong worktree này: `ls apps/api/node_modules
apps/admin/node_modules apps/api/src/generated` → "No such file or directory" cả ba. Bằng chứng test lấy từ log CI thật bằng `gh api
.../actions/jobs/<id>/logs` và từ các file output đã commit.

Nguồn đã đọc: design/decisions/plan `2026-10-12-buoc-2-content-pipeline*`, `2026-10-14-buoc-2-5-admin-web*`; `docs/deliveries/{buoc-2,
buoc-2-test-flow,buoc-2-5,buoc-2-5-test-flow,admin-refresh-keepalive,deploy-checklist,stale-smokes,buoc-3-test-flow,buoc-0-3-fixes}.md`;
review cũ `2026-10-12-buoc-2-plan-review-claude.md`, `2026-10-15-admin-refresh-keepalive-branch-review.md`, `2026-10-18-buoc-0-4-code-review.md`,
`2026-10-18-remove-backend-e2e-analysis.md`, `2026-10-20-buoc-0-3-review-evidence/inventory-{content-pipeline,foundation-db}.md`;
`docs/preparation/{IMPROVEMENT_PLAN_2026-10-28,ADMIN_CRUD_SURVEY_2026-10-28}.md`; code `apps/api/src/{content,content-pipeline}/**`,
`apps/api/src/identity/staff/**`, `prisma/models/{content,pipeline}.prisma`, các migration content/pipeline, `scripts/smoke-buoc-2.mjs`,
`apps/admin/src/{api,auth}/**`, `apps/admin/src/features/{uploads,sources,export,publish-jobs}/**`, `apps/admin/e2e-real/admin.real.spec.ts`.

Bối cảnh quan trọng: bộ e2e backend (Testcontainers) **đã bị xóa** ở commit `420e93d` (D38 Bước 4, 18/10/2026). Mọi "Xong khi" của Bước 2
dựa vào bộ này đã đạt lúc giao, nhưng từ 18/10 không còn gì chạy lại phần lớn các tiêu chí `B2#` ở mức DB thật.

## (a) Bảng "Xong khi"

### Bước 2 (design §1)

| # | Mục hứa | Bằng chứng | Trạng thái |
|---|---|---|---|
| 1 | Mọi tiêu chí `B2#` có e2e trên Postgres + Redis thật (`pnpm test:e2e`); test Bước 0–1 vẫn xanh | Log CI PR #16 (job `115208684241`, 13/10): `Tests 575 passed (575)` (unit), `Tests 457 passed (457)` (e2e), `test/content/admin-permissions.e2e-spec.ts (4 tests)` (B2#66), `real-files.e2e-spec.ts` B2#70 pass 59 718 ms. Check: `api (lint, typecheck, build, unit, e2e) SUCCESS` | **Verified lúc giao (13/10).** Từ 18/10 bộ này bị xóa (`420e93d`); script `test:e2e` không còn trong `apps/api/package.json`. 52/80 mã `B2#` không còn xuất hiện trong bất kỳ spec nào (cận dưới, xem d.7). Lưới đã gỡ, xem B2-1, B2-4 |
| 2a | Chạy tay trên API + worker thật: nguồn CEFR-J → upload file thật → thêm nội dung → báo cáo → `rejected.csv` → sửa → upload lại → publish → learner tìm thấy | `buoc-2.md:35-41` (hai lượt, kể cả tắt worker giữa lô rồi chạy lại, không trùng dữ liệu). Không có file output/log đính kèm | **Verified theo lời kể** (13/10), không lưu output. Được lặp lại một phần: Bước 2.5 chạy tay 15/10 (`buoc-2-5-test-flow.md` §2 bước 7–11, CEFR-J 7.799 dòng, 213 s) và Bước 3 test flow 17–18/10 (`buoc-3-test-flow.md:65`, 196 s). **Kịch bản tắt worker giữa lô chỉ chạy một lần (13/10)** |
| 2b | Số đo B2#70 ghi vào doc | Design dòng 515; xác nhận bởi log CI PR #16 ở trên | **Verified (13/10)**; không còn test nào đếm lại ở mức DB (chỉ còn unit đọc file: `csv-file.spec.ts:328,367` đếm 7.799 và 2.136 dòng) |
| 2c | Số đo B2#71 ghi vào doc | Design dòng 516 (130 757 ms, 17 508 transaction, 493,4 MB) | **Verified (13/10)**, một lần đo |
| — | `smoke:buoc-2` (thêm sau, không thuộc "Xong khi") | `stale-smokes-smoke-output.txt:8-36` `ALL CHECKS PASSED in 6082ms` trên bản merge local `638a9e9` (26/10) | Verified 26/10; chỉ luồng thuận (không kiểm quyền, revert, idempotency, tắt worker). Chưa chạy lại sau #169 (28/10) và Bước 8 |

### Bước 2.5 (design §1)

| # | Mục hứa | Bằng chứng | Trạng thái |
|---|---|---|---|
| 1 | Mọi `B25#` có test tự động (unit, e2e API giả, e2e API thật) | `buoc-2-5-test-flow.md` §1: admin 217 unit, 60 e2e giả, 7 e2e thật; API 475 e2e (15/10) | **Verified lúc giao.** Hôm nay 7 mã chỉ có e2e API đã mất test cùng lúc xóa e2e backend: B25#15, #16, #17, #17a, #24, #26, #28 (d.8). B25#26 (chặn API khi `must_change_password`) không còn test nào: B25-1 |
| 2 | CI xanh gồm job `admin` và `admin-e2e-real` | `gh pr view 19`: `api, web, admin, admin-e2e-real = SUCCESS`; log job `116231586134`: `7 passed (19.4s)`. Hôm nay: PR #181 (29/10) job `123263748853`: `27 passed (1.8m)`, có `flow 3` (upload → `rejected.csv` → publish → hoàn tác) | **Verified**, và vẫn chạy trên mọi PR |
| 3 | Chạy tay: DB mới → `admin:grant` → tạo editor → editor đổi mật khẩu → CEFR-J thật → soạn CSV → publish → learner tìm thấy; learner bị chặn; gỡ quyền thì bị đá; 4 bề rộng | `buoc-2-5-test-flow.md` §2 bảng 14 bước (CEFR-J 213 s, 4 nghĩa publish, 24/24 tổ hợp bề rộng) | **Verified (15/10)** bằng script Playwright có quan sát, không phải người bấm tay (test flow tự ghi); ảnh không commit. Bước "xuất `unpublishable`" đổi kịch bản (D26) |

## (b) Mục mở và nơi theo dõi

| Mục (nguồn) | Còn mở? (kiểm hôm nay) | Nơi theo dõi |
|---|---|---|
| Lease 60 s / nhịp tim 20 s / reconciler 30 s là `ASSUMPTION` (`buoc-2.md:66`, design §17) | Mở; giá trị vẫn mặc định `app-config.ts:227-229` | Chỉ `buoc-2.md`. Không có trong `IMPROVEMENT_PLAN` hay `deploy-checklist` |
| Hành vi Excel thật (`;`, bảng mã, mất `'` đầu ô) (`buoc-2.md:66-67`) | Mở; chưa có lần chạy nào ghi lại | `buoc-2.md`, `buoc-2-test-flow.md` §3.2. Không có trong `IMPROVEMENT_PLAN`/`deploy-checklist` |
| CEFR-J 1.6 có tồn tại không (D11 "Chờ bạn") | Mở | Chỉ `buoc-2.md:67`, decisions dòng 146 |
| Tìm kiếm chưa có index (`buoc-2.md:67`) | Mở (`learner-content.service.ts:115` comment "No search index") | Không ai theo dõi; xem B2-5 |
| `entitlements.grant` vs D6 | **Đóng** ở Bước 5 (D6–D8, `CLAUDE.md`) | — |
| Bug dùng chung kết nối Redis cho mọi Worker | **Đã sửa**: mỗi Worker một kết nối `job-runner.service.ts:41-45` | — |
| "Pool worker ≥ 2 × job import" (`deploy-checklist.md`, `ASSUMPTION` về nguyên nhân) | Mở. Bằng chứng thêm: publish job giữ `ctx.tx` (kết nối 1, `publish-job.handler.ts:45`) trong lúc `content.publishItem` mở `$transaction` riêng (kết nối 2, `publish.service.ts:84`) → 2 kết nối/job cho publish. Đường import dùng một `tx` (`row-processor.ts:74-83`) nhưng heartbeat `extend` cần kết nối thứ hai; nguyên nhân với import vẫn `ASSUMPTION` | `deploy-checklist.md` "Kết nối DB" |
| Redis bền (`noeviction`, AOF) | Local đúng (`docker-compose.yml:35`); production chưa có | Design 2.5 §14 (deploy) |
| D26: "xuất từ chưa có nghĩa" vào backlog | API đã có từ Bước 3 (`senses-export.controller.ts:18-23`), **admin chưa gọi** | `buoc-2-5.md:95-96` vẫn ghi backlog; xem B25-2 |
| D27 / B25E30: refresh 429 thì về `/login` | **Đã sửa**: `session-store.ts:57` (`REFRESH_TRIES = 3`), `:292` | `ui-refresh-b.md` |
| Giới hạn chấp nhận: danh sách lô không có "Đã hoàn tác"; lọc "Lô nhập" 20 lô; chi tiết publish job không có `filter`; lô `failed` câu chung | Còn nguyên: list không trả `reverted` (`uploads-read.controller.ts:47-48`), `detail()` không trả `filter` (`publish-jobs.controller.ts:146-154`), `jobSelect` không có `errorSummary` (`uploads-read.controller.ts:20`) | Chỉ `buoc-2-5.md` (chấp nhận, không phải việc phải làm) |
| Ngưỡng 30 s gợi ý worker khi worker thật tắt | Chưa kiểm | Chỉ `buoc-2-5.md`, design 2.5 §15 |
| Safari/Firefox (cookie `Secure; SameSite=Strict` trên localhost, `keepalive`) | Chưa kiểm | `buoc-2-5-test-flow.md:84`, `admin-refresh-keepalive.md:109`. Không có trong `deploy-checklist` |
| Review keepalive M1 (RKC3 có thể xanh trên code chưa sửa), M2 | Mở: RKC3 vẫn không đọc cookie `refresh_token` (`admin.real.spec.ts:162-180`) | `admin-refresh-keepalive.md:113` "chờ chủ dự án" |
| Ba điểm guidelines còn lại (nút điều hướng là button, luật mật khẩu đỏ khi chưa gõ, vùng kéo thả nháy) | Không kiểm lại | `buoc-2-5.md:84-85` |
| CT3: revert xóa revision mới nhất nên `revision_no` bị dùng lại | Mở: `revert.service.ts:128` vẫn `deleteMany` | `inventory-content-pipeline.md:27` "open", gom "Để đợt sau (D11)" (`2026-10-20-buoc-0-3-review.md:120`) |
| CT4: sense thay nghĩa không kiểm nhãn; publish đụng unique index → 500, các mục sau trong request không chạy | Mở: `senses.service.ts:67-77` không kiểm nhãn khi có `replacesSenseId`; vòng `admin-publish.controller.ts:33-36` không bắt lỗi từng mục | `inventory-content-pipeline.md:28` "open" |
| PL8: tên file tiếng Việt bị lưu sai mã | Mở: `MulterModule.registerAsync` (`content-pipeline.module.ts:32-37`) không có `defParamCharset` | `inventory-content-pipeline.md:41` |
| PL10: API parse cả file đồng bộ trước khi đếm dòng | Mở (`csv-file.ts:86`), không đo lại | `inventory-content-pipeline.md:43` |
| DB12 (Pipeline đọc thẳng bảng Content) + DB-T3 (không có test ranh giới) | Mở, chưa chốt | `inventory-foundation-db.md:47,65`; xem B2-3 |
| Security header cho admin tĩnh | Mở | `deploy-checklist.md` "Admin web" |
| Đã sửa, kiểm lại hôm nay (đối chứng): T1 (`publish.service.ts:104` từ chối `rejected`), T4 (`csv-writer.ts:16-27` bỏ cặp `_row`/`_error` cũ), T8/T9 (`session-store.ts` trạng thái `unavailable`, `logout-failed`), T10/B25#19 (`use-error-message.ts:17`) | Đóng | — |

## (c) Phát hiện

<a id="b2-1"></a>
### B2-1 — Vừa — Kiểm "mọi route `/v1/admin/**` có quyền" (B2#66) không còn răng, trong khi guard mặc định cho qua

- **Mô tả:** `PermissionGuard` trả `true` khi route không khai `@RequirePermission` (`apps/api/src/identity/staff/permission.guard.ts:25`), nên
  quên decorator = mọi người đã đăng nhập (kể cả learner) gọi được route admin. Lưới bắt lỗi này là `auditAdminRoutes` trong
  `test/content/admin-permissions.e2e-spec.ts` (bản trước `420e93d`, dòng 33: `routes.filter(... path.startsWith('/v1/admin/') && !permissions?.length)`),
  đã bị xóa. Spec còn lại mang nhãn B2#66 (`test/support/list-routes.spec.ts:34-63`) chỉ kiểm cơ chế dò route thấy được route mẫu không quyền
  (`:61` `permissions: null` là **kỳ vọng**), cộng danh sách cố định cho `users.read`, `ai.view`, `roles.manage`; không có câu nào khẳng định
  "không route admin thật nào thiếu quyền".
- **Bằng chứng thêm:** `grep -rln "AdminSensesController|AdminPublishController|UploadsController|UploadsReadController|TopicsController|AdminCatalogController|admin/content/senses|admin/content/uploads|admin/taxonomy"`
  trên mọi `*.spec.ts` chỉ ra `publish-jobs.controller.spec.ts` và `export-routing.spec.ts` (cái sau không kiểm quyền). Tức các controller lõi
  Bước 2 (soạn, review, publish/unpublish/retire/quick-publish, upload, revert, đọc catalog, topic, cờ từ chức năng) không có test nào khẳng định
  quyền của chúng. Job `admin-e2e-real` chỉ đi luồng có quyền (editor) và chặn learner ở màn đăng nhập (UI), không gọi API bằng token learner.
- **Hiện trạng code:** quét tĩnh 27 controller `@Controller('admin...')`: tất cả có `@RequirePermission` ở class hoặc từng method (d.2). Không có
  lỗ hổng đang sống.
- **Kịch bản hỏng:** một refactor bỏ nhầm dòng `@RequirePermission('content.publish')` ở `admin-publish.controller.ts:20` → learner gọi
  `POST /v1/admin/content/senses/retire` với 500 sense id và gỡ nội dung khỏi mọi người học; CI vẫn xanh 4/4.
- **Đề xuất:** đưa lại `auditAdminRoutes` thành unit spec trên `createTestApp` (spec hiện có đã nạp đủ module, vì nó liệt kê được route AI và
  entitlements), fail kèm tên route thiếu quyền. Hoặc đổi guard thành mặc định từ chối cho path `/v1/admin/`.

<a id="b2-2"></a>
### B2-2 — Vừa — Sửa nguồn (#169) cho đổi phiên bản, giấy phép, ghi công của nguồn đã có dữ liệu nhập; design cấm sửa

- **Mô tả:** Design Bước 2 §4: `data_sources` "không có thao tác sửa (đổi bản = thêm dòng mới)". PR #169 thêm `PATCH /v1/admin/content/sources/:id`
  (`sources.service.ts:99-125`) không kiểm nguồn đã được dùng hay chưa (khác hẳn `remove` ở `:132-150`). Schema cho phép chuỗi rỗng
  (`sources.schemas.ts:4,7,8`: `z.string().trim()` không `min(1)`); hộp thoại admin cho bỏ tick "nguồn level" rồi xóa trống hai ô
  (`apps/admin/src/features/sources/SourceEditDialog.tsx:54,89-90`). Không tìm thấy quyết định nào về việc này (`grep -i "sửa nguồn|PATCH.*sources"`
  trong `docs/superpowers/decisions/*.md` và design admin: 0 dòng).
- **Kịch bản hỏng:** editor đổi "CEFR-J Vocabulary Profile 1.5" thành "1.6" (hoặc xóa license/attribution) sau khi đã nhập 7.799 dòng. 7.799 bản ghi
  level `imported` giờ mang tên phiên bản khác dữ liệu thật; trang công khai `GET /v1/sources` (CR18, nghĩa vụ ghi công của giấy phép) hiện
  license trống; lần upload file 1.6 thật sau đó bị so `level-differs-from-source` với dữ liệu 1.5 dưới cùng một `source_id`.
- **Đề xuất:** khi nguồn đã có `entry_levels`/lô nhập: từ chối đổi `version`, `license`, `attribution` (409, hướng dẫn tạo nguồn mới), hoặc chủ dự án
  chốt lại luật và ghi vào decision record.

<a id="b2-3"></a>
### B2-3 — Thấp — Ranh giới module D3: thêm một chỗ vượt mới (Content đọc bảng Pipeline), chỗ cũ (DB12) vẫn chưa chốt

- **Mô tả:** `sources.service.ts:136-140` (Content) chạy SQL thô trên `import_batches` và `import_row_keys` (bảng của Pipeline); comment tự nhận đây là
  cột của module khác. Cùng PR #169 lại dựng cơ chế `EntryUsageProbe` (`content/catalog/entry-usage.ts`, `content-pipeline/entry-usage.probe.ts`) đúng
  để tránh việc này cho xóa từ. Chiều ngược lại DB12 vẫn còn: `row-processor.ts:121,123,157`, `inflections-backfill.handler.ts:41,53` đọc
  `entries`/`entry_inflections`. Không có `@relation` xuyên module (d.1), nên vi phạm chỉ ở code.
- **Kịch bản phụ:** `DELETE` nguồn dùng `NOT EXISTS (… import_batches …)` ở READ COMMITTED; một upload đã kiểm nguồn (`uploads.service.ts:33-43`) nhưng
  chưa commit batch thì không bị thấy → nguồn bị xóa, batch trỏ vào id không còn (cột uuid trơn), worker ghi `entry_levels` lỗi FK → lô `failed`
  sau 3 lượt. Không hỏng dữ liệu; cửa sổ rất hẹp.
- **Đề xuất:** probe "nguồn đang được dùng" do Pipeline đăng ký như `EntryUsageProbe`; chốt DB12 (ngoại lệ hay chuyển sau `ContentService`); làm DB-T3.

<a id="b2-4"></a>
### B2-4 — Thấp — Khung job nền và số liệu B2#70 không được chạy lại trên DB thật kể từ 13–18/10, trong khi code đã đổi

- **Mô tả:** B2#34–B2#39 (thử lại, worker chết giữa lô, lease bị lấy, Redis mất dữ liệu, hai lô cùng nguồn) giờ chỉ còn unit test có mock
  (`job-runner.service.spec.ts:30-58`, `background-jobs.service.spec.ts:18-33`). Lần cuối tắt worker giữa lô thật: 13/10 (`buoc-2.md:35-37`).
  `real-files.e2e-spec.ts` (B2#70) bị xóa ở `420e93d`. Sau đó khung job đã đổi: thêm dừng job bằng tăng `lease_epoch` (`ee965b8`, #169) mà
  #169 tự ghi "chưa kiểm: dừng lô đang chạy với worker thật" (`giao-dien-admin.md:607`). `smoke:buoc-2` (`scripts/smoke-buoc-2.mjs`) chỉ đi luồng thuận.
- **Kịch bản hỏng:** lỗi kiểu "worker thứ hai không nhận job" của 13/10 (không log, không lỗi) quay lại sau một thay đổi ở `job-runner`/`job-queue`;
  unit test có mock không thấy (chính `2026-10-18-remove-backend-e2e-analysis.md:55` đã nêu rủi ro này).
- **Đề xuất:** thêm vào `smoke:buoc-2` một bước "tắt worker giữa lô rồi chạy lại, đếm entry/level" và một bước "dừng publish job đang chạy"; hoặc
  đưa B2#70 vào `test:scale` (lệnh riêng, cần Docker).

<a id="b2-5"></a>
### B2-5 — Thấp — Tìm kiếm và duyệt của người học chưa đo khi bảng có từ riêng của người học

- **Mô tả:** Design §9/§17 chấp nhận quét tuần tự vì "~9.800 entry". Từ Bước 3, từ riêng của người học nằm chung bảng `entries`/`senses` (cột `scope`).
  Câu `GET /v1/senses/search` và `GET /v1/senses` bắt đầu từ `FROM senses s` (`learner-content.service.ts:121`), lọc `e.scope = 'catalog'` sau join
  (`:106`), khớp `ILIKE '%q%'` trên lemma và biến thể (`:95,103`). `test:scale` chỉ đo `/v1/lookup` và `/v1/words` (`test/content/lookup.scale.e2e-spec.ts:22,49-50`).
  Tiền lệ: T5 (18/10) đo `/v1/lookup` 36 → 798 ms khi có 300.000 từ riêng, cùng kiểu truy vấn.
- **Trạng thái:** `ASSUMPTION` (chưa đo, có thể planner lọc tốt). Không phải lỗi đã thấy.
- **Đề xuất:** thêm search/browse vào `lookup.scale.e2e-spec.ts` trước launch (cùng mục `test:scale` trong `deploy-checklist`).

<a id="b2-6"></a>
### B2-6 — Thấp — Trần 3 lượt job dựa vào bộ đếm của BullMQ, không phải `background_jobs.attempts` như design

- **Mô tả:** Design §7: "`background_jobs.attempts` là bộ đếm chuẩn". Runner chọn thử lại hay `failed` theo `job.attemptsMade` của BullMQ
  (`job-runner.service.ts:78`); `acquire` lấy job hết lease mà không xét `attempts` (`background-jobs.service.ts:76`); reconciler thêm lại một job
  BullMQ mới với `attempts: 3` (`job-queue.service.ts:66`, `job-reconciler.service.ts:68`).
- **Kịch bản:** Redis mất job đang chờ backoff → reconciler thêm lại → job có thêm 3 lượt; tổng có thể ~5 lượt thay vì 3. Ảnh hưởng nhỏ vì dòng
  đã xong được bỏ qua nhờ khóa dòng.
- **Đề xuất:** trong nhánh lỗi, so `lease.attempts` (DB) với `jobAttempts`; hoặc ghi rõ vào design.

<a id="b2-7"></a>
### B2-7 — Thấp — Tài liệu hướng dẫn kiểm lại Bước 2 trỏ tới lệnh không còn

- `buoc-2-test-flow.md:15,18` bảo chạy `pnpm test:e2e` và kỳ vọng "575 unit + 457 e2e"; script không còn (`grep test:e2e apps/api/package.json` rỗng).
  `buoc-2-5-test-flow.md` §1 cũng còn dòng `apps/api pnpm test:e2e`. Người làm theo "Chạy theo thứ tự dưới khi cần xác minh lại toàn bộ Bước 2" sẽ gặp
  lệnh không tồn tại. Nhãn "B2#66" trên một spec không còn kiểm điều B2#66 hứa (B2-1) cũng là một lời hứa lệch.
- **Đề xuất:** thêm một dòng "từ 18/10 (D38) thay bằng: CI + `smoke:buoc-2` + `admin-e2e-real`" ở đầu hai file; đổi tên test ở `list-routes.spec.ts:34`
  nếu không khôi phục audit.

<a id="b2-8"></a>
### B2-8 — Thấp — Nợ kỹ thuật nhỏ

- `writeEntry` (đọc entry `scope: 'catalog'` rồi khóa khóa entry) chép hai lần: `content/catalog/admin-entries.controller.ts:26` và
  `content/senses/admin-senses.controller.ts:39`. Đây là điểm chặn "staff không đụng từ riêng" (B2#69): sửa một bản mà quên bản kia sẽ lệch.
- `batch_records` không có index theo `(record_type, record_id)`, `import_row_keys` không có index theo `batch_id`; probe xóa từ quét `import_row_keys`
  bằng `row_key::jsonb ->> 1` (`entry-usage.probe.ts:48-53`). Nhỏ ở cỡ hiện tại (vài chục nghìn dòng mỗi lần nhập CEFR-J); ghi để biết khi số lô tăng.

<a id="b25-1"></a>
### B25-1 — Vừa — Lớp chặn ở API của "bắt đổi mật khẩu" (D21, B25#26) không còn test nào

- **Mô tả:** Mật khẩu ban đầu của staff đi nguyên văn trong email (D18–D20), nên design 2.5 §7.5 chặn ở **cả API**: `PermissionGuard` trả 403
  `password-change-required` khi cờ bật (`permission.guard.ts:41-42`). Test cho nhánh này nằm trong e2e backend đã xóa. Hôm nay:
  `grep -rn "mustChangePassword|must_change_password" src --include=*.spec.ts` chỉ ra fixture đặt `false`; `permission.guard.spec.ts` không có ca nào;
  `admin.real.spec.ts:71-75` chỉ kiểm giao diện tự chuyển về `/change-password` (chặn ở client); `smoke-buoc-5/6/7.mjs` tạo editor với
  `must_change_password: false`.
- **Kịch bản hỏng:** một thay đổi ở guard làm mất hai dòng 41–42 → người nhận được email (hoặc người đọc trộm hộp thư, B25E14) dùng mật khẩu tạm gọi
  thẳng mọi API staff bằng curl mà không cần đổi mật khẩu; CI vẫn xanh.
- **Kèm theo:** các tiêu chí khác chỉ có "e2e API" cũng mất test: B25#15/#16 (phân trang danh sách publish job), B25#17 (nửa "header lạ bị chặn" của
  CORS), B25#17a (`GET /v1/admin/taxonomy/topics`), B25#24 (mật khẩu tự gõ sai chính sách → không tạo, không gửi thư), B25#28 (hết hạn mức thư → 503,
  không tạo). B25#12 vẫn được `admin-e2e-real` phủ (preflight có `Idempotency-Key`).
- **Đề xuất:** unit test cho guard với `mustChangePassword: true` (403 đúng `type`, và route không có `@RequirePermission` vẫn qua); một bước smoke gọi
  một route staff bằng phiên còn cờ.

<a id="b25-2"></a>
### B25-2 — Thấp — "Xuất từ chưa có nghĩa" có API từ Bước 3 nhưng admin không gọi; tài liệu vẫn ghi backlog

- `GET /v1/admin/content/entries/export?has_sense=false` có ở `content-pipeline/export/senses-export.controller.ts:18-23`. `grep -rn "entries/export"`
  trong `apps/admin/src`: 0 dòng; trang Xuất chỉ gọi `senses/export` (`apps/admin/src/features/content/content-api.ts:129`). `ADMIN_CRUD_SURVEY_2026-10-28.md` §3
  ("API có nhưng admin không gọi") không liệt kê nó; `buoc-2-5.md:95-96` và design 2.5 §15 vẫn ghi "backlog".
- **Kịch bản:** editor làm đúng luồng chính sau khi nhập CEFR-J (7.799 từ chưa có nghĩa) vẫn phải tự soạn CSV theo `headword,pos`, dù API đã có.
  Lưu ý: không lọc level thì 7.799 > `EXPORT_MAX_ROWS` 5.000 → 400 (P1 của `buoc-3-test-flow.md:67`).
- **Đề xuất:** thêm lựa chọn "Từ chưa có nghĩa" (bắt buộc chọn level) ở trang Xuất; sửa dòng backlog trong hai tài liệu.

<a id="b25-3"></a>
### B25-3 — Thấp — `admin:grant` (CLI) cấp admin cho tài khoản bị khóa hoặc đang xóa; admin bị khóa vẫn được tính là "admin còn lại"

- `grantAdminByEmail` (`identity/staff/staff.service.ts:368-376`) chỉ kiểm tồn tại và đã xác minh; `setStaffRole` thì từ chối `locked` và `deleting`
  (`:356-357`). API không khóa được admin (`:300`), nên CLI là đường duy nhất tạo ra "admin bị khóa". Đếm admin cuối (`:358`) loại `deleting` nhưng
  tính `locked`.
- **Kịch bản:** chủ dự án chạy `pnpm admin:grant` cho một tài khoản đang bị khóa → admin đang hoạt động duy nhất tự hạ xuống editor (được phép vì
  đếm ra 2) → không còn ai đăng nhập được với quyền `roles.manage` cho tới khi chạy CLI lại. Khôi phục được, nhưng trái luật "không còn 0 admin".
- **Đề xuất:** CLI trả `locked`/`deleting` như `unverified`; hoặc đếm admin cuối chỉ tính `status = 'active'`.

### Spot-check không thấy lỗi (đã đọc code)

- **Editor tự nâng quyền:** `editor` không có `roles.manage` (`identity.types.ts:17`); mọi route đổi vai trò/tạo tài khoản dưới `roles.manage`
  (`list-routes.spec.ts:48-57` khẳng định danh sách này).
- **Admin tự hạ còn 0 admin:** khóa advisory `identity.staff_role` + đếm (`staff.service.ts:353,358`), unit `B1#28` (`staff.service.spec.ts:57`). Ngoại lệ ở B25-3.
- **Staff chỉ chạm catalog (B2#69):** `writeEntry` lọc `scope: 'catalog'` (`admin-senses.controller.ts:43`, `admin-entries.controller.ts:32`),
  `publish.service.ts:80`, `entry-delete.service.ts:47`, export/list qua `catalogWhere` (`admin-catalog.queries.ts:260`).
- **Xóa từ không xóa nhầm từ đang học:** một transaction, khóa khóa entry + `FOR UPDATE`; từ chối nếu từng publish (`entry-delete.service.ts:17-19`,
  sense `unpublished` cũng tính), có `form_of` trỏ tới, có câu ngữ cảnh, hoặc probe Learning/Practice/Pipeline báo dùng; thiếu probe thì ném lỗi
  (`entry-usage.ts:41`). Ba probe có đăng ký (`grep "implements EntryUsageProbe"` ra đủ `learning`, `practice`, `content-pipeline`).
- **Revert không xóa nội dung đang hiện với người học:** bỏ qua revision đã publish (`revert.service.ts:115-118`), giữ sense có live revision (`:141`),
  giữ level staff đã xác nhận (`:165`) và level duy nhất của entry đang có sense live (`:169`). Learner chỉ thêm được sense đã publish, nên sense revert
  được xóa chưa từng có người học.
- **Xóa nguồn:** một câu `DELETE … NOT EXISTS` + FK `RESTRICT` của `entry_levels` (`sources.service.ts:132-150`; schema `content.prisma:89`).
- **Idempotency:** upload băm cả nội dung file vào payload (`idempotency.interceptor.ts:48-55`); upload, revert, tạo publish job có `@Idempotent`;
  publish đồng bộ idempotent tự nhiên theo `revision` (`publish.service.ts:100-101`).
- **Bộ lọc lô rỗng không thành "publish cả kho":** lô không có sense → `senseIds = []` → `id: { in: [] }` (`admin-catalog.queries.ts:265`) → 400
  `nothing-to-publish`. (Ngữ nghĩa `in: []` của Prisma là không khớp gì: đọc từ hiểu biết về Prisma, chưa chạy thử ở đây.)
- **File CSV:** multer giới hạn 10 MB và 1 file (`content-pipeline.module.ts:32-37`), kiểm lại byte (`csv-file.ts:66`), giải mã UTF-8 `fatal: true` (`:75`),
  dấu phân cách nhập nhằng bị từ chối (`:50-57`).
- **CSV injection khi xuất:** `csvCell` thêm `'` trước `= + - @` (`csv-writer.ts:3`); tab/CR đầu ô không thể có vì mọi ô qua `normalizeText` cắt và gộp
  khoảng trắng (`catalog/normalize.ts:2`; ô API qua `content-body.ts:7`); export dùng `csvRow` (`export.service.ts:71`).
- **Tìm kiếm:** `%`, `_`, `\` được thoát và `ESCAPE '\'` (`learner-content.service.ts:91,95,103`); chỉ sense `open` + live + catalog (`:105-106`).
- **Log:** mọi `logger.*` trong `content-pipeline` chỉ mang id, đếm, thời gian (d.6); `staff_account_created`/`staff_role_changed` không có email.
- **Advisory lock:** `pg_advisory_xact_lock` theo `(lemma, pos)` (`entries.service.ts:40`) dùng chung cho UI, import, revert, xóa từ. (Đề bài nhắc
  `pg_try_advisory_xact_lock`: hàm đó không có trong `content`/`content-pipeline`; nó thuộc cơ chế idempotency của Bước 0.)
- **Index cho bất biến và truy vấn chính:** partial unique `senses_entry_label_live_key`, `senses_one_replacement_key`, `sense_revisions_one_open_key`
  (`20261012120000_content/migration.sql:177-179`); `lower(lemma)`, `lower(text)` (`20261021090000_lookup_indexes/migration.sql:2,4`); GIN `topic_codes`
  (`…content/migration.sql:129`); job `(queue, status, lease_expires_at)` và partial unique `exclusive_key` (`…pipeline/migration.sql:107,110`).

### Lệch design ↔ as-built ↔ code (ngoài các mục trên)

- Revert: design Bước 2 §10 chỉ `content.import`; code đòi `content.import` **và** `content.edit` (`uploads.controller.ts:26`); design 2.5 §6.3 khớp code. Hai
  vai trò hiện có đủ cả hai, không ảnh hưởng.
- Publish nhanh: design `PUT …/draft?publish=true`; code `POST …/senses/:id/quick-publish` (`admin-publish.controller.ts:56-58`), vẫn đòi đủ hai quyền.
  Design ghi đường dẫn là đề xuất.
- Thêm sau design, không có design Bước 2 cập nhật: sửa/xóa nguồn, xóa từ, dừng publish job (#169), xuất từ chưa có nghĩa (Bước 3).
- `buoc-2.md:76` ghi PR #16 merge 14/10; GitHub ghi `mergedAt 2026-10-13T09:59:46Z` (16:59 giờ VN ngày 13/10).

## (d) Lệnh tìm "không có" kèm đối chứng

1. **Không có `@relation` xuyên module (content, pipeline):** lấy mọi kiểu model được tham chiếu trong `content.prisma`, `pipeline.prisma` rồi trừ các model định
   nghĩa trong cùng file → rỗng cho cả hai. Đối chứng: danh sách tham chiếu có `DataSource`, `ImportBatch`, `BackgroundJob` (quan hệ trong module, ví dụ
   `pipeline.prisma` `job BackgroundJob @relation(...)`). `grep` tên model Content/Pipeline trong các `*.prisma` khác: 0 dòng; đối chứng `grep -c "@relation" identity.prisma` = 6.
2. **Không có route admin thiếu quyền (hôm nay):** vòng lặp qua mọi file có `@Controller('admin...` (27 file), đếm `@RequirePermission` ở class và số route →
   cả 27 có quyền (`admin-entitlements.controller.ts` khai ở từng method, 5/5). `grep -E "@(Get|Post|Put|Patch|Delete)\('admin"`: 0 dòng (không có route admin
   khai trong controller khác). Đối chứng: chính vòng lặp in ra `staff.controller.ts classLevel=1 requirePerm=3 routes=10`.
3. **Chỗ vượt ranh giới D3:** `grep -rnE "\b(tx|prisma|this\.prisma)\.(entry|entryVariant|…|entryInflection)\b" src/content-pipeline` → 5 dòng (B2-3);
   `grep` tên bảng Pipeline trong `src/content` → 2 dòng `sources.service.ts:139-140`; `grep` model Content ngoài `src/content` và `src/content-pipeline` → 0 dòng.
4. **Kiểm cấu hình multer — kiểm "dụng cụ":** lần `grep -rn "MulterModule|fileSize|limits" src | head` đầu tiên **bị `head` cắt** sau 10 dòng kết quả AI, nên trông như
   không có giới hạn; đọc thẳng `content-pipeline.module.ts` thì thấy `limits: { fileSize: importMaxBytes, files: 1 }` (`:32-37`). Đã rút lại nghi vấn này;
   không có phát hiện. Cùng file xác nhận không có `defParamCharset` (PL8 còn mở).
5. **Không có `pg_try_advisory_xact_lock` trong Content/Pipeline:** `grep -rn "advisory" src/content src/content-pipeline` → 4 dòng, đều `pg_advisory_xact_lock`
   (đối chứng: thấy `entries.service.ts:40`).
6. **Log không mang giá trị ô:** `grep -rn "logger\.(info|warn|error)" src/content-pipeline` → 21 dòng, đọc từng dòng: chỉ `batch_id`, `job_id`, `queue`,
   `counts`, `attempt`, `duration_ms`, `error` (lỗi Redis/kết nối). Đối chứng: `import-batch.handler.ts:123` có comment "Never log … any other file value".
7. **Mã `B2#` không còn spec:** so `grep -oh "B2#[0-9]+[a-c]?"` của design (80 mã) với mọi `*.spec.ts` dưới `apps/api/{src,test}` (28 mã) → 52 mã không có
   (danh sách đủ: B2#1, 2, 5, 7, 8, 9, 14, 14a, 15, 17, 18, 19, 22, 24, 24a, 25, 31, 32, 35–40, 40a, 41–49, 45b, 45c, 50, 51, 52, 52a, 56, 56a, 57–61, 63, 64, 68,
   69, 71). Đây là cận dưới của lỗ hổng: spec có thể kiểm hành vi mà không ghi mã (ví dụ `publish.service.spec.ts:87` kiểm T1, `revert.service.spec.ts:55-99`
   kiểm luật revert). Đối chứng: 28 mã có mặt, ví dụ B2#10–B2#13a.
8. **Mã `B25#` không còn test:** cùng cách cho 30 mã của design 2.5 trên `apps/api` và `apps/admin/{src,e2e,e2e-real}` → thiếu B25#15, #16, #17, #17a, #24, #26,
   #28. Đối chứng: phía API vẫn thấy B25#23; phía admin thấy B25#12, #14 (`admin.real.spec.ts:112`).
9. **Không có test cho `password-change-required`:** `grep` trong `src/**/*.spec.ts` → chỉ fixture `mustChangePassword: false`; trong `apps/admin/e2e*`
   → 0 dòng; trong `apps/api/scripts/*.mjs` → 3 dòng, đều `must_change_password: false` (đối chứng cho việc grep đúng chỗ).
10. **Admin không gọi `entries/export`:** `grep -rn "entries/export"` trong `apps/admin/src` → 0 dòng; đối chứng `getBlob(` ra 3 chỗ, có `senses/export`
    (`content-api.ts:129`).
11. **Không có test quyền cho controller lõi Bước 2:** lệnh ở B2-1 → chỉ 2 file; đối chứng `publish-jobs.controller.spec.ts:101` có ca "learner … → 403".
12. **Không có kiểm audit toàn cục trong spec còn lại:** `grep -rn "auditAdminRoutes" src test` → 0 dòng; đối chứng `git show 420e93d^:apps/api/test/content/admin-permissions.e2e-spec.ts`
    dòng 33, 58, 74 có hàm và hai test của nó.
