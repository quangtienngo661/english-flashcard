# 02. Thiết lập: key, model, cài đặt, chi phí

[README](README.md) · trước: [01](01-khai-niem.md) · tiếp: [03 Golden set](03-golden-set.md)

Làm một lần trước vòng đầu tiên. Mọi trang AI cần quyền `settings.manage` (chỉ vai trò `admin`).

## 1. Key AI

1. Mở `apps/api/.env`. Điền `OPENAI_API_KEY` và `ANTHROPIC_API_KEY`.
2. Để trống `OPENAI_CUSTOM_HEADERS` và `ANTHROPIC_CUSTOM_HEADERS`. Có giá trị thì app không khởi động.
3. Khởi động lại **cả API và worker**. Key được đọc lúc khởi động; worker dùng cùng cấu hình. (Việc phải khởi động lại là suy từ code,
   chưa thử.)
4. Kiểm: trang "Tình trạng" → dòng "Nhà cung cấp có key: …" phải có cả OpenAI và Anthropic.

Worker phải chạy (`pnpm build` rồi `pnpm start:worker` trong `apps/api`) thì "Chạy bộ ví dụ" và lượt chấm judge mới chạy. "Chạy thử"
nháp thì không cần worker.

## 2. Thêm model và nhập giá

"Model" → "Thêm model" → chọn nhà cung cấp (chỉ hiện nhà cung cấp đã có key) → "Model id" đúng như nhà cung cấp ghi. App gọi nhà
cung cấp để đọc thông tin model. Lỗi hay gặp: `model-not-found` (sai id), `provider-unavailable`, `model-not-supported` (model
Anthropic không hỗ trợ structured output), `model-exists` (đã có).

**Giá** nhập theo **US$ cho mỗi 1 triệu token**, tối đa 4 số lẻ:

| Model | "Giá đầu vào" | "Giá đầu vào cache" | "Giá đầu ra" |
|---|---|---|---|
| `gpt-6.1-terra` | 1 | để trống | 5 |
| `gpt-6.1-sol` | 2 | để trống | 10 |
| Model Anthropic cho judge | lấy từ trang giá của Anthropic | để trống | lấy từ trang giá |

- Để trống "Giá đầu vào cache" thì token đọc từ cache tính bằng giá đầu vào: con số ước tính hơi cao hơn thật, an toàn.
- "Giá đầu ra" gồm cả token suy luận (thinking), vì app lấy số token đầu ra nhà cung cấp báo.
- Model phải có **cả** giá đầu vào và đầu ra. Thiếu thì mọi việc admin trên model đó bị chặn (`model-price-missing`).
- Cột "Ước tính mỗi lời gọi" giả định 600 token vào + 500 token ra. Với terra: 600 × 1 + 500 × 5 = 3.100 phần triệu USD ≈
  **0,0031 USD**; với sol ≈ **0,0062 USD**. Đây là giả định của app, chưa phải số đo.
- Sửa giá sau không đổi chi phí đã ghi của các lời gọi cũ.

**Ẩn, xóa.** Tick "Ẩn khỏi ô chọn model" để model không hiện trong ô chọn (model đang được chọn vẫn hiện ở ô của chính nó). Không
xóa được model mà bất kỳ cấu hình hay bản judge nào **từng** dùng (`model-in-use`). Vì vậy đừng thêm model "cho vui": thêm rồi dùng
thì không xóa được nữa, chỉ ẩn.

## 3. Effort và thinking

Chọn trong nháp ở trang "Cấu hình" (ô "Effort", "Thinking") và trong form judge.

| Nhà cung cấp | Effort | Thinking |
|---|---|---|
| OpenAI (writer) | 7 mức cố định: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, hoặc "Mặc định" | Không tắt được |
| Anthropic (judge) | Các mức model báo hỗ trợ, trong `low`, `medium`, `high`, `xhigh`, `max`, hoặc "Mặc định" | "Tắt" chỉ khi model hỗ trợ, và không tắt được khi effort là `xhigh`/`max` |

"Mặc định" thì app không gửi trường effort nào, nên nhà cung cấp dùng mức mặc định của model (`apps/api/src/ai/adapters/openai/openai-request.ts`: chỉ gửi `reasoning.effort` khi đã chọn một mức). Chưa thử model OpenAI thật
có nhận từng mức không.

Lời khuyên của OpenAI: bắt đầu `medium`, dùng `low` cho việc cần nhanh nếu chất lượng giữ được, `high`/`xhigh` "only when evals show
a meaningful gain"; effort là núm tinh chỉnh, không phải cách chính để lấy lại chất lượng
([OpenAI, GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6);
[OpenAI, Reasoning](https://developers.openai.com/api/docs/guides/reasoning)). Hướng dẫn này viết cho GPT-5.6; áp cho `gpt-6.1-*` là
`ASSUMPTION`. Với Claude đời mới, độ suy nghĩ chỉnh bằng effort
([Anthropic, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

## 4. Số token đầu ra và thời gian chờ

- "Số token đầu ra tối đa": các thao tác được seed 1200 (cloze, lookup, meaning, mcq), 300 (check_private_word). Để trống: OpenAI không
  gửi giới hạn; Anthropic gửi mức tối đa của model hoặc 16.000.
- Effort cao sinh nhiều token suy luận. `ASSUMPTION`: nếu giới hạn token đầu ra tính cả token suy luận, effort cao có thể làm câu bị
  cắt, và câu bị cắt thành trượt khuôn. OpenAI ghi câu trả lời bị cắt vì hết token có trạng thái `incomplete`
  ([OpenAI, Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)). Thấy trượt khuôn tăng khi tăng
  effort thì nghi điều này trước.
- "Thời gian chờ mỗi lời gọi" (tab "AI") mặc định 10 giây, tối đa 30, áp cho **mọi** lời gọi, cả người học. Hết giờ = lỗi tạm thời =
  trượt khuôn. Tăng lên thì Lan cũng có thể phải chờ lâu hơn. B1 đo 3,6–4,2 giây trung bình với writer Anthropic; OpenAI chưa đo.

## 5. Cài đặt cần kiểm

"Cài đặt hệ thống" → tab "AI" (trừ hai dòng ghi tab khác). Ô tỉ lệ nhập dạng phân số (0.3), gợi ý hiện phần trăm.

| Nhãn | Mặc định | Đặt | Ghi chú |
|---|---|---|---|
| "Tỉ lệ ví dụ held-out" | 0.3 | giữ 0.3 | Ví dụ mới vào held-out hay dev. Bỏ qua khi file nhập có cột `split`. |
| "Trần USD việc admin mỗi ngày" | 2 | giữ 2 | Tổng chi phí chạy thử + eval + judge từ 00:00 giờ VN. Trống = không trần, 0 = chặn hết. Trần mềm: lời gọi đang chạy có thể vượt một chút. Không bao giờ chặn người học. |
| "Số nhãn tối thiểu để tin judge" | 30 | giữ 30 | Ngưỡng "Đã hiệu chỉnh". |
| "Độ khớp tối thiểu với nhãn" | 0.85 | giữ 0.85 | Như trên. So theo phần trăm nguyên: 84,9% chưa đạt. |
| "Số câu tối đa mỗi lượt chấm câu thật" | 200 | 30–50 lúc đầu | Mỗi lượt chấm "Câu AI thật" lấy tối đa bấy nhiêu câu, mới nhất trước. Nhỏ thì rẻ. |
| "Giữ nội dung lời gọi" | 7 | giữ 7 | Số ngày giữ nội dung mỗi lời gọi; là cửa sổ của "Câu AI thật". 0 = không có câu nào để chấm. Đặt > 7 không giúp: dữ liệu gửi AI của câu thật bị xóa sau 7 ngày cố định. |
| "Trần lời gọi nhà cung cấp mỗi ngày" | 3000 | giữ | Chỉ đếm lời gọi của người học; không chặn việc admin. |
| "Bật AI toàn hệ thống" (tab **"Gói và lượt"**) | bật | tùy | Chỉ chặn người học; eval và judge vẫn chạy. |
| "Thời gian chờ mỗi lời gọi" | 10 | 10, tăng nếu thấy `timeout` | Xem mục 4. |

Bẫy: link "Mở Cài đặt" ở trang "Tình trạng" mở tab "AI", nhưng công tắc "Bật AI toàn hệ thống" nằm ở tab "Gói và lượt". Dashboard ghi
"(Cài đặt › Gói và hạn mức)" nhưng tab thật tên "Gói và lượt".

## 6. Dọn ví dụ cũ

Ví dụ có từ trước nhóm B đều là dev và **không có ô mong đợi**. Hệ quả:
- "Chốt phiên bản" của cloze, meaning, lookup, check_private_word bị chặn: "{count} ví dụ chưa có ô mong đợi." Hàng thiếu có nhãn
  "Chưa có ô mong đợi".
- Bộ chưa có held-out, nên các ví dụ thêm sau theo luật tỉ lệ sẽ **liên tiếp** vào held-out cho tới khi đủ 30%.

Hai cách:

| Cách | Làm | Được | Mất |
|---|---|---|---|
| A. Sửa từng ví dụ | "Sửa" → điền ô mong đợi | Giữ ví dụ cũ | Tốn công; vẫn phải tự lo phần held-out |
| B. Xóa rồi nhập lại (đề xuất) | Ghi lại các từ cũ, "Xóa" từng hàng, đưa từ đáng giữ vào file nhập mới có `expected` và `split` | Bộ sạch, bạn tự chọn dev/held-out | Mất ví dụ cũ trong bộ đang soạn (lần chạy cũ vẫn giữ kết quả) |

Đề xuất B vì file B1 (`generate_cloze.jsonl`) đã có sẵn các từ để nhập lại có kiểm soát ([03](03-golden-set.md)).

## 7. Kiểm soát chi phí

**Công thức** mỗi lời gọi: (token vào không cache × giá vào + token cache × giá cache + token ra × giá ra) / 1.000.000 USD. Thiếu giá
hoặc thiếu số token → "chưa có giá" và cộng 0 vào trần.

**Ngân sách đề xuất** (bạn đổi được; mọi con số là `ASSUMPTION` cho tới khi đo):

| Mục | Đề xuất |
|---|---|
| Một vòng (chạy thử + 2–3 lần chạy 30 ví dụ + 1–2 lượt judge) | ≈ 0,2–0,5 USD |
| Một thao tác (2–3 vòng) | ≈ 1–2 USD |
| Cả đợt 5 thao tác | ngân sách ≈ 15 USD |
| Trần hằng ngày | 2 USD |
| Công của bạn | ≈ 1,5–2 giờ mỗi thao tác |

Cơ sở: 30 ví dụ × 0,0031 USD ≈ 0,09 USD một lần chạy terra theo ước tính 600/500 token của app; judge Anthropic chưa đo. Số thật duy
nhất là B1: writer Haiku ≈ 0,0004 USD/câu, Sonnet ≈ 0,005 USD/câu
([B1](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)).

**Xem đã tiêu bao nhiêu:** "Tình trạng" (dòng "Việc của admin hôm nay (chạy thử, bộ ví dụ, judge): {spent} / {cap}"), Dashboard
("USD việc của admin hôm nay / trần"), "Chi phí" (nhóm theo "Mục đích"), và dòng "Chi phí" trong panel lần chạy. Sau lần chạy đầu,
lấy chi phí thật chia 30 để thay ước tính.

**Mẹo tiết kiệm có trong app:**
- "Chạy thử" (tối đa 5 đầu vào, chạy ngay) trước khi chạy cả bộ: bắt lỗi thô với giá 1/6.
- Chạm trần giữa chừng: lần chạy thành lỗi `admin-usd-cap`, phần đã chạy vẫn tính tiền. Đừng chạy sát trần.

**Không có trong app:** chạy qua Batch API (giảm 50% ở cả hai nhà cung cấp:
[OpenAI Batch](https://developers.openai.com/api/docs/guides/batch),
[Anthropic Batch](https://platform.claude.com/docs/en/build-with-claude/batch-processing)) và chỉ gọi judge cho câu đã qua luật
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). App-facts không ghi tùy chọn nào như vậy: lượt chấm judge chấm mọi ví dụ
`succeeded` của lần chạy.
