# Audit UI copy Việt – Anh của Wordmet

**Ngày:** 15/11/2026 (cập nhật nhóm `Landing` đối chiếu với `dev` tại `c71d938c` ngày 20/11/2026, đồng bộ bản copy landing đã chốt). **Phạm vi:** `apps/web/messages/vi.json` và `apps/web/messages/en.json` (web người học, gồm landing và app).
Ví dụ về giới hạn câu AI nằm ở cặp file này. Cặp file admin, nội dung do API trả về và các chuỗi ngoài hai tệp không thuộc phạm vi.
Mỗi đề xuất có value cũ và value mới trong bảng thay đổi.

Đã rà **1.491 cặp chuỗi**. Đề xuất **357** thay đổi ở VI và **355** ở EN; **44** nhóm vấn đề cần chốt. Áp dụng sentence case, câu ngắn, một thuật ngữ cho mỗi khái niệm và chỉ đưa bước xử lý khi phù hợp với trạng thái.

Tham chiếu: [Microsoft Vietnamese Localization Style Guide](https://download.microsoft.com/download/b/f/e/bfecb1b4-21ab-48fd-a48c-c2471b026f8f/vie-vnm-StyleGuide.pdf) (§4.1.5, §4.1.14, §5.5.2); [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice); [hướng dẫn viết lỗi và nút của Microsoft](https://learn.microsoft.com/en-us/windows/apps/design/style/writing-style); `docs/preparation/reports/Cách viết landing page Wordmet.md`. Quy tắc riêng của Wordmet theo yêu cầu audit.

## 1. Bảng thuật ngữ

| Khái niệm | Cách gọi trong hai file gốc | Cách dùng trong bản đề xuất (VI / EN) |
| --- | --- | --- |
| Đơn vị từ vựng | VI: `từ`, `từ vựng`. EN: `word`, `vocabulary`. | **từ / word** cho một mục; **từ vựng / vocabulary** cho nội dung học nói chung. |
| Một nghĩa của từ | VI: `nghĩa`, `nghĩa từ`. EN: `meaning`; `definition` dùng ở gợi ý và nội dung định nghĩa. | **nghĩa / meaning**. Dùng **định nghĩa / definition** khi chỉ phần diễn giải nghĩa; hai nhãn cùng xuất hiện trong gợi ý. |
| Từ do người học tự thêm | VI: `từ riêng`, `từ bạn tự thêm`, `Từ của tôi`. EN: `your own words`, `words you added yourself`, `My words`. | **từ bạn tự thêm / words you added**. Giữ **Từ của tôi / My words** là tên mục. |
| Nhóm chứa từ | VI: `nhóm`, `nhóm từ`. EN: `deck`. | **nhóm từ / deck** khi giới thiệu hoặc ngoài ngữ cảnh; **nhóm / deck** khi màn hình đã chỉ rõ đối tượng. |
| Thẻ dùng khi học/ôn | VI: `thẻ từ`, `thẻ`, `ôn thẻ`. EN: `card`, `card reviews`. | **thẻ / card**; **ôn thẻ / review cards** cho hành động. |
| Bậc ôn | VI: `bậc`, `Bậc 1`, `Mới`. EN: `level`, `Level 1`, `New`. | **bậc / level**; giữ **Mới / New** và **Bậc 1 / Level 1** ở tên trạng thái. |
| Phiên luyện | VI: `phiên`, `phiên luyện`, `Luyện tập`. EN: `session`, `practice session`, `Practice`. | **phiên luyện / practice session** cho đơn vị hạn mức; có thể rút còn **phiên / session** trong phiên. **Luyện tập / Practice** là tên màn hình. |
| Câu hỏi AI | VI: `câu AI`, `câu AI viết`, `câu luyện`. EN: `AI sentence`, `AI-written questions`, `AI questions`. | **câu AI / AI question** cho câu hỏi; **câu do AI viết / AI-generated sentence** khi nói riêng về phần câu tiếng Anh. |
| Lượt AI để tạo câu hỏi | VI: `lượt AI`, `lượt`, `lượt câu AI`, đôi khi `câu AI` ở hạn mức. EN: `credits`, `AI credits for questions`, `AI questions` ở hạn mức. | **lượt câu AI / AI credits for questions**. Dùng **AI credits** nếu ngay trên cùng dòng đã nêu `AI question` và không có loại lượt khác. |
| Lượt tra từ bằng AI | VI: `lượt tra AI`, `lượt tra từ bằng AI`. EN: `AI credits for lookups`, `AI lookups`. | **lượt tra AI / AI credits for lookups** khi đếm hạn mức; **tra từ bằng AI / AI lookup** khi nói thao tác. **lượt AI / AI credits** khi nói chung hai loại. |
| Từ cần ưu tiên | VI: `từ ưu tiên`, `từ đang ưu tiên`, `Cần ôn lại`. EN: `priority words`, `Needs review`. | **từ ưu tiên / priority words** cho danh sách; **Cần ôn lại / Needs review** cho lựa chọn khi học. |
| Từ làm sai nhiều lần | VI: `Từ hay sai`, `từ hay sai`. EN: `Weak words`, `weak words`. | **từ hay sai / weak words**; dùng sentence case ở tên mục. Quy tắc vào/rời danh sách cần chốt riêng. |
| Câu do người học lưu | VI: `câu đã gặp`, `Câu đã gặp`. EN: `saved sentence`, `Saved sentences`. | **câu đã gặp / saved sentence**. Phân biệt **câu ví dụ / example sentence** của từ điển. |
| Gói và trang xem gói | VI: `Miễn phí`, `Gói Miễn phí`, `Pro`, `Dùng thử`, `Gói học`. EN: `Free`, `Free plan`, `Pro`, `Trial`, `Plans`. | **gói Free / Free plan**, **gói Pro / Pro plan**, **gói Dùng thử / Trial plan**, **Gói học / Plans**. Dùng **miễn phí / free** khi chỉ giá, không gọi tên gói. |
| Dừng lần gia hạn kế tiếp | VI: `Hủy gói`, `Hủy gia hạn`. EN: `Cancel plan`, `Cancel renewal`. | **Hủy gia hạn / Cancel renewal** khi gói vẫn dùng đến hết kỳ. Hành động hủy do cửa hàng ứng dụng quản lý giữ hướng dẫn hiện có. |
| Báo lỗi câu hỏi | VI: `Báo lỗi`, `Gửi báo lỗi`, `Báo lỗi của tôi`. EN: `Report`, `Send report`, `My reports`. | **Báo lỗi / Report a problem** cho nút mở; **Gửi báo lỗi / Send report** cho nút gửi; giữ **Báo lỗi của tôi / My reports** là tên mục. |

### Các mẫu tương tự dòng giới hạn AI

| Mẫu | Cách biên tập |
| --- | --- |
| Giới hạn và số còn lại | `App.practice.customize.aiMax` và `aiMaxLeft` hiện cùng hai đại lượng: trần câu AI trong phiên và số lượt câu AI còn dùng được. `CustomizeDialog.tsx` tính `aiMax = min(aiCap, aiLeft)`; khi số lượt là giới hạn thì hai số bằng nhau. Dùng cùng mẫu ở cả hai nhánh: «Tối đa 3 câu AI · còn 3 lượt câu AI». Không gộp hai số: ở nhánh kia có thể là «Tối đa 3 câu AI · còn 12 lượt câu AI». |
| Số lượt cần và còn lại | `App.practice.customize.quotaBody` đưa số cần và số còn lại cạnh nhau, bỏ lời dẫn. Mốc cấp lại nằm ở `quotaRefillDate`/`quotaRefillTime`. |
| Thời điểm luyện tiếp | `App.practice.usage.out`, `outShort` và `App.practice.weak.reopens` dùng cùng thông báo; biến thể có `{wait}` vẫn giữ thời gian chờ. |
| Kỳ học và ngày hiệu lực | `App.plans.startsOn` đưa ngày bắt đầu kỳ tiếp theo lên đầu; `App.plans.subscriptions.dialogBody` đặt mốc còn dùng được trước thông tin ngừng gia hạn và không hoàn tiền. |
| Mức sử dụng trong Settings | Trong Settings, để `used/limit` và `remaining/limit` lên đầu. Có thể rút chữ lặp ở dòng refill dưới nhãn `aiPractice` hoặc `aiLookup` sau khi chốt thời điểm thực sự có lượt mới. |
| Thông báo lỗi | Khi tiêu đề đã mô tả sự cố, dùng thân câu cho bước tiếp theo. Ví dụ `App.auth.login.lockedTitle` + `lockedBody`, và `App.transactions.error` chỉ nói lý do màn hiện lỗi vì `ErrorState` đã có nút Thử lại. |
| Đưa số lên trước | Đặt nội dung chính trước. Giới hạn số nhóm và lượt tra AI còn lại dẫn trước bước tiếp theo hoặc lượng đã dùng (`App.groups.limit`, `App.addWord.result.used`). |

## 2. Câu cần chốt

Những chuỗi dưới đây giữ nguyên trong JSON trừ khi mục đó ghi rõ chỉ đề xuất chỉnh câu mà vẫn giữ nguyên nghĩa.

| STT | Key | Vấn đề và căn cứ | Điểm cần chốt |
| ---: | --- | --- | --- |
| 1 | `Landing.plans.freeList.2`,<br>`Landing.plans.proList.0` ↔ `App.plans.freeList.sessions`,<br>`App.plans.proList.sessions` | **Đã xử lý trên `dev` (PR #312):** Hai chuỗi trên landing đã chuyển sang `{count} phiên luyện mỗi ngày` / `{count} practice sessions a day` và đọc live từ API qua `LandingLive.tsx` + `PricingSection.tsx` (`withCount()` dùng `fill()`). | Đã chốt phần đồng bộ dữ liệu. Chỉ lưu ý phụ: nếu admin từng đặt `count = 1`, bản EN sẽ hiện `1 practice sessions a day` vì `PricingSection.tsx` dùng `fill()` chứ chưa dùng ICU plural. |
| 2 | `Landing.plans.freeList.3`;<br>`Landing.plans.proBadge`;<br>`Landing.plans.aiList.1`;<br>`Landing.plans.aiList.3` | “Dùng thử/Try” trên Free dễ hiểu là thử một lần/Pro trial; “Có AI/AI included” chỉ nổi bật trên Pro dễ gợi ý AI độc quyền; “cho từng từ” không diễn đạt giới hạn. Defaults: Free 15 lượt câu AI + 5 lượt tra AI, Pro 300 + 100; app đọc cấu hình từng nhóm lượt và 0/0 tắt AI trên Free. settings.definitions.ts chỉ kiểm tra quan hệ giữa số phiên Free/Pro, không đảm bảo Pro luôn nhiều lượt AI hơn Free. Free tính tháng lịch theo múi giờ người học; Pro theo mốc chu kỳ theo UTC (entitlements/rules/ai-cycle.ts và cycle.ts). Chưa xác minh số trên môi trường chạy. | Giữ copy claim hiện tại để owner chọn giữa mô tả quyền lợi có điều kiện và cấp dữ liệu cấu hình cho cả hai mặt. Khi chốt dữ liệu, thống nhất “gói Free” và dùng “lượt” cho giới hạn chứ không gọi đó là số câu đã tạo. FAQ câu so sánh gói nằm ngoài hai dictionary và cũng cần đối chiếu khi sửa. Trong bản nháp, các key App.plans.freeList.ai và App.plans.proList.ai chỉ chuẩn hóa tên hai loại lượt, giữ nguyên số và cách nói «mỗi tháng». |
| 3 | `Metadata.description`,<br>`Landing.learn.review.title`,<br>`Landing.learn.review.body`,<br>`Landing.learn.review.bins.2.label`,<br>`Landing.learn.review.bins.3.label`,<br>`Landing.learn.review.bins.4.label` | “Đúng lúc sắp quên” và các mốc gắn kết quả “dùng được/nhớ lâu” là lời quảng bá. Repo có lịch theo Bậc cố định 1, 3, 7, 14, 30 ngày (learning.constants.ts), không thấy cơ chế đo lúc sắp quên trong schedule.ts. **Đã chốt một phần (20/11/2026):** `Landing.learn.review.title` đổi sang «Ghi nhớ qua từng cột mốc» / «Retain words at every milestone» (với eyebrow «Nhắc lịch tự động» / «Automatic reminders»), và `LearnSection.tsx` bỏ hiển thị `body`. | Đã bỏ cụm “đúng lúc sắp quên” ở tiêu đề bước 3; chỉ còn `Metadata.description` và nhãn mốc `bins.*` nếu cần rà thêm. |
| 4 | `Landing.groups.lead` | **Đã chốt (20/11/2026):** Section nhóm chuyển sang «Nhóm từ theo chủ đề» / «Topic decks» với câu dẫn ngắn «Chọn chủ đề và trình độ để học ngay» / «Pick a topic and level to start». | Đã chốt. |
| 5 | `Landing.learn.practice.body`,<br>`Landing.learn.practice.demoTitle`,<br>`Landing.learn.practice.choices` | **Đã xử lý phần `body` (20/11/2026):** `LearnSection.tsx` đã bỏ đoạn mô tả `body` ở cả 3 bước; bước 2 hiện gọn «Luyện tập · Điền từ vào câu» / «Practice · Use words in sentences». | Nếu sau này muốn đồng bộ sâu hơn giữa demo trắc nghiệm (`choices`) và cụm «Điền từ vào câu», có thể rà lại minh họa demo. |
| 6 | `Landing.learn.listen.eyebrow`,<br>`Landing.learn.listen.title` | **Đã xử lý (20/11/2026):** Bước «Nghe phát âm» (`listen`) cùng các key `Landing.learn.listen.*`, `Landing.learn.lead` và `Landing.learn.*.body` đã được gỡ khỏi `LearnSection.tsx` và cặp file `vi.json` / `en.json` (rút còn 3 bước: Lưu từ → Luyện tập → Nhắc lịch tự động). | Đã chốt. |
| 7 | `Legal.draftNotice` | Thông báo gọi nội dung là bản nháp và hứa bản chính thức trước lúc ra mắt. getLegal trả null cả khi chưa xuất bản lẫn API không truy cập được hoặc trả dữ liệu lỗi; hai page dùng cùng thông báo cho cả hai. Không thể suy ra trạng thái xuất bản từ null. | Giữ nguyên lời công bố; owner chọn câu trung tính về tài liệu chưa hiển thị hoặc tách trạng thái/API trước khi viết hai thông báo. |
| 8 | `App.houseAd.lead` | `ai-cycle.ts` và `cycle.ts` tính Pro theo chu kỳ tháng từ mốc kích hoạt, Free không có mốc theo tháng lịch. `UsageSection.tsx` ẩn ngày có lượt mới cho Pro/Trial vì gói trả trước có thể hết hạn. | Chốt có giữ ‘mỗi tháng’ cho ưu đãi Pro đang còn hiệu lực hay dùng ‘mỗi chu kỳ’ kèm giải thích. Lead cũng lặp hai bullet lợi ích bên dưới, cần quyết định gộp ở UI nếu giữ đủ thông tin. |
| 9 | `App.settings.needsPro`,<br>`App.ui.lockedLine`,<br>`App.errors.entitlement-required` | `UsageSection.tsx` hiển thị `needsPro` khi `pool.limit === 0`, cả với tài khoản được cấp mức riêng. `plan-rules.ts` cho cấu hình lượt AI của Free. `problem.test.ts` ghim cặp câu Pro theo quyết định cũ. | Cần chốt khi nào thực sự bắt buộc Pro và khi nào chỉ thông báo tài khoản không có lượt AI. |
| 10 | `App.transactions.statuses.pending`,<br>`App.transactions.statuses.succeeded`,<br>`App.transactions.statuses.refunded`,<br>`App.transactions.statuses.reversed` | `transactions.repository.ts` ghi `succeeded` cho row thanh toán và row hoàn tiền. Event `refunded` đổi row gốc thành `refunded`. `refund_reversed` đổi row hoàn tiền thành `reversed` và có thể khôi phục `succeeded` cho row gốc. `pending` có trong type hiển thị, nhưng writer này chỉ ghi các trạng thái trên, và payOS `pending`/`needs_review` nằm ở bảng order. | Giữ label hiện tại đến khi chốt ngôn ngữ chung cho transaction và order, đặc biệt không diễn giải `pending` thành ‘đang chờ thanh toán’ hoặc `reversed` thành hủy giao dịch. |
| 11 | `App.transactions.used`,<br>`App.transactions.detail.period`,<br>`App.transactions.noPeriod` | `order-applier.service.ts` có thể ghi ngay một giao dịch Pro với `period_start` trong tương lai khi nối gói. `TransactionRow.tsx` lại dùng `dùng {period}` và `active {period}`. Dòng hoàn tiền luôn hiện `noPeriod` dù writer có thể giữ kỳ của giao dịch gốc. | Chốt xem kỳ là thời hạn quyền lợi hay kỳ gắn với giao dịch. Sau đó có thể dùng label trung tính ‘Thời hạn gói’ hoặc thêm trạng thái theo thời gian nếu cần. |
| 12 | `App.transactions.detail.help` | `TransactionDetail.tsx` hiện hướng dẫn đến ‘Liên hệ’ bằng text thường. `SiteFooter.tsx` liên kết Contact đến địa chỉ liên hệ, còn `OrderReturnPage.tsx` liên kết địa chỉ support dành cho giao dịch. | Chốt địa chỉ và nơi mở hỗ trợ trước khi rút còn hướng dẫn gửi mã giao dịch. |
| 13 | `App.auth.complete.body` | `CompleteProfile.tsx` hiển thị cùng intro khi thiếu ngày sinh, thiếu consent hoặc thiếu cả hai. `CompleteProfile.test.tsx` có trường hợp chỉ hiện checkbox. | Chốt dùng hướng dẫn chung ngắn hay intro theo từng trường bắt buộc. |
| 14 | `App.auth.login.logoutFailed` | `session-store.ts:213–219` cho `postLogout()` trả false khi mất kết nối hoặc khi API trả 429/5xx. Chuỗi hiện quy hết cho mất kết nối. | Chốt dùng một câu chung như ‘Chưa đăng xuất được. Thử đăng xuất lại hoặc đăng nhập để tiếp tục.’ hay phân biệt trường hợp lỗi. |
| 15 | `App.deleteAccount.pendingBody` | `deletion-jobs.service.ts` chạy lại theo lịch mỗi giờ, với điều kiện đã ở trạng thái xóa đủ thời gian và có thể có lần retry tiếp theo. | Chốt có giữ mốc ‘tới một giờ’ như kỳ vọng vận hành hay chỉ nói bước xóa sẽ tiếp tục và người dùng không cần thao tác. |
| 16 | `App.deleteAccount.wrongAccount` | Reauth yêu cầu chọn tài khoản Google liên kết với tài khoản Wordmet. ‘Không phải tài khoản Google của bạn’ có thể khiến người có nhiều tài khoản hiểu nhầm. | Chốt có diễn đạt phạm vi là ‘tài khoản Google đã liên kết’ trên cả hai locale hay giữ câu hiện tại. |
| 17 | `App.speak.pending` | `SpeakButton.tsx` dùng tooltip khi thiếu cả file lẫn voice trình duyệt. Nhánh này không nhận trạng thái job, nên không phân biệt chưa tạo, đang tạo hoặc đã lỗi. | Chốt đổi thành mô tả hiện trạng ‘Chưa có âm thanh’ / ‘Audio unavailable’ hay nối trạng thái job để giữ ‘Đang tạo’. |
| 18 | `App.errors.session-not-waiting` | `sessions.service.ts` trả lỗi khi `continue()` được gọi mà phiên không chờ người học xác nhận tiếp tục. Copy ‘Câu này đã được trả lời’ nói về câu hỏi. | Chốt thông báo trạng thái phiên và hành động phù hợp theo cách màn hiện có thể đồng bộ lại. |
| 19 | `App.errors.share-consent-required` | `App.errors` map slug này nhưng tìm trong source API chưa thấy nơi phát, trong khi `session-not-waiting` cùng map có emitter xác nhận được. Copy bảo thử lại chưa nói yêu cầu consent. | Chốt có giữ key tương thích với server khác phiên bản hay bỏ hướng dẫn thử lại sau khi xác nhận luồng đồng ý chia sẻ. |
| 20 | `App.errors.validation-failed` | `problem-details.filter.ts` có trường hợp validation trả chung, `use-error-message.ts` không kiểm tra có `violations` hay các ô được đánh dấu trước khi hiện câu. | Chốt dùng câu dự phòng chung hay chỉ nhắc ô được đánh dấu ở các form có hiển thị lỗi theo trường. |
| 21 | `App.settings.aiPracticeRefill`,<br>`App.settings.aiLookupRefill`,<br>`App.settings.aiPracticeRefillTime`,<br>`App.settings.aiLookupRefillTime` | `UsageSection.tsx` dựa vào tên Free để hiện lời hẹn có lượt mới. `plan-rules.ts` vẫn giữ tên Free khi cấp `grant_limits` và có thể tính chu kỳ từ mốc cấp, trong khi `snapshot()` trả cuối chu kỳ làm `resets_at`. | Cần chốt hiển thị refill khi quyền cấp có thể hết trước mốc đó. Sau khi chốt, có thể rút ‘Có lượt mới vào {date}’ / ‘New credits on {date}’ vì loại lượt đã nằm ngay trên cùng hàng. |
| 22 | `App.auth.verify.body`,<br>`App.auth.verify.loginBody`,<br>`App.auth.verify.resent`,<br>`App.auth.forgot.body` | `auth.service.ts` cố ý trả cùng phản hồi đăng ký để tránh lộ email có tài khoản. `otp.service.ts` cũng có thể bỏ qua gửi mã khi bị giới hạn, mail budget hết hoặc tài khoản không đủ điều kiện. | Chốt dùng lời hướng dẫn kiểm tra hộp thư và yêu cầu mã mới, hay giữ xác nhận đã gửi như hiện tại. Không dùng copy để phân biệt email có tài khoản. |
| 23 | `App.deleteAccount.doneBody` | `account-deletion.service.ts` hoàn tất xóa trước khi xếp gửi email xác nhận và bắt lỗi gửi email riêng. | Chốt hướng dẫn kiểm tra hộp thư hay xác nhận đã gửi chỉ khi có tín hiệu gửi thành công. |
| 24 | `App.errors.google-busy`,<br>`App.errors.google-unavailable` | `SettingsPage.tsx` xác nhận có tài khoản chỉ có phương thức Google. Hướng dẫn chuyển sang email và mật khẩu chỉ áp dụng cho người đã đặt mật khẩu. | Chốt thêm điều kiện vào câu chung hay dùng hướng dẫn riêng theo phương thức đăng nhập. |
| 25 | `App.calendar.day.known`,<br>`App.calendar.day.again` | Lịch gom theo rating `Good` và `Again` (`apps/api/src/learning/calendar/calendar.ts:124`), trong khi `applyLearn` có thể giữ nguyên bậc và `applyRecall` giữ nguyên bậc khi trả lời sai hoặc xóa cờ ưu tiên khi trả lời đúng (`apps/api/src/learning/schedule/schedule.ts:56`, `:69`). Copy hiện hứa luôn lên một bậc hoặc về Bậc 1. | Cần chốt dùng nhãn kết quả trung tính cho các nguồn ôn chung hay chia theo hành vi đổi bậc, phương án sau cần thêm dữ liệu cho view. |
| 26 | `App.groups.deleteSubmit`,<br>`App.groups.deleteBodyNone` | Nút nói “Xóa … từ” trong khi API chỉ xóa `learningItem` không còn ở nhóm khác (`apps/api/src/learning/groups/groups.service.ts:104`). Body khi `removable_items = 0` cũng được dùng với nhóm trống (`apps/web/src/features/learner/groups/GroupDialogs.tsx:185`). | Cần chốt gọi hành động là bỏ từ khỏi danh sách học hay giữ nhãn ngắn với mô tả hậu quả cạnh nút. |
| 27 | `App.calendar.day.more` | Nút hiện khi `hidden > 0 \|\| more` nhưng luôn nhận `count = hidden` (`apps/web/src/features/learner/calendar/DayDialog.tsx:250`); có thể hiển thị `+0 từ` dù còn trang API. | Cần chốt nhãn tải thêm không kèm số riêng cho trường hợp 0 hoặc cấp số từ chưa tải. |
| 28 | `App.calendar.day.filterLearn`,<br>`App.calendar.day.filterReview` | Các nhãn tiếng Việt “Học / Ôn” giống hành động, bản EN hiện trộn “Learned / Review”. Hộp ngày dùng chúng để lọc lịch sử đã ghi (`DayDialog.tsx:157–183`). | Đề xuất chốt cặp trạng thái “Đã học / Đã ôn”, “Learned / Reviewed” hoặc giữ tên loại hoạt động “Học / Ôn”, “Learn / Review” xuyên suốt phần lịch. |
| 29 | `App.today.allDone` | `TodayPage.tsx:85` hiện câu này khi không còn nhóm có thẻ trong hạn mức chờ; API giới hạn các thẻ đến hạn và từ mới theo cap (`apps/api/src/learning/queue/queue.service.ts:37–38`). | Cần chốt phân biệt hoàn tất phần hôm nay với hết hạn mức thường ngày, hoặc dùng một câu chỉ báo không còn thẻ trong phần hôm nay. |
| 30 | `App.recall.newLeftBody` | Dòng hứa từ mới sẽ có trong phiên ôn ngày mai. `applyLearn` chỉ lên Bậc 1 khi chọn Đã biết hoặc chuyển sang ưu tiên hôm nay khi chọn Cần ôn lại (`apps/api/src/learning/schedule/schedule.ts:35–59`). | Cần chốt mô tả lịch theo câu trả lời hay giữ hướng dẫn chung học tiếp các từ mới. |
| 31 | `App.addWord.fullNotSaved`,<br>`App.addWord.fullUnknown` | Từ chối lưu khi nhóm đầy cần bước tiếp theo phụ thuộc ngữ cảnh. Nhóm mở từ chính trang nhóm là `pinnedId`, bắt buộc lưu vào nhóm đó (`AddWordSheet.tsx:106, 300`), còn hộp chọn nhóm thông thường có thể đổi nhóm. | Nếu cần hướng dẫn cụ thể, tách copy theo trạng thái khóa nhóm để tránh bảo bỏ chọn một nhóm bắt buộc. |
| 32 | `App.practice.session.report.infoAi`;<br>`App.practice.reports.foot` | Hai chuỗi dễ được hiểu là cứ xác nhận lỗi thì chắc chắn được trả lượt. Logic hoàn lượt có thể trả `false` (ví dụ không tìm thấy lượt đủ điều kiện); chính danh sách báo lỗi có trạng thái không trả được. | Bạn muốn nói ngay «có thể được trả lại 1 lượt» hay giải thích ngắn điều kiện hoàn? Đối chiếu `reports.service.spec.ts` (B7E74) và `usage-ledger.service.spec.ts` (B5-7). |
| 33 | `App.practice.weak.cardBody`;<br>`App.practice.weak.rules.in`;<br>`App.practice.sources.weak.body`;<br>`App.practice.weak.emptyBody` | «Sai 2 lần trong 5 câu gần nhất» dễ được hiểu là đúng 2 lần và cần đủ 5 câu. `weak-words.ts` dùng ít nhất 2 câu sai trong tối đa 5 lượt trả lời được tính của từng từ; `SS` đã đủ. «Đúng 4 lần liền» là một cách thoát, không phải điều kiện duy nhất. | Bạn muốn mô tả đúng ngưỡng trong mọi ô hay để thẻ ngắn và nói đầy đủ ở mục quy tắc? |
| 34 | `App.practice.session.ai.planTitle`;<br>`App.practice.session.ai.planBody` | UI dùng cặp này khi API trả `plan-required`. Nhánh đó báo quyền AI hiện không còn; chỉ từ mã này không xác định được gói đã hết hạn hay điều kiện quyền đã đổi. | Bạn muốn thông báo chung về quyền AI, hay xác minh thêm nguyên nhân và tách trạng thái hết hạn? Đối chiếu `AiUnavailableState.tsx`, `ai-question-generator.service.ts` và `ai-session-planner.service.ts`. |
| 35 | `App.practice.customize.aiOut` | «Tháng này» có thể bị hiểu là tháng dương lịch cho mọi gói. `ai-cycle.ts` dùng tháng dương lịch theo múi giờ cho Free không có mốc riêng, và chu kỳ theo mốc gói/quyền cấp cho các trường hợp khác. | Bạn muốn dùng «Hết lượt câu AI» và chỉ hiện ngày cấp lại khi có dữ liệu, hay giữ cách nói theo tháng? |
| 36 | `App.practice.resumeDialog.title`;<br>`App.practice.resumeDialog.body` | UI hiện tiến độ ở cả tiêu đề lẫn thân hộp; cả hai chuỗi đều có `done` và `total`. Bản nháp chỉ ưu tiên hậu quả bắt đầu phiên mới ở phần thân; | muốn bỏ hẳn thông tin lặp cần chốt giữ tiến độ ở đâu rồi mới thay đổi placeholder và caller. |
| 37 | `App.plans.order.needsReviewTitle`;<br>`App.plans.order.needsReview`;<br>`App.plans.order.ended` | `OrderReturnPage.tsx` gộp `needs_review` và `closed` vào «đang kiểm tra» và hứa kích hoạt Pro, trong khi API có thể đóng đơn đã xử lý mà không mở kỳ Pro. Nhánh «đã hủy hoặc hết hạn» còn nhận `failed`. | Bạn muốn câu trung tính dùng chung hay tách thông báo theo từng trạng thái? Đối chiếu `admin-orders.service.ts` và `order-rules.ts`. |
| 38 | `App.plans.order.paid`;<br>`App.plans.order.paidNoDate` | EN nói Pro đang có hiệu lực; đơn đã thanh toán có thể mua kỳ nối tiếp. Màn hiện chỉ đưa `ends_at` vào chuỗi, dù dữ liệu có `starts_at`. | Bạn muốn chỉ xác nhận kỳ Pro đã được mua, hay hiển thị cả ngày bắt đầu khi kỳ mới chưa tới? Đối chiếu `OrderReturnPage.tsx` và `PlansPage.tsx`. |
| 39 | `App.plans.freeList.aiOff` | UI dùng khi hai hạn mức Free đều bằng 0; câu lại khẳng định chỉ Pro có AI, trong khi API cũng có cấu hình Trial và quyền cấp riêng. | Bạn muốn nói riêng «Gói Free hiện không có lượt AI» hay nêu gói/quyền nào mở được AI? Đối chiếu `PlansPage.tsx` và `plan-numbers.ts`. |
| 40 | `App.plans.proList.aiWrite` | «Cho từng từ bạn học» có thể được hiểu là AI sẽ tạo câu cho mọi từ. Phần luyện chỉ chọn một số câu AI và có thể chuyển sang kiểu khác nếu AI không tạo được. | Bạn muốn mô tả khả năng AI soạn câu tránh hứa phạm vi «từng từ», hay giữ lời giới thiệu hiện tại? Đối chiếu `CustomizeDialog.tsx` và `ai-question-generator.service.ts`. |
| 41 | `Landing.hero.line1`,<br>`Landing.hero.line2`,<br>`Landing.hero.lead`,<br>`Landing.hero.topicLabel` | **Đã chốt (20/11/2026):** Giữ hướng kết quả với H1 2 dòng (mỗi vế 1 hàng, cỡ chữ `text-wm-site-hero` 80px trên desktop, bỏ dấu phẩy) «Nhớ từ bền lâu» / «vững vàng trong câu» (EN: «Remember words longer» / «use them with confidence»), pill «Học từ vựng tiếng Anh» / «English vocabulary» và lead gọn «Lưu từ, luyện câu và ôn tự động» / «Save words, practice in context, review on schedule». | Đã chốt. |
| 42 | `Landing.plans.proSignup` | Nút CTA nằm ở thẻ Pro (`PricingSection.tsx`), hiển thị mức giá các kỳ 1, 3, 12 tháng nhưng liên kết đến `/${locale}/app/register`. Vì landing page không có luồng thanh toán trực tiếp, người học bấm nút sẽ đến trang tạo tài khoản (mặc định ban đầu là Free), sau đó mới vào trang Gói học trong app để thanh toán. Nhãn hiện tại là «Tạo tài khoản» / «Create an account» (khác thẻ Free là «Tạo tài khoản miễn phí» / «Create a free account»). | (1) Giữ «Tạo tài khoản» / «Create an account» để phản ánh đúng hành động tạo tài khoản; (2) Đổi thành «Đăng ký để dùng Pro» / «Sign up for Pro» để thể hiện rõ ý định chọn gói Pro; hoặc (3) Bổ sung microcopy giải thích bên dưới nút (cần can thiệp component). |
| 43 | `Landing.learn.lead`,<br>`Landing.learn.practice.eyebrow`,<br>`Landing.learn.note.eyebrow` | **Đã chốt (20/11/2026):** `LearnSection.tsx` rút gọn còn 3 bước đánh số không có `lead` và không có `body`: 1 Lưu từ · Nhận diện từ gốc (`note`) → 2 Luyện tập · Điền từ vào câu (`practice`) → 3 Nhắc lịch tự động · Ghi nhớ qua từng cột mốc (`review`). | Đã chốt. |
| 44 | `en:Landing.stage.cycle.*.meaning`,<br>`en:Landing.learn.note.meaning` | Trong `en.json`, 6 nghĩa minh họa của các từ mẫu trên landing (5 từ trong `stage.cycle` và 1 từ trong `learn.note`) vẫn để tiếng Việt (`giảm nhẹ`, `phân bổ`, `khả thi`, `xấu đi`, `mạch lạc`, `verb · xấu đi`), trong khi `en:App.auth.showcase` dịch 5 từ đó sang từ đồng nghĩa tiếng Anh (`lessen`, `allot`, `workable`, `worsen`, `clear`). | (1) Giữ nghĩa tiếng Việt trên landing EN nếu trang EN vẫn nhắm tới người Việt dùng giao diện tiếng Anh; hoặc (2) Đổi sang từ đồng nghĩa/giải nghĩa ngắn bằng tiếng Anh để đồng bộ với `en:App.auth.showcase` và phục vụ người đọc quốc tế. |

## 3. Bảng thay đổi

`vi:` và `en:` cho biết file. Chỉ liệt kê các value thay đổi; thứ tự theo file nguồn.

### `Landing`

| Key | Cũ | Mới |
| --- | --- | --- |
| `vi:Landing.hero.topicLabel` | `Nâng tầm vốn từ tiếng Anh` | `Học từ vựng tiếng Anh` |
| `en:Landing.hero.topicLabel` | `Smarter English vocabulary` | `English vocabulary` |
| `vi:Landing.hero.line1` | `Nhớ từ lâu bền,` | `Nhớ từ bền lâu` |
| `en:Landing.hero.line1` | `Remember words forever,` | `Remember words longer` |
| `vi:Landing.hero.line2` | `tự tin dùng trong câu` | `vững vàng trong câu` |
| `en:Landing.hero.line2` | `use them in a sentence` | `use them with confidence` |
| `vi:Landing.hero.lead` | `Wordmet tra nghĩa, phiên âm và câu ví dụ rồi xếp lịch ôn cho từng từ. Bạn tập trung luyện cách dùng từ trong câu.` | `Lưu từ, luyện câu và ôn tự động` |
| `en:Landing.hero.lead` | `Wordmet looks up meanings, pronunciation, and example sentences, then schedules reviews for each word. Focus on using words in sentences.` | `Save words, practice in context, review on schedule` |
| `vi:Landing.groups.title` | `Học theo nhóm chủ đề` | `Nhóm từ theo chủ đề` |
| `en:Landing.groups.title` | `Learn with topic decks` | `Topic decks` |
| `vi:Landing.groups.lead` | `Chọn chủ đề và trình độ, Wordmet tạo sẵn nhóm từ. Mỗi từ có lịch ôn riêng.` | `Chọn chủ đề và trình độ để học ngay` |
| `en:Landing.groups.lead` | `Pick a topic and a level, and Wordmet builds the deck. Each word has its own review schedule.` | `Pick a topic and level to start` |
| `en:Landing.learn.title` | `From finding new words to using them confidently` | `From seeing a word to using it` |
| `vi:Landing.learn.practice.eyebrow` | `Trong phiên luyện` | `Luyện tập` |
| `en:Landing.learn.practice.eyebrow` | `In a practice session` | `Practice` |
| `vi:Landing.learn.practice.title` | `Luyện từ trong câu thật` | `Điền từ vào câu` |
| `en:Landing.learn.practice.title` | `Practice words in real sentences` | `Use words in sentences` |
| `vi:Landing.learn.note.eyebrow` | `Sau khi đọc một bài` | `Lưu từ` |
| `en:Landing.learn.note.eyebrow` | `After reading an article` | `Save` |
| `vi:Landing.learn.note.title` | `Lưu từ trong vài giây` | `Nhận diện từ gốc` |
| `en:Landing.learn.note.title` | `Save a word in seconds` | `Find the base form` |
| `vi:Landing.learn.review.eyebrow` | `Những ngày sau` | `Nhắc lịch tự động` |
| `en:Landing.learn.review.eyebrow` | `In the following days` | `Automatic reminders` |
| `vi:Landing.learn.review.title` | `Ôn đúng lúc sắp quên` | `Ghi nhớ qua từng cột mốc` |
| `en:Landing.learn.review.title` | `Review right before you forget` | `Retain words at every milestone` |
| `vi:Landing.plans.title` | `Học miễn phí, bứt phá cùng Pro` | `Bắt đầu miễn phí, luyện nhiều hơn với Pro` |
| `en:Landing.plans.title` | `Start free, accelerate with Pro` | `Start free, practice more with Pro` |
| `vi:Landing.plans.lead` | `Cả hai gói đều ôn thẻ không giới hạn. Khi hết hạn Pro, từ vựng và lịch ôn vẫn được giữ nguyên.` | `Ôn thẻ không giới hạn ở cả hai gói` |
| `en:Landing.plans.lead` | `Both plans include unlimited card reviews. When Pro ends, your words and review schedule remain.` | `Unlimited card reviews on both plans` |
| `vi:Landing.plans.freeList.0` | `Lưu từ, tra nghĩa và nghe phát âm` | `Lưu từ, tra nghĩa, nghe phát âm` |
| `en:Landing.plans.freeList.0` | `Save words, look up meanings, and listen to pronunciation` | `Save, look up, and listen` |
| `vi:Landing.plans.freeList.3` | `Dùng thử câu luyện và tra từ bằng AI` | `Dùng thử tính năng AI` |
| `en:Landing.plans.freeList.3` | `Try AI practice sentences and lookups` | `Try AI features` |
| `vi:Landing.plans.proLine` | `Luyện nhiều hơn mỗi ngày, có AI soạn câu luyện riêng cho từng từ và tra từ cùng bạn.` | `Thêm phiên luyện và lượt AI` |
| `en:Landing.plans.proLine` | `More practice every day, with AI that writes practice sentences for each word and looks up words with you.` | `More practice sessions and AI credits` |
| `vi:Landing.plans.aiList.0` | `Câu luyện và tra từ bằng AI` | `Tính năng AI` |
| `en:Landing.plans.aiList.0` | `AI practice sentences and lookups` | `AI features` |
| `vi:Landing.plans.aiList.1` | `AI viết câu luyện cho từng từ bạn học` | `Tạo câu luyện bằng AI` |
| `en:Landing.plans.aiList.1` | `AI writes practice sentences for each word you study` | `AI practice questions` |
| `vi:Landing.plans.aiList.2` | `Tra từ bằng AI khi từ điển chưa có` | `Tra từ ngoài từ điển` |
| `en:Landing.plans.aiList.2` | `AI lookup when the dictionary doesn’t have a word` | `AI dictionary lookup` |
| `en:Landing.faq.title` | `Frequently asked questions` | `Common questions` |
| `vi:Landing.faq.lead` | `Còn câu hỏi? Gửi email đến {email}, đội Wordmet sẽ trả lời.` | `Cần hỗ trợ? Liên hệ {email}` |
| `en:Landing.faq.lead` | `Have more questions? Email {email} and the Wordmet team will reply.` | `Need help? Email {email}` |
| `vi:Landing.final.title` | `Biến bài đọc thành tiếng Anh trôi chảy` | `Bắt đầu học từ hôm nay` |
| `en:Landing.final.title` | `Turn reading into fluent English` | `Start learning today` |
| `vi:Landing.final.note` | `Bắt đầu miễn phí, không cần cài đặt.` | `Miễn phí, không cần cài đặt` |
| `en:Landing.final.note` | `Start for free without installing anything.` | `Free, nothing to install` |

### `Legal`

| Key | Cũ | Mới |
| --- | --- | --- |
| `vi:Legal.privacyLead` | `Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai và quyền của bạn với dữ liệu của mình.` | `Wordmet thu thập dữ liệu nào, dùng ra sao, chia sẻ với ai và bạn có quyền gì với dữ liệu đó.` |
| `en:Legal.privacyLead` | `What data Wordmet collects, what it is used for, who it is shared with, and your rights over your own data.` | `The data Wordmet collects, how it’s used, who it’s shared with, and your rights over that data.` |
| `vi:Legal.privacyHelpBody` | `Gửi từ chính email của tài khoản. Phản hồi trong 2 ngày làm việc.` | `Gửi email từ địa chỉ của tài khoản. Bạn sẽ nhận phản hồi trong 2 ngày làm việc.` |
| `en:Legal.privacyHelpBody` | `Write from your account’s email address. We reply within 2 working days.` | `Email us from the address on your account. We reply within 2 working days.` |
| `en:Legal.termsHelpTitle` | `A problem with a payment?` | `Need help with a payment?` |
| `vi:Legal.termsHelpBody` | `Gửi email tài khoản, nội dung chuyển khoản (bắt đầu bằng WM) và ảnh biên nhận.` | `Gửi địa chỉ email của tài khoản, nội dung chuyển khoản bắt đầu bằng WM và ảnh biên nhận.` |
| `en:Legal.termsHelpBody` | `Send your account email, the transfer description (it starts with WM) and a photo of the receipt.` | `Send your account email address, the transfer description that starts with WM, and a photo of the receipt.` |

### `Sources`

| Key | Cũ | Mới |
| --- | --- | --- |
| `vi:Sources.empty` | `Hiện chưa có nguồn dữ liệu nào để hiển thị.` | `Chưa có nguồn dữ liệu để hiển thị.` |
| `en:Sources.empty` | `There are no data sources to show yet.` | `No data sources to show yet.` |
| `vi:Sources.link` | `Trang gốc` | `Xem trang gốc` |
| `en:Sources.link` | `Original site` | `Visit the original site` |

### `NotFound`

| Key | Cũ | Mới |
| --- | --- | --- |
| `vi:NotFound.body` | `Trang này không có hoặc đã chuyển sang địa chỉ khác.` | `Trang này không tồn tại hoặc đã chuyển sang địa chỉ khác.` |
| `en:NotFound.home` | `Back to home` | `Go to the homepage` |

### `App`

| Key | Cũ | Mới |
| --- | --- | --- |
| `vi:App.common.notFoundTitle` | `Không tìm thấy trang này` | `Không tìm thấy trang` |
| `vi:App.chrome.tabs.groups` | `Nhóm` | `Nhóm từ` |
| `vi:App.chrome.account` | `Tài khoản của bạn` | `Tài khoản` |
| `en:App.chrome.account` | `Your account` | `Account` |
| `vi:App.chrome.plan.free` | `Miễn phí` | `Free` |
| `vi:App.ui.dob.invalid` | `Ngày sinh không hợp lệ. Chọn lại ngày.` | `Ngày sinh không hợp lệ. Kiểm tra lại ngày đã nhập.` |
| `en:App.ui.dob.invalid` | `That birth date isn’t valid. Pick another date.` | `Enter a valid date of birth.` |
| `vi:App.ui.stepper.decrease` | `{label}: bớt 1` | `Giảm {label} đi 1` |
| `en:App.ui.stepper.decrease` | `{label}: one less` | `Decrease {label} by 1` |
| `vi:App.ui.stepper.increase` | `{label}: thêm 1` | `Tăng {label} thêm 1` |
| `en:App.ui.stepper.increase` | `{label}: one more` | `Increase {label} by 1` |
| `en:App.speak.word` | `Listen` | `Listen to the pronunciation` |
| `vi:App.speak.uk` | `Nghe giọng Anh-Anh` | `Nghe phát âm Anh–Anh` |
| `vi:App.speak.us` | `Nghe giọng Anh-Mỹ` | `Nghe phát âm Anh–Mỹ` |
| `vi:App.auth.passwordMismatch` | `Mật khẩu nhập lại chưa khớp.` | `Hai mật khẩu chưa khớp.` |
| `vi:App.auth.required.code` | `Nhập đủ 6 số của mã.` | `Nhập đủ 6 chữ số của mã.` |
| `en:App.auth.captchaReload` | `Reload the verification` | `Reload verification` |
| `en:App.auth.captchaLoadFailed` | `Couldn’t load the verification.` | `Couldn’t load verification.` |
| `en:App.auth.showcase.result` | `Correct · up to {level}` | `Correct · now at {level}` |
| `en:App.auth.register.birthDateHint` | `Wordmet is for people 13 and older.` | `Wordmet is for ages 13 and up.` |
| `vi:App.auth.register.passwordHint` | `Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.` | `Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.` |
| `vi:App.auth.register.givenNameRequired` | `Nhập tên của bạn.` | `Nhập tên.` |
| `vi:App.auth.passwordRules.min_length` | `Cần ít nhất 8 ký tự.` | `Dùng ít nhất 8 ký tự.` |
| `vi:App.auth.passwordRules.max_length` | `Tối đa 128 ký tự.` | `Dùng tối đa 128 ký tự.` |
| `vi:App.auth.passwordRules.uppercase` | `Cần một chữ hoa.` | `Thêm một chữ hoa.` |
| `vi:App.auth.passwordRules.lowercase` | `Cần một chữ thường.` | `Thêm một chữ thường.` |
| `vi:App.auth.passwordRules.digit` | `Cần một chữ số.` | `Thêm một chữ số.` |
| `vi:App.auth.passwordRules.special` | `Cần một ký tự đặc biệt.` | `Thêm một ký tự đặc biệt.` |
| `vi:App.auth.passwordRules.same_as_current` | `Mật khẩu mới phải khác mật khẩu cũ.` | `Chọn mật khẩu khác mật khẩu hiện tại.` |
| `vi:App.auth.login.register` | `Đăng ký` | `Tạo tài khoản` |
| `en:App.auth.login.register` | `Sign up` | `Create account` |
| `vi:App.auth.login.lockedTitle` | `Tài khoản đang bị khóa` | `Tài khoản bị khóa` |
| `en:App.auth.login.lockedTitle` | `This account is locked` | `Account locked` |
| `vi:App.auth.login.lockedBody` | `Bạn chưa đăng nhập được vào tài khoản này. Liên hệ đội Wordmet nếu bạn cần mở lại.` | `Liên hệ đội Wordmet để yêu cầu mở khóa.` |
| `en:App.auth.login.lockedBody` | `You can’t sign in to this account right now. Contact the Wordmet team if you need it reopened.` | `Contact the Wordmet team to ask them to unlock your account.` |
| `vi:App.auth.login.expired` | `Bạn cần đăng nhập lại.` | `Đăng nhập lại để tiếp tục.` |
| `vi:App.auth.verify.submit` | `Xác minh` | `Xác minh email` |
| `en:App.auth.verify.submit` | `Verify` | `Verify email` |
| `vi:App.auth.verify.bodyNoEmail` | `Nhập email bạn đã đăng ký và mã 6 số trong thư. Mã có hiệu lực 10 phút.` | `Dùng email đã đăng ký và mã trong thư. Mã có hiệu lực trong 10 phút.` |
| `en:App.auth.verify.bodyNoEmail` | `Enter the email you signed up with and the 6-digit code from our email. It expires in 10 minutes.` | `Use the email you signed up with and the code from the email. The code expires in 10 minutes.` |
| `vi:App.auth.verify.wrongCode` | `Mã hoặc mật khẩu không đúng hoặc mã đã hết hạn. Nếu email đã được xác minh, đăng nhập để tiếp tục.` | `Mã không hợp lệ hoặc mật khẩu không đúng. Nếu email đã được xác minh, đăng nhập để tiếp tục.` |
| `en:App.auth.verify.wrongCode` | `The code or password is incorrect, or the code has expired. If your email is already verified, sign in.` | `The code is incorrect or expired, or the password is incorrect. If you’ve verified your email, sign in.` |
| `vi:App.auth.verify.locked` | `Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time} hoặc dùng Quên mật khẩu ở trang đăng nhập.` | `Đã nhập sai mã quá nhiều lần. Thử lại sau {time} hoặc chọn Quên mật khẩu trên trang đăng nhập.` |
| `en:App.auth.verify.locked` | `Too many wrong codes. Try again in {time}, or use Forgot password on the sign-in page.` | `Too many incorrect codes. Try again in {time} or select Forgot password on the sign-in page.` |
| `vi:App.auth.forgot.submit` | `Gửi mã` | `Gửi mã đặt lại` |
| `en:App.auth.forgot.submit` | `Send code` | `Send reset code` |
| `vi:App.auth.forgot.mustChange` | `Tài khoản này cần mật khẩu mới trước khi dùng tiếp. Nhập email để nhận mã đặt lại.` | `Bạn cần đặt mật khẩu mới để tiếp tục. Nhập email để nhận mã đặt lại.` |
| `en:App.auth.forgot.mustChange` | `This account needs a new password before you continue. Enter your email to get a reset code.` | `Set a new password to continue. Enter your email to get a reset code.` |
| `vi:App.auth.reset.hint` | `Đổi xong, mọi thiết bị khác sẽ bị đăng xuất.` | `Đổi mật khẩu sẽ đăng xuất tài khoản trên các thiết bị khác.` |
| `en:App.auth.reset.hint` | `Once changed, your other devices are signed out.` | `Changing your password signs you out on other devices.` |
| `vi:App.auth.googleComplete.intro` | `Bạn sắp tạo tài khoản Wordmet bằng {email}. Còn vài thông tin nữa.` | `Email dùng để đăng ký Wordmet là {email}.` |
| `en:App.auth.googleComplete.intro` | `You are about to create a Wordmet account with {email}. A few details are left.` | `You’re signing up for Wordmet with {email}.` |
| `en:App.auth.googleComplete.expiredTitle` | `Your sign-up session expired` | `Sign-up session expired` |
| `vi:App.auth.googleComplete.expiredBody` | `Bạn cần chọn lại tài khoản Google để tiếp tục.` | `Chọn lại tài khoản Google để tiếp tục.` |
| `en:App.auth.googleComplete.toLogin` | `Back to sign in` | `Back to sign-in page` |
| `vi:App.auth.complete.updatedTitle` | `Điều khoản đã được cập nhật` | `Điều khoản đã cập nhật` |
| `en:App.auth.complete.updatedTitle` | `The terms have been updated` | `Terms updated` |
| `vi:App.auth.complete.updatedBody` | `Wordmet vừa đăng bản mới của Điều khoản sử dụng và Chính sách bảo mật. Đọc và đồng ý để tiếp tục học.` | `Đọc và đồng ý với Điều khoản sử dụng và Chính sách bảo mật mới của Wordmet để tiếp tục học.` |
| `en:App.auth.complete.updatedBody` | `Wordmet has published a new version of the Terms of Use and the Privacy Policy. Read and accept them to keep learning.` | `Read and accept Wordmet’s updated Terms of Use and Privacy Policy to keep learning.` |
| `vi:App.auth.welcome.title` | `Bạn đọc nghĩa của từ bằng ngôn ngữ nào?` | `Chọn ngôn ngữ hiển thị nghĩa của từ` |
| `en:App.auth.welcome.title` | `Which language should meanings be in?` | `Choose a language for word meanings` |
| `vi:App.auth.welcome.body` | `Giao diện cũng dùng ngôn ngữ này. Đổi lại được trong Cài đặt.` | `Giao diện dùng cùng ngôn ngữ. Bạn có thể đổi trong Cài đặt.` |
| `en:App.auth.welcome.body` | `The app uses this language too. You can change it in Settings.` | `This also sets the app language. You can change it in Settings.` |
| `vi:App.settings.planUsage` | `Gói và mức sử dụng` | `Gói học và mức sử dụng` |
| `vi:App.settings.used` | `đã dùng {used, number}/{limit, number}` | `{used, number}/{limit, number} đã dùng` |
| `vi:App.settings.practiceLeft` | `Còn {remaining, number} phiên, mở lại lúc {time}` | `Còn {remaining, number} phiên luyện · có phiên mới lúc {time}` |
| `en:App.settings.practiceLeft` | `{remaining, plural, one {# session left} other {# sessions left}}, resets at {time}` | `{remaining, plural, one {# practice session left} other {# practice sessions left}} · resets at {time}` |
| `vi:App.settings.remaining` | `còn {remaining, number}/{limit, number}` | `{remaining, number}/{limit, number} còn lại` |
| `en:App.settings.languageHint` | `Word meanings and the app` | `Word meanings and app interface` |
| `vi:App.settings.remindersHint` | `Lúc {time} giờ của bạn, chỉ khi có từ đến hạn` | `Lúc {time} theo giờ của bạn, chỉ khi có từ đến hạn` |
| `en:App.settings.remindersHint` | `At {time} your time, only when words are due` | `At {time} in your time zone, only when words are due` |
| `en:App.settings.shortcutLookup` | `Look up` | `Look up a word` |
| `vi:App.settings.shortcutFlip` | `Lật thẻ trong phiên ôn` | `Lật thẻ khi ôn` |
| `en:App.settings.shortcutFlip` | `Flip the card in a review` | `Flip the card during review` |
| `en:App.settings.shortcutExit` | `Leave the review` | `End the review session` |
| `vi:App.settings.logoutHint` | `Thoát khỏi thiết bị này` | `Trên thiết bị này` |
| `en:App.settings.logoutHint` | `Sign out of this device` | `On this device` |
| `vi:App.settings.setPasswordHint` | `Tài khoản này chỉ đăng nhập bằng Google. Đặt mật khẩu để đăng nhập cả bằng email.` | `Đặt mật khẩu để đăng nhập bằng email ngoài Google.` |
| `en:App.settings.setPasswordHint` | `This account signs in with Google only. Set a password to sign in with email too.` | `Set a password to sign in with email as well as Google.` |
| `vi:App.deleteAccount.deletedTitle` | `Những gì bị xóa` | `Dữ liệu sẽ bị xóa` |
| `en:App.deleteAccount.deletedTitle` | `What is deleted` | `Data to be deleted` |
| `vi:App.deleteAccount.keptTitle` | `Những gì còn được giữ` | `Dữ liệu được giữ lại` |
| `en:App.deleteAccount.keptTitle` | `What is kept` | `Data kept` |
| `vi:App.deleteAccount.confirmTitle` | `Xác nhận xóa` | `Xác nhận xóa tài khoản` |
| `en:App.deleteAccount.confirmTitle` | `Confirm deletion` | `Confirm account deletion` |
| `vi:App.deleteAccount.deleted.learning` | `Dữ liệu học: nhóm, lịch ôn, lịch sử trả lời` | `Dữ liệu học gồm nhóm từ, lịch ôn và lịch sử trả lời` |
| `en:App.deleteAccount.deleted.learning` | `Learning data: decks, review schedule, answer history` | `Learning data, including decks, review schedule and answer history` |
| `vi:App.deleteAccount.kept.payments` | `Hồ sơ thanh toán {years, number} năm, không kèm tên bạn` | `Hồ sơ thanh toán được giữ {years, number} năm, không kèm tên bạn` |
| `en:App.deleteAccount.kept.payments` | `Payment records for {years, number} years, without your name` | `Payment records kept for {years, number} years without your name` |
| `vi:App.deleteAccount.kept.paymentsNoYears` | `Hồ sơ thanh toán trong thời gian luật yêu cầu, không kèm tên bạn` | `Hồ sơ thanh toán được giữ theo thời hạn luật yêu cầu, không kèm tên bạn` |
| `en:App.deleteAccount.kept.paymentsNoYears` | `Payment records for the legal period, without your name` | `Payment records kept for the period required by law, without your name` |
| `vi:App.deleteAccount.kept.totals` | `Số liệu tổng hợp, không nhận ra bạn` | `Số liệu tổng hợp không nhận diện bạn` |
| `en:App.deleteAccount.kept.totals` | `Totals that do not identify you` | `Aggregate statistics that don’t identify you` |
| `vi:App.deleteAccount.proLost` | `Thời gian Pro còn lại sẽ mất, không hoàn tiền.` | `Thời hạn Pro còn lại sẽ mất và không được hoàn tiền.` |
| `en:App.deleteAccount.proLost` | `The rest of your Pro time will be lost, with no refund.` | `Any remaining Pro time will be lost without a refund.` |
| `vi:App.deleteAccount.blocked` | `Bạn đang có gói tự gia hạn. Hủy gói trước khi xóa tài khoản.` | `Gói của bạn đang tự gia hạn. Hủy gia hạn trước khi xóa tài khoản.` |
| `en:App.deleteAccount.blocked` | `You have a plan that renews. Cancel it before deleting your account.` | `Your plan renews automatically. Cancel renewal before deleting your account.` |
| `vi:App.deleteAccount.blockedLink` | `Đến trang Gói học` | `Mở Gói học` |
| `en:App.deleteAccount.blockedLink` | `Go to Plans` | `Open Plans` |
| `vi:App.deleteAccount.typeEmail` | `Gõ lại email của bạn` | `Nhập lại email của bạn` |
| `en:App.deleteAccount.typeEmail` | `Type your email again` | `Re-enter your email` |
| `vi:App.deleteAccount.submit` | `Xóa vĩnh viễn` | `Xóa tài khoản vĩnh viễn` |
| `en:App.deleteAccount.submit` | `Delete permanently` | `Delete account permanently` |
| `en:App.deleteAccount.toLogin` | `Back to sign in` | `Back to sign-in page` |
| `en:App.houseAd.title` | `Get more with Pro` | `Practice more with Pro` |
| `vi:App.houseAd.ai` | `Nhiều câu luyện tập và lượt tra từ bằng AI hơn` | `Nhiều lượt câu AI và lượt tra AI hơn` |
| `en:App.houseAd.ai` | `More AI practice questions and AI lookups` | `More AI credits for questions and lookups` |
| `vi:App.houseAd.from` | `Từ <b>{price}</b> cho 1 tháng` | `Từ <b>{price}</b> cho một tháng` |
| `en:App.houseAd.from` | `From <b>{price}</b> for 1 month` | `From <b>{price}</b> for one month` |
| `vi:App.transactions.kinds.plan_change` | `Đổi kỳ` | `Đổi kỳ thanh toán` |
| `en:App.transactions.kinds.plan_change` | `Billing change` | `Billing period change` |
| `vi:App.transactions.more` | `Xem thêm` | `Xem thêm giao dịch` |
| `en:App.transactions.more` | `Show more` | `Show more transactions` |
| `vi:App.transactions.detail.at` | `Thời điểm` | `Ngày và giờ` |
| `en:App.transactions.detail.at` | `Time` | `Date and time` |
| `vi:App.transactions.detail.copy` | `Chép mã giao dịch` | `Sao chép mã giao dịch` |
| `vi:App.transactions.detail.copied` | `Đã chép mã giao dịch.` | `Đã sao chép mã giao dịch.` |
| `vi:App.transactions.providers.fake` | `Giả (thử)` | `Cổng thử nghiệm` |
| `en:App.transactions.providers.fake` | `Fake (test)` | `Test provider` |
| `vi:App.transactions.emptyBody` | `Khi bạn mua gói Pro hoặc được đội Wordmet cấp gói, giao dịch sẽ hiện ở đây.` | `Các giao dịch mua Pro và các gói do đội Wordmet cấp sẽ xuất hiện ở đây.` |
| `en:App.transactions.emptyBody` | `When you buy Pro or get a plan from the Wordmet team, it shows up here.` | `Pro purchases and plans granted by the Wordmet team appear here.` |
| `vi:App.transactions.error` | `Không tải được lịch sử giao dịch. Kiểm tra mạng rồi thử lại.` | `Không tải được lịch sử giao dịch.` |
| `en:App.transactions.error` | `Couldn’t load your transaction history. Check your connection and try again.` | `Couldn’t load your transaction history.` |
| `en:App.account.ageHint` | `Wordmet is for people 13 and older.` | `Wordmet is for ages 13 and up.` |
| `vi:App.today.heroChipPriority` | `Ôn tiếp · có thẻ ưu tiên` | `Ôn tiếp · thẻ ưu tiên` |
| `vi:App.today.heroLine` | `nhóm có {total, number} từ` | `{total, number} từ trong nhóm` |
| `vi:App.today.emptyBody` | `Tạo nhóm đầu tiên để lưu từ bạn gặp và ôn theo lịch.` | `Dùng nhóm từ để lưu từ bạn gặp và ôn theo lịch.` |
| `en:App.today.emptyBody` | `Create your first deck to save the words you come across and review them on schedule.` | `Use decks to save words you come across and review them on schedule.` |
| `vi:App.today.backlogLine` | `Nhóm {name}, quá hạn hơn {days, number} ngày` | `Nhóm {name} · quá hạn hơn {days, number} ngày` |
| `en:App.today.backlogLine` | `{name} deck, over {days, number} days overdue` | `{name} deck · more than {days, number} days overdue` |
| `vi:App.today.see` | `Xem` | `Xem từ quá hạn` |
| `en:App.today.see` | `See` | `View overdue words` |
| `vi:App.today.levelHelp` | `Khoảng ôn lại của {level}` | `Khoảng cách giữa các lần ôn ở {level}` |
| `en:App.today.levelHelp` | `Review interval of {level}` | `Review interval for {level}` |
| `vi:App.today.heroBar` | `Thẻ chờ hôm nay theo loại` | `Thẻ chờ hôm nay theo trạng thái` |
| `en:App.today.heroBar` | `Cards waiting today by kind` | `Cards waiting today by status` |
| `en:App.today.yourGroupsHint` | `{count, plural, one {# other deck} other {# other decks}} with cards waiting` | `Cards waiting in {count, plural, one {# other deck} other {# other decks}}` |
| `vi:App.today.lastTitle` | `Lần luyện gần nhất` | `Phiên luyện gần nhất` |
| `en:App.today.lastTitle` | `Last practice` | `Last practice session` |
| `vi:App.calendar.month.label` | `lịch học` | `Lịch học` |
| `en:App.calendar.month.label` | `study calendar` | `Study calendar` |
| `vi:App.calendar.month.cellNone` | `không học` | `không có hoạt động học` |
| `en:App.calendar.month.cellNone` | `no study` | `no study activity` |
| `vi:App.calendar.month.cellFuture` | `chưa tới` | `ngày sắp tới` |
| `en:App.calendar.month.cellFuture` | `not yet` | `upcoming day` |
| `vi:App.calendar.month.legend.run` | `Ngày liền nhau` | `Ngày học liên tiếp` |
| `en:App.calendar.month.legend.run` | `Days in a row` | `Consecutive study days` |
| `vi:App.calendar.month.error` | `Không tải được lịch. Kiểm tra mạng rồi thử lại.` | `Không tải được lịch học. Thử lại.` |
| `en:App.calendar.month.error` | `Couldn’t load the calendar. Check your connection and try again.` | `Couldn’t load the study calendar. Try again.` |
| `vi:App.calendar.day.back` | `Lịch tháng {month, number}` | `Về lịch tháng {month, number}` |
| `en:App.calendar.day.back` | `{month} calendar` | `Back to the {month} calendar` |
| `vi:App.calendar.day.close` | `Đóng` | `Đóng lịch` |
| `en:App.calendar.day.close` | `Close` | `Close calendar` |
| `vi:App.calendar.day.filterLabel` | `Lọc` | `Lọc hoạt động học` |
| `en:App.calendar.day.filterLabel` | `Filter` | `Filter study activity` |
| `vi:App.calendar.day.none` | `Ngày này không có lần học nào.` | `Không có hoạt động học trong ngày này.` |
| `en:App.calendar.day.none` | `No study on this day.` | `No study activity on this day.` |
| `vi:App.calendar.day.sectionNone` | `Không học hay ôn từ nào trong ngày này.` | `Không có từ đã học hoặc đã ôn trong ngày này.` |
| `en:App.calendar.day.sectionNone` | `Nothing on this day.` | `No words learned or reviewed on this day.` |
| `vi:App.calendar.day.loading` | `Đang tải ngày` | `Đang tải hoạt động trong ngày` |
| `en:App.calendar.day.loading` | `Loading the day` | `Loading the day’s activity` |
| `vi:App.calendar.day.error` | `Không tải được ngày này. Kiểm tra mạng rồi thử lại.` | `Không tải được hoạt động trong ngày. Thử lại.` |
| `en:App.calendar.day.error` | `Couldn’t load this day. Check your connection and try again.` | `Couldn’t load the day’s activity. Try again.` |
| `vi:App.groups.noMatch` | `Không có nhóm nào khớp.` | `Không tìm thấy nhóm nào. Thử tên khác.` |
| `en:App.groups.noMatch` | `No deck matches.` | `No matching decks. Try another name.` |
| `vi:App.groups.suggestTitle` | `Tạo nhóm nhanh theo chủ đề` | `Tạo nhóm theo chủ đề` |
| `en:App.groups.suggestTitle` | `Quick decks by topic` | `Create decks by topic` |
| `vi:App.groups.suggestAll` | `Xem mọi chủ đề trong Tra từ` | `Xem chủ đề trong Tra từ` |
| `en:App.groups.suggestAll` | `See every topic in Look up` | `Browse topics in Look up` |
| `vi:App.groups.limit` | `Bạn đã có {max, number} nhóm, mức tối đa. Xóa bớt một nhóm để tạo nhóm mới.` | `Đã đạt giới hạn {max, number} nhóm. Xóa một nhóm để tạo nhóm mới.` |
| `en:App.groups.limit` | `You have {max, plural, one {# deck} other {# decks}}, the most allowed. Delete a deck to create a new one.` | `You’ve reached the limit of {max, plural, one {# deck} other {# decks}}. Delete a deck to create a new one.` |
| `vi:App.groups.conflict` | `Nhóm vừa được đổi ở nơi khác. Xem lại rồi lưu.` | `Tên nhóm vừa được đổi ở nơi khác. Kiểm tra tên mới nhất rồi lưu lại.` |
| `en:App.groups.conflict` | `This deck was changed somewhere else. Check it and save again.` | `This deck was renamed elsewhere. Check the latest name and save again.` |
| `vi:App.groups.deleteBody` | `<b>{count, number} từ chỉ có trong nhóm này</b> sẽ rời khỏi việc ôn và mất tiến độ.` | `<b>{count, number} từ chỉ có trong nhóm này</b> sẽ rời danh sách học và mất tiến độ.` |
| `en:App.groups.deleteBody` | `<b>{count, plural, one {# word that is only in this deck} other {# words that are only in this deck}}</b> will leave your reviews and lose their progress.` | `<b>{count, plural, one {# word found only in this deck} other {# words found only in this deck}}</b> will be removed from your study list and lose their progress.` |
| `vi:App.groups.deleteNote` | `Từ bạn tự thêm vẫn còn trong Từ của tôi.` | `Từ bạn tự thêm vẫn có trong Từ của tôi.` |
| `vi:App.groups.subtitle` | `{due, number} thẻ chờ trong {groups, number} nhóm · phím trái, phải hoặc vuốt để đổi nhóm` | `{due, number} thẻ chờ trong {groups, number} nhóm · dùng phím mũi tên trái, phải hoặc vuốt để đổi nhóm` |
| `en:App.groups.subtitle` | `{due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · left and right keys or swipe to switch` | `{due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · use the left and right arrow keys or swipe to switch decks` |
| `en:App.groups.subtitlePhone` | `{due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · swipe to switch` | `{due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · swipe to switch decks` |
| `en:App.groups.hintPhone` | `Tap to open` | `Tap to open the deck` |
| `vi:App.groups.rhythm` | `Nhịp ôn: Mới → Bậc 5` | `Các bậc ôn · Mới → Bậc 5` |
| `en:App.groups.rhythm` | `Review rhythm: New → Level 5` | `Review levels · New → Level 5` |
| `vi:App.groups.keysPick` | `↵ tới nhóm` | `↵ mở nhóm` |
| `en:App.groups.keysPick` | `↵ choose` | `↵ open deck` |
| `vi:App.group.backlogSee` | `Xem` | `Xem từ quá hạn` |
| `en:App.group.backlogSee` | `See` | `View overdue words` |
| `vi:App.group.allWords` | `Toàn bộ {count, number} từ` | `Tất cả {count, number} từ` |
| `vi:App.group.dueOn` | `Ôn lại {date}` | `Ôn lại ngày {date}` |
| `en:App.group.dueOn` | `Next review {date}` | `Next review on {date}` |
| `vi:App.group.removeLastBody` | `Từ này chỉ có trong nhóm này. Bỏ đi thì từ rời khỏi việc ôn và mất tiến độ.` | `Từ này chỉ có trong nhóm này. Khi bỏ từ, bạn sẽ mất lịch ôn và tiến độ.` |
| `en:App.group.removeLastBody` | `This word is only in this deck. Removing it takes it out of your reviews and its progress is lost.` | `This word is only in this deck. Removing it clears its review schedule and progress.` |
| `vi:App.group.toList` | `Về Nhóm của bạn` | `Về danh sách nhóm` |
| `en:App.group.toList` | `Back to your decks` | `Back to your deck list` |
| `vi:App.group.emptyFilter` | `Không có từ nào ở mục này.` | `Không có từ nào khớp bộ lọc.` |
| `en:App.group.emptyFilter` | `No words in this filter.` | `No words match this filter.` |
| `en:App.group.loadMore` | `More words · {count, number} left` | `Show more words · {count, number} left` |
| `vi:App.group.emptyBody` | `Thêm từ bạn gặp khi đọc hay xem phim. Bạn cũng có thể chọn từ theo chủ đề trong Tra từ.` | `Thêm từ bạn gặp hoặc chọn từ theo chủ đề trong Tra từ.` |
| `en:App.group.emptyBody` | `Add words you come across while reading or watching, or pick words by topic in Look up.` | `Add words you come across, or pick words by topic in Look up.` |
| `en:App.group.loadMoreUnknown` | `More words` | `Show more words` |
| `en:App.backlog.back` | `{name} deck` | `Back to {name}` |
| `vi:App.backlog.relearnAll` | `Học lại cả {count, number} từ` | `Học lại tất cả {count, number} từ` |
| `en:App.backlog.forget` | `Stop learning` | `Remove words from learning` |
| `vi:App.backlog.showing` | `đang có {shown, number}/{total, number} từ` | `Đang hiển thị {shown, number}/{total, number} từ` |
| `en:App.backlog.showing` | `showing {shown, number}/{total, number} words` | `Showing {shown, number}/{total, number} words` |
| `en:App.backlog.forgetTitle` | `Stop learning {count, plural, one {# word} other {# words}}?` | `Remove {count, plural, one {# word} other {# words}} from learning?` |
| `vi:App.backlog.forgetBody` | `Các từ này rời mọi nhóm và mất lịch ôn. Lịch sử ôn vẫn được giữ.` | `Các từ sẽ bị bỏ khỏi mọi nhóm và mất lịch ôn. Lịch sử ôn được giữ lại.` |
| `en:App.backlog.forgetBody` | `These words leave every deck and lose their schedule. Your review history is kept.` | `These words will be removed from every deck and lose their review schedule. Your review history is kept.` |
| `en:App.backlog.forgetConfirm` | `Stop learning {count, plural, one {# word} other {# words}}` | `Remove {count, plural, one {# word} other {# words}} from learning` |
| `vi:App.backlog.explain` | `Từ ở Bậc 1 trở lên mà quá hạn hơn {days, number} ngày sẽ rời phần cần ôn, để việc ôn mỗi ngày không dồn quá dài. <b>Học lại</b>: về Mới, tính như từ mới hôm nay. <b>Bỏ khỏi việc học</b>: rời mọi nhóm, không còn hẹn ôn. <b>Để đó</b>: không làm gì; Wordmet không bao giờ tự xóa từ.` | `Từ ở Bậc 1 trở lên rời danh sách ôn hằng ngày khi quá hạn hơn {days, number} ngày. <b>Học lại</b> đưa từ về Mới và tính vào số từ mới hôm nay. <b>Bỏ khỏi việc học</b> bỏ từ khỏi mọi nhóm và xóa lịch ôn. <b>Để đó</b> giữ nguyên; Wordmet không tự xóa từ.` |
| `en:App.backlog.explain` | `Words at Level 1 or above that are over {days, number} days overdue leave the review list, so a day’s review never piles up. <b>Relearn</b>: back to New, counted as a new word today. <b>Stop learning</b>: leaves every deck, no more reviews. <b>Leave it</b>: nothing happens; Wordmet never deletes a word by itself.` | `Words at Level 1 or higher leave the daily review list when they are more than {days, number} days overdue. <b>Relearn</b> moves a word to New and counts it as a new word today. <b>Remove words from learning</b> removes words from every deck and clears their review schedule. <b>Leave it</b> keeps everything as is. Wordmet won’t delete the words.` |
| `vi:App.topic.intro` | `{count, number} từ gợi ý. Chọn từ bạn muốn học hoặc thêm cả chủ đề.` | `{count, number} từ gợi ý. Chọn từng từ hoặc thêm tất cả từ chưa học.` |
| `en:App.topic.intro` | `{count, plural, one {# suggested word} other {# suggested words}}. Pick the words you want, or add the whole topic.` | `{count, plural, one {# suggested word} other {# suggested words}}. Select words individually or add all words you’re not already studying.` |
| `en:App.topic.selectAll` | `Select all {count, plural, one {# unlearned word} other {# unlearned words}} on this page` | `{count, plural, one {Select # word} other {Select all # words}} on this page that you’re not already studying` |
| `vi:App.topic.selected` | `đã chọn {count, number}` | `Đã chọn {count, number} từ` |
| `vi:App.topic.learning` | `đang học · {groups}` | `Đang học · {groups}` |
| `en:App.topic.learning` | `learning · {groups}` | `Studying · {groups}` |
| `vi:App.topic.learningNoGroup` | `đang học` | `Đang học` |
| `en:App.topic.learningNoGroup` | `learning` | `Studying` |
| `vi:App.topic.addTo` | `Thêm vào` | `Thêm vào nhóm` |
| `en:App.topic.addTo` | `Add to` | `Add to deck` |
| `vi:App.topic.addAll` | `Thêm tất cả từ chưa học ({count, number} từ)` | `Thêm cả {count, number} từ chưa học` |
| `en:App.topic.addAll` | `Add all words not yet learned ({count, plural, one {# word} other {# words}})` | `{count, plural, one {Add # word you’re not already studying} other {Add all # words you’re not already studying}}` |
| `vi:App.topic.resultSkipped` | `{already, number} từ đang học, {full, number} từ không vừa vì nhóm đã đầy, {missing, number} từ không còn.` | `{already, number} từ đang học, {full, number} từ chưa thêm do nhóm đầy, {missing, number} từ không còn.` |
| `en:App.topic.resultSkipped` | `{already, number} already learning, {full, number} didn’t fit because the deck is full, {missing, number} no longer available.` | `{already, number} already being studied, {full, number} skipped because the deck was full, {missing, number} no longer available.` |
| `vi:App.topic.resultAllSkipped` | `Trong {eligible, number} từ đủ điều kiện, {full, number} từ không vừa vì nhóm đã đầy.` | `Trong {eligible, number} từ có thể thêm, {full, number} từ chưa thêm do nhóm đầy.` |
| `en:App.topic.resultAllSkipped` | `Of {eligible, number} eligible words, {full, number} didn’t fit because the deck is full.` | `The deck was full, so {full, number} of {eligible, number} eligible words weren’t added.` |
| `vi:App.topic.targetMissing` | `Nhóm đích không còn khả dụng. Hãy chọn nhóm khác.` | `Không tìm thấy nhóm đã chọn. Chọn nhóm khác.` |
| `en:App.topic.targetMissing` | `The destination deck is no longer available. Choose another deck.` | `The selected deck is unavailable. Choose another deck.` |
| `vi:App.topic.pageGone` | `Trang này không còn từ. Bạn có thể thử tải lại.` | `Trang này không còn từ. Thử tải lại.` |
| `en:App.topic.pageGone` | `This page no longer has words. You can try loading it again.` | `This page no longer has words. Try loading it again.` |
| `vi:App.topic.confirmed` | `Đã xác nhận thêm {added, number} từ. {full, number} từ không vừa, {already, number} từ đang học, {missing, number} từ không còn.` | `Đã xác nhận {added, number} từ được thêm, {full, number} từ chưa thêm do nhóm đầy, {already, number} từ đang học, {missing, number} từ không còn.` |
| `en:App.topic.confirmed` | `Confirmed {added, number} added. {full, number} didn’t fit, {already, number} already learning, {missing, number} no longer available.` | `Confirmed so far · {added, number} added, {full, number} skipped because the deck was full, {already, number} already being studied, {missing, number} no longer available.` |
| `vi:App.topic.continueAdd` | `Tiếp tục thêm` | `Tiếp tục thêm từ` |
| `en:App.topic.continueAdd` | `Continue adding` | `Continue adding words` |
| `vi:App.topic.leaveAttempt` | `Dừng thao tác` | `Dừng thêm từ` |
| `en:App.topic.leaveAttempt` | `Stop adding` | `Stop adding words` |
| `vi:App.topic.retryExpired` | `Đã hết thời gian thử lại. Dừng thao tác để tải lại trạng thái.` | `Đã hết thời gian thử lại. Dừng thêm từ để tải lại chủ đề.` |
| `en:App.topic.retryExpired` | `The retry window expired. Stop adding to refresh the topic.` | `The retry window expired. Stop adding words to reload the topic.` |
| `vi:App.topic.back` | `Quay lại` | `Về danh sách nhóm` |
| `en:App.topic.back` | `Back` | `Back to your deck list` |
| `vi:App.review.left` | `còn {count, number} thẻ` | `Còn {count, number} thẻ` |
| `vi:App.review.back` | `Mặt sau: {meaning}` | `Mặt sau thẻ · {meaning}` |
| `en:App.review.back` | `Back: {meaning}` | `Back of card · {meaning}` |
| `en:App.review.doneTitle` | `{count, plural, one {# card done} other {# cards done}}` | `{count, plural, one {# card completed} other {# cards completed}}` |
| `vi:App.review.flipBack` | `Xem mặt trước` | `Lật về mặt trước` |
| `en:App.review.flipBack` | `See the front` | `Flip to the front` |
| `vi:App.review.nudge` | `Lật thẻ để xem nghĩa trước.` | `Lật thẻ để xem nghĩa.` |
| `en:App.review.nudge` | `Flip the card to see the meaning first.` | `Flip the card to see the meaning.` |
| `vi:App.review.legend` | `Phím` | `Phím tắt` |
| `en:App.review.legend` | `Keys` | `Keyboard shortcuts` |
| `vi:App.review.stop` | `Dừng phiên` | `Dừng phiên ôn` |
| `en:App.review.stop` | `Stop session` | `Stop review session` |
| `vi:App.lookup.mine` | `Chỉ từ của tôi` | `Chỉ hiện Từ của tôi` |
| `en:App.lookup.mine` | `Only my words` | `Show only my words` |
| `vi:App.lookup.clear` | `Xóa lọc` | `Xóa bộ lọc` |
| `vi:App.lookup.emptyTitle` | `Không tìm thấy từ này` | `Không tìm thấy từ phù hợp` |
| `en:App.lookup.emptyTitle` | `No word found` | `No matching words` |
| `vi:App.lookup.emptyBody` | `Thử bỏ bớt bộ lọc hoặc tự thêm từ này với nghĩa riêng.` | `Bỏ bớt bộ lọc hoặc thêm từ với nghĩa riêng.` |
| `en:App.lookup.emptyBody` | `Try fewer filters, or add the word yourself with your own meaning.` | `Remove some filters or add the word with your own meaning.` |
| `vi:App.lookup.searchLabel` | `Tìm từ, ví dụ: mitigate` | `Tìm từ, ví dụ mitigate` |
| `en:App.lookup.searchLabel` | `Search for a word, for example mitigate` | `Search for a word, such as mitigate` |
| `vi:App.lookup.page` | `trang {n, number}` | `Trang {n, number}` |
| `en:App.lookup.page` | `page {n, number}` | `Page {n, number}` |
| `vi:App.lookup.card` | `Thẻ của từ đang chọn` | `Thẻ từ đang chọn` |
| `en:App.lookup.card` | `Card of the selected word` | `Selected word card` |
| `en:App.lookup.stacksTitle` | `Choose a deck to add the word` | `Choose a deck for this word` |
| `vi:App.lookup.addHere` | `+ thêm vào đây` | `+ Thêm vào đây` |
| `en:App.lookup.addHere` | `+ add here` | `+ Add here` |
| `vi:App.lookup.hasIt` | `✓ đã có` | `✓ Đã có` |
| `en:App.lookup.hasIt` | `✓ already in` | `✓ Already in deck` |
| `vi:App.lookup.otherGroup` | `Nhóm khác hoặc tạo nhóm mới` | `Chọn nhóm khác hoặc tạo nhóm mới` |
| `en:App.lookup.otherGroup` | `Another deck or a new one` | `Choose another deck or create one` |
| `en:App.lookup.openWordArrow` | `Open the word page` | `Open word details` |
| `vi:App.word.learningTitle` | `Bạn đang học` | `Đang học` |
| `en:App.word.learningTitle` | `You are learning` | `Studying` |
| `en:App.word.notFoundTitle` | `No word “{word}”` | `Couldn’t find “{word}”` |
| `vi:App.word.notFoundBody` | `Từ này chưa có trong từ điển Wordmet. Bạn có thể tự thêm từ với nghĩa riêng.` | `Bạn có thể thêm từ này vào Wordmet với nghĩa riêng.` |
| `en:App.word.notFoundBody` | `Wordmet’s dictionary does not have this word yet. You can add it with your own meaning.` | `You can add this word to Wordmet with your own meaning.` |
| `vi:App.word.tabsLabel` | `Các phần của trang từ` | `Các mục trong trang từ` |
| `en:App.word.tabsLabel` | `Parts of the word page` | `Word page sections` |
| `vi:App.word.nextReview` | `Ôn tiếp` | `Lần ôn tiếp theo` |
| `vi:App.word.seenTitle` | `Câu bạn đã gặp` | `Câu đã gặp` |
| `vi:App.word.seenMeta` | `nghĩa {n, number} · {meaning} · ghi ngày {date}` | `Nghĩa {n, number} · {meaning} · lưu ngày {date}` |
| `en:App.word.seenMeta` | `meaning {n, number} · {meaning} · saved {date}` | `Meaning {n, number} · {meaning} · saved {date}` |
| `en:App.word.seeTopic` | `See the topic {topic}` | `View the {topic} topic` |
| `vi:App.word.mine.aiSource` | `Nguồn: AI gợi ý. Nghĩa này chưa ai duyệt, bạn nên kiểm lại.` | `AI gợi ý nghĩa này. Chưa có người duyệt. Kiểm tra trước khi dùng.` |
| `en:App.word.mine.aiSource` | `Source: AI suggestion. No one has checked this meaning yet, so check it yourself.` | `AI suggested this meaning. It hasn’t been reviewed. Check it before using it.` |
| `vi:App.word.mine.deleteBody` | `Từ này, các câu đã gặp của nó và việc học trong mọi nhóm sẽ bị xóa. Không hoàn tác được.` | `Bạn sẽ mất từ này, các câu đã lưu và tiến độ học từ trong mọi nhóm. Thao tác này không thể hoàn tác.` |
| `en:App.word.mine.deleteBody` | `This word, its saved sentences and its place in every deck will be deleted. This can’t be undone.` | `Deleting this word removes its saved sentences and study progress in every deck. This can’t be undone.` |
| `vi:App.addWord.byTopic` | `Thêm nhiều từ theo chủ đề` | `Thêm từ theo chủ đề` |
| `en:App.addWord.byTopic` | `Add several words by topic` | `Add words by topic` |
| `en:App.addWord.seeWords` | `See words` | `View words` |
| `vi:App.addWord.title` | `Bạn vừa gặp từ nào?` | `Thêm từ` |
| `en:App.addWord.title` | `What new word did you come across?` | `Add word` |
| `en:App.addWord.sentence` | `Sentence with the word (optional)` | `Sentence containing the word (optional)` |
| `en:App.addWord.noMatch` | `Wordmet has no “{word}” yet. Enter a meaning to save it.` | `Wordmet has no entry for “{word}” yet. Enter a meaning to save it.` |
| `vi:App.addWord.deckRequired` | `Chọn một nhóm để lưu từ.` | `Chọn nhóm để lưu từ.` |
| `vi:App.addWord.noDecks` | `Bạn chưa có nhóm nào. Tạo nhóm đầu tiên để lưu từ này.` | `Tạo nhóm đầu tiên để lưu từ này.` |
| `en:App.addWord.noDecks` | `You have no decks yet. Create your first deck to save this word.` | `Create your first deck to save this word.` |
| `vi:App.addWord.saveShort` | `Lưu` | `Lưu từ` |
| `en:App.addWord.saveShort` | `Save` | `Save word` |
| `en:App.addWord.manualSub` | `Only you see this word.` | `This word is visible only to you.` |
| `vi:App.addWord.wordRequired` | `Nhập từ bạn vừa gặp.` | `Nhập từ.` |
| `vi:App.addWord.openExisting` | `Mở từ này` | `Mở từ đã lưu` |
| `en:App.addWord.openExisting` | `Open this word` | `Open saved word` |
| `en:App.addWord.groupFull` | `“{group}” is full. Choose another deck.` | `The “{group}” deck is full. Choose another deck.` |
| `vi:App.addWord.privateLimit` | `Bạn đã có số từ riêng tối đa. Xóa bớt một từ để thêm từ mới.` | `Đã đạt giới hạn từ trong Từ của tôi. Xóa một từ để thêm từ mới.` |
| `en:App.addWord.privateLimit` | `You’ve reached the limit for your own words. Delete one to add another.` | `You’ve reached the limit in My words. Delete a word to add another.` |
| `vi:App.addWord.sentenceLimit` | `Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới.` | `Đã đạt giới hạn câu đã lưu cho nghĩa này. Xóa một câu để thêm câu mới.` |
| `en:App.addWord.sentenceLimit` | `This meaning has the maximum number of sentences. Delete one to add another.` | `This meaning has reached its limit for saved sentences. Delete a sentence to add another.` |
| `vi:App.addWord.noneNamed` | `Chưa có nhóm nào tên “{name}”.` | `Không tìm thấy nhóm tên “{name}”.` |
| `en:App.addWord.noneNamed` | `No deck named “{name}”.` | `No deck named “{name}” found.` |
| `vi:App.addWord.createAndSave` | `Tạo nhóm và lưu` | `Tạo nhóm và lưu từ` |
| `en:App.addWord.createAndSave` | `Create deck and save` | `Create deck and save word` |
| `vi:App.addWord.quickBody` | `Gõ từ, kể cả dạng đã chia như went (của go). Nếu có câu chứa từ, dán thêm vào.` | `Nhập từ, kể cả dạng chia như went (của go). Bạn có thể dán câu chứa từ ở bước tiếp theo.` |
| `en:App.addWord.quickBody` | `Type the word, even an inflected form like went (from go). Paste the sentence too if you have it.` | `Enter the word as you found it, such as went (from go). You can paste the sentence in the next step.` |
| `vi:App.addWord.quickSubmit` | `Thêm` | `Thêm từ` |
| `en:App.addWord.quickSubmit` | `Add` | `Add word` |
| `vi:App.addWord.sentenceSub` | `{lead}: {meaning} · đã có {count, number} câu` | `{lead} · {meaning} · đã lưu {count, number} câu` |
| `en:App.addWord.sentenceSub` | `{lead}: {meaning} · {count, plural, one {# sentence} other {# sentences}} so far` | `{lead} · {meaning} · {count, plural, one {# saved sentence} other {# saved sentences}}` |
| `vi:App.addWord.sentenceSubNone` | `{lead}: {meaning}` | `{lead} · {meaning}` |
| `en:App.addWord.sentenceSubNone` | `{lead}: {meaning}` | `{lead} · {meaning}` |
| `vi:App.addWord.sentenceField` | `Câu` | `Câu đã gặp` |
| `en:App.addWord.sentenceField` | `Sentence` | `Sentence containing the word` |
| `vi:App.addWord.seeSentences` | `Xem các câu đã gặp` | `Xem câu đã lưu` |
| `en:App.addWord.seeSentences` | `See saved sentences` | `View saved sentences` |
| `vi:App.addWord.bulkButton` | `Thêm cả loạt vào nhóm` | `Thêm hàng loạt vào nhóm` |
| `en:App.addWord.bulkButton` | `Add them all to a deck` | `Bulk add to deck` |
| `vi:App.addWord.bulkTitle` | `Thêm cả loạt vào nhóm` | `Thêm hàng loạt vào nhóm` |
| `en:App.addWord.bulkTitle` | `Add them all to a deck` | `Bulk add to deck` |
| `vi:App.addWord.bulkBody` | `{filters}. Từ chức năng được bỏ qua; từ đã có trong nhóm giữ nguyên.` | `{filters}. Bỏ qua từ chức năng và từ đã có trong nhóm.` |
| `en:App.addWord.bulkBody` | `{filters}. Function words are skipped; words already in the deck stay as they are.` | `{filters}. Function words and words already in the deck are skipped.` |
| `vi:App.addWord.bulkInto` | `Vào nhóm` | `Nhóm lưu từ` |
| `en:App.addWord.bulkInto` | `Deck` | `Destination deck` |
| `vi:App.addWord.bulkSubmit` | `Thêm cả loạt` | `Thêm các từ phù hợp` |
| `en:App.addWord.bulkSubmit` | `Add them all` | `Add matching words` |
| `vi:App.addWord.bulkSkipped` | `{already, number} từ đã có trong nhóm, {function, number} từ chức năng bỏ qua, {full, number} từ không vừa vì nhóm đã đầy.` | `{already, number} từ đã có, {function, number} từ chức năng bị bỏ qua, {full, number} từ chưa thêm do nhóm đầy.` |
| `en:App.addWord.bulkSkipped` | `{already, number} already in the deck, {function, number} function words skipped, {full, number} did not fit because the deck is full.` | `{already, number} already in the deck, {function, number} function words skipped, {full, number} skipped because the deck was full.` |
| `vi:App.addWord.pickDone` | `Xong` | `Xác nhận nhóm` |
| `en:App.addWord.pickDone` | `Done` | `Confirm decks` |
| `vi:App.addWord.pickerHint` | `Chọn được nhiều nhóm.` | `Có thể chọn nhiều nhóm.` |
| `en:App.addWord.pickerHint` | `You can choose several decks.` | `Select one or more decks.` |
| `vi:App.addWord.ai.left` | `còn {count, number} lượt tra AI` | `Còn {count, number} lượt tra AI` |
| `vi:App.addWord.ai.sendSentence` | `Gửi kèm câu đã gặp cho AI` | `Gửi kèm câu chứa từ cho AI` |
| `en:App.addWord.ai.sendSentence` | `Send the sentence to AI` | `Include the sentence in the AI lookup` |
| `vi:App.addWord.ai.failed` | `Không tra được bằng AI lúc này. Thử lại sau.` | `Không tra được từ bằng AI. Tự nhập nghĩa để tiếp tục.` |
| `en:App.addWord.ai.failed` | `Couldn’t look up the word with AI. Try again later.` | `Couldn’t look up the word with AI. Enter a meaning to continue.` |
| `vi:App.addWord.ai.refillDate` | `Lượt tra AI mới vào {date}.` | `Có lượt tra AI mới vào ngày {date}.` |
| `en:App.addWord.ai.refillDate` | `New AI credits for lookups on {date}.` | `AI credits for lookups reset on {date}.` |
| `vi:App.addWord.ai.refillTime` | `Lượt tra AI mới có lúc {time}.` | `Có lượt tra AI mới lúc {time}.` |
| `en:App.addWord.ai.refillTime` | `New AI credits for lookups at {time}.` | `AI credits for lookups reset at {time}.` |
| `vi:App.addWord.ai.notThis` | `Không phải nghĩa bạn cần?` | `Tra nghĩa khác bằng AI` |
| `en:App.addWord.ai.notThis` | `Not the meaning you need?` | `Find another meaning with AI` |
| `vi:App.addWord.result.used` | `Đã dùng 1 lượt tra AI · còn {remaining, number}` | `Còn {remaining, number} lượt tra AI · đã dùng 1 lượt` |
| `en:App.addWord.result.used` | `Used 1 AI credit · {remaining, number} left` | `AI credits for lookups: {remaining, number} left · 1 used` |
| `vi:App.addWord.result.choose` | `Chọn` | `Chọn nghĩa` |
| `en:App.addWord.result.choose` | `Choose` | `Choose meaning` |
| `en:App.addWord.result.definition` | `English definition (for reference, not saved): {text}` | `English definition for reference only, excluded from the saved card · {text}` |
| `vi:App.addWord.result.caution` | `AI gợi ý có thể sai. Kiểm lại trước khi lưu.` | `AI có thể gợi ý sai. Kiểm tra nghĩa trước khi lưu.` |
| `en:App.addWord.result.caution` | `AI suggestions can be wrong. Check before saving.` | `AI suggestions can be wrong. Check the meaning before saving.` |
| `vi:App.addWord.result.preview` | `Thẻ sẽ lưu · xem trước` | `Xem trước thẻ` |
| `en:App.addWord.result.preview` | `Card to save · preview` | `Card preview` |
| `vi:App.addWord.result.yourSentence` | `Câu bạn gặp` | `Câu đã nhập` |
| `en:App.addWord.result.yourSentence` | `Saved sentence` | `Entered sentence` |
| `vi:App.addWord.result.edit` | `Sửa rồi lưu` | `Sửa thẻ trước khi lưu` |
| `en:App.addWord.result.edit` | `Edit and save` | `Edit card before saving` |
| `vi:App.addWord.lockedDeck` | `Lưu vào nhóm: {name}` | `Lưu vào nhóm “{name}”` |
| `en:App.addWord.lockedDeck` | `Saving to deck: {name}` | `Save to the “{name}” deck` |
| `vi:App.addWord.deckGone` | `Nhóm này không còn.` | `Nhóm này không còn. Đóng hộp thoại để tiếp tục.` |
| `en:App.addWord.deckGone` | `This deck no longer exists.` | `This deck is no longer available. Close the dialog to continue.` |
| `vi:App.errors.inProgress` | `Lần bấm trước vẫn đang xử lý. Chờ một lát rồi thử lại.` | `Thao tác trước vẫn đang xử lý. Chờ một lát rồi thử lại.` |
| `en:App.errors.inProgress` | `Your last action is still in progress. Wait a moment and try again.` | `Your previous request is still in progress. Wait a moment, then try again.` |
| `vi:App.errors.account-locked` | `Tài khoản đang bị khóa. Liên hệ đội Wordmet nếu bạn cần mở lại.` | `Tài khoản bị khóa. Liên hệ đội Wordmet để yêu cầu mở khóa.` |
| `en:App.errors.account-locked` | `This account is locked. Contact the Wordmet team if you need it reopened.` | `Account locked. Contact the Wordmet team to ask them to unlock your account.` |
| `vi:App.errors.ai-lookup-failed` | `Không tra được bằng AI lúc này. Thử lại sau.` | `Không tra được từ bằng AI. Thử lại sau.` |
| `vi:App.errors.ai-quota-insufficient` | `Không đủ lượt câu AI cho phiên này.` | `Không đủ lượt câu AI cho phiên luyện này.` |
| `en:App.errors.ai-quota-insufficient` | `Not enough AI credits for questions for this session.` | `You don’t have enough AI credits for questions in this practice session.` |
| `vi:App.errors.ai-unavailable` | `AI đang không dùng được. Thử lại sau.` | `Hiện chưa dùng được AI. Thử lại sau.` |
| `en:App.errors.ai-unavailable` | `AI isn’t available right now. Try again later.` | `AI is unavailable right now. Try again later.` |
| `vi:App.errors.csrf-header-required` | `Có lỗi xảy ra. Tải lại trang rồi thử lại.` | `Không thực hiện được thao tác. Tải lại trang rồi thử lại.` |
| `en:App.errors.csrf-header-required` | `Something went wrong. Reload the page and try again.` | `Couldn’t complete the request. Reload the page and try again.` |
| `vi:App.errors.email-taken` | `Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu.` | `Email này đã có tài khoản. Nếu đó là email của bạn, chọn Quên mật khẩu.` |
| `en:App.errors.email-taken` | `This email already has an account. If it’s yours, use Forgot password.` | `This email address is linked to an account. If it’s yours, select Forgot password.` |
| `vi:App.errors.forbidden` | `Bạn không làm được thao tác này.` | `Bạn không có quyền thực hiện thao tác này.` |
| `en:App.errors.forbidden` | `You can’t do this.` | `You don’t have permission to do this.` |
| `vi:App.errors.group-full` | `Nhóm này đã đủ số từ tối đa.` | `Nhóm từ này đã đầy.` |
| `vi:App.errors.group-limit-reached` | `Bạn đã có đủ số nhóm tối đa. Xóa bớt một nhóm để tạo nhóm mới.` | `Đã đạt giới hạn nhóm từ. Xóa một nhóm để tạo nhóm mới.` |
| `vi:App.errors.idempotency-key-abandoned` | `Lần bấm trước bị dừng giữa chừng. Thử lại.` | `Thao tác trước bị gián đoạn. Thử lại.` |
| `en:App.errors.idempotency-key-abandoned` | `Your last action stopped halfway. Try again.` | `Your previous request was interrupted. Try again.` |
| `vi:App.errors.captcha-failed` | `Không qua được bước xác minh. Thử lại.` | `Xác minh không thành công. Thử lại.` |
| `en:App.errors.captcha-failed` | `Couldn’t complete the verification. Try again.` | `Verification failed. Try again.` |
| `vi:App.errors.captcha-unavailable` | `Bước xác minh đang không dùng được. Thử lại sau ít phút.` | `Chưa thể xác minh. Thử lại sau ít phút.` |
| `en:App.errors.captcha-unavailable` | `The verification isn’t available right now. Try again in a few minutes.` | `Verification is unavailable. Try again in a few minutes.` |
| `vi:App.errors.cancel-in-store` | `Gói này mua qua cửa hàng ứng dụng. Hủy gói trong phần quản lý gói của cửa hàng đó.` | `Gói được mua qua cửa hàng ứng dụng. Hủy gói trong mục quản lý gói của cửa hàng đó.` |
| `en:App.errors.cancel-in-store` | `This plan was bought in an app store. Cancel it in that store’s subscription settings.` | `Cancel this plan in the subscription settings of the app store where you bought it.` |
| `vi:App.errors.confirm-email-mismatch` | `Email bạn gõ không khớp với email của tài khoản. Gõ lại.` | `Email đã nhập không khớp. Nhập lại email của tài khoản.` |
| `en:App.errors.confirm-email-mismatch` | `The email you typed doesn’t match this account’s email. Type it again.` | `The email addresses don’t match. Enter the email address for this account.` |
| `vi:App.errors.google-email-unverified` | `Google chưa xác minh email này nên chưa đăng nhập được. Xác minh email ở Google rồi thử lại.` | `Google chưa xác minh email này. Xác minh email với Google rồi thử lại.` |
| `en:App.errors.google-email-unverified` | `Google hasn’t verified this email address yet. Verify it with Google and try again.` | `Google hasn’t verified this email address. Verify it with Google and try again.` |
| `vi:App.errors.provider-unavailable` | `Cổng thanh toán chưa phản hồi. Thử lại sau ít phút.` | `Cổng thanh toán đang tạm thời không khả dụng. Thử lại sau ít phút.` |
| `en:App.errors.provider-unavailable` | `The payment provider didn’t respond. Try again in a few minutes.` | `The payment provider is temporarily unavailable. Try again in a few minutes.` |
| `vi:App.errors.renewal-not-cancelled` | `Gói của bạn đang tự gia hạn. Hủy gói ở trang Gói học rồi thử lại.` | `Gói của bạn đang tự gia hạn. Hủy gia hạn trong Gói học rồi thử lại.` |
| `en:App.errors.renewal-not-cancelled` | `Your plan still renews. Cancel it on the Plans page, then try again.` | `Your plan renews automatically. Cancel renewal in Plans, then try again.` |
| `vi:App.errors.staff-account` | `Tài khoản nhân sự không tự xóa được. Nhờ admin xóa.` | `Bạn không thể tự xóa tài khoản nhân sự. Liên hệ admin để xóa.` |
| `en:App.errors.staff-account` | `A staff account can’t delete itself. Ask an admin to delete it.` | `You can’t delete your own staff account. Ask an admin to delete it.` |
| `vi:App.errors.subscription-renewing` | `Bạn còn gói đang tự gia hạn. Hủy gói trước khi xóa tài khoản.` | `Gói của bạn đang tự gia hạn. Hủy gia hạn trước khi xóa tài khoản.` |
| `en:App.errors.subscription-renewing` | `You still have a plan that renews. Cancel it before deleting your account.` | `Your plan renews automatically. Cancel renewal before deleting your account.` |
| `vi:App.errors.invalid-otp` | `Mã xác minh không đúng hoặc đã hết hạn. Nhập lại hoặc gửi mã mới.` | `Mã xác minh không đúng hoặc đã hết hạn. Nhập lại mã hoặc yêu cầu mã mới.` |
| `vi:App.errors.practice-no-words` | `Chưa có từ nào để luyện.` | `Chưa có từ để luyện.` |
| `vi:App.errors.quota-exhausted` | `Bạn đã dùng hết lượt của tính năng này.` | `Đã hết lượt dùng cho tính năng này.` |
| `en:App.errors.quota-exhausted` | `You’ve used up your allowance for this feature.` | `You’ve reached the usage limit for this feature.` |
| `vi:App.errors.rate-limited` | `Có quá nhiều thao tác trong thời gian ngắn. Thử lại sau {seconds, number} giây.` | `Quá nhiều yêu cầu. Thử lại sau {seconds, number} giây.` |
| `en:App.errors.rate-limited` | `Too many attempts in a short time. Try again in {seconds, number} seconds.` | `Too many requests. Try again in {seconds, number} seconds.` |
| `vi:App.errors.sentence-limit-reached` | `Nghĩa này đã đủ số câu tối đa. Xóa bớt một câu để thêm câu mới.` | `Nghĩa này đã đủ số câu tối đa. Xóa một câu để thêm câu mới.` |
| `en:App.errors.sentence-limit-reached` | `This meaning has the most sentences it can hold. Delete one to add a new one.` | `This meaning has reached its sentence limit. Delete a sentence to add another.` |
| `vi:App.errors.session-closed` | `Phiên này đã kết thúc.` | `Phiên luyện đã kết thúc.` |
| `en:App.errors.session-closed` | `This session has ended.` | `This practice session has ended.` |
| `vi:App.errors.version-conflict` | `Dữ liệu vừa được đổi ở nơi khác. Xem lại rồi lưu.` | `Dữ liệu đã thay đổi ở nơi khác. Xem lại rồi lưu.` |
| `en:App.errors.version-conflict` | `This was changed somewhere else. Check it and save again.` | `This was changed elsewhere. Review it and save again.` |
| `en:App.practice.types.meaning_in_sentence` | `Meaning in context` | `Choose the meaning in context` |
| `en:App.practice.types.mcq_sentence` | `Sentence multiple choice` | `Multiple choice in context` |
| `vi:App.practice.hero.artPrompt` | `Ví dụ một câu · chọn từ đúng nghĩa` | `Câu mẫu · chọn từ đúng nghĩa` |
| `en:App.practice.hero.artPrompt` | `One question · choose the right word` | `Sample question · choose the word that matches the meaning` |
| `vi:App.practice.hero.body` | `{count, number} câu, trộn ba kiểu: {types}.` | `{count, number} câu thuộc ba kiểu: {types}.` |
| `en:App.practice.hero.body` | `{count, plural, one {# question} other {# questions}}, mixing three types: {types}.` | `{count, plural, one {# question} other {# questions}} across three types: {types}.` |
| `vi:App.practice.sources.group.body` | `Một nhóm, lọc theo bậc hoặc từ ưu tiên.` | `Luyện một nhóm từ. Lọc theo bậc hoặc từ ưu tiên.` |
| `en:App.practice.sources.group.body` | `One deck, filtered by level or priority words.` | `Practice one deck. Filter by level or priority.` |
| `vi:App.practice.sources.priority.body` | `Từ bạn đã bấm Cần ôn lại, bấm lâu nhất trước.` | `Luyện trước các từ được đánh dấu Cần ôn lại sớm nhất.` |
| `en:App.practice.sources.priority.body` | `Words you marked Needs review, oldest first.` | `Start with the words you marked Needs review earliest.` |
| `vi:App.practice.sources.all.body` | `Mọi từ đang học, từ lâu chưa luyện trước.` | `Bắt đầu từ những từ lâu chưa luyện.` |
| `en:App.practice.sources.all.body` | `Every word you’re learning, least practiced first.` | `Start with the words you haven’t practiced in the longest time.` |
| `vi:App.practice.noWords.no-word-fits-types` | `Không từ nào làm được kiểu câu đã chọn. Chọn thêm kiểu câu khác.` | `Không có từ phù hợp với các kiểu câu đã chọn. Chọn thêm kiểu câu khác.` |
| `en:App.practice.noWords.no-word-fits-types` | `No word works with the chosen question types. Choose another type.` | `None of the words fit the selected question types. Choose another type.` |
| `vi:App.practice.usage.plan.free` | `Gói Miễn phí` | `Gói Free` |
| `vi:App.practice.usage.note` | `Một phiên chỉ tính khi bạn trả lời câu đầu tiên. Mở lại lúc {time}.` | `Phiên được tính khi bạn trả lời câu đầu tiên. Có phiên mới lúc {time}.` |
| `en:App.practice.usage.note` | `A session counts once you answer its first question. Resets at {time}.` | `A session counts when you answer the first question. Your daily limit resets at {time}.` |
| `vi:App.practice.usage.out` | `Hết phiên luyện hôm nay. Mở lại lúc {time}, còn {wait}.` | `Hết phiên luyện hôm nay. Có phiên mới lúc {time} (còn {wait}).` |
| `en:App.practice.usage.out` | `No sessions left today. Resets at {time}, in {wait}.` | `No practice sessions left today. Your limit resets at {time} (in {wait}).` |
| `vi:App.practice.usage.outShort` | `Hết phiên luyện hôm nay. Mở lại lúc {time}.` | `Hết phiên luyện hôm nay. Có phiên mới lúc {time}.` |
| `en:App.practice.usage.outShort` | `No sessions left today. Resets at {time}.` | `No practice sessions left today. Your limit resets at {time}.` |
| `vi:App.practice.current.title` | `Phiên đang dở` | `Phiên luyện đang mở` |
| `vi:App.practice.current.body` | `{source}, đã làm {done, number}/{total, number} câu. Bắt đầu phiên mới sẽ đóng phiên này.` | `{source} · Đã làm {done, number}/{total, number} câu. Bắt đầu phiên mới sẽ kết thúc phiên này.` |
| `en:App.practice.current.body` | `{source}, {done, number}/{total, number} questions done. Starting a new session ends this one.` | `{source} · {done, number}/{total, number} questions answered. Starting a new session ends this one.` |
| `vi:App.practice.current.bodyOut` | `{source}, đã làm {done, number}/{total, number} câu. Phiên này đã tính vào hôm nay nên bạn vẫn làm tiếp được.` | `{source} · Đã làm {done, number}/{total, number} câu. Phiên này đã tính vào hôm nay. Bạn vẫn có thể làm tiếp.` |
| `en:App.practice.current.bodyOut` | `{source}, {done, number}/{total, number} questions done. It already counts for today, so you can still finish it.` | `{source} · {done, number}/{total, number} questions answered. This session already counts toward today’s limit. You can continue.` |
| `vi:App.practice.current.resumeWaiting` | `Làm tiếp` | `Làm tiếp phiên` |
| `en:App.practice.current.resumeWaiting` | `Continue` | `Continue session` |
| `vi:App.practice.resumeDialog.title` | `Bạn có phiên đang dở {done, number}/{total, number}` | `Phiên đang mở · {done, number}/{total, number} câu` |
| `en:App.practice.resumeDialog.title` | `You have a session in progress ({done, number}/{total, number})` | `Session in progress · {done, number}/{total, number} questions` |
| `vi:App.practice.resumeDialog.body` | `{source}, đã làm {done, number}/{total, number} câu. Mở phiên mới sẽ đóng phiên này.` | `{source}: Bắt đầu phiên mới sẽ kết thúc phiên này ở mốc {done, number}/{total, number} câu.` |
| `en:App.practice.resumeDialog.body` | `{source}, {done, number}/{total, number} questions done. A new session ends this one.` | `{source}: Starting a new session ends this one at {done, number}/{total, number} questions answered.` |
| `vi:App.practice.resumeDialog.resume` | `Làm tiếp` | `Làm tiếp phiên` |
| `en:App.practice.resumeDialog.resume` | `Continue` | `Continue session` |
| `vi:App.practice.resumeDialog.startNew` | `Mở phiên mới` | `Bắt đầu phiên mới` |
| `vi:App.practice.out.body` | `{plan} có {limit, number} phiên luyện mỗi ngày, mở lại lúc {time}. Trong lúc chờ, ôn thẻ không giới hạn.` | `{plan}: {limit, number} phiên luyện mỗi ngày. Có phiên mới lúc {time}. Bạn vẫn có thể ôn thẻ không giới hạn.` |
| `en:App.practice.out.body` | `The {plan} includes {limit, number} practice sessions a day, resetting at {time}. Meanwhile, review cards as much as you like.` | `{plan}: {limit, number} practice sessions a day. Your limit resets at {time}. Card reviews are still unlimited.` |
| `vi:App.practice.shortcuts.stop` | `Dừng phiên, xem tổng kết` | `Dừng phiên và xem tổng kết` |
| `en:App.practice.shortcuts.stop` | `Stop, see summary` | `Stop and view summary` |
| `vi:App.practice.customize.title` | `Tùy chỉnh phiên` | `Tùy chỉnh phiên luyện` |
| `en:App.practice.customize.title` | `Customize session` | `Customize practice session` |
| `vi:App.practice.customize.promptMixed` | `Trộn` | `Kết hợp` |
| `en:App.practice.customize.count` | `Questions` | `Number of questions` |
| `vi:App.practice.customize.sorts.priority_oldest` | `Bấm Cần ôn lại lâu nhất trước` | `Cần ôn lại · đánh dấu sớm nhất trước` |
| `en:App.practice.customize.sorts.priority_oldest` | `Oldest Needs review first` | `Marked Needs review earliest` |
| `vi:App.practice.customize.sessionsLeft` | `Dùng 1 trong {remaining, number} phiên còn lại hôm nay.` | `Phiên này dùng 1 trong {remaining, number} phiên còn lại hôm nay.` |
| `en:App.practice.customize.ownToggle` | `Fill in your saved sentences` | `Fill in blanks in saved sentences` |
| `vi:App.practice.customize.quotaBody` | `Phiên này cần {needed, number} lượt câu AI, bạn còn {remaining, number}.` | `Cần {needed, number} lượt câu AI · còn {remaining, number}.` |
| `en:App.practice.customize.quotaBody` | `This session needs {needed, plural, one {# AI credit} other {# AI credits}} for questions, and you have {remaining, number}.` | `Required: {needed, plural, one {# AI credit} other {# AI credits}} · remaining: {remaining, number}.` |
| `vi:App.practice.customize.quotaRefillDate` | `Lượt câu AI mới vào {date}.` | `Có lượt câu AI mới vào ngày {date}.` |
| `en:App.practice.customize.quotaRefillDate` | `New AI credits for questions arrive on {date}.` | `AI credits for questions reset on {date}.` |
| `vi:App.practice.customize.quotaRefillTime` | `Lượt câu AI mới có lúc {time}.` | `Có lượt câu AI mới lúc {time}.` |
| `en:App.practice.customize.quotaRefillTime` | `New AI credits for questions arrive at {time}.` | `AI credits for questions reset at {time}.` |
| `vi:App.practice.customize.aiUnavailable` | `Kiểu câu AI đang không dùng được. Bỏ kiểu câu AI để bắt đầu hoặc thử lại sau.` | `Chưa dùng được kiểu câu AI. Tắt kiểu câu AI để bắt đầu hoặc thử lại sau.` |
| `en:App.practice.customize.aiUnavailable` | `AI question types aren’t available right now. Turn them off to start, or try again later.` | `AI question types are unavailable. Turn them off to start or try again later.` |
| `vi:App.practice.customize.dropAi` | `Bỏ kiểu câu có AI` | `Tắt kiểu câu AI` |
| `vi:App.practice.customize.filterLabel` | `Lấy từ nào` | `Chọn từ để luyện` |
| `en:App.practice.customize.filterLabel` | `Which words` | `Words to practice` |
| `en:App.practice.customize.mcPick` | `Sentence multiple choice` | `Multiple choice in context` |
| `en:App.practice.customize.mcMeaning` | `Pick the meaning` | `Choose the meaning` |
| `en:App.practice.customize.mcWord` | `Pick the word` | `Choose the word` |
| `vi:App.practice.customize.mcMixed` | `Trộn` | `Kết hợp` |
| `en:App.practice.customize.mcMixed` | `Mix` | `Mixed` |
| `vi:App.practice.customize.aiTitle` | `Câu AI viết` | `Câu AI` |
| `en:App.practice.customize.aiTitle` | `AI-written questions` | `AI questions` |
| `vi:App.practice.customize.aiMax` | `Tối đa {max, number} câu AI · còn {left, number} lượt` | `Tối đa {max, number} câu AI · còn {left, number} lượt câu AI` |
| `en:App.practice.customize.aiMax` | `Up to {max, number} AI questions · {left, number} credits left` | `AI question limit: {max, number} · AI credits left: {left, number}` |
| `vi:App.practice.customize.aiMaxLeft` | `Tối đa {max, number} câu AI, vì bạn còn {left, number} lượt` | `Tối đa {max, number} câu AI · còn {left, number} lượt câu AI` |
| `en:App.practice.customize.aiMaxLeft` | `Up to {max, number} AI questions, as you have {left, number} credits left` | `AI question limit: {max, number} · AI credits left: {left, number}` |
| `en:App.practice.customize.aiNone` | `A {count, plural, one {#-question} other {#-question}} session has no AI questions.` | `No AI questions in this {count, plural, one {#-question} other {#-question}} session.` |
| `vi:App.practice.customize.mixLine` | `Dùng câu đã gặp cho những từ có sẵn câu; từ còn lại do AI viết.` | `Ưu tiên câu đã gặp. AI viết câu cho những từ chưa có câu.` |
| `en:App.practice.customize.mixLine` | `Words with a saved sentence use it; AI writes the others.` | `Use saved sentences first. AI writes sentences for words without one.` |
| `vi:App.practice.customize.placement` | `Xếp câu AI` | `Thứ tự câu AI` |
| `vi:App.practice.customize.aiSummary` | `Trong đó {count, number} câu AI, {placement}.` | `{count, number} câu AI · {placement}` |
| `en:App.practice.customize.aiSummary` | `{count, plural, one {# AI question} other {# AI questions}} among them, {placement}.` | `{count, plural, one {# AI question} other {# AI questions}} · {placement}` |
| `en:App.practice.customize.aiSummaryEven` | `spread out` | `spread evenly` |
| `vi:App.practice.customize.ownHelp` | `Chỉ hỏi những từ có câu đã gặp. Không tốn lượt câu AI.` | `Chỉ luyện từ có câu đã gặp. Không dùng lượt câu AI.` |
| `en:App.practice.customize.ownHelp` | `Asks only words that have a saved sentence. Uses no AI credits.` | `Practice only words with a saved sentence. No AI credits required.` |
| `vi:App.practice.session.close` | `Dừng phiên, xem tổng kết` | `Dừng phiên và xem tổng kết` |
| `en:App.practice.session.close` | `Stop, see summary` | `Stop and view summary` |
| `en:App.practice.session.aiChip` | `AI sentence` | `AI question` |
| `vi:App.practice.session.translationAi` | `AI dịch` | `Bản dịch AI` |
| `vi:App.practice.session.ai.preparingTitle` | `Đang tạo câu…` | `Đang tạo câu hỏi…` |
| `en:App.practice.session.ai.quotaTitle` | `No AI credits left for questions` | `No AI credits for questions left` |
| `vi:App.practice.session.ai.refillDate` | `Lượt câu AI mới vào {date}.` | `Có lượt câu AI mới vào ngày {date}.` |
| `en:App.practice.session.ai.refillDate` | `New AI credits for questions arrive on {date}.` | `AI credits for questions reset on {date}.` |
| `vi:App.practice.session.ai.refillTime` | `Lượt câu AI mới có lúc {time}.` | `Có lượt câu AI mới lúc {time}.` |
| `en:App.practice.session.ai.refillTime` | `New AI credits for questions arrive at {time}.` | `AI credits for questions reset at {time}.` |
| `vi:App.practice.session.ai.stayOpen` | `Nếu dừng, phiên vẫn mở và bạn làm tiếp sau được.` | `Bạn có thể dừng và làm tiếp phiên này sau.` |
| `en:App.practice.session.ai.stayOpen` | `If you stop, the session stays open and you can finish it later.` | `You can stop and continue this session later.` |
| `vi:App.practice.session.ai.fallback` | `Câu này chuyển sang kiểu câu thường.` | `Câu này chuyển sang kiểu câu khác.` |
| `en:App.practice.session.ai.fallback` | `This question switched to a regular type.` | `This question uses a different type.` |
| `vi:App.practice.session.ai.fallbackQuota` | `Hết lượt câu AI. Các câu còn lại của phiên dùng kiểu câu khác.` | `Hết lượt câu AI. Phiên tiếp tục với các kiểu câu khác.` |
| `en:App.practice.session.ai.fallbackQuota` | `No AI credits left for questions. The rest of this session uses other question types.` | `No AI credits for questions left. The session continues with other question types.` |
| `vi:App.practice.session.ai.notRecognized` | `AI chưa nhận ra từ “{lemma}” bạn tự thêm, nên câu này dùng kiểu câu khác.` | `AI chưa nhận ra từ “{lemma}” bạn tự thêm. Câu này chuyển sang kiểu câu khác.` |
| `en:App.practice.session.ai.notRecognized` | `AI didn’t recognize “{lemma}”, a word you added, so this question uses another type.` | `AI didn’t recognize “{lemma}”, a word you added. This question uses a different type.` |
| `vi:App.practice.session.ai.notRecognizedAny` | `AI chưa nhận ra một từ bạn tự thêm, nên câu này dùng kiểu câu khác.` | `AI chưa nhận ra một từ bạn tự thêm. Câu này chuyển sang kiểu câu khác.` |
| `en:App.practice.session.ai.notRecognizedAny` | `AI didn’t recognize a word you added, so this question uses another type.` | `AI didn’t recognize a word you added. This question uses a different type.` |
| `vi:App.practice.session.ai.seeWord` | `Xem lại từ trong Từ của tôi` | `Xem từ trong Từ của tôi` |
| `en:App.practice.session.ai.seeWord` | `Check the word in My words` | `View the word in My words` |
| `en:App.practice.session.kind.meaning_in_sentence` | `Meaning in the sentence` | `Choose the meaning in context` |
| `en:App.practice.session.kind.mcq_sentence` | `Sentence multiple choice` | `Multiple choice in context` |
| `vi:App.practice.session.next` | `Câu tiếp` | `Câu tiếp theo` |
| `en:App.practice.session.next` | `Next` | `Next question` |
| `vi:App.practice.session.noteWrong` | `Nhấn Enter để đưa {lemma} lên đầu nhóm, về Bậc 1. Câu tiếp: giữ lịch ôn.` | `Nhấn Enter để đưa {lemma} về Bậc 1, lên đầu nhóm. Chọn Câu tiếp theo để giữ lịch ôn.` |
| `en:App.practice.session.noteWrong` | `Press Enter to put {lemma} at the top of its deck, back to Level 1. Next keeps its schedule.` | `Press Enter to move {lemma} to Level 1 at the top of its deck. Choose Next question to keep its review schedule.` |
| `vi:App.practice.session.noteKnowEnter` | `Nhấn Enter là Đã biết: {lemma} lên một bậc. Chưa chắc thì bấm Cần ôn lại.` | `Nhấn Enter để đánh dấu Đã biết và đưa {lemma} lên một bậc. Nếu chưa chắc, chọn Cần ôn lại.` |
| `en:App.practice.session.noteKnowEnter` | `Press Enter to mark it Known: {lemma} moves up a level. Not sure? Choose Needs review.` | `Press Enter to mark {lemma} as Known and move it up one level. If you’re unsure, choose Needs review.` |
| `vi:App.practice.session.noteHint` | `Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết.` | `Gợi ý không đổi cách chấm. Nếu trả lời đúng nhờ gợi ý, bạn không thể chọn Đã biết.` |
| `en:App.practice.session.noteHint` | `Hints don’t change the grading, but a correct answer after a hint has no Known button.` | `Hints don’t change grading. If you answer correctly after a hint, you can’t choose Known.` |
| `vi:App.practice.session.hint.kinds.letters` | `Chữ cái đầu và số chữ` | `Chữ cái đầu và số chữ cái` |
| `en:App.practice.session.hint.kinds.letters` | `First letter and length` | `First letter and word length` |
| `en:App.practice.session.report.button` | `Report` | `Report a problem` |
| `vi:App.practice.session.report.question` | `Lỗi gì?` | `Bạn thấy lỗi gì?` |
| `vi:App.practice.session.report.noteMissing` | `Ghi rõ lỗi để gửi báo lỗi này.` | `Mô tả lỗi để gửi báo lỗi.` |
| `en:App.practice.session.report.noteMissing` | `Describe the problem to send this report.` | `Describe the error to send the report.` |
| `vi:App.practice.session.report.info` | `Đội Wordmet xem lại câu này. Trong lúc chờ, câu này không tính vào Từ hay sai; kết quả đã chấm giữ nguyên.` | `Đội Wordmet sẽ xem lại câu này. Trong lúc chờ, câu này không tính vào mục Từ hay sai. Kết quả chấm giữ nguyên.` |
| `en:App.practice.session.report.info` | `The Wordmet team will check this question. Until then it doesn’t count toward Weak words; the grade stays as it is.` | `The Wordmet team will review this question. Until then, it won’t count toward Weak words. Your grade stays the same.` |
| `vi:App.practice.session.report.done` | `Đã gửi báo lỗi. Xem kết quả ở Cài đặt, mục Báo lỗi của tôi.` | `Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi.` |
| `en:App.practice.session.report.done` | `Report sent. See the outcome in Settings, under My reports.` | `Report sent. See the outcome in Settings → My reports.` |
| `vi:App.practice.session.round.title` | `Bạn đã làm hết {words, number} từ` | `Đã luyện hết {words, number} từ` |
| `en:App.practice.session.round.title` | `You’ve done all {words, plural, one {# word} other {# words}}` | `You’ve practiced all {words, plural, one {# word} other {# words}}` |
| `vi:App.practice.session.round.body` | `Phiên đặt {target, number} câu, nhưng chỉ có {words, number} từ. Luyện lại thêm {left, number} câu với chính các từ này? Wordmet xáo thứ tự và đổi kiểu câu khi được.` | `Mục tiêu: {target, number} câu với {words, number} từ. Luyện thêm {left, number} câu với các từ này? Wordmet sẽ xáo thứ tự từ và đổi kiểu câu khi có thể.` |
| `en:App.practice.session.round.body` | `The session has {target, number} questions, but only {words, plural, one {# word} other {# words}}. Practice {left, number} more with the same words? Wordmet shuffles them and changes the question type when it can.` | `Goal: {target, number} questions with {words, plural, one {# word} other {# words}}. Practice {left, number} more with the same words? Wordmet shuffles the words and changes question types when possible.` |
| `vi:App.practice.session.round.go` | `Luyện lại thêm {left, number} câu` | `Luyện thêm {left, number} câu` |
| `vi:App.practice.session.round.stop` | `Kết thúc, xem tổng kết` | `Kết thúc và xem tổng kết` |
| `en:App.practice.session.round.stop` | `Finish, see summary` | `Finish and view summary` |
| `vi:App.practice.session.round.note` | `Câu hỏi này chỉ hiện một lần trong phiên. Luyện thêm vẫn tính trong phiên này, không tốn thêm phiên.` | `Thông báo này chỉ hiện một lần mỗi phiên. Luyện thêm không dùng thêm phiên.` |
| `en:App.practice.session.round.note` | `You see this question only once per session. Extra questions stay in this session and don’t use another session.` | `This prompt appears once per session. Extra questions don’t count as a new session.` |
| `vi:App.practice.session.summary.title` | `Xong {count, number} câu` | `Đã làm {count, number} câu` |
| `en:App.practice.session.summary.title` | `{count, plural, one {# question} other {# questions}} done` | `{count, plural, one {# question} other {# questions}} answered` |
| `vi:App.practice.session.summary.line` | `{source}, {types}. Hôm nay còn {remaining, number}/{limit, number} phiên luyện.` | `{source} · {types}. Còn {remaining, number}/{limit, number} phiên luyện hôm nay.` |
| `en:App.practice.session.summary.line` | `{source}, {types}. {remaining, number} of {limit, plural, one {# session} other {# sessions}} left today.` | `{source} · {types}. {remaining, number} of {limit, plural, one {# practice session} other {# practice sessions}} left today.` |
| `vi:App.practice.session.summary.lineNoPool` | `{source}, {types}.` | `{source} · {types}.` |
| `en:App.practice.session.summary.lineNoPool` | `{source}, {types}.` | `{source} · {types}.` |
| `vi:App.practice.session.summary.mixed` | `trộn {count, number} kiểu câu` | `{count, number} kiểu câu` |
| `vi:App.practice.session.summary.added` | `Đã đưa vào ưu tiên` | `Đã đánh dấu ưu tiên` |
| `en:App.practice.session.summary.added` | `Added to priority` | `Marked for priority review` |
| `vi:App.practice.session.noteNotDue` | `{lemma} chưa tới hạn ôn nên lịch ôn giữ nguyên.` | `{lemma} chưa đến hạn ôn. Lịch ôn giữ nguyên.` |
| `en:App.practice.session.noteNotDue` | `{lemma} isn’t due yet, so its schedule stays the same.` | `{lemma} isn’t due for review. Its schedule stays the same.` |
| `vi:App.practice.session.noteKnowTap` | `Bấm Đã biết thì {lemma} lên một bậc.` | `Chọn Đã biết để đưa {lemma} lên một bậc.` |
| `en:App.practice.session.noteKnowTap` | `Tap Known and {lemma} moves up a level.` | `Choose Known to move {lemma} up one level.` |
| `vi:App.practice.session.noteWrongTap` | `Cần ôn lại: {lemma} lên đầu nhóm, về Bậc 1. Câu tiếp: giữ lịch ôn.` | `Chọn Cần ôn lại để đưa {lemma} về Bậc 1, lên đầu nhóm. Chọn Câu tiếp theo để giữ lịch ôn.` |
| `en:App.practice.session.noteWrongTap` | `Needs review: {lemma} goes to the top of its deck, back to Level 1. Next keeps its schedule.` | `Choose Needs review to move {lemma} to Level 1 at the top of its deck. Choose Next question to keep its review schedule.` |
| `vi:App.practice.session.legend.hint` | `Gợi ý` | `Xem gợi ý` |
| `en:App.practice.session.legend.hint` | `Hint` | `Show hint` |
| `en:App.practice.session.legend.stop` | `Stop` | `Stop session` |
| `vi:App.practice.session.legend.next` | `Câu tiếp` | `Câu tiếp theo` |
| `en:App.practice.session.legend.next` | `Next` | `Next question` |
| `vi:App.practice.weak.cols.last` | `Sai gần nhất` | `Lần sai gần nhất` |
| `vi:App.practice.weak.rulesTitle` | `Từ vào và rời danh sách thế nào?` | `Cách tính từ hay sai` |
| `en:App.practice.weak.rulesTitle` | `How do words join and leave this list?` | `How weak words are counted` |
| `vi:App.practice.weak.rules.skip` | `Không tính: câu đúng nhờ gợi ý và câu bạn đã báo lỗi mà đội Wordmet đang xem, đã sửa hoặc đã xác nhận lỗi.` | `Không tính câu đúng nhờ gợi ý và câu đã báo lỗi nếu Wordmet đang xem, đã sửa hoặc xác nhận có lỗi.` |
| `en:App.practice.weak.rules.skip` | `Not counted: right answers after a hint, and questions you reported that the Wordmet team is checking, fixed, or confirmed.` | `The list excludes correct answers after a hint and reported questions that Wordmet is reviewing, has fixed, or has confirmed as errors.` |
| `vi:App.practice.weak.rules.out` | `Rời: khi 5 câu gần nhất còn dưới 2 câu sai.` | `Rời danh sách khi số câu sai trong 5 câu gần nhất giảm xuống dưới 2.` |
| `en:App.practice.weak.rules.out` | `Leaves: when fewer than 2 of the last 5 questions are wrong.` | `A word leaves the list when fewer than 2 of its last 5 answers are wrong.` |
| `vi:App.practice.weak.reopens` | `Hết phiên luyện hôm nay. Mở lại lúc {time}.` | `Hết phiên luyện hôm nay. Có phiên mới lúc {time}.` |
| `en:App.practice.weak.reopens` | `No sessions left today. Resets at {time}.` | `No practice sessions left today. Your limit resets at {time}.` |
| `vi:App.practice.reports.emptyTitle` | `Bạn chưa báo lỗi câu nào` | `Chưa có báo lỗi` |
| `en:App.practice.reports.emptyTitle` | `You haven’t reported any questions` | `No reports yet` |
| `vi:App.practice.reports.emptyBody` | `Gặp câu sai khi luyện tập, bấm Báo lỗi ngay trên câu đó. Kết quả hiện ở đây.` | `Chọn Báo lỗi ngay trên câu hỏi khi luyện tập. Kết quả hiển thị tại đây.` |
| `en:App.practice.reports.emptyBody` | `If a question looks wrong during practice, choose Report on it. The outcome shows up here.` | `Select Report a problem on the question during practice. The outcome appears here.` |
| `vi:App.practice.reports.aiQuestion` | `câu AI` | `Câu AI` |
| `vi:App.practice.reports.loading` | `Đang tải báo lỗi` | `Đang tải danh sách báo lỗi` |
| `vi:App.plans.subscriptions.renews` | `Gói đang tự gia hạn` | `Tự gia hạn` |
| `en:App.plans.subscriptions.renews` | `The plan renews automatically` | `Renews automatically` |
| `vi:App.plans.subscriptions.ends` | `Gói đã hủy gia hạn` | `Đã hủy gia hạn` |
| `en:App.plans.subscriptions.ends` | `Renewal is cancelled` | `Renewal canceled` |
| `vi:App.plans.subscriptions.cancel` | `Hủy gói` | `Hủy gia hạn` |
| `en:App.plans.subscriptions.cancel` | `Cancel plan` | `Cancel renewal` |
| `vi:App.plans.subscriptions.dialogTitle` | `Hủy gói?` | `Hủy gia hạn gói?` |
| `en:App.plans.subscriptions.dialogTitle` | `Cancel the plan?` | `Cancel plan renewal?` |
| `vi:App.plans.subscriptions.dialogBody` | `Gói vẫn dùng tới hết {date}, sau đó không gia hạn. Không hoàn tiền cho thời gian còn lại.` | `Bạn dùng gói đến hết {date}. Gói sẽ không gia hạn. Không hoàn tiền cho thời gian còn lại.` |
| `en:App.plans.subscriptions.dialogBody` | `The plan stays until {date}, then it does not renew. No refund for the time left.` | `You can use your plan through {date}. It won’t renew. There’s no refund for the time remaining.` |
| `vi:App.plans.subscriptions.dialogBodyNoDate` | `Gói vẫn dùng tới hết kỳ đã trả tiền, sau đó không gia hạn. Không hoàn tiền cho thời gian còn lại.` | `Bạn dùng gói đến hết kỳ đã thanh toán. Gói sẽ không gia hạn. Không hoàn tiền cho thời gian còn lại.` |
| `en:App.plans.subscriptions.dialogBodyNoDate` | `The plan stays until the end of the paid period, then it does not renew. No refund for the time left.` | `You can use your plan through the end of the paid period. It won’t renew. There’s no refund for the time remaining.` |
| `en:App.plans.subscriptions.requested` | `Cancel request sent` | `Cancellation request sent` |
| `vi:App.plans.order.pending` | `Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này.` | `Gói Pro tự kích hoạt khi nhận được thanh toán. Bạn có thể đóng trang này.` |
| `en:App.plans.order.pending` | `Pro turns on by itself when the money arrives. You can close this page.` | `Pro activates as soon as payment is received. You can close this page.` |
| `vi:App.plans.order.newOrder` | `Bạn có thể tạo đơn mới tại trang Gói học.` | `Tạo đơn mới trên trang Gói học.` |
| `en:App.plans.order.newOrder` | `You can place a new order on the Plans page.` | `Place a new order on the Plans page.` |
| `vi:App.plans.order.toPlans` | `Đến trang Gói học` | `Xem các gói` |
| `en:App.plans.order.toPlans` | `Go to Plans` | `View plans` |
| `vi:App.plans.title` | `Học đều mỗi ngày, lên Pro khi cần` | `Gói Free và Pro` |
| `en:App.plans.title` | `Learn a little every day, go Pro when you need it` | `Free and Pro plans` |
| `vi:App.plans.lead` | `Trả một lần cho mỗi kỳ, không tự gia hạn. Hết kỳ, bạn về gói Miễn phí.` | `Mỗi kỳ thanh toán một lần và không tự gia hạn. Hết kỳ, bạn trở về gói Free.` |
| `en:App.plans.lead` | `Pay once for each period, with no automatic renewal. When it ends, you go back to Free.` | `Pay once per period. There’s no automatic renewal. At the end of the period, you return to the Free plan.` |
| `en:App.plans.titlePro` | `You’re on Pro` | `You’re on the Pro plan` |
| `en:App.plans.titleTrial` | `You’re trying Pro` | `You’re trying the Pro plan` |
| `vi:App.plans.free` | `Miễn phí` | `Free` |
| `vi:App.plans.oneTime` | `Trả một lần, dùng {period}, không tự gia hạn.` | `Thanh toán một lần cho {period}. Gói không tự gia hạn.` |
| `en:App.plans.oneTime` | `One payment for {period}, no automatic renewal.` | `Pay once for {period}. Your plan doesn’t renew automatically.` |
| `vi:App.plans.startsOn` | `Kỳ mới bắt đầu từ {date}, khi kỳ hiện tại kết thúc.` | `Kỳ tiếp theo bắt đầu ngày {date}, khi kỳ hiện tại kết thúc.` |
| `en:App.plans.startsOn` | `The new period starts on {date}, when the current one ends.` | `The next period starts on {date}, when the current period ends.` |
| `vi:App.plans.noRefund` | `Không hoàn tiền tự động; cần hỗ trợ, liên hệ <mail>{email}</mail>.` | `Giao dịch không tự hoàn tiền. Liên hệ <mail>{email}</mail> để được hỗ trợ.` |
| `en:App.plans.noRefund` | `No automatic refunds; for help, write to <mail>{email}</mail>.` | `Refunds aren’t automatic. For help, contact <mail>{email}</mail>.` |
| `vi:App.plans.priceChanged` | `Giá vừa thay đổi. Xem lại trước khi mua.` | `Giá đã thay đổi. Kiểm tra giá mới trước khi mua.` |
| `en:App.plans.priceChanged` | `The price just changed. Check it before you buy.` | `The price has changed. Check the new price before you buy.` |
| `vi:App.plans.freeList.lookup` | `Tra từ, thêm nhanh, tối đa {groups, number} nhóm` | `Tra từ, thêm nhanh và tạo tối đa {groups, number} nhóm từ` |
| `en:App.plans.freeList.lookup` | `Look up and quick add, up to {groups, plural, one {# deck} other {# decks}}` | `Look up words, add them quickly, and create up to {groups, plural, one {# deck} other {# decks}}` |
| `vi:App.plans.freeList.ai` | `{practice, number} câu AI và {lookup, number} lượt tra AI mỗi tháng` | `{practice, number} lượt câu AI và {lookup, number} lượt tra AI mỗi tháng` |
| `en:App.plans.freeList.ai` | `{practice, number} AI questions and {lookup, number} AI lookups a month` | `Monthly AI credits: {practice, number} for questions and {lookup, number} for lookups` |
| `vi:App.plans.proList.ai` | `{practice, number} câu AI và {lookup, number} lượt tra AI mỗi tháng` | `{practice, number} lượt câu AI và {lookup, number} lượt tra AI mỗi tháng` |
| `en:App.plans.proList.ai` | `{practice, number} AI questions and {lookup, number} AI lookups a month` | `Monthly AI credits: {practice, number} for questions and {lookup, number} for lookups` |
| `vi:App.plans.proList.allFree` | `Mọi quyền lợi của gói Miễn phí` | `Mọi quyền lợi của gói Free` |
| `en:App.plans.proList.allFree` | `Everything in Free` | `Everything in the Free plan` |
| `vi:App.plans.compare` | `So sánh chi tiết các gói` | `So sánh các gói` |
| `en:App.plans.compare` | `Compare plans in detail` | `Compare plans` |
| `vi:App.plans.compareTable.ai` | `Câu AI mới mỗi tháng` | `Lượt câu AI mỗi tháng` |
| `en:App.plans.compareTable.ai` | `New AI questions a month` | `Monthly AI credits for questions` |
| `en:App.plans.compareTable.lookup` | `AI lookups a month` | `Monthly AI credits for lookups` |
| `vi:App.deck.learn` | `Học` | `Học từ` |
| `en:App.deck.learn` | `Learn` | `Study words` |
| `vi:App.deck.recall` | `Ôn` | `Ôn từ` |
| `en:App.deck.recall` | `Review` | `Review words` |
| `vi:App.deck.recallExtra` | `Ôn thêm` | `Ôn thêm từ` |
| `en:App.deck.recallExtra` | `Extra review` | `Review more words` |
| `vi:App.recall.doneTitle` | `Xong {count, number} từ` | `Đã ôn {count, number} từ` |
| `en:App.recall.doneTitle` | `{count, plural, one {# word} other {# words}} done` | `{count, plural, one {# word reviewed} other {# words reviewed}}` |
| `vi:App.recall.newLeftTitle` | `Còn {count, number} từ mới trong nhóm này` | `Nhóm còn {count, number} từ mới` |
| `vi:App.recall.nothingTitle` | `Nhóm này chưa có từ nào đã học` | `Nhóm này chưa có từ đã học` |
| `en:App.recall.nothingTitle` | `This deck has no learned words yet` | `No studied words in this deck yet` |
| `vi:App.recall.nothingBody` | `Học vài từ mới trước, rồi quay lại Ôn.` | `Học từ mới trong nhóm trước khi ôn.` |
| `en:App.recall.nothingBody` | `Learn a few new words first, then come back to review.` | `Learn new words in this deck before reviewing.` |
| `vi:App.recall.compare.label` | `So chữ: bạn gõ {typed}, đáp án {answer}` | `So đáp án theo từng chữ. Bạn gõ {typed}. Đáp án là {answer}.` |
| `en:App.recall.compare.label` | `Letters: you typed {typed}, the answer is {answer}` | `Compare letter by letter. You typed {typed}. The answer is {answer}.` |
| `vi:App.recall.compare.typed` | `bạn gõ` | `Bạn gõ` |
| `en:App.recall.compare.typed` | `you typed` | `You typed` |
| `vi:App.recall.compare.answer` | `đáp án` | `Đáp án` |
| `en:App.recall.compare.answer` | `answer` | `Answer` |
| `vi:App.stack.addHint` | `Thêm từ để bắt đầu` | `Thêm từ để bắt đầu học` |
| `en:App.stack.addHint` | `Add words to start` | `Add words to start studying` |
