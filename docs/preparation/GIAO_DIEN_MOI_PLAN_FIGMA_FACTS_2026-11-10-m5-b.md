# Figma facts for M5b: Học (`/app/review`) and Ôn (`/app/recall`)

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`). Read 10/11/2026 with `get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs` (read only).
Vietnamese copy is exact. "raw" = hard-coded in the frame, not a named style/variable. Text styles: Figma exposes only `Body/Base`, `Body/Small strong`, `Body/Button`, `Body/Label` by name; every Bricolage Grotesque and JetBrains Mono text is inline (raw) in these frames.

## 0. Frame inventory (names + ids)

Học frames exist only for these 5 (no other frame name starts with "Học" on the page):

| Frame | Id | Size |
|---|---|---|
| Học — Desktop 1440 (mặt trước) | `80:3228` | 1440x900 |
| Học — Mobile 390 (đã lật) | `80:3321` | 390x844 |
| Học — Desktop 1440 (đã lật, đang kéo sang Đã biết) | `80:3429` | 1440x900 |
| Học — Desktop 1440 (xong phiên) | `80:3557` | 1440x900 |
| Học — Mobile 390 (xong phiên) | `80:3601` | 390x844 |

Counterparts asked for: desktop of "đã lật" (not dragged): NOT drawn. Mobile of "mặt trước": NOT drawn. Mobile of "đang kéo": NOT drawn. The mobile "đã lật" frame is the only mobile Học card state.

Ôn frames (all 8 exist): `208:5655` / `208:5778` (trắc nghiệm theo nghĩa, desktop/mobile), `209:5683` / `209:5802` (gõ từ), `209:5902` / `209:6003` (gõ sai, so chữ), `209:6089` / `209:6195` (xong phiên).

Design tokens used (from `get_variable_defs` and inline fallbacks): `--bg #f6f7fa`, `--surface #fff`, `--ink #1b2444`, `--muted #525a78`, `--line #e1e5ee`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--on-accent #fff`, `--pass #1b7a46`, `--pass-soft #e4f2ea`, `--fail #b8352a`, `--fail-soft #f8e7e5`, `--mark #ffd84a`, `--mark-ink #1b2444`. Radius tokens seen: `--radius/sm 6`, `--radius/md 10`, `--radius/lg 14`, `--radius/xl 20`, `--radius/button 10`. Named effects: `Shadow/Pop` (0 2 6 #1B244414 + 0 24 56 -24 #1B244457), `Shadow/Card` (0 1 2 #1B24440F + 0 10 28 -14 #1B244433).

Shared on every frame: background instance `Nền lưới chấm` (component `Nền app/Lưới chấm — Desktop` `95:315` / `— Mobile` `95:321`: 20 px dot grid fading to the edges, navy glow top-left, yellow glow bottom-right, absolute under everything). Desktop: floating `Nút lịch nổi` `95:343` (62x66, r16, bottom 32 right 32, month strip "T11" 10 mono bold on accent, day "8" Bricolage ExtraBold 26, streak pill `--mark` bg, border 2 `--bg`, flame icon 13 + "6", effect 0 24 28 rgba(27,36,68,.34) + 0 2 3 rgba(.08), raw). Mobile: `Nút lịch trong thanh` `95:344` (32x34, r9) sits in the top bar row, not floating (Figma note: "để không che nút trả lời").

---

## 1. Học

Common to Học frames: **no app chrome** (no sidebar, no tab bar). Content column is `Phiên ôn` (desktop 1000 wide at x=220,y=32; mobile 358 wide at x=16,y=20). Column gap 20 (desktop) / 16 (mobile).

### 1.1 Session bar (`Đầu phiên`)

Desktop (1000x45, one row, gap 16, items centred):
- Left: `Tên nhóm`: line 1 "học nhóm" (JetBrains Mono Medium 11, tracking 0.66, `--muted`, raw); line 2 "Đề 12 · Writing" (Bricolage Grotesque Bold 22, lh 1.35, `--ink`, raw).
- Flexible spacer, then `Thanh tiến độ` 188x6, r3, track `--line`, fill `--accent` (`Đã làm`). Fill: 8 left = 1/8 done (12.77%); after 3 done "còn 5 thẻ" = 50%; "còn 0 thẻ" full on done screen.
- Text "còn 8 thẻ" (Noto Sans Regular 14, lh 1.5, `--muted`). Counter is *cards left*, not "câu x / y".
- Button `Đóng phiên ôn`: surface, border 1 `--line`, r8, px12 py6, gap 6; text "Đóng phiên ôn" (Noto Regular 14, `--ink`) + key cap "Esc".
- Key cap (raw, used for Esc, 1, 2, Space here): bg `--bg`, border 1 `--line` with bottom 2, r5, min-w 22, pt3 pb2 px5, JetBrains Mono Bold 11 `--ink`. This differs from the component `Phím` (see Components).
- Calendar: floating `Nút lịch nổi` bottom right.

Mobile (358 wide, 2 rows, gap 12):
- Row 1: `Tên nhóm` (same two texts), spacer, button "Đóng" (surface, border 1 `--line`, r8, px12 py6, Noto Regular 14; no Esc key), `Nút lịch trong thanh`.
- Row 2: `Thanh tiến độ` (flexible, 285 wide, h6 r3; 143/285 = 50% filled) + "còn 5 thẻ" (14 muted).

### 1.2 Resting front, desktop (`80:3228`)

Layout `Khu xếp thẻ` 1000x540, 3 columns gap 28: left pile 292, card stack 360, right pile 292.

- **Left pile "Cần ôn lại"** (centred, gap 4): count "0" (Bricolage ExtraBold 46, lh 1.2, `--fail`, raw); label row = chevron-left icon `Icon left` 16 + "Cần ôn lại" (Noto SemiBold 16, `--fail`); below `Thẻ đã xếp` area 100x120 (min-h 120, pt 8) holding word chips (empty here).
- **Right pile "Đã biết"**: count "0" in `--pass`; label "Đã biết" (Noto SemiBold 16, `--pass`) + chevron-right icon `Icon right` 16. Same 100x120 area.
- Pile word chips (seen in 1.4): surface, border 1 `--line`, r6, px8 py2, Noto Regular 13 `--ink`, stacked vertically gap 4 (raw).
- **Card stack `Chồng thẻ`** 360x514, three cards, all surface, border 1 `--line`, r22 (raw), padding 24, gap 12, shadow drop 0 24 24 rgba(27,36,68,.45) (raw):
  - `Thẻ sau 2`: 324x423 at (18, 53.5), opacity 50, blur 4.5. Content `adjective` / `substantial` / `/səbˈstæn.ʃəl/`.
  - `Thẻ sau 1`: 342x447 at (9, 27.5), opacity 85, blur 2.5. Content `verb` / `allocate` / `/ˈæl.ə.keɪt/`.
  - `Thẻ trên cùng · mặt trước`: 360x470 at (0,0), no blur, full opacity. Rotation 0.
  - Each card: `Đầu thẻ` row (38 high): POS label (JetBrains Mono Medium 12 `--muted`, e.g. "verb"); on the top card only a pill `Ưu tiên` (bg `--accent-soft`, r5, px8 py2, Noto SemiBold 12 `--accent`; text "Ưu tiên"); spacer; speaker button `Nút nghe` (38x38 circle r19, bg `--bg`, border 1 `--line`, speaker icon `Icon say` 18). Drawn inline, not the `Nút loa` component.
  - `Từ` block centred: lemma (Bricolage Bold 46, lh 1.3, tracking -0.46, `--ink`; mobile 40, tracking -0.4) "mitigate"; IPA (Noto Regular 18 `--muted`) "/ˈmɪt.ɪ.ɡeɪt/".
  - Footer hint (Noto Regular 13 `--muted`, centred): "Bấm vào thẻ hoặc Space để lật" (desktop) / "Bấm vào thẻ để lật" (mobile).
- Text under the area (`Text` 14 muted, centred): a single space (empty hint line, becomes the drag message in 1.4).
- **Buttons `Trả lời`** (centred row, gap 12, y=666): three buttons, each surface, border 1.5 `--line`, r12, px16 py12, gap 8; labels Noto SemiBold 16.
  - "Cần ôn lại" (`--fail`) with key cap "1" on the left, **opacity 45** (disabled until flipped).
  - "Lật thẻ" (`--ink`) with key cap "Space" on the right, full opacity (the only active one).
  - "Đã biết" (`--pass`) with key cap "2" on the right, opacity 45.

### 1.3 Flipped back, mobile (`80:3321`)

- Piles become a row `Hai đống` under the stack (two columns gap 12, each 173x62): count (Bricolage ExtraBold 32, `--fail` "1" / `--pass` "2") over label row (Noto SemiBold 14: chevron-left + "Cần ôn lại"; "Đã biết" + chevron-right). No chips.
- Stack `Bọc chồng thẻ` / `Chồng thẻ` 330x464: `Thẻ sau 2` 297x378 at (16.5, 51), opacity 50, blur 4.5, content `verb` + `Ưu tiên` pill, `mitigate`, `/ˈmɪt.ɪ.ɡeɪt/` (lemma 40), hint "Bấm vào thẻ để lật". `Thẻ sau 1` 314x399 at (8, 26.5), opacity 85, blur 2.5, `adjective`, `inevitable`, `/ɪˈnev.ɪ.tə.bəl/`. Top card 330x420 (flipped), r22, same shadow.
- **Back of top card** (`Thẻ trên cùng · mặt sau`): header row = lemma "deteriorate" (Bricolage Bold 22, lh 1.3, raw) + POS "verb" (mono medium 12 `--muted`, baseline aligned), spacer, `Nút nghe` 38 circle. Then:
  - English meaning "to become worse over time" (Noto Regular 18 `--ink`, lh 1.5).
  - Vietnamese meaning "xấu đi" (Noto Regular 15 `--muted`).
  - `Câu mẫu` block: top border 1 `--line`, pt 12, gap 4: label "câu mẫu" (mono medium 11, tracking 0.66, `--muted`); sentence "Air quality tends to deteriorate in the dry season." as word frames (Noto Regular 16, lh 1.55, wrap gap 2/4); the target word "deteriorate" highlighted: bg `#ffd84a` (raw; `--mark` token fallback), px3, r3, text `--mark-ink`.
  - Flexible gap, then stage line "Đang ở ngăn 1 ngày" (Noto Regular 13 `--muted`), plain text, **not** the `Chip ngăn` component.
  - Back has no "Ưu tiên" pill.
- **Buttons `Trả lời`** (120 high, gap 8): row `Hai lựa chọn` of two 173x57 buttons (surface, border 1.5 `--line`, r12, px8 py16, no key caps): "Cần ôn lại" (`--fail`, Noto SemiBold 16) and "Đã biết" (`--pass`); under them text button `Xem mặt trước` (no border/bg, 55 high, Noto SemiBold 16 `--ink`, label "Xem mặt trước").
- Phone has no key hints.

### 1.4 Flipped + dragging to "Đã biết", desktop (`80:3429`)

Header "còn 5 thẻ", bar 50% filled. State: 1 card already in "Cần ôn lại", 2 in "Đã biết".
- Left pile: count "1" (`--fail`), chip "allocate" in the 100x120 area (66x26 chip at x=0,y=8).
- Right pile: count "2" (`--pass`); label row is the component instance `Nút chữ: Đã biết` (166:5166; Noto SemiBold 14, colour `--accent`, i.e. navy, not green; see Mismatches) + chevron-right 16; chips "substantial" and "mitigate" stacked gap 4.
- Cards behind: `Thẻ sau 2` (mitigate, 324x423, opacity 50, blur 4.5, with `Ưu tiên`), `Thẻ sau 1` (adjective / inevitable, now larger 347x454 at (6.5, 16), **opacity 95, blur 1**).
- **Dragged top card** (back face, same content as 1.3): bounding box 399.6x499.6 at (78,-8) of the stack, i.e. card 360x470 shifted right ~37 px and tilted **rotate 5 deg (clockwise)**; shadow stronger: 0 30 30 rgba(27,36,68,.5) (raw). Because rotated, header and text are laid out at card size 360 wide.
- **Stamp `Dấu Đã biết`** at top-right of the card (card-local x=213, y=11): bg `--surface`, border 2 `--pass`, r10, px12 py6, **rotate 7 deg** (total ~12 deg with the card). Row: check icon `Icon ok` 16 + "Đã biết" (Noto SemiBold 15 `--pass`); below "lên ngăn 3 ngày" (Noto Regular 12 `--pass`).
- Hint line under the area (Noto Regular 14 `--muted`, centred): "Thả để xếp vào Đã biết. Thẻ lên ngăn 3 ngày."
- Buttons all full opacity: "1 Cần ôn lại" (key cap "1" on the left, `--fail`), "Xem mặt trước" + key cap "Space", "Đã biết" + key cap "2" (`--pass`).
- Left-side drag (Cần ôn lại) is not drawn.

### 1.5 Done, desktop (`80:3557`) and mobile (`80:3601`)

- Header: same bar; text "còn 0 thẻ" with full bar (mobile fill 285/285). Desktop keeps "Đóng phiên ôn Esc"; mobile keeps "Đóng" + calendar.
- Card `Tổng kết`: desktop 1000x320, flex row, p32, gap 32, bg `--surface`, border 1 `--line`, r18, `Shadow/Card`-like (0 10 28 -14 rgba(.2) + 0 1 2 rgba(.06), raw). Mobile: single column 358 wide, ring first then text.
- Ring `Vòng đã biết` 200x200 (mobile 170): two ellipse strokes, green (`--pass`) = known share clockwise from 12 o'clock (5/8), red (`--fail`) = rest. Centre: "5" (Bricolage ExtraBold 64, lh 0.9, tracking -2.1, `--ink`) + "/8" (ExtraBold 32 `--muted`); below "đã biết" (mono medium 12 `--muted`).
- Text block (gap 16): title "Xong 8 thẻ." (Bricolage ExtraBold 34, tracking -0.7); sentence "Thẻ cần ôn lại quay về ngăn 1 ngày và nằm đầu nhóm." (Noto Regular 16 `--muted`).
- `Hai cột` (gap 16; mobile stacked): column "Đã biết": number "5" (Bricolage ExtraBold 28 `--pass`) + "Đã biết" (Bricolage Bold 16 `--pass`) over a wrap of 5 `Chip từ` (gap 6): mitigate, substantial, inevitable, viable, prevalent. Column "Cần ôn lại": "3" + "Cần ôn lại" in `--fail` over 3 `Chip từ` kind "Cần ôn" (bg `--fail-soft`): allocate, deteriorate, reluctant.
- `Chip từ` here: r8, px8 py4, gap 6, colour dot 7x7 r2 `#e5603f` (raw, group colour), word Bricolage Bold 14 `--ink`.
- `Hai việc tiếp` (gap 20; mobile stacked, gap 12): primary `Nút` (component 3:12) "Về trang chủ" (bg `--accent`, px20 py12, r `--radius/button`, glow 0 10 14 rgba(30,58,138,.34), `Body/Button` 15 white; mobile full width 316x45) then `Nút chữ` "Ôn lại 3 thẻ cần ôn" (Noto SemiBold 14 `--accent`, `Body/Small strong`, no background).
- Next action on this screen: "Về trang chủ" (primary) and "Ôn lại 3 thẻ cần ôn" (secondary text button).

### 1.6 States drawn vs not drawn (Học)

Drawn: desktop front resting (piles 0/0); mobile flipped (piles 1/2); desktop flipped + dragging right; done desktop + mobile. Not drawn: desktop flipped without drag; mobile front; mobile drag; drag toward "Cần ôn lại"; the stamp for "Cần ôn lại"; flip animation; empty/zero-card session; error/loading; hint line text for the left drag; keyboard focus; the disabled 45% state on mobile; calendar modal.

---

## 2. Ôn

Common shell (desktop): column centred, py40, gap 20. Header `Đầu phiên` 760x36 (done: 880), row gap 16:
- `Dừng phiên` (done: `Đóng phiên`): 36x36 icon button, surface, border 1 `--line`, r10, `icon/x` 18.
- Title "Ôn · Đề 12 · Writing" (Noto SemiBold 14 `--ink`, raw; desktop only).
- `Thanh tiến độ` flexible, h6, r3, track `--line`, fill `--accent` r3 (`Đã làm 3/8` = 37.5%; 4/8 = 50%; done = 100%).
- Counter (JetBrains Mono Medium 12 `--muted`): "câu 3 / 8" desktop, "3/8" mobile; done: "xong 8 / 8" desktop, "8/8" mobile.
- `Đúng và sai`: two pills (r6, pl6 pr8 py3, gap 3): `Số câu đúng` bg `--pass-soft`, check icon 12 + number (Noto Bold 13 `--pass`); `Số câu sai` bg `--fail-soft`, x icon 12 + number (Noto Bold 13 `--fail`).
- Mobile (358 wide, py16 top, gap 12 in the row): close, bar 140 wide, counter, pills, `Nút lịch trong thanh` (no title).
- Desktop: floating `Nút lịch nổi`; footer key hints row `Phím` (gap 16) of `Phím` components + Noto Regular 13 `--muted` labels. No key hints on mobile.

Question card `Câu hỏi` (760 wide, bg `--surface`, border 1 `--line`, r `--radius/xl` 20, padding 28/32/24/32 desktop, 20 all around mobile (358 wide), gap 16, shadow 0 10 14 rgba(27,36,68,.2) + 0 1 1 rgba(.06) raw):
- Row 1: type tag (bg `--bg`, r5, px8 py3, mono Bold 11 `--muted`).
- Row 2: instruction (mono Medium 12 `--muted`).
- Meaning (Bricolage Bold, lh 1.25, tracking -0.6, `--ink`; desktop 34, mobile 24).

### 2.1 Trắc nghiệm theo nghĩa (`208:5655` desktop, `208:5778` mobile)

- Header: "câu 3 / 8", pills ✓2 ✗0.
- Tag "trắc nghiệm"; instruction "chọn từ có nghĩa này"; meaning "giảm nhẹ, làm dịu bớt (tác hại, rủi ro)".
- 4 options in `Lựa chọn` frame: desktop 2x2 (gap 12), mobile 4 rows, 1 column. Each option frame `Đáp án <word>`: h52, r14, surface, border 1.5 `--line`, px16, gap 12. Desktop contents: instance `Phím` (22x22, bg `--accent-soft`, r6, Noto SemiBold 12 `--accent`) with 1, 2, 3, 4, then word (Bricolage Bold 17 `--ink`). Mobile: no Phím chips, word only.
- Options in order: 1 "allocate", 2 "mitigate" (correct), 3 "scrutinize", 4 "deteriorate".
- Footer hints desktop: `Phím` "1–4" (51.5 wide) "Chọn đáp án"; `Phím` "Esc" (36.5) "Dừng phiên".
- States not drawn: selected/correct/incorrect for options, feedback, next button, mobile footer.

### 2.2 Gõ từ theo nghĩa (`209:5683` desktop, `209:5802` mobile)

- Header: "câu 4 / 8", ✓3 ✗0; bar 50%.
- Tag "gõ từ · theo nghĩa"; instruction "gõ từ tiếng Anh có nghĩa này"; meaning "phân bổ, chia phần (ngân sách, thời gian)".
- `Ô nhập` (component `Ô nhập` 34:345, instance of `Ô`): focused state: bg `--surface`, border 2 `--accent`, r `--radius/md` 10, h48, px14, ring 0 0 0 4 rgba(30,58,138,.16), text "alloc" (`Body/Base` Noto Regular 16 `--ink`) + caret 2x20 `--accent`. No label or hint drawn although the component note says label always above.
- `Hành động` row: left `Nút chữ` "Gợi ý" (Noto SemiBold 14 `--accent`), right `Nút` primary "Kiểm tra" (no arrow; `Body/Button`, accent, glow).
- Footer hints desktop: `Phím` "Enter" "Kiểm tra"; `Phím` "H" "Gợi ý"; `Phím` "Esc" "Dừng phiên".
- Not drawn: empty field, hint revealed (what "Gợi ý" shows), correct answer feedback, disabled "Kiểm tra", unfocused field, mobile keyboard.

### 2.3 Gõ sai, so chữ với đáp án (`209:5902` desktop, `209:6003` mobile)

- Header: "câu 4 / 8", ✓3 ✗1.
- Question card same as 2.2 but the input is replaced by `So chữ` (gap 6, mono Medium): row `bạn gõ`: "alocate" (18, `--fail`, **line-through on the whole word**) + label "bạn gõ" (12 `--muted`); row `đáp án`: "allocate" (18, `--pass`) where the missing letter `l` (second letter position, "a" + **"l" underlined** + "locate") is underlined, + label "đáp án" (12 `--muted`). So: the typed word is struck through entirely in red; the answer is green with only the missing/changed letter underlined. No per-letter colours.
- Card overlaps result card: question card has margin-bottom -26 and z 2; result card `Kết quả` z 1, width 716 (desktop; mobile 338 inside a 358 column, x=10), bg `--fail-soft`, border 1.5 `--fail` on left/right/bottom only, radius bottom 22, shadow 0 10 28 -14 rgba(.2) + 0 1 2 rgba(.06), padding-top 44, bottom 24, x28 (mobile ~17.5).
  - Header row (gap 12): red circle 30x30 (bg `--fail`, r15) with x icon 16 (white) + "Chưa đúng" (Bricolage ExtraBold 22 `--fail`); spacer; "allocate · phân bổ" (Noto SemiBold 15 `--ink`).
  - English definition "to give something officially for a particular purpose" (Noto Regular 14 `--muted`).
  - `Ghi chú` desktop: "Nhấn Enter để đưa allocate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn." Mobile: "Cần ôn lại: allocate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn." (14 `--muted`).
  - `Hai nút` right aligned (gap 16): secondary "Câu tiếp" (surface, border 1.5 `--line`, r10, h46, px20, Noto SemiBold 15 `--ink`) and primary "Cần ôn lại" (bg `--accent`, r10, h46, px20, 15 white) with `Phím` "Enter" (opacity 85; hidden on mobile).
- Footer hints desktop: `Phím` "Enter" "Cần ôn lại"; `Phím` "Esc" "Dừng phiên". No key hint for "Câu tiếp".
- Behaviour implied by copy: Enter = "Cần ôn lại" (word goes to top of group, stage 1 ngày); "Câu tiếp" = continue, schedule kept. Counter: ✗ increased to 1.
- Not drawn: wrong MCQ choice (no `Lựa chọn` Sai state in these frames), correct typed answer, near-miss/typo-tolerant state, hint used.

### 2.4 Xong phiên (`209:6089` desktop, `209:6195` mobile)

- Header: "xong 8 / 8", ✓6 ✗2, full bar; close button labelled `Đóng phiên`.
- Card `Tổng kết` 880 wide (mobile 358 wide, 656 high), p32 desktop, bg `--surface`, border 1 `--line`, r18, shadow 0 10 28 -14 rgba(.2) + 0 1 2 rgba(.06).
- Ring `Vòng câu đúng` 220 (mobile 170): green = correct share (6/8 = 75%, clockwise from 12), red = the top-left quarter. Centre "6" (Bricolage ExtraBold 68.2, tracking -2.1) + "/8" (34.1 `--muted`); "từ đúng" (mono 12 `--muted`).
- Title "Xong 8 từ." (Bricolage ExtraBold 34); sentence "Từ đến hạn của nhóm Đề 12 · Writing." (Noto Regular 15 `--muted`).
- `Bốn ô kết quả` (desktop 4 in a row gap 8, mobile 2x2 gap 8): each tile bg `--surface`, r14 (`--radius/lg`), px14 py12, `Shadow/Card`-like, number Bricolage ExtraBold 28 over label Noto Regular 13 `--ink`:
  - 5 "Đúng, lên ngăn" (number `--pass`)
  - 1 "Đúng, giữ ngăn" (number `--accent`)
  - 1 "Sai, giữ ngăn" (number `--ink`)
  - 1 "Cần ôn lại" (number `--fail`)
- `Còn từ mới`: "Còn 6 từ mới trong nhóm này" (Noto SemiBold 16 `--ink`) and "Học bây giờ thì ngày mai chúng có trong phiên ôn." (Noto Regular 14 `--muted`).
- `Việc tiếp` (gap 20): primary `Nút` "Học" then `Nút chữ` "Về trang chủ". Mobile: stacked, "Học" button auto width 69x45, text button below.
- Not drawn: zero-wrong session; word-list chips on Ôn done (none there); no streak/calendar nudge.

---

## 3. Mismatches and notes worth a plan decision

1. `Lựa chọn` component (`3:51`: w240, r10, Noto Regular 16, padding 12/10, states Thường / Đúng / Sai with 14 px icon + text "Đúng"/"Sai") is **not** what the Ôn frames draw. Frames draw inline 52 px-high r14 options with Bricolage Bold 17 and no state suffix. Decide which wins; the component's Đúng = bg `--pass-soft`, border `--pass`, glow 0 10 13 rgba(27,122,70,.35); Sai = bg `--fail-soft`, border `--fail`.
2. `Phím` component (`3:17`, accent-soft, r6, 22 high) is used in Ôn; Học uses a different raw key cap (bg `--bg`, line border with 2 px bottom, mono Bold 11, r5).
3. `Nút nghe` in Học is an inline 38 px circle (bg `--bg`, border `--line`), not the `Nút loa` component (32 px circle bg `--accent-soft`, speaker icon 17, `54:657`).
4. In the drag frame the right pile label is a `Nút chữ` instance (accent navy) while the resting frame uses `--pass` green text. Likely a drafting slip; verify with the owner.
5. `Chip ngăn` (`54:656`) is not placed in any of these frames; stage is plain text "Đang ở ngăn 1 ngày". "Ưu tiên" is a pill, not a stage chip.
6. Học progress counts cards left; Ôn shows "câu x / y" desktop and "x/y" mobile.
7. Wrong-answer note copy differs between desktop and mobile (see 2.3).
8. Ôn done has "xong 8 / 8" with the heading "Xong 8 từ." while the ring counts "từ đúng" 6/8.

---

## Components needed (deduplicated, with frames)

| Component (Figma id) | Variants / props seen | Frames |
|---|---|---|
| Nền app/Lưới chấm Desktop / Mobile (`95:315` / `95:321`) | per breakpoint | all |
| Nút lịch nổi (`95:343`) | desktop, streak "6", "T11", "8" | all desktop frames |
| Nút lịch trong thanh (`95:344`) | mobile, in top bar | 80:3321, 80:3601, 208:5778, 209:5802, 209:6003, 209:6195 |
| Nút (`3:12`) | Chính (accent, glow), with/without arrow; labels "Kiểm tra", "Học", "Về trang chủ" | 209:5683, 209:5802, 80:3557, 80:3601, 209:6089, 209:6195 |
| Nút chữ (`166:326`) | Thường (accent 14 semibold); labels "Gợi ý", "Ôn lại 3 thẻ cần ôn", "Về trang chủ", "Đã biết" | 209:5683, 209:5802, 80:3557, 80:3601, 80:3429, 209:6089, 209:6195 |
| Phím (`3:17`) | text 1, 2, 3, 4, "1–4", "H", "Enter", "Esc" (22 sq or auto width) | 208:5655, 209:5683, 209:5902, 209:6089 footers; option chips; "Cần ôn lại" button |
| Lựa chọn (`3:51`) | Thường / Đúng / Sai (frames draw inline, see mismatch 1) | 208:5655, 208:5778 |
| Ô nhập / Ô (`34:345` / `34:323`) | focused with caret; no label drawn | 209:5683, 209:5802 |
| Chip từ (`96:322`) | Thường (bg `--bg`) / Cần ôn (bg `--fail-soft`); colour dot `#e5603f` raw | 80:3557, 80:3601 |
| Chip ngăn (`54:656`) | Mới, 1/3/7/14/30 ngày (not placed in these frames) | none (reference only) |
| Nút loa (`54:657`) | 32 px, accent-soft (not placed; inline 38 px `Nút nghe` instead) | none (reference only) |
| Inline, no component: session bar, card (top / behind 1 / behind 2), pile with count + word chips, drag stamp "Dấu Đã biết", answer buttons with key caps, progress bar, ✓/✗ pills, result card "Kết quả", `So chữ` diff, ring chart (Học 200/170, Ôn 220/170), four result tiles | | as listed per section |

## Copy (flat list, exact)

Học: học nhóm; Đề 12 · Writing; còn 8 thẻ; còn 5 thẻ; còn 0 thẻ; Đóng phiên ôn; Esc; Đóng; Cần ôn lại; Đã biết; Ưu tiên; Bấm vào thẻ hoặc Space để lật; Bấm vào thẻ để lật; Lật thẻ; Space; 1; 2; Xem mặt trước; câu mẫu; Đang ở ngăn 1 ngày; to become worse over time; xấu đi; Air quality tends to deteriorate in the dry season.; lên ngăn 3 ngày; Thả để xếp vào Đã biết. Thẻ lên ngăn 3 ngày.; Xong 8 thẻ.; Thẻ cần ôn lại quay về ngăn 1 ngày và nằm đầu nhóm.; đã biết; Về trang chủ; Ôn lại 3 thẻ cần ôn. Sample words: mitigate /ˈmɪt.ɪ.ɡeɪt/ (verb), allocate /ˈæl.ə.keɪt/ (verb), substantial /səbˈstæn.ʃəl/ (adjective), inevitable /ɪˈnev.ɪ.tə.bəl/ (adjective), deteriorate (verb), viable, prevalent, reluctant.

Ôn: Ôn · Đề 12 · Writing; câu 3 / 8; câu 4 / 8; xong 8 / 8; 3/8; 4/8; 8/8; trắc nghiệm; chọn từ có nghĩa này; giảm nhẹ, làm dịu bớt (tác hại, rủi ro); allocate; mitigate; scrutinize; deteriorate; 1–4; Chọn đáp án; Esc; Dừng phiên; gõ từ · theo nghĩa; gõ từ tiếng Anh có nghĩa này; phân bổ, chia phần (ngân sách, thời gian); alloc; Gợi ý; Kiểm tra; Enter; H; bạn gõ; đáp án; alocate; allocate; Chưa đúng; allocate · phân bổ; to give something officially for a particular purpose; Nhấn Enter để đưa allocate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.; Cần ôn lại: allocate lên đầu nhóm, về ngăn 1. Câu tiếp: giữ lịch ôn.; Câu tiếp; Cần ôn lại; Xong 8 từ.; Từ đến hạn của nhóm Đề 12 · Writing.; từ đúng; Đúng, lên ngăn; Đúng, giữ ngăn; Sai, giữ ngăn; Cần ôn lại; Còn 6 từ mới trong nhóm này; Học bây giờ thì ngày mai chúng có trong phiên ôn.; Học; Về trang chủ.

Component labels (3:51 / 54:656): Đúng; Sai; Mới; Ngăn 1 ngày; Ngăn 3 ngày; Ngăn 7 ngày; Ngăn 14 ngày; Ngăn 30 ngày.
