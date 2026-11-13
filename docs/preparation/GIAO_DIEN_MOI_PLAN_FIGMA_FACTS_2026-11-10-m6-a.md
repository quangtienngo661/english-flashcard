# Figma facts for M6 (Lịch học: hộp Lịch, hộp Ngày, nút lịch nổi), 10/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`). Read-only (`get_metadata`, `get_design_context` with `forceCode`,
`get_screenshot`, `get_variable_defs`, `get_motion_context`); nothing was written to Figma or to the repo except this file.
Also read: `vong-9-lich.html` (prototype JS and CSS, lines 333-476 and 600-758), `motion-va-chuyen-canh.md` §5-§8, `app-redesign-plan.md` (vòng 9, vẽ Figma
vòng 8-9, 09/11 and 10/11 notes), design `2026-11-09-giao-dien-moi-design.md` §3, §5.6, §7.2, §8, §9 M6, §10.
"raw" = value read from the node, not bound to a Figma variable. Copy is exact Vietnamese from the frames.
Values I could not read are marked **UNVERIFIED**. The skill `figma-design-to-code` was not loaded (not available this session); `get_design_context`
was still used and parsed. Its output gives font family/weight/size but not the named text style, so a "raw" size may still be a named style.

## 0. Frames and IDs

| What | Desktop | Phone |
|---|---|---|
| Hộp Lịch (page behind = Luyện tập) | frame `102:3278` (1440x900), dialog `102:3502` "Hộp Lịch học" 720x777 at (360,80); scrim `102:3501` | frame `102:3948` (390x844), sheet `102:4118` "Tấm Lịch học" 390x790 at (0,54); scrim `102:4117`; close button `102:4544` 34x34 at (342,72) |
| Hộp Ngày | frame `103:3820`, dialog `103:4044` "Hộp Ngày" 640x780 at (400,80) (content `103:4064` is 1063 tall, so it scrolls inside the dialog); scrim `103:4043` | frame `103:4248`, sheet `103:4418` "Tấm Ngày" 390x790 at (0,54); scrim `103:4417`; content `103:4440` 1152 tall (scrolls) |
| Nút lịch nổi | component set (main) `95:343`; variants `Kích thước=Lớn` (95:327) 62x66, `Nhỏ` (95:335) 54x58; props `Ngày` (default "8"), `Tháng` ("T11"), `Chuỗi` ("6") | same |
| Ô ngày lịch | component set `96:404`; props `Kích thước` (Desktop, Mobile) x `Trạng thái` (Thường, Chọn, Hôm nay, Ngoài tháng, Tương lai) = 10 variants; descriptions: "Chấm: navy học từ mới, lục ôn, vàng luyện tập. Dải nối các ngày có học liền nhau vẽ riêng phía sau hàng tuần." | same |
| Chip từ | component set `96:322` (Thường, Cần ôn); "đổi màu chấm 'Màu nhóm' theo bìa nhóm. Cần ôn = nền đỏ nhạt." | same |
| Nút chữ | `166:326` (mẫu C, chốt 09/11/2026): no background, no underline, Noto Sans SemiBold 14, navy; "→" kept in the label when it goes to another page; min touch area 44 px on phone | same |
| Font trial (09/11) | `156:5852` Ngày phone "JetBrains Mono (hiện tại)" vs `156:6126` "Noto Sans (thử)", section `156:4349` | |

Only these 4 dialog frames exist for the calendar. **There is no Figma frame for**: empty month, a day with no activity, a future day opened, loading, error,
hover tooltip of the floating button, the "Nút lịch trong thanh" (phone, inside Luyện tập / Ôn). See "Unresolved".
Frames are sample data for Sunday-start November 2026: today = Sunday 08/11, streak 6 (03-08/11), selected day Thursday 05/11.

## 1. Tokens used (from `get_variable_defs` on `103:4044` and code)

Colours: `--bg #f6f7fa`, `--surface #ffffff`, `--ink #1b2444`, `--muted #525a78`, `--line #e1e5ee`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`,
`--ghost #c9cedc`, `--mark #ffd84a`, `--mark-ink #1b2444`, `--on-accent #ffffff`, `--pass #1b7a46`, `--pass-soft #e4f2ea`, `--fail #b8352a`,
`--fail-soft #f8e7e5`. Radius `radius/modal 16`, `radius/sm 6` (key caps), button 10. Effects `Shadow/Card` (0 1 2 #1B24440F + 0 10 28 -14 #1B244433),
`Shadow/Pop` (0 2 6 #1B244414 + 0 24 56 -24 #1B244457). Text style `Body/Small strong` (Noto Sans SemiBold 14 / 1.5).
Raw colours here: activity dots navy `#1E3A8A`, green `#1B7A46`, amber `#D99A17`; totals "55" `#1e3a8a`, "130" `#1b7a46`, "4" `#a07725` (prototype:
`color-mix(--c-prac, --ink 30%)`); group chip squares `#e5603f #2a86d1 #149384 #7a55d3` (cover colours, QR5 colour by group id, not by lemma).
Fonts: Bricolage Grotesque (ExtraBold, Bold), Noto Sans (Regular, SemiBold, Bold), JetBrains Mono (Medium, Bold). Scrim `rgba(27,36,68,0.30)` with backdrop blur 1.5 (CSS value from code).

## 2. Hộp Lịch, desktop (`102:3502`, 720 x 777)

Surface `--surface`, radius `radius/modal` 16, `Shadow/Pop`. Padding 28 top/sides, 24 bottom, vertical gap 16, overflow clip. Sections in order:

**2.1 Đầu lịch (`102:3503`, 664 x 50, gap 8, items centred).**
- Left block gap 12: stacked text "lịch học" (JetBrains Mono Medium 12, muted) over "Tháng 11, 2026" (Bricolage ExtraBold 28, ls -0.7, ink; height 34). Then
  streak pill `Chuỗi ngày`: bg `--mark`, radius 12, pl8 pr12 py5, gap 5, flame icon 16 + "6 ngày liên tiếp" (Noto Sans SemiBold 13, `--mark-ink`). 28 high.
- Navigation (gap 8): Nút chữ "Về hôm nay" (14 SemiBold navy); "Tháng trước" 36x36 button (surface, 1px `--line`, radius 10, icon `icon/l` 16); "Tháng sau" same with
  icon `icon/r`, **opacity 0.35 in the frame (current month, disabled)**.
- Flexible spacer, then "Đóng lịch" 36x36 (same style, icon `icon/x` 18).
**2.2 Tổng tháng (`102:3528`, 664 x 71).** 1px `--line` border, radius 12, four equal cells, left border `--line` between cells, each px16 py12:

| Cell | Big number | Label | Number style |
|---|---|---|---|
| 1 | "7" + "/8" | "ngày có học" | "7" Bricolage ExtraBold 24 ls -0.49 ink; "/8" Bricolage Bold 13 muted (baseline aligned) |
| 2 | "55" | "từ mới đã học" | ExtraBold 24, `#1e3a8a` raw |
| 3 | "130" | "lượt ôn" | ExtraBold 24, `#1b7a46` raw |
| 4 | "4" | "phiên luyện" | ExtraBold 24, `#a07725` raw |

Labels: Noto Sans Regular 12.5, line-height 1.3, muted.
**2.3 Lịch tháng (`102:3546`, 664 x 483, gap 4).**
- Weekday row: "T2 T3 T4 T5 T6 T7 CN" (JetBrains Mono Medium 11, muted), 7 equal columns, row px3, each label indented 12.
- Six week rows (always 6 in the frame because Nov 2026 needs 6: lead 6 + 30 days), each 74 high. Each row has bands behind the cells (below).
- Cell = 94.86 x 74 with an inner box inset 3 (so 88.86 x 68), radius 12, padding top 8 / bottom 12 / sides 12, content `justify-between`: number on top, dots at bottom.
  - Number: Bricolage Bold 17, `--ink`.
  - Dots (SVG 29 x 7): three circles r 3.5 at x 3.5 / 14.5 / 25.5 (7 px dots, 4 px gaps): navy, green, amber. **In every Thường/Chọn/Hôm nay/Ngoài tháng
    cell the Figma instance draws all three dots (static sample)**; the prototype draws only the dots of the activities the day has (see Conflicts).
  - States: **Thường** as above; **Chọn** (selected): bg `--surface`, 2px `--accent` border, `Shadow/Card`, same radius 12; **Hôm nay**: number accent + bold,
    followed by the label "hôm nay" (JetBrains Mono Bold 9.5, accent), baseline gap 5; **Ngoài tháng** (days of the adjacent month, here 26-31/10): number `--ghost`, dots at 55% opacity;
    **Tương lai** (future, including 1-6/12): number `--ghost`, **no dots**.
- Bands "Dải ngày liền nhau": 60 high, y = 7 inside the 74 row, bg `--accent-soft`, full cell width minus 3 px at a run's two ends; radius 14 only on the
  outer ends of a run (left end radius on the first day, right end radius on the last day, square in the middle). A run is cut at the row edges (each row has its own bands).
  Bands over out-of-month days have opacity 0.55. Sample: 31/10 (0.55) joined with 1/11 in row 1; 3-8/11 in row 2 (starts at 3/11, which has left radius; 2/11 has no band).
- Today (8/11) is also in the band and not selected; selected = 5/11 (a sample).

**2.4 Chú thích (`102:3917`, 664 x 18).** Flex wrap, gap 6 / 16: 8 px dot navy "Học từ mới", green "Ôn", amber "Luyện tập", swatch 22 x 10 radius 5 `--accent-soft` + "Ngày liền nhau"
(each: gap 6, Noto Sans Regular 13, muted).
**2.5 Chân lịch (`102:3930`, 664 x 39).** Top border 1px `--line`, padding-top 16, gap 6, items right-aligned: key caps `←` `→` `↑` `↓` (22 x 22, bg `--accent-soft`, radius `radius/sm` 6,
Noto Sans SemiBold 12 accent) + "chọn ngày ·" + key "Enter" (51.5 x 22) + "xem ngày ·" + key "Esc" (36.5 x 22) + "đóng" (13 Regular muted).
**There is no "Báo lỗi của tôi" link in the footer** (removed 10/11, QR1).

## 3. Hộp Lịch, phone (`102:4118`, 390 x 790, bottom-anchored)

Radius `radius/modal` 16 on the top two corners only, `Shadow/Pop`; padding top 8, sides 16, bottom 20; gap 12.
- `Kéo`: handle 40 x 5, radius 3, `--line`, centred.
- Đầu lịch is two rows (gap 12): row 1 = same title block but "Tháng 11, 2026" is Bricolage ExtraBold **22** (ls -0.49) + streak pill (same); row 2 = "Về hôm nay" Nút chữ, "Tháng trước", "Tháng sau"
  (36x36, sau at 0.35). **The close button is not in the sheet's flow**: a separate 34 x 34 button at the top right (342, 72 in the frame = 18 px below the sheet's top, 16 px from the right edge), icon 18.
- Tổng tháng (358 x 54): numbers Bricolage ExtraBold **18**, "/8" Bold 10, labels Noto Sans Regular 11 (lh 1.3), cell padding 8, same colours.
- Weekday labels indented 6. Six rows of 50. Cell 51.14 x 50, inner inset 3, radius 10, padding top 6 / bottom 8 / sides 6; number Bricolage Bold **14**; dots SVG 19 x 5 (5 px dots at x 2.5 / 9.5 / 16.5, 2 px gaps).
  Today = number accent with **underline** (no "hôm nay" text). Selected: same 2px accent border, radius 10. Bands 40 high at y = 5, same radius 14.
- Legend wraps to two lines (3 dots on line 1, "Ngày liền nhau" on line 2). Footer `Chân lịch` is an empty 38 px strip with a top border (key hints hidden on phone).

## 4. Hộp Ngày, desktop (`103:4044`, 640 x 780)

Surface, radius 16, `Shadow/Pop`, overflow clip (the 1063 px content scrolls; **scroll behaviour UNVERIFIED**, prototype `max-height` + `overflow:auto`).
**Đầu ngày (56 high, pt 20, px 24, gap 8):** "Về Lịch tháng 11": `icon/l` 16 + "Lịch tháng 11" (Noto Sans SemiBold 14 accent, pl2 pr8 py6, gap 4); spacer; "Ngày trước" 36x36 (`icon/l`),
"Ngày sau" 36x36 (`icon/r`), "Đóng" 36x36 (`icon/x` 18); same button style as above (surface, 1px line, radius 10). Both arrows are enabled in the frame.
**Chi tiết ngày (px 28, pt 8, pb 28, gap 16):**
1. "thứ năm" (JetBrains Mono Medium 12, muted, lowercase).
2. "05/11" (Bricolage ExtraBold 30, lh 1.05, ls -0.63, ink).
3. "Học 10 từ mới · ôn 22 lượt · luyện 20 câu" (Noto Sans Regular 14, muted).
4. Filter `Lọc` (surface, 1px line, radius 11, padding 3, gap 2): "Tất cả" (active: bg `--ink`, text `--surface`), "Học 10", "Ôn 22", "Luyện 20" (inactive text muted); each tab px12 py6, radius 8, Noto Sans SemiBold 13.
5. Three cards (surface, 1px line, radius 12, padding 16, gap 12, `Shadow/Card`). Card header (gap 8): coloured dot 9 px + title (Bricolage Bold 17 ink) + spacer + hint (JetBrains Mono Medium 11 muted).

| Card | Dot | Title | Right hint | Body |
|---|---|---|---|---|
| Học | navy | "Học 10 từ mới" | "4 nhóm" | wrap of 10 `Chip từ` (gap 6) |
| Ôn | green | "Ôn 22 lượt" | "lật thẻ và câu ôn" | row "16" (Bricolage Bold 16, `--pass`) + "Đã biết, lên một ngăn" (Noto Regular 13 muted); chips (8 shown + "+8 từ" text chip); row "6" (Bold 16, `--fail`) + "Cần ôn lại, về ngăn 1 ngày"; 6 chips with `Cần ôn` variant |
| Luyện | amber | "Luyện tập · 1 phiên" | "câu 1–20" | score row, 5 question rows, Nút chữ "Xem đủ 20 câu" |

`Chip từ`: bg `--bg`, px8 py4, radius 8, gap 6; group colour square 7 px radius 2; lemma Bricolage Bold 14 ink. `Cần ôn` variant: bg `--fail-soft`. Overflow chip "+8 từ": Noto Sans SemiBold 13 muted, padding 4, no background.
Sample lemmas: inevitable, scrutiny, deadline, schedule, implement, viable, coherent, budget, ambiguous, mitigate (learned); prevalent, deploy, contract, comply, allocate, deteriorate, negotiate, candidate (known); feasible, substantial, reluctant, colleague, profit, fluctuate (again).
Score row (gap 12): "17/20" (Bricolage ExtraBold 20 ink) + "đúng" (Noto 13 muted) + progress bar `Thanh tiến độ` (237 x 6, track `--line`, radius 3, `--pass` fill from the left 84.81%, `--fail` fill on the right 15.19%) + two chips: `Số câu đúng` (bg `--pass-soft`, radius 6, pl6 pr8 py3, check icon 12, "17" Noto Bold 13 `--pass`), `Số câu sai` (bg `--fail-soft`, x icon, "3" `--fail`).
Question row (py8, gap 12; rows 2-5 have a 1px `--line` top border): time "20:31" (Mono Medium 11 muted, fixed 44 wide); lemma (Bricolage Bold 15 ink) over "bạn trả lời deteriorate" (Noto Regular 12.5 muted), gap 2; result badge 22 x 22 radius 7 `--pass-soft` with check icon 12. All five sample rows are correct; **no wrong-answer row is drawn**. Rows: 20:31 deteriorate, 20:30 negotiate, 20:29 candidate, 20:28 feasible, 20:27 substantial.

## 5. Hộp Ngày, phone (`103:4418`, 390 x 790)

Same card contents; differences: top handle `Kéo` (390 x 13, handle 40 x 5 at y 8); header 42 high at y 13 with "Về Lịch tháng 11" at x 12 and 34 x 34 buttons at x 256 / 298 / 340 (icons 16 / 16 / 18);
detail content px 16 (cards 358 wide, inner 324, so card padding 16 + 1 border); date "05/11" is **27 px high** (prototype 24 px; font size **UNVERIFIED**, likely 24-26); chips wrap on more lines (10 chips = 4 rows);
progress bar 197 wide; question rows 324 wide. Filter and header text are the same as desktop. Card radius 12. Sheet corner radius **UNVERIFIED** (not fetched; assume same as Hộp Lịch phone: 16 top).

## 6. Nút lịch nổi (component set `95:343`)

- **Lớn** (desktop) 62 x 66; **Nhỏ** (phone) 54 x 58. Fill `--surface`, radius 16, shadow `Shadow/Pop`. Description: "Nút nổi mở modal Lịch học (phím L). Góc dưới phải mọi màn; trên điện thoại nằm trên thanh tab. Ẩn khi modal mở. Lớn = máy tính, Nhỏ = điện thoại."
- `Dải tháng`: accent bar at the top, 62 x 20 (phone 54 x 18), top radius 16; month text "T11" JetBrains Mono Bold 10 (phone 9), `--on-accent`, at left 9, top 4 (phone 3).
- Day number "8": Bricolage ExtraBold 26 (phone 22), `--ink`, centred (cx 31 / 27), top 28 (phone 25).
- Streak badge `Chuỗi ngày`: `--mark` bg, 2px border `--bg`, radius 11, pl5 pr8 py3, gap 2, flame icon 13 + "6" (Bricolage ExtraBold 12, `--mark-ink`); positioned at left 38, top -9 (phone left 30, top -9), so it sits on the top-right corner and sticks out above the button.
- **Position (read from instances)**: desktop frames are 1440 x 900 viewport frames, FAB at x 1346, y 802 = **32 px from the right, 32 px from the bottom** (taller pages keep the same 32 px from the page bottom, e.g. Hôm nay desktop 1243.7 high, FAB y 1145.7).
  Phone: x 320 (**16 px from the right**), viewport 844 → y 700 = 86 px from the bottom, i.e. **14 px above the 72 px tab bar** ("Thanh tab dưới" at y 772). Hidden (`hidden=true`) in all four dialog frames.
- **Next to the add-word "+" (phone only; desktop has "Thêm từ" in the top bar and no floating "+")**: on Hôm nay phone (`117:4712`) the "Nút + nổi (Thêm từ)" is 56 x 56 at x 318 (16 px from the right), 14 px above the tab bar; the calendar button sits **directly above it, 12 px gap** (FAB y 1858 + 58 = 1916; "+" at y 1928), both right-aligned (centre x 347 vs 346). Same stacking on Tra từ, Nhóm (`125:4244`).
- Appears on app screens (28 frames), not on overlays. Hidden on phone at Từ tồn đọng (`97:3353`) and Chủ đề (`98:3449`). Content bottom padding: design plan says leave 124 px (phone 100 px) at the end of every screen.
- Prototype only (no Figma frame): hover tooltip "Lịch học" + key cap "L" (ink bg, left of the button, 12 px gap); phone sessions without a tab bar (Luyện tập / Ôn session) use a small in-bar calendar button instead (`calmini`: 32 x 34, radius 9, month strip 11 px "T11" Mono 7.5, day 15 px) which exists in Figma as the component "Nút lịch trong thanh" (**sizes UNVERIFIED**, not read).

## 7. What each number/text is in the API (design §10.2, §10.5)

| On screen | Source | Field |
|---|---|---|
| "Tháng 11, 2026", weekday labels, grid, "thứ năm", "05/11" | client | month/date computed in `me.timezone` (server Worker is UTC; design §10.4) |
| "6 ngày liên tiếp" and FAB badge "6" | `GET /v1/me/streak` | `days` (`studied_today` tells if today counts). Cached; updated from the answer response |
| "7" (ngày có học) | `GET /v1/me/calendar?month=` | `totals.study_days` |
| "/8" | **no field**: client computes days elapsed in the month up to today (past months: days in month; prototype `upto`) |
| "55" từ mới đã học | `totals.learned` |
| "130" lượt ôn | `totals.reviewed` |
| "4" phiên luyện | `totals.practice_sessions` |
| Dots in a cell | `days[]` row of that date: `learned > 0` navy, `reviewed > 0` green, `practice_sessions > 0` amber; days not in `days` have no dots |
| Band | consecutive dates present in `days[]` (client). Note `study_days` counts `studied=true`, `days[]` lists any day with a count > 0; a day with only add/remove has neither |
| Out-of-month dots/bands at 55% | would need the adjacent month's response: **no field in one call** (see Unresolved) |
| "Học 10 từ mới · ôn 22 lượt · luyện 20 câu", tab "Học 10", "Ôn 22", "Luyện 20" | `GET /v1/me/calendar/days/{date}` | `counts.learned`, `counts.reviewed`, `counts.practice_questions` (note "luyện 20 **câu**" = questions, not sessions) |
| "4 nhóm" in the Học card | `counts.learned_groups` (§10.5) |
| Học chips | `items` with `kind='learned'`: `lemma`, `group_id` (colour by group id, QR5; `group_id` may be null) |
| "16 Đã biết, lên một ngăn" / "6 Cần ôn lại, về ngăn 1 ngày" | `counts.reviewed_known` / `counts.reviewed_again` (§10.5; known + again = reviewed = 22; these are **lượt**) |
| Ôn chips and their group | `items` with `kind='reviewed'`: `result` `known`/`again`, `times`, `lemma` (null = "Từ không còn trong kho", no link), `group_id` (null when last action came from practice) |
| "+8 từ" overflow | derived from `items`/page size; number of words, **not** lượt (the sub-heading numbers are lượt) |
| "Luyện tập · 1 phiên", "câu 1–20", "17/20 đúng", bar, chips ✓17 ✗3 | `practice_sessions[]` of the same response: `first_position`-`last_position`, `correct`, `questions`; wrong = `questions - correct`; "1 phiên" = array length |
| Rows "20:31 deteriorate / bạn trả lời …" | `GET /v1/practice/history?date=` (existing). Field names are **not in design §10** (UNVERIFIED); time must be shown in the learner's timezone |
| "Xem đủ 20 câu" | no target defined in Figma or design (see Unresolved) |
| Counts when filter is chosen | `counts` never change with `?kind=` (§10.2); filter `kind=all|learned|reviewed` has no `practice` value, so the "Luyện" tab filters on the client |
| Tháng trước / sau disabled | no field for the first month with data; "Tháng sau" disabled in the current month (client) |

## 8. Behaviour (prototype `vong-9-lich.html`, JS lines 600-758)

- **Open**: FAB click, key `L` (anywhere except inputs, design §8.5), "Mở lịch học" link in Hôm nay. Opens month = today's month, selected day = today, filter reset to Tất cả; focus goes to the selected day button. Close: focus returns to the FAB.
- **Hộp Lịch keys**: `←→` ±1 day, `↑↓` ±7 days (crossing months updates the month), `Enter` opens Ngày (cells are buttons; a click on a cell opens Ngày directly), `Esc` or `L` closes. Days after today and before `FIRST` are blocked; future cells are `disabled`.
- **Hộp Ngày keys**: `←→` previous/next day (arrow buttons disabled at the range ends), `Esc` back to Lịch (month of that day), `L` closes everything. Focus: on entering → "Lịch tháng 11" button; after a step → the arrow button that was used (or back button if it became disabled); on back → selected day.
- Month arrows: change month, selected day becomes the last day of the new month (or today if that is later), focus stays on the arrow. "Về hôm nay" appears **only when the selected day is not today or the month is not the current month**.
- Filter buttons: `aria-pressed`, a tab with 0 is `disabled`; the day title is the dialog's `aria-labelledby`; the detail area is `aria-live="polite"`. Cell `aria-label` pattern: "Thứ Năm 5/11: học 10 từ, ôn 22 lượt, luyện 20 câu" / ": không học" / ": chưa tới".
- URL: design §5.6 (`?lich=2026-11`, `?ngay=2026-11-08`, three history rules, invalid param rules). The prototype used a hash (`#tondong-lich-2026-11-08`), superseded.
- Empty copy in the prototype (no Figma frame): future day "Chưa tới ngày này."; day without activity "Ngày này không có lần học nào."; empty section under a filter "Ngày này không có." Box: dashed 1px `--line`, radius 14, padding 18, Noto 14.5 muted, bg surface.
- Day label in the prototype: lowercase weekday, plus " · hôm nay" when the day is today (not shown in a Figma frame).

## 9. Motion

Figma: `get_motion_context` on `102:3278` (recursive) returned `{"nodes":[]}`: **no keyframe animation in the file**, and prototype transitions are not exposed by the tools used (UNVERIFIED). All numbers below are from `motion-va-chuyen-canh.md` §5-§8 and the prototype CSS, ease = `--ease-out-strong` `cubic-bezier(0.23, 1, 0.32, 1)`:

| Where | Spec |
|---|---|
| FAB hover | `translateY(-2px)`, 180ms; press `scale(.95)`; tooltip fades from `translate(6px, -50%)`, 150ms, on hover/focus-visible |
| FAB when a dialog is open | `opacity 0`, `pointer-events: none`, 200ms |
| Scrim | fade 200ms; `rgb(27 36 68 / .30)` + backdrop blur (Figma 1.5px, prototype/motion doc 3px) |
| Hộp Lịch open (desktop) | from `translate(-50%, 12px) scale(.97)`, `opacity 0`, 240ms |
| Phone sheet open | from `translateY(60px)`, `opacity .4`, 240ms |
| Lịch to Ngày / back (desktop) | new dialog slides in from right `+22px` (back: from left `-22px`), `opacity 0` to 1, 220ms; Ngày width 640 vs Lịch 720 (different dialog size) |
| Lịch to Ngày (phone) | same sheet, content fades in and rises 4px, 200ms |
| Change day / month / filter | frame does not re-animate; only the day detail rises 4px and fades in, 180ms (`ddIn`) |
| Day cell hover / select | background and shadow transition 150ms; hover bg = surface at 75% |
| Close any dialog/sheet | 150ms, accelerating curve (design §8.1, GM15) |
| Reduced motion | dialog and sheet do not animate; only opacity and colour changes up to 200ms (design §8.4); prototype: all transition/animation off |

## 10. Copy table (key suggestion -> vi)

| Key suggestion | Vietnamese |
|---|---|
| `calendar.label` | lịch học |
| `calendar.title` | Tháng {month}, {year} (e.g. "Tháng 11, 2026") |
| `calendar.streak` | {days} ngày liên tiếp |
| `calendar.today` | Về hôm nay |
| `calendar.prevMonth` / `nextMonth` | Tháng trước / Tháng sau (aria) |
| `calendar.close` | Đóng (aria) |
| `calendar.weekdays` | T2, T3, T4, T5, T6, T7, CN |
| `calendar.todayLabel` | hôm nay |
| `calendar.summary.studyDays` | ngày có học (number shown as "7" + "/8") |
| `calendar.summary.learned` | từ mới đã học |
| `calendar.summary.reviewed` | lượt ôn |
| `calendar.summary.sessions` | phiên luyện |
| `calendar.legend.learn` / `review` / `practice` / `run` | Học từ mới / Ôn / Luyện tập / Ngày liền nhau |
| `calendar.keys.pick` / `open` / `close` | chọn ngày · / xem ngày · / đóng (with key caps ← → ↑ ↓, Enter, Esc) |
| `calendar.fab.aria` | Mở lịch học, phím L (prototype); tooltip "Lịch học" + L |
| `day.back` | Lịch tháng {month} |
| `day.prev` / `day.next` | Ngày trước / Ngày sau (aria) |
| `day.weekday` | thứ hai ... chủ nhật (lowercase; prototype adds " · hôm nay") |
| `day.summary` | Học {n} từ mới · ôn {n} lượt · luyện {n} câu (parts with 0 are left out, prototype) |
| `day.filter.all` / `learn` / `review` / `practice` | Tất cả / Học {n} / Ôn {n} / Luyện {n} |
| `day.learn.title` / `hint` | Học {n} từ mới / {n} nhóm |
| `day.review.title` / `hint` | Ôn {n} lượt / lật thẻ và câu ôn |
| `day.review.known` | Đã biết, lên một ngăn |
| `day.review.again` | Cần ôn lại, về ngăn 1 ngày |
| `day.more` | +{n} từ |
| `day.practice.title` / `hint` | Luyện tập · {n} phiên / câu {a}–{b} |
| `day.practice.score` | {correct}/{questions} + "đúng" |
| `day.practice.answered` | bạn trả lời {answer} (prototype wrong row: "bạn trả lời {answer} · đáp án: {key}") |
| `day.practice.all` | Xem đủ {n} câu |
| `day.empty.future` | Chưa tới ngày này. (prototype, design §5.6) |
| `day.empty.none` | Ngày này không có lần học nào. (prototype) |
| `day.empty.section` | Ngày này không có. (prototype) |
| `day.lemmaGone` | Từ không còn trong kho (design §10.3, no Figma text) |
| `cell.aria` | {Thứ} {d}/{m}: học {n} từ, ôn {n} lượt, luyện {n} câu / không học / chưa tới (prototype) |

## 11. Conflicts

| # | Topic | Figma | Prototype / doc | Suggested |
|---|---|---|---|---|
| 1 | Dialog radius | `radius/modal` 16 (and phone top corners) | `border-radius: 22` | 16 (design §3.3, Figma) |
| 2 | Scrim blur | backdrop blur 1.5 | 3px (also motion doc) | Figma is the CSS output of the frame; pick one and note: UNVERIFIED which the owner meant |
| 3 | FAB offset | desktop right 32 / bottom 32; phone right 16, 14 px above tab bar (bottom 86) | right 28 / bottom 28; phone right 16, bottom 84; `notab` bottom 20 | Figma |
| 4 | Dots | every normal cell draws all 3 dots | only the activities the day has | Prototype (a static sample in Figma); Figma still fixes position, size, colours |
| 5 | "Báo lỗi của tôi" | footer link removed (10/11, QR1) | footer link present | Figma/QR1 (design §9 M6) |
| 6 | Weekday label | "thứ năm" only (sample not today) | adds " · hôm nay" for today | Prototype, small |
| 7 | Close button, phone Lịch | separate 34 x 34 at the sheet's top-right | inside the header | Figma |
| 8 | Wrong-answer rows | none drawn (all 5 correct) | wrong rows with x and "· đáp án: …" | Prototype for the wrong state; style = `--fail-soft` badge + x icon (Figma `Số câu sai` chip uses that colour pair) |
| 9 | "Báo" of navigation arrows | both enabled | month arrows disabled at both ends, day arrows disabled at the ends | Prototype + design edge cases |
| 10 | Counts in Ôn card | sub-heading numbers 16 / 6 are lượt, overflow chip "+8 từ" counts words | same | Data mismatch, see Unresolved |
| 11 | Date size on phone Ngày | 27 px box | 24 px | UNVERIFIED |
| 12 | Font of small labels | JetBrains Mono in these frames; trial frames `156:5852` / `156:6126` (Noto Sans 13) | prototype JetBrains Mono | Same open question as M4: which one the owner picked is **UNVERIFIED** |
| 13 | Navigation | design §5.6 `?lich=` / `?ngay=` URL | hash `#screen-lich-date` | design |
| 14 | Selected day when opened | frame shows 5/11 | opens on today | Prototype (the frame is a sample) |
| 15 | Phone Lịch footer | empty 38 px strip | key hints hidden on phone | Drop the strip or keep the 20 px bottom padding only; low impact |

## 12. Unresolved

1. Empty and error states have no Figma frame: empty month, a day with no activity, future day opened, loading (skeleton), network error, a month with data older than 6 months (practice zeros, design §10.3). Only prototype copy exists for the empty day.
2. Lower bound for month navigation: the prototype hard-codes `FIRST` = 14/09/2026; the API has no "first activity" field. Figma shows "Tháng trước" enabled. Needs a rule (e.g. account creation month, or unbounded).
3. Out-of-month cells (26-31/10, 1-6/12): Figma draws 26-31/10 with dots at 55% and bands, so the data needs a second month request or the cells stay blank; 1-6/12 are "Tương lai" (ghost, no dots).
4. Ôn card: "16 Đã biết" / "6 Cần ôn lại" are lượt (`reviewed_known/again`), but chips are one per word (`items` has `times`), so "+8 từ" and the chip count do not add up to 16/6. Owner/design must say whether the heading shows lượt or words.
5. Several sessions in one day: Figma only draws "Luyện tập · 1 phiên" with one score row; with N sessions the layout (one card per session, or N score rows) is **not drawn**. The question list comes from `practice/history?date=` (not per session); how rows map to a session is not defined.
6. "Xem đủ 20 câu" target is not defined (expand in place, paginate history, or another page). Only 5 rows are drawn.
7. Streak 0 (no streak, or `studied_today=false` with a streak): FAB badge and header pill states are not drawn (prototype always shows the number). Also FAB for a month/day other than today never changes (always today).
8. Pagination of `items` (page_size 20, max 100): the dialog shows 10 chips + "+N từ"; how "+N từ" opens more (it is a plain text chip in Figma, not a button) is not drawn.
9. Sheet corner radius and font sizes of phone Ngày (date, headers) were not fetched: UNVERIFIED; the figures above come from metadata sizes and the Hộp Lịch phone code.
10. "Nút lịch trong thanh" (phone Luyện tập / Ôn sessions) sizes and states not read; behaviour only from `app-redesign-plan.md` (proposal, "chờ chủ dự án duyệt").
11. Figma prototype connections (click flows, transitions) could not be read through the available tools; flows in §8-§9 are from the HTML prototype and docs.
12. Scroll inside the dialogs (Ngày content is 1063 / 1152 px tall inside a 780 / 790 px container): scrollbar style and whether the header stays fixed are not drawn (prototype scrolls the whole dialog).
13. `me.timezone` for "today" and for the 7-hour UTC offset at the start of a month (design §10.4): handled in client code, not a design question, but the plan needs it.
14. Dark mode of the dialogs: no frames; tokens in design §7.2 only. Dot colours, band, and mark colours in Dark are not defined.
