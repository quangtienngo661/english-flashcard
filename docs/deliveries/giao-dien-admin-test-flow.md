# Giao diện admin — tài liệu kiểm (theo mốc)

Design [`../superpowers/specs/2026-10-27-giao-dien-admin-design.md`](../superpowers/specs/2026-10-27-giao-dien-admin-design.md), plan tóm tắt
và as-built [`giao-dien-admin.md`](giao-dien-admin.md). Mỗi mốc một mục: **làm gì → thấy gì**. Khung Figma: file `7HcPAKLrWu32C27qYMJUOA`.
Kiểm cả tiếng Việt và tiếng Anh, cửa sổ rộng và hẹp (390px).

## 0. Dựng stack thật trên máy (PowerShell; để chạy `pnpm test:e2e:real` hoặc tự kiểm tay)

Cổng 3000, 3100, 5173 và 5183 có thể đang bị phiên khác dùng; runbook này dùng cổng riêng (API 3300, admin 5203).

1. Docker Desktop chạy, rồi ở thư mục gốc: `docker compose up -d` (Postgres 5434, Redis 6380, Mailpit).
   **Hộp thư thử (Mailpit): http://localhost:8025** — mail OTP và mail mật khẩu tạm của tài khoản mới nằm ở đó.
2. Tạo DB riêng (chỉ cần một lần):
   ```powershell
   docker compose exec -T postgres psql -U dev -d english_learning -c "CREATE DATABASE english_learning_admin_e2e"
   ```
3. Tạo file môi trường của API, `apps/api/.env` (chép từ `.env.example`; mỗi chỗ `REPLACE_WITH_…` là một giá trị mới từ
   `node scripts/gen-secret.mjs`, `JWT_KEYS` giữ tiền tố `k1:`). Các giá trị khác mặc định:
   `DATABASE_URL=postgresql://dev:dev@localhost:5434/english_learning_admin_e2e`, `JOB_QUEUE_PREFIX=wordmet-admin-e2e`,
   `AI_FAKE_ENABLED=true`, `OPENAI_API_KEY` và `ANTHROPIC_API_KEY` để trống, `CORS_ORIGINS=http://localhost:5203`,
   `ADMIN_APP_URL=http://localhost:5203`, `LEARNER_APP_URL=http://localhost:5204`, `TERMS_VERSION=2026-10-20`,
   `MAINTENANCE_ENABLED=false`, `PROBLEM_TYPE_BASE=http://localhost:3300/problems/`. File này không bao giờ commit.
4. Trong `apps/api`: `pnpm db:setup`, `pnpm build`, rồi chạy API và worker (hai cửa sổ), cả hai với `PORT=3300`:
   ```powershell
   $env:PORT = "3300"; node dist/main.js
   $env:PORT = "3300"; node dist/worker.js
   ```
5. Test tự động, trong `apps/admin`:
   ```powershell
   $env:E2E_API_URL = "http://localhost:3300"; $env:E2E_API_DIR = "../api"; $env:ADMIN_E2E_PORT = "5203"; pnpm test:e2e:real
   ```
   Không đặt biến nào thì dùng cổng mặc định như CI (API 3000, admin 5173). Mỗi lần chạy tạo tài khoản mới có đuôi `-<run>`: admin, một
   người học, Minh (editor), Lan và Khoa (người học, đã chọn tiếng mẹ đẻ `vi`); mật khẩu nằm ở `apps/admin/e2e-real/.state.json`
   (file này không commit).
6. Tự kiểm tay: `pnpm build:e2e` với `VITE_API_BASE_URL=http://localhost:3300`, rồi `pnpm preview --port 5203` và mở http://localhost:5203.
   Đăng nhập bằng một tài khoản trong `.state.json`.
7. Xong thì tắt API, worker và preview của riêng bạn (theo PID), không tắt tiến trình của phiên khác.

## M0 — Khung chung

1. **Editor mở trang chỉ admin dùng.** Đăng nhập bằng Minh (editor). Gõ thẳng `/staff` trên thanh địa chỉ. → URL vẫn là `/staff`, tiêu đề
   "Vai trò & staff" còn đó, dưới tiêu đề là "Bạn không có quyền xem trang này." và nút "Về trang chủ"; không bị chuyển đi im lặng. Bấm nút
   → về `/uploads`. Khung Figma A/71e (node `387:1767`). Menu bên trái của Minh chỉ có các mục của editor (không có Vai trò & staff,
   Người dùng, Giao dịch, AI).
2. **Menu 24 mục.** Admin thấy đủ các nhóm; mục chưa có màn hiện "Tính năng chưa có" cùng một dòng mục đích và "Dự kiến: …".

Chưa kiểm được ở M0, vì chưa có màn nào dùng (`useDirtyForm`, `useDialogDirtyClose`, `useKeptDraft`) — các test đơn vị đã phủ, nhưng chưa có gì để bấm:

- Hộp "Rời trang?" khi rời form đang sửa dở (hỏi một lần, "Ở lại" giữ chữ, "Rời trang" thì sang trang kia và không hỏi lại; đổi bộ lọc, đổi tab, hoặc rời sau
  khi vừa lưu thì không hỏi). **Kiểm đầu tiên ở màn Prompt (M1a).**
- Thanh "Bạn có thay đổi chưa lưu từ lần trước." với [Khôi phục] [Bỏ] sau khi phiên hết hạn giữa lúc sửa (để form có chữ chưa lưu, đổi mật khẩu của chính tài khoản đó
  bằng API ở cửa sổ khác, bấm lưu → về trang đăng nhập; đăng nhập lại → thanh hiện). **Kiểm đầu tiên ở màn Settings (M2).**

## M2 — Cài đặt hệ thống

Đăng nhập bằng admin (tài khoản trong `.state.json`). Khung Figma A/70a–A/70f (node `397:3287` … `397:4845`).

1. **Mở trang.** Menu Hệ thống → Cài đặt hệ thống. → 6 tab Nhắc học · Học và ôn · Luyện tập · Gói và lượt · Nội dung · AI; mỗi ô có dòng phụ
   "`khóa` · khoảng · mặc định …". Đổi tab → URL thành `/settings?tab=…`; tải lại trang vẫn ở tab đó.
2. **Sửa ở hai tab rồi lưu một lần.** Nhắc học: đổi "Khoảng cách tối thiểu giữa hai email nhắc". Sang tab AI (→ **không** hỏi "Rời trang?"; tab Nhắc học có
   dấu chấm vàng). Đổi "Thời gian chờ mỗi lời gọi". Bấm [Lưu thay đổi]. → toast "Đã lưu", dấu chấm mất, nút Lưu mờ lại. Bấm [Lịch sử thay đổi] → hai dòng
   mới nhất là hai khóa vừa đổi, giá trị cũ → mới, email của bạn, giờ Việt Nam.
3. **Trả về giá trị cũ.** Đổi một ô rồi gõ lại đúng số cũ. → dấu chấm mất; bấm Nguồn ở menu → không hỏi gì.
4. **Rời trang khi chưa lưu.** Đổi một ô, bấm Lô nhập ở menu. → hộp "Rời trang?" [Ở lại] [Rời trang]. [Ở lại] giữ số vừa gõ.
5. **Lỗi ở tab khác.** Luyện tập: đặt "Số câu tối đa mỗi phiên" = 5 (nhỏ hơn "Số câu mặc định" = 10). Sang tab Nhắc học, bấm Lưu. → trang tự về tab Luyện tập,
   con trỏ ở "Số câu mặc định", ô viền đỏ "Giá trị ngoài khoảng cho phép.", banner đỏ cùng câu ở đầu trang. Sửa lại cho hợp lệ để lưu được.
6. **Ô để trống.** Gói và lượt: xóa trắng "Nhắc trước khi gia hạn" (dòng phụ có "hoặc để trống = không gửi") rồi lưu. → lịch sử ghi giá trị mới "để trống".
7. **Lượt AI hôm nay.** Tab Gói và lượt: khối đầu "Lượt AI hôm nay: x/1.000 (y%)", "Đã xác nhận … · đang giữ chỗ …", "Tính theo ngày giờ Việt Nam.". Khối
   tô vàng khi đã dùng tới ngưỡng "Tô vàng khi dùng tới" (DB mới có 0 lượt nên khối màu xanh nhạt).
8. **Người khác vừa lưu.** Mở `/settings` ở hai tab trình duyệt. Tab 1 đổi một ô, lưu. Tab 2 đổi ô khác, lưu. → tab 2: "Có người vừa lưu cài đặt khác. Tải lại
   để xem bản mới." + [Tải lại] → hỏi "Tải lại cài đặt?" → đồng ý → thấy giá trị của tab 1; thay đổi của tab 2 mất.
9. **Phiên hết hạn giữa lúc sửa.** Đổi một ô (chưa lưu). Ở cửa sổ khác đổi mật khẩu tài khoản này bằng API (`POST /v1/auth/password/change`). Quay lại bấm Lưu
   → về trang đăng nhập. Đăng nhập lại (mật khẩu mới) → về đúng `/settings?tab=…`, thanh "Bạn có thay đổi chưa lưu từ lần trước." [Khôi phục] [Bỏ];
   [Khôi phục] → số đã gõ trở lại, tab có dấu chấm.
10. **Editor.** Đăng nhập bằng Minh → menu không có Cài đặt hệ thống; gõ `/settings` → "Bạn không có quyền xem trang này.".
11. **Hẹp 390px và tiếng Anh.** Mọi tab và hộp lịch sử không cuộn ngang; đổi EN → nhãn, dòng phụ và toast đều tiếng Anh.

## M3 — Báo lỗi

Chuẩn bị: stack thật với `AI_FAKE_ENABLED=true` (không có khóa OpenAI / Anthropic). Chạy `pnpm test:e2e:real` một lần thì bộ test tự dựng dữ liệu (xem dưới);
muốn tự bấm thì làm theo các bước dưới bằng tài khoản Lan (người học), Minh (editor), admin trong `.state.json`.

Dữ liệu cần có (bộ test `m3.real.spec.ts` dựng bằng chính API, không ghi thẳng DB): 3 từ riêng đã publish; Lan là Pro; một lý do báo lỗi riêng có trả lượt; Lan có một câu
điền chỗ trống do AI sinh đã trả lời và báo lỗi bằng lý do đó; một dạng chia (`<từ>ment`) mà AI đã dùng nhưng bảng chưa có.

1. **Minh xác nhận lỗi.** Đăng nhập Minh → menu "Báo lỗi". → Danh sách mặc định lọc "Chưa xử lý". Mở ô "Lý do", chọn lý do riêng → còn đúng một dòng (nguồn "Câu AI").
   Bấm tên từ → panel bên phải hiện câu hỏi, câu trả lời của Lan, ghi chú của Lan, "Thông tin AI", dòng "Xác nhận lỗi sẽ trả lại 1 lượt câu AI cho người học." và ba nút.
   Bấm [Xác nhận lỗi] → panel đổi sang dòng "Đã xử lý" kèm "Đã trả lại 1 lượt câu AI", hai nút biến mất. Đóng panel → danh sách (đã lọc) không còn dòng đó.
   Kiểm thêm: số lượt AI của Lan (`GET /v1/me/entitlements`, `pools.ai_practice.remaining`) tăng đúng 1. Khung Figma A/73, A/73e, A/74, A/74c.
2. **Admin xem Trả lượt.** Đăng nhập admin → menu "Trả lượt". Gõ email Minh vào "Email người xử lý" → [Lọc]. → Có dòng của báo lỗi vừa xử lý: người học là email Lan, người xử lý
   là email Minh, vai trò "editor", "Đã trả". Bấm "Xem báo lỗi" → mở đúng báo lỗi đó. Dưới bảng có dòng "Không thu hồi được lượt đã trả." (A/76).
3. **Admin thêm rồi tắt một lý do.** Menu "Lý do báo lỗi" → [Thêm lý do] → nhập mã (ví dụ `thu_m3`), tên tiếng Việt, tên tiếng Anh → [Lưu]. → Hộp đóng, bảng có dòng mới,
   công tắc "Đang dùng" bật. Tắt công tắc → tải lại trang vẫn tắt (và người học không còn thấy lý do này khi báo lỗi). Bấm "Sửa" ở một dòng → hộp "Sửa lý do báo lỗi" (A/75, A/75b).
   Thử nhập mã đã có → lỗi hiện ngay dưới ô mã.
4. **Minh nhận một dạng chia.** Đăng nhập Minh → menu "Dạng chia chưa biết" (A/77). → Có dòng `<từ>` / `<từ>ment` với số lần bị loại. Bấm [Nhận dạng này] → toast
   "Đã thêm “…” vào dạng chia của “…”." có nút [Hoàn tác], dòng biến khỏi danh sách. Bấm [Hoàn tác] → toast "Đã gỡ “…” khỏi dạng chia của “…”.".
   (Chưa kiểm bằng test thật: sau Hoàn tác dòng có quay lại danh sách hay không; xem bằng mắt.) Khi bảng trống: "Chưa có dạng chia nào cần xem." (A/77b).
5. **Editor không thấy màn của admin.** Minh gõ thẳng `/refunds` hoặc `/report-reasons` → "Bạn không có quyền xem trang này." và menu của Minh không có hai mục đó; Minh vẫn có
   "Báo lỗi" và "Dạng chia chưa biết".
6. **Phone 390.** Mở bốn màn ở chiều rộng 390 (hoặc xem ảnh trong `docs/deliveries/giao-dien-admin/m3/`) → không cuộn ngang, bảng thành thẻ.

Khi một báo lỗi đang mở ở bên phải, bảng bên trái chỉ còn ba cột Từ, Lý do, Trạng thái; đóng panel thì đủ 8 cột.

## M5 — Nội dung (Từ, Nghĩa, Chủ đề)

Đăng nhập bằng Minh (editor) — editor làm được mọi thao tác ở đây. Khung Figma A/87 `395:2999`, A/88 `395:3514`, A/88b `395:4038`, A/89 `395:4326`.

1. **Từ — tìm và lọc.** Menu Nội dung → Từ. Gõ một từ vào ô tìm, bấm Tìm; chọn Trình độ, Nghĩa = "Chưa có nghĩa", bật "Trình độ lệch nhau". → URL đổi theo
   (`/words?q=…&level=…`); tải lại trang vẫn giữ bộ lọc. Dưới ô Nghĩa có dòng "Có nghĩa tính cả nghĩa đã ngừng dùng.". Sửa tay URL thành `?level=Z9` → bộ lọc
   bị bỏ, danh sách hiện như không lọc, không có lỗi đỏ.
2. **Từ — thao tác dòng.** Bấm [Thao tác ▾] ở một dòng: Sửa trình độ (chọn B2, Lưu → cột trình độ thành B2); Sửa cách viết khác (thêm một cách viết, Lưu);
   Đánh dấu từ chức năng (Có / Không / Tự suy); Thêm nghĩa → mở trang chi tiết nghĩa mới. Đang sửa trong hộp mà bấm Hủy → hỏi "Bỏ thay đổi?".
3. **Từ — dán danh sách.** [Dán danh sách từ] → dán `rizz,noun`, một từ đã có (ví dụ `apple,noun`) và một dòng sai (`abc`). → kết quả: Đã tạo / Đã có / Sai,
   hai dòng đầu có link "Soạn nghĩa". Dán hơn 500 dòng → chữ đỏ "Có … dòng, tối đa 500…", nút Thêm bị khóa.
4. **Nghĩa — lọc và chọn.** Menu → Nghĩa. Lọc Trạng thái = "Thiếu nội dung" → cột Thiếu ghi phần còn thiếu (nghĩa tiếng Việt · câu ví dụ · trình độ); bỏ lọc
   thì cột Thiếu vẫn có. Tick vài dòng → thanh "Đã chọn N nghĩa" với 5 nút. Ô ở đầu bảng chọn / bỏ cả trang.
5. **Nghĩa — thao tác hàng loạt.** Chọn một nghĩa đủ nội dung và một nghĩa còn thiếu → [Publish] → hộp Kết quả: "1 nghĩa thành công · 1 nghĩa không làm được",
   dòng lỗi "Còn thiếu nội dung: …". [Gỡ khỏi app] và [Ngừng dùng] hỏi lại trước khi làm.
6. **Chi tiết nghĩa.** Bấm vào một dòng. → trang có "‹ Nghĩa", "từ · loại từ", trình độ và trạng thái; khối "Người thao tác (gần nhất)". Sửa nghĩa tiếng Việt,
   thêm câu ví dụ (tối đa 3: nút "Thêm câu ví dụ" biến mất ở câu thứ ba), [Lưu bản nháp] → "Đã lưu bản nháp"; khối người thao tác hiện "Bản nháp chưa review"
   nếu nghĩa đã publish trước đó.
7. **Chi tiết nghĩa — lỗi.** Xóa trắng nghĩa tiếng Việt, bấm [Lưu và publish] → ô viền đỏ, con trỏ nằm ở ô đó. Mở cùng nghĩa ở hai tab, lưu ở tab 1, rồi lưu ở
   tab 2 → "Nghĩa này vừa được sửa. Tải lại để xem bản mới." + [Tải lại]. Đang sửa mà bấm sang trang khác → "Rời trang?".
8. **Chủ đề.** Menu → Chủ đề. [Thêm chủ đề]: gõ mã có chữ hoa (`Du_Lich`) → chữ đỏ về luật mã; gõ một mã đã có → "Đã có chủ đề mã này."; mã mới → dòng mới
   "Đang dùng". [Sửa tên] (không sửa được mã), [Lưu trữ] → "Đã lưu trữ", [Dùng lại] → "Đang dùng". Không có nút xóa.
9. **Hẹp 390px và tiếng Anh.** Bốn màn hiện dạng thẻ, ô chọn nằm trên mỗi thẻ, không cuộn ngang; đổi EN → mọi chữ tiếng Anh.

