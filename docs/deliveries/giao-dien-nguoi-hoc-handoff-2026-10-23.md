# Giao diện người học — bàn giao giữa chừng (23/10/2026, giữa M4)

Đọc file này trước khi làm tiếp ở phiên mới (cloud). Nó gom những gì phiên trước biết mà repo chưa ghi: cách làm, trạng thái từng mốc, quy
ước, các quyết định đã tự chốt (ruling), lỗi nhỏ còn để lại, và những thứ chỉ có trên máy Windows của chủ dự án. Bản đầy đủ từng dòng của
ledger nằm ở [`giao-dien-nguoi-hoc-ledger.md`](giao-dien-nguoi-hoc-ledger.md) (bản chép của `.superpowers/sdd/…/progress.md`, thư mục đó không
được commit).

## 1. Việc gốc và luật của chủ dự án

- Làm app người học (`apps/web`, `/vi/app`, `/en/app`) theo design `docs/superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md` (D1–D22, E1–E42,
  GA1–GI10), decisions `docs/superpowers/decisions/2026-10-22-giao-dien-nguoi-hoc-decisions.md`, plan `docs/superpowers/plans/2026-10-22-giao-dien-nguoi-hoc.md`
  (48 task, 7 PR), bản chữ `docs/mockups/2026-10-21/ban-chu-giao-dien.md` (§12–§17 ghi đè phần trước), Figma `7HcPAKLrWu32C27qYMJUOA` (node id ở
  `docs/mockups/2026-10-22/figma-node-ids.md`). Tiếng Anh theo design §7.1–§7.2.
- Mỗi mốc một nhánh `feat/giao-dien-nguoi-hoc-<m1|m2|m3|m4|m4b|m5a|m5b>` cắt từ `origin/dev` mới nhất **sau khi** mốc trước đã merge. PR vào `dev`,
  không bao giờ vào `main`.
- Cách làm chủ dự án chọn: **Native (superpowers `executing-plans`)**, TDD mọi task, một commit mỗi task theo tên commit trong plan, **một reviewer
  mới cho mỗi PR mốc** (subagent, model mạnh nhất).
- Cổng mỗi mốc: CI xanh → chạy thật (API + worker + Postgres + Redis + Mailpit) theo `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md` → gửi chủ dự án
  ảnh chụp (vi/en, sáng/tối, 390/1024/1440) đặt cạnh khung Figma + mục test-flow của mốc → chủ dự án "ok phần hình" → merge vào `dev`.
- Push, mở PR vào `dev`, merge khi CI xanh **và** chủ dự án đã ok phần hình: không cần hỏi thêm. **Quét secret trước mỗi lần push.**
- Chỉ dừng hỏi chủ dự án ở: **Task 35** (duyệt khung Figma "Lịch sử giao dịch" trước khi làm M4b). Task 1 và Task 2 đã qua.
- Báo cáo bằng tiếng Việt, giữ thuật ngữ tiếng Anh, ngắn.
- Luật git chung của chủ dự án: không commit `main`, không force-push; một lỗi = hai commit (test fail trước, sửa sau); nhánh `<type>/<slug>`;
  Conventional Commits.

## 2. Trạng thái (23/10/2026)

| Mốc | Task | PR | Trạng thái |
|---|---|---|---|
| M1 khung app, tài khoản, Cài đặt | 1–11 | #123 | merged vào `dev` (`c5e2536`) |
| M2 Hôm nay, nhóm, phiên ôn | 12–21 | #124 | merged (`da92f9e`) |
| M3 Tra từ, thêm từ | 22–27 | #125 | merged (`e99b855`) |
| **M4 Luyện tập, Gói học** | 28–34 | chưa mở | **đang làm** trên `feat/giao-dien-nguoi-hoc-m4` (cắt từ `e99b855`) |
| M4b Lịch sử giao dịch | 35–? | — | dừng ở Task 35 chờ chủ dự án duyệt Figma |
| M5a, M5b | … | — | chưa làm |

**M4 lúc bàn giao:** Task 28 (API (b) — từ hay sai theo nhóm, GB1–GB8) đã viết xong và commit trên nhánh M4 (xem `git log`): `groupsOfSenses` ở façade
`LearningService`, `GET /v1/practice/weak-words?group_id=` (token gắn bộ lọc `weak-words|<group_id>`), `GET /v1/practice/weak-words/groups`, `POST
/v1/practice/sessions` cho phép `group_id` với `source:'weak'`. Test ở `apps/api/src/practice/history/weak-groups.spec.ts` và cuối
`sessions.service.spec.ts`. **Chưa** chạy thật trên DB cho Task 28 (nên làm: tạo vài câu sai cho một từ ở 2 nhóm rồi gọi hai endpoint).
Tiếp theo: Task 29 (migration lý do báo lỗi — **đặt timestamp lớn hơn migration mới nhất trên `dev`**, hiện là `20261022091000_buoc7_ai_operations`),
rồi 30–34 theo plan.

## 3. Cách làm từng mốc (đã dùng ở M1–M3)

1. `task-start` / đọc brief của task trong plan; viết test trước, chạy thấy fail đúng lý do; code; chạy test; lint; typecheck; commit theo tên trong plan.
   Ghi ledger mỗi task (dòng `Task N: complete …`) và mỗi quyết định lệch plan (`Task N: Ruling: … — vì sao — giá nếu sai`).
2. Hết task của mốc: e2e mốc (`apps/web/e2e/app/mN.spec.ts`, API giả, có axe + không cuộn ngang ở 390px), mục mốc trong test-flow, chạy cả bộ e2e
   trong Docker (`pnpm cf:docker` ở `apps/web`), đo cỡ Worker (`NEXT_PUBLIC_LEARNER_APP=on NEXT_PUBLIC_API_BASE_URL=https://api.example.com pnpm cf:docker --build`,
   dòng "Total Upload … gzip"), push, mở PR.
3. Reviewer mới (subagent, model `opus`) đọc gói diff của cả nhánh + plan + design + Review Focus của plan + các ruling. Tự chấm lại mức độ theo cái
   người dùng gặp; Critical/Important sửa **một lượt**, mỗi lỗi có test fail trước (commit `test(web): reproduce the mN review findings`, rồi
   `fix(web): address the mN review findings`); Minor ghi ledger, không sửa.
4. Chạy thật + chụp ảnh: `SHOTS_MILESTONE=mN SHOTS_EMAIL=… SHOTS_PASSWORD=… pnpm exec playwright test -c playwright.shots.config.ts` (ở `apps/web`,
   app dev phải chạy ở :3001, API ở :3000). Ghép ảnh so sánh Figma | sáng | tối (script trong scratchpad cũ, xem §6). Gửi chủ dự án.
5. As-built của mốc vào `docs/deliveries/giao-dien-nguoi-hoc.md`; cỡ Worker vào đó và vào `docs/deliveries/deploy-checklist.md`.

## 4. Quy ước code đã dùng (để phiên mới khỏi phải đoán)

- Chữ giao diện ở namespace `App` của `apps/web/messages/{vi,en}.json` (giữ thứ tự khoá như hiện có; có test so khớp hai file). Phiên trước sửa bằng
  một file JSON trung gian và script đặt lại khối `App` ở cuối file mà không định dạng lại phần landing; ở cloud cứ sửa trực tiếp, miễn JSON hợp lệ và
  hai ngôn ngữ cùng khoá.
- Lint web: không dùng giá trị Tailwind tuỳ ý `-[...]` (`scripts/check-tailwind-raw.mjs`); `style` inline chỉ khi dòng trên có `// raw-ok: lý do`;
  React Compiler cấm setState trong effect và đọc ref lúc render (dùng `useSyncExternalStore`, hoặc mẫu "state theo prop" `if (seen !== x) { … }`).
- Ghi dữ liệu: `useSubmitOnce` (một key mỗi lần bấm, giữ key khi mất mạng). Bài học M2/M3: đọc lựa chọn của lần bấm qua `useRef` (state set trong cùng
  handler chưa thấy); hàm trả `true` để phân biệt "bấm bị bỏ qua" (`undefined`) với "xong"; lệnh nhiều bước dùng key con `${key}:deck`, `${key}:add:${i}`;
  sau khi ghi thì invalidate cả `['groups']`, `['group']`, `['items']`.
- Điều hướng sau form/cổng phiên dùng `hardReplace` (tải lại trang), vì `router.replace` đôi khi bị bỏ qua trên bản build Worker.
- Test web (`renderApp` ở `app-ui/test-utils.tsx`): route khoá `"METHOD /path?query"` đúng thứ tự query; `POST /v1/auth/refresh` luôn là lời gọi
  POST đầu tiên (lọc theo path khi đếm); toast cần render `<ToastRegion/>`; khi cả bộ chạy, dữ liệu có thể về chậm hơn 1 giây (dùng
  `findBy…(…, { timeout: 5000 })` ở chỗ đã thấy chậm). e2e (`e2e/support/mock-api.ts`): handler khoá `"METHOD /v1/path"` không có query.
- Test API: vitest, mock persistence, `FakeClock`; tên test mang mã trường hợp biên (`GB1`…).

## 5. Ruling và lỗi nhỏ còn để lại (tóm tắt; đủ chi tiết ở file ledger)

- M1: dự phòng CSP D20 đang bật (`'unsafe-inline'`); `border-strong` tối `#6b7491`; chuyển trang bằng tải lại trang; Cài đặt điện thoại theo M/90.
  Minor để lại: ngày sinh ở Tài khoản theo ngày của máy; `reset-password?email=` lọt vào lịch sử trình duyệt.
- M2: dạng chia ở mặt sau thẻ lấy từ trang từ; bỏ câu "Ngày mai nhóm này có N thẻ"; từ được tô màu xanh; K/18 gửi đúng danh sách nghĩa theo lô 100.
  Minor để lại (15): xem ledger.
- M3: không có API tổng số kết quả và từ gần nhau → bỏ các dòng đó; "Thêm cả loạt" chỉ hiện khi có bộ lọc catalog; "Dùng gần đây" chỉ 1 nhóm; giữ chữ
  "Tra trong 7.799 từ". Minor để lại (M-3 … M-14): xem ledger.

## 6. Chỉ có trên máy Windows của chủ dự án (cloud không có)

- **Chạy thật**: Docker Desktop, `docker compose up -d` (Postgres 5434, Redis 6380, Mailpit 8025). API chạy với DB riêng `english_learning_learner_ui`,
  `JOB_QUEUE_PREFIX=wordmet-learner-ui`, `CORS_ORIGINS` có `http://localhost:3001`, `AI_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true` + `BILLING_FAKE_SECRET`,
  `ADMIN_APP_URL`, `LEARNER_APP_URL`, `TERMS_VERSION` (file `.env` của chủ dự án không được đọc; phiên trước truyền các biến này bằng một script bọc env
  trong scratchpad). Dữ liệu thử: `pnpm learner:setup -- --admin <email> --learner <email>` (ở `apps/api`; in mật khẩu thử ở cuối).
- **App dev trên Windows**: `pnpm dev:app` chạy `next dev` trong container Linux `wordmet-dev-app` (:3001). Container không thấy file mới → tắt và
  `docker volume rm wordmet-dev-app-next` rồi chạy lại. Hai trang biên dịch cùng lúc có thể ghi hỏng `.next/dev/prerender-manifest.json` (mọi trang 500,
  log "Unexpected non-whitespace character after JSON at position 512"): giữ object JSON đầu tiên của file đó (phiên trước dùng script
  `.superpowers/fix-manifest.cjs` chạy bằng `docker exec`), hoặc xoá volume và chỉ mở một trang lúc khởi động.
- **e2e và build Worker trên Windows**: `pnpm cf:docker` (container Linux). Ở Linux (cloud) chạy thẳng `pnpm test:e2e` / build như CI (`.github/workflows/ci.yml`, job `web`).
- **Figma**: phiên trước đọc khung bằng Figma MCP. Nếu cloud không có, so ảnh với khung Figma do chủ dự án mở.
- **Superpowers ở cloud**: không có plugin; dùng bản vendored ở `.claude/skills/` (`.claude/skills/SUPERPOWERS.md`). Script `task-start` / `task-done` /
  `review-package` của plugin cũng không có: ghi ledger tay vào file ledger trong repo.

## 7. Rủi ro đang mở

- **Cỡ Worker** khi bật app: 3.706,34 KiB gzip sau M3, vượt gói Free (~3.072 KiB) → trước khi mở `/app` cho người dùng thật phải nâng gói Paid hoặc
  giảm cỡ (đã ghi checklist Deploy). Bản tắt app (landing đang deploy) ~2.963 KiB, còn vừa.
- Hai test e2e M1 (E2, E10) fail lần đầu ở một lần chạy khi Worker khởi động nguội, chạy lại thì qua; CI #125 xanh. Theo dõi.
- CI từng treo 28 phút ở bước cài Playwright (mirror apt của Azure) → hết giờ; chạy lại job là xanh (`gh run rerun <id> --failed`).
