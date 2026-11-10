# Figma facts for M4 (lookup page, one-word page), 10/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`). Read-only (`get_metadata`, `get_screenshot`,
`get_design_context`, `get_variable_defs`); nothing was written to Figma or to the repo except this file.
Copy is exact Vietnamese from the frames. "raw" = value read from the node, not bound to a Figma variable or named text style.

Notes on the method:
- The skill `figma-design-to-code` could not be loaded in this session (unknown skill); `get_design_context` was still used, with
  `excludeScreenshot`, and its output parsed. Its output carries font family/weight/size but **not** the text style name, so a size
  shown as "raw" may still be a named style in Figma. Named styles are only those listed by `get_variable_defs` (section 0).
- Fonts in these frames are the "JetBrains Mono (hiện tại)" variant. A trial frame set "Thử font nhãn: JetBrains Mono và Noto Sans
  (09/11/2026)" (`156:4349`) holds the same Tra từ and Trang một từ phone screens with Noto Sans labels (`156:5268` vs `156:5560`,
  `156:4788` vs `156:5028`). I did not read which one the owner picked. **Unresolved.**

## 0. Shared tokens (from `get_variable_defs` on `85:3218` and `118:4413`)

Colour variables: `--bg #f6f7fa`, `--ink #1b2444`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--muted #525a78`, `--line #e1e5ee`,
`--surface #ffffff`, `--ghost #c9cedc`, `--mark #ffd84a`, `--mark-ink #1b2444`, `--pass #1b7a46`, `--on-accent #ffffff`.
Also referenced with fallback in code: `--fail #b8352a` (Nút chữ "Xóa"), `--fail-soft #f8e7e5` (Chip từ "Cần ôn").
Radius variables: `radius/md 10`, `radius/button 10`, `radius/pill 999`.
Effects: `Shadow/Card` = drop 0 1 2 #1B24440F + 0 10 28 -14 #1B244433; `Shadow/Pop` = 0 2 6 #1B244414 + 0 24 56 -24 #1B244457;
`Glass/Header` = background blur 24 (top bar code uses `backdrop-blur 12`, bg `rgba(255,255,255,0.62)`, bottom border `rgba(221,225,234,0.8)`).

Named text styles used: `Display/Logo` (Bricolage Grotesque ExtraBold 22 / 1.2 / -1), `Body/Base` (Noto Sans Regular 16 / 1.6),
`Body/Base strong` (SemiBold 16 / 1.6), `Body/Small` (Regular 14 / 1.5), `Body/Small strong` (SemiBold 14 / 1.5),
`Body/Button` (SemiBold 15 / 1.4), `Body/Label` (SemiBold 13 / 1.4).
Everything else below (Bricolage Grotesque display sizes, JetBrains Mono labels, Noto Sans Italic) is raw.

Fonts: Bricolage Grotesque (ExtraBold, Bold), Noto Sans (Regular, Italic, SemiBold), JetBrains Mono (Medium, Bold).

Raw colours seen in these frames: paper `#fbfaf6` (border and letter rules `#e8e4d8`); group cover colours `#e5603f`, `#2a86d1`, `#d99a17`,
`#149384`, `#7a55d3`, `#64708c` (raw; note says 8 cover colours exist, only these 6 appear); stage dots `Mới #9aa3b1`, `1 ngày #c07a45`,
`3 ngày #98a2b0`, 7/14/30 unfilled = `--line`; the lifted card's "Công việc" topic dot `#d4a72c`.
Chip ngăn palette (component `54:656`, description "Mỗi ngăn một màu hạng ... Chỉ để mã hoá ngăn."): Mới bg `#eef0f4` text `#525a78`;
1 ngày `#f7e8dc` / `#7c4a28`; 3 ngày `#edf0f4` / `#4d5664`; 7 ngày `#fbf0c8` / `#6f5208`; 14 ngày `#dcf3ea` / `#0c654c`;
30 ngày pastel 4-stop gradient / `#3b2f6b`.

Common chrome on all four frames:
- Background: instance "Nền lưới chấm" (component "Nền app/Lưới chấm — Desktop" `95:315` / "— Mobile" `95:321`): 20 px dot grid fading to the edges,
  navy glow top-left, yellow glow bottom-right (fixed colours, no Dark).
- Top bar desktop: instance "Thanh trên app/Desktop" (component set `54:502`, variant `Tab=Tra từ`), 64 px high. Left to right: logo "wordmet." (`Display/Logo`),
  tabs "Hôm nay", "Nhóm", "Luyện tập", "Tra từ" (icon 16 + `Body/Button`-like 15 SemiBold; active tab bg `--accent-soft`, text `--accent`, radius 8),
  spacer, search box "Ô tìm" 260x38 (bg `--bg`, border `--line`, radius `radius/md`, icon 16, placeholder **"Tìm từ"** Noto Sans 14 `--muted`, key hint **"/"**),
  primary button **"Thêm từ"** with plus icon and key hint **"N"** (bg `--accent`, `--on-accent` text 15 SemiBold), plan label **"Pro"** (13 SemiBold `--muted`,
  pill radius), avatar circle 36 with gradient `#1e3a8a` to `#3d78ff` and letter **"L"**. **No level select in the top bar.**
- Top bar mobile: instance "Thanh trên app/Mobile" (`54:503`), 56 px: logo, "Nút tìm" 40x40 (magnifier icon 20), avatar 36 "L", strip "Bóng dưới" 18 px under the bar.
- Mobile bottom: instance "Thanh tab dưới" (`54:637`, variant `Tab=Tra từ`), 72 px: "Hôm nay", "Nhóm", "Luyện tập", "Tra từ" (active: pill bg `--accent-soft`).
- Floating calendar button: instance "Nút lịch nổi" (`95:343`; desktop `Kích thước=Lớn` 62x66, phone `Nhỏ` 54x58) bottom-right: month strip "T11", day "8", streak badge "6".
  It sits above the bottom tab bar on phone.

---

## 1. Tra từ "Từ hóa thẻ" — desktop `85:3218` (1440 x 1679.5), phone `85:3667` (390 x 2082.5)

Design note on the owner's intent (Figma page "App người học" note `85:5553`, owner 08/11/2026, round 7): *Tra từ là "Từ hóa thẻ": ô tìm nổi bật, câu bộ lọc,
trang từ điển một cột, mục đang chọn nhấc lên thành thẻ, thêm vào nhóm bằng cách bấm chồng của nhóm.* Artifact referenced there:
`https://claude.ai/artifact/6z635GjwYNpctydnMoNHJD`. So adding a word is **a click on a group stack**, even though the Figma labels say "Thả vào ..." / "Thả vào chồng để thêm".

### 1.1 Layout

Desktop: content frame "Nội dung" x140 y88, width 1160 (page 1440, so 140 each side). Vertical gap 24 between "Tìm và lọc" (h134) and "Trang và thẻ".
"Trang và thẻ": two columns, gap 36: left "Trang từ điển" 744 wide, right "Cột phải" 380 wide (right column gap 20).
Order inside the right column: lifted card, heading "Thả vào chồng để thêm", 3x2 grid of group stacks, link "Nhóm khác hoặc tạo nhóm mới", link "Mở trang từ →".

Phone: content x16, width 358, y70. Single column order: "Tìm và lọc", then **the right column first** (lifted card, "Thả vào chồng để thêm", stacks, two links), then "Trang từ điển" (so the dictionary page is
**below** the card and stacks), then bottom tab bar. Page height 2082.5 holds the cut-off first page (entries budget to invoice only).

**Where the search input lives:** on the page, as the large highlighted box "Ô tìm (nổi bật)" at the top of the content. The top bar also has its own small "Tìm từ" box with "/" (desktop) or a magnifier button (phone).
**Level filter:** not a control. It is a sentence of underlined accent links (section 1.2). No separate level select, no topic select drawn.
**Result area:** the "Trang từ điển" page (alphabetical list, letter headers, one page, "Trang sau →") plus the lifted card of the selected entry.

### 1.2 Blocks, top to bottom

**A. "Ô tìm (nổi bật)"** (`85:3270` desktop / `85:3680` phone): height 60 (phone 52), full width, bg `--surface`, **2 px border `--accent` (`#1e3a8a`)**, radius 16, shadow `0 18 36 -24 rgba(27,36,68,.35)` (raw),
padding left 20 right 16, gap 12. Search icon "Icon look" 22 px. Placeholder **"Tìm từ, ví dụ: mitigate"** Noto Sans Regular 18 (phone 16) `--muted`. Key hint box **"/"**: bg `--bg`, border `--line`, radius 5, padding 6, JetBrains Mono Bold 11 `--ink`.
This is the focused-looking state; no typed-text or empty-hint variant is drawn.

**B. Filter sentence** (`85:3277`): Noto Sans Regular 19 (phone 16) `--ink`: **"24 từ trình độ B1, chủ đề Công việc, loại từ tất cả."** The three words "B1", "Công việc", "tất cả" are SemiBold `--accent`, underlined (in-sentence links, per Nút chữ rule that in-sentence links stay underlined). Meaning: count, level, topic, part of speech; each is a clickable filter value. The sentence wraps on phone (the last word "tất cả." goes to line 2).

**C. "Công cụ" row** (`85:3278`, gap 8/20, wraps):
1. Checkbox 14x14 (bg `--surface`, 1.5 px `--ghost`, radius 3) + **"chỉ từ của tôi"** (JetBrains Mono Medium 12 `--muted`). This filters to the learner's own words.
2. **"Thêm cả loạt vào nhóm"** (Noto Sans SemiBold 14 `--accent`, plain text, not an underlined link, not a "Nút chữ" instance).
3. **"Xóa lọc"** (SemiBold 14 `--muted`). On phone "Xóa lọc" wraps to its own line under the first two.

**D. "Trang từ điển"** (`85:3285` / `85:3794`): a paper page. bg `#fbfaf6` (raw), 1 px border `#e8e4d8`, **radius TL 4, TR 10, BR 10, BL 4**, shadow `0 24 48 -28 rgba(27,36,68,.45)` (raw),
padding top 32, right 52, bottom 40, left 44 (desktop); width 744 (phone 358, padding about 21). Gap 4 between entries.
- Running header ("Tiêu đề chạy", bottom border 1.5? px `--ink`): first word, **"trang 1"** (JetBrains Mono Medium 11 `--muted`), last word of the page. Words in Bricolage ExtraBold 18 (phone 14) `--ink`.
  Desktop: **"budget"** ... **"stakeholder"**. Phone: **"budget"** ... **"invoice"**.
- Letter header "Vần B" (letter Bricolage ExtraBold 18 `--muted` + 1 px hairline `#e8e4d8` filling the rest). Letters drawn: B, C, D, I, N, P, S (desktop); B, C, D, I (phone).
- Entry ("Mục <word>") per word, padding 12 x 8, radius 8, gap 2:
  - Line 1: headword Bricolage ExtraBold **21**, line-height 1.3, tracking -0.315, `--ink`; IPA Noto Sans Regular 14 `--muted` (one IPA only, e.g. "/ˈbʌdʒ.ɪt/"); POS Noto Sans **Italic** 14 `--muted` ("n.", "v.", "n., v."); level JetBrains Mono Bold (size not emitted, about 11) `--muted` ("B1"); on the learner's own word an extra JetBrains Mono Medium tag **"của tôi"** in `--accent` after the level.
  - Line 2: sense number JetBrains Mono Bold 11 `--muted` ("1") + Vietnamese meaning Noto Sans Regular `--ink` (ends with a full stop: "ngân sách."). Only the first sense is shown.
  - Line 3: example sentence, Noto Sans **Italic** `--muted`, line-height 1.55, with the target form highlighted: bg `--mark`, text `--mark-ink` (Regular, not italic), padding x 3, radius 3. The highlight is the inflected form found in the sentence ("candidates", "negotiated", "scheduled").
- Selected entry ("Mục deadline", in section D): ghost placeholder, bg `rgba(27,36,68,0.03)`, 1.5 px **dashed** border `rgba(27,36,68,0.25)`, text greyed (the word "left a hole" because its card was lifted). So the selected row stays in the list as a dashed ghost.
- Footer ("Chân trang"): JetBrains Mono Medium 12 **"— 1 —"** `--muted` left, JetBrains Mono Bold 12 **"Trang sau →"** `--accent` right. Pagination is by page, not infinite scroll.

Entries, desktop (all level B1; number of senses shown is 1, only first sense):

| word | IPA | POS | meaning | example (highlight in bold) |
|---|---|---|---|---|
| budget | /ˈbʌdʒ.ɪt/ | n. | ngân sách. | We have to stay within the **budget** this year. |
| candidate | /ˈkæn.dɪ.dət/ | n. | ứng viên. | There are three **candidates** for the job. |
| colleague | /ˈkɒl.iːɡ/ | n. | đồng nghiệp. | I had lunch with a **colleague** from sales. |
| contract | /ˈkɒn.trækt/ | n. | hợp đồng. | She signed a two-year **contract** with the firm. |
| deadline (ghost, selected) | /ˈded.laɪn/ | n. | hạn chót. | The **deadline** for applications is 30 June. |
| invoice | /ˈɪn.vɔɪs/ | n. | hóa đơn. | Please send the **invoice** by Friday. |
| negotiate | /nəˈɡəʊ.ʃi.eɪt/ | v. | đàm phán. | They **negotiated** a lower price with the supplier. |
| profit | /ˈprɒf.ɪt/ | n. | lợi nhuận. | The company made a small **profit** last year. |
| schedule | /ˈʃedʒ.uːl/ | n., v. | lịch trình; lên lịch. | The meeting is **scheduled** for Monday morning. |
| stakeholder (own word, "của tôi") | /ˈsteɪkˌhəʊl.dər/ | n. | bên liên quan. | Every **stakeholder** gets a copy of the report. |

Phone shows only budget, candidate, colleague, contract (sentence wraps to 2 lines, "firm." on line 2), deadline (ghost), invoice.
Letters in desktop: B budget; C candidate, colleague, contract; D deadline; I invoice; N negotiate; P profit; S schedule, stakeholder.

**E. Lifted card "Thẻ nhấc lên"** (`85:3568` / `85:3695`, 380 x 360, phone 358 x 320). Two stacked layers:
- "Thẻ sau (invoice)": a blurred (blur 2), 70% opacity white card behind, rotated +1 deg, radius 22, 1 px `--line`. It is the next entry peeking behind (named "invoice" in the layer, no text).
- "Thẻ deadline": bg `--surface`, 1 px `--line`, radius 22, padding 24, **rotated -1.5 deg**, shadow `0 30 60 -30 rgba(27,36,68,.55)` (raw; close to but not equal to `Shadow/Pop`), content gap 12. Content top to bottom:
  1. Row: **"n. · B1 · Công việc"** (JetBrains Mono Medium 12 `--muted`) and a round speaker button 30x30 (bg `--bg`, 1 px `--line`, radius 15, icon "Icon say" 16). This is **not** the "Nút loa" component (that one has bg `--accent-soft`); here a custom button.
  2. Headword **"deadline"** Bricolage ExtraBold 40, line-height 1.1, tracking -0.84, `--ink`.
  3. Two pronunciations in a row (gap 16): **"UK" "/ˈded.laɪn/"** + speaker button 28 and **"US" "/ˈded.laɪn/"** + speaker button 28. Label JetBrains Mono Bold 11 `--muted`, IPA Noto Sans Regular 15 `--muted`, button bg `--bg` 1 px `--line` radius 14, icon 14.
  4. Meaning **"hạn chót"** Bricolage Grotesque Bold 22 `--ink`.
  5. Top-bordered block (1 px `--line`, padding top 12): example sentence **"The deadline for applications is 30 June."** Noto Sans Regular 15, leading 1.55, `--ink`, target word highlighted (`--mark`).
  6. Footer: 10x10 square (radius 3, `#d4a72c`) + **"Công việc · B1 · ngăn 7 ngày"** (Noto Sans Regular 13 `--muted`). Reading: the word is already in the learner's group "Công việc · B1", at the 7-day stage. This is the only "already learning" indicator on the card; there is no "Bạn đang học" panel here (that is on the word page).
  There is no add button, no Sửa/Xóa, no "Câu đã gặp" block, no related words on this card.

**F. Heading "Thả vào chồng để thêm"**: Bricolage Grotesque Bold 16 `--ink`, at y 380 (phone 340).

**G. "Chồng của các nhóm"** (`85:3618` / `85:3745`): 3 columns x 2 rows of group stacks; each stack = a card + caption below.
Desktop card: 114 x 145, column x at 0 / 133 / 266, rows at y 0 / 195 (caption line below at +157). Phone card: 107 x 136, columns at 0 / 125.5 / 251, rows 0 / 186.
Card: bg `--surface`, **2 px border in the group's cover colour**, radius 12.277 (raw), shadow `0 12.277 22.8 -14.9 rgba(27,36,68,.4)` (raw), padding about 9.6 x 10 x 8.8, gap 2.6. It is a scaled copy (about 0.55) of the "Thẻ nhóm" card used on the Nhóm page.
Card content: group name Bricolage ExtraBold (size not emitted; line box 38 for 2 lines at leading 1.08, so about 17.6), `--ink`, tracking -0.3775, 2-line wrap; below, either **"<n> thẻ chờ"** (n in Bricolage ExtraBold, number colour = group colour; "thẻ chờ" Noto Sans SemiBold about 9) or **"✓ Xong hôm nay"** (SemiBold, `--pass`) or **"Chưa có từ"** (SemiBold, `--muted`).
Caption under each card, Noto Sans Regular 12 `--muted`: **"+ thêm vào đây"**, or for a group that already has the word **"✓ đã có"** (SemiBold 12 `--pass`).

| stack (cover colour) | card text | caption |
|---|---|---|
| Đề 12 · Writing (`#e5603f`) | 24 thẻ chờ | + thêm vào đây |
| Công việc · B1 (`#2a86d1`, drawn faded) | ✓ Xong hôm nay | **✓ đã có** (word already in this group) |
| Từ gặp ngoài đời (`#d99a17`) | 6 thẻ chờ | + thêm vào đây |
| Đề 9 · Listening (`#149384`) | 18 thẻ chờ | + thêm vào đây |
| Đề 14 · Reading (`#7a55d3`) | 11 thẻ chờ | + thêm vào đây |
| Du lịch Nhật (`#64708c`) | Chưa có từ | + thêm vào đây |

Node names ("Thả vào Đề 12 · Writing", ...) show the interaction: each stack is a drop/click target.

**H. Links** under the stacks: **"Nhóm khác hoặc tạo nhóm mới"** and **"Mở trang từ →"**, Noto Sans SemiBold 14 `--accent` (plain text, not "Nút chữ" instances). "Mở trang từ →" opens the word page (the one-word page, section 2). Position: x0, y 814 / 855 (desktop), 756 / 797 (phone, relative to the right-column frame).

### 1.3 Differences phone vs desktop (Tra từ)
- Page order flips: card and stacks first, dictionary page last (see 1.1).
- Search box 52 high, placeholder 16; filter sentence 16 (desktop 19); "Xóa lọc" on its own line.
- Card width 358 (not 380) and height 320; stacks 107 wide.
- Dictionary running header words 14 (not 18), page width 358; shorter list (ends at "invoice"); the "contract" sentence wraps.
- Top bar is the mobile one (magnifier button instead of the search field), bottom tab bar added, calendar button 54x58.

### 1.4 States drawn / not drawn
Drawn: one state only: search box focused-looking and empty, a filter applied (B1 + Công việc + all POS), one entry selected (dashed ghost + lifted card), one group stack in the "already has the word" state ("✓ đã có"), a group with no words ("Chưa có từ"), a group finished today ("✓ Xong hôm nay"), a learner-owned word tag ("của tôi").
**Not drawn** in either Tra từ frame: typed query, no result, loading, error, "Đã thêm ..." toast or any post-add feedback, "word not found", free-plan limit, pagination page 2, empty filter result. The AI lookup flow lives in a separate overlay (see 4).

---

## 2. Trang một từ — desktop `118:4413` (1440 x 1264), phone `118:4714` (390 x 2375)

Back-link in the page: **"Tra từ"** with `icon/back` (16), Noto Sans SemiBold 14 `--accent`, at y 32 desktop / 20 phone. Top bar tab "Tra từ" stays active.
Word shown: **record** (noun with 2 senses, verb with 1 sense). Design note (`75:3420`): *Trang một từ lấy ý từ Dictionary.com: thẻ đầu mục có phiên âm UK/US và nút loa, tab nhảy trong trang, nghĩa đánh số theo loại từ, câu đã gặp như khối câu có nguồn.* Proposed-but-not-in-code (`75:3421`): "Phiên âm UK/US theo design đợt C (M2), chưa có trên dev."

### 2.1 Layout
Desktop: content frame x140 width 1160, y64. "Lưới" at y71, **two columns, gap 28: "Cột chính" 812 wide and "Cột phải" 320 wide**, main column gap 20, right column gap 16.
The right column holds "Bạn đang học" and "Cùng chủ đề" cards (the topic and level moved here, per brief). Right column is not sticky in the drawing (starts at y 0 of the grid, i.e. aligned with the top of the word title).
Phone: x16 width 358, single column; order: back link, "Từ" head, **"Bạn đang học" card**, tabs, noun block, verb block, "Câu bạn đã gặp" block, **"Cùng chủ đề" card last**.
There is **no search input on the page**; search is only in the top bar (desktop "Tìm từ" + "/", phone magnifier).

### 2.2 Blocks, top to bottom (main column)

**A. Head "Từ"** (`118:4472`, gap 12):
- Title **"record"** Bricolage ExtraBold 84, leading 0.95, tracking -2.94 (phone 56, tracking -1.96), `--ink`.
- "Phát âm và dạng chia" (radius 18 frame, gap 8; phone gap 12):
  - Row per POS (gap 16): label column 76 wide with POS tag **"noun"** / **"verb"** (JetBrains Mono Medium 12 `--accent`), then **two voices**: **"UK"** (Noto Sans Regular 14 `--muted`) + IPA (Noto Sans SemiBold 16, leading 1.6, `--ink`) + instance **"Nút loa"** (28x28 here; bg `--accent-soft`, radius 16, "Icon speaker" 17) and **"US"** likewise.
    - noun: UK **/ˈrek.ɔːd/**, US **/ˈrek.ɚd/**.
    - verb: UK **/rɪˈkɔːd/**, US **/rɪˈkɔːrd/**.
    On phone the label column is 41 wide and the UK and US rows stack vertically (UK above US, 4 px apart).
  - Forms row **"dạng chia"** (label JetBrains Mono Medium 12 `--muted`, 76 wide) then **"record · records · recorded · recording"**: Noto Sans 16, leading 1.6, `--ink`; the headword "record" is SemiBold, the others Regular, the separators "·" `--muted`. On phone the label sits above the forms (gap 4).
  - No level badge, no topic badge, no "Pro"/free marker in the head. Level appears only in the right column ("trình độ A2–B1").
- Speaker buttons play pre-made audio (UK / US), one per pronunciation. There is no word-level single speaker button on this page.

**B. Tabs** (`118:4512`, desktop at y210; phone: wraps to two rows, second row only "Cùng chủ đề"): bottom border 1 px `--line`, gap 24, each tab padding y 12, label Noto Sans SemiBold 15 + optional count (JetBrains Mono Medium 11 `--muted`):
**"Nghĩa" 3** (active: 2 px `--ink` bottom border, text `--ink`), **"Câu đã gặp" 2**, **"Dạng chia"**, **"Cùng chủ đề"** (inactive `--muted`). Per the design note these are jump links within the page (anchor tabs), not routes.
Note: on desktop "Cùng chủ đề" also exists as a right-column card; the tab is the phone-friendly anchor.

**C. Meanings, grouped by POS.** Section heading per POS: **"noun"** (Bricolage Grotesque Bold 22 `--ink`) + **"2 nghĩa"** (JetBrains Mono Medium 12 `--muted`); then a card ("Nghĩa noun"): bg `--surface`, 1 px `--line`, **radius 18, `Shadow/Card`**, padding x 24, y 2; senses separated by 1 px `--line` rules.
Each sense row (padding y 16, gap 16): number (JetBrains Mono Medium 12 `--muted`, 24 wide; phone 18), then a column (gap 6):
- Vietnamese meaning, Bricolage Grotesque Bold 19 `--ink`.
- English definition, Noto Sans Regular 15 (size not emitted, inferred from 20 px line) `--muted`, max about 506 px wide.
- Example sentence, Noto Sans Regular 15 `--ink` with target form highlighted (`--mark` bg, `--mark-ink`, padding x 3, radius 3), followed by a speaker icon "icon/say" 16 (plays the example sentence; plain icon, not a Nút loa).
- Optional text button "N câu đã gặp" (instance "Nút chữ: 2 câu đã gặp", kiểu Thường) when the learner has own sentences for this sense.
- **Stage tag "Ngăn"**: 9x9 colour square (radius 3) + Noto Sans Regular `--ink` text. Desktop: top-right of the row; phone: below the sentence block. The tag is present only for senses the learner is learning. Variants drawn: **"Ngăn 3 ngày · Đề 12 · Writing"** (square `#98a2b0`) and **"Mới · Đề 14 · Reading"** (square `#9aa3b1`).
- For a sense the learner is not learning: instead of the tag there is a "Nút chữ" **"Thêm vào nhóm"** (kiểu Thêm, plus icon), top-right on desktop (x629), under the sentence on phone.

Content:

| POS | # | meaning | definition | example | tag / action |
|---|---|---|---|---|---|
| noun | 1 | bản ghi, hồ sơ | a piece of information or a description of an event that is written down or stored on a computer | Keep a **record** of every new word you meet. | link "2 câu đã gặp"; tag "Ngăn 3 ngày · Đề 12 · Writing" |
| noun | 2 | kỷ lục | the best or fastest ever done, or the highest or lowest level ever reached | She set a new world **record** in the 100 metres. | button "Thêm vào nhóm" |
| verb | 1 | ghi lại, lưu lại | to store sounds or pictures, or to write down information so that it can be used later | Scientists **recorded** a sharp drop in rainfall. | tag "Mới · Đề 14 · Reading" |

**D. "Câu bạn đã gặp" (learner's own sentences)**: heading row: **"Câu bạn đã gặp"** (Bricolage Bold 22), caption **"câu bạn tự ghi khi gặp từ này trong đời"** (JetBrains Mono Medium 12 `--muted`), spacer, and the Nút chữ **"Thêm câu đã gặp"** (kiểu Thêm) right-aligned (phone: caption and button stacked under the heading).
Card (same style as meaning cards) with sentence rows (padding y 16, 1 px `--line` rules), each: sentence Noto Sans Regular 15 with highlight, then a meta line JetBrains Mono Medium (about 11) `--muted`:
- **The company kept no **record** of the meeting.** / **"nghĩa 1 · bản ghi, hồ sơ · ghi ngày 05/11/2026"**
- **Official **records** show that rainfall has dropped since 1990.** / **"nghĩa 1 · bản ghi, hồ sơ · ghi ngày 02/11/2026"**
The meta line carries which sense the sentence is attached to and the date added. **No per-sentence edit or delete control is drawn** (no Sửa / Xóa on these rows).

### 2.3 Right column

**"Bạn đang học"** (`118:4659`): card bg `--surface`, 1 px `--line`, radius 18, `Shadow/Card`, padding 24 (phone 16), gap 8. Content:
- label **"bạn đang học"** (JetBrains Mono Medium 12 `--muted`)
- **"bản ghi, hồ sơ"** (Bricolage Bold 20 `--ink`) = the sense being learned, and POS **"noun"** (JetBrains Mono Medium 12 `--muted`)
- stage bar "Các ngăn": 6 bars (gap 3; each 42.5 x 6 desktop, 51.5 phone, radius 2) with labels below (Noto Sans Regular, `--muted`; current one SemiBold `--ink`): **Mới, 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày**. Passed/current stages are filled with the stage colour (Mới `#9aa3b1`, 1 ngày `#c07a45`, 3 ngày `#98a2b0`), upcoming stages `--line`. Current = "3 ngày".
- rows (each 1 px top rule, padding y 8, label Noto Sans Regular 14 `--muted` left, value right):
  - **"Ôn tiếp"** | **"thứ năm, 13/11"** (SemiBold 14 `--ink`)
  - **"Đề 12 · Writing"** | stage tag **"Ngăn 3 ngày"** (9 px square `#98a2b0`)
  - **"Từ gặp ngoài đời"** | stage tag **"Ngăn 1 ngày"** (square `#c07a45`)
  (so one sense can be in several groups, each at its own stage)
- Nút chữ **"Thêm vào nhóm khác"** (kiểu Thêm).
For the other (not learning) states of this card: not drawn.

**"Cùng chủ đề"** (`159:5092`): same card style (padding 24, gap 16). Header "Đầu": label **"cùng chủ đề"** (JetBrains Mono Medium 12 `--muted`); row: topic name tile **"Công việc"** (bg `--accent-soft`, radius `radius/md` 10, padding x 12 y 2, Bricolage Bold 20 `--accent`), spacer, **"trình độ A2–B1"** (JetBrains Mono Medium 12 `--muted`, right).
Grid 2 columns (gap 6) of word chips (bg `--bg`, radius 10, padding 12 x 8, word Noto Sans SemiBold 14 `--ink` left, level JetBrains Mono Medium 12 `--muted` right; these are plain frames named after the word, **not** instances of "Chip từ"):
schedule A2, deadline B1, invoice B2, budget B1, colleague A2, agenda B2, negotiate B2, revenue B2 (4 rows).
Link at the bottom: **"Xem chủ đề Công việc →"** (Noto Sans SemiBold 14 `--accent`). On the word page, topic and level are shown only here, not in the head.
Phone: same card at the very bottom (padding 17), chips 159 wide.

### 2.4 Differences phone vs desktop (word page)
- Title 56 (not 84); UK/US stacked; "dạng chia" label above the forms.
- "Bạn đang học" moves directly after the head, before the tabs; "Cùng chủ đề" card moves to the end.
- Tabs wrap to 2 rows ("Cùng chủ đề" alone on row 2).
- Sense row number column 18 wide (not 24), meaning column 274 wide; stage tag and "Thêm vào nhóm" move below the sentence; definition wraps to 3 lines.
- "Câu bạn đã gặp" header stacked; sentence rows wrap.
- Bottom tab bar and top bar mobile as in section 0.

### 2.5 States drawn / not drawn
Drawn: a word in which one sense is being learned in several groups, one sense not learned ("Thêm vào nhóm"), one verb sense at "Mới", two learner sentences.
**Not drawn:** a word the learner has no data on (no "Bạn đang học" card variant, probably omitted), the **learner's private word** (no "của tôi" tag on this page, no **Sửa / Xóa từ** actions anywhere on the page; Nút chữ has a "Xóa" variant in the Hệ thống page, red `--fail`, but it is not used here),
loading, "word not found" / 404, empty "Câu bạn đã gặp", toast "Đã thêm ...", the "Dạng chia" tab content (tab exists, its own section is not drawn; forms are in the head), the "Cùng chủ đề" tab target content.

---

## 3. Motion for Tra từ
- Page "Motion" (`2:3`) has only 6 scenes, all for the public pages: `10:349` Cảnh 1 hero, `13:200` Cảnh 2 thẻ bay vào, `13:612` Cảnh 3 đoạn văn đổi màu (hidden), `13:834` Cảnh 4 vệt sáng, `24:427` Cảnh 5 404, `48:423` Cảnh 6 Giá. **No scene for Tra từ or Từ hóa thẻ, nor for the word page.**
- Only motion description for Tra từ is the text note `85:5553` (page "App người học"): *mục đang chọn nhấc lên thành thẻ, thêm vào nhóm bằng cách bấm chồng của nhóm* (see section 1), plus the Nhóm page statement that opening a group fades other parts for about 0.17 s and the card flies up to be the page header (not Tra từ).
  The actual motion is in the owner's artifact `https://claude.ai/artifact/6z635GjwYNpctydnMoNHJD` (not opened here). **ASSUMPTION:** timing, easing and the lift/drop animation live there only.
- Page "Ghi chú" (`2:4`) has no Tra từ-specific motion text; its general line for the app: "Chưa thử motion trên web thật, chưa đo hiệu năng blur và glow."
- Prototype reactions/flows (e.g. "Web Bước 7: 1/2/3" from older notes) are not exposed by `get_metadata`/`get_design_context`; **not checked** for Tra từ.

## 4. Related frames outside this read (names and ids only, not read)
- AI lookup and adding words: "Overlay 1 Thêm từ — Desktop 1440" `73:580` (box `124:4483` "Bạn vừa gặp từ nào?"), mobile `73:966`; "Overlay 4 Kết quả tra bằng AI" desktop `75:1071`, mobile `75:1346` (box `124:4907`);
  "Overlay 5 Chọn nhóm" desktop `75:1548` (box "Lưu vào nhóm" `124:5260`), mobile `75:1849`; "Overlay 2 Thêm câu" `73:1167` / `73:1465` (box "Thêm câu đã gặp"); "Overlay 3 Thêm cả loạt" `73:1701` / `73:1925` (box "Thêm cả loạt vào nhóm", linked from the "Thêm cả loạt vào nhóm" tool on Tra từ);
  "Overlay 6 Giới thiệu Pro" `75:2094` / `75:2373`. The overlays' "Trang phía sau" backdrops reuse Tra từ frames.
- Group page and topic page related to the "Cùng chủ đề" link: "Chủ đề — Desktop 1440" `98:3127`, "Chủ đề — Mobile 390" `98:3297`.
- Font trial frames (unresolved choice): `156:4349`.

## 5. Components needed (deduplicated)

| Component (Figma name, node) | Used by | Notes |
|---|---|---|
| Nền app/Lưới chấm (`95:315` desktop, `95:321` mobile), instance "Nền lưới chấm" | all four frames | dot grid + navy and yellow glows, fixed colours |
| Thanh trên app/Desktop (`54:502`, `Tab=Tra từ`) | Tra từ D, Word D | glass bar; search box "Tìm từ" + "/", "Thêm từ" + "N", "Pro", avatar "L"; no level select |
| Thanh trên app/Mobile (`54:503`) | Tra từ P, Word P | logo, magnifier button 40, avatar 36, bottom shadow strip |
| Thanh tab dưới (`54:637`, `Tab=Tra từ`) | Tra từ P, Word P | 4 tabs, 72 high |
| Nút lịch nổi (`95:343`; Lớn 62x66 desktop, Nhỏ 54x58 phone) | all four frames | calendar + streak badge |
| Nút loa (`54:657`, 32 base, used at 28) | Word D, Word P (4 per page) | bg `--accent-soft`, "Icon speaker" 17 |
| Nút chữ (`166:326`, Kiểu = Thêm / Thường / Phụ / Xóa) | Word D, Word P: "2 câu đã gặp" (Thường), "Thêm vào nhóm", "Thêm câu đã gặp", "Thêm vào nhóm khác" (Thêm) | text button, Noto Sans SemiBold 14, no underline; Tra từ's text links are plain text, not instances |
| Chip ngăn (`54:656`, Ngăn = Mới / 1 ngày / 3 ngày / 7 ngày / 14 ngày / 30 ngày) | not instanced in these frames; the stage tag and stage bar are drawn by hand (9 px square + text, 6 bars) | tokens above; component description: only to encode stage |
| Chip từ (`96:322`, Kiểu = Thường / Cần ôn) | not instanced here; word chips in "Cùng chủ đề" are plain frames (bg `--bg`, radius 10) | listed because the brief named it |
| Nút (`3:12`) Chính/Phụ | top bar "Thêm từ" only (inside Thanh trên app) | not drawn in the page bodies |
| Ô tìm nổi bật (no component; custom frame `85:3270`) | Tra từ D, Tra từ P | needs a new component: 2 px `--accent` border, radius 16, "/" key hint |
| Trang từ điển (no component; custom frame `85:3285`) | Tra từ | paper page: running header, letter rules, entries, footer "Trang sau →" |
| Thẻ nhấc lên (no component) | Tra từ | rotated -1.5 deg card with rotated +1 deg blurred card behind; Shadow close to Pop (raw) |
| Thẻ nhóm / stack (scaled copy of the Nhóm page card; no component in "Hệ thống") | Tra từ | 6 per page; border = group cover colour; caption states "+ thêm vào đây" / "✓ đã có" |
| Card "Bạn đang học" (no component) | Word D, Word P | stage bar, 3 rows, "Thêm vào nhóm khác" |
| Card "Cùng chủ đề" (no component) | Word D, Word P | topic tile + level range + 2-col chips + link |
| Sense card (Nghĩa noun/verb), "Câu đã gặp" card (no component) | Word D, Word P | `Shadow/Card`, radius 18, rules `--line`; highlighted target word span `--mark` |
| Tab row (no component; "Tab Nghĩa", "Tab Câu đã gặp", ...) | Word D, Word P | 2 px `--ink` underline for active, count in mono 11 |
| Icons | Icon look (22 search, 20 top bar), Icon say / icon/say (16 speaker), Icon speaker (17), icon/back (16), icon plus (16, Nút chữ Thêm), icon/lửa (calendar badge), Icon today / groups / practice / lookup (top bar) | exported as SVG assets in `get_design_context` |

## 6. Copy (flat list; D = desktop only, P = phone only, both unless marked)

Top bar: "Hôm nay", "Nhóm", "Luyện tập", "Tra từ", "Tìm từ" (D), "/", "Thêm từ" (D), "N" (D), "Pro" (D), "L"; bottom tabs (P): "Hôm nay", "Nhóm", "Luyện tập", "Tra từ"; calendar button: "T11", "8", "6".

Tra từ:
"Tìm từ, ví dụ: mitigate" / "/" / "24 từ trình độ B1, chủ đề Công việc, loại từ tất cả." / "chỉ từ của tôi" / "Thêm cả loạt vào nhóm" / "Xóa lọc" /
"budget" "trang 1" "stakeholder" (D) | "budget" "trang 1" "invoice" (P) / letters "B", "C", "D", "I", "N" (D), "P" (D), "S" (D) /
entries as in the table (section 1.2 D) with tag "của tôi" on stakeholder (D only) / "— 1 —" / "Trang sau →" /
card: "n. · B1 · Công việc" / "deadline" / "UK" "/ˈded.laɪn/" "US" "/ˈded.laɪn/" / "hạn chót" / "The deadline for applications is 30 June." / "Công việc · B1 · ngăn 7 ngày" /
"Thả vào chồng để thêm" / "Đề 12 · Writing" "24" "thẻ chờ" "+ thêm vào đây" / "Công việc · B1" "✓ Xong hôm nay" "✓ đã có" / "Từ gặp ngoài đời" "6" "thẻ chờ" "+ thêm vào đây" /
"Đề 9 · Listening" "18" "thẻ chờ" "+ thêm vào đây" / "Đề 14 · Reading" "11" "thẻ chờ" "+ thêm vào đây" / "Du lịch Nhật" "Chưa có từ" "+ thêm vào đây" /
"Nhóm khác hoặc tạo nhóm mới" / "Mở trang từ →".

Trang một từ:
"Tra từ" (back link) / "record" / "noun" "UK" "/ˈrek.ɔːd/" "US" "/ˈrek.ɚd/" / "verb" "UK" "/rɪˈkɔːd/" "US" "/rɪˈkɔːrd/" / "dạng chia" "record · records · recorded · recording" /
tabs "Nghĩa" 3, "Câu đã gặp" 2, "Dạng chia", "Cùng chủ đề" /
"noun" "2 nghĩa" / "1" "bản ghi, hồ sơ" "a piece of information or a description of an event that is written down or stored on a computer" "Keep a record of every new word you meet." "2 câu đã gặp" "Ngăn 3 ngày · Đề 12 · Writing" /
"2" "kỷ lục" "the best or fastest ever done, or the highest or lowest level ever reached" "She set a new world record in the 100 metres." "Thêm vào nhóm" /
"verb" "1 nghĩa" / "1" "ghi lại, lưu lại" "to store sounds or pictures, or to write down information so that it can be used later" "Scientists recorded a sharp drop in rainfall." "Mới · Đề 14 · Reading" /
"Câu bạn đã gặp" "câu bạn tự ghi khi gặp từ này trong đời" "Thêm câu đã gặp" /
"The company kept no record of the meeting." "nghĩa 1 · bản ghi, hồ sơ · ghi ngày 05/11/2026" / "Official records show that rainfall has dropped since 1990." "nghĩa 1 · bản ghi, hồ sơ · ghi ngày 02/11/2026" /
"bạn đang học" "bản ghi, hồ sơ" "noun" / "Mới" "1 ngày" "3 ngày" "7 ngày" "14 ngày" "30 ngày" / "Ôn tiếp" "thứ năm, 13/11" / "Đề 12 · Writing" "Ngăn 3 ngày" / "Từ gặp ngoài đời" "Ngăn 1 ngày" / "Thêm vào nhóm khác" /
"cùng chủ đề" "Công việc" "trình độ A2–B1" / chips "schedule A2" "deadline B1" "invoice B2" "budget B1" "colleague A2" "agenda B2" "negotiate B2" "revenue B2" / "Xem chủ đề Công việc →".

Phone vs desktop copy differences: none in wording on either page except the running header's last word on Tra từ ("invoice" on phone, "stakeholder" on desktop), the desktop-only top-bar strings, the phone-only bottom tab labels, and the Tra từ phone list ending at "invoice" (no negotiate, profit, schedule, stakeholder).
Layout-only differences (e.g. "Xóa lọc" on its own line, tabs wrapping, tag position) are in 1.3 and 2.4.

## 7. Open items for the plan writer
- Text-style names for raw sizes are not exposed by the API (see Method); ask the owner or check Figma's Styles panel if exact style names matter.
- Font choice JetBrains Mono vs Noto Sans for the mono labels is in trial (`156:4349`); frames here use JetBrains Mono.
- No frame covers: search typed / no result / loading / "Đã thêm ..." toast / word not found / learner's own word on the word page (Sửa, Xóa) / "Dạng chia" tab content / Tra từ page 2. The plan needs a decision or a Figma addition for each.
- "Thả vào chồng" wording vs click interaction: the note says click. Whether drag is also wanted is not drawn.
- "Thêm cả loạt vào nhóm" has its own overlay (3); "Nhóm khác hoặc tạo nhóm mới" presumably opens "Overlay 5 Chọn nhóm" (not confirmed by any prototype data read).
