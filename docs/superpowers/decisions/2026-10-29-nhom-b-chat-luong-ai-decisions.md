# Decisions — Đợt cải thiện, nhóm B (chất lượng AI)

Ngày: 29/10/2026. Đi kèm design doc [`../specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../specs/2026-10-29-nhom-b-chat-luong-ai-design.md). Câu hỏi,
giải thích, đề xuất và câu trả lời nguyên văn: [`../reviews/2026-10-29-nhom-b-questions.md`](../reviews/2026-10-29-nhom-b-questions.md) (câu 1–33, mục "Kết quả
chốt"). Các câu nhóm B của ngày 26/10 (câu 4, 15–25 trong [`../reviews/2026-10-26-dot-cai-thien-questions.md`](../reviews/2026-10-26-dot-cai-thien-questions.md))
gom ở mục cuối, như decision record nhóm A đã hẹn.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:**
- "Chủ dự án" = chủ dự án tự trả lời trong file hoặc chat.
- "Chủ dự án (đề xuất của Claude)" = chủ dự án để trống, ghi "là sao", "giải thích" hoặc "phân tích thêm"; Claude giải thích rồi đề xuất; chủ dự án chốt cả lượt
  ngày 29/10/2026 ("ok, các câu hỏi chốt hết"). Đợt này giữ luật "chủ dự án trả lời trước, Claude đề xuất sau"; các câu này là chỗ chủ dự án chọn bỏ qua phần trả
  lời trước.
- "Duyệt cùng design" = Claude nêu lúc chốt, nằm trong lượt chốt đó.

D*n* ứng với câu *n* của file câu hỏi 29/10.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Cách brainstorm khi B1 mới làm 1/6 thao tác | (b) design phần không phụ thuộc B1 + judge "chỉ một đáp án" cho `generate_cloze`; 5 thao tác còn lại chốt sau B1 | Chủ dự án (đề xuất của Claude) |
| D2 | Ai làm gì trong B1 | Claude soạn ví dụ, chủ dự án duyệt; Claude đọc đầu ra trước, chủ dự án xem lại; tăng mẫu sau; 5 USD | Chủ dự án |
| D3 | Nhà cung cấp cho model sinh câu và judge | Sinh câu: Anthropic hoặc OpenAI; judge chỉ Anthropic, không thấy tên model; cảnh báo khi cùng Anthropic | Chủ dự án (hai vòng) |
| D4 | Postman | Bỏ, dùng màn admin | Chủ dự án |
| D5 | Chia đợt | Một design, nhiều plan, nhiều phiên song song có phiên điều phối | Chủ dự án |
| D6 | D7/D30 | Làm trong đợt này | Chủ dự án |
| D7 | Tiêu chí máy tự kiểm | Giữ bảng; ô mong đợi cho 4 thao tác | Chủ dự án (đề xuất của Claude) |
| D8 | Tiêu chí mong đợi bắt buộc? | Bắt buộc; file nhập hàng loạt có tiêu chí và dev / held-out | Chủ dự án |
| D9 | Phiên bản bộ ví dụ | Bấm "Chốt phiên bản" | Chủ dự án |
| D10 | Held-out | 30%; "đã xem" = thấy đầu vào hoặc đầu ra; cho mở sau hộp hỏi, mở thì chuyển sang dev | Chủ dự án (10.1) + đề xuất của Claude |
| D11 | Luật Practice trong eval | Chỉ chạy lần đầu, không viết lại `#2` | Chủ dự án (đề xuất của Claude) |
| D12 | Judge có sẵn lúc đầu | Chỉ "chỉ một đáp án" | Chủ dự án (đề xuất của Claude) |
| D13 | Một lời gọi judge chấm mấy tiêu chí | Tùy chỉnh trên giao diện | Chủ dự án |
| D14 | Judge chạy khi nào | Ô bật khi chạy eval + nút chấm riêng trên lần chạy đã xong | Chủ dự án |
| D15 | Bao giờ điểm judge được tin | 30 nhãn, 85%, khớp theo đạt / không đạt, chưa hiệu chỉnh vẫn hiện kèm nhãn | Chủ dự án (đề xuất của Claude) |
| D16 | Gắn nhãn người ở đâu | Cả trên bảng kết quả và màn riêng | Chủ dự án |
| D17 | Prompt judge đổi thì điểm cũ ra sao | Giữ, ghi rõ bản judge + cho chấm lại | Chủ dự án |
| D18 | Trần chi phí eval, test, judge | Tách; USD; 2 USD / ngày; không eval với model chưa nhập giá | Chủ dự án (đề xuất của Claude) |
| D19 | Quyền | Mọi việc mới chỉ `admin` | Chủ dự án |
| D20 | So hai lần chạy | Chỉ khi cùng phiên bản bộ ví dụ | Chủ dự án (đề xuất của Claude) |
| D21 | Lần eval bắt buộc trước publish | Đúng cấu hình sắp publish; có held-out; chạy trọn; so với bản đang chạy; bản đang chạy chưa eval thì eval nó trước | Chủ dự án (đề xuất của Claude) |
| D22 | Đổi model đi đường nào | Prompt + model + effort + token là một cấu hình có vòng đời chung | Chủ dự án (đồng ý đề xuất của Claude) |
| D23 | Bản nháp | Một bản nháp mỗi thao tác, lưu trên server | Chủ dự án |
| D24 | Rollback | Chỉ về bản publish ngay trước; không cần eval | Chủ dự án (24) + Duyệt cùng design (24.2) |
| D25 | Câu tạo sẵn bằng bản cũ | Vẫn dùng | Chủ dự án (đề xuất của Claude) |
| D26 | Chấm câu AI 7 ngày qua | Tối đa N = 200 mỗi lần, có ước tính chi phí; 4 bộ lọc; trang riêng + dashboard | Chủ dự án (đề xuất của Claude) |
| D27 | Đưa vào bộ ví dụ | Từ báo lỗi đã xác nhận và câu judge chấm không đạt; máy điền sẵn mong đợi; vào dev | Chủ dự án (đề xuất của Claude) |
| D28 | Thư viện biểu đồ | Giữ biểu đồ tự vẽ | Chủ dự án |
| D29 | Phần thêm vào dashboard | Cả bốn phần | Chủ dự án |
| D30 | "Xong khi" | Chủ dự án tự chạy lần chạy thật, 5 USD | Chủ dự án |
| D31 | Cách thực thi | Claude làm hết, chủ dự án review | Chủ dự án |
| D32 | Thêm / bỏ khỏi nhóm B | T1 làm ngay; T2 thêm; T3 bỏ; T4 vào B1; T5 theo D33; D7/D30 plan riêng sau cùng | Chủ dự án (T1) + đề xuất của Claude |
| D33 | Từ khó có câu chỉ một đáp án | (a) giữ luật chấm; `also_fits` xét sau | Chủ dự án (đề xuất sửa lại của Claude) |
| D34 (N1) | Câu làm sẵn bằng bản cũ, giữ tới 6 tháng | Vẫn dùng | Chủ dự án |
| D35 (N2) | Tài khoản test | Mọi tài khoản `admin` / `editor` | Chủ dự án |
| D36 (N3) | D7/D30 | "Đang học" = có lần học trong N ngày gần nhất (mặc định 7); D7/D30 = % người đăng ký cùng tuần còn đang học ở ngày 7 / 30 | Chủ dự án (ý) + cụ thể hóa của Claude |
| D37 (Q-R1) | Cổng publish khi bản đang chạy chưa có model | Không cần mốc; nháp vẫn phải có lần eval trọn | Chủ dự án (đề xuất của Claude, chủ dự án nhờ đề xuất trước) |
| D38 (Q-R1b) | Tắt AI của một thao tác | Publish nháp không model, không cần eval, có hộp hỏi | Chủ dự án (đề xuất của Claude, chủ dự án nhờ đề xuất trước) |
| D39 (Q-R3) | "Lần học" của D7/D30 | Bảng mới `learning_activity_days`, gồm trả lời câu luyện tập | Chủ dự án (đề xuất của Claude, chủ dự án nhờ đề xuất trước) |
| D40 (Q1) | Model đã từng dùng có xóa được không | Không xóa được (FK `RESTRICT`); ẩn bằng `retired` | Chủ dự án (đề xuất của Claude, chủ dự án nhờ đề xuất trước) |

## D1 — Cách brainstorm khi B1 mới làm một phần (câu 1)

Bối cảnh: 26/10 chốt chạy B1 trước rồi mới viết design. 29/10 B1 mới có `generate_cloze` (14 ví dụ × Haiku và Sonnet).

| Phương án | Trade-off |
|---|---|
| (a) Chạy nốt B1 cho 5 thao tác rồi mới viết design | Gần như không làm lại; Claude phải chờ |
| ✅ (b) Design ngay phần không phụ thuộc B1 + judge "chỉ một đáp án" cho `generate_cloze`; judge 5 thao tác còn lại chốt sau B1 | Không chờ, không làm lại; hai đợt hỏi đáp |
| (c) Design tất cả ngay, 5 thao tác theo tiêu chí đoán trước | Một đợt; có thể làm judge không bắt được gì |

## D2 — Ai làm gì trong B1 (câu 2)

| Ý | Phương án | Trade-off |
|---|---|---|
| 2.1 Ai soạn ví dụ | (a) chủ dự án · ✅ (b) Claude soạn, chủ dự án duyệt và thêm · (c) khác | (b) nhanh; ví dụ đầu có thể thiếu ca chủ dự án nghĩ ra |
| 2.2 Ai đọc đầu ra | (a) chủ dự án · ✅ (b) Claude đọc trước, chủ dự án xem lại · (c) cả hai đọc độc lập | (b) nhanh; danh sách lỗi theo cách đọc của Claude cho tới khi chủ dự án gắn nhãn |
| 2.3 Số ví dụ | Chủ dự án tăng mẫu khi chạy lại (14 ví dụ mỗi model là quá ít) | Các tỉ lệ hiện chỉ để định hướng |
| 2.4 Ngân sách B1 | ✅ 5 USD | — |

## D3 — Nhà cung cấp cho model sinh câu và judge (câu 3)

Bối cảnh: 26/10 câu 19 chốt judge **khác** nhà cung cấp với model sinh câu. 29/10 chủ dự án đã thêm key OpenAI.

Vòng 1:

| Phương án | Trade-off |
|---|---|
| (a) Thêm model OpenAI làm judge (hoặc làm model sinh câu, Anthropic làm judge) | Giữ chốt 26/10 |
| (b) Tạm cho judge cùng nhà cung cấp, khác model, có cảnh báo | Nhanh; judge có thể chấm dễ cho câu cùng họ |
| (c) Khác | — |

Chủ dự án: Haiku sinh câu, judge cũng là model Anthropic. Claude đề xuất không gắn cứng nhà cung cấp cho judge, chỉ cảnh báo, hiệu chỉnh judge bằng một model
Anthropic và một model OpenAI.

Vòng 2 (chủ dự án): judge không được thấy tên model, chỉ thấy đầu ra; hai cách được nhận là "OpenAI sinh câu + Anthropic chấm" hoặc "chỉ Anthropic"; **không cho
OpenAI làm judge**.

| Phương án | Trade-off |
|---|---|
| ✅ Judge chỉ là model Anthropic; model sinh câu Anthropic hoặc OpenAI; judge nhận đúng đầu vào ví dụ + đầu ra, không có tên model, nhà cung cấp, bản prompt, mã lần chạy; cảnh báo khi cả hai cùng Anthropic; hiệu chỉnh đầu so hai judge Anthropic với nhãn | Giấu tên chặn thiên vị vì **biết** tên; model vẫn có thể chấm dễ cho câu giống văn phong của mình (`ASSUMPTION`, chưa kiểm nguồn), nên giữ cảnh báo và số đo độ khớp. Thay chốt 26/10 câu 19 |

## D4 — Postman (câu 4)

| Phương án | Trade-off |
|---|---|
| (a) Vẫn làm Postman + README | Thêm một chỗ phải giữ cho khớp với API |
| ✅ (b) Bỏ, dùng màn admin | Màn eval đã có (#161, #165, #169); không có request kiểm key riêng |
| (c) Chỉ request kiểm key mỗi nhà cung cấp | — |

## D5 — Chia đợt (câu 5)

Khối gợi ý: K1 golden set + luật trong eval + so hai lần chạy; K2 judge + nhãn + trần riêng; K3 vòng đời cấu hình; K4 chấm câu 7 ngày + đưa vào bộ ví dụ; K5 dashboard.

| Phương án | Trade-off |
|---|---|
| (a) Một design, một plan | Plan rất lớn |
| ✅ (b) Một design chung, nhiều plan; chủ dự án thêm: nhiều phiên chạy song song, một phiên điều phối | Việc không dồn; phải chia file để các phiên không đụng nhau |
| (c) Mỗi khối một design | Nhiều chỗ đọc, lặp bối cảnh |

## D6 — D7/D30 (câu 6)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Làm trong đợt nhóm B | Đợt rộng hơn; không dùng chung code với eval / judge (D32) |
| (b) Để đợt khác | — |

## D7 — Tiêu chí máy tự kiểm (câu 7)

Bảng ứng viên: `generate_cloze` (đáp án là dạng của từ; một chỗ trống; qua luật Practice), `generate_meaning_question` (trỏ đúng nghĩa), `generate_sentence_mcq`
(một phương án đúng; phương án nhiễu khác nhau), `lookup_word` (lemma, từ loại), `translate_sentence` (không có), `check_private_word` (`verdict` khớp).

| Phương án | Trade-off |
|---|---|
| ✅ Giữ cả bảng; ô mong đợi (`expected`) chỉ cho `generate_cloze`, `generate_meaning_question`, `lookup_word`, `check_private_word` | Lỗi chính của B1 code không bắt được, phần đó để judge; MCQ và dịch câu chỉ được chấm bằng luật / judge / người |
| Thêm hoặc bỏ dòng | Không có dòng nào được nêu |

## D8 — Tiêu chí mong đợi có bắt buộc không (câu 8)

| Ý | Phương án | Trade-off |
|---|---|---|
| 8.1 | ✅ (a) bắt buộc với mọi ví dụ mới · (b) tùy chọn | (a) mọi ví dụ đều chấm được bằng code; soạn ví dụ lâu hơn |
| 8.2 | ✅ (a) file nhập hàng loạt có tiêu chí và dev / held-out · (b) sửa từng ví dụ sau | (a) đổi định dạng file của #165 |

Theo D7, "bắt buộc" chỉ áp cho 4 thao tác có ô mong đợi.

## D9 — Phiên bản bộ ví dụ (câu 9)

| Phương án | Trade-off |
|---|---|
| (a) Tự tăng mỗi lần thêm / sửa / xóa | Nhiều phiên bản vụn |
| ✅ (b) Admin bấm "Chốt phiên bản" | Chủ động; giữa hai lần chốt là bản đang soạn |
| (c) Không đánh phiên bản, so trên ví dụ chung | Dễ so nhầm |

## D10 — Held-out (câu 10)

Held-out giấu **người sửa prompt**, không giấu AI.

| Ý | Phương án | Trade-off |
|---|---|---|
| 10.1 Tỉ lệ mặc định | ✅ 30% (chỉnh trên giao diện) | 26/10 Claude đề xuất 20% |
| 10.2 "Đã xem" khi nào | (a) mở trang chi tiết · (b) xem đầu ra trong lần chạy · ✅ (c) cả hai | (c) chặt nhất |
| 10.3 Ai xem được | (a) không ai, chỉ số tổng · ✅ (b) admin mở được sau hộp hỏi, mở thì chuyển sang dev | (b) xem được khi điểm held-out tụt; held-out vơi dần, phải bù ví dụ mới |

## D11 — Luật Practice trong eval (câu 11)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chỉ chấm lần đầu, báo "bị luật loại" | Một lời gọi mỗi ví dụ; đo cùng số với dashboard (#171); không có "tỉ lệ cuối cùng phải đổi câu không AI" |
| (b) Mô phỏng đủ: viết lại `#2`, báo cả hai lần | Thêm lời gọi; phải dựng đường viết lại trong eval |

## D12 — Judge có sẵn lúc đầu (câu 12)

Ứng viên: chỉ một đáp án; không lộ đáp án; nghĩa tiếng Việt đúng; dịch đúng ý; câu tự nhiên; đúng CEFR. Chủ dự án: judge phải tùy biến prompt được như các thao tác
khác (đã chốt 26/10).

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ "chỉ một đáp án" (cho `generate_cloze`; dùng cho `generate_meaning_question`, `generate_sentence_mcq` khi B1 của chúng thấy cùng lỗi); judge khác thêm trên UI khi B1 thấy lỗi thật | B1: lỗi này 10–12/14, CEFR 1/28, lộ đáp án và sai nghĩa 0/28; tiêu chí chưa có judge chỉ kiểm bằng mắt |
| Đánh dấu giữ các ứng viên khác trong danh sách | Câu 12 đưa danh sách để đánh dấu giữ / bỏ / thêm; không ứng viên nào khác được đánh dấu giữ |

## D13 — Một lời gọi judge chấm mấy tiêu chí (câu 13)

| Phương án | Trade-off |
|---|---|
| (a) Mỗi tiêu chí một lời gọi | Đo riêng từng tiêu chí; tốn hơn |
| (b) Một lời gọi chấm mọi tiêu chí | Rẻ hơn; khó biết sai ở tiêu chí nào |
| ✅ Tùy chỉnh trên giao diện (chủ dự án) | Admin quyết theo từng judge |

## D14 — Judge chạy khi nào (câu 14)

| Phương án | Trade-off |
|---|---|
| (a) Mỗi lần eval tự gọi judge | Tốn tiền cả khi không cần |
| ✅ (b) + (c) Ô "Chấm bằng judge" lúc chạy eval, và nút chấm riêng trên lần chạy đã xong | Linh hoạt; hai đường vào cùng một việc |

## D15 — Bao giờ điểm judge được tin (câu 15)

| Ý | Chọn | Trade-off |
|---|---|---|
| 15.1 Số nhãn | ✅ 30 mỗi tiêu chí (`ASSUMPTION`, sửa trên UI) | 15–20 phút gắn mỗi tiêu chí (ước lượng); sai số khoảng ±10 điểm % |
| 15.2 Ngưỡng | ✅ 85% (`ASSUMPTION`, sửa trên UI) | — |
| 15.3 Thế nào là khớp | (a) đúng cả mức · ✅ (b) cùng đạt / không đạt, kèm số phụ "khớp cả mức" | Phân nặng / nhẹ khó cả với người |
| 15.4 Chưa đạt ngưỡng thì | ✅ (a) vẫn hiện, gắn "chưa hiệu chỉnh" · (b) ẩn | Ẩn thì mất thông tin lúc chưa gắn nhãn |

## D16 — Gắn nhãn người ở đâu (câu 16)

| Phương án | Trade-off |
|---|---|
| (a) Trên bảng kết quả lần chạy | Gắn ngay khi đọc |
| (b) Màn riêng có phím tắt | Gắn nhanh nhiều câu |
| ✅ (c) Cả hai | Hai màn |

## D17 — Prompt judge đổi thì điểm cũ ra sao (câu 17)

| Phương án | Trade-off |
|---|---|
| (a) Giữ, ghi bản judge, biểu đồ đánh dấu chỗ đổi | — |
| (b) Cho chấm lại lần chạy cũ bằng judge mới | Tốn tiền khi chấm lại |
| ✅ (c) Cả hai | — |

## D18 — Trần chi phí eval, test, judge (câu 18)

Bối cảnh: lời gọi `test` và `eval` không bị trần lời gọi mỗi ngày chặn nhưng vẫn được đếm vào nó, nên một lần eval lớn có thể tắt AI của người học tới 0 giờ.

| Ý | Phương án | Trade-off |
|---|---|---|
| 18.1 | ✅ (a) tách trần · (b) giữ trần chung · (c) khác | (a) eval không làm người học hết AI; đổi D24 Bước 6 |
| 18.2 | (a) số lời gọi · ✅ (b) USD · (c) cả hai | Giá mỗi lời gọi chênh theo model (Sonnet ≈ 12,5 × Haiku ở B1); model chưa nhập giá không đo được: không cho eval với model đó |
| 18.3 | ✅ 2 USD / ngày (`ASSUMPTION`, sửa trên UI) | ≈ 5000 câu `generate_cloze` Haiku hoặc 400 Sonnet |

## D19 — Quyền (câu 19)

| Ý | Chọn |
|---|---|
| 19.1 Chạy eval, judge | ✅ (a) chỉ `admin` |
| 19.2 Gắn nhãn | ✅ (a) chỉ `admin` |
| 19.3 Publish / rollback | ✅ (a) chỉ `admin` |

Trade-off: `editor` không giúp được việc gắn nhãn.

## D20 — So hai lần chạy (câu 20)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Chỉ khi cùng phiên bản bộ ví dụ | Mỗi lần chốt bộ mới phải chạy lại bản đang chạy để có mốc (rẻ: 14 câu Haiku ≈ 0,006 USD) |
| (b) Luôn so, trên ví dụ chung | Dễ kết luận sai mà không ai để ý |

## D21 — Lần eval bắt buộc trước publish (câu 21)

| Ý | Phương án | Trade-off |
|---|---|---|
| 21.1 Đúng model của cấu hình | ✅ (a) có · (b) không | (a) kết quả là của cấu hình sẽ chạy thật |
| 21.2 Có held-out | ✅ (a) có · (b) chỉ dev | (a) cổng chấm trên "đề thi" |
| 21.3 Lần chạy dở có tính | (a) có · ✅ (b) không | Một lần chạy dở không đủ câu để so |
| 21.4 So với gì | ✅ (a) lần eval gần nhất của bản đang chạy, cùng phiên bản bộ ví dụ · (b) lần do admin chọn | (a) tự động |
| 21.5 Bản đang chạy chưa eval | (a) publish không cảnh báo · ✅ (b) eval bản đang chạy trước | Lần đầu phải chạy hai lần |

## D22 — Đổi model đi đường nào (câu 22)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Prompt + model + effort + token thành một cấu hình: nháp → eval → publish → rollback cả cụm | Thử model không đụng người học; đổi lớn hơn: trang Thao tác AI và trang Prompt nhập một vòng đời; đổi D15 Bước 6 và cách lưu cài đặt thao tác |
| (b) Prompt có vòng đời, model vẫn lưu là chạy, chỉ cảnh báo | Nhỏ hơn; đổi model để thử vẫn tới người học ngay (như lúc B1) |
| (c) Khác | — |

## D23 — Bản nháp (câu 23)

| Ý | Chọn | Trade-off |
|---|---|---|
| 23.1 | ✅ (a) một bản nháp mỗi thao tác · (b) nhiều bản song song | (a) đơn giản; không thử hai hướng cùng lúc |
| 23.2 | ✅ (a) trên server · (b) trên trình duyệt | (a) admin khác thấy được |

## D24 — Rollback (câu 24)

| Ý | Phương án | Trade-off |
|---|---|---|
| 24.1 | ✅ (a) chỉ về bản publish ngay trước · (b) chọn bản bất kỳ từng publish | (a) đơn giản; muốn về xa hơn thì tạo nháp từ bản cũ rồi publish qua cổng (design §6.4; sửa theo review R13, R22) |
| 24.2 | ✅ (a) không cần eval · (b) cảnh báo nếu chưa có eval với model hiện tại | Chủ dự án không trả lời riêng ý này; Claude đề xuất lúc chốt: (a), vì rollback quay cả cụm gồm model (D22) về bản đã qua cổng publish |

## D25 — Câu tạo sẵn bằng bản cũ (câu 25)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Vẫn dùng (mỗi câu đã ghi bản tạo ra nó) | Publish để chữa lỗi nặng thì vài câu lỗi cũ vẫn tới người học |
| (b) Bỏ, tạo lại bằng bản mới | Người học chờ, tốn thêm lời gọi |

## D26 — Chấm câu AI 7 ngày qua (câu 26)

| Ý | Phương án | Trade-off |
|---|---|---|
| 26.1 | (a) mọi câu · ✅ (b) tối đa N (mặc định 200), hiện chi phí ước tính · (c) mẫu x% | (b) chi phí đoán trước được; quá N phải bấm nhiều lần |
| 26.2 | ✅ cả bốn lọc: thao tác, bản cấu hình, model, chỉ tài khoản test | — |
| 26.3 | (a) trang riêng · (b) dashboard · ✅ (c) cả hai | — |

Câu về từ riêng của người học không chấm (26/10 câu 21).

## D27 — Đưa vào bộ ví dụ (câu 27)

| Ý | Phương án | Trade-off |
|---|---|---|
| 27.1 Nguồn | ✅ báo lỗi đã xác nhận + câu judge chấm không đạt ở D26; để sau: câu bị luật loại, dạng chia lạ | Hai nguồn chọn là lỗi người thật gặp; dạng chia lạ đã có màn riêng |
| 27.2 Mong đợi | (a) người bấm điền · ✅ (b) máy điền sẵn, người bấm sửa · (c) để trống | (c) trái D8 |
| 27.3 Vào đâu | ✅ (a) dev · (b) held-out · (c) người bấm chọn | Người bấm đã đọc câu, nên theo D10 chỉ có thể là dev; held-out chỉ lớn bằng ví dụ soạn mới |

## D28 — Thư viện biểu đồ (câu 28)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ tự vẽ | Không thêm phụ thuộc; tự vẽ tốn công hơn. Thay ý 26/10 câu 24.1 (dùng thư viện) |
| (b) Đổi sang thư viện | Thêm phụ thuộc |

## D29 — Phần thêm vào dashboard (câu 29)

✅ Cả bốn: số ngày chạm trần so với trần của chính ngày đó (cần lưu lịch sử trần); kết quả eval gần nhất mỗi thao tác; điểm judge theo thao tác và bản cấu hình; kết
quả "Chấm câu AI 7 ngày qua".

## D30 — "Xong khi" (câu 30)

| Ý | Chọn |
|---|---|
| 30.1 Thêm lần chạy thật vào "Xong khi" | ✅ có, chủ dự án tự chạy |
| 30.2 Ngân sách | ✅ 5 USD |

## D31 — Cách thực thi (câu 31)

| Phương án | Trade-off |
|---|---|
| ✅ (a) Claude làm hết, chủ dự án review | Như Bước 3–8 |
| (b) Chủ dự án tự viết một phần | — |
| (c) Khác | — |

## D32 — Thêm / bỏ khỏi nhóm B (câu 32)

| Mục | Phương án | Chọn | Trade-off |
|---|---|---|---|
| T1 Sửa ví dụ mẫu lệch của prompt `generate_cloze` bản 3 | thêm / bỏ / để sau | ✅ làm ngay, trên trang Prompt, không cần code (chủ dự án) | — |
| T2 Chặn ví dụ mẫu lệch khi lưu | thêm / bỏ / để sau | ✅ thêm, vào khối vòng đời cấu hình | — |
| T3 Cụm động từ | thêm / bỏ / để sau | ✅ bỏ: Claude kiểm DB 29/10, kho catalog 7849 mục, 139 mục nhiều chữ, không mục nào là động từ | Câu điền từ cho mục nhiều chữ (`bus stop`) chưa kiểm, ghi vào rủi ro |
| T4 Thử `effort` / `thinking` | thêm / bỏ / để sau | ✅ thêm vào B1, không cần code | — |
| T5 Luật chấm cho từ khó | — | ✅ theo D33 | — |
| D7/D30 | làm / để sau | ✅ làm (D6), plan riêng chạy sau cùng | Không dùng chung code với eval / judge |
| Điểm judge theo bản cấu hình trên dashboard | — | ✅ nằm sau khối judge | Phụ thuộc thứ tự plan |

## D33 — Từ khó có câu chỉ một đáp án (câu 33)

Bối cảnh: 10–12/14 câu B1 có từ khác điền vừa; Practice chỉ nhận chữ trong `accepted_answers`, và luật 7 của prompt cấm ghi từ đồng nghĩa (vì `checkCloze` loại câu có
đáp án không phải dạng của từ).

Vòng 1: Claude đề xuất (d) bằng trường `also_fits`. Vòng 2: chủ dự án nêu người học thấy danh sách từ đang luyện, nên biết đang luyện từ nào.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ luật chấm; giảm lỗi bằng prompt và judge; judge coi "nặng" chủ yếu khi từ khác cũng nằm trong danh sách đang luyện hoặc rất thông dụng | Hai từ đồng nghĩa cùng phiên (`big`, `large`) vẫn chấm sai; số "lỗi nặng" của B1 cần chấm lại theo luật này |
| (b) Nhận thêm từ đồng nghĩa (bỏ luật 7) | Phải đổi luật 7 và `checkCloze`; người học dễ nhớ nhầm từ |
| (c) Không dùng bài điền từ cho từ khó có một đáp án | Mất bài điền từ cho từ phổ biến như `although` |
| (d) Điền từ khác hợp lệ thì báo "đúng nghĩa, nhưng từ đang học là …", không tính sai (`also_fits`) | Đổi khuôn đầu ra, cách chấm Practice và màn web; xét sau khi có báo lỗi người học thật |

## D34 — Câu làm sẵn bằng bản cũ, sau khi đọc code (N1)

Bối cảnh: câu 25 (D25) giả định câu làm sẵn chỉ sống trong phiên đang mở, tối đa 2 câu. Code (`practice/ai/unseen-questions.ts:11-24`): câu AI làm sẵn mà người học
chưa làm được giữ tới `history_months` (6 tháng) và dùng lại theo (người học, nghĩa, dạng câu, bản nội dung), không xét bản prompt hay model. Người học đã trả lượt
cho câu đó lúc làm.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Vẫn dùng, như D25 | Không tốn thêm lượt; sau launch, publish để chữa lỗi nặng thì câu lỗi cũ còn tới người học lâu hơn D25 tưởng (Claude đồng ý, ghi rủi ro) |
| (b) Bỏ câu cũ của thao tác đó khi publish, làm lại bằng bản mới | Phải xử lý lượt người học đã trả |
| (c) Khác | — |

## D35 — Tài khoản test (N2)

Bối cảnh: bộ lọc "chỉ tài khoản test" của D26 cần một khái niệm Identity chưa có; chỉ có `staff_role`.

| Phương án | Trade-off |
|---|---|
| (a) Danh sách email trong Cài đặt hệ thống | Thêm một setting |
| (b) Nút đánh dấu trên trang người dùng của admin | Thêm cột và màn |
| ✅ (c) Mọi tài khoản `admin` / `editor` | Không thêm gì; tài khoản người học riêng muốn được tính thì phải được cấp `editor`, và khi đó vào được trang admin (Claude đồng ý, kèm lưu ý này) |
| (d) Khác | — |

## D36 — D7/D30 (N3)

Bối cảnh (như đã nêu lúc hỏi): không có bảng hoạt động theo ngày; `learning_log` ghi mỗi lần ôn, luyện, thêm, bỏ từ và giữ mãi; `users.last_seen_at` chỉ giữ lần cuối.

**Sửa bối cảnh (review R3, R22, 29/10/2026):** câu "`learning_log` ghi mỗi lần … luyện" **sai**. Trả lời câu luyện tập không ghi `learning_log`; Practice chỉ ghi khi người học
bấm "Cần ôn tập" / "Đã biết" (`practice/answers/answers.service.ts:154`, `learning/practice/practice-review.service.ts:74`). Vì chủ dự án chốt "tính theo lần học" trên bối
cảnh sai, phần "lần học gồm những gì" được hỏi lại (Q-R3 ở design §0); phần còn lại của D36 giữ.

| Phương án | Trade-off |
|---|---|
| (a) Có học đúng ngày thứ 7 | Chặt, số nhảy theo ngày |
| (b) Có học trong ngày 7–13 | Đỡ nhảy; chờ hết cửa sổ mới có số |
| (c) Đăng nhập là tính | Cần bảng mới ghi từng ngày mở app, không tính lại được quá khứ |
| ✅ (d) Ý của chủ dự án: "đã ngừng" khi quá N ngày liền không học; nghỉ lẻ vẫn là đang học. Claude cụ thể hóa: "đang học" = có lần học trong N ngày gần nhất (N mặc định 7, chỉnh trên UI); D7/D30 = % người đăng ký cùng tuần còn "đang học" ở ngày 7 / 30; dashboard thêm số đang học và đã ngừng hôm nay | Gần (b) với cửa sổ N ngày; dễ đọc |

Hoạt động tính theo **lần học** (`learning_log`, chủ dự án chốt), không theo mở app: dùng dữ liệu có sẵn, tính được cả quá khứ; người mở app mà không học bị coi là không
hoạt động. Tài khoản đã xóa mất `learning_log`, nên nhóm cũ thiếu người.

## D37–D40 — Bốn câu sau review design và review plan (Q-R1, Q-R1b, Q-R3, Q1)

Bối cảnh: Q-R1, Q-R3 đến từ review design (R1, R3); Q-R1b lộ ra khi viết plan M2; Q1 từ review plan (P12). Claude hỏi theo luật "chủ dự án trả lời trước", giải thích lại khi
chủ dự án hỏi "là sao"; chủ dự án ghi "các câu trên bạn đề xuất đi" (chat 29/10/2026), Claude đề xuất, chủ dự án "ok" (30/10/2026).

**D37 — Q-R1, cổng publish khi bản đang chạy chưa có model.** Trên DB mới cả 6 thao tác chưa có model; cổng đòi eval bản đang chạy làm mốc, mà bản đó không eval được, và hai
`PUT` cũ đã bỏ, nên không bao giờ publish được.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Bản đang chạy không có model thì bỏ bước so sánh; nháp vẫn phải có lần eval trọn trên phiên bản chốt có held-out | Giữ luật "publish nào cũng có eval"; lần publish đầu không có cảnh báo so sánh |
| (b) Giữ một đường riêng chọn model lần đầu, không qua cổng | Thêm một đường vòng qua cổng |
| (c) Khác | — |

**D38 — Q-R1b, tắt AI của một thao tác đã có model.**

| Phương án | Trade-off |
|---|---|
| ✅ (a) Publish nháp không có model mà không cần eval; hộp hỏi; ghi lịch sử; rollback bật lại | Thêm một ngoại lệ cho cổng; tắt không làm câu tệ đi (người học nhận câu không AI như khi AI lỗi) |
| (b) Chỉ tắt bằng rollback về bản không model, hoặc công tắc AI chung | Không tắt được thao tác chưa từng có bản không model trước đó |
| (c) Khác | — |

**D39 — Q-R3, "lần học" của D7/D30.** Sửa bối cảnh N3: trả lời câu luyện tập không ghi `learning_log`.

| Phương án | Trade-off |
|---|---|
| (a) Chỉ `learning_log` | Người chỉ luyện tập bị tính "đã ngừng" |
| (b) `learning_log` + câu luyện tập đã trả lời (giữ 6 tháng) | Nhóm đăng ký cũ hơn 6 tháng mất phần luyện tập |
| ✅ (c) Bảng mới ghi "người học có học ngày đó", gồm câu luyện tập | Chỉ có số từ lúc thêm bảng (chưa có người học thật nên không mất gì); thêm một lệnh ghi nhỏ mỗi lần trả lời; bảng vào danh sách xóa tài khoản |

**D40 — Q1, model đã từng dùng có xóa được không.** Design §4 đặt FK `RESTRICT` cho `model_ref` của cấu hình và judge; §6.1 chỉ liệt kê bốn chỗ chặn.

| Phương án | Trade-off |
|---|---|
| ✅ Giữ chặn xóa (`RESTRICT`), sửa §6.1 cho khớp; ẩn bằng `lifecycle = 'retired'`; ô chọn model ẩn model `retired` | Lịch sử và rollback luôn trỏ đúng model; danh sách model chỉ dài thêm. Claude kiểm 30/10: hiện không ô chọn nào lọc `retired` (`apps/admin/src/features/ai/**`), nên thêm bộ lọc |
| Cho xóa model chỉ còn nằm trong cấu hình `retired` / bản judge cũ | Lịch sử mất tên model |

Review plan Q1 đưa các hướng a / b / c trong file review; bảng trên tóm theo hai hướng Claude trình bày khi đề xuất.

## Các câu nhóm B ngày 26/10

Nguồn: [`../reviews/2026-10-26-dot-cai-thien-questions.md`](../reviews/2026-10-26-dot-cai-thien-questions.md) câu 4, 15–25 và hai lượt "Kiểm câu trả lời". Ở đợt
đó Claude đề xuất trước (A0 nhóm A).

| Câu 26/10 | Phương án đã nêu | Chọn | Ai chốt | Bị đổi 29/10 |
|---|---|---|---|---|
| 4, 15 | Phạm vi: E1 → E2 → E3 → judge offline + nhãn → so lần chạy → vòng đời tối thiểu → dashboard → màn admin; để sau canary, online eval, judge trong `prepare`, email | ✅ như đề xuất, cộng Postman + README | Chủ dự án (đề xuất của Claude) | Postman bỏ (D4) |
| 16 | (a) prompt trong admin có vòng đời · (b) file trong repo qua PR · (c) repo là nguồn · (d) khác | ✅ (a), thêm: thử prompt, eval, judge ngay trong admin | Chủ dự án (đề xuất của Claude) | Mở rộng thành cả cấu hình (D22) |
| 17 | 17.1 (a) chặn · (b) cảnh báo · (c) không cổng; 17.2 ngưỡng; 17.3 đổi model qua cổng | ✅ (b) cảnh báo + bắt buộc một lần eval; 5 điểm % hoặc có ví dụ trước đạt nay trượt; đổi model cũng qua cổng | Chủ dự án (đề xuất của Claude) | Chi tiết lần eval bắt buộc ở D21 |
| 18 | Canary (a) có · (b) không · (c) khác | ✅ (b), "bản đang chạy" là con trỏ riêng | Chủ dự án (đề xuất của Claude) | — |
| 19 | 19.1 dùng judge; 19.2 tiêu chí; 19.3 model chấm khác nhà cung cấp; 19.4 trần riêng 2 USD | ✅ judge chỉ trong eval, khác nhà cung cấp, mỗi judge là một thao tác AI cấu hình trên UI | Chủ dự án (đề xuất của Claude + yêu cầu cấu hình trên UI) | 19.3 đổi (D3); 19.2 ở D12; 19.4 chốt ở D18 |
| 20 | (a) đạt / không đạt · (b) thang 1–5 · (c) khác | ✅ đạt / không đạt nặng / không đạt nhẹ + một câu lý do | Chủ dự án (thêm mức và lý do vào (a)) | — |
| 21 | 21.1 dev / held-out 20%; 21.2 ai viết tiêu chí, ai gắn nhãn; 21.3 nút đưa vào bộ ví dụ, từ riêng không chép | ✅ có dev / held-out, tỉ lệ chỉnh trên UI; từ riêng không bao giờ chép | Chủ dự án | Tỉ lệ 30% (D10); nút ở D27 |
| 22 | Online eval: không trong đợt này | ✅ làm nút "Chấm câu AI 7 ngày qua"; người học mẫu là tài khoản test | Chủ dự án (khác đề xuất của Claude) | Chi tiết ở D26 |
| 23 | Judge trong `prepare`: (c) để sau khi có số đo | ✅ để sau; mốc 3% câu đã qua luật bị chấm "không đạt nặng" thì mới tính | Chủ dự án | — |
| 24 | 24.1 trang trong admin; 24.2 chỉ admin; 24.3 chỉ trên màn; 24.4 sức khỏe, chi phí, tỉ lệ bị luật loại, eval gần nhất | ✅ trang trong `apps/admin`, dùng thư viện biểu đồ, chỉ trên màn | Chủ dự án | Thư viện bỏ (D28) |
| 25 | (a) màn theo admin hiện tại · (b) chỉ API · (c) làm lại admin trước · (d) khác | ✅ (a), tách phần gọi API khỏi phần hiển thị | Chủ dự án (đề xuất của Claude) | — |

## Đề xuất kỹ thuật duyệt cùng design

Design §15, E1–E19 (Claude đề xuất lúc viết design và lúc sửa theo review độc lập, 29/10/2026; chờ chủ dự án đọc lại design). Bảng đầy đủ (chọn, bỏ, vì sao) nằm ở design
§15; tóm tắt:

| # | Chọn |
|---|---|
| E1 | Ảnh chụp ví dụ ở phiên bản chốt, kết quả chạy, đối tượng chấm; kết quả chạy thành bảng |
| E2 | Port luật do Practice đăng ký vào `AiService` lúc `onModuleInit` (`check`, `formsOf`, `matchesExpected`) |
| E3 | Thao tác gateway `judge`, đầu ra ba mảng chuỗi; judge do admin tạo |
| E4 | Judge lưu là bản mới, không publish; có nhân bản |
| E5 | `ai_configs` có `version` + con trỏ; số cấu hình nối số prompt; số liệu theo cặp (số cấu hình, model) |
| E6 | Bỏ hai `PUT`; hai `GET` đọc cấu hình đang chạy |
| E7 | Trần USD mềm, kiểm trước mỗi lần gửi |
| E8 | Practice chọn câu thật, `ai` chạy lượt chấm |
| E9 | D7/D30 tính lúc đọc |
| E10 | Chia held-out giữ tỉ lệ |
| E11 | Ví dụ có sẵn vào `dev` khi migrate |
| E12 | Một plan, làm tuần tự M1–M6 (P1 → P3 → P2 → P4 → P5 → P6). Chủ dự án chốt trong chat 29/10/2026 ("gộp lại thành một plan đi, mình sẽ cho làm tuần tự"), thay D5 (nhiều plan, nhiều phiên song song); P6 vẫn sau cùng như D32 |
| E13 | Judge nhận `fake` khi bật fake |
| E14 | Chặn cả `test` với model chưa nhập giá (rộng hơn câu chữ D18) |
| E15 | `fake` được nhập giá khi bật fake |
| E16 | Script và e2e đổi model qua đường thật |
| E17 | Dựng lại đầu vào sau 7 ngày từ nội dung nghĩa |
| E18 | D7/D30 loại staff và chưa xác nhận email; quyền `ai.view` |
| E19 | Khóa song song kiểm trong smoke |
