# Đánh giá giao diện web và bốn hướng redesign (05/11/2026)

Đầu vào cho việc chọn hướng trước khi vẽ lại trên Figma. Chưa có quyết định nào; mockup so sánh nằm ở
`index.html` cùng thư mục.

## 1. Đã xem gì

- 12 màn thật trên stack local (`pnpm bootstrap`, web :3001), 1440 px, light, tài khoản thử `lan.local@example.com`:
  landing, đăng nhập, Hôm nay (trống và có nhóm), Nhóm, trang nhóm, trang từ, Tra từ, Luyện tập, phiên luyện
  (câu hỏi và sau khi trả lời), Gói học, Cài đặt, Lịch sử.
- Để các trang có nội dung, mình đã thêm nhóm "Kinh doanh · A2" (31 từ) vào tài khoản thử đó và mở một phiên
  luyện (dùng 1/30 phiên của ngày).
- Code đã đọc: `packages/design-tokens/theme.css`, `apps/web/src/app/globals.css` (motion), `app-ui/Button.tsx`,
  `components/interactive/Reveal.tsx`, các component phiên luyện.
- Không xem được: dark mode, mobile 390 px, trang Ôn thẻ có thẻ (đường dẫn ôn cần `?id=` của nhóm; mình mở
  `/review` không kèm id nên ra màn "Không tìm thấy nhóm này").
- Lần chụp đầu, landing ra lỗi dev overlay `Unexpected end of JSON input`; lần thứ hai render bình thường.
  Chưa tìm nguyên nhân (có thể do Next dev compile lần đầu, chưa kiểm).

## 2. Nên giữ

- **Lexend**: thiết kế cho dễ đọc, có đủ dấu tiếng Việt, hợp app học.
- **"Ledge"** (gờ phẳng dưới nút và thẻ) và cú nhấn làm gờ biến mất: đã là cảm giác "bấm thật", riêng của Wordmet.
- **Phím tắt** trong phiên luyện (1–4, Enter, H, Esc) và việc in phím ngay trên nút.
- **Motion của phiên luyện** đã đúng khung thời gian: thẻ hiện 200 ms, phản hồi 160 ms, thoát 100 ms, vào 160 ms,
  rung nhẹ khi sai.

## 3. Vấn đề (theo checklist redesign)

**Màu: ba màu thương hiệu tranh nhau.** Navy (thanh trên), vàng (nút chính, mục nav đang chọn, dấu highlight
dưới H1, icon "Thêm từ") và xanh hoàng gia (link, cột biểu đồ, chip "0 đến hạn", viền dưới thẻ Hôm nay ở Luyện
tập). Thêm bốn nền pastel (vàng, xanh lá, tím nhạt, hồng) cho các thẻ ở Hôm nay và Luyện tập. Kết quả: không màu
nào có một nghĩa duy nhất; vàng vừa là "bấm vào đây", vừa là "bạn đang ở đây", vừa là trang trí.

**Khung app chiếm 124 px trước nội dung.** Thanh trên 64 px cộng dải tìm kiếm 60 px ở mọi trang, trong khi nav đã
có mục "Tra từ". Footer marketing 4 cột (Giới thiệu, Trợ giúp, Pháp lý…) lặp ở cuối mọi trang trong app.

**Một motif dùng khắp nơi thì mất nghĩa.** H1 nào cũng có vệt highlight vàng ("Hôm nay", "Luyện tập").

**Bố cục lưới đều, ít thứ bậc.**
- Luyện tập: 4 thẻ nguồn bằng nhau, 4 màu nền, 4 nút "Tùy chỉnh" giống hệt nhau; thẻ "Hôm nay" to nhất trang
  nhưng nói "không còn từ nào cần ôn".
- Hôm nay (trống): 3 thẻ chủ đề bằng nhau, mỗi thẻ một màu pastel (mẫu "3 cột đều" generic nhất).
- Trang nhóm: 31 dòng, mỗi dòng lặp "Mới", "từ mới", "Bỏ khỏi nhóm" (93 nhãn lặp); hành động xóa là link xanh trên
  từng dòng.
- Trang từ: nội dung chiếm khoảng 1/3 màn hình, cột phải 3 thẻ; "Bạn đang học" lặp lại nghĩa đã có bên trái.
- Gói học: H1 khoảng 64 px cho câu "Bạn đang dùng gói Pro"; danh sách tính năng hai cột lệch nhau (Free bắt đầu
  khoảng y=395, Pro khoảng y=660).

**Phiên luyện: thẻ trôi giữa khoảng trống.** Thẻ rộng 640 px trên canvas 1440 px, khoảng 300 px trống phía trên;
4 đáp án có viền 2 px giống ô nhập liệu (trông như ô để gõ, không như nút); tiến độ là 10 gạch nhỏ ở góc phải xa
điểm nhìn; nút "Gợi ý" nằm rời dưới thẻ.

**Chữ.** Hầu hết tiêu đề 700–800, thân 14 px màu muted; ít bậc 500/600 ở giữa. Chữ 12 px xám trên nền pastel
("Chưa có nhóm nào") khó đọc. Link xanh gạch chân lẫn với nút ("Xem mọi chủ đề trong Tra từ", "So sánh chi tiết
các gói").

**Landing.** Hero thấp và chữ nhỏ so với bề rộng 1440 px; cửa sổ demo bị cắt ở mép dải hero. Ảnh chụp toàn trang
có khoảng 2000 px trống vì `Reveal` chuyển các phần dưới màn hình sang `opacity-0` cho tới khi được cuộn tới: người
dùng cuộn thì thấy, nhưng ảnh chụp, công cụ tạo thumbnail và người in trang thấy trống.

## 4. Motion (theo cách nhìn của Emil Kowalski)

| Before | After | Why |
| --- | --- | --- |
| `prefers-reduced-motion`: mọi `animation`/`transition` về 0.01 ms (`globals.css`) | Giữ fade opacity/màu 150 ms; chỉ bỏ translate, scale, rung | Reduced motion là ít chuyển động, không phải không phản hồi; người bật vẫn cần biết đáp án đúng/sai vừa đổi |
| `Reveal` ẩn phần dưới màn hình (`opacity-0 translate-y-4`) tới khi cuộn tới | Trang đầy đủ khi đứng yên; chỉ animate phần đang vào viewport, từ trạng thái nhìn thấy được | Ảnh chụp, thumbnail, bản in không bao giờ thấy trang trống |
| Đáp án đúng: đổi viền và nền | Nền lấp đầy từ trái (clip-path, 220 ms, ease-out) và vẽ dấu ✓ (stroke) | Chỉ báo trạng thái; mắt đang nhìn đúng chỗ đó |
| Câu kế tiếp: đổi nội dung tại chỗ | Câu cũ ra 100 ms (opacity, -8 px), câu mới vào 200 ms ease-out, blur 2 px lúc chuyển | Tránh đổi giật; ra nhanh hơn vào |
| Tiến độ: gạch nhỏ đổi màu | Thanh liền, phần đã làm `scaleX` từ trái 250 ms | Tiến độ là chuyển động liên tục; transform không gây layout |
| Mục nav đang chọn: nền vàng nhảy khi đổi trang | Đề xuất: một "pill" trượt giữa các mục (View Transitions). `ASSUMPTION`: chưa kiểm Next 16 hỗ trợ ổn định cho App Router | Giữ cảm giác không gian giữa các trang |
| Mở app lần đầu trong ngày: số liệu hiện ngay | Số thẻ đến hạn đếm lên một lần mỗi ngày (300 ms) | Việc hiếm, đáng một chút vui; không lặp mỗi lần vào trang |
| Hover trên thẻ và nút không có media query (chưa kiểm hết) | Bọc hover trong `@media (hover: hover) and (pointer: fine)` | Trên điện thoại, chạm sẽ kích hoạt hover giả |

Không nên thêm motion cho: chuyển trang trong app (dùng nhiều lần mỗi ngày), danh sách 31 từ ở trang nhóm (không
stagger), phím tắt 1–4/Enter (giữ phản hồi tức thì như bây giờ).

## 5. Hướng polish nếu giữ phong cách B (thứ tự ưu tiên)

1. Gán mỗi màu một vai: navy = khung, vàng = **một** hành động chính mỗi màn, xanh = chỉ link và focus. Bỏ 4 nền
   pastel, dùng một nền phụ.
2. Gộp dải tìm kiếm vào thanh trên (ô tìm có phím `/`); footer trong app chỉ còn một dòng.
3. Highlight vàng chỉ dùng cho từ đang học (nghĩa thật của "highlight"), không dùng dưới H1.
4. Phiên luyện: đáp án là nút lớn có gờ, tiến độ là thanh liền ngay trên thẻ, gợi ý nằm trong thẻ.
5. Thứ bậc: mỗi trang một khối chính rõ ràng, các khối khác nhỏ hơn hẳn; thêm bậc chữ 500/600.
6. Motion theo bảng ở mục 4.

## 6. Bốn concept trong mockup

| | Concept | Thế giới gợi ý | Font | Màu | Motion chính |
| --- | --- | --- | --- | --- | --- |
| A | **B tinh chỉnh** | Wordmet hiện tại, làm gọn | Lexend | Navy, vàng highlight, xanh chỉ cho link | Đáp án lấp đầy, ✓ được vẽ, thanh tiến độ liền |
| B | **Vở ô li** | Vở học sinh Việt Nam: giấy ô li, mực tím, lề đỏ, "Thứ Năm, ngày 5 tháng 11" đầu trang, cô chấm bút đỏ | Literata, Be Vietnam Pro, Pangolin (chữ tay) | Giấy trắng kẻ ô, mực tím, đỏ lề | Khoanh tròn đáp án bằng nét vẽ tay, gạch chéo khi sai, lật trang |
| C | **Tủ thẻ thư viện** | Hộp Leitner: 6 ngăn Mới, 1, 3, 7, 14, 30 ngày; thẻ giấy manila trên bàn dạ xanh | Newsreader, IBM Plex Sans, JetBrains Mono | Xanh dạ tối, giấy manila, đồng thau | Trả lời đúng thì thẻ rơi vào ngăn kế tiếp, ngăn đếm lên |
| D | **Tiêu điểm** | Một từ một lúc, chữ cực lớn, không khung thừa, bàn phím trước | Bricolage Grotesque, Be Vietnam Pro, JetBrains Mono | Trắng xám, mực đen, một màu hồng sen | Từ đổi bằng blur crossfade, độ đậm chữ đổi khi hover |

Mỗi concept có 3 màn: Landing, Hôm nay, Luyện tập (trả lời được bằng chuột hoặc phím 1–4, Enter, H).

## 7. Vòng 2: bốn hướng lấy từ đồ vật ngoài app học (`vong-2.html`)

Chủ dự án (05/11/2026): bốn hướng A–D vẫn thuộc dạng phổ biến; cần hướng education nhưng nổi bật, khác lạ, có
bản sắc. Vòng 2 cố ý không tham khảo app học khác mà mượn từ đồ vật đời thường có sẵn ngôn ngữ hình ảnh riêng.

| | Concept | Mượn từ | Font | Màu | Motion chính |
| --- | --- | --- | --- | --- | --- |
| E | **Lịch bloc** | Lịch bloc xé ngày treo tường của Việt Nam | Anton (số), Noto Serif, Barlow Condensed | Tường xanh ngọc, giấy trắng, đỏ, bìa đỏ chữ vàng | Xé tờ lịch; câu kế lật lên như lật lịch |
| F | **Tuyến ôn** | Bảng giờ tàu lật chữ, bản đồ tuyến metro, vé tàu | Overpass, Overpass Mono | Bê tông xám, bảng đen chữ vàng, ba màu tuyến | Chữ lật từng ô; tàu chạy tới ga kế tiếp |
| G | **Bản vẽ từ** | Bản in xanh kỹ thuật: khung tên, đường kích thước, dấu duyệt | Saira Condensed, IBM Plex Mono, Archivo Narrow | Xanh cyanotype, nét trắng, đỏ sửa | Đường kích thước kéo ra; đuôi từ tách khỏi từ gốc; dấu ĐẠT/SỬA |
| H | **Zine cắt dán** | Zine in riso: hai màu mực, chấm lưới, băng dính, chữ cắt báo | Be Vietnam Pro 900, Dela Gothic One, Playfair, Space Mono, Unbounded | Giấy xám, hồng huỳnh quang, xanh riso | Mảnh chữ bay vào chỗ trống; sai thì bật ra |

Phiên luyện ở vòng 2 theo đúng cách app đang làm (`messages/vi.json`, `practice.session`): trả lời đúng rồi Enter là
"Đã biết", từ lên một ngăn; trả lời sai thì từ về ngăn 1 ngày. Ngày hẹn trong E tính từ thứ Năm 5/11/2026 (theo màn
"Hôm nay" thật): +1 = thứ Sáu 6/11, +3 = Chủ nhật 8/11, +7 = thứ Năm 12/11.

Phát hiện khi dựng, áp dụng cho mọi hướng:

- **Tiêu đề chữ hoa tiếng Việt cỡ lớn cần line-height từ khoảng 1.2.** Ở 1.08 trở xuống, dấu nặng của dòng trên (Ặ)
  rơi vào mũ của dòng dưới (Â) và đọc thành "ĐẬU". Kiểm bằng ảnh chụp phóng to; một chuỗi đứng riêng thì font vẽ đúng.
- Dela Gothic One và Unbounded có dấu tiếng Việt nhưng nặng và sát; Be Vietnam Pro 900 cho kết quả gọn hơn ở cỡ lớn.
- Vòng 1, concept B ghi "năm lần ôn trong 30 ngày" với các ngày 1, 3, 7, 14, 30: sai. Đó là khoảng cách giữa các lần
  ôn; nếu lần nào cũng nhớ đúng thì lần ôn thứ năm rơi vào ngày thứ 55 (5/11 → 30/12). Vòng 2 (E) ghi đúng.

Chưa xem: dark mode của E, F, H (G là nền tối sẵn), bản điện thoại (chỉ kiểm không tràn ngang ở 390 px).

## 8. Thử ý tưởng ôn thẻ dạng chồng thẻ (`chong-the.html`, 07/11/2026)

Chủ dự án muốn thử: thẻ chồng lên nhau, bấm để lật, vuốt trái là Cần ôn lại, vuốt phải là Đã biết, thẻ sau trồi lên
tới hết. Làm bằng taste-skill (hướng được chia: "One motif", seed 1040142175, bảng màu "Sheet and biro", font
Bricolage Grotesque) và stitch-skill (`chong-the-DESIGN.md` để đưa vào Google Stitch).

- Ý tưởng: một hình chạy khắp màn là tấm thẻ; sân ôn là một thẻ phân nhóm lớn màu xanh bút bi, tab mang tên nhóm.
- Giữ đúng app: phải lật mới chọn được, Cần ôn lại về ngăn 1 ngày, Đã biết lên một ngăn, phím Space/1/2/Esc, chữ
  lấy từ `App.review` trong `messages/vi.json`, dữ liệu 12 từ của nhóm Kinh doanh · A2 trên máy local.
- Thêm so với app: vuốt, phím mũi tên, hai chồng thẻ, lật lại mặt trước, thẻ đầu lắc gợi ý một lần.
- Cần chốt nếu làm thật: có Hoàn tác lần vuốt nhầm không (API ghi câu trả lời ngay, chưa có Hoàn tác).
- Đã kiểm bằng Playwright: bấm lật, kéo phải qua ngưỡng, kéo khi chưa lật (thẻ chống lại, không ghi), kéo trái,
  phím cho tới hết 12 thẻ (tổng kết 7/5 khớp), không tràn ngang ở 390 px, không lỗi console. `lint.mjs` của
  taste-skill: 0 FAIL sau khi đánh dấu bóng đổ của thẻ đang kéo là có chủ ý. Chưa chạy `inspect.mjs` (công cụ cho
  landing page, đòi tối thiểu 4 ảnh thật). Chưa thử trên điện thoại thật bằng tay.

## 9. Vòng 3: bốn hướng nữa (`vong-3.html`, 07/11/2026)

Chủ dự án xin thêm đề xuất. Cùng cách làm vòng 2: mượn từ đồ vật có ngôn ngữ hình ảnh riêng, mỗi hướng gắn với một
phần thật của Wordmet (ngăn ôn, ngày hẹn, nhóm từ).

| | Concept | Mượn từ | Font | Màu | Motion chính |
| --- | --- | --- | --- | --- | --- |
| I | **Bầu trời từ** | Bản đồ sao: chòm sao, cấp sao 1–6 | Cormorant Garamond, Spectral, IBM Plex Mono | Trời đêm chàm, sao vàng, đỏ san hô cho từ đến hạn | Đường nối sao tự vẽ; sao đến hạn nhấp nháy; đúng thì sao sáng lên |
| J | **Thư hẹn** | Phong bì thư máy bay, tem, dấu bưu điện, theo dõi bưu phẩm | Alegreya, Oswald, Mali, IBM Plex Mono | Trắng xanh, sọc đỏ xanh | Nắp phong bì mở, thư kéo lên; dấu ĐÃ NHỚ / GỬI LẠI đóng xuống |
| K | **Thẻ bài sưu tầm** | Bài sưu tầm: khung theo độ hiếm, số trong bộ, gói bài | Big Shoulders Display, Chakra Petch, Familjen Grotesk | Xám tím, khung đồng/bạc/vàng/lục bảo/ánh kim, tím | Lá nghiêng theo chuột, lá ánh kim đổi màu; vệt sáng quét khi lên hạng; mở gói |
| L | **Bảng tuần hoàn từ** | Bảng tuần hoàn: 18 cột, ô có số, ký hiệu hai chữ | Archivo (độ rộng thay đổi), IBM Plex Mono | Xám giấy, ba màu theo loại từ | Ô hiện theo đường chéo; electron bật vào vòng khi đúng, rơi ra khi sai |

Hướng L giải trực tiếp một vấn đề ở mục 3: trang nhóm hiện là 31 dòng dài; bảng cho thấy cả 48 từ trong một màn,
lọc theo nhóm, ô đến hạn có viền đậm.

Số liệu vòng 3 dùng 48 từ có thật trong 3 nhóm (Kinh doanh · A2 lấy từ trang nhóm thật; Du lịch · B1 và Từ gặp ngoài
đời là mẫu), số từ theo ngăn cộng đúng 48: Mới 23, 1 ngày 10, 3 ngày 7, 7 ngày 5, 14 ngày 2, 30 ngày 1; ôn hôm nay 20
(8 mới, 9 ở ngăn 1 ngày, 3 ở ngăn 3 ngày).

Lỗi số liệu ở vòng 1 và 2: số thẻ theo ngăn cộng ra 42 (18 + 9 + 7 + 5 + 2 + 1) trong khi ba nhóm có 48 từ. Chưa sửa
hai file đó.

Phát hiện thêm khi dựng:

- Big Shoulders Display (chữ hẹp, viết hoa) cũng cần line-height khoảng 1.14 trở lên; ở 1.0 dấu của dòng dưới chạm
  dòng trên. Dấu phẩy của font này nằm sát chữ U nên "LÂU," đọc thành "LẬU"; đã đổi câu để bỏ dấu phẩy ở đó.
- Trả lời sai một từ đang ở ngăn 1 ngày thì từ vẫn ở ngăn 1 ngày. Chữ phản hồi phải nói "vẫn ở", không nói "về".

Chưa xem: dark mode của J, K, L (I là nền tối sẵn), bản điện thoại (chỉ kiểm không tràn ngang ở 390 px), hiệu ứng
nghiêng thẻ của K chỉ chạy với chuột.

## 10. Vòng 4: lai giữa D · Tiêu điểm và K · Thẻ bài (`vong-4.html`, 07/11/2026)

Chủ dự án chọn D và K là hai hướng ổn nhất; thông số hai style lưu ở `style-da-chon.md`. Vòng 4 thử bốn cách ghép.

| | Concept | Lấy từ D | Lấy từ K | Motion chính |
| --- | --- | --- | --- | --- |
| M | **Một lá** | Nền trống, số khổng lồ, ô lệnh `/`, đáp án là chữ lớn, hồng sen | Từ đang hỏi là một lá có khung theo hạng; Hôm nay là một chồng lá | Đúng: vệt sáng, khung lên hạng, lá bay lên góc và lá dưới trồi lên |
| N | **Bộ sưu tập chữ** | Chỉ dùng chữ (Bricolage biến thiên), mono, hồng sen | Bộ 48 lá có số thứ tự, 6 hạng, viền ánh kim cho hạng cao nhất | Hạng = độ đậm của chữ (250 → 800); đúng thì chữ đậm dần lên |
| O | **Phòng trưng bày** | Một thứ ở giữa, phần còn lại lùi vào tối | Lá bài đầy đủ, khung kim loại; các hạng thành các phòng | Đèn soi theo chuột; đúng thì đèn sáng hơn, sai thì chập chờn |
| P | **Ván bài** | Màn gần như trống, phím Space ← → | Lá có khung hạng, hai đống lá đếm số | Kéo lá theo tay, nhãn hiện theo khoảng kéo, thả nhanh là đủ |

P trùng ý với `chong-the.html` (mục 8, làm ở phiên khác): cả hai là ôn thẻ bằng vuốt. Khác nhau: P dùng lá có khung
hạng của K và nền của D; `chong-the.html` dùng thẻ phân nhóm màu xanh bút bi.

Phát hiện khi dựng:

- Chữ to trên lá bài phải co theo độ dài từ (`font-size: min(cỡ tối đa, chiều rộng / số chữ cái)`), nếu không
  "complaint", "manager" bị ngắt giữa chữ.
- Sau khi bấm một nút, phím Space kích hoạt lại nút đó (hành vi chuẩn của trình duyệt), nên ở màn ôn thẻ phím Space
  chỉ lật lá khi con trỏ không đứng trên nút khác.

Đã kiểm bằng Playwright: 12 màn render, không lỗi console, không tràn ngang ở 390 px; M, N, O trả lời sai rồi đúng;
P lật, kéo phải qua ngưỡng và bấm ← đều đếm đúng vào hai đống (1 và 1, sang lá 3/6). Chưa xem dark mode của M, N, P,
bản điện thoại, và cảm giác vuốt trên màn cảm ứng thật.

## 11. Trang Hôm nay theo taste-skill (`hom-nay.html`, 07/11/2026)

Làm theo đủ quy trình của taste-skill: chia hướng, kiểm kê, ý tưởng, chữ, dựng, `lint.mjs`, `inspect.mjs` ở 1440/768/390,
chấm theo `references/critique.md`, sửa, lớp motion, đo lại.

- **Hướng:** "One motif", chia lại bằng seed 1040142175 với `--keep palette,type` (giữ màu xanh bút bi và Bricolage
  Grotesque của bản chồng thẻ), ghi vào thư mục scratchpad để không đè `.taste-skill/` của session khác.
  Khung chia: hero "Giant cropped shape", showcase "One control, blown up", stats "Stepped figure tiles", list
  "Two-column menu, photo bullets", cta "A sentence with a blank". Không chia lại ô nào.
- **Ý tưởng:** tấm thẻ có tab của màn ôn thẻ phóng thành khối xanh khổng lồ ôm chồng thẻ hôm nay; cùng hình đó làm
  ô nhập, ô số liệu, khung ảnh và nút.
- **Thứ tương tác được:** ô "Thêm từ vừa gặp" cỡ poster. Gõ went, children, better, mice, bought…, trang nhận ra dạng
  chia và đổi nền sang xanh; bấm Thêm thì số từ của nhóm Từ gặp ngoài đời và ngăn Mới tăng. Bảng dạng chia chỉ là mẫu
  khoảng 20 từ trong trang, không gọi API.
- **Số liệu:** theo tài khoản thử, gói Free (3 phiên mỗi ngày; 15 câu AI và 5 lượt tra AI mỗi tháng). Số thẻ từng
  nhóm, số theo ngăn, "4 từ lâu chưa ôn" và ba gợi ý chủ đề là số mẫu cho khớp nhau (20 = 12 đến hạn + 8 mới).
- **Ảnh (6, đều CC0 hoặc public domain, ghi nguồn ở chân trang):** chợ phố Hà Nội (Daderot), bảng giờ bay ORD
  (Redolta), phố Hà Nội (lumoplank), bàn phím (Luca Bravo, StockSnap), bát phở bò (Andy Li), ruộng bậc thang Hà Giang
  (minhphuc_99kdd). Ảnh minh họa chủ đề của nhóm, không phải ảnh của người học. Lưu ở `hom-nay-assets/`, kèm
  `credits.json`.
- **Đo:** `lint.mjs` 0 FAIL; `inspect.mjs` 0 FAIL, 1 WARN (không có video: trang app không có đoạn phim nào hợp
  một cách trung thực). Vòng 1 có 4 FAIL (chữ thân 14px, ảnh 64px quá nhỏ nên không được tính, mặt sau thẻ bị coi là
  chữ bị che, chữ chú thích bị coi là nhãn nhỏ), đã sửa hết.
- **Chấm vòng 3 (tự chấm theo thang Awwwards của skill):** design 7,5 · usability 8 · creativity 7,5 · content 7,5
  → khoảng 7,65. Còn yếu: ý tưởng "tấm thẻ" vẫn gần với mọi app flashcard (qua được phép thử đối thủ ở mức trung
  bình); ô số liệu lớn còn nhiều nền trống; khoảng trống giữa nút Ôn và chồng thẻ trên điện thoại.
- **Motion:** khối thẻ mở từ mép phải (clip-path 1,1 s) rồi chồng thẻ lắng xuống; tiêu đề trượt lên từng dòng; mỗi
  khối hiện lên khi cuộn tới (bắt đầu ở mức nhìn thấy được, không ẩn hẳn); nhấn nút co 0,97; ô nhập đổi màu nền khi nhận
  ra từ. Trong app thật nên chỉ chạy màn mở khối thẻ ở lần mở đầu tiên trong ngày.
- **Lệch so với app hiện tại:** bỏ dải tìm kiếm thứ hai (tra từ chuyển xuống câu "Bạn muốn tra từ … nào?"), bỏ footer
  marketing 4 cột, nút "Ôn 20 thẻ" trong mockup mở prototype chồng thẻ.

## 12. Trang Hôm nay theo high-end-visual-design (`hom-nay-soft.html`, 07/11/2026)

Skill `taste-skill:high-end-visual-design` (soft-skill) chọn một tổ hợp vibe + bố cục; vẫn đo bằng `lint.mjs` và
`inspect.mjs` của taste-skill.

- **Tổ hợp:** vibe "Soft Structuralism" (nền xám bạc `#eceeed`, khối trắng, bóng rất mềm) + bố cục "Asymmetrical
  Bento". Font Geist (có dấu tiếng Việt, kiểm 07/11/2026). Một màu nhấn: xanh ngọc `#127a5b`.
- **Chi tiết của skill đã dùng:** khối hai lớp (khay ngoài + tấm trong, bo góc đồng tâm 32/26 px), nút viên thuốc có
  icon nằm trong vòng tròn riêng, thanh điều hướng là "đảo" nổi tách khỏi mép trên, menu điện thoại: hai vạch xoay
  thành dấu X rồi lớp phủ mờ với các link trượt lên lần lượt, nút chính hút nhẹ theo con trỏ, các khối hiện bằng
  trượt lên + mờ dần khi cuộn tới.
- **Bento:** phiên ôn (ba thẻ xếp lệch, lật được) · Thêm từ vừa gặp (gõ thử được) · vòng 2/3 phiên luyện · 11/15
  câu AI · Thẻ theo ngăn (6 cột) · 4 từ lâu chưa ôn (scenic, delay, guide, luggage là từ thật của nhóm Du lịch · B1) ·
  ảnh Từ gặp ngoài đời. Dưới bento: 3 nhóm có ảnh và 3 gợi ý chủ đề dạng viên thuốc. Dùng lại 6 ảnh CC0/public domain
  ở `hom-nay-assets/`.
- **Mâu thuẫn giữa hai skill, đã chọn theo high-end-visual-design:** nhãn nhỏ viết hoa trên tiêu đề (eyebrow), bóng
  mềm trên khối đứng yên, kính mờ ở thanh điều hướng. Taste-skill cấm cả ba; inspector chạy với
  `--allow eyebrow,shadow,glass,pill-nav,micro-label`. **Chọn theo taste-skill:** eyebrow 13 px thay vì 10 px (chữ
  dưới 13 px khó đọc, nhất là chữ hoa có dấu), bỏ bóng trên nút.
- **Đo:** `inspect.mjs` 0 FAIL, 1 WARN (không có video). Vòng 1 có 4 FAIL (bóng trên nút, chữ thân 14 px, eyebrow
  12 px, lớp menu ẩn vẫn bị tính là che tiêu đề) và một lỗi inspector không bắt được vì `overflow-x: hidden`: thẻ
  bento rộng hơn màn 390 px; đã sửa hết.
- **Tự chấm:** design 7,5 · usability 8 · creativity 6,5 · content 7,5 → khoảng 7,45. Điểm yếu chính: phong cách
  "Apple/Linear" này rất phổ biến ở SaaS, nên khó nhận ra là Wordmet nếu che logo.
- **Số mẫu:** như bản `hom-nay.html`; thêm "quá hạn hơn 14 ngày" là số giả định (ngưỡng thật nằm ở cài đặt
  `backlog_after_days`, chưa đọc).

## 13. Vòng 5: D × K mặc theo soft-skill (`vong-5.html`, 07/11/2026)

Cùng skill với mục 12, nhưng áp lên hai style đã chọn (D · Tiêu điểm, K · Thẻ bài) và cho đủ 3 màn (Landing, Hôm nay,
Luyện tập). Ba tổ hợp vibe × bố cục của skill, mỗi tổ hợp một concept:

| | Concept | Vibe × bố cục | Font | Màu | Motion chính |
| --- | --- | --- | --- | --- | --- |
| Q | **Bento mềm** | Soft Structuralism × Asymmetrical Bento | Bricolage, Geist, JetBrains Mono | Nền bạc, khay trắng hai lớp, hồng sen | Vòng tròn mũi tên trong nút trượt chéo; vòng tiến độ tự vẽ; lá lên hạng có vệt sáng |
| R | **Kính đêm** | Ethereal Glass × Z-Axis Cascade | Bricolage, Geist, JetBrains Mono | Gần đen, quầng hồng sen và tím, khay kính | Lá xếp chồng lệch góc; quầng màu nền trôi khi trả lời đúng, tối đi khi sai |
| S | **Biên tập** | Editorial Luxury × Editorial Split | Fraunces, Geist, JetBrains Mono | Giấy ấm, nâu cà phê, xanh lá dịu, hồng sen | Dải lá trượt vào và kéo ngang được; đáp án đúng chuyển chữ nghiêng |

Chung cho cả ba: thanh điều hướng "đảo" nổi; ở Landing có nút hai vạch xoay thành dấu X và mở menu toàn màn hình với
các link trượt lên lần lượt (Esc để đóng); khay hai lớp bo góc đồng tâm; nút viên thuốc có vòng tròn mũi tên.

Q trùng hướng với `hom-nay-soft.html` (mục 12): cùng Soft Structuralism × Bento. Khác: Q dùng màu và lá bài của
D × K, mục 12 dùng xanh ngọc, ảnh và thẻ của bản chồng thẻ.

Lệch có chủ ý so với skill:

- Skill muốn mọi phần tử hiện lên trong 800 ms trở lên. Giữ 820 ms cho Landing; trong app rút còn 420 ms vì màn
  Hôm nay và Luyện tập mở nhiều lần mỗi ngày (theo Emil: thứ dùng thường xuyên phải nhanh).
- Eyebrow 12 px thay vì 10 px của skill: chữ hoa có dấu ở 10 px khó đọc (mục 12 cũng chọn tương tự, 13 px).
- Không dùng `backdrop-filter` trên khay cuộn theo trang, chỉ trên thanh điều hướng và lớp menu.

Đã kiểm bằng Playwright: 9 màn render, mở và đóng menu, trả lời sai rồi đúng ở cả ba phiên luyện, không lỗi console,
không tràn ngang ở 390 px. Chưa chạy `lint.mjs` / `inspect.mjs` của taste-skill cho file này; chưa xem bản điện
thoại bằng mắt và chưa có bản sáng cho R.

## 14. Bốn tầng thiết kế áp vào trang Hôm nay (`bon-tang.html`, 07/11/2026)

Trang giải thích cho chủ dự án: soi trang Hôm nay đang chạy (stack local, tài khoản thử `lan.local`, ảnh 7/11/2026)
qua bốn tầng Vấn đề → Cấu trúc → Hệ thống → Phong cách, rồi đề xuất bản khung dựng lại, đổi được phong cách khung xám, B,
D, K, xem được khung điện thoại và trường hợp "vắng 3 hôm".

Số đo trên trang thật (Playwright):
- Cỡ chữ: 13 px (55 đoạn), 14 (24), 16 (15), 20 (10), 40 (2). Phần lớn chữ là 13 px.
- 11 màu nền; 5 độ bo góc (8, 12, 14, 20 px, tròn hẳn); 5 độ đậm (400–800).
- Vàng và vàng nhạt dùng ở 10 chỗ với nghĩa khác nhau (logo, mục đang mở, nút chính, nền ô Thêm từ…).
- Phép thử nheo mắt (bỏ màu, làm mờ): hai nút đậm nhất là "Tra" và "Thêm" (việc phụ); nút "Ôn 21 thẻ" gần như chìm
  vì nổi chỉ nhờ màu vàng. "Ôn 21 thẻ" có hai nút. Có 125 px khung (thanh điều hướng và dải tìm kiếm) trước tiêu đề.
- Khối ôn chiếm khoảng 15% diện tích ảnh 1440 × 1448; dải tìm kiếm thứ hai, gợi ý chủ đề và footer khoảng 35%.

Đã đọc từ code: phiên ôn chạy theo từng nhóm (`/app/review?group=`); mặc định 20 từ mới và 100 lượt ôn mỗi nhóm mỗi
ngày, `backlog_after_days` = 60 (`apps/api/src/settings/settings.definitions.ts`). Con số "quá hạn hơn 14 ngày" trong
`hom-nay-soft.html` vì vậy sai so với mặc định 60 ngày.

Cần chủ dự án quyết (liệt kê trong trang, chưa có đề xuất): ôn theo từng nhóm hay gom một phiên; trang nói gì khi thẻ
dồn sau mấy hôm vắng; gợi ý chủ đề đặt ở đâu; phong cách D, K hay bản lai.
