# Motion cho app người học — chỗ nên thêm, chỗ không (27/10/2026)

Phạm vi: `apps/web` `/vi/app`, `/en/app`. Chỉ khảo sát, **chưa sửa code**. Cách lọc: skill `find-animation-opportunities`
(triết lý Emil Kowalski, "You Don't Need Animations"): mỗi đề xuất phải qua 4 câu hỏi — **tần suất** (người học thấy nó bao nhiêu
lần một ngày), **mục đích** (feedback, giữ mạch không gian, cho thấy trạng thái đổi, tránh nhảy cóc, delight chỉ cho khoảnh khắc
hiếm), **tốc độ** (thao tác hằng ngày dưới 300ms) và **chức năng** (dữ liệu người học đang đọc thì không được nhúc nhích cho đẹp).

Ràng buộc của chủ dự án: chỉ animate `transform` / `opacity`; tôn trọng `prefers-reduced-motion`; thao tác hằng ngày < 300ms.

## 0. Hiện trạng (đọc code 27/10/2026)

App đã có một bộ motion khá đủ, đặt trong `apps/web/src/app/globals.css` (keyframes) và `packages/design-tokens/theme.css`
(thời lượng `instant 100ms / fast 150ms / base 250ms / slow 400ms`, easing `--ease-standard`, `--ease-enter`, `--ease-exit`,
`--ease-spring`). Mọi chỗ dùng đều đi qua `motion-safe:`, nên người bật "giảm chuyển động" không thấy gì.

| Chỗ | Đang có | File |
| --- | --- | --- |
| Bấm nút | Nút lún xuống bậc (`pressed`: `translate 0 0.18rem`, bóng mất), 100ms | `app-ui/Button.tsx:41`, `globals.css` `@utility pressed` |
| Dialog / sheet | Mở: sheet trượt từ dưới (phone), dialog `translateY(0.5rem) scale(0.97)` → yên (web), 250ms; đóng 150ms; overlay fade | `app-ui/Dialog.tsx:35–41` |
| Menu, Select, popover | Mở `translateY(∓0.25rem)` + fade 200ms, đổi chiều khi mở lên trên; đóng fade 150ms | `app-ui/Select.tsx:59`, `app-chrome/AvatarMenu.tsx:39` |
| Toast | Vào: `translateY(0.9rem) scale(0.96)` → yên, 300ms spring | `app-ui/Toast.tsx:35` |
| Nút đổi theme | Icon cũ bay lên, icon mới trồi lên, 250ms | `app-chrome/ThemeToggle.tsx` |
| Card nhóm | Hover nhấc nhẹ | `features/learner/groups/GroupCard.tsx:55` |

**Thiếu motion hoàn toàn ở đúng nơi người học dành nhiều thời gian nhất:** phiên ôn thẻ (`/app/review`) và phiên luyện tập
(`/app/practice/session`). Keyframes `card-in`, `wiggle`, `pop` đã có nhưng **chỉ landing dùng** (`components/interactive/cloze/ClozeCard.tsx`).

## 1. Đề xuất (theo thứ tự đáng làm nhất)

| # | Chỗ | Hôm nay | Mục đích | Tần suất | Motion đề xuất |
| --- | --- | --- | --- | --- | --- |
| 1 | Lật thẻ — `features/learner/review/Flashcard.tsx:37` (`!flipped ? … : …`) | Mặt trước biến mất, mặt sau hiện ra tức thì; hai mặt khác nhau cả chiều cao lẫn bố cục (mặt sau 2 cột trên web) | Cho thấy trạng thái đổi: vẫn là **cùng một thẻ**, vừa được lật | Hàng chục lần/ngày, mỗi thẻ một lần; hay bấm bằng phím Space | **Lật dẹt (squash flip)**: mặt trước `scaleX 1 → 0` trong 90ms `--ease-exit`, đổi nội dung, mặt sau `scaleX 0 → 1` trong 120ms `--ease-enter`; tổng ~210ms. Giảm chuyển động: chỉ đổi `opacity` 0 → 1 trong 120ms. **Không dùng lật 3D `rotateY`** (xem phần 2) |
| 2 | Chuyển sang thẻ / câu tiếp — `review/ReviewSession.tsx:84` (`key={item_id}`), `practice/session/PracticeSession.tsx:175`, `:256` | Thẻ/câu mới thay thẻ cũ ngay lập tức; mắt không biết là đã sang câu mới hay chỉ giao diện nhảy | Tránh nhảy cóc + giữ mạch (thẻ cũ xong, thẻ mới tới) | Hàng chục lần/ngày | Chỉ animate **lúc vào**, không chờ thẻ cũ ra (để không chậm nhịp bấm phím): `opacity 0, translateY(0.75rem)` → yên, 200ms `--ease-enter`. Giảm chuyển động: chỉ `opacity`, 120ms |
| 3 | Phản hồi đúng/sai — `practice/session/AnswerFeedback.tsx:41`, `McqQuestion.tsx:31` | Khối "Đúng rồi / Chưa đúng" và màu đáp án hiện tức thì | Feedback: xác nhận app đã chấm | Hàng chục lần/ngày | Khối phản hồi vào `opacity 0, translateY(0.25rem)` → yên, 160ms `--ease-enter`. **Sai:** đáp án đã chọn (hoặc ô gõ) rung ngang `translateX 0 → -4px → 4px → -2px → 0`, 240ms `--ease-standard`, một lần. **Đúng:** icon ✓ `scale(0.8) → 1`, 180ms `--ease-spring` (bản rút gọn của `pop` 320ms, vì 320ms quá ngân sách). Giảm chuyển động: bỏ rung và pop, giữ fade 120ms |
| 4 | Thanh tiến độ phiên ôn trên phone — `review/ReviewSession.tsx:131` | Đổi `width` theo inline style, nhảy cóc mỗi thẻ | Cho thấy trạng thái đổi (đã đi thêm một bước) | Hàng chục lần/ngày | Đổi sang `transform: scaleX(share)` với `transform-origin: left`, `transition: transform 200ms --ease-standard`. Không animate `width` (gây layout). Giảm chuyển động: không transition |
| 5 | Toast lúc đóng — `app-ui/Toast.tsx:35` | Có animation lúc vào, lúc đóng (tự đóng 5s hoặc bấm Đóng) thì biến mất tức thì | Giữ mạch không gian: ra cùng cạnh đã vào | Thỉnh thoảng | Ra `opacity → 0, translateY(0.5rem)`, 150ms `--ease-exit`. **Cần kiểm tra trước:** toast của React Aria (`UNSTABLE_Toast`) có báo trạng thái "đang đóng" (`data-exiting`) hay phải dùng View Transitions — `ASSUMPTION`, chưa xác minh trong phiên này |
| 6 | Màn tổng kết cuối phiên — `review/ReviewSummary.tsx`, `practice/session/SessionSummary.tsx` | Hiện tức thì | Delight (khoảnh khắc hiếm: hết một phiên) | Vài lần/ngày | Các ô số lần lượt hiện, `opacity 0, translateY(0.5rem)` → yên, 250ms `--ease-enter`, cách nhau 50ms; tối đa ~5 ô. Không chặn bấm nút. Giảm chuyển động: hiện cùng lúc |

Mọi giá trị dùng token có sẵn trong `theme.css` / `globals.css`, không thêm easing mới. Các keyframe mới (`flip-out`, `flip-in`,
`shake-x`) đặt cạnh keyframe cũ và chỉ được gọi qua `motion-safe:`.

## 2. Đã cân nhắc nhưng **không** đề xuất

- **Lật thẻ 3D (`rotateY` 180°, hai mặt `backface-visibility`)** — `Flashcard.tsx`. *Bị loại ở câu tốc độ + chức năng:* hai mặt cao khác nhau
  và mặt sau đổi bố cục 2 cột, nên lật 3D phải ép hai mặt cùng chiều cao (thẻ nhảy hoặc có khoảng trống), và một vòng lật 3D đẹp cần
  ~400–600ms — quá ngân sách cho thao tác lặp hàng chục lần, thường bằng phím Space. Lật dẹt (đề xuất #1) cho cùng cảm giác "lật" trong ~210ms.
- **Bấm nút** — `app-ui/Button.tsx:41`. *Không cần thêm:* đã có lún xuống bậc 100ms đúng ngân sách phản hồi. Thêm `scale(0.97)` sẽ chồng hai hiệu ứng.
- **Mở/đóng dialog, sheet, menu, Select** — `Dialog.tsx`, `Select.tsx`, `AvatarMenu.tsx`. *Không cần thêm:* đã có cả vào lẫn ra, đúng hướng, đúng ngân sách.
- **Chuyển trang giữa các tab (Hôm nay, Nhóm, Luyện tập, Tra từ)** và **danh sách nhóm / từ hiện lần lượt (stagger)**. *Bị loại ở câu tần suất:*
  điều hướng chính, hàng chục đến cả trăm lần/ngày; motion làm app có cảm giác chậm.
- **Biểu đồ ngăn ở trang nhóm mọc cột lên** — `GroupPage.tsx` `StageChart`. *Bị loại ở câu chức năng:* đây là số liệu người học đang đọc.
- **Phím tắt (Space, 1, 2, Enter, N)** — *không thêm motion riêng cho phím*; motion ở #1–#3 là motion của **nội dung**, chạy giống nhau dù bấm chuột hay phím, và ngắn để người gõ nhanh không phải chờ.

## 3. Kết luận

App không thiếu motion ở khung (dialog, menu, toast, nút) — phần đó gần như đúng rồi. Chỗ thiếu thật là **bên trong phiên học**: lật
thẻ, sang câu mới, chấm đúng/sai — đúng những gì người học thấy nhiều nhất và đang "nhảy cóc". Đáng làm nhất là **#1 lật thẻ** và **#3 phản hồi
đúng/sai**, kế đó **#2 sang câu mới**; ba cái này là ứng viên để làm prototype cho chủ dự án chọn. #4–#6 nhỏ, làm cùng đợt được.
Điều code không trả lời được: cảm giác "đủ nhanh" khi gõ phím liên tục — phải thử trên prototype.

## 4. Đã làm (27/10/2026, branch `feat/motion-nguoi-hoc`)

Chủ dự án chọn trên prototype (`2026-10-26-motion-nguoi-hoc-prototype.html`): **1C** lật 3D thật, **2A** trồi lên, **3C** lắc xoay khi sai
+ ✓ bật khi đúng; và giữ đúng thời lượng của prototype (lật **420ms**, lắc **300ms**), dù skill khuyên dưới 300ms cho thao tác hằng ngày.

| Motion | Ở đâu | Giá trị |
| --- | --- | --- |
| 1C lật thẻ | `features/learner/review/Flashcard.tsx` | Hai mặt nằm chung một ô grid (thẻ cao theo mặt cao hơn, không nhảy); khối xoay `rotateY(180deg)`, `transition: transform 420ms var(--ease-standard)`, `perspective: 1200px`, mặt quay đi `backface-visibility: hidden` + `inert` + `aria-hidden` |
| 2A thẻ/câu mới | `Flashcard.tsx` (nhóm thẻ), `practice/session/QuestionCard.tsx` (key theo item ở `PracticeSession.tsx`) | `card-rise`: `opacity 0, translateY(0.75rem)` → yên, 200ms `--ease-enter` |
| 3C phản hồi | `McqQuestion.tsx` (cả Đúng/Sai), `AnswerFeedback.tsx`, khối "Chưa đúng" của câu gõ | Sai: `wiggle-soft` ±3° 300ms `--ease-standard` trên đáp án đã chọn; đúng: ✓ `pop-in` 0.8 → 1, 180ms `--ease-spring`; khối kết quả `feedback-in` 160ms `--ease-enter` |

Token và keyframe mới ở `apps/web/src/app/globals.css`. Mọi animation đi qua `motion-safe:`.

- **Giảm chuyển động:** file `globals.css` đã có sẵn một rule đưa mọi animation/transition về ~0 khi bật `prefers-reduced-motion`. Vì vậy thẻ
  không xoay, hai mặt đổi ngay (bằng `opacity`), không có hiệu ứng mờ 120ms như mục 1 dự kiến. Đổi rule đó ảnh hưởng cả landing nên không đụng.
- **Câu gõ từ:** không lắc ô nhập (prototype chỉ có đáp án chọn); chỉ khối "Chưa đúng" trồi lên.
- **#4–#6** (thanh tiến độ, toast lúc đóng, màn tổng kết) chưa làm.
- **Lỗi bắt được khi kiểm tra thật:** gán `key={item_id}` cho thẻ câu hỏi trùng key với ô nhập bên cạnh, làm thẻ câu cũ ở lại trên trang sau câu gõ từ.
  Đã đổi key thành `card-<id>` và thêm kiểm tra vào test.
- **Hiệu năng (skill `animation-performance`):** chỉ `transform`/`opacity`, CSS (không chạy trên main thread), không `transition: all`,
  không animate CSS variable theo frame. **Chưa kiểm** trên điện thoại tầm trung và Safari iOS (`backface-visibility` cùng `overflow: hidden`).
- **Bằng chứng:** video trước/sau `2026-10-26-motion-nguoi-hoc/before/review-practice.webm`, `after/review-practice.webm` (ôn 3 thẻ rồi
  luyện 4 câu, 1280×800); khung hình giữa chuyển động `after/flip-100ms.png`, `after/answer-0-90ms.png`.
