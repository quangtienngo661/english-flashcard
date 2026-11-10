# Figma facts for M2 (sign-in and account pages), 2026-11-10

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page `35:307` ("Đăng nhập và tài khoản"). Read only (`get_metadata`, `get_design_context`, `get_variable_defs`, `get_screenshot`). Vietnamese copy is quoted as in Figma. Token names are the ones Figma exposes (`var(--x)`, `radius/x`, text style names). Where Figma shows only a raw value, it is marked "raw".

## 0. Frames on the page

The page holds exactly the 18 frames requested. **No extra frames** (no error, loading, or empty-state frames). The only state variants live inside components (section 2).

| Screen | Desktop 1440 | Mobile 390 |
|---|---|---|
| Đăng nhập | `35:308` (1440x900) | `37:485` (390x780) |
| Đăng ký | `35:405` (1440x1078) | `37:533` (390x1068) |
| Xác minh email | `36:385` (1440x900) | `37:623` (390x780) |
| Quên mật khẩu | `36:417` | `37:656` |
| Đặt mật khẩu mới | `36:447` (+ `153:705`) | `37:687` (+ `153:728`) |
| Hoàn tất đăng ký Google | `36:490` | `37:731` |
| Đã xóa tài khoản | `36:549` | `37:791` |
| Bổ sung hồ sơ | `36:564` | `37:807` |
| Chào mừng: chọn ngôn ngữ | `36:591` | `37:835` |

`153:705` / `153:728` are the "Nhập lại mật khẩu mới" `Ô nhập` instances (label "Nhập lại mật khẩu mới", value `••••••••••`, eye icon, no hint, height 76).

Not read in full (inferred from metadata node names and identical copy): mobile Quên mật khẩu (`37:656`) and mobile Đặt mật khẩu mới (`37:687`) beyond layout metadata; desktop Quên mật khẩu was read in full.

## 1. Tokens and text styles seen on these frames

Colour variables: `--bg #f6f7fa`, `--surface #ffffff`, `--ink #1b2444`, `--muted #525a78`, `--line #e1e5ee`, `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--on-accent #ffffff`, `--fail #b8352a`, `--pass #1b7a46` (Turnstile circle), `--ghost #c9cedc` (unchecked checkbox border), `--mark #ffd84a` / `--mark-ink #1b2444` (highlighted word on the brand panel).
Radius variables: `radius/md` 10 (fields, OTP boxes, Turnstile box, language menu items), `radius/button` 10 (buttons, Google button), `radius/lg` 14 (language menu, "Thẻ Hôm nay"), `radius/xl` 20 (flash cards on brand panel), `radius/2xl` 28 (centered card, brand panel), `radius/pill` 999 (Google account chip). Checkbox radius 6 (raw).
Named text styles: `Display/Logo` (Bricolage Grotesque ExtraBold 22, lh 1.2), `Display/Page title mobile` (Bricolage Grotesque Bold 38, lh 1.22, ls -2 as reported by Figma; code shows -0.76px), `Body/Base` (Noto Sans Regular 16, lh 1.6), `Body/Small` (Noto Sans Regular 14, lh 1.5), `Body/Caption` (Noto Sans Regular 13, lh 1.4), `Body/Label` (Noto Sans SemiBold 13, lh 1.4), `Body/Button` (Noto Sans SemiBold 15, lh 1.4).
Effects: `Shadow/Lift` (card and language menu), `Shadow/Soft` (secondary button).
Headings and some labels have **no named style in Figma** (raw): Bricolage Grotesque Bold, sizes in section 3. Field label is raw Noto Sans SemiBold 14, lh 1.6 (not `Body/Label`, which is 13). Link in a field's label row ("Quên mật khẩu?") is `Body/Label`-sized (13, SemiBold, accent) but lh 1.4.

## 2. Component facts (Figma main components)

**Logo** (`3:14`, instance name `Logo`): text "wordmet" + "." coloured `#1e3a8a` (accent), `Display/Logo`, colour `--ink`. 104x26.

**Ô nhập** (`34:345`, instance name `Ô nhập`), variants `Trạng thái=Thường` (`34:308`), `Đang nhập` (`34:319`), `Lỗi` (`34:331`). Props: label, value, `có gợi ý`, `có icon`, `có liên kết`, hint text, link text. Structure: column gap 6; row 1 "Dòng nhãn" (label left, optional link right, space-between); box "Ô"; optional "Gợi ý" row. Box: height 48, padding x 14, `radius/md`, bg `--surface`, text Noto Sans Regular 16 (`Body/Base`) `--ink`, 20x20 icon at the right (eye icon, name `Icon`).
- Thường: border 1.5 `--line`.
- Đang nhập: border 2 `--accent` + ring `0 0 0 4px rgba(30,58,138,0.16)`; caret = 2x20 `--accent` bar.
- Lỗi: border 2 `--fail`; hint row = 16x16 "Icon lỗi" + message, message `Body/Caption` 13 colour `--fail`, gap 6 (the error message replaces the hint; no frame shows an actual error message copy).
- Hint: `Body/Caption` 13 `--muted`. Description in Figma: "nhãn luôn hiện phía trên, gợi ý ràng buộc dưới ô, lỗi dưới ô kèm icon."
- Password field = same component with `có icon` (eye). Figma draws only the eye icon (revealed/hidden toggle states not drawn). Value is `••••••••••`.
- Heights seen: 76 (no hint), 100 (one-line hint), 118 (two-line hint, mobile).

**Ô tick** (`34:347` checked, `34:352` unchecked; instance name `Ô tick`): row gap 10; 20x20 box radius 6. Checked: fill `--accent`, 14x14 white check. Unchecked: fill `--surface`, border 1.5 `--ghost`. Label `Body/Small` 14 lh 1.5 `--ink`. Default label: "Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật." In the screenshots "Điều khoản sử dụng" and "Chính sách bảo mật" are bold accent (links); the reference code renders them as plain text in one node. Height 42 (2 lines).

**Nút** (`3:12`, instance name `Nút`), variants `Kiểu=Chính` (`3:4`) and `Kiểu=Phụ` (`3:8`). Padding 20x12, gap 8, `radius/button`, label `Body/Button`; optional 16x16 arrow icon (`Mũi tên`) after label. Height 45 (Chính) / 47 (Phụ, has border). Description: "Nút bo tròn. Chính: nền màu nhấn và glow xanh. Phụ: nền surface, viền line, bóng mềm."
- Chính: bg `--accent`, text `--on-accent`, drop shadow `0 10 14 rgba(30,58,138,0.34)`.
- Phụ: bg `--surface`, border 1 `--line`, text `--ink`, `Shadow/Soft`.
- Disabled (no variant; drawn as the Chính instance with opacity 50%): `Nút Xác minh (chưa đủ 6 số)` `36:412`/`37:651`, `Nút Tiếp tục (chưa tick đồng ý)` `36:587`/`37:831`. Loading state: not drawn anywhere.
- All primary buttons in forms are full width (400 desktop-split / 398 desktop-card / 308 mobile), except "Về trang đăng nhập" (Phụ, content width 187, centered).

**Nút Google** (`34:366`, instance name `Nút Google`): like Phụ but flatter: height 48, bg `--surface`, border 1.5 `--line`, `radius/button`, gap 12, 20x20 "Logo Google" (four brand colours) + "Tiếp tục với Google" (`Body/Button`, `--ink`). Full width.

**Ô mã** (OTP box; instance name `Ô mã`, states `Thường`, `Đang nhập`, `Có số`): 6 boxes. Desktop 52x60, space-between in 398 (gaps ~17.2); mobile flex-1, height 54, gap 8 (boxes ~44.7 wide). `radius/md`.
- Thường: bg `--surface`, border 1.5 `--line`.
- Đang nhập: bg `--surface`, border 2 `--accent`, caret 2x28 `--accent`.
- Có số: bg `--accent-soft`, border 2 `--accent`, digit Bricolage Grotesque Bold 28 (raw), ls -0.28, colour `--ink`.
Shown fill in Xác minh email: 4, 8, 2, [caret], empty, empty. In Đặt mật khẩu mới: 4 8 2 9 1 7 (all filled).

**Ô chọn** (`46:326`, instance name `Ô chọn`; variants `Trạng thái=Đóng` `46:306`, `Mở` `46:316`): label "Ngôn ngữ" (raw SemiBold 14, `--ink`), box height 48, padding left 14 / right 12, gap 10, `radius/md`; content: 20x13.33 flag (radius 2) + "Tiếng Việt" (`Body/Base`) + 20x20 chevron. Đóng: border 1.5 `--line`. Mở: border 2 `--accent` + 4px ring, chevron up. Description: "Ô chọn (dropdown). Cờ giữ màu thật ở cả hai theme, như app-ui/Flag.tsx."
**Menu chọn ngôn ngữ** (`46:713`, desktop only, drawn open): absolute under the field, width 398, padding 6, gap 2, bg `--surface`, border 1 `--line`, `radius/lg`, shadow (raw drop shadows). Items (padding 10, gap 10, `radius/md`): "Tiếng Việt" (selected: bg `--accent-soft`, text SemiBold 16 `--accent`, 18x18 check at right, 20x13.33 VN flag) and "English" (Regular 16 `--ink`, 20x10 UK flag).

**Turnstile box** (name `Ô xác minh Cloudflare (Turnstile tự vẽ)`; Figma comment says it is hand-drawn): row, padding 14x12, gap 10, bg `--surface`, border 1 `--line`, `radius/md`; 18x18 green circle (`--pass`) + "Đã xác minh" (`Body/Small` 14 `--ink`). Only the verified state is drawn. Used on Đăng ký only (both sizes), full width, height 47.

## 3. Per-screen facts

Notation: "desktop" = 1440 frame, "mobile" = 390 frame. Sizes are Figma px.

### 3.1 Đăng nhập (`35:308` / `37:485`)

**Layout (desktop): split.** Frame padding 16, bg `--bg`. Left "Cột form" 768 wide (x 16 to 784; content padding x 48, top 20, bottom 24), flex column, centered: logo top-left (`Đầu`, 672 wide, logo 104x26 at x 48,y 20), then flexible spacer (min 32), then "Form" 400 wide centered, then spacer (min 32), then footer "Chân" pinned at the bottom. Right "Khung giới thiệu": 640 wide, 868 tall (fills height), bg `--accent-soft`, `radius/2xl` (28), overflow clipped. No dot grid on the left column; the dot grid lives inside the right panel only (see 4.2).
**Right panel content** (exact text): three overlapping, rotated flash cards (white, `radius/xl`, padding 20, gap 10, width 340, shadow `0 40 100 -50 rgba(30,58,138,.3), 0 50 110 -40 rgba(27,36,68,.38)`), back to front:
1. "Thẻ từ · ngăn 7 ngày" / "allocate" / "verb · /ˈæl.ə.keɪt/" / "to give something to someone for a purpose" / "phân bổ" (rotated +7deg, opacity 0.8)
2. "Thẻ từ · ngăn 3 ngày" / "viable" / "adj · /ˈvaɪ.ə.bəl/" / "able to work as intended" / "khả thi" (rotated +3deg)
3. "Thẻ từ · ngăn 1 ngày" / "mitigate" / "verb · /ˈmɪt.ɪ.ɡeɪt/" / "to make something bad less serious" / "giảm nhẹ" + example box (bg `--bg`, `radius/md`): "Planting trees can help mitigate urban heat." with "mitigate" highlighted (`--mark` bg, `--mark-ink`, radius 4) (rotated -2deg, front)
and a small card "Hôm nay" / "12" (Bricolage Bold 36, `--accent`) + "từ đến hạn" / five bars (30x8, radius 4; first two `--accent`, last three `--line`), `radius/lg`, backdrop blur 7, rotated +4deg, bottom right.
Background details in the panel: 3 soft glow ellipses ("Quầng sáng"), the dot-grid instance (opacity 0.45), a dashed curved path "Đường ôn (Mới → 30 ngày)" with 6 stage dots (Mới, 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày) and three word chips ("Chip từ" component `96:322`, bg `--bg`, 8px colour square + Bricolage Bold 14 word): "deadline", "negotiate", "commute".
**Mobile:** no right panel. Bg `--bg` with 2 glow ellipses (-80,140, 360x300; 150,360, 320x280). Top "Đầu": logo at x16,y20. Below (gap 24) a **centered-card layout**: card 358 wide (x 16), padding 24, gap 18, bg `--surface`, border 1 `--line`, `radius/2xl`, `Shadow/Lift`-like shadow (`0 40 100 -50 / 0 50 110 -40`). No footer on mobile.

**Elements, top to bottom (desktop form, 400 wide, gap 16):**
1. Heading "Đăng nhập" — Bricolage Grotesque Bold 44, lh 1.18, ls -1.1, `--ink` (raw). Mobile: `Display/Page title mobile` 38, lh 1.22.
2. `Ô nhập` label "Email", value `lan.nguyen@gmail.com` (state Thường). No placeholder drawn (a value is shown).
3. `Ô nhập` label "Mật khẩu", link "Quên mật khẩu?" right of label (13, SemiBold, `--accent`), value `••••••••••`, eye icon; drawn in **Đang nhập** (focused, caret) state.
4. `Nút` Chính "Đăng nhập" (full width).
5. Divider row "Hoặc" (centered text, `Body/Caption` 13 `--muted`; no lines drawn, text only).
6. `Nút Google` "Tiếp tục với Google".
7. Switch row (centered, gap 6, 14px): "Chưa có tài khoản?" (`Body/Small`, `--muted`) + "Đăng ký" (SemiBold 14, `--accent`).
8. Footer (desktop only, bottom of left column, gap 20, `Body/Caption` 13 `--muted`): "© 2026 Wordmet", "Chính sách bảo mật", "Điều khoản sử dụng".
**States shown:** focused password field only. No error text, no loading, no disabled state.

### 3.2 Đăng ký (`35:405` / `37:533`)

**Layout:** same split as 3.1 (desktop frame is 1078 tall because the form is taller; left column and panel stretch to 1046). Right panel differs: cards "Thẻ từ · Đề 12" / "mitigate" / "verb · /ˈmɪt.ɪ.ɡeɪt/" / "to make something bad less serious" / "giảm nhẹ" + the same example sentence, and a group card "Đề 12 · Writing" with word tags "mitigate", "allocate", "viable", "+9 từ"; same dot grid, dashed path, glows, chips ("deadline", "negotiate", "commute"). Form block starts near the top (spacer 40 above and below, instead of flexible). Mobile: card layout, card padding 24, gap 18, no footer.
**Elements, top to bottom (desktop form 400, gap 16):**
1. Heading "Tạo tài khoản" (Bricolage Bold 44 desktop; 32 lh 1.3 ls -0.32 on mobile).
2. Row "Tên và họ" (two fields side by side, gap 12 desktop / 10 mobile): `Ô nhập` "Tên" value "Lan"; `Ô nhập` "Họ (không bắt buộc)" empty.
3. `Ô nhập` "Ngày sinh", empty, hint "Wordmet dành cho người từ 13 tuổi." (no placeholder, no date-picker icon drawn; in Bổ sung hồ sơ the value looks like `14/03/2004`, i.e. text field with dd/mm/yyyy).
4. `Ô nhập` "Email", value `lan.nguyen@gmail.com`.
5. `Ô nhập` "Mật khẩu", value `••••••••••`, eye icon, hint "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt."
6. `Ô nhập` "Nhập lại mật khẩu" (node `153:683` desktop / `153:694` mobile), value `••••••••••`, eye icon, **no hint** (a hint prop with the same text exists on the instance but it is hidden in the frame).
7. `Ô tick` checked, "Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật."
8. Turnstile box "Đã xác minh".
9. `Nút` Chính "Tạo tài khoản".
10. "Hoặc" divider; `Nút Google` "Tiếp tục với Google".
11. Switch row: "Đã có tài khoản?" + "Đăng nhập".
12. Footer (desktop): "© 2026 Wordmet", "Chính sách bảo mật", "Điều khoản sử dụng".
**States shown:** all fields in Thường, tick checked, Turnstile verified. No errors, no disabled button.

### 3.3 Xác minh email (`36:385` / `37:623`)

**Layout: centered card on `--bg`.** No split panel, no footer. Logo at top-left of the frame (desktop x64,y36; mobile x16,y20). Two soft glow ellipses behind the card (desktop: 560x440 at 360,140 navy-ish, 500x380 at 660,360 yellow-ish; mobile: 360x300 and 320x280). Card (desktop): 480 wide, padding 40 (+1 border), gap 20, bg `--surface`, border 1 `--line`, `radius/2xl`, shadow `0 40 100 -50 rgba(30,58,138,.3), 0 50 110 -40 rgba(27,36,68,.38)`; card centered horizontally and vertically (frame padding-top 110, bottom 80). Mobile card: full width minus 16, padding 24, gap 18.
**Elements:**
1. "Quay lại" back link: 16x16 left arrow + "Quay lại" (`Body/Label`, 13 SemiBold, `--accent`), gap 6.
2. Heading "Nhập mã 6 số" — Bricolage Bold 30, lh 1.3, ls -0.3 (raw); mobile 26, ls -0.26.
3. Paragraph (`Body/Base` 16, `--muted`): "Mã đã gửi tới " + **"lan.nguyen@gmail.com"** (SemiBold, `#1b2444`) + ". Mã có hiệu lực 10 phút." Heading+paragraph gap 8.
4. OTP row: 6 `Ô mã` (see section 2).
5. `Nút` Chính "Xác minh", **disabled** (opacity 50%) because fewer than 6 digits.
6. Centered text "Gửi lại mã sau 42 giây" (`Body/Small` 14, `--muted`). The enabled "resend" state (after the countdown) is not drawn.
**States shown:** partial OTP (3 digits + focused box), disabled submit, resend countdown. No error and no success.

### 3.4 Quên mật khẩu (`36:417` / `37:656`)

**Layout:** centered card, identical shell to 3.3 (desktop card 480x380; mobile card 358x337).
**Elements:**
1. "Quay lại" back link.
2. Heading "Quên mật khẩu" (30 desktop / 26 mobile).
3. Paragraph (`Body/Base`, `--muted`): "Nhập email của bạn. Nếu email này có tài khoản, Wordmet gửi mã đặt lại tới đó."
4. `Ô nhập` label "Email", value `lan.nguyen@gmail.com`, drawn in **Đang nhập** (focused) state.
5. `Nút` Chính "Gửi mã".
**States shown:** focused email field only.

### 3.5 Đặt mật khẩu mới (`36:447` / `37:687`; fields `153:705` / `153:728`)

**Layout:** centered card, same shell (desktop card 480x562; mobile 358x507).
**Elements:**
1. "Quay lại" back link.
2. Heading "Đặt mật khẩu mới" (30 / 26).
3. Label text "Mã 6 số trong email" (raw SemiBold 14, `--ink`; not an `Ô nhập` label; it sits above the OTP row with extra spacing: gap 20 then OTP).
4. OTP row: 6 `Ô mã`, all in `Có số` state: 4, 8, 2, 9, 1, 7.
5. `Ô nhập` "Mật khẩu mới", `••••••••••`, eye icon, hint "Đổi xong, mọi thiết bị khác sẽ bị đăng xuất.", drawn **Đang nhập** (focused).
6. `Ô nhập` "Nhập lại mật khẩu mới" (`153:705` / `153:728`), `••••••••••`, eye icon, state Thường, **no hint** (height 76).
7. `Nút` Chính "Đổi mật khẩu".
**States shown:** OTP complete, first password focused, enabled submit. No mismatch error drawn.

### 3.6 Hoàn tất đăng ký Google (`36:490` / `37:731`)

**Layout:** centered card (desktop 480x579; mobile 358x558). No back link.
**Elements:**
1. Google account chip ("Tài khoản Google"): pill (`radius/pill`), bg `--bg`, border 1 `--line`, padding 6 left 10 / right 14, 20x20 Google logo + `lan.nguyen@gmail.com` (`Body/Small` 14, `--ink`).
2. Heading "Hoàn tất đăng ký" (30 / 26).
3. Paragraph: "Bạn sắp tạo tài khoản Wordmet bằng " + **"lan.nguyen@gmail.com"** (SemiBold, `#1b2444`) + ". Còn vài thông tin nữa."
4. Row: `Ô nhập` "Tên" ("Lan") + `Ô nhập` "Họ (không bắt buộc)" (desktop value "Nguyễn"; mobile empty). Gap 12 desktop / 10 mobile.
5. `Ô nhập` "Ngày sinh", empty, hint "Wordmet dành cho người từ 13 tuổi."
6. `Ô tick` checked "Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật."
7. `Nút` Chính "Tạo tài khoản" (enabled). No Turnstile, no email/password fields.
**States shown:** pre-filled name from Google, empty date.

### 3.7 Đã xóa tài khoản (`36:549` / `37:791`)

**Layout:** centered card, **centered content** (items-center, text-center). Desktop card 480x336, padding 40, gap 20; mobile 358x321, padding 24, gap 18. No back link, no footer.
**Elements:**
1. Icon circle: bg `--accent-soft`, 64x64 desktop / 56x56 mobile (radius 32 / 28), check icon 28 / 26.
2. Heading "Tài khoản của bạn đã được xóa." — Bricolage Bold 24, lh 1.3, ls -0.24 (same size both), centered; wraps to 2 lines on mobile.
3. Paragraph (`Body/Base`, `--muted`, centered): "Cảm ơn bạn đã học cùng Wordmet. Thư xác nhận đã gửi tới email của bạn."
4. `Nút` **Phụ** "Về trang đăng nhập" (no arrow, content width 187, centered).
**States shown:** success only.

### 3.8 Bổ sung hồ sơ (`36:564` / `37:807`)

**Layout:** centered card (desktop 480x428; mobile 358x445). No back link, no logo link difference.
**Elements:**
1. Heading "Bổ sung thông tin tài khoản" (30 / 26; wraps to 2 lines on mobile).
2. Paragraph (`Body/Base`, `--muted`): "Trước khi học tiếp, Wordmet cần ngày sinh của bạn và việc bạn đồng ý với điều khoản."
3. `Ô nhập` "Ngày sinh", value `14/03/2004`, hint "Wordmet dành cho người từ 13 tuổi."
4. `Ô tick` **unchecked**, "Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật."
5. `Nút` Chính "Tiếp tục", **disabled** (opacity 50%; name `Nút Tiếp tục (chưa tick đồng ý)`).
**States shown:** date filled, tick off, button disabled.

### 3.9 Chào mừng: chọn ngôn ngữ (`36:591` / `37:835`)

**Layout:** centered card (desktop 480x381; mobile 358x335). No back link.
**Elements:**
1. Heading "Bạn đọc nghĩa của từ bằng ngôn ngữ nào?" (30 / 26; 2 lines on both).
2. Paragraph (`Body/Base`, `--muted`): "Giao diện cũng dùng ngôn ngữ này. Đổi lại được trong Cài đặt."
3. `Ô chọn` label "Ngôn ngữ", value "Tiếng Việt" + VN flag. Desktop frame draws it **Mở** (open, ring) with the menu (items "Tiếng Việt" selected with check, "English"); mobile frame draws it **Đóng** (closed) with no menu.
4. `Nút` Chính "Tiếp tục" with trailing 16x16 arrow icon.
**Note:** on desktop the menu overlaps the "Tiếp tục" button (menu top at card y 280 over the button at y 295); the card shadow on this frame is the heavier `Shadow/Lift` form (no negative spread in the code: `0 40 100 0 / 0 50 110 0`), others use the spread -50/-40 version.

## 4. Shared pieces

### 4.1 Centered card shell (screens 3.3 to 3.9)
Bg `--bg`; two "Quầng sáng" glow ellipses behind; `Logo` top-left (desktop 64,36; mobile in "Đầu" row 16,20, card begins 24 below); card `--surface`, border 1 `--line`, `radius/2xl`, shadow `0 40 100 -50 rgba(30,58,138,.3), 0 50 110 -40 rgba(27,36,68,.38)`. Desktop card 480 wide, padding 40, gap 20, vertically centered (frame padding-top 110, bottom 80). Mobile card full width minus 16 gutters, padding 24, gap 18. Heading+description group: gap 8, heading 30 (desktop) / 26 (mobile), description `Body/Base` `--muted`.
Back link ("Quay lại") appears on Xác minh email, Quên mật khẩu, Đặt mật khẩu mới only.

### 4.2 Split auth layout (screens 3.1, 3.2)
Left column 768 (padding 48/20/24) with logo top, form 400 wide, footer bottom; right brand panel 640 wide, `--accent-soft`, `radius/2xl`, 16px outer padding. Panel layers: glow ellipses, "Nền app/Lưới chấm — Desktop" component (`95:315`, dot grid 20px fading to the edge + navy glow top-left + yellow glow bottom-right; description: "Nền hướng 2 (vòng 8–9)…"), dashed review path, flash-card stack, word chips. The two panels differ only in the card content (Đăng nhập: stack of 3 "ngăn" cards + "Hôm nay"; Đăng ký: "Đề 12" card + "Đề 12 · Writing" group card). Footer links identical.
Mobile drops the panel and footer and uses 4.1's mobile shell.

### 4.3 Fields and form atoms
`Ô nhập`, `Ô tick`, `Nút` (Chính/Phụ), `Nút Google`, "Hoặc" divider (text only), switch row, Turnstile box, `Ô mã`, `Ô chọn`, Google account chip, `Logo`. Details in section 2.

## 5. Components needed (deduplicated)

| # | UI piece | Used by (desktop / mobile frames) |
|---|---|---|
| 1 | **Split auth layout**: left column (logo top, 400 form, footer bottom) + right brand panel 640 wide `--accent-soft` with dot grid, glows, dashed review path and chips; panel content slot (two variants: "ngăn" card stack + "Hôm nay" card; "Đề 12" card + group card) | Đăng nhập, Đăng ký (desktop only) |
| 2 | **Auth page footer**: "© 2026 Wordmet" · "Chính sách bảo mật" · "Điều khoản sử dụng" | Đăng nhập, Đăng ký (desktop only; absent on mobile) |
| 3 | **Centered card layout** with glow background and top-left logo (desktop card 480 / mobile card 358, padding 40 / 24) | Xác minh email, Quên mật khẩu, Đặt mật khẩu mới, Hoàn tất đăng ký Google, Đã xóa tài khoản, Bổ sung hồ sơ, Chào mừng; and, on mobile, Đăng nhập and Đăng ký |
| 4 | **Logo** "wordmet." (`Display/Logo`) | all 18 |
| 5 | **Card heading group** (heading 30/26 + optional description) | 3.3 to 3.9; page title (44 desktop / 38 mobile login, 32 mobile register) for Đăng nhập and Đăng ký |
| 6 | **Back link** ("Quay lại" with left arrow) | Xác minh email, Quên mật khẩu, Đặt mật khẩu mới |
| 7 | **Text field** (`Ô nhập`): label, optional link in label row, optional hint, states Thường / Đang nhập / Lỗi (error icon + `--fail` message) | Đăng nhập, Đăng ký, Quên mật khẩu, Đặt mật khẩu mới, Hoàn tất đăng ký Google, Bổ sung hồ sơ |
| 8 | **Password field with reveal** (`Ô nhập` + 20px eye icon; toggle states not drawn) | Đăng nhập (1), Đăng ký (2), Đặt mật khẩu mới (2) |
| 9 | **Two-column name row** (Tên + Họ (không bắt buộc), gap 12 desktop / 10 mobile) | Đăng ký, Hoàn tất đăng ký Google |
| 10 | **Date-of-birth field** (`Ô nhập` "Ngày sinh" with hint "Wordmet dành cho người từ 13 tuổi."; value format `14/03/2004`) | Đăng ký, Hoàn tất đăng ký Google, Bổ sung hồ sơ |
| 11 | **OTP input, 6 boxes** (states empty / focused / filled; desktop 52x60 fixed, mobile flex 54 high) | Xác minh email, Đặt mật khẩu mới |
| 12 | **Terms checkbox** (`Ô tick`, label with two inline bold-accent links; checked/unchecked) | Đăng ký, Hoàn tất đăng ký Google, Bổ sung hồ sơ |
| 13 | **Turnstile placeholder box** ("Đã xác minh", green circle) | Đăng ký |
| 14 | **Primary button** (`Nút` Chính; full width; disabled = 50% opacity; optional trailing arrow) | all screens except Đã xóa tài khoản |
| 15 | **Secondary button** (`Nút` Phụ, content width) | Đã xóa tài khoản |
| 16 | **Google button** ("Tiếp tục với Google") | Đăng nhập, Đăng ký |
| 17 | **"Hoặc" divider** (text only) | Đăng nhập, Đăng ký |
| 18 | **Switch-page row** ("Chưa có tài khoản? Đăng ký" / "Đã có tài khoản? Đăng nhập") | Đăng nhập, Đăng ký |
| 19 | **Resend countdown text** ("Gửi lại mã sau 42 giây") | Xác minh email |
| 20 | **Google account chip** (pill with logo + email) | Hoàn tất đăng ký Google |
| 21 | **Email emphasis in description** (email in SemiBold `#1b2444` inside muted paragraph) | Xác minh email, Hoàn tất đăng ký Google |
| 22 | **Success icon circle** (64 / 56, `--accent-soft`, check) | Đã xóa tài khoản |
| 23 | **Language select** (`Ô chọn` with flag, chevron, open state) + **language menu** (2 items, selected = `--accent-soft` + check) | Chào mừng: chọn ngôn ngữ (menu drawn on desktop only) |

## 6. Copy differences and inconsistencies between desktop and phone

- All visible copy strings are identical between each desktop/mobile pair (checked from node text content on every frame), except the data below.
- Hoàn tất đăng ký Google: desktop "Họ (không bắt buộc)" is pre-filled "Nguyễn"; mobile is empty. Tên is "Lan" on both.
- Chào mừng: desktop shows the language field open with the menu; mobile shows it closed and does not draw the menu. Menu item copy exists only on desktop ("Tiếng Việt", "English").
- Heading sizes are not a simple scale: login title 44 -> 38 (named style `Display/Page title mobile`), register title 44 -> 32, card headings 30 -> 26, "Tài khoản của bạn đã được xóa." 24 on both. Line heights differ too (1.18 for the 44 desktop titles, 1.22 for mobile login, 1.3 for the rest).
- Mobile has no footer links ("© 2026 Wordmet", "Chính sách bảo mật", "Điều khoản sử dụng" appear only on the two desktop split frames); on other desktop card frames there is no footer either.
- On mobile Đăng nhập / Đăng ký the form sits inside a card (surface, border, shadow); on desktop the same form has no card (sits on `--bg` in the split column).
- Hint on Đăng ký password wraps to 2 lines on mobile (field height 118 vs 100 on desktop).
- Đặt mật khẩu mới: the hint "Đổi xong, mọi thiết bị khác sẽ bị đăng xuất." belongs to the first password field only; the confirm field has no hint on either size. In Đăng ký the confirm field likewise has no visible hint.
- Card shadow: the Chào mừng desktop card uses `0 40 100 0 / 0 50 110 0` (no negative spread in the generated code) while every other card uses spread -50 / -40; likely a Figma inconsistency, mobile Chào mừng uses the standard one.
- "Ô nhập" label font is raw SemiBold 14 (not the `Body/Label` 13 style); the label-row link is 13.
- Not drawn anywhere (cannot be taken from Figma): field error messages, API error banners, loading/spinner states, resend-enabled state, expired/invalid OTP, password mismatch, password reveal toggled, Turnstile unverified/loading, dark theme for these frames.
