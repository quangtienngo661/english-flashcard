# Giao diện người học — tài liệu kiểm (theo mốc)

Design [`../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md) §11 (D4):
chủ dự án tự kiểm bằng tay trên máy Windows theo file này, mỗi mốc một mục. Mỗi bước: **làm gì → thấy gì → khung Figma** (file
`7HcPAKLrWu32C27qYMJUOA`, node id ở [`../mockups/2026-10-22/figma-node-ids.md`](../mockups/2026-10-22/figma-node-ids.md)). Kiểm cả
tiếng Việt và tiếng Anh, sáng và tối, cửa sổ rộng và hẹp (thu cửa sổ dưới 768px, hoặc F12 → chế độ điện thoại 390px).

## 0. Dựng máy (PowerShell, làm một lần)

1. Mở Docker Desktop. Ở thư mục gốc repo:
   ```powershell
   docker compose up -d
   pnpm install --frozen-lockfile
   ```
   Postgres ở cổng 5434, Redis 6380, Mailpit (hộp thư thử) ở http://localhost:8025.
2. `apps/api/.env` (chép từ `.env.example` nếu chưa có), kiểm các dòng. Bản `.env` tạo trước 21/10 **thiếu** `ADMIN_APP_URL`,
   `LEARNER_APP_URL`, `TERMS_VERSION`, nên API không khởi động ("Missing or invalid configuration variables"); chép ba dòng đó từ `.env.example`.
   - `CORS_ORIGINS` có `http://localhost:3001` (app người học) và `http://127.0.0.1:5173` (admin mở bằng IP, mục 6);
   - `AI_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true` và `BILLING_FAKE_SECRET` (một giá trị từ `node scripts/gen-secret.mjs`);
   - **không** đặt `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`; `TERMS_VERSION` giữ như `.env.example`.
   - **Nên dùng DB riêng cho dữ liệu thử:** file CSV mẫu ghi đè các nghĩa đang có cùng từ + loại từ (ví dụ `go` verb). Nếu DB đang có nội dung
     thật, tạo DB mới rồi trỏ `DATABASE_URL` vào đó (và `JOB_QUEUE_PREFIX=wordmet-learner-ui`) khi kiểm:
     ```powershell
     docker compose exec -T postgres psql -U dev -d english_learning -c "CREATE DATABASE english_learning_learner_ui"
     ```
     `DATABASE_URL=postgresql://dev:dev@localhost:5434/english_learning_learner_ui`
3. API và worker, trong `apps/api`:
   ```powershell
   pnpm db:setup
   pnpm build
   pnpm run:dev
   ```
4. Dữ liệu thử (cửa sổ PowerShell khác, trong `apps/api`), đổi hai email theo ý:
   ```powershell
   pnpm learner:setup -- --admin admin@example.com --learner lan@example.com
   ```
   Script tạo hai tài khoản đã xác minh (in mật khẩu thử ở cuối), nạp file CSV mẫu 303 nghĩa (`scripts/fixtures/learner-sample.csv`; cặp Kinh
   doanh · B1 có 113 nghĩa), bật AI giả `fake:ok` cho 6 thao tác AI. Thêm `--plan pro` để cấp gói Pro cho người học, `--plan trial` để có gói
   Dùng thử. Chạy lại không sao (đã nạp thì bỏ qua).
5. App người học, trong `apps/web`:
   ```powershell
   pnpm dev:app
   ```
   Mở http://localhost:3001/vi/app. `dev:app` bật `NEXT_PUBLIC_LEARNER_APP=on` và trỏ API về `http://localhost:3000`. **Trên Windows** lệnh này
   chạy `next dev` trong container Linux (`pnpm cf:docker --dev-app`), vì Windows chặn thư viện SWC mà next-intl cần (`next dev` chạy thẳng báo
   "Failed to load native binding"). Lần đầu mất vài phút cài thư viện; mỗi trang mở lần đầu biên dịch vài giây. Thêm file mới khi đang chạy thì
   tắt (Ctrl+C, rồi `docker stop wordmet-dev-app`) và chạy lại. Nếu sau khi đổi nhánh mọi trang `/app` báo "Không tìm thấy trang" hoặc
   không thấy thay đổi mới: tắt như trên, chạy `docker volume rm wordmet-dev-app-next` (bộ nhớ đệm của dev server), rồi chạy lại.
   Nếu mọi trang báo lỗi 500 và log có "Unexpected non-whitespace character after JSON at position 512": hai trang biên dịch cùng lúc đã
   ghi hỏng một file của dev server. Mở lần lượt từng trang sau khi khởi động (đừng mở nhiều tab cùng lúc), hoặc tắt, xóa volume như trên, chạy lại.
6. **Admin cùng lúc** (khi cần, ví dụ cấp gói): chạy admin với API qua IP, rồi mở admin bằng IP — để cookie đăng nhập của admin không đè
   phiên của app người học:
   ```powershell
   $env:VITE_API_BASE_URL='http://127.0.0.1:3000'; pnpm --filter admin dev
   ```
   Mở http://127.0.0.1:5173 (không dùng `localhost`).

Tắt hết: Ctrl+C ở các cửa sổ; `docker compose stop` ở thư mục gốc.

## M1 — Khung app, tài khoản, Cài đặt

Kiểm sáng/tối: Cài đặt → Giao diện → Sáng / Tối / Theo hệ thống. Kiểm tiếng Anh: Cài đặt → Ngôn ngữ → English (đường dẫn đổi sang `/en/app`).

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Mở http://localhost:3001/vi/app khi chưa đăng nhập | Chuyển sang `/vi/app/login?next=%2Fvi%2Fapp`. Bên trái nền navy, bên phải thẻ "Đăng nhập" | K/02 `273:1343`, M/02 |
| 2 | Bấm "Đăng ký". Điền Tên, Ngày sinh `14/5/2015` | Ngay dưới ô: "Bạn cần đủ 13 tuổi để dùng Wordmet."; nút [Tạo tài khoản] mờ | K/01b `341:8507` |
| 3 | Sửa ngày sinh thành `14/5/2008`, điền email mới, mật khẩu `abc` (thiếu điều kiện), tick ô đồng ý, bấm [Tạo tài khoản] | Dưới ô mật khẩu liệt kê các điều còn thiếu (chữ hoa, số, ký tự đặc biệt…) | K/01 `273:1302` |
| 4 | Mật khẩu `Aa1!aaaa`, bấm lại | Sang "Nhập mã 6 số", có email của bạn; "Gửi lại mã sau 60 giây" đếm ngược | K/03 `273:1383` |
| 5 | Lấy mã ở http://localhost:8025, gõ 6 số, bấm [Xác minh] | Sang "Bạn đọc nghĩa của từ bằng ngôn ngữ nào?" | K/06 `273:1483`, K/06b `341:8909` |
| 6 | Mở ô Ngôn ngữ (có cờ), chọn Tiếng Việt, bấm [Tiếp tục] | Sang Hôm nay (M1 mới có tiêu đề; nội dung là M2). Thanh trên: 4 tab, "Gói học · Miễn phí", biểu tượng Cài đặt, avatar | K/10 `256:189` (phần thanh trên, chân trang) |
| 7 | Bấm avatar | Menu: tên "Nguyễn Lan" (Họ + Tên), email, Cài đặt · Gói học (chip Miễn phí) · Đăng xuất | K/90 `328:13087` |
| 8 | Vào Cài đặt | 6 mục: Thông tin cá nhân · Gói và mức sử dụng ("đã dùng 0/3", "Còn 3 phiên, mở lại lúc 0:00.", hai dòng AI "Cần gói Pro") · Học tập · Thông báo ("Lúc 20:00 giờ của bạn…") · Phím tắt (chỉ màn rộng) · Tài khoản (Xóa tài khoản "Sắp có") | K/50 `277:2441` |
| 9 | Bấm [Sửa] ở Ngày sinh, đổi thành `14/5/2015` | Lỗi ngay dưới ô, [Lưu thay đổi] mờ | K/92, K/91 `328:11013` |
| 10 | Đổi Tên, bấm [Lưu thay đổi] | Thông báo "Đã lưu thay đổi."; Cài đặt hiện tên mới | K/91 |
| 11 | Cài đặt → tắt "Nhắc học qua email", tải lại trang | Công tắc vẫn tắt | K/50 |
| 12 | Cài đặt → Giao diện → Tối | Cả app tối ngay; mở tab thứ hai, đổi lại Sáng ở tab đó → tab này đổi theo | (bản tối mẫu, page 08 section 11) |
| 13 | Cài đặt → Ngôn ngữ → English | Đường dẫn thành `/en/app/settings`, chữ tiếng Anh ("Settings", "Plan and usage", "1/3 used"…) | K/50 |
| 14 | Gõ tay `http://localhost:3001/vi/app/settings` khi hồ sơ đang English | Tự chuyển về `/en/app/settings` (E10) | — |
| 15 | Đăng xuất (avatar → Đăng xuất) rồi mở http://localhost:3001/vi/app/settings | Về đăng nhập; đăng nhập xong vào thẳng Cài đặt (E2) | K/02 |
| 16 | Ở đăng nhập, bấm "Quên mật khẩu?", nhập email, [Gửi mã]; lấy mã ở Mailpit, đặt mật khẩu mới | Về đăng nhập với dòng "Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới." | K/04 `273:1422`, K/05 `273:1450` |
| 17 | (Admin, mục 0.6) khóa tài khoản người học, rồi đăng nhập lại bằng đúng mật khẩu | Hộp đỏ "Tài khoản đang bị khóa" phía trên form, email vẫn còn | K/93 `328:13037` |
| 18 | Dừng API (Ctrl+C ở `run:dev`), tải lại một trang app | Màn "Không kết nối được" + [Thử lại]; bật API lại, bấm [Thử lại] → vào lại trang, vẫn đăng nhập (E5) | — |
| 19 | Thu cửa sổ dưới 768px ở Cài đặt | Thanh trên điện thoại (logo hoặc "‹ Quay lại", chip gói, avatar), tab dưới 4 mục; không cuộn ngang | M/90, tab dưới `284:156` |
| 20 | Chân trang (màn rộng) | Giới thiệu, Gói học, Liên hệ, Điều khoản, Chính sách bấm được; Trợ giúp, Câu hỏi thường gặp, Gửi góp ý mờ, không bấm được; không có dòng đổi ngôn ngữ | chân trang `443:6928` |

Kiểm tự động của M1 (CI, job `web`): `e2e/app/m1.spec.ts` (luồng đăng ký, E2, E8, E10, mức sử dụng; axe ở mọi trang M1 × vi/en × sáng/tối ×
1440/390), `e2e/app/overflow.spec.ts` (không cuộn ngang với tên dài), `e2e/csp.spec.ts` (không vi phạm CSP).

## M2 — Học và ôn

Dùng tài khoản người học của mục 0.4 (file CSV mẫu đã nạp). Tài khoản mới chưa có nhóm nào.

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Đăng nhập, vào Hôm nay | "Chưa có nhóm nào" + [Tạo nhóm đầu tiên]; bên dưới "Tạo nhóm nhanh theo chủ đề" có thẻ "Kinh doanh · B1" (số từ, 3 từ mẫu) | K/94 `328:12804` |
| 2 | Bấm "Xem thêm và chọn từ" ở thẻ Kinh doanh · B1 | Trang "Kinh doanh · B1": "113 từ gợi ý…", ô "Chọn tất cả (113 từ chưa học)", mỗi dòng từ · loại từ · nghĩa · trình độ; thanh dưới: "Thêm vào" (Nhóm mới "Kinh doanh · B1"), [Thêm cả 113 từ], [Thêm 0 từ đã chọn] mờ | K/18 `336:3463` |
| 3 | Tick 3 từ, bấm [Thêm 3 từ đã chọn] | "Đã thêm 3 từ vào nhóm “Kinh doanh · B1”."; 3 dòng đó thành "Đang học · Kinh doanh · B1", không tick được nữa | K/18 |
| 4 | Ô "Thêm vào" giờ chọn sẵn nhóm "Kinh doanh · B1" (không tạo nhóm thứ hai). Tick 2 từ rồi đổi ý, bấm [Thêm cả 110 từ] | "Đã thêm 110 từ…" (cả 110, không chỉ 2 từ đã tick; gửi thành lô 100 + 10); không còn thanh dưới | K/18 |
| 5 | Vào Nhóm (tab) | Thẻ nhóm "Kinh doanh · B1": 6 cột ngăn, "113 từ", "… thẻ chờ", [Ôn … thẻ] | K/16 `268:905` |
| 6 | Bấm [Tạo nhóm], gõ tên 61 ký tự | Ô dừng ở 60, bộ đếm "60/60"; tên ngắn "Công nghệ" → [Tạo nhóm] → "Đã tạo nhóm “Công nghệ”." | K/17 `335:2879` |
| 7 | Tạo lại nhóm tên "Công nghệ" | Dưới ô: "Đã có nhóm tên này. Chọn tên khác." | K/17 |
| 8 | ⋯ của nhóm Công nghệ → Đổi tên nhóm → "Công nghệ thông tin" → [Lưu tên mới] | "Đã đổi tên nhóm." | K/10b `335:3288`, K/17b `335:3000` |
| 9 | Ô lọc "Tất cả · 2 nhóm" → "Còn thẻ chờ" / "Xong hôm nay" | Chỉ các nhóm khớp | K/16 |
| 10 | ⋯ → Xóa nhóm ở nhóm "Công nghệ thông tin" (chưa có từ) | Hộp "Xóa nhóm “Công nghệ thông tin”?", nút [Xóa nhóm] và [Giữ nhóm]; xóa xong "Đã xóa nhóm…" | K/14 `274:1513` |
| 11 | Bấm tên nhóm Kinh doanh · B1 | Trang nhóm: số từ, ngày tạo, chip ưu tiên/đến hạn/mới, biểu đồ 6 ngăn (Mới · 1 · 3 · 7 · 14 · 30 ngày), "Xem trước thẻ" (Space lật), danh sách từ có ô lọc | K/11 `257:317` |
| 12 | Ô lọc từ → "Ngăn 1 ngày" (sau khi đã ôn, bước 15) | Chỉ từ ở ngăn đó, có số đếm | K/12 `274:950` |
| 13 | Bỏ một từ khỏi nhóm (nút thùng rác ở dòng) | Từ chỉ có trong nhóm này: hộp hỏi "Bỏ “…” khỏi nhóm?" trước; bấm [Bỏ khỏi nhóm] → "Đã bỏ “…” khỏi nhóm." | K/11 |
| 14 | Hôm nay | Khối lớn "Ôn tiếp" của nhóm có nhiều thẻ chờ nhất, [Ôn N thẻ], "Hoặc học tất cả 113 từ"; danh sách nhóm; cột phải "… từ theo ngăn" | K/10 `256:189` |
| 15 | Bấm [Ôn N thẻ] | Toàn màn, nền họa tiết mờ: × Esc · tên nhóm, "còn N thẻ"; mặt trước từ + loại từ (+ "Ưu tiên" nếu có), [Lật thẻ] Space | K/20 `273:1505`, M/30 |
| 16 | Nhấn Space | Mặt sau: loại từ, từ, nghĩa, dạng chia (nếu có), câu mẫu (từ tô xanh); [Cần ôn lại] 1, [Đã biết] 2 | K/21 `273:1530`, M/31 |
| 17 | Nhấn 2 vài lần (lật bằng Space giữa các thẻ), một lần nhấn 1; rồi Esc | "Xong N thẻ.", ô "Đã biết" và "Cần ôn lại" đúng số đã bấm; [Về trang chủ] Enter | K/22 `273:1574`, M/32 |
| 18 | Mở lại phiên ôn, lật một thẻ, tắt mạng (F12 → Network → Offline), bấm [Đã biết]; bật mạng, bấm lại | Lần đầu: "Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại.", thẻ vẫn còn; lần sau sang thẻ kế, thẻ chỉ được tính một lần (E19) | — |
| 19 | Tải lại trang giữa phiên | Phiên bắt đầu lại từ hàng đợi (thẻ đã trả lời không quay lại vì API đã ghi) | — |
| 20 | Thẻ nhóm → ⋯ → "Học tất cả … từ" | Phiên `mode=all`: mọi từ của nhóm, kể cả từ chưa tới hạn | K/20 |
| 21 | Từ lâu chưa ôn: cần từ quá hạn hơn 60 ngày (khó dựng bằng tay); kiểm trên trang `/vi/app/group/backlog?id=<id nhóm>` | "Từ lâu chưa ôn", [Học lại cả N từ]; tick vài dòng → [Học lại 2 từ] / [Bỏ khỏi việc học] (hỏi trước); khi chưa có từ nào: dòng trống | K/15 `445:7913` |
| 22 | Thu cửa sổ còn 390px ở từng trang trên | Không cuộn ngang; phiên ôn: thanh tiến độ "3/10", nút to ở đáy | M/30–M/32 |

Kiểm tự động của M2 (CI, job `web`): `e2e/app/m2.spec.ts` (Hôm nay có và chưa có nhóm, tạo → đổi tên → xóa nhóm, lọc nhóm, học lại từ lâu
chưa ôn, chọn từ theo chủ đề cả hai nút, phiên ôn bằng phím; axe và không cuộn ngang ở mọi trang M2 với tên nhóm 60 ký tự và câu 280 ký tự ×
vi/en × sáng/tối × 1440/390).

## M3 — Tra từ và thêm từ

Dùng tài khoản người học của mục 0.4. Trong file CSV mẫu có các từ `left`, `go`, `leave`, `profit`; chủ đề Kinh doanh · B1.

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Ở bất kỳ trang nào (màn rộng), nhấn phím `/` | Con trỏ vào ô tra trên dải dưới thanh trên ("Tra trong 7.799 từ…"); gõ `left`, Enter → sang Tra từ | K/10 dải tra, K/30 |
| 2 | Tra từ: chọn "Trình độ: B1", "Chủ đề: Kinh doanh" | Đường dẫn đổi theo (`?level=B1&topic=business`); bảng Từ · Loại từ · Nghĩa · Trình độ, mỗi dòng có nút +; cột phải xem trước từ đang trỏ chuột (chủ đề, câu mẫu, [Thêm vào nhóm], [Mở trang từ]) | K/30 `258:413`, M/40 |
| 3 | Tick "Chỉ từ của tôi", rồi bấm "Xóa lọc" | Chỉ còn từ bạn tự thêm; "Xóa lọc" bỏ hết bộ lọc, giữ chữ đang tra | K/30 |
| 4 | Tra `zzzz` | "Không tìm thấy từ này" + [Thêm từ này] (mở tấm Thêm từ với chữ đã tra) | — |
| 5 | Bấm từ `left` | Trang từ: "left", trình độ, "N nghĩa"; mỗi nghĩa có số thứ tự, loại từ, nghĩa, dòng định nghĩa tiếng Anh nhỏ, câu mẫu tô từ; nghĩa đang học có chip "Đang học · <nhóm>", nghĩa chưa học có [Thêm vào nhóm]; cột phải "Cùng chủ đề" | K/31 `259:508`, M/41 |
| 6 | Mở `/vi/app/word?w=go` | Dòng vàng "Dạng chia: go · goes · going · went · gone", chỉ dạng có trang riêng là link | K/32 `275:1233` |
| 7 | Ở một nghĩa chưa học, bấm [Thêm vào nhóm] | Hộp "Lưu vào nhóm": ô "Tìm hoặc tạo nhóm…", "Dùng gần đây", "Tất cả nhóm (N), A–Z" kèm số từ; chọn một nhóm → [Lưu vào …] → "Đã thêm “left” vào nhóm “…”." | K/42 `275:8211`, M/52 |
| 8 | Trong hộp đó gõ một phần tên nhóm (ví dụ `kinh`) | "Kết quả (1)" và dòng [Tạo nhóm “kinh”]; gõ tên không khớp nhóm nào → "Chưa có nhóm nào tên “…”." + [Tạo nhóm và lưu] | K/42b `333:12049`, K/42c `333:12695` |
| 9 | Ở nghĩa đang học: khối "Bạn đang học" bên phải → "Thêm câu đã gặp" | Tấm "Thêm câu đã gặp": dòng nghĩa, ô "Câu" đếm tới 300 và dừng; [Lưu câu] → "Đã lưu câu."; chip của nghĩa thành "… · 1 câu đã gặp" | K/44 `275:8964`, M/53 |
| 10 | Thêm câu cho tới khi đủ (mặc định 20 câu mỗi nghĩa) | Lỗi dưới ô: "Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới." + [Xem các câu đã gặp] (không ghi con số) | K/44b `327:10733` |
| 11 | Bấm "N câu đã gặp" ở nghĩa | Danh sách câu, cũ trước; xóa một câu → câu biến mất, số câu giảm 1 | K/31 |
| 12 | Nhấn phím `N` (hoặc nút "Thêm từ" trên thanh trên, nút + trên điện thoại) | Tấm "Bạn vừa gặp từ nào?" | K/40 `275:7927`, M/50 |
| 13 | Gõ `went`, dán một câu | "went là quá khứ của go" và nghĩa của go; ô "Lưu vào nhóm" chọn sẵn nhóm dùng gần nhất; [Lưu went] → "Đã lưu từ “went” vào nhóm “…”." | K/40 |
| 14 | Mở tấm, gõ một từ không có (ví dụ `rizz`) → [Nghĩa khác, tự nhập] | "Tự nhập nghĩa" · "Chỉ bạn thấy từ này."; bấm [Lưu từ] khi ô Nghĩa trống → "Nhập nghĩa của từ."; điền nghĩa → lưu được; tra lại `rizz` → có tag "Của tôi" | K/41 `275:8067` |
| 15 | Lưu lại đúng từ `rizz` lần nữa bằng nghĩa tự nhập | "Bạn đã có từ “rizz” trong Từ của tôi." + link [Mở từ này] | — |
| 16 | Xóa nhóm dùng gần nhất (trang Nhóm), mở lại tấm | Ô nhóm trống "Chọn nhóm"; bấm lưu → "Chọn một nhóm để lưu từ." (E21) | K/40 |
| 17 | Tài khoản chưa có nhóm nào, mở tấm | "Bạn chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ này." + [Tạo nhóm đầu tiên]; không có nút lưu | K/40b `326:12207` |
| 18 | Hôm nay: ô "Thêm từ vừa gặp" bên phải, gõ một từ, [Thêm] | Mở tấm Thêm từ với từ đó | K/10 |
| 19 | Tra từ với "Trình độ: A2" (không gõ chữ tra) → [Thêm cả loạt vào nhóm] | Tấm "Thêm cả loạt vào nhóm": bộ lọc, "Vào nhóm" (mặc định "Nhóm mới: A2"), [Thêm cả loạt] → thông báo đủ các số: đã thêm, đã có trong nhóm, từ chức năng bỏ qua, không vừa vì nhóm đầy | K/43 `275:8778`, M/44 |
| 20 | Thu cửa sổ còn 390px ở mỗi trang trên | Không cuộn ngang; tấm Thêm từ trượt lên từ đáy; nút chính ở đáy | M/40–M/53 |

Kiểm tự động của M3 (CI, job `web`): `e2e/app/m3.spec.ts` (Tra từ → trang từ → thêm vào nhóm, phím N và `went`, tự nhập nghĩa, câu đã gặp tới giới hạn,
thêm cả loạt, phím `/`; axe và không cuộn ngang ở Tra từ, trang từ, danh sách câu, tấm Thêm từ với nghĩa dài, câu 300 ký tự, tên nhóm 60 ký tự × vi/en ×
sáng/tối × 1440/390).

## M4 — Luyện tập và Gói học

Dùng tài khoản người học của mục 0.4 (gói Miễn phí: 3 phiên luyện mỗi ngày), đã có nhóm và vài từ đã ôn (M2). Câu sai trong phiên ở bước 6 tạo dữ liệu cho
Từ hay sai và Lịch sử. Bước 15–17 cần gói Pro: chạy lại `pnpm learner:setup -- --admin <email> --learner <email> --plan pro` (ở `apps/api`, đội Wordmet cấp Pro 30
ngày) rồi tải lại trang.

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Mở Luyện tập (tab dưới / thanh trên) | Thẻ lớn "Hôm nay": "N từ trong M nhóm. 10 câu, trộn ba kiểu câu.", chip ba kiểu câu và "10 câu", [Bắt đầu 10 câu] [Tùy chỉnh]; bên phải "Phiên luyện hôm nay" · "Gói Miễn phí" · "đã dùng x/3" · "Một phiên chỉ tính khi bạn trả lời câu đầu tiên. Mở lại lúc 0:00."; bốn nguồn Theo nhóm · Từ hay sai · Đang ưu tiên · Luyện tất cả, mỗi nguồn có nút luyện và nút Tùy chỉnh (icon); "Gần đây" + [Xem lịch sử]; "Phím tắt trong phiên" (chỉ web) | K/51 `276:2349`, M/L51 |
| 2 | Theo nhóm: bấm chip một nhóm khác | Nút đổi thành "Luyện <tên nhóm>" | K/51 |
| 3 | Bấm icon Tùy chỉnh của Theo nhóm | Hộp "Tùy chỉnh phiên" · chip "Theo nhóm": ô Nhóm "… · N từ", hai ô "Mọi từ / Cần ôn hôm nay / Đang ưu tiên" và "Mọi ngăn / Ngăn 0…5" (chọn ngăn thì ô kia về "Mọi từ"); ba ô kiểu câu cùng cỡ, không mô tả; "Kiểu đề · cho kiểu Gõ từ" chỉ hiện khi tick Gõ từ; "Số câu" − 10 + "tối đa 20" (dừng ở 20); "Thêm tùy chọn" mở ô "Thứ tự"; không có khối "Kiểu câu có AI"; dưới nút: "Dùng 1 trong N phiên còn lại hôm nay." | K/54 `276:2708` (bố cục D10), M/L54 |
| 4 | Bỏ tick cả ba kiểu câu | "Chọn ít nhất một kiểu câu.", nút Bắt đầu mờ | — |
| 5 | Chọn một nhóm chưa có từ nào cần ôn, "Cần ôn hôm nay" → Bắt đầu | Dòng đỏ trong hộp: "Nhóm này không có từ nào khớp lựa chọn." | — |
| 6 | Đóng hộp, [Bắt đầu 10 câu] | Phiên toàn màn: "Luyện tập · Từ cần ôn hôm nay", vạch tiến độ + "Câu 1/10"; trắc nghiệm: nghĩa lớn, 4 đáp án có số; nhấn `H` → khối "Gợi ý 1/2" với dòng đã mở và [Mở gợi ý 2]; nhấn số của một đáp án sai → "Chưa đúng", đáp án đúng xanh "Đáp án đúng", đáp án chọn đỏ "Bạn chọn", nghĩa và định nghĩa; [Cần ôn lại 1] vàng, [Câu tiếp Enter] | K/60 `273:1598`, K/61 `273:1657`, K/63 `273:1800`, M/L60, M/L61 |
| 7 | Câu Đúng/sai, trả lời đúng | "Đúng rồi"; [Cần ôn lại 1] [Đã biết 2] [Câu tiếp]; bấm [Đã biết] → sang câu tiếp | K/62 `273:1731` |
| 8 | Câu Gõ từ: gõ sai chính tả, [Kiểm tra] | Ô đỏ "Lần 1", "Chưa đúng · Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án."; [Làm lại Enter] [Gợi ý H] [Xem đáp án]; [Xem đáp án] → tính sai, hiện đáp án | K/64 `273:1849`, M/L64 |
| 9 | Ở một câu, bấm "Báo lỗi" | Hộp "Báo lỗi câu này": lý do theo thứ tự, **"Khác" cuối**; chọn "Khác" → "Ghi chú · bắt buộc · 0/300", gửi khi trống → "Ghi rõ lỗi để gửi báo lỗi này."; gửi được → "Đã gửi báo lỗi. Xem kết quả trong Lịch sử → Báo lỗi của tôi.", nút đổi thành "Đã báo lỗi" | K/66 `273:1954`, M/L66 |
| 10 | Giữa phiên, tải lại trang (F5) rồi bấm Back của trình duyệt | Tải lại: đúng câu đang làm (gợi ý đã mở vẫn hiện); Back về Luyện tập: thẻ vàng "Phiên đang dở" · "…, đã làm x/10 câu. Bắt đầu phiên mới sẽ đóng phiên này." + [Làm tiếp câu x+1] | K/51, E34 |
| 11 | Ở Luyện tập, bấm [Bắt đầu 10 câu] khi còn phiên dở | Hộp "Bạn có phiên đang dở x/10" · [Làm tiếp] [Mở phiên mới]; [Làm tiếp] về đúng câu cũ | K/77 `360:15650`, E35 |
| 12 | Luyện một nhóm ít từ hơn số câu (ví dụ 5 từ, 10 câu) | Hết vòng 1: "Hết vòng 1 · Bạn đã làm hết 5 từ", chip "x đúng" "y sai"; [Luyện lại thêm 5 câu Enter] [Kết thúc, xem tổng kết Esc] | K/65 `273:1911`, M/L65 |
| 13 | Nhấn `Esc` giữa phiên | Tổng kết: "Xong N câu.", "…, trộn 3 kiểu câu. Hôm nay còn x/3 phiên luyện.", ô Đúng / Sai; "Cần ôn lại · k từ" mỗi từ một [Cần ôn lại] (bấm → "Đã đưa vào ưu tiên"), [Đưa k từ còn lại vào ưu tiên]; [Về Luyện tập Enter] [Luyện thêm một phiên] | K/67 `273:2069`, M/L67 |
| 14 | Luyện hết 3 phiên trong ngày (mỗi phiên trả lời ít nhất 1 câu), mở lại Luyện tập | Thẻ lớn "Hết phiên luyện hôm nay · Mai luyện tiếp nhé · Gói Miễn phí có 3 phiên luyện mỗi ngày, mở lại lúc 0:00…" + [Ôn thẻ] (không có [Xem gói học]); các nguồn ghi "Mở lại lúc 0:00"; cột phải "đã dùng 3/3" + "còn … giờ … phút" | K/55 `276:3140`, M/L55 |
| 15 | Mở Từ hay sai (tiêu đề thẻ nguồn, hoặc "+N từ") | "N từ hay sai"; ô Nhóm "Tất cả nhóm · N" và từng nhóm "… · số từ"; mỗi từ: nghĩa, "sai x/y", ngăn, "21:06 hôm nay"; thẻ xanh đậm [Luyện N từ] [Tùy chỉnh]; hộp "Từ vào và rời danh sách thế nào?" | K/56 `276:3501`, M/L56 |
| 16 | Chọn một nhóm trong ô Nhóm | Tiêu đề "x từ trong nhóm …", nút "Luyện x từ của nhóm …" mở phiên chỉ gồm các từ đó | K/56, API (b) |
| 17 | Mở Lịch sử ([Xem lịch sử]) | Tab "Câu đã làm": ô Ngày (Mọi ngày · Hôm nay · Hôm qua…), mỗi câu: giờ, từ, kiểu câu ("Gõ từ · theo nghĩa"), đề, bạn trả lời, đáp án, kết quả ("Sai · bỏ qua", "Đúng · có gợi ý", "Đúng · lần 2"), đã bấm; tài khoản chưa làm câu nào → "Bạn chưa làm câu nào." | K/57 `276:3741`, K/57b `411:5825`, M/L57 |
| 18 | Tab "Báo lỗi của tôi" | Báo lỗi ở bước 9: từ, lý do, ngày gửi, "Đang xem"; sau khi báo lỗi được xử lý (admin chưa có màn Báo lỗi; gọi `POST /v1/admin/practice/reports/{id}/resolve` bằng tài khoản admin): "Đã sửa" / "Không có lỗi" / "Đã xác nhận lỗi" + dòng lượt câu AI; tải lại vẫn ở tab này; chưa báo lỗi → "Bạn chưa báo lỗi câu nào." | K/82 `364:4453`, K/83 `364:4706` |
| 19 | Chip gói trên thanh trên → Gói học | Toàn màn: "Gói học · Học đều mỗi ngày, lên Pro khi cần", công tắc Theo năm / Theo tháng (đổi giá giữ chỗ "XXX.000 ₫ / năm" ↔ "XX.000 ₫ / tháng"); thẻ Miễn phí "Gói của bạn" · "Bạn đang dùng gói này", không có "Không cần thẻ ngân hàng"; thẻ Pro dải "Chưa mở bán", không nút mua, không dòng thanh toán; [So sánh chi tiết các gói] mở bảng; × về Hôm nay | K/52 `265:844`, M/62 |
| 20 | Sau `--plan pro`, mở lại Gói học | "Bạn đang dùng gói Pro · Đội Wordmet cấp từ <hôm nay> tới hết <30 ngày sau>. Không thu tiền, không tự gia hạn."; thẻ Pro dải "Gói của bạn · Đội Wordmet tặng", "Tới hết …"; Luyện tập ghi "Gói Pro" và "đã dùng x/30" | K/53 `277:2349`, M/62b |
| 21 | Đổi sang English (Cài đặt), xem lại Luyện tập, một phiên, Từ hay sai, Lịch sử, Gói học | Chữ tiếng Anh ngắn ("Weak words", "Still learning / Know", "Check"), gợi ý ghi "Hint" không có tổng; giờ "12:00 AM" | design §7 |
| 22 | Thu cửa sổ còn 390px ở mỗi màn trên, và Giao diện Tối | Không cuộn ngang; hộp Tùy chỉnh trượt lên từ đáy, nút Bắt đầu ở đáy; phiên toàn màn; chữ đọc được trên nền tối | M/L51–M/L67, M/62 |

Kiểm tự động của M4 (CI, job `web`): `e2e/app/m4.spec.ts` (một phiên đủ ba kiểu câu, gợi ý, gõ lại, vòng 2, báo lỗi, tổng kết; tải lại giữa phiên; hộp phiên đang
dở; hết phiên; Từ hay sai theo nhóm; Lịch sử và Báo lỗi của tôi; Gói học; axe và không cuộn ngang ở Luyện tập, hộp Tùy chỉnh, phiên với nghĩa và đáp án dài,
Từ hay sai, Lịch sử, Báo lỗi của tôi, Gói học × vi/en × sáng/tối × 1440/390; câu gõ 100 ký tự).

## M4b — Lịch sử giao dịch

Dữ liệu: trong `apps/api`, `pnpm learner:setup -- --admin <email> --learner <email> --plan pro --transactions` (cần `BILLING_FAKE_ENABLED=true` và
`BILLING_FAKE_SECRET` trong `.env`). Script gửi ba sự kiện cổng giả qua webhook thật: mua tháng Pro 60 ngày trước (99.000 ₫), gia hạn 30 ngày trước, rồi hoàn
tiền lần gia hạn; cộng lần đội Wordmet cấp Pro của `--plan pro`. Chạy lại không tạo thêm. Tự gửi thêm: `pnpm billing:fake-event --type renewed --sub <id>
--user <uuid> --tx <mã> --interval month --period-start … --period-end … --amount 99000 --currency VND`.

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Cài đặt → "Lịch sử giao dịch" (dòng có mũi tên ở mục Tài khoản) | Trang "Lịch sử giao dịch", link "← Cài đặt"; bảng Ngày · Loại · Gói và kỳ · Số tiền · Kỳ được dùng · Trạng thái · "Chi tiết ›"; 4 dòng mới nhất trước: Đội Wordmet cấp (Số tiền "—"), Hoàn tiền 99.000 ₫ "Thành công", Gia hạn "Đã hoàn tiền", Mua "Thành công"; kỳ "24/8 – 22/9/2026" (ngày cuối là ngày trước ngày gia hạn); dòng dưới bảng "Ngày theo múi giờ của bạn…" | K/95 `472:7913` |
| 2 | Cột phải | "Gói học · Gói Pro · Đội Wordmet cấp tới hết <ngày>"; khối "Về giao dịch" ba dòng | K/95 |
| 3 | Bấm dòng Gia hạn | Hộp "Chi tiết giao dịch": Loại · Gói · Số tiền · Thời điểm ("23/9/2026, 7:58") · Kỳ được dùng · Trạng thái · Cổng thanh toán "Giả (thử)" · Mã giao dịch; dòng "Có câu hỏi về giao dịch này?…"; [Đóng] hoặc Esc đóng | K/95b `473:7923` |
| 4 | Bấm dòng Đội Wordmet cấp | Hộp không có Số tiền, Cổng thanh toán, Mã giao dịch | K/95b |
| 5 | Tài khoản chưa có giao dịch nào (một người học mới) | "Chưa có giao dịch nào." + "Khi bạn dùng thử, mua gói Pro…" | K/95c `473:8081` |
| 6 | Tắt API rồi tải lại trang | "Không tải được lịch sử giao dịch." · "Kiểm tra mạng rồi thử lại." [Thử lại]; bật API, [Thử lại] tải được | K/95d `473:8220` |
| 7 | Cửa sổ 390px | Mỗi giao dịch ba dòng ("Gia hạn · 99.000 ₫" + chip, "Pro · theo tháng · ngày", "Dùng …"); chạm một dòng mở tấm từ đáy; không cuộn ngang | M/95 `474:5485`, M/95b `474:5601` |
| 8 | English, Giao diện Tối | "Transaction history", "Renewal · ₫99,000", "Refunded", "Fake (test)"; chữ đọc được trên nền tối | K/95 Dark `473:8361` |
| 9 | Admin (mở bằng `127.0.0.1:5173`, mục 0.6) bằng tài khoản admin → Người học → "Giao dịch" | Bảng mọi người học: email, Loại, Gói · Kỳ được dùng, Thời điểm, Số tiền · Cổng ("Giả (thử) · fake_txn_…"), Trạng thái, [Chi tiết]; chân bảng "N giao dịch · mới nhất trước · ngày giờ theo múi giờ Asia/Ho_Chi_Minh" | A/90 `477:3675` |
| 10 | Lọc theo email người học, loại "Gia hạn", Từ ngày / Tới ngày → [Lọc] | Chỉ dòng khớp; email không có → "Không có giao dịch nào khớp bộ lọc…" | A/90c `478:3957` |
| 11 | [Chi tiết] một dòng | Hộp chỉ xem: Người học, Mã người học, Số tiền "99.000 ₫ (VND)", "Giả (thử) · môi trường test", Mã giao dịch của cổng; dòng "Chỉ xem. Hoàn tiền làm ở cổng thanh toán…" | A/90b `478:3743` |
| 12 | Đăng nhập admin bằng tài khoản editor | Không có mục "Giao dịch"; gõ `/transactions` thì về trang đầu | GI9 |

Kiểm tự động của M4b (CI): web `e2e/app/m4b.spec.ts` (Cài đặt → danh sách → chi tiết → Đóng; trống; axe và không cuộn ngang × vi/en × sáng/tối × 1440/390);
admin `e2e/transactions.spec.ts` (menu → lọc gửi ranh giới ngày Việt Nam → chi tiết, axe; editor không thấy, không gọi API), `a11y.spec.ts` thêm `/transactions`;
API unit GI1–GI10.

## M5a — Luyện tập có câu AI

Dữ liệu: `pnpm learner:setup -- --admin <email> --learner <email> --plan pro` (ở `apps/api`, cần `AI_FAKE_ENABLED=true`; script chọn model giả
`fake:ok` cho mọi thao tác AI). Muốn thử AI lỗi: trong admin (hoặc API `PUT /v1/admin/ai/operations/:op`) thêm model giả `fake:bad-json` (AI trả câu hỏng) rồi
chọn nó cho `generate_cloze`, hoặc tắt AI (`ai_enabled=false` ở Cài đặt hệ thống). Muốn thử hết lượt: admin cấp gói "limits" với `ai_practice_per_cycle` nhỏ (ví dụ 2).

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Luyện tập → [Tùy chỉnh] một nguồn | Dưới ba ô kiểu câu: công tắc "Kiểu câu có AI" + nhãn Pro, đang tắt; không có ô "Câu lấy từ đâu?" | K/70 (D10) |
| 2 | Bật công tắc | Ba ô Điền từ vào câu · Chọn nghĩa trong câu · Trắc nghiệm theo câu (đã tick); dòng "Phiên này dùng tối đa N lượt câu AI · còn M"; bỏ tick một ô thì N giảm | K/70 |
| 3 | Đóng hộp, mở lại; tải lại trang | Công tắc vẫn bật (nhớ trên máy này) | E21 |
| 4 | [Bắt đầu] | Có lúc "Đang tạo câu… · Thường mất vài giây."; rồi câu AI có nhãn "Câu AI": điền từ (câu có ___, ô gõ, [Kiểm tra], [Xem đáp án]), chọn nghĩa (từ in đậm), trắc nghiệm theo câu | K/73, K/78a–c |
| 5 | Ở câu điền từ bấm [Gợi ý], rồi [Mở gợi ý 2], [Mở gợi ý 3] | Khối "Gợi ý 1/3" có chấm tiến độ; dòng "Chữ cái đầu" · "Định nghĩa" · "Nghĩa tiếng Việt" | §15 điểm 10 |
| 6 | Trả lời đúng | "Đúng rồi", từ · nghĩa, định nghĩa; khối "Bản dịch · AI dịch" với câu tiếng Việt (chỉ người học tiếng Việt) | K/79a |
| 7 | Bấm "Báo lỗi" ở một câu AI | Lý do câu AI ("Khác" cuối); dòng cuối có "…bạn được trả lại 1 lượt câu AI."; câu AI về từ bạn tự thêm: không có ô tick, dòng "Đội Wordmet sẽ thấy từ “…” bạn tự thêm để kiểm tra." | K/80, K/81 (D12) |
| 8 | Chọn `fake:bad-json` cho `generate_cloze`, mở phiên chỉ có Điền từ vào câu | "Hệ thống đang gặp lỗi." [Thử lại] [Để sau] + "Dừng thì phiên vẫn đang dở…"; đổi lại model tốt rồi [Thử lại] → có câu; [Để sau] về Luyện tập, thẻ "Phiên đang dở" | K/74a, K/74d (D11) |
| 9 | Phiên trộn (có kiểu thường) khi AI lỗi | Dải "Câu này chuyển sang kiểu câu thường." một lần, đóng được | K/75 |
| 10 | Hết lượt câu AI giữa phiên | Phiên trộn: dải "Hết lượt câu AI. Các câu còn lại của phiên dùng kiểu câu khác. Lượt câu AI mới có vào …"; phiên chỉ AI: "Hết lượt câu AI" + lúc nạp + [Để sau] | K/75b, K/74b |
| 11 | Mở phiên AI khi còn ít lượt hơn cần | Hộp trong Tùy chỉnh: "Không đủ lượt câu AI · Phiên này cần N lượt câu AI, bạn còn M. Lượt câu AI mới có vào …" + [Bỏ kiểu câu có AI] | K/71 |
| 12 | Tắt AI ở Cài đặt hệ thống rồi mở phiên AI | "Hệ thống đang gặp lỗi, chưa dùng được kiểu câu có AI. Bỏ kiểu câu AI để bắt đầu, hoặc thử lại sau." + [Bỏ kiểu câu có AI] | K/72 (D11) |
| 13 | Tài khoản gói Miễn phí | Công tắc mờ + nhãn Pro có ổ khóa; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." [Xem Gói học] | K/70b (D6) |
| 14 | English, Tối, cửa sổ 390px | "AI question types", "Writing the question…", không có khối bản dịch; câu AI dài không cuộn ngang | M/78d, E41 |

Kiểm tự động của M5a (CI, job `web`): `e2e/app/m5a.spec.ts` (Pro: bật công tắc → đang tạo câu → điền từ → gợi ý → trả lời → bản dịch; AI lỗi + Thử lại;
dải đổi kiểu câu; Miễn phí khóa; không đủ lượt; báo lỗi câu AI về từ riêng không có ô tick; axe và không cuộn ngang với câu AI 300 ký tự × vi/en × sáng/tối ×
1440/390); API unit GF1–GF4 và `private_word`.

## M5b — Tra bằng AI và Từ của tôi

Dữ liệu: `pnpm learner:setup -- --admin <email> --learner <email> --plan pro` (ở `apps/api`, cần `AI_FAKE_ENABLED=true`; script chọn `fake:ok` cho
`lookup_word`). Thử gói Dùng thử: `--plan trial`; gói Miễn phí: một tài khoản mới. Thử hết lượt: admin cấp gói "limits" với `ai_lookup_per_cycle` nhỏ (ví dụ 1).
Thử AI lỗi: chọn model giả `fake:bad-json` cho `lookup_word`, hoặc tắt AI ở Cài đặt hệ thống.

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Nhấn N (hoặc [Thêm từ]), gõ một từ Wordmet không có (ví dụ "rizz") | Dòng "Wordmet chưa có từ “rizz”…"; hai nút bằng nhau [Tra bằng AI] (vàng) · [Tự nhập nghĩa]; dưới nút AI "còn N lượt tra AI" | K/85, §15 điểm 13 |
| 2 | Dán câu vào "Câu bạn gặp" | Ô tick "Gửi kèm câu đã gặp cho AI", mặc định không tick | K/85 |
| 3 | [Tra bằng AI] | "Đang tra…", rồi "Kết quả cho “rizz”" · "Đã dùng 1 lượt tra AI · còn N−1"; khối **AI gợi ý**: từ, loại từ, nghĩa, "Định nghĩa tiếng Anh (chỉ để tham khảo, không lưu): …", câu ví dụ; "AI gợi ý có thể sai. Kiểm lại trước khi lưu." + [Sửa rồi lưu] | K/86 |
| 4 | Gõ một từ có sẵn (ví dụ "sick"), bấm "Không phải nghĩa bạn cần?" → [Tra bằng AI] | "Nghĩa có sẵn trong từ điển" ở trên, mỗi nghĩa có [Chọn]; khối AI gợi ý ở dưới. [Chọn] → về danh sách nghĩa, nghĩa đó được chọn sẵn | K/86b |
| 5 | [Sửa rồi lưu] | "Sửa trước khi lưu": Từ, Loại từ, Nghĩa, Trình độ (trống: AI không cho trình độ), Chủ đề, Câu ví dụ (tối đa 2, "+ Thêm câu ví dụ"), Lưu vào nhóm, dòng "Từ này mang nhãn AI gợi ý tới khi…" · [Hủy] [Lưu từ] | K/87 |
| 6 | Chọn trình độ, [Lưu từ] | "Đã lưu từ “rizz” vào nhóm “…”." | K/87 |
| 7 | Mở trang từ (Tra từ → "rizz", hoặc `/vi/app/word?w=rizz`) | Nhãn "Từ của tôi", "AI gợi ý"; dòng "Nguồn: AI gợi ý. Nghĩa này chưa ai duyệt, bạn nên kiểm lại."; không có định nghĩa tiếng Anh; [Sửa] [Xóa từ] (đỏ) | K/88 |
| 8 | [Sửa] → chỉ đổi Loại từ → [Lưu thay đổi] | Nhãn "AI gợi ý" vẫn còn | K/88 |
| 9 | [Sửa] → đổi Nghĩa (hoặc chủ đề, câu ví dụ) → [Lưu thay đổi] | Nhãn "AI gợi ý" và dòng nguồn biến mất | K/88 |
| 10 | [Xóa từ] | Hộp "Xóa từ “rizz”?" + cảnh báo; [Xóa từ] → về Tra từ, từ không còn | K/88 |
| 11 | Tài khoản Dùng thử | Chip "Dùng thử" cạnh "còn N lượt tra AI" | K/85t |
| 12 | Tài khoản Miễn phí | Nút [Tra bằng AI] có ổ khóa + "Pro"; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." [Xem Gói học]; [Tự nhập nghĩa] vẫn dùng được | K/85b (D6) |
| 13 | `fake:bad-json` cho `lookup_word`, tra lại | "Hệ thống đang gặp lỗi." (+ [Thử lại] khi thử lại được); lượt không bị trừ | K/85c (D11, E39) |
| 14 | Hết lượt tra AI | "Hết lượt tra AI. Lượt tra AI mới có vào …" | K/85c (E40) |
| 15 | English, Tối, cửa sổ 390px | "Look up with AI", "AI suggestion", "Edit before saving", "My words"; nghĩa dài không cuộn ngang | M/85–M/88 |

Kiểm tự động của M5b (CI, job `web`): `e2e/app/m5b.spec.ts` (Pro: tra AI → sửa → lưu với `ai_suggestion`; Dùng thử, Miễn phí; 409 `ai-in-progress` gửi lại
cùng key; AI lỗi + Thử lại; hết lượt; trang Từ của tôi: sửa nghĩa, nhãn mất, xóa; axe và không cuộn ngang × vi/en × sáng/tối × 1440/390); unit
`ai-lookup.test.tsx`, `edit-suggestion.test.tsx`, `my-word.test.tsx`.

## Đợt cải thiện A — Luyện tập

PR `fix/cloze-reveal-before-try` (#133) và `feat/dot-cai-thien-a-practice`; design `docs/superpowers/specs/2026-10-26-dot-cai-thien-a-design.md` §6.
Dữ liệu: `pnpm learner:setup -- --admin <email> --learner <email>` (không `--plan`: người học gói Miễn phí). Trong app: tạo nhóm "IT", thêm `deploy` kèm câu
"We deploy the app every Friday." (ô "Câu bạn gặp" của tấm Thêm từ) và `computer` không kèm câu.

| # | Làm | Thấy | Mục design |
|---|---|---|---|
| 1 | Luyện tập → ⋯ Tùy chỉnh ở "Theo nhóm" | Thứ tự (Thêm tùy chọn): "Ngăn thấp", "Quá hạn lâu nhất", "Từ mới", "Lâu chưa luyện", "Sai nhiều nhất" (không còn chữ "trước") | §6.2 (C15) |
| 2 | Cùng hộp, gói Miễn phí | Dưới "Kiểu câu có AI" (khóa) có công tắc **"Điền từ vào câu bạn đã lưu"** bấm được + dòng "Chỉ dùng cho từ có câu bạn đã lưu. Không tốn lượt AI." | §6.4 (C3) |
| 3 | Bật công tắc đó, chọn nhóm IT, Bắt đầu | Phiên mở (không 403); có câu "Điền từ vào câu" với "We ___ the app every Friday."; câu này không có nút "Báo lỗi", không có bản dịch | A3-1, A3-6 |
| 4 | Chỉ bật công tắc (bỏ tick cả ba kiểu thường), nhóm chỉ có từ không kèm câu | Thông báo có sẵn "không có từ nào hợp với kiểu câu đã chọn" (409 `no-word-fits-types`) | A3-2 |
| 5 | Ở câu điền từ, bấm "Xem đáp án" **trước** khi gõ | Hiện "Chưa đúng" + đáp án (trước đây: lỗi 409); Lịch sử ghi câu đó là sai, câu trả lời "—" | §6.1 (PR #133) |
| 6 | Trả lời đúng một từ mới / đến hạn | Hai nút: [Cần ôn lại 1] · **[Đã biết Enter]**; ghi chú "Nhấn Enter là Đã biết: … lên một ngăn. Chưa chắc thì bấm Cần ôn lại."; Enter → sang câu tiếp, từ lên một ngăn | A16-1 |
| 7 | Trả lời đúng một từ chưa đến hạn | [Cần ôn lại 1] · **[Câu tiếp Enter]**; ghi chú "… chưa tới hạn ôn nên lịch ôn giữ nguyên." | A16-4 |
| 8 | Dùng gợi ý rồi trả lời đúng | [Cần ôn lại 1] · **[Câu tiếp Enter]**; ghi chú gợi ý như cũ | A16-4 (TH3) |
| 9 | Trả lời sai (hoặc "Xem đáp án") | **[Cần ôn lại Enter]** · [Câu tiếp]; ghi chú "Nhấn Enter để đưa … lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn." Enter → từ về ngăn 1, ưu tiên; bấm [Câu tiếp] → lịch giữ | A16-2, A16-3 |
| 10 | Ở màn kết quả, Tab tới nút phụ rồi Enter | Kích hoạt nút đang focus, không phải nút chính | A16-7 |
| 11 | Giữ Enter lâu ở màn kết quả | Chỉ một lần chấm + một lần sang câu | Review Focus 4 |
| 12 | Gói Pro: bật "Kiểu câu có AI" và công tắc mới | Ô "Điền từ" của AI tắt, mờ + dòng "Điền từ dùng câu bạn đã lưu thay cho câu AI."; tắt công tắc mới → ô trở lại như trước | A3-3 |
| 13 | Khung "Phím tắt trong phiên" ở trang Luyện tập | Enter: "Kiểm tra, rồi nút đậm" | review plan M7 |

Kiểm tự động (CI, job `web`): `e2e/app/cai-thien-a-practice.spec.ts` (công tắc mới ở gói Miễn phí và Pro, thân request có `cloze_source: 'own'`; axe và không cuộn
ngang × vi/en × sáng/tối × 1440/390), `e2e/app/m4.spec.ts` (TH1, TH4 với axe và không cuộn ngang); unit `practice-session.test.tsx` (A16-1…A16-7, giữ Enter),
`ai-questions.test.tsx` (Xem đáp án → TH4), `ai-toggle.test.tsx` (A3-1…A3-3); API unit `answers.service.spec.ts` (bỏ qua trước lần thử),
`ai-session-planner.service.spec.ts`, `sessions.service.spec.ts`, `sessions.ai.spec.ts` (A3-1…A3-4); smoke `smoke-buoc-7.mjs` AC11 (Miễn phí mở được phiên `own`).

Đã chạy thật 26/10/2026 (API + worker + Postgres + Redis + Mailpit, DB mới, gói Miễn phí, app người học ở chế độ dev): bước 2, 3, 4 (qua API), 5, 6, 7, 9, 13.
Chưa chạy thật: bước 8, 10, 11, 12 (có unit / e2e).
