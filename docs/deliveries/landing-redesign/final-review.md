# Landing làm lại — review cuối cả nhánh (03/11/2026)

Reviewer độc lập (một subagent, model `fable`, chỉ đọc), đọc `efea78b9..c3577ca0` (25 commit), đối chiếu design, plan, ledger và chạy các probe headless trên stack Docker. Đây là báo cáo của nó, giữ nguyên nội dung; cách tôi xếp loại lại và xử lý nằm ở cuối file.

## Strengths

- Kiến trúc server-first: mọi chữ đi qua props từ `page.tsx` / `(site)/layout.tsx`, chỉ 3 client island (`AppShowcase`, `ExerciseGallery`, `ThemeToggleButton`). Lỗi `MISSING_MESSAGE` của `Logo` do CI bắt được rồi được pin bằng test chạy dưới đúng provider production (`messages={null}`).
- Test e2e có control: LR25 đếm đủ 7 wrapper `Reveal` trước khi kết luận "không di chuyển"; LR31 kiểm `missing` trước khi so màu.
- Hàm thuần pin giá trị chính xác: `forgettingCurve` test tọa độ tới 1 chữ số thập phân, `checkTyped` có đủ biên (rỗng, khoảng trắng, prefix).
- Không-JS làm thật: `hidden` render sẵn trên 4 tabpanel, `<details name>` accordion. Reviewer chạy lại no-JS **với motion bật** (điều LR26 không chứng minh vì ruling reduced-motion): q2 mở, q1 đóng, 1 tabpanel hiện. Ruling đó chấp nhận được.
- Theme: mọi link vào app là `<a href>` thường nên cleanup `delete dataset.theme` của `ThemeProvider` không chạy giữa landing và app (Review Focus 2 đóng). Chọn tối trên `/vi` thì `/vi/terms` cũng `data-theme="dark"`.
- Gỡ waitlist sạch: grep toàn `apps/web` không còn tham chiếu nào ngoài test khẳng định "không còn".
- Bàn phím trong gallery phần lớn đúng (Review Focus 1): sau trả lời focus tới "Dạng bài tiếp theo"; gõ sai thì focus về ô với selection `[0,3]`; phím 1–4 và H chạy.
- Tương phản trên dải xám (Review Focus 4), tính tay: `text-muted` / `bg-canvas` 6.59:1 sáng, 9.26:1 tối; `on-navy-muted` / `navy` 8.5:1; `text-primary` / `primary-soft` tối 4.52:1 (vừa đủ AA). Không tổ hợp nào dưới 4.5.
- 320 px (Review Focus 3): probe ở 320/390/768/1440, kể cả root font 20 px: `scrollWidth == innerWidth` ở mọi bề rộng, nút Đăng ký header 44 px một dòng ở 320.
- CI xanh 4/4 trên đúng head `c3577ca0` (run 41566845075).

## Issues

### Critical

Không có.

### Important

1. **Link neo header/footer chết trên `/vi/privacy` và `/vi/terms`** (`LandingHeader.tsx:20–31`, `SiteFooter.tsx:17–24`). Header cũ dùng đường tuyệt đối về trang chủ; header mới dùng `#tinh-nang`, `#goi`… trần, mà hai trang pháp lý dùng chung `(site)/layout.tsx`. Kịch bản: mở `/vi/privacy` (trang đăng ký của app link tới đây), bấm "Gói học" → URL thành `/vi/privacy#goi`, `document.getElementById('goi') === null`, trang đứng yên; footer "Hỏi đáp" cũng vậy. Regression so với landing cũ; test cũ RF1 trong `e2e/page.spec.ts` (xóa ở Task 10) là cái đã giữ hành vi này. Sửa: `href={`/${locale}#goi`}` cho 4 anchor header và 2 anchor footer (`SiteFooter` nhận `locale`), cập nhật các test pin `#goi`, thêm test từ `/vi/privacy` bấm Gói học tới `/vi#goi`.
2. **`revealed` không phải trạng thái cuối: Enter trong ô read-only kéo bài về `wrong`** (`ExerciseGallery.tsx:68–81`). Sau "Xem đáp án" nút Kiểm tra bị gỡ nhưng ô vẫn focus được dù `readOnly`; Enter kích implicit submission nên `submit()` chấm lại `state.text` cũ. Kịch bản: chọn "Gõ từ · theo nghĩa", gõ `zzz`, Enter, bấm "Xem đáp án" → ô hiện `assume`, `data-state="revealed"`; bấm vào ô, Enter → ô hiện lại `zzz`, `data-state="wrong"`, "Lần 2", live region "Đáp án sai". Sửa: `if (answered) return;` đầu `submit`, thêm test.
3. **Live region im lặng từ lần sai thứ hai** (`ExerciseGallery.tsx:76–77`, `:313–315`). `setMessage(copy.wrong)` hai lần liên tiếp không đổi DOM nên screen reader không được thông báo; plan Task 8 hứa thông báo Đúng/Chưa đúng. Kịch bản: "Điền từ vào câu", gõ `aaa` Enter → live "Đáp án sai"; gõ `bbb` Enter → live vẫn nguyên chuỗi, không mutation. Sửa: đưa số lần vào thông báo, hoặc xóa rồi đặt lại; pin bằng test so sánh `textContent` của `p[aria-live]` giữa hai lần.

### Minor

4. **Thẻ ôn mẫu không lật lại được bằng bàn phím** (`ReviewCardDemo.tsx:28–50`): Enter lật thẻ thì `document.activeElement === body`, Enter lần nữa không làm gì, Tab bỏ qua thẻ cả hai chiều. Không phải focus trap, mặt sau vẫn đọc được, chuột lật lại được. Khác app ở chỗ app có hai nút đánh giá sau khi lật, demo thì không. Sửa rẻ: khi `flipped`, nút mặt sau `tabIndex={0}`, `aria-label` "Lật lại thẻ" và `focus()` nó. Thêm: `aria-pressed="true"` nằm trong subtree `aria-hidden` nên screen reader không nghe; test LR5 pass trên attribute chứ không phải trên điều AT nghe.
5. **Mất phủ khi xóa `e2e/page.spec.ts` mà không thay**: RF1 (dẫn tới #1), RF4/LP32 (root text 125 % ở 390/768), A11Y-3 (phần tử focus không nằm dưới sticky header; header mới sticky ở mọi bề rộng, cũ chỉ từ `md`), UBC8 (không animation > 400 ms), Review#3 (focus nhìn thấy), RF5 (forced-colors). Probe một lần ở 390 với 40 lần Tab không thấy phần tử nào nằm dưới header; ở 768 với font gốc 20 px thanh tab tràn 146 px (cuộn được, không vỡ). Đề nghị port ít nhất RF1 và LP32.
6. **Test pin chi tiết cài đặt thay vì hành vi**: `exercise-gallery.test.tsx:29–30, 91` dùng `data-state` trong khi mỗi ô đã có chữ sr-only "Đáp án đúng/sai" và ô nhập có `aria-invalid`; `sections.test.tsx:14` đi `closest('div').parentElement`. Thiếu test pin rằng `review.seen` chứa `seenWord`, `lookup.example` chứa `exampleWord`, `aiMeaning.sentence` chứa `bold` (`indexOf` = −1 sẽ render chữ cắt cụt mà không test nào đỏ; hiện cả ba đúng).
7. **Chỗ trống đọc không nhất quán**: gallery dùng `role="img" aria-label="chỗ trống"`, `MetOutside` dùng `role="img" aria-hidden`, nên screen reader đọc "Can I your charger for a minute?".
8. **Doc drift**: `docs/deliveries/deploy-checklist.md:83` vẫn ghi CAPTCHA cho "waitlist"; `Plans.tsx:30–32` còn `div` bọc thừa quanh `h3` Miễn phí.

## Declined to judge (reviewer đặt sang một bên)

- CSP thực tế là `'unsafe-inline'` (D20 fallback, `apps/web/src/lib/csp.ts:6`, từ 22/10): hash của `THEME_SCRIPT` không có trong header, nên "đã có hash trong CSP" ở design §5/§8 chỉ đúng trên giấy và LR28 không chứng minh gì về inline script. Không phải thay đổi của nhánh này.
- `ThemeProvider` cleanup chạy hai lần dưới StrictMode dev: có sẵn của app, chỉ dev.
- `features/learner/review/Flashcard.tsx` cùng mẫu inert: ngoài plan.
- `/vi/privacy` thiếu `robots noindex` trong khi `/vi/terms` có; `JsonLd` `offers price 0 USD`, `x-default: '/'`, canonical `/vi` cho `/vi/app/*`: có từ trước.
- `/en` vẫn được prerender (chữ Việt) rồi bị proxy 307: thừa nhưng vô hại; LR21 đã pass trên Worker (CI).
- Không JS thì không có `data-theme` nên người dùng hệ tối không JS thấy trang sáng: spec chỉ hứa nội dung đọc được.
- Hover danh sách dạng bài là `hover:bg-canvas` (`#f1f3fd` trên trắng, rất nhạt): quyết định thị giác.
- Các ruling Task 5 (breakpoint), Task 3 (flip 280 ms), Reveal 0/40/60 ms: đồng ý.
- Bản tiếng Anh, nội dung pháp lý, giá Pro, ảnh thật: ngoài scope theo design §1.

## Assessment (reviewer)

**Ready to merge?** With fixes. Nền tảng vững; #1 là regression nhìn thấy trên hai trang công khai, #2/#3 là hai lỗ trong máy trạng thái của phần "làm thử"; cả ba sửa trong vài dòng.
Chưa kiểm được, vẫn là ASSUMPTION: thiết bị thật, `inspect.mjs`/`impeccable detect` (chỉ đọc doc), CSP/OpenNext ngoài CI.

## Cách xử lý (người thực hiện)

- #1, #2, #3: xếp loại Important, đưa vào một lượt sửa, mỗi lỗi có test đỏ trước (xem ledger và `git log`).
- #4–#8: Minor, không vào lượt sửa; ghi vào ledger là hoãn và nêu trong báo cáo cuối. Riêng RF1 (từ trang pháp lý bấm Gói học) được port làm test của #1.
- Dòng "chưa có kết quả CI" trong `landing-redesign.md` được sửa thành "xanh 4/4 trên `c3577ca0`".
