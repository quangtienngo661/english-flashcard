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
- `pnpm --filter admin test` 400/400 lúc làm M0 (552 sau M1a, gồm các test của M1a), lint và typecheck sạch, `pnpm --filter admin test:e2e` (cổng 5193) 144 passed, 54 skipped (test chỉ chạy desktop hoặc chỉ mobile).
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

# Đợt giao diện admin — M1a as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m1a`, một PR vào `dev`. Bốn màn AI cấu hình đã xong: Tình trạng (`/ai/status`), Model (`/ai/models`, kèm hộp thêm / sửa giá),
Thao tác (`/ai/operations`), Prompt (`/ai/prompts`); chỉ admin (`settings.manage`), editor thấy trang "không có quyền" và không gọi API. Chưa gọi AI thật (D3 Bước 7).

## Đã làm (Task 9–16)

9–10. API (trường `updated_by_user`, `guard`, `test-quota`, `last_error.purpose`...): đã ở `dev` qua PR #145–#149, as-built ở mục "API (AD15)" bên dưới.
11. Client API cho các màn AI (`ai-api.ts`, khóa query, kiểu): `110c106` feat(admin): add the ai api client.
12. Tình trạng: `51fddc2` feat(admin): add the ai status page.
13. Model (thêm, sửa giá, đọc lại thông tin, xóa): `55aaef1` feat(admin): add the ai models page.
14. Thao tác (model, effort, thinking, token tối đa từng thao tác; lưu từng dòng): `6aded95` feat(admin): add the ai operation settings page.
15. Prompt (sửa, lịch sử, chạy thử, số lần còn lại, giữ bản đang sửa): `2c97bc3` feat(admin): add the ai prompt page with test runs.
16. e2e, test flow và cổng:
    - `d59b6c0` test: kiểm "không phần tử nào lòi ra ngoài `main`" cho mọi trang đã có ở 390 (thay kiểm `scrollWidth`, vốn mù vì `main` là `overflow-clip`); nó lộ một lỗi ở Thao tác (ô chọn model dài 100 ký tự đẩy cột ra ngoài), đã sửa trong cùng nhánh.
    - `b370732` fix: giờ trong các màn AI có hai chữ số ("09:12") theo copy doc.
    - `9199745` fix sau review: Prompt đọc lại lịch sử sau 409, xóa lỗi ô khi xóa một ví dụ, báo khi không đọc được bộ ví dụ hoặc số lượt, khóa ô sửa lúc đang lưu; đọc lại sau 409 thất bại thì giữ ô sửa và khóa [Lưu] (Prompt và Thao tác); Tình trạng en "Choose model for {operation}"; giá Model vi "Từ 0 đến 1000".
    - `c0ba644` merge `origin/dev` (M2 đã vào `dev` trước M1a; hai bên cùng sửa routes, menu, câu chữ, a11y, test flow).
    - `7ed3f44` fix: cột "Vòng đời" ở Model không còn cắt giữa chữ ("activ / e", "Vòn / g đời"); lỗi chỉ thấy với dữ liệu thật (mock dùng "deprecated" hoặc rỗng).
    - `f2d58cd` test: `e2e-real/m1a.real.spec.ts` (thêm model giả `fake:ok`, chọn cho `generate_cloze`, Tình trạng "Sẵn sàng", sửa lời dặn, lưu, chạy thử ra "Mẫu 1" "Thành công"; chạy lại trên DB đã có model thì bỏ qua bước đã làm). Mục test flow M1a và ảnh chụp: commit cuối của nhánh.

## Ảnh chụp (stack thật, 27/10/2026)

Khung Figma đối chiếu (file `7HcPAKLrWu32C27qYMJUOA`; node id theo `docs/mockups/2026-10-22/figma-node-ids.md`). Ảnh nằm ở `docs/deliveries/giao-dien-admin/m1a/`;
khung Figma chỉ ghi bằng node id. Dữ liệu: DB mới, một model giả `fake:ok` đã chọn cho `generate_cloze`, một lần sửa lời dặn.

| Màn | Khung Figma | Desktop 1440×900 | Phone 390×844 |
|---|---|---|---|
| Tình trạng (một thao tác sẵn sàng, năm thao tác chưa chọn model) | A/84 `399:3707`, A/84b `399:4386` | [status-desktop.png](giao-dien-admin/m1a/status-desktop.png) | [status-mobile.png](giao-dien-admin/m1a/status-mobile.png) |
| Model | A/80 `399:5057` | [models-desktop.png](giao-dien-admin/m1a/models-desktop.png) | [models-mobile.png](giao-dien-admin/m1a/models-mobile.png) |
| Thao tác | A/81 `400:3985` | [operations-desktop.png](giao-dien-admin/m1a/operations-desktop.png) | [operations-mobile.png](giao-dien-admin/m1a/operations-mobile.png) |
| Prompt | A/82 `400:4436` | [prompts-desktop.png](giao-dien-admin/m1a/prompts-desktop.png) | [prompts-mobile.png](giao-dien-admin/m1a/prompts-mobile.png) |

Hộp "Thêm model" (A/80b `399:5435`) không có ảnh riêng: kiểm bằng e2e và trong mục test flow. Ảnh là màn thật, chưa đặt cạnh khung Figma từng điểm một; chủ dự án so với Figma khi duyệt.

Khác với khung / copy doc (có chủ ý):
- Tình trạng gộp "Lý do" và "Model" thành một cột "Lý do / Model" (một dòng nói "Chưa chọn model" kèm [Chọn model], hoặc "Fake · fake:ok" khi sẵn sàng); khung vẽ hai cột.
- Model: cột "Ghi chú" gập xuống dưới ô nhà cung cấp · model id (chín cột không vừa ở 1024).
- Ghi của Model, Thao tác và Prompt là ghi thường, không có `Idempotency-Key` (API không đánh dấu các ghi này là idempotent); Prompt và Thao tác tự nhận ra một 409 do chính lần lưu của mình (trả lời bị mất).
- Giờ ở các màn AI theo giờ Việt Nam, hai chữ số; tiếng Anh dùng 12 giờ ("09:12 AM").
- Giá Fake hiện "0,00 / 0,00 / 0,00" (API ép giá 0), không phải "Chưa có giá".

## Kiểm đã chạy

- Stack thật (API cổng 3310, admin preview 5213, DB riêng `english_learning_admin_e2e_m1a`, vì 3300 đang do phiên khác dùng; `AI_FAKE_ENABLED=true`, không key): `CI=1 pnpm test:e2e:real` 13/13 (admin 8 + M0 2 + M1a 2 + M2 1).
- `pnpm --filter admin test` 552/552 (`--maxWorkers=3`; với mọi worker mà máy đang bận thì vài test 5 giây hết giờ, chạy lại riêng thì qua); lint và typecheck sạch; `pnpm --filter admin test:e2e` (cổng 5193) 189 passed, 61 skipped (test chỉ chạy desktop hoặc chỉ mobile).
- Chưa kiểm: CI trên PR; gọi AI thật bằng key (cách làm nằm ở test flow, mục "Gắn model và key của chính bạn"); hộp "Rời trang?" và thanh khôi phục qua tab thứ hai trong trình duyệt thật (viết từ mã, mục Prompt bước 3 của test flow).
- Thanh bên (ghi chú ngoài phạm vi M1a, đã sửa lại): chỉ danh sách menu cuộn, VI/EN và tài khoản nằm cố định dưới chân. Khi danh sách dài hơn khung (ví dụ cao 900 px với đủ mục AI) phần mép dưới mờ dần để báo còn mục phía dưới, cuộn là thấy (`Shell.tsx:154-158`; kiểm bằng `e2e/shell.spec.ts:186`, cửa sổ 1440×640 và ngăn kéo 390). Các ảnh ở 1440×900 không chứng minh các mục AI cuối menu hiện hết mà không cuộn.

## Câu chữ tự viết (không có trong copy doc §8; chủ dự án duyệt lại khi cần)

- Dùng chung: `common.system` "Hệ thống", `common.unknownUser` "Không rõ người dùng".
- Tình trạng (`ai.status.*`, `ai.operations.names.*`, `ai.reasons.*`, `ai.providers.*`): tên hiển thị sáu thao tác, câu lý do `provider-quota`, "Mở Cài đặt", tiêu đề cột
  (Thao tác / Sẵn sàng / Lý do / Model / Lỗi gần nhất / Cảnh báo model), nhãn "Chưa sẵn sàng" / "Sẵn sàng", từ chỉ mục đích lỗi ("người học", "chạy thử", "bộ ví dụ"),
  "Vòng đời: {lifecycle}", nút "Chọn model" và tên đọc cho màn hình "Chọn model cho {operation}".
- Model (`ai.models.*`): "Chưa có model nào" và gợi ý, "Hành động", "Chưa có giá", Sửa giá / Đọc lại thông tin / Xóa (kèm tên đọc cho màn hình), "Thao tác đang dùng: {operations}.",
  hộp xóa (tiêu đề, nội dung, nút), bốn toast (đã thêm / lưu / đọc lại / xóa), và cả nhóm `form.*` (tiêu đề, nhãn, gợi ý giá, "Model Fake luôn có giá 0.",
  "Chưa có nhà cung cấp nào có key…", các câu lỗi ô).
- Thao tác (`ai.operations.row.*`): Model, "Không có model", Effort, Thinking, mặc định, tắt, "Số token đầu ra tối đa", Lưu và tên đọc, "Đã lưu. Áp từ lần gọi sau.", "Tải lại",
  câu lúc effort bị bỏ khi đổi model, dòng ghi chú đầu trang.
- Prompt (`ai.prompts.*`): "Lời dặn" và gợi ý, "Ví dụ ({count}/10)", "Đầu ra (JSON)", Thêm / Xóa ví dụ, "Lưu lần cuối {at} · {by}", Lưu và "Đã lưu bản số {revision}.", câu lỗi
  `tooLong` / `blank` / `outputJson`, khối Chạy thử (tiêu đề, ghi chú, chọn ví dụ, "Chạy với: …", hạn mức, "Không đọc được số lần chạy thử còn lại.",
  "Không đọc được bộ ví dụ. [Chạy thử] sẽ dùng các ví dụ trong prompt.", "Mẫu {n}", bốn trạng thái), khối "Bản mới nhất" (tiêu đề, [Chép vào ô sửa], [Ẩn bản mới]) và Lịch sử
  (tiêu đề, "Bản {revision}", [Xem], hộp xem).

# Đợt giao diện admin — M2 as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m2`, một PR vào `dev`. Màn Cài đặt hệ thống `/settings` (A/70a–A/70f) đã thay "Tính năng chưa có" (chỉ admin, `settings.manage`).

## Đã làm (Task 22–23)

1. `ui/Tabs.tsx` (tab có kiểm soát trên `react-aria-components`, mũi tên trái/phải đổi tab, dấu chấm "có thay đổi chưa lưu" có chữ cho trình đọc màn hình);
   `Select` thêm `description` (dòng phụ). Trang Cài đặt: 6 tab ghi vào URL (`?tab=`), 41 ô theo thứ tự copy doc §8.2, dòng phụ
   "`khóa` · khoảng (đơn vị, luật chéo, nghĩa của ô trống / số 0) · mặc định …" lấy từ `bounds` và `defaults`; một nút [Lưu thay đổi] gửi đúng các khóa đã đổi
   kèm `version` và `Idempotency-Key` (`useSubmitAction`); 400 gắn lỗi vào ô, mở tab chứa ô lỗi đầu và focus ô đó; 409 `version-conflict` hiện câu copy doc và
   [Tải lại] (hỏi trước nếu có thay đổi); khối "Lượt AI hôm nay" đầu tab Gói và lượt (tô vàng khi `alert_reached`); hộp [Lịch sử thay đổi] (khóa, cũ → mới,
   email, giờ, "Tải thêm"); hỏi "Rời trang?" khi rời trang lúc có thay đổi, không hỏi khi chỉ đổi tab; giữ bản đang sửa khi phiên hết hạn và hỏi khôi phục
   (`useKeptDraft('settings')`, lưu phần thay đổi chứ không lưu cả bộ giá trị): `feat(admin): add the system settings page`.
2. e2e mock `e2e/settings.spec.ts` (lưu 2 tab một lần, 400 sang tab khác, rời trang, editor không có quyền), `/settings` và `?tab=entitlements` vào
   `a11y.spec.ts`, kiểm không cuộn ngang ở 390 cho 6 tab và hộp lịch sử; e2e stack thật `e2e-real/m2.real.spec.ts` (đổi một ô ở Nhắc học và một ô ở AI,
   lưu một lần, lịch sử có hai dòng với email admin): `test(admin): add the m2 real-stack check and as-built`.

## Ảnh chụp (stack thật, 27/10/2026)

Khung Figma file `7HcPAKLrWu32C27qYMJUOA`: A/70a `397:3287`, A/70b `397:3684`, A/70c `397:3943`, A/70d `397:4231`, A/70e `397:4607`, A/70f `397:4845`.
Ảnh ở `docs/deliveries/giao-dien-admin/m2/`.

Khác khung Figma, có chủ ý: nhãn nằm **trên** ô số (component `NumberField` dùng chung), khung vẽ nhãn bên trái và ô nhỏ bên phải có đơn vị trong ô; đơn vị
ở đây nằm trong dòng phụ ("1–50 phiên"). Nút chính dùng màu primary của hướng B (xanh), khung vẽ vàng. Dòng phụ không có chữ "khoảng" (theo khung; plan ghi có).

| Màn | Desktop 1440 | Phone 390 |
|---|---|---|
| A/70a Nhắc học | [desktop](giao-dien-admin/m2/a70a-reminders-desktop.png) | [mobile](giao-dien-admin/m2/a70a-reminders-mobile.png) |
| A/70b Học và ôn | [desktop](giao-dien-admin/m2/a70b-learning-desktop.png) | [mobile](giao-dien-admin/m2/a70b-learning-mobile.png) |
| A/70c Luyện tập | [desktop](giao-dien-admin/m2/a70c-practice-desktop.png) | [mobile](giao-dien-admin/m2/a70c-practice-mobile.png) |
| A/70c có ô đã đổi (dấu chấm trên tab, nút Lưu bật) | [desktop](giao-dien-admin/m2/a70c-dirty-desktop.png) | [mobile](giao-dien-admin/m2/a70c-dirty-mobile.png) |
| A/70d Gói và lượt (khối Lượt AI hôm nay) | [desktop](giao-dien-admin/m2/a70d-entitlements-desktop.png) | [mobile](giao-dien-admin/m2/a70d-entitlements-mobile.png) |
| A/70e Nội dung | [desktop](giao-dien-admin/m2/a70e-content-desktop.png) | [mobile](giao-dien-admin/m2/a70e-content-mobile.png) |
| A/70f AI | [desktop](giao-dien-admin/m2/a70f-ai-desktop.png) | [mobile](giao-dien-admin/m2/a70f-ai-mobile.png) |
| Hộp Lịch sử thay đổi | [desktop](giao-dien-admin/m2/history-desktop.png) | [mobile](giao-dien-admin/m2/history-mobile.png) |
| Khôi phục sau khi phiên hết hạn (đổi mật khẩu bằng API giữa lúc sửa → bấm Lưu → `/login` → đăng nhập lại) | [desktop](giao-dien-admin/m2/restore-banner-desktop.png) | — |

## Kiểm đã chạy

- Stack thật (API 3300 + worker, admin preview 5383, DB `english_learning_admin_m2`, `AI_FAKE_ENABLED=true`): `pnpm test:e2e:real` 11/11 (8 cũ + 2 M0 + 1 M2).
  Thêm bằng script Playwright: phiên hết hạn giữa lúc sửa → đăng nhập lại về `/settings?tab=content` → thanh khôi phục → [Khôi phục] trả lại đúng giá trị đã gõ.
- `pnpm --filter admin test` 423 test (một lần chạy cả bộ có `BatchPanel.test.tsx` rớt vì chậm; chạy riêng 27/27 qua; file đó không đổi), lint, typecheck sạch;
  `pnpm --filter admin test:e2e` 153 passed, 55 skipped.

## Câu chữ tự viết (không có trong copy doc §8.2)

- `settings.*`: nhãn trợ năng "Nhóm cài đặt"; "Đã lưu" (toast); "Tải lại cài đặt?" / "Thay đổi chưa lưu sẽ mất." (hỏi trước khi tải lại lúc 409); đơn vị trong
  dòng phụ (ngày, giờ, phút, tháng, ký tự, giây, phiên, lượt, lần); "mỗi 15 phút"; "Chưa tải được lượt AI hôm nay."; hộp lịch sử: "Chưa có thay đổi nào.",
  "Người dùng đã xóa" (người đổi không còn email); `common.unsavedChanges` "(có thay đổi chưa lưu)" cho dấu chấm trên tab. Bản tiếng Anh của mọi khóa
  `settings.*` do Claude viết.

---

# Đợt giao diện admin — M3 as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m3`. Bốn màn mới (Báo lỗi, Lý do báo lỗi, Trả lượt, Dạng chia chưa biết); mục menu tương ứng đã bật.

## Đã làm (Task 26–30)

1. Task 26 — Báo lỗi: danh sách có lọc trạng thái / lý do / nguồn câu (lọc nằm trong URL, mặc định "Chưa xử lý"), panel chi tiết (câu hỏi, đáp án, người học chọn gì,
   thông tin AI, ba nút xử lý, dòng trả lượt): `c2f2c7a`; người xử lý hiện bằng email (`userLabel`): `ce3732e`.
2. Task 27 — Lý do báo lỗi (chỉ admin): bảng theo thứ tự của API, công tắc "Đang dùng" gửi `PATCH { active }`, hộp thêm / sửa lý do: `e9d49eb`.
3. Task 28 — Trả lượt (chỉ admin): lọc theo email người xử lý và khoảng ngày (ranh giới ngày giờ Việt Nam), liên kết sang báo lỗi: `10c4c44`.
4. Task 29 — Dạng chia chưa biết: [Nhận dạng này] kèm toast có [Hoàn tác], [Bỏ qua]: `f3d7630`; báo lỗi khi hoàn tác thất bại và giữ thông báo `word-form-exists`: `f8e4c1d`.
5. Task 30 — a11y (axe, VI/EN, 1440/390) và kiểm không cuộn ngang ở 390 (ghi chú 300 ký tự) cho bốn màn; e2e stack thật `m3.real.spec.ts` với
   `support/ai-report.ts` (dựng một báo lỗi câu AI và một dạng chia chưa biết bằng chính API); ảnh chụp; hai tài liệu này: commit
   `test(admin): add the m3 real-stack checks and the m3 delivery record`.

Cách dựng dữ liệu thật (`seedAiReport`, không ghi thẳng DB): chọn model `fake:ok` cho `generate_cloze` → nguồn mới + CSV 3 từ riêng của lần chạy, publish bằng job
→ Lan lên Pro → một lý do riêng của lần chạy (`e2e_<mã>`, có trả lượt) → nhóm 1 từ + phiên `cloze` → `next` → trả lời → báo lỗi. Dạng chia chưa biết: đổi
`generate_cloze` sang `fake:bad-form`, mở phiên cho từ thứ hai (model trả dạng `<từ>ment`, bị loại, dạng được ghi vào bảng), rồi đổi lại `fake:ok`.

## Ảnh chụp (stack thật, 27/10/2026)

Ảnh ở `docs/deliveries/giao-dien-admin/m3/`; desktop 1440×900 là một màn hình, phone 390×844 là cả trang. Node Figma: A/73 `391:2300`, A/73e `389:2436`, A/74 `389:2667`,
A/74c `389:3417`, A/75 `393:2300`, A/75b `393:2876`, A/76 `393:3535`, A/77 `393:3990`, A/77b `393:4368`.

| Màn | Desktop | Phone |
|---|---|---|
| A/73 Báo lỗi · danh sách (admin) | [a73-reports-list-desktop.png](giao-dien-admin/m3/a73-reports-list-desktop.png) | [a73-reports-list-mobile.png](giao-dien-admin/m3/a73-reports-list-mobile.png) |
| A/73e Báo lỗi như Minh (editor) thấy, lọc một lý do không còn báo lỗi chưa xử lý | [a73e-reports-editor-empty-desktop.png](giao-dien-admin/m3/a73e-reports-editor-empty-desktop.png) | [a73e-reports-editor-empty-mobile.png](giao-dien-admin/m3/a73e-reports-editor-empty-mobile.png) |
| A/74 Chi tiết báo lỗi câu AI, chưa xử lý | [a74-report-ai-open-desktop.png](giao-dien-admin/m3/a74-report-ai-open-desktop.png) | [a74-report-ai-open-mobile.png](giao-dien-admin/m3/a74-report-ai-open-mobile.png) |
| A/74c Chi tiết báo lỗi đã xử lý (Minh xác nhận, đã trả lượt) | [a74c-report-resolved-desktop.png](giao-dien-admin/m3/a74c-report-resolved-desktop.png) | [a74c-report-resolved-mobile.png](giao-dien-admin/m3/a74c-report-resolved-mobile.png) |
| A/75 Lý do báo lỗi | [a75-report-reasons-desktop.png](giao-dien-admin/m3/a75-report-reasons-desktop.png) | [a75-report-reasons-mobile.png](giao-dien-admin/m3/a75-report-reasons-mobile.png) |
| A/75b Sửa lý do (hộp thoại) | [a75b-reason-edit-dialog-desktop.png](giao-dien-admin/m3/a75b-reason-edit-dialog-desktop.png) | [a75b-reason-edit-dialog-mobile.png](giao-dien-admin/m3/a75b-reason-edit-dialog-mobile.png) |
| A/76 Trả lượt | [a76-refunds-desktop.png](giao-dien-admin/m3/a76-refunds-desktop.png) | [a76-refunds-mobile.png](giao-dien-admin/m3/a76-refunds-mobile.png) |
| A/77 Dạng chia chưa biết | [a77-unknown-forms-desktop.png](giao-dien-admin/m3/a77-unknown-forms-desktop.png) | [a77-unknown-forms-mobile.png](giao-dien-admin/m3/a77-unknown-forms-mobile.png) |
| A/77b Dạng chia chưa biết · trống (*) | [a77b-unknown-forms-empty-desktop.png](giao-dien-admin/m3/a77b-unknown-forms-empty-desktop.png) | [a77b-unknown-forms-empty-mobile.png](giao-dien-admin/m3/a77b-unknown-forms-empty-mobile.png) |

(*) Trên DB dùng chung danh sách thật không bao giờ trống, nên riêng khung này câu trả lời của danh sách được thay bằng danh sách rỗng khi chụp.

Khác biệt nhìn thấy ở ảnh thật (chưa mở Figma để so từng điểm):
- Đã sửa sau khi chụp lần đầu: ở 1440 khi panel báo lỗi đang mở, bảng 8 cột bị ép và cột Từ / Lý do / Người xử lý xuống dòng từng chữ cái. Giờ khi có panel mở bảng chỉ giữ
  ba cột Từ, Lý do, Trạng thái (phần còn lại đã nằm trong panel); không mở panel thì đủ 8 cột. Ảnh A/74 và A/74c desktop chụp lại sau sửa; ở 1280 panel là tờ phủ lên
  và không ô nào xuống dòng từng chữ (đã kiểm bằng script). Thẻ ở 390 không đổi. Commit `fix(admin): show fewer report columns beside the open report`.
- Ô ngày của Trả lượt hiện `mm/dd/yyyy` theo ngôn ngữ của trình duyệt chụp (Chrome en-US), không theo ngôn ngữ của app.
- A/75b: ảnh phone là cả trang, hộp thoại nằm trên đầu trang còn bảng phía sau vẫn hiện (là cách chụp fullPage, không phải lỗi hộp thoại).
- Khung A/74c có thêm lỗi 409 (báo lỗi đã xử lý); ảnh thật chụp báo lỗi đã xử lý thành công, không có lỗi 409 (đã có trong test mock e2e).

## Kiểm đã chạy

- Stack thật (API + worker cổng 3200, `AI_FAKE_ENABLED=true`, DB `english_learning_admin_m3`, admin preview 5283): `pnpm test:e2e:real` **13/13** (8 test cũ + 2 M0 + 3 M3), chạy cả bộ.
  M3: Minh lọc theo lý do riêng, mở báo lỗi AI, bấm [Xác nhận lỗi] → "Đã trả lại 1 lượt câu AI" và số lượt AI của Lan tăng đúng 1 (đọc `GET /v1/me/entitlements`);
  admin thấy dòng Trả lượt có email Lan và Minh (vai trò `editor`, "Đã trả"), thêm lý do mới rồi tắt, tải lại vẫn tắt; Minh nhận dạng chia vừa bị loại → toast → [Hoàn tác] → toast "Đã gỡ …".
- `pnpm --filter admin test:e2e` (cổng 5391, mock): **165 passed, 55 skipped** (bốn màn thêm vào a11y và kiểm không cuộn ngang ở 390).
- Unit, lint, typecheck: số ở báo lỗi của Task 30 (`.superpowers/sdd/2026-10-27-giao-dien-admin/task-30-report.md`).
- Chưa kiểm: CI trên PR; sau [Hoàn tác] dòng có quay lại danh sách thật hay không (test thật chỉ kiểm toast); lần chạy đầy đủ từ đầu với phiên mới (khi lặp đã dùng `E2E_REUSE_STATE`; lần đầu 10/10 cũ + M3 đã chạy trước khi sửa lỗi session id của seed).
- Cách chạy `grantAdmin` tại máy: worktree này không có `.env`, nên đặt `E2E_API_DIR` = `apps/api` của worktree `giao-dien-admin` (có `dist/cli/admin-grant.js` đã build và `.env`; CLI tự nạp
  `.env` đó, người chạy không đọc nó) và ghi đè `DATABASE_URL` (trỏ DB `english_learning_admin_m3` của stack đang chạy), `JOB_QUEUE_PREFIX=wordmet-admin-m3`, `AI_FAKE_ENABLED=true` bằng biến môi trường
  (`process.loadEnvFile` không đè biến đã có). Nếu không đè `DATABASE_URL`, CLI sẽ cấp quyền admin vào DB của `.env` kia thay vì DB của stack.

## Câu chữ tự viết (không có trong copy doc §8.4–8.7; chủ dự án duyệt lại khi cần)

- Báo lỗi (Task 26): bộ lọc "Tất cả trạng thái", "Tất cả lý do", "Mọi nguồn"; `emptyFiltered` "Không có báo lỗi nào khớp bộ lọc."; tên kiểu câu "Trắc nghiệm", "Đúng / Sai",
  "Gõ từ", "Điền chỗ trống", "Nghĩa trong câu", "Trắc nghiệm trong câu"; chi tiết "Báo lỗi · {word}", "Báo lỗi", "Về danh sách báo lỗi", "Câu hỏi", "Nghĩa", "Câu",
  "Các lựa chọn", "Đáp án đúng" (dấu), "Chưa trả lời", "Đã thử", "Không xem gợi ý nào", "Đúng", "Sai", "Ghi chú của người học", "Không có ghi chú", "Xem lần gọi này",
  "Đã xử lý", "{status} · {who} · {time}", "Mở nghĩa của từ “{word}”"; `common.systemUser` "Hệ thống".
- Lý do báo lỗi (Task 27): "Thêm lý do", "Sửa lần cuối bởi", "Thao tác", "Có" / "Không", "Sửa", "Sửa lý do {code}", "Đang dùng: {code}" (chỉ cho trình đọc màn hình),
  "Chưa có lý do báo lỗi nào.", "Thêm lý do để người học có thể chọn khi báo lỗi.", "Thêm lý do báo lỗi", "Sửa lý do báo lỗi", gợi ý và lỗi ô mã / tên / thứ tự
  ("Bắt đầu bằng chữ, 2–40 ký tự a–z, 0–9, _", "Mã phải bắt đầu bằng chữ, dài 2–40 ký tự, chỉ gồm a–z, 0–9, _.", "1–100 ký tự", "Nhập tên từ 1 đến 100 ký tự.",
  "Gợi ý trong ô ghi chú (tiếng Việt / tiếng Anh)", "Không bắt buộc, tối đa 200 ký tự", "Chỉ có tác dụng với câu AI", "Từ 0 đến 10.000; số nhỏ hiện trước",
  "Nhập số nguyên từ 0 đến 10.000."), "Lưu". Mặc định hộp thêm: "Cả hai", hai ô tick tắt, thứ tự 0 (API không có mặc định).
- Trả lượt (Task 28): "Email người xử lý", "Lọc", "Xem báo lỗi", ô gợi ý "minh@example.com".
- Dạng chia chưa biết (Task 29): `acceptFor` / `ignoreFor` (nhãn cho trình đọc màn hình) và `undone` "Đã gỡ “{form}” khỏi dạng chia của “{lemma}”."

## Sau khi viết mục này

- Helper `support/sign-in.ts` chờ hết 429 của đăng nhập (CI từng hỏng một lần khi cả bộ stack thật vượt `auth.login.ip`, 20 lần mỗi phút): commit `2b40fd5`.
- Sửa sau review cuối ở `e87dcb4`: vòng lặp tải lại ở "Dạng chia chưa biết" khi một trang lỗi; mã báo lỗi không phải UUID → "không tìm thấy"; dải thông báo xử lý cũ còn sót;
  nút ở mỗi dòng là nút phụ; bộ lọc Trả lượt giữ đúng sau khi bấm Back.
- Hai lần merge `origin/dev`: lần một (M2 + M5), lần hai (M1a): M3 chuyển sang dùng `userLabel(ref, t)` của M1a, nên người dùng không có email giờ hiện "Không rõ người dùng".
- PR #155 đã merge vào `dev` ở `9c46d2a`.

---

# Đợt giao diện admin — M4 as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m4`. Hai màn mới ở nhóm "Người học": Người dùng (chỉ admin) và Cấp gói và lượt; hai mục menu đã bật.

## Đã làm (Task 33–36)

1. Task 33 — Người dùng: danh sách có ô tìm (từ 2 ký tự, chờ 300 ms) và lọc trạng thái nằm trong URL, [Tải thêm]; panel chi tiết (email, tên, ngày sinh, điều khoản, vai trò,
   dòng khóa); [Khóa tài khoản] hỏi lý do một dòng, [Mở khóa] làm ngay: `c32e1f1`.
2. Task 34 — Cấp gói và lượt: danh sách có bốn bộ lọc trong URL, khối "Lượt AI hôm nay" (chỉ ai có `settings.manage`), năm nhãn trạng thái, hộp Thu hồi và hộp Sửa ngày
   (hiện "Lần sửa trước"), năm câu từ chối riêng cho `grant-not-allowed`: `5d58556`.
3. Task 35 — Cấp mới: hộp có ô email + [Kiểm] (tra người học trước khi cấp), Gói Pro hoặc Con số riêng (ô lượt AI chỉ admin thấy), hộp xác nhận tắt tự gia hạn cho người đang trả
   tiền (A/79b), dải cảnh báo khi cổng thanh toán chưa tắt được tự gia hạn: `1334e65`; giữ cảnh báo đó và bỏ lần tra khi bấm Hủy: `c1dc7d8`.
4. Task 36 — a11y (axe, VI/EN, 1440/390) và kiểm không cuộn ngang ở 390 (email dài, lý do 300 ký tự) cho bốn đường dẫn `/users`, `/users/:id`, `/entitlements`,
   `/entitlements/new`; e2e stack thật `m4.real.spec.ts`; ảnh chụp; hai tài liệu này: commit `test(admin): add the m4 real-stack checks and the m4 delivery record`.
   Một sửa nhìn thấy khi chụp: cột email của bảng cấp gói bị cắt giữa tên miền ("…@example.c / om"); giờ email xuống dòng trước dấu `@` (`BreakableEmail`):
   `fix(admin): wrap grant emails before the @ instead of inside the domain`.

Ngày "Tới ngày": ngày D tính trọn (còn hiệu lực hết ngày D, API nhận 00:00 ngày D+1) — chủ dự án chốt 27/10/2026, AD17.

## Ảnh chụp (stack thật, 27/10/2026)

Ảnh ở `docs/deliveries/giao-dien-admin/m4/`; desktop 1440×900 là một màn hình, phone 390×844 là cả trang. Node Figma: A/71 `386:1698`, A/71e `387:1767`, A/72 `387:1965`,
A/72b `387:2293`, A/78 `394:2657`, A/78b `394:3168`, A/78c `394:3719`, A/78d `414:3533`, A/79 `394:3994`, A/79b `414:3823`, A/79e `394:4288`.

| Màn | Desktop | Phone |
|---|---|---|
| A/71 Người dùng · danh sách (admin) | [a71-users-list-desktop.png](giao-dien-admin/m4/a71-users-list-desktop.png) | [a71-users-list-mobile.png](giao-dien-admin/m4/a71-users-list-mobile.png) |
| A/71e Người dùng như Minh (editor) thấy: không có quyền | [a71e-users-editor-no-access-desktop.png](giao-dien-admin/m4/a71e-users-editor-no-access-desktop.png) | [a71e-users-editor-no-access-mobile.png](giao-dien-admin/m4/a71e-users-editor-no-access-mobile.png) |
| A/72 Chi tiết người dùng · đang khóa (Khoa) | [a72-user-locked-desktop.png](giao-dien-admin/m4/a72-user-locked-desktop.png) | [a72-user-locked-mobile.png](giao-dien-admin/m4/a72-user-locked-mobile.png) |
| A/72b Khóa tài khoản (hộp thoại, Lan) | [a72b-lock-dialog-desktop.png](giao-dien-admin/m4/a72b-lock-dialog-desktop.png) | [a72b-lock-dialog-mobile.png](giao-dien-admin/m4/a72b-lock-dialog-mobile.png) |
| A/78 Cấp gói và lượt · danh sách (lọc Lan: đang hiệu lực, bị thay thế, đã thu hồi) | [a78-grants-list-desktop.png](giao-dien-admin/m4/a78-grants-list-desktop.png) | [a78-grants-list-mobile.png](giao-dien-admin/m4/a78-grants-list-mobile.png) |
| A/78b Thu hồi (hộp thoại) | [a78b-revoke-dialog-desktop.png](giao-dien-admin/m4/a78b-revoke-dialog-desktop.png) | [a78b-revoke-dialog-mobile.png](giao-dien-admin/m4/a78b-revoke-dialog-mobile.png) |
| A/78c Cấp gói và lượt · không có dòng khớp bộ lọc (*) | [a78c-grants-empty-desktop.png](giao-dien-admin/m4/a78c-grants-empty-desktop.png) | [a78c-grants-empty-mobile.png](giao-dien-admin/m4/a78c-grants-empty-mobile.png) |
| A/78d Sửa ngày lần cấp (hộp thoại) | [a78d-edit-dates-dialog-desktop.png](giao-dien-admin/m4/a78d-edit-dates-dialog-desktop.png) | [a78d-edit-dates-dialog-mobile.png](giao-dien-admin/m4/a78d-edit-dates-dialog-mobile.png) |
| A/79 Cấp mới (admin) | [a79-new-grant-desktop.png](giao-dien-admin/m4/a79-new-grant-desktop.png) | [a79-new-grant-mobile.png](giao-dien-admin/m4/a79-new-grant-mobile.png) |
| A/79b Cấp Pro cho người đang trả tiền (**) | [a79b-paid-confirm-desktop.png](giao-dien-admin/m4/a79b-paid-confirm-desktop.png) | [a79b-paid-confirm-mobile.png](giao-dien-admin/m4/a79b-paid-confirm-mobile.png) |
| A/79e Cấp mới như Minh (editor): email của admin bị từ chối | [a79e-new-grant-editor-refused-desktop.png](giao-dien-admin/m4/a79e-new-grant-editor-refused-desktop.png) | [a79e-new-grant-editor-refused-mobile.png](giao-dien-admin/m4/a79e-new-grant-editor-refused-mobile.png) |

(*) Trên DB dùng chung danh sách không lọc không bao giờ trống, nên khung này chụp bằng bộ lọc email của Khoa (chưa từng được cấp); khung "chưa cấp cho ai" không lọc
(có nút [Cấp mới] thứ hai) chỉ được kiểm bằng test đơn vị.
(**) Stack thật không dựng được người đang trả tiền cho Pro, nên riêng khung này câu trả lời 409 của lần [Cấp] được trình duyệt giả lập; hộp xác nhận là của app thật.
Khoa bị khóa bằng API trước khi chụp A/72 và mở khóa lại sau đó.

Khác biệt nhìn thấy ở ảnh thật (chưa mở Figma để so từng điểm):
- Ô ngày trong hộp Cấp mới hiện `mm/dd/yyyy`: là ô ngày gốc của Chrome chụp, theo ngôn ngữ của trình duyệt chứ không theo ngôn ngữ của app (như ô ngày của Trả lượt ở M3); các ngày ở bảng hiện `d/m/yyyy`.
- Ở 1440 khi panel người dùng đang mở, bảng chỉ giữ ba cột Email, Vai trò, Trạng thái (phần còn lại nằm trong panel).
- Ảnh phone của hộp thoại là cả trang: hộp nằm trên đầu, danh sách phía sau vẫn hiện (cách chụp fullPage, như M3). Ảnh phone A/72 có panel ở trên và danh sách bên dưới.
- Dòng "Đang khóa từ … · bởi …" là khối nền đỏ nhạt ở đầu panel; [Mở khóa] / [Khóa tài khoản] nằm ở chân panel.
- Khối "Lượt AI hôm nay" chỉ admin thấy; ảnh của Minh (A/79e) không có.

## Kiểm đã chạy

- Stack thật (API + worker cổng 3200, `AI_FAKE_ENABLED=true`, DB `english_learning_admin_m3`, admin preview 5283): `pnpm test:e2e:real` **22/22**, chạy cả bộ từ đầu (phiên mới, không `E2E_REUSE_STATE`).
  M4: admin tìm Khoa theo email, khóa kèm lý do (API từ chối đăng nhập), mở khóa rồi Khoa đăng nhập lại được; Minh tra Lan, cấp Pro, đổi "Tới ngày" (sau khi tải lại, hộp Sửa ngày
  nêu "Lần sửa trước: … email Minh … lý do"), thu hồi ("Đã thu hồi", "Thu hồi: lý do", hết nút thao tác); admin cấp Pro bắt đầu ngay cho Lan hai lần → dòng lần một "Bị thay thế" và hết nút,
  dòng lần hai "Đang hiệu lực" (rủi ro R3: hai mốc thời gian bằng nhau trên Postgres thật, nên API trả `replaced`). Lan và Khoa do admin tạo bằng API; mỗi dòng tìm theo lý do của lần chạy
  nên DB dùng lại vẫn chạy được.
- `pnpm --filter admin test:e2e` (cổng 5391, mock): **236 passed, 64 skipped**. Bốn đường dẫn mới nằm trong a11y (VI/EN) và một kiểm không cuộn ngang ở 390.
  Màn "Nhân viên" gọi cùng `GET /v1/admin/users?email=` nên mock dùng chung của a11y phân biệt theo tham số `email`.
- Unit (`vitest run --maxWorkers=2`): **72 file, 713 test passed**; lint và typecheck sạch.
- Chưa kiểm: CI trên PR; hộp A/79b và dải `not_supported` trên stack thật (cần người đang trả tiền và cổng thanh toán).

## Câu chữ tự viết (không có trong copy doc §8.3 và §8.8; chủ dự án duyệt lại khi cần)

- Người dùng (Task 33): `empty` "Chưa có người dùng nào.", `emptyFiltered` "Không có người dùng nào ở trạng thái này."; "Người dùng", "Về danh sách"; nhãn "Tên", "Họ", "Ngày sinh",
  "Đồng ý điều khoản", "Vai trò", "Trạng thái"; vai trò "admin / editor / người học"; "Đã xác minh" / "Chưa xác minh"; toast "Đã mở khóa {email}." và "Đã khóa {email}.";
  lỗi lý do khóa "Nhập lý do từ 1 đến 500 ký tự, trên một dòng.". Toàn bộ bản tiếng Anh.
- Cấp gói và lượt (Task 34): lỗi khối lượt AI ("Chưa xem được lượt AI hôm nay."), gợi ý ô email và "Từ 1 đến 365 ngày", "Đã hết hiệu lực"; các dòng con số ("{n} phiên luyện mỗi ngày",
  "{n} lượt câu AI mỗi tháng", "{n} lượt tra AI mỗi tháng"); "Thu hồi: {reason}"; `emptyFiltered`; dòng chân trang; hộp Thu hồi (tiêu đề, "Lần cấp dừng có hiệu lực ngay. Muốn cấp lại thì cấp một lần mới.",
  nhãn và lỗi lý do, [Giữ nguyên], "Đã thu hồi lần cấp của {email}."); hộp Sửa ngày (ghi chú "đã bắt đầu nên không đổi được", gợi ý, "Chưa đổi ngày nào.", "Hãy chọn ngày.", "từ {old} → {new}",
  "tới {old} → {new}", "Đã lưu ngày mới cho {email}."); năm câu từ chối (`self-grant`, `target-is-admin`, `target-is-staff`, `ai-limits-admin-only`, `target-has-paid-subscription`).
- Cấp mới (Task 35): "Cấp gói hoặc con số riêng", nhãn và gợi ý ô email, [Kiểm] / "Đang kiểm…", "Đã xác nhận tài khoản {email}.", "Thử lại lúc {time}.", "Chưa kiểm được email này. Hãy thử lại.",
  "Hãy nhập email rồi kiểm.", "Loại", ba nhãn con số, các lỗi con số / ngày ("Ngày bắt đầu không được ở quá khứ.", "Hãy chọn ngày kết thúc.", "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu."),
  [Cấp], "Đã cấp cho {email}.", [Đã hiểu]. Dải cảnh báo `not_supported` dùng kiểu mới `warning` của `Banner` (thêm ở Task 35), không phải toast.

---

# Đợt giao diện admin — M5 as-built (27/10/2026)

Nhánh `feat/giao-dien-admin-m5`, một PR vào `dev`. Bốn màn Nội dung thay "Tính năng chưa có": Từ `/words` (A/87), Nghĩa `/senses` (A/88), Chi tiết nghĩa
`/senses/:id` (A/88b), Chủ đề `/topics` (A/89). Editor dùng được cả bốn (đủ quyền `content.edit`, `content.publish`, `taxonomy.manage`). Phần đóng đợt (plan
Task 43 Step 4–5: `CLAUDE.md`, memory, `buoc-2-5.md`, copy doc §8, as-built của cả đợt) **chưa làm**: chờ M1a, M1b, M3, M4 merge.

## Đã làm (Task 38–42, và phần kiểm của Task 43)

1. `DataList` có thêm `selection` (tùy chọn, không truyền thì markup như cũ): cột ô chọn ở bảng, ô chọn ở mỗi thẻ (390), ô "Chọn tất cả trên trang" ở đầu
   bảng (chọn một phần thì hiện dấu trừ); `Checkbox` có dạng chỉ ô (`aria-label`) và `isIndeterminate`: `feat(admin): add row selection to data lists`.
   Thêm sau: bấm vào ô chọn trong một dòng có `rowHref` không mở dòng đó (bỏ qua `label`, `input` như đã bỏ qua `a`, `button`).
2. Từ: tìm (`q`), lọc trình độ / có-chưa có nghĩa (dòng phụ "Có nghĩa tính cả nghĩa đã ngừng dùng.") / trình độ lệch nhau / lô nhập, tất cả trong URL; cột Nghĩa
   đếm số nghĩa và "x đã publish · y bản nháp · z ngừng dùng"; menu [Thao tác] mỗi dòng: Sửa trình độ, Sửa cách viết khác (gửi lại cả bộ), Đánh dấu từ chức năng
   (Có / Không / Tự suy = `null`; chỉ hiện khi có `taxonomy.manage`), Thêm nghĩa (tạo rồi mở `/senses/<id>`); [Dán danh sách từ] (hộp thoại, chặn > 500 dòng ở
   client, kết quả từng dòng Đã tạo / Đã có / Sai, link "Soạn nghĩa"): `feat(admin): add the words page`.
3. Nghĩa + Chi tiết nghĩa: lọc trạng thái / trình độ / loại từ / chủ đề / lô nhập trong URL; cột Thiếu từ `missing[]`; chọn nhiều dòng; 5 thao tác hàng loạt mỗi dòng
   gửi đúng `revision` của nó (Publish, Gỡ khỏi app, Ngừng dùng chỉ hiện khi có `content.publish`; Gỡ và Ngừng dùng hỏi lại trước); hộp kết quả: số thành công, từng
   dòng lỗi kèm lý do (`stale-revision` "Nghĩa đã đổi, tải lại", `publish-incomplete` kèm phần thiếu). Chi tiết: sửa nghĩa tiếng Việt, định nghĩa, ≤ 3 câu ví dụ,
   chủ đề (ô chọn, chủ đề đã lưu trữ chỉ hiện khi nghĩa đang dùng nó), dạng được chấp nhận; [Lưu bản nháp], [Lưu và publish]; 409 `stale-revision` → câu copy +
   [Tải lại]; 422 `publish-incomplete` → lỗi ở ô thiếu, focus ô đầu; toast nêu chủ đề bị bỏ (`dropped_topics`); khối "Người thao tác (gần nhất)" theo design
   §6.12 ("Bản nháp chưa review" khi có bản nháp mới, không có "Publish: —", hành động đổi trạng thái suy từ `state`); "Rời trang?" và giữ bản đang sửa
   (`sense:<id>`): `feat(admin): add the senses list with bulk actions and the sense detail editor`.
4. Chủ đề: cả danh sách, không phân trang; [Thêm chủ đề] (mã `[a-z0-9-]+` kiểm ở client, `topic-exists` hiện ngay ở ô Mã), Sửa tên, Lưu trữ / Dùng lại; không có
   xóa: `feat(admin): add the topics page`.
5. Kiểm M5: e2e mock `e2e/content-screens.spec.ts` (một luồng chính mỗi màn, editor), 4 màn vào `a11y.spec.ts`, kiểm không cuộn ngang ở 390 (giá trị dài);
   e2e stack thật `e2e-real/m5.real.spec.ts` (Minh sửa trình độ một từ mới; lưu bản nháp nghĩa của nó rồi publish từ danh sách; thêm rồi lưu trữ một chủ đề):
   `test(admin): add the m5 checks and as-built`.

6. Sửa lỗi (báo từ review của M1a): trang Cài đặt (M2) và Chi tiết nghĩa giữ form theo `version` / `revision`, nên khi tab được focus lại và TanStack Query
   lấy lại dữ liệu có bản mới (người khác vừa lưu), form bị dựng lại và thay đổi chưa lưu biến mất khỏi form (chỉ còn thanh khôi phục). Không mất cập nhật
   (lưu vẫn gửi `version` / `revision` của bản form đang sửa, nên API trả 409). Nay: không có thay đổi chưa lưu thì nhận bản mới; có thì giữ thay đổi và hiện
   ngay câu xung đột ("Có người vừa lưu cài đặt khác…" / "Nghĩa này vừa được sửa…") kèm [Tải lại]: `test(admin): pin unsaved edits across a refetch…`,
   `fix(admin): keep unsaved settings and sense edits when a refetch brings a newer version`.

Lệch plan / khung, có chủ ý:
- Plan Task 40 ghi bộ lọc `q` cho Nghĩa; API `GET /v1/admin/content/senses` không nhận `q` (`sense-filters.ts`), nên màn không có ô tìm. Muốn có thì cần thêm ở API.
- [Dán danh sách từ] mở hộp thoại (plan: `PasteWordsDialog`); khung A/87 vẽ thành khối "Thêm cả loạt" dưới bảng.
- Chủ đề của một nghĩa là danh sách ô chọn (một nghĩa có nhiều chủ đề); khung vẽ một ô chọn một.
- Thêm hỏi lại trước [Gỡ khỏi app] và [Ngừng dùng] hàng loạt (khung không có; ngừng dùng không quay lại được).
- Trang chi tiết: tiêu đề trang (h1) là "Nghĩa" như mọi trang con, "deploy · verb" là tiêu đề phụ; khung vẽ "deploy · verb" làm tiêu đề lớn.

## Ảnh chụp (stack thật, 27/10/2026)

Khung Figma file `7HcPAKLrWu32C27qYMJUOA`: A/87 `395:2999`, A/88 `395:3514`, A/88b `395:4038`, A/89 `395:4326`. Ảnh ở `docs/deliveries/giao-dien-admin/m5/`,
đăng nhập bằng Minh (editor), dữ liệu do test stack thật tạo.

| Màn | Desktop 1440 | Phone 390 |
|---|---|---|
| A/87 Từ | [desktop](giao-dien-admin/m5/a87-words-desktop.png) | [mobile](giao-dien-admin/m5/a87-words-mobile.png) |
| A/87 menu Thao tác | [desktop](giao-dien-admin/m5/a87-row-menu-desktop.png) | [mobile](giao-dien-admin/m5/a87-row-menu-mobile.png) |
| A/87 kết quả Dán danh sách từ | [desktop](giao-dien-admin/m5/a87-paste-result-desktop.png) | [mobile](giao-dien-admin/m5/a87-paste-result-mobile.png) |
| A/88 Nghĩa (một dòng đã chọn, thanh thao tác hàng loạt) | [desktop](giao-dien-admin/m5/a88-senses-desktop.png) | [mobile](giao-dien-admin/m5/a88-senses-mobile.png) |
| A/88b Chi tiết nghĩa | [desktop](giao-dien-admin/m5/a88b-sense-detail-desktop.png) | [mobile](giao-dien-admin/m5/a88b-sense-detail-mobile.png) |
| A/89 Chủ đề | [desktop](giao-dien-admin/m5/a89-topics-desktop.png) | [mobile](giao-dien-admin/m5/a89-topics-mobile.png) |

## Kiểm đã chạy

- Stack thật (API 3300 + worker, admin preview 5383, DB `english_learning_admin_m2`, `AI_FAKE_ENABLED=true`): `pnpm test:e2e:real` 14/14 (8 cũ + M0 2 + M2 1 + M5 3).
- `pnpm --filter admin test` 450 test: 448 qua; 2 test cũ (Publish job, Giao dịch; không đổi ở M5) quá 5 s khi cả bộ chạy cùng lúc trên máy đang bận, chạy riêng
  thì qua. Các file test mới đặt `asyncUtilTimeout` 4 s vì trang dựng cả app. Lint, typecheck sạch. e2e mock (Từ/Nghĩa/Chủ đề + a11y + ui-guidelines) 40 passed.

## Câu chữ tự viết (không có trong copy doc §8.1)

`words.*`, `senses.*`, `topics.*`: mọi dòng phụ, toast, hộp thoại sửa (trình độ, cách viết khác, từ chức năng), kết quả dán danh sách, lý do lỗi hàng loạt, hỏi lại khi
gỡ / ngừng dùng, câu không tìm thấy nghĩa, gợi ý mã chủ đề; `list.selectAll` "Chọn tất cả trên trang". Bản tiếng Anh do Claude viết.

