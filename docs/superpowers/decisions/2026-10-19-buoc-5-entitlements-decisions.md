# Decisions — Bước 5: Entitlements & Usage (gói, quyền, hạn mức, cổng thanh toán; chỉ API)

Ngày: 18–19/10/2026. Đi kèm design doc [`../specs/2026-10-19-buoc-5-entitlements-design.md`](../specs/2026-10-19-buoc-5-entitlements-design.md). File này gom
mọi quyết định trong lúc brainstorm Bước 5, mỗi quyết định kèm các phương án **đã thật sự đưa ra trong chat**, trade-off và lựa chọn. Design doc mô tả *cách
làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*. Nguồn: nhật ký từng vòng hỏi đáp
[`../reviews/2026-10-18-buoc-5-brainstorm-log.md`](../reviews/2026-10-18-buoc-5-brainstorm-log.md).

> **Trạng thái 19/10/2026: đã chốt toàn bộ.** Ba phần design trình trong chat đã duyệt; khi đọc bản viết, chủ dự án sửa hai chỗ (D29, D30) rồi duyệt design
> ("Mình duyệt design Bước 5", 19/10).
>
> **Sau review độc lập 19/10/2026** ([`../reviews/2026-10-19-buoc-5-design-review.md`](../reviews/2026-10-19-buoc-5-design-review.md), 25 phát hiện): bốn câu
> sản phẩm chốt thành **D31–D34**; các sửa kỹ thuật chủ dự án duyệt hết ("ok"), ghi ở mục "Chọn thêm sau review độc lập".
>
> **Sau review plan 19/10/2026** ([`../reviews/2026-10-19-buoc-5-plan-review.md`](../reviews/2026-10-19-buoc-5-plan-review.md), 4 câu Q1–Q4): Q3 chốt thành
> **D35** (chỉ gia hạn tự động; bỏ kiểu "app tự gia hạn", thay một phần D3 và R11); Q4 chốt thành **D36** (bỏ email cảnh báo trần AI, chỉ báo trên màn
> admin; thay một phần D18); Q2 chốt thành **D37** (bộ nối bắt buộc gửi mã giao dịch; không biết giao dịch của kỳ đang dùng thì chỉ ghi lại; bổ sung D34); Q1
> chốt thành **D38** (staff sửa ngày của lần cấp đang có thay vì tạo lần cấp mới; lần cấp bắt đầu ở tương lai không thu hồi lần cũ; bổ sung D32). Không còn câu mở.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trong chat; "Đề xuất của Claude" = Claude đề xuất sau khi chủ dự án trả lời "chưa rõ",
không chọn, hoặc nhờ đề xuất, chủ dự án đồng ý; "Duyệt cùng design" = Claude đề xuất khi trình một phần design, chủ dự án duyệt cả phần.

**Cách hỏi ở Bước 5:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md), chủ dự án giữ cho Bước 5 (D1). Các câu chủ dự án nhờ research trước khi
trả lời (thanh toán, trial, giới hạn gói Free, hạn mức AI, quảng cáo, vòng đời gói) có file research riêng trong `docs/preparation/`; research chỉ nêu trade-off,
không chọn. Mục cuối ghi những chỗ Claude đề xuất trước khi chủ dự án trả lời.

## Tóm tắt

| # | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|
| D1 | Cách làm việc | Giữ như Bước 4 (D27): chủ dự án trả lời trước, không có phần lõi tự viết, chỉ review | Chủ dự án |
| D2 | Phạm vi Bước 5 | Gói và kiểm quyền thật, trial, cấp tay, hạn mức theo gói, lượt AI và giữ chỗ, công tắc AI, trần AI toàn hệ thống, người học xem gói; chỉ API | Chủ dự án |
| D3 | Thanh toán | Dựng sẵn cổng chung + bộ nối giả; thêm nhà cung cấp thật sau | Chủ dự án (cách hiểu "gần (b)": Claude, chủ dự án không sửa) |
| D4 | Mỗi gói gồm gì | Học và ôn mọi gói; luyện không AI Free có giới hạn; bài AI Pro; 2.000 từ/nhóm chống spam chung; từ riêng, câu ngữ cảnh không theo gói; lịch sử chung | Chủ dự án |
| D5 | Giới hạn luyện không AI của Free | Số phiên mỗi ngày; số câu mỗi phiên là con số chung; Pro giới hạn cao hơn | Chủ dự án (số câu mỗi phiên không theo gói: đề xuất của Claude, chủ dự án nhờ) |
| D6 | Staff làm gì | Bảng ở mục D6 | Chủ dự án |
| D7 | Editor cấp gói có AI | Cấp gói bình thường; không cấp lượt AI tùy ý; admin xem và thu hồi | Chủ dự án |
| D8 | Editor cấp/thu hồi cho ai | Chỉ người học thường | Chủ dự án |
| D9 | Staff dùng phía người học | Như Free; admin cấp khi test | Chủ dự án |
| D10 | Một lượt AI | Bảng ở mục D10 | Chủ dự án |
| D11 | AI tạo lại lần 2 | 1 lượt | Chủ dự án |
| D12 | Kho lượt AI | Mỗi tính năng một kho | Chủ dự án |
| D13 | Chu kỳ làm mới | Mỗi tháng từ ngày bắt đầu gói; gói năm cũng mỗi tháng | Chủ dự án |
| D14 | Cộng dồn | Không | Chủ dự án |
| D15 | Trial có giữ thẻ không | Có; không hủy thì tự lên Pro; chỉ khi có thanh toán thật | Chủ dự án |
| D16 | Trong trial và độ dài | Như Pro đầy đủ (tạm); 7 ngày | Chủ dự án (đầy đủ: theo đề xuất của Claude sau ước tính chi phí) |
| D17 | Số nhóm | Không theo gói | Chủ dự án |
| D18 | Các con số | Bộ mặc định ở mục D18 | Chủ dự án (phần "chưa rõ" và để trống: đề xuất của Claude) |
| D19 | Nhiều nguồn quyền | Đặt thẳng con số; thời hạn không nối; cấp thêm chỉ dời hạn | Chủ dự án (phần thời hạn: đề xuất của Claude, chủ dự án tạm chốt theo đề xuất) |
| D20 | Hạn của cấp tay | Mọi lần cấp có ngày hết hạn | Chủ dự án |
| D21 | Quảng cáo | Quyền "không quảng cáo" + cấu hình tần suất ở server | Chủ dự án |
| D22 | Nhắc trial; một trial | Cả hai, ưu tiên app tự gửi email; theo tài khoản và thẻ | Chủ dự án |
| D23 | Gia hạn lỗi | Giữ Pro thêm N ngày rồi khóa; N = 7; trial cùng luật | Chủ dự án (N = 7: đề xuất của Claude) |
| D24 | Hủy gói | Không hoàn tiền, dùng tới hết kỳ | Chủ dự án |
| D25 | Đổi tháng ↔ năm | Tháng → năm ngay; năm → tháng chờ hết năm, hủy được | Chủ dự án (đổi đang chờ, hủy được: đề xuất của Claude) |
| D26 | "Xong khi" | Như Bước 4 | Chủ dự án |
| D27 | Ai implement | Như Bước 4 | Chủ dự án |
| D28 | Cách dựng sổ lượt | (A) Đếm dòng trong sổ mỗi lần kiểm | Chủ dự án theo đề xuất của Claude (sau mô phỏng) |
| D29 | Email báo trước mỗi kỳ gia hạn | Làm sẵn, mặc định tắt; bật nếu luật sư nói bắt buộc | Chủ dự án ("phải cân nhắc"; mặc định tắt: đề xuất của Claude) |
| D30 | Trial lần hai | Chỉ một trial, hệ thống Wordmet quyết; tài khoản hoặc thẻ đã dùng trial thì không có Pro trong trial đó | Chủ dự án |
| D31 | Gói tự gia hạn quá kỳ chưa có thông báo (sau review) | Vẫn Pro thêm `grace_days` rồi khóa tới khi có thông báo | Chủ dự án (dùng chung `grace_days`, hỏi lại trạng thái: đề xuất của Claude) |
| D32 | Cấp gói khi người nhận đã có nguồn Pro (sau review) | Cấp Pro là gói mới: thu hồi lần cấp cũ, đặt lại mốc; người đang trả tiền → tắt tự gia hạn, không hoàn tiền; staff xác nhận; mốc theo nguồn bắt đầu gần nhất | Chủ dự án (cách làm cụ thể: đề xuất của Claude, chủ dự án "ok") |
| D33 | Editor thu hồi lần cấp có lượt AI (sau review) | Không; chỉ admin | Chủ dự án |
| D34 | Hoàn tiền một phần (sau review) | Có hoàn tiền (kể cả một phần) cho kỳ đang dùng → mất Pro ngay; hủy không hoàn → giữ tới hết kỳ; hoàn tiền chủ động chỉ admin | Chủ dự án (áp theo giao dịch được hoàn: đề xuất của Claude) |
| D35 | Gói phải tự gia hạn; người dùng trả trước khi hết kỳ (sau review plan, Q3) | Chỉ nhận gói tự gia hạn (store, Paddle/Stripe, MoMo subscription, ZaloPay Auto Debit); bỏ kiểu "app tự gia hạn" (trả tay từng kỳ) khỏi lõi Bước 5 | Chủ dự án (cách (e)); bỏ khỏi lõi: đề xuất của Claude, chủ dự án chốt |
| D36 | Cảnh báo trần AI khi chạm ngưỡng trong giờ cuối của ngày (sau review plan, Q4) | Bỏ email cảnh báo; API lượt AI trả cờ "đã chạm ngưỡng" để màn admin tô vàng (đợt giao diện); giữ cài đặt ngưỡng | Chủ dự án; chi tiết: đề xuất của Claude, chủ dự án chốt |
| D37 | Hoàn tiền khi không biết giao dịch nào thuộc kỳ đang dùng (sau review plan, Q2) | Bộ nối bắt buộc gửi mã giao dịch mỗi khi có trừ tiền; `plan_changed` kèm mã của kỳ mới; vẫn thiếu mã thì chỉ ghi lại và log, không cắt Pro | Đề xuất của Claude sau khi chủ dự án nói "khó xảy ra", chủ dự án chốt |
| D38 | Kéo dài hoặc hẹn trước lần cấp; lần cấp mới bắt đầu ở tương lai (sau review plan, Q1) | Staff sửa ngày của lần cấp đang có (API mới, có lịch sử sửa) thay vì tạo lần cấp mới; vẫn cho tạo lần cấp bắt đầu ở tương lai, và khi đó không thu hồi lần cấp cũ | Chủ dự án (sửa ngày, không thu hồi); chi tiết: đề xuất của Claude, chủ dự án "ok" |

## D1 — Cách làm việc

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ như Bước 4 (D27): chủ dự án trả lời trước, không có phần lõi tự viết, chỉ review | Chủ dự án hiểu hệ thống qua câu hỏi và bảng ví dụ; không tốn thời gian viết code |
| (b) Giữ cách hỏi và thêm một phần lõi chủ dự án tự viết (ví dụ phép tính "còn bao nhiêu lượt", luật bật trial) | Chủ dự án nắm sâu một phần; chậm hơn |
| (c) Bỏ cách hỏi, Claude đề xuất ngay | Nhanh hơn; chủ dự án dễ chỉ duyệt mà không tự nghĩ trước |

Chủ dự án: "a". Claude đồng ý: Bước 5 chủ yếu là luật và con số, không có một thuật toán lõi như lịch ôn.

## D2 — Phạm vi Bước 5

Bối cảnh: chỗ kiểm tạm của Bước 4 luôn "được phép"; ba (thực ra bốn) giới hạn là hằng số; AI chưa có (Bước 6, 7); Deploy dời tới khi app hoàn chỉnh; thanh toán
thật ngoài V1; Bước 4 chỉ làm API.

| Phần đưa ra | Trade-off nêu trong chat | Chủ dự án |
|---|---|---|
| 1. Gói Free / Trial / Pro và kiểm quyền thật | — | ✅ ok |
| 2. Trial | — | ✅ ok (sau đó đổi nghĩa theo D15) |
| 3. Cấp tay | — | ✅ ok, thêm yêu cầu hạn mức riêng từng người (D19) |
| 4. Hạn mức theo gói cho nhóm, từ mỗi nhóm, từ riêng | — | ✅ (sau đó thành không theo gói, D4, D17); hỏi chỉnh trong admin được không → trả lời: được qua API, màn hình ở đợt giao diện |
| 5. Lượt AI và giữ chỗ | Chỉ test được bằng bên gọi giả tới Bước 7; ~5–7 task; kéo theo phải chốt K18 | ✅ Bước 5 (sau khi Claude giải thích bằng ví dụ và đưa bảng khối lượng) |
| 6a. Công tắc AI | ~1 task | ✅ Bước 5 |
| 6b. Trần tiền AI mỗi ngày | Cần sổ chi phí Bước 6; ~2–3 task; làm ở Bước 5 thì cần sổ giả | ✅ Bước 5 (sau đó đếm bằng lượt, D18) |
| 7. Người học xem gói | — | ✅ ok |
| 8. Cổng sự kiện thanh toán | — | Nhờ research → D3 |
| 9. Giao diện | Bối cảnh: Bước 4 chỉ API; admin chưa có trang cài đặt; giao diện admin có thể refactor; chưa có app người học | ✅ (a) chỉ API; (b) thêm màn admin; (c) cả admin và người học |

Phương án thời điểm cho mục 5, 6 đưa ra: làm ở Bước 5 / để tới bước đầu tiên có thứ thật (5: Bước 7; 6: Bước 6) / tách đôi. Chủ dự án hỏi "chạm trần như thế nào"
(Claude giải thích bằng ví dụ), hỏi trần tiền và công tắc có phải chọn một không (không, hai chốt khác nhau), xin bảng khối lượng, rồi chọn ✅ "bước 5" cho cả ba.

## D3 — Thanh toán (mục 8)

Research: [`PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md`](../../preparation/PAYMENT_PROVIDERS_RESEARCH_2026-10-18.md) (Stripe không mở cho Việt Nam; Paddle nhận cá
nhân; cổng Việt Nam chủ yếu thanh toán một lần; mobile bắt buộc Apple/Google). Chủ dự án gửi một tài liệu billing của hệ thống khác để tham khảo (tách tiền và lượt;
gói năm mở lượt theo tháng; webhook là tín hiệu để đối soát lại; trial sổ riêng).

| Phương án | Trade-off |
|---|---|
| (a) Chỉ thiết kế cổng và các case trong design, không code | Ít việc; sau này thêm nhà cung cấp phải làm cả hộp sự kiện |
| ✅ (b) Code phần chung (hộp sự kiện chuẩn hóa, chống trùng, sai thứ tự, áp vào quyền Pro, hai kiểu gia hạn), test bằng nhà cung cấp giả | Thêm nhà cung cấp sau chỉ là một bộ nối; code chưa chạy với bên thật |
| (c) Như (b) và nối thật một nhà cung cấp ở môi trường thử | Kiểm được với bên thật; phải chọn nhà cung cấp trước khi biết hình thức kinh doanh |

Chủ dự án (trả lời dưới phương án (a)): "trước mắt là thiết kế provider trước đi, sau cần thì chỉ cần thêm payment service cần thiết vào thôi". Claude hiểu là (b),
ghi lại và mời sửa nếu khác; chủ dự án không sửa. Về tài liệu tham khảo, Claude cho rằng cấp lượt theo tỷ lệ, đổi tháng ↔ năm giữa kỳ, giữ "sức chứa" có lẽ chưa cần;
chủ dự án: "thiết kế thêm càng tốt, tăng độ chỉn chu" → design ghi đủ các case ở mức hành vi; phần code của từng case quyết theo D3 (b).

**Sửa theo D35 (19/10, sau review plan):** "hai kiểu gia hạn" trong (b) là phần Claude thêm khi hiểu câu trả lời, chủ dự án không chọn trực tiếp. D35 bỏ kiểu "app tự gia
hạn"; phần còn lại của D3 (b) giữ nguyên.

## D4 — Mỗi gói gồm gì

Bối cảnh: F31 (Free không AI; Trial, Pro có AI; Pro nhiều hơn Trial); D4 Bước 4 (bài điền từ AI thuộc gói trả phí); landing hứa Free "sử dụng vĩnh viễn" và trial không
cần thẻ.

| Dòng | Chủ dự án | Claude sau đó |
|---|---|---|
| Landing | "sửa được, không sao" | Ghi ở ⚠9 của design |
| Học và ôn | Free | Đồng ý |
| Bài luyện không AI | "free có giới hạn, muốn nhiều hơn thì lên pro" | → D5 |
| Bài AI | Pro | Hỏi lại trial ở D16 |
| Số nhóm (100) | Chưa hiểu hành vi người dùng | Research → D17 |
| Số từ mỗi nhóm (2.000) | "có vẻ ổn, tránh spam" | Đồng ý: giới hạn chung, không theo gói |
| Số từ riêng (1.000) | "không giới hạn sẽ hay hơn" | Đồng ý không theo gói, giữ trần kỹ thuật cao (con số ở D18) |
| Câu ngữ cảnh mỗi nghĩa (5) | "có thể không giới hạn không" | Như trên |
| Số câu mỗi phiên (20) | "giới hạn theo plan, bạn đề xuất" | → D5 |
| Lịch sử (6 tháng) | Free (chung) | Đồng ý |

Research: [`FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md`](../../preparation/FREE_PLAN_LIMITS_RESEARCH_2026-10-18.md).

## D5 — Giới hạn luyện không AI của Free tính theo gì

Claude đề xuất (chủ dự án nhờ): số câu mỗi phiên **không** làm giới hạn theo gói vì mở phiên mới là luyện tiếp; giới hạn đặt theo ngày. Chủ dự án "ok".

| Phương án | Trade-off |
|---|---|
| (a) Số câu mỗi ngày | Chính xác theo khối lượng; người học khó hình dung |
| ✅ (b) Số phiên mỗi ngày | Dễ hiểu; tổng câu/ngày = số phiên × số câu tối đa mỗi phiên |
| (c) Số câu mỗi phiên | Không giới hạn được tổng (mở phiên mới) |
| (d) Cách khác | — |

Câu phụ "Pro không giới hạn hay cao hơn": chủ dự án ✅ **giới hạn cao hơn** ("nếu không giới hạn thì xảy ra tình trạng tấn công thì mình sẽ là người thiệt").
Claude đề xuất luật đếm: phiên tính khi câu đầu có kết quả cuối, vào ngày của lúc đó; mở rồi bỏ khi chưa trả lời không tốn lượt (đưa vào phần 2 của design, đã duyệt).

## D6 — Staff được làm gì

Bối cảnh: D6 Bước 1 hẹn `entitlements.grant` (admin, editor), `ai.settings` (admin); `settings.manage` chỉ admin; lượt AI là tiền thật.

| Việc | Chủ dự án |
|---|---|
| Cấp gói (ví dụ Pro 30 ngày) | ✅ Admin và editor; **editor không cấp cho admin** |
| Cấp con số riêng không dính AI | ✅ Cả hai |
| Cấp lượt AI | ✅ Admin |
| Tự cấp cho chính mình | ✅ Admin |
| Thu hồi | ✅ Cả hai |
| Xem lịch sử | ✅ Cả hai |
| Chỉnh con số của từng gói | ✅ Admin |
| Bật/tắt công tắc AI | ✅ Admin |
| Chỉnh trần tiền AI | ✅ Admin |

Claude đồng ý; nêu chỗ vướng "editor cấp Pro (có AI)" → D7.

## D7 — Editor cấp gói Pro (có AI)

| Phương án | Trade-off |
|---|---|
| (a) Editor cấp gói nhưng không kèm lượt AI | Giữ đúng "chỉ admin cấp AI"; gói Pro của editor thiếu một phần |
| (b) Gói có AI chỉ admin cấp; editor chỉ con số không dính AI | Chặn chi phí; editor ít việc làm được |
| (c) Editor cấp Pro có AI nhưng giới hạn (số ngày mỗi lần, tổng lượt mỗi tháng) | Linh hoạt; thêm luật |
| ✅ (d) Cách khác — chủ dự án: "cấp riêng AI thì không được, gói thì cứ cấp bình thường… admin vẫn có thể quản lý lịch sử cấp của editor… sự khác nhau là cấp lượt AI sẽ không cố định, không khi cấp gói thì có" | Lượt AI của gói bị chặn bởi con số gói và trần mỗi ngày; admin xem và thu hồi |

Claude đồng ý; đề xuất thêm lịch sử lọc theo người cấp (chủ dự án "ok").

## D8 — Editor được cấp và thu hồi cho ai

| Việc | Chủ dự án |
|---|---|
| Cấp cho người học thường | ✅ Có |
| Cấp cho editor khác | ✅ Không ("bản thân editor cũng sẽ có quyền hạn riêng") |
| Thu hồi trên người học | ✅ Có |
| Thu hồi trên editor khác | ✅ Không |
| Thu hồi trên admin | ✅ Không |

Lý do hỏi dòng "cấp cho editor khác": hai editor cấp chéo thì vòng qua luật không tự cấp.

## D9 — Staff dùng phía người học với gói nào

| Phương án | Trade-off |
|---|---|
| (a) Staff tự động như Pro (hoặc gói "staff" không hết hạn), lượt AI như Pro | Tiện test; tốn AI không qua sổ cấp |
| ✅ (b) Như mọi người dùng (Free); admin cấp gói hoặc con số khi cần test | Một luật cho mọi tài khoản; mọi quyền thêm có lịch sử |
| (c) Không giới hạn gì, kể cả AI | Tiện nhất; rủi ro chi phí |
| (d) Cách khác | — |

## D10 — Một lượt AI tính thế nào

Bối cảnh: K17 hoãn đơn vị; ER6 (`ASSUMPTION` cũ); chấm bằng rule không tốn lượt; không còn ngân hàng câu (D3 Bước 4).

| Trường hợp | Chủ dự án |
|---|---|
| AI tạo một câu mới thành công | ✅ Tính 1 lượt |
| AI lỗi hoặc quá thời gian | ✅ Không tính |
| Làm lại một câu AI đã lưu | ✅ Không tính |
| AI tra nghĩa, người học dùng gợi ý | ✅ Tính |
| AI tra nghĩa, người học bỏ gợi ý | ✅ Tính |
| AI dịch bổ sung | ✅ Tính |
| Câu AI bị báo lỗi, staff xác nhận sai | ✅ Trả lượt về cho người dùng |
| Câu AI không qua kiểm tra, AI tạo lại lần 2 | Hỏi "là sao" → D11 |

Claude ghi thêm: dịch bổ sung hiếm, trừ vào kho bài AI (D12); hoàn lượt vào chu kỳ hiện tại (sau đó thành "giảm số đã dùng", D19).

## D11 — AI tạo lại lần 2

| Phương án | Trade-off |
|---|---|
| ✅ (a) 1 lượt khi cuối cùng có câu, dù gọi 1 hay 2 lần | Người học thấy công bằng; chủ dự án chịu tiền lần gọi thứ hai |
| (b) Mỗi lần gọi AI 1 lượt | Khớp chi phí; người học bị trừ vì lỗi của AI |
| (c) Cách khác | — |

Chủ dự án: "rủi ro chấp nhận để đem lại trải nghiệm tốt nhất cho người dùng".

## D12 — Một kho chung hay mỗi tính năng một kho

| Phương án | Trade-off |
|---|---|
| (a) Một kho chung | Đơn giản; một tính năng có thể ăn hết lượt của tính năng kia |
| ✅ (b) Mỗi tính năng một kho | Người học thấy rõ hai con số |
| (c) Kho chung, mỗi tính năng có trần riêng bên trong | Linh hoạt; khó hiểu hơn |
| (d) Cách khác | — |

Bối cảnh research: Grammarly một kho mỗi tháng; Mochi Cards tách lượt AI và lượt tra từ.

## D13 — Lượt AI của Pro làm mới thế nào

| Phương án | Trade-off |
|---|---|
| ✅ (a) Mỗi tháng từ ngày bắt đầu gói; gói năm cũng làm mới mỗi tháng | Giống tài liệu billing tham khảo và Grammarly; mốc riêng từng người |
| (b) Theo lịch (ngày 1, giờ người học); mua giữa tháng cấp đủ hoặc theo tỷ lệ | Dễ nói "đầu tháng"; tháng đầu lẻ |
| (c) Gói tháng như (a), gói năm cấp một lần cả năm | Người mua năm tự do; dễ dùng hết sớm |
| (d) Cách khác | — |

Trả lời luôn câu mở thứ nhất của K26. Claude đề xuất chi tiết (mốc UTC, lùi về ngày cuối tháng mà không trôi mốc, đổi tháng ↔ năm giữ mốc, cấp tay mốc = lúc bắt đầu).

## D14 — Cộng dồn lượt chưa dùng

| Phương án | Trade-off |
|---|---|
| ✅ (a) Không cộng dồn | Đơn giản, chi phí đoán được |
| (b) Cộng dồn có trần | Người học ít mất lượt; phức tạp hơn |
| (c) Cộng dồn không giới hạn khi còn gói | Hào phóng; chi phí khó đoán |
| (d) Cách khác | — |

Chủ dự án: "không cộng dồn, hết tháng thì reset lại về 0 nếu còn gia hạn, không còn gia hạn thì hủy gói". Claude hiểu "reset về 0" là số **đã dùng** về 0.

## D15 — Trial có giữ thẻ không

Chủ dự án nêu từ trước (khi đọc tài liệu tham khảo): nhiều app giữ thông tin thanh toán trong trial, không hủy thì tự gia hạn. Research:
[`TRIAL_MODELS_RESEARCH_2026-10-18.md`](../../preparation/TRIAL_MODELS_RESEARCH_2026-10-18.md) (giữ thẻ phổ biến, tỉ lệ lên trả phí cao hơn nhưng ít người bắt đầu; phải
nhắc trước khi trừ tiền; mobile store tự quyết).

| Phương án | Trade-off |
|---|---|
| (a) Không thẻ, tự bật (làm được ngay ở V1) | Có trial sớm; không tự lên Pro |
| ✅ (b) Giữ thẻ, không hủy thì tự lên Pro (chỉ khi có thanh toán thật) | Chuyển đổi cao; trước khi có thanh toán thì không có trial |
| (c) V1 không thẻ, có thanh toán thì chuyển sang giữ thẻ | Cả hai giai đoạn; hai luật |
| (d) Có cả hai cùng lúc (web không thẻ, mobile theo store) | Linh hoạt; hai luật |
| (e) Cách khác | — |

Hệ quả Claude ghi (chủ dự án không sửa): trước thanh toán thật chỉ có cấp tay; đổi K7; sửa landing; đề xuất cần email đã xác minh.

## D16 — Trong trial được gì, dài bao lâu

| Phương án | Trade-off |
|---|---|
| ✅ (a) Như Pro đầy đủ, cùng số lượt AI | Trải nghiệm đủ; chi phí trial cao hơn một chút |
| (b) Lượt AI riêng, ít hơn Pro, dùng cả thời gian trial | Tiết kiệm; người thử thấy ít hơn bản thật |
| (c) Chỉ phần không AI của Pro | Rẻ nhất; trial mất ý nghĩa "trải nghiệm AI" |
| (d) Cách khác | — |

Chủ dự án phân vân (a) và ít hơn, nhờ đo chênh lệch nếu ít hơn 20–30%. Claude ước tính theo giá Claude đọc ngày 19/10 (Haiku 5.5 $0,10/$0,50, Sonnet 5.5 $2/$10
mỗi triệu token; tỷ giá 25.860,56 đ/USD; `ASSUMPTION` 600 + 500 token mỗi lượt, 10% gọi lại, 400 lượt): một người dùng hết lượt tốn ~3.500 đ (Haiku) hoặc ~70.500 đ
(Sonnet); bớt 20–30% chỉ chênh ~700–1.000 đ (Haiku) hoặc ~14.000–21.000 đ (Sonnet), và chỉ với người dùng hết lượt. Claude đề xuất (a). Chủ dự án: "trước mắt là vậy
đi". Độ dài: **7 ngày** (đổi 14 ngày của K7).

## D17 — Số nhóm có theo gói không

Research: các app flashcard (Anki, Mochi Cards, Brainscape, RemNote, Knowt) không giới hạn số bộ thẻ ở Free; không có số liệu đo về số bộ thẻ một người tạo.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Không theo gói, chỉ trần kỹ thuật chung, admin chỉnh | Giống đa số app; Free và Pro chỉ khác phiên luyện và AI |
| (b) Free có giới hạn, Pro cao hơn | Thêm lý do lên Pro; có chuyện "vượt giới hạn" khi hạ gói |
| (c) Một con số như nhau cho mọi gói | Như (a) |
| (d) Cách khác | — |

Chủ dự án: "không".

## D18 — Các con số

Vòng 1: trần tiền — chủ dự án "sẽ tìm cách quy đổi sang credit hoặc quota"; cảnh báo — "75%, hoặc không cần cảnh báo"; trần kỹ thuật chung — "giữ nguyên"; phiên luyện —
"mình chưa rõ"; lượt AI — để trống. Claude đề xuất bộ số; chủ dự án hỏi chỉnh trong admin được không (được qua API, màn hình ở đợt giao diện), rồi "ok". Hai con số lượt AI:
chủ dự án nhờ research ([`AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md`](../../preparation/AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md)); Claude đề xuất giữ 300/100; chủ dự án
"tạm thời mình chốt theo hướng bạn đề xuất".

| Con số | Chốt |
|---|---|
| Phiên luyện không AI mỗi ngày | Free 3; Pro, trial 30 |
| Lượt bài AI / tra nghĩa mỗi chu kỳ | 300 / 100 (tạm) |
| Trần AI toàn hệ thống | **Đếm bằng lượt**, 1.000 lượt/ngày (tính cả lượt đang giữ) |
| Cảnh báo | 75%, email cho mọi admin, tối đa một lần mỗi ngày — **đổi theo D36** (19/10, sau review plan): bỏ email, chỉ báo trên màn admin khi chạm 75% |
| Từ riêng | 10.000 (thay 1.000, vì chủ dự án muốn "không giới hạn" ở D4) |
| Câu ngữ cảnh mỗi nghĩa | 20 (thay 5, cùng lý do) |
| Nhóm, từ mỗi nhóm, câu mỗi phiên | Giữ 100, 2.000, 20 |

Mọi số admin chỉnh. Claude ghi hai chỗ hiểu khác chữ "giữ nguyên" (từ riêng, câu ngữ cảnh) và mời sửa; chủ dự án "ok".

## D19 — Một người có nhiều nguồn quyền cùng lúc

Vòng 1 (phương án đưa ra): (a) lấy mức cao nhất / (b) cộng dồn / (c) con số riêng ghi đè, kể cả thấp hơn gói / (d) cách khác. Chủ dự án "chưa hiểu" → Claude viết lại bằng
ví dụ Lan (Pro 300 lượt, admin cấp 500; Pro tới 30/11, ngày 15/11 cấp thêm Pro 30 ngày).

Vòng 2: chủ dự án: "nên nghiêng về điều chỉnh số lượng quota hoặc credit trong tài khoản, không cần phải làm trước năng cộng hoặc trừ đi bao nhiêu". Claude hiểu:

| Ý | Chủ dự án |
|---|---|
| Staff đặt thẳng con số cho tài khoản, thay số của gói khi còn hạn, cao hay thấp đều được, hết hạn về số của gói | ✅ ok |
| Thấp hơn số đã dùng thì còn 0, không âm | ✅ ok |
| Hoàn lượt = giảm số đã dùng đi 1 | ✅ ok |
| Thời hạn: Pro khi còn ít nhất một nguồn, không nối tiếp (đề xuất thêm) | ✅ "reset qua mốc mới, 15/12" |

Vòng 4 (Claude hỏi "reset qua mốc mới" là gì): (i) chỉ dời ngày hết hạn, chu kỳ lượt giữ / (ii) tính lại từ đầu kể từ ngày được cấp. Chủ dự án chưa chọn, sau đó nói
"quyết định hiện tại thì tạm thời mình chốt theo hướng bạn đề xuất"; Claude đề xuất ✅ **(i)**, ghi là đề xuất của Claude được tạm chốt. Phần 2 của design (đã duyệt)
làm rõ: khi nguồn bắt đầu sớm nhất hết, chu kỳ theo mốc của nguồn còn lại.

## D20 — Cấp tay có bắt buộc ngày hết hạn không

| Phương án | Trade-off |
|---|---|
| ✅ (a) Mọi lần cấp có ngày hết hạn | Không có quyền "treo" quên thu hồi; tài khoản test phải cấp lại |
| (b) Admin cấp không thời hạn, editor bắt buộc có hạn | Tiện cho tài khoản test; dễ sót |
| (c) Như (b) và hạn tối đa cho editor | Chặt hơn với editor |
| (d) Cách khác | — |

Claude đề xuất thêm lọc "sắp hết hạn" (duyệt cùng design).

## D21 — Bước 5 làm gì cho quảng cáo

Yêu cầu mới của chủ dự án (19/10): app thương mại cần ads; Free có ads, trial và Pro không; tần suất không nhiều; nhờ research
([`ADS_INTEGRATION_RESEARCH_2026-10-19.md`](../../preparation/ADS_INTEGRATION_RESEARCH_2026-10-19.md)).

| Phương án | Trade-off |
|---|---|
| (a) Chỉ quyền "không quảng cáo" và cờ trong API xem gói | Ít việc; tần suất do app tự quyết |
| ✅ (b) Như (a) và cấu hình tần suất ở server, admin chỉnh | Đổi tần suất không cần phát hành app |
| (c) Như (b) và quảng cáo "xem để nhận thưởng", server kiểm xác nhận AdMob | Thêm doanh thu; thêm luật và rủi ro pháp lý (5 giây) |
| (d) Chưa làm gì ở Bước 5 | Không tốn gì; đợt giao diện phải quay lại |

Claude đề xuất chi tiết (duyệt cùng phần 2–3): công tắc mặc định tắt tới khi chốt tuổi tối thiểu và có bước hỏi đồng ý; 3 quảng cáo toàn màn hình/ngày, cách 10 phút;
chỉ ở chỗ nghỉ; app tự đếm.

## D22 — Nhắc trial; một trial tính theo gì

| Việc | Phương án | Chủ dự án |
|---|---|---|
| Ai gửi lời nhắc | (a) app tự gửi email lúc bắt đầu và trước ngày trừ tiền / (b) nhà cung cấp hoặc store / (c) cả hai | ✅ (c) cả hai, ưu tiên (a) |
| Một trial theo gì (web) | (a) tài khoản / (b) thẻ / (c) cả tài khoản và thẻ | ✅ (c) |

Claude đề xuất: email thứ hai 2 ngày trước ngày trừ tiền (ngày 5 của trial 7 ngày); kiểm theo thẻ cần mã nhận diện thẻ của nhà cung cấp; rủi ro trial lại sau khi xóa tài khoản
để Bước 8.

## D23 — Gia hạn lỗi

Chủ dự án chưa từng kiểm chứng, nhờ research ([`SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md`](../../preparation/SUBSCRIPTION_LIFECYCLE_RESEARCH_2026-10-19.md)); hỏi
"khóa ở đây là làm gì" (Claude giải thích: tạm như Free, gói chưa hủy, trả được tiền là có Pro lại).

| Việc | Phương án | Chủ dự án |
|---|---|---|
| Khi app được tự chọn | (a) khóa ngay / (b) giữ Pro thêm N ngày rồi khóa / (c) giữ suốt thời gian nhà cung cấp còn thử thu | ✅ (b) |
| Trừ tiền lần đầu sau trial lỗi | (a) cùng luật / (b) khóa ngay | ✅ (a) |

Claude đề xuất N = 7 (admin chỉnh 0–16), mở chu kỳ lượt mới trong lúc chờ, mobile theo store (Apple 3/16/28 ngày); chủ dự án "ok".

## D24 — Người dùng hủy gói

| Phương án | Trade-off |
|---|---|
| ✅ (a) Không hoàn tiền, dùng tới hết kỳ, ghi rõ trong điều khoản | Đơn giản, giống mặc định của store và Paddle; rủi ro với Điều 42 Luật 19/2023/QH15 cần luật sư |
| (b) Gói tháng như (a); gói năm hủy giữa chừng hoàn phần chưa dùng | Gần luật hơn; phải tính tiền hoàn |
| (c) Chưa chốt, chờ luật sư; design làm được cả hai | Không sai luật; để mở |

Claude ghi thêm (duyệt cùng): hoàn tiền do store, nhà cung cấp, ngân hàng vẫn xảy ra → bỏ Pro kỳ đó; rút lại hoàn tiền → trả Pro.

## D25 — Đổi gói tháng ↔ năm

| Phương án | Trade-off |
|---|---|
| ✅ (a) Tháng → năm đổi ngay (nhà cung cấp tính tiền chênh); năm → tháng đợi hết năm | Giống khuyến nghị của Apple, Google; người mua năm không mất tiền |
| (b) Mọi lần đổi có hiệu lực khi hết kỳ | Đơn giản; người muốn lên năm phải chờ |
| (c) Mọi lần đổi có hiệu lực ngay | Nhanh; năm → tháng phải tính hoàn |
| (d) Cách khác | — |

Chủ dự án chọn (a), rồi nhờ research chiều năm → tháng. Claude trả lời: phổ biến nhất là đợi hết năm (Apple, Google `DEFERRED`, Stripe schedule, nhiều trang trợ giúp);
cách khác: không cho đổi, hoặc đổi ngay tính theo tỷ lệ; Paddle chỉ đổi ngay (`do_not_bill` gần với "đợi hết năm", chưa kiểm). Claude đề xuất "đổi đang chờ", hủy được,
trong lúc chờ không đổi gì; chủ dự án "ok".

## D26, D27 — "Xong khi" và ai implement

| Việc | Phương án | Chủ dự án |
|---|---|---|
| "Xong khi" | (a) như Bước 4 / (b) như (a) và chạy tay vài kịch bản / (c) cách khác | ✅ (a) |
| Ai implement | (a) như Bước 4 / (b) Codex viết, Claude review và chạy test / (c) chính phiên brainstorm / (d) cách khác | ✅ (a) |

Claude ghi: "như Bước 4" sau D38 của Bước 4 nghĩa là không có e2e backend; chạy đua chỉ kiểm bằng smoke.

## D28 — Cách dựng sổ lượt (phần 1 của design)

| Phương án | Trade-off |
|---|---|
| ✅ (A) Mỗi lần kiểm đếm dòng trong sổ, khóa theo (người, kho) | Một nguồn số liệu, không lệch; server sập thì tự đúng sau 2 phút; đếm vài trăm dòng mỗi lần (nhỏ ở quy mô pilot) |
| (B) Bộ đếm theo chu kỳ + sổ để tra | Đọc nhanh; hai nơi phải luôn sửa cùng nhau; server sập thì thiếu lượt tới khi job dọn chạy |
| (C) Bộ đếm trong Redis | Nhanh nhất; Redis mất dữ liệu thì người học có lại lượt |

Chủ dự án: "mô phỏng mình xem" → Claude dựng mô phỏng bấm được (hai tab giành lượt cuối, AI lỗi, server sập, sự cố riêng của B và C); chủ dự án "ok" với đề xuất (A).

## D29 — Email báo trước mỗi kỳ gia hạn (khi đọc design, 19/10)

Đề xuất khi viết design: gửi 9 ngày trước mỗi lần gia hạn (≈ 7 ngày làm việc, vì Điều 42), để trống = tắt. Chủ dự án: "thường chỉ thông báo ở trial thôi, còn việc
đăng ký gói thì không cần phải thông báo, thông báo cũng tốt, nhưng cái này sẽ phải cân nhắc".

| Phương án | Trade-off |
|---|---|
| Bật mặc định 9 ngày (bản viết đầu) | An toàn với cách đọc Điều 42; gói tháng nhận email mỗi tháng |
| ✅ Làm sẵn, **mặc định tắt**; bật nếu luật sư nói bắt buộc | Giống thói quen của các app; nếu luật bắt buộc thì phải nhớ bật trước khi bán |

Email báo sắp hết hạn của gói "app tự gia hạn" (không tự trừ tiền) giữ, thành cài đặt `expiry_notice_days_before` mặc định 7. **Bỏ theo D35** (19/10, sau review plan: không còn gói "app tự gia hạn").

## D30 — Trial lần hai (khi đọc design, 19/10)

Đề xuất khi viết design: tài khoản hoặc thẻ đã dùng trial mà nhà cung cấp vẫn bắt đầu trial thì gọi `endTrialNow` nếu có, không thì ghi log và vẫn cho trial. Chủ dự án:
"chỉ cho phép trial 1 lần duy nhất, mà nó phải nằm ở hệ thống của mình cho phép hay không chứ, sao lại liên quan đến nhà cung cấp thanh toán?".

Claude giải thích: Wordmet đã chặn từ đầu (trang thanh toán không mời trial khi tài khoản không `trial_eligible`); chỉ lọt hai trường hợp: thẻ lộ ra sau khi nhập ở trang
nhà cung cấp, và store mobile tự cấp offer theo Apple ID / tài khoản Google. ✅ Chốt theo ý chủ dự án: Wordmet quyết — gói báo về là trial cho tài khoản hoặc thẻ đã có
trong `trial_history` thì **không có Pro trong thời gian trial đó** (vẫn Free); gọi `endTrialNow` nếu nhà cung cấp hỗ trợ để người dùng trả tiền ngay và có Pro như mua
thường. Bỏ phương án "vẫn cho trial".

## D31 — Gói tự gia hạn quá cuối kỳ mà chưa có thông báo (sau review, R2)

Bối cảnh: thông báo gia hạn thường tới trễ vài phút tới vài giờ, đôi khi mất; review chỉ ra design để gói hoặc thành Pro mãi (nếu chỉ tin thông báo) hoặc mất Pro
vĩnh viễn (nếu job ghi `expired` rồi `renewed` tới muộn).

| Phương án | Trade-off |
|---|---|
| (a) Vẫn Pro tới khi nhà cung cấp báo | Không làm phiền người trả tiền; thông báo mất thì Pro mãi |
| ✅ (b) Vẫn Pro thêm một khoảng (ví dụ 7 ngày) rồi khóa tới khi có thông báo | Chịu được thông báo trễ; có điểm dừng |
| (c) Khóa ngay ở cuối kỳ tới khi có "đã gia hạn" | Chặt; người trả tiền đúng hạn có thể bị khóa vài giờ |
| (d) Cách khác | — |

Claude đề xuất thêm (chủ dự án không phản đối): dùng chung `grace_days`; trong khoảng chờ job hỏi lại trạng thái (`fetchState`) nếu bộ nối hỗ trợ; trial quá hạn chưa
có thông báo cũng vậy; `renewed` tới muộn luôn đưa gói về `active`.

## D32 — Cấp gói khi người nhận đã có nguồn Pro (sau review, R8)

Vòng 1 (Q2 của review), ví dụ Lan trả Pro từ 1/11, được cấp "Pro tới 15/12" ngày 15/11, gói trả tiền hết 30/11, đã dùng 300 lượt từ 16/11:

| Phương án | Trade-off |
|---|---|
| (a) Như design: theo mốc của nguồn còn lại | Không lưu thêm gì; có lúc cho thêm lượt, có lúc 0 lượt nhiều ngày |
| (b) Giữ chu kỳ cũ tới khi hết mọi nguồn Pro | Dễ hiểu với người học; phải lưu mốc đang dùng cho từng người |
| (c) Chu kỳ mới ngay lúc nguồn cũ hết | Đơn giản; người học có thể được thêm một chu kỳ lượt |
| (d) Cách khác | — |

Chủ dự án: "nếu cấp gói mới thì gói cũ hủy và gói mới được kích hoạt chứ, sao lại giữ nguyên gói cũ". Claude tách hai trường hợp (gói cũ do staff cấp / gói cũ trả
tiền qua nhà cung cấp) và hỏi trường hợp trả tiền: (a) không cho cấp gói khi đang trả tiền / (b) cho cấp, gói trả tiền vẫn chạy và vẫn trừ tiền / (c) cho cấp và báo nhà
cung cấp tạm dừng / (d) khác. Chủ dự án (✅ cách khác): "nếu cấp thì reset lại mốc, không hoàn tiền thì đúng hơn… nếu cấp thì hủy gói cũ và dùng gói mới… chỉ trừ khi có
sự cố trong gói và thu hồi cấp thì mới hoàn tiền".

Claude đề xuất cách làm, chủ dự án "ok": cấp Pro là gói mới (lần cấp cũ tự thu hồi, mốc đặt lại); người đang trả tiền tự gia hạn → hệ thống tắt tự gia hạn, không hoàn
tiền, phần kỳ đã trả còn lại vẫn Pro; staff phải xác nhận; hoàn tiền khi có sự cố do staff làm bằng tay; mốc theo nguồn Pro bắt đầu gần nhất. Riêng "trên iPhone app có
thể không tắt được tự gia hạn thay người dùng (chưa kiểm)": chủ dự án "cái này sẽ handle sau, lưu vào context giúp mình" → ghi ở design mục 10, 19.

## D33 — Editor thu hồi lần cấp có con số lượt AI (sau review, R12)

Ví dụ: admin Hà đặt "lượt bài AI: 0 tới 31/12" để chặn Minh spam AI; editor An thu hồi lần cấp đó thì Minh dùng lại AI.

| Phương án | Trade-off |
|---|---|
| (a) Được, như luật hiện tại | Editor tự xử lý được; gián tiếp mở lại AI, trái tinh thần D7 |
| ✅ (b) Lần cấp có con số lượt AI chỉ admin thu hồi | Khớp D7; editor vẫn thu hồi được lần cấp khác |
| (c) Editor chỉ thu hồi lần cấp do editor tạo | Rõ ràng theo người cấp; chặn cả lần cấp không dính AI của admin |
| (d) Cách khác | — |

## D34 — Hoàn tiền một phần (sau review, R24)

Chủ dự án hỏi "bối cảnh này bị gì mà hoàn tiền" → Claude nêu ba tình huống (Apple tự hoàn phần tháng chưa dùng khi nâng lên năm; staff hoàn một phần khi có sự cố;
người dùng khiếu nại store hoặc ngân hàng). Chủ dự án: hoàn tiền chủ động "phải qua admin"; hỏi "store có tự quyết không?" → Claude trả lời theo research và trang Apple
đọc lại 19/10 (Apple có; Google 48 giờ đầu là Google, sau đó developer; ngân hàng tự quyết chargeback; web chủ yếu do admin).

| Phương án | Trade-off |
|---|---|
| ✅ (a) Như hoàn toàn phần: mất Pro ngay | Một luật đơn giản: có hoàn tiền là hết Pro |
| (b) Giữ Pro, chỉ ghi lại | Không cắt người dùng vì khoản hoàn nhỏ; dễ bị lợi dụng khiếu nại |
| (c) Cắt ngắn kỳ theo tỉ lệ tiền hoàn | Công bằng theo số tiền; phức tạp, khó giải thích |
| (d) Cách khác | — |

Chủ dự án: "nếu hoàn tiền thì đồng nghĩa với pro mất, còn nếu trường hợp hủy mà không mất tiền thì giữ cho tới hết kỳ". Claude đề xuất (chủ dự án không phản đối): áp
cho kỳ của giao dịch được hoàn, để khoản Apple tự hoàn khi nâng tháng → năm không cắt kỳ năm vừa trả; admin muốn đền bù mà giữ Pro thì cấp thêm thay vì hoàn tiền.

## D35 — Chỉ gia hạn tự động; bỏ kiểu "app tự gia hạn" (sau review plan, Q3)

Bối cảnh: review plan (Q3) hỏi hoàn tiền một lần trả trước của gói "app tự gia hạn" (VNPay, payOS: mỗi kỳ người dùng tự bấm trả; R11 cho trả lúc còn hạn và nối kỳ).
Chủ dự án: "làm sao lại có trả trước, tháng nào trả tháng đó thôi". Claude giải thích vì sao có trả trước và đưa ba cách (a)–(c); chủ dự án nhờ "research kĩ chỗ này
lại" → [`EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md`](../../preparation/EARLY_MANUAL_RENEWAL_RESEARCH_2026-10-19.md) (Google Play prepaid plan cộng dồn khi mua sớm và
cho tắt việc mua sớm; Spotify, YouTube cộng dồn có trần; MoMo subscription cho app tự gọi trừ tiền tới ngày; Galaxy Play gia hạn qua liên kết MoMo; không tìm thấy chính
sách công khai của app Việt Nam). Ví dụ dùng khi hỏi: tháng của Lan hết 30/11, ngày 25/11 Lan bấm trả.

Vòng 1 — tính lần trả trước khi hết kỳ thế nào:

| Phương án | Trade-off |
|---|---|
| (a) Không cho trả trước | Không có kỳ trả trước; Lan quên trả thì mất Pro một lúc; vẫn cần luật cho lần trả trùng |
| (b) Cho trả, tính từ ngày trả | Đơn giản; Lan mất 5 ngày đã trả; rủi ro khiếu nại, luật chưa kiểm |
| (c) Cho trả, nối từ cuối kỳ (R11 lúc đó) | Không mất ngày; có kỳ "đã trả nhưng chưa tới" và câu hoàn tiền cho kỳ đó |
| (d) Chỉ cho trả trong N ngày cuối, nối từ cuối kỳ | Kỳ trả trước tối đa một kỳ; trang thanh toán phải mở nút theo ngày |
| ✅ (e) Tự trừ tiền mỗi kỳ (MoMo subscription, ZaloPay Auto Debit) | Người dùng không phải nhớ ngày, không có trả trước; chỉ dùng được với cổng có tự trừ; VNPay, payOS phải chọn (a)–(d) |

Chủ dự án: "dùng cách e thôi, mình không design app theo hướng user phải nhớ đến ngày và chủ động trả, mà phải tự gia hạn nếu cần, nếu người dùng phải lo việc trả trước
sẽ rất phiền cho đôi bên, hệ thống cũng phải tự xử lý phức tạp hơn".

Vòng 2 — lõi Bước 5 giữ kiểu "app tự gia hạn" không:

| Phương án | Trade-off |
|---|---|
| ✅ (i) Bỏ khỏi lõi: lõi chỉ có gói tự gia hạn; với MoMo/ZaloPay, việc Wordmet gọi lệnh trừ tiền mỗi kỳ nằm trong bộ nối (viết khi có tài khoản thật) và bộ nối báo về `renewed` / `renewal_failed` như mọi nhà cung cấp | Lõi ít luật hơn, ít thứ phải test khi chưa có cổng thật; phần trừ tiền và thử lại dồn vào bộ nối MoMo/ZaloPay sau này |
| (ii) Giữ `renewal = app` trong lõi, thêm job của lõi tự gọi trừ tiền | Lõi lo lịch trừ tiền cho mọi cổng kiểu này; thêm việc ở Bước 5 mà chưa có cổng thật để thử |

Claude đề xuất (i). Chủ dự án hỏi "mình có chốt 2 kiểu gia hạn hả?"; Claude kiểm lại: không chọn trực tiếp — "hai kiểu" do Claude thêm khi hiểu câu trả lời D3 là (b),
rồi đi theo các phần đề xuất chủ dự án duyệt chung (phần 3: "email báo trước 7 ngày khi gói 'app tự gia hạn' sắp hết"; R11 trong danh sách "ok" sau review). Chủ dự án:
"Chốt đề xuất Q3: bỏ kiểu app tự gia hạn khỏi lõi, ghi D35, sửa design, decision record và plan."

Hệ quả (design mục 0 "Sau review plan"): bỏ sự kiện `payment_succeeded` (13 loại sự kiện, bảng 9.4 còn 91 ô), cột `subscriptions.renewal`, dòng `app:<user_id>` và
luật R11, 30/365 ngày, email "báo sắp hết hạn" và cài đặt `expiry_notice_days_before`, ca B5E56, B5E57, B5E69; câu Q3 về hoàn tiền kỳ trả trước không còn. VNPay, payOS
không dùng cho gói tháng/năm. Rủi ro còn mở: MoMo subscription có mở cho loại hình kinh doanh của Wordmet không (chưa xác minh, research 18/10); nếu không, người dùng Việt
Nam chỉ trả bằng thẻ qua Paddle/Stripe hoặc qua store.

## D36 — Cảnh báo trần AI: bỏ email, chỉ báo trên màn admin (sau review plan, Q4)

Bối cảnh: D18 chốt cảnh báo khi lượt AI cả hệ thống trong ngày chạm 75% trần, email cho mọi admin, tối đa một lần mỗi ngày. Plan tạo cảnh báo bằng job mỗi giờ
(chạy theo giờ khởi động server, không theo giờ cố định), nên chạm ngưỡng trong giờ cuối của ngày có thể không có email. Ví dụ dùng khi hỏi: trần 1.000; job chạy
23:15 (đã dùng 700) và 00:15; lúc 23:40 lên 760 → ngày đó không có email. Chủ dự án hỏi "cron job?"; Claude trả lời job hiện không chạy theo giờ cố định và chưa có
thư viện cron, rồi hỏi lại.

| Phương án | Trade-off |
|---|---|
| (1) Chấp nhận lọt | Không thêm việc; có ngày không có email dù đã vượt ngưỡng |
| (2) Chạy theo giờ cố định (đúng :00, thêm 23:55) | Khoảng lọt còn vài phút cuối ngày; thêm cách hẹn giờ |
| (3) Lần chạy đầu sau nửa đêm xét lại ngày hôm qua | Không mất email; email tới sau nửa đêm |
| (4) Tạo cảnh báo ngay lúc giữ lượt AI | Nhanh nhất; mỗi lần giữ lượt chậm thêm ở khóa chung mọi người dùng AI xếp hàng |
| ✅ (5) Bỏ email, chỉ làm nổi bật trên giao diện | Không job, không email, không lọt; admin chỉ thấy khi mở màn admin |

Chủ dự án: "mình nghĩ bỏ luôn phần này cũng được, chỉ cần làm nổi bật trên giao diện là đạt 75%, ví dụ nổi vàng lên". Claude đồng ý và đề xuất chi tiết: giữ cài đặt
`ai_cap_alert_percent` (mặc định 75) làm ngưỡng tô vàng; `GET /v1/admin/entitlements/ai-usage` trả thêm cờ `alert_reached`; màn admin tô vàng ở đợt giao diện; bỏ email,
loại thông báo `ai_cap_alert`, hàm lấy email admin, ca B5E15, B5E16, phần email của B5#16, lựa chọn 7 của plan. Đánh đổi: không ai được báo nếu không mở màn admin; trần
vẫn chặn AI đúng lúc. Chủ dự án: "CÓ NHÉ".

## D37 — Hoàn tiền khi không biết giao dịch nào thuộc kỳ đang dùng (sau review plan, Q2)

Bối cảnh: D34 cắt Pro khi hoàn tiền cho giao dịch của kỳ đang dùng, chỉ ghi lại khi hoàn cho giao dịch khác. Wordmet biết giao dịch của kỳ đang dùng nhờ lưu mã ở mỗi
lần trừ tiền. Plan lúc đó: `current_transaction_id` null (tin "gói bắt đầu" không bắt buộc kèm mã) thì mọi lần hoàn tiền đều cắt Pro. Ví dụ dùng khi hỏi: ngày 1/11 Lan
mua gói tháng (tin báo không có mã); ngày 10/11 nâng lên gói năm; Apple tự hoàn phần tiền tháng 11 chưa dùng → Wordmet không biết đó là tiền tháng hay tiền năm. Chủ dự án
hỏi "là sao", rồi "nguyên nhân". Claude giải thích: tin "gói bắt đầu" không bắt buộc mã (trial chưa trừ tiền; có nhà cung cấp tách tin "bắt đầu" và tin "đã thu tiền");
và phát hiện thêm design thiếu mã ở `plan_changed`, nên B5E87 (hoàn phần tháng khi nâng lên năm → vẫn Pro) không chạy đúng kể cả khi có mã.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Bộ nối bắt buộc gửi mã mỗi khi có trừ tiền (gói bắt đầu không có trial, đổi gói có trả tiền ngay, gia hạn); tin đầu thiếu mã thì bộ nối tự hỏi thêm nhà cung cấp | Trường hợp "không biết mã" gần như hết (chỉ còn lúc trial, khi chưa có gì để hoàn); bộ nối thật phải làm thêm việc lấy mã |
| (b) Giữ mã không bắt buộc, chọn một trong: cắt Pro / giữ Pro / hỏi lại nhà cung cấp | Bộ nối đơn giản hơn; phải chịu một trong ba cách sai khi thiếu mã |

Chủ dự án hỏi "tình trạng không có mã có xảy ra không, như mình thấy là khó xảy ra". Claude kiểm tài liệu 19/10: Apple — mọi tin báo về gói kèm thông tin giao dịch đã ký
(https://developer.apple.com/documentation/appstoreservernotifications/data); Google — tin báo chỉ có mã mua hàng, Google bắt buộc server gọi lại API để lấy đủ thông tin
(https://developer.android.com/google/play/billing/rtdn-reference); Paddle — tin `subscription.created` có `transaction_id` (đoạn trích tìm kiếm của
https://developer.paddle.com/webhooks/subscriptions/subscription-created); MoMo, ZaloPay — Wordmet tự gọi lệnh trừ tiền (câu trả lời có kèm mã: chưa kiểm). Kết luận: thiếu mã
chỉ xảy ra khi bộ nối viết thiếu. Claude đề xuất (a), thêm: `plan_changed` kèm mã của lần trả cho kỳ mới; ca còn lại (vẫn nhận hoàn tiền khi `current_transaction_id` null)
→ chỉ ghi lại và log để admin xem, không tự cắt Pro. Chủ dự án: "Chốt Q2 theo đề xuất: bộ nối bắt buộc gửi mã giao dịch, plan_changed kèm mã kỳ mới, thiếu mã thì chỉ ghi
lại và log."

## D38 — Kéo dài, hẹn trước lần cấp; lần cấp Pro bắt đầu ở tương lai (sau review plan, Q1)

Bối cảnh: D32 nói cấp Pro là gói mới, lần cấp cũ tự thu hồi; R12 cho đặt `starts_at` ở tương lai. Plan thu hồi ngay lúc tạo. Ví dụ dùng khi hỏi: Lan được cấp Pro tới
30/11; ngày 10/11 editor cấp thêm Pro 1/12–31/12 → thu hồi ngay thì Lan là Free từ 10/11 tới 1/12.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| (i) Thu hồi ngay (plan lúc đó) | Đúng chữ D32; Lan mất Pro giữa hai lần cấp |
| (ii) Thu hồi lần cũ đúng vào `starts_at` của lần mới | Không mất ngày; không có job "bật" lần cấp đúng giờ (quyền tính lúc đọc) |
| ✅ (iii) Không thu hồi khi hai khoảng không chồng nhau | Không mất ngày; cần luật cho khi chồng nhau |

Chủ dự án: "không thu hồi". Claude đề xuất: lần cấp mới bắt đầu ở tương lai không thu hồi gì, chồng ngày thì cả hai cùng tính (Pro tới ngày muộn hơn, từ ngày bắt đầu
của lần mới lượt AI đếm lại từ đầu); lần cấp bắt đầu ngay thì vẫn như D32. Chủ dự án hỏi: "cho mình cái lý do mà user đang dùng giữa tháng mà lại cấp một gói vào tháng sau,
nó có ý nghĩa gì không". Claude nêu hai lý do: kéo dài cho người đang được cấp (chưa có thao tác kéo dài, và cấp mới bắt đầu ngay thì lượt AI đếm lại giữa tháng); hẹn trước
(phần thưởng "Pro tháng 12", lớp học bắt đầu 1/12).

Vòng 2:

| Phương án | Trade-off |
|---|---|
| (a) Giữ như đề xuất vòng 1 (cho đặt ngày bắt đầu ở tương lai, không thu hồi) | Không thêm API; kéo dài phải tạo lần cấp mới nối tiếp |
| (b) Bỏ ngày bắt đầu ở tương lai; muốn nối thì cấp mới từ hôm nay | Bỏ được câu Q1; không hẹn trước được; lượt AI đếm lại; đổi R12 |
| ✅ (c) Thêm thao tác sửa ngày của lần cấp đang có | Kéo dài không đổi chu kỳ lượt AI; thêm một API; vẫn phải chọn (a)/(b) cho hẹn trước |

Chủ dự án: "thay vì vậy thì đều chỉnh ngày hiệu lực của gói đó sang một ngày khác trong tương lai, hơn là cấp 1 gói mới". Claude đề xuất bốn điểm: (1) API
`PATCH /v1/admin/entitlements/grants/{id}` đổi `ends_at` (dời ra hay rút ngắn, miễn vẫn ở tương lai) và `starts_at` (chỉ khi chưa bắt đầu); (2) luật quyền như thu hồi
(editor chỉ lần cấp của người học thường; lần cấp có con số lượt AI chỉ admin, D33; lần cấp đã thu hồi hoặc hết hạn → 409 `grant-not-active`; bắt buộc lý do;
`user.write`); (3) bảng lịch sử sửa (ai sửa, ngày cũ → mới, lý do), như lịch sử cài đặt — cách đơn giản hơn là chỉ lưu lần sửa cuối, mất các lần trước; (4) vẫn cho tạo
lần cấp bắt đầu ở tương lai (R12) và khi đó không thu hồi lần cũ (câu trả lời vòng 1). Chủ dự án: "ok".

## Đề xuất kỹ thuật được duyệt cùng design

**Chọn** (phần 1, 2, 3 trình trong chat, chủ dự án duyệt từng phần: "ok", "ok", "mình duyệt"):
- Module `entitlements` mới, chỉ gọi module khác qua service export; Practice sửa nhỏ: `practice.basic` là quyền (mọi gói), hạn mức phiên kiểm riêng khi mở phiên, ghi
  nhận phiên khi câu đầu có kết quả trong cùng transaction; Learning, Content đọc bốn giới hạn từ Settings.
- 5 loại dữ liệu: lần cấp tay, gói đăng ký, hộp sự kiện thanh toán, lịch sử trial, sổ lượt (thêm bảng chống gửi trùng email khi viết design).
- Nhiều lần đặt con số riêng cho cùng kho: lần mới nhất thắng; con số AI > 0 cho tài khoản Free thì dùng được AI.
- Chu kỳ AI theo nguồn Pro bắt đầu sớm nhất còn hiệu lực; trial lên Pro thì mốc đặt lại ở lần trừ tiền đầu.
- Hoàn lượt trừ vào số đã dùng của chu kỳ hiện tại, không xuống dưới 0.
- Trần AI theo ngày giờ Việt Nam, khóa chung cho mọi lần giữ lượt AI; cảnh báo một lần mỗi ngày (email bỏ theo D36).
- Dùng lại `settings.manage` cho mọi con số, công tắc, trần; bỏ `ai.settings` của D6 Bước 1; thêm `entitlements.grant`.
- Email trial, email sắp hết hạn (bỏ theo D35), email cảnh báo trần (bỏ theo D36) không bị trần 80% của email nhắc học.
- API người học `GET /v1/me/entitlements`; API staff cấp, thu hồi, lịch sử (lọc người cấp, sắp hết hạn), xem một người, lượt AI hôm nay.
- Webhook: kiểm chữ ký → lưu hộp (bỏ trùng) → trả lời theo kiểu nhà cung cấp → áp; lỗi thì job mỗi giờ thử lại; sự kiện cũ hơn trạng thái thì bỏ; hỏi lại trạng thái khi bộ
  nối hỗ trợ.
- Bộ nối giả và lệnh `pnpm billing:fake-event` (không mở endpoint test); lệnh `pnpm entitlements:fake-ai` cho smoke kiểm chạy đua.
- ~~Kiểu "app tự gia hạn": thanh toán một lần → 30/365 ngày; email báo trước 7 ngày khi sắp hết hạn.~~ Bỏ theo D35 (19/10, sau review plan).
- Mã lỗi: 403 `quota-exhausted` (không dùng 429), 503 `ai-unavailable`, 409 `grant-not-allowed`.

**Thêm khi viết design**, chủ dự án đọc từng điểm (đã viết lại bằng ví dụ khi chủ dự án nhờ "rõ ràng hơn") ngày 19/10: email báo trước mỗi kỳ gia hạn → sửa thành D29;
trial bị dùng lại → sửa thành D30; sự kiện không nhận ra người dùng → `ignored`, thử áp lại tối đa 5 lần, body webhook tối đa 64 KB ("64kb không phải là một con số lớn, có
thể chấp nhận được"); mã `grant-not-active` ("ok"); khoảng cho phép của các cài đặt, `ASSUMPTION` ("mình ok với con số này, có thể chỉnh sửa sau được"); sau khi Bước 5 lên
mọi tài khoản là Free, admin tự cấp ("ok"); `trial_eligible` cần email đã xác minh.

**Bỏ (và vì sao):**
- Trial không thẻ tự bật (K7): chủ dự án chọn trial giữ thẻ (D15).
- Hạn mức theo gói cho nhóm, từ riêng, câu ngữ cảnh (D23 Bước 3): không có app flashcard nào giới hạn kiểu này ở Free; chủ dự án chọn không theo gói (D4, D17).
- Số câu mỗi phiên làm giới hạn theo gói: không giới hạn được tổng (D5).
- Trần chi bằng tiền ở Bước 5: chủ dự án muốn quy đổi sang quota; Bước 5 chưa có giá mỗi lần gọi (D18).
- Bộ đếm theo chu kỳ, bộ đếm Redis (D28).
- Email báo trước mỗi kỳ gia hạn bật mặc định (D29); vẫn cho trial khi tài khoản hoặc thẻ đã dùng trial (D30).
- Quảng cáo "xem để nhận thưởng" (D21).
- Mua, hủy, đổi gói từ phía app ở Bước 5: làm cùng bộ nối thật và giao diện.
- Quyền `ai.settings` riêng: trùng `settings.manage`.

**Chọn thêm sau review độc lập** (Claude đề xuất khi sửa design theo review; chủ dự án đọc danh sách một dòng mỗi điểm và trả lời "ok", 19/10; chi tiết ở design mục 0,
bảng "Sau review độc lập"):
- R1: thông báo chia loại trạng thái (theo `occurred_at`) và cộng thêm (luôn áp, chống trùng theo mã giao dịch); payload tối thiểu từng loại.
- R2, R3: không có trạng thái cụt; bảng đủ trạng thái × sự kiện; bảng chuyển theo thời gian.
- R4: kiểm hạn mức phiên sau khi đóng phiên cũ. R5: task sửa `smoke:buoc-4`.
- R6, R7: hợp đồng giữ lượt cho bên gọi (transaction ngắn, không gọi AI khi giữ khóa, một `reserve` mỗi transaction); bảng luật `confirm`, lý do nhả.
- R9, R18, R19: email có trạng thái và cửa sổ gửi, trần 95% hạn mức email, job nhận dòng bằng `FOR UPDATE SKIP LOCKED`.
- R10, R11, R16, R17, R23: luật `fetchState`, bộ nối giả có trạng thái; gói "app tự gia hạn" một dòng mỗi người (R11 **bỏ theo D35**); webhook raw body, 64 KB, nhận GET; sự kiện `sandbox`
  không áp ở production; xóa `raw_payload` sau 90 ngày.
- R12: khoảng hợp lệ của con số riêng, luật `starts_at`, số phiên = 0, API cấp thêm 404.
- R13: smoke tạo dữ liệu và lùi thời gian bằng SQL, N request song song. R14: `INSERT … ON CONFLICT DO NOTHING`. R15: API xem gói chỉ cần đăng nhập.
- R20, R22: sửa bảng Identity, sửa chữ. R21: điều kiện hoàn lượt theo số đã xác nhận. R25: đường trial không đòi email xác minh; hai tài khoản cùng thẻ.

## Chỗ Claude đề xuất trước khi chủ dự án trả lời

- Câu 16 vòng 4 ("reset qua mốc mới"): chủ dự án nói tạm chốt theo hướng Claude đề xuất trước khi Claude đưa đề xuất cho câu này; Claude đề xuất (i) ngay sau đó (D19).
- Phần còn lại: các đề xuất đưa ra sau câu trả lời của chủ dự án, khi chủ dự án nhờ ("bạn đề xuất giúp mình", "mô phỏng mình xem", "research"), hoặc khi trình design
  từng phần.
