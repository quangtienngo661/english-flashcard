# Landing và màn luyện tập: sửa theo góp ý — decision record (19/11/2026)

Design: `docs/superpowers/specs/2026-11-19-landing-feedback-design.md`. Mock-up: `docs/mockups/2026-11-18-landing-gop-y/index.html`.
Nguồn góp ý: `Wordmet.pdf` (8 góp ý, 18/11/2026).

Cách làm (chủ dự án, 18/11/2026): Claude tự đề xuất mọi quyết định và làm mock-up; chủ dự án không trả lời từng câu mà xem mock-up rồi
sửa trực tiếp. "Chốt" dưới đây là chủ dự án nói rõ; "đề xuất" là Claude đưa ra trong mock-up và chủ dự án không phản đối mà chuyển sang
bước tiếp.

## Tóm tắt

| # | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|
| D1 | Sửa ở đâu | Cả landing và màn luyện tập trong app | Chủ dự án |
| D2 | Cách ra quyết định | Claude đề xuất tất cả kèm mock-up, chủ dự án duyệt | Chủ dự án |
| D3 | Tiêu đề hero | Một màu, bỏ màu nhấn "trong câu" | Đề xuất |
| D4 | Dải chip trượt ngang | Bỏ hẳn | Đề xuất |
| D5 | Section nhóm | Vòng cung chồng thẻ nhóm như app, tự chuyển, từ hiện trên thẻ giữa | Chủ dự án (vòng 3) |
| D6 | Nhóm nào trên vòng cung | 5 chủ đề có thật trong app, tên tiếng Anh | Chủ dự án (chọn kiểu), Claude (chọn chủ đề) |
| D7 | Tiêu đề section nhóm | "Học theo nhóm chủ đề" | Đề xuất |
| D8 | Bề ngang vòng cung | Trải hết cửa sổ, mờ dần hai bên | Chủ dự án |
| D9 | Số thẻ chờ trên thẻ nhóm | Bỏ | Chủ dự án |
| D10 | Vị trí và nội dung phần từ trên thẻ | Giữa khoảng trống; 5 từ + "+N từ" + "Bắt đầu với …" | Chủ dự án (yêu cầu), Claude (cách làm) |
| D11 | Ô số 1–4 khi đúng/sai | Nền trắng, chữ và viền cùng màu dòng; cả landing và app | Đề xuất |
| D12 | Dòng tiến độ câu luyện | Một dòng như app: "7/20", ✓ 5, ✕ 1 | Đề xuất |
| D13 | Câu hỏi nổi bật | Font display 26 px, cách xa phần khác | Đề xuất |
| D14 | Màu từ điền vào chỗ trống | Ô xanh "đúng" như app, không nền vàng | Đề xuất |
| D15 | Chữ "Đúng" / "Sai" trên dòng đáp án | Bỏ | Chủ dự án |
| D16 | Bố cục "Cách học" | 4 bước đánh số từ trên xuống, theo thứ tự học | Đề xuất |
| D17 | Nhóm thứ 5: IELTS hay Education | Education (giữ F.22) | Chủ dự án (19/11) |

## D1. Sửa ở đâu

Bối cảnh: góp ý 4–7 chụp từ bản minh họa trên landing; Claude đối chiếu code và thấy chỉ góp ý 4 (ô số) có cả trong app.

| Phương án | Trade-off |
|---|---|
| Chỉ landing | Ít việc; app vẫn còn ô số khó nhìn |
| ✅ Landing và màn luyện tập | Ô số sửa một lần cho cả hai; đụng `AnswerOption` dùng chung. **Đảo lại 20/11/2026:** khi chuẩn bị PR phát hiện `dev` đã bỏ ô số trên dòng đáp án của app (chủ dự án 18/11, "no number cap"); sửa ở app sẽ khôi phục thứ chủ dự án đã bỏ. Chỉ sửa ở landing |

## D2. Cách ra quyết định

Claude hỏi câu 1 (section nhóm muốn khách hiểu gì: A gom theo nơi gặp, B mỗi nhóm có lịch ôn, C nhóm có sẵn theo chủ đề, D khác).
Chủ dự án: "bạn tự recommend đi, sau đó mình sẽ chốt… cho mình các mẫu mock-up, mình sẽ không trả lời". Câu 1 không được trả lời; Claude
đề xuất cả 8 mục trong một mock-up.

## D3. Tiêu đề hero

| Phương án | Trade-off |
|---|---|
| Giữ màu nhấn "trong câu" | Nhấn ý chính, nhưng người góp ý thấy lạ |
| Highlight một từ tiếng Anh thay vì cụm tiếng Việt | Khớp ý "dùng từ trong câu"; thêm một kiểu nhấn nữa |
| ✅ Một màu | Đơn giản nhất; phần minh họa ngay dưới đã cho thấy "trong câu" |

Dấu chấm cuối đã bỏ trước đó (commit `81f63d87`).

## D4. Dải chip trượt ngang

| Phương án | Trade-off |
|---|---|
| Giữ dải, bỏ chip viền nổi | Còn chuyển động trang trí; vẫn lặp từ với section dưới |
| ✅ Bỏ hẳn | Hết lặp và hết chỗ "trông như bấm được"; `Marquee` thành code chết, xóa luôn |

## D5. Section nhóm (nhiều vòng)

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Một đoạn bài báo có 4 từ gạch chân → một nhóm mang tên bài đó, kèm chip chủ đề có sẵn | Chủ dự án: người xem "vẫn chưa hiểu cái mấu chốt nằm ở đâu" |
| 2 | 4 cột, mỗi cột một nhóm (nguồn, tên, số từ, các từ kèm nghĩa, thanh nhịp ôn), làm theo taste-skill | Chủ dự án đề nghị kiểu khác |
| 3 | ✅ Vòng cung chồng thẻ như app, tự chuyển nhóm, nhóm ở giữa hiện từ ngay trên thẻ, không nghĩa (ý của chủ dự án) | Giữ, sửa tiếp D6–D10 |

## D6. Nhóm nào trên vòng cung

Chủ dự án: "khảo sát và chọn một vài chủ đề phổ biến, sử dụng chủ đề trong app, để tên chủ đề bằng tiếng Anh".

| Phương án | Trade-off |
|---|---|
| Nhóm tự đặt theo nguồn (bài báo, video, giáo trình, podcast) — bản trước | Kể chuyện "gặp từ ở đâu"; không phải dữ liệu có trong app |
| ✅ 5 chủ đề có trong `topics` | Đúng tính năng "Tạo nhóm nhanh theo chủ đề"; tên tiếng Anh như app |

Chọn chủ đề: các chủ đề đời thường lặp lại ở danh sách của PREP, Drops, Lumetest (`docs/preparation/reports/Cách app gom từ theo chủ đề.md`)
và có nhiều từ B1–B2 trong nhãn CEFR-J: Travel, Food & Drink, Work & Jobs, Body & Health; thêm IELTS (bộ kỳ thi). Không có số liệu
người dùng thật (chưa launch). Nhóm thứ 5: xem D17.

## D7. Tiêu đề section nhóm

| Phương án | Trade-off |
|---|---|
| Giữ "Tạo nhóm từ cho mỗi bài đọc" | Không khớp khi các nhóm là chủ đề có sẵn |
| ✅ "Học theo nhóm chủ đề" + câu dẫn "Chọn chủ đề và trình độ, Wordmet tạo sẵn nhóm từ. Mỗi từ có lịch ôn riêng." | Khớp nội dung và tính năng trong app |

Claude hỏi "giữ tiêu đề mới hay quay lại tiêu đề cũ"; chủ dự án sửa tiếp phần khác rồi yêu cầu viết plan, không phản đối.

## D8. Bề ngang vòng cung

Chủ dự án: hai thẻ hai bên bị khuất; "ít nhất thì cho nó hiện full… nên fade ở 2 bên, đừng để có vết khuất nó bị cắt ngang".
✅ Trải hết cửa sổ, `mask-image` mờ hai bên, khoảng cách thẻ co theo bề ngang (`topicStep`). Đo: 1440 và 1280 px cả 5 thẻ rõ; 1024 px
hai thẻ ngoài mờ dần một phần.

## D9. Số thẻ chờ

Chủ dự án: "bỏ số thẻ chờ". ✅ Bỏ.

## D10. Phần từ trên thẻ

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Từ sát dưới tên nhóm | Chủ dự án: hạ xuống, dưới khá trống |
| 2 | Từ sát đáy thẻ | "thấp quá rồi" |
| 3 | Từ ở giữa khoảng trống | "thêm gì vào tí đi, hơi trống" |
| 4 | ✅ Giữa khoảng trống, 5 từ + ô "+N từ" + dòng chân "Bắt đầu với **từ đầu tiên**" (như "Tiếp theo …" của app) | Chủ dự án chuyển sang viết plan |

## D11–D14. Câu luyện minh họa

| # | Phương án chọn | Phương án đã nêu và bỏ |
|---|---|---|
| D11 ô số | ✅ Nền trắng, chữ + viền màu dòng | Nền đặc màu dòng, chữ trắng (đậm, dễ "nhức mắt" hơn) |
| D12 dòng tiến độ | ✅ "7/20", ✓ 5, ✕ 1 như app | Giữ 4 chip (lặp "7/20" với "13 câu còn lại") |
| D13 câu hỏi | ✅ Display 26 px, cách xa | Giữ Noto 22 px |
| D14 ô điền | ✅ Ô xanh như app | Giữ nền vàng (trông như cảnh báo) |

## D15. Chữ "Đúng" / "Sai"

Chủ dự án: "bỏ đúng sai đi" (kèm ảnh hai dòng đáp án). Claude hiểu là bỏ chữ trên dòng đáp án, giữ ✓ 5 / ✕ 1 ở dòng tiến độ; chủ dự án
không sửa lại cách hiểu này.

## D16. Bố cục "Cách học"

| Phương án | Trade-off |
|---|---|
| Giữ lưới (luyện to bên trái, hai thẻ nhỏ bên phải) | Thứ tự đọc ngược thứ tự học |
| ✅ 4 bước đánh số từ trên xuống, chữ trái, minh họa phải | Theo đúng thứ tự; trang dài hơn |

## D17. Nhóm thứ 5: IELTS hay Education

Mock-up có IELTS. Quyết định cũ F.22 (landing đọc như tiếng Anh chung, không chữ IELTS) có test giữ.

| Phương án | Trade-off |
|---|---|
| IELTS | Người học Việt tìm nhiều; phá F.22 và test của nó |
| ✅ Education | Giữ F.22; vẫn là chủ đề có thật trong app |

Chủ dự án chốt 19/11/2026: "Giữ Education". Mock-up vẫn vẽ IELTS ở thẻ thứ 5; code theo design.

## Đề xuất kỹ thuật duyệt cùng design

- Dùng lại CSS `.gstack-*` và `.gcar-*` của app cho thẻ nhóm, không chép; hàm thuần `stepTo`, `arcSlot` từ
  `features/learner/groups/carousel.ts`. Không dùng lại `GroupStack` (cần dữ liệu nhóm của API và chuỗi `App.stack`).
- Thêm `groupToneAt(index)` vào `lib/group-color.ts` để màu landing cố định theo thứ tự (hash của mã chủ đề cho hai nhóm trùng màu).
- Xóa code chết do thay đổi: `WordStrip`, `Marquee`, `FlyIn` và CSS của chúng (`[data-wm-marquee]`, `[data-wm-fly]`, `[data-group-card]`).
  `lib/fly-into.ts` đã không ai import từ trước nên để nguyên.
- Bỏ: quầng màu `.gcar-glow` (cố định theo viewport, hợp app hơn landing); nút tạm dừng riêng (dừng khi rê chuột, focus, và dừng hẳn khi
  người dùng tự chuyển).
