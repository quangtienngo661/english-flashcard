# M3 (Hôm nay and the group carousel): Figma facts, 2026-11-10

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY` (page "App người học" `55:306`), read this session with `get_metadata`, `get_screenshot`, `get_design_context`, `get_variable_defs` (read only). Frames: Hôm nay `117:4425` (desktop 1440x1244) / `117:4712` (phone 390x2070); Nhóm carousel `82:3213` / `82:3368` (1440x900 / 390x844); Nhóm with picker open `84:3173` / `84:3399`.

Conventions: "raw" = a literal value Figma does not bind to a variable or named style. Most text in these frames is raw font settings (no named text style); only the styles listed under "Tokens" are bound. Numbers are px at the drawn size.

## 0. Findings that change the plan

1. **The floating button on desktop is the calendar button (`Nút lịch nổi`), not a "+".** Desktop has no floating "+" on any of the three frames; "Thêm từ" lives in the top bar (button with key hint `N`). The floating "+" (`Nút + nổi (Thêm từ)` `117:4985`, 56x56) exists **only on phone Hôm nay**. Phone Nhóm (both frames) has only the calendar button.
2. **Group cards are not Figma components.** In every frame they are plain frames named `Thẻ nhóm · <tên>` / `Thẻ giữa · ...` / `Thẻ ±N · ...`, with child frames `Thẻ sau 1/2/3` and `Mặt thẻ` (Hôm nay) or `Thẻ nhóm` (carousel). `search_design_system` returned no library component for "Thẻ nhóm", "Nút chữ", "Nút lịch nổi", "Thẻ chồng" (library search only sees published libraries; the local components are the ones named in section 7).
3. **One card design, scaled.** Face 290x368 (centre carousel card) is the master; every other card is the same design at `s = width / 290`: radius `31.231 * s`, padding `27.885/25.654/22.308 * s`, texts `* s`. Checked: Hôm nay card 176 wide -> `s = 0.607` -> radius 18.954 (matches); carousel +-1 241 wide -> `s = 0.831`; +-2 191 -> `s = 0.659`; phone centre 210 -> 0.724; phone +-1 174 -> 0.6; phone Hôm nay 150 -> 0.517. Cards behind use fixed ratios (below). So build one `GroupCard` with a `scale` prop (or CSS `zoom`/`font-size` in em), not five sizes.
4. **Behind-card count is not documented.** Carousel: Đề 12 (24 chờ) 3 behind, Đề 9 (18) 3, Đề 14 (11) 2 (+2 slot), Đề 11 (xong hôm nay, 0 chờ) 1, Du lịch Nhật (trống) 0. Hôm nay: Đề 9 (18) 2, the other three 1. **ASSUMPTION:** depth grows with pending count; the thresholds are not drawn. Needs an owner decision.
5. **Stage bars ("Từ theo ngăn") in the mock do not follow the numbers.** Track 126 wide; fills 63 / 127 / 150 / 110 / 80 / 37 for `11/19`, `24/38`, `19/45`, `6/33`, `0/24`, `0/11` (two fills exceed the track and are clipped; `0 / 24` still shows 80). Formula not defined by the design.
6. **"nhịp ôn: mới -> 30 ngày" bar** (6 segments 51/76/84/93/68/34 of 420, first two full, third filled 76 of 84, rest empty) has no legend. **ASSUMPTION:** one segment per stage (Mới, 1, 3, 7, 14, 30 ngày) and fill = something per stage. Unconfirmed.
7. Not drawn: disabled Học / Ôn buttons, a zero-due Hôm nay hero, loading and error states, the picker with a search query or no results, the open-state of the select button beyond the flipped chevron.
8. Side column "from 1280": only 1440 and 390 are drawn; the breakpoint where the 340 side column drops under the main column is **not specified** by Figma (phone order is drawn, see 1.2).

## 1. Hôm nay (`117:4425` desktop, `117:4712` phone)

### 1.1 Desktop 1440

- Background: instance `Nền lưới chấm` (`Nền app/Lưới chấm — Desktop` `95:315`): dot grid 20 px fading to edges, navy glow top-left (760x560 at -260,-300), yellow glow bottom-right (620x520). Absolute, bottom layer. Already built per the task (top bar `Thanh trên app/Desktop` `54:502`, 64 high, noted only).
- Content frame `Nội dung` 1160 wide, x=140 (centred), padding top 32, bottom 124, vertical gap 20.
- Order top to bottom:
  1. `Đầu trang` (gap 6): date line + `Hôm nay` title.
  2. `Lưới` (gap 24): **main column** 796 flexible (`flex 1`, min 0), **side column** 340 fixed, at x=820. Both top-aligned.
- Main column (gap 20): `Ôn tiếp (khối chính)` (268 high) -> `Lần luyện gần nhất` (139) -> `Nhóm của bạn` (333) -> `Tạo nhóm nhanh theo chủ đề` (134). Gaps 20 between sections.
- Side column (gap 16): `Thêm từ vừa gặp` (209) -> `Từ lâu chưa ôn` (108) -> `Từ theo ngăn` (237). Ends at y=586, shorter than main (934): space under it is empty.
- Floating: `Nút lịch nổi` (instance of `95:343`, size Lớn 62x66), `right: 32`, `bottom: 32` of the frame (x=1346,y=1146 in a 1440x1244 frame).

### 1.2 Phone 390 (order differs)

`Nội dung`: padding 16 sides, top 20, bottom 140, gap 16; top bar `Thanh trên app/Mobile` 56 high and bottom tab bar `Thanh tab dưới` 72 high (instances, already built). Order:
1. `Đầu trang` (date + title 30px)
2. `Ôn tiếp (khối chính)`: **the "24" block comes first**, then the group block (desktop has the number on the right)
3. `Lần luyện gần nhất`
4. `Nhóm của bạn` header (title + `Xem tất cả →`, no caption)
5. `Thẻ nhóm (cuộn ngang)` horizontal scroll row, height 208, cards 150 wide (face 150x190, stack 211.9 high), gap 14 (x = 0,164,328,492), 4 cards, the 3rd peeks at the right edge
6. note line `Xong hôm nay: ...`
7. `Tạo nhóm nhanh theo chủ đề`: title, then the link **under** the title, then 4 rows in one column
8. `Thêm từ vừa gặp` (moved down from the side column)
9. `Từ lâu chưa ôn`
10. `Từ theo ngăn`
Floating: `Nút lịch nổi` small (54x58) `right:17, bottom:154`; `Nút + nổi (Thêm từ)` 56x56, radius 28, fill `--accent`, shadow `0 10 28 -10 rgba(30,58,138,.34)`, icon plus 24, `right:16, bottom:86` (14 above the tab bar).

### 1.3 Blocks, desktop (phone differences in brackets)

Colour/radius/shadow tokens: `--surface`, `--line`, `--ink`, `--muted`, `--accent`, `--ghost`, `--pass`, `--fail`, `--pass-soft`, `--fail-soft`, `--mark`, `--mark-ink`; shadows `Shadow/Card` (= `0 10 28 -14 rgba(27,36,68,.2)` + `0 1 2 rgba(27,36,68,.06)`), `Shadow/Row` (= `0 4 12 -8 .16` + `0 1 2 .06`), `Shadow/Pop` (FAB).

**Đầu trang.** `chủ nhật, 08/11` JetBrains Mono Medium 12, `--muted` (raw style). `Hôm nay` Bricolage Grotesque ExtraBold 44, lh 1.1, tracking -1.122, `--ink` [phone 30px].

**Ôn tiếp (khối chính)** (this is the primary block): fill `--surface`, border 2 `#e5603f` (raw, the coral group colour), radius 28 (raw), padding 28 [phone 20, gap 16], shadow raw `0 40 100 -50 rgba(27,36,68,.21)` + `0 50 110 -40 rgba(27,36,68,.38)`. Row, gap 24, centred: left group block (gap 12), right `Số thẻ chờ`.
- `ôn tiếp · có thẻ ưu tiên` Mono 12 `--muted`
- `Đề 12 · Writing` Bricolage ExtraBold 36, lh 1.1, tracking -0.698, `--ink` [phone 28]
- `nhóm có 48 từ · 12 đã thuộc` Noto Sans Regular 14 `--muted` (style `Body/Small`)
- stage bar `Ưu tiên · đến hạn · mới`: three segments height 10, radius 3, gap 3, widths 72 / 253 / 109 (total 440; proportional to 4 : 14 : 6 of the 24), fills `--accent`, `--ink`, `--ghost`
- legend `Chú thích` (wrap, gap 6 16): 9x9 squares radius 3 in the same three colours + `4 ưu tiên`, `14 đến hạn`, `6 mới` Noto Regular 13.5 `--muted`
- `Hai việc` (gap 12): `Học` = instance `Nút` (`3:12`) kiểu **Phụ**, no arrow, 148x45; `Ôn` = **Chính** (primary, `--accent` fill, `--on-accent` text), 148x45 [phone 151 each]. Button: radius `radius/button` 10, padding 12/20, label Noto SemiBold 15 (`Body/Button`); Phụ shadow `0 14 17 rgba(27,36,68,.22)`+`0 1 1 .05`; Chính glow `0 10 14 rgba(30,58,138,.34)`.
- `Số thẻ chờ` (right-aligned, gap 2): `24` Bricolage ExtraBold 96, lh .88, tracking -2.8, colour `#b25140` (raw, darker coral ink of `#e5603f`) [phone 60]; `thẻ chờ hôm nay` Mono 12 `--muted`.
- Sums check: 4 + 14 + 6 = 24.

**Lần luyện gần nhất:** fill `--surface`, border 1 `--line`, radius 18, padding 20/24 [phone 16], shadow `Shadow/Card`. Row gap 24, centred:
- left: `14/20` Bricolage ExtraBold 34 [28], tracking -0.7, `--ink`; `đúng` Mono 12 `--muted`
- middle (gap 6): `Lần luyện gần nhất` Noto SemiBold 15 `--ink`; `thứ bảy, 07/11 · 20 câu · Đề 12 · Writing` Mono 12 `--muted` (wraps on phone); bar `Đúng và sai`: track 392x6 `--line` radius 3, correct fill `--pass` (width 274.16 = 14/20 of 392 = 69.94%), wrong fill `--fail` (the rest), then two pills: correct = `--pass-soft` fill, check icon 12 + `14` Noto Bold 13 `--pass`, radius 6, padding 3/8; wrong = `--fail-soft` fill, x icon 12 + `6` Noto Bold 13 `--fail`; line `Sai: deteriorate, allocate, viable, scrutiny` Noto 14 `--muted`, the four words Noto SemiBold `--ink` (raw `#1b2444`), separated by `, `
- right `Liên kết` (column, gap 8, right-aligned): `Luyện lại từ sai →` and `Mở lịch học`, both instances of `Nút chữ` (`166:320`, kiểu Thường, label prop): Noto SemiBold 14, colour `--accent` [phone: row, gap 20, under the block, left-aligned].
- No streak in this block. Streak appears only inside `Nút lịch nổi` (below).

**Nhóm của bạn.** Header row (baseline, gap 12): `Nhóm của bạn` Bricolage Bold 24 `--ink` [phone 22]; `4 nhóm khác còn thẻ chờ · bấm thẻ để mở nhóm` Mono 12 `--muted` (not on phone); `Xem tất cả 8 nhóm →` Noto SemiBold 14 `--accent` [phone `Xem tất cả →`]. Then 16, then card row (gap 20) of 4 stacks of 176x248.7: **`Đề 9 · Listening`, `Đề 14 · Reading`, `Từ gặp ngoài đời`, `Đề 10 · Writing`** (the hero group Đề 12 is not repeated: "4 nhóm khác"). Then 16, then note `Xong hôm nay: Công việc · B1, Đề 11 · Speaking  ·  Chưa có từ: Du lịch Nhật` (Noto 14 `--muted`, two spaces around `·`, 768 wide, wraps on phone).

Card (Hôm nay size, face 176x223, border 2 group colour, radius 18.954, shadow raw `0 18.95 37.9 -24.4 rgba(27,36,68,.4)`, fill `--surface`), text:
- `40 từ · 8 đã thuộc` Mono 10.56 `--muted` [phone 9]
- name Bricolage ExtraBold 27.754 lh 1.08 tracking -0.583, `--ink`, width 144.86, wraps up to 3 lines (`Đề 9 · Listening` -> 2 lines) [phone 23.654]
- spacer, then `18` Bricolage ExtraBold 33.846 in the group's ink colour + `thẻ chờ` Noto SemiBold 12.185 `--muted` (baseline, gap 4) [phone 28.846 / 10.385]
- footer: top border 1 `--line`, `tiếp theo` Noto Regular 11.1 `--muted` + word (`commute`) Bricolage Bold 12.185 `--ink` [phone 9.462 / 10.385]
- behind cards: `Thẻ sau 1` 165.44x209.62 at (5.28, 19.15), opacity .85, radius 17.817, border 1.5 lighter tint of the group colour, shadow `Shadow/Row`-like; `Thẻ sau 2` 154.88x196.24 at (10.56, 38.29), opacity .55, radius 16.679 (only on Đề 9). **No blur** on Hôm nay cards (blur exists only in the carousel).
Data per card: Đề 9: 40 từ, 8 đã thuộc, 18, commute. Đề 14: 36, 8, 11, prevalent. Từ gặp ngoài đời: 22, 4, 6, overwhelmed. Đề 10: 28, 9, 3, allocate. Colours in section 5. "bấm thẻ để mở nhóm": whole card is the click target (no button drawn).

**Tạo nhóm nhanh theo chủ đề:** header (baseline, gap 12) `Tạo nhóm nhanh theo chủ đề` Bricolage Bold 22 `--ink`, a flexible 1px spacer, `Xem mọi chủ đề trong Tra từ →` (`Nút chữ`, `--accent` 14) [phone: link on its own line under the title]. Gap 12. Topic list: 2 columns, 384 wide each, column gap 28, row gap 6 [phone: 1 column 358]. Row: top border 1 `--line`, padding 12/2, gap 12: name Noto SemiBold 15 `--ink`, flexible spacer, count `24 từ` Mono 12 `--muted`, arrow icon 16 (`icon/arr`). Rows: `Công việc · B1` 24 từ, `Du lịch · A2` 18 từ, `Công nghệ · B2` 30 từ, `Đời sống · A2` 40 từ (order left-right then down).

**Thêm từ vừa gặp** (side column, 340x209): `--surface`, border 1 `--line`, radius 18, padding 24 [phone 16], gap 12, `Shadow/Card`. `Thêm từ vừa gặp` Bricolage Bold 20 `--ink`; help text Noto 14 lh 1.55 `--muted` (`Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went → go.`); row gap 12: input (height 44, border 1.5 `--line`, radius 12, fill `--surface`, padding 16; placeholder text `Ví dụ: went` exists but is **hidden** in the design) + `Nút` Chính `Thêm` (no arrow).

**Từ lâu chưa ôn** (108): same card shell, row gap 16, centred: `18` Bricolage ExtraBold 52, lh .9, tracking -1.4, colour `--fail` [phone 44]; middle `từ lâu chưa ôn` Noto SemiBold 15 `--ink` + `Nhóm Đề 9 · Listening, quá hạn hơn 60 ngày` Noto 13.5 `--muted`; right `Nút chữ` `Xem`.

**Từ theo ngăn** (237): card shell, padding 24, gap 8. Header: `170 từ theo ngăn` Bricolage Bold 16 `--ink`, spacer, `đến hạn / tổng` Mono 11.5 `--muted`. Six rows (gap 12 inside, row 20 high): label cell 84 wide = 9x9 square radius 3 in the stage colour + name Noto 13.5 `--ink`; track height 6 radius 3 `--line` (126 wide desktop, 160 phone) with a fill in the stage colour; count Mono 12 `--muted`, right-aligned in 56. Rows: `Mới` 11 / 19, `1 ngày` 24 / 38, `3 ngày` 19 / 45, `7 ngày` 6 / 33, `14 ngày` 0 / 24, `30 ngày` 0 / 11 (10 + 8 + 5 = ok, sum of totals 170). Stage colours (raw, section 5). The chip component `Chip ngăn` is **not** used here; flat squares are.

**Nút lịch nổi** (`95:343`, kích thước Lớn): 62x66, radius 16, fill `--surface`, shadow `Shadow/Pop`-like `0 24 28 rgba(27,36,68,.34)`+`0 2 3 .08`. Top band 20 high `--accent` with `T11` JetBrains Mono Bold 10 `--on-accent` (month); day `8` Bricolage ExtraBold 26 `--ink`, centred; streak chip top-right at (38,-9): fill `--mark` (`#ffd84a`), border 2 `--bg`, radius 11, padding 3/5/3/8, flame icon 13 (`icon/lửa`) + `6` Bricolage ExtraBold 12 `--mark-ink`. Small size (phone): 54x58, `T11` 9px, day 22px. Description in Figma: opens the Lịch học modal (key L); bottom-right on every screen; on phone sits above the tab bar; hidden when the modal is open.

## 2. Carousel: Nhóm (`82:3213` desktop 1440x900, `82:3368` phone 390x844)

### 2.1 Layout

- Background: `Nền lưới chấm` + `Quầng màu nhóm` ellipse (desktop 1200x720 at (120,-6); phone 520x560 at (-65,46)): a soft radial glow in the **centre group's colour** (raw image asset; coral here). Top bar as in Hôm nay (tab `Nhóm` active).
- Content (desktop): x=140, y=94, width 1160, vertical gap 20, centred column. Order: `Đầu trang` (68) -> `Băng chuyền` (470 high) -> `Dưới băng chuyền` (105, centred, 494 wide).
- Phone: x=16, y=76, width 358: `Đầu trang` (132: title block 72 + select row 48, gap 12) -> `Băng chuyền` (330) -> `Dưới băng chuyền` (105, 343 wide). Gap 16.
- Floating: only `Nút lịch nổi` (desktop Lớn at bottom-right 32/32; phone Nhỏ 54x58 at (320,700), above the tab bar at y=772). **No "+".**

### 2.2 Header

- Desktop: left block: `Nhóm của bạn` Bricolage ExtraBold 40, lh 1.15, tracking -0.84 `--ink` [phone 32 high]; subtitle Mono 12 `--muted`: `62 thẻ chờ trong 5 nhóm · ← → hoặc vuốt để đổi nhóm · bấm thẻ giữa hoặc ↓ để mở` [phone: `62 thẻ chờ trong 5 nhóm · vuốt để đổi nhóm · chạm thẻ giữa để mở`, 2 lines]. Right cluster (aligned to the bottom of the title block, gap 16): `Nút chọn nhóm` + `+ Tạo nhóm`.
- `Nút chọn nhóm` 181x48: fill `--surface`, border 1.5 `#e1a094` (raw, light tint of the centre colour), radius 12, shadow raw `0 8 20 -10 rgba(27,36,68,.18)`, padding 12/16 (left)/12 (right), gap 8: 10x10 square radius 3 in the group colour (`#e5603f`), name `Đề 12 · Writing` Noto SemiBold 15 `--ink` (`Body/Button`), chevron-down 16. Shows the **centre** group. Open state: chevron flipped up, border stronger coral (raw, not extracted).
- `+ Tạo nhóm`: plus icon 16 + label Noto SemiBold 15 `--accent`, no fill.
- Phone: select button left, `+ Tạo nhóm` right (x=263).

### 2.3 Stacks (carousel)

Carousel frame 1160x470, children absolutely positioned, centre card on top.

| Slot | Face WxH (stack H) | Position (x, y of stack) | opacity | blur | Behind cards |
|---|---|---|---|---|---|
| centre (Đề 12 · Writing) | 290x368 (426) | 435, 30 | 1 | 0 | 3 |
| -1 left (Du lịch Nhật, empty) | 241x306 (354.2) | 230, 58 | .70 | 1.8 | 0 |
| +1 right (Đề 9 · Listening) | 241x306 (354.2) | 690, 58 | .70 | 1.8 | 3 |
| -2 left (Đề 11 · Speaking) | 191x243 (281.2) | 25, 86 | .40 | 3.6 | 1 |
| +2 right (Đề 14 · Reading) | 191x243 (281.2) | 945, 86 | .40 | 3.6 | 2 |

- Order left to right: Đề 11, Du lịch Nhật, **Đề 12 (centre)**, Đề 9, Đề 14. So the group list order is not the display order here: centre is the "ôn tiếp" group; the sequence is data-driven (**ASSUMPTION:** a rotating list of the 5 groups with pending or recent state; the drawn order is Speaking, Du lịch Nhật, Writing, Listening, Reading).
- Scale vs centre: +-1 = 0.831 (stack tops 28 lower per step: 30 -> 58 -> 86), +-2 = 0.659. The cards sit **under** the centre card (centre 435..725, +-1 stacks reach 471 and start at 690, so 36 px overlap each side; +-2 clear of +-1).
- Centre card face: border 2 `#e5603f`, radius 31.231, fill `--surface`, shadow raw `0 35.7 66.9 -42.4 rgba(27,36,68,.45)`, padding 25.65/27.885/22.3. Side faces: border 1.5 (+-1 1.662) in their group colour, radii 25.954 (+-1) / 20.569 (+-2), shadows scaled (`0 29.66 55.6 -35.2 .45`, `0 23.5 44 -27.9 .45`).
- Behind cards (`Thẻ sau 1..3`), fixed ratios of the face (width and height 0.94 / 0.88 / 0.82, each step 0.03 of width in x and 0.0858 of face height in y). Drawn centre values: sau1 272.6x345.92 at (8.7, 31.56), opacity .85, blur 1.25; sau2 255.2x323.84 at (17.4, 63.13), opacity .55, blur 2.5; sau3 237.8x301.76 at (26.1, 94.69), opacity .3, blur 3.75; all fill `--surface`, border 1.5 in the **lighter tint** of the group colour, radius shrinking (29.357 / 27.483 / 25.609). No shadow on them in the carousel.
- Lighter tint = the group colour at about 50% on white (pairs in section 5: `#e5603f` -> `#e1a79d`, `#149384` -> `#83bebc`, `#7a55d3` -> `#b0a2e0`, `#4a9637` -> `#9bbf99`). The centre number uses a darker ink: `#984941` (carousel) vs `#b25140` (Hôm nay hero). Two different inks for the same group colour: raw, flag for tokenising.
- Centre face content (`Thẻ nhóm`): `48 từ · 12 đã thuộc` Mono 17.4 `--muted`; name `Đề 12 · Writing` Bricolage ExtraBold 45.731, lh 1.08, tracking -0.96, width 234 (wraps to 2 lines: `Đề 12 ·` / `Writing`); spacer; `24` Bricolage ExtraBold 60.231 `#984941` + `thẻ chờ` Noto SemiBold 20.077 `--muted`; footer top border `--line`: `tiếp theo` Noto 18.3 `--muted` + `mitigate` Bricolage Bold 20.5 `--ink`. Side faces same structure at their scale (+1: `40 từ · 8 đã thuộc`, `Đề 9 · Listening`, `18` ink `#17696c`, `tiếp theo commute`; +2: `36 từ · 8 đã thuộc`, `Đề 14 · Reading`, `11` ink `#56429d`, `tiếp theo prevalent`).
- Arrows `Nhóm trước` / `Nhóm sau` (desktop only): 48x48 circles, fill `--surface`, border 1 `--line`, shadow raw `0 8 20 -10 .2`, icon 18 (`icon/l`, `icon/r`), at x=0 and x=1112, y=186 of the carousel (vertical centre of the centre card).
- Hint under the carousel (absolute, centred at y=428): Mono 11 `--muted`: desktop `bấm để mở nhóm · ↓`, phone `chạm để mở nhóm`.
- Counter / dots: **none drawn** (no dots, no "2/5"). The only position indicator is the stage-rhythm bar below, which is not a pager.

### 2.4 Below the carousel (`Dưới băng chuyền`)

Column, centred, gap 12: `nhịp ôn: mới → 30 ngày` Mono 12 `--muted`; bar of 6 segments height 10, radius 3, gap 3, widths 51/76/84/93/68/34 (desktop, total 420) or 36/53/59/65/48/24 (phone, total 300), track `rgba(27,36,68,.14)`, fill `#e5603f` (centre group colour); segment 1 and 2 full, segment 3 filled 76 of 84, rest empty (see 0.6). Then row (padding-top 8, gap 12): `Học` (Nút Phụ) and `Ôn` (Nút Chính), 148x45 [phone 110x45], then links `Xem nhóm →` (Noto SemiBold 15 `--accent`) and, **desktop only**, `Thêm từ` (Noto SemiBold 15 `--muted`). Ôn is the primary button.

### 2.5 Phone differences (carousel)

- Only 3 stacks: centre 210x267 face (stack 309) at (74,30), +-1 174x221 (stack 255.8) at x=-36 (left, clipped by the screen edge) and x=220 (right, extends past the edge), y=51, opacity .7, blur 1.8. No +-2, no arrows (swipe only). Border 1.5 on all faces; centre radius 22.615.
- Centre text: `48 từ · 12 đã thuộc` Mono 12.6; name 33.115; `24` 43.615 `#984941` + `thẻ chờ` 14.538; footer 13.246 / 14.862. +-1: 10.44 / 27.438 / 36.138 `#17696c` / 12.046 / 10.975, 12.314.
- Header stacks vertically; subtitle wraps; hint `chạm để mở nhóm`; buttons 110 wide and no `Thêm từ` link.

## 3. Picker (`84:3173` desktop, `84:3399` phone)

Same screen as 2 with the popover `Bảng chọn nhóm` (`84:3325` / `84:3482`). No scrim or dimming of the carousel behind it.

- Desktop: 360x514, positioned under the select button, right edge aligned with the button's right edge (x=1189), 8 px below the button (top 170; button bottom 162). Phone: 358x484 at (16,214), full content width, 6 px below the select row, above the tab bar.
- Shell: fill `--surface`, border 1 `--line`, radius 16 (raw), shadow raw `0 24 48 -20 rgba(27,36,68,.45)`, padding 12, gap 6. Select button state: chevron flipped to up (icon moved to y=32, i.e. rotated 180), button border stronger coral.
- Search field: fill `--bg`, border 1.5 `#1e3a8a` (`--accent`, drawn focused), radius 10, padding 12, gap 8, search icon 16, placeholder `Tìm trong 8 nhóm` Noto Regular 15 `--muted` (the number is the total group count).
- Section captions Mono 11 `--muted`, lowercase: `còn thẻ chờ`, `xong hôm nay`, `chưa có từ`.
- Row (37 high, padding 8, radius 9, gap 12): colour square 10x10 radius 3 (group colour), name Noto SemiBold 14.5 `--ink` (flexible), right part, check icon 16 (visible on the selected row only; other rows contain the icon as a hidden/transparent variant).
  - `còn thẻ chờ` rows: count `24` Bricolage ExtraBold 14 in the group's ink colour + `chờ` Noto Regular 12.5 `--muted`. 5 rows: Đề 12 · Writing 24, Đề 9 · Listening 18, Đề 14 · Reading 11, Từ gặp ngoài đời 6, Đề 10 · Writing 3 (sum 62 = the header count; 5 groups).
  - `xong hôm nay` rows: `24 từ`, `30 từ` Noto Regular 12.5 `--muted` (total words): Công việc · B1, Đề 11 · Speaking.
  - `chưa có từ` row: `trống` (Du lịch Nhật).
- Selected state: row fill `#f4e5e4` (raw, tint of the coral group colour) + check; the selected group is the centre one (Đề 12 · Writing), the button shows it.
- Keyboard hint footer (**desktop only**): top border `--line`, padding-left 8, Mono 11 `--muted`, gap 12: `↑ ↓ chọn`, `↵ tới nhóm`, `Esc đóng`. No "F" hint anywhere. Phone: no footer, no close control (no X is drawn on either; desktop closes with Esc, phone has no drawn close affordance: tap outside is an **ASSUMPTION**).
- Drawn rows: 5 + 2 + 1 = 8 = the total in the placeholder, all visible without scrolling (no scroll or overflow behaviour is drawn).

## 4. States drawn

- **Empty group** (`Du lịch Nhật`): colour `#64708c` (slate, raw) for border and picker square; top line `nhóm trống` (replaces `N từ · M đã thuộc`, Mono, same size); name; in place of the count `Chưa có từ` Bricolage ExtraBold (carousel +-1: 21.319px, `--muted`); footer `Thêm từ để bắt đầu` Noto Regular 15.2 `--muted` (no `tiếp theo` label); no behind cards; picker count `trống`.
- **Zero due / done today** (`Đề 11 · Speaking`, 30 từ · 12 đã thuộc): green `#4a9637` (behind `#9bbf99`); count replaced by `✓ Xong hôm nay` Bricolage ExtraBold 16.9 `--pass`; footer `ôn gần nhất` + `take for granted` (instead of `tiếp theo`); picker section `xong hôm nay`, count `30 từ`. Hôm nay: such groups are not cards, they are in the note line.
- **No priority cards** (hero without `có thẻ ưu tiên`), **disabled Học / Ôn**, hero for zero pending: not drawn.
- Hôm nay hero stage bar when a stage count is 0: not drawn (`14 ngày 0 / 24` and `30 ngày 0 / 11` rows show a zero count with a non-zero fill, see 0.5).

## 5. Hex colours

Group colours (face border / picker square / select button square / bar fill; lighter tint = behind cards and +-1 border; ink = the big count):

| Group | Colour | Lighter tint | Ink | Where |
|---|---|---|---|---|
| Đề 12 · Writing (coral) | `#e5603f` | `#e1a79d` | `#b25140` (Hôm nay hero), `#984941` (carousel, picker "24") | hero border, centre card, select button square, rhythm bar fill; select button border `#e1a094`; picker selected row bg `#f4e5e4` |
| Đề 9 · Listening (teal) | `#149384` | `#83bebc` | `#17696c` | Hôm nay card, +1 card, picker |
| Đề 14 · Reading (purple) | `#7a55d3` | `#b0a2e0` | `#56429d` | Hôm nay card, +2 card, picker |
| Từ gặp ngoài đời (amber) | `#d99a17` | `#dbc18b` | `#916d28` | Hôm nay card, picker |
| Đề 10 · Writing (pink) | `#d2427a` | `#d899b8` | `#8c3765` | Hôm nay card, picker |
| Công việc · B1 (blue) | `#2a86d1` | - | - | picker only |
| Đề 11 · Speaking (green) | `#4a9637` | `#9bbf99` | (uses `--pass` `#1b7a46` for `✓ Xong hôm nay`) | -2 card, picker |
| Du lịch Nhật (slate, empty) | `#64708c` | - | `--muted` | +-1 card, picker |

Stage colours, bars/squares in `Từ theo ngăn` (flat, raw): Mới `#9aa3b1`, 1 ngày `#c07a45`, 3 ngày `#98a2b0`, 7 ngày `#d4a72c`, 14 ngày `#1f9d75`, 30 ngày `#b28bff`.
`Chip ngăn` (`54:656`, not used on these frames) fills: Mới `#eef0f4` text `#525a78`; 1 ngày `#f7e8dc` / `#7c4a28`; 3 ngày `#edf0f4` / `#4d5664`; 7 ngày `#fbf0c8` / `#6f5208`; 14 ngày `#dcf3ea` / `#0c654c`; 30 ngày gradient 90deg `#ffe0f2 0%, #fff2d1 35%, #dbffeb 70%, #d9f0ff 100%` / `#3b2f6b`. Chip dots are image assets (not hex-read).
Hero stage bar: `--accent` `#1e3a8a`, `--ink` `#1b2444`, `--ghost` `#c9cedc`. Hero border `#e5603f`. Practice bar `--pass` `#1b7a46`, `--fail` `#b8352a`; pills `--pass-soft` `#e4f2ea`, `--fail-soft` `#f8e7e5`. Calendar button `--mark` `#ffd84a`, `--mark-ink` `#1b2444`, `--bg` `#f6f7fa`.

## 6. Tokens used (Figma variable defs for the frames)

Variables: `--bg #f6f7fa`, `--ink #1b2444`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--muted #525a78`, `--line #e1e5ee`, `--surface #ffffff`, `--on-accent #ffffff`, `--ghost #c9cedc`, `--pass #1b7a46`, `--fail #b8352a`, `--pass-soft #e4f2ea`, `--fail-soft #f8e7e5`, `--mark #ffd84a`, `--mark-ink #1b2444`; numeric `radius/md 10`, `radius/button 10`, `radius/pill 999`.
Text styles: `Display/Logo`, `Body/Small` (14/1.5), `Body/Small strong`, `Body/Button` (15 SemiBold, 1.4), `Body/Label` (13 SemiBold), `Body/Base strong` (16). Everything else (Bricolage headings, Mono captions, big numbers, card text) is raw font settings.
Effects: `Shadow/Soft`, `Shadow/Card`, `Shadow/Row`, `Shadow/Pop`, `Glass/Header` (top bar). Radii 16, 18, 28 and card radii are raw.
Fonts: Bricolage Grotesque (ExtraBold/Bold), Noto Sans (Regular/SemiBold/Bold), JetBrains Mono (Medium/Bold).

## 7. Components needed

Local Figma components / instances seen (name, id) and the pieces to build, deduplicated:

| Piece | Figma component (id) | Used by |
|---|---|---|
| `Nền lưới chấm` (dot grid + navy/yellow glows) | `Nền app/Lưới chấm — Desktop` `95:315` (+ phone instance) | all six frames (built already per task) |
| Top bar / bottom tab bar | `Thanh trên app/Desktop` `54:502`, `Thanh trên app/Mobile`, `Thanh tab dưới` | all (built already) |
| `Nút` (Chính / Phụ, optional arrow, label) | `Nút` `3:12` | Hôm nay hero (Học, Ôn, Thêm), carousel `Học` / `Ôn` |
| `Nút chữ` (text link, Thường) | `Nút chữ` `166:320` | Hôm nay: `Luyện lại từ sai →`, `Mở lịch học`, `Xem mọi chủ đề trong Tra từ →`, `Xem` |
| `Nút lịch nổi` Lớn / Nhỏ with streak chip | `Nút lịch nổi` `95:343` | all six frames |
| `Nút + nổi (Thêm từ)` | plain frame `117:4985` (no component) | phone Hôm nay only |
| Group colour model | (not a component) 8 group colours with border, lighter tint, ink | all card/picker pieces; section 5 |
| `GroupCard` stack, scalable (face + up to 3 behind cards, states: normal, empty `nhóm trống`, done `✓ Xong hôm nay`) | plain frames, no component | Hôm nay (4 cards, scale 0.607 / 0.517 phone), carousel (centre, +-1, +-2, scale 1 / .831 / .659; phone .724 / .6) |
| Hero `Ôn tiếp` block (stage bar + legend + big number + Học/Ôn) | plain frame `117:4545` / `117:4791` | Hôm nay |
| `Lần luyện gần nhất` card (score, bar, pills, wrong words, links) | plain frame `117:4573` / `117:4819` | Hôm nay |
| Section header (title + caption + link) | plain frames | Hôm nay: `Nhóm của bạn`, `Tạo nhóm nhanh theo chủ đề` |
| Topic row (name, count, arrow) | plain frame `Chủ đề ...` | Hôm nay |
| Quick-add card (`Thêm từ vừa gặp`, input + button) | plain frame `117:4480` / `117:4728` | Hôm nay |
| `Từ lâu chưa ôn` card | plain frame `117:4490` / `117:4738` | Hôm nay |
| `Từ theo ngăn` card with 6 stage rows (flat square + track + `due / total`) | plain frame `117:4496` / `117:4744` | Hôm nay |
| `Chip ngăn` (6 variants: Mới, 1, 3, 7, 14, 30 ngày; prop `Ngăn`) | `Chip ngăn` `54:656` (variants `54:638`, `54:641`, `54:644`, `54:647`, `54:650`, `54:653`) | **not used** on these frames; needed only if the plan decides stage chips |
| `Chip từ` (Thường / Cần ôn; prop text `t`, colour dot) | `Chip từ` `96:322` (`96:316`, `96:319`) | **not used** on these frames |
| Carousel track (slots -2..+2, scale/blur/opacity, arrows, hint) | plain frame `82:3279` | Nhóm desktop / phone (phone: 3 slots, no arrows) |
| Group select button + `+ Tạo nhóm` | plain frames `82:3270`, `82:3275` | Nhóm (both) |
| Stage rhythm bar (6 segments) + `Học` / `Ôn` / `Xem nhóm →` / `Thêm từ` row | plain frame `82:3348` | Nhóm (both; `Thêm từ` desktop only) |
| Group picker popover (search, 3 captions, rows, selected row, kbd hint desktop only) | plain frame `84:3325` / `84:3482` | picker frames |

## 8. Copy (every Vietnamese string, flat list)

Hôm nay (desktop = phone unless noted):
- chủ nhật, 08/11
- Hôm nay
- ôn tiếp · có thẻ ưu tiên
- Đề 12 · Writing
- nhóm có 48 từ · 12 đã thuộc
- 4 ưu tiên
- 14 đến hạn
- 6 mới
- Học
- Ôn
- 24
- thẻ chờ hôm nay
- 14/20
- đúng
- Lần luyện gần nhất
- thứ bảy, 07/11 · 20 câu · Đề 12 · Writing
- 14 (đúng pill)
- 6 (sai pill)
- Sai: deteriorate, allocate, viable, scrutiny
- Luyện lại từ sai →
- Mở lịch học
- Nhóm của bạn
- 4 nhóm khác còn thẻ chờ · bấm thẻ để mở nhóm (desktop only)
- Xem tất cả 8 nhóm → (phone: Xem tất cả →)
- 40 từ · 8 đã thuộc / Đề 9 · Listening / 18 / thẻ chờ / tiếp theo commute
- 36 từ · 8 đã thuộc / Đề 14 · Reading / 11 / thẻ chờ / tiếp theo prevalent
- 22 từ · 4 đã thuộc / Từ gặp ngoài đời / 6 / thẻ chờ / tiếp theo overwhelmed
- 28 từ · 9 đã thuộc / Đề 10 · Writing / 3 / thẻ chờ / tiếp theo allocate
- Xong hôm nay: Công việc · B1, Đề 11 · Speaking  ·  Chưa có từ: Du lịch Nhật
- Tạo nhóm nhanh theo chủ đề
- Xem mọi chủ đề trong Tra từ →
- Công việc · B1 / 24 từ; Du lịch · A2 / 18 từ; Công nghệ · B2 / 30 từ; Đời sống · A2 / 40 từ
- Thêm từ vừa gặp
- Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went → go.
- Ví dụ: went (hidden placeholder)
- Thêm
- 18 / từ lâu chưa ôn / Nhóm Đề 9 · Listening, quá hạn hơn 60 ngày / Xem
- 170 từ theo ngăn / đến hạn / tổng
- Mới 11 / 19; 1 ngày 24 / 38; 3 ngày 19 / 45; 7 ngày 6 / 33; 14 ngày 0 / 24; 30 ngày 0 / 11
- Calendar button: T11, 8, streak 6

Nhóm carousel (desktop; phone differences marked):
- Nhóm của bạn
- 62 thẻ chờ trong 5 nhóm · ← → hoặc vuốt để đổi nhóm · bấm thẻ giữa hoặc ↓ để mở (phone: 62 thẻ chờ trong 5 nhóm · vuốt để đổi nhóm · chạm thẻ giữa để mở)
- Đề 12 · Writing (select button), Tạo nhóm
- 48 từ · 12 đã thuộc / Đề 12 · Writing / 24 / thẻ chờ / tiếp theo mitigate
- 40 từ · 8 đã thuộc / Đề 9 · Listening / 18 / thẻ chờ / tiếp theo commute
- 36 từ · 8 đã thuộc / Đề 14 · Reading / 11 / thẻ chờ / tiếp theo prevalent (desktop only)
- 30 từ · 12 đã thuộc / Đề 11 · Speaking / ✓ Xong hôm nay / ôn gần nhất take for granted (desktop only)
- nhóm trống / Du lịch Nhật / Chưa có từ / Thêm từ để bắt đầu
- bấm để mở nhóm · ↓ (phone: chạm để mở nhóm)
- nhịp ôn: mới → 30 ngày
- Học, Ôn, Xem nhóm →, Thêm từ (desktop only)

Picker:
- Tìm trong 8 nhóm
- còn thẻ chờ
- Đề 12 · Writing 24 chờ; Đề 9 · Listening 18 chờ; Đề 14 · Reading 11 chờ; Từ gặp ngoài đời 6 chờ; Đề 10 · Writing 3 chờ
- xong hôm nay
- Công việc · B1 24 từ; Đề 11 · Speaking 30 từ
- chưa có từ
- Du lịch Nhật trống
- ↑ ↓ chọn · ↵ tới nhóm · Esc đóng (desktop only)

Top bar and tab strings (already built, for reference): Hôm nay, Nhóm, Luyện tập, Tra từ, Tìm từ, Thêm từ, Pro.
