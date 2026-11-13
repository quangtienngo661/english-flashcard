# Figma facts for M7 part B (Gói học, Đơn hàng, hộp Giới thiệu Pro, component "Thẻ chọn"), 11/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (`55:306`); component `34:383` on the system page. Read-only (`get_metadata`,
`get_design_context` with `excludeScreenshot`, `get_variable_defs`, `get_motion_context`, three `get_screenshot`s viewed inline); nothing was written to Figma
or to the repo except this file. Copy is exact Vietnamese from the frames. "raw" = value read from the node, not bound to a variable or named style.

Notes on the method:
- The resource `skill://figma/figma-design-to-code/SKILL.md` was **not** readable: this session has no MCP resource reader (`ReadMcpResourceTool` is not available,
  ToolSearch found nothing). `get_design_context` output was parsed directly as reference data, not as code to copy.
- Generated code expresses some shadows as CSS `drop-shadow(...)` with half the Figma blur and no spread (e.g. button `0 10 14 rgba(30,58,138,.34)` =
  `--shadow-wm-btn` `0 10px 28px -10px`; order card `0 10 14 .20, 0 1 1 .06` = `Shadow/Card`, confirmed by the style list in the same response). Values written as
  `box-shadow` in the output (Pro card, Pro dialog) are taken as-is.
- Named styles seen: `Shadow/Card`, `Body/Button` (Noto Sans SemiBold 15 / 1.4), `Body/Small` (Noto Sans Regular 14 / 1.5), `Body/Small strong` (Noto Sans SemiBold
  14 / 1.5), `Display/Card title` (Bricolage Grotesque Bold 24 / 1.3, letter-spacing -1 % = -0.24 px), `Display/Logo`, `Body/Label`, `Body/Base strong`, `Glass/Header`.
- Variables confirmed with `get_variable_defs` on the nodes named below: `--ink #1b2444`, `--muted #525a78`, `--surface #ffffff`, `--bg #f6f7fa`, `--line #e1e5ee`,
  `--ghost #c9cedc`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--on-accent #ffffff`, `--pass #1b7a46`, `--pass-soft #e4f2ea`, `--fail #b8352a`, `radius/button` 10,
  `radius/lg` 14, `radius/modal` 16, `radius/pill` 999. All equal design §7.2.
- Fonts are the "JetBrains Mono (hiện tại)" variant, same as m4-a / m6-b; the font trial frame `156:4349` was not compared.
- Frames read: Gói học desktop `123:4196` (1440 x 1480) / phone `123:4401` (390 x 1919); Đơn hàng đã thanh toán desktop `123:4598` (1440 x 544) / phone `123:4690`
  (390 x 556); other order states `123:4774` (1240 x 445, a specimen sheet, desktop only); Overlay 6 desktop `75:2094` (1440 x 900) / phone `75:2373` (390 x 844);
  component set `34:383`. `get_motion_context` (recursive) on `123:4774` and `75:2094`: **no keyframe data** (`{"nodes":[]}`).

---

## 0. Shared components instanced in these frames

| Component | Node in these frames | Notes |
|---|---|---|
| Background "Nền lưới chấm" (mesh + grain, `95:315`/`95:321`) | `123:4386`, `123:4583`, `123:4675`, `123:4759`, `123:4796`, `105:4402`, `105:4409` | Same as m6-b. |
| Top bar "Thanh trên app/Desktop" (set `54:502`) | `123:4197`, `123:4599` (inner `149:4381`, `Tab=Không`) | No tab highlighted. Contains chip "Pro" (`149:4425`, Noto SemiBold 13 `--muted`, no fill: round 15 "bỏ nền và padding") and avatar "L". The chip says "Pro" even though the Gói học frame shows a Free learner (see §6.4). |
| Top bar "Thanh trên app/Mobile" (`54:503`) | `123:4402`, `123:4691` | 56 px. |
| Bottom tab bar "Thanh tab dưới" (`54:637`, inner `149:4350`, `Tab=Không`) | `123:4552`, `123:4728` | No tab active; four labels `--muted` Noto Regular 12. |
| Calendar FAB "Nút lịch nổi" (`95:343`) | desktop `123:4393` (62 x 66, right 32, bottom 32), `123:4682`; phone `123:4590` (54 x 58, right 16, 14 above the tab bar), `123:4766` | Present on Gói học and Đơn hàng; **absent** on the overlay frames and on the specimen `123:4774`. |
| Button "Nút" (`3:12`, Chính) | `123:4346`, `123:4512`, `123:4670`, `123:4723`, `123:4792`, `124:5390`, `125:5193` | bg `--accent`, radius `radius/button` 10, padding 20 x 12, gap 8, label `Body/Button` `--on-accent`, trailing icon "Mũi tên" 16; shadow `--shadow-wm-btn`. Every primary button here has the arrow. |
| Text button "Nút chữ" (`166:326`) | `Thường` (`166:320`): `166:5410`, `166:5412` "Xem gói"; `Phụ` (`166:322`): `166:5162`, `166:5164` "Để sau" | `Body/Small strong`; Thường = `--accent`, Phụ = `--muted`. Component note: keep "→" in the label when it goes to another page; ≥ 44 px touch target on phone. |
| Back link | **none** | Gói học and Đơn hàng have no "Quay lại" link and no page eyebrow. |
| Pro badge | not a component | Local frames: "Nhãn" (`123:4285`) and the dialog chips (`124:5364`, `124:5366`), see below. |

---

## 1. Gói học — desktop `123:4196`, phone `123:4401` (route `/app/plans`)

### 1.1 Layout

Desktop content `123:4247` ("Nội dung"): column 1160 at x 140, flex column, items centred, **gap 20**, padding top 32, bottom 124. Order:
1. Header "Đầu trang" (`123:4248`): centred, gap 8, text-align centre.
2. "Hai gói" (`123:4251`): flex **row**, gap **24**, `items-start` (cards are **not** equal height: Free 362, Pro 728).
   - Free card `123:4252`: fixed **470** wide. Pro card `123:4282`: `flex: 1` (666).
3. "Tiêu đề so sánh" (`123:4351`), left-aligned.
4. "So sánh" table card (`123:4353`), full width.

Phone content `123:4413`: padding 16 left/right, top 20, bottom 100, **gap 16**; "Hai gói" becomes a **column**, gap 24, both cards full width (358).

Cards (all three: Free, Pro, compare) radius **18 raw** (no token; `radius/lg` 14 and `radius/xl` 20 exist; the transactions page in m6-b uses 20).

| | Free card | Pro card | Compare card |
|---|---|---|---|
| Fill / border | `--surface`, 1 px `--line` | `--surface`, **2 px `--accent`** | `--surface`, 1 px `--line` |
| Shadow | `Shadow/Card` | raw `0 40px 70px -40px rgba(27,36,68,.42)` (no glow ring) | `Shadow/Card` |
| Padding desktop / phone | 28 / 20 | 28 / 20 | 24 x 6 / 16 x 4 |
| Inner gap | 16 | 16 | rows stacked, no gap |

### 1.2 Text, in order (desktop; phone differences in brackets)

Header:
| Text | Font | Colour |
|---|---|---|
| **Học đều mỗi ngày, lên Pro khi cần** | Bricolage Grotesque ExtraBold **44**, lh 1.1, ls -1.122 px, width 900 [phone **30**, ls -0.699 px, width 358, two lines] | `--ink` |
| **Trả một lần cho mỗi kỳ, không tự gia hạn. Hết kỳ, bạn về gói Miễn phí.** | Noto Sans Regular **16** [phone 15], width 700 [340] | `--muted` |

Free card `123:4252`:
| Text | Font | Colour |
|---|---|---|
| **Miễn phí** + tag **gói hiện tại** | title Bricolage ExtraBold 24; tag JetBrains Mono Bold 11 on `--bg`, padding 8 x 3, radius **5 raw**, gap 12 | title `--ink`; tag `--muted` |
| **0 ₫** + **không thu tiền** | Bricolage ExtraBold **40**, ls -0.84 px; Noto Regular 15; baseline-aligned, gap 8 | `--ink`; `--muted` |
| check rows (icon/check 16, gap 8, rows 20 high, 16 apart): **Ôn thẻ, lịch ôn, nhắc học qua email** · **Tra từ, thêm nhanh, tối đa 100 nhóm** · **3 phiên luyện mỗi ngày** · **15 câu AI và 5 lượt tra AI mỗi tháng** | Noto Regular **14.5** | `--ink`; check icon green, colour **not bound** (`get_variable_defs` on `123:4261` = `{}`; looks like `--pass`) |
| **Có thể có quảng cáo.** | Noto Regular 14 | `--muted` |
| **bạn đang dùng gói này** | JetBrains Mono Medium 12, lower-case | `--muted` |

Pro card `123:4282`:
| Text | Font | Colour |
|---|---|---|
| **Pro** + tag **có AI** | Bricolage ExtraBold 24; tag JetBrains Mono Bold 11 on `--accent-soft`, padding 8 x 3, radius 5 raw | `--ink`; tag `--accent` |
| **Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn.** | Noto Regular 14 | `--muted` |
| three period cards (§1.3) | | |
| check rows: **AI viết câu luyện cho từng từ bạn học** · **Tra từ bằng AI khi từ điển chưa có** · **300 câu AI và 100 lượt tra AI mỗi tháng** · **30 phiên luyện mỗi ngày** · **Không quảng cáo** · **Mọi thứ của gói Miễn phí** | Noto Regular 14.5, icon/check 16 | `--ink` |
| button (full width, 45 high): **Mua gói Pro 12 tháng** → | `Body/Button` | `--on-accent` on `--accent` |
| **Trả một lần, dùng 12 tháng, không tự gia hạn. Không hoàn tiền tự động; cần hỗ trợ, liên hệ support@wordmet.com.** | Noto Regular **13.5**, wraps (2 lines desktop, 3 phone); the email is plain text in Figma (no underline, no link style) | `--muted` |

The button label and the footnote follow the selected period ("12 tháng" because 12 tháng is selected).

Comparison:
| Text | Font | Colour |
|---|---|---|
| **So sánh chi tiết các gói** | Bricolage Grotesque **Bold 22** | `--ink` |
| header row: **tính năng** · **Miễn phí** · **Pro** | JetBrains Mono 11: Medium, Medium, **Bold** | `--muted`, `--muted`, `--accent` |

Rows (padding 12 vertical, gap 12, `border-top 1px --line` on every body row, none on the header row; columns: feature `flex 1`, Free **140** [phone **64**], Pro 140 [64];
text 14.5: feature Noto Regular `--ink`, Free value Noto Regular `--muted`, Pro value Noto **SemiBold `--accent`**):

| tính năng | Miễn phí | Pro |
|---|---|---|
| Ôn thẻ và lịch ôn | Có | Có |
| Nhắc học qua email | Có | Có |
| Số nhóm | 100 | 100 |
| Phiên luyện mỗi ngày | 3 | 30 |
| Câu AI mới mỗi tháng | 15 | 300 |
| Lượt tra AI mỗi tháng | 5 | 100 |
| Không quảng cáo | Không | Có |

All numbers are the defaults in `settings.definitions.ts` (per `app-redesign-plan.md` line 156); code must read them from the API, not hard-code.

### 1.3 Period choice (inside the Pro card)

Three local frames, **not instances of "Thẻ chọn" `34:383`** (see §4 and Conflicts): "Kỳ 1 tháng" `123:4288` (65 high), "Kỳ 3 tháng" `123:4296` (81), "Kỳ 12 tháng"
`123:4306` (81); phone `123:4454`, `123:4462`, `123:4472`. Gap 16 between them (the card's gap).

Anatomy (flex row, gap 12, align centre, padding **16 x 12**, radius **12 raw**, full width):
1. Radio "Chọn" 18 x 18 (ellipse; image asset). Unselected: `--surface` fill, `--ghost` ring (`123:4289`). Selected: `--accent` ring and `--accent` centre dot on
   `--surface` (`123:4307`, screenshot).
2. Label block: period **Noto SemiBold 15 `--ink`**; savings text **JetBrains Mono Bold 11 `--pass`** (plain text, no pill). Desktop: one row, gap 8, baseline.
   **Phone: column, gap 2** (savings under the period label).
3. Spacer ("Giãn", flex 1).
4. Price block (column, items end, right-aligned): struck full price Noto Regular 12 `--ghost` line-through (3 and 12 only); price **Bricolage Grotesque Bold 18 `--ink`**;
   per-month line Noto Regular 12 `--muted`.

| Card | Label | Savings | Struck | Price | Per month | State drawn |
|---|---|---|---|---|---|---|
| Kỳ 1 tháng | 1 tháng | — | — | 79.000 ₫ | mỗi tháng | unselected |
| Kỳ 3 tháng | 3 tháng | −16% | 237.000 ₫ | 199.000 ₫ | ≈ 66.300 ₫ mỗi tháng | unselected |
| Kỳ 12 tháng | 12 tháng | −37% · tiết kiệm nhất | 948.000 ₫ | 599.000 ₫ | ≈ 49.900 ₫ mỗi tháng | **selected** |

- Unselected: border **1.5 px `--line`**, no fill (white card behind). Selected: border **1.5 px `--accent`**, fill raw **`rgba(30,58,138,0.04)`** (accent at 4 %, no token), no shadow.
- The savings sign is "−" (as read from the node name, likely U+2212). Derivation that fits every number: struck = months x 1-month price (3 x 79.000, 12 x 79.000);
  savings = round(1 − price / struck) (16.0 %, 36.8 %); per month = price / months rounded to 100 ₫ (66.333 → 66.300, 49.917 → 49.900; nearest-100 and floor-to-100
  both fit, UNVERIFIED which). "tiết kiệm nhất" sits on the 12-month card only.
- Default selection drawn: 12 tháng. Hover, focus, disabled, loading (creating order) states: **not drawn**.

### 1.4 What is not drawn on Gói học

- A learner who already has Pro (current code: `App.plans.titlePro` "Bạn đang dùng gói Pro", `endsOn`, `upgrade` "Nâng cấp lên {period}", `currentPeriod`, `nextPeriod`,
  `startsOn`), trial (`titleTrial`), staff grant (`granted`), Free without AI (`freeList.aiOff`), price changed (`priceChanged`), order creation failed (`buyUnavailable`):
  **none drawn**. The only state drawn is a Free learner with 12 tháng selected. The "gói hiện tại" tag and "bạn đang dùng gói này" sit on the Free card; where they go
  for a Pro learner is UNVERIFIED (nearest frame: move them to the Pro card).
- Loading, error, Dark: not drawn.

---

## 2. Đơn hàng đã thanh toán — desktop `123:4598`, phone `123:4690` (route `/app/plans/order`)

### 2.1 Layout

Desktop content `123:4649`: column 1160 at x 140, items centred, padding top 32, bottom 124; one card "Thanh toán thành công" `123:4650`, **560 wide**, centred.
No page title, no back link. Phone content `123:4702`: padding 16 left/right, top 20, bottom 100; card full width (358).

Card: `--surface`, 1 px `--line`, radius **18 raw**, `Shadow/Card`, padding **24** [phone **16**], flex column, gap **16**.

### 2.2 Anatomy, top to bottom

1. Header row (gap 12, align centre):
   - "Huy hiệu" `153:4842`: 40 x 40 circle (`radius/pill`), fill `--pass-soft`, icon/check 20 in `--pass` (bound, `153:4843`).
   - Title block (flex 1, gap 2): **Thanh toán thành công** — `Display/Card title` (Bricolage Bold 24, lh 1.3, ls -0.24 px) `--ink`;
     line **Gói Pro có hiệu lực đến hết 07/02/2027.** — `Body/Small` `--muted`, the date run **`Body/Small strong` `--ink`** (matches `App.plans.order.paid` with `<b>{date}</b>`).
2. "Chi tiết đơn" `153:4846`: fill `--bg`, radius `radius/lg` 14, padding 16 x 4, three rows (padding 12 vertical, gap 12, **no dividers**); label `Body/Small` `--muted`
   left, spacer, value `Body/Small strong` `--ink` right-aligned:
   | Label | Value drawn |
   |---|---|
   | Gói | Pro, 3 tháng |
   | Số tiền | 199.000 ₫ |
   | Mã đơn hàng | 2611080153 |
3. Buttons row (gap 16, hug width, left-aligned): primary **Bắt đầu học** → (152 wide); "Nút chữ" Thường **Xem gói** (no "→").

No period dates (start–end), no payment provider, no QR/VietQR/payOS mention anywhere on the order frames. Phone is identical except padding 16 and title wrapping width.
Sample data inconsistency in the frame: "Pro, 3 tháng" bought on a date giving "đến hết 07/02/2027" is a mock value; use API values.

## 3. Other order states — `123:4774` (desktop specimen, 1240 x 445)

Frame note (JetBrains Mono Medium 12 `--muted`): **"trang đơn hàng hiện một trong các trạng thái này, tùy trạng thái đơn; cùng khung với khối thanh toán thành công.
Chấm xanh nhấp nháy khi đang chờ, chấm đỏ khi đã dừng."** So each state card replaces the paid card at the same place and width (560 desktop, full width phone).
In the specimen the cards are drawn 572 wide in a 2-column wrap (gap 16); no top bar, no FAB, **no phone version**.

Card (each): `--surface`, 1 px `--line`, radius 18 raw, `Shadow/Card`, padding **24**, flex column, gap **12** (paid card uses 16). Content: dot 10 x 10, then title
**Bricolage Grotesque Bold 22 `--ink`** (`leading: normal`, no letter-spacing; the paid title is 24 `Display/Card title`), then body Noto Regular **14.5 `--muted`**.

| # | Node | Dot | Title (exact) | Body (exact) | Button |
|---|---|---|---|---|---|
| 1 | `123:4777` | "Chấm đang chờ (nhấp nháy)" `123:4778`, **`--accent` #1e3a8a** | Đang kiểm tra đơn hàng… | — | — |
| 2 | `123:4780` | same, `--accent` | Đang chờ xác nhận thanh toán | Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này. | — |
| 3 | `123:4784` | same, `--accent` | Giao dịch đang được kiểm tra | Gói Pro sẽ được kích hoạt sau khi kiểm tra xong. Hỗ trợ: support@wordmet.com | — |
| 4 | `123:4788` | "Chấm đã dừng" `123:4789`, **`--fail` #b8352a**, static | Đơn hàng đã hủy hoặc hết hạn | Bạn có thể tạo đơn mới tại trang Gói học. | primary **Đến trang Gói học** → |

- "xanh" in the note is navy (`--accent`), not green: confirmed by `get_variable_defs` on `123:4778`.
- State 1 has the blinking dot too, so the "checking" (loading) state blinks.
- Row 3: the email is plain text in the same run (no link style drawn); no trailing full stop. Existing keys `needsReview` + `contact` ("Hỗ trợ: <mail>{email}</mail>") match.
- Only four states drawn. Not drawn: order not found (`App.plans.order.notFound` "Không tìm thấy đơn hàng"), paid without a date (`paidNoDate` "Gói Pro đã được kích hoạt."),
  failed payment as its own state (the drawn set folds cancelled and expired into card 4), error/network failure.

### 3.1 Motion of the pending dot

- Figma: no keyframes on any node (`get_motion_context` recursive on `123:4774` returned `{"nodes":[]}`).
- `docs/mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md` §6: **`opacity 1 → .3 → 1`, 1,4 s `ease-in-out`, repeats until the order changes state; the red "đã dừng"
  dot stays still.** §1 lists it as the only allowed endless loop. Design §8.2 says the same.
- Reduced motion: motion doc §8 keeps only opacity/colour changes ≤ 200 ms. The existing rule in `apps/web/src/app/globals.css:439–445` sets `animation-duration: 0.01ms`
  and `animation-iteration-count: 1`, so the dot becomes static (no flicker) without extra code.

---

## 4. Component "Thẻ chọn" `34:383` (system page) → `ChoiceCard`

Component set, 816 x 118, **two variants only**, one variant property:

| Property | Type | Values / default |
|---|---|---|
| `Đã chọn` | variant | `Có` (`34:373`), `Không` (`34:378`) |
| `Tên` | text | default "Tiếng Việt" |
| `Ví dụ` | text | default "mitigate · giảm nhẹ" |

No component description. No hover, focus, pressed or disabled variant.

Anatomy (both variants): flex row, gap **14**, align centre, padding **18 x 16**, radius **`radius/lg` 14**, width 380 (fixed in the set).
1. Radio "Chọn" 20 x 20 (`34:374` / `34:379`): selected = `--accent` ring + `--accent` dot on `--surface`; unselected = `--ghost` ring on `--surface` (variables confirmed; shape from screenshot).
2. Text column "Chữ" (flex 1, gap 2, `nowrap`): `Tên` Noto Sans **SemiBold 17**, lh 1.6, `--ink`; `Ví dụ` `Body/Small` (Noto Regular 14 / 1.5) `--muted`.

| | `Đã chọn=Có` | `Đã chọn=Không` |
|---|---|---|
| Fill | `--accent-soft` | `--surface` |
| Border | **2 px `--accent`** | **1.5 px `--line`** |
| Shadow | navy, expressed as `drop-shadow(0 10px 12px rgba(30,58,138,.22))` (Figma value probably blur 24 with a negative spread; UNVERIFIED) | none |
| Height | 86 | 85 |

The defaults ("Tiếng Việt" / "mitigate · giảm nhẹ") show it was drawn for a meaning-language choice, not for a price. It has no slot for a savings label or a right-hand price
stack. Where else it is instanced in the file: UNVERIFIED (not searched).

### 4.1 "Thẻ chọn" vs the period cards actually drawn on Gói học

| | Thẻ chọn `34:383` | Period cards `123:4288`… |
|---|---|---|
| Instance of the component | — | **no** (local frames) |
| Radius | `radius/lg` 14 | 12 raw |
| Padding | 18 x 16 | 16 x 12 |
| Gap | 14 | 12 |
| Radio | 20 | 18 |
| Unselected | `--surface` fill, 1.5 `--line` | no fill, 1.5 `--line` |
| Selected | `--accent-soft` fill, **2** `--accent`, navy shadow | `rgba(30,58,138,.04)` fill, **1.5** `--accent`, no shadow |
| Content | title 17 SemiBold + subtitle 14 | label 15 SemiBold + savings Mono 11 `--pass`, spacer, price stack (struck 12 / price Bricolage 18 / per month 12) |

A `ChoiceCard` built from `34:383` will not look like Gói học. Options for the plan: (a) build `ChoiceCard` from the Gói học period cards (slot for a right-hand block, Figma
period-card values) and leave `34:383` as is; (b) build `ChoiceCard` from `34:383` and use it on Gói học, accepting a visual change from the frame. See Conflicts 1.

---

## 5. Hộp Giới thiệu Pro (Overlay 6) — desktop `75:2094`, phone `75:2373` (`HouseAd`)

### 5.1 Presentation

- Page behind ("Trang phía sau" `85:5375` / `85:5479`): the **Nhóm** page (carousel, "Nhóm của bạn"), with top bar; no calendar FAB on the overlay frames.
- Scrim "Nền mờ" (`75:2324` / `75:2479`): full frame (covers top bar and phone tab bar), fill **`rgba(27,36,68,0.30)`** raw, `backdrop-filter: blur(1.5px)` as generated
  (Figma background-blur radius probably 3; UNVERIFIED). No variable or style.
- **Desktop: dialog** `124:5356`, **480 x 420**, horizontally centred (x 480), **top at y 64** (directly under the 64 px top bar), not vertically centred in the 900 frame.
- **Phone: bottom sheet** `125:5159`, full width 390 x 416, bottom-anchored (y 428 → 844), **top corners only** `radius/modal` 16, **no grab handle**.
- Image / illustration: **none**.
- Motion: none in Figma. Design §8.2 (GM15): scrim 200 ms, dialog 240 ms main curve, sheet from `translateY(60px)` with fade; close in 150 ms (§8.1).

### 5.2 Box styling

| | Desktop `124:5356` | Phone `125:5159` |
|---|---|---|
| Fill / border | `--surface`, **2 px `--accent`** (all sides) | same |
| Radius | `radius/modal` 16 | 16 top-left/top-right, 0 bottom |
| Shadow | raw `0 30px 70px -26px rgba(27,36,68,.35)` (not `Shadow/Pop`) | same |
| Padding | **28 x 24** | **16 left/right, 20 top, 24 bottom** |
| Gap | 16 | 16 |
| Title size | 24 | **22** |

### 5.3 Content in order (both)

| # | Element | Copy | Font / style | Colour |
|---|---|---|---|---|
| 1 | two chips (gap 6) | **Pro** · **có AI** | JetBrains Mono Bold 11, padding 8 x 3, radius **5 raw**, fill `--accent-soft` | `--accent` |
| 2 | header row (gap 12, centre): title + close | **Học nhiều hơn với Pro** | Bricolage ExtraBold 24 [22], ls -0.5 px, flex 1 | `--ink` |
| | close "Đóng" `124:5359` / `125:5162` | (icon only, icon/x 18) | **36 x 36**, `--surface`, 1 px `--line`, radius **10 raw** | icon `--ink`-ish (asset) |
| 3 | lead | **Gói Pro có nhiều phiên luyện và nhiều lượt AI hơn mỗi tháng, và không có quảng cáo.** | Noto Regular 14.5 | `--muted` |
| 4 | check rows (icon/check 16, gap 8) | **30 phiên luyện mỗi ngày** · **Nhiều câu luyện tập và lượt tra từ bằng AI hơn** · **Không quảng cáo** | Noto Regular 14.5 | `--ink` |
| 5 | price line (baseline, gap 8) | **Từ** · **79.000 ₫** · **cho 1 tháng** | Noto Regular 15 · Bricolage **ExtraBold 40**, ls -0.84 px · Noto Regular 15 | `--muted` · `--ink` · `--muted` |
| 6 | buttons row (justify **end**, gap 20, padding-top 6) | "Nút chữ" Phụ **Để sau**, then primary **Xem gói Pro** → | `Body/Small strong`; `Body/Button` | `--muted`; `--on-accent` on `--accent` |

All copy equals the current `App.houseAd` keys (`title`, `lead`, `sessions`, `ai`, `noAds`, `from`, `cta`); "Để sau" is new for this box (the same text exists as
`App.practice.session.ai.later`). The close button is 36 px: the phone needs a ≥ 44 px hit area around it.

---

## 6. Conflicts (Figma vs design text and between Figma sources)

1. **ChoiceCard for the Pro period (design §7.5).** §7.5 maps "Thẻ chọn `34:383` → `ChoiceCard`, Chọn kỳ gói Pro". The Gói học frames do **not** instance `34:383`; they use
   local "Kỳ … tháng" frames with different radius (12 vs 14), padding, radio size (18 vs 20), selected style (1.5 px border + 4 % accent fill, no shadow vs 2 px border +
   `--accent-soft` + navy shadow) and anatomy (right-hand price stack and savings label, which `34:383` cannot hold). Needs a call (options in §4.1). Recommend building
   `ChoiceCard` with a trailing slot and the Gói học values, since the frame is the screen the learner sees.
2. **Pending-dot colour wording.** Specimen note says "chấm xanh"; the bound variable is `--accent` navy, not `--pass` green. Use `--accent`. (Not a conflict with the design
   text, which names no colour; listed so the plan does not read "xanh" as green.)
3. **Dialog shadow (design §3.3).** §3.3: dialogs and menus use `--shadow-pop`. Overlay 6 uses raw `0 30 70 -26 rgba(27,36,68,.35)`; the Pro card uses raw
   `0 40 70 -40 rgba(27,36,68,.42)` where §3.3 says cards use `--shadow-card`. Both are deliberate leftovers of the Pro "glow" after round 15 removed the glow rings
   (`app-redesign-plan.md` line 478). Recommend: keep the Figma values as a named token for "Pro emphasis", or fall back to `--shadow-pop` / `--shadow-card`; needs a call.
4. **Label radius (design §3.3 "nhãn và chip đếm 6").** The tags "gói hiện tại", "có AI", "Pro" here are radius **5**. Use 6 per §3.3 unless the owner says otherwise.
5. **Card radius.** Cards here are 18 raw; the transactions/reports cards (m6-b) are `radius/xl` 20. §3.3 allows 14–28 but there is no 18 token. Recommend `radius/xl` 20
   for consistency, or add a token; needs a call (small visual change).
6. **"Xem gói" without "→".** Component "Nút chữ" note: "đi tới trang khác thì giữ '→' trong nhãn". The order page "Xem gói" goes to `/app/plans` but has no arrow
   (existing key `seePlan` "Xem gói"). Figma contradicts its own component rule; the transactions page used "Xem gói học →".
7. **Dialog placement.** Figma draws the desktop dialog at the top (y 64), `app-redesign-plan.md` ("Sáu overlay") says centred from 768 px. Design §5.6/§8.2 do not say.
   Low stakes; follow whatever the shared `Dialog` does for the other overlays.
8. **Plan chip in the top bar.** The top bar on Gói học shows "Pro" while the page shows a Free learner ("gói hiện tại" on Free). It is the component default; what the chip shows
   for Free is decided in M1 (`TopBar`), not here. UNVERIFIED.
9. **Text size (design §3.3 "Chữ đọc 16 px trở lên").** Feature lists and order bodies are 14.5 px, the footnote 13.5 px, per-month and struck prices 12 px. Follow Figma
   (these are secondary lines), but note the divergence.
10. **Struck price contrast.** `--ghost #c9cedc` on white is about 1.6:1. If the struck price is meant to be read (it carries the saving), it fails WCAG 1.4.3; mark it
    `aria-hidden` and say the saving in text ("−16%" already does), or use `--muted`.
11. §8.2 "Đơn hàng" and motion doc §6 agree with Figma (navy blinking for the three waiting states including "Đang kiểm tra đơn hàng…", red static for stopped).
    §9 M7 frame list matches the nodes read. §10.6: Gói học prices come from the API (`GET /v1/me/app-config`); Figma shows the defaults 79.000 / 199.000 / 599.000, so
    struck prices, savings and per-month lines must be computed, not copied. No contradiction found.

## 7. Copy table (existing key → Figma text; "new" = no key today)

Namespace from `apps/web/messages/vi.json`: `App.plans`, `App.plans.order`, `App.houseAd`.

| Key (existing or suggested) | Figma vi text | vs current `vi.json` |
|---|---|---|
| `App.plans.title` | Học đều mỗi ngày, lên Pro khi cần | same |
| new `App.plans.lead` | Trả một lần cho mỗi kỳ, không tự gia hạn. Hết kỳ, bạn về gói Miễn phí. | new (code has `backToFree` "Tự động về Free khi Pro hết hạn") |
| `App.plans.free` / `App.plans.pro` | Miễn phí / Pro | same |
| `App.plans.yours` | gói hiện tại | case differs ("Gói hiện tại"); Figma lower-case mono tag |
| new `App.plans.freePrice`, `App.plans.freePriceNote` | 0 ₫ / không thu tiền | new |
| `App.plans.freeList.review`, `.lookup`, `.sessions`, `.ai` | Ôn thẻ, lịch ôn, nhắc học qua email · Tra từ, thêm nhanh, tối đa 100 nhóm · 3 phiên luyện mỗi ngày · 15 câu AI và 5 lượt tra AI mỗi tháng | same wording (numbers are ICU params) |
| new `App.plans.freeAds` | Có thể có quảng cáo. | new |
| `App.plans.usingThis` | bạn đang dùng gói này | case differs ("Bạn đang dùng gói này") |
| new `App.plans.proBadge` | có AI | new |
| `App.plans.proLine` | Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn. | **differs** (code: "Nhiều phiên luyện hơn và nhiều lượt AI hơn mỗi tháng.") |
| `App.plans.periods.1/3/12` | 1 tháng / 3 tháng / 12 tháng | same |
| new `App.plans.perMonth`, `App.plans.perMonthApprox` | mỗi tháng / ≈ {price} mỗi tháng | new |
| new `App.plans.saving`, `App.plans.savingBest` | −{percent}% / −{percent}% · tiết kiệm nhất | new |
| `App.plans.proList.*` | AI viết câu luyện cho từng từ bạn học · Tra từ bằng AI khi từ điển chưa có · 300 câu AI và 100 lượt tra AI mỗi tháng · 30 phiên luyện mỗi ngày · Không quảng cáo · Mọi thứ của gói Miễn phí | **differs**: six items vs four ("Tối đa {count} câu AI mới mỗi tháng", "{count} lượt tra AI mỗi tháng" separate) |
| `App.plans.buy` | Mua gói Pro {period} | **differs** (code: "Mua") |
| `App.plans.oneTime` + `App.plans.noRefund` | Trả một lần, dùng 12 tháng, không tự gia hạn. Không hoàn tiền tự động; cần hỗ trợ, liên hệ support@wordmet.com. | Figma joins them into one sentence; code has "Trả một lần, dùng {period}." + "Gói không tự gia hạn. Không hoàn tiền tự động; …" |
| `App.plans.compare` | So sánh chi tiết các gói | same |
| `App.plans.compareTable.feature` | tính năng | case differs ("Tính năng") |
| `App.plans.compareTable.*` rows, `yes`, `no` | as §1.2 table; Có / Không | same |
| `App.plans.order.checking` | Đang kiểm tra đơn hàng… | same |
| `App.plans.order.paidTitle`, `.paid` | Thanh toán thành công / Gói Pro có hiệu lực đến hết **{date}**. | same |
| `App.plans.order.rowPlan`, `.planValue`, `.rowAmount`, `.rowCode` | Gói / Pro, {period} / Số tiền / Mã đơn hàng | same |
| `App.plans.order.start`, `.seePlan` | Bắt đầu học / Xem gói | same |
| `App.plans.order.pendingTitle`, `.pending` | Đang chờ xác nhận thanh toán / Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này. | same |
| `App.plans.order.needsReviewTitle`, `.needsReview`, `.contact` | Giao dịch đang được kiểm tra / Gói Pro sẽ được kích hoạt sau khi kiểm tra xong. / Hỗ trợ: support@wordmet.com | same |
| `App.plans.order.ended`, `.newOrder`, `.toPlans` | Đơn hàng đã hủy hoặc hết hạn / Bạn có thể tạo đơn mới tại trang Gói học. / Đến trang Gói học | same |
| `App.houseAd.*` | Học nhiều hơn với Pro · Gói Pro có nhiều phiên luyện… · 30 phiên luyện mỗi ngày · Nhiều câu luyện tập và lượt tra từ bằng AI hơn · Không quảng cáo · Từ 79.000 ₫ cho 1 tháng · Xem gói Pro | same |
| new `App.houseAd.later`, `App.houseAd.badgePro`, `App.houseAd.badgeAi` | Để sau / Pro / có AI | new |

Keys in code with no Figma counterpart (states not drawn): `App.plans.eyebrow`, `titlePro`, `titleTrial`, `granted`, `renews`, `endsOn`, `trialUntil`, `period`, `yoursGift`,
`backToFree`, `startsOn`, `termsLink`, `upgrade`, `currentPeriod`, `priceChanged`, `buyUnavailable`, `nextPeriod`, `thenPeriod`, `until`, `freeList.aiOff`, the whole
`App.plans.subscriptions` block (auto-renew; Hộp Hủy gói has no frame, §9 M7), `order.paidNoDate`, `order.notFound`.

## 8. Unresolved / UNVERIFIED

- Pro, trial, granted and "price changed" states of Gói học; order not found, paid-without-date, error and loading of the order page; phone versions of the four other order
  states; Dark for all three screens: **not drawn**.
- Hover, focus, pressed, disabled of the period cards and of `34:383`: not drawn. Focus ring per §3.3 (3 px accent) applies.
- Exact Figma shadow of `Thẻ chọn` selected (code shows `drop-shadow 0 10 12 rgba(30,58,138,.22)`), and the scrim's Figma blur radius (code shows 1.5 px).
- Colour of icon/check in the feature lists (unbound; looks like `--pass`) and of icon/x in the close button (asset).
- Rounding rule for "≈ … mỗi tháng" (nearest 100 vs floor to 100) and for the savings percent; whether "₫" is preceded by a normal or a no-break space.
- Where else `34:383` is instanced in the file (likely a language choice in Cài đặt or onboarding); not searched.
- Whether the plan chip "Pro" in the top bar changes for a Free learner (M1 `TopBar` question).
