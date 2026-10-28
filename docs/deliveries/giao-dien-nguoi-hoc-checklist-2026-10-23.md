# Danh sách kiểm app người học trên `dev` (23/10/2026, sau M4b)

Máy đang chạy: `dev` @ `255e2ee` (M1–M4b đã merge). API + worker ở http://localhost:3000 (DB thử `english_learning_learner_ui`, đã chạy 2
migration mới của M4/M4b). App người học ở http://localhost:3001/vi/app. Mailpit ở http://localhost:8025.

Tài khoản thử: `lan.m2c@example.com` (có nhóm "Kinh doanh · B1", 113 từ), mật khẩu thử như các lần trước. Admin: `admin.m1@example.com`.

Cột **Tự kiểm** là kết quả script đăng nhập rồi gọi API và mở từng trang (23/10). "200" chỉ nghĩa là chạy được, không thay cho việc bạn bấm thử.
Bước bấm thử chi tiết của từng mốc: [`giao-dien-nguoi-hoc-test-flow.md`](giao-dien-nguoi-hoc-test-flow.md) (mục M1, M2, M3, M4, M4b).

## 1. Trang (UI)

| # | Trang | Đường dẫn | Tự kiểm | Bạn kiểm gì |
|---|---|---|---|---|
| 1 | Đăng nhập | `/vi/app/login` | ✅ mở được | Đăng nhập, sai mật khẩu, "Quên mật khẩu?" |
| 2 | Đăng ký | `/vi/app/register` | ✅ | Ngày sinh dưới 13 tuổi bị chặn; mã 6 số ở Mailpit |
| 3 | Quên / đặt lại mật khẩu | `/vi/app/forgot-password`, `/vi/app/reset-password` | ✅ | Mã ở Mailpit, đặt mật khẩu mới |
| 4 | Nhập mã, chọn ngôn ngữ | `/vi/app/verify-email`, `/vi/app/welcome` | ✅ | |
| 5 | Hôm nay | `/vi/app` | ✅ | Khối "Ôn tiếp", nhóm, gợi ý chủ đề, ô "Thêm từ vừa gặp" |
| 6 | Danh sách nhóm | `/vi/app/groups` | ✅ | Tạo / đổi tên / xóa nhóm, ô lọc |
| 7 | Trang nhóm | `/vi/app/group?id=…` (bấm tên nhóm) | ✅ | Biểu đồ ngăn, lọc từ, bỏ từ, xem trước thẻ |
| 8 | Từ lâu chưa ôn | `/vi/app/group/backlog?id=…` | ✅ (đang trống) | Cần từ quá hạn > 60 ngày mới có dữ liệu |
| 9 | Chọn từ theo chủ đề | `/vi/app/topic?code=business&level=B1` | ✅ | Tick từ, "Thêm cả N từ" |
| 10 | Phiên ôn | `/vi/app/review?group=…` | ✅ (trang toàn màn, không tiêu đề) | Space lật, 1/2 trả lời, Esc kết thúc |
| 11 | Tra từ | `/vi/app/lookup` | ✅ | Bộ lọc, phím `/`, nút +, "Thêm cả loạt vào nhóm" |
| 12 | Trang từ | `/vi/app/word?w=left` | ✅ | Dạng chia, "Bạn đang học", câu đã gặp |
| 13 | Tấm Thêm từ | phím `N` hoặc nút "Thêm từ" | (kiểm ở M3) | went → go, tự nhập nghĩa, chọn nhóm |
| 14 | Luyện tập | `/vi/app/practice` | ✅ | Bắt đầu phiên, Tùy chỉnh, hết lượt (Free 3 phiên/ngày) |
| 15 | Phiên luyện tập | `/vi/app/practice/session` | ✅ mở được khi chưa có phiên | Bắt đầu phiên từ trang Luyện tập rồi làm các kiểu câu, gợi ý, báo lỗi |
| 16 | Từ hay sai | `/vi/app/practice/weak` | ✅ (đang trống) | Cần làm sai một từ 2 lần trong 5 câu mới có dữ liệu |
| 17 | Lịch sử luyện tập | `/vi/app/practice/history` | ✅ (đang trống) | Hai tab Câu đã làm / Báo lỗi của tôi |
| 18 | Gói học | `/vi/app/plans` | ✅ | Free / Pro, "Chưa mở bán" |
| 19 | Cài đặt, Tài khoản | `/vi/app/settings`, `/vi/app/settings/account` | ✅ | Ngôn ngữ, giao diện sáng/tối, nhắc học |
| 20 | Lịch sử giao dịch | `/vi/app/settings/transactions` | ✅ (đang trống) | Cần giao dịch (xem mục 3) |
| 21 | Bản tiếng Anh | `/en/app/...` | ⚠️ xem ghi chú | Đổi ngôn ngữ ở Cài đặt rồi xem lại các trang |

Ghi chú về lỗi script thấy:
- Trang đăng nhập/đăng ký báo `401` trong console: app thử làm mới phiên khi chưa đăng nhập. Bình thường.
- Luyện tập báo `404` trong console: API trả 404 khi chưa có phiên đang mở (`GET /practice/sessions/current`). Bình thường.
- `/en/...`: script mở quá nhiều trang liên tục nên API chặn làm mới phiên (`429 Too Many Requests`); tài khoản đang để tiếng Việt nên app còn phải
  chuyển `/en` → `/vi`. Không phải lỗi của trang, nhưng **chưa kiểm được bản tiếng Anh** lần này: đổi ngôn ngữ ở Cài đặt rồi xem lại bằng tay.

## 2. API người học (đã gọi thật, đăng nhập bằng tài khoản thử)

| Nhóm | Endpoint | Tự kiểm |
|---|---|---|
| Tài khoản | `GET /v1/me`, `/v1/me/entitlements`, `/v1/me/app-config`, `/v1/me/reminders` | ✅ 200 |
| Nhóm, ôn | `GET /v1/groups`, `/v1/groups/{id}`, `/items`, `/queue?mode=due`, `/backlog` | ✅ 200 |
| Chủ đề | `GET /v1/topics`, `/v1/topics/suggestions` | ✅ 200 (6 chủ đề, 3 gợi ý) |
| Từ điển | `GET /v1/words`, `/v1/words/{lemma}`, `/v1/lookup?q=`, `/v1/senses?topic&level`, `/v1/senses/{id}/sentences` | ✅ 200 |
| Luyện tập | `GET /v1/practice/sessions/current` | ✅ 404 khi chưa có phiên (đúng thiết kế) |
| | `GET /v1/practice/weak-words`, `/weak-words/groups`, `/history`, `/reports` | ✅ 200 (đang trống) |
| | `GET /v1/practice/report-reasons?kind=non_ai` / `ai` | ✅ 200 (4 / 7 lý do) |
| Giao dịch | `GET /v1/me/transactions` | ✅ 200 (đang trống) |

Chưa gọi tự động (ghi dữ liệu; bấm thử trên giao diện sẽ gọi chúng): tạo/đổi/xóa nhóm, thêm từ (`/quick-add`, `/items/bulk`), ôn (`/reviews`),
câu đã gặp, mở phiên luyện và trả lời, báo lỗi, đổi Cài đặt.

## 3. Muốn có dữ liệu cho các trang đang trống

- Lịch sử giao dịch: ở `apps/api`, `pnpm learner:setup -- --admin admin.m1@example.com --learner lan.m2c@example.com --transactions` (gửi ba sự
  kiện thanh toán giả: mua, gia hạn, hoàn tiền). Cần API chạy với `BILLING_FAKE_ENABLED=true` (đang bật).
- Gói Pro (30 phiên/ngày, câu AI): thêm `--plan pro` vào lệnh trên.
- Từ hay sai: luyện tập và trả lời sai cùng một từ 2 lần.

## 4. Chưa bật lúc này

- **Admin** (trang "Giao dịch" mới ở M4b): chưa chạy. Bật bằng `$env:VITE_API_BASE_URL='http://127.0.0.1:3000'; pnpm --filter admin dev`, mở
  http://127.0.0.1:5173.
- M5a (câu AI trong luyện tập), M5b (tra bằng AI, Từ của tôi): chưa làm.
