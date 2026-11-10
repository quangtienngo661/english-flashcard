# Figma facts for M6 part B (page "Báo lỗi của tôi", its Settings row, the avatar menu), 10/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`), row y=54000 for the new page. Read-only (`get_metadata`,
`get_design_context` with `excludeScreenshot`, `get_variable_defs`, one `get_screenshot`); nothing was written to Figma or to the repo except this file.
Copy is exact Vietnamese from the frames. "raw" = value read from the node, not bound to a named Figma text style.

Notes on the method:
- The skill `figma-design-to-code` was not loaded in this session; `get_design_context` output was parsed directly. It carries font family/weight/size but
  not the text style name, so a size marked "raw" may still be a named style. Named styles seen here: `Body/Small strong` (Noto Sans SemiBold 14 / 1.5, the
  "Nút chữ"), `Body/Base strong`, `Body/Label`, `Body/Button`, `Display/Logo`; effects `Shadow/Card`, `Shadow/Pop`, `Glass/Header`.
- Fonts are the "JetBrains Mono (hiện tại)" variant. The font trial frame (`156:4349`) was not compared for these pages. Unresolved, same as m4-a.
- Token values (`--bg`, `--ink`, `--muted`, `--line`, `--surface`, `--accent`, `--accent-soft`, `--pass`, `--on-accent`, `--mark`, `radius/xl` 20, `radius/lg` 14,
  `radius/modal` 16, `radius/md` 10) are the ones in design §7.2; `get_variable_defs` on the "Đã xác nhận lỗi" dot returned `var(--pass) = #1b7a46`.
- Frames read: page desktop `211:5827` (1440 x 751) / phone `211:6061`; transactions desktop `122:4203` (1440 x 1042) / phone `122:4354` (390 x 1069);
  Settings desktop `120:4295` (1440 x 1985) / phone `120:4559` (390 x 1789); Settings with menu open desktop `181:5456` (1440 x 900); menu `181:316`.
  Phone Settings with menu open `181:5748` was **not** read (UNVERIFIED; assumed the same row and menu as the desktop one).

---

## 1. Page "Báo lỗi của tôi" — desktop `211:5827`, phone `211:6061`

Route per design: `/app/settings/reports` (group `(chrome)`, `Tab=Không`). Name of the frames: "Báo lỗi của tôi — Desktop 1440" / "— Mobile 390".

### 1.1 Chrome (same as the transactions page)

- Background instance "Nền lưới chấm" (mesh + grain: four glows navy, yellow, green, light navy, grain layer 40% multiply; description of `95:315`/`95:321`).
- Top bar: "Thanh trên app/Desktop" (`149:4381` inside, component set `54:502`, `Tab=Không`: no tab is highlighted) 64 px; phone "Thanh trên app/Mobile"
  (`54:503`) 56 px with a 18 px gradient "Bóng dưới" strip (`rgba(30,58,138,0.12)` to 0).
- Phone bottom: "Thanh tab dưới" 72 px, no tab active (all four labels `--muted`, Noto Sans Regular 12).
- Floating calendar button "Nút lịch nổi" present on both (desktop 62 x 66 at bottom 32, right 32; phone 54 x 58 at bottom 86, right 16), shows "T11", "8", streak "6".
  Drop shadow `0 24 28 rgba(27,36,68,.34), 0 2 3 rgba(27,36,68,.08)`, radius 16.

### 1.2 Desktop content (`211:5830`, name "Nội dung")

- Column: width **1160**, centred (left 140), flex column, **gap 20**, padding top **32**, bottom **124**, no side padding.
- Order top to bottom:
  1. "Quay lại": icon/back 16 + text **"Cài đặt"**, gap 4, Noto Sans SemiBold 14 `--accent` (so the label is "Cài đặt", no "‹" glyph; the chevron is the icon).
  2. Title **"Báo lỗi của tôi"**: Bricolage Grotesque ExtraBold **44**, line-height 1.1, letter-spacing **-1.122 px**, `--ink`, one line.
  3. One group per month ("Nhóm tháng 11, 2026", "Nhóm tháng 10, 2026"), each: flex column, **gap 12**, full width.
     - Month label: JetBrains Mono Medium **12**, `--muted`, lower-case, format **"tháng 11, 2026"** (month number without leading zero, comma, year).
     - Card: bg `--surface`, 1 px `--line`, radius **`radius/xl` 20**, shadow `0 10 28 -14 rgba(27,36,68,.20), 0 1 2 rgba(27,36,68,.06)` (= `Shadow/Card`),
       padding **12 horizontal, 6 vertical**, rows stacked.
  4. Footnote (JetBrains Mono Medium 12, `--muted`, wraps to full width): **"ngày theo múi giờ của bạn · câu do AI viết mà đúng là lỗi thì được trả lại 1 lượt câu AI"**.
- Months are in descending order (11/2026 then 10/2026); rows inside a month descending by date (08/11 then 05/11; 28/10 then 20/10).
- Back link and title are not in a card. No "Gói học" block (it exists on the transactions page, removed here).

### 1.3 Desktop row (e.g. `211:5998`, name "Dòng 08/11/2026")

Row: flex row, **gap 16**, align centre, padding **16 vertical, 12 horizontal**, radius **12**, full width of the card. Four cells left to right:

| # | Cell | Width | Font | Colour | Content |
|---|---|---|---|---|---|
| 1 | date sent | fixed **100**, height 16 | JetBrains Mono Medium 12 | `--muted` | `dd/MM/yyyy`, e.g. "08/11/2026" |
| 2 | "Loại và kỳ", flex 1, min-w 1, `nowrap`, `overflow: clip` | fill | line 1 Noto Sans SemiBold **15**; line 2 Noto Sans Regular **14** | line 1 `--ink`; line 2 `--muted` | line 1 `"<từ> · <lý do>"`; line 2 `"<kiểu câu>"` or `"<kiểu câu> · Đã trả lại 1 lượt câu AI"` |
| 3 | "Trạng thái" | fixed **130** | dot 8 x 8 + gap 6 + label Noto Sans SemiBold **14** | see 1.5 | status |
| — | no chevron, no amount column, no divider between cell 3 and the edge | | | | |

Rows inside one card: the first row has no top border. In the **second** row of both cards the Figma node has **no `border-t`** (checked in `211:6010` and `211:6049`),
whereas the transactions page puts `border-top 1px --line` on its second row (`182:5641`). See Conflicts.

### 1.4 Phone content (`211:6064`)

- Column: width 390, **padding 16 left/right**, gap **16**, padding top **20**, bottom **100**.
- Back link: same as desktop. Title: Bricolage Grotesque ExtraBold **30**, line-height 1.1, letter-spacing **-0.699 px**.
- Month group: gap 12; label same as desktop. Card: same fill, border, radius 20, shadow; padding **16 horizontal, 4 vertical**.
- Row (`211:6224`): flex row, **gap 12**, align centre, padding **12 vertical, 4 horizontal**, no radius; text cell fills; status cell right-aligned at the end
  ("Số tiền" frame, flex column, items end; contains only the status: dot 8 + gap 6 + label 14 SemiBold).
  - Line 1: Noto Sans SemiBold 15 `--ink`, `nowrap`: `"<từ> · <lý do>"`.
  - Line 2 (gap 2 below line 1): **JetBrains Mono Medium 12 `--muted`**, may wrap (`min-w-full`): `"<kiểu câu>"` or `"<kiểu câu> · Đã trả lại 1 lượt câu AI"`.
  - **The date sent is not shown on the phone rows.** In the transactions phone rows the date is the start of line 2 ("01/11/2026 · dùng ..."); in the reports phone
    rows line 2 has no date. Because the group header only gives the month, the day of the report is not visible on the phone. See Conflicts.
- Footnote: same text as desktop, JetBrains Mono Medium 12 `--muted`, full width.
- Differences desktop vs phone: date column dropped; line 2 changes from Noto Sans Regular 14 to JetBrains Mono Medium 12; status column fixed 130 becomes content width, right-aligned;
  title 44 to 30; side padding 0 (centred 1160 column) to 16; card padding 12/6 to 16/4; row padding 16/12 to 12/4; row radius 12 to 0; no hover/radius row on phone.

### 1.5 Statuses drawn (each dot 8 x 8 circle, gap 6, label Noto Sans SemiBold 14)

| Label (exact) | Dot | Label colour | Where drawn |
|---|---|---|---|
| **Đang xem** | `#1E3A8A` (= `--accent`) | `--accent` | 08/11/2026 deteriorate |
| **Đã xác nhận lỗi** | exported SVG `5b964` has `fill="#666666"` (see Unresolved); text uses `--pass` `#1b7a46`; `get_variable_defs` on the dot node returns `--pass #1b7a46` | `--pass` | 05/11/2026 allocate |
| **Đã sửa** | same asset `5b964` as "Đã xác nhận lỗi" | `--pass` | 20/10/2026 mitigate |
| **Không có lỗi** | `#525A78` (= `--muted`) | `--muted` | 28/10/2026 viable |

The footnote and the owner's note say: Đang xem navy; Đã xác nhận lỗi and Đã sửa green; Không có lỗi grey. Only these four labels are drawn.
Whether the API has more states (e.g. `open`, `rejected`) is not shown by Figma; the plan must map API statuses to these four.

### 1.6 Sample rows drawn (copy exact; use as test fixtures only after checking the API)

| Date | Line 1 | Line 2 | Status |
|---|---|---|---|
| 08/11/2026 | deteriorate · Đáp án sai | điền từ vào câu · câu AI | Đang xem |
| 05/11/2026 | allocate · Câu khó hiểu | chọn nghĩa trong câu · Đã trả lại 1 lượt câu AI | Đã xác nhận lỗi |
| 28/10/2026 | viable · Nghĩa không đúng | trắc nghiệm | Không có lỗi |
| 20/10/2026 | mitigate · Đáp án sai | gõ từ · theo nghĩa | Đã sửa |

So: question types drawn are "điền từ vào câu", "chọn nghĩa trong câu", "trắc nghiệm", "gõ từ"; the suffix " · câu AI" is appended to line 2 of the first row only
(a cloze question made by AI); the other AI row shows "Đã trả lại 1 lượt câu AI" instead. Reasons drawn: "Đáp án sai", "Câu khó hiểu", "Nghĩa không đúng".
"theo nghĩa" in the "gõ từ" row is a sub-type suffix (UNVERIFIED what it maps to; probably the question mode). Whether the reason labels equal the admin-managed report reasons
is not known from Figma.

### 1.7 States not drawn

- Empty state (no reports): **not drawn.** Page loading and error: not drawn. Use the nearest frame and `ui-best-practices.md` §6, §9 as design §3.2 step 5 says.
- Row click: no chevron and no detail dialog drawn, so rows are not interactive (read-only list).
- Dark: not drawn for this page.

---

## 2. Differences from "Lịch sử giao dịch" (`122:4203` / `122:4354`)

Shared exactly: top bar, mesh background, floating calendar button, back link "Cài đặt", title style (44 / 30), month label style, card shape (radius 20, same shadow,
padding 12/6 desktop and 16/4 phone), row padding and gap (16/12 and 16 gap desktop; 12/4 and 12 gap phone), column paddings (pt 32, pb 124 desktop; pt 20, pb 100, px 16 phone),
footnote style (JetBrains Mono 12 `--muted`).

| Aspect | Lịch sử giao dịch | Báo lỗi của tôi |
|---|---|---|
| Title | "Lịch sử giao dịch" | "Báo lỗi của tôi" |
| Row cells (desktop) | date 100, type and period (fill), amount 110 right (Noto Sans Bold 15), status 130, chevron 18 | date 100, "từ · lý do" and type (fill), status 130; **no amount, no chevron** |
| Row line 2 (desktop) | "dùng 08/11/2026 – 07/02/2027" | "điền từ vào câu · câu AI" etc. |
| Row line 2 (phone) | JetBrains Mono 12, starts with the date | JetBrains Mono 12, **no date** |
| Phone right column | amount over status, then chevron | status only |
| Rows clickable | yes (opens "Chi tiết giao dịch") | no |
| Divider between rows of one card | `border-top 1px --line` on the 2nd row | **absent in the Figma nodes** (see Conflicts) |
| Footnote | "ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch" | "ngày theo múi giờ của bạn · câu do AI viết mà đúng là lỗi thì được trả lại 1 lượt câu AI" |
| Extra block under footnote | card "Gói học" (icon in `--accent-soft`, "Pro tới hết 07/02/2027", "Gói học hiện tại", "Xem gói học →") | **none** |
| Status colours | `--pass` dot for success; `#525A78`-like grey for "Đã hoàn tiền" | navy, `--pass`, grey as in 1.5 |
| Frame height | 1042 desktop | 751 desktop (shorter content) |

---

## 3. Settings, section "Tài khoản" — the row "Báo lỗi của tôi"

Frames: desktop `120:4295` (node `211:5801`, x 25, y 164, 878 x 54), phone `120:4559` (node `211:5808`, 324 x 54), desktop with menu open `181:5456` (node `211:5814`).

Order inside the "Tài khoản" card (desktop y): Đăng nhập bằng (57) / **Lịch sử giao dịch (110)** / **Báo lỗi của tôi (164)** / Đăng xuất (218, 73 high) / "Xóa tài khoản" (291).
So the new row sits directly **below** "Lịch sử giao dịch" and above "Đăng xuất". Same order on phone (y 126, 180, 234, 307).

Desktop row (copy of the "Lịch sử giao dịch" row, `get_design_context` for both is identical except the label):
- Flex row, gap 20, align centre, padding 16 vertical, **`border-top 1px --line`**, height 54.
- Label cell width **230**, text **"Báo lỗi của tôi"**: Noto Sans SemiBold **15**, `--ink`, no sub-line (no description under it, unlike "Đăng xuất").
- Spacer ("Giá trị trống"), flex 1.
- Trailing instance "Nút chữ: Xem" (component "Nút chữ" `166:326`, variant Thường): text **"Xem"**, Noto Sans SemiBold 14 (`Body/Small strong`), `--accent`, no underline, no background, no icon.
  **There is no chevron icon and no "›" on the Settings row**; the action is the text button "Xem". (The transactions list rows have the chevron; this row does not.)
- Icon: **none** on the row.
Phone row: label and "Xem" on one line (label cell 281 wide, button right-aligned at x 293); no spacer; height 54; same border-top. Code must keep touch target at least 44 px
(component note).

---

## 4. Avatar menu — component "Menu ảnh đại diện" `181:316` (260 wide)

Container: bg `--surface`, 1 px `--line`, radius **`radius/modal` 16**, padding **8**, gap **2** between children, drop shadow `Shadow/Pop`
(`0 24 28 rgba(27,36,68,.34), 0 2 3 rgba(27,36,68,.08)` as the code expresses it), width **260**, height 310. Description: "Menu mở khi bấm ảnh đại diện ở thanh trên. Đăng xuất nằm cuối, tách bằng đường chia. Tô nền mục của trang đang mở."

Children in order:

| # | Name | Content | Icon (16 x 16) |
|---|---|---|---|
| 1 | "Người dùng" (not a link) | name **"Nguyễn Lan"** Noto Sans Bold 14 `--ink`; email **"lan.nguyen@gmail.com"** Noto Sans Regular 13 `--muted`; padding 12, `nowrap` | none |
| — | "Đường chia" | 1 px line, `--line`, full width | |
| 2 | "Mục Tài khoản" | **Tài khoản** | `icon/user` |
| 3 | "Mục Cài đặt" | **Cài đặt** | `icon/gear` |
| 4 | "Mục Lịch sử giao dịch" | **Lịch sử giao dịch** | `icon/receipt` |
| 5 | "Mục Báo lỗi của tôi" (`211:5781`, **new**) | **Báo lỗi của tôi** | **`icon/flag`** (`211:5787`, a single image asset, not the nested "Group" vector structure the other icons use) |
| — | "Đường chia" | 1 px line `--line` | |
| 6 | "Mục Đăng xuất" | **Đăng xuất** | `icon/logout` |

Every item: flex row, gap **12**, padding **12**, radius **8**, label Noto Sans SemiBold **14** `--ink`, `nowrap`, icon 16 then label. Item height = 12 + 20 + 12.
Placement: the new item is **after "Lịch sử giao dịch" and before the separator/"Đăng xuất"**, as the design says. The menu is placed in `181:5456` at x 1148, y 60 (below the 64 px bar,
right aligned: 1148 + 260 = 1408 = right edge minus 32). Open state: "Tô nền mục của trang đang mở" (the active item gets a filled background; the fill colour is not
exposed in this instance and was **not** read; assume `--accent-soft`, UNVERIFIED).
Settings frames with the menu open (`181:5456` desktop, `181:5748` phone) are the Settings frame plus this component; nothing else on the page differs (checked the desktop one:
same blocks and the same new row `211:5814`).

---

## 5. Copy table (suggested message key to vi text)

Keys are suggestions in the repo's namespace style (`App.…`); the plan should rename to match `messages/vi.json`.

| Suggested key | vi text |
|---|---|
| `App.settings.reports.title` (page title, row label, menu item) | Báo lỗi của tôi |
| `App.settings.reports.back` | Cài đặt |
| `App.settings.reports.rowAction` (Settings row button) | Xem |
| `App.settings.reports.monthLabel` | tháng {month}, {year} |
| `App.settings.reports.note` | ngày theo múi giờ của bạn · câu do AI viết mà đúng là lỗi thì được trả lại 1 lượt câu AI |
| `App.settings.reports.refunded` | Đã trả lại 1 lượt câu AI |
| `App.settings.reports.aiSuffix` (line 2 of an AI cloze row) | câu AI |
| `App.settings.reports.status.open` (Đang xem) | Đang xem |
| `App.settings.reports.status.confirmed` | Đã xác nhận lỗi |
| `App.settings.reports.status.fixed` | Đã sửa |
| `App.settings.reports.status.rejected` (Không có lỗi) | Không có lỗi |
| `App.nav.avatarMenu.reports` | Báo lỗi của tôi |
| `App.practice.session.report.done` (design §9 M6) | Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi. |
| Question types drawn (map to existing question-type labels if present) | điền từ vào câu · chọn nghĩa trong câu · trắc nghiệm · gõ từ |
| Reasons drawn (map to admin-managed report reasons) | Đáp án sai · Câu khó hiểu · Nghĩa không đúng |
| Unchanged menu labels | Tài khoản · Cài đặt · Lịch sử giao dịch · Đăng xuất |

---

## 6. Conflicts (Figma vs design text)

1. **Chevron vs text button on the Settings row.** The task wording and design §9 M6 say "một dòng", the owner's note says nothing about a chevron; Figma has a text button
   **"Xem"** (same as "Lịch sử giao dịch" row), not a chevron. Follow Figma.
2. **Phone rows have no date.** Design §9 M6 says each row shows "ngày gửi, ..."; on the phone frame the date is absent (the transactions phone rows carry it inside line 2).
   Months only group them. Either follow Figma (no date on phone) or add the date to line 2 as the transactions page does; needs a call. Recommend adding it (a report list
   with no day is hard to scan), but that diverges from Figma.
3. **Divider between rows.** Transactions second row has `border-top 1px --line`; the reports second row (both frames) has none, so two rows in one card are separated only
   by padding. Looks like a drawing omission since the page was "built from" the transactions frame; UNVERIFIED which is intended.
4. **Status dot colour of "Đã xác nhận lỗi" and "Đã sửa".** The exported dot SVG is `#666666`, the label and variable are `--pass #1b7a46`. The owner's note says "xanh".
   Use `--pass` for the dot; the `#666666` looks like an export artefact of a bound variable (UNVERIFIED).
5. **Status set.** Design/owner note names four labels; the API may return more states. Not decided in Figma.
6. **Settings "Tài khoản" order.** Design §9 M6 says "cạnh 'Lịch sử giao dịch'"; Figma puts the row directly after it (before "Đăng xuất"). Matches in substance.
7. **Hộp Lịch footer link.** The old "Báo lỗi của tôi" link at the foot of the calendar dialog is removed in Figma (note in `app-redesign-plan.md`), consistent with design M6 ("link ở chân hộp Lịch đã bỏ"); not re-read here.
8. **Page redirect.** Design §10.4: `/app/practice/history?tab=reports` redirects to `/app/settings/reports`. No Figma involvement.

## 7. Unresolved

- Active-item fill colour in the avatar menu and the phone open-menu frame `181:5748` (not read). Hover/focus style of the Settings row, of "Xem" and of menu items: not drawn.
- Empty, loading, error states of the reports page: not drawn.
- Real dot colour for the green statuses (`#666666` in the asset vs `--pass`).
- Which of the font variants (JetBrains Mono vs Noto Sans labels, frame `156:4349`) the owner chose for the app labels; this page uses JetBrains Mono for the month label, date,
  footnote and phone line 2.
- Mapping of "theo nghĩa" (row `mitigate`) and "câu AI" suffix to API fields; whether line 2 should append " · câu AI" for every AI question or only when not refunded.
- Dark values for this page and for the new menu item: not drawn.
- The Settings left-side table of contents (desktop "Mục lục") has no new entry (Tài khoản stays the last); confirmed from `120:4349` children: six entries, no "Báo lỗi".
