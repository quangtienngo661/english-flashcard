# Figma facts for M8 part A (Trang chủ, cảnh chuyển động), 11/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "Trang công khai" (`0:1`): Trang chủ desktop `5:13` (1440 x 4932) and phone `9:108` (390 x 6028); page
"Motion" (`2:3`): six scenes `10:349`, `13:200`, `13:612` (hidden), `13:834`, `24:427`, `48:423`; page "Ghi chú" (`2:4`) text `20:428`, `29:366`, `38:306`,
`20:430`, `20:432`, `20:434`. Read-only: `get_metadata`, `get_design_context` (all with `excludeScreenshot`), `get_variable_defs` on `5:13`, `get_motion_context`
(recursive) on `5:13` and on every scene, and seven `get_screenshot`s viewed inline (desktop page, phone hero, strip, groups, section 3, pricing, scene 6). Nothing was
written to Figma or to the repo except this file. Current code was read with `git show origin/refactor/giao-dien-moi:<path>` (branch head `df32b3b8`, 11/11/2026).

Notes on the method:
- `skill://figma/figma-design-to-code/SKILL.md` **was readable** through `get_figma_skill` (the `4f192509…` server); it was read before the first
  `get_design_context`. Its output was used as reference data only.
- `get_metadata` on the Motion page lists **no children** for scenes 1, 2, 4, 5, 6 (only hidden scene 3 shows children), yet `get_design_context` and
  `get_motion_context` on the same nodes return full trees with keyframes. Do not conclude "empty frame" from metadata alone.
- Layer names can differ from text: e.g. `33:364` is named "Giá mua lẻ từng tháng" but its text is "237.000 ₫". All copy below is from `get_design_context`, not
  from layer names.
- Letter-spacing in named styles is a percent (Display/Hero `-2.5` = -2 px at 80 px; Display/Section `-2` = -1.04 px at 52 px).
- CSS `drop-shadow(...)` in generated code has half the Figma blur and no spread (see m7-b); values given here as Figma values where a named style exists.
- "raw" = value not bound to a variable or named style.
- Named styles seen on the home page: `Display/Hero` (Bricolage Bold 80 / 1.2 / -2.5 %), `Display/Section` (Bold 52 / 1.24 / -2 %), `Display/Section mobile`
  (Bold 30 / 1.28 / -1.5 %), `Display/Card title` (Bold 24 / 1.3 / -1 %), `Display/Lemma` (Bold 36 / 1.3 / -1 %), `Display/Word` (Bold 19 / 1.3 / 0), `Display/Logo`
  (ExtraBold 22 / 1.2 / -1 %), `Body/Lead` (Noto Regular 19 / 1.6), `Body/Base` (16 / 1.6), `Body/Base strong` (SemiBold 16 / 1.6), `Body/Small` (14 / 1.5),
  `Body/Caption` (13 / 1.4), `Body/Label` (SemiBold 13 / 1.4), `Body/Button` (SemiBold 15 / 1.4), `Shadow/Soft` (`0 1 2 0 #1B24440D`, `0 14 34 -14 #1B244438`),
  `Shadow/Lift` (`0 50 110 -40 #1B244461`, `0 12 32 -16 #1B24442E`). `Shadow/Lift` is **not** in design §7.2.
- Variables on `5:13` (`get_variable_defs`): `--ink`, `--muted`, `--surface`, `--bg`, `--line`, `--accent`, `--accent-soft`, `--on-accent`, `--mark`, `--mark-ink`,
  `--pass`, `--pass-soft`, `--fail`, `--fail-soft`; `radius/sm` 6, `md` 10, `lg` 14, `xl` 20, `2xl` 28, `pill` 999, `button` 10. All values equal design §7.2.
  `--ghost` is used by the hidden paragraph only.

---

## 1. Shared components instanced

| Component (system node) | Instances on the home page | Notes |
|---|---|---|
| "Thanh trên/Desktop" (`5:2`) | `5:14` (1440 x 68) | Component note: "nền bg 72% và làm mờ phía sau (kính mờ), dính khi cuộn". Fill `--bg`, backdrop blur 7 (raw), px 140, gap 24. Logo left; links "Nhóm từ", "Cách học", "Giá" (Noto Regular 15 / 1.6, `--muted`, gap 22, right-aligned); one "Nút" Chính **"Dùng thử"** with **no arrow**. **No "Đăng nhập", no theme toggle.** No bottom shadow. |
| "Thanh trên/Mobile" (node in `9:109`, inner button `9:96`) | `9:109` (390 x 60) | px 16, logo + "Dùng thử" only (button padding 16 x 9, so about 39 px tall: under the 44 px touch target of §3.3). No links. |
| "Chân trang/Desktop" (`7:209`) | `7:218` (1440 x 114) | Note: "Chân trang: logo, liên kết pháp lý và ©. Không còn chữ Wordmet cỡ lớn (chủ dự án 08/11/2026)." pt 40, pb 48, px 140; one row space-between: Logo · links "Chính sách bảo mật", "Điều khoản sử dụng", "Nguồn dữ liệu", "Liên hệ" (Body/Small `--muted`, gap 24) · "© 2026 Wordmet". No background fill read (UNVERIFIED: transparent over `--bg`). |
| "Chân trang/Mobile" (`9:100`) | `9:361` (390 x 164) | pt 32, pb 40, px 16, gap 16: Logo, then a wrapping row (gap 8 x 20) of the four links **and** "© 2026 Wordmet". |
| "Logo" (`3:14`) | inside header and footer | "wordmet." Display/Logo `--ink`, the dot raw `#1e3a8a` (description says `color/accent`; not bound). |
| "Nút" (`3:12`; Chính `3:4`, Phụ `3:8`) | `5:34`, `5:41`(Phụ), `33:336`(Phụ), `33:411`, `7:205`, `9:125`, `9:129`(Phụ), `33:446`(Phụ), `33:524`, `9:357` | Chính: `--accent`, radius `radius/button`, padding 20 x 12, gap 8, Body/Button `--on-accent`, arrow "Mũi tên" 16 (SVG), shadow = `--shadow-wm-btn`. Phụ: `--surface`, 1 px `--line`, `Shadow/Soft`, label `--ink`, no arrow in every instance here. |
| "Lựa chọn" (`3:51`; Đúng `3:35`) | hero `5:106`…`5:127`, section 3 `7:123`…`7:140`, phone `9:180`…`9:196`, `9:311`, `9:319` | Note: "Đúng/Sai luôn kèm icon và chữ". Radius `md`, border 1.5, key chip "Phím" 22 (`--accent-soft`, `radius/sm`, SemiBold 12 `--accent`). Đúng: `--pass-soft`/`--pass` + check 14 + "Đúng"; Sai: `--fail-soft`/`--fail` + x 14 + "Sai". |
| "Thẻ từ" (`3:28`; Thường `3:19`, "Sáng viền") | groups `6:128`…`6:163`, phone `9:248`…`9:286` | Note: "Thẻ một từ trong bộ thẻ của một đề. 'Sáng viền' là trạng thái cuối khi thẻ vừa bay vào." 210 x 74 (phone 175 x 64), radius `lg`, 1 px `--line`, `Shadow/Soft`, word Display/Word `--ink`, meaning Body/Caption `--muted`. `6:160` fluctuate drawn with 1.5 px `--accent` border and `--shadow-wm-btn`. |
| Background | none | The home page has **no** "Nền lưới chấm" instance (the dot grid of the app); ground is `--bg` (top bar and fades use it) plus blurred ellipse "Quầng sáng" vectors per section. Frame fill not read: UNVERIFIED. |

Images: there are **no rasters**. Every illustration is a live mock-up built from frames and text (app card, word chips, bins), plus SVG exports: blurred glow
ellipses, the light-sweep ellipses, "Mũi tên", "Dấu tích" 18, result icons 14, speaker 22, FAQ plus/minus 20, AI icons "Icon bot/pen/search/zap" 16 (Lucide names).

---

## 2. Sections, desktop `5:13`, top to bottom

### 2.1 Hero `5:24` (y 68, h 954)

Layout: flex column, items centred, gap 22, pt 76, pb 72. Glows: "Quầng sáng xanh" `5:25` 768 x 504 at (80, -20), "Quầng sáng vàng" `5:26` 672 x 456 at (700, 220)
(SVG ellipses with blur bleed ~8 %).

| Node | What | Style | Copy |
|---|---|---|---|
| `5:27` "Nhãn chủ đề" | pill: `--surface`, 1 px `--line`, `radius/pill`, `Shadow/Soft`, pl 6 pr 14 py 6, gap 8 | inner `49:311` "Chủ đề (chạy vòng)" 89 x 20, `--accent`, radius 10, overflow clip; list `49:312` of 20 px rows, SemiBold 13 `--on-accent` | rows: **IELTS**, **Công việc**, **Du lịch**, **Công nghệ**, **Đời sống**; then Body/Small `--muted`: **Học từ vựng theo chủ đề bạn cần** |
| `5:31` title | width 820, centred | Display/Hero (Bricolage **Bold 700**, 80/1.2, -2 px), `--ink`; "trong câu" raw `#1e3a8a` | **Ôn từ đúng lúc, luyện từ trong câu.** |
| `5:32` lead | width 600, centred | Body/Lead 19/1.6 `--muted` | **Wordmet tra sẵn nghĩa, câu mẫu và phiên âm, rồi xếp lịch ôn cho từng từ. Thời gian học dành cho việc luyện từ trong câu.** |
| `5:33` buttons | row, gap 12 | Nút Chính + arrow; Nút Phụ, no arrow | **Bắt đầu miễn phí** · **Xem cách học** |
| `5:42` "Sân khấu" | pt 40; contains `5:43` and two floating cards | | |
| `5:43` "Ảnh màn học" (app mock-up) | 1000 wide, row, gap 18, p 20, `--surface`, 1 px `--line`, `radius/xl` 20; shadow raw `0 40 100 -50 rgba(30,58,138,.3), 0 50 110 -40 rgba(27,36,68,.38)` | | |
| `5:44` "Thẻ từ" | 430 wide, `--bg`, `radius/lg`, p 18, gap 12 | label SemiBold 13 `--muted`; lemma Display/Lemma 36; IPA Body/Base `--muted` + "Sóng âm" 5 bars 3 px `--accent` (h 6/14/18/10/7, radius 2); definition Noto 17 `--ink`; meaning 15 `--muted`; example box `--surface` `radius/md` p 12, 16 px, target in `--mark` chip radius 3 px 3 | **Thẻ từ · ngăn 3 ngày** · **mitigate** · **verb · /ˈmɪt.ɪ.ɡeɪt/** · **to make something bad less serious** · **giảm nhẹ** · **Planting trees can help mitigate the effects of urban heat.** |
| `5:71` "Điền từ vào câu" | flex 1, `--bg`, `radius/lg`, p 18, gap 12 | header Caption `--muted`; progress "Tiến độ" **16** bars 5 px, gap 3, radius 3: 3 `--accent`, 1 `--ink` (current), 12 `--line`; sentence Noto 19 with `--mark` target; 2 x 2 "Lựa chọn" grid gap 8; footer Caption `--muted` | **Điền từ vào câu** · **Câu 4/20** · **Cities need clear plans to mitigate the risk of flooding.** · 1 **mitigate** ✓ **Đúng**, 2 **fluctuate**, 3 **deteriorate**, 4 **advocate** · **Enter: câu tiếp** · **H: gợi ý** |
| `5:135` floating card "vừa thêm" | 230 wide, rotate -5°, at (-110, -40) of the stage; `--surface`, 1 px `--line`, `radius/lg`, px 16 py 14, gap 8, backdrop blur 7, same shadow as `5:43` | header SemiBold 13 `--muted`; chips `--accent-soft` radius 6 (raw) px 8 py 2, Noto 13 `--accent`; last chip `--bg`/`--muted` | **Đề 12 · Writing** · **vừa thêm** · **mitigate**, **allocate**, **viable**, **scrutiny**, **+14 từ** |
| `5:150` floating card "lên ngăn" | 250 wide, rotate +4°, at (793, 288) | 5 bins 8 px radius 4: 3 `--accent` with glow `0 0 12 0 rgba(30,58,138,.34)`, 2 `--line`; value Bricolage Bold 20 | **deteriorate** · **lên ngăn** · **7 ngày** |

### 2.2 Dải từ IELTS `6:40` (y 1022, h 124)

Two rows of word chips, no title. Row 1 `6:41` "Hàng 1 — chạy sang trái" (x -60, y 6), row 2 `6:78` "Hàng 2 — chạy sang phải" (x -220, y 66); gap 10 between chips.
Edge fades `6:115`, `6:116`: 200 x 124 gradients from raw `#f6f7fa` to transparent (light only; Dark needs `--bg`).

Chip: `--surface`, 1 px `--line`, `radius/lg`, px 16 py 10, gap 8, `Shadow/Soft`; word Bricolage Bold **18** (no named style; Display/Word is 19) `--ink`; part of speech
Body/Caption `--muted`. Highlighted chip: `--accent-soft`, 1 px `--accent`, `--shadow-wm-btn`, word `--accent`.

Row 1 (left): mitigate verb · **allocate verb** (hl) · substantial adj · deteriorate verb · inevitable adj · **viable adj** (hl) · prevalent adj · reluctant adj ·
advocate verb · **mitigate verb** (hl) · allocate verb · substantial adj (the last three repeat the start, for a seamless loop).
Row 2 (right): scrutiny noun · fluctuate verb · coherent adj · detrimental adj · alleviate verb · incentive noun · undermine verb · feasible adj · consensus noun ·
scrutiny noun · fluctuate verb · coherent adj. Screenshot shows "alleviate" and "feasible" highlighted (not read node by node: UNVERIFIED which row-2 nodes).
**No keyframes anywhere for this strip** (§5).

### 2.3 Đoạn văn đổi màu `6:117` (hidden; owner 08/11/2026 "tạm ẩn")

pt 120, pb 70; text `6:118` width 820, Bricolage **SemiBold** 44 / 1.42, -1 %, base `--ghost`; read part raw `#1b2444`, accent parts raw `#1e3a8a`:
**Mỗi đề IELTS để lại vài chục từ lạ. Bạn tra Cambridge, chép định nghĩa, collocation và câu mẫu, mỗi từ 3–5 phút. Ôn mãi thì thuộc mặt chữ, nhưng khi viết vẫn
không dùng được. Wordmet làm phần chép, để bạn dành giờ học cho phần dùng.** (accent: "3–5 phút.", "không dùng được."; last sentence still `--ghost` = not yet scrolled).
Ghi chú `20:432`: 44 px is a deliberate exception to the taste-skill 36 px cap. Not in M8 unless the owner un-hides it.

### 2.4 Nhóm từ của mỗi đề `6:120` (y 1146, h 586)

flex column centred, gap 44, pt 64, pb 48. Glows `6:121` 816 x 528 at (200, 180), `6:122` 672 x 456 at (760, 300).

| Node | Style | Copy |
|---|---|---|
| `6:124` title | Display/Section 52/1.24 `--ink`, centred, nowrap | **Từ của mỗi đề thành một nhóm.** |
| `6:125` subtitle | Noto 17/1.6 `--muted` (raw size) | **Mỗi nhóm có lịch ôn riêng.** |
| `6:126` grid | 3 rows x 4 "Thẻ từ" 210 x 74, gap 14 (882 wide) | mitigate **verb · giảm nhẹ** · allocate **verb · phân bổ** · substantial **adj · đáng kể** · deteriorate **verb · xấu đi** · inevitable **adj · không tránh được** · viable **adj · khả thi** · prevalent **adj · phổ biến** · reluctant **adj · miễn cưỡng** · advocate **verb · ủng hộ** · scrutiny **noun · sự xem xét kỹ** · fluctuate **verb · dao động** (accent border) · coherent **adj · mạch lạc** |
| `6:166` caption pill | `--surface`, `radius/pill`, px 14 py 7, `Shadow/Soft`, Body/Small `--muted` | **IELTS Writing · Đề 12 · 12 từ · ôn lần đầu ngày mai** |

### 2.5 Từ lúc gặp tới lúc dùng được `7:61` (y 1732, h 1046)

flex column centred, gap 40, pt 64, pb 16. Title block `7:62`: Display/Section **Từ lúc gặp tới lúc dùng được** + Noto 17 `--muted` **Ghi, nghe, luyện và ôn ở cùng một chỗ.**
Grid `7:65` 1160 wide, gap 16: top row `7:66` (left card 768 + right column flex 1 = 376), bottom card full width.

All cards: `--surface`, 1 px `--line`, `radius/xl` 20, `Shadow/Soft`, p 24, gap 14; eyebrow Body/Label `--accent`; title Display/Card title; body Body/Base `--muted`; demo box
`--bg`, `radius/lg`, p 16.

| Card | Copy and demo |
|---|---|
| `7:67` "Ô Luyện trong câu" (768 x 563; has a 90 px spacer `8:93` so it matches the right column height) | **Trong buổi học** · **Luyện trong câu** · **Điền và gõ từ vào câu, không chỉ chọn nghĩa. Sai thì thấy ngay đáp án trong câu.** Demo: **Điền từ vào câu** · **Câu 7/20** · progress **20** bars (6 `--accent`, 1 `--ink`, 13 `--line`) · score pills (`--surface`, 1 px `--line`, `radius/pill`, px 12 py 4, SemiBold 13 number + Regular 13 `--muted`): **5 đúng**, **1 sai**, **13 câu còn lại**, **2 từ lên ngăn 7 ngày** · sentence Noto **22**: **Air quality tends to deteriorate in the dry season.** (target in `--mark`) · choices 2 x 2: 1 **deteriorate** ✓ **Đúng**, 2 **allocate**, 3 **advocate**, 4 **mitigate** ✗ **Sai** |
| `7:150` "Ô Ghi từ" (376 x 326) | **Sau khi làm đề** · **Ghi từ** · **Gõ cả dạng đã chia, Wordmet đưa về từ gốc.** Demo: input 46 high (`--surface`, 1.5 px `--line`, `radius/md`, Noto 17) **deteriorated** + caret 2 x 19 `--accent`; result row (`--surface`, `radius/md`, `Shadow/Soft`) **deteriorate** (Bricolage Bold 18) · **verb · xấu đi** |
| `7:161` "Ô Nghe phiên âm" (376 x 221) **desktop only** | **Mỗi thẻ** · **Nghe và đọc phiên âm** (no body line). Demo: button 52 circle `--accent`, ring raw `0 0 0 10px rgba(30,58,138,.25)`, speaker icon 22; **viable** Bricolage Bold 28; **/ˈvaɪ.ə.bəl/** + 4 wave bars |
| `7:180` "Ô Ôn đúng lúc" (1160 x 246) | **Những ngày sau** · **Ôn đúng lúc** · **Mỗi ngày chỉ ôn những từ đến hạn. Nhớ thì lịch giãn ra, quên thì ôn lại sớm.** Bins row gap 8, each flex 1, `--bg`, `radius/md`, p 14, gap 4; value Bricolage Bold 22, label Caption `--muted`: **1 ngày** ôn lần đầu · **3 ngày** nhớ lần hai · **7 ngày** quen mặt (active: `--accent` fill, `--on-accent`, label opacity .8, `--shadow-wm-btn`) · **14 ngày** dùng được · **30 ngày** nhớ lâu |

### 2.6 Giá `33:306` (y 2778, h 1031) — see §3 for prices

flex column centred, gap 44, pt 72, pb 48. Glows behind Pro `33:311` 620 x 520 at (860, -40), `33:312` 460 x 380 at (1080, 260).
Title `33:308` Display/Section **Hai gói, không tự gia hạn.**; subtitle Noto 17 `--muted`, width 640: **Trả một lần cho mỗi kỳ. Hết kỳ, từ và lịch ôn của bạn vẫn còn.**
Cards row `33:310`: gap 24, `items-start`, Free 360 (self-stretch, so equal height) + Pro 620 = 1004.

Free card `33:313`: `--surface`, 1 px `--line`, `radius/2xl` **28**, `Shadow/Soft`, p 32, gap 18. **Miễn phí** (Display/Card title) · **0 ₫** (Bricolage Bold 48, -1 %) +
**không cần thẻ thanh toán** (Body/Small `--muted`, baseline) · check rows (icon "Dấu tích" 18, gap 10, Body/Base `--ink`): **Ghi từ, tra nghĩa và nghe phiên âm** ·
**Lịch ôn tự động** · **3 phiên luyện mỗi ngày** · **Dùng thử câu luyện và tra từ bằng AI** · **Có thể có quảng cáo.** (Body/Small `--muted`) · spacer `33:335` · Nút Phụ full
width **Tạo tài khoản miễn phí**.

Pro card `33:340`: `--surface`, **2 px raw `#1e3a8a`** border, `radius/2xl` 28, p 32, gap 20; shadow raw `0 0 48 2 rgba(30,58,138,.3), 0 40 100 -50 rgba(30,58,138,.3),
0 50 110 -40 rgba(27,36,68,.38)` (a glow ring, unlike the app Gói học Pro card which lost its glow in round 15); inner light `33:341` ellipse 560 x 260 at (118, -122).
- Head: **Pro** (Display/Card title, `--accent`) + chip "Chip AI" `33:344`: gradient raw `#1e3a8a` → raw **`#3d78ff`** (not a token), `radius/pill`, pl 8 pr 10 py 3,
  `--shadow-wm-btn`, "Icon bot" 14 + **Có AI** (SemiBold 13 `--on-accent`).
- **Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn.** (Body/Base `--muted`)
- "Chọn kỳ" `33:350` (§3).
- "Khối AI" `33:378`: 1 px `--accent`, `radius/lg`, px 18 py 16, gap 12, gradient raw `rgba(30,58,138,.09)` → **`rgba(255,216,74,.2)`** (yellow). Badges 28 circle
  `--surface` shadow raw `0 4 10 -2 rgba(30,58,138,.18)` with 16 px icons. Rows: **AI đi cùng bạn** (Body/Base strong `--accent`, icon bot) · **AI viết câu luyện cho từng
  từ bạn học** (pen) · **Tra từ bằng AI khi từ điển chưa có** (search) · **Nhiều lượt AI hơn gói Miễn phí** (zap).
- Check rows: **30 phiên luyện mỗi ngày** · **Không quảng cáo** · **Mọi thứ của gói Miễn phí**.
- Nút Chính full width + arrow: **Mua gói Pro 12 tháng**; under it Body/Small `--muted` centred: **Không hoàn tiền sau khi đã thanh toán.**

### 2.7 Câu hỏi thường gặp `28:359` (y 3809, h 560)

Row centred, gap 48, pt 56, pb 40. Left `28:360` 420 wide: title Bricolage Bold **40** / 1.24, -2 % (raw size, no style) **Câu hỏi thường gặp**; Body/Base `--muted`:
**Không thấy câu bạn cần? Gửi tới support@wordmet.com.** (address SemiBold raw `#1e3a8a`; not drawn as a link). Right `28:363` 660 wide, gap 10.

Item: `--surface`, `radius/lg`, px 22 py 18; question Noto SemiBold 17 / 1.6 `--ink`; icon 20 ("Thu gọn" minus when open, "Mở" plus when closed). Open item `28:364`
has `Shadow/Soft` and gap 10 to the answer (Body/Base `--muted`); closed items have **no shadow** in the generated code (screenshot ambiguous).

| # | Question | Answer in Figma |
|---|---|---|
| 1 (open) | **Gói Pro có tự gia hạn không?** | **Không. Bạn trả một lần cho mỗi kỳ, Wordmet không tự trừ tiền.** |
| 2 | **Hết Pro thì từ và lịch ôn có mất không?** | none |
| 3 | **Dùng trên điện thoại được không?** | none |
| 4 | **Mua thêm khi Pro còn hạn thì sao?** | none |
| 5 | **Có được hoàn tiền không?** | none |
| 6 | **AI có chấm bài của tôi không?** | none |

### 2.8 Phần cuối `7:200` (y 4369, h 449)

pt 48, pb 72; glow `7:201` 760 x 300 at (340, 200). Card `7:202` 920 wide: `--surface`, **1.5 px border `rgba(30,58,138,0)`** (transparent: the track for the scene 4
sweep), `radius/2xl` 28, `Shadow/Lift`, p 72, gap 20, centred. Title Bricolage Bold **60** / 1.24, -2 % (raw), width 760: **Bắt đầu với đề bạn vừa làm.** · Body/Base `--muted`:
**Miễn phí để bắt đầu. Không cần thẻ thanh toán.** · Nút Chính + arrow **Tạo tài khoản miễn phí**.

### 2.9 Chân trang `7:218` — §1.

---

## 3. Pricing block

| | Free | Pro 1 tháng `33:351` | Pro 3 tháng `33:358` | Pro 12 tháng `33:367` (selected) |
|---|---|---|---|---|
| Label | Miễn phí | **1 tháng** | **3 tháng** + pill **−16%** (`--accent-soft`/`--accent`) | **12 tháng** + pill **−37%** (`--accent`/`--on-accent`); floating pill **Tiết kiệm nhất** (`--accent`, `--shadow-wm-btn`, at left 14, top -14) |
| Struck price (Body/Small `--muted`, line-through) | — | empty line `33:355` " " kept for alignment | **237.000 ₫** | **948.000 ₫** |
| Price (Bricolage Bold 26) | **0 ₫** (48) | **79.000 ₫** | **199.000 ₫** | **599.000 ₫** (`--accent`) |
| Per month (Caption) | — | **mỗi tháng** | **≈ 66.300 ₫ mỗi tháng** | **≈ 49.900 ₫ mỗi tháng** (`--accent`) |
| Cell style | — | `--bg`, 1 px `--line`, `radius/lg`, p 16, gap 6 | same | `--accent-soft`, **2 px `--accent`**, shadow `0 12 28(?) rgba(30,58,138,.28)` (code shows drop-shadow blur 14) |
| CTA | Phụ **Tạo tài khoản miễn phí** | one Pro CTA under the cells: Chính **Mua gói Pro 12 tháng** (label follows the selected period, by analogy with m7 `App.plans.buy`) | | |
| Footnote | **Có thể có quảng cáo.** | **Không hoàn tiền sau khi đã thanh toán.** | | |

Check against design §10.6 (API defaults 79.000 / 199.000 / 599.000 ₫): **the three prices match.** Derived figures, recomputed:
- Struck = n x 1-month price: 3 x 79.000 = 237.000; 12 x 79.000 = 948.000. Ghi chú `38:306`: "Giá gạch là giá mua lẻ từng tháng … nên mức giảm −16% và −37% là thật".
- Saving: 1 - 199.000/237.000 = 16,03 % → "−16%"; 1 - 599.000/948.000 = 36,81 % → "−37%". So the percent is **rounded to nearest** (floor would give 36).
- Per month: 199.000/3 = 66.333 → 66.300; 599.000/12 = 49.917 → 49.900. Ghi chú `38:306`: "làm tròn tới 100 ₫". Nearest-100 and floor-100 give the same here,
  so the Figma numbers do not decide which one (UNVERIFIED).
- "Tiết kiệm nhất" sits on the longest period, which is also the largest saving; no rule given for other price sets.
- Minus sign is U+2212 "−", per-month uses "≈ ", currency "₫" after a space.
- Compared with the app Gói học (m7-b): same three prices, same "≈ … mỗi tháng" form; the struck price is `--muted` here but `--ghost` in the app; the app joins "−37% ·
  tiết kiệm nhất" in one pill, the public page has a separate "Tiết kiệm nhất" pill; cards radius 28 here vs 18 in the app.

---

## 4. Desktop vs phone (`9:108`)

| Section | Phone differences |
|---|---|
| Top bar `9:109` | 60 high; logo + "Dùng thử" only (no links); button about 39 px tall. |
| Hero `9:115` | pt 44, pb 56, px 16, gap 18. Topic pill text 13 (desktop 14), topic chip 84 wide with 12 px text. Title Bricolage Bold **35** / 1.24, -2 % (raw), forced break: **Ôn từ đúng lúc,** / **luyện từ trong câu.** Lead **17** (desktop 19). Buttons gap 10, same labels. Stage pt 92. Mock-up 358 wide, p 14, gap 12, **stacked** (Thẻ từ above Điền từ); lemma 32; definition and meaning on one line **to make something bad less serious · giảm nhẹ**; sentence 18; choices **one column** (4 rows); **no** key-hint line ("Enter: câu tiếp", "H: gợi ý"). Only the "vừa thêm" card (200 wide, at (-4, -11)), chips **mitigate, allocate, viable, +15 từ** (desktop four words + "+14 từ"; both total 18). **No "lên ngăn" card.** |
| Strip `9:213` | 112 high; chips 41 high (word 16-ish, UNVERIFIED size); only 4 chips per row (no repeat for a loop); **no edge fades**; highlighted: allocate (row 1), fluctuate (row 2). |
| Hidden paragraph `9:240` | hidden as on desktop. |
| Groups `9:242` | Title Display/Section mobile 30 / 1.28, **nowrap, 438 wide inside a 390 frame: clipped on both sides** in the screenshot (Figma bug). 2 columns x 6 rows of 175 x 64 cards, gap 8. Caption drops "IELTS Writing · ": **Đề 12 · 12 từ · ôn lần đầu ngày mai**. scrutiny reads **noun · xem xét kỹ** (desktop "noun · sự xem xét kỹ"). |
| Section 3 `9:291` | Title Display/Section mobile (wraps to 2 lines), subtitle 16. Cards stacked 358 wide, p 21. Practice demo shows only the sentence and **two** choices (1 deteriorate Đúng, 4 mitigate Sai): no header, progress or score pills. **No "Nghe và đọc phiên âm" card.** Bins without sub-labels, wrapped 3 + 2. |
| Pricing `33:416` | Title and subtitle **left-aligned** (desktop centred). Free card full width, no spacer. Pro period cells become **rows** (label + pill left, struck/price/per-month right-aligned); 1-month row has no placeholder line. AI rows wrap to two lines. Screenshot height 1735 vs frame 1639 (glows overflow). |
| FAQ `28:470` | Title 30 / 1.28 left; same 6 questions; long questions wrap to two lines. |
| Final `9:353` | pt 32, pb 48, px 16; card p 36 x 24, gap 16; title Bricolage Bold 32 / 1.28, -1.5 %; **no glow ellipse**. |
| Footer `9:361` | §1. |

Not drawn: tablet (768–1279) and Dark frames (Ghi chú `20:434`: "Khung tablet và khung Dark … Chưa thử motion trên web thật, chưa đo hiệu năng blur và glow.").

---

## 5. Motion

**Correction to the design and the motion doc:** design §8.2 says scenes 3–6 have "Chưa có số", and motion doc §7 says the Motion page frames "chỉ minh họa trạng thái, không
ghi thời lượng". **That is no longer true: every scene now carries keyframes** (`get_motion_context`). The home page frames themselves carry none
(`get_motion_context` on `5:13` → `{"nodes":[]}`). Every timeline is `loopMode: "loop"` (Figma preview), so Figma does **not** encode which parts play once and which loop on
the web. Ghi chú `20:428` (verbatim): "Trên web: "khi cuộn tới" thay cho "khi tải trang"; người bật giảm chuyển động thấy ngay trạng thái cuối."

Shorthand: `E` = `cubic-bezier(0.23, 1, 0.32, 1)` (= `--ease-out-strong`); times are ms from the scene start; "y 18→0" = translateY.

### Scene 1 — Hero mở màn `10:349` (7 000 ms timeline)

| Node | Keyframes |
|---|---|
| Topic pill `49:395` | y 18→0 + blur 8→0 over 0–900, opacity 0→1 over 0–700, `E` |
| Topic list `49:397` (ticker) | translateY 0 → -20 → -40 → -60 → -80 (one 20 px row each); hold IELTS 0–1 400; each move **350 ms** `cubic-bezier(.5,0,.5,1)`, then hold 750 ms (moves at 1 400, 2 500, 3 600, 4 700; so a new topic every **1,1 s**, as Ghi chú says); "Đời sống" holds 5 050–7 000, then the loop **jumps** back to IELTS (no duplicate first row for a seamless wrap) |
| Title words `12:201`…`12:208` (Ôn / từ / đúng / lúc, / luyện / từ / trong / câu.) | each y 24→0 + blur **12**→0 over 800, opacity over 650, `E`; starts 120, 190, 260, 330, 400, 470, 540, 610 (**70 ms** stagger) |
| Lead `10:358` | y 18→0, blur 10→0; start 620; 900 (opacity 700), `E` |
| Buttons `10:359` | y 18→0, blur 8→0; start 760; 900 (opacity 700), `E` |
| Stage `10:362` | scale .985→1, y 18→0, blur **24**→0; start 880; 900 (opacity 700), `E` |
| Blue glow `10:351` / yellow glow `10:352` | scale 1→1.1, translate (0,0)→(60,46) / scale 1→.92, translate →(-50,-34); 0–6 000 ease-in-out, hold to 7 000, then snap back (loop) |
| Wave bars `10:371`…`10:375` | scaleY .3 ↔ 1, 450 ms per half, ease-in-out, phase offsets of 150 ms per bar, 0–5 850 then rest |
| Floating card "vừa thêm" `10:434` | y -5 → 6 → -5, 3 000 + 3 000 ease-in-out, hold 1 000 |
| Floating card "lên ngăn" `10:449` | y 4 → 6 (1 000) → -5 (3 000) → 2 (2 000) ease-in-out, hold 1 000 |

Current code (motion doc §7): `hero-in` 520 ms from 1rem, delays 0/70/140/210 (4 blocks); window `hero-window-in` 640 ms, delay 120, no blur. Figma: per-word, 800 ms,
blur, stage last at 880 ms.

### Scene 2 — Bộ thẻ bay vào (khi cuộn tới) `13:200` (4 000 ms)

| Node | Keyframes |
|---|---|
| Title `13:205` | y 18→0, blur 10→0: 0–900; opacity 0–700; `E` |
| Subtitle `13:206` | y 18→0, blur 8→0: start 300, 900 (opacity 700); `E` |
| 12 cards `13:209`…`13:222` | from a scattered start (translate up to ±460 x / -154…+253 y px, rotate up to ±0.336 rad ≈ 19°, scale .37–.55, opacity 0) to place; transform **1 150 ms**, opacity 517 ms, `E`. Starts in a fixed shuffled order, **55 ms** apart: advocate 500, substantial 555, coherent 610, deteriorate 665, mitigate 720, fluctuate 775, viable 830, scrutiny 885, inevitable 940, allocate 995, reluctant 1 050, prevalent 1 105. On landing each border flashes `#E1E5EE` → **`#2445D6`** in 240 ms (`E`) and back in 860 ms (`E`) |
| Caption pill `13:223` | y 8→0 + opacity, start 2 255, 500 ms, `E` |

Last card lands at 2 255 ms; last border flash ends at about 3 355 ms. Current code: `Reveal` 16 px + fade, 400 ms `--ease-enter`, at 15 % visible.

### Scene 3 — Đoạn văn đổi màu `13:612` (hidden; 5 680 ms)

48 word nodes `13:614`…`13:826`; each colour `#C9CEDC` (`--ghost`) → `#1B2444` (`--ink`), or → **`#2445D6`** for "3–5 phút.", "không dùng được.", "phần dùng."; each change
220 ms ease-out; starts 400 ms then every 85 ms (last "dùng." 4 395–4 615). Ghi chú: on the web it follows the scroll ("theo nhịp cuộn"). The page section is hidden.

### Scene 4 — Phần cuối: vệt sáng chạy quanh viền `13:834` (6 000 ms)

| Node | Keyframes |
|---|---|
| CTA card `13:837` | y 24→0 + blur **16**→0 over 0–900, opacity 0–700, `E` |
| Sweep `13:850` (SVG ellipse 220 x 70, centred on the card's top-left corner) | translate along the card rectangle 920 x 329, clockwise, linear, constant speed ≈ 416 px/s: top edge 0–2 210, right 2 210–3 000, bottom 3 000–5 210, left 5 210–6 000; rotation +90° at each corner in 150 ms ease-in-out; loops |

Scene 4's footer is an older variant (no logo; pt 30, pb 64) and differs from `7:209`.

### Scene 5 — 404: card hiện từ mờ `24:427` (5 000 ms) (for part B; recorded here as asked)

Card `24:431`: scale .96→1, y 28→0 over 0–1 000, opacity 0–700, `E`, **no blur** (title says "hiện từ mờ" but the keyframes fade opacity only). "Mã lỗi" `24:432`: y **-22**→0
(drops from above), start 250, 800 (opacity 600). "Tiêu đề" `24:433`: y 14→0, start 450, 800/600. "Mô tả" `24:434`: start 550. "Nút" `24:436`: start 680. All `E`.
Glows drift (blue +50, +30; yellow -40, -24) 5 000 ms ease-in-out, snap back on loop.

### Scene 6 — Giá: viền Pro sáng chạy, icon AI nhấp nhẹ `48:423` (6 000 ms)

| Node | Keyframes |
|---|---|
| Pro card `48:453` | y 24→0 over 0–900, opacity 0–700, `E`, no blur |
| Sweep `48:541` (SVG ellipse 200 x 64) | around the Pro card 620 x 766, clockwise, linear ≈ 462 px/s: top 0–1 342, right 1 342–3 000, bottom 3 000–4 342, left 4 342–6 000; corner rotation 200 ms ease-in-out; loops |
| AI badges `48:497` bot, `48:507` pen, `48:513` search, `48:519` zap | scale 1 → **1.18** in 250 ms (`E`) → 1 in 350 ms (ease-in-out); starts 900, 1 150, 1 400, 1 650 (250 ms stagger); each pulses again 3 000 ms later (3 900, 4 150, 4 400, 4 650) |

Ghi chú `20:428` also promises "ô 12 tháng sáng nhịp": **no keyframes exist for the 12-month cell.**

### 5.1 What has no numbers (M8 must set them)

- "Dải từ IELTS" marquee (rows named "chạy sang trái/phải"; speed, direction behaviour on hover, pause): no keyframes anywhere.
- The 12-month cell "sáng nhịp" (scene 6 note only).
- Which tracks loop on the web vs play once (ticker, bobbing cards, glow drift, wave bars, both sweeps, badge pulses); the ticker's wrap from "Đời sống" to "IELTS".
- Scroll-linked trigger points (scene 2, 4, 6 "khi cuộn tới"; scene 3 scroll position) and how the timelines map to `Reveal`.
- Phone versions of every scene (no phone scene; design §8.1 caps phone blur at 12 px).
- Caret blink in "Ô gõ", listen-button ring, hover/focus/pressed of chips, period cells and FAQ rows (FAQ open/close stays 280 ms per motion doc §7 unless replaced).
- Reduced motion: only the Ghi chú line above ("thấy ngay trạng thái cuối"); for loops this means static end state.

### 5.2 Figma motion vs the motion rules (for the M8 ruling)

| Rule (source) | Figma |
|---|---|
| Enter 300–340 ms (motion doc §1); summary capped below 500 ms, NN/g (design §8.3) | Entrances 700–1 150 ms |
| Blur tokens 6 / 12 / 18 px; phone max 12 (design §8.1) | 8, 10, 12, 16, 24 px |
| Accent `#1e3a8a` (design §3.1) | Scene 2 border flash and scene 3 accents use old `#2445D6` |
| "Không vòng lặp liên tục ở màn dùng nhiều lần mỗi ngày"; only exception the order dot (motion doc §1, design §8.2) | Seven looping tracks; the landing is not a daily screen, so the rule's scope is arguable |
| Auto-moving content over 5 s needs a way to pause (WCAG 2.2.2, not re-read this session) | Ticker, marquee, sweeps, bobbing loop indefinitely |

---

## 6. Section map (Figma → current code on `refactor/giao-dien-moi`)

| Figma section | Nearest current code | Status |
|---|---|---|
| Thanh trên `5:14` / `9:109` | `components/landing/LandingHeader.tsx` (navy bar, anchors #tinh-nang/#bai-tap/#goi/#hoi-dap, theme toggle, Đăng nhập, Đăng ký) | rewrite: glass bar, 3 links, "Dùng thử" only |
| Hero `5:24` | `Hero.tsx` + `showcase/AppShowcase.tsx` (5 tabbed demos: ReviewCardDemo, GroupsDemo, PracticeDemo, LookupDemo, AddWordDemo) | rewrite; tabbed showcase **dropped**, replaced by a static mock-up + 2 floating cards + topic ticker |
| Dải từ IELTS `6:40` | — | **new** |
| Đoạn văn đổi màu `6:117` (hidden) | — (closest in purpose: `WhyForget.tsx`) | hidden; not built unless un-hidden |
| Nhóm từ của mỗi đề `6:120` | `showcase/GroupsDemo.tsx` (partly) | **new** section |
| Từ lúc gặp tới lúc dùng được `7:61`: Luyện trong câu | `ExercisesSection.tsx` + `exercises/*` (interactive 6-kind gallery) | interactive gallery **dropped**; static demo |
| …: Ghi từ | `MetOutside.tsx`, `showcase/AddWordDemo.tsx` | MetOutside's "saved sentence → cloze" **dropped**; lemma idea kept |
| …: Nghe và đọc phiên âm (desktop only) | `showcase/LookupDemo.tsx` (partly) | new card |
| …: Ôn đúng lúc | `ReviewTiming.tsx` (bins panel, weak words) | rewrite; "Mới" bin and "Từ hay sai" **dropped** |
| — | `WhyForget.tsx` (forgetting curve, `forgetting-curve.ts`) | **dropped** |
| Giá `33:306` | `Plans.tsx` (comparison table, no prices) | rewrite with build-time prices (design §10.6) |
| Câu hỏi thường gặp `28:359` | `Faq.tsx` | rewrite (2 columns, 6 new questions) |
| Phần cuối `7:200` | `FinalCta.tsx` (navy band) | rewrite (white card + sweep) |
| Chân trang `7:218` / `9:361` | `components/layout/SiteFooter.tsx` | rewrite; "Gói học" and "Hỏi đáp" links **dropped** |

Section anchors in code: `#vi-sao`, `#bai-tap`, `#on-lai`, `#gap-tu`, `#goi`, `#hoi-dap`, `#tinh-nang`. Figma has no anchor or prototype-link data read (UNVERIFIED).

---

## 7. Copy table (current key → Figma text; "new" = no key today)

Namespace `Landing` in `apps/web/messages/vi.json` (read via `components/landing/copy.ts`), plus `Footer`, `Metadata`.

| Key | Current vi | Figma vi |
|---|---|---|
| `Landing.nav.features` | Tính năng | **Nhóm từ** |
| `Landing.nav.exercises` | Dạng bài | **Cách học** |
| `Landing.nav.plans` | Gói học | **Giá** |
| `Landing.nav.faq` | Hỏi đáp | dropped |
| `Landing.nav.login` | Đăng nhập | **dropped** (no login link anywhere) |
| `Landing.nav.signup` | Đăng ký | **Dùng thử** |
| `Landing.nav.themeToLight` / `themeToDark` | … | dropped (no toggle drawn) |
| `Landing.hero.line1` + `line2` | Học từ vựng tiếng Anh, / ghi nhớ và vận dụng | **Ôn từ đúng lúc, luyện từ trong câu.** ("trong câu" accent; phone breaks after "lúc,") |
| `Landing.hero.lead` | Ôn thẻ theo lịch, luyện tập cùng AI và lưu từ mới bạn gặp mỗi ngày. | **Wordmet tra sẵn nghĩa, câu mẫu và phiên âm, rồi xếp lịch ôn cho từng từ. Thời gian học dành cho việc luyện từ trong câu.** |
| `Landing.hero.signup` | Đăng ký | **Bắt đầu miễn phí** |
| `Landing.hero.haveAccount`, `.login` | Đã có tài khoản? / Đăng nhập | dropped |
| `Landing.hero.note` | Miễn phí, không cần thẻ thanh toán. | dropped from hero |
| new `Landing.hero.secondary` | — | **Xem cách học** |
| new `Landing.hero.topicLabel`, `.topics[]` | — | **Học từ vựng theo chủ đề bạn cần**; IELTS · Công việc · Du lịch · Công nghệ · Đời sống (Ghi chú `20:430`: list awaits the owner) |
| new hero mock-up strings | — | Thẻ từ · ngăn 3 ngày · mitigate · verb · /ˈmɪt.ɪ.ɡeɪt/ · to make something bad less serious · giảm nhẹ · Planting trees can help mitigate the effects of urban heat. · Điền từ vào câu · Câu 4/20 · Cities need clear plans to mitigate the risk of flooding. · mitigate / fluctuate / deteriorate / advocate · Đúng · Enter: câu tiếp · H: gợi ý · Đề 12 · Writing · vừa thêm · +14 từ (phone +15 từ) · lên ngăn · 7 ngày |
| `Landing.showcase.*` (all) | tabs, demos | dropped |
| new strip words | — | §2.2 lists (English words + "verb"/"adj"/"noun") |
| `Landing.why.*` (all) | Vì sao từ vựng nhanh bị quên … | dropped |
| new groups section | — | **Từ của mỗi đề thành một nhóm.** · **Mỗi nhóm có lịch ôn riêng.** · 12 word + meaning pairs (§2.4) · **IELTS Writing · Đề 12 · 12 từ · ôn lần đầu ngày mai** (phone: **Đề 12 · 12 từ · ôn lần đầu ngày mai**) |
| new section 3 title | — | **Từ lúc gặp tới lúc dùng được** · **Ghi, nghe, luyện và ôn ở cùng một chỗ.** |
| `Landing.exercises.*` | Nhiều dạng bài luyện tập … | dropped; replaced by **Trong buổi học** · **Luyện trong câu** · **Điền và gõ từ vào câu, không chỉ chọn nghĩa. Sai thì thấy ngay đáp án trong câu.** · demo strings (Câu 7/20, 5 đúng, 1 sai, 13 câu còn lại, 2 từ lên ngăn 7 ngày, Air quality tends to deteriorate in the dry season., Đúng, Sai) |
| `Landing.exercises.right` / `.wrong` | Đáp án đúng / Đáp án sai | chips read **Đúng** / **Sai** |
| `Landing.metOutside.*` | Từ gặp hằng ngày thành bài luyện tập … | dropped; replaced by **Sau khi làm đề** · **Ghi từ** · **Gõ cả dạng đã chia, Wordmet đưa về từ gốc.** · deteriorated → deteriorate · verb · xấu đi |
| new listen card | — | **Mỗi thẻ** · **Nghe và đọc phiên âm** · viable · /ˈvaɪ.ə.bəl/ |
| `Landing.review.title` | Ôn tập đúng thời điểm | **Ôn đúng lúc** (eyebrow **Những ngày sau**) |
| `Landing.review.lead` | Từ đã nhớ lên ngăn sau, từ chưa nhớ quay về ngăn đầu. | **Mỗi ngày chỉ ôn những từ đến hạn. Nhớ thì lịch giãn ra, quên thì ôn lại sớm.** |
| `Landing.review.b1`…`b5` | 1 ngày … 30 ngày | same values; new sub-labels **ôn lần đầu**, **nhớ lần hai**, **quen mặt**, **dùng được**, **nhớ lâu** (desktop only) |
| `Landing.review.b0`, `p1`, `p2`, `panelTitle`, `sample`, `weak*`, `w1`, `w2` | Mới, Email nhắc khi đến hạn, … | dropped |
| `Landing.plans.title` | Bắt đầu miễn phí | **Hai gói, không tự gia hạn.** |
| new `Landing.plans.lead` | — | **Trả một lần cho mỗi kỳ. Hết kỳ, từ và lịch ôn của bạn vẫn còn.** |
| `Landing.plans.free` / `.pro` | Miễn phí / Pro | same |
| new `Landing.plans.freePrice`, `freePriceNote` | — | **0 ₫** / **không cần thẻ thanh toán** |
| `Landing.plans.freeP1`…`freeP3`, `freeAiPractice`, `freeAiLookup` | Ôn thẻ, lịch ôn tự động / Tra cứu, thêm từ mới / 3 phiên luyện tập mỗi ngày / 15/tháng / 5/tháng | **Ghi từ, tra nghĩa và nghe phiên âm** · **Lịch ôn tự động** · **3 phiên luyện mỗi ngày** · **Dùng thử câu luyện và tra từ bằng AI** |
| new `Landing.plans.freeAds` | — | **Có thể có quảng cáo.** |
| `Landing.plans.signup` | Đăng ký | **Tạo tài khoản miễn phí** |
| new `Landing.plans.proBadge`, `proLine` | — | **Có AI** · **Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn.** (same text as m7 `App.plans.proLine` in Figma) |
| new period strings | — | **1 tháng / 3 tháng / 12 tháng** · **mỗi tháng** · **≈ {price} mỗi tháng** · **−{percent}%** · **Tiết kiệm nhất** |
| `Landing.plans.proP1`…`proP4` | Thêm phiên luyện tập / Câu luyện tập AI / Tra cứu bằng AI / Không quảng cáo | **AI đi cùng bạn** · **AI viết câu luyện cho từng từ bạn học** · **Tra từ bằng AI khi từ điển chưa có** · **Nhiều lượt AI hơn gói Miễn phí** · **30 phiên luyện mỗi ngày** · **Không quảng cáo** · **Mọi thứ của gói Miễn phí** |
| new `Landing.plans.buy` | — | **Mua gói Pro {period}** (drawn: "Mua gói Pro 12 tháng") |
| new `Landing.plans.noRefund` | — | **Không hoàn tiền sau khi đã thanh toán.** |
| `Landing.plans.yes` / `.no` | Có / Không | dropped |
| `Landing.faq.title` | Câu hỏi thường gặp | same |
| new `Landing.faq.lead` | — | **Không thấy câu bạn cần? Gửi tới support@wordmet.com.** |
| `Landing.faq.q1`…`q4`, `a1`, `a2`, `a4` | Wordmet khác flashcard ở điểm nào? … | replaced by the six questions of §2.7 |
| `Landing.faq.q3` / `a3` | AI có chấm điểm không? / Không. AI chỉ biên soạn câu hỏi; đáp án chấm theo quy tắc. | question becomes **AI có chấm bài của tôi không?**; answer not drawn (current `a3` fits) |
| new `Landing.faq.*` 1 | — | **Gói Pro có tự gia hạn không?** / **Không. Bạn trả một lần cho mỗi kỳ, Wordmet không tự trừ tiền.** |
| new `Landing.faq.*` 2–5 | — | questions only (answers to write) |
| `Landing.final.title` | Bắt đầu học cùng Wordmet | **Bắt đầu với đề bạn vừa làm.** |
| `Landing.final.signup` | Đăng ký | **Tạo tài khoản miễn phí** |
| `Landing.final.note` | Miễn phí, không cần thẻ thanh toán. | **Miễn phí để bắt đầu. Không cần thẻ thanh toán.** |
| `Landing.footer.plans` / `.faq` | Gói học / Hỏi đáp | dropped |
| `Footer.privacy`, `.terms`, `.sources`, `.contact` | Chính sách bảo mật / Điều khoản sử dụng / Nguồn dữ liệu / Liên hệ | same |
| `Footer.copyright` | © {year} Wordmet | same ("© 2026 Wordmet") |
| `Metadata.title`, `.description`, `.ogAlt` | built from the old hero ("Học từ vựng tiếng Anh, ghi nhớ và vận dụng"; old lead) | no Figma frame; will no longer match the page (§8) |
| `Nav.skipToContent` | Chuyển đến nội dung chính | not drawn; keep |
| `App.*` reused by `getAppCopy()` (kinds, review, addWord) | … | no longer needed by the landing once the showcase and gallery go |

---

## 8. Conflicts

**Figma vs current code behaviour (links, CTAs, routes)**
1. **No way to log in from the home page.** Header has only "Dùng thử", the hero lost "Đã có tài khoản? Đăng nhập", the footer has no login link. Code today: header
   "Đăng nhập" (≥ sm) → `/{locale}/app/login`, hero link → same. Needs a ruling (keep a login link in the header, or accept it).
2. **Theme toggle dropped** from the header (code has `ThemeToggleButton`); design M9 keeps Dark mode. Decide where a visitor switches theme, or follow the system only.
3. **"Mua gói Pro 12 tháng" and a selectable period on a logged-out static page.** No route exists for a visitor to buy; options: register then `/app/plans` (with the period),
   or login. Selecting a period needs client JS on a page that is otherwise server-rendered (`Reveal` is the only client part today). Design §10.6 covers prices only.
4. **Targets of "Dùng thử", "Bắt đầu miễn phí", "Tạo tài khoản miễn phí", "Xem cách học" and the three header links are not drawn.** Presumed: register for the first three,
   anchors to section 3 / groups / pricing for the rest (UNVERIFIED). Current anchors `#tinh-nang`, `#bai-tap`, `#goi`, `#hoi-dap` will change; the footer's `#goi`, `#hoi-dap`
   links disappear.
5. **Content scope:** the interactive exercise gallery (`ExercisesSection`, `exercises/*`, tests), the tabbed `AppShowcase`, `WhyForget` (+ `forgetting-curve.ts`) and
   `MetOutside` are gone from Figma. Their tests (`exercise-gallery.test.tsx`, `showcase.test.tsx`, `why-forget.test.tsx`, `sections.test.tsx`, `header-hero.test.tsx`,
   `copy.test.ts`) go or are rewritten.

**Figma vs design text**
6. **Motion numbers exist** (§5) where design §8.2 and motion doc §7 say there are none; and they break the documented rules (§5.2: 700–1 150 ms entrances, blur 16/24 px,
   `#2445D6`, infinite loops). M8 must choose between Figma numbers and the rules, then write the result into the motion doc.
7. **Public copy names system details** design §3.3 and Ghi chú `29:366` exclude ("ngăn ôn"): "Thẻ từ · ngăn 3 ngày", "lên ngăn", "2 từ lên ngăn 7 ngày" in mock-ups.
8. **Refund wording:** "Không hoàn tiền sau khi đã thanh toán." vs app copy (m7-b) "Không hoàn tiền tự động; cần hỗ trợ, liên hệ support@wordmet.com." The FAQ question
   "Có được hoàn tiền không?" has no answer; the published Terms (admin `/legal`) are the source to match (not read here).
9. **Bricolage weight:** every Display style on the home page is **Bold 700** (80, 52, 40, 60, 30 px); design §3.1 rules 800 for page titles and big numbers. Visible at 80 px.
10. **Yellow beyond the target word:** the "Khối AI" gradient ends in `rgba(255,216,74,.2)` and every section has a yellow glow; §3.3 says yellow only marks the target word.
    (Ghi chú `20:432` records the glows as an owner choice of "bản 3".)
11. **Tokens:** raw `#1e3a8a` on the Pro border, logo dot, hero accent words and FAQ email; raw `#3d78ff` in the AI chip; raw `#f6f7fa` edge fades; `Shadow/Lift` and the hero
    shadow are not §7.2 tokens; Pro glow ring `0 0 48 2`. All need tokens for Dark mode.
12. **Background:** §3.3 "Nền: lưới chấm 20 px … trên mọi màn app" is for the app; the public page uses glows without the dot grid (consistent with "app" scope, noted for clarity).
13. **Top bar:** component note "nền bg 72% … kính mờ" and backdrop blur 7 vs motion doc §6 "blur(24px) saturate(1.6) và bóng navy" (design §3.1 already rules no shadow).
14. **Spacing off the 4 px grid:** gaps 22, 18, 14, 10, padding 6/14, 22 x 18 (FAQ items); design §3.1 says round to the nearest step.
15. **SEO (§11):** `Metadata.title`, `.description`, `.ogAlt` and the OG image text repeat the old hero; JSON-LD prices must use the same build-time numbers as the pricing block.

**Figma vs product behaviour (UNVERIFIED claims to check against the API before writing copy)**
16. "Mỗi nhóm có lịch ôn riêng." — the schedule is per word in the API (bins per sense/word); whether a group has its own schedule is not verified.
17. "Hết kỳ, từ và lịch ôn của bạn vẫn còn." — Free caps groups at 100 (m7-b list); a Pro learner with more groups is not covered.
18. "Wordmet tra sẵn nghĩa, câu mẫu và phiên âm" — true for catalog words; private words and AI lookup depend on plan and quota.
19. "Ghi từ, tra nghĩa và nghe phiên âm" for Free — audio needs Google TTS set up before launch (deploy-checklist "Đợt C"); plan gating of audio not checked.
20. FAQ "Mua thêm khi Pro còn hạn thì sao?" — the answer must match the prepaid-period behaviour of the API (the next period starts after the current one, per m7 code facts);
    "Dùng trên điện thoại được không?" — there is no mobile app yet; the answer is the phone browser.

**Figma internal inconsistencies**
21. Hero progress has **16** segments with "Câu 4/20"; section 3 has 20 with "Câu 7/20".
22. Phone groups title is nowrap and wider than the frame (clipped); scrutiny meaning differs (desktop "sự xem xét kỹ", phone "xem xét kỹ"); caption drops "IELTS Writing".
23. Desktop floating card lists 4 words "+14 từ", phone 3 words "+15 từ" (both 18, consistent but different); phone drops the "lên ngăn" card and the listen card.
24. Scene 6 note promises "ô 12 tháng sáng nhịp" with no keyframes; scene 5 is named "hiện từ mờ" but has no blur; scene 4 footer is an older variant.
25. Phone "Dùng thử" is about 39 px tall (< 44 px rule of §3.3).
26. Struck price colour `--muted` here vs `--ghost` in the app Gói học; pricing cards radius 28 here vs 18 in the app.

---

## 9. Unresolved / UNVERIFIED

- Link targets of every CTA and nav item (no prototype data read); whether a login link is wanted.
- Which motion tracks loop on the web; marquee speed; ticker wrap; scroll trigger points; phone motion; a pause control for loops (WCAG 2.2.2).
- Answers to FAQ 2–6; the refund sentence vs the published Terms.
- Rounding rule for "≈ … mỗi tháng" (nearest vs floor to 100 ₫ give the same result for the default prices); behaviour when a price change makes a saving ≤ 0 or changes
  which period is "Tiết kiệm nhất".
- Page frame fill (`--bg` assumed), footer fill, glow colours (SVG assets not opened), exact phone strip text size, which row-2 strip chips are highlighted on desktop.
- Closed FAQ rows: shadow or not (code says none, screenshot unclear).
- Topic list (IELTS, Công việc, Du lịch, Công nghệ, Đời sống): Ghi chú `20:430` says it waits for the owner; the IELTS framing of the whole page (strip title, "Đề 12",
  "Bắt đầu với đề bạn vừa làm.") is copy the owner "sẽ sửa câu chữ sau".
- Product claims 16–20 in §8.
- Tablet (768–1279) and Dark: not drawn; blur/glow performance not measured (Ghi chú `20:434`).
- Scene 5 belongs to the 404 page (part B); numbers recorded here only because the brief named it.
