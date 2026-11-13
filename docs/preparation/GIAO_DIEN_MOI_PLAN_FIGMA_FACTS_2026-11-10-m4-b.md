# Figma facts for M4 (add-word dialogs), read 2026-11-10

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, read-only (`get_metadata`, `get_design_context`, `get_screenshot`; no write tool called). Values below come from the Figma output of this session. "raw" = a literal value, not bound to a named variable or text style. "not read" = I did not fetch that node's code, the line is inferred from metadata sizes only.

## 0. Shared facts (apply to all five overlays)

**Tokens (variables, exact names as returned)**

| Token | Value | Used for |
|---|---|---|
| `--surface` | #ffffff | dialog bg, input bg, close button bg |
| `--bg` | #f6f7fa | "từ điển" badge bg |
| `--ink` | #1b2444 | title, labels, values |
| `--muted` | #525a78 | hints, secondary text, Hủy |
| `--line` | #e1e5ee | input border, close border, row dividers |
| `--accent` | #1e3a8a | primary button, focus border, text-button (Thường), AI badge text |
| `--accent-soft` | #e7ecf8 | "AI gợi ý" badge bg; focus ring colour (written raw as `#e7ecf8`) |
| `--on-accent` | #ffffff | primary button text |
| `--pass` / `--pass-soft` | #1b7a46 / #e4f2ea | "đã có trong nhóm" text / check circle bg |
| `--mark` / `--mark-ink` | #ffd84a / #1b2444 | highlighted word (`Từ tô`) |
| `radius/modal` | 16 | dialog corners |
| `radius/button` | 10 | primary button |
| `radius/md` | 10 | (top bar search box, not the dialogs) |
| `radius/pill` | 999 | (top bar chip) |

**Named text styles seen in these dialogs**: `Body/Small strong` (Noto Sans SemiBold 14, lh 1.5) is the only named one that matches a dialog text (field labels, text-button labels). `Body/Button` (Noto Sans SemiBold 15, lh 1.4) = primary button label. All other dialog text is **raw** (font + size set per node, no style name):

| Role | Raw spec |
|---|---|
| Dialog title desktop | Bricolage Grotesque ExtraBold 24, tracking -0.5 |
| Dialog title phone | Bricolage Grotesque ExtraBold 22, tracking -0.5 |
| Field label | Noto Sans SemiBold 14 (= `Body/Small strong`) |
| Input value | Noto Sans Regular 15, `--ink`; placeholder `--muted` |
| Hint / note | Noto Sans Regular 13 (ov2 hint, ov4 AI note), Noto Sans Regular 14 `--muted` (ov3 notes) |
| Mono caption | JetBrains Mono Medium 12 `--muted` (e.g. "thẻ sẽ lưu · xem trước", "dùng gần đây", "N từ") |
| Mono small | JetBrains Mono Medium 11.5 `--muted` (POS+level "verb, A1", quota line, "54/300") |
| Badge text | JetBrains Mono Bold 11 |
| Section title in AI dialog | Bricolage Grotesque Bold 16 "Kết quả cho “cap”" |
| Meaning text (AI list/preview) | Bricolage Grotesque Bold 20 |
| Meaning text (ov1 options) | Noto Sans Regular 14.5 `--muted`; lemma Noto Sans SemiBold 15 `--ink` |

**Effects**: dialog shadow = `Shadow/Pop` (0 2 6 rgba(27,36,68,.08) + 0 24 56 -24 rgba(27,36,68,.34)). Lists/preview cards in ov4/ov2 use `Shadow/Card` (0 1 2 rgba(27,36,68,.06) + 0 10 28 -14 rgba(27,36,68,.20)). Primary button: raw `drop-shadow 0 10 14 rgba(30,58,138,.34)`. Focus ring on active input: raw `0 0 0 3px #e7ecf8` + 1.5 px `--accent` border.

**Backdrop (`Nền mờ`)**: full frame (1440x900 desktop; 390x844 phone, ov1 phone 390x928), fill raw `rgba(27,36,68,0.30)` with `backdrop-blur 1.5px` (raw). Identical on desktop and phone. Verified on `73:881` (ov1 desktop, from frame code) and `73:1111` (ov1 phone).

**Close control (`Đóng`)**: 36x36, `--surface` bg, 1 px `--line` border, radius 10 (raw), icon `icon/x` 18x18. Sits at the right end of the title row (title flex-1, gap 12). Same on all ten frames.

**Footer (`Hai nút`)**: row, `justify-end`, gap 20, padding-top 6. Order left to right: `Nút chữ: Hủy` (kind Phụ, grey 14 SemiBold), then `Nút` Chính (primary). Not full width, also on phone: right-aligned. Primary button: padding 20x12, height 45, radius `radius/button`, label `Body/Button`.

**Input (`Ô nhập`)**: height 44, radius 12 (raw), border 1.5 px `--line`, padding-x 16, text 15. Label above with gap 6. Focused input: border `--accent` + ring (see above).

**Dialog structure**: auto-layout column, `overflow: clip`, `--surface` bg, gap 16 between sections (ov4 desktop uses gap 20).

**No tabs** between Thêm từ / Thêm câu / Thêm cả loạt exist in any frame. They are five separate dialogs with different titles, each opened from a different entry point (see per-overlay "Opened from").

**No handle** (grab bar) is drawn on any phone sheet: no handle node in any of the five phone frames' metadata (checked each tree). Phone sheets have only top corners rounded.

**Phone sheet geometry (all five)**: x=0, full width 390, bottom flush with the frame, radius `radius/modal` (16) on top-left and top-right only, padding 20 top / 16 sides / 24 bottom (checked in ov1, ov2, ov4 code; ov3 and ov5 not read, positions in metadata match: content x=16, width 358). Same `Shadow/Pop`.

Phone sheet heights (y of sheet in the frame, frame height): ov1 691 (y237, frame 928); ov2 496.7 (y347, frame 844); ov3 357 (y487, frame 844); ov4 774 (y72, frame 846); ov5 740 (y104, frame 844). Each sheet ends at the frame bottom. Heights are content-driven (hug), not fixed.

**Desktop dialog geometry**: centred horizontally, top y=64 (just under the 64 px top bar), `radius/modal` 16 all four corners, padding 24 vertical / 28 horizontal, content width = dialog width − 56. Widths: ov1 520, ov2 520, ov3 520, ov4 **860**, ov5 520. Heights (hug): ov1 not read (≈694 estimated from the screenshot, raw estimate), ov2 482, ov3 342, ov4 559, ov5 744 (ov5 exceeds a 900 frame minus top 64: 744 + 64 = 808 fits; the list is drawn truncated with "cuộn để xem thêm 3 nhóm", so the list scrolls inside the dialog in code).

## Overlay 1 — "Bạn vừa gặp từ nào?" (Thêm từ)

Frames: desktop `73:580` (dialog `124:4483`), phone `73:966` (dialog `125:4305`). Opened from: top bar button `Thêm từ` (key `N`, `Chip`), the sidebar card "Thêm từ vừa gặp" (page `Hôm nay`, input "Ví dụ: went" + button "Thêm"), and on phone the floating `+` button (`Nút + nổi (Thêm từ)`, 56x56 at right-bottom). The page behind is "Hôm nay" with date "chủ nhật, 08/11".

Title: "Bạn vừa gặp từ nào?". Save button copy is **"Lưu"** (confirmed, both frames). Cancel "Hủy".

Elements, top to bottom (identical order desktop and phone):
1. Title row + close.
2. Field `Từ`: label "Từ"; input value "went"; drawn **focused** (accent border + ring).
3. Field `Câu bạn gặp (không bắt buộc)`: label with that exact text (no separate hint line); input value "She went to the market before sunrise." (single line, h44, not focused).
4. Row `Dạng gốc` (inflection recognised): `Từ tô` chip "went" (bg `--mark`, text `--mark-ink`, radius 3, padding-x 4, 15 regular) + `icon/arr` 16 + "go" (SemiBold 15 `--ink`) + "· quá khứ của go" (Regular 15 `--muted`). Gap 8.
5. List `Các nghĩa` (no outer border, rows stacked; each row radius 10, padding 12, gap 12, a 1 px `--line` top border on rows 2 and 3):
   - Row 1 (selected, "Nghĩa verb, A1"): bg raw `rgba(30,58,138,0.06)`, selected-radio icon (`Chọn`, 18x18), lemma "go" (SemiBold 15), "verb, A1" (mono 11.5 muted), meaning "đi, di chuyển tới nơi khác" (Regular 14.5 muted).
   - Row 2 (unselected, "Nghĩa noun, B2"): unselected-radio icon, "go", "noun, B2", "lượt, lần thử".
   - Row 3 ("Nghĩa verb, B1", **already in a group**, not selectable): no radio; a green check circle (18x18, bg `--pass-soft`, radius 9, `icon/check` 12 inside) instead; text "go", "verb, B1", then label "đã có trong nhóm" (SemiBold 12.5, colour `--pass`); meaning "trở nên (go bad, go wrong)".
   - There is **no** label "nghĩa có sẵn trong từ điển", **no** "AI gợi ý có thể sai" note, **no** quota line, **no** POS/IPA header in this overlay. POS+level live inside each row as "verb, A1". No IPA.
6. `Nút chữ` (kind Thường, navy 14 SemiBold) "Không phải nghĩa bạn cần? Nghĩa khác, tự nhập". Placed between the list and the group field.
7. Field `Lưu vào nhóm`: label "Lưu vào nhóm"; select-like input showing "Từ gặp ngoài đời" with `icon/down` 18 at the right (a dropdown/trigger; it opens Overlay 5). No group chip, no "Chọn nhóm" link: the trigger is the select field.
8. Footer: "Hủy" + "Lưu".

Desktop vs phone: width 520 vs 358 content; title 24 vs 22; padding 28/24 vs 16/20/24; **same elements and order**, all single-line values (no wrap differences visible in the frames). Phone sheet y=237 with height 691.

States drawn: default with focus on `Từ`, one selected option, one unselected, one "already in group" row. Not drawn: loading/lookup in progress, error, empty result (no meaning found), disabled save, quota.

## Overlay 2 — "Thêm câu đã gặp" (Thêm câu)

Frames: desktop `73:1167` (dialog `124:4847`), phone `73:1465` (dialog `125:4660`). Opened from: text button `Thêm câu đã gặp` on the word page ("Câu bạn đã gặp" section, desktop right end of the heading row, phone below the caption), also the text button "2 câu đã gặp" and "Thêm vào nhóm" exist on the page but belong to other flows. Page behind: word page "record" (Tra từ back link, IPA UK/US rows, tabs Nghĩa / Câu đã gặp / Dạng chia / Cùng chủ đề, right card "bạn đang học").

Title: "Thêm câu đã gặp". Footer: "Hủy" + **"Lưu câu"**.

Elements:
1. Title row + close.
2. Context line (not an input): "**record**, noun: bản ghi, hồ sơ · đã có 2 câu". "record" SemiBold `--ink` (raw 14), rest Regular 14 `--muted`. Desktop and phone identical text (phone is one line, 14 px, fits).
3. Field `Câu`: label "Câu". Multi-line textarea box (`Ô nhập`): focused (accent border + ring), padding 12x16, gap 8, radius 12. Inside: the value text 15 "Please keep a record of every call you make this week." and, bottom-right, counter "54/300" (mono 11.5 `--muted`). Desktop box height 70 (one text line + counter row); phone box height 90 (text wraps to 2 lines).
4. Hint under the field (13 Regular `--muted`): "Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô."
5. Preview card `Xem trước mặt sau thẻ` (a slightly rotated card, raw rotation -1 deg): `--surface` bg, 1 px `--line`, radius 12, padding 20, `Shadow/Card`, gap 6. Content: caption "mặt sau thẻ" (mono 12 muted), meaning "bản ghi, hồ sơ" (Bricolage Bold 20 `--ink`), sentence wrapped in a flex-wrap row (gap 4) with the typed word highlighted: "Please keep a **record** of every call you make this week." (15 regular; `record` in `Từ tô`). Desktop card width 400, phone 330.
6. Footer.

Desktop vs phone: width; title 24 vs 22; textarea height 70 vs 90; sentence wraps after "this" on phone (2 lines) vs after "week." on desktop; preview card 400 vs 330 wide. Same elements.

States drawn: default focused with a valid sentence. Not drawn: empty (save disabled), over 300 chars, duplicate sentence, loading, error.

## Overlay 3 — "Thêm cả loạt vào nhóm" (bulk add)

Frames: desktop `73:1701` (dialog `124:4884`), phone `73:1925` (dialog `125:4697`). Opened from: text button "Thêm cả loạt vào nhóm" in the filter toolbar (`Công cụ`) of the Tra từ page, next to the "chỉ từ của tôi" checkbox and "Xóa lọc". Page behind: Tra từ with search "Tìm từ, ví dụ: mitigate", result line "24 từ trình độ B1, chủ đề Công việc, loại từ tất cả.", dictionary-page list on the left and the lifted card + "Thả vào chồng để thêm" group stack on the right (that stack is the page's drag-drop area, not part of the dialog).

Title: "Thêm cả loạt vào nhóm". Footer: "Hủy" + **"Thêm cả loạt"**.

Elements:
1. Title row + close.
2. Summary line (Regular 14.5 `--ink`): "Trình độ **B1** · Chủ đề **Công việc** · Loại từ **noun**" (the three values SemiBold). These are the active filters. (The page line says "loại từ tất cả" while the dialog says "noun": the dialog is a different filter state, flag to the plan.)
3. Note (Regular 14 `--muted`): "Từ chưa có nghĩa được bỏ qua; từ đã có trong nhóm giữ nguyên."
4. Field `Vào nhóm`: label "Vào nhóm"; select-like input with value "Nhóm mới: Công việc · B1 · noun" and `icon/down`. So the default target is a **new group** auto-named "Công việc · B1 · noun" (level · topic · pos). Not a row list: a trigger that opens Overlay 5.
5. Note (14 `--muted`): "Các từ chưa học vào ngăn **Mới**." ("Mới" SemiBold `--ink`).
6. Footer.

No bulk list rows, no per-row states, no progress or result count are drawn inside the dialog. Counts (24 từ) appear only on the page behind.

Desktop vs phone: width; title 24 vs 22; the note in line 3 wraps to 2 lines on phone (height 38) vs 1 line desktop; everything else identical.

States drawn: default only. Not drawn: submitting, count of words that will be added/skipped, error, disabled.

## Overlay 4 — "Bạn vừa gặp từ nào?" with AI result ("Kết quả tra bằng AI", mẫu 1C vòng 15)

Frames: desktop `75:1071` (dialog `124:4907`), phone `75:1346` (dialog `125:4720`). Same title as overlay 1 but a different state: the word "cap" was not found well, an AI lookup was made. Opened from the same entry as ov1 after "Nghĩa khác / tra bằng AI" (the page behind is Tra từ; the dictionary results page).

Title: "Bạn vừa gặp từ nào?". Footer: "Hủy" + **"Sửa rồi lưu"** ("Edit then save").

**Desktop layout = two columns** (dialog 860 wide, gap 24 between columns): left `Cột nhập` 480 wide (gap 16), right `Cột xem trước` 300 wide (gap 12). **Phone layout = one column**, sections stacked.

Left column / phone stack, top to bottom:
1. Field `Từ`: input value "cap" (not focused here: border `--line`).
2. Field `Câu bạn gặp (không bắt buộc)`: value "No cap, this is the best phở in town." Desktop textarea height 68 (padding-top 12, text starts at top), phone single-line height 44.
3. Result header row: "Kết quả cho “cap”" (Bricolage Bold 16 `--ink`), a spacer line, and the quota text "đã dùng 1 lượt tra AI · còn 4" (mono 11.5 `--muted`). Desktop: one row, quota at right. Phone: the row wraps; the quota text goes on a second line (`Frame` height 40; flex-wrap gap 6/12).
4. Meaning list `Danh sách nghĩa` (one bordered card: `--surface`, 1 px `--line`, radius 12, `Shadow/Card`; rows separated by a 1 px `--line` top border, row padding 16, gap 16, radio 18):
   - Row 1 "Nghĩa từ điển" (unselected radio): "noun · A2" (mono 12 muted) over "mũ lưỡi trai" (Bricolage Bold 20), right-aligned label badge **"từ điển"** (bg `--bg`, text `--muted`, mono Bold 11, radius 6, padding 8x3).
   - Row 2 "Nghĩa AI (đang chọn)" (**selected**, radio filled navy): "verb" over "nói dối, nói phét", badge **"AI gợi ý"** (bg `--accent-soft`, text `--accent`, mono Bold 11). Its fill is exported as two stacked solid gradients (navy then white): the opacity is not exported, so the exact tint is unknown; the screenshot shows a very light tint (**ASSUMPTION**: same as ov1 selected row `rgba(30,58,138,0.06)`; verify in Figma node `179:5434` fill opacity before coding).
   - The Vietnamese "nghĩa có sẵn trong từ điển" long label is not drawn; the badge copy is just "từ điển". Items are one per lookup candidate: the first is from the dictionary, the second AI-made.
5. Preview block, label "thẻ sẽ lưu · xem trước" (mono 12 muted). Desktop: right column, first item; phone: after the list.
   - Preview card (`Thẻ xem trước`): `--surface`, 1 px `--line`, radius 12, `Shadow/Card`, gap 12. Desktop padding 24, rotated raw **+1.2 deg**, full column width (300 px); phone padding 20, **not rotated**, full width.
   - Desktop card content: head row ("verb" mono 12 muted · spacer · "AI gợi ý" badge), headword "cap" (Bricolage Bold **40**), meaning "nói dối, nói phét" (Bricolage Bold 20), the AI example sentence "Stop **capping,** you never met him." (Noto Sans Regular 15; highlight `Từ tô` on "capping,"), then caption "câu bạn gặp" (mono 12) and the learner's own sentence "No **cap,** this is the best phở in town." (Regular 14, highlight on "cap,").
   - Phone card content: head row **"cap"** (Bricolage Bold **32**) + "verb" (mono 12) + spacer + "AI gợi ý" badge, then meaning (Bold 20), then the AI sentence (15). The "câu bạn gặp" caption and the learner's sentence are **not drawn on phone**.
6. AI warning row `AI có thể sai`: `icon/info` 16 + text (Regular 13 `--muted`) "AI gợi ý có thể sai. Kiểm lại trước khi lưu." Desktop: at the bottom of the right column under the card; phone: full width under the card.
7. Footer.

There is **no** lemma/IPA/UK-US row, no "chọn nghĩa" tab, no group field (group is chosen after "Sửa rồi lưu" probably via ov5; not drawn here).

States drawn: result available, quota partly used (1 used, 4 left), one dictionary and one AI option, AI option selected. Not drawn: loading/spinner, quota exhausted (0 left), AI error/timeout, no AI result, free-plan paywall.

## Overlay 5 — "Lưu vào nhóm" (group picker)

Frames: desktop `75:1548` (dialog `124:5260`), phone `75:1849` (dialog `125:5063`). Opened from: the `Nút chữ: Thêm vào nhóm` / `Thêm vào nhóm khác` buttons on the word page "record", and from the group select in ov1/ov3. Page behind is the "record" word page.

Title: "Lưu vào nhóm". Footer: "Hủy" + **"Lưu vào nhóm"** (same words as the title).

Elements, top to bottom:
1. Title row + close.
2. Word chip: a highlighted pill (bg `--mark`, radius 4, padding 6x2) with text "**record**, noun: bản ghi, hồ sơ" (Regular 14.5, "record" SemiBold, colour `--mark-ink`). It names the word + meaning being saved.
3. Search input (`Ô nhập`, h44, radius 12, border 1.5 `--line`): `icon/look` 18 + placeholder "Tìm hoặc tạo nhóm…" (15 muted). Not focused.
4. `Nút chữ` kind Thêm ("+" icon 16, navy 14 SemiBold, gap 6) "Tạo nhóm mới". This is the create-new-group row (a text button, not a list row).
5. Section caption (mono 12 muted): "dùng gần đây" (recent).
6. Group row (`Nhóm Công việc · B1`, **selected**): bg raw `rgba(30,58,138,0.06)`, radius 10, padding 12, gap 12, h44. Cells left to right: radio 18 (filled = selected), a colour square 9x9 radius 3 (group colour; raw `#2a86d1` here), name (SemiBold 15 `--ink`), spacer, **stage bar** (six segments each 8x5 radius 2, gap 2, colours raw `#9aa3b1`, `#c07a45`, `#98a2b0`, `#d4a72c`, `#1f9d75`, `#b28bff` = the six stages Mới / 1 ngày / 3 ngày / 7 ngày / 14 ngày / 30 ngày), count "24 từ" (mono 12 muted).
7. Section caption: "tất cả nhóm (8), A–Z".
8. Group rows (unselected, no bg): "Công việc · B1" (24 từ, same stage bar), "Du lịch Nhật" (square raw `#64708c`, **"0 từ", no stage bar**), "Đề 10 · Writing" (square raw `#d2427a`, 28 từ), "Đề 11 · Speaking" (square raw `#4a9637`, 30 từ), "Đề 12 · Writing" (square raw `#e5603f`, 48 từ). Note: "Công việc · B1" appears twice (in "dùng gần đây" selected and again in the A–Z list unselected), which is a mock duplicate; in code a group appears once per section and selection must show on both or on the first.
9. Scroll hint (mono 12 muted): "cuộn để xem thêm 3 nhóm". This signals the list area scrolls; the dialog shows 5 of 8 A–Z rows (3 more).
10. Footer.

Desktop vs phone: width 520 vs 358; title 24 vs 22; the spacer between name and stage bar is wider on desktop (158 vs 52); stage bar and count positions are right-aligned in both. The "Tìm hoặc tạo nhóm…" row and text button identical. Phone sheet height 740 at y 104.

States drawn: default with one selected row (recent group). Not drawn: search with results/no results, create-new-group inline (name entry), search highlighting, loading, error, group at limit.

## Components needed (deduplicated)

| Component (Figma name) | Description | Overlays |
|---|---|---|
| Dialog / bottom sheet shell (`Hộp …`) | centred 520 (860 for ov4) dialog, radius 16, `Shadow/Pop`, padding 28/24; phone: full-width bottom sheet, top radius 16, padding 16/20/24, no handle; content-height; ov5 list scrolls inside | 1, 2, 3, 4, 5 |
| Backdrop (`Nền mờ`) | full frame, `rgba(27,36,68,0.30)`, blur 1.5 px | 1, 2, 3, 4, 5 |
| Dialog header (`Đầu hộp`) + Close button (`Đóng`, icon `icon/x`) | title Bricolage ExtraBold 24 (22 phone), 36x36 close, radius 10, 1 px `--line` | 1, 2, 3, 4, 5 |
| Footer (`Hai nút`) | right-aligned, gap 20: `Nút chữ` Phụ "Hủy" + `Nút` Chính | 1, 2, 3, 4, 5 |
| `Nút` (3:12), kind Chính | primary button, padding 20x12, radius 10, glow shadow, `Body/Button` | 1, 2, 3, 4, 5 |
| `Nút chữ` (166:326), kinds Phụ / Thường / Thêm | no-bg text button 14 SemiBold; Phụ grey (Hủy), Thường navy, Thêm with `+` icon (16) | 1 (Thường, Phụ), 2, 3, 4 (Phụ), 5 (Phụ, Thêm) |
| Field: label + text input (`Ô nhập`) | label 14 SemiBold + input h44 radius 12 1.5 px border, focus ring | 1, 2 (textarea), 4 |
| Textarea with counter | multi-line `Ô nhập` with "54/300" mono counter, hint line 13 muted | 2 |
| Select trigger (input with `icon/down`) | read-only input with chevron, opens picker | 1, 3 |
| Search input with `icon/look` | input with leading icon, placeholder "Tìm hoặc tạo nhóm…" | 5 |
| Highlighted word (`Từ tô`) | inline `--mark` chip, radius 3, padding-x 4 | 1, 2, 4, 5 (as the word chip) |
| Inflection row (`Dạng gốc`) | `Từ tô` + `icon/arr` + lemma + "· quá khứ của go" | 1 |
| Meaning option row (`Nghĩa …`) | radio 18 (selected/unselected), lemma, "pos, level" mono, meaning; selected bg tint; variant "đã có trong nhóm" with green check and no radio | 1 |
| Meaning list card (`Danh sách nghĩa`) with source badge | bordered card `Shadow/Card`, rows with radio, "pos · level", meaning Bold 20, badge "từ điển" / "AI gợi ý" | 4 |
| Badge (`Nhãn từ điển`, `Nhãn AI gợi ý`) | mono Bold 11, radius 6, padding 8x3; grey (`--bg`) or `--accent-soft` | 4 |
| Quota line | mono 11.5 muted "đã dùng 1 lượt tra AI · còn 4", wraps below title on phone | 4 |
| Preview card (`Thẻ xem trước`, `Xem trước mặt sau thẻ`) | white card radius 12, `Shadow/Card`, slight rotation (+1.2 deg ov4 desktop, -1 deg ov2, none ov4 phone) | 2, 4 |
| AI warning row (`AI có thể sai`) | `icon/info` 16 + 13 muted text | 4 |
| Group picker row (`Nhóm …`) | radio 18, colour square 9x9, name 15 SemiBold, six-segment stage bar (8x5, gap 2), "N từ" mono; selected bg tint; no bar when 0 words | 5 |
| Section captions | mono 12 muted ("dùng gần đây", "tất cả nhóm (8), A–Z", "thẻ sẽ lưu · xem trước", "cuộn để xem thêm 3 nhóm") | 4, 5 |
| Radio icons (`Chọn`, `Nút chọn`) | 18x18 selected and unselected SVG | 1, 4, 5 |
| Icons | `icon/x` 18, `icon/down` 18, `icon/arr` 16, `icon/check` 12, `icon/info` 16, `icon/look` 18, `icon/plus` 16 | various |

Triggers outside the dialogs but in these frames (not part of the M4 dialogs): top-bar `Thêm từ` button (key `N`), phone floating `+` (`Nút + nổi (Thêm từ)`, 56x56).

## Copy (flat list, Vietnamese exact)

Titles
- Bạn vừa gặp từ nào? (ov1, ov4; desktop 24, phone 22)
- Thêm câu đã gặp (ov2)
- Thêm cả loạt vào nhóm (ov3)
- Lưu vào nhóm (ov5)

Buttons
- Lưu (ov1), Lưu câu (ov2), Thêm cả loạt (ov3), Sửa rồi lưu (ov4), Lưu vào nhóm (ov5)
- Hủy (all)
- Tạo nhóm mới (ov5, with + icon)
- Không phải nghĩa bạn cần? Nghĩa khác, tự nhập (ov1)

Labels and values
- Từ; went (ov1) / cap (ov4)
- Câu bạn gặp (không bắt buộc); She went to the market before sunrise. (ov1) / No cap, this is the best phở in town. (ov4)
- went → go · quá khứ của go (ov1)
- go · verb, A1 · đi, di chuyển tới nơi khác; go · noun, B2 · lượt, lần thử; go · verb, B1 · đã có trong nhóm · trở nên (go bad, go wrong) (ov1)
- Lưu vào nhóm (label); Từ gặp ngoài đời (value) (ov1)
- record, noun: bản ghi, hồ sơ · đã có 2 câu (ov2)
- Câu; Please keep a record of every call you make this week.; 54/300 (ov2)
- Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô. (ov2)
- mặt sau thẻ (ov2 preview caption)
- Trình độ B1 · Chủ đề Công việc · Loại từ noun (ov3)
- Từ chưa có nghĩa được bỏ qua; từ đã có trong nhóm giữ nguyên. (ov3)
- Vào nhóm; Nhóm mới: Công việc · B1 · noun (ov3)
- Các từ chưa học vào ngăn Mới. (ov3)
- Kết quả cho “cap” (curly quotes) (ov4)
- đã dùng 1 lượt tra AI · còn 4 (ov4)
- noun · A2 · mũ lưỡi trai · từ điển (ov4)
- verb · nói dối, nói phét · AI gợi ý (ov4)
- thẻ sẽ lưu · xem trước (ov4)
- cap; nói dối, nói phét; Stop capping, you never met him.; câu bạn gặp; No cap, this is the best phở in town. (ov4 desktop preview)
- AI gợi ý có thể sai. Kiểm lại trước khi lưu. (ov4)
- record, noun: bản ghi, hồ sơ (ov5 word chip)
- Tìm hoặc tạo nhóm… (ov5)
- dùng gần đây; tất cả nhóm (8), A–Z (ov5)
- Công việc · B1 24 từ; Du lịch Nhật 0 từ; Đề 10 · Writing 28 từ; Đề 11 · Speaking 30 từ; Đề 12 · Writing 48 từ (ov5)
- cuộn để xem thêm 3 nhóm (ov5)

Desktop vs phone copy differences: none in wording. Differences are layout only: title size 24 vs 22; ov4 phone has no "câu bạn gặp" caption/sentence in the preview card and the quota text drops under the "Kết quả cho “cap”" heading; ov4 phone preview headword 32 and inline POS, desktop 40 with POS on the head row; ov2 sentence wraps to two lines on phone; ov3 note wraps on phone; ov1 phone is a 358-wide column (no text change).

## Not verified / gaps for the planner
- Overlay 1 desktop dialog height (≈694, estimated from a screenshot) and the phone ov3 (`125:4697`) and ov5 (`125:5063`) node code were not read; their styling is taken as equal to the desktop twin plus the metadata geometry.
- Selected-AI-row tint in ov4 (exported as layered gradients) and the radio selected/unselected SVGs (`d377a` selected, `aeaf6` unselected in ov1/ov5) are inferred from the screenshot, not from variable names.
- No frame draws loading, error, quota-exhausted, disabled-save, empty-search or paywall states; any such UI is a decision outside these frames.
- "Nghĩa có sẵn trong từ điển" long label and the "chọn nghĩa" tab named in the task brief do not exist in the frames; the only labels are the badges "từ điển" and "AI gợi ý".
