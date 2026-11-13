# Sửa chữ giao diện vòng 2: bảng thay đổi (14/11/2026)

Sinh tự động từ diff giữa `origin/dev` (`2d858021`) và nhánh `fix/ui-copy-round-2`, nên khớp đúng với file. Chỉ ghi chuỗi có đổi.
Bản EN của `Landing.*` là bản sao của bản VI (vì `/en` chuyển về `/vi`), nên các dòng landing chỉ ghi ở bảng VI.

Tổng: VI 112 chuỗi, EN 190 chuỗi (không kể landing), xóa 9 key ở cả hai file.

## Tiếng Việt (vi.json)

### Landing (9)

| key | cũ | mới |
|---|---|---|
| `Landing.hero.lead` | Wordmet tra sẵn nghĩa, câu mẫu và phiên âm, rồi xếp lịch ôn cho từng từ. Thời gian học dành cho việc luyện từ trong câu. | Wordmet tra sẵn nghĩa, câu ví dụ và phiên âm, rồi xếp lịch ôn cho từng từ. Thời gian học dành cho việc luyện từ trong câu. |
| `Landing.groups.title` | Từ của mỗi bài thành một nhóm. | Từ của mỗi bài thành một nhóm |
| `Landing.plans.title` | Hai gói, không tự gia hạn. | Hai gói, khác nhau ở mức luyện tập và AI |
| `Landing.plans.lead` | Trả một lần cho mỗi kỳ. Hết kỳ, từ và lịch ôn của bạn vẫn còn. | Cả hai gói đều ôn thẻ không giới hạn. Hết Pro, từ và lịch ôn của bạn vẫn còn. |
| `Landing.plans.freeNote` | không cần thẻ thanh toán | không giới hạn thời gian |
| `Landing.plans.aiList.0` | AI đi cùng bạn | AI soạn câu và tra từ |
| `Landing.plans.proList.2` | Mọi thứ của gói Miễn phí | Mọi quyền lợi của gói Miễn phí |
| `Landing.final.title` | Bắt đầu với bài bạn vừa đọc. | Bắt đầu với bài bạn vừa đọc |
| `Landing.final.note` | Miễn phí để bắt đầu. Không cần thẻ thanh toán. | Miễn phí để bắt đầu. |

### Legal (3)

| key | cũ | mới |
|---|---|---|
| `Legal.draftNotice` | Đây là bản nháp. Nội dung chính thức sẽ được cập nhật trước khi Wordmet chính thức ra mắt. | Đây là bản nháp. Bản chính thức sẽ có trước khi Wordmet ra mắt. |
| `Legal.privacyLead` | Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai, và quyền của bạn với dữ liệu của mình. | Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai và quyền của bạn với dữ liệu của mình. |
| `Legal.privacyHelpBody` | Gửi từ chính email của tài khoản. Phản hồi trong 02 ngày làm việc. | Gửi từ chính email của tài khoản. Phản hồi trong 2 ngày làm việc. |

### NotFound (1)

| key | cũ | mới |
|---|---|---|
| `NotFound.body` | Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. | Trang này không có hoặc đã chuyển sang địa chỉ khác. |

### App.common (1)

| key | cũ | mới |
|---|---|---|
| `App.common.errorPageTitle` | Không tải được trang này. | Không tải được trang này |

### App.chrome (1)

| key | cũ | mới |
|---|---|---|
| `App.chrome.skipToContent` | Bỏ qua tới nội dung | Chuyển đến nội dung chính |

### App.ui (1)

| key | cũ | mới |
|---|---|---|
| `App.ui.seePlans` | Xem Gói học | Xem gói học |

### App.speak (1)

| key | cũ | mới |
|---|---|---|
| `App.speak.pending` | Đang tạo giọng đọc | Đang tạo âm thanh |

### App.auth (7)

| key | cũ | mới |
|---|---|---|
| `App.auth.register.accountDeleting` | Tài khoản này đang được xóa, thử lại sau. | Tài khoản này đang được xóa. Thử lại sau. |
| `App.auth.login.rateLimited` | Wordmet đang nhận quá nhiều yêu cầu từ trình duyệt này nên bạn cần đăng nhập lại. | Phiên đăng nhập đã dừng vì trình duyệt này gửi quá nhiều yêu cầu. Đăng nhập lại để tiếp tục. |
| `App.auth.verify.loginBody` | Bạn cần xác nhận email trước khi vào app. Mã đã được gửi tới {email}. | Xác minh email để tiếp tục. Mã đã gửi tới {email}. |
| `App.auth.verify.wrongCode` | Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn. Nếu email đã được xác nhận, hãy đăng nhập. | Mã hoặc mật khẩu không đúng hoặc mã đã hết hạn. Nếu email đã được xác minh, đăng nhập để tiếp tục. |
| `App.auth.verify.locked` | Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time}, hoặc dùng Quên mật khẩu ở trang đăng nhập. | Bạn đã nhập sai mã quá nhiều lần. Thử lại sau {time} hoặc dùng Quên mật khẩu ở trang đăng nhập. |
| `App.auth.complete.body` | Trước khi học tiếp, Wordmet cần ngày sinh của bạn và việc bạn đồng ý với điều khoản. | Trước khi học tiếp, bổ sung ngày sinh và đồng ý với điều khoản. |
| `App.auth.complete.updatedBody` | Wordmet vừa đăng bản mới của Điều khoản sử dụng và Chính sách bảo mật. Hãy đọc và đồng ý để tiếp tục học. | Wordmet vừa đăng bản mới của Điều khoản sử dụng và Chính sách bảo mật. Đọc và đồng ý để tiếp tục học. |

### App.deleteAccount (7)

| key | cũ | mới |
|---|---|---|
| `App.deleteAccount.deleted.privateWords` | Từ riêng và câu bạn tự viết | Từ riêng và câu đã gặp |
| `App.deleteAccount.kept.paymentsNoYears` | Hồ sơ thanh toán theo thời hạn luật định, không kèm tên bạn | Hồ sơ thanh toán trong thời gian luật yêu cầu, không kèm tên bạn |
| `App.deleteAccount.blockedLink` | Đến trang Gói | Đến trang Gói học |
| `App.deleteAccount.googleFailed` | Chưa xác nhận được bằng Google. Thử lại. | Không xác nhận được bằng Google. Thử lại. |
| `App.deleteAccount.doneTitle` | Tài khoản của bạn đã được xóa. | Đã xóa tài khoản |
| `App.deleteAccount.doneBody` | Cảm ơn bạn đã học cùng Wordmet. Thư xác nhận đã gửi tới email của bạn. | Thư xác nhận đã gửi tới email của bạn. |
| `App.deleteAccount.pendingBody` | Việc xóa đang hoàn tất, có thể mất tới một giờ. Bạn không cần làm gì thêm. | Wordmet đang xóa nốt dữ liệu, có thể mất tới một giờ. Bạn không cần làm gì thêm. |

### App.houseAd (1)

| key | cũ | mới |
|---|---|---|
| `App.houseAd.lead` | Gói Pro có nhiều phiên luyện và nhiều lượt AI hơn mỗi tháng, và không có quảng cáo. | Gói Pro có thêm phiên luyện mỗi ngày, thêm lượt AI mỗi tháng và không có quảng cáo. |

### App.transactions (1)

| key | cũ | mới |
|---|---|---|
| `App.transactions.emptyTitle` | Chưa có giao dịch nào. | Chưa có giao dịch nào |

### App.account (1)

| key | cũ | mới |
|---|---|---|
| `App.account.seePlan` | Xem gói | Xem gói học |

### App.today (2)

| key | cũ | mới |
|---|---|---|
| `App.today.allDone` | Xong hết thẻ hôm nay. Mai ôn tiếp. | Đã xong thẻ hôm nay. Ngày mai ôn tiếp. |
| `App.today.yourGroupsHint` | {count, number} nhóm khác còn thẻ chờ · bấm thẻ để mở nhóm | {count, number} nhóm khác còn thẻ chờ |

### App.calendar (3)

| key | cũ | mới |
|---|---|---|
| `App.calendar.month.error` | Không tải được lịch. | Không tải được lịch. Kiểm tra mạng rồi thử lại. |
| `App.calendar.day.lemmaGone` | Từ không còn trong kho | Từ không còn trong từ điển |
| `App.calendar.day.error` | Không tải được ngày này. | Không tải được ngày này. Kiểm tra mạng rồi thử lại. |

### App.groups (4)

| key | cũ | mới |
|---|---|---|
| `App.groups.deleteNote` | Từ còn nằm ở nhóm khác thì giữ nguyên. Từ bạn tự thêm vẫn còn trong Từ của tôi. | Từ bạn tự thêm vẫn còn trong Từ của tôi. |
| `App.groups.subtitle` | {due, number} thẻ chờ trong {groups, number} nhóm · phím trái, phải hoặc vuốt để đổi nhóm · bấm thẻ giữa hoặc ↓ để mở | {due, number} thẻ chờ trong {groups, number} nhóm · phím trái, phải hoặc vuốt để đổi nhóm |
| `App.groups.subtitlePhone` | {due, number} thẻ chờ trong {groups, number} nhóm · vuốt để đổi nhóm · chạm thẻ giữa để mở | {due, number} thẻ chờ trong {groups, number} nhóm · vuốt để đổi nhóm |
| `App.groups.rhythm` | nhịp ôn: Mới → Bậc 5 | Nhịp ôn: Mới → Bậc 5 |

### App.group (4)

| key | cũ | mới |
|---|---|---|
| `App.group.keep` | Giữ lại | Giữ từ |
| `App.group.toList` | Về Danh sách nhóm | Về Nhóm của bạn |
| `App.group.emptyBody` | Thêm những từ bạn bắt gặp khi đọc hoặc xem phim, hoặc chọn nhanh một bộ từ theo chủ đề trong Tra từ. Khi nhóm đã có từ, bạn có thể bắt đầu ôn tập. | Thêm từ bạn gặp khi đọc hay xem phim. Bạn cũng có thể chọn từ theo chủ đề trong Tra từ. |
| `App.group.colWord` | Từ vựng | Từ |

### App.backlog (2)

| key | cũ | mới |
|---|---|---|
| `App.backlog.showing` | đang có {shown, number} / {total, number} từ | đang có {shown, number}/{total, number} từ |
| `App.backlog.keep` | Giữ lại | Giữ các từ |

### App.topic (1)

| key | cũ | mới |
|---|---|---|
| `App.topic.intro` | {count, number} từ gợi ý. Chọn từ bạn muốn học, hoặc thêm cả chủ đề. | {count, number} từ gợi ý. Chọn từ bạn muốn học hoặc thêm cả chủ đề. |

### App.review (7)

| key | cũ | mới |
|---|---|---|
| `App.review.hintPhone` | Bấm vào thẻ để lật | Chạm vào thẻ để lật |
| `App.review.example` | Câu mẫu | Câu ví dụ |
| `App.review.failed` | Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại. | Không lưu được câu trả lời. Kiểm tra mạng rồi thử lại. |
| `App.review.doneTitle` | Xong {count, number} thẻ. | Xong {count, number} thẻ |
| `App.review.home` | Về trang chủ | Về Hôm nay |
| `App.review.emptyTitle` | Hôm nay nhóm này không còn thẻ nào. | Hôm nay nhóm này không còn thẻ nào |
| `App.review.nudge` | Lật thẻ để xem nghĩa trước đã. | Lật thẻ để xem nghĩa trước. |

### App.lookup (3)

| key | cũ | mới |
|---|---|---|
| `App.lookup.emptyBody` | Thử bỏ bớt bộ lọc, hoặc tự thêm từ này với nghĩa của bạn. | Thử bỏ bớt bộ lọc hoặc tự thêm từ này với nghĩa riêng. |
| `App.lookup.prev` | ← Trang trước | Trang trước |
| `App.lookup.stacksTitle` | Bấm vào chồng để thêm | Chọn nhóm để thêm từ |

### App.word (1)

| key | cũ | mới |
|---|---|---|
| `App.word.notFoundBody` | Từ này chưa có trong từ điển của Wordmet. Bạn có thể tự thêm với nghĩa của bạn. | Từ này chưa có trong từ điển Wordmet. Bạn có thể tự thêm từ với nghĩa riêng. |

### App.addWord (3)

| key | cũ | mới |
|---|---|---|
| `App.addWord.manualButton` | Nghĩa khác, tự nhập | Tự nhập nghĩa khác |
| `App.addWord.quickBody` | Gõ từ bạn vừa gặp. Có câu chứa từ đó thì dán vào luôn. Wordmet tự nhận ra dạng chia, như went là dạng của go. | Gõ từ, kể cả dạng đã chia như went (của go). Nếu có câu chứa từ, dán thêm vào. |
| `App.addWord.ai.failed` | Hệ thống đang gặp lỗi. | Không tra được bằng AI lúc này. Thử lại sau. |

### App.errors (23)

| key | cũ | mới |
|---|---|---|
| `App.errors.ai-lookup-failed` | Hệ thống đang gặp lỗi. | Không tra được bằng AI lúc này. Thử lại sau. |
| `App.errors.ai-unavailable` | Hệ thống đang gặp lỗi. | AI đang không dùng được. Thử lại sau. |
| `App.errors.idempotency-key-abandoned` | Lần bấm trước bị dừng giữa chừng. Bấm lại. | Lần bấm trước bị dừng giữa chừng. Thử lại. |
| `App.errors.invalid-credentials` | Email hoặc mật khẩu chưa đúng. | Email hoặc mật khẩu không đúng. Thử lại. |
| `App.errors.invalid-current-password` | Mật khẩu hiện tại chưa đúng. | Mật khẩu hiện tại không đúng. Thử lại. |
| `App.errors.captcha-failed` | Chưa xác minh được bạn không phải máy. Hãy thử lại. | Không qua được bước xác minh. Thử lại. |
| `App.errors.captcha-unavailable` | Chưa kiểm tra chống bot được lúc này. Hãy thử lại sau ít phút. | Bước xác minh đang không dùng được. Thử lại sau ít phút. |
| `App.errors.cancel-in-store` | Gói này mua qua cửa hàng ứng dụng, hãy hủy trong phần quản lý gói của cửa hàng đó. | Gói này mua qua cửa hàng ứng dụng. Hủy gói trong phần quản lý gói của cửa hàng đó. |
| `App.errors.confirm-email-mismatch` | Email bạn gõ chưa khớp với email của tài khoản. | Email bạn gõ không khớp với email của tài khoản. Gõ lại. |
| `App.errors.google-email-unverified` | Google chưa xác minh email này, nên chưa đăng nhập được. Hãy xác minh email ở Google rồi thử lại. | Google chưa xác minh email này nên chưa đăng nhập được. Xác minh email ở Google rồi thử lại. |
| `App.errors.google-busy` | Có quá nhiều lượt đăng nhập bằng Google từ mạng này. Đợi một phút rồi thử lại, hoặc dùng email và mật khẩu. | Có quá nhiều lượt đăng nhập bằng Google từ mạng này. Đợi một phút rồi thử lại hoặc dùng email và mật khẩu. |
| `App.errors.google-failed` | Đăng nhập bằng Google chưa thành công. Hãy thử lại. | Không đăng nhập được bằng Google. Thử lại. |
| `App.errors.google-unavailable` | Đăng nhập bằng Google đang tạm thời không dùng được. Hãy dùng email và mật khẩu. | Đăng nhập bằng Google đang không dùng được. Dùng email và mật khẩu. |
| `App.errors.provider-unavailable` | Nhà cung cấp thanh toán chưa trả lời. Hãy thử lại sau ít phút. | Cổng thanh toán chưa phản hồi. Thử lại sau ít phút. |
| `App.errors.reauth-required` | Hãy xác nhận lại bằng tài khoản Google của bạn trước khi xóa. | Xác nhận lại bằng tài khoản Google trước khi xóa. |
| `App.errors.staff-account` | Tài khoản nhân sự không tự xóa được. Hãy nhờ admin xóa. | Tài khoản nhân sự không tự xóa được. Nhờ admin xóa. |
| `App.errors.subscription-renewing` | Bạn còn gói đang tự gia hạn. Hãy hủy gói trước khi xóa tài khoản. | Bạn còn gói đang tự gia hạn. Hủy gói trước khi xóa tài khoản. |
| `App.errors.invalid-otp` | Mã xác minh chưa đúng hoặc đã hết hạn. | Mã xác minh không đúng hoặc đã hết hạn. Nhập lại hoặc gửi mã mới. |
| `App.errors.mail-unavailable` | Chưa gửi được email. Thử lại sau ít phút. | Không gửi được email. Thử lại sau ít phút. |
| `App.errors.payload-too-large` | Nội dung gửi lên quá dài. | Nội dung quá dài. Rút ngắn rồi gửi lại. |
| `App.errors.quota-exhausted` | Đã dùng hết lượt. | Bạn đã dùng hết lượt của tính năng này. |
| `App.errors.rate-limited` | Bạn thao tác hơi nhanh. Thử lại sau {seconds, number} giây. | Có quá nhiều thao tác trong thời gian ngắn. Thử lại sau {seconds, number} giây. |
| `App.errors.share-consent-required` | Chưa gửi được báo lỗi. Thử lại sau. | Không gửi được báo lỗi. Thử lại sau. |

### App.practice (18)

| key | cũ | mới |
|---|---|---|
| `App.practice.out.title` | Mai luyện tiếp nhé | Luyện tiếp vào ngày mai |
| `App.practice.customize.ownToggle` | Điền từ vào câu bạn đã lưu | Điền từ vào câu đã gặp |
| `App.practice.customize.aiUnavailable` | Hệ thống đang gặp lỗi, chưa dùng được kiểu câu có AI. Bỏ kiểu câu AI để bắt đầu, hoặc thử lại sau. | Kiểu câu AI đang không dùng được. Bỏ kiểu câu AI để bắt đầu hoặc thử lại sau. |
| `App.practice.customize.mixLine` | Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết. | Dùng câu đã gặp cho những từ có sẵn câu; từ còn lại do AI viết. |
| `App.practice.customize.ownHelpLabel` | Điền từ vào câu bạn đã lưu là gì? | Điền từ vào câu đã gặp là gì? |
| `App.practice.customize.ownHelp` | Chỉ hỏi từ đã có câu bạn lưu. Không tốn lượt câu AI. | Chỉ hỏi những từ có câu đã gặp. Không tốn lượt câu AI. |
| `App.practice.session.ai.errorTitle` | Hệ thống đang gặp lỗi. | Không tạo được câu hỏi AI |
| `App.practice.session.ai.stayOpen` | Dừng thì phiên vẫn đang dở, bạn làm tiếp sau được. | Nếu dừng, phiên vẫn mở và bạn làm tiếp sau được. |
| `App.practice.session.tryAgainBody` | Kiểm tra chính tả rồi gõ lại. Wordmet chưa hiện đáp án. | Kiểm tra chính tả rồi gõ lại. |
| `App.practice.session.right` | Đúng rồi | Đúng |
| `App.practice.session.phoneHint` | Bấm vào đáp án. Chọn xong là chấm luôn. | Chạm vào đáp án để chấm ngay. |
| `App.practice.session.failed` | Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại. | Không lưu được câu trả lời. Kiểm tra mạng rồi thử lại. |
| `App.practice.session.round.note` | Wordmet chỉ hỏi một lần. Luyện lại vẫn nằm trong phiên này, không tính thêm phiên. | Câu hỏi này chỉ hiện một lần trong phiên. Luyện thêm vẫn tính trong phiên này, không tốn thêm phiên. |
| `App.practice.session.summary.title` | Xong {count, number} câu. | Xong {count, number} câu |
| `App.practice.weak.emptyTitle` | Chưa có từ nào hay sai. | Chưa có từ nào hay sai |
| `App.practice.weak.rules.skip` | Không tính: câu đúng nhờ gợi ý, và câu bạn đã báo lỗi mà đội Wordmet đang xem, đã sửa hoặc đã xác nhận lỗi. | Không tính: câu đúng nhờ gợi ý và câu bạn đã báo lỗi mà đội Wordmet đang xem, đã sửa hoặc đã xác nhận lỗi. |
| `App.practice.reports.emptyTitle` | Bạn chưa báo lỗi câu nào. | Bạn chưa báo lỗi câu nào |
| `App.practice.reports.error` | Không tải được danh sách báo lỗi. | Không tải được danh sách báo lỗi. Kiểm tra mạng rồi thử lại. |

### App.plans (3)

| key | cũ | mới |
|---|---|---|
| `App.plans.priceChanged` | Giá vừa đổi, xem lại trước khi mua | Giá vừa thay đổi. Xem lại trước khi mua. |
| `App.plans.buyUnavailable` | Chưa tạo được đơn. Thử lại sau ít phút. | Không tạo được đơn hàng. Thử lại sau ít phút. |
| `App.plans.proList.allFree` | Mọi thứ của gói Miễn phí | Mọi quyền lợi của gói Miễn phí |

### App.deck (1)

| key | cũ | mới |
|---|---|---|
| `App.deck.recallExtra` | Ôn tập | Ôn thêm |

### App.recall (3)

| key | cũ | mới |
|---|---|---|
| `App.recall.doneTitle` | Xong {count, number} từ. | Xong {count, number} từ |
| `App.recall.home` | Về trang chủ | Về Hôm nay |
| `App.recall.nothingTitle` | Nhóm này chưa có từ nào đã học. | Nhóm này chưa có từ nào đã học |

## Tiếng Anh (en.json)

### Metadata (3)

| key | cũ | mới |
|---|---|---|
| `Metadata.title` | Wordmet · Học từ vựng tiếng Anh, ghi nhớ và vận dụng | Wordmet · Learn, remember and use English vocabulary |
| `Metadata.description` | Ôn thẻ theo lịch, luyện tập cùng AI và lưu từ mới bạn gặp mỗi ngày. | Review cards on schedule, practice with AI and save the new words you come across every day. |
| `Metadata.ogAlt` | Wordmet: Học từ vựng tiếng Anh, ghi nhớ và vận dụng | Wordmet: Learn, remember and use English vocabulary |

### Nav (2)

| key | cũ | mới |
|---|---|---|
| `Nav.login` | Log in | Sign in |
| `Nav.groups` | Word groups | Decks |

### Legal (2)

| key | cũ | mới |
|---|---|---|
| `Legal.draftNotice` | This is a draft version. The official text will be published prior to Wordmet's official launch. | This is a draft. The final text will be published before Wordmet launches. |
| `Legal.privacyHelpBody` | Write from your account's own email address. We reply within 2 working days. | Write from your account’s email address. We reply within 2 working days. |

### NotFound (1)

| key | cũ | mới |
|---|---|---|
| `NotFound.body` | The page you're looking for doesn't exist or has been moved. | This page doesn’t exist or has moved. |

### App.common (1)

| key | cũ | mới |
|---|---|---|
| `App.common.errorPageTitle` | This page could not be loaded. | Couldn’t load this page |

### App.chrome (1)

| key | cũ | mới |
|---|---|---|
| `App.chrome.skipToContent` | Skip to content | Skip to main content |

### App.speak (1)

| key | cũ | mới |
|---|---|---|
| `App.speak.pending` | The voice is being made | Preparing audio… |

### App.auth (9)

| key | cũ | mới |
|---|---|---|
| `App.auth.captchaReload` | Reload the check | Reload the verification |
| `App.auth.captchaLoadFailed` | The check didn't load. | Couldn’t load the verification. |
| `App.auth.register.consent` | I agree to the &lt;terms&gt;Terms of use&lt;/terms&gt; and the &lt;privacy&gt;Privacy policy&lt;/privacy&gt;. | I agree to the &lt;terms&gt;Terms of Use&lt;/terms&gt; and the &lt;privacy&gt;Privacy Policy&lt;/privacy&gt;. |
| `App.auth.login.rateLimited` | Wordmet is getting too many requests from this browser, so you need to sign in again. | Your session ended because this browser sent too many requests. Sign in again to continue. |
| `App.auth.verify.body` | We sent a code to {email}. It works for 10 minutes. | We sent a code to {email}. It expires in 10 minutes. |
| `App.auth.verify.bodyNoEmail` | Enter the email you signed up with and the 6-digit code from our message. It works for 10 minutes. | Enter the email you signed up with and the 6-digit code from our email. It expires in 10 minutes. |
| `App.auth.verify.loginBody` | Confirm your email to continue. We sent a code to {email}. | Verify your email to continue. We sent a code to {email}. |
| `App.auth.verify.wrongCode` | That code or password is wrong, or the code has expired. If your email is already confirmed, sign in. | The code or password is incorrect, or the code has expired. If your email is already verified, sign in. |
| `App.auth.complete.body` | Before you go on, Wordmet needs your birth date and your agreement to the terms. | Before you continue, add your date of birth and agree to the terms. |

### App.settings (2)

| key | cũ | mới |
|---|---|---|
| `App.settings.shortcutAdd` | Add a word you found | Add a new word |
| `App.settings.shortcutAnswer` | Still learning · Know | Needs review · Known |

### App.deleteAccount (7)

| key | cũ | mới |
|---|---|---|
| `App.deleteAccount.deleted.learning` | Learning data: groups, review schedule, answer history | Learning data: decks, review schedule, answer history |
| `App.deleteAccount.deleted.privateWords` | Your own words and sentences | Your own words and saved sentences |
| `App.deleteAccount.kept.usage` | Quota you used, without your name | Usage counts, without your name |
| `App.deleteAccount.googleFailed` | Could not confirm with Google. Try again. | Couldn’t confirm with Google. Try again. |
| `App.deleteAccount.doneTitle` | Your account has been deleted. | Account deleted |
| `App.deleteAccount.doneBody` | Thank you for learning with Wordmet. A confirmation was sent to your email. | We sent a confirmation to your email. |
| `App.deleteAccount.pendingBody` | The deletion is being finished and can take up to an hour. You do not need to do anything. | Wordmet is finishing the deletion. It can take up to an hour, and you don’t need to do anything. |

### App.houseAd (3)

| key | cũ | mới |
|---|---|---|
| `App.houseAd.lead` | The Pro plan has more practice sessions and more AI uses each month, and no ads. | The Pro plan has more practice sessions a day, more AI credits a month and no ads. |
| `App.houseAd.ai` | More AI practice questions and AI look-ups | More AI practice questions and AI lookups |
| `App.houseAd.cta` | See Pro | See the Pro plan |

### App.transactions (2)

| key | cũ | mới |
|---|---|---|
| `App.transactions.emptyTitle` | No transactions yet. | No transactions yet |
| `App.transactions.error` | We couldn’t load your transaction history. Check your connection and try again. | Couldn’t load your transaction history. Check your connection and try again. |

### App.today (6)

| key | cũ | mới |
|---|---|---|
| `App.today.emptyBody` | Create your first deck to save the words you find and review them on schedule. | Create your first deck to save the words you come across and review them on schedule. |
| `App.today.allDone` | All cards done for today. More tomorrow. | All cards done for today. Come back tomorrow. |
| `App.today.yourGroupsHint` | {count, plural, one {# other deck} other {# other decks}} with cards waiting · tap a card to open it | {count, plural, one {# other deck} other {# other decks}} with cards waiting |
| `App.today.lastCorrect` | Right | Correct |
| `App.today.lastBar` | {correct, number} right, {wrong, number} wrong | {correct, number} correct, {wrong, number} incorrect |
| `App.today.lastRetry` | Practise missed words | Practice missed words |

### App.calendar (5)

| key | cũ | mới |
|---|---|---|
| `App.calendar.month.error` | Couldn't load the calendar. | Couldn’t load the calendar. Check your connection and try again. |
| `App.calendar.day.again` | Again, back to Level 1 | Needs review, back to Level 1 |
| `App.calendar.day.lemmaGone` | Word no longer in the library | Word no longer in the dictionary |
| `App.calendar.day.future` | This day hasn't come yet. | This day hasn’t come yet. |
| `App.calendar.day.error` | Couldn't load this day. | Couldn’t load this day. Check your connection and try again. |

### App.groups (6)

| key | cũ | mới |
|---|---|---|
| `App.groups.search` | Search {count, number} decks | Search {count, plural, one {# deck} other {# decks}} |
| `App.groups.limit` | You have {max, number} decks, the most allowed. Delete a deck to create a new one. | You have {max, plural, one {# deck} other {# decks}}, the most allowed. Delete a deck to create a new one. |
| `App.groups.deleteNote` | Words in other decks stay as they are. Words you added yourself stay in My words. | Words you added yourself stay in My words. |
| `App.groups.keep` | Cancel | Keep deck |
| `App.groups.subtitle` | {due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · left and right keys or swipe to switch · press the middle card or ↓ to open | {due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · left and right keys or swipe to switch |
| `App.groups.subtitlePhone` | {due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · swipe to switch · tap the middle card to open | {due, plural, one {# card} other {# cards}} waiting in {groups, plural, one {# deck} other {# decks}} · swipe to switch |

### App.group (4)

| key | cũ | mới |
|---|---|---|
| `App.group.keep` | Cancel | Keep word |
| `App.group.notFound` | This deck doesn’t exist anymore. | Couldn’t find this deck. |
| `App.group.toList` | Go to your decks | Back to your decks |
| `App.group.emptyBody` | Add the words you come across while reading or watching, or pick a set of words by topic in Look up. Once the deck has words, you can start reviewing. | Add words you come across while reading or watching, or pick words by topic in Look up. |

### App.backlog (4)

| key | cũ | mới |
|---|---|---|
| `App.backlog.showing` | showing {shown, number} / {total, number} words | showing {shown, number}/{total, number} words |
| `App.backlog.keep` | Cancel | Keep words |
| `App.backlog.explain` | Words at Level 1 or above that are over {days, number} days overdue leave the review list, so a day's review never piles up. &lt;b&gt;Relearn&lt;/b&gt;: back to New, counted as a new word today. &lt;b&gt;Stop learning&lt;/b&gt;: leaves every deck, no more reviews. &lt;b&gt;Leave it&lt;/b&gt;: nothing happens; Wordmet never deletes a word by itself. | Words at Level 1 or above that are over {days, number} days overdue leave the review list, so a day’s review never piles up. &lt;b&gt;Relearn&lt;/b&gt;: back to New, counted as a new word today. &lt;b&gt;Stop learning&lt;/b&gt;: leaves every deck, no more reviews. &lt;b&gt;Leave it&lt;/b&gt;: nothing happens; Wordmet never deletes a word by itself. |
| `App.backlog.selectAll` | Select all {count, number} words | Select all {count, plural, one {# word} other {# words}} |

### App.topic (3)

| key | cũ | mới |
|---|---|---|
| `App.topic.selectAll` | Select all {count, number} words not learned yet | Select all {count, plural, one {# word} other {# words}} not learned yet |
| `App.topic.notFound` | This topic doesn’t exist. | Couldn’t find this topic. |
| `App.topic.eyebrow` | Topic · level | Topic · CEFR level |

### App.review (9)

| key | cũ | mới |
|---|---|---|
| `App.review.close` | Stop | Close review |
| `App.review.stillLearning` | Still learning | Needs review |
| `App.review.know` | Know | Known |
| `App.review.failed` | We couldn't save your answer. Check your connection and try again. | Couldn’t save your answer. Check your connection and try again. |
| `App.review.doneTitle` | {count, plural, one {# card done.} other {# cards done.}} | {count, plural, one {# card done} other {# cards done}} |
| `App.review.doneBody` | Cards marked still learning go back to Level 1, at the top of the deck. | Cards marked Needs review go back to Level 1, at the top of the deck. |
| `App.review.home` | Back to home | Back to Today |
| `App.review.emptyTitle` | No cards left in this deck today. | No cards left in this deck today |
| `App.review.stop` | Stop | Stop session |

### App.lookup (6)

| key | cũ | mới |
|---|---|---|
| `App.lookup.level` | Level: {value} | CEFR level: {value} |
| `App.lookup.searchLabel` | Search a word, e.g. mitigate | Search for a word, for example mitigate |
| `App.lookup.summary` | {count, plural, one {# word} other {# words}} at level &lt;lv&gt;{level}&lt;/lv&gt;, topic &lt;tp&gt;{topic}&lt;/tp&gt;, part of speech &lt;ps&gt;{pos}&lt;/ps&gt;. | {count, plural, one {# word} other {# words}} at CEFR level &lt;lv&gt;{level}&lt;/lv&gt;, topic &lt;tp&gt;{topic}&lt;/tp&gt;, part of speech &lt;ps&gt;{pos}&lt;/ps&gt;. |
| `App.lookup.prev` | ← Previous page | Previous page |
| `App.lookup.stacksTitle` | Press a stack to add | Choose a deck to add the word |
| `App.lookup.otherGroup` | Another group or a new one | Another deck or a new one |

### App.word (3)

| key | cũ | mới |
|---|---|---|
| `App.word.notFoundBody` | Wordmet's dictionary does not have this word yet. You can add it with your own meaning. | Wordmet’s dictionary does not have this word yet. You can add it with your own meaning. |
| `App.word.seenTitle` | Sentences you met | Saved sentences |
| `App.word.levelRange` | Level {range} | CEFR level {range} |

### App.addWord (15)

| key | cũ | mới |
|---|---|---|
| `App.addWord.title` | Which word did you just meet? | What new word did you come across? |
| `App.addWord.sentence` | Sentence you saw it in (optional) | Sentence with the word (optional) |
| `App.addWord.manualButton` | Other meaning, enter it | Enter another meaning |
| `App.addWord.meaningRequired` | Enter the word's meaning. | Enter the word’s meaning. |
| `App.addWord.wordRequired` | Enter the word you met. | Enter the word. |
| `App.addWord.privateLimit` | You have the most words of your own. Delete one to add a new word. | You’ve reached the limit for your own words. Delete one to add another. |
| `App.addWord.sentenceLimit` | This meaning has the most sentences it can hold. Delete one to add a new sentence. | This meaning has the maximum number of sentences. Delete one to add another. |
| `App.addWord.quickTitle` | Add a word you just met | Add a new word |
| `App.addWord.quickBody` | Type the word. Paste the sentence too if you have it. Wordmet spots word forms, like went for go. | Type the word, even an inflected form like went (from go). Paste the sentence too if you have it. |
| `App.addWord.sentenceRequired` | Enter the sentence you saw. | Enter the sentence. |
| `App.addWord.bulkResult` | Added {added, number} words to “{name}”. | Added {added, plural, one {# word} other {# words}} to “{name}”. |
| `App.addWord.ai.left` | {count, number} AI credits for lookups left | {count, plural, one {# AI credit for lookups} other {# AI credits for lookups}} left |
| `App.addWord.ai.failed` | We ran into a problem. | Couldn’t look up the word with AI. Try again later. |
| `App.addWord.result.yourSentence` | Your sentence | Saved sentence |
| `App.addWord.edit.level` | Level | CEFR level |

### App.errors (22)

| key | cũ | mới |
|---|---|---|
| `App.errors.inProgress` | Your last action is still being processed. Wait a moment and try again. | Your last action is still in progress. Wait a moment and try again. |
| `App.errors.ai-lookup-failed` | We ran into a problem. | Couldn’t look up the word with AI. Try again later. |
| `App.errors.ai-unavailable` | We ran into a problem. | AI isn’t available right now. Try again later. |
| `App.errors.email-taken` | This email already has an account. If it's yours, use Forgot password. | This email already has an account. If it’s yours, use Forgot password. |
| `App.errors.invalid-credentials` | Wrong email or password. | Incorrect email or password. Try again. |
| `App.errors.invalid-current-password` | Your current password is wrong. | Your current password is incorrect. Try again. |
| `App.errors.captcha-failed` | We couldn't check that you're not a bot. Try again. | Couldn’t complete the verification. Try again. |
| `App.errors.captcha-unavailable` | The bot check is unavailable right now. Try again in a few minutes. | The verification isn’t available right now. Try again in a few minutes. |
| `App.errors.cancel-in-store` | This plan was bought in an app store: cancel it in that store's subscription settings. | This plan was bought in an app store. Cancel it in that store’s subscription settings. |
| `App.errors.confirm-email-mismatch` | The email you typed does not match this account's email. | The email you typed doesn’t match this account’s email. Type it again. |
| `App.errors.google-email-unverified` | Google has not verified this email address yet. Verify it with Google and try again. | Google hasn’t verified this email address yet. Verify it with Google and try again. |
| `App.errors.google-failed` | Signing in with Google did not work. Try again. | Couldn’t sign in with Google. Try again. |
| `App.errors.google-unavailable` | Google sign-in is not available right now. Use your email and password. | Google sign-in isn’t available right now. Use your email and password. |
| `App.errors.provider-unavailable` | The payment provider did not answer. Try again in a few minutes. | The payment provider didn’t respond. Try again in a few minutes. |
| `App.errors.staff-account` | A staff account cannot delete itself. Ask an admin to do it. | A staff account can’t delete itself. Ask an admin to delete it. |
| `App.errors.invalid-otp` | The code is wrong or has expired. | The code is incorrect or has expired. Enter it again or request a new one. |
| `App.errors.mail-unavailable` | We couldn’t send the email. Try again in a few minutes. | Couldn’t send the email. Try again in a few minutes. |
| `App.errors.payload-too-large` | This is too long to send. | This is too long. Shorten it and try again. |
| `App.errors.quota-exhausted` | You’ve used them all. | You’ve used up your allowance for this feature. |
| `App.errors.rate-limited` | You’re going a bit fast. Try again in {seconds, number} s. | Too many attempts in a short time. Try again in {seconds, number} seconds. |
| `App.errors.share-consent-required` | We couldn’t send the report. Try again later. | Couldn’t send the report. Try again later. |
| `App.errors.version-conflict` | This changed somewhere else. Check it and save again. | This was changed somewhere else. Check it and save again. |

### App.practice (55)

| key | cũ | mới |
|---|---|---|
| `App.practice.hero.words` | &lt;b&gt;{words, number}&lt;/b&gt; to practise in {groups, plural, one {# deck} other {# decks}} | Words to practice: &lt;b&gt;{words, number}&lt;/b&gt; in {groups, plural, one {# deck} other {# decks}} |
| `App.practice.hero.artRight` | Right | Correct |
| `App.practice.sources.weak.more` | +{count, number} more | +{count, plural, one {# word} other {# words}} |
| `App.practice.sources.priority.body` | Words you marked Still learning, oldest first. | Words you marked Needs review, oldest first. |
| `App.practice.sources.all.body` | Every word you're learning, least practiced first. | Every word you’re learning, least practiced first. |
| `App.practice.out.title` | Back tomorrow | Practice again tomorrow |
| `App.practice.customize.sorts.priority_oldest` | Oldest Still learning first | Oldest Needs review first |
| `App.practice.customize.aiUnavailable` | Something went wrong on our side, so AI question types can’t be used right now. Turn them off to start, or try again later. | AI question types aren’t available right now. Turn them off to start, or try again later. |
| `App.practice.customize.aiMax` | Up to {max, number} AI questions · {left, number} left | Up to {max, number} AI questions · {left, number} credits left |
| `App.practice.customize.aiMaxLeft` | Up to {max, number} AI questions, as you have {left, number} left | Up to {max, number} AI questions, as you have {left, number} credits left |
| `App.practice.customize.aiOut` | No AI questions left this month. | No AI credits for questions left this month. |
| `App.practice.customize.seePro` | See Pro | See the Pro plan |
| `App.practice.customize.ownHelpLabel` | What is fill in your saved sentences? | What is Fill in your saved sentences? |
| `App.practice.customize.ownHelp` | Asks only words with a sentence you saved. Uses no AI questions. | Asks only words that have a saved sentence. Uses no AI credits. |
| `App.practice.session.ai.errorTitle` | Something went wrong on our side. | Couldn’t write the AI question |
| `App.practice.session.rightOption` | Right answer | Correct answer |
| `App.practice.session.chosenRight` | Your choice · right | Your choice · correct |
| `App.practice.session.tryAgainBody` | Check the spelling and try again. The answer stays hidden. | Check the spelling and try again. |
| `App.practice.session.alternativeAsked` | This sentence's word | This sentence’s word |
| `App.practice.session.reviewWord` | Review again: {lemma} | Needs review: {lemma} |
| `App.practice.session.knowWord` | Know: {lemma} | Known: {lemma} |
| `App.practice.session.right` | Right | Correct |
| `App.practice.session.wrong` | Not quite | Incorrect |
| `App.practice.session.stillLearning` | Review again | Needs review |
| `App.practice.session.know` | Know | Known |
| `App.practice.session.noteKnowEnter` | Enter means Know: {lemma} moves up a level. Not sure? Choose Review again. | Press Enter to mark it Known: {lemma} moves up a level. Not sure? Choose Needs review. |
| `App.practice.session.noteHint` | Hints don't change the grading, but a right answer after a hint has no Know button. | Hints don’t change the grading, but a correct answer after a hint has no Known button. |
| `App.practice.session.phoneHint` | Tap an answer. It's graded right away. | Tap an answer. It’s graded right away. |
| `App.practice.session.failed` | Your answer wasn't saved. Check your connection and try again. | Couldn’t save your answer. Check your connection and try again. |
| `App.practice.session.report.question` | What's wrong? | What’s wrong? |
| `App.practice.session.report.info` | The Wordmet team will check this question. Until then it doesn't count toward Weak words; the grade stays as it is. | The Wordmet team will check this question. Until then it doesn’t count toward Weak words; the grade stays as it is. |
| `App.practice.session.round.title` | You've done all {words, plural, one {# word} other {# words}} | You’ve done all {words, plural, one {# word} other {# words}} |
| `App.practice.session.round.correct` | {count, number} right | {count, number} correct |
| `App.practice.session.round.wrong` | {count, number} wrong | {count, number} incorrect |
| `App.practice.session.round.note` | Wordmet asks only once. Extra questions stay in this session and don't use another session. | You see this question only once per session. Extra questions stay in this session and don’t use another session. |
| `App.practice.session.summary.title` | {count, plural, one {# question} other {# questions}} done. | {count, plural, one {# question} other {# questions}} done |
| `App.practice.session.summary.line` | {source}, {types}. {remaining, number} of {limit, number} sessions left today. | {source}, {types}. {remaining, number} of {limit, plural, one {# session} other {# sessions}} left today. |
| `App.practice.session.summary.listTitle` | Review again · {count, plural, one {# word} other {# words}} | Needs review · {count, plural, one {# word} other {# words}} |
| `App.practice.session.summary.review` | Review again | Needs review |
| `App.practice.session.summary.ring` | {correct, number}/{total, number} right | {correct, number}/{total, number} correct |
| `App.practice.session.summary.ringCaption` | right | correct |
| `App.practice.session.noteNotDue` | {lemma} isn't due yet, so its schedule stays the same. | {lemma} isn’t due yet, so its schedule stays the same. |
| `App.practice.session.countRight` | {count, number} right | {count, number} correct |
| `App.practice.session.countWrong` | {count, number} wrong | {count, number} incorrect |
| `App.practice.session.noteKnowTap` | Tap Know and {lemma} moves up a level. | Tap Known and {lemma} moves up a level. |
| `App.practice.session.noteWrongTap` | Review again: {lemma} goes to the top of its deck, back to Level 1. Next keeps its schedule. | Needs review: {lemma} goes to the top of its deck, back to Level 1. Next keeps its schedule. |
| `App.practice.session.legend.know` | Know | Known |
| `App.practice.session.legend.review` | Review again | Needs review |
| `App.practice.weak.cols.last` | Last wrong | Last missed |
| `App.practice.weak.emptyTitle` | No weak words yet. | No weak words yet |
| `App.practice.weak.right` | {count, number} right | {count, number} correct |
| `App.practice.weak.wrong` | {count, number} wrong | {count, number} incorrect |
| `App.practice.reports.notRefundable` | This AI credit can't be returned | This AI credit can’t be returned |
| `App.practice.reports.emptyTitle` | You haven't reported any questions. | You haven’t reported any questions |
| `App.practice.reports.error` | Couldn't load your reports. | Couldn’t load your reports. Check your connection and try again. |

### App.plans (7)

| key | cũ | mới |
|---|---|---|
| `App.plans.titlePro` | You're on Pro | You’re on Pro |
| `App.plans.titleTrial` | You're trying Pro | You’re trying Pro |
| `App.plans.usingThis` | You're on this plan | You’re on this plan |
| `App.plans.priceChanged` | The price just changed, check it before you buy | The price just changed. Check it before you buy. |
| `App.plans.buyUnavailable` | Could not create the order. Try again in a few minutes. | Couldn’t create the order. Try again in a few minutes. |
| `App.plans.proLine` | Practise more, with AI writing questions and looking up words with you. | Practice more, with AI writing questions and looking up words with you. |
| `App.plans.freeList.lookup` | Look up and quick add, up to {groups, number} decks | Look up and quick add, up to {groups, plural, one {# deck} other {# decks}} |

### App.recall (10)

| key | cũ | mới |
|---|---|---|
| `App.recall.doneTitle` | {count, plural, one {# word} other {# words}} done. | {count, plural, one {# word} other {# words}} done |
| `App.recall.leveledUp` | Right, moved up | Correct, moved up |
| `App.recall.correctKept` | Right, same level | Correct, same level |
| `App.recall.wrongKept` | Wrong, same level | Incorrect, same level |
| `App.recall.needsReview` | Review again | Needs review |
| `App.recall.newLeftBody` | Learn them now and they join tomorrow's review. | Learn them now and they join tomorrow’s review. |
| `App.recall.home` | Back to home | Back to Today |
| `App.recall.nothingTitle` | This deck has no learned words yet. | This deck has no learned words yet |
| `App.recall.ring` | {correct, number}/{total, number} right | {correct, number}/{total, number} correct |
| `App.recall.ringCaption` | right | correct |

### App.streak (1)

| key | cũ | mới |
|---|---|---|
| `App.streak.days` | {days, number}-day streak | {days, plural, one {# day} other {# days}} in a row |

## Key đã xóa ở cả hai file (Q14, dòng thừa)

| key | VI cũ | EN cũ |
|---|---|---|
| `Sources.autoUpdate` | Trang này tự cập nhật: chỉ hiện nguồn đang có từ người học nhìn thấy. | This page updates itself: it lists only the sources behind content learners can see. |
| `App.settings.themeHint` | Sáng, tối hoặc theo máy | Light, dark or your device setting |
| `App.transactions.foot` | ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch | dates in your time zone · select a row to see the payment provider and transaction ID |
| `App.review.emptyBody` | Bạn vẫn có thể học lại mọi từ trong nhóm. | You can still study every word in the deck. |
| `App.word.seenCaption` | Câu bạn tự ghi khi gặp từ này trong đời | Sentences you saved when you met this word |
| `App.addWord.sentenceHint` | Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô. | Up to 300 characters. The sentence shows on the back of the card, with the word highlighted. |
| `App.addWord.bulkNote` | Từ chưa học bắt đầu ở Mới. | Words not learned yet start at New. |
| `App.practice.session.tryAgainNote` | Làm lại mà đúng vẫn tính là đúng. Xem đáp án thì tính là sai. | A right answer on a retry still counts as right. Showing the answer counts as wrong. |
| `App.practice.weak.rules.removed` | Từ bạn đã bỏ khỏi việc học không nằm ở đây. | Words you stopped learning aren't listed. |
