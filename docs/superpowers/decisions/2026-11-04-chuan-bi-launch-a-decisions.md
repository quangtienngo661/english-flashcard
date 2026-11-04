# Decisions — Chuẩn bị launch, đợt A

Ngày: 04/11/2026. Đi kèm design doc [`../specs/2026-11-04-chuan-bi-launch-a-design.md`](../specs/2026-11-04-chuan-bi-launch-a-design.md).
Gom các quyết định chốt trong chat 02–04/11/2026 cho đợt A (Turnstile, security header, đợt sửa sau review, lượt AI cho Free, tắt trial). Design doc mô tả
*cách làm*; file này giữ *các phương án đã đưa ra và đã chọn gì*.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn trong chat; "Theo đề xuất của Claude" = chủ dự án trả lời "theo rec của bạn"
cho câu hỏi đó (04/11/2026), tức chọn đúng đề xuất của Claude; "Chờ duyệt cùng design" = đề xuất kỹ thuật trong bản viết, chủ dự án chưa đọc lại.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| DA1 | Chia design doc | Hai doc: phần 1–3 và phần 4–5 | Chủ dự án |
| DA2 | Thứ tự làm | Từ nhỏ đến lớn | Chủ dự án |
| DA3 | Lượt AI của gói Free | 15 câu AI + 5 lượt tra AI mỗi tháng | Chủ dự án (đồng ý đề xuất) |
| DA4 | "Một tháng" của Free | Tháng dương lịch theo timezone của học viên | Chủ dự án (đồng ý đề xuất) |
| DA5 | Cách học viên từ chối AI | Không cần công tắc; tự bật/tắt kiểu câu AI và chỉ tra AI khi bấm | Chủ dự án |
| DA6 | Trial | Tạm tắt | Chủ dự án |
| DA7 | Đường đi của các việc sửa sau review (Q14) | Một đợt riêng có design và plan | Chủ dự án |
| DA8 | Checklist test tay cho dev (Q11) | Viết, đặt ở `docs/audit/` | Chủ dự án |
| DA9 | Turnstile ở đăng nhập (Q-A1) | Có, cả web và admin | Chủ dự án (vòng 2) |
| DA10 | Quên mật khẩu của admin (Q-A2) | Có widget như web | Theo đề xuất của Claude |
| DA11 | Client `mobile` (Q-A3) | Token bắt buộc như web | Theo đề xuất của Claude |
| DA12 | Không gọi được Cloudflare (Q-A4) | Từ chối (503) | Theo đề xuất của Claude |
| DA13 | Ảnh trong xem trước Markdown của admin (Q-A5) | Chỉ ảnh của chính site | Theo đề xuất của Claude |
| DA14 | e2e mock "Đặt mật khẩu" tài khoản Google (Q-A6) | Có | Theo đề xuất của Claude |
| DA15 | Pro về Free giữa tháng (Q-A7) | Không tính lượt lúc còn Pro | Theo đề xuất của Claude |
| DA16 | Free có limits grant có AI (Q-A8) | Chu kỳ theo grant như hiện nay | Theo đề xuất của Claude |
| DA17 | B2-3, B3-7, B4-4, UA-6 (Q-A9) | B3-7 làm; ba mục kia để sau | Theo đề xuất của Claude |
| DA18 | Ghi kết quả Google thật (Q-A10) | Chờ dữ liệu của chủ dự án | Theo đề xuất của Claude |

## DA1 — Chia design doc

Bối cảnh: các quyết định rơi vào năm phần độc lập (Turnstile và header, sửa sau review, AI cho Free, quảng cáo, thanh toán).

| Phương án | Trade-off |
|---|---|
| (a) Một doc chung | Đọc một lần thấy hết; doc và plan rất dài, phần nhỏ chờ phần lớn |
| (b) Mỗi phần một doc | Mỗi doc ngắn, làm độc lập; năm vòng duyệt |
| (c) Gộp một phần (vd thanh toán + AI Free) | Ít vòng hơn (b) |
| ✅ Hai doc: phần 1–3 và phần 4–5 (chủ dự án tự đưa ra) | Đợt A là các việc nhỏ, đợt B là hai việc lớn có rủi ro tiền và quảng cáo |

## DA2 — Thứ tự làm

Chủ dự án yêu cầu xếp theo khối lượng từ nhỏ đến lớn: Turnstile và header → sửa sau review → AI cho Free (đợt A) → quảng cáo → thanh toán (đợt B, trong design
B thanh toán làm trước vì hộp thoại giới thiệu Pro cần mua được Pro).

## DA3 — Lượt AI của gói Free

Bối cảnh: chủ dự án tắt trial nhưng muốn người Free được dùng AI có giới hạn, nhờ Claude đề xuất số. Đo trên 265 lời gọi thật: Haiku 5.5 ~$0,0003/câu,
gpt-6.1-terra ~$0,0016/câu.

| Phương án | Trade-off |
|---|---|
| Giữ Free = 0 (hiện trạng) | Không tốn gì; người Free không thử được AI trước khi mua |
| ✅ 15 câu AI + 5 lượt tra mỗi tháng (~5% của Pro) | ~175–750 ₫/người Free/tháng; đủ thử một hai phiên có câu AI; cần chặn tạo tài khoản hàng loạt (Turnstile) |

## DA4 — "Một tháng" của Free

| Phương án | Trade-off |
|---|---|
| ✅ Tháng dương lịch theo timezone của học viên | Dễ hiểu ("lượt mới vào 01/12"); cần cycle mới vì Free không có anchor |
| (ngầm) Chu kỳ theo anchor như Pro | Free không có ngày bắt đầu gói để neo |

## DA5 — Cách học viên từ chối AI

Bối cảnh: trước đó (02–03/11) "muốn không dùng AI thì dùng gói Free"; Free có lượt AI thì câu đó hết đúng.

| Phương án | Trade-off |
|---|---|
| Công tắc "không dùng AI" trong cài đặt (Claude nêu làm ví dụ) | Rõ ràng; thêm một màn và một luật |
| ✅ Không cần công tắc: bật/tắt "Kiểu câu có AI" trong phiên, chỉ tra AI khi bấm nút | Không thêm gì; Claude đã kiểm code: AI chỉ chạy khi học viên chọn |

## DA6 — Trial

| Phương án | Trade-off |
|---|---|
| Giữ trial 7 ngày | Landing đang hứa "cần thẻ"; VietQR không có thẻ |
| ✅ Tạm tắt trial, cho Free dùng AI giới hạn | Không có trial để quản lý; code trial giữ lại cho cổng tự gia hạn sau này |
| Chỉ mở trial khi có cổng tự gia hạn | (gộp vào phương án chọn: code giữ lại) |

## DA7 — Đường đi của các việc sửa sau review (Q14)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Một đợt riêng có design và plan | Gom một chỗ, dễ theo dõi |
| (b) Chia vào các đợt sẵn có (Deploy, trước provider thật) | Ít đợt hơn; việc dễ rơi |
| (c) Chỉ R1–R3 bây giờ, phần còn lại để sau | Nhanh; nợ còn lại |

## DA8 — Checklist test tay cho dev (Q11)

Q11 (02/11) đã chốt không chạy e2e backend, dev test tay theo checklist. Ngày 04/11 chủ dự án yêu cầu viết và đặt ở `docs/audit/`: đã viết
`docs/audit/2026-11-04-dev-test-checklist.md` (nhánh `docs/dev-test-checklist`).

## DA9 — Turnstile ở đăng nhập (Q-A1)

Vòng 1 (câu hỏi gốc: đăng nhập của tài khoản chưa xác minh, vì login gửi lại mã khi mật khẩu đúng; giới hạn mỗi email 1 mail/60 s, 5 mail/giờ):

| Phương án | Trade-off |
|---|---|
| Chặn | Mọi người phải qua widget ở form đăng nhập |
| ✅ Không chặn (theo đề xuất của Claude) | Gửi mail qua login cần tài khoản và đúng mật khẩu; tài khoản chỉ tạo được qua đăng ký đã có Turnstile |

Vòng 2 (04/11): chủ dự án hỏi "sao lại không để ở đăng nhập, thường trang đăng nhập cũng để". Claude nhận vòng 1 chỉ xét việc gửi mail, bỏ sót việc bot dò mật
khẩu bằng danh sách bị lộ: giới hạn 20 lần/phút/IP không chặn được bot đổi IP, còn khóa tài khoản sau 10 lần sai lại cho bot cố tình khóa tài khoản người thật.

| Phương án | Trade-off |
|---|---|
| Không chặn (vòng 1) | Không thêm bước ở đăng nhập; còn lỗ dò mật khẩu và khóa tài khoản |
| Chỉ web | Admin dựa vào Cloudflare Access sau deploy; hai luật khác nhau cho cùng một API |
| ✅ Chặn ở đăng nhập của web và admin | Ai đăng nhập cũng chờ widget 1–2 giây; một luật cho mọi route nhạy cảm. Google sign-in không đổi |

## DA10 — Quên mật khẩu của admin (Q-A2)

| Phương án | Trade-off |
|---|---|
| ✅ Widget trong admin như web | Một luật ở API cho mọi host; thêm biến `VITE_TURNSTILE_SITE_KEY` và CSP admin |
| API miễn kiểm cho admin | Phải phân biệt theo host hay Origin; một lối vào không có Turnstile |

## DA11 — Client `mobile` (Q-A3)

| Phương án | Trade-off |
|---|---|
| ✅ Token bắt buộc như web | Đơn giản, không có lối vào không kiểm; app Flutter có design riêng khi làm |
| Miễn kiểm cho `mobile` tới khi có app | Bot chỉ cần gửi `client: 'mobile'` là qua |

## DA12 — Không gọi được Cloudflare (Q-A4)

| Phương án | Trade-off |
|---|---|
| ✅ Từ chối (503 `captcha-unavailable`) | Người thật không đăng ký được lúc Cloudflare lỗi (hiếm) |
| Cho qua | Bot lợi dụng được lúc đó; rate limit vẫn còn |

## DA13 — Ảnh trong bản xem trước Markdown của admin (Q-A5)

| Phương án | Trade-off |
|---|---|
| Mọi địa chỉ `https:` | Xem được ảnh ngoài; CSP rộng hơn |
| ✅ Chỉ ảnh của chính site | Văn bản pháp lý không cần ảnh ngoài; CSP chặt |

## DA14 — e2e mock "Đặt mật khẩu" của tài khoản chỉ có Google (Q-A6)

| Phương án | Trade-off |
|---|---|
| ✅ Có e2e mock, cộng một lượt thử tay | Luồng này từng hỏng (B8-2); e2e mock web đã có khung |
| Chỉ thử tay (R8) | Ít việc; hỏng lại thì không ai biết |

## DA15 — Pro về Free giữa tháng (Q-A7)

Ví dụ: Lan dùng 200 câu AI lúc Pro, hết hạn 20/11.

| Phương án | Trade-off |
|---|---|
| Tính cả lượt lúc Pro (cách đếm hiện tại) | Không đổi query; Lan hết lượt Free tới 01/12 |
| ✅ Không tính: cửa sổ Free bắt đầu từ `max(đầu tháng, lúc kết thúc nguồn Pro/trial)` | Công bằng; `resolve()` trả thêm mốc kết thúc |

## DA16 — Free có limits grant có AI (Q-A8)

| Phương án | Trade-off |
|---|---|
| ✅ Chu kỳ theo ngày bắt đầu grant (B5E32, như hiện nay) | Không đổi; đúng ý "cấp N lượt mỗi chu kỳ từ ngày cấp" |
| Theo tháng dương lịch | Thống nhất với Free; đổi một luật đã có test |

## DA17 — Các mục review cần quyết (Q-A9)

| Mục | Phương án đưa ra | Chọn |
|---|---|---|
| B2-3 (Content chạy SQL trên bảng Pipeline, DB12) | làm / để sau / bỏ | ✅ Để sau (sửa ranh giới module, không ảnh hưởng người dùng) |
| B3-7 = B25-2 (trang Xuất thiếu "Từ chưa có nghĩa", 7.799 > 5.000) | làm / để sau / bỏ | ✅ Làm: thêm lựa chọn, `EXPORT_MAX_ROWS` 10.000 |
| B4-4 (PX3, PX5, PX6) | làm / để sau / bỏ | ✅ Để sau (cần migration, câu 27 còn treo) |
| UA-6 (44 chỗ `getByTestId('detail-panel')`) | làm / để sau / bỏ | ✅ Để sau (chỉ là test, cỡ M) |

## DA18 — Kết quả thử Google đăng nhập thật (Q-A10)

Không phải câu chọn phương án: cần dữ liệu của chủ dự án (ngày, lần 1, lần 2, hai `ASSUMPTION` của design Bước 8 §19). Tới lúc có, tài liệu ghi "chủ dự án báo đã thử,
chưa có ghi chép" thay cho "chưa thử".

## Đề xuất kỹ thuật trong design (chờ duyệt cùng bản viết)

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| Kiểm Turnstile | Guard ở API đặt trước rate limit, token trong body | Header riêng | Không phải đổi CORS; token giả không ăn bộ đếm của người thật |
| Chế độ Turnstile | `real` / `fake` / `off`, chặn `fake`/`off` khi `BILLING_PRODUCTION=true` | Luôn gọi Cloudflare | Smoke, e2e và local chạy không cần mạng; cùng cơ chế Q13 |
| Header của API | `helmet` cấu hình cho API JSON | Tự viết middleware | Dùng thư viện có sẵn; cấu hình lại vì mặc định hợp trang HTML |
| HSTS | Đặt ở Cloudflare | Đặt ở API | Một chỗ cho mọi host |
| Header admin | `apps/admin/public/_headers` | Worker script | Admin chỉ là static assets |
| Cycle AI | Một hàm `aiCycle()` dùng cho cả bốn chỗ; hàm thuần `calendarMonthCycle(zone, now)` | Sửa từng chỗ | Tránh snapshot và reserve báo khác nhau |
| Tắt trial | `trial_eligible = false`, bỏ chữ hứa trial, giữ code trial | Thêm setting bật/tắt trial | Không có nhà cung cấp nào phát trial hiện nay |
