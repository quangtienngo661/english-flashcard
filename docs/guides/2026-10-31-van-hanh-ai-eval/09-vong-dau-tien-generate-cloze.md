# 09. Vòng đầu tiên: `generate_cloze`, từng cú bấm

[README](README.md) · trước: [08](08-tung-thao-tac.md)

Từ trạng thái trống (chưa có model, chưa có phiên bản bộ, ví dụ cũ chưa có ô mong đợi) tới một quyết định publish. Thời gian ước tính:
~2,5 giờ lần đầu (gồm thiết lập), ~1,5–2 giờ cho các thao tác sau. Chi phí ước tính ≈ 0,2–0,5 USD (`ASSUMPTION` cho tới bước 5).

Mở một file ghi chú (ví dụ `nhat-ky-ai-eval.md` ở chỗ bạn hay ghi). Mọi dòng **Ghi lại:** dưới đây chép vào đó.

## Bước 0. Chuẩn bị máy (15 phút)

Lệnh chạy máy lấy theo mục "Local setup" của `CLAUDE.md` ở gốc repo (không thuộc app-facts); app-facts chỉ xác nhận worker phải chạy
(`pnpm build` rồi `pnpm start:worker`) cho lần chạy bộ ví dụ và lượt judge.

1. Docker Desktop đang chạy; Postgres, Redis lên (`docker compose up -d` ở gốc repo).
2. `apps/api/.env`: điền `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`; để trống `OPENAI_CUSTOM_HEADERS`, `ANTHROPIC_CUSTOM_HEADERS`.
3. Trong `apps/api`: `pnpm build`, rồi chạy API và worker (`pnpm run:dev` chạy cả hai). Đã đang chạy thì tắt và chạy lại.
4. Admin web: `pnpm dev` trong `apps/admin`, mở `http://localhost:5173`, đăng nhập bằng tài khoản `admin`.
5. "Tình trạng": dòng "Nhà cung cấp có key: …" có OpenAI và Anthropic. Không có → kiểm `.env`, khởi động lại.

## Bước 1. Cài đặt và model (15 phút)

1. "Cài đặt hệ thống" → tab "AI": "Trần USD việc admin mỗi ngày" = 2; "Tỉ lệ ví dụ held-out" = 0.3; "Số nhãn tối thiểu để tin judge" =
   30; "Độ khớp tối thiểu với nhãn" = 0.85. Lưu.
2. "Model" → "Thêm model" → OpenAI → "Model id" `gpt-6.1-terra` → "Giá đầu vào" 1, "Giá đầu ra" 5, cache để trống → lưu.
3. Lặp lại cho `gpt-6.1-sol` (2 / 10).
4. Lặp lại cho một model Anthropic lớp Sonnet (id đúng như Anthropic ghi; B1 dùng `claude-sonnet-5-5`), giá lấy từ trang giá của
   Anthropic.
5. Tick "Ẩn khỏi ô chọn model" cho model không định dùng (ví dụ các model `fake:*`, nếu có).

**Ghi lại:** cột "Ước tính mỗi lời gọi" của ba model.

## Bước 2. Dọn ví dụ cũ (10 phút)

1. "Bộ ví dụ" → ô "Thao tác" = `generate_cloze`.
2. Xem các hàng có nhãn "Chưa có ô mong đợi". Ghi lại các từ.
3. Cách đề xuất ([02 §6](02-thiet-lap.md)): "Xóa" từng hàng cũ. Từ đáng giữ đưa vào file ở bước 3.

## Bước 3. Golden set (40 phút)

1. Soạn file `generate_cloze-v1.jsonl`, 30 dòng theo [08 §1](08-tung-thao-tac.md) và định dạng ở [03 §5](03-golden-set.md): mỗi dòng có
   `input`, `expected`, `split`, `note`. Đúng 9 dòng `held_out`, rải đều các nhóm.
2. Trước khi viết `expected` cho từ nào, kiểm từ có trong kho: "Thêm ví dụ" → gõ `word`, `part_of_speech` → rời ô → đọc "Đã điền
   {count} dạng từ kho." (chép các dạng đó vào `forms`) hoặc "Không thấy từ này trong kho…" (đổi từ) → hủy.
3. "Nhập hàng loạt" → chọn file → nhập.
4. Có dòng lỗi: sửa trong file và nhập lại **chỉ các dòng đó**.
5. Kiểm: "Ví dụ (30/1.000)"; 9 hàng có "Mở ví dụ held-out".
6. "Chốt phiên bản" → thấy "Phiên bản 1" trong "Phiên bản đã chốt".

**Ghi lại:** số phiên bản; danh sách 30 từ và từ nào held-out (giữ file JSONL là đủ).

## Bước 4. Nháp đầu tiên và chạy thử (15 phút)

1. "Cấu hình" → "Thao tác" = `generate_cloze`. Khối "Bản đang chạy · cấu hình {number}" chưa có model.
2. "Tạo nháp".
3. Đọc "Lời dặn" và "Ví dụ" hiện có. Từ trong "Ví dụ" có trùng golden set không? Có → đổi ví dụ mẫu hoặc đổi từ trong bộ.
4. Model `gpt-6.1-terra`; "Effort" `medium`; "Thinking" để mặc định; "Số token đầu ra tối đa" giữ 1200.
5. "Ghi chú": `R1: terra, effort medium, lời dặn gốc. Mốc đầu tiên.` → "Lưu nháp". Lỗi "Ví dụ mẫu {n} không qua luật: …" → sửa ví dụ
   mẫu đó ([06 §3](06-prompt.md)).
6. "Chạy thử" (tốn 1 trong 20 lượt/giờ, ≈ 5 lời gọi). Đọc 5 câu. Lỗi thô (sai khuôn hàng loạt, `timeout`) → sửa trước khi chạy cả bộ.

**Ghi lại:** cấu hình và lần sửa của nháp; nhận xét 5 câu chạy thử.

## Bước 5. Chạy cả bộ (10 phút chờ)

1. Khối "Publish nháp" → "Chạy bộ ví dụ với nháp". Lần chạy dùng phiên bản mới nhất (Phiên bản 1).
2. **Không lưu nháp** trong lúc chạy (sẽ lỗi `config-changed`).
3. Mở lần chạy: bảng "Lần chạy" ở trang "Bộ ví dụ" (bảng này liệt kê mọi lần chạy của thao tác, kể cả lần chạy nháp; lần chạy của một cấu hình ghi "Cấu hình N"). Đợi "Tiến độ" 30/30.

**Ghi lại:** mã lần chạy; "Hợp lệ"; dòng "Dev: khuôn … · luật … · mong đợi …"; dòng held-out; "Chi phí" (chia 30 = USD mỗi câu, thay
cho ước tính); "Thời gian trung bình"; số lỗi tạm thời.

## Bước 6. Error analysis (30 phút)

1. "Kết quả từng ví dụ": đọc cả 21 câu dev, kể cả câu "Đạt".
2. Mỗi câu một dòng trong bảng ở [04 §5](04-chay-eval-va-doc-ket-qua.md): từ, câu rút gọn, lỗi đầu tiên, loại (E1–E4 hoặc loại mới),
   mức.
3. Đếm. Ví dụ: `E1 nặng 4, E1 nhẹ 5, E2 2, E3 0, E4 1, không lỗi 9`.
4. Đọc riêng 4 ca regression (`rhythm`, `big`, `run`, `subtle`).

**Ghi lại:** bảng lỗi và dòng đếm.

## Bước 7. Judge và nhãn (30–40 phút)

1. "Judge" → hàng "Chỉ một đáp án" → "Sửa".
2. Chọn model Anthropic ở bước 1; effort để mặc định, thinking bật.
3. Câu hỏi của `single_answer` và "Hướng dẫn": dán bản ở [05 §4](05-judge-va-gan-nhan.md). Ví dụ mẫu: để trống ở vòng 1 (thêm sau khi có
   nhãn). Lưu → bản mới.
4. Mở panel lần chạy ở bước 5 → ở khối "Judge" chọn "Chỉ một đáp án" trong ô "Judge" rồi bấm "Chấm bằng judge". Đợi xong. Lượt chấm cả
   30 câu đúng khuôn, không tốn lượt trong 20 lượt/giờ.
5. **Trước khi đọc điểm judge:** bấm "Gắn nhãn lần lượt" → "Gắn nhãn · Chỉ một đáp án". Mỗi câu dev: 1 = đạt, 2 = không đạt nặng,
   3 = không đạt nhẹ, phân vân → "Bỏ qua". Dùng chính bảng lỗi bước 6 (E1 nặng → 2, E1 nhẹ → 3). Nếu màn hình hiện verdict của judge, che
   lại.
6. Đọc điểm judge và lý do từng câu. Đếm: trong số câu bạn chấm 2 hoặc 3, judge bắt được mấy?

**Ghi lại:** bản judge; số câu bạn chấm không đạt và số judge bắt được; chi phí lượt chấm.

Sau vòng này mới có ~21 nhãn, **chưa đủ 30** để "Đã hiệu chỉnh". Đừng dùng số judge làm điều kiện publish ở vòng 1.

## Bước 8. Sửa một thứ và chạy lại (20 phút)

1. Chọn **một** thay đổi theo loại lỗi nhiều nhất ([06 §4](06-prompt.md)). Ví dụ E1 nhiều nhất → thêm vào "Lời dặn" bước tự liệt kê 3
   từ người học có thể gõ và sửa câu cho tới khi chúng không vừa.
2. "Ghi chú": `R2: <đổi gì>. Vì E1 = __/21 ở R1. Mong E1 nặng ≤ 2.` → "Lưu nháp" → "Chạy thử" → "Chạy bộ ví dụ với nháp".
3. Mở lần chạy mới → "So với lần chạy (trước)" → chọn lần chạy R1. Đọc "Ví dụ dev trước đạt, nay trượt".
4. Chấm lần chạy R2 bằng judge (hoặc "Chấm cả hai bằng {name}"). Gắn nhãn 21 câu dev mới: tổng ~42 nhãn → xem "Độ khớp".

**Ghi lại:** hai dòng số R1 và R2 cạnh nhau; ví dụ đổi kết quả (sửa được gì, làm hỏng gì); độ khớp và có "Đã hiệu chỉnh" chưa.

Kết quả chưa ổn: lặp bước 8 (mỗi lần một thay đổi; nhớ giới hạn 20 lượt/giờ và trần 2 USD/ngày). Muốn thử `gpt-6.1-sol`: đó là một
thay đổi riêng, một lần chạy riêng.

## Bước 9. Quyết định (15 phút)

1. In hoặc mở [07](07-quyet-dinh-publish.md). Điền mục A–E bằng số của lần chạy nháp **mới nhất**.
2. Vì bản đang chạy chưa có model: không cần baseline, không có cảnh báo; trang ghi "Bản đang chạy chưa có model: publish này không so
   với bản nào." Mọi thứ dựa vào ngưỡng của bạn.
3. Quyết:
   - **Publish:** khối "Publish nháp" → "Publish". Người học bắt đầu nhận câu AI của thao tác này từ lần gọi sau.
   - **Sửa tiếp:** quay lại bước 8.
   - **Không:** giữ nguyên; người học vẫn nhận câu không AI.
4. Điền một khối nhật ký (mục H của [07](07-quyet-dinh-publish.md)).

Ví dụ một khối đã điền (số minh họa, không phải kết quả thật):

```text
### generate_cloze · 02/11/2026 · cấu hình 4 lần sửa 2 · phiên bản bộ 1
Model / effort / thinking / max tokens: gpt-6.1-terra / medium / mặc định / 1200
Lần chạy nháp: <mã R2>    Baseline: không có
Khuôn 30/30  Luật 28/29 (1 bỏ qua)  Mong đợi 29/30
Held-out: 8/9, lỗi mới: không rõ (lần đầu); đã bị xem: 0
Judge Chỉ một đáp án bản 2: đạt 22/30, nặng 3; hiệu chỉnh: có (khớp 88%, 42 nhãn); bắt 11/13 câu tôi chấm không đạt
Đọc tay 10 câu: lỗi nghiêm trọng 0; ca regression: rhythm, big đạt; run, subtle không đạt nhẹ
Chi phí mỗi câu: 0,004 USD; thời gian TB: 5,1 s
Cảnh báo: không có (lần publish đầu)
Quyết định: SỬA TIẾP
Lý do: judge đạt 73% < 85%, 3 câu nặng > 1. Thử R3: thêm ví dụ mẫu có manh mối collocation.
Theo dõi sau publish: —
```

## Bước 10. Sau khi publish (tuần đầu)

1. Luyện tập bằng tài khoản test tới khi có ~20–30 câu cloze AI.
2. "Câu AI thật" → Judge "Chỉ một đáp án", "Thao tác" `generate_cloze`, "Cấu hình · model" = cấu hình vừa publish, tick "Chỉ tài khoản
   test (admin, editor)" → "Chấm {count} câu".
3. Đọc "Lý do", gắn nhãn, "Đưa vào bộ ví dụ" cho câu không đạt.
4. Làm trong vòng 7 ngày (dữ liệu câu thật bị xóa sau đó).

## Chi phí dự kiến của vòng (ước tính, `ASSUMPTION`)

| Việc | Lời gọi | Ước tính |
|---|---|---|
| 2 lần "Chạy thử" | ~10 writer | ≈ 0,03 USD |
| 2 lần chạy bộ (R1, R2) | ~60 writer | ≈ 0,19 USD (theo 0,0031 USD/lời gọi của terra) |
| 2 lượt judge | ~60 judge | chưa đo; ước lượng ≈ 0,1–0,3 USD |
| **Tổng** | | **≈ 0,3–0,5 USD** |

Thay ước tính bằng số thật ở bước 5 và 7. Theo dõi ở "Tình trạng": "Việc của admin hôm nay (chạy thử, bộ ví dụ, judge): {spent} / {cap}".
