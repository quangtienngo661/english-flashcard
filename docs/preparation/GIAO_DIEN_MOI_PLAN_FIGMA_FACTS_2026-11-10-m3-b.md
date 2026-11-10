# Figma facts for M3 (one-group pages), read 2026-11-10

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, read-only (`get_design_context`, `get_metadata`, `get_variable_defs`; no write tool used).
Frames: Một nhóm `84:3552` / `84:3749`, Từ tồn đọng `97:3085` / `97:3239`, Chủ đề `98:3127` / `98:3297`; confirm card `121:4597` (inside Xóa tài khoản `121:4503` / `121:4634`).
"raw" = a value Figma gave without a variable or named style. Variables and named styles are shown by name.

## Key findings (read first)

1. **Chủ đề is a topic detail page, not a topic list or grid.** It shows one topic ("Công việc · B1"), its suggested words and a floating "add to group" bar. No search field, no grid, no topic cards are drawn. How a topic is added: select words, pick a target group in a select, press "Thêm N từ đã chọn →".
2. **No side column at any width.** All six frames are one column. Only 1440 and 390 are drawn; nothing is drawn for 1280 or tablet. Max content width: 1104 (Một nhóm) or 1160 (Từ tồn đọng, Chủ đề).
3. **Một nhóm has no bulk select and no per-row remove action.** Rows are read-only (no checkbox). The only action UI is Học / Ôn / "Thêm từ" / `⋯` (icon `icon/more`, no menu drawn). Bulk select with "Bỏ khỏi việc học" exists **only** on Từ tồn đọng.
4. **No modal dialog is drawn.** The "Xóa tài khoản" confirm is an inline card ("Xác nhận") on a page; it has no overlay, no Hủy button, one destructive button. Cancel/secondary is described only in the component description of `Nút chữ` ("Phụ: chữ xám (Hủy, Để sau)").
5. Hover, pressed, focus (except one focused input in the confirm card), loading, error and empty states are **not drawn** in any of the six frames.
6. The Một nhóm filter chips row on phone is clipped at the right edge (5th chip cut off), which is how Figma shows "one row, scrolls horizontally". It is `overflow-clip`, `flex` with no wrap; desktop is `flex-wrap`.

## Shared tokens (from `get_variable_defs` on `97:3085`, same set seen on all frames)

Colours: `--bg` #f6f7fa, `--ink` #1b2444, `--accent` #1e3a8a, `--accent-soft` #e7ecf8, `--muted` #525a78, `--line` #e1e5ee, `--ghost` #c9cedc (unchecked checkbox border), `--surface` #fff, `--on-accent` #fff, `--fail` #b8352a, `--mark` #ffd84a, `--mark-ink` #1b2444. `--fail-soft` #f8e7e5 is used in the confirm card (only seen as a fallback in code, not in `get_variable_defs` of the list frame).
Radius: `radius/md` 10, `radius/button` 10, `radius/pill` 999, `radius/modal` 16. `radius/xl` 20 is used by the confirm card (value seen as the code fallback).
Named text styles: `Display/Logo`, `Body/Small` (Noto Sans 14/400, lh 1.5), `Body/Small strong` (14/600), `Body/Button` (15/600, lh 1.4), `Body/Label` (13/600), `Body/Base strong` (16/600, lh 1.6).
Named effects: `Shadow/Row` (0 1 2 #1B24440F + 0 4 12 -8 #1B244429), `Shadow/Soft`, `Shadow/Card` (0 1 2 #1B24440F + 0 10 28 -14 #1B244433), `Shadow/Pop` (0 2 6 #1B244414 + 0 24 56 -24 #1B244457), `Glass/Header` (background blur 24).
Fonts without a named style (raw, Bricolage Grotesque for headings and words, JetBrains Mono for small metadata, Noto Sans for body): shown per block below as "family weight size".
Raw colours: group colour #e5603f (second group colour #7a55d3), group dark #984941, stage dots #c07a45 / #9aa3b1 / #98a2b0, stage-bar track rgba(27,36,68,0.14).

## 1. Một nhóm (`84:3552` desktop 1440 wide, `84:3749` phone 390 wide)

### Layout

Desktop:
- Frame 1440 x ~1000. Layers bottom to top: `Nền app/Lưới chấm — Desktop` (dot grid, navy halo top-left, yellow halo bottom-right), `Quầng màu nhóm` (1200 x 640 at x 0, y -60, group-colour glow), `Thanh trên app/Desktop` (h 64, tab "Nhóm" active), `Nội dung`, `Nút lịch nổi` (Lớn, bottom 32, right 32).
- `Nội dung`: x 168, y 88, width 1104, vertical, gap 24, no side column.
- Order: back link, `Đầu nhóm` (row, gap 44, items centred), `Từ trong nhóm` (vertical, gap 8).
- `Đầu nhóm`: left = `Thẻ nhóm (từ băng chuyền)` 210 wide (card 210 x 267 plus two offset cards behind, total height 299); right = `Thông tin nhóm`, flex 1, vertical, gap 16.

Phone:
- Frame 390 x ~1256. Same layers; `Quầng màu nhóm` 520 x 520; `Thanh trên app/Mobile` (h 56, search button 40 + avatar 36); `Thanh tab dưới` (h 72, 4 tabs, "Nhóm" active); `Nút lịch nổi` (Nhỏ, bottom 86, right 16, above the tab bar).
- `Nội dung`: x 16, y 70, width 358, vertical, gap 16.
- `Đầu nhóm` is vertical (gap 20, centred): card 150 wide (card 150 x 190, stack total 213), then `Thông tin nhóm` full width gap 16.

### Blocks, top to bottom

| Block | Copy | Style / tokens |
|---|---|---|
| Back link `Quay lại` | "Nhóm của bạn" | `icon/back` 18 + text Noto Sans 600 15, colour `--accent`, gap 4 (same both) |
| Group card (stack of 3) | "48 từ · 12 đã thuộc" (JetBrains Mono 500 12.6 desktop / 9 phone, `--muted`); name "Đề 12 · Writing" (Bricolage ExtraBold 33 / 23.7, `--ink`); big number "24" (Bricolage ExtraBold 43.6 / 31, colour #984941 raw) + "thẻ chờ" (Noto 600 14.5 / 10.4, `--muted`); divider top border `--line`, "tiếp theo" (Noto 400 13.2 / 9.5, `--muted`) + "mitigate" (Bricolage Bold 14.9 / 10.6, `--ink`) | Front card `--surface`, border 2 px group colour #e5603f, radius 22.6 / 16.2, shadow 0 25.8 48.5 -30.7 rgba(27,36,68,.45) (raw). Two cards behind: border 1.5 px #e1a79d, opacity 85% and 55%, offset 6.3/22.9 and 12.6/45.7 px (phone 4.5/16.3 and 9/32.6), shadow 0 4 12 -8 + 0 1 2 (raw). Card is the carousel card reused ("Thẻ nhóm (từ băng chuyền)") |
| Meta line | "48 từ · tạo ngày 12/10/2026 · 12 đã thuộc" | JetBrains Mono 500 12, `--muted` (same both) |
| Title row | "Đề 12 · Writing" | colour square 16 (desktop) / 13 (phone), radius 4.8 / 3.9, fill #e5603f raw; text Bricolage ExtraBold 44 / 28, lh 1.1, `--ink`, gap 12 |
| Today chips `Hôm nay` (3 chips, gap 8) | "4 ưu tiên", "14 đến hạn", "6 mới" | chip `--surface`, radius 9, padding 12/5, shadow 0 8 20 -12 rgba(27,36,68,.18) raw; number Bricolage ExtraBold 14 in #984941, label Noto 400 14 `--ink`, baseline aligned, gap 4 |
| `Nhịp ôn` (stage bar, six stages) | Labels, desktop only, under each segment: "6 Mới", "9 1 ngày", "10 3 ngày", "11 7 ngày", "8 14 ngày", "4 30 ngày" (count JetBrains Mono Bold 11 `--ink`, name JetBrains Mono 500 11 `--muted`, gap 4). Phone has the bar with no labels | 6 segments, height 10, radius 3, gap 3, track rgba(27,36,68,.14) raw. Segment width is proportional to word count: desktop bar 850 wide gives 104, 157, 174, 191, 139, 70 (about 17.4 per word, = (850 - 15)/48); phone bar 358 gives 43, 64, 71, 79, 57, 29. Fill colour #e5603f (group colour, raw) over segments 1 and 2 fully, segment 3 about 90% (157/174, 64/71), segments 4-6 empty. **Meaning of the fill is not labelled in Figma.** Inference: 6 + 9 + 9 = 24 matches "24 thẻ chờ", so fill probably = cards waiting per stage (not verified against the API) |
| `Nút` row | "Học" (secondary), "Ôn" (primary), then text "Thêm từ" and icon `⋯` | `Nút` component: primary = `--accent` fill, `--on-accent` text, glow 0 10 14 rgba(30,58,138,.34); secondary = `--surface`, 1 px `--line`, shadow 0 14 17 -.. rgba(27,36,68,.22) + 0 1 1; both text `Body/Button` 15/600, radius `radius/button`, padding 20/12, height 45, **width fixed 148 desktop / 119 phone, no arrow icon**. "Học" is secondary, **"Ôn" is primary**. Row gap 12, wraps. "Thêm từ": Noto 600 15 `--muted` (plain text, not a navy `Nút chữ`). `Icon more` 20 |
| Section title `Từ trong nhóm` | "Toàn bộ 48 từ" | Bricolage Bold 22, lh 1.3, `--ink` |
| Filter chips `Lọc từ` | "Tất cả 48" (active), "Ưu tiên 4", "Đến hạn 14", "Mới 6", "Ngăn 1 ngày 9", "Ngăn 3 ngày 10", "Ngăn 7 ngày 11", "Ngăn 14 ngày 8", "Ngăn 30 ngày 4" | Chip padding 12/6, radius 9, gap 4 between label (Noto 400 14) and count (JetBrains Mono Bold 11); active = `--ink` fill + border `--ink` + `--surface` text; inactive = `--surface` fill, 1 px `--line`, `--muted` text. Row gap 6; desktop wraps (`flex-wrap`), **phone one row, no wrap, clipped at right edge = horizontal scroll** |
| Word row (5 drawn) | see below | row `--surface`, radius 12, padding 16/12, gap 16, no border; list gap 8; shadow on the row not visible in the code (a `Shadow/Row` style exists in the frame) |
| Footer link | "Xem thêm từ · còn 43 từ" | Noto 600 14 `--accent` (text link; 5 of 48 rows shown) |
| `Nút lịch nổi` | month "T11", day "8", streak badge "6" | component, Lớn 62 x 66 / Nhỏ 54 x 58, radius 16, shadow 0 24 28 rgba(27,36,68,.34) + 0 2 3; month strip `--accent`, streak chip `--mark` fill, `--mark-ink` text, 2 px `--bg` border |

Word rows (same data both):

| Word | POS (desktop) | Meaning | Stage chip (desktop) | Status label |
|---|---|---|---|---|
| mitigate | verb | giảm nhẹ | Ngăn 1 ngày, dot #c07a45 | ưu tiên (#b8352a = `--fail`) |
| allocate | verb | phân bổ | Ngăn Mới, dot #9aa3b1 | từ mới (#984941) |
| substantial | adjective | đáng kể | Ngăn 3 ngày, dot #98a2b0 | cần ôn hôm nay (#984941) |
| inevitable | adjective | không tránh được | Ngăn Mới, dot #9aa3b1 | từ mới |
| viable | adjective | khả thi | Ngăn 3 ngày, dot #98a2b0 | cần ôn hôm nay |

Desktop row columns (left to right): word 190 wide (Bricolage Bold 20, `--ink`); POS 96 wide (JetBrains Mono 500 11, `--muted`); meaning flex (Noto 400 15.5, `--ink`); stage chip 130 wide (square dot 9, radius 2.7, plus Noto 400 13 `--muted`, gap 6); status 120 wide, right-aligned (Noto 600 13).
Phone row: **POS and stage chip are dropped.** Left stack (gap 2): word Bricolage Bold 19 `--ink`, meaning Noto 400 14 `--muted`; right: status Noto 600 13. Row gap 16, padding 16/12.
The word rows show a status ("ưu tiên", "từ mới", "cần ôn hôm nay"), not "đến hạn" or "đã thuộc". Whether a row can show other statuses is not drawn.

### States drawn

Empty: no. Selected rows: no. Disabled buttons: no. Hover: no. Active filter chip: "Tất cả". Only one state of each element.

## 2. Từ tồn đọng (`97:3085` desktop, `97:3239` phone)

Page name in layer = "Từ tồn đọng"; the page title shown is "Từ lâu chưa ôn". It is **per group** (back link goes to "Nhóm Đề 9 · Listening").

### Layout

Desktop: frame 1440 x ~900; `Nền lưới chấm` (halos), top bar (h 64), `Nội dung` 1160 wide centred (x 140), padding top 32 / bottom 124, gap 20, one column; floating bar `Thanh nổi` absolute at left 511, top 809; `Nút lịch nổi` Lớn.
Phone: frame 390 x ~844; top bar 56, `Nội dung` padding 16 sides, top 20, bottom 100, gap 16; tab bar 72 at the bottom; `Thanh nổi` at left 12, top 658, width 366 (sits above the tab bar, over the end of the list); no calendar button drawn in this frame.

### Blocks, top to bottom

| Block | Copy | Style / tokens |
|---|---|---|
| Back link | "Nhóm Đề 9 · Listening" | `icon/back` 16 + Noto 600 14 (`Body/Small strong`), `--accent`, gap 4 |
| Header row `Đầu trang` (items end, gap 20) | Title "Từ lâu chưa ôn"; subtitle "18 từ trong Đề 9 · Listening đã quá hạn hơn 60 ngày."; right: big "18" and "từ quá hạn" | Title Bricolage ExtraBold 44 / 30, lh 1.1, `--ink`; subtitle Noto 400 16 / 15 `--muted`; number Bricolage ExtraBold 96 / 60, lh 0.9, colour `--fail`; caption JetBrains Mono 500 12 `--muted`, right-aligned. Phone keeps the number on the right of the title block (row, not stacked) |
| Explainer paragraph | "Từ ở ngăn 1 trở lên mà quá hạn hơn 60 ngày sẽ rời phần cần ôn, để việc ôn mỗi ngày không dồn quá dài. **Học lại**: về ngăn Mới, tính như từ mới hôm nay. **Bỏ khỏi việc học**: rời mọi nhóm, không còn hẹn ôn. **Để đó**: không làm gì; Wordmet không bao giờ tự xóa từ." | Noto 400 15 (phone 14.5) `--muted`, lh 1.65, width 780 (phone 358); the three terms Noto 600 in #1b2444 |
| List card `Danh sách từ` | | `--surface`, 1 px `--line`, radius 18, padding 24 desktop / 16 phone, `Shadow/Card` (raw 0 10 28 -14 rgba(27,36,68,.2) + 0 1 2) |
| Column header | desktop: checkbox, "từ", "nghĩa", "quá hạn"; phone: checkbox, "từ", "quá hạn" | JetBrains Mono 500 11 `--muted`, padding 16/6 top 16; unchecked select-all box even though 3 of 6 rows are selected (no indeterminate state drawn) |
| Rows (6) | allocate / phân bổ / 74 ngày (selected); mitigate / giảm nhẹ / 68 ngày (selected); scrutiny / sự xem xét kỹ / 66 ngày; prevalent / phổ biến / 63 ngày (selected); viable / khả thi / 61 ngày; coherent / mạch lạc / 61 ngày | Row padding 16/12, gap 16, top border 1 px `--line`, radius 10. Selected row bg rgba(30,58,138,.05) (raw) + checked box. Word Bricolage Bold 19 `--ink` (190 wide on desktop, flex on phone); meaning Noto 400 15 `--muted` (desktop only); overdue: desktop a bar 150 x 6, track `--line`, fill `--muted`, radius 3, fill widths 114, 78, 66, 48, 36, 36 px (not linear in days, so the fill scale is not derivable; raw), then "74 ngày" Noto 600 16 `--muted`, right-aligned in 76; **phone has no bar, only the "NN ngày" text** |
| Checkbox `Ô chọn nhỏ` | | 18 x 18, radius 5; unchecked: `--surface` + 1.5 px `--ghost`; checked: `--accent` fill + `icon/check` 12 white |
| List footer `Chân danh sách` | "đang có 6 / 18 từ" + text button "Xem thêm 12 từ" | mono 12 `--muted` + `Nút chữ` Thường (Noto 600 14, `--accent`), gap 20, padding top 16 |
| Floating bar `Thanh nổi` (3 selected) | desktop: [checked box] "Đã chọn 3 từ", text button "Bỏ khỏi việc học", primary button "Học lại 3 từ". Phone: row [box, "Đã chọn 3 từ", spacer, "Bỏ khỏi việc học"], then full-width primary button "Học lại 3 từ" | `--surface`, 1 px `--line`, `radius/modal` 16, `Shadow/Pop`; desktop padding 8 8 8 20, row gap 16, auto width; phone padding 16/12, column gap 12, width 366. "Đã chọn 3 từ" Noto 600 15 `--ink`. "Bỏ khỏi việc học" = `Nút chữ` kiểu Xóa (Noto 600 14, `--fail`). "Học lại 3 từ" = primary `Nút` |

What defines a row: not drawn as a rule, only in the explainer: a word at stage 1 or higher, overdue more than 60 days, inside this group. Header says 18; list shows 6 first ("đang có 6 / 18 từ") with "Xem thêm 12 từ" (load more).
Actions: "Học lại" (word returns to stage Mới, counts as a new word today), "Bỏ khỏi việc học" (leaves every group, no more review), "Để đó" (do nothing; it is described in the paragraph and has **no button**). Both actions are bulk on the selection. Order in the bar: destructive text button first, then primary.
Empty state: not drawn. Hover, disabled, no-selection (bar hidden or not) are not drawn; the bar is drawn only with 3 selected.

## 3. Chủ đề (`98:3127` desktop, `98:3297` phone)

### Layout

Desktop: frame 1440 x ~900; `Nội dung` 1160 wide centred, padding top 32 / bottom 124, gap 20; `Thanh nổi` absolute left 441, top 809; `Nút lịch nổi` Lớn.
Phone: `Nội dung` padding 16 sides, top 20, bottom 100, gap 16; tab bar 72; `Thanh nổi` left 12, top 638, width 366, column.

### Blocks, top to bottom

| Block | Copy | Style / tokens |
|---|---|---|
| Back link | "Quay lại" | `icon/back` 16 + Noto 600 14 `--accent` |
| Header | eyebrow "chủ đề · trình độ"; title "Công việc · B1"; subtitle "24 từ gợi ý. Chọn từ bạn muốn học, hoặc thêm cả chủ đề."; count "22" and caption "từ chưa học · 2 đang học" | Eyebrow JetBrains Mono 500 12 `--muted`; title Bricolage ExtraBold 44 / 30 `--ink` lh 1.1; subtitle Noto 400 16 / 15 `--muted`; count Bricolage ExtraBold 64 (desktop, right-aligned, same row as the title block, items end) / 52 (phone, **below** the title block, left-aligned), `--ink` (not `--fail`), caption mono 12 `--muted` |
| List card `Danh sách từ` | | `--surface`, 1 px `--line`, radius 18, **padding 8**, `Shadow/Card` |
| Select-all row `Chọn tất cả` | "Chọn tất cả 22 từ chưa học"; right: "đã chọn 14" | box + Noto 600 15 `--ink`; "đã chọn N" mono 500 11 `--muted`; padding 16/12; unchecked box although 14 are selected (no indeterminate drawn). Phone: label wraps to two lines |
| Rows (8 drawn of 24) | see table | Row padding 16/12, radius 12, gap 16, top border `--line`; selected bg rgba(30,58,138,.05) (raw) + checked box; word Bricolage Bold 19 `--ink` + POS mono 500 11 `--muted` on the same baseline (gap 8); meaning Noto 400 14.5 `--muted` below (gap 2) |
| Footer | text button "Xem thêm 16 từ" | `Nút chữ` Thường, padding 12 16 4 (8 + 16 = 24 words total) |
| Floating bar `Thanh nổi` | "thêm vào" + select showing "Nhóm mới “Công việc · B1”" + primary button "Thêm 14 từ đã chọn" with arrow | `--surface`, 1 px `--line`, `radius/modal` 16, `Shadow/Pop`; label mono 500 12 `--muted`; select = `--surface`, 1 px `--line`, radius 10, padding 12/8, Noto 600 14 `--ink`, `icon/down` 16, gap 8; button = `Nút` primary with arrow icon `Mũi tên` 16. Desktop: one row, padding 8 8 8 20, gap 16. Phone: column, gap 16, padding 16/12, the button is full width, the select row is [label, select] |

| Word | POS | Meaning | State |
|---|---|---|---|
| schedule | noun, verb | lịch trình; lên lịch | selected |
| deadline | noun | hạn chót | disabled, "đang học · Đề 12 · Writing", dot #e5603f |
| budget | noun | ngân sách | unselected |
| contract | noun | hợp đồng | selected |
| candidate | noun | ứng viên | disabled, "đang học · Đề 14 · Reading", dot #7a55d3 |
| profit | noun | lợi nhuận | unselected |
| negotiate | verb | đàm phán | selected |
| colleague | noun | đồng nghiệp | selected |

Disabled row (word already learned in a group): checkbox opacity 40%, word and meaning opacity 50%, and a label "đang học · <group name>" with a 9 px square dot (radius 3) in that group's colour; label Noto 400 13 `--muted`, not faded. Desktop: label right-aligned on the row; phone: label below the meaning (inside the row). Rows with these labels cannot be selected (checkbox is the disabled look; behaviour is inferred from the look, not annotated in Figma).

Counts: 24 suggested = 22 "chưa học" + 2 "đang học"; the page count (22) is the number of selectable words, the select-all says "Chọn tất cả 22 từ chưa học" (it should not select disabled rows). "đã chọn 14" appears while only 4 selected rows are visible in the 8 shown (rest are behind "Xem thêm 16 từ").
Topic list, grid, search, how topics are listed or filtered by level: **not in these frames.** The group choice list (options in the select besides "Nhóm mới “Công việc · B1”") is not drawn. Empty (all learned) state: not drawn.

## 4. Nearest drawn confirm: "Xóa tài khoản" `121:4597` (desktop 400 wide) and `121:4689` (phone 358 wide)

It is an inline card in the page, not an overlay. There is no backdrop, no close button and no Hủy button. Page: back link "Cài đặt", title "Xóa tài khoản"; desktop two columns (confirm 400 wide at left, "Bị xóa và còn giữ" 540 wide at right, gap 20, total 960); phone: info card first, then confirm card (order reversed relative to desktop).

Confirm card:
- Container: `--surface`, 1 px `--line`, radius `radius/xl` 20, padding 24, vertical gap 16, `Shadow/Card`.
- Title "Xác nhận xóa": Bricolage Bold 20 `--ink`.
- Warning `Cảnh báo`: fill `--fail-soft` #f8e7e5, radius 14, padding 16, gap 8; `icon/alert` 18 + text "Thời gian Pro còn lại sẽ mất, không hoàn tiền." Noto 600 14.5, colour `--fail`.
- Check row: `Ô chọn nhỏ` (checked, `--accent`) + "Tôi hiểu dữ liệu sẽ mất và không khôi phục được" Noto 400 15 `--ink`, gap 12.
- Field "Gõ lại email của bạn" (label Noto 600 14 `--ink`, gap 6, input height 44, `--surface`, 1.5 px `--line`, radius 12, padding 16, text Noto 400 15) showing "lan.nguyen@gmail.com".
- Field "Mật khẩu": same, **focused state drawn**: border 1.5 px `--accent` + ring 0 0 0 3 px #e7ecf8 (`--accent-soft`), text "••••••••••", `icon/eye` 18.
- Button "Xóa vĩnh viễn": same shape as `Nút` primary (radius `radius/button`, padding 20/12, `Body/Button` 15/600 white) but fill `--fail` and glow 0 10 12 rgba(184,54,41,.3) (raw). Left-aligned, hugs content (138 wide), not full width; on the phone also hugs content.
- Variants of `Nút chữ`: Thường (`--accent`), Xóa (`--fail`); the component description also lists Phụ (grey, "Hủy", "Để sau") and says on a phone the tap area must be at least 44 px.
- Overlay modal tokens that do exist in the file: `radius/modal` 16 and `Shadow/Pop`, both used by the floating bars above. Use these plus the confirm card content for group delete dialogs; add a "Hủy" as `Nút chữ` Phụ (not drawn).

## Components needed (deduplicated)

| Piece | Used in frames |
|---|---|
| `Nền app/Lưới chấm` (Desktop / Mobile) page background with halos | all six |
| `Quầng màu nhóm` (group-colour glow behind the header) | Một nhóm |
| `Thanh trên app` (Desktop / Mobile), tab "Nhóm" active | all six |
| `Thanh tab dưới` (phone bottom tabs, "Nhóm" active) | Một nhóm, Từ tồn đọng, Chủ đề (phone) |
| `Nút lịch nổi` (Lớn / Nhỏ) | Một nhóm, Từ tồn đọng and Chủ đề (desktop only in the last two) |
| Back link (`icon/back` + navy text; 18/15 in Một nhóm, 16/14 elsewhere) | all six |
| `Nút` (primary and secondary; fixed 148 / 119 width in Một nhóm; with arrow in Chủ đề bar; red variant in confirm) | Một nhóm, Từ tồn đọng, Chủ đề, confirm |
| `Nút chữ` (Thường navy, Xóa red, Phụ grey) | Từ tồn đọng, Chủ đề |
| `Thẻ nhóm (từ băng chuyền)` (group card with two cards behind) | Một nhóm |
| Group colour square + title row | Một nhóm |
| Today chips (ưu tiên / đến hạn / mới) | Một nhóm |
| `Nhịp ôn` stage bar (six proportional segments, partial fill, labels on desktop) | Một nhóm |
| `Lọc từ` filter chips (active / inactive, count in mono; wrap on desktop, scroll on phone) | Một nhóm |
| Word row, group page (desktop 5-column / phone 2-line; stage dot + status label) | Một nhóm |
| `Ô chọn nhỏ` checkbox (checked, unchecked, disabled 40%) | Từ tồn đọng, Chủ đề, confirm |
| List card `Danh sách từ` (radius 18, `Shadow/Card`, padding 24 or 8) | Từ tồn đọng, Chủ đề |
| Word row, selectable (overdue bar + days; or POS + meaning + "đang học · group" label with group-colour dot) | Từ tồn đọng, Chủ đề |
| Column header row / select-all row | Từ tồn đọng, Chủ đề |
| Big count number block (96 red / 64 ink, mono caption) | Từ tồn đọng, Chủ đề |
| `Thanh nổi` floating action bar (desktop row / phone column; `radius/modal`, `Shadow/Pop`) | Từ tồn đọng, Chủ đề |
| Group select (`Chọn nhóm`: label "thêm vào" + select with `icon/down`) | Chủ đề |
| Confirm card (title, warning block, check row, labelled inputs with focus ring, red button) | Xóa tài khoản (model for group dialogs) |
| Load-more footer ("Xem thêm N từ", with "đang có 6 / 18 từ" in Từ tồn đọng) | Một nhóm (link), Từ tồn đọng, Chủ đề |

## Copy (flat list; D = desktop, P = phone; "same" = identical)

Một nhóm: "Nhóm của bạn"; "48 từ · 12 đã thuộc" (card); "Đề 12 · Writing"; "24"; "thẻ chờ"; "tiếp theo"; "mitigate"; "48 từ · tạo ngày 12/10/2026 · 12 đã thuộc"; "4 ưu tiên"; "14 đến hạn"; "6 mới"; D only under the bar: "6 Mới", "9 1 ngày", "10 3 ngày", "11 7 ngày", "8 14 ngày", "4 30 ngày"; "Học"; "Ôn"; "Thêm từ"; "Toàn bộ 48 từ"; "Tất cả 48"; "Ưu tiên 4"; "Đến hạn 14"; "Mới 6"; "Ngăn 1 ngày 9"; "Ngăn 3 ngày 10"; "Ngăn 7 ngày 11"; "Ngăn 14 ngày 8"; "Ngăn 30 ngày 4"; words and meanings: mitigate giảm nhẹ, allocate phân bổ, substantial đáng kể, inevitable không tránh được, viable khả thi; D only: "verb", "adjective", "Ngăn 1 ngày", "Ngăn Mới", "Ngăn 3 ngày"; status: "ưu tiên", "từ mới", "cần ôn hôm nay"; "Xem thêm từ · còn 43 từ"; calendar button "T11", "8", "6".

Từ tồn đọng: "Nhóm Đề 9 · Listening"; "Từ lâu chưa ôn"; "18 từ trong Đề 9 · Listening đã quá hạn hơn 60 ngày."; "18"; "từ quá hạn"; the paragraph "Từ ở ngăn 1 trở lên mà quá hạn hơn 60 ngày sẽ rời phần cần ôn, để việc ôn mỗi ngày không dồn quá dài. Học lại: về ngăn Mới, tính như từ mới hôm nay. Bỏ khỏi việc học: rời mọi nhóm, không còn hẹn ôn. Để đó: không làm gì; Wordmet không bao giờ tự xóa từ."; column headers "từ", D only "nghĩa", "quá hạn"; rows allocate phân bổ 74 ngày, mitigate giảm nhẹ 68 ngày, scrutiny sự xem xét kỹ 66 ngày, prevalent phổ biến 63 ngày, viable khả thi 61 ngày, coherent mạch lạc 61 ngày (meanings D only); "đang có 6 / 18 từ"; "Xem thêm 12 từ"; bar: "Đã chọn 3 từ", "Bỏ khỏi việc học", "Học lại 3 từ". Differences: P has no "nghĩa" column, no meaning, no overdue bar; P bar is two-row; P frame has no calendar button.

Chủ đề: "Quay lại"; "chủ đề · trình độ"; "Công việc · B1"; "24 từ gợi ý. Chọn từ bạn muốn học, hoặc thêm cả chủ đề."; "22"; "từ chưa học · 2 đang học"; "Chọn tất cả 22 từ chưa học"; "đã chọn 14"; rows schedule (noun, verb) lịch trình; lên lịch / deadline (noun) hạn chót / budget (noun) ngân sách / contract (noun) hợp đồng / candidate (noun) ứng viên / profit (noun) lợi nhuận / negotiate (verb) đàm phán / colleague (noun) đồng nghiệp; "đang học · Đề 12 · Writing"; "đang học · Đề 14 · Reading"; "Xem thêm 16 từ"; bar: "thêm vào", "Nhóm mới “Công việc · B1”" (curly quotes), "Thêm 14 từ đã chọn". Differences: P puts the count "22" under the title, the "đang học" label under the meaning, and stacks the bar.

Xóa tài khoản confirm (model): "Xác nhận xóa"; "Thời gian Pro còn lại sẽ mất, không hoàn tiền."; "Tôi hiểu dữ liệu sẽ mất và không khôi phục được"; "Gõ lại email của bạn"; "lan.nguyen@gmail.com"; "Mật khẩu"; "••••••••••"; "Xóa vĩnh viễn". Page: "Cài đặt"; "Xóa tài khoản". Info card: "Những gì bị xóa" (x: "Dữ liệu học: nhóm, lịch ôn, lịch sử trả lời", "Từ riêng và câu bạn tự viết", "Gói của bạn", "Mọi phiên đăng nhập"); "Những gì còn được giữ" (·: "Hồ sơ thanh toán 10 năm, không kèm tên bạn", "Báo lỗi bạn đã gửi, không kèm tên", "Số lượt đã dùng, không kèm tên bạn", "Số liệu tổng hợp, không nhận ra bạn").

## Not verified / not read

- No 1280 or tablet frame was read; responsive behaviour between 390 and 1440 is not drawn.
- Meaning of the stage-bar fill in Một nhóm is an inference (see above).
- `Shadow/Row` is listed as a style in the frames but no row node in the code shows it; apply only if the row looks flat next to the screenshot.
- The `Thanh nổi` vertical position is absolute in the frame (top 809 desktop; 658 / 638 phone): in code it should be `position: fixed` at the bottom with the safe offset above the tab bar; Figma gives no spec for it.
- A real modal (overlay) confirm was not searched for beyond the frames named in the brief.
- Screenshots were compared with the code by eye only; no pixel diff.
