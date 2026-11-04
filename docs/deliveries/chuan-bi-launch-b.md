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

- API 319 file / 4415 test xanh (sau review M1; chạy với `--maxWorkers=4`, vì với mọi worker, bốn test của CLI khởi động cả app quá hạn 5 giây khi máy đang tải và đều qua khi chạy riêng); admin 1342 test; `tsc` api và web sạch; `oxlint` không cảnh báo mới.
- Test đỏ trước cho mọi task. Phá thử bằng tay (mutation) làm trong lúc viết từng task trên các nhánh luật của file thuần và service, kết quả không lưu thành file; chỉ có hai lần ghi lại: sau review, `neverApplied` (đổi `every` thành `some` và `>=` thành `>`) làm đỏ một test.
- **Smoke thật** `pnpm smoke:buoc-b-payments` trên DB mới, API và worker thật, bản payOS giả: 19/19 bước (chạy với `SMOKE_LOGS`, nên bước riêng tư đã quét log của API và worker), gồm Review Focus 1 (webhook và trang về cho cùng một lần chuyển, `Promise.all`, 5 vòng: luôn đúng một kỳ), job đối soát qua CLI `maintenance:run`, xóa tài khoản rồi tiền tới (T1), kỳ nối tiếp, thu hồi kỳ giữa chuỗi, và hai bước thêm sau review: **Review I2** (trang về đếm lần chuyển trước, webhook tới sau với reference khác: một kỳ, thanh toán thứ hai `attached`) và **Review I1** (webhook bị bỏ qua, job tìm thấy tiền: đơn sang `needs_review` `provider-mismatch`). Output: [`chuan-bi-launch-b-smoke-output.txt`](chuan-bi-launch-b-smoke-output.txt).

## Review độc lập M1 (04/11/2026)

Báo cáo đầy đủ: `.superpowers/sdd/2026-11-04-chuan-bi-launch-b/m1-review.md` (thư mục git-ignored, nằm trong worktree của session này). Kết quả: 0 Critical, 2 Important, 9 Minor; kết luận "sửa rồi merge".
- **I1 đã sửa.** Webhook bị applier bỏ qua (`ignored`) hoặc thất bại 5 lần làm tiền của lần chuyển đó không còn đường nào được áp dụng: job lấy lại cùng khóa, `inbox.store` không có hàng mới, đơn nằm `pending` mãi mà không ai biết. Nay job kiểm: không có thanh toán nào được đếm và mọi hàng inbox đã chốt mà chưa áp dụng thì đơn sang `needs_review` `provider-mismatch` để nhân viên xem rồi bấm "Đã nhận tiền". Không tự áp dụng lại dưới khóa khác (ruling trong ledger).
- **I2 đã sửa.** Nếu trang về đếm lần chuyển trước (reference A) rồi webhook tới với reference B khác, T8 mở kỳ thứ hai cho cùng một lần chuyển. Nay cùng số tiền và cùng thời điểm do payOS ghi (giây) với thanh toán payOS đã đếm thì coi là cùng lần chuyển: `attached`, không kỳ mới, không cờ. Hai lần chuyển cùng số tiền trong cùng một giây vào một đơn sẽ bị đếm là một (hầu như không thể xảy ra với một người trả).
- **Chín Minor** (resolve() còn nhận thiếu `prepaidPeriods`, job có thể bị đói khi 100 đơn không rời `pending`, hồ sơ giữ có thể xóa kỳ chưa chạy, T7 nuốt im một khoản trả thứ hai, T1 ghi đè người nhận hoàn tiền, môi trường lấy từ config thay vì từ đơn, admin `resolve` có thể xóa cờ chưa thấy, chuỗi doc thiếu bằng chứng, quét tuần tự ở danh sách admin) nằm ở ledger là `minor (deferred)`.
- **Kiểm của phần sửa:** test đỏ trước ở commit `93ef036f`, sửa ở `8309df25`; test mới ở tầng luật thuần, `OrderApplier`, job đối soát và repository; hai bước smoke thật. Một mutation tay trên `neverApplied` làm đỏ một test.

## M2 — as-built (04/11/2026, nhánh `feat/launch-b-m2-purchase`, xếp chồng sau M1)

- **Email (Task 15):** `payment_receipt` (một lần cho mỗi lần trả mở kỳ: lần đầu, kỳ thứ hai của T8, nhân viên xác nhận; có kỳ, số tiền, nội dung `WM…`, mã tham chiếu, ngày bắt đầu và "tới hết", câu "không hoàn tiền"; hạn 7 ngày) và `expiry_notice` (kỳ cuối còn 7 ngày, dùng chung `renewal_notice_days_before`; bỏ khi có kỳ nối hoặc grant nối, lúc lập và lúc gửi). Cả hai bỏ câu "hủy ở App Store, Google Play". Smoke thật: một biên nhận tới Mailpit, một email nhắc, một kỳ có kỳ nối bị bỏ `covered`.
- **Web (Task 16, 17):** trang Gói có ba kỳ 1/3/12 tháng với giá từ `plans.pro.prices`, câu "Không hoàn tiền…" và link Điều khoản ngay trên nút Mua, Mua gửi `Idempotency-Key` và `expected_amount` (409 `price-changed` tải lại giá, 503 báo thử lại), đang Pro thì hiện "Tới hết" từ `pro_until` và "Kỳ tiếp theo" từ `upcoming_periods` và vẫn mua được; câu khóa tính năng đã bỏ "chưa mở bán"; lịch sử giao dịch ghi "3 tháng"; màn xóa tài khoản nhắc mất thời gian Pro; trang về `/app/plans/order` gọi `check` một lần rồi hỏi đơn mỗi 3 giây tối đa 2 phút.
- **Admin (Task 18):** màn "Đơn hàng" (`settings.manage`): danh sách lọc theo trạng thái, "Cần xem", email, ngày, nội dung `WM…`; chi tiết (các lần trả, các kỳ, Pro hiện có, lý do, thông tin hoàn tiền) và bốn hành động: Đã nhận tiền, Hủy đơn, Đã xử lý, Thu hồi kỳ.
- **Văn bản và checklist (Task 19):** Điều khoản mục 5–8 và Chính sách bảo mật (payOS, quảng cáo không cá nhân hóa) viết lại, vi và en, ở nhánh local `docs/launch-b-legal-drafts` (cắt từ `docs/web-launch-research`, chưa push theo quy ước tài liệu chủ dự án đọc); mục payOS thêm vào `deploy-checklist.md`.
- **Đã kiểm:** API `src/entitlements` 53 file / 1009 test xanh; web 79 file / 789 test, `eslint` sạch, `tsc` sạch; admin 101 file / 1358 test, `eslint` và `tsc` sạch (ba test của các file không động tới quá hạn 5 giây khi máy tải và qua khi chạy riêng); smoke thật `smoke:buoc-b-payments` 20/20 (thêm bước Task 15). Mọi test mới đỏ trước.
- **Chưa kiểm:** e2e Playwright của web và admin chưa chạy (cần Worker build và stack; sửa `e2e/app/m4.spec.ts` và `fixtures.ts` cho trang Gói mới chạy ở CI); trang mua và trang về chưa bấm bằng payOS giả trong trình duyệt thật (chỉ có test đơn vị với API giả); `smoke:buoc-5`, `7`, `8` chạy ở Task 24, một lần trên mã đã hợp nhất với đợt A.

## Chưa làm hoặc chưa kiểm

- **Chưa gọi payOS thật.** Mọi hành vi của payOS thật là `ASSUMPTION` P1–P11 của design §3.14, cộng một mục mới **P12**: adapter coi chỉ HTTP 404 (`NotFoundError` của SDK) là "payOS không có link này"; nếu payOS trả 200 kèm mã lỗi, đơn được coi là lỗi hỏi thăm và để nguyên. Kiểm ở lần mua thật đầu tiên.
- **P7 vẫn chưa kiểm** (webhook và danh sách giao dịch của payOS cùng `reference` cho một lần chuyển). Sau review, quy tắc "cùng số tiền và cùng thời điểm = cùng lần chuyển" chặn việc mở kỳ thứ hai nếu P7 sai, nhưng chỉ khi hai bên cùng ghi `transactionDateTime` giống nhau (định dạng và múi giờ cũng là ASSUMPTION P9). Kiểm cả hai ở lần mua thật đầu tiên: so `reference` và `transactionDateTime` của webhook với của `getCheckout`.
- **Task 9 làm dở có chủ ý:** phần dùng loader `ended` của đợt A (`aiSourceEnds`, `EndedSources`, `load(…, endedSince)`, LB1A8: lượt AI dùng lúc còn Pro không trừ vào Free) chưa làm vì đợt A chưa vào `dev`. Việc phải làm sau khi merge `origin/dev`: thêm `prepaidPeriods` vào `EndedSources` và `aiSourceEnds` (`endedAt = ends_at`, hoặc `revoked_at` khi thu hồi giữa chừng).
- **Email biên nhận và "sắp hết hạn"** (Task 15) chưa có: `OrderApplier` mở kỳ và ghi dòng `purchase` nhưng chưa ghi `payment_receipt`.
- Web, admin UI, văn bản pháp lý (M2) và quảng cáo (M3, M4) chưa làm. `plans.pro.prices`, `upcoming_periods`, `pro_until` ở kiểu web để `optional` cho tới khi trang gói đọc chúng.
- Chưa chạy `pnpm smoke:buoc-5` và `smoke:buoc-7` sau M1 (đổi `resolve()` và snapshot): chạy ở Task 24, sau khi hợp nhất với đợt A.
