# Landing trên mobile — survey và plan (03/11/2026)

Nhánh `feat/landing-redesign` tại `74062120` (PR #205, chưa merge). Đo bằng Playwright trên Docker `next start` (`localhost:3001`), viewport 320 / 360 / 375 / 390 / 430 / 768 / 1440, `isMobile` + `hasTouch` cho bề rộng < 768, `reducedMotion: reduce`. Ảnh chụp: `docs/deliveries/landing-redesign/mobile/`.
Ba bộ quy tắc được dùng để soi: Vercel Web Interface Guidelines (`web-design-guidelines`), `taste-skill:redesign-existing-projects`, `emil-design-eng`.

## 1. Tình trạng hiện tại

Không có cuộn ngang ở bề rộng nào (`scrollWidth == viewport` ở cả 7 bề rộng; các phần tử "tràn" mà script bắt được đều là `path` SVG nằm trong khung đã cắt). Lỗi trên mobile là lỗi **bố cục và độ đồng bộ với desktop**, không phải lỗi tràn.

Desktop (≥ `lg`) đã được chỉnh nhiều vòng: cửa sổ app thu gọn (bỏ gạch đầu dòng, thanh tiến độ, nút), chỉ hiện khoảng 3/4 rồi section sau đè lên. Những chỉnh đó đều gắn `lg:`, nên **mobile và tablet vẫn là bản cũ**.

## 2. Phát hiện

Mức: **A** = thấy ngay, làm trang trông hỏng; **B** = lệch so với desktop hoặc sai quy tắc; **C** = chi tiết.

| # | Mức | Ở đâu | Thấy gì (390px trừ khi ghi khác) | Ảnh |
|---|---|---|---|---|
| M1 | A | Cửa sổ app (`AppShowcase`) | Chiều cao đổi theo tab: 729 / 812 / 632 / 562 / 718 px. Bấm đổi tab thì mọi thứ bên dưới nhảy lên xuống tới 250 px. | `vi-390-tab0`, `vi-390-tab2` |
| M2 | A | Thanh tab của cửa sổ | Logo "Wordmet" chiếm gần nửa thanh, chỉ thấy 1,5 tab ("Ôn thẻ", "Nhóm…"), ba tab còn lại bị khuất, không có dấu hiệu cuộn được. | `vi-390-first` |
| M3 | B | Cửa sổ app, mọi tab | Mobile vẫn hiện gạch đầu dòng, thanh "Thẻ 4 trên 29", hai nút "Cần ôn lại / Đã biết", ô dịch, ô "Lưu vào nhóm"… mà desktop đã bỏ. Cửa sổ dài ~730 px, gần cả màn hình thứ hai. | `vi-390-tab0` |
| M4 | B | Màn hình đầu | Màn hình đầu chỉ thấy tiêu đề, nút và mép trên cửa sổ; desktop thì thấy trọn ý "chữ + app". Không có hiệu ứng "section sau đè lên" như desktop. | `vi-390-first` |
| M5 | B | Bảng gói (`Plans`) ở 320–390 | Chữ "Miễn phí" ở đầu cột dính sát khung Pro; ở 320 tên dòng xuống 2 dòng gần như mọi hàng. Thứ tự: tiêu đề → nút Đăng ký → ghi chú → bảng, tức nút đứng trước khi người đọc thấy so sánh. | `vi-320-sec-goi` |
| M6 | B | Bộ chọn dạng bài (`ExerciseGallery`) | Dải chip cuộn ngang, chip thứ hai bị cắt giữa chữ ("Miễn"), không có dấu hiệu cuộn; 7 dạng nhưng người dùng chỉ thấy 1,5. Desktop là danh sách dọc. | `vi-390-sec-bai-tap` |
| M7 | B | Tiêu đề section | Chỉ 1/8 `h2` có `text-balance`: "Vì sao từ vựng nhanh bị / quên", "Nhiều dạng bài luyện / tập" để một chữ mồ côi. Tiêu đề hero ở 390 gãy 3 dòng "Học từ vựng / tiếng Anh, / ghi nhớ…". | `vi-390-sec-vi-sao`, `vi-390-first` |
| M8 | B | Biểu đồ quên (`WhyForget`) | Chữ trục (`fontSize="16"` trong `viewBox` 600) hiện ra cao 10 px; dưới mức đọc được trên điện thoại. | `vi-390-sec-vi-sao` |
| M9 | C | "Từ hay sai" (`ReviewTiming`) | Hai chip `arrive`, `leave` dính nhau: `gap-1.5` nhưng `ring-2` vẽ ra ngoài, khe thật còn ~2 px. | `vi-390-sec-on-lai` |
| M10 | C | Vùng bấm < 44 px | Nút đổi giao diện 38×38; link "Đăng nhập" trong hero cao 18; trang đăng nhập: "Quên mật khẩu?" cao 17. (Sửa 03/11: link footer đã cao 44 px; checkbox 13×13 ở trang đăng ký là ô input ẩn, vùng bấm thật là cả dòng chữ của nó; link điều khoản nằm giữa câu nên được miễn theo WCAG 2.5.8.) | `vi-390-bottom`, `login-390` |
| M11 | C | Cảm giác chạm (emil) | Chỉ `Button` có phản hồi khi nhấn (`active:translate-y-1`); tab cửa sổ, chip dạng bài, đáp án trắc nghiệm, mục FAQ không có. Chưa đặt `-webkit-tap-highlight-color`, nên Android hiện mảng xanh xám khi chạm, chồng lên vòng focus riêng. | — |
| M12 | C | Tablet 768 | Giống mobile: cửa sổ đầy đủ nội dung, cao, đổi tab cũng nhảy. | `vi-768-first` |

Đã kiểm, không có lỗi: không cuộn ngang; `hover:` của Tailwind 4 chỉ chạy trên thiết bị có chuột, nên không có hover "dính" khi chạm; hiệu ứng mở trang tắt đúng khi `prefers-reduced-motion`; FAQ, CTA cuối, footer và trang đăng nhập ổn ở 320–430.

## 3. Bốn quyết định cần bạn chọn

Theo quy ước của dự án, mình chỉ nêu các cách và cái giá của mỗi cách, không đánh dấu cách nào. Bạn trả lời, mình nói mình đồng ý hay khác ở đâu, rồi bạn chốt.

**Đã chốt (chủ dự án, 03/11/2026):** Q1 **a**, Q2 **a**, Q3 **c**, Q4 **a**. Chủ dự án chọn trước (qua bản phác các phương án); Claude đồng ý Q1, Q2, Q4. Ở Q3 Claude đề xuất b (chip xuống dòng, vì section là "nhiều dạng" và ô chọn có sẵn không hiện nhãn gói); chủ dự án giữ c. Với Q3 c, nhãn gói Pro được ghi trong chữ của lựa chọn.

**Q1. Cửa sổ app trên mobile/tablet (M1, M3, M4)**

| Cách | Trông ra sao | Cái giá |
|---|---|---|
| a | Như desktop: thu gọn (bỏ gạch đầu dòng, thanh tiến độ, nút phụ) **và** chỉ hiện ~3/4, section sau đè lên | Đồng bộ nhất; phải chọn chiều cao cắt riêng cho mobile, nội dung mỗi tab phải nằm gọn trên chỗ cắt |
| b | Thu gọn như desktop, nhưng hiện trọn cửa sổ (không cắt) | Đơn giản hơn; mất hiệu ứng "đè lên" |
| c | Giữ đủ nội dung như bây giờ, chỉ khóa chiều cao để hết nhảy | Ít thay đổi nhất; vẫn lệch desktop, cửa sổ vẫn dài |

Cả ba đều khóa một chiều cao chung cho mọi tab (sửa M1).

**Q2. Thanh tab của cửa sổ trên mobile (M2)**

| Cách | Trông ra sao | Cái giá |
|---|---|---|
| a | Bỏ logo; 5 tab chỉ còn icon, tab đang chọn hiện thêm chữ | Thấy đủ 5 tab; người dùng phải đoán icon của tab chưa chọn (vẫn có `aria-label`) |
| b | Bỏ logo; giữ chữ, cuộn ngang, mờ dần ở mép phải để báo còn tab | Giữ chữ; vẫn phải cuộn mới thấy "Tra từ", "Thêm từ mới" |
| c | Bỏ logo; tab xuống 2 hàng (3 + 2) | Thấy hết chữ; thanh cao gấp đôi, không còn giống thanh tab của app |

**Q3. Bộ chọn dạng bài trên mobile (M6)**

| Cách | Trông ra sao | Cái giá |
|---|---|---|
| a | Giữ dải chip cuộn ngang, thêm mép mờ và snap từng chip | Ít đổi; vẫn chỉ thấy 1–2 dạng một lúc |
| b | Chip xuống dòng (`flex-wrap`), thấy cả 7 | Thấy hết; khối chip cao ~4 hàng trước khi tới bài |
| c | Một ô chọn (`select`) "Dạng bài: Trắc nghiệm ▾" | Gọn nhất; mất cảm giác "thử nhiều dạng", phải bấm mới thấy danh sách |

**Q4. Thứ tự section Gói trên mobile (M5)**

| Cách | Thứ tự | Cái giá |
|---|---|---|
| a | Tiêu đề → bảng → nút Đăng ký → ghi chú dùng thử | Đọc so sánh trước rồi mới tới nút; nút xa tiêu đề hơn |
| b | Giữ như bây giờ: tiêu đề → nút → ghi chú → bảng | Nút thấy ngay; người đọc chưa biết hai gói khác nhau gì |

## 4. Plan (làm sau khi bạn chốt Q1–Q4)

Mỗi việc: test đỏ trước, sửa sau, như các vòng trước. Mọi test mobile chạy ở 320 và 390 trong `e2e/landing.spec.ts` (LR44 trở đi). Tất cả trên nhánh `feat/landing-redesign`, vào cùng PR #205.

1. **Cửa sổ app một chiều cao cho mọi tab** (M1, theo Q1). Test: chiều cao `#tinh-nang` bằng nhau qua 5 tab ở 320/390/768.
2. **Thu gọn / cắt cửa sổ trên mobile theo Q1** (M3, M4): đổi các `lg:hidden`, `lg:min-h-*`, `lg:max-h-*` sang mức áp dụng cả mobile, chỉnh chiều cao cắt. Test: không phần tử nào của tab nào nằm dưới chỗ cắt (mở rộng LR39 xuống 320/390).
3. **Thanh tab theo Q2** (M2). Test: cả 5 tab nằm trong thanh ở 320 (hoặc với Q2b: thanh cuộn được và có mép mờ).
4. **Bộ chọn dạng bài theo Q3** (M6). Test: ở 390 không chip nào bị cắt giữa chữ (với Q3b: cả 7 chip nằm trong khung).
5. **Bảng gói trên mobile** (M5, theo Q4): đầu cột "Miễn phí" không dính khung Pro, cột giá trị hẹp lại ở < `md`, thứ tự theo Q4. Test: ở 320 "Miễn phí" `scrollWidth ≤ clientWidth` và cách mép khung Pro ≥ 4 px.
6. **Tiêu đề không mồ côi** (M7): `text-balance` cho mọi `h2` của landing; chỉnh chỗ ngắt tiêu đề hero ở < `sm`. Test unit: mọi `h2` trong landing có class `text-balance`; e2e: dòng cuối của mỗi `h2` ở 390 dài hơn một chữ.
7. **Chữ biểu đồ đọc được** (M8): tăng cỡ chữ trục khi màn hẹp (đổi `viewBox` hoặc chữ HTML đặt chồng). Test: chữ trục cao ≥ 12 px ở 320.
8. **Khe chip "Từ hay sai"** (M9): tăng `gap` để khe thật ≥ 6 px. Test: khoảng cách giữa hai chip ≥ 6 px.
9. **Vùng bấm ≥ 44 px** (M10): nút đổi giao diện, link "Đăng nhập" hero, link footer, checkbox và link trên trang đăng ký, "Quên mật khẩu?" — nới vùng bấm bằng padding, không đổi cỡ chữ. Test: các phần tử này có hộp ≥ 44 px chiều cao ở 390.
10. **Phản hồi khi chạm** (M11, emil): `active:` scale 0.97 cho tab cửa sổ, chip dạng bài, đáp án, mục FAQ (chỉ `transform`, 120–160 ms, ease-out, tắt khi reduced motion); `-webkit-tap-highlight-color: transparent` ở `body` vì đã có vòng focus riêng. Test unit: các phần tử đó có class `active:`; không có test hình.
11. **Kiểm lại và ghi nhận**: chạy đủ lint, typecheck, unit, e2e landing/a11y/chrome; chụp lại 8 ảnh `vi-<w>-<light|dark>.jpg`; cập nhật `docs/deliveries/landing-redesign.md` (gồm cả các thay đổi desktop chưa ghi); push vào PR #205, đợi CI xanh.

## 5. Chưa kiểm

- Chưa thử trên điện thoại thật (iOS Safari, Android Chrome); chỉ giả lập Chromium. Thanh địa chỉ co giãn, vùng tai thỏ và cuộn quán tính chỉ thấy trên máy thật.
- Chưa đo ở chế độ tối từng section (chỉ có một ảnh toàn trang tối ở 390 trong scratchpad).
- Trang `/en` chuyển về `/vi`, nên không đo riêng.
