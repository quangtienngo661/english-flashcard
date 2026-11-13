# FAQ landing: đề xuất viết lại theo hướng nghiệp vụ (14/11/2026, bản 2)

**Bản nháp để duyệt, chưa sửa gì.** FAQ của landing không nằm trong `vi.json`/`en.json`. Nội dung lấy từ trang **FAQ** của admin (bảng
`landing_faq_items`), lúc build web. Khi API không trả được thì dùng bản dự phòng `apps/web/src/site/landing/landing-data.fallback.ts`.
Muốn đổi thì sửa ở admin, rồi chép cùng nội dung vào bản dự phòng để hai nơi khớp nhau.

**Bản 2 (sau góp ý "bao quát lại"):** gộp 8 câu chi tiết của bản 1 thành 6 câu, mỗi câu trả lời một mối quan tâm lớn. Bỏ các con số cơ chế:
lịch 1/3/7/14/30 ngày, luật "sai 2 trong 5 câu", số phiên mỗi ngày. Admin đổi được các con số này, nên ghi vào FAQ dễ làm câu trả lời sai mà không ai biết.

## 1. FAQ hiện tại có vấn đề gì

Bản dự phòng hiện có 6 câu:

| # | Câu hiện tại | Loại | Vấn đề |
|---|---|---|---|
| 1 | Gói Pro có tự gia hạn không? | Thanh toán | Chuyện mua bán, không phải điều người học băn khoăn khi mới biết tới app. |
| 2 | Hết Pro thì từ và lịch ôn có mất không? | Thanh toán + dữ liệu | Ý giữ dữ liệu là đáng nói, nhưng đang đặt trong khung "hết hạn gói". |
| 3 | Dùng trên điện thoại được không? | Sản phẩm | Ổn. |
| 4 | Mua thêm khi Pro còn hạn thì sao? | Thanh toán | Chỉ người đã mua mới cần. Nên để ở trang Gói học. |
| 5 | Có được hoàn tiền không? | Thanh toán | Mở đầu bằng "Không", rồi nói về mã chuyển khoản. Đây là nội dung của Điều khoản và trang Gói học. |
| 6 | AI có chấm bài của tôi không? | Sản phẩm | Viết theo góc kỹ thuật ("chấm theo quy tắc cố định"). Người học cần biết là kết quả công bằng và câu sai thì xử lý ra sao. |

4/6 câu nói về thanh toán, và không câu nào nói Wordmet giải quyết vấn đề gì của người học từ vựng.

## 2. Cách viết

- **Câu hỏi** là mối quan tâm lớn của người mới biết tới app, nói bằng lời của họ.
- **Câu trả lời** có 2–3 câu. Câu đầu là cách Wordmet giải quyết, các câu sau nói người học sẽ làm gì hoặc thấy gì. Không đi vào cơ chế.
- Không dùng thuật ngữ kỹ thuật. Không nói thanh toán, gia hạn, hoàn tiền (mục 4).
- Chỉ nói điều app đang làm được. Mỗi câu có ghi căn cứ.

## 3. Bộ FAQ đề xuất (6 câu)

**1. Wordmet giúp mình học từ vựng thế nào?**
Wordmet lo phần ghi nhớ để bạn dành thời gian dùng từ. Bạn lưu từ mới gặp, Wordmet tra sẵn nghĩa, phiên âm, câu ví dụ và xếp lịch ôn cho từng từ. Mỗi ngày bạn ôn những từ đến hạn và luyện chúng trong câu.
*Căn cứ: `Landing.hero.lead`, `Landing.learn.*`.*

**2. Học rồi vẫn quên, hoặc biết nghĩa mà không dùng được thì sao?**
Wordmet nhắc bạn ôn đúng lúc sắp quên, nhớ rồi thì giãn dần. Khi luyện, bạn điền và gõ từ vào câu chứ không chỉ chọn nghĩa. Những từ hay sai được gom lại để luyện riêng.
*Căn cứ: `Landing.learn.review.body`, `Landing.learn.practice.body`, `App.practice.weak.*`.*

**3. Mình nên bắt đầu từ đâu?**
Bắt đầu từ những từ bạn đang gặp khi đọc hay xem phim, hoặc chọn một nhóm từ có sẵn theo chủ đề và trình độ. Sau đó, trang Hôm nay cho biết mỗi ngày cần ôn gì.
*Căn cứ: `App.addWord.*`, `App.groups.suggestTitle`, `App.topic.*`, `App.today.*`.*

**4. AI giúp gì, và có đáng tin không?**
AI viết câu luyện cho từ bạn học và tra nghĩa khi từ điển chưa có. Câu trả lời của bạn được chấm theo đáp án định sẵn, nên kết quả công bằng và nhất quán. Thấy câu nào sai, bạn báo lỗi để đội Wordmet xem lại.
*Căn cứ: `Landing.plans.aiList.*`, câu FAQ số 6 hiện có, `App.practice.session.report.*`.*

**5. Gói Miễn phí và Pro khác nhau thế nào?**
Gói Miễn phí đủ để học hằng ngày: ghi từ, tra nghĩa, ôn thẻ và luyện tập. Pro dành cho người muốn luyện nhiều hơn, có AI viết câu luyện cho từng từ, tra bằng AI và không quảng cáo.
*Căn cứ: `Landing.plans.freeList.*`, `Landing.plans.proList.*`, `Landing.plans.aiList.*`.*

**6. Nghĩa và câu ví dụ trong Wordmet lấy từ đâu?**
Từ điển của Wordmet dựa trên các bộ dữ liệu có giấy phép mở, và mỗi nghĩa được đội Wordmet duyệt trước khi đến tay người học. Danh sách nguồn có ở trang Nguồn dữ liệu. Nghĩa do AI gợi ý luôn có nhãn riêng để bạn kiểm lại.
*Căn cứ: `Sources.intro`, quy trình duyệt nghĩa của admin và editor (`CLAUDE.md`, Bước 2 và đợt sửa Bước 0–3), `App.word.mine.aiLabel`, `App.word.mine.aiSource`.*

*Câu 6 cũ ("Dùng trên thiết bị nào, dữ liệu có được giữ không?") đã thay theo góp ý ngày 14/11. Ý "dữ liệu còn khi hết Pro" vẫn có ở `Landing.plans.lead` nếu bạn giữ chuỗi đó.*

## 4. Ba câu thanh toán chuyển đi đâu

| Câu hiện tại | Chuyển sang | Ở đó đã có gì |
|---|---|---|
| Gói Pro có tự gia hạn không? | Trang Gói học trong app | `App.plans.oneTime`, `App.plans.lead` đã nói "trả một lần, không tự gia hạn". |
| Mua thêm khi Pro còn hạn thì sao? | Trang Gói học | `App.plans.startsOn` đã nói kỳ mới bắt đầu khi kỳ hiện tại kết thúc. |
| Có được hoàn tiền không? | Trang Gói học và Điều khoản | `App.plans.noRefund` và `Legal.termsHelpBody` đã có. |

Không mất thông tin: trang Gói học đã có cả ba ý, người học thấy chúng ngay trước khi bấm mua.

## 5. Phần còn lại của landing nói về thanh toán

Các chuỗi này nằm trong `vi.json`, sẽ đưa vào vòng 2 nếu bạn đồng ý hướng "landing chỉ nói quyền lợi":

| key | hiện tại | hướng sửa |
|---|---|---|
| `Landing.plans.title` | Hai gói, không tự gia hạn. | Nói quyền lợi, ví dụ hai gói khác nhau ở mức luyện tập và AI. |
| `Landing.plans.lead` | Trả một lần cho mỗi kỳ. Hết kỳ, từ và lịch ôn của bạn vẫn còn. | Bỏ câu "trả một lần". Giữ ý "từ và lịch ôn vẫn còn" nếu muốn. |
| `Landing.plans.freeNote`, `Landing.final.note` | không cần thẻ thanh toán | Wordmet thu tiền bằng chuyển khoản, không dùng thẻ, nên câu này không có thông tin. Đổi thành "Miễn phí để bắt đầu". |
| `Landing.plans.periods.*`, `saving`, `best`, `perMonth`, `perMonthApprox` | Bảng chọn kỳ 1/3/12 tháng, % tiết kiệm, giá mỗi tháng | Cần bạn chốt: giữ một dòng giá "từ … mỗi tháng" hay bỏ hẳn giá khỏi landing như LadiPage. Bỏ hẳn thì phải sửa cả code của khối giá, không chỉ chữ. |
