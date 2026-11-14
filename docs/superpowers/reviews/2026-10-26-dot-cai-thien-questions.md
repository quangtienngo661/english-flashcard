# Đợt cải thiện sau giao diện người học: bộ câu hỏi cho chủ dự án (26/10/2026)

Đợt này chọn từ danh sách C1–C17 trong [`IMPROVEMENT_IDEAS_2026-10-23.md`](../../preparation/IMPROVEMENT_IDEAS_2026-10-23.md). Chủ dự án muốn trả lời
**một lượt** (26/10/2026), nên mọi câu hỏi nằm trong file này. Nguồn cho phần AI: [`AI_EVAL_DASHBOARD_2026-10-24.md`](../../preparation/AI_EVAL_DASHBOARD_2026-10-24.md) (C11),
[`AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md`](../../preparation/AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md) (C12).

**Cách trả lời (chủ dự án, 26/10/2026: "đợt này bạn cho mình recommendation vào mỗi câu kèm giải thích và trade-off, mình sẽ confirm trong file")**
- Mỗi câu có **Đề xuất của Claude** (chọn gì, vì sao, đánh đổi gì). Các hướng khác vẫn liệt kê trong câu để bạn chọn lại nếu muốn.
- Đồng ý thì ghi **ok** dưới dòng **Trả lời:**; khác thì ghi hướng của bạn ("b", "ok, nhưng…").
- Con số ghi `ASSUMPTION` là điểm bắt đầu để bàn, chưa đo.
- Trả lời xong: Claude ghi decision record (ai chốt, phương án nào), rồi trình bày design từng phần.

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, gói Pro, nhóm "IT" có 40 từ, đang học `deploy`.

---

## 0. Đã có từ trước, không hỏi lại

| Điều | Nguồn |
|---|---|
| Danh sách C1–C17 là đề xuất, chưa mục nào chốt; mục được chọn đi brainstorm → design → decision record → plan | `IMPROVEMENT_IDEAS` |
| Chưa gọi nhà cung cấp AI thật lần nào; bộ ví dụ eval hiện chỉ kiểm khuôn, thời gian, chi phí, không chặn gì | D19 Bước 6, D3 Bước 7, D18 Bước 6 |
| Lưu prompt là có hiệu lực ngay; không có phiên bản để bật / tắt; có lịch sử tự ghi | D15 Bước 6 |
| Trần lời gọi mỗi ngày đếm **mọi** lời gọi (cả `test`, `eval`); vượt thì AI của người học tạm tắt tới 0 giờ | D24 Bước 6 |
| Chỉ người học bấm mới đổi mức của từ; "Cần ôn lại" về ngăn 1 và lên đầu | D16 Bước 3 |
| Đã biết (trong Luyện tập) chỉ hiện khi trả lời đúng, không dùng gợi ý **và** từ đang đến hạn | `practice-review.service.ts` (`known-not-allowed`) |
| Gói Miễn phí không có bài điền từ nào; "Câu lấy từ đâu?" do chủ dự án bỏ khỏi Tùy chỉnh phiên | D11 Bước 7, D10 giao diện người học |
| API không chặn tài khoản chưa xác nhận email (đăng nhập, học đều được); chưa xác nhận thì không nhận email nhắc học | `identity`, `/v1/me.email_verified` |
| `baseURL` của hai AI adapter viết cứng có chủ ý; shell Claude Code trên máy này có đặt `ANTHROPIC_BASE_URL` (kiểm 26/10/2026) | plan review #6 Bước 6 |
| Giao diện admin hiện tại là tạm, sẽ làm lại cả khối; giữ lớp session / API khi làm lại | ghi chú chủ dự án 15/10/2026 |

---

## Phần 1 — Cách làm và phạm vi

### Câu 1. Luật hỏi ở đợt này

Bước 3–7 giữ luật "chủ dự án trả lời trước, Claude đề xuất sau".

Các hướng: (a) giữ · (b) bỏ: Claude đề xuất trước mọi câu · (c) giữ cho câu sản phẩm, Claude đề xuất trước cho câu kỹ thuật · (d) khác.

**Trả lời:** b (chủ dự án, chat 26/10/2026). Claude đề xuất trước mọi câu; bạn confirm trong file.

### Câu 2. Mục nào vào đợt này

Nhóm (để gọi tên): **A** giao diện người học (C13, C14, C15, C16, C2, C1, C3) · **B** chất lượng AI (C10 / C11-E1, C11, C12) · **C** cấu hình AI (C17) ·
**D** sản phẩm và chi phí (C4, C5) · còn lại C6–C9, P1–P5.

**Đề xuất của Claude:** đợt này gồm **A trọn** (C13, C14, C15, C16 gộp C2, C1, C3) và **B phần nền** (xem câu 15). C17 chỉ vào đợt khi câu 26.1 có mục đích
cụ thể. **Để sau:** C4, C5 (cần số chi phí thật từ E1 trước), C6–C9.
- *Vì sao:* A rẻ, chỉ sửa web, người học thấy ngay mỗi ngày, và đều là góp ý của chính bạn khi dùng thử. B là hướng bạn muốn đi, nhưng mọi phần của B dựa
  trên dữ liệu thật, nên đợt này chỉ làm phần không cần người dùng thật. C4, C5 là quyết định tiền: chưa biết một câu AI tốn bao nhiêu thì chưa đặt được con số.
- *Trade-off:* gói Miễn phí vẫn chưa thấy câu AI (điểm khác biệt nằm sau Pro, §1.3 của `IMPROVEMENT_IDEAS`); đợt vẫn chưa có người học thật (P1).

**Trả lời:** OK

### Câu 3. Một design hay nhiều design

Các hướng: (a) một design cho cả đợt, một plan · (b) mỗi nhóm một design, plan và chuỗi PR riêng · (c) gộp A + C, B riêng, D riêng · (d) khác.

**Đề xuất của Claude:** (b). **A** một design nhẹ (chủ yếu bảng When → Then cho từng màn), **B** một design riêng. C17 nếu làm thì là thay đổi nhỏ, chốt bằng
một đoạn design ngắn trong design B. Thứ tự: **E1 chạy ngay** (không cần code, chỉ bạn làm được); trong lúc đó Claude viết design và làm A; design B viết **sau**
khi có kết quả E1.
- *Vì sao:* A và B không đụng nhau (web người học / API + admin), tách ra thì A xong và merge được sớm, không chờ B. Design B viết trước E1 là đoán tiêu chí chấm.
- *Trade-off:* hai decision record, hai plan; phải theo dõi hai mạch cùng lúc.

**Trả lời:** OK, cái này chắc sẽ chia ra rồi cho các phiên làm song song nếu không có xung đột

### Câu 4. Lần gọi AI thật đầu tiên (C10, C11-E1)

Cần key của bạn và tốn ít tiền thật. Đã có: `ai_eval_examples` (tối đa 100 ví dụ mỗi thao tác), nút chạy eval ở worker, công tắc AI, trần lời gọi mỗi ngày.

4.1 Khi nào: (a) trước đợt · (b) task đầu của nhóm B · (c) sau đợt.
4.2 Nhà cung cấp: (a) OpenAI · (b) Anthropic · (c) cả hai.
4.3 Ngân sách tối đa (USD).
4.4 Ai soạn ví dụ: (a) bạn (như D18 Bước 6) · (b) Claude soạn, bạn duyệt · (c) khác.
4.5 Ai đọc tay và ghi lỗi: (a) bạn · (b) Claude đọc trước, bạn xem lại · (c) khác.

**Đề xuất của Claude:**
- 4.1 **(a)**: chạy bằng hệ thống có sẵn (thêm model, chọn model, thêm ví dụ, bấm chạy eval), không cần code mới. Kết quả là đầu vào của design B.
- 4.2 **(c)**, mỗi bên một model rẻ và một model mạnh hơn, chọn theo bảng giá lúc chạy. *Vì sao:* câu 19.3 đề xuất judge khác nhà cung cấp với model sinh câu,
  nên cần biết cả hai bên chạy được với prompt hiện tại. *Trade-off:* hai key, hai hoá đơn.
- 4.3 **10 USD**, và đặt trần lời gọi ngày hôm đó đủ cho lần chạy (`ASSUMPTION`: khoảng 15 ví dụ × 6 thao tác × 4 model ≈ 360 lời gọi, mỗi lời gọi vài nghìn
  token, ước tổng dưới 10 USD; chưa đo).
- 4.4 **(b)**, và bạn tự thêm 3–5 ví dụ của mình cho mỗi thao tác. *Vì sao:* Claude soạn nhanh và phủ được ca khó (dạng bất quy tắc `go → went`, từ nhiều nghĩa,
  câu có hai đáp án tiềm năng); ví dụ của bạn kéo bộ ví dụ về các từ người học thật sẽ gặp. *Trade-off:* đổi "chủ dự án tự soạn" của D18; ví dụ Claude soạn
  có thể lệch theo cách Claude nghĩ.
- 4.5 **(a), Claude đọc song song sau bạn.** *Vì sao:* đọc đầu ra và ghi lỗi (error analysis) là phần cốt lõi của eval bạn vừa học, và bạn là người chấm
  tiếng Việt tự nhiên; tiêu chí của judge sẽ rút từ chính danh sách lỗi này. *Trade-off:* tốn thời gian của bạn (`ASSUMPTION`: 1–2 giờ).

**Trả lời:** Chỗ này mình đang dự định implement UI cho admin rồi mình sẽ test trực tiếp trên đó luôn

---

## Phần 2 — Giao diện người học (nhóm A)

### Câu 5. C13 — Thứ tự trang sau khi đăng ký (pass, theo đề xuất mới)

Hiện: đăng ký → `/app/verify-email` (nhập mã 6 số) → `/app/welcome` (chọn ngôn ngữ) → Hôm nay. Mã gửi qua email ngay lúc đăng ký.

Các hướng: (a) đăng ký → chọn ngôn ngữ → Hôm nay; trang nhập mã chỉ mở khi bấm lời nhắc · (b) đăng ký → chọn ngôn ngữ → trang nhập mã (có "Để sau") →
Hôm nay · (c) khác.

**Đề xuất của Claude:** (a). Mã vẫn gửi lúc đăng ký như hiện nay; trang nhập mã giữ nguyên, có nút "Gửi lại mã".
- *Vì sao:* đúng ý bạn (bớt một bước chặn), và API đã cho tài khoản chưa xác nhận dùng app bình thường, nên chỉ sửa web.
- *Trade-off:* ít người xác nhận hơn → ít người nhận email nhắc học; người gõ sai email sẽ không biết cho tới khi cần quên mật khẩu (lời nhắc ở câu 6 bớt rủi ro này).
  Mã gửi lúc đăng ký có hạn, nên người bấm lời nhắc vài ngày sau phải bấm "Gửi lại mã".

**Trả lời:** 

### Câu 6. C13 — Lời nhắc xác nhận email (pass, theo đề xuất mới)

6.1 Hiện ở đâu: (a) dải trên mọi trang · (b) chỉ Hôm nay · (c) Hôm nay + Cài đặt · (d) khác.
6.2 Đóng được không: (a) không · (b) đóng được, hiện lại lần mở app sau · (c) đóng hẳn.
6.3 Trong lời nhắc có gì: nhập mã tại chỗ, hay nút sang trang nhập mã; "Gửi lại mã"?

**Đề xuất của Claude:**
- 6.1 **(a)**: một dải mỏng trên mọi trang có khung app, **trừ** phiên ôn và phiên luyện toàn màn. Cài đặt vẫn giữ dòng "chưa xác nhận" như hiện nay.
- 6.2 **(b)**: có nút ×; đóng thì ẩn tới lần mở app sau. *Vì sao:* (a) gây khó chịu khi người học cố ý để sau; (c) dễ quên hẳn.
- 6.3 Dải ghi email đang dùng + nút **[Nhập mã]** sang trang nhập mã có sẵn (trang đó có "Gửi lại mã"). *Vì sao:* dùng lại màn đã có test; nhập mã ngay trên dải
  phải làm lại ô 6 số và các trạng thái lỗi. *Trade-off:* thêm một lần chuyển trang.

**Trả lời:**

### Câu 7. C13 — Tài khoản chưa xác nhận lâu ngày (pass, theo đề xuất mới)

Hiện không bị giới hạn gì ngoài không nhận email nhắc học.

Các hướng: (a) giữ như hiện nay · (b) giới hạn sau N ngày · (c) khác.

**Đề xuất của Claude:** (a), xem lại trước launch.
- *Vì sao:* chưa có người dùng; giới hạn kéo theo sửa API, thêm trường hợp lỗi cho mọi màn.
- *Trade-off:* tài khoản rác (email không có thật) không bị chặn; ghi vào `deploy-checklist.md` để xét lúc chuẩn bị launch.

**Trả lời:**

**Đề xuất mới:** mình quyết định đổi design lại để bắt buộc nhập OTP xác thực trước rồi mới cho access lại app

### Câu 8. C14 — Ô trong trang nhóm

Hiện trang nhóm chỉ lọc theo Tất cả / Đang ưu tiên / Đến hạn / Mới / từng ngăn; thêm từ qua tấm Thêm từ (phím N) rồi chọn nhóm.

8.1 Ô dùng để: (a) tìm trong kho từ để thêm · (b) tìm trong các từ đã có của nhóm · (c) cả hai · (d) khác.
8.2 Lan gõ "rizz" (chưa có trong Wordmet): (a) mở tấm Thêm từ, nhóm chọn sẵn "IT" · (b) chỉ báo không có · (c) khác.
8.3 Có cần "Thêm cả loạt" (tick nhiều nghĩa) trong ô này không?

**Đề xuất của Claude:**
- 8.1 **(a), một ô**, đặt trên danh sách từ. Gõ → các nghĩa trong kho, mỗi nghĩa nút **[+]**; nghĩa đã có trong nhóm hiện "Đã có trong nhóm" thay cho nút.
  *Vì sao:* đúng việc bạn nêu (thêm ngay trong nhóm); nhãn "Đã có" trả lời luôn câu "nhóm có từ này chưa" mà không cần ô lọc thứ hai.
  *Trade-off:* không lọc được danh sách từ của nhóm theo chữ; nhóm vài trăm từ thì vẫn phải cuộn.
- 8.2 **(a)**: dòng "Wordmet chưa có “rizz”" + nút mở tấm Thêm từ với chữ đã gõ và nhóm "IT" chọn sẵn (có Tra bằng AI / Tự nhập nghĩa như M5b).
  *Vì sao:* dùng lại tấm Thêm từ, không làm luồng thứ hai.
- 8.3 **Không** trong đợt này. *Vì sao:* trang Tra từ đã có; thêm từng nghĩa bằng [+] đủ cho việc "gặp từ nào thêm từ đó".

**Trả lời:** Mình muốn thiết kế theo kiểu: có một button thêm từ vào nhóm, rồi nó sẽ hiện modal và chọn từ cần thêm, bằng cách search từ,....

### Câu 9. C15 — Bỏ chữ "trước"

Hiện: "Ngăn thấp trước", "Quá hạn lâu nhất trước", "Từ mới trước", "Lâu chưa luyện trước", "Sai nhiều nhất trước", "Ưu tiên, đến hạn, rồi từ mới",
"Bấm Cần ôn lại lâu nhất trước", "Ngẫu nhiên". Tiếng Anh: "Lowest stage first", "Most overdue first", … "Oldest Still learning first".

**Đề xuất của Claude:** bỏ "trước" ở mọi dòng, giữ phần còn lại: "Ngăn thấp", "Quá hạn lâu nhất", "Từ mới", "Lâu chưa luyện", "Sai nhiều nhất"; dòng 8 xem
câu 10. Tiếng Anh bỏ "first" tương ứng ("Lowest stage", "Most overdue", "New words", "Least practiced", "Most missed").
- *Vì sao:* tiêu đề "Thứ tự" đã nói ý "xếp lên trước"; hai bản giữ cùng cách viết.
- *Trade-off:* đứng một mình (ở dòng tóm tắt "Thứ tự: Từ mới") hơi giống tên bộ lọc hơn tên thứ tự; dòng tóm tắt đã có chữ "Thứ tự:" nên vẫn đọc được.

**Trả lời:** OK

### Câu 10. C15 — "Bấm Cần ôn lại lâu nhất trước"

Nghĩa: trong các từ đang ưu tiên, từ Lan bấm Cần ôn lại **cách đây lâu nhất** ra trước (bấm `deploy` thứ Hai, `merge` hôm qua → `deploy` trước). Thẻ "Đang ưu
tiên" ở trang Luyện tập: "Từ bạn đã bấm Cần ôn lại, bấm lâu nhất trước."

10.1 Giữ cách sắp, chỉ đổi chữ; hay đổi cách sắp; hay bỏ lựa chọn này?
10.2 Chữ mới.

**Đề xuất của Claude:**
- 10.1 **Giữ cách sắp, đổi chữ.** *Vì sao:* từ chờ lâu nhất là từ dễ quên nhất; cách sắp đúng, chỉ chữ khó hiểu.
- 10.2 Lựa chọn thứ tự: **"Chờ ôn lâu nhất"** (en "Waiting longest"). Thẻ Đang ưu tiên: **"Từ bạn đã bấm Cần ôn lại. Từ chờ lâu nhất ra trước."**
  (en "Words you marked Still learning. The longest-waiting come first.").
  *Trade-off:* "chờ ôn" là cách nói mới, chưa xuất hiện ở chỗ khác trong app.

**Trả lời:** archived, xử lý sau

### Câu 11. C16 — Sau khi trả lời một câu Luyện tập

Hiện có ba nút: **Cần ôn lại** (1) · **Đã biết** (2, chỉ khi được phép) · **Câu tiếp** (Enter, không đổi lịch ôn).

**Đề xuất của Claude:** sau mỗi câu chỉ còn **hai nút**: Cần ôn lại, và một **nút chính** (Enter) mà chữ đổi theo trường hợp. Không có tùy chọn giữ cách cũ (11.1).

| # | Trường hợp | Nút | Enter | Lịch ôn |
|---|---|---|---|---|
| 1 | Đúng, không gợi ý, `deploy` đang đến hạn | [Cần ôn lại] · **[Đã biết]** | Đã biết | Đã biết: lên ngăn như hiện nay |
| 2 | Đúng, không gợi ý, `deploy` chưa đến hạn | [Cần ôn lại] · **[Câu tiếp]** | Câu tiếp | không đổi |
| 3 | Đúng nhờ gợi ý | [Cần ôn lại] · **[Câu tiếp]** | Câu tiếp | không đổi |
| 4 | Sai, hoặc Xem đáp án | **[Cần ôn lại]** · [Câu tiếp] | Cần ôn lại | Cần ôn lại: về ngăn 1, lên đầu |

- *Vì sao:* đúng ý bạn ở trường hợp 1 (mặc định Đã biết, cần thì bấm Cần ôn lại). Trường hợp 2–3 API không cho Đã biết (từ chưa đến hạn, hoặc đúng nhờ gợi ý),
  nên nút chính phải là "sang câu không đổi lịch". Trường hợp 4 là C2 với mặc định "có". **D16 vẫn giữ**: lịch chỉ đổi khi người học bấm (hoặc nhấn Enter trên
  nút ghi rõ "Đã biết" / "Cần ôn lại"); cái bỏ đi là lối "Câu tiếp" trung tính ở trường hợp 1.
- *Trade-off:* nhấn Enter liên tục để đi nhanh sẽ đổi lịch ôn ở mọi câu trường hợp 1 và 4 (ví dụ gõ nhầm một chữ → `deploy` về ngăn 1); chữ của nút chính đổi
  theo câu, người học phải nhìn trước khi nhấn. Ghi chú dưới nút (`noteWrong`, `noteRight`…) phải viết lại theo bảng này.

**Trả lời:** OK

### Câu 12. C2 — Gộp với C16?

Các hướng: (a) gộp, chốt chung ở câu 11 · (b) C2 riêng · (c) không làm C2.

**Đề xuất của Claude:** (a). Trường hợp 4 của câu 11 chính là C2 (trả lời sai thì mặc định Cần ôn lại).
- *Vì sao:* cùng một màn, cùng D16; làm riêng thì sửa màn này hai lần.
- *Trade-off:* không có cài đặt "tự đưa vào ưu tiên" chạy ngầm; người học vẫn phải nhấn (Enter là đủ).

**Trả lời:** OK

### Câu 13. C1 — Nút loa

Giọng đọc có sẵn của trình duyệt (`speechSynthesis`): không tốn tiền, không gọi mạng, giọng tùy máy.

13.1 Đặt ở đâu · 13.2 Đọc gì · 13.3 Giọng (Mỹ / Anh / người học chọn) · 13.4 Máy không có giọng tiếng Anh (ẩn / mờ kèm giải thích).

**Đề xuất của Claude:**
- 13.1 Trang từ (cạnh từ, và cạnh mỗi câu ví dụ / câu đã gặp), mặt có từ tiếng Anh của thẻ ôn, kết quả sau khi trả lời một câu luyện tập.
- 13.2 Ở trang từ: từ và từng câu; ở thẻ ôn và kết quả luyện: chỉ từ. *Vì sao:* trước khi trả lời, đọc từ hay câu đầy đủ là lộ đáp án, nên loa ở Luyện tập chỉ
  hiện sau khi chấm.
- 13.3 **Mỹ** (`en-US`), máy không có thì lấy giọng tiếng Anh bất kỳ; chưa có cài đặt chọn giọng. *Trade-off:* người học theo giọng Anh chưa chọn được.
- 13.4 **Ẩn nút.** *Trade-off:* người học không biết vì sao máy khác có loa còn máy mình không.
- Rủi ro: chất lượng và danh sách giọng khác nhau giữa Windows, Android, iOS (`ASSUMPTION`, phải thử trên máy thật); e2e chỉ kiểm được nút gọi đúng hàm.

**Trả lời:** 13.3: có thể làm 2 giọng Anh và Mỹ không, còn lại ok

### Câu 14. C3 — "Điền từ từ câu bạn đã lưu"

API Bước 7 có sẵn (`cloze_source: own`, không tốn AI). Bạn đã bỏ "Câu lấy từ đâu?" ở D10 giao diện người học; D11 Bước 7: Miễn phí không có bài điền từ nào.

14.1 Gói nào: (a) mọi gói · (b) giữ Dùng thử / Pro.
14.2 Đường vào: (a) một lựa chọn trong Tùy chỉnh phiên · (b) nút trên trang từ có câu đã lưu · (c) khác.

**Đề xuất của Claude:**
- 14.1 **(a)**. *Vì sao:* không tốn AI; cho người học Miễn phí lý do để lưu câu đã gặp; là kiểu câu cá nhân duy nhất không cần AI. *Trade-off:* đổi D11 Bước 7
  (cần sửa luật gói ở API, không chỉ giao diện); bớt một điểm khác biệt của Pro (nhỏ, vì câu AI vẫn là của Pro).
- 14.2 **(a)**, nhưng không đưa lại "Câu lấy từ đâu?": thêm một công tắc **"Điền từ vào câu bạn đã lưu"** cạnh công tắc "Kiểu câu có AI", chỉ hiện khi người
  học có ít nhất một câu đã lưu trong phạm vi phiên. *Vì sao:* giữ bố cục bạn chốt ở D10 (công tắc, không có ô chọn nguồn). *Trade-off:* hai công tắc cạnh
  nhau, phải ghi rõ cái nào tốn lượt AI.

**Trả lời:** giải thích chỗ này

---

## Phần 3 — Chất lượng AI (nhóm B: C11, C12)

### Câu 15. Đợt này đi tới đâu

Các phần, theo thứ tự phụ thuộc: E1 gọi thật → E2 ví dụ có tiêu chí → E3 chấm bằng luật → judge + bộ nhãn người → so lần chạy và cổng khi publish →
vòng đời prompt (nháp, canary, rollback) → online eval → dashboard → màn admin.

**Đề xuất của Claude:** đợt này làm **E1 → E2 → E3 → judge chạy trong eval (offline) + bộ nhãn người → so hai lần chạy (có cảnh báo) → vòng đời prompt tối
thiểu (bản nháp tách khỏi bản đang chạy, publish, rollback một cú bấm) → dashboard phần sức khoẻ, chi phí và tỉ lệ bị luật loại → màn admin cho các phần trên.**
Để sau launch: canary, online eval, judge trong `prepare`, cảnh báo qua email.
- *Vì sao:* mọi phần để sau đều cần người học thật mới có ý nghĩa (canary so hai bản trên traffic thật; online eval chấm câu đã gửi người học). Phần làm ngay
  dùng được với bộ ví dụ và với bạn là người dùng duy nhất.
- *Trade-off:* chất lượng câu AI thực tế sau launch chỉ thấy qua báo lỗi cho tới khi có online eval. Tỉ lệ bị luật loại lần đầu hiện chỉ có trong log (G-D1),
  muốn có số thì phải thêm một cột hoặc bảng đếm (thay đổi DB nhỏ).

**Trả lời:** nếu gọi thật thì viết postman json giúp mình để mình test trên đó, làm đầy đủ endpoint cho mỗi ai provider luôn, viết doc readme để mình nắm sơ cách test, nhưng phần còn lại làm luôn thì sao?

### Câu 16. Prompt nằm ở đâu

Các hướng: (a) giữ trong admin, thêm vòng đời · (b) file trong repo, đổi qua PR và CI · (c) repo là nguồn, admin chỉ publish / rollback · (d) khác.

**Đề xuất của Claude:** (a).
- *Vì sao:* đúng ý gốc của bạn (theo dõi và sửa prompt trên UI, không cần deploy); hệ thống hiện tại đã lưu prompt và lịch sử trong DB, chỉ thêm trạng thái
  "nháp / đang chạy". (b) và (c) bắt mỗi lần sửa chữ phải qua PR, CI và deploy.
- *Trade-off:* lịch sử prompt nằm trong DB, không trong git; backup DB là backup prompt. Đổi D15 Bước 6 (có phiên bản: lưu ≠ bật).

**Trả lời:** ok, nhưng có thể test prompt, eval + judge trong admin luôn không

### Câu 17. Cổng eval khi publish prompt mới

17.1 (a) chặn khi điểm thấp hơn bản đang chạy quá ngưỡng · (b) chỉ cảnh báo · (c) không có cổng.
17.2 Ngưỡng · 17.3 Đổi model có đi qua cùng cổng không.

**Đề xuất của Claude:**
- 17.1 **(b) cảnh báo**, và publish **bắt buộc có một lần chạy eval** của chính bản đó (ít nhất một lần, kết quả hiện cạnh nút Publish).
  *Vì sao:* judge chưa được hiệu chỉnh thì điểm của nó chưa đủ tin để chặn; nhưng publish mà không chạy eval lần nào là đúng lỗ hổng C12 muốn bịt.
  *Trade-off:* đổi D18 Bước 6 (eval không còn hoàn toàn tùy chọn); vẫn publish được bản tệ hơn nếu admin bỏ qua cảnh báo.
- 17.2 Cảnh báo khi tỉ lệ đạt của một tiêu chí giảm quá **5 điểm %** (`ASSUMPTION`), hoặc có ví dụ trước đạt nay trượt (liệt kê từng ví dụ).
- 17.3 **Có**, cùng kiểu cảnh báo. *Vì sao:* đổi model làm chất lượng đổi mạnh không kém đổi prompt.

**Trả lời:** ok

### Câu 18. Bật dần (canary)

18.1 (a) có · (b) không · (c) khác. 18.2 x% và ai mở 100%.

**Đề xuất của Claude:** (b) trong đợt này: publish là mở cho mọi người, kèm rollback một cú bấm. Lưu "bản đang chạy" thành một con trỏ riêng (không ghi đè
prompt), để sau này thêm canary không phải đổi lại cách lưu.
- *Vì sao:* chưa có người học thật, không có traffic để so hai bản.
- *Trade-off:* sau launch, một bản tệ tới mọi người học cho tới khi rollback.

**Trả lời:** ok

### Câu 19. Judge (model khác chấm câu AI)

19.1 Có dùng không · 19.2 Tiêu chí · 19.3 Model chấm · 19.4 Trần chi phí, có tách khỏi trần lời gọi mỗi ngày không.

**Đề xuất của Claude:**
- 19.1 **Có, chỉ trong eval offline** đợt này.
- 19.2 Danh sách cuối rút từ lỗi thật ở E1. Ứng viên trước E1: *chỉ một đáp án đúng* và *không lộ đáp án* (điền từ, trắc nghiệm theo câu, chọn nghĩa trong câu),
  *nghĩa tiếng Việt đúng* (tra từ). *Vì sao:* đây là các lỗi luật Practice không bắt được và người học bị chấm oan nếu gặp. Câu tự nhiên, đúng CEFR để sau E1.
- 19.3 **(a) khác nhà cung cấp** với model sinh câu. *Vì sao:* model hay chấm dễ cho câu của chính nó hoặc cùng họ. *Trade-off:* cần cả hai key (câu 4.2).
- 19.4 Trần riêng **2 USD / ngày** (`ASSUMPTION`) và **tách khỏi trần lời gọi mỗi ngày của người học**: lời gọi của judge, eval, test có trần riêng.
  *Vì sao:* hiện một lần chạy eval lớn có thể đẩy số lời gọi qua trần (D24) và tắt AI của người học tới 0 giờ. *Trade-off:* đổi D24 Bước 6; thêm một con số để
  admin quản.

**Trả lời:** judge này cũng phải được configure trên UI luôn chứ?

### Câu 20. Thang chấm

Các hướng: (a) đạt / không đạt, mỗi tiêu chí một lần chấm · (b) thang 1–5 · (c) khác.

**Đề xuất của Claude:** (a).
- *Vì sao:* so với nhãn người dễ (khớp / không khớp), đo được tỉ lệ bắt đúng lỗi; "câu này đạt 3/5" không cho biết phải sửa gì.
- *Trade-off:* mất độ chi tiết giữa "tạm được" và "rất tốt"; mỗi tiêu chí một lời gọi nên tốn hơn chấm gộp.

**Trả lời:**  mình đề xuất thêm là đạt ở mức độ nào, và lý do tại sao không đạt

### Câu 21. Bộ ví dụ

21.1 Chia dev / held-out · 21.2 Ai viết tiêu chí mong đợi, ai gắn nhãn hiệu chỉnh judge · 21.3 Nút "đưa vào bộ ví dụ" từ câu bị báo lỗi; câu về từ riêng.

**Đề xuất của Claude:**
- 21.1 **Có**, khoảng **20%** mỗi thao tác là held-out (`ASSUMPTION`); held-out chỉ hiện số tổng, ví dụ held-out bị mở ra xem thì chuyển sang dev.
  *Trade-off:* bộ ví dụ nhỏ (15–20 ví dụ) chia ra thì held-out chỉ 3–4 ví dụ, số tổng dao động mạnh; phải lớn dần bộ ví dụ.
- 21.2 Tiêu chí mong đợi: **Claude viết, bạn duyệt**. Nhãn hiệu chỉnh judge: **bạn gắn**. *Vì sao:* nhãn là "sự thật" để đo judge; nếu Claude gắn thì judge
  được đo theo Claude, không theo người. *Trade-off:* việc gắn nhãn tốn thời gian của bạn (`ASSUMPTION`: 30–50 nhãn mỗi tiêu chí).
- 21.3 **Có nút**, chỉ cho câu báo lỗi đã được nhân viên xác nhận. Câu về **từ riêng**: **(a) không bao giờ chép** (D26 Bước 7). *Trade-off:* mất các ca lỗi
  trên từ riêng; muốn thử thì phải viết lại ví dụ tương tự bằng từ trong kho.

**Trả lời:** tỉ lệ held-out vẫn sẽ được điều chỉnh trên giao diện, 21.2 mình chưa hình dung lắm, 21.3 mình cũng chưa hiểu câu hỏi

### Câu 22. Online eval (chấm mẫu câu AI đã gửi người học)

**Đề xuất của Claude:** **không trong đợt này** (câu 15). Khi làm: lấy mẫu 5–10% câu AI + 100% câu bị báo lỗi, báo riêng hai nhóm, chạy mỗi ngày một lần trong
cửa sổ 7 ngày, không chấm câu về từ riêng.
- *Vì sao:* chưa có câu AI nào gửi người học thật.
- *Trade-off:* như câu 15.

**Trả lời:** tại sao lại không làm trong đợt này

### Câu 23. Judge trong lúc tạo trước câu (`prepare`)

Chặn câu tệ trước khi Lan thấy; đổi lại gấp đôi chi phí mỗi câu AI, `prepare` chậm hơn, judge chấm sai có thể loại câu tốt.

**Đề xuất của Claude:** (c) để sau khi có số đo.
- *Vì sao:* chưa biết tỉ lệ câu tệ lọt qua luật Practice, cũng chưa biết judge đúng bao nhiêu; nếu tỉ lệ lọt nhỏ thì gấp đôi chi phí không đáng.
- *Trade-off:* trong lúc chờ, câu tệ lọt qua luật vẫn tới người học (có báo lỗi và trả lượt).

**Trả lời:** bạn hãy kiểm tra xem tỉ lệ câu lỗi xảy ra là bao %, nếu không đáng kể thì có thể chấp nhận được

### Câu 24. Dashboard theo dõi AI

24.1 Đặt ở đâu · 24.2 Ai xem · 24.3 Cảnh báo · 24.4 Nhóm câu hỏi bắt buộc.

**Đề xuất của Claude:**
- 24.1 **(a) trang mới trong `apps/admin`.** *Vì sao:* đã có quyền `settings.manage`, endpoint chi phí và tình trạng; không mở DB cho công cụ ngoài (thêm
  hosting, thêm chỗ lộ dữ liệu). *Trade-off:* tự vẽ biểu đồ tốn công hơn Metabase.
- 24.2 **(a) chỉ `admin`**, như mọi API AI hiện có.
- 24.3 **(a) chỉ hiện trên dashboard** đợt này; email cảnh báo làm cùng Deploy (cần SMTP thật).
- 24.4 **"AI có chạy không"** và **"tốn bao nhiêu"**, cộng tỉ lệ bị luật loại và kết quả eval gần nhất. *Vì sao:* hai nhóm đầu gần như đã có endpoint; các nhóm
  về người học cần người học thật.

**Trả lời:** 24.1 xem qua các thư viện hỗ trợ vẽ dashboard, có thể sử dụng các thư viện đó để theo dõi, còn lại ok

### Câu 25. Màn admin cho eval và prompt

Các hướng: (a) làm màn theo giao diện admin hiện tại · (b) chỉ API, màn đợi đợt làm lại admin · (c) làm lại admin UI trước · (d) khác.

**Đề xuất của Claude:** (a), giữ phần gọi API và trạng thái tách khỏi phần hiển thị.
- *Vì sao:* bạn muốn tự sửa prompt và xem số trên UI; đợt làm lại admin chưa có design, chờ nó thì B không dùng được. Tách lớp logic đúng như ghi chú 15/10
  ("giữ session / API khi làm lại").
- *Trade-off:* phần hiển thị có thể bị vẽ lại khi làm lại admin.

**Trả lời:** ok

---

## Phần 4 — Cấu hình AI (nhóm C: C17)

### Câu 26. `baseURL` của AI adapter

Hiện viết cứng; SDK bị chặn đọc `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` vì shell Claude Code trên máy này có đặt `ANTHROPIC_BASE_URL`: nếu đọc biến đó, API
chạy từ shell ấy gửi key Anthropic thật tới địa chỉ khác.

26.1 Mục đích · 26.2 Tên biến · 26.3 Địa chỉ được nhận · 26.4 Đặt ở đâu.

**Đề xuất của Claude:** **chỉ làm khi 26.1 có mục đích cụ thể** (ví dụ một gateway bạn định dùng). Không có thì giữ nguyên: thử nghiệm đã có provider giả.
Nếu làm:
- 26.2 **(a) tên riêng của app**: `AI_OPENAI_BASE_URL`, `AI_ANTHROPIC_BASE_URL`; vẫn chặn SDK đọc tên mặc định. *Vì sao:* tên mặc định đang bị shell Claude Code
  đặt sẵn; tên riêng chỉ có khi bạn tự ghi vào `.env`.
- 26.3 **(b) chỉ `https`**, riêng `http://localhost` được nhận khi không ở production. *Trade-off:* gateway nội bộ chạy `http` phải đặt sau `https`.
- 26.4 **(a) `.env`**; để trống = địa chỉ chính thức như hiện nay; khi khởi động ghi log host đang dùng (không ghi key). *Vì sao:* đổi địa chỉ là việc của hạ tầng,
  không nên sửa được từ admin (một tài khoản admin bị lộ không được đổi nơi key được gửi tới).
- *Trade-off chung:* đổi plan review #6 Bước 6; thêm một chỗ cấu hình có thể làm key đi sai chỗ nếu ghi nhầm.

26.1 (bạn ghi mục đích): có khả năng bên các provider đổi api url không, nếu ít xảy ra thì có thể bỏ qua

**Trả lời:**

---

## Phần 5 — Sản phẩm và chi phí (nhóm D: C4, C5)

### Câu 27. C4 — Gói Miễn phí thử câu AI

Hiện Miễn phí không có câu AI (F31). Sổ lượt Bước 5 có kiểu kho theo ngày; trần `ai_daily_cap` vẫn giữ.

**Đề xuất của Claude:** **không vào đợt này** (câu 2); chốt sau E1 khi biết chi phí một câu. Khi làm: 3 câu AI mỗi ngày, chỉ kiểu điền từ, kho theo ngày riêng
(không chung kho Dùng thử), không gồm tra từ bằng AI.
- *Vì sao:* đặt con số trước khi biết giá một câu là đoán; điền từ là kiểu câu thể hiện rõ nhất "luyện dùng từ trong câu".
- *Trade-off:* chưa giải được chuyện người dùng Miễn phí không thấy điểm khác biệt (§1.3 `IMPROVEMENT_IDEAS`).

**Trả lời:** archived lại, brainstorm sau

### Câu 28. C5 — Bài "Đặt câu với từ này"

Lan viết một câu có `deploy`, AI chấm và nhận xét ngắn. Đổi quyết định 02/10/2026; cần một thao tác AI mới.

**Đề xuất của Claude:** **không vào đợt này.** Khi làm: chấm *dùng đúng nghĩa của từ* và *đúng ngữ pháp* (không chấm "tự nhiên"); kết quả đạt / chưa đạt + một
câu nhận xét + một câu sửa mẫu; không tính vào lịch ôn; chỉ Pro, 1 lượt AI; chấm sai thì báo lỗi như câu AI hiện nay, được trả lượt.
- *Vì sao:* đây là việc AI chấm câu người học viết, rủi ro chấm sai cao hơn sinh câu; nên làm sau khi đã có judge và bộ nhãn của nhóm B (cùng kỹ thuật).
- *Trade-off:* tính năng có giá trị ghi nhớ cao nhất trong danh sách bị dời.

**Trả lời:** archived, làm sau

---

## Kiểm câu trả lời (Claude, 26/10/2026)

Chưa viết design doc (chủ dự án: "chưa viết design doc, kiểm tra thôi"). Mỗi mục dưới đây: câu trả lời đã chốt chưa, Claude trả lời câu bạn hỏi lại, và chỗ còn
cần bạn chốt (đánh dấu **❓**).

### Đã chốt, không cần thêm gì

Câu 1 (b) · 2 · 9 (xem ghi chú câu 10) · 11 · 12 · 17 · 18 · 25. Đã dời: câu 10 (C15 dòng "Bấm Cần ôn lại lâu nhất trước", xử lý sau), 27 (C4), 28 (C5).

### Câu 3 — chia phiên song song

Đồng ý chia, nhưng các mục nhóm A đụng chung file, chạy song song sẽ ghi đè lên nhau:
- `AnswerFeedback.tsx` (màn sau khi trả lời): C16, C2 **và** nút loa của C1.
- `CustomizeDialog.tsx` (Tùy chỉnh phiên): C15 **và** công tắc của C3.
- `messages/vi.json`, `en.json` (bản chữ): gần như mọi mục.

Đề xuất chia nhóm A thành 3 phiên theo file: **(1)** C13 luồng đăng ký · **(2)** C14 trang nhóm · **(3)** Luyện tập: C15 + C16 + C2 + C3, rồi C1 nút loa sau cùng
trong cùng phiên. Nhóm B là phiên riêng. Xung đột ở `vi.json` / `en.json` vẫn có, nhưng gộp lại được khi merge.

### Câu 4 + câu 15 — gọi AI thật lần đầu ❓ (theo đề xuất)

Hai câu trả lời đang đi hai hướng:
- Câu 4: "implement UI cho admin rồi test trực tiếp trên đó" → lần gọi thật phải đợi màn admin xong, tức design B phải viết **trước** khi có dữ liệu thật.
- Câu 15: "viết Postman JSON để test" → gọi thật được **ngay**, không cần code mới, vì API admin hiện có đủ đường: thêm model, chọn model cho từng thao tác,
  chạy thử prompt (`POST /v1/admin/ai/prompts/{op}/test`), chạy eval, xem chi phí.

Postman có hai kiểu, cần bạn chọn:
- **(a) Gọi API admin của Wordmet** (rồi Wordmet gọi OpenAI / Anthropic): thử đúng prompt, khuôn trả về, luật và sổ chi phí của app.
- **(b) Gọi thẳng OpenAI / Anthropic**: chỉ thử key và model, bỏ qua prompt và cách tính chi phí của app.

**Đề xuất:** (a), kèm một request (b) cho mỗi nhà cung cấp để kiểm key. Chạy E1 bằng Postman **trước**, rồi mới viết design B và làm màn admin. Hai câu
trả lời của bạn vẫn giữ được cả hai: Postman dùng ngay, màn admin dùng về sau.

"Phần còn lại làm luôn thì sao" (canary, online eval…): làm được, nhưng hiện chỉ thử được bằng dữ liệu giả hoặc phiên của chính bạn, vì chưa có người học thật.
Câu 18 bạn đã chọn không canary. Online eval: xem câu 22.

### Câu 5–7 — bắt buộc nhập OTP trước khi vào app ❓ 

Đề xuất mới của bạn thay cho câu 5–7 (không cần dải nhắc, không cần giới hạn tài khoản chưa xác nhận). Hiện trạng đã kiểm trong code:
- Đăng ký xong thì web **đã** đưa sang trang nhập mã. Nhưng không có gì bắt buộc: người chưa nhập mã đăng nhập lại sau đó sẽ vào thẳng app
  (`RequireSession.tsx` chỉ chặn khi chưa chọn ngôn ngữ, không xét `email_verified`), và API cũng không chặn.
- Ý gốc của mục 1 là "đăng ký xong nhảy qua chọn ngôn ngữ luôn"; đề xuất mới làm ngược lại (nhập mã trước).

Cần bạn chốt:
- **7a. Thứ tự:** giữ đăng ký → nhập mã → chọn ngôn ngữ → Hôm nay (như hiện nay, chỉ thêm phần bắt buộc)? (ok)
- **7b. Chặn ở đâu:** (i) chỉ web: chưa xác nhận thì mọi trang `/app` đưa về trang nhập mã, giống cách đang chặn khi chưa chọn ngôn ngữ · (ii) web + API: API từ 
  chối mọi API người học khi chưa xác nhận.
  **Đề xuất:** (i). Người chưa xác nhận gọi API thẳng thì cũng chỉ dùng tài khoản của chính họ, không hại ai; (ii) phải sửa nhiều module và các script thử. (nếu trường hợp user chưa xác thực thì không cung cấp quyền vào phiên đăng nhập, trường hợp đã tạo tài khoản rồi mà chưa xác nhận => khi đăng nhập thành công thì route vào trang nhập otp, không cấp quyền)
  *Trade-off:* app Flutter sau này phải tự làm lại phần chặn này.
- **7c. Gõ sai email lúc đăng ký** thì kẹt ở trang nhập mã. Trang có nút "Đăng xuất" để đăng ký lại bằng email khác là đủ, hay cần "Đổi email"? (Chưa kiểm
  API có đường đổi email hay không.)

**Thắc mắc:** thường thiết kế nếu không nhập otp thì có tạo record cho tài khoản đó không?

### Câu 8 — nút mở modal ❓

Tấm Thêm từ hiện có **đã là một modal** có ô tìm từ và ô chọn nhóm (`AddWordSheet.tsx`, nhớ nhóm dùng gần nhất). Theo ý bạn: trang nhóm có nút **[Thêm từ]**, mở
đúng tấm đó với nhóm này chọn sẵn và khóa lại.
- **❓** Thêm xong một từ thì tấm đóng lại (như hiện nay), hay vẫn mở để thêm từ kế tiếp? (đóng lại)
- **❓** Có cần tick nhiều nghĩa rồi thêm một lần không? Code đã có tấm "thêm cả loạt" (`BulkAddSheet.tsx`) dùng lại được. (được thì tốt)

### Câu 9 + câu 10 (ok, nếu vậy thì lưu vào context giúp mình)

Câu 10 đã dời, nên câu 9 chỉ bỏ "trước" ở 5 dòng; dòng "Bấm Cần ôn lại lâu nhất trước" giữ nguyên cho tới khi xử lý câu 10. Bỏ "trước" ở dòng đó lúc này thành
"Bấm Cần ôn lại lâu nhất", còn khó hiểu hơn.

### Câu 13.3 — hai giọng Anh và Mỹ (thường mình thấy các trang như cambridge vẫn làm 2 nút loa cho 2 kiểu giọng, nên cứ làm như bình thường giúp mình)

Làm được: trình duyệt cho danh sách giọng kèm mã ngôn ngữ (`en-US`, `en-GB`). **Đề xuất:** một lựa chọn "Giọng đọc: Mỹ / Anh" trong Cài đặt, mặc định Mỹ, lưu
trên máy đó (vì mỗi máy có bộ giọng khác nhau). Máy không có giọng đã chọn thì dùng giọng tiếng Anh khác, Cài đặt ghi "máy này chưa có giọng Anh".
- *Trade-off:* không nghe so sánh hai giọng ngay tại chỗ; muốn vậy thì mỗi chỗ có hai nút loa, rối hơn. 
- Chưa kiểm: Windows, Android, iOS có sẵn giọng `en-GB` hay không (`ASSUMPTION`, phải thử trên máy thật).

### Câu 14 — giải thích ❓ (theo đề xuất)

Trong Luyện tập có kiểu câu **Điền từ vào câu**. Hiện câu luôn do AI viết (gói Dùng thử / Pro). API Bước 7 còn có một nguồn câu khác: **câu chính Lan đã lưu**
khi thêm từ. Ví dụ Lan thêm `deploy` kèm câu đã gặp "We deploy every Friday", thì có câu hỏi "We ___ every Friday".
- Không gọi AI, không tốn lượt, câu là của chính Lan.
- Ở D10 bạn đã bỏ ô "Câu lấy từ đâu?", nên giao diện hiện **không có đường vào** nguồn này, dù API vẫn còn.
- D11 Bước 7: gói Miễn phí không có bài điền từ nào.

Hai câu cần chốt:
- **14.1** Cho gói Miễn phí dùng không? Đề xuất **có**: không tốn tiền, và cho người học Miễn phí lý do để lưu câu đã gặp.
- **14.2** Bật bằng gì? Đề xuất **một công tắc "Điền từ vào câu bạn đã lưu"** cạnh công tắc "Kiểu câu có AI" trong Tùy chỉnh phiên, chỉ hiện khi có câu đã lưu.

### Câu 16 — thử prompt, eval và judge trong admin

Được, và đó là đề xuất của câu 25 (bạn đã ok): trang prompt trong admin có nút chạy thử (API đã có), chạy eval trên bộ ví dụ, xem điểm của judge từng ví dụ, so với
bản đang chạy, rồi Publish / Rollback.

### Câu 19 — cấu hình judge trên UI

Có. Mỗi judge là một **thao tác AI** như các thao tác sinh câu, nên chọn model, effort, số token, sửa prompt và xem lịch sử trên cùng màn admin. Thêm phần quản
lý tiêu chí (tên, mô tả, ví dụ đạt / không đạt) và trần chi phí riêng (19.4). Ghi vào design B.

### Câu 20 — "đạt ở mức độ nào, lý do không đạt" ❓

- **Lý do không đạt:** đồng ý. Judge trả về kết luận kèm một câu lý do, ví dụ "không đạt: câu có hai đáp án đúng, `release` cũng điền được". Lý do này chính là
  nguyên liệu để sửa prompt.
- **Mức độ:** cần bạn nói rõ là mức độ nào:
  - (a) Mức độ **của lỗi**: không đạt nặng (người học bị chấm oan, hiểu sai nghĩa) / không đạt nhẹ (câu gượng, vẫn dùng được).
  - (b) Mức độ **đạt**: thang điểm, quay về hướng 1–5 của C11.

  **Đề xuất:** (a). Mức nặng hay nhẹ quyết định sửa ngay hay để sau, còn "đạt 4/5" không nói phải làm gì. *Trade-off:* có ba giá trị thay vì hai, nên hiệu chỉnh (ok)
  judge cần nhiều nhãn hơn.

### Câu 21 — giải thích

- **Tỉ lệ held-out chỉnh trên giao diện:** được. Một luật đi kèm: ví dụ đã bị mở ra xem thì luôn nằm ở dev, nên khi tăng tỉ lệ thì chỉ lấy thêm từ các ví dụ mới,
  chưa ai xem.
- **21.2:** có hai việc khác nhau mà người phải làm:
  1. *Tiêu chí mong đợi* (viết **trước** khi chạy), cho mỗi đầu vào. Ví dụ đầu vào "`deploy`, B1, chủ đề IT" thì tiêu chí là: đáp án `deploy` hoặc `deployed`,
     đúng một chỗ trống, không có từ khác điền vừa. Đề xuất: **Claude viết, bạn duyệt**.
  2. *Nhãn để hiệu chỉnh judge* (làm **sau** khi chạy), cho mỗi câu AI đã sinh. Bạn tự đánh "đạt / không đạt" theo một tiêu chí; rồi cho judge chấm chính các câu
     đó; số câu judge chấm giống bạn là độ tin của judge (ví dụ bạn và judge giống nhau 45/50 câu = 90%). Đề xuất: **bạn gắn**, vì đây là phần "đáp án chuẩn"
     dùng để đo judge; Claude gắn thì judge bị đo theo Claude, không theo người.
- **21.3:** câu hỏi là: khi Lan báo một câu AI sai và nhân viên xác nhận là sai thật, admin có nút **"Đưa vào bộ ví dụ"** để câu lỗi đó thành một ví dụ kiểm thử
  không. Nhờ vậy bộ ví dụ lớn lên từ lỗi thật, và lần sửa prompt sau tự kiểm lại lỗi cũ. Ngoại lệ: câu về **từ riêng** của Lan (từ Lan tự tạo, ví dụ "rizz"
  với nghĩa Lan tự nhập). Chép câu đó vào bộ ví dụ là đưa dữ liệu riêng của Lan cho nhân viên xem mãi mãi, nên đề xuất không bao giờ chép.

### Câu 22 — vì sao không làm online eval trong đợt này ❓

Online eval chấm mẫu các câu AI **đã gửi cho người học**. Hiện chưa có người học thật; nội dung lời gọi chỉ giữ 7 ngày; người học duy nhất là bạn. Làm bản đầy đủ 
bây giờ (tự lấy mẫu theo lịch, báo theo bản prompt) thì chỉ thử được trên phiên của chính bạn. (vậy nếu mình lấy test user làm người học mẫu thì sao, tại vì mình cũng phải qua một giai đoạn test nhất định thì mới publish cho user dùng)

Một mức giữa: nút **"Chấm câu AI 7 ngày qua"** trong admin, bấm thì judge chấm các câu AI đã phục vụ, không chạy theo lịch. Bạn dùng app mỗi ngày là có dữ liệu,
lên launch thì thêm lịch chạy. **❓** Làm mức giữa này trong đợt, hay để sau? (làm luôn)

### Câu 23 — tỉ lệ câu lỗi (nếu vậy chỗ này mình sẽ chạy api test trên nhiều mẫu, nhưng khả năng vẫn sẽ hạn chế lỗi nhiều nhất có thể để tránh ảnh hưởng trải nghiệm người dùng)

Hiện **chưa đo được**: chưa có lần gọi AI thật nào, mọi câu đến giờ đều từ provider giả. Tỉ lệ này là một trong những thứ E1 và eval sẽ cho ra (luật loại bao
nhiêu %, judge thấy lỗi bao nhiêu % trong số câu qua được luật). **❓** Cần bạn đặt ngưỡng trước để khỏi phải hỏi lại: đề xuất nếu dưới **3%** câu qua luật bị
judge chấm "không đạt nặng" thì không đặt judge trong `prepare` (`ASSUMPTION`). 

### Câu 24 — thư viện vẽ dashboard

Đã kiểm: `apps/admin` và `apps/web` hiện **chưa có** thư viện biểu đồ nào. Câu trả lời của bạn khớp với 24.1 (a): trang trong `apps/admin`, dùng một thư viện
biểu đồ. Chọn thư viện nào sẽ đọc tài liệu hiện hành rồi so ở bước design B (chưa so phiên này).

### Câu 26 — nhà cung cấp có đổi địa chỉ API không

Đã kiểm: địa chỉ viết cứng trong app **trùng với địa chỉ mặc định của chính SDK** (`openai` 7.39.0: `https://api.openai.com/v1`; `@anthropic-ai/sdk` 0.135.0:
`https://api.anthropic.com`). Không thấy dấu hiệu sắp đổi (`ASSUMPTION`: không tìm thông báo của nhà cung cấp phiên này). Nếu có đổi thì bản SDK mới cũng đổi
mặc định, và app sửa một dòng. **Đề xuất:** bỏ C17 (archive). **❓** Ghi "archived" ở câu 26 nếu đồng ý. (archived)

### Còn cần bạn chốt (tóm tắt)

| # | Việc |
|---|---|
| 4 / 15 | Postman kiểu (a) hay (b); chạy E1 bằng Postman trước design B? |
| 7a–7c | Thứ tự trang, chặn chỉ web hay cả API, gõ sai email thì làm sao |
| 8 | Tấm thêm từ mở từ nhóm: đóng sau mỗi từ hay mở tiếp; có thêm cả loạt không |
| 14 | Gói Miễn phí có dùng; bật bằng công tắc |
| 20 | "Mức độ" là mức độ của lỗi (a) hay thang điểm (b) |
| 22 | Nút "Chấm câu AI 7 ngày qua" trong đợt hay để sau |
| 23 | Ngưỡng 3% |
| 26 | Archive C17 |

---

## Kiểm lần 2 (Claude, 26/10/2026)

### Đã chốt thêm

| # | Chốt |
|---|---|
| 4 / 15 | Postman kiểu (a) gọi API admin của Wordmet, kèm một request (b) kiểm key cho mỗi nhà cung cấp, có README; chạy E1 bằng Postman **trước** design B; màn admin làm sau |
| 7a | Thứ tự: đăng ký → nhập mã → chọn ngôn ngữ → Hôm nay |
| 8 | Trang nhóm có nút [Thêm từ] mở tấm Thêm từ, nhóm chọn sẵn; thêm xong một từ thì tấm đóng; có thêm cả loạt (dùng lại `BulkAddSheet`) |
| 9 / 10 | Bỏ "trước" ở 5 dòng; dòng `priority_oldest` giữ nguyên chữ, câu 10 ghi vào `IMPROVEMENT_IDEAS` (C15) để làm sau |
| 13.3 | Hai nút loa **UK** · **US** như Cambridge (xem ghi chú dưới) |
| 14 | Gói Miễn phí dùng được; bật bằng công tắc "Điền từ vào câu bạn đã lưu" (đổi D11 Bước 7) |
| 20 | Đạt / không đạt nặng / không đạt nhẹ, kèm một câu lý do |
| 22 | Làm nút "Chấm câu AI 7 ngày qua" trong đợt này; người học mẫu là các tài khoản test trong giai đoạn thử trước khi mở cho người dùng |
| 26 | C17 archived |

**Ghi chú câu 13.3:** hai nút UK · US đặt ở chỗ đọc **từ** (trang từ, thẻ ôn, kết quả luyện tập). Câu ví dụ / câu đã gặp chỉ một nút, giọng US, để trang không
rối (Cambridge cũng chỉ có hai nút ở từ chính). Máy không có giọng `en-GB` thì ẩn nút UK. Không cần lựa chọn giọng trong Cài đặt nữa.

**Ghi chú câu 22:** dùng tài khoản test làm người học mẫu được, nút chấm không phân biệt test hay thật. Hệ quả: trong giai đoạn thử, các tài khoản test luyện
bằng **model thật**, nên tốn tiền thật; câu về từ riêng vẫn không chấm, không chép.

### Câu 7b — "không cấp quyền vào phiên đăng nhập" ❓

Ý bạn là API cũng phải chặn, không chỉ web. Có một ràng buộc trong code đã kiểm: **API nhập mã (`POST /v1/auth/verify-email`) cần người dùng đã đăng nhập**
(qua `AuthGuard`), và đăng ký hiện tạo tài khoản, phiên đăng nhập và mã OTP trong cùng một lần (`auth.service.ts`). Nên "không cấp phiên" phải chọn một trong hai:

| | Cách | Được | Mất |
|---|---|---|---|
| (A) | Vẫn cấp phiên, nhưng **phiên bị giới hạn**: chưa xác nhận thì API trả 403 `email-not-verified` cho mọi API, trừ một danh sách nhỏ (nhập mã, gửi lại mã, `/v1/me`, làm mới phiên, đăng xuất). Web đưa về trang nhập mã | Giữ nguyên API nhập mã và cách làm mới phiên; chặn thật ở API; app Flutter sau này được chặn sẵn | Tài khoản chưa xác nhận vẫn có một phiên (chỉ để nhập mã) |
| (B) | **Không cấp phiên** tới khi nhập mã: đăng ký / đăng nhập không trả token; API nhập mã đổi thành công khai, nhận email + mã, đúng thì mới cấp phiên | Đúng nghĩa đen "không có phiên" | Đổi cả luồng đăng ký, đăng nhập, nhập mã của Identity; API công khai nhận email + mã phải chống dò mã trên nhiều email; nhiều test và smoke phải sửa |

**Đề xuất:** (A). Kết quả với người dùng giống (B) (chưa nhập mã thì không làm được gì), nhưng chỉ thêm một lớp kiểm thay vì viết lại luồng đăng nhập.
- *Trade-off:* đổi Identity (một guard mới cho mọi module); các script smoke và `learner:setup` hiện đã tự nhập mã qua Mailpit (đã kiểm: có gọi `verify-email`),
  nên có lẽ không gãy, nhưng phải chạy lại để chắc.

### Câu 7c — gõ sai email, và "có tạo record khi chưa nhập OTP không" ❓

**Trả lời câu hỏi của bạn.** Có hai kiểu làm (đây là hiểu biết chung của Claude, chưa đọc tài liệu của từng dịch vụ trong phiên này):
1. **Tạo tài khoản ngay, đánh dấu "chưa xác nhận"**, nhập mã thì đánh dấu đã xác nhận. Đơn giản; đổi lại có tài khoản rác và chuyện giữ chỗ email (bên dưới).
2. **Giữ đăng ký ở bảng chờ**, nhập mã đúng mới tạo tài khoản thật. Không có rác; đổi lại phải lo bản chờ hết hạn, gửi lại mã, hai người cùng đăng ký một email.

Wordmet đang theo **kiểu 1** (đã kiểm: đăng ký tạo `users` với `emailVerifiedAt = null`).

**Chuyện giữ chỗ email.** Ví dụ Lan định gõ `lan@gmail.com` nhưng gõ nhầm `lam@gmail.com`, mà địa chỉ đó là của người khác (Lâm):
- Lan kẹt ở trang nhập mã vì mã gửi tới hộp thư của Lâm. Lan cần nút **Đăng xuất** để đăng ký lại bằng email đúng.
- Sau này Lâm đăng ký thì bị báo "email đã được dùng" (`email-taken`; đã kiểm: API không phân biệt tài khoản đã hay chưa xác nhận).
- Lâm **vẫn lấy lại được** địa chỉ của mình qua "Quên mật khẩu". Đã kiểm trong code: mã đặt lại vẫn gửi cho tài khoản chưa xác nhận; đặt lại xong thì tài khoản được
  tính là đã xác nhận, mọi phiên cũ bị thu hồi, mật khẩu Lan đặt bị thay. Tài khoản đó là của Lâm từ đây.

**Đề xuất:**
- Trang nhập mã có **[Đăng xuất]** và dòng "Gõ nhầm email? Đăng xuất rồi đăng ký lại." Không làm "Đổi email" trong đợt này.
- Thêm dòng nhắc trong trang đăng ký khi bị `email-taken`: "Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu."
- Giữ kiểu 1. Xoá tài khoản chưa từng xác nhận sau N ngày: ghi vào `deploy-checklist.md`, làm cùng phần xoá tài khoản của Bước 8.
- *Trade-off:* tài khoản rác nằm trong DB tới khi có việc dọn; Lâm phải tự nghĩ tới "Quên mật khẩu" nếu không đọc dòng nhắc.

### Câu 23 — đo trên nhiều mẫu ❓

Hiểu câu trả lời của bạn là: chưa đặt ngưỡng cứng; chạy thử trên nhiều mẫu, có số rồi mới quyết có đặt judge trong `prepare` không, ưu tiên ít lỗi nhất cho người học.
**Đề xuất:** design B vẫn ghi một **mốc khởi đầu 3%** (`ASSUMPTION`, sửa được sau khi đo) để lúc có số không phải bàn lại từ đầu: trên mốc thì làm judge trong
`prepare`, dưới mốc thì không. Ghi "ok" nếu đồng ý giữ mốc này, hoặc ghi "không cần mốc".

### Còn cần bạn chốt

| # | Việc |
|---|---|
| 7b | (A) phiên bị giới hạn hay (B) không cấp phiên |
| 7c | Nút Đăng xuất + dòng nhắc `email-taken`; dọn tài khoản chưa xác nhận để tới Bước 8 |
| 23 | Giữ mốc khởi đầu 3% hay không cần mốc |

Câu 3 (chia nhóm A thành 3 phiên theo file) Claude coi là đã đồng ý vì không có ghi chú khác; ghi lại nếu bạn muốn chia khác.

**Trả lời (chủ dự án, chat 26/10/2026):** 7b chọn **(B) không cấp phiên tới khi nhập mã**; 7c và 23 theo đề xuất.

Hệ quả của (B), mang vào design nhóm A: C13 không còn chỉ sửa web. Đăng ký và đăng nhập của tài khoản chưa xác nhận không trả token; API nhập mã thành công khai
(email + mã), đúng mới cấp phiên; phải chống dò mã trên nhiều email. Đổi Identity Bước 1 và các test, smoke liên quan.
