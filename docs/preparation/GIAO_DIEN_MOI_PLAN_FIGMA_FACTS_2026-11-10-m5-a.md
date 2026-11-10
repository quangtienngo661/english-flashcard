# Figma facts for M5a (practice pages), 2026-11-10

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, read-only (`get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs`). The `/figma-design-to-code` skill could not be loaded (unknown skill); continued without it. Phone frames (390) were read from screenshots plus `get_metadata` (overlay) because their code dumps are huge; phone copy comes from the screenshots, so small wording differences there are less certain than desktop copy.

Convention: "raw" = hard-coded value in the frame, no variable/text style bound. Text without a named style is "raw".

## 0. Tokens and styles seen across all frames

Colour variables (name = value):

| Variable | Value |
|---|---|
| `--ink` | #1b2444 |
| `--muted` | #525a78 |
| `--bg` | #f6f7fa |
| `--surface` | #ffffff |
| `--line` | #e1e5ee |
| `--ghost` | #c9cedc (unchecked checkbox border) |
| `--accent` | #1e3a8a |
| `--accent-soft` | #e7ecf8 |
| `--on-accent` | #ffffff |
| `--pass` / `--pass-soft` | #1b7a46 / #e4f2ea |
| `--fail` / `--fail-soft` | #b8352a / #f8e7e5 |
| `--mark` / `--mark-ink` | #ffd84a / #1b2444 (streak badge) |

Raw colours: group colours `#e5603f #149384 #7a55d3 #d99a17 #d2427a #2a86d1 #4a9637 #64708c`; box (ngăn) squares `#c07a45` (Ngăn 1 ngày), `#98a2b0` (Ngăn 3 ngày), `#9aa3b1` (Mới); white text on green "Đã biết" button is raw `white`.

Radius variables: `radius/sm` 6, `radius/md` 10, `radius/button` 10, `radius/modal` 16, `radius/pill` 999. `radius/xl` 20 (question card). Raw radii: 18 (page cards), 16 (example box), 14 (MCQ option), 12 (list wells), 9 (filled word chip), 6/5 (chips), 22 (result panel bottom corners), 7 (icon tile), 3 (colour squares).

Named text styles (from `get_design_context`): `Display/Logo` (Bricolage Grotesque ExtraBold 22), `Display/Card title` (Bricolage Bold 24, lh 1.3), `Body/Base` (Noto Sans Regular 16, lh 1.6), `Body/Base strong` (SemiBold 16), `Body/Small` (Regular 14, lh 1.5), `Body/Small strong` (SemiBold 14), `Body/Label` (SemiBold 13), `Body/Button` (SemiBold 15, lh 1.4).
Raw text (no named style): Bricolage ExtraBold 44 (page title, desktop) / 30 (phone), 34 (summary title and sentence words are Bold 34), 22, 84/60 big numbers, 88 weak-words count; JetBrains Mono Medium 11.5/12 (mono captions), Mono Bold 11 (kind chips), Noto Sans 12.5/13.5/14.5/15.

Effect styles: `Shadow/Card` (0 1 2 #1B24440F + 0 10 28 -14 #1B244433), `Shadow/Pop` (0 2 6 #1B244414 + 0 24 56 -24 #1B244457; used by modal and FAB), `Shadow/Row` (0 1 2 #1B24440F + 0 4 12 -8 #1B244429; selected row/segment), `Glass/Header` (background blur 24). Raw: primary button glow `0 10 14 rgba(30,58,138,.34)`; question card `0 10 14 rgba(27,36,68,.2) + 0 1 1`; dialog footer shadow `0 -16 8 rgba(27,36,68,.16)`.

Page background: component `Nền app/Lưới chấm` (Desktop `95:315`, Mobile `95:321`): 20 px dot grid + navy halo top-left + yellow halo bottom-right, absolute, bottom layer.

## 1. Luyện tập (practice home) `99:3169` desktop / `99:3391` phone

### Desktop layout
Frame 1440, nav `Thanh trên app/Desktop` (64 px, glass; tabs Hôm nay / Nhóm / Luyện tập (active, `--accent-soft` bg) / Tra từ; search "Tìm từ" with `/`; button "Thêm từ" with `N`; chip "Pro"; avatar "L"). Content column 1160 wide, padding 32 top / 124 bottom, gap 20.
Header row: title left, "Phiên hôm nay" block right (340 wide). Below: two columns, gap 24: main column (flex) + side column 320.
Floating calendar button (`Nút lịch nổi` 62x66, bottom 32 right 32): month strip "T11", day "8", streak badge flame "6".

### Header block (top to bottom)
- H1 "Luyện tập" (Bricolage ExtraBold 44, tracking -1.1).
- Mono 12 muted: `phiên luyện hôm nay · gói Pro` ; right-aligned `2/30` (Bricolage ExtraBold 16, ink).
- Progress bar 8 px high, track `--line`, fill `--accent` (width 23 of 340, i.e. 2/30), radius 4.
- Mono 11.5 muted: `một phiên chỉ tính khi bạn trả lời câu đầu tiên · mở lại lúc 00:00`.

### Main column
1. Card "Luyện nhanh" (surface, line border, radius 18, Shadow/Card, padding 28, gap 28): left text, right example box (300 wide, `--bg`, radius 16, padding 16).
   - Mono 12: `luyện nhanh · từ cần ôn hôm nay`
   - Big `34` (Bricolage ExtraBold 84, accent) + `từ trong 4 nhóm` (ExtraBold 28, ink)
   - Body 16 muted: `20 câu, trộn ba kiểu: trắc nghiệm, gõ từ, điền từ vào câu.`
   - Primary button `Bắt đầu 20 câu` + arrow icon (component `Nút`); text button `Tùy chỉnh` (`Nút chữ`).
   - Example box: mono 11.5 `ví dụ một câu · chọn từ đúng nghĩa`; word `triển khai` (ExtraBold 24); three option rows (border 1.5, radius 10, padding 12/8): `1 deploy` (pass-soft bg + pass border, right label `đúng` pass SemiBold 13), `2 delay`, `3 display`; numbers are `Phím` chips (22x22, accent-soft, radius sm, SemiBold 12 accent).
2. Card "Phiên đang dở" (padding 20/16, one row): `8/20` (ExtraBold 22, accent); `Phiên đang dở · Đề 12 · Writing` (SemiBold 15) over mono 11.5 `bắt đầu phiên mới sẽ đóng phiên này`; right `Nút chữ` `Làm tiếp câu 9 →`.
3. Section title `Luyện theo nguồn khác` (Bricolage Bold 22).
4. Card "Nguồn" (padding 20/6) with 4 rows separated by 1 px `--line` top borders. Each row: title (Bricolage Bold 18), description (Body 14.5 muted), tag chips (`--bg`, radius 6, 13 px ink; fail variants `--fail-soft` bg + `--fail` text), right `Nút chữ` action.
   - `Theo nhóm`: `Một nhóm, lọc theo ngăn hoặc từ ưu tiên.`; tags `Đề 12 · Writing · 48`, `Đề 14 · Reading · 36`, `+6 nhóm`; action `Luyện Đề 12 · Writing →`.
   - `Từ hay sai`: `Sai 2 lần trong 5 câu gần nhất; ngăn thấp làm trước.`; tags (fail) `deteriorate · sai 3/5`, `allocate · sai 2/5`, plain `+10 từ`; action `Luyện 12 từ →`.
   - `Đang ưu tiên`: `Từ bạn đã bấm Cần ôn lại, bấm lâu nhất làm trước.`; tag `9 từ trong 3 nhóm`; action `Luyện 9 từ →`.
   - `Luyện tất cả`: `Mọi từ đang học, từ lâu chưa luyện làm trước.`; tag `230 từ trong 8 nhóm`; action `Luyện 20 câu →`.
   - Note: "Luyện tất cả" and "Luyện nhanh" both give 20 questions; "Luyện nhanh" is due-words, the 4th row is all words. No separate "history link" row; history is reached through the calendar FAB and `Mở lịch học` (see below).

### Side column (320)
- Card `Gần đây` (padding 24, gap 12): title (Bricolage Bold 16); 4 rows with 22x22 tile (radius 7; fail-soft with `icon/x` or pass-soft with `icon/check`), word (SemiBold 14) + line (12.5 muted):
  - ✗ `deteriorate` / `bạn gõ deteriorated, đáp án deteriorate`
  - ✓ `viable` / `đúng`
  - ✗ `allocate` / `bạn chọn advocate, đáp án allocate`
  - ✓ `mitigate` / `đúng`
  - `Nút chữ` `Mở lịch học`.
- Card `Phím trong phiên`: `1 2 3 4` chips → `chọn đáp án`; `Enter` → `kiểm tra, rồi bấm nút đậm`; `H` → `xem gợi ý`; `Esc` → `dừng, xem tổng kết` (13.5 muted).

### Phone differences (390)
Nav `Thanh trên app/Mobile` (56 px: logo, search circle 40, avatar) and bottom tab bar `Thanh tab dưới` (72 px: Hôm nay, Nhóm, Luyện tập active, Tra từ), FAB small 54x58 above the tab bar. Content padding 16, gap 16. Title 30. Single column: header block, Luyện nhanh (no example box, big number 60 / 22), Phiên đang dở (button below the text, stacked), "Luyện theo nguồn khác" card with stacked rows (action under the tags), then `Gần đây` card under (the `Phím trong phiên` card is NOT drawn on phone). Copy identical to desktop.

### States not drawn
Empty practice (0 words due), 30/30 sessions used (only the overlay shows a disabled start), no current session (card hidden), Free plan header text, loading, error.

## 2. Overlay 7 "Tùy chỉnh phiên"

### Desktop `131:3890` (dialog `140:4049`, 840 x 643 at x300 y48 over the dimmed Luyện tập page)
Backdrop `Nền mờ` (full frame rectangle). Dialog: surface, `radius/modal` 16, Shadow/Pop.
- Header (72): `Tùy chỉnh phiên` (`Display/Card title`), close button 40x40 (`--bg`, radius md, `icon/x` 18).
- Body, two columns gap 32, padding 24:
  - Left "Từ" column (272): title `Từ` (Body/Base strong) + `48 từ` (Body/Small muted) + right dropdown `Chỉ một ngăn` with `icon/down`. Group list well (`--bg`, radius 12, padding 4) with 8 rows (36 high, `Hàng nhóm` `138:339`): 10x10 colour square (radius 3), name, count right, `icon/check`. First row selected (surface bg, Shadow/Row, SemiBold name): `Đề 12 · Writing` 48; then `Đề 9 · Listening` 40; `Đề 14 · Reading` 36; `Từ gặp ngoài đời` 22; `Đề 10 · Writing` 28; `Công việc · B1` 24; `Đề 11 · Speaking` 30; `Du lịch Nhật` 0 (opacity 45 = empty group). Colours in order: #e5603f #149384 #7a55d3 #d99a17 #d2427a #2a86d1 #4a9637 #64708c. All 8 instances contain a check icon; the frame does not show whether the check is hidden when unselected (ASSUMPTION: shown only when selected). Multi-select appears intended (check + "Chỉ một ngăn" refers to boxes, not groups).
  - Word filter segmented (`Nút chia đoạn` x3 in a `--bg` pill well, padding 4): `Mọi từ 48` (selected), `Cần ôn 24`, `Ưu tiên 4`.
  - Right "Câu hỏi" column (488): title `Câu hỏi`; well with 4 rows (`Hàng kiểu câu` `138:398`, 40 high; 44 when it has a segment): `Trắc nghiệm` ✓, `Đúng/sai` ✓, `Gõ từ` ✓ with segment `Theo nghĩa` / `Theo câu` / `Trộn` (Trộn selected), `Điền từ vào câu bạn đã lưu` unchecked (empty box, 1.5 `--ghost` border, radius 5). Checked box = accent fill 18x18 radius 5 with white check; checked row = surface + Shadow/Row + SemiBold.
  - Section `Câu AI viết` + stepper (`Chọn số câu AI`: pill well, minus button 32 (disabled opacity 40 at 0), number `0` (Body/Base strong, w32), plus button 32). Caption (Body/Small muted) `Tối đa 5 câu AI · còn 280 lượt`. Well (opacity 45 because count is 0) with rows: `Điền từ vào câu` ✓; `Trắc nghiệm theo câu` ✓ with segment `Chọn nghĩa` / `Chọn từ` / `Trộn` (Trộn selected).
- Footer (114, surface, top shadow): row: `Số câu` label + stepper `10` ; `Thứ tự:` label + value `Ưu tiên, đến hạn, rồi từ mới` + `icon/down` (dropdown); spacer; primary button `Bắt đầu 10 câu` + arrow (220 wide); below muted line `Dùng 1 trong 28 phiên còn lại hôm nay.`
- No `Công tắc` (switch) instance is used in this overlay: question types use checkbox rows (`Ô chọn`). Component `Công tắc` `138:324` is not placed in any frame read here (NOT verified elsewhere).

### States frame `131:4522` (1340 x 1892), each state drawn as a card with a mono note
1. `"Câu đã lưu + AI"`: `Gõ từ` (with segment) and `Điền từ vào câu bạn đã lưu` both on, plus AI `Điền từ vào câu` and `Trắc nghiệm theo câu` on; line: `Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết.`
2. `"Chỉ một ngăn"`: dropdown opens under the button (icon becomes `icon/up`); list: `Mọi ngăn`, `Ngăn Mới` 6, `Ngăn 1 ngày` 12, `Ngăn 3 ngày` 10 (selected: `--accent-soft` bg, SemiBold), `Ngăn 7 ngày` 8, `Ngăn 14 ngày` 7, `Ngăn 30 ngày` 5, each with a colour square; the selected box shows in the header ("Ngăn 3 ngày" with square) and the count beside `Từ` becomes `10 từ`.
3. Not enough AI count: red notice box (`--fail-soft`): title `Không đủ lượt câu AI` (SemiBold 16, `--fail`), body `Phiên này cần 5 lượt câu AI, bạn còn 3. Lượt câu AI mới vào 01/12.` and `Nút chữ` `Bỏ kiểu câu có AI`; start button `Bắt đầu 10 câu` disabled (opacity 45); line `Dùng 1 trong 28 phiên còn lại hôm nay.`
4. No question type chosen: `Chọn ít nhất một kiểu câu.` (SemiBold 14, `--fail`) above a disabled start button.
5. Daily limit used: disabled start button (opacity 45) and line below `Mở lại lúc 00:00` (replaces "Dùng 1 trong 28…").
6. `"3 câu AI"`: stepper shows `3`, both AI rows on (full opacity); caption `Tối đa 5 câu AI · còn 280 lượt`; footer line `Trong đó 3 câu AI, rải đều.`
7. `"Còn 3 lượt"`: stepper `3`, plus button disabled; caption `Tối đa 3 câu AI, vì bạn còn 3 lượt`.
8. `"Hết lượt"`: stepper `0` (both buttons look locked), AI rows opacity 45, caption `Hết lượt câu AI tháng này.`; for plan Miễn phí a `Nút chữ` `Xem gói Pro` below.
9. `"Để người học chọn"` (setting that lets learner pick arrangement, shown only when AI count >= 1): row `Xếp câu AI` + segment `Rải đều` (selected) / `Ngẫu nhiên`; note `khi admin chọn Để người học chọn`.
10. `"Theo số từ"`: word-filter segment `Mọi từ 48` / `Cần ôn 24` / `Ưu tiên 4` (selected); row `Số câu` stepper `4` + `tối đa 4`. Note says admin picks "Bằng số từ của phạm vi", i.e. count follows word count of the scope.
11. Type errors (two red SemiBold 14 lines): `Chọn ít nhất một kiểu câu AI.` (AI count > 0 but all AI types off) and `Chọn ít nhất một kiểu câu không cần AI cho 7 câu còn lại.` (all normal types off and AI count < session length; "7" = remaining questions).
Quota facts drawn: AI quota is "lượt" (units) per month (`Hết lượt câu AI tháng này`, renewal `01/12`); "28 phiên còn lại hôm nay" is the daily session quota (30 per day for Pro).

### Phone `131:4232` (top) and `141:4320` (scrolled to end)
Bottom sheet `Tấm Tùy chỉnh phiên` 390 x 788 at y56 over the dimmed Luyện tập page: grab handle (40x4), header `Tùy chỉnh phiên` + close 44x44, scrolling body (927 tall content), sticky footer (102): `Bắt đầu 10 câu →` full width (358x45) + `Dùng 1 trong 28 phiên còn lại hôm nay.`
Scroll content order: row `Từ` + `48 từ` + `Chỉ một ngăn ▾`; group dropdown field (48 high) showing colour square + `Đề 12 · Writing` + chevron (phone selects one group via dropdown, not a list); segment `Mọi từ 48 / Cần ôn 24 / Ưu tiên 4` (44 high buttons); `Câu hỏi` list (rows 44 high, Gõ từ row 104 with segment inside): same four rows as desktop; `Câu AI viết` + stepper 44px buttons (value 0) + `Tối đa 5 câu AI · còn 280 lượt`; AI rows (faded) `Điền từ vào câu`, `Trắc nghiệm theo câu` + `Chọn nghĩa / Chọn từ / Trộn`; then a two-row group: `Số câu` stepper `10` and `Thứ tự` value `Ưu tiên, đến hạn, rồi từ mới` + chevron (on desktop these two live in the footer). Touch targets 44 px.

## 3. Phiên luyện (session) frames

### Common desktop layout (1440; content column 760, gap 20, page padding 40 top/bottom)
- Session bar (36 high, 760 wide): close button 36x36 (surface, line border, radius 10, `icon/x` 18; named `Dừng phiên`, `Đóng phiên` in summary) ; title `Luyện tập · từ cần ôn hôm nay` (SemiBold 14, ink); progress bar (flex, 6 high, track `--line`, fill `--accent`, radius 3; at question 7/20 fill = 35%); mono 12 `câu 7 / 20`; count chips (`Đúng và sai`): pass chip `icon/check` 12 + bold 13 count (`--pass-soft` bg, radius 6), fail chip `icon/x` + count (`--fail-soft`). The calendar button is the floating `Nút lịch nổi` (bottom-right, T11 / 8 / streak 6); on phone the small calendar button sits at the right end of the session bar (no tab bar in session).
- Under the bar: `Câu hỏi và kết quả` stack: question card (`radius/xl` 20, surface, line border, padding 28/32/24, gap 16, z over the panel, overlap -26) and a result panel tucked under it (width 716, padding 44 top, 24 bottom, 28 sides, bottom corners 22, border 1.5 on bottom/left/right in `--pass` or `--fail`, bg `--pass-soft` / `--fail-soft`, Shadow/Card).
- Footer key legend (`Phím`): chips + 13 muted labels.

### Question card contents (all fill-in/MCQ frames)
Top row: kind chip (mono Bold 11, `--bg`, radius 5): `điền từ vào câu` or `trắc nghiệm theo câu`; `câu AI` chip (`--accent-soft`, accent text) on AI questions; spacer; flag icon 16 + `Nút chữ` `Báo lỗi` (right). Mono 12 muted instruction: `gõ từ còn thiếu, đúng dạng trong câu` (fill-in) / `chọn từ điền vào chỗ trống` (MCQ). Sentence words as Bricolage Bold 34, ink, lh 1.25, tracking -0.6, wrap gap 4/12: `Air quality tends to [blank] in the dry season.` Blank/filled chip: radius 9, border 2, padding 12 (pass: `--pass-soft` bg, `--pass` border and text; fail: `--fail-soft` + `--fail`). Last line (Body 14 muted): `AI dịch: Chất lượng không khí thường xấu đi vào mùa khô.` (shown on AI sentences; not drawn in the "gõ sai, còn làm lại" frame).
The empty "typing" state (input waiting for the learner) and the pre-answer MCQ state are NOT drawn; only after-answer states.

### 3.1 "vừa trả lời đúng" `100:3164` / phone `100:3291`
Bar: `câu 7 / 20`, chips ✓5 ✗2. Blank filled green `deteriorate`. Panel `Đúng rồi` (green): row: green circle 30 with white `icon/check`, `Đúng rồi` (Bricolage ExtraBold 22, `--pass`), spacer, `deteriorate · xấu đi` (SemiBold 15). Box line: square `#c07a45` `Ngăn 1 ngày` → `icon/arr` → square `#98a2b0` `Ngăn 3 ngày`, then muted `Nhấn Enter là Đã biết: deteriorate lên một ngăn.` Buttons (right aligned, h 46): `Cần ôn lại` + chip `1` (surface, 1.5 `--line` border), `Đã biết` (bg `--pass`, white text, `icon/check` 18, chip `Enter` opacity 85). Legend: `Enter` Đã biết; `1` Cần ôn lại; `Esc` Dừng phiên.
Phone: no key chips; note `Bấm Đã biết thì deteriorate lên một ngăn.`; two equal buttons `Cần ôn lại` and `✓ Đã biết`.
Result semantics: correct answer proposes "Đã biết" (promote box) vs "Cần ôn lại" (priority); Enter = Đã biết.

### 3.2 "gõ sai, còn làm lại" `178:5326` / phone `178:5442`
Chips ✓4 ✗2 (a wrong typed attempt does not yet add to count? count is 2 here; in 3.3 after viewing answer it is 3). Blank shows typed word `deteriorated` red (`--fail-soft`, `--fail` border) with mono 11 badge `lần 2` (attempt 2). Panel `Chưa đúng` (red circle with `icon/x`, no right-hand answer): SemiBold 15 `Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án.`; muted 14 `Làm lại mà đúng vẫn tính là đúng. Xem đáp án thì tính là sai.`; buttons: `Nút chữ` (Phụ, gray) `Xem đáp án`, `Gợi ý` + `icon/bulb` + chip `H` (surface), `Làm lại` + chip `Enter` (accent). Legend: `Enter` Làm lại; `H` Gợi ý; `Esc` Dừng phiên. No translation line.
Phone: `Gợi ý` and `Làm lại` side by side, `Xem đáp án` gray text button centred under them; no chips.
Not drawn: the hint after pressing Gợi ý, attempt 1 state (`Chưa đúng` before "lần 2"), max attempts.

### 3.3 "sai, đã xem đáp án" `178:5546` / phone `178:5657`
Chips ✓4 ✗3. Sentence shows typed word struck through (`Từ đã gõ (sai)`: `--fail-soft`, dashed 2 `--fail` border, line-through) then correct word green. Panel `Chưa đúng`, right `deteriorate · xấu đi`; muted `to become worse in quality` (English definition); note `Nhấn Enter để đưa deteriorate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.`; buttons `Câu tiếp` (surface) and `Cần ôn lại` + `Enter` (accent). Legend: `Enter` Cần ôn lại; `Esc` Dừng phiên.
Phone: note `Cần ôn lại: deteriorate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.`; the right-hand `deteriorate · xấu đi` is clipped (`xấu đ…`) in the phone frame (layout bug to avoid).

### 3.4 "trắc nghiệm chọn sai" `178:5755` / phone `178:5895`
Chips ✓4 ✗3. Kind chip `trắc nghiệm theo câu`, instruction `chọn từ điền vào chỗ trống`; blank shown filled with the correct answer (green). Options (`Lựa chọn` `3:51`; 2 x 2 grid desktop, 4 stacked on phone; h 52, radius 14, border 1.5, label Bricolage Bold 17, number chip `1`–`4`): correct `deteriorate` (pass-soft, pass border, right `icon/check` + `Đáp án đúng` bold 13 pass); picked wrong `dominate` (fail-soft, fail border, `icon/x` + `Bạn chọn` fail); others `accumulate`, `evaporate` plain with opacity 60. The number chips show on desktop; phone rows have no chips. Translation line under options. Panel identical to 3.3 (`Chưa đúng`, `deteriorate · xấu đi`, `to become worse in quality`, same note, `Câu tiếp` + `Cần ôn lại` Enter). Not drawn: MCQ before answering (hover/selected states) and MCQ answered correctly. True/false ("Đúng/sai") question: NOT drawn in any session frame; it exists only as a type row in the overlay. Typing question "Gõ từ" by meaning (`Theo nghĩa`) is not drawn either (only `Theo câu` style fill-in).

### 3.5 Tổng kết `119:4608` / phone `119:4701`
Wider column 880. Bar: close `Đóng phiên`, fill 100%, mono `xong 20 / 20`, chips ✓16 ✗4. Summary card (surface, radius 18, Shadow/Card, padding 32, gap 32): left ring 220x220 (green ring, red arc segment for wrong answers) with `16` (ExtraBold 68, ink) `/20` (34, muted) and mono 12 `câu đúng`; right: `Xong 20 câu.` (ExtraBold 34); body 15 muted `Từ cần ôn hôm nay, trộn 3 kiểu câu. Hôm nay còn 27/30 phiên luyện.`; `Cần ôn lại · 4 từ` (Bricolage Bold 16); list rows (top 1 px `--line`, py 12): word Bricolage Bold 17 + gloss 13.5 muted, right either `icon/check` + `Đã đưa vào ưu tiên` (SemiBold 13.5 `--pass`) or `Nút chữ` `Cần ôn lại`:
- `deteriorate` xấu đi: `Đã đưa vào ưu tiên` (already prioritised)
- `allocate` phân bổ: `Cần ôn lại`
- `viable` khả thi: `Cần ôn lại`
- `scrutiny` sự xem xét kỹ: `Cần ôn lại`
Actions: primary `Luyện thêm một phiên →`, `Nút chữ` `Đưa 3 từ còn lại vào ưu tiên`, `Nút chữ` `Về Luyện tập`.
No "Luyện lại từ sai →" in this frame; the nearest are `Đưa 3 từ còn lại vào ưu tiên` (bulk priority) and `Luyện thêm một phiên`. Phone: same content in 358 card, ring on top centred (smaller), rows stacked, three actions stacked.
Not drawn: summary with 0 wrong words, summary after Esc (stopped early; Esc legend says `dừng, xem tổng kết`), session-limit reached.

## 4. Từ hay sai (weak words) `119:4317` / phone `119:4482` (390 x 992)

Desktop: nav + column 1160. Back link `‹ Luyện tập` (`icon/back`, SemiBold 14 accent). Header: H1 `Từ hay sai` (44) + `Sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu.` (16 muted); right big `12` (Bricolage ExtraBold 88, `--fail`) over mono 12 `tất cả nhóm ▾` (group filter dropdown, default all groups). Card `Luyện từ hay sai` (Bricolage Bold 20) `Ngăn thấp trước, trộn ba kiểu câu. Đúng 4 lần liền là từ rời danh sách.` + `Nút chữ` `Tùy chỉnh` + primary `Luyện 12 từ →`. List card (padding 6/24/8): mono 11 header `từ`, `nghĩa`, `5 câu gần nhất`, `ngăn`, `sai gần nhất` (widths 170 / flex / 130 / 140 / 120); rows (Bricolage Bold 18 word, 14.5 muted gloss, ✓/✗ chips, box square + name, mono 12 time):

| từ | nghĩa | ✓ / ✗ | ngăn | sai gần nhất |
|---|---|---|---|---|
| deteriorate | xấu đi | 2 / 3 | Ngăn 1 ngày (#c07a45) | 21:42 hôm nay |
| allocate | phân bổ | 3 / 2 | Ngăn 1 ngày | 21:41 hôm nay |
| scrutiny | sự xem xét kỹ | 3 / 2 | Mới (#9aa3b1) | 21:39 hôm nay |
| prevalent | phổ biến | 3 / 2 | Ngăn 3 ngày (#98a2b0) | 07/11 |
| coherent | mạch lạc | 3 / 2 | Ngăn 3 ngày | 06/11 |

Footer row: mono 12 `đang có 5 / 12 từ` + `Nút chữ` `Xem thêm 7 từ` (pagination by "show more"). Rule paragraph (15 muted, lh 1.65, bold fragments): `Từ **vào** danh sách khi sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu. **Không tính** câu đúng nhờ gợi ý, và câu bạn đã báo lỗi đang được xem lại. Từ **rời** danh sách khi 5 câu gần nhất còn dưới 2 câu sai. Từ bạn đã bỏ khỏi việc học không nằm ở đây.` FAB bottom right.
Phone: title 30; count `12` right of title; subtitle wraps; card with `Tùy chỉnh` and `Luyện 12 từ →` side by side; list rows show only word + ✓/✗ chips (no gloss, box, time columns); `đang có 5 / 12 từ` + `Xem thêm 7 từ`; paragraph; tab bar + small FAB.
Contradiction to resolve: the practice-home row says `Sai 2 lần trong 5 câu gần nhất; ngăn thấp làm trước.` (semicolon, "ngăn thấp làm trước") and this page says `..., ở mọi kiểu câu.`; both are drawn as-is. Not drawn: empty state (0 weak words), loading, group filter dropdown open.

## Components needed (deduplicated)

| Component / piece | Where drawn | Notes |
|---|---|---|
| `Thanh trên app/Desktop` (64) + `Thanh trên app/Mobile` (56) + `Thanh tab dưới` (72) | 99:3169/3391, 119:4317/4482, overlay backdrops | tabs Hôm nay, Nhóm, Luyện tập, Tra từ; search `/`, Thêm từ `N`, chip `Pro`, avatar |
| `Nền app/Lưới chấm` Desktop `95:315` / Mobile `95:321` | every frame | dot grid + navy and yellow halos |
| `Nút lịch nổi` `95:343` Lớn 62x66 / Nhỏ 54x58 | home, session, weak words; hidden while modal open | opens Lịch học (key `L`); streak badge; on phone in session it sits in the bar |
| `Nút` `3:12` primary (with arrow) | Bắt đầu 20 câu, Luyện 12 từ, Bắt đầu 10 câu, Luyện thêm một phiên | glow shadow; disabled = opacity 45 |
| `Nút chữ` `166:326` (Thường navy, Phụ gray) | Tùy chỉnh, Làm tiếp câu 9 →, Báo lỗi, Xem đáp án, Mở lịch học, Xem thêm 7 từ, Cần ôn lại, Về Luyện tập, Xem gói Pro, Bỏ kiểu câu có AI | min 44 px tap area on phone |
| Session buttons: surface button (Gợi ý, Câu tiếp, Cần ôn lại [1]), accent button (Làm lại, Cần ôn lại [Enter]), pass button (Đã biết [Enter]) | session frames | h 46, radius button 10, 1.5 border on surface variant; not a library component, drawn inline |
| `Phím` `3:17` (key chip) | home side card, session buttons and legends | 22x22 or wide (Enter 51.5, Esc 36.5, H) |
| `Lựa chọn` `3:51` (Thường, Đúng, Sai) | MCQ options 3.4, home example box | Thường: surface + `--line`; Đúng: pass-soft + pass; Sai: fail-soft + fail; "not chosen after answer" = opacity 60; labels `Đáp án đúng`, `Bạn chọn` |
| Session bar (close square, progress bar, `câu n / N`, ✓ and ✗ count chips) | all session frames | `Đúng và sai` chips; progress 6 px |
| Question card + result panel (`Đúng rồi` / `Chưa đúng`), kind chip, `câu AI` chip, `Báo lỗi` | all session frames | panel tucked under the card (overlap -26, z-order) |
| Filled-word chip states | session | filled-correct, typed-wrong with `lần 2`, struck-through wrong (dashed) + correct |
| Summary ring chart 220 (green ring with red arc) | 119:4608/4701 | needs an SVG donut, 16/20 |
| `Hàng nhóm` `138:339` | overlay desktop | colour square + name + count + check; empty group opacity 45; selected = surface + Shadow/Row; phone uses a dropdown field instead |
| `Hàng kiểu câu` `138:398` | overlay | checkbox row 40 desktop / 44 phone; optional inline segment; disabled opacity 45 |
| `Ô chọn` checkbox (checked accent / unchecked ghost border) | overlay | 18x18 radius 5 |
| `Nút chia đoạn` `138:319` | overlay (word filter, Gõ từ, Trắc nghiệm theo câu, Xếp câu AI) | pill, selected = white + Shadow/Row; 32 desktop / 44 phone |
| Stepper (minus, number, plus; pill well) | overlay: `Chọn số câu AI`, `Chọn số câu` | 32 px buttons desktop, 44 phone; minus/plus disabled at limits (opacity 40) |
| Dropdown (`Chỉ một ngăn`, `Thứ tự`, group field, `tất cả nhóm ▾`) | overlay, weak words | box list popover with colour squares and counts |
| `Công tắc` `138:324` | not placed in any frame read | NOT used in these frames (overlay uses checkboxes); confirm with design before building |
| Dialog shell: backdrop, 840 modal (radius 16, Shadow/Pop) desktop, bottom sheet with handle on phone, sticky footer | overlay | footer has top shadow |
| Inline notices: red box (Không đủ lượt câu AI), red one-line errors, muted one-line quota/footers | overlay states | `--fail-soft` bg for the box |
| Tag chip (`--bg` or `--fail-soft`, radius 6) | practice home source rows | |
| Count chips ✓ n / ✗ m | session bar, weak-words rows | pass-soft / fail-soft, radius 6 |
| Weak-words table row (word, gloss, chips, box square, time) | 119:4317 | phone shows word + chips only |
| Icons | flag, bulb, check, x, arr, back, down/up, minus, plus, flame | `icon/*` components 12-18 px |

## Copy (flat list; D = desktop only, P = phone differs)

Home: `Luyện tập`; `phiên luyện hôm nay · gói Pro`; `2/30`; `một phiên chỉ tính khi bạn trả lời câu đầu tiên · mở lại lúc 00:00`; `luyện nhanh · từ cần ôn hôm nay`; `34`; `từ trong 4 nhóm`; `20 câu, trộn ba kiểu: trắc nghiệm, gõ từ, điền từ vào câu.`; `Bắt đầu 20 câu`; `Tùy chỉnh`; D: `ví dụ một câu · chọn từ đúng nghĩa`, `triển khai`, `deploy` / `delay` / `display`, `đúng`; `8/20`; `Phiên đang dở · Đề 12 · Writing`; `bắt đầu phiên mới sẽ đóng phiên này`; `Làm tiếp câu 9 →`; `Luyện theo nguồn khác`; `Theo nhóm`; `Một nhóm, lọc theo ngăn hoặc từ ưu tiên.`; `Đề 12 · Writing · 48`; `Đề 14 · Reading · 36`; `+6 nhóm`; `Luyện Đề 12 · Writing →`; `Từ hay sai`; `Sai 2 lần trong 5 câu gần nhất; ngăn thấp làm trước.`; `deteriorate · sai 3/5`; `allocate · sai 2/5`; `+10 từ`; `Luyện 12 từ →`; `Đang ưu tiên`; `Từ bạn đã bấm Cần ôn lại, bấm lâu nhất làm trước.`; `9 từ trong 3 nhóm`; `Luyện 9 từ →`; `Luyện tất cả`; `Mọi từ đang học, từ lâu chưa luyện làm trước.`; `230 từ trong 8 nhóm`; `Luyện 20 câu →`; `Gần đây`; `bạn gõ deteriorated, đáp án deteriorate`; `đúng`; `bạn chọn advocate, đáp án allocate`; `Mở lịch học`; D: `Phím trong phiên`, `chọn đáp án`, `kiểm tra, rồi bấm nút đậm`, `xem gợi ý`, `dừng, xem tổng kết`.

Overlay: `Tùy chỉnh phiên`; `Từ`; `48 từ`; `Chỉ một ngăn`; `Mọi từ 48`; `Cần ôn 24`; `Ưu tiên 4`; group names `Đề 12 · Writing` 48, `Đề 9 · Listening` 40, `Đề 14 · Reading` 36, `Từ gặp ngoài đời` 22, `Đề 10 · Writing` 28, `Công việc · B1` 24, `Đề 11 · Speaking` 30, `Du lịch Nhật` 0; `Câu hỏi`; `Trắc nghiệm`; `Đúng/sai`; `Gõ từ` (`Theo nghĩa` / `Theo câu` / `Trộn`); `Điền từ vào câu bạn đã lưu`; `Câu AI viết`; `Tối đa 5 câu AI · còn 280 lượt`; `Điền từ vào câu`; `Trắc nghiệm theo câu` (`Chọn nghĩa` / `Chọn từ` / `Trộn`); `Số câu`; `Thứ tự:` (P: `Thứ tự`); `Ưu tiên, đến hạn, rồi từ mới`; `Bắt đầu 10 câu`; `Dùng 1 trong 28 phiên còn lại hôm nay.`; box names `Mọi ngăn`, `Ngăn Mới`, `Ngăn 1 ngày`, `Ngăn 3 ngày`, `Ngăn 7 ngày`, `Ngăn 14 ngày`, `Ngăn 30 ngày` (counts 6/12/10/8/7/5); states: `Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết.`; `Không đủ lượt câu AI`; `Phiên này cần 5 lượt câu AI, bạn còn 3. Lượt câu AI mới vào 01/12.`; `Bỏ kiểu câu có AI`; `Chọn ít nhất một kiểu câu.`; `Mở lại lúc 00:00`; `Trong đó 3 câu AI, rải đều.`; `Tối đa 3 câu AI, vì bạn còn 3 lượt`; `Hết lượt câu AI tháng này.`; `Xem gói Pro`; `Xếp câu AI` (`Rải đều` / `Ngẫu nhiên`); `tối đa 4`; `Chọn ít nhất một kiểu câu AI.`; `Chọn ít nhất một kiểu câu không cần AI cho 7 câu còn lại.`

Session: `Luyện tập · từ cần ôn hôm nay`; `câu 7 / 20`; `xong 20 / 20`; `điền từ vào câu`; `trắc nghiệm theo câu`; `câu AI`; `Báo lỗi`; `gõ từ còn thiếu, đúng dạng trong câu`; `chọn từ điền vào chỗ trống`; `Air quality tends to deteriorate in the dry season.`; `AI dịch: Chất lượng không khí thường xấu đi vào mùa khô.`; `Đúng rồi`; `deteriorate · xấu đi`; `Ngăn 1 ngày` → `Ngăn 3 ngày`; D: `Nhấn Enter là Đã biết: deteriorate lên một ngăn.` / P: `Bấm Đã biết thì deteriorate lên một ngăn.`; `Cần ôn lại`; `Đã biết`; `Chưa đúng`; `Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án.`; `Làm lại mà đúng vẫn tính là đúng. Xem đáp án thì tính là sai.`; `lần 2`; `Xem đáp án`; `Gợi ý`; `Làm lại`; `to become worse in quality`; D: `Nhấn Enter để đưa deteriorate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.` / P: `Cần ôn lại: deteriorate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.`; `Câu tiếp`; `Đáp án đúng`; `Bạn chọn`; options `deteriorate`, `accumulate`, `dominate`, `evaporate`; D legend: `Đã biết`, `Cần ôn lại`, `Làm lại`, `Gợi ý`, `Dừng phiên` (with keys Enter, 1, H, Esc).
Summary: `16/20`; `câu đúng`; `Xong 20 câu.`; `Từ cần ôn hôm nay, trộn 3 kiểu câu. Hôm nay còn 27/30 phiên luyện.`; `Cần ôn lại · 4 từ`; `deteriorate xấu đi`, `allocate phân bổ`, `viable khả thi`, `scrutiny sự xem xét kỹ`; `Đã đưa vào ưu tiên`; `Luyện thêm một phiên`; `Đưa 3 từ còn lại vào ưu tiên`; `Về Luyện tập`.
Weak words: `Luyện tập` (back); `Từ hay sai`; `Sai 2 lần trong 5 câu gần nhất, ở mọi kiểu câu.`; `12`; `tất cả nhóm ▾`; `Luyện từ hay sai`; `Ngăn thấp trước, trộn ba kiểu câu. Đúng 4 lần liền là từ rời danh sách.`; `Tùy chỉnh`; `Luyện 12 từ`; D column headers `từ`, `nghĩa`, `5 câu gần nhất`, `ngăn`, `sai gần nhất`; `21:42 hôm nay`, `21:41 hôm nay`, `21:39 hôm nay`, `07/11`, `06/11`; `đang có 5 / 12 từ`; `Xem thêm 7 từ`; rule paragraph (section 4).

Not drawn overall: typing input (empty), MCQ before answer, true/false question, hint content, report-error dialog (`Báo lỗi` opens something undrawn), AI-pending/fallback/loading, error and empty states, history page (replaced by the calendar modal; not in scope of these frames), phone "Phím trong phiên" card.
