# M9: câu hỏi và trả lời của chủ dự án (11/11/2026)

**Trạng thái.** Part 9 chưa viết. Chủ dự án brainstorm Câu 1 (chi tiết) và Câu 2 sau khi M8 xong; plan viết sau buổi đó.

**Facts đã thu (11/11/2026, nhánh dài `aecb4475` sau PR #264, #265):**
- `GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-dark.md`: code chế độ tối (54/68 màu tối còn là màu sáng, không có bóng tối, quầng `.gcar-halo` gần trắng, `color-scheme: dark` chỉ có trong `dark.css`).
- `GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-checks.md`: từng dòng §13 và §14, thứ chặn PR cuối, CI, độ lệch với `dev`.
- `GIAO_DIEN_MOI_PLAN_DESIGN_FACTS_2026-11-11-m9-dark.md`: mockup tối `toi-5-man.html` (chưa duyệt, vẽ nền lưới chấm cũ), Figma không có khung tối, hai đề xuất mâu thuẫn.

## Trả lời

| Câu | Chủ dự án trả lời | Còn mở |
|---|---|---|
| 1. Đợt polish (25 chỗ lệch của audit 11/11, xóa `app-ui/`, bỏ token cũ) nằm ở đâu | Chia M9 làm hai: phần tối và kiểm thử, rồi đợt polish, rồi PR cuối vào `dev` | Chi tiết: brainstorm sau khi M8 xong |
| 2. Chế độ tối sửa theo bản nào | Vẽ bản tối trong artifact (HTML), để thấy cả motion; không vẽ trong Figma, vì lúc trước Figma lệch khá nhiều so với artifact đã chốt | Brainstorm lại sau khi M8 xong |
| 3. Chế độ tối phủ tới đâu | Mọi màn ("all"), cả trang công khai, đăng nhập, hộp thoại. Đồng ý đề xuất của Claude: chỉ vẽ bản tối cho các mẫu dùng chung (nền, card, hộp thoại, nút, màu nhóm, màu ngăn) và các màn có phần riêng; mọi màn kiểm bằng ảnh tối | — |
| 4. Bộ ảnh cuối chụp tới đâu | Mọi màn, bốn khổ 390, 768, 1024 và 1440, cả sáng và tối. Chủ dự án chọn ba khổ 390, 1024, 1440; nhận đề xuất của Claude thêm 768, vì design §3 (mục 4) và §15 ghi kiểm khoảng 768–1279 ở 768 và 1024, và M1 đã có lỗi chỉ hiện ở 768 (`768bccc2`) | Script chụp hiện chỉ chụp 390 và 1440; chỉ `gm-m1` có ảnh tối |
| 5a. Script giữ trong repo hay chạy tay một lần (so dung lượng JS, khóa chữ không dùng, Lighthouse, Schema Markup Validator) | Viết script giữ lại trong repo, chạy lại được bằng một lệnh, có thể cho CI chạy trên mỗi PR | Bước nào vào CI: chốt khi viết Part 9 |
| 5b. Đo số khung hình trên điện thoại thật | Chủ dự án có máy và tự đo; truy cập qua bản deploy tạm hoặc chung mạng Wi-Fi với máy tính | Chưa kiểm cách nào chạy được: API chưa deploy và web gọi API theo một địa chỉ cố định (`ASSUMPTION`: phải đổi sang IP máy tính trong mạng LAN). Web chạy trên Cloudflare Workers, không phải Vercel |
| 6. Tách file chữ `messages/{vi,en}.json` (mỗi file khoảng 82 KB, 1.497 câu) thành nhiều file | Chưa tách. Tách khi chủ dự án chỉnh lại câu chữ | Gửi cho trình duyệt chỉ phần chữ trang cần (`AppIntl.tsx` đang gửi cả nhóm `App`, khoảng 59 KB chưa nén): Claude đề xuất làm cùng lúc với việc tách file; chưa chốt |

## Ghi chú cho Part 9

- Thứ chặn M9: M8b (đang làm M8.5), M8c (chờ chủ dự án duyệt khung Figma favicon, ảnh chia sẻ).
- Design §5.7: Tùy chỉnh phiên (`use-practice-starter.tsx:15`) và Giới thiệu Pro (`(member)/layout.app.tsx:6`) đang import tĩnh; M9 chuyển sang tải sau (`next/dynamic`), như Thêm từ, Lịch, Ngày đã làm.
- Script tìm khóa chữ không dùng (câu 5a) đọc hai file `vi.json`, `en.json` như hiện có. Khi tách file (câu 6) thì sửa script theo.
- `dev` không có required check: merge PR cuối phải hỏi chủ dự án trước (`~/.claude/rules/git-conventions.md`).
- Design (§7.1, §9 M9, §14) và delivery record (mục "việc dọn chuyển sang đợt polish") đang ghi đợt polish "trước M9" (QM8-9): sửa theo Câu 1 khi viết Part 9.
