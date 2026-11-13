# Figma facts for M7 part A (Cài đặt, menu ảnh đại diện, Tài khoản, Xóa tài khoản, Lịch sử giao dịch), 11/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`). Read-only: `get_metadata`, `get_design_context` (screenshots excluded),
`get_variable_defs`, three `get_screenshot` (dialog `122:4637`, Settings desktop `120:4295`, phone "Học tập" card `120:4629`). Nothing was written to Figma.
Copy is exact Vietnamese from the frames. "raw" = value typed on the node, not bound to a variable or a named style.

Method notes:
- The resource `skill://figma/figma-design-to-code/SKILL.md` could not be read: no MCP resource reader tool exists in this session (ToolSearch for
  "ReadMcpResource" returned nothing). `get_design_context` output was parsed directly.
- Named text styles seen in these frames: only `Body/Button` (Noto Sans SemiBold 15 / 1.4, button labels) and `Body/Small strong` (Noto Sans SemiBold 14 / 1.5,
  "Nút chữ" labels); `Body/Base` (16 / 1.6) inside the field and select components; top-bar styles (`Display/Logo`, `Body/Small`, `Body/Label`, `Body/Base strong`).
  **Every other text node in these frames is raw** and most have `line-height: normal` (Figma "auto"), not a fixed value.
- Effect styles: `Shadow/Card` = `0 1 2 #1B24440F, 0 10 28 -14 #1B244433`; `Shadow/Pop` = `0 2 6 #1B244414, 0 24 56 -24 #1B244457`; `Shadow/Soft` (button Phụ) =
  `0 1 2 #1B24440D, 0 14 34 -14 #1B244438`; `Shadow/Row` (segmented) = `0 1 2 #1B24440F, 0 4 12 -8 #1B244429`. These equal design §7.2. The generated code
  prints `drop-shadow(0 24 28 …)` for Shadow/Pop: that is the exporter halving blur, not a different value.
- Variables confirmed with `get_variable_defs` (Light): `--bg #f6f7fa`, `--surface #ffffff`, `--ink #1b2444`, `--muted #525a78`, `--ghost #c9cedc`, `--line #e1e5ee`,
  `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--on-accent #ffffff`, `--pass #1b7a46`, `--pass-soft #e4f2ea`, `--fail #b8352a`, `--fail-soft #f8e7e5`, `--mark #ffd84a`,
  `--mark-ink #1b2444`; `radius/sm 6`, `radius/md 10`, `radius/button 10`, `radius/lg 14`, `radius/modal 16`, `radius/xl 20`, `radius/pill 999`.
  **The danger colour is `--fail`, not `--danger`** (no `--danger` variable is bound anywhere in these frames).
- Fonts: Bricolage Grotesque (titles, card headings, big numbers), Noto Sans (body, labels, buttons), JetBrains Mono Medium 12 (dates, counts, month labels, receipt line).
- Current code was read only to compare (not changed): `SettingsPage.tsx`, `AvatarMenu.tsx`, `AccountPage.tsx` (grep), `DeleteAccountPage.tsx` (grep),
  `TransactionDetail.tsx`/`TransactionRow.tsx` (grep), `UsageSection.tsx` (grep), `settings-api.ts` (grep), `messages/vi.json` (`App.settings`, `App.account`,
  `App.transactions`, `App.deleteAccount`, `App.chrome`).
- M6-b (`GIAO_DIEN_MOI_PLAN_FIGMA_FACTS_2026-11-10-m6-b.md`) facts on `120:4295`, `120:4559`, `181:5456`, `181:316`, `122:4203`, `122:4354` were re-checked and hold.
  M6-b listed `181:5748` as unread; it is read here (§3).

---

## 0. Shared chrome and components (node ids)

| Thing | Node / component | Facts read here |
|---|---|---|
| Background | instance "Nền lưới chấm" (component `95:315` / `95:321`) | full-frame, behind everything |
| Top bar desktop | instance of "Thanh trên app/Desktop" (set `54:502`), variant node `149:4381` `Tab=Không` | 64 high, px 32, gap 20, bg `rgba(255,255,255,.62)` + blur 12, bottom border `rgba(221,225,234,.8)`; no tab highlighted (all labels `--muted` SemiBold 15). Right end: search box 260 (`Tìm từ` + key `/`), primary "Thêm từ" + key `N`, chip "Pro" (SemiBold 13 `--muted`), **avatar 36 round (radius 18), raw gradient `#1e3a8a → #3d78ff`, letter "L" Noto Sans SemiBold 16 `--on-accent`**, right edge at x 1408 |
| Top bar phone | instance of "Thanh trên app/Mobile" (`54:503`) | 56 high, px 16, gap 12; logo, search button 40 round `--bg`, **avatar 36 solid `--accent`** (not the gradient), still carries "Bóng dưới" 18 px gradient strip (design §3.1 says drop it) |
| Bottom tab bar (phone) | instance "Thanh tab dưới", variant node `149:4350` `tab=Không` (set `54:637`) | 72 high, bg `--surface`, top hairline `0 -1 0 rgba(27,36,68,.08)`, pb 12, px 12; four items 84 wide, icon 22 in pill, label Noto Sans Regular 12 `--muted`; no active tab |
| Floating calendar button | instance "Nút lịch nổi" (component `95:343`) | desktop 62 x 66 at right 32, bottom 32; phone 54 x 58 at right 16, 14 px above the tab bar; surface, radius 16, `Shadow/Pop`; navy month strip 20 high "T11" JetBrains Mono Bold 10; day "8" Bricolage ExtraBold 26; streak pill `--mark` "6" with flame, border 2 `--bg`. Description: "Ẩn khi modal mở". It is **still drawn behind** the open avatar menu frames (menu is not a modal) |
| Back link | **local frame "Quay lại"** (no component) | icon/back 16 + "Cài đặt" Noto Sans SemiBold 14 `--accent`, gap 4, 68 x 19 (touch target must be enlarged in code) |
| Button | "Nút" set `3:12`: variants **Chính** (`3:4`) and **Phụ** (`3:8`) only, boolean "Có mũi tên" | Chính: `--accent`, radius `radius/button` 10, px 20 py 12, `Body/Button` `--on-accent`, navy glow. Phụ: `--surface`, border 1 `--line`, `Shadow/Soft`, label `--ink`. **No danger variant**: "Xóa vĩnh viễn" is a Chính instance with fill overridden to `--fail` |
| Text button | "Nút chữ" set `166:326`: Thêm (`166:316`, icon +), Thường (`166:320`, `--accent`), Phụ (`166:322`, `--muted`), Xóa (`166:324`, `--fail`) | `Body/Small strong`, no background, no underline. Description: "đi tới trang khác thì giữ '→' trong nhãn"; "vùng bấm tối thiểu 44 px trên điện thoại" |
| Field | "Ô nhập" set `34:345` (Thường / Đang nhập / Lỗi) | label SemiBold 14 / 1.6 above, box **h 48, radius `radius/md` 10, px 14**, value Noto Sans Regular **16** / 1.6; Thường border 1.5 `--line`; Đang nhập border **2** `--accent` + ring **4 px `rgba(30,58,138,.16)`**; Lỗi border 2 `--fail` + icon + red hint 13. **Not instanced** in Tài khoản / Xóa tài khoản: those use local frames (§4, §5) |
| Checkbox | "Ô tick" set `34:355` (20 px, radius 6) — **not used here**. Xóa tài khoản uses **"Ô chọn nhỏ" set `96:315`** (variant `96:311` Đã chọn=Có: 18 px, radius 5, `--accent`, check 12; `96:314` Không: `--surface`, border 1.5 `--ghost`) | |
| Select | "Ô chọn" set `46:326` (Đóng / Mở): label, box h 48, radius 10, flag 20 x 13, value Regular 16, chevron 20; Mở = border 2 `--accent` + 4 px ring. Menu `46:327`: 380 wide, radius `radius/lg` 14, p 6, items p 10 radius 10, selected item `--accent-soft` + `--accent` SemiBold 16 + check, `Shadow/Lift` | **Not instanced** in Settings; Settings has a compact local frame (§1.4 row 8) |
| Switch | "Công tắc" set `138:324` (Bật=Có / Không), **44 x 26**, vector image. Description: "Khóa (gói Miễn phí): đặt opacity 50% trên instance" | **Not instanced** in Settings: local frame "Công tắc (bật)" **42 x 24** image (navy track, white knob, per screenshot) |
| Segmented | "Nút chia đoạn" set `138:319`: one option, **h 32, radius pill**, selected = `--surface` + `Shadow/Row`, label SemiBold 14 `--ink`; unselected label `--muted`. Description: place instances in a `--bg` pill track with padding 4 | **Not instanced** in Settings; Settings draws a different local segmented (§1.4 row 9) |
| Key | "Phím" `3:17` | 22 high, `--accent-soft`, radius `radius/sm` 6, Noto Sans SemiBold 12 / 1.4 `--accent` |
| Avatar menu | "Menu ảnh đại diện" `181:316` | §3 |

---

## 1. Cài đặt — desktop `120:4295` (1440 x 1985), phone `120:4559` (390 x 1789)

Route `/app/settings`. Read with `get_design_context` on `120:4346` (desktop content) and `120:4571` (phone content); screenshot of the desktop frame.

### 1.1 Desktop layout (`120:4346`)
- Content column: x 140, **w 1160**, flex column, **gap 20**, **pt 32, pb 124**, no side padding.
- Title **"Cài đặt"**: Bricolage Grotesque ExtraBold **44**, line-height 1.1, letter-spacing **-1.122 px**, `--ink`, raw. **No back link** on this page.
- Grid `120:4348`: flex row, **gap 32**: table of contents "Mục lục" `120:4349` (**w 200**) then "Các mục" `120:4362` (flex 1 = **928**), flex column, **gap 16** between section cards.

### 1.2 Table of contents (desktop only, `120:4349`)
Flex column, gap 2. Each entry: px 12, py 8, radius **10** (raw), height 36, text Noto Sans **14.5** (raw), line-height normal.
- Active entry (drawn on the first, "Thông tin cá nhân"): bg `--surface` + `Shadow/Card`, **SemiBold**, `--ink`.
- Other entries: no background, **Regular**, `--muted`.
- Entries in order: **Thông tin cá nhân · Gói và mức sử dụng · Học tập · Thông báo · Phím tắt · Tài khoản** (six; no "Báo lỗi", no "Pháp lý").
- Sticky / scroll-spy behaviour: not expressed in Figma (UNVERIFIED; the frame is static).

### 1.3 Section card and row anatomy
Card (desktop and phone): bg `--surface`, border 1 `--line`, **radius 18 (raw; not `radius/xl` 20 used by every other card in these frames)**, `Shadow/Card`.
Padding desktop **24 top / 24 sides / 6 bottom**; phone **16 top / 16 sides / 6 bottom**.
Inside: heading (Bricolage Grotesque **Bold 20**, line-height normal, `--ink`), then an 8 px spacer ("Cách"), then rows. **Every row, including the first, has
`border-top 1px --line`**; rows have **py 16**.

Desktop row: flex row, **gap 20**, align centre.
- Label cell **w 230**, flex column gap 2: label Noto Sans **SemiBold 15** `--ink`; optional hint Noto Sans **Regular 13** `--muted` (wraps inside 230).
- Value cell (flex 1): Noto Sans **Regular 15** `--ink`; or a spacer "Giá trị trống" when the row has only a control.
- Trailing control at the right edge.
- Heights: 54 (label only), 73 (label + one-line hint), 91 (hint on two lines), 55 (shortcut rows).

Phone row: flex column, **gap 6**, py 16. Line 1 = label column (flex 1) + trailing control (gap 12). Line 2 = the value (Regular 15 `--ink`, full width) or the
bar or the segmented. Rows with only a control keep it on line 1.

### 1.4 Every row (desktop node ids; phone ids in brackets)

Data source column = what the current code reads (`SettingsPage.tsx`, `UsageSection.tsx`, `settings-api.ts`, read this session), for mapping; not from Figma.

| # | Section | Label (+ hint) | Value drawn | Control drawn | Goes to / does | Data source today |
|---|---|---|---|---|---|---|
| 1 | Thông tin cá nhân `120:4363` (`120:4575`) | **Họ và tên** | "Nguyễn Lan" | Nút chữ Thường **"Sửa"** `166:5364` (`166:5372`, phone: line 1 right) | `/app/settings/account` | `displayName(me)` = `family_name` + `given_name` |
| 2 | | **Ngày sinh** | "14/03/2004" (dd/MM/yyyy) | **none** (code has "Sửa") | — | `me.birth_date` (code formats it `full`) |
| 3 | | **Email** | "lan.nguyen@gmail.com" | none | — | `me.email` |
| 4 | Gói và mức sử dụng `120:4385` (`120:4594`) | **Gói hiện tại** | "Pro" (SemiBold 15 `--ink`) + "· tới hết 07/02/2027" (Regular 15 `--muted`), gap 6 | Nút chữ Thường **"Xem gói học"** `166:5366` (no "→") | `/app/plans` | `entitlements.plan`, `pro_until` |
| 5 | | **Phiên luyện hôm nay** + "Còn 28 phiên, mở lại lúc 00:00" | bar + count **"đã dùng 2/30"** | — | — | `pools.practice_sessions.used/limit/remaining/resets_at` |
| 6 | | **Lượt câu AI** + "Lượt câu AI mới vào 01/12" | bar + **"còn 280/300"** | — | — | `pools.ai_practice.remaining/limit/resets_at` |
| 7 | | **Lượt tra AI** + "Lượt tra AI mới vào 01/12" | bar + **"còn 92/100"** | — | — | `pools.ai_lookup.*` |
| 8 | Học tập `120:4424` (`120:4629`) | **Ngôn ngữ** + "Nghĩa của từ và giao diện" | — | compact select "Chọn ngôn ngữ" `120:4427` showing **"Tiếng Việt"** (phone: line 1 right) | opens a language choice (menu not drawn here) | `PATCH /v1/me {native_language}` then locale switch |
| 9 | | **Giao diện** + "Sáng, tối hoặc theo máy" | — | segmented `120:4438`: **Sáng · Tối · Theo hệ thống**, "Theo hệ thống" selected (phone: line 2, full-width track) | sets theme | local `useTheme().setChoice` |
| 10 | Thông báo `120:4451` (`120:4654`) | **Nhắc học qua email** + "Lúc 20:00 giờ của bạn, chỉ khi có từ đến hạn" | — | switch "Công tắc (bật)" `120:4454`, **on** | toggles reminders | `GET/PATCH /v1/me/reminders {enabled}`; time from `config.reminders.send_time` |
| 11 | Phím tắt `120:4462` (**desktop only**) | **Thêm từ vừa gặp** | — | key **N** | info only | static |
| 12 | | **Tra từ** | — | key **/** | | |
| 13 | | **Lật thẻ trong phiên ôn** | — | key **Space** (51.5 wide) | | |
| 14 | | **Cần ôn lại · Đã biết** | — | keys **1**, **2** (gap 4) | | |
| 15 | | **Thoát phiên ôn** | — | key **Esc** (36.5 wide) | | |
| 16 | Tài khoản `120:4507` (`120:4664`) | **Đăng nhập bằng** | two "Đã có" items: icon/check 14 + **"Mật khẩu"**, icon/check 14 + **"Google"**; Noto Sans SemiBold **13.5** `--pass`, gap 5 inside, 16 between (phone: line 2) | none | — | `me.sign_in_methods` |
| 17 | | **Lịch sử giao dịch** | — | Nút chữ Thường **"Xem"** `166:5368` (`166:5376`) | `/app/settings/transactions` | — |
| 18 | | **Báo lỗi của tôi** | — | Nút chữ Thường **"Xem"** `211:5806` (`211:5812`) | `/app/settings/reports` | — |
| 19 | | **Đăng xuất** + "Thoát khỏi thiết bị này" | — | local frame "Nút chữ: Đăng xuất" `181:5442` (`181:5449`): icon/logout 16 + **"Đăng xuất"** SemiBold 14 `--accent`, gap 6 | logs out | `store.logout()` |
| 20 | | (no label; row holds only the button) | — | Nút chữ **Xóa "Xóa tài khoản"** `166:5370` (`166:5378`), `--fail` | `/app/settings/delete-account` | — |

Bars (rows 5–7): track `--line`, **h 6, radius 3**; fill `--accent`, radius 3, left-aligned; count JetBrains Mono Medium 12 `--muted`, `nowrap`.
Desktop: bar is the flex-1 middle cell, count at the right. Phone: count on line 1 right, bar full width on line 2.
**Fill widths drawn: 19 / 521 px (2/30 used), 19 / 528 px ("còn 280/300"), 22 / 536 px ("còn 92/100")** — about 4 % each, so the AI bars do **not** show
"remaining" (93 %, 92 %) and are not exactly "used" either (7 %, 8 %). See Conflicts 7.

Row 8 compact select (`120:4427`, desktop and phone): border **1** `--line`, radius 10 (raw), px 12, py 8, gap 8; "Tiếng Việt" Noto Sans **SemiBold 14** `--ink`;
icon/down 16; **119 x 37; no flag**. The open state of this control is not drawn in these frames.

Row 9 segmented (`120:4438`, 232 x 38): track border 1 `--line`, **radius 11**, padding 3, gap 2, no fill; options px 12 py 6, **radius 8**, Noto Sans SemiBold
**13.5**; **selected = bg `--ink`, text `--surface`**; unselected text `--muted`, no fill. Phone (`120:4642`): the track is full width (324) but the three options keep
their widths and sit at the left, leaving empty track on the right (confirmed in the screenshot).

Row 10 switch: drawn **on** (navy track, white knob). Locked / off states not drawn in this frame (component `138:324` has Bật=Không).

### 1.5 Phone layout (`120:4571`)
- Content: px **16**, pt **20**, pb **100**, gap **16**. Title "Cài đặt" Bricolage ExtraBold **30**, letter-spacing **-0.699 px**.
- **No table of contents. No "Phím tắt" section** (five cards: Thông tin cá nhân, Gói và mức sử dụng, Học tập, Thông báo, Tài khoản).
- Card padding 16/16/6, radius 18; rows as §1.3 (stacked).
- "Đăng xuất" stays a row inside "Tài khoản" with the text button on line 1 (no separate full-width button).
- Bottom tab bar and floating calendar button present.

### 1.6 States not drawn
Free plan ("Gói hiện tại" for Free, AI pools with limit 0, the locked switch), Google-only account (no "Mật khẩu" item; code's "Đặt mật khẩu" row), staff account
(code's "Liên hệ admin để xóa tài khoản"), reminders off, loading and error, dark. Hover/focus of rows and text buttons not drawn.

---

## 2. Settings rows vs the current code and copy (plan input)

| Item | Figma | Current code / `vi.json` |
|---|---|---|
| Theme hint | "Sáng, tối hoặc theo máy" | `themeHint` "Sáng, tối hoặc theo hệ thống của máy" |
| Reminder hint | "Lúc 20:00 giờ của bạn, chỉ khi có từ đến hạn" | `remindersHint` "Lúc {time} giờ của bạn, chỉ khi có thẻ chờ ôn" |
| Practice hint | "Còn 28 phiên, mở lại lúc 00:00" (no full stop) | `practiceLeft` ends with "." |
| AI hints | "Lượt câu AI mới vào 01/12", "Lượt tra AI mới vào 01/12" (no full stop) | `aiPracticeRefill`, `aiLookupRefill` end with "." |
| Birth date | "14/03/2004" | formatted `full` |
| "Sửa" on Ngày sinh | absent | present |
| Plan row action | text button "Xem gói học" | whole row is a link, chevron on phone |
| Transactions / delete rows | text button "Xem" / red text button "Xóa tài khoản" | whole row link + chevron |
| Sign-in methods | two green check items | text "Mật khẩu · Google" |
| Phone language / theme | inline compact select / inline segmented | value + chevron opening a dialog |
| Phone sign-out | row with text button | full-width button at the end, row hidden on phone |
| Order in "Tài khoản" | Đăng nhập bằng, Lịch sử giao dịch, Báo lỗi của tôi, Đăng xuất, Xóa tài khoản | Lịch sử giao dịch, Đăng xuất, Đăng nhập bằng, (Đặt mật khẩu), Xóa tài khoản |

---

## 3. Avatar menu — component `181:316`; open frames desktop `181:5456` (1440 x 900), phone `181:5748` (390 x 844)

Component: 260 wide, 310 high; bg `--surface`, border 1 `--line`, radius `radius/modal` **16**, padding **8**, gap **2**, `Shadow/Pop`.
Description: "Menu mở khi bấm ảnh đại diện ở thanh trên. Đăng xuất nằm cuối, tách bằng đường chia. Tô nền mục của trang đang mở."

| # | Node | Content | Icon (16) | Implied href |
|---|---|---|---|---|
| 1 | "Người dùng" `181:317` (not interactive) | **"Nguyễn Lan"** Noto Sans **Bold 14** `--ink`; **"lan.nguyen@gmail.com"** Noto Sans Regular **13** `--muted`; p 12, `nowrap` | none | — |
| — | "Đường chia" `181:320` | 1 px `--line`, full width | | |
| 2 | "Mục Tài khoản" `181:321` | **Tài khoản** | `icon/user` | `/app/settings/account` |
| 3 | "Mục Cài đặt" `181:327` | **Cài đặt** | `icon/gear` | `/app/settings` |
| 4 | "Mục Lịch sử giao dịch" `181:333` | **Lịch sử giao dịch** | `icon/receipt` | `/app/settings/transactions` |
| 5 | "Mục Báo lỗi của tôi" `211:5781` | **Báo lỗi của tôi** | `icon/flag` `211:5787` (single vector image) | `/app/settings/reports` |
| — | "Đường chia" `181:339` | 1 px `--line` | | |
| 6 | "Mục Đăng xuất" `181:340` | **Đăng xuất** | `icon/logout` | action: log out |

Items: flex row, gap **12**, padding **12**, radius **8** (raw), label Noto Sans **SemiBold 14** `--ink`, `nowrap`; item height 44.
**Active item** (the page that is open): in both open frames "Cài đặt" has fill **`--bg` `#f6f7fa`** (phone instance binds `var(--bg)`; desktop instance shows raw
`#f6f7fa`). Hover / keyboard focus style: not drawn.

Placement:
- Desktop `181:5717`: x **1148**, y **60**; right edge 1408 = avatar right edge (page right padding 32); top 10 px below the avatar (avatar y 14–50), 4 px above
  the bar's bottom edge.
- Phone `181:5936`: x **114**, y **52**; right edge 374 = avatar right edge (gutter 16); top 6 px below the avatar (avatar y 10–46), overlapping the 56 px bar by 4 px.
- Same 260 width on phone (not a sheet). No scrim. The page under the menu is unchanged (checked node lists of both frames; the new "Báo lỗi của tôi" row is
  present as `211:5814` / `211:5821`).

Versus current `AvatarMenu.tsx` (read this session): code has **Cài đặt, Gói học (with plan chip), Đăng xuất** with `Sun`/`Crown`/`LogOut` icons, menu
`w-64`, avatar `bg-primary-soft` with `--ink` letter. Figma has **no "Gói học" item**, adds Tài khoản, Lịch sử giao dịch, Báo lỗi của tôi, and the avatar is navy
with a white letter.

---

## 4. Tài khoản — desktop `121:4297` (1440 x 833), phone `121:4404` (390 x 907)

Route `/app/settings/account`. Content desktop `121:4348`: x 140, w 1160, gap **20**, pt 32, pb 124. Back link "Cài đặt", title **"Tài khoản"** (44 / 1.1 / -1.122).

Column "Cột" `121:4355`: **w 720, left-aligned** (not centred), flex column, **gap 16**. No right-hand aside (code has `AccountAside` with plan card and shortcuts).

### 4.1 Card "Thông tin" `121:4361`
bg `--surface`, border 1 `--line`, radius **`radius/xl` 20**, `Shadow/Card`, padding **24**, flex column, **gap 28** between the two groups.

Group "Hồ sơ" `180:5411` (flex column, gap 16):
1. Heading **"Hồ sơ"** Bricolage Grotesque Bold 20 `--ink`.
2. Two fields side by side (gap 16, each flex 1 = 327):
   - label **"Tên"**, value "Lan";
   - label **"Họ (không bắt buộc)"**, value "Nguyễn".
3. Field label **"Ngày sinh"**, box **w 220**, value "14/03/2004"; hint under it **"Wordmet dành cho người từ 13 tuổi."** Noto Sans Regular 13 `--muted`.
4. Button **"Lưu thay đổi"** (`121:4385`, Nút Chính, no arrow), 133 x 45, left-aligned, drawn enabled.

Field anatomy (local frames "Ô nhập", not component `34:345`): label Noto Sans SemiBold **14** `--ink`, gap 6; box bg `--surface`, **border 1.5 `--line`, radius 12
(raw), h 44, px 16**; value Noto Sans Regular **15** `--ink`.

Group "Email đăng nhập" `180:5414` (flex column, gap 12):
1. Heading **"Email đăng nhập"** Bricolage Bold 20.
2. Flex-wrap row (gap 6 / 12): **"lan.nguyen@gmail.com"** Noto Sans **SemiBold 16** `--ink` (plain text, **not a field**), then badge **"Đã xác minh"**:
   bg `--pass-soft`, radius 6, px 8, py 3, gap 4, icon/check 13, Noto Sans **Bold 12** `--pass`. No edit control for email.

### 4.2 Card "Gói học" `180:5423`
bg `--surface`, border 1 `--line`, radius **`radius/lg` 14**, `Shadow/Card`, px 20, py 16, gap 16, centred. Icon tile 40 x 40 `--accent-soft`, radius 12, icon/star 20.
Text: **"Gói Pro"** Noto Sans Bold 16 `--ink`; **"30 phiên luyện mỗi ngày"** Noto Sans Regular 14 `--muted`. Trailing Nút chữ Thường **"Xem gói →"** (`180:5431`) → `/app/plans`.

### 4.3 Phone (`121:4416`)
px 16, pt 20, pb 100, gap 16; title 30. Card padding **16** (gap 28 kept). Name fields **stacked** (gap 16), full width 324; birth-date field **full width 324**
(desktop 220). "Lưu thay đổi" stays **133 wide, left-aligned** (not full width). "Gói học" card padding 16.

### 4.4 Not drawn
Focus, error (e.g. under 13), saving/disabled button, unverified email (no badge), Free plan in the card, success toast.

---

## 5. Xóa tài khoản — desktop `121:4503` (1440 x 776), phone `121:4634` (390 x 1130)

Route `/app/settings/delete-account`. Back link "Cài đặt", title **"Xóa tài khoản"** (44 desktop / 30 phone).

### 5.1 Desktop layout
Column "Cột" `121:4561`: **w 960, left-aligned**, flex **row**, **gap 20**, align start.
- **Left: card "Xác nhận" `121:4597`, w 400** (the input column).
- **Right: card "Bị xóa và còn giữ" `121:4562`, flex 1 = 540.**
Both cards: `--surface`, border 1 `--line`, radius `radius/xl` 20, `Shadow/Card`, padding 24.

### 5.2 Left card, in order (flex column, gap 16)
1. Heading **"Xác nhận xóa"** Bricolage Bold 20 `--ink`.
2. Warning box `121:4591`: bg **`--fail-soft`**, radius **14** (raw), padding 16, gap 8, align start; icon/alert 18; text **"Thời gian Pro còn lại sẽ mất, không hoàn tiền."**
   Noto Sans **SemiBold 14.5** `--fail`.
3. Checkbox row `121:4598` (gap 12, centred): "Ô chọn nhỏ" `121:4599` (set `96:315`, **drawn checked**) + **"Tôi hiểu dữ liệu sẽ mất và không khôi phục được"** Noto Sans Regular 15 `--ink`.
4. Field **"Gõ lại email của bạn"**, value "lan.nguyen@gmail.com" (same local field anatomy as §4.1).
5. Field **"Mật khẩu"**, value "••••••••••", **icon/eye 18** at the right; drawn in **focus**: border 1.5 **`--accent`** + ring **`0 0 0 3px #e7ecf8`** (raw = `--accent-soft` value).
6. Danger button **"Xóa vĩnh viễn"** `121:4615`: Nút Chính with fill **`--fail`**, label `Body/Button` `--on-accent`, drop shadow `rgba(184,54,41,.30)` offset y 10 (design §7.2 red
   button shadow), radius 10, 138 x 45, **left-aligned, drawn enabled**.

### 5.3 Right card (flex column, gap 24 on desktop)
- **"Những gì bị xóa"** Bricolage Grotesque **Bold 16** `--ink`; list gap 8; each item: marker **"×"** Noto Sans Bold 14.5 **`--fail`** in a 14 px column, gap 6, text Noto Sans Regular **14.5** `--ink`:
  - Dữ liệu học: nhóm, lịch ôn, lịch sử trả lời
  - Từ riêng và câu bạn tự viết
  - Gói của bạn
  - Mọi phiên đăng nhập
- **"Những gì còn được giữ"** (same style), marker **"·"** Bold **`--muted`**:
  - Hồ sơ thanh toán 10 năm, không kèm tên bạn
  - Báo lỗi bạn đã gửi, không kèm tên
  - Số lượt đã dùng, không kèm tên bạn
  - Số liệu tổng hợp, không nhận ra bạn

All eight lines equal the current `App.deleteAccount.deleted.*` / `kept.*` copy, except "10 năm" which code takes from config (`kept.payments` with `{years}`, fallback `paymentsNoYears`).

### 5.4 Phone (`121:4646`)
**Order is reversed: the info card "Bị xóa và còn giữ" (`121:4654`) comes first, the confirm card (`121:4689`) second**, gap 16. Cards padding **16**.
In the phone info card the two lists are separated by **`border-top 1px --line` + pt 16** on the second list, gap 16 (desktop: gap 24, no divider).
"Hồ sơ thanh toán 10 năm, không kèm tên bạn" wraps to two lines. Button stays 138 wide, left-aligned. Fields full width 324.

### 5.5 Not drawn
Unchecked / disabled-button state, field errors, wrong password, **Google-only account** (code shows "Xác nhận bằng Google" instead of the password field,
plus `wrongAccount` / `googleFailed` messages), **renewing plan blocks deletion** (code `blocked` "Bạn đang có gói tự gia hạn. Hủy gói trước khi xóa tài khoản."
+ link "Đến trang Gói"), account without Pro time (warning box hidden?), staff account, the confirmation dialog (none drawn; code submits directly), the
"account deleted" page.

---

## 6. Lịch sử giao dịch — desktop `122:4203` (1440 x 1042), phone `122:4354` (390 x 1069)

Route `/app/settings/transactions`. M6-b §2 facts re-checked; added detail below.

### 6.1 Desktop (`122:4254`)
Back link "Cài đặt", title **"Lịch sử giao dịch"** (44). Month groups, **gap 20** between groups (y 139, 272, 405, 610), newest first. Group: flex column gap 12.
- Month label JetBrains Mono Medium 12 `--muted`, lower-case **"tháng 11, 2026"** (no leading zero).
- Card: `--surface`, border 1 `--line`, `radius/xl` 20, `Shadow/Card`, px 12, py 6.
- Row: flex row, **gap 16**, px 12, **py 16**, radius 12, align centre; **2nd and later rows of a card have `border-top 1px --line`** (`182:5641`).

| Cell | Width | Style | Example |
|---|---|---|---|
| date | 100 | JetBrains Mono Medium 12 `--muted` | 01/11/2026 |
| "Loại và kỳ" | flex 1, `nowrap` | line 1 Noto Sans SemiBold 15 `--ink`; line 2 Noto Sans Regular 14 `--muted` | Mua · Pro · 3 tháng / dùng 08/11/2026 – 07/02/2027 |
| amount | 110, right-aligned | Noto Sans **Bold 15**, `--ink`; refund amount **`--pass`** with "−" (U+2212) | 199.000 ₫ / −79.000 ₫ |
| status | 130 | dot 8 + gap 6 + Noto Sans SemiBold 14 | ● Thành công |
| chevron | 18 | icon/chev (colour from the SVG; UNVERIFIED token) | › |

Status colours (dot via `get_variable_defs`, label from code): **"Thành công"** dot `--pass`, label `--pass`; **"Đã hoàn tiền"** dot **`--ghost`**, label `--muted`.

Rows drawn:

| Month | Date | Line 1 | Line 2 (desktop) | Amount | Status |
|---|---|---|---|---|---|
| tháng 11, 2026 | 01/11/2026 | Mua · Pro · 3 tháng | dùng 08/11/2026 – 07/02/2027 | 199.000 ₫ | Thành công |
| tháng 8, 2026 | 08/08/2026 | Mua · Pro · 3 tháng | dùng 08/08 – 07/11/2026 | 199.000 ₫ | Thành công |
| tháng 7, 2026 | 22/07/2026 | Hoàn tiền · Pro · 1 tháng | không có kỳ | −79.000 ₫ (green) | Thành công |
| tháng 7, 2026 | 20/07/2026 | Mua · Pro · 1 tháng | dùng 20/07 – 19/08/2026 | 79.000 ₫ | Đã hoàn tiền |
| tháng 6, 2026 | 15/06/2026 | Cấp gói · Pro | dùng 15/06 – 14/07/2026 | 0 ₫ | Thành công |

Formats: period with en dash and spaces; same-year range drops the year from the first date ("08/08 – 07/11/2026"), cross-year keeps both; grants show
"Cấp gói · Pro" without an interval and **"0 ₫"**; refunds show "không có kỳ". Money "199.000 ₫" (dot thousands, space, ₫).

Under the groups:
- Footnote (JetBrains Mono Medium 12 `--muted`): **"ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch"**.
- Card "Gói học" `182:5668`: `radius/lg` 14, px 20, py 16, gap 16, `Shadow/Card`; icon tile 40 `--accent-soft` radius 12 + icon/star; **"Pro tới hết 07/02/2027"** Noto Sans Bold 16;
  **"Gói học hiện tại"** Regular 14 `--muted`; Nút chữ **"Xem gói học →"** → `/app/plans`.

### 6.2 Phone (`122:4366`)
px 16, pt 20, pb 100, gap 16; title 30. Card px **16**, py **4**. Row: flex row, **gap 12**, px **4**, py **12**, no radius; 2nd row has `border-top` (`182:5723`).
- Left column flex 1, gap 2: line 1 SemiBold 15 `nowrap`; line 2 **JetBrains Mono Medium 12** `--muted`, wraps, **starts with the date**:
  "01/11/2026 · dùng 08/11/2026 – 07/02/2027", "22/07/2026 · không có kỳ", "15/06/2026 · dùng 15/06 – 14/07/2026".
- Right column "Số tiền", items end: amount Bold 15 over status (dot + label 14).
- Chevron 18.
- Footnote same text, wraps to two lines. "Gói học" card padding 16; "Pro tới hết 07/02/2027" wraps to two lines.

### 6.3 Not drawn
Empty state, loading, error (copy already in `vi.json`: `emptyTitle`, `emptyBody`, `errorTitle`, `errorBody`, `retry`), "Xem thêm" paging (`more` exists in code),
statuses **"Đang chờ"** and **"Đã hủy hoàn tiền"** (code has `pending`, `reversed`), kinds **Gia hạn, Đổi kỳ, Dùng thử** (code has `renewal`, `plan_change`, `trial`),
Free user with no plan card, row hover/focus, dark.

---

## 7. Chi tiết giao dịch — desktop `122:4484` (1440 x 900), phone `182:5856` (390 x 844)

### 7.1 Desktop dialog `122:4637`
- Page behind (`182:5760`) = the list frame. Scrim "Nền mờ" `122:4636`: **`rgba(27,36,68,0.30)` + backdrop blur 1.5 px**, full frame.
- Dialog: **520 x 532**, centred horizontally (x 460), y 110; bg `--surface`, **no border**, radius **`radius/modal` 16**, **`Shadow/Pop`**, padding **28 x / 24 y**, flex column, **gap 16**.

Content in order:
1. Header row (gap 12): title **"Chi tiết giao dịch"** Bricolage Grotesque **ExtraBold 24**, letter-spacing **-0.5**, `--ink`; close button "Đóng" **36 x 36**, `--surface`,
   border 1 `--line`, radius 10, icon/x 18.
2. Receipt "Biên lai" (centred, gap 8, py 4):
   - **"mua · pro · 3 tháng"** JetBrains Mono Medium 12 `--muted` (lower-case kind · plan · interval);
   - **"199.000 ₫"** Bricolage Grotesque **ExtraBold 40**, letter-spacing **-0.84**, `--ink`;
   - status dot 8 + **"Thành công"** Noto Sans SemiBold **13.5** `--pass`.
3. "Đường cắt": full-width **dashed** line (SVG; light grey in the screenshot; token UNVERIFIED, likely `--line`).
4. Four detail rows (each py 6, gap 12; label left Noto Sans Regular **14.5** `--muted`; value right Noto Sans **SemiBold 14.5** `--ink`):
   - **Thời điểm** — "01/11/2026, 20:14"
   - **Kỳ được dùng** — "08/11/2026 – 07/02/2027"
   - **Cổng thanh toán** — "payOS"
   - **Mã giao dịch** — "WM-261101-6F3K2Q" in **JetBrains Mono Medium 13** `--ink` + **icon/copy 16** (copy-to-clipboard implied)
5. Help text **"Có câu hỏi về giao dịch này? Gửi mã giao dịch cho đội Wordmet qua mục Liên hệ."** Noto Sans Regular 14 `--muted` (plain text; "Liên hệ" not styled as a link).
6. Footer right-aligned: button **"Đóng"** (`122:4672`, Nút Phụ): `--surface`, **border 1.5** `--line`, radius 10, px 20, py 12, `Body/Button` `--ink`, **no shadow**, 83 x 48.

### 7.2 Phone sheet `182:5952`
- Scrim `182:5951` covers the whole 390 x 844 frame **including the bottom tab bar**.
- Sheet "Tấm Chi tiết giao dịch": **390 x 541, anchored to the bottom** (y 303), **top corners `radius/modal` 16**, `Shadow/Pop`, padding **pt 12, px 16, pb 24**, gap 16.
- Grab handle "Tay kéo": 40 x 5, `--line`, radius 3, centred.
- Same content as desktop; "Đóng" button **full width** (358 x 48). No safe-area inset drawn.

### 7.3 Versus current `TransactionDetail.tsx`
Code lists Loại, Gói, Số tiền, Thời điểm (`full` date), Kỳ được dùng, Trạng thái (chip), Cổng thanh toán (`providers.fake` "Giả (thử)"), Mã giao dịch; help text hidden for grants.
Figma folds Loại + Gói into the mono receipt line, Số tiền into the big number, Trạng thái under it; Thời điểm uses dd/MM/yyyy. A grant (no provider, no id)
is not drawn: which rows hide is UNVERIFIED in Figma (code hides provider/id when absent and the help text for grants).

---

## 8. Copy table (Figma text → existing key or suggested key)

| Key (existing unless marked new) | Figma vi text | Note |
|---|---|---|
| `App.settings.title` | Cài đặt | same |
| `App.settings.personal` / `fullName` / `birthDate` / `email` / `edit` | Thông tin cá nhân / Họ và tên / Ngày sinh / Email / Sửa | same |
| `App.settings.planUsage` / `currentPlan` / `seePlans` | Gói và mức sử dụng / Gói hiện tại / Xem gói học | same |
| new `App.settings.planUntil` | {plan} · tới hết {date} | "Pro" SemiBold ink + rest muted |
| `App.settings.practiceToday` / `used` | Phiên luyện hôm nay / đã dùng 2/30 | same |
| `App.settings.practiceLeft` | Còn 28 phiên, mở lại lúc 00:00 | **drop the final "."** |
| `App.settings.aiPractice` / `aiLookup` / `remaining` | Lượt câu AI / Lượt tra AI / còn 280/300 | same |
| `App.settings.aiPracticeRefill` / `aiLookupRefill` | Lượt câu AI mới vào 01/12 / Lượt tra AI mới vào 01/12 | **drop the final "."** |
| `App.settings.learning` / `language` / `languageHint` | Học tập / Ngôn ngữ / Nghĩa của từ và giao diện | same |
| `App.settings.theme` / `themeHint` | Giao diện / **Sáng, tối hoặc theo máy** | hint changes |
| `App.settings.themeLight/Dark/System` | Sáng / Tối / Theo hệ thống | same |
| `App.settings.notifications` / `reminders` / `remindersHint` | Thông báo / Nhắc học qua email / **Lúc {time} giờ của bạn, chỉ khi có từ đến hạn** | hint changes |
| `App.settings.shortcuts` + `shortcut*` | Phím tắt / Thêm từ vừa gặp / Tra từ / Lật thẻ trong phiên ôn / Cần ôn lại · Đã biết / Thoát phiên ôn | same; keys N, /, Space, 1 2, Esc |
| `App.settings.account` / `signInMethods` / `methodPassword` / `methodGoogle` | Tài khoản / Đăng nhập bằng / Mật khẩu / Google | same |
| `App.settings.transactions` + new `App.settings.view` | Lịch sử giao dịch / Xem | "Xem" new |
| new `App.settings.reports` | Báo lỗi của tôi | M6 adds it |
| `App.settings.logout` / `logoutHint` / `deleteAccount` | Đăng xuất / Thoát khỏi thiết bị này / Xóa tài khoản | same |
| `App.chrome.account`… avatar menu labels | Tài khoản · Cài đặt · Lịch sử giao dịch · Báo lỗi của tôi · Đăng xuất | `App.chrome.account` today is "Tài khoản của bạn" (aria-label); menu item "Tài khoản" needs its own key; drop `plans` item |
| `App.account.title` / `givenName` / `familyName` / `birthDate` / `verified` / `save` | Tài khoản / Tên / Họ (không bắt buộc) / Ngày sinh / Đã xác minh / Lưu thay đổi | same |
| new `App.account.profile` | Hồ sơ | new heading |
| new `App.account.loginEmail` | Email đăng nhập | new heading (replaces field label "Email") |
| new `App.account.ageHint` | Wordmet dành cho người từ 13 tuổi. | check `DateOfBirthField` for an existing hint |
| `App.account.planLine` | **Gói Pro** (title) / **30 phiên luyện mỗi ngày** (line) | today one line "Gói {plan} · {count} phiên luyện mỗi ngày" |
| new `App.account.seePlan` | Xem gói → | |
| `App.deleteAccount.*` | Xác nhận xóa (new `confirmTitle`); all other lines equal current copy | "10 năm" comes from `{years}` |
| `App.transactions.title` / `back` | Lịch sử giao dịch / Cài đặt | same |
| new `App.transactions.month` | tháng {month}, {year} | |
| `App.transactions.used` | **dùng {period}** | lower-case "dùng" (today "Dùng {period}") |
| new `App.transactions.noPeriod` | không có kỳ | |
| `App.transactions.footWeb` / `footPhone` | **ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch** (both sizes) | one text replaces two |
| `App.transactions.planGrant` / `planUntil` | **Pro tới hết {date}** + "Gói học hiện tại" + "Xem gói học →" | today "Gói {plan} · tới hết {date}" |
| `App.transactions.detail.*` | Chi tiết giao dịch / Thời điểm / Kỳ được dùng / Cổng thanh toán / Mã giao dịch / help / Đóng | same strings; `atValue` uses dd/MM/yyyy |
| line 1 format | {kind} · {plan} · {interval} ("Mua · Pro · 3 tháng"); grant "Cấp gói · Pro" | today "{kind} · {money}" |

---

## 9. Conflicts

Design text = `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` §3.1, §3.3, §7, §9 M7 (lines ~606–632). Design rule: Figma wins on looks, the API wins on behaviour.

1. **Field component vs drawn fields.** §7 maps "Ô nhập `34:345`" to `Field`, §3.3 says inputs radius 10. The component is h 48, radius 10, px 14, value 16, focus
   border 2 + 4 px ring `rgba(30,58,138,.16)`. Tài khoản and Xóa tài khoản draw **local** fields: h 44, **radius 12**, px 16, value **15**, focus border **1.5** +
   **3 px ring `#e7ecf8`**. Recommend the component (it is what `Field` will be built from); record a ruling.
2. **Segmented control.** §3.3: only switch, segmented and avatar are fully round; component `138:319` is a white pill on a `--bg` track. Settings "Giao diện"
   draws a **square-ish** track (radius 11, options radius 8) with the **selected option filled `--ink`** and white text. Needs a call: reuse `Segmented` (component)
   or add a second style for Settings.
3. **Select.** Component `46:326` (h 48, flag, Regular 16) vs Settings compact local "Chọn ngôn ngữ" (h 37, no flag, SemiBold 14, border 1). The open menu for Settings
   is not drawn; `46:327` is 380 wide with flags.
4. **Switch size.** Component `138:324` 44 x 26 vs Settings local 42 x 24.
5. **Settings card radius 18 (raw)** vs `radius/xl` 20 on every other card in these frames. Inside §3.3's 14–28 range, but off-token.
6. **"→" on navigation text buttons.** The "Nút chữ" description (and §3.3 "Hành động phụ") says a text button that opens another page keeps "→".
   Account "Xem gói →" and Transactions "Xem gói học →" follow it; Settings "Xem gói học", "Xem" (×2) and "Sửa" do not.
7. **Usage bars.** Rows say "còn 280/300", "còn 92/100" (remaining) but the fills are ~4 %, closer to "used". Current code fills AI bars by `remaining`. Figma does not
   settle which quantity the bar shows.
8. **§9 M7 "Tài khoản … (email chỉ đọc, như `AccountPage.tsx`)".** Matches in substance, but Figma shows the email as plain text with a "Đã xác minh" badge under a new
   heading "Email đăng nhập", not as a read-only field as `AccountPage.tsx` does. Figma also drops the right-hand aside (plan + shortcuts) and puts the plan card under the form.
9. **§9 M7 "Xóa tài khoản (cột nhập bên trái)".** True on desktop. On the phone the **info card comes first** and the input card second, so the DOM order (or a CSS
   `order`) must differ between sizes.
10. **§9 M7 "Hộp Hủy gói (`SubscriptionRows.tsx`, `SettingsPage.tsx`)".** `SettingsPage.tsx` has no cancel-plan code (read this session); the cancel flow lives only in
    `PlansPage.tsx` / `SubscriptionRows.tsx`. Figma Settings has no "Hủy gói" row either.
11. **Top bar shadow.** §3.1 table: no shadow under either top bar. The phone top bar instance still has "Bóng dưới". Follow the design text (already decided).
12. **Avatar.** Desktop avatar raw gradient `#1e3a8a → #3d78ff`, phone avatar solid `--accent`. Not covered by the design text; pick one (the gradient is a raw value,
    which the token rule in §3.2 step 2 forbids).
13. **Secondary button "Đóng".** §7.2: secondary buttons use `Shadow/Soft`, component `3:8` border 1. The dialog instance has border **1.5** and **no shadow**, and the
    screenshot renders its border **dark**, although `get_variable_defs` on `122:4672` binds only `--ink`, `--surface`, `--line`. UNVERIFIED which is intended.
14. **No danger button variant.** "Xóa vĩnh viễn" is a Chính instance recoloured to `--fail` with the §7.2 red shadow. The `Button` component needs a `danger` variant
    that the Figma component set does not have.
15. **Floating calendar button vs open avatar menu.** The component says the button hides when a modal opens; the menu frames keep it visible. The menu is a popover,
    not a modal, so this is consistent; noted so the plan does not hide it for the menu.

Figma vs current code (not design-text conflicts, but the plan must change code): avatar menu items (§3), Settings row order and controls (§2), copy (§8),
transaction row line 1 format and footnote (§6, §8), detail layout (§7.3), `--fail` naming.

---

## 10. UNVERIFIED / not drawn

- Hover, focus-visible and pressed states for Settings rows, text buttons, TOC entries, menu items, transaction rows.
- TOC behaviour (sticky, scroll-spy, click scrolls to section).
- Language select open state for Settings; theme change animation.
- Free plan, Google-only, staff, reminders-off, AI-limit-0 ("Cần gói Pro") states of Settings.
- Delete account: unchecked/disabled, errors, Google re-auth variant, renewing-plan block, no-Pro-time variant.
- Transactions: empty, loading, error, paging, statuses pending/reversed, kinds renewal/plan change/trial; colour token of the chevron and of the dashed receipt line.
- Copy-to-clipboard feedback for "Mã giao dịch" (no toast drawn).
- Dark mode for all frames here (not searched in this pass).
- Intermediate widths 768–1279 (not drawn; design §3.2 step 4).
- Whether the "Đóng" button border is `--line` or darker (§9 item 13).
