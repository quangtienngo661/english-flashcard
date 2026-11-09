# Motion và chuyển cảnh của Wordmet (08/11/2026)

Tài liệu gom mọi chuyển động và chuyển cảnh đã chốt cho giao diện mới, kèm motion đang chạy trong code, để code UI mới khớp
với UI hiện có. Số liệu chép từ các nguồn dưới đây, đọc ngày 08/11/2026; khi hai nguồn lệch nhau, mục 9 ghi rõ để chốt lúc
code.

**Nguồn**

| Nguồn | Nội dung |
| --- | --- |
| `chong-the-mo.html` (cùng thư mục) | Thẻ ôn "Chồng thẻ tan mờ", chủ dự án chọn 08/11/2026 |
| `vong-7-chong-the-tu-dien.html` | Nhóm (băng chuyền N2, kiểu "Trượt mờ"), Tra từ (T3 "Từ hóa thẻ") |
| `vong-9-lich.html` | Nút lịch nổi, modal Lịch và Ngày |
| `vong-8-polish.html`, `vong-10-con-lai.html` | Nút, hộp thoại, chấm trạng thái đơn hàng |
| `style-da-chon.md` | Motion của hai hướng D (Tiêu điểm) và K (Thẻ bài), mục 8 |
| `packages/design-tokens/theme.css`, `apps/web/src/app/globals.css` | Token và keyframe đang chạy trong code |
| `docs/superpowers/specs/2026-11-03-landing-redesign-design.md` §6 | Motion của landing |
| `docs/audit/2026-10-26-motion-nguoi-hoc.md` | Motion phiên học đã làm trong code (1C, 2A, 3C, #4–#6) |
| Figma `JKnyUUtGjpGpfKK4PqBfdY`, trang "Motion" | 6 cảnh minh họa của landing (chỉ có khung, không ghi thông số) |

## 1. Nguyên tắc chung

- **Đường cong chính** của giao diện mới: `cubic-bezier(0.23, 1, 0.32, 1)`, ra nhanh rồi chậm dần. Code đã có token này với tên
  `--ease-out-strong` trong `globals.css`; dùng lại, không tạo tên mới.
- **Lò xo** (vượt một chút rồi về): `cubic-bezier(0.34, 1.56, 0.64, 1)`, đã có trong code là `--ease-spring`. Băng chuyền dùng
  hai biến thể nhẹ hơn, xem mục 3.
- **Mờ (blur) là ngôn ngữ chuyển cảnh chung:** thứ rời đi thì mờ dần và tan, thứ tới thì từ mờ thành nét. Mức hay dùng:
  6px (vật nhỏ như chip, dropdown, toast), 10–12px (thẻ, cả một vùng), 18px (thẻ tan khi trả lời).
- **Ra nhanh hơn vào:** rời đi 150–170ms, vào 300–340ms.
- **Phím phản hồi ngay:** chuyển động chỉ dành cho lúc đổi trạng thái (đúng/sai, sang thẻ, mở/đóng), không làm chậm thao tác
  bằng phím.
- **Không vòng lặp liên tục** ở màn dùng nhiều lần mỗi ngày (phiên ôn, phiên luyện). Ngoại lệ duy nhất: chấm "đang chờ" của
  đơn hàng (mục 6).
- **Hover chỉ trên thiết bị có chuột** (`@media (hover: hover)`).
- **Giảm chuyển động** (`prefers-reduced-motion: reduce`): xem mục 8.

## 2. Thẻ ôn: chồng thẻ tan mờ

Màn Ôn (lật thẻ, kéo sang Cần ôn lại / Đã biết). Mọi thời lượng nhân với `--slow` (bằng 1; chỉ để chậm lại khi xem thử).

**Chồng thẻ khi đứng yên** (thẻ sau nhỏ dần, mờ dần, thẻ thứ tư ẩn):

| Vị trí | `transform` | `filter` | `opacity` |
| --- | --- | --- | --- |
| Thẻ trên cùng | không | không | 1 |
| Thẻ thứ hai | `translateY(16px) scale(.95)` | `blur(5px)` | .85 |
| Thẻ thứ ba | `translateY(30px) scale(.9)` | `blur(9px)` | .5 |
| Thẻ thứ tư | `translateY(40px) scale(.86)` | `blur(12px)` | 0 |

Đổi vị trí giữa các tầng: `transform`, `filter`, `opacity` 300ms đường cong chính.

| Chỗ | Thông số |
| --- | --- |
| Lật thẻ | `rotateY(180deg)` 300ms đường cong chính, `perspective: 1400px`, `backface-visibility: hidden`. Bấm thẻ, Space hoặc nút "Lật thẻ". |
| Kéo thẻ đã lật | Thẻ theo tay: `translate(dx, dy·0.3)`, xoay `dx·0.055°`, tối đa ±14°. Thẻ hơi mờ theo quãng kéo (tới `blur(1.5px)`). Con dấu "Cần ôn lại" / "Đã biết" hiện dần theo quãng kéo. |
| Thẻ phía sau khi đang kéo | Nhích lên theo quãng kéo p (0 → 1): `translateY(16 − 12p)px`, `scale(.95 + .04p)`, `blur((1 − p)·5px)`, `opacity .85 + .15p`. |
| Ngưỡng chọn | Kéo quá 110px, hoặc vuốt nhanh hơn 0,55 px/ms khi đã kéo ít nhất 30px cùng chiều. |
| Thả chưa tới ngưỡng | Thẻ về chỗ 380ms đường cong chính. |
| Kéo khi chưa lật | Thẻ chỉ đi 30% quãng tay, tối đa 56px; quá 40px thì hiện "Lật thẻ để xem nghĩa trước đã." |
| Trả lời khi chưa lật (phím, nút) | Thẻ lắc: `translateX(-9px) rotate(-1.2deg)` → `translateX(8px) rotate(1deg)` → yên, 300ms `ease-out`. |
| Trả lời (thẻ tan) | Thẻ phóng to, mờ và tan: tới `translateX(±70px) rotate(±3deg) scale(1.22)`, `blur(18px)`, `opacity 0`. Khi kéo: `300 − tốc độ·80` ms (vuốt nhanh thì ngắn hơn). Khi bấm phím/nút: `translateX(±40px) rotate(±5deg)`, 240ms. Đường cong chính. Dấu của lựa chọn hiện rõ trong lúc tan. |
| Thẻ mới lên trên cùng | Từ `translateY(16px) scale(.92)`, `blur(10px)`, `opacity .55` về yên, 300ms đường cong chính. Nếu thẻ đó đang nhích theo tay thì đi tiếp từ chỗ đang đứng. |
| Từ vào đống bên trái/phải | Chip từ mới trượt vào đầu danh sách: từ `translateY(-6px) scale(.96)`, `blur(6px)`, `opacity 0`, 300ms; giữ 5 chip gần nhất. |
| Số đếm của đống | Nảy `scale(1.12)` → 1, 220ms. |
| Màn xong phiên | Các khối hiện lần lượt: từ `translateY(10px)`, `blur(12px)`, `opacity 0`, 520ms đường cong chính, cách nhau 90ms. |

## 3. Nhóm: băng chuyền "Trượt mờ"

Mỗi nhóm là một chồng thẻ; chồng giữa là nhóm đang chọn. Băng chuyền quay vòng: sau nhóm cuối là nhóm đầu, luôn đi đường ngắn
nhất.

**Vị trí theo khoảng cách k tới chồng giữa** (k = 0 là chồng giữa; bước 230px trên máy tính, 128px trên điện thoại):

| k | `transform` | `opacity` | `filter` của chồng |
| --- | --- | --- | --- |
| 0 | `translateX(0) scale(1)` | 1 | không |
| ±1 | `translateX(±bước) scale(.83)` | .7 | `blur(3.6px)` |
| ±2 | `translateX(±2·bước) scale(.66)` | .4 | `blur(7.2px)` |
| xa hơn | ẩn hẳn | 0 | — |

| Chỗ | Thông số |
| --- | --- |
| Đổi nhóm | `transform` 620ms `cubic-bezier(.3, 1.25, .5, 1)`; `opacity` 450ms đường cong chính; `filter` 500ms đường cong chính. Nhảy quá 3 bước (chọn từ danh sách) thì không chạy chuyển động. |
| Quầng màu nhóm sau băng chuyền | Đổi màu 700ms đường cong chính. |
| Khối thông tin dưới băng chuyền | Từng dòng nhích lên 14px và hiện dần, 460ms `cubic-bezier(.3, 1.3, .5, 1)`, cách nhau 45ms. Số thẻ chờ trượt dọc ±80% theo chiều đổi, 520ms `cubic-bezier(.3, 1.4, .5, 1)`. Thanh nhịp ôn chạy `scaleX` 0 → 1, 520ms, trễ 120ms, cách nhau 40ms. |
| Vuốt, bàn di chuột | Vuốt quá 40px thì sang nhóm. Cuộn ngang `deltaX` từ 12 trở lên, mỗi lần cách nhau ít nhất 380ms. Phím ← →. |
| Chọn nhóm ở xa (phím F) | Bảng chọn hiện: từ `translateY(-6px) scale(.97)`, `blur(6px)`, `opacity 0`, 220ms đường cong chính. |
| Rê chuột lên chồng giữa | Chồng nhấc `translateY(-8px)`, 300ms đường cong chính. |
| Mở nhóm (bấm chồng giữa, tên nhóm hoặc ↓) | (1) Chồng giữa nhấc `translateY(-6px) scale(1.03)` 170ms; cùng lúc mọi phần khác mờ `blur(0 → 12px)` và tan `opacity → 0`, 170ms `cubic-bezier(.4, 0, 1, 1)`, cách nhau 10ms. (2) Trang nhóm hiện ra: chồng bay về đầu trang (FLIP), 380ms `cubic-bezier(.3, 1.15, .5, 1)`; các phần của trang từ `blur(12px)`, `translateY(12px)`, `opacity 0` thành nét, 340ms đường cong chính, trễ 60ms, cách nhau 22ms. |
| Đóng nhóm (nút quay lại, ↑, Esc) | Phần của trang nhóm tan 150ms như trên; chồng bay về giữa băng chuyền (FLIP 380ms); băng chuyền từ mờ thành nét 340ms (không nhích dọc). |

Hai kiểu đã xem nhưng không chọn: "Vòng quay 3D" (vòng `rotateY`, bán kính 400px / 210px) và "Vòng cung" (chồng xếp theo
cung, xoay ±8° mỗi bước, `cubic-bezier(.34, 1.56, .64, 1)` 660ms).

## 4. Tra từ: "Từ hóa thẻ"

| Chỗ | Thông số |
| --- | --- |
| Chọn một mục trong trang từ điển | Thẻ cũ tan: tới `translateX(30px) rotate(3deg) scale(1.16)`, `blur(18px)`, `opacity 0`, 300ms. Thẻ mới tới: từ `translateY(16px) scale(.92)`, `blur(10px)`, `opacity .5` về `rotate(-1.5deg)`, 300ms. Khung xem trước: `blur(8px)`, `opacity .25` → nét, 260ms. Cùng đường cong chính. |
| Rê chuột lên chồng nhóm để thêm từ | `transform` 250ms đường cong chính. |
| Toast "Đã thêm … vào nhóm …" | Hiện từ `translate(-50%, 12px)`, `blur(6px)`, `opacity 0`, 260ms đường cong chính; tự tắt sau 2,4 giây. |

## 5. Nút lịch nổi, modal Lịch và Ngày

| Chỗ | Thông số |
| --- | --- |
| Nút lịch nổi: rê chuột | Nhấc `translateY(-2px)`, 180ms đường cong chính. |
| Nút lịch nổi: bấm | `scale(.95)`. |
| Chú thích "Lịch học L" cạnh nút | Hiện khi rê chuột hoặc focus: từ `translate(6px, -50%)`, `opacity 0`, 150ms. |
| Nút lịch khi modal mở | Ẩn: `opacity 0`, 200ms. |
| Lớp nền mờ | Hiện dần 200ms; nền `rgb(27 36 68 / .30)` + `backdrop-filter: blur(3px)`. |
| Modal Lịch mở (máy tính) | Từ `translate(-50%, 12px) scale(.97)`, `opacity 0`, 240ms đường cong chính. |
| Tấm trượt (điện thoại) | Từ `translateY(60px)`, `opacity .4`, 240ms đường cong chính. |
| Sang modal Ngày / về Lịch | Modal mới trượt vào từ phải (`+22px`) hoặc từ trái (`-22px`) khi quay lại, `opacity 0` → 1, 220ms đường cong chính. Điện thoại: nội dung tấm trượt hiện dần, nhích 4px, 200ms. |
| Đổi ngày, đổi tháng, lọc trong modal | Khung không chạy lại hiệu ứng; chỉ phần chi tiết ngày nhích lên 4px và hiện dần, 180ms. |
| Ô ngày: rê chuột, chọn | Nền và bóng đổi trong 150ms. |

## 6. Thành phần chung của giao diện mới

| Chỗ | Thông số |
| --- | --- |
| Nút chính | Rê chuột: `filter: brightness(1.12)`, 200ms. Bấm: `scale(.97)`, 150ms đường cong chính. |
| Hộp thoại, overlay (Thêm từ, Chọn nhóm, Giới thiệu Pro, Chi tiết giao dịch) | Trang mẫu vòng 10 chưa có hiệu ứng cho các hộp này. Đề xuất (chưa chốt): dùng cùng chuyển động với modal Lịch ở mục 5, tức lớp mờ 200ms, hộp 240ms (máy tính), tấm trượt từ dưới (điện thoại). |
| Chấm "đang chờ" ở trang đơn hàng | Nhấp nháy `opacity 1 → .3 → 1`, 1,4 giây `ease-in-out`, lặp mãi cho tới khi đơn đổi trạng thái. Chấm đỏ "đã dừng" đứng yên. |
| Thanh trên cùng (kính mờ) | Không có chuyển động; `backdrop-filter: blur(24px) saturate(1.6)` và bóng navy dưới thanh. |

## 7. Motion đang chạy trong code

**Token** (`packages/design-tokens/theme.css`):

| Token | Giá trị |
| --- | --- |
| `--transition-duration-instant` / `fast` / `base` / `slow` | 100 / 150 / 250 / 400ms |
| `--motion-wiggle`, `--motion-pop`, `--motion-toast` | 300 / 320 / 300ms |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| `--ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

**App** (`apps/web/src/app/globals.css`; dùng qua `motion-safe:`):

| Animation | Thông số | Dùng ở |
| --- | --- | --- |
| `overlay-in` / `overlay-out` | Hiện dần 200ms `--ease-standard` / tan 150ms `--ease-exit` | Lớp mờ sau hộp thoại |
| `dialog-in` / `dialog-out` | Từ `translateY(0.5rem) scale(.97)` 250ms `--ease-enter` / tới `scale(.98)` 150ms `--ease-exit` | Hộp thoại |
| `sheet-in` / `sheet-out` | `translateY(100%)` 250ms vào / 150ms ra | Tấm trượt điện thoại |
| `menu-in`, `menu-in-up` | ±0.25rem, 200ms `--ease-enter` | Menu |
| `toast-in` | Từ `translateY(0.9rem) scale(.96)` 300ms `--ease-spring` | Toast |
| `toast-out` | Tới `translateY(0.5rem)`, 150ms, qua view transition | Toast đóng (`app-ui/Toast.tsx`) |
| `theme-icon-in` / `-out` | Icon cũ bay lên, icon mới trồi lên, 250ms | Nút đổi giao diện |
| Lật thẻ (1C) | `rotateY(180deg)` 280ms `--ease-standard` (`--transition-duration-flip`) | `review/Flashcard.tsx` |
| `card-rise` (2A) | Từ `translateY(0.75rem)` 200ms `--ease-enter` | Thẻ / câu mới |
| `wiggle-soft` (3C) | Lắc ±3° 300ms | Đáp án chọn sai |
| `pop-in` | `scale(.8)` → 1, 180ms `--ease-spring` | Dấu ✓ đáp án đúng |
| `feedback-in` | Từ `translateY(0.25rem)` 160ms | Khối kết quả |
| `summary-in` | Từ `translateY(0.5rem)` 250ms, cách nhau 50ms | Màn tổng kết |
| `slide-out-*` / `slide-in-*` | 2rem, ra 100ms / vào 160ms | "Xem trước thẻ" ở trang nhóm |
| `card-in`, `wiggle`, `pop` | 400ms lò xo; ±6° 300ms; `scale(1.12)` 320ms | Thẻ luyện ở landing |
| `pressed` | Nút lún `translate: 0 0.18rem` khi bấm | Mọi nút |

**Landing** (đang chạy):

| Chỗ | Thông số |
| --- | --- |
| Màn đầu khi mở trang | Các dòng chữ `hero-in`: từ `translateY(1rem)`, 520ms `--ease-out-strong`, trễ 0 / 70 / 140 / 210ms. Cửa sổ app `hero-window-in`: từ `translateY(1.5rem) scale(.97)`, 640ms, trễ 120ms (`components/landing/Hero.tsx`). |
| Các phần khi cuộn tới (`Reveal`) | Nhích lên 16px và hiện dần, 400ms `--ease-enter`, trễ 0 / 40 / 60ms; bật khi 15% phần tử vào màn hình (`rootMargin: -10%` ở đáy). Không có JS thì nội dung vẫn hiện. |
| Hỏi đáp | Câu trả lời giãn 280ms `--ease-out-strong` (`::details-content` + `interpolate-size`), dấu + xoay 45°. |
| Lật thẻ mẫu | `rotateY` 320ms `cubic-bezier(0.23, 1, 0.32, 1)` (design landing §6). |
| Bài tập mẫu chọn sai | Rung 300ms. |

**Trang "Motion" trong Figma:** 6 cảnh của landing: (1) màn đầu khi tải trang, (2) bộ thẻ bay vào khi cuộn tới, (3) đoạn
văn đổi màu (đang tạm ẩn), (4) vệt sáng chạy quanh viền ở phần cuối, (5) trang 404: thẻ hiện từ mờ, (6) giá: viền Pro sáng
chạy, icon AI nhấp nhẹ. Các khung chỉ minh họa trạng thái, không ghi thời lượng. Cảnh 1 và 2 khớp `hero-in` và `Reveal` ở
trên. Cảnh 3, 4, 5, 6 chưa có thông số trong các tài liệu đã đọc: khi làm, chốt số trước rồi ghi bổ sung vào đây.

## 8. Giảm chuyển động

Áp cho cả giao diện mới và code (`prefers-reduced-motion: reduce`):

- Bỏ mọi dịch chuyển, phóng to, xoay, lật 3D và mờ. Chỉ giữ đổi độ mờ đục (`opacity`) và màu, tối đa 200ms.
- Thẻ ôn: thẻ tan bằng `opacity` 140ms; hai mặt thẻ đổi bằng `opacity` 160ms thay cho lật; chồng thẻ không mờ (chỉ lệch dọc
  12px và 22px). Kéo vẫn đưa thẻ sang ngang vì tay đang điều khiển nó.
- Băng chuyền: đổi nhóm ngay, không trượt; mở/đóng nhóm đổi trang ngay.
- Modal và tấm trượt: không chạy hiệu ứng (`animation: none`).
- Code hiện tại: quy tắc cuối `globals.css` đặt mọi `animation-duration` và `transition-duration` về 0.01ms;
  `lib/use-reduced-motion.ts` trả `true` lúc render phía server, nên HTML đầu tiên không có chuyển động.

## 9. Chỗ giao diện mới và code đang lệch nhau (chốt khi code)

| Chỗ | Giao diện mới | Code hiện tại |
| --- | --- | --- |
| Lật thẻ ôn | 300ms, đường cong chính | 280ms `--ease-standard` |
| Sang thẻ / câu mới | Thẻ cũ tan mờ, thẻ mới từ mờ thành nét (mục 2) | `card-rise` 200ms, không mờ |
| Hộp thoại | 240ms đường cong chính, nhích 12px | `dialog-in` 250ms `--ease-enter`, nhích 0.5rem |
| Tấm trượt điện thoại | Từ `translateY(60px)` kèm hiện dần | Từ `translateY(100%)`, không đổi độ đục |
| Bấm nút | `scale(.97)` | Lún gờ 0.18rem (`pressed`) |
| Màn tổng kết | Khối từ mờ thành nét 520ms, cách nhau 90ms | `summary-in` 250ms, cách nhau 50ms |

Gợi ý khi code: thêm token cho đường cong chính (đã có `--ease-out-strong`) và cho các mức mờ (6 / 12 / 18px). Các thời
lượng của giao diện mới nằm gần `fast` / `base` / `slow` hiện có, nên đổi số thì đổi ở token, không viết số rời trong
component.

## 10. Ý tưởng từ hướng D và K, chưa dùng ở màn đã chốt

Ghi lại để tham khảo; không có trong màn nào đã vẽ Figma (`style-da-chon.md` mục 8).

| Hướng | Chỗ | Thông số |
| --- | --- | --- |
| D | Đổi câu | Câu cũ: `opacity 0`, `blur(8px)`, `scale(.985)` 150ms. Câu mới: từ `blur(8px)`, `scale(1.015)`, 280ms đường cong chính. |
| D | Rê chuột lên đáp án | `font-weight` 400 → 700, 200ms (cần font biến thiên). |
| D | Gạch chân đáp án đúng | `scaleX` 0 → 1, 240ms; khi chọn sai, đáp án đúng gạch chậm 160ms. |
| D | Số thẻ hôm nay | Đếm từ 0 lên, 560ms, chỉ lần mở đầu tiên trong ngày. |
| K | Nghiêng theo chuột | `rotateX` ±9°, `rotateY` ±11°, vệt sáng theo chuột; chỉ khi có chuột. |
| K | Chia bài | 5 lá bay lên từ dưới 60px, lò xo `cubic-bezier(.34, 1.4, .64, 1)` 560ms, cách nhau 80ms. |
| K | Lên hạng | Vệt sáng quét chéo 700ms; đổi khung ở giữa vệt (260ms); nhãn bật ra 320ms lò xo. |
| K | Mở gói chủ đề | Gói lùi xuống, mờ đi 320ms; 4 lá bung ra lò xo 520ms, cách nhau 90ms. |
