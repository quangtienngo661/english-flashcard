# Design — Bước 4: Practice (bài luyện không AI, chỉ API)

> **Trạng thái 18/10/2026: bản nháp, chờ chủ dự án đọc lại (19/10).** Các quyết định được hỏi từng câu trong chat theo luật "chủ
> dự án trả lời trước, Claude đề xuất sau". Mục 3–6 (phạm vi, kiến trúc, dữ liệu, luồng và API) đã trình trong chat và chủ dự án
> duyệt; mục 7 (thuật toán) đã trình nhưng chưa được trả lời; mục 8–14 **chưa trình trong chat**, viết thẳng vào doc theo yêu cầu
> của chủ dự án. **Đọc mục 0 trước.** Decision record viết sau khi chủ dự án chốt hết (luật `decision-records.md`).

Ngày: 17–18/10/2026. Brainstorm qua `superpowers:brainstorming` trên nhánh `docs/buoc-4-design` (cắt từ `origin/dev` @ `c1f775d`).
Nhật ký từng vòng hỏi đáp, kèm phân tích trạng thái trước brainstorm: [`../reviews/2026-10-17-buoc-4-readiness.md`](../reviews/2026-10-17-buoc-4-readiness.md)
(mục 8). Design liên quan: [Bước 3](2026-10-16-buoc-3-learning-design.md).

**Nhãn:** **Chốt** = chủ dự án chọn trong chat. **Đề xuất** = Claude đề xuất (đã duyệt cùng phần chứa nó, hoặc ghi rõ "chưa duyệt").
**ASSUMPTION** = con số hoặc giả định chưa kiểm chứng. Design doc là tài liệu chính thức để build; `docs/specs/` là khung ban đầu,
không sửa theo doc này (chủ dự án, 12/10/2026). Mã spec (PRC#, K#, F#…) chỉ để truy nguồn. Tiêu chí `B4#`, edge case `B4E#`.

## 0. Chủ dự án cần lưu ý khi đọc

Những chỗ dưới đây **chưa được chủ dự án trả lời rõ** hoặc là hệ quả mới phát hiện. Mỗi dòng trỏ tới mục chứa nó.

| # | Điểm | Vì sao cần xem | Mục |
|---|---|---|---|
| ⚠1 | **Từ riêng của người học chỉ có bài gõ từ** (không trắc nghiệm, không đúng/sai) | Nghĩa và từ đồng nghĩa của từ riêng không ai duyệt, nên trắc nghiệm có thể ra hai đáp án đúng, trái luật "không bao giờ có hơn một đáp án". Đề xuất, chưa duyệt | 7.3 |
| ⚠2 | **Nghĩa chưa rà từ đồng nghĩa thì không có trắc nghiệm, đúng/sai** | Cột `synonyms` trống có hai nghĩa: "chưa ai rà" và "rà rồi, không có từ đồng nghĩa". Muốn giữ luật "không bao giờ hai đáp án đúng" thì chỉ cho trắc nghiệm khi đã rà. Ghi "rà rồi, không có" bằng `-` trong CSV, giống cột `inflections` đang làm. Hệ quả: lúc đầu, khi nội dung chưa có cột này, chỉ có bài gõ từ. Đề xuất mới, chưa trình | 5.2, 7.4 |
| ⚠3 | **Nút sau mỗi câu gọn lại; trang tổng kết có hai danh sách** (từ sai, đúng nhờ gợi ý) | Đã trình trong chat, chưa được trả lời | 7.8 |
| ⚠4 | **"Đã biết" chỉ hiện khi từ đang tới hạn hoặc đang ưu tiên** | Luật Bước 3 (D19): "Đã biết" trước hạn không đổi gì; hiện nút mà bấm không có tác dụng sẽ gây khó hiểu. Đề xuất, chưa được trả lời | 7.8 |
| ⚠5 | **Mục 8–12 (từ hay sai, lịch sử, báo lỗi, dọn dữ liệu, quyền) và mục 13–14 (edge case, tiêu chí) chưa trình trong chat** | Viết thẳng vào doc. Phần lớn đi theo các câu đã chốt, nhưng chi tiết là đề xuất | 8–14 |
| ⚠6 | **Các con số `ASSUMPTION`** | Tối đa 20 câu mỗi phiên (admin chỉnh 5–100); giữ lịch sử 6 tháng (admin chỉnh 3–24; chủ dự án tự đưa số 6, "chưa chắc phù hợp"); mặc định 10 câu; đúng/sai 50/50; phiên bỏ ngang 24 giờ thì tự đóng; định nghĩa làm gợi ý ≤ 200 ký tự (chốt); đáp án ≤ 100 ký tự; ghi chú báo lỗi ≤ 300 ký tự; giới hạn số lần báo lỗi | 5.4, 7, 10 |
| ⚠7 | **Cách A' (cột đồng nghĩa) vẫn có thể sót** | Chủ dự án: "khi triển khai sẽ rà lại kỹ nhất có thể, nên khả năng sẽ làm theo cách này". Sót một từ đồng nghĩa mà nghĩa tiếng Việt khác chữ thì vẫn có thể ra câu hai đáp án đúng; khi đó nút báo lỗi là đường phát hiện | 7.4, 10 |
| ⚠8 | **Cách làm việc** | Chủ dự án "không viết code, chỉ review". Claude hiểu: giữ cách "chủ dự án trả lời trước" như D14 của Bước 3, duyệt hành vi qua bảng ví dụ. Chờ xác nhận | 2 |
| ⚠9 | **Bước 3 chưa xong** | Task 22 của Bước 3 và plan giao diện Bước 3 chưa làm; code Learning, Content có thể còn đổi. Trước khi viết plan Bước 4 phải đọc lại code trên `dev` | 16 |
| ⚠10 | **Việc của nội dung, ngoài app** | Prompt soạn nội dung (D5) cần thêm: cột `synonyms` (hoặc `-`), định nghĩa ≤ 200 ký tự kiểu từ điển cho người học, nghĩa tiếng Việt tách nghĩa con bằng dấu phẩy hoặc chấm phẩy | 5.2, 7.4 |
| ⚠11 | **Đề bài có hiện loại từ** (ví dụ "động từ") | Giúp người học biết cần gõ từ loại nào; định nghĩa tiếng Anh không nằm trong đề vì nó là gợi ý. Đề xuất, chưa trình | 7.3 |
| ⚠12 | **Cách sắp xếp mặc định cho từng nguồn** | Chủ dự án chốt "người học chọn"; bảng mặc định là đề xuất, chưa được trả lời. "Đang ưu tiên" không xếp theo mức được vì mọi từ ưu tiên đều ở mức 1 | 7.1 |

## 1. Mục tiêu và bối cảnh

Bước 4 thêm **bài luyện không AI** để người học kiểm tra mình nhớ từ tới đâu, dồn bài vào chỗ yếu ("từ hay sai"), và từ kết quả
bài làm tự quyết định đưa từ vào ôn ưu tiên. **Bước 4 chỉ làm hệ thống (API)**; giao diện làm sau khi hệ thống ổn định (Chốt).

Thứ tự bước: Bước 3 → Deploy (D3 của Bước 3) → Bước 4. Design này viết sớm, trong lúc Bước 3 còn chưa xong, để tiết kiệm thời gian;
code chỉ bắt đầu sau khi Bước 3 và Deploy xong.

Giả định của chủ dự án (17/10): **nội dung đủ** (đủ nghĩa đã publish để có đáp án nhiễu). Đây là việc của nội dung, không chặn thiết
kế (`ASSUMPTION`).

## 2. Quyết định (tóm tắt)

Đủ chi tiết từng vòng: nhật ký ở [`../reviews/2026-10-17-buoc-4-readiness.md`](../reviews/2026-10-17-buoc-4-readiness.md) mục 8.

| Chủ đề | Chốt |
|---|---|
| Phạm vi | Bước 4 gồm **trắc nghiệm, đúng/sai, gõ từ, "từ hay sai"**, cộng lưu câu và lịch sử |
| Bài điền từ | Do AI tạo, **chuyển sang Bước 7**, là tính năng gói trả phí; Free vẫn có các bài khác (đổi K23) |
| Ngân hàng câu dùng chung | **Bỏ** (đổi K17). Câu đã tạo lưu vào danh sách của chính người học; dùng lại câu AI đã lưu để tới Bước 7 tính |
| Dạng bài mới | Bước 7 (AI): đưa một câu chứa từ, người học chọn đáp án. "Chọn gì" chưa hỏi |
| Đáp án của bài có câu (Bước 7) | Có thể có đáp án thay thế, nhưng **đúng ngữ pháp trong câu là ưu tiên** (không nhận `deploy` cho chỗ cần `deployed`) |
| Một câu chỉ một đáp án đúng | **Không bao giờ có câu có hơn một đáp án đúng**; phải chặn lúc tạo câu |
| Đáp án nhiễu | **A'**: cột từ đồng nghĩa cho từng nghĩa, hệ thống tự chọn, kiểm hai chiều, cộng lọc nghĩa con tiếng Việt |
| Gợi ý | Nấc 1: định nghĩa ngắn **≤ 200 ký tự**, không có thì câu ví dụ đã che từ; nấc 2 (chỉ gõ từ): chữ cái đầu và số chữ. Dùng gợi ý vẫn chấm như thường, hệ thống ghi lại |
| Trong một phiên | Mỗi câu chấm một lần; sai thì hiện đáp án, sang câu tiếp (giữ F40) |
| Làm lại | Người học **chọn từ** để luyện lại ở phiên sau; bài không AI luôn tạo câu mới |
| Lịch sử | Mọi lượt được lưu, lọc theo một ngày; **giữ 6 tháng**; người học **không xóa** được |
| Nguồn phiên | **5 loại**: Hôm nay, Ôn tất cả, Theo nhóm, Từ hay sai, Đang ưu tiên. Bỏ "Chọn từ" và bỏ luyện riêng một từ |
| Sắp xếp | **Người học chọn**; "từ hay sai" mặc định xét theo mức |
| Số câu | Người học chọn; **admin đặt tối đa**, không đặt tối thiểu |
| Chia câu | Đủ từ thì **không lặp**; thiếu từ thì **ôn theo vòng**, hết vòng 1 hỏi "Ôn lại thêm không?" một lần; luôn có nút Dừng |
| Dạng bài | Người học chọn một hoặc nhiều dạng |
| Gợi ý "Cần ôn tập" | Hiện khi **gõ từ sai**. Kết hợp nút "Đã biết" (người học tự bấm) và trang tổng kết cuối phiên |
| "Từ hay sai" | Sai **từ 2 lần trong 5 lượt gần nhất**; tính mọi lượt kể cả trắc nghiệm, đúng/sai, kể cả luyện lại; **lượt đúng nhờ gợi ý không tính**; dùng gợi ý thì không lên mức |
| Báo lỗi | **Có** nút báo lỗi (lý do + ghi chú), lưu cho staff xem; lượt bị báo không tính vào "từ hay sai" |
| Quyền `practice.basic` | **B**: Bước 4 làm sẵn chỗ kiểm, tạm luôn "được phép"; Bước 5 thay phần bên trong |
| Nền tảng | **Chỉ API**; giao diện làm sau |
| Phiên luyện | **Server giữ phiên** (hướng 1) |
| Cách làm việc | Chủ dự án không viết code, chỉ review (⚠8) |
| "Xong khi" | Xong toàn bộ task của plan và test thành công: CI xanh trên PR và script chạy qua API thật trên DB mới |
| Implement | **Các phiên khác implement, cùng một phiên điều phối**; plan có mục brief cho phiên điều phối |

## 3. Phạm vi

**Làm:** module `Practice` trong `apps/api`; thay đổi nhỏ ở Content (cột từ đồng nghĩa, truy vấn đáp án nhiễu, che từ trong câu ví
dụ), Learning (cho Practice đọc danh sách từ và ghi "Cần ôn tập", "Đã biết"), Settings (hai cài đặt), chỗ kiểm quyền tạm; job dọn
dữ liệu; script kiểm qua API thật.

**Không làm:** giao diện (web người học, màn admin báo lỗi); bài AI (điền từ, "câu chứa từ rồi chọn"); quyền và hạn mức thật
(Bước 5); xóa tài khoản (Bước 8); Flutter.

**Đổi so với spec Practice** (spec chỉ là khung; ghi để truy nguồn, không sửa spec):

| Spec | Design Bước 4 | Vì sao |
|---|---|---|
| PRC16, PRC17, Q24, Q25, LR6: bài làm gửi `remembered`/`forgotten`, tự đổi lịch | Bài làm **không** tự đổi lịch; người học tự bấm "Cần ôn tập" hoặc "Đã biết" | D16 của Bước 3 |
| PRC20: lọc ba trạng thái; nguồn "hôm nay" chung; thứ tự cố định | 5 nguồn; người học chọn cách sắp xếp; trạng thái là mức 0–5 + cờ ưu tiên | D17, D20 của Bước 3; câu 3, 4 |
| PRC14, bất biến (1): mỗi câu một lượt | Giữ trong một phiên; bảng cho phép một câu nhiều lượt (để Bước 7 dùng lại câu AI) | Câu 1 |
| PRC24: xóa câu chưa trả lời sau 30 ngày | Câu tạo từng câu khi app xin; mọi dữ liệu giữ theo số tháng lịch sử | Câu 11 |
| PRC4, K23: bài từ câu người học không AI, cho Free | Chuyển sang Bước 7, AI, gói trả phí | Câu 1 |
| PRC5, PRC8, K17: ngân hàng câu AI dùng chung | Bỏ; câu lưu theo từng người | Câu 1 |
| PRC3: chọn đáp án nhiễu tự động | Thêm cột đồng nghĩa, kiểm hai chiều, lọc nghĩa con, bỏ dạng chia của nhau | Câu 1 |
| PRC2: đề bài kèm định nghĩa tiếng Anh | Định nghĩa thành gợi ý | Câu 1 |
| PRC18, F40: nút báo lỗi | Giữ, cho bài không AI, lý do theo lỗi nội dung | Câu 9 |

## 4. Kiến trúc

```
                ┌────────────── Practice (mới) ──────────────┐
                │ phiên luyện · câu hỏi · lần hỏi · báo lỗi  │
                └──┬──────────┬──────────┬──────────┬────────┘
                   │          │          │          │
             Learning     Content    Settings   Kiểm quyền (tạm)
```

Practice chỉ gọi module khác qua service được export, theo quy ước D3 (mỗi module sở hữu file `prisma/models/<module>.prisma`; không
`@relation` qua ranh giới module; tham chiếu chéo là cột UUID).

| Module | Practice cần | Mới hay có sẵn |
|---|---|---|
| Learning | Danh sách từ cho 4 nguồn (Hôm nay, Ôn tất cả, Theo nhóm, Đang ưu tiên), kèm mức, ngày hẹn, cờ ưu tiên, thời điểm bấm "Cần ôn tập" gần nhất | Mới: hàm export. Hôm nay dùng lại cách tính danh sách ôn và trần của Bước 3 |
| Learning | Ghi "Cần ôn tập", "Đã biết" từ bài làm **không cần nhóm**, khóa chống trùng là ID lần hỏi, nhật ký ghi `origin = practice` | Mới: hàm export dùng lại luật `applyAnswer` của Bước 3. Hiện Learning chỉ export `LearningService.cardsLeftToday` |
| Learning | Kiểm một nghĩa còn trong việc học của người học không | Mới hoặc dùng `states` có sẵn (kiểm khi viết plan) |
| Content | Nội dung để ra đề và hiện sau khi nộp | Có sẵn: `ContentService.cardContent` (`WordSense`) |
| Content | Đáp án được chấp nhận: chính từ đó, cách viết khác có `accepted_as_answer`, `accepted_forms` | Có sẵn trong bảng; cần một hàm đọc |
| Content | Ứng viên đáp án nhiễu | Mới: truy vấn (mục 7.4) |
| Content | Câu ví dụ đã che từ cho gợi ý | Mới: hàm dùng bảng dạng chia `entry_inflections` và cách viết khác |
| Content | Nghĩa nào người học được thấy | Có sẵn: `visibleSenseCondition`, `visibleSenseIds` |
| Settings | `practice.max_questions_per_session`, `practice.history_months` | Mới: nhóm cài đặt `practice` |
| Kiểm quyền | `practice.basic` | Mới: chỗ kiểm tạm, luôn "được phép" (mục 12) |
| Bảo trì | Job dọn hằng ngày | Có sẵn: `MaintenanceScheduler` (đang dọn `idempotency-keys`) |

## 5. Dữ liệu

### 5.1 Practice (`practice.prisma`, mới)

Mọi bảng có `user_id`; `sense_id`, `group_id` là UUID thường, không khóa ngoại sang module khác.

| Bảng | Mỗi dòng | Cột chính | Ràng buộc, index |
|---|---|---|---|
| `practice_sessions` | Một phiên | `id`, `user_id`, `source` (`today` / `all` / `group` / `weak` / `priority`), `group_id`, `group_filter` (`all` / `due` / `priority` / `0`…`5`), `sort`, `types` (mảng), `target_count`, `sense_ids` (vòng 1, đúng thứ tự đã sắp), `status` (`active` / `waiting_continue` / `finished` / `abandoned`), `continued` (null / true / false), `started_at`, `last_activity_at`, `ended_at` | Unique một phần: mỗi `user_id` tối đa một phiên ở `active` hoặc `waiting_continue` |
| `practice_questions` | Nội dung một câu, lưu nguyên lúc tạo | `id`, `user_id`, `sense_id`, `type` (`mcq_definition` / `true_false_definition` / `type_word`), `schema_version`, `prompt` (phần người học thấy), `answer_key` (đáp án chính, đáp án thay thế, phiên bản chuẩn hóa; với trắc nghiệm là vị trí đúng; với đúng/sai là đúng hay sai), `hints` (nội dung từng nấc), `distractor_sense_ids`, `created_at` | `answer_key` và `hints` không bao giờ gửi xuống app trước khi nộp hoặc xin gợi ý |
| `practice_session_items` | Một lần hỏi trong phiên, cùng câu trả lời | `id`, `session_id`, `user_id`, `question_id`, `sense_id`, `round`, `position`, `asked_at`, `answered_at`, `answer_raw`, `answer_normalized`, `result` (`correct` / `wrong`), `hint_level` (0, 1, 2), `local_date` (ngày làm theo múi giờ người học), `review_action` (`needs_review` / `known` / null) | Unique `(session_id, position)`; index `(user_id, sense_id, answered_at)` cho "5 lượt gần nhất"; index `(user_id, local_date)` cho lịch sử theo ngày |
| `practice_reports` | Một báo cáo lỗi | `id`, `user_id`, `item_id` (null khi lần hỏi đã bị dọn), `sense_id`, `question_snapshot` (bản sao câu hỏi và câu trả lời), `reason` (`meaning_wrong` / `graded_wrong` / `hint_wrong` / `other`), `note` (≤ 300 ký tự), `status` (`open` / `no_error` / `fixed`), `resolved_by`, `resolved_at`, `created_at` | Unique `item_id` (mỗi lần hỏi báo một lần); index `(status, created_at)` |

- **Vì sao tách "câu hỏi" và "lần hỏi" (Đề xuất, đã duyệt):** ở Bước 4 mỗi lần hỏi đi kèm một câu mới. Bước 7 dùng lại một câu AI đã
  lưu bằng cách thêm một lần hỏi mới trỏ về câu cũ, không đổi cấu trúc bảng.
- **Không có bảng "lượt làm bài" riêng:** một lần hỏi đã có câu trả lời chính là một lượt.
- **Đáp án gốc** chỉ nằm trong DB, không bao giờ vào log (SR9).

### 5.2 Content (mở rộng)

- **`sense_revisions.synonyms`** (mới, mảng chữ, **cho phép null**): từ đồng nghĩa của nghĩa đó. Cách chuẩn hóa giống `accepted_forms`
  (bỏ trùng không phân biệt hoa thường, bỏ chính từ đó).
  - ⚠2 **null = chưa rà; mảng rỗng = đã rà, không có từ đồng nghĩa.** Trong CSV: cột `synonyms`, ngăn bằng `;`; ô `-` = đã rà, không
    có (cùng quy ước với cột `inflections` hiện có, `row-normalizer.ts`). Ô trống giữ theo luật ô trống hiện có của luồng CSV (kiểm khi
    viết plan). Có trong file xuất và trong API soạn nội dung (`content-body.ts`).
  - Từ riêng: luôn null (không ai rà), nên không có trắc nghiệm (⚠1).
- Không thêm luật chặn độ dài định nghĩa khi import: định nghĩa dài vẫn hợp lệ, chỉ không dùng làm gợi ý (mục 7.7).

### 5.3 Learning (mở rộng)

- **`learning_log.origin`** (mới, null được): `practice` khi bấm từ bài làm; null như hiện nay cho flashcard. `group_id` của dòng nhật
  ký từ bài làm để null (cột này đã cho phép null). `review_id` = ID lần hỏi, nên bấm hai lần chỉ tính một.
- Cách sắp xếp "Đang ưu tiên: bấm Cần ôn tập lâu nhất trước" lấy thời điểm từ nhật ký (dòng `review` với `answer = review` mới nhất của
  mục học); không thêm cột.

### 5.4 Settings (mở rộng)

Thêm nhóm `practice` vào `settings.definitions.ts` (cùng cách nhóm `reminders`, `learning`):

| Cài đặt | Mặc định | Khoảng admin chỉnh | Nhãn |
|---|---|---|---|
| `max_questions_per_session` | 20 | 5–100 | ASSUMPTION |
| `history_months` | 6 | 3–24 | 6 là số chủ dự án đưa; khoảng là ASSUMPTION |

Người học chọn số câu từ 1 tới `max_questions_per_session`, mặc định `min(10, tối đa)` (ASSUMPTION).

## 6. Luồng một phiên và API (Đề xuất, đã duyệt)

```
Bắt đầu phiên ─► Xin câu tiếp theo ─► (có thể xin gợi ý) ─► Nộp đáp án ─► Kết quả
                       ▲                                                   │
                       └──── còn câu ◄── (bấm "Cần ôn tập"/"Đã biết") ◄────┘
                       │
         hết vòng 1, thiếu từ ─► "Ôn lại thêm không?" ─► Ôn lại → vòng 2…
                       │                                  Kết thúc ─┐
         đủ số câu hoặc bấm Dừng ───────────────────────────────────┴─► Tổng kết
```

API người học, dưới `/v1/practice` (Problem Details, phân trang `page_size` + `page_token`, giới hạn ghi `user.write` như Learning):

| # | API | Khóa chống trùng | Làm gì |
|---|---|---|---|
| 1 | `POST /sessions` | `Idempotency-Key` | Body: `source`, `group_id`, `group_filter`, `sort`, `types`, `count`. Kiểm quyền (mục 12), đóng phiên đang mở (`abandoned`), chọn từ vòng 1 (mục 7.1). Không có từ dùng được → lỗi `practice-no-words` kèm lý do (`group-empty`, `no-word-fits-types`, `source-empty`) |
| 2 | `GET /sessions/current` | — | Phiên đang mở (để tải lại vẫn làm tiếp) hoặc 404 |
| 3 | `POST /sessions/{id}/next` | Tự nhiên | Lần hỏi tiếp theo. Câu tạo **lúc này**. Nếu lần hỏi trước chưa trả lời thì trả lại đúng lần hỏi đó. Có thể trả `waiting_continue` hoặc `finished` thay vì câu. Trả: `item_id`, `round`, `position`, `type`, `prompt`, các nấc gợi ý có |
| 4 | `POST /items/{id}/hint` | Tự nhiên | Body `level` (1 hoặc 2). Trả nội dung gợi ý, ghi nấc cao nhất đã xem. Sau khi nộp → lỗi `already-answered`; nấc 2 cho bài không phải gõ từ, hoặc nấc không có → lỗi `hint-unavailable` |
| 5 | `POST /items/{id}/answer` | `Idempotency-Key` | Body: lựa chọn (trắc nghiệm), đúng/sai, hoặc chữ (gõ từ). Trả: `result`, đáp án đúng, nghĩa, định nghĩa, `hint_level`, và **cờ cho giao diện**: `show_known`, `highlight_needs_review` (mục 7.8) |
| 6 | `POST /items/{id}/review` | ID lần hỏi | Body `action` (`needs_review` / `known`). Gọi Learning. Mỗi lần hỏi một lần bấm; lần đầu có hiệu lực |
| 7 | `POST /sessions/{id}/continue` | Tự nhiên | Body `continue` (true / false), chỉ khi `waiting_continue` |
| 8 | `POST /sessions/{id}/finish` | Tự nhiên | Nút Dừng → `finished` |
| 9 | `GET /sessions/{id}/summary` | — | Số câu, số đúng, số sai; danh sách **từ sai** (mọi dạng) và **đúng nhờ gợi ý**; từ nào đã bấm gì |
| 10 | `POST /sessions/{id}/review-all-wrong` | `Idempotency-Key` | "Cần ôn tập" cho mọi từ sai chưa bấm; trả số từ đã đưa vào |
| 11 | `GET /weak-words` | — | "Từ hay sai" kèm lý do (mục 8) |
| 12 | `GET /history?date=&sense_id=` | — | Lịch sử, mới nhất trước (mục 9) |
| 13 | `POST /items/{id}/report` | Unique theo lần hỏi | Báo lỗi (mục 10) |

API staff, quyền `content.edit`: `GET /v1/admin/practice/reports?status=` và `POST /v1/admin/practice/reports/{id}/resolve` (mục 10).

**Lỗi chính:** đáp án rỗng hoặc > 100 ký tự → `400 validation-failed`, không tính sai, không ghi lượt (PRC12). Nộp lần hỏi đã trả lời
bằng khóa khác → `409 already-answered` kèm kết quả đã lưu (PRC15). "Đã biết" khi không được phép → `409 known-not-allowed`. Từ đã bỏ
khỏi việc học → `409 not-in-learning`. Phiên đã đóng → `409 session-closed`. Lần hỏi hoặc phiên của người khác → `404`.

## 7. Thuật toán

### 7.1 Chọn từ cho phiên (Chốt: nguồn, sắp xếp do người học chọn, đủ từ không lặp)

1. **Lấy từ theo nguồn:**

| Nguồn | Gồm |
|---|---|
| Hôm nay | Thẻ đang có hôm nay ở mọi nhóm, **sau khi áp trần** (cùng con số trang chủ hiện, mục 6.2–6.3 của design Bước 3); một từ ở hai nhóm tính một lần. Luyện **không** tiêu trần, vì bài làm không đổi lịch |
| Ôn tất cả | Mọi mục học của người học |
| Theo nhóm | Một nhóm, lọc `all` / `due` (danh sách ôn hôm nay của nhóm) / `priority` / mức `0`…`5` |
| Từ hay sai | Danh sách mục 8 |
| Đang ưu tiên | Mục học có cờ ưu tiên |

2. Loại nghĩa người học không còn thấy được (bị gỡ, retire; `visibleSenseCondition`).
3. Loại từ không làm được dạng bài nào trong các dạng đã chọn (mục 7.3).
4. Sắp xếp theo cách người học chọn; hai từ ngang nhau thì bốc ngẫu nhiên.
5. Lấy tối đa `count` từ đầu → `sense_ids` của phiên.

**Cách sắp xếp** (người học chọn khi mở phiên; bảng mặc định là Đề xuất, chưa được trả lời, ⚠12):

| Cách | Ý nghĩa |
|---|---|
| `level_asc` | Mức thấp trước |
| `overdue_first` | Quá hạn lâu nhất trước |
| `new_first` | Mức 0 trước |
| `least_practiced` | Chưa luyện bao giờ, hoặc luyện lâu nhất, trước (từ lần hỏi đã trả lời của Practice) |
| `most_wrong` | Sai nhiều nhất trong 5 lượt tính gần nhất trước |
| `queue` | Ưu tiên → đến hạn → mới, như phiên ôn flashcard |
| `priority_oldest` | Bấm "Cần ôn tập" lâu nhất trước |
| `random` | Ngẫu nhiên |

| Nguồn | Mặc định |
|---|---|
| Từ hay sai | `level_asc` (Chốt: "từ hay sai thì xét theo mức") |
| Đang ưu tiên | `priority_oldest`. Mọi từ đang ưu tiên đều ở mức 1 (bấm "Cần ôn tập" đưa về mức 1, `schedule.ts`), nên xếp theo mức không phân biệt được |
| Hôm nay, Theo nhóm | `queue` |
| Ôn tất cả | `least_practiced` |

### 7.2 Chia câu theo vòng (Chốt)

- **Vòng 1:** mỗi từ trong `sense_ids` một câu, theo thứ tự đã sắp.
- Đủ số câu trong vòng 1 → phiên xong.
- Thiếu (số từ < số câu) → hết vòng 1 phiên chuyển `waiting_continue`, app hiện **một lần** "Bạn đã làm hết X từ của nhóm này. Ôn lại
  thêm không?". [Ôn lại] → vòng 2, 3… cho tới đủ số câu, không hỏi lại; [Kết thúc] → `finished`.
- **Vòng ≥ 2:** các từ đó theo thứ tự xáo ngẫu nhiên; khi có ≥ 2 từ, từ đầu vòng mới không trùng từ cuối vòng trước (để không có hai
  câu liền nhau cùng một từ); mỗi câu ưu tiên dạng bài khác lần trước của từ đó trong phiên; trắc nghiệm thì đổi đáp án nhiễu.
- Nút Dừng có mọi lúc.
- Trước khi tạo mỗi câu: nếu nghĩa đã không còn thấy được hoặc (với nguồn dựa trên việc học) không còn trong việc học → bỏ qua từ đó
  trong phiên.

### 7.3 Dạng bài của mỗi câu

Bốc ngẫu nhiên trong các dạng người học đã chọn mà từ đó làm được.

| Dạng | Từ làm được khi |
|---|---|
| Gõ từ | Luôn làm được |
| Trắc nghiệm | Có ≥ 3 ứng viên đáp án nhiễu (mục 7.4) **và** nghĩa đã rà từ đồng nghĩa (⚠2) |
| Đúng/sai | Có ≥ 1 ứng viên **và** nghĩa đã rà từ đồng nghĩa (⚠2) |
| — | Từ chức năng (`isFunctionWordPos` hoặc cờ ghi đè): chỉ gõ từ (Đề xuất, đã duyệt) |
| — | ⚠1 Từ riêng: chỉ gõ từ |

**Đề bài:** nghĩa theo ngôn ngữ của người học (như thẻ flashcard, `cardContent`), nhãn ngữ cảnh nếu có, và **loại từ** (⚠11, Đề xuất, chưa
trình). Định nghĩa tiếng Anh không nằm trong đề; nó là gợi ý.

### 7.4 Đáp án nhiễu (Chốt)

Ví dụ: từ cần hỏi `deploy`, động từ, B1, nghĩa "triển khai (phần mềm)", từ đồng nghĩa `roll out; launch`.

1. **Tập ứng viên:** nghĩa catalog đã publish. Không bao giờ lấy từ riêng.
2. **Loại** ứng viên:

| Loại nếu | Ví dụ |
|---|---|
| Khác loại từ | `deployment` (danh từ) |
| Là từ chức năng | `the`, `of` |
| Cùng chữ, không phân biệt hoa thường | nghĩa khác của `deploy` |
| Là dạng chia của từ cần hỏi, hoặc ngược lại (`form_of_entry_id`, D29) | `deployed` |
| Có trong `synonyms` của từ cần hỏi, hoặc `synonyms` của nó có từ cần hỏi | `launch` |
| Chung một nghĩa con tiếng Việt (tách theo `,` `;`, bỏ phần trong ngoặc, chữ thường) | `implement` "triển khai, thực hiện" |

3. **Level** (thứ tự A1 → C2, `LEVELS`): trong ±1 bậc → thiếu 3 thì ±2 → thiếu thì bỏ điều kiện level → vẫn < 3 thì không có trắc
   nghiệm cho từ đó.
4. **Bốc ngẫu nhiên** 3 ứng viên không trùng chữ nhau; xáo vị trí 4 lựa chọn.

### 7.5 Đúng/sai (Chốt)

Bốc 50/50 (ASSUMPTION): cặp đúng (từ, nghĩa của nó) hoặc cặp sai (từ, nghĩa của **một** ứng viên ở mục 7.4). Ứng viên đã qua mọi bộ
lọc nên cặp sai chắc chắn sai.

### 7.6 Chấm (Chốt)

- Trắc nghiệm: so vị trí đã chọn với `answer_key`. Đúng/sai: so true/false.
- Gõ từ: chuẩn hóa (NFC, cắt khoảng trắng, gộp khoảng trắng liên tiếp, dấu nháy cong → thẳng, chữ thường), rồi so khớp đúng từng chữ với
  đáp án chính (chính từ đó) và đáp án thay thế (cách viết khác có `accepted_as_answer`, `accepted_forms`), cũng đã chuẩn hóa như vậy.
  Sai chính tả là sai. Không có luật contraction chung; chỉ nhận dạng có trong danh sách (PRC11).

Bảng ví dụ để duyệt hành vi (từ `analyze`, cách viết `analyse` được bật):

| Người học gõ | Kết quả |
|---|---|
| `  Analyse ` | Đúng |
| `analyze` | Đúng |
| `ANALYZE` | Đúng |
| `analyzed` | Sai (không có trong danh sách) |
| `analise` | Sai (sai chính tả) |
| trống, hoặc > 100 ký tự | Lỗi nhập, không tính là sai, không ghi lượt |

Với từ có `accepted_forms` chứa `I'm`: gõ `I’m` (nháy cong) → Đúng.

### 7.7 Gợi ý (Chốt)

| Nấc | Nội dung | Dạng bài |
|---|---|---|
| 1 | Định nghĩa tiếng Anh nếu có và ≤ 200 ký tự. Nếu không, hoặc nếu nghĩa trong đề đã chính là định nghĩa tiếng Anh: **câu ví dụ đầu tiên có chứa từ** (so cả dạng chia trong `entry_inflections` và cách viết khác, nguyên token, không phân biệt hoa thường), che mọi chỗ khớp bằng `___`. Không câu nào khớp → không có nấc 1 | Mọi dạng |
| 2 | Chữ cái đầu và số chữ: `d _ _ _ _ _ (6 chữ)` | Chỉ gõ từ |

Nội dung gợi ý tính sẵn khi tạo câu (`hints`), chỉ gửi xuống khi người học xin. Từ riêng không có định nghĩa và câu ví dụ, nên chỉ có
nấc 2.

### 7.8 Nút sau mỗi câu và trang tổng kết (⚠3, ⚠4: đã trình, chưa được trả lời)

| Tình huống | `highlight_needs_review` | `show_known` |
|---|---|---|
| Gõ từ sai | true | false |
| Đúng, không dùng gợi ý, từ đang tới hạn hoặc đang ưu tiên | false | true |
| Đúng nhờ gợi ý | false | false (Chốt: dùng gợi ý thì không lên mức) |
| Trắc nghiệm hoặc đúng/sai mà sai | false | false |
| Đúng nhưng từ chưa tới hạn (D19: "Đã biết" trước hạn không đổi gì) | false | false |
| Từ không còn trong việc học | false | false |

Trang tổng kết: **từ sai** (mọi dạng) và **đúng nhờ gợi ý**, mỗi từ có nút "Cần ôn tập"; thêm nút "Đưa tất cả từ sai vào ưu tiên"
(API 10). "Cần ôn tập" từ tổng kết vẫn dùng ID lần hỏi làm khóa, nên không trùng với lần bấm ngay sau câu.

"Cần ôn tập" và "Đã biết" áp đúng luật Bước 3 (`applyAnswer`): "Cần ôn tập" → mức 1, hẹn hôm nay, bật ưu tiên; "Đã biết" khi tới hạn
hoặc ưu tiên → lên một mức, hẹn theo thang 1/3/7/14/30, bỏ ưu tiên.

## 8. "Từ hay sai" (Chốt luật; chi tiết là Đề xuất ⚠5)

- **Lượt được tính** của một nghĩa: lần hỏi đã trả lời, **trừ** (a) lượt đúng mà `hint_level > 0` (Chốt 10c), (b) lượt có báo cáo
  đang `open` hoặc đã `fixed` (Chốt câu 9: lượt bị báo không tính). Báo cáo kết luận `no_error` → lượt được tính lại. Lượt sai có
  dùng gợi ý vẫn tính là sai.
- Một nghĩa là **yếu** khi trong **5 lượt được tính gần nhất** có **≥ 2 lượt sai** (Chốt 10b). Mọi dạng bài đều tính, cả đúng lẫn sai
  (Chốt 10a); lượt luyện lại ở phiên sau cũng tính.
- Chỉ xét lượt còn giữ (mục 11): một từ không luyện tới trong `history_months` tự rời danh sách.
- **Chỉ gồm nghĩa còn trong việc học và còn thấy được** (Đề xuất): từ đã "Bỏ khỏi việc học" không nằm trong danh sách.
- Thứ tự trả về của `GET /weak-words`: lần sai gần nhất trước; mỗi dòng kèm lý do "sai 3 trong 5 lần gần nhất" và mức hiện tại.

Bảng ví dụ (mới nhất bên phải; Đ = đúng, S = sai, Đg = đúng nhờ gợi ý):

| Các lượt | 5 lượt được tính gần nhất | Yếu? |
|---|---|---|
| S, S | S, S | Có |
| S, S, Đ, Đ, Đ | S, S, Đ, Đ, Đ | Có |
| S, S, Đ, Đ, Đ, Đ | S, Đ, Đ, Đ, Đ | Không |
| S, S, Đg, Đg, Đg, Đg | S, S (lượt Đg không tính) | Có |
| S (báo lỗi, đang chờ), S | S | Không (chỉ 1 lượt sai được tính) |

## 9. Lịch sử (Chốt: lọc theo ngày, giữ 6 tháng, không xóa)

`GET /v1/practice/history`: lần hỏi đã trả lời, mới nhất trước, phân trang. Lọc `date` (một ngày theo múi giờ người học, so với
`local_date`) và/hoặc `sense_id`. Mỗi dòng: từ, dạng bài, đề, đáp án người học, đáp án đúng, đúng/sai, nấc gợi ý đã xem, đã bấm gì,
thời điểm. Người học không xóa được; dữ liệu tự xóa sau `history_months` (mục 11).

## 10. Báo lỗi (Chốt: cách b; chi tiết là Đề xuất ⚠5)

- **Người học** (`POST /items/{id}/report`): lý do `meaning_wrong` (nghĩa sai), `graded_wrong` (đáp án đúng mà bị chấm sai),
  `hint_wrong` (gợi ý sai), `other`; ghi chú tùy chọn ≤ 300 ký tự. Báo được lần hỏi trong phiên của mình, kể cả trước khi trả lời. Mỗi
  lần hỏi một lần (báo lại → `409` kèm báo cáo cũ). Giới hạn tần suất riêng cho báo lỗi (ASSUMPTION: 20 báo cáo mỗi giờ mỗi người).
- **Kết quả đã chấm giữ nguyên**, không chấm lại.
- **Staff** (quyền `content.edit`: `admin`, `editor`; không tạo quyền mới vì lỗi là lỗi nội dung và người sửa nội dung xử lý báo cáo):
  danh sách lọc theo `status`, mỗi dòng có bản sao câu hỏi, đáp án người học, lý do, ghi chú; **không** có email hay tên người báo.
  `resolve` với `no_error` (lượt được tính lại) hoặc `fixed` (staff đã sửa nội dung bằng công cụ soạn có sẵn; lượt tiếp tục không
  tính). Ghi `resolved_by`, `resolved_at`.
- Màn hình admin làm cùng đợt giao diện (Chốt câu 2). Trước đó chưa có người học thật nên chưa có báo cáo phải xử lý.

## 11. Dọn dữ liệu và phiên bỏ dở (Đề xuất ⚠5)

Đăng ký với `MaintenanceScheduler`, chạy hằng ngày:

- Xóa lần hỏi có `asked_at` cũ hơn `history_months`; xóa câu hỏi không còn lần hỏi nào trỏ tới; xóa phiên đã kết thúc cũ hơn mốc đó.
  Báo cáo giữ tới khi được xử lý (đã có `question_snapshot`); `item_id` của báo cáo về null khi lần hỏi bị xóa. Báo cáo đã xử lý cũ hơn
  mốc đó cũng bị xóa.
- Phiên `active` hoặc `waiting_continue` không hoạt động quá 24 giờ (ASSUMPTION) → `abandoned`. Ngoài job, phiên cũ cũng được đóng ngay
  khi người học mở phiên mới hoặc thao tác lên nó.
- **Xóa từ riêng** (CR23, luật đã có từ Bước 3): Practice xóa câu hỏi, lần hỏi, báo cáo của nghĩa đó **trong cùng transaction** với
  `deleteMyWord` của Learning; vì câu hỏi có lưu nghĩa riêng.

## 12. Quyền (Chốt: B)

- Module mới `entitlements` (ranh giới cho Bước 5) export một hàm kiểm quyền theo feature; Bước 4 trả "được phép" cho `practice.basic`
  với mọi người dùng đã đăng nhập. Bước 5 thay phần bên trong, không sửa Practice.
- Practice kiểm khi **bắt đầu phiên** và khi **tạo mỗi câu**; **không** kiểm khi chấm (ER4: câu đã tạo vẫn nộp được).
- Người học đã đăng nhập, email chưa xác minh: dùng chung luật truy cập của Learning (kiểm khi viết plan).

## 13. Edge cases (When → Then)

| # | When | Then |
|---|---|---|
| B4E1 | Hai tab cùng gọi `next` một lúc | Khóa dòng phiên; chỉ một lần hỏi mới được tạo ở vị trí đó (unique `(session_id, position)`); tab kia nhận đúng lần hỏi đó |
| B4E2 | Hai máy cùng nộp một lần hỏi, đáp án khác nhau | Chỉ ghi khi `answered_at` còn null; đúng một bên ghi được, bên kia nhận `409 already-answered` kèm kết quả đã lưu |
| B4E3 | Gửi lại cùng `Idempotency-Key`, cùng đáp án | Trả đúng kết quả đã lưu, không chấm lại |
| B4E4 | Cùng `Idempotency-Key`, đáp án khác | Từ chối theo luật khóa chống trùng chung (SR8) |
| B4E5 | Mở phiên mới khi đang có phiên mở ở thiết bị khác | Phiên cũ `abandoned`; thiết bị cũ thao tác tiếp → `409 session-closed` |
| B4E6 | Nghĩa bị retire hoặc gỡ publish giữa phiên | Câu đã tạo vẫn chấm theo bản lưu; câu sau bỏ qua từ đó |
| B4E7 | Từ bị "Bỏ khỏi việc học" giữa phiên | Câu đã tạo vẫn chấm; `show_known`, `highlight_needs_review` false; `review` → `409 not-in-learning`; câu sau bỏ qua từ đó |
| B4E8 | Từ riêng bị xóa giữa phiên | Lần hỏi của nó bị xóa cùng transaction; `next` bỏ qua; thao tác lên lần hỏi đã xóa → `404` |
| B4E9 | Bấm "Đã biết" khi từ chưa tới hạn, hoặc lần hỏi có dùng gợi ý | `409 known-not-allowed`, không ghi nhật ký |
| B4E10 | Bấm "Cần ôn tập" hai lần cho một lần hỏi, hoặc bấm ở tổng kết sau khi đã bấm ngay sau câu | Một lần ghi (khóa là ID lần hỏi); lần sau trả kết quả đã có |
| B4E11 | Bấm "Cần ôn tập" rồi "Đã biết" cho cùng lần hỏi | Lần bấm đầu có hiệu lực; lần sau → `409` |
| B4E12 | Xin gợi ý sau khi đã nộp | `409 already-answered` |
| B4E13 | Xin nấc 2 cho trắc nghiệm, hoặc nấc 1 khi không có | `409 hint-unavailable` |
| B4E14 | Nguồn "Hôm nay" khi người học đã ôn hết phần hôm nay | Không có từ → `practice-no-words` / `source-empty` |
| B4E15 | Chọn chỉ trắc nghiệm, nhóm toàn từ riêng hoặc từ chức năng | `practice-no-words` / `no-word-fits-types` |
| B4E16 | Từ có ít hơn 3 ứng viên dù đã bỏ điều kiện level | Trắc nghiệm không khả dụng cho từ đó; nếu người học chỉ chọn trắc nghiệm, từ bị bỏ qua và lấy từ kế tiếp |
| B4E17 | Đổi múi giờ giữa phiên | `local_date` của mỗi lượt tính theo múi giờ lúc nộp |
| B4E18 | Admin giảm `max_questions_per_session` dưới số câu của một phiên đang mở | Phiên đang mở giữ số câu cũ; phiên mới bị giới hạn theo số mới |
| B4E19 | Admin giảm `history_months` | Lần chạy job kế tiếp xóa theo mốc mới |
| B4E20 | Báo lỗi một lần hỏi đã báo | `409` kèm báo cáo cũ |
| B4E21 | Lần hỏi bị dọn khi báo cáo của nó chưa xử lý | Báo cáo giữ, `item_id` null, staff vẫn xem được nhờ `question_snapshot` |
| B4E22 | `next` khi phiên `waiting_continue` | Trả trạng thái `waiting_continue`, không tạo câu |
| B4E23 | Server lỗi khi đang ghi câu trả lời | Transaction rollback, không có "sai" do lỗi hệ thống; gửi lại cùng khóa là lần thực hiện mới |
| B4E24 | Nghĩa đã rà đồng nghĩa (`[]`) nhưng có ứng viên mà nghĩa của nó liệt kê từ cần hỏi trong `synonyms` | Bị loại (kiểm hai chiều) |

## 14. Acceptance criteria (When → Then)

| # | When | Then |
|---|---|---|
| B4#1 | Bắt đầu phiên Theo nhóm, nhóm 30 từ, 10 câu, `level_asc` | Phiên có 10 từ mức thấp nhất, mỗi từ một câu, không từ nào lặp |
| B4#2 | Nhóm 2 từ, 10 câu | Sau câu 2 phiên `waiting_continue`; `continue=true` → câu 3–10 xoay quanh 2 từ, không hai câu liền nhau cùng từ khi có ≥ 2 từ, vòng sau đổi dạng bài khi được; `continue=false` → `finished` với 2 câu |
| B4#3 | Tạo câu trắc nghiệm cho `deploy` | 4 lựa chọn, đúng một là `deploy`; 3 đáp án nhiễu cùng loại từ, không phải từ chức năng, không cùng chữ, không là dạng chia, không trong `synonyms` hai chiều, không chung nghĩa con tiếng Việt, level gần nhất có thể |
| B4#4 | Gọi `next` rồi đọc payload | Không có `answer_key`, không có nội dung gợi ý |
| B4#5 | Gõ `  Analyse ` cho `analyze` có cách viết `analyse` | Đúng |
| B4#6 | Gõ `analyzed` | Sai; trả đáp án đúng, nghĩa, định nghĩa |
| B4#7 | Đáp án rỗng | `400`, không ghi lượt |
| B4#8 | Gõ từ sai | `highlight_needs_review = true` |
| B4#9 | Đúng không gợi ý, từ tới hạn | `show_known = true`; bấm → mức +1, hẹn theo thang, bỏ ưu tiên; nhật ký `origin = practice`, `group_id` null |
| B4#10 | Đúng nhờ gợi ý | `show_known = false`; lượt không tính vào "từ hay sai" |
| B4#11 | `review-all-wrong` sau phiên có 3 từ sai, 1 từ đã bấm | 2 từ được đưa vào ưu tiên |
| B4#12 | Một nghĩa có S, S trong lịch sử | Có trong `GET /weak-words` với lý do "sai 2 trong 2 lần gần nhất" |
| B4#13 | Thêm 4 lượt đúng không gợi ý | Rời danh sách |
| B4#14 | Báo lỗi một lượt sai; staff `no_error` | Trong lúc chờ: lượt không tính; sau `no_error`: tính lại |
| B4#15 | `GET /history?date=2026-11-08` | Chỉ lượt có `local_date` ngày đó, của chính người gọi |
| B4#16 | Job dọn chạy với đồng hồ giả qua mốc 6 tháng | Lần hỏi, câu hỏi, phiên cũ bị xóa; báo cáo chưa xử lý còn |
| B4#17 | Staff không có `content.edit` gọi API báo lỗi admin | `403` |
| B4#18 | Từ riêng trong nhóm, chọn cả ba dạng | Từ đó chỉ ra câu gõ từ |
| B4#19 | Nghĩa có `synonyms` null | Không có trắc nghiệm, đúng/sai cho nghĩa đó |
| B4#20 | Mở phiên mới khi có phiên đang mở | Phiên cũ `abandoned` |
| B4#21 | `GET /sessions/current` sau khi tải lại | Trả phiên đang mở và lần hỏi chưa trả lời (nếu có) |
| B4#22 | Người học xóa từ riêng đã luyện | Câu hỏi, lần hỏi, báo cáo của nghĩa đó bị xóa cùng transaction |

**Test và "Xong khi" (Chốt câu 13):** Bước 4 xong khi mọi task của plan xong và test thành công:
1. CI xanh trên PR (`ci.yml`: lint, typecheck, build, unit, e2e). Hàm thuần (chấm, chia vòng, chọn dạng bài, tính "từ hay sai", nghĩa con
   tiếng Việt) có unit test theo bảng ví dụ; e2e qua Testcontainers như các bước trước.
2. Script `pnpm smoke:buoc-4` chạy qua API thật trên DB mới (kiểu `pnpm smoke:buoc-2`): mỗi nguồn × mỗi dạng bài; một phiên ít từ có
   "Ôn lại"; gợi ý; "Cần ôn tập", "Đã biết", "đưa tất cả"; báo lỗi và staff xử lý; "từ hay sai"; lịch sử theo ngày; job dọn với đồng hồ
   giả. Task cuối của plan chạy hai việc này và ghi as-built vào `docs/deliveries/buoc-4.md`.

## 15. Ảnh hưởng tới các bước sau

- **Bước 5 (Entitlements):** thay phần bên trong của chỗ kiểm quyền (mục 12). Có giới hạn bài luyện theo gói hay không: chưa bàn.
- **Bước 7 (Practice AI):** bài điền từ và "câu chứa từ rồi chọn" là tính năng gói trả phí; không có ngân hàng chung; câu AI đã lưu của
  người học được dùng lại qua bảng lần hỏi (chưa chốt cách dùng lại). Prompt AI dùng `synonyms` để tránh từ đồng nghĩa. Đáp án thay thế
  phải đúng ngữ pháp trong câu. Còn mở cho Bước 7: bài điền từ dùng câu người học đã lưu hay AI tự viết; "đáp án thay thế" có gồm từ đồng
  nghĩa khác chữ không; dạng "câu chứa từ rồi chọn" chọn gì. Danh sách dạng bất quy tắc trong CLAUDE.md giờ chủ yếu là việc của Bước 7,
  vì đã có bảng dạng chia AGID (D46).
- **Đợt giao diện:** màn bắt đầu phiên (nguồn, sắp xếp, dạng bài, số câu), màn câu hỏi, gợi ý, kết quả, "Ôn lại thêm không?", tổng
  kết, lịch sử, "từ hay sai", báo lỗi; màn admin danh sách báo lỗi; hai cài đặt mới trong trang "Thông báo & giới hạn".
- **Bước 8 (xóa tài khoản):** xóa phiên, câu hỏi, lần hỏi của người đó; báo cáo giữ ẩn danh (`user_id` null) (PRC27, ASSUMPTION).

## 16. Rủi ro và việc còn mở

- **Bước 3 chưa xong (⚠9).** Learning, Content có thể đổi ở task 22 hoặc khi làm giao diện Bước 3. Cách xử lý: đọc lại code trên `dev`
  trước khi viết plan; plan ghi rõ commit đã đọc.
- **Trắc nghiệm phụ thuộc nội dung (⚠2, ⚠10).** Khi cột `synonyms` chưa được soạn, chỉ có bài gõ từ. Đáp án nhiễu có thể thiếu thật nếu
  ít nghĩa được publish (giả định nội dung đủ).
- **Sót từ đồng nghĩa (⚠7).** Đường phát hiện duy nhất là báo lỗi.
- **Người học bỏ qua gợi ý "Cần ôn tập"** (đã ghi ở design Bước 3 mục 19): đếm được nhờ `origin = practice` trong nhật ký.
- **Gợi ý nấc 1 bằng câu ví dụ** phụ thuộc bảng dạng chia; dạng chia sai hoặc thiếu thì có thể không che được (khi đó không có nấc 1).
- **Các con số ASSUMPTION (⚠6).**

## 17. Tài liệu cần cập nhật sau khi duyệt

Một PR docs nhỏ riêng: `CLAUDE.md` (trỏ tới design Bước 4; bỏ ghi chú "quên khác nhầm" đã bị D16 bỏ; ghi chú dạng bất quy tắc chuyển
về Bước 7) và `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng Bước 4: chỉ API, bỏ "bài từ câu người học"; dòng Bước 7: thêm bài điền từ
từ câu người học và dạng "câu chứa từ rồi chọn"). `docs/specs/` không sửa. Decision record
`docs/superpowers/decisions/2026-10-18-buoc-4-practice-decisions.md` viết sau khi chủ dự án chốt hết.
