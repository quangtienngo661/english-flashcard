# Decisions — Chuẩn bị launch, đợt A

Ngày: 04/11/2026. Đi kèm design doc [`../specs/2026-11-04-chuan-bi-launch-a-design.md`](../specs/2026-11-04-chuan-bi-launch-a-design.md).
Gom các quyết định chốt trong chat 02–04/11/2026 cho đợt A (Turnstile, security header, đợt sửa sau review, lượt AI cho Free, tắt trial). Design doc mô tả
*cách làm*; file này giữ *các phương án đã đưa ra và đã chọn gì*.
Cập nhật 04/11/2026 sau review độc lập [`../reviews/2026-11-04-chuan-bi-launch-a-design-review.md`](../reviews/2026-11-04-chuan-bi-launch-a-design-review.md):
thêm DA12 vòng 2, DA15 vòng 2, DA19 và mục "Đề xuất kỹ thuật thêm khi sửa theo review" ở cuối. Các vòng cũ giữ nguyên.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự chọn trong chat; "Theo đề xuất của Claude" = chủ dự án trả lời "theo rec của bạn"
cho câu hỏi đó (04/11/2026), tức chọn đúng đề xuất của Claude; "Chờ duyệt cùng design" = đề xuất kỹ thuật trong bản viết, chủ dự án chưa đọc lại;
"Theo đề xuất của review" = chủ dự án trả lời "sửa theo review" (04/11/2026) cho review độc lập. Ở chỗ review chỉ nêu phương án mà không đề xuất, file ghi
thêm "Claude chọn": phương án ✅ do Claude chọn khi sửa, chủ dự án cần đọc lại.

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
| DA12 | Không gọi được Cloudflare (Q-A4) | Vòng 1: từ chối (503). Vòng 2 (RA-6): `register`, `otp` từ chối; `login` cho qua, log cảnh báo | Vòng 1: theo đề xuất của Claude. Vòng 2: theo đề xuất của review (Claude chọn) |
| DA13 | Ảnh trong xem trước Markdown của admin (Q-A5) | Chỉ ảnh của chính site | Theo đề xuất của Claude |
| DA14 | e2e mock "Đặt mật khẩu" tài khoản Google (Q-A6) | Có | Theo đề xuất của Claude |
| DA15 | Pro về Free giữa tháng (Q-A7) | Không tính lượt lúc còn Pro. Vòng 2 (RA-14): limits grant có AI hết hạn giữa tháng cũng tính là nguồn kết thúc | Vòng 1: theo đề xuất của Claude. Vòng 2: theo đề xuất của review (Claude chọn) |
| DA16 | Free có limits grant có AI (Q-A8) | Chu kỳ theo grant như hiện nay | Theo đề xuất của Claude |
| DA17 | B2-3, B3-7, B4-4, UA-6 (Q-A9) | B3-7 làm; ba mục kia để sau | Theo đề xuất của Claude |
| DA18 | Ghi kết quả Google thật (Q-A10) | Chờ dữ liệu của chủ dự án | Theo đề xuất của Claude |
| DA19 | Trần AI mỗi ngày của Free (RA-10) | Trần riêng `free_ai_daily_cap`, mặc định 500 | Theo đề xuất của review |

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

Vòng 1 (04/11/2026, theo đề xuất của Claude):

| Phương án | Trade-off |
|---|---|
| ✅ Từ chối (503 `captcha-unavailable`) | Người thật không đăng ký được lúc Cloudflare lỗi (hiếm) |
| Cho qua | Bot lợi dụng được lúc đó; rate limit vẫn còn |

Vòng 2 (04/11/2026, review RA-6): vòng 1 chốt khi login chưa bị chặn, nên chỉ cân nhắc việc đăng ký. Sau Q-A1 vòng 2, từ chối nghĩa là Cloudflare lỗi thì
không ai đăng nhập được web hay admin; chỉ phiên đang mở còn sống nhờ `refresh`. Cũng không có cách tắt khẩn cấp: `off` và `fake` bị chặn khi
`BILLING_PRODUCTION=true`, nên muốn tắt Turnstile phải tắt luôn chế độ production, kéo theo mở cửa cho đồ giả (X-3). Các phương án do review đưa ra:

| Phương án | Trade-off |
|---|---|
| Giữ từ chối ở mọi route (vòng 1) | Đơn giản nhất; Cloudflare lỗi thì không ai đăng nhập được, kể cả admin; cách gỡ duy nhất là tắt `BILLING_PRODUCTION` |
| ✅ `login` cho qua khi Cloudflare lỗi, chỉ dựa vào rate limit và khóa tài khoản; `register` và `otp` vẫn từ chối | Đăng nhập (cả admin) vẫn chạy mà không ai phải làm gì; lúc lỗi, login chỉ còn lớp bảo vệ như trước khi có Turnstile; hai route gửi mail (lý do gốc của Turnstile) vẫn đóng, nên người mới chờ Cloudflare hồi |
| Công tắc khẩn cấp riêng (vd biến `TURNSTILE_EMERGENCY_BYPASS`, ghi log cảnh báo), kèm runbook trong checklist | Người vận hành quyết; phải phát hiện sự cố, đổi biến và khởi động lại API; công tắc có thể bị quên bật lại |

Vì sao chọn: review không đề xuất phương án nào, nên Claude chọn phương án an toàn và đơn giản nhất. Phương án này không cần người trực hay thao tác tay, lớp
bảo vệ lúc lỗi không thấp hơn hiện nay, và không bao giờ phải tắt `BILLING_PRODUCTION`. Chỉ lỗi phía Cloudflare (timeout, lỗi mạng, 5xx, `internal-error`
sau một lần thử lại) và lỗi secret mới được cho qua; token sai hay `success: false` vẫn 400.

**Ai chốt (vòng 2):** Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Review chỉ nêu phương án; phương án ✅ do Claude chọn, cần chủ dự án
đọc lại.

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

Vòng 1 (04/11/2026, theo đề xuất của Claude). Ví dụ: Lan dùng 200 câu AI lúc Pro, hết hạn 20/11.

| Phương án | Trade-off |
|---|---|
| Tính cả lượt lúc Pro (cách đếm hiện tại) | Không đổi query; Lan hết lượt Free tới 01/12 |
| ✅ Không tính: cửa sổ Free bắt đầu từ `max(đầu tháng, lúc kết thúc nguồn Pro/trial)` | Công bằng; `resolve()` trả thêm mốc kết thúc |

Ghi chú sau review (RA-2): `resolve()` không thấy nguồn đã kết thúc, vì loader bỏ chúng. Cách làm đổi thành loader trả thêm nguồn kết thúc từ đầu tháng và
một hàm thuần tính mốc (đề xuất kỹ thuật thêm, cuối file). Quyết định vòng 1 không đổi.

Vòng 2 (04/11/2026, review RA-14, hàng ⚑): Lan (Free) có limits grant 50 câu AI từ 10/11, grant hết hạn ngày 20/11. Có áp luật `max()` của vòng 1 cho limits
grant có AI không? Các phương án theo hàng ⚑ của review:

| Phương án | Trade-off |
|---|---|
| Không áp: sau khi grant hết, về tháng dương lịch từ 01/11 | Không thêm loại nguồn; lượt dùng thời grant bị tính vào Free 15, Lan hết lượt tới 01/12 |
| ✅ Áp: limits grant có `ai_*` > 0 là một nguồn kết thúc; cửa sổ Free bắt đầu từ lúc grant hết | Một luật cho mọi nguồn từng cho Lan cycle AI riêng, đúng ý vòng 1; tốn thêm tối đa một lượt Free (15 + 5) cho mỗi grant hết trong tháng; chỉ `admin` tạo được grant có `ai_*` (`grant-rules.ts`, `ai-limits-admin-only`), nên học viên không tự lợi dụng được |

Vì sao chọn: review không đề xuất; Claude chọn phương án nhất quán với vòng 1. Cơ chế mốc kết thúc đã phải làm cho Pro (RA-2), nên thêm limits grant chỉ là
một hàng nữa trong bảng mốc kết thúc, và rủi ro chi phí có trần.

**Ai chốt (vòng 2):** Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Review chỉ nêu câu hỏi; phương án ✅ do Claude chọn, cần chủ dự án
đọc lại.

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

## DA19 — Trần AI mỗi ngày của Free (review RA-10)

Bối cảnh: trần chung `ai_daily_cap` (mặc định 1000) đếm mọi lượt, không lọc theo gói (`usage.queries.ts:94-103`); chạm trần thì **mọi** người nhận
`ai-unavailable` (`ledger-rules.ts:40-46`). Khoảng 70 người Free dùng hết 15 câu trong một ngày là chạm trần. Mỗi tài khoản Free cần một email xác minh được,
mà email dùng một lần thì có sẵn. Design vòng đầu chỉ ghi "trần chung vẫn đếm cả lượt của Free (đã vậy)", chưa ghi rủi ro này.

| Phương án | Trade-off |
|---|---|
| (a) Chấp nhận, admin tự nâng trần khi cần | Không thêm gì; ngày bị dùng dồn thì người trả tiền cũng mất AI tới nửa đêm |
| ✅ (b) Trần riêng cho Free mỗi ngày (một setting nữa), kiểm cùng `lockAiDaily` | Người Pro luôn còn ít nhất `ai_daily_cap − free_ai_daily_cap` lượt; thêm một setting và một cột `usage_records.plan` (migration nhỏ) để đếm lượt của Free |
| (c) Giữ một phần trần cho người trả tiền | Cùng mục đích với (b), diễn đạt theo phần dành riêng cho Pro |

Review đề xuất "(b) nếu muốn bảo vệ Pro; (a) nếu Pro chưa bán (đợt B)". Chọn (b): đợt B mở bán Pro bằng VietQR trước launch, nên lúc launch đã có người trả
tiền cần bảo vệ. Mặc định 500 (một nửa trần chung mặc định); admin đổi trong Cài đặt; 0 = người Free không dùng được AI. Không nhận `null`.

**Ai chốt:** Theo đề xuất của review (chủ dự án: "sửa theo review", 04/11/2026). Con số mặc định 500 do Claude chọn, cần chủ dự án đọc lại.

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

## Đề xuất kỹ thuật thêm khi sửa theo review (04/11/2026)

Bảng trên giữ nguyên; các hàng dưới bổ sung hoặc làm rõ nó. Cột "Ai chốt": "Review" = theo đề xuất của review (chủ dự án: "sửa theo review"); "Claude chọn" =
review nêu nhiều cách hoặc chỉ nêu vấn đề, Claude chọn khi sửa, **chờ duyệt cùng design**.

| Đề xuất | Chọn | Bỏ | Vì sao | Nguồn | Ai chốt |
|---|---|---|---|---|---|
| Kiểm `hostname` | Một widget (một sitekey, một secret) cho `wordmet.com`, `www.wordmet.com`, `admin.wordmet.com`; biến `TURNSTILE_ALLOWED_HOSTNAMES` bắt buộc ở `real` | So với một host của web; suy danh sách từ `LEARNER_APP_URL`, `ADMIN_APP_URL` cộng `www`; hai widget | Token của admin và của `www` có hostname riêng; danh sách tường minh dễ đối chiếu ở checklist; hai widget cần hai secret mà API không biết token đến từ đâu | RA-1 | Review (chọn biến tường minh trong hai cách review nêu) |
| Mốc kết thúc nguồn Pro | Loader trả thêm mảng `ended` (nguồn kết thúc từ đầu tháng); hàm thuần `aiSourceEnds`, `lastAiSourceEnd`; cột `subscriptions.ended_at` có migration, ghi ở bốn chỗ ghi `status` qua `nextEndedAt`; design B cắm `prepaid_periods` vào loader và `aiSourceEnds` | Dùng `lastEventAt` (không migration); thêm field vào `resolve()` | `lastEventAt` tiến lên với mọi event sau, kể cả event chỉ được ghi, và không đổi khi job thời gian ghi `expired`, nên không cho mốc đúng; field trong `resolve()` luôn `null` vì loader bỏ nguồn đã kết thúc | RA-2 | Claude chọn (review nêu hai cách) |
| Thứ tự kiểm Turnstile | (a) Kiểm hình dạng token (không gọi mạng) → `auth.captcha.ip` 60/60 s/IP (chỉ `real`) → siteverify → `RateLimitGuard` của route | (b) Kiểm hình dạng → `RateLimitGuard` → siteverify | (a) giữ bộ đếm của người thật sạch khỏi token rác và có trần số lần gọi Cloudflare; đổi lại token hợp lệ bị tiêu khi route trả 429, nên form làm mới widget sau mọi response. (b) không tiêu token khi 429, nhưng request rác của bot ăn vào bộ đếm của cả IP | RA-4 | Review |
| Đặt guard | Decorator `@Turnstile(...rules)` = metadata rate limit + `UseGuards(TurnstileGuard, RateLimitGuard)`; token `optional()` trong schema, guard tự kiểm 1–2048 ký tự; `testConfig` để `off` | Decorator riêng đặt dưới `@RateLimit` (đúng hay sai tùy thứ tự viết) | Guard chạy trước pipe nên schema chưa kiểm token; schema là hằng nên không "bắt buộc tùy chế độ" được; một `UseGuards` hai guard giữ đúng thứ tự | RA-3 | Review |
| Làm mới widget | `reset()` và xóa token sau mọi response; `refresh-expired: 'auto'`; callback hết hạn hay lỗi tắt nút gửi | Chỉ làm mới khi `captcha-failed` | Token dùng một lần; sai mật khẩu hay 429 đều đã tiêu token | RA-5 | Review |
| Chế độ phía client | Site key rỗng → widget giả trả `fake-turnstile-token`; build production (web: app bật trên `https://wordmet.com`; admin: mode `production`) fail khi thiếu site key; E23 dùng widget thật với sitekey test, e2e khác dùng script giả qua `mockApi()` | Luôn tải script thật trong mọi e2e | Unit test, local, `pnpm bootstrap`, `admin-e2e-real` chạy không cần mạng; E23 vẫn kiểm được CSP với iframe thật; API ở `real` từ chối token giả | RA-7 | Review |
| `TURNSTILE_MODE` | Không có mặc định; thiếu thì API và worker dừng | Mặc định `real` | Lỗi khởi động nêu thẳng tên biến, giống `TERMS_VERSION`; production quên biến không thể chạy mà không có Turnstile | RA-8 | Claude chọn (review nêu hai cách) |
| Script đang dựng trial | B8E28 kiểm `trial_history` bằng SQL; `learner-test-setup --plan trial` bỏ điều kiện `trial_eligible`; `smoke-buoc-5` đòi `trial_eligible` false | Giữ nguyên script | `trial_eligible` nay luôn `false`, nên B8E28 đỏ và `--plan trial` lặng lẽ không làm gì | RA-9 | Review |
| Refund | Đòi dòng `use` `confirmed` của đúng `operation_id`, có `confirmed_at` trong cycle hiện tại (gộp vào B5-7) | Chỉ đòi có dòng `use` (B5-7 gốc) | Không cộng lượt Free cho câu dùng lúc còn Pro, hay cho câu tháng trước; với Pro, câu kỳ trước xác nhận sau khi gia hạn không hoàn nữa | RA-14 | Review |
| Thử lại siteverify | Timeout 5 s mỗi lần; lỗi mạng, timeout, 5xx, `internal-error` thử lại một lần với cùng `idempotency_key` | Không thử lại; "timeout ngắn" không ghi số | Trang Server-side validation khuyên thử lại khi `internal-error`; `idempotency_key` làm lần thử lại an toàn | RA-14, RA-27 | Review |
| `action` của widget | Không đặt, không kiểm | Đặt `action` riêng cho từng form và kiểm ở API | Không giảm số token bot cần; thêm một thứ phải giữ khớp giữa web, admin và app mobile sau này | RA-14 | Claude chọn (review: tùy chọn) |
| B2-6 | Sửa code: nhánh lỗi chỉ thử lại khi `lease.attempts` (DB) còn dưới `jobAttempts` | Ghi rõ vào design rằng có thể ~5 lượt | Việc cỡ S, làm cho lời hứa "3 lượt" của design đúng | RA-16 | Claude chọn |
| B5-6 | Sửa chữ design Bước 5: "chính xác lúc giữ chỗ; xác nhận muộn có thể vượt" | Kiểm trần dưới `lockAiDaily` khi xác nhận muộn | Vượt có trần (bằng số lần xác nhận muộn), trần lần gọi provider là lớp riêng; khóa toàn hệ thống trên đường `confirm` thêm tranh chấp | RA-16 | Claude chọn |
| CSP admin, style | `'unsafe-inline'` cho `style-src`; bỏ hai `ASSUMPTION` về hash và CSSOM | Hash cho thẻ `<style>` của React Aria | Đã chọn `'unsafe-inline'`, nên hai `ASSUMPTION` không còn cần; chuỗi CSP ghi một lần, một `script-src`, một rule `/*` | RA-16, RA-17 | Review |
| Ràng buộc "Free ≤ Pro" | Không thêm | Thêm theo mẫu `at_least` | Ràng buộc buộc Free về 0 trước khi đặt AI của Pro về 0; tắt AI cho mọi người đã có `ai_enabled` và `ai_daily_cap = 0` | RA-16 | Claude chọn |
| Đếm lượt của Free cho DA19 | Cột `usage_records.plan`, `reserve` ghi `resolved.plan`; `capUsedFree` lọc `plan = 'free'` | Suy gói lúc đếm bằng SQL theo nguồn hiện có | Gói được suy bằng `resolve()` trong TypeScript; SQL không suy lại đúng được (luật thời gian, `trialDenied`, grant) | RA-10 | Claude chọn |
| Ô landing | `free: boolean \| string`; hai ô AI của Free ghi "15/tháng", "5/tháng"; test web ghim chữ, test API ghim mặc định, cùng mã `LA3#16` | Giữ dấu có/không | Bảng hiện chỉ có dấu; lời hứa trên landing phải có thứ fail khi số đổi | RA-20 | Review |
| Bản nháp pháp lý | Đợt A (M3) sửa Chính sách bảo mật mục 3, 4 và Điều khoản mục 4, 9; Điều khoản mục 5 đi cùng mục 5–8 của đợt B; không ghi số vào văn bản | Dồn hết sang đợt B | Đợt A làm các câu đó sai; mục 5 vốn nằm trong phần đợt B viết lại; mỗi sự thật pháp lý ghi một lần | RA-11 | Review |
