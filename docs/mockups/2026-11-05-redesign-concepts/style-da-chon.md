# Hai style đã chọn: D · Tiêu điểm và K · Thẻ bài sưu tầm (07/11/2026)

Chủ dự án chọn hai hướng này trong 12 hướng A–L (`index.html`, `vong-2.html`, `vong-3.html`). File này giữ đủ thông
số để dựng lại hai style trên Figma hoặc trong code mà không cần mở mockup. Mockup gốc:

| Style | File | Selector gốc | Artifact |
| --- | --- | --- | --- |
| D · Tiêu điểm | `index.html` | `.cD` | https://claude.ai/artifact/KDwb2uJie9xzTGwzsS9F5S (`#d-today`, `#d-practice`, `#d-landing`) |
| K · Thẻ bài sưu tầm | `vong-3.html` | `.cK` | https://claude.ai/artifact/8QRrkx1UzEiMZqt7g2meet (`#k-today`, `#k-practice`, `#k-landing`) |
| Các hướng lai D × K | `vong-4.html` | `.cM`–`.cP` | https://claude.ai/artifact/WrSg3s2j36PKGZ4nbkmBJN |
| D × K theo soft-skill | `vong-5.html` | `.cQ`–`.cS` | https://claude.ai/artifact/FcuZ5xYsBFAWGay16eyJQk |

## D · Tiêu điểm

**Ý tưởng.** Một từ một lúc, chữ rất lớn, gần như không có khung. Mọi thao tác đi qua ô lệnh (`/`) và phím tắt.

**Màu**

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--bg` | `#f5f5f7` | nền trang |
| `--surface` | `#ffffff` | ô lệnh, màn phiên luyện |
| `--ink` | `#0c0c10` | chữ, nút chính |
| `--muted` | `#6d6d78` | chữ phụ, nhãn mono |
| `--line` | `#e2e2e8` | đường kẻ, phần thanh chưa đầy |
| `--acc` | `#d6336c` (hồng sen) | màu nhấn duy nhất: chấm sau logo, thanh tiến độ, ngăn có thẻ đến hạn, gạch đáp án sai |
| `--ok` | `#13784a` | đáp án đúng (chữ và gạch chân) |

**Chữ**

- Bricolage Grotesque (biến thiên `opsz` 12–96, `wght` 200–800). Số lớn ở Hôm nay `clamp(120px, 18cqi, 220px)`, 700,
  tracking -0.065em, line-height .78. Từ hỏi trong phiên luyện `clamp(60px, 10.5cqi, 128px)`, 700, -0.05em. Đáp án 31px,
  400, lên 700 khi rê chuột.
- Be Vietnam Pro cho chữ thân, 15px, chữ phụ màu `--muted`.
- JetBrains Mono 12px, chữ thường, cho nhãn ("thứ năm · 05.11", "03 / 10", "1–4 chọn · ↵ tiếp").
- Logo: `wordmet` chữ thường, Bricolage 700, chấm tròn hồng sen 7px phía sau.

**Bố cục**

- Thanh trên cao 64px: logo, ô lệnh ở giữa (rộng tối đa 460px, cao 40px, bo 12px, phím `/`), vài link chữ, avatar
  vuông bo 9px.
- Hôm nay: số thẻ khổng lồ bên trái, nhãn và nút bên phải; dưới là một thanh nhịp (6 đoạn, mỗi đoạn rộng theo số thẻ
  của ngăn, đoạn có thẻ hôm nay màu hồng sen); cuối là 3 cột chữ không khung (nhóm, vừa gặp, luyện tập).
- Phiên luyện: nền trắng, thanh tiến độ 3px trên cùng, từ hỏi ở giữa, 4 đáp án là 4 chữ lớn nằm ngang (2 × 2 khi hẹp).

**Thành phần**

- Nút chính: nền `--ink`, chữ trắng 600 16px, bo 12px, đệm 14 × 22px, phím tắt đi kèm trong `kbd`.
- Đáp án: không viền, không nền; rê chuột thì nền `--bg` và chữ đậm lên; đúng thì chữ xanh `--ok` và gạch chân 3px
  được vẽ từ trái; sai thì gạch ngang hồng sen 3px; các đáp án còn lại mờ còn .3.

**Motion**

| Chỗ | Thông số |
| --- | --- |
| Đổi câu | Câu cũ: opacity 0, blur 8px, scale .985 trong 150ms. Câu mới: từ blur 8px, scale 1.015 về 0 trong 280ms `cubic-bezier(.23, 1, .32, 1)` |
| Rê chuột lên đáp án | `font-weight` 400 → 700 trong 200ms (cần font biến thiên) |
| Gạch chân đáp án đúng | `scaleX` 0 → 1 trong 240ms; đáp án đúng khi chọn sai chậm 160ms |
| Thanh tiến độ | `scaleX` theo tiến độ, 300ms |
| Số thẻ hôm nay | đếm từ 0 lên trong 560ms (chỉ lần mở đầu tiên trong ngày) |
| Landing | từ lớn đổi dạng (went → go, met → meet…) bằng blur 10px, 180ms, 2,6 giây một lần |

## K · Thẻ bài sưu tầm

**Ý tưởng.** Mỗi từ là một lá bài. Hạng của lá là số lần nhớ đúng, theo đúng 6 ngăn của app.

| Hạng | Ngăn | Khung |
| --- | --- | --- |
| Thường | Mới | `linear-gradient(135deg, #dcd8ce, #fbfaf6 45%, #cfcabf)` |
| Đồng | 1 ngày | `linear-gradient(135deg, #a8683c, #edbb92 45%, #8a5430)` |
| Bạc | 3 ngày | `linear-gradient(135deg, #8f97a5, #f6f8fb 45%, #848c99)` |
| Vàng | 7 ngày | `linear-gradient(135deg, #b88a1c, #f9e491 45%, #98700f)` |
| Lục bảo | 14 ngày | `linear-gradient(135deg, #0f7a5c, #86e8c8 45%, #0c654c)` |
| Ánh kim | 30 ngày | `conic-gradient(from 210deg, #ff8ad8, #ffd36b, #8dffb5, #7ad7ff, #b28bff, #ff8ad8)` + lớp ánh kim theo góc nghiêng |

**Màu khác**

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--bg` | `#e9e6f1` + lưới chấm 18px `rgb(26 21 48 / .07)` | nền "trang bìa đựng bài" |
| `--ink` | `#1a1530` | chữ, viền nút phụ |
| `--muted` | `#5f5a78` | chữ phụ |
| `--acc` / `--accd` | `#6b3cf0` / `#4b22c4` | nút chính và gờ dưới nút |
| `--paper` | `#f7f5f0` | mặt lá bài |

**Chữ**

- Big Shoulders Display 800, viết hoa, cho tên lá và tiêu đề lớn. **Line-height từ 1.14** (ở 1.0 dấu tiếng Việt của
  dòng dưới chạm dòng trên). Dấu phẩy của font này sát chữ: tránh dấu phẩy ngay sau U, Ư (đọc thành Ụ).
- Chakra Petch 700 cho số, nhãn, nút ("KD · 009/031", "LÊN HẠNG BẠC").
- Familjen Grotesk cho chữ thân và đáp án.

**Lá bài**

- Tỷ lệ 63 : 88 (cỡ bài thật). Kích thước theo một biến: `font-size = rộng × 0.0632px`, mọi phần bên trong dùng `em`.
- Từ trên xuống: tên từ + trình độ (A1, A2…); ô hình theo nhóm (Kinh doanh sọc tím, Du lịch chấm xanh ngọc, Ngoài đời
  lưới hồng) có chữ cái đầu mờ; dòng loại từ + hạng; nghĩa + câu ví dụ nghiêng; chân lá là số trong bộ ("KD ·
  009/031") và hạng · ngăn.
- Nút chính: nền `--acc`, gờ 4px `--accd`, nhấn xuống thì lún 4px. Đáp án: nền trắng, viền 2px `--ink`, gờ 5px.

**Motion**

| Chỗ | Thông số |
| --- | --- |
| Nghiêng theo chuột | `rotateX` ±9°, `rotateY` ±11° theo vị trí chuột; vệt sáng tròn theo chuột (`soft-light`); chỉ khi có chuột (`hover: hover`) và không bật giảm chuyển động |
| Lá Ánh kim | lớp sọc cầu vồng `color-dodge`, vị trí nền chạy theo chuột |
| Chia bài (Hôm nay) | 5 lá bay lên từ dưới 60px, spring `cubic-bezier(.34, 1.4, .64, 1)` 560ms, cách nhau 80ms |
| Lên hạng | vệt sáng quét chéo 700ms; đổi khung ở giữa vệt (260ms) để che lúc đổi; nhãn "LÊN HẠNG…" bật ra 320ms spring |
| Mở gói chủ đề | gói lùi xuống mờ đi 320ms, 4 lá bung ra spring 520ms cách nhau 90ms |

## Quy tắc chung cho cả hai

- Phiên luyện làm như app: trả lời đúng rồi Enter là "Đã biết", từ lên một ngăn; trả lời sai thì về ngăn 1 ngày. Từ
  đang ở ngăn 1 ngày mà sai thì viết "vẫn ở", không viết "về".
- Phím: `1`–`4` chọn, `Enter` sang câu, `H` gợi ý, `Esc` dừng. Phản hồi theo phím là tức thì; hiệu ứng chỉ dành cho
  trạng thái đúng/sai và lúc đổi câu.
- Giảm chuyển động: bỏ translate, scale, nghiêng, chỉ giữ đổi độ mờ và màu.
- Chữ trên nút: động từ + đối tượng ("Ôn 20 từ", "Luyện 20 lá", "Thêm vào Từ gặp ngoài đời").
