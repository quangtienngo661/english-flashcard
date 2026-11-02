# Decision record: landing làm lại (02–03/11/2026)

Design: `docs/superpowers/specs/2026-11-03-landing-redesign-design.md`. Survey và câu hỏi gốc: `docs/preparation/LANDING_REDESIGN_SURVEY_2026-11-02.md`
(mục 8). Mockup các vòng: `docs/mockups/2026-11-02-landing-redesign/` (A, B, C) và `docs/mockups/2026-11-02-landing-v2/` (1–5).

## Tóm tắt

| # | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|
| Q1 | Bố cục và hướng thiết kế | Mockup 5: màn đầu giới thiệu app (5 tab), dạng bài làm thử được | Chủ dự án, sau 5 vòng |
| Q2 | Lời hứa dùng thử trên landing | Theo D15/D16 Bước 5: 7 ngày, cần thẻ | Chủ dự án |
| Q3 | Nút chính dẫn đi đâu | Trang đăng ký tài khoản; bỏ waitlist; làm landing hoàn chỉnh ngay | Chủ dự án |
| Q4 | Bộ skill dẫn | `impeccable` dẫn, `taste-skill` làm cửa kiểm, trong chuỗi superpowers | Chủ dự án (phần "trong superpowers" do Claude đề xuất) |
| S1 | Ba mockup đầu sai ở đâu | Bố cục chưa ổn, style lộn xộn, không khớp app đã build | Chủ dự án |
| S2 | Giữ hướng B không | Làm lại từ đầu, theo design system của app | Chủ dự án |
| S3 | Trang tham khảo | Claude đề xuất (owner: "bạn có thể đề xuất") | Claude, theo yêu cầu |
| L1 | Chế độ tối | Theo máy, kèm nút đổi | Chủ dự án |
| L2 | Code waitlist | Xóa hết, kể cả cấu hình D1 | Chủ dự án |
| L3 | Bản tiếng Anh | Làm ở đợt sau | Chủ dự án |
| L4 | `/en` khi chưa có tiếng Anh | Chuyển về `/vi`, ẩn nút English | Chủ dự án |
| C1–C4 | Chữ và chi tiết giao diện | Ngắn, chuyên nghiệp; "Đăng ký"; thẻ bài tập tối giản; bỏ highlight tiêu đề; CTA bên trái; hỏi đáp rộng, có chuyển động | Chủ dự án (góp ý trực tiếp) |

## Q1. Bố cục và hướng thiết kế

Bối cảnh: landing cũ (hướng B, 15/10) hứa sai so với sản phẩm và dùng nhiều mẫu mà cả hai bộ skill gọi là AI slop.

**Vòng 1: Q1 phạm vi (02/11), ba mockup trong `2026-11-02-landing-redesign/`.**

| Phương án | Trade-off |
|---|---|
| (a) Giữ nguyên hướng B, chỉ đổi thứ tự và chữ | Ít việc, giống app nhất; giữ các mẫu "AI slop" |
| (b) Giữ màu và font B, bỏ mẫu bị cấm, dùng ảnh app thật | Landing và app lệch nhau ở bóng và thẻ; phải chụp lại ảnh app |
| (c) Thế giới mới "nơi bạn gặp từ" (phụ đề, email, tin nhắn; nền navy) | Khác biệt nhất, tốn công nhất; landing tối, app sáng |

Chủ dự án: "cả 3 đều không ok lắm", tạm bỏ qua. Sau đó (S1): bố cục chưa ổn, style lộn xộn, không khớp app; yêu cầu research best practice
landing cho education và cách ghép design system của app.

**Vòng 2: ba bố cục trong `2026-11-02-landing-v2/`**, cùng design system của app. `impeccable concept-seed --scope surface` chia 3 trong 7 bố
cục Claude liệt kê (seed `f0cfcbd38430f476`, chỉ số 6, 4, 2).

| Phương án | Trade-off |
|---|---|
| 1. Một ngày với Wordmet (7:30 ôn, 12:15 thêm từ, 21:00 luyện) | Theo đúng hai tình huống trong PRODUCT.md; câu chuyện xoay quanh giờ học |
| 2. Bốn tab của app | Cho thấy app trực tiếp; ít câu chuyện |
| 3. Thử trước, đăng ký sau (phiên luyện ở màn đầu) | Cho thử ngay; ít giới thiệu các phần khác |

Chủ dự án: "version 1 tạm ổn", bỏ dòng AI ở gói Miễn phí, đánh giá bằng taste-skill và Emil Kowalski. Bản 1 được sửa theo đánh giá
(`danh-gia-mockup-1.md`: 9 FAIL còn 1).

**Vòng 3:** chủ dự án hỏi vì sao lại là "một ngày", muốn đánh vào vấn đề học từ vựng (học thẻ xong vẫn quên → cần vận dụng: bài tập AI, trắc
nghiệm). Claude thừa nhận bố cục do script chia ngẫu nhiên, đồng ý và làm **mockup 4** (thẻ → quên → vận dụng).

**Vòng 4:** chủ dự án: màn đầu phải giới thiệu app và các phần chính (AI, flashcard, tra từ, nhóm…); mô phỏng UI từng dạng bài; chữ chuyên
nghiệp hơn. **Mockup 5**: cửa sổ app 5 tab ở màn đầu; 7 dạng bài dựng theo đúng component phiên luyện của app. Chạy `impeccable critique`
(A: `critique-A.md`, B: `critique-B.md`) và sửa theo.

✅ **Mockup 5**, sau các vòng chỉnh ở C1–C4. Chủ dự án: "tạm ổn rồi, triển khai đi".

## Q2. Lời hứa dùng thử

Bối cảnh: landing cũ hứa "14 ngày, không cần thẻ"; D15/D16 Bước 5 là 7 ngày, cần thẻ, chỉ khi có thanh toán thật.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Sửa landing theo D15/D16 | Giữ quyết định đã chốt |
| (b) Đổi D15/D16 theo landing | Giữ lời hứa cũ, đổi thiết kế Bước 5 |
| (c) Bỏ con số tới khi có thanh toán | Ít cam kết, kém cụ thể |

Claude đề xuất thêm: viết kèm "khi Pro mở bán" và chờ luật sư về thời hạn báo trước. Về sau chủ dự án bỏ trạng thái "Chưa mở bán" vì landing
chỉ dùng khi deploy. Chữ chốt: "Dùng thử 7 ngày, cần thẻ thanh toán. Hủy trước hạn không mất phí." Câu hỏi pháp lý về báo trước vẫn mở
(design §13).

## Q3. Nút chính

| Phương án | Trade-off |
|---|---|
| (a) Giữ waitlist tới khi Deploy | Không đổi luồng; landing vẫn chỉ thu email |
| (b) Sau Deploy, nút vào app, bỏ waitlist | Một luồng duy nhất |
| (c) Cả hai theo giai đoạn | Hai luồng |
| ✅ Chủ dự án tự trả lời: dẫn thẳng tới trang đăng ký | Một luồng, khớp app |

Claude đề xuất landing mới lên cùng Deploy, trước đó giữ waitlist. Chủ dự án: không, làm hoàn chỉnh luôn; Worker đã tắt, phát triển ở local
rồi deploy. Waitlist không có email thật nên không cần email báo mở.

## Q4. Bộ skill dẫn

| Phương án | Trade-off |
|---|---|
| ✅ (a) `impeccable` dẫn, luật và máy đo `taste-skill` làm cửa kiểm | Đủ nhất; hai bộ luật cãi nhau ở bóng gờ, chuyển động, ảnh |
| (b) Chỉ `impeccable` | Gọn hơn, ít luật cho landing |
| (c) Chỉ `taste-skill` | Chuyên landing, thiếu review độc lập và `DESIGN.md` |
| (d) Không dùng, theo superpowers như các Bước trước | Quen thuộc; không có máy đo anti-slop |

Claude đề xuất (a) chạy trong chuỗi superpowers. Chủ dự án đồng ý cho `impeccable` tải binary ở lần chạy đầu.

## S1–S3. Phỏng vấn `impeccable shape`

- **S1:** chủ dự án trả lời "bố cục chưa ổn, style lộn xộn, không ăn khớp với giao diện đã build".
- **S2:** chọn giữa (a) giữ hướng B, (b) giữ logo và tên, làm mới màu và font, (c) làm mới toàn bộ. Chủ dự án: "làm lại từ đầu". Claude đọc
  cùng S1: làm lại trang nhưng theo design system của app; chủ dự án không phản bác.
- **S3:** trang tham khảo. Chủ dự án: "bạn có thể đề xuất". Claude xem Duolingo, Speak, ELSA (vn), Quizlet, Brilliant, Babbel
  (`LANDING_RESEARCH_2026-11-02.md` §1).

## L1–L4

**L1 chế độ tối:**

| Phương án | Trade-off |
|---|---|
| (a) Chỉ sáng | Ít việc; khác app |
| (b) Theo máy | Khớp app; không đổi tay được |
| ✅ (c) Theo máy, kèm nút đổi | Khớp app hoàn toàn |

Claude đề xuất dùng lại bộ theme của app, cùng khóa lưu, để landing và app chung một lựa chọn (design D1).

**L2 waitlist:**

| Phương án | Trade-off |
|---|---|
| ✅ (a) Xóa hết, kể cả cấu hình D1 | Sạch code; muốn dùng lại phải viết lại |
| (b) Xóa phần trên trang, giữ code và D1 | Dùng lại được; giữ code chết |

**L3 tiếng Anh:**

| Phương án | Trade-off |
|---|---|
| (a) Claude dịch, chủ dự án duyệt | Có ngay hai ngôn ngữ |
| (b) Chủ dự án tự viết | Đúng giọng; tốn thời gian chủ dự án |
| ✅ (c) Làm ở đợt sau | Đợt này nhỏ hơn; `/en` cần xử lý tạm (L4) |

**L4 `/en` trong lúc chờ:**

| Phương án | Trade-off |
|---|---|
| (a) Giữ landing tiếng Anh cũ | Hai thiết kế khác nhau; còn hứa trial 14 ngày |
| ✅ (b) `/en` về `/vi`, ẩn nút English | Một thiết kế, chữ đúng |
| (c) Thiết kế mới, chữ dịch máy | Có tiếng Anh ngay; chất lượng chữ thấp |

Claude đề xuất chỉ chuyển trang chủ `/en`; `/en/app` và hai trang pháp lý `/en` giữ nguyên (design D2, chờ duyệt cùng design).

## C1–C4. Góp ý trực tiếp trên mockup 5 (03/11)

- Chữ ngắn gọn, chuyên nghiệp (ba vòng: viết lại theo bản đánh giá A; research giọng văn PREP, ELSA, MoMo, Monkey; rút ngắn thêm).
- Nút "Đăng ký miễn phí" thành "Đăng ký".
- Thẻ bài tập: bỏ dòng hướng dẫn ("Từ in đậm trong câu này nghĩa là gì?"…), bỏ khung "Đúng rồi/Chưa đúng".
- Gói Pro: bỏ "Chưa mở bán".
- Tiêu đề: bỏ vệt highlight vàng ở mọi tiêu đề; giảm cỡ tiêu đề chính.
- Khối Đăng ký / Đăng nhập ở màn đầu sang bên trái.
- Hỏi đáp: thêm chuyển động khi mở, bỏ câu về ứng dụng điện thoại, thanh câu hỏi rộng hết cột nội dung.
- Lỗi chủ dự án tìm ra: thẻ lật tràn trên điện thoại. Đã sửa, và quét thêm được 3 chỗ tràn khác (design LRE3, LR22).

## Đề xuất kỹ thuật duyệt cùng design

- **D1** dùng lại theme của app. Bỏ: viết theme riêng cho landing, vì sẽ lệch khóa lưu và lệch màu.
- **D2** chỉ redirect trang chủ `/en`. Bỏ: redirect mọi `/en/*`, vì sẽ làm hỏng app tiếng Anh đang chạy.
- **D3** `en.json` tạm mang chữ Việt cho namespace `Landing`, để giữ test LP3. Bỏ: nới test LP3, vì mất bảo đảm hai file cùng khóa.
- **D4** tên dạng bài và chữ trong mảnh app lấy từ chuỗi có sẵn của app. Bỏ: viết lại chữ riêng cho landing, vì sẽ lệch khi app đổi.
- **D5** không thêm thư viện chuyển động. Bỏ: Framer Motion / GSAP; taste-skill gpt-taste bắt GSAP nhưng đã bị loại ngay từ survey.
