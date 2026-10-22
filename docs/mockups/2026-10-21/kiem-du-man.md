# Kiểm đủ màn của đợt giao diện (22/10/2026)

Đối chiếu từng yêu cầu của đợt với khung đang có trong Figma `7HcPAKLrWu32C27qYMJUOA`. **Chỉ đọc tài liệu**: không mở Figma, không xem ảnh trong `duyet/`.

**Nguồn:** design [`../../superpowers/specs/2026-10-21-dot-giao-dien-design.md`](../../superpowers/specs/2026-10-21-dot-giao-dien-design.md) §5, §6.2, §6.3
(§10 là việc ngoài đợt, không tính); plan [`../../superpowers/plans/2026-10-21-dot-giao-dien.md`](../../superpowers/plans/2026-10-21-dot-giao-dien.md)
mục Review Focus và các bước của Task 3–11; báo cáo rà [`figma-review.md`](figma-review.md) (dòng "Lệch", và dòng "Thiếu" thuộc phạm vi §5);
danh sách khung [`danh-sach-khung.md`](danh-sach-khung.md) (ground truth); bản chữ [`ban-chu-giao-dien.md`](ban-chu-giao-dien.md) §3–§8, §12;
decision record [`../../superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md`](../../superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md).

**Cách kết luận:**
- **Có**: có khung tên khớp trong danh sách khung, hoặc bản chữ giao chữ cần có cho khung đó (ghi mục bản chữ, viết tắt "§" là mục của bản chữ trong cột ghi chú).
- **Một phần**: có khung cho một phần; ghi rõ phần thiếu. **Thiếu**: không có khung. **Cần xem màn**: khung có, nhưng chỉ nhìn màn mới biết nội dung đạt hay không.
- Yêu cầu chủ dự án đã đổi được tính theo bản đã đổi: K/01b, M/01b thành lỗi ngay ở ô Ngày sinh (mốc A+B, bản chữ §12 điểm 1); mức sử dụng chuyển từ Gói học vào
  Cài đặt (§12 điểm 3, 6); "Level" → "Trình độ" (mốc 0 Q1); ngày sinh sửa được, vẫn đủ 13 tuổi (D12).
- Dòng "Thiếu" của báo cáo rà: chỉ xét phần design §5 nói đợt này vẽ; phần ngoài §5 ghi ở cột ghi chú, không tính vào kết luận.
- Commit message được trích như lời tự báo của phiên vẽ, chưa kiểm lại.
- Danh sách khung đã kiểm bằng script: số khung khớp đầu file (08: 96, 09: 95, 04: 53); mọi khung `K/` ở section 9–10 (33 khung) có bản `M/` cùng số (section 8 có 34, thêm
  M/78d); placeholder chỉ còn A/D01; không còn A/60, A/D02–A/D11, M/60, M/61. Control: tra `M/99` trả "missing".

**Tóm tắt: 146 dòng — Có 137 · Một phần 5 · Cần xem màn 4 · Thiếu 0.** Không dòng nào thiếu hẳn khung; phần chưa có khung nằm trong các dòng "Một phần".

**Sau khi kiểm lại và vẽ bù (Claude, 22/10/2026): 146/146 Có.** Các bảng bên dưới giữ nguyên kết luận lúc chấm; dòng nào đã đổi thì xem ở đây.

| Dòng | Lúc chấm | Đã làm | Bằng chứng |
|---|---|---|---|
| §5 G1 (prototype) | Cần xem màn | Đọc lại từng nút đã nối và đi hết ba luồng | K/70 —[Bắt đầu 10 câu]→ K/73 —sau 1,5 s→ K/78a —[Nộp]→ K/79a; K/74a —[Thử lại]→ K/73 →…; K/85 —[Tra bằng AI]→ K/86 —[Sửa rồi lưu]→ K/87 —[Lưu từ]→ K/88. Chưa bấm ở chế độ Present |
| Review Focus 1 (M/78d) | Cần xem màn | Chạy `figma-checks.js` trên M/78d, xem ảnh (review cuối: `overflowCount` 0 chỉ chứng minh chữ xuống dòng; nút chính thấy trên màn 852 nhờ chân trang dính khi code, ghi ở UI-CONTEXT §10) | `overflowCount` 0; câu 300 ký tự và đủ 3 gợi ý xuống dòng, nút [Nộp] trong khung (khung cao theo nội dung); ảnh `duyet/D-phone/M-78d-cau-AI-dai-nhat.png` |
| Lệch 2.1-4, 2.1-10 (page 00) | Cần xem màn | Viết lại Mục lục; tìm chữ trên page 00 | 0 chữ chứa "7 email", 0 chữ chứa "/app" (đối chứng: "Web Bước 7" tìm thấy 1); ảnh `duyet/dong-dot/muc-luc-figma.png` |
| Review Focus 4 (lịch sử trống) | Một phần | Vẽ `K/57b`, `M/L57b` | bản chữ 7.15b; ảnh `duyet/dong-dot/K-57b-…`, `M-L57b-…` |
| §5 E9, Thiếu 2.5-T19 (gỡ dạng chia đã nhận) | Một phần | Thêm [Hoàn tác] vào dòng báo "Đã thêm…" ở `A/77` | bản chữ 8.7; ảnh `duyet/dong-dot/A-77-hoan-tac.png` |
| Thiếu 2.3-T4 (cấp gói) | Một phần | Vẽ `A/78d` Sửa ngày, `A/79b` xác nhận tắt tự gia hạn | bản chữ 8.8; ảnh `duyet/dong-dot/A-78d-…`, `A-79b-…` |
| Thiếu 2.4-T4 (prompt 409) | Một phần | Thêm dòng lỗi 409 vào `A/82` | bản chữ 8.9; ảnh `duyet/dong-dot/A-82-loi-409.png` |

Script kiểm trên 6 khung vẽ bù hoặc sửa: chữ thấp nhất 4,69:1, không tràn, tối đa một nút vàng, không gờ nút bị cắt.

| Nguồn | Dòng | Có | Một phần | Cần xem màn | Thiếu |
|---|---|---|---|---|---|
| Design §5 | 59 | 57 | 1 | 1 | 0 |
| Design §6.2 | 14 | 14 | 0 | 0 | 0 |
| Design §6.3 | 8 | 8 | 0 | 0 | 0 |
| Review Focus | 5 | 3 | 1 | 1 | 0 |
| Báo cáo rà, dòng "Lệch" | 20 | 18 | 0 | 2 | 0 |
| Báo cáo rà, dòng "Thiếu" thuộc §5 | 40 | 37 | 3 | 0 | 0 |

## Các dòng chưa "Có"

1. **§5 E9 — Một phần.** Dạng chia chưa biết + dạng chia bổ sung: A/77, A/77b có danh sách, nhận, bỏ qua, trạng thái trống. **Không khung nào gỡ một dạng đã nhận**
   (`DELETE /v1/admin/content/word-forms/{id}`, design Bước 7 §10). API không có `GET` danh sách dạng chia bổ sung, nên chỗ gỡ chỉ có thể là nút hoàn tác ngay sau khi
   nhận; bản chữ §8.7 không có nút đó. Plan Task 9 bước 4 không đòi phần này.
2. **§5 G1 — Cần xem màn.** Prototype ba luồng Bước 7: đủ khung, nhưng danh sách khung không chứa link. Xem page 08 ở chế độ trình chiếu: có flow "Web Bước 7: 1/2/3";
   (1) K/70 → K/73 → K/78a → mở gợi ý → nộp → K/79a; (2) K/74a → [Thử lại] → K/73 → K/78a; (3) K/85 → K/86 → K/87 → K/88. Commit `bcc3ee9` tự báo đã nối.
3. **Review Focus 1 — Cần xem màn.** Khung chữ dài nhất có đủ (M/41b, M/L63b, M/78d). Commit `cad86b6` (M/41b) và `903f2e8` (M/L63b) tự báo overflow 0; commit `ee2f092`
   (chứa M/78d) **không ghi kết quả kiểm**. Cần xem M/78d: câu và đủ 3 gợi ý xuống dòng, không đè nhau, nút [Nộp] còn trong màn; chạy `figma-checks.js` → `overflowCount` 0.
4. **Review Focus 4 — Một phần.** Có trạng thái trống cho chưa có nhóm, chưa báo lỗi, không dạng chia chưa biết, chưa cấp gói. **Thiếu "chưa có lịch sử"**: không có
   khung trống của Lịch sử luyện tập (K/57, M/L57, tab "Câu đã làm"), bản chữ cũng không có chữ cho trạng thái này. Plan Task 4, 7, 9 không ghi khung này.
5. **Lệch 2.1-4 — Cần xem màn.** "7 email/tuần": phần admin đã sửa (A/60 xóa; A/70a có `min_gap_days` 1–7 ngày, mặc định 2). Phần **Mục lục (page 00)** không có trong danh
   sách khung: xem page 00 (hoặc `duyet/dong-dot/muc-luc-figma.png`) không còn "7 email/tuần".
6. **Lệch 2.1-10 — Cần xem màn.** Mục lục còn câu "Tiền tố đường dẫn app (/app) sẽ chốt trong plan": xem page 00 câu này đã bỏ hoặc ghi theo D39 (`/vi/app/...`,
   `/en/app/...`); thuộc Task 12 bước 1.
7. **Thiếu 2.3-T4 — Một phần.** Admin cấp gói: có danh sách, lọc, cấp Pro / con số riêng, thu hồi, luật `editor`. **Thiếu hộp xác nhận tắt tự gia hạn** khi cấp Pro cho
   người đang trả tiền (D32 Bước 5): không khung, không chữ. "Sửa ngày" chỉ là tên thao tác trong A/78, không có form. Chưa có cổng thanh toán thật nên tình huống này
   chỉ có với bộ nối giả.
8. **Thiếu 2.4-T4 — Một phần.** Prompt (A/82): có lời dặn, ví dụ, ô dữ liệu, chạy thử 20 lần/giờ, lịch sử. **Thiếu chữ lỗi xung đột khi lưu** (409 `expected_revision`);
   bản chữ §8.9 có chữ 409 cho A/81, không có cho A/82. Design §11 nói màn admin giữ trường hợp biên.
9. **Thiếu 2.5-T19 — Một phần.** Như mục 1 (gỡ dạng đã nhận).

---

## 1. Design §5 — danh sách việc vẽ

| # | Yêu cầu | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| A1 | Đăng ký: Tên (bắt buộc), Họ (không bắt buộc), Ngày sinh (bắt buộc), ô đồng ý Điều khoản + Chính sách bảo mật | K/01, M/01 | Có | §4.1; M/01 gọn lại ở §12 điểm 2 |
| A2 | Lỗi dưới 13 tuổi | K/01b, M/01b | Có | Bản đã đổi: lỗi ngay ở ô Ngày sinh, không màn riêng (mốc A+B điểm 1; §12 điểm 1; §4.2 bỏ) |
| A3 | Tấm Thêm từ bỏ chọn sẵn "Mới thêm", chọn nhóm dùng gần nhất; chưa có nhóm → "Tạo nhóm đầu tiên" (D4) | K/40, K/41, M/50, M/51, M/52; K/40b, M/50b | Có | §4.3, §10. Trạng thái "nhóm dùng gần nhất đã bị xóa → ô trống" có chữ ở §4.3, không có khung riêng; plan Task 3 bước 2 không đòi |
| A4 | Bỏ "tối đa 5 câu"; trang từ ghi số câu đã có; báo khi chạm (D5) | K/44, M/53, K/31, M/41; K/44b, M/53b | Có | §4.4 |
| A5 | "Tất cả nhóm (101)" → tối đa 100 | K/42, M/52; K/16b, M/14 | Có | §4.3 ("Tất cả nhóm (100), A–Z"), §10 |
| A6 | Chữ mặt trước thẻ theo D3 | K/20, K/21, M/30, M/31; K/44 | Có | §4.5; K/44 dòng phụ "Câu hiện ở mặt sau thẻ, từ được tô" (§4.4, §10) |
| A7 | Từ hay sai: báo lỗi đang chờ, đã sửa, đã xác nhận đều không tính | K/56, M/L56 | Có | §4.6; M/L56 dùng chữ của K/56 (§6) |
| A8 | "300 câu AI mới mỗi tháng" kèm điều kiện (trần toàn hệ thống, công tắc AI) | K/52, K/52t, K/53, M/62, M/62b; K/52 · Dark | Có | §4.7 (dòng có dấu * và chú thích) |
| A9 | Màn hết lượt bỏ nút "Xem gói học" (D7) | K/55, M/L55 | Có | §4.8, §10 |
| A10 | (design §7, "sửa thêm vào mảng A") "Thứ Bảy, 18 tháng 10" → "Chủ Nhật, 18/10" | K/10, K/40, K/41, M/10–M/13 | Có | §4.9 |
| B1 | Menu avatar trên web: Cài đặt, Gói học, Đăng xuất | K/90 | Có | §5.1 |
| B2 | Cài đặt → Tài khoản: sửa Tên, Họ, Ngày sinh | K/91, M/91; lối vào ở K/50, M/90 | Có | §5.3; §12 điểm 3 (nút [Sửa] mở K/91, M/91) |
| B3 | Ngày sinh mới dưới 13 tuổi → lỗi ở ô (D12) | K/92, M/92 | Có | §5.4 |
| B4 | Đăng nhập khi tài khoản bị khóa | K/93, M/93 | Có | §5.5 |
| B5 | (design §4, D16) điện thoại bấm avatar vào Cài đặt; trang Cài đặt không có dải tìm kiếm | M/90 (thay M/60), M/63, M/91, M/92, K/50, K/91, K/92 | Có | §5.2 ghi "không có dải tra từ"; §12 điểm 9; commit `24c699c` tự báo "no search text on settings frames" |
| C1 | Trang Luyện tập trên điện thoại | M/L51 | Có | §6; placeholder M/61 đã bỏ |
| C2 | Tùy chỉnh phiên | M/L54 | Có | §6 |
| C3 | Phiên luyện: mỗi kiểu câu, đúng, sai, gợi ý | M/L60–M/L66, M/L63b | Có | Theo K/60–K/67 như §5 ghi. Trắc nghiệm trả lời đúng không có ở cả web lẫn điện thoại (§5 chỉ đòi theo bản web) |
| C4 | Kết thúc phiên | M/L67 | Có | |
| C5 | Từ hay sai | M/L56 | Có | |
| C6 | Lịch sử | M/L57 | Có | Có tab "Báo lỗi của tôi" (§6) |
| C7 | Hết lượt | M/L55 | Có | §4.8 |
| C8 | Gói học Miễn phí và Pro do đội Wordmet cấp | M/62, M/62b | Có | §4.7, §6; hàng "Gói học" của Cài đặt bỏ nhãn "Đang phát triển" (M/90, §5.2) |
| D1 | Mở phiên có kiểu câu AI, nhãn Pro | K/70, K/70t; M/70, M/70t | Có | §7.2 |
| D2 | Nguồn câu của điền từ | K/70, K/70t; M/70, M/70t | Có | §7.2 "Câu lấy từ đâu?" |
| D3 | "Phiên này dùng N lượt AI" | K/70, K/70t; M/70, M/70t | Có | §7.2 "Phiên này dùng tối đa 5 lượt câu AI · còn 287" (chữ "tối đa" là `ASSUMPTION` của bản chữ) |
| D4 | Trạng thái khóa của Miễn phí | K/70b, M/70b | Có | §7.2, §3.3 |
| D5 | Không đủ lượt | K/71, M/71 | Có | §7.3 |
| D6 | Đang tạo câu | K/73, M/73 | Có | §7.5 |
| D7 | Ba kiểu câu AI, đang hỏi | K/78a, K/78b, K/78c; M/78a–M/78c | Có | §7.10 |
| D8 | Gợi ý của ba kiểu câu AI | K/78a (gợi ý 2/3), K/78b, K/78c (1/1); M/78d (đủ 3 gợi ý) | Có | §7.10 |
| D9 | Đã nộp có bản dịch | K/79a, M/79a | Có | §7.11. Chỉ một khung đã nộp (câu điền từ); plan Task 7 bước 3 chỉ đòi một khung |
| D10 | Điền từ từ câu đã lưu | K/79b, M/79b | Có | §7.11; vẽ lúc đã nộp (không bản dịch, không nút báo lỗi), đúng plan Task 7 bước 3 |
| D11 | AI không dùng được + [Thử lại] [Dừng, để sau] | K/74a–K/74d, M/74a–M/74d | Có | §7.6 |
| D12 | Thông báo đổi kiểu câu | K/75, K/75b, M/75, M/75b | Có | §7.7 |
| D13 | Thông báo từ chưa nhận ra | K/76, K/74e, M/76, M/74e | Có | §7.6, §7.8 |
| D14 | Hỏi khi mở phiên mới lúc còn phiên cũ | K/77, M/77 | Có | §7.9 |
| D15 | Báo lỗi theo lý do | K/80, K/80b, M/80, M/80b | Có | §7.12 |
| D16 | Dòng đồng ý cho từ riêng | K/81, M/81 | Có | §7.13 |
| D17 | Tab "Báo lỗi của tôi" | K/82, K/83, M/82, M/83 | Có | §7.14, §7.15 |
| D18 | Thêm từ có "Tra bằng AI" | K/85, K/85t, K/85b, K/85c; M/85, M/85t, M/85b, M/85c | Có | §7.16 |
| D19 | Kết quả: gợi ý AI cạnh nghĩa catalog | K/86, K/86b, M/86, M/86b | Có | §7.17 |
| D20 | Form sửa trước khi lưu, kèm câu ví dụ | K/87, M/87 | Có | §7.18 |
| D21 | Nhãn "AI gợi ý" | K/86, K/86b, K/88; M/86, M/86b, M/88 | Có | §7.17, §7.19 |
| D22 | Mảng D có bản điện thoại | M/70–M/88 (34 khung) | Có | Script: mọi khung `K/` ở section 9–10 có bản `M/` cùng số |
| E1 | Từ | A/87 | Có | §8.1; thay A/D02 |
| E2 | Nghĩa kèm người review / publish / gỡ gần nhất | A/88, A/88b | Có | §8.1 (vẽ email người thao tác, mốc 0 Q2) |
| E3 | Chủ đề | A/89 | Có | §8.1 |
| E4 | Cài đặt hệ thống 6 tab, bỏ "Mẫu email" | A/70a–A/70f | Có | §8.2; A/60 đã xóa (decision, mốc E) |
| E5 | Người dùng: danh sách, chi tiết, khóa/mở | A/71, A/71e, A/72, A/72b | Có | §8.3 |
| E6 | Báo lỗi: lọc, xử lý, xác nhận + trả lượt | A/73, A/73e, A/74, A/74b, A/74c | Có | §8.4 |
| E7 | Lý do báo lỗi | A/75, A/75b | Có | §8.5 |
| E8 | Danh sách trả lượt | A/76 | Có | §8.6 |
| E9 | Dạng chia chưa biết + dạng chia bổ sung | A/77, A/77b | **Một phần** | Có danh sách, nhận, bỏ qua, trạng thái trống (§8.7). Không khung nào gỡ một dạng đã nhận (`DELETE /v1/admin/content/word-forms/{id}`, design Bước 7 §10); API không có `GET` danh sách dạng chia bổ sung, nên chỗ gỡ chỉ có thể là hoàn tác ngay sau khi nhận, §8.7 không có nút đó. Plan Task 9 bước 4 không đòi |
| E10 | Cấp gói và lượt: danh sách, cấp mới, lịch sử | A/78, A/78b, A/78c, A/79, A/79e | Có | §8.8. Xem dòng Thiếu 2.3-T4 (hộp xác nhận tắt tự gia hạn, D32 Bước 5) |
| E11 | AI Bước 6: model, thao tác, prompt (lịch sử, chạy thử), bộ ví dụ và lần chạy, tình trạng, chi phí, các lần gọi | A/80, A/80b, A/81, A/82, A/83, A/84, A/84b, A/85, A/86 | Có | §8.9. Xem dòng Thiếu 2.4-T4 (lỗi xung đột của prompt) |
| E12 | Trang "đang phát triển" có API thay bằng màn thật; Dashboard giữ placeholder | A/D01 | Có | Script: chỉ còn A/D01; A/D02–A/D11, A/60 không còn (decision, mốc E) |
| F1 | Bản tối mẫu: Hôm nay, phiên luyện, Gói học, tấm Thêm từ | K/10 · Dark, K/78a · Dark, K/52 · Dark, K/40 · Dark | Có | Plan Task 11 và bản chữ §11.1 ghi "K/50" cho tấm Thêm từ (K/50 là Cài đặt); khung vẽ đúng tấm Thêm từ (K/40) |
| G1 | Prototype ba luồng Bước 7 trên web | K/70, K/73, K/78a, K/79a; K/74a; K/85, K/86, K/87, K/88 | **Cần xem màn** | Danh sách khung không chứa link. Xem page 08 ở chế độ trình chiếu: có flow "Web Bước 7: 1/2/3"; (1) K/70 → K/73 → K/78a → gợi ý → nộp → K/79a; (2) K/74a → [Thử lại] → K/73 → K/78a; (3) K/85 → K/86 → K/87 → K/88. Commit `bcc3ee9` tự báo đã nối; ảnh từng bước ở `duyet/FG/` |

## 2. Design §6.2 — Bước 7: phiên luyện

| # | Yêu cầu | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| 1 | Miễn phí mở hộp chọn kiểu câu: kiểu AI hiện, ổ khóa, nhãn Pro; bấm → "Dành cho gói Pro. Gói Pro chưa mở bán." + link Gói học; không nút mua | K/70b, M/70b | Có | §7.2, §3.3 |
| 2 | Dùng thử/Pro chọn điền từ → hỏi nguồn câu (AI hay câu đã lưu; câu đã lưu không trừ lượt) | K/70, K/70t, M/70, M/70t | Có | §7.2 |
| 3 | Phiên có câu AI → "Phiên này dùng N lượt AI" | K/70, K/70t, M/70, M/70t | Có | §7.2; con số "tối đa N" là `ASSUMPTION` của bản chữ |
| 4 | 403 `ai-quota-insufficient`: còn, cần, lúc nạp lại; gợi ý giảm số câu hoặc bỏ kiểu AI | K/71, M/71 | Có | §7.3 |
| 5 | 503 `ai-unavailable` (chưa chọn model): "AI tạm chưa dùng được"; phiên không AI vẫn mở được | K/72, M/72 | Có | §7.4 (một câu cho mọi lý do) |
| 6 | `preparing`: "Đang tạo câu…", không nút | K/73, M/73 | Có | §7.5; tự hỏi lại sau 2 giây là hành vi, không vẽ được |
| 7 | Phiên chỉ AI, `ai_unavailable`: bốn lý do + [Thử lại] [Dừng, để sau] | K/74a–K/74d, M/74a–M/74d | Có | §7.6 |
| 8 | Phiên trộn, AI lỗi ở một câu: đổi kiểu câu, báo lần đầu trong phiên | K/75, M/75 (+ K/75b, M/75b hết lượt giữa phiên) | Có | §7.7 |
| 9 | Từ riêng AI không nhận ra: kiểu thường + "Kiểm lại từ trong Từ của tôi"; phiên chỉ AI → màn AI không dùng được kèm lời nhắc | K/76, M/76; K/74e, M/74e | Có | §7.6, §7.8 |
| 10 | Đang hỏi câu AI: điền từ 3 nấc; hai kiểu chọn 1 nấc; điền từ có nút bỏ qua | K/78a–K/78c, M/78a–M/78c, M/78d | Có | §7.10 ("[Bỏ qua, xem đáp án]") |
| 11 | Đã nộp: đáp án, nghĩa; bản dịch cho người học `vi`; không có với câu đã lưu và người học `en` | K/79a, K/79b, M/79a, M/79b | Có | §7.11. Người học `en` không vẽ (mockup chỉ tiếng Việt, design §3; bản chữ §7.17) |
| 12 | Báo lỗi: lý do theo loại câu; ghi chú bắt buộc; tick từ riêng; câu đã lưu không nút báo lỗi | K/80, K/80b, K/81, K/79b (+ bản M/); câu thường: K/66, M/L66 | Có | §7.12, §7.13; 4 lý do seed của câu thường trùng 4 lý do của K/66 (đổi "Lý do khác" → "Khác", §10) |
| 13 | Tab "Báo lỗi của tôi": từ, lý do, bốn trạng thái, "trả 1 lượt" | K/82, M/82 (+ trống K/83, M/83) | Có | §7.14 |
| 14 | Mở phiên mới lúc còn phiên dở: hỏi [Làm tiếp] [Bỏ, mở phiên mới]; ngoài lúc đó chỉ có thẻ ở cột phụ | K/77, M/77; thẻ cột phụ ở K/51 | Có | §7.9; chữ "Phiên đang dở" còn trên page 08/09 (§10, "Không đổi"). Điện thoại không có cột phụ; §6 không nói M/L51 có thẻ phiên đang dở hay không |

## 3. Design §6.3 — Bước 7: tra bằng AI và từ riêng

| # | Yêu cầu | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| 1 | Nút "Tra bằng AI" ở tấm Thêm từ | K/85, K/85t, M/85, M/85t | Có | §7.16 |
| 2 | Miễn phí thấy ổ khóa và nhãn Pro (D6) | K/85b, M/85b | Có | §7.16, §3.3 |
| 3 | Kết quả: nghĩa catalog trước (nếu có), rồi gợi ý AI có nhãn "AI gợi ý" | K/86b, M/86b (có nghĩa catalog); K/86, M/86 | Có | §7.17 |
| 4 | Ô tick "Gửi kèm câu đã gặp cho AI", câu chỉ gửi khi tick | K/85, K/85t, M/85, M/85t | Có | §7.16 (mặc định không tick). Plan Task 7 bước 5 đặt ô này ở K/86; bản chữ đặt ở K/85, tức trước khi tra |
| 5 | Mỗi lần tra trừ 1 lượt tra AI | K/85 ("còn 96 lượt tra AI"), K/86 ("Đã dùng 1 lượt tra AI · còn 95") | Có | §7.16, §7.17 |
| 6 | Form sửa trước khi lưu: nghĩa, loại từ, trình độ, tối đa 2 câu ví dụ | K/87, M/87 | Có | §7.18 ("Level" → "Trình độ", mốc 0 Q1) |
| 7 | Từ riêng mang nhãn "AI gợi ý" | K/88, M/88 | Có | §7.19 |
| 8 | Nhãn mất khi sửa nghĩa, chủ đề, câu ví dụ; còn khi sửa chữ, loại từ, trình độ | K/87 (dòng phụ) | Có | §7.18: "Từ này mang nhãn AI gợi ý tới khi bạn sửa nghĩa, chủ đề hoặc câu ví dụ." Không có khung sửa từ của tôi cho thấy nhãn mất; §5 và plan không đòi |

## 4. Plan — Review Focus

| # | Yêu cầu | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| RF1 | Chữ tiếng Việt dài trên điện thoại xuống dòng, không đè, không đẩy nút chính ra ngoài; Task 3, 6, 8 mỗi task một khung chữ dài nhất; script báo 0 overflow | M/41b (Task 3), M/L63b (Task 6), M/78d (Task 8); lý do báo lỗi dài nhất trên M/80 | **Cần xem màn** | Mẫu chữ ở §4.10. Commit `cad86b6` (M/41b) và `903f2e8` (M/L63b) tự báo overflow 0; commit `ee2f092` (chứa M/78d) không ghi kết quả. Xem M/78d: câu và 3 gợi ý xuống dòng, không đè nhau, nút [Nộp] còn trong màn; chạy `figma-checks.js` → `overflowCount` 0 |
| RF2 | Ba gói (Miễn phí, Dùng thử, Pro) giống nhau ở mọi chỗ có AI; Task 7, 8 vẽ tùy chỉnh phiên và tấm tra AI ở cả ba gói | K/70, K/70t, K/70b; K/85, K/85t, K/85b; M/70, M/70t, M/70b; M/85, M/85t, M/85b; Gói học K/52, K/53, M/62, M/62b | Có | §3.3 (một mẫu khóa cho mọi chỗ có AI), §3.4 (chip), §7.2, §7.16, §7.20. Mốc D-phone sửa chip trên 11 màn web thành "Pro"/"Dùng thử" (decision). Gói học Dùng thử không vẽ (hoãn có chủ đích, báo cáo rà §2.3); RF2 không đòi |
| RF3 | Từ riêng trong câu AI và báo lỗi: staff thấy lựa chọn đã che; tick đồng ý; câu đã lưu không nút báo lỗi | K/81, M/81; A/74, A/74b; K/79b, M/79b | Có | §7.13; §8.4 (A/74: từ được chia sẻ không che, lựa chọn khác vẫn che; A/74b, sửa sau review cuối: câu thường về từ catalog, lựa chọn nhiễu là từ riêng đã che); §7.11 |
| RF4 | Trạng thái trống mời bước tiếp: chưa có nhóm, chưa báo lỗi, chưa có lịch sử, không dạng chia chưa biết, chưa cấp gói | K/94, M/94, K/40b, M/50b; K/83, M/83; A/77b; A/78c; A/73e | **Một phần** | Thiếu "chưa có lịch sử": không có khung trống của Lịch sử luyện tập (K/57, M/L57, tab "Câu đã làm"), bản chữ không có chữ cho trạng thái này. Plan Task 4, 7, 9 cũng không ghi khung này |
| RF5 | Lỗi từ API có khung và chữ: 403 `ai-quota-insufficient`, 503 `ai-unavailable` (chưa chọn model), 403 `account-locked`, dưới 13 tuổi, chạm giới hạn câu | K/71, M/71; K/72, M/72; K/93, M/93; K/01b, M/01b, K/92, M/92; K/44b, M/53b | Có | §7.3, §7.4, §5.5, §12 điểm 1 và §5.4, §4.4 |

## 5. Báo cáo rà Figma — các dòng "Lệch"

Số dòng: mục của báo cáo rà, rồi thứ tự dòng "Lệch" trong mục đó.

| # | Yêu cầu (lệch cần sửa) | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| 2.1-1 | Tấm Thêm từ chọn sẵn nhóm "Mới thêm"; thẻ "Mới thêm" ở Hôm nay | K/40, K/41, M/50, M/51, M/52 (giá trị "Du lịch"); K/40b, M/50b | Có | §4.3, §10; commit `cad86b6`. Thẻ nhóm tên "Mới thêm" ở Hôm nay (K/10, M/10): báo cáo rà tự ghi có thể là nhóm người học tự đặt, §5 chỉ đòi bỏ chọn sẵn. Page 05, 06 (cũ) không sửa, đúng D2 |
| 2.1-2 | "Mỗi nghĩa giữ được 5 câu" / "tối đa 5 câu" | K/44, M/53 (+ K/44b, M/53b) | Có | §4.4, §10. W/44, N/53 ở page cũ không sửa (D2) |
| 2.1-3 | W/44 "Câu này hiện ở mặt trước thẻ", trái W/20 và Mục lục | K/44; K/20, M/30 | Có | §4.4 ("Câu hiện ở mặt sau thẻ, từ được tô"), §4.5. UIC 156 là việc tài liệu của Task 12 |
| 2.1-4 | A/60 "Tối đa email nhắc mỗi tuần: 7 email"; Mục lục "7 email/tuần" | A/70a; page 00 | **Cần xem màn** | Phần admin: Có (A/60 đã xóa; A/70a có `min_gap_days` 1–7 ngày, mặc định 2, §8.2). Phần Mục lục: page 00 không có trong danh sách khung; xem page 00 (hoặc `duyet/dong-dot/muc-luc-figma.png`) không còn "7 email/tuần" |
| 2.1-5 | A/60 khối "Mẫu email" | A/70a | Có | A/60 đã xóa; §8.2 không có khối mẫu, chỉ ghi "Mẫu email: bàn sau." |
| 2.1-6 | A/60 link xem trước `wordmet.com/app/cai-dat` | — (A/60 đã xóa) | Có | Không còn khung chứa link; §8.2 không có phần xem trước email |
| 2.1-7 | A/60 "Từ đến hạn mỗi nhóm: 100" thiếu "để trống = không giới hạn" | A/70b | Có | §8.2 (`reviews_per_group_per_day`, "10–500 hoặc để trống"; "Để trống = không giới hạn") |
| 2.1-8 | A/60 "Chỉnh riêng từng người: Bước 5" | — (A/60 đã xóa) | Có | §8.2 không có dòng này |
| 2.1-9 | "Tất cả nhóm (101), A–Z" | K/42, M/52 | Có | §4.3, §10 |
| 2.1-10 | Mục lục "Tiền tố đường dẫn app (/app) sẽ chốt trong plan" | page 00 (không có trong danh sách khung) | **Cần xem màn** | Xem page 00: câu này đã bỏ hoặc ghi theo D39 (`/vi/app/...`, `/en/app/...`); Task 12 bước 1 |
| 2.2-1 | W/56 thiếu trường hợp `fixed` và `confirmed` | K/56, M/L56 | Có | §4.6 |
| 2.2-2 | A/D05 "ẩn, gỡ hoặc khôi phục câu" | A/73, A/74, A/74c | Có | A/D05 đã xóa; §8.4: Không có lỗi / Đã sửa / Xác nhận lỗi |
| 2.3-1 | W/52 "tra từ và thêm từ không giới hạn" | K/52, K/52t, M/62 | Có | §4.7: "Tra từ, thêm nhanh, tối đa 100 nhóm" |
| 2.3-2 | "300 lượt bài AI mỗi tháng" thiếu điều kiện | K/52, K/52t, K/53, M/62, M/62b | Có | §4.7, §10 |
| 2.3-3 | "Bài AI: Điền từ, câu chứa từ. Sắp có" đã cũ | K/52, K/52t, K/53, M/62, M/62b | Có | §4.7, §10: "Câu AI và tra bằng AI: cần gói Pro", bỏ "Sắp có". Chữ mới không liệt kê từng kiểu câu AI, không nhắc bài từ câu đã lưu (0 lượt) |
| 2.3-4 | A/D09 "đặt trần chi phí mỗi ngày" | A/70d, A/70f | Có | A/D09 đã xóa; trần là `ai_daily_cap` (lượt) và `daily_provider_calls_cap` (lời gọi), §8.2 |
| 2.3-5 | M/60 hàng "Gói học" còn badge "Đang phát triển" | M/90 (thay M/60) | Có | §5.2, §6, §10 dòng cuối; commit `24c699c` |
| 2.4-1 | A/D09 "trần chi phí"; A/D11 "trước khi bật AI cho pilot" | A/70d, A/70f, A/83 | Có | A/D09, A/D11 đã xóa; A/83 (§8.9) không có "pilot" |
| 2.5-1 | Màn Bước 4 sẽ lệch khi có AI: W/63 (2 nấc), W/66 (4 lý do cố định), W/52 (chữ gói) | K/63, M/L63; K/66, M/L66; K/52; câu AI: K/78a, K/80 | Có | §10: K/63 "Gợi ý 1/2" (gõ từ Bước 4 giữ 2 nấc; câu AI 3 nấc ở K/78a); K/66 "Khác", 4 lý do trùng seed câu thường (§7.12); K/52 theo §4.7 |
| 2.6-1 | A/D07 "Dự kiến: Bước 5–8 (chưa chốt)" | A/71, A/72, A/72b | Có | A/D07 đã xóa (commit `a804571`) |

Bảng placeholder ở §2.7 của báo cáo rà ghi "Lệch" cho A/D05 và A/D09: trùng 2.2-2 và 2.3-4, không tính riêng.

## 6. Báo cáo rà Figma — các dòng "Thiếu" thuộc phạm vi §5

Số dòng: mục của báo cáo rà, rồi thứ tự dòng "Thiếu" trong mục đó (`T1` = dòng "Thiếu" đầu tiên).

| # | Yêu cầu | Khung | Kết luận | Ghi chú |
|---|---|---|---|---|
| 2.1-T1 | Chưa có nhóm: mời tạo nhóm đầu tiên khi thêm từ | K/40b, M/50b; K/94, M/94 | Có | §4.3, §5.6 |
| 2.1-T6 | Giới hạn đã đầy (phần thuộc §5: câu mỗi nghĩa, D5) | K/44b, M/53b | Có | §4.4. Ngoài §5: tra từ không có kết quả; đầy 100 nhóm, 2.000 từ mỗi nhóm, 10.000 từ riêng: không có khung |
| 2.1-T7 | Bản tối cho web | K/10 · Dark, K/78a · Dark, K/52 · Dark, K/40 · Dark | Có | D13: màn mẫu thay page riêng |
| 2.2-T1 | Điện thoại: Luyện tập là placeholder | M/L51–M/L57, M/L60–M/L67 | Có | M/61 đã bỏ |
| 2.2-T8 | Admin: hàng chờ báo lỗi, `resolve` no_error / fixed; 8 cài đặt `practice.*` | A/73, A/74, A/74c; A/70c | Có | §8.4; §8.2 (A/70c có 9 khóa, gồm `ai_prefetch_count`) |
| 2.3-T1 | Điện thoại: Gói học placeholder; chưa có Pro được cấp | M/62, M/62b | Có | §4.7, §6 |
| 2.3-T4 | Admin: cấp gói / con số riêng, thu hồi, sửa ngày, lịch sử lọc, xác nhận tắt tự gia hạn, luật `editor` | A/78, A/78b, A/78c, A/79, A/79e | **Một phần** | Có: danh sách và lọc (người học, người cấp, còn hiệu lực, sắp hết hạn), cấp Pro / con số riêng, thu hồi, luật `editor` (§8.8). Thiếu: xác nhận tắt tự gia hạn khi cấp Pro cho người đang trả tiền (D32 Bước 5), không khung, không chữ (ghi chú A/79 chỉ nói cấp mới thay lần cấp đang có); "Sửa ngày" chỉ là tên thao tác trong A/78, không có form. Chưa có cổng thanh toán thật nên tình huống trả tiền chỉ có với bộ nối giả |
| 2.3-T5 | Admin: lượt AI hôm nay so với trần, tô vàng 75%; 15 khóa `entitlements.*`; 4 giới hạn chung | A/70d, A/78; A/70b, A/70e | Có | §8.2 (khối đầu A/70d, đủ 15 khóa), §8.8 |
| 2.4-T1 | Tình trạng từng thao tác | A/84, A/84b | Có | §8.9 |
| 2.4-T2 | Model: nhà cung cấp, danh sách, thêm, xóa (chặn khi đang dùng), đọc lại, sửa giá, ước tính chi phí | A/80, A/80b | Có | §8.9 (409 `model-in-use`) |
| 2.4-T3 | Lựa chọn từng thao tác (model, effort, thinking, token tối đa, xung đột `expected_version`); 6 thao tác; "chưa sẵn sàng" là trạng thái đầu tiên | A/81, A/84b | Có | §8.9 |
| 2.4-T4 | Prompt: lời dặn, ví dụ, ô dữ liệu, chạy thử 20 lần/giờ, lịch sử, xung đột `expected_revision` | A/82 | **Một phần** | Có mọi phần trừ chữ lỗi xung đột khi lưu prompt (409 `expected_revision`): §8.9 có chữ 409 cho A/81, không có cho A/82. Design §11: màn admin giữ trường hợp biên |
| 2.4-T5 | Bộ ví dụ và lần chạy; chi phí theo ngày / thao tác / model / mục đích / kết quả; các lần gọi của `operation_id` kèm nội dung | A/83, A/85, A/86 | Có | §8.9 |
| 2.4-T6 | Nhóm cài đặt `ai` (5 khóa) | A/70f | Có | §8.2 |
| 2.5-T1 | Màn mở phiên: 3 kiểu AI + điền từ từ câu đã lưu, nhãn Pro, dòng lượt | K/70, K/70t, M/70, M/70t | Có | §7.2 |
| 2.5-T2 | Bị từ chối lúc mở phiên: Free chọn AI (403 `entitlement-required`), không đủ lượt, AI chưa sẵn sàng (503 kèm lý do) | K/70b, M/70b; K/71, M/71; K/72, M/72 | Có | Free không tick được kiểu AI nên không tới 403; K/72 một câu cho mọi lý do (§7.4, duyệt ở mốc 0) |
| 2.5-T3 | Ba kiểu câu AI; điền từ từ câu đã lưu không báo lỗi được | K/78a–K/78c, K/79b (+ bản M/) | Có | §7.10, §7.11 |
| 2.5-T4 | Đang tạo câu | K/73, M/73 | Có | §7.5 |
| 2.5-T5 | Phiên chỉ AI lỗi + [Thử lại] [Dừng, để sau]; biến thể hết lượt, AI tắt | K/74a–K/74d (+ bản M/) | Có | §7.6 |
| 2.5-T6 | `ai-fallback` một lần mỗi phiên; biến thể hết lượt | K/75, K/75b (+ bản M/) | Có | §7.7 |
| 2.5-T7 | `word-not-recognized` | K/76, K/74e (+ bản M/) | Có | §7.8 |
| 2.5-T8 | Phiên đang dở [Làm tiếp] [Bỏ, mở phiên mới] | K/77, M/77 | Có | §7.9 |
| 2.5-T9 | Gợi ý 3 nấc cho điền từ, 1 nấc cho hai kiểu chọn, luật lùi nấc | K/78a, M/78d; K/78b, K/78c | Có | §7.10; luật lùi nấc là hành vi, không vẽ |
| 2.5-T10 | Bản dịch tiếng Việt sau khi nộp | K/79a, M/79a | Có | §7.11 |
| 2.5-T11 | Báo lỗi theo lý do admin quản lý, dòng gợi ý trong ô, ô bắt buộc, 3 lý do AI mới, dòng đồng ý từ riêng | K/80, K/80b, K/81 (+ bản M/) | Có | §7.12, §7.13 |
| 2.5-T12 | "Báo lỗi của tôi": trạng thái, "Đã trả lại 1 lượt", "lượt này không trả lại được" | K/82, M/82 | Có | §7.14 (dòng 2, 5) |
| 2.5-T13 | Tra bằng AI: nút kèm số lượt khi không tìm thấy và sau "không phải nghĩa này"; tick mặc định không tick; đang chờ / 409; 503 thử lại được hay không; Free; hết lượt | K/85, K/85t, K/85b, K/85c (+ bản M/) | Có | §7.16. Lối vào thứ hai ("Không phải nghĩa bạn cần?" → [Tra bằng AI]) nằm trong bảng chữ của K/85, mà K/85 là trường hợp không tìm thấy; muốn chắc thì xem K/85, K/85c |
| 2.5-T14 | Kết quả tra AI: nghĩa catalog trước; form sửa mọi ô + 0–2 câu ví dụ; định nghĩa tiếng Anh hiện nhưng không lưu | K/86, K/86b, K/87 (+ bản M/) | Có | §7.17, §7.18 |
| 2.5-T15 | Trang từ: nhãn "Nguồn: AI gợi ý" (mất khi sửa); sửa câu ví dụ của từ riêng | K/88, M/88 | Có | §7.19 (phần thuộc §5: nhãn). Ngoài §5: form sửa từ của tôi / câu ví dụ không có khung (K/88 chỉ có nút [Sửa]) |
| 2.5-T16 | Admin: lý do báo lỗi | A/75, A/75b | Có | §8.5 |
| 2.5-T17 | Admin: danh sách báo lỗi lọc trạng thái, lý do, nguồn; thông tin AI; kết luận và trả lượt | A/73, A/73e, A/74, A/74b, A/74c | Có | §8.4 |
| 2.5-T18 | Admin: danh sách trả lượt | A/76 | Có | §8.6 |
| 2.5-T19 | Admin: dạng chia chưa biết (xếp theo số lần bị loại, nhận, bỏ qua, gỡ dạng đã nhận) | A/77, A/77b | **Một phần** | Như §5 E9: thiếu gỡ dạng đã nhận |
| 2.5-T20 | Admin: `practice.ai_prefetch_count` | A/70c | Có | §8.2 |
| 2.6-T1 | Form đăng ký: Tên, Họ, Ngày sinh, ô đồng ý | K/01, M/01 | Có | §4.1 |
| 2.6-T2 | Dưới 13 tuổi (`age-below-minimum`) | K/01b, M/01b | Có | §12 điểm 1 |
| 2.6-T3 | Đăng nhập khi bị khóa (403 `account-locked`) | K/93, M/93 | Có | §5.5 |
| 2.6-T4 | Hồ sơ: xem, sửa Tên, Họ (ngày sinh: theo D12 sửa được, vẫn đủ 13 tuổi) | K/50, M/90, K/91, M/91, K/92, M/92 | Có | §5.3, §5.4, §12 điểm 3 |
| 2.6-T5 | Admin người dùng: tìm, lọc trạng thái, chi tiết, khóa có lý do, 409 `lock-rule`, mở khóa | A/71, A/71e, A/72, A/72b | Có | §8.3 |
| 2.6-T7 | Admin: người review / publish / đổi trạng thái nghĩa | A/88b | Có | §8.1 |

**Dòng "Thiếu" ngoài phạm vi §5 (không xét):** §2.1 tạo / đổi tên nhóm trên web (vẫn vẽ ở mốc A+B: K/17, K/17b, M/13b), cảnh báo bỏ từ khỏi nhóm cuối, sửa / xóa
Từ của tôi và câu đã gặp, dòng "email chưa xác minh"; §2.2 trắc nghiệm trả lời đúng, thông báo `word-not-found` / `group-not-found`, 409 `practice-no-words`,
`report-exists` và câu hỏi về từ riêng không báo lỗi được, số lần làm lại / `hint-unavailable`, trạng thái trống của Từ hay sai và Lịch sử (phần Lịch sử trùng RF4);
§2.3 Trial và Pro trả tiền (hoãn có chủ đích), con số riêng với 0 phiên; §2.6 tạo tài khoản staff có Họ / Tên, lớp phiên admin.
