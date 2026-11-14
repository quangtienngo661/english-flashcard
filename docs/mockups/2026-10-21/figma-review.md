# Review mockup Figma của Wordmet theo từng Bước (21/10/2026)

Figma file `7HcPAKLrWu32C27qYMJUOA` ("Wordmet — UI Bước 3 (người học + admin)"), đọc ngày 21/10/2026, **chỉ đọc** (không sửa Figma).
Đối chiếu với: design các Bước trên `origin/dev` @ `80838bc` (Bước 3, 4, 5, 6, 7, đợt sửa thiếu sót Bước 0–3), `CLAUDE.md` trên `origin/dev`,
`docs/deliveries/buoc-2-5.md`, và bản **working tree** (chưa commit) của [`../2026-10-16/UI-CONTEXT.md`](../2026-10-16/UI-CONTEXT.md) cùng
`../2026-10-20/` (gồm `danh-gia-web-g1.md`, `edu-layouts/figma-ket-hop/README.md`, `edu-layouts/figma-mobile-ket-hop/README.md`).

Viết tắt nguồn: **B3** = `docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md`; **B4** = `…/2026-10-18-buoc-4-practice-design.md`;
**B5** = `…/2026-10-19-buoc-5-entitlements-design.md`; **B6** = `…/2026-10-20-buoc-6-ai-integration-design.md`;
**B7** = `…/2026-10-21-buoc-7-practice-ai-content-ai-design.md`; **FX** = `…/2026-10-20-buoc-0-3-fixes-design.md`; **UIC** = UI-CONTEXT.md (working tree,
số dòng). Các design này nằm trên `origin/dev`; nhánh đang checkout (`docs/buoc-7-done`) chưa có B7.

Cột "Figma" ghi tên khung và node id (`page:node`). Cách kiểm và giới hạn: mục 5.

---

## 1. Tóm tắt

1. **Bước 7: không có màn nào** (API xong 21/10): thiếu 3 dạng câu AI, cloze từ câu đã lưu, "dùng N lượt AI", "đang tạo câu", AI lỗi + Thử lại/Dừng, `ai-fallback`, gợi ý 3 nấc, bản dịch, báo lỗi theo lý do, "Tra bằng AI", 4 màn admin.
2. **Sửa Bước 0–3:** form đăng ký (W/01, N/01, K/01, M/01) thiếu Tên, Họ, Ngày sinh, ô đồng ý điều khoản; không có màn dưới 13 tuổi, tài khoản bị khóa, sửa tên; admin "Người dùng" còn là placeholder.
3. **Admin:** 10/11 trang "đang phát triển" nay đã có API; màn AI của Bước 6 chỉ có 3 placeholder (D8: chủ dự án tự làm); không có chỗ cho 33 khóa cài đặt của Bước 4–7.
4. **A/60 lệch đã chốt:** "tối đa 7 email/tuần" (D44: cách nhau 1–7 ngày, mặc định 2); khối sửa mẫu email mà B3 §8.4 và API không có; link `/app/cai-dat` sai D39.
5. **Điện thoại thiếu Bước 4–5:** Luyện tập là placeholder ở 05, 06, 09; Gói học là placeholder ở 05, 06.
6. **N/50 chọn sẵn nhóm "Mới thêm"** trong tấm Thêm từ, đọc như nhóm mặc định đã bỏ ở D43 (cả 06 và 09 chép theo).
7. **Lệch nhỏ:** "5 câu mỗi nghĩa" (Bước 5 mặc định 20); W/44 "câu hiện ở mặt trước thẻ" trái W/20 và Mục lục; W/52 "thêm từ không giới hạn", "300 lượt AI" thiếu điều kiện B7 §19.
8. **Page 08, 09** (đề xuất 20–21/10, chưa duyệt) chưa có trong Mục lục và UI-CONTEXT; 08 bỏ sidebar trái G1 đã chốt. Cần chốt trước khi vẽ Bước 7, nếu không phải vẽ hai lần.
9. **Số màn khớp Mục lục** (03 = 41, 04 = 26, 05 = 34, 06 = 34); 06 khớp 05 hoàn toàn (34/34 tên, chữ giống hệt).
10. **Chưa kiểm:** link prototype, màu, tương phản; chữ đọc từ tên text layer, chỉ 3 khung được chụp ảnh đối chiếu (mục 5).

---

## 2. Theo từng Bước

### 2.1 Bước 3: học, ôn, tra từ, thêm từ, nhắc học (người học) và trang "Thông báo & giới hạn"

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Đăng ký, đăng nhập, OTP, quên và đặt lại mật khẩu, chọn ngôn ngữ lần đầu | W/01–W/06 (`202:187`…`202:365`); N/01–N/06 (`44:8`…`44:165`) | B3 §3; UIC 59 |
| Có | Hôm nay (danh sách nhóm), trang nhóm với hộp Leitner 6 ngăn, lọc theo ngăn, menu ⋯ (đổi tên, học tất cả, xóa), xóa nhóm ghi rõ số từ chỉ có trong nhóm | W/10 `193:9`, W/10b `237:7472`, W/11–W/14; N/10–N/14, N/20–N/22, N/24 | B3 §6; UIC 31–42 |
| Có | Danh sách cân nhắc "Lâu chưa ôn" với Học lại / Bỏ khỏi việc học / Để đó | W/15 `193:1274`; N/23 `47:721` | UIC 39–40 |
| Có | Phiên ôn 2 nút "Cần ôn lại" / "Đã biết", mặt trước chỉ từ + loại từ | W/20–W/22 (`202:94`, `202:119`, `202:163`); N/30–N/32 | UIC 34–35, 159 |
| Có | Tra từ có lọc level, chủ đề, loại từ, "Chỉ từ của tôi"; trang từ kiểu Cambridge, dòng dạng chia, link "dạng chia của…" | W/30–W/33 (`197:8`…`197:523`); N/40–N/43 | B3 §7.1, §7.3 |
| Có | Thêm nhanh (nhận ra `went`), tự nhập nghĩa, lưu vào nhóm (tìm hoặc tạo nhóm), thêm cả loạt (bỏ từ chức năng), thêm câu đã gặp | W/40–W/44 (`199:10`…`199:1393`); N/50–N/53, N/52b, N/52c, N/44 | B3 §7.1, §7.4 |
| Có | Cài đặt: ngôn ngữ, giao diện, nhắc học qua email; **không** có dòng múi giờ (đúng UIC 60) | W/50 `201:8`; N/60 `51:731`, N/63 `119:113` | UIC 59–62 |
| Có | Admin "Thông báo & giới hạn"; xuất CSV "Từ chưa có nghĩa" | A/60 `24:766`; A/30 `23:614` | UIC 26; B3 §9 |
| Thiếu | Người chưa có nhóm nào: lời mời tạo nhóm đầu tiên khi thêm từ (web và điện thoại) | — | UIC 48; B3 §7.1 (D43) |
| Thiếu | Web: hộp tạo nhóm và hộp đổi tên nhóm (W/13 có mục "Đổi tên nhóm" nhưng không có màn; `danh-gia-web-g1.md` mục 6 ghi cố ý chưa nối vì chưa có màn). Điện thoại có N/13 Tạo nhóm, không có đổi tên | W/13 `193:790` | B3 §10 (`POST`/`PATCH /v1/groups`) |
| Thiếu | Cảnh báo khi bỏ từ khỏi **nhóm cuối cùng** chứa nó (W/11 có nút "Bỏ khỏi nhóm", không có hộp cảnh báo) | W/11 `193:221` | UIC 41–42; B3 §10 |
| Thiếu | "Từ của tôi": sửa, xóa từ riêng; xóa một câu đã gặp | — | B3 §7.2, §10 (`PATCH`/`DELETE /v1/my-words`, `DELETE /v1/sentences/{id}`) |
| Thiếu | Email chưa xác minh: dòng "Xác minh email để nhận nhắc học qua email" (N/60 chỉ vẽ "Đã xác minh email") | N/60 `51:731`; W/50 | B3 §8.2 (D36) |
| Thiếu | Tra từ không có kết quả; giới hạn đã đầy (100 nhóm, 2.000 từ mỗi nhóm, 10.000 từ riêng, câu mỗi nghĩa) | — | B5 §5.2, §13 |
| Thiếu | Bản tối riêng cho web (Mục lục: đổi khung sang chế độ Dark là xem được; chưa page nào kiểm) | — | UIC 103, 136 |
| Lệch | Tấm "Thêm từ" chọn sẵn **Nhóm = "Mới thêm"**; thẻ nhóm "Mới thêm" ở Hôm nay; page 09 chép theo. Nhóm này có menu Đổi tên/Xóa (N/11 `45:377`) nên có thể chỉ là nhóm người học tự đặt, nhưng ô chọn sẵn đọc như nhóm mặc định cũ D28 | N/50 `50:4585` (đã chụp ảnh), N/10–N/13, N/51, N/52 và bản tối; M/50–M/52 | B3 §2, §7.1 (D43: không có nhóm mặc định, bắt buộc chọn hoặc tạo); UIC 42, 48 |
| Lệch | "Mỗi nghĩa giữ được 5 câu" / "tối đa 5 câu" | W/44 `199:1393`, K/44 `275:8964`, N/53 `50:5017`, N/53 tối `120:1926`, M/53 `292:13771` | B5 §13 và D18: `sentences_per_sense` mặc định **20** (5–100). (B3 §7.4 và UIC 56 còn ghi 5, chưa cập nhật) |
| Lệch | W/44 ghi "Câu này hiện ở mặt trước thẻ, từ được che", trong khi W/20 và N/30 chỉ có từ + loại từ ở mặt trước, và Mục lục ghi "Mặt trước thẻ: chỉ từ và loại từ". UIC 156 vẫn để câu "mặt trước thẻ" là câu hỏi mở | W/44 `199:1393`; W/20 `202:94`; Mục lục `27:4838` | UIC 156 |
| Lệch | A/60: "Tối đa email nhắc mỗi tuần: 7 email"; Mục lục cũng ghi "7 email/tuần" | A/60 `24:766` (đã chụp ảnh); Mục lục `27:4842` | B3 §8.2, §9 (D44: hai email cách nhau ít nhất 1–7 ngày, mặc định 2); UIC 65, 182 |
| Lệch | A/60 có khối "Mẫu email": sửa Tiêu đề/Nội dung theo loại (Nhắc học, Lâu chưa vào học) × VI/EN, "Gửi thử cho tôi", Xem trước | A/60 `24:766` | B3 §8.4 (một mẫu viết sẵn trong code; mẫu theo loại "bàn sau"); UIC 67; B3 §10 không có API mẫu email |
| Lệch | A/60 phần xem trước: link tắt nhắc `wordmet.com/app/cai-dat` | A/60 `24:766` | D39 (B3 dòng 88): `/vi/app/...`, `/en/app/...`; email trỏ `<LEARNER_APP_URL>/<native_language>/app/settings` (UIC 171) |
| Lệch | A/60 "Từ đến hạn mỗi nhóm: 100" không thể hiện lựa chọn "để trống = không giới hạn" | A/60 `24:766` | B3 §9 (sửa theo D35 Bước 4), B4 §5.4 |
| Lệch | A/60 dòng đầu "Chỉnh riêng từng người: Bước 5": Bước 5 chỉ cho staff đặt riêng số phiên luyện và lượt AI, không có ghi đè riêng cho các cài đặt nhắc học hay trần ôn của trang này | A/60 `24:766` | B5 §5.3–5.4, §10 |
| Lệch | Danh sách "Lưu vào nhóm" ghi "Tất cả nhóm (**101**), A–Z": vượt giới hạn 100 nhóm mỗi người (Mục lục mô tả N/14 là "khi có 100 nhóm") | W/42 `199:504`, K/42 `275:8211`, N/52 `79:1825` (và bản tối), M/52 `292:12595` | B5 §5.2, §13 (`groups_per_user` mặc định 100, D17) |
| Lệch | Mục lục "Tiền tố đường dẫn app (/app) sẽ chốt trong plan": đã chốt | Mục lục `27:4841` | D39 (B3 dòng 88) |

### 2.2 Bước 4: luyện tập không AI

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Trang Luyện tập "Bắt đầu ngay" + 4 nguồn khác (Theo nhóm, Từ hay sai, Đang ưu tiên, Ôn tất cả), thẻ "Lượt luyện hôm nay", "Phiên đang dở" ở cột phụ, khối "Gần đây" | W/51 `201:176` | B4 §2 (5 nguồn); UIC 121–126 |
| Có | Tùy chỉnh phiên: nhóm + lọc ngăn, 3 dạng bài, kiểu đề Theo nghĩa/Theo câu/Trộn (chỉ cho gõ từ), số câu tối đa 20, thứ tự trong "Thêm tùy chọn" | W/54 `209:1602` | B4 §2, §5.4 (max 20), §7.4b |
| Có | Phiên luyện toàn màn: trắc nghiệm (chưa trả lời, chọn sai), đúng/sai (đúng), gõ từ theo câu có gợi ý 2 nấc, gõ sai → Làm lại / Bỏ qua, hết vòng 1 hỏi "Ôn lại thêm?" một lần, báo lỗi 4 lý do + ghi chú 300, tổng kết một danh sách "Cần ôn lại" + "Đưa … vào ưu tiên" | W/60–W/67 (`215:1539`…`217:1743`) | B4 §6, §7.6–7.8, §10 |
| Có | Từ hay sai (luật 2/5, lý do vào/rời) và Lịch sử lọc theo ngày, theo từ | W/56 `220:1800`; W/57 `220:1976` | B4 §8, §9 |
| Có | Page 08 chép y hệt phần chữ (K/51, K/54–K/57, K/60–K/67) | `276:2349`…`273:2069` | — |
| Thiếu | **Điện thoại**: Luyện tập chỉ là "Đang phát triển" ở cả 05, 06 và 09 | N/61 `51:830`, N/61 tối `120:2194`, M/61 `293:2305` | CLAUDE.md (dev): Bước 4 đã xong API |
| Thiếu | Trắc nghiệm trả lời đúng (UIC tự ghi chưa vẽ) | — | UIC 136 |
| Thiếu | Lần hỏi bị `void`: "Không tìm thấy từ này" (`notice: word-not-found`); nhóm bị xóa giữa phiên (`notice: group-not-found`) | — | B4 §2, §6 API 3 (D31, B4E8b); UIC 136 |
| Thiếu | Không mở được phiên: `409 practice-no-words` với 3 lý do (`group-empty`, `no-word-fits-types`, `source-empty`) | — | B4 §6 |
| Thiếu | Câu hỏi về từ riêng không có nút Báo lỗi (`reportable = false`); câu đã báo rồi (`report-exists`); xác nhận sau khi gửi báo lỗi | — | B4 §10 (D36), §6 |
| Thiếu | Gõ từ hết số lần làm lại khi admin đặt `type_word_max_retries`; không có nấc gợi ý (từ riêng chỉ có nấc 2, `hint-unavailable`) | — | B4 §5.4, §7.7, §7.8 |
| Thiếu | Trạng thái rỗng: Từ hay sai rỗng, Lịch sử một ngày không có lượt | — | B4 §8, §9 |
| Thiếu | Admin: hàng chờ báo lỗi và `resolve` (`no_error` / `fixed`); 8 cài đặt `practice.*` | A/D05 `25:1266` (placeholder); không có trên A/60 | B4 §10, §5.4 |
| Lệch | W/56 ghi "Không tính … lượt bạn đã báo lỗi **khi đội Wordmet chưa xem xong**": thiếu trường hợp báo cáo đã `fixed` (không tính vĩnh viễn) và, từ Bước 7, `confirmed` | W/56 `220:1800`, K/56 `276:3501` | B4 §8 (lượt có báo cáo `open` hoặc đã `fixed`); B7 §8 |
| Lệch | A/D05 mô tả "ẩn, gỡ hoặc khôi phục câu": không có ngân hàng câu chung, staff chỉ kết luận `no_error` / `fixed` (Bước 7 thêm `confirmed`) | A/D05 `25:1266` | B4 §2 (D3), §10; B7 §9.3 |

### 2.3 Bước 5: gói, hạn mức, cấp tay

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Gói học Free: 1/3 phiên hôm nay, mở lại 0:00, thẻ Pro "Chưa mở bán" (không giá, không nút), bảng so sánh 3/30 phiên, 300 bài AI, 100 tra nghĩa | W/52 `201:274` | B5 §5.2 (D18), §7.4; UIC 127 |
| Có | Pro do đội Wordmet cấp: hạn 31/12/2026, không tự gia hạn, lượt AI làm mới theo mốc ngày cấp (15/11) | W/53 `219:1604` | B5 §5.5 (D13), §10 (D20) |
| Có | Hết 3 phiên hôm nay: nói giờ mở lại, mời ôn flashcard; phiên đang dở vẫn làm tiếp được | W/55 `219:1798` | B5 §7.4; UIC 126 |
| Có | Đề xuất (chưa duyệt): K/52, K/52t (tối, tham khảo), K/53; M/62 Free trên điện thoại | `265:844`, `260:508`, `277:2349`; `293:2657` | READMEs của page 08, 09 |
| Thiếu | **Điện thoại**: Gói học là "Đang phát triển" ở 05/06; page 09 có M/62 (Free) nhưng chưa có Pro được cấp | N/62 `51:878`, N/62 tối `120:2202`; M/62 `293:2657` | CLAUDE.md (dev): Bước 5 đã xong API |
| Thiếu (hoãn có chủ đích) | Trial, Pro trả tiền (gia hạn, ân hạn, đặt hủy, đổi tháng ↔ năm): vẽ cùng cổng thanh toán thật | — | UIC 127–128; B5 §8 (trước khi có thanh toán thật không có trial) |
| Thiếu | Cấp "con số riêng": tài khoản Free có lượt AI; số phiên = 0 → `plan-required` **không** có giờ mở lại (W/55 chỉ có biến thể "mở lại 0:00") | — | B5 §5.3–5.4, §10 |
| Thiếu | Admin: cấp gói / con số riêng, thu hồi, sửa ngày lần cấp, lịch sử lọc (người học, người cấp, còn hiệu lực, sắp hết hạn N ngày), xác nhận tắt tự gia hạn, luật của `editor` | A/D08 `25:1569` (placeholder) | B5 §10, §12.2 API 2–5 |
| Thiếu | Admin: lượt AI hôm nay so với trần, tô vàng khi chạm 75%; 15 cài đặt `entitlements.*` (gồm công tắc AI, trần, ngưỡng cảnh báo, quảng cáo, `grace_days`, nhắc trial) và 4 giới hạn chung (nhóm, từ mỗi nhóm, từ riêng, câu mỗi nghĩa) | Không có cả placeholder | B5 §12.2 API 6 (D36), §13 |
| Có (đúng quyết định) | Không vẽ quảng cáo | — | UIC 129; B5 §11 (công tắc mặc định tắt) |
| Lệch | W/52: "tra từ và thêm từ **không giới hạn**", trong khi chính bảng so sánh của màn ghi "100 nhóm, 2.000 từ mỗi nhóm" | W/52 `201:274` | B5 §5.2 (giới hạn chung 100 nhóm, 2.000 từ/nhóm, 10.000 từ riêng, 20 câu/nghĩa) |
| Lệch | "300 lượt bài AI mỗi tháng" không kèm điều kiện trần toàn hệ thống và công tắc AI | W/52, W/53, K/52, K/53, M/62 | B7 §19 ("tối đa 300 câu AI mới mỗi tháng" kèm điều kiện) |
| Lệch | "Bài AI: Điền từ, câu chứa từ. Sắp có": Bước 7 có 3 dạng AI (thêm trắc nghiệm theo câu) và bài điền từ từ câu đã lưu (Trial/Pro, 0 lượt); chữ "Sắp có" đã cũ vì API xong | W/52 `201:274`, W/53 `219:1604` | B7 §5, D11 |
| Lệch | A/D09 "đặt trần **chi phí** mỗi ngày": trần là số lượt (`ai_daily_cap`, "đếm bằng lượt") và số lời gọi (`ai.daily_provider_calls_cap`), không phải tiền | A/D09 `25:1670` | B5 D18, §13; B6 §13 |
| Lệch (nội bộ) | M/60 hàng "Gói học" vẫn gắn badge "Đang phát triển" trong khi M/62 đã vẽ và chip "Gói Free" mở M/62 | M/60 `293:2095` | README page 09 (prototype) |

### 2.4 Bước 6: cổng AI (chỉ màn admin)

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Chỉ placeholder: Cài đặt AI, Chi phí & đối soát, Bộ ví dụ; Dashboard nhắc "chi phí AI hôm nay"; sidebar có nhóm "AI" | A/D09 `25:1670`, A/D10 `25:1771`, A/D11 `25:1872`, A/D01 `25:862`; Admin/Sidebar `21:152` | B6 D8 (chủ dự án tự làm màn admin AI) |
| Thiếu | Tình trạng từng thao tác (dùng được không, lý do, lỗi gần nhất, lời gọi hôm nay / trần, chi phí hôm nay, model sắp ngừng, nhà cung cấp nào có key) | — | B6 §12.1 API 1 |
| Thiếu | Model AI: chọn nhà cung cấp, danh sách, thêm, xóa (chặn khi đang dùng), đọc lại, sửa giá; effort / thinking chọn được; ước tính chi phí | — | B6 §6, §12.1 API 2–6 |
| Thiếu | Lựa chọn cho từng thao tác (model, effort, thinking, số token tối đa, xung đột `expected_version`). Sau Bước 7 có **6** thao tác; 3 thao tác mới được seed **không có model**, nên trạng thái "chưa sẵn sàng" là điều admin gặp đầu tiên | — | B6 §6.3, §12.1 API 7–8; B7 §15; CLAUDE.md (dev) |
| Thiếu | Prompt: sửa lời dặn và ví dụ, danh sách ô dữ liệu, chạy thử (giới hạn 20 lần/giờ), lịch sử, xung đột `expected_revision` | — | B6 §7, §12.1 API 9–12 |
| Thiếu | Bộ ví dụ và lần chạy (tiến độ, kết quả); chi phí theo ngày / thao tác / model / mục đích / kết quả; các lần gọi của một `operation_id` kèm nội dung khi còn hạn | — | B6 §10, §12.1 API 13–17 |
| Thiếu | Nhóm cài đặt `ai` (5 khóa: thời gian chờ, số lời gọi cùng lúc, trần lời gọi mỗi ngày, số ngày giữ nội dung, tỷ giá) | — | B6 §13 |
| Lệch | A/D09 "trần chi phí" (xem 2.3). A/D11 "trước khi bật AI cho **pilot**": không còn pilot | A/D09, A/D11 | B5 D18; D12 Bước 3 (CLAUDE.md dev) |

### 2.5 Bước 7: Practice AI + Content AI

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Không có màn nào. UIC ghi rõ "không có thẻ bài AI ở Luyện tập tới Bước 7" | — | UIC 129 |
| Thiếu | Màn mở phiên: chọn 3 dạng AI (`cloze` nguồn AI, `meaning_in_sentence`, `mcq_sentence`) và `cloze` từ câu đã lưu (`cloze_source` ai/own); dạng AI gắn nhãn Pro; dòng "Phiên này dùng 5 lượt AI (còn 87)". W/54 chỉ có 3 dạng của Bước 4 | W/54 `209:1602` (sẽ phải đổi) | B7 §5, §6.1 bước 4–5, D10, §19 |
| Thiếu | Bị từ chối lúc mở phiên: Free chọn dạng AI (`403 entitlement-required`); không đủ lượt (`403 ai-quota-insufficient` kèm còn lại, cần, giờ làm mới); AI chưa sẵn sàng (`503 ai-unavailable` kèm lý do: chưa chọn model, chưa có key, chạm trần lời gọi, AI tắt) | — | B7 §6.1, §13 |
| Thiếu | Ba dạng câu: điền từ AI (gõ từ), "câu chứa từ rồi chọn" (từ in đậm + 4 nghĩa), trắc nghiệm theo câu (chỗ trống + 4 từ); điền từ từ câu đã lưu (không báo lỗi được) | — | B7 §5, §9.2 |
| Thiếu | "Đang tạo câu" (`preparing`, app hỏi lại sau 2 giây) | — | B7 §6.8 |
| Thiếu | Phiên chỉ có dạng AI gặp lỗi: `ai_unavailable` + [Thử lại] / [Dừng, để sau]; biến thể hết lượt (kèm giờ làm mới) và AI tắt | — | B7 §6.6 |
| Thiếu | Thông báo `ai-fallback` **một lần** mỗi phiên ("AI tạm chưa dùng được, câu này dùng dạng khác"), biến thể hết lượt kèm giờ làm mới | — | B7 §6.6 |
| Thiếu | Thông báo `word-not-recognized`: "Kiểm lại từ trong Từ của tôi" | — | B7 §6.6, §7.6 |
| Thiếu | "Phiên đang dở 6/10 — [Làm tiếp] [Bỏ, mở phiên mới]". W/51 có thẻ "Phiên đang dở" (Bước 4) với nút "Làm tiếp câu 4", chưa có lựa chọn "Bỏ" | W/51 `201:176` | B7 §6.7 |
| Thiếu | Gợi ý 3 nấc cho điền từ (chữ cái đầu, không số chữ → định nghĩa tiếng Anh → nghĩa tiếng Việt), 1 nấc cho hai dạng chọn, luật lùi nấc. W/63 đang là 2 nấc của Bước 4 | W/63 `215:1682` | B7 §8, D9 |
| Thiếu | Bản dịch tiếng Việt của câu, hiện sau khi nộp, cho cả 3 dạng AI (người học `vi`; người học `en` không thấy) | — | B7 §5, D24, D34 |
| Thiếu | Báo lỗi theo danh sách lý do do admin quản lý (tải theo loại câu `ai` / `non_ai`, dòng gợi ý trong ô chi tiết, ô bắt buộc khi `note_required`), 3 lý do AI mới; câu AI về từ riêng có dòng đồng ý "Nhân viên sẽ xem câu này và từ của bạn để kiểm tra". W/66 đang là 4 lý do cố định | W/66 `217:1622` (sẽ phải đổi) | B7 §9.1–9.2, D25, D26 |
| Thiếu | "Báo lỗi của tôi": trạng thái từng báo cáo, "Đã trả lại 1 lượt", "Đã xác nhận lỗi; lượt này không trả lại được" | — | B7 §9.2, §9.3 |
| Thiếu | Thêm nhanh + AI tra nghĩa: nút "Tra bằng AI (còn N lượt)" khi không tìm thấy và sau "không phải nghĩa này"; ô tick "gửi kèm câu" mặc định không tick; đang chờ / `409 ai-in-progress`; `503 ai-lookup-failed` (thử lại được hay không); Free; hết lượt tra nghĩa | — | B7 §11.1, D19, D20 |
| Thiếu | Kết quả tra AI: nghĩa catalog hiện trước gợi ý AI; form sửa mọi ô được lưu (từ, loại từ, nghĩa, level, chủ đề, dạng chia của) + 0–2 câu ví dụ; định nghĩa tiếng Anh hiện nhưng không lưu | — | B7 §11.1–11.2, D21, D22, D31 |
| Thiếu | Trang từ: nhãn "Nguồn: AI gợi ý" (mất khi sửa nội dung có revision); sửa câu ví dụ của từ riêng | — | B7 §11.2, as-built mục 3 |
| Thiếu | Admin: lý do báo lỗi (thêm, sửa, bật/tắt, thứ tự; không xóa; các ô `label_vi/en`, `detail_hint`, `applies_to`, `note_required`, `refundable`) | — | B7 §9.1 |
| Thiếu | Admin: danh sách báo lỗi lọc theo trạng thái, lý do, nguồn (`rule` / `ai`), dòng câu AI kèm mã thao tác, model, `prompt_revision`; kết luận `no_error` / `fixed` / `confirmed` và kết quả trả lượt | A/D05 `25:1266` (placeholder) | B7 §9.3, §13 API 14–15 |
| Thiếu | Admin: danh sách trả lượt (ai xác nhận, vai trò, có trả không, "người xử lý là người báo"), lọc theo người, ngày | — | B7 §9.3, D33 |
| Thiếu | Admin: dạng chia AI dùng mà bảng chưa biết (xếp theo số lần bị loại, nhận, bỏ qua, gỡ dạng đã nhận) | A/D06 `25:1367` (placeholder, mô tả khác) | B7 §10, D15 |
| Thiếu | Admin: cài đặt `practice.ai_prefetch_count` (0–20, mặc định 2) | — | B7 §14 |
| Lệch | Chưa vẽ nên chưa có lệch; các màn Bước 4 sẽ lệch khi có dạng AI: W/63 (2 nấc), W/66 (4 lý do cố định), W/52 (chữ gói) | — | B7 §0 |

### 2.6 Đợt sửa thiếu sót Bước 0–3

| | Nội dung | Figma | Nguồn |
|---|---|---|---|
| Có | Placeholder admin "Người dùng" (danh sách, trạng thái, khóa/mở khóa) | A/D07 `25:1468` | FX §4.5–4.6 |
| Thiếu | Form đăng ký: **Tên** (bắt buộc), **Họ** (không bắt buộc), **Ngày sinh** (bắt buộc), **ô tick đồng ý** Điều khoản + Chính sách bảo mật. Cả 4 bản đều chỉ có email + mật khẩu | W/01 `202:187`, K/01 `273:1302`, N/01 `44:8`, N/01 tối `120:9`, M/01 `290:11353` | FX §4.2 (D2–D5) |
| Thiếu | Dưới 13 tuổi: lỗi `age-below-minimum` | — | FX §4.2 (D4), §8 |
| Thiếu | Đăng nhập khi tài khoản bị khóa: `403 account-locked` "Tài khoản đã bị khóa" | W/02 `202:227`, N/02 `44:46` (không có trạng thái lỗi) | FX §4.5 |
| Thiếu | Hồ sơ: xem và sửa Tên, Họ; ngày sinh không sửa được. W/50 và N/60 chỉ có email | W/50 `201:8`; N/60 `51:731` | FX §4.3 |
| Thiếu | Admin: danh sách người dùng tìm theo một phần email/họ/tên, lọc trạng thái; chi tiết (ngày sinh, thời điểm và phiên bản đồng ý, ai khóa, lý do); hộp khóa có lý do 1–500 ký tự, luật không khóa chính mình hay `admin` (`409 lock-rule`); mở khóa | A/D07 (placeholder) | FX §4.5–4.6 (D6, D7) |
| Thiếu | Admin: tạo tài khoản staff có Họ/Tên (API nhận nhưng chưa bắt buộc; "bắt buộc khi làm lại giao diện admin") | A/51 `26:2117` | FX §4.4 |
| Thiếu | Admin: ai review / publish / đổi trạng thái một nghĩa. Không có màn nghĩa nào (A/D03 là placeholder) | A/D03 `25:1064` | FX §5.1 (D9) |
| Thiếu | Lớp phiên admin: dải "Mất kết nối máy chủ — Thử lại", màn chờ có "Thử lại", "Chưa đăng xuất được khỏi máy chủ — Thử lại", "Mã: …" có nút chép, khóa nút đếm ngược khi 429. Code đã làm; page 04 không có (Figma của Bước 2.5 là file khác `coVHzJwTFgMbooUrty7sOq`, không kiểm) | — | FX §7 (D15, D16) |
| Lệch | A/D07 ghi "Dự kiến: Bước 5–8 (chưa chốt)": API đã có trên `dev` | A/D07 `25:1468` | CLAUDE.md (dev), PR #98–#102 |

### 2.7 Admin (page 04, tổng hợp)

Page 04 có 15 màn thật: đăng nhập, quên mật khẩu, đổi mật khẩu bắt buộc (A/01–A/03), lô nhập, upload, chi tiết lô (A/10–A/12), publish job, chi tiết, tạo
(A/20–A/22), xuất CSV (A/30), nguồn, đăng ký nguồn (A/40–A/41), vai trò & staff, tạo tài khoản (A/50–A/51), Thông báo & giới hạn (A/60). Trừ A/60, các màn
này đã có trong `apps/admin` (route files trên `dev`: account, uploads, publish-jobs, export, sources, staff, coming-soon). Chủ dự án đã ghi admin sẽ được
refactor toàn bộ (CLAUDE.md, 15/10).

**Placeholder "đang phát triển" so với API hiện có trên `dev`:**

| Placeholder | API đã có | Mô tả trên placeholder còn đúng không |
|---|---|---|
| A/D01 Dashboard `25:862` | Chưa có API tổng hợp | — |
| A/D02 Từ `25:963` | Bước 2 | Đúng ("API đã có từ Bước 2") |
| A/D03 Nghĩa `25:1064` | Bước 2 + người thao tác (FX §5.1) | Đúng, thiếu người review/publish |
| A/D04 Chủ đề `25:1165` | Bước 2 | Đúng |
| A/D05 Câu bị báo lỗi `25:1266` | B4 §10, B7 §9.3 | **Lệch** ("ẩn, gỡ, khôi phục câu") |
| A/D06 Dạng bất quy tắc `25:1367` | B7 §10 (`unknown-forms`, `word-forms`) | Khác: B7 là "dạng chia AI dùng mà bảng chưa biết", nhận hoặc bỏ qua |
| A/D07 Người dùng `25:1468` | FX §4.5–4.6 | Đúng nội dung, sai "Dự kiến" |
| A/D08 Quyền lợi & lượt AI `25:1569` | B5 §10, §12.2 | Đúng |
| A/D09 Cài đặt AI `25:1670` | B5 §13, B6 §12.1, §13 | **Lệch** ("trần chi phí") và thiếu model/prompt |
| A/D10 Chi phí & đối soát `25:1771` | B6 API 16–17 | Gần đúng |
| A/D11 Bộ ví dụ `25:1872` | B6 API 13–15 | Gần đúng (còn chữ "pilot") |

**Không có cả placeholder:** lý do báo lỗi, danh sách trả lượt (B7); lượt AI hôm nay so với trần và tô vàng 75% (B5); tình trạng, model, prompt (B6); các
nhóm cài đặt `practice` (8 khóa, B4 §5.4), `entitlements` (15 khóa) cùng 4 giới hạn chung `learning`/`content` (B5 §13), `ai` (5 khóa, B6 §13), `practice.ai_prefetch_count` (B7 §14).

### 2.8 Nhất quán nội bộ

| Kiểm | Kết quả |
|---|---|
| Số màn so với Mục lục (`27:4810`) | 03: 41 = 41; 04: 26 = 26 (11 placeholder); 05: 34 = 34; 06: 34 = 34. **Khớp.** UIC 100 còn ghi "40 màn" (W/10b thêm sau), UIC 97 còn "Bộ 27 màn" |
| 06 tối so với 05 | 34/34 tên khớp (bỏ hậu tố "(tối)"); chữ của từng cặp giống hệt (so bằng script). 06 thừa hưởng mọi điểm của 05: nhóm "Mới thêm", "5 câu", placeholder Luyện tập và Gói học |
| Page 08 (`254:8`) | 42 màn + K/00 + khung so sánh màu. Ghi "Đề xuất 20/10/2026 · chưa duyệt" (K/00 `261:521`). Phần chữ của K/01–K/06, K/20–K/22, K/50, K/51, K/54–K/57, K/60–K/67 giống hệt W tương ứng. Khác G1: bỏ sidebar thay bằng thanh trên 128px, khung 1440px (G1 1600), cột phụ 360px, thêm K/16 Danh sách nhóm, Gói học phủ toàn màn, bỏ W/10b |
| Page 09 (`284:8`) | 35 màn + M/00. Ghi "Đề xuất 21/10/2026 · chưa duyệt" (M/00 `294:2339`, đã chụp ảnh). Khác 05: thanh trên 175px có ô tra ở mọi màn chính, tab "Nhóm" thay tab "Cài đặt" (component TabBar `3:180` của 05 có 4 biến thể Hôm nay/Luyện tập/Tra từ/Cài đặt), thêm M/15 Danh sách nhóm, M/62 Gói học Free. Luyện tập vẫn "Đang phát triển" |
| 08, 09 trong tài liệu | **Chưa có** trong Mục lục (README của 08 và 09 tự ghi "chưa thêm"). UIC (working tree) không nhắc page 08/09 mới, còn ghi "page 08 gợi ý bố cục đã xóa 20/10" (UIC 95, 102, 119), dễ nhầm với page 08 hiện tại. Không page nào ghi 08/09 đã được chốt |
| 08 so với quyết định đã chốt | 08 bỏ sidebar, trong khi G1 "sidebar trái luôn hiện" là **Chốt 20/10** (UIC 95–96). Vì 08 là đề xuất chờ duyệt, đây là câu hỏi mở chứ chưa phải lỗi. Nếu giữ cả 03 và 08, mỗi màn Bước 7 phải vẽ hai lần |
| Câu còn chờ từ trước | Lưu trạng thái thu/mở sidebar theo thiết bị hay tài khoản; mặc định ở cửa sổ 1024–1439px (UIC 112). Nếu chọn 08, câu này tự hết (README page 08) |
| Placeholder đã có API | Admin: 10/11 (mục 2.7). Người học: N/61, N/62 (05, 06) và M/61 (09) là placeholder trong khi Bước 4, 5 đã xong API |
| Mục lục còn chữ cũ | "Tiền tố đường dẫn app (/app) sẽ chốt trong plan" (`27:4841`, đã chốt D39); "7 email/tuần" (`27:4842`, D44); "Mặt trước thẻ: chỉ từ và loại từ" (`27:4838`) mâu thuẫn W/44 |

---

## 3. Câu hỏi cho chủ dự án

Mỗi câu chỉ nêu bối cảnh; không đánh dấu phương án nào là đề xuất (luật "chủ dự án trả lời trước").

1. **Bố cục web và điện thoại.** Page 03 (G1, sidebar, Chốt 20/10) và page 08 (thanh trên, đề xuất 20–21/10); page 05/06 và page 09 (đề xuất 21/10). Bạn
   chọn bố cục nào làm bản chính để vẽ tiếp Bước 7 và các màn còn thiếu? Page không được chọn thì giữ lại để tham khảo, hay xóa như lần dọn 20/10?
2. **Luyện tập và Gói học trên điện thoại.** Web có đủ Bước 4–5, điện thoại chỉ có placeholder. App người học thiết kế mobile-first (UIC 13). Vẽ phần này
   cho điện thoại trong đợt giao diện tới, hay để sau?
3. **Mặt trước thẻ ôn.** W/20 và Mục lục: chỉ từ + loại từ. W/44 ghi câu đã gặp hiện ở mặt trước (từ bị che). UIC 156 vẫn để câu này mở. Mặt trước
   gồm những gì?
4. **Tấm "Thêm từ" chọn sẵn nhóm nào?** N/50 chọn sẵn "Mới thêm". D43: không có nhóm mặc định, phải chọn hoặc tạo. Khi mở tấm, ô Nhóm để trống, chọn
   nhóm dùng gần nhất, hay cách khác?
5. **Số câu ngữ cảnh mỗi nghĩa.** Màn ghi "5 câu"; Bước 5 đặt mặc định 20 (admin chỉnh 5–100). Màn có hiện con số này không, và hiện thế nào khi nó
   do admin đổi?
6. **Người dùng Free nhìn thấy tính năng AI thế nào** khi Pro "Chưa mở bán" và màn hết lượt "không mời mua" (UIC 126)? Bối cảnh: B7 §19 nói dạng AI ở
   màn mở phiên "gắn nhãn Pro"; nút "Tra bằng AI" của Free trả `entitlement-required`. Ẩn hẳn, hiện nhưng khóa, hay hiện kèm đường tới trang Gói học?
7. **W/55 có nút "Xem gói học"** trên màn hết lượt, trong khi UIC 126 ghi "không mời mua". Nút này có giữ không?
8. **"Báo lỗi của tôi" và thông báo trả lượt** ("Đã trả lại 1 lượt") đặt ở đâu: Cài đặt, trang Luyện tập, trang Lịch sử, hay chỗ khác?
9. **"Phiên đang dở".** Bước 4 (W/51) để thẻ ở cột phụ; B7 §6.7 tả một câu hỏi "[Làm tiếp] [Bỏ, mở phiên mới]" khi mở Luyện tập. Bạn muốn dạng nào?
10. **Cài đặt admin của Bước 4–7** (8 + 15 + 4 + 5 khóa, cộng `ai_prefetch_count`): gộp vào trang "Thông báo & giới hạn", hay tách theo nhóm (Luyện tập, Gói và
    lượt, AI)? Khối "Mẫu email" đang có trên A/60 mà chưa có API: giữ làm bản vẽ cho sau này, hay bỏ khỏi màn?
11. **Vẽ màn admin cho Bước 4–7 và đợt sửa Bước 0–3** (báo lỗi, trả lượt, cấp gói, người dùng, khóa tài khoản, AI) ngay trên page 04 theo style hiện tại,
    hay chờ đợt làm lại admin? Bước 6 D8 ghi bạn tự làm các màn admin AI: Figma có cần bản vẽ cho phần đó không?
12. **Hồ sơ người học.** Tên và Họ hiện, sửa ở đâu (Cài đặt → Tài khoản?); ngày sinh có hiện không (API không cho sửa)? Ô đồng ý điều khoản trỏ tới
    trang Điều khoản, trang này chưa có (FX §4.1, `ASSUMPTION`).
13. **Bản tối** cho web (03 hoặc 08) và cho page 09: vẽ page riêng như 06, hay chỉ dựa vào chế độ Dark của biến màu như Mục lục đang ghi?

---

## 4. Phụ lục: toàn bộ khung theo page

Đếm bằng script trên metadata (khung cấp cao nhất trong từng section; page 04, 05, 06 không có section nên gom theo hàng trên canvas).

**00 Mục lục (`0:1`):** một khung "Bìa" `27:4810` (danh sách page 01, 03, 04, 05, 06; cách chạy prototype; ký hiệu; "Còn mở"). Không nhắc page 08, 09.

**01 Foundations (`2:2`):** Icons `3:2` (30 icon, gồm `panel-left-close/open`); Button `3:71` (5 kiểu × 2 cỡ); TabBar (điện thoại) `3:180` (4 biến thể:
Hôm nay, Luyện tập, Tra từ, Cài đặt); Badge/Đang phát triển `3:181`; Sidebar (người học web) `15:430` (7 mục × Thu gọn Không/Có = 14 biến thể); Admin/NavItem
`21:151` (Default, Active, Dev); Admin/Sidebar `21:152` (nhóm Tổng quan, Nội dung, Luyện tập, Người học, AI, Hệ thống); iOS status bar `58:226`; iOS home
indicator `58:231`.

### 03 Người học · Web (193:8) — 41 khung

- **1 · Đăng ký và đăng nhập** (`227:6956`, 6): W/01 Đăng ký `202:187`; W/02 Đăng nhập `202:227`; W/03 Nhập mã xác minh `202:265`; W/04 Quên mật khẩu `202:304`; W/05 Đặt mật khẩu mới `202:332`; W/06 Chọn ngôn ngữ `202:365`
- **2 · Hôm nay và nhóm** (`227:6957`, 7): W/10 Hôm nay `193:9`; W/11 Nhóm Công nghệ `193:221`; W/12 Nhóm, lọc ngăn 1 ngày `193:416`; W/13 Nhóm, menu ⋯ `193:790`; W/14 Xóa nhóm (cảnh báo) `193:1063`; W/15 Lâu chưa ôn (IELTS) `193:1274`; W/10b Hôm nay · thanh bên thu gọn `237:7472`
- **3 · Phiên ôn** (`227:6958`, 3): W/20 Phiên ôn, mặt trước `202:94`; W/21 Phiên ôn, mặt sau `202:119`; W/22 Phiên ôn, kết thúc `202:163`
- **4 · Tra từ và trang từ** (`227:6959`, 4): W/30 Tra từ `197:8`; W/31 Trang từ: left `197:265`; W/32 Trang từ: go `197:409`; W/33 Trang từ: went `197:523`
- **5 · Thêm từ** (`227:6960`, 5): W/40 Thêm từ (nhận ra went) `199:10`; W/41 Tự nhập nghĩa `199:254`; W/42 Thêm vào nhóm `199:504`; W/43 Thêm cả loạt `199:1197`; W/44 Thêm câu đã gặp `199:1393`
- **6 · Luyện tập** (`227:6961`, 5): W/51 Luyện tập `201:176`; W/54 Luyện tập · Tùy chỉnh phiên `209:1602`; W/55 Luyện tập · hết lượt hôm nay `219:1798`; W/56 Luyện tập · Từ hay sai `220:1800`; W/57 Luyện tập · Lịch sử `220:1976`
- **7 · Phiên luyện** (`227:6962`, 8): W/60 Phiên luyện · trắc nghiệm, chưa trả lời `215:1539`; W/61 Phiên luyện · trắc nghiệm, chọn sai `211:1801`; W/62 Phiên luyện · đúng/sai, trả lời đúng `215:1605`; W/63 Phiên luyện · gõ từ theo câu, có gợi ý `215:1682`; W/64 Phiên luyện · gõ từ, chưa đúng (làm lại) `215:1738`; W/65 Phiên luyện · hết vòng 1, ôn lại thêm? `217:1575`; W/66 Phiên luyện · báo lỗi câu `217:1622`; W/67 Phiên luyện · tổng kết `217:1743`
- **8 · Gói học và cài đặt** (`227:6963`, 3): W/52 Gói học (Free) `201:274`; W/53 Gói học (Pro do đội Wordmet cấp) `219:1604`; W/50 Cài đặt `201:8`

### 08 Web · bố cục kết hợp (254:8) — 44 khung (42 màn + K/00 + khung so sánh màu)

- *(ngoài section)* Thanh trên (web, bố cục kết hợp) `254:333` (component/khung phụ, không tính là màn)
- **0 · Đọc trước (bố cục kết hợp, đề xuất 20–21/10)** (`273:1293`, 2): K/00 Đọc trước `261:521`; So sánh màu dải tra từ (chọn 1) `264:521`
- **1 · Đăng ký và đăng nhập** (`273:1294`, 6): K/01 Đăng ký `273:1302`; K/02 Đăng nhập `273:1343`; K/03 Nhập mã xác minh `273:1383`; K/04 Quên mật khẩu `273:1422`; K/05 Đặt mật khẩu mới `273:1450`; K/06 Chọn ngôn ngữ `273:1483`
- **2 · Hôm nay và nhóm** (`273:1295`, 7): K/10 Hôm nay `256:189`; K/16 Danh sách nhóm `268:905`; K/11 Nhóm Công nghệ `257:317`; K/12 Nhóm, lọc ngăn 1 ngày `274:950`; K/13 Nhóm, menu ⋯ `274:1196`; K/14 Xóa nhóm (cảnh báo) `274:1513`; K/15 Lâu chưa ôn (IELTS) `274:1760`
- **3 · Phiên ôn** (`273:1296`, 3): K/20 Phiên ôn, mặt trước `273:1505`; K/21 Phiên ôn, mặt sau `273:1530`; K/22 Phiên ôn, kết thúc `273:1574`
- **4 · Tra từ và trang từ** (`273:1297`, 4): K/30 Tra từ `258:413`; K/31 Trang từ: left `259:508`; K/32 Trang từ: go `275:1233`; K/33 Trang từ: went `275:1420`
- **5 · Thêm từ** (`273:1298`, 5): K/40 Thêm từ (nhận ra went) `275:7927`; K/41 Tự nhập nghĩa `275:8067`; K/42 Thêm vào nhóm `275:8211`; K/43 Thêm cả loạt `275:8778`; K/44 Thêm câu đã gặp `275:8964`
- **6 · Luyện tập** (`273:1299`, 5): K/51 Luyện tập `276:2349`; K/54 Luyện tập · Tùy chỉnh phiên `276:2708`; K/55 Luyện tập · hết lượt hôm nay `276:3140`; K/56 Luyện tập · Từ hay sai `276:3501`; K/57 Luyện tập · Lịch sử `276:3741`
- **7 · Phiên luyện** (`273:1300`, 8): K/60 Phiên luyện · trắc nghiệm, chưa trả lời `273:1598`; K/61 Phiên luyện · trắc nghiệm, chọn sai `273:1657`; K/62 Phiên luyện · đúng/sai, trả lời đúng `273:1731`; K/63 Phiên luyện · gõ từ theo câu, có gợi ý `273:1800`; K/64 Phiên luyện · gõ từ, chưa đúng (làm lại) `273:1849`; K/65 Phiên luyện · hết vòng 1, ôn lại thêm? `273:1911`; K/66 Phiên luyện · báo lỗi câu `273:1954`; K/67 Phiên luyện · tổng kết `273:2069`
- **8 · Gói học và cài đặt** (`273:1301`, 4): K/52 Gói học (Free) `265:844`; K/53 Gói học (Pro do đội Wordmet cấp) `277:2349`; K/50 Cài đặt `277:2441`; K/52t Gói học (Free) · theme tối (tham khảo) `260:508`

### 09 Điện thoại · bố cục kết hợp (284:8) — 36 khung (35 màn + M/00)

- *(ngoài section)* Thanh tab (điện thoại, bố cục kết hợp) `284:156` (component/khung phụ, không tính là màn)
- **0 · Đọc trước (điện thoại, bố cục kết hợp, đề xuất 21/10)** (`284:157`, 1): M/00 Đọc trước `294:2339`
- **1 · Đăng ký và đăng nhập** (`284:158`, 6): M/01 Đăng ký `290:11353`; M/02 Đăng nhập `290:11388`; M/03 Nhập mã xác minh `290:11424`; M/04 Quên mật khẩu `290:11456`; M/05 Đặt mật khẩu mới `290:11475`; M/06 Chọn ngôn ngữ `290:11501`
- **2 · Hôm nay và nhóm** (`284:159`, 11): M/10 Hôm nay `285:135`; M/11 Hôm nay, menu ⋯ (thẻ nhóm) `287:278`; M/12 Tấm Tạo mới `287:537`; M/13 Tạo nhóm `287:715`; M/15 Danh sách nhóm `287:893`; M/14 Danh sách nhóm, 100 nhóm `287:1089`; M/20 Nhóm Công nghệ `290:828`; M/21 Nhóm, cuộn tới danh sách từ `290:1231`; M/22 Xóa nhóm (hộp thoại) `290:1837`; M/24 Nhóm, lọc ngăn 1 ngày `290:1463`; M/23 Lâu chưa ôn (IELTS) `290:2128`
- **3 · Phiên ôn** (`284:160`, 3): M/30 Phiên ôn, mặt trước `290:11523`; M/31 Phiên ôn, mặt sau `290:11548`; M/32 Kết quả phiên ôn `290:11590`
- **4 · Tra từ và trang từ** (`284:161`, 4): M/40 Tra từ `292:1424`; M/41 Trang từ: left `292:1752`; M/42 Trang từ: go `292:2083`; M/43 Trang từ: went `292:2386`
- **5 · Thêm từ** (`284:162`, 7): M/50 Thêm từ (nhận ra went) `292:12055`; M/51 Tự nhập nghĩa `292:12326`; M/52 Lưu vào nhóm `292:12595`; M/52b Lưu vào nhóm: đang gõ `292:13220`; M/52c Lưu vào nhóm: không có nhóm khớp `292:13507`; M/53 Thêm câu đã gặp `292:13771`; M/44 Thêm cả loạt `292:13976`
- **6 · Cài đặt, luyện tập, gói học** (`284:163`, 4): M/60 Cài đặt `293:2095`; M/61 Luyện tập (đang phát triển) `293:2305`; M/62 Gói học (Free) `293:2657`; M/63 Cài đặt, chọn giao diện `293:2461`

### 04 Admin · Web (2:5) — 26 khung (15 màn + 11 "đang phát triển")

- **Tài khoản** (3): A/01 Đăng nhập `22:2`; A/02 Quên mật khẩu `22:25`; A/03 Đổi mật khẩu (bắt buộc) `26:1830`
- **Nội dung: lô nhập** (3): A/10 Lô nhập `22:43`; A/11 Upload CSV `22:262`; A/12 Chi tiết lô `22:386`
- **Nội dung: publish, xuất, nguồn, staff** (6): A/20 Publish job `23:325`; A/21 Chi tiết publish job `23:486`; A/30 Xuất CSV `23:614`; A/40 Nguồn `23:765`; A/50 Vai trò & staff `23:908`; A/22 Tạo publish job `26:1854`
- **Hệ thống và hộp thoại** (3): A/60 Thông báo & giới hạn `24:766`; A/41 Đăng ký nguồn `26:1978`; A/51 Tạo tài khoản (hộp thoại) `26:2117`
- **Đang phát triển (1)** (6): A/D01 Dashboard (đang phát triển) `25:862`; A/D02 Từ (đang phát triển) `25:963`; A/D03 Nghĩa (đang phát triển) `25:1064`; A/D04 Chủ đề (đang phát triển) `25:1165`; A/D05 Câu bị báo lỗi (đang phát triển) `25:1266`; A/D06 Dạng bất quy tắc (đang phát triển) `25:1367`
- **Đang phát triển (2)** (5): A/D07 Người dùng (đang phát triển) `25:1468`; A/D08 Quyền lợi & lượt AI (đang phát triển) `25:1569`; A/D09 Cài đặt AI (đang phát triển) `25:1670`; A/D10 Chi phí & đối soát (đang phát triển) `25:1771`; A/D11 Bộ ví dụ (đang phát triển) `25:1872`

### 05 Người học · Điện thoại (43:8) — 34 khung

- **Đăng ký, đăng nhập** (6): N/01 Đăng ký `44:8`; N/02 Đăng nhập `44:46`; N/03 Nhập mã xác minh `44:85`; N/04 Quên mật khẩu `44:118`; N/05 Đặt mật khẩu mới `44:138`; N/06 Chọn ngôn ngữ `44:165`
- **Hôm nay** (4): N/10 Hôm nay `45:28`; N/11 Hôm nay, menu ⋮ `45:207`; N/12 Tấm Tạo mới `45:384`; N/13 Tạo nhóm `45:576`
- **Nhóm** (5): N/20 Nhóm Công nghệ `47:218`; N/21 Nhóm, mở bộ lọc `47:376`; N/22 Xóa nhóm (hộp thoại) `47:550`; N/23 Lâu chưa ôn (IELTS) `47:721`; N/24 Nhóm, lọc ngăn 1 ngày `48:455`
- **Phiên ôn** (3): N/30 Phiên ôn, mặt trước `48:353`; N/31 Phiên ôn, mặt sau `48:385`; N/32 Kết quả phiên ôn `48:423`
- **Tra từ, trang từ** (4): N/40 Tra từ `49:399`; N/41 Trang từ: left `49:540`; N/42 Trang từ: go `49:626`; N/43 Trang từ: went `49:690`
- **Thêm từ** (7): N/50 Thêm từ (nhận ra went) `50:4585`; N/51 Tự nhập nghĩa `50:4754`; N/52 Lưu vào nhóm `79:1825`; N/53 Thêm câu đã gặp `50:5017`; N/44 Thêm cả loạt `50:5098`; N/52b Lưu vào nhóm: đang gõ `79:2006`; N/52c Lưu vào nhóm: không có nhóm khớp `79:2214`
- **Cài đặt, luyện tập, gói học** (4): N/60 Cài đặt `51:731`; N/61 Luyện tập (đang phát triển) `51:830`; N/62 Gói học (đang phát triển) `51:878`; N/63 Cài đặt, chọn giao diện `119:113`
- **Hôm nay 100 nhóm** (1): N/14 Hôm nay, 100 nhóm `61:1413`

### 06 Điện thoại · Tối (120:8) — 34 khung

- **Đăng ký, đăng nhập** (6): N/01 Đăng ký (tối) `120:9`; N/02 Đăng nhập (tối) `120:42`; N/03 Nhập mã xác minh (tối) `120:76`; N/04 Quên mật khẩu (tối) `120:106`; N/05 Đặt mật khẩu mới (tối) `120:123`; N/06 Chọn ngôn ngữ (tối) `120:147`
- **Hôm nay** (4): N/10 Hôm nay (tối) `120:167`; N/11 Hôm nay, menu ⋮ (tối) `120:289`; N/12 Tấm Tạo mới (tối) `120:418`; N/13 Tạo nhóm (tối) `120:555`
- **Nhóm** (5): N/20 Nhóm Công nghệ (tối) `120:692`; N/21 Nhóm, mở bộ lọc (tối) `120:816`; N/22 Xóa nhóm (hộp thoại) (tối) `120:956`; N/23 Lâu chưa ôn (IELTS) (tối) `120:1090`; N/24 Nhóm, lọc ngăn 1 ngày (tối) `120:1221`
- **Phiên ôn** (3): N/30 Phiên ôn, mặt trước (tối) `120:1135`; N/31 Phiên ôn, mặt sau (tối) `120:1154`; N/32 Kết quả phiên ôn (tối) `120:1194`
- **Tra từ, trang từ** (4): N/40 Tra từ (tối) `120:1303`; N/41 Trang từ: left (tối) `120:1400`; N/42 Trang từ: go (tối) `120:1456`; N/43 Trang từ: went (tối) `120:1492`
- **Thêm từ** (7): N/50 Thêm từ (nhận ra went) (tối) `120:1515`; N/51 Tự nhập nghĩa (tối) `120:1675`; N/52 Lưu vào nhóm (tối) `142:7281`; N/53 Thêm câu đã gặp (tối) `120:1926`; N/44 Thêm cả loạt (tối) `120:2003`; N/52b Lưu vào nhóm: đang gõ (tối) `142:7781`; N/52c Lưu vào nhóm: không có nhóm khớp (tối) `142:7943`
- **Cài đặt, luyện tập, gói học** (4): N/60 Cài đặt (tối) `120:2134`; N/61 Luyện tập (đang phát triển) (tối) `120:2194`; N/62 Gói học (đang phát triển) (tối) `120:2202`; N/63 Cài đặt, chọn giao diện (tối) `120:2213`
- **Hôm nay 100 nhóm** (1): N/14 Hôm nay, 100 nhóm (tối) `142:5870`

---

## 5. Cách kiểm và giới hạn

**Đã làm:**
- Đọc metadata (tên khung, text layer, instance) của cả 8 page bằng `get_metadata`; page lớn được lưu ra file rồi đọc bằng script (tách khung, liệt kê chữ
  từng màn, tìm từ khóa như "Mới thêm", "5 câu", "email/tuần", "AI", "Đang phát triển").
- So bằng script: tên và chữ của 05 với 06 (34/34 giống hệt); chữ của 03 với 08 (W với K) và 05 với 09 (N với M).
- Chụp ảnh 3 khung để kiểm chữ: M/00 `294:2339`, phần nội dung của A/60 `24:858`, N/50 `50:4585`. Ảnh xác nhận "Tối đa email nhắc mỗi tuần 7", khối
  "Mẫu email", link `wordmet.com/app/cai-dat`, và "Nhóm: Mới thêm" chọn sẵn.
- Đọc design trên `origin/dev` @ `80838bc` (sau `git fetch`); đọc UI-CONTEXT, `danh-gia-web-g1.md`, hai README của page 08, 09 ở working tree.

**Chưa kiểm được:**
- **Link prototype và flow** (metadata không có tương tác): không xác nhận được Mục lục "chọn luồng ở cột trái", số link hay link gãy. Các con số link
  trong `danh-gia-web-g1.md` và hai README là do phiên trước tự đo, chưa kiểm lại.
- Màu, tương phản, bố cục, kích thước chữ: không kiểm.
- Chữ trên màn được đọc từ **tên text layer**. Tên có thể khác chữ hiển thị nếu layer bị đổi tên (đã gặp: khung tên "pick Mới thêm" ở W/42 thực ra hiện
  "Du lịch"). Ở page 08, 09, tên text layer do script tạo bị cắt khoảng 30 ký tự, nên các câu dài ở đó đọc từ README. Chỉ 3 khung được đối chiếu bằng ảnh.
- Không phân biệt được layer ẩn với layer hiện qua metadata.
- Figma admin của Bước 2.5 (file `coVHzJwTFgMbooUrty7sOq`) và màn thật của `apps/admin` (chỉ liệt kê file route trên `dev`, không chạy app) không kiểm.
- "Thiếu" ở đây là so với design và API; một số màn có thể đã được cố ý để sang đợt giao diện sau (trường hợp có ghi rõ thì đánh dấu "hoãn có chủ đích").
