# AI workspace — bàn giao 01/11/2026

Trạng thái cập nhật 15:32, 01/11/2026: code đã triển khai; Docker đã khôi phục, API + worker và admin bản mới đang chạy local. Đã backup DB local trước khi startup áp dụng migration. **Real-stack e2e và smoke cuối vẫn chưa chạy**. Không push, mở PR hay merge.

Worktree chứa code: `E:/Working/Working project/english-learning-nhomb-m6`, branch `codex/ai-workspace`. Worktree native app ở `C:/Users/Tien Ngo/.codex/worktrees/ai-workspace/english-learning` vẫn detached tại base c55d3178; không chứa bản sửa này.

## Đã triển khai

- Bộ ví dụ: checkbox trang/toàn bộ kết quả lọc, giữ selection qua page/filter, reset khi đổi operation; bulk delete atomic và retry-safe, giữ frozen snapshots.
- Nhiều nháp theo ID, clone, tên, optimistic version, immutable save revisions và soft delete có active-run guard.
- Temporary quick-test/eval không tự save; worker đọc snapshot; fingerprint đúng nội dung để dùng lại evidence sau save. Baseline, latest set, warning gates và caps giữ nguyên.
- Workspace danh sách/editor/lịch sử với live panel chung, không có nút tạo trên panel; dev picker tối đa5, search/CEFR; lịch sử gồm nháp đã xóa/publish và legacy.
- Ledger liên kết batch cho mọi attempt/retry; chi phí/token từ SQL Decimal, subtotal chưa đủ giá, source links, legacy aggregates và expiry của output.
- Publish và hide/delete evidence được serialize; trạng thái batch cuối giữ lại sau khi xóa source. Recovery xử lý stalled eval/judge/test.
- Client/helpers/smokes chuyển sang plural draft ID và target; có real-stack story mới.

## Commits

- 4557b94e `feat(ai): add bulk selection and deletion for eval examples`
- 6708acc1 `feat(api): support versioned drafts and snapshot batch execution`
- 44cde84b `feat(admin): add draft workspace and batch cost history`
- 08e492a4 `fix(admin): preserve quick test feedback in draft workspace`
- 7110432b `test(api): expose batch cursor timestamp precision loss` — quan sát RED trước fix.
- f7eebce3 `fix(api): retain database precision in batch pagination` — query lấy timestamp chính xác từ immutable batch row; không dùng mốc bị làm tròn trong JavaScript.
- Commit cuối `test(ai): update workspace regressions and delivery notes` chứa fixtures, smoke conversion, bounded waits và tài liệu này.

## Bằng chứng hiện có

- API full trước fix cursor cuối:298 files,4026 tests passed; API focused:38 files,607 tests passed. Sau fix cursor:2 files,21 tests passed và typecheck exit0. Admin workspace/costs focused:7 files,95 tests passed; helper scripts:12 tests passed.
- Browser full:370 cases,299 passed/3 failed/68 skipped;3 failures là fixtures theo luồng editor cũ, đã cập nhật và rerun3 passed/1 existing skip. Kết quả theo case:302 passed,68 existing skips. Browser workspace/costs/axe riêng:41 passed/1 skipped; story390px chạy ở cả hai projects.
- API/admin typecheck, lint và build exit0. Lint API có2 warnings ở mail/deletion cũ; admin build cảnh báo chunk size.
- Migration fresh scratch:45 migrations applied và drift empty; seeded preservation: configs/events/runs/labels 7/1/1/1 không đổi; imported revisions7, exact eval call được gắn batch, quick-test legacy không bị nhóm giả. Xem `ai-workspace-migration-output.txt`.
- Admin full cuối:99 files,1316/1316 passed trong một lượt chạy (313.10s). Các full runs trước và scoped reruns vẫn lưu riêng trong `ai-workspace-verification.txt`. Quick-run/history/workspace sau chuyển route:25/25 passed; quota/429/offline/double-click/unsaved content được kiểm lại trên editor mới. Bộ ví dụ cuối:60/60 passed.
- Các full runs trước có timeout. Giữ mọi assertion và tăng bounded waits đúng những luồng nhiều bước/cold render đã vượt ngưỡng; không đổi hành vi production để né lỗi test. Full run cuối exit0.

## Chưa verified và việc còn lại

1. **Real-stack e2e và smoke cuối chưa chạy.** Docker blocker đã được xử lý khi owner yêu cầu bật API: giữ lại các thư mục socket cũ bằng tên backup rồi để Docker tạo runtime mới. API health HTTP200 và admin bundle mới đã được kiểm tra. Startup không thay thế regression qua DB/worker thật. Xem phần recovery trong `ai-workspace-runtime-blocker.txt`.
2. Các CTE/SQL và locks thêm sau migration check mới được kiểm qua unit boundaries/types; chưa có integration PostgreSQL cho bản code cuối, đặc biệt publish/freeze/remove ordering, last_run/batch aggregation và cursor batch timestamp. Test SQL shape không chứng minh execution PostgreSQL.
3. Đợt kiểm thử tiếp theo cần DB smoke riêng, API+worker fake, keys trống; chạy `pnpm --filter api db:setup`, drift, `pnpm --filter api smoke:nhom-b` hai lần DB mới, smoke:buoc-6/7 trên DB riêng, rồi `pnpm --filter admin test:e2e:real`. Test mới `e2e-real/ai-workspace.real.spec.ts` kiểm hai draft, temporary snapshot, save reuse, publish và costs UI. Không dùng DB đang chạy để thử thủ công làm DB smoke.
4. Publish dùng SHARE table lock ngắn trên ai_eval_sets để bảo vệ latest set; có thể trì hoãn freeze của operation khác trong thời gian transaction. Không giữ lock khi gọi provider.
5. Không đánh giá chất lượng model thật. Snapshot chỉ chứng minh nội dung đã chạy, không bảo đảm output tái lập. Lịch sử save trước migration không thể phục hồi nếu dữ liệu không còn.

Hướng dẫn thao tác: `../guides/ai-workspace.md`. Design/decisions mới: `../superpowers/specs/2026-11-01-ai-workspace-design.md`, `../superpowers/decisions/2026-11-01-ai-workspace-decisions.md`.

## Chỉnh bố cục Cấu hình và Bộ ví dụ (02/11/2026)

Theo mockup chủ dự án duyệt: `../mockups/2026-11-02-ai-workspace-refine/index.html` (thêm: sort mặc định Held-out trước, nút "Chọn toàn bộ", hàng tab không có thanh cuộn).

- Component mới `apps/admin/src/ui/PageTabs.tsx`: các trang con là link có gạch chân và số đếm, tự xuống dòng thay vì cuộn.
- Cấu hình: "Các bản nháp / Lịch sử" thành tab có số nháp; [Tạo nháp] nằm trên hàng tab; danh sách nháp thành bảng Nháp · Model · Lần chạy gần nhất · Cập nhật với chip trạng thái; fingerprint rút 8 ký tự. Trang Lịch sử vẫn không đọc danh sách nháp.
- Bộ ví dụ: ô số ví dụ bên phải (thanh dev xanh / held-out vàng); 3 trang con `/ai/eval`, `/ai/eval/sets` (bảng phiên bản + box Chạy bộ ví dụ 70/30), `/ai/eval/runs`; thanh chọn một hàng, bỏ dòng giải thích; sort mặc định Held-out trước; chip dev màu primary; xóa một lần chạy quay về `/ai/eval/runs`.
- Kiểm: admin unit liên quan 19 file / 295 test pass; typecheck, lint (gồm check raw Tailwind) exit 0; e2e mocked `ai-eval`, `ai-configs`, `a11y`, `ui-guidelines` pass (desktop + 390px, axe sạch). Full admin unit chạy một lần giữa chừng: 1321/1322, test hỏng (`EvalRunPanel` quay về `/ai/eval`) đã sửa và chạy lại pass; chưa chạy lại toàn bộ sau sửa. Real-stack chưa chạy.
