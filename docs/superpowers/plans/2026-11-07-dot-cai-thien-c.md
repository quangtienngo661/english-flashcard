# Đợt cải thiện C (Học / Ôn, chuỗi ngày, phiên âm và giọng đọc) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhóm có hai việc Học (lật thẻ, gần như không đổi lịch) và Ôn (trắc nghiệm / gõ từ, đổi lịch theo đúng sai), chuỗi ngày học có toast và dòng
trong email nhắc; mỗi nghĩa có phiên âm UK / US hiện kiểu Cambridge và giọng đọc UK / US tạo sẵn bằng Google Cloud TTS (WaveNet), lưu trên R2.

**Architecture:** Luật lịch mới là hai hàm thuần `applyLearn`, `applyRecall` cạnh `applyAnswer` (giữ cho trang Luyện tập). Phiên Ôn là một loại phiên
Practice (`practice_sessions.kind = 'recall'`) dùng lại dựng câu và chấm điểm; `writeFinal` của phiên Ôn gọi `LearningService.recallAnswer` trong cùng
transaction. Chuỗi ngày đọc cột mới `learning_activity_days.studied`. Phiên âm nằm trên `SenseRevision` (đi qua nháp → duyệt → đăng); giọng đọc là bảng
`speech_audio` theo khoá `sha256(voice|text|phonemes)`, một hàng BullMQ riêng `content-tts`, port `TtsAdapter` (Google + fake) và port `AudioStorage`
(R2 qua S3 + thư mục local).

**Tech Stack:** NestJS 12 + Prisma 7 (TypedSQL) + Postgres, BullMQ 6.3.12, `@google-cloud/text-to-speech` **7.2.0**, `@aws-sdk/client-s3` **3.1156.0**
(cả hai đã ra hơn 14 ngày, kiểm `npm view` 07/11/2026), Next.js 16 learner web, React + Vite admin, Vitest, Playwright.

**Spec:** [`../specs/2026-11-06-dot-cai-thien-c-design.md`](../specs/2026-11-06-dot-cai-thien-c-design.md) (decision record
[`../decisions/2026-11-06-dot-cai-thien-c-decisions.md`](../decisions/2026-11-06-dot-cai-thien-c-decisions.md); code facts
`docs/preparation/DOT_CAI_THIEN_C_CODE_FACTS_M{1,2}_2026-11-06.md`). Mọi `§`, `DC…`, `QC…` dưới đây là của design; QC1–QC10 đã chốt thành DC25–DC34.

## Global Constraints

- **Hai phiên làm việc (chủ dự án 07/11/2026):** phiên BE (Sonnet 5.5, effort xhigh) làm **Task 1–23** theo thứ tự; phiên này làm FE **Task 24–31** khi
  API nó cần đã vào `dev`: FE1 (Task 24–27) sau khi BE1 + BE2 đã merge; FE2 (Task 28–31) sau khi BE3 + BE4 đã merge. Chạy song song thì BE luôn đi trước:
  phiên FE không sửa file trong `apps/api/**` (trừ khi phiên BE nhờ), phiên BE không sửa `apps/web/**`, `apps/admin/**`.
- **Hợp đồng API** ở mục "Hợp đồng API" dưới là chỗ duy nhất hai phiên dựa vào. Đổi hợp đồng thì sửa mục đó trong plan, commit, và báo phiên kia
  (`SendMessage`).
- **PR và nhánh** (mỗi PR một nhánh từ `origin/dev`, PR vào `dev`, qua skill `ship-pr`): BE1 `feat/dot-c-be1-learn-recall` (Task 1–7), BE2
  `feat/dot-c-be2-streak` (8–10), BE3 `feat/dot-c-be3-ipa` (11–14), BE4 `feat/dot-c-be4-tts` (15–19), BE5 `feat/dot-c-be5-backfill` (20–23), FE1
  `feat/dot-c-fe1-learn-recall-web` (24–27), FE2 `feat/dot-c-fe2-pronunciation` (28–31). Tài liệu (design, decision record, plan, plan tóm tắt) đi PR
  `docs/dot-cai-thien-c` trước BE1.
- Lịch: `LEVEL_INTERVALS = [1, 3, 7, 14, 30]`, `MAX_LEVEL = 5`. Trần mỗi nhóm mỗi ngày giữ nguyên (`newPerGroupPerDay` 20, `reviewsPerGroupPerDay` 100).
  Trang Luyện tập và `applyAnswer` **không đổi**.
- "Đúng" ở Ôn = `result === 'correct'` **và** `hint_level === 0`. Bỏ qua (`skip`) = sai.
- Chuỗi: chỉ lật thẻ (`POST /v1/reviews`), câu trả lời cuối của phiên Ôn / Luyện tập (cả bỏ qua) và nút "Cần ôn lại" / "Đã biết" trong phiên đặt
  `studied = true`. Toast 3 giây; dòng email chỉ khi chuỗi ≥ 2 và hôm nay chưa học.
- Chữ cố định (test giữ): toast vi `"{days} ngày liên tiếp"`, en `"{days}-day streak"`; email vi `"Bạn đang có chuỗi {days} ngày. Học hôm nay để giữ chuỗi."`,
  en `"You're on a {days}-day streak. Study today to keep it."`; gợi ý ô phiên âm từ riêng vi `"Không bắt buộc."`, en `"Optional."`.
- Phiên âm: `ipa_uk`, `ipa_us`, `ipa_custom` tối đa 100 ký tự, lưu không có `/` hai đầu. `contentHash` chỉ thêm trường phiên âm khi có giá trị.
- TTS: giọng từ `TTS_VOICE_UK`, `TTS_VOICE_US` (tên giọng Google, ví dụ `en-GB-Wavenet-B`; mã ngôn ngữ = 5 ký tự đầu). Cài đặt `tts.daily_char_cap` mặc định
  **120000**, bound 0–1000000. Thử lại 3 lần, chờ 5 s tăng dần; vòng quét 5 phút đẩy lại `pending` cũ hơn 10 phút; dọn file không dùng mỗi tuần, chỉ dòng
  cũ hơn 7 ngày. Worker `concurrency: 4`. Đường dẫn file `tts/v1/<key>.mp3`.
- Fake: `TTS_FAKE_ENABLED`, `AUDIO_STORAGE_FAKE_ENABLED` bị từ chối khi `BILLING_PRODUCTION=true` (như `AI_FAKE_ENABLED`, `app-config.ts:297-301`).
- Không log chữ từ riêng của người học, không log `GOOGLE_TTS_CREDENTIALS`. Log TTS dùng `key` (hash).
- Lệnh test mặc định không cần Docker (`~/.claude/rules/testing-boundaries.md`). Lệnh: `pnpm exec vitest run <file>` trong từng app. Defect fix hai commit.
  Conventional Commits, scope theo `git log` (`api`, `web`, `admin`, `docs`).
- Thư viện mới: trước khi viết code gọi thư viện, kiểm cách dùng bằng context7 (`TextToSpeechClient` với `credentials` inline, `S3Client` với endpoint R2).

## Hợp đồng API

Thêm trường là thay đổi cộng thêm trong `/v1`. Kiểu web viết tay tương ứng ở `groups-api.ts`, `practice-api.ts`, `word-api.ts`, `add-word-api.ts`.

| # | Endpoint | Thay đổi |
|---|---|---|
| H1 | `GET /v1/groups/:id/queue?mode=new` | Mode mới: chỉ từ nấc 0 của nhóm, cắt theo trần từ mới còn lại, `ORDER BY added_at, id`. `mode=due`, `mode=all` giữ nguyên |
| H2 | `POST /v1/reviews` | Luật `applyLearn` (DC4, DC26). Response thêm `streak: { days: number } \| null` (khác null chỉ ở lần học đầu tiên trong ngày) |
| H3 | `POST /v1/practice/sessions` | Body thêm `kind?: 'practice' \| 'recall'` (mặc định `practice`). `recall` bắt buộc `source: 'group'` + `group_id`; khi đó `types` không bắt buộc và bị bỏ qua cùng `sort`, `group_filter`, `prompt_style`, `count`, `cloze_source`. Lỗi `practice-no-words` `reason: 'nothing-learned'` khi nhóm không có từ nấc ≥ 1 |
| H4 | `SessionView` (mọi response có `session`) | Thêm `kind: 'practice' \| 'recall'` |
| H5 | `GET /v1/practice/sessions/current` | Chỉ trả phiên `practice` (phiên Ôn không bao giờ hiện ở trang Luyện tập) |
| H6 | `POST /v1/practice/items/:id/answer` và `/skip` (kết quả cuối) | Thêm `schedule: { level: number; due_date: string; outcome: 'leveled_up' \| 'kept' } \| null` (khác null chỉ ở phiên `recall`) và `streak: { days } \| null`. Ở phiên `recall`, `show_known` luôn `false` |
| H7 | `GET /v1/practice/sessions/:id/summary` | Thêm `recall: { leveled_up: number; correct_kept: number } \| null`. Sai = `wrong` có sẵn; "Cần ôn lại" = số `words[].action === 'needs_review'` |
| H8 | `GET /v1/practice/history` | Bỏ câu trả lời của phiên `recall` (DC30). `weak-words` vẫn tính chúng |
| H9 | `WordSense` (`/v1/groups/:id/queue`, `/v1/words/:lemma`, `/v1/lookup`, `/v1/lookup/ai`, `/v1/groups/:id/items?content=true`) | Thêm `pronunciation: { uk: string \| null; us: string \| null; custom: string \| null; audio: { uk: string \| null; us: string \| null } }`. `uk`, `us`, `custom` không có `/`; `audio.*` = URL mp3 khi file `ready`, còn lại null |
| H10 | `POST /v1/quick-add` (`new_word`), `PATCH /v1/my-words/:id` | Thêm `ipa?: string \| null` (≤ 100) ở `new_word`; `senses[].ipa?: string \| null` ở PATCH. Chuỗi rỗng = xoá |
| H11 | `POST /v1/admin/content/senses`, `PUT /:id/draft`, `POST /:id/quick-publish` | `content` thêm `ipa_uk?: string \| null`, `ipa_us?: string \| null`. Ký tự lạ → 400 `ipa-invalid`, `extensions: { field: 'ipa_uk' \| 'ipa_us', char: string }` |
| H12 | `GET /v1/admin/content/senses/:id` | `content` thêm `ipa_uk`, `ipa_us`, `ipa_source: { id: string; name: string } \| null`; thêm `audio: { uk: AudioState \| null; us: AudioState \| null }`, `AudioState = { status: 'pending' \| 'ready' \| 'failed'; error: string \| null; url: string \| null }` (null khi nghĩa không hiện) |
| H13 | `POST /v1/admin/content/senses/:id/audio/retry` (mới, `content.edit`) | Đặt lại các dòng `failed` của nghĩa về `pending`, đẩy việc. `202 { retried: number }` |
| H14 | `GET/PATCH /v1/admin/settings` | Khoá mới `tts.daily_char_cap` (int 0–1000000, mặc định 120000) |
| H15 | CSV nhập / xuất | Cột nội dung mới `ipa_uk`, `ipa_us`, `ipa_source_id` (uuid của `data_sources`). Ô trống = giữ nguyên, `-` = xoá |
| H16 | `GET /v1/dev/audio/:file` (chỉ khi `AUDIO_STORAGE_FAKE_ENABLED=true`) | Phát file mp3 local, `Content-Type: audio/mpeg` |

## Skill UI cho Task 24–31

Đợt C vẽ trên giao diện hiện có (token `packages/design-tokens`, hướng B). Hướng redesign D + K (`docs/mockups/2026-11-05-redesign-concepts/style-da-chon.md`)
chưa có design nên **không** áp ở đây; redesign sau sẽ phủ cả các màn mới.

| Skill | Dùng ở | Vì sao chọn |
|---|---|---|
| `impeccable:impeccable` | Mỗi task FE: chế độ *shape* trước khi code (cặp nút Học / Ôn, màn xong phiên Ôn, dòng phiên âm, ô trạng thái giọng ở admin), *harden* (rỗng, đang tải, lỗi, chữ dài), *polish* trước PR | Skill duy nhất trong bốn cái viết cho product UI (component, form, empty state) và làm việc trên design system có sẵn |
| `emil-design-eng` | Task 27 (StreakToast: ngọn lửa nảy, vào / ra, `prefers-reduced-motion`), Task 29 (nút loa: trạng thái đang phát, nhấn) | Quyết định có nên động không, đường cong, thời lượng; hai chỗ này là chuyển động duy nhất của đợt |
| `anthropic-skills:web-design-guidelines` | Bước review cuối của Task 27 và Task 31 | Kiểm a11y và guideline: `aria-live` của toast, nhãn nút loa ("Phát âm UK"), vòng focus, vùng chạm ≥ 44 px trên điện thoại |
| `taste-skill:redesign-skill` | Chỉ hai mục "Interactivity and States" và "Content" của audit, ở bước harden | Checklist hover / active / focus / loading / empty / error. **Không** áp phần đổi font, màu, layout (đụng token hướng B) |
| `break-ui` | Task 31 | Dữ liệu xấu nhất: phiên âm 100 ký tự, cụm `look after`, chỉ có US, không có phiên âm, chuỗi 1000 ngày, nhóm 0 từ đã học |

Không dùng: `taste-skill` chính (`design-taste-frontend`): tự ghi "Not for dashboards or app screens", dành cho landing; `frontend-design`: đề ra hướng
thẩm mỹ mới, xung đột với token đang dùng.

## Review Focus

1. **Hai tab trả lời đúng cùng một từ đến hạn trong Ôn** (hai phiên Ôn của hai nhóm cùng chứa `luggage`): từ lên nấc **một lần**; lần sau thấy chưa đến hạn
   và giữ nấc (Task 4 test khoá `FOR UPDATE`, Task 23 smoke gửi song song bằng `Promise.all`).
2. **Lan đang dở phiên Luyện tập rồi mở Ôn**: phiên Luyện tập không bị đóng, quay lại trang Luyện tập vẫn tiếp được; phiên Ôn không trừ lượt (Task 5 test,
   Task 23 smoke kiểm `usage_records` không đổi).
3. **Phát lại `review_id` sau luật mới**: `known` ở nấc ≥ 1 không còn xoá cờ ưu tiên, nên kết quả phát lại phải đọc `priority` từ item, không suy từ `answer`
   (Task 2 test).
4. **Admin đổi phiên âm một nghĩa của `record`**: mọi nghĩa `record` tính lại khoá, file mới được tạo, file cũ không bị dọn trước 7 ngày (Task 17, Task 19 test).
5. **Phiên âm Wiktionary có ký hiệu Google không nhận** (`ɝ`, `ɾ`, `t͡ʃ`, `(ə)`): trang vẫn hiện đúng bản gốc; Google nhận ký hiệu đã đổi, hoặc chỉ chữ khi đổi
   không được, không bao giờ 400 vì ký hiệu (Task 16 test).

---

## BE1 — Học và Ôn (API) — nhánh `feat/dot-c-be1-learn-recall`

### Task 1: Luật `applyLearn` và `applyRecall`

**Files:**
- Modify: `apps/api/src/learning/schedule/schedule.ts`
- Test: `apps/api/src/learning/schedule/schedule.spec.ts`

**Interfaces:**
- Produces: `applyLearn(state: ItemState, answer: Answer, today: string, backlogDays: number): AnswerResult`;
  `applyRecall(state: ItemState, correct: boolean, today: string, backlogDays: number): RecallResult` với
  `RecallResult = AnswerResult & { outcome: 'leveled_up' | 'kept' }`.

- [ ] **Step 1: Viết test đỏ**, biên trước. Hôm nay `2026-11-07`:
  - `applyLearn`: nấc 0 + `known` → `{ level: 1, dueDate: '2026-11-08', priority: false }`, `changed: true`; nấc 3 đến hạn + `known` → state y nguyên,
    `changed: false`, `section: 'due'`; nấc 1 ưu tiên + `known` → y nguyên (vẫn ưu tiên); mọi nấc + `review` → `{ level: 1, dueDate: today, priority: true }`.
  - `applyRecall`: bảng nấc 1–5 × {đến hạn, chưa đến hạn} × {đúng, sai}: đúng + đến hạn (không ưu tiên) → nấc `min(n+1, 5)`, hạn `today + LEVEL_INTERVALS[next-1]`,
    `outcome: 'leveled_up'`; nấc 3 → nấc 4 hạn `2026-11-21`; nấc 5 → nấc 5 hạn `2026-12-07`; chưa đến hạn → y nguyên, `kept`; sai → y nguyên, `kept`.
  - DC26: nấc 1 ưu tiên + đúng → `{ level: 1, dueDate: '2026-11-08', priority: false }`, `outcome: 'kept'`, `changed: true`.
  - Bất biến trên mọi nấc 0–5 × mọi state: `applyRecall(..., false, ...)` không bao giờ giảm nấc và không đổi state; `applyRecall` chưa bao giờ trả nấc > 5.
  - `rating`: đúng → `'Good'`, sai → `'Again'`.
- [ ] **Step 2:** `pnpm exec vitest run src/learning/schedule/schedule.spec.ts` → FAIL (`applyLearn is not a function`).
- [ ] **Step 3:** Viết hai hàm cạnh `applyAnswer`, dùng lại `sectionOf`, `isDueNow`. Nấc 0 không bao giờ vào Ôn; `applyRecall` gặp nấc 0 thì `kept`.
- [ ] **Step 4:** Chạy lại → PASS.
- [ ] **Step 5:** Commit `feat(api): add learn and recall schedule rules`.

### Task 2: Học dùng `applyLearn`, mode `new` cho hàng thẻ

**Files:**
- Modify: `apps/api/src/learning/reviews/reviews.service.ts:55,87-101`, `apps/api/src/learning/queue/queue.controller.ts:7,14-21`,
  `apps/api/src/learning/queue/queue.service.ts:74-110`, `apps/api/src/learning/queue/queue.queries.ts`
- Test: `reviews/reviews.service.spec.ts`, `queue/queue.service.spec.ts` (hoặc file spec queue có sẵn gần nhất)

**Interfaces:**
- Consumes: `applyLearn` (Task 1).
- Produces: H1; `ReviewResult` giữ nguyên trường (thêm `streak` ở Task 9).

- [ ] **Step 1: Test đỏ:** `answer` với item nấc 3 đến hạn + `known` → `learning_items` không đổi, vẫn ghi một dòng `learning_log` (`section: 'due'`, có
  `group_id`) để trần đếm; phát lại cùng `review_id` cho item đang ưu tiên mà `known` → `priority: true` (đọc từ item, không phải `answer === 'review'`);
  `queue(..., 'new')` trả chỉ nấc 0, đúng `newPerGroupPerDay − new_done` thẻ; controller nhận `mode=new`, từ chối `mode=x` (400).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Đổi `applyAnswer` → `applyLearn` ở `reviews.service.ts:55`; `storedResult` đọc `priority` từ `learning_items` (item có thể đã bị xoá: khi đó
  `false`). Thêm mode `new` = phần `new` của `mode=due` (dùng lại truy vấn, bỏ phần ưu tiên và đến hạn).
- [ ] **Step 4:** Chạy file spec của `learning/` → PASS.
- [ ] **Step 5:** Commit `feat(api): keep the schedule on flashcards except new words`.

### Task 3: Migration Practice: `kind`, `recall_outcome`, phiên mở theo loại

**Files:**
- Create: `apps/api/prisma/migrations/20261107100000_dot_c_recall_sessions/migration.sql`
- Modify: `apps/api/prisma/models/practice.prisma`

- [ ] **Step 1:** Migration: `ALTER TABLE practice_sessions ADD COLUMN kind text NOT NULL DEFAULT 'practice' CHECK (kind IN ('practice','recall'))`;
  `ALTER TABLE practice_session_items ADD COLUMN recall_outcome text CHECK (recall_outcome IN ('leveled_up','kept'))`;
  `DROP INDEX practice_sessions_open_key; CREATE UNIQUE INDEX practice_sessions_open_key ON practice_sessions (user_id, kind) WHERE status IN ('active','waiting_continue');`
  (index cũ: `20261018150000_practice/migration.sql:133`).
- [ ] **Step 2:** Thêm `kind String @default("practice")` vào `PracticeSession`, `recallOutcome String? @map("recall_outcome")` vào `PracticeSessionItem`.
- [ ] **Step 3:** `pnpm db:setup` trên DB local rồi `pnpm exec prisma migrate diff` như job CI `api` → không lệch.
- [ ] **Step 4:** Commit `feat(api): add recall session kind`.

### Task 4: Learning: phạm vi `learned` và `recallAnswer`

**Files:**
- Modify: `apps/api/src/learning/practice/practice-reads.service.ts:23-39`, `practice-reads.queries.ts` (`ItemsWhere`, `practiceItemsQuery`),
  `apps/api/src/learning/learning.service.ts`
- Create: `apps/api/src/learning/practice/recall-answer.service.ts`
- Test: `practice/practice-reads.service.spec.ts`, `practice/recall-answer.service.spec.ts`

**Interfaces:**
- Consumes: `applyRecall` (Task 1).
- Produces: `PracticeScope` thêm `{ kind: 'learned'; groupId: string }`;
  `LearningService.recallAnswer(tx: Prisma.TransactionClient, userId: string, input: { senseId: string; groupId: string; correct: boolean }): Promise<RecallAnswerOutcome>`,
  `RecallAnswerOutcome = { outcome: 'leveled_up' | 'kept'; level: number; due_date: string } | { outcome: 'not-in-learning' }`.

- [ ] **Step 1: Test đỏ:**
  - `learned`: nhóm có nấc 0, nấc 1 ưu tiên, nấc 2 đến hạn, nấc 3 chưa đến hạn, nấc 2 tồn đọng (quá hạn 61 ngày) → trả ưu tiên + đến hạn + chưa đến hạn,
    không có nấc 0 và tồn đọng; đã dùng hết trần ôn 100 hôm nay → không có phần đến hạn, vẫn có ưu tiên và chưa đến hạn.
  - `recallAnswer` đúng + đến hạn → item nấc +1, một dòng `learning_log` `kind: 'review'`, `origin: 'recall'`, `group_id` = nhóm, `section: 'due'`,
    `answer: 'known'`, `review_id: null`; sai → item không đổi, log `answer: 'review'`, `rating: 'Again'`; sense không còn trong học → `not-in-learning`, không ghi gì.
  - Gọi hai lần liền cho cùng item đến hạn (mô phỏng hai tab): lần hai thấy chưa đến hạn → `kept` (câu `SELECT … FOR UPDATE` có trong SQL đã chạy).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** `learned` = id của `todayIdsQuery` của nhóm có `level >= 1` **hoặc** (`level >= 1`, không ưu tiên, `due_date > today`, trong nhóm). `recallAnswer`
  khoá `learning_items` `FOR UPDATE`, chạy `applyRecall`, cập nhật item (`last_reviewed_at`), ghi log; **không** gọi `recordActivityIn` (Practice ghi ngày
  học ở `writeFinal`). `review_id` để null vì nút "Cần ôn lại" sau đó dùng id câu làm `review_id` (`practice-review.service.ts:44`).
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat(api): add learned scope and recall answers to learning`.

### Task 5: Mở phiên Ôn

**Files:**
- Modify: `apps/api/src/practice/sessions/sessions.controller.ts:15-29`, `sessions.service.ts:90-200,325-335,367-380`, `session-views.ts:4-32`
- Test: `practice/sessions/sessions.service.spec.ts` (thêm `describe('recall')`)

**Interfaces:**
- Consumes: scope `learned` (Task 4).
- Produces: H3, H4, H5.

- [ ] **Step 1: Test đỏ:**
  - `start({ kind: 'recall', source: 'group', group_id })` → phiên `kind: 'recall'`, `types: ['mcq_definition','type_word']`, `promptStyle: 'meaning'`,
    `sort: 'queue'`, `target_count = min(defaultQuestionsPerSession, số từ dùng được)` (nhóm 4 từ → 4; nhóm 30 từ → 10), `checkQuota` **không** được gọi.
  - Có phiên `practice` đang mở → sau khi mở phiên Ôn, phiên `practice` vẫn `active`; phiên `recall` cũ của Lan → `abandoned`.
  - `kind: 'recall'` với `source: 'today'` → 400; nhóm không có từ nấc ≥ 1 → 409 `practice-no-words` `reason: 'nothing-learned'`.
  - `current()` có phiên `recall` mở và không có phiên `practice` → 404.
  - Thứ tự câu: ưu tiên → đến hạn (`due_date, level`) → chưa đến hạn.
  - Nhóm chỉ có 3 từ (thiếu phương án nhiễu cho `mcq_definition`, `question-types.ts:33`) → mọi câu là `type_word` kiểu `meaning`, phiên vẫn mở.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Schema: thêm `kind`, refine `kind === 'recall'` ⇒ `source === 'group'`, `types` không bắt buộc khi `recall` (vẫn bắt buộc với `practice`). Trong `start`:
  nhánh `recall` bỏ cả hai `checkQuota`, bỏ `aiPlanner` (không AI), đóng phiên mở **cùng kind**; `current` và `closeIfIdle` lọc `kind: 'practice'` cho
  `current`; `withPracticeLock` giữ nguyên. Vòng 2 không bao giờ có ở `recall` (target ≤ số từ). `sessionView` thêm `kind`.
- [ ] **Step 4:** Chạy `src/practice` → PASS (các test cũ không đổi).
- [ ] **Step 5:** Commit `feat(api): start recall sessions without spending practice quota`.

### Task 6: Câu trả lời cuối của phiên Ôn đổi lịch

**Files:**
- Modify: `apps/api/src/practice/answers/answers.service.ts:17-24,85-110,132-170`
- Test: `practice/answers/answers.service.spec.ts`

**Interfaces:**
- Consumes: `LearningService.recallAnswer` (Task 4).
- Produces: `writeFinal(tx, item, final): Promise<FinalOutcome>`, `FinalOutcome = { item: ItemWithQuestion; schedule: AnswerResult['schedule'] }`;
  `AnswerResult` thêm `schedule` (H6; `streak` thêm ở Task 9).

- [ ] **Step 1: Test đỏ:** phiên `recall`, câu đúng không gợi ý, từ đến hạn → `recallAnswer` gọi với `correct: true`, `schedule.outcome: 'leveled_up'`,
  `practice_session_items.recall_outcome = 'leveled_up'`, `recordPracticeSession` **không** gọi; đúng sau gợi ý 1 → `correct: false` truyền vào Learning,
  `outcome: 'kept'`; bỏ qua → `kept`; `show_known: false` ở mọi câu `recall`; phiên `practice` → `schedule: null`, `recallAnswer` không gọi,
  `recordPracticeSession` vẫn gọi (test cũ giữ). `writeFinal` ném lỗi → không ghi gì (test B4E23 giữ).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** `writeFinal` đọc `kind` của phiên (đã có `sessionId`; lấy trong cùng `tx`); nhánh `recall` gọi `recallAnswer` với `groupId` của phiên, lưu
  `recall_outcome`; `not-in-learning` → `schedule: null`. `answer`, `skip` gộp `schedule` vào kết quả.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat(api): apply recall answers to the schedule`.

### Task 7: Tổng kết phiên Ôn; lịch sử bỏ phiên Ôn

**Files:**
- Modify: `apps/api/src/practice/reviews/practice-reviews.service.ts:56-65`, `apps/api/src/practice/history/history.service.ts` (mọi `findMany` /
  `$queryRaw` đọc `practice_session_items` cho lịch sử và ngày)
- Test: `reviews/practice-reviews.service.spec.ts`, `history/history.service.spec.ts`, `weak/practice-stats` spec có sẵn

- [ ] **Step 1: Test đỏ:** summary phiên `recall` 8 câu (3 `leveled_up`, 2 `kept` đúng, 3 sai) → `recall: { leveled_up: 3, correct_kept: 2 }`, `wrong: 3`;
  phiên `practice` → `recall: null`; `history` không có câu của phiên `recall`; `weakSenses` vẫn tính câu sai của phiên `recall` (DC30).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** `correct_kept` = `result = 'correct'` và `recall_outcome = 'kept'`. Lịch sử thêm điều kiện `session: { kind: 'practice' }` (Prisma) hoặc join
  `practice_sessions s ... AND s.kind = 'practice'` (SQL).
- [ ] **Step 4:** Chạy `src/practice` và `src/learning` → PASS; `pnpm lint`, `pnpm exec tsc --noEmit`.
- [ ] **Step 5:** Commit `feat(api): summarise recall sessions and keep them out of history`. Mở PR BE1 bằng `ship-pr`.

## BE2 — Chuỗi ngày — nhánh `feat/dot-c-be2-streak`

### Task 8: Cột `studied` và lần học đầu tiên trong ngày

**Files:**
- Create: `apps/api/prisma/migrations/20261107110000_dot_c_studied_days/migration.sql`
- Modify: `apps/api/prisma/models/learning.prisma:82-88`, `apps/api/src/learning/activity/record-activity.ts`, `learning.service.ts:62-64`, các nơi gọi:
  `reviews.service.ts:71`, `practice-review.service.ts:90`, `answers.service.ts:145`, `items.service.ts:247,262`, `groups.service.ts:122`, `backlog.service.ts:94`
- Test: `activity/record-activity.spec.ts` và spec của từng nơi gọi

**Interfaces:**
- Produces: `recordActivityIn(db, userId, localDate, opts: { studied: boolean }): Promise<{ firstStudied: boolean }>`;
  `LearningService.recordActivity(userId, localDate, opts, db?)` cùng kiểu trả.

- [ ] **Step 1:** Migration `ALTER TABLE learning_activity_days ADD COLUMN studied boolean NOT NULL DEFAULT false; UPDATE learning_activity_days SET studied = true;`
  (chưa có người học thật; ngày cũ coi là ngày học). Model thêm `studied Boolean @default(false)`.
- [ ] **Step 2: Test đỏ:** `studied: false` lần đầu → tạo dòng `studied=false`, `firstStudied: false`; `studied: true` sau đó cùng ngày → dòng thành `true`,
  `firstStudied: true`; gọi `studied: true` lần hai → `firstStudied: false`; ngày mới `studied: true` → `firstStudied: true`. Thêm từ (`items.service`) truyền
  `studied: false`; lật thẻ, câu trả lời cuối, "Cần ôn lại" truyền `true`.
- [ ] **Step 3:** Chạy → FAIL.
- [ ] **Step 4:** Cài: khi `studied` = `updateMany({ where: { userId, localDate, studied: false }, data: { studied: true } })`; nếu `count = 0` thì
  `createMany([{ …, studied: true }], skipDuplicates)`; `firstStudied = (updated + created) === 1`. Khi không `studied`: `createMany` như cũ.
  Hai yêu cầu song song: READ COMMITTED đánh giá lại `WHERE studied = false` sau khoá dòng nên chỉ một cái được 1.
- [ ] **Step 5:** Chạy `src/learning src/practice` → PASS. Commit `feat(api): mark study days apart from other activity`.

### Task 9: `streakDays` và trường `streak` trong response

**Files:**
- Create: `apps/api/src/learning/activity/streak.ts`, `streak.spec.ts`
- Modify: `learning.service.ts`, `reviews.service.ts` (`ReviewResult`), `practice/answers/answers.service.ts` (`AnswerResult`, `FinalOutcome`)

**Interfaces:**
- Produces: `streakDays(studiedDatesDesc: string[], today: string): number`;
  `LearningService.streakAsOf(userId: string, today: string, db?): Promise<{ days: number; studiedToday: boolean }>`;
  `ReviewResult.streak`, `AnswerResult.streak`: `{ days: number } | null`.

- [ ] **Step 1: Test đỏ** (`today = '2026-11-07'`): `[]` → 0; `['2026-11-07']` → 1; `['2026-11-06','2026-11-05']` → 2 (hôm nay chưa học, đếm từ hôm qua);
  `['2026-11-07','2026-11-06','2026-11-04']` → 2; `['2026-11-05']` → 0; 12 ngày liền tới hôm qua + hôm nay → 13; ngày trùng trong mảng không đếm hai lần.
  Service: lật thẻ lần đầu trong ngày → `streak: { days: 13 }`; lần hai → `null`; phát lại `review_id` → `null`; câu trả lời Ôn đầu ngày → có `streak`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** `streakAsOf` đọc `local_date` có `studied = true`, giảm dần, `take: 4000`, gọi `streakDays`. `reviews.service` và `writeFinal` gọi nó trong cùng `tx`
  chỉ khi `firstStudied`.
- [ ] **Step 4:** Chạy → PASS. Commit `feat(api): report the study streak on the first study of the day`.

### Task 10: Dòng chuỗi trong email nhắc

**Files:**
- Modify: `apps/api/src/notifications/provider/reminder-message.ts`, `email.provider.ts:22-36`, `notification-provider.ts` (kiểu `send`),
  `scheduler/reminder-send.service.ts:57-60`
- Test: `provider/reminder-message.spec.ts`, `scheduler/reminder-send.service.spec.ts`

**Interfaces:**
- Consumes: `LearningService.streakAsOf` (Task 9).
- Produces: `reminderMail(to, kind, language, settingsUrl, streakDays: number | null): MailMessage`; `send(userId, { kind, language, streakDays })`.

- [ ] **Step 1: Test đỏ:** `reminderMail(…, 12)` vi → body có đúng `"Bạn đang có chuỗi 12 ngày. Học hôm nay để giữ chuỗi."` ở dòng đầu, trước câu cũ; en có
  `"You're on a 12-day streak. Study today to keep it."`; `null` → body y như hiện tại (test cũ giữ). `ReminderSendService`: chuỗi 12, chưa học hôm nay →
  `streakDays: 12`; chuỗi 1 → `null`; đã học hôm nay → `null`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài theo DC29 (QC5 (a)): chỉ thêm dòng khi email được gửi như hiện tại; không đổi `eligibility`.
- [ ] **Step 4:** Chạy `src/notifications` → PASS. Commit `feat(api): add the streak line to reminder emails`. Mở PR BE2.

## BE3 — Phiên âm — nhánh `feat/dot-c-be3-ipa`

### Task 11: Cột phiên âm và nội dung bản sửa

**Files:**
- Create: `apps/api/prisma/migrations/20261107120000_dot_c_ipa/migration.sql`, `apps/api/src/content/senses/ipa.ts`, `ipa.spec.ts`
- Modify: `apps/api/prisma/models/content.prisma:117-147`, `content/senses/revision-content.ts`, `senses.service.ts:29-57`, `senses/import-content.ts:27`,
  `private/private-words.service.ts:68,109-126`
- Test: `revision-content.spec.ts`, `senses.service.spec.ts`

**Interfaces:**
- Produces: `RevisionContent` thêm `ipaUk?: string | null; ipaUs?: string | null; ipaSourceId?: string | null; ipaCustom?: string | null`;
  `normalizeIpa(value: string): string` (bỏ `/` `[` `]` hai đầu, trim, NFC); `checkIpa(value: string): { ok: true } | { ok: false; char: string }`.

- [ ] **Step 1:** Migration: `ALTER TABLE sense_revisions ADD COLUMN ipa_uk varchar(100), ADD COLUMN ipa_us varchar(100), ADD COLUMN ipa_source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL, ADD COLUMN ipa_custom varchar(100);`
  Model thêm bốn trường.
- [ ] **Step 2: Test đỏ:** `normalizeIpa('/ˈlʌɡ.ɪdʒ/')` → `'ˈlʌɡ.ɪdʒ'`; `checkIpa` nhận mọi ký tự trong: chữ `a-z`, khối IPA U+0250–U+02AF, `æ ð θ ŋ ʃ ʒ ɡ ç ø œ`,
  dấu `ˈ ˌ ː ˑ . ( ) ‿ ,` dấu cách, dấu kết hợp U+0300–U+036F, `͡`; từ chối `ˈlʌɡ1` → `{ ok: false, char: '1' }`, chữ hoa `L`, `<`. `contentHash` của nội dung không
  có phiên âm **bằng đúng** hash cũ (dùng một hash đã lưu trong spec có sẵn); thêm `ipaUk` → hash khác. `mergeContent`: `ipaUk` không có trong patch → giữ base;
  `null` → xoá; đổi `ipaUk` mà patch không có `ipaSourceId` → `ipaSourceId: null` (sửa tay = Wordmet). `saveDraft` với chỉ `{ ipaUk }` → bản nháp mới giữ mọi
  trường khác.
- [ ] **Step 3:** Chạy → FAIL.
- [ ] **Step 4:** Cài vào `normalizeContent`, `mergeContent`, `contentHash` (theo mẫu `formOf`, `revision-content.ts:79`), `revisionData`, ba bản `readContent`, và cột
  của `PrivateWordsService.publishRevision` (giữ phiên âm khi đăng bản mới của từ riêng). `ipaCustom` không qua `checkIpa` (DC22).
- [ ] **Step 5:** Chạy `src/content` → PASS. Commit `feat(api): store uk and us ipa on sense revisions`.

### Task 12: Admin API và CSV

**Files:**
- Modify: `content/senses/content-body.ts`, `content/catalog/admin-catalog.queries.ts:144`, `content-pipeline/upload/columns.ts`, `row-normalizer.ts:78-81,160-175`,
  `content-pipeline/export/export.service.ts:9-16`, `content/senses/admin-senses.controller.ts` (map `ContentRuleError('ipa-invalid')`)
- Test: `content-body` spec, `admin-catalog` spec, `row-normalizer.spec.ts`, `columns.spec.ts`, `export.service.spec.ts`

**Interfaces:**
- Produces: H11, H12 (phần `content`; `audio` ở Task 19), H15.

- [ ] **Step 1: Test đỏ:** `PUT /:id/draft` `{ content: { ipa_us: 'ˈlʌɡɪdʒ' } }` → bản nháp có `ipa_us`; `{ ipa_uk: 'lʌg1' }` → 400 `ipa-invalid`, `char: '1'`, `field: 'ipa_uk'`;
  đọc admin trả `ipa_uk`, `ipa_us`, `ipa_source` (`{ id, name }` hoặc null). CSV: header chỉ `sense_id, revision, ipa_uk, ipa_us` → phần nội dung chỉ có hai trường
  phiên âm (không có `glossVi`, `examplesEn`…), nên bản nháp giữ mọi trường khác (`ASSUMPTION` của design §5.6 được giữ bằng test này); ô `ipa_uk` trống → không
  có trong patch; `-` → `null`; ký tự lạ → lỗi dòng `ipa-invalid` chữ Việt; `ipa_source_id` không phải uuid → lỗi dòng; xuất CSV có ba cột mới.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Cài. **Step 4:** Chạy `src/content src/content-pipeline` → PASS.
- [ ] **Step 5:** Commit `feat(api): edit ipa in admin and csv`.

### Task 13: Phiên âm của từ riêng

**Files:**
- Modify: `learning/quick-add/quick-add.controller.ts:18-34`, `quick-add.service.ts:58-72`, `content/private/my-words.schemas.ts:11-22`,
  `private-words.service.ts:134-218`
- Test: `quick-add` spec, `private-words.service.spec.ts`

- [ ] **Step 1: Test đỏ:** `new_word.ipa: '/ˈfəʊbiə/'` → bản sửa có `ipa_custom = 'ˈfəʊbiə'`; 101 ký tự → 400; PATCH `senses: [{ sense_id, ipa: '' }]` → `ipa_custom`
  null, các trường khác giữ; PATCH chỉ đổi `meaning` → `ipa_custom` giữ (DC33: mỗi nghĩa một ô).
- [ ] **Step 2–4:** Chạy đỏ, cài, chạy xanh.
- [ ] **Step 5:** Commit `feat(api): let learners note ipa on private words`.

### Task 14: `WordSense.pronunciation`

**Files:**
- Modify: `content/words/words.service.ts:14-21,66-121`
- Test: `words.service.spec.ts`

**Interfaces:**
- Produces: H9 (`audio` luôn `{ uk: null, us: null }` tới Task 17).

- [ ] **Step 1: Test đỏ:** nghĩa catalog có `ipa_uk`, `ipa_us` → `pronunciation: { uk, us, custom: null, audio: { uk: null, us: null } }`; từ riêng → `uk: null, us: null,
  custom`; không có phiên âm → ba trường null. `cardContent`, `wordPage`, `lookup` đều có trường.
- [ ] **Step 2–4:** Chạy đỏ; thêm `r.ipa_uk, r.ipa_us, r.ipa_custom` vào SQL `senses()` và `view()`; chạy xanh.
- [ ] **Step 5:** Commit `feat(api): return pronunciation with every word sense`. Mở PR BE3.

## BE4 — Giọng đọc — nhánh `feat/dot-c-be4-tts`

### Task 15: Cấu hình, kho file và route fake

**Files:**
- Modify: `apps/api/src/common/config/app-config.ts:204-406`, `apps/api/.env.example`, `apps/api/package.json` (`@aws-sdk/client-s3` 3.1156.0,
  `@google-cloud/text-to-speech` 7.2.0, ghi đúng số, không `^`)
- Create: `apps/api/src/content/audio/audio-storage.ts` (port), `r2-audio-storage.ts`, `local-audio-storage.ts`, `dev-audio.controller.ts`,
  `audio-storage.spec.ts`
- Test: `app-config.spec.ts`, `audio-storage.spec.ts`

**Interfaces:**
- Produces: `abstract class AudioStorage { put(objectKey: string, body: Buffer): Promise<void>; remove(objectKeys: string[]): Promise<void>; publicUrl(objectKey: string): string }`;
  config `audio: { storage: 'r2' | 'local' | null; publicBaseUrl: string | null }`, `tts: { provider: 'google' | 'fake' | null; voiceUk: string; voiceUs: string; credentials: { clientEmail; privateKey; projectId } | null }`.

- [ ] **Step 1: Test đỏ:** env thiếu hết → `audio.storage: null`, `tts.provider: null` (app vẫn chạy, nút loa dùng giọng trình duyệt); `GOOGLE_TTS_CREDENTIALS` không
  phải base64 của JSON có `client_email`, `private_key`, `project_id` → lỗi khởi động; `AUDIO_STORAGE_*` thiếu một trong `ENDPOINT, BUCKET, ACCESS_KEY_ID, SECRET_ACCESS_KEY`
  → lỗi "all keys together"; `TTS_FAKE_ENABLED=true` + `BILLING_PRODUCTION=true` → lỗi; tương tự `AUDIO_STORAGE_FAKE_ENABLED`. `LocalAudioStorage.put` ghi
  `<AUDIO_STORAGE_FAKE_DIR>/tts/v1/<key>.mp3` (mặc định `.tmp/audio`), `publicUrl` = `${AUDIO_PUBLIC_BASE_URL}/tts/v1/<key>.mp3`; route dev 404 khi fake tắt, trả
  `audio/mpeg` khi bật, từ chối tên file ngoài `^[a-f0-9]{64}\.mp3$`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Kiểm bằng context7 cách tạo `S3Client` cho R2 (`region: 'auto'`, `endpoint`), rồi viết `R2AudioStorage` (`PutObjectCommand` với
  `ContentType: 'audio/mpeg'`, `CacheControl: 'public, max-age=31536000, immutable'`; `DeleteObjectsCommand` theo lô 1000). Đăng ký provider theo config như
  `adapters.registrar.ts:16-21`.
- [ ] **Step 4:** Chạy → PASS. Commit `feat(api): add audio storage on r2 with a local fake`.

### Task 16: Khoá file và ký hiệu cho Google (hàm thuần)

**Files:**
- Create: `apps/api/src/content/audio/audio-key.ts`, `audio-key.spec.ts`, `google-phonemes.ts`, `google-phonemes.spec.ts`

**Interfaces:**
- Produces: `toGooglePhonemes(ipa: string, voice: 'uk' | 'us'): string | null`;
  `audioKey(voiceName: string, text: string, phonemes: string | null): string` (sha256 hex của `${voiceName}|${text}|${phonemes ?? ''}`);
  `speechTargets(senses: SenseIpa[], voices: { uk: string; us: string }): Map<string, { uk: SpeechTarget; us: SpeechTarget }>` với
  `SenseIpa = { senseId: string; lemma: string; scope: 'catalog' | 'private'; ipaUk: string | null; ipaUs: string | null }`,
  `SpeechTarget = { key: string; voiceName: string; text: string; phonemes: string | null }`.

- [ ] **Step 1: Test đỏ:**
  - `toGooglePhonemes` (bảng ký hiệu Google, `docs.cloud.google.com/text-to-speech/docs/phonemes`, đọc 07/11/2026; en-GB: `p b t d k ɡ m n ŋ f v s z θ ð ʃ ʒ h l ɹ ʧ ʤ j w æ ɑː ə ɛ ɪ iː ɒ ɔː ʊ uː ʌ ɜː aɪ aʊ eɪ eə iə ɔɪ əʊ ʊə`;
    en-US: `p b t d k ɡ m n ŋ f v s z θ ð ʃ ʒ h l ɹ ʧ ʤ j w æ ɑː ə ɚ ɛ ɪ iː ɔː ʊ uː ʌ aɪ aʊ eɪ ɔɪ oʊ`; dấu `ˈ ˌ .`):
    `('ˈlɛd','uk')` → `'ˈlɛd'`; `('ˈliːd','us')` → `'ˈliːd'`; `('led','uk')` → `'lɛd'` (e đứng riêng → ɛ); `('ˈrekɔːd','uk')` → `'ˈɹɛkɔːd'`; `('t͡ʃɝtʃ','us')` →
    `'ʧɚʧ'`; `('ˈɪnt(ə)ɹəst','uk')` → `'ˈɪntəɹəst'`; `('ˈwɔːɾɚ','us')` → `'ˈwɔːtɚ'`; `('g','uk')` → `'ɡ'`; ký hiệu không đổi được (`'ʘ'`) → `null`.
  - `speechTargets`: `lead` hai nghĩa catalog `/lɛd/`, `/liːd/` → hai khoá UK khác nhau, `phonemes` khác null; `record` mọi nghĩa cùng `ipa_uk` → một khoá UK,
    `phonemes: null`; nghĩa không phiên âm → `phonemes: null`; từ riêng `phobia` → khoá = khoá của catalog `phobia` không nhiều cách đọc; cụm `look after` có phiên âm
    và nhiều cách đọc → `phonemes: null` (Google: một `<phoneme>` cho một từ); `toGooglePhonemes` trả `null` → khoá theo chữ.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Cài. Đổi theo thứ tự: bỏ `( )`, dấu kết hợp, `ˑ`; `t͡ʃ tʃ → ʧ`, `d͡ʒ dʒ → ʤ`, `r → ɹ`, `g → ɡ`, `ɾ → t`, `ɫ → l`, US `ɝ → ɚ`,
  UK `ɝ → ɜː`, UK `e` không đứng trước `ɪ`/`ə` → `ɛ`, US `o` không đứng trước `ʊ` → `oʊ`; rồi tách tham lam theo bảng của giọng; còn ký tự lạ → `null`.
  "Nhiều cách đọc cho giọng X" = các nghĩa **catalog** đang hiện cùng `lemma` có hơn một giá trị `toGooglePhonemes(ipaX)` khác null khác nhau.
- [ ] **Step 4:** Chạy → PASS. Commit `feat(api): derive tts keys and google phonemes`.

### Task 17: Bảng `speech_audio`, tạo dòng sau khi đăng, URL trong `WordSense`

**Files:**
- Create: migration `20261107130000_dot_c_speech_audio/migration.sql`, `apps/api/src/content/audio/audio.service.ts`, `audio.queries.ts`, `audio.service.spec.ts`
- Modify: `content.prisma`, `content/content.service.ts` (thêm `ensureAudio`), `content/senses/publish.service.ts:48-76` (sau commit), `content-pipeline/publish/publish-job.handler.ts`
  (đi qua `publishItem`, không sửa nếu `publishItem` đã gọi), `learning/quick-add/quick-add.service.ts` (sau transaction), `content/private/my-words.controller.ts`
  (sau PATCH), `content/words/words.service.ts` (`audio`)

**Interfaces:**
- Consumes: `speechTargets` (Task 16), `AudioStorage.publicUrl` (Task 15).
- Produces: model `SpeechAudio { key String @id; voice String; voiceName String; text String; phonemes String?; status String; attempts Int; lastError String?; charCount Int?; createdAt; updatedAt; readyAt DateTime? }`
  (`@@map("speech_audio")`, index `(status, updated_at)`); `AudioService.ensureForSenses(senseIds: string[]): Promise<string[]>` (trả khoá mới tạo, không bao giờ ném;
  lỗi → log `audio_ensure_failed`); `ContentService.ensureAudio(senseIds)`; `AudioService.urlsFor(senses: SenseIpa[]): Promise<Map<string, { uk: string | null; us: string | null }>>`.

- [ ] **Step 1: Test đỏ:** đăng một nghĩa `record` (danh từ) → hai dòng `pending` (uk, us), hai việc được đẩy; đăng lại cùng nội dung → không dòng mới, không việc mới
  (`INSERT … ON CONFLICT (key) DO NOTHING`); đăng `record` (động từ) với phiên âm UK khác → khoá mới cho **cả hai** nghĩa `record` (`ensureForSenses` mở rộng ra mọi
  nghĩa catalog đang hiện cùng lemma); đẩy việc lỗi (Redis tắt) → dòng vẫn `pending`, đăng vẫn thành công; `quickPublish` và tạo từ riêng gọi `ensureAudio` **sau**
  commit (mock thứ tự gọi); `WordSense.pronunciation.audio.uk` = URL khi dòng `ready`, null khi `pending` / `failed` / chưa có; `tts.provider: null` → `ensureForSenses`
  không làm gì.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Cài; `urlsFor` một truy vấn `speech_audio WHERE key = ANY(...) AND status = 'ready'` cho cả danh sách nghĩa.
- [ ] **Step 4:** Chạy `src/content src/learning` → PASS. Commit `feat(api): queue speech audio when senses are published`.

### Task 18: Adapter TTS và worker `content-tts`

**Files:**
- Create: `apps/api/src/content/audio/tts-adapter.ts` (port), `google-tts.adapter.ts`, `fake-tts.adapter.ts`, `tts-queue.service.ts`, `tts-worker.service.ts`,
  `tts-worker.service.spec.ts`, `google-tts.adapter.spec.ts`
- Modify: `apps/api/src/settings/settings.definitions.ts` (khối `tts`, H14), `content.module.ts`

**Interfaces:**
- Produces: `abstract class TtsAdapter { synthesize(req: { voiceName: string; text: string; phonemes: string | null }): Promise<TtsOutcome> }`,
  `TtsOutcome = { ok: true; audio: Buffer; chars: number } | { ok: false; kind: 'transient' | 'permanent'; message: string }`; hàng `content-tts`, job `{ key }`.

- [ ] **Step 1: Test đỏ:**
  - Google adapter (client mock): `phonemes` null → `input: { text }`; có → `input: { ssml: '<speak><phoneme alphabet="ipa" ph="ˈlɛd">lead</phoneme></speak>' }`
    (chữ được escape XML); `voice: { languageCode: 'en-GB', name }`, `audioConfig: { audioEncoding: 'MP3' }`; gRPC `INVALID_ARGUMENT` → `permanent`; `UNAVAILABLE`,
    `RESOURCE_EXHAUSTED`, `DEADLINE_EXCEEDED`, lỗi mạng → `transient`; `chars` = độ dài chuỗi gửi đi.
  - Fake: trả mp3 nhỏ cố định (ID3 header + 1 frame), `chars` như trên; chữ `fail:permanent` → `permanent`, `fail:twice` → `transient` hai lần rồi ok.
  - Worker: `pending` → gọi adapter → `storage.put` → `ready`, `ready_at`, `char_count`; `transient` → `attempts + 1`, ném lỗi để BullMQ thử lại (attempts 3, backoff
    exponential 5000); lần cuối → `failed`, `last_error`; `permanent` → `failed` ngay, không thử lại (`UnrecoverableError`); dòng đã `ready` → bỏ qua; tổng `char_count` của
    dòng `ready_at` hôm nay (UTC) + chữ sắp gửi > `tts.daily_char_cap` → không gọi Google, đẩy lại việc với `delay` tới 00:00 UTC hôm sau.
  - Cài đặt: `tts.daily_char_cap` mặc định 120000, 1000001 → 400.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Kiểm bằng context7: `new TextToSpeechClient({ credentials: { client_email, private_key }, projectId })` và `synthesizeSpeech`. Hàng theo mẫu
  `ai/eval/eval-queue.service.ts:15-52` (Worker chỉ khi `pipeline.runWorkers`, prefix `JOB_QUEUE_PREFIX`, `concurrency: 4`). Hạn mức Google 1.000 yêu cầu / phút một
  project (`docs.cloud.google.com/text-to-speech/quotas`, đọc 07/11/2026), nên 4 việc song song không cần giới hạn tốc độ thêm.
- [ ] **Step 4:** Chạy → PASS. Commit `feat(api): synthesize speech audio in a background queue`.

### Task 19: Vòng quét, dọn file, trạng thái ở admin

**Files:**
- Modify: `tts-queue.service.ts` (job scheduler `sweep` 5 phút, `cleanup` mỗi tuần), `audio.service.ts`, `content/catalog/admin-catalog.controller.ts`,
  `admin-catalog.queries.ts`, `content/senses/admin-senses.controller.ts`
- Test: `tts-queue.service.spec.ts`, `audio.service.spec.ts`, admin catalog spec

**Interfaces:**
- Produces: H12 (`audio`), H13; `AudioService.sweep(now: Date): Promise<number>`, `AudioService.cleanup(now: Date): Promise<number>`.

- [ ] **Step 1: Test đỏ:** `sweep` đẩy lại dòng `pending` có `updated_at` cũ hơn 10 phút, không đụng dòng mới hơn; `cleanup` tính khoá của mọi nghĩa đang hiện (catalog +
  từ riêng), xoá dòng và file không nằm trong đó **và** `updated_at` cũ hơn 7 ngày; dòng không dùng nhưng mới 2 ngày → giữ; `storage.remove` lỗi → dòng giữ lại, lần
  sau thử lại. Admin: `GET` nghĩa trả `audio.uk.status: 'failed'`, `error`; `POST /:id/audio/retry` → dòng `failed` thành `pending`, `attempts: 0`, `202 { retried: 1 }`;
  `editor` có `content.edit` gọi được; người không có quyền → 403.
- [ ] **Step 2–4:** Chạy đỏ, cài, chạy `src/content` xanh; `pnpm lint`, `tsc --noEmit`.
- [ ] **Step 5:** Commit `feat(api): sweep, clean up and retry speech audio`. Mở PR BE4.

## BE5 — Nạp dữ liệu và kiểm cuối — nhánh `feat/dot-c-be5-backfill`

### Task 20: Lệnh dựng CSV phiên âm từ Wiktionary

**Files:**
- Create: `apps/api/src/cli/ipa-build-csv.ts`, `ipa-build-csv-args.ts`, `apps/api/src/content/audio/wiktextract.ts`, `wiktextract.spec.ts`,
  `apps/api/scripts/fixtures/wiktextract-sample.jsonl`
- Modify: `apps/api/package.json` (`"ipa:build-csv": "node dist/cli/ipa-build-csv.js"`)

**Interfaces:**
- Produces: `pickIpa(entry: WiktextractEntry): { uk: string | null; us: string | null }`; CLI
  `pnpm ipa:build-csv --in <raw-wiktextract.jsonl.gz> --out <file.csv> --source-id <uuid>`.

- [ ] **Step 1 (kiểm dữ liệu thật trước, `ASSUMPTION` của design §8):** tải bản raw Wiktextract (`kaikki.org/dictionary/rawdata.html`: JSONL nén 2,9 GB, mọi ngôn ngữ),
  lọc `lang_code === 'en'` cho `lead`, `record`, `read`, `live`, `luggage` vào fixture; ghi lại cấu trúc `sounds[]` thật (trường `ipa`, `tags` như `UK`,
  `Received-Pronunciation`, `US`, `General-American`) và cách tách mục theo loại từ / nguồn gốc. Cấu trúc khác giả định dưới thì sửa `pickIpa` theo dữ liệu thật,
  ghi vào as-built.
- [ ] **Step 2: Test đỏ** trên fixture: `lead` danh từ (kim loại) → `{ uk: 'lɛd', us: 'lɛd' }`; `lead` động từ → `{ uk: 'liːd', us: 'liːd' }`; mục chỉ có IPA không tag →
  dùng cho cả hai; ưu tiên tag `Received-Pronunciation` > `UK` cho UK, `General-American` > `US` cho US; IPA kiểu `[ˈlɪi̯d]` (ngoặc vuông, phiên âm hẹp) → bỏ, chỉ
  nhận `/…/`; nhiều giá trị → lấy cái đầu.
- [ ] **Step 3:** Cài: CLI đọc DB các nghĩa catalog đang hiện (`sense_id`, `revision` sống, `lemma`, `pos`), đọc dòng gz theo luồng, khớp theo (`lemma`, `pos`), ghi CSV
  `headword,pos,sense_id,revision,ipa_uk,ipa_us,ipa_source_id` (chỉ dòng có ít nhất một phiên âm qua `checkIpa`), in số khớp / không khớp. Không ghi DB.
- [ ] **Step 4:** Chạy → PASS. Commit `feat(api): build an ipa csv from wiktionary data`.

### Task 21: Lệnh `tts:backfill`

**Files:**
- Create: `apps/api/src/cli/tts-backfill.ts`, `tts-backfill.spec.ts`; Modify: `package.json` (`"tts:backfill": "node dist/cli/tts-backfill.js"`)

- [ ] **Step 1: Test đỏ:** chạy trên 3 nghĩa không có file → 6 dòng `pending`, 6 việc; chạy lại → 0 dòng mới; `tts.provider: null` → thoát mã 1 với dòng
  "TTS chưa cấu hình".
- [ ] **Step 2–4:** Cài bằng `AudioService.ensureForSenses` theo lô 500 nghĩa; chạy xanh.
- [ ] **Step 5:** Commit `feat(api): backfill speech audio for the catalog`.

### Task 22: Trang nguồn dữ liệu hiện nguồn phiên âm

**Files:**
- Modify: `apps/api/src/content/sources/sources.service.ts:62-69`, `THIRD_PARTY_NOTICES.md` (dòng Wiktionary: CC BY-SA 4.0, link, ghi chú "đã chuẩn hoá ký hiệu")
- Test: `sources.service.spec.ts`

- [ ] **Step 1: Test đỏ:** nguồn `Wiktionary` (`third_party`) được dùng làm `ipa_source_id` của một bản đang đăng của nghĩa catalog đang hiện → có trong `GET /v1/sources`;
  chỉ dùng ở bản nháp → không có.
- [ ] **Step 2–4:** Thêm nhánh thứ ba vào `sourceShownCondition`; chạy xanh.
- [ ] **Step 5:** Commit `feat(api): list the ipa source on the data sources page`.

### Task 23: Smoke, chạy lại smoke cũ, tài liệu

**Files:**
- Create: `apps/api/scripts/smoke-dot-cai-thien-c.mjs`, `docs/deliveries/dot-cai-thien-c-smoke-output.txt`
- Modify: `apps/api/package.json` (`"smoke:dot-cai-thien-c"`), `docs/deliveries/deploy-checklist.md` (mục "Đợt C"), `docs/deliveries/dot-cai-thien-c.md` (as-built BE)

- [ ] **Step 1:** Smoke theo mẫu `smoke-nhom-b.mjs` (API + worker thật, `TTS_FAKE_ENABLED=true`, `AUDIO_STORAGE_FAKE_ENABLED=true`, `JOB_QUEUE_PREFIX=wordmet-c-smoke`,
  DB mới `english_learning_smoke_c`; dừng nếu env nói khác). Các bước, mỗi bước in `OK`/`FAIL`:
  1. Học: từ mới `Đã biết` → nấc 1 hạn mai; đặt tay item nấc 3 đến hạn → `Đã biết` không đổi; `Cần ôn lại` → nấc 1 ưu tiên.
  2. Ôn: mở phiên `recall` khi đang có phiên `practice` mở → phiên `practice` vẫn `active`; `usage_records` không thêm dòng; trả lời đúng từ ưu tiên → nấc 1 hạn mai
     (DC26); đúng từ đến hạn nấc 3 → nấc 4; hai yêu cầu đúng song song cho cùng từ ở hai phiên Ôn của hai nhóm → nấc tăng đúng 1.
  3. Chuỗi: lần lật thẻ đầu ngày trả `streak.days`, lần hai `null`; `studied` của ngày thêm từ (không học) là `false`.
  4. Phiên âm và giọng: admin quick-publish `lead` hai nghĩa `/lɛd/`, `/liːd/` → 4 dòng `speech_audio` thành `ready` trong 30 s; `GET /v1/words/lead` có hai URL UK khác
     nhau và `GET` từng URL trả `audio/mpeg`; CSV chỉ cột phiên âm giữ nguyên `gloss_vi`.
- [ ] **Step 2:** Chạy `pnpm smoke:dot-cai-thien-c` hai lần, mỗi lần trên DB mới; chạy lại `smoke:buoc-4`, `smoke:buoc-5` (hai chế độ `fetchState`) vì đụng Practice và hạn
  mức; lưu output vào `docs/deliveries/dot-cai-thien-c-smoke-output.txt`.
- [ ] **Step 3:** `deploy-checklist.md`: biến môi trường mới (`GOOGLE_TTS_CREDENTIALS`, `TTS_VOICE_UK`, `TTS_VOICE_US`, `AUDIO_STORAGE_ENDPOINT`, `AUDIO_STORAGE_BUCKET`,
  `AUDIO_STORAGE_ACCESS_KEY_ID`, `AUDIO_STORAGE_SECRET_ACCESS_KEY`, `AUDIO_PUBLIC_BASE_URL`, web `NEXT_PUBLIC_AUDIO_BASE_URL`), việc của chủ dự án (Google Cloud project,
  billing + cảnh báo ngân sách, service account, bucket R2 + tên miền `audio.wordmet.com`, nghe thử 10 từ §7 rồi chọn giọng, `ipa:build-csv` → nhập CSV → đăng hàng
  loạt → `tts:backfill`), chính sách bảo mật (thêm Google Cloud Text-to-Speech vào bên xử lý: chỉ chữ của từ, kể cả từ riêng; sửa câu "không gửi từ vựng của bạn cho
  Google" ở đoạn AdSense; văn bản đăng qua `/legal`).
- [ ] **Step 4:** Commit `test(api): smoke round c learn, recall, streak and audio` và `docs(deliveries): record round c backend as built`. Mở PR BE5.

## FE1 — Học / Ôn và chuỗi ngày trên web — nhánh `feat/dot-c-fe1-learn-recall-web`

Bắt đầu khi BE1, BE2 đã vào `dev`. Mỗi task: chạy `impeccable` chế độ *shape* trên mockup `docs/mockups/2026-11-06-dot-cai-thien-c/index.html` trước khi code,
*harden* sau khi test xanh. Test theo role và chữ hiển thị.

### Task 24: Cặp nút Học · Ôn và "đã thuộc"

**Files:**
- Create: `apps/web/src/features/learner/groups/deck-actions.ts` (hàm thuần), `deck-actions.test.ts`, `apps/web/src/features/learner/groups/DeckButtons.tsx`
- Modify: `features/learner/groups/GroupCard.tsx:46-110`, `GroupPage.tsx:85-125`, `features/learner/today/TodayPage.tsx:109-144`, `apps/web/messages/{vi,en}.json`
- Test: `groups/group-list.test.tsx`, `groups/group-page.test.tsx`, `today/today.test.tsx`

**Interfaces:**
- Produces: `deckActions(summary: GroupSummary): { learn: 'new' | 'all' | null; recall: 'due' | 'practice' | null; doneToday: boolean }`;
  `mastered(summary: GroupSummary): number` = `cells[4].total + cells[5].total`.

- [ ] **Step 1: Test đỏ** (4 trạng thái §4.1): có đến hạn + có mới → nút "Học" (link `review?group=…&mode=new`) và "Ôn" (`recall?group=…`); chỉ có từ mới → chỉ "Học";
  không còn gì hôm nay, có từ đã học → chip "Xong hôm nay" + nút "Ôn tập" (`recall?group=…`) + "Học" mode `all`; có đến hạn, không có mới → "Học" (`mode=all`) · "Ôn".
  Không nút nào có số. Dòng trang nhóm `"40 từ · 8 từ đến hạn · 5 từ mới · 12 từ đã thuộc"`; thẻ nhóm `"120 từ · 47 đã thuộc"`.
- [ ] **Step 2:** Chạy → FAIL. **Step 3:** Cài; nút Ôn nền `--accent`, cùng cỡ nút Học. **Step 4:** Chạy → PASS.
- [ ] **Step 5:** Commit `feat(web): split decks into learn and recall`.

### Task 25: Trang Học theo mode

**Files:**
- Modify: `features/learner/review/use-review-queue.ts:23-35`, `ReviewSession.tsx`, `ReviewSummary.tsx`, `features/learner/groups/groups-api.ts` (kiểu `Card`, `QueueMode`)
- Test: `review/review-session.test.tsx`

- [ ] **Step 1: Test đỏ:** `mode=new` đọc `GET /v1/groups/:id/queue?mode=new`; xong phiên Học còn từ đến hạn → tổng kết có nút "Ôn" tới `recall?group=…`; nhấn
  "Đã biết" ở thẻ đã học không hiện chữ "lên nấc".
- [ ] **Step 2–4:** Chạy đỏ, cài, chạy xanh. **Step 5:** Commit `feat(web): open learn sessions on new words`.

### Task 26: Trang Ôn và màn xong phiên

**Files:**
- Create: `apps/web/src/app/[locale]/app/(member)/recall/page.app.tsx`, `features/learner/recall/RecallSession.tsx`, `RecallSummary.tsx`, `recall-session.test.tsx`
- Modify: `features/learner/practice/practice-api.ts` (H3, H4, H6, H7), `practice/session/use-practice-session.ts` (nhận `kind`), `practice/session/AnswerFeedback.tsx`
  (ẩn "Đã biết" khi `recall`)

- [ ] **Step 1: Test đỏ:** vào `/app/recall?group=g1` → `POST /v1/practice/sessions` `{ kind: 'recall', source: 'group', group_id: 'g1' }` với `Idempotency-Key`, không có
  màn Tùy chỉnh; câu sai → nút "Cần ôn lại" (gọi `POST /v1/practice/items/:id/review` `needs_review`), không có "Đã biết"; xong 8 câu → `"Xong 8 từ."`, ô
  "Đúng, lên nấc 3", "Sai, giữ nấc 3", "Cần ôn lại 1"; ô "Đúng, giữ nấc" chỉ khi `correct_kept > 0`; nhóm còn từ mới (`today.new` của `GET /v1/groups`) → `"Còn 5 từ mới
  trong nhóm này"` + nút "Học" · "Về trang chủ"; 409 `nothing-learned` → trạng thái rỗng có nút "Học".
- [ ] **Step 2–4:** Chạy đỏ, cài (dùng lại `QuestionCard`, `McqQuestion`, `TypeWordQuestion`, `AnswerFeedback`, `HintPanel`), chạy xanh.
- [ ] **Step 5:** Commit `feat(web): add the recall session and its summary`.

### Task 27: StreakToast

**Files:**
- Create: `apps/web/src/app-ui/StreakToast.tsx`, `streak-toast.test.tsx`, `apps/web/src/app-ui/streak.ts` (store nhỏ `showStreak(days)`)
- Modify: `app-shell/AppProviders.tsx:53`, `review/use-review-queue.ts:49-73`, `practice/session/use-practice-session.ts` (khi response có `streak`)

- [ ] **Step 1: Chạy `emil-design-eng`** cho chuyển động: lửa nảy một lần (transform `scale`, ≤ 300 ms, spring nhẹ), toast vào từ đáy, tự tắt sau 3 s, không động khi
  `prefers-reduced-motion`.
- [ ] **Step 2: Test đỏ:** response `streak: { days: 13 }` → `role="status"` có `"13 ngày liên tiếp"`; sau 3 s biến mất (fake timers); `streak: null` → không hiện; hai
  response có `streak` liền nhau → chỉ một toast (thay cái cũ).
- [ ] **Step 3–4:** Cài, chạy xanh. Đặt toast đáy giữa, trên vùng nút trả lời ở điện thoại (`bottom` tính theo `env(safe-area-inset-bottom)` + chiều cao thanh nút).
- [ ] **Step 5:** Chạy `anthropic-skills:web-design-guidelines` trên `StreakToast.tsx`, `DeckButtons.tsx`, `RecallSession.tsx`, `RecallSummary.tsx`; sửa điểm a11y.
  Rồi `pnpm --filter web test`, `pnpm --filter web lint`, typecheck; chụp màn hình 4 trạng thái thẻ nhóm, phiên Ôn, màn xong phiên, toast ở 375 px và 1280 px bằng
  `pnpm dev:app`. Commit `feat(web): show the study streak after the first study of the day`. Mở PR FE1.

## FE2 — Phiên âm và giọng đọc trên web và admin — nhánh `feat/dot-c-fe2-pronunciation`

Bắt đầu khi BE3, BE4 đã vào `dev`. Mockup `docs/mockups/2026-11-06-dot-cai-thien-c/ipa.html`.

### Task 28: Admin: ô phiên âm, trạng thái giọng, trần ký tự

**Files:**
- Modify: `apps/admin/src/features/senses/SenseDetail.tsx:28,197-241`, `senses-api.ts:83-87`, `apps/admin/src/features/settings/SettingsPage.tsx` (khối `tts`)
- Test: `senses/SensesPage.test.tsx` (hoặc spec SenseDetail mới), `settings/SettingsPage.test.tsx`

- [ ] **Step 1: Test đỏ:** form có "Phiên âm UK", "Phiên âm US"; gõ `/ˈlʌɡ.ɪdʒ/` lưu → body `ipa_uk: 'ˈlʌɡ.ɪdʒ'`; 400 `ipa-invalid` → lỗi dưới ô: `"Ký hiệu “1” không có trong bảng
  phiên âm."`; dòng nguồn "Nguồn: Wiktionary" hoặc "Nguồn: Wordmet" khi `ipa_source` null; trạng thái "Có giọng" / "Đang tạo" / "Lỗi" + nội dung lỗi + nút "Tạo lại"
  (gọi H13); trang Cài đặt có ô "Trần ký tự TTS mỗi ngày" mặc định 120000.
- [ ] **Step 2–4:** Chạy đỏ, cài, chạy xanh. **Step 5:** Commit `feat(admin): edit ipa and see speech audio state`.

### Task 29: `Pronounce` và CSP `media-src`

**Files:**
- Modify: `apps/web/src/app-ui/SpeakButtons.tsx`, `speech.ts`, `apps/web/src/lib/csp.ts:54-71`, `lib/app-csp.ts:14-33`, `.env.example` của web
- Create: `apps/web/src/app-ui/audio-player.ts` (một `Audio` dùng chung)
- Test: `app-ui/SpeakButtons.test.tsx`, `lib/csp.test.ts`, `lib/app-csp.test.ts`

**Interfaces:**
- Produces: `<Pronounce text={string} voice="uk" | "us" audioUrl={string | null} />`; `playAudio(url: string): Promise<void>` (dừng file đang phát); CSP thêm
  `media-src 'self' <origin của NEXT_PUBLIC_AUDIO_BASE_URL>`.

- [ ] **Step 1:** Chạy `emil-design-eng` cho trạng thái đang phát của nút loa (biểu tượng đổi, không nhảy kích thước).
- [ ] **Step 2: Test đỏ:** có URL → `HTMLAudioElement.play` với URL đó; bấm nút khác khi đang phát → file cũ `pause`; `play()` reject hoặc `error` → `speechSynthesis` giọng
  tương ứng; không URL và máy không có giọng UK → nút UK mờ (`aria-disabled`), rê / focus thấy `"Đang tạo giọng đọc"` (DC34); phím space, 1, 2 không nổi lên; CSP có
  `media-src 'self' https://audio.wordmet.com` khi env đặt, chỉ `'self'` khi trống.
- [ ] **Step 3–4:** Cài, chạy xanh. **Step 5:** Commit `feat(web): play pre-made pronunciation audio`.

### Task 30: Dòng phiên âm ở thẻ, trang một từ, tra từ, form từ riêng

**Files:**
- Create: `apps/web/src/features/learner/word/pronunciation.ts` (hàm thuần), `pronunciation.test.ts`, `apps/web/src/app-ui/PronunciationLine.tsx`
- Modify: `features/learner/review/Flashcard.tsx:64,76`, `word/WordPage.tsx:69-72`, `word/SenseBlock.tsx`, `add-word/AddWordSheet.tsx` (kết quả tra),
  `add-word/EditSuggestionForm.tsx:17,53-89`, `word/MyWordDialogs.tsx:52-104`, kiểu `groups-api.ts`, `word-api.ts`, `add-word-api.ts`, `messages/{vi,en}.json`
- Test: `review/review-session.test.tsx`, `word` tests, `add-word` tests

**Interfaces:**
- Produces: `blockPronunciation(senses: PageSense[]): { shared: Pron; perSense: Map<string, Pron> }` (phiên âm chung của khối = nghĩa đầu; nghĩa khác chung thì vào
  `perSense`).

- [ ] **Step 1: Test đỏ:** thẻ flashcard hai mặt có `UK /ˈlʌɡ.ɪdʒ/` và `US /ˈlʌɡɪdʒ/` cạnh hai nút loa; trang `lead`: khối danh từ dòng `UK /lɛd/`, khối động từ
  `/liːd/`; nghĩa có phiên âm khác của khối hiện dòng riêng dưới nghĩa đó; không còn nút loa chung đầu trang; nghĩa không phiên âm → chỉ hai nút loa; từ riêng có
  `custom` → một dòng `/…/` không chia UK / US; kết quả tra có dòng phiên âm; form từ riêng có ô "Phiên âm" gợi ý `"Không bắt buộc."`, gửi `ipa` (H10), sửa từ có
  nhiều nghĩa → mỗi nghĩa một ô.
- [ ] **Step 2–4:** Chạy đỏ, cài, chạy xanh. **Step 5:** Commit `feat(web): show uk and us ipa beside each word`.

### Task 31: Review UI và kiểm trên bản build

**Files:** không thêm file code ngoài các sửa do review tìm ra.

- [ ] **Step 1:** `break-ui` trên `PronunciationLine`, `DeckButtons`, `RecallSummary`, `StreakToast` (phiên âm 100 ký tự, `look after`, chỉ US, không phiên âm, chuỗi 1000
  ngày, nhóm 0 từ đã học); sửa chỗ vỡ.
- [ ] **Step 2:** `impeccable` *polish* + mục "Interactivity and States", "Content" của `taste-skill:redesign-skill` trên các màn của FE1, FE2; rồi
  `anthropic-skills:web-design-guidelines` trên `Pronounce`, `PronunciationLine`, form từ riêng, `SenseDetail`.
- [ ] **Step 3:** `pnpm cf:docker` (CSP chỉ chạy ở bản build production, `app-csp.ts:28`): mở trang một từ với API + worker fake, bấm loa UK → Console không có vi phạm CSP,
  tab Network có request mp3 `200`. Chụp màn hình 375 px và 1280 px.
- [ ] **Step 4:** `pnpm --filter web test`, `--filter admin test`, lint, typecheck. Commit sửa (nếu có) `fix(web): …` theo luật hai commit khi là lỗi. Mở PR FE2.
- [ ] **Step 5:** Viết `docs/deliveries/dot-cai-thien-c-checklist.md` (luồng chủ dự án tự chạy: Học / Ôn trên máy, kiểm "Đã biết" ở Học không còn lên nấc, toast,
  phiên âm, nút loa) và as-built FE vào `docs/deliveries/dot-cai-thien-c.md`.

---

## Xong khi

- CI xanh ở mọi PR; `smoke:dot-cai-thien-c` qua hai lần trên DB mới; `smoke:buoc-4`, `smoke:buoc-5` (hai chế độ) qua sau BE1.
- Ảnh chụp các màn mới ở 375 px và 1280 px; `pnpm cf:docker` không có vi phạm CSP khi phát file.
- **Việc của chủ dự án:** tạo project Google Cloud, bật billing và cảnh báo ngân sách, tạo service account key, tạo bucket R2 + tên miền; nghe thử ~10 từ (`lead` hai
  nghĩa, `record` hai loại từ, `read`, `live`, `a`, `the`, `look after`) bằng 2–3 giọng WaveNet mỗi vùng rồi chọn `TTS_VOICE_UK`, `TTS_VOICE_US`; chạy
  `ipa:build-csv` → nhập CSV → đăng hàng loạt → `tts:backfill`; tự chạy checklist.
