# Figma facts for M8 part B (Chính sách, Điều khoản, Nguồn dữ liệu, 404), 11/11/2026

Source: Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "Trang công khai" (`0:1`), plus the "Motion" page (`2:3`, scene 5) and the "Hệ thống" page (`2:2`, component list
only). Read-only (`get_metadata`, `get_design_context` with `excludeScreenshot`, `get_variable_defs`, `get_motion_context`, four `get_screenshot`s viewed inline,
asset SVGs fetched to the scratchpad to read gradient stops); nothing was written to Figma or to the repo except this file. Copy is exact Vietnamese from the
frames. "raw" = value read from the node, not bound to a variable or named style. Current code was read with `git show origin/refactor/giao-dien-moi:<path>`;
the legal Markdown drafts with `git show docs/launch-b-legal-drafts:docs/preparation/legal-drafts/<file>` (local branch, last commit 04/11/2026).

Notes on the method:
- `skill://figma/figma-design-to-code/SKILL.md` **was** readable this time, through the Figma server's `get_figma_skill` tool; `get_design_context` output was
  used as reference data, not as code to copy.
- Generated code writes the primary-button shadow as `drop-shadow(0 10px 14px rgba(30,58,138,.34))` (half the Figma blur, no spread): it is `--shadow-wm-btn`
  `0 10px 28px -10px` (same reading as m7-b). Other shadows are written as `box-shadow` and taken as-is.
- Named styles seen: `Display/Logo` (Bricolage Grotesque ExtraBold 22 / 1.2, -1 %), `Display/Page title` (Bricolage **Bold 700** 64 / 1.18, -2.5 % = -1.6 px),
  `Display/Page title mobile` (Bricolage Bold 38 / 1.22, -2 % = -0.76 px), `Display/Doc heading` (Bricolage Bold 28 / 1.3, -1 %), `Display/Section mobile`
  (Bricolage Bold 30 / 1.28, -1.5 %), `Body/Lead` (Noto Sans Regular 19 / 1.6), `Body/Article` (Noto Sans Regular 17 / 1.7), `Body/Base` (16 / 1.6),
  `Body/Base strong` (SemiBold 16 / 1.6), `Body/Small` (14 / 1.5), `Body/Caption` (13 / 1.4), `Body/Label` (SemiBold 13 / 1.4), `Body/Button` (SemiBold 15 / 1.4),
  `Shadow/Soft` (`0 1px 2px rgb(27 36 68 / .05), 0 14px 34px -14px rgb(27 36 68 / .22)`).
- Variables confirmed with `get_variable_defs` on `14:172` and `16:317`: `--bg #f6f7fa`, `--surface #ffffff`, `--ink #1b2444`, `--muted #525a78`, `--line #e1e5ee`,
  `--accent #1e3a8a`, `--accent-soft #e7ecf8`, `--on-accent #ffffff`, `radius/sm` 6, `radius/button` 10, `radius/lg` 14, `radius/xl` 20, `radius/2xl` 28; `radius/pill`
  999 seen in the sources output. All equal design §7.2.
- Frames read: Chính sách desktop `14:172` (1440 x 4081) / phone `17:260` (390 x 1259); Điều khoản desktop `15:190` (1440 x 2871) / phone `17:355` (390 x 1172);
  Nguồn dữ liệu desktop `16:210` (1440 x 1454) / phone `18:283` (390 x 1278); 404 desktop `16:317` (1440 x 998) / phone `18:358` (390 x 864); motion scene
  "Cảnh 5 — 404: card hiện từ mờ" `24:427` (1440 x 900, desktop only).
- `get_motion_context` (recursive) on `16:317` and `18:358`: **no keyframe data** (`{"nodes":[]}`). The 404 motion lives only in `24:427` (§6.3).
- **OG image, favicon, app icon: no frame anywhere.** Page `0:1` holds exactly the 10 page frames; the "Hệ thống" page `2:2` has no icon/OG frame either (its
  top-level list was read in full).

---

## 1. Shared components instanced

| Component (main) | Instances in these frames | Notes |
|---|---|---|
| "Thanh trên/Desktop" `5:2` | `14:173`, `15:191`, `16:211` | 68 high, padding x 140, gap 24. Logo; links right-aligned, Noto Regular **15** / 1.6 `--muted`, gap 22: **Nhóm từ · Cách học · Giá**; primary button **Dùng thử** (no arrow, padding 20 x 12). Component description: "nền bg 72% và làm mờ phía sau (kính mờ), dính khi cuộn". Export shows fill `--bg` (no alpha) + `backdrop-blur 7px`. No bottom shadow (matches design §3.1). No theme toggle, no "Đăng nhập". **Absent on 404** (§6). |
| "Thanh trên/Mobile" `9:93` | `17:261`, `17:356`, `18:284` | 60 high, padding x 16, space-between: Logo + **Dùng thử** (padding **16 x 9**, so about 39 px high). No menu. Absent on 404. |
| "Chân trang/Desktop" `7:209` | `14:358`, `15:347`, `16:308`, `16:390` (404) | 114 high: padding top 40, bottom 48, x 140; one row, space-between: Logo · links (Body/Small `--muted`, gap 24) **Chính sách bảo mật · Điều khoản sử dụng · Nguồn dữ liệu · Liên hệ** · **© 2026 Wordmet** (Body/Small `--muted`). Links drawn as plain text: no underline, no weight change. On 404 the instance overrides padding top to **24** (98 high). Description: "Không còn chữ Wordmet cỡ lớn (chủ dự án 08/11/2026)". |
| "Chân trang/Mobile" `9:100` | `17:347`, `17:433`, `18:350`, `18:412` | 164 high: column gap 16, padding top 32, bottom 40, x 16; Logo, then one wrapping row (gap 8 x 20) with the four links **and** "© 2026 Wordmet". |
| "Logo" `3:14` | inside every bar and footer | "wordmet" + "." in `Display/Logo`, `--ink`; the full stop raw `#1e3a8a`. Code already has it as `AppLogo` in `app-chrome/Logo.tsx`. |
| "Nút" `3:12`, Kiểu=Chính `3:4` | header CTAs; callouts `14:354`, `15:346`; 404 `24:330`, `24:342` | bg `--accent`, `radius/button` 10, padding 20 x 12, gap 8, label `Body/Button` `--on-accent`, trailing "Mũi tên" 16 (white stroke 1.67) where shown; shadow `--shadow-wm-btn`. |
| Background | none | Public pages use plain `--bg`; no "Nền lưới chấm". Decoration is per-page halos (radial gradients, §2.5). |
| Other shared pieces | none | No back link, no breadcrumb, no skip link drawn (code has `SkipLink`). |

---

## 2. Layout and styles

### 2.1 Legal pages, desktop (`14:172` Chính sách, `15:190` Điều khoản; identical structure)

Top to bottom:
1. Header `5:2` (68).
2. **"Thanh tiến độ đọc"** `14:183` / `15:192`: full width, 3 high, track `--line`; fill `--accent` 3 high, raw glow `0 0 8px rgba(30,58,138,.5)`, drawn at 38 %
   (547.2 / 1440). Separate frame under the header; whether it sticks with the header is not drawn.
3. **"Đầu trang"** `14:185` / `15:194`: 1160 column, padding top **96**, bottom **64**. Yellow halo `14:186` (520 x 360 at x 640, y 40 inside the column): radial
   `#ffd84a` α .45 → 0, no blur. Title block "Tiêu đề" 600 wide, column, **gap 20**:
   - meta line: `Body/Small` `--muted`, one line;
   - page title: `Display/Page title` (Bricolage **Bold 700** 64 / 1.18, -1.6 px) `--ink`, width 600;
   - lead: `Body/Lead` (19 / 1.6) `--muted`, width 520.
4. **"Nội dung"** `14:272` / `15:264`: row, 1160 wide, **gap 80**, padding bottom **120**, items start.
   - **Table of contents** "Mục lục (dính khi cuộn)" `14:273` / `15:265`: **left** column, **260** wide, `--surface`, `radius/lg` 14, `Shadow/Soft`, padding 16 x 20,
     column gap 4. Heading "Mục lục" `Body/Base strong` `--ink`. Items: padding 10 x 6, `radius/sm` 6, full width 228, `Body/Small` `--muted`, wrap allowed
     (privacy item 3 wraps to two lines). Current item "Mục đang đọc" (`14:281` "4. AI trong Wordmet", `15:419` "5. Mua gói Pro"): bg `--accent-soft`, Noto
     **SemiBold** 14 `--accent`. Lists only the numbered `##` sections plus unnumbered "Liên hệ" and "Phụ lục: nguồn dữ liệu" (Điều khoản); no `###`. Heights
     531 (12 items) and **790** (19 items). "dính khi cuộn" = sticky; top offset not drawn.
   - **Article "Bài"** `14:299` / `15:291`: **700** wide, at x 340 (so 120 px free on the right of the 1160 column), column **gap 16**. Styles in §3.
   - **Callout** "Hỏi về dữ liệu" `14:350` / `15:342` (both named that, the Điều khoản one is about payments): last item of the article, full width 700, bg
     `--accent-soft`, `radius/xl` 20, padding **28 x 24**, row gap 24, items centre. Text column (flex 1, gap 4): title Bricolage **Bold 22** / 1.3, -0.22 px,
     `--ink` (raw, no named style); body `Body/Small` `--muted`. Right: primary button with the email as its label + arrow (238 x 45).
5. Footer `7:209`.

Điều khoản `15:291` draws sections 1–8 only, then "Ghi chú mockup" `15:475` (`Body/Small` `--muted`): "Mục 9–17 và Phụ lục: bố cục giống các mục trên." Chính sách
draws all 12 sections.

### 2.2 Legal pages, phone (`17:260`, `17:355`)

1. Header `9:93` (60).
2. Progress bar `17:267` / `17:362`: 3 high, same colours, **no glow**, drawn at 22 % (85.8 / 390).
3. "Đầu trang" `17:269` / `17:364`: column, **gap 14**, padding top 40, bottom 28, x 16. Meta `Body/Caption` (13 / 1.4) `--muted`; title `Display/Page title mobile`
   (Bold 38 / 1.22, -0.76 px); lead `Body/Base` (16 / 1.6) `--muted`. **No halo.**
4. "Bọc mục lục" `17:334` / `17:421` (padding x 16, bottom 8) holds **"Mục lục (dính khi cuộn, bấm để mở)"** `17:328` / `17:415`: 358 x 70, `--surface`, 1 px
   `--line` border, `radius/lg` 14, `Shadow/Soft`, `backdrop-blur 7px`, padding 14 x 12, row space-between. Left column: "Mục lục" `Body/Caption` `--muted`, then the
   current section in Noto **SemiBold 16** / 1.6 `--accent` ("4. AI trong Wordmet" / "5. Mua gói Pro"). Right: chevron-down 20 ("Mở", stroke `#1b2444` 1.83).
   The open state is **not drawn**.
5. "Bài" `17:335` / `17:422`: column **gap 14**, padding top 16, bottom 64, x 16. Styles in §3. Ends with a mockup note ("Mục 3–12: cùng kiểu chữ và khoảng cách như
   trên." / "Mục 4–17 và Phụ lục: cùng kiểu chữ và khoảng cách như trên."). **No callout drawn on phone** (cut by the note).
6. Footer `9:100`.

### 2.3 Nguồn dữ liệu, desktop `16:210`

1. Header `5:2`. **No progress bar, no table of contents.**
2. "Đầu trang" `16:221`: 1160 column, padding top 96, bottom 64. Halos: blue `16:222` 520 x 380 at (560, -40), yellow `16:223` 460 x 340 at (820, 200) (§2.5).
   Title block 480 wide, gap 20: title `Display/Page title` 64 (width 480); lead `Body/Lead` 19 / 1.6 **`--ink`** (width 460; legal leads are `--muted`); note
   `Body/Small` `--muted` (width 460).
3. "Danh sách nguồn" `16:270`: column **gap 16**, 1160 wide, padding bottom 120. Count heading Bricolage **Bold 40 / 1.24, -0.8 px** `--ink` (raw), then one card
   per source (§5).
4. Footer `7:209`.

### 2.4 Nguồn dữ liệu, phone `18:283`

Header `9:93`; "Đầu trang" `18:290` column gap 14, padding y 40, x 16: title `Display/Page title mobile` 38; lead Noto Regular **17** / 1.6 `--ink` (raw); **no
"Trang này tự cập nhật…" note**. Halos blue `18:291` 360 x 280 at (120, 120), yellow `18:292` 340 x 260 at (-80, 300) (they spill over the list). List `18:324`:
column **gap 12**, padding top 24, bottom 64, x 16; count heading `Display/Section mobile` (Bold 30 / 1.28, -0.45 px); cards §5. Footer `9:100`.

### 2.5 Halos (decoration, all as image assets in Figma)

| Halo | Gradient | Blur |
|---|---|---|
| Legal desktop yellow `14:186`, `15:195` | radial `#ffd84a` α .45 → 0 (two stops) | none |
| Sources, 404 blue (`16:222`, `18:291`, `24:323`, `24:335`) | radial `#1e3a8a` α .28 → .126 at 55 % → 0 | layer blur 30 (SVG `stdDeviation` 15) |
| Sources, 404 yellow (`16:223`, `18:292`, `24:324`, `24:336`) | radial `#ffd84a` α .42 → .189 at 55 % → 0 | layer blur 30 |

All are CSS-expressible (radial-gradient + `filter: blur`); colours are the accent and mark values, written raw in the SVGs.

---

## 3. Markdown element → style (what the legal frames show)

The frame bodies are an abridged copy of the drafts `chinh-sach-bao-mat.draft.md` / `dieu-khoan-su-dung.draft.md` (same sentences, `**Label:**` paragraphs,
`- ` lists, `[Điều khoản sử dụng](/vi/terms)`), so the mapping below is the frames' rendering of that Markdown.

| Markdown | Desktop | Phone | Notes |
|---|---|---|---|
| `#` h1 | not in the article: the page title (§2.1) | same | The drafts start with `# Chính sách bảo mật` / `# Điều khoản sử dụng`; see Conflict 1. |
| `##` h2 | `Display/Doc heading` Bricolage Bold 28 / 1.3, -0.28 px, `--ink`; wrapper padding top **32** (none on the first) + article gap 16 = 48 above | Bold **24** / 1.3, -0.24 px; padding top **24** + gap 14 | Numbered text comes from the heading itself ("1. Về chính sách này"). |
| `###` h3 | **not drawn** | not drawn | Điều khoản draft has `### Nguồn dữ liệu và giấy phép`, `### A. …`, `### B. …`, `### C. …`. |
| paragraph | `Body/Article` Noto Regular 17 / 1.7 `--ink`, width 700, block gap 16 | Noto Regular 16 / **1.7** `--ink` (raw; `Body/Base` is 1.6), gap 14 | |
| `**strong**` | Noto **SemiBold** (600), same size, `--ink` | same | Used for `**Thông tin tài khoản:**` lead-ins, "không", "7 ngày", "13 tuổi", "02 ngày làm việc", emails. |
| a bold-only line (`**Dữ liệu học tập:**`) | SemiBold 17 / 1.7 paragraph; list follows at gap 16 | same at 16 | |
| `- ` list | `list-disc`, marker indent 25.5 px (1.5 em), **6 px** between items, 17 / 1.7 `--ink`, gap 16 to neighbours | indent 24, 6 px between items | No ordered list drawn (the drafts' "**Mục lục**" `1. … 12.` list is not in the frames). |
| link `[text](url)` | Noto **SemiBold** 17 `#1e3a8a` (raw, not `var(--accent)`), **underline** (from-font) | phone `17:339`: same sentence, **plain text, no link style** | Internal inconsistency, Conflict 9. |
| bare email (`support@wordmet.com`) | SemiBold `--ink`, **not** link-styled | same | `remark-gfm` autolinks bare emails, so code would render it as a link (Conflict 10). |
| `>` blockquote | not drawn | not drawn | Điều khoản draft opens with `> **Tóm tắt:** …`. |
| table (GFM) | not drawn | not drawn | Điều khoản draft §11 has a 3-column sources table. |
| `---` hr | not drawn | not drawn | |
| code / fenced code | not drawn | not drawn | Điều khoản draft's Phụ lục has a ` ```text ` licence block (lines 254–400). |
| images | not drawn | not drawn | |

---

## 4. Chrome copy around the documents (exact)

| Place | Chính sách | Điều khoản |
|---|---|---|
| Meta line (desktop `Body/Small`, phone `Body/Caption`) | Có hiệu lực từ [ngày] | desktop: **Có hiệu lực từ [ngày] · Áp dụng cho wordmet.com**; phone: Có hiệu lực từ [ngày] |
| Title | Chính sách bảo mật | Điều khoản sử dụng |
| Lead | Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai, và quyền của bạn với dữ liệu của mình. | Những gì bạn đồng ý khi dùng Wordmet: tài khoản, gói Pro, thanh toán và nội dung của bạn. |
| TOC heading (desktop card, phone pill label) | Mục lục | Mục lục |
| TOC items (from the Markdown headings; Figma text is sample) | 1. Về chính sách này · 2. Dữ liệu chúng tôi thu thập · 3. Chúng tôi dùng dữ liệu để làm gì · 4. AI trong Wordmet · 5. Chia sẻ dữ liệu · 6. Lưu trữ và bảo mật · 7. Quyền của bạn · 8. Xóa tài khoản · 9. Trẻ em · 10. Cookie · 11. Thay đổi chính sách · 12. Liên hệ | 1. Phạm vi áp dụng · 2. Ai được dùng Wordmet · 3. Tài khoản và đăng nhập · 4. Gói dịch vụ · 5. Mua gói Pro · 6. Thanh toán và kỳ nối tiếp · 7. Hết hạn và hoàn tiền · 8. Sự cố thanh toán · 9. AI và nội dung được tạo tự động · 10. Nội dung của bạn · 11. Sở hữu trí tuệ · 12. Hành vi bị cấm · 13. Thay đổi, gián đoạn dịch vụ · 14. Giới hạn trách nhiệm · 15. Xóa tài khoản và chấm dứt · 16. Cập nhật điều khoản · 17. Luật áp dụng · Liên hệ · Phụ lục: nguồn dữ liệu |
| Callout title | Còn câu hỏi về dữ liệu của bạn? | Có vấn đề với thanh toán? |
| Callout body | Gửi từ chính email của tài khoản. Phản hồi trong 02 ngày làm việc. | Gửi email tài khoản, mã chuyển khoản (bắt đầu bằng WM) và ảnh biên nhận. |
| Callout button | support@wordmet.com → | support@wordmet.com → |
| Draft notice (`LegalDraft`) | **not drawn** | not drawn |

Sample body, only as far as it shows a style: "Chính sách này áp dụng cho website wordmet.com và ứng dụng học trên web của Wordmet." (paragraph); "**Thông tin tài
khoản:** email, họ tên, ngày sinh và mật khẩu." (bold lead-in); "Khi tạo tài khoản, bạn đồng ý với Chính sách này và [Điều khoản sử dụng]." (link); the three-item
list under "**Dữ liệu học tập:**".

Nguồn dữ liệu chrome: title **Nguồn dữ liệu**; lead **Wordmet dùng các bộ dữ liệu có giấy phép mở sau đây. Cảm ơn những người đã làm ra và chia sẻ chúng.**;
note (desktop only) **Trang này tự cập nhật: chỉ hiện nguồn đang có từ người học nhìn thấy.**; count heading **3 nguồn đang dùng**.

Header and footer copy: §1.

---

## 5. Nguồn dữ liệu: source item structure vs `SourcesList.tsx`

### 5.1 Card, desktop (`16:272`, `16:284`, `16:296`)

Row, gap **56**, padding **36 x 32**, `radius/xl` 20, full width. **Card 1 and 3: `--surface` + `Shadow/Soft`; card 2 (Octanove): `--accent-soft`, no shadow.**

- Left "Tên" (380 wide, column gap 10): name `Display/Doc heading` 28 `--ink`; optional second line `Body/Small` `--muted` (AGID only: "Automatically Generated
  Inflection Database"); pill "Nhãn nguồn": `--accent-soft` bg, `radius/pill`, padding left 8, right 10, y 4, gap 6, dot 6 px `#1e3a8a`, text `Body/Label`
  (SemiBold 13 / 1.4) `--accent` "Dùng cho: …". On card 2 the pill is `--accent-soft` on an `--accent-soft` card (its fill disappears).
- Right "Chi tiết" (flex 1 = 652, column gap 12):
  1. row gap 24, 16 / 1.6: **"Phiên bản 1.5"** (label and value one run, Noto SemiBold `--ink`, no wrap) and **"Giấy phép: …"** (Noto Regular `--muted`, wraps).
  2. attribution paragraph `Body/Article` 17 / 1.7 `--ink`, width 640.
  3. link row gap 6: **"Trang gốc"** `Body/Base strong` `--accent` (no underline) + icon "Mở tab mới" 16 (arrow up-right, stroke `#1e3a8a` 1.47) + display URL Noto
     Regular **15** `--muted` (`github.com/openlanguageprofiles/olp-en-cefrj`, `octanove.com`, `wordlist.aspell.net`: the URL without protocol).

### 5.2 Card, phone (`18:326`, `18:334`, `18:342`)

Column gap 8, padding 20, `radius/xl` 20, 358 wide; same surface / accent-soft alternation. Order: name Bricolage Bold **22** / 1.3; pill; "Phiên bản …"
`Body/Base strong` `--ink`; "Giấy phép: …" `Body/Small` `--muted`; "Trang gốc" + icon. **No attribution paragraph, no AGID subtitle, no display URL.**

### 5.3 Data shown per source (desktop)

| Name | Pill | Version | Licence (desktop / phone) | Attribution | Link |
|---|---|---|---|---|---|
| CEFR-J Wordlist | Dùng cho: Cấp độ A1–B2 | Phiên bản 1.5 | Giấy phép: Dùng miễn phí cho nghiên cứu và thương mại, cần trích dẫn. / Giấy phép: Miễn phí cho nghiên cứu và thương mại, cần trích dẫn. | The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. | github.com/openlanguageprofiles/olp-en-cefrj |
| Octanove Vocabulary Profile C1/C2 | Dùng cho: Cấp độ C1–C2 | Phiên bản 1.0 | Giấy phép: CC BY-SA 4.0 (both) | Octanove Labs, phân phối qua Open Language Profiles. Wordmet dùng lại phần cấp độ C1–C2 theo cùng giấy phép CC BY-SA 4.0. | octanove.com |
| AGID (+ subtitle) | Dùng cho: Dạng chia của từ | Phiên bản 2016.01.19 | Giấy phép: Cho phép dùng, sửa, phân phối và bán, không thu phí, kèm thông báo bản quyền. / Giấy phép: Cho phép dùng, sửa, phân phối, kèm thông báo bản quyền. | Copyright 2000-2016 by Kevin Atkinson <kevina@gnu.org>. Thông báo bản quyền đầy đủ nằm ở Phụ lục của Điều khoản sử dụng. | wordlist.aspell.net |

### 5.4 Against the API and `SourcesList.tsx`

| Figma element | API `GET /v1/sources` (`PublicSource`: `name, version, url, license, attribution`) | `SourcesList.tsx` today |
|---|---|---|
| Name | `name` | `h2` `text-h3` |
| AGID long-name subtitle | **no field** (the long name sits inside `attribution` in the seeded row) | none |
| "Dùng cho: …" pill | **no field**; the API's selection rule knows why a source is shown (levels, IPA, library inflections: `sources.service.ts` `sourceShownCondition`), but returns none of it | none |
| "Phiên bản 1.5" | `version` (may be `''`) | `dt` "Phiên bản" + `dd`, left out when empty |
| "Giấy phép: …" | `license` free text; the seeded AGID row is a long **English** permission notice (migration `20261017220000_agid_source`) | `dt` "Giấy phép" + `dd`, left out when empty |
| Attribution paragraph | `attribution` | always shown, `whitespace-pre-line`, plain text |
| "Trang gốc" + icon + display URL | `url` (`null` = no link; only `http(s)` becomes a link) | link "Trang gốc ↗", new tab, `noopener noreferrer`; no display URL |
| Count heading "3 nguồn đang dùng" | `items.length` | none |
| Empty list / API failure | `[]` / `null` | one sentence `Sources.empty`; **not drawn in Figma** |
| Card style | | `border-t` list, `max-w-prose`, no cards |

---

## 6. 404 (`16:317` desktop, `18:358` phone, motion `24:427`)

### 6.1 Layout and copy

- **No top bar** on either frame; footer only (desktop instance with padding top 24).
- Desktop area "Không tìm thấy" `24:322`: 1440 x 900, content centred both ways. Halos: blue `24:323` 560 x 420 at (300, 170), yellow `24:324` 520 x 380 at (640, 320)
  (§2.5). No illustration other than the halos.
- Card `24:325`: **600** wide, `--surface`, 1 px `--line` border, `radius/2xl` 28, padding **48 x 56**, column **gap 16**, centred; raw shadow
  `0 40px 100px -50px rgba(30,58,138,.30), 0 50px 110px -40px rgba(27,36,68,.38)`.
  1. **404**: Bricolage **ExtraBold 104**, line-height 1, -4 % (-4.16 px), `--accent`, raw text-shadow `0 12px 36px rgba(30,58,138,.30)`.
  2. **Không tìm thấy trang**: Bricolage Bold **32** / 1.3, -0.32 px, `--ink`, centred, width 504.
  3. **Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.**: `Body/Base` `--muted`, centred.
  4. spacer "Khoảng" 8 px (so 40 px between text and button).
  5. primary button **Về trang chủ** + arrow (157 x 45). Target not written in Figma; the current code goes to `/` (locale root).
- Phone area `24:334`: 390 x 700, padding x 16, centred; halos blue `24:335` 320 x 260 at (-40, 160), yellow `24:336` 300 x 240 at (120, 300). Card `24:337`: 358 wide,
  padding **24 x 40**, gap **14**, same border, radius, shadow; "404" ExtraBold **80**, -3.2 px; title Bold **28 / 1.28, -0.42 px**; body 16 / 1.6 width 310; spacer
  **4**; same button.

### 6.2 Current code

`(site)/not-found.tsx`: `h1` title, body, `ButtonLink href="/"` "Về trang chủ", left-aligned in a `Container`, no "404" number, no card, no motion; rendered inside
`(site)/layout.tsx`, so with `LandingHeader` and `SiteFooter`. `(site)/[...rest]/page.tsx` calls `notFound()` for unknown paths under a locale.

### 6.3 Motion: "Cảnh 5 — 404: card hiện từ mờ" `24:427` (page "Motion" `2:3`)

Same static values as `16:317` (no footer). Figma timeline: one cohort, **5000 ms, loop** (preview loop). Easing for every entrance: `cubic-bezier(0.23, 1, 0.32, 1)`
(= `--ease-out-strong`), then linear hold to 5000 ms.

| Node | Property | From → to | Start → end (ms) |
|---|---|---|---|
| Card `24:431` | opacity | 0 → 1 | 0 → 700 |
| Card | translateY, scale (origin centre) | 28 px → 0, 0.96 → 1 | 0 → 1000 |
| "404" `24:432` | opacity | 0 → 1 | 250 → 850 |
| "404" | translateY | **-22** px → 0 (drops in from above) | 250 → 1050 |
| Title `24:433` | opacity; translateY 14 → 0 | | 450 → 1050; 450 → 1250 |
| Body `24:434` | opacity; translateY 14 → 0 | | 550 → 1150; 550 → 1350 |
| Button `24:436` | opacity; translateY 14 → 0 | | 680 → 1280; 680 → 1480 |
| Blue halo `24:429` | translate (0, 0) → (50, 30) px | | 0 → 5000, `easeInOut`, repeat |
| Yellow halo `24:430` | translate (0, 0) → (-40, -24) px | | 0 → 5000, `easeInOut`, repeat |

Pattern: each child fades in 600 ms and moves 800 ms; starts 250 / 450 / 550 / 680 ms; everything settled at 1480 ms. The card and "404" carry a `blur(0px)`
filter in the export, but no blur track was returned (UNVERIFIED, §10). Phone has no motion scene.

---

## 7. Desktop vs phone

| | Desktop | Phone |
|---|---|---|
| Header | logo + 3 links + Dùng thử (20 x 12) | logo + Dùng thử (16 x 9, about 39 px high) |
| Progress bar | glow `0 0 8px` | no glow |
| Legal header block | gap 20, pt 96 / pb 64, meta 14, title 64, lead 19 `--muted`, yellow halo | gap 14, pt 40 / pb 28, meta 13, title 38, lead 16 `--muted`, no halo |
| Table of contents | sticky card, 260, left of the article, every `##`, current item highlighted | sticky collapsed pill: "Mục lục" + current section + chevron; open state not drawn |
| Article | 700, gap 16, h2 28 (pt 32), p 17 / 1.7, list indent 25.5 | 358, gap 14, h2 24 (pt 24), p 16 / 1.7, indent 24 |
| Body link | SemiBold accent underlined | same sentence unstyled (`17:339`) |
| Callout | drawn | not drawn |
| Sources header | title, lead 19, auto-update note, two halos | title, lead 17, **no note**, two halos |
| Sources count | Bold 40 / 1.24 (raw) | `Display/Section mobile` 30 |
| Sources card | two columns (380 + 652), padding 36 x 32, name 28 | one column, padding 20, name 22 |
| Sources card content | pill, version, licence, **attribution**, link + display URL, AGID subtitle | pill, version, licence, link; **no attribution, no display URL, no subtitle**; shorter licence wording for CEFR-J and AGID |
| 404 card | 600, padding 48 x 56, gap 16, "404" 104, title 32, spacer 8 | 358, padding 24 x 40, gap 14, "404" 80, title 28, spacer 4 |
| Footer | one row, 114 (404: 98) | stacked + wrapping links, 164 |

---

## 8. Copy table (current key or literal → Figma text; "new" = no key today)

Namespaces from `apps/web/messages/vi.json` (branch `refactor/giao-dien-moi`): `Legal`, `Sources`, `NotFound`, `Footer`, `Landing.footer`.

| Key (existing or suggested) | Figma vi text | vs current |
|---|---|---|
| `Legal.privacyTitle` | Chính sách bảo mật | same |
| `Legal.termsTitle` | Điều khoản sử dụng | same |
| `Legal.effective` | Có hiệu lực từ {date} ("[ngày]" in Figma) | same |
| new `Legal.termsScope` (or drop) | · Áp dụng cho wordmet.com | new; Điều khoản desktop only |
| new `Legal.privacyLead` | Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai, và quyền của bạn với dữ liệu của mình. | new |
| new `Legal.termsLead` | Những gì bạn đồng ý khi dùng Wordmet: tài khoản, gói Pro, thanh toán và nội dung của bạn. | new |
| `Legal.contents` | Mục lục | same word; code draws it upper-case bold `text-sm`, Figma sentence case `Body/Base strong` (desktop) / `Body/Caption` (phone) |
| new (a11y only) `Legal.contentsOpen` | (icon only in Figma) | new: the phone pill needs an accessible name |
| new `Legal.privacyHelpTitle`, `Legal.privacyHelpBody` | Còn câu hỏi về dữ liệu của bạn? / Gửi từ chính email của tài khoản. Phản hồi trong 02 ngày làm việc. | new |
| new `Legal.termsHelpTitle`, `Legal.termsHelpBody` | Có vấn đề với thanh toán? / Gửi email tài khoản, mã chuyển khoản (bắt đầu bằng WM) và ảnh biên nhận. | new |
| button label (no key) | support@wordmet.com | `site.supportEmail`; `LegalDraft` today links `site.contactEmail` (contact@) |
| `Legal.draftNotice` | not drawn | keep |
| `Sources.title` | Nguồn dữ liệu | same |
| `Sources.intro` | Wordmet dùng các bộ dữ liệu có giấy phép mở sau đây. Cảm ơn những người đã làm ra và chia sẻ chúng. | same |
| new `Sources.autoUpdate` | Trang này tự cập nhật: chỉ hiện nguồn đang có từ người học nhìn thấy. | new; desktop only |
| new `Sources.count` | {count} nguồn đang dùng | new |
| new `Sources.usedFor` | Dùng cho: {use} | new; no data (Conflict 2) |
| `Sources.version` | Phiên bản {version} (one run) | code: label and value apart |
| `Sources.license` | Giấy phép: {license} | code "Giấy phép" without the colon |
| `Sources.link` | Trang gốc (+ icon, + display URL on desktop) | same word; code appends " ↗" |
| `Sources.empty` | not drawn | keep |
| `NotFound.title` | Không tìm thấy trang | same |
| `NotFound.body` | Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. | same |
| `NotFound.home` | Về trang chủ (+ arrow) | same |
| literal | 404 | new (no key needed) |
| `Footer.privacy`, `.terms`, `.sources`, `.contact` | Chính sách bảo mật / Điều khoản sử dụng / Nguồn dữ liệu / Liên hệ | same |
| `Footer.copyright` | © 2026 Wordmet | same (`{year}`) |
| `Landing.footer.plans`, `Landing.footer.faq` | not in the Figma footer | dropped by Figma |
| header (home-page agent) | Nhóm từ · Cách học · Giá · Dùng thử | code `Landing.nav`: Tính năng, Dạng bài, Gói học, Hỏi đáp, Đăng nhập, Đăng ký + theme toggle |

---

## 9. Conflicts

Most important first.

1. **The Markdown already carries the chrome.** The drafts (`docs/launch-b-legal-drafts`) start with `# Title`, a line "Phiên bản [[PHIÊN BẢN]] · Có hiệu lực từ [[NGÀY
   HIỆU LỰC]] [· Áp dụng cho website wordmet.com]", an intro paragraph (Điều khoản also a `> **Tóm tắt:**` blockquote) and a hand-written `**Mục lục**` list. Figma
   draws title, meta line, lead and table of contents as page chrome and starts the article at "1. …". `LegalDocument` today hides its own `h1` when the text has
   one, shows `effective_date` on top, and turns the in-text "Mục lục" into links. Rendering Figma chrome over these texts gives two titles, two date lines, two
   tables of contents. Needs a call: strip the leading block (h1 → meta → intro → Mục lục) in code, change the published texts, or drop chrome pieces. Related: the
   Figma meta line shows **no version**, while the policy itself says "chúng tôi cập nhật số phiên bản và ngày có hiệu lực ở đầu trang" and the API returns `version`.
2. **Nguồn dữ liệu needs data the API does not return, and the phone drops the licence credit.** The "Dùng cho: …" pill and the AGID subtitle have no field in
   `PublicSource`; the shown Vietnamese licence summaries differ from the stored text (AGID's `license` is a long English notice). The phone cards **omit the
   attribution paragraph**, which is what the licences require to be shown (current code always shows it). Options: add a field (API change), derive "Dùng cho" in the
   API from the existing selection rule, or drop the pill; keep attribution on phone regardless.
3. **404 has no top bar** (desktop and phone), while `(site)/not-found.tsx` renders inside `(site)/layout.tsx` with the header. Also its motion (§6.3) runs 1480 ms with
   600–800 ms per element and two halos drifting on a 5 s **repeat**, against design §3.1 (entrances 300–340 ms from the motion doc) and the "no loops" rule (§8.2:
   the pending dot is the only exception). `ui-best-practices.md` line 82 does name "card 404 hiện từ mờ" as the page's one attention motion. Needs a call on
   durations and on the halo drift (once, or not at all).
4. **Page title weight.** Every public page title is `Display/Page title` Bricolage **Bold 700** (64 / 38); design §3.1 rules "800 cho tiêu đề trang và số lớn". Only
   "404" and the logo are 800. Follow Figma (it is the source for type) or §3.1; the choice also affects the app titles already built.
5. **Client behaviour on server-rendered pages.** Figma adds a reading progress bar, a highlighted current section, a sticky table of contents (desktop) and a sticky
   collapsible one on phone; design §5.2 lists the legal pages as server-rendered without mentioning any client script. Current code: table of contents only from
   `lg`, on the **right** of the text (`lg:grid-cols-[minmax(0,40rem)_15rem]`), plain links, no current-section state, nothing below `lg`. Figma: on the **left**, 260
   wide, beside a 700 article (needs about 1072 px + margins), and a phone version. The Điều khoản card is 790 high: on short screens it needs its own scroll (current
   code has `max-h` + `overflow-y-auto`).
6. **Shadows are not tokens.** Table-of-contents card, phone pill and source cards use `Shadow/Soft` (design §7.2 assigns it to the secondary button; §3.3 says cards use
   `--shadow-card`); the 404 card uses a raw two-layer shadow; the progress bar a raw glow. Use `--shadow-card` or add tokens.
7. **Markdown elements not drawn but present in the Điều khoản draft:** `###` headings, a GFM table, a blockquote, a fenced code block (licence text). The mockup note
   "bố cục giống các mục trên" cannot cover them. Their styles must be decided from §3.3 (current `LegalDocument` already maps blockquote, table, th/td).
8. **Phone CTA under the touch target.** "Dùng thử" on phone is about 39 px high (padding 16 x 9); §3.3 requires ≥ 44 px.
9. **Figma internal inconsistencies:** (a) Điều khoản bold ranges are shifted 2–3 characters in `15:458`, `15:461`, `15:465`, `15:468`, `15:471`, `17:431` (e.g.
   "Gó|i Miễn phí: ô|n", "payO|S cun|g", "10 thi|ết bị cùng |lúc"): an editing defect, irrelevant to code since bold comes from Markdown. (b) Phone privacy body link
   unstyled, desktop styled. (c) Meta line: Điều khoản desktop adds "· Áp dụng cho wordmet.com", phone and Chính sách do not. (d) Sources card 2 is `--accent-soft`
   without shadow while 1 and 3 are white with shadow; its pill becomes invisible. (e) Sources lead is `--ink`, legal leads `--muted`. (f) Licence wording differs
   between desktop and phone (§5.3). (g) The Điều khoản callout frame is named "Hỏi về dữ liệu" but is about payments. (h) Body link colour is raw `#1e3a8a`, not
   `var(--accent)` (matters for Dark).
10. **Emails in the text.** Figma shows `support@wordmet.com` in the body as SemiBold ink, not a link; `remark-gfm` turns bare emails into `mailto:` links, which take the
    link style. Decide whether bare emails stay links (useful) and accept the visual difference.
11. **Radius of table-of-contents items** is `radius/sm` 6; `app-redesign-plan.md` line 470 says "mục lục 8 px".
12. **Spacing off the §3.3 ladder** (4, 8, 12, 16, 24, 32, 56, 80, 120): 14, 20, 28, 36, 40, 64, 96 appear. §3.1 says round to the nearest step; 64 and 96 are frequent
    enough that rounding changes the look (96 → 80 or 120).
13. **Footer:** Figma drops "Gói học" and "Hỏi đáp" from the footer and draws links without underline or hover; the 404 footer overrides padding top to 24.
14. **Copy rule §3.3** (no VietQR, payOS, internal detail on public pages): the Điều khoản callout body names the transfer code "bắt đầu bằng WM" in page chrome. The
    legal body itself names VietQR and payOS; that text comes from the API and is legally required, so it is not in scope of the rule.
15. **OG image, favicon, app icon:** no Figma frame on any page checked. Current `app/icon.svg` and `[locale]/opengraph-image.tsx` use the old yellow "_ _"
    mark (the OG also "Wordmet" in Lexend on navy); `apple-icon.tsx` exists but was not read; the new Logo `3:14` is a wordmark only ("wordmet."). Design §5.8 and §11 change the OG font, not its look. Without a decision the old
    mark stays as the favicon next to the new wordmark.
16. **Draft and error states:** no frame for the draft notice (`LegalDraft`: title + notice + contact email) or for an empty / unreachable sources list (`Sources.empty`).
    Nearest frame: keep the header block (meta line hidden, lead shown) and put the notice where the article goes.

---

## 10. Unresolved / UNVERIFIED

- Header fill: description says `--bg` at 72 % with background blur; the export shows a solid `--bg` fill and `backdrop-blur 7px`. Alpha and blur radius UNVERIFIED
  (read the fill with the Plugin API, or take the app top bar's `Glass/Header` value from M1).
- Whether the progress bar sticks with the header; the sticky top offset of the desktop table of contents; what the phone table of contents opens into (list, sheet,
  dropdown) and whether it shows only `##`.
- How the current section is chosen (scroll position rule) and whether the progress bar measures the article or the whole page.
- Targets: "Dùng thử" (presumably `/app/register`), footer "Liên hệ" (today `mailto:contact@…`), callout buttons (presumably `mailto:support@…`, subject not drawn),
  "Về trang chủ" (today `/`).
- "hiện từ mờ": card and "404" carry `blur(0px)` in the motion scene export but no blur keyframes came back; a blur-in may exist and not be exported.
- Halo drift in production: one pass or none; reduced-motion behaviour not drawn (motion doc §8 would keep opacity only, ≤ 200 ms).
- The sources shown: Figma draws 3; the API can also show a Wiktionary row (round C IPA), so the count and "Dùng cho" text must be data-driven.
- Body texts in the frames are taken from drafts on the local branch `docs/launch-b-legal-drafts` (04/11/2026): ASSUMPTION that the published texts keep that
  structure (h1, meta line, intro, "**Mục lục**").
- Widths 768–1279 not drawn: the 260 + 80 + 700 legal layout and the two-column source card need a rule for tablet.
- Dark: no Dark frame for these pages; link and dot colours are raw hex in Figma.
- Whether "404" should be read by screen readers (the title is the natural `h1`; "404" can be `aria-hidden`).
