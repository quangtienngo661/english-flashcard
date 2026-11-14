# B1 — `generate_cloze`: Sonnet và Haiku, prompt bản 3 (29/10/2026)

**Nguồn:** hai lần chạy eval do chủ dự án chạy trên admin (DB `english_learning`), dán vào chat ngày 29/10/2026:
`317d6d5e…` (`claude-haiku-5-5`) và `aa74f181…` (`claude-sonnet-5-5`). Cả hai dùng prompt `generate_cloze` **bản 3** (ví dụ mẫu bị lệch: đầu vào
`instantaneous`, đầu ra câu `brush`), `effort` và `thinking` để trống, 14 ví dụ từ [`generate_cloze.jsonl`](generate_cloze.jsonl).

**Ai chấm:** Claude đọc từng câu. Đây là bản đọc đầu, **chưa có nhãn của chủ dự án**. Tiếng Việt tự nhiên chủ dự án là người chấm chính (câu 21 ngày 26/10).

**Thiếu một ví dụ:** file có 15 dòng, chỉ 14 dòng vào DB. Dòng `take off` dùng `part_of_speech: "phrasal verb"`, mà giá trị này không nằm trong danh sách hợp lệ
(`AI_VALID_POS`, `apps/api/src/ai/ai.constants.ts`). Đây là lỗi của file ví dụ, không phải của AI.

## 1. Số tổng

| | Haiku | Sonnet |
|---|---|---|
| Đúng khuôn (`valid_count`) | 14/14 | 14/14 |
| Chi phí | 0,0056 USD (≈ 0,0004 / câu) | 0,0704 USD (≈ 0,0050 / câu, **gấp ≈ 12,5 lần**) |
| Thời gian trung bình | 4,2 s | 3,6 s |
| **Có từ khác điền vừa** (lỗi E1), tổng | 12 | 10 |
| … trong đó mức nặng | 5 | 5 |
| **`accepted_answers` chứa dạng sai ngữ pháp** (lỗi E2) | 1 | 2 |
| Câu vượt level (lỗi E3) | 1 | 0 (1 ở mức ranh giới) |
| Dùng sai từ loại (lỗi E4) | 1 | 0 |
| Câu không có lỗi nào | 2 (`go`, `happy`) | 4 (`go`, `bank`, `child`, `cheap`) |

"Đúng khuôn 14/14" không cho biết gì về chất lượng: mọi lỗi ở bảng dưới đều nằm trong các câu đúng khuôn.

## 2. Các loại lỗi gặp

- **E1 — Có từ khác điền vừa chỗ trống.** Người học điền một từ đồng nghĩa đúng nghĩa câu nhưng bị chấm sai. Là lỗi phổ biến nhất, ở cả hai model, dù prompt có
  hai luật riêng cho chuyện này (luật 2, 3). Chia hai mức:
  - *nặng*: từ khác điền vừa tự nhiên như từ mục tiêu (ví dụ "kept a steady ___" → `beat`);
  - *nhẹ*: từ mục tiêu khó có câu chỉ một đáp án (`although` ↔ `though`, `fast` ↔ `quickly`, tiếng lóng `lit`). Luật 4 của prompt đã chấp nhận chuyện này.
- **E2 — `accepted_answers` nhận dạng sai ngữ pháp.** Ví dụ "will ___" mà nhận cả `deployed`, `deploying`: người học gõ sai dạng vẫn được tính đúng.
- **E3 — Câu khó hơn level.** Ví dụ `child` (A1) trong câu có "abuse and neglect".
- **E4 — Dùng từ khác từ loại được giao.** `cheap` được giao là tính từ, nhưng câu dùng như trạng từ ("bought this jacket ___"), nên `cheaply` cũng điền vừa.

Không thấy: sai nghĩa (mọi câu đều đúng nghĩa trong `meaning_vi`, kể cả `bank` = bờ sông, `run` = điều hành, `lit` = nghĩa lóng), từ mục tiêu lộ trong câu,
nhiều hơn một chỗ trống, bản dịch sai ý.

## 3. Từng câu

| Từ | Haiku | Sonnet |
|---|---|---|
| `deploy` (B2, IT) | "The DevOps team will ___ the updated code to the production servers…" — E1 nhẹ: `push`, `release` | "…the engineers will ___ the new version… to the production server…" — E1 nhẹ: `release`, `push`; **E2**: nhận `deploys`, `deployed`, `deploying` sau "will" |
| `big` (A1) | "Elephants are ___ animals…" — **E1 nặng**: `huge`, `large` | "An elephant is a very ___ animal…" — **E1 nặng**: `large` |
| `go` (A1) | "Do you want to ___ shopping…" — đạt | "Children should ___ to bed early…" — đạt |
| `bank` (B1, bờ sông) | "…dug its den into the steep ___ of the river" — E1 nhẹ: `side` | "…the river burst its ___…" — đạt (cụm cố định "burst its banks"; level B1 ở mức ranh giới) |
| `run` (B1, điều hành) | "My aunt has ___ a small bakery…" — **E1 nặng**: `owned`, `managed`; **E2**: nhận `ran`, `running` sau "has" | "She has ___ a small family business…" — **E1 nặng**: `owned`, `managed` |
| `happy` (A1) | "Everyone shouted '___ birthday!'…" — đạt (cụm cố định; nghĩa "chúc mừng" hơi khác "vui, hạnh phúc") | "…she is so ___ that she smiles all day" — E1 nhẹ: `excited`, `glad` |
| `rhythm` (B2, âm nhạc) | "The drummer kept a steady ___… never lost the beat" — E1 nhẹ: `tempo` | "The drummer kept a steady ___…" — **E1 nặng**: `beat` |
| `child` (A1) | "The law protects every ___ from abuse and neglect" — **E1 nặng**: `person`, `citizen`; **E3**: "abuse, neglect" vượt A1 | "I am an only ___" — đạt |
| `although` (B1) | "___ the flight was delayed…" — E1 nhẹ: `Though`, `Even though` | "___ it was raining heavily…" — E1 nhẹ: `Though`, `Even though` |
| `cheap` (A2) | "I bought this jacket ___ at the market…" — **E4**; E1: `cheaply` | "…because it was very ___, only two dollars" — đạt |
| `subtle` (C1) | "Only a ___ hint of irony…" — **E1 nặng**: `slight`, `faint` | "There was a ___ difference in flavor…, so slight…" — **E1 nặng**: `slight`, `small` |
| `book` (A2, du lịch) | "Last week we ___ two tickets… online" — **E1 nặng**: `bought`, `ordered`, `reserved` | "…we need to ___ a hotel room…" — E1 nặng: `reserve`; **E2**: nhận `booked`, `books`, `booking` sau "to" |
| `lit` (không level, lóng) | "Their rooftop party was so ___…" — E1 nhẹ: `fun`, `cool` | "Jake's party was totally ___…" — E1 nhẹ: `wild`, `awesome` |
| `fast` (A1) | "Please don't drive so ___…" — E1 nhẹ: `quickly` | "You are driving too ___…" — E1 nhẹ: `quickly` |

## 4. Rút ra cho design nhóm B (Claude, chưa chốt)

- Tiêu chí **"chỉ một đáp án"** là lỗi chính, ở cả hai model: 12/14 câu (Haiku) và 10/14 (Sonnet), mức nặng 5/14 ở cả hai. Model đắt gấp 12,5 lần **không** giảm
  lỗi nặng. Judge
  cho tiêu chí này là cần, và cần cả hai mức nặng / nhẹ (đúng ba mức đã chốt ở câu 20 ngày 26/10).
- E2 (dạng sai ngữ pháp được nhận) có thể bắt bằng prompt hoặc judge; luật máy khó kiểm vì phải hiểu ngữ pháp câu.
- E3, E4 hiếm (1/28 mỗi loại), chưa đủ để làm judge riêng; có thể gộp vào judge "chỉ một đáp án" hoặc để sau.
- Sai nghĩa, lộ đáp án, nhiều chỗ trống: 0/28, chưa cần judge cho các tiêu chí này với thao tác này.
- 14 câu mỗi model là mẫu rất nhỏ; các tỉ lệ trên chỉ để định hướng.

## 5. Chưa làm

- **Tăng số mẫu (chủ dự án, 29/10/2026):** 14 câu mỗi model là quá ít để tin các tỉ lệ ở §1. Chủ dự án sẽ tăng số ví dụ để kiểm tra lại sau; khi có lần chạy lớn hơn,
  sửa lại §1, §4 và các con số dẫn từ file này (file câu hỏi nhóm B, design nhóm B).
- Chủ dự án chưa gắn nhãn; cách đọc ở §3 là của Claude. **Chủ dự án (29/10/2026):** ngữ nghĩa và độ tự nhiên của câu sẽ tự đánh giá **sau khi** khắc phục các lỗi
  trước mắt (E1, E2…), nên lúc này chưa đặt nặng việc gắn nhãn; các con số ở §1 tạm theo cách đọc của Claude.
- Chưa chạy lại với prompt đã sửa ví dụ mẫu (bản 2 hoặc bản mới), nên chưa biết ví dụ lệch ảnh hưởng tới đâu.
- Chưa chạy 5 thao tác còn lại, chưa thử OpenAI.
