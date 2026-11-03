# Critique B: bằng chứng từ detector (mockup 4 · 4-van-de.html)

02/11/2026. Chỉ ghi lại kết quả đo, không có nhận xét thiết kế.

## 1. Các lệnh đã chạy

Chạy từ repo root, Git Bash. `D` là `C:/Users/Tien Ngo/.claude/local-marketplaces/impeccable-nohooks/plugin/skills/impeccable/scripts/impeccable`.

| # | Lệnh | Exit | Kết quả |
|---|---|---|---|
| 1 | `$D detect --json docs/mockups/2026-11-02-landing-v2/4-van-de.html` | 2 | 9 warning |
| 2 | `$D detect --json --scope layout docs/mockups/2026-11-02-landing-v2/4-van-de.html` | 2 | 6 warning |
| 3 | (thêm) `$D detect --json http://localhost:5190/2026-11-02-landing-v2/4-van-de.html` (Chrome thật, 1280x800) | 0 | 0 warning, 10 advisory |
| 4 | (thêm) như #3 với `--viewport 390x844` | 2 | 1 warning, 10 advisory |

Lệnh 3–4 được thêm vì chế độ đọc file tĩnh (#1, #2) không tính được `clamp()`, `min()` hay `padding-block`, còn chế độ URL render trang thật. Không lệnh nào lỗi.

### Đếm theo rule

| Rule | #1 file | #2 file, `--scope layout` | #3 URL 1280 | #4 URL 390 |
|---|---|---|---|---|
| `cramped-padding` (warning) | 6 | 6 | 0 | 1 |
| `tight-leading` (warning) | 3 | — (thuộc scope `type`) | 0 | 0 |
| `hard-offset-shadow` (advisory, không tính vào exit code) | 0 | 0 | 10 | 10 |
| **Tổng warning** | **9** | **6** | **0** | **1** |

## 2. Từng finding

Detector trả `"line": 0` cho mọi finding, nên không có số dòng. Để biết finding nào ứng với phần tử nào, tôi chép HTML và `app.css` vào scratchpad, sửa từng rule rồi chạy lại (bisect), và đo trong Chrome bằng Playwright (`@playwright/test` 1.63.0, channel `chrome`). File thật không bị sửa.

### F1. `cramped-padding`: `.mock-bar` "children flush against bg on right/left" (#1, #2). False positive

- Vị trí: `4-van-de.html:118`, CSS `app.css:29` (`padding: 0.45rem var(--gutter)`), `--gutter` = `clamp(1rem, 0.4rem + 2.4vw, 2rem)` ở `app.css:15`.
- Bằng chứng: đổi `--gutter` thành `1rem` trên bản sao thì finding này mất (6 → 5). Trong Chrome, padding thật là `7.2px 16px` ở 390px và `7.2px 32px` ở 1280px. Lỗi do bộ đọc tĩnh không tính được `clamp()`. Phần tử này cũng chỉ là thanh điều hướng của mockup, không thuộc landing.

### F2–F6. `cramped-padding`: `<section>` "children flush against bg on all sides", 5 lần (#1, #2). False positive

- Vị trí: 5 section có nền: `4-van-de.html:160` (`#vi-sao`, white-band), `:200` (`#on-lai`, white-band), `:223` (`#gap-tu`, navy-band), `:239` (`#goi`, white-band), `:265` (`.final`, navy-band). CSS `app.css:136` và `:180` (`.section { padding-block: clamp(...) }`). Khoảng cách hai bên do `.wrap` lo (`app.css:28`, `width: min(100% - 2 * var(--gutter), var(--wrap))`).
- Bằng chứng từ bisect: đặt `padding-block: 4.5rem` (giá trị cố định) thì vẫn bị báo. Đặt `.wrap` thành `margin-inline: 16px` vẫn bị báo. Chỉ khi viết shorthand `padding: 4.5rem 16px` thì cả 5 mới mất. Kết luận: bộ đọc tĩnh không đọc `padding-block` và không coi margin của `.wrap` là khoảng đệm. Trong Chrome, section có padding `72px` (390) và `121.6px` (1280), `.wrap` rộng 358px ở 390px (cách mỗi bên 16px). Scan URL (#3, #4) không báo finding này.

### F7–F9. `tight-leading` "line-height 1.26x (need >=1.3)", 3 lần (#1). False positive

- Vị trí: `.rule` ở `4-van-de.html:196` (CSS `:72`) 1 lần, và `.kind p` ở các dòng `4-van-de.html:189–194` (CSS `:68`) 2 lần. Bisect: thêm `line-height:1.5` cho `.rule` thì 3 → 2, thêm cho `.kind p` thì 2 → 0. Không xác định được đó là 2 trong 6 dòng `.kind p` nào.
- Bằng chứng: trong Chrome, cả hai có `font-size 19px` và `line-height 28.5px`, tỉ lệ 1.5. Giá trị này kế thừa từ `body { font: 400 1rem/1.5 }` (`app.css:19`), là số không đơn vị. Scan URL không báo. **ASSUMPTION** về cơ chế: bộ đọc tĩnh kế thừa giá trị đã tính sẵn là 24px chứ không phải hệ số 1.5, nên ra 24/19 = 1.263, khớp với "1.26x".

### F10. `cramped-padding`: `span.input:nth-of-type(2)` "2.4px of space above and below the text (need ≥4.8px for 16px text)" (#4, chỉ ở 390px). True positive

- Vị trí: `4-van-de.html:232`, ô thứ hai của mảnh UI "Thêm từ vừa gặp" (`data-ui`), có nội dung "Can I borrow your charger for a minute?". CSS `app.css:94` (`.input`: `display:flex; min-height:2.75rem; padding:0 0.9rem`, không có padding dọc, `font` shorthand nên `line-height: normal`).
- Đo trong Chrome: ở 390px, ô rộng 318px, chữ xuống **2 dòng** (cao 40px) trong một hộp cao 44px có viền 2px, nên chữ cách viền khoảng 2px trên và 2px dưới. Ở 1280px chữ nằm 1 dòng, cách viền 12px trên và 12px dưới. Ảnh chụp: chữ chạm viền trên và viền dưới.
- Lưu ý: trong app thật, ô này có thể là `<input>` một dòng hoặc `<textarea>` (**ASSUMPTION**, chưa đọc component). Dù vậy, mảnh UI dựng lại trong mockup đang hiển thị sai ở 390px.

### A1–A10. `hard-offset-shadow` (advisory), 10 lần (#3, #4). False positive theo context

- Các giá trị bị báo: `rgb(201,162,26) 0 4px 0` = `--ledge-accent` (`app.css:13`, dùng cho `.btn-sticker`); `rgb(221,225,245) 0 4.8px 0` = `--sheet` (`app.css:14`); `rgba(15,26,61,.35) 0 4px 0` = `--ledge` (`.btn-ink`); `rgb(201,162,26) 0 4.8px 0` = `.addword` (`4-van-de.html:93`).
- Đây đều là bóng "ledge" phẳng có chủ đích của design system app học. Detector chỉ hỏi lại và tự xếp chúng là advisory, không tính vào exit code.

### Tóm tắt đánh giá

| | Số lượng | Finding |
|---|---|---|
| False positive (giới hạn của bộ đọc tĩnh) | 9 | F1–F9 |
| False positive (style có chủ đích, advisory) | 10 | A1–A10 |
| **True positive** | **1** | **F10**: ô input thứ hai xuống 2 dòng và chạm viền ở 390px |

## 3. Những điều detector không tự kiểm được (đo tay trong Chrome)

1. **Spacing tùy ý.** Các thuộc tính padding/margin/gap trong `4-van-de.html` dùng 24 giá trị khác nhau, trong `app.css` là 32. Nhiều giá trị không nằm trên lưới 0.25rem (4px): `0.15rem` (`:28`, `:73`), `0.35rem` (`:35`), `0.55rem` (`:80`, `:88`), `0.6rem` (`:29`, `:83`, `:89`), `0.9rem` (`:27`), `1.1rem 1.2rem` (`:80`, `:83`, `:99`), `1.4rem` (`:64`), `0.2rem` (`:48`, `:90`); trong `app.css` có `0.45rem` (`:29`), `0.375rem` (`:42`), `0.55rem 0.85rem` (`:43`), `1.15rem` (`:50`), `0.18rem` (`:52`). Theo comment ở `app.css:1–2`, phần lớn giá trị trong `app.css` được chép lại từ app thật. Đây chỉ là số đếm, không phải finding.
2. **Overflow ngang.** Ở cả 390px và 1280px, `scrollWidth` bằng `clientWidth` (390/390, 1280/1280). Không phần tử nào tràn ra ngoài viewport, và không phần tử `overflow: visible` nào có nội dung rộng hơn hộp của nó. Hai mặt flashcard có nội dung vừa hộp (134/134). 4 nút `.q-opt` mỗi nút rộng 130px, không tràn.
3. **Biểu đồ SVG `.curve` (`4-van-de.html:170–176`). Hai vấn đề thật mà detector không thấy:**
   - Nhãn trục đặt `13px` theo đơn vị viewBox (`:55`). SVG bị thu nhỏ theo bề rộng, nên ở 390px chữ thực tế chỉ còn **khoảng 6.7px** (tỉ lệ 0.517). Ở 1280px là 12.9px.
   - Nhãn "Học" (x 40–66) **chồng lên** nhãn "1" (x 54.5–62.2) ở mọi bề rộng, vì cả hai được đặt cố định trong viewBox (`:174`). Ảnh chụp ở 390px cho thấy rõ "Học" và "1" dính vào nhau.
4. **Sticky header có che nội dung không.** `.topbar` dùng `position: sticky; top:0; z-index:20`, cao 64px (`app.css:40–41`). Các section có `scroll-margin-top: 72px` (`app.css:178`). Bấm 5 anchor (`#vi-sao`, `#dung-tu`, `#on-lai`, `#goi`, `#hoi-dap`) thì section dừng ở khoảng 72px, thấp hơn mép dưới header 8px. h2 nằm ở 144px (390) và 193–202px (1280). Không bị che. `.mock-bar` không sticky, nên cuộn đi mất (cao 53.4px ở 390 vì xuống 2 dòng, 33.9px ở 1280).
5. **Thứ tự chồng lớp (stacking).** Lật flashcard (dùng 3D transform, `:33–34`) rồi cuộn cho thẻ chui dưới header: `elementFromPoint` ở mép dưới header trả về `.topbar`, nghĩa là header vẫn nằm trên. Các `.reveal` có transform cũng không vượt lên header.
6. **Container ở 390px.** `.wrap` rộng 358px. Topbar gồm logo (130.5px) và `.end` (104.3px; nút "Đăng nhập" bị ẩn bởi `app.css:169`); nav bị ẩn vì màn hình hẹp hơn 60rem. `.kind` còn 1 cột rộng 358px. Mỗi hàng `.boxes-panel` chia thành 60, 193.6 và 40px. `.pair` xếp dọc. Hero h1 cỡ 35.2px, `line-height 0.98`, xuống 2 dòng; ảnh chụp không thấy dấu tiếng Việt của dòng 2 ("vải", "hôm", "quên") va vào dòng 1. Detector bỏ qua heading khi xét leading.
7. **Giới hạn của scan URL (chưa kiểm):** phần tử `.reveal` có `opacity:0` cho tới khi được cuộn tới. Ảnh chụp đầu tiên của tôi khi chưa ép `.in` ra trắng trơn. Có thể scan #3, #4 đã bỏ qua các phần tử chưa hiện (**ASSUMPTION**, chưa xác minh detector có bỏ qua phần tử `opacity:0` hay không).

## 4. Bước lỗi và lưu ý

- Không lệnh nào lỗi. Mọi finding đều có `line: 0`; số dòng ở trên có được nhờ bisect trên bản sao trong scratchpad và đo bằng Playwright.
- **Có người sửa file trong lúc tôi chạy:** `app.css` đổi lúc 23:24:05 (thêm các rule `.qc*` ở cuối, từ dòng 211 trở đi), và `exercises.js` mới xuất hiện lúc 23:24:45. `4-van-de.html` không đổi (23:16:43). Tôi chạy lại #1, #2, #4 sau 23:26: số đếm không đổi (9 / 6 / 1 + 10). Số dòng `app.css` trích ở trên thuộc dòng 1–209; đã đối chiếu lại một số dòng sau thay đổi và thấy không đổi. Tại thời điểm đo, `4-van-de.html` vẫn dùng `practice.js` (`.q-card`/`.q-opt`), chưa dùng `.qc`.
