# Pagination trang chủ đề và gợi ý Hôm nay — Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute the approved plan task by task. Run each red/green cycle with `superpowers:test-driven-development`. Steps use checkboxes.

**Goal:** Mở trang chủ đề với tối đa 20 sense, giữ lựa chọn qua các trang, thêm đúng nội dung vào group và chọn tối đa bốn card khi mở Hôm nay.

**Architecture:** Web dùng cursor của Content và trạng thái Learning theo từng trang. Learning có API tổng và thao tác thêm riêng, lấy tập sense khớp từ Content, rồi kiểm tra và ghi dưới learner lock. API gợi ý chọn topic theo request và giới hạn sample ngay ở SQL.

**Tech stack:** NestJS, Prisma/PostgreSQL, Next.js, TanStack Query, Vitest, Playwright.

**Spec:** [Design đã duyệt để lập plan](../specs/2026-11-14-topic-pagination-design.md) · [quyết định](../decisions/2026-11-14-topic-pagination-decisions.md) · [review độc lập](../reviews/2026-11-14-topic-pagination-design-review.md).

**Execution:** Sau khi owner duyệt plan, làm trong worktree riêng từ `origin/dev`, áp dụng Git conventions của repo. Đối chiếu đường dẫn và API với base trước khi sửa vì workspace lúc lập plan đang ở nhánh docs có thay đổi riêng. Đưa design, decision record và plan vào nhánh thực thi. T1 → T2 → T3 → T5, T4 có thể làm độc lập rồi qua T5.

## Global Constraints

- Giữ `/app/topic?code=…&level=…`, hỗ trợ `group` và các đường vào đang có. Danh sách, tổng và thao tác thêm đều dùng tập catalog sense mở, live, từ tiếng Anh, loại function words và theo displayed level như browse.
- Mỗi trang 20 sense theo cursor. Chỉ đổi trang khi người dùng chọn. “Chọn tất cả” tác động tới các sense chưa học của trang hiện tại. “Thêm tất cả từ chưa học” áp dụng toàn topic + level và xét dữ liệu lúc ghi.
- Learning kiểm tra learning item toàn tài khoản của người dùng hiện tại, kể cả item ở group khác. Content đọc bảng Content, Learning đọc và ghi bảng Learning. Hai endpoint mới là additive. Giữ contract bulk chung và Tra từ.
- Tối đa 4 topic khác nhau từ các cặp có ít nhất 10 sense và topic chưa archive. Giữ response shape và tối đa 4 sample API mỗi cặp. Web giữ card ổn định trong lượt mở đó.
- Dùng component, token và i18n sẵn có. Đọc `apps/web/AGENTS.md` và Next.js docs cài trong workspace trước khi sửa web. Không cần package mới hoặc migration.
- Chạy test và đo hiệu năng trên môi trường test. Các phép đo production chỉ đọc và chỉ ghi những gì quan sát được.

## Review Focus

1. Sense đổi topic, level hoặc được học ở group khác sau khi tick → loại khi ghi, giữ sense đối chứng hợp lệ được thêm. T2.
2. Response mất sau commit hoặc có hai request đồng thời → replay cùng receipt, không thêm quá sức chứa hoặc tạo group lần hai. T2–T3.
3. Group chưa tải, bị xóa, hoặc mất quyền → không tự chọn group thay thế. T3.
4. Cursor tiếp theo trả trang rỗng hoặc lỗi, hoặc người dùng đổi level → phục hồi trang và không làm lẫn selection. T3.
5. Topic cỡ VSTEP → payload trang đầu và trang kế tiếp bị chặn theo page size, query sample trả tối đa 4, đo riêng chi phí tổng và sample. T4–T5.

---

### Task 1 — Tập sense chung và API tổng

**Files:** Sửa `apps/api/src/content/learner/learner-content.service.ts`, `apps/api/src/content/content.service.ts`, `apps/api/src/content/index.ts`, `apps/api/src/learning/items/items.{controller,service,schemas}.ts`. Test `apps/api/src/learning/items/items.service.spec.ts`, `items.schemas.spec.ts` và thêm `apps/api/src/content/learner/learner-content.service.spec.ts`.

**Interfaces:**
- `TopicScope = { topic: string; level: Level }`. Export từ Content. `ContentService.topicSenseIds(scope: TopicScope, options?: { senseIds?: readonly string[]; db?: Prisma.TransactionClient }): Promise<string[]>` delegate tới `LearnerContentService.topicSenseIds` (cùng signature).
- `ItemsService.topicSummary(userId: string, scope: TopicScope): Promise<TopicSummary>`. `GET /v1/items/topic-summary?topic=exam-vstep&level=B2` → `{ total: number; learning: number; unlearned: number }`.
- `topicScopeQuery` strict, topic slug `^[a-z0-9-]+$`, level từ `LEVELS`. Khi topic hợp lệ về cú pháp nhưng tập rỗng trả 200 với ba số 0.

- [ ] **Viết test.** Browse và hàm ID chia sẻ predicate, cùng level hiển thị và thứ tự lemma / POS / sense ID. Khóa case input IDs rỗng trả [] mà không query. Với ba ID khớp và một learning item của user đang ở group khác, summary là `{ total: 3, learning: 1, unlearned: 2 }`. Rỗng trả 0/0/0. Query thiếu level, sai level hoặc thêm field lạ trả validation error.
- [ ] **Chạy test đỏ** bằng lệnh dưới. Test mới fail vì chưa có filter dùng chung và API tổng.
- [ ] **Implement.** Trích phần FROM/WHERE của browse cần chia sẻ trong Content, giữ JOIN và thứ tự level hiện tại. Query ID chỉ trả ID, không lấy nghĩa, với danh sách giới hạn thì dùng `ANY(uuid[])`. Learning đọc count trong transaction `RepeatableRead` trên cùng snapshot với danh sách ID từ Content. Dùng một tham số `uuid[]` và filter `user_id` bên Learning. HTTP chỉ trả ba số.
- [ ] **Chạy test xanh và commit.**

```powershell
pnpm --filter api exec vitest run src/content/learner/learner-content.service.spec.ts src/learning/items/items.service.spec.ts src/learning/items/items.schemas.spec.ts
git commit -m "feat(learning): add topic learning summary"
```

### Task 2 — API thêm từ theo topic và receipt có thể replay

**Files:** Sửa `apps/api/src/learning/items/items.{controller,service,schemas}.ts`, `apps/api/src/learning/groups/groups.service.ts`. Thêm `apps/api/src/common/idempotency/run-idempotent-in-tx.ts` và `run-idempotent-in-tx.spec.ts`. Test `apps/api/src/learning/items/items.service.spec.ts`, `items.schemas.spec.ts`, `apps/api/src/learning/groups/groups.service.spec.ts`.

**Interfaces:**
- `POST /v1/items/topic-add`, learner auth, `user.write`, `Idempotency-Key` bắt buộc. `TopicAddBody = TopicScope & { target: { group_id: string } | { new_group_name: string } } & ({ mode: 'all_unlearned' } | { mode: 'selected'; sense_ids: string[] })`. Strict union. `group_id` và sense IDs là UUID chuẩn hóa, mỗi batch selected có 1–100 ID khác nhau. Reuse `groupName` schema.
- `TopicAddReceipt = { group_id: string | null; eligible: number; added: number; skipped_group_full: number; } & ({ mode: 'all_unlearned' } | { mode: 'selected'; added_ids: string[]; already_learning_ids: string[]; unavailable_ids: string[]; group_full_ids: string[] })`. `group_id` chỉ null khi xin tạo group nhưng không có sense thêm được. `eligible = added + skipped_group_full`. Với selected, bốn tập ID rời nhau và phủ toàn bộ request. Với toàn bộ topic trả count và group ID.
- `ItemsService.addFromTopic(userId: string, body: TopicAddBody, key: string): Promise<TopicAddReceipt>`. `GroupsService.createInTx(tx: Prisma.TransactionClient, userId: string, name: string, groupsPerUser: number): Promise<GroupView>` chạy dưới learner lock do caller lấy. Reuse từ `GroupsService.create` và `addFromTopic`.
- `runIdempotentInTx<T>(prisma: PrismaClient, input: { key: string; userId: string; endpoint: string; payloadHash: string }, handler: (tx: Prisma.TransactionClient, save: (body: T) => Promise<void>) => Promise<T>, options?: { now?: () => Date }): Promise<T>`. Helper cho endpoint mới dùng bảng `idempotency_keys` hiện có, cửa sổ 24 giờ và mã lỗi hiện có.

- [ ] **Viết test.** Với selected `[A,B,C,D]` và còn một chỗ, A/B eligible theo browse, C đã học ở group khác, D đã đổi topic, receipt có A đã thêm, B group đầy, C đang học, D không còn hợp lệ. Test all có 2 eligible, một chỗ, thêm A và báo 1 đầy, không gửi ID toàn topic về client. Test group của user khác trả 404, test group mới không được tạo nếu không có eligible. Test duplicate ID, body trộn mode và thiếu key bị từ chối. Race và replay cùng key chỉ ghi một lần, cùng key khác body trả 400, lock đang giữ trả 409 + Retry-After, lỗi ghi sau khi gọi `save` rollback cả dữ liệu lẫn receipt. Pin việc từ đã học vẫn được link qua bulk chung như regression control.
- [ ] **Chạy test đỏ** bằng lệnh dưới. Test mới fail vì thiếu route contract và transaction replay.
- [ ] **Implement helper.** Lấy advisory transaction lock theo cùng scope key/user/endpoint như wrapper hiện tại. Đọc record, replay receipt succeeded khi hash khớp, trả 400 nếu khác hash và hết 24 giờ thì xử lý như key mới. Dùng `ProblemDetailsException` với `retryAfterSeconds: 2` cho lỗi đang chạy. Handler và `save` chung một transaction. `save` ghi record succeeded đúng một lần trước khi handler hoàn tất, helper rollback nếu handler lỗi hoặc quên gọi `save`. Lock không lấy được trả 409 với Retry-After 2. Giữ cấu hình transaction timeout của items, dùng endpoint scope `/v1/items/topic-add`. Route dùng helper trực tiếp, tránh wrap thêm interceptor ghi receipt ở transaction khác.
- [ ] **Implement endpoint.** Hash body đã validate, ổn định thứ tự field/IDs qua retry. Lấy learner lock trong handler. Đọc settings và group bằng transaction, gọi Content lấy ID phù hợp theo thứ tự browse, chia tập đang học và tập còn eligible bằng Learning. Tính chỗ trống trước khi tạo group, hỗ trợ 0 chỗ, gọi `save(receipt)` rồi dùng `ensureItems` ghi các sense được thêm theo transaction. Giữ activity là write cuối theo convention hiện có. Các item không hợp lệ đi vào đúng một danh mục, phân loại unavailable trước already learning. Với all, dùng tập hiện tại tại lúc đọc eligibility. Việc tạo group và ghi kết quả cùng rollback nếu lỗi. Gọi `GroupsService.createInTx` thay vì mở transaction lồng, giữ các lỗi name-taken và group-limit. Profile/timezone được đọc bằng luồng hiện có trước khi lấy lock.
- [ ] **Chạy test xanh và commit.** Race giữa hai key khác nhau, replay HTTP và rollback thật được kiểm tiếp ở T5.

```powershell
pnpm --filter api exec vitest run src/common/idempotency src/learning/items/items.service.spec.ts src/learning/items/items.schemas.spec.ts src/learning/groups/groups.service.spec.ts
git commit -m "feat(learning): add eligible topic senses atomically"
```

### Task 3 — Pagination, checkbox theo trang và submit trên web

**Files:** Sửa `apps/web/src/features/learner/groups/TopicPickerPage.tsx`, `groups-api.ts`, `apps/web/messages/{vi,en}.json`. Thêm `apps/web/src/features/learner/groups/topic-picker-api.ts`. Test `topic-picker.test.tsx`, `apps/web/e2e/app/m2.spec.ts`, `apps/web/e2e/app/cai-thien-a-group.spec.ts`. Đồng bộ selector nhãn thêm cả topic tại `apps/web/e2e-shots/shots.spec.ts`.

**Interfaces:**
- `useTopicPage(scope: TopicScope, token: string | null)` gọi đúng một `GET /v1/senses?topic=…&level=…&exclude_function_words=true&page_size=20` có cursor nếu có, rồi một `GET /v1/items?sense_ids=…` cho danh sách khác rỗng. Cache theo topic, level, cursor. `useTopicSummary(scope: TopicScope)` dùng API T1 và cache riêng.
- `addFromTopic(body: TopicAddBody, key: string): Promise<TopicAddReceipt>` trong `useGroupMutations`. API types web khớp T2. Invalidate `GROUPS_KEY`, `groupKey(group_id)` nếu có và query topic-picker sau khi có receipt.

- [ ] **Viết test.** Fixture có 21 sense, mở trang 1 lấy 20, chưa request cursor 2 tới khi click. Tick 5 ở trang 1, chọn toàn trang 2 có 1 sense chưa học, số là 6. Bỏ tick trang 2 còn 5, đã học không tick. Với lỗi hoặc trang sau rỗng, giữ trang khả dụng và các lựa chọn còn hợp lệ. Đổi level reset cursor và selection. Tổng 2.694 là giá trị API mặc dù render chỉ 20. Mô phỏng group pending rồi resolved đúng group URL, group 404 sau submit giữ lựa chọn. Kiểm tra body mode và locale VI/EN. Với hơn 100 mục và mất response batch 2, retry cùng group/body/key rồi nối tiếp, không gửi lại batch đã xác nhận. Với group đầy, giữ tick ID chưa thêm còn eligible. Mock Playwright của hai đường vào phản ánh API mới.
- [ ] **Chạy test đỏ** bằng Vitest dưới. Test mới fail vì UI hiện tự tải mọi cursor và còn dùng bulk chung.
- [ ] **Implement phần đọc và chọn.** Lưu stack cursor cùng query key theo topic + level, giữ trang cũ khi đợi trang mới hoặc khi lỗi, quay về cursor gần nhất còn có dòng nếu trang sau rỗng. Reset scope khi topic hoặc level đổi. Lưu set ID qua các trang, checkbox tick/untick chỉ ID đủ điều kiện của trang và hỗ trợ trạng thái chọn một phần. Giữ thứ tự browse đã thấy bằng page và vị trí row trong snapshot của selection. Dùng các label `App.topic.selectAll` có “trên trang này” / “on this page”, `addAll` có “Thêm tất cả từ chưa học” / “Add all words not yet learned”. Dùng style và copy Trang trước/Trang sau từ pagination Tra từ. Giữ axe checks ở desktop và mobile.
- [ ] **Implement submit.** Chờ group và summary khả dụng tương ứng với action, disable action đang chạy. Nếu URL chỉ rõ group mà group mất quyền, yêu cầu chọn lại. Nếu không kèm group, dùng group trùng tên hoặc lựa chọn tạo mới. Nếu không tạo được vì trùng tên hoặc hết số group, refresh danh sách và giữ lựa chọn để người dùng chọn group. Freeze operation theo scope, group đích, mode, thứ tự ID và UUID. Mode all là một request. Mode selected chia batch tối đa 100 theo browse order đã thấy, server sắp lại trong từng batch theo dữ liệu lúc ghi. Mỗi batch có key cố định từ operation ID và chỉ số. Batch đầu tiên thêm được sense sẽ tạo group. Nếu receipt trả `group_id: null`, batch tiếp theo tiếp tục gửi cùng lựa chọn tạo group. Sau khi có ID, cố định ID đó cho những batch còn lại. Khi 429, dùng Retry-After để xác định lúc có thể tiếp tục cùng batch. Khi lỗi mạng, retry batch chưa rõ kết quả với nguyên key và body, cộng từng receipt đúng một lần. Render thông tin đã xác nhận nếu bị dừng giữa chừng. Cùng attempt giữ payload; đổi scope/target/selection chỉ tạo attempt mới sau khi attempt cũ đã được xác nhận hoặc người dùng đã thoát trạng thái đang dở. Sau selected, giữ ID chưa gửi hoặc bị full, gỡ đã thêm/đã học/mất eligibility. Sau all thêm thành công thì reset draft selection. Chỉ cache trang đã thăm, đánh dấu stale sau ghi và tải lại trang đang xem, không fetch lại mọi trang cùng lúc.
- [ ] **Chạy test xanh và commit.**

```powershell
pnpm --filter web exec vitest run src/features/learner/groups/topic-picker.test.tsx src/features/learner/groups/groups-api.test.tsx
pnpm --filter web test:e2e e2e/app/m2.spec.ts e2e/app/cai-thien-a-group.spec.ts
git commit -m "feat(web): paginate topic word selection"
```

### Task 4 — Bốn card ngẫu nhiên mỗi lượt Hôm nay

**Files:** Sửa `apps/api/src/content/taxonomy/topic-suggestions.{service,queries}.ts`, `topics.controller.ts`, `apps/web/src/features/learner/groups/{groups-api.ts,TopicSuggestions.tsx}`, `apps/web/src/features/learner/today/TodayPage.tsx` và message VI/EN nếu cần báo lỗi. Test `apps/api/src/content/taxonomy/topic-suggestions.{service,queries}.spec.ts`, `apps/web/src/features/learner/groups/groups-api.test.tsx`, `apps/web/src/features/learner/today/today.test.tsx`.

**Interfaces:** `GET /v1/topics/suggestions` giữ `{ items: TopicSuggestion[] }` và các trường hiện có, trả `Cache-Control: private, no-store`. `TopicSuggestionsService.suggestions(language: 'vi' | 'en')` dùng seed mới mỗi request. `TopicSuggestionQueries.samples(topic: string, level: string, language: 'vi' | 'en', seed: number): Promise<SuggestionSample[]>`.

- [ ] **Viết test.** Với 5 topic eligible, 1 duplicate level và 1 pair count = 9, trả 4 topic khác nhau và loại pair thiếu ngưỡng. Với 0 hoặc 2 topic trả đúng số. Dùng 2 seed cố định cho hai lượt có kết quả đã biết, không yêu cầu mỗi lần random thật đều khác. Test query có `LIMIT 4`, test browser/unit một lượt mở giữ set khi focus, lượt mở mới gọi lại, lỗi có retry, 0 hợp lệ ẩn block, card vẫn link đúng code và level. Fixture chèn nhóm tải lại để kiểm tra lifecycle gắn với Hôm nay.
- [ ] **Chạy test đỏ** bằng lệnh dưới. Test fail ở giới hạn 3, seed theo ngày hoặc refetch/lỗi.
- [ ] **Implement.** Dùng `crypto.randomInt(0, 2 ** 32)` cấp seed mới và giữ `pickSuggestions(pairs, seed, max = 4)`. Bỏ phụ thuộc profile/timezone cho endpoint này. Chọn mẫu trong SQL bằng thứ tự hash của seed + sense ID, tie-break sense ID, `LIMIT 4`. Giữ rule archive, ngưỡng và nghĩa theo locale. Buộc cache query tách theo lượt mount thực của `TodayPage` (dùng lazy state với UUID), đặt hook ở `TodayPage` để group loading/error không tạo lượt mới, vô hiệu tự refetch khi focus/reconnect, retry do người dùng kích hoạt khi request lỗi. Giữ thiết kế card và ba sample hiển thị hiện tại.
- [ ] **Chạy test xanh và commit.**

```powershell
pnpm --filter api exec vitest run src/content/taxonomy/topic-suggestions.service.spec.ts src/content/taxonomy/topic-suggestions.queries.spec.ts
pnpm --filter web exec vitest run src/features/learner/groups/groups-api.test.tsx src/features/learner/today/today.test.tsx
git commit -m "feat(content): randomize four topic suggestions per visit"
```

### Task 5 — Test Postgres, browser và nghiệm thu

**Files:** Thêm `apps/api/test/content/topic-pagination.scale.e2e-spec.ts`, đăng ký vào `apps/api/vitest.config.e2e-scale.ts`. Ghi kết quả ở `docs/deliveries/topic-pagination.md`. Dùng harness `createTestApp`, `createIsolatedDatabase`, `seedVisibleSenses` và Playwright hiện có.

- [ ] **Chạy test thật bằng dữ liệu có kiểm soát.** Seed 2.694 sense công khai tại một topic B2, 2.000 đã học trong group khác, 8 sense cùng level ở topic đối chứng, một sense sai level và một function word. Pin positive control xuất hiện đúng topic. Summary lớn phải là 2.694 / 2.000 / 694, topic nhỏ trả 8 và không có cursor kế tiếp. Xác nhận đồng nhất tập ID giữa summary/add và browse bằng case sai level, function word và sense đã học ở group khác. Chạy hai POST khác key cùng learner vào group còn 1 chỗ, tổng ghi đúng 1. Sau POST thành công bỏ qua response thứ nhất và replay cùng key, receipt giống hệt, kiểm tra số group, item và log không tăng lần hai. Force lỗi sau lưu receipt trong test transaction rồi kiểm cả hai bên rollback. Với all trên dữ liệu lớn, đo cả một lượt thao tác gần sức chứa group thiết lập (mặc định 2.000); kiểm số bỏ qua.
- [ ] **Chạy browser với API thật.** Dùng DB test có VSTEP và một topic nhỏ. Ghi revision, số sense, HTTP timings, số request và kích thước response. Trang đầu sau khi ổn định phải có tối đa 1 browse, 1 trạng thái cho ≤20 IDs và 1 summary riêng cho scope; tính riêng group/session requests. Nhấn Trang sau chỉ thêm tối đa 1 browse và 1 trạng thái cho trang mới. Topic nhỏ có một trang. Nhấn trước/sau và kiểm DOM mỗi lượt ≤20 dòng, kiểm card ổn định trong cùng lượt và 4 card khi đủ topic. Seed thêm ba topic với tối thiểu 10 sense cho case 4 card. Đo ít nhất 5 lần cùng cấu hình sau warm-up, ghi median API summary, page và suggestions, số sample mỗi cặp và query plan hoặc DB timing nếu môi trường hỗ trợ. Nếu không có snapshot VSTEP hợp lệ, dùng fixture cỡ VSTEP và ghi rõ chưa đo VSTEP thật hoặc production.
- [ ] **Chạy checks của vùng thay đổi và CI.** Kiểm cả đường vào từ Hôm nay, trang từ và group. Dùng Network của browser để ghi request graph, phân biệt 54 request suy luận từ code cũ với số quan sát. Có thể chọn đo cũ/mới trên cùng dataset nếu base build được. Không hứa ngưỡng latency trước khi có baseline.
- [ ] **Ghi kết quả và commit.** Báo lỗi hoặc giới hạn môi trường nếu không chạy được runtime thật. Khi ship, deploy API trước web vì endpoint additive mới. Rollback web trước nếu cần về API cũ. PR vào `dev`; quy trình QA và publish theo AGENTS.md.

```powershell
pnpm --filter api test:scale test/content/topic-pagination.scale.e2e-spec.ts
pnpm --filter api lint
pnpm --filter api exec tsc --noEmit -p tsconfig.json
pnpm --filter api build
pnpm --filter api test
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web test:e2e
git commit -m "test(learning): verify topic pagination at scale"
```

## Các chi tiết kỹ thuật để duyệt cùng plan

- Dùng hai API Learning additive và transaction receipt dùng bảng hiện có. Tách scope mới để các luồng bulk khác tiếp tục dùng contract của chúng.
- Chọn tối đa 100 ID/batch theo giới hạn bulk quen dùng. Phần lớn lượt chọn cần một batch. Chọn nhiều trang có thể cần nhiều POST và cần test retry sau 429.
- Tạo group mới cùng lần ghi đầu tiên có sense thực sự được thêm. Trả receipt không tạo group nếu cả tập vừa trở thành không đủ điều kiện.
- Nếu catalog thay đổi giữa nhiều batch, ưu tiên thứ tự browse đã thấy ở mức batch và thứ tự hiện tại bên trong batch. Sau khi retry qua 24 giờ hoặc refresh làm mất draft, người dùng tải lại trạng thái trước khi quyết định thao tác mới.
