# Flashcard Handoff Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** Cho animation lên thẻ mới bắt đầu đúng trạng thái của thẻ kế tiếp khi chấm.

**Architecture:** `CardStack` chụp computed style ở thời điểm chấm, gắn với ID của thẻ sắp lên. Layout effect chuyển trạng thái đó cho `arrive` khi đúng thẻ xuất hiện, rồi bỏ snapshot.

**Tech Stack:** Next.js, React, Web Animations API, Vitest và Chromium.

**Spec:** [Nối tiếp chuyển động khi đổi flashcard](../specs/2026-11-16-flashcard-handoff-design.md)

## Global Constraints

- Giữ curve và thời lượng 300 ms của animation lên thẻ mới, hiệu ứng tan của thẻ cũ và fade 140 ms khi bật reduced motion.
- Chỉ đọc style khi chấm hợp lệ và còn thẻ kế tiếp. Không đọc trong `pointermove`.
- Giữ logic ngưỡng vuốt, gửi đáp án, rollback và chống chấm trùng hiện có.

## Review Focus

- CSS transition của thẻ phía sau vẫn đang chạy lúc thả. Khung hình đầu tiên lấy computed style, không lấy giá trị inline đích.
- Bấm nút và phím đi chung đường chấm. Cả hai lấy trạng thái thẻ phía sau khi nó đang nghỉ.
- Cùng một frame có thao tác đổi thẻ hoặc rollback. Chỉ dùng snapshot một lần, khi ID thẻ khớp.
- Thẻ cuối, reduced motion và thao tác không chấm tiếp tục dùng luồng hiện có.

## Task 1: Nối giá trị đang hiển thị vào animation lên thẻ

**Files:** `apps/web/src/features/learner/review/{CardStack.tsx,useCardDrag.ts,card-stack.test.tsx}`, `apps/web/src/lib/stack-motion.ts`.

- [ ] Thêm regression test trong `card-stack.test.tsx` qua drag thành công và `CardStackHandle.rate`. Cho thẻ depth 1 trả ba computed style đại diện cho trạng thái trung gian hoặc trạng thái nghỉ. Kiểm tra khung hình đầu của thẻ mới nhận đúng cả ba giá trị, lần chấm vẫn phát một lần, và snapshot được bỏ khi thẻ khác trở lại. Tái sử dụng test reduced motion, thả dưới ngưỡng và rollback hiện có.
- [ ] Chạy `pnpm --dir apps/web exec vitest run src/features/learner/review/card-stack.test.tsx`. Mong đợi test mới thất bại vì khung hình đầu đang là 16 px, scale .92, blur 10 px và opacity .55.
- [ ] Thêm `ArrivalPose = { transform: string; filter: string; opacity: string }` và mở rộng `arrive(el: HTMLElement, from?: ArrivalPose): Promise<void>`. Dùng `from` cho keyframe đầu khi có, giữ fallback hiện tại khi thiếu snapshot, giữ nhánh reduced motion.
- [ ] Trong `CardStack`, giữ ref đến thẻ depth 1. Đọc computed style trước khi đổi state, chụp cùng ID thẻ kế tiếp, chuyển cho `arrive` nếu ID khớp, rồi xóa snapshot mỗi lần top ID đổi. Trong `useCardDrag`, với lượt chấm hợp lệ gọi handler trước khi reset tiến độ hiển thị.
- [ ] Chạy `pnpm --dir apps/web exec vitest run src/features/learner/review`, `pnpm --dir apps/web typecheck` và `pnpm --dir apps/web lint`. Mong đợi không có lỗi mới. So computed style và keyframe trong Chromium ở viewport mobile cho một lượt bấm và một lượt thả sau khi kéo. Nếu có Android thật, chạy thêm lượt tương ứng bằng Chrome remote debugging.
- [ ] Rà diff, kiểm tra secret theo quy tắc repo nếu có push, và commit tập tin của thay đổi trên branch riêng.
