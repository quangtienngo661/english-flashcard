# Giao diện mới: hướng dẫn đo khung hình trên điện thoại

Việc của chủ dự án, trước khi gộp M9 vào `dev` (design §8.1, §8.5; QM9-7). Đo trên máy thật vì DevTools giả lập CPU chậm không thay được GPU và trình duyệt của điện thoại.

## Đo gì

Hai thao tác, mỗi thao tác trên một Android tầm thấp và một Safari iOS:

1. **Học:** một phiên 20 thẻ (chồng thẻ, kéo và nút "Cần ôn lại", "Đã biết").
2. **Nhóm:** đổi nhóm 6 lần ở băng chuyền.

Với mỗi lần đo ghi hai số: **khung hình trung vị** (fps) và **khung chậm nhất** (ms). Ghi vào bảng ở cuối file.

## Chọn cách A hoặc B

Cả hai cách còn mở, chủ dự án chọn. Mỗi cách có giới hạn riêng.

| | Cách A: chung Wi-Fi | Cách B: Android qua USB |
|---|---|---|
| Máy đo được | Android và iPhone | Chỉ Android |
| Bản web | `next dev` (dev mode), khung hình thấp hơn production | Bản production của `pnpm bootstrap` |
| Performance panel | Không có sẵn trên điện thoại | Có, trong DevTools của Chrome trên PC |
| Cần chỉnh | CORS, firewall Windows | Bật USB debugging trên điện thoại |
| Rủi ro chưa kiểm | Cookie đăng nhập có thể không giữ (xem dưới) | Cookie `Secure` trên `localhost` (xem dưới) |

## Cách A: chung Wi-Fi

Điện thoại và PC cùng một mạng Wi-Fi. Thay `<IP>` bằng IP của PC (`ipconfig`, dòng IPv4 của mạng Wi-Fi).

Điều kiện có trước (máy mới): Postgres, Redis, Mailpit đang chạy (`pnpm bootstrap infra` hoặc `docker compose up -d`); file môi trường của API đã tạo từ file mẫu (mục Local setup trong `CLAUDE.md`); `pnpm db:setup` trong `apps/api` đã chạy. Tài khoản đăng nhập phải có ít nhất 20 thẻ để học: `pnpm bootstrap seed` nạp nội dung mẫu và một người học (xem `docs/deliveries/docker-bootstrap.md`).

1. Thêm `http://<IP>:3001` vào `CORS_ORIGINS` trong `apps/api/.env`. Giá trị mặc định ở `apps/api/.env.example:50` chỉ có các địa chỉ `localhost`.
2. API: trong `apps/api`, chạy `pnpm build` rồi `pnpm run:dev`. API nghe trên mọi giao diện mạng, cổng 3000 (`apps/api/src/main.ts:18` gọi `listen` không chỉ host).
3. Web: trong `apps/web`, chạy

   ```powershell
   $env:NEXT_PUBLIC_API_BASE_URL = "http://<IP>:3000"
   $env:NEXT_PUBLIC_AUDIO_BASE_URL = "http://<IP>:3000/v1/dev/audio"
   pnpm dev:app
   ```

   Không thêm `-H 0.0.0.0`. Trên Windows, `pnpm dev:app` bỏ mọi tham số thêm (`apps/web/scripts/dev-app.mjs`: nhánh `win32` chỉ chạy `scripts/cf-docker.mjs --dev-app`). Container đó đã chạy `next dev -H 0.0.0.0 -p 3001` và mở cổng bằng `-p 3001:3001` (`apps/web/scripts/cf-docker.mjs`), và đã chuyển `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_AUDIO_BASE_URL` vào container. Không đặt biến âm thanh thì nó mặc định `http://localhost:3000/v1/dev/audio` (`cf-docker.mjs:47`), trên điện thoại là chính điện thoại, nên âm thanh ở Học không phát. Trên Linux hoặc macOS thì `pnpm dev:app -H 0.0.0.0` mới tới được `next dev`.
4. Điện thoại mở `http://<IP>:3001/vi/app`.

Giới hạn:

- Web chạy dev mode, nên khung hình ra thấp hơn production. Đọc số như mức sàn.
- Windows firewall phải cho phép inbound cổng 3000 và 3001. Đây là cài đặt của chủ dự án, không tự đổi.
- `ASSUMPTION`: cookie đăng nhập là `Secure` (`apps/api/src/identity/sessions/session-transport.ts:14`, `secure: true`), nên qua `http://<IP>` trình duyệt có thể không giữ. Kiểm trước: đăng nhập, tải lại trang. Nếu bị đăng xuất, đo bằng cách B.
- `ASSUMPTION`: container web gọi được `http://<IP>:3000` khi render phía server. Chưa chạy thử.
- Không dùng được cho iOS qua Performance panel (xem phần iOS).

## Cách B: Android qua USB

1. Chạy cả stack bản production: `pnpm bootstrap` ở gốc repo (xem `docs/deliveries/docker-bootstrap.md`; lệnh tự dựng Postgres, Redis, Mailpit). Tài khoản đăng nhập phải có ít nhất 20 thẻ để học: chạy thêm `pnpm bootstrap seed`. API ở cổng 3000, web ở 3001, đều bind `127.0.0.1` (`docker-compose.yml`), nên không có đường nào từ Wi-Fi; USB forwarding đi qua `localhost` của PC nên vẫn tới được.
2. Điện thoại: bật Developer options và USB debugging, cắm cáp vào PC.
3. Chrome trên PC mở `chrome://inspect`, mục Devices → **Port forwarding**: thêm `3000` → `localhost:3000` và `3001` → `localhost:3001`, bật "Enable port forwarding".
4. Chrome trên điện thoại mở `http://localhost:3001/vi/app`.
5. Trong `chrome://inspect`, bấm **inspect** ở tab đó, mở **Performance**, bấm ghi, làm một thao tác (Học 20 thẻ hoặc 6 lần đổi nhóm), dừng. Đọc số khung hình ở biểu đồ **Frames** và khung dài nhất.

Giới hạn:

- Chỉ Android.
- `ASSUMPTION`: cookie `Secure` được Chrome nhận trên `http://localhost` vì `localhost` được coi là nguồn an toàn. Kiểm cùng cách: đăng nhập, tải lại.
- Không đổi cài đặt nào của repo: các địa chỉ `localhost` đã nằm trong `CORS_ORIGINS` của `docker-compose.yml`.

## iOS

`ASSUMPTION`: Web Inspector của Safari cần một máy Mac nối với iPhone. Không có Mac thì ghi "chưa đo" cho dòng iOS, không đoán số.

## Bảng ghi kết quả

| Máy | Trình duyệt | Màn | Khung hình trung vị (fps) | Khung chậm nhất (ms) | Ghi chú |
|---|---|---|---|---|---|
|  |  | Học, 20 thẻ |  |  |  |
|  |  | Nhóm, 6 lần đổi |  |  |  |
|  | Safari iOS | Học, 20 thẻ |  |  | chưa đo nếu không có Mac |
|  | Safari iOS | Nhóm, 6 lần đổi |  |  | chưa đo nếu không có Mac |

Ghi thêm vào cột "Ghi chú": cách đo (A hoặc B), dev hay production, có bật chế độ tiết kiệm pin không.
