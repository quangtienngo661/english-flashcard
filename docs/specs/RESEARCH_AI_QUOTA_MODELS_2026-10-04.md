# Research: cách các sản phẩm giới hạn lượt dùng AI — 04/10/2026

Phục vụ decision K18 (cấu trúc hạn mức) trong [SPEC_PLAN_AND_DECISIONS_2026-10-04.md](SPEC_PLAN_AND_DECISIONS_2026-10-04.md).
Câu hỏi của bạn: người dùng và cộng đồng nghĩ gì về hạn mức AI, và các sản phẩm mô tả cách triển khai ra sao.

**Nhãn:** **Đã đọc (chính thức)** = đọc ở trang của chính nhà cung cấp ngày 04/10/2026. **Đã đọc (cộng đồng)** = đọc
bài đăng diễn đàn ngày 04/10/2026 (qua công cụ tóm tắt trang, chưa đọc nguyên văn). **Thứ cấp** = chỉ thấy trong kết quả
tìm kiếm hoặc trang bên thứ ba, chưa đối chiếu nguồn gốc. **Suy luận** = của trợ lý.

## 1. Các kiểu hạn mức đang được dùng

| Kiểu | Ví dụ | Mức chắc chắn |
| --- | --- | --- |
| Hạn mức theo thời gian, hết thì chờ hoặc nâng gói hoặc mua thêm credit | Claude: "wait for it to reset, upgrade your plan, or purchase usage credits"; lượng dùng phụ thuộc độ dài và độ phức tạp hội thoại, model, tính năng; trang không nêu lịch reset cụ thể | Đã đọc (chính thức): [Claude, usage and length limits](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work) |
| Cửa sổ trượt | ChatGPT gói Free: giới hạn tin nhắn trong cửa sổ 5 giờ, hết thì chuyển sang model nhỏ | Thứ cấp (trang chính thức trả 403): [tóm tắt bên thứ ba](https://ai-toolbox.co/chatgpt-management-and-productivity/chatgpt-limits-messages-tokens-rate-2026) |
| Hạn mức theo tháng, reset theo ngày thanh toán, hết thì **tạm dừng** | Figma: "AI usage pauses once the limit is reached"; credit reset đúng ngày thanh toán của team, không phải mùng 1 | Đã đọc (cộng đồng, trả lời của nhân viên hỗ trợ): [Figma forum](https://forum.figma.com/ask-the-community-7/ai-credits-what-happens-when-we-reach-the-limit-51476) |
| Số lượt dùng thử cố định, tạm dừng khi hết, chờ làm mới hoặc dùng credit | Notion: Free/Plus có "a limited number of complimentary AI responses"; hết thì "temporary pause" | Đã đọc (chính thức): [Notion help](https://www.notion.com/help/notion-ai-faqs). Con số "20 lượt, không reset" chỉ có ở trang bên thứ ba (Thứ cấp) |
| Cấp credit theo từng "grant" có hạn dùng, sổ ghi bất biến | Stripe Billing credits: grant có `effective_at`, `expires_at` (mặc định **không hết hạn** nếu không đặt), `priority`, nhóm `promotional`; thứ tự dùng: priority, rồi hạn dùng sớm hơn, rồi promotional; mỗi grant có sổ append-only; tối đa 100 grant chưa dùng mỗi khách | Đã đọc (chính thức): [Stripe, billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits). Lưu ý: tính năng này gắn với hóa đơn theo meter, ta chỉ mượn mô hình |
| Trần theo ngày với đơn vị nhỏ | Một app gia sư AI trên App Store: người dùng Free tối đa 3 tin nhắn mỗi ngày | Thứ cấp (kết quả tìm kiếm, chưa mở trang) |
| Năng lượng hồi dần | Duolingo "energy" thay "hearts": 25 đơn vị, hồi theo thời gian; có khảo sát cộng đồng hơn 11.000 người, gần một nửa không thích | Thứ cấp (bài viết bên thứ ba; số liệu khảo sát chưa kiểm chứng) |

## 2. Người dùng và cộng đồng phàn nàn điều gì

Cộng đồng (Đã đọc, qua tóm tắt): [diễn đàn Google AI Studio](https://discuss.ai.google.dev/t/daily-usage-limits-for-models-in-ai-studio/185935) và diễn đàn Figma ở trên. Các điểm lặp lại:

1. **Không thấy mình đã dùng bao nhiêu.** Người dùng xin số đo rõ ràng thay cho nhãn mơ hồ như "high/higher".
2. **Chi phí mỗi lượt không đoán được.** Hội thoại dài chạm giới hạn nhanh hơn hội thoại ngắn; ở Figma một thao tác nhỏ tiêu nhiều credit khiến giá bị coi là quá đắt.
3. **Khóa bất ngờ.** Người trả tiền bị chặn sau vài lượt; nghi do hệ thống phân loại nhầm gói.
4. **Đổi quy tắc giữa chu kỳ** làm người dùng bị khóa mà không báo trước (Thứ cấp, từ kết quả tìm kiếm).
5. Với cơ chế hồi dần kiểu Duolingo, phàn nàn chính là học bị biến thành "quản lý năng lượng" (Thứ cấp).

## 3. Suy luận cho app này

- Mọi phàn nàn trên đều tránh được vì **đơn vị của ta cố định và rẻ để giải thích**: một câu hỏi AI sinh thành công = một lượt, không phụ thuộc độ dài hội thoại.
- Spec nên yêu cầu: người dùng **thấy số lượt còn lại và thời điểm hết hạn**; hết hạn mức thì báo rõ và vẫn học được phần không AI; đổi con số hạn mức không làm mất lượt đã cấp.
- Mô hình **grant** (mỗi lần cấp là một dòng: người dùng, feature, số lượt, hiệu lực từ–đến, nguồn) phù hợp hơn "cửa sổ theo ngày/tháng" khi bạn chưa biết số liệu: trial = một grant 14 ngày; Pro = grant theo tháng; cấp thêm cho người thử nghiệm = một grant mới (thay luôn `admin_grant`). Số lượt còn lại = tổng grant còn hiệu lực trừ lượt đã dùng, dùng grant sắp hết hạn trước (cùng thứ tự ưu tiên Stripe mô tả).
- Một **trần chi tiêu AI toàn hệ thống mỗi ngày** (ngắt khi chạm trần) bảo vệ ví của bạn trong pilot, độc lập với hạn mức từng người.
- Chưa có số liệu để đặt con số: pilot nên cho trial hào phóng và ghi lại số câu mỗi người mỗi ngày, rồi đặt Pro theo phân vị cao (ví dụ p90). Đây là kế hoạch, không phải kết quả.

## 4. Chưa đọc

- Trang chính thức của OpenAI (403) và của Duolingo; số liệu ChatGPT, Notion "20 lượt", Duolingo energy chỉ ở mức thứ cấp.
- Diễn đàn được đọc qua công cụ tóm tắt, không phải nguyên văn; một ngày tháng trong bản tóm tắt diễn đàn Google không được dùng vì không đối chiếu được.
- Chưa tìm được mô tả triển khai bên trong (kiến trúc nội bộ) của các sản phẩm này; chỉ có hành vi công bố ra ngoài và mô hình Stripe.
