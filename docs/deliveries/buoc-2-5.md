# Bước 2.5 — plan tóm tắt (14/10/2026)

Plan đầy đủ: `docs/superpowers/plans/2026-10-14-buoc-2-5-admin-web.md` (18 task, 4 milestone). Design:
`docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md`.

- **M0 — Figma** (không code; chủ dự án duyệt xong mới sang M2): dựng biến token và component nền → vẽ các màn tài khoản
  (desktop + mobile) → vẽ khung app, màn vai trò và luồng CSV, rồi xin chủ dự án duyệt.
- **M1 — Backend** (làm song song với M0): CORS cho phép `Idempotency-Key` và mở `Retry-After` → `endpoint` liệt kê
  publish job có phân trang → `endpoint` liệt kê topic cho staff.
- **M2 — Khung app, phiên, tài khoản, vai trò:** dựng `apps/admin` kèm kiểm `VITE_API_BASE_URL` và job CI `admin` → API
  client đọc lỗi Problem Details và tạo `Idempotency-Key` → quản lý phiên (refresh, luật chặn, đồng bộ đăng xuất giữa tab)
  → khung app, menu theo quyền, đổi ngôn ngữ, bộ test e2e với API giả → các màn đăng nhập, đăng ký, OTP, quên mật khẩu →
  màn quản lý vai trò.
- **M3 — Luồng CSV và hoàn tất:** màn nguồn dữ liệu và upload CSV → chi tiết lô (tự cập nhật, tải dòng lỗi, publish,
  hoàn tác) → xuất CSV theo bộ lọc → danh sách, tạo và chi tiết publish job → test e2e với API thật và job CI
  `admin-e2e-real` → chạy tay "Xong khi" và cập nhật tài liệu.

# Bước 2.5 — tiến độ (15/10/2026, chưa phải as-built)

Ảnh chụp giữa chừng để phiên sau nối tiếp; bản as-built đầy đủ viết ở Task 18.

**Lưu ý của chủ dự án (15/10/2026):** giao diện admin nhiều khả năng sẽ **refactor lại toàn bộ** sau này. Coi lớp hiển thị
hiện tại (kiểu Sneat, Figma duyệt 14/10/2026) là tạm. Phần nên giữ khi refactor: luật phiên và cổng truy cập, cách gọi API
(`Idempotency-Key`, Problem Details, polling), các edge case B25E1–E29 của design, và bộ test hành vi.
**Cập nhật 28/10/2026:** việc làm lại này đã xong qua UI refresh B (PR #22–#24, `docs/deliveries/ui-refresh-b.md`); chủ dự án chốt như vậy ở AD2 ngày 27/10/2026
(`docs/superpowers/decisions/2026-10-27-giao-dien-admin-decisions.md`), nên lớp hiển thị hiện tại không còn là "tạm". Đợt giao diện admin code các màn mới theo Figma page 04, hướng B
(`docs/deliveries/giao-dien-admin.md`).

| Milestone | Trạng thái | Nhánh / PR |
|---|---|---|
| M0 Figma | Xong, chủ dự án duyệt 14/10/2026 (file `coVHzJwTFgMbooUrty7sOq`) | — |
| M1 Backend | Xong, đã merge `dev` | `feat/buoc-2-5-m1-backend`, PR #17 (CI xanh) |
| M2 Khung app, phiên, tài khoản, vai trò | Xong, đã merge `dev` | `feat/buoc-2-5-m2-admin-shell`, PR #18 (CI xanh) |
| M3 Luồng CSV | Task 13–18 xong local (15/10/2026); chưa push, CI chưa chạy | `feat/buoc-2-5-m3-csv-flow` (worktree `english-learning-wt-m3`, commit cuối `5251047`) |
| Docs (design, decisions, plan, file này) | **Chưa commit** | `docs/buoc-2-5-design` |

**M1 có gì:** CORS cho `Idempotency-Key` và `Retry-After`; `GET .../senses/publish-jobs` (phân trang keyset);
`GET /v1/admin/taxonomy/topics`; cột `must_change_password` + 403 `password-change-required`; `POST /v1/admin/users` (admin
tạo tài khoản staff, mật khẩu sinh hoặc tự đặt, gửi qua email). Full e2e API xanh trên CI của PR #17.

**M2 có gì:** `apps/admin` (Vite + React): API client, quản lý phiên (refresh cookie, luật cổng, đồng bộ tab), đăng nhập, quên
mật khẩu, đổi mật khẩu bắt buộc, khung app 16 mục menu (mục ngoài 2.5 hiện "Tính năng chưa có"; đến 28/10/2026 cả 24 mục menu đều có màn, xem `giao-dien-admin.md`), trang Vai trò & staff + tạo
tài khoản. Không có tự đăng ký. Kiểm tay 14/10/2026 với API thật: đăng nhập, trang staff, F5 giữ phiên đều chạy.

**M3 đã làm (review từng task, gate chạy lại trên bản copy sạch):** nguồn + upload CSV (13); chi tiết lô, polling, publish,
hoàn tác (14); xuất CSV theo bộ lọc (15); danh sách/tạo/chi tiết publish job (16). Đang dở lúc ghi: gợi ý worker cho publish
job (đã commit), sửa test chập chờn `CreateAccount.test.tsx`, hộp xác nhận B25E29, merge `origin/dev` vào nhánh M3.

**Quyết định phát sinh khi làm (đã ghi vào design §12 và decision record):**
- D24 / B25E28: "Publish lô này" chỉ hiện khi lô `succeeded`/`partial` và chưa hoàn tác (API không kiểm trạng thái lô).
- D25 / B25E29: publish job với bộ lọc rỗng phải qua hộp xác nhận.

**Giới hạn đã chấp nhận (đưa vào as-built):** danh sách lô không hiện "Đã hoàn tác" (API danh sách không trả `reverted`;
Figma đã sửa theo); bộ lọc "Lô nhập" chỉ có 20 lô mới nhất; chi tiết publish job không hiện bộ lọc (API chi tiết không trả
`filter`); trang lô thất bại dùng câu chung (API không trả lý do).

**Còn lại:** xem mục "as-built" bên dưới (cập nhật 15/10/2026).

**Kiểm local (đã dùng 14/10/2026):** API + worker chạy từ `english-learning-wt-m1/apps/api` (`pnpm run:dev`, `.env` do chủ dự
án tạo; `apps/api` ở đó giống hệt `dev`); admin `pnpm dev` ở cổng 5173. Máy hay thiếu RAM (crash 0xC0000409) khi chạy
song song nhiều bộ test — chạy e2e từng file.

# Bước 2.5 — as-built (15/10/2026)

Kết quả kiểm chi tiết (gate, chạy tay "Xong khi", phát hiện): `docs/deliveries/buoc-2-5-test-flow.md`.

**Trạng thái:** **Xong** — M1, M2, M3 và docs đều trên `dev` (PR #17, #18, #19, #20); xem "Đóng Bước 2.5" ở cuối mục này.

**M3 có gì** (12 commit trên `feat/buoc-2-5-m3-csv-flow`, sau lần merge `dev` có M1+M2):
- Nguồn dữ liệu và upload CSV (chọn nguồn level khi file có cột level, `Idempotency-Key` theo file + nguồn).
- Chi tiết lô: tự cập nhật (polling), 5 bộ đếm, tải `rejected.csv` (chỉ khi có dòng bị loại), "Publish lô này" chỉ khi lô
  `succeeded`/`partial` và chưa hoàn tác (D24), "Hoàn tác lô".
- Xuất CSV theo bộ lọc (trạng thái, level, từ loại, topic, lô).
- Publish job: danh sách, tạo theo bộ lọc (bộ lọc rỗng phải xác nhận, D25), chi tiết kèm gợi ý worker khi job đứng `queued` quá lâu.
- Test e2e với API thật (7 test nối nhau: tạo editor, cấp/gỡ vai trò, upload → `rejected.csv` → publish → hoàn tác, giữ phiên khi
  F5, gỡ quyền khi đang mở trang, đổi mật khẩu thu hồi phiên, hai tab refresh cùng lúc + đăng xuất đồng bộ) và job CI
  `admin-e2e-real` (Postgres 5434, Redis 6380, Mailpit; secret sinh mỗi lần chạy).

**Rà Web Interface Guidelines (15/10/2026, sau Task 18)** — nhánh `fix/admin-ui-guidelines` (tách từ M3, commit `b5c380e`
test trước, `761ccd4` sửa sau; chưa push). Hai lỗi hiển thị thật: danh sách của ô chọn dài (vd. "Từ loại" ở 390×640) bị cắt,
không cuộn tới mục cuối được; ô bảng dùng `break-all` nên bẻ chữ giữa từ ("Chi tiế/t" ở 1024). Kèm theo: skip link, hover cho ô
chọn và nút ngôn ngữ/tài khoản, tắt spellcheck ở email và mã OTP, `tabular-nums` cho số, ngoặc kép cong, `translate="no"` cho
tên thương hiệu, spinner theo `prefers-reduced-motion`, `overscroll-contain` cho hộp thoại. Chưa sửa (để khi refactor giao diện):
nút điều hướng là button chứ không phải link, chưa focus ô lỗi đầu tiên, không cảnh báo rời form đang nhập, bộ lọc chưa vào URL,
danh sách luật mật khẩu đỏ ngay khi chưa gõ, vùng kéo thả nháy khi rê qua phần tử con.
*Cập nhật 28/10/2026:* ba điểm (focus ô lỗi đầu tiên, cảnh báo rời form đang nhập, bộ lọc vào URL) đã làm ở lớp dùng chung của M0 đợt giao diện admin (AD12, cho màn mới); ba điểm còn lại
chưa thấy tài liệu nào ghi là đã sửa.

**Số test (15/10/2026, local):** API 578 unit + 475 e2e; admin 219 unit + 67 e2e API giả + 7 e2e API thật (sau bản sửa giao
diện) — tất cả xanh.

**Chạy tay "Xong khi" trên DB mới:** đạt, gồm file CEFR-J 1.5 thật (7.799 entry + level, 213 giây), publish 4 nghĩa, learner tìm
thấy, learner bị chặn, editor bị đá khi gỡ quyền, 24 tổ hợp trang × bề rộng không tràn ngang. Lệch kịch bản và hai phát hiện được
chủ dự án chốt (D26–D28 trong decision record):
- D26: xuất `unpublishable` rỗng sau CEFR-J (xuất CSV chỉ duyệt sense) → sửa kịch bản trong design §1; "xuất từ chưa có nghĩa" vào
  backlog.
- D27 / B25E30: refresh bị 429 khi tải lại trang quá nhanh → app về `/login` không báo; để sửa khi refactor giao diện admin. **Đã sửa ở UI refresh B** (`docs/deliveries/ui-refresh-b.md`
  dòng 123: 429 khi làm mới phiên thì chờ `Retry-After`, thử tối đa 3 lần; ba lần 429 thì về đăng nhập kèm thông báo).
- D28: docs Bước 2.5 nằm trên `docs/buoc-2-5-design`, PR M3 chỉ chứa code.

**Giới hạn đã chấp nhận** (giữ nguyên từ mục tiến độ): danh sách lô không hiện "Đã hoàn tác"; bộ lọc "Lô nhập" chỉ có 20 lô mới
nhất; chi tiết publish job không hiện bộ lọc; trang lô thất bại dùng câu chung.

**CI (PR #19, 15/10/2026):** xanh cả 4 job — `admin` 2m36s, `admin-e2e-real` 1m53s (7 passed, lần đầu chạy trên CI), `api`
4m41s, `web` 3m11s. Các job chạy song song nên job thật không làm PR chờ lâu hơn (job dài nhất vẫn là `api`); ước tính 5–8
phút trong design là thừa.

**Chưa kiểm:** ngưỡng 30 giây gợi ý worker với worker thật bị tắt; trình duyệt ngoài Chromium.

**Đóng Bước 2.5 (15/10/2026):** PR #19 (code M3 + sửa giao diện, merge `7158071`) và #20 (docs, merge `62b9dc5`) vào `dev`;
đủ 3 tiêu chí "Xong khi". Chưa lên `main`. **Tiếp theo:** Bước 3; bước "Deploy API + admin" phải xong trước pilot Bước 3,
chưa chốt làm trước hay sau Bước 3.
