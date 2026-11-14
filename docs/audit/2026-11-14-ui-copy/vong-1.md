# Rà chữ giao diện vòng 1: tìm vấn đề (14/11/2026)

**Phạm vi:** `apps/web/messages/vi.json` và `en.json` ở bản trên `dev` (cùng nội dung với `feat/giao-dien-moi-polish`). Mỗi file có 1.507 chuỗi, key và placeholder của hai file khớp nhau.
**Cách làm:** đọc hết từng cặp VI/EN, rồi dùng script đếm các lỗi máy kiểm được (dấu câu, "hãy", số nhiều, dấu nháy...). Các con số "N chuỗi" dưới đây lấy từ script. Nhóm nào đếm bằng tay thì ghi "ít nhất N".
**Vòng 2 đã làm (14/11/2026):** xem `vong-2.md` (report) và `vong-2-thay-doi.md` (bảng key | cũ | mới).

---

## 1. Nhận xét chung

- **Bản VI** phần lớn đã theo chuẩn: câu ngắn, xưng "bạn", nút là động từ + đối tượng, gần như không có "vui lòng" (0 chuỗi) và không có chấm than (0 chuỗi). Giọng lệch ở hai đầu. Một đầu suồng sã ("Mai luyện tiếp nhé", "Đúng rồi", "chấm luôn", "dán vào luôn"). Đầu kia hành chính ("Hồ sơ thanh toán theo thời hạn luật định", "Tài khoản nhân sự", "Việc xóa đang hoàn tất").
- **Bản EN** đúng ngữ pháp, giọng rõ, cũng không có "Oops" hay chấm than. Chỗ yếu là không nhất quán. Cùng một nút có ba tên ("Still learning", "Review again", "Again"). Một khái niệm có hai từ ("deck" và "group"). Câu báo lỗi có nhiều mẫu ("We couldn't…", "Couldn't…", "Could not…", "…wasn't saved", "…did not work"). Chỗ viết tắt "can't", chỗ viết đủ "cannot". Có nhiều câu dịch sát chữ "gặp" thành "meet a word", người bản ngữ không nói vậy.
- **Lệch chuẩn nhiều nhất** ở bốn chỗ: thông báo lỗi (hai mẫu "Chưa … được" và "Không … được", nhiều câu thiếu việc cần làm), thuật ngữ (nhóm/deck, câu mẫu/câu ví dụ, câu đã gặp/câu đã lưu, Bậc/Level), dấu chấm cuối tiêu đề (14 tiêu đề VI, 13 EN), và EN thiếu dạng số nhiều (14 chuỗi).
- **Hai bản không cùng giọng.** VI thân hơn ("Đúng rồi", "nhé"), còn EN trung tính hơn ("Right", "Back tomorrow"). Ở một số chỗ hai bản còn nói hai việc khác nhau (mục 2.11).
- **Đã biết, không tính là lỗi:** toàn bộ `Landing.*` của EN đang là chữ Việt (97 chuỗi). Đây là chủ ý: `/en` chuyển về `/vi` (`docs/deliveries/landing-redesign.md` mục 12). Riêng 3 chuỗi `Metadata.*` thì có vấn đề (mục 2.3).

---

## 2. Các vấn đề, xếp từ nặng tới nhẹ

### 2.1 Một nút, ba tên ở bản EN ("Cần ôn lại", "Đã biết")
- **Bản:** EN. **Số chuỗi:** 14 ("Still learning" 5, "Review again" 8, "Again" 1). "Know"/"Known" thì 9 chuỗi.
- **Vì sao nặng:** câu hướng dẫn trỏ tới một tên nút không có trên màn hình. Người học không biết đó là nút nào.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.practice.sources.priority.body` | Words you marked Still learning, oldest first. | Trong phiên luyện, nút này tên "Review again" (`App.practice.session.stillLearning`). |
| `App.review.stillLearning` / `App.practice.session.stillLearning` | Still learning / Review again | VI cùng là "Cần ôn lại", EN thành hai tên. |
| `App.calendar.day.again` / `App.calendar.day.known` | Again, back to Level 1 / Known, up one level | Tên thứ ba ("Again"). Nút là "Know" nhưng lịch ghi "Known". |

- **Hướng sửa:** chọn một tên EN cho mỗi nút và dùng ở mọi nơi, gồm câu hướng dẫn và phím tắt (câu cần chốt Q2). VI giữ "Cần ôn lại" và "Đã biết".

### 2.2 "Nhóm" có nhiều tên, nhất là ở EN
- **Bản:** cả hai. **Số chuỗi:** EN dùng "deck" ở 122 chuỗi. Có ít nhất 4 chuỗi gọi khác: `Nav.groups` "Word groups", `App.deleteAccount.deleted.learning` "groups", `App.lookup.otherGroup` "Another group or a new one", `App.lookup.stacksTitle` "Press a stack to add". VI có "Nhóm", "Nhóm từ" (`Nav.groups`), "chồng" (`App.lookup.stacksTitle`), "Danh sách nhóm" (`App.group.toList`) và "Nhóm của bạn" (`App.group.back`).

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.lookup.otherGroup` | Nhóm khác hoặc tạo nhóm mới / Another group or a new one | Chỉ một chuỗi EN này dùng "group". |
| `App.lookup.stacksTitle` | Bấm vào chồng để thêm / Press a stack to add | "Chồng" và "stack" là hình vẽ trên màn hình, không phải tên khái niệm. Người học không biết chồng là nhóm. |
| `App.group.toList` | Về Danh sách nhóm / Go to your decks | Trang này ở chỗ khác tên "Nhóm của bạn" (`App.groups.title`). |

- **Hướng sửa:** VI "nhóm", tên trang là "Nhóm của bạn". EN chọn một từ (Q1).

### 2.3 Tiêu đề tab của `/en/app` đang là chữ Việt
- **Bản:** EN. **Số chuỗi:** 3 (`Metadata.title`, `Metadata.description`, `Metadata.ogAlt`).
- **Vì sao:** `app/[locale]/layout.tsx` lấy `Metadata.title` làm tiêu đề trang. Trong `/app` chỉ có `register` và layout `(auth)` tự khai metadata. Các trang `/en/app` khác dùng tiêu đề này, nên tab trình duyệt của người học tiếng Anh hiện "Wordmet · Học từ vựng tiếng Anh…".
- **Hướng sửa:** dịch 3 chuỗi này sang EN (Q7).

### 2.4 Thông báo lỗi: hai mẫu câu, nhiều câu thiếu việc cần làm
- **Bản:** cả hai.
- **VI, hai mẫu:** "Chưa … được" (8 chuỗi) và "Không … được" (10 chuỗi). Chuẩn là "Không … được". Tương tự, sai mật khẩu hay sai mã có lúc là "chưa đúng" (3 chuỗi), có lúc là "không đúng" (1 chuỗi).
- **Thiếu việc cần làm:** ít nhất 12 chuỗi.
- **EN, nhiều mẫu:** "We couldn't…" (5), "Couldn't…" (3), "Could not…" (2), "…wasn't saved", "…did not work", "This page could not be loaded". Viết đủ "did not / cannot / does not" ở 15 chuỗi, trong khi các chuỗi khác viết tắt.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.review.failed` / `App.practice.session.failed` | Chưa lưu được câu trả lời. Kiểm tra mạng rồi bấm lại. / We couldn't save your answer… / Your answer wasn't saved… | Cùng một lỗi nhưng EN viết hai kiểu. VI dùng "Chưa … được" và "bấm lại", trong khi mọi lỗi khác dùng "thử lại". |
| `App.addWord.ai.failed`, `App.errors.ai-lookup-failed`, `App.errors.ai-unavailable`, `App.practice.session.ai.errorTitle` | Hệ thống đang gặp lỗi. / We ran into a problem. | Không nói hỏng việc gì, cũng không nói cần làm gì. EN có hai bản ("We ran into a problem", "Something went wrong on our side"). |
| `App.errors.invalid-credentials` | Email hoặc mật khẩu chưa đúng. / Wrong email or password. | Thiếu việc cần làm. "Chưa đúng" khác mẫu "không đúng". EN không phải câu hoàn chỉnh. |
| `App.calendar.month.error`, `App.calendar.day.error`, `App.practice.reports.error`, `App.auth.captchaLoadFailed` | Không tải được lịch. / Couldn't load the calendar. | Thiếu "Kiểm tra mạng rồi thử lại.", trong khi `App.transactions.error` có câu này. |
| `App.errors.quota-exhausted` | Đã dùng hết lượt. / You’ve used them all. | Không rõ hết lượt gì. "them" trong EN không trỏ tới gì. |

- **Hướng sửa:** VI dùng một mẫu "Không [động từ] được [cái gì]. [Việc cần làm]." EN dùng "Couldn't [verb] [what]. [What to do]." Một lỗi một cụm, dùng chung ở mọi chỗ. Câu nào nói ra được hỏng việc gì thì nói ra.

### 2.5 Giọng không đều: suồng sã lẫn hành chính
- **Bản:** cả hai. **Số chuỗi:** ít nhất 14.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.practice.out.title` | Mai luyện tiếp nhé / Back tomorrow | "nhé", "Mai" là văn nói. EN cũng là văn nói. |
| `App.practice.session.right` / `.wrong` | Đúng rồi / Chưa đúng; Right / Not quite | "Đúng rồi" và "Not quite" thân hơn mọi phản hồi khác ("Đúng", "Sai", `App.recall.*`). |
| `App.errors.rate-limited` | Bạn thao tác hơi nhanh. / You’re going a bit fast. | Đùa nhẹ. Nên nói thẳng là đang bị giới hạn. |
| `App.addWord.quickBody`, `App.practice.session.phoneHint`, `App.review.nudge`, `App.today.allDone` | …dán vào luôn. / …chấm luôn. / …trước đã. / Mai ôn tiếp. | Văn nói ("luôn", "đã", "Mai"). |
| `App.deleteAccount.kept.paymentsNoYears`, `App.errors.staff-account`, `App.deleteAccount.pendingBody` | …theo thời hạn luật định… / Tài khoản nhân sự… / Việc xóa đang hoàn tất… | Từ hành chính. "Việc + động từ" làm chủ ngữ. |
| `Legal.draftNotice` (EN) | …published prior to Wordmet's official launch. | "prior to" là từ trang trọng, chữ "official" lặp hai lần. |

- **Hướng sửa:** một giọng trung tính, lịch sự cho cả app. Phản hồi đúng/sai giữ ngắn và thân ở mức vừa phải (Q8).

### 2.6 EN dịch sát chữ "gặp" (meet a word)
- **Bản:** EN. **Số chuỗi:** ít nhất 7. Cùng một ý có 4 cách nói: "met", "found", "come across", "saw it in".

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.addWord.title` | Which word did you just meet? | "meet a word" không phải cách nói tự nhiên. |
| `App.word.seenTitle` / `App.word.seenCaption` | Sentences you met / …saved when you met this word | Như trên. Chỗ khác của cùng khái niệm này lại gọi là "saved sentences". |
| `App.settings.shortcutAdd` vs `App.group.emptyBody` | Add a word you found / …words you come across… | Cùng ý, hai cách nói khác. |

- **Hướng sửa:** EN dùng "come across" hoặc "new word you saw", và một tên cho câu của người học (Q4).

### 2.7 EN thiếu số nhiều (ICU plural)
- **Bản:** EN. **Số chuỗi:** 14 chuỗi có `{x, number}` + danh từ số nhiều mà không có `plural`. Ít nhất 6 chuỗi hiện sai khi số là 1.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.addWord.bulkResult` | Added {added, number} words to “{name}”. | "Added 1 words". VI cùng key đúng vì tiếng Việt không chia. |
| `App.addWord.ai.left` | {count, number} AI credits for lookups left | "1 AI credits". |
| `App.groups.search`, `App.backlog.selectAll`, `App.topic.selectAll`, `App.practice.session.summary.line` | Search {count, number} decks / Select all {count, number} words / … of {limit, number} sessions left today | Sai khi số là 1. |

- **Hướng sửa:** đổi value sang `{count, plural, one {…} other {…}}`. Chỉ đổi value, placeholder giữ nguyên tên.

### 2.8 Dấu chấm cuối tiêu đề và câu báo trống
- **Bản:** cả hai. **Số chuỗi:** 14 key tiêu đề VI và 13 EN có chấm cuối. Câu báo trống cùng loại chỗ có chấm, chỗ không.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.transactions.emptyTitle` vs `App.today.emptyTitle` | Chưa có giao dịch nào. / Chưa có nhóm nào | Hai tiêu đề trống cùng loại, một cái có chấm. |
| `App.review.doneTitle`, `App.practice.session.summary.title`, `App.recall.doneTitle` | Xong {count, number} thẻ. | Tiêu đề có chấm. |
| `Landing.groups.title`, `Landing.plans.title`, `Landing.final.title` | Từ của mỗi bài thành một nhóm. | Tiêu đề có chấm. Riêng `Landing.hero.line1/line2` là hai dòng của một câu, nên dấu chấm ở đó có thể là chủ ý. |

- **Hướng sửa:** bỏ chấm ở tiêu đề và nhãn. Giữ chấm ở câu thân (body) và câu báo lỗi.

### 2.9 "Hãy" dùng không theo quy tắc
- **Bản:** VI. **Số chuỗi:** 12, mười chuỗi trong số đó ở `App.errors.*`.
- **Vì sao:** đa số lỗi khác không có "hãy", nên 12 chuỗi này nghe khác giọng. "Hãy" ở đây không mang nghĩa xin làm lại.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.errors.google-failed` | Đăng nhập bằng Google chưa thành công. Hãy thử lại. | Mọi lỗi khác chỉ viết "Thử lại.". Cụm "chưa thành công" cũng lệch mẫu. |
| `App.errors.cancel-in-store` | Gói này mua qua cửa hàng ứng dụng, hãy hủy trong phần quản lý gói của cửa hàng đó. | Hai câu nối bằng dấu phẩy. "hãy" thừa. |
| `App.errors.reauth-required` | Hãy xác nhận lại bằng tài khoản Google của bạn trước khi xóa. | Bỏ "Hãy" và "của bạn" thì câu vẫn đủ nghĩa. |

- **Hướng sửa:** bỏ "hãy" ở cả 12 chuỗi (Q9).

### 2.10 Nút và nhãn sai mẫu
- **Bản:** cả hai. **Số chuỗi:** ít nhất 12.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.addWord.manualButton` | Nghĩa khác, tự nhập / Other meaning, enter it | Không phải động từ + đối tượng. Gợi ý: "Tự nhập nghĩa khác" / "Enter another meaning". |
| `App.houseAd.cta`, `App.practice.customize.seePro` | See Pro | Không rõ xem cái gì. VI ghi "Xem gói Pro". |
| `App.ui.seePlans` vs `App.settings.seePlans` vs `App.account.seePlan` | Xem Gói học / Xem gói học / Xem gói | Ba nhãn cho cùng một nút, viết hoa không đều. |
| `App.groups.keep`, `App.group.keep`, `App.backlog.keep` | Giữ nhóm / Giữ lại / Giữ lại; EN đều là "Cancel" | Nút hủy trong hộp xác nhận: VI có hai tên, EN thì mang nghĩa khác (mục 2.11). |
| `App.lookup.prev` vs `App.lookup.next` | ← Trang trước / Trang sau | Một nút có mũi tên, nút kia không. |
| `Footer.privacy`, `Footer.terms` vs `App.auth.register.consent` | Privacy Policy, Terms of Use / Terms of use, Privacy policy | Tên văn bản viết hoa không đều trong bản EN (Q6). |

### 2.11 Bản EN và VI lệch nghĩa
- **Bản:** cả hai. **Số chuỗi:** ít nhất 12.

| key | VI / EN | lệch ở đâu |
|---|---|---|
| `App.houseAd.lead` | …nhiều phiên luyện và nhiều lượt AI hơn mỗi tháng… / …more practice sessions and more AI uses each month… | Phiên luyện tính theo ngày (`App.houseAd.sessions` "mỗi ngày"), nhưng câu này đặt "mỗi tháng" sau cả hai. Lỗi nghĩa ở cả hai bản. |
| `App.groups.keep` | Giữ nhóm / Cancel | VI nói giữ, EN nói hủy. |
| `App.review.close` | Đóng phiên ôn / Stop | |
| `App.group.notFound`, `App.topic.notFound` | Không tìm thấy nhóm này. / This deck doesn’t exist anymore. | EN khẳng định thêm là đã bị xóa. |
| `App.deck.recallExtra` | Ôn tập / Extra review | VI không có ý "thêm". |
| `App.review.seen` | Câu bạn đã gặp / Your saved sentences | |
| `App.practice.hero.words` | {words} từ trong {groups} nhóm / {words} to practise in {groups} decks | EN thêm "to practise", thiếu danh từ sau số. |
| `App.deleteAccount.kept.usage` | Số lượt đã dùng / Quota you used | |
| `App.practice.sources.weak.more` | +{count} từ / +{count} more | |
| `App.groups.rhythm` | nhịp ôn: Mới → Bậc 5 / Review rhythm: New → Level 5 | Viết hoa khác nhau. |
| `App.speak.pending` | Đang tạo giọng đọc / The voice is being made | EN bị động, sai nghĩa (đang tạo file âm thanh, không phải giọng). |

### 2.12 Câu dài, bị động, vòng vo
- **Bản:** cả hai. **Số chuỗi:** ít nhất 10.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `App.auth.login.rateLimited` | Wordmet đang nhận quá nhiều yêu cầu từ trình duyệt này nên bạn cần đăng nhập lại. | 21 chữ, nói chuyện kỹ thuật. Không rõ vì sao bị giới hạn thì phải đăng nhập lại (Q10). |
| `NotFound.body` | Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. | Bị động. `App.common.notFoundBody` nói cùng ý gọn hơn: "Đường dẫn có thể đã cũ." |
| `App.auth.complete.body` | …Wordmet cần ngày sinh của bạn và việc bạn đồng ý với điều khoản. | Dùng "việc" + động từ. |
| `App.group.emptyBody` | …Khi nhóm đã có từ, bạn có thể bắt đầu ôn tập. | Câu sau không thêm thông tin. |
| `App.common.errorPageTitle` (EN), `App.errors.inProgress` (EN), `App.deleteAccount.pendingBody` (EN) | This page could not be loaded. / …is still being processed. / The deletion is being finished… | Câu bị động. |
| `App.auth.register.accountDeleting`, `App.plans.priceChanged` | …đang được xóa, thử lại sau. / Giá vừa đổi, xem lại trước khi mua | Hai câu nối bằng dấu phẩy. EN cũng vậy. |

### 2.13 Câu thừa, lời tiếp thị
- **Bản:** cả hai. **Số chuỗi:** ít nhất 5.

| key | chuỗi hiện tại | vì sao chưa đạt |
|---|---|---|
| `Landing.plans.aiList.0` | AI đi cùng bạn | Không nói gì cụ thể. Ba dòng sau mới nói AI làm gì. |
| `App.review.emptyBody` | Bạn vẫn có thể học lại mọi từ trong nhóm. | Nhắc lại nút ngay bên dưới ("Học tất cả từ"). |
| `App.word.notFoundBody` | …Bạn có thể tự thêm với nghĩa của bạn. | "của bạn" lặp. Nút "Thêm từ này" đã nói việc cần làm. |
| `App.deleteAccount.doneBody` | Cảm ơn bạn đã học cùng Wordmet. … | Câu cảm ơn. Giữ hay bỏ tùy giọng bạn muốn. |

### 2.14 Dấu câu, số, chính tả
- **Bản:** cả hai.
- Dấu phẩy trước "và"/"hoặc": 10 chuỗi VI (ví dụ `Legal.privacyLead` "…chia sẻ với ai, và quyền…"; `App.lookup.emptyBody` "Thử bỏ bớt bộ lọc, hoặc tự thêm…").
- Số có số 0 ở đầu: `Legal.privacyHelpBody` "Phản hồi trong 02 ngày làm việc." nên viết "2 ngày". EN đã viết "2".
- Dấu nháy EN lẫn hai kiểu: kiểu cong `’` ở 29 chuỗi, kiểu thẳng `'` ở 33 chuỗi.
- Chính tả Anh/Mỹ lẫn nhau: "practise" ở 3 chuỗi (`App.today.lastRetry`, `App.practice.hero.words`, `App.plans.proLine`), các chuỗi còn lại viết "practice"/"practiced" và "Customize" kiểu Mỹ.
- "lookups" và "look-ups" (`App.houseAd.ai`).
- "Log in" (`Nav.login`) trong khi cả app dùng "Sign in".
- "e.g." (`App.lookup.searchLabel`) và "For example:" (`App.addWord.quickPlaceholder`).
- "Bỏ qua tới nội dung" (`App.chrome.skipToContent`) và "Chuyển đến nội dung chính" (`Nav.skipToContent`).
- Khoảng trắng quanh "/" không đều: `{shown} / {total}` và `{used}/{limit}`.

### 2.15 Landing nói nhiều về thanh toán, FAQ viết theo góc kỹ thuật (bổ sung 14/11 theo góp ý của bạn)
- **Bản:** VI (landing chỉ có bản Việt).
- **Số chuỗi:** 4/6 câu FAQ nói về thanh toán, cộng ít nhất 4 chuỗi `Landing.plans.*` và `Landing.final.note`.
- **Vì sao:** các landing tham khảo (LadiPage, Clozemaster, Memrise, Quizlet) không đặt chuyện gia hạn, hoàn tiền hay kỳ hạn lên trang chủ (`tham-khao-landing.md`). Câu "không cần thẻ thanh toán" không mang thông tin, vì Wordmet thu tiền bằng chuyển khoản. FAQ hiện tại trả lời câu hỏi của người sắp mua, không trả lời vấn đề của người học.
- **Hướng sửa:** bộ FAQ 6 câu bao quát theo mẫu "vấn đề → cách Wordmet giải quyết" và danh sách chuỗi landing cần đổi, ở `faq-de-xuat.md`. FAQ nằm ở trang FAQ của admin và bản dự phòng `landing-data.fallback.ts`, không nằm trong `vi.json`.

### 2.16 Dòng chữ thừa, cân nhắc bỏ hẳn (bổ sung 14/11 theo góp ý của bạn)
- **Bản:** cả hai (bỏ thì bỏ ở cả VI và EN).
- **Cách chọn:** dòng nhắc lại điều màn hình đã cho thấy (tiêu đề, nút, các lựa chọn, bộ đếm ký tự), giải thích cơ chế người học không cần để làm gì, hoặc chỉ nói một trường hợp hiếm. Mọi dòng dưới đây đều đã kiểm trong code là chữ hiện trên màn hình, không phải nhãn cho trình đọc màn hình.
- **Lưu ý:** bỏ cả dòng nghĩa là xóa thẻ hiển thị trong code và xóa key ở cả hai file. Việc này nằm ngoài quy tắc "không xóa key" của vòng 2, nên cần bạn đồng ý riêng (Q14). Bỏ một phần thì chỉ sửa value.

**Bỏ cả dòng**

| key | hiện ở | chuỗi VI | vì sao thừa |
|---|---|---|---|
| `App.practice.session.tryAgainNote` | `TypeWordQuestion.tsx:156` | Làm lại mà đúng vẫn tính là đúng. Xem đáp án thì tính là sai. | Nói luật chấm. Người học không cần biết để chọn Làm lại hay Xem đáp án. |
| `App.addWord.sentenceHint` | `AddSentenceSheet.tsx:83` | Tối đa 300 ký tự. Câu hiện ở mặt sau thẻ, từ được tô. | Ô nhập đã có bộ đếm ký tự (`showCount`). Khung "Mặt sau thẻ" xem trước ngay bên dưới (`AddSentenceSheet.tsx:92`). |
| `App.settings.themeHint` | `SettingsPage.tsx:163` | Sáng, tối hoặc theo máy | Nhắc lại ba lựa chọn nằm ngay cạnh. |
| `App.word.seenCaption` | `WordPage.tsx:281` | Câu bạn tự ghi khi gặp từ này trong đời | Nhắc lại tiêu đề "Câu bạn đã gặp". "trong đời" là văn nói. |
| `App.review.emptyBody` | `ReviewSession.tsx:114` | Bạn vẫn có thể học lại mọi từ trong nhóm. | Nhắc lại nút ngay dưới ("Học tất cả từ"). |
| `App.practice.session.noteHint` | `PracticeSession.tsx:413` | Dùng gợi ý vẫn được chấm như thường, nhưng câu đúng nhờ gợi ý không có nút Đã biết. | Giải thích vì sao thiếu một nút. Người học thấy ngay là không có nút đó. |
| `App.addWord.bulkNote` | `BulkAddSheet.tsx:98` | Từ chưa học bắt đầu ở Mới. | Hiển nhiên: từ mới thì ở bậc Mới. |
| `App.practice.weak.rules.removed` | `WeakWordsPage.tsx:99` | Từ bạn đã bỏ khỏi việc học không nằm ở đây. | Trường hợp hiếm, ba luật trên đã đủ hiểu danh sách. |
| `Sources.autoUpdate` | `SourcesPage.tsx:43` | Trang này tự cập nhật: chỉ hiện nguồn đang có từ người học nhìn thấy. | Nói cơ chế bên trong. Người đọc trang chỉ cần danh sách nguồn. |
| `App.transactions.foot` | `TransactionsPage.tsx:61` | ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch | Ngày theo giờ của người xem là điều mặc nhiên. Mỗi dòng đã có nhãn "Xem chi tiết". |

**Bỏ một phần**

| key | hiện ở | phần nên bỏ | vì sao |
|---|---|---|---|
| `App.groups.subtitle` + `App.groups.hint` | `GroupListPage.tsx:193`, `GroupCarousel.tsx:163` | Đoạn hướng dẫn phím trong `subtitle` ("phím trái, phải… · bấm thẻ giữa hoặc ↓ để mở") | Cùng màn hình đã có `hint` "Bấm để mở nhóm · ↓". Hai lời hướng dẫn cho cùng một thao tác. |
| `App.today.yourGroupsHint` | `TodayPage.tsx:232` | "· bấm thẻ để mở nhóm" | Thao tác hiển nhiên với một thẻ. |
| `App.groups.deleteNote` | `GroupDialogs.tsx:196` | Câu đầu "Từ còn nằm ở nhóm khác thì giữ nguyên." | Lặp ý của `deleteBody` / `deleteBodyNone` ngay phía trên. Giữ câu sau (từ tự thêm vẫn còn trong Từ của tôi). |
| `App.practice.session.round.note` | `RoundPrompt.tsx:36` | Câu đầu "Wordmet chỉ hỏi một lần." | Không rõ nghĩa (Q10). Câu sau (không tính thêm phiên) là thông tin cần, giữ lại. |
| `App.practice.session.tryAgainBody` | `TypeWordQuestion.tsx:155` | "Wordmet chưa hiện đáp án." | Màn hình đang không hiện đáp án. |
| `App.group.emptyBody` | `GroupPage.tsx:314` | Câu sau "Khi nhóm đã có từ, bạn có thể bắt đầu ôn tập." | Hiển nhiên (đã ghi ở mục 2.12). |
| `App.deleteAccount.doneBody` | `AccountDeleted.tsx:20` | "Cảm ơn bạn đã học cùng Wordmet." | Câu xã giao. Giữ câu báo thư xác nhận. |

**Cân nhắc, chưa chắc nên bỏ:** `App.practice.session.noteKnowEnter`, `noteKnowTap`, `noteWrong`, `noteWrongTap` (`AnswerFeedback.tsx:99–102`). Các dòng này nói bấm Đã biết hay Cần ôn lại thì từ lên hay xuống bậc. Thanh phím (`KeyLegend`, `PracticeSession.tsx:213`) đã có tên phím, nhưng không nói hậu quả. Bỏ thì người mới không biết hai nút khác nhau thế nào.

---

## 3. Bảng thuật ngữ

| Khái niệm | Các cách gọi đang có (key) | Đề xuất VI / EN |
|---|---|---|
| Nhóm từ của người học | VI: Nhóm (`App.chrome.tabs.groups`), Nhóm từ (`Nav.groups`), chồng (`App.lookup.stacksTitle`), Danh sách nhóm (`App.group.toList`). EN: deck (122 chuỗi), Word groups (`Nav.groups`), groups (`App.deleteAccount.deleted.learning`), group (`App.lookup.otherGroup`), stack (`App.lookup.stacksTitle`) | nhóm / chờ Q1 |
| Nút "Cần ôn lại" | EN: Still learning (5), Review again (8), Again (`App.calendar.day.again`) | Cần ôn lại / **Needs review** (đã chốt Q2) |
| Nút "Đã biết" | EN: Know (8), Known (`App.calendar.day.known`) | Đã biết / **Known** (đã chốt Q2) |
| Bậc ôn (Mới, Bậc 1–5) | VI: Bậc (24). EN: Level (13) | Bậc / chờ Q3 |
| Trình độ (CEFR) | VI: trình độ (6). EN: Level (`App.lookup.level`, `App.word.levelRange`, `App.addWord.edit.level`, `App.topic.eyebrow`) | trình độ / chờ Q3 (đang trùng chữ "Level" với Bậc) |
| Câu ví dụ có sẵn | VI: câu mẫu (`App.review.example`, `Landing.hero.lead`), câu ví dụ (5). EN: Example | câu ví dụ / example sentence (nhãn ngắn: Example) |
| Câu người học tự ghi | VI: câu đã gặp (13), câu bạn gặp (`App.addWord.sentence`, `App.addWord.result.yourSentence`), câu bạn (đã) lưu (4, `App.practice.customize.*`), câu bạn tự viết (`App.deleteAccount.deleted.privateWords`). EN: saved sentences (11), sentences you met (`App.word.seenTitle`), Your sentence, sentence you saw it in | chờ Q4 |
| Lượt AI | VI: lượt câu AI, lượt tra AI, lượt AI (`App.houseAd.lead`). EN: AI credits for questions / for lookups (25), AI uses (`App.houseAd.lead`), AI questions … left (`App.practice.customize.aiOut`, `aiMax`), Quota (`App.deleteAccount.kept.usage`) | lượt câu AI, lượt tra AI / AI question credits, AI lookup credits |
| Tra bằng AI | EN: lookups, look-ups, lookup, Look up with AI | tra AI / AI lookup(s) |
| Đăng nhập | EN: Sign in (App), Log in (`Nav.login`) | Đăng nhập / Sign in |
| Xác minh email và các bước xác nhận | VI: xác minh (`App.auth.verify.submit`, `App.account.verified`, `App.errors.*`), xác nhận email (`App.auth.verify.loginBody`, `App.auth.verify.wrongCode`). EN: verify, confirm | email: xác minh / verify. Hành động (xóa, Google): xác nhận / confirm |
| Bước chống bot (captcha) | VI: bước xác minh, chống bot, "bạn không phải máy". EN: the check, bot check | bước xác minh / verification check |
| Kho từ của Wordmet | VI: từ điển (`App.word.notFoundBody`, `App.addWord.result.catalog`…), kho (`App.calendar.day.lemmaGone`). EN: dictionary, library | từ điển Wordmet / Wordmet dictionary |
| Trang gói | VI: Gói học (`App.chrome.plans`), Gói (`App.deleteAccount.blockedLink` "Đến trang Gói"), Giá (`Nav.pricing`). EN: Plans, Pricing | Gói học / Plans (landing giữ Giá / Pricing) |
| Gói Free | VI: Miễn phí, gói Miễn phí (5 chuỗi App). EN: Free | chờ Q5 |
| Trang đầu của app | VI: Hôm nay (`App.common.home` "Về Hôm nay"), trang chủ (`App.review.home`, `App.recall.home`). EN: Today, home | Hôm nay / Today |
| Nơi trả tiền | VI: cổng thanh toán (`App.transactions.detail.provider`), nhà cung cấp thanh toán (`App.errors.provider-unavailable`). EN: payment provider | cổng thanh toán / payment provider |
| Từ quá hạn lâu (backlog) | VI: từ lâu chưa ôn, quá hạn lâu, từ quá hạn. EN: Not reviewed in a while, Long overdue, Overdue words | từ lâu chưa ôn / long-overdue words |
| Chuỗi ngày học | VI: ngày liên tiếp. EN: days in a row (`App.calendar.*`), -day streak (`App.streak.days`) | ngày liên tiếp / day streak |
| Đúng (kết quả) | VI: Đúng, Đúng rồi. EN: Right (nhiều), Correct (4) | Đúng / Correct |
| Thao tác chạm, bấm | VI: bấm (máy tính và điện thoại), chạm (điện thoại), nhấn (phím). EN: click, press, tap, select, choose | VI: bấm (máy tính), chạm (điện thoại), nhấn (phím). EN: select (máy tính), tap (điện thoại), press (phím) |

---

## 4. Câu cần bạn chốt

- **Q1. EN gọi "nhóm" là gì?** Hiện app dùng "deck" (122 chuỗi), landing và vài chỗ dùng "group". "deck" là từ quen của app thẻ ghi nhớ, nhưng VI là "nhóm", nghĩa rộng hơn "bộ thẻ". Chọn "deck" thì sửa khoảng 5 chuỗi; chọn "group" thì sửa khoảng 120 chuỗi.
- **Q2. EN gọi nút "Cần ôn lại" là gì?** Có ba bản: "Still learning", "Review again", "Again". Nút cặp với nó là "Know".
  **Đã chốt (14/11/2026): "Needs review" / "Known".** Bạn đề xuất "Need review", Claude đề xuất thêm "s" và đổi "Know" thành "Known", và bạn chọn cặp này. Vòng 2 đổi 14 chuỗi ("Still learning" 5, "Review again" 8, "Again" 1) thành "Needs review" và 8 chuỗi "Know" thành "Known", kể cả các câu hướng dẫn nhắc tên nút. VI giữ "Cần ôn lại" / "Đã biết". Lý do ở mục 4 của `danh-gia-gemini.md`.
- **Q3. EN tách "Bậc" và "trình độ" ra sao?** Hiện cả hai đều là "Level". Ví dụ cùng một trang có "Level 3" (bậc ôn) và "Level B2" (trình độ). Có thể giữ "Level" cho một bên và đổi bên kia (ví dụ "Stage" cho bậc ôn, hoặc "CEFR level" cho trình độ).
- **Q4. Câu người học tự ghi gọi là gì?** VI có "câu đã gặp" và "câu bạn đã lưu". EN có "saved sentence" và "sentence you met". Nên có một tên cho mỗi bản.
- **Q5. Gói Free trong bản VI:** giữ "Miễn phí" như hiện nay hay đổi thành "Free"? Đề bài nói giữ nguyên tên riêng Free và Pro.
- **Q6. Tên văn bản pháp lý trong EN:** viết hoa như tên riêng ("Terms of Use", "Privacy Policy", hiện ở 6 chuỗi) hay viết kiểu sentence case ("Terms of use", hiện ở 1 chuỗi)?
- **Q7. Bản EN của trang ngoài:** chỉ dịch 3 chuỗi `Metadata.*` (đang hiện ở tab `/en/app`) và giữ `Landing.*` là chữ Việt như quyết định cũ? Hay để nguyên cả hai?
- **Q8. Giọng phản hồi trong phiên luyện:** giữ thân ("Đúng rồi", "Chưa đúng", "Not quite", "Mai luyện tiếp nhé") hay chuyển sang trung tính ("Đúng", "Sai", "Correct", "Incorrect")?
- **Q9. "Hãy":** bỏ ở cả 12 chuỗi lỗi, hay giữ ở những câu xin người dùng làm một việc mới (ví dụ `App.errors.google-email-unverified`)?
- **Q10. Các câu nghĩa chưa rõ.** Cần bạn nói ý đúng trước khi viết lại:
  - `App.auth.login.rateLimited`: vì sao bị giới hạn thì phải đăng nhập lại? Người học cần làm gì: chờ, hay đăng nhập ngay?
  - `App.practice.session.round.note`: "Wordmet chỉ hỏi một lần." nghĩa là chỉ hỏi về vòng luyện thêm một lần trong phiên?
  - `App.errors.share-consent-required`: key nói về việc thiếu đồng ý chia sẻ, nhưng câu chỉ nói "Chưa gửi được báo lỗi". Có nên nói rõ lý do không?
  - `App.houseAd.lead`: sửa "mỗi tháng" chỉ áp cho lượt AI, còn phiên luyện tính theo ngày. Đúng ý không?
- **Q11. Các chuỗi về gói tự gia hạn và dùng thử** (`App.plans.subscriptions.*`, `App.deleteAccount.blocked`, `App.errors.renewal-not-cancelled`, `App.errors.subscription-*`, `App.errors.cancel-in-store`, `App.plans.titleTrial`…): sản phẩm hiện chỉ bán trả trước và đã tắt dùng thử. Vòng 2 có sửa câu chữ các chuỗi này không, hay để nguyên vì người dùng mới không gặp?
- **Q12. FAQ landing:** dùng bộ 6 câu ở `faq-de-xuat.md` (bản 2) và chuyển 3 câu thanh toán sang trang Gói học?
- **Q13. Giá trên landing:** giữ một dòng "từ … mỗi tháng", hay bỏ hẳn bảng chọn kỳ và % tiết kiệm khỏi landing như LadiPage? Bỏ hẳn thì phải sửa cả code của khối giá.
- **Q14. Dòng thừa (mục 2.16):** đồng ý bỏ cả dòng cho 10 key ở bảng "Bỏ cả dòng"? Việc này cần sửa code và xóa key, ngoài phạm vi vòng 2 ban đầu. Còn bốn dòng `note*` trong phiên luyện thì giữ hay bỏ?

Gợi ý cho Q1–Q8 dựa trên các app tham khảo (Anki, Quizlet, Prep, Mochi): xem bảng ở mục 3 của `tham-khao-landing.md`.

---

## 5. Đề xuất cho các câu còn mở (14/11/2026, bạn yêu cầu "đề xuất hết")

Claude đề xuất, bạn duyệt. Q2 đã chốt ở trên.

| Câu | Đề xuất | Lý do | Đánh đổi |
|---|---|---|---|
| Q1 | EN giữ **deck**, sửa khoảng 5 chuỗi còn ghi "group"/"stack"/"Word groups" | Anki dùng deck. 122 chuỗi đã là deck. | "deck" hẹp nghĩa hơn "nhóm", nhưng người học app thẻ quen từ này. |
| Q3 | Giữ **Level** cho bậc ôn (13 chuỗi, khớp "Bậc"). Đổi trình độ thành **CEFR level** (khoảng 5 chuỗi: `App.lookup.level`, `App.lookup.summary`, `App.word.levelRange`, `App.addWord.edit.level`, `App.topic.eyebrow`) | Ít chuỗi phải đổi nhất. "CEFR" là tên người học tiếng Anh đã biết, nên không thể nhầm với bậc ôn. Đề xuất này **thay** gợi ý "Stage" trong `tham-khao-landing.md`. | Người chưa biết CEFR thấy thêm một chữ viết tắt. |
| Q4 | VI dùng **câu đã gặp** (đổi 4 chuỗi "câu bạn (đã) lưu"). EN dùng **saved sentence** (đổi "Sentences you met", "Your sentence", "sentence you saw it in") | VI "câu đã gặp" đã có ở 13 chuỗi, EN "saved sentence" ở 11 chuỗi. | Hai bản dùng hai góc nhìn ("gặp" và "lưu"), nhưng mỗi bản nhất quán trong chính nó. |
| Q5 | VI giữ **Miễn phí** / gói Miễn phí, EN giữ **Free** | Không đổi tên đang dùng. Người học Việt hiểu "Miễn phí" ngay. | "Free" không còn là tên riêng giống hệt nhau ở hai bản. |
| Q6 | EN viết hoa như tên riêng: **Terms of Use**, **Privacy Policy**. Sửa 1 chuỗi (`App.auth.register.consent`) | Đó là tên văn bản, và 6/7 chuỗi đã viết như vậy. | Không có. |
| Q7 | Dịch 3 chuỗi `Metadata.*` sang EN. Giữ `Landing.*` là chữ Việt như quyết định cũ. | Tab trình duyệt của `/en/app` đang hiện chữ Việt. `/en` vẫn chuyển về `/vi` nên chưa cần landing EN. | Khi mở landing EN thì phải dịch 97 chuỗi. |
| Q8 | Giọng trung tính. VI "Đúng" / "Chưa đúng" (bỏ "Đúng rồi"), bỏ "nhé", "luôn", "đã", "Mai" ở cuối hay đầu câu. Ví dụ `App.practice.out.title` "Luyện tiếp vào ngày mai". EN "Correct" / "Incorrect", bỏ "Not quite", "a bit fast", "used them all". | Đúng chuẩn đề bài (rõ, gọn, không suồng sã). "Chưa đúng" vẫn mềm mà không thành văn nói. | App bớt thân mật một chút. |
| Q9 | Bỏ "hãy" ở cả 12 chuỗi lỗi | Không câu nào là lời xin làm lại. Các lỗi khác đều không có "hãy". | Không có. |
| Q10a | `App.auth.login.rateLimited`: "Phiên đăng nhập đã dừng vì trình duyệt này gửi quá nhiều yêu cầu. Đăng nhập lại để tiếp tục." | Đã kiểm code: khi làm mới phiên bị chặn vì quá nhiều yêu cầu, app chuyển về trang đăng nhập với lý do này (`RequireSession.tsx:72`). | Không có. |
| Q10b | `App.practice.session.round.note`: "Câu hỏi này chỉ hiện một lần trong phiên. Luyện thêm vẫn tính trong phiên này, không tốn thêm phiên." | Đã kiểm code: chỉ hỏi sau vòng 1 và chỉ một lần (`sessions.service.ts:576`). | Không có. |
| Q10c | `App.errors.share-consent-required`: giữ ý, sửa theo mẫu: "Không gửi được báo lỗi. Thử lại sau." | API không trả mã lỗi này ở đâu cả (tìm trong `apps/api/src` không thấy), nên câu này hầu như không hiện. | Nếu sau này API trả mã này với nghĩa "cần đồng ý chia sẻ", câu sẽ thiếu lý do. |
| Q10d | `App.houseAd.lead`: "Pro có thêm phiên luyện mỗi ngày, thêm lượt AI mỗi tháng và không quảng cáo." EN tương ứng. | Sửa lỗi nghĩa: phiên luyện tính theo ngày. | Không có. |
| Q11 | Không viết lại nội dung các chuỗi gói tự gia hạn và dùng thử. Chỉ áp quy tắc chung (bỏ "hãy", dấu câu, mẫu câu lỗi). | Người dùng mới không gặp các chuỗi này. Viết lại thì mất công mà không ai thấy. | Nếu bật lại dùng thử thì phải xem lại. |
| Q12 | Dùng FAQ bản 2 (6 câu). Sửa ở trang FAQ của admin và chép vào `landing-data.fallback.ts`. | Bạn đã góp ý và duyệt hướng. | Đây là việc ngoài hai file JSON. |
| Q13 | Vòng 2 **giữ** khối giá (chọn kỳ, % tiết kiệm), chỉ bỏ chữ về thanh toán (`Landing.plans.title`, `lead`, `freeNote`, `Landing.final.note`). Bỏ hẳn giá khỏi landing thì để thành một việc riêng nếu bạn muốn. | Không phải sửa code. Giá vẫn là thông tin người xem landing tìm. | Landing vẫn còn một khối có số tiền. |
| Q14 | Bỏ cả 10 dòng và bỏ phần thừa ở 7 dòng (mục 2.16). Giữ 4 dòng `note*` trong phiên luyện. Làm thành commit riêng sau khi sửa chữ, kèm sửa test. | Các dòng này nhắc lại điều màn hình đã cho thấy. 4 dòng `note*` dạy người mới hiểu bậc ôn. | Phải sửa code và test, không chỉ JSON. |

**Thêm, ngoài các câu hỏi:** `Landing.plans.proSignup` đang là "Tạo tài khoản", và nút này dẫn tới trang đăng ký (`PricingSection.tsx:97`). Giữ nguyên, không đổi thành "Đăng ký Pro" như Gemini đề xuất.
