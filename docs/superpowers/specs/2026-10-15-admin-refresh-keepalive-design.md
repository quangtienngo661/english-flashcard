# Design — Admin gửi refresh với `keepalive` để tải lại trang không làm mất phiên

> **Trạng thái 15/10/2026:** chờ chủ dự án duyệt. Chưa có plan, chưa sửa code.

Ngày: 15/10/2026. Brainstorm qua `superpowers:brainstorming` cùng ngày: chủ dự án chọn phương án A trong báo cáo điều tra,
rồi trả lời 3 câu hỏi (Q1–Q3). Quyết định và mọi phương án đã đưa ra:
[`../decisions/2026-10-15-admin-refresh-keepalive-decisions.md`](../decisions/2026-10-15-admin-refresh-keepalive-decisions.md).

**Đầu vào:**
- Báo cáo điều tra (nguyên nhân, bằng chứng, các phương án A–G):
  [`../../tasks/2026-10-15-refresh-fast-reload/report.md`](../../tasks/2026-10-15-refresh-fast-reload/report.md).
- Design admin Bước 2.5, nguồn cho hành vi phiên: [`2026-10-14-buoc-2-5-admin-web-design.md`](2026-10-14-buoc-2-5-admin-web-design.md)
  §5 (khởi động trang, 401, 403), B25#4–B25#6, B25E1, B25E30.
- Design làm mới giao diện B, bản sửa B25E30: [`2026-10-15-ui-refresh-b-design.md`](2026-10-15-ui-refresh-b-design.md) §6.5, UBE34.
- Design Bước 1, cơ chế xoay token và ân hạn 10 giây: [`2026-10-07-buoc-1-identity-core-design.md`](2026-10-07-buoc-1-identity-core-design.md)
  (B1#16, B1E5, B1E7).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = trợ lý đề xuất, duyệt cùng doc này. **ASSUMPTION** = chưa
kiểm chứng. Quyết định `RK#`, tiêu chí `RKC#`, trường hợp biên `RKE#`.

## 1. Vấn đề và mục tiêu

Khi trang admin bị tải lại hoặc bị rời đi đúng lúc `POST /v1/auth/refresh` đang chạy, trình duyệt bỏ câu trả lời, trong đó
có `Set-Cookie` mang refresh token mới. Server thì đã xoay token. Cookie kẹt ở token cũ, và quá 10 giây ân hạn thì lần refresh
kế tiếp bị coi là token bị trộm: cả chuỗi phiên bị thu hồi, admin về `/login`. Một khi đã mất một câu trả lời, lần thử lại
của B25E30 (chờ `Retry-After`, tối đa 60 giây) luôn rơi ra ngoài 10 giây ân hạn.

**Mục tiêu:** trang bị tải lại hoặc bị rời đi giữa lúc refresh chạy thì trình duyệt vẫn nhận câu trả lời và lưu cookie mới,
nên lần refresh sau dùng đúng token mới nhất.

**Xong khi (lúc triển khai):** mọi `RKC#` ở mục 5 có test tự động hoặc bước chạy tay ghi rõ; test mới đỏ trước khi sửa (hai
commit: test trước, sửa sau); CI xanh trên PR (job `admin`, `admin-e2e-real`).

**Xong khi (việc thiết kế này):** doc này và decision record được chủ dự án duyệt.

## 2. Quyết định

| # | Quyết định | Nguồn |
|---|---|---|
| RK1 | Chọn phương án A của báo cáo: request refresh của admin gửi với `keepalive: true`. Không làm B (kéo dài ân hạn) trong lần này | Chốt (chọn A) |
| RK2 | Phạm vi: chỉ `POST /v1/auth/refresh` (mọi chỗ gọi: khởi động trang, sau 401, sau 403 `forbidden`, mỗi lần thử lại của B25E30). Login, đổi mật khẩu, logout, `/me` và các API nội dung không đổi: mất câu trả lời của chúng chỉ khiến người dùng đăng nhập lại, không làm thu hồi oan | Đề xuất |
| RK3 | Không đổi API: xoay token, ân hạn 10 giây, rate limit `auth.refresh.chain` giữ nguyên | Chốt (chọn A, không chọn "A và B") |
| RK4 | Kiểm thử: unit (mọi lần refresh có `keepalive`) và **một** test e2e API thật (rời trang giữa lúc refresh, 12 giây sau quay lại vẫn đăng nhập). Đường 429 không vào CI | Chốt (Q1) |
| RK5 | Chỉ kiểm trên Chromium (bộ e2e thật chạy Desktop Chrome). Firefox và Safari ghi `ASSUMPTION` | Chốt (Q2) |
| RK6 | Nhánh `fix/admin-refresh-keepalive` cắt từ `feat/ui-b-admin`, gồm báo cáo, design, decision record, plan và code. PR đặt base `feat/ui-b-admin` (xếp trên PR #23), đổi base sang `dev` khi #23 merge | Chốt (Q3) |
| RK7 | Test e2e rời trang bằng `page.goto('about:blank')` ngay khi request refresh của trang rời trình duyệt (`page.waitForRequest`), chờ 12 giây (lớn hơn 10 giây ân hạn) rồi mở lại app | Đề xuất |
| RK8 | Không thêm feature-detect hay đường dự phòng: trình duyệt không hỗ trợ `keepalive` thì bỏ qua tùy chọn và chạy như hôm nay | Đề xuất (`ASSUMPTION` cho Firefox/Safari) |

## 3. Cách làm

Một thay đổi trong `apps/admin/src/auth/session-store.ts`, trong `runRefresh()`:

```ts
// trước
const res = await this.raw('/v1/auth/refresh', json('POST', {}, this.csrf()), null);
// sau (dạng dự kiến; plan chốt cách viết)
const res = await this.raw('/v1/auth/refresh', { ...json('POST', {}, this.csrf()), keepalive: true }, null);
```

`raw()` đã truyền nguyên `init` vào `fetch` và thêm `credentials: 'include'`, nên không cần sửa chỗ khác. Mọi lần refresh đều
đi qua `runRefresh()` (khởi động, 401, 403 `forbidden`, vòng thử lại 429), nên một chỗ sửa phủ hết RK2. Phần còn lại giữ
nguyên: refresh dùng chung một lượt, chờ `Retry-After` của B25E30, xử lý 401/403, `BroadcastChannel`.

Để test đọc được tùy chọn này, `Call` trong `apps/admin/src/auth/test-support.ts` ghi thêm trường `keepalive`.

**Vì sao chữa được:**

```
hôm nay                                         với keepalive
trang N: refresh T0 ──► server xoay T0→T1       trang N: refresh T0 (keepalive) ──► server xoay T0→T1
[F5] trang N bị bỏ, câu trả lời mất             [F5] trang N bị bỏ, request vẫn chạy tiếp
cookie vẫn T0 (đã xoay)                         câu trả lời về, trình duyệt lưu cookie T1
>10 s sau: refresh T0 → reuse → mất phiên       lần sau: refresh T1 → xoay bình thường
```

**Về `keepalive` (MDN, `RequestInit`, đọc 15/10/2026):** khi bằng `true`, trình duyệt không hủy request nếu trang tạo ra nó bị
bỏ trước khi request xong; thân request giới hạn 64 KiB. Việc **cookie trong câu trả lời vẫn được lưu** sau khi trang bị bỏ thì
MDN không nói; đã đo trên Chromium 153 (mục 4).

## 4. Bằng chứng trước khi làm

Chạy với API thật và admin thật (Vite dev server), Chromium 153.0.8010.12. "Có keepalive" được giả lập bằng một init script
của Playwright bọc `window.fetch` để thêm `keepalive: true` cho đúng request refresh; code admin không đổi. File nằm trong
[`../../tasks/2026-10-15-refresh-fast-reload/evidence/`](../../tasks/2026-10-15-refresh-fast-reload/evidence/).

| Tình huống | Không keepalive (hôm nay) | Có keepalive (giả lập) | File |
|---|---|---|---|
| Rời trang (`about:blank`) khi refresh đang chạy, quay lại sau 12 s | Mất phiên 3/3, `reuse_detected` | Còn đăng nhập 3/3; token trong cookie đúng là token do lần refresh lúc rời trang tạo ra | `leave-about-blank.out` |
| F5 14 lần khi refresh đang chạy → 429 → chờ `Retry-After` → thử lại | Mất phiên: lúc 429, cookie là token đã xoay | Còn đăng nhập: 13 trang không nhận được câu trả lời nào, nhưng lúc 429 cookie là token mới nhất (chưa xoay); không có `reuse_detected` | `browser-inflight-all.out`, `browser-inflight-all-keepalive.out` |
| Script tự gửi refresh rồi rời trang, 5 lần (request khác origin, có preflight CORS) | Cookie kẹt ở token đã xoay 5/5 | 0/5; server vẫn xoay 5 lần | `keepalive-probe.out` |

## 5. Tiêu chí (When → Then)

| # | Criterion | Cites |
|---|---|---|
| RKC1 | When the admin sends `POST /v1/auth/refresh` (page start, after a 401, after a 403 `forbidden`, and every B25E30 retry after a 429), then the request is sent with `keepalive: true` | RK2; unit |
| RKC2 | When the admin sends any other request (login, `/me`, logout, password change, content API), then `keepalive` is not set | RK2; unit |
| RKC3 | When a signed-in admin page is left for `about:blank` while its start-up refresh is in flight, and the admin is opened again 12 seconds later, then the user is still signed in on the same page they open (not `/login`) | RK4, RK7; e2e real |
| RKC4 | When fast reloads drive the refresh into 429 and the last page retries after `Retry-After`, then the user stays signed in | B25E30, UBE34; one manual run of `browser-repro.mjs inflight 0 14 all` against the fixed admin (not in CI, RK4) |
| RKC5 | When the existing tests run, then B25#4, B25#5, B25#6, B25E1 and every B25E30 test still pass unchanged | unit + e2e real |

## 6. Trường hợp biên

| # | Edge case | Expected | Cites |
|---|---|---|---|
| RKE1 | The reloaded page's refresh reaches the server before the old page's keepalive refresh is processed (both carry the same cookie) | The per-user lock serializes them; the later one takes the grace path and gets the same successor token; the cookie ends on that successor. Same as two tabs today | B1E5, B25E1 |
| RKE2 | A keepalive refresh from a page that is gone answers 401 or 429 | Nobody reads the answer; the cookie is unchanged (a refresh error never clears it); the next page decides as today | RK8 |
| RKE3 | Logout in another tab commits while a keepalive refresh is in flight | Logout first: the refresh sees a revoked chain, answers 401, sets no cookie. Refresh first: its `Set-Cookie` may arrive after logout's clear, leaving a cookie of a revoked chain; the next page start gets 401 and opens `/login`. Same outcome as today | B1E7, B25#8 |
| RKE4 | The browser quits, the process is killed or the network drops mid-refresh | Not fixed: no process is left to finish the request, or no answer arrives. The stale cookie still ends the session on the next refresh after 10 s, as today. Out of scope (option B of the report) | RK1, RK3 |
| RKE5 | A browser that does not support `keepalive` (Firefox and Safari untested) | The option is ignored; behaviour as today; no error (`ASSUMPTION`) | RK5, RK8 |
| RKE6 | The 64 KiB keepalive body limit | The body is `{}` and refresh is single-flight per page, so the limit is never approached | MDN |
| RKE7 | The reloaded pages' keepalive refreshes still count toward `auth.refresh.chain` | They do (14 of 14 hit the limiter in the simulation), so 429 still happens on a reload storm; the cookie is current, so the B25E30 retry succeeds | RKC4, UBE34 |
| RKE8 | The new e2e test can pass without the fix if the API answers before the page unloads | In the saved local runs, leaving as soon as the request left the browser lost the answer every time (11 of 11); with a 2 ms delay the answer still arrived on 3 of 14 pages. The unit test (RKC1) is the deterministic guard; the e2e guards the real browser + CORS + cookie path. The plan runs the e2e 3 times on the unfixed code and records how often it fails | RK4 |
| RKE9 | The e2e test leaves the page and waits 12 s | It does not log out or change any account, so later tests of the story keep their session; if it fails, the failure is reported at this test, before later tests depend on that session | RK4 |
| RKE10 | The refresh is cross-origin with JSON and `X-CSRF-Protection`, so it needs a CORS preflight | Keepalive with a preflight works in Chromium 153 (the probe and the simulation were both cross-origin, like `admin.` → `admin-api.`) | RK5 |

## 7. Test

- **Unit** (`apps/admin/src/auth/session-store.test.ts`): RKC1 cho từng đường gọi refresh (khởi động, 401, 403 `forbidden`,
  vòng thử lại 429); RKC2 cho login, `/me`, logout, đổi mật khẩu. Commit 1 có test đỏ, commit 2 sửa.
- **E2E API thật** (`apps/admin/e2e-real/admin.real.spec.ts`): một test RKC3 trong câu chuyện có sẵn, dùng một trang đã đăng
  nhập (plan chọn vị trí và tài khoản), thêm khoảng 15 giây vào job `admin-e2e-real`. Trước khi sửa, chạy 3 lần trên code cũ
  và ghi kết quả (RKE8).
- **Chạy tay một lần:** RKC4 bằng `browser-repro.mjs` của bộ bằng chứng, trỏ vào admin đã sửa; ghi output vào delivery record.

## 8. Tài liệu cập nhật khi làm

- Delivery record mới `docs/deliveries/admin-refresh-keepalive.md` (plan tóm tắt, rồi as-built).
- `docs/deliveries/ui-refresh-b.md`, mục "Còn mở" của admin: trỏ sang bản sửa này.
- Design Bước 2.5, dòng B25E30, và design UI-B, dòng UBE34: thêm một câu "tải lại khi refresh đang chạy: xem
  `2026-10-15-admin-refresh-keepalive-design.md`".
- Báo cáo điều tra: dòng trạng thái ở đầu.

## 9. Rủi ro và phần chưa kiểm

- Firefox và Safari chưa kiểm (RK5, RKE5).
- Mất mạng, trình duyệt bị tắt hoặc bị giết giữa lúc refresh vẫn làm mất phiên (RKE4). App Flutter sau này không có
  `keepalive`; khi làm app đó cần xem lại phương án B, C hoặc F của báo cáo.
- Bằng chứng ở mục 4 dùng `fetch` được bọc bởi init script, chưa phải code thật; RKC3 và RKC4 kiểm lại trên code thật.
- Test e2e có thể qua dù chưa sửa (RKE8).

## 10. Ngoài phạm vi

Phương án B–G của báo cáo; `keepalive` cho login và đổi mật khẩu (RK2); web app học viên (chưa có; khi làm thì dùng cùng
cách cho refresh).
