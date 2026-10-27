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
  khi vừa lưu thì không hỏi). **Kiểm ở màn Prompt, mục M1a bên dưới.**
- Thanh "Bạn có thay đổi chưa lưu từ lần trước." với [Khôi phục] [Bỏ] sau khi phiên hết hạn giữa lúc sửa (để form có chữ chưa lưu, đổi mật khẩu của chính tài khoản đó
  bằng API ở cửa sổ khác, bấm lưu → về trang đăng nhập; đăng nhập lại → thanh hiện). **Kiểm ở màn Prompt, mục M1a bên dưới** (Settings ở M2 kiểm lại).

## M1a — AI: cấu hình (Tình trạng A/84, Model A/80, Thao tác A/81, Prompt A/82)

Đăng nhập bằng admin (tài khoản trong `.state.json`). API và worker chạy với `AI_FAKE_ENABLED=true` và không có key nhà cung cấp nào (mục 0), nên
không có lời gọi AI thật; model giả `fake:ok` luôn trả lời được. Khung Figma: A/84 `399:3707`, A/84b `399:4386`, A/80 `399:5057`, A/80b `399:5435`,
A/81 `400:3985`, A/82 `400:4436`.

### Tình trạng, Model, Thao tác (A/84b, A/80, A/81)

1. **Lần đầu vào, chưa chọn model.** Menu AI › Tình trạng. → sáu thao tác, mỗi dòng "Chưa sẵn sàng" và "Chưa chọn model" kèm nút [Chọn model]; ở
   đầu trang có "Nhà cung cấp có key: Fake" và "AI toàn hệ thống: Đang bật". Bấm một nút [Chọn model] → sang Thao tác.
2. **Thêm model giả.** Menu AI › Model → [Thêm model]. Nhà cung cấp chỉ có "Fake" (nhà cung cấp khác chưa có key nên không hiện). Gõ Model id `fake:ok`,
   bấm [Thêm]. → hộp đóng, dòng "Fake · fake:ok" hiện trong danh sách, "Chưa có giá" (model Fake không có giá; ô giá không hiện). Thử gõ một id lạ
   như `fake:xyz` → hộp vẫn mở, báo "Nhà cung cấp không có model này. Kiểm lại tên model." và ô Model id có con trỏ.
3. **Chọn model cho một thao tác.** Menu AI › Thao tác → dòng "Sinh câu điền từ" → ô Model chọn "Fake · fake:ok" → [Lưu] sáng lên; bấm → toast
   "Đã lưu. Áp từ lần gọi sau.". Đổi Effort hay Thinking mà model không cho (Fake không có mức effort) → ô tắt hoặc báo lỗi ngay ở ô đó. Sửa dở một
   dòng rồi bấm mục menu khác → hộp "Rời trang?".
4. **Tình trạng đổi theo.** Quay về AI › Tình trạng. → dòng "Sinh câu điền từ" là "Sẵn sàng", cột Lý do / Model ghi "Fake · fake:ok"; năm dòng
   kia vẫn "Chưa sẵn sàng".
5. **Model đang được dùng thì không xóa được.** Ở AI › Model bấm [Xóa] của `fake:ok` → hộp "Xóa model fake:ok?" → [Xóa model] → "Model đang được thao
   tác dùng, chưa xóa được. Thao tác đang dùng: Sinh câu điền từ." (Muốn xóa: ở Thao tác chọn "Không có model" cho dòng đó, lưu, rồi xóa.)
6. **Hẹp 390px và tiếng Anh.** Cả bốn màn không cuộn ngang; model id dài 100 ký tự xuống dòng trong ô; đổi EN → mọi nhãn tiếng Anh.

### Prompt (A/82)

Mở **AI › Prompt** (`/ai/prompts`). Chưa cần model cho thao tác (trừ bước 4 cuối cùng).

1. **Hỏi "Rời trang?".** Sửa một chữ trong ô "Lời dặn". Bấm **AI › Tình trạng** ở menu. → Hộp "Rời trang?" hiện một lần. Bấm [Ở lại] → vẫn ở
   Prompt, chữ vừa sửa còn nguyên. Bấm lại mục menu, chọn [Rời trang] → sang Tình trạng, không hỏi lần nữa. Quay lại Prompt → chữ cũ (bản đã
   lưu), không có thanh khôi phục.
2. **Không hỏi khi chỉ đổi thao tác hay khi vừa lưu.** Sửa "Lời dặn", rồi đổi ô "Thao tác" sang "Tra từ bằng AI" → URL thành `?op=lookup_word`,
   không có hộp hỏi. Đổi về "Sinh câu điền từ" → thanh "Bạn có thay đổi chưa lưu từ lần trước." hiện (chữ sửa dở của thao tác đó được giữ).
   Bấm [Bỏ] → thanh mất, ô là chữ đã lưu. Sửa lại, bấm [Lưu] → "Đã lưu bản số N."; bấm một mục menu → sang ngay, không hỏi.
3. **Thanh khôi phục sau khi phiên kết thúc.** Sửa "Lời dặn" (đừng lưu). Mở một tab thứ hai cùng trình duyệt vào admin, bấm Đăng xuất ở tab đó.
   → Tab đang sửa về trang đăng nhập, không có hộp "Rời trang?". Đăng nhập lại ở tab đang sửa → về đúng `/ai/prompts`, ô là chữ đã lưu, phía
   trên có "Bạn có thay đổi chưa lưu từ lần trước." [Khôi phục] [Bỏ]. Bấm [Khôi phục] → chữ sửa dở quay lại, thanh mất, [Lưu] bấm được.
4. **Chạy thử khi chưa có model.** Bấm [Chạy thử] → "Thao tác này chưa có model. Chọn model ở Thao tác." và nút "Mở Thao tác" dẫn sang `/ai/operations`.
   Dòng "Còn …/20 lần chạy thử trong giờ này (dùng chung với Bộ ví dụ)" được đọc lại sau lần bấm này (design §6.4: lần lỗi cũng trừ lượt, nên số giảm một).

### Gắn model và key của chính bạn (chưa chạy với key thật ở M1a)

Làm một lần khi muốn thử AI thật; việc này tốn tiền nhà cung cấp, nên làm sau khi đã đi hết các bước giả ở trên. Đo chất lượng bằng bộ ví dụ là M1b.

1. Trong `apps/api/.env` điền `OPENAI_API_KEY=` hoặc `ANTHROPIC_API_KEY=` (một trong hai, hoặc cả hai) bằng key của bạn. Để nguyên
   `OPENAI_CUSTOM_HEADERS` và `ANTHROPIC_CUSTOM_HEADERS` trống: đặt một trong hai thì API không chịu khởi động (D29). `AI_FAKE_ENABLED=true` có
   thể giữ, model giả vẫn dùng được cạnh model thật. File `.env` không bao giờ commit.
2. Dừng rồi chạy lại API và worker (mục 0, bước 4): key chỉ được đọc lúc khởi động.
3. AI › Tình trạng → "Nhà cung cấp có key" phải có thêm nhà cung cấp của bạn.
4. AI › Model → [Thêm model], chọn nhà cung cấp, gõ đúng tên model như nhà cung cấp ghi (ví dụ ở trang model của họ), ô giá có thể để trống và điền
   sau bằng [Sửa giá]. Nhà cung cấp trả "không có model này" thì sửa lại tên.
5. AI › Thao tác → chọn model đó cho thao tác cần thử, [Lưu]. Có thể đặt "Số token đầu ra tối đa" nhỏ để giới hạn tiền cho mỗi lần thử.
6. AI › Prompt → chọn đúng thao tác → [Chạy thử]. Mỗi lần chạy là một lời gọi thật và trừ một trong 20 lượt chạy thử mỗi giờ.
7. Muốn chặn chi tiêu: Cài đặt hệ thống › tab AI › "Trần lời gọi nhà cung cấp mỗi ngày", hoặc tắt công tắc AI toàn hệ thống ở đó.

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
