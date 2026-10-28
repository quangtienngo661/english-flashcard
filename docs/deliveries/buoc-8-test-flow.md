# Bước 8 — luồng kiểm tay của chủ dự án (29/10/2026)

Dành cho chủ dự án tự kiểm sau khi các PR của Bước 8 đã vào `dev`. Có hai phần: **A** chạy thử không cần Google thật (dùng "Google giả"),
**B** đăng nhập bằng Google thật (hai lần, D32). Kết quả ghi vào cuối `docs/deliveries/buoc-8.md`, mục "Kết quả kiểm tay".

Ảnh chụp màn hình Google Cloud **không có** trong tài liệu này: Claude không đăng nhập được Google Cloud của chủ dự án. Các bước dưới ghi đúng tên menu
theo tài liệu của Google tới ngày 28/10/2026; nếu giao diện Google đổi, làm theo đúng ý của từng bước.

## 0. Chuẩn bị chung (PowerShell, từ thư mục gốc repo)

```powershell
docker compose up -d
Set-Location apps/api
pnpm db:setup
```

`apps/api/.env` cần thêm (xem `.env.example`): `TERMS_VERSION`, `OAUTH_COOKIE_KEY` (sinh bằng `node scripts/gen-secret.mjs`), `GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback`.
Chạy API, worker, admin và web như ở `docs/deliveries/docker-bootstrap.md` (`pnpm bootstrap`) hoặc từng cái như `CLAUDE.md` mục "Local setup".
Thư (đăng ký, "đã liên kết Google", "tài khoản đã được xóa") nằm ở Mailpit: <http://localhost:8025>.

## A. Chạy thử bằng Google giả (không cần Google Cloud)

Thêm vào `apps/api/.env`: `GOOGLE_FAKE_ENABLED=true` (API từ chối khởi động nếu bật cùng `BILLING_PRODUCTION`). Khởi động lại API.
Mẹo: nên mở web bằng `http://localhost:3001` và để API ở `http://localhost:3000` như bình thường; trang "Google giả" tự hiện form chọn tài khoản.

| # | Làm | Thấy |
|---|---|---|
| A1 | Mở `/vi/app/login`, bấm **Tiếp tục với Google** | Trang "Google giả" với ô email, sub, tên; điền email mới (ví dụ `thu@example.com`) rồi gửi |
| A2 | Màn **Hoàn tất đăng ký** | Hiện email; nhập ngày sinh (thử năm cách đây 12 năm → báo lỗi dưới 13 tuổi, không tạo tài khoản), tích điều khoản, bấm hoàn tất → vào app |
| A3 | `/vi/app/settings` | Dòng **Đăng nhập bằng: Google**; không có "đổi mật khẩu", có **Đặt mật khẩu** |
| A4 | Đăng xuất, đăng ký tài khoản mật khẩu với email `lan@example.com`, xác nhận bằng mã trong Mailpit, đăng xuất. Bấm **Tiếp tục với Google** và dùng đúng email đó | Vào thẳng app (Google đã được liên kết với tài khoản cũ); Mailpit có thư "Đã liên kết Google"; Cài đặt ghi **Mật khẩu · Google** |
| A5 | Bấm **Tiếp tục với Google** với cùng email nhưng ô *sub* khác | Quay về login với thông báo lỗi Google (không liên kết lần hai) |
| A6 | Tài khoản Lan: Cài đặt → **Xóa tài khoản** | Trang xóa: tích hiểu, gõ lại email, nhập mật khẩu → bấm xóa → trang **Đã xóa**; Mailpit có thư "đã được xóa"; đăng nhập lại báo sai thông tin |
| A7 | Tài khoản chỉ có Google (A2): Cài đặt → Xóa tài khoản | Nút xóa yêu cầu **Xác nhận bằng Google**; làm theo (đúng tài khoản Google) → xóa được; thử tài khoản Google khác → báo "Đây không phải tài khoản Google của bạn" |
| A8 | Tài khoản có gói đang tự gia hạn (cấp bằng nhà cung cấp giả: `pnpm billing:fake-event` trong `apps/api`, xem `scripts/billing-fake-event.mjs`) → Xóa tài khoản | Báo **phải hủy gia hạn trước**; vào trang **Gói** bấm **Hủy gói** → nhãn đổi thành "đã hủy, hết hạn ngày …" → xóa được |
| A9 | Admin (`pnpm admin:grant <email>`), vào `apps/admin` → **Người dùng** → mở một người học → **Xóa tài khoản** | Hộp thoại nêu tên, nút xác nhận chỉ bật khi gõ đúng email; người học có gói đang gia hạn thì hộp thoại ghi "Gói tự gia hạn sẽ được tắt"; sau khi xóa, danh sách không còn người đó |
| A10 | Admin tự xóa mình / xóa admin cuối cùng | Nút không hiện cho chính mình; admin cuối cùng bị chặn (`last-admin`) |
| A11 | Admin → **Cài đặt hệ thống** | Có tab **Tài khoản** (số ngày dọn tài khoản chưa xác nhận) và dòng "Giữ hồ sơ thanh toán sau khi xóa tài khoản … năm" ở tab Quyền lợi |
| A12 | Đăng nhập admin bằng Google (đăng ký Google bằng email của admin rồi vào admin) | Admin báo cần đăng nhập bằng mật khẩu (`password-login-required`) và đăng xuất phiên Google |

Dọn sau khi thử: xóa các tài khoản thử bằng chính luồng A6/A9.

## B. Google thật (D32)

### B1. Việc trên Google Cloud (một lần, không tốn tiền; D4, design §5.1)

1. Vào <https://console.cloud.google.com/>, tạo **project** mới (tên tùy ý, ví dụ `wordmet-dev`).
2. Menu **APIs & Services → OAuth consent screen** (hoặc **Google Auth Platform**): chọn **External**, trạng thái **Testing**. Điền tên app, email hỗ trợ, email liên hệ.
3. Mục **Scopes** (Data Access): thêm `openid`, `email`, `profile`.
4. Mục **Audience → Test users**: thêm Gmail của anh/chị (và Gmail thử khác nếu muốn; tối đa 100). Chỉ các Gmail này đăng nhập được khi app còn ở Testing.
5. **Clients → Create client**: loại **Web application**; ở **Authorized redirect URIs** thêm đúng `http://localhost:3000/v1/auth/google/callback` (từng ký tự, không dấu `/` cuối).
6. Lưu; chép **Client ID** và **Client secret** vào `apps/api/.env`:
   ```
   GOOGLE_CLIENT_ID=…
   GOOGLE_CLIENT_SECRET=…
   GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback
   ```
   và **bỏ** `GOOGLE_FAKE_ENABLED` (khi cả bản giả và client id cùng có, bản giả thắng). Không đưa secret vào chat hay commit.
7. Khởi động lại API.

### B2. Lần 1 (ngay sau M3) — kiểm hai giả định kỹ thuật

Trước khi thử, tạo sẵn một tài khoản đã xác nhận cho đúng Gmail của anh/chị (để callback đi đường "tài khoản đã có", đường cần chứng minh; không mật khẩu, không dữ liệu học):

```powershell
Set-Location apps/api
$env:DATABASE_URL = "postgresql://dev:dev@localhost:5434/<tên database>"
node scripts/google-round1-account.mjs you@gmail.com
```

1. Mở trình duyệt, vào `http://localhost:3000/v1/auth/google/start?intent=login&locale=vi&next=/vi/app`.
2. Chọn đúng Gmail đã thêm ở bước B1.4, bấm tiếp tục khi Google báo "app chưa được xác minh" (bình thường ở chế độ Testing).
3. Kết quả đúng: trình duyệt về `http://localhost:3001/vi/app…` (hoặc màn hoàn tất đăng ký nếu Gmail đó chưa có tài khoản).
4. Mở DevTools → Application → Cookies → `localhost:3000`: có cookie **`refresh_token`** (SameSite=Strict, HttpOnly).
5. Trong tab Console của trang web: `fetch('http://localhost:3000/v1/auth/refresh',{method:'POST',credentials:'include',headers:{'X-CSRF-Protection':'1'}}).then(r=>r.status)` → **200**.
6. Ghi lại: (a) cookie `refresh_token` còn sau khi Google chuyển về? (b) `/v1/auth/refresh` ngay sau đó → 200? (c) Google không báo lỗi PKCE?

Đây là hai `ASSUMPTION` của design §19: *cookie qua chuyển trang từ Google* và *PKCE S256 với client Web có secret*. Nếu (a) hoặc (b) sai → dừng và áp phương án dự phòng
của §19 (mã dùng một lần 60 giây) vào M3 trước khi dựa vào nút Google ở web. Nếu (c) sai → báo lại để bỏ PKCE khỏi lời gọi tới Google.

### B3. Lần 2 (cuối Bước 8, B8A8) — cả luồng bằng Google thật

1. Bấm **Tiếp tục với Google** ở `/vi/app/login` bằng Gmail test; hoàn tất đăng ký nếu là lần đầu.
2. Cài đặt: dòng **Đăng nhập bằng: Google**.
3. Xóa tài khoản: **Xác nhận bằng Google** (chọn đúng Gmail) → xóa → trang **Đã xóa** → Mailpit có thư.
4. Thử lại nút Google cho cùng Gmail: ra màn hoàn tất đăng ký (tài khoản đã xóa hẳn, tạo mới được).

## C. Smoke tự động (không cần anh/chị làm)

`docs/deliveries/buoc-8-smoke-output.txt` là kết quả hai lần `pnpm smoke:buoc-8` (DB mới mỗi lần; 19/19 bước mỗi lần). Chạy lại: xem đầu `apps/api/scripts/smoke-buoc-8.mjs`.
