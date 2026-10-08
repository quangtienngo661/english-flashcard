# UX copy review — landing page Wordmet (Task 2)

Ngày 08/10/2026. Soát theo skill `design:ux-copy` (plugin `design` 1.2.0; skill chưa được tải trong phiên nên trợ lý
đọc `SKILL.md` rồi làm theo). Phạm vi: chữ mới viết ở Task 2, toàn bộ chữ `Waitlist` và `Cloze`, cả VI và EN. Chữ trong
code (`apps/web/messages/*.json`) **vẫn giữ theo Figma**. Mọi mục dưới đây là đề xuất chờ chủ dự án chọn.

## Chữ mới trợ lý viết (cần duyệt)

| Key | VI | EN |
|---|---|---|
| `Cloze.items.assume.hint` | Gợi ý: nghĩ là đúng dù chưa kiểm tra. | Hint: believing something without checking it. |
| `Cloze.items.assume.explanation` | assume = cho rằng, mặc định là đúng (khi chưa kiểm chứng). | assume = to believe something is true without checking. |
| `Cloze.items.assume.translation` | “Đừng mặc định rằng ai cũng đã đọc email.” | VI: “Đừng mặc định rằng ai cũng đã đọc email.” |
| `Cloze.items.borrow.hint` | Gợi ý: bạn là người nhận đồ, không phải người đưa. | Hint: you're the one taking it, not giving it. |
| `Cloze.items.borrow.explanation` | borrow = mượn (lấy rồi trả lại). Còn lend = cho mượn. | borrow = to take something and give it back later; lend = to give it. |
| `Cloze.items.borrow.translation` | “Mình mượn sạc của bạn một lát được không?” | VI: “Mình mượn sạc của bạn một lát được không?” |
| `Cloze.prev` / `next` / `region` | Câu trước / Câu sau / Bài luyện thử | Previous sentence / Next sentence / Practice sample |
| `Waitlist.*` (EN) | — | Dịch từ bảng trạng thái VI |
| `Nav.skipToContent`, `Nav.languageLabel`, `Metadata.*`, `Legal.*`, `NotFound.*` | Mới | Mới |

Đổi so với Figma (ruling Task 2): đáp án nhiễu `presume` của câu `assume` đổi thành `assure`, vì "Don't presume that
everyone has read the email" cũng đúng, làm bài có hai đáp án.

## Đề xuất (chưa áp dụng)

| # | Vấn đề | Đề xuất | Lý do |
|---|---|---|---|
| C1 | **Cùng một khái niệm, nhiều cách gọi.** VI: "từ thường nhầm" (Hero, Plans), "từ bạn hay nhầm" (FAQ), "Sai 2 lần" (bước 3). EN: "words you miss", "words you often get wrong", "“often missed” list" | VI thống nhất "từ hay nhầm"; EN thống nhất "words you often miss" | Nhất quán: cùng một thứ thì cùng một tên |
| C2 | Câu hướng dẫn hai ngôn ngữ lệch nhau: VI "Chọn đáp án đúng", EN "Tap to choose the correct answer". "Tap" sai trên desktop | EN "Choose the correct answer" | Ngắn, đúng trên mọi thiết bị, khớp VI |
| C3 | Tên gói lệch: VI "Trải nghiệm AI", EN "AI trial" | EN "Try AI" hoặc VI "Dùng thử AI" | Hai ngôn ngữ nên cùng nghĩa |
| C4 | EN "Saving word + meaning only" đọc gượng | "Only the word and its meaning" | Tự nhiên hơn |
| C5 | Dấu "→" trong "Câu tiếp theo →" / "Next sentence →" | Bỏ "→" (skill `frontend-design` cũng nêu) | Chữ trên nút đã nói rõ hành động |

## Ghi chú dịch

Chữ EN dài hơn VI khoảng 15–30% ở mô tả và câu FAQ. Đã có test chống tràn chữ trên mobile ở Task 9 (`Review#5`,
`LP32`).
