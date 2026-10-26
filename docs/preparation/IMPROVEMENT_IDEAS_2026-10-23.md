# Đề xuất cải thiện sau khi xong giao diện người học (23/10/2026)

**Trạng thái:** đề xuất, **chưa quyết định**. Chủ dự án (23/10/2026): xem lại sau khi xong giao diện người học cho Bước 3–7 (hết M5b
của plan `docs/superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`). Khi chọn một mục, mục đó đi qua quy trình thường: brainstorm → design →
decision record → plan.

Nguồn: đánh giá của Claude ngày 23/10/2026 trên `dev` @ `39f25c6` (M1–M5a đã merge), từ góc nhìn người học và giáo viên; bổ sung cùng ngày
§1.3–§1.4 (đánh giá tổng thể, giả sử app hoàn thiện) và §5 (cách làm dự án). Đối chiếu với design các
bước, [`APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md`](APP_REFERENCES_FUTURE_IDEAS_2026-10-19.md) (ý tưởng I1–I13),
[`COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md`](COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md) và
[`SURVEY_ANALYSIS_2026-09-30.md`](SURVEY_ANALYSIS_2026-09-30.md). **Chưa có dữ liệu người dùng thật**: mọi nhận định dưới đây là giả thuyết, cần đo.

## 1. Nhận định tiềm năng

Điểm tổng (ý kiến, không phải số đo): **khoảng 6,5/10 về sản phẩm, thực thi tốt**. Nền chắc: lịch ôn rõ, chấm theo luật nên rẻ, hai ngôn ngữ, edge
case viết kỹ, có báo lỗi và trả lượt. Chưa chứng minh được việc người học quay lại hằng ngày. Đối thủ trực tiếp: Quizlet, Anki, Luyện Từ và AI chat phổ
thông (ChatGPT Study Mode, Gemini).

### 1.1 Góc nhìn người học

| Mạnh | Yếu |
|---|---|
| Gặp từ ở đâu cũng thêm được (nhận ra "went → go"), lưu câu ngữ cảnh | Không có âm thanh, không nghe được cách đọc |
| Kho từ CEFR-J có nghĩa tiếng Việt và chủ đề, mở app là có từ để học | Kết quả luyện không chạm lịch ôn trừ khi tự bấm (D16 Bước 3); "Đã biết" do người học tự chấm nên dễ ảo tưởng là đã thuộc |
| Luyện **dùng** từ trong câu (điền từ, chọn nghĩa trong câu, trắc nghiệm theo câu), không chỉ kiểm tra định nghĩa: đúng điểm khác biệt đã chọn | Điểm khác biệt nằm sau gói Dùng thử / Pro: gói Miễn phí không thấy câu AI |
| Người học chủ động: tự bấm Cần ôn lại / Đã biết, gợi ý nhiều nấc, Từ hay sai, báo lỗi được trả lượt | Đã bỏ đường vào "Điền từ từ câu bạn đã lưu" trên giao diện (D10 giao diện người học), dù kiểu câu này không tốn AI và rất cá nhân |
| Minh bạch về lượt, gói, giao dịch | Chưa có cảm giác tiến bộ (chuỗi ngày, mục tiêu tuần, số từ đã thuộc); khảo sát ghi người học "khó duy trì" |
| | Chưa có app điện thoại; thói quen học từ chủ yếu trên điện thoại |

### 1.2 Góc nhìn giáo viên

- Dùng được: kho từ theo trình độ, chủ đề và loại từ để giao cho học sinh; câu AI có kênh báo lỗi.
- Chưa dùng được để dạy: không có lớp, mã lớp, bộ từ chia sẻ, giao bài, hay theo dõi học sinh yếu từ nào. Admin hiện là công cụ soạn nội dung.
- Giáo viên và trung tâm là kênh có người dùng rẻ ở Việt Nam (B2B2C); hiện chưa khai thác.

### 1.3 Đánh giá tổng thể (không theo góc nhìn cụ thể)

- **Kỹ thuật mạnh:** quy ước API, edge case, kiểm thử, ranh giới module đều ở mức của sản phẩm thật.
- **Điểm khác biệt mỏng và chưa kiểm chứng:** luyện dùng từ trong câu bằng AI là lý do tồn tại, nhưng chưa có một lần gọi AI thật và
  nằm sau gói trả phí.
- **Thứ tự đầu tư lệch:** billing, trial, email gia hạn, lịch sử giao dịch, cấu hình AI cho admin đã xong trước khi có người dùng nào.

### 1.4 Giả sử app hoàn thiện hết (đủ Bước 8, web + điện thoại, đã deploy)

- **Sản phẩm: khoảng 7/10.** Đủ vòng thêm từ → ôn → luyện dùng từ, minh bạch về lượt và gói; thiếu âm thanh, động lực, lớp học (§2).
- **Thương mại: khoảng 4–5/10 nếu chưa có kênh tiếp cận người dùng.** Người học từ vựng tiếng Anh ở Việt Nam đã có Quizlet, Anki, app nội
  địa và AI chat miễn phí; sản phẩm tốt hơn một chút không tự có người dùng.
- **Yếu tố quyết định là phân phối**, không phải thêm tính năng: giáo viên và trung tâm (C9), nội dung theo kỳ thi (C7), cộng đồng tự học.
  Nên chọn và thử một kênh trước khi launch.

## 2. Danh sách cải thiện (xếp theo hiệu quả trên chi phí)

| # | Đề xuất | Vì sao | Chi phí, chạm quyết định nào |
|---|---|---|---|
| C1 | **Phát âm bằng giọng đọc của trình duyệt** (`speechSynthesis`) ở trang từ, thẻ ôn, kết quả luyện | Lấp khoảng trống lớn nhất của người học | Gần như 0 đồng, không cần API; một nút loa. Giọng phụ thuộc máy (cần kiểm trên Windows, Android, iOS) |
| C2 | **Kết quả luyện gợi ý cập nhật lịch ôn**: trả lời sai trong Luyện tập thì hỏi "Đưa vào ưu tiên?" (mặc định có), hoặc thêm cài đặt bật tự động | Nối hai vòng ôn và luyện; bớt chuyện tự chấm sai | Nới D16 Bước 3 ("hệ thống không bao giờ tự đổi mức") thành tùy chọn bật; `learning_log` đã đủ dữ liệu |
| C3 | **Đưa lại "Điền từ từ câu bạn đã lưu"** thành một nguồn trong Tùy chỉnh phiên, mở cho gói Miễn phí | Không tốn AI, cá nhân hóa, cho người học lý do lưu câu | Chỉ giao diện: API Bước 7 đã có (`cloze_source: own`); đổi D10 giao diện người học và luật gói của kiểu câu này |
| C4 | **Cho gói Miễn phí nếm câu AI** (ví dụ 3 câu AI mỗi ngày, ý tưởng I4) | Người dùng phải thấy điểm khác biệt trước khi trả tiền | Đổi F31 (Free không có AI); kho lượt AI theo ngày (sổ lượt Bước 5 đã có kiểu kho theo ngày); giữ trần chi phí toàn hệ thống `ai_daily_cap` |
| C5 | **Bài "Đặt câu với từ này"**, AI chấm và nhận xét ngắn | Tự viết ra câu (generation effect) nhớ lâu hơn nhận diện; AI chat phổ thông không tự gói được việc này vào lịch ôn | Đổi quyết định 02/10/2026 (tạm bỏ góp ý câu); tốn AI nên dành cho Pro; một thao tác AI mới, luật chấm và báo lỗi |
| C6 | **Động lực nhẹ**: chuỗi ngày, mục tiêu tuần, "đã thuộc N từ", email tóm tắt tuần | Giữ người dùng quay lại mà không cần xu, cửa hàng (I1, I2 là bản nặng hơn) | Nhỏ; số liệu đã có trong `learning_log`; email dùng hạ tầng nhắc học Bước 3 |
| C7 | **Bắt đầu theo mục tiêu**: bài kiểm tra trình độ 2 phút, gợi ý bộ từ theo mục tiêu (IELTS, TOEIC, đi làm, chuyên ngành) | Tránh màn trống, có giá trị ngay ngày đầu | Dùng kho từ hiện có; cần soạn vài "lộ trình" (bộ lọc trình độ + chủ đề có sẵn) |
| C8 | **PWA cài được + nút chia sẻ để thêm từ** trên điện thoại, trước khi làm Flutter | Thêm từ ngay lúc đang đọc trên điện thoại | Manifest + service worker + Web Share Target; không đổi API; kiểm với CSP và OpenNext (D20, D21) |
| C9 | **Lớp học tối giản cho giáo viên**: mã lớp, bộ từ chia sẻ, bảng "từ cả lớp hay sai" (ý tưởng I8) | Mở kênh B2B2C | Lớn: module hoặc phần Learning mới, quyền mới, quyền riêng tư của học sinh. Nên để sau V1 |
| C10 | **Đo trước khi mở rộng**: một lần gọi AI thật bằng khóa của chủ dự án, tỷ lệ câu AI bị luật loại, giữ chân D7/D30 | Hiện chất lượng câu AI và độ giữ chân đều chưa biết | Design Bước 6 §19, Bước 7 §20 đã nêu; telemetry (thứ tự ưu tiên trong `PROJECT_CONTEXT.md`) |
| C11 | **Nâng cấp AI eval và dashboard theo dõi AI** (thêm 24/10/2026): ví dụ có đáp án mong đợi, chấm tự động ba tầng (luật Practice, model khác chấm, người duyệt), so sánh hai lần chạy, màn admin; dashboard theo 5 câu hỏi (AI có chạy, câu có tốt, người học có bị ảnh hưởng, tốn bao nhiêu, hạn mức có hợp lý). Chi tiết: [`AI_EVAL_DASHBOARD_2026-10-24.md`](AI_EVAL_DASHBOARD_2026-10-24.md) | Eval hiện chỉ kiểm khuôn, thời gian, chi phí (D18 Bước 6); đổi prompt hay model không biết tốt lên hay xấu đi | Phần đo của C10 dựa vào đây; chặn đổi model khi điểm giảm là đổi D18 Bước 6; lần luật loại đầu tiên hiện chỉ có trong log |
| C12 | **Vòng đời prompt trên admin và vị trí của LLM-as-judge** (thêm 24/10/2026): prompt sửa trên admin có bản nháp → eval (dev, held-out) → publish canary → mở 100% → rollback một cú bấm; judge là module backend qua cổng AI, không nằm trên đường trả câu cho người học, dùng cho eval offline, online eval (lấy mẫu câu AI đã phục vụ) và có thể trong `prepare`; bộ nhãn người để hiệu chỉnh judge. Chi tiết: [`AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md`](AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md) | Hiện lưu prompt là có hiệu lực ngay, không cổng eval, không bật dần; quay lại phải lưu lại chữ cũ bằng tay (D15, D18 Bước 6) | Đổi D15, có thể D18 Bước 6; dựa trên C11 (tiêu chí, grader); judge ăn vào trần lời gọi mỗi ngày |
| C13 | **Đăng ký xong vào thẳng chọn ngôn ngữ; nhắc xác nhận email trên giao diện** (chủ dự án, 26/10/2026) | Bớt một bước chặn ngay lúc đăng ký | Hiện: đăng ký → `/app/verify-email` (nhập mã) → `/app/welcome` (`RegisterForm.tsx`, `VerifyEmailForm.tsx`). API không chặn tài khoản chưa xác nhận (đăng nhập, học đều được; `/v1/me` có `email_verified`); web chỉ hiện "chưa xác nhận" ở Cài đặt. Chưa xác nhận thì không nhận email nhắc học. Chỉ giao diện; đổi luồng K/03 của design giao diện người học |
| C14 | **Ô tìm từ và thêm từ ngay trong trang nhóm** (chủ dự án, 26/10/2026) | Thêm từ vào đúng nhóm đang xem, không phải mở tấm Thêm từ rồi chọn nhóm | Hiện: trang nhóm chỉ lọc theo ngăn / ưu tiên / đến hạn / mới (`GroupPage.tsx`), không có ô tìm theo chữ; thêm từ qua tấm Thêm từ (phím N) có chọn nhóm. Có thể dùng lại tấm Thêm từ và `/v1/lookup`, `/items/bulk` có sẵn |
| C15 | **Sửa chữ ở Tùy chỉnh phiên**: bỏ chữ "trước" ở cuối mỗi lựa chọn thứ tự; viết lại "Bấm Cần ôn lại lâu nhất trước" (chủ dự án chưa hiểu) (chủ dự án, 26/10/2026) | Chữ dễ hiểu hơn | Chỉ bản chữ (`messages/vi.json`, `en.json` `sorts.*`). Nghĩa hiện tại của `priority_oldest`: trong các từ đang ưu tiên, từ bạn bấm Cần ôn lại **cách đây lâu nhất** ra trước (`apps/api/src/practice/sessions/order.ts`, sắp theo `last_needs_review_at`). Câu "Từ bạn đã bấm Cần ôn lại, bấm lâu nhất trước." ở thẻ "Đang ưu tiên" cùng nghĩa, cũng cần xem lại |
| C16 | **Bỏ nút "Câu tiếp" sau khi trả lời trong Luyện tập**: mặc định là Đã biết và sang câu kế; cần ôn thì bấm Cần ôn lại (chủ dự án, 26/10/2026) | Bớt một nút, ít thao tác hơn | Hiện có ba nút: Cần ôn lại (1), Đã biết (2, chỉ hiện khi được phép), Câu tiếp (Enter, không đổi lịch ôn) (`AnswerFeedback.tsx`). Đã biết chỉ được khi trả lời đúng, không dùng gợi ý **và** từ đang đến hạn (`known-not-allowed`, `practice-review.service.ts`). Mặc định Đã biết là hệ thống tự đổi mức của từ → đổi D16 Bước 3 ("chỉ người học bấm"); liên quan C2 |
| C17 | **`baseURL` của AI adapter lấy từ biến môi trường** thay vì viết cứng (chủ dự án, 26/10/2026) | Chưa ghi lý do (vd. đi qua proxy / gateway, một dịch vụ tương thích OpenAI, máy giả để thử) | Hiện viết cứng **có chủ ý**: `https://api.openai.com/v1` (`openai.adapter.ts`), `https://api.anthropic.com` (`anthropic.adapter.ts`); SDK bị chặn đọc `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` (plan review #6 Bước 6; test `ignores the environment` trong hai file spec). Lý do: shell của Claude Code trên máy này **có đặt** `ANTHROPIC_BASE_URL` (kiểm 26/10/2026), nên nếu đọc biến đó thì API chạy từ shell ấy gửi key Anthropic thật tới địa chỉ khác. Cùng nhóm với D29 Bước 6 (`*_CUSTOM_HEADERS` đặt thì từ chối khởi động). Đổi là đổi plan review #6 |

## 3. Đề xuất thứ tự

0. **Trước Bước 8 (đề xuất, §5):** C10 phần gọi AI thật, và cho 5–10 người học thật dùng bản hiện tại.
1. **Làm ngay sau M5b (rẻ, không tốn AI, tăng giá trị hằng ngày):** C1, C3, C2.
2. **Cần chủ dự án chốt về sản phẩm và chi phí trước:** C4, C5.
3. **Trước khi tìm người dùng thật:** C10, C6, C7; với C11, tối thiểu là chạy eval thật (E1) và phần dashboard về sức khoẻ và chi phí AI.
4. **Khi có app điện thoại hoặc trước Flutter:** C8.
5. **Sau V1:** C9.

**Đợt cải thiện 26/10/2026** (câu hỏi và trả lời: [`2026-10-26-dot-cai-thien-questions.md`](../superpowers/reviews/2026-10-26-dot-cai-thien-questions.md); chưa có
design): vào đợt C13, C14, C15, C16 + C2, C1, C3 (nhóm A) và C10 / C11 / C12 phần nền (nhóm B). Để sau: **C15 dòng "Bấm Cần ôn lại lâu nhất trước"**
(`priority_oldest`, câu 10: chữ mới cho lựa chọn này và cho thẻ "Đang ưu tiên", chủ dự án "xử lý sau"), **C4**, **C5** ("archived, brainstorm sau").
**C17 archived** (địa chỉ viết cứng trùng địa chỉ mặc định của SDK; nhà cung cấp ít khả năng đổi). C6–C9 không vào đợt.
Design nhóm A: [`2026-10-26-dot-cai-thien-a-design.md`](../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md). **Hướng nâng cấp của C1** (A14, 26/10/2026): file âm
thanh UK / US làm sẵn trên máy chủ cho mỗi từ của kho, để mọi nền tảng (web, Flutter) nghe cùng một giọng; xét lại khi làm Flutter hoặc khi người học phàn nàn về giọng
(tốn tiền tạo và lưu khoảng 8.812 từ × 2, giấy phép nguồn, mở CSP âm thanh; câu đã lưu của người học không làm sẵn được).

## 4. Câu hỏi mở cho lúc xem lại

- C2: gợi ý từng lần (hỏi) hay cài đặt bật/tắt một lần? Mặc định nào?
- C3: kiểu câu từ câu đã lưu có thuộc gói Miễn phí không (hiện thuộc Dùng thử / Pro theo Bước 7)?
- C4: bao nhiêu lượt mỗi ngày, kho riêng hay chung với Dùng thử, ảnh hưởng chi phí dự kiến?
- C5: chấm theo tiêu chí nào (đúng nghĩa của từ, ngữ pháp, tự nhiên), và câu bị chấm sai thì người học khiếu nại thế nào?
- C9: giáo viên có cần gói riêng không, học sinh dưới 13 tuổi thì sao (luật tuổi từ đợt sửa Bước 0–3)?
- C13: trang chọn ngôn ngữ có cần email đã xác nhận không; lời nhắc xác nhận hiện ở đâu (dải trên mọi trang, chỉ ở Hôm nay), bỏ được không; có giới hạn
  gì cho tài khoản chưa xác nhận lâu ngày không?
- C14: ô trong trang nhóm tìm trong kho từ (để thêm) hay tìm trong các từ đã có của nhóm, hay cả hai?
- C15: chữ mới cho từng lựa chọn thứ tự và cho thẻ "Đang ưu tiên".
- C16: khi không được bấm Đã biết (trả lời sai, dùng gợi ý, từ chưa đến hạn) thì nút còn lại làm gì: sang câu không đổi lịch, hay tự tính Cần ôn lại?
  Phím Enter làm gì? Có giữ cách cũ thành một tùy chọn không?
- C17: cần đổi địa chỉ để làm gì; tên biến (tên riêng của app hay tên mặc định của SDK); địa chỉ nào được chấp nhận (chỉ `https`, danh sách cho phép);
  đổi theo môi trường (`.env`) hay theo từng model trong admin?
- Phân phối (§1.4): thử kênh nào trước (giáo viên, nhóm luyện thi, cộng đồng tự học), và bao giờ?

## 5. Cách làm dự án (đánh giá 23/10/2026)

Claude đánh giá cách chủ dự án triển khai từ 05/10 đến 23/10/2026, dựa trên tài liệu, quyết định và PR. Claude không thấy những gì chưa được viết
ra, và phần lớn tài liệu do AI viết theo chỉ đạo của chủ dự án.

**Mạnh**
- Quy trình (design → decision record → plan → TDD → reviewer → CI) được giữ đều qua 7 bước và đợt sửa, dù làm một mình.
- Đổi ý khi lý do cũ hết đúng: Drizzle → Prisma, bỏ e2e API (D38 Bước 4), bỏ nhánh `documents`, dời deploy về trước launch.
- Dùng AI có kiểm chéo (một model viết, một model khác review, Claude chạy lại); kỷ luật git và secret chặt.
- Tư duy hệ thống tốt: idempotency, Problem Details, ngày theo múi giờ người dùng, advisory lock, ranh giới module, log không chứa dữ liệu nhạy cảm;
  quy ước bắt mỗi design viết When → Then riêng (`SPEC_WRITING_CONVENTIONS.md`).
- Handoff và ledger giữ được mạch giữa các phiên.

**Rủi ro**
- Tối ưu "xây đúng cách" trước "xây đúng thứ": chưa người dùng thật, chưa gọi AI thật (§1.3).
- Cơ chế giữ hiểu biết bị nới dần: phần code do chủ dự án tự viết chưa áp dụng lần nào (D14 Bước 3, D27 Bước 4), từ 23/10/2026 bỏ cả bước duyệt
  hình. Chủ dự án hiểu hành vi (qua bảng ví dụ) nhiều hơn hiểu code; chỗ hở khi có sự cố lúc chạy thật.
- Quy trình nặng như nhau cho mọi việc; CLAUDE.md và docs phình nhanh; spec V1 viết kỹ rồi hạ thành khung.
- Phạm vi chỉ tăng, chưa có mốc "đủ để cho người khác dùng thử".

**Đề xuất (chưa quyết định)**

| # | Đề xuất |
|---|---|
| P1 | Trước Bước 8: một lần gọi AI thật bằng khóa của chủ dự án và 5–10 người học thật; cân nhắc deploy bản tối giản sớm hơn mốc "app hoàn chỉnh" |
| P2 | Giữ một cơ chế hiểu biết nhẹ: mỗi milestone chủ dự án tự đọc và giải thích lại một luồng (vd. `Idempotency-Key`, trừ lượt AI) hoặc tự sửa một lỗi nhỏ không nhờ AI, khoảng 30 phút |
| P3 | Quy trình theo mức rủi ro: tiền, dữ liệu, bảo mật giữ đủ; giao diện và nội dung nhẹ hơn (ledger ngắn, bớt ảnh chụp) |
| P4 | Chốt bản cắt cho launch: danh sách phải có / để sau V1, dùng để từ chối việc mới |
| P5 | Dọn tài liệu định kỳ: CLAUDE.md chỉ giữ trạng thái hiện tại và con trỏ, chi tiết sang `docs/deliveries/` |
