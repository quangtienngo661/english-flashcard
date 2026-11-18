# Production deploy runbook

Dùng cùng [hướng dẫn thao tác trên VPS](../../deploy/README.md) và [checklist trước launch](deploy-checklist.md). Runbook này ghi thứ tự thao tác, điều kiện dừng và các kiểm tra sau deploy. Đối chiếu cấu hình theo `origin/dev` tại `1bd8507f` ngày 16/11/2026.

## Trước khi deploy

- Xác nhận PR đã qua CI và commit cần deploy nằm trên `main`. Kiểm tra tab Actions để tránh chạy script tay trong lúc workflow đang deploy.
- Kiểm tra dung lượng VPS, trạng thái API và bản backup mới nhất. Xác nhận có thể truy cập bucket backup để phục hồi khi cần. Xem [backup và restore](../../deploy/README.md#backup-and-restore).
- Nếu thay đổi migration, giữ migration tương thích với phiên bản backend đang chạy để có thể rollback image. Ghi lại SHA đang chạy trước khi deploy.
- Với VPS mới hoặc khi đổi credential, làm theo [hướng dẫn cài VPS](../../deploy/README.md#prepare-the-server-once) và [mẫu cấu hình](../../deploy/env.production.example). Giữ credential trên VPS hoặc trong GitHub environment tương ứng.

## Deploy

1. Mở workflow **Deploy** trong GitHub Actions. Push vào `main` tự kích hoạt khi `DEPLOY_PAUSED` khác `true`. Chạy tay nhận SHA đầy đủ trên `main` và mặc định là HEAD của `main`.
2. Job API gửi SHA tới VPS qua SSH. `deploy.sh` build image, backup nếu đã có bản chạy, migrate, khởi động API và worker, rồi chờ readiness tối đa 120 giây.
3. Job web và admin cùng chờ job API thành công, sau đó build và deploy lên Cloudflare Workers tại cùng SHA. Nếu API không qua readiness, script thử khởi động lại bản trước khi có bản để quay về. Workflow báo lỗi và hai job frontend không chạy.

Nguồn triển khai: [workflow Deploy](../../.github/workflows/deploy-web.yml), [deploy.sh](../../deploy/scripts/deploy.sh), [Continuous deployment](../../deploy/README.md#continuous-deployment).

## Sau deploy

- So sánh SHA trong workflow với `/srv/wordmet/state/current`. Kiểm tra API readiness và trạng thái container API, worker, Postgres, Redis.
- Mở landing, đăng nhập learner và admin. Nếu deploy đụng Identity, thử cả Google sign-in. Nếu đụng content hoặc TTS, phát một file UK/US từ một sense đã publish.
- Nếu deploy đụng billing, kiểm tra trạng thái đơn và sự kiện webhook theo [checklist payOS](deploy-checklist.md). Kiểm tra lỗi bất thường trong log và xem backup gần nhất.
- Kiểm tra cả ba job deploy. Nếu chỉ một frontend lỗi, API và frontend còn lại có thể đã đổi phiên bản. Ghi lại thành phần và SHA thực tế trước khi xử lý.

## Rollback và theo dõi

- Nếu cần rollback, kiểm tra Actions đã kết thúc. Dùng `rollback.sh <sha>` cho API và worker hoặc rollback Worker tương ứng trên Cloudflare. Xem [các lệnh rollback](../../deploy/README.md#roll-back). Script rollback API dùng image đã có và giữ schema hiện tại.
- Nếu phải restore, làm theo quy trình vào database rỗng, migrate và xử lý lại các yêu cầu xóa tài khoản phát sinh sau thời điểm backup. Không phục hồi đè lên database đang chạy.
- Lịch dự kiến theo giờ Việt Nam gồm backup lúc 03:00, báo cáo lúc 08:00 và cảnh báo mỗi 5 phút. Worker chạy bảo trì mỗi giờ và cron chạy thêm ở phút 15 để giữ lịch cố định khi worker restart. Xem [cron và monitoring](../../deploy/README.md#monitoring-and-cron-m7).
- Ghi kết quả thực tế của từng lần deploy theo SHA, gồm readiness, smoke test, backup và bất kỳ rollback nào. Checklist trong tài liệu này mô tả thao tác cần xác nhận mỗi lần chạy.
