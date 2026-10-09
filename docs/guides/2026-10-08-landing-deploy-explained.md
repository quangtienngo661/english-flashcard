# Hiểu hệ thống landing + waitlist trên Cloudflare

Viết ngày 08/10/2026 cho chủ dự án, trước khi triển khai `docs/superpowers/plans/2026-10-08-landing-deploy.md`
(spec: `docs/superpowers/specs/2026-10-08-landing-deploy-design.md`). Mục tiêu: đọc xong, bạn tự trả lời được "hệ thống
đang làm gì, dữ liệu nằm đâu, hỏng thì xem ở đâu" và tự kiểm tra được từng task.

Quy ước: những gì đã kiểm tra trong tài liệu chính thức hôm nay ghi nguồn ở cuối mục. Chỗ nào **chưa kiểm** thì ghi rõ
`CHƯA KIỂM`.

---

## 0. Bức tranh toàn cảnh

Một người mở `wordmet.com` rồi điền email. Đây là đường đi của request:

```
 Trình duyệt người dùng
   │ 1. "wordmet.com ở đâu?"
   ▼
 DNS (Cloudflare)  ──trả lời──▶ "ở máy chủ Cloudflare"
   │ 2. Gửi request tới Cloudflare
   ▼
 Luật chống spam (rate limiting): IP này gửi quá 20 lần/10 giây chưa?
   │ 3. Chưa → cho qua
   ▼
 Worker "wordmet-web"  (code Next.js của bạn, đã được OpenNext đóng gói)
   ├─ GET /vi, /en, /privacy  → trả file HTML làm sẵn lúc build (rất nhanh)
   ├─ GET /                   → proxy.ts chọn ngôn ngữ, chuyển hướng sang /vi hoặc /en
   └─ POST /en (gửi form)     → Server Action joinWaitlist
                                   │ 4. qua "dây nối" tên DB
                                   ▼
                               D1 "wordmet-waitlist"  (bảng waitlist: email, locale, created_at)
```

Thư gửi tới `hello@wordmet.com` đi một đường **khác hẳn**: không qua Worker, đi qua Email Routing (mục 6).

---

## 1. Domain và DNS

### Domain là gì, mua ở đâu
- **Domain** (`wordmet.com`) là cái tên bạn thuê theo năm. Nơi bán là **registrar**; bạn dự định mua ở Cloudflare Registrar.
- Mua xong, Cloudflare vừa là nơi bán, vừa là nơi giữ **DNS** của domain.

### DNS là gì
DNS là "danh bạ" của internet: biến tên (`wordmet.com`) thành địa chỉ máy. Danh bạ gồm nhiều **bản ghi** (record), mỗi
loại trả lời một câu hỏi khác nhau:

| Loại bản ghi | Trả lời câu hỏi | Dùng trong dự án này |
|---|---|---|
| A / AAAA / CNAME | "Website ở máy nào?" | Cloudflare tự tạo khi bạn gắn Custom Domain cho Worker |
| **MX** | "Thư gửi tới @wordmet.com thì giao cho ai?" | Cloudflare tự tạo khi bật Email Routing |
| TXT (SPF, DKIM) | "Ai được phép gửi/chuyển thư cho domain này?", "Thư này có thật không?" | Cloudflare tự tạo khi bật Email Routing |

**Điểm mấu chốt: DNS website và DNS email là hai nhóm bản ghi riêng.** Web chết không làm mất thư, và ngược lại. Khi
"web mở được mà mail không về", bạn kiểm MX/TXT, không kiểm Worker.

### Gắn domain cho Worker (Custom Domain)
Theo tài liệu Cloudflare, khi gắn Custom Domain, *"Cloudflare will create DNS records and issue necessary certificates
on your behalf"*. Tức là bạn không phải tự tạo bản ghi web, và chứng chỉ HTTPS (ổ khoá trên trình duyệt) được cấp tự động.
Điều kiện: domain phải nằm trên Cloudflare, và tên đó chưa có sẵn bản ghi CNAME.

### Tự kiểm tra
```powershell
nslookup wordmet.com              # có địa chỉ trả về → DNS web đã có
nslookup -type=MX wordmet.com     # thấy máy chủ mail của Cloudflare → DNS email đã có
curl.exe -sI https://wordmet.com/ # thấy "HTTP/1.1 307" và "location: /vi" (hoặc /en) → Worker đang trả lời
```
Bản ghi mới thường có hiệu lực sau 5–15 phút, lâu nhất 24 giờ (theo trang Email Routing).

Nguồn: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
[Enable Email Routing](https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/).

---

## 2. Workers và OpenNext: code chạy ở đâu?

### Workers
**Cloudflare Workers** là nơi chạy code phía server của Cloudflare. Bạn không thuê một máy chủ cố định; mỗi request,
Cloudflare chạy code của bạn ở trung tâm dữ liệu gần người dùng.

Gói Free (đã kiểm): **100.000 request/ngày** (vượt thì trả lỗi 1027 tới hết ngày, reset 00:00 UTC = 7:00 sáng giờ VN) và
**10 ms CPU cho mỗi request**. 10 ms là thời gian máy *tính toán*, không tính thời gian chờ database.

### OpenNext
Next.js vốn được viết để chạy trên Node.js. Workers không phải Node.js đầy đủ. **OpenNext** (`@opennextjs/cloudflare`)
là công cụ "đóng gói lại" bản build Next.js cho vừa với Workers. Nó tạo ra:
- `.open-next/worker.js`: code chạy trên Worker;
- `.open-next/assets/`: các file tĩnh (HTML làm sẵn, ảnh, CSS, JS cho trình duyệt).

OpenNext chưa hỗ trợ đầy đủ Windows: khi build trên máy bạn nó tự in *"OpenNext is not fully compatible with Windows"*,
và lỗi tạo symlink là lý do phải bật Developer Mode. Máy build của Cloudflare chạy Linux nên không gặp lỗi này.

### Phần nào chạy ở đâu

| Phần | Chạy ở đâu | Ví dụ trong dự án |
|---|---|---|
| HTML các trang `/vi`, `/en`, `/privacy` | **Tạo sẵn lúc build**, Worker chỉ gửi file đi | Nội dung landing, FAQ |
| Hiệu ứng, carousel, lật flashcard, trạng thái form | **Trình duyệt** người dùng (JavaScript) | `ClozeCarousel`, `WaitlistForm` |
| Chuyển `/` sang `/vi` hoặc `/en` | **Worker** (`src/proxy.ts`) | Đọc cookie, quốc gia (`cf-ipcountry`), ngôn ngữ trình duyệt |
| Xử lý form email | **Worker** (Server Action `joinWaitlist`) | Kiểm email, ghi D1 |

### Server Action là gì
Khi người dùng bấm "Nhận thông báo", trình duyệt **không** tự ghi vào database (trình duyệt không bao giờ được giữ quyền
vào database). Nó gửi một request POST về chính trang đang mở (ví dụ `/en`). Next.js nhận ra đó là Server Action và chạy
hàm `joinWaitlist` **trên Worker**. Hàm kiểm email, kiểm ô tick, ghi D1, rồi trả kết quả để form hiện "Bạn đã có tên
trong danh sách".

Hệ quả: luật chống spam lọc theo đường dẫn `/vi`, `/en` bắt được cả lượt gửi form lẫn lượt xem trang. Vì thế ngưỡng đặt
rộng (20 lần/10 giây/IP), để người xem bình thường không bao giờ chạm tới.

### `proxy.ts`
Next 16 chạy `proxy.ts` kiểu Node.js. Lần build thử hôm nay, OpenNext nhận nó nhưng cảnh báo *"Node.js middleware support
is experimental in cloudflare"*. Bạn đã chốt giữ nguyên; nếu test chuyển hướng (LP4–LP7) đỏ trên Worker thì đổi thành
`middleware.ts`.

Nguồn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[OpenNext Cloudflare](https://opennext.js.org/cloudflare).

---

## 3. D1 và binding `DB`: email nằm ở đâu?

### D1
**D1** là database của Cloudflare, dựa trên SQLite (một loại database gọn, cả database là một file). Gói Free (đã kiểm):
**100.000 lần ghi/ngày**, **5 triệu lần đọc/ngày**, **5 GB**. Vượt hạn mức ghi thì câu lệnh ghi báo lỗi tới 00:00 UTC.

### Binding là gì
**Binding** là "dây nối có tên" giữa Worker và một tài nguyên. Trong `apps/web/wrangler.jsonc`:

```jsonc
"d1_databases": [{
  "binding": "DB",                        // tên mà code dùng: env.DB
  "database_name": "wordmet-waitlist",    // tên database trên Cloudflare
  "database_id": "…"                      // mã định danh database thật
}]
```

Code không có mật khẩu hay địa chỉ database. Nó chỉ gọi `env.DB`, và Cloudflare tự nối tới đúng database có
`database_id` đó. Hệ quả:
- Không có bí mật nào để lộ trong code hay GitHub.
- **Worker ghi vào database nào là do `database_id` quyết định.** Hiện id là `00000000-…` (giả, chỉ dùng trên máy). Task
  7 thay bằng id thật sau khi bạn tạo database. Nếu quên thay, deploy sẽ lỗi hoặc ghi sai chỗ, nên đây là dòng phải soát
  kỹ khi review.

### Bảng `waitlist`
```sql
CREATE TABLE waitlist (
  email      TEXT PRIMARY KEY,                               -- không thể có 2 dòng cùng email
  locale     TEXT NOT NULL CHECK (locale IN ('vi', 'en')),   -- chỉ nhận 'vi' hoặc 'en'
  created_at TEXT NOT NULL                                   -- giờ UTC lúc đăng ký = lúc tick đồng ý
);
```
Lệnh ghi là `INSERT … ON CONFLICT(email) DO NOTHING`: email mới thì thêm, email đã có thì **không làm gì** và không báo
lỗi. Nhờ vậy bấm đúp hay hai tab gửi cùng lúc vẫn chỉ có một dòng (DE2), và người dùng luôn thấy "thành công", nên kẻ
xấu không dò được ai đã đăng ký.

### Migration
**Migration** là file SQL mô tả thay đổi cấu trúc bảng (`apps/web/migrations/0001_waitlist.sql`). Wrangler ghi nhớ file
nào đã chạy trên database nào, nên chạy lại không bị tạo bảng hai lần. Trên production, migration chạy **bằng tay** một lần
(`pnpm db:migrate:remote`), không tự chạy khi deploy.

### Khôi phục khi lỡ tay
D1 có **Time Travel**: luôn bật, gói Free giữ **7 ngày** lịch sử (đã kiểm). Lỡ xoá nhầm thì khôi phục database về một thời
điểm trong 7 ngày gần nhất. Cách khôi phục cụ thể: `CHƯA KIỂM`, README (Task 6) sẽ ghi lệnh chính xác.

Nguồn: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

---

## 4. Local và production: đang thử hay đang đụng dữ liệu thật?

Đây là chỗ dễ nhầm nhất. Có **hai** database cùng tên `wordmet-waitlist`:

| | **Local** (trên máy bạn) | **Production** (trên Cloudflare) |
|---|---|---|
| Nằm ở | `apps/web/.wrangler/state/` (bị git bỏ qua) | Tài khoản Cloudflare của bạn |
| Ai ghi vào | `pnpm dev`, `pnpm cf:dev`, e2e test | Người dùng thật trên `wordmet.com` |
| Lệnh đọc | `wrangler d1 execute wordmet-waitlist --local …` | `wrangler d1 execute wordmet-waitlist --remote …` |
| Xoá thoải mái? | Có (xoá thư mục `.wrangler`) | **Không**: đây là email người thật |

**Quy tắc nhận biết: có chữ `--remote` là đang đụng production.** Trước khi chạy lệnh có `--remote`, đọc lại câu SQL,
nhất là `DELETE`.

Vì sao bản preview bị tắt (DP7): Cloudflare có thể build thêm một bản thử cho mỗi nhánh khác `main`. Bản thử đó dùng cùng
binding, tức là **cùng database production**. Ai thử form trên bản preview sẽ ghi email rác vào danh sách thật. Tắt preview
thì chỉ code đã merge vào `main` mới chạm được D1 thật.

---

## 5. Build và deploy: phiên bản nào đang chạy, hỏng thì làm gì?

### Đường đi của code
```
Sửa code trên nhánh ─▶ push ─▶ mở PR ─▶ GitHub Actions CI (lint, typecheck, unit, e2e)
                                          │ xanh
                                          ▼
                                     merge vào main
                                          │ Workers Builds thấy main đổi (chỉ khi apps/web/** đổi)
                                          ▼
                     Cloudflare build trên máy Linux: opennextjs-cloudflare build
                                          │ thành công
                                          ▼
                     opennextjs-cloudflare deploy ─▶ tạo một "version" mới, nhận 100% lượt truy cập
```
Build lỗi thì **bản cũ vẫn chạy**, không có gì bị gỡ xuống (DE11).

### Biến `NEXT_PUBLIC_*` được "nướng" vào lúc build
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_INDEXABLE`, `NEXT_PUBLIC_CONTACT_EMAIL` được ghi thẳng vào code lúc build. Đổi giá trị
trên dashboard **không** có tác dụng cho tới lần build sau (DE12). Ví dụ: muốn tắt index thì đổi biến rồi build lại.

### Xem phiên bản đang chạy và quay lại bản trước
- Dashboard → Workers & Pages → `wordmet-web` → **Deployments**: danh sách các version, version nào đang nhận lượt truy cập.
- **Rollback** (quay lại bản cũ): trên dashboard bấm "⋯" cạnh version cũ → **Rollback**, hoặc chạy `wrangler rollback`.
  Quay lại được trong 100 version gần nhất.
- **Rollback chỉ đổi code, không đổi dữ liệu.** Tài liệu ghi: *"Resources connected to your Worker will not be changed
  during a rollback."* Email trong D1 vẫn nguyên. Ngược lại, nếu bản mới đã đổi cấu trúc bảng, code cũ có thể lỗi với bảng
  mới. Waitlist chỉ có một migration nên chưa gặp chuyện này.

### Xem lỗi ở đâu
| Lỗi gì | Xem ở đâu |
|---|---|
| Build hỏng | Dashboard → `wordmet-web` → tab build (Workers Builds) → log build |
| Test hỏng trước khi merge | GitHub → tab Actions của PR |
| Lỗi lúc chạy (ví dụ D1 lỗi, log `waitlist_store_failed`) | Dashboard → `wordmet-web` → **Observability** (Workers Logs) |

⚠️ **Lỗ hổng trong plan, phát hiện khi viết doc này:** Workers Logs chỉ ghi lại khi `wrangler.jsonc` có
`"observability": { "enabled": true }`. Plan hiện **chưa có** dòng này, nên log `waitlist_store_failed` sẽ không được lưu.
Đề xuất: thêm vào Task 1. Gói Free lưu log **3 ngày**, tối đa **200.000 dòng/ngày** (đã kiểm).

Nguồn: [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/),
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).

---

## 6. Email và các giới hạn của gói Free

### Ba thứ dễ nhầm

| | Làm gì | Trong dự án |
|---|---|---|
| **Cloudflare Email Routing** | **Nhận** thư gửi tới `@wordmet.com` rồi chuyển về Gmail của bạn. Miễn phí, không giới hạn số thư nhận (đã kiểm) | Dùng ngay: `hello@`, `ryan.ngo@` → Gmail |
| **Google Workspace** | Hộp thư thật: nhận **và gửi** bằng `@wordmet.com`. 8,40 USD/tháng | Chưa mua; mua khi cần gửi thư chuyên nghiệp |
| **Resend** | Dịch vụ cho **code** gửi thư (OTP, thư báo ra mắt). Free 100 thư/ngày, 3.000/tháng (đã kiểm) | Chưa dùng ở landing; dùng cho BE sau này |

Hệ quả thực tế: trả lời người dùng (ví dụ xác nhận đã xoá email) tạm thời sẽ gửi **từ Gmail cá nhân**, không phải từ
`hello@wordmet.com`.

### Khi chạm giới hạn, người dùng thấy gì

| Giới hạn | Khi vượt | Người dùng thấy |
|---|---|---|
| Workers: 100.000 request/ngày | Lỗi 1027 tới 00:00 UTC | Cả trang không mở được |
| Workers: 10 ms CPU/request | Request đó bị dừng | Trang hoặc form lỗi. Chưa đo thực tế, trang tĩnh gần như không tốn CPU (`CHƯA KIỂM` con số) |
| D1: 100.000 ghi/ngày | Lệnh ghi báo lỗi | Form hiện lỗi chung; log `waitlist_store_failed` (nếu đã bật observability) |
| Rate limiting: 20 request/10 giây/IP | Cloudflare trả 429 trong 10 giây | Trang lỗi chung (DE6), chỉ khi gửi dồn bất thường |
| Email Routing | Không giới hạn số thư nhận | — |

Với landing mới ra mắt, các mức này dư nhiều lần. Mục này giúp bạn đoán đúng nguyên nhân khi có sự cố.

---

## 7. Đọc spec và plan bằng các khái niệm trên

| Ký hiệu trong spec/plan | Nghĩa | Mục ở doc này |
|---|---|---|
| DP1 (D1), binding `DB`, `createD1Store` | Email lưu ở D1 qua dây nối `DB` | 3 |
| DP2, DP9, DE6 | Chống spam bằng rate limiting, ngưỡng 20/10 giây | 2, 6 |
| DP3, DP6, DP7 | Workers Builds; cấu hình build; tắt preview | 4, 5 |
| DP5, `NEXT_PUBLIC_INDEXABLE` | Cho Google index, biến nướng lúc build | 5 |
| DP8, DP10 | Custom Domain + `www`; Email Routing | 1, 6 |
| DP11, `proxy.ts` | Giữ proxy, đổi nếu lỗi | 2 |
| DE1–DE2 | Chuẩn hoá email; gửi trùng chỉ một dòng | 3 |
| DE3–DE4 | D1 lỗi / thiếu binding → form báo lỗi + log | 3, 5 |
| DE7–DE8 | Local tách production; preview tắt | 4 |
| DE10 | Xoá email theo yêu cầu bằng `--remote` | 4 |
| DE11–DE12 | Build lỗi giữ bản cũ; biến đổi cần build lại | 5 |

### Mỗi task xong, bạn tự kiểm gì

| Task | Câu hỏi kiểm | Bằng chứng nên thấy |
|---|---|---|
| 1 | Landing có chạy trên Worker như trước không? | Toàn bộ e2e xanh khi chạy bằng `pnpm cf:dev`; `/` chuyển hướng đúng |
| 2 | Bảng có chặn trùng và chặn ngôn ngữ lạ không? | Test `d1-store` xanh, có test hai lần ghi song song |
| 3 | Gửi form có thật sự vào D1 không? Lỗi có log không? | e2e đọc D1 local thấy đúng 1 dòng; test log không chứa email |
| 4 | Chính sách có thật, link có mở được không? | Trang `/privacy` không còn chữ "nháp"; bấm link không tick ô |
| 5 | Footer giữ trang? Carousel cuộn đúng? | e2e `/vi/privacy` → `/en/privacy`; card mới nằm giữa |
| 6 | CI có chạy đúng cách build mới không? | PR xanh trên GitHub Actions |
| 7 | Web, form, mail chạy thật chưa? | Bài thực hành ở mục 8 |

---

## 8. Bài thực hành cốt lõi (làm sau Task 7)

Mục tiêu: **gửi một email thử → thấy nó trong D1 production → deploy lại → email vẫn còn.** Làm được và giải thích được
từng bước là bạn nắm phần cốt lõi.

1. Mở `https://wordmet.com/vi`, đăng ký bằng `thu-nghiem-0810@example.com`, tick ô, gửi. Thấy thông báo thành công.
2. Trong `apps/web`, xem trong **production**:
   ```powershell
   pnpm exec wrangler d1 execute wordmet-waitlist --remote --command "SELECT * FROM waitlist WHERE email = 'thu-nghiem-0810@example.com'"
   ```
   Thấy đúng một dòng, `locale = vi`. *Giải thích được:* form chạy trên Worker (mục 2) → qua binding `DB` (mục 3) → database
   production (mục 4, có `--remote`).
3. Gửi lại đúng email đó. Chạy lại lệnh trên: vẫn **một** dòng (`ON CONFLICT DO NOTHING`).
4. Deploy lại: sửa một chữ nhỏ, đi qua PR → CI → merge, chờ Workers Builds xong; hoặc dùng nút deploy lại bản build trên
   dashboard (`CHƯA KIỂM` vị trí nút). Trong tab Deployments thấy một version mới.
5. Chạy lại lệnh ở bước 2: dòng vẫn còn. *Giải thích được:* deploy và rollback chỉ thay **code**; dữ liệu nằm trong D1,
   tách khỏi code (mục 5).
6. Dọn dẹp, để email thử không nằm trong danh sách thật:
   ```powershell
   pnpm exec wrangler d1 execute wordmet-waitlist --remote --command "DELETE FROM waitlist WHERE email = 'thu-nghiem-0810@example.com'"
   ```
7. Thêm: gửi thư từ Gmail khác tới `hello@wordmet.com`, thấy thư về Gmail của bạn (mục 1 và 6, đường đi qua MX, không qua
   Worker).

---

## 9. Bảng thuật ngữ

| Thuật ngữ | Nghĩa ngắn |
|---|---|
| Registrar | Nơi bán domain |
| DNS, bản ghi (record) | Danh bạ biến tên thành địa chỉ; mỗi loại bản ghi trả lời một câu hỏi |
| MX | Bản ghi chỉ nơi nhận thư của domain |
| SPF, DKIM | Bản ghi TXT chứng minh thư hợp lệ, giảm nguy cơ vào spam |
| Worker | Code phía server chạy trên Cloudflare |
| OpenNext | Công cụ đóng gói Next.js để chạy trên Worker |
| Static assets | File làm sẵn lúc build (HTML, ảnh, CSS) |
| Server Action | Hàm phía server mà form gọi tới (ở đây: `joinWaitlist`) |
| D1 | Database SQLite của Cloudflare |
| Binding | Dây nối có tên từ Worker tới tài nguyên (`DB` → D1) |
| Migration | File SQL thay đổi cấu trúc bảng, chạy một lần mỗi database |
| Local / `--local` | Bản trên máy bạn; dữ liệu thử |
| Production / `--remote` | Bản thật trên Cloudflare; dữ liệu người dùng |
| Workers Builds | Cloudflare tự build và deploy khi `main` đổi |
| Version, deployment | Mỗi lần deploy tạo một version; version đang nhận lượt truy cập là bản đang chạy |
| Rollback | Cho một version cũ nhận lại lượt truy cập; không đổi dữ liệu |
| Observability / Workers Logs | Nơi xem log lúc chạy; phải bật trong `wrangler.jsonc` |
| Rate limiting | Giới hạn số request mỗi IP trong một khoảng thời gian |
| Time Travel | Khôi phục D1 về một thời điểm trong 7 ngày (Free) |
| Email Routing | Nhận thư `@wordmet.com` và chuyển tiếp; không gửi đi |

---

## 10. Ngoài plan: nên tìm hiểu thêm

Plan chỉ lo cho web chạy và email không mất. Các mảng dưới đây plan **không** làm nhưng bạn sẽ gặp khi vận hành thật. Xếp
theo mức cần thiết; ba mục đầu nên nắm trước khi mở công khai.

| # | Chủ đề | Vì sao liên quan tới bạn | Bạn cần trả lời được | Khi nào cần |
|---|---|---|---|---|
| 1 | **Luật bảo vệ dữ liệu cá nhân của Việt Nam** | Email là dữ liệu cá nhân. Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 có hiệu lực từ 01/01/2026; Nghị định 356/2025/NĐ-CP hướng dẫn luật và thay Nghị định 13/2023 (đã kiểm qua các nguồn bên dưới, chưa đọc văn bản gốc) | Thu email cho waitlist cần sự đồng ý dạng nào? Người dùng có quyền gì (xem, xoá)? Có nghĩa vụ thông báo/đăng ký gì không? | **Trước khi mở form công khai.** Trang chính sách trong plan là bản ngắn, không phải tư vấn pháp lý |
| 2 | **Bảo mật tài khoản** | Mất tài khoản Cloudflare = mất domain, web và danh sách email; mất GitHub = người khác đẩy code lên `main` | Đã bật xác thực hai bước (2FA) cho Cloudflare, GitHub, Gmail chưa? Domain có bật tự gia hạn không? (`CHƯA KIỂM` cách bật trên Cloudflare Registrar) | Ngay khi mua domain |
| 3 | **Xử lý yêu cầu xoá dữ liệu** | Chính sách hứa xoá trong 30 ngày (DE10) | Ai đọc hộp thư `hello@`? Ghi lại yêu cầu ở đâu để không quên? | Trước khi mở form |
| 4 | **Google Search Console** | DP5 cho index; Search Console cho biết Google đã thấy trang chưa, có lỗi gì | Xác minh quyền sở hữu domain (thường bằng bản ghi TXT trong DNS, `CHƯA KIỂM` cách cụ thể), gửi `sitemap.xml` | Sau deploy đầu |
| 5 | **Gửi thư từ domain (sau này)** | Khi BE gửi OTP hay thư báo ra mắt bằng Resend, cần thêm bản ghi DNS để thư không vào spam | SPF, DKIM, **DMARC** khác nhau thế nào; vì sao bản ghi Email Routing tạo (để *nhận* thư) chưa đủ cho việc *gửi* | Khi làm phần gửi thư |
| 6 | **Đo lượt truy cập** | Muốn biết có bao nhiêu người xem/đăng ký. Đã để ngoài phạm vi landing | Cloudflare Web Analytics thu gì, có cần cookie hay không, phải ghi vào chính sách bảo mật không (`CHƯA KIỂM`) | Khi muốn đo |
| 7 | **Theo dõi và cảnh báo** | Hiện chỉ biết web chết khi có người báo | Có công cụ nào báo khi web không mở được hoặc lỗi tăng vọt? (Cloudflare có mục Notifications, `CHƯA KIỂM` loại cảnh báo nào miễn phí) | Sau vài tuần chạy |
| 8 | **Chi phí khi vượt gói Free** | Biết trước để không hoảng khi chạm giới hạn | Gói Workers Paid giá bao nhiêu, đổi những giới hạn nào (một nguồn bên thứ ba ghi 5 USD/tháng, `CHƯA KIỂM` trên trang chính thức) | Khi lượt truy cập tăng |
| 9 | **Chuyển waitlist sang Postgres** | DP1 để việc này sau | Xuất D1 ra file (`wrangler d1 export`, `CHƯA KIỂM` cú pháp), nhập vào Neon, đối chiếu số dòng | Khi BE và Neon sẵn sàng |
| 10 | **HTTPS và chứng chỉ** | Custom Domain tự cấp chứng chỉ (mục 1) | HSTS là gì; vì sao không nên bật HSTS preload sớm | Đọc khi rảnh |

Nguồn mục 1: [LuatVietnam: hiệu lực Luật BVDLCN 2025](https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html),
[PwC Việt Nam: quy định mới về BVDLCN](https://www.pwc.com/vn/vn/publications/legal-news-brief/20260128-new-rules-personal-data-protection.html),
[EY: Nghị định 356/2025](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/ey-vietnam-legal-alert-march-2026-decree-no356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law-viet.pdf).
