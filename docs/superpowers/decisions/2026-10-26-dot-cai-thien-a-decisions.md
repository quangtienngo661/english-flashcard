# Decisions — Đợt cải thiện, nhóm A (giao diện người học)

Ngày: 26/10/2026. Đi kèm design doc [`../specs/2026-10-26-dot-cai-thien-a-design.md`](../specs/2026-10-26-dot-cai-thien-a-design.md). Câu hỏi, đề xuất và câu
trả lời nguyên văn: [`../reviews/2026-10-26-dot-cai-thien-questions.md`](../reviews/2026-10-26-dot-cai-thien-questions.md) (câu 1–28, "Kiểm câu trả lời", "Kiểm
lần 2"). File này gom các quyết định của **nhóm A** và của phạm vi cả đợt; các câu của nhóm B (câu 4, 15–25) vào decision record của design nhóm B.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chủ dự án tự nêu hoặc chọn hướng khác đề xuất; "Chủ dự án (đề xuất của Claude)" = đợt này Claude
đề xuất trước (câu 1), chủ dự án ghi "ok" / "theo đề xuất"; "Duyệt cùng design" = Claude nêu lúc trình bày design từng phần trong chat, chủ dự án duyệt cả phần.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| A0 | Luật hỏi đợt này | Claude đề xuất trước mọi câu, chủ dự án xác nhận | Chủ dự án |
| A1 | Phạm vi đợt | Nhóm A trọn + nhóm B phần nền; C4, C5 dời; C17 archived; C15 dòng `priority_oldest` dời | Chủ dự án (đề xuất của Claude) |
| A2 | Một hay nhiều design | Mỗi nhóm một design; làm song song theo phiên | Chủ dự án (đề xuất của Claude) |
| A2b | Chia nhóm A thành phiên | 3 phiên theo file | Chủ dự án (đề xuất của Claude) |
| A3 | Thứ tự trang khi đăng ký | Đăng ký → nhập mã → chọn ngôn ngữ → Hôm nay | Chủ dự án (đề xuất mới của chủ dự án, xác nhận 7a) |
| A4 | Chặn tài khoản chưa xác nhận | (B) không cấp phiên tới khi nhập mã | Chủ dự án (khác đề xuất của Claude) |
| A5 | Gõ nhầm email, email chưa xác nhận | Đăng ký lại vào email chưa xác nhận thì thay dữ liệu, gửi mã mới; link "đăng ký bằng email khác"; dòng Quên mật khẩu chỉ cho email đã xác nhận; dọn tài khoản để Bước 8 | Chủ dự án (vòng 2: chủ dự án tự nêu, Claude thêm cách thay dữ liệu) |
| A6 | Thêm từ từ trang nhóm | Nút → tấm Thêm từ khoá nhóm; đóng sau mỗi từ; thêm cả loạt | Chủ dự án (khác đề xuất ban đầu của Claude) |
| A7 | Chữ thứ tự | Bỏ "trước" ở 5 dòng | Chủ dự án (đề xuất của Claude) |
| A8 | Nút sau khi trả lời | Hai nút, nút chính đổi theo trường hợp | Chủ dự án (đề xuất của Claude) |
| A9 | Gộp C2 vào C16 | Gộp | Chủ dự án (đề xuất của Claude) |
| A10 | Nút loa | Giọng của máy; UK · US ở từ, US ở câu | Chủ dự án (đổi một phần đề xuất của Claude) |
| A11 | Điền từ từ câu đã lưu | Mọi gói; công tắc riêng, luôn hiện | Chủ dự án (đề xuất của Claude) + Duyệt cùng design |
| A12 | Lỗi "Xem đáp án" | Sửa API, PR `fix/` riêng | Duyệt cùng design |
| A13 | Câu đã lưu và giọng từ xa | Chỉ đọc bằng giọng trên máy | Duyệt cùng design |
| A14 | Âm thanh đồng đều giữa các nền tảng | Đợt này dùng giọng của máy; file âm thanh làm sẵn ghi thành hướng nâng cấp | Chủ dự án (đề xuất của Claude) |
| A15 | Nhập mã kèm mật khẩu; giới hạn và lỗi khi khoá (review plan I2) | Kiểm mật khẩu trước mã; khoá trả 429 rõ (chỉ người đúng mật khẩu thấy); bỏ giới hạn theo email; link Quên mật khẩu chỉ ở trang đăng nhập; vòng 3: chữ 429 hướng dẫn dùng Quên mật khẩu ở trang đăng nhập, giữ cửa sổ khoá | Chủ dự án (sau nhiều vòng; kiểm mật khẩu: đề xuất của Claude) |

## A0 — Luật hỏi đợt này (câu 1)

Bước 3–7 giữ luật "chủ dự án trả lời trước, Claude đề xuất sau". Vòng đầu file câu hỏi viết theo luật đó (không đề xuất); chủ dự án sau đó yêu cầu: "đợt này bạn
cho mình recommendation vào mỗi câu kèm giải thích và trade-off, mình sẽ confirm trong file nếu phù hợp".

| Phương án | Trade-off |
|---|---|
| (a) giữ luật | Chủ dự án tự nghĩ trước từng câu; chậm hơn |
| ✅ (b) Claude đề xuất trước mọi câu | Nhanh; chủ dự án đọc đề xuất kèm trade-off rồi xác nhận hoặc đổi |
| (c) giữ cho câu sản phẩm, Claude đề xuất trước câu kỹ thuật | Hai chế độ trong cùng một file |

## A1 — Phạm vi đợt (câu 2, 10, 26, 27, 28)

Bối cảnh: 17 mục C1–C17. Chủ dự án muốn đi hướng C11 + C12 (eval, judge, vòng đời prompt) và thêm C13–C17 ngày 26/10.

| Phương án | Trade-off |
|---|---|
| ✅ Nhóm A trọn (C13, C14, C15, C16 + C2, C1, C3) + nhóm B phần nền; C4, C5 dời; C6–C9 ngoài đợt | A rẻ, thấy ngay; B chỉ làm phần không cần người dùng thật. Gói Miễn phí vẫn chưa thấy câu AI; đợt vẫn chưa có người học thật |
| Gộp C4 (Miễn phí thử câu AI) vào đợt, chốt khung trước, điền số sau | Có điểm khác biệt cho Miễn phí sớm hơn; con số đặt trước khi biết giá một câu AI |

Thêm trong lúc trả lời: câu 10 (chữ mới cho `priority_oldest` và thẻ "Đang ưu tiên") chủ dự án "archived, xử lý sau"; câu 27 (C4) "archived lại, brainstorm sau";
câu 28 (C5) "archived, làm sau"; câu 26 (C17): Claude kiểm địa chỉ viết cứng trùng mặc định của SDK (`openai` 7.39.0, `@anthropic-ai/sdk` 0.135.0), chủ dự án
"archived".

## A2 — Một hay nhiều design (câu 3) và A2b — chia phiên

| Phương án | Trade-off |
|---|---|
| (a) một design, một plan | Một chỗ đọc; plan quá lớn, A phải chờ B |
| ✅ (b) mỗi nhóm một design, plan và chuỗi PR | A xong và merge sớm; hai decision record, hai plan |
| (c) gộp A + C, B riêng, D riêng | Như (b), C17 sau đó archived nên không còn khác |

Chủ dự án thêm: "chia ra rồi cho các phiên làm song song nếu không có xung đột". Claude kiểm: C16, C2 và C1 cùng sửa `AnswerFeedback.tsx`; C15 và C3 cùng sửa
`CustomizeDialog.tsx`; gần như mọi mục sửa `vi.json`, `en.json`. ✅ Chia nhóm A thành 3 phiên theo file (C13 · C14 · Luyện tập rồi C1); xung đột bản chữ gộp khi merge.

## A3 — Thứ tự trang khi đăng ký (câu 5, đề xuất mới, 7a)

Vòng 1 (ý gốc C13 của chủ dự án, 26/10): "Đăng ký xong rồi nhảy qua chọn ngôn ngữ luôn, rồi phải có thông báo xác nhận otp trên giao diện nếu người dùng chưa xác nhận".

| Phương án (câu 5) | Trade-off |
|---|---|
| (a) đăng ký → chọn ngôn ngữ → Hôm nay; nhập mã khi bấm lời nhắc (đề xuất của Claude) | Bớt một bước chặn; ít người xác nhận hơn |
| (b) đăng ký → chọn ngôn ngữ → trang nhập mã có "Để sau" | Nhắc ngay nhưng vẫn cho bỏ qua |

Câu 6 (dải nhắc trên mọi trang, đóng được, nút sang trang nhập mã) và câu 7 (không giới hạn tài khoản chưa xác nhận) Claude đề xuất theo (a).

Vòng 2: chủ dự án bỏ hướng trên — "mình quyết định đổi design lại để bắt buộc nhập OTP xác thực trước rồi mới cho access lại app". Câu 5–7 không còn dùng. 7a:
✅ giữ thứ tự hiện có (đăng ký → nhập mã → chọn ngôn ngữ → Hôm nay), chỉ thêm phần bắt buộc ("ok").

## A4 — Chặn tài khoản chưa xác nhận ở đâu (7b)

Code facts: đăng ký và đăng nhập đều cấp phiên đầy đủ cho tài khoản chưa xác nhận; không chỗ nào đọc `emailVerifiedAt`; API nhập mã cần đăng nhập. Đây là D8 Bước 1
dựa trên K7.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| (i) chỉ web: chưa xác nhận thì mọi trang `/app` về trang nhập mã (đề xuất của Claude) | Rẻ; API vẫn cho dùng; Flutter phải tự chặn |
| (ii) web + API từ chối mọi API người học khi chưa xác nhận | Chặn thật; sửa nhiều module và script |

Chủ dự án: "nếu trường hợp user chưa xác thực thì không cung cấp quyền vào phiên đăng nhập, trường hợp đã tạo tài khoản rồi mà chưa xác nhận => khi đăng nhập thành
công thì route vào trang nhập otp, không cấp quyền".

Vòng 2 (Claude nêu ràng buộc: API nhập mã cần đăng nhập):

| Phương án | Trade-off |
|---|---|
| (A) vẫn cấp phiên nhưng giới hạn: 403 `email-not-verified` trừ danh sách nhỏ (đề xuất của Claude) | Giữ API nhập mã và làm mới phiên; tài khoản chưa xác nhận vẫn có một phiên chỉ để nhập mã |
| ✅ (B) không cấp phiên tới khi nhập mã; nhập mã thành API công khai email + mã, đúng thì cấp phiên | Đúng nghĩa "không có phiên"; đổi luồng đăng ký, đăng nhập, nhập mã; phải chống dò mã trên nhiều email; sửa nhiều test và smoke |

Chủ dự án: "7b chọn (B) không cấp phiên tới khi nhập mã". Chi tiết (thứ tự kiểm khi đăng nhập, mọi thất bại cùng `invalid-otp`, rate limit theo email và IP, gửi lại
mã công khai, từ chối làm mới phiên cũ) duyệt cùng phần 1 của design. Đổi K7, D7, D8, D14 Bước 1, D36 Bước 3; ngoại lệ SR7 (design §4.5).

## A5 — Gõ nhầm email (7c) và "có tạo record khi chưa nhập OTP không"

Chủ dự án hỏi: "thường thiết kế nếu không nhập otp thì có tạo record cho tài khoản đó không?". Claude trả lời hai kiểu (tạo tài khoản ngay, đánh dấu chưa xác nhận /
giữ ở bảng chờ, nhập mã đúng mới tạo), nêu Wordmet đang theo kiểu 1 và chuyện giữ chỗ email; kiểm code: chủ thật của email lấy lại được qua Quên mật khẩu.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ kiểu 1; trang nhập mã có lối thoát; dòng nhắc Quên mật khẩu khi `email-taken`; dọn tài khoản chưa xác nhận để tới Bước 8 | Ít việc; tài khoản rác nằm trong DB tới khi dọn |
| "Đổi email" trên trang nhập mã | Tiện hơn; API chưa có đường đổi email |
| Kiểu 2 (bảng chờ) | Không rác; phải lo bản chờ hết hạn, gửi lại mã, hai người cùng đăng ký một email; đổi Identity nhiều hơn |

Chủ dự án: "7c … theo đề xuất". Vì (B) không có phiên, nút "Đăng xuất" trong đề xuất đổi thành link "Đăng ký bằng email khác" (duyệt cùng phần 1).

Vòng 2 (sau khi viết plan): chủ dự án hỏi "đợt này đăng ký có tạo account mới nếu không nhập đúng otp không" (Claude: có, kiểu 1; nêu lại chuyện giữ chỗ
email và hướng bảng chờ), rồi tự đề xuất: "chỗ này sao không kiểm tra is_verified? nếu là false thì khi đăng ký vẫn gửi mã bình thường thôi". Claude đồng ý và nêu
chi tiết còn phải chốt:

| Phương án | Trade-off |
|---|---|
| (a) email chưa xác nhận: giữ dữ liệu cũ, chỉ gửi lại mã | Đơn giản; Lâm đăng ký lại bằng email của mình vẫn nhận tài khoản với mật khẩu Lan gõ nhầm, lần đăng nhập sau báo sai |
| ✅ (b) email chưa xác nhận: thay bằng dữ liệu của lần đăng ký mới (mật khẩu, họ tên, ngày sinh, đồng ý điều khoản), huỷ mã cũ, gửi mã mới; trả 201 như email mới | Hết chuyện giữ chỗ email mà không cần bảng chờ; không lộ email chưa xác nhận; thêm một nhánh ở đăng ký; kẻ xấu đăng ký lại liên tục làm mã của chủ thật hết hiệu lực (giới hạn theo email chặn bớt) |
| Bảng chờ (kiểu 2, từ vòng 1) | Không có tài khoản rác; phải lo bản chờ hết hạn, gửi lại mã, hai người cùng đăng ký; đổi Identity nhiều hơn |

Kèm hai luật Claude đề xuất: email đã xác nhận hoặc tài khoản bị khoá vẫn `409 email-taken`; lần thay đi qua giới hạn gửi mã theo email (1 / 60 s, 5 / giờ), bị giới
hạn thì vẫn thay dữ liệu, trả 201, không gửi mail. Chủ dự án hỏi "tổng quan lại thì đây có phải là thiết kế ổn không"; Claude đánh giá ổn về kỹ thuật, đánh đổi lớn
nhất là người đăng ký bỏ ngang ở bước nhập mã (chưa đo). Chủ dự án: "ừm sửa đi".

Vòng 3 (rà luồng sau review plan): đăng ký lại trong 60 s bị giới hạn nên không gửi mã mới, mà design lúc đó vẫn huỷ mã cũ → người dùng tới trang nhập mã không có mã
nào dùng được.

| Phương án | Trade-off |
|---|---|
| Huỷ mã cũ dù không gửi được mã mới | Luôn chỉ mã mới nhất sống; người dùng phải chờ đếm ngược rồi "Gửi lại mã" |
| ✅ Chỉ huỷ mã cũ khi thật sự gửi được mã mới; bị giới hạn thì mã cũ dùng được tới hết hạn | Không kẹt; vẫn an toàn vì mã cũ nằm trong cùng hộp thư |

Chủ dự án hỏi lại vì nghĩ mã sẽ "luôn có hiệu lực"; Claude làm rõ mã vẫn hết hạn theo thời gian sống, và nêu riêng việc rút thời gian sống xuống 5 phút (áp cho cả mã
xác nhận và mã đặt lại mật khẩu; mail chậm thì nhiều người phải gửi lại hơn). Chủ dự án: "theo đề xuất và giữ nguyên 10p" (✅ không huỷ sớm; ✅ giữ thời gian sống 10 phút).

## A6 — Thêm từ từ trang nhóm (câu 8)

Vòng 1 (đề xuất của Claude, có mô phỏng): một ô tìm đặt trên danh sách từ của nhóm, kết quả có [+] và nhãn "Đã có trong nhóm"; "rizz" mở tấm Thêm từ với nhóm chọn
sẵn; không thêm cả loạt.

Chủ dự án: "Mình muốn thiết kế theo kiểu: có một button thêm từ vào nhóm, rồi nó sẽ hiện modal và chọn từ cần thêm, bằng cách search từ".

Vòng 2 (Claude kiểm: tấm Thêm từ đã là modal có ô tìm; chưa đặt sẵn / khoá được nhóm):

| Câu | Phương án | Chọn |
|---|---|---|
| Thêm xong một từ | ✅ đóng tấm (như hiện nay) · vẫn mở để thêm tiếp | "đóng lại" |
| Thêm cả loạt | ✅ có · không | "được thì tốt" |

Duyệt cùng phần 2 của design: thêm cả loạt đi qua trang Chọn từ theo chủ đề với nhóm chọn sẵn (không dùng tấm "thêm cả loạt" của Tra từ vì nó thêm mọi từ khớp bộ lọc
mà không cho tick); phím N và Thêm từ trên thanh trên cùng ở trang nhóm cũng khoá nhóm; nhãn "Đã có trong nhóm" giữ từ vòng 1.

## A7 — Chữ thứ tự (câu 9, 10)

| Phương án | Trade-off |
|---|---|
| ✅ Bỏ "trước" ở 5 dòng, tiếng Anh bỏ "first"; giữ dòng `priority_oldest` vì câu 10 dời | Gọn; đứng riêng ở dòng tóm tắt hơi giống tên bộ lọc |
| Bỏ "trước" ở cả 8 dòng | Dòng `priority_oldest` thành "Bấm Cần ôn lại lâu nhất", khó hiểu hơn |

Câu 10 (chữ mới "Chờ ôn lâu nhất" và câu thẻ "Đang ưu tiên"): chủ dự án dời; ghi vào `IMPROVEMENT_IDEAS` theo yêu cầu "lưu vào context giúp mình".

## A8 — Nút sau khi trả lời (câu 11) và A9 — gộp C2 (câu 12)

Ý gốc C16 (chủ dự án): "bỏ box 'câu tiếp' đi, mặc định đã biết sẽ qua câu tiếp theo, nếu có nhu cầu cần ôn lại thì người dùng chỉ cần bấm cần ôn lại". Claude kiểm:
Đã biết bị API chặn khi trả lời sai, dùng gợi ý, hoặc từ chưa đến hạn.

| Phương án | Trade-off |
|---|---|
| ✅ Hai nút: Cần ôn lại + nút chính (Enter) đổi chữ theo 4 trường hợp; trường hợp sai mặc định Cần ôn lại (C2) | Đúng ý gốc ở trường hợp đúng; D16 giữ vì lịch chỉ đổi khi bấm nút ghi rõ; nhấn Enter liên tục sẽ đổi lịch; chữ nút chính đổi theo câu |
| Giữ cách cũ (ba nút) thành tuỳ chọn trong Cài đặt (11.1) | Không ép ai; thêm một cài đặt và hai bộ test |
| C2 riêng (cài đặt "tự đưa vào ưu tiên") | Sửa cùng màn hai lần |

Chủ dự án: câu 11 "OK", câu 12 "OK".

## A10 — Nút loa (câu 13) và A14 — âm thanh giữa các nền tảng

| Câu | Phương án | Chọn |
|---|---|---|
| 13.1 chỗ đặt, 13.2 đọc gì, 13.4 máy thiếu giọng | Trang từ, thẻ ôn, kết quả luyện; từ ở mọi chỗ, câu ở trang từ (và mặt sau thẻ ôn); ẩn nút khi thiếu giọng | ✅ "còn lại ok" |
| 13.3 giọng | Một lựa chọn "Mỹ / Anh" trong Cài đặt (đề xuất của Claude) · ✅ hai nút UK · US như Cambridge | Chủ dự án: "thường mình thấy các trang như cambridge vẫn làm 2 nút loa cho 2 kiểu giọng, nên cứ làm như bình thường" |

Duyệt cùng phần 4: hai nút ở **từ**, một nút US ở **câu** (Cambridge cũng chỉ có hai nút ở từ chính); không phím tắt; nút loa không nhận phím của phiên ôn.

Chủ dự án hỏi: "nếu dùng mỗi trình duyệt thì các platform khác thì sao". Claude kiểm MDN (`speechSynthesis` "Baseline: Widely available" từ 09/2018; danh sách giọng
là giọng có trên máy) và nêu: web chạy mọi máy phổ biến nhưng giọng khác nhau; Flutter phải gọi bộ đọc của điện thoại qua thư viện (chưa chọn).

| Phương án | Trade-off |
|---|---|
| ✅ Đợt này dùng giọng của máy; ghi "file âm thanh làm sẵn trên máy chủ" vào `IMPROVEMENT_IDEAS` | Gần như không tốn; giọng không đồng đều, có máy thiếu `en-GB` |
| File âm thanh làm sẵn cho mỗi từ (UK, US) | Giọng đồng đều mọi nền tảng; tốn tiền tạo và lưu (khoảng 8.812 từ × 2), giấy phép nguồn, mở CSP âm thanh; không làm được cho câu đã lưu |

Chủ dự án: "ok".

## A11 — Điền từ từ câu đã lưu (câu 14)

Chủ dự án nhờ giải thích; Claude giải thích bằng ví dụ ("We deploy every Friday" → "We ___ every Friday"), nêu D10 giao diện người học đã bỏ đường vào và D11 Bước 7
không cho gói Miễn phí.

| Câu | Phương án | Chọn |
|---|---|---|
| 14.1 gói | ✅ mọi gói (đổi D11 Bước 7) · giữ Dùng thử / Pro | "theo đề xuất" |
| 14.2 đường vào | ✅ công tắc "Điền từ vào câu bạn đã lưu" cạnh công tắc AI · nút trên trang từ | "theo đề xuất" |

Duyệt cùng phần 3 (có mô phỏng): code facts cho thấy API chặn cả câu `own` chung với câu AI (phải sửa API), và không có API cho biết người học có câu đã lưu trong phạm vi
phiên. Nên công tắc **luôn hiện** (khác đề xuất 14.2 "chỉ hiện khi có câu đã lưu"); từ không có câu nhận kiểu khác; Pro bật cả hai thì câu điền từ AI tự tắt.

| Phương án | Trade-off |
|---|---|
| ✅ Luôn hiện, dòng phụ giải thích | Không thêm API; người chưa lưu câu nào bật lên mà không thấy câu điền từ |
| Chỉ hiện khi có câu đã lưu | Đúng hơn; phải thêm API đếm câu theo phạm vi phiên |

## A12 — Lỗi "Xem đáp án"

Phát hiện khi gom code facts: web hiện "Xem đáp án" cho câu điền từ trước lần thử đầu (mockup K/78a), API từ chối khi `tries === 0`. Chưa tái hiện bằng chạy thật.

| Phương án | Trade-off |
|---|---|
| (a) sửa web: ẩn nút tới khi trả lời sai một lần | Nhỏ, chỉ web; Lan không biết từ thì phải gõ bừa một lần |
| ✅ (b) sửa API: cho bỏ qua câu điền từ trước lần thử, tính là sai | Đúng mockup đã duyệt; đổi luật Bước 4 áp qua D9 Bước 7; xử lý câu trả lời rỗng |

Chủ dự án duyệt phần 3 ("ok"); Claude ghi lại cách hiểu là (b) theo đề xuất và nói rõ trong chat. Làm thành PR `fix/` riêng, hai commit (test lỗi trước), trước C16.

## A13 — Câu đã lưu và giọng từ xa

Claude kiểm MDN: `localService` phân biệt giọng trên máy và giọng qua dịch vụ từ xa; suy ra (MDN không nói thẳng) chữ có thể bị gửi ra máy chủ khi dùng giọng từ xa.
Dự án coi câu đã gặp là dữ liệu nhạy cảm.

| Phương án | Trade-off |
|---|---|
| ✅ Ưu tiên giọng trên máy; câu đã lưu chỉ đọc bằng giọng trên máy; từ và câu ví dụ của kho được dùng giọng từ xa | Không lộ câu riêng; có máy không có loa ở câu đã lưu |
| Dùng mọi giọng | Loa ở mọi chỗ; câu riêng có thể ra ngoài |

## Đề xuất kỹ thuật duyệt cùng design

| Chọn | Bỏ | Vì sao |
|---|---|---|
| Nhập mã công khai trả phiên như đăng nhập (`writeSession`) | Nhập mã không trả token, đăng nhập lại (như Quên mật khẩu) | Đúng ý "đúng mới cấp phiên"; bớt một bước cho người vừa đăng ký |
| Mọi thất bại nhập mã cùng `400 invalid-otp`, kể cả đã xác nhận | Giữ 409 `email-already-verified` (D14) | API công khai: 409 sẽ cho biết email nào đã xác nhận |
| Rate limit `auth.verify.ip`, `auth.verify.email` bằng `@RateLimit` | Chỉ dựa vào khoá OTP theo tài khoản | `user.write` mất tác dụng trên route công khai; chặn dò trên nhiều email |
| Đăng nhập chưa xác nhận tự gửi mã mới qua giới hạn email | Bắt người học bấm "Gửi lại mã" | Đỡ một bước; giới hạn 1/60 s chặn spam |
| Email tạm trong `sessionStorage` | Email trên URL (như trang đặt lại mật khẩu) | Không để email trong lịch sử / log |
| Từ chối làm mới phiên của tài khoản chưa xác nhận | Để phiên cũ sống tới hết hạn | Tài khoản cũ đi theo luồng mới ngay |
| Tấm Thêm từ thêm tham số khoá nhóm | Tấm riêng cho trang nhóm | Dùng lại mọi đường lưu (kể cả AI) |
| Thêm cả loạt qua `TopicPickerPage` + `?group=` | `BulkAddSheet` theo bộ lọc | Cho tick từng từ, bỏ qua từ đang học |
| Một component loa dùng `speechSynthesis`, nghe `voiceschanged` | Thư viện TTS | Không cần thư viện; danh sách giọng có thể tới muộn |

## A15 — Nhập mã kèm mật khẩu; giới hạn và lỗi khi khoá (review plan I2)

Review plan độc lập (`../reviews/2026-10-26-dot-cai-thien-a-plan-review.md`, I2): API nhập mã công khai với giới hạn 10 / giờ theo email cho phép người ngoài chặn
việc xác nhận của người mới; lần sai thứ 21 khoá 24 giờ; trả 429 khi khoá trái với B1E17 của Bước 1 (khoá mã đặt lại mật khẩu vẫn trả `invalid-otp` để không lộ tài
khoản) và lộ email nào chưa xác nhận.

Vòng 1 (đề xuất của Claude): bỏ giới hạn theo email; khoá trả `400 invalid-otp`; trang nhập mã luôn có link Quên mật khẩu (lối thoát khi bị khoá, vì đặt lại mật khẩu
dùng mã loại khác và đặt lại xong là đã xác nhận). Chủ dự án: link "không nha, chỉ ở trang đăng nhập thôi". Claude nêu hệ quả (người bị khoá không biết, không thấy
lối thoát) và hai hướng: (a) giữ `invalid-otp`, thêm hướng dẫn Quên mật khẩu vào mail báo khoá · (b) báo rõ 429 "thử lại sau X giờ", đổi lại lộ email chưa xác nhận.
Chủ dự án ghi "b" rồi hỏi Bước 1 đã xử lý chuyện lộ email khi 429 chưa ("mình chưa chốt"); Claude trích B1E17 và mục I8 của design Bước 1.

Vòng 2: chủ dự án hỏi "nếu kẻ xấu dò được thì hậu quả gì". Claude trả lời (lộ một chút riêng tư, lừa đảo nhắm đích, không tự chiếm được tài khoản) và nêu một lỗ
hổng nặng hơn tìm thấy khi phân tích: với A5 (đăng ký lại thì thay dữ liệu), kẻ xấu đăng ký lại email chưa xác nhận của Lan bằng mật khẩu của mình; Lan nhập mã mới
nhất, xác nhận thành công, nhưng mật khẩu tài khoản là của kẻ xấu → kẻ xấu đăng nhập được.

| Phương án | Trade-off |
|---|---|
| ✅ Nhập mã kèm mật khẩu hiện tại; kiểm mật khẩu trước mã | Tài khoản đã xác nhận luôn có mật khẩu do chủ hộp thư gõ; sai mật khẩu không đụng bộ đếm OTP nên người ngoài không khoá được ai; khoá chỉ tới được khi đúng mật khẩu nên 429 rõ ràng không lộ gì; tốn thêm Argon2 mỗi lần; kẻ xấu vẫn phá đám được bằng đăng ký lại (Lan đặt lại mật khẩu), không chiếm được |
| Mã gắn với lần đăng ký (token riêng cho client đăng ký) | Cũng chặn được; thêm token phải lưu và kiểm |
| Bảng chờ (kiểu 2 của A5) | Mỗi lần đăng ký giữ dữ liệu riêng; vẫn cần cách biết người nhập mã là người đặt mật khẩu |

Chủ dự án hỏi "có nghĩa là nhập mật khẩu => đúng => qua trang otp?"; Claude làm rõ người dùng chỉ gõ mật khẩu một lần ở form, trang nhập mã tự gửi kèm (giữ trong bộ
nhớ trang; tải lại trang thì hỏi lại). Chủ dự án: "ok".

Hệ quả Claude ghi vào design (cùng hướng chủ dự án nghiêng về "b" ở vòng 1, nay không còn lộ): khoá trả 429 kèm thời gian; bỏ giới hạn theo email ở route nhập mã, giữ
`auth.verify.ip`; link Quên mật khẩu chỉ ở trang đăng nhập. Chủ dự án có thể đổi lại khi đọc design.

Vòng 3 (sau khi merge, code review `../reviews/2026-10-26-dot-cai-thien-a-code-review.md`, I1): câu "người ngoài không khoá được việc xác nhận của người khác"
không đúng, vì đăng ký lại (A5) cho kẻ xấu đặt mật khẩu: kẻ xấu nộp sai mã 21 lần bằng mật khẩu của mình → khoá `verify_email` 24 giờ; Lan đăng ký lại không nhận mã,
nộp mã thấy 429. Lối thoát: Quên mật khẩu (cửa sổ khoá riêng).

| Phương án | Trade-off |
|---|---|
| A. Đăng ký lại xoá cửa sổ khoá `verify_email` (đề xuất của Claude) | Chủ thật đăng ký lại là hết khoá; nhưng mở lại đường đoán mã cho người biết mật khẩu (kẻ xấu tự xoá khoá bằng đăng ký lại) |
| ✅ B. Giữ cửa sổ khoá; chữ 429 ở trang nhập mã thêm hướng dẫn dùng Quên mật khẩu ở trang đăng nhập | Chỉ đổi chữ; lỗ còn nhưng người bị phá có đường ra; link vẫn chỉ ở trang đăng nhập |
| C. Giữ nguyên, ghi rủi ro | Không tốn gì; người bị khoá phải tự tìm Quên mật khẩu |

Chủ dự án (26/10/2026): "I1 chọn B: giữ cửa sổ khoá, thêm vào chữ 429 hướng dẫn dùng Quên mật khẩu ở trang đăng nhập". Lý do: A mở lại đường đoán mã cho kẻ biết
mật khẩu. Chỉ là chữ, không thêm link vào trang nhập mã.
