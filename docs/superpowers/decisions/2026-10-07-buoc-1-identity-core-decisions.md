# Decisions — Bước 1: Identity core

Ngày: 07/10/2026. Đi kèm design doc
[`../specs/2026-10-07-buoc-1-identity-core-design.md`](../specs/2026-10-07-buoc-1-identity-core-design.md).
File này gom **mọi quyết định đã chốt** trong lúc brainstorm (06–07/10/2026), mỗi quyết định có các phương án đã cân
nhắc, trade-off của từng phương án, phương án được chọn và lý do. Design doc là nơi mô tả *cách làm*; file này trả lời
*tại sao chọn vậy và đã bỏ gì*.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat; "Duyệt cùng design" = trợ lý
đề xuất trong lúc trình bày design, chủ dự án đồng ý cả phần chứa nó.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Phạm vi Bước 1 | Lõi + đổi mật khẩu + quên mật khẩu | Chủ dự án |
| D2 | Gửi thư | Cổng `Mailer` + bản giả + SMTP cấu hình được | Chủ dự án |
| D3 | Ranh giới module | Quy ước, chưa có tool | Chủ dự án |
| D4 | Cookie cho web | Làm ngay ở Bước 1 | Chủ dự án |
| D5 | Cách dựng xác thực | Guard tự viết + `jose` | Chủ dự án |
| D6 | Phân quyền nhân sự | Vai trò → danh sách quyền; `admin` + `editor`; cấp qua endpoint | Chủ dự án |
| D7 | Endpoint gửi OTP | Một endpoint chung có `purpose` | Chủ dự án |
| D8 | Sau khi đăng ký | Đăng nhập luôn | Chủ dự án |
| D9 | Commit | Commit local bình thường trên nhánh `feat/*` | Chủ dự án |
| D10 | Kiểm dữ liệu đầu vào | `zod` | Chủ dự án |
| D11 | Cách đếm rate limit | Khung cố định cho mọi luật | Chủ dự án |
| D12 | Logout xác định phiên bằng | Refresh token | Chủ dự án |
| D13 | Deploy web và API | Cùng tên miền gốc | Chủ dự án |
| D14 | `verify-email` khi email đã xác minh | 409 `email-already-verified` | Chủ dự án |
| D15 | Body request quá lớn | Giữ 100 KB, trả 413 | Chủ dự án |

## D1 — Phạm vi Bước 1

Bối cảnh: HANDOFF §2 đặt quên mật khẩu ở Bước 8, nhưng mốc pilot (có người dùng thật) là Bước 3.

| Phương án | Trade-off |
|---|---|
| Đúng HANDOFF (không đổi/quên mật khẩu) | Bước 1 nhỏ nhất, đúng thứ tự đã chốt. Người dùng pilot quên mật khẩu thì kẹt, owner phải sửa DB tay |
| + Chỉ đổi mật khẩu (IR14) | Thêm ít việc. Quên mật khẩu vẫn phải xử lý tay đến Bước 8 |
| ✅ + Đổi và quên mật khẩu (IR14, IR7 phần mật khẩu) | Bước 1 to hơn khoảng 2 endpoint; lệch thứ tự HANDOFF ở một điểm. Đổi lại pilot tự khôi phục được; OTP, Mailer, thu hồi phiên vốn đã phải làm ở Bước 1 nên phần thêm là nhỏ |

## D2 — Gửi thư

Bối cảnh: OTP phải gửi qua email; Gmail cá nhân hay Workspace chưa chốt, giới hạn gửi của Gmail cá nhân chưa có nguồn
Google (R29).

| Phương án | Trade-off |
|---|---|
| ✅ Cổng `Mailer` + `FakeMailer` + `SmtpMailer` cấu hình bằng `SMTP_*`, kèm ngân sách thư | Gửi thư thật được ngay mà chưa phải chọn nhà cung cấp; test không gửi thư thật. Thêm việc cấu hình SMTP và ngân sách ở Bước 1 |
| Chỉ cổng + bản giả | Bước 1 nhỏ hơn. Phần gửi thư thật dồn về trước pilot và chưa kiểm chứng được |
| Chốt luôn Gmail cá nhân | Thử thư thật ngay. Trần gửi chưa có nguồn chính thức; khóa chặt vào một nhà cung cấp quá sớm |

## D3 — Ranh giới giữa các module

Bối cảnh: Prisma cho chia schema nhiều file (GA từ v6.7) nhưng sinh **một** `PrismaClient` chung, nên không tự chặn
được module A truy vấn bảng của module B.

| Phương án | Trade-off |
|---|---|
| ✅ Quy ước: mỗi module một file `.prisma`, chỉ module đó truy vấn bảng của nó, gọi chéo qua service, không relation Prisma xuyên module | Rẻ, đủ cho solo dev. Vi phạm không tự bị bắt, chỉ kiểm khi review |
| Quy ước + test quét mã nguồn | Bắt vi phạm tự động. Phải viết và bảo trì test đó |
| Không tách | Đơn giản nhất. Trái bảng "Bản đồ ghi dữ liệu" đã chốt ở system-spec; tách service sau này phải dọn dẹp |

## D4 — Cookie cho web

| Phương án | Trade-off |
|---|---|
| ✅ Làm ngay ở Bước 1 | Phần bảo mật (CSRF, `SameSite`, xoay vòng) được thiết kế và test cùng lúc; Bước 3 (mốc pilot) không phải mở lại Identity. Chưa thử được với trình duyệt thật đến Bước 3 |
| Để Bước 3 | Bước 1 nhỏ hơn và test được với web thật. Bước 3 vốn đã nặng phải quay lại sửa phần bảo mật của Identity |

## D5 — Cách dựng xác thực

Bối cảnh: phần khó (xoay vòng refresh token, ân hạn 10 giây, khóa đăng nhập, OTP) hướng nào cũng phải tự viết.

| Phương án | Trade-off |
|---|---|
| ✅ A. Guard tự viết + `jose` | 1 thư viện; `jose` dùng lại ở Bước 8 để xác minh ID token Google (JWKS); hỗ trợ trực tiếp nhiều khóa có `kid`. Không theo ví dụ docs NestJS; guard tự viết phải có test cho từng loại token xấu |
| B. Passport (`@nestjs/passport`, `passport-jwt`, `passport-local`) | Đúng docs NestJS, quen thuộc. Thêm 4 gói; strategy Google chủ yếu cho web chuyển hướng, mobile vẫn phải tự xác minh |
| C. `@nestjs/jwt` + guard | Gần A. Bước 8 phải thêm thư viện thứ hai để xác minh token Google |

## D6 — Phân quyền nhân sự

Bối cảnh: spec gốc chỉ có một owner, không màn quản lý admin (K1, N1, IR17). Chủ dự án muốn nhiều người quản lý với
quyền khác nhau, và cấp quyền trên web. Quyết định đi qua ba vòng:

**Vòng 1 — cấp quyền admin bằng gì:**

| Phương án | Trade-off |
|---|---|
| Lệnh CLI ghi vào DB | An toàn, đúng spec. Phải vào server mới cấp được |
| Biến môi trường `ADMIN_EMAILS` | Đơn giản. Rủi ro ai đó đăng ký trước bằng email của owner; đổi admin phải deploy lại |
| ✅ CLI cho admin đầu tiên + endpoint cấp/thu (giao diện ở Bước 3) | Cấp được trên web như chủ dự án muốn. Lệch spec (IR17, K1, N1, Pipeline) — phải sửa spec |

**Vòng 2 — mô hình quyền:**

| Phương án | Trade-off |
|---|---|
| ✅ Vai trò → danh sách quyền viết trong code | Đổi việc một vai trò được làm chỉ sửa một bảng, không đụng endpoint; hai người cùng cấp nhưng khác việc vẫn diễn đạt được. Thêm vai trò mới phải sửa code và deploy |
| Bậc thang cấp độ | Đơn giản nhất. Không diễn đạt được hai người cùng cấp nhưng khác việc |
| Vai trò sửa trên giao diện, lưu DB | Linh hoạt nhất. Nhiều việc hơn hẳn (bảng, API, giao diện), dư cho V1 |

**Vòng 3 — tên và số vai trò:** `owner`/`admin`/`editor` → bỏ `editor` thành `owner`/`admin` → chốt **`admin`** (cao
nhất, có `roles.manage` và `ai.settings`) + **`editor`** (mọi việc vận hành nội dung, không phân quyền, không đụng chi
phí AI). Người học không có vai trò; quyền của họ đến từ quyền sở hữu (SR9) và Entitlements (Bước 5). Luật kèm theo:
chỉ cấp cho email đã xác minh; không bao giờ còn 0 admin.

## D7 — Endpoint gửi OTP

| Phương án | Trade-off |
|---|---|
| ✅ Một endpoint `POST /v1/auth/otp` có `purpose` | Dùng được bất cứ lúc nào (vd xác minh email vài ngày sau từ màn cài đặt); thêm mục đích mới chỉ thêm một giá trị. Route phải `@Public` và tự đòi user ở nhánh `verify_email` |
| Endpoint "gửi lại mã" riêng gắn với luồng đăng ký | Đơn giản hơn một chút. Không dùng lại được cho quên mật khẩu và cho xác minh muộn |

## D8 — Sau khi đăng ký

| Phương án | Trade-off |
|---|---|
| ✅ Đăng nhập luôn (trả token) | Đúng K7 (chưa xác minh vẫn dùng được Free); ít bước cho người dùng. Gửi lại mã xác minh phải qua endpoint OTP khi đã đăng nhập |
| Bắt đăng nhập riêng sau khi đăng ký | Tách bạch hơn. Thêm một bước thừa, không có lợi ích bảo mật vì K7 đã cho dùng khi chưa xác minh |

## D9 — Commit

| Phương án | Trade-off |
|---|---|
| ✅ Commit local bình thường trên nhánh `feat/*`, push khi được yêu cầu | Lịch sử rõ, không phải hỏi mỗi lần commit. Push vẫn là quyết định riêng |
| Hỏi trước mỗi commit | An toàn tuyệt đối. Ma sát không cần thiết khi chưa có remote |

Ghi chú 07/10/2026: đã có remote GitHub `english-flashcard`; Bước 0 và design Bước 1 vào `main` qua PR #1, #2.

## D10 — Thư viện kiểm dữ liệu đầu vào

Bối cảnh: Bước 0 chưa có; quyết định này áp dụng cho mọi module về sau.

| Phương án | Trade-off |
|---|---|
| ✅ `zod` + `StandardSchemaValidationPipe` | Một schema vừa kiểm lúc chạy vừa sinh type; hợp ESM; pipe có sẵn trong `@nestjs/common` 12.1.2 (đã kiểm). Không phải cách docs NestJS gọi là best practice mặc định |
| `class-validator` + `ValidationPipe` | Đúng docs NestJS, nhiều ví dụ. Cần thêm `class-transformer`, phụ thuộc metadata decorator, type phải viết tay tách khỏi luật kiểm |

## D11 — Cách đếm rate limit

Bối cảnh: Bước 0 đếm theo khung giờ cố định; spec I6 viết "chờ 60 giây kể từ lần trước".

| Phương án | Trade-off |
|---|---|
| ✅ Khung cố định cho mọi luật | Dùng lại cơ chế Bước 0 đã test atomic. Sát ranh giới khung, hai request có thể cách nhau vài giây; "5/giờ" có thể thành 10 quanh mốc giờ — vẫn bị ngân sách thư và giới hạn IP chặn. Spec I6 sửa câu chữ |
| Chờ đúng 60 giây riêng cho OTP | Đúng câu chữ spec. Thêm một bảng và một câu SQL viết tay |
| Khung trượt cho mọi luật | Chính xác nhất. Viết lại cơ chế đếm của Bước 0 và test lại tính atomic |

## D12 — Logout xác định phiên bằng

| Phương án | Trade-off |
|---|---|
| ✅ Refresh token (body cho mobile, cookie + header CSRF cho web) | Logout chạy được cả khi access token đã hết hạn (app mở lại sau một ngày); đúng cách OAuth thu hồi phiên. Cookie phải phủ `Path=/v1/auth` |
| Access token (`sid`) | Đơn giản hơn một chút. Access token hết hạn thì phải gia hạn trước, mạng chập chờn thì phiên vẫn sống trên server |

## D13 — Deploy web và API

Bối cảnh: cookie `SameSite=Strict` chỉ được gửi khi web và API cùng "site" (cùng tên miền gốc).

| Phương án | Trade-off |
|---|---|
| ✅ Cùng tên miền gốc (`app.<miền>`, `api.<miền>`) | Giữ `SameSite=Strict`, an toàn nhất. Phải mua tên miền; là điều kiện bắt buộc khi deploy |
| Chưa biết, để sau | Không cam kết sớm. Rủi ro đến Bước 3 mới phát hiện web không gia hạn được phiên |
| Next.js chuyển tiếp request sang API | Chạy với tên miền miễn phí của hosting. Thêm một chặng trung gian, phải cấu hình ở Bước 3 |

## D14 — `verify-email` khi email đã xác minh

Bối cảnh: review của Codex `gpt-6-astra` (07/10) chỉ ra B1#7 (gửi lại mã đã dùng → 400) và B1E22 (đã xác minh → 200)
mâu thuẫn: sau lần xác minh đầu, lần gọi thứ hai rơi vào cả hai luật. Spec gốc ghi "nhập đúng OTP hai lần: lần hai báo
mã đã dùng"; vế "200" do design tự thêm. Lần gọi thứ hai xảy ra thật khi mất phản hồi và app tự gửi lại.

| Phương án | Trade-off |
|---|---|
| A. Trả 200 `{ email_verified: true }`, không kiểm mã | Gửi lại an toàn, client đơn giản nhất. Lệch câu "báo mã đã dùng" của spec |
| B. Luôn kiểm mã, mã đã dùng → 400 `invalid-otp` | Đúng câu chữ spec. Mất phản hồi lần đầu thì app báo "mã sai" dù đã xác minh; lần sai vô nghĩa vẫn bị tính vào trần 20 lần |
| ✅ C. Trả 409 `email-already-verified`, không kiểm mã | Nói rõ sự thật "email đã xác minh"; đúng tinh thần "báo lại" của spec; app nhận ra và coi là thành công. App phải xử lý riêng mã 409 này |

## D15 — Body request quá lớn

Bối cảnh: B1E2 đòi mật khẩu 1 MB ở đăng nhập trả 401, nhưng Express mặc định chặn body > 100 KB trước khi tới code.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ 100 KB, body lớn hơn trả 413 `payload-too-large` | Chặn trước khi đọc email nên không lộ gì; server ít tốn tài nguyên. B1E2 sửa câu chữ; mật khẩu 129 ký tự tới 100 KB vẫn trả 401 |
| Nâng giới hạn lên ~2 MB | Giữ đúng câu chữ B1E2. Mọi endpoint nhận body to gấp 20 lần, kẻ xấu làm server tốn tài nguyên mà không được lợi gì |

## Đề xuất kỹ thuật duyệt cùng design (không hỏi riêng)

| Chủ đề | Chọn | Phương án bỏ | Lý do |
|---|---|---|---|
| Băm mật khẩu | Gói `argon2` | `crypto.argon2` có sẵn trong Node 24.11; `@node-rs/argon2` | `crypto.argon2` trả hash thô, phải tự viết lớp chuỗi PHC và so sánh — tự viết code mật mã không đáng; `argon2` có `verify`, `needsRehash` |
| Thuật toán ký access token | HS256 + `kid` | RS256/EdDSA | Chỉ một server tự ký tự kiểm, không ai khác cần khóa công khai |
| Chống dò email qua thời gian phản hồi | Vẫn chạy Argon2 trên hash giả khi email không tồn tại | Trả lỗi ngay | Trả ngay thì chênh ~44 ms, đủ để biết email nào có tài khoản (I10) |
| Gửi thư | Sau khi trả lời request | Gửi đồng bộ trong request (spec) | Chờ SMTP thì luồng quên mật khẩu lộ email có tồn tại qua thời gian phản hồi. Đổi lại: server sập đúng lúc đó thì mất thư |
| Ân hạn 10 giây khi gia hạn | Chỉ giữ refresh token kế tiếp (mã hóa) | Giữ cả cặp token (spec) | Access token ký mới được, không cần lưu |
| Xoay vòng song song | Compare-and-set bằng `updateMany` | Khóa dòng `FOR UPDATE` | Prisma không có `FOR UPDATE`; compare-and-set đủ dưới READ COMMITTED, không cần raw SQL |
| Kiểm múi giờ | `Intl.DateTimeFormat` | `Intl.supportedValuesOf` | Đã chạy thử: danh sách không có `Asia/Ho_Chi_Minh` nên sẽ từ chối nhầm người dùng Việt Nam |
| Idempotency cho Identity | Không dùng `@Idempotent()` | Dùng như Bước 0 | Endpoint `@Public` không có user để khóa key; cơ chế Bước 0 lưu nguyên phản hồi chứa token. Lệch SR8 |
| Đổi mật khẩu sai | 400 `invalid-current-password` | 401 | Client hiểu 401 là phiên hết hạn và sẽ tự đăng xuất người dùng |
