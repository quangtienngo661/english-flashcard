# Tải lại admin thật nhanh vẫn mất phiên sau bản sửa B25E30: điều tra (15/10/2026)

Nhánh `fix/admin-refresh-keepalive` (lúc viết tên là `docs/refresh-fast-reload`; cắt từ `feat/ui-b-admin`, `da8976c`).
Bằng chứng nằm trong `evidence/`, cách chạy lại ở cuối file.

> **Trạng thái 15/10/2026:** chủ dự án chọn phương án A. Design:
> [`../../superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md`](../../superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md).
> **Đã làm**, PR [#24](https://github.com/quangtienngo661/english-flashcard/pull/24); as-built ở
> [`../../deliveries/admin-refresh-keepalive.md`](../../deliveries/admin-refresh-keepalive.md).

## Kết luận

Giả thuyết **đúng**, có bằng chứng từ DB của sự cố gốc, từ trình duyệt thật và từ HTTP:

- Server xoay refresh token (đã commit vào DB) **trước khi** trình duyệt nhận được cookie mới. Nếu trang bị tải lại
  hoặc bị rời đi đúng lúc request refresh đang chạy, câu trả lời (và `Set-Cookie` trong đó) bị bỏ. Cookie vẫn giữ token
  cũ, mà token đó server đã đánh dấu là "đã xoay".
- Token cũ chỉ còn được chấp nhận trong **10 giây ân hạn** (grace), tính từ lúc xoay. Quá 10 giây, server coi đó là token
  bị trộm (`reuse_detected`) và **thu hồi cả chuỗi phiên** → 401 `invalid-token` → admin về `/login`.
- Bản sửa B25E30 chờ `Retry-After` (tối đa 60 giây, ở lần chạy gốc là 35 giây) rồi mới thử lại, nên lần thử lại **luôn**
  rơi ra ngoài 10 giây ân hạn. B25E30 không gây ra lỗi, nó chỉ làm lỗi có sẵn từ Bước 1 hiện ra chắc chắn.
- **Chỉ cần mất một câu trả lời** là đủ. Và **không cần 429**: tải lại, rời trang giữa lúc refresh đang chạy, quay lại sau
  12 giây → mất phiên (quay lại sau 5 giây thì không sao).

```
trình duyệt (cookie T0)              server
  trang 10: POST /refresh  T0  ───►  xoay T0 → T1, commit, gửi Set-Cookie T1
  [F5: trang 10 bị bỏ]       ✗ ◄───  câu trả lời mất, cookie vẫn là T0
  trang 11–14: T0  ────────────────► 429 (đã quá 10 lần/phút), Retry-After 35–60 s
  ... admin chờ Retry-After ...       (ân hạn của T0 hết sau 10 s)
  thử lại: T0  ─────────────────────► T0 đã xoay, quá ân hạn → reuse_detected, thu hồi chuỗi
                                ◄───  401 invalid-token → /login
```

Thêm một hệ quả: log cảnh báo `refresh_reuse_detected` (dùng để phát hiện token bị trộm) hiện bắn cả khi người dùng chỉ
tải lại trang, nên đó là báo động giả.

## Bằng chứng

| # | Thí nghiệm | Kết quả | File |
|---|---|---|---|
| 1 | **Sự cố gốc** 15/10, DB `english_learning_b25manual` (chỉ đọc) | Chuỗi `01ef8610`: 7 lần xoay trong ~4 s; token mới nhất `5fc4adde` **chưa bao giờ được gửi lên**; bộ đếm chuỗi 14 lần: 10 lần qua rate limit (7 lần xoay + 3 lần ân hạn, suy ra vì chuỗi chưa bị thu hồi lúc đó) và 4 lần 429. Trình duyệt chỉ thấy 5 lần 200 → 5 câu trả lời đã mất. Thu hồi `reuse_detected` lúc 13:56:00.575, tức 35,6 s sau lần xoay cuối (ân hạn hết lúc 13:55:34.955). Chuỗi `1ae4c628` của lần chạy trước cũng y như vậy | `original-incident-db.txt` |
| 2 | HTTP: gửi refresh rồi đóng socket ngay, không chờ trả lời | Client không nhận được gì, nhưng server vẫn xoay T0 sau khi socket đã đóng. Gửi T0 lúc +3 s → 200 qua ân hạn. Gửi T0 lúc +12 s → 401, chuỗi bị thu hồi `reuse_detected`. **Đối chứng:** client nhận được cookie mới, chờ 12 s rồi refresh → 200, chuỗi còn sống | `http-repro.out` |
| 3 | Chrome thật + admin thật, 14 lần F5, mỗi lần cách 300 ms (**đối chứng**) | API local trả lời trong ~20 ms nên không mất câu trả lời nào; 10 lần 200 rồi 4 lần 429; admin chờ rồi thử lại → 200, **vẫn đăng nhập**. Chờ `Retry-After` không gây lỗi nếu cookie là token mới nhất | `browser-fast-300.out` |
| 4 | Như trên, F5 khi refresh đang chạy (~2 ms sau khi request rời trình duyệt) ở mọi trang | Server trả OK 10 lần (4 lần xoay + 6 lần ân hạn), trình duyệt chỉ nhận được 2 câu trả lời. Lúc nhận 429, cookie là token `1507998d`, **đã xoay** từ 14:57:15.951. Thử lại lúc 14:58:00 → `reuse_detected` → `/login` | `browser-inflight-all.out` |
| 5 | Chỉ mất **một** câu trả lời: trang 10 (lần OK thứ 10), các trang khác chờ trả lời xong | Cookie lúc 429 là `db36a383`, đã xoay khi trang 10 refresh; thử lại sau ~41 s → `reuse_detected` → `/login`. (Lần chạy với khoảng chờ 2 ms thì câu trả lời của trang 10 vẫn kịp về → vẫn đăng nhập: thêm một đối chứng) | `browser-inflight-p10-gap0.out`, `browser-inflight-p10.out` |
| 6 | **Không có 429**: F5, rời trang khi refresh đang chạy, quay lại sau N giây | Sau 12 s → `/login`, `reuse_detected`, bộ đếm chuỗi chỉ 2. Sau 5 s → vẫn đăng nhập (nhờ ân hạn) | `leave-12.out`, `leave-5.out` |
| 7 | Thử phương án A (không sửa code app): refresh gửi bằng `fetch(..., { keepalive: true })`, rời trang khi request đang chạy, 5 lần mỗi kiểu | Không keepalive: server xoay 5 lần, cookie kẹt ở token đã xoay **5/5** lần. Có keepalive: server xoay 5 lần, cookie kẹt **0/5** lần. Request khác origin, có preflight CORS, giống admin → API thật. Chromium 153.0.8010.12 | `keepalive-probe.out` |

Log API (`refresh_grace_used`, `refresh_reuse_detected` theo chuỗi): `api-log-refresh-events.jsonl`.

## Phương án

| | Phương án | Chữa được | Không chữa được | Đánh đổi |
|---|---|---|---|---|
| **A** | **Client:** gửi request refresh của admin với `keepalive: true`, để trình duyệt vẫn nhận câu trả lời và lưu cookie dù trang đã bị tải lại hoặc bị rời đi | Tải lại hoặc rời trang giữa lúc refresh chạy (nguyên nhân của sự cố này), kể cả đường 429 → B25E30 | Mất mạng giữa chừng, tab bị trình duyệt hoặc hệ điều hành giết, app Flutter sau này | Sửa 1 chỗ trong `apps/admin` (`session-store.ts`), không đụng bảo mật. Mới thử trên Chromium; Firefox và Safari chưa thử |
| **B** | **Server:** kéo dài ân hạn từ 10 s lên ≥ 60 s (đề xuất 120 s, `ASSUMPTION`) và đưa vào config | Đường 429 (`Retry-After` ≤ 60 s), mất mạng ngắn, mọi trình duyệt | Quay lại sau khi hết ân hạn (ví dụ rời trang rồi 5 phút sau mới mở lại) | Token cũ bị trộm dùng được lâu hơn (120 s thay 10 s; chỉ lấy được đúng token kế tiếp mà người dùng đang giữ, sau đó vẫn bị phát hiện). Đổi IR11 trong spec Identity (vốn đã lệch RFC 9700 §4.14.2) và B1#16. Bản mã hóa của token kế tiếp nằm lâu hơn trong DB |
| **C** | **Server:** nếu token kế tiếp chưa ai dùng thì trả lại nó bất kể thời gian (có trần, ví dụ 24 h) | Mọi trường hợp mất câu trả lời, kể cả quay lại muộn và app Flutter | | Yếu nhất về bảo mật: token cũ bị trộm dùng được tới khi người dùng thật refresh lần kế. Phải giữ bản mã hóa của token kế tiếp lâu hơn. Thay đổi lớn hơn B |
| D | **Server:** không tính các lần trả qua ân hạn vào `auth.refresh.chain`, hoặc nâng trần 10 lần/phút | Giảm số lần gặp 429 khi F5 liên tục | Bản thân việc mất câu trả lời (thí nghiệm 6 vẫn hỏng) | Nới một lớp chống lạm dụng |
| E | **Client:** chỉ một tab refresh tại một thời điểm (Web Locks hoặc BroadcastChannel) | Refresh song song giữa các tab (ân hạn hiện đã lo việc này) | **Không** chữa lỗi này: trang bị tải lại vẫn bỏ câu trả lời | Thêm phức tạp mà không giải quyết vấn đề |
| F | **Client + server:** xoay idempotent theo request id (client lưu id vào `sessionStorage` trước khi gửi, trang sau gửi lại id đó, server trả lại đúng kết quả cũ) | Tải lại và quay lại trong cùng tab | Đóng tab rồi mở tab mới | Kết quả giống A cộng một phần của C nhưng tốn công nhất: cần bảng hoặc cột mới; cơ chế `Idempotency-Key` của Bước 0 cần `userId`, mà refresh là endpoint `@Public`, nên không dùng lại được |
| G | Chấp nhận, ghi vào giới hạn đã biết | | | Nhân viên F5 liên tục, hoặc rời trang đúng lúc refresh, sẽ phải đăng nhập lại; báo động giả `refresh_reuse_detected` vẫn còn |

**Đề xuất: làm A ngay.** A nhỏ nhất, đã có bằng chứng chữa đúng nguyên nhân, không nới bảo mật. **B để chủ dự án quyết**:
nếu muốn che thêm trường hợp mất mạng và trình duyệt khác thì làm kèm (một hằng số → config, sửa IR11 và B1#16). C hoặc F
nên cân nhắc lại khi làm app Flutter, vì app không có `keepalive`.

Ảnh hưởng: A chỉ đụng luồng refresh của `apps/admin` (sau này áp dụng y vậy cho web app học viên). B đụng
`apps/api/src/identity/sessions/session.service.ts`, config, spec Identity (IR11) và design Bước 1 (B1#16, B1E8).

Theo luật của repo, bước tiếp theo là một design doc nhỏ cho phương án được chọn (có edge case When → Then riêng), rồi
plan, rồi TDD.

## Chưa kiểm chứng và rủi ro còn lại

- **A mới thử bằng một request do script gửi** (thí nghiệm 7), chưa chạy hết luồng "admin dùng keepalive + 429 + thử lại"
  vì như vậy phải sửa code admin. Suy luận: kết hợp thí nghiệm 7 (cookie luôn mới) với thí nghiệm 3 (cookie mới thì thử
  lại thành công). Cần chạy thật khi làm. *Bổ sung cùng ngày, lúc viết design:* đã chạy cả hai luồng trên admin thật với
  `keepalive` giả lập bằng init script (code app không đổi): rời trang rồi quay lại sau 12 s còn đăng nhập 3/3, đường 429
  còn đăng nhập (`leave-about-blank.out`, `browser-inflight-all-keepalive.out`). Vẫn cần chạy lại trên code thật.
- `keepalive` chỉ mới thử trên Chromium 153 (bản đi kèm Playwright 1.63). Firefox và Safari: **chưa thử**.
- Ở production, API ở xa nên request refresh chạy lâu hơn nhiều so với ~20 ms ở máy local, nên khả năng F5 rơi đúng lúc
  refresh đang chạy cao hơn (`ASSUMPTION`, chưa đo).
- Với sự cố gốc, DB không ghi token nào được gửi ở lần thử lại cuối. Kết luận "cookie đã cũ" dựa vào việc token mới nhất
  chưa bao giờ được dùng mà chuỗi vẫn bị `reuse_detected`. Các lần tái hiện (thí nghiệm 4, 5) thì đọc được cookie trực tiếp.
- Công cụ đo: Chrome DevTools Protocol không báo `loadingFailed` cho request của trang đã bị bỏ, nên những request đó hiện
  là `pending` (không bao giờ có câu trả lời), không phải `CANCELED`. Lần chạy HTTP đầu tiên đóng socket quá muộn (server
  đã kịp trả lời), đã sửa và chạy lại; `http-repro.out` là lần chạy đúng.
- Admin chạy bằng Vite dev server (giống lần chạy gốc), không phải bản build production.
- Rủi ro chưa xử lý cho app Flutter sau này: app bị tắt giữa lúc refresh thì lần mở sau (quá 10 s) sẽ mất phiên.

## Chạy lại

Cần `docker compose up -d` (Postgres 5434, Redis 6380, Mailpit 8025), `pnpm install`, rồi trong `apps/api` chạy
`pnpm db:setup` và `pnpm build` với `DATABASE_URL` trỏ tới một DB trống (lần này dùng `english_learning_reload_repro`, vẫn
còn trên Postgres local, có thể xóa). `evidence/stack.mjs` chạy API (cổng 3300) và admin (cổng 5273). Secret được sinh
trong bộ nhớ và truyền qua biến môi trường, không có file `.env`. Script cũng tạo một tài khoản admin thử. Sau đó chạy
`http-repro.mjs`, `browser-repro.mjs <fast|slow|inflight> [gapMs] [reloads] [abortPages]`, `leave-repro.mjs [giây]`,
`keepalive-probe.mjs [số lần]`. Bản `leave-repro2.mjs` và `browser-repro2.mjs` nhận thêm biến môi trường `LEAVE_URL` (trang
để rời tới, ví dụ `about:blank`) và `KEEPALIVE=1` (init script thêm `keepalive` cho refresh của admin). Các script có đường
dẫn worktree viết cứng, cần sửa nếu chạy ở chỗ khác.
