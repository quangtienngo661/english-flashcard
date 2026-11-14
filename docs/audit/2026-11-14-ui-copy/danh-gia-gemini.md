# Đánh giá đề xuất chữ giao diện của Gemini (14/11/2026)

**Đầu vào:** bản audit, bảng thay đổi và hai file JSON đầy đủ do Gemini viết (bạn dán trong chat ngày 14/11). Hai file JSON này giống bản
`en.json`/`vi.json` bạn đã đặt vào worktree chính rồi revert hôm nay. Bản sao lưu nằm trong scratchpad của session, ở thư mục `messages-backup`.
**Đối chiếu với:** bản `dev` hiện tại và báo cáo `vong-1.md`.

## 1. Kết luận

- **Không dùng hai file JSON đầy đủ của Gemini.** Câu xác nhận cuối bản audit ("số key 1.359, cấu trúc và placeholder khớp 100% với bản gốc") **sai**:
  - Đếm cùng cách thì file của Gemini có 1.041 key, file `dev` có 1.359 key.
  - 627 key của `dev` không có trong file Gemini, và 309 key trong file Gemini không có trong code ở bất kỳ nhánh nào.
  - Bằng chứng: lần build web hôm nay dừng ở type check. Ví dụ `WordPage.tsx:284` gọi key `addSentence`, nhưng file Gemini không có key này.
- **Bảng thay đổi của Gemini dùng được một phần.** Đa số hướng sửa trùng với `vong-1.md`. Nhưng cột "Cũ" của bản EN có chỗ không phải chữ đang có trên `dev`, ví dụ `App.auth.verify.wrongCode`, `App.auth.verify.locked`, `App.auth.complete.updatedBody`. Vậy Gemini đã đọc một bản khác, nên từng dòng phải đối chiếu lại trước khi áp.

## 2. Chỗ Gemini đề xuất đúng (trùng với `vong-1.md`, sẽ dùng ở vòng 2)

| Hướng sửa | Mục trong `vong-1.md` | Ví dụ từ Gemini |
|---|---|---|
| Bỏ chấm cuối tiêu đề | 2.8 | `App.transactions.emptyTitle` "Chưa có giao dịch nào" |
| Bỏ dấu phẩy trước "và", "hoặc" | 2.14 | `Legal.privacyLead`, `App.lookup.emptyBody` |
| "02 ngày" → "2 ngày" | 2.14 | `Legal.privacyHelpBody` |
| Bỏ "hãy" | 2.9 | `App.errors.reauth-required` "Xác nhận lại bằng tài khoản Google trước khi xóa." |
| Lỗi theo mẫu "Không … được" + việc cần làm | 2.4 | `App.errors.google-failed` "Không đăng nhập được bằng Google. Thử lại." |
| "chưa đúng" → "không đúng" + "Thử lại." | 2.4 | `App.errors.invalid-credentials` |
| EN lỗi theo mẫu "Couldn't …" | 2.4 | `App.errors.mail-unavailable` "Couldn't send the email. Try again in a few minutes." |
| EN dùng "deck" ở mọi chỗ | 2.2 | `Nav.groups` "Decks", `App.lookup.otherGroup` "Another deck or create one" |
| Dịch `Metadata.*` sang EN | 2.3 | "Wordmet · Learn, remember, and use English vocabulary" |
| "look-ups" → "lookups", "AI uses" → "AI credits" | 2.14, bảng thuật ngữ | `App.houseAd.ai`, `App.houseAd.lead` |
| `App.deleteAccount.doneTitle` "Đã xóa tài khoản" | 2.8, 2.12 | |

## 3. Chỗ Gemini sai hoặc không nên theo

| Vấn đề | Ví dụ | Vì sao |
|---|---|---|
| **Thêm tính năng không có** | `settings.sound` "Âm thanh", `settings.remindersTime` "Giờ nhận email", `settings.voice`, `word.notes` "Ghi chú của bạn", `plans.features.sync` "Đồng bộ giữa web và điện thoại", `plans.features.practiceUnlimited`, `plans.billedMonthly`, `practice.session.summary.accuracy`, `timeSpent`, `quitConfirm` | App không có các tính năng này. Giờ gửi email nhắc là cài đặt chung của hệ thống, chưa có app điện thoại, gói Pro có 30 phiên mỗi ngày chứ không phải không giới hạn. Đề bài yêu cầu giữ nghĩa. |
| **Lời hứa pháp lý tự đặt ra** | `deleteAccount.keep.invoices` "giữ tối thiểu 5 năm theo quy định kế toán" | Bản `dev` dùng `{years}` lấy từ cấu hình. Con số 5 năm và câu "theo quy định kế toán" chưa ai xác minh. |
| **Còn chữ Việt trong bản EN** | `Landing.learn.review.bins[*].value` "1 ngày", `calendar.month.cellSessions` "luyện {count…}" | Lỗi dịch sót. |
| **"Log in" và "Sign in" lẫn nhau, tệ hơn bản cũ** | `auth.login.title` "Log in", `auth.login.passwordReset` "Sign in with your new password" | Bản `dev` chỉ lệch ở `Nav.login`. File Gemini lệch ở cả màn đăng nhập. |
| **Tên văn bản pháp lý không đều** | `Footer.privacy` "Privacy policy" nhưng `auth.required.consent` "Terms of Use and Privacy Policy" | Q6 chưa chốt, Gemini viết hai kiểu trong cùng một file. |
| **Không sửa nút "Cần ôn lại" trong EN** | `review.again` "Still learning", `recall.needsReview` "Review again", `customize.sorts.priority_oldest` "Oldest Still learning first" | Vấn đề nặng nhất của bản EN (2.1) vẫn còn. |
| **Không sửa số nhiều** | `addWord.bulkResult` "Added {added, number} words", `addWord.ai.left` | Vẫn hiện "Added 1 words" (2.7), dù bản audit nói đã kiểm ICU. |
| **Giữ giọng suồng sã** | `resultWrong` "Not quite", `rate-limited` "You’re going a bit fast", `quota-exhausted` "You’ve used them all", `today.allDone` "Mai ôn tiếp" | 2.5 chưa được xử lý. |
| **Nút Pro ở landing hứa sai** | `Landing.plans.proSignup` "Đăng ký Pro" / "Get Pro" | Nút này dẫn tới trang tạo tài khoản (`PricingSection.tsx:97`, `href={register}`), không phải trang mua Pro. Người bấm sẽ thấy form đăng ký chứ không thấy Pro. |
| **Đổi nghĩa** | `captcha-unavailable` "Không kiểm tra được bảo mật lúc này" (đây là bước chống bot, không phải "bảo mật"); `google-unavailable` "đang tạm dừng" (nghe như chủ động tắt); `review.doneBody` "Các thẻ này sẽ quay lại theo lịch ôn" (bản `dev` nói thẻ Cần ôn lại về Bậc 1 và lên đầu nhóm) | Giữ nghĩa là ràng buộc của đề bài. |
| **Giữ chuyện thanh toán trên landing** | `Landing.plans.title` "Two plans, no auto-renewal", `freeNote` "no credit card required" | Ngược với hướng bạn vừa chốt cho landing (`faq-de-xuat.md` mục 5). |

## 4. Nút "Cần ôn lại" trong EN: bạn đề xuất "Need review"

**Ý của bạn:** đổi "Review again" thành "Need review".

**Đề xuất của mình:** đồng ý bỏ cả "Review again", "Still learning" và "Again" để chỉ còn một tên. Mình đề nghị hai điểm khác nhỏ:

1. **Viết "Needs review", có "s".** "Need review" là câu thiếu chủ ngữ ("I need review"), nghe không tự nhiên. "Needs review" là cách tiếng Anh vẫn dùng cho trạng thái của một thứ. Ví dụ trong app:
   - nút: "Needs review"
   - tiêu đề danh sách: "Needs review · 3 words"
   - dòng phản hồi: "Needs review: mitigate"
   - câu hướng dẫn: "Words you marked Needs review, oldest first"
2. **Đổi nút cặp với nó từ "Know" thành "Known".** Khi đó cả hai nút cùng tả trạng thái của từ, giống bản VI ("Cần ôn lại" / "Đã biết"). Lịch học đã dùng "Known" sẵn (`calendar.day.known`).

**Phạm vi:** 14 chuỗi về "Needs review" (5 "Still learning", 8 "Review again", 1 "Again") và 8 chuỗi về "Known". Chỉ đổi value, key giữ nguyên.

**Phương án khác nếu bạn muốn giữ "Know":** "Needs review" / "Know" vẫn đọc được, nhưng một nút tả trạng thái của từ còn nút kia là lời người học nói ("tôi biết").
