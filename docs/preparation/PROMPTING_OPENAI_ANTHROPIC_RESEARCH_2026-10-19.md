# Cách viết prompt theo provider và model (OpenAI, Anthropic) — desk research (19/10/2026)

**Mục đích.** Bước 6 xây một AI gateway với ba operation: `generate_cloze` (một câu tiếng Anh theo CEFR có đúng một chỗ trống
`___`, danh sách dạng đáp án chấp nhận, bản dịch tiếng Việt), `lookup_word` (từ loại, lemma, nghĩa tiếng Việt ngắn, định nghĩa
tiếng Anh, 1–2 câu ví dụ) và `translate_sentence` (dịch một câu sang tiếng Việt), đều trả JSON chặt, gọi trong request với
deadline 10 s mỗi lần, input có thể chứa chữ người học tự gõ. Chủ dự án đã chốt: prompt do admin sửa trong admin UI (có
version) và admin chọn model cho từng operation. Chủ dự án hỏi: "look into how to prompt each model of each provider: OpenAI and
Anthropic". Tài liệu này gom dữ kiện có nguồn để chủ dự án tự quyết (1) một prompt text có dùng chung được giữa các model/provider
hay phải tách theo provider/model, và (2) có thêm Anthropic hay không. **Tài liệu không chọn provider, không chọn model, không
viết prompt đề xuất.** Các bảng so sánh trình bày trung lập.

**Cách làm.** Chỉ đọc trang công khai trong phiên ngày 19/10/2026; không đăng ký, không đăng nhập Console, không điền form, không
nhập credential.

- OpenAI: đọc bản Markdown của docs (thêm `.md` vào URL, như chính trang docs hướng dẫn), danh mục `llms.txt` và bản gộp
  `llms-full.txt`; Model Spec đọc bản HTML hiện hành (`model-spec.openai.com` chuyển hướng tới bản `2026-08-18`). Dữ kiện OpenAI
  về giá, dữ liệu, SDK, rate limit đã có trong `OPENAI_API_RESEARCH_2026-10-19.md` (cùng thư mục, cũng đọc ngày 19/10/2026) —
  tài liệu này chỉ trỏ tới ("xem OPENAI_API_RESEARCH mục X") và kiểm lại một phần làm đối chứng: giá `gpt-6-luna`,
  `gpt-6.1-sol`, `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5-nano`, `gpt-4.1-nano` trên trang Pricing hôm nay và mức
  `reasoning.effort` trên trang model `gpt-6-luna` đều khớp với file đó.
- Anthropic: `docs.claude.com/llms.txt` và `docs.anthropic.com/llms.txt` đều trả về cùng danh mục của `platform.claude.com`; đọc
  bản `.md` của từng trang docs, bản `llms-full.txt`, trang `claude.com/pricing`, Privacy Center, Help Center và trang Supported
  Regions bằng `curl` rồi lọc chữ; phiên bản SDK đọc từ npm registry.
- Các trang con cũ của Anthropic (`be-clear-and-direct`, `multishot-prompting`, `chain-of-thought`, `use-xml-tags`,
  `system-prompts`, `long-context-tips`, `chain-prompts`, `extended-thinking-tips`) hôm nay **chuyển hướng** vào các mục của một
  trang duy nhất "Prompting best practices"; `prefill-claudes-response` chuyển về trang Overview; `prompt-generator`,
  `prompt-improver`, `prompt-templates-and-variables` chuyển về "Prompting best practices"; `test-and-evaluate/eval-tool` chuyển
  về "Define success and build evaluations" (CT, kiểm bằng URL đích sau redirect).
- Đối chứng nguồn: một kết quả WebSearch tóm tắt rằng API Claude "not intended for individual use"; trang Help gốc (ngày
  16/03/2026) ghi ngược lại. Tài liệu dùng trang gốc và ghi lại sai lệch này (xem mục 10).

**Nhãn nguồn (bắt buộc).** **CT** = đã đọc hôm nay trên site của chính provider (OpenAI: openai.com và subdomain,
developers.openai.com, model-spec.openai.com; Anthropic: anthropic.com, claude.com, platform.claude.com, privacy.claude.com,
support.claude.com; npm registry của gói chính thức). **TC** = thứ cấp/bên thứ ba, snippet tìm kiếm. **SL** = suy luận của người
viết. Mỗi khẳng định trỏ tới `[S#]`; danh sách URL ở cuối file. Trích dẫn tiếng Anh giữ nguyên văn, ngắn.

---

## 1. Tóm tắt

1. **Cả hai provider đều nói prompt có thể phải khác theo model và phải đo bằng eval riêng.** OpenAI: "different model types
   (like reasoning versus GPT models) might need to be prompted differently… Even different snapshots of models within the same
   family could produce different results", kèm lời khuyên pin snapshot và có bộ eval (CT [S1]). Anthropic: kỹ thuật nào gắn tên
   một model thì "treat it as measured on that model and re-check it against your own evals before applying it to another"
   (CT [S39]). Cả hai đều có trang prompting riêng cho từng model/họ model (mục 4).
2. **Phần lời dẫn nghiệp vụ theo hướng dẫn hai bên khá giống nhau:** nói rõ và cụ thể, có ví dụ, tách phần bằng XML tags
   (OpenAI gợi ý Markdown + XML; Anthropic nhấn XML tags và 3–5 ví dụ bọc trong `<example>`) (CT [S1][S39]).
3. **"Vỏ" request khác nhau:** OpenAI đặt hướng dẫn ở `instructions` hoặc message role `developer`/`system`, dữ liệu ở
   `input` role `user`; Anthropic đặt hướng dẫn ở tham số `system` top-level, dữ liệu ở `messages` role `user`; Anthropic bắt
   buộc `max_tokens`, OpenAI không (CT [S16][S46]).
4. **JSON chặt:** OpenAI `text.format: {type: "json_schema", name, strict: true, schema}`; Anthropic
   `output_config.format: {type: "json_schema", schema}`. Cả hai tự chèn hướng dẫn định dạng + schema vào context, nên prompt
   không bắt buộc phải mô tả schema (CT [S15][S45]). Tập keyword JSON Schema khác nhau: Anthropic không nhận `maxItems`,
   `minimum`/`maximum`, `minLength`/`maxLength`, schema đệ quy, `minItems` chỉ nhận 0 hoặc 1 (CT [S45]); OpenAI nhận
   `minItems`/`maxItems`, ràng buộc số, đệ quy (CT [S14]).
5. **Reasoning/thinking là tham số, khác tên và khác giới hạn theo model:** OpenAI `reasoning.effort` (`gpt-6-luna` cho `none`,
   `gpt-6.1-sol` thấp nhất `low`); Anthropic `output_config.effort` + `thinking` (Haiku 5.5 tắt được ở effort ≤ `high`,
   Sonnet 5.5 chỉ hạ về `between_tools`, Opus 5.5 không tắt được) (CT [S5][S23][S36][S37]). Anthropic ghi với Haiku 5.5:
   "telling the model in the prompt to answer directly didn't stop it from thinking" (CT [S40]).
6. **Sampling:** OpenAI yêu cầu bỏ `temperature`/`top_p` khi `reasoning.effort` khác `none` (CT [S5]); Anthropic: model ra sau
   Opus 4.6 trả 400 nếu `temperature` ≠ 1, `top_p` < 0,99 hoặc có `top_k` (CT [S46]).
7. **Prefill:** Anthropic bỏ hỗ trợ prefill từ thế hệ Claude 4.6 (trả 400), chỉ model cũ hơn còn nhận; trong docs OpenAI không
   tìm thấy khái niệm prefill (CT [S39][S34]).
8. **Prompt injection — hai provider khuyên đặt input không tin cậy ở chỗ khác nhau:** OpenAI: đưa qua message `user`, không
   nhét vào `developer`; Model Spec coi văn bản trích dẫn/JSON/XML/YAML là "no authority by default" (CT [S18][S19]). Anthropic:
   nội dung bên thứ ba đặt trong `tool_result`, JSON-encode; riêng chữ người dùng dán vào thì bọc
   `<pasted_content id="…">` và nói quy tắc trong system prompt (trang Opus 5.5) (CT [S48][S43]).
9. **Một prompt OpenAI-style có thể bị một số model Claude từ chối:** field kiểu `reasoning`/`thinking` trong JSON output, hoặc
   yêu cầu ghi reasoning ra output, có thể gây refusal `reasoning_extraction` trên Fable 5.1, Opus 5.5, Opus 5, Sonnet 5.5,
   Fable 5 (CT [S36][S49]). Danh mục refusal của Haiku 5.5 hôm nay không liệt kê `reasoning_extraction` (CT [S40]).
10. **Lưu prompt phía server:** OpenAI đang khai tử reusable prompt objects (`v1/prompts` shutdown 30/11/2026) và Evals platform
    (read-only 31/10/2026, shutdown 30/11/2026), khuyên giữ prompt trong code có version và dùng Promptfoo (CT [S2][S4][S21]).
    Anthropic: không tìm thấy prompt template theo ID cho Messages API; Console có "playground" (CT [S53]).
11. **Giá tầng rẻ và tầng giữa đang trùng nhau:** `gpt-6-luna` và `claude-haiku-5-5` cùng $0,10/$0,50 mỗi 1M token input/output
    (Haiku 5.5 khi prompt ≤ 100K token); `gpt-6.1-sol` và `claude-sonnet-5-5` cùng $2/$10 (CT [S23][S31]). Tokenizer khác nhau
    nên cùng một câu không ra cùng số token (CT [S31]; so sánh chi phí thật là SL, chưa đo).
12. **Nếu thêm Anthropic:** Việt Nam có trong danh sách hỗ trợ; cá nhân được dùng API (theo Commercial Terms); trả bằng prepaid
    credits (hết hạn sau 1 năm, không hoàn); dữ liệu API không dùng để train theo mặc định; SDK `@anthropic-ai/sdk` 0.135.0,
    timeout mặc định 10 phút, `maxRetries` mặc định 2 (CT [S57][S58][S59][S56][S61][S62]).

---

## 2. Danh mục model liên quan hôm nay (mục 1)

### 2.1 OpenAI (rẻ/nhanh + một tầng giữa)

Bảng đầy đủ (cached input, context, knowledge cutoff, rate limit) ở OPENAI_API_RESEARCH mục 2. Dưới đây chỉ những cột liên quan
đến prompting (CT [S24], giá kiểm lại hôm nay [S23]).

| Model ID | Giá input / output (USD / 1M) | Reasoning | Tắt được reasoning? | Max output | Deprecation / shutdown |
|---|---|---|---|---|---|
| `gpt-6-luna` | $0,10 / $0,50 | Có; `none`, `low`, `medium` (mặc định), `high`, `xhigh`, `max` | Có (`none`) | 128.000 | Chưa công bố |
| `gpt-5.6-luna` | $0,20 / $1,20 | Có; `none` … `max`, mặc định `medium` | Có | 128.000 | Chưa công bố |
| `gpt-5.4-nano` | $0,20 / $1,25 | Có; mặc định `none` | Có | 128.000 | Shutdown 01/04/2027 |
| `gpt-5.4-mini` | $0,75 / $4,50 | Có; mặc định `none` | Có | 128.000 | Chưa công bố |
| `gpt-5-nano` | $0,05 / $0,40 | Có; trang GPT-5 ghi `minimal` … `high` (áp cho nano là SL) | Thấp nhất `minimal` (SL) | 128.000 | Snapshot shutdown 11/12/2026 |
| `gpt-4.1-nano` | $0,10 / $0,40 | Không | — | 32.768 | **Shutdown 23/10/2026** |
| `gpt-4o-mini` | $0,15 / $0,60 | Không | — | 16.384 | Shutdown 14/01/2027 |
| `gpt-6.1-sol` (tầng giữa) | $2 / $10 | Có; `low`, `medium` (mặc định), `high`, `xhigh`, `max` | **Không** (không có `none`/`minimal`) | 128.000 | Chưa công bố |

- Reasoning token không hiển thị nhưng tính tiền như output và tính vào `max_output_tokens` (CT, OPENAI_API_RESEARCH mục 2;
  [S13]).
- Trang GPT-6: "GPT-6 Astra and GPT-6.1 Sol do not support the `none` reasoning effort; GPT-6 Sol and GPT-6 Luna do" (CT [S5]).

### 2.2 Anthropic (Haiku / Sonnet / Opus hiện hành)

Giá Standard, USD mỗi 1M token (CT [S30][S31][S33][S35]; `claude.com/pricing` cho cùng số [S31]).

| Model ID | Input / output | Cache read / ghi 5 phút | Thinking | Tắt được thinking? | Effort mặc định | Context / max output | Trạng thái, phát hành, retirement |
|---|---|---|---|---|---|---|---|
| `claude-haiku-5-5` | $0,10 / $0,50 (prompt ≤ 100K token); $0,50 / $2,50 (prompt > 100K) | $0,01 / $0,125 (≤ 100K) | Adaptive, bật sẵn | Có: `thinking: {type: "disabled"}` ở effort `low`/`medium`/`high`; 400 ở `xhigh`/`max` | `medium` | 1M / 128K | Active (latest), 07/10/2026; không sớm hơn 07/10/2027 |
| `claude-haiku-4-5-20251001` (alias `claude-haiku-4-5`) | $1 / $5 | $0,10 / $1,25 | Extended thinking (`budget_tokens`), mặc định tắt | Mặc định đã tắt | Không hỗ trợ effort | 200K / 64K | Legacy, 15/10/2025; retirement "Not sooner than October 15, 2026" (mốc đã qua; bảng deprecation vẫn ghi Active) |
| `claude-sonnet-5-5` | $2 / $10 | $0,10 / $2,50 | Adaptive, bật sẵn | Không có `disabled` (400); thấp nhất `between_tools` ở effort ≤ `high` | `high` | 1M / 128K | Active (latest), 28/09/2026; không sớm hơn 28/09/2027 |
| `claude-sonnet-5` | $2 / $10 | $0,20 / $2,50 | Adaptive, bật sẵn | Có (`disabled`) | (không ghi lại) | (không ghi lại) | Legacy; không sớm hơn 30/06/2027 |
| `claude-opus-5-5` | $4 / $20 | $0,20 / $5 | Adaptive, luôn bật | **Không** (400 ở mọi effort) | `medium` | 1M / 128K | Active (latest), 22/09/2026; không sớm hơn 22/09/2027 |
| `claude-fable-5-1` (đầu bảng, để tham chiếu) | $10 / $50 | $0,25 / $12,50 | Adaptive, luôn bật | Không | `high` | 1M / 128K | Active; không sớm hơn 01/09/2027; "Covered Model" bắt buộc lưu dữ liệu 30 ngày (mục 10) |

Ghi chú (CT trừ khi ghi khác):

- "Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on"; `claude-haiku-5-5`
  "is a fixed model ID with no date suffix and no separate alias" [S30][S34].
- Claude 4.7 trở về sau dùng tokenizer mới, "produces approximately 30% more tokens for the same text" so với Haiku 4.5 và các
  model cũ [S31][S34].
- Batch giảm 50%; `inference_geo: "us"` nhân 1,1× giá; ghi cache 1 giờ = 2× giá input [S31].
- `claude-sonnet-4-5-20250929` đã deprecated, retire 30/11/2026, thay bằng `claude-sonnet-5-5` [S32].
- Mức effort: `low`, `medium`, `high`, `xhigh`, `max`; Haiku 5.5, Sonnet 5.5, Opus 5.5 hỗ trợ cả năm mức [S37].
- Có thể đọc khả năng tắt thinking của từng model qua Models API (`capabilities.thinking.types.disabled.supported`) [S30].

---

## 3. Hướng dẫn prompting chính thức của từng provider (mục 2)

### 3.1 OpenAI (CT)

- **Chỗ đặt hướng dẫn.** Tham số `instructions` "gives the model high-level instructions… Any instructions provided this way
  will take priority over a prompt in the `input` parameter"; tương đương một message role `developer` [S1]. Reference:
  `instructions` là "A system (or developer) message inserted into the model's context"; message trong `input` nhận role `user`,
  `assistant`, `system`, `developer`, và "Instructions given with the `developer` or `system` role take precedence over
  instructions given with the `user` role" [S16]. Ẩn dụ của OpenAI: `developer` message như định nghĩa hàm, `user` message như
  đối số của hàm [S1].
- **Cấu trúc developer message** "usually in this order (though the exact optimal content and order may vary by which model you
  are using)": Identity → Instructions → Examples → Context; context thường để gần cuối vì đổi theo từng request [S1].
- **Định dạng prompt.** Markdown headers/lists để chia phần và thứ bậc; XML tags để đánh dấu đầu/cuối một khối nội dung; XML
  attributes cho metadata [S1]. Guide GPT-4.1: bắt đầu với Markdown, XML "also perform well" [S11].
- **Few-shot.** "Typically, you will provide examples as part of a `developer` message"; nên có ví dụ đa dạng [S1]. Trang
  Prompting lại ghi "Put overall tone or role guidance in the system message; keep task-specific details and examples in user
  messages" [S2] — hai trang không hoàn toàn khớp (ghi nhận, không chọn).
- **Reasoning models.** "These models perform best with straightforward prompts"; "Avoid chain-of-thought prompts… prompting them
  to 'think step by step' or 'explain your reasoning' is unnecessary"; dùng delimiter; "Try zero shot first, then few shot if
  needed", ví dụ phải khớp chặt với lời dặn; nêu rõ ràng buộc và tiêu chí thành công [S12]. Trang Reasoning: "give them a clear
  goal, strong constraints, and an explicit output contract without prescribing every intermediate step"; "Treat
  `reasoning.effort` as a tuning knob, not the primary way to recover quality" [S13].
- **So sánh reasoning vs GPT model:** "reasoning models will provide better results on tasks with only high-level guidance. This
  differs from GPT models, which benefit from very precise instructions" [S1].
- **Gọn và không mâu thuẫn (GPT-5.6).** "Favor leaner prompts": mỗi quy tắc nói một lần, bỏ ví dụ không đổi hành vi; trong eval
  nội bộ cho coding agent, prompt gọn hơn tăng điểm ~10–15% và giảm 41–66% token (số của OpenAI, kết quả "will vary by
  workload"); "Use ALWAYS, NEVER, must, and only for true invariants"; "GPT-5-class models follow prompt contracts closely, so
  conflicting rules can create more instability than missing detail"; tránh quy tắc chung kiểu "always respond in the user's
  language" — nêu rõ ngôn ngữ đầu ra [S7]. Khung gợi ý: Role / Personality / Goal / Success criteria / Constraints / Tools /
  Output / Stop rules [S7].
- **Độ dài đầu ra.** GPT-5.5/5.6 có `text.verbosity` (`low`/`medium`/`high`, mặc định `medium`) để đặt mức chi tiết mặc định,
  phần còn lại ghi trong prompt [S7][S8][S16].
- **Structured Outputs với input do người dùng nhập.** "make sure your prompt includes instructions on how to handle situations
  where the input cannot result in a valid response", vì model "will always try to adhere to the provided schema, which can
  result in hallucinations"; đặt tên key rõ và có description [S14].
- **Caching và thứ tự.** Nội dung lặp lại đặt ở đầu prompt và trong các tham số đầu của JSON body [S1]; "Put stable developer
  instructions and shared reference material first… place [dynamic content] at the end" [S15]. Các thiết lập làm đổi prefix:
  `model`, `tools`, `text.format` ("Adds output-format instructions and the requested schema"), `reasoning.effort`,
  `text.verbosity` [S15]. Ngưỡng cache tối thiểu 1.024 visible input token cho GPT-5.6 trở về sau [S15].
- **Quản lý prompt.** "Store production prompts in your application code instead of creating reusable prompt objects"; pin
  snapshot; có test và eval trước khi đổi prompt production [S1][S2] (chi tiết mục 8).

### 3.2 Anthropic (CT)

- **Điều kiện trước khi làm prompt:** có tiêu chí thành công, cách đo, bản nháp đầu tiên; mọi kỹ thuật được gom vào trang
  "Prompting best practices" — "That's the living reference; start there" [S38].
- **Be clear and direct.** "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows";
  "Golden rule": đưa prompt cho đồng nghiệp ít ngữ cảnh đọc thử; nêu định dạng và ràng buộc; dùng danh sách đánh số khi thứ tự
  bước quan trọng [S39].
- **Nêu lý do cho chỉ dẫn.** Ví dụ thay "NEVER use ellipses" bằng câu giải thích output sẽ đọc qua TTS; "Claude is smart enough to
  generalize from the explanation" [S39].
- **Ví dụ (multishot).** Relevant, diverse, bọc trong `<example>` (nhiều ví dụ trong `<examples>`); "Include 3–5 examples for best
  results" [S39].
- **XML tags.** Bọc từng loại nội dung trong tag riêng (`<instructions>`, `<context>`, `<input>`), tên tag nhất quán, lồng khi có
  thứ bậc [S39].
- **Role.** Đặt vai trò trong system prompt (tham số `system`); "Even a single sentence makes a difference" [S39][S46].
- **Long context (20K+ token):** dữ liệu dài ở đầu, câu hỏi ở cuối ("up to 30 percent" trong test của Anthropic) [S39]. SL: prompt
  của Wordmet ngắn nên mục này ít liên quan.
- **Định dạng đầu ra:** nói điều cần làm thay vì điều cấm; style của prompt ảnh hưởng style output [S39].
- **Thinking thay cho "chain of thought".** Trang chain-of-thought cũ nay chuyển về mục "Leverage thinking"; model 4.6+ dùng
  adaptive thinking, "On easier queries that don't require thinking, the model responds directly"; effort là nút điều khiển
  chính; `budget_tokens` trả 400 từ Claude 4.7 [S39][S36]. Yêu cầu model ghi suy nghĩ ra output (khối `<thinking>`, field
  `reasoning` trong JSON…) có thể bị refusal `reasoning_extraction` trên Fable 5.1, Opus 5.5, Opus 5, Sonnet 5.5, Fable 5
  [S36][S49]; muốn có giải thích thì xin "a short explanation" [S49].
- **Prefill đã bị bỏ.** "Starting with Claude 4.6 models… prefilled responses… are no longer supported"; cách thay: Structured
  Outputs cho định dạng, câu "Respond directly without preamble" trong system prompt, dời phần tiếp nối vào user turn [S39].
- **Prompt chaining:** vẫn hữu ích khi cần xem bước trung gian, ví dụ draft → review → refine, mỗi bước một API call [S39].
- **Caching và thứ tự.** Prefix cache theo thứ tự `tools` → `system` → `messages`; đổi tầng trước làm mất cache tầng sau; đổi
  thinking/effort làm mất cache phần messages (và có thể cả system/tools tùy model); đổi `output_config.format` làm mất cache
  [S47][S45]. Ngưỡng tối thiểu 512 token cho Haiku 5.5, Sonnet 5.5, Opus 5.5 (4.096 cho Haiku 4.5); ngắn hơn thì không cache và
  không báo lỗi [S47].
- **Đổi chỉ dẫn giữa hội thoại:** có `{"role": "system"}` message giữa hội thoại trên một số model (Haiku 5.5, Sonnet 5.5, Opus
  5.5…, không có trên Sonnet 5) [S50]. SL: ba operation của Wordmet là một lượt, nên tính năng này ít liên quan.

---

## 4. Khác biệt theo model bên trong từng provider (mục 3)

### 4.1 OpenAI — có hướng dẫn riêng theo họ model (CT)

| Họ model | Điểm khác về prompting (trích ngắn) | Nguồn |
|---|---|---|
| GPT-4.1 (không reasoning) | "trained to follow instructions more closely and more literally than its predecessors"; khi mâu thuẫn "tends to follow the one closer to the end of the prompt"; không cần all-caps/"bribes"; khuyên đặt câu chain-of-thought ở cuối prompt vì không phải reasoning model | [S11] |
| GPT-5 (`minimal`) | Prompt giống GPT-4.1; "minimal reasoning performance can vary more drastically depending on prompt than higher reasoning levels" | [S10] |
| GPT-5.4 mini / nano | "less likely than larger models to infer missing steps… prompts for smaller models are often a bit longer and more explicit"; mini "is more literal and makes fewer assumptions"; nano "only for narrow, well-bounded tasks. Prefer closed outputs: labels, enums, short JSON"; thứ tự gợi ý: Task → Critical rule → Exact step order → Edge cases → Output format → One correct example; thay "output nothing else" bằng "after the final JSON, output nothing further" | [S9] |
| GPT-5.5 | "treat it as a new model family to tune for, not a drop-in replacement"; "interprets prompts in a literal and thorough manner"; `none` dành cho tác vụ latency-critical như classification | [S8] |
| GPT-5.6 | "Favor leaner prompts"; "more concise by default than GPT-5.5"; quy trình migrate: giữ effort cũ, chạy eval trước khi sửa prompt, sửa từng chỗ | [S6][S7] |
| GPT-6 (Astra/Sol/Luna) | Hướng dẫn "address behavior observed with GPT-6 Astra; evaluate them with your chosen model and workload"; Astra "stronger at general instruction following… can be more sensitive to instructions contained in skills and other files" | [S5] |

- **Không tìm thấy** hướng dẫn prompting riêng cho `gpt-6-luna` hay `gpt-6.1-sol`: trang model Luna và guide GPT-6 không có
  mục riêng; cookbook index hôm nay không có prompting guide cho GPT-6 (CT [S5][S23][S25]).

### 4.2 Anthropic — có trang prompting riêng cho từng model (CT)

Trang best practices có bảng "Model-specific guidance": "Each of these models has its own prompting page. Read the one for your
model first, then the techniques that follow" [S39].

| Model | Điểm khác về prompting (trích ngắn) | Nguồn |
|---|---|---|
| Haiku 5.5 | "Existing Claude Haiku 4.5 prompts should perform well without changes"; effort là nút chính, `low` cho "simple, high-volume requests", `high` cho "strict instruction following"; tắt thinking + JSON output có thể làm model bỏ tool call cần thiết; câu gợi ý để chatbot giữ system prompt; reasoning-like text có thể lọt vào reply khi tắt thinking hoặc `low` effort; refusal classifiers mới, không có server-side fallback | [S40][S37] |
| Sonnet 5.5 | Effort "recalibrated" so với Sonnet 5; "Reasoning tasks with JSON output": với Structured Outputs ở `low`/`medium`, model thường trả lời mà không nghĩ trước — gợi ý thêm "Think the problem through before you answer." ở cuối system prompt hoặc dùng `xhigh`; coi `stop_reason: "max_tokens"` là thất bại dù JSON hợp lệ; với `between_tools`, bỏ mọi câu bảo model đừng nghĩ | [S41][S37] |
| Sonnet 5, Opus 4.8 | "More literal instruction following… It does not silently generalize an instruction from one item to another… generally performs better for API use cases with carefully tuned prompts, structured extraction" | [S42] |
| Opus 5.5 | "Existing Claude Opus 5 prompts should perform well without changes"; tên mức effort "don't correspond to the same amount of thinking across models"; nên bỏ câu "think carefully" trong system prompt chat; hướng dẫn đánh dấu văn bản người dùng dán vào | [S43] |
| Fable 5 | "Instruction-following is improved enough that you can steer most behaviors with a brief instruction rather than enumerating each behavior by name" | [S44] |
| Claude 4 trở về sau (chung) | "more concise, direct communication style and need explicit direction" (ghi trong migration guide của Haiku 5.5 khi chuyển từ Haiku 3.5) | [S34] |

---

## 5. Ép JSON chặt (mục 4)

| Điểm | OpenAI (Responses) | Anthropic (Messages) |
|---|---|---|
| Tham số | `text.format: {type: "json_schema", name, strict: true, schema}`; Chat Completions dùng `response_format` [S14] | `output_config.format: {type: "json_schema", schema}` (không có `name`/`strict`); song song có strict tool use (`strict: true`) [S45][S46] |
| Cơ chế | Bảo đảm schema adherence; "Structured Outputs is the evolution of JSON mode" [S14] | "constrained decoding" bằng grammar biên dịch từ schema [S45] |
| Chế độ JSON lỏng | `text.format: {type: "json_object"}`; bắt buộc có chữ "JSON" trong context, nếu không API báo lỗi [S14] | Không tìm thấy JSON mode riêng; cách ép JSON bằng prefill cũ không còn trên model 4.6+ [S39] |
| Prompt có phải mô tả schema? | Không bắt buộc với Structured Outputs; `text.format` "Adds output-format instructions and the requested schema" vào prefix [S15] | Không bắt buộc; "Claude automatically receives an additional system prompt explaining the expected output format" (tính token như system prompt) [S45] |
| Root | Phải là object, không được `anyOf` (OPENAI_API_RESEARCH mục 4) | Không tìm thấy quy định riêng về root |
| `required` / `additionalProperties` | Mọi field phải `required`; `additionalProperties: false` ở mọi object | `additionalProperties` phải `false`; field optional được phép nhưng xuất hiện sau field required; tối đa 24 optional parameters, 16 parameters dạng union mỗi request [S45] |
| Keyword được hỗ trợ | String: `pattern`, `format`; number: `minimum`, `maximum`, `multipleOf`…; array: `minItems`, `maxItems`; `anyOf`, `$defs`, đệ quy; không có `allOf`, `not`, `if/then/else` (OPENAI_API_RESEARCH mục 4) | `enum`, `const`, `anyOf`, `allOf` (không kèm `$ref`), `$ref`/`$defs` nội bộ, `default`, `format`, `pattern` (regex đơn giản: không backreference, không lookahead/lookbehind, không `\b`); `minItems` chỉ 0 hoặc 1; **không** có ràng buộc số, `minLength`/`maxLength`, đệ quy; tính năng không hỗ trợ → 400 [S45] |
| SDK Node + Zod | `zodTextFormat` + `client.responses.parse()` → `output_parsed` (OPENAI_API_RESEARCH mục 4) | `zodOutputFormat` (`@anthropic-ai/sdk/helpers/zod`) + `client.messages.parse()` → `parsed_output`; SDK bỏ ràng buộc không hỗ trợ, ghi chúng vào `description`, rồi validate lại phía client theo schema gốc [S45] |
| Lần đầu dùng schema | "the first request you make with any schema will have additional latency" [S14] | Thêm latency khi biên dịch grammar; grammar cache 24 giờ kể từ lần dùng cuối; đổi `name`/`description` không làm mất cache grammar [S45] |
| Refusal | Content `type: "refusal"` thay cho `output_text` [S14] | `stop_reason: "refusal"`, HTTP 200, vẫn tính tiền token đã sinh, output có thể không khớp schema; `stop_details.category` (`cyber`, `bio`, `frontier_llm`, `reasoning_extraction`, `general_harms`) [S45][S49] |
| Bị cắt | `status: "incomplete"`, `incomplete_details.reason: "max_output_tokens"`, có thể xảy ra trước khi có output hiển thị [S13] | `stop_reason: "max_tokens"`, output có thể dở dang; thinking tính vào `max_tokens` nên có thể dừng sau khối thinking, trước text [S45][S34] |
| Sai nội dung | "Structured Outputs can still contain mistakes" [S14] | Giá trị `enum`/`const` có thể sai hoa/thường; nên so sánh không phân biệt hoa thường [S45] |
| Không dùng chung với | — | Citations (400), message prefill [S45] |
| Dữ liệu schema | "System data" (gồm structured output schema) ngoài phạm vi data residency (OPENAI_API_RESEARCH mục 9) | Schema được cache tới 24 giờ; không để PHI trong schema [S45] |

SL (chưa thử): một schema cho `generate_cloze` gồm `sentence` (string), `accepted_answers` (array, `minItems: 1`),
`translation_vi` (string) nằm trong phần giao nhau của hai bộ quy tắc trên; `maxItems` hay giới hạn độ dài chỉ dùng được bên
OpenAI. Ràng buộc "đúng một `___`" có thể thử bằng `pattern` chỉ gồm character class và quantifier (cả hai docs đều liệt kê hai
loại này là được hỗ trợ), nhưng chưa thử trên API nào; dù schema đúng, các kiểm tra nghiệp vụ vẫn phải nằm trong code.

---

## 6. Tham số mà một stored prompt phải mang theo provider/model (mục 5)

| Tham số | OpenAI Responses | Anthropic Messages | Khác theo model |
|---|---|---|---|
| Hướng dẫn chính | `instructions` (string) hoặc message role `developer`/`system` trong `input` [S16] | `system` (string hoặc mảng text block, mỗi block có thể mang `cache_control`) [S46] | Anthropic: role `system` giữa hội thoại chỉ có trên một số model [S50] |
| Dữ liệu | `input` (string hoặc mảng message role `user`) [S16] | `messages`, xen kẽ `user`/`assistant`; turn liên tiếp cùng role bị gộp [S46] | — |
| Header bắt buộc | `Authorization: Bearer` | `x-api-key`, `anthropic-version: 2023-06-01` [S46][S37] | — |
| Giới hạn token ra | `max_output_tokens` (tùy chọn), gồm cả reasoning token [S16] | `max_tokens` **bắt buộc**, gồm cả thinking [S46] | Max 128K (GPT-5.x/6, Claude 5.x), 64K Haiku 4.5, 32.768 `gpt-4.1-nano`, 16.384 `gpt-4o-mini` [S24][S30][S35] |
| Mức suy nghĩ | `reasoning.effort`: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` — "Not all reasoning models support every value" [S16] | `output_config.effort`: `low` … `max` + `thinking`: `adaptive` / `disabled` / `between_tools` / `enabled` + `budget_tokens` (≥ 1.024) [S46] | Bảng ở mục 2; Opus 5.5 không tắt được; Haiku 4.5 không hỗ trợ effort |
| Mức chi tiết | `text.verbosity` `low`/`medium`/`high` [S16] | Không tìm thấy tham số tương đương | — |
| `temperature` / `top_p` | `temperature` 0–2; phải bỏ khi effort ≠ `none` trên GPT-5.x/6 [S16][S5] | Deprecated: model ra sau Opus 4.6 chỉ nhận `temperature` = 1, `top_p` ≥ 0,99, không nhận `top_k` [S46] | `gpt-4.1-*`, `gpt-4o-mini`, Haiku 4.5 vẫn nhận sampling bình thường |
| Stop sequences | Reference Responses không có tham số `stop` (không tìm thấy); docs chung có nhắc stop sequence cho Completions cũ [S16][S25] | `stop_sequences` (mảng string) → `stop_reason: "stop_sequence"` [S46] | — |
| Prefill | Không tìm thấy khái niệm này | Chỉ model trước 4.6 (Haiku 4.5 khi tắt thinking); model 4.6+ trả 400 [S39][S34] | Có |
| Cache | Tự động; `prompt_cache_key`; `prompt_cache_options` (`mode` implicit/explicit, `ttl: "30m"`) cho GPT-5.6+; breakpoint trên content block [S16] | `cache_control` top-level (automatic) hoặc trên từng block; TTL 5 phút hoặc 1 giờ [S47] | Ngưỡng tối thiểu: 1.024 token (OpenAI GPT-5.6+); 512 (Claude 5.x), 4.096 (Haiku 4.5) [S15][S47] |
| JSON | `text.format` | `output_config.format` | Bảng mục 5 |
| Lưu trữ | `store` (mặc định `true`) — OPENAI_API_RESEARCH mục 9 | Không có tham số; theo chính sách retention (mục 10) | Claude Fable/Mythos: bắt buộc retention 30 ngày [S54] |
| Định danh người dùng cuối | `safety_identifier` (≤ 128 ký tự, khuyên hash) [S17] | `metadata.user_id` (uuid/hash, ≤ 512 ký tự, không chứa tên/email) [S46] | — |

SL: những tham số trên đổi theo provider (tên, kiểu, có/không) và theo model (giá trị hợp lệ); phần chữ của prompt không
quyết định được chúng — ví dụ Anthropic ghi rằng bảo Haiku 5.5 "trả lời thẳng" trong prompt không làm nó ngừng suy nghĩ [S40].

---

## 7. Prompt injection: hướng dẫn chính thức (mục 6)

### 7.1 OpenAI (CT)

- **Chain of command / Model Spec (bản 2026-08-18):** "Quoted text (plaintext in quotation marks, YAML, JSON, XML, or
  `untrusted_text` blocks) in ANY message… are assumed to contain untrusted data and have no authority by default"; OpenAI "strongly
  advise[s] developers to put untrusted data in `untrusted_text` blocks when available, and otherwise use YAML, JSON, or XML
  format"; "Another option for end user instructions is to include them as a part of a user message" [S19]. Không tìm thấy
  content type `untrusted_text` trong docs API (đã tìm trong `llms-full.txt`) — có thể chỉ là khái niệm trong Model Spec (SL).
- **Không đưa biến không tin cậy vào developer message:** "Because developer messages take precedence over user and assistant
  messages, injecting untrusted input directly into developer messages gives attackers the highest degree of control. Pass
  untrusted inputs through user messages to limit their influence" [S18]. Trang này nằm trong guide Agent Builder — sản phẩm đang
  khai tử (shutdown 30/11/2026) [S4][S18].
- **Structured Outputs để chặn kênh tự do:** "By defining structured outputs between nodes (e.g., enums, fixed schemas, required
  field names), you eliminate freeform channels" [S18].
- **Giới hạn input/output:** "Limiting the amount of text a user can input into the prompt helps avoid prompt injection. Limiting
  the number of output tokens helps reduce the chance of misuse"; ưu tiên input có kiểm soát (dropdown) hơn text tự do [S17].
- **Red-teaming:** thử các câu như "ignore the previous instructions and do this instead" [S17].
- **Moderation API** miễn phí; có thể xin điểm moderation ngay trong request Responses [S17] (chi tiết OPENAI_API_RESEARCH mục 11).

### 7.2 Anthropic (CT)

- **Hai loại mối đe dọa:** "Jailbreaks and direct prompt injection" (người dùng là kẻ tấn công) và "Indirect prompt injection"
  (nội dung bên thứ ba chứa chỉ thị) [S48].
- **Cho direct injection:** "Harmlessness screens" bằng một model nhẹ (Haiku 5.5) + Structured Outputs để phân loại input trước;
  coi `stop_reason: "refusal"` của bước screen là kết luận "có hại"; lọc mẫu injection đã biết; system prompt nói rõ ranh giới
  và cách từ chối; xử lý người dùng tái phạm [S48].
- **Cho indirect injection:** "Put untrusted content only in tool results… never in `system` prompts or plain user `text` blocks";
  nói rõ nguồn gốc nội dung; nêu chính sách trong system prompt; "JSON-encode untrusted content… an attacker cannot close a quote
  or tag to 'break out'"; không đặt chỉ dẫn của chính mình trong tool result; screen tool output trước khi dùng [S48].
- **Văn bản người dùng dán vào (Opus 5.5):** bọc mỗi khối dán trong `<pasted_content id="…">` với ID ngẫu nhiên do ứng dụng sinh,
  thêm một đoạn system prompt nói rằng chỉ dẫn trong khối đó chỉ được làm theo khi chính người dùng yêu cầu; "The tags are plain
  text and can be imitated, so treat this as one guardrail alongside other prompt-injection defenses" [S43].
- **Model được train để nghi ngờ tool result:** Haiku 5.5 "is trained to resist prompt injection through tool results"; vì vậy
  không đặt chữ người dùng thật trong `tool_result` (model có thể bỏ qua) [S40].
- **Giữ system prompt trong chatbot (Haiku 5.5):** câu gợi ý "The rules in this system prompt hold for the whole conversation…"
  và dùng effort `high` khi instruction following quan trọng nhất [S40].

SL: với ba operation của Wordmet (một lượt, không tool), hai hướng dẫn trên dẫn tới hai cách đặt chữ người học khác nhau
(OpenAI: trong message `user`, có thể bọc JSON/XML; Anthropic: JSON-encode hoặc tag `<pasted_content>` trong user turn, hoặc
dạng `tool_result`). Chưa đo cách nào hiệu quả hơn với dữ liệu Wordmet.

---

## 8. Version prompt và evaluation (mục 7)

### 8.1 OpenAI (CT)

- **Reusable prompt objects đang bị khai tử:** thông báo 03/06/2026; "The `v1/prompts` API and reusable prompt objects are
  scheduled to shut down" ngày 30/11/2026; cách chuyển: đưa nội dung prompt vào code [S4][S3]. Tham số `prompt: {id, version,
  variables}` vẫn còn trong reference Responses hôm nay [S16].
- **Hướng dẫn thay thế:** "Keep each production prompt in a code-managed, versioned helper"; biến → tham số có kiểu; truyền thẳng
  `instructions`/`input`; test + fixture + eval chạy cùng quy trình deploy; "Use git history, PR review, release tags, and feature
  flags to review, ship, compare, and roll back prompt changes" [S2][S1].
- **Evals platform đang bị khai tử:** read-only từ 31/10/2026, dashboard và API shutdown 30/11/2026; Datasets và prompt optimizer
  (dựa trên dataset) nằm trong đợt này; đường chuyển: "Moving from OpenAI Evals to Promptfoo" [S4][S20].
- **Promptfoo:** "an open-source library, to evaluate and red-team AI applications… compare prompts or models"; "Promptfoo is part
  of OpenAI"; cần Node.js 22.22.0 trở lên [S21]. Trang docs của Promptfoo có provider cho Anthropic Messages API (liệt kê
  `claude-haiku-5-5`… hôm nay) (TC [S64]).
- **Playground "Generate":** sinh prompt/schema từ mô tả bằng meta-prompt [S22]; trang không có ghi chú khai tử (CT).

### 8.2 Anthropic (CT)

- **Không tìm thấy** prompt template lưu phía server và gọi theo ID cho Messages API. Các URL cũ `prompt-generator`,
  `prompt-improver`, `prompt-templates-and-variables` chuyển về trang best practices; `eval-tool` chuyển về trang "Define success
  and build evaluations" (kiểm redirect hôm nay) [S39][S52].
- **Console:** docs gọi là "playground" ("legacy Workbench before it"); usage từ playground không gắn với API key; Console nằm
  ngoài phạm vi ZDR [S53][S54]. Tính năng cụ thể trong Console (có lưu version prompt hay chạy eval không) **chưa xác minh** vì cần
  đăng nhập.
- **Thứ có version phía server:** Managed Agents (beta) có resource "Agents" với `system` và version ("Provide a specific `version`
  or use the short-form… for the most recent version") — dành cho agent session chạy trong sandbox của Anthropic, không phải
  Messages API [S53]; Agent Skills API cũng có version [S53].
- **Eval:** trang "Define success and build evaluations": eval "task-specific", tự động chấm khi được, "Prioritize volume over
  quality"; thứ tự chấm: code-based → LLM-based → human; dùng grader có thinking [S52]. Prompt generator dạng notebook
  ("metaprompt") trên Claude Cookbook [S38].

---

## 9. Portability: những gì làm một prompt hành xử khác giữa OpenAI và Anthropic (mục 8)

Khác biệt cụ thể (CT trừ khi ghi khác):

1. **Role và chỗ đặt system prompt:** OpenAI có 4 role (`system`, `developer`, `user`, `assistant`) và tham số `instructions`
   [S16]; Anthropic có `system` top-level, `messages` chỉ `user`/`assistant` (cộng `system` giữa hội thoại trên một số model)
   [S46][S50]. Lớp tương thích OpenAI SDK của Anthropic gộp mọi message `system`/`developer` thành một chuỗi nối bằng `\n` đặt ở
   `system` [S51].
2. **Cơ chế JSON và dialect schema** (mục 5): `name`/`strict` chỉ có ở OpenAI; tập keyword khác nhau; thứ tự key output khác
   (Anthropic đưa field required lên trước) [S14][S45]. Lớp tương thích OpenAI SDK của Anthropic **bỏ qua** `response_format` và
   `strict` [S51].
3. **Ví dụ:** cả hai cho phép ví dụ trong system/developer bằng XML; OpenAI có trang khuyên đặt ví dụ trong developer message, trang
   khác khuyên đặt trong user message [S1][S2]; Anthropic khuyên `<example>`/`<examples>`, 3–5 ví dụ [S39].
4. **Chỉ dẫn về suy nghĩ:** OpenAI khuyên không viết "think step by step" cho reasoning model, nhưng khuyên có với GPT-4.1 [S12][S11];
   Anthropic khuyên dùng effort, có model cần câu "Think the problem through before you answer." (Sonnet 5.5 + JSON), có model nên
   bỏ câu "think carefully" (Opus 5.5 chat), và đòi reasoning ra output có thể bị `reasoning_extraction` [S41][S43][S49].
5. **Input không tin cậy:** OpenAI → message `user`, bọc JSON/XML/YAML; Anthropic → `tool_result`/JSON-encode/`<pasted_content>`
   (mục 7).
6. **Tham số đi kèm:** sampling, prefill, stop sequences, cache control, max tokens bắt buộc hay không (mục 6).
7. **Tokenizer:** số token cho cùng văn bản khác nhau giữa provider và cả giữa thế hệ Claude [S31][S34].
8. **Lớp tương thích:** Anthropic có endpoint tương thích OpenAI SDK nhưng ghi rõ "primarily intended to test and compare model
   capabilities, and is not considered a long-term or production-ready solution for most use cases"; không có prompt caching qua
   lớp này [S51].

**Bảng trung lập — phần nào dùng chung, phần nào phải riêng** (cột "Dùng chung được" là SL dựa trên việc hai bên cùng chấp nhận
dạng đó; chưa đo chất lượng):

| Thành phần | Dùng chung được giữa provider/model | Phải riêng theo provider | Phải riêng theo model | Nguồn |
|---|---|---|---|---|
| Mô tả nhiệm vụ, quy tắc nghiệp vụ (CEFR, một chỗ trống, dịch đủ câu), ngôn ngữ đầu ra | Dạng chữ thuần, Markdown hoặc XML đều được cả hai chấp nhận | — | Mức chi tiết cần có: model nhỏ cần rõ hơn (`gpt-5.4-mini/nano`), model "literal" (GPT-4.1, GPT-5.5, Sonnet 5, Opus 4.8) không tự suy rộng | [S1][S39][S9][S11][S8][S42] |
| Ví dụ few-shot | Ví dụ bọc XML trong prompt: cả hai hỗ trợ | Vị trí khuyến nghị khác (OpenAI: hai trang nói khác nhau) | Reasoning model: "try zero shot first"; Anthropic: 3–5 ví dụ | [S1][S2][S12][S39] |
| Mô tả schema bằng chữ | Không bắt buộc ở cả hai (provider tự chèn) | — | — | [S15][S45] |
| Bản thân JSON Schema | Phần giao (object, string, array, enum, `pattern` đơn giản, `minItems` 0/1, `additionalProperties: false`) | Keyword riêng (`maxItems`, min/max số chỉ OpenAI); `name`/`strict` chỉ OpenAI | — | [S14][S45] |
| Vỏ request (role, field) | — | `instructions`/`developer` vs `system`; `input` vs `messages`; header | — | [S16][S46] |
| Chỗ đặt chữ người học (không tin cậy) | — | OpenAI: message `user`; Anthropic: `tool_result`/JSON-encode/`<pasted_content>` | Opus 5.5 có hướng dẫn `<pasted_content>` riêng | [S18][S19][S48][S43] |
| Chỉ dẫn về suy nghĩ/giải thích | — | Field `reasoning` trong output có rủi ro `reasoning_extraction` chỉ ở Claude | `reasoning_extraction` chỉ được nêu cho Fable 5.1/5, Opus 5/5.5, Sonnet 5.5 (không nêu cho Haiku 5.5); Sonnet 5.5 + JSON: câu "Think the problem through…"; Opus 5.5: bỏ "think carefully"; GPT-4.1: CoT ở cuối prompt | [S36][S49][S40][S41][S43][S11] |
| Mức suy nghĩ | — | `reasoning.effort` vs `output_config.effort` + `thinking` | Giá trị hợp lệ và mặc định khác từng model; có tắt được hay không | [S5][S23][S36][S37] |
| Sampling (`temperature`…) | — | Quy tắc khác | `gpt-4.1-*`/`gpt-4o-mini`/Haiku 4.5 nhận; GPT-5.x/6 chỉ khi `none`; Claude sau Opus 4.6 không nhận | [S5][S46] |
| Max tokens | — | Bắt buộc ở Anthropic | Trần khác nhau; phải chừa chỗ cho reasoning/thinking | [S16][S46][S34] |
| Cache | — | Cơ chế và tham số khác | Ngưỡng tối thiểu khác (1.024 / 512 / 4.096) | [S15][S47] |
| Phát hiện refusal / bị cắt | — | `type: "refusal"` & `status: "incomplete"` vs `stop_reason: "refusal"`/`"max_tokens"` | — | [S14][S13][S45] |

SL (không phải đề xuất): nếu prompt được lưu và sửa trong admin UI, các trường thay đổi theo bảng trên là (a) chữ hướng dẫn và ví
dụ, (b) "vỏ" theo provider, (c) tham số theo model. Cách gom ba phần này vào một bản ghi có version là quyết định thiết kế của
chủ dự án; tài liệu không chọn.

---

## 10. Nếu thêm Anthropic làm provider thứ hai (mục 9 — chỉ dữ kiện)

- **Việt Nam:** có trong danh sách "Supported regions" của docs API và trang chính sách Supported Regions (trang chính sách ghi
  "Effective November 12, 2026"); chính sách không cho dùng khi người dùng đang ở vùng không hỗ trợ, hoặc với tổ chức đặt trụ sở
  ở vùng không hỗ trợ (CT [S57]).
- **Cá nhân:** "Yes, individuals and hobbyists are welcome to use the Claude API. However… use of the API is subject to our
  Commercial Terms of Service, regardless of whether you are an individual or representing a company" (bài Help ngày 16/03/2026,
  CT [S58]). Một tóm tắt WebSearch hôm nay ghi ngược lại ("not intended for individual use") (TC [S65]) — mâu thuẫn với trang gốc.
- **Thanh toán:** prepaid credits mua trong Console (Settings → Billing, quyền Admin/Billing); hết credit thì không gọi API được;
  có auto-reload tùy chọn; credit "expire one year from the purchase date"; "All credit purchases are non-refundable"; có hóa đơn
  tháng qua Sales; đổi phương thức thanh toán bằng cách nhập thẻ mới (CT [S59]). **Tính tiền khi client hủy:** "If your client
  disconnects or times out in the middle of a request that was on track to succeed, that request is still charged" (CT [S59]).
  Loại thẻ được nhận, mức nạp tối thiểu, thuế khi mua từ Việt Nam: **không tìm thấy** trên trang đã đọc.
- **Dữ liệu:**
  - Train: "By default, we will not use your inputs or outputs from our commercial products (e.g. … Anthropic API…) to train our
    models", trừ khi khách gửi feedback/bug report hoặc chủ động cho phép (bài cập nhật 18/08/2026, CT [S56]); docs: "Retained
    data is never used for model training without your express permission" (CT [S54]).
  - Thời gian giữ: "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or
    generation", trừ dịch vụ lưu lâu hơn (ví dụ Files API), thỏa thuận ZDR, vi phạm Usage Policy, yêu cầu pháp luật (bài
    01/07/2026, CT [S55]). Docs ghi "Conversation content… is not retained by default; the exception is Covered Models, which
    require 30-day retention" (CT [S54]) — hai câu chưa khớp rõ (mục câu hỏi mở).
  - Nội dung bị hệ thống trust & safety gắn cờ: giữ input/output tới 2 năm, điểm phân loại tới 7 năm (CT [S55][S54]).
  - ZDR: "contact the Anthropic sales team"; bật theo từng organization; không áp cho Console/playground; Fable/Mythos (Covered
    Models) bắt buộc lưu 30 ngày và không có ZDR trừ khi Anthropic cho phép (CT [S54]).
- **SDK Node:** gói `@anthropic-ai/sdk`, bản `latest` **0.135.0** publish 2026-10-15T19:50:45Z (CT [S62]); hỗ trợ Node.js 20 LTS
  trở lên; `zod` là optional peer dependency `^3.25.0 || ^4.0.0` (CT [S61][S62]). Timeout mặc định 10 phút (với `max_tokens` lớn
  và không stream, timeout tính động tới 60 phút); hết giờ ném `APIConnectionTimeoutError`; "requests that time out are retried
  twice by default"; `maxRetries` mặc định 2, tự retry lỗi kết nối, 408, 409, 429, ≥ 500; chỉnh bằng
  `new Anthropic({ timeout, maxRetries })` hoặc theo từng request (CT [S61]).
- **Rate limit / spend:** tier Start / Build / Scale / Custom, tự lên tier theo lịch sử dùng; tổ chức mới có thể bắt đầu ở
  "Evaluation tier" với limit thấp hơn (CT [S60]). Spend cap tháng: Start $500, Build $1.000, Scale $200.000; chạm cap → 429
  `rate_limit_error` với `error_code: "enforced_spend_limit_reached"`, không có `retry-after`, SDK retry cũng thất bại (CT [S60]).
  Start tier cho Haiku 5.5: 1.000 RPM, 2.000.000 ITPM, 400.000 OTPM; với đa số model, token đọc từ cache không tính vào ITPM
  (CT [S60]).
- **Refusal không có fallback ở Haiku 5.5:** "Claude Haiku 5.5 has no server-side fallback"; gửi lại cùng request "usually returns
  another refusal" (CT [S40][S49]).

So sánh OpenAI cùng mục: xem OPENAI_API_RESEARCH mục 5.4 (SDK), mục 7 (rate limit), mục 9 (dữ liệu), mục 10 (Việt Nam, thanh
toán).

---

## 11. Ví dụ cấu trúc request `generate_cloze` (mục 10 — toàn bộ là SL)

Chỉ minh họa **chỗ đặt** từng phần theo docs hai bên, không phải prompt đề xuất, không phải lựa chọn model. Từ: "deploy" (verb,
B1, "triển khai"). `<…>` là chỗ để trống. Model trong ví dụ chỉ để request hợp lệ về cú pháp.

**OpenAI — `POST /v1/responses`** (tham số theo [S16][S14]):

```jsonc
{
  "model": "<model admin chọn, ví dụ gpt-6-luna>",
  // Hướng dẫn: developer-level, đứng trước dữ liệu (tốt cho cache) [S1][S15]
  "instructions": "<prompt version N: vai trò, quy tắc, cách xử lý input không hợp lệ, ví dụ bọc XML>",
  "input": [
    {
      "role": "user", // chữ không tin cậy đi qua user message [S18]
      "content": [
        { "type": "input_text",
          "text": "{\"word\":\"deploy\",\"pos\":\"verb\",\"cefr\":\"B1\",\"meaning_vi\":\"triển khai\",\"context_label\":null}" }
      ]
    }
  ],
  "text": {
    "format": {
      "type": "json_schema", "name": "cloze", "strict": true,
      "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["sentence", "accepted_answers", "translation_vi"],
        "properties": {
          "sentence": { "type": "string" },
          "accepted_answers": { "type": "array", "minItems": 1, "items": { "type": "string" } },
          "translation_vi": { "type": "string" }
        }
      }
    },
    "verbosity": "<low|medium|high — tùy model>"
  },
  "reasoning": { "effort": "<giá trị model đó cho phép, ví dụ none/low>" },
  "max_output_tokens": "<số, gồm cả reasoning token>",
  // không gửi temperature khi effort ≠ none [S5]
  "store": false,
  "safety_identifier": "<hash id người dùng>"
}
```

**Anthropic — `POST /v1/messages`**, header `x-api-key`, `anthropic-version: 2023-06-01` (tham số theo [S46][S45][S36]):

```jsonc
{
  "model": "<model admin chọn, ví dụ claude-haiku-5-5>",
  "max_tokens": "<bắt buộc, gồm cả thinking>",
  // Hướng dẫn: tham số system top-level; có thể gắn cache_control nếu đủ 512 token [S47]
  "system": [ { "type": "text", "text": "<prompt version N: vai trò, quy tắc, ví dụ trong <examples>>" } ],
  "messages": [
    {
      "role": "user",
      // dữ liệu JSON-encode [S48]; nếu có câu ngữ cảnh người học dán vào, docs Opus 5.5 gợi ý bọc <pasted_content id="..."> [S43]
      "content": "{\"word\":\"deploy\",\"pos\":\"verb\",\"cefr\":\"B1\",\"meaning_vi\":\"triển khai\",\"context_label\":null}"
    }
    // không kết thúc bằng assistant turn: prefill trả 400 trên model 4.6+ [S39]
  ],
  "output_config": {
    "effort": "<low|medium|high|xhigh|max — tùy model>",
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object", "additionalProperties": false,
        "required": ["sentence", "accepted_answers", "translation_vi"],
        "properties": {
          "sentence": { "type": "string" },
          "accepted_answers": { "type": "array", "minItems": 1, "items": { "type": "string" } },
          "translation_vi": { "type": "string" }
        }
      }
    }
  },
  "thinking": { "type": "<disabled chỉ hợp lệ với Haiku 5.5 ở effort ≤ high; Opus 5.5 trả 400>" },
  // không gửi temperature/top_p/top_k khác mặc định [S46]
  "metadata": { "user_id": "<hash id người dùng>" }
}
```

Đọc kết quả (SL, theo docs): OpenAI — kiểm `status`, phần content `refusal`, rồi `output_parsed`/`output_text`; Anthropic — kiểm
`stop_reason` (`end_turn`, `refusal`, `max_tokens`), đọc khối `text` theo `type` vì response có thể bắt đầu bằng khối `thinking`
rỗng [S34][S43].

---

## Câu hỏi còn mở / trang không đọc được

Trang không đọc được hoặc không kiểm được:

- Reference "Chat Completions — Create" của OpenAI (bản `.md` trả 404 ở cả hai đường dẫn thử) — chưa xác minh tham số `stop` và
  các tham số khác của Chat Completions.
- Claude Console (cần đăng nhập) — chưa xác minh Console hiện có công cụ prompt generator/improver, lưu version prompt hay
  evaluation tool không (docs chỉ còn nhắc "playground").

Câu hỏi chưa trả lời được bằng nguồn hôm nay:

1. OpenAI không có hướng dẫn prompting riêng cho `gpt-6-luna`; hướng dẫn "small model" của `gpt-5.4-mini/nano` có áp cho Luna
   không — không có nguồn.
2. `claude-haiku-4-5` có mốc retirement "Not sooner than October 15, 2026" đã qua nhưng bảng vẫn ghi Active, chưa có thông báo
   deprecation — ngày ngừng thực tế chưa biết.
3. Dữ liệu Anthropic API: docs ghi "Conversation content… is not retained by default", bài Privacy Center ghi tự xóa "within 30
   days" — mặc định thực tế có lưu tới 30 ngày hay không?
4. Thanh toán Anthropic: loại thẻ được nhận (thẻ prepaid?), mức nạp tối thiểu, VAT/thuế khi mua từ Việt Nam.
5. Trang chính sách Supported Regions của Anthropic ghi "Effective November 12, 2026" (ngày trong tương lai) — chưa thấy bản đang
   hiệu lực hôm nay ở trang riêng; danh sách trong docs API hôm nay cũng có Việt Nam.
6. Khối `untrusted_text` trong Model Spec của OpenAI có tương ứng với content type nào trong API không (không tìm thấy trong
   docs API).
7. `pattern` để ràng buộc "đúng một `___`" có được cả hai API chấp nhận và có làm chậm/lỗi biên dịch grammar không — chưa thử.
8. Cách đặt chữ người học (message `user` bọc JSON/XML kiểu OpenAI, so với JSON-encode/`<pasted_content>`/`tool_result` kiểu
   Anthropic) chống injection tốt tới đâu với dữ liệu Wordmet — chưa đo.
9. Latency thực tế trong deadline 10 s: Anthropic chỉ ghi Haiku 5.5 "Fastest" (so tương đối), không có số; độ trễ biên dịch grammar
   lần đầu của cả hai bên không có số; với thinking bật sẵn trên Haiku 5.5, số thinking token ở effort `low` chưa đo.
10. Haiku 5.5 với Structured Outputs và `max_tokens` nhỏ: tỉ lệ dừng ở `max_tokens` sau khối thinking — docs chỉ cảnh báo, không
    có số (trang Sonnet 5.5 có cảnh báo tương tự cho `low`/`medium`).
11. Chất lượng tiếng Việt của từng model cho ba operation — không có số chính thức ở cả hai provider (xem thêm OPENAI_API_RESEARCH
    mục 14); chỉ đo được bằng bộ thử riêng.
12. Một prompt text giống hệt nhau cho cả hai provider cho chất lượng chênh nhau bao nhiêu — không provider nào công bố; cả hai
    đều bảo đo bằng eval riêng.

---

## Nguồn

OpenAI

- [S1] Prompt engineering — https://developers.openai.com/api/docs/guides/prompt-engineering (CT)
- [S2] Prompting — https://developers.openai.com/api/docs/guides/prompting (CT)
- [S3] Migrate from prompt objects — https://developers.openai.com/api/docs/guides/prompting/migrate-from-prompt-object (CT)
- [S4] Deprecations (Reusable prompts, Evals platform, Agent Builder — 03/06/2026) — https://developers.openai.com/api/docs/deprecations (CT)
- [S5] Using GPT-6 (latest model guide) — https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra (cùng nội dung: https://developers.openai.com/api/docs/guides/latest-model) (CT)
- [S6] Using GPT-5.6 — https://developers.openai.com/api/docs/guides/latest-model/gpt-5.6 (CT)
- [S7] Prompting guidance for GPT-5.6 Sol — https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6 (CT)
- [S8] Using GPT-5.5 — https://developers.openai.com/api/docs/guides/latest-model/gpt-5.5 (CT)
- [S9] Using GPT-5.4 (mục "Small-model guidance for gpt-5.4-mini and gpt-5.4-nano") — https://developers.openai.com/api/docs/guides/latest-model/gpt-5.4 (CT)
- [S10] Using GPT-5 (mục "Minimal reasoning") — https://developers.openai.com/api/docs/guides/latest-model/gpt-5 (CT)
- [S11] Using GPT-4.1 — https://developers.openai.com/api/docs/guides/latest-model/gpt-4.1 (CT)
- [S12] Reasoning best practices — https://developers.openai.com/api/docs/guides/reasoning-best-practices (CT)
- [S13] Reasoning models — https://developers.openai.com/api/docs/guides/reasoning (CT)
- [S14] Structured model outputs — https://developers.openai.com/api/docs/guides/structured-outputs (CT)
- [S15] Prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching (CT)
- [S16] Responses — Create (reference) — https://developers.openai.com/api/reference/resources/responses/methods/create (CT)
- [S17] Safety best practices — https://developers.openai.com/api/docs/guides/safety-best-practices (CT)
- [S18] Safety in building agents (Agent Builder) — https://developers.openai.com/api/docs/guides/agent-builder-safety (CT)
- [S19] OpenAI Model Spec, bản 2026-08-18 (mục "Ignore untrusted data by default", "The chain of command") — https://model-spec.openai.com/2026-08-18.html (CT)
- [S20] Working with evals — https://developers.openai.com/api/docs/guides/evals ; Getting started with datasets — https://developers.openai.com/api/docs/guides/evaluation-getting-started ; Prompt optimizer — https://developers.openai.com/api/docs/guides/prompt-optimizer ; Evaluate external models — https://developers.openai.com/api/docs/guides/external-models (CT)
- [S21] Get started with Promptfoo — https://developers.openai.com/api/docs/guides/promptfoo-codex (CT)
- [S22] Prompt generation — https://developers.openai.com/api/docs/guides/prompt-generation (CT)
- [S23] GPT-6 Luna (model page) — https://developers.openai.com/api/docs/models/gpt-6-luna ; Pricing — https://developers.openai.com/api/docs/pricing (CT)
- [S24] `docs/preparation/OPENAI_API_RESEARCH_2026-10-19.md` (repo; tổng hợp trang OpenAI đọc ngày 19/10/2026 — nhãn gốc CT trong file đó)
- [S25] Docs index và bản gộp (tìm `untrusted_text`, `prefill`, stop sequences ở "Production best practices") — https://developers.openai.com/api/docs/llms.txt , https://developers.openai.com/api/llms-full.txt ; Cookbook index — https://developers.openai.com/cookbook/llms.txt (CT)

Anthropic

- [S30] Models overview — https://platform.claude.com/docs/en/models/overview (CT)
- [S31] Pricing — https://platform.claude.com/docs/en/about-claude/pricing ; https://claude.com/pricing (CT)
- [S32] Model deprecations — https://platform.claude.com/docs/en/about-claude/model-deprecations (CT)
- [S33] Claude Haiku 5.5 — https://platform.claude.com/docs/en/models/haiku-5-5/overview (CT)
- [S34] Claude Haiku 5.5 migration guide — https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide (CT)
- [S35] Claude Haiku 4.5 — https://platform.claude.com/docs/en/models/haiku-4-5/overview ; Claude Sonnet 5.5 — https://platform.claude.com/docs/en/models/sonnet-5-5/overview ; Claude Opus 5.5 — https://platform.claude.com/docs/en/models/opus-5-5/overview (CT)
- [S36] Thinking (Overview, "Configuring thinking", "Turning thinking off", danh sách model có thể từ chối `reasoning_extraction`) — https://platform.claude.com/docs/en/build-with-claude/thinking (CT)
- [S37] Effort — https://platform.claude.com/docs/en/build-with-claude/effort (CT)
- [S38] Prompt engineering overview — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview (CT)
- [S39] Prompting best practices (đích redirect của các trang con cũ) — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (CT)
- [S40] Prompting Claude Haiku 5.5 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5 (CT)
- [S41] Prompting Claude Sonnet 5.5 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5 (CT)
- [S42] Prompting Claude Sonnet 5 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5 ; Prompting Claude Opus 4.8 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8 (CT)
- [S43] Prompting Claude Opus 5.5 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5 (CT)
- [S44] Prompting Claude Fable 5 — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5 (CT)
- [S45] Structured outputs — https://platform.claude.com/docs/en/build-with-claude/structured-outputs (CT)
- [S46] Messages — Create (reference) — https://platform.claude.com/docs/en/api/messages/create (CT)
- [S47] Prompt caching — https://platform.claude.com/docs/en/build-with-claude/prompt-caching (CT)
- [S48] Mitigate jailbreaks and prompt injections — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks (CT)
- [S49] Refusals and fallback — https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback (CT)
- [S50] Mid-conversation system messages and tool changes — https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages (CT)
- [S51] OpenAI SDK compatibility — https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk (CT)
- [S52] Define success and build evaluations (đích redirect của `test-and-evaluate/eval-tool`) — https://platform.claude.com/docs/en/test-and-evaluate/develop-tests (CT)
- [S53] Bản gộp docs (playground, "legacy Workbench") — https://platform.claude.com/llms-full.txt ; Docs index — https://platform.claude.com/llms.txt ; Create Agent (Beta) — https://platform.claude.com/docs/en/api/beta/agents/create (CT)
- [S54] API and data retention — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention (CT)
- [S55] Privacy Center: How long do you store my organization's data? (01/07/2026) — https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data (CT)
- [S56] Privacy Center: Is my data used for model training? (18/08/2026) — https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training (CT)
- [S57] Supported regions (docs) — https://platform.claude.com/docs/en/api/supported-regions ; Supported Regions Policy — https://www.anthropic.com/legal/supported-regions (từ https://www.anthropic.com/supported-countries) (CT)
- [S58] Help: Can I use the Claude API for individual use? (16/03/2026) — https://support.claude.com/en/articles/8987200-can-i-use-the-claude-api-for-individual-use (CT)
- [S59] Help: How do I pay for my Claude API usage? — https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage (CT)
- [S60] Rate limits (spend caps, tiers) — https://platform.claude.com/docs/en/api/rate-limits (CT)
- [S61] TypeScript SDK — https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript (CT)
- [S62] npm registry, gói `@anthropic-ai/sdk` — https://registry.npmjs.org/@anthropic-ai/sdk (CT — gói chính thức do Anthropic phát hành)
- [S63] Reducing latency — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency ; Increase output consistency — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency (CT; đọc lướt, không trích trong bài)

Bên thứ ba

- [S64] Promptfoo docs, provider Anthropic — https://www.promptfoo.dev/docs/providers/anthropic/ (TC)
- [S65] Kết quả WebSearch ngày 19/10/2026 cho truy vấn về "Claude API individual use" (tóm tắt của công cụ tìm kiếm, mâu thuẫn với [S58]) (TC)
