# Review độc lập Bước 6 (AI gateway) và Bước 7 (Practice AI + Content AI) — 29/10/2026

Reviewer chỉ đọc code (không sửa, không commit, không chạy migration, không gọi AI provider thật). Nhánh `docs/review-buoc-1-8` @ `867d385`
(cắt từ `origin/dev`). Đường dẫn code dưới đây tính từ `apps/api/src/` trừ khi ghi khác.

**Giới hạn của lần review này:** không chạy unit test (worktree không có `node_modules`, cài là thay đổi môi trường); bằng chứng test lấy từ CI
trên GitHub (`gh`) và các file output đã commit. Không chạy smoke. Không có DB.

Mức: **Cao** (lỗ bảo mật, sai tiền/lượt, mất dữ liệu, quyền sai, tài liệu hứa điều code không làm ở chỗ quan trọng, có kịch bản hỏng cụ thể),
**Vừa**, **Thấp**.

---

## (a) Bảng "Xong khi"

### Bước 6 (design §17)

| # | Mục | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | CI xanh trên mọi PR (#82, #84–#94) | **Verified** | `gh pr list --state merged --json number,statusCheckRollup` → #82–#94 đều `SUCCESS,SUCCESS,SUCCESS,SUCCESS` (4 job) |
| 2 | `pnpm smoke:buoc-6` qua API + worker thật, DB mới, bản giả, hai lần (B6#1–B6#30) | **Verified** (20/10) | `docs/deliveries/buoc-6-smoke-output.txt:114` và `:221` "Smoke Bước 6 passed … (32 steps)"; chạy lại 21/10 (`buoc-7.md:103-105`) và 29/10 (`buoc-8.md:115`, chỉ có dòng bảng, không có file output của lần chạy lại) |
| 2a | B6#19, B6#26 (adapter OpenAI/Anthropic, phản hồi mẫu) | **Chỉ unit** | `buoc-6-smoke-output.txt:77` "B6#19 and B6#26 are unit tests … skipped here"; test có ở `ai/adapters/openai/openai.adapter.spec.ts:49,214`, `ai/adapters/anthropic/anthropic.adapter.spec.ts:50,190` (assert `store:false`, không `metadata`/`user`/`safety_identifier`) |
| 2b | B6#25 editor 403 mọi route §12.1 | **Verified cho 21 route lúc 20/10**; route thêm sau chỉ có unit metadata | Smoke: `scripts/smoke-buoc-6.mjs:498-518` (21 route). Route thêm sau (`POST eval/examples/bulk`, `POST eval/runs/:id/cancel`, `DELETE eval/runs/:id`, `GET test-quota`) không có trong smoke; chỉ được giữ bởi `ai/api/admin-ai-eval.controller.spec.ts:54-62`, `admin-ai-reports.controller.spec.ts:40-45` ("every route requires settings.manage") |
| 3 | Adapter thật (D19: không gọi thật trong "Xong khi") | **Configured, không verified trong Xong khi** | design §17.3, `buoc-6.md:154-155`. Sau đó: lần gọi thật đầu tiên 28/10 (Anthropic `claude-haiku-5-5`, thử `lookup_word`) **chỉ do chủ dự án ghi** ở `docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md:24`; không có file as-built hay output; PR #160 chỉ chứa file improvement plan (`gh pr view 160 --json files`). **OpenAI chưa từng gọi thật.** Các nhánh lỗi thật (429/402/529, câu "You have reached your specified…") chưa gặp thật |

### Bước 7 (design §18)

| # | Mục | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | CI xanh trên mọi PR (#104–#116) | **Verified** | `gh pr list …` → #104–#116 đều `SUCCESS` ×4 |
| 2 | `pnpm smoke:buoc-7` hai lần trên DB mới (AC1–AC12, Review Focus 1–5, B7E57/60/117/98) | **Verified** (21/10) | `docs/deliveries/buoc-7-smoke-output.txt:105` "passed in 139s (30 steps)" và lần 2; chạy lại 29/10 "qua, 30 bước, sau khi sửa một khẳng định cũ (R18)" (`buoc-8.md:116`) |
| 3 | `smoke:buoc-4`, `smoke:buoc-5` (2 chế độ), `smoke:buoc-6` vẫn qua | **Verified theo as-built** (không có file output riêng cho lần 21/10) | `buoc-7.md:103-105`; lần 29/10: `buoc-8.md:113-116` |
| 3a | Ca chỉ có unit, smoke chưa đi qua | **Chỉ unit** | `buoc-7.md:151-153`: B7E5/B7E6, B7E11, B7E12/B7E33, B7E13/B7E14, B7E20, B7E40, B7E61/B7E125, B7E74, B7E77, B7E106/B7E108, B7E110/B7E119, B7E122, B7E126–B7E129. Thêm từ review này: **B7E64/B7E65 khi `current` chạy sau một câu bị void** (xem B7-1) |
| 3b | Review Focus 2 (máy chủ chết giữa lần tạo) | **Giả lập** | `buoc-7.md:154`: lùi `updated_at` bằng `psql`, không tắt tiến trình thật |
| 4 | Không gọi AI thật (D3) | **Configured** | như Bước 6 mục 3; 3 thao tác mới (`generate_meaning_question`, `generate_sentence_mcq`, `check_private_word`) chưa có bằng chứng gọi thật nào trong repo |

---

## (b) Mục mở (as-built ghi "chưa làm", `ASSUMPTION`, rủi ro) — còn mở không, theo dõi ở đâu

| Mục | Nguồn | Còn mở? | Theo dõi ở |
|---|---|---|---|
| Chưa gọi thật / chất lượng câu và tỉ lệ luật loại chưa đo | `buoc-6.md:154`, `buoc-7.md:149`, design B6 §19, B7 §20 | Mở một phần (Anthropic 1 thao tác 28/10) | `IMPROVEMENT_PLAN` B1, B4, B11, Q7 |
| `CLAUDE.md` còn ghi "never called for real yet" / "No real AI call yet" | `CLAUDE.md:44`, `CLAUDE.md:59` | Mở | `IMPROVEMENT_PLAN` A5 (ghi rõ chờ file as-built lần gọi thật) |
| Mã lỗi OpenAI khi model không tồn tại lúc gọi (`ASSUMPTION` 404) | design B6 §4.3, `buoc-6.md:155` | Mở | Không có mục riêng; chỉ lộ khi làm B1/Q7 với OpenAI |
| Không trần tiền (D10), token trống = không giới hạn (D25) | design B6 §19 | Mở (quyết định) | `deploy-checklist.md:87-89` (giới hạn chi trên trang provider) |
| Hàng đợi đếm theo tiến trình; 50 > Anthropic tier Start (~40) | design B6 §18 "Deploy", §19 | Mở | **Không có** trong `deploy-checklist.md` (tìm `max_concurrent`, `hàng đợi`: 0 dòng) → B6-1 |
| Privacy Policy ghi việc gửi từ riêng / câu cho OpenAI, Anthropic (F29, SR15); điều khoản dữ liệu (F30); OpenAI under-18 / ZDR; Anthropic giữ dữ liệu 30 ngày với Fable/Mythos | design B6 §18 "Trước khi ra mắt", §19 | Mở | **Không có** → B6-1 |
| Riêng tư Bước 7: staff thấy từ riêng khi báo lỗi (D26), danh sách dạng chưa biết lộ chữ từ riêng (D15), câu Lan gặp gửi provider (D20) | design B7 §20 | Mở | **Không có** → B6-1 |
| Luật sư xem chữ màn gói "300 câu AI" | design B7 §19, §20 | Mở | Không có trong `deploy-checklist.md` |
| Hiệu năng mở phiên (một query mỗi từ, tối đa 50) | `buoc-7.md:150` | Mở | Không có → B7-5 |
| `reason_label` theo ngôn ngữ người học (`ASSUMPTION`) | `buoc-7.md:143` | Mở, nhỏ | Chỉ ở as-built |
| Dạng chia đã nhận bị **ẩn** chứ không xóa (lệch design §10, B7E96) | `buoc-7.md:145` | Đã chấp nhận | As-built + design §2 as-built |
| Nhãn "AI gợi ý" mất chỉ khi sửa có revision (lệch §11.2) | design B7 §2 as-built #3 | Đã chấp nhận | Design |
| "Chưa có giao diện (D2)" | `buoc-7.md:156` | **Đã đóng** (giao diện người học và admin đã có), as-built chưa sửa câu này | — |
| Eval chạy tới 1000 ví dụ mỗi thao tác (từ #165) đếm vào trần lời gọi chung với người học | `ai/ai.constants.ts:35`, `ai/runner/call-ledger.service.ts:45-48` (đếm mọi `purpose`) | Mở | Một phần ở `IMPROVEMENT_PLAN` B1 ("đặt trần lời gọi trong ngày chạy"), B5 ("judge ăn vào trần") |
| Trần lời gọi đếm không khóa, có thể vượt bằng số lời gọi đang chạy (B6E90) | design B6 §8.5 | Mở, đã chấp nhận | Design; unit `ai/runner/readiness.service.spec.ts:132` |

---

## (c) Phát hiện

### Spot-check đã làm và **không** thấy lỗi (để người đọc biết đã nhìn)

- **Quyền:** mọi controller `ai/api/*` gắn `@RequirePermission('settings.manage')` ở mức class, không route nào ghi đè
  (`grep RequirePermission ai/api/*.ts`: chỉ dòng class, trừ dashboard `ai.view` ở `ai/api/admin-ai-dashboard.controller.ts:11`). Guard đọc
  `getAllAndOverride([handler, class])` (`identity/staff/permission.guard.ts:22-24`). Editor không chạm được model/operation/prompt/eval/costs/calls.
  `ai.view` của editor gồm cả tiền là chủ ý (`identity/identity.types.ts:16` "money included").
- **Trừ lượt một lần cho một chỗ:** mã thao tác = id `practice_ai_requests` (`practice/ai/ai-question-generator.service.ts:109,119`); cổng AI chỉ cho
  một lời gọi mỗi `(user_id, operation_id)` bằng `INSERT … ON CONFLICT DO NOTHING` (`ai/runner/operations.repository.ts:43-50` theo dòng file) và
  ghi/xóa có điều kiện `attempt_id`; `in_progress` không release (`ai-question-generator.service.ts:127`); H khóa dòng yêu cầu `FOR UPDATE`
  (`practice/ai/ai-requests.repository.ts:65-80`); G có điều kiện con trỏ (`practice/sessions/sessions.service.ts` hàm `attach`). Bước 5 `confirm`
  idempotent (`entitlements/usage/usage-ledger.service.ts:108-109` `already-confirmed`), `release` không đụng dòng đã confirmed.
- **Hoàn lượt khi báo lỗi được xác nhận đúng một lần:** `refund` kiểm dòng `credit` theo `(user, pool, operation_id)` trong khóa pool
  (`entitlements/usage/usage-ledger.service.ts:144-147`), INSERT `ON CONFLICT DO NOTHING`; Practice chỉ gọi khi `ai_charged` và lý do `refundable`
  (`practice/reports/refunds.ts:14-17`, `practice/reports/reports.service.ts:229-240`); job mỗi giờ thử lại `refunded = null`
  (`practice/maintenance/practice-cleanup.service.ts:61-65`).
- **Replay 24 h:** `find` xóa dòng hết hạn trước khi đọc (`ai/runner/operations.repository.ts` hàm `find`), lỗi cấu hình không lưu
  (`ai/runner/run-rules.ts:76-84`), job mỗi giờ dọn (`ai/maintenance/ai-maintenance.ts:26-28`).
- **D29:** `common/config/app-config.ts:246-259` từ chối khởi động khi `*_CUSTOM_HEADERS` khác rỗng; mọi entrypoint gọi `loadConfig(process.env)`
  (`main.ts:12`, `worker.ts:10`, `cli/ai-fake-call.ts:22`, `cli/run-maintenance.ts:14`, …); test `common/config/app-config.spec.ts:357`.
  `baseURL` viết cứng (`ai/adapters/openai/openai.adapter.ts:17`, `ai/adapters/anthropic/anthropic.adapter.ts:21`).
- **API key:** chỉ đi từ config vào client (`ai/adapters/adapters.registrar.ts:17-19`); status chỉ trả boolean (`ai/reports/reports.service.ts:134-142`);
  lỗi chỉ lưu `err.code ?? err.type` (`ai/adapters/openai/openai-errors.ts:40`); lỗi job eval chỉ lưu tên + mã (`ai/eval/eval-job.ts` hàm `oneLine`).
- **Prompt injection:** dữ liệu người học chỉ đi trong message `user` dạng JSON, lời dặn + câu chặn ở `system`/`instructions`
  (`ai/adapters/anthropic/anthropic-request.ts:19-20`, `ai/adapters/openai/openai-request.ts:19-20`, `ai/prompts/prompt-rules.ts:9,40-53`); đầu ra qua
  kiểm khuôn của cổng và luật ngữ nghĩa của Practice.
- **Nội dung 7 ngày:** job `ai.contents-expire` (`ai/maintenance/ai-maintenance.ts:29-30`), `GET calls` lọc `expiresAt > now`
  (`ai/reports/reports.service.ts:221-223`); smoke B6#22 kiểm thật (`buoc-6-smoke-output.txt`). Nội dung chứa câu ngữ cảnh / từ riêng bị xóa theo hạn,
  và theo người khi xóa tài khoản (`ai/ai.service.ts:43-56`, `ai/account-eraser.provider.ts:20-22`).
- **Ranh giới D3:** ngoài `src/ai/` không có truy vấn bảng `ai_*` (xem (d)); Practice/Content chỉ import `ai/index.js`.
- **Log:** các log của luồng Bước 7 chỉ mang id/trạng thái (`ai-question-generator.service.ts:143,149,186`, `content/lookup/ai-lookup.service.ts:63`,
  `practice/reports/reports.service.ts:252`); `ai_call` log không có nội dung (`ai/runner/call-ledger.service.ts:102-117`).
- **Migration/index:** `ai_calls(created_at)`, `(operation_id)`, `(user_id)`; `ai_operations` unique `(user_id, operation_id)`; partial unique
  `practice_ai_requests (user_id, sense_id) WHERE state = 'generating'` (`prisma/migrations/20261020071131_ai/migration.sql:188-206`,
  `20261022090000_buoc7_practice_ai/migration.sql:142-144`).

<a id="b6-1"></a>
### B6-1 — Vừa — `deploy-checklist.md` thiếu các việc "trước ra mắt" của Bước 6 và 7, trong khi `CLAUDE.md` hứa nó là nơi gom

- **Mô tả:** `CLAUDE.md` ghi "the items to do before launch are collected in `docs/deliveries/deploy-checklist.md`". Checklist không có mục Bước 6/7
  (các mục `##` là: Rate limit, Kết nối DB, Cấu hình, Đo tải, Admin web, kiểm kê 20/10, Chống bot, Giao diện người học, Bước 8 —
  `grep -n "^## " docs/deliveries/deploy-checklist.md`). AI chỉ có một mục chi phí (`deploy-checklist.md:87-89`). Thiếu: Privacy Policy nêu việc gửi từ
  riêng, câu ngữ cảnh cho OpenAI/Anthropic (B6 §18, F29, SR15) và việc `ai_call_contents` giữ chúng 7 ngày, admin đọc được (`ai/reports/reports.service.ts:218-235`);
  điều khoản dữ liệu provider (F30); OpenAI under-18 / ZDR so với mốc 13 tuổi; không dùng model giữ dữ liệu 30 ngày; hàng đợi đếm theo tiến trình và
  50 > tier Anthropic (B6 §18 "Deploy"); ba điểm riêng tư Bước 7 (B7 §20); luật sư xem chữ "300 câu AI" (B7 §19).
- **Bằng chứng:** `grep -n -i "F29\|SR15\|F30\|under-18\|Zero Data\|max_concurrent\|ai_call_contents\|unknown_forms\|context_sentence" docs/deliveries/deploy-checklist.md`
  → 0 dòng (đối chứng: cùng file có `deploy-checklist.md:87` "Giới hạn chi phí AI"). Trang chính sách hiện tại không nhắc AI:
  đếm trong `apps/web/messages/vi.json` khóa `Legal` → `OpenAI 0, Anthropic 0, AI 0` (đối chứng: `apps/web/src/components/sections/PrivacyPolicy.tsx`
  đọc `Legal.privacy`). Mục chính sách riêng tư duy nhất (`deploy-checklist.md:134`) chỉ liệt kê điểm của Bước 8.
- **Kịch bản hỏng:** người làm deploy đi theo checklist (đúng như `CLAUDE.md` bảo) → mở app có tra AI và câu AI với chính sách riêng tư không nêu việc
  gửi dữ liệu cho bên thứ ba ở Mỹ; chạy 2 instance API + worker với `max_concurrent_calls = 50` mỗi tiến trình trên tier Anthropic ~40 → 429 hàng loạt.
- **Đề xuất:** thêm mục "Bước 6–7 (AI)" vào `deploy-checklist.md`, chép các dòng của design B6 §18–§19 và B7 §19–§20 còn mở, kèm nguồn.

<a id="b6-2"></a>
### B6-2 — Thấp — `pnpm ai:fake-call` có thể gọi provider thật

- **Mô tả:** CLI chỉ kiểm `AI_FAKE_ENABLED` (`cli/ai-fake-call.ts:21-27`), không kiểm lựa chọn của thao tác là provider `fake` hay máy không có key.
  `.env.example:70` bật sẵn `AI_FAKE_ENABLED=true`; `.env` của chủ dự án có key thật từ 28/10 (`docs/deliveries/buoc-8-rulings.md:28`, R19); DB chính đã chọn
  `claude-haiku-5-5` cho 6 thao tác (`IMPROVEMENT_PLAN_2026-10-28.md:24`).
- **Kịch bản hỏng:** chạy tay `pnpm ai:fake-call generate_cloze --user … --parallel 20` trên DB chính → 20 lời gọi Anthropic thật, tính tiền, tính vào trần
  lời gọi của ngày. Smoke thì an toàn vì đặt key rỗng cho tiến trình con (`scripts/smoke-buoc-6.mjs:31-35`, `smoke-buoc-7.mjs:41-45`).
- **Đề xuất:** CLI từ chối khi `selection.provider !== 'fake'` hoặc khi config có key.

<a id="b6-3"></a>
### B6-3 — Thấp — Lưới che log thiếu `context_sentence`

- **Mô tả:** `REDACT_KEY_PATTERN` có `contextSentence` (camelCase) nhưng không khớp `context_sentence`, tên trường thật của body API tra AI
  (`common/logging/app-logger.ts:16`; `content/lookup/ai-lookup.controller.ts:17`; dữ liệu gửi cổng `content/lookup/ai-lookup.service.ts:56`).
- **Hiện không thấy đường log nào ghi body hay `data`** (xem (d) mục 3), nên đây là lưới an toàn thiếu, không phải rò rỉ đang có.
- **Kịch bản hỏng:** một log sau này ghi `{ data }` của lời gọi `lookup_word` → câu Lan gặp vào log (trái SR10, B7E95).
- **Đề xuất:** thêm `context_sentence` (hoặc `sentence`) vào pattern, kèm một ca test.

<a id="b6-4"></a>
### B6-4 — Thấp — Smoke 6/7 không chạy trong CI; bảo đảm chạy đua trên Postgres thật chỉ có ở smoke chạy tay

- **Mô tả:** unit của các câu SQL chạy đua chỉ so chữ SQL với Prisma giả (`ai/runner/operations.repository.spec.ts:52-80`: `toMatch(/ON CONFLICT …/)`),
  nên không chứng minh hành vi trên Postgres; chứng minh thật là smoke (cuộc đua 10 lời gọi, Review Focus 1), chạy tay, không có trong `ci.yml`
  (job `api` chỉ lint/typecheck/build/unit/drift: `.github/workflows/ci.yml:47-68`).
- **Bằng chứng hỏng đã xảy ra:** commit `4c2bfc3` (28/10) đổi quyền đọc lý do báo lỗi làm `smoke-buoc-7` đỏ; không ai thấy tới 29/10
  (`docs/deliveries/buoc-8-rulings.md:27`, R18: "Bước 7 không được kiểm lại sau 4c2bfc3 cho tới nay").
- **Đề xuất:** chạy `smoke:buoc-6`/`7` trong một job CI có Postgres/Redis (job `admin-e2e-real` đã dựng stack này), hoặc ghi rõ luật "đổi `src/ai/**`
  hay `src/practice/**` thì chạy lại hai smoke".

<a id="b7-1"></a>
### B7-1 — Vừa — `GET /practice/sessions/current` có thể tạo yêu cầu AI không ai chạy; trả `preparing: false` và làm mất notice

- **Mô tả:** khi có notice (câu đang hiện bị void vì từ bị bỏ khỏi việc học, hoặc `pending_notice` do xóa từ riêng), `advance(build = false)` của
  `current` không dừng mà lập kế hoạch tiếp (`practice/sessions/sessions.service.ts:398-399, 417-418, 425`), và vòng lặp gọi `aiSlot` không xét `build`
  (`sessions.service.ts:459`). `aiSlot` có thể **tạo yêu cầu mới** và đặt con trỏ (`sessions.service.ts:546-550`, `fresh: true`). `current` chỉ
  hiểu `question`/`preparing` (`sessions.service.ts:167-169`), nên trả `item: null, preparing: false` và bỏ notice (đã xóa `pending_notice` trong cùng
  transaction ở dòng 399). Không ai chạy yêu cầu đó: lần `next` sau thấy con trỏ `generating`, `fresh: false`, `claimStale` thất bại vì yêu cầu mới tạo
  (`sessions.service.ts:191`; ngưỡng 120 s ở `practice/practice.constants.ts:24`) → trả `preparing` cho tới khi đủ 120 giây.
- **Lệch design:** B7 §6.8 và B7E65: "`current` … cần câu AI mới chưa có → `item: null`, `preparing: true`; không gọi AI". Design B7E64 giữ notice
  `word-not-found`.
- **Test:** `practice/sessions/sessions.ai.spec.ts:347-371` chỉ có hai ca (con trỏ đang `generating`, con trỏ `ready`); không ca nào cho `current` + notice +
  từ kế tiếp được đánh dấu AI. Smoke không đi qua B7E64.
- **Kịch bản hỏng:** Lan đang ở câu gõ từ của từ riêng "rizz" (vòng 2, hoặc phiên đã "Làm tiếp", là lúc `prepare` không chạy:
  `sessions.service.ts` hàm `prepare`, điều kiện `continued === true` / `round > 1`). Lan xóa "rizz" ở tab khác rồi quay lại → app gọi `current` → yêu cầu
  AI mới cho từ kế tiếp → app web thấy `item: null` và gọi `next` (`apps/web/src/features/learner/practice/session/use-practice-session.ts:140-142`)
  → màn "Đang chuẩn bị" khoảng 2 phút, và không có thông báo "Không tìm thấy từ này". Không mất lượt (chưa `reserve`).
  Ở vòng 1 với `prepare` mặc định (K = 2) thường không treo vì từ kế tiếp đã có yêu cầu, nhưng cờ `preparing` vẫn sai và notice vẫn mất.
- **Đề xuất:** khi `build = false` và từ kế tiếp cần câu AI chưa có, trả `{ state: 'preparing' }` mà không tạo yêu cầu (đúng §6.8); `current` map
  `pending` thành `preparing: true` và giữ `notice`. Thêm ca test đỏ trước.

<a id="b7-2"></a>
### B7-2 — Vừa — Lời gọi thất bại trả lượt nên một người học (hoặc một sự cố provider) đốt được trần lời gọi chung, tắt AI của mọi người tới 0 giờ

- **Mô tả:** mọi kết quả không thành công đều `release` lượt (`practice/ai/ai-question-generator.service.ts:128-131`; tra AI
  `content/lookup/ai-lookup.service.ts:69-75`), trong khi mỗi lần thử vẫn tạo 1–4 dòng `ai_calls` (lần đầu + thử lại nhanh, cộng `#2` khi luật loại).
  Phiên chỉ dạng AI cho bấm [Thử lại] (`next` với `retry_ai: true`) bao nhiêu lần cũng được, mỗi lần một yêu cầu mới (`sessions.service.ts:597-602`).
  Giới hạn duy nhất là rate limit theo người (`practice.answer` 120/phút, `user.write` 30/phút: `common/config/app-config.ts:136,140`) và **trần lời gọi
  toàn hệ thống** (`ai/runner/readiness.service.ts:33-37`, đếm mọi `ai_calls` hôm nay). Không có trần theo người. Chạm trần → `isReady` trả
  `daily-call-cap` cho **mọi** người học tới 0 giờ giờ Việt Nam.
- **Kịch bản hỏng (không cần ý xấu):** Anthropic trả 529 trong 10 phút. 50 người học trong phiên chỉ AI bấm [Thử lại] vài giây một lần; mỗi lần
  2 lời gọi (lần đầu + thử lại nhanh, design §8.3), 0 lượt bị trừ. 3.000 lời gọi (mặc định) hết trong vài phút → khi Anthropic đã ổn, AI vẫn tắt cả ngày.
  `deploy-checklist.md:87-89` khuyên "đặt trần thấp lúc ra mắt", làm việc này xảy ra nhanh hơn.
- **Kịch bản có ý xấu (`ASSUMPTION`, chưa thử vì không gọi thật):** chèn chỉ thị vào nghĩa từ riêng hoặc câu ngữ cảnh khiến model trả đáp án ngoài dạng hợp lệ
  → bị luật loại hai lần → 0 lượt; lặp `retry_ai` cho tới khi chạm trần.
- **Đã ghi chưa:** design B6 §19 ghi "lời gọi lỗi vẫn tốn tiền … không có trong trần lượt của Bước 5" ở góc **chi phí**; góc **một người làm tắt AI của
  mọi người** chưa có ở design, as-built, `IMPROVEMENT_PLAN` hay `deploy-checklist`.
- **Đề xuất (để chủ dự án chọn):** (a) trần lời gọi provider theo người mỗi ngày trong `ReadinessService` (đếm `ai_calls` theo `user_id`, `purpose = learner`;
  có index `ai_calls(user_id)`); (b) giới hạn số lần `retry_ai` mỗi chỗ / mỗi phiên; (c) ít nhất ghi rủi ro vào deploy-checklist cạnh mục chi phí AI.

<a id="b7-3"></a>
### B7-3 — Thấp — Bộ tạo câu không trả lượt khi `ai.run` ném lỗi (khác luồng tra AI)

- **Mô tả:** `reserve` ở `practice/ai/ai-question-generator.service.ts:109`, rồi `ai.run` ở `:119`/`:123` không nằm trong `try`; tra AI thì có
  `try … catch → release` (`content/lookup/ai-lookup.service.ts:55-61`).
- **Kịch bản hỏng:** DB tạm lỗi ở `ledger.record` (`ai/runner/runner.service.ts:228-241`, chạy sau khi provider đã trả lời) → exception lên `next` → 500;
  giữ chỗ của Bước 5 còn tới khi hết hạn (2 phút, ER5) và yêu cầu kẹt `generating` 2 phút (`practice/practice.constants.ts:24`). Không trừ hẳn lượt,
  không trừ hai lần.
- **Đề xuất:** bọc bước F như tra AI (release rồi `markFailed`), hoặc ghi lý do chấp nhận.

<a id="b7-4"></a>
### B7-4 — Thấp — Design Bước 7 lệch code về quyền đọc lý do báo lỗi; câu chữ quyền của dashboard dễ hiểu sai

- **Mô tả:** design B7 §9.1 và §13 dòng 13 ghi `GET /v1/admin/practice/report-reasons` cần `settings.manage`; code cho `content.edit`
  (`practice/reports/admin-report-reasons.controller.ts:22-23`, từ `4c2bfc3`). Chỉ `buoc-8-rulings.md:27` (R18) ghi lại; design/as-built Bước 7 chưa sửa.
  Tương tự, `CLAUDE.md:343` viết "mọi cài đặt AI, chi phí và các lần gọi vẫn `settings.manage`", trong khi dashboard `ai.view` (editor đọc được) trả tiền theo
  ngày, model, mục đích (`ai/reports/reports.service.ts:192-209`); code ghi rõ là chủ ý (`identity/identity.types.ts:16`), decision record AD6 chưa sửa
  (`docs/deliveries/giao-dien-admin.md:598-601` tự nhận).
- **Kịch bản hỏng:** người đọc design để kiểm quyền kết luận editor không đọc được lý do báo lỗi / không thấy tiền AI, và "sửa" code về đúng design.
- **Đề xuất:** ghi chú as-built vào design B7 §9.1/§13 và sửa câu ở `CLAUDE.md:343` thành "trang Chi phí và Các lần gọi".

<a id="b7-5"></a>
### B7-5 — Thấp — Hiệu năng mở phiên chưa đo và chưa có chỗ theo dõi

- **Mô tả:** `availability` gọi `wordChecks.get` và `practiceOtherSenses` **mỗi từ** trong vòng lặp (`practice/questions/question-builder.service.ts:94-103`),
  tối đa 50 từ; as-built ghi "chưa đo" (`buoc-7.md:150`). Mục "Đo tải trước launch" của checklist chỉ có `test:scale` cho tra từ (`deploy-checklist.md:41-45`).
- **Đề xuất:** thêm dòng đo mở phiên có dạng AI (50 từ, `meaning_in_sentence`) vào mục "Đo tải".

### Nợ kỹ thuật nhỏ (không đánh mã)

- Ghi chú trỏ sai dòng: `ai/ai.constants.ts:72` nói hằng 2.000 nằm ở `content/senses/senses.service.ts:58`; thực tế ở `:66`. Hằng này không có test so khớp
  (đã chấp nhận ở design B6 §2 as-built #11).
- `GET /v1/admin/ai/calls?operation_id=<id>` không trả lời gọi `<id>#2`; admin tra câu bị báo lỗi phải gõ thêm lần nữa với `call_operation_id`
  (`ai/reports/reports.service.ts:219`).

---

## (d) Lệnh tìm "không có" kèm đối chứng

1. **Bảng `ai_*` bị truy vấn ngoài module `ai`:**
   `grep -rnE "\.ai(Call|CallContent|Operation|OperationSetting|…|EvalRun)\b|\b(ai_calls|ai_call_contents|ai_operations|…|ai_eval_runs)\b" --include=*.ts apps/api/src | grep -v "^./ai/" | grep -v spec`
   → chỉ `identity/deletion/account-data-map.ts:69-77` (bản đồ tên cột, không truy vấn). Đối chứng: cùng mẫu trong `ai/` → 36 dòng.
   Import ruột `ai/` từ module khác: `grep -rn "from '\(\.\./\)*ai/" … | grep -v "ai/index.js'"` → chỉ `practice/ai/*` (thư mục con của Practice).
   Đối chứng: 8 import `ai/index.js` (vd `content/lookup/ai-lookup.service.ts:3`).
2. **API key bị log / trả / lưu:** `grep -rn "openaiApiKey\|anthropicApiKey" apps/api/src/ai` → chỉ `ai/adapters/adapters.registrar.ts:17-19`.
   `grep -rn "logger\.\(error\|warn\|info\)" apps/api/src/ai` → 10 dòng, không trường nào chứa key (đối chứng: thấy `ai_call` ở `call-ledger.service.ts:102`).
3. **Log mang câu / đáp án / nghĩa ở luồng Bước 7:** `grep -rn "logger\.\(error\|warn\|info\|debug\)(" practice/ai practice/sessions practice/reports content/lookup content/private content/word-forms`
   → 5 dòng, chỉ id/trạng thái (đối chứng: thấy `ai_lookup` ở `content/lookup/ai-lookup.service.ts:63`). Không đường nào log `request.body`:
   `grep -rn "request.body\|req.body" common` → chỉ hash ở `idempotency.interceptor.ts:48` và email ở `rate-limit.guard.ts:27`.
4. **Editor sửa được prompt/model:** `grep -n "RequirePermission" apps/api/src/ai/api/*.ts` → chỉ decorator mức class `settings.manage` (5 file) và
   `ai.view` ở dashboard; không route nào ghi đè (đối chứng: route ghi đè có thật ở `practice/reports/admin-reports.controller.ts:60`).
5. **Mục AI trong deploy-checklist:** lệnh ở B6-1 → 0 dòng; đối chứng `deploy-checklist.md:87`.
6. **Chính sách riêng tư nhắc AI:** đếm `OpenAI/Anthropic/AI` trong `apps/web/messages/vi.json` khóa `Legal` → 0/0/0; đối chứng: khóa `Legal` tồn tại và
   `PrivacyPolicy.tsx` dùng `Legal.privacy`.
7. **Test `current` + notice + chỗ AI mới:** `grep -n "current" practice/sessions/*.spec.ts | grep -i "ai\|prepar\|pending\|B7E65"` → chỉ
   `sessions.ai.spec.ts:347-371` (hai ca con trỏ có sẵn). Đối chứng: ca B7E65 con trỏ `generating` có ở dòng 348.
8. **Trần lời gọi theo người:** đọc `ai/runner/readiness.service.ts:26-38` (toàn bộ hàm `check`): chỉ công tắc, model, provider, trần toàn hệ thống.
   Đối chứng: trần toàn hệ thống có ở dòng 33-37.
9. **CI của PR Bước 6/7:** `gh pr list --state merged --limit 200 --json number,statusCheckRollup` → #82–#116 đều 4 × `SUCCESS`.
