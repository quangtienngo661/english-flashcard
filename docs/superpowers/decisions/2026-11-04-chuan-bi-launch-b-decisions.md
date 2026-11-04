# Decisions — Chuẩn bị launch, đợt B

Ngày: 04/11/2026. Đi kèm design doc [`../specs/2026-11-04-chuan-bi-launch-b-design.md`](../specs/2026-11-04-chuan-bi-launch-b-design.md).
Gom các quyết định chốt trong chat 02–04/11/2026 cho đợt B (thanh toán VietQR qua payOS, quảng cáo). Research đi kèm (nhánh `docs/web-launch-research`):
`PAYMENT_WEB_LAUNCH_RESEARCH_2026-11-02.md`, `PRICING_INPUTS_RESEARCH_2026-11-04.md`, `WEB_ADS_RESEARCH_2026-11-02.md`,
`ADSENSE_LOGGED_IN_APP_RESEARCH_2026-11-04.md`, `EDU_APP_ADS_SURVEY_2026-11-04.md`.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn trong chat; "Theo đề xuất của Claude" = chủ dự án trả lời "theo rec của bạn"
(04/11/2026); "Chờ duyệt cùng design" = đề xuất kỹ thuật trong bản viết, chủ dự án chưa đọc lại.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| DB1 | Cách thu tiền lúc đầu | VietQR trả tay từng kỳ (mở lại D35) | Chủ dự án |
| DB2 | Kỳ bán | 1, 3, 12 tháng | Chủ dự án |
| DB3 | Giá | 79.000 / 199.000 / 599.000 ₫ | Chủ dự án (đồng ý đề xuất) |
| DB4 | Xác nhận chuyển khoản | Webhook payOS, nút "Đã nhận tiền" dự phòng | Chủ dự án |
| DB5 | Chuyển sang cổng tự gia hạn sau này | Người dùng tự chọn | Chủ dự án |
| DB6 | VietQR khi đã có MoMo | Thôi bán; một adapter chung | Chủ dự án |
| DB7 | Email | "Sắp hết hạn" cho VietQR, "sắp trừ tiền" cho tự gia hạn | Chủ dự án |
| DB8 | Trả khi gói còn hạn | Nối tiếp từ ngày hết hạn | Chủ dự án |
| DB9 | Model AI cho câu của Pro | Không dùng Sonnet | Chủ dự án (đồng ý đề xuất) |
| DB10 | Có quảng cáo không | Có, chấp nhận rủi ro | Chủ dự án |
| DB11 | Khung quảng cáo | Vignette của Google; hộp thoại tự làm chỉ giới thiệu Pro | Chủ dự án (đồng ý đề xuất) |
| DB12 | Trang cho khách | Chỉ landing, không làm thêm trang công khai | Chủ dự án |
| DB13 | Trang có vignette | Nhóm, Tra từ | Chủ dự án (hai vòng; màn tổng kết bỏ ở DB23) |
| DB14 | Video, tần suất | Không video; tần suất thấp | Chủ dự án |
| DB15 | Hạn của đơn chưa trả (Q-B1) | 15 phút | Theo đề xuất của Claude |
| DB16 | Chuyển thiếu hoặc thừa (Q-B2) | `needs_review`, chờ admin | Theo đề xuất của Claude |
| DB17 | Đang có Pro được cấp mà mua (Q-B3) | Nối sau kỳ được cấp | Theo đề xuất của Claude |
| DB18 | Email biên nhận (Q-B4) | Có | Theo đề xuất của Claude |
| DB19 | Email sắp hết hạn trước mấy ngày (Q-B5) | 7 ngày, dùng chung setting | Theo đề xuất của Claude |
| DB20 | Ai bấm "Đã nhận tiền" (Q-B6) | Chỉ admin | Theo đề xuất của Claude |
| DB21 | Tiền tới sau khi xóa tài khoản (Q-B7) | `needs_review`, admin hoàn tay | Theo đề xuất của Claude |
| DB22 | Giá sửa ở đâu (Q-B8), landing hiện giá (Q-B9) | Trong admin; landing không hiện giá | Theo đề xuất của Claude |
| DB23 | Màn tổng kết có quảng cáo (Q-B10) | Không | Theo đề xuất của Claude |
| DB24 | Người dưới 16 tuổi (Q-B11) | Không tải quảng cáo | Theo đề xuất của Claude |
| DB25 | Đồng ý cá nhân hóa (Q-B12) | Luôn không cá nhân hóa, không hỏi | Theo đề xuất của Claude |
| DB26 | Staff thấy quảng cáo (Q-B13) | Không | Theo đề xuất của Claude |
| DB27 | Hộp thoại giới thiệu Pro khi đã có vignette (Q-B14) | Tắt hẳn | Theo đề xuất của Claude |

## DB1 — Cách thu tiền lúc đầu

Bối cảnh: bán dưới tên cá nhân (L1). Research 02/11 và 04/11.

| Phương án | Trade-off |
|---|---|
| Paddle, Dodo (tự gia hạn, qua thẻ) | Đúng D35; người Việt chỉ trả bằng thẻ, phí cao trên giá nhỏ |
| MoMo subscription (tự trừ tiền) | Đúng D35; cần hộ kinh doanh, không có kỳ năm, trần 250.000 ₫/ngày, phí không công khai |
| ✅ VietQR, người dùng tự trả từng kỳ | Không cần đăng ký kinh doanh, phí gần 0; mở lại D35 (người dùng phải nhớ trả), mất email báo gia hạn và nút hủy gói |

MoMo để sau (cần hộ kinh doanh).

## DB2, DB3 — Kỳ bán và giá

Chủ dự án chọn kỳ 1, 3, 12 tháng và nhờ Claude phân tích chi phí để đề xuất giá tháng. Chi phí AI đo được, chi phí cố định 500.000–700.000 ₫/tháng, thuế 0 dưới
1 tỷ ₫/năm, đối thủ 19.000–299.000 ₫/tháng (Mochi 749.000 ₫/năm web).

| Phương án giá 1 tháng | Trade-off |
|---|---|
| 69.000–99.000 ₫ (khoảng đề xuất) | |
| ✅ 79.000 ₫ (kèm 199.000 ₫/3 tháng, 599.000 ₫/12 tháng) | Rẻ hơn rõ các app có tên tuổi; lãi ~59.000 ₫/người kể cả khi dùng terra hết lượt |

## DB4 — Xác nhận chuyển khoản

| Phương án | Trade-off |
|---|---|
| Admin tự kiểm và bấm | Không phí; người mua chờ, admin phải trực |
| ✅ payOS (webhook HMAC, cá nhân đăng ký bằng CCCD, tặng 600 giao dịch) + nút "Đã nhận tiền" dự phòng | Tự động vài giây; không có sandbox, test bằng tiền thật |
| SePay | Nhiều ngân hàng; chưa rõ cá nhân có dùng được không |
| Pay2S | Webhook không có chữ ký, chỉ token cố định |
| Casso, GPM Pay, SwiftHub | Chưa đủ thông tin (giá, chữ ký) hoặc chỉ một ngân hàng |

## DB5 — Chuyển sang cổng tự gia hạn sau này

| Phương án | Trade-off |
|---|---|
| Tự động chuyển | Ít bước cho người dùng; trừ tiền người không muốn thì Wordmet chịu trách nhiệm |
| ✅ Người dùng tự chọn | An toàn; người dùng phải tự bật |

## DB6 — VietQR khi đã có MoMo

| Phương án | Trade-off |
|---|---|
| Giữ cả hai song song | Người dùng có lựa chọn; hệ thống giữ hai loại gói |
| ✅ Thôi bán VietQR; thiết kế một adapter chung cho mọi nhà cung cấp | Một luồng; port hiện có chỉ hợp gói tự gia hạn nên phải mở rộng |

## DB7 — Email

Chủ dự án đồng ý: gói VietQR có email "sắp hết hạn, hãy trả kỳ mới"; gói tự gia hạn có email "sắp trừ tiền" (luật bắt báo trước ít nhất 7 ngày).

## DB8 — Trả khi gói còn hạn

Ví dụ: gói tháng của Lan hết 30/11, ngày 25/11 Lan trả tiếp.

| Phương án | Trade-off |
|---|---|
| (a) Không cho trả khi còn hạn | Lan quên thì mất Pro một lúc |
| (b) Tính từ ngày trả | Đơn giản; Lan mất 5 ngày |
| ✅ (c) Nối từ ngày hết hạn | Không mất ngày; hệ thống giữ kỳ "đã trả chưa bắt đầu". Áp cả khi mua kỳ dài hơn và khi chuyển khoản hai lần |
| (d) Chỉ cho trả trong N ngày cuối, nối từ ngày hết hạn | Giới hạn số kỳ trả trước |

## DB9 — Model AI cho câu của Pro

| Phương án | Trade-off |
|---|---|
| Claude Sonnet 5.5 | Người dùng hết 300 câu tốn ~60.700 ₫, gần bằng giá gói |
| ✅ Không dùng Sonnet (Haiku 5.5 hoặc terra, chọn khi tune prompt) | Chi phí ~4.600–19.500 ₫/người dùng hết lượt |

## DB10 — Có quảng cáo không

| Phương án | Trade-off |
|---|---|
| Không chèn quảng cáo Google lúc launch (đề xuất của Claude) | Trải nghiệm sạch như Mochi, Prep; không có doanh thu quảng cáo |
| ✅ Có quảng cáo, chấp nhận rủi ro | Doanh thu nhỏ (~6–180 USD/tháng cho 1.000 người Free/ngày); rủi ro duyệt site, khóa tài khoản, trải nghiệm |

## DB11 — Khung quảng cáo

Chủ dự án muốn: khi chuyển trang hiện hộp thoại quảng cáo làm tối nền, tắt được ngay, không spam.

| Phương án | Trade-off |
|---|---|
| Hộp thoại tự làm chứa quảng cáo Google | Chính sách AdSense cấm (pop-up, floating box); dễ bị khóa tài khoản |
| ✅ Vignette của Google (Auto ads) | Đúng trải nghiệm mong muốn; Google tự quyết lúc hiện |
| Interstitial của Ad Manager (GPT) | Hiện khi bấm link, hỗ trợ SPA; cần thêm Ad Manager |
| ✅ Hộp thoại tự làm, nội dung giới thiệu Pro | Toàn quyền kiểm soát, không vướng Google; không có tiền quảng cáo. Dùng trong lúc chờ duyệt |

## DB12 — Trang cho khách chưa đăng nhập

| Phương án | Trade-off |
|---|---|
| Hướng A (research): trang công khai có nội dung (tra từ công khai, luyện thử) rồi xin duyệt | Dễ được duyệt; thêm việc, rủi ro "nội dung hàng loạt" |
| Hướng B: đường đăng nhập riêng cho robot | Tốn công, thêm lỗ bảo mật |
| Hướng C: H5 Games Ads | Dành cho site game |
| Hướng D: không quảng cáo Google | Không doanh thu |
| Hướng E: quảng cáo chỉ ở trang công khai | Không có trang công khai đủ nội dung |
| ✅ Chỉ landing (và văn bản pháp lý), không làm thêm trang | Ít việc nhất; dễ bị từ chối duyệt; nếu bị từ chối thì giữ hộp thoại giới thiệu Pro và xem lại |

## DB13 — Trang có vignette

Vòng 1: chủ dự án chọn Hôm nay, Nhóm, Tra từ và Luyện tập; Claude nêu Luyện tập chỉ nên là màn tổng kết. Sau đó DB23 bỏ màn tổng kết (cùng địa chỉ với lúc
làm câu).

Vòng 2 (04/11, khi đọc lại các lựa chọn đã chốt): chủ dự án bỏ Hôm nay. Hộp thoại giới thiệu Pro dùng cùng bộ trang.

Kết quả: ✅ Nhóm, Tra từ.

## DB14 — Video, tần suất

Chủ dự án: không quảng cáo video, giữ tần suất thấp, không spam. Ghi chú: chưa tìm thấy công tắc tắt video cho vignette (`ASSUMPTION` A8).

## DB15 — Hạn của đơn chưa trả (Q-B1)

| Phương án | Trade-off |
|---|---|
| Ngắn | Lan chậm thì phải bấm Mua lại |
| Dài | Nhiều đơn treo |
| ✅ 15 phút | Đủ để quét QR và chuyển khoản |

## DB16 — Chuyển thiếu hoặc thừa (Q-B2)

| Phương án | Trade-off |
|---|---|
| Tự mở kỳ | Người chuyển thiếu vẫn có Pro |
| ✅ `needs_review`, không tự mở kỳ; admin mở kỳ hoặc hoàn tay | Ít sai; người mua chờ admin (hiếm, vì VietQR Pro chặn sai số tiền ở ngân hàng) |

## DB17 — Đang có Pro do đội Wordmet cấp mà mua (Q-B3)

| Phương án | Trade-off |
|---|---|
| Kỳ mua bắt đầu ngay | Đơn giản; người mua mất các ngày trùng với kỳ được cấp |
| ✅ Nối sau kỳ được cấp, chốt lúc đơn `paid` | Không mất ngày đã trả; admin thu hồi grant sớm thì có khoảng trống (admin thấy được, cấp bù) |

## DB18 — Email biên nhận (Q-B4)

| Phương án | Trade-off |
|---|---|
| ✅ Có (`payment_receipt`) | Người mua có xác nhận ngay; thêm một loại email |
| Không, chỉ có lịch sử trong app | Ít việc |

## DB19 — Email sắp hết hạn trước mấy ngày (Q-B5)

| Phương án | Trade-off |
|---|---|
| ✅ 7 ngày, dùng chung `renewal_notice_days_before` | Một setting cho hai loại email báo trước |
| Setting riêng | Linh hoạt hơn; thêm một key |

## DB20 — Ai bấm "Đã nhận tiền" (Q-B6)

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ admin (`settings.manage`) | Đúng quy ước "màn tiền chỉ admin" (GI9) |
| Cả editor | Nhiều người trực hơn; editor chạm tiền |

## DB21 — Tiền tới sau khi xóa tài khoản (Q-B7)

| Phương án | Trade-off |
|---|---|
| ✅ `needs_review`, admin hoàn tay ngoài hệ thống | Ngoại lệ duy nhất của "không hoàn tiền", vì không còn tài khoản để mở kỳ |
| Giữ tiền | Thu tiền mà không cung cấp dịch vụ |

## DB22 — Giá (Q-B8) và landing (Q-B9)

| Phương án | Trade-off |
|---|---|
| ✅ Giá là setting sửa trong admin | Đổi giá, khuyến mãi không cần deploy; đơn chốt số tiền lúc tạo |
| Giá cố định trong code | Ít việc; đổi giá phải deploy |
| Landing hiện giá | Khách thấy giá sớm; landing dựng sẵn nên lệch khi admin đổi giá |
| ✅ Landing không hiện giá | Giá chỉ ở `/app/plans` |

## DB23 — Màn tổng kết có quảng cáo (Q-B10)

| Phương án | Trade-off |
|---|---|
| Tách màn tổng kết ra địa chỉ riêng | Có quảng cáo ở tổng kết; phải đổi cách lưu kết quả phiên; rủi ro chính sách "màn Exit" |
| ✅ Bỏ màn tổng kết khỏi chỗ có quảng cáo, loại trừ cả `/app/practice` | Không đổi code phiên luyện; mất một chỗ quảng cáo |

## DB24 — Người dưới 16 tuổi (Q-B11)

| Phương án | Trade-off |
|---|---|
| ✅ Không tải quảng cáo | An toàn nhất; không cần cờ tuổi (chưa có cách gắn cho vignette) |
| Quảng cáo không cá nhân hóa | Thêm doanh thu nhỏ; phụ thuộc cờ tuổi chưa có cú pháp |

## DB25 — Đồng ý cá nhân hóa (Q-B12)

| Phương án | Trade-off |
|---|---|
| Hỏi người Free có muốn cá nhân hóa | Doanh thu cao hơn chút; phải tự làm hộp thoại (Google không có loại cho Việt Nam) |
| ✅ Luôn không cá nhân hóa, không hỏi | Không cần hộp thoại; vẫn có cookie giới hạn tần suất, Chính sách bảo mật phải nói |

## DB26 — Staff thấy quảng cáo (Q-B13)

| Phương án | Trade-off |
|---|---|
| Có (như hiện nay, staff không gói = Free) | Staff thấy đúng trải nghiệm người Free |
| ✅ Không | Không đếm lượt hiện của nội bộ; staff kiểm bằng tài khoản học viên thường |

## DB27 — Hộp thoại giới thiệu Pro khi đã có vignette (Q-B14)

| Phương án | Trade-off |
|---|---|
| Giữ song song (trang khác, ít lần hơn) | Thêm chỗ giới thiệu Pro; người Free gặp hai loại |
| ✅ Tắt hẳn | Không chồng nhau |

## Đề xuất kỹ thuật trong design (chờ duyệt cùng bản viết)

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| Lưu kỳ đã trả | Bảng mới `prepaid_periods` + `billing_orders` | Grant của staff; `subscriptions` với `cancel_at_period_end` | Grant cần người cấp là staff và trùng dòng giao dịch; subscription phải giả vờ "đã hủy gia hạn" và chỉ có tháng/năm |
| Kỳ 3 tháng trong giao dịch | Thêm `quarter` vào CHECK `interval` | Cột mới | Ít đổi nhất |
| Port nhà cung cấp | `PaymentProvider` có năng lực tùy chọn (checkout, đối soát, hủy; sự kiện tự gia hạn giữ nguyên) | Hai hệ riêng | Một adapter chung (DB6) |
| Sự kiện trả một lần | `payment_succeeded` (additive), đi qua inbox sẵn có | Bảng webhook riêng | Dùng lại dedupe, thử lại, xóa raw payload |
| Gọi payOS | SDK `@payos/node` 2.0.5, timeout ≤ 5 s, không retry, tắt log | Tự viết HTTP | Dùng thư viện chính thức; giữ quy ước gọi adapter |
| Bản giả | `PAYOS_FAKE_ENABLED` + trang checkout giả, chặn khi `BILLING_PRODUCTION` | Chỉ test bằng tiền thật | payOS không có sandbox |
| Đối soát | Job hằng giờ hỏi payOS các đơn `pending` | Chỉ tin webhook | Chưa rõ payOS gửi lại webhook thế nào |
| CSP cho AdSense | Spike `nonce` trong `proxy.ts`, `/app` dựng theo request; landing giữ CSP cũ | Bỏ CSP chặt cho `/app` | Google chỉ hỗ trợ CSP chặt; lỗi OpenNext #1302 chưa sửa nên phải thử trước |
| Ai thấy quảng cáo | `ads.show` tính ở API (Free, không staff, đủ 16 tuổi) | Tính ở web | API đã biết gói, vai trò, ngày sinh |
| Đếm hộp thoại giới thiệu Pro | `localStorage` theo user | Server | Server không biết hộp thoại đã hiện (D21 Bước 5) |
