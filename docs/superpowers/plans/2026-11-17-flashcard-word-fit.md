# Flashcard Word Fit Implementation Plan

**Goal:** Giữ từ ở mặt trước flashcard trên một dòng, tự thu nhỏ theo chiều rộng có sẵn.

**Spec:** [Chữ một dòng trên mặt trước flashcard](../specs/2026-11-17-flashcard-word-fit-design.md)

**Scope:** `apps/web/src/features/learner/review/CardStack.tsx`, helper và test cần thiết cho đo chữ.

- [ ] Viết regression test cho từ dài, từ ngắn và thay đổi kích thước. Kiểm tra text giữ nguyên và cỡ chữ không vượt mức cũ.
- [ ] Đo sau khi layout và font sẵn sàng, theo dõi thay đổi kích thước, cleanup observer khi thẻ rời màn hình. Áp dụng cùng cách cho thẻ trước và thẻ xem trước.
- [ ] Chạy test liên quan, typecheck, lint, và kiểm tra từ thật bằng Chromium ở viewport điện thoại. Ghi rõ nếu chưa đo Android.
