# Design — Bước 4: Practice (bài luyện không AI, chỉ API)

> **Trạng thái 18/10/2026: đã chốt toàn bộ.** Các quyết định được hỏi từng câu trong chat theo luật "chủ dự án trả lời trước, Claude đề
> xuất sau"; chủ dự án đọc lại mục 0 và xác nhận các chỗ còn lại ("ok", 18/10). Decision record:
> [`../decisions/2026-10-18-buoc-4-practice-decisions.md`](../decisions/2026-10-18-buoc-4-practice-decisions.md). Bước tiếp: plan (sau khi
> đọc lại code trên `dev`).
>
> **Cập nhật 18/10/2026, sau review độc lập** ([`../reviews/2026-10-18-buoc-4-design-review.md`](../reviews/2026-10-18-buoc-4-design-review.md)):
> design đã sửa theo review. R3, R4, R5 đã chốt (D34, D35, D36); các đề xuất kỹ thuật mới (nhãn "Đề xuất, đã duyệt 18/10") chủ dự án
> duyệt hết cùng ngày ("ok duyệt"). Không còn gì chờ trước khi viết plan. Danh sách ở mục 0, bảng "Sau review độc lập".

Ngày: 17–18/10/2026. Brainstorm qua `superpowers:brainstorming` trên nhánh `docs/buoc-4-design` (cắt từ `origin/dev` @ `c1f775d`).
Nhật ký từng vòng hỏi đáp, kèm phân tích trạng thái trước brainstorm: [`../reviews/2026-10-17-buoc-4-readiness.md`](../reviews/2026-10-17-buoc-4-readiness.md)
(mục 8). Design liên quan: [Bước 3](2026-10-16-buoc-3-learning-design.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = Claude đề xuất (đã duyệt cùng phần chứa nó, hoặc ghi rõ "chưa duyệt").
**ASSUMPTION** = con số hoặc giả định chưa kiểm chứng. Design doc là tài liệu chính thức để build; `docs/specs/` là khung ban đầu,
không sửa theo doc này (chủ dự án, 12/10/2026). Mã spec (PRC#, K#, F#…) chỉ để truy nguồn. Tiêu chí `B4#`, edge case `B4E#`.

## 0. Các lưu ý đã xử lý khi đọc lại (18/10/2026)

Bảng giữ lại để thấy những chỗ đã đổi sau bản nháp đầu. Mọi dòng đã được chủ dự án trả lời. Mỗi dòng trỏ tới mục chứa nó.

| # | Điểm | Vì sao cần xem | Mục |
|---|---|---|---|
| ⚠1 | **Đáp án nhiễu lấy trong các nhóm chứa từ đang hỏi (Chốt 18/10)** | Không lấy từ catalog chung; từ riêng cũng có trắc nghiệm; bỏ lọc loại từ và level. Thay cho đề xuất cũ "từ riêng chỉ có gõ từ" | 7.3, 7.4 |
| ⚠2 | **Bỏ cột `synonyms` (Chốt 18/10)** | Rủi ro còn lại: nhóm chứa hai từ đồng nghĩa mà nghĩa tiếng Việt khác chữ (`big` "to", `large` "lớn") vẫn có thể ra câu hai đáp án đúng; chặn bằng lọc nghĩa con và nút báo lỗi | 5.2, 7.4 |
| ⚠3 | **Trang tổng kết: một danh sách "Cần ôn tập" (Chốt 18/10)** | Không phân loại; mỗi từ có nút "Cần ôn tập", thêm nút "Đưa tất cả vào ưu tiên" | 7.8 |
| ⚠4 | **"Đã biết" chỉ hiện khi từ tới hạn hoặc ưu tiên (Chốt 18/10, tạm thời)** | Giữ D19; khi demo có vấn đề sẽ sửa | 7.8 |
| ⚠5 | **Mục 8–14 (Chốt 18/10)** | Mục 8–11 duyệt khi đọc lại; mục 12 kiểm quyền xác nhận "ok"; tải lại trang như Quizlet (B4E6–B4E8b) | 8–14 |
| ⚠6 | **Các con số: admin chỉnh được toàn bộ (Chốt 18/10)** | Trừ đáp án ≤ 100 ký tự và ghi chú ≤ 300 ký tự (cố định). Giá trị mặc định và khoảng cho phép ở mục 5.4 vẫn là `ASSUMPTION` | 5.4 |
| ⚠7 | **(Gộp vào ⚠2)** | Cột đồng nghĩa đã bỏ; rủi ro còn lại ghi ở ⚠2 | — |
| ⚠8 | **Cách làm việc (Chốt 18/10)** | Không viết code, chỉ review; giữ cách chủ dự án trả lời trước; khi cần Claude đề xuất, chủ dự án nói ngay trong câu đó | 2 |
| ⚠9 | **Bước 3 xong phần hệ thống (chủ dự án báo 18/10)** | As-built 18/10 (PR #44). Giao diện làm riêng, không theo plan cũ. Deploy dời về "khi toàn bộ app hoàn chỉnh, trước ra mắt" (D3 vòng 3). Trước khi viết plan Bước 4 vẫn đọc lại code trên `dev` | 1, 16 |
| ⚠10 | **Việc của nội dung, ngoài app (Chốt 18/10: thuộc Bước 4)** | Prompt soạn nội dung (D5) cần thêm: định nghĩa ≤ 200 ký tự kiểu từ điển cho người học; nghĩa tiếng Việt tách nghĩa con bằng dấu phẩy hoặc chấm phẩy. Nên có trước đợt soạn thử 20 từ | 7.4, 7.7 |
| ⚠11 | **Đề không hiện loại từ, ở mọi dạng (Chốt 18/10, đổi chốt trước)** | Rủi ro nhỏ: đề kiểu A gõ từ "triển khai" có thể bị gõ `deployment`; giảm bằng cách soạn nghĩa danh từ có "sự …" | 7.3 |
| ⚠12 | **Cách sắp xếp mặc định cho từng nguồn (Chốt 18/10)** | Bảng mặc định ở mục 7.1 | 7.1 |
| ⚠13 | **Hai kiểu đề: nghĩa (A) và câu ví dụ bỏ trống (B) (Chốt 18/10: thiết kế cả hai)** | Kiểu B không AI, dùng câu ví dụ catalog; chi tiết 7.4b là Đề xuất. Sau review: kiểu B chỉ cho gõ từ (D34, R3) | 7.3, 7.4b |
| ⚠14 | **Gõ sai: không hiện đáp án ngay; "Làm lại" và "Bỏ qua" (Chốt 18/10)** | Admin chỉnh số lần làm lại (trống = không giới hạn); làm lại mới đúng tính là đúng; Bỏ qua hiện đáp án kèm nút "Cần ôn tập". Chi tiết lưu dữ liệu và API là Đề xuất | 5.1, 6, 7.6, 7.8 |
| ⚠15 | **Câu sai không tự đưa vào "Cần ôn tập" (Chốt 18/10: giữ D16)** | Sai thì nút "Cần ôn tập" nổi bật để người học tự bấm; câu sai tự tính vào "từ hay sai". Đúng/sai xử lý như trắc nghiệm | 7.6, 7.8 |
| ⚠16 | **Kiểu đề chọn khi mở phiên: theo nghĩa / theo câu / trộn (Chốt 18/10: cách 3)** | Gõ từ cũng theo kiểu đề; đúng/sai luôn theo nghĩa; mặc định "trộn" | 7.3, 7.4b |

### Sau review độc lập (18/10/2026)

Mỗi dòng ứng với một hoặc vài phát hiện (#) của file review. **Chờ chủ dự án** = quyết định sản phẩm, hỏi theo luật "chủ dự án trả lời
trước". **Đề xuất, đã duyệt 18/10** = Claude đề xuất khi sửa theo review; chủ dự án đọc bản tóm tắt từng dòng và duyệt hết ("ok duyệt",
18/10). **Sửa** = chữ cũ, chỗ tự mâu thuẫn hoặc
chỗ sai so với code; không đổi quyết định nào.

| # | Điểm | Nhãn | Review | Mục |
|---|---|---|---|---|
| R1 | Giới hạn tần suất riêng cho các API trong lúc làm câu (`practice.answer`), vì `user.write` chỉ 30 lần/phút cho mọi thao tác ghi | Đề xuất, đã duyệt 18/10 | #1 | 6 |
| R2 | Xóa từ riêng: Learning khai báo một "cổng" (port), Practice cung cấp phần xóa, để không có vòng phụ thuộc; hàm ghi "Cần ôn tập"/"Đã biết" của Learning nhận transaction của Practice | Đề xuất, đã duyệt 18/10 | #2, #28 | 4, 11 |
| R3 | Trắc nghiệm kiểu B có thể ra câu có hai đáp án đúng, trái D6 → bỏ trắc nghiệm kiểu B ở Bước 4, giữ gõ từ kiểu B, trắc nghiệm theo câu để Bước 7 | **Chốt 18/10 (D34)** | #3 | 7.3, 7.4b |
| R4 | Bấm "Đã biết"/"Cần ôn tập" từ bài làm có tính vào trần mỗi ngày không → không tính; trần từ ôn mỗi nhóm cho phép để trống = không giới hạn (mặc định vẫn 100); trần từ mới giữ bắt buộc | **Chốt 18/10 (D35)** | #5 | 5.3, 5.4, 7.1 |
| R5 | Báo lỗi một câu có từ riêng của người học: staff sẽ thấy từ riêng → câu hỏi chính là từ riêng thì không có nút báo lỗi (`reportable = false`); câu từ catalog có đáp án nhiễu là từ riêng thì vẫn báo được, bản sao che từ riêng | **Chốt 18/10 (D36)** | #13, #24 | 6, 10, 11 |
| R6 | Ứng viên đáp án nhiễu: Learning trả các nghĩa cùng nhóm, Content trả nội dung, Practice lọc (đúng D3) | Sửa | #6 | 4 |
| R7 | Luật kiểu B: mọi chỗ khớp cùng một chữ; khớp phân biệt hoa thường; cách viết khác khi chỗ trống là chính từ. (Phần đáp án nhiễu chia cùng dạng đã bỏ cùng trắc nghiệm kiểu B, D34) | Đề xuất, đã duyệt 18/10 | #7, #20, #21 | 7.4b |
| R8 | Lần hỏi đang chờ làm lại: khi nào ghi `answered_at`, payload có `state` và `tries`; bấm nút khi chưa có kết quả cuối | Đề xuất, đã duyệt 18/10 | #8 | 5.1, 6, 7.6 |
| R9 | "Không tìm thấy từ/nhóm" (D31): lần hỏi có `result = void`, response có `notice`; hết từ dùng được thì phiên kết thúc | Đề xuất, đã duyệt 18/10 | #9, #30 | 5.1, 6, 7.2, 13 |
| R10 | Tổng kết: API 10 áp cho cả danh sách của 7.8 (theo D20); một từ có nhiều lần hỏi thì dùng lần hỏi cuối | Sửa (D20); khóa: Đề xuất, đã duyệt 18/10 | #10 | 6, 7.8 |
| R11 | `session-closed` chỉ chặn thao tác làm bài; bấm nút tổng kết và báo lỗi vẫn làm được sau khi phiên xong | Đề xuất, đã duyệt 18/10 | #11 | 6 |
| R12 | Giới hạn báo lỗi: Practice tự đếm theo cài đặt (rate limit chung không đọc Settings) | Đề xuất, đã duyệt 18/10 | #14 | 10 |
| R13 | Lọc nghĩa con cho nghĩa chỉ có tiếng Anh; bỏ câu "cặp sai chắc chắn sai" | Đề xuất, đã duyệt 18/10 | #15 | 7.4, 7.5 |
| R14 | Cài đặt: giá trị "để trống", luật "mặc định ≤ tối đa", liệt kê các con số cố định | Sửa / Đề xuất, đã duyệt 18/10 | #16, #17 | 5.4 |
| R15 | Còn lại: chữ cũ, bảng mã lỗi, job chạy mỗi giờ, từ chức năng theo luật có sẵn, "tới hạn" theo `applyAnswer`, "Đang ưu tiên" theo D48, thứ tự lọc từ, B4#6, edge case B4E29–B4E43 | Sửa / Đề xuất, đã duyệt 18/10 | #4, #12, #18, #19, #22, #23, #25–#27, #29, #31, #32 | nhiều |

## 1. Mục tiêu và bối cảnh

Bước 4 thêm **bài luyện không AI** để người học kiểm tra mình nhớ từ tới đâu, dồn bài vào chỗ yếu ("từ hay sai"), và từ kết quả
bài làm tự quyết định đưa từ vào ôn ưu tiên. **Bước 4 chỉ làm hệ thống (API)**; giao diện làm sau khi hệ thống ổn định (Chốt).

Thứ tự bước: Bước 3 → Bước 4; Deploy dời về khi toàn bộ app hoàn chỉnh, trước ra mắt (D3 vòng 3, 18/10). Design này viết sớm, khi
phần hệ thống Bước 3 vừa xong và phần giao diện chưa làm; code Bước 4 bắt đầu khi chủ dự án cho phép.

Giả định của chủ dự án (17/10): **nội dung đủ** (đủ nghĩa đã publish để có đáp án nhiễu). Đây là việc của nội dung, không chặn thiết
kế (`ASSUMPTION`).

## 2. Quyết định (tóm tắt)

Đủ chi tiết từng vòng: nhật ký ở [`../reviews/2026-10-17-buoc-4-readiness.md`](../reviews/2026-10-17-buoc-4-readiness.md) mục 8.

| Chủ đề | Chốt |
|---|---|
| Phạm vi | Bước 4 gồm **trắc nghiệm, đúng/sai, gõ từ, "từ hay sai"**, cộng lưu câu và lịch sử |
| Bài điền từ | Do AI tạo, **chuyển sang Bước 7**, là tính năng gói trả phí; Free vẫn có các bài khác (đổi K23) |
| Ngân hàng câu dùng chung | **Bỏ** (đổi K17). Câu đã tạo lưu vào danh sách của chính người học; dùng lại câu AI đã lưu để tới Bước 7 tính |
| Dạng bài mới | Bước 7 (AI): đưa một câu chứa từ, người học chọn đáp án. "Chọn gì" chưa hỏi |
| Đáp án của bài có câu (Bước 7) | Có thể có đáp án thay thế, nhưng **đúng ngữ pháp trong câu là ưu tiên** (không nhận `deploy` cho chỗ cần `deployed`) |
| Một câu chỉ một đáp án đúng | **Không bao giờ có câu có hơn một đáp án đúng**; phải chặn lúc tạo câu |
| Đáp án nhiễu | Lấy trong **các nhóm chứa từ đang hỏi** (cả từ riêng); loại cùng chữ, dạng chia của nhau, chung nghĩa con tiếng Việt; **bỏ** lọc loại từ, level và cột đồng nghĩa (18/10, thay cách A' trước đó) |
| Gợi ý | Nấc 1: định nghĩa ngắn **≤ 200 ký tự**, không có thì câu ví dụ đã che từ; nấc 2 (chỉ gõ từ): chữ cái đầu và số chữ. Dùng gợi ý vẫn chấm như thường, hệ thống ghi lại |
| Trong một phiên | Mỗi câu xuất hiện một lần; trắc nghiệm, đúng/sai sai thì hiện đáp án. **Gõ từ sai: không hiện đáp án ngay, có "Làm lại" và "Bỏ qua"**; số lần làm lại admin chỉnh (trống = không giới hạn); làm lại mới đúng tính là đúng; Bỏ qua hiện đáp án (18/10, ⚠14) |
| Làm lại | Người học **chọn từ** để luyện lại ở phiên sau; bài không AI luôn tạo câu mới |
| Lịch sử | Mọi lượt được lưu, lọc theo một ngày (và theo từ); **giữ 6 tháng** (admin chỉnh); người học **không xóa** được |
| Nguồn phiên | **5 loại**: Hôm nay, Ôn tất cả, Theo nhóm, Từ hay sai, Đang ưu tiên. Bỏ "Chọn từ" và bỏ luyện riêng một từ |
| Sắp xếp | **Người học chọn**; "từ hay sai" mặc định xét theo mức |
| Số câu | Người học chọn; **admin đặt tối đa**, không đặt tối thiểu |
| Chia câu | Đủ từ thì **không lặp**; thiếu từ thì **ôn theo vòng**, hết vòng 1 hỏi "Ôn lại thêm không?" một lần; luôn có nút Dừng |
| Dạng bài | Người học chọn một hoặc nhiều dạng; thêm **kiểu đề** theo nghĩa / theo câu (câu ví dụ catalog bỏ trống, không AI) / trộn (18/10). Kiểu đề theo câu chỉ cho gõ từ; trắc nghiệm theo câu để Bước 7 (D34) |
| Nút sau mỗi câu | **"Cần ôn tập" luôn có**, nổi bật khi sai (người học tự bấm, giữ D16); **"Đã biết"** khi đúng, không dùng gợi ý, từ tới hạn hoặc ưu tiên (giữ D19, tạm thời); tổng kết một danh sách "Cần ôn tập" |
| "Từ hay sai" | Sai **từ 2 lần trong 5 lượt gần nhất**; tính mọi lượt kể cả trắc nghiệm, đúng/sai, kể cả luyện lại; **lượt đúng nhờ gợi ý không tính**; dùng gợi ý thì không lên mức |
| Báo lỗi | **Có** nút báo lỗi (lý do + ghi chú), lưu cho staff xem; lượt bị báo không tính vào "từ hay sai". Câu hỏi chính là từ riêng thì không có nút; bản sao cho staff che mọi từ riêng (D36, sau review) |
| Quyền `practice.basic` | **B**: Bước 4 làm sẵn chỗ kiểm, tạm luôn "được phép"; Bước 5 thay phần bên trong |
| Nền tảng | **Chỉ API**; giao diện làm sau |
| Phiên luyện | **Server giữ phiên** (hướng 1) |
| Cách làm việc | Không có phần lõi chủ dự án tự viết; chủ dự án chỉ review; giữ cách chủ dự án trả lời trước |
| "Xong khi" | Xong toàn bộ task của plan và test thành công: CI xanh trên PR và script chạy qua API thật trên DB mới |
| Implement | **Các phiên khác implement, cùng một phiên điều phối**; plan có mục brief cho phiên điều phối |
| Con số | Admin chỉnh được toàn bộ các con số trong bảng 5.4 (8 cài đặt); các con số cố định liệt kê ở mục 5.4 (trong đó có giới hạn 100 và 300 ký tự) |
| Nội dung đổi giữa phiên | Như Quizlet: đang làm vẫn chấm; tải lại thì báo "Không tìm thấy" |
| Trần mỗi ngày (sau review) | Bấm "Đã biết"/"Cần ôn tập" từ bài luyện **không tính** vào trần nào; trần từ ôn mỗi nhóm (Bước 3) cho phép **để trống = không giới hạn**, mặc định vẫn 100; trần từ mới giữ bắt buộc (D35) |

## 3. Phạm vi

**Làm:** module `Practice` trong `apps/api`; thay đổi nhỏ ở Content (hàm đọc nội dung, đáp án được chấp nhận, dạng chia cho Practice;
che từ trong câu ví dụ), Learning (cho Practice đọc danh sách từ theo nguồn và các nghĩa cùng nhóm, ghi "Cần ôn tập", "Đã biết"; cổng dọn
dữ liệu khi xóa từ riêng, R2; trần từ ôn để trống = không giới hạn, D35), Settings (nhóm `practice`, 8 cài đặt; `learning.reviews_per_group_per_day`
cho phép để trống, D35), một rule giới hạn tần suất mới (R1), chỗ kiểm quyền tạm; job dọn dữ liệu; script kiểm qua API thật.

**Không làm:** giao diện (web người học, màn admin báo lỗi); bài AI (điền từ, "câu chứa từ rồi chọn"); quyền và hạn mức thật
(Bước 5); xóa tài khoản (Bước 8); Flutter.

**Đổi so với spec Practice** (spec chỉ là khung; ghi để truy nguồn, không sửa spec):

| Spec | Design Bước 4 | Vì sao |
|---|---|---|
| PRC16, PRC17, Q24, Q25, LR6: bài làm gửi `remembered`/`forgotten`, tự đổi lịch | Bài làm **không** tự đổi lịch; người học tự bấm "Cần ôn tập" hoặc "Đã biết" | D16 của Bước 3 |
| PRC20: lọc ba trạng thái; nguồn "hôm nay" chung; thứ tự cố định | 5 nguồn; người học chọn cách sắp xếp; trạng thái là mức 0–5 + cờ ưu tiên | D17, D20 của Bước 3; câu 3, 4 |
| PRC14, bất biến (1): mỗi câu một lượt | Giữ trong một phiên; bảng cho phép một câu nhiều lượt (để Bước 7 dùng lại câu AI) | Câu 1 |
| PRC24: xóa câu chưa trả lời sau 30 ngày | Câu tạo từng câu khi app xin; mọi dữ liệu giữ theo số tháng lịch sử | Câu 11 |
| PRC4, K23: bài từ câu người học không AI, cho Free | Chuyển sang Bước 7, AI, gói trả phí | Câu 1 |
| PRC5, PRC8, K17: ngân hàng câu AI dùng chung | Bỏ; câu lưu theo từng người | Câu 1 |
| PRC3: chọn đáp án nhiễu tự động | Lấy trong các nhóm chứa từ đang hỏi; loại cùng chữ, dạng chia của nhau, chung nghĩa con; không có cột đồng nghĩa | Câu 1, ⚠1, ⚠2 |
| PRC2: đề bài kèm định nghĩa tiếng Anh | Định nghĩa thành gợi ý | Câu 1 |
| PRC18, F40: nút báo lỗi | Giữ, cho bài không AI, lý do theo lỗi nội dung | Câu 9 |

## 4. Kiến trúc

```
                ┌────────────── Practice (mới) ──────────────┐
                │ phiên luyện · câu hỏi · lần hỏi · báo lỗi  │
                └──┬──────────┬──────────┬──────────┬────────┘
                   │          │          │          │
             Learning     Content    Settings   Kiểm quyền (tạm)
```

Practice chỉ gọi module khác qua service được export, theo quy ước D3 (mỗi module sở hữu file `prisma/models/<module>.prisma`; không
`@relation` qua ranh giới module; tham chiếu chéo là cột UUID).

| Module | Practice cần | Mới hay có sẵn |
|---|---|---|
| Learning | Danh sách từ cho 4 nguồn (Hôm nay, Ôn tất cả, Theo nhóm, Đang ưu tiên), kèm mức, ngày hẹn, cờ ưu tiên, thời điểm bấm "Cần ôn tập" gần nhất | Mới: hàm export. Hôm nay dùng lại cách tính danh sách ôn và trần của Bước 3 |
| Learning | Các nghĩa (còn thấy được) trong **các nhóm chứa một nghĩa**: tập ứng viên đáp án nhiễu (mục 7.4); và một nghĩa còn trong một nhóm không (nguồn Theo nhóm, mục 7.2) | Mới: hàm export (Sửa sau review, R6: nhóm là dữ liệu của Learning; Content không đọc bảng Learning) |
| Learning | Ghi "Cần ôn tập", "Đã biết" từ bài làm **không cần nhóm**, khóa chống trùng là ID lần hỏi, nhật ký ghi `origin = practice` | Mới: hàm export dùng lại luật `applyAnswer` của Bước 3, **nhận transaction của Practice** để ghi cùng `review_action` (Đề xuất, đã duyệt 18/10, R2). Hiện Learning chỉ export `LearningService.cardsLeftToday`; `ReviewsService.answer` bắt buộc có nhóm nên không dùng lại được |
| Learning | Kiểm một nghĩa còn trong việc học của người học không | Mới hoặc dùng `ItemsService.states` có sẵn (chưa export) |
| Learning | Cổng dọn dữ liệu khi xóa từ riêng (mục 11) | Mới: Learning khai báo token, Practice cung cấp (như `BATCH_SCOPE` của Content; Đề xuất, đã duyệt 18/10, R2) |
| Content | Nội dung để ra đề và hiện sau khi nộp | Có sẵn: `ContentService.cardContent` (`WordSense`) |
| Content | Đáp án được chấp nhận: chính từ đó, cách viết khác có `accepted_as_answer`, `accepted_forms` | Có sẵn trong bảng; cần một hàm đọc |
| Content | Nội dung để lọc ứng viên đáp án nhiễu của một loạt nghĩa: chữ, nghĩa tiếng Việt (hoặc tiếng Anh), liên kết dạng chia, bảng dạng chia, cờ từ chức năng | Mới: hàm đọc; Practice lọc (mục 7.4) |
| Content | Câu ví dụ đã che từ cho gợi ý và cho đề kiểu B | Mới: hàm dùng bảng dạng chia `entry_inflections` và cách viết khác (mục 7.4b) |
| Content | Nghĩa nào người học được thấy | Có sẵn: `visibleSenseCondition`, `visibleSenseIds` |
| Identity | Múi giờ, ngôn ngữ của người học; chặn người chưa có hồ sơ | Có sẵn: `IdentityService.getProfile`, `@LearnerContent()` (mục 12) |
| Settings | 8 cài đặt nhóm `practice` (mục 5.4) | Mới: nhóm cài đặt `practice`. Sửa: `learning.reviews_per_group_per_day` cho phép để trống (D35) |
| Giới hạn tần suất | Rule cho các API trong lúc làm câu | Mới: `practice.answer` trong `app-config.ts` (mục 6; Đề xuất, đã duyệt 18/10, R1) |
| Kiểm quyền | `practice.basic` | Mới: chỗ kiểm tạm, luôn "được phép" (mục 12) |
| Bảo trì | Job dọn | Có sẵn: `MaintenanceScheduler`, chạy **mỗi giờ** trong tiến trình API (đang dọn `idempotency-keys`) |

**Hướng gọi (Sửa sau review, R2):** Practice gọi Learning, Content, Settings, Identity và module kiểm quyền; không module nào import Practice.
Chỗ duy nhất Learning cần Practice (xóa từ riêng trong transaction của Learning) đi qua cổng do Learning khai báo, như cách Content nhận
`BATCH_SCOPE` từ Content Pipeline.

## 5. Dữ liệu

### 5.1 Practice (`practice.prisma`, mới)

Mọi bảng có `user_id`; `sense_id`, `group_id` là UUID thường, không khóa ngoại sang module khác.

| Bảng | Mỗi dòng | Cột chính | Ràng buộc, index |
|---|---|---|---|
| `practice_sessions` | Một phiên | `id`, `user_id`, `source` (`today` / `all` / `group` / `weak` / `priority`), `group_id`, `group_filter` (`all` / `due` / `priority` / `0`…`5`), `sort`, `types` (mảng), `prompt_style` (`meaning` / `sentence` / `mixed`), `target_count`, `sense_ids` (vòng 1, đúng thứ tự đã sắp), `status` (`active` / `waiting_continue` / `finished` / `abandoned`), `continued` (null / true / false), `started_at`, `last_activity_at`, `ended_at` | Unique một phần: mỗi `user_id` tối đa một phiên ở `active` hoặc `waiting_continue` |
| `practice_questions` | Nội dung một câu, lưu nguyên lúc tạo | `id`, `user_id`, `sense_id`, `type` (`mcq_definition` / `true_false_definition` / `type_word`), `prompt_style` (`meaning` = kiểu A / `sentence` = kiểu B, chỉ có ở gõ từ; trắc nghiệm, đúng/sai luôn `meaning`, D34), `blank` (chỉ kiểu B: chữ đã che, và là chính từ `base` hay dạng chia; mục 7.4b), `schema_version`, `prompt` (phần người học thấy), `answer_key` (đáp án chính, đáp án thay thế, phiên bản chuẩn hóa; với trắc nghiệm là vị trí đúng; với đúng/sai là đúng hay sai), `hints` (nội dung từng nấc), `distractor_sense_ids`, `created_at` | `answer_key` và `hints` không bao giờ gửi xuống app trước khi nộp hoặc xin gợi ý. `prompt_style`, `blank`: thêm sau review (R7) |
| `practice_session_items` | Một lần hỏi trong phiên, cùng câu trả lời | `id`, `session_id`, `user_id`, `question_id`, `sense_id`, `round`, `position`, `asked_at`, `answered_at` (lúc có **kết quả cuối**; null khi chưa nộp hoặc đang chờ làm lại), `answer_raw`, `answer_normalized` (lần gõ cuối), `answers_tried` (các lần gõ trước, chỉ bài gõ từ), `tries`, `max_retries` (chụp từ cài đặt lúc tạo câu; null = không giới hạn), `skipped`, `result` (`correct` / `wrong` / `void`; null khi chưa nộp hoặc đang chờ làm lại; `void` = "Không tìm thấy từ này", không tính ở đâu cả), `hint_level` (0, 1, 2), `local_date` (ngày làm theo múi giờ người học, ghi cùng kết quả cuối), `review_action` (`needs_review` / `known` / null) | Unique `(session_id, position)`; index `(user_id, sense_id, answered_at)` cho "5 lượt gần nhất"; index `(user_id, local_date)` cho lịch sử theo ngày |
| `practice_reports` | Một báo cáo lỗi | `id`, `user_id`, `item_id` (null khi lần hỏi đã bị dọn), `sense_id`, `question_snapshot` (bản sao câu hỏi và câu trả lời), `reason` (`meaning_wrong` / `graded_wrong` / `hint_wrong` / `other`), `note` (≤ 300 ký tự), `status` (`open` / `no_error` / `fixed`), `resolved_by`, `resolved_at`, `created_at` | Unique `item_id` (mỗi lần hỏi báo một lần); index `(status, created_at)` |

- **Vì sao tách "câu hỏi" và "lần hỏi" (Đề xuất, đã duyệt):** ở Bước 4 mỗi lần hỏi đi kèm một câu mới. Bước 7 dùng lại một câu AI đã
  lưu bằng cách thêm một lần hỏi mới trỏ về câu cũ, không đổi cấu trúc bảng.
- **Không có bảng "lượt làm bài" riêng:** một lần hỏi có kết quả cuối (`correct` / `wrong`) chính là một lượt.
- **Ghi câu trả lời (Đề xuất, đã duyệt 18/10, R8):** khóa dòng lần hỏi, chỉ ghi khi `result` còn null (một luật cho B4E2 và B4E28). Gõ sai mà
  còn lượt: thêm vào `answers_tried`, `tries` + 1, `result` và `answered_at` vẫn null. Kết quả cuối: ghi `result`, `answered_at`,
  `local_date` một lần.
- **Đáp án gốc** chỉ nằm trong DB, không bao giờ vào log (SR9).

### 5.2 Content (mở rộng)

- **Không thêm cột từ đồng nghĩa** (Chốt 18/10, ⚠2): đáp án nhiễu chỉ lấy trong các nhóm của người học (mục 7.4).
- Không thêm luật chặn độ dài định nghĩa khi import: định nghĩa dài vẫn hợp lệ, chỉ không dùng làm gợi ý (mục 7.7).
- Content cần mở thêm hàm đọc cho Practice: đáp án được chấp nhận, nghĩa tiếng Việt và liên kết dạng chia của một loạt nghĩa, câu ví dụ
  đã che từ (mục 4).

### 5.3 Learning (mở rộng)

- **`learning_log.origin`** (mới, null được): `practice` khi bấm từ bài làm; null như hiện nay cho flashcard. `group_id` của dòng nhật
  ký từ bài làm để null (cột này đã cho phép null). `review_id` = ID lần hỏi, nên bấm hai lần chỉ tính một. Hàm export tự kiểm "lần hỏi
  đã bấm chưa" theo `review_action` của Practice trước khi ghi (trả `409 review-already-set`, B4E11), không dựa vào lỗi 400 mà Learning
  hiện trả khi một `review_id` bị dùng lại với nội dung khác (Đề xuất, đã duyệt 18/10).
- **Trần mỗi ngày (Chốt 18/10, D35): bấm từ bài làm không tính vào trần nào.** Trần chỉ giới hạn số thẻ app đưa ra mỗi ngày, không giới
  hạn phần người học tự chọn luyện thêm (như "Increase today's review card limit" của Anki). Code Bước 3 đã làm đúng như vậy: trần đếm từ
  các dòng nhật ký **có** `group_id` (`queue.queries.ts`), còn dòng từ bài làm có `group_id` null. Hệ quả đã biết: từ đến hạn hoặc từ mới
  bấm "Đã biết" trong bài luyện lên mức mà không trừ trần của nhóm nào, và từ kế tiếp sau trần vào danh sách flashcard hôm nay (B4E45).
  Trong flashcard thì lượt ôn vẫn tính vào trần của nhóm nơi ôn như cũ (D35 của Bước 3).
- Cách sắp xếp "Đang ưu tiên: bấm Cần ôn tập lâu nhất trước" lấy thời điểm từ nhật ký (dòng `review` với `answer = review` mới nhất của
  mục học); không thêm cột.

### 5.4 Settings (mở rộng)

Thêm nhóm `practice` vào `settings.definitions.ts` (cùng cách nhóm `reminders`, `learning`):

| Cài đặt | Mặc định | Khoảng admin chỉnh | Nhãn |
|---|---|---|---|
| `max_questions_per_session` | 20 | 5–100 | ASSUMPTION |
| `default_questions_per_session` | 10 | 1 tới số tối đa | ASSUMPTION |
| `history_months` | 6 | 3–24 | 6 là số chủ dự án đưa; khoảng là ASSUMPTION |
| `true_false_true_percent` (tỉ lệ cặp đúng ở bài đúng/sai) | 50 | 20–80 | ASSUMPTION |
| `idle_session_close_hours` (phiên bỏ ngang tự đóng) | 24 | 1–168 | ASSUMPTION |
| `reports_per_hour` (giới hạn báo lỗi mỗi người) | 20 | 5–100 | ASSUMPTION |
| `hint_definition_max_chars` (định nghĩa dài tối đa để làm gợi ý) | 200 | 80–500 | 200 Chốt; khoảng là ASSUMPTION |
| `type_word_max_retries` (số lần làm lại sau khi gõ sai) | để trống (không giới hạn) | để trống, hoặc 1–10 | Chốt 18/10: admin chỉnh, để trống là không giới hạn; khoảng 1–10 là ASSUMPTION |

Admin chỉnh được toàn bộ các con số trong bảng này (Chốt 18/10, D30). **Cố định trong code** (Sửa sau review, R14): đáp án ≤ 100 ký tự,
ghi chú báo lỗi ≤ 300 ký tự (D30); "sai từ 2 lần trong 5 lượt gần nhất" (D21, câu 10b chọn giữ); 4 lựa chọn mỗi câu trắc nghiệm; tỉ lệ
kiểu A/B của bài gõ từ khi kiểu đề "trộn" 50/50 (`ASSUMPTION`, 7.3; thêm vào bảng này nếu chủ dự án muốn chỉnh).

Người học chọn số câu từ 1 tới `max_questions_per_session`, mặc định `default_questions_per_session`.

Chi tiết cài đặt (Đề xuất, đã duyệt 18/10, R14):
- **"Để trống"** của `type_word_max_retries` lưu là `null`. Kiểu giá trị của Settings hiện chỉ có `boolean | number | string`
  (`settings.definitions.ts`), nên plan thêm `null` cho riêng khóa này.
- **Luật chéo:** `default_questions_per_session` ≤ `max_questions_per_session`, kiểm trên giá trị sau khi gộp như luật `stop_after_days` >
  `inactive_after_days` đang có; lưu một bộ giá trị vi phạm → 400, không lưu (B4E38).
- **`hint_definition_max_chars`** gắn với luật soạn nội dung "định nghĩa ≤ 200 ký tự" (D33): đổi cài đặt thì nên đổi luật soạn theo, nếu
  không các định nghĩa dài hơn số mới sẽ không còn làm gợi ý.

**Sửa một cài đặt của Bước 3 (Chốt 18/10, D35):**

| Cài đặt (nhóm `learning`) | Mặc định | Khoảng admin chỉnh | Ghi chú |
|---|---|---|---|
| `reviews_per_group_per_day` (trần từ ôn mỗi nhóm mỗi ngày) | 100 (giữ, D21 của Bước 3) | **để trống = không giới hạn**, hoặc 10–500 như cũ | Để trống: danh sách ôn hôm nay của nhóm gồm mọi từ đến hạn (trừ danh sách cân nhắc) |
| `new_per_group_per_day` (trần từ mới) | 20 | 1–100 như cũ, **bắt buộc có số** | Không đổi; app nào trong research cũng giới hạn từ mới |

Chỗ code phải đổi: kiểu giá trị cài đặt nhận `null` (cùng cơ chế với `type_word_max_retries`); `queue.service.ts` bỏ giới hạn phần đến hạn
khi trần trống, cả ở số liệu trang chủ (`today()`) lẫn danh sách thẻ (`queue()`); nhắc học dùng chung `cardsLeftToday` nên tự đúng theo.
Research (18/10): Anki có cả trần từ mới (mặc định 20) và trần từ ôn; Mochi chỉ giới hạn từ mới, tác giả không thêm trần từ ôn vì "không thấy
nó hợp với lịch ôn giãn cách"; RemNote cho người học chọn ôn hết, chia đều trong tuần, hoặc đặt giới hạn.

## 6. Luồng một phiên và API (Đề xuất, đã duyệt)

```
Bắt đầu phiên ─► Xin câu tiếp theo ─► (có thể xin gợi ý) ─► Nộp đáp án ─► Kết quả
                       ▲                                                   │
                       └──── còn câu ◄── (bấm "Cần ôn tập"/"Đã biết") ◄────┘
                       │
         hết vòng 1, thiếu từ ─► "Ôn lại thêm không?" ─► Ôn lại → vòng 2…
                       │                                  Kết thúc ─┐
         đủ số câu hoặc bấm Dừng ───────────────────────────────────┴─► Tổng kết
```

API người học, dưới `/v1/practice`, `@LearnerContent()` như Learning (Problem Details, phân trang `page_size` + `page_token`).

**Giới hạn tần suất (Đề xuất, đã duyệt 18/10, R1; sửa "`user.write` như Learning" của bản trước):** các API trong lúc làm câu (3, 4, 5, 5b,
6) dùng một rule mới `practice.answer`, cỡ `learning.review` (120 lần/phút mỗi người, `ASSUMPTION`); API 1, 7, 8, 10 dùng `user.write`;
API 13 theo cài đặt `reports_per_hour` (mục 10). Lý do: mỗi câu tốn 2–4 lần ghi (`next`, `answer`, có thể thêm `hint`, `review`), còn
`user.write` chỉ 30 lần/phút và dùng chung cho mọi thao tác ghi của người đó (`app-config.ts`); chính Learning cũng không dùng `user.write`
cho lượt ôn flashcard vì lý do này.

| # | API | Khóa chống trùng | Làm gì |
|---|---|---|---|
| 1 | `POST /sessions` | `Idempotency-Key` | Body: `source`, `group_id`, `group_filter`, `sort`, `types`, `prompt_style`, `count`. Kiểm quyền (mục 12), chọn từ vòng 1 (mục 7.1), đóng phiên đang mở (`abandoned`), tạo phiên mới, trong một transaction có khóa theo người học (B4E29). Không có từ dùng được → `409 practice-no-words` kèm lý do (`group-empty`, `no-word-fits-types`, `source-empty`), phiên đang mở giữ nguyên (B4E30) |
| 2 | `GET /sessions/current` | — | Phiên đang mở (để tải lại vẫn làm tiếp) và lần hỏi chưa có kết quả cuối, kiểm lại như API 3 (B4E6); hoặc 404 |
| 3 | `POST /sessions/{id}/next` | Tự nhiên | Lần hỏi tiếp theo. Câu tạo **lúc này**. Nếu lần hỏi trước chưa có kết quả cuối thì trả lại đúng lần hỏi đó, kèm `state` (`unanswered` / `try_again`) và `tries` (R8). Nếu từ của lần hỏi đó không còn dùng được (mục 7.2): lần hỏi thành `void`, response kèm `notice: word-not-found` và lần hỏi kế tiếp (D31). Phiên Theo nhóm mà nhóm đã bị xóa: phiên `finished`, response `notice: group-not-found` (B4E8b). Có thể trả `waiting_continue` hoặc `finished` thay vì câu. Trả: `item_id`, `round`, `position`, `type`, `prompt_style`, `prompt`, các nấc gợi ý có, `reportable` (false khi từ đang hỏi là từ riêng, D36) |
| 4 | `POST /items/{id}/hint` | Tự nhiên | Body `level` (1 hoặc 2). Trả nội dung gợi ý, ghi nấc cao nhất đã xem. Sau khi nộp → lỗi `already-answered`; nấc 2 cho bài không phải gõ từ, hoặc nấc không có → lỗi `hint-unavailable` |
| 5 | `POST /items/{id}/answer` | `Idempotency-Key` (mỗi lần gõ một khóa) | Body: lựa chọn (trắc nghiệm), đúng/sai, hoặc chữ (gõ từ). Trả `result`: `correct`, `wrong` hoặc **`try_again`** (chỉ gõ từ: sai mà còn lượt làm lại; không kèm đáp án). Khi `correct`/`wrong`: đáp án đúng, nghĩa, định nghĩa, `hint_level`, `tries`, và **cờ cho giao diện** `show_known`, `highlight_needs_review` (mục 7.8) |
| 5b | `POST /items/{id}/skip` | Tự nhiên | Nút "Bỏ qua" của bài gõ từ khi đang `try_again`: chốt `wrong`, `skipped = true`, trả đáp án như API 5 |
| 6 | `POST /items/{id}/review` | ID lần hỏi | Body `action` (`needs_review` / `known`). Chỉ khi lần hỏi đã có kết quả cuối. Gọi Learning trong cùng transaction (R2). Mỗi lần hỏi một lần bấm; lần đầu có hiệu lực. Được cả khi phiên đã `finished` (trang tổng kết, R11) |
| 7 | `POST /sessions/{id}/continue` | Tự nhiên | Body `continue` (true / false), chỉ khi `waiting_continue` |
| 8 | `POST /sessions/{id}/finish` | Tự nhiên | Nút Dừng → `finished` |
| 9 | `GET /sessions/{id}/summary` | — | Số câu, số đúng, số sai (không tính lần hỏi `void` và lần hỏi chưa có kết quả cuối); **một danh sách** "Cần ôn tập" gồm từ sai (mọi dạng) và từ đúng nhờ gợi ý (mục 7.8); mỗi từ: đã bấm gì, ID lần hỏi dùng cho nút |
| 10 | `POST /sessions/{id}/review-all` | `Idempotency-Key` | "Cần ôn tập" cho mọi từ **trong danh sách của API 9** chưa bấm (D20: "Đưa tất cả vào ưu tiên"; sửa sau review, R10: bản trước chỉ gồm từ sai và tên là `review-all-wrong`); trả số từ đã đưa vào. Từ đã bỏ khỏi việc học thì bỏ qua |
| 11 | `GET /weak-words` | — | "Từ hay sai" kèm lý do (mục 8) |
| 12 | `GET /history?date=&sense_id=` | — | Lịch sử, mới nhất trước (mục 9) |
| 13 | `POST /items/{id}/report` | Unique theo lần hỏi | Báo lỗi (mục 10). Được với mọi lần hỏi còn lưu của mình, kể cả khi phiên đã đóng; trừ lần hỏi có từ đang hỏi là từ riêng (D36) |

API staff, quyền `content.edit`: `GET /v1/admin/practice/reports?status=` và `POST /v1/admin/practice/reports/{id}/resolve` (mục 10).

**Mã lỗi** (gom một bảng sau review, R15; mã mới là Đề xuất, đã duyệt 18/10). Mã có sẵn của `Idempotency-Key` (SR8) và `404 not-found` giữ
nguyên.

| Mã | Status | API | Khi |
|---|---|---|---|
| `validation-failed` | 400 | 5, mọi API có body | Đáp án rỗng hoặc > 100 ký tự: không tính sai, không ghi lượt (PRC12) |
| `not-found` | 404 | mọi API | Phiên, lần hỏi không có hoặc của người khác; `GET /sessions/current` khi không có phiên mở |
| `practice-no-words` | 409 | 1 | Kèm `reason` (`group-empty`, `no-word-fits-types`, `source-empty`); phiên đang mở giữ nguyên |
| `session-closed` | 409 | 3, 4, 5, 5b, 7, 8 | Phiên `finished` hoặc `abandoned`. API 6, 9, 10 làm được với phiên `finished` (không với `abandoned`); API 13 làm được với mọi phiên (R11) |
| `already-answered` | 409 | 4, 5, 5b | Lần hỏi đã có kết quả cuối; API 5 kèm kết quả đã lưu (PRC15) |
| `hint-unavailable` | 409 | 4 | Nấc 2 cho bài không phải gõ từ, hoặc nấc không có |
| `skip-not-allowed` | 409 | 5b | Bài không phải gõ từ, hoặc lần hỏi không ở `try_again` (Bỏ qua chỉ có sau một lần gõ sai, ⚠14) |
| `not-answered` | 409 | 6 | Lần hỏi chưa có kết quả cuối, kể cả đang `try_again` |
| `known-not-allowed` | 409 | 6 | "Đã biết" khi `show_known` tính lại lúc bấm là false (B4E9) |
| `review-already-set` | 409 | 6 | Lần hỏi đã bấm hành động khác (B4E11); cùng hành động thì trả kết quả đã có (B4E10) |
| `not-in-learning` | 409 | 6 | Từ đã bỏ khỏi việc học (B4E7) |
| `report-exists` | 409 | 13 | Lần hỏi đã được báo; kèm báo cáo cũ (B4E20) |
| `report-not-available` | 409 | 13 | Từ đang hỏi là từ riêng (D36, B4E47) |
| `rate-limited` | 429 | API ghi | Có sẵn, kèm `retry-after` |

## 7. Thuật toán

### 7.1 Chọn từ cho phiên (Chốt: nguồn, sắp xếp do người học chọn, đủ từ không lặp)

1. **Lấy từ theo nguồn:**

| Nguồn | Gồm |
|---|---|
| Hôm nay | Thẻ đang có hôm nay ở mọi nhóm, **sau khi áp trần**: hợp các danh sách thẻ của từng nhóm (mục 6.2 của design Bước 3), bỏ trùng, nên một từ ở hai nhóm tính một lần (trang chủ đếm theo từng nhóm nên tổng có thể lớn hơn; sửa sau review). Mở phiên luyện, làm câu và bấm "Đã biết"/"Cần ôn tập" từ bài làm đều **không** tiêu trần (D35, mục 5.3). Trần từ ôn để trống thì phần đến hạn không giới hạn |
| Ôn tất cả | Mọi mục học của người học |
| Theo nhóm | Một nhóm, lọc `all` / `due` (danh sách ôn hôm nay của nhóm) / `priority` / mức `0`…`5` |
| Từ hay sai | Danh sách mục 8 |
| Đang ưu tiên | Mục học có cờ ưu tiên, trừ mục đã vào danh sách cân nhắc, giống phần ưu tiên của Bước 3 (D48) (Đề xuất, đã duyệt 18/10) |

2. Loại nghĩa người học không còn thấy được (bị gỡ, retire; `visibleSenseCondition`).
3. Sắp xếp theo cách người học chọn; hai từ ngang nhau thì bốc ngẫu nhiên.
4. Đi theo thứ tự đã sắp, bỏ từ không làm được dạng bài nào trong các dạng đã chọn (mục 7.3), tới khi đủ `count` từ → `sense_ids` của
   phiên. (Sau review: đổi thứ tự lọc và sắp xếp; kết quả như cũ, nhưng không phải tính ứng viên đáp án nhiễu cho mọi từ của một nguồn
   lớn như "Ôn tất cả".)

**Cách sắp xếp** (người học chọn khi mở phiên; bảng mặc định Chốt 18/10, ⚠12):

| Cách | Ý nghĩa |
|---|---|
| `level_asc` | Mức thấp trước |
| `overdue_first` | Quá hạn lâu nhất trước |
| `new_first` | Mức 0 trước |
| `least_practiced` | Chưa luyện bao giờ, hoặc luyện lâu nhất, trước (từ lần hỏi đã trả lời của Practice) |
| `most_wrong` | Sai nhiều nhất trong 5 lượt tính gần nhất trước |
| `queue` | Ưu tiên → đến hạn → mới, như phiên ôn flashcard |
| `priority_oldest` | Bấm "Cần ôn tập" lâu nhất trước |
| `random` | Ngẫu nhiên |

| Nguồn | Mặc định |
|---|---|
| Từ hay sai | `level_asc` (Chốt: "từ hay sai thì xét theo mức") |
| Đang ưu tiên | `priority_oldest`. Mọi từ đang ưu tiên đều ở mức 1 (bấm "Cần ôn tập" đưa về mức 1, `schedule.ts`), nên xếp theo mức không phân biệt được |
| Hôm nay, Theo nhóm | `queue` |
| Ôn tất cả | `least_practiced` |

### 7.2 Chia câu theo vòng (Chốt)

- **Vòng 1:** mỗi từ trong `sense_ids` một câu, theo thứ tự đã sắp.
- Đủ số câu trong vòng 1 → phiên xong.
- Thiếu (số từ < số câu) → hết vòng 1 phiên chuyển `waiting_continue`, app hiện **một lần** "Bạn đã làm hết X từ của nhóm này. Ôn lại
  thêm không?". [Ôn lại] → vòng 2, 3… cho tới đủ số câu, không hỏi lại; [Kết thúc] → `finished`.
- **Vòng ≥ 2:** các từ đó theo thứ tự xáo ngẫu nhiên; khi có ≥ 2 từ, từ đầu vòng mới không trùng từ cuối vòng trước (để không có hai
  câu liền nhau cùng một từ); mỗi câu ưu tiên dạng bài khác lần trước của từ đó trong phiên; trắc nghiệm thì đổi đáp án nhiễu.
- Nút Dừng có mọi lúc.
- Trước khi tạo mỗi câu: nếu nghĩa đã không còn thấy được, không còn trong việc học, hoặc (nguồn Theo nhóm) không còn trong nhóm đó →
  bỏ qua từ đó trong phiên, lấy từ kế tiếp. Người học chưa thấy câu của từ đó nên không cần thông báo; thông báo "Không tìm thấy từ này"
  chỉ dành cho câu **đang hiện** mà chưa nộp (B4E6, D31). Điều kiện "không còn trong nhóm" là Đề xuất, đã duyệt 18/10 (B4E32).
- Không còn từ nào dùng được (mọi từ còn lại đều bị bỏ qua) → phiên `finished`, tổng kết như thường (B4E31).

### 7.3 Dạng bài của mỗi câu

Bốc ngẫu nhiên trong các dạng người học đã chọn mà từ đó làm được.

| Dạng | Từ làm được khi |
|---|---|
| Gõ từ | Luôn làm được |
| Trắc nghiệm | Có ≥ 3 ứng viên đáp án nhiễu (mục 7.4) |
| Đúng/sai | Có ≥ 1 ứng viên |
| — | Từ chức năng: chỉ gõ từ (Đề xuất, đã duyệt). "Từ chức năng" theo đúng luật Content đang dùng: `COALESCE(function_word_override, function_word_derived)`, cờ ghi đè thắng (sửa sau review; bản trước ghi "`isFunctionWordPos` hoặc cờ ghi đè"). Từ riêng được tạo với `function_word_derived` = false nên làm được mọi dạng |

Từ riêng làm được cả ba dạng; đáp án nhiễu lấy trong nhóm như từ catalog (Chốt 18/10, thay đề xuất cũ "từ riêng chỉ có gõ từ").

**Đề bài: hai kiểu (Chốt 18/10: thiết kế cả hai; đề không hiện loại từ ở mọi dạng). Kiểu B chỉ dùng cho gõ từ (Chốt 18/10 sau review,
D34).**

```
Kiểu A — đề là nghĩa                 Kiểu B — đề là câu bỏ trống (không AI, chỉ gõ từ)
┌───────────────────────────┐        ┌───────────────────────────────┐
│ triển khai (phần mềm)     │        │ We ___ the app to the server  │
│ ○ deploy   ○ delay        │        │ yesterday.                    │
│ ○ deliver  ○ defend       │        │ [ gõ từ ...            ]      │
└───────────────────────────┘        └───────────────────────────────┘
```

- **Kiểu A:** nghĩa theo ngôn ngữ của người học (như thẻ flashcard, `cardContent`), nhãn ngữ cảnh nếu có. Không hiện loại từ, không hiện
  định nghĩa tiếng Anh (định nghĩa là gợi ý).
- **Kiểu B:** một **câu ví dụ có sẵn của nghĩa đó trong catalog** (1–3 câu mỗi nghĩa, nội dung đã duyệt), che từ cần điền; người học gõ
  từ. Chi tiết ở mục 7.4b. Từ riêng không có câu ví dụ nên chỉ có kiểu A.
- **Không có trắc nghiệm kiểu B ở Bước 4** (Chốt 18/10, D34): một câu bỏ trống thường điền vừa nhiều từ (`We ___ the app to the server
  yesterday` nhận cả `deployed` lẫn `delivered`), mà không có AI thì hệ thống không kiểm được đáp án nhiễu có vừa câu không, trái D6.
  Trắc nghiệm theo câu để Bước 7, khi AI kiểm được điều đó.
- **Cách đưa cho người học (Chốt 18/10, ⚠16: cách 3):** vẫn ba dạng bài; khi mở phiên người học chọn thêm **"Kiểu đề: theo nghĩa / theo
  câu / trộn"** (`prompt_style` = `meaning` / `sentence` / `mixed`). Sau D34 lựa chọn này chỉ có tác dụng với gõ từ (giao diện có thể ẩn
  nó khi người học không chọn gõ từ).

| Kiểu đề | Trắc nghiệm | Gõ từ | Đúng/sai |
|---|---|---|---|
| Theo nghĩa | Kiểu A | Kiểu A | Theo nghĩa |
| Theo câu | Kiểu A (D34) | Kiểu B; không có câu ví dụ khớp thì kiểu A | Theo nghĩa |
| Trộn | Kiểu A (D34) | Mỗi câu bốc A hoặc B (50/50 khi có câu khớp, ASSUMPTION) | Theo nghĩa |

  Gõ từ theo kiểu đề; trắc nghiệm và đúng/sai luôn theo nghĩa; mặc định khi mở phiên là `mixed` (Chốt 18/10).

### 7.4 Đáp án nhiễu (Chốt 18/10: lấy trong nhóm, bỏ lọc loại từ và level)

Ví dụ: từ cần hỏi `deploy` nằm trong nhóm "IT" (10 từ) và nhóm "Công việc" (8 từ).

1. **Tập ứng viên:** mọi từ trong **các nhóm của người học có chứa từ đang hỏi** (ở ví dụ: hợp hai nhóm "IT" và "Công việc"), dù nguồn
   của phiên là gì (Hôm nay, Ôn tất cả, Theo nhóm, Từ hay sai, Đang ưu tiên). Gồm cả từ catalog và từ riêng của chính người học; không
   bao giờ có từ của người khác. Chỉ lấy nghĩa người học còn thấy được.
2. **Loại** ứng viên:

| Loại nếu | Ví dụ |
|---|---|
| Chính nghĩa đang hỏi, hoặc cùng chữ (không phân biệt hoa thường) | một nghĩa khác của `deploy` cũng nằm trong nhóm |
| Là dạng chia của từ đang hỏi, hoặc ngược lại (`form_of_entry_id`, D29) | `deployed` |
| Chung một nghĩa con tiếng Việt (tách theo `,` `;`, bỏ phần trong ngoặc, chữ thường) | `implement` "triển khai, thực hiện" |

   Không lọc theo loại từ, level, hay từ chức năng (Chốt 18/10: "thêm bộ lọc thì phức tạp hơn mà không tối ưu được").

   **Nghĩa chỉ có tiếng Anh** (Đề xuất, đã duyệt 18/10, R13): nghĩa catalog luôn có nghĩa tiếng Việt (luật publish), nhưng từ riêng của người
   học `native_language = en` chỉ có nghĩa tiếng Anh (`private-words.service.ts`). Khi một trong hai nghĩa không có nghĩa tiếng Việt, so
   nghĩa con trên nghĩa tiếng Anh của cả hai bằng cùng luật tách.
3. **Bốc ngẫu nhiên** 3 ứng viên không trùng chữ nhau; xáo vị trí 4 lựa chọn. Dưới 3 ứng viên khác chữ → không có trắc nghiệm cho từ đó.

Hệ quả: các nhóm chứa từ đó cộng lại phải có ít nhất 4 từ khác chữ thì mới có trắc nghiệm, ít nhất 2 thì mới có đúng/sai.

Rủi ro còn lại (⚠2): nhóm có hai từ đồng nghĩa mà nghĩa tiếng Việt khác chữ (`big` "to", `large` "lớn") vẫn có thể ra câu hai đáp án
đúng. Chặn bằng cách soạn nghĩa tách nghĩa con ("to, lớn", ⚠10) và nút báo lỗi. Rủi ro này rộng hơn với người học `en`: đề kiểu A hiện
định nghĩa tiếng Anh, mà bộ lọc so nghĩa tiếng Việt (sau review, R13).

### 7.4b Đề kiểu B: câu ví dụ bỏ trống, chỉ gõ từ (Chốt 18/10: thiết kế cả hai kiểu; chỉ gõ từ: D34; chi tiết là Đề xuất đã duyệt cùng design)

1. **Chọn câu:** trong các câu ví dụ của nghĩa, lấy ngẫu nhiên một câu có chứa từ (khớp nguyên token với chính từ, cách viết khác, hoặc
   một dạng chia trong `entry_inflections`). Không câu nào khớp → nghĩa đó không có kiểu B.
   - **Token** (Đề xuất, đã duyệt 18/10, R7): chuỗi chữ cái và nháy đơn liền nhau; khoảng trắng, dấu câu, gạch nối tách token. Từ nhiều chữ
     (`look after`) khớp khi các chữ đứng liền nhau đúng thứ tự.
   - **Hoa thường** (sửa sau review, R7): so **phân biệt hoa thường**, trừ chữ cái đầu câu, vì `March` và `march` là hai chữ riêng (D42 của
     Bước 3). Bản trước ghi "không phân biệt hoa thường", sẽ che cả `March` khi hỏi `march`.
   - **Chỉ dùng câu mà mọi chỗ khớp là cùng một chữ** (bỏ qua khác biệt hoa thường ở đầu câu). Câu có cả `deploy` và `deployed` thì không
     dùng (B4E35).
2. **Che** mọi chỗ khớp bằng `___`. Ghi vào `blank` chữ đã che, và chỗ trống là chính từ (`base`) hay một dạng chia.
3. **Gõ từ kiểu B** (⚠16): đáp án chấp nhận là **đúng dạng trong câu** (Chốt: đúng ngữ pháp trước; `deploy` cho chỗ cần `deployed` là
   sai). Khi chỗ trống là chính từ (`base`), nhận thêm cách viết khác có `accepted_as_answer` và `accepted_forms` như 7.6; khi chỗ trống là
   dạng chia, chỉ nhận đúng chữ đó (Đề xuất, đã duyệt 18/10, R7: bảng dạng chia không có dạng chia của cách viết khác như `analysed`).
4. **Gợi ý khi đề là câu:** nấc 1 là định nghĩa ngắn nếu có, không thì nghĩa tiếng Việt (câu ví dụ đã nằm trong đề). Nấc 2 là chữ cái
   đầu và số chữ của dạng trong câu.

**Không có trắc nghiệm kiểu B** (Chốt 18/10, D34; bản trước có bước "trắc nghiệm kiểu B" với đáp án nhiễu chia về cùng dạng). Lý do ở
mục 7.3. Phần đó (đáp án nhiễu chia cùng dạng, chữ ứng với nhiều `kind`, so trùng sau khi chia) chuyển sang Bước 7 cùng trắc nghiệm theo
câu có AI.

Rủi ro: dạng chia trong `entry_inflections` có chỗ sai hoặc thiếu (L18 của Bước 3: `furniture → furnitures`), khi đó câu không khớp được
và nghĩa đó ít câu kiểu B hơn. Mỗi nghĩa chỉ 1–3 câu ví dụ, người học sẽ gặp lại câu cũ khá sớm. Người học gõ một từ khác cũng vừa câu
(`delivered`) thì bị chấm sai, giống rủi ro ⚠11 của kiểu A; giảm bằng làm lại không hiện đáp án ngay, gợi ý nấc 1, và báo lỗi
`graded_wrong`.

### 7.5 Đúng/sai (Chốt)

Bốc theo `true_false_true_percent` (mặc định 50, ASSUMPTION): cặp đúng (từ, nghĩa của nó) hoặc cặp sai (từ, nghĩa của **một** ứng viên ở
mục 7.4). Ứng viên đã qua mọi bộ lọc của 7.4; rủi ro còn lại của ⚠2 (đồng nghĩa khác chữ) vẫn áp cho cặp sai (sửa sau review, R13: bản
trước ghi "cặp sai chắc chắn sai").

**Không hiện nhãn ngữ cảnh (Chốt 18/10, D37, hỏi trong lúc implement Task 13):** đề đúng/sai không có `context_label`, ở cả cặp đúng lẫn
cặp sai (`Prompt.context_label` luôn null với `kind: 'true_false'`), kể cả khi nghĩa đang hỏi có nhãn. Lý do: dữ liệu ứng viên không có
nhãn, nên nếu chỉ cặp đúng có nhãn thì nhìn nhãn là đoán được đáp án; ứng viên không bao giờ cùng chữ với từ hỏi nên nhãn không cần để
phân biệt nghĩa. Trắc nghiệm và gõ từ vẫn hiện nhãn của từ đang hỏi (7.3).

| When | Then |
|---|---|
| Đúng/sai cho `deploy` (nhãn "phần mềm"), cặp đúng | Đề `deploy — triển khai`, `context_label` null |
| Đúng/sai cho `deploy`, cặp sai mượn nghĩa của `deliver` | Đề `deploy — giao hàng`, `context_label` null |
| Trắc nghiệm hoặc gõ từ kiểu A cho `deploy` | Đề có `context_label` "phần mềm" như cũ |

### 7.6 Chấm (Chốt)

- Trắc nghiệm: so vị trí đã chọn với `answer_key`. Đúng/sai: so true/false.
- Gõ từ: chuẩn hóa (NFC, cắt khoảng trắng, gộp khoảng trắng liên tiếp, dấu nháy cong → thẳng, chữ thường), rồi so khớp đúng từng chữ với
  đáp án chính (chính từ đó) và đáp án thay thế (cách viết khác có `accepted_as_answer`, `accepted_forms`), cũng đã chuẩn hóa như vậy.
  Sai chính tả là sai. Không có luật contraction chung; chỉ nhận dạng có trong danh sách (PRC11).

Bảng ví dụ để duyệt hành vi (từ `analyze`, cách viết `analyse` được bật):

| Người học gõ | Kết quả |
|---|---|
| `  Analyse ` | Đúng |
| `analyze` | Đúng |
| `ANALYZE` | Đúng |
| `analyzed` | Sai (không có trong danh sách) |
| `analise` | Sai (sai chính tả) |
| trống, hoặc > 100 ký tự | Lỗi nhập, không tính là sai, không ghi lượt |

Với từ có `accepted_forms` chứa `I'm`: gõ `I’m` (nháy cong) → Đúng.

**Gõ sai thì làm lại (Chốt 18/10, ⚠14).** Chỉ bài gõ từ. Gõ sai lần đầu **không hiện đáp án** (có thể chỉ gõ nhầm); app hiện
"Chưa đúng" và hai nút [Làm lại] [Bỏ qua]. Giữa các lần gõ được xin gợi ý.

| Tình huống | Kết quả |
|---|---|
| Gõ đúng (lần nào cũng vậy) | `correct`. Sai rồi làm lại mới đúng vẫn **tính là đúng** (Chốt) |
| Gõ sai, còn lượt làm lại (`max_retries` trống, hoặc số lần đã làm lại < `max_retries`) | `try_again`, không hiện đáp án |
| Gõ sai, hết lượt làm lại | `wrong`, hiện đáp án |
| Bấm [Bỏ qua] | `wrong`, `skipped`, hiện đáp án, kèm nút "Cần ôn tập" để người học tự bấm (Chốt) |

Ví dụ (`max_retries` = 2): gõ `deplyo` → `try_again`; gõ `deplou` → `try_again`; gõ `deploy` → `correct` (tries = 3). Nếu lần thứ ba vẫn
sai → `wrong`, hiện `deploy`. Với mặc định (để trống = không giới hạn), gõ sai lúc nào cũng là `try_again` cho tới khi gõ đúng hoặc bấm
[Bỏ qua]. [Bỏ qua] chỉ có sau một lần gõ sai (khi đang `try_again`). Cách lưu: mục 5.1 (R8).

**Trắc nghiệm, đúng/sai sai:** báo sai và hiện đáp án ngay (Chốt 18/10); không có làm lại vì làm lại thành đoán.

### 7.7 Gợi ý (Chốt)

| Nấc | Nội dung | Dạng bài |
|---|---|---|
| 1 | **Đề kiểu A:** định nghĩa tiếng Anh nếu có và ≤ `hint_definition_max_chars` ký tự. Nếu không, hoặc nếu nghĩa trong đề đã chính là định nghĩa tiếng Anh: **câu ví dụ đầu tiên có chứa từ** (so cả dạng chia trong `entry_inflections` và cách viết khác, nguyên token, không phân biệt hoa thường), che mọi chỗ khớp bằng `___`. Không câu nào khớp → không có nấc 1. **Đề kiểu B:** xem mục 7.4b | Mọi dạng |
| 2 | Chữ cái đầu và số chữ: `d _ _ _ _ _ (6 chữ)` | Chỉ gõ từ |

Nội dung gợi ý tính sẵn khi tạo câu (`hints`), chỉ gửi xuống khi người học xin. Từ riêng không có định nghĩa và câu ví dụ, nên chỉ có
nấc 2.

### 7.8 Nút sau mỗi câu và trang tổng kết (Chốt 18/10)

Sau mỗi kết quả cuối (`correct` hoặc `wrong`), **"Cần ôn tập" luôn có** (chủ dự án 18/10: làm đúng vẫn giữ nếu người học muốn ôn lại).

| Tình huống | `highlight_needs_review` | `show_known` |
|---|---|---|
| Gõ từ: hết lượt làm lại hoặc bấm Bỏ qua | true | false |
| Trắc nghiệm hoặc đúng/sai mà sai | true | false |
| Đúng, không dùng gợi ý, từ đang tới hạn hoặc đang ưu tiên ("tới hạn" đúng như `wasDue` của `applyAnswer`: có cờ ưu tiên, mức 0, hoặc `due_date` ≤ hôm nay; tính lại lúc bấm; sửa sau review) | false | true |
| Đúng nhờ gợi ý | false | false (Chốt: dùng gợi ý thì không lên mức) |
| Đúng nhưng từ chưa tới hạn (⚠4, D19: "Đã biết" trước hạn không đổi gì) | false | false |
| Từ không còn trong việc học | không có nút nào | |

Bài làm **không** tự đưa từ vào ưu tiên (Chốt 18/10, ⚠15: giữ D16, chỉ người học đổi mức); câu sai tự tính vào "từ hay sai" (mục 8).

Trang tổng kết (Chốt 18/10, ⚠3): **một danh sách "Cần ôn tập: từ A, từ B, từ C…"**, không phân loại. Gồm từ sai (mọi dạng) và từ
đúng nhờ gợi ý; mỗi từ có nút "Cần ôn tập", thêm nút "Đưa tất cả vào ưu tiên" (API 10, áp cho cả danh sách này; Chốt 18/10).
"Cần ôn tập" từ tổng kết vẫn dùng ID lần hỏi làm khóa, nên không trùng với lần bấm ngay sau câu.

**Một từ có nhiều lần hỏi trong phiên** (vòng ≥ 2; Đề xuất, đã duyệt 18/10, R10): dòng của từ đó ở tổng kết dùng **lần hỏi cuối** của từ đó
làm khóa. Từ được coi là "đã bấm" khi bất kỳ lần hỏi nào của nó trong phiên đã bấm "Cần ôn tập" hoặc "Đã biết"; "Đưa tất cả" bỏ qua từ đã
bấm (B4E42). Nút sau từng câu vẫn theo từng lần hỏi như trên.

"Cần ôn tập" và "Đã biết" áp đúng luật Bước 3 (`applyAnswer`): "Cần ôn tập" → mức 1, hẹn hôm nay, bật ưu tiên; "Đã biết" khi tới hạn
hoặc ưu tiên → lên một mức, hẹn theo thang 1/3/7/14/30, bỏ ưu tiên.

## 8. "Từ hay sai" (Chốt 18/10)

- **Lượt được tính** của một nghĩa: lần hỏi có kết quả cuối `correct` hoặc `wrong` (lần hỏi `void` không tính), **trừ** (a) lượt đúng mà `hint_level > 0` (Chốt 10c), (b) lượt có báo cáo
  đang `open` hoặc đã `fixed` (Chốt câu 9: lượt bị báo không tính). Báo cáo kết luận `no_error` → lượt được tính lại. Lượt sai có
  dùng gợi ý vẫn tính là sai. Lượt gõ từ tính theo **kết quả cuối**: làm lại mới đúng là đúng (Chốt ⚠14); Bỏ qua hoặc hết lượt là sai; lượt
  đang `try_again` (chưa có kết quả cuối) chưa tính.
- Một nghĩa là **yếu** khi trong **5 lượt được tính gần nhất** có **≥ 2 lượt sai** (Chốt 10b). Mọi dạng bài đều tính, cả đúng lẫn sai
  (Chốt 10a); lượt luyện lại ở phiên sau cũng tính.
- Chỉ xét lượt còn giữ (mục 11): một từ không luyện tới trong `history_months` tự rời danh sách.
- **Chỉ gồm nghĩa còn trong việc học và còn thấy được** (Chốt 18/10): từ đã "Bỏ khỏi việc học" không nằm trong danh sách.
- Thứ tự trả về của `GET /weak-words`: lần sai gần nhất trước; mỗi dòng kèm lý do "sai 3 trong 5 lần gần nhất" và mức hiện tại.

Bảng ví dụ (mới nhất bên phải; Đ = đúng, S = sai, Đg = đúng nhờ gợi ý):

| Các lượt | 5 lượt được tính gần nhất | Yếu? |
|---|---|---|
| S, S | S, S | Có |
| S, S, Đ, Đ, Đ | S, S, Đ, Đ, Đ | Có |
| S, S, Đ, Đ, Đ, Đ | S, Đ, Đ, Đ, Đ | Không |
| S, S, Đg, Đg, Đg, Đg | S, S (lượt Đg không tính) | Có |
| S (báo lỗi, đang chờ), S | S | Không (chỉ 1 lượt sai được tính) |

## 9. Lịch sử (Chốt: lọc theo ngày, giữ 6 tháng, không xóa)

`GET /v1/practice/history`: lần hỏi đã trả lời, mới nhất trước, phân trang. Lọc `date` (một ngày theo múi giờ người học, so với
`local_date`) và/hoặc `sense_id`. Mỗi dòng: từ, dạng bài, đề, đáp án người học, đáp án đúng, đúng/sai, nấc gợi ý đã xem, đã bấm gì,
thời điểm. Người học không xóa được; dữ liệu tự xóa sau `history_months` (mục 11).

## 10. Báo lỗi (Chốt 18/10)

- **Người học** (`POST /items/{id}/report`): lý do `meaning_wrong` (nghĩa sai), `graded_wrong` (đáp án đúng mà bị chấm sai),
  `hint_wrong` (gợi ý sai), `other`; ghi chú tùy chọn ≤ 300 ký tự. Báo được lần hỏi trong phiên của mình, kể cả trước khi trả lời. Mỗi
  lần hỏi một lần (báo lại → `409 report-exists` kèm báo cáo cũ). Giới hạn tần suất riêng cho báo lỗi: `reports_per_hour` (mặc định 20,
  ASSUMPTION). Cách đếm (Đề xuất, đã duyệt 18/10, R12): Practice tự đếm báo cáo của người đó có `created_at` trong 60 phút gần nhất, vượt →
  `429 rate-limited` kèm `retry-after`, không lưu (B4E40); vì rate limit chung đọc cấu hình cố định lúc khởi động (`config.limits`), không
  đọc Settings.
- **Câu có từ riêng (Chốt 18/10, D36).** Bối cảnh: bản sao câu hỏi chứa chữ và nghĩa của từ đang hỏi, chữ của các đáp án nhiễu (trắc
  nghiệm), và nghĩa của từ dùng làm cặp sai (đúng/sai). Đáp án nhiễu lấy trong nhóm nên có thể là từ riêng của người học (B4#18), kể cả khi
  từ đang hỏi là từ catalog. Bước 3 chốt từ riêng "chỉ chủ thấy" (design Bước 3 mục 7.2), và staff không sửa được từ riêng bằng công cụ
  soạn (truy vấn quản trị chỉ ở catalog). Luật:
  - **Từ đang hỏi là từ riêng:** không có nút báo lỗi. `next`/`current` trả `reportable = false`; gọi API 13 → `409 report-not-available`
    (B4E47). Người học tự sửa từ của mình trong "Từ của tôi".
  - **Từ đang hỏi là từ catalog, trong câu có từ riêng** (đáp án nhiễu, cặp sai của đúng/sai, hoặc đáp án người học đã chọn): vẫn báo được.
    Lúc tạo báo cáo, Practice chụp bản sao **đã che**: chữ của từ riêng thay bằng "[từ riêng của người học]", nghĩa của từ riêng thay bằng
    "[nghĩa của từ riêng]". Bản gốc không lưu vào báo cáo, nên staff không bao giờ thấy, và xóa từ riêng sau đó không phải sửa báo cáo (B4E48).
  - Practice biết một nghĩa có phải từ riêng không nhờ `WordSense.scope` mà `ContentService.cardContent` đã trả.
- **Kết quả đã chấm giữ nguyên**, không chấm lại.
- **Staff** (quyền `content.edit`: `admin`, `editor`; không tạo quyền mới vì lỗi là lỗi nội dung và người sửa nội dung xử lý báo cáo):
  danh sách lọc theo `status`, mỗi dòng có bản sao câu hỏi, đáp án người học, lý do, ghi chú; **không** có email hay tên người báo.
  `resolve` với `no_error` (lượt được tính lại) hoặc `fixed` (staff đã sửa nội dung bằng công cụ soạn có sẵn; lượt tiếp tục không
  tính). Ghi `resolved_by`, `resolved_at`.
- Màn hình admin làm cùng đợt giao diện (Chốt câu 2). Trước đó chưa có người học thật nên chưa có báo cáo phải xử lý.

## 11. Dọn dữ liệu và phiên bỏ dở (Chốt 18/10)

Đăng ký với `MaintenanceScheduler`, chạy **mỗi giờ** (lịch có sẵn của scheduler, trong tiến trình API; sửa sau review, bản trước ghi
"hằng ngày"):

- Xóa lần hỏi có `asked_at` cũ hơn `history_months`; xóa câu hỏi không còn lần hỏi nào trỏ tới; xóa phiên đã kết thúc cũ hơn mốc đó.
  Báo cáo giữ tới khi được xử lý (đã có `question_snapshot`); `item_id` của báo cáo về null khi lần hỏi bị xóa. Báo cáo đã xử lý cũ hơn
  mốc đó cũng bị xóa.
- Phiên `active` hoặc `waiting_continue` không hoạt động quá `idle_session_close_hours` (mặc định 24, ASSUMPTION) → `abandoned`; vì job
  chạy mỗi giờ, phiên có thể đóng trễ tối đa khoảng một giờ. Ngoài job, phiên cũ cũng được đóng ngay khi người học mở phiên mới hoặc thao
  tác lên nó.
- **Xóa từ riêng** (CR23, luật đã có từ Bước 3): Practice xóa câu hỏi, lần hỏi, báo cáo của nghĩa đó **trong cùng transaction** với
  `deleteMyWord` của Learning; vì câu hỏi có lưu nghĩa riêng. **Cách gọi (Đề xuất, đã duyệt 18/10, R2):** `deleteMyWord` nằm trong Learning và
  tự mở transaction, còn Practice gọi Learning; để Learning không phải import Practice, Learning khai báo một cổng (token, như
  `BATCH_SCOPE` của Content), gọi nó trong transaction với danh sách nghĩa sắp xóa; Practice cung cấp phần xóa. Câu hỏi của **từ khác** có
  từ riêng này làm đáp án nhiễu vẫn giữ (chỉ còn chữ, trong lịch sử của chính người học); báo cáo không chứa chữ này vì bản sao đã che
  từ riêng (D36, mục 10).

## 12. Quyền (Chốt: B)

- Module mới `entitlements` (ranh giới cho Bước 5) export một hàm kiểm quyền theo feature; Bước 4 trả "được phép" cho `practice.basic`
  với mọi người dùng đã đăng nhập. Bước 5 thay phần bên trong, không sửa Practice.
- Practice kiểm khi **bắt đầu phiên** và khi **tạo mỗi câu**; **không** kiểm khi chấm (ER4: câu đã tạo vẫn nộp được).
- Người học đã đăng nhập, email chưa xác minh: dùng chung luật truy cập của Learning, tức `@LearnerContent()`: cần hồ sơ có
  `native_language`, không đòi email đã xác minh (đã kiểm `learner-content.guard.ts` trên `dev` @ `fa0533e`).

## 13. Edge cases (When → Then)

| # | When | Then |
|---|---|---|
| B4E1 | Hai tab cùng gọi `next` một lúc | Khóa dòng phiên; chỉ một lần hỏi mới được tạo ở vị trí đó (unique `(session_id, position)`); tab kia nhận đúng lần hỏi đó |
| B4E2 | Hai máy cùng nộp một lần hỏi, đáp án khác nhau | Khóa dòng lần hỏi, chỉ ghi khi `result` còn null (sửa sau review: bản trước ghi "`answered_at` còn null", không đúng khi có làm lại); đúng một bên ghi được, bên kia nhận `409 already-answered` kèm kết quả đã lưu |
| B4E3 | Gửi lại cùng `Idempotency-Key`, cùng đáp án | Trả đúng kết quả đã lưu, không chấm lại |
| B4E4 | Cùng `Idempotency-Key`, đáp án khác | Từ chối theo luật khóa chống trùng chung (SR8) |
| B4E5 | Mở phiên mới khi đang có phiên mở ở thiết bị khác | Phiên cũ `abandoned`; thiết bị cũ thao tác tiếp → `409 session-closed` |
| B4E6 | Nghĩa bị retire hoặc gỡ publish giữa phiên | Như Quizlet (Chốt 18/10): câu đang hiện vẫn chấm theo bản lưu; tải lại trang hoặc xin câu tiếp thì báo "Không tìm thấy từ này", câu đó không tính, sang câu sau. Cách làm (R9): lần hỏi đó thành `void`, `current`/`next` trả `notice: word-not-found` kèm lần hỏi kế tiếp; từ chưa hiện câu nào thì bỏ qua không báo (7.2) |
| B4E7 | Từ bị "Bỏ khỏi việc học" giữa phiên | Như B4E6; câu đang hiện chấm xong không có nút "Cần ôn tập", "Đã biết" (`review` → `409 not-in-learning`) |
| B4E8 | Từ riêng bị xóa giữa phiên | Lần hỏi của nó bị xóa cùng transaction; tải lại hoặc xin câu tiếp thì báo "Không tìm thấy từ này" và sang câu sau |
| B4E8b | Phiên Theo nhóm mà nhóm bị xóa | Tải lại hoặc xin câu tiếp thì báo "Không tìm thấy nhóm này" và kết thúc phiên (Chốt 18/10). Cách làm (R9): phiên `finished`, response `notice: group-not-found`; lần hỏi đang chờ (nếu có) thành `void` |
| B4E9 | Bấm "Đã biết" khi từ chưa tới hạn, hoặc lần hỏi có dùng gợi ý | `409 known-not-allowed`, không ghi nhật ký |
| B4E10 | Bấm "Cần ôn tập" hai lần cho một lần hỏi, hoặc bấm ở tổng kết sau khi đã bấm ngay sau câu | Một lần ghi (khóa là ID lần hỏi); lần sau trả kết quả đã có |
| B4E11 | Bấm "Cần ôn tập" rồi "Đã biết" cho cùng lần hỏi | Lần bấm đầu có hiệu lực; lần sau → `409 review-already-set` |
| B4E12 | Xin gợi ý sau khi đã nộp | `409 already-answered` |
| B4E13 | Xin nấc 2 cho trắc nghiệm, hoặc nấc 1 khi không có | `409 hint-unavailable` |
| B4E14 | Nguồn "Hôm nay" khi người học đã ôn hết phần hôm nay | Không có từ → `practice-no-words` / `source-empty` |
| B4E15 | Chọn chỉ trắc nghiệm, mọi từ của nguồn đều nằm trong nhóm dưới 4 từ, hoặc đều là từ chức năng | `practice-no-words` / `no-word-fits-types` |
| B4E16 | Các nhóm chứa từ có ít hơn 3 ứng viên sau khi loại | Trắc nghiệm không khả dụng cho từ đó; nếu người học chỉ chọn trắc nghiệm, từ bị bỏ qua và lấy từ kế tiếp |
| B4E17 | Đổi múi giờ giữa phiên | `local_date` của mỗi lượt tính theo múi giờ lúc nộp |
| B4E18 | Admin giảm `max_questions_per_session` dưới số câu của một phiên đang mở | Phiên đang mở giữ số câu cũ; phiên mới bị giới hạn theo số mới |
| B4E19 | Admin giảm `history_months` | Lần chạy job kế tiếp xóa theo mốc mới |
| B4E20 | Báo lỗi một lần hỏi đã báo | `409` kèm báo cáo cũ |
| B4E21 | Lần hỏi bị dọn khi báo cáo của nó chưa xử lý | Báo cáo giữ, `item_id` null, staff vẫn xem được nhờ `question_snapshot` |
| B4E22 | `next` khi phiên `waiting_continue` | Trả trạng thái `waiting_continue`, không tạo câu |
| B4E23 | Server lỗi khi đang ghi câu trả lời | Transaction rollback, không có "sai" do lỗi hệ thống; gửi lại cùng khóa là lần thực hiện mới |
| B4E24 | Từ đang hỏi nằm ở hai nhóm | Ứng viên lấy từ cả hai nhóm, mỗi chữ chỉ một lần |
| B4E25 | Admin đổi `type_word_max_retries` khi người học đang ở `try_again` | Lần hỏi đó dùng số đã chụp lúc tạo câu (`max_retries`) |
| B4E26 | Bấm Bỏ qua khi lần hỏi đã có kết quả cuối; với trắc nghiệm hoặc đúng/sai; hoặc trước lần gõ đầu | `409 already-answered`; `409 skip-not-allowed`; `409 skip-not-allowed` |
| B4E27 | Xin gợi ý giữa hai lần gõ | Được; nếu sau đó gõ đúng thì là "đúng nhờ gợi ý" |
| B4E28 | Hai máy cùng gõ lần làm lại | Khóa dòng lần hỏi; xử lý lần lượt, lần tới sau thấy kết quả cuối thì nhận `409 already-answered` |

Thêm sau review độc lập 18/10 (Đề xuất, đã duyệt 18/10; trừ chỗ ghi khác):

| # | When | Then |
|---|---|---|
| B4E29 | Hai `POST /sessions` cùng lúc, hai `Idempotency-Key` khác nhau | Khóa theo người học; yêu cầu sau thấy phiên của yêu cầu trước là phiên đang mở, đóng nó (`abandoned`) như B4E5 rồi tạo phiên của mình; không có lỗi unique |
| B4E30 | `POST /sessions` không có từ dùng được trong khi đang có phiên mở | `409 practice-no-words`; phiên đang mở giữ nguyên |
| B4E31 | Mọi từ còn lại của phiên đều không dùng được (bị gỡ, bỏ khỏi việc học, xóa) | `next` trả `finished`; tổng kết như thường |
| B4E32 | Phiên Theo nhóm, một từ bị bỏ khỏi nhóm nhưng vẫn học ở nhóm khác | Như B4E6 với nhóm đó: câu đang hiện vẫn chấm; tải lại thì `void` + `word-not-found`; từ không được hỏi lại trong phiên |
| B4E33 | Xóa một nhóm khi phiên có nguồn khác Theo nhóm | Từ chỉ thuộc nhóm đó bị bỏ khỏi việc học (D33 của Bước 3) → như B4E7; từ còn ở nhóm khác vẫn được hỏi; câu tạo sau lấy ứng viên từ các nhóm còn lại |
| B4E34 | Bấm "Cần ôn tập"/"Đã biết" khi lần hỏi chưa nộp hoặc đang `try_again` | `409 not-answered`, không ghi gì |
| B4E35 | Câu ví dụ có hai chỗ khớp khác chữ (`deploy` và `deployed`) | Không dùng câu đó cho kiểu B; nghĩa không còn câu nào khác thì không có kiểu B |
| B4E36 | (Bỏ theo D34: ca này chỉ có ở trắc nghiệm kiểu B, đã dời sang Bước 7. Giữ số để không đổi số các ca sau) | — |
| B4E37 | Hỏi `march` (động từ), câu ví dụ có `March` (tháng) | `March` không bị che (so phân biệt hoa thường, D42); câu không có `march` thì không dùng |
| B4E38 | Admin lưu `max_questions_per_session` nhỏ hơn `default_questions_per_session` | 400, không lưu (luật chéo, mục 5.4) |
| B4E39 | Đáp án gõ dài hơn 100 ký tự | 400 `validation-failed`; log của yêu cầu không chứa chữ đã gõ (SR9) |
| B4E40 | Báo lỗi thứ 21 trong 60 phút (`reports_per_hour` = 20) | `429 rate-limited` kèm `retry-after`; báo cáo không được lưu |
| B4E41 | Phiên trắc nghiệm nhanh: 20 câu trong một phút (khoảng 40–60 lần ghi) | Không bị 429 (rule `practice.answer`, R1) |
| B4E42 | `review-all` khi một từ có hai lần hỏi trong phiên (sai ở vòng 1, đúng ở vòng 2, chưa bấm gì) | Một lần ghi "Cần ôn tập" cho từ đó, khóa là lần hỏi cuối; gọi lại → không ghi thêm |
| B4E43 | Bấm "Cần ôn tập" ở tổng kết khi phiên đã `finished`; hoặc khi phiên `abandoned` | `finished`: ghi như thường; `abandoned`: `409 session-closed` |
| B4E44 | Admin để trống `learning.reviews_per_group_per_day` (Chốt, D35) | Danh sách ôn hôm nay của mỗi nhóm gồm mọi từ đến hạn (trừ danh sách cân nhắc); số liệu trang chủ, nhắc học và nguồn luyện "Hôm nay" đếm theo đó; trần từ mới vẫn áp |
| B4E45 | Nhóm đã hết trần từ ôn hôm nay; người học luyện và bấm "Đã biết" cho một từ đến hạn khác của nhóm (Chốt, D35) | Từ lên mức như thường; số lượt ôn đã tính vào trần của nhóm không đổi; flashcard hôm nay có thể đưa ra từ đến hạn kế tiếp |
| B4E46 | Admin lưu trần từ mới để trống | 400, không lưu (trần từ mới bắt buộc, D35) |
| B4E47 | Người học gọi API báo lỗi cho lần hỏi có từ đang hỏi là từ riêng (Chốt, D36) | `409 report-not-available`, không lưu gì; payload của lần hỏi đó đã có `reportable = false` |
| B4E48 | Báo lỗi câu trắc nghiệm `deploy` có lựa chọn là từ riêng `standup`, người học đã chọn `standup`; sau đó người học xóa `standup` (Chốt, D36) | Bản sao lưu "[từ riêng của người học]" ở cả lựa chọn lẫn đáp án người học, không có chữ `standup`; xóa từ riêng không đổi báo cáo; staff không bao giờ thấy chữ gốc |
| B4E49 | Báo lỗi câu đúng/sai của `deploy` ghép với nghĩa của một từ riêng (Chốt, D36) | Bản sao lưu "[nghĩa của từ riêng]" thay cho nghĩa đó |

## 14. Acceptance criteria (When → Then)

| # | When | Then |
|---|---|---|
| B4#1 | Bắt đầu phiên Theo nhóm, nhóm 30 từ, 10 câu, `level_asc` | Phiên có 10 từ mức thấp nhất, mỗi từ một câu, không từ nào lặp |
| B4#2 | Nhóm 2 từ, 10 câu | Sau câu 2 phiên `waiting_continue`; `continue=true` → câu 3–10 xoay quanh 2 từ, không hai câu liền nhau cùng từ khi có ≥ 2 từ, vòng sau đổi dạng bài khi được; `continue=false` → `finished` với 2 câu |
| B4#3 | Tạo câu trắc nghiệm cho `deploy` (nhóm IT) | 4 lựa chọn, đúng một là `deploy`; 3 đáp án nhiễu đều thuộc các nhóm chứa `deploy`, không cùng chữ, không là dạng chia của nhau, không chung nghĩa con tiếng Việt; đề không hiện loại từ (⚠11) |
| B4#4 | Gọi `next` rồi đọc payload | Không có `answer_key`, không có nội dung gợi ý |
| B4#5 | Gõ `  Analyse ` cho `analyze` có cách viết `analyse` | Đúng |
| B4#6 | Gõ `analyzed` (mặc định: làm lại không giới hạn) | Hàm chấm (unit): không khớp. API: `try_again`, không có đáp án; bấm Bỏ qua → `wrong`, `skipped`, trả đáp án đúng, nghĩa, định nghĩa (sửa sau review: bản trước ghi "Sai; trả đáp án" ngay, trái 7.6) |
| B4#7 | Đáp án rỗng | `400`, không ghi lượt |
| B4#8 | Gõ từ sai lần đầu, `max_retries` = 2 | `try_again`, không có đáp án; gõ sai thêm 2 lần → `wrong`, hiện đáp án, `highlight_needs_review = true`; bấm Bỏ qua ở bất kỳ lần nào → `wrong`, `skipped` |
| B4#8b | Gõ sai rồi làm lại đúng | `correct`, `tries` = 2; tính là đúng trong "từ hay sai" |
| B4#9 | Đúng không gợi ý, từ tới hạn | `show_known = true`; bấm → mức +1, hẹn theo thang, bỏ ưu tiên; nhật ký `origin = practice`, `group_id` null |
| B4#10 | Đúng nhờ gợi ý | `show_known = false`; lượt không tính vào "từ hay sai" |
| B4#11 | `review-all` sau phiên có 3 từ trong danh sách tổng kết (sai hoặc đúng nhờ gợi ý), 1 từ đã bấm | 2 từ được đưa vào ưu tiên |
| B4#12 | Một nghĩa có S, S trong lịch sử | Có trong `GET /weak-words` với lý do "sai 2 trong 2 lần gần nhất" |
| B4#13 | Thêm 4 lượt đúng không gợi ý | Rời danh sách |
| B4#14 | Báo lỗi một lượt sai; staff `no_error` | Trong lúc chờ: lượt không tính; sau `no_error`: tính lại |
| B4#15 | `GET /history?date=2026-11-08` | Chỉ lượt có `local_date` ngày đó, của chính người gọi |
| B4#16 | Job dọn chạy với đồng hồ giả qua mốc 6 tháng | Lần hỏi, câu hỏi, phiên cũ bị xóa; báo cáo chưa xử lý còn |
| B4#17 | Staff không có `content.edit` gọi API báo lỗi admin | `403` |
| B4#18 | Từ riêng trong nhóm 10 từ, chọn cả ba dạng | Từ đó ra được cả trắc nghiệm, đáp án nhiễu lấy trong nhóm |
| B4#19 | Từ chỉ nằm trong một nhóm 3 từ | Không có trắc nghiệm cho từ đó; vẫn có đúng/sai và gõ từ |
| B4#20 | Mở phiên mới khi có phiên đang mở | Phiên cũ `abandoned` |
| B4#21 | `GET /sessions/current` sau khi tải lại | Trả phiên đang mở và lần hỏi chưa trả lời (nếu có) |
| B4#22 | Người học xóa từ riêng đã luyện | Câu hỏi, lần hỏi, báo cáo của nghĩa đó bị xóa cùng transaction |
| B4#23 | Phiên kiểu đề "theo câu", chọn trắc nghiệm và gõ từ, từ `deploy` có câu ví dụ chứa `deployed` (sau review, D34) | Câu trắc nghiệm là kiểu A (đề là nghĩa); câu gõ từ là kiểu B (đề là câu đã che `deployed`); gõ `deployed` → `correct`, gõ `deploy` → `try_again` |
| B4#24 | Làm 20 câu đúng/sai liên tiếp trong một phút (sau review) | Không có 429 |
| B4#25 | Tải lại trang khi lần hỏi đang `try_again` (sau review) | `GET /sessions/current` trả lần hỏi đó với `state = try_again` và `tries`, không có đáp án |
| B4#26 | Admin để trống trần từ ôn; nhóm có 150 từ đến hạn (D35) | `GET /v1/groups` báo 150 từ đến hạn hôm nay; `GET /v1/groups/{id}/queue?mode=due` trả đủ 150; đặt lại 100 thì về 100 |
| B4#27 | Nhóm đã ôn đủ 100 từ đến hạn; luyện "Ôn tất cả", đúng và bấm "Đã biết" 5 từ đến hạn còn lại (D35) | 5 từ lên mức; số lượt ôn tính vào trần của nhóm vẫn là 100 (nhật ký có 5 dòng `origin = practice`, `group_id` null) |
| B4#28 | Staff mở danh sách báo lỗi có báo cáo của câu `deploy` với lựa chọn từ riêng `standup` (D36) | Dòng đó hiện "[từ riêng của người học]", không có chữ `standup` ở bất kỳ trường nào của response |
| B4#29 | `next` trả câu hỏi của từ riêng `standup` (D36) | `reportable = false`; gọi API báo lỗi → `409 report-not-available` |

**Test và "Xong khi" (Chốt câu 13):** Bước 4 xong khi mọi task của plan xong và test thành công:
1. CI xanh trên PR (`ci.yml`: lint, typecheck, build, unit, e2e). Hàm thuần (chấm, chia vòng, chọn dạng bài, tính "từ hay sai", nghĩa con
   tiếng Việt) có unit test theo bảng ví dụ; e2e qua Testcontainers như các bước trước.
2. Script `pnpm smoke:buoc-4` chạy qua API thật trên DB mới (kiểu `pnpm smoke:buoc-2`): mỗi nguồn × mỗi dạng bài; một phiên ít từ có
   "Ôn lại"; gợi ý; "Cần ôn tập", "Đã biết", "đưa tất cả"; báo lỗi và staff xử lý; "từ hay sai"; lịch sử theo ngày; job dọn với đồng hồ
   giả. Task cuối của plan chạy hai việc này và ghi as-built vào `docs/deliveries/buoc-4.md`.

## 15. Ảnh hưởng tới các bước sau

- **Bước 5 (Entitlements):** thay phần bên trong của chỗ kiểm quyền (mục 12). Có giới hạn bài luyện theo gói hay không: chưa bàn.
- **Bước 7 (Practice AI):** bài điền từ và "câu chứa từ rồi chọn" là tính năng gói trả phí; không có ngân hàng chung; câu AI đã lưu của
  người học được dùng lại qua bảng lần hỏi (chưa chốt cách dùng lại). Prompt AI phải tránh đưa từ đồng nghĩa của đáp án vào lựa chọn (chủ dự án 18/10; cột từ đồng nghĩa đã bỏ ở Bước 4, Bước 7 tự tính cách làm). Đáp án thay thế
  phải đúng ngữ pháp trong câu. Còn mở cho Bước 7: bài điền từ dùng câu người học đã lưu hay AI tự viết; "đáp án thay thế" có gồm từ đồng
  nghĩa khác chữ không; dạng "câu chứa từ rồi chọn" chọn gì. Danh sách dạng bất quy tắc trong CLAUDE.md giờ chủ yếu là việc của Bước 7,
  vì đã có bảng dạng chia AGID (D46). **Trắc nghiệm theo câu ví dụ (kiểu B)** dời sang đây (D34): chỉ làm khi AI kiểm được đáp án nhiễu
  không điền vừa câu; phần đã nghĩ sẵn ở review 18/10 (đáp án nhiễu chia về cùng dạng; chữ ứng với nhiều `kind` như `deployed` thì ứng
  viên phải có một chữ cho mọi `kind` đó; so trùng trên chữ đã chia) có thể dùng lại.
- **Đợt giao diện:** màn bắt đầu phiên (nguồn, sắp xếp, dạng bài, số câu), màn câu hỏi, gợi ý, kết quả, "Ôn lại thêm không?", tổng
  kết, lịch sử, "từ hay sai", báo lỗi; màn admin danh sách báo lỗi; 8 cài đặt nhóm `practice` trong trang "Thông báo & giới hạn" (trang
  này chưa có trong `apps/admin`).
- **Bước 8 (xóa tài khoản):** xóa phiên, câu hỏi, lần hỏi của người đó; báo cáo giữ ẩn danh (`user_id` null) (PRC27, ASSUMPTION).

## 16. Rủi ro và việc còn mở

- **Code Bước 3 còn có thể đổi (⚠9).** Phần hệ thống Bước 3 đã xong (PR #44); Learning, Content vẫn có thể đổi khi làm giao diện Bước 3.
  Cách xử lý: đọc lại code trên `dev` trước khi viết plan; plan ghi rõ commit đã đọc (review 18/10 đọc `fa0533e`).
- **Sau review (mục 0, R1–R15):** quyết định sản phẩm đã chốt hết (D34–D36), các đề xuất kỹ thuật đã duyệt 18/10. Plan vẫn phải đọc lại
  code trên `dev` vì design dẫn số dòng và tên hàm của commit `fa0533e`.
- **Staff không thấy lỗi do từ riêng gây ra** (D36): ví dụ từ riêng đồng nghĩa với đáp án đúng. Staff vốn không sửa được từ riêng; người học
  tự sửa. Câu hỏi chính là từ riêng không báo lỗi được, nên lượt sai của câu đó vẫn tính vào "từ hay sai".
- **Bài luyện cho người học lên mức nhiều từ hơn trần trong một ngày** (D35): phải làm đúng, không gợi ý, và từ phải đến hạn hoặc đang ưu
  tiên. Đếm được nhờ `origin = practice` trong nhật ký nếu cần xem lại sau pilot.
- **Gõ từ kiểu B chấm sai một từ khác cũng vừa câu** (D34): giảm bằng làm lại, gợi ý nấc 1 và báo lỗi `graded_wrong` (7.4b).
- **Trắc nghiệm phụ thuộc kích thước nhóm (⚠1).** Nhóm nhỏ (các nhóm chứa từ cộng lại dưới 4 từ) thì không có trắc nghiệm cho từ đó.
- **Sót từ đồng nghĩa trong nhóm (⚠2).** Đường phát hiện là nút báo lỗi; giảm bằng cách soạn nghĩa tách nghĩa con (⚠10).
- **Người học bỏ qua gợi ý "Cần ôn tập"** (đã ghi ở design Bước 3 mục 19): đếm được nhờ `origin = practice` trong nhật ký.
- **Gợi ý nấc 1 bằng câu ví dụ** phụ thuộc bảng dạng chia; dạng chia sai hoặc thiếu thì có thể không che được (khi đó không có nấc 1).
- **Các con số ASSUMPTION (⚠6).**

## 17. Tài liệu cần cập nhật sau khi duyệt

Một PR docs nhỏ riêng: `CLAUDE.md` (trỏ tới design Bước 4; bỏ ghi chú "quên khác nhầm" đã bị D16 bỏ; ghi chú dạng bất quy tắc chuyển
về Bước 7) và `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng Bước 4: chỉ API, bỏ "bài từ câu người học"; dòng Bước 7: thêm bài điền từ
từ câu người học và dạng "câu chứa từ rồi chọn"). `docs/specs/` không sửa. Decision record
`docs/superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md` đã viết (D34 = R3, D35 = R4, D36 = R5; các đề xuất sau review đã
duyệt, ghi ở mục "Đề xuất kỹ thuật được duyệt cùng design"). Design Bước 3 mục 9 (bảng cài đặt): thêm một dòng ghi chú trần từ ôn cho phép để trống, trỏ về D35
của Bước 4.
