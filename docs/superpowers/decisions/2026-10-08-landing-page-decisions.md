# Decisions — Landing page Wordmet

Ngày: 08/10/2026. Đi kèm design doc
[`../specs/2026-10-08-landing-page-design.md`](../specs/2026-10-08-landing-page-design.md) và context
[`../../preparation/LANDING_PAGE_CONTEXT_2026-10-07.md`](../../preparation/LANDING_PAGE_CONTEXT_2026-10-07.md).
File này gom các quyết định đã chốt trong lúc brainstorm (07–08/10/2026). Mỗi quyết định gồm các phương án đã đưa ra
trong chat, trade-off của từng phương án và câu trả lời của chủ dự án.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trực tiếp trong chat. "Yêu cầu" = chủ dự án tự nêu,
không có phương án để chọn. "Duyệt cùng design" = trợ lý đề xuất, chờ chủ dự án duyệt cùng design doc.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| L1 | Việc chính của trang | Giới thiệu sản phẩm, dùng lâu dài trên production | Chủ dự án |
| L2 | Ngôn ngữ | Đổi được Anh–Việt | Chủ dự án |
| L3 | Đối tượng | Người tự học từ vựng nói chung | Chủ dự án |
| L4 | Tên | Wordmet | Chủ dự án |
| L5 | Ghi đè cookie giữa `app.` và `admin.` | Tách host `admin-api.` | Chủ dự án |
| L6 | Email | Resend + Cloudflare Email Routing (tạm) | Chủ dự án |
| L7 | Ngôn ngữ mặc định ở `/` | Theo vị trí, chỉ chuyển ở `/` | Chủ dự án |
| L8 | Bố cục subdomain | `<domain>` / `app.` / `admin.` / `api.` | Chủ dự án |
| W1 | Thời điểm làm landing | Trước Bước 2 | Chủ dự án |
| W1b | Bài mẫu đầu trang | 2–3 bài bấm thử được | Chủ dự án |
| W2 | Thư viện i18n | next-intl | Chủ dự án |
| W3 | Phạm vi form email | UI + Server Action, chưa nối Resend | Chủ dự án |
| W4 | Cách đồng ý chính sách | Ô tick bắt buộc | Chủ dự án |
| W5 | Test | Vitest + Playwright | Chủ dự án |
| W6–W9 | Tách component, hạn chế giá trị raw, ưu tiên SSR, metadata | Như yêu cầu | Yêu cầu |
| W10–W14 | Chuyển động không thư viện, FAQ `<details>`, scroll-snap, token tương phản, `noindex` trước ra mắt | Đề xuất | Duyệt cùng design |
| W15 | Đơn vị | rem, `clamp()`, bề rộng tối đa/tỉ lệ, không chiều cao cố định | Chủ dự án |
| W16 | Plugin `design` | `ux-copy`, `design-system`, `accessibility-review`, `design-critique` | Chủ dự án |

## L1 — Việc chính của trang

| Phương án | Trade-off |
|---|---|
| Tuyển người thử pilot | Nút chính là đăng ký dùng thử, khớp pilot 10–30 người; vẫn đủ điều kiện domain cho Claude Startups |
| Chủ yếu để nộp Claude Startups | Viết cho người duyệt; ít chú trọng thu hút người dùng |
| Cả hai ngang nhau | Trang dài hơn, phục vụ hai kiểu người đọc |
| ✅ Giới thiệu và tập trung vào sản phẩm (chủ dự án tự nêu) | Trang là cửa vào lâu dài, tận dụng để đưa sản phẩm lên production |

## L2 — Ngôn ngữ của trang

| Phương án | Trade-off |
|---|---|
| Tiếng Việt + bản tiếng Anh | Người học đọc bản chính, người duyệt nước ngoài đọc `/en`; tốn công viết 2 lần |
| Chỉ tiếng Việt | Gọn nhất; người nước ngoài không đọc được |
| Chỉ tiếng Anh | Một bản; kém gần gũi với người Việt |
| ✅ Đổi được Anh–Việt (chủ dự án tự nêu) | Như phương án đầu, có nút chuyển |

## L3 — Đối tượng

| Phương án | Trade-off |
|---|---|
| Sinh viên luyện thi chứng chỉ | Hẹp, thông điệp sắc; mới là giả thuyết |
| Sinh viên học tiếng Anh nói chung | Rộng hơn; dễ chung chung |
| ✅ Người tự học từ vựng nói chung | Rộng nhất; khó nổi bật so với Duolingo/Quizlet, phải dựa vào điểm khác biệt |

## L4 — Tên sản phẩm

Vòng 1 (07/10): để placeholder ✅. Vòng 2 (08/10): trợ lý tra khoảng 70 tên bằng RDAP và tìm trùng tên trên web.

| Phương án | Trade-off |
|---|---|
| Gapword | Chơi chữ "gap"/"gặp"; chỉ còn `.app`, `.com` đã có chủ |
| Vocagap | Còn `.com`; dễ nhầm với VOCA.VN |
| ✅ Wordmet | Còn cả `.com` và `.app`; người Việt có thể đọc *met* thành "mệt" |
| Tìm hướng khác | — |

Chủ dự án tạm hoãn ở lần hỏi đầu ("từ từ mình nghĩ sau"), sau đó chọn Wordmet. Domain: chủ dự án bỏ qua, chưa chốt
`.com`/`.app` (trợ lý đề xuất `.com`).

## L5 — Chống ghi đè cookie giữa `app.` và `admin.`

| Phương án | Trade-off |
|---|---|
| ✅ A. Host API riêng `admin-api.` | Cookie host-only tách tự nhiên; không đổi code identity; thêm 1 hostname, TLS, CORS |
| B. Tên cookie theo `Origin` | Một host; sửa `session-transport.ts`, tiêu chí B1#21 và test |
| C. Path cookie theo client | Không phụ thuộc header; nhân đôi endpoint auth |
| D. BFF (server Next giữ cookie) | Tách hoàn toàn; đổi kiến trúc Bước 1 |
| E. Frontend phát hiện đổi tài khoản (dùng kèm) | Rẻ; chỉ phát hiện, không ngăn. Vẫn là đề xuất |

## L6 — Email

| Việc | Phương án | Trade-off |
|---|---|---|
| Gửi thư | ✅ Resend gửi từ domain | Gói free 100 email/ngày; cần SPF/DKIM |
| Lưu danh sách | ✅ Contact list của Resend | Không cần deploy API; Resend là bên xử lý dữ liệu |
| Hộp thư domain | ✅ Cloudflare Email Routing | Miễn phí; chỉ nhận, không gửi |
| (đã loại) | SMTP Gmail cá nhân | Giới hạn chưa có nguồn; thư không gắn domain |

Chủ dự án: "tạm chấp nhận". W3 hoãn việc nối Resend vào code.

## L7 — Ngôn ngữ mặc định ở `/`

| Phương án | Trade-off |
|---|---|
| A. `/` tiếng Việt, `/en` tiếng Anh, có nút đổi | Đúng người dùng chính, đúng khuyến nghị Google; người nước ngoài thấy tiếng Việt trước |
| B. Tự chuyển theo ngôn ngữ trình duyệt | Ngược khuyến nghị Google |
| C. `/` tiếng Anh | Ngược đối tượng chính |
| ✅ D. Theo vị trí, chỉ tự chuyển ở `/` | Đúng ý chủ dự án (Việt Nam → VI, nơi khác → EN); `/vi`, `/en` cố định; `/` là `x-default` |

## L8 — Bố cục subdomain

Trợ lý đề xuất `<domain>` + `api.<domain>`, web app tùy chọn. ✅ Chủ dự án đề xuất `<domain>` (landing), `app.`
(web app), `admin.` (quản trị). Trợ lý xác nhận đạt D13 của Bước 1 (cùng tên miền gốc).

## W1 — Thời điểm làm landing

| Phương án | Trade-off |
|---|---|
| ✅ Làm trước Bước 2 | Có domain, hosting, CI deploy sớm; Bước 2 lùi vài ngày |
| Song song Bước 2 | Hai luồng việc, dễ chuyển ngữ cảnh khi làm một mình |
| Chỉ thiết kế, code sau | Có spec và plan ngay, code khi có tên hoặc tới Bước 3 |

## W1b — Bài mẫu ở đầu trang

| Phương án | Trade-off |
|---|---|
| ✅ 2–3 bài viết sẵn, bấm thử được | Chạy trên trình duyệt; thay được ảnh màn hình khi chưa có app |
| Một bài tĩnh | Ít code nhất |
| Không, chỉ chữ + nút | Gọn nhất; thiếu thứ cho xem sản phẩm |

Các vòng sau trên Figma: thêm câu hướng dẫn (chủ dự án đề xuất "Nhấn để chọn đáp án chính xác"; sau khi Codex sửa
trang ngày 08/10, Figma ghi "Chọn đáp án đúng"); dải vuốt card phóng to card đang chọn
(chủ dự án chọn "cả card bài mẫu" giữa ba cách hiểu: cả card / chỉ chấm chỉ vị trí / cả card và áp dụng cho 3
bước); thêm nút ‹ ›; desktop cũng dùng dải card.

## W2 — Thư viện i18n

| Phương án | Trade-off |
|---|---|
| Tự làm theo docs Next (`[lang]` + từ điển có kiểu) | Không thêm thư viện; đủ cho landing ít chữ |
| ✅ next-intl 4.14 | Có số nhiều, định dạng, dùng lại cho app sau; thêm phụ thuộc và cấu hình |

## W3 — Phạm vi form email

| Phương án | Trade-off |
|---|---|
| ✅ UI + Server Action, chưa nối Resend | Đủ 7 trạng thái, kiểm trên server, cổng lưu có bản giả; nối Resend khi có domain và deploy |
| Nối Resend luôn | Lưu email thật; cần API key |

## W4 — Đồng ý chính sách bảo mật

Hai bản dựng trên Figma để so sánh ("làm thử 2 bản đi").

| Phương án | Trade-off |
|---|---|
| ✅ B. Ô tick bắt buộc | Rõ ràng nhất về việc chủ động đồng ý; thêm một thao tác. An toàn hơn với Luật BVDLCN là `ASSUMPTION` |
| A. Dòng chữ dưới form | Ít bước; đồng ý ngầm khi bấm nút |

Vòng 2 (08/10): sau khi Codex sửa trang, form ở Hero trên Figma không có phần đồng ý, Final CTA dùng bản A. Trợ lý hỏi
lại W4. Chủ dự án: giữ ô tick ở cả hai form, "thiết kế thêm giúp mình trong UI luôn, không cần sửa Figma". Chữ phản hồi
cho câu mẫu 2 và 3: trợ lý viết, chủ dự án duyệt lúc review ("ok").

## W5 — Test

| Phương án | Trade-off |
|---|---|
| ✅ Vitest + Playwright | Logic và component bằng Vitest; luồng thật và accessibility bằng Playwright + axe |
| Chỉ Vitest | Nhanh hơn; không kiểm được trên trình duyệt thật |

## W6–W9 — Yêu cầu của chủ dự án (08/10)

Nguyên văn yêu cầu: không viết component trực tiếp trong page; Tailwind hạn chế giá trị raw; ưu tiên SSR, chỉ dùng
CSR khi cần hook; tối ưu metadata của Next.js; dựa trên mockup Figma và best practice UI. Không có phương án thay thế
được đưa ra.

## Các quyết định trên Figma (07–08/10), không phải code

Bỏ phần founder. Hai card gói cao bằng nhau. Rút gọn chữ. Tiêu đề không có dấu chấm cuối, tiêu đề hai vế thì xuống
dòng. Card trong cùng hàng cao bằng nhau. Bỏ chấm chỉ vị trí ở dải "How it works", thay bằng card ló ra ở mép. Nút
VI/EN sát lề phải. Link menu "FAQ"/"Hỏi đáp". FAQ thành accordion. Sau đó chủ dự án nhờ Codex sửa trang (08/10):
FAQ còn 4 câu (bỏ câu về app điện thoại, viết lại các câu khác), gói thứ hai đổi tên "Trải nghiệm AI", chữ nút
"Nhận thông báo ra mắt", nhiều đoạn chữ khác. Design doc mục 5 mô tả theo trạng thái này. Chủ dự án đồng ý cả bốn điểm của bản tiếng Anh và
UX (trạng thái form, các bước bài mẫu, hiệu ứng khi cuộn, lật flashcard).

## W15 — Đơn vị và co giãn

Bối cảnh: chủ dự án hỏi "các kích cỡ có được gán theo tỉ lệ hay fix cứng px". Đo Figma ngày 08/10: phần lớn phần
tử co giãn, nhưng còn bề rộng cố định (khối chữ 760/640/500/1000, carousel 560, card AI 480, FAQ 800, card bước 300
trên mobile), chiều cao cố định (flashcard 180, khung minh họa 250), và cỡ chữ nhảy bậc giữa hai màn. Design doc
chưa có quy tắc đơn vị.

| Phương án | Trade-off |
|---|---|
| ✅ Token rem, ba cỡ chữ lớn `clamp()`, bề rộng tối đa và tỉ lệ thay cho bề rộng cố định, bỏ chiều cao cố định | Trang lớn lên theo cỡ chữ người dùng; màn 768–1279 có giá trị trung gian; code lệch số Figma ở giữa hai màn |
| (ngầm định nếu không chốt) Chép số px của Figma | Khớp Figma ở hai bề rộng đã vẽ; không theo cỡ chữ người dùng; dễ cắt chữ |

Chủ dự án: "ok" (08/10).

## W16 — Plugin `design` của Anthropic

Bối cảnh: chủ dự án hỏi "còn plugin design của anthropic thì sao". Plugin `design@knowledge-work-plugins` 1.2.0 đã cài
ngày 08/10 nhưng skill của nó chưa được tải trong phiên đang chạy.

| Skill | Đề xuất | Trade-off |
|---|---|---|
| ✅ `ux-copy` | Task 2, soát chữ | Thêm một lượt soát chữ, nhất là chữ mới viết |
| ✅ `design-system` | Task 3, soát token | Bắt lệch giữa token và Figma |
| ✅ `accessibility-review` | Task 11 | Bổ sung cho axe, có phần soát bằng mắt |
| ✅ `design-critique` | Task 11 | Soát trang thật so với Figma |
| `design-handoff` | Không dùng | Trùng mục 5–6 của design doc |
| `user-research`, `research-synthesis` | Không dùng lúc này | Để dành cho pilot |

Chủ dự án: "ok". Skill nào chưa được tải trong phiên thì đọc `SKILL.md` của skill đó và làm theo.

## Đề xuất kỹ thuật duyệt cùng design (W10–W14)

| # | Chọn | Bỏ | Vì sao |
|---|---|---|---|
| W10 | CSS + một hook IntersectionObserver | Thư viện `motion` 14 | Hiệu ứng ít và đơn giản; không cần thêm JS lên client. `animation-timeline: view()` chưa đạt Baseline (MDN 08/10) |
| W11 | `<details name>` cho FAQ | Accordion tự viết bằng state | Chạy không cần JS, render trên server; trình duyệt thiếu `name` vẫn dùng được |
| W12 | CSS scroll-snap cho dải "How it works" | Carousel JS | Không cần hook; đúng W8 |
| W13 | Thêm `success-strong`, `danger-strong`, `border-strong` | Giữ nguyên màu Figma | Đo 08/10: chữ xanh 3,1–3,3:1, chữ đỏ 4,1–4,4:1, viền ô nhập 1,28:1, đều dưới chuẩn WCAG AA |
| W14 | `noindex` mặc định, bật bằng `NEXT_PUBLIC_INDEXABLE` | Index ngay | Chưa có domain, form chưa lưu thật; tránh Google index bản chưa xong |
