# Audit giao diện người học (`apps/web` `/vi/app`) — 26/10/2026

Giai đoạn 1 (audit) xong 26/10/2026. Giai đoạn 2: chủ dự án chọn sửa 12 lỗi major #1–#12, đã sửa trên nhánh `fix/ui-nguoi-hoc-major` (as-built: `docs/deliveries/sua-loi-ui-nguoi-hoc.md`). Ảnh before/after (375/1280, sáng/tối) ở `2026-10-26-ui-nguoi-hoc/shots-before/` và `shots-after/`; bộ 226 ảnh audit đầy đủ (`shots/`, 37 MB) chỉ để ở máy local, không commit.

## Cách làm

- **Thước đo "lỗi"**: code lệch design đã duyệt (hướng B: design `docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`, bản chữ
  `docs/mockups/2026-10-21/ban-chu-giao-dien.md` §12–§17 ghi đè phần trước, token `packages/design-tokens`, đợt cải thiện A) hoặc thật sự khó dùng.
  "Nên đổi sang phong cách khác" không tính. Ruling và minor đã chấp nhận trong handoff §5 và ledger không báo lại, trừ khi người dùng thấy được
  (dòng đó ghi "đã biết").
- **App thật**: API + worker đang chạy (DB `english_learning_learner_ui`, AI giả), app dev ở :3001. Có 3 tài khoản thử, mật khẩu là mật khẩu cố định của
  `apps/api/scripts/learner-test-setup.mjs`:
  - `audit-pro@example.com`: gói Pro, 8 nhóm. Có tên 60 ký tự có dấu, một chữ dài liền 60 ký tự, và nhóm "x" không có từ.
  - `audit-free@example.com`: gói Miễn phí, chưa có gì.
  - `audit-admin@example.com`: dùng để chuẩn bị dữ liệu.
- **Ảnh**: 226 ảnh ở `2026-10-26-ui-nguoi-hoc/shots/`, tên `<màn>-<light|dark>-<375|1280>.png`. Ảnh hộp thoại chỉ chụp phần cửa sổ đang thấy.
- **Số đo**: `2026-10-26-ui-nguoi-hoc/metrics.jsonl`, mỗi ảnh một dòng gồm:
  - có cuộn ngang không;
  - phần tử lọt ra ngoài mép phải;
  - vùng bấm nhỏ hơn 24px;
  - kết quả axe WCAG 2.2 AA.
- **break-ui**: chạy bằng Playwright, chặn và sửa phản hồi API ở các tình huống sau:
  - lỗi 500;
  - API chậm 15 giây;
  - số rất lớn;
  - tên và email rất dài có dấu;
  - kết quả tra từ và tra AI rất dài;
  - mất mạng khi tạo nhóm;
  - 429 khi bắt đầu phiên.
- **`/impeccable`**:
  - `init` ghi `PRODUCT.md` từ những gì repo đã có. Chủ dự án chưa duyệt file này (xem đầu file).
  - `audit` và `critique` theo tiêu chí của skill: 4 subagent, mỗi agent 2 nhóm màn, đọc code, xem ảnh, đối chiếu design.
  - Không chạy được `impeccable detect`, vì launcher không tải được engine (không vào được GitHub releases). Phần đó thay bằng axe và số đo ở trên.
  - Ghi chú đầy đủ của từng agent ở `2026-10-26-ui-nguoi-hoc/notes/`.
- **Mức độ**:
  - **blocker**: không làm xong việc chính, hoặc mất dữ liệu hay mất tiền.
  - **major**: khó dùng rõ ràng, trượt một tiêu chí WCAG, hoặc lệch design mà người dùng thấy.
  - **minor**: phiền, hoặc cần đánh bóng.

  Hai agent xếp 2 lỗi WCAG mức A là blocker (nhãn nút UK/US, nhãn cột Lịch sử). Tôi hạ cả hai xuống major, vì người dùng vẫn làm xong việc.
- Đường dẫn code tính từ `apps/web/src/`. "Chỉ code" nghĩa là lỗi thấy qua code, chưa có ảnh.

## Tổng: 0 blocker · 12 major · 41 minor (53 dòng)

| # | Mức | Màn | Lỗi (nói đơn giản) | Bằng chứng | Đề xuất sửa | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | major | Trang nhóm, điện thoại | Tên nhóm là một chữ dài liền (60 ký tự, API cho phép) làm cả trang rộng ra 913px ở màn 375px. Nút [Ôn], nút ⋯, biểu đồ, danh sách từ đều phải kéo ngang mới thấy. | `shots/group-unbroken-light-375.png`; metrics `scrollWidth 913`; `features/learner/groups/GroupPage.tsx:103-106` | Thêm `min-w-0` cho khối đầu trang (hoặc `grid-cols-1`), tên nhóm dùng `wrap-anywhere`. | đã sửa — ảnh `shots-before/d01-group-unbroken-*` → `shots-after/d01-group-unbroken-*` |
| 2 | major | Tổng kết phiên luyện → [Luyện thêm một phiên] | Nút này không gửi `cloze_source`, và API coi thiếu trường này là "câu AI". Sau một phiên "Điền từ vào câu bạn đã lưu": gói Pro/Dùng thử bị trừ lượt câu AI mà người học không chọn; gói Miễn phí nhận lỗi. | `features/learner/practice/session/SessionSummary.tsx:28-36` (`againBody`); `apps/api/src/practice/sessions/sessions.service.ts:103` (`?? 'ai'`) (chỉ code, tôi đã đọc lại) | Chép `cloze_source: 'own'` khi phiên trước là `own`; test trước. | đã sửa — bằng chứng là test (không chụp được) |
| 3 | major | Mọi hộp thoại/tấm, bản tối | Lớp phủ sau hộp thoại dùng `bg-ink/45`. Ở bản tối `ink` gần trắng, nên mở tấm làm cả trang **sáng xám lên** thay vì tối đi. | `shots/addword-free-dark-375.png`, `addword-free-dark-1280.png`; `app-ui/Dialog.tsx:35`; `packages/design-tokens/dark.css:15` | Đổi sang token luôn tối (`bg-navy/45` hoặc `bg-shadow-ink`), sửa một chỗ dùng chung. | đã sửa — ảnh `shots-before/d03-dialog-overlay-*` → `shots-after/d03-dialog-overlay-*` |
| 4 | major | Tấm Thêm từ | Khi tra từ điển lỗi (429, 5xx, mất mạng), tấm không báo gì, mất luôn [Tự nhập nghĩa] và nút Lưu, chỉ còn [Hủy]. Người học kẹt mà không biết vì sao. | `features/learner/add-word/AddWordSheet.tsx:353-354,400,450,455` (chỉ xét `isPending`/`isSuccess`) (chỉ code) | Nhánh `isError`: `ErrorState` + [Thử lại] (có sẵn trong `app-ui/States.tsx`), vẫn cho [Tự nhập nghĩa]. | đã sửa — ảnh `shots-before/d04-addword-lookup-error-*` → `shots-after/d04-addword-lookup-error-*` |
| 5 | major | Trang nhóm | Tải danh sách thẻ lỗi (5xx, mất mạng) thì màn ghi **"Nhóm chưa có từ nào."**, không có [Thử lại]. Người học tưởng mất hết từ. | `features/learner/groups/GroupPage.tsx:89,161-164` (chỉ code) | Nhánh `queue.isError` → `ErrorState` + [Thử lại]. | đã sửa — ảnh `shots-before/d05-group-queue-error-*` → `shots-after/d05-group-queue-error-*` |
| 6 | major | Gói học, Tổng kết phiên luyện | Class `text-h1` không có token, nên tiêu đề trang ("Học đều mỗi ngày, lên Pro khi cần", "Xong 10 câu.") và giá "XXX.000 ₫" về cỡ chữ thường 16px, **nhỏ hơn** tên thẻ "Miễn phí"/"Pro". Thứ bậc tiêu đề bị đảo. | `shots/plans-free-light-1280.png`, `plans-pro-light-1280.png`; `features/learner/plans/PlansPage.tsx:55,107`; `practice/session/SessionSummary.tsx:94`; `app/globals.css` không có `--text-h1` | Dùng token có sẵn: `text-display` cho tiêu đề (như "Xong N thẻ." của phiên ôn), `text-h2` cho giá. | đã sửa — ảnh `shots-before/d06-plans-*` → `shots-after/d06-plans-*` |
| 7 | major | Lịch sử luyện tập | Mỗi dòng có hai ô "câu bạn trả lời" / "đáp án" nhưng không có nhãn. Tiêu đề cột chỉ hiện từ 1024px và luôn `aria-hidden`. Trên điện thoại người nhìn không biết ô nào là của mình (bản chữ M/L57 có nhãn); trình đọc màn hình cũng không biết (WCAG 1.3.1). | `features/learner/practice/HistoryPage.tsx:121,200-201` (chỉ code: tài khoản thử chưa có lịch sử) | Nhãn nhỏ "Bạn trả lời" / "Đáp án" dưới 1024px, `sr-only` từ 1024px (khóa chữ đã có). | đã sửa — ảnh `shots-before/d07-history-*` → `shots-after/d07-history-*` |
| 8 | major | Phiên luyện, phiên ôn | Sau khi trả lời, nút đang focus biến mất nên focus rơi về đầu trang. Kết quả "Đúng rồi"/"Chưa đúng" nằm trong vùng `role="status"` vừa tạo mới, nên trình đọc màn hình có thể không đọc. Người dùng bàn phím sáng mắt vẫn dùng phím tắt được. | `practice/session/McqQuestion.tsx:176`; `AnswerFeedback.tsx:37`; `PracticeSession.tsx:262`; `review/ReviewSession.tsx:89-105` (chỉ code) | Một vùng `aria-live` có sẵn từ đầu phiên, ghi kết quả vào đó; sau khi chấm thì focus vào nút chính. | đã sửa — bằng chứng là test (không chụp được) |
| 9 | major | Hôm nay, Nhóm, trang nhóm, Cài đặt | Số không có dấu chấm hàng nghìn: "262962 thẻ chờ", "đã dùng 12345/999999", trái luật §1 số 8 ("7.799"). Người học có hơn 999 từ sẽ thấy "1250 từ". `vi.json` không có chỗ nào định dạng số. | `shots/break-huge-today-light-1280.png`, `break-huge-settings-light-375.png`; `features/learner/today/TodayPage.tsx:103,114,162,177`; `groups/GroupCard.tsx:60-80`; `settings/UsageSection.tsx:21,41,62` | Dùng `{count, number}` trong `vi.json`/`en.json` cho mọi số đếm. | đã sửa — ảnh `shots-before/d09-today-huge-*` → `shots-after/d09-today-huge-*` |
| 10 | major | Cài đặt | Hàng "Lịch sử giao dịch" trông bấm được cả hàng, nhưng chỉ mũi tên 20×20px là link. "Gói hiện tại" trên điện thoại cũng vậy. Đây là đường duy nhất vào Lịch sử giao dịch từ điện thoại. | `shots/settings-light-375.png`; metrics `a "Lịch sử giao dịch" 20x20`; `features/learner/settings/SettingsPage.tsx:103-111,168-176` | Cả hàng là vùng bấm (stretched link), nút hành động `min-h-control-touch`. | đã sửa — ảnh `shots-before/d10-settings-*` → `shots-after/d10-settings-*` |
| 11 | major | Từ hay sai | Nút "Luyện N từ của nhóm {tên}" không xuống dòng (`whitespace-nowrap`). Tên nhóm 60 ký tự làm nút dài khoảng 600px, tràn khỏi thẻ 360px và khỏi màn 375px. | `features/learner/practice/WeakWordsPage.tsx:76-78`; `app-ui/Button.tsx:41` (chỉ code: tài khoản thử chưa có từ hay sai) | Bọc chữ `truncate` như `SourceCard.tsx:81-83`, nút `w-full`. | đã sửa — ảnh `shots-before/d11-weak-unbroken-*` → `shots-after/d11-weak-unbroken-*` |
| 12 | major | Trang từ, thẻ ôn (nút loa) | Nút hiện chữ "UK"/"US" nhưng tên đọc là "Nghe giọng Anh"/"Nghe giọng Mỹ" (WCAG 2.5.3). Người điều khiển bằng giọng nói nói "bấm UK" thì không được. | `app-ui/SpeakButtons.tsx:21,39-40`; `messages/vi.json` `App.speak`; `shots/word-go-light-1280.png` | Chỉ đổi chữ: "UK, nghe giọng Anh" / "US, nghe giọng Mỹ" (en tương tự). | đã sửa — bằng chứng là test (không chụp được) |
| 13 | minor | Đang tải trong trang (Hôm nay, trang nhóm, backlog, Luyện tập, Từ hay sai, Lịch sử, Giao dịch, Tra từ, hộp Câu đã gặp) | Vòng tải dùng `FullScreenSpinner` cao bằng cả màn (`min-h-dvh`) nằm **trong** nội dung: đẩy mọi thứ xuống, rồi bố cục nhảy khi tải xong; trong hộp thoại thì tấm bật cao hết màn. | `shots/break-slow-today-375.png`, `break-slow-practice-375.png`; `app-ui/States.tsx:9-17` | Thêm biến thể nhỏ (`py-12`, không `min-h-dvh`) cho chỗ trong trang và trong tấm. | chưa sửa |
| 14 | minor (đã biết) | Từ lâu chưa ôn, Chọn từ theo chủ đề | Lỗi khi tải thì vòng tải quay mãi, hoặc hiện câu "không có từ" thay vì báo lỗi. | `features/learner/groups/BacklogPage.tsx:45-51,157-160`; `TopicPickerPage.tsx:401-407`; ledger:104 | `isError` → `ErrorState` + [Thử lại]. | chưa sửa |
| 15 | minor | Cài đặt | Khi tải gói hoặc nhắc học lỗi: "Gói hiện tại" hiện "…" mãi, các hàng mức sử dụng biến mất, công tắc nhắc học mờ mãi. Không có câu lỗi hay [Thử lại]. | `features/learner/settings/SettingsPage.tsx:105,152-153`; `UsageSection.tsx:13` (chỉ code) | `ErrorState` trong mục "Gói và mức sử dụng" + dòng lỗi dưới công tắc. | chưa sửa |
| 16 | minor | Lỗi tải chung (cả app) | Câu "Có lỗi xảy ra. Thử lại sau." đứng cạnh nút [Thử lại] dùng được ngay, hai thứ nói ngược nhau. Câu cũng không nói chuyện gì xảy ra (mẫu §3.1). | `shots/break-error500-today-375.png`; `messages/vi.json:891` | "Chưa tải được dữ liệu. Thử lại." (câu dùng chung, chủ dự án duyệt chữ). | chưa sửa |
| 17 | minor | Hộp Tạo nhóm / Đổi tên | Mất mạng thì ô "Tên nhóm" viền đỏ và câu lỗi mạng nằm dưới ô, nên người học tưởng tên sai (trái E16). | `shots/break-offline-create-375.png`; `features/learner/groups/GroupDialogs.tsx:301-316,358-365` | Chỉ lỗi trùng tên gắn vào ô; lỗi khác là một dòng `role="alert"` trên hàng nút. | chưa sửa |
| 18 | minor | Nhóm không có từ | Thẻ nhóm 0 từ ghi "Xong hôm nay". Trang nhóm có nút vàng "Học tất cả 0 từ". Câu trống "Nhóm chưa có từ nào." không có bước tiếp theo. | `shots/groups-light-1280.png`, `group-empty-light-375.png`; `groups/GroupCard.tsx:68-80`; `GroupPage.tsx:117-124,164` | `total === 0`: chip "Chưa có từ", ẩn nút ôn, [Thêm từ] làm nút chính, câu trống có bước tiếp. | chưa sửa |
| 19 | minor | Luyện tập, chưa có nhóm | Thẻ "Hôm nay" bảo "Chọn một nguồn bên dưới" trong khi cả 4 nguồn đều trống và không có nút nào (mẫu Trống §3.1). | `shots/practice-free-empty-dark-375.png`; `practice/PracticeHero.tsx:27-28` | Câu "Chưa có nhóm nào để luyện…" + link [Tạo nhóm đầu tiên]. | chưa sửa |
| 20 | minor | Đăng ký | [Tạo tài khoản] mờ tới khi tick ô đồng ý, nhưng không có dòng nào nói vì sao. Câu §4.1 cho trường hợp chưa tick không bao giờ hiện. Plan chọn cách "nút mờ", nên plan và bản chữ đang lệch nhau. | `shots/auth-register-errors-light-375.png`; `features/learner/auth/RegisterForm.tsx:121-126` | Nút bấm được; chưa tick thì ô tick đỏ + câu §4.1. **Cần chủ dự án chọn** (plan hay bản chữ). | chưa sửa |
| 21 | minor | Bắt đầu phiên luyện (429) | Hiện "Thử lại sau N giây." nhưng nút vẫn bấm được ngay và lại bị 429 (trái E15). | `shots/break-429-start-1280.png`; `practice/use-practice-starter.tsx:95-97` | Khóa nút tới hết `Retry-After`. | chưa sửa |
| 22 | minor | Phiên luyện, điện thoại | Design §4.7: nút chính dính đáy dưới 768px. Code chỉ làm vậy ở hộp Tùy chỉnh. [Kiểm tra] và [Gửi báo lỗi] có thể khuất dưới bàn phím hoặc màn. | `practice/session/TypeWordQuestion.tsx:99-135`; `app-ui/Dialog.tsx:65` (chỉ code) | Mẫu `sticky bottom-0 … md:static` của `CustomizeDialog.tsx:284`, hoặc ghi ruling. | chưa sửa |
| 23 | minor | Thẻ ôn mặt sau, Tra từ | Câu của từ điển ghi "Câu mẫu". Bảng thuật ngữ §2 xếp "câu mẫu" vào cột Tránh, dùng "Câu ví dụ" (trang từ và gợi ý luyện tập đã dùng "Câu ví dụ"). | `shots/review-back-light-375.png`, `lookup-dark-1280.png`; `messages/vi.json` `App.review.example`, `App.lookup.example` | Đổi cả hai thành "Câu ví dụ". | chưa sửa |
| 24 | minor | Thẻ ôn mặt trước | Câu hướng dẫn là "Bấm vào thẻ hoặc Space để lật", chữ chốt §17.1 là "Chọn thẻ hoặc nhấn Space để lật" (điện thoại "Chọn thẻ để lật"). | `shots/review-front-light-1280.png`; `messages/vi.json` `App.review.hintWeb/hintPhone` | Sửa hai chuỗi. | chưa sửa |
| 25 | minor | Tấm Thêm từ (hết số từ tự thêm) | Câu lỗi dùng "từ riêng", từ bị cấm trên màn người học (§2, D17). | `messages/vi.json:795` `App.addWord.privateLimit` | "…số từ tự thêm tối đa. Xóa bớt một từ trong Từ của tôi…". | chưa sửa |
| 26 | minor | Tra từ, thẻ xem trước (≥1280) | Viền thẻ `border-ink` đậm 100%; §15 điểm 6 chốt viền ngoài 30%. Bản tối thành viền trắng chói. | `shots/lookup-dark-1280.png`; `features/learner/lookup/LookupPage.tsx:119` | `border-ink/30`. | chưa sửa |
| 27 | minor | Tra từ, không có kết quả | Lọc mà không gõ từ (ví dụ "Chỉ từ của tôi") vẫn ghi "Không tìm thấy từ này" + [Thêm từ này], mở ra tấm trống. Có gõ từ thì tiêu đề không nhắc lại từ đã gõ. | `shots/lookup-empty-light-375.png`; `LookupPage.tsx:56` | Có `q`: "Không tìm thấy “{q}”". Chỉ có lọc: "Không có từ nào khớp bộ lọc." + [Xóa lọc]. | chưa sửa |
| 28 | minor | Trang từ, chip "Đang học" | Nhiều nhóm nối bằng ", " trong khi tên nhóm có thể chứa dấu phẩy, nên hai nhóm đọc như một tên. | `shots/word-learning-light-375.png`; `features/learner/word/SenseBlock.tsx:46` | "Đang học · 2 nhóm", hoặc mỗi nhóm một dòng. | chưa sửa |
| 29 | minor | Lưu vào nhóm khi chưa có nhóm nào | [Tạo nhóm đầu tiên] mở danh sách trống "Tất cả nhóm (0)". Người học mới phải tự đoán là cần gõ tên rồi bấm [Tạo nhóm và lưu]. | `features/learner/add-word/GroupPicker.tsx:59,69`; `DeckPickerDialog.tsx` (chỉ code) | Khi chưa có nhóm: ẩn danh sách, ô tìm ghi "Tên nhóm", hiện câu §4.3. | chưa sửa |
| 30 | minor | Tấm Thêm từ, không tìm thấy | Câu "Wordmet chưa có từ “rizz”. Tự nhập nghĩa để lưu." chỉ đường tự nhập, ngay trên nút vàng [Tra bằng AI]; §7.16 dùng câu khác. | `shots/addword-ai-light-375.png`; `messages/vi.json:774` | Dùng câu §7.16, hoặc bỏ vế sau. | chưa sửa |
| 31 | minor | Tấm Thêm từ | "Đang tra…" và "không tìm thấy" của lần tra từ điển không nằm trong vùng live, nên trình đọc màn hình không biết kết quả (tấm AI thì có). | `AddWordSheet.tsx:353` so với `AiLookupPanel.tsx:108-111` | `role="status"` cho hai dòng đó. | chưa sửa |
| 32 | minor | Vùng bấm nhỏ trên điện thoại | Mỗi vùng dưới đây thấp hơn 24px. axe không báo vì có khoảng trống quanh chúng, nhưng ngón tay khó chạm trúng.<br>• [Bỏ khỏi nhóm] 90×17. Bấm là bỏ ngay, không hỏi lại.<br>• [Báo lỗi] 76×17.<br>• Nút × của dải thông báo AI, 20px.<br>• Tên nhóm ngắn ("x") là link 12×25.<br>• "Quên mật khẩu?" 108×17.<br>• "Quay lại" 77×17.<br>• "Sửa" 27×20, và nút "Tiếng Việt ›" cao 20px ở Cài đặt. | metrics `group-long-*`, `session-*`, `today-*`, `auth-login-*`, `auth-forgot-password-*`, `settings-*` | Thêm `min-h-6`/`py-1` (giữ cỡ chữ). Thẻ nhóm: cả thẻ là vùng bấm. [Bỏ khỏi nhóm]: thêm toast [Hoàn tác]. | chưa sửa |
| 33 | minor | Cài đặt, đổi ngôn ngữ | Bấm "English" thì nút vẫn ở "Tiếng Việt" tới khi trang tải lại. Trên điện thoại tấm đóng ngay, không có gì đổi. Bấm lại thì gửi thêm một `PATCH`. | `features/learner/settings/SettingsPage.tsx:57-66,121-126` (chỉ code) | `useSubmitOnce` + trạng thái chờ. | chưa sửa |
| 34 | minor | Cài đặt, điện thoại | Tấm chọn Ngôn ngữ/Giao diện không có nút đóng hay [Hủy]. | `SettingsPage.tsx:216-225` | Thêm `closeLabel` hoặc [Đóng]. | chưa sửa |
| 35 | minor | Cài đặt, mức sử dụng | Hai kiểu thanh cùng màu mà ngược nghĩa: "Phiên luyện" đầy khi **dùng**, "Lượt câu AI" đầy khi **còn**. Đọc lướt dễ hiểu nhầm. | `shots/settings-light-1280.png`; `settings/UsageSection.tsx:23,64` | Cả ba thanh cùng một nghĩa (còn lại). | chưa sửa |
| 36 | minor | Cài đặt, web | Tiêu đề "Cài đặt" sát mép trái, không thẳng với cột nội dung ở giữa (trang Tài khoản và Giao dịch thì thẳng). | `shots/settings-light-1280.png`; `SettingsPage.tsx:80-81` | Đưa tiêu đề vào cột `max-w-3xl`. | chưa sửa |
| 37 | minor | Cài đặt, điện thoại | Dòng phụ "Sáng, tối hoặc theo hệ thống của máy" đẩy "Theo hệ thống ›" xuống dòng, lệch hàng trên. Chữ cũng lệch §5.2 ("Sáng, tối hoặc theo máy"). | `shots/settings-light-375.png`; `messages/vi.json` `App.settings.themeHint` | Đổi chữ theo §5.2; giữ nút bên phải. | chưa sửa |
| 38 | minor | Cài đặt | Link "Xem gói học" viết thường, §17.1 chốt "Xem Gói học" (tên trang). | `messages/vi.json` `App.settings.seePlans` | Đổi chữ. | chưa sửa |
| 39 | minor | Tài khoản, web | Không có link "‹ Cài đặt", trong khi trang anh em "Lịch sử giao dịch" có. | `shots/settings-account-light-1280.png` so với `transactions-light-1280.png`; `settings/AccountPage.tsx:28-29` | Thêm `BackLink` như `TransactionsPage`. | chưa sửa |
| 40 | minor | Xác minh email | Nếu lần xin mã đầu lỗi (429, mail lỗi), màn vẫn ghi "Mã đã gửi tới {email}" và vẫn đếm 60 giây, cạnh dòng lỗi. | `features/learner/auth/VerifyEmailForm.tsx:32,41-45,109,130-131` (chỉ code) | Lỗi thì bỏ câu "đã gửi", đếm theo `Retry-After`. | chưa sửa |
| 41 | minor | Chọn ngôn ngữ, điện thoại | Nhãn phải là "Ngôn ngữ của nghĩa và giao diện" (§12 vòng 2); code ghi "Ngôn ngữ" ở mọi bề ngang. | `features/learner/auth/WelcomeLanguage.tsx:48` (chỉ code) | Nhãn dài dưới 768px. | chưa sửa |
| 42 | minor | Đăng ký, Tài khoản | Ô Ngày sinh gợi ý "dd/mm/yyyy" (viết tắt tiếng Anh) trên màn tiếng Việt, trong khi câu lỗi nói "ví dụ 14/5/2008". | `shots/auth-register-light-375.png`; `messages/vi.json` `App.ui.dob.placeholder` | "14/5/2008" hoặc "ngày/tháng/năm". | chưa sửa |
| 43 | minor | Đăng ký, web ≥1024 | Dòng phụ dưới "Tạo tài khoản" lặp nguyên văn tiêu đề lớn ở khung trái, nên câu đó hiện hai lần cạnh nhau. | `shots/auth-register-errors-dark-1280.png`; `RegisterForm.tsx:74` | Chỉ hiện dòng phụ dưới 1024px. | chưa sửa |
| 44 | minor (đã biết) | Lịch sử giao dịch, web | Ở 1280, cột "Kỳ được dùng" và "Loại" xuống hai dòng vì 7 cột chia đều. | `shots/transactions-light-1280.png`; ledger M4b | `whitespace-nowrap` cho ô ngày/kỳ. | chưa sửa |
| 45 | minor | Danh sách nhóm (≥10 nhóm) | Ô "Tìm trong N nhóm" không có kiểu focus (`outline-none`, khung bọc không đổi viền). Tab vào chỉ thấy con trỏ nháy. | `features/learner/groups/GroupListPage.tsx:196-204` (chỉ code) | `focus-within:border-primary` cho khung. | chưa sửa |
| 46 | minor | Danh sách nhóm | Chip "8 nhóm · 428 từ" nằm trong `h1`, nên vạch tô vàng chạy dưới cả chip và tên đọc của tiêu đề gồm cả con số. | `shots/groups-light-1280.png`; `GroupListPage.tsx:159-173` | Đưa chip ra `aside` như Hôm nay. | chưa sửa |
| 47 | minor | Hôm nay, "N từ theo ngăn" | Cột số `w-14` quá hẹp: "428 / 428" đã xuống hai dòng. | `shots/today-light-1280.png`; `TodayPage.tsx:176` | `min-w-14 whitespace-nowrap tabular-nums`. | chưa sửa |
| 48 | minor | Trang nhóm, ô lọc | Chọn mục lọc 0 từ thì hiện khung rỗng, không có câu nào. | `GroupPage.tsx:163-170` (chỉ code) | "Không có từ nào ở mục này." | chưa sửa |
| 49 | minor | Chọn từ theo chủ đề | Đã học hết từ của chủ đề mà vẫn hiện ô tick "Chọn tất cả (0 từ chưa học)" (tick không làm gì), không có câu báo. Nhãn "Đang học · tên, tên" dài, chiếm 2–3 dòng. | `shots/topic-light-1280.png`; `TopicPickerPage.tsx:411-446` | Ẩn ô tick, hiện "Bạn đang học mọi từ của chủ đề này."; nhãn `truncate`. | chưa sửa |
| 50 | minor | Từ lâu chưa ôn, trống | Chỉ có một câu, không có bước tiếp hay link về nhóm. Ở 1280 khối trống cao khoảng 420px. | `shots/backlog-light-375.png`, `backlog-dark-1280.png`; `BacklogPage.tsx:156-160` | Link "Về nhóm ⟨tên⟩"; `xl:self-start`. | chưa sửa |
| 51 | minor | Trang nhóm, lúc tải | Lúc đang tải số liệu, nút chính ghi "Học tất cả N từ" rồi đổi thành "Ôn N thẻ". Các chip và biểu đồ ngăn bỗng hiện ra. | `GroupPage.tsx:84,90,109-138` (chỉ code) | Giữ chỗ (khối mờ) khi đang tải. | chưa sửa |
| 52 | minor | Chọn từ theo chủ đề | "‹ Quay lại" luôn về Danh sách nhóm, kể cả khi mở từ trang một nhóm. | `TopicPickerPage.tsx:304` (chỉ code) | Có `groupId` thì về trang nhóm đó. | chưa sửa |
| 53 | minor | Hôm nay, Nhóm, trang nhóm, điện thoại | Nút + nổi che phần phải của nội dung cuối trang (che mũi tên ô lọc), vì `main` chỉ chừa `pb-24`. | `shots/group-empty-light-375.png`; `app-chrome/AppShell.tsx:55,118` | `pb-40` cho `main` khi có nút nổi. | chưa sửa |

## Đã kiểm, không có lỗi

- axe WCAG 2.2 AA: **0 vi phạm** ở 220 lần đo (mọi màn, sáng/tối, 375/1280, kể cả ảnh break-ui). Cách đo có điểm mù:
  - axe tính tương phản theo màu đã vẽ, nên lỗi #3 (lớp phủ sáng lên ở bản tối) vẫn qua axe.
  - Với ảnh hộp thoại, axe đo trang phía sau tấm, không đo bản thân tấm.
- Cuộn ngang ở 375px: chỉ có lỗi #1. Tên 60 ký tự có dấu, tên/email rất dài, số rất lớn và chữ AI rất dài đều xuống dòng gọn ở mọi màn còn lại.
- Tương phản token: các agent tính lại trong phiên, mọi cặp chữ/nền ≥ 4,5:1, viền ô nhập ≥ 3:1, cả sáng lẫn tối.
- Không có màu viết cứng ngoài lá cờ (màu cờ cố định theo §12).
- Có luật `prefers-reduced-motion`.
- Mất mạng khi lưu từ không làm mất chữ đã gõ.
- Phím tắt không chạy khi đang gõ trong ô.

## Chưa kiểm được (cần thêm dữ liệu hoặc ảnh)

- **Thanh trên ở 768–1279px**: chưa chụp. Theo ảnh 1280, các phần tử cộng lại khoảng 1.100px, nên có thể bị bóp hoặc tràn (`ASSUMPTION`).
- **Chưa có dữ liệu thử**: Lịch sử luyện tập có dòng, Từ hay sai có từ, bảng Từ lâu chưa ôn có từ.
- **Chưa có ảnh**:
  - phiên luyện: ba kiểu câu AI, câu gõ, tấm báo lỗi, tổng kết, các trạng thái AI;
  - Sửa trước khi lưu, Thêm cả loạt, Xóa từ;
  - menu ⋯, hộp Xóa nhóm;
  - xác minh email, đặt lại mật khẩu.

  Các màn này mới chỉ kiểm qua code.

## Cần chủ dự án quyết

- **Dải tra từ trên trang Cài đặt**: dải tra đang hiện trên Cài đặt, Tài khoản và Giao dịch, theo ruling Task 23. Bản chữ §5.2 (D16) lại ghi Cài đặt
  không có dải tra. Audit không tính chỗ này là lỗi; giữ ruling hay theo D16 là việc của chủ dự án.
- **Dòng #20 (Đăng ký)**: plan và bản chữ đang khác nhau, cần chọn một bên.

## Ghi chú kỹ thuật

- Script Playwright tạm cho audit nằm ở `apps/web/e2e-audit/`, chưa commit. Nó chạy lại được để chụp ảnh before/after ở giai đoạn 2; xóa khi xong.
- Đã cấp quyền admin cho `audit-admin@example.com` trong DB thử `english_learning_learner_ui` bằng một lệnh `UPDATE users SET staff_role='admin'`. Lệnh
  này làm đúng việc của `admin:grant`; CLI đó lỗi khi đọc `.env` hiện tại nên không dùng được.
