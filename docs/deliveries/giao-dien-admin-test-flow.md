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
   bấm [Thêm]. → hộp đóng, dòng "Fake · fake:ok" hiện trong danh sách với giá "0,00 / 0,00 / 0,00" (model Fake luôn có giá 0; trong hộp không có ô giá).
   Thử gõ một id lạ như `fake:xyz` → hộp vẫn mở và báo đỏ "Nhà cung cấp không có model này. Kiểm lại tên model.".
3. **Chọn model cho một thao tác.** Menu AI › Thao tác → dòng "Sinh câu điền từ" → ô Model chọn "Fake · fake:ok" → [Lưu] sáng lên; bấm → toast
   "Đã lưu. Áp từ lần gọi sau.". Sửa dở một dòng (chưa bấm [Lưu]) rồi bấm mục menu khác → hộp "Rời trang?".
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

## M4 — Người học (Người dùng, Cấp gói và lượt)

Chuẩn bị như M3. `pnpm test:e2e:real` chạy `m4.real.spec.ts` bằng ba tài khoản do admin tạo qua API: Minh (editor), Lan và Khoa (người học). Muốn tự bấm thì đăng nhập
bằng admin hoặc Minh trong `.state.json`. Khung Figma: A/71 `386:1698`, A/71e `387:1767`, A/72 `387:1965`, A/72b `387:2293`, A/78 `394:2657`, A/78b `394:3168`,
A/78c `394:3719`, A/78d `414:3533`, A/79 `394:3994`, A/79b `414:3823`, A/79e `394:4288`.

1. **Admin khóa rồi mở khóa Khoa.** Đăng nhập admin → menu "Người dùng". Gõ email Khoa vào ô tìm (một ký tự thì chỉ báo "Gõ từ 2 ký tự", chưa gửi gì) → còn đúng một dòng.
   Bấm email → panel bên phải hiện email, họ tên, ngày sinh, "Đồng ý điều khoản", vai trò, trạng thái. Bấm [Khóa tài khoản] → hộp hỏi lý do (1 dòng, tối đa 500 ký tự) → [Khóa tài khoản].
   → Panel đổi sang "Đang khóa từ … · bởi <email admin>" và "Lý do: …", nút thành [Mở khóa]. Khoa đăng nhập thử thì bị từ chối. Bấm [Mở khóa] → dòng khóa biến mất, nút lại là [Khóa tài khoản],
   và Khoa đăng nhập lại được. (A/71, A/72, A/72b.) Nút khóa không có với chính bạn và với tài khoản admin.
2. **Editor không vào được "Người dùng".** Đăng nhập Minh → menu không có "Người dùng"; gõ thẳng `/users` → "Bạn không có quyền xem trang này." (A/71e).
3. **Minh cấp gói Pro cho Lan, sửa ngày, thu hồi.** Đăng nhập Minh → menu "Cấp gói và lượt" → [Cấp mới]. Gõ email Lan → [Kiểm] (hoặc rời ô) → "Đã xác nhận tài khoản …". Loại mặc định "Gói Pro";
   chọn "Tới ngày" (ngày D: Lan còn Pro hết ngày D), gõ lý do → [Cấp]. → Toast "Đã cấp cho …", hộp đóng, danh sách có dòng mới "Đang hiệu lực" với Minh là người cấp.
   Lọc "Người học (email)" bằng email Lan → [Lọc]. Bấm "Sửa ngày" ở dòng đó → ô "Từ ngày" không sửa được (đã bắt đầu), đổi "Tới ngày" + lý do → [Lưu ngày mới]. Mở "Sửa ngày" lần nữa
   → có dòng "Lần sửa trước: … · email Minh · tới … → … · lý do". Bấm "Thu hồi" → lý do → [Thu hồi] → dòng thành "Đã thu hồi", ghi "Thu hồi: lý do", hết nút thao tác. (A/78, A/78b, A/78d, A/79.)
4. **Cấp Pro hai lần.** Đăng nhập admin → [Cấp mới] cho Lan, "Tới ngày" xa, lý do "lần một" → [Cấp]; làm lại với lý do "lần hai". Lọc theo Lan → dòng "lần một" có nhãn "Bị thay thế"
   và không còn nút thao tác, dòng "lần hai" là "Đang hiệu lực". Với admin, hộp có thêm ba ô con số riêng (phiên luyện mỗi ngày, lượt câu AI, lượt tra AI); Minh chỉ thấy ô phiên luyện.
5. **Từ chối trước khi cấp.** Minh gõ email của admin → [Kiểm] → "Editor không cấp được cho tài khoản admin." và [Cấp] tắt (A/79e). Email không có tài khoản → "Không có tài khoản với email này.".
   Người đang trả tiền cho Pro và tự gia hạn (không dựng được trên stack thật này, chỉ kiểm bằng test mock): [Cấp] ra hộp "Cấp gói Pro cho … ?" với [Giữ nguyên] / [Cấp và tắt tự gia hạn] (A/79b).
6. **Lọc và trống.** Ở "Cấp gói và lượt" lọc email của người chưa từng được cấp → "Không có lần cấp nào khớp bộ lọc. Đổi email hoặc số ngày rồi xem lại." (A/78c). Admin thấy thêm dòng
   "Lượt AI hôm nay: x/y"; editor thì không.
7. **Phone 390.** Hai màn và các hộp ở 390 không cuộn ngang, bảng thành thẻ; email dài và lý do 300 ký tự xuống dòng gọn (ảnh trong `docs/deliveries/giao-dien-admin/m4/`).

Ngày "Tới ngày" là ngày cuối còn hiệu lực (hết ngày D mới hết hạn); danh sách hiện lại đúng ngày D.

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

