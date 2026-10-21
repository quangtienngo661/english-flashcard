# Đợt giao diện — mockup đầy đủ cho app người học và admin — Design (21/10/2026)

> **Trạng thái 21/10/2026:** chủ dự án duyệt bốn phần của design trong chat ("ok" từng phần); bản viết này chờ chủ dự án duyệt.
> **Chỉ mockup Figma, không code** (D1). Quyết định và mọi phương án đã đưa ra: [`../decisions/2026-10-21-dot-giao-dien-decisions.md`](../decisions/2026-10-21-dot-giao-dien-decisions.md).
> **Đầu vào:** báo cáo rà Figma [`../../mockups/2026-10-21/figma-review.md`](../../mockups/2026-10-21/figma-review.md) (21/10/2026; "Có / Thiếu / Lệch" theo
> từng bước và 13 câu hỏi), [`../../mockups/2026-10-16/UI-CONTEXT.md`](../../mockups/2026-10-16/UI-CONTEXT.md) (các quyết định giao diện từ Bước 3), design các
> bước 3–7 và đợt sửa thiếu sót Bước 0–3 trên `dev` (API đã xây xong, chỉ chưa có giao diện).
> **File Figma:** `7HcPAKLrWu32C27qYMJUOA` ("Wordmet — UI Bước 3 (người học + admin)").
> **Nhánh:** `docs/dot-giao-dien-design` (cắt từ `origin/dev` @ `80838bc`).

Nhãn: **Chốt** = chủ dự án chọn; **Đề xuất** = Claude đề xuất, chủ dự án đã duyệt cùng phần chứa nó; `ASSUMPTION` = chưa kiểm chứng.
Từ câu 3 trở đi, chủ dự án nhờ Claude đề xuất trước ("lần này không liên quan đến hệ thống, nên cho mình các recommend của từng câu"); xem decision record.

## 1. Mục tiêu và bối cảnh

Bước 3–7 đã có API trên `dev` (Bước 3 phần hệ thống; Bước 4–7 chỉ API) và đợt sửa thiếu sót Bước 0–3 đã merge. Giao diện bị để lại: Figma mới vẽ tới
Bước 5 trên web, điện thoại chỉ có Bước 3, admin phần lớn là trang "đang phát triển", Bước 7 và đợt sửa Bước 0–3 chưa có màn nào (báo cáo rà Figma, mục 1).

Mục tiêu của đợt: **mockup đầy đủ** cho mọi thứ API đã làm được, đủ để đợt code sau dựng màn mà không phải đoán. Người dùng là chủ dự án (duyệt) và
phiên code sau này (đọc màn). Thành công = mọi màn ở mục 5 có trên Figma, các chỗ lệch của báo cáo rà đã sửa, ba luồng Bước 7 bấm thử được, chủ dự án
"ok" từng mảng (mục 9).

## 2. Quyết định (tóm tắt)

| # | Quyết định | Chọn |
|---|---|---|
| D1 | Phạm vi đợt | Đủ giao diện mọi mảng, chỉ mockup; một đợt, theo thứ tự mục 8 |
| D2 | Bố cục | Hướng B: web page 08, điện thoại page 09 (thay G1 chốt 20/10); page 03, 05, 06 đổi tên "(cũ, không dùng)", dời cuối, chưa xóa |
| D3 | Mặt trước thẻ ôn | Từ + loại từ; mặt sau nghĩa + câu đã gặp, tô từ |
| D4 | Nhóm chọn sẵn ở tấm Thêm từ | Nhóm dùng gần nhất; chưa có nhóm → "Tạo nhóm đầu tiên" |
| D5 | Giới hạn câu ngữ cảnh | Không ghi trên màn; báo khi chạm |
| D6 | Người Free và tính năng AI | Hiện, có ổ khóa và nhãn Pro; bấm thì một dòng giải thích + link Gói học |
| D7 | Nút "Xem gói học" ở màn hết lượt | Bỏ |
| D8 | "Báo lỗi của tôi" | Tab trong Lịch sử luyện tập |
| D9 | Phiên đang dở | Thẻ ở cột phụ; hỏi chỉ khi mở phiên mới lúc còn phiên cũ |
| D10 | Cài đặt admin | Một trang "Cài đặt hệ thống", 6 tab theo nhóm của API; bỏ khối "Mẫu email" |
| D11 | Màn admin | Vẽ trên page 04 ở mức khung; **vẽ cả màn AI của Bước 6** |
| D12 | Hồ sơ người học | Tên, Họ, Ngày sinh sửa ở Cài đặt → Tài khoản; ngày sinh mới vẫn phải đủ 13 tuổi; ô đồng ý trỏ `/terms` có sẵn |
| D13 | Bản tối | Chế độ Dark của biến màu + 4–5 màn mẫu; không vẽ page riêng |
| D14 | Chữ giao diện | Research cách viết tiếng Việt tự nhiên, dễ đọc → bản chữ giao diện → chủ dự án duyệt trước khi vẽ; mockup chỉ tiếng Việt |
| D15 | Cách vẽ | Vẽ thẳng trong Figma, bỏ bước mockup HTML; prototype cho 3 luồng Bước 7 |
| D16 | Chỗ của Cài đặt | Web: trong menu thả xuống của avatar; điện thoại: như page 09 (bấm avatar vào Cài đặt); cả hai: trang Cài đặt ẩn dải tìm kiếm |

## 3. Phạm vi

**Làm:** mockup trong file Figma trên cho app người học (web page 08, điện thoại page 09) và admin (page 04, mức khung), cùng các chỗ phải sửa của báo cáo rà.

**Không làm:** code (kể cả `apps/web`, `apps/admin`); app Flutter (UI-CONTEXT §8); bản tiếng Anh của màn (kiểm khi code, D14); nội dung trang Điều khoản
(việc trước ra mắt); đổi API (mục 10).

## 4. Khung chung (D2, D13, D16)

- **Web (page 08):** thanh trên hai tầng (điều hướng Hôm nay · Nhóm · Luyện tập · Tra từ, nút Thêm từ, chip gói, avatar; dải tra từ nền trắng ở mọi
  trang chính), nội dung tối đa 1440px, cột phụ 360px; Gói học phủ toàn màn; phiên ôn và phiên luyện toàn màn như cũ.
- **Điện thoại (page 09):** thanh trên 175px (logo, chip gói, avatar, dải tra từ) ở mọi màn chính; tab dưới Hôm nay · Nhóm · Luyện tập · Tra từ; nút +
  nổi ở Hôm nay, Danh sách nhóm, Tra từ.
- **Cài đặt:** web mở từ menu thả xuống của avatar (D16); điện thoại bấm avatar vào thẳng Cài đặt; trang Cài đặt ở cả hai nền tảng **không có dải tìm kiếm**.
- **Bản tối:** mọi màu gắn biến; xem bằng chế độ Dark của biến. Đặt 4–5 màn mẫu ở chế độ Dark (Hôm nay, phiên luyện, Gói học, tấm Thêm từ). Trước đó gắn
  biến cho hai bóng đổ đang tô cứng `#0f1a3d` 35% (nút `Ink`, nút "Thêm từ"; UI-CONTEXT §5).
- **Page cũ:** 03 (web G1), 05 và 06 (điện thoại cũ, sáng/tối) đổi tên "(cũ, không dùng) …" và dời xuống cuối. Không xóa trong đợt này: page 09 dùng lại
  nhiều tấm và hộp thoại của page 05 và có thể dùng component gốc nằm ở đó; xóa khi đã chuyển component gốc về 01 Foundations.
- **Mục lục (page 00)** và UI-CONTEXT cập nhật theo các mục trên.

## 5. Danh sách việc vẽ (khoảng 100 khung, `ASSUMPTION`)

Ký hiệu khung giữ quy ước hiện có: web `K/xx` (page 08), điện thoại `M/xx` (page 09), admin `A/xx` (page 04).

| Mảng | Nội dung | Khoảng |
|---|---|---|
| **A. Sửa chỗ lệch** (báo cáo rà, các dòng "Lệch") | Form đăng ký K/01, M/01: thêm Tên (bắt buộc), Họ (không bắt buộc), Ngày sinh (bắt buộc), ô đồng ý Điều khoản + Chính sách bảo mật, lỗi dưới 13 tuổi; tấm Thêm từ bỏ chọn sẵn "Mới thêm" (D4); bỏ "tối đa 5 câu" (D5); "Tất cả nhóm (101)" → tối đa 100; chữ mặt trước thẻ thống nhất theo D3; trang Từ hay sai ghi đủ: lần đã báo lỗi đang chờ, đã sửa hoặc đã xác nhận đều không tính; "300 câu AI mới mỗi tháng" kèm điều kiện (trần toàn hệ thống, công tắc AI; design Bước 7 §19); màn hết lượt bỏ nút "Xem gói học" (D7) | 8–10 |
| **B. Tài khoản** | Menu avatar trên web (Cài đặt, Gói học, Đăng xuất: **Đề xuất** thêm trong bản viết); Cài đặt → Tài khoản: sửa Tên, Họ, Ngày sinh, lỗi ngày sinh dưới 13 tuổi (D12); màn đăng nhập khi tài khoản bị khóa | 5–6 |
| **C. Điện thoại: Luyện tập và Gói học** | Theo bản web K/51–K/57, K/60–K/67: trang Luyện tập, tùy chỉnh phiên, phiên luyện (mỗi dạng, đúng, sai, gợi ý), kết thúc phiên, Từ hay sai, Lịch sử, hết lượt; Gói học Free và Pro do đội Wordmet cấp | ~16 |
| **D. Bước 7 cho người học** (web và điện thoại) | Mở phiên có dạng AI (nhãn Pro, nguồn câu điền từ, "Phiên này dùng N lượt AI", trạng thái khóa của Free, không đủ lượt); đang tạo câu; ba dạng câu AI (đang hỏi, gợi ý, đã nộp có bản dịch); điền từ từ câu đã lưu; AI không dùng được + [Thử lại] [Dừng, để sau]; thông báo đổi dạng; thông báo từ chưa nhận ra; hỏi khi mở phiên mới lúc còn phiên cũ; báo lỗi theo lý do + dòng đồng ý cho từ riêng; tab "Báo lỗi của tôi"; Thêm từ có "Tra bằng AI" (kết quả, gợi ý AI cạnh nghĩa catalog, form sửa trước khi lưu kèm câu ví dụ); nhãn "AI gợi ý" | ~25 × 2 |
| **E. Admin, mức khung** (page 04) | Cài đặt hệ thống (6 tab); Người dùng (danh sách, chi tiết, khóa/mở); Báo lỗi (lọc, xử lý, xác nhận + trả lượt); Lý do báo lỗi; Danh sách trả lượt; Dạng chia chưa biết + dạng chia bổ sung; Cấp gói và lượt (danh sách, cấp mới, lịch sử); AI của Bước 6: model, thao tác, prompt (lịch sử, chạy thử), bộ ví dụ và lần chạy, tình trạng, chi phí, các lần gọi | ~20 |
| **F. Bản tối mẫu** | Hôm nay, phiên luyện, Gói học, tấm Thêm từ ở chế độ Dark | 4–5 |
| **G. Prototype** | Ba luồng Bước 7 trên web: (1) mở phiên AI → đang tạo câu → câu AI → gợi ý → nộp → bản dịch; (2) AI không dùng được → Thử lại → câu AI; (3) Thêm từ → Tra bằng AI → sửa → lưu thành từ riêng | — |

Trang admin "đang phát triển" đã có API (báo cáo rà §2.7) được thay bằng màn thật ở mảng E; Dashboard giữ placeholder (chưa có API).

## 6. Luật nội dung của từng màn

Mockup thể hiện đúng hành vi design và API đã quyết; phần này chỉ ghi những gì người vẽ cần biết. Nguồn: design Bước 7 §5–§9, §11, §13; design Bước 4, 5;
design và decision record đợt sửa Bước 0–3.

### 6.1 Người học, phần chung

- **Thẻ ôn (D3):** mặt trước chỉ từ và loại từ; mặt sau nghĩa và câu đã gặp, từ được tô.
- **Tấm Thêm từ (D4):** ô Nhóm chọn sẵn nhóm dùng gần nhất (app nhớ; không cần API mới), đổi được; nhóm đó đã bị xóa → trống, bắt buộc chọn; chưa có
  nhóm nào → "Tạo nhóm đầu tiên". Không có nhóm mặc định của hệ thống (D43 Bước 3).
- **Câu ngữ cảnh (D5):** trang từ ghi số câu đã có ("3 câu đã gặp"); không ghi giới hạn; thêm khi đã chạm giới hạn (mặc định 20, admin chỉnh 5–100) → báo
  "Nghĩa này đã đủ … câu, xóa bớt một câu để thêm". `ASSUMPTION`: chưa kiểm lỗi API có kèm con số giới hạn; không có thì dùng câu chung.
- **Màn hết lượt (D7):** nói giờ mở lại, mời ôn flashcard, không có nút "Xem gói học".
- **Tài khoản (D12):** Cài đặt → Tài khoản có Tên, Họ, Ngày sinh, đều sửa được. Ngày sinh mới dưới 13 tuổi → lỗi ngay ở ô ("Bạn cần đủ 13 tuổi").
  Sửa ngày sinh cần đổi API (mục 10); màn vẽ theo hành vi sau khi đổi.
- **Đăng ký:** Tên, Họ, Ngày sinh, email, mật khẩu, ô đồng ý Điều khoản và Chính sách bảo mật (link `/terms`, `/privacy` đã có trên landing, nội dung
  đang là bản nháp). Dưới 13 tuổi → không tạo tài khoản, màn báo lý do. Tài khoản bị khóa → màn đăng nhập báo "Tài khoản đang bị khóa" (API trả 403
  `account-locked` khi đúng mật khẩu).

### 6.2 Bước 7: phiên luyện

| Khi | Màn thể hiện |
|---|---|
| Người Free mở hộp chọn dạng bài | Dạng AI (điền từ AI, chọn nghĩa trong câu, trắc nghiệm theo câu) hiện, có ổ khóa và nhãn Pro; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." + link Gói học; không nút mua (D6) |
| Trial/Pro chọn điền từ | Hỏi thêm nguồn câu: AI tạo, hay câu bạn đã lưu (bài từ câu đã lưu không trừ lượt) |
| Phiên có câu AI | Dòng "Phiên này dùng N lượt AI" (N = số câu AI dự tính) |
| Không đủ lượt khi mở phiên (403 `ai-quota-insufficient`) | Còn bao nhiêu, cần bao nhiêu, lúc nào lượt được nạp lại; gợi ý giảm số câu hoặc bỏ dạng AI |
| Admin chưa chọn model cho thao tác cần dùng (503 `ai-unavailable`) | "AI tạm chưa dùng được"; mở phiên không có dạng AI vẫn được |
| `next` trả `preparing` | "Đang tạo câu…"; app tự hỏi lại sau 2 giây; không có nút |
| Phiên chỉ dạng AI, `ai_unavailable` | Một trong bốn lý do công khai: AI lỗi (`ai-failed`), hết lượt (`quota-exhausted`, kèm giờ nạp lại), cần gói (`plan-required`), AI đang tắt (`ai-unavailable`); nút [Thử lại] (gửi `retry_ai`) và [Dừng, để sau] |
| Phiên trộn, AI lỗi ở một câu | Câu đó là dạng thường; thông báo đổi dạng chỉ ở lần đầu trong phiên |
| Từ riêng AI không nhận ra | Câu đó là dạng thường + "Kiểm lại từ trong Từ của tôi" (link tới từ đó); phiên chỉ AI thì màn AI không dùng được kèm cùng lời nhắc |
| Đang hỏi câu AI | Gợi ý: điền từ 3 nấc (chữ cái đầu → định nghĩa → nghĩa); chọn nghĩa trong câu và trắc nghiệm theo câu 1 nấc (định nghĩa). Điền từ có nút bỏ qua |
| Đã nộp câu AI | Đáp án đúng, nghĩa; bản dịch tiếng Việt của câu cho người học `vi` (không có với bài từ câu đã lưu, không có với người học `en`) |
| Báo lỗi | Danh sách lý do theo loại câu (câu AI / câu thường) do admin quản lý; lý do bắt buộc ghi chú thì ô ghi chú bắt buộc; câu AI hỏi về từ riêng → phải tick "Cho đội Wordmet thấy từ này"; bài từ câu đã lưu không có nút báo lỗi |
| Lịch sử luyện tập, tab "Báo lỗi của tôi" (D8) | Mỗi báo cáo: từ, lý do, trạng thái Đang xem / Không có lỗi / Đã sửa / Đã xác nhận, thêm "trả 1 lượt" khi đã trả |
| Mở phiên mới lúc còn phiên đang dở (D9) | Hỏi "Bạn có phiên đang dở 6/10" [Làm tiếp] [Bỏ, mở phiên mới]; ngoài lúc đó chỉ có thẻ phiên đang dở ở cột phụ |

### 6.3 Bước 7: tra bằng AI và từ riêng

- Nút "Tra bằng AI" ở tấm Thêm từ; người Free thấy ổ khóa và nhãn Pro (D6).
- Trial/Pro: kết quả có nghĩa catalog trước (nếu chữ có trong catalog), rồi gợi ý của AI có nhãn "AI gợi ý"; ô tick "Gửi kèm câu đã gặp cho AI" (câu chỉ
  gửi đi khi tick); mỗi lần tra trừ 1 lượt tra nghĩa.
- Lưu gợi ý thành từ riêng: form sửa trước khi lưu (nghĩa, loại từ, level, tối đa 2 câu ví dụ). Từ riêng mang nhãn "AI gợi ý"; nhãn mất khi sửa nghĩa,
  chủ đề hay câu ví dụ, còn khi chỉ sửa chữ, loại từ hay level (as-built Bước 7, lựa chọn 3 của plan).

### 6.4 Admin (mức khung)

- **Cài đặt hệ thống (D10):** một trang, 6 tab theo nhóm của API: Nhắc học, Học và ôn, Luyện tập, Gói và lượt, Nội dung, AI. Mỗi ô ghi khoảng cho phép;
  mỗi lần lưu ghi lại. Không có khối "Mẫu email" (chưa có API; ghi "bàn sau").
- **Người dùng:** chỉ `admin`; tìm từ 2 ký tự, không phân biệt hoa thường; mới nhất trước, 20 người mỗi trang; khóa và mở khóa; ngày sinh chỉ ở trang chi tiết.
- **Báo lỗi:** lọc theo lý do và nguồn câu; câu thường xử lý "Không có lỗi" / "Đã sửa", câu AI "Không có lỗi" / "Xác nhận lỗi"; ghi người xử lý và vai trò;
  xác nhận lỗi của câu đã trừ lượt với lý do có trả lượt → trả lượt.
- **Lý do báo lỗi:** chỉ `admin`; thêm, sửa, tắt (không xóa); mỗi lý do có tên tiếng Việt và tiếng Anh, áp cho loại câu nào, bắt buộc ghi chú không, có trả lượt không, thứ tự.
- **Danh sách trả lượt:** chỉ `admin`; lọc theo người xử lý và khoảng ngày; đánh dấu báo cáo do chính người học đó tự xử lý (staff tự báo, tự xác nhận).
- **Dạng chia chưa biết:** `admin` và `editor`; sắp theo số lần bị loại; nhận (thêm vào dạng chia bổ sung) hoặc bỏ qua.
- **Cấp gói và lượt:** theo luật Bước 5 (`editor` cấp Pro, không đặt con số lượt AI tùy ý, chỉ thu hồi lần cấp của người học thường; `admin` thấy lịch sử
  cấp của editor và thu hồi).
- **AI (Bước 6):** chỉ `admin`; model, lựa chọn của từng thao tác (model, effort, thinking, số token tối đa), prompt có lịch sử và chạy thử, bộ ví dụ và các
  lần chạy, tình trạng, chi phí, các lần gọi.

## 7. Chữ giao diện (D14)

1. Research cách viết chữ giao diện tiếng Việt tự nhiên, dễ đọc (nguồn chính thức và kinh nghiệm các app Việt) → `docs/mockups/2026-10-21/vietnamese-ux-writing-research.md`.
2. Claude viết **bản chữ giao diện** `docs/mockups/2026-10-21/ban-chu-giao-dien.md`: bảng thuật ngữ cho các khái niệm của Wordmet và chữ cho từng màn ở mục 5.
3. Chủ dự án duyệt bản chữ giao diện **trước khi vẽ** mảng A.
4. Bảng thuật ngữ áp cho mọi màn của page 08 và 09, kể cả màn đã có (chỉ sửa chữ, không sửa bố cục).
Mockup chỉ tiếng Việt; bản tiếng Anh kiểm khi code.

## 8. Cách làm và duyệt (D1, D15)

- Thứ tự: bản chữ giao diện → A và B → C → D (web trước, điện thoại sau) → E → F và G.
- Claude vẽ trực tiếp trong file Figma, dùng lại component có sẵn (trang 01 Foundations và các component của page 08, 09); không vẽ mockup HTML trước.
- Mỗi mảng A–G là một mốc duyệt: Claude gửi ảnh các màn của mảng, chủ dự án "ok" thì sang mảng sau.
- Kiểm mỗi mốc: chữ đạt tương phản ≥ 4,5:1, nét icon ≥ 3:1 (như lần kiểm 20/10); không lớp tràn khung; mỗi màn một nút vàng; chữ đúng bảng thuật ngữ;
  mọi dòng của bảng 6.2 có màn.

## 9. "Xong khi"

1. Mọi dòng của mục 5 có màn trên đúng page.
2. Các dòng "Lệch" của báo cáo rà Figma đã sửa.
3. Ba luồng prototype của mảng G bấm thử được trên web.
4. Mục lục (page 00) và UI-CONTEXT cập nhật; page cũ đã đổi tên và dời cuối.
5. Chủ dự án "ok" từng mảng A–G.

## 10. Việc ngoài đợt (ghi lại, chưa làm)

- **API:** cho sửa ngày sinh qua `PATCH /v1/me`, ngày mới vẫn phải đủ 13 tuổi (D12; đổi lựa chọn "ngày sinh không sửa qua API" đã duyệt cùng design đợt sửa Bước 0–3).
- **Design Bước 7 §6.7:** sửa câu chữ theo D9 (app hỏi khi mở phiên mới, không hỏi mỗi lần mở Luyện tập); API không đổi.
- **Design Bước 6 D8:** ghi rằng màn AI của admin đã vẽ trong đợt này (D11).
- **Khi code:** kiểm bản tiếng Anh của mọi màn (D14).

## 11. Rủi ro và việc còn mở

- **Khối lượng** khoảng 100 khung là ước tính từ báo cáo rà (`ASSUMPTION`); số thật biết sau mảng A–C.
- **Component gốc** có thể nằm trên page 05 (cũ); chưa kiểm. Không xóa page cũ cho tới khi chuyển xong (mục 4).
- **Thanh trên 175px trên điện thoại** chiếm khoảng 1/5 màn ở mọi màn chính; xem lại khi vẽ màn dài (phiên luyện, danh sách từ).
- **Admin sẽ làm lại hình thức** (ghi chú 15/10/2026); màn admin của đợt này ở mức khung, chỉ giữ cấu trúc và trường hợp biên.
- **Bản chữ giao diện phụ thuộc kết quả research**; nếu research đổi thuật ngữ đang dùng, các màn cũ của page 08, 09 phải sửa chữ (mục 7, bước 4).

## 12. Tài liệu cần cập nhật

- Decision record [`../decisions/2026-10-21-dot-giao-dien-decisions.md`](../decisions/2026-10-21-dot-giao-dien-decisions.md) (cùng nhánh).
- Plan (writing-plans, sau khi bản viết này được duyệt): task theo mảng A–G; bản tóm tắt ở `docs/deliveries/dot-giao-dien.md`.
- Khi xong: UI-CONTEXT (bố cục B, page cũ, các quyết định D3–D16), Mục lục Figma, CLAUDE.md (một dòng trỏ tới đợt giao diện).
