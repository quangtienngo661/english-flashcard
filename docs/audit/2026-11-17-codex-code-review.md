# Review code Codex viết trước khi ship (17/11/2026)

Phạm vi: các thay đổi **chưa commit** của hai thread Codex.

- Checkout chính, nhánh `codex/landing-copy-topic-alignment`: flashcard handoff, word-fit, dấu chấm hero.
- Worktree `~/.codex/worktrees/dev-security-audit` (`dev@e7acc0d9`, 31 file): AI lock, đối soát link, deletion journal.
- Commit `f70f4fd7` (Next.js 16.4.5) chỉ đổi `package.json` và lockfile, nên không review sâu.

Người review đọc toàn bộ diff, rồi chạy lại test trong phiên này.

## Kết quả tự chạy (17/11, 14:54)

| Nơi | Lệnh | Kết quả |
|---|---|---|
| web | `vitest run src/features/learner/review src/site/landing` | 7 files, **101 pass** |
| web | `pnpm typecheck`, `eslint` (các file đổi) | exit 0 |
| api (worktree) | `vitest run src/ai/runner src/entitlements src/identity/deletion src/cli/accounts-deletions.spec.ts src/common/config` | 75 files, **1.534 pass** |
| api (worktree) | `tsc --noEmit`, `oxlint src/ test/` | exit 0. Lint có 1 warning cũ ở `mail-dispatcher.service.ts`, không thuộc thay đổi này |

Chưa chạy: toàn bộ test suite, CI, smoke, browser check của word-fit, Android thật, R2 thật.

## Phát hiện

| # | Mức | Ở đâu | Vấn đề | Đề xuất |
|---|---|---|---|---|
| 1 | Trung bình | `call-ledger.service.ts`, `operations.repository.ts` | Bản sửa AI chuyển sang interactive transaction có chờ `pg_advisory_xact_lock` theo user nhưng không đặt `timeout`. Prisma 7.10.1 mặc định `maxWait 2s` và `timeout 5s` (đọc trong `@prisma/client/runtime`). Repo không đặt `transactionOptions`. Trong khi đó Tx B của luồng xóa giữ cùng khóa tối đa 120 s (`TX_B` ở `account-deletion.service.ts:39`). **Hệ quả (suy từ code, chưa tái hiện):** AI call kết thúc trong lúc Tx B còn chạy quá 5 s thì `record()` lỗi. Dòng chi phí của lần gọi provider đó không được ghi, nên số liệu chi phí và trần ngày bị thiếu. | Đặt `timeout` rõ ràng cho hai transaction này. Hoặc khi hết thời gian chờ khóa thì ghi dòng chi phí ẩn danh (`userId null`) thay vì ném lỗi. Thêm test cho trường hợp chờ khóa quá lâu. |
| 2 | Trung bình | `FitWord` trong `CardStack.tsx` | Word-fit **chưa được kiểm ở đâu cả**. Test chỉ assert class `whitespace-nowrap`, nên vẫn pass nếu không co chữ (jsdom không đo được layout). Browser check của Codex dừng giữa chừng do đăng nhập local. | Kiểm trên Chromium viewport mobile với `anthropologist`, một từ dài và một lần đổi kích thước, trước khi merge. |
| 3 | **Đã chốt 17/11: giữ 52 px, giữ thẻ phía sau mờ 5px như cũ** | `LightFront` | Chữ trên thẻ phía sau đổi từ `text-wm-lemma` (2,25 rem) sang `text-wm-section` (3,25 rem). Đây là thay đổi giao diện không ghi trong design, dù nó giúp hai thẻ cùng cỡ chữ khi chuyển. | Giữ (khớp cỡ chữ với thẻ trên) hoặc trả về 2,25 rem. |
| 4 | Thấp | `card-stack.test.tsx` | Spy `getComputedStyle` không được restore (repo không bật `restoreMocks`), và `delete Element.prototype.animate` nằm cuối test nên bị bỏ qua khi assert lỗi. Mock có thể rò sang các test sau trong cùng file. | Dùng `try/finally` hoặc `afterEach(() => vi.restoreAllMocks())`. |
| 5 | Thấp | `ai/runner/*` → `identity/user-lock.ts` | AI import thẳng helper của Identity, chạy `tx.user.findUnique` trong transaction của AI. Như vậy lệch quy ước D3 của repo: module khác gọi `IdentityService`, không đụng bảng Identity. Chính audit của Codex đã nêu boundary là một vấn đề. | Chấp nhận như ngoại lệ có ghi chú (cần cùng transaction và cùng khóa), hoặc đưa qua một hàm export của `IdentityService` nhận `tx`. |
| 6 | Thấp | `account-deletion.service.ts`, CLI replay | Dùng `config.billing.production` làm cờ "đang ở production" cho tính năng xóa tài khoản. Hai việc không liên quan bị buộc vào cùng một biến. | Ghi chú lý do, hoặc dùng cờ riêng. |
| 7 | Thấp | `orders-reconcile.service.ts` | Kiểm link khác nhau ở reconcile phần lớn trùng với `precheckPayment` (`link-mismatch`). Check đó trước đây bị vô hiệu vì reconcile luôn gửi link của chính đơn. Bản sửa đúng: giờ gửi link thật của provider. Check sớm có thêm hai lợi ích: chặn cả khi link đang `PENDING`, và có `reviewReason` riêng. | Giữ, không cần sửa. Đơn **không lưu link** vẫn nhận tiền từ bất kỳ link nào. Codex đã ghi đây là việc chưa làm. |
| 8 | Thấp | `CardStack.tsx` | Docstring của `LightFront` giờ nằm trên `FitWord`. | Chuyển lại chỗ cũ. |

## Đã kiểm, không thấy vấn đề

- **R2 hỗ trợ ghi có điều kiện mà journal dùng.** Trang S3 API của R2 (cập nhật 10/11/2026) liệt kê `If-None-Match` cho PutObject và trả `412 PreconditionFailed` khi điều kiện sai. Code đã tắt checksum mặc định của SDK (`WHEN_REQUIRED`); trang R2 không nói PutObject nhận header CRC, nên tắt là đúng. Vẫn chưa thử với bucket `delete-journal` thật.
- **Thứ tự Tx A → journal → Tx B.** Lỗi ghi journal trả 503, retry job dùng `resume` để ghi lại. Replay kiểm marker trước khi xóa. Ghi entry idempotent bằng conditional PUT. Replay chia lô 1.000.
- **Đăng nhập khi `deleting`.** `auth.service`, `credential-decision` và `session.service` đều chặn trạng thái `deleting`, nên tài khoản kẹt chờ journal không dùng tiếp được.
- **`claim()` trả `null` khi tài khoản đang xóa.** Runner hiểu là `in_progress` và không gọi provider. Đây là hành vi chấp nhận được.
- **Handoff flashcard.** Đọc computed style của thẻ `depth 1` lúc chấm, so `id` với thẻ kế tiếp, reduced motion giữ fade cũ, snapshot được xóa mỗi lần đổi thẻ. Đúng với design.

## Nhận xét chung về cách Codex viết code

- **Mạnh:**
  - Viết test trước khi sửa.
  - Có tài khoản đối chứng và chạy cả hai thứ tự khi thử race.
  - Chú thích nói lý do, không chỉ mô tả code.
  - Kiểm input bằng zod ở biên.
  - Ghi journal idempotent bằng conditional PUT, có timeout và retry cho R2.
  - Báo cáo trung thực phần chưa kiểm.
- **Yếu:**
  - Bỏ sót giới hạn của thư viện khi đổi kiểu transaction (#1).
  - Viết test cho thứ jsdom không đo được rồi coi là đã phủ (#2).
  - Đổi giao diện không nằm trong design (#3).
  - Tự tạo ngoại lệ module boundary trong khi audit của chính nó nêu boundary là vấn đề (#5).
  - Tài liệu audit, learning doc và script diễn tập nằm ở `~/.codex/visualizations`, ngoài repo. Session khác không thấy, và chúng không theo vào git.
