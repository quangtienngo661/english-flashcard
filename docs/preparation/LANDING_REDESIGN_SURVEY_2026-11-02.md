# Survey: redesign landing Wordmet — skill nào, dữ liệu thật nào, luồng nào

Ngày 02/11/2026. Chỉ đọc và đo, chưa sửa code. Nguồn: code `apps/web` trên `dev` (commit `dc6fdf6c`), `messages/vi.json`, các design và
decision trong `docs/`, file skill đã cài trong `~/.claude/` (đọc trực tiếp `SKILL.md` và `reference/`), một lần chạy `lint.mjs` của
taste-skill trên mã landing.

Nhãn: **Đ** = đã đọc hoặc chạy trong phiên này. **S** = suy luận từ Đ. **ASSUMPTION** = chưa kiểm.

## 0. Tóm tắt

- Landing hiện tại dựng ngày 08–10/10 và đổi sang hướng B ngày 15/10 (PR #22–#24). Từ đó **không sửa nữa** (Đ: `git log` của
  `components/sections`), trong khi Bước 3–8 xây xong sau đó. Chữ trên `wordmet.com` (`main`) giống hệt `dev` (Đ).
- **Landing đang hứa sai so với sản phẩm thật** ở 4 chỗ, rõ nhất là "14 ngày dùng thử, không cần thẻ" so với D15/D16 (7 ngày, giữ thẻ, chỉ có
  khi có thanh toán thật). Câu này đã là Q8 mở trong `LEGAL_AND_PILOT_RESEARCH_2026-11-02.md`.
- Theo luật chống AI slop của **cả hai** bộ skill, landing đang dùng nhiều mẫu bị cấm: nhãn nhỏ viết hoa trên mỗi tiêu đề (5 chỗ), chip trên H1, các thẻ
  giống nhau, bước đánh số "1. 2. 3.", bóng "gờ" đặc của hướng B.
- Bộ để dẫn: **`impeccable`** (khung làm việc, có gate, review độc lập, hợp cả landing lẫn app) cùng **luật và công cụ đo của `taste-skill` v2**
  (viết riêng cho landing). Hai bộ **mâu thuẫn nhau** ở 3 điểm (bóng gờ, lượng chuyển động, ảnh) và cả hai mâu thuẫn với một phần hướng B. Đó là quyết định của
  chủ dự án, không phải của skill.
- Tài sản thật mạnh nhất: **bài điền từ chạy được ngay trên Hero** (đúng thứ taste-skill gọi là "one live thing") và **app người học thật, 13 màn
  `(member)`**, chụp được làm ảnh sản phẩm. Không có ảnh, người dùng, testimonial hay số liệu: không được bịa.

## 1. Landing hiện tại (as-built)

| Phần | File | Nội dung |
|---|---|---|
| Header | `components/layout/SiteHeader.tsx` | Logo, 2 link (từ `lg`), đổi ngôn ngữ, nút "Đăng ký nhận tin ra mắt" (từ `md`, dính đầu trang) |
| Hero | `sections/Hero.tsx` | Chip, H1 "Làm chủ từ vựng / từ ngữ cảnh thực tế", mô tả, form waitlist, dòng "Hoàn toàn miễn phí", **bài điền từ 3 câu tương tác** (`ClozePractice`: deploy, assume, borrow) |
| Problem | `sections/Problem.tsx` | Nhãn "VẤN ĐỀ", 2 thẻ: flashcard lật ("cách học truyền thống") và 3 câu điền từ ("học cùng Wordmet") |
| How it works | `sections/HowItWorks.tsx` | Nhãn, 3 thẻ màu đánh số 1–3, mỗi thẻ có hình minh họa vẽ bằng HTML |
| AI | `sections/AiPractice.tsx` | Nhãn, 3 dòng ✓, chip "Dùng thử 14 ngày miễn phí · Gói Pro", thẻ "Câu do AI tạo" tĩnh |
| Plans | `sections/Plans.tsx` | Nhãn, 2 thẻ "Miễn phí" / "Trải nghiệm AI", mỗi thẻ 4 dòng ✓, cùng nút waitlist |
| FAQ | `sections/Faq.tsx` | 4 câu, `<details name>` không JS |
| Final CTA | `sections/FinalCta.tsx` | Dải vàng, tiêu đề, form waitlist thứ hai |

Kỹ thuật (Đ): Next 16.4.3, next-intl, Tailwind 4 với token ở `packages/design-tokens/theme.css` (`primary #2445d6`, `accent #ffd84a`, `ink
#0f1a3d`, `navy #1b2444`, Lexend), Cloudflare Workers + D1 cho waitlist, render trên server, chuyển động ≤ 400ms (UB18), có
`prefers-reduced-motion`. Form waitlist cần D1 nên không chạy dưới `next start` (`IMPROVEMENT_PLAN_2026-10-28.md` A7).

## 2. Lời hứa trên landing so với sản phẩm thật

| Landing nói (vi.json) | Thực tế trong repo | Nguồn | Trạng thái |
|---|---|---|---|
| "Trải nghiệm toàn bộ tính năng AI trong **14 ngày** dùng thử. **Không cần nhập thẻ**", "Kích hoạt bất cứ khi nào" (Plans, Ai, Faq: 4 chỗ "14 ngày") | Trial **7 ngày**, giữ thẻ, không hủy thì tự lên Pro, **chỉ có khi có thanh toán thật**. Trước đó chỉ có cấp tay | D15, D16 Bước 5; ⚠9 design Bước 5 ("phải sửa khi chốt câu chữ gói") | **Sai** (Đ). Q8 đang mở |
| "Hoàn toàn miễn phí", Free "sử dụng vĩnh viễn", "các dạng bài tập cơ bản" | Free có **3 phiên luyện mỗi ngày**, ôn thẻ không giới hạn, có quảng cáo khi công tắc bật (D21, mặc định tắt) | CLAUDE.md Bước 5, `App.plans.freeList` | Thiếu giới hạn (S) |
| AI: "Giải thích chi tiết lý do chọn đáp án" | App có "Bản dịch" / "AI dịch" (`App.practice.session.translation*`), **không thấy** chuỗi giải thích đáp án nào trong `App` | `messages/vi.json` | Có thể sai (ASSUMPTION: chưa đọc code chấm điểm) |
| AI: "Kiểm tra đáp án tức thì, không tốn **credit** AI" | Đúng ý (chấm bằng quy tắc, AI chỉ tính lúc tạo câu), nhưng app gọi là "lượt câu AI", không phải "credit" | PRODUCT.md (bảng thuật ngữ) | Đúng ý, sai thuật ngữ (Đ) |
| "Chọn bộ từ vựng sẵn có theo trình độ từ A1 đến C2" | Đã nhập thử CEFR-J 1.5 (7.799 entry, chỉ có level, chưa có nghĩa); dữ liệu mẫu 303 nghĩa; mục tiêu 8.812 từ. Số nghĩa đã publish thật: chưa rõ | `buoc-2-5-test-flow.md`, PRODUCT.md | ASSUMPTION |
| "Thuật toán thông minh", "Spaced Repetition" | Hộp Leitner **6 ngăn**, có danh sách "từ hay sai" | Design Bước 3 §198, Bước 4 | Đúng ý; "thông minh" là chữ quảng cáo (S) |
| Không nhắc tới | Đăng nhập Google, thêm nhanh từ gặp ngoài kèm câu, tra AI, phát âm, chế độ tối, nhắc ôn qua email, Pro "Chưa mở bán" với giá giữ chỗ `XX.000 ₫` | Bước 3–8, `App.plans` | Landing tụt sau app (Đ) |

Luật chữ của dự án (PRODUCT.md, bản chữ §1, §3) mà landing đang vi phạm (Đ, đếm trong các mục landing của `vi.json`): "Vui lòng" 2 lần, "!" 3 lần,
"..." ba chấm 1 lần (placeholder email), "Chúng tôi" 1 lần.

Rủi ro ngoài trang (Đ): `/privacy` chỉ nói về email waitlist, chưa nói về tài khoản, AI hay dữ liệu học (P1–P8 trong `LEGAL_AND_PILOT_RESEARCH`).
`WEB_ADS_RESEARCH` §2.4 ghi landing quá mỏng để AdSense duyệt ("low value content"), nên một landing dày nội dung hơn cũng có ích cho quảng cáo (S).

## 3. Những mẫu "AI slop" đang có

Đối chiếu `impeccable/reference/craft-floor.md` (IM) và bảng "House rules" của `taste-skill/SKILL.md` (TS):

| Mẫu | Ở đâu | IM | TS |
|---|---|---|---|
| Nhãn nhỏ viết hoa trên tiêu đề ("VẤN ĐỀ", "CÁCH HOẠT ĐỘNG", "TÍNH NĂNG AI", "GÓI DỊCH VỤ", "GIẢI ĐÁP") | `SectionHeading` `eyebrow`, 5 section | **Cấm tuyệt đối** | Cấm |
| Chip trên H1 | Hero `Chip` | (thuộc eyebrow) | Cấm ("pill badge above the headline") |
| Thẻ giống nhau xếp hàng | Steps (3), Plans (2), Problem (2) | Mặc định cần lý do | Cấm |
| Đánh số bước | "1. Lưu từ…", ô số tròn | Chỉ khi thứ tự là thông tin | Cấm ("Step 2") |
| Bóng đặc không mờ (`0 0.25rem 0`) | Token `--shadow-ledge*`, hướng B §4.5 | Cấm ngoài thế giới neobrutalist | Cấm bóng cho vật đứng yên |
| Dải gradient | `@utility highlighter` (`globals.css:299`, dùng cho tiêu đề trang app) | Cấm gradient text | Cấm |
| Đường kẻ 1px | Footer `border-t` | — | Cấm |
| Tiêu đề căn giữa ở mọi section | `align="center"` ở 4/5 section | — | "Căn giữa tối đa một chỗ" |

Lần chạy máy đo (Đ):

```
node <taste-skill>/scripts/lint.mjs src/components/{sections,layout,interactive,ui} src/app/globals.css ../../packages/design-tokens/theme.css
RESULT: 3 FAIL, 0 WARN   (hairline SiteFooter.tsx:15, gradient globals.css:299, shadow theme.css:60)
```

**Máy đo này bỏ sót:** nó không bắt được 5 nhãn eyebrow. Mình dùng các nhãn này làm mẫu đối chứng vì biết chắc chúng có. Lý do: regex của nó tìm class tên `eyebrow` hoặc
`uppercase`, còn ở đây nhãn là một prop và chữ hoa nằm trong file JSON, mà `lint.mjs` không đọc JSON. Vì vậy "3 FAIL" là **cận dưới**. Bắt
đủ cần `inspect.mjs` (đo trang đã render) hoặc `impeccable detect` (chưa chạy, mục 7).

## 4. Tài sản thật dùng được

- **Bài điền từ chạy được** (`ClozePractice`, 3 câu, đúng/sai, giải thích, bản dịch, làm lại): đây là "one live thing" taste-skill đòi, và là
  "demonstrate something only this product can prove" của impeccable mode Persuade. Đáng giữ và đẩy lớn hơn.
- **App người học thật**: 13 route trong `(member)` (ôn thẻ, luyện tập, tra từ, nhóm, chủ đề, từ của tôi, gói…), chụp được bằng
  `e2e-shots/shots.spec.ts`; đã có sẵn 40 ảnh sáng/tối ở 375 và 1280 trong `docs/audit/2026-10-26-ui-nguoi-hoc/shots-after/` (Đ, ảnh
  ngày 26/10, có thể đã cũ so với app). Taste-skill tính "cropped interface fragments" là ảnh thật (gắn `data-ui`). Hiện landing vẽ lại giao diện bằng
  thẻ tĩnh, không dùng app thật.
- **Hệ màu và font đã chốt**: token chung, có dark mode, Lexend có tiếng Việt, logo ô vàng "_ _".
- **Nội dung**: câu mẫu thật (deploy, assume, borrow), bảng thuật ngữ và luật chữ, 303 nghĩa mẫu, CEFR-J.
- **Không có**: ảnh chụp, video, người dùng, testimonial, số liệu giữ chân, báo chí, logo đối tác. Cả hai skill cấm bịa (TS: "Proof is never
  invented"; IM: "claims stay uninventable").

## 5. Survey skill cho việc redesign landing

| Skill | Làm gì (theo file đã đọc) | Dùng ở bước | Ghi chú |
|---|---|---|---|
| `impeccable` 4.7.1 | 24 lệnh. Với trang mới: `shape` (phỏng vấn, ra brief, không code) → `new-work` (chọn bố cục hoặc thế giới mới qua `concept-seed`, trang chọn phương án, hợp đồng hướng thiết kế) → dựng → `critique` / `audit` / `polish` → **reviewer độc lập** (`impeccable-finish-reviewer`) → **documenter** ghi `DESIGN.md` | Khung chính | Có mode **Persuade** cho landing. Tôn trọng hướng đã chốt ("the brief wins", "a brief-pinned direction beats the roll"). Comp-led cần tạo ảnh |
| `taste-skill` v2 (`design-taste-frontend`) | 10 bước riêng cho landing: kiểm kê 8–12 thứ chỉ Wordmet có → viết "argument" (mỗi section một claim kèm bằng chứng) → `draw.mjs` chia hướng → câu "idea" → viết chữ trước → dựng → `lint.mjs` + `inspect.mjs` (đo 1440/768/390) → tự chấm theo rubric → motion | Luật, viết chữ, đo | "Not for dashboards or app screens". `--keep palette,type` giữ màu và font của hướng B, chỉ chia bố cục |
| `taste-skill:redesign-skill` | Audit trang có sẵn, tìm mẫu AI chung chung, nâng cấp mà không phá chức năng | Thay thế cho bước audit | Trùng một phần với `impeccable critique` |
| `taste-skill:soft/minimalist/brutalist/gpt-taste`, `imagegen-*`, `image-to-code`, `brandkit` | Áp một phong cách cố định, hoặc tạo ảnh (viết cho Codex) | Không dùng | Đè lên hướng B; `gpt-taste` bắt GSAP và layout ngẫu nhiên |
| `design:ux-copy` | Viết và soát chữ: CTA, lỗi, trạng thái rỗng | Bước chữ | Đã dùng ở landing 08/10 (W16) |
| `design:design-critique`, `design:accessibility-review` | Nhận xét bố cục; audit WCAG 2.1 AA | Bước đánh giá | Đã dùng ở W16. Trùng với `impeccable critique/audit` |
| `prototype` | Dựng vài phiên bản **thật sự khác nhau** của **một** khối, có bộ chọn để bấm qua lại | Chọn Hero | Chỉ chạy khi gọi tên; một khối mỗi lần |
| `break-ui` | Nhồi dữ liệu xấu (email dài, chữ Việt có dấu, rỗng) | Làm cứng form, FAQ | |
| `emil-design-eng`, `animate`, `review-animations` | Chi tiết trau chuốt và chuyển động | Bước motion | Ràng buộc UB18 ≤ 400ms |
| `web-design-guidelines`, `mobile-native` | Soát theo chuẩn web; chỗ lỗi trên điện thoại (100vh, zoom ô nhập, tap) | Trước khi xong | |
| Figma MCP (`plugin:design:figma`) | Đọc/ghi Figma, có `generate_image` | Comp hoặc đồng bộ khung | Figma `7HcPAKLrWu32C27qYMJUOA` là khung đã duyệt cho app; landing hướng B dùng mockup HTML (UB11), Figma landing cũ ghi là lỗi thời |

## 6. Mâu thuẫn cần chủ dự án quyết

| Điểm | Hướng B (đã chốt 15/10) | impeccable | taste-skill |
|---|---|---|---|
| Bóng "gờ" đặc dưới nút và thẻ | Là chữ ký của B | Cấm, trừ khi thế giới thật sự là neobrutalist | Cấm bóng cho vật đứng yên |
| Lượng chuyển động | Hiện dần khi cuộn, lật thẻ, ≤ 400ms | "Một khoảnh khắc", không rải đều | **Bắt buộc ≥ 8 vật chuyển động**, cảnh báo dưới 16 |
| Ảnh | Không có ảnh, chỉ giao diện vẽ bằng HTML | Ảnh thật khi brief cần | **Tối thiểu 4 ảnh thật** (ảnh chụp giao diện app tính) |
| Màu `primary #2445d6` và nền tím nhạt `primary-soft` | Màu thương hiệu | Không cấm | "No violet or indigo": `#2445d6` có bị tính là indigo không thì ASSUMPTION, phải chạy `inspect.mjs` mới biết |
| Nhãn eyebrow, thẻ giống nhau, đánh số bước | Có trong mockup B | Cấm | Cấm |

Cả hai skill đều nói: thứ chủ dự án đã chốt thì thắng luật của skill. TS có `--allow <rule>`, IM có "brief-pinned". Nên mỗi dòng trên là một
lựa chọn giữ hay bỏ, không phải lỗi bắt buộc phải sửa.

## 7. Luồng redesign đề xuất

Mỗi bước nêu skill, đầu ra và ai duyệt. Theo luật dự án: chưa viết code khi chưa có design doc và plan được duyệt, nên bước 1–4 là một vòng
`brainstorming` cho ra design doc.

```
1 Chốt sự thật ─► 2 Argument + chữ ─► 3 Hướng & bố cục ─► 4 Design doc + plan ─► 5 Dựng ─► 6 Đo ─► 7 Review độc lập ─► 8 Ghi DESIGN.md
   (chủ dự án)       (chủ dự án duyệt)    (chủ dự án chọn)      (duyệt)            (TDD)     (máy)    (agent mới)          (documenter)
```

1. **Chốt sự thật sản phẩm.** Trả lời các câu ở mục 8 (trial, CTA, phạm vi). Cập nhật `PRODUCT.md` (hiện ghi "chờ chủ dự án xác nhận"). Không có
   bước này, mọi bố cục đẹp vẫn hứa sai.
2. **Argument và chữ, viết trước markup.** Dùng bước 1, 2, 4, 5 của `taste-skill`: kiểm kê 8–12 thứ chỉ Wordmet có (ví dụ câu bạn gặp ngoài đời đi thẳng vào
   lịch ôn, chấm bằng quy tắc không tốn lượt AI, 6 ngăn, chữ Việt), mỗi section một claim kèm bằng chứng, xóa section không có claim, mỗi
   tiêu đề tối đa 2 dòng (khoảng 32 ký tự). Soát bằng `design:ux-copy` và luật chữ của dự án. Đầu ra: copy deck VI/EN để chủ dự án duyệt.
3. **Hướng và bố cục.** Trong thế giới hướng B: `impeccable` new-work "whole surface inside an established world" (`concept-seed --scope
   surface --mode persuade`, 3 bố cục khác nhau trên trang chọn), hoặc `taste-skill draw.mjs --keep palette,type`. Hero chọn riêng bằng
   `prototype` (bài điền từ ở 3 cách bày). Nếu thay hẳn thế giới: `concept-seed --scope direction`. Đầu ra: hợp đồng hướng thiết kế 6 khối
   (THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, FINISH).
4. **Design doc, decision record, plan** theo chuỗi superpowers của dự án.
5. **Dựng** trên nhánh `feat/landing-redesign`, theo `craft-floor.md` của impeccable. Ảnh giao diện lấy từ app thật qua `e2e-shots`. Không thêm thư viện
   animation (W10).
6. **Đo, không tự khen:** `lint.mjs` và `inspect.mjs` (1440/768/390), `impeccable detect`, `design:accessibility-review`, `break-ui` trên form, rồi Playwright
   + axe hiện có. Mỗi FAIL phải sửa hoặc ghi lý do giữ (`--allow`).
7. **Review độc lập:** `impeccable-finish-reviewer` chạy ở context mới, nhận ảnh chụp và hợp đồng, không đọc transcript, trả ship/fix/rebuild/recapture.
8. **Ghi lại:** `impeccable-documenter` viết `DESIGN.md` từ bản đã dựng; delivery record ở `docs/deliveries/`. Lên `wordmet.com` chỉ khi chủ dự án
   yêu cầu PR `dev` → `main`.

## 8. Câu hỏi cho chủ dự án

Theo luật dự án (chủ dự án trả lời trước, Claude đề xuất sau), các lựa chọn dưới đây không thiên vị phương án nào.

- **Q1 Phạm vi.** (a) Giữ thế giới hướng B (màu, font, logo) và chỉ làm lại bố cục và chữ · (b) Giữ màu và font nhưng bỏ các mẫu bị cấm (eyebrow, gờ,
  thẻ giống nhau) · (c) Thay hẳn thế giới hình ảnh, coi B là bằng chứng chứ không là luật. Trade-off: (a) nhanh, nhất quán với app nhưng giữ các mẫu
  "AI"; (b) app và landing lệch nhau ở bóng và thẻ; (c) khác biệt nhất nhưng tốn công, và app đi một đường, landing một đường.
- **Q2 Lời hứa trial** (= Q8 của research pháp lý). (a) Sửa theo D15/D16 (7 ngày, giữ thẻ) · (b) Đổi D15/D16 theo landing · (c) Bỏ con số tới khi có thanh toán thật.
- **Q3 Nút chính.** (a) Vẫn là waitlist (app chặn trên production tới Deploy) · (b) "Dùng thử" vào app sau Deploy · (c) Cả hai theo giai đoạn.
- **Q4 Bộ skill dẫn.** (a) `impeccable` làm khung, luật và máy đo của taste-skill làm gate · (b) Chỉ `impeccable` · (c) Chỉ `taste-skill`. Trade-off: (a) đủ nhất nhưng hai bộ luật
  cãi nhau ở mục 6; (b) gọn, ít luật cho landing hơn; (c) chuyên landing, bỏ qua reviewer độc lập và `DESIGN.md`.

### Trả lời của chủ dự án (02/11/2026)

- **Q1:** chưa chốt. Cả 3 mockup trong `docs/mockups/2026-11-02-landing-redesign/` "đều không ok lắm", chốt sau.
- **Q2:** (a) sửa landing theo D15/D16 (7 ngày, cần thẻ).
- **Q3:** nút chính dẫn thẳng tới trang đăng ký tài khoản (không phải waitlist). Làm một landing hoàn chỉnh ngay, không chờ Deploy:
  chủ dự án đã tạm tắt Worker `wordmet-web`, phát triển ở local, xong thì deploy. Waitlist không có email thật (chưa công khai), nên bỏ
  waitlist, không cần gửi email báo mở.
- **Q4:** (a) `impeccable` dẫn quy trình, luật và máy đo của `taste-skill` làm cửa kiểm; chủ dự án đồng ý cho launcher của `impeccable` tải
  binary ở lần chạy đầu.
- **Q2, phần Claude đề xuất thêm** (viết kèm "khi Pro mở bán", chờ luật sư về thời hạn báo trước): chưa trả lời.

## 9. Chưa xác minh

- `impeccable` chưa chạy: launcher tải một binary ở lần chạy đầu (`scripts/impeccable`, có `engine-checksums.txt`). Mình chưa chạy vì đó là tải file
  thực thi; cần chủ dự án đồng ý. Vì vậy `detect`, `concept-seed`, `serve-question` chưa thử.
- `inspect.mjs` chưa chạy: cần trang đang chạy (dev server; form waitlist cần D1). Máy có Node 24.11, Chrome và Edge (Đ).
- `draw.mjs` chưa chạy; nó ghi file vào `.taste-skill/` ở gốc repo. Có 22 sector (Đ, `--list sectors`), gần nhất là `education` / `consumer-app`.
- Comp-led của impeccable cần tạo ảnh. Figma MCP có `generate_image`, nhưng impeccable có nhận nó làm "harness image tool" không thì ASSUMPTION.
- Số nghĩa đã publish trong catalog, và AI có trả giải thích đáp án hay không: chưa đọc code, chỉ đọc chữ app.
- Mình chưa xem lại mockup `landing-b.html` và Figma landing trong phiên này.
