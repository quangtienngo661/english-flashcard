# Chuẩn bị launch đợt B — plan tóm tắt (04/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-04-chuan-bi-launch-b.md`](../superpowers/plans/2026-11-04-chuan-bi-launch-b.md). Design:
[`../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md`](../superpowers/specs/2026-11-04-chuan-bi-launch-b-design.md). Bản này là ảnh chụp lúc duyệt plan; as-built
nối tiếp bên dưới khi làm xong. M1 bắt đầu sau khi M3 của đợt A đã vào `dev`.

## M0 — Spike CSP `nonce` (song song đợt A M1)

1. Thử CSP có `nonce` cho `/app` trên bản build Worker (nhánh bỏ đi); ghi kết quả, quyết M4 làm được hay phải chờ OpenNext.

## M1 — Đơn hàng và payOS (API)

2. Thêm bảng đơn hàng, lần trả, kỳ trả trước, link payOS giả; thêm kỳ "3 tháng" và hai loại email mới vào ràng buộc.
3. Ba setting giá (79.000 / 199.000 / 599.000 ₫) và gửi bảng giá cho web.
4. Cấu hình payOS (thật, giả, tắt); API không khởi động khi thiếu biến hoặc bật bản giả ở production.
5. Hàm thuần: mã đơn, nội dung chuyển khoản `WM…`, khóa của lần trả, ngày bắt đầu và kết thúc kỳ, ngày "tới hết".
6. Tự kiểm chữ ký webhook payOS, đối chiếu với SDK; bỏ thông tin người chuyển khỏi dữ liệu thô.
7. Adapter payOS, bản giả và trang thanh toán giả cho test và smoke.
8. Đưa sự kiện "đã trả" sang bộ xử lý đơn hàng trước nhánh "không biết người dùng".
9. Kỳ trả trước thành nguồn Pro: gói, chu kỳ AI, kỳ sắp tới và "Pro tới hết" trong snapshot.
10. Bộ luật T1–T14 quyết mỗi lần trả: mở kỳ, nối kỳ, cần xem, hoàn tiền sau khi xóa tài khoản.
11. API tạo đơn và xem đơn của học viên; payOS lỗi thì đơn hỏng và cho bấm lại.
12. Job đối soát hằng giờ và nút kiểm ở trang về.
13. API admin cho đơn hàng (xác nhận tay, hủy, đã xử lý, thu hồi kỳ) và xóa tài khoản có đơn.
14. Lệnh đăng ký webhook payOS và smoke thanh toán với payOS giả; mở PR M1.

## M2 — Mua trên web, admin, email, văn bản

15. Email sắp hết hạn và biên nhận cho gói trả trước.
16. Trang gói: ba kỳ có giá, câu không hoàn tiền, nút Mua, đổi câu "Gói Pro chưa mở bán", nhắc mất thời gian Pro khi xóa tài khoản.
17. Trang về từ payOS: hỏi trạng thái đơn và báo kết quả.
18. Màn "Đơn hàng" của admin.
19. Viết lại Điều khoản phần thanh toán, thêm mục payOS và quảng cáo vào Chính sách bảo mật; thêm mục payOS vào checklist deploy; mở PR M2.

## M3 — Ai thấy quảng cáo, hộp thoại giới thiệu Pro

20. Luật ai thấy quảng cáo: Free, không phải staff, từ 16 tuổi.
21. Hộp thoại giới thiệu Pro khi chuyển tới Nhóm hoặc Tra từ, tần suất giới hạn; mở PR M3.

## M4 — AdSense vignette

22. CSP có `nonce` cho `/app`, kiểm `/app` dựng theo request và landing dựng sẵn, e2e CSP.
23. Chỉ nạp AdSense ở Nhóm và Tra từ, tải lại cả trang khi rời; chân trang app thành link thường; mở PR M4.
24. Chạy hết smoke; chủ dự án mua thật một kỳ sau deploy; bật AdSense sau khi Google duyệt; viết as-built.

# Chuẩn bị launch đợt B — as-built M1 (04/11/2026)

M1 (API: đơn hàng và payOS) làm xong trên nhánh `feat/launch-b-m1-orders` (Task 2–14), **chưa mở PR**: nhánh chờ M3 của đợt A vào `dev` (Task 8–10 sửa đúng các file đợt A đang sửa).
Các quyết định lệch plan (`Ruling`) được liệt kê trong báo cáo cuối của session thực thi.

## Đã có

- **Dữ liệu:** migration `20261110100000_billing_orders` (`billing_orders`, `billing_order_payments`, `prepaid_periods`, `fake_payos_links`, sequence `billing_order_code_seq` từ 10^9, CHECK đủ; `interval` giao dịch thêm `quarter`; loại email `expiry_notice`, `payment_receipt` cho M2).
- **Giá:** ba setting `pro_price_1m_vnd` / `3m` / `12m` (79.000 / 199.000 / 599.000, 1.000–10.000.000), `GET /v1/me/app-config` có `plans.pro.prices`, ba ô ở trang cài đặt admin (52 key).
- **payOS:** cấu hình `real | fake | off`; chữ ký webhook tự viết (`timingSafeEqual`) và được đối chiếu với `webhooks.verify` của SDK `@payos/node` 2.0.5 trên mọi kiểu giá trị; adapter thật (`createCheckout`, `getCheckout`, `cancelCheckout`; SDK `timeout 4000, maxRetries 0`); bản giả + trang `/v1/dev/payos/checkout` (404 khi không ở chế độ giả); `pnpm payos:confirm-webhook <url>`.
- **Luật đơn:** `OrderApplier` theo bảng T1–T14 (hàm thuần `order-rules.ts` + dữ liệu), kỳ trả trước là nguồn Pro thứ ba trong `resolve()`, snapshot có `kind: 'prepaid'`, `upcoming_periods`, `pro_until`.
- **API:** `POST /v1/me/orders`, `GET /v1/me/orders/:id`, `POST /v1/me/orders/:id/check` (tối đa một lần hỏi payOS mỗi 10 giây mỗi đơn), job `billing.orders-reconcile` hằng giờ; admin (chỉ `admin`): danh sách, chi tiết, "Đã nhận tiền", hủy đơn, "Đã xử lý", thu hồi kỳ.
- **Riêng tư và giữ hồ sơ:** xóa tài khoản xóa kỳ và ẩn danh đơn, không gọi payOS; job 90 ngày xóa `payer` khỏi sự kiện và ba trường hoàn tiền; job giữ hồ sơ cắt đơn đã kết thúc cùng `transactionRetentionYears`; không log mã đơn hay người chuyển (có test log).

## Đã kiểm (04/11/2026)

- API 319 file / 4402 test xanh; admin 1342 test; `tsc` api và web sạch; `oxlint` không cảnh báo mới.
- Test đỏ trước cho mọi task, và phá thử từng nhánh luật (mutation tay) cho các file thuần và service: mọi mutant bị bắt.
- **Smoke thật** `pnpm smoke:buoc-b-payments` trên DB mới, API và worker thật, bản payOS giả: 17/17 bước, gồm Review Focus 1 (webhook và trang về cho cùng một lần chuyển, `Promise.all`, 5 vòng: luôn đúng một kỳ), job đối soát qua CLI `maintenance:run`, xóa tài khoản rồi tiền tới (T1), kỳ nối tiếp, thu hồi kỳ giữa chuỗi. Output: [`chuan-bi-launch-b-smoke-output.txt`](chuan-bi-launch-b-smoke-output.txt).

## Chưa làm hoặc chưa kiểm

- **Chưa gọi payOS thật.** Mọi hành vi của payOS thật là `ASSUMPTION` P1–P11 của design §3.14, cộng một mục mới **P12**: adapter coi chỉ HTTP 404 (`NotFoundError` của SDK) là "payOS không có link này"; nếu payOS trả 200 kèm mã lỗi, đơn được coi là lỗi hỏi thăm và để nguyên. Kiểm ở lần mua thật đầu tiên.
- **Task 9 làm dở có chủ ý:** phần dùng loader `ended` của đợt A (`aiSourceEnds`, `EndedSources`, `load(…, endedSince)`, LB1A8: lượt AI dùng lúc còn Pro không trừ vào Free) chưa làm vì đợt A chưa vào `dev`. Việc phải làm sau khi merge `origin/dev`: thêm `prepaidPeriods` vào `EndedSources` và `aiSourceEnds` (`endedAt = ends_at`, hoặc `revoked_at` khi thu hồi giữa chừng).
- **Email biên nhận và "sắp hết hạn"** (Task 15) chưa có: `OrderApplier` mở kỳ và ghi dòng `purchase` nhưng chưa ghi `payment_receipt`.
- Web, admin UI, văn bản pháp lý (M2) và quảng cáo (M3, M4) chưa làm. `plans.pro.prices`, `upcoming_periods`, `pro_until` ở kiểu web để `optional` cho tới khi trang gói đọc chúng.
- Chưa chạy `pnpm smoke:buoc-5` và `smoke:buoc-7` sau M1 (đổi `resolve()` và snapshot): chạy ở Task 24, sau khi hợp nhất với đợt A.
