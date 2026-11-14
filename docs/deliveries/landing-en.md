# Landing tiếng Anh — plan tóm tắt (14/11/2026)

Nhánh `feat/landing-en` từ `origin/dev`. Quy tắc L4 của design landing-redesign ("chưa dịch thì `/en` về `/vi`") bị đảo.

1. Dịch 213 key `Landing` trong `messages/en.json`, theo quy ước EN của vòng chữ 2 ("deck", "Correct" / "Incorrect", "CEFR level").
2. Viết 6 câu FAQ tiếng Anh trong code (chủ dự án chọn phương án A, 14/11/2026), thay cho FAQ của admin ở `/en`.
3. Định dạng giá và tên gói trong JSON-LD theo ngôn ngữ.
4. Thêm `'en'` vào `LANDING_LOCALES`, bỏ redirect `/en` → `/vi`; hreflang và sitemap có `/en`.
5. Thêm link đổi ngôn ngữ ở footer.
6. Sửa test và e2e đang ghim hành vi cũ, thêm test cho trang tiếng Anh.

# Landing tiếng Anh — as-built (14/11/2026)

- `/en` trả 200 landing tiếng Anh đầy đủ. `landingLocaleRedirect` và đoạn redirect trong `proxy.ts` đã xóa; `LANDING_LOCALES = ['vi', 'en']` điều khiển hreflang (`vi`, `en`, `x-default`) và sitemap (`/vi`, `/en`).
- Chữ: `Landing` EN dịch hết. Nghĩa trong thẻ demo ("giảm nhẹ", "phân bổ"…) giữ tiếng Việt, vì app hiện nghĩa tiếng Việt cho từ (ASSUMPTION, chưa kiểm trên App EN). Test `copy.test.ts` pin: chỉ 18 chuỗi `meaning` còn chữ Việt.
- FAQ: `landing-faq.en.ts`, 6 câu cùng thứ tự với bản dự phòng tiếng Việt. Admin sửa FAQ chỉ đổi bản `/vi`. Muốn admin sửa cả hai ngôn ngữ thì thêm cột `question_en` / `answer_en` (phương án B của câu hỏi 14/11, chưa làm).
- Giá: vẫn VND. `/vi` viết "79.000 ₫", `/en` viết "₫79,000", cùng cách `createFormat(...).money` của app. JSON-LD: "Free", "Pro 3 months".
- Footer: link "English" ở `/vi`, "Tiếng Việt" ở `/en` (về trang chủ của ngôn ngữ kia). Header chưa có bộ chọn.
- Anchor `#nhom-tu`, `#cach-hoc`, `#gia`, `#hoi-dap` giữ nguyên ở cả hai ngôn ngữ.
- Hệ quả: người có tín hiệu tiếng Anh mở `/` giờ dừng ở `/en` (trước đây tới `/vi`).
