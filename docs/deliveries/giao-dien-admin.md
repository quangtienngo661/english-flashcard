# Đợt giao diện admin — plan tóm tắt (27/10/2026)

Plan chi tiết: [`../superpowers/plans/2026-10-27-giao-dien-admin.md`](../superpowers/plans/2026-10-27-giao-dien-admin.md). Design:
[`../superpowers/specs/2026-10-27-giao-dien-admin-design.md`](../superpowers/specs/2026-10-27-giao-dien-admin-design.md). Bảy PR vào `dev`, làm lần lượt,
mỗi PR một nhánh `feat/giao-dien-admin-<m>` tách từ `origin/dev` sau khi PR trước merge.

**M0 — Khung chung**
1. Chuyển admin sang data router, mọi route và test cũ giữ nguyên.
2. Client API có `patch`, `delete`, `put` kèm Idempotency-Key; giữ `reason` của lỗi; thêm câu cho các mã lỗi mới; test vi/en đủ khóa.
3. Menu 24 mục theo Figma; trang "Bạn không có quyền xem trang này." thay cho chuyển hướng im lặng.
4. Một chỗ chặn rời trang ở `Shell` khi form chưa lưu (không hỏi khi chỉ đổi tab hay bộ lọc, không hỏi sau khi lưu).
5. Giữ bản đang sửa khi phiên hết hạn, hỏi khôi phục sau khi đăng nhập lại.
6. Bộ lọc danh sách ghi vào URL (bỏ giá trị sai); lưu lỗi thì focus ô lỗi đầu tiên.
7. Component mới: ô nhiều dòng, công tắc, ô số, chọn một trong nhiều, hộp xác nhận.
8. Tài khoản dùng chung cho test trên stack thật (Minh, Lan, Khoa), bật AI giả trong CI, kiểm M0 và chụp màn.

**M1a — AI, cấu hình**
9. API: email người lưu prompt (bản seed hiện "Hệ thống") và câu chặn cố định.
10. API: số lần chạy thử còn lại trong giờ; mục đích của lỗi AI gần nhất.
11. Client API cho các màn AI.
12. Màn Tình trạng AI.
13. Màn Model (thêm, sửa giá, đọc lại thông tin, xóa).
14. Màn Thao tác (model, effort, thinking, token tối đa từng thao tác).
15. Màn Prompt (sửa, lịch sử, chạy thử, số lần còn lại).
16. e2e, test flow M1a và cổng merge.

**M1b — AI, đo**
17. API: email người tạo ví dụ và người chạy bộ ví dụ.
18. Màn Bộ ví dụ (ví dụ, các lần chạy, chạy với bản prompt đang sửa).
19. Màn Chi phí và Các lần gọi.
20. e2e, test flow M1b gồm các bước gọi AI thật bằng key của chủ dự án, cổng merge.

**M2 — Cài đặt hệ thống**
21. API: trả giá trị mặc định của cài đặt.
22. Màn Cài đặt hệ thống 6 tab, một nút lưu, lịch sử thay đổi.
23. e2e, test flow M2 và cổng merge.

**M3 — Báo lỗi**
24. API báo lỗi: email người xử lý, cờ "có trả lượt", đọc một báo lỗi, lựa chọn người học đã chọn.
25. API: lọc trả lượt theo email; editor đọc được danh sách lý do.
26. Màn Báo lỗi (danh sách, chi tiết, xử lý).
27. Màn Lý do báo lỗi.
28. Màn Trả lượt.
29. Màn Dạng chia chưa biết (nhận, hoàn tác, bỏ qua).
30. Dựng một báo lỗi câu AI cho test thật; e2e, test flow M3 và cổng merge.

**M4 — Người học**
31. API cấp gói: email các bên, trạng thái (gồm "Bị thay thế"), lần sửa gần nhất, lọc theo email.
32. API: tra một người học theo email trước khi cấp, giới hạn 60 lần mỗi giờ.
33. Màn Người dùng (tìm, lọc, chi tiết, khóa / mở khóa).
34. Màn Cấp gói: danh sách, thu hồi, sửa ngày.
35. Hộp Cấp mới (tra email, xác nhận khi người học đang trả tiền tự gia hạn, bản của editor).
36. e2e, test flow M4 và cổng merge.

**M5 — Nội dung**
37. API: cột "Thiếu" cho mọi bộ lọc nghĩa.
38. Chọn nhiều dòng trong danh sách.
39. Màn Từ (lọc, thao tác dòng, dán danh sách từ).
40. Màn Nghĩa: danh sách và 5 thao tác hàng loạt.
41. Chi tiết nghĩa (lưu bản nháp, lưu và publish).
42. Màn Chủ đề.
43. e2e, test flow M5; sửa tài liệu theo design §9; as-built cả đợt.

---

# Đợt giao diện admin — M0 as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m0`, một PR vào `dev`. Khung chung đã xong; chưa có màn mới nào (menu 24 mục, các màn chưa làm hiện "Tính năng chưa có").

## Đã làm (Task 1–8)

1. Data router, route và test cũ giữ nguyên: `6293bb6` refactor(admin): move to a data router.
2. Client API (`patch`, `delete`, `put` kèm Idempotency-Key, giữ `reason`) và câu lỗi mới: `84b60af`; sửa câu `operation-settings-conflict` theo copy doc: `3631356`.
3. Menu 24 mục theo Figma, trang "Bạn không có quyền xem trang này." thay chuyển hướng im lặng: `9fe9b1f`.
4. Một chỗ chặn rời trang ở `Shell` khi form chưa lưu: `23082bf`; bỏ câu hỏi bỏ thay đổi bị treo khi hộp thoại biến mất: `ed4cff2`.
5. Giữ bản đang sửa khi phiên hết hạn, hỏi khôi phục sau khi đăng nhập lại: `8bf3748`; giữ theo từng khóa, bỏ khi đã xác nhận rời trang: `af0f1a5`.
6. Bộ lọc danh sách ghi vào URL; lưu lỗi thì focus ô lỗi đầu tiên: `99bd3e4`.
7. Component mới: ô nhiều dòng, công tắc, ô số, chọn một trong nhiều: `f75b81c`; ô số hiện theo ngôn ngữ của app: `3d0da91`.
8. Tài khoản dùng chung cho stack thật (Minh = editor, Lan và Khoa = người học, tạo bằng `POST /v1/admin/users`, không tốn lượt đăng ký 5/giờ/IP), `AI_FAKE_ENABLED=true` trong job CI `admin-e2e-real`, e2e M0 (`m0.real.spec.ts`), kiểm không cuộn ngang ở 390 cho trang không có quyền, cổng chạy stack thật đọc `ADMIN_E2E_PORT` và `E2E_API_URL`: commit `test(admin): add the real-stack accounts and the m0 checks`.

## Ảnh chụp (stack thật, 27/10/2026)

Khung Figma đối chiếu: A/71e = node `387:1767`, file `7HcPAKLrWu32C27qYMJUOA`. Ảnh ở `docs/deliveries/giao-dien-admin/m0/`.
Khung Figma chỉ ghi bằng node id, có chủ ý: ảnh nằm trong Figma, không chép vào repo. Khác biệt nhìn thấy: trang "Bạn không có quyền xem trang này." đặt trên tờ trắng của trang
(như mọi màn khác), còn khung A/71e vẽ một thẻ trắng trên nền canvas.

| Màn | Desktop 1440×900 | Phone 390×844 |
|---|---|---|
| `/uploads` (admin, menu đủ mục) | [uploads-admin-desktop.png](giao-dien-admin/m0/uploads-admin-desktop.png) | [uploads-admin-mobile.png](giao-dien-admin/m0/uploads-admin-mobile.png) |
| `/staff` do Minh (editor) mở: "Bạn không có quyền xem trang này." (A/71e) | [no-access-minh-desktop.png](giao-dien-admin/m0/no-access-minh-desktop.png) | [no-access-minh-mobile.png](giao-dien-admin/m0/no-access-minh-mobile.png) |
| Menu của Minh (chỉ mục editor được thấy) | [sidebar-minh-desktop.png](giao-dien-admin/m0/sidebar-minh-desktop.png) | [sidebar-minh-mobile.png](giao-dien-admin/m0/sidebar-minh-mobile.png) (mở bằng ☰) |
| `/sources` (admin) — Nguồn, trên router mới | [sources-admin-desktop.png](giao-dien-admin/m0/sources-admin-desktop.png) | [sources-admin-mobile.png](giao-dien-admin/m0/sources-admin-mobile.png) |
| `/publish-jobs` (admin) — Publish job, trên router mới | [publish-jobs-admin-desktop.png](giao-dien-admin/m0/publish-jobs-admin-desktop.png) | [publish-jobs-admin-mobile.png](giao-dien-admin/m0/publish-jobs-admin-mobile.png) |
| `/staff` (admin) — Vai trò & staff, trên router mới | [staff-admin-desktop.png](giao-dien-admin/m0/staff-admin-desktop.png) | [staff-admin-mobile.png](giao-dien-admin/m0/staff-admin-mobile.png) |
| `/transactions` (admin) — Giao dịch, trên router mới | [transactions-admin-desktop.png](giao-dien-admin/m0/transactions-admin-desktop.png) | [transactions-admin-mobile.png](giao-dien-admin/m0/transactions-admin-mobile.png) |

## Kiểm đã chạy

- Stack thật (API cổng 3300, admin preview 5203, DB `english_learning_admin_e2e`): `pnpm test:e2e:real` 10/10 (8 test cũ + 2 test M0).
- `pnpm --filter admin test` 400/400, lint và typecheck sạch, `pnpm --filter admin test:e2e` (cổng 5193) 144 passed, 54 skipped (test chỉ chạy desktop hoặc chỉ mobile).
- Chưa kiểm: CI trên PR (cần `AI_FAKE_ENABLED=true` mới thêm ở job `admin-e2e-real`).

## Câu chữ tự viết (không có trong copy doc §8; chủ dự án duyệt lại khi cần)

- 10 câu lỗi (`errors.*`): `publish-incomplete`, `sense-exists`, `replacement-exists`, `replacement-waiting`, `sense-retired`,
  `sense-entry-mismatch`, `revision-rejected`, `unknown-topic`, `topic-archived`, `too-many-examples`. (`operation-settings-conflict`
  đã đổi sang câu của copy doc nên không nằm trong danh sách.)
- `comingSoon.purpose.*` (một dòng mục đích mỗi màn chưa làm; trong `vi.json` hiện có 18 khóa) và các dòng ngày dự kiến `etaNone`
  ("Dự kiến: chưa xếp bước"), `etaNoneApiReady`, `etaUnconfirmed`.
- `noAccess`: "Bạn không có quyền xem trang này." và nút "Về trang chủ".
- `leave.*`: "Rời trang?", "Thay đổi chưa lưu sẽ mất.", "Ở lại", "Rời trang", "Bỏ thay đổi?", "Bỏ thay đổi", "Tiếp tục sửa".
- `draft.*` (thanh khôi phục bản đang sửa): "Bạn có thay đổi chưa lưu từ lần trước.", "Khôi phục", "Bỏ".

# Đợt giao diện admin — API (AD15) as-built (27/10/2026)

Plan Task 9, 10, 17, 21, 24, 25, 31, 32, 37, làm ở phiên riêng (AD15), mỗi module một PR vào `dev`. Chỉ **thêm** (trường mới cạnh trường cũ, endpoint đọc mới,
một quyền đọc rộng hơn). Mọi object người mới có dạng `{ id, email: string | null, system: boolean }` (`apps/api/src/common/user-ref.ts`, `userRef()`), email tra
một lần mỗi response bằng `IdentityService.emailsOf`, ngoài transaction. Tên trường khớp design §5 và plan, không đổi tên nào.

- **PR #145 — AI (Task 9, 10, 17).** `GET /v1/admin/ai/prompts/{op}` (và response của `PUT`): `updated_by_user`, `guard` (chữ của `PROMPT_GUARD`);
  `…/revisions`: `saved_by_user`; bản seed do `AI_SYSTEM_ACTOR_ID` lưu → `{ email: null, system: true }`. Mới `GET /v1/admin/ai/test-quota` (`settings.manage`)
  → `{ limit, remaining, resets_at }` cho rule `ai.test` của người gọi (`RateLimiter.peek`, không trừ lượt; `remaining` không âm). `GET /v1/admin/ai/status`:
  `operations[].last_error.purpose` (`learner | test | eval`). Ví dụ eval (`GET`, `POST`, `PATCH`): `created_by_user`; lần chạy (`GET …/runs`, `…/runs/{id}`):
  `started_by_user`.
- **PR #146 — Cài đặt (Task 21).** `GET /v1/admin/settings` thêm `defaults` (cùng dạng `values`, từ `SETTINGS_DEFAULTS`).
- **PR #147 — Báo lỗi (Task 24, 25).** Mỗi báo lỗi (`GET /v1/admin/practice/reports`, response của `resolve`): `resolved_by_user` (hoặc `null`), `refundable`
  (giá trị hiện tại của lý do). Mới `GET /v1/admin/practice/reports/{id}` (`content.edit`, cùng dạng một dòng; id lạ → 404 `not-found`). Snapshot câu dạng mcq
  (`mcq_*`, `meaning_in_sentence`, `mcq_sentence`) của báo lỗi **mới** thêm `learner.option_index` (`number | null`). `GET /v1/admin/practice/refunds`: `user`,
  `resolved_by_user`; bộ lọc mới `resolved_by_email` (email không có tài khoản → danh sách rỗng; email nằm trong `page_token`). `GET /v1/admin/practice/report-reasons`:
  `updated_by_user`; GET đổi quyền thành `content.edit` (editor đọc được), `POST` / `PATCH` vẫn `settings.manage`.
- **PR #148 — Cấp gói (Task 31, 32).** Mỗi lần cấp (list, `POST`, `PATCH`, `revoke`, `GET …/users/{user_id}`): `user`, `granted_by_user`, `revoked_by_user`,
  `status` (`replaced → revoked → expired → scheduled → active`), `last_change` (lần sửa mới nhất + `changed_by_user`, hoặc `null`); `changes[]` thêm
  `changed_by_user`. `replaced` = có lần cấp plan khác của cùng người học tạo đúng lúc `revoked_at` bởi `revoked_by` (kiểm cả trên Postgres thật); thu hồi tay gõ
  lý do "replaced" vẫn là `revoked`. Bộ lọc mới `user_email`, `granted_by_email`. Mới `GET /v1/admin/entitlements/lookup?email=` (`entitlements.grant`, rule
  `entitlements.lookup` 60 lần/giờ/người) → `{ user: { id, email }, grantable, reason: 'self-grant' | 'target-is-admin' | 'target-is-staff' | null }`, không thấy → 404.
- **PR #149 — Nội dung (Task 37).** `GET /v1/admin/content/senses`: mọi dòng có `missing[]` (khi bản mới nhất là `draft` / `reviewed`; còn lại `[]`); kết quả
  `status=unpublishable` không đổi.

Màn cần biết: `lookup` trả `user: { id, email }` **không có** `system` (đúng §5.2; màn coi thiếu là `false`). Với `page_token` hỏng kèm email lạ: Cấp gói trả 400,
Trả lượt trả danh sách rỗng (thứ tự kiểm khác nhau; chỉ lộ khi cả hai cùng sai). Kiểm: unit 195 file / 2623 test, `tsc`, lint (chỉ warning cũ ở
`mail-dispatcher.service.ts`); CI xanh từng PR. Chưa chạy API thật qua HTTP cho các endpoint mới (ngoài kiểm `replaced` trên Postgres thật).
