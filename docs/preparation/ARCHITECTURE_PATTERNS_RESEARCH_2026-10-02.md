# Pattern nên biết để hệ thống tái sử dụng và mở rộng được — 02/10/2026

Ngày nghiên cứu: **02/10/2026**. Yêu cầu của người dùng: các quyết định hướng tới reusable và
scalable, không chỉ ở mức vừa đủ cho V1; người dùng chưa quen nhiều pattern nên cần research,
ghi lại để tham khảo và **áp dụng khi cần**. File này là danh mục để tra cứu, **không phải quyết
định áp dụng**: chưa pattern nào được chọn. Chưa có code.

Nhãn dùng trong file:

| Nhãn | Nghĩa |
| --- | --- |
| **Đã đọc** | Trích trực tiếp từ trang chính thức, đọc ngày 02/10/2026; link đầy đủ ở cuối mỗi mục. |
| **Suy luận** | Áp dụng của trợ lý cho app này; chưa kiểm chứng bằng thử nghiệm hay đo đạc. |
| **Chưa đọc** | Điều trợ lý biết là còn thiếu, ghi ở mục 9. |

## 0. Cách đọc: mỗi pattern có hai nửa

Cân bằng giữa "làm cho mở rộng được" và "không xây thứ chưa cần" là chỗ dễ sai nhất, nên mỗi
pattern dưới đây tách thành hai phần:

- **Chuẩn bị rẻ ở V1** — một ranh giới, một cột, một quy ước. Làm sớm gần như không tốn gì, và
  **khó đổi sau khi đã có client và dữ liệu thật**.
- **Chỉ áp dụng khi có tín hiệu** — phần tốn công, thêm hạ tầng hoặc thêm lớp trừu tượng. Chờ
  tín hiệu đo được rồi mới làm.

Thứ làm nên khác biệt giữa hai nửa là **chi phí đổi ý muộn** (suy luận):

```
Khó đổi sau khi có client/dữ liệu thật  →  quyết định ngay từ V1
  • định dạng lỗi API        • kiểu phân trang       • ID (user/sense/operation)
  • bảng danh tính tách khỏi user                    • trường loại mục (entry_type)
  • quyền theo feature kèm nguồn cấp                 • khóa chống trùng (idempotency)

Dễ thêm sau (thêm một lớp, không đụng dữ liệu)  →  chờ tín hiệu
  • circuit breaker          • cache / replica       • outbox / queue cho luồng người dùng
  • registry cho nhiều kiểu bài                      • scheduler lặp lại ngắt quãng
```

Mục này nối với nguyên tắc đã ghi trong `WORKSPACE_INSTRUCTIONS_FROM_CODEX.md` và `SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md`: không dựng
framework tổng quát cho feature chưa có. Nếu bạn muốn đưa **nhiều pattern hơn vào V1**, đó là
quyết định riêng; file này chỉ giúp bạn thấy mỗi cái tốn gì.

## Bản đồ nhanh

| Vùng | Pattern | V1: chuẩn bị rẻ | Chỉ áp dụng khi |
| --- | --- | --- | --- |
| 1. Loại mục từ vựng | Cột phân loại + payload theo loại | `entry_type` chỉ có `word` | Thêm phrasal verb / collocation / idiom |
| 2. Dạng bài tập | Strategy + registry | Interface `generate`/`evaluate` cho 3 chế độ | Kiểu bài thứ tư có workflow khác hẳn |
| 3. Gọi AI | Ports & Adapters, retry có jitter, idempotency key, circuit breaker | Adapter + deadline + retry hữu hạn + operation ID | Provider sập gây dồn request → circuit breaker |
| 4. Quyền và hạn mức | Entitlement theo feature + ledger dùng | Feature code, nguồn cấp, ledger | Thêm gói, thêm billing |
| 5. Đăng nhập | Danh tính tách user, Argon2id, OAuth PKCE, OTP một lần | Bảng identity, hash, `sub` làm khóa | Thêm provider đăng nhập |
| 6. Job nền | Queue + job ID, backoff, rate limit, idempotent consumer | Khóa job lưu trong DB, trạng thái draft→published | Outbox khi cần tin cậy hơn |
| 7. API và client | Problem Details, phân trang token, OpenAPI | Chốt định dạng lỗi + phân trang | Generate client khi có đủ endpoint |
| 8. Tiến độ học | Nhật ký ôn tập append-only | (tùy chọn, ngoài V1) | Thêm lịch ôn thích ứng |

---

## 1. Loại mục từ vựng mở rộng được — phrasal verb, collocation, idiom

**Vấn đề của app.** Bạn để phrasal verb, collocation và idiom cho sau V1. Cái cần tránh là schema
V1 chỉ hợp với "một từ đơn", khiến sau này phải dời dữ liệu.

**Pattern: một bảng, một cột phân loại, payload riêng theo loại.** Martin Fowler gọi đó là
*Single Table Inheritance*: "Represents an inheritance hierarchy of classes as a single table that
has columns for all the fields of the various classes", nhằm giảm số join so với tách bảng theo từng
lớp con. **Đã đọc.**

**Đừng dùng table inheritance của PostgreSQL cho việc này.** Tài liệu PostgreSQL ghi giới hạn
"indexes (including unique constraints) and foreign key constraints only apply to single tables, not
to their inheritance children", nên khóa duy nhất hay khóa ngoại trỏ vào bảng cha không bao phủ các
bảng con. **Đã đọc.** Với app này, hệ quả (suy luận): `group_items` và `user_vocabulary` cần khóa
ngoại tới "mục từ vựng" bất kể loại, nên một bảng có cột phân loại hợp hơn.

- **Chuẩn bị rẻ ở V1:** cột `entry_type` (V1 chỉ có giá trị `word`), nằm trong khóa duy nhất của
  entry; cột `lemma` chấp nhận chuỗi nhiều từ. Schema D đang có `vocabulary_entries` nên chỉ thêm
  một cột. Dùng cùng chỗ này cho từ chức năng (cách B): một trường phân loại để lọc khỏi bộ học mặc
  định.
- **Chỉ áp dụng khi:** thêm loại đầu tiên. Lúc đó mới thiết kế payload riêng, ví dụ phrasal verb cần
  động từ, tiểu từ, có tách được hay không (suy luận); validation theo loại nằm ở code.
- **Cái giá:** các cột chỉ có nghĩa với một loại sẽ để trống ở loại khác, hoặc chuyển vào JSONB có
  kiểm tra schema (xem `V1_DATA_MODEL_DRAFT.md`, mục 1).

Nguồn: [Fowler, Single Table Inheritance](https://martinfowler.com/eaaCatalog/singleTableInheritance.html),
[PostgreSQL, Inheritance caveats](https://www.postgresql.org/docs/current/ddl-inherit.html).

## 2. Dạng bài tập mở rộng được

**Vấn đề của app.** V1 có bài điền từ (tự viết câu tạm thời chưa ở V1); kết quả bài điền từ còn kèm giải thích vì sao dùng
từ đó và bản dịch nguyên câu (bạn xác nhận cuối ngày 02/10). Sau này còn có bài cho phrasal verb, idiom.

**Pattern: Strategy.** "lets you define a family of algorithms, put each of them into a separate
class, and make their objects interchangeable"; dùng khi muốn đổi biến thể thuật toán lúc chạy và
tách logic nghiệp vụ khỏi chi tiết cài đặt. **Đã đọc.**

Áp dụng (suy luận): mỗi dạng bài là một handler cùng giao diện, ví dụ `generate(ngữ cảnh)` và
`evaluate(đáp án)`. Kết quả gồm trạng thái, kết luận đúng/sai và phần giải thích + bản dịch. Giải thích
và bản dịch có thể được sinh **cùng lúc với bài** (một lần gọi AI) rồi lưu trong snapshot của bài, nên
lúc nộp đáp án vẫn chấm bằng rule, không gọi AI thêm lần nữa (suy luận, chưa chốt).

- **Chuẩn bị rẻ ở V1:** giao diện handler và trường `type` + `payload_schema_version` trên bài tập
  (đã có trong `V1_GRADING_RULES_DRAFT.md`, mục 8). Client phải chịu được `type` lạ (xem mục 7).
- **Chỉ áp dụng khi:** có kiểu bài thứ tư với workflow thật sự khác. Khi đó mới cần registry nạp
  handler động; trước đó một bảng ánh xạ `type → handler` trong code là đủ.
- **Cái giá:** thêm một lớp gián tiếp. Mỗi handler vẫn phải có bộ ví dụ kiểm tra riêng.

Nguồn: [Refactoring Guru, Strategy](https://refactoring.guru/design-patterns/strategy).

## 3. Gọi AI: adapter, retry, idempotency, breaker

**Vấn đề của app.** Nhà cung cấp AI có thể chậm, lỗi tạm thời, trả 429, hoặc bị đổi. Người dùng
bấm gửi hai lần hoặc mạng rớt giữa chừng.

| Pattern | Nội dung đã đọc | Áp dụng cho app (suy luận) |
| --- | --- | --- |
| **Ports & Adapters** (Hexagonal) | Mục đích: để ứng dụng "developed and tested in isolation from its eventual run-time devices and databases"; adapter chuyển sự kiện kỹ thuật thành lời gọi mà lõi hiểu. Đổi công nghệ ngoài mà không đổi lõi | `AiProvider` là một port; Gemini/OpenAI/Claude là adapter; test dùng adapter giả nên không tốn lượt gọi |
| **Exponential backoff + jitter** | Công thức Full Jitter `sleep = random(0, min(cap, base * 2 ** attempt))`; với 100 client tranh chấp, "reduced our call count by more than half"; "should be considered a standard approach for remote clients" | Retry hữu hạn cho lỗi tạm (429, 5xx, timeout), có jitter; không retry lỗi quyền hoặc input |
| **Idempotency key** | Stripe lưu status và body của lần đầu cho mỗi key, kể cả khi lỗi; key dùng lại với tham số khác sẽ báo lỗi; key tối đa 255 ký tự, nên dùng UUID v4, không dùng dữ liệu nhạy cảm làm key; có thể xóa key sau tối thiểu 24 giờ; chỉ lưu kết quả khi endpoint đã bắt đầu chạy | Mỗi lần gửi đáp án mang `operation_id`; gửi lại trả đúng kết quả đã lưu; cùng ID mà nội dung khác thì từ chối |
| **Circuit breaker** | Ba trạng thái Closed / Open / Half-Open; chặn gọi tiếp khi lỗi vượt ngưỡng để dịch vụ kia hồi phục. Azure ghi **không phù hợp** khi kiến trúc hướng message/event (đã có dead letter queue và retry), và không thay cho xử lý lỗi trong nghiệp vụ | Chưa cần ở V1; thêm khi nhà cung cấp lỗi kéo dài làm các request dồn lại và chiếm tài nguyên |

- **Chuẩn bị rẻ ở V1:** port `AiProvider` (kèm bản giả cho test), deadline cho mỗi lần gọi, retry
  hữu hạn có jitter, `operation_id` trên mọi tác vụ AI, và nhật ký chi phí mỗi lượt. Lỗi AI trả về
  trạng thái "chưa chấm được", không thành đáp án sai.
- **Chỉ áp dụng khi:** circuit breaker khi đo thấy provider lỗi kéo dài và request chờ dồn; chuyển
  luồng người dùng sang queue khi thời gian chờ quá lâu (đã nêu ở `PROJECT_CONTEXT.md`, phương án B).
- **Cái giá:** idempotency cần một bảng lưu kết quả theo key và quy tắc dọn; retry nhân chi phí khi
  provider vẫn tính tiền cho lần timeout (đã nêu ở `V1_GRADING_RULES_DRAFT.md`).

Nguồn: [Cockburn, Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/),
[AWS, Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/),
[Stripe, Idempotent requests](https://docs.stripe.com/api/idempotent_requests),
[Microsoft, Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker).

## 4. Quyền theo feature và hạn mức dùng

**Vấn đề của app.** Bạn chốt ba bậc: Free không AI, trial có AI, Pro có hạn mức cao hơn. Billing
làm sau; người dùng tự kích hoạt trial khi cần (xác nhận cuối ngày 02/10), nên pilot dùng được AI mà
không cần billing.

**Pattern: entitlement theo feature.** Stripe mô tả "An entitlement represents a customer's access
to a feature": feature có `lookup_key` duy nhất, gắn vào product; khi gói đổi, hệ thống nhận sự kiện
`entitlements.active_entitlement_summary.updated` để cấp hoặc thu hồi; Stripe khuyên "persist these
entitlements internally for faster resolution" và dùng entitlement để "Launch, change, and
experiment with your pricing without needing to change your codebase". **Đã đọc.** Trang này **không
nói tới hạn mức dùng** (số lượt), nên phần đó phải tự thiết kế.

**Pattern: giới hạn tốc độ.** Stripe mô tả *token bucket* ("take tokens on each request, and slowly
drip more tokens into the bucket") và bốn loại: giới hạn theo số request, số request đồng thời, giữ
chỗ hạ tầng cho request quan trọng, và bỏ bớt request ưu tiên thấp khi worker nghẽn. **Đã đọc.**

Áp dụng (suy luận):

```
Gói (Free / Trial / Pro)  ──cấp──▶  feature_entitlements   (quyền: ai.practice, ai.explain …)
                                          ▲
                       nguồn cấp: trial (người dùng tự kích hoạt) │ subscription │ cấp tay (ngoại lệ)
                                          │
Mỗi lượt AI ──kiểm tra quyền──▶ giữ chỗ hạn mức (nguyên tử) ──▶ gọi AI ──▶ ghi nhận / hoàn
```

- **Chuẩn bị rẻ ở V1:** feature code theo từng tính năng (không cờ `is_pro` chung); cột nguồn cấp gồm
  trial, subscription và `admin_grant` (cho ngoại lệ, không bắt buộc với pilot); hạn mức tách khỏi quyền và đọc từ cấu hình/bảng theo
  gói; ledger ghi mỗi lượt dùng kèm `operation_id`.
- **Chỉ áp dụng khi:** có billing thật (nguồn `subscription` được nối vào), thêm gói, hoặc cần
  metering chi tiết. Rate limiter theo token bucket cho API chung khi có tải thật.
- **Cái giá:** bảng quyền, bảng ledger, và quy tắc đối soát khi giữ chỗ nhưng provider lỗi.

Nguồn: [Stripe, Entitlements](https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api),
[Stripe, Rate limiters](https://stripe.com/blog/rate-limiters).

## 5. Đăng nhập: email + mật khẩu, Google OAuth 2.0, OTP qua SMTP

**Vấn đề của app.** Ba đường đăng nhập chung một tài khoản, cộng OTP gửi qua email.

**Mật khẩu (OWASP).** Argon2id là lựa chọn đầu: cấu hình tối thiểu `m=19456` (19 MiB), `t=2`, `p=1`;
bcrypt chỉ cho hệ thống cũ, giới hạn 72 byte. Cho phép mọi ký tự kể cả unicode, **không áp quy tắc
thành phần**, độ dài tối đa cho phép ít nhất 64 ký tự (NIST SP 800-63B-4 còn yêu cầu **tối thiểu 15 ký tự** khi
mật khẩu là yếu tố duy nhất, và cũng cấm quy tắc thành phần). Báo lỗi chung chung ("Login failed; Invalid
user ID or password"), và bộ đếm lần sai gắn với **tài khoản**, không chỉ IP. **Đã đọc.**

**Mã đặt lại / OTP (OWASP).** Sinh bằng bộ sinh số ngẫu nhiên an toàn mật mã, đủ dài để chống dò
vét, hết hạn, **dùng một lần**, lưu an toàn (như mật khẩu), giới hạn số lần thử, và phản hồi giống
nhau cho tài khoản có và không có (kể cả thời gian trả lời). Mã số cho PIN: 6–12 chữ số. **Đã đọc.**

**OAuth 2.0 (RFC 9700).** Client công khai **phải** dùng PKCE; client bảo mật được khuyến nghị dùng PKCE
(suy luận: app mobile Flutter là client công khai, backend của bạn là client bảo mật). Redirect URI phải khớp chính xác từng ký tự. Không
dùng implicit grant ("SHOULD NOT"), và password grant "MUST NOT be used". **Đã đọc.**

**Google OpenID Connect.** Backend phải kiểm tra `iss`, `aud`, `exp` của ID token. Dùng `sub` làm
khóa định danh ("unique among all Google Accounts and never reused"), **không** dùng email làm khóa
vì "may not be unique... and could change over time"; có claim `email_verified`. **Đã đọc.**

**Phiên (OWASP).** Session ID ít nhất 64 bit entropy; cookie `Secure`, `HttpOnly`, `SameSite=Strict`
(ưu tiên) hoặc `Lax`; **cấp lại session ID sau khi đăng nhập**; có cả idle timeout và absolute
timeout; khi hết phiên hoặc logout phải vô hiệu hóa phía server. **Đã đọc.**

**Đăng nhập trên mobile (RFC 8252, Google).** App native "MUST NOT use embedded user-agents" cho
yêu cầu cấp quyền — phải dùng trình duyệt hệ thống; client công khai native "MUST implement PKCE".
Google chặn yêu cầu qua embedded webview bằng lỗi `disallowed_useragent`, ghi "Custom URI schemes are
no longer supported due to the risk of app impersonation", loopback bị deprecated cho Android và iOS,
và khuyên dùng thư viện Google Sign-In hoặc AppAuth; refresh token luôn được trả về cho app cài đặt.
**Đã đọc.** Suy luận: Flutter dùng gói Google Sign-In/AppAuth chứ không tự dựng WebView.

**Refresh token cho client công khai (RFC 9700 §2.2.2).** "Refresh tokens for public clients MUST be
sender-constrained or use refresh token rotation." **Đã đọc** (yêu cầu); cơ chế phát hiện dùng lại
token cũ ở §4.14 **chưa đọc được** (trang bị cắt).

**Lưu token trên máy (flutter_secure_storage).** iOS dùng Keychain; Android dùng RSA OAEP + AES-GCM,
tối thiểu Android SDK 23; backup tự động lên Google Drive có thể gây `java.security.InvalidKeyException`
nếu không loại trừ. **Đã đọc.**

**OTP qua email (NIST SP 800-63B-4).** "Email SHALL NOT be used for out-of-band authentication"
(3.1.3.1) vì có thể bị chặn hoặc chuyển hướng; ngoại lệ: mã gửi để xác minh email hoặc làm mã khôi
phục "are not authentication processes and not affected by the above prohibition". **Đã đọc.** NIST là
chuẩn cho hệ thống liên bang Mỹ, app của bạn không bắt buộc theo, nhưng nó chỉ ra rủi ro thật: OTP qua
email để **đăng nhập** biến hộp thư thành chìa khóa tài khoản. Ba mục đích đã được cân nhắc; bạn chốt **chỉ hai** (xác minh email, quên mật khẩu — cuối ngày 02/10). Phân tích (suy luận):

| Mục đích OTP | Theo NIST | Ghi chú |
| --- | --- | --- |
| Xác minh email | Nằm trong ngoại lệ | Không có vấn đề |
| Quên mật khẩu | Nằm trong ngoại lệ (mã khôi phục) | Áp dụng các quy tắc OWASP ở trên |
| Đăng nhập (**đã bỏ khỏi V1**) | **Không** được coi là yếu tố xác thực | Bạn chọn không dùng. Ghi lại để cân nhắc nếu sau này muốn đăng nhập không mật khẩu; khi đó yếu tố mạnh hơn (ứng dụng TOTP) chưa research |

**SMTP và gửi thư.** Google yêu cầu mọi người gửi: SPF hoặc DKIM, DNS xuôi và ngược hợp lệ, TLS, tỉ lệ
thư rác dưới 0,3%; người gửi từ 5.000 thư/ngày đến Gmail phải thêm DMARC và (với thư marketing)
hủy đăng ký một chạm; "Don't impersonate Gmail From: headers". Giới hạn của Google Workspace:
2.000 thư/ngày mỗi người dùng (500 với tài khoản trial); giới hạn của Gmail cá nhân chưa đọc được.
**Đã đọc.** Mailpit là SMTP server giả kèm giao diện web và API, dùng để kiểm thử thư khi chạy local
(cổng mặc định chưa đọc). **Nhà cung cấp bạn chọn: Google** (có thể đổi nếu có vấn đề). Với Google
Workspace, Google nêu ba cách gửi: SMTP relay (`smtp-relay.gmail.com`, xác thực theo IP, tối đa 10.000
người nhận/ngày mỗi người dùng), Gmail SMTP (`smtp.gmail.com`, cổng 465 SSL hoặc 587 TLS, cần địa chỉ
đầy đủ và **mật khẩu ứng dụng**, **2.000 thư/ngày**) và Gmail SMTP hạn chế (chỉ gửi tới người dùng
Gmail/Workspace). Từ 01/05/2025, tài khoản Workspace **không còn hỗ trợ** app bên thứ ba đăng nhập
bằng tên và mật khẩu thường. **Đã đọc**, nhưng trang này nói về Workspace; điều kiện cho Gmail cá nhân
chưa đọc. Port `Mailer` ở trên là chỗ để đổi sang nhà cung cấp khác mà không đụng lõi. Suy luận: với 10–30 người dùng, khối lượng thấp hơn mọi ngưỡng trên; điều
quan trọng hơn là gửi từ **domain riêng có SPF/DKIM** để thư OTP không rơi vào spam.

**Pattern danh tính tách khỏi user** (suy luận, khớp `V1_DATA_MODEL_DRAFT.md`, mục 4): bảng `users`
giữ ID nội bộ, bảng `auth_identities` giữ cặp (provider, subject), nên email + mật khẩu, Google,
và sau này Apple là ba dòng identity của cùng một user. Chỉ liên kết hai identity khi email đã được
xác minh.

- **Chuẩn bị rẻ ở V1:** hai bảng trên; hash Argon2id; PKCE cả hai client; `sub` làm khóa; OTP lưu
  dạng hash, một lần, có hạn, có giới hạn thử; port `Mailer` để đổi nhà cung cấp SMTP không đụng lõi.
- **Chỉ áp dụng khi:** thêm Sign in with Apple (bắt buộc khi ra iOS có Google), MFA, hoặc chuyển
  sang dịch vụ định danh ngoài.
- **Cái giá:** tự làm xác thực nghĩa là tự chịu trách nhiệm cho reset, khóa tài khoản, giới hạn thử
  và rò rỉ. Mỗi phần đều thuộc nhóm phải làm Defense Analysis trước khi chốt spec.

Nguồn: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
[OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700),
[RFC 8252](https://www.rfc-editor.org/rfc/rfc8252),
[Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[Google OAuth cho app native](https://developers.google.com/identity/protocols/oauth2/native-app),
[flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage),
[NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html),
[Google, Email sender guidelines](https://support.google.com/a/answer/81126),
[Google Workspace, Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace),
[Mailpit](https://mailpit.axllent.org/).

## 6. Job nền cho việc soạn nội dung (BullMQ)

**Vấn đề của app.** AI soạn nháp nghĩa và ví dụ cho nhiều nghìn từ: chạy lâu, sẽ gặp lỗi và giới
hạn tốc độ, phải chạy tiếp được và không tạo bản trùng.

**Đã đọc (BullMQ):**

- **Job ID chống trùng:** thêm job với ID đã tồn tại thì job đó bị bỏ qua. **Cảnh báo:** job đã bị xóa
  (ví dụ `removeOnComplete`) **không còn được coi là trùng**, nên chống trùng bền vững không thể chỉ
  dựa vào queue.
- **Thử lại:** `attempts` lớn hơn 1; backoff `fixed` hoặc `exponential` (`2 ^ (attempts - 1) * delay`),
  có tùy chọn jitter; hết số lần thì job nằm ở tập failed hoặc bị xóa tự động tùy cấu hình.
- **Giới hạn tốc độ:** `limiter: { max, duration }` áp **toàn cục** cho queue dù có bao nhiêu worker;
  job bị giới hạn **ở trạng thái chờ**.
- **Job bị treo (stalled):** "moved back to the waiting status and will be processed again by another
  worker", hoặc vào tập failed nếu quá số lần cho phép. Trang này không nói tới việc làm job idempotent.

**Suy luận từ đó:** job có thể chạy **nhiều hơn một lần** (retry, stalled), nên bước ghi kết quả phải
idempotent và khóa chống trùng phải nằm trong **cơ sở dữ liệu**. Đây là pattern *idempotent consumer*
(chưa đọc nguồn riêng cho tên pattern, nhưng hệ quả suy ra trực tiếp từ hành vi đã đọc).

- **Chuẩn bị rẻ ở V1:** khóa job = (nguồn, ID mục nguồn, revision nội dung) lưu trong DB với ràng
  buộc duy nhất; processor ghi bản nháp bằng upsert; vòng đời `draft → reviewed → published` và chỉ
  `published` mới hiện cho người học; limiter đặt theo hạn mức của provider; dùng chung port
  `AiProvider` với luồng người dùng.
- **Chỉ áp dụng khi:** cần bảo đảm "ghi DB xong thì chắc chắn có job" (outbox, đã nêu ở
  `SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md`), hoặc nhiều loại job với độ ưu tiên khác nhau.
- **Cái giá:** thêm Redis và worker; theo dõi job lỗi và job treo.

Nguồn: [BullMQ, Job IDs](https://docs.bullmq.io/guide/jobs/job-ids),
[BullMQ, Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs),
[BullMQ, Rate limiting](https://docs.bullmq.io/guide/rate-limiting),
[BullMQ, Stalled jobs](https://docs.bullmq.io/guide/workers/stalled-jobs).

## 7. API và client: những quy ước khó đổi sau khi có client

**Vấn đề của app.** Web và Flutter dùng chung API; client mobile cũ vẫn chạy khi server đổi.

- **Định dạng lỗi:** RFC 9457 định nghĩa `application/problem+json` với các thành viên chuẩn `type`,
  `status`, `title`, `detail`, `instance`; client phải bỏ qua thành viên mở rộng chưa biết nên loại
  lỗi có thể mở rộng. **Đã đọc.** Có thể thêm mã lý do của rubric hoặc `operation_id` làm thành viên
  mở rộng (suy luận).
- **Phân trang:** AIP-158 nêu `page_size`, `page_token`, `next_page_token`; token "must be opaque
  (but URL-safe)" và không để client tự phân tích. **Đã đọc.** Quyết định sớm vì catalog 8.812 từ sẽ
  cần phân trang ngay từ danh sách đầu tiên.
- **Tương thích:** thêm field/enum có thể làm hỏng client cũ (Google AIP-180, đã trích ở
  `SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md`); client phải chịu được `type` và enum lạ.
- **Hợp đồng và client sinh tự động:** generator OpenAPI có generator `dart` ở trạng thái STABLE.
  **Đã đọc.** Generator TypeScript cho Next.js: `typescript-fetch`, trạng thái STABLE (mô tả trang ghi "beta").
  **Đã đọc.**
- **Chuẩn bị rẻ ở V1:** chọn Problem Details, phân trang bằng token, và header `Idempotency-Key`
  cho `POST` (xem mục 3) trước khi viết endpoint đầu tiên.
- **Chỉ áp dụng khi:** có đủ endpoint ổn định để generate client; versioning chính thức khi có
  breaking change thật.

Nguồn: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), [Google AIP-158](https://google.aip.dev/158),
[OpenAPI Generator, dart](https://openapi-generator.tech/docs/generators/dart/),
[OpenAPI Generator, typescript-fetch](https://openapi-generator.tech/docs/generators/typescript-fetch/).

## 8. Tiến độ học và lịch ôn — ngoài V1, chỉ ghi để cân nhắc

**Vấn đề của app.** V1 chỉ có ba trạng thái do người học tự chọn, chưa có lịch ôn. Nếu sau này muốn
ôn theo lịch, cần dữ liệu lịch sử ôn tập từ trước.

**Đã đọc:** FSRS (Free Spaced Repetition Scheduler) nhận **lịch sử ôn tập** (đánh giá và thời gian
trôi qua) và trả khoảng cách lần ôn tiếp theo cùng các biến trạng thái ghi nhớ: Stability,
Difficulty, Retrievability.

**Suy luận:** nếu V1 ghi mỗi lần ôn thành một dòng append-only (`review_events`: user, sense, thời
điểm, lựa chọn), một scheduler có thể được thêm sau mà không phải thu thập lại dữ liệu. Đây là
**tùy chọn ngoài phạm vi V1** theo quyết định hiện tại (không lịch ôn thích ứng); chưa được chọn.

Nguồn: [FSRS, The Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm).

## 9. Chưa đọc hoặc chưa xác minh

Đã tra thêm cuối ngày 02/10: phiên trên mobile, mục đích OTP, SMTP, generator TypeScript. Phần còn
thiếu:

- **Refresh token rotation:** RFC 9700 §4.14 (cách phát hiện dùng lại token cũ) chưa đọc được; mới có
  yêu cầu ở §2.2.2. Cách Flutter giữ phiên của **email + mật khẩu tự làm** (không qua Google) chưa tra.
- **Yếu tố xác thực mạnh hơn OTP email** (ứng dụng TOTP) chưa research.
- **SMTP:** điều kiện và giới hạn của **Gmail cá nhân** (trang đã đọc chỉ nói Workspace), cổng
  mặc định của Mailpit, và nhà cung cấp thay thế (nếu Google gặp vấn đề) chưa tra hoặc so sánh.
- **Stripe Entitlements** là ví dụ về mô hình, **chưa chọn** Stripe; Stripe không hỗ trợ Việt Nam
  (nguồn thứ cấp, xem `DATA_COST_LICENSE_RESEARCH_2026-10-02.md`).
- **Pattern chưa tra:** tìm kiếm, i18n chuỗi giao diện. Cache và observability đã có ở
  `SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md`.
- Tên pattern *idempotent consumer* ở mục 6 chưa có nguồn riêng; hệ quả được suy ra từ hành vi
  BullMQ đã đọc.

## 10. Liên hệ với spec sắp viết

Các quyết định dưới đây thuộc nhóm bắt buộc làm **Defense Analysis trước khi chốt spec**, và mỗi mục
trên nói rõ phần nào nên vào module spec nào:

| Module | Mục liên quan |
| --- | --- |
| Vocabulary Content | 1 (`entry_type`, từ chức năng), 6 (vòng đời draft→published) |
| Identity & Access | 5 |
| Entitlements & Usage | 4 |
| AI Integration | 3 |
| Practice | 2, 3 |
| Content Pipeline | 6 |
| System spec (xuyên module) | 3 (`operation_id`), 7 (lỗi, phân trang, tương thích client) |
