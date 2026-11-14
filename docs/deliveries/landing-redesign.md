# Landing làm lại — plan tóm tắt (03/11/2026)

> **Đã thay (11/11/2026):** M8 của đợt giao diện mới dựng lại các trang công khai theo Figma; mã của landing này (`src/components/**`) đã xóa. Bố cục, gói có giá, thanh trên và nền mô tả dưới đây không còn đúng. As-built mới: mục "as-built M8b" trong `docs/deliveries/giao-dien-moi.md`. Các bất biến LR20–LR28, LR50 vẫn được e2e giữ.

Design: `docs/superpowers/specs/2026-11-03-landing-redesign-design.md`. Plan đầy đủ: `docs/superpowers/plans/2026-11-03-landing-redesign.md`.
Nhánh `feat/landing-redesign` (tách từ `docs/landing-redesign`), một PR vào `dev` khi xong.

1. Cho landing dùng chung theme sáng/tối và nút đổi theme của app.
2. Thêm toàn bộ chữ của landing mới vào messages (tiếng Anh tạm giữ chữ Việt), đổi tiêu đề và mô tả trang.
3. Thêm kiểu nút của app (vàng có gờ, nút viền) và vài token chuyển động cho landing.
4. Viết hai hàm thuần: chấm đáp án gõ, và tính đường cong ghi nhớ.
5. Dựng thanh trên và màn đầu mới; bỏ nút đổi ngôn ngữ.
6. Dựng cửa sổ app 5 tab (Ôn thẻ lật được, Nhóm từ, Luyện tập AI, Tra từ, Thêm từ mới).
7. Dựng phần "Vì sao từ vựng nhanh bị quên" với đường cong minh họa.
8. Dựng phần 7 dạng bài làm thử được.
9. Dựng phần ôn đúng lúc, từ gặp hằng ngày, gói, hỏi đáp (có chuyển động khi mở), kêu gọi cuối; sửa chân trang.
10. Ghép trang mới, xóa các section và chữ của landing cũ.
11. Xóa waitlist và kho D1, sửa lệnh e2e và trang chính sách bảo mật cho khớp.
12. Chuyển `/en` về `/vi`, bỏ `/en` khỏi sitemap và metadata.
13. Viết lại test e2e cho landing mới (đăng ký, tràn màn hình, theme, giảm chuyển động, không JS, axe, CSP).
14. Chạy cửa kiểm taste-skill và impeccable, chạy tay 4 bề rộng × 2 theme, ghi as-built và deploy checklist.

# Landing làm lại — as-built (03/11/2026)

Task 1–14 xong trên nhánh `feat/landing-redesign`; review cuối của một reviewer độc lập đã chạy (mục "Review cuối" bên dưới). Đã vào `dev`: PR #205 (bản desktop và các vòng chỉnh tới nút Google, merge ở `74062120` ngày 03/11) và PR #208 (vòng mobile, merge ở `895aafcb` ngày 04/11), CI xanh 4/4 trước mỗi lần merge.
Trang `/vi` gồm: thanh trên navy, màn đầu kèm cửa sổ app 5 tab, "Vì sao quên" (đường cong minh họa), 7 dạng bài làm thử được, ôn đúng lúc, "Từ gặp hằng ngày", gói Free/Pro (không giá), FAQ 4 câu, kêu gọi cuối, chân trang. `/en` chuyển 307 về `/vi` (giữ query); `/en/app`, `/en/privacy`, `/en/terms` không đổi. Waitlist và D1 `wordmet-waitlist` đã bỏ khỏi code.
Màn đầu (owner 03/11, sau review cuối; phần cửa sổ và thẻ Pro của đoạn này đã được thay bởi mục "Các vòng chỉnh sau" bên dưới): từ 1024 px chữ, nút Đăng ký/Đăng nhập nằm bên trái (5/12 cột) và cửa sổ app nằm bên phải (7/12 cột); dưới 1024 px cửa sổ nằm dưới chữ như cũ. Ở cột hẹp cửa sổ gọn lại: không logo và icon trên thanh tab, không danh sách gạch đầu dòng dưới tiêu đề mỗi tab, thẻ ôn thấp hơn, mọi tab cùng cao 624 px (đáy ở y=720, vừa màn 1366×768 và 1440×900) để chữ bên trái không nhảy khi đổi tab. Lúc mở trang các dòng tiêu đề, câu mô tả và khối nút trồi lên lần lượt (70 ms một bước), cửa sổ trồi lên và phóng nhẹ; chỉ dùng CSS (`motion-safe:`), nên không cần JS và tắt khi giảm chuyển động. Thẻ gói Pro nền navy, dấu tích vàng, viền vàng và bóng vàng. Test: LR34 (bố cục và vừa màn hình), LR35 (chuyển động), LR36 (Pro khác Free).
Theo yêu cầu của owner ngày 03/11: ba section nền trắng (Vì sao quên, Ôn lại, Hỏi đáp) nay nằm trên nền `canvas` xám nhạt của app, xen với trắng và navy, ở cả hai theme.

## Kiểm chứng

- Local: unit 736 (76 file), `pnpm lint` (gồm `check-tailwind-raw`), `pnpm typecheck` đều sạch. taste-skill `lint.mjs` 0 FAIL / 0 WARN, `impeccable detect --json` trả `[]`.
- e2e trên CI (PR #205): lần chạy đầu 289 pass, 10 fail, cả 10 nằm trong `landing.spec.ts`; sau khi sửa, 4/4 check xanh ở `ff497419`. CI cũng xanh 4/4 trên `c3577ca0` (run 41566845075, gồm nền xen kẽ, header 320, thanh tab 768, tiêu đề cân dòng); lượt sửa sau review cuối chưa có kết quả CI lúc viết.
- e2e cục bộ: Docker chạy lại được, nên `pnpm bootstrap` dựng stack và một proxy TCP 3100 → 3001 cho `playwright.config.ts` dùng lại server đó. `landing`, `a11y`, `chrome`, `locale`, `seo`: 79 pass, 7 skip (test chỉ chạy một project), trên `next start`, **không phải Worker**, nên CSP và OpenNext vẫn chỉ được kiểm trên CI.
- Ảnh chụp cả trang `/vi` ở 1440, 768, 390 và 320 px, sáng và tối: `docs/deliveries/landing-redesign/vi-<bề rộng>-<light|dark>.jpg`; không có tràn ngang ở bề rộng nào (`scrollWidth` = bề rộng).

## Lỗi tìm ra khi chạy thật (không có gate cục bộ nào bắt được)

- **CI:** `AppShowcase` là component client và app không cấp message cho client, nên `Logo` trong đó ghi 848 lỗi `MISSING_MESSAGE` và sẽ hiện khóa `App.chrome.brand`. Sửa: trang render `<Logo />` rồi truyền vào làm `logo` (test đỏ `cbb69698`, sửa `2d41a713`).
- **Nhìn ảnh:** nút Đăng ký ở header gãy hai dòng ở 320 px; thanh tab cắt mất tab thứ 5 ở 768 px; chữ "dụng" lẻ dòng ở H1 320 px; hover của danh sách dạng bài vô hình trên nền trắng. Hai lỗi đầu có test đỏ trước (LR32, `633ccb37`), sửa ở `02f0c994`.
- **Spec sai:** LR22 tìm nút mà mặt trước thẻ đã lật cố ý giấu; LR26 treo vì Playwright không qua được kiểm tra "ổn định" khi tắt JS và transition FAQ đang chạy (dựng lại riêng, bật reduced motion thì 3/3 pass); LR27 quá 30 s.

## Cảnh báo `inspect.mjs` còn lại (6 FAIL, 5 WARN) và lý do giữ

| Cảnh báo | Lý do giữ |
|---|---|
| `few-pictures` (3, 0 ảnh thật) | Trang cho xem chính sản phẩm bằng giao diện dựng HTML trong design system của app (quyết định của owner); ảnh stock hay tư liệu sẽ trái yêu cầu đó. |
| `eyebrow` "Trắc nghiệm" trên "triển khai, phát hành" | Là nhãn loại câu hỏi của thẻ luyện tập thật trong app, nằm trong mẫu giao diện, không phải nhãn trang trí. |
| `covered-text` "đàm phán, thương lượng" | Mặt sau thẻ ôn, cố ý ẩn và `inert` tới khi lật; bị đo nhầm là bị che. |
| `headline-lines` ở 390 và 320 | H1 là câu owner đã chốt; tiếng Việt dài hơn nên 3–4 dòng ở màn hẹp. Chỉ cân dòng cho khỏi lẻ chữ. |
| `ui-wrapper` ở 320 | Do bộ đo: nó dùng viewport cao 200 px cho bề rộng 320 (không có sẵn cỡ), nên mọi mẫu cao hơn 320 px bị coi là "bọc cả trang". Không còn `data-ui` nào chứa heading. |
| `size-count` (11 cỡ chữ) | Là thang chữ token của app, dùng chung với app. |
| `side-scroll` ở 768 trở xuống | (Đã hết từ vòng mobile 04/11: dưới `lg` các dạng bài là một ô chọn, thanh tab vừa 5 tab ở mọi bề rộng.) |
| `palette-cream` `#fff4c7` | Là token `accent-soft` của app. |
| `no-footage`, `still-page` | Không có video phù hợp; chuyển động có chủ đích ở tab, thẻ lật, FAQ, vào section, giảm chuyển động được tôn trọng. |

## Review cuối (reviewer độc lập, chỉ đọc, `efea78b9..c3577ca0`)

Báo cáo đầy đủ: `docs/deliveries/landing-redesign/final-review.md`. Kết quả: 0 Critical, 3 Important, 5 Minor; reviewer đồng ý các ruling đã ghi (kể cả LR26 chạy với reduced motion, chính nó chạy lại với motion bật vẫn đúng) và đóng 5 mục Review Focus.

- **Đã sửa (đều có test đỏ trước, `a0e635a0`):** (1) neo header/footer chết trên `/vi/privacy` và `/vi/terms`: giờ là `/vi#goi`…, test LR33; (2) Enter trong ô khóa sau "Xem đáp án" chấm lại chữ sai cũ: `submit` bỏ qua khi đã trả lời; (3) live region im lặng từ lần sai thứ hai: thông báo kèm số lần. Unit 738 pass; e2e cục bộ 84 pass, 8 skip.
- **Hoãn (Minor):** thẻ ôn mẫu không lật lại được bằng bàn phím (và `aria-pressed` nằm trong vùng `aria-hidden`); mất phủ của `page.spec.ts` cũ (chữ 125 %, focus dưới header dính, forced-colors); vài test pin `data-state` thay vì điều người đọc thấy và không test nào pin rằng từ nổi bật nằm trong câu; chỗ trống trong câu mẫu đọc không nhất quán; `deploy-checklist.md` còn nhắc CAPTCHA của waitlist.
- **Ngoài nhánh này:** CSP là `'unsafe-inline'` từ 22/10 (D20), nên câu "hash của theme script nằm trong CSP" trong design chỉ đúng trên giấy.

## Các vòng chỉnh sau (owner, 03–04/11/2026)

Mỗi vòng có test đỏ trước rồi mới sửa; tiêu chí LR37–LR51 trong `apps/web/e2e/landing.spec.ts`.

- **Màn đầu, desktop (LR37–LR40):** cửa sổ app rộng ra bên trái (cột chữ 29rem từ `xl`), chỉ hiện ~3/4, section sau nằm đè lên phần còn lại; bên trong chỉ giữ hình chính (bỏ gạch đầu dòng, thanh tiến độ, nút, ô phụ); thanh tab mỏng; thẻ ôn nằm cao, khoảng cách đều.
- **Gói học (LR36, LR42):** bảng so sánh Miễn phí / Pro thật sự là `<table>` (7 dòng, Có/Không cho trình đọc màn hình), cột Pro nền kem viền mực kiểu sticker của app; bảng hẹp, nằm bên phải; Đăng ký và dòng dùng thử nằm ngay dưới tiêu đề bên trái.
- **Trang đăng nhập / đăng ký (LR43):** bỏ khung navy bên trái, form ở giữa; ô có nhãn không còn placeholder; nút Google có chữ G bốn màu (ẩn với trình đọc màn hình).
- **Vòng mobile (04/11; survey, ảnh và các quyết định Q1–Q4: `docs/deliveries/landing-redesign/mobile-survey.md`):**
  - Q1 a: cửa sổ gọn như desktop ở mọi bề rộng; dưới `md` cắt ở 528 px (cửa sổ cao 662), `md` trở lên ở 432; mọi tab cùng cao nên trang không còn nhảy khi đổi tab (LR44).
  - Q2 a: dưới `md` thanh tab bỏ logo; tab đang mở chỉ hiện tên, bốn tab kia là icon chia đều phần còn lại, cao 44 px; ở 320 px icon rộng ~37 px (dưới 44 nhưng trên 24 px của WCAG 2.5.8), từ 360 px đủ 44 (LR45).
  - Q3 c: dưới `lg` các dạng bài là một ô chọn có sẵn của trình duyệt, mỗi lựa chọn ghi gói (Miễn phí / Pro) và "Câu AI"; từ `lg` vẫn là danh sách (LR46). Claude đề xuất b (chip xuống dòng); owner giữ c.
  - Q4 a: trên điện thoại bảng gói đứng trước nút Đăng ký, cả trong thứ tự code nên trình đọc màn hình cũng đọc bảng trước (LR47).
  - Sửa thêm: mọi tiêu đề section cân dòng (LR48); biểu đồ quên có bản vẽ riêng cho điện thoại để chữ trục cao ≥ 12 px (LR49); hai chip "Từ hay sai" cách nhau ≥ 6 px (LR49); nút đổi giao diện 44×44, link "Đăng nhập" ở màn đầu và "Quên mật khẩu?" có vùng bấm 44 px (LR50); tab, dạng bài, đáp án và câu hỏi FAQ co còn 0,97 khi nhấn (150 ms, tắt khi giảm chuyển động), bỏ vệt xám khi chạm trên mobile (LR51).
- **Kiểm chứng vòng mobile:** unit 741, lint, typecheck sạch; taste `lint.mjs` 0 FAIL ở `src/components/landing` (1 FAIL gradient của `highlighter` trong `globals.css` có từ trước, của app); impeccable `[]`; e2e cục bộ `landing`, `a11y`, `chrome`, `locale`, `seo`: 114 pass, 32 skip. Ảnh `vi-<bề rộng>-<light|dark>.jpg` chụp lại từ bản dựng của commit `6f5f0b8e`.
- **Lưu ý khi chạy e2e cục bộ:** một session khác (worktree `.claude/worktrees/legal-docs`) dựng cùng tên project Docker `english-learning`, nên container `english-learning-web-1` có thể bị thay bằng mã của nhánh khác giữa chừng. Ảnh ở trên chụp từ một container riêng (`docker compose -p el-landing … build web`, chạy ở cổng 3011). Docker trên máy này còn có lúc dựng web mà không chép mã mới; `build --no-cache web` thì chép đúng.

## Chưa làm và việc cho owner

- Trước khi lên `main`: xem mục "Landing mới" của `docs/deliveries/deploy-checklist.md` (workflow cần `NEXT_PUBLIC_LEARNER_APP=on` và API base URL, xóa D1 `wordmet-waitlist`, viết trang pháp lý thật, landing tiếng Anh sau).
- Chưa xem trên thiết bị thật.
