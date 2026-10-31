# 01. Khái niệm: vòng lặp eval và các lớp chấm

[README](README.md) · tiếp theo: [02 Thiết lập](02-thiet-lap.md)

## 1. Vòng lặp

Mỗi thao tác AI (ví dụ `generate_cloze`, viết câu điền từ cho Lan) đi qua cùng một vòng:

```
  +--------------------+     +----------------------+     +---------------------+
  | 1. Error analysis  | --> | 2. Golden set        | --> | 3. Chạy eval        |
  | đọc đầu ra thật,   |     | 30 ví dụ, chốt       |     | nháp + bản đang chạy|
  | ghi lỗi đầu tiên   |     | "Phiên bản N"        |     | trên cùng phiên bản |
  +--------------------+     +----------------------+     +---------------------+
            ^                                                        |
            |                                                        v
  +--------------------+     +----------------------+     +---------------------+
  | 6. Quyết định      | <-- | 5. Chạy lại, so sánh | <-- | 4. Đọc kết quả      |
  | publish / sửa tiếp |     | "So với lần chạy"    |     | số + từng câu dev   |
  +--------------------+     +----------------------+     +---------------------+
            |                          ^
            v                          | đổi MỘT thứ: prompt, model hoặc effort
  sau publish: chấm "Câu AI thật", đưa lỗi mới vào bộ ví dụ, quay lại bước 1
```

Vì sao bắt đầu bằng đọc chứ không bằng con số: tiêu chí chấm không thể viết xong trước khi nhìn đầu ra. Nghiên cứu gọi đây là
*criteria drift*: phải chấm đầu ra mới định nghĩa được tiêu chí ([Shankar et al., 2024](https://arxiv.org/abs/2404.12272)). Người làm
thực tế khuyên đọc từng đầu ra, ghi **lỗi đầu tiên**, rồi gom thành danh mục lỗi và đếm
([Husain & Shankar, evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Ví dụ của chính dự án: đọc 28 câu cloze ở B1 cho thấy lỗi
"có từ khác điền vừa" chiếm phần lớn, còn "sai nghĩa" thì 0 câu
([B1](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)). Không đọc thì đã không biết nên viết judge cho tiêu chí nào.

## 2. Các lớp chấm, từ rẻ tới đắt

Mỗi ví dụ trong một lần chạy được chấm qua nhiều lớp. Lớp trên rẻ và chắc; lớp dưới hiểu nghĩa nhưng đắt và có thể sai.
Anthropic khuyên dùng chấm bằng code khi có thể, judge khi cần, người chấm một cách dè sẻn và làm chuẩn để kiểm judge
([Anthropic docs](https://platform.claude.com/docs/en/docs/test-and-evaluate/develop-tests);
[Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

| Lớp | App kiểm gì | Ví dụ với `rhythm` của Lan |
|---|---|---|
| **Khuôn (shape)** | Đầu ra đúng JSON và qua kiểm của cổng AI. Với cloze: một dòng, đúng một `___`, 1–5 đáp án, câu ≤ 300 ký tự, đáp án không chứa `_`. Lỗi mạng, timeout, 429, 5xx cũng tính là trượt khuôn. | AI trả câu có hai chỗ trống → trượt khuôn. |
| **Luật (code rules)** | Chỉ cho cloze, meaning, mcq. Đáp án phải là dạng hợp lệ của từ trong kho; câu không để lộ từ. Từ không có trong kho → "Bỏ qua: không có trong kho". | AI nhận `beat` làm đáp án → `unknown-form:beat`, trượt luật. Câu chứa "rhythm" ngoài chỗ trống → `reveals-word`. |
| **Mong đợi (expected)** | So với ô mong đợi bạn viết. Cloze: mọi đáp án phải nằm trong `forms`. Lookup: lemma và từ loại trùng. check_private_word: verdict trùng. mcq không có. | `forms` = `rhythm`, `rhythms`; AI trả `rhythm` → đạt. |
| **Judge** | Model Anthropic trả lời từng tiêu chí: Đạt / Không đạt nặng / Không đạt nhẹ, kèm lý do. Không chặn gì, chỉ cho số. | Câu "kept a steady ___" → judge thấy `beat` điền vừa → "Không đạt nặng". |
| **Nhãn người** | Bạn tự chấm cùng tiêu chí bằng phím 1/2/3. App so nhãn với judge ra "Độ khớp". | Bạn bấm 2 (Không đạt nặng) cho câu trên; judge cũng nói vậy → một cặp khớp. |
| **Held-out** | Khoảng 30% ví dụ bị ẩn. Chỉ thấy con số tổng. Không chạy thử, không gắn nhãn được. | 9 trong 30 ví dụ; bạn không biết từ nào nên không sửa prompt "theo đề" được. |

Ba lớp đầu chỉ bắt lỗi hình thức. Lỗi của Lan (`beat` cũng đúng) **qua cả ba**: câu đúng khuôn, `rhythm` là dạng hợp lệ, `rhythm`
nằm trong `forms`. Chỉ judge và mắt bạn bắt được. Đó là lý do có judge.

Một ví dụ "Đạt" trong panel lần chạy nghĩa là: đúng khuôn **và** luật không trượt **và** mong đợi không trượt. Judge không nằm trong
định nghĩa này.

## 3. App chặn gì, cảnh báo gì, để bạn quyết gì

| Loại | Cụ thể | Bạn làm gì |
|---|---|---|
| **Chặn** (không bấm "Publish" được) | Chưa có phiên bản chốt; nháp ở đúng lần sửa hiện tại chưa có lần chạy xong trọn trên phiên bản mới nhất (`eval-required`); bản đang chạy có model mà chưa có lần chạy xong trọn trên phiên bản mới nhất (`baseline-required`); có gì đó đổi từ lúc bạn xem (`publish-stale`). | Chạy cho đủ rồi xem lại. |
| **Cảnh báo** (phải tick "Tôi đã đọc cảnh báo và vẫn publish") | Tỉ lệ khuôn/luật/mong đợi tụt **hơn 5 điểm %** so với baseline; tỉ lệ đạt của judge tụt hơn 5 điểm; ví dụ dev từng đạt nay trượt; số ví dụ held-out không đạt tăng. | Đi đọc đúng các ví dụ đổi kết quả ([07](07-quyet-dinh-publish.md)). |
| **Để bạn quyết** | Mọi ngưỡng tuyệt đối ("khuôn ≥ 97%", "judge đạt ≥ 85%"), chất lượng tiếng Việt, độ tự nhiên, chi phí chấp nhận được, khi nào publish. | Dùng ngưỡng đề xuất ở [07](07-quyet-dinh-publish.md), chỉnh sau vòng 1. |

Lưu ý:
- Lần publish **đầu tiên** của một thao tác (bản đang chạy chưa có model) không có baseline, nên không có cảnh báo nào. Mọi thứ dựa
  vào ngưỡng của bạn.
- Cảnh báo judge **không** cần judge đã hiệu chỉnh. Một judge chưa được kiểm vẫn có thể bật cảnh báo, hoặc im lặng sai.
- 5 điểm trên 30 ví dụ là 1,5 ví dụ. Cảnh báo bật khi chỉ 2 ví dụ đổi kết quả: coi đó là "đi đọc 2 ví dụ này", không phải bằng chứng
  đã tụt (tính toán, [file nghiên cứu §5](../../research/2026-10-31-ai-eval-best-practices.md)).

Không đặt ngưỡng tuyệt đối trong app là quyết định của bạn. Không nguồn nào bắt buộc một cách; ngưỡng tuyệt đối trên 30 ví dụ có sai
số khoảng ±14 điểm, nên đọc số kèm đọc câu hợp với bộ nhỏ (`ASSUMPTION` trong file nghiên cứu §7).

## 4. Hai kiểu eval

- **Capability eval:** đo tiến bộ, bắt đầu ở tỉ lệ đạt thấp. Ví dụ tiêu chí "chỉ một đáp án" của cloze lúc đầu (B1: 10–12/14 câu có
  từ khác điền vừa).
- **Regression eval:** gần 100%, để chặn lùi. Ví dụ khuôn và luật.

Khi một capability eval đã cao, nó "tốt nghiệp" thành regression eval
([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Một eval luôn 100% chỉ bắt lùi, không
cho tín hiệu cải thiện (cùng nguồn). Tỉ lệ 70% vẫn có thể là một bài test hữu ích
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

## 5. Không lớp nào bắt hết

Anthropic gọi đây là mô hình "Swiss cheese": eval trước khi phát hành, theo dõi sau khi phát hành, đọc phản hồi người dùng và đọc đầu
ra định kỳ, mỗi lớp bắt một phần ([Anthropic, 01/2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
Trong app, các lớp sau khi publish là: chấm "Câu AI thật", báo lỗi của người học, và "Đưa vào bộ ví dụ" để lỗi mới thành ví dụ dev
([07](07-quyet-dinh-publish.md)).

## 6. Bạn là người quyết

Không cần hội đồng. Nguồn gọi vai này là "benevolent dictator": một người hiểu sản phẩm đặt chuẩn
([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Việc của bạn: đọc câu, gắn nhãn, đặt ngưỡng, ghi lý do vào nhật ký quyết định.
