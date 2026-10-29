# Nhóm B — hợp đồng chung của các plan (29/10/2026)

Design: [`../specs/2026-10-29-nhom-b-chat-luong-ai-design.md`](../specs/2026-10-29-nhom-b-chat-luong-ai-design.md). File này chốt **tên** dùng chung giữa sáu plan, để các
plan viết song song vẫn khớp nhau. Plan nào cần một tên chưa có ở đây thì tự đặt trong plan của mình, miễn là chỉ plan đó dùng. Hai plan cùng dùng một tên thì tên đó phải
có ở đây; plan viết sau sửa file này nếu thiếu, không tự đặt tên khác.

## 1. Milestone, thứ tự, nhánh

Chủ dự án chốt 29/10/2026: **một plan** (`2026-10-29-nhom-b.md`), làm **tuần tự**. Mỗi milestone một nhánh từ `origin/dev` sau khi milestone trước merge.

| Milestone | Design | Nhánh code |
|---|---|---|
| M1 Golden set | P1 / K1 | `feat/nhom-b-m1-golden-set` |
| M2 Vòng đời cấu hình | P3 / K3 | `feat/nhom-b-m2-configs` |
| M3 Judge | P2 / K2 | `feat/nhom-b-m3-judge` |
| M4 Câu thật | P4 / K4 | `feat/nhom-b-m4-real-questions` |
| M5 Dashboard | P5 / K5 | `feat/nhom-b-m5-dashboard` |
| M6 D7/D30 | P6 / K6 | `feat/nhom-b-m6-retention` |

Cột "Plan" ở các bảng dưới dùng tên P của design; M tương ứng theo bảng trên.

Bốn câu thêm sau review (design §0) đã chốt 30/10/2026 (D37–D40): Q-R1, Q-R1b chạm P3 (M2), Q1 chạm P3 và P2 (M2, M3), Q-R3 chạm P6 (M6). Không còn câu chờ.

## 2. Kiểu (TypeScript, `apps/api`)

| Tên | Định nghĩa | File | Plan tạo |
|---|---|---|---|
| `EvalSplit` | `'dev' \| 'held_out'` | `src/ai/eval/eval.types.ts` | P1 |
| `ExampleSource` | `'manual' \| 'import' \| 'report' \| 'real_judge'` | `src/ai/eval/eval.types.ts` | P1 |
| `RuleStatus` | `'pass' \| 'fail' \| 'skipped' \| 'not_applicable'` | `src/ai/eval/eval.types.ts` | P1 |
| `RuleResult` | `{ status: RuleStatus; problems: string[]; reason: 'not-in-catalog' \| 'no-rules' \| null }` | `src/ai/eval/eval.types.ts` | P1 |
| `ExpectedForms` | `{ forms: string[] }` (cloze, meaning) | `src/ai/eval/expected.ts` | P1 |
| `ExpectedLookup` | `{ lemma: string; part_of_speech: string }` | `src/ai/eval/expected.ts` | P1 |
| `ExpectedVerdict` | `{ verdict: string }` (`check_private_word`) | `src/ai/eval/expected.ts` | P1 |
| `EvalRules` (port) | `{ check(op: AiOperation, input: Record<string, unknown>, output: Record<string, unknown>): Promise<RuleResult>; formsOf(word: string, partOfSpeech: string): Promise<string[] \| null>; matchesExpected(op: 'generate_cloze' \| 'generate_meaning_question', output: Record<string, unknown>, expected: ExpectedForms): boolean }` | `src/ai/eval/eval-rules.port.ts` | P1 |
| `GatewayOperation` | `AiOperation \| 'judge'` | `src/ai/ai.types.ts` | P2 |
| `AiPurpose` | thêm `'judge'` → `'learner' \| 'test' \| 'eval' \| 'judge'` | `src/ai/ai.types.ts` | P2 |
| `JudgeVerdict` | `'pass' \| 'fail_major' \| 'fail_minor'` | `src/ai/judge/judge.types.ts` | P2 |
| `JudgeCriterion` | `{ code: string; question: string }` | `src/ai/judge/judge.types.ts` | P2 |
| `JudgeSubject` | `{ subjectId: string; input: Record<string, unknown>; output: Record<string, unknown>; context: { session_words: string[] } \| null }` | `src/ai/judge/judge.types.ts` | P2 |
| `ConfigStatus` | `'draft' \| 'published' \| 'retired'` | `src/ai/configs/configs.types.ts` | P3 |

## 3. Bảng (Prisma, `apps/api/prisma/models/ai.prisma` trừ khi ghi khác)

| Model → bảng | Plan | Cột chính (theo design §4) |
|---|---|---|
| `AiEvalExample` → `ai_eval_examples` | P1 sửa | thêm `split`, `expected` Json?, `source`, `sourceRef` `source_ref`?, `revealedAt` `revealed_at`? |
| `AiEvalSet` → `ai_eval_sets` | P1 | `operation`, `version`, `heldOutRatio` `held_out_ratio`, `frozenBy`, `frozenAt` |
| `AiEvalSetItem` → `ai_eval_set_items` | P1 | `setId`, `exampleId`, `split`, `input`, `expected`, `revealedAt`? |
| `AiEvalRun` → `ai_eval_runs` | P1 sửa, P3 sửa, P2 sửa | P1: `setId`?, `priceInput`?, `priceOutput`?, bỏ `items`; P3: `configId`?, `configVersion`? (thay `promptRevision` / `draft` cho lần chạy mới); P2: `hiddenAt` `hidden_at`? (lần chạy có nhãn bị "xóa" thì ẩn; cổng publish và dashboard bỏ qua) |
| `AiEvalRunItem` → `ai_eval_run_items` | P1 | `runId`, `exampleId`, `split`, `input`, `expected`?, `status`, `reason`?, `output`?, `rawOutput`?, `rule` Json?, `expectedResult` (`pass` / `fail` / NULL), `latencyMs`?, `costUsd`?, `hidden` (ẩn khi "xóa" lần chạy có nhãn) |
| `AiConfig` → `ai_configs` | P3 | design §4 |
| `AiLiveConfig` → `ai_live_configs` | P3 | `operation` PK, `configId`, `previousConfigId`?, `version` |
| `AiConfigEvent` → `ai_config_events` | P3 | `operation`, `kind` (`publish` / `rollback`), `configId`, `fromConfigId`?, `candidateRunId`?, `baselineRunId`?, `warnings` Json, `actorId`, `at` |
| `AiJudge`, `AiJudgeRevision`, `AiJudgePass`, `AiJudgePassItem`, `AiJudgeScore`, `AiLabel` | P2 | design §4; `AiJudgePass.kind` có sẵn giá trị `real` từ P2 (P4 dùng) |

## 4. Hàm giữa các module

| Hàm | Chữ ký | Plan |
|---|---|---|
| `AiService.registerEvalRules` | `(rules: EvalRules): void` | P1 |
| Practice provider đăng ký port | `PracticeEvalRules` trong `src/practice/eval-rules/practice-eval-rules.ts`, gọi `ai.registerEvalRules(this)` ở `onModuleInit` | P1 |
| `ContentService.catalogPracticeSensesByLemma` | `(lemma: string, pos: string \| null, nativeLanguage: 'vi' \| 'en'): Promise<PracticeSense[]>` (chỉ mục `scope = 'catalog'`; `pos` null = mọi từ loại) | P1 |
| `AiService.createEvalExample` | `(args: { operation: AiOperation; input: Record<string, unknown>; expected: Record<string, unknown> \| null; note: string \| null; source: ExampleSource; sourceRef: string \| null; actorId: string }): Promise<{ id: string }>` (luôn `split = 'dev'`) | P1 |
| `AiService.liveConfigNumber` | `(op: AiOperation): Promise<{ number: number; model: string \| null } \| null>` | P3 |
| `AiService.startJudgePass` | `(args: { judgeId: string; kind: 'real'; filters: Record<string, unknown>; subjects: JudgeSubject[]; actorId: string }): Promise<{ passId: string }>` | P2 |
| `AiService.latestJudgeRevision` | `(judgeId: string): Promise<{ id: string; revision: number } \| null>` | P2 |
| `AiService.judgedSubjects` | `(judgeRevisionId: string, subjectIds: string[]): Promise<Set<string>>` | P2 |
| `AiService.callContents` | `(operationIds: string[]): Promise<Map<string, { request: unknown; response: string \| null }>>` | P2 (P4 dùng) |
| `IdentityService.staffUserIds` | `(): Promise<string[]>` | P4 |
| `IdentityService.registrations` | `(from: Date, to: Date): Promise<Array<{ userId: string; createdAt: Date; emailVerified: boolean; staff: boolean }>>` | P6 |

### 4b. Tên M1 tạo ra mà milestone sau dùng (thêm 29/10/2026 từ plan M1)

| Tên | Ở đâu | Ai dùng |
|---|---|---|
| `runStats`, `SplitStats` (có `failing`), `isComplete`, `compareRuns`, `RegressionCriterion` | `src/ai/eval/run-stats.ts` | M2 (publish-check), M5 (dashboard) |
| Field `complete` trong tóm tắt lần chạy; `GET …/runs/:id/items` trả `RunItemView[]` + `stats` | `src/ai/eval/**` | M2, M3, M5 |
| `HeldOutReader.hiddenIds(exampleIds: string[]): Promise<Set<string>>` | `src/ai/eval/**` | M3 (che lời gọi judge của ví dụ held-out) |
| `EvalSetsService.latest(op: AiOperation)` | `src/ai/eval/**` | M2 (*S* = phiên bản chốt mới nhất) |
| `ratioIn(bounds)` trong `settings.definitions.ts`; admin `FieldSpec.kind: 'ratio'` | settings, admin Cài đặt | M3 (`judge_agreement_min`) |
| `AiEvalRunItem.input` **nullable** (kết quả cũ không còn ví dụ); `ai_eval_runs.legacy`, `price_cached_input`; `position` trên set item và run item | `ai.prisma` | mọi milestone đọc kết quả chạy |
| Mã lỗi riêng M1: `expected-invalid` (422), `example-held-out` (409), `eval-set-conflict` (409, B37) | `src/ai/eval/**` | — |

Thêm từ plan M1 / M2: `EvalRulesRegistry.get()` và `ruleResultFor` (M1-T5, M1-T1, M2 dùng cho kiểm ví dụ mẫu); `RunItemResult`, `itemPasses` trong `run-stats.ts`; chạy thử
chỉ lấy ví dụ dev nằm ở `PromptsService.test` (M1-T11, M2 `draft/test` dùng lại).

### 4c. Tên M2 tạo ra mà milestone sau dùng

| Tên | Ở đâu | Ai dùng |
|---|---|---|
| `PublishWarning`, `publishWarnings`, `gateTallies` | `src/ai/configs/publish-check.ts` | M3 thêm tiêu chí judge vào so sánh |
| `baselineRequirement(live: { modelRef: string \| null }): 'required' \| 'not-required'` (D37: bản đang chạy không có model → `'not-required'`) | `src/ai/configs/publish-check.ts` | M2-T5; M3-T12 giữ nguyên |
| `ai_live_configs.last_number` (bộ đếm số cấu hình, không dùng lại số sau khi xóa nháp) | `ai.prisma` | chỉ M2 |
| Helper script publish theo đường thật: `ensureFrozenSet`, `publishModel`, `rollbackConfig`, `turnOff` (D38: publish nháp không model, không lần chạy) | `apps/api/scripts/ai-config-publish.mjs` (+ bản TS cho e2e-real, ba hàm đầu) | mọi smoke sau M2 |
| `PublishCheckView.turn_off` (nháp không có model, D38); `publish` nhận `candidate_run_id: null` | `src/ai/configs/**` | M3-T12, M3-T17 (cổng và màn publish giữ nhánh này) |
| `modelChoices(models: AiModel[], selectedId: string \| null): AiModel[]` — bỏ model `hidden` (cờ admin, M2-T1) hoặc `lifecycle = 'retired'`, trừ model đang chọn (D40, B50) | `apps/admin/src/features/ai/model-choices.ts` | M3-T15 (trang Judge) |
| Lần chạy theo cấu hình: `POST …/eval/runs` nhận `config`, `prompt` vẫn nhận (thêm, không đổi); lần chạy xếp hàng trước khi nháp bị sửa thì `failed` + `config-changed` | `src/ai/eval/**` | M3, M5 |
| Rollback nhận `expected_live_version`, lệch thì `publish-stale` | `src/ai/configs/**` | — |

### 4d. Tên M3 tạo ra mà milestone sau dùng (thêm 29/10/2026 khi sửa plan theo review P2–P4)

| Tên | Ở đâu | Ai dùng |
|---|---|---|
| `JudgeAgreement.forRevisions(revisionIds: string[]): Promise<Map<string, Agreement>>` (khóa `${revisionId}\|${criterion}`) | `src/ai/judge/agreement.service.ts` | M5 (hiệu chỉnh trên dashboard) |
| `StatusReport.today`: `calls` chỉ đếm lời gọi `learner`; thêm `admin_cost_usd: string`, `admin_usd_cap: number \| null` | `src/ai/reports/reports.service.ts` | M5 (chỉ đọc) |
| Judge giả chấm "không đạt": `fake:bad-form` trả `fail_major` cho mọi tiêu chí | `src/ai/adapters/fake/fake.adapter.ts` | M4 (smoke câu thật) |

## 5. Setting (thêm vào `src/settings/settings.definitions.ts`; tên API snake_case như các setting hiện có)

| TS | API | Mặc định | Plan |
|---|---|---|---|
| `ai.evalHeldOutRatio` | `ai.eval_held_out_ratio` | 0.3 | P1 |
| `ai.adminDailyUsdCap` | `ai.admin_daily_usd_cap` | 2 (`null` = không trần) | P2 |
| `ai.judgeLabelMin` | `ai.judge_label_min` | 30 | P2 |
| `ai.judgeAgreementMin` | `ai.judge_agreement_min` | 0.85 | P2 |
| `ai.realJudgeLimit` | `ai.real_judge_limit` | 200 | P4 |
| `learning.activeWindowDays` | `learning.active_window_days` | 7 | P6 |

## 6. Mã lỗi (Problem Details `type`, theo kiểu `problem(status, type, title)` ở `src/ai/eval/eval-runs.service.ts:36`)

| `type` | Status | Khi | Plan |
|---|---|---|---|
| `eval-set-incomplete` | 422 | chốt phiên bản thiếu `expected` hoặc không có held-out (B1) | P1 |
| `eval-set-mismatch` | 409 | so hai lần chạy khác bộ (B10) | P1 |
| `example-not-held-out` | 409 | `reveal` một ví dụ không phải held-out | P1 |
| `run-is-evidence` | 409 | xóa lần chạy đã làm bằng chứng publish (B33) | P3 |
| `draft-exists` | 409 | tạo nháp khi đã có (B23) | P3 |
| `draft-busy` | 409 | xóa nháp khi lần chạy đang chạy (B26) | P3 |
| `draft-version-conflict` | 409 | sửa / publish sai `expected_version` (B24) | P3 |
| `eval-required` | 409 | publish thiếu lần chạy trọn của nháp (B25, B27) | P3 |
| `baseline-required` | 409 | thiếu lần chạy của bản đang chạy (B28) | P3 |
| `publish-stale` | 409 | id lần chạy gửi lên khác `publish-check`, hoặc con trỏ đổi (B30, B31) | P3 |
| `publish-warnings` | 409 | có cảnh báo mà thiếu `acknowledge_warnings` (B30) | P3 |
| `no-previous` | 409 | rollback không có bản trước (B32) | P3 |
| `model-in-use` | 409 | xóa model / xóa giá khi còn được dùng (B34) | P3 |
| `few-shot-invalid` | 422 | lưu nháp có ví dụ mẫu lệch (B36) | P3 |
| `model-price-missing` | 409 | test / eval / judge với model chưa nhập giá (B22) | P2 |
| `admin-usd-cap` | 409 | tạo việc admin khi đã chạm trần (§5.5); cũng là `error` của lần chạy / lượt chấm dừng giữa chừng | P2 |
| `judge-provider` | 422 | lưu judge với model không phải `anthropic` (B12) | P2 |
| `judge-pass-running` | 409 | lượt chấm thứ hai cùng bản judge (B16) | P2 |

## 7. Smoke

`apps/api/scripts/smoke-nhom-b.mjs`, lệnh `pnpm smoke:nhom-b`, M1 tạo với đoạn của M1; mỗi milestone sau thêm một đoạn (hàm `async function partM<n>()`, M theo bảng §1), chạy trên DB mới với model
`fake`, theo cách các smoke Bước 6–8 chạy (đọc `docs/deliveries/buoc-7.md` mục smoke). Output cuối đợt lưu `docs/deliveries/nhom-b-smoke-output.txt`.
