# Khảo sát cho GM14–GM18 (giao diện mới) — 09/11/2026

Năm đề xuất chưa chốt ở `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md` §2. Mọi nguồn đọc ngày **09/11/2026**.
`[S#]` trỏ tới bảng nguồn cuối file; `[M]` là phép đo chạy trong phiên này; `[R]` là sự thật đọc từ repo. Tài liệu chỉ khảo sát,
không sửa code hay design.

| # | Kết luận ngắn | Hướng |
|---|---|---|
| GM14 | Thời lượng và đường cong nằm trong khung khuyến nghị; chi phí thật nằm ở `blur` | Ủng hộ, kèm điều kiện về bán kính mờ và đo trên máy yếu |
| GM15 | Các design system đều dùng một chuyển động cho một loại thành phần, ra nhanh hơn vào; code đã có một `Dialog` chung | Ủng hộ, ghi thêm số lúc ra |
| GM16 | Tham số URL + `history.pushState` hợp với app CSR hơn intercepting routes; cần luật cho link mở thẳng | Ủng hộ, thêm 3 luật |
| GM17 | App cùng loại và nghiên cứu cho ra một bố cục chung; màn Ôn đã chạy trên khung Phiên luyện | Ủng hộ, thu hẹp còn 3 khung |
| GM18 | 800 không tốn thêm byte; rủi ro là line-height 1,0–1,08 của tiêu đề với dấu chồng | Ủng hộ, kèm luật line-height |

## GM14 — Lấy số motion của giao diện mới

- **Thời lượng.** NN/g: phần lớn animation 100–500ms, thường 100–400ms; modal 200–300ms; trên 500ms bắt đầu "a real drag"; càng hay
  gặp thì càng ngắn [S1]. M3: `medium2` 300ms, `long2` 500ms [S4]. Carbon: `moderate-02` 240ms cho "expansion, system communication,
  toast" [S6]. Lật 300ms, hộp 240ms, tấm trượt 240ms đều nằm trong khung.
- **Màn tổng kết.** Mỗi khối 520ms đã vượt mốc 500ms của NN/g [S1]; tổng = 520 + (N−1)·90ms, ví dụ 5 khối là 880ms. Apple: "Let
  people cancel motion", không bắt người dùng chờ animation xong mới làm được việc [S5].
- **Đường cong.** Ba đường cũ trong code trùng đúng token M3: `--ease-standard` = standard `(0.2,0,0,1)`, `--ease-enter` = emphasized
  decelerate `(0.05,0.7,0.1,1)`, `--ease-exit` = emphasized accelerate `(0.3,0,0.8,0.15)` [S4][R]. Đường mới `(0.23,1,0.32,1)` cùng họ
  "ra nhanh, chậm dần" với emphasized decelerate và Carbon entrance `(0,0,0.3,1)` [S6]: đổi là đổi phong cách, không trái hướng dẫn. Lệch
  nhỏ: Carbon dùng đường standard cho vật hiện suốt chuyển động (thẻ khi lật) [S6]; landing đã lật 320ms với đường mới [R].
- **Giảm chuyển động.** WCAG 2.3.3 ở mức **AAA**: "Motion animation triggered by interaction can be disabled, unless the animation is
  essential…" [S2]. Kỹ thuật C39: bật cài đặt giảm chuyển động, animation không thiết yếu phải bị tắt [S3]. MDN: phóng to và lia vật lớn
  là tác nhân tiền đình; ví dụ thay bằng đổi opacity; Baseline từ 01/2020 [S7]. Tài liệu motion §8 (chỉ giữ opacity ≤ 200ms, bỏ blur)
  khớp hướng này.
- **Chi phí `filter: blur()`.** GPU blur bằng convolution, "the bigger the blur radius, the more costly"; phần tử blur đã nâng lớp vẫn bị
  blur lại mỗi khung hình và có thể vượt 16ms [S8]. Matt Perry (05/11/2025): blur được tăng tốc phần cứng "but that doesn't make it
  free"; Framer cảnh báo blur trên 10px; Safari dùng Core Animation, tính năng không hỗ trợ có thể âm thầm về main thread [S9]. Wordmet
  dùng 18px (thẻ tan), 10–12px (thẻ tới), và chồng thẻ có 3 thẻ blur 5/9/12px cùng đổi `filter` khi đổi tầng [R].
- **Chi phí `backdrop-filter`.** Baseline 2024 (từ 09/2024), máy cũ có thể không hỗ trợ [S11]. Bug Mozilla 1732817 (còn mở, mức S3):
  thanh cố định có `backdrop-filter` làm Firefox Android vẽ lại cả trang mỗi lần cuộn; có báo cáo máy Android yếu bị chậm cuộn trên
  m.youtube.com [S12]. Thanh trên của app dùng `blur(24px) saturate(1.6)` trên mọi màn [R].
- **Cách giảm có nguồn.** Giảm bán kính và kích thước lớp [S8][S9]; thay việc animate bán kính bằng vài bản blur dựng sẵn rồi chuyển
  `opacity` [S8]; nâng lớp cho phần tử cha thay vì phần tử bị blur [S8]; `will-change` chỉ dùng khi đã thấy vấn đề và gỡ sau [S10]; đo
  trên máy thật vì GPU máy tính "deceptively powerful" [S8].
- **Nút bấm.** `scale(.97)` và lún `translate` 0,18rem đều là transform, chạy ở compositor [S10]: khác phong cách, không khác chi phí.

**Nói gì cho đề xuất này:** ủng hộ phần thời lượng và đường cong. Thêm ba điều kiện: (1) trần blur khi chuyển cảnh trên điện thoại khoảng
10–12px, hoặc thay 18px bằng `opacity` + `scale`; (2) màn tổng kết cho bấm nút ngay từ đầu, hoặc rút mỗi khối còn ≤ 400ms; (3) đo một
phiên Ôn 20 thẻ trên Android tầm thấp và Safari iOS (DevTools Performance, CPU 4–6×) trước khi chốt.

**Rủi ro:** chưa đo khung hình trên máy thật nào; blur 18px chưa có số đo; lỗi Firefox Android với thanh kính mờ chưa có bản sửa.

## GM15 — Mọi hộp thoại và tấm trượt dùng chung chuyển động

- **Code đã thống nhất** [R]: 16 file hộp thoại và tấm trượt đều dùng `app-ui/Dialog.tsx` (React Aria `ModalOverlay`) với một cặp
  `dialog-in/out`, `sheet-in/out`. GM15 chỉ đổi số ở một chỗ.
- Material: mẫu "fade" dùng cho dialog, menu, snackbar, FAB; vào 150ms, ra 75ms. Chọn mẫu theo quan hệ giữa phần tử: shared axis cho
  quan hệ không gian hoặc điều hướng. Container transform vào 300ms, ra 250ms [S4].
- NN/g: vào lâu hơn ra một chút (ví dụ hiện 300ms, tắt 200–250ms); ease-out khi vào, ease-in khi ra [S1].
- Carbon: đường exit tăng tốc khi rời màn; checklist hỏi "Do related movements have a unified relationship with each other?" [S6].
  Fluent: nguyên tắc "Consistent"; mẫu vào/ra "commonly used for menus, dialogs" [S13]. Apple: motion tạo trải nghiệm "familiar and
  consistent" [S5]. Không nguồn nào đã đọc khuyên mỗi hộp một chuyển động riêng.
- Ngoại lệ hợp lý: Lịch → Ngày trượt ngang ±22px là quan hệ điều hướng, đúng kiểu shared axis [S4][R].
- React Aria: `ModalOverlay` có `isEntering`, `isExiting` và `onExit` trả promise [S14]. Docs không nói hộp phải còn được render (điều
  khiển bằng `isOpen`) thì hiệu ứng ra mới chạy: **ASSUMPTION**, kiểm khi code. Điểm này nối với GM16: bỏ tham số URL không được gỡ
  component ngay.

**Nói gì cho đề xuất này:** ủng hộ. GM15 hiện chỉ nêu số lúc vào; ghi thêm số lúc ra vào design §8.2, đề xuất giữ như code: lớp mờ 150ms,
hộp và tấm trượt 150ms với đường accelerate.

**Rủi ro:** thấp, đổi một file. Chưa kiểm hiệu ứng ra khi đóng bằng nút Quay lại.

## GM16 — Hộp Lịch và Ngày mở theo tham số URL

- **Intercepting + parallel routes** (docs Next cập nhật 15/10/2026): URL chia sẻ được, refresh giữ ngữ cảnh, Back đóng, Forward mở lại
  [S15]. Nhưng khi refresh hoặc mở link, route **không** bị chặn: hiện trang đầy đủ thay cho modal [S16]. Cần `default.js` trả `null`,
  slot catch-all để đóng khi sang trang khác, và một slot động kéo mọi slot cùng cấp thành động [S15]. Với Wordmet nghĩa là thêm trang
  `/app/lich/[thang]` đầy đủ, Figma không có khung này.
- **Tham số URL:** từ Next 14.1 (18/01/2024), `window.history.pushState`/`replaceState` nối vào router, `usePathname` và
  `useSearchParams` cập nhật theo [S19]; docs hiện tại (06/11/2026) giữ nguyên [S18].
- `useSearchParams` trên route dựng sẵn: cây client tới `Suspense` gần nhất chạy ở client; build production lỗi "Missing Suspense
  boundary" nếu thiếu, lúc dev có thể không lỗi [S17].
- `router.push`/`Link` đổi tham số là một lần điều hướng (page nhận `searchParams` mới) [S17]; `pushState` thì không [S18]. Lần điều hướng
  đó có gọi server không với route của Wordmet: **ASSUMPTION**, xem tab Network khi code.
- **Kỳ vọng người dùng.** NN/g (18/09/2022): mọi overlay, kể cả bottom sheet, đóng được bằng cả nút Đóng và Back/cử chỉ; tránh overlay
  chồng overlay [S20]. Baymard (20/07/2020): phần lớn overlay ở các site được thử không đóng khi bấm Back; khuyên `history.pushState()`
  cho mọi view người dùng coi như trang mới [S21].
- **Sản phẩm thật:** GitHub Projects cho deep link mở một issue trong side panel (05/01/2023) [S22]; ví dụ nextgram của Next [S15].
  Google Calendar, Linear, Airbnb: không tìm được nguồn chính thức, **ASSUMPTION**, không dùng làm căn cứ.
- **Riêng tư:** Referrer-Policy mặc định `strict-origin-when-cross-origin` chỉ gửi origin sang site khác [S23], nên `?ngay=` không lộ qua
  Referer. Script chạy trên trang (AdSense được nạp ở `/app` từ đợt B M4 [R]) vẫn đọc được URL đầy đủ (suy luận). Ngày học ít nhạy cảm;
  không đưa tên nhóm hay từ vào URL.

**Nói gì cho đề xuất này:** ủng hộ tham số URL thay intercepting routes: không cần trang Lịch đầy đủ, refresh vẫn hiện hộp trên màn đang
đứng, hợp CSR (GM8). Thêm ba luật vào design §5.6:

1. Đổi tháng hay lọc trong hộp Lịch dùng `replaceState`, để Back đóng hộp thay vì lùi từng tháng. Baymard khuyên ngược lại cho lọc
   danh sách trên trang [S21], nên đây là một lựa chọn cần chủ dự án chốt.
2. Nút đóng và Esc chỉ gọi `history.back()` khi hộp được mở bằng `pushState` trong phiên (đánh dấu ở `history.state`); mở từ link hoặc
   sau refresh thì `replaceState` bỏ tham số. Không vậy thì đóng hộp sẽ rời app (nextgram đóng bằng `router.back()` [S15]).
3. Dòng "có cả `?lich=` và `?ngay=` → Quay lại về Lịch" chỉ đúng khi app tự chèn mục lịch sử lúc mở link: `replaceState` thành `?lich=`,
   rồi `pushState` `?ngay=`.

**Rủi ro:** hiệu ứng ra khi bấm Back (GM15); chưa có test e2e cho Back/Forward.

## GM17 — Vẽ mockup màn Ôn (nhớ lại) trước khi code

- **Hiện trạng** [R]: `/app/recall` chạy trên màn Phiên luyện (`RecallSession.tsx` → `PracticeSession`): ô gõ + "Kiểm tra", gõ sai làm lại
  có đếm lần, gợi ý 3 bậc (phím H), "Xem đáp án", nút "Cần ôn lại"; câu trắc nghiệm `mcq_definition` xen kẽ.
- **Anki:** ô gõ nằm trong thẻ; Enter hoặc lật thì so; phần đã gõ và đáp án đặt thẳng hàng bằng font monospace, tô đúng/sai/thiếu
  (`typeGood`, `typeBad`, `typeMissed`); người học vẫn tự chấm; tùy chọn bỏ qua hoa/thường (`ci`) và dấu (`nc`); chỉ một dòng [S24].
- **Duolingo Flashcards** (18/11/2025): thẻ hiện từ bằng tiếng của người học; nói hoặc gõ; "typos and almost-right pronunciations still
  count"; sai thì thẻ lật, hiện từ đúng, phát âm, rồi về cuối chồng; cần 3 lần đúng; cuối có tổng kết [S25].
- **Duolingo báo lỗi** (29/03/2022): "My answer should have been accepted" chiếm 72% báo cáo, khoảng 15% được nhận [S26]. Độ chặt khi chấm
  câu gõ là chỗ người học vấp nhiều nhất.
- **Quizlet, Memrise:** Learn trộn trắc nghiệm và câu viết, người học chọn loại câu, Write đã gộp vào Learn [S27]; Memrise gõ bằng bàn
  phím chữ cái trong app [S28]. Cả hai trang trợ giúp trả 403, chỉ thấy đoạn trích trong kết quả tìm: **ASSUMPTION**.
- **Nghiên cứu.** Phản hồi sau câu sai tăng điểm sau 1 tuần thêm 494%; sau câu đúng gần như không đổi [S29]. Có phản hồi thì câu trả lời
  ngắn (gõ) cho kết quả tốt nhất sau 3 ngày [S30]. Smith & Karpicke (4 thí nghiệm, N = 372): gõ hầu như không hơn trắc nghiệm, trừ khi tỉ
  lệ nhớ ra lúc luyện được nâng lên [S31]. Nakata: gõ ra từ tốt nhất cho chính tả; nhận diện tốt hơn cho nối nghĩa với từ; gõ làm điểm lúc
  luyện thấp hơn [S32].
- **Bố cục chung rút ra:** nghĩa ở trên, ô gõ ngay dưới và tự focus, Enter để kiểm; sai thì hiện đáp án ngay kèm phát âm; so chữ đã gõ với
  đáp án; gợi ý theo bậc để nâng tỉ lệ nhớ ra; tiến độ "câu n / N".

**Nói gì cho đề xuất này:** ủng hộ có mockup, nhưng thu hẹp, vì Phiên luyện đã có khung Figma (`178:5326`, `178:5546`, `178:5755`). Chỉ
vẽ phần khác: (1) câu gõ từ theo nghĩa (prompt là nghĩa tiếng Việt, không nhãn AI); (2) kết quả sai có so chữ kiểu Anki và nút "Cần ôn
lại"; (3) màn xong phiên Ôn (4 ô số của đợt C §4.4). Câu cần chốt khi vẽ: có nhận lỗi gõ nhỏ như Duolingo không (luật hiện tại: đúng ở lần
cuối, không gợi ý).

**Rủi ro:** Quizlet, Memrise chưa xác minh; các nghiên cứu làm trên lớp học và từ vựng ngoại ngữ, không phải trên app này.

## GM18 — Bricolage 800 cho tiêu đề và số lớn

- Bricolage Grotesque: trục `opsz` 12–96 (mặc định 14), `wdth` 75–100 (mặc định 100), `wght` 200–800 (mặc định 400); có bộ
  `vietnamese` [S33][S34]. 800 là mức đậm nhất.
- **Byte** (HEAD tới `fonts.gstatic.com`, bản v9, woff2) [M][S35]:

  | Yêu cầu tới Google Fonts | latin (byte) | vietnamese (byte) |
  |---|---|---|
  | tĩnh 700 | 22.384 | 5.108 |
  | tĩnh 800 | 21.844 | 5.060 |
  | biến thiên chỉ `wght` (khoảng 200..800, 400..700, 400..800 đều trả **cùng một file**) | 41.344 | 8.608 |
  | `opsz` + `wght` | 76.888 | 12.984 |
  | `opsz` + `wdth` + `wght` | 131.548 | 22.028 |

  Khi đã dùng file biến thiên, thêm 800 không tốn byte nào.
- `next/font` mặc định chỉ lấy trục weight "to keep the file size down"; trục khác thêm bằng `axes` [S36]. Design §5.8 ghi "biến thiên
  opsz, wdth, wght": nếu code bật `axes: ['opsz', 'wdth']` thì file latin nặng gấp khoảng 3,2 lần.
- Không có trục `opsz`, tiêu đề 40px dùng hình chữ của cỡ mặc định 14 (suy ra từ mặc định ở [S34]). MDN: optical sizing bật mặc định với
  font có trục `opsz`; chữ lớn được vẽ "more delicately" [S41]. Figma có tự đổi `opsz` theo cỡ chữ không: **ASSUMPTION**; so ảnh Figma với
  trình duyệt ở M1 rồi mới chốt `axes`.
- **Hướng dẫn kiểu chữ:** Apple cho bậc nhấn "medium, semibold, bold, or heavy" và khuyên tránh nét mảnh [S37]; Material 3 dùng Regular
  cho Display và Headline [S38]. Tiêu đề 800 là lựa chọn thương hiệu, không trái nguồn nào đã đọc.
- **Dấu chồng:** Google Fonts đặt ascender của font theo "Ắ" và khuyên dấu chồng "not too high or heavy" [S40][S39].
- **Đo dấu chồng** (canvas trong trình duyệt nhân Chromium, cỡ 100px, Bricolage tải từ Google Fonts) [M]: ascent/descent của font
  0,93/0,27em. Chữ thường cao nhất "ẩ": 0,87em ở 400, 0,93em ở 800; chữ hoa "Ẩ": 1,02 → 1,06em; dấu nặng của "ặ" xuống 0,16 → 0,20em;
  "g", "y" 0,16em. Hệ quả:
  - tiêu đề hai dòng có thể chạm nhau khi khoảng cách hai dòng dưới 0,93 + 0,20 = 1,13em (ở 800). Mockup vòng 15 dùng line-height 1,0 và
    1,08 cho tiêu đề 40–42px đậm 800 [R];
  - với `overflow: hidden` hay `line-clamp` ở line-height 1,08, đỉnh "ẩ" bị cắt khoảng 0,06em (khoảng 2,5px ở 42px);
  - độ đậm 800 làm dấu cao thêm khoảng 0,06em; line-height ảnh hưởng nhiều hơn độ đậm.
- **Giãn chữ −0,03em ở 800** [M]: móc của "ư", "ự" vừa chạm "t", "n" (4–7 px trên khoảng 2.270 px mực ở cỡ 100px; đối chứng: −0,10em cho
  62 px, "nn" cho 0). Chạm sợi tóc, không làm mất chữ.

**Nói gì cho đề xuất này:** ủng hộ sửa luật thành "Noto Sans 400/600/700; Bricolage 700/800 cho tiêu đề và số lớn". Thêm luật: tiêu đề tiếng
Việt có thể xuống dòng dùng line-height ≥ 1,15 (an toàn là 1,2); 1,0 và 0,85 chỉ cho số và tiêu đề một dòng; không dùng `overflow: hidden`
hay `line-clamp` trên tiêu đề nếu không có `padding-block`. Chốt `axes` ở M1.

**Rủi ro:** đo bằng `measureText` của canvas, không phải layout DOM, không áp `opsz` theo cỡ; chưa thử Safari, chưa xem trên màn hình thật.

## Nguồn

Tất cả đọc ngày 09/11/2026.

| # | Nguồn | Ghi chú |
|---|---|---|
| S1 | https://www.nngroup.com/articles/animation-duration/ | Laubheimer, 09/02/2020 |
| S2 | https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/animation-from-interactions.html | Bản nguồn của W3C; trang w3.org trả 403 |
| S3 | https://raw.githubusercontent.com/w3c/wcag/main/techniques/css/C39.html | Kỹ thuật C39 |
| S4 | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md | Token M3; m3.material.io không đọc được (trang chỉ có JS) |
| S5 | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json | Dữ liệu của trang HIG Motion |
| S6 | https://carbondesignsystem.com/elements/motion/overview/ | |
| S7 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | |
| S8 | https://developer.chrome.com/blog/animated-blur/ | Surma; trang không ghi ngày |
| S9 | https://motion.dev/magazine/web-animation-performance-tier-list | Matt Perry, 05/11/2025 |
| S10 | https://web.dev/articles/animations-guide | |
| S11 | https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter | |
| S12 | https://bugzilla.mozilla.org/show_bug.cgi?id=1732817 | Còn mở |
| S13 | https://fluent2.microsoft.design/motion | |
| S14 | https://react-aria.adobe.com/Modal | |
| S15 | https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes | lastUpdated 15/10/2026 |
| S16 | https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes | lastUpdated 15/10/2026 |
| S17 | https://nextjs.org/docs/app/api-reference/functions/use-search-params | lastUpdated 06/11/2026 |
| S18 | https://nextjs.org/docs/app/getting-started/linking-and-navigating | Mục "Native History API", 06/11/2026 |
| S19 | https://nextjs.org/blog/next-14-1 | 18/01/2024 |
| S20 | https://www.nngroup.com/articles/accidental-overlay-dismissal/ | 18/09/2022 |
| S21 | https://baymard.com/blog/back-button-expectations | 20/07/2020 |
| S22 | https://github.blog/changelog/2023-01-05-github-issues-january-5th-update/ | |
| S23 | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy | |
| S24 | https://docs.ankiweb.net/templates/fields.html | Mục "Checking Your Answer" |
| S25 | https://blog.duolingo.com/duolingo-flashcards/ | 18/11/2025 |
| S26 | https://blog.duolingo.com/how-user-reports-improve-course-content/ | 29/03/2022 |
| S27 | https://help.quizlet.com/hc/en-us/articles/360030986971-Studying-with-Learn | 403; chỉ có đoạn trích tìm kiếm, ASSUMPTION |
| S28 | https://memrisebeta.zendesk.com/hc/articles/4578351044625 | 403; chỉ có đoạn trích tìm kiếm, ASSUMPTION |
| S29 | https://www.yorku.ca/ncepeda/publications/PCWR2005.html | Pashler và cộng sự 2005, JEP:LMC 31 |
| S30 | https://doi.org/10.1080/09541440601056620 | Kang, McDermott, Roediger 2007; đọc tóm tắt ở bản PDF https://www.gwern.net/docs/spaced-repetition/2007-kang.pdf |
| S31 | https://doi.org/10.1080/09658211.2013.831454 | Smith & Karpicke 2014; đọc tóm tắt ở https://learninglab.psych.purdue.edu/downloads/2014/2014_Smith_Karpicke_Memory.pdf |
| S32 | https://ir.wgtn.ac.nz/items/5278988f-b1f8-472a-8a79-774d9d5c6842/full | Luận án Nakata 2013; bài IRAL 2016 (DeGruyter) trả 405 |
| S33 | https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/METADATA.pb | |
| S34 | https://fonts.google.com/metadata/fonts | Giá trị mặc định của trục |
| S35 | https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400..800 | Và các biến thể trục; kích thước lấy bằng HEAD tới fonts.gstatic.com |
| S36 | https://nextjs.org/docs/app/api-reference/components/font | lastUpdated 24/09/2026 |
| S37 | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json | |
| S38 | https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md | |
| S39 | https://googlefonts.github.io/gf-guide/diacritics.html | |
| S40 | https://googlefonts.github.io/gf-guide/metrics | |
| S41 | https://developer.mozilla.org/en-US/docs/Web/CSS/font-optical-sizing | |

**Repo `[R]`:** `docs/mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md` §1–§9; `vong-15-polish-9-trang.html` (line-height
tiêu đề); `apps/web/src/app-ui/Dialog.tsx` và 16 file dùng nó; `apps/web/src/features/learner/recall/RecallSession.tsx`,
`practice/session/TypeWordQuestion.tsx`, `HintPanel.tsx`; `CLAUDE.md` (AdSense ở `/app`, đợt B M4).

**Phép đo `[M]`:** `measureText` và đếm pixel chồng nhau trên canvas trong Browser pane của Claude, font tải từ Google Fonts (CSS2 đủ ba
trục); đối chứng: hai font khác nhau cho ascent khác nhau (Bricolage "H" 0,66em, Noto Sans 0,72em), `document.fonts.check` trả `true`.

**Không mở được:** w3.org Understanding 2.3.3 (403), m3.material.io (chỉ có JS), trang trợ giúp Quizlet và Memrise (403), bài kỹ thuật của
Quizlet trên Medium (mất kết nối), bài IRAL 2016 của Nakata (405), trang Knowledge của Google Fonts (chỉ có JS). Không tìm được nguồn chính
thức cho cách Google Calendar, Linear, Airbnb đặt trạng thái hộp thoại trên URL.
