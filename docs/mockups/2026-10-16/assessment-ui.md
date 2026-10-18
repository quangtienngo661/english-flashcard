Cảm ơn bạn đã gửi đầy đủ mã nguồn của **Mockup App Người Học v3**. Sau khi đối chiếu trực tiếp file HTML/CSS/JS này với bộ quy chuẩn **Wordmet Design System (Direction B)** ở trên, mình đánh giá lại toàn diện từ bố cục (layout), tỷ lệ không gian (spacing), luồng tương tác (UX flow) cho đến mức độ tuân thủ Design Tokens.

---

## 1. Đánh giá tổng quan: Những điểm Mockup v3 đã làm rất tốt

1. **Ý tưởng thị giác chủ đạo (Signature Visuals) rất có hồn:**
   * **Hộp Leitner 6 ngăn (`.box`) ở trang Nhóm:** Biến thuật toán Spaced Repetition (Mới, 1, 3, 7, 14, 30 ngày) thành một biểu đồ vật lý trực quan (chiều cao cột = tổng số từ, mực nước xanh đậm `.due` = số từ đến hạn hôm nay). Người học hiểu ngay cơ chế ôn tập mà không cần đọc giải thích dài dòng.
   * **Chồng thẻ vật lý (`.deck` ở trang Hôm nay & `.stack` ở Phiên ôn):** Các lớp thẻ lót phía dưới (`.edge.e1`, `.edge.e2`, `.layer.l1`, `.layer.l2`) tự động mỏng dần khi số thẻ giảm xuống (`left > 2`, `left > 1`) mang lại cảm giác tiến bộ rõ rệt.
   * **Nhận diện hình thái từ (Morphology / Lemma detection):** Ở trang *Thêm từ* (`went` $\rightarrow$ nhận ra quá khứ của `go`) và *Trang từ* (`left` $\rightarrow$ dẫn chiếu về `leave`), luồng xử lý giải quyết đúng nỗi đau thực tế của người học tiếng Anh khi đọc văn bản.
2. **Quy tắc "1 hành động màu vàng (`--sticker`) mỗi màn hình":** Giúp mắt người dùng luôn biết chính xác nút nào cần bấm tiếp theo trong vòng chưa đầy 1 giây.
3. **Responsive Container Query (`@container (min-width: 760px)`):** Chuyển đổi mượt từ Bottom Navigation trên điện thoại `390px` sang Left Navigation Rail + bố cục 2 cột (`.home-grid`) trên màn hình rộng.

---

## 2. Phân tích 7 vấn đề lớn về Bố cục & UX cần chỉnh sửa trên Mobile (`390px`)

### Vấn đề 1: Xung đột tầng điều hướng ở đáy màn hình (`.dock` đè lên `.nav`)
* **Vị trí lỗi:** Màn **Nhóm (`group`)** và **Lâu chưa ôn (`backlog`)**.
* **Hiện trạng:** Cả 2 màn hình này đều là trang con cấp 2 (đã có nút `← Quay lại` trên `.bar-top`), nhưng vẫn dùng hàm `wrap('home', ...)` nên luôn hiển thị thanh **Bottom Navigation `.nav`** (`Hôm nay | Tra từ | Cài đặt`). Đồng thời, bạn lại đặt thêm thanh **`.dock`** (`position: absolute; bottom: 0`) chứa nút *"Ôn 10 thẻ"* hoặc *"Học lại / Bỏ"* nằm ngay phía trên `.nav`.
* **Hệ quả:**
  * Hai thanh công cụ xếp chồng lên nhau ở đáy màn hình chiếm mất **`~155px` chiều dọc** (gần 20% chiều cao khung 820px), làm vùng danh sách từ bị thu hẹp và tạo cảm giác chân trang rất nặng nề.
  * Lớp nền mờ của `.dock` (`linear-gradient(to top, var(--canvas) 72%, transparent)`) kết thúc đột ngột ngay sát đường viền trắng của `.nav`.
* **Giải pháp tối ưu:**
  * Trên mobile (`< 760px`), các **trang con cấp 2 có nút `← Quay lại`** (`group`, `backlog`, `word`) **không nên hiển thị Bottom Navigation `.nav`** (chỉ hiện Left Rail khi ở màn hình rộng `@container (min-width: 760px)`). Khi đó, `.dock` sẽ nằm gọn gàng ở sát đáy màn hình, giải phóng hơn `70px` chiều cao cho nội dung và tránh bấm nhầm sang tab khác khi đang thao tác.

### Vấn đề 2: Bố cục 2 cột ở "Trang từ" (`.posblock`) làm nghẹt thở nội dung trên màn `390px`
* **Vị trí lỗi:** Màn **Trang từ (`word`)**.
* **Hiện trạng:** Class `.posblock` đang chia lưới cứng `grid-template-columns: 5.5rem 1fr; gap: 0 0.75rem`.
* **Phép tính không gian thực tế trên màn `390px`:**
  * Chiều rộng lòng trang (`.scroll`): $390\text{px} - 20\text{px (border)} - 40\text{px (padding)} = 330\text{px}$.
  * Trừ cột Từ loại bên trái (`5.5rem` = $88\text{px}$) và `gap` ($12\text{px}$) $\rightarrow$ cột danh sách nghĩa `.senses` chỉ còn **$230\text{px}$**.
  * Trong `.senses li` lại chia tiếp 3 cột (`1.4rem` số thứ tự + `1fr` chữ + `44px` nút `+` + `16px` gap) $\rightarrow$ **chiều rộng thực tế cho chữ nghĩa và câu ví dụ chỉ còn vỏn vẹn `~148px`!**
  * Ở độ rộng `148px`, câu thông báo xanh lá *"Đang học trong Mới thêm, chưa ôn lần nào. Thêm câu đã gặp"* bị ngắt xuống 4–5 dòng rất vụn.
* **Giải pháp tối ưu:**
  * Chuyển `.posblock` trên mobile từ chia cột ngang sang **xếp dọc (Stacked Section)**: Đưa `pos` (`verb`, `adjective`) và badge `lv` (`A1`) thành một hàng tiêu đề nhỏ ngang (flex row) nằm ngay phía trên danh sách `.senses`.
  * Nhờ vậy, phần nghĩa và câu ví dụ lấy lại được thêm **`100px` chiều ngang** (tăng từ `148px` lên `248px`), giúp câu ví dụ hiển thị trọn vẹn trên 1–2 dòng, thoáng và dễ đọc như từ điển chuyên nghiệp.

### Vấn đề 3: Trang "Hôm nay" (`home`) – Đuôi thẻ `.deck` đè vào nút link & "Bẫy điều hướng" ở nhóm IELTS
* **Vị trí lỗi:** Màn **Hôm nay (`home`)**.
* **Hiện trạng & Hệ quả:**
  1. **Tràn viền `.deck`:** Hai lớp thẻ lót `.edge.e1` (`translateY(0.55rem)`) và `.edge.e2` (`translateY(1.05rem) rotate(-1deg)`) dùng `position: absolute`, thò xuống đáy thẻ `.face` khoảng `17px`, trong khi `.deck` chỉ có `margin-bottom: 0.5rem` (`8px`). Kết quả là mép thẻ xanh dưới cùng đè sát vào nút link `"Xem cả nhóm"`.
  2. **Vị trí nút `"Xem cả nhóm"`:** Đặt nút text link nằm rời bên ngoài khối thẻ xanh làm tốn thêm `44px` chiều dọc và tách rời khỏi ngữ cảnh nhóm *"Công nghệ"*.
  3. **Bẫy điều hướng (Navigation Trap) ở dòng `IELTS`:** Trong dữ liệu, nhóm IELTS vừa có **`12 thẻ chờ`** đến hạn hôm nay, vừa có cảnh báo **`40 từ lâu chưa ôn`**. Nhưng trong JS (`if (d.group) goTo(d.group === 'ielts' ? 'backlog' : 'group')`), khi bấm vào dòng IELTS, người học bị đẩy thẳng vào màn `40 từ lâu chưa ôn` và **không có cách nào vào trang nhóm IELTS để ôn 12 thẻ đến hạn hôm nay!**
* **Giải pháp tối ưu:**
  * Tăng `margin-bottom` của `.deck` lên `1.25rem` và đưa nút `"Xem cả nhóm →"` lên góc phải trên cùng của thẻ `.face` (ngang hàng với tên nhóm `Công nghệ`), vừa gom đúng ngữ cảnh vừa đẩy mục *"Nhóm khác"* lên cao hơn.
  * Tách riêng hành động ở dòng nhóm có từ trễ hạn: Bấm vào dòng nhóm `IELTS` vẫn phải vào trang **Nhóm IELTS**; còn dòng cảnh báo đỏ `"40 từ lâu chưa ôn, cần bạn xem lại →"` được thiết kế thành một hộp/banner nhỏ bấm riêng (hoặc đặt banner đó ở đầu trang Nhóm IELTS) để dẫn sang màn `backlog`.

### Vấn đề 4: Trang "Nhóm" (`group`) – Lặp tiêu đề, hộp Leitner chưa lọc dữ liệu & danh sách từ "chết"
* **Vị trí lỗi:** Màn **Nhóm (`group`)**.
* **Hiện trạng:**
  1. **Lặp tiêu đề:** Thanh `.bar-top` đã có chữ `Công nghệ`, ngay dưới `.bar-top` lại có `<h1 class="h1">Công nghệ</h1>` cách nhau chưa tới `8px`.
  2. **Hộp Leitner (`.box`) bấm nhưng không phản hồi danh sách:** Các cột `.cell` có trạng thái `aria-pressed`, nhưng khi bấm vào cột (ví dụ ngăn *"3 ngày"*), danh sách từ bên dưới không hề lọc theo ngăn đó. Ngoài ra, các ngăn có `0` từ vẫn hiển thị vạch màu xanh nhạt cao `6%` (`min-height: 0.4rem`) khiến người dùng tưởng ngăn đó vẫn có từ.
  3. **Danh sách từ tĩnh:** Các dòng từ (`deploy`, `negotiate`, `went`...) chỉ là thẻ `<li>` tĩnh, bấm vào không mở ra `Trang từ` để xem nghĩa đầy đủ hay câu đã gặp.
* **Giải pháp tối ưu:**
  * Bỏ chữ lặp trên `.bar-top` (để trống hoặc để chữ `"Nhóm"` nhỏ màu `--muted` khi chưa cuộn) hoặc gộp tiêu đề.
  * Khi bấm vào 1 cột trong hộp Leitner (`st.cellSel !== null`), lọc ngay danh sách từ bên dưới theo ngăn đó kèm nút `"Hiện tất cả (18)"`. Với cột `0` từ, đổi màu nền `.fill` sang `var(--line)` để nhìn rõ là ngăn trống.
  * Biến mỗi dòng từ trong `.words li` thành phần tử bấm được (`data-entry`) để nhảy sang `Trang từ`.

### Vấn đề 5: Màn "Phiên ôn" (`study`) – Góc xoay thẻ mặt sau & Thiếu câu ngữ cảnh ở mặt trước
* **Vị trí lỗi:** Màn **Phiên ôn (`studyView`)**.
* **Hiện trạng:**
  1. **Xoay nghiêng `-1.2deg` ở cả Mặt sau:** Thẻ `.card` luôn giữ `transform: rotate(-1.2deg)`. Ở mặt trước chỉ có 1 từ lớn thì góc nghiêng trông rất tự nhiên và vui mắt. Nhưng khi lật sang **Mặt sau** có 6–7 dòng thông tin (từ loại, từ gốc, nghĩa, các biến thể từ, câu ví dụ từ điển, câu bạn đã gặp), việc bắt mắt người đọc quét nhiều dòng văn bản bị nghiêng `-1.2deg` liên tục sẽ gây mỏi mắt.
  2. **Đứt gãy triết lý "Học từ ngữ cảnh đã gặp" ở Mặt trước:** Trong `README.md`, điểm cốt lõi của Wordmet là học từ qua câu văn thực tế người học đã đọc. Thế nhưng ở **Mặt trước** của thẻ ôn tập, người học chỉ thấy từ đơn lẻ (`deploy` – `verb`) mà không thấy câu văn mình đã gặp (`We ___ the app every Friday` hoặc `We [deploy] the app every Friday`). Câu đã gặp chỉ hiện ra ở đáy mặt sau sau khi đã lật thẻ!
* **Giải pháp tối ưu:**
  * Khi thẻ ở trạng thái chưa lật (`!st.flipped`), giữ `transform: rotate(-1.2deg)`; ngay khi lật thẻ (`st.flipped = true`), thêm class `.is-flipped` đưa thẻ về **`transform: rotate(0deg)`** để văn bản thẳng hàng tuyệt đối.
  * Ở **Mặt trước thẻ**: Nếu từ đó có `c.met` (*"Câu bạn đã gặp"*), hãy hiển thị câu đó ngay ở mặt trước với từ mục tiêu được làm nổi bật hoặc che thành sticker `_ _` (đúng biểu tượng thương hiệu Wordmet!) để kích hoạt trí nhớ ngữ cảnh trước khi lật thẻ.

### Vấn đề 6: Luồng nút `← Quay lại` ở "Trang từ" (`word`) bị gán cứng về `search`
* **Vị trí lỗi:** Hàm `VIEWS.word()` đang viết cứng `backBar('', 'search')`.
* **Hệ quả:** Khi người dùng đang ở trang **Hôm nay**, bấm nút `+ Thêm từ` (mở sheet `quick`), rồi bấm nút `"Xem 'go' trước"` $\rightarrow$ app mở trang từ `go`. Lúc này khi họ bấm nút `← Quay lại`, thay vì quay về trang **Hôm nay** (kèm sheet đang mở), họ lại bị đẩy sang màn **Tra từ (`search`)**!
* **Giải pháp tối ưu:** Lưu biến `st.prevView` (và `st.prevSheet`) mỗi khi chuyển sang màn `word` để nút `← Quay lại` luôn trả người dùng về đúng nơi họ vừa xuất phát.

### Vấn đề 7: Một số điểm lệch chuẩn so với Design System (Direction B)
1. **Sử dụng ký tự Unicode thô thay vì SVG Icons:**
   * Quy chuẩn trong `README.md`: *"No icon font and no emoji... inline stroke icons: 24×24 view box, stroke 2.2, round caps and joins, no fill"*.
   * Trong mockup hiện đang dùng các ký tự Unicode `▦`, `⌕`, `⚙`, `←`, `⋯`, `✕`. Trên trình duyệt iOS Safari hoặc Android Chrome, ký tự `⚙` hoặc `▦` rất dễ bị biến thành emoji hoặc lệch tâm trong hộp `.ic`. Cần thay bằng bộ inline SVG gọn nhẹ.
2. **Đổ bóng mờ (`.menu`) vi phạm quy tắc "No soft shadows":**
   * Trong CSS hiện tại: `.menu { box-shadow: 0 0.75rem 2rem rgb(15 26 61 / 0.2); }` (bóng mờ `2rem`).
   * Theo `tokens.json`, `shadow-menu` của Direction B là bóng phẳng có viền: `box-shadow: 0 0 0 1px var(--line), 0 0.35rem 0 rgb(15 26 61 / 0.12);`.
3. **Nút `+ Thêm từ` (`.add`) che khuất nội dung cuối danh sách:**
   * Nút `.add` nổi ở góc phải dưới, nhưng ở màn `search`, dòng cuối `<p class="small">Còn 35 từ.</p>` hoặc nút liên kết dễ bị cảm giác chật chội nếu danh sách ngắn. Đồng thời trong Bottom Sheet `quick`, 3 nút hành động xếp dọc làm chiều cao sheet bị đẩy quá cao khi bàn phím điện thoại bật lên; nên xếp 2 nút phụ (`Xem "go" trước` và `Tự nhập nghĩa`) nằm trên **cùng 1 hàng ngang (2 cột)** bên dưới nút vàng chính.

---

## 3. Bản Code cập nhật (v3.1 Optimized) – Đã khắc phục toàn bộ các điểm trên

Dưới đây là những thay đổi cốt lõi mình đã tinh chỉnh trực tiếp trên cấu trúc file của bạn (giữ nguyên 100% tính năng và triết lý gọn nhẹ của bạn, chỉ nâng cấp bố cục, UX và chuẩn hóa theo Design System Direction B):

1. **Tự động ẩn Bottom Nav trên mobile ở các màn hình cấp 2 (`group`, `backlog`, `word`)** nhưng vẫn giữ Left Rail trên màn hình rộng (`wide`), chấm dứt hoàn toàn lỗi `.dock` đè lên `.nav`.
2. **Tái cấu trúc `.posblock` ở Trang từ** sang header ngang (`Từ loại + CEFR badge`), mở rộng diện tích hiển thị nghĩa và câu ví dụ thêm 100px.
3. **Khép kín tương tác Hộp Leitner 6 ngăn:** Bấm vào ngăn nào sẽ lọc ngay danh sách từ của ngăn đó bên dưới; ngăn `0` từ hiển thị trạng thái rỗng rõ ràng; bấm vào từng từ trong nhóm sẽ mở `Trang từ`.
4. **Nâng cấp Mặt trước & Mặt sau của Flashcard (`study`):** Mặt trước hiển thị câu ngữ cảnh đã gặp với khoảng trống sticker `_ _` đúng chất Wordmet; mặt sau tự động xoay thẳng `0deg` khi lật để dễ đọc.
5. **Sửa lỗi điều hướng:** Tách hành động xem nhóm `IELTS` và banner cảnh báo `40 từ lâu chưa ôn`; lưu lịch sử `prevView` cho nút Back ở `Trang từ`; gom gọn nút trong Sheet `Thêm từ` và thay các ký tự Unicode bằng SVG chuẩn stroke `2.2`.

Bạn có thể copy toàn bộ file HTML hoàn chỉnh dưới đây để chạy thử và so sánh trực tiếp với bản v3:

```html
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wordmet: mockup app người học v3.1 (Tối ưu Bố cục & UX)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;800&display=swap" rel="stylesheet">
<style>
/* v3.1 Optimized — Direction B tokens (packages/design-tokens/theme.css) */
:root {
  --field: #2445d6; --field-deep: #1a32a6; --field-soft: #eceffe; --on-field-muted: #dfe5ff;
  --sticker: #ffd84a; --sticker-deep: #c9a21a; --sticker-soft: #fff4c7;
  --ink: #0f1a3d; --muted: #4d5577; --placeholder: #5f6688;
  --paper: #ffffff; --canvas: #f1f3fd; --line: #e3e6f4; --line-strong: #7d84a8;
  --ok: #1b7a46; --ok-soft: #e3f4ea; --late: #b8352a; --late-soft: #fde8e5; --warn: #7a5200;
  --t-xs: 0.8125rem; --t-s: 1rem; --t-m: 1.25rem; --t-l: 1.5625rem; --t-xl: 1.9375rem; --t-xxl: 2.4375rem; --t-word: 2.75rem;
  --tap: 2.75rem; --ease: cubic-bezier(0.2, 0, 0, 1); --enter: cubic-bezier(0.05, 0.7, 0.1, 1); --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --font: 'Lexend', system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: #d9deef; color: var(--ink); font: 400 var(--t-s)/1.5 var(--font); -webkit-font-smoothing: antialiased; }
button, input, select { font: inherit; color: inherit; }
:focus-visible { outline: 3px solid var(--field); outline-offset: 2px; border-radius: 8px; }
.on-field :focus-visible { outline-color: var(--sticker); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

/* Inline SVG icon helper (matches Direction B: 24x24, stroke 2.2, round caps/joins) */
.svg-ic { width: 1.25rem; height: 1.25rem; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex: none; }

.toolbar { position: sticky; top: 0; z-index: 30; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; padding: 0.7rem 1rem; background: var(--ink); color: #fff; font-size: 0.875rem; }
.toolbar .grp { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.toolbar button { border: 1px solid #3a4677; background: transparent; color: #fff; border-radius: 0.5rem; padding: 0.35rem 0.6rem; cursor: pointer; }
.toolbar button[aria-pressed="true"] { background: var(--sticker); color: var(--ink); border-color: var(--sticker); font-weight: 600; }
.toolbar .lbl { opacity: 0.7; }
.stage { display: flex; justify-content: center; padding: 1.5rem 1rem 3rem; }
.frame { width: 390px; height: 820px; border: 10px solid var(--ink); border-radius: 2.6rem; overflow: hidden; background: var(--canvas); container-type: inline-size; position: relative; display: flex; }
.frame.wide { width: min(1120px, 100%); height: 740px; border-width: 6px; border-radius: 1rem; }
.note { margin: 0 auto; max-width: 62rem; padding: 0 1rem 2rem; color: #33405f; font-size: 0.875rem; }

.shell { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
.screen { flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0; position: relative; }
.scroll { flex: 1; overflow-y: auto; padding: 0 1.25rem 6.5rem; }

/* Navigation: hidden on mobile subscreens so .dock never stacks on top of .nav */
.nav { order: 2; display: flex; background: var(--paper); border-top: 1px solid var(--line); padding: 0.35rem 0.5rem 0.75rem; }
.shell.subscreen .nav { display: none; }
.nav button { flex: 1; min-height: 3.25rem; border: 0; background: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; font-size: var(--t-xs); color: var(--muted); }
.nav .ic { width: 3.5rem; height: 1.9rem; border-radius: 9999px; display: grid; place-items: center; transition: background 150ms var(--ease); }
.nav [aria-current="page"] { color: var(--ink); font-weight: 600; }
.nav [aria-current="page"] .ic { background: var(--sticker); color: var(--ink); }
.nav .brand { display: none; }

/* Floating Add-word button */
.add { position: absolute; right: 1rem; bottom: 1rem; z-index: 6; min-height: 3.25rem; padding: 0 1.1rem 0 0.85rem; border: 0; border-radius: 0.9rem; cursor: pointer;
  background: var(--ink); color: #fff; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 0.25rem 0 rgb(15 26 61 / 0.35); transition: transform 100ms var(--ease); }
.add .plus { width: 1.5rem; height: 1.5rem; border-radius: 0.45rem; background: var(--sticker); color: var(--ink); display: grid; place-items: center; font-weight: 800; font-size: 1.1rem; line-height: 1; }
.add:active { transform: translateY(0.22rem); box-shadow: none; }

.bar-top { display: flex; align-items: center; gap: 0.25rem; min-height: 3.5rem; padding: 0.25rem 0.5rem; }
.bar-top .title { flex: 1; min-width: 0; font-weight: 600; font-size: 0.9375rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon { width: var(--tap); height: var(--tap); border: 0; border-radius: 0.75rem; background: none; cursor: pointer; display: grid; place-items: center; color: inherit; }
.icon:hover { background: rgb(15 26 61 / 0.06); }

/* Logo per Design System: [ _ _ ] sticker beside Wordmet in 800 */
.logo { font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; padding-left: 0.75rem; flex: 1; display: inline-flex; align-items: center; gap: 0.45rem; }
.blank { display: inline-flex; align-items: center; justify-content: center; padding: 0.12rem 0.42rem; background: var(--sticker); color: var(--ink); border-radius: 0.45rem; font-size: 0.82rem; font-weight: 800; letter-spacing: 0.06em; line-height: 1.1; box-shadow: 0 2px 0 var(--sticker-deep); }

.h1 { margin: 0.15rem 0 0; font-size: var(--t-xl); font-weight: 800; letter-spacing: -0.025em; line-height: 1.18; }
.lede { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.9375rem; }
.h2 { margin: 1.6rem 0 0.25rem; font-size: 1.125rem; font-weight: 800; letter-spacing: -0.015em; }
.small { font-size: var(--t-xs); color: var(--muted); }

/* Buttons */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; min-height: var(--tap); padding: 0 1.1rem; border: 0; border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: transform 100ms var(--ease); }
.btn:active { transform: translateY(0.22rem); box-shadow: none !important; }
.sticker { background: var(--sticker); color: var(--ink); box-shadow: 0 0.25rem 0 var(--sticker-deep); min-height: 3.25rem; font-size: 1rem; }
.quiet { background: var(--paper); color: var(--ink); box-shadow: inset 0 0 0 2px var(--line-strong), 0 0.18rem 0 var(--line-strong); }
.on-field .quiet { background: rgb(255 255 255 / 0.1); color: #fff; box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.65); }
.danger { background: var(--late); color: #fff; box-shadow: 0 0.25rem 0 #8a2219; min-height: 3.25rem; }
.link { background: none; border: 0; padding: 0; color: var(--field); font-weight: 600; text-decoration: underline; text-underline-offset: 0.2em; cursor: pointer; min-height: 2.25rem; display: inline-flex; align-items: center; font-size: 0.9375rem; }
.full { width: 100%; }

/* Home: physical deck stack with integrated group link */
.deck { position: relative; margin: 1.1rem 0 1.35rem; padding: 0 0.25rem; }
.deck .edge { position: absolute; left: 0.25rem; right: 0.25rem; height: 100%; border-radius: 1.35rem; background: var(--field-deep); }
.deck .edge.e1 { transform: translateY(0.5rem) rotate(1.3deg); opacity: 0.55; }
.deck .edge.e2 { transform: translateY(0.95rem) rotate(-1deg); opacity: 0.28; }
.deck .face { position: relative; border-radius: 1.35rem; background: var(--field); color: #fff; padding: 1.15rem 1.2rem 1.2rem; box-shadow: 0 0.35rem 0 var(--field-deep); }
.deck-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.deck .name { font-size: var(--t-l); font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
.deck-link { background: rgb(255 255 255 / 0.14); border: 0; color: #fff; font-size: var(--t-xs); font-weight: 600; padding: 0.35rem 0.65rem; border-radius: 9999px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; }
.deck-link:hover { background: rgb(255 255 255 / 0.22); }
.deck .waiting { margin-top: 0.2rem; color: var(--on-field-muted); font-size: 0.9375rem; }
.deck .waiting b { color: #fff; font-weight: 800; font-size: var(--t-m); }
.mix { list-style: none; margin: 0.85rem 0 1rem; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem 0.9rem; font-size: var(--t-xs); color: var(--on-field-muted); }
.mix li { display: inline-flex; align-items: center; gap: 0.35rem; }
.sw { width: 0.65rem; height: 0.65rem; border-radius: 0.2rem; }
.sw.pri { background: var(--sticker); } .sw.due { background: #fff; } .sw.new { background: transparent; box-shadow: inset 0 0 0 1.5px #fff; }

/* Other groups: separated group click vs backlog alert pill */
.rows { list-style: none; margin: 0; padding: 0; }
.rows > li { border-bottom: 1px solid var(--line); padding: 0.55rem 0; }
.grow { width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.2rem 0.75rem; min-height: 3.5rem; padding: 0.15rem 0.1rem; border: 0; background: none; text-align: left; cursor: pointer; }
.grow .gname { font-weight: 600; font-size: 1.0625rem; }
.grow .gnum { font-weight: 800; font-size: var(--t-m); text-align: right; line-height: 1.1; }
.grow .gnum small { display: block; font-weight: 400; font-size: var(--t-xs); color: var(--muted); margin-top: 0.1rem; }
.grow .done { color: var(--ok); font-size: var(--t-xs); font-weight: 600; background: var(--ok-soft); padding: 0.25rem 0.6rem; border-radius: 9999px; }
.late-btn { margin-top: 0.35rem; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.75rem; border-radius: 0.65rem; border: 0; background: var(--late-soft); color: var(--late); font-size: var(--t-xs); font-weight: 600; cursor: pointer; text-align: left; }
.mini { display: flex; gap: 2px; height: 0.4rem; margin-top: 0.4rem; width: 8.5rem; border-radius: 0.2rem; overflow: hidden; }
.mini span { background: var(--line); }
.mini span.f { background: var(--field); }

/* Group page: Leitner box with interactive filtering */
.box { margin-top: 0.9rem; background: var(--paper); border-radius: 1.25rem; padding: 0.9rem 0.75rem 0.75rem; box-shadow: 0 0.3rem 0 var(--line); }
.box-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem; align-items: end; height: 7.2rem; }
.cell { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; gap: 0.25rem; border: 0; background: none; padding: 0.15rem; cursor: pointer; border-radius: 0.6rem; }
.cell .num { font-weight: 800; font-size: 0.9375rem; text-align: center; }
.cell.empty .num { color: var(--placeholder); font-weight: 500; }
.cell .fill { border-radius: 0.45rem 0.45rem 0.25rem 0.25rem; background: var(--field-soft); position: relative; overflow: hidden; min-height: 0.35rem; transition: transform 150ms var(--ease); }
.cell.empty .fill { background: var(--line); min-height: 0.25rem; }
.cell .fill .due { position: absolute; left: 0; right: 0; bottom: 0; background: var(--field); }
.cell[aria-pressed="true"] { background: var(--sticker-soft); }
.cell[aria-pressed="true"] .fill { box-shadow: 0 0 0 2px var(--ink); }
.box-lab { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem; margin-top: 0.35rem; font-size: 0.75rem; color: var(--muted); text-align: center; font-weight: 500; }
.box-key { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.25rem 0.75rem; margin-top: 0.65rem; padding-top: 0.55rem; border-top: 1px solid var(--line); font-size: var(--t-xs); color: var(--muted); }
.box-key i { display: inline-block; width: 0.65rem; height: 0.65rem; border-radius: 0.2rem; margin-right: 0.3rem; vertical-align: -0.05rem; }

.words { list-style: none; margin: 0; padding: 0; }
.words li button { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 0.1rem 0.75rem; align-items: center; min-height: 3.5rem; padding: 0.5rem 0.15rem; border: 0; border-bottom: 1px solid var(--line); background: none; text-align: left; cursor: pointer; }
.words li button:hover { background: rgb(36 69 214 / 0.04); }
.words .w { font-weight: 600; color: var(--ink); }
.words .m { color: var(--muted); font-size: 0.9375rem; }
.words .when { font-size: var(--t-xs); color: var(--muted); text-align: right; }
.words .when.pri { color: var(--warn); font-weight: 600; background: var(--sticker-soft); padding: 0.15rem 0.5rem; border-radius: 9999px; }
.sec { margin: 1.25rem 0 0.1rem; font-size: 0.9375rem; font-weight: 800; display: flex; justify-content: space-between; align-items: center; }
.sec span { color: var(--muted); font-weight: 500; font-size: var(--t-xs); }

/* Bottom dock on subscreens */
.dock { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; padding: 0.85rem 1.25rem 1.1rem; background: linear-gradient(to top, var(--canvas) 78%, rgb(241 243 253 / 0)); display: grid; gap: 0.45rem; }

/* Study screen: context-first front, straight 0deg back */
.study { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; background: var(--field); color: #fff; animation: rise 250ms var(--enter); }
@keyframes rise { from { transform: translateY(1.25rem); opacity: 0; } }
.study .bar-top .title { color: var(--on-field-muted); font-weight: 500; }
.left { font-weight: 600; padding-right: 0.75rem; font-size: 0.875rem; color: var(--on-field-muted); }
.stage-card { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0.5rem 1.35rem 1rem; min-height: 0; }
.stack { position: relative; width: 100%; max-width: 24rem; }
.stack .layer { position: absolute; inset: 0; border-radius: 1.5rem; background: var(--field-deep); }
.stack .l1 { transform: translate(0.3rem, 0.55rem) rotate(1.8deg); }
.stack .l2 { transform: translate(-0.25rem, 1rem) rotate(-1.6deg); opacity: 0.55; }
.card { position: relative; min-height: 21.5rem; border-radius: 1.5rem; background: var(--paper); color: var(--ink); padding: 1.2rem 1.25rem 1.3rem; transform: rotate(-1.1deg); cursor: pointer; display: flex; flex-direction: column; box-shadow: 0 0.5rem 0 var(--field-deep); transition: transform 250ms var(--spring); }
.card.is-flipped { transform: rotate(0deg); }
.card .tag { align-self: flex-start; font-size: var(--t-xs); font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 9999px; background: var(--field-soft); color: var(--field); }
.card .tag.pri { background: var(--sticker); color: var(--ink); }
.card .front { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.35rem; }
.card .word { font-size: var(--t-word); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }
.card .pos { color: var(--muted); font-weight: 500; }
.card .ctx-preview { margin-top: 0.65rem; padding: 0.65rem 0.8rem; border-radius: 0.75rem; background: var(--canvas); font-size: 0.9375rem; color: var(--ink); line-height: 1.45; }
.card .ctx-preview .gap-pill { display: inline-block; padding: 0.05rem 0.45rem; border-radius: 0.35rem; background: var(--sticker); font-weight: 800; color: var(--ink); }
.card .hint { font-size: var(--t-xs); color: var(--placeholder); margin-top: 0.5rem; }
.card .back { animation: rise 220ms var(--enter); }
.card .w2 { font-size: var(--t-xl); font-weight: 800; letter-spacing: -0.02em; margin-top: 0.5rem; line-height: 1.15; }
.card .mean { font-size: 1.35rem; font-weight: 800; color: var(--ok); margin-top: 0.35rem; line-height: 1.25; }
.card .forms { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.55rem; }
.token { font-size: var(--t-xs); padding: 0.2rem 0.55rem; border-radius: 0.45rem; box-shadow: inset 0 0 0 1.5px var(--line); color: var(--muted); }
.card .ex { margin-top: 0.75rem; font-size: 0.9375rem; line-height: 1.45; }
.card .ex b, .card .met b { color: var(--field); }
.card .met { margin-top: 0.6rem; padding: 0.65rem 0.8rem; border-radius: 0.75rem; background: var(--sticker-soft); font-size: 0.9375rem; line-height: 1.45; }
.card .met .small { color: var(--warn); font-weight: 600; }
.answers { padding: 0.5rem 1.25rem 1.15rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
.answers .btn { min-height: 3.5rem; line-height: 1.2; padding: 0.35rem 0.5rem; text-align: center; }
.answers.one { grid-template-columns: 1fr; }
.end { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 1.5rem; }
.end .big { font-size: var(--t-xxl); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; }
.tally { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-top: 1.5rem; }
.tally div { border-radius: 1rem; padding: 0.9rem 1rem; background: rgb(255 255 255 / 0.12); }
.tally b { display: block; font-size: var(--t-xl); font-weight: 800; font-variant-numeric: tabular-nums; }

/* Word page: full-width stacked POS headers instead of cramped 5.5rem side column */
.entry { margin-top: 0.25rem; }
.entry .hw { font-size: var(--t-word); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin: 0; }
.formrow { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
.formrow .token { min-height: 2.15rem; display: inline-flex; align-items: center; font-size: 0.875rem; background: var(--paper); }
.formrow button.token { border: 0; cursor: pointer; color: var(--field); font-weight: 600; box-shadow: inset 0 0 0 1.5px var(--field); }
.posblock { margin-top: 1.25rem; background: var(--paper); border-radius: 1rem; padding: 0.85rem 1rem; box-shadow: 0 0.2rem 0 var(--line); }
.pos-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-bottom: 0.45rem; border-bottom: 1.5px solid var(--line); }
.pos-head .p { font-weight: 800; font-size: 1rem; color: var(--ink); }
.pos-head .lv-badge { font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; background: var(--field-soft); color: var(--field); }
.senses { list-style: none; margin: 0; padding: 0; counter-reset: s; }
.senses li { counter-increment: s; display: grid; grid-template-columns: 1.35rem 1fr auto; gap: 0.4rem 0.6rem; align-items: start; padding: 0.7rem 0; border-bottom: 1px solid var(--line); }
.senses li:last-child { border-bottom: 0; padding-bottom: 0.15rem; }
.senses li::before { content: counter(s) "."; font-weight: 800; color: var(--muted); font-size: 0.875rem; padding-top: 0.1rem; }
.senses .mean { font-weight: 600; color: var(--ink); line-height: 1.35; }
.senses .ex { font-size: 0.875rem; color: var(--muted); margin-top: 0.2rem; line-height: 1.4; }
.senses .learning { margin-top: 0.4rem; padding: 0.35rem 0.6rem; border-radius: 0.5rem; background: var(--ok-soft); font-size: var(--t-xs); color: var(--ok); font-weight: 500; display: inline-block; }
.plusbtn { width: 2.5rem; height: 2.5rem; border-radius: 0.7rem; border: 0; cursor: pointer; background: var(--field-soft); color: var(--field); font-size: 1.25rem; font-weight: 800; display: grid; place-items: center; }
.plusbtn:hover { background: #dfe4fd; }
.senses:not(.multi) li { grid-template-columns: 1fr auto; }
.senses:not(.multi) li::before { content: none; }
.ref { color: var(--field); font-weight: 600; text-decoration: underline; text-underline-offset: 0.2em; cursor: pointer; background: none; border: 0; padding: 0; }

/* Search */
.searchbox { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; background: var(--paper); border-radius: 0.85rem; padding: 0.25rem 0.6rem 0.25rem 0.9rem; box-shadow: inset 0 0 0 2px var(--line-strong); }
.searchbox:focus-within { box-shadow: inset 0 0 0 2px var(--field); }
.searchbox input { flex: 1; border: 0; outline: none; background: none; font-size: 1rem; min-height: 2.6rem; }
.filters { display: flex; gap: 0.4rem; overflow-x: auto; margin: 0.75rem -1.25rem 0; padding: 0 1.25rem 0.25rem; scrollbar-width: none; }
.filter { flex: none; min-height: 2.25rem; padding: 0 0.8rem; border-radius: 9999px; border: 0; background: var(--paper); box-shadow: inset 0 0 0 1.5px var(--line-strong); cursor: pointer; font-size: 0.875rem; font-weight: 500; }
.filter[aria-pressed="true"] { background: var(--ink); color: #fff; box-shadow: none; font-weight: 600; }
.results { list-style: none; margin: 0.4rem 0 0; padding: 0; }
.results button { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 0 0.75rem; align-items: center; min-height: 3.6rem; padding: 0.5rem 0.1rem; border: 0; border-bottom: 1px solid var(--line); background: none; text-align: left; cursor: pointer; }
.results .w { font-weight: 600; font-size: 1.0625rem; }
.results .m { color: var(--muted); font-size: 0.9375rem; }
.lvl { font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.45rem; border-radius: 0.35rem; background: var(--field-soft); color: var(--field); }

/* Sheets and menus (Direction B flat ledge shadow) */
.scrim { position: absolute; inset: 0; z-index: 10; background: rgb(15 26 61 / 0.45); display: flex; align-items: flex-end; animation: fade 200ms var(--ease); }
@keyframes fade { from { opacity: 0; } }
.sheet { width: 100%; max-height: 92%; overflow-y: auto; background: var(--paper); border-radius: 1.5rem 1.5rem 0 0; padding: 0.5rem 1.25rem 1.25rem; animation: rise 250ms var(--enter); }
.grab { width: 2.5rem; height: 0.3rem; border-radius: 9999px; background: var(--line-strong); opacity: 0.5; margin: 0.25rem auto 0.75rem; }
.sheet h2 { margin: 0; font-size: var(--t-m); font-weight: 800; letter-spacing: -0.02em; }
.label { display: block; margin-top: 0.8rem; font-size: var(--t-xs); font-weight: 500; color: var(--muted); }
.input { width: 100%; min-height: 2.9rem; margin-top: 0.25rem; padding: 0 0.9rem; border-radius: 0.75rem; border: 2px solid var(--line-strong); background: var(--canvas); font-size: 1rem; }
.input:focus { background: var(--paper); border-color: var(--field); outline: none; }
.input.big { min-height: 3.25rem; font-size: 1.15rem; font-weight: 600; background: var(--paper); }
.sentence { margin-top: 0.25rem; padding: 0.7rem 0.9rem; border-radius: 0.75rem; border: 2px solid var(--line-strong); background: var(--paper); font-size: 1rem; line-height: 1.45; }
.sentence u { text-decoration: none; border-bottom: 3px solid var(--field); color: var(--field); font-weight: 600; background: var(--field-soft); padding: 0 0.2rem; border-radius: 0.2rem; }
.found { margin-top: 0.85rem; padding: 0.75rem 0.95rem; border-radius: 0.875rem; background: var(--field-soft); display: flex; justify-content: space-between; align-items: center; }
.found .w { font-weight: 800; font-size: 1.125rem; }
.actions { display: grid; gap: 0.55rem; margin-top: 1rem; }
.actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
/* Flat ledge shadow per shadow-menu token */
.menu { position: absolute; top: 3.4rem; right: 0.6rem; z-index: 9; min-width: 12.5rem; background: var(--paper); border-radius: 0.875rem; padding: 0.35rem; box-shadow: 0 0 0 1px var(--line), 0 0.35rem 0 rgb(15 26 61 / 0.14); animation: fade 150ms var(--ease); }
.menu button { display: block; width: 100%; min-height: 2.5rem; padding: 0 0.8rem; border: 0; background: none; text-align: left; border-radius: 0.5rem; cursor: pointer; font-size: 0.9375rem; }
.menu button:hover { background: var(--field-soft); }
.toast { position: absolute; left: 50%; bottom: 5.5rem; transform: translateX(-50%); z-index: 20; background: var(--ink); color: #fff; padding: 0.65rem 1rem; border-radius: 0.875rem; font-size: 0.875rem; white-space: nowrap; box-shadow: 0 0.3rem 0 rgb(15 26 61 / 0.25); animation: rise 300ms var(--spring); }
.setting { display: flex; justify-content: space-between; align-items: center; gap: 1rem; min-height: 4.1rem; border-bottom: 1px solid var(--line); }
.switch { position: relative; width: 3.25rem; height: 2rem; border-radius: 9999px; border: 0; background: var(--line-strong); cursor: pointer; flex: none; }
.switch::after { content: ''; position: absolute; top: 0.25rem; left: 0.25rem; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #fff; transition: transform 150ms var(--ease); }
.switch[aria-checked="true"] { background: var(--ok); }
.switch[aria-checked="true"]::after { transform: translateX(1.25rem); }
.seg { display: inline-flex; background: var(--paper); border-radius: 0.75rem; padding: 0.2rem; box-shadow: inset 0 0 0 1.5px var(--line-strong); }
.seg button { min-height: 2.25rem; padding: 0 0.75rem; border: 0; background: none; border-radius: 0.55rem; cursor: pointer; font-size: 0.875rem; }
.seg [aria-pressed="true"] { background: var(--ink); color: #fff; font-weight: 600; }
.pick { display: grid; grid-template-columns: 2.5rem 1fr; align-items: center; min-height: 3.5rem; border-bottom: 1px solid var(--line); cursor: pointer; }
.pick input { width: 1.25rem; height: 1.25rem; accent-color: var(--field); justify-self: center; }

/* Wide screens: Left rail always visible, 2-column layouts */
@container (min-width: 760px) {
  .frame .shell { flex-direction: row; }
  .shell.subscreen .nav { display: flex; }
  .nav { order: -1; flex-direction: column; justify-content: flex-start; width: 14rem; border-top: 0; border-right: 1px solid var(--line); padding: 1rem 0.75rem; gap: 0.25rem; }
  .nav button { flex: none; flex-direction: row; justify-content: flex-start; gap: 0.6rem; min-height: var(--tap); padding: 0 0.5rem; font-size: 0.9375rem; border-radius: 0.65rem; }
  .nav .ic { width: 2.4rem; height: 2rem; }
  .nav .brand { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 800; padding: 0.25rem 0.5rem 1.1rem; }
  .scroll { padding: 0 2.25rem 6.5rem; }
  .home-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 2.5rem; align-items: start; }
  .home-grid .h2 { margin-top: 0.5rem; }
  .add { right: 2rem; bottom: 1.5rem; }
  .dock { left: auto; right: 2rem; width: 22rem; background: none; }
  .scrim { align-items: center; justify-content: center; }
  .sheet { width: 29rem; border-radius: 1.5rem; }
  .grab { display: none; }
}
</style>
</head>
<body>
<div class="toolbar" role="toolbar" aria-label="Điều khiển mockup">
  <div class="grp"><span class="lbl">Khung:</span>
    <button data-frame="phone" aria-pressed="true">Điện thoại 390</button>
    <button data-frame="wide" aria-pressed="false">Màn rộng</button>
  </div>
  <div class="grp"><span class="lbl">Màn:</span>
    <button data-jump="onboard">Chọn ngôn ngữ</button>
    <button data-jump="home">Hôm nay</button>
    <button data-jump="group">Nhóm</button>
    <button data-jump="study">Phiên ôn</button>
    <button data-jump="backlog">Lâu chưa ôn</button>
    <button data-jump="search">Tra từ</button>
    <button data-jump="word">Trang từ</button>
    <button data-jump="quick">Thêm từ</button>
    <button data-jump="settings">Cài đặt</button>
  </div>
</div>
<div class="stage"><div id="frame" class="frame"></div></div>
<p class="note">Mockup v3.1 (đã tối ưu bố cục mobile & chuẩn hóa theo Wordmet Direction B): tách xung đột Dock/Nav, mở rộng Trang từ, lọc trực tiếp trên hộp Leitner 6 ngăn, hiển thị ngữ cảnh `_ _` trên mặt trước thẻ ôn.</p>

<script>
const ICONS = {
  home: '<svg class="svg-ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18"/></svg>',
  search: '<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  settings: '<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  back: '<svg class="svg-ic" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
  more: '<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>',
  close: '<svg class="svg-ic" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
};

const LEVELS = ['Mới', '1 ngày', '3 ngày', '7 ngày', '14 ngày', '30 ngày'];
const GROUPS = [
  { id: 'cn', name: 'Công nghệ', pri: 2, due: 5, neu: 3, total: 10, box: [3, 4, 5, 3, 2, 1], dueBox: [3, 3, 2, 2, 0, 0] },
  { id: 'ielts', name: 'IELTS', pri: 0, due: 12, neu: 0, total: 12, old: 40, box: [0, 6, 9, 14, 20, 31], dueBox: [0, 4, 5, 3, 0, 0] },
  { id: 'new', name: 'Mới thêm', pri: 0, due: 0, neu: 3, total: 3, box: [3, 0, 0, 0, 0, 0], dueBox: [3, 0, 0, 0, 0, 0] },
  { id: 'food', name: 'Ẩm thực A2', total: 0, box: [0, 0, 12, 18, 6, 2], dueBox: [0, 0, 0, 0, 0, 0] },
];
const WORDS_IN_GROUP = [
  { sec: 'Ưu tiên', items: [{ w: 'deploy', m: 'triển khai', when: 'Cần ôn lại', pri: true, boxIdx: 1 }, { w: 'leaves', m: 'số nhiều của leaf', when: 'Cần ôn lại', pri: true, boxIdx: 1 }] },
  { sec: 'Đến hạn hôm nay', items: [{ w: 'negotiate', m: 'đàm phán', when: 'Ngăn 3 ngày', boxIdx: 2 }, { w: 'bandwidth', m: 'băng thông', when: 'Trễ 2 ngày', boxIdx: 3 }, { w: 'went', m: 'quá khứ của go', when: 'Ngăn 1 ngày', boxIdx: 1 }] },
  { sec: 'Mới', items: [{ w: 'revenue', m: 'doanh thu', when: 'Chưa ôn lần nào', boxIdx: 0 }, { w: 'latency', m: 'độ trễ', when: 'Chưa ôn lần nào', boxIdx: 0 }] },
  { sec: 'Chưa tới hạn', items: [{ w: 'budget', m: 'ngân sách', when: 'Hẹn 22/11', boxIdx: 4 }, { w: 'server', m: 'máy chủ', when: 'Hẹn 28/11', boxIdx: 5 }] },
];
const CARDS = [
  { w: 'deploy', pos: 'verb', tag: 'Ưu tiên', pri: true, m: 'triển khai', forms: ['deploys', 'deploying', 'deployed'], ex: 'They <b>deploy</b> updates every week.', met: 'We <b>deploy</b> the app every Friday.' },
  { w: 'negotiate', pos: 'verb', tag: 'Đến hạn', m: 'đàm phán, thương lượng', forms: ['negotiates', 'negotiating', 'negotiated'], ex: 'We need to <b>negotiate</b> a better price.' },
  { w: 'went', pos: 'verb', tag: 'Đến hạn', m: 'quá khứ của go', ex: 'She <b>went</b> home early.', met: 'I <b>went</b> to the bank yesterday.' },
  { w: 'revenue', pos: 'noun', tag: 'Mới', m: 'doanh thu', forms: ['revenues'], ex: 'Our <b>revenue</b> grew by 20%.' },
];
const DICT = {
  left: { forms: null, blocks: [
    { pos: 'adjective', lv: 'A1', senses: [{ m: 'bên trái', ex: 'Raise your left hand.' }] },
    { pos: 'adverb', lv: 'A2', senses: [{ m: 'về phía bên trái', ex: 'Turn left at the corner.', learning: 'Đang học trong IELTS · Ngăn 3 ngày' }] },
    { pos: 'noun', lv: 'A2', senses: [{ m: 'phía bên trái', ex: 'Keep to the left.' }] },
    { pos: 'verb', lv: 'A1 · theo leave', senses: [{ m: 'quá khứ và phân từ của ', ref: 'leave', ex: 'She left an hour ago.' }] } ] },
  leave: { forms: ['leaves', 'leaving', 'left'], blocks: [
    { pos: 'verb', lv: 'A1', senses: [{ m: 'rời đi', ex: 'I leave work at six.' }, { m: 'để lại', ex: 'Leave your bag here.' }] },
    { pos: 'noun', lv: 'B1', senses: [{ m: 'kỳ nghỉ phép', ex: 'She is on maternity leave.' }] } ] },
  go: { forms: ['goes', 'going', 'went', 'gone'], blocks: [
    { pos: 'verb', lv: 'A1', senses: [{ m: 'đi', ex: 'Let’s go home.', learning: 'Đang học trong Mới thêm · Chưa ôn' }, { m: 'trở nên', ex: 'The milk went sour.' }] } ] },
  went: { forms: null, blocks: [{ pos: 'verb', lv: 'A1 · theo go', senses: [{ m: 'quá khứ của ', ref: 'go', ex: 'She went home early.' }] }] },
  deploy: { forms: ['deploys', 'deploying', 'deployed'], blocks: [{ pos: 'verb', lv: 'B2', senses: [{ m: 'triển khai (phần mềm, hệ thống)', ex: 'We deploy the app every Friday.', learning: 'Đang học trong Công nghệ · Ưu tiên' }] }] },
};
const RESULTS = [['bread', 'noun', 'bánh mì', 'A1'], ['cook', 'verb', 'nấu ăn', 'A1'], ['delicious', 'adjective', 'ngon', 'A2'], ['menu', 'noun', 'thực đơn', 'A2'], ['recipe', 'noun', 'công thức nấu ăn', 'A2']];
const BACKLOG = [['b1', 'abolish', 'bãi bỏ', 74], ['b2', 'curriculum', 'chương trình học', 67], ['b3', 'scholarship', 'học bổng', 65], ['b4', 'thesis', 'luận văn', 63]];

const st = { view: 'home', prevView: 'home', group: 'cn', studying: false, card: 0, flipped: false, tally: { known: 0, review: 0 }, sheet: null, menu: false, toast: '',
  entry: 'left', cellSel: null, filters: ['A2', 'Ẩm thực'], picked: new Set(['b1', 'b2']), remind: true, lang: 'vi' };
const frameEl = document.getElementById('frame');

const logoHtml = `<span class="logo"><span class="blank">_ _</span>Wordmet</span>`;

function navBar(active) {
  const items = [['home', ICONS.home, 'Hôm nay'], ['search', ICONS.search, 'Tra từ'], ['settings', ICONS.settings, 'Cài đặt']];
  return `<nav class="nav" aria-label="Điều hướng chính"><span class="brand"><span class="blank">_ _</span>Wordmet</span>${items.map(([id, ic, label]) =>
    `<button data-go="${id}" ${active === id ? 'aria-current="page"' : ''}><span class="ic" aria-hidden="true">${ic}</span>${label}</button>`).join('')}</nav>`;
}
const addBtn = '<button class="add" data-sheet="quick"><span class="plus" aria-hidden="true">+</span>Thêm từ</button>';
function backBar(title, to, menu) {
  return `<div class="bar-top"><button class="icon" data-go="${to}" aria-label="Quay lại">${ICONS.back}</button><span class="title">${title}</span>${menu ? `<button class="icon" data-menu="1" aria-label="Thao tác khác">${ICONS.more}</button>` : ''}</div>`;
}
function wrap(active, inner, isSub = false) {
  return `<div class="shell ${isSub ? 'subscreen' : ''}">${navBar(active)}<div class="screen">${inner}</div></div>`;
}
function miniStrip(g) {
  const total = g.box.reduce((a, b) => a + b, 0) || 1;
  return `<span class="mini" aria-hidden="true">${g.box.map((n, i) => `<span class="${g.dueBox[i] ? 'f' : ''}" style="flex:${Math.max(n, 0.4) / total}"></span>`).join('')}</span>`;
}

const VIEWS = {
  onboard() {
    return `<div class="screen"><div class="bar-top">${logoHtml}</div><div class="scroll">
      <h1 class="h1" style="margin-top:2rem">Bạn đọc nghĩa của từ bằng ngôn ngữ nào?</h1>
      <p class="lede">Giao diện cũng dùng ngôn ngữ này. Bạn có thể đổi lại bất cứ lúc nào trong Cài đặt.</p></div>
      <div class="dock"><button class="btn sticker" data-go="home">Tiếng Việt</button><button class="btn quiet" style="min-height:3.25rem" data-go="home">English</button></div></div>`;
  },
  home() {
    const g = GROUPS[0];
    const others = GROUPS.slice(1).map((x) => `<li>
      <button class="grow" data-group="${x.id}">
        <span><span class="gname">${x.name}</span>${miniStrip(x)}</span>
        ${x.total ? `<span class="gnum">${x.total}<small>thẻ chờ</small></span>` : '<span class="done">✓ Xong hôm nay</span>'}
      </button>
      ${x.old ? `<button class="late-btn" data-go="backlog"><span>${x.old} từ lâu chưa ôn · Cần bạn xem lại</span><span>→</span></button>` : ''}
    </li>`).join('');
    return wrap('home', `<div class="bar-top">${logoHtml}</div><div class="scroll"><div class="home-grid"><div>
      <h1 class="h1">Hôm nay</h1><p class="lede">25 thẻ đang chờ trong 3 nhóm</p>
      <div class="deck"><div class="edge e2"></div><div class="edge e1"></div><div class="face on-field">
        <div class="deck-head"><div class="name">${g.name}</div><button class="deck-link" data-group="cn">Xem nhóm →</button></div>
        <div class="waiting"><b>${g.total}</b> thẻ chờ ôn</div>
        <ul class="mix"><li><span class="sw pri"></span>${g.pri} ưu tiên</li><li><span class="sw due"></span>${g.due} đến hạn</li><li><span class="sw new"></span>${g.neu} mới</li></ul>
        <button class="btn sticker full" data-study="1">Ôn ${g.name}</button></div></div>
      </div>
      <div><h2 class="h2">Nhóm khác</h2><ul class="rows">${others}</ul><button class="link" style="margin-top:0.4rem" data-toast="Đã mở tạo nhóm mới">Tạo nhóm mới</button></div></div></div>${addBtn}`);
  },
  group() {
    const g = GROUPS.find((x) => x.id === st.group) || GROUPS[0];
    const max = Math.max(...g.box, 1);
    const totalWords = g.box.reduce((a, b) => a + b, 0);
    const cells = g.box.map((n, i) => `<button class="cell ${n === 0 ? 'empty' : ''}" data-cell="${i}" aria-pressed="${st.cellSel === i}" aria-label="${LEVELS[i]}: ${n} từ, ${g.dueBox[i]} đến hạn"><span class="num">${n}</span>
      <span class="fill" style="height:${n ? Math.round((n / max) * 76) + 8 : 6}%"><span class="due" style="height:${n ? Math.round((g.dueBox[i] / n) * 100) : 0}%"></span></span></button>`).join('');
    const menu = st.menu ? `<div class="menu" role="menu"><button role="menuitem" data-toast="Đã mở đổi tên nhóm">Đổi tên nhóm</button><button role="menuitem" data-study="all">Học tất cả ${totalWords} từ</button><button role="menuitem" style="color:var(--late)" data-sheet="remove">Xóa nhóm</button></div>` : '';
    const filteredGroups = st.cellSel === null ? WORDS_IN_GROUP : WORDS_IN_GROUP.map((s) => ({ ...s, items: s.items.filter((x) => x.boxIdx === st.cellSel) })).filter((s) => s.items.length > 0);
    const list = filteredGroups.length
      ? filteredGroups.map((s) => `<div class="sec">${s.sec}<span>${s.items.length} từ</span></div><ul class="words">${s.items.map((x) => `<li><button data-entry="${x.w}"><div><div class="w">${x.w}</div><div class="m">${x.m}</div></div><div class="when ${x.pri ? 'pri' : ''}">${x.when}</div></button></li>`).join('')}</ul>`).join('')
      : `<p class="small" style="margin-top:1.25rem;text-align:center">Chưa có từ mẫu trong ngăn ${LEVELS[st.cellSel]}.</p>`;
    return wrap('home', `${backBar('Danh sách nhóm', 'home', true)}${menu}<div class="scroll"><h1 class="h1">${g.name}</h1><p class="lede">${totalWords} từ · Tối đa 20 từ mới và 100 từ đến hạn mỗi ngày</p>
      <div class="box"><div class="box-row">${cells}</div><div class="box-lab">${['Mới', '1n', '3n', '7n', '14n', '30n'].map((l) => `<span>${l}</span>`).join('')}</div>
      <div class="box-key">
        <span><i style="background:var(--field)"></i>Đến hạn (${g.total}) · <i style="background:var(--field-soft)"></i>Chưa tới hạn</span>
        ${st.cellSel !== null ? `<button class="link" style="min-height:auto;font-size:var(--t-xs)" data-cell="${st.cellSel}">Bỏ lọc ngăn</button>` : '<span class="small">Chạm ngăn để lọc</span>'}
      </div></div>
      ${list}</div><div class="dock"><button class="btn sticker" data-study="1">Ôn ${g.total || totalWords} thẻ</button></div>`, true);
  },
  backlog() {
    const rows = BACKLOG.map(([id, w, m, d]) => `<label class="pick"><input type="checkbox" data-pick="${id}" ${st.picked.has(id) ? 'checked' : ''}><span><b>${w}</b><br><span class="small">${m} · Trễ ${d} ngày</span></span></label>`).join('');
    return wrap('home', `${backBar('IELTS', 'home')}<div class="scroll"><h1 class="h1">40 từ lâu chưa ôn</h1>
      <p class="lede">Các từ trễ hơn 60 ngày tạm rời khỏi phiên ôn hằng ngày. Chọn "Học lại" để đưa từ về ngăn Mới (vào tối đa 20 từ/ngày).</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem"><span class="small">Đã chọn ${st.picked.size} từ</span><button class="link" data-pickall="1">Chọn tất cả</button></div>${rows}</div>
      <div class="dock" style="grid-template-columns:1fr 1fr"><button class="btn sticker" data-toast="Đã đưa ${st.picked.size} từ về ngăn Mới">Học lại (${st.picked.size})</button><button class="btn quiet" style="min-height:3.25rem;color:var(--late)" data-toast="Đã bỏ ${st.picked.size} từ khỏi việc ôn">Bỏ qua</button></div>`, true);
  },
  search() {
    const fl = ['A1', 'A2', 'B1', 'B2', 'Ẩm thực', 'Công nghệ', 'Danh từ', 'Động từ', 'Từ của tôi'];
    return wrap('search', `<div class="bar-top">${logoHtml}</div><div class="scroll">
      <h1 class="h1">Tra từ</h1>
      <div class="searchbox"><span aria-hidden="true" style="color:var(--muted)">${ICONS.search}</span><input placeholder="Gõ một từ (ví dụ: deploy, left)…" aria-label="Tìm từ"><button class="btn quiet" style="min-height:2.25rem;padding:0 0.75rem;font-size:0.875rem" data-entry="left">Tìm</button></div>
      <div class="filters" role="group" aria-label="Lọc">${fl.map((f) => `<button class="filter" data-filter="${f}" aria-pressed="${st.filters.includes(f)}">${f}</button>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.6rem"><span class="small">40 từ · Đã ẩn 3 từ chức năng</span><button class="link" data-sheet="bulk">Thêm cả 40 từ</button></div>
      <ul class="results">${RESULTS.map(([w, p, m, l]) => `<li><button data-entry="left"><span><span class="w">${w}</span> <span class="small">· ${p}</span><br><span class="m">${m}</span></span><span class="lvl">${l}</span></button></li>`).join('')}</ul><p class="small">Còn 35 từ khác…</p></div>${addBtn}`);
  },
  word() {
    const d = DICT[st.entry] || DICT.left;
    const forms = d.forms ? `<div class="formrow">${d.forms.map((f) => DICT[f] ? `<button class="token" data-entry="${f}">${f}</button>` : `<span class="token">${f}</span>`).join('')}</div>` : '';
    const blocks = d.blocks.map((b) => `<div class="posblock"><div class="pos-head"><span class="p">${b.pos}</span><span class="lv-badge">${b.lv}</span></div><ol class="senses${b.senses.length > 1 ? ' multi' : ''}">${b.senses.map((s) => `<li><div><div class="mean">${s.m}${s.ref ? `<button class="ref" data-entry="${s.ref}">${s.ref}</button>` : ''}</div><div class="ex" lang="en">${s.ex}</div>${s.learning ? `<div class="learning">${s.learning} · <button class="ref" style="font-size:inherit" data-sheet="met">+ Thêm câu</button></div>` : ''}</div>
      ${s.learning ? '<span></span>' : '<button class="plusbtn" data-sheet="addto" aria-label="Thêm nghĩa này vào nhóm">+</button>'}</li>`).join('')}</ol></div>`).join('');
    return wrap('search', `${backBar('Quay lại', st.prevView || 'search')}<div class="scroll"><div class="entry"><h1 class="hw">${st.entry}</h1>${forms}${blocks}</div></div>`, true);
  },
  settings() {
    return wrap('settings', `<div class="bar-top">${logoHtml}</div><div class="scroll">
      <h1 class="h1" style="margin-bottom:0.5rem">Cài đặt</h1>
      <div class="setting"><div><b>Ngôn ngữ</b><div class="small">Nghĩa của từ và giao diện</div></div><div class="seg"><button aria-pressed="${st.lang === 'vi'}" data-lang="vi">Việt</button><button aria-pressed="${st.lang === 'en'}" data-lang="en">English</button></div></div>
      <div class="setting"><div><b>Nhắc học qua email</b><div class="small">Lúc 20:00 · Chỉ khi có thẻ chờ ôn</div></div><button class="switch" role="switch" aria-checked="${st.remind}" data-remind="1" aria-label="Nhắc học qua email"></button></div>
      <div class="setting"><div><b>Múi giờ</b><div class="small">Asia/Ho_Chi_Minh · Tự động theo thiết bị</div></div></div>
      <div class="setting"><div><b>lan@example.com</b><div class="small">Tài khoản học viên</div></div><button class="btn quiet">Đăng xuất</button></div></div>`);
  },
};

function studyView() {
  if (st.card >= CARDS.length) {
    return `<div class="study on-field" role="dialog" aria-label="Kết thúc phiên ôn"><div class="bar-top"><button class="icon" data-endstudy="1" aria-label="Đóng">${ICONS.close}</button><span class="title">Công nghệ</span></div>
      <div class="end"><div class="big">Hoàn thành ${CARDS.length} thẻ</div><p style="color:var(--on-field-muted)">Thẻ cần ôn lại quay về ngăn 1 ngày và nằm đầu nhóm. Ngày mai nhóm này có 4 thẻ đến hạn.</p>
      <div class="tally"><div><b>${st.tally.known}</b>✓ Đã biết</div><div><b>${st.tally.review}</b>Cần ôn lại</div></div></div>
      <div class="answers one"><button class="btn sticker" data-endstudy="1">Về trang chủ</button></div></div>`;
  }
  const c = CARDS[st.card];
  const left = CARDS.length - st.card;
  const layers = (left > 2 ? '<div class="layer l2"></div>' : '') + (left > 1 ? '<div class="layer l1"></div>' : '');
  const maskedMet = c.met ? c.met.replace(/<b>.*?<\/b>/, '<span class="gap-pill">_ _</span>') : '';
  const face = st.flipped
    ? `<span class="tag ${c.pri ? 'pri' : ''}">${c.pos}</span><div class="w2">${c.w}</div><div class="back"><div class="mean">${c.w} = ${c.m}</div>${c.forms ? `<div class="forms">${c.forms.map((f) => `<span class="token">${f}</span>`).join('')}</div>` : ''}<div class="ex" lang="en">${c.ex}</div>${c.met ? `<div class="met"><span class="small">Câu bạn đã gặp</span><br><span lang="en">${c.met}</span></div>` : ''}</div>`
    : `<span class="tag ${c.pri ? 'pri' : ''}">${c.tag}</span><div class="front"><div class="word">${c.w}</div><div class="pos">${c.pos}</div>${maskedMet ? `<div class="ctx-preview" lang="en">${maskedMet}</div>` : ''}</div><div class="hint">Nhớ nghĩa trong ngữ cảnh trước, rồi chạm để lật thẻ</div>`;
  return `<div class="study on-field" role="dialog" aria-label="Phiên ôn"><div class="bar-top"><button class="icon" data-endstudy="1" aria-label="Thoát phiên ôn">${ICONS.close}</button><span class="title">Công nghệ</span><span class="left">Còn ${left} thẻ</span></div>
    <div class="stage-card"><div class="stack">${layers}<div class="card ${st.flipped ? 'is-flipped' : ''}" data-flip="1" role="button" tabindex="0" aria-label="${st.flipped ? 'Mặt sau của thẻ' : 'Lật thẻ'}">${face}</div></div></div>
    ${st.flipped ? '<div class="answers"><button class="btn quiet" data-answer="review">✗ Cần ôn lại</button><button class="btn sticker" data-answer="known">✓ Đã biết</button></div>'
      : '<div class="answers one"><button class="btn sticker" data-flip="1">Lật thẻ</button></div>'}</div>`;
}

const SHEETS = {
  quick: () => `<h2>Bạn vừa gặp từ nào?</h2>
    <label class="label">Từ vựng<input class="input big" value="went"></label>
    <span class="label">Câu bạn đã đọc (chạm từ trong câu để đổi)</span><div class="sentence" contenteditable="true" lang="en">I <u>went</u> to the bank yesterday.</div>
    <div class="found"><div><span class="w">went</span> <span class="small">· verb</span><div class="small">Quá khứ của <button class="ref" data-entry="go">go</button></div></div><span class="lvl">A1</span></div>
    <div class="actions">
      <button class="btn sticker" data-sheet="addto">Lưu “went” vào nhóm</button>
      <div class="actions-row">
        <button class="btn quiet" data-entry="go">Xem “go” gốc</button>
        <button class="btn quiet" data-sheet="own">Tự nhập nghĩa</button>
      </div>
    </div>`,
  own: () => `<h2>Tự nhập nghĩa</h2><p class="small">Chỉ mình bạn thấy nghĩa này.</p>
    <label class="label">Từ<input class="input big" value="deployed"></label><p class="small" style="margin:0.35rem 0 0">Đã tự động gắn với từ gốc <button class="ref" data-entry="deploy">deploy</button>.</p>
    <label class="label">Nghĩa tiếng Việt<input class="input" placeholder="Ví dụ: đã triển khai"></label>
    <label class="label">Lưu vào nhóm<select class="input"><option>Mới thêm</option><option>Công nghệ</option><option>IELTS</option></select></label>
    <div class="actions"><button class="btn sticker" data-toast="Đã lưu deployed vào Mới thêm">Lưu từ</button></div>`,
  addto: () => `<h2>Lưu vào nhóm</h2><p class="small">Từ sẽ được xếp vào ngăn Mới.</p>
    <label class="label">Chọn nhóm<select class="input"><option>Mới thêm</option><option>Công nghệ</option><option>IELTS</option><option>Tạo nhóm mới…</option></select></label>
    <div class="actions"><button class="btn sticker" data-toast="Đã lưu từ vào Mới thêm">Lưu</button></div>`,
  met: () => `<h2>Thêm câu đã gặp</h2><p class="small">Mỗi nghĩa lưu tối đa 5 câu · Đang có 1/5 câu</p>
    <label class="label">Câu tiếng Anh bạn đã đọc<input class="input" placeholder="Turn left after the bridge."></label>
    <div class="actions"><button class="btn sticker" data-toast="Đã lưu câu ví dụ mới">Lưu câu</button></div>`,
  bulk: () => `<h2>Thêm cả 40 từ</h2><p class="small">Bộ lọc: A2 · Ẩm thực (Đã ẩn 3 từ chức năng, giữ nguyên 2 từ đã có)</p>
    <label class="label">Đưa vào nhóm<select class="input"><option>Nhóm mới: Ẩm thực A2</option><option>Mới thêm</option></select></label>
    <p class="small">Cả 38 từ sẽ vào ngăn Mới (tối đa 20 từ mới/ngày).</p>
    <div class="actions"><button class="btn sticker" data-toast="Đã thêm 38 từ vào Ẩm thực A2">Thêm 38 từ</button></div>`,
  remove: () => `<h2>Xóa nhóm Công nghệ?</h2>
    <p style="margin:0.65rem 0 0"><b>12 từ chỉ có trong nhóm này</b> sẽ bị xóa khỏi lịch ôn và mất toàn bộ tiến độ.</p><p class="small" style="margin:0.35rem 0 0">6 từ đang nằm chung ở nhóm khác sẽ được giữ nguyên.</p>
    <div class="actions"><button class="btn danger" data-toast="Đã xóa nhóm Công nghệ" data-go="home">Xóa nhóm và 12 từ</button><button class="btn quiet" data-closesheet="1">Giữ lại nhóm</button></div>`,
};

function paint() {
  let html = (VIEWS[st.view] || VIEWS.home)();
  if (st.studying) html += studyView();
  if (st.sheet) html += `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div>${SHEETS[st.sheet]()}</div></div>`;
  if (st.toast) html += `<div class="toast" role="status">${st.toast}</div>`;
  frameEl.innerHTML = html;
}
function goTo(v) {
  if (v !== st.view && st.view !== 'word') st.prevView = st.view;
  st.view = v; st.sheet = null; st.menu = false; st.studying = false; paint();
}
function startStudy() { st.studying = true; st.card = 0; st.flipped = false; st.tally = { known: 0, review: 0 }; st.sheet = null; st.menu = false; paint(); }
function say(t) { st.toast = t; paint(); setTimeout(() => { st.toast = ''; paint(); }, 2200); }

frameEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('scrim')) { st.sheet = null; paint(); return; }
  const t = e.target.closest('[data-go],[data-group],[data-study],[data-flip],[data-answer],[data-entry],[data-sheet],[data-closesheet],[data-toast],[data-filter],[data-remind],[data-lang],[data-pick],[data-pickall],[data-menu],[data-endstudy],[data-cell]');
  if (!t) { if (st.menu) { st.menu = false; paint(); } return; }
  const d = t.dataset;
  if (d.pick) { st.picked.has(d.pick) ? st.picked.delete(d.pick) : st.picked.add(d.pick); paint(); return; }
  if (d.pickall) { BACKLOG.forEach(([id]) => st.picked.add(id)); paint(); return; }
  if (d.menu) { st.menu = !st.menu; paint(); return; }
  if (d.toast) { st.sheet = null; st.menu = false; if (d.go) st.view = d.go; say(d.toast); return; }
  if (d.closesheet) { st.sheet = null; paint(); return; }
  if (d.endstudy) { st.studying = false; if (st.card >= CARDS.length) st.view = 'home'; paint(); return; }
  if (d.group) { st.group = d.group; st.cellSel = null; goTo('group'); return; }
  if (d.study) { startStudy(); return; }
  if (d.flip) { if (!st.flipped) { st.flipped = true; paint(); } return; }
  if (d.answer) { st.tally[d.answer]++; st.card++; st.flipped = false; paint(); return; }
  if (d.entry) {
    if (st.view !== 'word') st.prevView = st.view;
    st.entry = DICT[d.entry] ? d.entry : 'left';
    goTo('word'); return;
  }
  if (d.sheet) { st.sheet = d.sheet; st.menu = false; paint(); return; }
  if (d.cell) { const i = Number(d.cell); st.cellSel = st.cellSel === i ? null : i; paint(); return; }
  if (d.filter) { st.filters = st.filters.includes(d.filter) ? st.filters.filter((x) => x !== d.filter) : [...st.filters, d.filter]; paint(); return; }
  if (d.remind) { st.remind = !st.remind; paint(); return; }
  if (d.lang) { st.lang = d.lang; paint(); return; }
  if (d.go) goTo(d.go);
});
frameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.flip && !st.flipped) { st.flipped = true; paint(); } });
document.querySelector('.toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.frame) { frameEl.classList.toggle('wide', b.dataset.frame === 'wide'); document.querySelectorAll('[data-frame]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
  const j = b.dataset.jump; if (!j) return;
  if (j === 'study') { goTo('group'); startStudy(); }
  else if (j === 'quick') { goTo('home'); st.sheet = 'quick'; paint(); }
  else if (j === 'word') { st.entry = 'left'; goTo('word'); }
  else goTo(j);
});
paint();
</script>
</body>
</html>
```

---

## 4. Tóm tắt bảng so sánh trước & sau chỉnh sửa (Checklist cho v3.1)

| Hạng mục | Bản v3 hiện tại | Bản v3.1 tối ưu |
| :--- | :--- | :--- |
| **Chân trang màn cấp 2 (`group`, `backlog`)** | `.dock` nằm đè lên trên `.nav` (chiếm `155px` đáy màn hình). | Ẩn `.nav` trên mobile khi ở trang con cấp 2, chỉ giữ `.dock` gọn gàng. |
| **Bố cục Trang từ (`word`)** | Chia 2 cột `5.5rem 1fr` làm cột nghĩa chỉ còn rộng `~148px`. | Đưa `Từ loại + CEFR` thành thanh header ngang trên mỗi khối `.posblock`, mở rộng chiều ngang câu ví dụ lên `250px`. |
| **Điều hướng nhóm IELTS (`home`)** | Bấm vào dòng IELTS bị ép nhảy sang `backlog`, không vào được trang nhóm IELTS. | Bấm vào dòng IELTS $\rightarrow$ vào trang nhóm IELTS; tách nút cảnh báo đỏ `.late-btn` bấm riêng sang `backlog`. |
| **Hộp Leitner 6 ngăn (`group`)** | Bấm vào cột không lọc danh sách bên dưới; cột `0` từ vẫn hiện màu xanh nhạt. | Bấm cột lọc trực tiếp danh sách từ; cột `0` từ chuyển sang màu `--line` xám nhạt; bấm vào từ mở `Trang từ`. |
| **Phiên ôn Flashcard (`study`)** | Mặt trước chỉ hiện từ đơn lẻ; mặt sau nhiều chữ vẫn bị nghiêng `-1.2deg`. | Mặt trước hiện thêm câu ngữ cảnh đục lỗ `[ _ _ ]`; mặt sau tự xoay về `0deg` khi lật, định nghĩa theo chuẩn `word = meaning`. |
| **Icons & Shadows** | Ký tự Unicode (`▦`, `⌕`, `⚙`), bóng `.menu` mờ `2rem`. | Inline SVG chuẩn stroke `2.2` round cap; bóng phẳng `shadow-menu` đúng chuẩn Direction B. |