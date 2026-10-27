# Product

<!-- impeccable:product-schema 1 -->

> Viết bởi `/impeccable init` ngày 26/10/2026 **từ bằng chứng trong repo** (CLAUDE.md, design các Bước, bản chữ giao diện), chưa qua
> vòng phỏng vấn chủ dự án. Mọi mục dưới đây là **chờ chủ dự án xác nhận**; chỗ nào sai, sửa thẳng file này.

## Platform

web

(Ứng dụng điện thoại Flutter dùng chung API là sản phẩm riêng, chưa làm; file này nói về web `apps/web`.)

## Users

- **Người học** người Việt (ngôn ngữ mẹ đẻ `vi`, giao diện có cả `en`), từ 13 tuổi, học từ vựng tiếng Anh theo trình độ CEFR (A1–C2) và chủ đề.
  Hai tình huống chính: ngồi ôn và luyện mỗi ngày theo lịch (máy tính hoặc điện thoại), và gặp một từ lạ ở ngoài (phim, bài báo, công việc)
  rồi thêm nhanh vào nhóm của mình kèm câu đã gặp.
- **Đội Wordmet** (`admin`, `editor`) soạn, duyệt nội dung và cấp gói ở `apps/admin`; không phải đối tượng của `apps/web /app`.

## Product Purpose

Học từ vựng theo nhóm và ôn đúng lúc: catalog có sẵn theo trình độ và chủ đề, cộng từ người học tự thêm; thẻ ôn theo ngăn Leitner tự xếp
lịch; luyện tập không cần AI (trắc nghiệm, đúng/sai, gõ từ) và có AI (điền từ vào câu, chọn nghĩa trong câu, trắc nghiệm theo câu) chấm bằng
quy tắc. Thành công = người học quay lại mỗi ngày và nhớ được từ đã gặp.

## Positioning

"Gặp từ ở đâu cũng thêm được": từ gặp ngoài đời đi thẳng vào nhóm cùng câu đã gặp, rồi vào lịch ôn và câu luyện AI viết quanh chính câu đó.
Câu AI được chấm bằng quy tắc (không để AI chấm), và lượt AI tính theo gói minh bạch.

## Operating Context

- Gói Miễn phí (3 phiên luyện mỗi ngày, ôn thẻ không giới hạn), Dùng thử, Pro (lượt câu AI, lượt tra AI). Gói Pro chưa mở bán; chưa có cổng
  thanh toán thật.
- Ngày giờ theo múi giờ IANA của người học; số, ngày, tiền theo `Intl` vi-VN.
- App `/app` chưa mở cho người dùng thật cho tới Deploy (trước launch).

## Capabilities and Constraints

- Thuật ngữ cố định: bảng §2 và §17.2 của `docs/mockups/2026-10-21/ban-chu-giao-dien.md` (nhóm/deck, thẻ, ôn/review, luyện tập/practice,
  phiên, câu, lượt câu AI, lượt tra AI, Từ của tôi, câu đã gặp, dạng chia, ngăn).
- Luật chữ: §1 và §3 của bản chữ (gọi "bạn", không "Vui lòng" trên nút, lỗi = chuyện gì + làm gì tiếp, không "!", "…" một ký tự).
- Màu chỉ khai báo ở `packages/design-tokens` (sáng và tối); chữ giao diện ở `apps/web/messages/{vi,en}.json`.

## Brand Commitments

- Tên **Wordmet**. Hướng thiết kế **B** (chủ dự án chốt 15/10/2026): xanh `primary`, vàng `accent`, nền xanh than `navy` cho thanh trên của
  app người học, gờ phẳng ("ledge") thay bóng mềm, font Lexend (có tiếng Việt). Figma `7HcPAKLrWu32C27qYMJUOA` là khung đã duyệt.
- Giọng: thân thiện, ngắn, không phóng đại; app tự gọi "Wordmet", không "chúng tôi".

## Evidence on Hand

- Dữ liệu mẫu: `apps/api/scripts/fixtures/learner-sample.csv` (303 nghĩa); bộ CEFR-J thật cho nội dung (mục tiêu 8.812 từ).
- Chưa có người dùng thật, chưa có testimonial, chưa có số liệu giữ chân. Không bịa những thứ này.

## Product Principles

1. Mỗi ngày làm được việc chính trong vài giây: mở app thấy ngay nhóm nào cần ôn, ôn xong là xong.
2. Từ của người học là trung tâm: thêm nhanh, giữ câu đã gặp, không mất dữ liệu khi mạng chập chờn.
3. Nói thật về giới hạn: hết lượt, AI lỗi, gói chưa mở bán đều nói rõ chuyện gì và làm gì tiếp.
4. Hai ngôn ngữ, hai chế độ màu, điện thoại và máy tính đều là bản chính, không bản nào là phụ.

## Accessibility & Inclusion

- WCAG 2.1 AA: cặp màu tương phản kiểm bằng test (`apps/web/src/styles/tokens.test.ts`); e2e mỗi mốc chạy axe và kiểm không cuộn ngang ở 390px.
- Phím tắt cho người dùng máy tính (lật thẻ Space, trả lời 1–4, gợi ý H, thêm từ N).
