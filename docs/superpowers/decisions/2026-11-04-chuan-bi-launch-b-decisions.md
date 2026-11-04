# Decisions — Chuẩn bị launch, đợt B

Ngày: 04/11/2026. Đi kèm design doc [`../specs/2026-11-04-chuan-bi-launch-b-design.md`](../specs/2026-11-04-chuan-bi-launch-b-design.md).
Gom các quyết định chốt trong chat 02–04/11/2026 cho đợt B (thanh toán VietQR qua payOS, quảng cáo). Research đi kèm (nhánh `docs/web-launch-research`):
`PAYMENT_WEB_LAUNCH_RESEARCH_2026-11-02.md`, `PRICING_INPUTS_RESEARCH_2026-11-04.md`, `WEB_ADS_RESEARCH_2026-11-02.md`,
`ADSENSE_LOGGED_IN_APP_RESEARCH_2026-11-04.md`, `EDU_APP_ADS_SURVEY_2026-11-04.md`.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn trong chat; "Theo đề xuất của Claude" = chủ dự án trả lời "theo rec của bạn"
(04/11/2026); "Chờ duyệt cùng design" = đề xuất kỹ thuật trong bản viết, chủ dự án chưa đọc lại; "Theo đề xuất của review" = chủ dự án trả lời "sửa theo review"
(04/11/2026) cho review độc lập [`../reviews/2026-11-04-chuan-bi-launch-b-design-review.md`](../reviews/2026-11-04-chuan-bi-launch-b-design-review.md). Ở những câu review nêu
phương án mà không chọn, Claude chọn phương án an toàn và đơn giản nhất khi sửa, và ghi rõ như vậy.

**Vòng sau review (04/11/2026):** DB28–DB42 là quyết định mới; DB13, DB16, DB17, DB21 có thêm một vòng. Các vòng trước giữ nguyên. Các phương án trong bảng của vòng này
là bản design trước review và các phương án review nêu; không thêm phương án nào khác.

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
| DB13 | Trang có vignette | Nhóm, Tra từ; vòng 3: đúng `/app/groups`, `/app/lookup` (DB38) | Chủ dự án (hai vòng; màn tổng kết bỏ ở DB23); vòng 3 theo review |
| DB14 | Video, tần suất | Không video; tần suất thấp | Chủ dự án |
| DB15 | Hạn của đơn chưa trả (Q-B1) | 15 phút | Theo đề xuất của Claude |
| DB16 | Chuyển thiếu hoặc thừa (Q-B2) | `needs_review`, chờ admin; vòng 2: so tổng các lần chuyển | Theo đề xuất của Claude; vòng 2 theo review |
| DB17 | Đang có Pro được cấp mà mua (Q-B3) | Nối sau kỳ được cấp; vòng 2: khoảng Pro liền mạch kể cả grant tương lai, `now` = giờ mở kỳ | Theo đề xuất của Claude; vòng 2 theo review |
| DB18 | Email biên nhận (Q-B4) | Có | Theo đề xuất của Claude |
| DB19 | Email sắp hết hạn trước mấy ngày (Q-B5) | 7 ngày, dùng chung setting | Theo đề xuất của Claude |
| DB20 | Ai bấm "Đã nhận tiền" (Q-B6) | Chỉ admin | Theo đề xuất của Claude |
| DB21 | Tiền tới sau khi xóa tài khoản (Q-B7) | `needs_review`, admin hoàn tay; vòng 2: rẽ trước `unknown-user`, giữ thông tin người chuyển tối đa 90 ngày, không gọi payOS khi xóa | Theo đề xuất của Claude; vòng 2 theo review |
| DB22 | Giá sửa ở đâu (Q-B8), landing hiện giá (Q-B9) | Trong admin; landing không hiện giá | Theo đề xuất của Claude |
| DB23 | Màn tổng kết có quảng cáo (Q-B10) | Không | Theo đề xuất của Claude |
| DB24 | Người dưới 16 tuổi (Q-B11) | Không tải quảng cáo | Theo đề xuất của Claude |
| DB25 | Đồng ý cá nhân hóa (Q-B12) | Luôn không cá nhân hóa, không hỏi | Theo đề xuất của Claude |
| DB26 | Staff thấy quảng cáo (Q-B13) | Không | Theo đề xuất của Claude |
| DB27 | Hộp thoại giới thiệu Pro khi đã có vignette (Q-B14) | Tắt hẳn | Theo đề xuất của Claude |
| DB28 | Danh tính một lần trả; luật cho đơn đã `paid` (RB-1) | Khóa `payos:<env>:<orderCode>:<reference>` / `manual:<order_id>`; `needs_review` chỉ cho đơn chưa có kỳ; xác nhận lần hai 409 | Theo đề xuất của review |
| DB29 | Cách sinh `order_code`, `description` (RB-3) | Sequence từ 10^9; `WM` + 7 ký tự base32 | Theo đề xuất của review (Claude chọn trong hai cách review nêu) |
| DB30 | Khi nào đơn thành `expired` (RB-4) | Theo câu trả lời của payOS; cập nhật có điều kiện; đệm 10 phút | Theo đề xuất của review |
| DB31 | Trạng thái payOS, vào `cancelled` (RB-5) | Bảng 7 trạng thái; `cancelled` chỉ khi API hỏi payOS | Theo đề xuất của review |
| DB32 | Tham số của `returnUrl` (RB-6) | `?order=<uuid>`, bỏ query payOS | Theo đề xuất của review |
| DB33 | Tạo đơn khi payOS lỗi (RB-7) | Commit trước; lỗi → `failed` + 503; thử lại là đơn mới | Theo đề xuất của review |
| DB34 | Port cho nhà cung cấp (RB-8) | Giữ `BillingAdapter`, thêm ba method; `payment_succeeded` ngoài `EVENT_TYPES` | Theo đề xuất của review |
| DB35 | Quy ước giờ hết của kỳ (RB-9) | Làm tròn `ends_at` lên 00:00 hôm sau theo múi giờ học viên | Theo đề xuất của review (Claude chọn trong hai cách review nêu) |
| DB36 | Kỳ trả trước trong cửa sổ Free của đợt A (RB-10) | Cắm vào loader của đợt A; thời điểm kết thúc = `ends_at` / `revoked_at` | Theo đề xuất của review |
| DB37 | `ads.show` mới làm ở đâu (RB-11) | M3, cùng hộp thoại | Theo đề xuất của review |
| DB38 | Nạp AdSense ở đâu; "Nhóm" là gì; dự phòng A1 (RB-12) | Chỉ nạp ở `/app/groups`, `/app/lookup`, rời thì tải lại cả trang; A1 sai → quay về hộp thoại | Theo đề xuất của review (Claude chọn phạm vi trang và dự phòng A1) |
| DB39 | CSP của `/app` (RB-13) | Theo mẫu Google, có `'unsafe-eval'` khi có AdSense; `assert:render-mode` | Theo đề xuất của review |
| DB40 | `ASSUMPTION` payOS, `expiredAt`, chữ ký (RB-14) | Bảng kiểm ở lần mua thật; giây + tự hủy link; tự viết chữ ký | Theo đề xuất của review |
| DB41 | Dữ liệu người chuyển (RB-15) | Không giữ trường người chuyển sau khi apply (trừ DB21 vòng 2); không `buyer*`; mục payOS ở M2 | Theo đề xuất của review |
| DB42 | Kỳ chưa bắt đầu trong snapshot (RB-19) | Trường riêng `upcoming_periods` | Theo đề xuất của review (Claude chọn trong hai cách review nêu) |
| DB43 | Đăng văn bản pháp lý mới (Q-B16) | Một bản lúc launch, có cả payOS và quảng cáo | Chủ dự án |
| DB44 | Loại tài khoản nối payOS (Q-B15) | Để tới lúc đăng ký payOS | Chủ dự án |

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

Vòng 3 (04/11, sửa theo review RB-12): quyết định của chủ dự án giữ nguyên; review chỉ ra "Nhóm" chưa rõ là trang `/app/groups` hay cả tab Nhóm (`currentTab` gộp
`groups|group|topic|review`). Chọn ở DB38: đúng `/app/groups` và `/app/lookup`. Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

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

**Vòng 2 (04/11, sửa theo review RB-5).** Review chỉ ra: so số tiền của **từng** webhook thì Lan chuyển 100.000 ₫ rồi 99.000 ₫ cho đơn 199.000 ₫ sẽ kẹt `needs_review` mãi;
payOS có trạng thái `UNDERPAID` và `amountPaid`, nên có trả thiếu rồi trả tiếp. Đánh giá "hiếm" cũng chưa chắc: FAQ về VietQR Pro chỉ nói cho liên kết VietQR Pro, còn design
dùng quy tắc mô tả 9 ký tự của tài khoản không liên kết qua payOS (loại tài khoản là câu Q-B15 cho chủ dự án). Lựa chọn của vòng 1 (không tự mở kỳ khi lệch) giữ nguyên.

| Phương án | Trade-off |
|---|---|
| So số tiền từng lần chuyển (bản trước review) | Đơn giản; trả thiếu rồi trả nốt vẫn kẹt chờ admin |
| ✅ So **tổng** các lần chuyển đã nhận của đơn với số đơn | Trả nốt cho đủ thì tự mở kỳ (§3.4 T4 → T2); thiếu hoặc thừa vẫn `needs_review` như vòng 1 |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Không coi trả sai tiền là hiếm cho tới khi biết loại tài khoản.

## DB17 — Đang có Pro do đội Wordmet cấp mà mua (Q-B3)

| Phương án | Trade-off |
|---|---|
| Kỳ mua bắt đầu ngay | Đơn giản; người mua mất các ngày trùng với kỳ được cấp |
| ✅ Nối sau kỳ được cấp, chốt lúc đơn `paid` | Không mất ngày đã trả; admin thu hồi grant sớm thì có khoảng trống (admin thấy được, cấp bù) |

**Vòng 2 (04/11, sửa theo review RB-9).** Review chỉ ra: luật chỉ xét "grant gói Pro **đang chạy**", trong khi D38 của Bước 5 cho tạo grant bắt đầu ở tương lai; "now" chưa
định nghĩa (giờ apply, `occurredAt` hay `transactionDateTime` không có múi giờ), nên sự kiện chờ thử lại hoặc chờ đối soát sẽ dời ngày bắt đầu. Lựa chọn của vòng 1 (nối sau,
chốt một lần) giữ nguyên.

| Phương án | Trade-off |
|---|---|
| `starts_at = max(now, ends_at của kỳ trả trước, ends_at của grant đang chạy)`, "now" không định nghĩa (bản trước review) | Bỏ sót grant tương lai nối liền; ngày bắt đầu phụ thuộc lúc sự kiện được apply một cách không rõ |
| ✅ `starts_at` = điểm hết của khoảng Pro liền mạch tính từ giờ mở kỳ, gồm mọi grant Pro chưa thu hồi (kể cả grant tương lai) và mọi kỳ trả trước; `transactionDateTime` chỉ để hiển thị | Không mất ngày khi các nguồn nối liền; grant tương lai **không liền** (có khoảng trống) vẫn trùng với kỳ mới, ghi là giới hạn đã biết (design LB1E31); kỳ chốt một lần nên grant tạo đè hay kỳ thu hồi giữa chuỗi không dời kỳ (LB1E32, LB1E33) |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Quy ước giờ hết ở DB35.

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

**Vòng 2 (04/11, sửa theo review RB-2: như viết thì không dựng được).** Lựa chọn của vòng 1 giữ nguyên; cách làm đổi. Review chỉ ra:
- eraser đổi `user_id` của dòng tiền thành id ngẫu nhiên; applier gặp id đó thì đi nhánh `unknown-user`, xóa `appUserId`, `payload`, `rawPayload`
  (`event-applier.service.ts:102-108`). Đơn không bao giờ thành `needs_review`, admin không còn dữ liệu để hoàn tiền (email cũng đã xóa), tức rơi đúng vào phương án "Giữ tiền";
- bản trước gọi `cancelCheckout` lúc xóa, nhưng `erase` chạy trong transaction (gọi nhà cung cấp ở đó trái R6) và người học tự xóa không có bước nào chạy trước.

| Phương án | Trade-off |
|---|---|
| Đi nhánh `unknown-user` có sẵn, xóa sạch payload (bản trước review, theo code hiện có) | Không giữ dữ liệu cá nhân nào; không hoàn tiền được |
| ✅ `payment_succeeded` rẽ sang `OrderApplier` trước nhánh `unknown-user`, tìm đơn theo `orderCode` + `paymentLinkId`; đơn ẩn danh (hoặc tài khoản `deleting`) → `needs_review` `account-deleted`; giữ trên đơn tên, số tài khoản, ngân hàng người chuyển (số tiền, `reference` ở lần trả); xóa khi admin "Đã xử lý" hoặc sau 90 ngày; ghi vào Chính sách bảo mật | Hoàn tiền tay được khi payOS gửi các trường người chuyển; giữ một ít dữ liệu cá nhân tối đa 90 ngày. Trường rỗng thì admin hỏi payOS/ngân hàng theo `reference`, không được thì là rủi ro đã biết |

Đơn `pending` lúc xóa tài khoản:

| Phương án | Trade-off |
|---|---|
| Gọi `cancelCheckout` trong bước xóa (bản trước review) | Gọi nhà cung cấp trong transaction (trái R6); người học tự xóa không có chỗ gọi trước |
| ✅ Bỏ khỏi bước xóa | Link sống 15 phút; job đối soát đánh `expired` hoặc hủy link như mọi đơn |
| Gọi sau khi commit, bỏ qua nếu lỗi | Thêm một bước sau Tx B ở cả hai đường xóa; job đã làm đúng việc này |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Thời hạn 90 ngày: review đề xuất "sau N ngày" mà không nêu số; Claude chọn 90 ngày cho trùng
thời hạn giữ `raw_payload` có sẵn (R23), để một job làm cả hai việc.

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

## DB28 — Danh tính một lần trả; luật cho đơn đã `paid` (RB-1, Critical)

Bối cảnh: inbox chỉ chặn trùng theo `provider:environment:externalEventId`; bản trước có ba đường vào (webhook, job đối soát, admin) mà không nói hai đường sau lấy
`externalEventId` từ đâu. Hai hàng When → Then cho cùng một tình huống (đơn `paid`, reference mới) cho hai kết quả (kỳ nối tiếp / `needs_review`), và "Đã nhận tiền" được bấm
trên đơn `needs_review` vốn đã có kỳ. Đường tạo hai kỳ cho một lần trả: admin xác nhận 14:20 → webhook 15:05 → `needs_review` → admin bấm lần nữa 15:10.

| Phương án | Trade-off |
|---|---|
| Dedupe theo `reference`; đơn `paid` nhận reference khác thì "kỳ nối tiếp" hoặc `needs_review`; "Đã nhận tiền" trên `pending`, `expired`, `needs_review` (bản trước review) | Mâu thuẫn; một lần trả có thể thành hai kỳ |
| ✅ Danh tính `payos:<env>:<orderCode>:<reference>` chung cho webhook và đối soát (lấy từ `transactions[]`), `manual:<order_id>` cho admin, lưu ở bảng các lần trả của đơn, ghi nguồn (`paid_via`); bảng quyết định theo (trạng thái đơn × nguồn × đã thấy chưa); `needs_review` chỉ cho đơn chưa có kỳ, bất thường trên đơn đã có kỳ là cờ; "Đã nhận tiền" khóa user → khóa đơn, đòi đơn chưa có kỳ, lần hai 409 | Một lần trả không bao giờ thành hai kỳ; thêm một bảng `billing_order_payments` và một cột cờ |

Trong phương án chọn, review để mở một chỗ: đơn `paid` (qua payOS, ref R1) nhận ref R2 thì "kỳ nối tiếp hoặc cờ xem lại, nhưng phải là một luật".

| Phương án | Trade-off |
|---|---|
| ✅ Kỳ nối tiếp khi tới bằng webhook và số tiền đúng bằng số đơn; số tiền khác, hoặc tới từ job đối soát với khóa chưa thấy, thì cờ | Giữ DB8 (chuyển khoản hai lần thì kỳ thứ hai xếp nối tiếp); job đối soát không bao giờ tự mở kỳ thứ hai (phòng `ASSUMPTION` P7 sai) |
| Luôn cờ xem lại | An toàn hơn chút; trái DB8, Lan trả hai lần phải chờ admin |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Design §3.4 (bảng T1–T14).

## DB29 — Cách sinh `order_code` và `description` (RB-3)

Bối cảnh: payOS gửi webhook thử đã ký bằng khóa thật với `orderCode: 123` khi đăng ký URL; sequence bắt đầu ở 1 sẽ trúng đơn thật từ đơn thứ 123. SDK khai `orderCode: number`
nên phải ≤ `Number.MAX_SAFE_INTEGER`; `description` tối đa 9 ký tự với tài khoản không liên kết qua payOS.

| Phương án | Trade-off |
|---|---|
| Chưa ghi cách sinh (bản trước review) | Có thể trúng webhook thử |
| ✅ Sequence `START 1000000000`, CHECK tới 32^7 − 1; `description` = `WM` + 7 ký tự base32 Crockford của `order_code` | Đơn giản, không cần thử lại khi trùng; đủ hàng chục tỷ đơn; mã tăng dần nên lộ số đơn (chấp nhận) |
| Số ngẫu nhiên trong `[10^9, 2^53 − 1]` có unique | Không lộ số đơn; phải thử lại khi trùng; không vừa 7 ký tự base32 |

Cùng với đó (review đề xuất): `OrderApplier` chỉ nhận khi `paymentLinkId` trùng đơn, `success === true`, `code === '00'`; ngược lại `ignored`, vẫn 2xx. Ai chốt: Theo đề xuất
của review (chủ dự án: "sửa theo review", 04/11/2026); review nêu hai cách sinh mà không chọn, Claude chọn sequence vì đơn giản hơn và cho mã vừa 9 ký tự.

## DB30 — Khi nào đơn thành `expired` (RB-4)

Bối cảnh: bản trước đánh `expired` khi quá `expires_at` mà không hỏi payOS và không có điều kiện khi ghi; job chạy hằng giờ ở cả API và worker. Hai đường sai: Lan trả sát giờ,
webhook chậm → `needs_review`; job đọc `pending`, webhook ghi `paid`, job ghi đè `expired`. Chữ "30 phút" trong bảng không khớp nhịp job.

| Phương án | Trade-off |
|---|---|
| Quá `expires_at` → `expired` (bản trước review) | Đơn giản; hai đường sai trên |
| ✅ Chỉ `expired` khi payOS báo `EXPIRED`/`CANCELLED`, hoặc sau khi tự hủy link `PENDING` quá hạn, hoặc quá `expires_at` + 24 giờ mà vẫn không hỏi được; mọi lần ghi là `UPDATE … WHERE status = 'pending'` dưới khóa; tiền tới đơn `expired` mà giờ giao dịch của payOS ≤ `expires_at` + 10 phút thì mở kỳ như thường; trang về nhờ API hỏi payOS ngay | Không ghi đè `paid`; Lan trả đúng hạn không phải chờ admin; dựa vào `transactionDateTime` là giờ Việt Nam (`ASSUMPTION` P9) cho phần "đúng hạn" |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Hai con số 10 phút và 24 giờ: review nói "một khoảng đệm" mà không nêu số; Claude chọn, ghi là
hằng số trong code.

## DB31 — Trạng thái payOS và cách vào `cancelled` (RB-5)

Bối cảnh: SDK khai 7 trạng thái (`PENDING`, `CANCELLED`, `UNDERPAID`, `PAID`, `EXPIRED`, `PROCESSING`, `FAILED`) kèm `amountPaid`, `amountRemaining`; bản trước chỉ ánh xạ
`getCheckout` chung chung. Đường vào `cancelled` ("Lan bấm hủy trên trang payOS") không có cơ chế: webhook chỉ gửi khi trả thành công, query trên `cancelUrl` không có chữ ký.

| Phương án | Trade-off |
|---|---|
| Ánh xạ chung, tin trang payOS báo hủy (bản trước review) | Không có cơ chế thật cho `cancelled`; trạng thái lạ chưa có luật |
| ✅ Bảng 7 trạng thái → trạng thái đơn và việc của job; `cancelled` chỉ khi API tự hỏi `getCheckout` (trang `cancelUrl` gọi API, API kiểm); so tổng tiền (DB16 vòng 2); ghi loại tài khoản ngân hàng và sửa đánh giá "hiếm" | Thêm một endpoint `check`; loại tài khoản cần chủ dự án trả lời (Q-B15 trong design) |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

## DB32 — Tham số của `returnUrl` (RB-6)

Bối cảnh: payOS gắn `code`, `id` (paymentLinkId), `cancel`, `status`, `orderCode` vào `returnUrl`/`cancelUrl`; tài liệu không nói query có sẵn của shop có được giữ không.

| Phương án | Trade-off |
|---|---|
| `/app/plans/order?id=<uuid>` (bản trước review) | Có thể nhận hai `id` hoặc chỉ `id` của payOS |
| ✅ `?order=<uuid>`, bỏ qua mọi query của payOS, trạng thái luôn hỏi API | Không đụng tên với payOS |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

## DB33 — Tạo đơn khi payOS lỗi hoặc quá giờ (RB-7)

Bối cảnh: bản trước không nói thứ tự transaction, trạng thái đơn khi payOS lỗi, mã trả về, việc thử lại cùng `Idempotency-Key` có dùng lại `orderCode` không (payOS từ chối mã
trùng), hay link đã tạo mà ta mất câu trả lời. `callAdapter` chỉ `Promise.race`, SDK thì hủy thật bằng `AbortSignal.timeout`.

| Phương án | Trade-off |
|---|---|
| Không có luật (bản trước review) | Plan phải tự đoán |
| ✅ Commit đơn trước, gọi payOS ngoài transaction (SDK timeout 4 s), rồi cập nhật đơn; lỗi → đơn `failed` (thêm vào CHECK), 503 `provider-unavailable` để interceptor nhả key; lần thử lại là đơn mới, `orderCode` mới; job hỏi payOS theo `orderCode` và hủy link mồ côi | Thêm trạng thái `failed`; payOS không bao giờ thấy mã trùng |
| Lỗi → đơn `cancelled` | Không thêm trạng thái; lẫn với đơn Lan tự hủy |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026); review nêu `failed` hoặc `cancelled`, Claude chọn `failed` để admin phân biệt lỗi của payOS với đơn
Lan tự hủy.

## DB34 — Port cho nhà cung cấp (RB-8)

Bối cảnh: bản trước đề xuất port mới `PaymentProvider` mà không nói nó thay `BillingAdapter` hay là lớp thứ hai; `externalSubscriptionId` đang bắt buộc trong type; thêm
`payment_succeeded` vào `EVENT_TYPES` làm đỏ test ghim 13 loại và ma trận 91 ô (`subscription-machine.spec.ts:300-303`); adapter tra DB trong `verify` cho kết quả cũ khi apply
chạy lại sau.

| Phương án | Trade-off |
|---|---|
| Port mới `PaymentProvider`, `payment_succeeded` trong `EVENT_TYPES`, adapter tra `order_code` → user (bản trước review) | Hai registry hoặc đổi tên khắp nơi; đỏ test ghim; dữ liệu tra cũ |
| ✅ Giữ `BillingAdapter` và registry, thêm `createCheckout`, `getCheckout`, `cancelCheckout` tùy chọn; `payment_succeeded` trong hằng riêng `ORDER_EVENT_TYPES` (kind `additive`); `externalSubscriptionId` được null; adapter chỉ trả `orderCode`, `paymentLinkId`, `amount`, `reference`; `OrderApplier` tìm đơn và user dưới khóa; `CheckoutState` theo SDK | Ít đổi nhất; test của gói tự gia hạn giữ nguyên; MoMo sau này vẫn khớp |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Thay dòng "Port nhà cung cấp" của bảng đề xuất kỹ thuật cũ.

## DB35 — Quy ước giờ hết của kỳ (RB-9)

Bối cảnh: `addMonthsClamped` giữ giờ (`cycle.ts:11-18`); web hiện "tới hết" bằng `ends_at − 1 ms`. Kỳ hết lúc 10:02 ngày 05/12 sẽ hiện "tới hết 05/12" mà Pro mất lúc 10:02;
các ví dụ của bản trước không cùng quy ước.

| Phương án | Trade-off |
|---|---|
| ✅ Làm tròn `ends_at` lên 00:00 của ngày hôm sau theo múi giờ của học viên (đúng 00:00 thì giữ) | Hiển thị ngày gọn và đúng ("tới hết 05/12" thì Pro còn tới hết ngày 05/12); kỳ đầu dư dưới một ngày; kỳ nối tiếp bắt đầu lúc 00:00 nên chuỗi không trôi trừ khi kẹp ngày cuối tháng |
| Giữ giờ, hiển thị kèm giờ ("tới 10:02 ngày 05/12") | Chính xác tuyệt đối; chữ dài hơn ở trang gói, email, lịch sử |

Áp chung cho trang gói, biên nhận, email sắp hết hạn. Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026); review nêu hai cách mà không chọn, Claude
chọn làm tròn vì học viên không bao giờ mất Pro trước ngày được ghi và web đã dùng quy ước `ends_at − 1 ms`.

## DB36 — Kỳ trả trước trong cửa sổ Free của đợt A (RB-10)

Bối cảnh: Q-A7 của đợt A cho cửa sổ lượt AI Free bắt đầu ở `max(đầu tháng, lúc kết thúc nguồn Pro gần nhất)`. Loader hiện chỉ đọc nguồn còn hiệu lực
(`sources.repository.ts:38-46`), nên nếu kỳ trả trước làm theo mẫu đó, lượt AI Lan dùng lúc còn Pro bị trừ vào lượt Free. Hai design được sửa song song với hợp đồng: đợt A sở hữu
cơ chế loader trả thêm các nguồn đã kết thúc từ đầu tháng địa phương, mỗi nguồn kèm thời điểm kết thúc.

| Phương án | Trade-off |
|---|---|
| Không nói gì (bản trước review: "lượt AI theo tháng dương lịch (đợt A)") | Lượt AI lúc còn Pro bị trừ vào lượt Free, trái Q-A7 |
| ✅ `prepaid_periods` cắm vào loader của đợt A: thời điểm kết thúc = `ends_at`, hoặc `revoked_at` khi thu hồi giữa chừng; kỳ thu hồi trước khi bắt đầu không phải nguồn; B thêm test | Một cơ chế cho mọi nguồn Pro; B phụ thuộc phần loader của A |

Cũng theo review: liệt kê các file hai đợt cùng sửa; câu "Gói Pro chưa mở bán" do B đổi ở M2. Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

## DB37 — Luật `ads.show` mới làm ở milestone nào (RB-11)

Bối cảnh: Q-B11 và Q-B13 áp cho cả hộp thoại giới thiệu Pro, nhưng bản trước để luật tuổi và staff ở M4 (chờ deploy và Google duyệt), trong khi hộp thoại ở M3.

| Phương án | Trade-off |
|---|---|
| Luật ở M4 cùng AdSense (bản trước review) | M3 chạy trước thì người dưới 16 tuổi và staff thấy hộp thoại |
| ✅ Luật ở M3 (cùng `IdentityService.isAtLeast`, test, kiểu web), M4 chỉ còn AdSense | Hộp thoại không bao giờ chạy với luật cũ |
| Luật ở M1 | Sớm hơn mức cần; M1 đã nặng |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026); review nêu M3 hoặc M1, Claude chọn M3 để nằm cùng PR với chỗ dùng nó.

## DB38 — AdSense nạp ở đâu; "Nhóm" là gì; luật dự phòng A1, A2 (RB-12)

Bối cảnh: bản trước dùng danh sách loại trừ của AdSense, và danh sách đó còn sót `group`, `group/backlog`, `topic`, `word`, các trang `(auth)`. Script AdSense nạp một lần rồi
ở lại qua các lần chuyển trang mềm, nên có thể theo cả ra landing, `/terms`, `/privacy` (chân trang dùng `next/link`). A1 (vignette có hiện khi chuyển trang mềm) và A2 (loại trừ
có áp sau chuyển trang mềm) chưa có luật nếu sai.

Cách nạp:

| Phương án | Trade-off |
|---|---|
| Nạp ở mọi trang `/app` của người Free, chặn bằng danh sách loại trừ (bản trước review) | Phụ thuộc A2; danh sách sót trang |
| Loại trừ đủ mọi route còn lại (cả `/en`) | Vẫn phụ thuộc A2; phải nhớ thêm mỗi khi có route mới |
| ✅ Chỉ nạp script khi trang hiện tại là trang được phép; rời sang trang khác khi script đã nạp thì tải lại cả trang; không nạp ở phiên luyện; link rời `/app` là `<a>` thường | Không phụ thuộc A2; người Free có quảng cáo rời Nhóm, Tra từ thì tải lại cả trang (chậm hơn chút) |

"Nhóm" là gì (review hỏi, không chọn):

| Phương án | Trade-off |
|---|---|
| ✅ Đúng `/app/groups` (và Tra từ đúng `/app/lookup`) | Ít trang có quảng cáo; không bao giờ có ở ôn thẻ `/app/review` hay trang nhóm |
| Cả tab Nhóm (`groups`, `group`, `topic`, `review`) | Nhiều chỗ hơn; gồm ôn thẻ, trái tinh thần "không hiện lúc đang làm câu" |

Nếu A1 sai (review nêu hai cách):

| Phương án | Trade-off |
|---|---|
| Chấp nhận doanh thu gần 0 | Vẫn tải script bên thứ ba mà không được gì |
| ✅ Quay về hộp thoại giới thiệu Pro (gỡ `NEXT_PUBLIC_ADSENSE_CLIENT`, giữ `ads.txt`) | Giữ chỗ giới thiệu Pro; ít script bên thứ ba hơn |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026); phạm vi "Nhóm" và cách xử lý A1 do Claude chọn (an toàn hơn, đơn giản hơn) vì review không chọn.

## DB39 — CSP của `/app` (RB-13)

Bối cảnh: header mẫu Google "specifically supports" có `'unsafe-eval'` và cảnh báo "More restrictive policies may break without notice"; bản trước bỏ `'unsafe-eval'` không lý
do, để `frame-src`, `img-src`, `connect-src` "đủ rộng" không có giá trị; Turnstile của đợt A ở trang đăng nhập nằm trong vùng nonce mới mà `'strict-dynamic'` bỏ qua danh sách host;
bỏ `/app` khỏi `assert:static` làm mất cái đang giữ D9 mà chưa có gì thay.

| Phương án | Trade-off |
|---|---|
| Bỏ `'unsafe-eval'`, giá trị "đủ rộng" chưa cụ thể (bản trước review) | Có thể vỡ không báo trước; plan không viết được test |
| ✅ Theo mẫu Google, có `'unsafe-eval'`, chỉ khi có AdSense; chuỗi đầy đủ cho từng directive; spike kiểm nonce trên mọi script, script chống nháy màu, beacon Cloudflare, Turnstile ở đăng nhập; `assert:render-mode` thay `assert:static`; mở rộng `csp.spec.ts`, ghim landing → app là tải lại cả trang | `/app` cho phép `eval` và `https:` ở ảnh, khung, kết nối khi bật quảng cáo |
| Lệch mẫu Google (không `'unsafe-eval'`), ghi rõ chỗ lệch và kiểm trong Report-Only | Chặt hơn; Google có thể đổi mã làm vỡ mà không báo |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

## DB40 — `ASSUMPTION` về payOS, `expiredAt`, chữ ký webhook (RB-14)

Bối cảnh: tài liệu payOS không nói đơn vị của `expiredAt` ("Unix Timestamp và kiểu Int32"), không công bố giới hạn `orderCode`, chính sách gửi lại webhook; `webhooks.verify` của
SDK là `async` và so bằng `!==` (`payos-lib-node/src/resources/webhooks/webhook.ts:51,64`, đọc 04/11/2026), trái với code facts §10.2 ("đồng bộ").

| Phương án | Trade-off |
|---|---|
| Liệt kê `ASSUMPTION` ở §10, không có dự phòng (bản trước review) | Plan và lần mua thật không biết làm gì khi sai |
| ✅ Một bảng "kiểm ở lần mua thật đầu tiên", mỗi dòng có cách kiểm và luật nếu sai; `expiredAt = floor(ms/1000)` có test, **và** job tự hủy link quá hạn; ghi cách sinh `description`; ghi rõ "không dùng `webhooks.verify`", tự viết bằng `timingSafeEqual` | Hạn 15 phút không phụ thuộc payOS hiểu đúng đơn vị; thêm một test đối chiếu chữ ký với SDK |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026).

## DB41 — Dữ liệu người chuyển và Chính sách bảo mật (RB-15)

Bối cảnh: webhook của payOS mang `counterAccountName`, `counterAccountNumber`, `counterAccountBankName`; logger chỉ che theo tên key nên các trường này không được che; bản trước
không nói giữ trường nào, có gửi `buyer*` không, và chỉ sửa Chính sách bảo mật ở M4 cho quảng cáo, trong khi bán qua payOS từ M2 là chuyển dữ liệu cho một bên mới.

| Phương án | Trade-off |
|---|---|
| Không nói (bản trước review) | Dữ liệu người chuyển nằm trong payload và có thể bị log |
| ✅ Payload chuẩn hóa chỉ `orderCode`, `paymentLinkId`, `amount`, `reference`, `transactionDateTime` (design thêm `source`, `success`, `code`, không phải dữ liệu cá nhân); không giữ `counterAccount*` trừ trường hợp DB21 vòng 2; không gửi `buyer*`; cấm log các trường người chuyển; mục payOS vào Chính sách bảo mật ở M2, trước khi bán | Ít dữ liệu cá nhân nhất; thêm một mục văn bản ở M2 |

Chi tiết khi dựng (Claude, để payload và raw khớp với "không giữ"): thông tin người chuyển đi trong payload tới lúc apply rồi bị xóa trong cùng transaction (chỉ chép sang đơn khi
tài khoản đã xóa); adapter bỏ `counterAccount*`, `virtualAccount*` khỏi `raw_payload`. Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Thời điểm
đăng văn bản là câu Q-B16 cho chủ dự án (design §9.2).

## DB42 — Kỳ chưa bắt đầu trong snapshot (RB-19, Minor)

Bối cảnh: đưa kỳ tương lai vào `sources[]` làm sai các chỗ web lấy nguồn đầu tiên (`PlansPage.tsx:42`, `TransactionsPage.tsx:81-82`).

| Phương án | Trade-off |
|---|---|
| Kỳ tương lai trong `sources[]` (bản trước review) | Sai các chỗ lấy nguồn đầu tiên |
| `sources[]` có `status: 'upcoming'` | Một danh sách; mọi chỗ đọc `sources` phải lọc thêm |
| ✅ Trường riêng `upcoming_periods` (và `pro_until` cho "Pro tới hết") | Chỗ đọc `sources` hiện có không đổi hành vi |

Ai chốt: Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026); review nêu hai cách, Claude chọn trường riêng vì không đổi các chỗ đang đọc `sources`.


## DB43 — Đăng văn bản pháp lý mới (Q-B16)

Bối cảnh: mỗi lần đăng phiên bản mới, học viên đã đồng ý bản cũ bị hỏi lại. Đợt B cần thêm phần payOS (trước khi bán) và phần quảng cáo (sau khi Google duyệt).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Một bản lúc launch có cả payOS và quảng cáo ("gói Free có thể hiển thị…") | Học viên đồng ý một lần; từ launch tới khi bật quảng cáo, văn bản rộng hơn những gì app làm |
| (b) Bản lúc launch chỉ có payOS, bản mới khi bật AdSense | Văn bản luôn khớp app; mọi học viên đồng ý thêm một lần |

## DB44 — Loại tài khoản nối payOS (Q-B15)

| Phương án | Trade-off |
|---|---|
| Tài khoản VietQR Pro (tài khoản ảo theo từng đơn) | Ngân hàng chặn chuyển sai số tiền, không phải xử lý tay; phí khoảng dưới 1.500 ₫/giao dịch theo trang giới thiệu payOS (chưa có bảng giá đầy đủ) |
| Tài khoản thường | Có thể không có phí đó; admin xử lý tay các lần chuyển sai (`needs_review`) |
| ✅ Để tới lúc đăng ký payOS | Design chạy được với cả hai; chọn khi thấy màn liên kết ngân hàng và giá thật |

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

Bảng trên là bản 04/11 trước review, giữ nguyên. Dòng "Port nhà cung cấp" đã thay bởi DB34; dòng "Đối soát" và "CSP cho AdSense" được làm rõ ở DB30, DB31, DB39.

## Đề xuất kỹ thuật thêm khi sửa theo review (chờ duyệt cùng bản viết, 04/11/2026)

Các chi tiết dựng không phải quyết định hành vi, Claude chọn khi viết lại design theo review; chủ dự án duyệt cùng bản viết.

| Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| Nơi giữ danh tính lần trả | Bảng `billing_order_payments` (unique `payment_key`, nguồn, số tiền, kết quả, kỳ đã mở) | Cột tổng tiền trên đơn | Admin xem từng lần chuyển; tính tổng dưới khóa; một lần trả có thể mở kỳ thứ hai (DB8) |
| Đơn admin đã xử lý xong | Trạng thái mới `closed` + `resolved_by`, `resolution_note`; trên đơn `paid` chỉ tắt cờ | Để `needs_review` mãi | Danh sách "Cần xem" chỉ còn việc chưa làm; thông tin hoàn tiền có chỗ để xóa |
| Thu hồi kỳ | `POST /v1/admin/prepaid-periods/:id/revoke` (`@Idempotent`, lý do), dòng giao dịch giữ nguyên | Đổi dòng giao dịch thành `reversed` | Tiền đã nhận thật; `reversed` đang dùng cho đảo hoàn tiền |
| Trang về hỏi payOS | `POST /v1/me/orders/:id/check`, tối đa một lần mỗi 10 giây mỗi đơn (cột `checked_at`), rate limit `user.write` | Rule rate limit mới | Không phải sửa union rule; Lan không chờ job hằng giờ |
| Claim của job đối soát | `UPDATE … SET checked_at … FOR UPDATE SKIP LOCKED … RETURNING`, tối đa 100 đơn mỗi lần | Không claim | Job chạy ở cả API và worker |
| Giá Lan thấy | `expected_amount` trong `POST /v1/me/orders`, khác giá → 409 `price-changed` | Lấy giá hiện tại không báo | Lan không bị tính giá khác giá vừa thấy |
| Trạng thái tài khoản khi apply | `IdentityService.accountStatus` nhận thêm `db`, đọc trong transaction sau khóa user | Đọc trước transaction | Tiền tới giữa Tx A và Tx B của việc xóa được coi là tiền tới sau khi xóa |
| `pro_until` trong snapshot | API tính điểm hết của khoảng Pro liền mạch, cùng hàm với `starts_at` | Web tự ghép các nguồn | Một chỗ tính, trang gói và email cùng con số |
| Bản giả | Cùng tên `payos`, `environment = 'sandbox'`, bảng `fake_payos_links`, trang giả có "Đã trả", "Trả thiếu", "Hủy" | Bản giả không có trạng thái | `getCheckout` cần trả lời được ở worker; smoke cần trả thiếu |
| Lỗi `localStorage` của hộp thoại | Không hiện | Hiện như chưa đếm | Không đếm được thì có thể hiện mỗi lần chuyển trang |
| CSP trước khi có AdSense | `/app` dùng nonce nhưng không có `'unsafe-eval'`, `https:` (chỉ thêm khi `NEXT_PUBLIC_ADSENSE_CLIENT` có giá trị) | Một chuỗi cho mọi trường hợp | Giữ `/app` chặt khi chưa có quảng cáo |
