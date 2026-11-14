# Plan: sửa các defect từ review Bước 1–8 (29/10/2026)

## Context

Review độc lập Bước 1–8 (PR #184, `docs/superpowers/reviews/2026-10-29-buoc-1-8-review.md`) không có phát hiện Cao, nhưng có một loạt defect
(code làm sai so với design hoặc sai hành vi) mà không cần chủ dự án quyết thêm. Plan này sửa đúng các defect đó.

**Chủ dự án đã chốt (29/10/2026):** không thêm e2e backend (hạ tầng không đáp ứng). Mọi test mới là unit test chạy bằng lệnh mặc định
(`vitest run`), không cần Docker hay DB. Sau khi duyệt plan, session chuyển sang model Sonnet để thực thi.

**Không nằm trong plan này** (cần quyết định hoặc không phải defect):
- B5-1 cấp lại Pro (Q10), B7-2 trần lời gọi AI (Q12), X-3 chặn provider giả (Q13), B2-2 sửa nguồn (Q15): chờ chủ dự án trả lời ở improvement plan §8.
- X-1 index `user_id` (R1), X-2 phần cần DB (R2), R4 bổ sung deploy-checklist, R12 sửa tài liệu lệch, R13 lưu bằng chứng: không phải defect, làm đợt khác.
- B2-6 (trần lượt job), B3-5 (race ngoài transaction), B5-5..B5-8: chỉ chứng minh được bằng DB thật hoặc là nhận định design; để lại.

## Cách làm chung

- 4 PR vào `dev`, mỗi PR một nhánh cắt từ `origin/dev`, gom các defect cùng vùng (mỗi PR một lượt CI).
- Mỗi defect là **2 commit**: `test(<scope>): …` (test đỏ, chạy thấy đỏ đúng lý do) rồi `fix(<scope>): …`. Hai việc chỉ thêm test (B2-1, B25-1) là 1 commit `test`.
- Test pin giá trị chính xác (theo `testing-boundaries.md`); frontend query theo role và text.
- Trước khi code: `pnpm install` trong worktree (chưa có `node_modules`), rồi `pnpm --filter api exec prisma generate --sql` theo `db:setup` nếu cần client.
- Task 0 (sau khi duyệt): lưu plan vào `docs/superpowers/plans/2026-10-29-sua-defect-review-buoc-1-8.md` và plan tóm tắt vào
  `docs/deliveries/sua-defect-review-buoc-1-8.md` (rule `plan-summaries.md`), commit ở PR 1.

## PR 1 — `fix/review-practice-ai` (scope `api`)

1. **B7-1 `current` tạo yêu cầu AI không ai chạy.** `apps/api/src/practice/sessions/sessions.service.ts`: truyền `build` vào `aiSlot` (`:511`);
   khi `!build` trả `{ state: 'preparing' }` thay vì tạo request (`:546`) hay trả `pending` (`:534`, `:544`); thêm `notice?` vào biến thể `preparing`
   của `Advance` (`:63`) và giữ notice ở `:460`. Mẫu đúng có sẵn: `pendingSlot` `:565`. Test đỏ trong `sessions.ai.spec.ts` khối `:347`:
   `pendingNotice = 'word-not-found'`, không có request → `current` phải trả `{ item: null, preparing: true, notice: 'word-not-found' }`,
   `t.requests` rỗng, `pendingAiRequestId` null, generator không chạy (design B7E64, B7E65).
2. **B7-3 bộ tạo câu không trả lượt khi `ai.run` ném lỗi.** `apps/api/src/practice/ai/ai-question-generator.service.ts:118-125`: bọc try/catch như
   `content/lookup/ai-lookup.service.ts:55-61` — `release` rồi `fail(request, 'ai-failed')` rồi rethrow. Spec `ai-question-generator.service.spec.ts`:
   thêm tùy chọn `throws` cho fake `ai` (`:64-72`), assert `t.calls` có `reserve`, `run:`, `release`, `failed:ai-failed` đúng thứ tự.
3. **B4-3 đáp án chứa U+0000 ra 500.** `apps/api/src/practice/answers/answers.controller.ts:16`: thêm `!text.includes('\0')` như mọi input khác
   (vd. `learning/quick-add/quick-add.controller.ts:16`), export schema. Test mới theo mẫu `quick-add.controller.spec.ts:13-17`.
4. **B6-2 `ai:fake-call` có thể gọi provider thật.** Tách điều kiện thành hàm thuần trong `apps/api/src/cli/ai-fake-call-args.ts`: từ chối khi
   `AI_FAKE_ENABLED` tắt **hoặc** có `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`; `ai-fake-call.ts:23-28` gọi hàm đó. Test trong `ai-fake-call.spec.ts`.
5. **B6-3 lưới che log.** `apps/api/src/common/logging/app-logger.ts:16`: thêm `context_sentence`. Đổi tên trường `code` ở
   `identity/google/google-auth.service.ts:323` thành tên không chứa "code" (vd. `db_error`) để log `google_sign_in_failed` không luôn bị che.
   Test trong `app-logger.spec.ts` (mẫu `:19-30`) và spec của google-auth.

## PR 2 — `fix/review-identity` (scope `api`)

6. **B2-1 lấy lại kiểm "mọi route admin có quyền".** Chỉ test: trong `apps/api/test/support/list-routes.spec.ts` (đã dựng app không cần DB, `:27-31`),
   thêm lại `auditAdminRoutes` từ file e2e đã xóa ở `420e93d` (`test/content/admin-permissions.e2e-spec.ts`); chạy trên **toàn bộ** controller của
   `AppModule`, assert danh sách route `/v1/admin/**` thiếu quyền là `[]` (trừ route đối chứng `__undeclared-control`), và assert audit báo đúng route đối chứng.
   Kiểm răng: tạm bỏ `@RequirePermission` một controller, thấy đỏ, hoàn lại.
7. **B25-1 test cho `password-change-required`.** Chỉ test: `apps/api/src/identity/staff/permission.guard.spec.ts` (mẫu `:66-71`):
   staff có `mustChangePassword: true` → 403 `password-change-required`; learner có cờ vẫn `forbidden`.
8. **B1-3 admin bị khóa do chạy đua; "admin cuối" đếm admin bị khóa.** `apps/api/src/identity/staff/staff.service.ts`: hai lệnh ghi thành `updateMany`
   có điều kiện (khóa: `status: 'active', staffRole ≠ 'admin'` ở `:303`; nâng vai trò: `status ∉ {locked, deleting}` ở `:362`), 0 dòng → lỗi luật hiện có;
   đổi phép đếm admin còn lại thành `status: 'active'` ở `:269`, `:358` và `identity/deletion/account-deletion.service.ts:111` (cùng một luật, ghi chú `:267`).
   Spec `staff.service.spec.ts` (mẫu `:41-60`).
9. **B1-4 / B25-3 CLI `admin:grant` bỏ qua `locked`/`deleting`.** `staff.service.ts:372-375`: thêm kết quả `locked` / `deleting`, không ghi gì;
   cập nhật thông báo CLI và `cli/admin-grant.spec.ts`. Mẫu test `staff.service.spec.ts:100-106`.
10. **B1-6 `password/reset` lộ email qua thời gian.** `apps/api/src/identity/auth/password.service.ts`: chuyển `hasher.hash` (`:103`) lên trước bước tra
    tài khoản (`:101`), để email không tồn tại cũng tốn một lần băm. Test trong bảng `password.service.spec.ts:184-194`: `hasher.hash` được gọi đúng 1 lần cho mọi lý do.
11. **B1-10 email `a@b` được nhận khi đăng ký.** Thêm hàm `isValidEmailSyntax` (domain có dấu chấm, không ký tự điều khiển) cạnh
    `common/email/normalize-email.ts`; chỉ gọi ở đăng ký (`identity/auth/auth.service.ts:42`) và tạo staff — **không** đổi `normalizeEmail`, để tài khoản cũ
    vẫn đăng nhập được. Test bảng trong `normalize-email.spec.ts`.
12. **B1-9 lỗi nhả `Idempotency-Key` bị nuốt.** `common/idempotency/idempotency.service.ts:76`: thêm `onReleaseFailed` vào options; interceptor
    (`idempotency.interceptor.ts`) inject logger và log `idempotency_release_failed` (không kèm key). Test theo mẫu `idempotency.service.spec.ts:185-191`.

## PR 3 — `fix/review-billing-mail` (scope `api`)

13. **B5-3 + UW-2 hoàn → hủy hoàn → hoàn lại cùng giao dịch.** Không migration. `entitlements/billing/event-applier.service.ts:128-136`: với `refunded`,
    bỏ qua lần hoàn cũ nếu đã có `refund_reversed` được áp dụng sau nó (index `(provider, environment, transaction_id)` có sẵn). `transactions.repository.ts`
    nhánh `refunded`: dòng `refund` đang `reversed` trở lại `succeeded`. Test: applier (mẫu `event-applier.service.spec.ts:388-397`) lần hoàn thứ ba
    `applied`, gói kết thúc `revoked`; repository (mẫu `transactions.repository.spec.ts:104-111`) kết quả `[['renewal','refunded'],['refund','succeeded']]`.
14. **B3-3 lỗi DB khi gửi thư bị coi là "có thể đã giao".** `notifications/provider/email.provider.ts`: chỉ bọc `mailer.send` và gắn nhãn lỗi gửi thư;
    `reminder-send.service.ts:67`: chỉ lỗi có nhãn mới phân loại theo `classifyMailError`, lỗi khác thì xóa dòng `sending` và ném lại. Spec mới
    `reminder-send.service.spec.ts` (mẫu mock của `entitlements/notices/notices.spec.ts:91-105`).
15. **B3-4 thử lại do SMTP tạm lỗi không có log.** `reminder-send.service.ts:80-82`: log `reminder_retry` (user_id, local_date, kind, lỗi) trước khi xóa dòng.
    Test trong cùng spec mới.

## PR 4 — `fix/review-learner-web` (scope `web`, `admin`)

16. **B8-2 "Đặt mật khẩu" của tài khoản chỉ có Google bị đưa về `/app`.** `apps/web/src/features/learner/auth/AuthGate.tsx:21-26`: thêm prop
    `allowSignedIn`; trang `forgot-password` và `reset-password` truyền prop này, nên người đã đăng nhập mở được. Test: render trang quên mật khẩu với phiên
    đã đăng nhập → `hardReplace` không được gọi, form hiện ra (query theo role).
17. **UW-1 email trong URL.** `ForgotPasswordForm.tsx:27` ghi email bằng `writePendingEmail` (`app-shell/session/pending-email.ts`), mở
    `/reset-password` không query; `ResetPasswordForm.tsx:26` đọc `readPendingEmail()`, có ô email dự phòng như `VerifyEmailForm.tsx:44-46`, xóa khi thành công.
    Sửa test hiện có `auth.test.tsx:404-425`.
18. **UA-1 bản tiếng Anh ghi trần 100 ví dụ.** `apps/admin/messages/en.json:409-410` → 1,000. Test: chuỗi en chứa số định dạng từ `BULK_MAX`.
19. **UW-5 số chưa định dạng.** `apps/web/messages/vi.json:725-726, 898-899` và khóa tương ứng ở `en.json`: `{added, number}`, `{already, number}`,
    `{full, number}`, `{missing, number}`, `{function, number}`. Test: truyền 1234, thấy `1.234`.
20. **B8-7 màn xóa tài khoản nói "lượt dùng" bị xóa.** `apps/web/messages/{vi,en}.json` khóa `App.deleteAccount.deleted.plans` → "Gói của bạn"; thêm
    một dòng ở phần "được giữ": số lượt đã dùng, không kèm tên (khớp `identity/deletion/account-data-map.ts:55`). Sửa `delete-account.test.tsx:45`.

Cuối PR 4: as-built ngắn nối vào `docs/deliveries/sua-defect-review-buoc-1-8.md`, và đổi trạng thái các mã đã sửa trong
`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md` §7b (R7–R10, R14) sang ✅/🟡 kèm số PR.

## Verification

- Mỗi commit `test`: chạy riêng file spec, thấy **đỏ đúng lý do**; commit `fix`: thấy xanh. Ghi output vào commit message hoặc as-built.
- Mỗi PR: `pnpm --filter <app> lint`, `typecheck`, `test` xanh ở local, rồi CI xanh (`api`, `web`, `admin`, `admin-e2e-real`) trước khi merge (merge không cần hỏi khi CI xanh).
- Chạy thật (không phải e2e mới), trên DB **mới** `english_learning_review_fix`, không đụng `english_learning`, AI giả, không key thật:
  - PR 1, PR 3: `pnpm smoke:buoc-7` (luồng câu AI) và `SMOKE_FETCH_STATE=true pnpm smoke:buoc-5` làm hồi quy; lưu output vào `docs/deliveries/`.
  - PR 2: `pnpm smoke:buoc-0-3-fixes` và `pnpm smoke:buoc-8` làm hồi quy.
  - PR 4: chạy web (`pnpm dev:app`, cổng 3001) + API với `GOOGLE_FAKE_ENABLED=true`, mở bằng browser pane: tài khoản chỉ có Google → Cài đặt →
    "Đặt mật khẩu" mở được trang, URL không có email; chụp màn hình. Kiểm chuỗi 1.000 ở admin (en).
- Cảnh báo đã biết: smoke trên máy này chậm và có thể đỏ do timeout; đỏ thì đọc output trước khi kết luận code sai.
