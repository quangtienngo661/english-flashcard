# OpenAI API cho Bước 6 — desk research (19/10/2026)

**Mục đích.** Chủ dự án đã chọn OpenAI API (GPT) làm provider cho Bước 6 (AI Integration: một gateway gọi ba operation
`generate_cloze`, `lookup_word`, `translate_sentence`; gọi trong request, deadline ~20 s/lần, tối đa 1 `retry`, JSON kiểm
theo shape, log chi phí từng lần gọi, giới hạn ~5 lời gọi đồng thời). Tài liệu này gom các dữ kiện có nguồn để chủ dự án tự
chọn model. **Tài liệu không chọn model, không xếp hạng model nào là "tốt nhất"**; trade-off được trình bày trung lập.

**Cách làm.** Chỉ đọc trang công khai trong phiên ngày 19/10/2026, không đăng ký, không điền form, không nhập credential.
Trang docs của OpenAI được đọc qua bản Markdown (thêm `.md` vào URL, cách chính trang docs hướng dẫn); trang trên openai.com,
help.openai.com, GitHub và npm registry được tải bằng `curl` rồi lọc chữ. Bị chặn hoặc không đọc được: bài help
"What payment methods are accepted" / "How does prepaid billing work" (`help.openai.com/.../8264644-...`, HTTP 403); trang
reference "Chat Completions — Create" (bản `.md` trả 404, nên chưa đọc được mô tả tham số `store` của Chat Completions);
bảng số của leaderboard SEA-HELM (trang dựng bằng JavaScript, không ra số); trang Artificial Analysis cho GPT-6 Luna
(medium) không có dữ liệu. Các model ID, giá, giới hạn trong file đều lấy từ trang đọc hôm nay, không lấy từ trí nhớ.

**Nhãn nguồn (bắt buộc).** **CT** = đã đọc hôm nay trên site của chính OpenAI (openai.com và subdomain, platform/developers.
openai.com, help.openai.com, github.com/openai, npm registry của gói `openai`). **TC** = thứ cấp: bài/benchmark bên thứ ba,
snippet tìm kiếm, hoặc nguồn không thuộc OpenAI (kể cả trang tỷ giá của ngân hàng); chưa đối chiếu chéo. **SL** = suy luận
hoặc phép tính của người viết. Mỗi khẳng định trỏ tới `[S#]`; danh sách URL ở cuối file. "repo" = file trong repo Wordmet
đọc hôm nay.

---

## 1. Tóm tắt

1. **Danh mục hôm nay** có ba model "flagship" GPT-6: `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6-luna`; các họ cũ (GPT-5.6, 5.5,
   5.4, 5, 4.1, 4o) vẫn được bán (CT [S1][S2]). Model rẻ nhất cho văn bản ngắn, giá Standard mỗi 1M token input/output:
   `gpt-5-nano` $0.05/$0.40, `gpt-6-luna` $0.10/$0.50, `gpt-4.1-nano` $0.10/$0.40, `gpt-4o-mini` $0.15/$0.60,
   `gpt-5.6-luna` $0.20/$1.20, `gpt-5.4-nano` $0.20/$1.25; tầng giữa để so sánh: `gpt-6.1-sol` $2/$10 (CT [S1]).
2. **Lịch shutdown đã công bố chạm vào nhiều model rẻ:** `gpt-4.1-nano` 23/10/2026 (4 ngày nữa); snapshot `gpt-5-nano` và
   `gpt-5-mini` 11/12/2026; `gpt-4o-mini`, `gpt-4.1-mini` 14/01/2027; `gpt-5.4-nano` 01/04/2027. Model thay thế OpenAI ghi
   cho phần lớn các model này là `gpt-6-luna` (hoặc `gpt-5.6-luna`/`gpt-5.6-terra`). `gpt-6-luna`, `gpt-6.1-sol`,
   `gpt-5.6-luna`, `gpt-5.4-mini` chưa có trong danh sách deprecation (CT [S17]).
3. **Mọi model GPT-5.x và GPT-6.x đều là reasoning model**; reasoning token không hiển thị nhưng **tính tiền như output
   token** và tính vào `max_output_tokens`. `gpt-6-luna` mặc định `reasoning.effort: medium`, cho phép hạ xuống `none`;
   `gpt-6.1-sol` và `gpt-6-astra` không cho `none` (thấp nhất `low`). `gpt-4.1-*` và `gpt-4o-mini` không có reasoning
   (CT [S3][S4][S18]).
4. **Responses API được OpenAI khuyến nghị cho dự án mới**; Chat Completions "remains supported" và không có trong trang
   deprecation (CT [S21][S17]).
5. **Structured Outputs** bật bằng `text.format: { type: "json_schema", strict: true, schema }`; schema phải là object gốc,
   mọi field `required`, `additionalProperties: false`, tối đa 5.000 property và 10 tầng lồng. Refusal trả về content
   `type: "refusal"`; bị cắt vì hết token trả `status: "incomplete"` với `reason: "max_output_tokens"`. `minLength`/
   `maxLength` không nằm trong danh sách keyword được hỗ trợ — trạng thái chưa rõ (CT [S23]).
6. **SDK Node `openai` bản 7.39.0** (phát hành 19/10/2026, cần Node ≥ 22): `timeout` mặc định 10 phút, `maxRetries` mặc
   định 2, tự `retry` lỗi kết nối, timeout, 408, 409, 429, ≥500. API không có idempotency key cho `/v1/responses`; mỗi
   response có header `x-request-id`, client có thể gửi `X-Client-Request-Id` (CT [S28][S29][S30][S27]).
7. **Dữ liệu:** API không dùng dữ liệu để train trừ khi opt-in; abuse monitoring log giữ tới 30 ngày; Responses API
   **mặc định `store: true`** (lưu ít nhất 30 ngày) — muốn không lưu phải gửi `store: false`. Zero Data Retention cần OpenAI
   duyệt trước (liên hệ sales). Hướng dẫn under-18: không xử lý dữ liệu cá nhân của trẻ dưới 13 tuổi hoặc dưới "tuổi đồng ý
   số" theo luật nơi áp dụng nếu chưa bật ZDR (CT [S40][S24][S41]).
8. **Việt Nam có trong danh sách quốc gia được hỗ trợ.** Thanh toán bằng thẻ credit/debit tiêu chuẩn (không nhận thẻ
   prepaid), thẻ phải do ngân hàng ở nước được hỗ trợ phát hành; cá nhân dùng được, trả trước tối thiểu $5, credit hết hạn
   sau 1 năm (CT [S47][S49][S50][S48]).
9. **Tier thấp nhất có trả tiền (Build, từ $5 credit đã mua):** 5.000 RPM và 2.000.000 TPM cho các model hạng Luna/nano/mini,
   5.000 RPM và 1.000.000 TPM cho Sol/Terra/Astra; giới hạn sử dụng $500/tháng ở Build (CT [S26][S3]).
10. **Kiểm soát chi tiêu:** hard spend limit theo tháng ở cấp organization hoặc project (vượt thì trả 429), spend alert chỉ
    báo; cả hai đều không chặn tức thì, chi tiêu có thể vượt nhẹ; số dư prepaid có thể âm (CT [S32][S48]).
11. **Chi phí mỗi đơn vị Wordmet (600 input + 500 output token, SL):** ~6đ (`gpt-5-nano`), ~8đ (`gpt-6-luna`), ~19đ
    (`gpt-5.6-luna`/`gpt-5.4-nano`), ~162đ (`gpt-6.1-sol`), ~809đ (`gpt-6-astra`) ở tỷ giá 26.100đ/USD; reasoning token làm
    các số này tăng thêm (bảng ở mục 15).
12. **Chất lượng tiếng Việt:** không tìm thấy điểm per-language tiếng Việt chính thức cho model ứng viên nào; bộ MMMLU của
    OpenAI không có tiếng Việt (TC [S68]). Moderation model có nêu tiếng Việt trong nhóm ngôn ngữ cải thiện (CT [S54]).

---

## 2. Danh mục model và giá hôm nay (mục 1)

Giá Standard, USD mỗi 1M token, "short context" (≤ 272K input token) (CT [S1]). Context/max input/max output, mức reasoning
effort, knowledge cutoff, snapshot và rate limit tier Build lấy từ trang từng model (CT [S3]–[S16]). Lịch shutdown lấy từ
trang Deprecations (CT [S17]).

### 2.1 Nhóm rẻ (nano/mini/Luna)

| Model ID (snapshot) | Input | Cached input | Cache write | Output | Context / max input / max output | Reasoning effort (mặc định) | Knowledge cutoff | Deprecation / shutdown |
|---|---|---|---|---|---|---|---|---|
| `gpt-6-luna` (chỉ có alias `gpt-6-luna`) | $0.10 | $0.01 | $0.125 | $0.50 | 1.050.000 / 922.000 / 128.000 | `none`, `low`, `medium` (mặc định), `high`, `xhigh`, `max` | 18/05/2026 | Chưa công bố |
| `gpt-5.6-luna` (alias `gpt-5.6-luna`) | $0.20 | $0.02 | $0.25 | $1.20 | 1.050.000 / 922.000 / 128.000 | `none` … `max`, mặc định `medium` | 16/02/2026 | Chưa công bố |
| `gpt-5.4-nano` (`gpt-5.4-nano-2026-03-17`) | $0.20 | $0.02 | — | $1.25 | 400.000 / 272.000 / 128.000 | `none` (mặc định), `low`, `medium`, `high`, `xhigh` | 31/08/2025 | Deprecated, shutdown 01/04/2027 → `gpt-6-luna` |
| `gpt-5.4-mini` (`gpt-5.4-mini-2026-03-17`) | $0.75 | $0.075 | — | $4.50 | 400.000 / 272.000 / 128.000 | `none` (mặc định) … `xhigh` | 31/08/2025 | Chưa công bố |
| `gpt-5-nano` (`gpt-5-nano-2025-08-07`) | $0.05 | $0.005 | — | $0.40 | 400.000 / 272.000 / 128.000 | Trang model không ghi; trang GPT-5 ghi `minimal`, `low`, `medium`, `high` (CT [S13]); áp cho nano là SL | 31/05/2024 | Snapshot shutdown 11/12/2026 → `gpt-5.6-luna` |
| `gpt-5-mini` (`gpt-5-mini-2025-08-07`) | $0.25 | $0.025 | — | $2.00 | 400.000 / 272.000 / 128.000 | Như dòng trên | 31/05/2024 | Snapshot shutdown 11/12/2026 → `gpt-5.6-terra` |
| `gpt-4.1-nano` (`gpt-4.1-nano-2025-04-14`) | $0.10 | $0.025 | — | $0.40 | 1.047.576 / — / 32.768 | Không có reasoning | 01/06/2024 | **Shutdown 23/10/2026** → `gpt-5.6-luna` |
| `gpt-4.1-mini` (`gpt-4.1-mini-2025-04-14`) | $0.40 | $0.10 | — | $1.60 | 1.047.576 / — / 32.768 | Không có reasoning | 01/06/2024 | Shutdown 14/01/2027 → `gpt-6-luna` |
| `gpt-4o-mini` (`gpt-4o-mini-2024-07-18`) | $0.15 | $0.075 | — | $0.60 | 128.000 / — / 16.384 | Không có reasoning | 01/10/2023 | Shutdown 14/01/2027 → `gpt-6-luna` |

### 2.2 Tầng giữa và flagship (để so sánh)

| Model ID (snapshot) | Input | Cached input | Cache write | Output | Context / max input / max output | Reasoning effort (mặc định) | Knowledge cutoff | Deprecation / shutdown |
|---|---|---|---|---|---|---|---|---|
| `gpt-6.1-sol` (`gpt-6.1-sol`) | $2.00 | $0.10 | $2.50 | $10.00 | 1.050.000 / 922.000 / 128.000 | `low`, `medium` (mặc định), `high`, `xhigh`, `max`; **không** có `none`/`minimal` | 30/04/2026 | Chưa công bố |
| `gpt-6-sol` (`gpt-6-sol`) | $2.00 | $0.20 | $2.50 | $10.00 | 1.050.000 / 922.000 / 128.000 | `none` … `max`, mặc định `medium` | 20/04/2026 | Chưa công bố |
| `gpt-5.6-terra` (`gpt-5.6-terra`) | $2.00 | $0.20 | $2.50 | $12.00 | 1.050.000 / 922.000 / 128.000 | `none` … `max`, mặc định `medium` | 16/02/2026 | Chưa công bố |
| `gpt-6-astra` (`gpt-6-astra`) | $10.00 | $1.00 | $12.50 | $50.00 | 1.050.000 / 922.000 / 128.000 | `low` … `max`; không có `none` | 30/04/2026 | Chưa công bố |

Ghi chú (CT trừ khi ghi khác):

- Trang Models giới thiệu: `gpt-6-astra` "for complex reasoning and coding", `gpt-6.1-sol` "to balance intelligence and
  cost", `gpt-6-luna` "for cost-sensitive, high-volume workloads" [S2]. Trang `gpt-5-nano` ghi "For most new speed- and
  cost-sensitive workloads, we recommend starting with GPT-5.6 Luna" [S11]; trang `gpt-5.6-luna` ghi model này "roughly
  corresponds to the nano model tier" [S7]. (Đây là lời của OpenAI, không phải khuyến nghị của tài liệu này.)
- Cột "Cache write" chỉ có ở họ GPT-5.6 và GPT-6: ghi cache tính 1,25× giá input; đọc cache 0,1× (0,05× với `gpt-6.1-sol`)
  [S1][S55]. Các họ cũ không tính phí ghi cache [S55].
- Prompt trên 272K input token tính 2× input và 1,5× output cho cả request (họ 6, 5.6, 5.5, 5.4) [S1][S3]. Với prompt
  ~600 token của Wordmet thì không chạm ngưỡng này (SL).
- Regional processing (data residency) cộng 10% cho model phát hành từ 05/03/2026 [S1].
- Reasoning: "While reasoning tokens are not visible via the API, they still occupy space in the model's context window and
  are billed as output tokens" [S18]. Khi `reasoning.effort` khác `none`, phải bỏ `temperature`, `top_p`, `top_logprobs`
  khỏi request [S19].
- Mọi model trong hai bảng đều ghi `structured_outputs` trong mục "Supported features" và hỗ trợ cả `v1/responses` lẫn
  `v1/chat/completions` [S3]–[S16]. Trang `gpt-5-mini` không liệt kê `prompt_caching` trong features dù bảng giá có cột
  cached input [S12][S1].
- `gpt-6.1-sol` và `gpt-6-astra` hỗ trợ Chat Completions nhưng không gọi tool qua Chat Completions; `gpt-6-luna`,
  `gpt-6-sol` chỉ gọi function trong Chat Completions khi `reasoning_effort: "none"` [S19][S3]. (Ba operation của Wordmet
  không dùng tool — SL.)
- OpenAI cam kết báo trước tối thiểu 6 tháng trước khi khai tử model GA, 3 tháng cho biến thể chuyên dụng, có thể chỉ
  ~2 tuần cho model "preview"; có thể theo dõi bằng trường `shutdown_date` của `GET /v1/models` [S17].
- Ngày phát hành GPT-6 Luna: Artificial Analysis ghi "released September 2026" (TC [S60]); không xác minh trên trang OpenAI.

---

## 3. Responses API so với Chat Completions (mục 2)

- **Khuyến nghị:** "While Chat Completions remains supported, Responses is recommended for all new projects." (CT [S21]).
  Trang reference của Chat Completions cũng ghi "Starting a new project? We recommend trying Responses" (CT [S22]).
- **Deprecation:** trang Deprecations không có mục nào cho Chat Completions (CT [S17]). Đối chứng: cùng trang có mục khai
  tử Assistants API (shutdown 26/08/2026, thay bằng Responses + Conversations API), nên trang có liệt kê endpoint bị khai tử.
- **Khác biệt liên quan tới Wordmet** (CT [S21] trừ khi ghi khác):

| Điểm | Responses (`POST /v1/responses`) | Chat Completions (`POST /v1/chat/completions`) |
|---|---|---|
| Structured Outputs | `text.format` | `response_format: { type: "json_schema", json_schema: {...} }` |
| Lưu dữ liệu mặc định | "Responses are stored by default" (`store` mặc định `true`) [S24] | "stored by default for new accounts" |
| Đầu ra | Mảng `output` gồm các Item; SDK có helper `output_text` | `choices[]`; có tham số `n` để sinh nhiều bản |
| Reasoning | "richer experience"; từ GPT-5.4, Chat Completions không gọi tool khi `reasoning_effort` khác `none` | Như cột trái |
| Prompt caching | OpenAI ghi cache tốt hơn 40–80% so với Chat Completions trong test nội bộ; có `prompt_cache_options` [S24] | — |
| Moderation inline | Tham số `moderation: { model }` trả điểm moderation cho input và output (CT [S51]) | Bảng của guide ghi workflow này áp cho cả Responses và Chat Completions (CT [S51]) |

- `safety_identifier` có ở cả Responses, Chat Completions và Images API (CT [S42]).

---

## 4. Structured Outputs (mục 3)

**Cách bật (CT [S23][S21]):**

- Responses: `text: { format: { type: "json_schema", name: "...", strict: true, schema: {...} } }`.
- Chat Completions: `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`.
- SDK Node có helper `zodTextFormat` (`openai/helpers/zod`) và `client.responses.parse(...)` trả `output_parsed` (CT [S23]);
  gói `openai` khai `zod` là optional peer dependency `^3.25 || ^4.0` (CT [S31]); `apps/api` đang dùng `zod` 4.6.5 (repo).

**Model hỗ trợ:** "available in our latest large language models, starting with GPT-4o"; dạng `json_schema` chỉ cho
`gpt-4o-mini`, `gpt-4o-mini-2024-07-18`, `gpt-4o-2024-08-06` trở về sau (CT [S23]). Mọi model ở mục 2 đều liệt kê
`structured_outputs` (CT [S3]–[S16]).

**Giới hạn schema (CT [S23]):**

| Quy tắc | Nội dung |
|---|---|
| Kiểu hỗ trợ | String, Number, Boolean, Integer, Object, Array, Enum, anyOf |
| Root | Phải là object, không được là `anyOf` (ví dụ `z.discriminatedUnion` ở gốc sẽ hỏng) |
| `required` | Mọi field phải `required`; mô phỏng field tùy chọn bằng union với `null` |
| `additionalProperties` | Bắt buộc `false` ở mọi object |
| Kích thước | Tối đa 5.000 object property, tối đa 10 tầng lồng |
| Tổng độ dài chuỗi | Tên property + tên definition + giá trị enum + const ≤ 120.000 ký tự |
| Enum | Tối đa 1.000 giá trị enum toàn schema; một enum chuỗi > 250 giá trị thì tổng độ dài ≤ 15.000 ký tự |
| Keyword cho string | `pattern`, `format` (`date-time`, `time`, `date`, `duration`, `email`, `hostname`, `ipv4`, `ipv6`, `uuid`) |
| Keyword cho number | `multipleOf`, `maximum`, `exclusiveMaximum`, `minimum`, `exclusiveMinimum` |
| Keyword cho array | `minItems`, `maxItems` |
| Không hỗ trợ | `allOf`, `not`, `dependentRequired`, `dependentSchemas`, `if`, `then`, `else` |
| `$defs`, đệ quy | Được hỗ trợ |
| Thứ tự key | Output theo đúng thứ tự key trong schema |
| Schema sai luật | Với `strict: true`, gửi schema không được hỗ trợ sẽ nhận lỗi |
| Độ trễ lần đầu | "the first request you make with any schema will have additional latency", các lần sau với cùng schema thì không |

- **`minLength` / `maxLength`:** không có trong danh sách keyword string được hỗ trợ; chỉ xuất hiện trong danh sách "For
  fine-tuned models, we additionally do not support … `minLength`, `maxLength`, `pattern`, `format`" (CT [S23]). Trang
  không nói rõ model thường có nhận hay không → **chưa rõ**. Giới hạn độ dài bằng `pattern` (ví dụ `^.{1,200}$`) là ý của
  người viết, chưa thử (SL).
- **Refusal:** khi model từ chối vì lý do an toàn, phần content có `type: "refusal"` và trường `refusal` thay cho
  `output_text` (CT [S23]).
- **Bị cắt:** `response.status === "incomplete"` và `response.incomplete_details.reason === "max_output_tokens"`; ví dụ C#
  trong guide còn có lý do `ContentFilter` (CT [S23][S18]). Với reasoning model, `max_output_tokens` gồm cả reasoning token;
  có thể hết token **trước khi có output hiển thị** mà vẫn bị tính tiền input + reasoning; OpenAI khuyên chừa ít nhất
  25.000 token cho reasoning + output khi mới thử (CT [S18][S24]).
- "Structured Outputs can still contain mistakes" — schema chỉ bảo đảm hình dạng, không bảo đảm nội dung đúng (CT [S23]).
  Ví dụ với Wordmet: schema không kiểm được "câu có đúng một chỗ trống" hay "đáp án nằm trong danh sách dạng chấp nhận" —
  việc đó vẫn phải kiểm trong code (SL).
- Nếu input không liên quan schema, model "will always try to adhere to the provided schema, which can result in
  hallucinations"; guide gợi ý ghi trong prompt cách trả kết quả rỗng (CT [S23]).

---

## 5. Lỗi và retry (mục 4)

### 5.1 Mã lỗi đã công bố (CT [S25][S26][S29][S57])

| HTTP | Trường hợp (`error.code` khi có) | Retry có giúp? (theo OpenAI) |
|---|---|---|
| 400 | Request sai (`BadRequestError`); `service_tier` không được phép cho project; `X-Client-Request-Id` sai định dạng | Không |
| 401 | Sai/thu hồi API key; không thuộc organization; IP không nằm trong allowlist | Không |
| 403 | "Country, region, or territory not supported"; SDK: `PermissionDeniedError` | Không |
| 404 | `NotFoundError` (resource không tồn tại) | Không |
| 409 | `ConflictError` ("The resource was updated by another request") | SDK Node tự retry (xem 5.3) |
| 422 | `UnprocessableEntityError` ("Please try the request again") | Guide Python bảo thử lại |
| 429 | Vượt rate limit requests/tokens | Có, theo `Retry-After` |
| 429 | `slow_down` (`rate_limit_error`): tăng lưu lượng quá nhanh, kể cả khi chưa chạm RPM/TPM | Có, giảm rồi tăng dần |
| 429 | `credit_balance_exhausted` (hết credit trả trước) | **Không** — phải nạp thêm |
| 429 | `organization_spend_limit_exceeded` / `project_spend_limit_exceeded` | **Không** — nâng/bỏ limit hoặc chờ tháng sau |
| 429 | `organization_usage_limit_exceeded` (limit OpenAI cấp theo tier) | **Không** — xin nâng limit |
| 429 | Flex: "Resource Unavailable" — "You will not be charged when this occurs" | Có (chỉ khi dùng Flex) |
| 500 | Lỗi server | Có, sau một khoảng chờ |
| 503 | `server_is_overloaded` (`service_unavailable_error`) | Có, theo `Retry-After` |
| — | Timeout / lỗi kết nối (Python `APITimeoutError`, `APIConnectionError`; Node `APIConnectionTimeoutError`) | Có |

- Với lỗi billing, "inspect `error.code`… The broader `error.type` can still be `insufficient_quota`"; "Retrying billing,
  spend, or quota errors won't restore API access" (CT [S25]). Trang lỗi hôm nay không còn liệt kê `insufficient_quota`
  như một `code` riêng.
- Trước đây một số endpoint trả 503 `slow_down`; nay tăng nhanh trả 429 `slow_down`, quá tải trả 503
  `server_is_overloaded`; OpenAI khuyên xử lý cả 429 lẫn 503 và đọc `error.code` (CT [S26]).
- Với streaming, lỗi sau khi stream đã bắt đầu có thể đến như một event; "don't automatically replay a request after
  consuming output" (CT [S26]).

### 5.2 Header (CT [S26][S27])

- `Retry-After` (giây, "when present") có thể có ở 429 do rate limit tạm thời và 503 do quá tải; không có nghĩa lỗi billing
  sẽ hết khi retry.
- `x-ratelimit-limit-requests`, `x-ratelimit-limit-tokens`, `x-ratelimit-remaining-requests`,
  `x-ratelimit-remaining-tokens`, `x-ratelimit-reset-requests`, `x-ratelimit-reset-tokens`, và bản project
  `x-ratelimit-limit-project-tokens`, `x-ratelimit-remaining-project-tokens`, `x-ratelimit-reset-project-tokens`.
- `retry-after-ms`: **không** có trong bảng header của docs; SDK Node đọc `retry-after-ms` trước rồi mới tới `retry-after`,
  với chú thích "may not be standard" (CT [S30]). SDK còn đọc header `x-should-retry` (`true`/`false`) nếu server gửi
  (CT [S30]).
- Header khác: `openai-organization`, `openai-processing-ms`, `openai-version` (`2020-10-01`), `x-request-id` (CT [S27]).

### 5.3 Hướng dẫn retry của OpenAI (CT [S26])

- Có `Retry-After` hợp lệ → chờ **ít nhất** chừng đó cộng một khoảng ngẫu nhiên nhỏ. Không có → exponential backoff with
  jitter; giới hạn cả số lần thử lẫn tổng thời gian retry.
- "If you manage retries in your application, disable SDK retries or account for them in those limits so nested retry loops
  don't multiply requests." Không retry lỗi quota/billing. Request thất bại vẫn tính vào limit mỗi phút.
- "A timeout for each attempt isn't necessarily a deadline for the entire operation."
- Nếu delay server yêu cầu lớn hơn mức tối đa đã cấu hình thì dừng retry và hoãn request, không retry sớm hơn.

### 5.4 SDK Node `openai` (CT [S28][S29][S30][S31])

| Điểm | Giá trị hôm nay |
|---|---|
| Phiên bản `latest` trên npm | **7.39.0**, publish 2026-10-19T00:05:57Z (các bản 7.35–7.38 ra trong 16–17/10/2026) |
| Runtime | Node.js 22 và 24 LTS, tối thiểu 22; TypeScript ≥ 4.9 |
| `timeout` mặc định | 10 phút (`DEFAULT_TIMEOUT = 600000` ms); hết giờ ném `APIConnectionTimeoutError` |
| `maxRetries` mặc định | 2 (giá trị không hợp lệ cũng quay về 2) |
| Lỗi được tự retry | Lỗi kết nối, timeout ("requests which time out will be retried twice by default"), 408, 409, 429, ≥ 500; header `x-should-retry` ghi đè nếu có |
| Backoff | 0,5 s × 2^n, trần 8 s, jitter trừ tới 25% |
| `Retry-After` | Dùng `retry-after-ms`/`retry-after` nếu trong 0–60 s; ngoài khoảng đó SDK dùng backoff của chính nó |
| Tắt / chỉnh | `new OpenAI({ maxRetries: 0, timeout: 20_000 })` hoặc truyền `{ maxRetries, timeout }` theo từng request |
| Ánh xạ status → lớp lỗi | 400 `BadRequestError`, 401 `AuthenticationError`, 403 `PermissionDeniedError`, 404 `NotFoundError`, 409 `ConflictError`, 422 `UnprocessableEntityError`, 429 `RateLimitError`, ≥500 `InternalServerError`, không có status `APIConnectionError` |

Máy dev đang chạy Node v24.11.0 (repo/máy, kiểm hôm nay), nằm trong khoảng runtime được hỗ trợ (SL).

**Suy luận cho Wordmet (SL, chưa thử):**

- Theo code `shouldRetry`, SDK retry **mọi** 429, kể cả `credit_balance_exhausted` hay spend limit, trừ khi server gửi
  `x-should-retry: false`. Không xác minh được OpenAI có gửi header đó cho 429 billing hay không.
- Để giữ "≤ 1 retry, ~20 s mỗi lần", cần đặt `timeout` và `maxRetries` tường minh: để mặc định thì một lời gọi có thể kéo
  tới 3 lần × `timeout` + backoff; ví dụ `timeout: 20 s`, `maxRetries: 2` → tệ nhất ~60 s cộng backoff.
- Retry sau timeout có thể tạo **hai** lần sinh bị tính tiền (xem mục 6): mỗi lần thử là một khoản chi phí riêng. Lần bị
  client bỏ vì quá deadline có bị tính tiền hay không thì docs không nói (chưa xác minh).

---

## 6. Idempotency (mục 5)

- **`/v1/responses` và `/v1/chat/completions`: không tìm thấy** cơ chế idempotency key trong guide, reference tham số
  Responses và bản export toàn bộ docs (CT [S24][S35]). Đối chứng: cùng bộ docs có mô tả `Idempotency-Key` cho **Agents API**
  — gửi tin nhắn vào session và tạo environment (giữ key 24 giờ, trả 409 khi đang chạy hoặc tham số khác) (CT [S78]) — nên
  việc không thấy ở Responses là "không có trong docs", không phải "chưa tìm".
- **SDK Node:** có sẵn cơ chế `idempotencyHeader` (tự sinh key dạng `stainless-node-retry-<uuid>`) nhưng client `OpenAI`
  không gán giá trị cho `idempotencyHeader`, nên mặc định **không gửi** idempotency header; SDK gửi `X-Stainless-Retry-Count`
  ở mỗi lần thử (CT [S30], đọc mã nguồn; diễn giải là SL).
- **Request ID:** mỗi response có header `x-request-id`; SDK gắn vào `_request_id` của object trả về, hoặc lấy qua
  `.withResponse()` (CT [S27][S29]). OpenAI "recommends logging request IDs in production".
- **`X-Client-Request-Id`:** client tự đặt (ASCII, ≤ 512 ký tự, duy nhất mỗi request, sai thì 400); OpenAI log giá trị này
  cho responses, chat/completions…; dùng để hỏi support khi timeout không nhận được `x-request-id`; SDK không tự thêm
  (CT [S27]).

---

## 7. Rate limit và usage tier (mục 6)

**Tier (CT [S26]):**

| Tier | Điều kiện | Usage limit (OpenAI cấp) |
|---|---|---|
| Free | Người dùng ở "allowed geography" | $100 / tháng |
| Build | $5 tổng credit đã mua | $500 / tháng |
| Launch | $100 tổng credit đã mua | $5.000 / tháng |
| Grow | $500 tổng credit đã mua | $200.000 / tháng |

Tier tự nâng khi tổng credit đã mua chạm ngưỡng (CT [S26]). Tên "Tier 1" cũ không còn trên trang; Build là tier trả tiền
thấp nhất (SL).

**RPM/TPM ở Build (CT [S26][S3]–[S16]):**

| Model | RPM | TPM |
|---|---|---|
| `gpt-6-luna`, `gpt-5.6-luna`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5-nano`, `gpt-5-mini`, `gpt-4o-mini` | 5.000 | 2.000.000 |
| `gpt-4.1-nano`, `gpt-4.1-mini` (≤ 128K input) | 5.000 | 2.000.000 |
| `gpt-6.1-sol`, `gpt-6-sol`, `gpt-5.6-terra`, `gpt-6-astra` | 5.000 | 1.000.000 |

- Launch: 10.000 RPM, 10.000.000 TPM (Luna) / 4.000.000 TPM (Astra, Sol, Terra); Grow: 30.000 RPM / 180.000.000 TPM (Luna),
  15.000 RPM / 40.000.000 TPM (Astra, Sol, Terra) (CT [S26]).
- Limit đặt ở cấp organization và project, không theo người dùng; một số model dùng chung "shared limit"; xem ở
  Settings → Organization → Limits; header `x-ratelimit-*` cho số còn lại (CT [S26]). Admin API có resource "Projects Rate
  Limits" để chỉnh limit theo project (CT [S35]).
- `slow_down`: khi lưu lượng ≥ 1M input TPM, OpenAI khuyên tăng không quá 50% mỗi 15 phút (CT [S26]).
- SL: với tối đa ~5 lời gọi đồng thời và ~1.100–3.100 token mỗi lời gọi, Wordmet dùng chưa tới 1% TPM của Build. Thứ có thể
  chạm sớm hơn là **usage limit $500/tháng của Build** nếu dùng model đắt ở mức trần 1.000 đơn vị/ngày (xem mục 15).

---

## 8. Kiểm soát chi tiêu (mục 7)

- **Spend alert vs hard limit (CT [S32]):** spend alert chỉ gửi thông báo, traffic vẫn chạy; hard spend limit theo tháng ở
  cấp organization hoặc project làm request trả 429 `organization_spend_limit_exceeded` / `project_spend_limit_exceeded`.
  "Enforcement is not instantaneous, so recorded spend can slightly exceed the configured amount." Limit reset theo chu kỳ
  tháng hoặc khi nâng/bỏ limit.
- **Prepaid (CT [S48]):** hết credit trả `credit_balance_exhausted`; "API access may not stop immediately after your credits
  run out"; phần dùng thêm thành số dư âm, trừ vào lần nạp sau; "Do not rely on the prepaid balance as an instantaneous
  spending cutoff". Auto-reload **bật sẵn** khi thiết lập, có thể tắt, có hạn mức nạp tự động theo tháng tùy chọn.
- **Admin API (CT [S33]):** cần Admin API key riêng (key này không gọi được endpoint thường); có endpoint đặt
  organization spend limit (`POST /v1/organization/spend_limit`, số tiền tính bằng cent) và tạo project spend alert. SDK
  Node hỗ trợ Admin API từ 6.36.0.
- **Đọc chi phí thực tế bằng API:** cookbook của OpenAI dùng `GET /v1/organization/usage/completions` (bucket `1m`/`1h`/`1d`,
  `group_by` model, lọc `project_ids`) và `GET /v1/organization/costs` (`bucket_width` hiện chỉ `1d`), đều với Admin key
  (CT [S34]). Danh mục reference API hôm nay (`api/reference/llms.txt`) **không** liệt kê resource Usage hay Costs
  (CT [S35]); trạng thái hai endpoint này và độ trễ dữ liệu chi phí **chưa rõ**.
- **Chi phí từng lời gọi:** response có `usage.input_tokens`, `usage.input_tokens_details.cached_tokens`,
  `usage.input_tokens_details.cache_write_tokens`, `usage.output_tokens`, `usage.output_tokens_details.reasoning_tokens`,
  và `service_tier` thực tế đã dùng (CT [S24]). Nhân với bảng giá ra chi phí mỗi lần gọi (SL).
- **Project API key, service account, phân quyền (CT [S36][S37][S38][S39][S27]):** OpenAI "strongly recommend setting an
  expiration date when you create a project API key and establishing a regular key rotation process"; admin có thể ép thời
  hạn tối đa của key ở cấp org/project; mục "API Key Governance" cho phép chỉ cho tạo key của service account, chỉ key của
  user trong project, hoặc tắt tạo key mới. Service account là "a nonhuman identity owned by a project", key được scope theo
  role tối thiểu. RBAC: key trong project phải có quyền tương ứng (ví dụ `api.model.read`). Project có allowlist/denylist
  model, chính sách hosted tool, và danh sách `service_tier` được phép (sai thì 400). Thu hồi key có hiệu lực "within a few
  seconds"; đa số thay đổi xác thực lan truyền trong 15 phút. Có IP allowlist cấp org/project.

---

## 9. Dữ liệu (mục 8 — quy tắc F30 của dự án)

- **Train:** "As of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models (unless you
  explicitly opt in to share data with us)" (CT [S40]). Services Agreement §4.2: OpenAI "will not use Customer Content to
  develop or improve the Services, unless Customer explicitly agrees" (CT [S43]).
- **Abuse monitoring log:** tạo cho mọi lần dùng API, có thể chứa prompt, response và output của classifier; giữ **tới 30
  ngày**, trừ khi luật bắt giữ lâu hơn hoặc cần để bảo vệ dịch vụ/bên thứ ba (CT [S40]). Bảng theo endpoint: `/v1/responses`
  và `/v1/chat/completions` — "Data used for training: No", abuse monitoring 30 ngày; `/v1/moderations` — không có abuse
  monitoring retention (CT [S40]).
- **`store` ở Responses:** "Defaults to true when omitted. If set to true, response data will be stored for at least 30
  days" (CT [S24]); data controls ghi Responses có "30 day Application State retention period by default, or when the
  `store` parameter is set to `true`" (CT [S40]). Trang không nêu thời hạn tối đa. Có endpoint `DELETE` cho response
  (CT [S35]).
- **`store` ở Chat Completions:** "Chat completions are stored by default for new accounts. To disable storage … set
  `store: false`" (CT [S21]); bảng data controls lại ghi application state của Chat Completions là "None, see below for
  exceptions" (CT [S40]). Hai câu này chưa khớp nhau rõ ràng và chưa đọc được trang reference tham số → **chưa rõ** thời
  gian lưu.
- **Vẫn có lưu tạm dù `store: false`** (CT [S40]): prompt caching có thể giữ key/value tensor đã mã hóa trên GPU tới 24 giờ;
  org không bật ZDR thì "all queries use extended prompt caching for all supported models"; background mode lưu ~10 phút;
  audio output 1 giờ.
- **Zero Data Retention / Modified Abuse Monitoring (CT [S40]):** "subject to prior approval by OpenAI and acceptance of
  additional requirements"; liên hệ sales để hỏi điều kiện. ZDR loại nội dung khỏi abuse monitoring log và ép `store`
  luôn `false`. Khách bật ZDR/MAM "are responsible for ensuring their users abide by OpenAI's policies… and complying with
  any moderation and reporting requirements". Tiêu chí cho cá nhân/doanh nghiệp nhỏ: **không tìm thấy**.
- **Data residency (CT [S40][S1]):** cấu hình theo project khi tạo, phải liên hệ sales để xét; vùng: US, EU (EEA +
  Thụy Sĩ), Australia, Canada, Japan, India, Singapore, South Korea, UK, UAE; chỉ US, EU, UAE có regional processing (các
  vùng còn lại chỉ lưu trữ tại chỗ); vùng ngoài US cần được duyệt abuse monitoring controls và ký "Modified Retention
  amendment"; không có vùng Việt Nam; cộng 10% giá. "System data" (gồm cả structured output schema) không thuộc phạm vi
  data residency. `gpt-6-luna` có EU data residency với Standard, Fast, Flex, Batch.
- **DPA (CT [S44][S43]):** DPA "supplements, and is incorporated into, the OpenAI Services Agreement", ký với OpenAI OpCo,
  LLC (khách ngoài EEA/Thụy Sĩ), được chấp nhận khi "clicking 'I agree', accepting the Order Form, or using the Services";
  Services Agreement §5.3: nếu xử lý Personal Data thì hai bên tuân theo DPA. Services Agreement ghi phạm vi "for customers
  who are businesses and developers, and does not apply to OpenAI services used by consumers or individuals unless
  specified" — một developer cá nhân có thuộc nhóm "developers" hay không là câu hỏi pháp lý, chưa xác minh (SL).
- **Thông báo cho người dùng cuối:** không tìm thấy yêu cầu chung trong các trang đã đọc. Có ba chỗ gần: hướng dẫn under-18
  nêu "age-appropriate disclosures to minors about AI tools" như một bước hợp lý (CT [S41]); Sharing & Publication Policy
  (cập nhật 14/11/2022) yêu cầu nêu rõ vai trò của AI khi công bố nội dung đồng tác giả hoặc chia sẻ lên mạng xã hội
  (CT [S46]); Services Agreement §3.3(c) cấm cho trẻ vị thành niên dùng mà không có đồng ý của cha mẹ/người giám hộ
  (CT [S43]). Nội dung câu do AI sinh trong app Wordmet có thuộc diện "publish" hay không là SL, chưa rõ.
- **`safety_identifier`:** khuyến nghị nhưng không bắt buộc; ID ổn định cho mỗi người dùng cuối, ≤ 128 ký tự, OpenAI khuyên
  hash email/ID nội bộ (CT [S42][S24]). Nếu lặp lại nhiều request rủi ro cao, OpenAI có thể trả lỗi, giới hạn hoặc chặn
  cả org; safety identifier giúp chặn từng người dùng thay vì cả org (CT [S42]).

---

## 10. Việt Nam: tính sẵn có và thanh toán (mục 9)

- **Danh sách quốc gia được hỗ trợ có "Vietnam"** (CT [S47]). "Accessing or offering access to our services outside of the
  countries and territories listed below may result in your account being blocked or suspended" (CT [S47]); truy cập từ nơi
  không hỗ trợ trả 403 (CT [S25]).
- **Phương thức thanh toán:** "Prepaid cards cannot be used to purchase API credits—only standard credit or debit cards are
  supported"; "Your payment card must be issued by a bank located in one of those supported regions"; ngân hàng có thể chặn
  giao dịch quốc tế, cần hoàn tất 3D Secure (CT [S49]). Bài help liệt kê đầy đủ phương thức thanh toán bị chặn (403), nên
  chưa biết có phương thức khác ngoài thẻ (chuyển khoản, ví) hay không.
- **Cá nhân có dùng được không:** bài "API billing and invoice timing" ghi "If you use the API as an individual or team
  customer: Payment is handled through prepaid credits or automatic credit-card charges"; hóa đơn tháng chỉ cho Enterprise
  (CT [S50]).
- **Trả trước (CT [S48]):** tài khoản mới dùng prepaid; nạp tối thiểu $5, mặc định $10; credit hết hạn sau 1 năm, không
  gia hạn; không hoàn tiền trừ vài ngoại lệ (lỗi tính tiền, dùng trái phép, lỗi dịch vụ được xác nhận); số dư tối đa phụ
  thuộc "trust tier".
- **Thuế (VAT) cho mua từ Việt Nam, phí chuyển đổi ngoại tệ của ngân hàng: không tìm thấy** trên các trang đã đọc.

---

## 11. Usage policy cho app giáo dục (mục 10)

- **Usage Policies (hiệu lực 29/10/2025, CT [S45]):** mục "Keep minors safe" cấm dùng để khai thác/gây nguy hiểm/tình dục
  hóa người dưới 18 tuổi, cấm "exposing minors to age-inappropriate content", "dangerous challenges for minors"… Mục
  "Empower people" cấm "academic dishonesty" và "automation of high-stakes decisions in sensitive areas without human review"
  với lĩnh vực được liệt kê gồm "education". Chấm điểm luyện tập theo rule của Wordmet có bị coi là "high-stakes" hay không
  là đánh giá của chủ dự án (SL).
- **Under-18 guidance (CT [S41]):** áp cho ứng dụng phục vụ người dưới 18 tuổi, cộng thêm vào Usage Policies và Services
  Agreement:
  - Tuân thủ luật bảo vệ trẻ em/quyền riêng tư (nêu COPPA). "You should not use OpenAI services to process any personal data
    of children under 13 or the applicable age of digital consent without first implementing zero data retention in our
    API."
  - Các bước hợp lý: công bố về AI phù hợp lứa tuổi; bộ lọc nội dung phù hợp lứa tuổi; giám sát, báo cáo, đường escalation
    cho tương tác rủi ro cao; age assurance khi luật yêu cầu hoặc phù hợp.
  - Best practice OpenAI nêu, gồm "Use OpenAI’s most current flagship models, which incorporate the latest safety
    protections, particularly when building experiences for minors" (lời OpenAI, không phải khuyến nghị của tài liệu này).
  - OpenAI có quyền audit; vi phạm có thể bị cảnh báo, đình chỉ hoặc chấm dứt quyền truy cập API.
- **Services Agreement §3.3(c):** khách không được "allow minors to use OpenAI Services without consent from their parent or
  guardian" (CT [S43]).
- **System card GPT-6 Sol/Luna (cập nhật tháng 10/2026)** có mục "Safe Completions for Users Under 18" (CT [S71]); chưa trích
  số liệu của mục này.
- **Moderation:** "The moderation endpoint is free to use"; `omni-moderation-latest` (snapshot `omni-moderation-2024-09-26`)
  nhận text và ảnh, không nhận audio (CT [S51][S52][S1]); model card (02/06/2026) ghi "available for free, with a rate limit"
  và "improved accuracy across forty languages" (CT [S53]). Bài ra mắt ghi hiệu năng trên tiếng "Spanish, German, Italian,
  Polish, Vietnamese, Portuguese, French, Chinese, Indonesian" vượt cả hiệu năng tiếng Anh của model cũ (CT [S54]).
  Responses có tham số `moderation` để trả điểm moderation cùng response (CT [S51]); việc moderation inline có miễn phí hay
  không, guide không nói rõ → chưa rõ.
- **"Tuổi đồng ý số" (age of digital consent) theo luật Việt Nam: không kiểm** trong phiên này; con số này quyết định ngưỡng
  tuổi mà câu ZDR ở trên áp dụng.

---

## 12. Prompt caching, Batch, Flex, Fast (mục 11)

**Prompt caching (CT [S55][S1]):**

- Bật mặc định cho model hỗ trợ, không cần cấu hình; giảm giá input tới 95%.
- GPT-5.6 trở về sau: prefix tối thiểu **1.024 visible input token** mới được cache; đọc cache 0,1× giá input (0,05× với
  `gpt-6.1-sol`); **ghi cache 1,25×**; sống ít nhất 30 phút sau lần ghi/đọc gần nhất (`prompt_cache_options.ttl: "30m"`).
- Model trước GPT-5.6: không tính phí ghi; ngưỡng tối thiểu "varies by request settings" (tools, ảnh, output schema,
  reasoning effort, verbosity); `in_memory` thường 5–10 phút không dùng, hoặc tới 24 giờ với `24h`.
- SL: prompt ~600 token của Wordmet nhỏ hơn ngưỡng 1.024 của GPT-5.6+, nên nhiều khả năng không được cache (và không phát sinh
  phí ghi). Ở `gpt-6-luna`, phần input chỉ chiếm $0.00006 trên $0.00031 mỗi đơn vị, nên caching có hay không cũng ít ảnh
  hưởng tổng chi phí.

**Batch (CT [S56]):** giảm 50%, pool rate limit riêng cao hơn, mỗi batch xong trong 24 giờ (`completion_window` hiện chỉ
nhận `24h`), hỗ trợ `/v1/responses`. SL: không dùng được cho lời gọi trong request; có thể liên quan tới soạn nội dung chạy
nền (BullMQ) ở bước sau.

**Flex (CT [S57][S1]):** `service_tier: "flex"`, giá bằng Batch (50% Standard); beta, chậm hơn, đôi khi trả 429 "Resource
Unavailable" (không tính tiền); guide tăng timeout lên 15 phút trong ví dụ. Có cho `gpt-6-luna`, `gpt-5.6-luna`,
`gpt-5.4-nano/mini`, `gpt-5-nano/mini`, `gpt-6.1-sol`…; không có cho `gpt-4.1-*`, `gpt-4o-mini`. SL: khó khớp deadline 20 s.

**Fast (trước là Priority, đổi tên 30/07/2026) (CT [S58][S1]):** "up to 2.5× faster speeds and more consistent latency";
giá 2× Standard (ví dụ `gpt-6-luna` $0.20/$1.00); dùng chung rate limit với Standard; tăng traffic quá nhanh thì một phần
request bị hạ về tốc độ và giá Standard (response ghi `service_tier: "default"`); không có latency SLA cho GPT-6 Astra.
Có cho `gpt-6-luna`, `gpt-5.6-luna`, `gpt-5.4-mini`, `gpt-5-mini`, `gpt-4.1-nano/mini`, `gpt-4o-mini`; không có cho
`gpt-5.4-nano`, `gpt-5-nano` (theo bảng giá Fast).

**Ultrafast (CT [S79][S1][S24]):** 6× Standard, chỉ `gpt-6-astra` và `gpt-6.1-sol`, chạy qua WebSocket, "available to all
API users". Mô tả tham số `service_tier` trong reference lại ghi "currently available for `gpt-5.6-sol`" — hai trang chưa
khớp.

**`service_tier` mặc định:** `auto` → dùng tier cấu hình trong project, mặc định `default` (CT [S24]).

---

## 13. Latency (mục 12)

**Chính thức (CT):** không tìm thấy số time-to-first-token hay tổng latency theo từng model trên trang OpenAI. Có các quy tắc
chung: "cutting 50% of your output tokens may cut ~50% of your latency"; "cutting 50% of your prompt may only result in a
1–5% latency improvement" [S59]; reasoning effort cao hơn thì chậm hơn [S18]; Fast mode nhanh tới 2,5× [S58]; GPT-5.4 mini
"running more than 2x faster" so với GPT-5 mini [S75]; request đầu tiên với schema mới chậm hơn [S23].

**Bên thứ ba (TC, Artificial Analysis, provider OpenAI, đọc hôm nay):** workload 10.000 input token, đo thời gian ra 500
output token; mỗi trang có hai bộ số lệch nhau (số "headline" và median trong bảng), trang không giải thích; số thay đổi theo
thời gian.

| Model (setting) | TTFT / time to first answer token | Output speed | Tổng cho 500 output token | Nguồn |
|---|---|---|---|---|
| GPT-6 Luna (non-reasoning) | 0,81 s (headline) / 0,94 s (median) | 121,2 / 113 t/s | 5,36 s | [S60] |
| GPT-6 Luna (low) | 1,77 s / 2,14 s | 125,5 / 120 t/s | 6,29 s | [S61] |
| GPT-6 Luna (medium, mặc định) | Trang ghi "Benchmarks of providers are not available"; snippet tìm kiếm sáng nay ghi 5,28 s (chưa đối chiếu) | — | — | [S66] |
| GPT-5.6 Luna (non-reasoning) | 0,79 s / 0,80 s | 127,1 / 124 t/s | 4,84 s | [S64] |
| GPT-5.4 nano (non-reasoning) | 0,63 s / 0,65 s | 175,1 / 160 t/s | 3,78 s | [S62] |
| GPT-5.4 mini (non-reasoning) | 0,70 s | 249,7 / 197 t/s | 3,24 s | [S63] |
| GPT-6.1 Sol (low) | 3,02 s / 2,75 s | 49,2 / 48 t/s | 13,23 s | [S65] |

- `gpt-4.1-*`, `gpt-4o-mini`, `gpt-5-nano/mini`: không tra trong phiên này.
- SL: workload của benchmark (10.000 input) lớn hơn nhiều so với ~600 input của Wordmet, nên TTFT thực tế có thể khác; với
  500 output token, các số trên nằm trong 3–14 s, dưới deadline 20 s, nhưng reasoning effort cao hơn mặc định có thể vượt.
  Chưa đo với prompt thật của Wordmet.

---

## 14. Chất lượng tiếng Việt (mục 13)

- **MMMLU không có tiếng Việt:** bộ MMMLU do OpenAI công bố gồm 14 locale (AR, BN, DE, ES, FR, HI, ID, IT, JA, KO, PT-BR,
  SW, YO, ZH-CN), không có tiếng Việt (TC [S68], trang Hugging Face của tổ chức OpenAI — không thuộc domain CT). Vì vậy
  không có điểm MMMLU tiếng Việt cho model nào.
- **Điểm đa ngôn ngữ tổng hợp chính thức chỉ thấy cho họ 4.1/4o:** trang ra mắt GPT-4.1 ghi "Multilingual MMLU": GPT-4.1
  87,3%, GPT-4.1 mini 78,5%, GPT-4.1 nano 66,9%, GPT-4o (2024-11-20) 81,4%, GPT-4o mini 70,5% (CT [S67]) — điểm gộp 14
  ngôn ngữ, không tách tiếng Việt.
- **Họ GPT-5.4/5.6/6:** không tìm thấy chữ "MMMLU" hay "multilingual" trong phần chữ của trang ra mắt GPT-6 Sol/Luna, GPT-6
  Astra, GPT-5.4 mini/nano và các system card GPT-6 Astra, GPT-6.1 Sol, GPT-6 Sol/Luna (10/2026), GPT-5.6 (CT [S70][S75]
  [S71]; biểu đồ dạng ảnh không được xem). Trang Models chỉ ghi chung "All latest OpenAI models support … multilingual
  capabilities" (CT [S2]). Repo `simple-evals` ngừng cập nhật kết quả cho model mới từ 07/2025 (CT [S69]).
- **VMLU** (bộ trắc nghiệm kiến thức bằng tiếng Việt): `gpt-4o-mini` trung bình 62,87 (đánh giá 01/08/2024), GPT-4 65,53;
  không có GPT-4.1, GPT-5.x, GPT-6 (TC [S72]). Đây là kiến thức trắc nghiệm, không đo viết câu cloze, dịch hay giải nghĩa.
- **SEA-HELM** (leaderboard có tiếng Việt, cập nhật 18/09/2026): không đọc được số qua công cụ (TC [S73]).
- SL: không nguồn nào ở trên đo đúng ba việc của Wordmet (viết câu tiếng Anh theo CEFR có một chỗ trống, giải nghĩa ngắn
  tiếng Việt, dịch Anh → Việt).

---

## 15. Chi phí mỗi đơn vị Wordmet (mục 14, SL)

**Giả định:** 1 đơn vị = ~600 input + ~500 output token (giả định có sẵn của dự án); giá Standard ở mục 2 (CT [S1]); không
tính caching, data residency, thuế, phí chuyển đổi ngoại tệ. **Tỷ giá 26.100đ/USD** = giá bán USD của Vietcombank lúc
11:06 ngày 19/10/2026 (mua 25.690, chuyển khoản 25.720) (TC [S74], nguồn chính thức của ngân hàng, không thuộc OpenAI).
File `AI_QUOTA_BENCHMARK_RESEARCH_2026-10-19.md` dùng ~28.400đ/USD; muốn đổi sang tỷ giá đó thì nhân số VND dưới đây với
~1,088.

Cách tính: chi phí = 600 × giá input/1M + 500 × giá output/1M. "Sinh lại": 300 câu luyện × 2 lần + 100 lượt tra = 700 lời
gọi cho 400 đơn vị; 1.000 đơn vị/ngày giữ tỷ lệ 3:1 → 750 × 2 + 250 = 1.750 lời gọi (nếu cả 1.000 đều là câu luyện thì
2.000 lời gọi, ×2 thay vì ×1,75).

### 15.1 Không tính reasoning token (500 output)

| Model | USD/đơn vị | VND/đơn vị | 400 đơn vị (1 Pro/tháng) | 1.000 đơn vị (trần/ngày) | 400 đơn vị, sinh lại | 1.000 đơn vị, sinh lại | 1.000/ngày × 30 ngày |
|---|---|---|---|---|---|---|---|
| `gpt-5-nano` | $0.000230 | 6,0đ | $0.092 · 2.401đ | $0.230 · 6.003đ | $0.161 · 4.202đ | $0.403 · 10.505đ | $6.90 |
| `gpt-4.1-nano` | $0.000260 | 6,8đ | $0.104 · 2.714đ | $0.260 · 6.786đ | $0.182 · 4.750đ | $0.455 · 11.876đ | $7.80 |
| `gpt-6-luna` | $0.000310 | 8,1đ | $0.124 · 3.236đ | $0.310 · 8.091đ | $0.217 · 5.664đ | $0.543 · 14.159đ | $9.30 |
| `gpt-4o-mini` | $0.000390 | 10,2đ | $0.156 · 4.072đ | $0.390 · 10.179đ | $0.273 · 7.125đ | $0.683 · 17.813đ | $11.70 |
| `gpt-5.6-luna` | $0.000720 | 18,8đ | $0.288 · 7.517đ | $0.720 · 18.792đ | $0.504 · 13.154đ | $1.260 · 32.886đ | $21.60 |
| `gpt-5.4-nano` | $0.000745 | 19,4đ | $0.298 · 7.778đ | $0.745 · 19.444đ | $0.522 · 13.611đ | $1.304 · 34.028đ | $22.35 |
| `gpt-4.1-mini` | $0.001040 | 27,1đ | $0.416 · 10.858đ | $1.040 · 27.144đ | $0.728 · 19.001đ | $1.820 · 47.502đ | $31.20 |
| `gpt-5-mini` | $0.001150 | 30,0đ | $0.460 · 12.006đ | $1.150 · 30.015đ | $0.805 · 21.010đ | $2.013 · 52.526đ | $34.50 |
| `gpt-5.4-mini` | $0.002700 | 70,5đ | $1.080 · 28.188đ | $2.700 · 70.470đ | $1.890 · 49.329đ | $4.725 · 123.322đ | $81.00 |
| `gpt-6.1-sol` (và `gpt-6-sol`, cùng giá in/out) | $0.006200 | 161,8đ | $2.480 · 64.728đ | $6.200 · 161.820đ | $4.340 · 113.274đ | $10.850 · 283.185đ | $186.00 |
| `gpt-5.6-terra` | $0.007200 | 187,9đ | $2.880 · 75.168đ | $7.200 · 187.920đ | $5.040 · 131.544đ | $12.600 · 328.860đ | $216.00 |
| `gpt-6-astra` | $0.031000 | 809,1đ | $12.40 · 323.640đ | $31.00 · 809.100đ | $21.70 · 566.370đ | $54.25 · 1.415.925đ | $930.00 |

### 15.2 Có reasoning token (khoảng giả định)

Số reasoning token thật cho prompt Wordmet **chưa đo**. Hai mức dưới đây là giả định để thấy biên độ: thêm 500 hoặc 2.000
reasoning token mỗi lời gọi (tổng output 1.000 hoặc 2.500). Áp cho model GPT-5.x/6.x; không áp cho `gpt-4.1-*`,
`gpt-4o-mini` (không có reasoning). Model cho phép `none` (`gpt-6-luna`, `gpt-6-sol`, `gpt-5.6-luna`, `gpt-5.6-terra`,
`gpt-5.4-nano/mini`) có thể về mức 15.1 khi đặt `none` (CT [S3][S6][S7][S8][S9][S10]); `gpt-6.1-sol`, `gpt-6-astra` thấp nhất
là `low` nên luôn có reasoning token (CT [S4][S5]); `gpt-5-nano/mini` thấp nhất `minimal` theo trang GPT-5 (CT [S13], áp cho
nano/mini là SL).

| Model | VND/đơn vị: 500 / +500 / +2.000 reasoning | 400 đơn vị: 500 / +500 / +2.000 | 1.000 đơn vị: 500 / +500 / +2.000 |
|---|---|---|---|
| `gpt-5-nano` | 6,0 / 11,2 / 26,9đ | 2.401 / 4.489 / 10.753đ | 6.003 / 11.223 / 26.883đ |
| `gpt-6-luna` | 8,1 / 14,6 / 34,2đ | 3.236 / 5.846 / 13.676đ | 8.091 / 14.616 / 34.191đ |
| `gpt-5.6-luna` | 18,8 / 34,5 / 81,4đ | 7.517 / 13.781 / 32.573đ | 18.792 / 34.452 / 81.432đ |
| `gpt-5.4-nano` | 19,4 / 35,8 / 84,7đ | 7.778 / 14.303 / 33.878đ | 19.444 / 35.757 / 84.694đ |
| `gpt-5-mini` | 30,0 / 56,1 / 134,4đ | 12.006 / 22.446 / 53.766đ | 30.015 / 56.115 / 134.415đ |
| `gpt-5.4-mini` | 70,5 / 129,2 / 305,4đ | 28.188 / 51.678 / 122.148đ | 70.470 / 129.195 / 305.370đ |
| `gpt-6.1-sol` | 161,8 / 292,3 / 683,8đ | 64.728 / 116.928 / 273.528đ | 161.820 / 292.320 / 683.820đ |
| `gpt-5.6-terra` | 187,9 / 344,5 / 814,3đ | 75.168 / 137.808 / 325.728đ | 187.920 / 344.520 / 814.320đ |
| `gpt-6-astra` | 809,1 / 1.461,6 / 3.419,1đ | 323.640 / 584.640 / 1.367.640đ | 809.100 / 1.461.600 / 3.419.100đ |

Muốn thêm trường hợp sinh lại: nhân cột 400 đơn vị với 1,75 (700 lời gọi) và cột 1.000 đơn vị với 1,75 (hoặc 2).

**Đặt cạnh usage limit $500/tháng của tier Build (CT [S26]; phép tính SL):** ở trần 1.000 đơn vị/ngày × 30 ngày,
`gpt-6.1-sol` ~$186 (không reasoning), ~$326 (sinh lại), ~$786 (thêm 2.000 reasoning token) — mức cuối vượt $500;
`gpt-6-astra` ~$930 ngay cả không reasoning; nhóm Luna/nano/mini dưới $100 trong mọi trường hợp ở bảng 15.1. Vượt usage
limit trả 429 `organization_usage_limit_exceeded` (CT [S25]); tier tự nâng khi tổng credit đã mua đạt $100 (Launch,
$5.000/tháng).

---

## Câu hỏi còn mở / trang không đọc được

Trang không đọc được:

- Bài help "What payment methods are accepted" / "How does prepaid billing work" (`help.openai.com/en/articles/8264644-...`)
  — HTTP 403. Nội dung prepaid đọc được qua bài 8264778/9047769, nhưng danh sách đầy đủ phương thức thanh toán thì chưa.
- Reference "Chat Completions — Create" (bản `.md` 404) — chưa đọc được mô tả và thời gian lưu của `store` ở Chat
  Completions.
- Leaderboard SEA-HELM — trang dựng bằng JavaScript, không ra số tiếng Việt.
- Artificial Analysis, GPT-6 Luna (medium) — trang ghi không có dữ liệu provider.

Câu hỏi chưa trả lời được bằng nguồn hôm nay:

1. `minLength`/`maxLength` có được Structured Outputs `strict` chấp nhận với model thường không? (Docs chỉ nhắc chúng trong
   danh sách "không hỗ trợ cho fine-tuned models".)
2. OpenAI có gửi `x-should-retry: false` cho 429 billing (`credit_balance_exhausted`, spend limit) không? Nếu không, SDK Node
   sẽ tự retry các lỗi đó.
3. Endpoint Usage (`/v1/organization/usage/completions`) và Costs (`/v1/organization/costs`) còn được hỗ trợ không (không có
   trong danh mục reference hôm nay), và dữ liệu chi phí trễ bao lâu?
4. ZDR / Modified Abuse Monitoring: một cá nhân hoặc doanh nghiệp nhỏ có đủ điều kiện không, quy trình mất bao lâu?
5. "Tuổi đồng ý số" theo luật Việt Nam là bao nhiêu (quyết định khi nào câu "không xử lý dữ liệu cá nhân của trẻ dưới 13 hoặc
   dưới tuổi đồng ý số nếu chưa bật ZDR" áp dụng cho Wordmet)?
6. Một developer cá nhân (chưa có công ty) có được tính là "Customer… businesses and developers" theo Services Agreement và
   DPA không?
7. Thuế/VAT khi mua credit từ Việt Nam; phí giao dịch ngoại tệ của ngân hàng phát hành thẻ.
8. Chat Completions: "stored by default for new accounts" khớp thế nào với bảng data controls ("None, see below for
   exceptions"); thời gian lưu là bao lâu?
9. `store: true` ở Responses lưu "at least 30 days" — thời hạn tối đa là bao lâu?
10. Số reasoning token thực tế cho ba prompt của Wordmet ở từng effort (`none`/`low`/`medium`) — cần đo.
11. TTFT và tổng latency với prompt ~600 token, output ~500 token, từ máy chủ đặt ở đâu (benchmark bên thứ ba dùng 10.000
    input) — cần đo.
12. Chất lượng tiếng Việt của từng model ứng viên cho ba operation — không có số chính thức; chỉ đo được bằng bộ thử riêng.
13. Moderation inline qua tham số `moderation` của Responses có miễn phí như endpoint `/v1/moderations` không?
14. `gpt-5-nano`/`gpt-5-mini` nhận những giá trị `reasoning.effort` nào (trang model không ghi)? `gpt-5-mini` có prompt caching
    không (features không liệt kê, bảng giá có cột cached input)?
15. Ultrafast: guide ghi cho `gpt-6-astra`/`gpt-6.1-sol`, reference tham số ghi `gpt-5.6-sol` — trang nào đúng?
16. Ngày phát hành chính thức của GPT-6 Luna (chỉ có nguồn TC).
17. Request bị client hủy (timeout phía Wordmet) có còn bị tính tiền phần token đã sinh không?

---

## Nguồn

- [S1] Pricing — https://developers.openai.com/api/docs/pricing (bản `.md`) (CT)
- [S2] Models — https://developers.openai.com/api/docs/models (CT)
- [S3] GPT-6 Luna — https://developers.openai.com/api/docs/models/gpt-6-luna (CT)
- [S4] GPT-6.1 Sol — https://developers.openai.com/api/docs/models/gpt-6.1-sol (CT)
- [S5] GPT-6 Astra — https://developers.openai.com/api/docs/models/gpt-6-astra (CT)
- [S6] GPT-6 Sol — https://developers.openai.com/api/docs/models/gpt-6-sol (CT)
- [S7] GPT-5.6 Luna — https://developers.openai.com/api/docs/models/gpt-5.6-luna (CT)
- [S8] GPT-5.6 Terra — https://developers.openai.com/api/docs/models/gpt-5.6-terra (CT)
- [S9] GPT-5.4 nano — https://developers.openai.com/api/docs/models/gpt-5.4-nano (CT)
- [S10] GPT-5.4 Mini — https://developers.openai.com/api/docs/models/gpt-5.4-mini (CT)
- [S11] GPT-5 nano — https://developers.openai.com/api/docs/models/gpt-5-nano (CT)
- [S12] GPT-5 Mini — https://developers.openai.com/api/docs/models/gpt-5-mini (CT)
- [S13] GPT-5 — https://developers.openai.com/api/docs/models/gpt-5 (CT)
- [S14] GPT-4.1 nano — https://developers.openai.com/api/docs/models/gpt-4.1-nano (CT)
- [S15] GPT-4.1 Mini — https://developers.openai.com/api/docs/models/gpt-4.1-mini (CT)
- [S16] GPT-4o Mini — https://developers.openai.com/api/docs/models/gpt-4o-mini (CT)
- [S17] Deprecations — https://developers.openai.com/api/docs/deprecations (CT)
- [S18] Reasoning models — https://developers.openai.com/api/docs/guides/reasoning (CT)
- [S19] Using GPT-6 (latest model guide) — https://developers.openai.com/api/docs/guides/latest-model (CT)
- [S20] Model selection — https://developers.openai.com/api/docs/guides/model-selection (CT)
- [S21] Migrate to the Responses API — https://developers.openai.com/api/docs/guides/migrate-to-responses (CT)
- [S22] Chat Completions Overview (reference) — https://developers.openai.com/api/reference/chat-completions/overview (CT)
- [S23] Structured model outputs — https://developers.openai.com/api/docs/guides/structured-outputs (CT)
- [S24] Responses — Create (reference) — https://developers.openai.com/api/reference/resources/responses/methods/create (CT)
- [S25] Error codes — https://developers.openai.com/api/docs/guides/error-codes (CT)
- [S26] Rate limits — https://developers.openai.com/api/docs/guides/rate-limits (CT)
- [S27] API Overview (headers, request IDs) — https://developers.openai.com/api/reference/overview (CT)
- [S28] npm registry, gói `openai` — https://registry.npmjs.org/openai (trang gói: https://www.npmjs.com/package/openai) (CT)
- [S29] openai-node README — https://github.com/openai/openai-node (CT)
- [S30] openai-node `src/client.ts` — https://github.com/openai/openai-node/blob/master/src/client.ts (CT)
- [S31] openai-node `package.json` — https://github.com/openai/openai-node/blob/master/package.json (CT)
- [S32] Spend limits — https://developers.openai.com/api/docs/guides/spend-limits (CT)
- [S33] Admin APIs — https://developers.openai.com/api/docs/guides/admin-apis (CT)
- [S34] Cookbook: Completions Usage API Extended Example — https://developers.openai.com/cookbook/examples/completions_usage_api (CT)
- [S35] API reference index — https://developers.openai.com/api/reference/llms.txt ; toàn bộ docs: https://developers.openai.com/api/llms-full.txt (CT)
- [S36] Production best practices — https://developers.openai.com/api/docs/guides/production-best-practices (CT)
- [S37] Manage permissions (RBAC) — https://developers.openai.com/api/docs/guides/rbac (CT)
- [S38] Manage service accounts with Terraform — https://developers.openai.com/api/docs/guides/terraform/service-accounts (CT)
- [S39] Model, tool, and data controls with Terraform — https://developers.openai.com/api/docs/guides/terraform/project-controls (CT)
- [S40] Data controls in the OpenAI platform — https://developers.openai.com/api/docs/guides/your-data (CT)
- [S41] Under-18 guidance — https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance (CT)
- [S42] Safety classifiers / safety identifiers — https://developers.openai.com/api/docs/guides/safety-checks (CT)
- [S43] OpenAI Services Agreement (hiệu lực 01/01/2026) — https://openai.com/policies/services-agreement/ (CT)
- [S44] Data Processing Addendum (hiệu lực 01/01/2026) — https://openai.com/policies/data-processing-addendum/ (CT)
- [S45] Usage policies (hiệu lực 29/10/2025) — https://openai.com/policies/usage-policies/ (CT)
- [S46] Sharing & publication policy (cập nhật 14/11/2022) — https://openai.com/policies/sharing-publication-policy/ (CT)
- [S47] Supported countries and territories — https://developers.openai.com/api/docs/supported-countries (CT)
- [S48] Help: Setting up and managing prepaid API billing — https://help.openai.com/en/articles/8264778 (cùng nội dung ở https://help.openai.com/en/articles/9047769) (CT)
- [S49] Help: Why was my credit card declined? — https://help.openai.com/en/articles/7232916 (CT)
- [S50] Help: API billing and invoice timing — https://help.openai.com/en/articles/6640792 (CT)
- [S51] Moderation guide — https://developers.openai.com/api/docs/guides/moderation (CT)
- [S52] omni-moderation model — https://developers.openai.com/api/docs/models/omni-moderation-latest (CT)
- [S53] Omni-moderation-2024-09-26 information for developers (PDF, 02/06/2026) — https://cdn.openai.com/API/docs/omni_moderation_information_for_developers.pdf (CT)
- [S54] Upgrading the Moderation API with our new multimodal moderation model — https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/ (CT)
- [S55] Prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching (CT)
- [S56] Batch API — https://developers.openai.com/api/docs/guides/batch (CT)
- [S57] Flex processing — https://developers.openai.com/api/docs/guides/flex-processing (CT)
- [S58] Fast mode — https://developers.openai.com/api/docs/guides/fast-mode (CT)
- [S59] Latency optimization — https://developers.openai.com/api/docs/guides/latency-optimization (CT)
- [S60] Artificial Analysis, GPT-6 Luna (Non-reasoning) providers — https://artificialanalysis.ai/models/gpt-6-luna-non-reasoning/providers (TC)
- [S61] Artificial Analysis, GPT-6 Luna (Low) providers — https://artificialanalysis.ai/models/gpt-6-luna-low/providers (TC)
- [S62] Artificial Analysis, GPT-5.4 nano (Non-reasoning) providers — https://artificialanalysis.ai/models/gpt-5-4-nano-non-reasoning/providers (TC)
- [S63] Artificial Analysis, GPT-5.4 mini (Non-reasoning) providers — https://artificialanalysis.ai/models/gpt-5-4-mini-non-reasoning/providers (TC)
- [S64] Artificial Analysis, GPT-5.6 Luna (Non-reasoning) providers — https://artificialanalysis.ai/models/gpt-5-6-luna-non-reasoning/providers (TC)
- [S65] Artificial Analysis, GPT-6.1 Sol (Low) providers — https://artificialanalysis.ai/models/gpt-6-1-sol-low/providers (TC)
- [S66] Snippet tìm kiếm về GPT-6 Luna (medium/high) và trang https://artificialanalysis.ai/models/gpt-6-luna-medium/providers (không có dữ liệu) (TC)
- [S67] Introducing GPT-4.1 in the API — https://openai.com/index/gpt-4-1/ (CT)
- [S68] MMMLU dataset card (tổ chức OpenAI trên Hugging Face) — https://huggingface.co/datasets/openai/MMMLU (TC)
- [S69] openai/simple-evals README — https://github.com/openai/simple-evals (CT)
- [S70] Introducing GPT-6 Sol and Luna — https://openai.com/index/introducing-gpt-6-sol-and-luna/ ; GPT-6 Astra — https://openai.com/index/gpt-6-astra/ (CT)
- [S71] Deployment Safety Hub: GPT-6 Sol and GPT-6 Luna, October 2026 update — https://deploymentsafety.openai.com/gpt-6-october ; cùng hub: https://deploymentsafety.openai.com/gpt-6-astra , https://deploymentsafety.openai.com/gpt-6-1-sol , https://deploymentsafety.openai.com/gpt-5-6 (CT)
- [S72] VMLU leaderboard — https://vmlu.ai/leaderboard (TC)
- [S73] SEA-HELM leaderboard — https://leaderboard.sea-lion.ai/ (TC, không đọc được số)
- [S74] Vietcombank, tỷ giá (XML, 19/10/2026 11:06:13) — https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx (TC — nguồn chính thức của ngân hàng, không thuộc OpenAI)
- [S75] Introducing GPT-5.4 mini and nano — https://openai.com/index/introducing-gpt-5-4-mini-and-nano/ (CT)
- [S76] Help 8264644 (payment methods / prepaid billing) — https://help.openai.com/en/articles/8264644-how-does-prepaid-billing-work (không đọc được, HTTP 403)
- [S77] Repo Wordmet: `apps/api/package.json` (`zod` 4.6.5); `node --version` trên máy dev (v24.11.0) (repo)
- [S78] Agents API: Run and continue sessions — https://developers.openai.com/api/docs/guides/agents-api/sessions ; Pre-warm sandboxes — https://developers.openai.com/api/docs/guides/agents-api/environments/prewarmed (CT)
- [S79] Ultrafast mode — https://developers.openai.com/api/docs/guides/ultrafast-mode (CT)
