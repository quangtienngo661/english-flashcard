# Decisions — Bước 3: Learning (kèm phần Content dời từ Bước 2)

Ngày: 16–17/10/2026. Đi kèm design doc [`../specs/2026-10-16-buoc-3-learning-design.md`](../specs/2026-10-16-buoc-3-learning-design.md).
File này gom mọi quyết định trong lúc brainstorm Bước 3, mỗi quyết định kèm các phương án **đã thật sự đưa ra trong chat**,
trade-off và lựa chọn. Design doc mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*.

> **Trạng thái 17/10/2026: bản nháp.** Phần giao diện (D38, các câu hỏi trong `../../mockups/2026-10-16/UI-CONTEXT.md` §7) có plan
> riêng (D41). Plan hệ thống không còn câu mở (G6 chốt ở D46); D39–D40 có phần đề xuất của Claude chờ duyệt.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trong chat; "Đề xuất của Claude" = chủ dự án không chọn hoặc
nói không có ý khác, Claude đề xuất và chủ dự án đồng ý hoặc không phản đối; "Duyệt cùng design" = Claude đề xuất khi trình bày
một phần design, chủ dự án duyệt cả phần.

**Cách hỏi ở Bước 3:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md, 15/10/2026). Mục cuối ghi những chỗ Claude
đã đề xuất trước khi chủ dự án trả lời.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| D1 | Thứ tự và phạm vi (Q-A) | Bước 3 đầy đủ | Chủ dự án |
| D2 | Nền tảng của Bước 3 | Chỉ web; Flutter sau | Chủ dự án (đồng ý giới hạn Claude nêu) |
| D3 | Vị trí bước Deploy | Khi toàn bộ app hoàn chỉnh, trước ra mắt (vòng 3, 18/10; trước đó: ngay sau Bước 3) | Chủ dự án |
| D4 | Ghi những thứ chỉ kiểm được khi deploy | Một mục trong design Bước 3 | Chủ dự án |
| D5 | Ai soạn nội dung (Q-B) | AI soạn nháp CSV ngoài app, chủ dự án duyệt, import; thử 20 từ trước; không phải code Bước 3 | Chủ dự án |
| D6 | Bao nhiêu từ | Đích 8.812 từ | Chủ dự án |
| D7 | Chủ đề khi publish | Không bắt buộc (đổi K10) | Chủ dự án |
| D8 | Nhắc học (Q-C) | Có, tự động (đổi K25); push là chính, email thưa hơn; nội dung chung chung | Chủ dự án |
| D9 | Kênh nhắc ở Bước 3 | Chỉ email, thiết kế theo notification provider | Chủ dự án |
| D10 | Cổng notification nhận gì | Người dùng (mỗi kênh tự tra địa chỉ) | Chủ dự án |
| D11 | Ai chọn kênh | Lớp chọn kênh riêng | Chủ dự án |
| D12 | Ngưỡng và người dùng thật (Q-D) | Không khảo sát thêm; không đổi thứ tự bước tới khi app hoàn chỉnh; tìm người dùng khi app hoàn chỉnh; ngưỡng dời tới trước ra mắt | Chủ dự án (ngưỡng dời: đề xuất của Claude) |
| D13 | Nhắc học còn trong Bước 3 không | Còn; chủ dự án là người dùng thử | Chủ dự án |
| D14 | Phần lõi do chủ dự án tự viết | Không có ở Bước 3; chủ dự án duyệt bảng ví dụ hành vi | Chủ dự án (bảng ví dụ: đề xuất của Claude) |
| D15 | App người học đặt ở đâu | `apps/web`, chung domain `wordmet.com`, một codebase (đổi L8) | Chủ dự án (sau 3 vòng) |
| D16 | Ai đổi mức của từ | Chỉ người học bấm; "Cần ôn tập" về mức 1 và lên đầu (đổi K22, bỏ hướng "quên khác nhầm") | Chủ dự án |
| D17 | Trạng thái của từ | Mức 0–5 + cờ ưu tiên; bỏ nút "Chưa học"; giữ "Bỏ khỏi việc học" (đổi LR4, F20; K13, K14 giữ) | Chủ dự án |
| D18 | Cách lên lịch | Thang cố định 1/3/7/14/30 (giữ K21); FSRS sau khi có dữ liệu | Chủ dự án |
| D19 | Ôn sớm | Không đổi gì | Chủ dự án |
| D20 | Ôn theo gì | Theo nhóm (deck); lịch theo từng từ | Chủ dự án |
| D21 | Trần mỗi ngày | 20 từ mới, 100 từ ôn, theo nhóm; từ ưu tiên không tính | Chủ dự án (100 và "ưu tiên không tính": đề xuất của Claude) |
| D22 | Từ tồn đọng sau thời gian dài | Danh sách cân nhắc (từ mức ≥ 1 quá hạn > 60 ngày): học lại, bỏ, hoặc để đó; từ mức 0 không bao giờ vào | Chủ dự án (ý của chủ dự án, chi tiết của Claude) |
| D23 | Giới hạn số nhóm, từ mỗi nhóm, từ riêng | Đưa vào subscription (Bước 5); tạm là hằng số | Chủ dự án |
| D24 | Ai chỉnh con số và nội dung thông báo | Trang admin "Thông báo & giới hạn"; mẫu email bàn sau | Chủ dự án |
| D25 | Người học tắt nhắc ở đâu | Trong app; email có link mở Cài đặt | Chủ dự án (link: đề xuất của Claude) |
| D26 | Người lâu không vào app | 3 nấc: < 7 ngày nhắc thường; 7–60 ngày "lâu rồi" mỗi tuần; > 60 ngày dừng | Chủ dự án (ý của chủ dự án, nấc của Claude) |
| D27 | Khi nào gửi | Chỉ khi có từ cần ôn hoặc từ mới | Chủ dự án |
| D28 | Thêm nhanh | Chọn nhóm lúc thêm (~~mặc định "Mới thêm"~~, bỏ ở D43); tự nhập chỉ bắt buộc nghĩa; trùng thì lưu câu | Chủ dự án |
| D29 | Dạng chia | Hệ thống cung cấp; dùng cho tra và hiện; dạng chia là từ độc lập trỏ về từ gốc ở từng nghĩa | Chủ dự án (sau 4 vòng) |
| D30 | Trang từ | Kiểu Cambridge: một trang mỗi chữ, chia theo loại từ, nút thêm ở từng nghĩa | Chủ dự án |
| D31 | Tra từ và thêm nhanh | Hai chỗ riêng | Chủ dự án |
| D32 | Sáu hành vi nhỏ | Xem mục D32 | Chủ dự án |
| D33 | Xóa nhóm | Xóa hẳn từ chỉ thuộc nhóm đó, có cảnh báo | Chủ dự án |
| D34 | Xuất "từ chưa có nghĩa" (backlog D26 của Bước 2.5) | Vào Bước 3, milestone đầu | Chủ dự án (milestone đầu: đề xuất của Claude) |
| D35 | Một từ ở hai nhóm tính vào trần nào | Chỉ nhóm nơi ôn | Chủ dự án |
| D36 | Người chưa xác minh email | Không gửi email nhắc; app mời xác minh | Chủ dự án |
| D37 | Worker chết khi đang gửi email | Queue một job mỗi người mỗi ngày + 3 trạng thái; thấy "đang gửi" thì bỏ qua | Chủ dự án (bỏ qua: đề xuất của Claude) |
| D38 | Cách làm giao diện | Mockup HTML → chốt style → Figma; mobile-first; làm ở phiên riêng | Chủ dự án |
| D39 | Đường dẫn app người học (G1 của plan) | Dưới tiền tố ngôn ngữ: `/vi/app`, `/en/app` | Chủ dự án (luật "tiền tố theo ngôn ngữ hồ sơ": đề xuất của Claude, chờ duyệt) |
| D40 | Sáng/Tối lưu ở đâu (G3 của plan) | Theo hệ thống của máy người học; lưu trên thiết bị, không đổi API | Chủ dự án (cách hiểu "lưu trên thiết bị": Claude, chờ xác nhận) |
| D41 | Plan và người implement | Plan chỉ phần hệ thống; giao diện có plan riêng ở phiên khác; implement ở một phiên khác, không dùng Codex | Chủ dự án |
| D42 | Trang từ có gộp chữ hoa và chữ thường không | Tách: `March` và `march` là hai dòng, hai trang; tìm và tra không phân biệt hoa thường | Chủ dự án (cách tìm và tra: Claude) |
| D43 | Có nhóm mặc định "Mới thêm" không | Bỏ: thêm từ phải chọn hoặc tạo nhóm; nhóm nào cũng đổi tên, xóa được (đổi D28) | Chủ dự án |
| D46 | Nguồn dạng chia tự sinh (G6 của plan) | AGID làm nguồn chính; `compromise` dự phòng chỉ cho động từ, danh từ; tính từ ngoài AGID không tự sinh; đo trước theo ngưỡng cũ | Chủ dự án (đề xuất của Claude, theo yêu cầu của chủ dự án) |
| D47 | Số nhiều của danh từ không đếm được (bộ library) | Thêm `pluralize` 8.0.0 (MIT) để không sinh số nhiều cho danh từ không đếm được có trong danh sách của nó | Chủ dự án (đề xuất của Claude) |
| D48 | Từ ưu tiên mà người học bỏ app hơn 60 ngày | Vào danh sách cân nhắc, rời phần ưu tiên | Chủ dự án |
| D45 | "Xong khi" của Bước 3 (G5 của plan) | Không đặt danh sách cố định trước; chủ dự án tự báo khi Bước 3 xong | Chủ dự án |
| D44 | Giới hạn số email nhắc (G2 của plan) | Hai email nhắc cách nhau ít nhất N ngày; admin chỉnh N từ 1 tới 7, mặc định 2 (thay "tối đa N email mỗi tuần") | Chủ dự án (chỉnh khoảng cách thay vì công tắc chọn cách đếm: đề xuất của Claude) |

## D1 — Thứ tự và phạm vi (Q-A)

Bối cảnh: `PROJECT_ASSESSMENT_2026-10-15.md` mục 5 nêu ba hướng; Bước 3 đầy đủ cần dựng app web mới cho người học và làm từ riêng
tư (bảng `entries` chưa có cột chủ sở hữu); catalog có 7.799 từ nhưng 4 từ có nghĩa.

| Phương án | Trade-off |
|---|---|
| ✅ A. Bước 3 đầy đủ → Deploy → pilot | Đúng kế hoạch; giữ phần khác biệt (thêm từ đã gặp, câu ngữ cảnh). Người dùng đầu tiên tới muộn hơn B |
| B. Lát mỏng (nhóm, thêm từ catalog, flashcard, "hôm nay", lịch ôn) + Deploy + ~300 từ → pilot 5–10 người | Có dữ liệu hành vi sớm nhất; cắt mất phần khác biệt (K19, K23) |
| C. Thử không code (Anki/Quizlet + quy trình tay 7–14 ngày) | Rẻ nhất; không kiểm được app của mình |

Claude đồng ý A sau khi chủ dự án chọn, vì B như assessment viết cắt mất phần làm app khác Anki/Quizlet, và chuỗi tra nghĩa chỉ gồm
catalog + tự nhập nên phần A thêm không lớn. Rủi ro "người dùng đầu tiên tới muộn" được ghi lại.

## D2 — Nền tảng của Bước 3

Claude nêu hai giới hạn kèm A: (1) không từ điển ngoài, không AI; (2) chỉ web, Flutter sau (`ASSUMPTION`: K19 ghi "web trước").
Chủ dự án đồng ý (2). Giới hạn (1) vốn có sẵn trong HANDOFF §2 nên ghi là hệ quả, không phải quyết định mới.

## D3 — Vị trí bước Deploy

| Vòng | Phương án | Trade-off | Chọn |
|---|---|---|---|
| 1 | Trước / sau / song song với Bước 3 | Trước: tốn tiền sớm, có server thật để thử sớm. Sau: đúng thứ tự, pilot chờ. Song song: hai luồng cùng lúc | ✅ Sau |
| 2 (khi bỏ pilot, D12) | Giữ ngay sau Bước 3 / dời tới trước ra mắt / làm sớm hơn | Giữ: dùng thử trên điện thoại và email thật từ sớm, lộ lỗi deploy sớm. Dời: chậm chi phí, chỉ thử ở local | Giữ ngay sau Bước 3, "để từ đây tới lúc hoàn thành kiểm tra nếu có vấn đề gì ở phần deploy" (bị thay ở vòng 3) |
| 3 (18/10, sau khi phần hệ thống Bước 3 xong) | Đổi: Deploy khi toàn bộ app hoàn chỉnh, trước ra mắt / Giữ: ngay sau Bước 3 | Như vòng 2 | ✅ Đổi: "Deploy khi toàn bộ app hoàn chỉnh, trước ra mắt" |

Vòng 3: chủ dự án nhớ là đã chốt "khi hệ thống hoàn thành thì mới deploy". Claude đối chiếu file này với đoạn chat ngày 16/10 (câu trả
lời vòng 2 là "Giữ nguyên cũng đc…") và hỏi lại; chủ dự án chọn đổi. Hệ quả: chủ dự án dùng thử (D13) ở máy local, email nhắc vào
Mailpit; mục 14 của design (những thứ chỉ kiểm được khi deploy) chỉ được kiểm ngay trước ra mắt; trang `/app/*` vẫn chặn trên
production tới bước Deploy.

## D4 — Những thứ chỉ kiểm được khi deploy

Claude tự nêu kèm D3 (xem mục cuối); chủ dự án hoãn ("xíu nữa phân tích sâu hơn"), sau đó Claude hỏi lại đúng luật.

| Phương án | Trade-off |
|---|---|
| ✅ Một mục trong design Bước 3, bước Deploy kiểm trước tiên | Không quên; bước Deploy có sẵn danh sách |
| Để bước Deploy tự liệt kê | Ít việc bây giờ; dễ sót |
| Không cần danh sách | Ít việc nhất; lỗi lộ lúc dùng |

Chủ dự án trả lời "Ok"; Claude hiểu là phương án 1 và nói rõ cách hiểu.

## D5 — Ai soạn nội dung (Q-B)

| Phương án | Trade-off |
|---|---|
| Tự soạn tay | Kiểm soát chất lượng; 15–40 giờ cho 300–500 từ (`ASSUMPTION`) |
| ✅ AI soạn nháp CSV ngoài app → chủ dự án duyệt → import bằng luồng CSV có sẵn | Nhanh; không cần code (F26 chỉ bỏ AI soạn trong app); vẫn phải duyệt kỹ |
| Nhờ người khác (vai trò `editor`) | Đỡ việc; cần người |
| Không soạn thêm, dựa vào từ người học tự nhập | Không tốn công; catalog không dùng được |

Lý do của chủ dự án: làm một mình, cần AI hỗ trợ. Claude thêm hai việc, chủ dự án chốt: thử một lô ~20 từ để đo thời gian duyệt thật;
soạn nội dung là điều kiện trước khi có người dùng, không phải code của Bước 3.

## D6 — Bao nhiêu từ

Chủ dự án trả lời "toàn bộ từ đã chốt trước đó"; Claude hỏi lại hai cách hiểu: (1) toàn bộ CEFR-J + Octanove (~8.812 từ, chốt
01–02/10 làm nguồn level), (2) gói pilot 300–500 từ (mới là đề xuất). ✅ Cách 1.

Claude đề xuất khác ở thời điểm: đích 8.812, nhưng pilot bắt đầu sau lô đầu (ước tính 73–440 giờ duyệt cho đủ 8.812, `ASSUMPTION`).
Chủ dự án: "theo bạn đề xuất". **Sau D12 (không pilot tới khi app hoàn chỉnh), điều kiện "lô đầu" không còn áp dụng**; đích 8.812 từ
trước ra mắt giữ nguyên, lô thử 20 từ giữ nguyên.

## D7 — Chủ đề khi publish

Bối cảnh: K10 bắt buộc ít nhất một chủ đề; chỉ có 5 chủ đề; dòng CSV có mã chủ đề chưa tồn tại bị loại cả dòng; nhiều từ phổ thông
không khớp chủ đề nào.

| Phương án | Trade-off |
|---|---|
| Mở rộng danh sách chủ đề, AI chọn trong danh sách | Giữ K10; thêm việc tạo chủ đề qua API (admin chưa có màn hình) |
| Thêm chủ đề chung kiểu "general" | Giữ K10; chủ đề vô nghĩa |
| ✅ Bỏ điều kiện "phải có chủ đề" (đổi K10, sửa code) | Linh hoạt; từ không chủ đề không hiện khi lọc theo chủ đề |

Lý do của chủ dự án: bắt buộc thì ràng buộc quá; chủ đề nên là khuyến khích. Claude đồng ý, chi tiết: chỉ sửa API
(`publish.service.ts`); `apps/admin` không dùng lỗi `topic-missing` (đã grep).

## D8 — Nhắc học (Q-C)

| Phương án | Trade-off |
|---|---|
| Không nhắc (giữ K25), ghi trước cách đọc kết quả | Không tốn gì; tỉ lệ quay lại thấp thì không biết vì sao |
| Nhắc tay trong nhóm chat | Không code; phải nhắn đều |
| ✅ Nhắc tự động (đổi K25) | Đúng nỗi đau "khó duy trì"; phải làm |

Chủ dự án: push trên mobile là chính; email (nếu có) thưa hơn vì người dùng ở nền tảng chính nhiều hơn; nội dung chung chung kiểu
"Tới giờ học từ vựng", không nêu từ cụ thể. Claude đề xuất nhắc tay cho pilot web; **chủ dự án bác**: app làm cho nhiều người, nhắc
phải tự động.

## D9 — Kênh nhắc ở Bước 3

| Phương án | Trade-off |
|---|---|
| Web push + email | Đúng nguyên tắc; Bước 3 to hơn rõ rệt; web push trên iPhone chỉ chạy khi đã thêm app vào màn hình chính (blog WebKit, iOS 16.4) |
| ✅ Chỉ email trong Bước 3, push làm cùng Flutter | Nhỏ hơn (đã có phần gửi email và hàng đợi job); lệch "push là chính" trong lúc chưa có Flutter |
| Chỉ web push | Đúng kênh chính; bỏ sót người dùng iPhone chưa cài |

Chủ dự án chọn email và yêu cầu thiết kế theo **notification provider**: sau này thêm push chỉ cần cài thêm provider. (Claude đã gắn
"đề xuất" cho phương án đầu trước khi chủ dự án trả lời; xem mục cuối.)

## D10 — Cổng notification nhận gì

Hỏi lại đúng luật theo yêu cầu chủ dự án; chủ dự án hỏi trade-off, rồi chưa hiểu nên Claude giải thích lại bằng ví dụ "nhắc Lan".

| Phương án | Trade-off |
|---|---|
| ✅ Nhận người dùng; mỗi kênh tự tra địa chỉ | Thêm push không phải sửa phần lên lịch; nhiều thiết bị do kênh lo; kênh phụ thuộc module khác; phải tra theo lô |
| Nhận địa chỉ (như `Mailer` hiện nay) | Dùng lại thẳng `Mailer`; thêm push phải sửa phần lên lịch |

Claude thêm: kênh email tra địa chỉ theo lô; test dùng bản giả phần tra địa chỉ.

## D11 — Ai chọn kênh

| Phương án | Trade-off |
|---|---|
| Phần lên lịch tự chọn | Ít code ở Bước 3; khi có push phải sửa phần lên lịch |
| ✅ Lớp chọn kênh riêng | Luật "push là chính, email thưa hơn" và cài đặt từng người nằm một chỗ; thêm một lớp khi mới có một kênh |

Claude đề xuất làm lớp này thật mỏng ở Bước 3 (kiểm cờ bật/tắt rồi chuyển cho email).

## D12 — Ngưỡng thành công và người dùng thật (Q-D)

Bối cảnh: mục 8 của DECISIONS có 4 chỉ số, chưa có ngưỡng; chỉ số 4 cần Bước 4.

| Vòng | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Ngưỡng cho chỉ số 1–3; dưới ngưỡng thì làm gì | "Có thể là cả 3" → hỏi lại → (b): tùy chỉ số hụt |
| 2 | Claude đề xuất bảng "chỉ số hụt → làm gì" | Chủ dự án: không khảo sát nữa, không sửa các bước tới khi hoàn thành app |
| 3 | Sau Bước 3 + Deploy có cho người dùng thật vào không | "Tới khi app xong hoàn chỉnh thì sẽ tìm kiếm user" |

Kết quả: bỏ pilot sau Bước 3; ngưỡng dời tới trước ra mắt (đề xuất của Claude, vì nhật ký đã đủ dữ liệu, LR14). Rủi ro được ghi một
lần: assessment chỉ ra rủi ro lớn nhất là xây tới hết V1 mà chưa có bằng chứng hành vi; quyết định này chấp nhận rủi ro đó.

## D13 — Nhắc học còn trong Bước 3 không

| Phương án | Trade-off |
|---|---|
| ✅ Giữ email nhắc trong Bước 3 | Làm và test sớm; chủ dự án tự dùng thử |
| Dời toàn bộ sang lúc làm Flutter và push | Bước 3 nhỏ hơn; hai kênh làm cùng lúc |
| Bước 3 chỉ chừa chỗ (lưu giờ nhắc), gửi làm sau | Nhỏ nhất |

Chủ dự án: "Còn, mình chính là test user". Câu "app hoàn chỉnh có gồm Flutter không" để sau.

## D14 — Phần lõi do chủ dự án tự viết

Ứng viên đưa ra (không xếp thứ tự): thuật toán lịch ôn; chọn danh sách "hôm nay"; lên lịch nhắc học; chuỗi tra nghĩa và thêm nhanh.
Cách chia test: chủ dự án viết cả hai; Claude viết test trước; chủ dự án viết code, Claude viết test sau; chủ dự án viết unit, Claude e2e.

✅ Chủ dự án: "Claude handle hết, mình chỉ review hiện trạng" → Bước 3 không có phần lõi tự viết (trái luật CLAUDE.md, lệnh trực tiếp
thắng). Cách hỏi "chủ dự án trả lời trước" vẫn giữ. Claude đề xuất **bảng ví dụ hành vi lịch ôn** để chủ dự án duyệt hành vi thay
vì đọc code (design mục 6.4).

## D15 — App người học đặt ở đâu

| Vòng | Phương án | Trade-off | Kết quả |
|---|---|---|---|
| 1 | App mới Vite + React; app mới + package dùng chung; gộp `apps/web`; gộp `apps/admin` | (đã trình bày từng dòng) | Chủ dự án: gộp `apps/web` |
| 2 | Claude nghiêng về app riêng; gộp `apps/web` được nếu (1) trang người học chạy ở trình duyệt, (2) chặn trên production tới Deploy | Gộp: một bộ i18n, CI, deploy; mất lợi thế server render, phát hành chung với landing, Next ghim 16.3.8, build Worker trên Windows trong Docker | Chủ dự án hỏi "chạy ở trình duyệt là sao"; Claude giải thích bằng mô phỏng |
| 3 | Chủ dự án nhớ mình đã chọn L8 (`app.`), nhờ xem OptiSigns (Chrome): `www.` Webflow, `app.` React, API riêng | Câu 1: chung domain (`wordmet.com/app`) hay tách (`app.wordmet.com`); câu 2: một hay hai codebase. Chi phí tách: không tăng tiền host (Workers Free 100 Worker, file tĩnh miễn phí), tăng công sức | ✅ Chung domain, không dùng `app.` nữa (đổi L8); ✅ một codebase (`apps/web`) |

Kèm theo (chủ dự án đồng ý): landing không có script bên thứ ba + CSP cho cả domain; app nằm dưới một đường dẫn chung. Duyệt cùng
Phần 1: trang người học chạy ở trình duyệt; chặn trên production tới Deploy; phần phiên chép từ admin.

## D16 — Ai đổi mức của từ

| Vòng | Nội dung |
|---|---|
| 1 | Claude hỏi luật lên xuống (N8). Chủ dự án: đã chốt ở phần "trigger thêm vào ôn tập" thay vì tự động tăng giảm; Claude đọc lại phiên 15/10 |
| 2 | Claude hiểu là "người học bấm để nói quên hay nhầm"; chủ dự án sửa: không phải quên hay nhầm; người học chỉ cần bấm "cần ôn tập"; việc đưa từ về mức nào là nhu cầu của người dùng; hệ thống không tự tăng giảm, chỉ nhắc kiểu "Cần ôn tập, đưa vào danh sách ưu tiên" |
| 3 | Nút đó làm gì (mô phỏng bấm được): A về mức 1 và lên đầu "hôm nay"; B giữ mức, lên đầu; C người học tự chọn mức → ✅ A |

Hệ quả (chủ dự án xác nhận): đổi K22; hướng "quên khác nhầm" không còn cần; F40 không phải đổi. Claude ghi rủi ro: người học bỏ qua
gợi ý thì từ sai có thể 14–30 ngày sau mới quay lại; nhật ký đếm số lần gợi ý được bấm.

## D17 — Trạng thái của từ

Chủ dự án: thêm vào nhóm và gặp từ đó thì coi như đã học, không cần nút "Chưa học"; mặc định mức 0; mức 1 trở đi là nấc ôn.
Claude gom thành mô hình mức 0–5 + cờ ưu tiên, flashcard 2 nút, lọc theo đến hạn/ưu tiên/mới/tất cả; nhật ký ghi mỗi lần bấm. Đổi
LR4 (ba trạng thái) và F20 (lọc phiên theo trạng thái). K13 (một trạng thái mỗi người mỗi nghĩa, dùng chung mọi nhóm) và K14 (nhật
ký chỉ thêm) giữ nguyên; bản nháp đầu của file này ghi nhầm là đổi cả hai, sửa khi tự rà 17/10. Claude đề nghị giữ "Bỏ khỏi việc học" (LR2) cho từ đã biết chắc; ✅ chủ dự án "ok".

## D18 — Cách lên lịch

Chủ dự án hỏi FSRS là gì, dùng ngay được không, và nhờ tham khảo FlipLab (Claude xem trang công khai rồi xem bằng tài khoản chủ dự
án: màn lật thẻ 2 nút "Chưa biết/Đã biết", changelog 06/2026 dùng FSRS).

| Phương án | Trade-off |
|---|---|
| Thang cố định | Dễ hiểu, dễ test; mọi từ cùng nhịp |
| FSRS ngay từ Bước 3 (`ts-fsrs` 5.4.2, MIT) | Nhịp riêng từng từ, tự xử lý ôn sớm/trễ; khó giải thích; đổi K21 |
| ✅ Thang cố định bây giờ, nhật ký đủ để chuyển FSRS sau (K21) | Đơn giản trước; chuyển dữ liệu một lần về sau |

Chủ dự án: "FSRS nên có thêm dữ liệu để phân tích, sau đó cần thì áp dụng". Thang 1/3/7/14/30: chủ dự án "ok" khi duyệt mô phỏng.
Claude thêm: nhật ký ghi theo dạng FSRS cần (đề xuất).

## D19 — Ôn sớm

Claude giải thích ví dụ `deploy` mức 3 hẹn 12/11, ôn ngày 8/11. ✅ Giữ nguyên mức và ngày hẹn (chủ dự án "ok"). Phương án đã nêu: không
đổi; nếu chọn FSRS thì câu này tự hết.

## D20 — Ôn theo gì

Chủ dự án hỏi "learner học theo deck flashcard đúng không".

| Phương án | Trade-off |
|---|---|
| Hai lối vào: "hôm nay" chung + mở từng nhóm (spec LR7, LR8) | Linh hoạt; hai chỗ |
| ✅ Chỉ theo nhóm | Người học biết rõ chủ đề đang ôn (lý do của chủ dự án) |
| Chỉ "hôm nay" chung | Gọn; nhóm chỉ để sắp xếp |

Claude đề xuất (chủ dự án "ok"): màn chính là danh sách nhóm kèm số cần ôn; lịch vẫn theo từng từ (K13 giữ); trần và danh sách cân
nhắc theo nhóm.

## D21 — Trần mỗi ngày

| Dòng | Spec (`ASSUMPTION`) | Trả lời |
|---|---|---|
| Từ mới | 10 | ✅ 20 (chủ dự án) |
| Từ ôn | 50 | Chủ dự án: không giới hạn, hoặc 50–100 → Claude đề xuất 100 → ✅ (duyệt cùng mô hình theo nhóm) |
| Ưu tiên có tính vào trần | chưa có | Claude giải thích ví dụ; chủ dự án nêu ý danh sách cân nhắc (D22); Claude đề xuất "không tính" → ✅ "cũng được, mình chưa có idea gì khác" |

## D22 — Từ tồn đọng sau thời gian dài

Ý của chủ dự án: nếu dồn quá nhiều (ví dụ 2 tháng không vào app) thì đưa từ cũ vào một danh sách để người học cân nhắc xóa hoặc giữ
học lại, không dùng để ôn nữa; mời Claude đề xuất hướng khác. Claude đề xuất chi tiết (✅ "ok"): xét theo từng từ quá hạn > 60 ngày;
không vào danh sách cần ôn, không tính trần; "Học lại" về mức 0 (tính như từ mới); "Bỏ khỏi việc học"; "Để đó"; báo trên trang chủ;
không bao giờ tự xóa.

Vòng 2 (17/10, Claude hỏi khi tự rà design): từ mức 0 (đã thêm, chưa ôn lần nào) có ngày hẹn là ngày thêm, nên thêm cả loạt 2.000 từ
với trần 20 từ mới/ngày thì từ ngày 61 các từ chưa gặp bị tính "quá hạn > 60 ngày". Hỏi: chúng có vào danh sách cân nhắc không.
✅ Chủ dự án: "mức 0 là chưa học" → **không**. Claude đồng ý: danh sách cân nhắc dành cho từ đã học rồi bị bỏ lâu; từ chưa học thì
không có gì để quên, cứ chờ tới lượt theo trần từ mới.

## D23 — Giới hạn và độ dài

| Dòng | Spec (`ASSUMPTION`) | Trả lời |
|---|---|---|
| Số nhóm mỗi người; từ mỗi nhóm | 100; 2.000 | Đưa vào subscription (Bước 5), lưu memory |
| Từ riêng mỗi người | 1.000 | Đưa vào subscription |
| Độ dài tên nhóm; từ; nghĩa | 60; 100; 300 | ✅ Giữ |
| Câu ngữ cảnh | 300 ký tự; 5 câu | ✅ Giữ, **tính theo từng nghĩa** |

Claude đề xuất: Bước 3 dùng các số trên làm hằng số đặt một chỗ để Bước 5 đổi thành hạn mức. Đổi F34.

## D24 — Ai chỉnh con số và nội dung thông báo

Chủ dự án hỏi: để admin quản lý được không (số email cho user, nội dung email, trần từ ôn và từ mới), có giao diện quản lý thông báo
và giới hạn. Claude đồng ý, đề xuất phạm vi (quyền `settings.manage` chỉ `admin`; các con số có khoảng cho phép đặt cứng; lịch sử đổi;
email chữ thường, xem trước, gửi thử; dòng tắt nhắc luôn có; email nhắc dừng ở 80% hạn mức tổng; chưa chỉnh theo từng người).
✅ Chủ dự án chốt phạm vi; **mẫu email theo từng loại thông báo bàn sau**. Claude đề xuất tạm một mẫu "nhắc học" viết sẵn trong code.

Hạn mức email (chủ dự án hỏi "áp dụng cho learner?"): là tổng của cả hệ thống (`MAIL_DAILY_BUDGET`), không phải từng người; ✅ "ok".

## D25 — Người học tắt nhắc ở đâu

Chủ dự án: tắt trong app. Claude dẫn quy định gửi email của Gmail (bên gửi > 5.000 email/ngày phải có hủy một chạm; mọi bên gửi giữ
tỉ lệ báo spam < 0,30%) và đề xuất thêm link trong email mở thẳng trang Cài đặt, vì email nhắc và OTP cùng địa chỉ gửi. ✅ "ok".
Giờ gửi: admin đặt, người học chưa tự chọn (đề xuất).

## D26 — Người lâu không vào app

Chủ dự án: gửi kiểu "đã lâu rồi không vào học", chỉnh được trong admin. Claude đề xuất 3 nấc (< 7 ngày nhắc thường; 7–60 ngày "lâu
rồi" mỗi tuần; > 60 ngày dừng). ✅ "ok".

## D27 — Khi nào gửi

Claude đề xuất chỉ gửi khi người học có ít nhất một từ cần ôn hoặc từ mới. ✅ "ok".

## D28 — Thêm nhanh

| Dòng | Spec (`ASSUMPTION`) | Trả lời |
|---|---|---|
| Từ vào nhóm nào | Chọn nhóm lúc thêm, mặc định "Mới thêm" | ✅ Chốt (sau mô phỏng so 2 cách) |
| Gõ dạng chia | Coi là từ mới | Chủ dự án: hệ thống phải cung cấp (D29) |
| Form tự nhập | Chỉ bắt buộc nghĩa | ✅ ok |
| Từ đã đang học | Không tạo trùng, lưu thêm câu | ✅ ok |

## D29 — Dạng chia

| Vòng | Nội dung | Kết quả |
|---|---|---|
| 1 | Chủ dự án: hệ thống phải cung cấp; có `go` thì phải có `went`, `gone`; người dùng không tự chia | Chuyển CR16 vào Bước 3 |
| 2 | Nguồn: thư viện tự tính (`compromise` 14.18.0, MIT); soạn sẵn qua cột `accepted_forms`; kết hợp; bộ dữ liệu có sẵn (AGID chưa kiểm giấy phép; Wiktionary CC BY-SA). Loại từ: chỉ động từ / cả danh từ và tính từ | ✅ Kết hợp; ✅ cả 3 loại |
| 3 | Chủ dự án hỏi "chia để làm gì"; Claude liệt kê 4 chỗ dùng (tra khi thêm nhanh; hiện trên thẻ; chấm bài; câu điền từ) | ✅ Chỉ dùng cho tra và hiện; chấm bài và câu điền từ theo hướng "expected answer" làm sau; **các từ đã chia là từ độc lập**, không phải nhánh của từ gốc |
| 4 | Claude diễn giải "độc lập" thành nghĩa suy từ gốc; chủ dự án bác: dạng chia có nhiều nghĩa riêng (ví dụ `gone`), nên đứng độc lập và chỉ tham chiếu về gốc; từ gốc chỉ giải nghĩa chính nó | Claude đánh giá (theo yêu cầu): mạnh (đúng ngôn ngữ, mô hình đơn giản, từ gốc không bị kéo theo); yếu (thêm việc soạn, thiếu level, mất bảng V1–V2–V3, ba lịch ôn riêng, thư viện có thể sai). Chủ dự án nhờ xem Cambridge (Chrome): `went`, `mice` là mục riêng; `gone` nhiều mục, chỉ nghĩa động từ trỏ về `go`; trang `go` có dòng "going · went · gone" |
| 5 | Ba chỉnh sửa của Claude | ✅ Link đặt ở từng nghĩa; ✅ level mặc định lấy theo từ gốc; ✅ trang từ gốc **có** dòng dạng chia (khác ý ban đầu "từ gốc không liên quan"), hiện cho **mọi từ** (Claude đề xuất chỉ từ bất quy tắc; chủ dự án chọn mọi từ) |

## D30 — Trang từ

Chủ dự án hỏi hành vi khi tra trên catalog (có phải flashcard); Claude mô tả trang từ. Chủ dự án đề xuất làm như Cambridge (một trang
cho chữ, nhiều nghĩa). ✅ Một trang mỗi chữ, chia theo loại từ, nút thêm ở từng nghĩa; kết quả tìm kiếm mỗi dòng một chữ; cần API đọc mới.

## D31 — Tra từ và thêm nhanh

Mô phỏng bấm được so hai cách: một ô chung (gõ là tìm, không có thì tự nhập; ô câu hiện khi thêm) / hai chỗ riêng (trang "Tra từ" không
có ô câu; nút "Thêm nhanh" có ô câu). ✅ Hai chỗ riêng. Claude thêm: nút "Thêm câu đã gặp" trên từ đang học (đề xuất).

## D32 — Sáu hành vi nhỏ

| Hành vi | Spec / đề xuất | Trả lời |
|---|---|---|
| Ôn sớm | Không đổi | ✅ (D19) |
| Dòng dạng chia | Chỉ bất quy tắc (Claude) | Mọi từ (D29) |
| Nghĩa bị staff thay hoặc gỡ | Nhãn "nghĩa đã đổi", không vào danh sách cần ôn, người học bỏ được, không chuyển tiến độ | ✅ tạm thời, chủ dự án chưa có hướng khác |
| Thêm cả loạt theo bộ lọc | Có; bỏ qua từ chức năng (K11) | ✅ (sau khi Claude giải thích) |
| Xóa từ riêng | Xóa nghĩa, câu, việc học, vị trí trong nhóm | ✅ |
| Lần đầu vào app | Bắt buộc chọn ngôn ngữ; múi giờ: Claude đề xuất lấy theo trình duyệt | Chủ dự án: chỉ chọn ngôn ngữ, múi giờ tự theo vị trí → Claude đề xuất lấy theo cài đặt thiết bị (không xin quyền vị trí), tự cập nhật → ✅. 17/10: **không hiện múi giờ trên giao diện** vì người dùng không chỉnh được |

## D33 — Xóa nhóm

Bối cảnh: ôn theo nhóm nên từ không còn ở nhóm nào sẽ không bao giờ hiện ra để ôn.

| Phương án | Trade-off |
|---|---|
| Tự chuyển vào "Mới thêm" | Không mất gì; "Mới thêm" phình |
| ✅ Bỏ khỏi việc học (mất mức, giữ nhật ký) | Đúng chủ đích người xóa |
| Hỏi người học lúc xóa | Linh hoạt; thêm một bước |

Chủ dự án: chủ đích xóa thì xóa luôn, cảnh báo rằng các từ bên trong sẽ bị xóa khỏi mục ôn tập, "chỗ này kỹ chút". Claude chi tiết: chỉ bỏ
từ không còn ở nhóm khác; nút ghi số từ; cảnh báo cả khi bỏ từ khỏi nhóm cuối; từ riêng không bị xóa theo. ✅ "ok".

## D34 — Xuất "từ chưa có nghĩa"

Bối cảnh: xuất CSV chỉ liệt kê sense, nên sau CEFR-J xuất rỗng; soạn 8.812 từ cần biết từ nào còn thiếu. ✅ Đưa vào Bước 3 (chủ dự án:
"Có"). Claude đề xuất milestone đầu vì soạn nội dung chạy song song.

## D35 — Một từ ở hai nhóm tính vào trần nào

| Phương án | Trade-off |
|---|---|
| ✅ Chỉ nhóm nơi ôn | Nhóm khác vẫn đưa ra đủ trần |
| Mọi nhóm chứa từ đó | Nhóm chưa mở cũng bớt chỗ |

## D36 — Người chưa xác minh email

Bối cảnh: K7 cho dùng Free khi chưa xác minh; email gõ sai thì người lạ nhận nhắc mỗi ngày. Chủ dự án: nhắc trong giao diện app, không
gửi email liên tục. Claude cụ thể hóa (✅ "ok"): không gửi email nhắc; trang chủ và Cài đặt hiện "Xác minh email để nhận nhắc học qua
email" kèm nút gửi lại mã.

## D37 — Worker chết khi đang gửi email

| Vòng | Nội dung |
|---|---|
| 1 | Claude hỏi: ghi "đã gửi" trước (có thể mất email) hay sau (có thể trùng) |
| 2 | Chủ dự án hỏi "là gửi xong rồi worker chết?" → Claude vẽ thứ tự hai cách |
| 3 | Chủ dự án hỏi giải quyết bằng queue được không. Claude đọc docs BullMQ 6: job mất khóa ("stalled") bị đưa về hàng chờ để chạy lại, nên queue là "không mất, có thể trùng"; `jobId` trùng thì job bị bỏ qua. Đề xuất queue + chấp nhận cách B |
| 4 | Chủ dự án hỏi kiểm hàng đợi trước khi gửi lần 2 được không. Claude: chỉ máy chủ email biết đã nhận chưa; đề xuất 3 trạng thái (đang gửi → gửi → đã gửi), còn đúng một trường hợp không biết (thấy "đang gửi") và hỏi bỏ qua hay gửi lại |
| 5 | Chủ dự án "ok" (đồng ý cơ chế, không chọn); Claude đề xuất **bỏ qua** (mất một email ít hại hơn trùng email, vì trùng dễ bị báo spam và email nhắc dùng chung địa chỉ với OTP) |

## D38 — Cách làm giao diện

Phương án đưa ra: Figma trước như Bước 2.5; code thẳng bằng token có sẵn; Figma cho vài màn quan trọng. ✅ Chủ dự án: Claude đọc context
project và giao diện landing, admin để làm **mockup HTML trước**, chủ dự án chốt style rồi mới thiết kế Figma. Mobile-first: ✅ (đề xuất
của Claude). Sau 3 bản mockup (v1 hai style; v2 theo Apple HIG, Material 3, NN/g; v3 bằng skill frontend-design; v3.1 sửa theo
`assessment-ui.md`) và bản web, chủ dự án tách phần giao diện ra làm riêng; Phần 4 (milestone) làm sau khi giao diện xong. Chi tiết và câu
hỏi còn mở: `../../mockups/2026-10-16/UI-CONTEXT.md`.

## D39 — Đường dẫn app người học

Bối cảnh (G1 của plan, 17/10): landing dùng layout gốc `src/app/[locale]/layout.tsx`, và `src/proxy.ts` đưa mọi đường dẫn qua
next-intl. Next 16 cho phép thêm một layout gốc thứ hai; chuyển giữa hai layout gốc là tải lại cả trang.

| Phương án | Trade-off (như đã trình bày, không ưu tiên bên nào) |
|---|---|
| Một đường dẫn `/app/...`, ngôn ngữ lấy từ hồ sơ | Mỗi màn một URL; cần layout gốc thứ hai và cho proxy bỏ qua `/app` |
| ✅ Dưới tiền tố ngôn ngữ `/vi/app/...`, `/en/app/...` | Khớp cách landing đang làm; ngôn ngữ nằm trên URL |

Chủ dự án chọn phương án 2 ("như này"). Claude đồng ý và đề xuất thêm (**chờ duyệt**): tiền tố luôn theo `native_language` của hồ
sơ; mở sai tiền tố thì app chuyển sang đúng tiền tố; link trong email nhắc là `<LEARNER_APP_URL>/<native_language>/app/settings`
(`vi` khi hồ sơ chưa có). Lý do: một lựa chọn ngôn ngữ duy nhất (D32), tránh trường hợp giao diện một thứ tiếng mà nghĩa một thứ tiếng.

## D40 — Sáng/Tối lưu ở đâu

Bối cảnh: phiên giao diện chốt 17/10 có dark mode trong Bước 3, mặc định theo hệ điều hành, Cài đặt có Sáng / Tối / Theo hệ thống.

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| ✅ Lưu trên từng thiết bị | Không đổi API; mỗi máy một lựa chọn |
| Lưu trên tài khoản | Mọi máy cùng lựa chọn; thêm một trường hồ sơ và một thay đổi API ở Identity |

Chủ dự án trả lời "dựa vào system của learner". Claude hiểu là: theo hệ thống của máy, lưu trên thiết bị (**chờ xác nhận**; nếu ý là
bỏ luôn lựa chọn trong Cài đặt thì đó là việc của plan giao diện). Phần hệ thống không có task nào cho mục này.

## D41 — Plan và người implement

Chủ dự án yêu cầu (17/10): viết implementation plan ngay (trước khi phần giao diện xong); sau đó **plan chỉ gồm phần hệ thống**, giao
diện tách ra plan riêng làm ở phiên khác sau khi chốt plan hệ thống; implement ở **một phiên khác, không dùng Codex**; Claude kiểm các
phần làm song song được (plan, mục "Parallel tracks"). Không có phương án nào được đưa ra trước các yêu cầu này.

## D42 — Trang từ có gộp chữ hoa và chữ thường không

Bối cảnh (review 17/10, câu Q2): catalog có hai mục riêng `March` (danh từ, tháng) và `march` (động từ) (B2#8); design "một trang mỗi
chữ" chưa nói rõ chữ hoa thường.

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| Gộp | Một trang hiện cả hai |
| ✅ Tách | Hai trang riêng |

Chủ dự án: "tách riêng ra đi". Claude đồng ý và nói rõ cách làm: danh sách kết quả mỗi dòng một chữ đúng hoa thường; trang từ khớp
đúng chữ; tìm kiếm (B2#57) và tra cho thêm nhanh vẫn không phân biệt hoa thường, nên gõ `march` ra cả hai dòng để người học chọn.

## D43 — Có nhóm mặc định "Mới thêm" không

Bối cảnh (review 17/10, câu Q1): plan tự thêm luật "không đổi tên nhóm Mới thêm"; Claude hỏi lại, chủ dự án hỏi ngược "có cần thiết
phải có nhóm mới thêm này không". Claude nêu ba việc nhóm này đang làm (thêm nhanh không phải chọn nhóm, người mới lưu được từ đầu
tiên, đỡ một bước khi có nhiều nhóm) và các hướng, không nghiêng bên nào:

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| Giữ "Mới thêm" | Như design cũ; phải quyết thêm chuyện đổi tên; luôn nằm trong danh sách nhóm |
| ✅ Bỏ hẳn | Lần nào lưu cũng chọn hoặc tạo nhóm; lần đầu app mời tạo nhóm; hệ thống gọn hơn (không `is_default`, không luật "không xóa được"); API thêm từ bắt buộc `group_id`; đổi D28 |
| Bỏ nhóm cố định, app chọn sẵn nhóm dùng gần nhất | Hệ thống như "bỏ hẳn"; phần chọn sẵn do giao diện; gần cách C của câu chọn nhóm bên phiên UI |

Chủ dự án: bỏ, "khi thêm từ thì user sẽ tự thêm nhóm tại vì dù gì cũng học theo nhóm, không học đơn lẻ". Claude đồng ý, không thêm gì:
người chưa có nhóm tạo nhóm (`POST /v1/groups`) rồi mới lưu từ; một nhóm rỗng còn lại nếu bước sau lỗi là vô hại. Việc giao diện có
chọn sẵn nhóm dùng gần nhất hay không thuộc plan giao diện.

## D44 — Giới hạn số email nhắc

Bối cảnh (G2 của plan, phát hiện khi tự rà 17/10): admin đặt "mỗi người tối đa N email nhắc mỗi tuần" nhưng chưa nói "tuần" tính
thế nào. Email chỉ gửi vào tối người học chưa ôn xong, nên cách tính chỉ ảnh hưởng người đang bỏ học. Claude giải thích bằng lịch ví
dụ (Lan bỏ học từ thứ Năm), không nghiêng bên nào:

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| Tuần lịch, thứ Hai đếm lại | Quanh thứ Hai có thể 6 email trong 6 ngày liền |
| Không quá N email trong 7 ngày gần nhất | Không bao giờ quá N trong 7 ngày bất kỳ; email dồn vào mấy ngày liền rồi im |
| ✅ Hai email cách nhau ít nhất N ngày | Rải đều; admin chỉnh "cách mấy ngày" thay cho "mấy email mỗi tuần" |

Chủ dự án: "cách 3 đi, hoặc cái này có thể tùy biến trong admin page". Claude đồng ý cách 3 và đề xuất phần "tùy biến" là cho admin
chỉnh **khoảng cách** (1–7 ngày, mặc định 2), không làm công tắc chọn giữa ba cách đếm (phải viết và test cả ba, mà một con số đã đủ
chỉnh thưa hay dày); email "lâu rồi" giữ một lần mỗi 7 ngày (D26). ✅ Chủ dự án chốt: "admin chỉnh khoảng cách tối thiểu 1–7 ngày, mặc
định 2". Hệ quả: khóa `reminders.weeklyMax` (0–7, mặc định 3) của Task 9 đã merge đổi thành `reminders.minGapDays` (1–7, mặc định 2)
trong Task 21; chưa có dữ liệu thật nên không phải chuyển dữ liệu.

## D45 — "Xong khi" của Bước 3

Bối cảnh (G5 của plan): các bước trước dùng "CI xanh kể cả test trên hệ thống thật + một lần chạy tay trên database mới với file CEFR-J
thật". Claude liệt kê, không nghiêng bên nào: CI xanh trên mọi PR; chạy tay phần hệ thống (kịch bản Task 22); test app người học trên hệ
thống thật (plan giao diện); chủ dự án tự dùng app một số ngày. Chủ dự án: "mình sẽ báo cho bạn đến khi bước 3 xong" — không chốt danh
sách trước; chủ dự án tự quyết lúc nào là xong. Task 22 vẫn chạy gate, chạy tay và viết as-built để chủ dự án dựa vào đó.

## D46 — Nguồn dạng chia tự sinh

Bối cảnh (G6 của plan): Task 4 đo `compromise@14.18.0` không đạt ngưỡng (47/50 ca bất quy tắc, ~81/100 mẫu CEFR-J). Luồng A dừng và
liệt kê hướng; Claude chuyển cho chủ dự án, không nghiêng bên nào. Chủ dự án yêu cầu nghiên cứu thêm (kết quả:
`../../preparation/2026-10-17-inflection-sources-research.md`, gồm cả cách các app khác ghi nguồn), rồi yêu cầu Claude đề xuất vì việc
này "không đụng gì tới logic".

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| `compromise` chỉ cho động từ, danh từ + danh sách bất quy tắc viết tay (hoặc RosaeNLG, WordNet) | Bỏ được lỗi tính từ; danh sách phải có người giữ; RosaeNLG không có tính từ |
| ✅ AGID làm nguồn chính, `compromise` dự phòng cho động từ, danh từ | Bảng tra có cả tính từ, chỉ ghi -er/-est khi từ thật sự có; giấy phép thoáng (chỉ giữ thông báo, như Firefox dùng SCOWL); ngừng cập nhật từ 2016; phải viết bộ đọc và đóng gói |
| `en-inflectors` (MIT) | Tính từ theo số âm tiết; cập nhật cuối 2022; chưa đo |
| Wiktionary, UniMorph (CC BY-SA) | Phủ rộng; phải chia sẻ lại phần sửa cùng giấy phép; dữ liệu lớn |
| Không tự sinh (chỉ bản đã duyệt qua CSV) | Không có lỗi; mọi từ phải soạn dạng chia; từ riêng không có dạng chia |
| Hạ ngưỡng, giữ `compromise` | Không tốn công; người học thấy dạng sai |

Claude đề xuất AGID + `compromise` dự phòng, tính từ ngoài AGID không tự sinh (thiếu còn hơn sai vì người học nhìn thấy), đo trước theo
ngưỡng cũ, không đạt thì đo `en-inflectors`. ✅ Chủ dự án: "Đồng ý G6: AGID làm nguồn chính, compromise dự phòng chỉ cho động từ và
danh từ, đo trước theo ngưỡng cũ."

Vòng 2 (17/10, luồng A đo): AGID đạt ngưỡng (50/50; 99/100 theo cách chấm hiện tại, ~92/100 nếu tính số nhiều của danh từ không đếm
được như "musics", "softwares" là sai). Nhưng khi chấm tay toàn bộ 419 tính từ CEFR-J có dạng so sánh trong AGID, khoảng 95 (~23%) sai
rõ ("beautifuler", "carefuller", "possibler"); mẫu 100 dòng chỉ trúng ~8 tính từ nên không lộ. Luồng A liệt kê ba hướng: (1) tính từ
không có bộ library; (2) chỉ giữ dạng AGID cho tính từ ngắn theo luật hình thái + danh sách bất quy tắc nhỏ; (3) giữ nguyên. Chủ dự án đã
giao phần chọn nguồn cho Claude; Claude chọn **(2) có đo trên 419 dòng đã chấm (≥ 95% dạng còn hiện là đúng), không đạt thì (1)**,
theo nguyên tắc "thiếu còn hơn sai" của chính D46. Số nhiều của danh từ không đếm được: hỏi chủ dự án có thêm `pluralize` (MIT) để lọc
không (thêm dependency phải hỏi).

Kết quả đo luật (2) trên 419 dòng (đáp án do luồng A chấm, 112 dòng sai, chưa ai soát lại): còn 302 tính từ có dạng so sánh, 24 sai lọt
qua (đúng 92,1% < 95%; phần lớn là tính từ một âm tiết không so sánh được như "main", "real", "wrong", và lỗi đếm âm tiết với -ed như
"tired"), đồng thời bỏ mất 29 dạng đúng. **Không đạt → áp dụng (1): tính từ không có bộ library**, chỉ dạng đã duyệt qua cột CSV
`inflections`. Bộ 50 ca đổi thành 40 ca động từ, danh từ đúng + 10 ca tính từ ra rỗng.

## D47 — Số nhiều của danh từ không đếm được

Bối cảnh: khi đo AGID (D46), bộ library có cả số nhiều của danh từ không đếm được ("musics", "softwares", "porks", "carelessnesses");
người học thấy chúng trên trang từ cho tới khi bản duyệt CSV sửa. Thêm thư viện mới phải hỏi chủ dự án (plan, Global Constraints).

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| ✅ Thêm `pluralize` 8.0.0 (MIT), dùng danh sách danh từ không đếm được của nó | Ít công; bỏ được music, software, information, advice…; không đầy đủ (pork, catering, carelessness vẫn lọt) |
| Không thêm | Dạng sai còn hiện cho tới khi bản duyệt CSV sửa từng từ |

Chủ dự án hỏi lại cho rõ, Claude giải thích bằng ví dụ và đề xuất thêm; chủ dự án: "ok thêm". Chỉ lọc bộ library; bộ đã duyệt qua CSV
không bị lọc.

## D48 — Từ ưu tiên bị bỏ lâu

Bối cảnh (review độc lập 17/10, mục L1): design 6.1 nói từ quá hạn hơn N ngày "không vào danh sách cần ôn", còn 6.2 nói phần ưu tiên
gồm "mọi mục priority = true". Một từ đã bấm "Cần ôn tập" rồi bị bỏ hơn 60 ngày nên đang hiện ở cả hai chỗ. Claude hỏi, không nghiêng
bên nào:

| Phương án | Trade-off (như đã trình bày) |
|---|---|
| Giữ ở phần ưu tiên, không vào danh sách cân nhắc | Từ người học từng đánh dấu luôn đứng đầu |
| ✅ Chuyển sang danh sách cân nhắc, rời phần ưu tiên | Giống mọi từ bị bỏ lâu khác: học lại, bỏ, hoặc để đó |

Chủ dự án chọn phương án 2. Claude đồng ý: danh sách cân nhắc dành cho từ bị bỏ lâu, nên cờ ưu tiên cũ không đổi luật đó. "Học lại" bỏ
cờ ưu tiên; "để đó" giữ nguyên.

## Quyết định của điều phối sau review độc lập (17/10)

Review độc lập (`../reviews/2026-10-17-buoc-3-code-review.md`) có các chỗ cần chọn một trong hai cách sửa. Các chỗ không đổi hành vi
sản phẩm, hoặc chỉ làm cho code khớp design hay luật đã chốt, do điều phối quyết rồi báo chủ dự án:

| Mục | Chọn | Vì sao |
|---|---|---|
| M1 câu ngữ cảnh còn trong `idempotency_keys` | Cả hai: route thêm câu chỉ trả `{ id, created_at }`; thêm job dọn `idempotency_keys` cũ hơn 24 giờ | Design 7.4, CR23: câu bị xóa cùng từ riêng; plan giao diện chưa viết nên đổi response không vỡ gì |
| M3 ghi "không có dạng chia" | Ô `-`, lưu bền ở entry; import và backfill bỏ qua | Giống ô `form_of`; D47 nói số nhiều sai sẽ được CSV sửa, nên phải ghi được bộ rỗng |
| M6 "lần cuối thấy" | Thêm cột `users.last_seen_at` | Giá trị cũ mất khi dọn phiên; dòng "không thêm chỗ ghi mới" của design §4 là đề xuất của Claude nên được sửa |
| M7 lỗi SMTP vĩnh viễn | Không thử lại; dòng `failed` tính vào trần email "lâu rồi", không tính vào `min_gap_days` | Một địa chỉ hỏng không tốn suất mỗi ngày; email thường vẫn được thử lại hôm sau |
| M8 tra dạng chia khi từ gốc chưa có nghĩa | Trả từ gốc catalog (không nghĩa) | Design B3E14 đã yêu cầu; code lệch design |
| M9 lỗi SMTP mơ hồ | Coi là "không rõ", giữ `sending`, không thử lại | Luật D37 "mất một email còn hơn gửi trùng"; design 8.3 được sửa cho khớp |
| L2 trả lời từ cân nhắc ở "học tất cả" | Ghi `section = backlog`, không tính trần | Design 6.1 "cân nhắc không tính trần" |
| L8 revert batch không hoàn tác dạng chia | Chấp nhận ở Bước 3, báo cáo revert ghi rõ | Sau khi sửa H1, upload lại file cũ đã khôi phục được dạng chia |

## Những chỗ Claude đã đề xuất trước khi chủ dự án trả lời (luật owner-first)

Ghi theo yêu cầu của chủ dự án (16/10/2026, sau khi cập nhật context):
1. **Danh sách những thứ chỉ kiểm được khi deploy** (D4): Claude tự nêu kèm đề xuất; sau đó hỏi lại đúng luật.
2. **Kênh nhắc ở Bước 3** (D9): Claude gắn "(đề xuất)" cho "web push + email" trước khi chủ dự án chọn; trước đó còn đề xuất nhắc tay. Chủ
   dự án chọn khác. Không hỏi lại (chủ dự án chỉ yêu cầu hỏi lại chỗ 3).
3. **Hình dạng cổng notification** (D10): Claude đề xuất trước; **chủ dự án yêu cầu hỏi lại**, đã hỏi lại đúng luật.

Ngoài ra, hai việc kèm Q-B (lô thử 20 từ; soạn nội dung không phải code) là Claude thêm sau khi chủ dự án trả lời: đúng luật nhưng là ý
của Claude. Trong lúc làm, Claude cũng nói quá một lần: tin nhắn giới thiệu v3 ghi "bấm vào ngăn thì lọc danh sách" khi mockup chưa làm
(phát hiện qua `assessment-ui.md`, đã sửa ở v3.1).

## Đề xuất kỹ thuật duyệt cùng design (không hỏi riêng)

| Chọn | Bỏ | Vì sao |
|---|---|---|
| Một BullMQ Job Scheduler mỗi 15 phút, chọn người theo giờ địa phương | Một lịch riêng cho từng người | Ít trạng thái trong Redis; múi giờ xử lý ở truy vấn |
| Chuyển `Mailer` và `MailBudget` sang `src/common/mail` | Để Notifications import từ Identity | Luật ranh giới D3 |
| Thêm nhanh và xóa từ riêng trong một transaction (`ContentService` nhận `tx`) | Bù trừ thủ công | Code Content đã hỗ trợ `tx` |
| "Vắng bao lâu" lấy từ `SessionChain.lastUsedAt` | Ghi thêm "lần mở app" | Cột đã cập nhật mỗi lần làm mới phiên |
| Nhật ký ghi `rating` kiểu FSRS và `days_since_last` | Chỉ ghi trạng thái | Chuyển FSRS sau không phải đổi cách lưu |
| Chặn `/app/*` trên production bằng biến cấu hình | Không chặn | `deploy-web.yml` deploy mỗi lần push `main` |
| Phần phiên và gọi API chép từ `apps/admin` | Tách package ngay | Tách khi hai bản lệch thật |
| Chọn thư viện dạng chia bằng phép đo trên CEFR-J | Chọn theo README | README chưa cho thấy đủ (so sánh tính từ chưa kiểm) |
