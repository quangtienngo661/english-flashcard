# Số câu AI do người học chọn, số câu tối đa theo cài đặt admin — design

Ngày 09/11/2026. Trạng thái: quyết định đã chốt trong chat với chủ dự án ngày 09/11/2026 (Phần 1–5 đã duyệt); chờ chủ dự án đọc bản viết này
trước khi lập plan. Phạm vi: **API, giao diện admin, Figma**; không viết web người học.
Decision record: `docs/superpowers/decisions/2026-11-09-practice-ai-count-decisions.md`.
Mockup: `docs/mockups/2026-11-05-redesign-concepts/vong-14-so-cau-ai.html` (artifact "Số câu AI và cài đặt luyện tập").

## 1. Vì sao

Hiện nay:
- Admin đặt một mức tối đa cố định cho mọi phiên (`practice.max_questions_per_session` = 20), bất kể phạm vi có bao nhiêu từ.
- Số câu AI do API tự tính theo tỉ lệ kiểu câu (`ceil(count × số kiểu AI ÷ số kiểu)`, Bước 7 design §6.1). Người học không chọn được.
- Hộp Tùy chỉnh phiên chỉ có công tắc bật/tắt câu AI.

Chủ dự án muốn:
1. Người học chọn số câu AI của phiên.
2. Admin đặt số câu AI tối đa theo **mức cố định** hoặc **tỉ lệ theo số câu của phiên**.
3. Admin chọn số câu tối đa của phiên theo **mức cố định** hoặc **bằng số từ của phạm vi** (Mọi từ, Cần ôn, Ưu tiên, một ngăn).
4. Số câu AI ít hơn số câu của phiên thì câu AI được xếp **rải đều** hoặc **ngẫu nhiên**. Admin chọn một kiểu, hoặc để người học chọn.

Ví dụ xuyên suốt: Lan có nhóm "IELTS" 300 từ: Mọi từ 300, Cần ôn 24, Ưu tiên 4, ngăn Mới 36. Lan còn 12 lượt câu AI.

## 2. Mục tiêu, không mục tiêu

- Ba cài đặt admin mới dạng dropdown, cộng các ô số đi kèm (§3).
- Body mở phiên nhận `ai_count` và `ai_placement`. **Không gửi `ai_count` thì API chạy y như cũ**, để web hiện nay không đổi hành vi (§4).
- Câu AI được đánh dấu theo từ như hiện nay, thêm kiểu Ngẫu nhiên (§5).
- Tab Luyện tập của admin có các ô mới (§6). Figma vẽ lại hộp Tùy chỉnh phiên (Overlay 7) theo mockup vòng 14 (§7).
- **Không** viết web người học: hộp Tùy chỉnh phiên trong code giữ nguyên.
- **Không** đổi phiên Ôn (đợt C): vẫn dùng `default_questions_per_session`, không có AI.
- **Không** đổi cách tính và trừ lượt AI: kiểm khi mở phiên, không trừ trước (Bước 7 D7); câu AI có sẵn chưa hỏi vẫn dùng lại không tốn lượt.

## 3. Cài đặt admin (tab Luyện tập, quyền `settings.manage`)

| Khóa (`practice.*`) | Kiểu | Giá trị | Mặc định | Ghi chú |
|---|---|---|---|---|
| `session_max_mode` | chọn một | `fixed` (Mức cố định), `scope_words` (Bằng số từ của phạm vi) | `fixed` | mới |
| `max_questions_per_session` | số | 5–100 | 20 | có sẵn; chỉ dùng khi `fixed` |
| `default_questions_per_session` | số | 1–100 | 10 | có sẵn; kiểm "≤ `max_questions_per_session`" **chỉ** khi `fixed` |
| `ai_max_mode` | chọn một | `fixed` (Mức cố định), `percent` (Theo tỉ lệ số câu của phiên) | `percent` | mới |
| `ai_max_fixed` | số | 0–100 câu | 5 | mới; chỉ dùng khi `ai_max_mode = fixed`; 0 = không có câu AI |
| `ai_max_percent` | số | 0–100 (%) | 50 | mới; chỉ dùng khi `percent` |
| `ai_placement` | chọn một | `even` (Rải đều), `random` (Ngẫu nhiên), `learner` (Để người học chọn) | `even` | mới |

- **Trần cứng 100 câu** cho chế độ `scope_words`. Trần này là hằng số, admin không chỉnh. Lý do: `generate_cloze.session_words` gửi tối đa 99 từ khác
  của phiên (`SESSION_WORDS_MAX`), được tính cho phiên tối đa 100 câu. Phiên dài hơn thì AI có thể viết câu mà một từ khác của phiên cũng điền vừa,
  và bước kiểm không bắt được (D11).
- Cài đặt lưu ở `app_settings` (key, JSON value) như các cài đặt khác. Giá trị dropdown là chuỗi; cài đặt dạng dropdown là **loại mới** ở định nghĩa
  cài đặt (`settings.definitions.ts`) và ở form admin. Lịch sử (`app_setting_changes`) đã ghi được giá trị chuỗi.
- `GET /v1/me/app-config` trả thêm trong `practice`: `session_max_mode`, `ai_max_mode`, `ai_max_fixed`, `ai_max_percent`, `ai_placement` và
  `scope_questions_max` (= 100), để hộp mới của web tính được mức tối đa mà không cần gọi thêm. Hai trường cũ giữ nguyên.

## 4. Mở phiên: `POST /v1/practice/sessions` (`kind = practice`)

Body thêm hai trường, đều không bắt buộc:
- `ai_count`: số nguyên ≥ 0, số câu AI người học chọn.
- `ai_placement`: `even` | `random`. Chỉ dùng khi admin đặt `ai_placement = learner`; khi đó không gửi thì là `even`. Admin đã chốt `even` hoặc
  `random` thì giá trị gửi lên **bị bỏ qua**, không lỗi. Lý do: hộp mở từ trước khi admin đổi cài đặt vẫn phải bấm Bắt đầu được.

Các bước, sau khi đọc các từ của phạm vi (`sourceItems`, như hiện nay):

1. **Số câu tối đa** `sessionMax` = `max_questions_per_session` (chế độ `fixed`), hoặc `min(số từ của phạm vi, 100)` (chế độ `scope_words`).
2. **Số câu** `count` = `min(input.count ?? default_questions_per_session, sessionMax)`. **Hạ số, không báo lỗi:** số từ của phạm vi có thể đổi giữa lúc
   mở hộp và lúc bấm Bắt đầu. Đây là thay đổi nhỏ so với hiện nay: `count` lớn hơn mức cố định trước đây bị 400, nay bị hạ xuống.
3. Giữ từ hỏi được (`keepAvailable`, như hiện nay) → `kept`. Chế độ `scope_words`: số câu của phiên (`target_count`) = `min(count, kept.length)`, nên
   **không hỏi lại từ**. Chế độ `fixed`: `target_count = count`, phiên nhiều câu hơn số từ thì có vòng 2, 3 như hiện nay.
4. **Không gửi `ai_count`:** chia câu AI như cũ (Bước 7 §6.1), `ai_placement` của phiên để trống. Dừng ở đây.
5. **Có `ai_count`:**
   - Trần AI `aiCap` = `min(ai_max_fixed, target_count)` (chế độ `fixed`) hoặc `floor(target_count × ai_max_percent ÷ 100)` (chế độ `percent`).
   - `K = min(ai_count, aiCap)`: hạ số, không báo lỗi.
   - `K = 0`: phiên không có câu AI. Các kiểu AI trong `types` bị bỏ khỏi phiên, API không kiểm quyền AI (`gate`). Nguồn câu điền từ
     `own_then_ai` thành `own` (chỉ câu đã lưu; từ chưa có câu nhận kiểu khác, như D2 của đợt `cloze-own-then-ai`); `cloze` với nguồn `ai` bị bỏ.
     Để quyết định bỏ kiểu AI trước khi giữ từ, API tính K tạm bằng trần AI của `count` (bước 2); sau khi giữ từ, K chốt bằng trần AI của
     `target_count`. Nếu K tạm > 0 mà K chốt = 0 (ít từ hỏi được), `gate` đã chạy và `ai_planned` = 0.
   - `K > 0`: kiểm quyền AI, AI đang bật, model sẵn sàng (`gate`, như hiện nay), rồi đánh dấu từ (§5). `ai_planned = min(K, số chỗ AI có thể có)`.
     Thiếu lượt thì trả 403 `ai-quota-insufficient`, như hiện nay. Hộp đã chặn ở số lượt còn lại, nhưng lượt có thể bị dùng ở thiết bị khác giữa lúc
     mở hộp và lúc bấm Bắt đầu.
6. **Lỗi 400** (`validation-failed`) chỉ khi:
   - `ai_count` âm hoặc không phải số nguyên (schema);
   - `ai_count > 0` mà `types` không có kiểu AI nào;
   - `K < target_count` mà `types` không có kiểu câu thường nào. Các câu không phải AI sẽ không có kiểu nào để hỏi.
7. Phiên lưu thêm `ai_placement` (`even` | `random`, trống với phiên theo cách cũ). `target_count` và `ai_planned` đã có trong session view.

Ví dụ (admin: tỉ lệ 50%, Rải đều):

| | Mức cố định 20 | `scope_words`, lọc Ưu tiên (4 từ) |
|---|---|---|
| `sessionMax` | 20 | 4 |
| Lan gửi `count` 10 | `target_count` 10 | 4 |
| `aiCap` | 5 | 2 |
| Lan gửi `ai_count` 3 | K = 3 | K = 2 |
| Lan còn 1 lượt, cần 2 | 403 | 403 |

## 5. Xếp câu AI trong phiên

Chủ dự án: "Rải đều" chỉ cần câu AI rải rác, không dồn một chỗ; đó là thứ tự làm, không quá quan trọng (D13). Vì vậy giữ cách đánh dấu từ hiện có (D12)
và giữ ưu tiên câu AI có sẵn (dùng lại không tốn lượt).

- **Vòng 1 có bao nhiêu câu AI:** phiên một vòng (`target_count ≤ kept.length`) thì cả K câu ở vòng 1. Phiên nhiều vòng thì vòng 1 nhận
  `round(K × kept.length ÷ target_count)` câu; phần còn lại rải qua các vòng sau.
- **Đánh dấu từ ở vòng 1:**
  - Cả hai kiểu đều dùng trước các từ đã có câu AI chưa hỏi.
  - Rải đều: các chỗ còn lại cách quãng đều trong danh sách từ (`markAiSenses` hiện nay).
  - Ngẫu nhiên: các chỗ còn lại bốc ngẫu nhiên.
- **Vòng 2 trở đi** (chỉ chế độ `fixed`, khi phiên nhiều câu hơn số từ):
  - Ngẫu nhiên: mỗi câu là câu AI với xác suất r ÷ q (r = lượt AI còn của phiên, q = số câu còn lại), như hiện nay.
  - Rải đều: câu này là câu AI khi số câu AI đã hỏi đang thấp hơn `round(K × vị trí câu ÷ target_count)`, hoặc khi số câu còn lại không lớn hơn r.
  - Phiên theo cách cũ giữ nguyên xác suất r ÷ q.
- Từ không dùng được AI không nhận chỗ AI: từ không làm được kiểu AI nào đã chọn, hoặc từ đã có câu đã lưu khi nguồn là `own_then_ai`.
  Lan chọn 5 câu AI mà chỉ 3 từ dùng được AI thì phiên có 3 câu AI, và lượt AI chỉ tính cho 3 câu.
- Chọn kiểu AI cho mỗi chỗ (ngẫu nhiên trong các kiểu AI đã bật mà từ làm được), làm sẵn câu AI (`prepare`), và fallback khi AI hỏng: **không đổi**.

## 6. Giao diện admin

Trang "Cài đặt hệ thống", tab Luyện tập, theo mockup vòng 14:
- Ba ô dropdown mới, theo thứ tự của mockup:
  1. "Số câu tối đa mỗi phiên", ở đầu tab; ô số "Mức cố định" nằm trong cùng hàng;
  2. "Số câu mặc định";
  3. "Số câu AI tối đa mỗi phiên";
  4. "Cách xếp câu AI".

  Mỗi dropdown chỉ hiện ô số của chế độ đang chọn, ngay dưới dropdown, trong cùng hàng. Số của chế độ bị ẩn vẫn giữ, đổi lại thì thấy số cũ. Lỗi của một ô
  đang ẩn hiện ở hàng dropdown cha.
- Dòng gợi ý theo kiểu các ô đang có: khóa, khoảng giá trị, mặc định. Ô số câu AI có thêm một dòng ví dụ tính sẵn, ví dụ
  "phiên 7 câu → tối đa 3 câu AI · phiên 10 câu → 5 · phiên 20 câu → 10".
- Lịch sử thay đổi ghi nhãn tiếng Việt của giá trị dropdown, ví dụ "Cách xếp câu AI: Rải đều → Ngẫu nhiên".
- Form admin thêm loại ô dropdown cho cài đặt dạng chọn một (hiện có `Select` cho giờ gửi nhắc).

## 7. Figma (file `JKnyUUtGjpGpfKK4PqBfdY`, Overlay 7)

Vẽ lại hộp Tùy chỉnh phiên ở desktop, phone và bảng trạng thái theo mockup vòng 14:

| Chỗ | Đổi thành |
|---|---|
| Công tắc "Câu AI viết" | ô − / + số câu AI, mặc định 0; dòng "Tối đa N câu AI · còn M lượt" hoặc "…, vì bạn còn M lượt"; hai kiểu câu AI mờ khi số là 0 |
| Cách xếp | nút chia đoạn "Rải đều / Ngẫu nhiên", vẽ ở một trạng thái riêng, ghi chú "khi admin chọn Để người học chọn" |
| Số câu | trạng thái `scope_words`: "tối đa 4" cạnh ô Số câu khi chọn Ưu tiên 4 từ |
| Gói Miễn phí | bỏ trạng thái "AI khóa ở Miễn phí"; thêm "còn 3 lượt" (ô dừng ở 3) và "hết lượt" (ô khóa ở 0, có nút xem gói Pro) |
| Câu đã lưu cùng câu AI | bỏ việc làm mờ "Điền từ vào câu"; dòng "Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết" |
| Chân hộp | "Trong đó 3 câu AI, rải đều." |
| Lỗi | "Chọn ít nhất một kiểu câu AI." và "Chọn ít nhất một kiểu câu không cần AI cho N câu còn lại." |

Dùng lại component trên trang Hệ thống ("Nút chia đoạn", "Hàng kiểu câu", "Nút chữ"); không vẽ lại.

## 8. Edge cases (When → Then)

| When | Then |
|---|---|
| Không gửi `ai_count` (web hiện nay) | Chia câu AI như cũ, `ai_placement` trống; vòng sau theo xác suất r ÷ q |
| `scope_words`, phạm vi 0 từ | 409 `practice-no-words` (`group-empty` / `source-empty`), như hiện nay |
| `scope_words`, phạm vi 1 từ, `count` 10 | `target_count` 1 |
| `scope_words`, phạm vi 300 từ (Mọi từ) | `sessionMax` 100 |
| `scope_words`, phạm vi 24 từ, 21 từ hỏi được bằng các kiểu đã chọn, `count` 24 | `target_count` 21, không hỏi lại từ |
| `fixed`, `count` 25, tối đa 20 | `target_count` 20 (trước đây: 400) |
| Không gửi `count`, `scope_words`, Ưu tiên 4 từ, mặc định 10 | `target_count` 4 |
| `ai_max_mode = percent` 50%, `target_count` 7 | `aiCap` 3 (làm tròn xuống) |
| `ai_max_mode = percent` 10%, `target_count` 5 | `aiCap` 0: `ai_count` 2 bị hạ về 0, phiên không có câu AI, không kiểm quyền AI |
| `ai_max_mode = fixed` 15, `target_count` 10 | `aiCap` 10 |
| `ai_max_fixed` = 0 | Mọi phiên gửi `ai_count` đều có K = 0 |
| `ai_count` 0, `types` có kiểu AI và kiểu thường | Bỏ kiểu AI khỏi phiên; không `gate` |
| `ai_count` 0, `types` chỉ có kiểu AI | Sau khi bỏ kiểu AI, phiên không còn kiểu nào → 400 |
| `ai_count` 3, `types` không có kiểu AI | 400 |
| K 3, `target_count` 10, `types` chỉ có kiểu AI | 400 (7 câu không có kiểu để hỏi) |
| K = `target_count`, `types` chỉ có kiểu AI | Hợp lệ: mọi câu là câu AI |
| `ai_count` 5, chỉ 3 từ dùng được AI | `ai_planned` 3; lượt chỉ kiểm cho 3 câu |
| K 4, có 2 từ có câu AI chưa hỏi | 2 chỗ đầu là 2 từ đó (không tốn lượt), 2 chỗ còn lại rải đều hoặc ngẫu nhiên; lượt cần 2 |
| Lượt còn 1, cần 2 | 403 `ai-quota-insufficient`, không mở phiên |
| Admin `ai_placement = even`, body gửi `random` | Phiên dùng `even` |
| Admin `learner`, body không gửi `ai_placement` | `even` |
| `own_then_ai`, điền từ là kiểu AI duy nhất, mọi từ đã có câu đã lưu, K 3 | `ai_planned` 0; phiên vẫn cần phía AI sẵn sàng (giới hạn 2 của `cloze-own-then-ai`) |
| AI hỏng giữa phiên | Câu đó thành câu thường đã chọn, không tính lượt (fallback hiện có) |
| Admin đổi chế độ khi Lan đang làm phiên | Phiên đang mở giữ `target_count`, `ai_planned`, `ai_placement` đã lưu |
| Phiên Ôn | Không đổi |

## 9. Kiểm

- **Test đỏ trước** (unit, API):
  - Hàm thuần: `sessionMax`, `aiCap` (cả hai chế độ, biên 0, 1, 100, làm tròn xuống), số câu AI ở vòng 1, đánh dấu Ngẫu nhiên (câu có sẵn trước),
    luật Rải đều ở vòng 2 trở đi.
  - Định nghĩa cài đặt: giá trị dropdown sai bị từ chối; kiểm chéo chỉ ở `fixed`.
  - Schema body; service mở phiên theo bảng §8.
  - View: `/v1/me/app-config` có trường mới.
- **Admin:** test component (dropdown ẩn và hiện ô số; lịch sử ghi nhãn), e2e mocked cho tab Luyện tập.
- **Chạy thật:** smoke mới trên API và worker thật, AI giả, DB sạch. Các ca: mức cố định, tỉ lệ, `scope_words` với Ưu tiên 4 từ, thiếu lượt,
  client không gửi `ai_count`, admin đổi cài đặt và lịch sử ghi lại. Chạy lại `smoke:buoc-7` và `smoke:cloze-own-then-ai`.
- **Figma:** chụp lại các khung đã sửa.
- CI xanh trên PR.

## 10. Phạm vi, phụ thuộc, rủi ro

- Một nhánh `feat/practice-ai-count` từ `origin/dev`, một PR vào `dev`.
- **Phụ thuộc:** PR #248 (`own_then_ai`, còn mở ngày 09/11/2026) phải vào `dev` trước, vì §5 dùng "phía AI" của PR đó.
- **Rủi ro:**
  - Số từ của từng bộ lọc mà hộp mới phải hiện (đọc code khi lập plan, 09/11/2026):
    - "Cần ôn" (`group_filter = due`) là hàng đợi hôm nay của nhóm: Ưu tiên + đến hạn + từ mới, sau giới hạn mỗi ngày
      (`practice-reads.queries.ts`). Ở `GET /v1/groups`, con số tương ứng là `today.priority + today.due + today.new`, không phải `today.due`.
    - "Ưu tiên" (`group-priority`) lấy mọi từ ưu tiên của nhóm. `today.priority` thì bỏ các từ trong backlog, nên có thể nhỏ hơn.
    - API vẫn hạ số nên không lỗi, nhưng hộp có thể hiện mức tối đa lệch. Đây là việc của đợt web.
  - Cài đặt dạng dropdown là loại mới ở cả API lẫn form admin.
  - Chưa thử với AI thật.
- **Câu D3 của đợt `cloze-own-then-ai`** (con số lượt AI trong hộp) hết cần: con số Lan chọn chính là số lượt tối đa phiên dùng.
