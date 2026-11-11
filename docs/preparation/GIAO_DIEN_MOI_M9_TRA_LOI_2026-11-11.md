# M9: câu hỏi và trả lời của chủ dự án (11/11/2026)

**Trạng thái.** Part 9 chưa viết. Chủ dự án brainstorm Câu 1 (chi tiết) và Câu 2 sau khi M8 xong; plan viết sau buổi đó.

**Facts đã thu (11/11/2026, nhánh dài `aecb4475` sau PR #264, #265):**
- `GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-dark.md`: code chế độ tối (54/68 màu tối còn là màu sáng, không có bóng tối, quầng `.gcar-halo` gần trắng, `color-scheme: dark` chỉ có trong `dark.css`).
- `GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-checks.md`: từng dòng §13 và §14, thứ chặn PR cuối, CI, độ lệch với `dev`.
- `GIAO_DIEN_MOI_PLAN_DESIGN_FACTS_2026-11-11-m9-dark.md`: mockup tối `toi-5-man.html` (chưa duyệt, vẽ nền lưới chấm cũ), Figma không có khung tối, hai đề xuất mâu thuẫn.

## Trả lời

| Câu | Chủ dự án trả lời | Còn mở |
|---|---|---|
| 1. Đợt polish (25 chỗ lệch của audit 11/11, xóa `app-ui/`, bỏ token cũ) nằm ở đâu | Chia M9 làm hai: phần tối và kiểm thử, rồi đợt polish, rồi PR cuối vào `dev` | Chi tiết: brainstorm sau khi M8 xong |
| 2. Chế độ tối sửa theo bản nào | Vẽ bản tối trong artifact (HTML), để thấy cả motion; không vẽ trong Figma, vì lúc trước Figma lệch khá nhiều so với artifact đã chốt | Brainstorm lại sau khi M8 xong |
| 3. Chế độ tối phủ tới đâu | Mọi màn ("all"), cả trang công khai, đăng nhập, hộp thoại. Đồng ý đề xuất của Claude: chỉ vẽ bản tối cho các mẫu dùng chung (nền, card, hộp thoại, nút, màu nhóm, màu ngăn) và các màn có phần riêng; mọi màn kiểm bằng ảnh tối | — |
| 4. Bộ ảnh cuối chụp tới đâu | Mọi màn, bốn khổ 390, 768, 1024 và 1440, cả sáng và tối. Chủ dự án chọn ba khổ 390, 1024, 1440; nhận đề xuất của Claude thêm 768, vì design §3 (mục 4) và §15 ghi kiểm khoảng 768–1279 ở 768 và 1024, và M1 đã có lỗi chỉ hiện ở 768 (`768bccc2`) | Script chụp hiện chỉ chụp 390 và 1440; chỉ `gm-m1` có ảnh tối |
| 5a. Script giữ trong repo hay chạy tay một lần (so dung lượng JS, khóa chữ không dùng, Lighthouse, Schema Markup Validator) | Viết script giữ lại trong repo, chạy lại được bằng một lệnh, có thể cho CI chạy trên mỗi PR | Bước nào vào CI: chốt khi viết Part 9 |
| 5b. Đo số khung hình trên điện thoại thật | Chủ dự án có máy và tự đo; truy cập qua bản deploy tạm hoặc chung mạng Wi-Fi với máy tính | Chưa kiểm cách nào chạy được: API chưa deploy và web gọi API theo một địa chỉ cố định (`ASSUMPTION`: phải đổi sang IP máy tính trong mạng LAN). Web chạy trên Cloudflare Workers, không phải Vercel |
| 6. Tách file chữ `messages/{vi,en}.json` (mỗi file khoảng 82 KB, 1.497 câu) thành nhiều file | Chưa tách. Tách khi chủ dự án chỉnh lại câu chữ | Gửi cho trình duyệt chỉ phần chữ trang cần (`AppIntl.tsx` đang gửi cả nhóm `App`, khoảng 59 KB chưa nén): Claude đề xuất làm cùng lúc với việc tách file; chưa chốt |

## Brainstorm tối 11/11/2026 (chủ dự án muốn triển khai M9 ngay)

Chủ dự án nhờ Claude đề xuất trước cho mọi câu rồi trả lời ngay trên danh sách.

| Câu | Đề xuất của Claude | Chủ dự án |
|---|---|---|
| Chia PR, viết Part 9 | Hai PR (M9a script + tải sau; M9b phần tối); Part 9 viết hai nửa | Làm tuần tự M9a rồi M9b, chỉ mở PR khi xong M9b (một PR M9). Claude hiểu: Part 9 viết một lần, duyệt một lần |
| Khổ của artifact bản tối | 390 và 1440 | Chưa ghi chú |
| Màn có phần riêng | Danh sách đã đưa, thêm Gói học, bộ lọc và tab (chỗ 15), thanh phiên (chỗ 16) | Chưa ghi chú |
| Trang công khai | Vẽ ngay từ nhánh M8b | Chưa ghi chú |
| Bóng nút, lớp mờ, giấy từ điển, số màu nhóm, hạt nền tối | Không bóng; đen 55%; giấy tối; bản sáng hơn ≥ 4,5:1; theo landing bản 3 | Nhờ vẽ artifact so sánh: https://claude.ai/artifact/H3B2PmZ1sdjxo2P9ymSYtW (`docs/mockups/2026-11-05-redesign-concepts/m9-toi-so-sanh.html`, câu 6–11). Chờ chọn |
| Chỗ 15 (bộ lọc, tab) | Gom về tab gạch dưới và viên nền nhấn nhạt | Vẽ cùng artifact trên (câu 11). Chờ chọn |
| Chỗ 16 (thanh phiên) | Một bề rộng chung, số đo lấy từ Figma | Chưa đo Figma |
| Script nào vào CI | Câu chữ không dùng, hình dạng JSON-LD, dung lượng JS so với file số gốc | Chưa ghi chú |
| Đo trên điện thoại | Chung Wi-Fi, web và API nhận IP máy tính | Đồng ý. Chủ dự án đã thử gọi API qua IP máy tính, có vẻ chạy được |
| Việc Claude làm luôn (xóa token cũ, đổi tên `DotGridBackground`, `color-scheme`, màu thanh trình duyệt, ghi đo `GET /v1/groups` vào deploy-checklist) | — | Đồng ý |
| QR4 | Vẫn gác lại | Gác lại vì chủ dự án chưa test được quảng cáo |

**Trang so sánh 25 chỗ lệch có ô chọn (11/11/2026 tối).** Sau khi chốt thiết kế, chủ dự án đã nhờ các phiên khác thiết kế lại những chỗ chưa ổn, nên
giao diện hiện tại có chỗ là bản mới hơn bản đã chốt. Mỗi thẻ ở https://claude.ai/artifact/87DRK6yvkNo6vc9jm571FU (bản 2) có ô tick "Giữ giao diện
hiện tại" hoặc "Sửa theo bản đã chốt" và ô ghi chú. Lựa chọn lưu trong db của artifact, collection `picks`, mỗi chỗ một document `d01`…`d25`
(`{choice: 'current' | 'approved' | null, note, at}`); Claude đọc bằng `ArtifactData list`. Đợt polish sửa theo các lựa chọn này.

## Đã chốt cho mockup đầy đủ (11–12/11/2026, chủ dự án gửi từng tin, chưa báo xong)

**Chế độ tối (trang so sánh `H3B2PmZ1sdjxo2P9ymSYtW`):** cả 6 câu theo B (chủ dự án: "nghiêng về Claude").

**25 chỗ lệch (lựa chọn trong db `picks` của `87DRK6yvkNo6vc9jm571FU`, đọc 12/11):**
- Theo bản đã chốt: 3, 4, 5, 7, 9, 10, 11, 14, 17, 18, 20, 21, 23; 25 phần thanh trên (56 px).
- Giữ hiện tại: 8 (icon ngôi nhà), 12 (khoảng chữ logo, tiêu đề hộp thoại), 16 (bề rộng thanh phiên), 19 (dòng nguồn Luyện tập), 22 (thẻ chủ đề có ô icon); 25 phần thanh tab.
- Chỗ 1: lấy bản đã chốt (lá bài dọc) làm gốc, polish và sửa lỗi giao diện còn lại.
- Chỗ 2 (đổi sau, làm rõ 12/11): từ đích trong mọi câu ví dụ, kể cả trang giấy Tra từ, in đậm gạch chân. Nền vàng chỉ dùng cho câu lọc của Tra từ ("314 từ · trình độ tất cả, chủ đề tất cả, loại từ tất cả"), thay cho chữ gạch chân mở menu.
- Card câu hỏi: bỏ dòng hướng dẫn ("gõ từ còn thiếu, đúng dạng trong câu", "gõ từ tiếng Anh có nghĩa này"); chip loại câu đã đủ. Câu "AI dịch" thành một khối riêng ngay dưới câu: nền nhấn nhạt, viền, icon dịch, chữ 17 px, nhãn "AI dịch" bên phải.
- Câu điền từ: gõ thẳng vào chỗ trống trong câu (ô nhập nằm trong câu); Enter thì kết quả thay ngay tại chỗ.
- Học: hiệu ứng theo artifact "Chồng thẻ tan mờ" `TrbJBKg6VFE3x6YkjD1XT7` (thẻ sau mờ theo độ sâu, kéo nghiêng có dấu, ngưỡng 110 px, thẻ chọn xong phóng 1,22 và tan mờ 18 px trong 0,3 giây, thẻ kế tiếp hiện từ mờ, chip tên từ rơi vào đống).
- Nhóm: số đo, đường cong, độ nảy và các lớp thẻ theo đúng source artifact `6z635GjwYNpctydnMoNHJD` (N2, kiểu `arc`, khung 1200).
- Chỗ 6: bỏ qua; trang Nhóm làm lại theo artifact `6z635GjwYNpctydnMoNHJD`, băng chuyền kiểu Vòng cung.
- Chỗ 13: bỏ box "Gần đây" ở Luyện tập; gom tiêu đề mục và card về một kiểu cho mỗi vai trò.
- Chỗ 15: theo câu 11B (tab gạch dưới; bộ lọc dạng chip).
- Chỗ 24: chụp ảnh thật màn khung xương lúc tải.

**Chỗ bổ sung:**
- Bỏ JetBrains Mono (12/11, phản hồi người dùng không thích). Nhãn nhỏ, số đếm, phím tắt, IPA dùng Noto Sans; tiêu đề, từ lớn, số lớn giữ Bricolage Grotesque. Nguồn: báo cáo `docs/preparation/reports/Tiêu chí UI app tiếng Anh.md` và artifact "Phép thử giao diện Wordmet" `1q2VNZqNDPCeLATg8rnSb9` (Noto Sans đạt T1–T5, có số tabular sẵn). Trong code: thay token font mono của `wm-` và mọi chỗ dùng nó (đợt polish).
- Góc bo theo kích cỡ, mức C: phím tắt, nhãn 4–5 px; nút, ô nhập, chip 8; dòng danh sách, menu 10; card 14; hộp thoại, thẻ Học 16 (viết bằng `rem`). Bên trong luôn bo ít hơn khung chứa.
- Panel "Chưa đúng" (Phiên luyện, Ôn): khoảng cách đều; đáp án nổi bật, không còn nằm nhỏ ở góc phải.
- Gợi ý chữ cái đầu: hiện chữ đầu và một dấu gạch dưới cho mỗi chữ còn lại, ví dụ `estimate` → "e_______" (không dùng dấu ba chấm).
- Ô "Gợi ý 1/2": căn lại theo một lưới (cột số, nội dung, nút "Mở gợi ý", chấm tiến độ).
- Chip lọc theo mức (Tất cả, Ưu tiên, Đến hạn, Mới, Bậc 1–5): chữ và số tách hai dòng (nhãn 12 px trên, số Bricolage 20 px dưới); cả chip mang màu của mức (nền 16%, viền 42%), không dùng ô màu nhỏ; chip đang chọn nền 40% và viền đậm (12/11).
- Trang Một nhóm: thanh tiến độ và chip lọc có màu theo mức (ưu tiên đỏ, đến hạn vàng cam, mới xám, Bậc 1→5 xanh lá nhạt → đậm); danh sách từ thành bảng có tên cột (Từ vựng, Loại từ, Nghĩa, Bậc, Trạng thái).
- Bỏ chữ "ngăn": gọi "Mới, Bậc 1 … Bậc 5", chú thích "ôn lại sau N ngày"; cơ chế giữ nguyên (code đã gọi `level` 0–5). Nghiên cứu: `SRS_LEVEL_NAMING_RESEARCH_2026-11-12.md`. Màu không được là tín hiệu duy nhất; Bậc 1–3 xanh nhạt cần chữ hoặc viền.
- Card nhóm chỉ hiện số từ ("48 từ"), bỏ "đã thuộc". Áp cả cho hàng "Nhóm của bạn" ở Hôm nay (`DeckRow.tsx`, giữ nguyên trong code; mockup thêm 12/11 sau khi chủ dự án hỏi).
- Hôm nay, khối "Lần luyện gần nhất": bỏ dòng "Sai: …".
- Danh sách chọn nhóm (hộp Thêm từ): bỏ radio, dòng đang chọn nhuộm màu nhóm. Chốt cách B (12/11): chồng thẻ nhỏ màu nhóm thay ô vuông, nhấc lên khi chọn, dấu ✓ cuối dòng.
- Lưu một từ vào **nhiều nhóm** cùng lúc (12/11): bấm dòng để bật tắt, cuối hộp ghi "Đã chọn n nhóm" và nút "Lưu vào n nhóm"; ô "Lưu vào nhóm" trong hộp Thêm từ hiện các nhóm đã chọn thành chip màu nhóm. Dữ liệu đã cho phép (bảng `group_items` nhiều–nhiều, `ItemState.group_ids[]`), nhưng `POST` thêm nhanh (`quick-add.controller.ts:19`) chỉ nhận một `group_id`: cần thêm trường `group_ids` (chỉ thêm, không đổi v1) hoặc web gọi thêm `POST /v1/groups/:id/items` cho các nhóm còn lại. Chốt cách làm khi viết plan.
- Box "Chưa đúng": chế độ tối dùng cam san hô như dòng nhóm đang chọn (nền `#e5603f` 16% trên card, viền 1,5 px 55%, tiêu đề `#e87052`); chế độ sáng giữ đỏ đậm của token `fail` (nền 9%, viền 62%).
- Nhãn nhỏ và chip viết hoa chữ đầu ("Fill in the blank", "AI sentence", "Studying", "Hôm nay"…), không viết thường toàn bộ như kiểu nhãn mono cũ. Trong code viết thẳng chữ hoa trong file chữ, không dùng CSS.
- Trong phiên (Học, Phiên luyện, Ôn) mọi chữ giao diện là tiếng Anh, không chỉ câu hỏi: nút (Still learning, Flip card, Know, Next, Review again), nhãn (answer, Hint 1 of 2, Definition, Level n), thông báo, tổng kết. Giữ tiếng Việt cho nội dung học: nghĩa tiếng Việt, câu dịch, câu hỏi theo nghĩa ở Ôn, tên nhóm (`ASSUMPTION`, chờ chủ dự án xác nhận). Nút X đóng phiên 32 px.
- Học: nút đóng phiên là dấu X (không còn "Đóng phiên ôn Esc"). Chồng thẻ đặt cao hơn (cách thanh đầu khoảng 20 px), thông báo chuỗi ngày nằm góc phải dưới nút X. Ba nút cao 40 px, chữ 14 px: "← Still learning [1]" chữ đỏ nền trắng (tối: nền card), "↻ Flip card [Space]" nền nhấn, "✓ Know [2] →" chữ xanh nền trắng (tối: nền card), không còn nền xanh đặc; mờ khi chưa lật; dưới nút có hàng chú thích phím (Space, 1/←, 2/→, Esc) trên máy tính.
- Trang một từ: cụm phát âm UK/US và dạng chia nằm giữa hai đường kẻ (đậm hơn `--line`: ink 16%, vì `--line` gần như mất trên nền mesh), tách khỏi tiêu đề phía trên và tab phía dưới; UK và US đứng gần nhau.
- Học: nhãn dưới số của hai đống ("Still learning", "Know") không kèm mũi tên, để canh giữa đúng với số. Trên điện thoại: hai nút bên là ô vuông chỉ có icon (← và ✓, có `aria-label`), nút "Flip card" chiếm phần còn lại; không có chip tên từ rơi vào đống khi vuốt.
- Học trên điện thoại: không hiện phím tắt (không có bàn phím); ba nút chia đều bề ngang, không tràn; gợi ý trên thẻ là "Chạm vào thẻ để lật".
- Panel giới thiệu ở Đăng ký: nền đậm hơn; 5 từ (mitigate, allocate, viable, deteriorate, coherent) lần lượt thay nhau trong thẻ từ; thẻ luyện gõ từ vào chỗ trống, nhấn Enter, chuyển xanh "Đúng · lên Bậc n"; số "từ đến hạn" giảm dần.
- Chế độ tối: màu không được chìm. Panel "Chưa đúng" có ô đáp án nền xanh nhạt, viền xanh, chữ đáp án xanh sáng; các nền nhạt ở chế độ tối (`accent-soft`, `pass-soft`, `fail-soft`) nâng lên 18–20% màu trên nền card thay cho giá trị Figma Dark.
- Panel giới thiệu ở Đăng ký / Đăng nhập: thêm chi tiết để thấy việc học từ (đường nhớ qua Bậc 1–5, thẻ từ, từ đến hạn, câu luyện).

**Mockup tổng hợp (12/11/2026):** https://claude.ai/artifact/Ccnn3iPkr3srNv7diobFkL (`docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html`).
Là context cho thiết kế UI chính thức và cho M9, đợt polish. Còn mở: chỗ 24 (chụp thật, cần chạy app ở nhánh giao diện mới), cách A hay B
cho danh sách chọn nhóm, bốn đề xuất câu 3/4/5/13 chưa được xác nhận rõ.

## Ghi chú cho Part 9

- Thứ chặn M9: M8b (đang làm M8.5), M8c (chờ chủ dự án duyệt khung Figma favicon, ảnh chia sẻ).
- Design §5.7: Tùy chỉnh phiên (`use-practice-starter.tsx:15`) và Giới thiệu Pro (`(member)/layout.app.tsx:6`) đang import tĩnh; M9 chuyển sang tải sau (`next/dynamic`), như Thêm từ, Lịch, Ngày đã làm.
- Script tìm khóa chữ không dùng (câu 5a) đọc hai file `vi.json`, `en.json` như hiện có. Khi tách file (câu 6) thì sửa script theo.
- `dev` không có required check: merge PR cuối phải hỏi chủ dự án trước (`~/.claude/rules/git-conventions.md`).
- Design (§7.1, §9 M9, §14) và delivery record (mục "việc dọn chuyển sang đợt polish") đang ghi đợt polish "trước M9" (QM8-9): sửa theo Câu 1 khi viết Part 9.
