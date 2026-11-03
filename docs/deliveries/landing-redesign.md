# Landing làm lại — plan tóm tắt (03/11/2026)

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

Task 1–14 xong trên nhánh `feat/landing-redesign`; PR #205 vào `dev` còn là draft, chờ review cuối của một reviewer độc lập (chưa chạy) rồi mới đánh dấu ready.
Trang `/vi` gồm: thanh trên navy, màn đầu, cửa sổ app 5 tab, "Vì sao quên" (đường cong minh họa), 7 dạng bài làm thử được, ôn đúng lúc, "Từ gặp hằng ngày", gói Free/Pro (không giá), FAQ 4 câu, kêu gọi cuối, chân trang. `/en` chuyển 307 về `/vi` (giữ query); `/en/app`, `/en/privacy`, `/en/terms` không đổi. Waitlist và D1 `wordmet-waitlist` đã bỏ khỏi code.
Theo yêu cầu của owner ngày 03/11: ba section nền trắng (Vì sao quên, Ôn lại, Hỏi đáp) nay nằm trên nền `canvas` xám nhạt của app, xen với trắng và navy, ở cả hai theme.

## Kiểm chứng

- Local: unit 736 (76 file), `pnpm lint` (gồm `check-tailwind-raw`), `pnpm typecheck` đều sạch. taste-skill `lint.mjs` 0 FAIL / 0 WARN, `impeccable detect --json` trả `[]`.
- e2e trên CI (PR #205): lần chạy đầu 289 pass, 10 fail, cả 10 nằm trong `landing.spec.ts`; sau khi sửa, 4/4 check xanh ở `ff497419`. Các commit sau đó (nền xen kẽ, header 320, thanh tab 768, tiêu đề cân dòng) chưa có kết quả CI lúc viết.
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
| `side-scroll` ở 768 trở xuống | Hàng chip "Các dạng bài" cuộn ngang tới `lg`, kiểu thường gặp, chip bị cắt ở mép gợi cuộn. Thanh tab trong cửa sổ đã vừa 5 tab từ 768 px. |
| `palette-cream` `#fff4c7` | Là token `accent-soft` của app. |
| `no-footage`, `still-page` | Không có video phù hợp; chuyển động có chủ đích ở tab, thẻ lật, FAQ, vào section, giảm chuyển động được tôn trọng. |

## Chưa làm và việc cho owner

- Review cuối của reviewer độc lập (Review Focus: bàn phím trong thư viện dạng bài, theme sang app, 320 px, tương phản tối, không JS) và một lượt sửa Critical/Important.
- Ứng viên cho reviewer: sau khi lật thẻ ôn, mặt trước `inert` nên focus rơi và người dùng bàn phím không lật lại được; `Flashcard` của app có cùng mẫu.
- Trước khi lên `main`: xem mục "Landing mới" của `docs/deliveries/deploy-checklist.md` (workflow cần `NEXT_PUBLIC_LEARNER_APP=on` và API base URL, xóa D1 `wordmet-waitlist`, viết trang pháp lý thật, landing tiếng Anh sau).
- Chưa xem trên thiết bị thật.
