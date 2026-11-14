# Câu hỏi brainstorm nhóm B (chất lượng AI) — 29/10/2026

Nhóm B là §4 "Nhóm 2 — Chất lượng AI" của [`IMPROVEMENT_PLAN_2026-10-28.md`](../../preparation/IMPROVEMENT_PLAN_2026-10-28.md) (B1–B11). File này gom **mọi câu còn
mở** để bạn trả lời thẳng bên dưới mỗi câu, ở dòng **Trả lời:**. Theo quy tắc của repo: bạn trả lời trước, Claude đề xuất sau; vì vậy các câu dưới đây chỉ có
bối cảnh và các hướng, **không có hướng nào được đánh dấu là đề xuất**. Câu nào bạn muốn Claude đề xuất trước thì ghi "đề xuất trước"; không biết thì ghi "bỏ qua".
Trả lời một chữ cái (a, b…) là đủ; muốn thêm ý thì viết tiếp cùng dòng.

Nguồn: tài liệu nghiên cứu [`AI_EVAL_DASHBOARD_2026-10-24.md`](../../preparation/AI_EVAL_DASHBOARD_2026-10-24.md) (C11),
[`AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md`](../../preparation/AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md) (C12), và câu trả lời của bạn ở
[`2026-10-26-dot-cai-thien-questions.md`](2026-10-26-dot-cai-thien-questions.md) Phần 3.

**Vài chữ dùng trong file:**
- *Bộ ví dụ (eval set)*: danh sách đầu vào mẫu cho một thao tác AI, ví dụ "`deploy`, B1, chủ đề IT" cho thao tác viết câu điền từ (`generate_cloze`).
- *Lần chạy eval*: đưa mọi ví dụ qua model và prompt đã chọn, lưu đầu ra từng ví dụ.
- *Golden set*: bộ ví dụ có thêm **tiêu chí mong đợi** cho từng ví dụ, để máy tự chấm đúng / sai.
- *Held-out*: một phần ví dụ để riêng, không dùng lúc sửa prompt, chỉ chạy ở mốc để xem prompt có thật sự tốt hơn hay chỉ "học thuộc" phần còn lại.
- *Judge*: một model AI khác đọc đầu ra và chấm theo một tiêu chí, ví dụ "câu này có đúng một đáp án không".
- *Nhãn người*: bạn tự chấm cùng các đầu ra đó; so với judge để biết judge đúng bao nhiêu (ví dụ bạn và judge giống nhau 45/50 câu = 90%).

---

## Kết quả chốt (chủ dự án, chat 29/10/2026: "ok, các câu hỏi chốt hết")

Cách đọc: câu nào bạn đã trả lời thì theo câu trả lời của bạn; câu nào bạn để trống, ghi "là sao", "giải thích" hay "phân tích thêm" thì theo **đề xuất mới nhất
của Claude** trong câu đó (bạn chốt cả lượt, không trả lời riêng từng câu). Dấu ❓ ở các câu bên dưới giữ lại để biết câu nào chốt theo đề xuất của Claude.

| Câu | Chốt | Nguồn |
|---|---|---|
| 1 | (b): design ngay phần không phụ thuộc B1 + judge "chỉ một đáp án" cho `generate_cloze`; judge của 5 thao tác còn lại chốt sau khi chạy B1 cho chúng | đề xuất Claude |
| 2 | 2.1 (b), 2.2 (b), 2.3 bạn tăng mẫu khi chạy lại B1, 2.4 5 USD | chủ dự án |
| 3 | Model sinh câu: Anthropic hoặc OpenAI; judge **chỉ** model Anthropic; judge không thấy tên model, nhà cung cấp, bản prompt, mã lần chạy; cảnh báo khi cùng Anthropic; hiệu chỉnh đầu so hai judge Anthropic với nhãn của bạn. Thay chốt 26/10 câu 19 "judge khác nhà cung cấp" | chủ dự án + đề xuất sửa lại |
| 4 | (b) bỏ Postman, dùng màn admin | chủ dự án |
| 5 | Một design, nhiều plan; nhiều phiên chạy song song có một phiên điều phối | chủ dự án |
| 6 | (a) làm D7/D30 trong đợt này (plan riêng, chạy sau cùng, theo câu 32) | chủ dự án |
| 7 | Giữ bảng; ô mong đợi chỉ cho `generate_cloze`, `generate_meaning_question`, `lookup_word`, `check_private_word` | đề xuất Claude |
| 8 | (a) bắt buộc; 8.2 (a) file nhập hàng loạt có tiêu chí và dev / held-out | chủ dự án |
| 9 | (b) bấm "Chốt phiên bản" | chủ dự án |
| 10 | 10.1 30%; 10.2 (c); 10.3 (b) có hộp hỏi trước khi mở | chủ dự án (10.1) + đề xuất Claude |
| 11 | (a) eval chỉ chạy luật lần đầu, không viết lại `#2` | đề xuất Claude |
| 12 | Lúc đầu chỉ judge "chỉ một đáp án"; judge khác thêm trên UI khi B1 thấy lỗi thật | đề xuất Claude |
| 13 | Tùy chỉnh trên giao diện (một lời gọi chấm một hay nhiều tiêu chí) | chủ dự án |
| 14 | (b) + (c): ô "Chấm bằng judge" khi chạy eval, và nút chấm riêng trên lần chạy đã xong | chủ dự án |
| 15 | 30 nhãn; 85%; tính khớp theo đạt / không đạt, kèm số phụ khớp cả mức; chưa hiệu chỉnh thì vẫn hiện, gắn nhãn | đề xuất Claude |
| 16 | (c) cả hai chỗ gắn nhãn | chủ dự án |
| 17 | (c) giữ điểm cũ ghi rõ bản judge + cho chấm lại | chủ dự án |
| 18 | Tách trần; trần riêng bằng USD; 2 USD / ngày; không cho eval với model chưa nhập giá | đề xuất Claude |
| 19 | Mọi việc mới (eval, judge, nhãn, publish, rollback) chỉ `admin` | chủ dự án |
| 20 | (a) chỉ so khi cùng phiên bản bộ ví dụ | đề xuất Claude |
| 21 | 21.1 (a), 21.2 (a), 21.3 (b), 21.4 (a), 21.5 (b) | đề xuất Claude |
| 22 | (a) prompt + model + effort + token là một cấu hình có vòng đời chung | chủ dự án đồng ý đề xuất |
| 23 | 23.1 (a) một bản nháp; 23.2 (a) lưu trên server | chủ dự án |
| 24 | (a) rollback chỉ về bản publish ngay trước; 24.2 (a) không cần eval, vì cả cụm (gồm model) đã từng chạy | chủ dự án (24) + đề xuất Claude (24.2, xem bên dưới) |
| 25 | (a) câu đã tạo sẵn bằng bản cũ vẫn dùng | đề xuất Claude |
| 26 | Tối đa N câu mỗi lần, mặc định 200, hiện chi phí ước tính; cả bốn bộ lọc; kết quả ở trang riêng và dashboard | đề xuất Claude |
| 27 | Nguồn: báo lỗi đã xác nhận + câu judge chấm không đạt ở câu 26; máy điền sẵn mong đợi; vào dev | đề xuất Claude |
| 28 | (a) giữ biểu đồ tự vẽ | chủ dự án |
| 29 | Cả bốn phần | chủ dự án |
| 30 | Bạn tự chạy lần chạy thật, 5 USD | chủ dự án |
| 31 | (a) Claude làm hết, bạn review | chủ dự án |
| 32 | T1 làm ngay (chủ dự án); T2 thêm vào khối vòng đời; T3 bỏ khỏi đợt này (xem bên dưới); T4 thêm vào B1; T5 theo câu 33; D7/D30 plan riêng chạy sau cùng | chủ dự án (T1) + đề xuất Claude |
| 33 | (a) giữ luật chấm; judge coi "nặng" chủ yếu khi từ khác cũng nằm trong danh sách đang luyện hoặc rất thông dụng; (d) `also_fits` xét sau | đề xuất sửa lại |

**Ba câu mới sau khi đọc code** ([`NHOM_B_CODE_FACTS_2026-10-29.md`](../../preparation/NHOM_B_CODE_FACTS_2026-10-29.md), hỏi trong chat 29/10/2026; chủ dự
án trả lời trước, Claude đề xuất sau):

| Câu | Bối cảnh | Chốt | Nguồn |
|---|---|---|---|
| N1 | Câu AI làm sẵn chưa hỏi được giữ tới 6 tháng và dùng lại không xét bản prompt / model (F8), không chỉ "2 câu trong phiên đang mở" như câu 25 giả định. Hướng: (a) vẫn dùng · (b) bỏ, làm lại bằng bản mới · (c) khác | (a) | chủ dự án; Claude đồng ý, ghi rủi ro sau launch |
| N2 | Không có "tài khoản test" (F9). Hướng: (a) danh sách email trong Cài đặt · (b) nút đánh dấu trên trang người dùng · (c) mọi tài khoản `admin` / `editor` · (d) khác | (c) | chủ dự án; Claude đồng ý, lưu ý tài khoản người học riêng phải được cấp `editor` mới tính |
| N3 | D7/D30 đếm "còn quay lại" thế nào. Hướng: (a) đúng ngày thứ 7 · (b) trong ngày 7–13 · (c) đăng nhập là tính · (d) khác | (d) của chủ dự án: tính "đã ngừng" khi quá N ngày liền không hoạt động (nghỉ lẻ vẫn là đang học); Claude cụ thể hóa: "đang học" = có hoạt động trong N ngày gần nhất (mặc định 7, chỉnh trên UI); D7/D30 = % người đăng ký cùng tuần còn "đang học" ở ngày 7 / 30. Hoạt động = **lần học** (`learning_log`), không phải mở app | chủ dự án (ý và "tính theo lần học") + cụ thể hóa của Claude |

**24.2 (Claude đề xuất lúc chốt, 29/10/2026):** (a). Rollback quay cả cụm prompt + model + effort + token (câu 22) về bản publish ngay trước; cụm đó từng qua
cổng publish (có eval bắt buộc, câu 21) và từng chạy thật, nên không còn trường hợp "chưa có eval với model hiện tại".

**T3 (Claude kiểm DB `english_learning` 29/10/2026):** kho từ catalog có 7849 mục, 139 mục nhiều chữ, **không mục nào là động từ** (115 danh từ như `bus stop`,
6 giới từ như `because of`, 6 tính từ, 4 trạng từ, 3 modal, 3 thán từ, 2 đại từ). Từ loại trong kho đúng bằng danh sách `AI_VALID_POS`. Vậy kho không có cụm động
từ; `take off` chỉ có thể đến từ từ riêng người học tự thêm, mà từ loại ở đó cũng chỉ chọn trong cùng danh sách. Bỏ T3 khỏi đợt này. Còn một điểm chưa kiểm: câu
điền từ cho mục nhiều chữ (`bus stop`) có một hay hai chỗ trống; ghi vào rủi ro của design, không mở câu mới.

---

## Phần 0 — Hiện trạng (Claude kiểm 29/10/2026 trên `dev` ở commit `867d385` và DB local)

**Đã xong trong nhóm B:**
- Dashboard AI: [#163](https://github.com/quangtienngo661/english-flashcard/pull/163), [#164](https://github.com/quangtienngo661/english-flashcard/pull/164),
  [#171](https://github.com/quangtienngo661/english-flashcard/pull/171) (#171 thêm tỉ lệ bị luật loại lần đầu và mức dùng lượt của người Pro). Biểu đồ tự vẽ
  (`apps/admin/src/features/dashboard/charts.tsx`), `apps/admin/package.json` không có thư viện biểu đồ nào.
- Màn eval: soạn ví dụ, chạy, xem từng ví dụ ([#161](https://github.com/quangtienngo661/english-flashcard/pull/161)); nhập hàng loạt tới 1000 ví dụ mỗi thao tác
  ([#165](https://github.com/quangtienngo661/english-flashcard/pull/165)); hủy và xóa lần chạy ([#169](https://github.com/quangtienngo661/english-flashcard/pull/169)).

**Chưa có:**
- B1 (đo nền): **mới làm 1/6 thao tác** (cập nhật 29/10/2026, xem câu 1). Lúc viết file này, DB `english_learning` và `english_learning_admin_preview`
  đều có 0 ví dụ, 0 lần chạy eval; lời gọi AI thật khoảng 20, đều thành công. Model thật lúc đó: `claude-haiku-5-5` (Anthropic), chọn cho cả 6 thao tác; sau đó
  chủ dự án chạy thêm `claude-sonnet-5-5`. **Chưa có model OpenAI nào.**
- Bảng `ai_eval_examples` chỉ có `operation`, `input`, `note`: chưa có tiêu chí mong đợi, dev / held-out, phiên bản bộ ví dụ.
- Judge, nhãn người, so hai lần chạy, bản nháp / publish / rollback prompt, nút "Chấm câu AI 7 ngày qua", nút "Đưa vào bộ ví dụ": chưa có dòng code nào.
- Postman và README (chốt ở câu 4/15 ngày 26/10): không có trong repo.

**Đã chốt ngày 26/10, file này không hỏi lại:**

| Câu 26/10 | Đã chốt |
|---|---|
| 16 | Prompt sửa trong admin, có vòng đời (lưu ≠ đang chạy); thử prompt, eval và judge ngay trong admin |
| 17 | Khi publish: chỉ **cảnh báo**, ngưỡng tạm 5 điểm % hoặc có ví dụ trước đạt nay trượt; publish **bắt buộc** có ít nhất một lần eval của chính bản đó; đổi model đi qua cùng kiểu cảnh báo |
| 18 | Không canary (bật dần cho một phần người học) trong đợt này; "bản đang chạy" lưu thành con trỏ riêng để sau thêm canary |
| 19 | Judge chỉ chạy trong eval; khác nhà cung cấp với model sinh câu; mỗi judge là một thao tác AI, cấu hình trên UI (model, effort, token, prompt, lịch sử, tiêu chí) |
| 20 | Judge trả **đạt / không đạt nặng / không đạt nhẹ**, kèm một câu lý do |
| 21 | Có dev / held-out, tỉ lệ held-out chỉnh trên giao diện, ví dụ đã bị mở ra xem thì luôn nằm ở dev; câu về **từ riêng** của người học không bao giờ chép vào bộ ví dụ |
| 22 | Làm nút "Chấm câu AI 7 ngày qua" trong đợt này; người học mẫu là tài khoản test, luyện bằng model thật |
| 23 | Mốc khởi đầu 3%: nếu quá 3% câu đã qua luật bị judge chấm "không đạt nặng" thì mới tính đặt judge trong `prepare` |
| 24 | Dashboard trong `apps/admin`, dùng thư viện biểu đồ; chỉ hiện trên màn, không email |
| 25 | Màn admin theo giao diện hiện tại, phần gọi API tách khỏi phần hiển thị |
| 15, B10 | Để sau launch: canary, online eval chạy theo lịch, judge trong `prepare`, cảnh báo qua email |

---

## Phần 1 — Cách đi và phạm vi

### Câu 1. B1 mới làm một phần, vậy brainstorm thế nào (cập nhật 29/10/2026) ❓

Ngày 26/10 bạn chốt: chạy E1 (tức B1) **trước** rồi mới viết design nhóm B, vì tiêu chí judge chấm phải rút từ lỗi thật.

**B1 tới đâu (29/10/2026):**

| Thao tác | Đã chạy | Kết quả |
|---|---|---|
| `generate_cloze` | 14 ví dụ × 2 model (`claude-haiku-5-5`, `claude-sonnet-5-5`), prompt bản 3 (ví dụ mẫu bị lệch) | Lỗi chính "có từ khác điền vừa": 12/14 và 10/14, mức nặng 5/14 ở cả hai; Sonnet đắt gấp ≈ 12,5 lần mà không giảm lỗi nặng. Chi tiết: [`generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md) |
| `lookup_word`, `translate_sentence`, `generate_meaning_question`, `generate_sentence_mcq`, `check_private_word` | Chưa | — |

Còn hở: mẫu nhỏ (bạn sẽ tăng sau, câu 2.3); chưa chạy lại với prompt đã sửa ví dụ mẫu; chưa thử OpenAI. Nhãn của bạn: theo bạn (29/10/2026), ngữ nghĩa và độ
tự nhiên bạn tự đánh giá **sau khi** khắc phục các lỗi trước mắt, nên lúc này chưa đặt nặng; số liệu tạm theo cách đọc của Claude.

**Những gì B1 quyết định** (phần còn lại của nhóm B làm giống nhau dù có B1 hay không): judge chấm tiêu chí nào (câu 12), mỗi tiêu chí một lời gọi hay gộp (câu 13),
có mô phỏng lần viết lại `#2` (câu 11), model nào đủ tốt (câu 3), con số trần chi phí (câu 18), có đặt judge trong `prepare` (mốc 3%).

- (a) Chạy nốt B1 cho 5 thao tác còn lại (và tăng mẫu) trước, có đủ danh sách lỗi rồi mới viết design.
- (b) Viết design ngay cho phần **không** phụ thuộc B1 (vòng đời prompt, tách trần chi phí, cách lưu tiêu chí và held-out, khung của judge), cộng judge
  "chỉ một đáp án" cho `generate_cloze` vì đã có số; tiêu chí judge của 5 thao tác còn lại chốt sau khi chạy B1 cho chúng.
- (c) Viết design cho tất cả ngay: `generate_cloze` theo số đã có, 5 thao tác còn lại theo tiêu chí đoán trước, sửa lại sau B1.

> **Giải thích (Claude, 29/10/2026).** Ba hướng khác nhau ở chỗ ai chờ ai và phần nào có thể phải làm lại:
>
> | | Claude phải chờ bạn chạy B1? | Có thể phải làm lại? | Số đợt hỏi đáp |
> |---|---|---|---|
> | (a) | Có, trước khi viết design | Gần như không | 1 |
> | (b) | Không: Claude viết phần chung, bạn chạy B1 song song | Không (judge 5 thao tác còn lại viết sau) | 2 |
> | (c) | Không | Có thể, ở phần judge của 5 thao tác còn lại | 1 |
>
> Ví dụ cái "làm lại" ở (c): đoán cần judge "câu tự nhiên" cho `translate_sentence`, rồi B1 cho thấy model không bao giờ sai chỗ đó → judge đó tốn công làm và tốn
> tiền mỗi lần eval mà không bắt được gì.

**Trả lời:**

> **Đề xuất của Claude (29/10/2026):** (b). *Vì sao:* `generate_cloze` đã có số (lỗi "có từ khác điền vừa" 10–12/14), đủ để thiết kế judge đầu tiên; phần vòng đời prompt, tách trần, cách lưu tiêu chí và held-out không đổi dù B1 ra gì; và bạn muốn chia nhiều plan chạy song song (câu 5), nên K1, K3 bắt đầu được trong lúc bạn chạy B1 cho 5 thao tác còn lại. *Trade-off:* hai đợt hỏi đáp; judge của 5 thao tác còn lại viết sau.

### Câu 2. Ai làm gì trong B1

Ngày 26/10 câu 4.4–4.5 chưa chốt (bạn trả lời "implement UI cho admin rồi test trực tiếp trên đó"; màn đó nay đã có).

- 2.1 Ai soạn ví dụ đầu vào: (a) bạn · (b) Claude soạn, bạn duyệt và thêm vài ví dụ của mình · (c) khác. => (b)
- 2.2 Ai đọc đầu ra và ghi danh sách lỗi: (a) bạn · (b) Claude đọc trước, bạn xem lại · (c) cả hai đọc độc lập rồi so. => (b)
- 2.3 Bao nhiêu ví dụ mỗi thao tác (6 thao tác). *Ghi chú (chủ dự án, 29/10/2026): lần chạy đầu `generate_cloze` chỉ 14 ví dụ mỗi model; sẽ tăng tỉ lệ mẫu
  để kiểm tra lại sau, rồi chỉnh các con số trong [`generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md).*
- 2.4 Ngân sách tối đa cho B1 (USD). (5 USD)

**Trả lời:**

### Câu 3. OpenAI ❓

Judge phải khác nhà cung cấp với model sinh câu (câu 19). Hiện cả 6 thao tác dùng `claude-haiku-5-5` (Anthropic) và chưa có model OpenAI nào trong DB.

- (a) Thêm key và model OpenAI, dùng làm judge (hoặc làm model sinh câu, còn Anthropic làm judge).
- (b) Tạm cho judge cùng nhà cung cấp nhưng khác model, màn hiện cảnh báo, tới khi có key OpenAI.
- (c) Khác.

**Trả lời:** mình đã thêm key rồi, nhưng tạm thời mình sẽ cho haiku gen câu và judge sẽ dùng model của anthropic luôn

> **Đề xuất của Claude (29/10/2026):** Đồng ý cho Haiku sinh câu; khác ở judge. Design **không gắn cứng** nhà cung cấp cho judge (judge là thao tác AI, chọn model trên UI như mọi thao tác), chỉ **cảnh báo** trên màn khi judge và model sinh câu cùng nhà cung cấp. Lần hiệu chỉnh judge đầu tiên chạy cả một model Anthropic và một model OpenAI trên cùng bộ nhãn, giữ cái khớp với bạn hơn. *Vì sao:* bạn đã có key OpenAI, nên so hai nhà gần như không tốn thêm việc; chốt 26/10 thành cảnh báo thay vì luật cứng. *Trade-off:* đổi chốt 26/10 (câu 19.3) từ "phải khác" sang "nên khác, có cảnh báo".

**Trả lời thêm (chủ dự án, chat 29/10/2026):** (1) Đưa dữ liệu vào judge thì **không đưa tên model**, chỉ đưa đầu ra, để judge không biết câu do model nào viết.
(2) Hai cách được chấp nhận: OpenAI sinh câu + Anthropic chấm, hoặc chỉ Anthropic. **Không cho OpenAI làm judge.**

> **Đề xuất sửa lại (Claude, 29/10/2026):** Đồng ý cả hai. Judge luôn là model Anthropic; model sinh câu chọn OpenAI hoặc Anthropic; màn cảnh báo khi cả hai cùng
> Anthropic. Judge nhận **đúng đầu vào của ví dụ và đầu ra AI đã viết**, không có tên model, nhà cung cấp, bản prompt hay mã lần chạy. Lần hiệu chỉnh đầu so hai model
> Anthropic (ví dụ Haiku và Sonnet làm judge) với nhãn của bạn, thay cho so Anthropic với OpenAI. *Trade-off:* giấu tên chặn được judge thiên vị vì **biết** tên, nhưng
> theo hiểu biết chung (`ASSUMPTION`, chưa kiểm nguồn trong phiên này) model vẫn có thể chấm dễ hơn cho câu **giống văn phong** của chính nó dù không biết tên; khi
> Haiku sinh và judge cũng Anthropic thì rủi ro này còn, nên vẫn giữ cảnh báo và số đo độ khớp với nhãn của bạn là chỗ phát hiện.

### Câu 4. Postman

Ngày 26/10 chốt làm Postman (gọi API admin của Wordmet, kèm một request kiểm key cho mỗi nhà cung cấp) và README. Từ đó màn admin cho eval đã có.

- (a) Vẫn làm Postman + README.
- (b) Bỏ, dùng màn admin.
- (c) Chỉ làm request kiểm key cho mỗi nhà cung cấp.

**Trả lời:** b

### Câu 5. Chia đợt

Phần còn lại của nhóm B khá lớn. Có thể gom như sau (mỗi khối dùng được một mình):
- **K1** Golden set (tiêu chí mong đợi, dev / held-out, phiên bản bộ ví dụ) + chấm bằng luật trong eval + so hai lần chạy.
- **K2** Judge + nhãn người + trần chi phí riêng.
- **K3** Vòng đời prompt (nháp, publish có cảnh báo, rollback).
- **K4** "Chấm câu AI 7 ngày qua" + "Đưa vào bộ ví dụ".
- **K5** Phần còn lại của dashboard.

Hỏi:
- (a) Một design, một plan cho cả nhóm.
- (b) Một design chung, nhiều plan (mỗi khối một plan, merge dần).
- (c) Mỗi khối một design riêng.
- Thứ tự các khối, nếu bạn muốn khác thứ tự trên.

**Trả lời:** nếu được thì triển khai multi-session, nên mình nghĩ sẽ chia ra thành nhiều plan cho công việc đỡ dồn, sẽ có một phiên điều phối điều khiển các session thực hiện theo plan

### Câu 6. B11 (đo giữ chân người học)

B11 gồm tỉ lệ bị luật loại lần đầu (đã xong ở #171) và giữ chân D7/D30 (bao nhiêu % người học còn quay lại sau 7 và 30 ngày; cần ghi thêm dữ liệu hoạt động).

- (a) Làm D7/D30 trong đợt nhóm B.
- (b) Để đợt khác (ví dụ trước khi tìm người học thật, cùng C6).

**Trả lời:** a

---

## Phần 2 — Golden set (B2)

### Câu 7. Tiêu chí máy tự kiểm cho từng thao tác ❓

Đánh dấu tiêu chí muốn có (giữ, bỏ, thêm). Ví dụ Lan học `deploy`: câu "We ___ the new version every Friday" đạt nếu đáp án là `deploy` và chỉ có một chỗ trống.

| Thao tác | Ứng viên |
|---|---|
| `generate_cloze` (điền từ) | đáp án là từ mục tiêu hoặc dạng chia hợp lệ; đúng một chỗ trống; qua luật Practice |
| `generate_meaning_question` (chọn nghĩa trong câu) | đáp án đúng trỏ đúng nghĩa mục tiêu |
| `generate_sentence_mcq` (trắc nghiệm theo câu) | đúng một phương án đúng; các phương án nhiễu khác nhau |
| `lookup_word` (tra từ) | lemma đúng; từ loại đúng |
| `translate_sentence` (dịch câu) | không có tiêu chí máy kiểm được |
| `check_private_word` (kiểm từ riêng) | `verdict` khớp nhãn (`ok` / `not_recognized`) |

**Trả lời:** mình nghĩ chỗ này cần elaborate thêm

> **Đề xuất của Claude (29/10/2026):** Giữ cả bảng như đang ghi, không thêm dòng. Vì bạn chọn "tiêu chí bắt buộc" (câu 8a), áp dụng **chỉ cho thao tác có ô mong đợi**: `generate_cloze`, `generate_meaning_question`, `lookup_word`, `check_private_word`; `generate_sentence_mcq` và `translate_sentence` không có ô mong đợi (luật code của MCQ không cần, dịch câu không kiểm bằng code được). *Vì sao:* lỗi chính ở B1 code không bắt được, nên thêm tiêu chí code không giúp; phần đó để judge. *Trade-off:* hai thao tác chỉ được chấm bằng judge và người.

> **Giải thích (Claude, 29/10/2026).** "Tiêu chí máy tự kiểm" là phần **code** chấm được, không cần gọi AI, nên rẻ và chấm giống nhau mọi lần. Mỗi ví dụ có thêm một
> ô "mong đợi" (`expected`) do người viết trước khi chạy; lúc chạy, code so đầu ra của AI với ô đó. Cụ thể từng thao tác:
>
> | Thao tác | Ô "mong đợi" ví dụ | Code kiểm gì | Ví dụ không đạt |
> |---|---|---|---|
> | `generate_cloze` | `{"answers": ["deploy"]}` cho câu cần đúng dạng gốc | `accepted_answers` chỉ chứa dạng của từ mục tiêu; câu có đúng một `___`; không lộ từ (đây là luật Practice đang chạy cho người học, `practice/ai/ai-checks.ts`) | AI trả `accepted_answers: ["release"]`, hoặc câu có hai `___` |
> | `generate_meaning_question` | `{"sense": "triển khai (phần mềm)"}` | từ trong câu là một dạng của từ mục tiêu, xuất hiện đúng một lần | câu dùng `deployment` thay vì `deploy` |
> | `generate_sentence_mcq` | không cần | đúng 3 phương án nhiễu, khác nhau, lấy trong danh sách gửi đi, không trùng đáp án | hai phương án nhiễu giống nhau |
> | `lookup_word` | `{"lemma": "go", "part_of_speech": "verb"}` cho đầu vào `went` | lemma và từ loại AI trả khớp ô mong đợi | AI trả lemma `went` |
> | `translate_sentence` | — | không có gì code kiểm được; đúng ý hay không phải nhờ judge hoặc người | — |
> | `check_private_word` | `{"verdict": "not_recognized"}` cho `deplyo` | kết luận AI trả khớp ô mong đợi | AI trả `ok` cho chữ gõ sai `deplyo` |
>
> Câu hỏi là: giữ, bỏ hay thêm dòng nào. Lưu ý từ B1: lỗi chính của `generate_cloze` (có từ khác điền vừa) **code không kiểm được**, chỉ judge hoặc người kiểm được;
> lỗi E2 (nhận `deployed` sau "will") cũng vậy, vì `deployed` vẫn là một dạng hợp lệ của `deploy`.

### Câu 8. Tiêu chí mong đợi có bắt buộc không

- (a) Bắt buộc với mọi ví dụ mới.
- (b) Tùy chọn: ví dụ không có tiêu chí thì chỉ kiểm khuôn như hiện nay.
- 8.2 Nhập hàng loạt (#165) có kèm tiêu chí và dev / held-out trong file luôn không: (a) có · (b) không, sửa từng ví dụ sau.

**Trả lời:** a, 8.2a

### Câu 9. Phiên bản bộ ví dụ

Hai lần chạy chỉ so được công bằng khi chạy trên cùng một bộ ví dụ. Bộ ví dụ lớn dần theo thời gian.

- (a) Mỗi lần thêm, sửa, xóa ví dụ thì phiên bản tự tăng.
- (b) Admin bấm "Chốt phiên bản" khi muốn; giữa hai lần chốt là bản đang soạn.
- (c) Không đánh phiên bản; khi so, chỉ so trên các ví dụ mà cả hai lần chạy cùng có.

**Trả lời:** b

### Câu 10. Held-out ❓

- 10.1 Tỉ lệ held-out mặc định khi mới tạo (chỉnh được trên giao diện, đã chốt). (30%)
- 10.2 "Đã bị mở ra xem" tính khi nào: (a) mở trang chi tiết ví dụ · (b) xem đầu ra của nó trong một lần chạy · (c) cả hai. (chưa hiểu)
- 10.3 Ví dụ held-out có ai xem được nội dung không: (a) không ai, chỉ thấy số tổng · (b) admin xem được, xem xong thì chuyển sang dev. (mình tưởng là AI không đọc được thôi? Nếu admin đọc được thì held-out có bị chuyển sang dev không?)

> **Giải thích (Claude, 29/10/2026).** Held-out giấu **người sửa prompt** (bạn), không giấu AI. AI luôn phải đọc ví dụ thì mới viết được đầu ra để chấm.
>
> Giống đề thi: dev là bài tập về nhà (bạn xem từng câu, sửa prompt cho tới khi làm tốt); held-out là đề thi cuối kỳ (bạn không xem trước). Nếu bạn đã xem câu
> `bank` trong held-out rồi sửa prompt cho riêng câu đó, điểm held-out lên mà prompt chưa chắc tốt hơn với từ khác. Nên ví dụ held-out nào **bạn** đã đọc thì nó
> không còn là "đề thi chưa xem" nữa → chuyển sang dev.
>
> - 10.2 hỏi "đọc" tính từ lúc nào: (a) bạn mở trang chi tiết của ví dụ (thấy đầu vào), (b) bạn mở kết quả của nó trong một lần chạy (thấy câu AI viết), hay (c)
>   cả hai.
> - 10.3 hỏi màn có cho bạn mở ví dụ held-out không: (a) không cho, chỉ hiện "held-out: đạt 8/10"; (b) cho mở, mở xong thì ví dụ đó tự chuyển sang dev. Đúng như
>   bạn hỏi: ở (b), admin đọc được, và đọc rồi thì chuyển sang dev.

**Trả lời:** 

> **Đề xuất của Claude (29/10/2026):** 10.1 đồng ý 30%. 10.2 **(c)**: bạn thấy đầu vào hay đầu ra của một ví dụ held-out đều tính là "đã xem". 10.3 **(b)**: cho mở, trước khi mở hiện hộp hỏi "Xem ví dụ này sẽ chuyển nó sang dev, tiếp tục?". *Vì sao:* đôi khi cần xem để hiểu vì sao điểm held-out tụt; hộp hỏi giữ cho việc đó là chủ ý. *Trade-off:* held-out vơi dần theo số lần xem, phải bù bằng ví dụ mới.

---

## Phần 3 — Chấm bằng luật trong eval (B4 tầng 1)

### Câu 11. Luật Practice trong eval ❓

Trên đường người học, câu AI bị luật Practice loại thì được viết lại một lần (`#2`), vẫn sai thì đổi sang câu không AI. Trong eval có thể:

- (a) Chỉ chấm lần đầu: báo "bị luật loại", không viết lại (rẻ, đo đúng tỉ lệ bị loại lần đầu). 
- (b) Mô phỏng đủ như người học: viết lại một lần, báo cả hai lần (tốn thêm lời gọi, đo được tỉ lệ cuối cùng phải đổi câu không AI).

**Trả lời:** là sao

> **Đề xuất của Claude (29/10/2026):** **(a)**. *Vì sao:* tỉ lệ bị loại lần đầu là con số dashboard đang đo (#171) nên eval đo cùng thứ để so được; B1 chưa thấy câu nào bị luật loại trong 28 câu (Claude đọc, chưa chạy code); (b) phải dựng lại cả đường viết lại `#2` trong eval. *Trade-off:* eval không cho "tỉ lệ cuối cùng phải đổi sang câu không AI".

> **Giải thích (Claude, 29/10/2026).** "Luật Practice" là đoạn code kiểm câu AI trước khi đưa cho người học (`practice/ai/ai-checks.ts`): đáp án phải là một dạng
> của từ đang học, câu không được lộ sẵn từ đó. Với người học, nếu câu bị luật loại thì app nhờ AI viết lại **một lần nữa** (lời gọi `#2`); lần hai vẫn hỏng thì
> đưa Lan một câu không AI.
>
> Ví dụ Lan học `deploy`, AI viết "The team will ___ the app after they deploy the tests." → lộ `deploy` → bị loại → AI viết lại → câu mới qua luật → Lan nhận câu.
>
> Hiện **eval không chạy luật này**: lần chạy B1 chỉ báo "đúng khuôn 14/14". Câu 11 hỏi khi thêm luật vào eval thì:
> - (a) chỉ chạy lần đầu, báo "bị luật loại" là xong: một lời gọi mỗi ví dụ; đo được "bao nhiêu % câu lần đầu bị loại".
> - (b) làm y như với Lan: bị loại thì gọi thêm lần `#2`, báo cả hai: tốn thêm lời gọi ở các ví dụ bị loại; đo được thêm "bao nhiêu % cuối cùng phải đổi sang câu
>   không AI".
>
> Trong 28 câu B1, Claude chưa thấy câu nào lộ từ hay có đáp án không phải dạng của từ, nên ở `generate_cloze` hai hướng hiện khác nhau rất ít (chưa kiểm bằng code).

---

## Phần 4 — Judge và nhãn người (B4 tầng 2–3, B5)

### Câu 12. Judge chấm những tiêu chí nào trong đợt đầu ❓

Câu 1 quyết định có chốt câu này trước B1 hay không. Ứng viên (đánh dấu giữ / bỏ / thêm):
- chỉ một đáp án đúng (điền từ, trắc nghiệm theo câu, chọn nghĩa trong câu) — ví dụ "We ___ the app" có cả `deploy` và `release` đều điền được là không đạt;
- câu không lộ đáp án;
- nghĩa tiếng Việt đúng (tra từ);
- dịch đúng ý, tự nhiên (dịch câu);
- câu tự nhiên;
- đúng mức CEFR.

**Trả lời:** chưa hiểu chỗ này lắm, nhưng mình đang ưu tiên judge cũng có thể tùy biến prompt như các thao tác đã làm

> **Đề xuất của Claude (29/10/2026):** Judge có sẵn lúc đầu: **chỉ "chỉ một đáp án"**, cho `generate_cloze` (có số B1), dùng được cho `generate_meaning_question` và `generate_sentence_mcq` khi B1 của hai thao tác đó xác nhận cùng lỗi. Thêm judge khác qua màn quản lý tiêu chí (đã chốt 26/10) khi B1 của thao tác đó cho thấy lỗi thật, ví dụ "nghĩa tiếng Việt đúng" cho `lookup_word`. *Vì sao:* B1 cho thấy chỉ lỗi này hay xảy ra (CEFR 1/28, lộ đáp án và sai nghĩa 0/28); mỗi judge thêm là thêm tiền mỗi lần eval. *Trade-off:* tiêu chí chưa có judge chỉ được kiểm bằng mắt bạn.

> **Giải thích (Claude, 29/10/2026).** Tùy biến prompt của judge trên UI đã chốt từ 26/10 (câu 19): mỗi judge là một thao tác AI như `generate_cloze`, sửa
> prompt, chọn model, xem lịch sử trên admin. Câu 12 hỏi chuyện khác: **lúc đầu có những judge nào**. Mỗi judge chấm một câu hỏi "có/không" về đầu ra, ví dụ:
>
> | Judge | Hỏi gì | Ví dụ không đạt |
> |---|---|---|
> | chỉ một đáp án | còn từ nào khác điền vừa không | "kept a steady ___": `beat` cũng được |
> | không lộ đáp án | câu có gợi ý quá rõ không | "Rẻ, chỉ 2 đô, rất ___" khi đáp án là `cheap` (chỉ minh họa) |
> | nghĩa tiếng Việt đúng | `lookup_word` cho nghĩa đúng không | tra `bank` trong câu về sông mà ra "ngân hàng" |
> | dịch đúng ý | `translate_sentence` dịch đúng không | dịch sai thì quá khứ thành tương lai |
> | câu tự nhiên | người bản xứ có nói vậy không | câu gượng, ngữ pháp lạ |
> | đúng CEFR | câu có khó hơn level không | `child` A1 trong câu có "abuse and neglect" |
>
> Mỗi judge là một lời gọi AI mỗi câu được chấm (nếu tách, câu 13), nên càng nhiều judge càng tốn. B1 mới có số cho `generate_cloze`: "chỉ một đáp án" sai
> 10–12/14; "đúng CEFR" sai 1/28; "lộ đáp án", "sai nghĩa" 0/28. Nếu có màn thêm judge trên UI, câu này chỉ còn là "những judge nào có sẵn lúc đầu".

### Câu 13. Một lời gọi judge chấm mấy tiêu chí

- (a) Mỗi tiêu chí một lời gọi riêng (dễ đo từng tiêu chí, tốn hơn).
- (b) Một lời gọi chấm mọi tiêu chí của thao tác đó (rẻ hơn, khó biết judge sai ở tiêu chí nào).

**Trả lời:** cái này cũng có thể tùy chỉnh trong giao diện4

### Câu 14. Judge chạy khi nào

- (a) Mỗi lần chạy eval tự gọi judge.
- (b) Lần chạy eval có ô "Chấm bằng judge", bật thì mới gọi.
- (c) Chấm judge là một nút riêng, bấm trên một lần chạy đã xong.

**Trả lời:** b + c

### Câu 15. Bao giờ điểm judge được tin ❓

Judge chưa được đo với nhãn người thì điểm của nó chỉ để tham khảo.

- 15.1 Cần bao nhiêu nhãn người mỗi tiêu chí trước khi đo độ khớp.
- 15.2 Độ khớp tối thiểu để điểm judge được coi là tin (ví dụ 90%).
- 15.3 Ba mức "đạt / không đạt nặng / không đạt nhẹ": tính khớp khi (a) đúng cả mức · (b) chỉ cần cùng "đạt" hay "không đạt".
- 15.4 Khi chưa đạt độ khớp, màn hiện điểm judge thế nào: (a) vẫn hiện, gắn nhãn "chưa hiệu chỉnh" · (b) ẩn.

**Trả lời:** giải thích

> **Đề xuất của Claude (29/10/2026):** 15.1 **30 nhãn** mỗi tiêu chí. 15.2 **85%**. 15.3 **(b)** cho con số "tin được" (cùng đạt / không đạt), kèm một số phụ "khớp cả mức nặng / nhẹ" để bạn thấy judge phân mức tốt tới đâu. 15.4 **(a)** vẫn hiện, gắn "chưa hiệu chỉnh". *Vì sao:* 30 nhãn là mức gắn được trong khoảng 15–20 phút mỗi tiêu chí (ước lượng); phân biệt nặng / nhẹ khó cả với người, lấy làm cổng thì judge khó qua; giấu điểm thì mất thông tin lúc bạn chưa gắn nhãn. Các con số đều là `ASSUMPTION`, sửa được trên UI. *Trade-off:* 30 nhãn vẫn nhỏ (sai số khoảng ±10 điểm %).

> **Giải thích (Claude, 29/10/2026).** Judge cũng là AI nên cũng chấm sai. Trước khi tin điểm của nó, phải đo nó sai bao nhiêu, bằng cách so với bạn:
>
> 1. Bạn tự chấm 30 câu AI theo tiêu chí "chỉ một đáp án": đạt / không đạt nặng / không đạt nhẹ. Đó là 30 nhãn người.
> 2. Judge chấm đúng 30 câu đó.
> 3. Đếm số câu judge chấm giống bạn, ví dụ 27/30 = 90%. Đó là "độ khớp".
>
> - 15.1 hỏi cần bao nhiêu câu bạn tự chấm (ít quá thì con số dao động: 9/10 và 27/30 đều là 90% nhưng 9/10 kém tin hơn).
> - 15.2 hỏi khớp bao nhiêu thì coi điểm judge là tin được.
> - 15.3 hỏi "giống" nghĩa là gì: bạn chấm "nặng", judge chấm "nhẹ" thì (a) tính là khác, hay (b) tính là giống vì cả hai đều "không đạt".
> - 15.4 hỏi khi judge chưa đạt độ khớp (ví dụ mới 70%), màn admin (a) vẫn hiện điểm của nó kèm chữ "chưa hiệu chỉnh", hay (b) giấu đi.
>
> Ghi chú: bạn đã nói gắn nhãn để sau, khi đã sửa các lỗi trước mắt. Câu này vẫn cần chốt để design biết màn cần làm gì, dù bạn gắn nhãn muộn.

### Câu 16. Gắn nhãn người ở đâu

- (a) Ngay trên bảng kết quả từng ví dụ của một lần chạy eval (cạnh đầu ra).
- (b) Một màn riêng "Gắn nhãn", lần lượt từng đầu ra, phím tắt đạt / nặng / nhẹ.
- (c) Cả hai.

**Trả lời:** c

### Câu 17. Prompt của judge đổi thì điểm cũ ra sao

Điểm judge của các lần chạy trước là chấm bằng prompt judge cũ.

- (a) Giữ nguyên, ghi rõ chấm bằng bản judge nào; biểu đồ đánh dấu chỗ đổi.
- (b) Cho bấm "chấm lại" một lần chạy cũ bằng judge mới.
- (c) Cả hai.

**Trả lời:** c

### Câu 18. Trần chi phí của eval, test và judge ❓

Đã kiểm trong code: lời gọi `test` và `eval` của admin **không bị chặn** bởi trần lời gọi mỗi ngày, nhưng **vẫn được đếm** vào trần đó
(`call-ledger.service.ts`, `countToday` đếm mọi `ai_calls`). Hệ quả: một lần chạy eval lớn có thể làm người học hết AI tới 0 giờ. Câu 19.4 ngày 26/10 chưa chốt.

- 18.1 (a) Tách: lời gọi của người học có trần riêng, của eval / test / judge có trần riêng · (b) giữ một trần chung như hiện nay · (c) khác.
- 18.2 Trần riêng tính bằng (a) số lời gọi · (b) USD · (c) cả hai.
- 18.3 Con số ban đầu (chỉnh được trên UI).

**Trả lời:** là sao

> **Đề xuất của Claude (29/10/2026):** 18.1 **(a)** tách. 18.2 **(b)** USD. 18.3 **2 USD / ngày** cho eval + test + judge (`ASSUMPTION`). *Vì sao:* tách thì bạn chạy eval không làm Lan hết AI; đếm bằng USD vì giá mỗi lời gọi chênh nhiều theo model (Sonnet gấp ≈ 12,5 lần Haiku ở B1), đếm lời gọi sẽ lệch; 2 USD đủ khoảng 5000 câu `generate_cloze` với Haiku hoặc 400 với Sonnet. *Trade-off:* đổi D24 Bước 6; model chưa nhập giá (`cost_known = false`) không đo được bằng USD, nên design phải chọn cách xử lý (đề xuất: không cho chạy eval với model chưa nhập giá).

> **Giải thích (Claude, 29/10/2026).** Hệ thống có một "trần lời gọi mỗi ngày": tới số đó thì AI của người học tắt tới 0 giờ (để không tốn tiền ngoài ý muốn).
> Hiện trần là 3000 (`GET /v1/admin/ai/status`, đọc 28/10). Trần đếm **mọi** lời gọi, kể cả lời gọi bạn chạy eval và test trên admin.
>
> Ví dụ: buổi sáng bạn chạy eval 1000 ví dụ, mỗi ví dụ gọi model sinh câu một lần và judge hai lần = 3000 lời gọi. Eval của bạn vẫn chạy hết (eval không bị trần
> chặn), nhưng trần đã đầy, nên buổi chiều Lan bấm luyện tập thì không có câu AI nào tới 0 giờ.
>
> - 18.1 hỏi: (a) chia hai trần, một cho người học, một cho eval / test / judge, để bạn chạy eval không ảnh hưởng Lan; (b) giữ một trần chung như bây giờ.
> - 18.2 hỏi trần riêng đếm bằng số lời gọi (vd. 2000 lời gọi / ngày) hay bằng tiền (vd. 2 USD / ngày), hay cả hai (cái nào tới trước thì dừng).
> - 18.3 hỏi con số ban đầu. Số đo B1 để tham khảo: Haiku khoảng 0,0004 USD mỗi câu `generate_cloze`, Sonnet khoảng 0,005 USD.

### Câu 19. Quyền

Hiện mọi API AI của admin cần `settings.manage` (chỉ `admin`); dashboard cần `ai.view` (`admin` và `editor`).

- 19.1 Ai chạy eval và judge: (a) chỉ `admin` · (b) cả `editor`.
- 19.2 Ai gắn nhãn người: (a) chỉ `admin` · (b) cả `editor`.
- 19.3 Ai publish / rollback prompt: (a) chỉ `admin` · (b) cả `editor`.

**Trả lời:** toàn bộ chỉ admin

---

## Phần 5 — So hai lần chạy và cổng publish (B6)

### Câu 20. So được hai lần chạy khi nào ❓

- (a) Chỉ khi cùng phiên bản bộ ví dụ.
- (b) Luôn so được, nhưng chỉ tính trên các ví dụ cả hai cùng có, màn ghi rõ số ví dụ chung.

> **Giải thích (Claude, 29/10/2026).** Bạn đã chọn "Chốt phiên bản" (câu 9b). Ví dụ: hôm nay chạy Haiku trên bộ ví dụ bản 1 (14 câu); tuần sau bạn thêm 20 câu, chốt
> bản 2, rồi chạy Haiku với prompt đã sửa trên bản 2 (34 câu). Hai lần chạy khác bộ câu, nên "lần 1 đạt 4/14, lần 2 đạt 20/34" chưa chắc cho biết prompt mới tốt
> hơn: có thể 20 câu mới dễ hơn.
> - (a) Màn chỉ cho so hai lần chạy cùng bản bộ ví dụ; muốn so thì chạy lại prompt cũ trên bản 2.
> - (b) Màn cho so luôn, nhưng chỉ tính trên 14 câu cả hai cùng có, ghi "so trên 14 câu chung".

**Trả lời:** 

> **Đề xuất của Claude (29/10/2026):** **(a)**. *Vì sao:* bạn đã chọn "Chốt phiên bản" (câu 9b), nên chạy lại bản cũ trên bộ mới là đủ và rẻ (14 câu Haiku ≈ 0,006 USD); so trên phần chung dễ ra kết luận sai mà không ai để ý. *Trade-off:* mỗi lần chốt bộ mới phải chạy lại bản đang chạy để có mốc.

### Câu 21. "Lần eval bắt buộc" trước publish phải thỏa gì ❓

Đã chốt: publish phải có ít nhất một lần eval của chính bản đó. Còn mở:

- 21.1 Lần eval đó phải chạy với đúng model đang chọn cho thao tác không: (a) có · (b) không.
- 21.2 Phải gồm phần held-out không: (a) có · (b) chỉ dev là đủ.
- 21.3 Lần chạy bị lỗi giữa chừng (một số ví dụ đã xong) có tính không: (a) có · (b) không.
- 21.4 Cảnh báo so với cái gì: (a) lần eval gần nhất của bản đang chạy · (b) lần eval bạn chọn.
- 21.5 Bản đang chạy chưa từng có lần eval nào thì: (a) publish không cảnh báo gì · (b) yêu cầu chạy eval cho bản đang chạy trước.

> **Giải thích (Claude, 29/10/2026).** Đã chốt: muốn publish prompt mới thì phải chạy eval nó ít nhất một lần, và màn cảnh báo nếu nó kém hơn bản đang chạy. Câu 21
> hỏi "một lần eval" đó phải như thế nào mới được tính. Ví dụ bạn sửa prompt `generate_cloze` thành bản 4:
> - 21.1: thao tác đang dùng Haiku, mà bạn chạy eval bản 4 bằng Sonnet. Có tính không? Nếu tính thì kết quả eval không nói gì về bản 4 chạy với Haiku.
> - 21.2: bản 4 chỉ chạy phần dev (bài tập) có đủ không, hay phải chạy cả held-out (đề thi).
> - 21.3: lần chạy bị dừng ở câu 10/14 (mạng lỗi, hoặc bạn bấm hủy). Có tính là "đã eval" không.
> - 21.4: cảnh báo "kém hơn" so với cái gì: (a) tự lấy lần eval gần nhất của bản 3 đang chạy; (b) bạn tự chọn lần chạy để so.
> - 21.5: bản 3 đang chạy chưa từng được eval (như hiện nay), thì không có gì để so. (a) Cho publish bản 4, không cảnh báo; (b) bắt chạy eval bản 3 trước để có mốc.

**Trả lời:**

> **Đề xuất của Claude (29/10/2026):** 21.1 **(a)**. 21.2 **(a)** có held-out. 21.3 **(b)** không. 21.4 **(a)** tự lấy lần eval gần nhất của bản đang chạy, trên cùng phiên bản bộ ví dụ. 21.5 **(b)** bắt chạy eval cho bản đang chạy trước (chỉ lần đầu). *Vì sao:* cổng publish chỉ có nghĩa khi kết quả đúng là của cấu hình sắp chạy thật, trên cả đề thi; một lần chạy dở không đủ câu để so. *Trade-off:* publish chậm hơn một lần chạy eval; lần đầu phải chạy hai lần (bản cũ và bản mới).

### Câu 22. Đổi model thì đi đường nào ❓

Hiện đổi model, effort, số token của một thao tác là lưu ngay và có hiệu lực ngay (có `expected_version` để hai người không ghi đè nhau). Đã chốt đổi model cũng
cảnh báo như đổi prompt.

- (a) Model đi cùng prompt thành **một cấu hình** có vòng đời chung: soạn nháp (prompt + model + effort + token) → eval → publish → rollback cả cụm.
- (b) Prompt có vòng đời; model vẫn lưu ngay, chỉ hiện cảnh báo trước khi lưu nếu chưa có lần eval với model mới.
- (c) Khác.

> **Giải thích (Claude, 29/10/2026).** Lúc B1, bạn đổi `generate_cloze` từ Haiku sang Sonnet trên trang Thao tác AI: bấm lưu là người học dùng Sonnet ngay, không có
> nháp, không có nút quay lại. Prompt thì sắp có nháp / publish / rollback. Câu này hỏi model có đi cùng đường đó không:
> - (a) Gộp: một "cấu hình" = prompt + model + effort + số token. Bạn soạn nháp "prompt bản 4 + Sonnet", chạy eval, publish cả cụm; rollback thì quay cả prompt lẫn
>   model về như cũ. Đổi model để thử như lúc B1 sẽ không còn ảnh hưởng người học.
> - (b) Tách: prompt có nháp và publish; model vẫn bấm lưu là chạy ngay như hiện nay, chỉ thêm một cảnh báo "model này chưa có lần eval nào" trước khi lưu.

**Trả lời:**

> **Đề xuất của Claude (29/10/2026):** **(a)** gộp thành một cấu hình. *Vì sao:* lúc B1 bạn phải đổi model của thao tác thật để thử Sonnet, và người học dùng Sonnet ngay lúc đó; gộp thì thử model nằm trong nháp, không đụng người học, và rollback quay được cả model. Câu 17.3 (đổi model cũng qua cổng) cũng đòi điều này. *Trade-off:* đổi lớn hơn: trang Thao tác AI và trang Prompt nhập vào một vòng đời; đổi D15 Bước 6 và cách lưu cài đặt thao tác.

**Trả lời thêm (chủ dự án, chat 29/10/2026):** ok (đồng ý đề xuất (a)).

---

## Phần 6 — Vòng đời prompt (B7)

### Câu 23. Bản nháp

- 23.1 Mỗi thao tác có (a) một bản nháp · (b) nhiều bản nháp song song.
- 23.2 Bản nháp lưu (a) trên server, người khác có quyền thấy · (b) chỉ trên trình duyệt của người soạn.

**Trả lời:** 23.1 a, 23.2 a

### Câu 24. Rollback

- (a) Chỉ về bản đã publish ngay trước.
- (b) Chọn bất kỳ bản nào từng publish.
- 24.2 Rollback có cần lần eval không: (a) không, vì bản đó từng chạy · (b) có cảnh báo nếu bản đó chưa có eval với model hiện tại.

**Trả lời:** a

### Câu 25. Câu đã tạo sẵn bằng bản cũ ❓

Ví dụ Lan đang trong phiên, đã có 2 câu AI tạo sẵn (`prepare`) bằng prompt bản 3; admin publish bản 4.

- (a) 2 câu đó vẫn dùng (mỗi câu đã ghi bản prompt tạo ra nó).
- (b) Bỏ 2 câu đó, tạo lại bằng bản 4 (tốn thêm lời gọi, Lan có thể phải chờ).

> **Giải thích (Claude, 29/10/2026).** Khi Lan mở phiên luyện tập, app nhờ AI viết sẵn vài câu tiếp theo (`prepare`, mặc định 2 câu) để Lan không phải chờ. Nếu
> đúng lúc đó bạn publish prompt mới, 2 câu viết sẵn là của prompt cũ. Câu hỏi: Lan vẫn làm 2 câu đó (a), hay app vứt đi và viết lại bằng prompt mới (b). Tình
> huống này chỉ xảy ra ở vài phiên đang mở đúng lúc publish.

**Trả lời:**

> **Đề xuất của Claude (29/10/2026):** **(a)**. *Vì sao:* nhiều nhất 2 câu mỗi phiên đang mở, mỗi câu đã ghi bản prompt tạo ra nó nên số liệu vẫn tách được theo bản; (b) làm Lan chờ và tốn thêm lời gọi. *Trade-off:* nếu publish để chữa một lỗi nặng thì vài câu lỗi cũ vẫn tới người học (vẫn có nút báo lỗi và trả lượt).

---

## Phần 7 — "Chấm câu AI 7 ngày qua" và "Đưa vào bộ ví dụ" (đã chốt làm, câu 21.3 và 22 ngày 26/10)

### Câu 26. Chấm câu AI 7 ngày qua ❓

Nội dung lời gọi chỉ giữ 7 ngày, nên chỉ chấm được câu trong 7 ngày.

- 26.1 Mỗi lần bấm chấm (a) mọi câu AI trong 7 ngày · (b) tối đa N câu (chọn N) · (c) một mẫu ngẫu nhiên x%.
- 26.2 Lọc theo (chọn nhiều): thao tác, bản prompt, model, chỉ tài khoản test.
- 26.3 Kết quả hiện ở (a) một trang riêng · (b) dashboard · (c) cả hai.

> **Giải thích (Claude, 29/10/2026).** Đây là nút đã chốt ngày 26/10: thay vì chấm bộ ví dụ soạn sẵn, judge chấm **các câu AI thật đã đưa cho người học** (giai đoạn
> này là tài khoản test của bạn) trong 7 ngày qua. Ví dụ tuần này tài khoản test luyện 200 câu AI; bấm nút thì judge chấm và báo "18/200 câu có từ khác điền vừa".
> - 26.1: mỗi lần bấm chấm hết 200 câu, chỉ tối đa N câu (để giới hạn tiền), hay một phần ngẫu nhiên (ví dụ 20%).
> - 26.2: có cho lọc trước khi chấm không, ví dụ chỉ chấm `generate_cloze`, chỉ câu của prompt bản 4, chỉ câu do Haiku viết, chỉ tài khoản test.
> - 26.3: kết quả xem ở một trang riêng (từng câu kèm lý do), trên dashboard (số tổng), hay cả hai. Câu 29 bạn đã chọn đưa kết quả này lên dashboard.

**Trả lời:** 

> **Đề xuất của Claude (29/10/2026):** 26.1 **(b)** tối đa N câu mỗi lần bấm, mặc định 200, màn hiện chi phí ước tính trước khi chạy. 26.2 cả bốn bộ lọc. 26.3 **(c)**. Câu về từ riêng của người học không chấm (đã chốt). *Vì sao:* giới hạn N giữ chi phí đoán trước được và nằm trong trần ở câu 18; có bộ lọc thì so được hai bản prompt trên câu thật. *Trade-off:* quá N câu thì phải bấm nhiều lần hoặc chấm theo mẫu.

### Câu 27. Đưa vào bộ ví dụ ❓

- 27.1 Nguồn có nút (chọn nhiều): báo lỗi đã được nhân viên xác nhận · câu bị luật loại · dạng chia lạ (`practice_unknown_forms`) · câu judge chấm "không đạt" ở mục 26.
- 27.2 Tiêu chí mong đợi của ví dụ mới: (a) người bấm tự điền · (b) máy điền sẵn từ câu gốc, người bấm sửa · (c) để trống, điền sau.
- 27.3 Ví dụ mới vào (a) dev · (b) held-out · (c) người bấm chọn.

> **Giải thích (Claude, 29/10/2026).** Khi thấy một câu AI hỏng ngoài thực tế, nút "Đưa vào bộ ví dụ" biến nó thành một ví dụ kiểm thử, để lần sửa prompt sau tự kiểm
> lại đúng lỗi đó. Ví dụ Lan báo câu "kept a steady ___" sai vì `beat` cũng đúng; nhân viên xác nhận; bấm nút → bộ ví dụ `generate_cloze` có thêm đầu vào
> "`rhythm`, B2, âm nhạc".
> - 27.1: nút xuất hiện ở những chỗ nào (báo lỗi đã xác nhận, câu bị luật loại, dạng chia lạ, câu judge chấm "không đạt" ở câu 26).
> - 27.2: ô "mong đợi" (câu 7) của ví dụ mới do ai điền: người bấm tự gõ; máy điền sẵn từ câu gốc (ví dụ `answers: ["rhythm"]`) rồi người bấm sửa; hay để trống.
> - 27.3: ví dụ mới vào dev (bài tập) hay held-out (đề thi). Lưu ý: người bấm đã đọc câu này rồi, nên theo luật held-out (câu 10) nó khó còn là "chưa xem".

**Trả lời:** 

> **Đề xuất của Claude (29/10/2026):** 27.1 báo lỗi đã xác nhận + câu judge chấm "không đạt" ở câu 26; câu bị luật loại và dạng chia lạ để sau (dạng chia lạ đã có màn xử lý riêng). 27.2 **(b)** máy điền sẵn, người bấm sửa. 27.3 **(a)** dev. *Vì sao:* hai nguồn đầu là lỗi người thật gặp, đúng mục đích của nút; người bấm đã đọc câu nên theo luật held-out (câu 10) nó chỉ có thể vào dev. *Trade-off:* held-out chỉ lớn lên bằng ví dụ soạn mới, không từ lỗi thật.

---

## Phần 8 — Dashboard còn lại (B8)

### Câu 28. Thư viện biểu đồ

Câu 24.1 ngày 26/10 bạn muốn dùng thư viện biểu đồ; bản đã merge tự vẽ (không có thư viện trong `apps/admin/package.json`).

- (a) Giữ tự vẽ.
- (b) Đổi sang một thư viện (Claude so các thư viện hiện hành ở bước design rồi bạn chọn).

**Trả lời:** a

### Câu 29. Phần thêm vào dashboard

Chọn những gì muốn có trong đợt này:
- số ngày chạm trần lời gọi, so với **trần của chính ngày đó** (cần lưu lịch sử trần; hiện so với trần hiện tại);
- kết quả eval gần nhất của từng thao tác (câu 24.4 ngày 26/10);
- điểm judge theo thao tác và bản prompt;
- kết quả của "Chấm câu AI 7 ngày qua".

**Trả lời:** toàn bộ

---

## Phần 9 — Làm và kiểm

### Câu 30. "Xong khi"

Các Bước trước: CI xanh mỗi PR + một smoke chạy trên DB mới với model giả. Nhóm B có thêm lời gọi thật.

- 30.1 Thêm một lần chạy thật (eval + judge) với key của bạn vào "Xong khi": (a) có · (b) không.
- 30.2 Nếu có: ngân sách cho lần chạy đó (USD), và ai chạy (bạn hay Claude với key trong `.env` của bạn).

**Trả lời:** 30.1 mình tự chạy, 30.2 5 USD

### Câu 31. Cách thực thi

- (a) Claude làm hết, bạn review (như Bước 3–8).
- (b) Có một phần bạn tự viết (ví dụ prompt của judge, hoặc tiêu chí); Claude chỉ review.
- (c) Khác.

**Trả lời:** a

### Câu 32. Còn gì bạn muốn thêm hoặc bỏ khỏi nhóm B ❓

**Trả lời:** phân tích chỗ này thêm

> **Đề xuất của Claude (29/10/2026):** T1 **thêm, làm ngay** trên trang Prompt trước các lần chạy B1 tiếp theo (không cần code; nếu không thì mọi số B1 sau vẫn lẫn ảnh hưởng của ví dụ lệch). T2 **thêm**, vào khối vòng đời prompt (K3): kiểm ví dụ mẫu lúc lưu nháp. T3 **Claude kiểm kho từ trước** (có cụm động từ không, từ loại gì) rồi mới quyết. T4 **thêm vào B1**, không cần code: chạy thêm Haiku với `effort` cao hơn. T5: xem câu 33. D7/D30: đồng ý làm (câu 6a) nhưng là **một plan riêng, chạy sau cùng**, vì không dùng chung code với eval / judge. *Trade-off:* đợt rộng hơn, như ghi ở câu 5.

**Trả lời thêm (chủ dự án, chat 29/10/2026):** T1 ok. (Các mục khác chưa trả lời.)

> **Phân tích (Claude, 29/10/2026).** Những điểm nằm ngoài 31 câu trên, rút từ lần chạy B1 và các câu trả lời của bạn. Chưa phải đề xuất; ghi "thêm", "bỏ" hoặc
> "để sau" cạnh từng dòng.
>
> **Có thể thêm:**
> - **T1 — Sửa ví dụ mẫu của prompt `generate_cloze` bản 3** (đầu vào `instantaneous`, đầu ra câu `brush`). Không cần code, làm trên trang Prompt. Đang ảnh hưởng mọi
>   câu điền từ người học nhận.
> - **T2 — Chặn ví dụ mẫu lệch khi lưu prompt.** Lỗi ở T1 lọt vì màn lưu không kiểm gì. Có thể kiểm bằng code: đầu vào và đầu ra của ví dụ mẫu phải qua cùng
>   luật như câu AI thật (ví dụ `accepted_answers` phải là dạng của `word` trong đầu vào).
> - **T3 — Cụm động từ (`take off`).** Ví dụ `take off` bị từ chối vì `"phrasal verb"` không có trong danh sách từ loại AI nhận (`AI_VALID_POS`). Chưa kiểm kho từ
>   có cụm động từ hay không và chúng mang từ loại gì; nếu có thì `generate_cloze` cần xử lý chỗ trống hai chữ.
> - **T4 — Thử `effort` / `thinking`.** Cả hai lần chạy B1 để trống. Lỗi chính "có từ khác điền vừa" cần model tự nghĩ các từ thay thế trước (luật 3 của prompt),
>   nên mức suy nghĩ cao hơn có thể giảm lỗi, đổi lại tốn hơn. Chỉ cần chạy thêm eval, không cần code.
> - **T5 — Luật chấm của Practice cho từ khó có một đáp án** (câu 33).
>
> **Có thể bỏ hoặc để sau:**
> - **D7/D30 (câu 6, bạn chọn làm).** Đây là đo giữ chân người học, không phải chất lượng AI; cần ghi thêm dữ liệu hoạt động ở module Learning, không dùng chung code
>   với phần eval / judge. Làm trong đợt này thì đợt rộng hơn, nhưng chạy được như một plan riêng nếu chia nhiều phiên (câu 5).
> - **"Điểm judge theo bản prompt" trên dashboard (câu 29)** phụ thuộc judge (K2) xong trước; nếu chia nhiều plan thì phần này phải nằm sau K2.
>
> **Ràng buộc mới từ câu 3:** bạn chọn Haiku sinh câu và judge cũng là model Anthropic. Ngày 26/10 đã chốt judge **khác** nhà cung cấp, vì model hay chấm dễ cho
> câu của cùng họ. Hai câu trả lời này đi ngược nhau; design cần biết là đổi chốt cũ (cho cùng nhà, tạm thời) hay giữ chốt cũ và chờ dùng OpenAI cho judge.

### Câu 33. Từ khó có câu chỉ một đáp án (thêm 29/10/2026, sau lần chạy B1 đầu tiên) ❓

Lần chạy `generate_cloze` đầu tiên ([`generate_cloze-2026-10-29-error-analysis.md`](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)):
10–12/14 câu có từ khác điền vừa chỗ trống. Một phần là lỗi nhẹ do chính từ đó (`although` ↔ `though`, `fast` ↔ `quickly`, lóng `lit`), prompt hay judge đều khó
cứu. Hiện Practice chỉ nhận đúng các chữ trong `accepted_answers`, và prompt cấm liệt kê từ đồng nghĩa (luật 7), nên Lan điền `though` vẫn bị chấm sai.
Đổi chỗ này là đổi luật chấm của Practice (Bước 4/7), không chỉ nhóm B.

- (a) Giữ như hiện nay; chỉ giảm lỗi bằng prompt và judge.
- (b) Nhận thêm từ đồng nghĩa hợp lệ làm đáp án đúng (bỏ luật 7 của prompt).
- (c) Không dùng bài điền từ cho từ bị judge đánh "khó có một đáp án".
- (d) Lan điền từ khác hợp lệ thì báo "đúng nghĩa, nhưng từ đang học là `although`", không tính sai.
- Có đưa vào đợt nhóm B không, hay để đợt khác.

**Trả lời:** cho mình xem lại luật 7

> **Đề xuất của Claude (29/10/2026):** **(d)**, làm bằng một trường mới trong đầu ra `generate_cloze`, ví dụ `also_fits`: các từ **khác** cũng điền vừa (AI vốn phải nghĩ tới chúng theo luật 3 của prompt). `accepted_answers` giữ nguyên luật 7, nên luật code `checkCloze` không đổi. Lan điền một từ trong `also_fits` thì màn báo "đúng nghĩa, nhưng từ đang học là `although`" và không tính sai. Đưa vào nhóm B như **một plan riêng sau judge**: judge "chỉ một đáp án" đo được phần `also_fits` bỏ sót. *Vì sao:* (b) phải nới luật code và người học dễ nhớ nhầm từ đồng nghĩa là từ đang học; (c) bỏ hẳn bài điền từ cho từ phổ biến như `although`. *Trade-off:* đổi khuôn đầu ra (`schema_version` mới), cách chấm của Practice và màn kết quả của web; AI có thể sót từ (khi đó vẫn chấm sai như hiện nay).

**Trả lời thêm (chủ dự án, chat 29/10/2026):** phạm vi từ đã học đã hiện ở danh sách các từ sẽ được thêm vào luyện tập, nên người học biết đang luyện những từ nào;
bài AI không phải tạo ra mà không có ngữ cảnh từ vựng cụ thể.

> **Đề xuất sửa lại (Claude, 29/10/2026):** Đồng ý điểm này làm lỗi E1 **nhẹ hơn** cách Claude chấm ở file phân tích: Lan biết hôm nay luyện `rhythm`, nên gặp "kept a
> steady ___" sẽ nghĩ tới `rhythm` trước `beat`. Đã kiểm trên web (`apps/web/src/features/learner/practice/session/`): lúc làm câu, thẻ chỉ hiện câu; nghĩa chỉ hiện
> nếu Lan mở gợi ý 1 (gợi ý 2 là chữ cái đầu và số chữ); bản dịch chỉ hiện sau khi trả lời. Rủi ro còn lại là khi **từ đồng nghĩa cũng nằm trong danh sách hôm đó**,
> ví dụ `big` và `large` cùng một phiên A1. Vì vậy đổi đề xuất thành **(a)** cho đợt này: giữ luật chấm, không làm `also_fits`; judge "chỉ một đáp án" coi là **nặng**
> chủ yếu khi từ khác điền vừa cũng là từ người học đang luyện, hoặc là từ rất thông dụng; theo dõi báo lỗi của người học thật rồi mới xét (d). *Trade-off:* trường
> hợp hai từ đồng nghĩa cùng phiên vẫn bị chấm sai cho tới khi có (d); số "lỗi nặng" ở file phân tích cần chấm lại theo luật này.

> **Luật 7 và luật 4 của prompt `generate_cloze` bản 3** (đọc trong DB `english_learning` ngày 29/10/2026, nguyên văn):
>
> - Luật 7: *"accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Do not list other words,
>   even synonyms."* — nghĩa là: `accepted_answers` chỉ ghi các dạng của **chính từ đang học** vừa chỗ trống (tối đa 5), **không** ghi từ khác, kể cả từ đồng nghĩa.
> - Luật 4: *"If you cannot make the given word the only good answer, still give your best sentence; never list other words in accepted_answers."* — không viết
>   được câu chỉ một đáp án thì vẫn đưa câu tốt nhất, và vẫn không ghi từ khác vào `accepted_answers`.
>
> **Vì sao có luật này:** luật Practice trong code (`practice/ai/ai-checks.ts`, `checkCloze`) loại cả câu nếu `accepted_answers` có chữ nào **không phải dạng của
> từ đang học**. Ví dụ AI ghi `["although", "though"]` → `though` không phải dạng của `although` → câu bị loại, AI phải viết lại (`#2`), vẫn vậy thì Lan nhận câu
> không AI. Luật 7 của prompt nói trước cho AI biết điều code sẽ kiểm. Vì vậy hướng (b) của câu 33 phải đổi **cả hai**: luật 7 của prompt và luật kiểm trong code.
