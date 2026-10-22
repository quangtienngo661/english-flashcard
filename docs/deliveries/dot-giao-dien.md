# Đợt giao diện — plan tóm tắt (21/10/2026)

Plan: [`../superpowers/plans/2026-10-21-dot-giao-dien.md`](../superpowers/plans/2026-10-21-dot-giao-dien.md) (12 task, 7 mốc duyệt).
Design: [`../superpowers/specs/2026-10-21-dot-giao-dien-design.md`](../superpowers/specs/2026-10-21-dot-giao-dien-design.md) (D1–D17).
Chỉ mockup Figma, không code. Mỗi mốc: Claude gửi ảnh các màn, chủ dự án "ok" thì sang mốc sau.

## Mốc 0 — Chữ giao diện

1. Viết bản chữ giao diện: bảng thuật ngữ cuối cùng và chữ cho từng màn sẽ vẽ, kèm danh sách chữ cũ cần đổi.

## Chuẩn bị

2. Đổi tên và dời các page cũ xuống cuối; kiểm component gốc nằm ở page cũ; gắn biến cho hai bóng đổ tô cứng; viết script kiểm tương phản, tràn khung, số nút vàng.

## Mốc A + B — Sửa chỗ lệch và tài khoản

3. Sửa các chỗ lệch của báo cáo rà Figma trên page 08 và 09 (form đăng ký mới, lỗi dưới 13 tuổi, nhóm chọn sẵn, giới hạn câu, 100 nhóm, mặt trước thẻ, Từ hay sai, "300 câu AI", màn hết lượt, ngày tháng); thêm một màn chữ dài nhất.
4. Vẽ phần tài khoản: menu avatar trên web, Cài đặt → Tài khoản (sửa tên, họ, ngày sinh), đăng nhập khi bị khóa, Hôm nay khi chưa có nhóm; trang Cài đặt không có ô tra.

## Mốc C — Điện thoại: Luyện tập và Gói học

5. Áp bảng thuật ngữ cho các màn đã có của page 08 và 09 (chỉ đổi chữ).
6. Vẽ Luyện tập và Gói học (Pro được cấp) cho điện thoại theo bản web, nối link bấm thử.

## Mốc D-web — Bước 7 trên web

7. Vẽ Bước 7 trên web: mở phiên có dạng AI (ba trạng thái gói, không đủ lượt, chưa có model), đang tạo câu, AI không dùng được, thông báo đổi dạng và từ chưa nhận ra, phiên đang dở, ba dạng câu AI với gợi ý và bản dịch, bài từ câu đã lưu, báo lỗi theo lý do và dòng đồng ý, "Báo lỗi của tôi", tra bằng AI và lưu thành từ riêng.

## Mốc D-phone — Bước 7 trên điện thoại

8. Vẽ bản điện thoại của mọi màn Bước 7 ở mốc trước, kèm màn chữ dài nhất và tấm tra AI ở ba trạng thái gói.

## Mốc E — Admin

9. Vẽ admin mức khung: Từ, Nghĩa, Chủ đề; Cài đặt hệ thống 6 tab; Người dùng; Báo lỗi và xử lý; Lý do báo lỗi; Danh sách trả lượt; Dạng chia chưa biết; Cấp gói và lượt.
10. Vẽ các màn AI của Bước 6 mức khung: model, thao tác, prompt (lịch sử, chạy thử), bộ ví dụ, tình trạng, chi phí, các lần gọi.

## Mốc F + G — Bản tối và prototype

11. Đặt 4 màn mẫu ở chế độ Dark và kiểm; nối 3 luồng bấm thử của Bước 7 trên web.

## Đóng đợt

12. Cập nhật Mục lục Figma, UI-CONTEXT (hỏi trước về phần sửa chưa commit của file này), CLAUDE.md; kiểm mọi dòng của design và báo cáo rà đều có màn; ghi as-built.

# Đợt giao diện — as-built (22/10/2026)

Nhánh `claude/dot-giao-dien-build-ad3557` (cắt từ `docs/dot-giao-dien-design` ở `c6fb678`; đã merge `origin/dev` sau khi PR #118 vào `dev`).
Chỉ mockup và tài liệu: không đổi gì dưới `apps/**`, `packages/**`, không đổi API.

## Kết quả

- **Figma** `7HcPAKLrWu32C27qYMJUOA`. Page chính: `08 Người học · Web` (97 khung `K/…`), `09 Người học · Điện thoại` (96 khung `M/…`), `04 Admin · Web`
  (55 khung `A/…`, mức khung). Page cũ 03, 05, 06 đổi tên "(cũ, không dùng) …", dời xuống cuối, **không xóa**. Mục lục (page 00) cập nhật theo đợt.
- **Danh sách khung** đầy đủ theo page và section: [`../mockups/2026-10-21/danh-sach-khung.md`](../mockups/2026-10-21/danh-sach-khung.md). Khung vẽ mới
  hoặc sửa trong đợt, theo mảng:

  | Mảng | Khung |
  |---|---|
  | A, B — chỗ lệch, tài khoản | web K/01b, K/06b, K/10b, K/16b, K/17b, K/18, K/90–K/94 và các khung sửa chữ; điện thoại M/01b, M/06b, M/13b, M/16, M/41b, M/50b, M/53b, M/91–M/94 |
  | C — điện thoại Luyện tập, Gói học | M/L51, M/L54–M/L57, M/L60–M/L67, M/L63b, M/62b (15) |
  | D — Bước 7 | web K/70–K/88 (33, section 9–10 của page 08); điện thoại M/70–M/88 (34, section 8 của page 09, thêm M/78d chữ dài nhất) |
  | E — admin | 40 khung ở section E1 (A/87–A/89), E2 (A/70a–f), E3 (A/71–A/79), E4 (A/80–A/86); thanh bên `Admin/Sidebar` theo bản chữ §8.0 |
  | Đóng đợt — vẽ bù sau đối chiếu | K/57b, M/L57b (lịch sử trống), A/78d (sửa ngày), A/79b (xác nhận tắt tự gia hạn); thêm [Hoàn tác] ở A/77, lỗi 409 ở A/82 |
  | F — bản tối | 4 khung ở section 11 của page 08 (K/10, K/78a, K/52, K/40), biến màu chế độ Dark |
  | G — prototype | flow "Web Bước 7: 1" (K/70 → K/73 → K/78a → K/79a), "2" (K/74a → K/73 → K/78a → K/79a), "3" (K/85 → K/86 → K/87 → K/88) |

- **Bản chữ giao diện** (thuật ngữ, chữ từng màn): [`../mockups/2026-10-21/ban-chu-giao-dien.md`](../mockups/2026-10-21/ban-chu-giao-dien.md).
- **Script kiểm** (tương phản chữ ≥ 4,5, icon ≥ 3, không tràn, ≤ 1 nút vàng, gờ nút không bị cắt): [`../mockups/2026-10-21/figma-checks.js`](../mockups/2026-10-21/figma-checks.js);
  bộ khối vẽ admin: [`../mockups/2026-10-21/figma-adminkit.js`](../mockups/2026-10-21/figma-adminkit.js). Cả hai cũng lưu trong file Figma (shared plugin
  data `wordmet` / `checks`, `adminkit`).
- **Ảnh duyệt** theo mốc: `docs/mockups/2026-10-21/duyet/` (`A`, `B`, `AB-vong-1`, `AB-vong-2`, `C`, `D-web`, `D-phone`, `E`, `FG`, `dong-dot`).
- **Design §10** thêm ba việc API cho đợt code: trả email người thao tác ở API admin; `group_id` cho `GET /v1/practice/weak-words`; `sense_ids[]` cho
  `POST /v1/groups/{id}/items/bulk`.

## Mốc và duyệt

| Mốc | Duyệt (chủ dự án) | Commit |
|---|---|---|
| 0 — bản chữ | 21/10: Q1 đổi "Level" thành "Trình độ"; Q2 vẽ email người thao tác ở admin | `27b9a08`, `b42af3b` |
| A+B — chỗ lệch, tài khoản | 22/10, sau hai vòng góp ý (9 điểm, rồi 3 điểm); hai việc API vào design §10 | `cad86b6` … `414ac93` |
| C — điện thoại Luyện tập, Gói học | 22/10 | `1372e47`, `903f2e8` |
| D-web | 22/10 | `ad6b92f` |
| D-phone | 22/10 | `ee2f092` |
| E — admin | 22/10 | `a804571`, `904af16` |
| F+G — bản tối, prototype | 22/10 | `bcc3ee9` |

Lời duyệt và các phương án: [`../superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md`](../superpowers/decisions/2026-10-21-dot-giao-dien-decisions.md).

Mỗi mốc gửi một phần ảnh, không phải mọi khung. **Các khung chưa từng có trong ảnh gửi duyệt** (kể cả bản điện thoại tương ứng): K/70t, K/74b, K/74c,
K/74d, K/74e, K/75b, K/79b, K/80b, K/85t, K/86; M/74b–M/74e, M/75b, M/79b, M/80b, M/85t, M/86; A/70b, A/70e, A/75, A/77b, A/78b, A/78c, A/80 (theo review cuối,
Claude soát lại bằng tên file ảnh). Các khung này qua script kiểm như mọi khung khác; K/74c và A/74b sửa sau review có ảnh ở `duyet/sua-sau-review/`.

## Kiểm

- Giới hạn của phép kiểm tràn: phần nằm dưới mép khung được coi là phần cuộn, nên "không lớp tràn" chứng minh chữ xuống dòng đúng, **không** chứng minh nút
  chính nằm trong màn 852 của điện thoại; các màn điện thoại cao hơn 852 dựa vào chân trang dính khi code (UI-CONTEXT §10).
- Script kiểm chạy trên mọi khung mới của từng mảng: chữ thấp nhất 4,69:1 (bản tối 5,22:1), icon thấp nhất 4,69:1, không lớp tràn, không gờ nút bị cắt,
  tối đa một nút vàng mỗi màn. Mỗi luật của script có khung đối chứng cố ý sai để chắc script bắt được.
- Mỗi khung K/7x–K/8x có bản M/ tương ứng (kiểm bằng script so tên).
- Prototype: đọc lại từng nút đã nối và đi hết từng luồng; **chưa bấm thử ở chế độ Present** (plugin không điều khiển được chế độ này).
- Đối chiếu đủ màn: xem mục "Đối chiếu đủ màn" bên dưới.

## Claude tự quyết khi vẽ

Mỗi dòng: quyết định — giá nếu sai. Bản đầy đủ nằm trong ledger của lần chạy plan (không commit).

- Chữ giới hạn câu không kèm số vì API trả `409 sentence-limit-reached` không có con số — không.
- Admin giữ tên đã chốt "Gói và lượt" (D10), "Cấp gói và lượt"; luật "không để lượt đứng một mình" áp cho màn người học — đổi hai nhãn admin.
- Tiền ở admin theo `Intl` ("12,40 US$") — một mẫu chuỗi.
- Script: chữ trong khối "(mờ)", "disabled", "tắt tới khi…" miễn ngưỡng tương phản (WCAG 1.4.3); khung cắt (clip) tính là vật chứa; nút vàng dưới lớp phủ
  không tính — một nút bị che không bị đếm.
- Tiêu đề từ dài trên điện thoại (trên 10 chữ cái) dùng 40px và cho xuống dòng — vòng code chọn luật khác.
- Màn điện thoại cao hơn 852 vẽ hết nội dung thay vì giấu nút dưới màn — vòng code quyết định chân trang dính.
- Mức sử dụng chỉ ở Cài đặt (M/62b không có dòng mức sử dụng), theo góp ý mốc A+B.
- Bỏ breadcrumb ở web (theo "không cần để vào đâu"), giữ link quay lại kiểu "‹ Nhóm của bạn" ở trang cần đường về — thêm lại nếu muốn.
- Cờ ngôn ngữ tô màu cứng (là nội dung, không theo theme); hàng chọn ngôn ngữ trong Cài đặt chưa đổi sang danh sách thả xuống (góp ý chỉ nêu K/06).
- K/86b dùng từ "sick" để có nghĩa sẵn trong từ điển trước gợi ý AI; K/85c, M/85c là bảng trạng thái thay cho nhiều khung hộp thoại.
- Màu tô lưu giá trị sáng đã giải biến (sửa 11 màu bị đen trên page 08).
- Nhãn gói trên thanh trên của 11 màn web Pro/Dùng thử ghi nhầm "Miễn phí" ở mốc D-web; sửa ở mốc D-phone, chụp lại 8 ảnh D-web.
- M/82 hiện báo lỗi dạng thẻ thay bảng; M/78d dùng câu 300 ký tự (mức tối đa) và mở đủ 3 gợi ý.
- Script đếm cả khối con nằm lệch ra ngoài mép trái/phải của khung (phát hiện tấm báo lỗi lệch trên M/80, M/80b, M/81).
- Thanh bên admin 23 mục: mỗi mục cao 28px, không khoảng cách, để vừa khung 900px; giữ các nút cũ nên màn A/01–A/51 vẫn đúng mục đang chọn.
- Xóa khung `A/60` và các khung giữ chỗ `A/D02`–`A/D11` trên page 04 (đã có màn thay); giữ `A/D01` Dashboard — khôi phục từ lịch sử phiên bản nếu cần.
- Thêm khung trạng thái ngoài tên trong bản chữ: A/71e, A/74b, A/74c, A/78b, A/78c, A/80b, A/84b. Trạng thái không thể cùng hiện ghi bằng một dòng chú
  thích mờ trong màn (lỗi `lock-rule` ở A/72, danh sách trống ở A/76, A/86, lỗi chưa có key ở A/80b, hai trạng thái trả lượt ở A/74c) — vòng code vẽ riêng.
- A/78 gộp cột (Con số · Lý do; Từ ngày → Tới ngày; Người cấp · Vai trò) cho vừa khung 1440.
- A/81, A/84 liệt kê 6 thao tác (Bước 7 thêm ba); A/80 thêm dòng effort/thinking chọn được, A/81 thêm cột "Ô dữ liệu vào", "Ước tính mỗi lời gọi" theo
  design Bước 6 §12.1; tên model trong màn là dữ liệu mẫu.
- Mẫu tấm Thêm từ ở bản tối là K/40 (K/50 nay là Cài đặt). Bản tối lộ hai chỗ gắn sai biến, sửa bằng biến trùng màu ở bản sáng (4 chữ "Bỏ qua", 24 nét
  icon trên nền vàng, 1 nhãn admin). Bóng đổ hộp thoại, nút nguy hiểm và cờ vẫn tô cứng.
- Xóa hai lớp thừa nằm lẻ trên page 08 (nhãn "Từ", ô "deployed", sót từ Task 7).
- Đổi tên page 08, 09 thành bản chính thức ("08 Người học · Web", "09 Người học · Điện thoại", bỏ "(đề xuất …)").
- Vẽ bù 4 khung và 2 chỗ sửa sau bước đối chiếu, khi các mốc đã duyệt (xem "Đối chiếu đủ màn"); chủ dự án xem ở lần gửi đóng đợt.
- Bộ khối vẽ admin lấy mẫu từ khung `A/60`, khung này đã xóa ở mốc E; dựng lại các mẫu trong khung "Kit admin · mẫu" ở page 01 Foundations (không phải màn).

## Đối chiếu đủ màn

Một agent phụ chỉ đọc tài liệu, đối chiếu 146 dòng (design §5, §6.2, §6.3, Review Focus, các dòng "Lệch" và các dòng "Thiếu" thuộc §5 của báo cáo rà) với
danh sách khung: 137 Có, 5 Một phần, 4 Cần xem màn, 0 Thiếu. Claude kiểm lại 4 dòng "Cần xem màn" (prototype đọc lại đủ ba luồng; M/78d tràn 0; Mục lục
không còn "7 email/tuần" và câu "/app") và vẽ bù 5 dòng "Một phần" (lịch sử luyện tập trống; [Hoàn tác] gỡ dạng chia vừa nhận; hộp Sửa ngày và hộp xác
nhận tắt tự gia hạn ở Cấp gói; lỗi 409 khi lưu prompt). Kết quả: **146/146 Có**. Bảng đầy đủ: [`../mockups/2026-10-21/kiem-du-man.md`](../mockups/2026-10-21/kiem-du-man.md).
Chữ của các màn vẽ bù: bản chữ mục 13.

## Review cuối

Một phiên mới, chỉ đọc (model Fable), review gói `54757a9..3faf49c`: không lỗi nghiêm trọng, 5 lỗi quan trọng, 9 điểm nhỏ, kết luận "merge sau khi sửa". Báo cáo nguyên
văn và cách xử lý từng điểm: [`../superpowers/reviews/2026-10-22-dot-giao-dien-final-review.md`](../superpowers/reviews/2026-10-22-dot-giao-dien-final-review.md).
Đã sửa: hai khung "Đọc trước" (K/00, M/00) và tên section 0; 10 chữ "Lượt" đứng một mình (5 mỗi page); A/74b vẽ lại thành câu thường về từ catalog có lựa chọn
nhiễu là từ riêng; ghi giới hạn của phép kiểm tràn và chân trang dính; liệt kê khung chưa có trong ảnh duyệt; nút prototype ở K/78a, K/79a và flow trùng tên; nhãn
gói trên màn Pro / Dùng thử; K/74c (chỉ còn [Dừng, để sau]); dòng trả lượt ở "Báo lỗi của tôi"; chữ lệch trong bản chữ.

## Việc còn lại và rủi ro

- **Chưa bấm thử prototype ở chế độ Present**; chủ dự án bấm thử: page 08 → Present → chọn "Web Bước 7: 1/2/3".
- **Bản tối:** lớp phủ sau hộp thoại khá mờ; bóng đổ hộp thoại và nút nguy hiểm chưa gắn biến.
- **K/15** (có từ trước) có hai nút vàng; không sửa trong đợt.
- **Để sau (điểm nhỏ của review):** nền của K/81 là câu "deploy" trong khi tấm báo lỗi nói về "rizz"; chữ hoa "[Xem Gói học]" / "[Xem gói học]" chưa thống
  nhất; script kiểm chỉ đếm số chữ được miễn kiểm tương phản, chưa liệt kê id. Thẻ "Phiên luyện hôm nay" ở K/70–K/72 vẫn vẽ 3 vạch dù chữ đã là "còn 28/30 phiên".
- **Page cũ** 03, 05, 06 còn đó: page 09 dùng lại vài tấm và component của page 05; xóa khi đã chuyển component gốc về 01 Foundations.
- **Admin** là mức khung; chủ dự án đã ghi sẽ làm lại cả khối giao diện admin.
- **Việc ngoài đợt** (design §10): ba việc API ở trên, sửa ngày sinh qua `PATCH /v1/me`, chữ design Bước 7 §6.7, ghi chú design Bước 6 D8, kiểm bản tiếng
  Anh khi code.

## Sau merge: góp ý mobile (22/10/2026)

Chủ dự án góp 6 điểm cho page 09 (web xem sau); đã sửa trên nhánh `claude/dot-giao-dien-build-ad3557`, PR mới vào `dev`. Chữ và khung: bản chữ mục 14;
cách hiểu từng điểm: decision record, mục "Sau merge — góp ý mobile"; ảnh: `docs/mockups/2026-10-21/duyet/mobile-vong-3/`. Thêm khung M/21b (danh sách lọc
đang mở). Script kiểm trên cả 97 khung của page 09: chữ thấp nhất 4,69:1, không tràn, tối đa một nút vàng, không gờ nút bị cắt. Khi đổi, hàng chip của
M/40, M/44 (bộ lọc chọn nhiều) bị thay nhầm bằng một ô; đã dựng lại đủ bốn bộ lọc theo bản web K/30 (Trình độ, Chủ đề, Loại từ, Chỉ từ của tôi).

## Góp ý web (22/10/2026)

Sau khi duyệt mobile (PR #120 vào `dev`), chủ dự án góp 15 điểm cho web; đã sửa trên nhánh này, PR mới vào `dev`. Chữ và khung: bản chữ mục 15;
các đề xuất chờ chọn (họa tiết nền, Lâu chưa ôn, chân trang, gợi ý, bản tối) và nguồn tham khảo: decision record, mục "Góp ý web"; ảnh:
`docs/mockups/2026-10-21/duyet/web-vong-3/`. Thêm: component họa tiết nền (01 Foundations), component chân trang (page 08), K/15 bản đề xuất (bản cũ giữ để so),
section "9 · Bản tối mẫu" trên page 09. Bảng màu bản tối đổi trong biến chế độ Dark (giá trị cũ ghi ở bản chữ mục 15 để quay lại). Script kiểm trên toàn bộ page 08
(trừ K/15 bản cũ, hai nút vàng) và các mẫu Dark: chữ thấp nhất 4,69:1 (Dark 5,16:1), không tràn, không gờ nút bị cắt.
