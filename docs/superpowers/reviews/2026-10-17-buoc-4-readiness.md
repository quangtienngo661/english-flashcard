# Bước 4 (Practice không AI) — đã sẵn sàng chưa, và những gì phải chốt trước (17/10/2026)

Phân tích để chủ dự án quyết định: (1) bắt đầu Bước 4 được chưa, (2) có nên brainstorm Bước 4 sớm không, (3) brainstorm cần
chốt những câu nào. Mọi trạng thái dưới đây đọc từ `origin/dev` sau `git fetch` ngày 17/10/2026 (đầu `dev` = `5aa4085`, PR #37),
không lấy từ trí nhớ. Chưa viết code, chưa đổi spec.

## 1. Kết luận

- **Chưa bắt đầu code Bước 4 được.** Bước 3 chưa xong, và D3 đã xếp bước **Deploy ngay sau Bước 3**. Vì vậy thứ tự đang là
  Bước 3 → Deploy → Bước 4, tức là Bước 4 phải chờ cả hai.
- **Brainstorm (viết design) Bước 4 từ bây giờ thì được.** Đây là việc chỉ viết tài liệu, nên luật "chưa duyệt design và plan
  thì chưa code" vẫn giữ. Phần Learning và Content mà Bước 4 dựa vào đã nằm trên `dev`.
- **Rủi ro khi brainstorm sớm:** task 22 của Bước 3 và plan giao diện Bước 3 (chưa viết) có thể còn đổi đúng những chỗ Bước 4
  dùng tới. Cách giảm rủi ro: chốt design bây giờ, để **plan** tới khi Bước 3 xong rồi mới viết, và trước khi viết plan thì đọc
  lại code Learning, Content một lần nữa.

## 2. Bước 3 đang ở đâu (kiểm 17/10/2026)

| Phần | Trạng thái | Bằng chứng |
|---|---|---|
| Plan hệ thống, task 1–21 | Đã merge vào `dev` | PR #29–#37; #37 (dạng chia AGID) merge cuối, `5aa4085` |
| G6 nguồn dạng chia | Đã chốt: AGID chính, `compromise` dự phòng (D46, D47) | decision record Bước 3 |
| Task 22 (gate toàn hệ thống, chạy tay, as-built) | **Chưa làm** | `docs/deliveries/buoc-3.md` chỉ có mục "plan tóm tắt", chưa có "as-built" |
| Giao diện người học (`apps/web`) | **Chưa có plan, chưa có code** | `apps/web/src/app` trên `dev` chỉ có landing, privacy, terms; chưa có file plan giao diện |
| "Xong khi" | Chủ dự án tự báo (D45) | — |
| Deploy | Ngay sau Bước 3 (D3), chưa bắt đầu | — |

Ngoài lề: `CLAUDE.md` đã cũ ở vài chỗ (còn ghi "tiếp theo là Bước 3", "chưa chọn vị trí Deploy", và còn ý "quên khác nhầm" đã bị
D16 bỏ). Design Bước 3 mục 18 đã hẹn một PR docs nhỏ để sửa.

## 3. Bước 4 gồm gì, không gồm gì

Theo HANDOFF §2: **trắc nghiệm, đúng/sai, gõ từ, bài từ câu người học, "từ hay sai"** (spec Practice, phần không AI).

Không thuộc Bước 4: bài điền từ AI, ngân hàng câu chung, bản dịch câu (Bước 6–7); quyền và hạn mức thật (Bước 5); xóa tài khoản
(Bước 8; PRC27 phải chờ tới đó).

Giả định chủ dự án đặt ngày 17/10: **nội dung đủ** (đủ nghĩa đã publish để có đáp án nhiễu). Đây là việc của nội dung, không chặn
thiết kế. Ghi là `ASSUMPTION`.

## 4. Bước 4 cần gì từ phần đã xây

| Bước 4 cần | Đã có trên `dev`? | Ghi chú |
|---|---|---|
| Nhóm, mục học, mức 0–5, cờ ưu tiên | Có (Learning) | `learning_items`, `group_items` |
| Lệnh "Cần ôn tập" (mức 1, hẹn hôm nay, ưu tiên) | Có, qua `POST /v1/reviews` với `answer = review` | Bắt buộc có `groupId`; cột `group_id` của nhật ký thì **cho phép rỗng** |
| Practice gọi Learning từ trong code | **Chưa** | Learning hiện chỉ cho module khác gọi `LearningService.cardsLeftToday`; Bước 4 phải mở thêm hàm |
| Danh sách ôn theo nhóm | Có: `GET /v1/groups/:id/queue` | **Không có** danh sách "hôm nay" chung cho mọi nhóm như spec cũ (LR7); D20, D21 đã chuyển sang ôn và trần theo nhóm |
| Nội dung thẻ (nghĩa, định nghĩa EN, level, loại từ) | Có: `ContentService.cardContent` → `WordSense` | Dùng cho đề bài và phần hiện sau khi nộp |
| Dạng được chấp nhận cho bài gõ từ (CR22) | Có cột `accepted_forms` ở revision, biến thể chính tả có cờ `accepted_as_answer` | Cần kiểm lại lúc viết plan: giá trị mặc định thực tế khi import CSV |
| Cờ từ chức năng (loại khỏi đáp án nhiễu) | Có (`function_word_derived`, `function_word_override`) | — |
| Level hiển thị của entry (cho ±1 level) | Có (truy vấn `displayedLevel`) | Từ riêng có thể không có level, không có loại từ (PRC3 đã tính trường hợp này) |
| Truy vấn chọn đáp án nhiễu | **Chưa** | Content phải thêm một hàm đọc |
| Nghĩa người học được thấy (`visibleSenseCondition`) | Có | Dùng để loại nghĩa bị gỡ, bị retire |
| Câu ngữ cảnh | Có bảng `context_sentences` | **Chưa có** cờ "dùng được cho bài điền từ" (CR14); design Bước 3 mục 7.4 dời việc này sang Bước 4 |
| Bảng dạng chia (`entry_inflections`, AGID) | Có | D29: không dùng làm nguồn chính để chấm; có thể dùng để tìm chỗ che trong câu người học (câu hỏi mở 6) |
| Xóa từ riêng trong một transaction | Có ở Learning (`deleteMyWord`) | Bước 4 phải gắn việc xóa câu hỏi và lượt làm bài vào cùng transaction này (PRC28) |
| Quyền `practice.basic` | **Chưa** (chưa có module Entitlements) | Câu hỏi mở 5 |
| Quyền staff `questions.moderate` | **Chưa** (chỉ có `roles.manage`, `content.*`, `taxonomy.manage`, `settings.manage`) | Chỉ cần nếu Bước 4 có công cụ xử lý câu bị báo lỗi (câu hỏi mở 9) |
| Màn hình người học | **Chưa** | Giao diện luyện tập của Bước 4 phải chờ khung app người học của Bước 3 |
| Cài đặt admin chỉnh được (Settings) | Có (task 9) | Có thể dùng cho các con số như số câu mỗi phiên, nếu muốn admin chỉnh |

## 5. Chỗ spec Practice đã cũ vì Bước 3 đã đổi

Spec chỉ là khung ban đầu; design là tài liệu chính (chủ dự án, 12/10/2026). Những chỗ dưới đây design Bước 4 phải viết lại,
không phải sửa spec.

| Spec cũ | Đã đổi ở Bước 3 | Ảnh hưởng tới Bước 4 |
|---|---|---|
| PRC16, PRC17, Q24, Q25, LR6: bài làm gửi `remembered`/`forgotten` sang Learning và tự đổi lịch | **D16**: bài làm không tự đổi lịch; gõ sai chỉ hiện gợi ý "Cần ôn tập, đưa vào ưu tiên" | Không còn "ghi lượt và cập nhật lịch trong một transaction". Còn lại: khi nào hiện gợi ý, và bấm gợi ý thì gọi Learning ra sao |
| PRC20: lọc theo ba trạng thái; thứ tự "yếu và đến hạn → đến hạn → mới" | **D17**: mức 0–5 + cờ ưu tiên; **D20**: ôn theo nhóm | Thứ tự chọn từ phải viết lại theo mức và cờ ưu tiên |
| PRC20: nguồn "danh sách hôm nay" chung | **D20, D21**: danh sách ôn và trần theo nhóm | Nguồn phiên luyện: theo nhóm, "từ hay sai", hay thêm nguồn khác |
| Hướng "quên khác nhầm" (ghi chú 15/10 trong CLAUDE.md) | **D16** bỏ | Không cần kết quả thứ ba; F40 (không thử lại cùng câu) giữ nguyên |
| PRC7, QE5: dạng chia theo bộ quy tắc + danh sách bất quy tắc owner duy trì | **D29, D46**: có bảng dạng chia từ AGID; chấm theo "expected answer" | Bài không AI chấm theo danh sách đáp án của câu. Danh sách bất quy tắc trong CLAUDE.md giờ chủ yếu là việc của Bước 7 |
| CR14: câu "dùng được cho bài điền từ" đánh dấu lúc lưu | Bước 3 lưu câu nhưng chưa đánh dấu | Câu đã lưu trước Bước 4 cũng cần được xét |
| PRC3: so lemma không phân biệt hoa thường | **D42**: `March` và `march` là hai entry | Giữ ý của PRC3: không để hai chữ đó cùng làm đáp án trong một câu |

## 6. Câu hỏi cần chốt khi brainstorm Bước 4

Theo luật Bước 3 ("chủ dự án trả lời trước", hiện vẫn áp dụng vì câu 12 chưa chốt): phần này chỉ nêu bối cảnh và các cách đã thấy,
không có đề xuất, không xếp hạng. Đề xuất của Claude đến sau khi chủ dự án trả lời. Thứ tự dưới đây là thứ tự hỏi dự kiến.

**Phạm vi**

1. **Năm phần của Bước 4 có làm đủ cả không?** Trắc nghiệm, đúng/sai, gõ từ, bài từ câu người học, "từ hay sai". Có thể làm đủ,
   hoặc tách thành hai đợt (ví dụ gõ từ và trắc nghiệm trước).
2. **Nền tảng.** Bước 3 chỉ làm web (D2). Bước 4 có giữ chỉ web không.

**Phiên luyện**

3. **Lấy từ ở đâu cho một phiên.** Spec cũ có ba nguồn: nhóm, "hôm nay", "từ hay sai". "Hôm nay" chung đã không còn (D20). Còn lại:
   theo một nhóm (khớp cách ôn hiện có), "từ hay sai" (gồm từ của nhiều nhóm), có thể có thêm "mọi nhóm".
4. **Thứ tự chọn từ trong phiên** khi trạng thái là mức 0–5 + cờ ưu tiên. Ví dụ các thành phần có thể xếp: từ yếu, từ đang ưu tiên,
   từ đến hạn, từ mới (mức 0), từ còn lại. Số câu mỗi phiên: spec ghi 5–20, mặc định 10 (`ASSUMPTION`); là hằng số hay admin chỉnh
   trong Settings.

**Bài làm và lịch ôn (D16)**

5. **Quyền `practice.basic` khi chưa có Entitlements.** Mọi gói, kể cả Free, đều có quyền này, nên ở V1 ai cũng dùng được bài
   không AI. Ba cách: (A) Bước 4 không kiểm gì, Bước 5 thêm vào; (B) Bước 4 làm sẵn chỗ kiểm, tạm luôn trả "được phép", Bước 5 thay
   phần bên trong; (C) Bước 4 làm phần tối thiểu của Entitlements (gói Free mặc định). Tiền lệ: D23 để các giới hạn theo gói là
   hằng số tới Bước 5.
6. **Khi nào hiện gợi ý "Cần ôn tập".** Gồm các ý nhỏ:
   - a. Dạng bài nào: chỉ gõ từ (đúng chữ của design Bước 3) hay mọi dạng khi sai, kể cả trắc nghiệm và đúng/sai.
   - b. Làm đúng thì không làm gì, hay có gợi ý khác.
   - c. Gợi ý gắn với nhóm nào khi từ ở nhiều nhóm hoặc phiên là "từ hay sai". Lệnh hiện có của Learning cần nhóm; cột nhóm trong
     nhật ký thì cho phép rỗng.
   - d. Từ đã bị bỏ khỏi việc học trong lúc đang làm bài.
   - e. Đếm số lần gợi ý được bấm. Bước 3 đã hứa số này (rủi ro "bỏ qua gợi ý thì 14–30 ngày sau từ mới quay lại"). Nhật ký học
     hiện chưa phân biệt được bấm từ flashcard hay từ bài làm.
   - f. Bấm gợi ý từ bài làm có tính vào trần ôn mỗi ngày của nhóm không.

**Chấm và đáp án**

7. **Đáp án đúng của bài gõ từ** lấy từ đâu: dạng được chấp nhận của nghĩa (lemma + biến thể chính tả được bật + dạng owner thêm).
   Với từ riêng: lemma + biến thể người học nhập. Chỗ cần chốt: đề bài là "nghĩa của một từ gốc" thì có nhận dạng chia không (spec cũ:
   chỉ nhận những dạng có trong danh sách).
8. **Bài từ câu người học.** Che từ nào trong câu, và nhận ra từ đó bằng gì: lemma, biến thể, dạng được chấp nhận, hay cả bảng dạng
   chia AGID (để `went` trong câu được nhận là `go`). Đánh dấu "dùng được" lúc nào: lúc lưu câu hay lúc tạo câu hỏi; các câu đã lưu
   trong Bước 3 thì sao. Câu có nhiều chỗ khớp thì che chỗ nào.
9. **Báo câu lỗi ở bài không AI.** Spec có nút báo lỗi chủ yếu cho câu AI. Ở trắc nghiệm có thể xảy ra hai đáp án cùng đúng (đồng
   nghĩa); spec ghi "người học báo, owner chặn cặp xấu". Bước 4 có làm việc báo lỗi và công cụ cho staff không. Nếu có thì cần quyền
   mới `questions.moderate` và màn admin.
10. **"Từ hay sai".** Spec: sai từ 2 lần trong 5 lượt gần nhất. Chỗ cần chốt: dạng chọn đáp án (dễ đoán đúng) có tính vào không;
    giữ hay đổi con số 2/5.

**Dữ liệu và vòng đời**

11. Câu đã tạo mà chưa trả lời: giữ bao lâu (spec: xóa sau 30 ngày, `ASSUMPTION`; cần một job dọn). Lịch sử làm bài người học xem
    được tới đâu (PRC23).

**Cách làm việc**

12. **Luật "chủ dự án nghĩ trước" và phần lõi tự viết.** Ở Bước 3 (D14) chủ dự án chọn "Claude làm hết", nhưng vẫn giữ cách chủ dự
    án trả lời trước, kèm bảng ví dụ hành vi để duyệt. Ba cách cho Bước 4: (a) giữ cả hai (có một phần lõi chủ dự án tự viết);
    (b) như Bước 3; (c) bỏ cả hai, Claude đề xuất ngay. Nếu tự viết, các ứng viên từ dễ tới khó: hàm chấm đáp án (chuẩn hóa rồi so
    khớp, không đụng database, test bằng bảng ví dụ); tính "từ hay sai"; chọn đáp án nhiễu (truy vấn, nới level dần); chống nộp trùng
    khi hai máy nộp cùng lúc.
13. **"Xong khi" của Bước 4**: đặt danh sách trước, hay như Bước 3 chủ dự án tự báo (D45).
14. **Ai implement**: như Bước 3 (một phiên khác, không dùng Codex, D41), hay quay lại cách Codex implement và Claude kiểm.

## 7. Rủi ro còn lại

- **Bước 3 đổi tiếp sau khi Bước 4 đã chốt design**, nhất là phần Learning gọi từ ngoài vào và giao diện. Cách xử lý: đọc lại code
  trước khi viết plan Bước 4.
- **Giao diện luyện tập phụ thuộc khung app người học** chưa có plan. Nếu design Bước 4 vẽ màn hình trước khi khung đó chốt, có thể
  phải vẽ lại.
- **Đáp án nhiễu có thể thiếu thật** khi nội dung chưa đủ, dù thiết kế giả định là đủ. Thiết kế đã có đường lui (nới level, bỏ dạng
  bài cho từ đó), nên đây không phải lỗi kỹ thuật.
- **Dạng chọn đáp án không đổi lịch, gợi ý thì người học có thể bỏ qua**: một từ sai có thể rất lâu mới quay lại (đã ghi ở design
  Bước 3 mục 19). Số lần gợi ý được bấm (câu 6e) là cách duy nhất để xem rủi ro này có xảy ra không.

## 8. Nhật ký brainstorm (ghi dần; decision record viết khi chốt hết)

**Câu 1 — phạm vi (chủ dự án, 17/10/2026):**
- **Bài điền từ** do AI tạo, chuyển sang Bước 7 và thành tính năng của gói trả phí. Gói Free vẫn có các bài khác. Đổi K23 (trước đây
  Free có bài điền từ từ câu người học, không AI).
- **Không có ngân hàng câu dùng chung giữa người học** (đổi K17). Thay vào đó, mỗi câu đã tạo được **lưu vào danh sách câu của chính
  người học đó**: xem lại được trong lịch sử, **làm lại được**, không phải tốn thêm lượt AI để tạo câu mới.
- **Dạng bài mới (Bước 7, AI):** đưa ra một câu có chứa từ, người học chọn đáp án. "Chọn gì" chưa hỏi.
- **Đáp án của bài có câu:** một câu có thể có đáp án thay thế, nhưng **đúng ngữ pháp trong câu là ưu tiên**: không nhận đúng từ mà
  sai dạng hoặc sai cấu trúc (ví dụ `deploy` cho chỗ trống cần `deployed`).
- **Đồng ý:** điều kiện chọn đáp án nhiễu (cùng loại từ, level gần, không phải từ chức năng, không trùng chữ, không trùng nghĩa
  tiếng Việt, không lấy từ riêng của người khác); nguồn đáp án và cách chấm của bài gõ từ; "từ hay sai" cần lịch sử làm bài.
- **Chủ dự án yêu cầu Claude đề xuất:** cách xử lý đáp án nhiễu đồng nghĩa (hai đáp án cùng đúng).
- **Còn mở cho Bước 7:** bài điền từ dùng câu người học đã lưu làm nguyên liệu hay AI tự viết câu mới; "đáp án thay thế" có gồm từ
  đồng nghĩa khác chữ không.

→ Phạm vi Bước 4 còn: trắc nghiệm, đúng/sai, gõ từ, "từ hay sai", cộng phần lưu câu và lịch sử làm bài (dùng chung cho Bước 7).

**Câu 1 — vòng 2 (chủ dự án, 18/10/2026):**
- **Không bao giờ có câu có hơn một đáp án đúng.** Nút báo "có hơn một đáp án đúng" không phải cách xử lý; phải chặn từ lúc tạo câu.
- Lúc tạo câu nên **prompt LLM tránh đưa từ đồng nghĩa của đáp án** vào lựa chọn. (Claude ghi: trắc nghiệm, đúng/sai của Bước 4
  không gọi AI; ý này áp vào bài AI ở Bước 7 và vào prompt soạn nội dung ngoài app, D5.)
- **Gợi ý (hint):** khi cần, hiện một **định nghĩa ngắn** của từ; Claude được đề xuất cách gợi ý khác nếu hay hơn.
- Kiểm trong code 18/10: điều kiện publish chỉ cần nghĩa tiếng Việt, ít nhất một câu ví dụ tiếng Anh và level
  (`publishViolations`); `definition_en` không bắt buộc và dài tối đa 2.000 ký tự; từ riêng không có câu ví dụ.

**Câu 1 — vòng 3 (chủ dự án, 18/10/2026):**
- **Đáp án nhiễu:** Claude đề xuất A (mỗi nghĩa có sẵn 3+ đáp án nhiễu được duyệt), A' (duyệt danh sách đồng nghĩa, hệ thống tự chọn),
  B (tự chọn + lọc nghĩa con tiếng Việt). Chủ dự án hỏi: nếu hệ thống tự chọn, thêm **cột synonym cho riêng từ đó** được không
  (nghiêng về A'). Chưa chốt.
- **Gợi ý (chốt):** nấc 1 định nghĩa ngắn tiếng Anh, **tối đa 200 ký tự** (luật đưa vào prompt soạn nội dung); nấc 2 nếu không có định
  nghĩa: câu ví dụ đã che từ; nấc 3 chỉ cho gõ từ: chữ cái đầu và số chữ. Dùng gợi ý vẫn chấm như thường, hệ thống ghi lại đã dùng.
- **Làm lại câu:** chủ dự án nhờ đánh giá spec (một câu một lần, F40/PRC14) với ý của mình (lưu và làm lại). Chủ dự án đang đắn đo:
  làm sai thì nên làm câu khác, nhưng câu cũ là cơ sở để ôn tập. Chưa chốt.

**Câu 1 — vòng 4 (chủ dự án, 18/10/2026):**
- **Đáp án nhiễu: A'** (cột từ đồng nghĩa cho từng nghĩa, hệ thống tự chọn, kiểm hai chiều, giữ lọc nghĩa con tiếng Việt). Chủ dự án:
  "khi triển khai sẽ rà lại kỹ nhất có thể, nên khả năng sẽ làm theo cách này". Rủi ro sót từ đồng nghĩa: chủ dự án đã biết.
- **Trong một phiên (chốt):** mỗi câu chấm một lần; sai thì hiện đáp án, kèm gợi ý "Cần ôn tập", sang câu tiếp (giữ F40).
- **Lịch sử:** mọi câu được lưu; người học phải **lọc được theo một ngày cụ thể**.
- **Làm lại:** chủ dự án sửa: người học **chọn từ** để luyện lại (không phải chọn lại câu cũ). Chủ dự án lo mỗi lần làm lại tốn như một
  lần gọi AI → Claude giải thích phân biệt "câu hỏi" và "lượt làm bài" (vòng 5).
- **Dùng lại câu AI đã lưu:** để tới Bước 7.

**Vòng 5 (chủ dự án, 18/10/2026):**
- Hiểu "bài không AI tạo câu mới": ok. Chủ dự án xin xem phác thuật toán chọn đáp án nhiễu.
- **"Từ hay sai" tính mọi lượt**, kể cả lượt luyện lại một từ ở phiên sau (chốt; các con số 2/5 và dạng chọn đáp án còn ở câu 10).
- **Câu 3 — nguồn phiên luyện:** chủ dự án: **chia ra nhiều loại** (ví dụ ôn tất cả, hôm nay, từ hay sai, ...), làm hết thay vì chỉ
  một loại. Claude đề xuất danh sách cụ thể ở vòng 6.

**Vòng 6 (chủ dự án, 18/10/2026) — chốt:**
- **Thuật toán chọn đáp án nhiễu** như Claude phác: tập nghĩa catalog đã publish; loại khác loại từ, từ chức năng, cùng chữ (không phân
  biệt hoa thường), dạng chia của nhau (D29), đồng nghĩa hai chiều, chung nghĩa con tiếng Việt; level ±1 → ±2 → bất kỳ; dưới 3 ứng
  viên thì không có trắc nghiệm; 3 đáp án không trùng chữ nhau; xáo thứ tự. Đúng/sai: 50/50 (`ASSUMPTION`), cặp sai lấy nghĩa một
  ứng viên. Từ chức năng chỉ có gõ từ.
- **Sáu loại phiên luyện:** Hôm nay (mọi nhóm, không trừ lượt ôn), Ôn tất cả, Theo nhóm (lọc đến hạn/ưu tiên/mới/ngăn mức), Từ hay sai,
  Đang ưu tiên, Chọn từ.
- **"Cần ôn tập" từ bài làm không cần nhóm** (cờ ưu tiên gắn với từ; nhật ký cho phép bỏ trống nhóm) — đã trả lời câu 6c.

**Câu 4 — vòng 1 (chủ dự án, 18/10/2026):**
- **Thứ tự:** người học tự chọn cách sắp xếp, không cố định; "từ hay sai" xét theo mức, "ưu tiên" cũng vậy; đến hạn, từ mới, ... do
  người học chọn theo nhu cầu.
- **Số câu mỗi phiên:** người học chọn; mức tối đa do admin đặt.
- **Phiên có ít từ hơn số câu:** chủ dự án chưa hiểu câu hỏi → Claude giải thích lại (vòng 2).
- Claude ghi (kiểm `schedule.ts` 18/10): bấm "Cần ôn tập" luôn đưa từ về mức 1 và bật ưu tiên, nên mọi từ đang ưu tiên đều ở mức 1;
  "ưu tiên xếp theo mức" không phân biệt được gì.

**Câu 4 — vòng 2 (chủ dự án, 18/10/2026):**
- **Luyện riêng một từ:** tạo đủ N câu (theo số câu đã chọn, trong giới hạn admin đặt), tất cả cho từ đó.
- **Admin chỉ chỉnh số câu tối đa**, không chỉnh tối thiểu.
- **Mỗi từ trong phiên có ít nhất 1 câu; một từ có thể có 2–3 câu** khi luyện theo nhóm. **Không ràng buộc số câu mỗi từ** (nếu có thì
  phải tùy chỉnh được), vì ràng buộc làm người học có cảm giác "xong từ đó rồi" và không đủ gây nhiễu.

**Câu 4 — vòng 3 (chủ dự án, 18/10/2026):**
- Claude đề xuất: người học chọn 1..tối đa câu (mặc định 10), admin đặt tối đa (mặc định 20, khoảng nhập 5–100, `ASSUMPTION`); chọn từ
  theo cách sắp xếp tới N từ, mỗi từ ít nhất 1 câu; thiếu từ thì bốc ngẫu nhiên thêm trong chính các từ đó, không giới hạn mỗi từ; câu
  lặp cách nhau ít nhất 2 câu, ưu tiên dạng bài khác. Claude hiểu: đủ từ thì không lặp (chưa được xác nhận).
- **Bỏ luyện riêng một từ** (chủ dự án: "chỉ nên cho người dùng học theo nhóm từ"), vì từ câu thứ hai người học đã biết đáp án.
  Claude hiểu: bỏ hẳn loại phiên "Chọn từ" → còn 5 loại phiên (chờ xác nhận).
- **Dạng bài trong phiên (chốt):** người học tự chọn một hoặc nhiều dạng.

**Câu 4 — vòng 4 (chủ dự án, 18/10/2026):**
- **Nguồn có ít từ hơn số câu: không ràng buộc**, để người học tự quyết; chỉ cần hỏi kiểu "Bạn đã học từ này, có muốn ôn lại không?".
- Chủ dự án xin ví dụ cho "đủ từ thì không lặp" và "nguồn ít từ" → Claude đưa ví dụ và đề xuất "ôn theo vòng" (vòng 5).

**Câu 4 — vòng 5 và câu 6 (chủ dự án, 18/10/2026):**
- **Ôn theo vòng (chốt):** vòng 1 mỗi từ một câu theo cách sắp xếp; hết vòng 1 mà chưa đủ số câu thì hỏi một lần "Bạn đã làm hết X từ
  … Ôn lại thêm không?" [Ôn lại] / [Kết thúc]; vòng sau xáo thứ tự, đổi dạng bài hoặc đáp án nhiễu; luôn có nút Dừng. Nguồn ít từ:
  "tạm thời theo hướng này".
- **"Đủ từ thì không lặp":** chủ dự án chưa hình dung được → để sang một bên, Claude mô phỏng.
- **6a:** gợi ý "Cần ôn tập" khi **gõ từ sai**; dạng bài trong phiên vẫn do người học chọn, không ràng buộc.
- **6b:** **kết hợp** nút "Đã biết" (người học tự bấm) và trang tổng kết cuối phiên liệt kê từ sai kèm "Đưa tất cả vào ưu tiên".

**Vòng 7 (chủ dự án, 18/10/2026):**
- Claude mô phỏng (widget bấm được) cách chia câu: 30 từ / 10 câu → 10 từ mức thấp nhất mỗi từ một câu; bật "cho lặp" thì một từ bị đẩy
  ra; 2 từ → vòng 1 rồi hỏi "Ôn lại thêm không?".
- **Đủ từ thì không lặp (chốt):** mỗi từ một câu khi nguồn có nhiều từ hơn số câu.
- **Câu 5 — `practice.basic`: B (chốt)** — Bước 4 làm sẵn chỗ kiểm quyền, tạm luôn trả "được phép"; Bước 5 thay phần bên trong. Claude
  bổ sung: kiểm lúc tạo câu, không kiểm lúc chấm (ER4).
- Claude đề xuất, chủ dự án chưa phản hồi: sau mỗi câu, gõ từ sai thì nút "Cần ôn tập" nổi bật, làm đúng thì nút "Đã biết" (chỉ hiện
  khi từ tới hạn hoặc đang ưu tiên, vì D19 "ôn sớm không đổi gì"); trắc nghiệm, đúng/sai sai thì không hiện gợi ý ngay; trang tổng kết
  liệt kê mọi từ sai (mọi dạng) kèm nút từng từ và "Đưa tất cả từ sai vào ưu tiên"; 6d từ bị bỏ khỏi việc học giữa phiên thì ẩn hai
  nút, câu vẫn chấm; 6e mỗi lần bấm từ bài làm ghi vào nhật ký học kèm dấu "từ bài làm".

**Câu 10 (chủ dự án, 18/10/2026):**
- **10a (chốt):** lượt trắc nghiệm và đúng/sai **tính cả đúng lẫn sai** vào "từ hay sai".
- **10b (chốt):** giữ "sai từ 2 lần trong 5 lượt gần nhất".
- **10c:** chủ dự án chưa hiểu câu hỏi → Claude giải thích lại.
- **10c (chốt): (b)** — lượt **đúng nhờ gợi ý không tính** vào "từ hay sai" (bỏ qua, xét tiếp các lượt trước). Chủ dự án thêm: **dùng gợi ý
  thì không đưa từ lên mức cao hơn, giữ nguyên mức**. Claude đề xuất: lượt đúng có gợi ý thì không hiện nút "Đã biết".

**Câu 9 — báo lỗi (chủ dự án, 18/10/2026): (b) chốt** — mỗi câu có nút "Báo lỗi" (lý do + ghi chú), báo cáo được lưu cho staff xem,
lượt bị báo không tính vào "từ hay sai"; cần quyền và màn hình admin.

**Câu 11 — lịch sử (chủ dự án, 18/10/2026):**
- **11a:** giữ **6 tháng** (chủ dự án tự đưa con số, "chưa chắc phù hợp").
- **11b (chốt):** người học **không xóa** được lịch sử.
- Claude đề xuất: xóa tự động sau 6 tháng bằng job dọn hằng ngày; số tháng là cài đặt admin chỉnh được (khoảng 3–24, `ASSUMPTION`);
  "từ hay sai" chỉ dựa trên lượt còn giữ.

**Câu 2 — nền tảng (chủ dự án, 18/10/2026): (c) chốt** — Bước 4 **chỉ làm API** (hệ thống); giao diện (web người học, màn admin báo lỗi)
làm sau, khi hệ thống ổn định. Claude ghi: chưa có giao diện thì chưa có người học thật nên chưa có báo cáo lỗi; API cần trả sẵn các cờ
để giao diện sau chỉ việc theo (ví dụ có hiện "Đã biết" không).

**Câu 12 — cách làm việc (chủ dự án, 18/10/2026):** "Mình không viết code, mình chỉ review" → **không có phần lõi tự viết**. Claude hiểu
như D14 của Bước 3: vẫn giữ cách chủ dự án trả lời trước, Claude đề xuất sau, và duyệt hành vi qua bảng ví dụ (chờ xác nhận).

**Câu 13 — "Xong khi" (chủ dự án, 18/10/2026, chốt):** làm xong toàn bộ task trong plan Bước 4 và test thành công thì Bước 4 xong.
Claude đề xuất cụ thể "test thành công": CI xanh trên PR (lint, typecheck, build, unit, e2e) và một script chạy qua API thật trên DB mới
(kiểu `pnpm smoke:buoc-2`).

**Câu 13 bổ sung và câu 14 (chủ dự án, 18/10/2026):**
- **13:** "theo đề xuất" → "test thành công" = CI xanh trên PR + script chạy qua API thật trên DB mới (`smoke`), task cuối ghi as-built.
- **14 (chốt):** **các phiên khác implement, cùng một phiên điều phối**. Sau câu này (hoặc khi viết plan) phải tổng hợp context để
  phiên điều phối có đủ ngữ cảnh.

→ Hết 14 câu. Bước tiếp: các cách làm kỹ thuật (phiên luyện lưu ở đâu), design từng phần, design doc + decision record; plan có mục
"brief cho phiên điều phối".

**Cách làm kỹ thuật — phiên luyện lưu ở đâu (chủ dự án, 18/10/2026): hướng 1 chốt** — server giữ phiên (bảng phiên luyện; app xin
"câu tiếp theo" và "tổng kết"). Kiểm code 18/10: Settings có nhóm cài đặt kèm khoảng cho phép (`settings.definitions.ts`); có sẵn
`MaintenanceScheduler` cho job dọn hằng ngày (đang dọn `idempotency-keys`).
