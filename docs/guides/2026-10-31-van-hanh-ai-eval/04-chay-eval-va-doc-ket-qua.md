# 04. Chạy eval và đọc kết quả

[README](README.md) · trước: [03](03-golden-set.md) · tiếp: [05 Judge](05-judge-va-gan-nhan.md)

## 1. Nút nào chạy cái gì

| Ở đâu | Nút | Chạy cấu hình nào | Trên bộ nào | Có judge? |
|---|---|---|---|---|
| "Cấu hình", trong nháp | "Chạy thử" | nháp đã lưu | tối đa 5 ví dụ dev (chọn, hoặc 5 cái đầu), chạy ngay, không qua worker | không |
| "Cấu hình", khối "Publish nháp" | "Chạy bộ ví dụ với nháp" | nháp | phiên bản mới nhất | không |
| "Cấu hình", khối "Publish nháp" | "Chạy bản đang chạy trên phiên bản {version}" | bản đang chạy (baseline) | phiên bản mới nhất | không |
| "Bộ ví dụ", khối "Chạy bộ ví dụ" | "Chạy bộ ví dụ" | **luôn là bản đang chạy** | chọn ở "Bộ chạy" | tick "Chấm bằng judge" + chọn "Judge" (chỉ hiện khi có judge đang bật cho thao tác này) |

"Bộ chạy" có thể là một phiên bản đã chốt hoặc "Bộ đang soạn (chỉ để thử nhanh, không so được)". Lần chạy trên bộ đang soạn **không so
được và không làm bằng chứng publish**. Chỉ dùng nó để thử nhanh sau khi vừa thêm ví dụ.

Muốn judge chấm lần chạy của **nháp**: hai nút ở trang "Cấu hình" không có tùy chọn judge, nên bắt đầu lượt chấm sau khi lần chạy xong,
từ khối "Judge" trong panel lần chạy: chọn ô "Judge" rồi bấm "Chấm bằng judge" (app cho chấm lần chạy đã xong hoặc lỗi), hoặc nút "Chấm cả hai bằng {name}" khi so
hai lần chạy. Xem [05](05-judge-va-gan-nhan.md).

## 2. Giới hạn và lý do bị từ chối

- **20 lần mỗi giờ cho mỗi admin**, theo giờ đồng hồ (13:00–13:59 là một cửa sổ), dùng chung giữa "Chạy thử", mọi lần chạy bộ ví dụ
  và chạy thử prompt cũ. Dòng "Còn {remaining}/{limit} lần chạy trong giờ này (dùng chung với Chạy thử ở Cấu hình)" cho biết còn bao
  nhiêu. Lượt chấm judge và chấm câu thật **không** tính.
- Bị từ chối (không mất lượt) theo thứ tự: chưa có model (`model-not-set`); nhà cung cấp chưa có key; bộ đang soạn rỗng; model thiếu
  giá (`model-price-missing`); đã chạm trần USD (`admin-usd-cap`); judge không bắt đầu được.
- Lần chạy chụp lại model, effort, giá và từng ví dụ lúc tạo. Đổi gì sau đó không ảnh hưởng nó.

## 3. Trong lúc chạy

- Lần chạy chạy trong worker, một lần chạy một lúc, tối đa 3 lời gọi song song. Worker không chạy thì lần chạy nằm chờ.
- "Lưu nháp" trong lúc lần chạy nháp đang chờ hoặc đang chạy → lần chạy đó lỗi `config-changed` ("Nháp đã được lưu lại sau khi lần
  chạy này được tạo…"). **Đừng lưu nháp khi đang chạy.**
- "Dừng lần chạy": thành lỗi `cancelled`, lời gọi đã gửi vẫn tính tiền, không chạy tiếp được, lượt judge đang chờ của nó cũng dừng.
- Chạm trần USD giữa chừng → lỗi `admin-usd-cap`, ví dụ chưa chạy để nguyên.
- Worker chết: sau 15 phút không có nhịp tim → lỗi `stalled`.

## 4. Đọc panel lần chạy, từng con số

Bấm một lần chạy trong bảng "Lần chạy" để mở panel. Ví dụ dưới giả định 21 dev + 9 held-out.

| Con số | Nghĩa | Ví dụ, cách đọc |
|---|---|---|
| "Tiến độ" | Đã có kết quả / tổng | 30/30 mới là xong |
| "Hợp lệ" | Số ví dụ đúng khuôn (`succeeded`) | 29 → một ví dụ trượt khuôn hoặc lỗi tạm thời |
| "Thời gian trung bình" | Thời gian mỗi lời gọi | gần 10 giây → nguy cơ `timeout` |
| "Chi phí" | Tổng chi phí; "+ {count} lời gọi chưa có giá" nếu thiếu giá | chia 30 để có giá mỗi câu |
| "Model", "Bộ", "Bản prompt", "Người chạy" | Lần chạy dùng gì | kiểm "Bộ" đúng phiên bản mới nhất |
| "Dev: khuôn {a}/{b}" | Đúng khuôn trên số ví dụ đã thử | 20/21 |
| "luật {a}/{b} ({c} bỏ qua)" | Qua luật trên số ví dụ đúng khuôn có luật; "bỏ qua" = không có trong kho | 18/19 (1 bỏ qua) → 1 từ không có trong kho, xem lại bộ |
| "mong đợi {a}/{b}" | Khớp ô mong đợi trên số ví dụ đúng khuôn | 19/20 |
| "Held-out (chỉ số tổng)" | Ba số như trên cho held-out | 9/9 · 8/8 · 7/9 |
| "{count} ví dụ lỗi tạm thời, tính là không đạt khuôn." | Mạng, timeout, 429, 5xx, đầu ra sai khuôn | nhiều → kiểm thời gian chờ, effort |

Hai điều dễ nhầm:
- **Mẫu số khác nhau.** Luật và mong đợi chỉ tính trên ví dụ đúng khuôn; "bỏ qua" và "Không áp dụng" không vào mẫu số. 18/19 luật
  không có nghĩa là 18/21.
- **"Đạt" của một ví dụ** = đúng khuôn và không trượt luật và không trượt mong đợi. Judge không nằm trong đó.

**Xong trọn** (điều kiện để làm bằng chứng publish): trạng thái xong và mọi ví dụ đều có kết quả (lỗi tạm thời cũng tính là có kết
quả). Bảng "Kết quả từng ví dụ" chỉ liệt kê dev ("Ví dụ held-out không được liệt kê.").

Xem nội dung thô của một lời gọi: trang "Các lần gọi" → "Mã thao tác (operation_id)" = `eval-<runId>-<exampleId>` → "Tìm" → "Xem".
Nội dung held-out hiện "Nội dung được ẩn". Nội dung chỉ giữ theo "Giữ nội dung lời gọi" (mặc định 7 ngày).

## 5. Error analysis trên kết quả

Con số chỉ nói **bao nhiêu**. Đọc câu mới biết **sai gì**. Cách làm theo
[evals FAQ](https://hamel.dev/blog/posts/evals-faq/) (open coding rồi axial coding):

1. Mở "Kết quả từng ví dụ". Đọc **từng** ví dụ dev, kể cả ví dụ "Đạt".
2. Với mỗi câu, tự hỏi như Lan: "mình biết từ này, mình có thể gõ từ khác mà vẫn đúng không?", "bản dịch có đúng không?", "câu có quá
   khó so với cấp không?".
3. Ghi **lỗi đầu tiên** của mỗi câu, một dòng. Lỗi phía trên thường kéo theo lỗi phía dưới.
4. Gom các dòng thành loại lỗi, đếm.
5. Đọc tới khi câu mới không còn lộ ra loại lỗi mới (nguồn gọi là theoretical saturation).

Mẫu bảng ghi (dán vào file ghi chú của bạn):

| # | Từ | Câu AI viết (rút gọn) | Lỗi đầu tiên | Loại | Mức |
|---|---|---|---|---|---|
| 1 | rhythm | The drummer kept a steady ___… | `beat` điền vừa | E1 | nặng |
| 2 | go | Do you want to ___ shopping… | không lỗi | — | — |
| 3 | run | She has ___ a small business… | `owned`, `managed` điền vừa; nhận `ran` sau "has" | E1 | nặng |

Danh mục khởi đầu, lấy từ B1 ([B1](../../preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md)); thêm loại mới khi gặp:
- **E1** có từ khác điền vừa (nặng: điền tự nhiên như từ mục tiêu; nhẹ: chỉ từ hiếm hoặc biến thể rất gần).
- **E2** `accepted_answers` nhận dạng sai ngữ pháp.
- **E3** câu khó hơn cấp độ.
- **E4** dùng từ khác từ loại được giao.

Kết quả đếm, ví dụ "E1: 9/21, E2: 2/21, E3: 1/21", quyết định bước tiếp theo: loại nhiều nhất thành tiêu chí judge
([05](05-judge-va-gan-nhan.md)) và thành thứ đầu tiên sửa trong prompt ([06](06-prompt.md)). Mức tối thiểu khi bận: mỗi lần đổi
lớn, 30 phút đọc 20–50 đầu ra ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

## 6. So hai lần chạy

Mở lần chạy mới → "So với lần chạy (trước)" → chọn lần cũ. Chỉ so được hai lần chạy trên **cùng một phiên bản đã chốt**.
- Bảng Khuôn / Luật / Mong đợi × Dev / Held-out, trước và nay.
- "Ví dụ dev trước đạt, nay trượt ({count})" kèm tiêu chí trượt. **Đọc từng ví dụ này.**
- Held-out chỉ có số đếm.
- Judge chỉ so được qua một bản judge đã chấm cả hai lần. Thiếu một bên → "{name}: chỉ một lần chạy có điểm của bản {revision}." và
  nút "Chấm cả hai bằng {name}".

## 7. Con số 30 ví dụ nói được gì

Khoảng tin cậy 95% của tỉ lệ đạt (tính toán Wilson, [file nghiên cứu §5](../../research/2026-10-31-ai-eval-best-practices.md)):

| Số ví dụ | Quan sát | Khoảng tin cậy 95% |
|---|---|---|
| 9 (held-out) | 7/9 = 78% | 45–94% |
| 20 (≈ phần dev) | 80% | 58–92% |
| 30 | 80% | 63–90% |
| 50 | 80% | 67–89% |
| 100 | 80% | 71–87% |

Quy tắc đọc:
- Trên 30 ví dụ, 5 điểm = 1,5 ví dụ. Chênh lệch tổng dưới ~15 điểm có thể chỉ là nhiễu.
- Trên 9 held-out, 1 ví dụ = 11 điểm. Đừng so % held-out; xem có lỗi **mới** không.
- So hai prompt trên **cùng** bộ: nhìn từng ví dụ đổi kết quả (đây là so cặp, kiểu đơn giản nhất). Sign test chính xác trên 30 ví dụ:
  bản mới sửa được 6, làm hỏng 0 → p ≈ 0,03 (khá chắc); sửa 5, hỏng 0 → p ≈ 0,06; sửa 6, hỏng 1 → p ≈ 0,13 (chưa chắc).
- Kết quả của AI dao động giữa các lần gọi. Muốn chắc hơn khi so hai prompt: chạy mỗi bên 2–3 lần trên cùng phiên bản (mỗi lần tốn một
  lượt trong 20 lượt/giờ). 3 lần chạy trên 30 ví dụ **không** bằng 90 ví dụ độc lập ([Miller, 2024](https://arxiv.org/html/2411.00640v1)).
  App không có tùy chọn "chạy K lần"; bạn bấm lại.
- Không hạ temperature để giảm dao động: có thể gây lệch ([Miller, 2024](https://arxiv.org/html/2411.00640v1)). (App không có ô
  temperature trong nháp.)
- Phát hiện cải thiện nhỏ (ví dụ 80% → 85%) cần hàng trăm ví dụ; 30 ví dụ chỉ thấy thay đổi lớn
  ([Miller, 2024](https://arxiv.org/html/2411.00640v1); tính toán ở file nghiên cứu §5).
