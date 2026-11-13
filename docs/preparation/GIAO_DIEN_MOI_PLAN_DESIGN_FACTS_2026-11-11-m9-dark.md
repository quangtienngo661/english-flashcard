# Design facts cho M9 (chế độ tối), 11/11/2026

Source: worktree `gm-plan-9` @ `4bb42658` (docs equal `origin/docs/giao-dien-moi-plan-8`; `packages/design-tokens/` and `apps/web/src/app/globals.css`
are byte-identical to `origin/refactor/giao-dien-moi` @ `aecb4475`, checked with `git diff --quiet`). Figma file `JKnyUUtGjpGpfKK4PqBfdY`, read-only:
`get_metadata` on `2:2` (Hệ thống), `2:4` (Ghi chú), `35:307` (Đăng nhập và tài khoản); `get_variable_defs` on `95:315`, `95:321`, `54:656`, `54:502`,
`3:2`, `5:13`, `35:361`, `37:485`, `117:4712`, `82:3368`, `178:5895`, `73:966`, `102:3948`; `get_screenshot` (viewed) of the notes frame `20:422` and of the
pages `0:1`, `2:2`, `2:3`, `55:306`. Artifact `GKfEHX3Yeq4LqXKRF8kuDM` read (`Artifact read`) and its comments read (`ArtifactComments read`).

Method and limits:
- `get_variable_defs` returns the **Light** value only (as design §7.2 already notes). Dark values cannot be re-read without the Plugin API (`use_figma`),
  which this pass did not use. Every Figma Dark value below comes from design §7.2 (read with `valuesByMode` on 09/11/2026), **not re-read this session**.
- Contrast ratios marked "computed" were calculated this session with the WCAG 2.x formula (script in the session scratchpad, not committed).
- "raw" = a colour not bound to a variable.

---

## 0. Big picture (surprises first)

1. **No record that the owner approved the dark mockup.** The M1 as-built says "mockup tối chờ chủ dự án duyệt" (`docs/deliveries/giao-dien-moi.md:250`).
   No decision, ruling or later delivery entry closes it (grep of `docs/` for `GM4`, `toi-5-man`, `mockup tối`, `dark mockup`). The artifact has **no
   comment threads**. Design §14 (`…-design.md:900`) requires "5 mockup tối đã duyệt" before the final PR.
2. **The dark mockup predates the background decision.** `toi-5-man.html` (commit `b48d3624`, 10/11 02:12) draws the round-9 **dot grid + two glows**
   (`toi-5-man.html:43–47`); the owner switched to **mesh + grain** the same day (QBG, commit `26c5113e`, 10/11 12:50; decisions:317–333). So dark
   mesh/grain has **no reference anywhere**; code runs a stop-gap (`mix-blend-mode: screen; opacity: .12`, `globals.css:439–443`) labelled "tuned with the
   dark mockups in M9".
3. **Figma has no dark frame on any page.** Thumbnails of `0:1`, `2:2`, `2:3`, `55:306` and every frame name on `35:307` are light; the notes frame says
   "Chưa làm: Khung tablet và khung Dark (biến đã có mode Dark)" (`20:434`) and "Lưới chấm và quầng dùng màu cố định nên chưa có bản Dark" (`103:4848`).
   Only the 15 colour variables have a Dark mode. Effect styles, stage chips, group colours and the mesh halos are not colour variables, so Figma's Dark
   mode would not change them.
4. **The 15 core colours agree exactly** between Figma Dark (§7.2), `toi-5-man.html` `.wm-dark` and `web-dark.css`. Every other dark value is missing,
   provisional or contradicts another reference (§3).
5. **Light-only group tokens break in dark today (code fact, not design):** the `-ink` inks used for the big "thẻ chờ" numbers measure **2.17–3.61:1** on
   the dark surface, and the `-wash` row of the group picker turns near-white under light dark-mode text, **1.01:1** (§6).
6. **Two dark proposals conflict** for button shadow and scrim: `toi-5-man.html` (button glow `rgb(141 162 255 / .35)`, navy scrim 30 %) versus mockup rounds
   9–15 (button shadow `none`, black scrim 55 %, deeper card shadows). Rounds 6–15 also use an **older dark palette** (`#10131c`, `#1a1f2d`, `#2e3549`,
   `#3a4157`) that is not Figma's.
7. **Coverage:** the dark mockup has 5 **phone** screens only. No desktop dark reference exists for the app; no dark reference at all for 8 of the 9
   auth pages, the legal pages, sources, 404, `/app/recall`, the reports page, or the dialogs without Figma frames (§5).

---

## 1. `docs/mockups/2026-11-05-redesign-concepts/toi-5-man.html`

Created by plan Task M1.12 (`docs/superpowers/plans/2026-11-10-giao-dien-moi.md:567–575`), commit `b48d3624` (10/11/2026 02:12). Published as
https://claude.ai/artifact/GKfEHX3Yeq4LqXKRF8kuDM (`docs/deliveries/giao-dien-moi.md:239`). The live artifact's style block, five templates and script
read the same as the repo file (compared by reading both this session; not byte-diffed).

### 1.1 Screens

Each row shows one 390 px phone screen, light frame left, dark frame right (`toi-5-man.html:108–109`, `:186–214`). List and notes (`:188–194`):

| # | Screen | Note in the file | Nearest Figma phone frame |
|---|---|---|---|
| 1 | Hôm nay | Thẻ "Còn 38 thẻ", màu nhóm, khối "Lần luyện gần nhất", nút + và thanh tab | `117:4712` |
| 2 | Nhóm (băng chuyền) | Chồng giữa nét, hai chồng bên mờ; số thẻ chờ dùng màu nhóm | `82:3368` |
| 3 | Phiên luyện, trả lời sai | Đúng / Sai luôn kèm dấu và chữ; nền nhạt của pass, fail ở chế độ Tối | `178:5895` |
| 4 | Hộp Thêm từ | Tấm trượt trên lớp mờ navy; ô đang nhập có viền nhấn và vòng sáng | `73:966` |
| 5 | Đăng nhập | Card giữa trên lưới chấm; ô lỗi kèm câu báo lỗi | `37:485` |

The screens are simplified sketches, not copies of the Figma frames (e.g. Hôm nay is a list card "Còn 38 thẻ hôm nay", while Figma `117:4425` has a group hero
with a 96 px number, Figma facts M3 A line 59). Layout comparison beyond that: UNVERIFIED.

### 1.2 Token values (`.wm-light` `:18–22`, `.wm-dark` `:23–28`)

| Token | Light | Dark | Dark source |
|---|---|---|---|
| `--bg` | `#f6f7fa` | `#0f1220` | Figma §7.2 |
| `--surface` | `#ffffff` | `#171b2a` | Figma |
| `--ink` | `#1b2444` | `#eceef5` | Figma |
| `--muted` | `#525a78` | `#a6adc4` | Figma |
| `--ghost` | `#c9cedc` | `#353c53` | Figma |
| `--line` | `#e1e5ee` | `#2a3044` | Figma |
| `--accent` | `#1e3a8a` | `#8da2ff` | Figma |
| `--accent-soft` | `#e7ecf8` | `#1f2747` | Figma |
| `--on-accent` | `#ffffff` | `#0f1220` | Figma |
| `--mark` / `--mark-ink` | `#ffd84a` / `#1b2444` | same | Figma (unchanged in Dark) |
| `--pass` / `--pass-soft` | `#1b7a46` / `#e4f2ea` | `#62c98f` / `#142a1e` | Figma |
| `--fail` / `--fail-soft` | `#b8352a` / `#f8e7e5` | `#ff8d80` / `#311a18` | Figma |
| `--sh-card` | `0 1px 2px rgb(27 36 68/.06), 0 10px 28px -14px rgb(27 36 68/.20)` | `0 1px 2px rgb(0 0 0/.4), 0 10px 28px -14px rgb(0 0 0/.6)` | **proposed** (`:25`) |
| `--sh-pop` | `0 2px 6px rgb(27 36 68/.08), 0 24px 56px -24px rgb(27 36 68/.34)` | `0 2px 6px rgb(0 0 0/.4), 0 24px 56px -24px rgb(0 0 0/.7)` | **proposed** |
| `--sh-btn` | `0 10px 28px -10px rgb(30 58 138/.34)` | `0 10px 28px -10px rgb(141 162 255/.35)` (accent glow) | **proposed** |
| `--glass` (top bar, tab bar) | `rgb(255 255 255/.8)` | `rgb(23 27 42/.8)` (= surface 80 %) | not flagged; equals code `bg-wm-surface/80` |

Raw values used in both modes (not switched):
- Dialog scrim `rgb(27 36 68 / .30)` + `blur(3px)` (`:90`), i.e. navy in dark too. Code does the same (R10, `ui/Dialog.tsx:43`, `CalendarModal.tsx:31`: `bg-wm-mark-ink/30`).
- Answer row shadow `0 1px 2px rgb(0 0 0 / .05)` (`:85`).
- Group colours as inline hex: dots `#e5603f`, `#149384`, `#7a55d3` (Hôm nay); stack border and the 44 px number `color: var(--g)` with the same hex
  (`:78–81`, Nhóm). The mockup's number uses the **main** group colour; code uses the `-ink` token (`GroupStack.tsx:62`, `TodayPage.tsx:136`).
- Focus ring of the active input: accent 16 % (`:95`); in dark this is `#8da2ff` 16 %.

Not covered by the mockup: `--shadow-wm-row`, `-soft`, `-lift`, `-pro`, `-btn-pass`, `-btn-fail` in dark; stage chips (no screen shows one); the calendar
colours; any desktop width.

### 1.3 What it marks as open

The intro (`:110`): "Cần chốt trước M9: bóng của chế độ Tối (Figma chưa có, ở đây là bản đề xuất), và bảy màu nhóm, màu ngăn ở chế độ Tối (đang dùng giá
trị sáng)." So the mockup **proposes** dark shadows only; it does **not** propose dark group or stage colours. There are no other notes (no notes block at the
bottom; the only other text is the five per-screen notes above).

### 1.4 Background in dark

`.frame::before`: two radial glows, accent 22 % top-left and mark 28 % bottom-right; `.frame::after`: 20 px dot grid in muted 40 % with a radial mask
(`:43–47`). In dark these resolve to `#8da2ff` 22 % and `#ffd84a` 28 % on `#0f1220`, dots in `#a6adc4` 40 %. No mesh, no grain (superseded by QBG, §0.2).
The login note still says "trên lưới chấm".

### 1.5 Approval

- Design: GM4 (`…-design.md:40`), M1 step (`:533–534`), Done-when (`:900`), risk (`:913`).
- Decision record GM4 (`decisions…md:73–83`): owner chose "giữ, nhưng vẽ trước mockup vài trang để xem"; agreed to the five screens. No later entry.
- Delivery record: M1 as-built links the artifact (`giao-dien-moi.md:239`) and says "mockup tối chờ chủ dự án duyệt" (`:250`); M3 "Màu nhóm, màu ngăn ở
  chế độ tối dùng giá trị sáng cho tới M9" (`:332`); M4–M7 "chưa chụp chế độ tối" (`:300`, `:413`, `:455`, `:498`, `:522`, `:620`).
- Rulings deferring to the mockup: R124 practice colours (`rulings:150`), R161 `--shadow-wm-pro` "web-dark.css chưa có bóng tối (GM4)" (`rulings:191`).
- `app-redesign-plan.md`: no mention of `toi-5-man` or of a dark approval.
- Artifact comments: none.
- **Conclusion: approval not recorded.** Whether the owner looked at it in chat: UNVERIFIED (no repo trace).

---

## 2. Figma variables, modes, styles, dark frames

### 2.1 Collections and modes

- Notes `20:424`: "bộ biến "Wordmet" có hai mode Light và Dark". Notes `20:434`: Dark frames not done.
- Design §7.2: collection "Wordmet" (Light / Dark, 15 colours) and "Wordmet số đo" (19 variables, one mode). Collection list and mode count not re-read
  this session (needs Plugin API): UNVERIFIED this session.
- Names seen through `get_variable_defs` (code syntax): `var(--bg)`, `--surface`, `--ink`, `--muted`, `--ghost`, `--line`, `--accent`, `--accent-soft`,
  `--on-accent`, `--mark`, `--mark-ink`, `--pass`, `--pass-soft`, `--fail`, `--fail-soft`; `radius/sm|md|lg|xl|2xl|pill|button|modal`. No other colour
  variable appeared on any node read.

### 2.2 Light vs Dark (Dark from design §7.2, not re-read)

| Variable | Light (re-read 11/11, `117:4712`, `178:5895`) | Dark (§7.2, 09/11) |
|---|---|---|
| `bg` | `#f6f7fa` | `#0f1220` |
| `surface` | `#ffffff` | `#171b2a` |
| `ink` | `#1b2444` | `#eceef5` |
| `muted` | `#525a78` | `#a6adc4` |
| `ghost` | `#c9cedc` | `#353c53` |
| `line` | `#e1e5ee` | `#2a3044` |
| `accent` | `#1e3a8a` | `#8da2ff` |
| `accent-soft` | `#e7ecf8` | `#1f2747` |
| `on-accent` | `#ffffff` | `#0f1220` |
| `mark` | `#ffd84a` | `#ffd84a` |
| `mark-ink` | `#1b2444` | `#1b2444` |
| `pass` / `pass-soft` | `#1b7a46` / `#e4f2ea` | `#62c98f` / `#142a1e` |
| `fail` / `fail-soft` | `#b8352a` / `#f8e7e5` | `#ff8d80` / `#311a18` |

### 2.3 What has no Dark in Figma

| Thing | Evidence | Dark in Figma |
|---|---|---|
| Shadows: effect styles `Shadow/Card`, `Shadow/Row`, `Shadow/Pop`, `Shadow/Soft`, `Shadow/Lift` | reported with raw colours (e.g. Card `#1B24440F` 0/1/2/0 + `#1B244433` 0/10/28/-14) on `117:4712`, `5:13` | None. Whether any shadow colour is bound to a variable: UNVERIFIED (the tool shows raw hex). Delivery `:250` and the mockup (`:25`) both say "chưa có trong Figma". |
| Top-bar glass `Glass/Header` | `Effect(BACKGROUND_BLUR, radius 24)` on `54:502` | Blur only, no colour; the fill is `--bg` (switches) |
| Stage colours ("Chip ngăn" `54:656`) | `get_variable_defs` on `54:656` returns only `Body/Label`; design §7.3 "màu đặt tay, không gắn biến" | None |
| Seven group colours, `#64708c` empty | no group variable on `82:3368`, `117:4712`; Figma facts M3 A:59, :120 and M3 B:23 list them as raw | None |
| Background "Nền app/Mesh hạt" `95:315` (1440 × 1000), `95:321` (390 × 844) | `get_variable_defs` → only `var(--bg)` on both; screenshot of `2:2` shows the four halos | Only the base fill switches; halos and grain are fixed. Halo hex values not read this session (UNVERIFIED). |
| Login showcase panel "Khung giới thiệu" `35:361` | binds `bg`, `accent`, `ink`, `muted`, `surface`, `mark`, `mark-ink`, `line`, `accent-soft`; still holds an instance "Lưới chấm" `153:752` | Variables switch; the dot-grid instance and glows `35:362–364` do not |
| Home-page glows, AI gradient, Pro glow | Figma facts M8 A:72, :412 ("All need tokens for Dark mode"); M8 B:380 ("link and dot colours are raw hex") | None |

### 2.4 Frames drawn in dark

None. Checked: thumbnails of `0:1` (10 public frames), `2:3` (6 motion scenes), `2:2` (system page), `55:306` (whole app page, 10330 × 54751) all
light; all 18 frame names on `35:307` end in "Desktop 1440" or "Mobile 390". Earlier Figma facts agree: M2:243, M6 A:259, M6 B:106 and :227, M7 A:449,
M7 B:145 and :362, M8 A:205 and :448, M8 B:380.

---

## 3. Mismatches with `packages/design-tokens/web-dark.css`

`web-dark.css` (79 lines) only redefines `--color-wm-*` under `[data-theme='dark']`. Shadows, blur and type stay as in `web.css` `@theme`.

| # | Item | Figma Dark | `toi-5-man.html` dark | `web-dark.css` / code | Mismatch |
|---|---|---|---|---|---|
| 1 | 15 core colours | §7.2 | same | `web-dark.css:4–18` same | **none** |
| 2 | `--shadow-wm-card` | none | `0 1px 2px #000/.4, 0 10px 28px -14px #000/.6` | not overridden → light navy `web.css:38` | code uses light shadow in dark |
| 3 | `--shadow-wm-pop` | none | `0 2px 6px #000/.4, 0 24px 56px -24px #000/.7` | light `web.css:40` | same |
| 4 | `--shadow-wm-btn` | none | accent glow `rgb(141 162 255/.35)` | light navy `rgb(30 58 138/.34)` `web.css:43` | navy shadow under a periwinkle button |
| 5 | `--shadow-wm-row`, `-soft`, `-lift`, `-pro`, `-btn-pass`, `-btn-fail` | none | not in mockup | light only (`web.css:39–47`) | no dark reference at all |
| 6 | Glass bars | blur 24 only | `rgb(23 27 42/.8)` | `bg-wm-surface/80` (`TopBar.tsx:29`, `PhoneHeader.tsx:14`), `/90` tab bar (`MobileTabBar.tsx:17`) | none for top bar; tab bar 90 % vs 80 % (both modes) |
| 7 | Scrim | none | navy 30 % + blur 3 | `bg-wm-mark-ink/30` + `--blur-wm-overlay` 3px (R10) | none vs `toi-5-man`; conflicts with rounds 9–15 (black 55 %, §4) |
| 8 | Group colours (7 + empty) | none | light hex | light values copied (`web-dark.css:47–78`) | as mockup; but see 9–11 |
| 9 | Group `-ink` | none | number uses main colour | Figma's darker inks `#984941`… (R37) | 2.17–3.61:1 on dark surface (§6); mockup uses the main colour instead |
| 10 | Group `-wash` | none | not shown | `color-mix(colour 12%, #ffffff)` | near-white in dark; picker row text 1.01:1 (`GroupPicker.tsx:189,194`) |
| 11 | Group `-soft` | none | not shown | `color-mix(colour 50%, #ffffff)` | pastel stacks behind dark cards (`GroupStack.tsx:52`) |
| 12 | Stage colours | none | not shown | light values copied (`web-dark.css:25–43`) | light chips (`#eef0f4`…) on `#171b2a`; inks on chip still 5.95–6.49:1 |
| 13 | `--color-wm-practice`, `-practice-ink` | none | not shown | `#d99a17` / `#e0b450` "tạm" (R124, `web-dark.css:19–21`) | round 9 dark uses `#f0c04a` (§4) |
| 14 | Background | base only | dot grid + 2 glows | `app-mesh` (tokens) + grain `screen` 12 % "tạm" (`globals.css:421–444`) | no approved dark mesh; grain treatment differs from landing bản 3 (`soft-light` 7 %) |
| 15 | Dictionary paper | none | not shown | stays light in dark (R71, R80; `globals.css:826–837`) | rounds 6–7 drew dark paper `#232838` / `#1d2230` (§4) |
| 16 | `color-scheme: dark` | n/a | page chrome only | set only by old `dark.css` (delivery `:189`) | must move before the old tokens go |

---

## 4. Earlier mockups and docs that show dark

All are page-level dark blocks (`@media (prefers-color-scheme: dark)` + `:root[data-theme="dark"]`), so the screen renders dark only when the viewer's
system is dark. None records owner approval of its dark rendering (UNVERIFIED that the owner ever viewed them dark; `danh-gia.md:15`, `:123`, `:169`, `:194`
say dark was "không xem được"/"chưa xem" for the concept rounds).

| File | App dark palette | Extra dark values |
|---|---|---|
| `vong-6-nhom-tra-tu.html:20–23` | **old**: bg `#10131c`, surface `#1a1f2d`, line `#2e3549`, ghost `#3a4157`, on-accent `#10131c`; rest = Figma | paper `#232838` |
| `vong-7-chong-the-tu-dien.html:15–22` | old | paper `#1d2230`, paper-line `#30374a`; shadow `0 24px 48px -28px #000/.8`, `0 10px 24px -16px #000/.7` |
| `vong-8-polish.html:15–20` | old | shadows `#000/.8`, `/.7`; D4 "Mesh + hạt + kính" uses token mixes (`:316–319`) with grain `multiply` .4 (no dark-specific rule) |
| `vong-9-lich.html:15–20`, `:327–329` | old | `--shadow-card 0 1px 2px #000/.4, 0 18px 36px -20px #000/.85`; `--shadow-pop 0 30px 70px -24px #000/.9`; **scrim `rgb(0 0 0/.55)`**; calendar `--c-learn #8da2ff`, `--c-rev #62c98f`, `--c-prac #f0c04a` (light `#1e3a8a`, `#1b7a46`, `#d99a17`) |
| `vong-10-con-lai.html:15–20`, `:109–111` | old | same as round 9 |
| `vong-13-hai-cot-gon.html:18–21`, `vong-14-so-cau-ai.html:18–25` | old | card `0 18px 36px -20px #000/.85`, pop as round 9, scrim black .55 |
| `vong-15-polish-9-trang.html:20–27` | old | card as round 9; `--shadow-row 0 8px 18px -12px #000/.8`; **`--shadow-btn: none`**; scrim black .55 (`app-redesign-plan.md:494`: "chế độ tối vẫn không bóng nút như trước") |
| `chong-the-mo.html:18–21` (Học, chosen stack) | old | — |
| `landing-mo.html:24–35` (landing bản 3, motion source for the home page, QM8-3) | **Figma** | `--glow rgba(141,162,255,.36)`, `--glow-y rgba(255,216,74,.14)` (light .34 navy / .42 yellow); `--shadow-soft 0 1px 2px #000/.4, 0 14px 34px -14px #000/.7`; `--shadow-lift 0 50px 110px -40px #000/.9, 0 12px 32px -16px #000/.6`; grain `soft-light` at 7 % (light `multiply`) |
| `review-4-quyet-dinh.html:23–26`, `gm14-18-de-xuat.html:27–30` | Figma | warn `#f0b450` / `#2c2412`; scrim black .5 |
| `m8-cau-hoi.html:14–29` | page: bg `#0f1220`, surface `#181c2e`, accent `#9db3ff` | Q1b product demo: surface `#1a1f33`, ink `#e8ebf5`, muted `#a3aac4`, line `#2c3350`, accent `#8fa8ff` (ad hoc, hero only) |
| `docs/mockups/2026-11-10-gm-nen/so-sanh-nen.html:11` | — | "the mocked app is always the light theme": no dark mesh |
| `index.html:14–15` | page chrome only (`#111318`…) | not an app palette |

Docs:
- `ui-best-practices.md:49`: "Dark: ink, muted, accent trên nền tối 16,06 / 7,66 / 7,13 — đạt" (these equal ink/bg, muted/surface, accent/surface, computed).
  No other dark rule.
- `motion-va-chuyen-canh.md`: no dark rule (grep).
- `app-redesign-plan.md`: theme switch in avatar menu (`:40`) and Settings "Sáng/Tối/Theo hệ thống" (`:153`); "Chưa làm: bản Dark của lưới chấm" (`:232`);
  dark check-box contrast 4,30:1 in round 11 (`:281`); "Chưa có bản Dark" (`:439`); round-15 dark button shadow none (`:494`).
- `context-2026-11-07.md:82`: app has light, dark, system; default system.
- Design §11 (`…-design.md:858`): browser theme colour `#f6f7fa` light / `#0f1220` dark; code still `#1b2444` / `#121833` (`app/[locale]/layout.tsx:38`).

---

## 5. Screens with no dark reference

"Old-palette page dark" = only the round 6–15 page-level dark above (palette ≠ Figma, never approved).

| Area | Screens | Dark reference |
|---|---|---|
| Public | Trang chủ | `landing-mo.html` only (layout ≠ Figma home; light accent there is old `#2445d6`) |
| Public | Chính sách bảo mật, Điều khoản, Nguồn dữ liệu, 404; header theme toggle position (QM8-1b) | **none** (`m8-cau-hoi.html` Q1b shows a hero strip only) |
| Auth | Đăng nhập | `toi-5-man` phone card only; desktop split + showcase panel `35:361`: **none** |
| Auth | Đăng ký, Xác minh email, Quên mật khẩu, Đặt mật khẩu mới, Hoàn tất Google, Đã xóa tài khoản, Bổ sung hồ sơ, Chào mừng | **none** |
| App | Hôm nay, Nhóm, Phiên luyện sai, Thêm từ | `toi-5-man` (phone); desktop: old-palette page dark (rounds 8–10, 6–7) |
| App | Một nhóm, Tra từ, Trang một từ, Từ tồn đọng, Chủ đề, Luyện tập, Tùy chỉnh phiên, other practice states, tổng kết, Từ hay sai, Học (chồng thẻ), Lịch/Ngày, Cài đặt, Tài khoản, Xóa tài khoản, Giao dịch (+ chi tiết), Gói học, Đơn hàng, overlays 2–6 | old-palette page dark only (rounds 6–15, `chong-the-mo`) |
| App | `/app/recall` (Ôn), Báo lỗi của tôi `211:5827`, menu ảnh đại diện `181:316` | **none** (recall has no mockup at all, design §15) |
| App | The 11 dialogs without Figma frames (§9 M3–M7), toasts, skeletons, error and offline screens, streak toast | **none** |
| All | Any width other than 390 for the five mockup screens; 768–1279 | **none** |

---

## 6. Contrast in dark (computed 11/11/2026)

Group colours on dark surface `#171b2a` (bg `#0f1220` in brackets), their `-ink` on surface, and dark-mode ink `#eceef5` on the `-wash` row:

| Group | Colour | Colour on surface (bg) | `-ink` | `-ink` on surface | `-wash` (12 % on white) | ink on `-wash` |
|---|---|---|---|---|---|---|
| 0 | `#e5603f` | 4.95 (5.39) | `#984941` | **2.74** | `#fcece8` | **1.01** |
| 1 | `#149384` | 4.51 (4.91) | `#17696c` | **2.67** | `#e3f2f0` | **1.01** |
| 2 | `#7a55d3` | **3.32** (3.61) | `#56429d` | **2.17** | `#efebfa` | **1.01** |
| 3 | `#d99a17` | 7.00 (7.61) | `#916d28` | 3.61 | `#faf3e3` | **1.05** |
| 4 | `#4a9637` | 4.65 (5.06) | `#376d45` | **2.80** | `#e9f2e7` | **1.01** |
| 5 | `#d2427a` | 3.91 (4.26) | `#8c3765` | **2.32** | `#fae8ef` | **1.01** |
| 6 | `#2a86d1` | 4.43 (4.81) | `#29629d` | **2.71** | `#e5f0f9` | **1.00** |
| empty | `#64708c` | **3.46** (3.76) | `#525a78` | **2.52** | `#eceef1` | **1.00** |

Design §7.4's "`#7a55d3` 3,32 và `#64708c` 3,46" are on the dark **surface**. Where `-ink` is text: `TodayPage.tsx:136` (96 px number), `GroupStack.tsx:62`,
`GroupPage.tsx:188`, `GroupPicker.tsx:199`. `web-tokens.test.ts:122–125` checks `-ink` only on white; nothing tests group tokens in dark.

Other dark pairs: ink/bg 16.06, ink/surface 14.77, muted/surface 7.66, accent/surface 7.13, accent/accent-soft 6.07, on-accent/accent 7.75, pass/pass-soft
7.44, fail/fail-soft 7.26, ghost/bg 1.70, line/surface 1.31. Practice: `#d99a17` 7.00, `#e0b450` 8.82, round-9 `#f0c04a` 10.06 on surface. Stage chips in
dark keep light backgrounds (14.3–15.0:1 against the dark surface, i.e. bright pills); their ink on chip stays 5.95–6.49. Stage dots on dark surface
4.98–7.63.

---

## 7. Unverified

- Figma Dark values (§2.2) and the collection/mode list: from design §7.2 only; this pass could not read modes read-only.
- Whether any Figma effect style binds a colour variable (would give it a Dark value).
- Halo hex values inside `95:315` / `95:321`.
- Whether the owner viewed `toi-5-man` or any round 6–15 mockup in dark.
- Layout differences between the five mockup screens and their Figma frames beyond the Hôm nay example.
