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
