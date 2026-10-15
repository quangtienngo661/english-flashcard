# Motion design và best practice cho landing + admin (15/10/2026)

Tài liệu tham khảo, **chưa phải quyết định thiết kế**. Mục đích: có số liệu và ví dụ thật để brainstorm lại giao diện
landing (`apps/web`) và admin (`apps/admin`), vì chủ dự án chưa hài lòng với cả hai.

Không lặp lại hai tài liệu đã có:
- `docs/preparation/UX_UI_REFERENCE_WEBSITES_2026-10-14.md` — danh sách site đoạt giải (Webby, Awwwards, Baymard).
- `docs/LANDING_PAGE_UI_UX_OPTIMIZATION_CONTEXT.md` — audit landing về bố cục, màu, chuyển đổi (CTA, form waitlist).

Tài liệu này bổ sung phần còn thiếu: **chuyển động (motion)** và cách các sản phẩm tốt làm giao diện "trông xịn".

## Cách lấy dữ liệu

- Nguyên tắc motion: đọc **trực tiếp** từ trang gốc ngày 15/10/2026 (Material 3, IBM Carbon, NN/g, Apple HIG, W3C WCAG,
  MDN, React Aria qua context7). Trang Material 3 và Apple HIG dựng bằng JavaScript nên đọc bằng trình duyệt.
- Site tham khảo: mở bằng Chrome (Claude in Chrome), chụp màn hình, rồi chạy một đoạn script đếm **thời lượng
  (duration) và kiểu tăng/giảm tốc (easing)** của mọi `transition`/`animation` CSS đang khai báo trên trang lúc tải xong.
- Hiện trạng Wordmet: đọc code (`apps/web/src/app/globals.css`, `Reveal.tsx`, admin `wt-m3/apps/admin/src/**`), xem
  `wordmet.com/vi` và admin local `localhost:5173` (tài khoản thử trong `.verify-b25-accounts.md`).

**Giới hạn của phép đo (đọc trước khi tin bảng số):**
- Script chỉ thấy CSS `transition`/`animation` khai báo sẵn lúc tải. **Không** thấy animation chạy bằng JavaScript
  (Framer Motion, Web Animations API), video, canvas (Rive/Lottie), hay transition chỉ được gắn khi mở menu/dialog.
  Ví dụ Catalyst đo ra 0 transition nhưng menu của nó vẫn có thể có animation khi mở.
- Con số đếm = số phần tử khai báo giá trị đó, **không** phải số lần người dùng thấy.
- Bỏ chỉ số "số rule `prefers-reduced-motion`": script chỉ đọc rule cấp ngoài cùng, trong khi Tailwind v4 lồng rule vào
  `@layer` — trên chính `wordmet.com` nó ra 0 dù code có rule này. Công cụ đo sai, nên không dùng số đó.
- Shopify Polaris (design system cho admin) không mở được (trình duyệt từ chối), Fluent 2 không công bố số cụ thể.

## 1. Hiện trạng Wordmet

### Landing (`wordmet.com`)

| Thứ | Hiện tại | Ghi chú |
|---|---|---|
| Token motion | `fast 150ms`, `base 250ms`, `faq 350ms`, **`carousel / reveal / flip 800ms`** | `globals.css` dòng 74–82 |
| Easing | một đường duy nhất `cubic-bezier(0.2, 0, 0, 1)` | Đúng bằng **Standard** của Material 3 (xem §2) |
| Đo trên trang | 24 phần tử 150ms, 8 phần tử 350ms, **4 phần tử 800ms** | 800ms = slide carousel, thẻ lật, các khối "hiện dần" |
| Hiện dần khi cuộn (`Reveal`) | trượt lên 16px + mờ → rõ, **800ms**, trễ thêm 80/160ms cho khối thứ 2/3, chạy một lần | Khối thứ 3 xong sau ~960ms |
| Giảm chuyển động | Có: tắt transition khi hệ điều hành bật "reduce motion", nội dung vẫn hiện | Làm tốt, giữ nguyên |

Nhìn bằng mắt (1280px): nền kem/trắng xen kẽ, phẳng, chữ H1 60px. Ý tưởng **cho người xem bấm thử bài điền từ ngay ở hero là
đúng hướng** (các site tốt nhất bên dưới đều làm vậy), nhưng widget nhỏ, thiếu chiều sâu, và cả trang thiếu một "điểm nhấn" thương hiệu.

Vấn đề motion cụ thể: **800ms là quá dài cho thứ người dùng tự bấm** (lật thẻ, chuyển slide). NN/g nói từ 500ms trở lên
"bắt đầu thấy lê thê"; Material 3 chỉ dùng 700–1000ms cho chuyển động "nền" không do người dùng bấm.

### Admin (`localhost:5173`, nhánh `feat/buoc-2-5-m3-csv-flow`)

| Thứ | Hiện tại |
|---|---|
| Motion | Gần như không có: chỉ icon xoay khi nút đang chờ. Dialog, menu, drawer **bật/tắt tức thì**. |
| Token | Màu, chữ `text-ui 14px`, bo góc 6px, hai loại bóng đổ; **không có token motion** |
| Bố cục | Sidebar trắng có bóng, topbar là một "thẻ" riêng có bóng, mỗi bảng lại là một thẻ có bóng — nhiều lớp bóng |
| Lỗi thấy được | Bảng Imports ở 1280px: link "Details" bị xuống dòng thành "Detail / s" |
| Dashboard | Trang trống "Feature not available yet" |

Chủ dự án đã ghi (15/10): giao diện admin sẽ được làm lại toàn bộ; giữ phần logic session/API và các edge case.

## 2. Nguyên tắc motion — số liệu từ nguồn chính thức

### Thời lượng (duration)

| Nguồn | Con số |
|---|---|
| **NN/g** | Phần lớn animation nên 100–500ms. Phản hồi đơn giản (checkbox, toggle) ~100ms. Thay đổi lớn (modal hiện ra) 200–300ms. 400ms cho chuyển động lớn đi xa. **≥500ms "bắt đầu thấy lê thê"**. Hiện ra lâu hơn biến mất một chút (vd hiện 300ms, ẩn 200–250ms). Càng hay gặp thì càng ngắn. |
| **IBM Carbon** | `fast-01 70ms` (nút, toggle) · `fast-02 110ms` (fade) · `moderate-01 150ms` (mở rộng nhỏ) · `moderate-02 240ms` (mở rộng, toast) · `slow-01 400ms` (mở rộng lớn, thông báo quan trọng) · `slow-02 700ms` (làm tối nền) |
| **Material 3** | short 50/100/150/200ms (chuyển động nhỏ, tiện ích) · medium 250–400ms · long 450–600ms (chuyển cảnh lớn) · extra-long 700–1000ms (hiếm, cho chuyển động nền **không do người dùng bấm**) |
| **Emil Kowalski** (tác giả Sonner, Vaul) | Thường **dưới 300ms**; chê một animation 500ms trên công cụ dùng nhiều lần |

### Easing (kiểu tăng/giảm tốc)

| Nguồn | Dùng khi | Giá trị CSS |
|---|---|---|
| Material 3 — Standard | phần tử đổi trạng thái tại chỗ | `cubic-bezier(0.2, 0, 0, 1)` ← landing đang dùng |
| Material 3 — Standard decelerate / accelerate | đi vào / đi ra | `(0, 0, 0, 1)` / `(0.3, 0, 1, 1)` |
| Material 3 — Emphasized decelerate / accelerate | chuyển cảnh lớn, biểu cảm | `(0.05, 0.7, 0.1, 1)` / `(0.3, 0, 0.8, 0.15)` |
| Carbon — productive (standard / vào / ra) | khi người dùng đang tập trung làm việc → **hợp admin** | `(0.2, 0, 0.38, 0.9)` / `(0, 0, 0.38, 0.9)` / `(0.2, 0, 1, 0.9)` |
| Carbon — expressive (standard / vào / ra) | khoảnh khắc quan trọng, chuyển động mang ý nghĩa → **hợp landing** | `(0.4, 0.14, 0.3, 1)` / `(0, 0, 0.3, 1)` / `(0.4, 0.14, 1, 1)` |

Ghi chú: Material 3 ghi rõ hệ easing/duration này "không còn được duy trì" — bản M3 Expressive chuyển sang **spring** (lò
xo vật lý). Bộ số vẫn dùng được cho web CSS.

### Quy tắc hành vi (gom từ nhiều nguồn)

1. **Chỉ animate khi chuyển động mang thông tin** — trạng thái đổi, thứ gì đó vào/ra, nó từ đâu tới. Không thêm cho có
   (Apple HIG: "Don't add motion for the sake of adding motion").
2. **Việc lặp lại nhiều lần thì bỏ hoặc gần như bỏ animation** — menu lệnh, phím tắt, chuyển trang trong admin
   (Apple HIG, Rauno Freiberg, Emil Kowalski).
3. **Không bắt người dùng chờ animation** — phải ngắt được giữa chừng (Apple HIG "Let people cancel motion"). Trong CSS:
   dùng `transition` (đổi hướng mượt khi bị ngắt) thay vì `@keyframes`.
4. **Chỉ animate `transform` và `opacity`** — rẻ cho trình duyệt; animate `height`, `margin`, `padding` gây giật.
5. **Chuyển động có nguồn gốc** — menu mở ra từ chỗ nút được bấm, drawer trượt từ cạnh nó nằm.
6. **Tôn trọng "reduce motion"** — WCAG 2.3.3 (mức AAA) và 2.2.2 (tự chạy thì phải dừng được). Đổi màu/độ mờ **không** tính
   là "motion" theo WCAG, nên khi giảm chuyển động có thể thay trượt/phóng bằng mờ dần.

### Công nghệ CSS mới — tình trạng hỗ trợ (MDN, 15/10/2026)

| Tính năng | Dùng làm gì | Trạng thái |
|---|---|---|
| `@starting-style` | animate phần tử lúc vừa xuất hiện, không cần JS | **Baseline 2024** — dùng được |
| `document.startViewTransition()` | chuyển cảnh mượt giữa hai trạng thái trong cùng trang | **Baseline 2025** — dùng được |
| `@view-transition` (chuyển trang nhiều document) | chuyển trang mượt cho site nhiều trang | Chưa Baseline — chỉ làm tăng cường |
| `animation-timeline: view()` (animation theo cuộn) | hiện dần khi cuộn bằng CSS thuần | Chưa Baseline — chỉ làm tăng cường |
| `interpolate-size` | animate tới `height: auto` (FAQ đang dùng) | Chưa Baseline — landing đã bọc `@supports`, đúng |

Admin dùng `react-aria-components`: Modal, Popover, Menu đã có sẵn trạng thái `data-entering` / `data-exiting` để gắn CSS
animation vào lúc mở/đóng (React Aria đợi animation đóng chạy xong mới gỡ khỏi trang). Ví dụ chính thức của họ: lớp nền tối
của modal hiện 200ms, ẩn 150ms; popover mờ + trượt 4px theo hướng nó mở, hiện 200ms `ease-out`, ẩn 150ms `ease-in`. **Không cần thêm thư viện.**

## 3. Đo thực tế trên các site tham khảo (Chrome, 15/10/2026)

| Site | Vai trò | Thời lượng chủ đạo (số phần tử) | Easing chủ đạo | Nhận xét khi xem |
|---|---|---|---|---|
| **Linear** | landing sản phẩm | 100ms (283), 160ms (93), 700ms (30), 400ms (25) | `(0.25, 0.46, 0.45, 0.94)` ×335, `(0.32, 0.72, 0, 1)` ×30 | Hero là **chính giao diện app thật**, đang "tự chạy" một luồng làm việc. Hover gần như tức thì (100ms). Nền tối, chữ lớn, rất ít màu. |
| **Brilliant** | landing app học | 200ms (40), 300ms (33) | `ease`, `ease-out` | Mỗi tính năng = **một thẻ demo tương tác** trên nền màu nhạt riêng (hồng đào, xanh lá). Có linh vật (Koji). 8 video + 1 canvas. |
| **Speak** | landing app học ngoại ngữ (AI) | 500ms (46), 400ms (30), 200ms (29) | `(0.16, 1, 0.3, 1)` ×46 | Dải màu thương hiệu (xanh đậm) chiếm cả chiều ngang ngay dưới hero. 7 video. Motion chậm hơn, "mềm" hơn. |
| **Duolingo** | landing app học ngoại ngữ | 200–500ms, chỉ vài phần tử | `ease`, `(0.22, 1, 0.36, 1)` | Hero gần như trống: linh vật + 1 câu + 2 nút. Thương hiệu đến từ **minh họa + một màu xanh + chữ đậm**, không phải từ motion. |
| **shadcn/ui dashboard** | mẫu admin | **150ms (165)** | `(0.4, 0, 0.2, 1)` ×166 (mặc định Tailwind) | Motion chỉ là đổi màu khi hover. Thẻ số liệu có viền mảnh, bóng rất nhẹ. |
| **Catalyst** (Tailwind) | mẫu admin | 0 lúc tải | — | Sidebar phẳng không bóng, nội dung nằm trên **một** mặt trắng duy nhất, bảng không bọc trong thẻ riêng, nhiều khoảng trắng. Chữ body 16px. |
| **Wordmet** (đối chiếu) | landing | 150ms (24), 350ms (8), **800ms (4)** | `(0.4, 0, 0.2, 1)` ×24, `(0.2, 0, 0, 1)` ×12 | — |

Điểm chung rút ra:
- **Admin tốt = gần như không có motion**, ngoài hover 100–150ms và mở/đóng lớp phủ (menu, dialog) ~150–250ms.
- **Landing tốt không thắng nhờ hiệu ứng**: Linear và Brilliant thắng nhờ **cho xem sản phẩm đang làm việc**; Duolingo
  và Speak thắng nhờ **một màu thương hiệu mạnh + minh họa/linh vật + chữ đậm**. Motion chỉ là lớp phụ.
- Thời lượng landing của các site trên nằm trong 100–500ms (vài phần tử 700ms ở Linear). Không site nào để thứ người dùng tự bấm chạy 800ms.

## 4. Gợi ý áp dụng cho Wordmet (đề xuất, chưa chốt)

### Một bộ token motion dùng chung cho landing + admin

Cả hai app đều dùng Tailwind v4 `@theme`, nên có thể dùng cùng một bộ tên. Số lấy từ NN/g + Carbon + Material 3 ở §2:

```css
@theme {
  --duration-instant: 100ms;  /* hover, nhấn nút */
  --duration-fast: 150ms;     /* đổi màu, fade nhỏ; đóng menu/popover */
  --duration-base: 250ms;     /* mở dialog, popover, toast */
  --duration-slow: 400ms;     /* panel lớn, khối hiện dần trên landing, lật thẻ */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);      /* đổi trạng thái tại chỗ (M3 Standard) */
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);    /* đi vào (M3 Emphasized decelerate) */
  --ease-exit: cubic-bezier(0.3, 0, 0.8, 0.15);     /* đi ra (M3 Emphasized accelerate) */
}
```

### Admin = "productive" (yên, nhanh)

- Hover/nhấn: chỉ đổi màu, 100–150ms.
- Dialog, menu tài khoản, popover, Select: hiện 200–250ms (mờ + phóng 0.96→1, hoặc trượt 4px theo hướng mở), ẩn 150ms —
  qua `data-entering`/`data-exiting` của React Aria.
- Drawer mobile: trượt từ trái 250ms.
- Bảng, chuyển trang, đổi tab: **không** animation. Tải chậm hơn ~300ms thì hiện khung xám (skeleton) thay vì để trống.
- Bố cục (theo Catalyst/shadcn): bỏ bớt lớp bóng — sidebar phẳng, nội dung trên một mặt duy nhất, dùng viền mảnh thay bóng.
- Bảng (NN/g): cột đầu là tên đọc được chứ không phải ID; 1–2 thao tác thì để ngay trên dòng, nhiều hơn thì gom vào menu;
  tiêu đề bảng dính khi cuộn; có dấu hiệu rõ khi đang lọc; sửa bằng panel bên cạnh thay vì modal khi cần nhìn các dòng khác.
- Sửa ngay: "Details" xuống dòng (cần `whitespace-nowrap` hoặc cột rộng hơn).

### Landing = "expressive" nhưng ngắn

- Rút 800ms → 300–400ms cho lật thẻ, chuyển slide, hiện dần; trễ giữa các khối ≤ 60ms.
- Giữ hành vi `Reveal` hiện tại (chỉ chạy một lần, SSR vẫn hiện, tôn trọng reduce motion) — chỉ đổi số.
- Một **khoảnh khắc chuyển động riêng** gắn với sản phẩm, như Duolingo/Brilliant: khi người xem chọn đúng từ trong bài điền
  từ, ô trống "khớp" vào (phóng nhẹ 1→1.05→1 khoảng 200ms + đổi màu). Đây là chuyển động mang thông tin (đúng/sai), không phải trang trí.
- Hero: phóng to và tăng chiều sâu cho widget bài điền từ để nó là "sản phẩm đang chạy" như Linear; cân nhắc một dải màu
  thương hiệu đậm như Speak thay cho nền kem/trắng xen kẽ (trùng với hạng mục 7 trong audit landing).
- Animation theo cuộn bằng CSS (`animation-timeline`) chỉ dùng như lớp tăng cường vì chưa Baseline.

## 5. Còn thiếu / chưa kiểm

- Chưa đo animation chạy bằng JavaScript, video, Rive trên các site tham khảo (script không thấy).
- Chưa xem bản mobile của các site tham khảo, chưa xem landing Wordmet trên điện thoại trong lần này.
- Polaris (Shopify, design system cho admin) không mở được; nếu cần, xem thủ công: `https://polaris-react.shopify.com/tokens/motion`.
- Bộ token ở §4 là đề xuất, chưa thử trên giao diện thật.

## Nguồn

- Material 3 — [Easing and duration: tokens & specs](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- IBM Carbon — [Motion overview](https://carbondesignsystem.com/elements/motion/overview/)
- NN/g — [Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/),
  [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/)
- Apple — [Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- Microsoft — [Fluent 2 Motion](https://fluent2.microsoft.design/motion)
- W3C — [Understanding SC 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- MDN — [animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline),
  [startViewTransition()](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition),
  [@view-transition](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition),
  [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style),
  [interpolate-size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size)
- React Aria — [Styling: animation](https://react-aria.adobe.com/styling), [Modal](https://react-aria.adobe.com/Modal), [Popover](https://react-aria.adobe.com/Popover)
- Emil Kowalski — [Great animations](https://emilkowal.ski/ui/great-animations)
- Rauno Freiberg — [Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design)
- Linear — [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Rive (bài của nhà cung cấp, đọc với dè dặt) — [Brilliant.org](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations)
- Site đã đo: [linear.app](https://linear.app), [brilliant.org](https://brilliant.org), [speak.com](https://www.speak.com),
  [duolingo.com](https://www.duolingo.com), [ui.shadcn.com/examples/dashboard](https://ui.shadcn.com/examples/dashboard),
  [catalyst-demo.tailwindui.com](https://catalyst-demo.tailwindui.com/), [wordmet.com](https://wordmet.com/vi)
