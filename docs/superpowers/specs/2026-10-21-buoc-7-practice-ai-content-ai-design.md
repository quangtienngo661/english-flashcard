# Bước 7 — Practice AI + Content AI — Design (21/10/2026)

> **Trạng thái 21/10/2026:** đã review độc lập (§0b) và chủ dự án duyệt ("ok viết plan luôn đi bạn", sau khi Claude nêu năm câu sau review và cách design tạm viết;
> chốt D30–D34). Chỉ là tài liệu; chưa có code.
> **Nhánh:** `docs/buoc-7-design` (cắt từ `origin/dev` @ `47ca600`; code đọc lại trên `origin/dev` @ `985531b`).
> **Nguồn quyết định:** câu hỏi [`../reviews/2026-10-20-buoc-7-questions.md`](../reviews/2026-10-20-buoc-7-questions.md), nhật ký hỏi đáp bốn vòng
> [`../reviews/2026-10-21-buoc-7-qa-log.md`](../reviews/2026-10-21-buoc-7-qa-log.md), decision record
> [`../decisions/2026-10-21-buoc-7-practice-ai-content-ai-decisions.md`](../decisions/2026-10-21-buoc-7-practice-ai-content-ai-decisions.md).
> **Bằng chứng code:** [`BUOC_7_CODE_FACTS_2026-10-20.md`](../../preparation/BUOC_7_CODE_FACTS_2026-10-20.md) và phần đối chiếu
> [`BUOC_7_CODE_FACTS_ADDENDUM_2026-10-21.md`](../../preparation/BUOC_7_CODE_FACTS_ADDENDUM_2026-10-21.md). Số dòng trong design này là của `985531b`; plan phải
> đọc lại code trên `dev` lúc viết.
> **Research:** [`AI_CLOZE_QUALITY_RESEARCH_2026-10-21.md`](../../preparation/AI_CLOZE_QUALITY_RESEARCH_2026-10-21.md),
> [`AI_PLAN_CLAIMS_RESEARCH_2026-10-21.md`](../../preparation/AI_PLAN_CLAIMS_RESEARCH_2026-10-21.md),
> [`ENGLISH_NATIVE_LEARNERS_RESEARCH_2026-10-21.md`](../../preparation/ENGLISH_NATIVE_LEARNERS_RESEARCH_2026-10-21.md).

Nhãn trong design: **Chốt** = chủ dự án đã chốt (D# ở decision record); **Đề xuất** = Claude đề xuất, duyệt cùng design; `ASSUMPTION` = chưa kiểm được.

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, gói Pro, còn 87 lượt bài AI, đang học `deploy` ("triển khai phần mềm") trong nhóm "IT".

---

## 0. Đọc trước: những chỗ đổi so với quyết định và code cũ

| Chỗ cũ | Bước 7 | Vì sao |
|---|---|---|
| D6 Bước 4: "không bao giờ có câu có hơn một đáp án đúng; phải chặn lúc tạo câu" | Giữ mục tiêu. Trên thực tế thành: chặn hết mức lúc tạo câu (lời dặn + AI tự rà trong cùng lời gọi) + "Làm lại" + báo lỗi + trả lượt | Research 21/10: không cách nào có số liệu chứng minh đạt tuyệt đối; đề chuyên gia ra cũng có ~12,8% câu nhiều lựa chọn vừa (D13, D14) |
| D36 Bước 4: câu hỏi về từ riêng không có nút báo lỗi | Câu **AI** về từ riêng báo lỗi được, Lan đồng ý cho staff xem câu đó; câu không AI về từ riêng giữ D36 | D26: không báo được thì Lan trả lượt cho câu xấu mà không bao giờ được trả lại |
| Bước 4 §10: 4 lý do báo lỗi cố định (CHECK) | Danh sách lý do do `admin` quản lý (dữ liệu, không phải CHECK) | D25 |
| Bước 4 §7.7: gợi ý 2 nấc (nấc 1 định nghĩa/câu ví dụ, nấc 2 chữ cái đầu + số chữ) | Bài điền từ (AI và từ câu đã lưu) 3 nấc: chữ cái đầu (không có số chữ) → định nghĩa tiếng Anh → nghĩa tiếng Việt. Hai dạng chọn: 1 nấc (định nghĩa tiếng Anh). Dạng không AI của Bước 4 giữ nguyên | D9 |
| K23, PRC4: bài từ câu của người học cho Free | Chỉ Trial/Pro, không trừ lượt, không gọi AI | D11 |
| Bước 4 §11: job mỗi giờ xóa **mọi** câu hỏi không còn lần hỏi nào (`practice-cleanup.service.ts:36` xóa `items: { none: {} }`) | Câu AI chưa từng hiện được giữ tới `history_months` | D8, D12: câu tạo sẵn được giữ để dùng lại; giữ code cũ thì câu tạo sẵn bị xóa trong vòng một giờ |
| Bước 6 §4.4: "không gọi `ai.run` từ handler có `@Idempotent()`" (vì handler chạy trong transaction của cơ chế chống trùng) | Từ khi D12 của design sửa Bước 0–3 lên `dev` (M1, `idempotency.service.ts:35-89`: giữ khóa trong transaction ngắn đã commit, handler chạy **ngoài** transaction), lý do của luật này không còn. Bước 7 chỉ dùng cho AI tra nghĩa, với thời hạn giữ khóa ≥ thời gian xấu nhất của AI | Đã đọc code `dev` @ `985531b` (addendum mục 8) |
| Bước 6 D3: ba thao tác | Thêm ba thao tác mới (mục 15); ba thao tác cũ không đổi khuôn | Bước 6 §18 cho phép thêm thao tác; không đổi quyết định Bước 6 |
| Bước 5 D18: tra nghĩa 100 lượt/tháng | Không đổi code; chủ dự án tự nâng con số trong cài đặt có sẵn | D29 |
| Bước 5: dịch bổ sung trừ 1 lượt `ai_practice` | Bước 7 không có nút dịch; luật giữ nguyên trên giấy | D24 |
| Spec PRC5–PRC9 (ngân hàng câu dùng chung, `translate_sentence` cho câu thiếu bản dịch) | Không có ngân hàng chung (D3 Bước 4); không gọi `translate_sentence` | Quyết định cũ, nhắc lại để truy nguồn |

| Bước 6 §4.4 bước 0: mã thao tác = id của "dòng câu-hỏi-chờ (item)" | Mã thao tác = id dòng `practice_ai_requests`; "chỗ đang chờ" của phiên lưu ở `practice_sessions.pending_ai_request_id` (mục 6.5) | Một câu có thể được tạo trước khi tới lượt (tạo trước, D8), lúc đó chưa có lần hỏi |
| Bước 4 API 3: `next` "tự nhiên", luôn trả lại lần hỏi đang chờ | `next` có thêm trạng thái `preparing` (đang tạo câu AI) và `ai_unavailable`; khi có chỗ đang chờ thì không lập kế hoạch lại | Tách lời gọi AI ra khỏi transaction (Bước 6 §4.4) |
| ER6: một câu AI "phục vụ thành công" là một lượt | Câu tạo trước bị trừ lượt **lúc tạo xong**, không phải lúc Lan thấy; câu đó được giữ và dùng ở lần sau (D8, D12) | Chủ dự án chọn giữ câu đã tạo (câu 7, 7b) |

`docs/specs/` không sửa (owner 12/10/2026: spec chỉ là khung ban đầu).

## 0b. Sửa sau review độc lập (21/10/2026)

Review: [`../reviews/2026-10-21-buoc-7-design-review.md`](../reviews/2026-10-21-buoc-7-design-review.md) (code `dev` @ `985531b`; 1 blocker, 7 major, 15 minor). Claude đã đối chiếu
các điểm chính với code trước khi sửa (`usage-ledger.service.ts` `refund` chỉ đếm theo chu kỳ, không tìm dòng `use` của mã thao tác; `answers.service.ts:102` gợi ý chỉ 1–2;
`sessions.service.ts:242-310` lập kế hoạch mỗi lần gọi).

| Review | Sửa ở | Tóm tắt |
|---|---|---|
| R1 (blocker) | 6.5, 6.8, 12.1 | Lưu "chỗ đang chờ" (`pending_ai_request_id`) trong transaction có khóa phiên; `next` đọc nó trước khi lập kế hoạch; ghi lần hỏi có điều kiện; [Thử lại] là một cờ rõ ràng |
| R2 | 7.7, 9.3, 12.1, B7E74–75 | `ai_charged` trên câu hỏi; chỉ `refund` khi câu đó thật sự bị trừ; tách mã sổ lượt (mã gốc) và mã lần gọi (`#2`) |
| R3 | 6.5, 12.1 | Lưu `ai_input`; `input-mismatch` → `failed`; giành quyền chạy lại bằng một lệnh nguyên tử |
| R4 | 6.5, 12.1 | Ghi câu khóa dòng yêu cầu và kiểm còn `generating`; cổng xóa từ riêng khóa rồi xóa yêu cầu trước câu hỏi |
| R5, R9, R10 | 6.1, 6.3 | `ai_planned` lấy số nhỏ hơn; định nghĩa `r` đủ; đánh dấu từ vị trí 2 và ưu tiên từ có câu tạo sẵn |
| R6, R19, R20 | 6.1, 6.4, 6.5 | Mở phiên hỏi `ai.isReady`; bỏ số giây chờ lúc mở phiên (không đổi Bước 5); kiểm sẵn sàng trước kiểm từ riêng; `prepare` cũng đặt `ai_stopped` |
| R7 | 7.8 (mới) | Hình dạng JSON của dạng mới; luật che từ riêng cho mọi dạng có lựa chọn; lịch sử |
| R11 | 2, 6.5, 20 | Sửa câu "không bao giờ mất lượt"; dùng lại câu tạo sẵn phải kiểm mọi nhiễu còn thấy được |
| R12 | 11.1, 20, B7E110 | Khe đã chấp nhận của D12 có thể trừ 2 lượt tra nghĩa: ghi rủi ro |
| R13 | 15 | Test seed prompt; bản prompt mới không đè prompt admin đã sửa; mã lỗi khuôn mới |
| R14, R15 | 7.2, 7.4, 7.5 | `other_meanings_vi`; câu không được chứa từ đang hỏi ngoài chỗ trống |
| R16, R21 | 10, 12.1, 20 | Danh sách dạng chưa biết: unique, có nút bỏ qua; khóa và FK; rủi ro mất dấu vết trả lượt |
| R22 | 4, 11.2 | Nhãn "AI gợi ý" mất khi Lan sửa (Đề xuất); trường Content còn thiếu; cách tính `content_key` |
| R23 | 0, 5 | Thêm ba dòng ở mục 0; bản dịch cho hai dạng chọn (D34) |
| Đơn giản hóa | 9.2, 9.3 | Lý do báo lỗi đọc theo loại câu (`?kind=`); bỏ lọc `own_sentence` ở danh sách staff |

**Năm câu sau review** (hỏi theo luật "chủ dự án trả lời trước", 21/10). Chủ dự án trả lời "ok viết plan luôn đi bạn"; Claude nói rõ trong chat là hiểu thành **giữ cách design
đang tạm viết** cho cả năm câu, đổi được trước khi thực thi. Chốt D30–D34:
- **D30 (R2):** lượt bị trừ ở chu kỳ trước, xác nhận lỗi ở chu kỳ này → trả vào chu kỳ này như Bước 5 (R21).
- **D31 (R8):** không thêm ô định nghĩa tiếng Anh khi lưu gợi ý AI.
- **D32 (R17):** lý do "Đáp án đúng mà bị chấm sai" không được trả lượt (admin đổi được).
- **D33 (R18):** staff được xử lý báo cáo của chính mình; `admin` thấy rõ trong danh sách trả lượt.
- **D34 (R23):** bản dịch sau khi nộp áp cho cả ba dạng AI.

## 1. Mục tiêu và bối cảnh

Bước 7 thêm:
1. **Bài luyện có AI** (Practice) cho Trial và Pro: ba dạng bài AI, cộng bài điền từ từ câu Lan đã lưu.
2. **AI tra nghĩa khi thêm từ** (Content): nút "Tra bằng AI" ở "Thêm nhanh", lưu gợi ý thành từ riêng.
3. **Báo lỗi câu AI và trả lượt**: lý do báo lỗi do admin quản lý, staff xác nhận thì trả lượt.

Chỉ làm hệ thống (API), như Bước 4–6 (D2). Bước 6 đã có cổng AI (`AiService.run`), Bước 5 đã có sổ lượt (`reserve` / `confirm` / `release` / `refund`); Bước 7
là bên gọi đầu tiên của cả hai. Chưa gọi nhà cung cấp thật lần nào (D19 Bước 6); "Xong khi" của Bước 7 cũng không gọi thật, chủ dự án tự chạy thật sau (D3).

## 2. Quyết định (tóm tắt; mọi phương án và trade-off ở decision record)

| # | Chủ đề | Chốt |
|---|---|---|
| D1 | Luật hỏi | Chủ dự án trả lời trước, Claude đề xuất sau |
| D2 | Phạm vi | Chỉ API |
| D3 | "Xong khi" | CI xanh trên mọi PR + script smoke với AI giả trên DB mới; không gọi AI thật; chủ dự án tự chạy thật sau |
| D4 | Implement | Các phiên song song + một phiên điều phối, như Bước 4–6 |
| D5 | Tài liệu | Một design, một plan |
| D6 | Bài AI nằm ở đâu | Dạng AI là lựa chọn mới **trong phiên luyện thường**; một phiên có câu AI vẫn tính 1 phiên mỗi ngày, mỗi câu AI 1 lượt |
| D7 | Lượt khi mở phiên | **Kiểm trước, không trừ trước**: số lượt cần = số câu AI của phiên; thiếu thì từ chối ngay. Sự cố giữa phiên: bảng mục 6.6 |
| D8 | Chờ AI | **Tạo trước K câu AI** (admin đặt, mặc định 2); phiên dừng giữa chừng là "đang dở", app hỏi làm tiếp hay bỏ; câu đã tạo được giữ và dùng ở lần sau từ đó được hỏi bằng dạng đó, không trừ lượt nữa (các ca hiếm vẫn mất lượt: mục 20) |
| D9 | Luật Bước 4 cho bài AI | Áp nguyên 5 luật (chấm, làm lại, gợi ý, nút sau câu, "từ hay sai"/lịch sử/báo lỗi). Gợi ý: xem mục 0 |
| D10 | Câu điền từ lấy từ đâu | Lan chọn khi mở phiên: "Câu do AI viết" hoặc "Câu bạn đã lưu" |
| D11 | Điền từ từ câu đã lưu | Trial/Pro; không trừ lượt; không gọi AI; Free không có bài điền từ nào |
| D12 | Dùng lại câu AI | Pro luôn câu AI mới; không có "ôn câu AI cũ" ở Bước 7; câu tạo sẵn mà Lan chưa từng thấy được dùng ở lần sau, không trừ lượt; trang Lịch sử là đủ để xem lại |
| D13 | Từ đồng nghĩa vừa chỗ trống | Chặn ba lớp (lời dặn, AI tự rà, báo lỗi); chấm chặt: gõ từ đồng nghĩa là "Chưa đúng", được làm lại |
| D14 | Kiểm câu AI | **Không có lời gọi kiểm riêng**; AI tự rà trong lời gọi tạo câu; dạng chọn đưa sẵn nhiễu / nghĩa sai vào lời gọi đó |
| D15 | Dạng chia AI dùng mà bảng chưa biết | Danh sách dạng chia bổ sung, `admin` và `editor` sửa |
| D16 | Người học `en` | Từ không có nghĩa tiếng Việt thì không có dạng AI; không sửa cổng AI |
| D17 | "Câu chứa từ rồi chọn" | Chọn nghĩa của từ trong câu; nghĩa sai: nghĩa khác của chính từ đó → nghĩa của từ cùng nhóm → nghĩa của từ bất kỳ trong dữ liệu; không do AI viết |
| D18 | Trắc nghiệm theo câu | AI viết câu mới; nhiễu lấy trong nhóm, chia cùng dạng với chỗ trống |
| D19 | Khi nào gọi AI tra nghĩa | Chỉ khi Lan bấm "Tra bằng AI" |
| D20 | Gửi câu Lan gặp cho AI | Lan tự tick mỗi lần; mặc định không tick |
| D21 | AI trả về từ gốc đã có trong catalog | Hiện cả hai, nghĩa catalog trước |
| D22 | Lưu gợi ý thành từ riêng | Lan sửa được mọi ô trước khi lưu; lưu kèm câu ví dụ; ghi nguồn "AI gợi ý" |
| D23 | Từ điển ngoài | Bỏ qua ở Bước 7: catalog → AI → tự nhập |
| D24 | Dịch | Không có nút "Dịch câu này"; bản dịch đi kèm câu AI hiện sau khi Lan nộp |
| D25 | Lý do báo lỗi | Admin quản lý danh sách lý do; thêm sẵn 3 lý do cho câu AI |
| D26 | Câu AI về từ riêng | AI kiểm từ riêng một lần trước câu AI đầu tiên; cho báo lỗi câu AI về từ riêng |
| D27 | Trả lượt | `editor` xác nhận là trả ngay, `admin` xem lại danh sách; Lan chỉ được báo trong app |
| D28 | Con số mới | Admin chỉnh được hết |
| D29 | Lượt tra nghĩa | Không đổi code; chủ dự án tự nâng `pro_ai_lookup_per_cycle` / `trial_ai_lookup_per_cycle` (0–5.000) |
| D30 | Lượt của chu kỳ trước (sau review) | Trả vào chu kỳ hiện tại như `refund` của Bước 5 (R21) |
| D31 | Ô định nghĩa khi lưu gợi ý AI (sau review) | Không thêm |
| D32 | `graded_wrong` có trả lượt (sau review) | Không (admin đổi được) |
| D33 | Staff xử lý báo cáo của chính mình (sau review) | Được; `admin` thấy rõ trong danh sách trả lượt |
| D34 | Bản dịch cho hai dạng chọn (sau review) | Có, như điền từ AI |

## 3. Phạm vi

**Làm:**
- Practice: ba dạng bài AI, bài điền từ từ câu đã lưu, xếp câu AI cho phiên và kiểm lượt khi mở phiên, tạo trước, xử lý sự cố giữa phiên, gợi ý 3 nấc, báo lỗi theo
  lý do do admin quản lý, xác nhận lỗi và trả lượt, danh sách dạng chia AI dùng mà bảng chưa biết, kiểm từ riêng, sửa job dọn dữ liệu.
- Content: đọc thêm loại từ, level CEFR, dạng chia của ứng viên nhiễu, nghĩa khác của cùng từ, nghĩa ngẫu nhiên, câu ngữ cảnh cho Practice; AI tra nghĩa; lưu câu ví
  dụ và nguồn "AI gợi ý" cho từ riêng; bảng dạng chia bổ sung.
- AI: ba thao tác mới (khuôn, luật, prompt ban đầu, bản giả); một bản prompt mới cho `generate_cloze`.
- Settings: một cài đặt mới (`practice.ai_prefetch_count`).
- Script smoke `pnpm smoke:buoc-7`.

**Không làm:** giao diện người học và màn admin (đợt giao diện); gọi AI thật (D3); từ điển ngoài (D23); dịch bổ sung (D24); ôn lại câu AI cũ (D12, hướng phát
triển sau); Flutter; đổi bất kỳ quyết định nào của Bước 5, 6.

## 4. Kiến trúc

```
                         ┌───────────── Practice ─────────────┐
 Lan ─► /v1/practice ───►│ phiên · câu AI · yêu cầu tạo câu   │──► AiService.run (ai)        ─► OpenAI / Anthropic / giả
                         │ báo lỗi · lý do · dạng chưa biết   │──► EntitlementsService       (reserve / confirm / release / refund / snapshot)
                         └────┬───────────────────────┬───────┘
                              │ đọc                    │ đọc
                           Content                  Learning, Settings, Identity
 Lan ─► /v1/lookup/ai ──► Content (WordsService) ──► AiService.run('lookup_word') + EntitlementsService ('ai_lookup')
```

- Hướng gọi giữ như Bước 4–6: Practice gọi Content, Learning, Settings, Entitlements, AI; Content gọi AI và Entitlements; không ai import Practice. Mọi tham chiếu
  chéo là cột UUID thường (D3 của dự án).
- **Không bao giờ gọi AI khi đang giữ transaction database** (Bước 5 R6, Bước 6 §4.4): mọi lời gọi `ai.run` nằm giữa hai transaction ngắn.
- Lời gọi AI chạy **trong request của người học** (luật dự án: luồng người học gọi AI trực tiếp, không qua hàng đợi BullMQ). Tạo trước là một request riêng do app gửi
  (mục 6.4), không phải việc nền của server.

| Module | Bước 7 cần | Mới hay có sẵn |
|---|---|---|
| Content | `PracticeSense` thêm loại từ (`pos`), level CEFR, id revision đang dùng (`live_revision_id`), dạng chia bổ sung theo chữ | Mới (hiện không có pos, level, revision; code facts 6.9) |
| Content | `WordSense` thêm `ai_suggested` (từ riêng có revision đang dùng là bản từ gợi ý AI) để trang từ hiện nhãn | Mới |
| Content | Ứng viên nhiễu kèm dạng chia theo loại (`kind`) | Mới (`CandidateSense` chưa có dạng chia) |
| Content | Các nghĩa khác (còn thấy được) của cùng entry; một mẫu ngẫu nhiên nghĩa catalog | Mới |
| Content | Câu ngữ cảnh của Lan theo nghĩa | Có sẵn: `ContentService.listSentences` |
| Content | Bảng dạng chia bổ sung, hàm thêm/xóa cho staff | Mới |
| Content | AI tra nghĩa; quick-add nhận câu ví dụ và nguồn "AI gợi ý"; sửa câu ví dụ của từ riêng | Mới / mở rộng |
| Entitlements | `snapshot` (đọc `pools.ai_practice.remaining`, `features`, `ai_available`), `reserve`, `confirm`, `release`, `refund`, `check` | Có sẵn, không đổi |
| AI | `run`, `isReady`; ba thao tác mới | Có sẵn + mới |
| Settings | `practice.ai_prefetch_count` | Mới |

## 5. Dạng bài mới

| Dạng (`type`) | Lan thấy | Lan làm | Chấm | Gợi ý | Lượt | Gói |
|---|---|---|---|---|---|---|
| `cloze`, nguồn AI | "We use Docker to ___ the app to the production server." | Gõ từ | Như gõ từ Bước 4: chuẩn hóa rồi so đúng từng chữ với các dạng đáp án AI liệt kê (đã qua kiểm, mục 7.2) | 3 nấc: `d…` → định nghĩa tiếng Anh → nghĩa tiếng Việt | 1 | Trial, Pro |
| `cloze`, nguồn câu đã lưu | Câu Lan đã lưu, che từ bằng luật | Gõ từ | Như "gõ từ theo câu ví dụ" Bước 4 (chính dạng trong câu; thêm các cách viết khi chỗ trống là từ gốc) | 3 nấc như trên | 0 | Trial, Pro |
| `meaning_in_sentence` ("câu chứa từ rồi chọn") | "The team **deployed** the update to all servers." + 4 nghĩa | Chọn nghĩa của từ in đậm trong câu này | Như trắc nghiệm Bước 4 (so vị trí) | 1 nấc: định nghĩa tiếng Anh | 1 | Trial, Pro |
| `mcq_sentence` (trắc nghiệm theo câu) | "We ___ the app to the server yesterday." + `deployed` / `delivered` / `defended` / `delayed` | Chọn từ điền vào chỗ trống | Như trắc nghiệm Bước 4 | 1 nấc: định nghĩa tiếng Anh | 1 | Trial, Pro |

- Ba dạng có câu AI là **dạng AI**; `cloze` nguồn câu đã lưu **không** phải dạng AI (không gọi AI, không trừ lượt) nhưng vẫn chỉ cho gói trả phí (D11). Cổng kiểm
  cho cả bốn là quyền `ai.practice` của Bước 5 (con số của kho `ai_practice` > 0).
- Sau khi nộp, như Bước 4: đáp án đúng, nghĩa, định nghĩa; thêm **bản dịch tiếng Việt của câu** cho điền từ AI khi Lan là người học `vi` (bản dịch có sẵn từ lúc tạo câu,
  D24). Hai dạng chọn cũng **có** bản dịch (hai thao tác mới trả bản dịch trong cùng lời gọi; Chốt D34 sau review R23).
  Người học `en` không thấy bản dịch.
- `prompt_style` của bốn dạng là `sentence`. Kiểu đề "theo nghĩa / theo câu / trộn" của phiên vẫn chỉ áp cho gõ từ của Bước 4.
- Từ chức năng (Bước 4 §7.3): chỉ có gõ từ, như cũ; không có dạng mới.

## 6. Phiên luyện có câu AI

### 6.1 Mở phiên (`POST /v1/practice/sessions`)

Body thêm: `types` nhận thêm `cloze`, `meaning_in_sentence`, `mcq_sentence`; `cloze_source` (`ai` / `own`, mặc định `ai`, chỉ có nghĩa khi chọn `cloze`).

Thứ tự kiểm (thêm vào luồng `start` hiện có, `sessions.service.ts:56-113`; mọi lần đọc trước transaction, như M1 đã làm):

1. Như cũ: số câu, sắp xếp, `checkQuota('practice_sessions')` sớm, quyền `practice.basic`, chọn từ, kiểm dạng bài từng từ làm được (`availability`, mở rộng cho dạng
   mới ở mục 6.2).
2. **Mới:** Lan chọn ít nhất một trong bốn dạng mới → đọc `entitlements.snapshot(userId)`:
   - `features['ai.practice'].allowed = false` → `403 entitlement-required` (Free; như Bước 5).
   - Có dạng AI và (`ai_available.enabled = false` hoặc `ai_available.cap_reached = true`) → `503 ai-unavailable`. Không kèm số giây chờ (Đề xuất sau review R19:
     `snapshot` chỉ có cờ, hàm tính "0 giờ ngày sau" của Bước 5 không export; thêm vào là đổi Bước 5). Trần = 0 cũng là trường hợp này. Lan chọn lại dạng không AI.
   - Có dạng AI → `ai.isReady(op)` cho thao tác của **mỗi** dạng AI đã chọn (và `check_private_word` khi có từ riêng sẽ được đánh dấu mà chưa kiểm, mục 7.6). Một thao
     tác chưa sẵn sàng (`model-not-set`, `provider-not-configured`, `daily-call-cap`, `ai-disabled`) → `503 ai-unavailable` kèm `reason` (và `retry_after_seconds`
     khi cổng có trả), chưa tạo phiên (sau review R6: ba thao tác mới được seed với `model_ref NULL`, nên tới khi admin chọn model chúng chưa sẵn sàng).
3. **Mới — đánh dấu câu AI vòng 1** (Đề xuất, sửa sau review R10): trong các từ đã chọn cho vòng 1 (`kept`), lấy những từ làm được ít nhất một dạng AI đã chọn; **ưu tiên**
   từ đã có câu AI chưa từng hiện dùng được (mục 6.5), rồi rải đều phần còn lại **bắt đầu từ vị trí thứ 2** (ví dụ 10 từ, 5 câu AI → từ thứ 2, 4, 6, 8, 10), để câu đầu
   tiên của phiên trộn không phải chờ AI. Đánh dấu tối đa `ceil(count × số dạng AI đã chọn ÷ số dạng đã chọn)` từ; `cloze` nguồn `own` không tính là dạng AI. Lưu
   `ai_sense_ids`. Phiên chỉ có dạng AI thì câu đầu vẫn phải chờ.
4. **Mới — số câu AI của phiên** (D7, sửa sau review R5): `ai_planned = min(ceil(count × số dạng AI ÷ số dạng), số từ đã đánh dấu + max(0, count − số từ của vòng 1))`.
   Phần sau là số chỗ vòng ≥ 2 có thể có; con số lệch về phía ít, an toàn cho Lan. Ví dụ "gõ từ + điền từ AI", 10 câu, 10 từ → 5. Như trên nhưng chỉ 2 từ có nghĩa tiếng
   Việt → `min(5, 2 + 0) = 2`. Chỉ chọn ba dạng AI, 10 câu, 10 từ đều làm được → 10.
5. **Mới — kiểm lượt** (D7): `needed = ai_planned − số từ đã đánh dấu có câu AI chưa từng hiện dùng được` (mỗi từ tối đa một câu). `pools.ai_practice.remaining < needed` →
   `403 ai-quota-insufficient` kèm `remaining`, `needed`, `resets_at`. Không trừ gì, không giữ chỗ gì.
6. Như cũ: transaction có khóa người học, đóng phiên đang mở, `checkQuota` lần hai, tạo phiên (thêm cột `cloze_source`, `ai_planned`, `ai_sense_ids`).

Response thêm `ai_planned` (màn mở phiên hiện "Phiên này dùng 5 lượt AI (còn 87)"; con số "còn" lấy từ API gói của Bước 5).

### 6.2 Từ nào làm được dạng nào (mở rộng `availableTypes`, `question-types.ts:9-15`; Đề xuất)

| Dạng | Làm được khi |
|---|---|
| `cloze` nguồn AI | Nghĩa có nghĩa tiếng Việt (`gloss_vi`); không phải từ chức năng; nếu là từ riêng thì chưa bị kiểm là "không nhận ra" với nội dung hiện tại (mục 7.6) |
| `cloze` nguồn câu đã lưu | Lan có ít nhất một câu ngữ cảnh của nghĩa đó mà luật che từ (`maskExample`) che được |
| `meaning_in_sentence` | Như `cloze` nguồn AI, và gom đủ 3 nghĩa sai có nghĩa tiếng Việt (mục 7.4; nghĩa tiếng Việt để gửi cho AI); người học `en`: cả 4 nghĩa còn phải có định nghĩa tiếng Anh (để hiện) |
| `mcq_sentence` | Như `cloze` nguồn AI, và có ít nhất 3 ứng viên nhiễu (bộ lọc Bước 4) có cùng một dạng chia với từ đang hỏi (mục 7.5) |

Người học `en` (D16): từ catalog luôn có nghĩa tiếng Việt nên vẫn có dạng AI; từ riêng của người học `en` không có nghĩa tiếng Việt nên không có dạng AI, dùng dạng khác.

### 6.3 Chọn dạng cho từng câu

Giữ luật Bước 4 (bốc ngẫu nhiên trong các dạng Lan chọn mà từ đó làm được, tránh dạng lần trước của từ đó), thêm (Đề xuất):
- **Vòng 1:** từ có trong `ai_sense_ids` → bốc trong các dạng AI làm được; từ không đánh dấu → bốc trong các dạng không AI làm được. Từ đánh dấu mà lúc tạo câu không còn
  làm được dạng AI nào → dùng dạng không AI (nếu Lan có chọn), không thì bỏ qua từ (như Bước 4 §7.2).
- **Ngân sách câu AI của phiên** (sửa sau review R9): `r = ai_planned − (số lần hỏi của phiên có câu AI, kể cả lần hỏi `void`) − (số yêu cầu của phiên đang `generating`
  hoặc đã `ready` mà chưa gắn vào lần hỏi nào)`. Mọi chỗ tạo câu AI (`next`, `prepare`) chỉ tạo khi `r > 0`. Nhờ vậy số câu AI có trừ lượt của cả phiên không vượt
  `ai_planned`.
- **Vòng ≥ 2** (có khi số từ ít hơn số câu, hoặc khi từ ở vòng 1 bị bỏ qua hay bị `void` làm thiếu số câu): còn `q` câu nữa thì đủ phiên → câu này là câu AI với xác suất
  `r ÷ q` (nếu từ làm được dạng AI). Quyết định này được ghi cùng "chỗ đang chờ" (mục 6.5), nên lần gọi lại không tung lại.
- **Không có tạo trước ở vòng ≥ 2** (Đề xuất): thứ tự vòng ≥ 2 được xáo lại mỗi lần gọi `next` (`sessions.service.ts:275-283`), nên không biết trước từ kế tiếp; câu AI ở
  vòng này tạo lúc Lan bấm câu tiếp (Lan chờ). Giữ nguyên thuật toán vòng của Bước 4.

### 6.4 Tạo trước (D8)

- API mới `POST /v1/practice/sessions/{id}/prepare`: app gọi ngay sau khi hiện một câu (và ngay sau khi mở phiên). Server đi tiếp theo thứ tự vòng 1 từ câu đang hiện,
  lấy **tối đa K** từ đã đánh dấu AI kế tiếp (K = `practice.ai_prefetch_count`, mặc định 2, admin chỉnh 0–20; 0 = tắt tạo trước) mà chưa có câu AI sẵn và chưa có yêu
  cầu đang chạy, rồi **tạo các câu đó song song** theo luồng 6.5. Request trả về khi các lời gọi xong: `{ prepared, already_ready, failed }`.
- Không tạo quá số câu AI của phiên: chỉ tạo khi `r > 0` (mục 6.3). Không tạo sang vòng 2.
- `prepare` **không** đặt "chỗ đang chờ" của phiên; câu nó tạo nằm sẵn cho `next` dùng (mục 6.5). Gặp `quota-exhausted`, `plan-required` hoặc AI chưa sẵn sàng thì đặt
  `ai_stopped` như `next` (sau review R20); `ai_stopped` đã có thì không làm gì. Gặp AI lỗi ở một từ thì chỉ đánh dấu yêu cầu đó `failed`; khi `next` tới từ đó, nó thấy
  yêu cầu `failed` của phiên cho từ đó và áp mục 6.6 **ngay**, không gọi AI lại (sau review R1).
- Phiên bị đóng (Dừng, quá `idle_session_close_hours`) khi `prepare` đang chạy: câu ghi xong thành câu chưa từng hiện, dùng ở lần sau; không lỗi.
- App không gọi `prepare` (bản app cũ, máy ngủ) thì `next` tự tạo câu AI lúc cần, Lan chờ; kết quả như nhau, chỉ chậm hơn.
- Rate limit `practice.answer` (Bước 4 R1). Không mang `Idempotency-Key`: an toàn khi gọi lặp vì mỗi câu có mã thao tác cố định (mục 6.5).

### 6.5 Một lần tạo câu AI (Đề xuất; thứ tự của Bước 6 §4.4; sửa sau review R1–R4, R20)

**Chỗ đang chờ của phiên** (sửa sau review R1). Bước 4 giữ khóa phiên suốt `next`, nên hai lần gọi cùng lúc luôn xếp hàng. Bước 7 phải thả khóa trong lúc AI chạy, nên
quyết định "vị trí kế tiếp là từ X, dạng AI T, vòng n" được **ghi lại** ngay khi ra quyết định: cột `practice_sessions.pending_ai_request_id` trỏ tới dòng
`practice_ai_requests` (dòng đó mang `sense_id`, `type`, `round`). Mọi `next` / `current` đọc cột này **trước** khi lập kế hoạch.

```
 A. next — transaction ngắn (khóa phiên):
    có pending_ai_request_id:
      yêu cầu generating            → trả "preparing" (không lập kế hoạch lại, không tung lại xác suất)
      yêu cầu ready                 → G
      yêu cầu failed, phiên trộn    → áp 6.6 đúng một lần: tạo câu không AI cho cùng từ (như Bước 4), xóa cờ
      yêu cầu failed, phiên chỉ AI  → trả "ai_unavailable"; giữ cờ tới khi Lan bấm [Thử lại] (next với retry_ai: true → yêu cầu mới thay cờ)
    không có cờ → lập kế hoạch như Bước 4 → (từ X, vòng n, dạng):
      dạng không AI                                       → tạo câu và lần hỏi như cũ
      dạng AI, có câu chưa từng hiện dùng được (dưới đây) → tạo lần hỏi trỏ tới câu đó (0 lượt)
      dạng AI, có yêu cầu của phiên cho X đang generating (do prepare) → đặt cờ = yêu cầu đó → "preparing"
      dạng AI, có yêu cầu của phiên cho X đã failed (do prepare)       → như "yêu cầu failed" ở trên (không gọi AI lại)
      còn lại → ghi yêu cầu mới (generating) + đặt cờ; commit; chạy bộ tạo câu (B…H) ngay trong request này
 G. transaction ngắn (khóa phiên): ghi lần hỏi trỏ tới câu của yêu cầu **chỉ khi** cờ vẫn trỏ đúng yêu cầu đó (lệnh có điều kiện), rồi xóa cờ.
    Câu chưa được tính lượt (ai_charged = false, ví dụ máy chủ chết trước confirm) → gọi lại entitlements.confirm(mã gốc) sau khi commit (xác nhận muộn, R7 Bước 5)

 Bộ tạo câu cho một yêu cầu (dùng chung cho next và prepare; không giữ transaction nào trong lúc gọi AI):
 B. ai.isReady(op)                                → chưa sẵn sàng: yêu cầu failed ("ai-unavailable"), đặt ai_stopped
 C. từ riêng chưa kiểm với nội dung hiện tại       → ai.run('check_private_word', …, mã + ':wc') (không giữ lượt; mục 7.6) → not_recognized: failed ("word-not-recognized")
 D. dựng dữ liệu gửi AI, lưu vào yêu cầu (ai_input) — lần chạy lại dùng lại đúng dữ liệu này, không bốc lại
 E. entitlements.reserve(Lan, 'ai_practice', mã)   → bị từ chối: failed theo lý do của Bước 5, đặt ai_stopped
 F. r = ai.run(op, ai_input, { operationId: mã, userId, purpose: 'learner' })
    succeeded → kiểm luật (mục 7) → không qua → ai.run(op, ai_input, mã + '#2') đúng một lần (cùng dữ liệu, mã khác nên là lời gọi mới) → không qua → release, failed ("rejected")
    in_progress → giữ nguyên (không release); trả "preparing"
    permanent_failure input-mismatch → release, failed ("input-mismatch"), log (không bao giờ để kẹt generating)
    còn lại → release → failed theo lý do
 H. qua luật → transaction ngắn: SELECT yêu cầu … FOR UPDATE; còn generating → ghi practice_questions (source 'ai', ai_charged = false) + yêu cầu ready;
                                                                không còn (đã xóa, đã failed) → không ghi gì; release; log ai_request_gone
    → sau commit: entitlements.confirm(mã) → confirmed: đặt ai_charged = true; released / not-found: giữ false, log ai_confirm_not_charged
```

- **Mã thao tác** = id dòng `practice_ai_requests` (**mã gốc**), cố định cho một câu (Bước 6 §4.4). Đây là mã của sổ lượt (`reserve`, `confirm`, `release`, `refund`). Lần viết
  lại dùng `mã#2` chỉ ở cổng AI; câu lưu cả hai (mục 7.7). Lan bấm hai lần, hai tab, hoặc `prepare` và `next` cùng lúc đều không trừ hai lượt.
- **Một yêu cầu đang chạy mỗi (người học, từ)** (index unique một phần `WHERE state = 'generating'`): lần thứ hai nhận "preparing".
- **Máy chủ chết giữa chừng** (sửa sau review R3): yêu cầu `generating` có `updated_at` cũ hơn 2 phút (`ASSUMPTION`, bằng thời gian sống của giữ chỗ Bước 5) được coi là bỏ
  dở. Giành quyền chạy lại bằng **một lệnh**: `UPDATE practice_ai_requests SET updated_at = now() WHERE id = :id AND state = 'generating' AND updated_at < now() − 2 phút`;
  0 dòng → "preparing". Chạy lại dùng `ai_input` đã lưu (cùng dấu vân tay với lần đầu), cùng mã: cổng AI trả kết quả đã lưu hoặc giành lại dòng `running` quá hạn (Bước 6 §8.1);
  Bước 5 trả giữ chỗ cũ hoặc giữ chỗ mới. Chưa kịp lưu `ai_input` thì chưa gọi AI, nên dựng lại là an toàn.
- **Bị luật loại hai lần** (bước F): kết quả của cổng AI cho `mã` và `mã#2` đã lưu 24 giờ, nên [Thử lại] (mục 6.6) dùng **một yêu cầu mới**; lượt của yêu cầu cũ đã được nhả.
- **Câu chưa từng hiện** (D12; sửa sau review R11): câu `source = 'ai'` đã ghi xong mà chưa có lần hỏi nào. Chỉ dùng lại khi: cùng người, cùng nghĩa; dạng thuộc các dạng AI
  Lan chọn cho phiên này; **cùng bản nội dung** lúc tạo (`sense_revision_id`; từ riêng: cùng `content_key`, mục 7.6); và mọi nhiễu / nghĩa sai trong câu (`distractor_sense_ids`)
  vẫn còn thấy được với Lan. Không thỏa → không dùng câu đó (lượt đã trừ của câu đó mất; mục 20).
- **Xóa từ riêng trong lúc đang tạo câu** (sửa sau review R4, CR23): cổng xóa của Practice (chạy trong transaction `deleteMyWord`) khóa rồi xóa `practice_ai_requests` và
  `practice_word_checks` của các nghĩa đó **trước** khi xóa câu hỏi. Bước H đang giữ dòng yêu cầu thì cổng chờ H commit, và lệnh xóa câu hỏi chạy sau thấy câu H vừa ghi; H tới
  sau thì không còn dòng yêu cầu nên không ghi gì. Không câu nào còn chứa từ đã xóa.

### 6.6 Sự cố giữa phiên (D7)

| Chuyện xảy ra | Lan có chọn cả dạng không AI | Lan chỉ chọn dạng AI | Lượt |
|---|---|---|---|
| AI lỗi, quá thời gian, bị luật loại hai lần, hoặc từ riêng "không nhận ra" ở một câu | Câu đó đổi sang một dạng không AI Lan đã chọn, cùng từ; response kèm `notice: ai-fallback` **lần đầu** trong phiên ("AI tạm chưa dùng được, câu này dùng dạng khác") | `next` trả `state: ai_unavailable`, `reason: ai-failed`; Lan bấm [Thử lại] (`next` với `retry_ai: true` → một yêu cầu mới cho cùng chỗ; `next` không có cờ này chỉ trả lại `ai_unavailable`, không gọi AI) hoặc [Dừng, để sau] (phiên vẫn đang dở; chưa có câu nào có kết quả thì chưa tính là một phiên của ngày) | 0 |
| Hết lượt (admin hạ con số, gói hết giữa phiên → `quota-exhausted` / `plan-required`) | Mọi câu AI còn lại của phiên đổi sang không AI (`ai_stopped` = lý do); `notice: ai-fallback` kèm lý do và `resets_at` | `ai_unavailable`, `reason: quota-exhausted` hoặc `plan-required`, kèm `resets_at` | 0 |
| Admin tắt AI, chạm trần toàn hệ thống, trần lời gọi của cổng AI | Như dòng trên, lý do `ai-unavailable` kèm `retry_after_seconds` | `ai_unavailable`, `reason: ai-unavailable` | 0 |
| Từ riêng "không nhận ra" (mục 7.6) | Như dòng 1; thêm `notice: word-not-recognized` kèm `sense_id` để app nhắc "Kiểm lại từ trong Từ của tôi" | Như dòng 1, thêm cùng notice | 0 |

Câu đã tạo trước đó vẫn làm và nộp được bình thường (ER4: không kiểm quyền khi chấm).

### 6.7 Phiên "đang dở" (D8)

- Không thêm trạng thái mới: phiên chưa xong vẫn `active` / `waiting_continue` như Bước 4; tải lại vẫn làm tiếp (`GET /sessions/current`).
- Khi Lan mở Luyện tập, app đọc `GET /sessions/current` trước; có phiên → hỏi "Phiên đang dở 6/10 — [Làm tiếp] [Bỏ, mở phiên mới]". Làm tiếp: không tính thêm phiên
  (Bước 5: phiên tính vào ngày của câu đầu tiên có kết quả). Bỏ: `POST /sessions` như cũ (đóng phiên cũ `abandoned`); phiên mới tính khi có câu đầu tiên có kết quả.
- Không ai đụng quá `idle_session_close_hours` (mặc định 24) → tự đóng như cũ.
- Câu AI đã tạo của phiên cũ mà Lan chưa thấy: giữ lại, dùng ở lần sau từ đó có câu AI (mục 6.5, D12). Job dọn dữ liệu đổi theo mục 12.1.

### 6.8 `next` và `current`

- `POST /sessions/{id}/next` (Đề xuất, thay `advance` trong một transaction bằng: A trong transaction ngắn; bộ tạo câu B–H ngoài transaction; G trong transaction ngắn).
  Body tùy chọn `{ retry_ai: true }` (chỉ có tác dụng khi phiên đang `ai_unavailable`). Response có thêm hai trạng thái: `preparing` (kèm `retry_after_seconds: 2`, app gọi
  lại) và `ai_unavailable` (mục 6.6). Lần hỏi đang chờ (đã có câu, chưa có kết quả) vẫn được trả lại như Bước 4.
- `GET /sessions/current` **không bao giờ gọi AI**: có chỗ đang chờ `generating` → `item: null`, `preparing: true`; chỗ đang chờ `ready` → G rồi trả câu; cần câu AI mới chưa
  có → `item: null`, `preparing: true`; app gọi `next`.
- Mọi đọc trong transaction vẫn đi qua `tx` (M1, PX4).

## 7. Tạo câu AI: dữ liệu gửi đi, luật kiểm

### 7.1 Dữ liệu gửi cho AI (AR7)

Chỉ nội dung học: chữ, loại từ, level CEFR (null với từ riêng không có level), nghĩa tiếng Việt, nhãn ngữ cảnh (catalog; từ riêng: null), và với dạng chọn là các nhiễu / nghĩa
sai do hệ thống chọn. Không gửi email, tên, id người học, câu ngữ cảnh của Lan (bài từ câu đã lưu không gọi AI).

### 7.2 `cloze` nguồn AI (thao tác `generate_cloze` của Bước 6, khuôn không đổi)

- Dùng thao tác có sẵn; Bước 7 thêm **một bản prompt mới** (revision kế tiếp, admin vẫn sửa được) với lời dặn của D13/D14: câu phải có manh mối chỉ hợp với từ và nghĩa
  này (cụm từ đi kèm, bối cảnh của nhãn ngữ cảnh); trước khi trả lời, tự rà các từ khác (nhất là từ gần nghĩa) có thể điền vào chỗ trống và viết lại câu cho tới khi
  không còn. Chữ prompt duyệt ở plan (như Bước 6).
- Luật kiểm sau khi cổng AI trả `succeeded` (PRC6, PRC7): mỗi `accepted_answers` (đã chuẩn hóa như chấm) phải là một **dạng hợp lệ** của từ = lemma, cách viết khác
  được chấp nhận, `accepted_forms` (CR22), dạng chia trong `entry_inflections`, dạng chia bổ sung theo chữ (mục 10). Có dạng không hợp lệ → loại câu, ghi dạng đó vào danh
  sách "dạng chưa biết" (mục 10), viết lại `#2`.
- **Câu không được chứa sẵn từ đang hỏi ngoài chỗ trống** (PRC6; sửa sau review R15): chạy `maskExample` trên câu (đã bỏ chỗ trống) với lemma, cách viết khác, dạng chia;
  khớp (ví dụ "Deploy is easy: we ___ the app daily.") → loại câu, viết lại `#2`.
- Đáp án lưu: các dạng đã qua kiểm, chuẩn hóa như Bước 4 (`normalizedSet`).

### 7.3 `cloze` nguồn câu đã lưu (không AI)

- Chọn ngẫu nhiên một câu ngữ cảnh của Lan cho nghĩa đó mà `maskExample` che được (cùng luật với "gõ từ theo câu ví dụ" Bước 4 §7.4b); đáp án như Bước 4.
- Không có nút báo lỗi (Đề xuất vòng 1): câu là của riêng Lan, staff không được thấy và không sửa được; `reportable = false`. Lan sửa hoặc xóa câu.
- Câu của Lan có thể vừa nhiều từ: không AI thì không chặn được; giảm bằng "Làm lại" và gợi ý (rủi ro như Bước 4 §16).

### 7.4 `meaning_in_sentence` (thao tác mới `generate_meaning_question`)

- **Nghĩa sai (D17)**, hệ thống chọn trước, theo thứ tự cho tới đủ 3: (1) nghĩa khác còn thấy được của **chính entry** đó; (2) nghĩa của từ trong các nhóm của Lan qua
  bộ lọc nhiễu Bước 4 (`eligibleCandidates`, cả bước lọc thứ hai `practiceLemmaMeanings`); (3) nghĩa của nghĩa catalog ngẫu nhiên khác chữ. Mọi nghĩa sai đều qua luật
  "không chung nghĩa con" của Bước 4 §7.4 với nghĩa đúng và với nhau. Nghĩa sai phải có nghĩa tiếng Việt (để gửi cho AI; sau review R14), nên từ riêng của người học `en`
  không làm nghĩa sai. Nghĩa **hiện** cho Lan theo ngôn ngữ của Lan (`senseMeaning`).
- AI nhận từ, nghĩa đúng (`meaning_vi`) và 3 nghĩa sai (`other_meanings_vi`, tiếng Việt); viết một câu dùng từ với **đúng nghĩa đúng**, sao cho 3 nghĩa sai không hợp; trả câu,
  chữ dạng dùng trong câu, bản dịch.
- Luật kiểm: câu ≤ 300 ký tự, một dòng; chữ dạng dùng trong câu xuất hiện **đúng một lần** (khớp nguyên token như `maskExample`) và là dạng hợp lệ của từ (7.2).
- 4 lựa chọn xáo vị trí; `answer_key` dạng trắc nghiệm (`correct_index`, `option_private`), chấm như trắc nghiệm Bước 4. `distractor_sense_ids` lưu các nghĩa sai.

### 7.5 `mcq_sentence` (thao tác mới `generate_sentence_mcq`)

- Hệ thống chọn trước **dạng của đáp án** (ví dụ quá khứ `deployed`): bốc ngẫu nhiên trong các dạng của từ (từ gốc và các `kind` trong `entry_inflections`) mà có ít nhất
  3 ứng viên nhiễu có cùng dạng; ứng viên lấy trong nhóm qua bộ lọc Bước 4, chia về đúng dạng đó bằng bảng dạng chia của chính ứng viên (D18). Một chữ ứng với nhiều `kind`
  (`deployed` là `past` và `past_participle`) thì ứng viên phải có cùng một chữ cho mọi `kind` đó (ghi chú review 18/10 ở Bước 4 §15).
- AI nhận từ, nghĩa, dạng đáp án và tối đa 6 ứng viên (`ASSUMPTION`, cố định trong code); viết một câu có đúng một chỗ trống mà chỉ dạng đáp án vừa, chọn 3 ứng viên
  **không** vừa, trả câu, 3 nhiễu, bản dịch.
- Luật kiểm: đúng một chỗ trống; 3 nhiễu khác nhau và đều nằm trong danh sách ứng viên đã gửi (so sau chuẩn hóa); không nhiễu nào trùng dạng đáp án; câu không chứa sẵn từ
  đang hỏi ngoài chỗ trống (như 7.2).
- 4 lựa chọn xáo vị trí; chấm như trắc nghiệm Bước 4.

### 7.6 Kiểm từ riêng (thao tác mới `check_private_word`; D26)

- Trước câu AI đầu tiên của một từ riêng, và mỗi khi Lan đã sửa chữ, loại từ hoặc nghĩa của từ đó: gửi chữ, loại từ, nghĩa tiếng Việt; AI trả `ok` hoặc `not_recognized`.
- Kết quả nhớ trong `practice_word_checks` theo `(user_id, sense_id)` kèm **mã nội dung** (`content_key`) = SHA-256 của (lemma chuẩn NFC, giữ hoa thường như CR1; loại từ, chưa
  đặt thì `unspecified`; nghĩa chuẩn NFC, cắt khoảng trắng) lúc kiểm; mã khác → kiểm lại. Sửa lemma của từ riêng không tạo revision mới, nên chỉ `content_key` bắt được (sau
  review R22). Câu AI của từ riêng cũng lưu `content_key` này để biết câu tạo sẵn còn đúng nội dung không.
- Không giữ lượt của Lan (chủ dự án chịu một lời gọi ngắn mỗi từ riêng); lời gọi vẫn qua cổng AI nên tính vào trần lời gọi mỗi ngày của Bước 6.
- `not_recognized` → từ đó không có dạng AI (mục 6.6 dòng cuối); `ok` → tạo câu như thường. Lỗi của chính lời gọi kiểm (AI lỗi, chưa sẵn sàng) → câu đó xử lý như "AI
  lỗi" (mục 6.6), không ghi kết quả kiểm.

### 7.7 Ghi lại để tra ngược (Bước 6 §18)

Mỗi câu AI lưu (sửa sau review R2):
- `ai_request_id` = **mã gốc** (mã của sổ lượt; dùng cho `refund`);
- `ai_meta` = `AiResult.meta` (provider, model, effort, `prompt_revision`, `schema_version`) cộng `call_operation_id` = mã của lần gọi thật sinh ra câu (`mã` hoặc `mã#2`), để tra
  `ai_calls` của Bước 6;
- `ai_charged` = câu này đã thật sự bị trừ một lượt (`confirm` trả `confirmed`, ở H hoặc lần xác nhận muộn ở G).

Báo lỗi chụp các trường này (mục 9).

### 7.8 Hình dạng dữ liệu của dạng mới (Đề xuất; sau review R7)

Kiểu JSON ở `practice.types.ts` mở rộng, chỉ thêm; câu Bước 4 đã lưu không đổi.

| Dạng | `prompt` (gửi cho app) | `answer_key` (không gửi trước khi nộp) | `hints` |
|---|---|---|---|
| `cloze` (hai nguồn) | `{ kind: 'cloze', sentence }` (có `___`) | `kind: 'type_word'` như Bước 4 (`main`, `accepted`) + `translation_vi` (câu AI, null với câu đã lưu) | `level1 { kind: 'first_letter', text: 'd' }`, `level2 { kind: 'definition', text }`, `level3 { kind: 'meaning', text }`; nấc vắng thì lùi lên (mục 8) |
| `meaning_in_sentence` | `{ kind: 'meaning_in_sentence', sentence, highlight, options[4], meaning_language }` (`highlight` = chữ dạng dùng trong câu, để app in đậm) | `kind: 'mcq'` (`correct_index`, `option_private`) + `translation_vi` | `level1 { kind: 'definition', text }` |
| `mcq_sentence` | `{ kind: 'mcq_sentence', sentence, options[4] }` | `kind: 'mcq'` + `translation_vi` | `level1 { kind: 'definition', text }` |

- `reveal` và `asked_private` giữ như Bước 4. `translation_vi` chỉ nằm trong `answer_key` (PRC22), hiện sau khi nộp cho người học `vi`.
- **Che từ riêng trong bản sao báo lỗi**: **mọi** `prompt.kind` có `options` đều che theo `option_private` (hiện `buildSnapshot` chỉ che khi `kind === 'mcq'`,
  `snapshot.ts:18-23`). Lựa chọn là **nghĩa** (`meaning_in_sentence`) thì che bằng mặt nạ nghĩa (`PRIVATE_MEANING_MASK`), lựa chọn là chữ thì mặt nạ chữ. Từ đang hỏi chỉ
  không che khi là câu AI có đồng ý của Lan (mục 9.2). Bản sao chụp cả `level3`.
- **Lịch sử, kết quả sau khi nộp**: `correctOf` (`answers.service.ts:28-34`) trả **lựa chọn đúng** cho cả ba `kind` có lựa chọn (`mcq`, `meaning_in_sentence`, `mcq_sentence`);
  `cloze` trả dạng đáp án chính. Lịch sử hiện câu, các lựa chọn, đáp án đúng, và bản dịch với người học `vi`.
- `ItemView.hints_available` có thêm nấc 3.

## 8. Gợi ý, chấm, nút sau câu

- **Gợi ý** (D9):

  | Dạng | Nấc 1 | Nấc 2 | Nấc 3 |
  |---|---|---|---|
  | `cloze` (cả hai nguồn) | Chữ cái đầu: `d…` (không có số chữ) | Định nghĩa tiếng Anh (≤ `hint_definition_max_chars`) | Nghĩa tiếng Việt (chỉ người học `vi`) |
  | `meaning_in_sentence`, `mcq_sentence` | Định nghĩa tiếng Anh của nghĩa đúng (≤ `hint_definition_max_chars`) | — | — |

  Nấc vắng (từ riêng không có định nghĩa; người học `en` không có nấc 3) thì các nấc sau **lùi lên** (Đề xuất): từ riêng của người học `vi` có nấc 1 chữ cái đầu, nấc 2
  nghĩa tiếng Việt. Không có nấc nào → `hint-unavailable` như Bước 4. API gợi ý nhận `level` 1–3 (thêm 3). Với `meaning_in_sentence`, định nghĩa gần như lộ đáp án; chấp
  nhận vì dùng gợi ý thì không được "Đã biết".
- **Chấm, "Làm lại", "Bỏ qua"**: `cloze` như gõ từ Bước 4 (kể cả `type_word_max_retries`); hai dạng chọn như trắc nghiệm Bước 4 (sai là hiện đáp án, không làm lại).
- **Nút sau câu, "từ hay sai", lịch sử 6 tháng**: như Bước 4 (D9). Lần hỏi bị báo lỗi `open` hoặc đã `confirmed` không tính vào "từ hay sai" (giống `fixed` của Bước 4).

## 9. Báo lỗi và trả lượt

### 9.1 Lý do báo lỗi do admin quản lý (D25)

Bảng `practice_report_reasons` (Practice sở hữu). Mỗi lý do:

| Ô | Ý nghĩa |
|---|---|
| `code` | Mã cố định (khóa), không đổi sau khi tạo |
| `label_vi`, `label_en` | Tên hiện cho người học |
| `detail_hint_vi`, `detail_hint_en` | Dòng gợi ý trong ô chi tiết (null được), ví dụ "Từ nào khác cũng đúng?" |
| `applies_to` | `ai` / `non_ai` / `all` (loại câu thấy lý do này) |
| `note_required` | Ô chi tiết bắt buộc hay không |
| `refundable` | Xác nhận lỗi thì trả lượt không (chỉ có tác dụng với câu AI) |
| `active`, `position` | Bật/tắt; thứ tự hiện |

Lý do ban đầu (seed trong migration; admin sửa được):

| `code` | Tên | `applies_to` | `refundable` |
|---|---|---|---|
| `meaning_wrong` | Nghĩa sai | `all` | false |
| `graded_wrong` | Đáp án đúng mà bị chấm sai | `all` | false (Chốt D32 sau review R17; admin đổi được trong danh sách lý do) |
| `hint_wrong` | Gợi ý sai | `all` | false |
| `other` | Khác | `all` | false |
| `ai_sentence_unnatural` | Câu sai ngữ pháp hoặc không tự nhiên | `ai` | true |
| `ai_more_than_one_answer` | Có hơn một đáp án đúng | `ai` | true |
| `ai_wrong_meaning` | Câu dùng sai nghĩa của từ | `ai` | true |

- API admin (quyền `settings.manage`, chỉ `admin`): `GET`, `POST`, `PATCH /v1/admin/practice/report-reasons` (không xóa; tắt bằng `active = false`).
- Không có form nhiều ô cho từng lý do: một ô chi tiết ≤ 300 ký tự (như Bước 4) có dòng gợi ý (Đề xuất vòng 1, chủ dự án đồng ý).

### 9.2 Lan báo lỗi

- `GET /v1/practice/report-reasons?kind=ai|non_ai` (đơn giản hóa sau review: danh sách chỉ phụ thuộc loại câu, app tải một lần cho cả phiên): các lý do `active` hợp với loại
  câu (`ai` cho ba dạng AI; `non_ai` cho dạng còn lại; lý do `all` có ở cả hai), theo `position`, theo ngôn ngữ của Lan. `ItemView` có sẵn `reportable` và loại câu.
- `POST /v1/practice/items/{id}/report` (như Bước 4, thêm): `reason` phải là một lý do `active` hợp với loại câu, không thì `400 validation-failed`; `note` bắt buộc khi
  `note_required`; báo cáo chụp `reason_label` lúc gửi, `question_source`, `ai_operation_id`, `ai_meta`.
- **Câu AI về từ riêng (D26):** báo được; body phải có `share_private_word: true` (app hiện "Nhân viên sẽ xem câu này và từ của bạn để kiểm tra"), thiếu → `400
  share-consent-required`. Bản sao **không che** từ đang hỏi; các từ riêng khác trong câu (nhiễu, nghĩa sai) vẫn che như D36. Câu không AI về từ riêng: giữ D36
  (`report-not-available`). Bài từ câu đã lưu: `report-not-available`.
- Giới hạn `reports_per_hour` như Bước 4.
- `GET /v1/practice/reports` (mới, của chính Lan; D27): trạng thái từng báo cáo, `refunded` (true / false / null), thời điểm. App hiện "Đã trả lại 1 lượt" khi có giao diện.
  Không gửi email.

### 9.3 Staff xử lý (D27)

- Danh sách `GET /v1/admin/practice/reports` (quyền `content.edit`) thêm lọc `reason`, `source` (`rule` / `ai`; bài từ câu đã lưu không báo được nên không có lọc riêng); mỗi
  dòng câu AI có `ai_operation_id`, `call_operation_id`, model, `prompt_revision`.
- `POST /v1/admin/practice/reports/{id}/resolve`, `status`:
  - Câu không AI: `no_error` hoặc `fixed` (như Bước 4).
  - Câu AI: `no_error` hoặc **`confirmed`** (mới). `confirmed` + lý do `refundable` + câu có `ai_charged = true` → `entitlements.refund(userId, 'ai_practice', ai_operation_id
    (mã gốc), reportId)` **sau khi** lệnh ghi trạng thái commit (mỗi hàm Bước 5 một transaction ngắn, R6); ghi `refunded` = kết quả. Lý do không `refundable`, hoặc câu
    `ai_charged = false` (câu được giao miễn phí, B7E12, B7E33) → `confirmed`, `refunded = false`, **không** gọi `refund` (sau review R2: `refund` của Bước 5 chỉ đếm số lượt
    đã dùng trong cả chu kỳ, không tìm dòng `use` của mã đó, nên Practice phải tự kiểm câu đã bị trừ chưa).
  - Sai cặp (ví dụ `confirmed` cho câu không AI) → `409 resolve-status-not-allowed`.
- **Lượt của chu kỳ trước** (Chốt D30 sau review R2): `refund` của Bước 5 (R21) ghi `credit` vào chu kỳ **hiện tại** nếu chu kỳ này Lan đã dùng ≥ 1 lượt, kể cả khi lượt
  bị trừ ở chu kỳ trước. Design tạm giữ đúng hành vi đó. `refund` trả false (chu kỳ này chưa dùng lượt nào) → `confirmed`, `refunded = false`; Lan thấy "Đã xác nhận lỗi; lượt
  này không trả lại được".
- **Staff xử lý báo cáo của chính mình** (Chốt D33 sau review R18): được phép; danh sách trả lượt của `admin` có cột "người xử lý là người báo" để `admin` thấy.
- Ghi `resolved_by` và **`resolved_by_role`** (mới, như `granted_by_role` của Bước 5).
- `admin` xem lại (quyền `settings.manage`): `GET /v1/admin/practice/refunds?resolved_by=&from=&to=` — các báo cáo `confirmed` của câu AI, ai xác nhận, vai trò, có trả lượt
  không, và `self_resolved` (người xử lý chính là người báo; D33). Không có nút thu hồi lượt đã trả (sổ lượt Bước 5 không có kiểu "rút lại").

## 10. Dạng chia bổ sung (D15)

- Practice ghi lại mỗi lần luật 7.2 / 7.4 loại một dạng AI dùng mà bảng không biết: bảng `practice_unknown_forms(id, lemma_key, form_key, form, rejected_count, first_seen_at,
  last_seen_at)`, unique `(lemma_key, form_key)`, ghi bằng `INSERT … ON CONFLICT DO UPDATE` tăng `rejected_count`; **không có cột người học**. Danh sách sẽ có cả từ đồng nghĩa,
  cụm nhiều chữ, lỗi chính tả (AI không nghe lời), không chỉ dạng chia thật (sau review R16).
- Staff (quyền `content.edit`: `admin`, `editor`): `GET /v1/admin/practice/unknown-forms` (nhiều lần bị loại nhất trước, phân trang); `POST /v1/admin/content/word-forms`
  `{lemma, form}` để nhận dạng đó; `DELETE /v1/admin/practice/unknown-forms/{id}` để **bỏ qua** một dòng (không phải dạng chia); `DELETE /v1/admin/content/word-forms/{id}` để
  gỡ một dạng đã nhận.
- Content giữ bảng `word_form_additions(id, lemma_key, form, form_key, added_by, created_at)`, unique `(lemma_key, form_key)`; áp cho **mọi entry cùng chữ** (catalog và từ
  riêng), nên staff không phải mở từ riêng của ai. Nhận xong, dòng tương ứng ở `practice_unknown_forms` bị xóa.
- Chữ của từ riêng có thể hiện trong danh sách (chỉ chữ, không kèm người): chính sách riêng tư phải ghi (mục 20).

## 11. AI tra nghĩa (Content; D19–D23, D29)

### 11.1 Luồng

```
 Lan gõ "rizz" → GET /v1/lookup (Bước 3) → không thấy → app hiện [Tra bằng AI (còn 87 lượt)] (+ ô tick "gửi kèm câu" nếu Lan có gõ câu)
 Lan bấm → POST /v1/lookup/ai { text, context_sentence? }  (Idempotency-Key)
   1. quyền ai.lookup (Free → 403 entitlement-required)
   2. ai.isReady('lookup_word') → chưa sẵn sàng: 503 ai-unavailable
   3. reserve(Lan, 'ai_lookup', opId)              → từ chối: refusalProblem của Bước 5
   4. ai.run('lookup_word', …, { operationId: opId }) → succeeded → confirm(opId)
                                                    → in_progress → 409 ai-in-progress, Retry-After 2 (không release)
                                                    → còn lại → release → 503 ai-lookup-failed (kèm retryable)
   5. tìm lemma AI trả về trong catalog và từ riêng của Lan (như GET /v1/lookup) → trả { suggestion, catalog_senses }
 Lan chọn nghĩa catalog → POST /v1/quick-add { sense_id } (Bước 3)
 Lan chọn gợi ý (đã sửa nếu muốn) → POST /v1/quick-add { new_word: {…, examples, ai_suggestion: true} }
```

- **Khi nào gọi** (D19): chỉ khi Lan bấm. Nút hiện khi không tìm thấy, và sau "không phải nghĩa này".
- **Câu Lan gặp** (D20): `context_sentence` chỉ có trong body khi Lan tick; mặc định không. Không bao giờ ghi vào log (SR10).
- **Mã thao tác:** suy ra từ `Idempotency-Key` của request (`lookup:` + 32 ký tự đầu SHA-256 của key; khớp `OPERATION_ID_PATTERN`), để lần gửi lại sau lỗi tạm dùng đúng mã
  cũ (ER17: thử lại sau lỗi tạm theo ER5).
- **`@Idempotent({ timeoutSeconds: 60 })`** (Đề xuất): với cơ chế D12 đã lên `dev`, handler chạy ngoài transaction; 60 giây > thời gian xấu nhất của một lần tra (tối đa 2
  lần gọi trong quỹ `ai.call_timeout_seconds` 10 giây, cộng hàng đợi). Cùng key cùng body → trả lại kết quả cũ, không gọi AI, không trừ lượt. Khe đã chấp nhận của D12 (máy chủ
  chết **sau** khi handler xong, `confirm` đã trừ, **trước** khi ghi kết quả chống trùng) làm app phải dùng key mới → mã mới → trừ thêm 1 lượt; hiếm, ghi rủi ro (mục 20; sau
  review R12).
- **Lượt** (ER6, Bước 5): trừ khi AI trả kết quả hợp lệ, dù Lan lưu hay bỏ gợi ý.
- **Catalog đã có từ gốc** (D21): response trả `catalog_senses` (nghĩa còn thấy được của lemma AI trả về, catalog trước, rồi từ riêng của Lan); app hiện chúng trên gợi ý
  AI. Nghĩa Lan vừa bấm "không phải nghĩa này" do app ẩn (API không biết).
- **Ngôn ngữ**: người học `vi` thấy `meaning_vi`; người học `en` thấy `definition_en` làm nghĩa (khuôn của `lookup_word` trả cả hai).

### 11.2 Lưu gợi ý thành từ riêng (D22)

- `POST /v1/quick-add`, `new_word` thêm: `examples` (0–2 câu, mỗi câu 1–300 ký tự) và `ai_suggestion` (boolean). Lan sửa các ô trước khi gửi (app); API nhận giá trị đã sửa.
- **Định nghĩa tiếng Anh** (Chốt D31 sau review R8: không thêm ô): `new_word` hiện chỉ có `lemma`, `pos`, `meaning`, `level`, `topics`, `form_of` (`quick-add.controller.ts:17-29`); từ
  riêng lưu **một** nghĩa theo ngôn ngữ của người học (người học `vi` → `gloss_vi`, không có `definition_en`; `private-words.service.ts:55-58`). Vì vậy `definition_en` AI trả về
  hiện trên màn nhưng không lưu. Câu 21a ("sửa mọi ô") áp cho các ô có lưu; từ riêng của người học `vi` không có nấc gợi ý định nghĩa (mục 8 lùi nấc).
- `ai_suggestion: true` → revision của từ riêng có `draft_source = 'ai_suggestion'` (mở CHECK `('csv', 'ui', 'user')`); trang từ hiện "Nguồn: AI gợi ý" (`WordSense.ai_suggested`).
  Nhãn do app khai, chỉ để Lan biết nội dung chưa ai duyệt. Lan sửa từ (`PATCH /v1/my-words`, tạo revision mới `draft_source = 'user'`) thì nhãn mất: nội dung đã là của Lan
  (Đề xuất, sau review R22).
- Câu ví dụ lưu vào `examples_en` của revision (hiện từ riêng tạo với `examplesEn: []`, `private-words.service.ts:157` trên `985531b`). Nhờ đó từ riêng có câu ví dụ, có gợi ý
  bằng câu ví dụ và có đề "gõ từ theo câu ví dụ" như từ catalog.
- `PATCH /v1/my-words/{id}` nhận thêm `examples` (0–2) để Lan sửa hoặc xóa câu ví dụ sau khi lưu.

### 11.3 Con số (D29)

Không đổi code: mặc định 100 lượt/tháng của Bước 5 giữ nguyên trong `settings.definitions.ts`; chủ dự án tự nâng `pro_ai_lookup_per_cycle`, `trial_ai_lookup_per_cycle`
(khoảng cho phép 0–5.000, đã đọc trên `dev`). Rủi ro: hai kho AI dùng chung trần toàn hệ thống `ai_daily_cap` (mục 20).

## 12. Dữ liệu (Đề xuất)

### 12.1 Practice (`practice.prisma`)

| Bảng | Thay đổi |
|---|---|
| `practice_sessions` | Thêm `cloze_source` (`ai` / `own` / null), `ai_planned` (int, mặc định 0), `ai_sense_ids` (uuid[], mặc định rỗng), `pending_ai_request_id` (uuid, null; "chỗ đang chờ", mục 6.5; UUID thường, không FK), `ai_stopped` (null / `quota-exhausted` / `plan-required` / `ai-unavailable`), `ai_notice_shown` (boolean, mặc định false). CHECK `types` nhận thêm ba giá trị |
| `practice_questions` | Thêm `source` (`rule` / `ai` / `own_sentence`, mặc định `rule`), `ai_request_id` (text, null; mã gốc), `ai_meta` (jsonb, null; có `call_operation_id`), `ai_charged` (boolean, mặc định false; mục 7.7), `sense_revision_id` (uuid, null; bản nội dung lúc tạo), `content_key` (text, null; mã nội dung của từ riêng, 7.6). CHECK `type` nhận thêm ba giá trị. Index `(user_id, sense_id) WHERE source = 'ai'` cho việc tìm câu chưa từng hiện |
| `practice_ai_requests` (mới) | `id` (uuid = mã gốc), `user_id`, `session_id`, `sense_id`, `type`, `round`, `state` (`generating` / `ready` / `failed`), `failure` (lý do, null), `ai_input` (jsonb, null; dữ liệu gửi AI, mục 6.5 D), `question_id` (null), `created_at`, `updated_at`. `session_id`, `question_id` là UUID thường, không FK (để job xóa phiên và cổng xóa từ riêng không vướng thứ tự; sau review R21). Unique một phần `(user_id, sense_id) WHERE state = 'generating'`; index `(session_id, state)` |
| `practice_report_reasons` (mới) | Mục 9.1; seed 7 dòng. `practice_reports.reason` có FK tới `code` (`ON DELETE RESTRICT`; lý do không bao giờ bị xóa, chỉ tắt) |
| `practice_reports` | Bỏ CHECK `reason` (thay bằng FK ở dòng trên, cùng module); thêm `reason_label`, `question_source`, `ai_operation_id` (mã gốc), `ai_meta`, `ai_charged`, `refunded` (boolean, null), `resolved_by_role`; CHECK `status` thêm `confirmed` |
| `practice_unknown_forms` (mới) | Mục 10 |
| `practice_word_checks` (mới) | `user_id`, `sense_id`, `content_key`, `verdict` (`ok` / `not_recognized`), `checked_at`; khóa `(user_id, sense_id)` |

**Job dọn dữ liệu** (`practice-cleanup.service.ts:31-36`, mỗi giờ): xóa câu hỏi không còn lần hỏi nào **trừ** câu `source = 'ai'` có `created_at` sau mốc `history_months`
(giữ câu AI chưa từng hiện tới mốc đó); xóa dòng `practice_ai_requests` cũ hơn 7 ngày (`ASSUMPTION`, cố định; mã thao tác chỉ cần trong 24 giờ replay của cổng AI);
`practice_unknown_forms` không xóa tự động. Thêm một việc trong cùng job: thử lại `refund` cho báo cáo `confirmed` có `refunded = null` (B7E77; `refund` idempotent theo
mã thao tác).

**Xóa từ riêng** (cổng của Learning, Bước 4 §11; sửa sau review R4): sau bước khóa phiên đã có, khóa (`FOR UPDATE`) rồi xóa `practice_ai_requests` và `practice_word_checks` của
các nghĩa đó **trước**, rồi mới xóa báo cáo, lần hỏi, câu hỏi như cũ; phiên có `pending_ai_request_id` trỏ tới yêu cầu bị xóa thì xóa cờ. Câu AI chưa từng hiện của nghĩa đó bị
xóa cùng câu hỏi. Câu tạo sẵn của **từ khác** có từ riêng này làm nhiễu vẫn giữ, nhưng không bao giờ được dùng lại (mục 6.5: nhiễu phải còn thấy được).

### 12.2 Content (`content.prisma`)

- `sense_revisions.draft_source` CHECK thêm `ai_suggestion`.
- Bảng mới `word_form_additions` (mục 10).
- Không thêm cột cho câu ví dụ (dùng `examples_en` có sẵn).

### 12.3 Không đổi

Entitlements (`usage_records`…), AI (`ai_operations`, `ai_calls`…): không đổi bảng. AI thêm dòng seed cho ba thao tác mới trong `ai_operation_settings` (`model_ref NULL`, như
ba thao tác cũ: admin phải chọn model trước khi dùng, mục 6.1), `ai_prompts`, `ai_prompt_revisions` và mở CHECK `ai_operation_settings_operation_check` (code facts 6.7).

## 13. API (tóm tắt)

| # | API | Mới / đổi | Quyền, khóa |
|---|---|---|---|
| 1 | `POST /v1/practice/sessions` | Đổi: `types` thêm 3 giá trị, `cloze_source`; từ chối mới (mục 6.1); response thêm `ai_planned` | Như Bước 4 (`Idempotency-Key`) |
| 2 | `GET /v1/practice/sessions/current` | Đổi: thêm `preparing` | Như Bước 4 |
| 3 | `POST /v1/practice/sessions/{id}/next` | Đổi: body tùy chọn `{ retry_ai: true }`; trạng thái `preparing`, `ai_unavailable`; `notice` thêm `ai-fallback`, `word-not-recognized` | Như Bước 4 |
| 4 | `POST /v1/practice/sessions/{id}/prepare` | Mới (mục 6.4) | `practice.answer` |
| 5 | `POST /v1/practice/items/{id}/hint` | Đổi: `level` 1–3 | Như Bước 4 |
| 6 | `POST /v1/practice/items/{id}/answer` | Đổi: response thêm `translation` (câu AI, người học `vi`) | Như Bước 4 |
| 7 | `GET /v1/practice/report-reasons?kind=ai\|non_ai` | Mới | Người học |
| 8 | `POST /v1/practice/items/{id}/report` | Đổi: lý do theo bảng, `share_private_word` | Như Bước 4 |
| 9 | `GET /v1/practice/reports` | Mới (của chính mình) | Người học |
| 10 | `POST /v1/lookup/ai` | Mới | `@LearnerContent()`, `Idempotency-Key`, `user.write` |
| 11 | `POST /v1/quick-add` | Đổi: `new_word.examples`, `new_word.ai_suggestion` | Như Bước 3 |
| 12 | `PATCH /v1/my-words/{id}` | Đổi: `examples` | Như Bước 3 |
| 13 | `GET`, `POST`, `PATCH /v1/admin/practice/report-reasons` | Mới | `settings.manage` |
| 14 | `GET /v1/admin/practice/reports` | Đổi: lọc `reason`, `source`; dòng câu AI có meta | `content.edit` |
| 15 | `POST /v1/admin/practice/reports/{id}/resolve` | Đổi: `confirmed`, trả lượt | `content.edit`, `Idempotency-Key` |
| 16 | `GET /v1/admin/practice/refunds` | Mới | `settings.manage` |
| 17 | `GET`, `DELETE /v1/admin/practice/unknown-forms` (`DELETE …/{id}` = bỏ qua) | Mới | `content.edit` |
| 18 | `POST`, `DELETE /v1/admin/content/word-forms` | Mới | `content.edit`; POST có `Idempotency-Key` |

Mọi thay đổi chỉ **thêm** (SR7): field mới, giá trị enum mới; client bỏ qua giá trị chưa biết. Chưa có client nào dùng các API này (chưa có giao diện người học).

**Mã lỗi mới** (Problem Details; Đề xuất):

| Mã | Status | API | Khi |
|---|---|---|---|
| `ai-quota-insufficient` | 403 | 1 | Còn ít lượt bài AI hơn số phiên cần; kèm `remaining`, `needed`, `resets_at` |
| `ai-unavailable` | 503 | 1, 10 | Có sẵn ở Bước 5 (`refusalProblem`); dùng lại khi AI tắt, chạm trần |
| `share-consent-required` | 400 | 8 | Báo lỗi câu AI về từ riêng mà thiếu `share_private_word: true` |
| `resolve-status-not-allowed` | 409 | 15 | `confirmed` cho câu không AI, hoặc `fixed` cho câu AI |
| `ai-in-progress` | 409 | 10 | Cùng mã thao tác đang chạy; `Retry-After: 2` |
| `ai-lookup-failed` | 503 | 10 | AI lỗi; kèm `retryable` (lỗi tạm: true; lỗi vĩnh viễn: false) |
| `word-form-exists` | 409 | 18 | Dạng đã có cho chữ đó |

`preparing` và `ai_unavailable` là **trạng thái** trong response 200 của `next`, không phải lỗi (để app hiện đúng màn, không phải bắt lỗi).

## 14. Cài đặt (D28)

| Cài đặt | Mặc định | Khoảng | Nhãn |
|---|---|---|---|
| `practice.ai_prefetch_count` (số câu AI tạo trước) | 2 | 0–20 (0 = tắt) | Mặc định Chốt (D8); khoảng `ASSUMPTION` |

Con số cố định trong code (liệt kê để chủ dự án duyệt; muốn chỉnh trong admin thì đổi thành cài đặt): `retry_after_seconds` của `preparing` = 2; tối đa 6 ứng viên nhiễu
gửi cho `generate_sentence_mcq`; yêu cầu `generating` quá 2 phút là bỏ dở; giữ `practice_ai_requests` 7 ngày; tối đa 2 câu ví dụ khi lưu từ riêng (`LOOKUP_EXAMPLES_MAX` của
Bước 6). Công thức `ai_planned` là luật, không phải con số.

Cài đặt có sẵn cần xem lại khi có số liệu thật (không đổi mặc định ở Bước 7): `ai.daily_provider_calls_cap` (3.000; Bước 7 tốn 1–2 lời gọi mỗi câu, cộng 1 lời gọi mỗi từ
riêng mới), `entitlements.ai_daily_cap` (1.000; dùng chung cho bài AI và tra nghĩa), hai con số tra nghĩa (D29).

## 15. Thao tác mới ở cổng AI (Đề xuất; chữ prompt ban đầu duyệt ở plan, như Bước 6)

Mỗi thao tác theo khung `define()` của Bước 6 (khuôn vào `strictObject`; khuôn ra đúng các khóa đã khai, mỗi khóa là chuỗi hoặc danh sách chuỗi; `normalizeAndCheck`), thêm
vào `AI_OPERATIONS`, `DEFAULT_MAX_OUTPUT_TOKENS`, `OPERATIONS`, `INITIAL_PROMPTS`, bộ nối giả, migration (CHECK + seed), như code facts 6.7. `schema_version = 1`.

| Thao tác | Vào | Ra | Luật của cổng (trước khi trả cho Practice) |
|---|---|---|---|
| `generate_meaning_question` | `word` 1–100; `part_of_speech`; `level` A1–C2 / null; `meaning_vi` 1–300; `context_label` null / 1–2.000; `other_meanings_vi` 3 mục, mỗi mục 1–300 | `sentence`; `word_in_sentence`; `translation_vi` | `sentence` một dòng, ≤ 300; `word_in_sentence` 1–100, không chứa `_`; `translation_vi` không trống, ≤ 600 |
| `generate_sentence_mcq` | `word`; `part_of_speech`; `level`; `meaning_vi`; `context_label`; `answer_form` 1–100; `candidates` 3–6 mục, mỗi mục 1–100 | `sentence`; `distractors` (danh sách); `translation_vi` | Đúng một chỗ trống `___`; `distractors` đúng 3 mục, khác nhau, không chứa `_`; `translation_vi` như trên |
| `check_private_word` | `word` 1–100; `part_of_speech` / `unspecified`; `meaning_vi` 1–300 | `verdict` | `verdict` ∈ {`ok`, `not_recognized`} sau khi đổi chữ thường |

- Max output tokens mặc định (`ASSUMPTION`, admin chỉnh như Bước 6): 1.200 cho hai thao tác tạo câu, 300 cho `check_private_word`.
- Luật **ngữ nghĩa** (dạng hợp lệ của từ, nhiễu thuộc danh sách đã gửi) do Practice kiểm (mục 7), không phải cổng AI (AR9: cổng chỉ kiểm hình dạng).
- Prompt mới cho `generate_cloze` (một revision) và prompt ban đầu cho ba thao tác: viết ở plan, chủ dự án duyệt chữ.
- **Seed prompt** (sau review R13): migration bản prompt mới của `generate_cloze` chỉ đổi prompt hiện hành khi prompt đó **vẫn là bản ban đầu chưa ai sửa** (revision 1 do tác nhân
  hệ thống ghi); admin đã sửa thì không đè (Bước 6 D15 không có chọn phiên bản), log một dòng để admin biết có chữ mới trong plan. `INITIAL_PROMPTS.generate_cloze` đổi theo
  bản mới; `initial-prompts.spec.ts` (hiện chỉ đọc **một** migration `_ai_initial_prompts` và đếm cố định) phải sửa để đọc mọi migration seed prompt và đếm theo số thao tác.
- **Mã lỗi khuôn mới** của `OutputProblem` (`define-operation.ts:5`): `distractors` (không đúng 3 mục / trùng nhau) và `verdict` (giá trị ngoài danh sách).
- Bộ nối giả: mỗi thao tác có kết quả hợp lệ mặc định, cộng các ca smoke cần (đáp án không phải dạng của từ, nhiễu ngoài danh sách, `not_recognized`, lỗi tạm, chậm).

## 16. Edge cases (When → Then)

Theo luật mà design dẫn. `B7E#` để plan và smoke trích.

### 16.1 Lượt và quyền (ER4, ER5, ER6, ER7, ER14, ER15, ER17; Bước 5 §7)

| # | When | Then |
|---|---|---|
| B7E1 | Lan (Free) mở phiên có `cloze` (bất kỳ nguồn) hoặc dạng AI | `403 entitlement-required`; phiên đang mở giữ nguyên |
| B7E2 | Lan còn 3 lượt, phiên cần 5 | `403 ai-quota-insufficient`, `remaining: 3`, `needed: 5`, `resets_at`; không trừ, không giữ chỗ |
| B7E3 | Lan còn 3 lượt, có 2 câu AI chưa từng hiện dùng lại được cho các từ đã đánh dấu, phiên cần 5 | `needed = 3` → mở được |
| B7E4 | Lan chọn "gõ từ + điền từ câu đã lưu" (không dạng AI), còn 0 lượt | Mở được (không cần lượt); Free vẫn bị B7E1 |
| B7E5 | Admin tắt AI, Lan mở phiên có dạng AI | `503 ai-unavailable`; dạng không AI vẫn mở được |
| B7E6 | Lan mở phiên lúc trần toàn hệ thống đã chạm, hoặc trần = 0 | `503 ai-unavailable`, không kèm số giây (mục 6.1, sau review R19) |
| B7E7 | Câu AI tạo thành công lần đầu | `reserve` → `ai.run` → kiểm qua → ghi câu → `confirm` → `confirmed`: trừ 1 |
| B7E8 | Câu bị luật loại lần 1, `#2` qua | Một lượt (một `reserve`, một `confirm` theo mã gốc; D11 Bước 5) |
| B7E9 | Câu bị loại cả hai lần | `release`; 0 lượt; xử lý như AI lỗi (mục 6.6) |
| B7E10 | `ai.run` trả lỗi tạm, lỗi vĩnh viễn (trừ `input-mismatch`) hoặc `unavailable` | `release`; 0 lượt |
| B7E11 | `ai.run` trả `in_progress` | Không `release`; `next` trả `preparing` |
| B7E12 | `confirm` trả `released` hoặc `not-found` (xác nhận muộn quá 2 phút mà hết lượt, R7 Bước 5) | Câu vẫn giao cho Lan; log `ai_confirm_not_charged`; không coi là đã trừ |
| B7E13 | `reserve` từ chối `quota-exhausted` giữa phiên (admin hạ con số) | Mục 6.6 dòng 2; `ai_stopped = quota-exhausted` |
| B7E14 | Gói Lan hết giữa phiên (`plan-required`) | Như B7E13; câu đã tạo vẫn nộp được (ER4) |
| B7E15 | Câu chưa từng hiện được dùng lại | Không `reserve`, 0 lượt (D10 Bước 5) |
| B7E16 | Lan bấm `next` hai lần, hoặc `prepare` và `next` cùng lúc cho cùng từ | Một yêu cầu `generating` (unique); `next` đặt chỗ đang chờ trỏ tới yêu cầu đó; lần sau trả `preparing`; một lượt; khi câu xong, đúng **một** lần hỏi được tạo (G có điều kiện) |
| B7E17 | Hai tab cùng `prepare` | Như B7E16 |
| B7E18 | Bài từ câu đã lưu | Không gọi `reserve`, không gọi AI |
| B7E19 | AI tra nghĩa thành công rồi Lan bỏ gợi ý | Đã trừ 1 lượt `ai_lookup` (ER6) |
| B7E20 | AI tra nghĩa lỗi tạm, Lan bấm lại cùng `Idempotency-Key` | Cơ chế D12 đã xóa khóa khi handler lỗi → chạy lại; cùng mã thao tác → `reserve` mới (dòng cũ đã `released`, ER5); trừ tối đa 1 |
| B7E21 | AI tra nghĩa thành công, Lan gửi lại cùng key cùng body | Trả lại kết quả cũ, không gọi AI, không trừ thêm |
| B7E22 | Lan Free bấm tra AI | `403 entitlement-required` |
| B7E23 | Kiểm từ riêng (`check_private_word`) | Không `reserve`; không trừ lượt |

### 16.2 Cổng AI (AR3, AR4, AR5, AR7, AR8, AR9, AR12; Bước 6 §4.4, §8)

| # | When | Then |
|---|---|---|
| B7E30 | Bất kỳ kết quả không thành công nào của `ai.run` | Lan thấy "đang chuẩn bị", "AI tạm chưa dùng được" hoặc đổi dạng; **không bao giờ** bị chấm sai (AR4) |
| B7E31 | AI lỗi quá thời gian ở cả lần thử nhanh (Bước 6) | Practice không tự thử lại (Bước 6 §4.4); mục 6.6 |
| B7E32 | Máy chủ chết sau bước D, trước bước H | Yêu cầu `generating` quá 2 phút → một lần gọi sau giành quyền chạy lại (lệnh nguyên tử), dùng `ai_input` đã lưu, cùng mã; cổng AI trả kết quả đã lưu hoặc giành lại dòng `running`; Bước 5 trả giữ chỗ cũ hoặc giữ mới (tối đa 1 lượt) |
| B7E33 | Máy chủ chết sau khi ghi câu (H), trước `confirm` | Câu có, `ai_charged = false`. Khi câu được gắn vào lần hỏi (G), Practice gọi lại `confirm` (xác nhận muộn, R7 Bước 5): còn lượt thì trừ, không thì câu miễn phí. Chấp nhận phần miễn phí (hiếm) |
| B7E34 | Câu trả về đúng khuôn nhưng `accepted_answers` có `deployment` khi học `deploy` | Luật 7.2 loại; ghi `practice_unknown_forms`; viết lại `#2` |
| B7E35 | `generate_sentence_mcq` trả nhiễu không có trong danh sách đã gửi | Loại; `#2` |
| B7E36 | `generate_meaning_question` trả `word_in_sentence` không xuất hiện đúng một lần trong câu | Loại; `#2` |
| B7E37 | Nghĩa của từ riêng chứa chỉ thị kiểu "ignore previous instructions" | Chỉ là dữ liệu (AR8); đầu ra vẫn qua khuôn và luật; không có công cụ nào cho model |
| B7E38 | Gửi dữ liệu cho AI | Chỉ nội dung học (7.1); không email, tên, id; câu ngữ cảnh chỉ khi Lan tick ở tra nghĩa (AR7) |
| B7E39 | Admin đổi model hoặc prompt giữa hai câu | Câu mới mang `ai_meta` mới; câu cũ giữ meta cũ (AR12) |
| B7E40 | Cùng mã thao tác bị gửi lại với dữ liệu khác (lỗi lập trình) | `input-mismatch` → `release`, yêu cầu `failed` (`input-mismatch`), áp mục 6.6, log; không bao giờ kẹt `generating` (sau review R3) |
| B7E41 | Hàng đợi lời gọi cùng lúc đầy (`busy`) | Lỗi tạm → `release` → mục 6.6 |

### 16.3 Phiên, dạng bài, chấm (PRC4, PRC6, PRC7, PRC10, PRC11, PRC13, PRC21, PRC22; Bước 4 §7)

| # | When | Then |
|---|---|---|
| B7E45 | Phiên "gõ từ + điền từ AI", 10 câu, 10 từ đều làm được AI, không có câu tạo sẵn | `ai_planned = 5`; từ thứ 2, 4, 6, 8, 10 đánh dấu; câu 1 là gõ từ (che thời gian tạo câu AI đầu); tối đa 5 câu AI cả phiên |
| B7E46 | Phiên 10 câu, nhóm chỉ 4 từ, "gõ từ + điền từ AI" | Đánh dấu tối đa `ceil(10 × 1 ÷ 2) = 5` → 4 từ; `ai_planned = min(5, 4 + (10 − 4)) = 5`; vòng 2 câu AI theo xác suất `r ÷ q`; tổng ≤ 5 |
| B7E47 | Từ đã đánh dấu AI nhưng lúc tạo câu không còn làm được dạng AI (từ riêng "không nhận ra", nghĩa tiếng Việt bị xóa) | Dạng không AI nếu Lan có chọn; không thì bỏ qua từ (Bước 4 §7.2) |
| B7E48 | Phiên chỉ có dạng AI, AI lỗi ở câu 4 | `next` trả `ai_unavailable`, `reason: ai-failed`; `next` không cờ gọi lại vẫn trả `ai_unavailable` (không gọi AI); `next` với `retry_ai: true` tạo yêu cầu mới cho cùng chỗ; câu 1–3 giữ nguyên |
| B7E49 | Phiên trộn, AI lỗi ở câu 4 rồi câu 6 | Câu 4, 6 đổi sang dạng không AI; `notice: ai-fallback` chỉ ở câu 4 |
| B7E50 | Gõ `release` cho câu có đáp án `deploy` | `try_again` (còn lượt làm lại) hoặc `wrong`; không bao giờ đúng (D13) |
| B7E51 | Gõ `Deployed.` cho câu có đáp án `deployed` | Đúng (chuẩn hóa hiện có trên `dev`, `normalize.ts:7`: bỏ `.!?` cuối, chữ thường) |
| B7E52 | Câu điền từ từ câu đã lưu mà Lan gõ nhầm trong câu (`deplyed`) | Câu đó không dùng được (luật che từ không che được); dùng câu khác hoặc dạng khác |
| B7E53 | Xin gợi ý nấc 3 khi câu không có nấc 3 | `409 hint-unavailable` |
| B7E54 | Xin gợi ý nấc 2 trước nấc 1 | Như Bước 4 (API nhận nấc bất kỳ còn có; ghi nấc cao nhất đã xem) |
| B7E55 | `next` / `current` trả câu AI | Không chứa đáp án, nghĩa đúng của dạng chọn, bản dịch, nội dung gợi ý (PRC22) |
| B7E56 | Lan nộp câu AI | Response có đáp án, nghĩa, định nghĩa, bản dịch (người học `vi`); câu đã lưu đủ để chấm lại không cần AI (PRC10, SR5) |
| B7E57 | Catalog sửa nghĩa sau khi câu AI chưa từng hiện được tạo | Không dùng câu đó nữa (`sense_revision_id` khác); câu đã giao trước đó vẫn chấm theo bản đã lưu |
| B7E58 | Lan sửa từ riêng sau khi câu AI chưa từng hiện được tạo | Không dùng câu đó (`content_key` khác); kiểm từ riêng lại ở câu AI kế tiếp |
| B7E59 | Lan bỏ phiên có 2 câu AI tạo sẵn | Hai câu giữ lại; lần sau từ đó có câu AI (cùng dạng thuộc dạng Lan chọn) thì dùng, 0 lượt |
| B7E60 | Job dọn chạy khi có câu AI chưa từng hiện tạo hôm qua | Không xóa (chỉ xóa khi cũ hơn `history_months`) |
| B7E61 | Người học `en` mở phiên có dạng AI | Từ catalog có dạng AI; từ riêng (không có nghĩa tiếng Việt) dùng dạng khác; không thấy bản dịch, không có nấc 3 |
| B7E62 | `meaning_in_sentence` mà entry chỉ có một nghĩa và nhóm ít từ | Nghĩa sai lấy từ nghĩa catalog ngẫu nhiên (D17 bước 3) |
| B7E63 | `mcq_sentence` mà không dạng nào của từ có đủ 3 ứng viên cùng dạng | Từ đó không có dạng này (6.2) |
| B7E64 | Câu hỏi đang hiện mà từ bị bỏ khỏi việc học | Như Bước 4: `void`, `notice: word-not-found` |
| B7E65 | `current` cần câu AI chưa có | `item: null`, `preparing: true`; không gọi AI |

### 16.4 Báo lỗi, trả lượt (PRC18, PRC19; Bước 4 §10, Bước 5 §7.2)

| # | When | Then |
|---|---|---|
| B7E70 | Lan báo câu AI với lý do `ai_more_than_one_answer` | Báo cáo `open`; lượt đó không tính vào "từ hay sai" |
| B7E71 | Lan báo với lý do `applies_to = non_ai` cho câu AI, hoặc lý do đã tắt | `400 validation-failed` |
| B7E72 | Lý do `note_required` mà không có ghi chú | `400 validation-failed` |
| B7E73 | `editor` xác nhận `confirmed`, lý do `refundable` | `refund` → dòng `credit`; `refunded = true`; Lan thấy "Đã trả lại 1 lượt" trong API của mình |
| B7E74 | Xác nhận khi lượt đó bị trừ ở chu kỳ trước | D30, theo Bước 5 (R21): chu kỳ này Lan đã dùng ≥ 1 lượt → `credit` vào chu kỳ này, `refunded = true`; chưa dùng lượt nào → `refunded = false` |
| B7E75 | Xác nhận cho câu được giao miễn phí (`ai_charged = false`: B7E12, B7E33 khi xác nhận muộn cũng không trừ) | Không gọi `refund`; `confirmed`, `refunded = false` (Practice tự kiểm, vì `refund` của Bước 5 không tìm dòng `use` của mã đó; sau review R2) |
| B7E76 | Hai staff xác nhận cùng một báo cáo | Lần sau `409 report-not-open`; `refund` idempotent theo mã thao tác (một dòng `credit`) |
| B7E77 | Lệnh ghi `confirmed` thành công, `refund` lỗi (database tạm lỗi) | Báo cáo `confirmed`, `refunded = null`; job mỗi giờ thử `refund` lại cho các báo cáo `confirmed` có `refunded = null` (idempotent) |
| B7E78 | Admin tắt một lý do khi đang có báo cáo `open` dùng lý do đó | Báo cáo giữ `reason_label` lúc gửi; xử lý bình thường |
| B7E79 | Lan báo câu AI về từ riêng, không gửi `share_private_word` | `400 share-consent-required` |
| B7E80 | Lan báo câu AI về từ riêng có đồng ý | Bản sao có chữ và nghĩa của từ đang hỏi; từ riêng khác trong câu bị che (D36) |
| B7E81 | Lan báo câu không AI về từ riêng | `409 report-not-available` (D36 giữ) |
| B7E82 | Lan báo câu điền từ từ câu đã lưu | `409 report-not-available` |
| B7E83 | Lan xóa từ riêng sau khi báo câu AI của nó | Báo cáo của nghĩa đó bị xóa cùng (Bước 4 §11, CR23); lượt đã trả giữ nguyên |
| B7E84 | `confirmed` cho câu không AI | `409 resolve-status-not-allowed` |

### 16.5 Tra nghĩa, từ riêng, dạng chia (CR13, CR15, CR16, CR22, CR23)

| # | When | Then |
|---|---|---|
| B7E90 | Lan gõ `deplyo`, không tìm thấy, không bấm AI | Không gọi AI, không trừ lượt (D19) |
| B7E91 | AI trả lemma `deployment`, catalog có | `catalog_senses` có nghĩa catalog; gợi ý AI ở `suggestion` (D21) |
| B7E92 | AI trả lemma trùng một từ riêng sẵn có của Lan | `catalog_senses` có cả từ riêng đó (sau nghĩa catalog) |
| B7E93 | Lan lưu gợi ý có 3 câu ví dụ | `400 validation-failed` (tối đa 2) |
| B7E94 | Lan lưu gợi ý trùng (lemma, loại từ) với catalog | Như Bước 3 (CR13): vẫn cho tạo, trả `catalog_match` |
| B7E95 | Tra AI với `context_sentence` | Câu gửi cho AI; không vào log, không lưu ở Practice; lưu thành câu ngữ cảnh chỉ khi Lan gửi `sentence` ở quick-add (Bước 3) |
| B7E96 | Staff nhận dạng `vibe-coded` cho chữ `vibe-code` | Câu AI sau dùng dạng đó qua kiểm 7.2 cho mọi entry chữ `vibe-code`; dòng ở `practice_unknown_forms` bị xóa |
| B7E97 | Staff nhận một dạng đã có | `409 word-form-exists` |
| B7E98 | Từ riêng kiểm ra `not_recognized` | Không có dạng AI cho từ đó tới khi Lan sửa chữ, loại từ hoặc nghĩa; `notice: word-not-recognized` |
| B7E99 | Lời gọi `check_private_word` lỗi | Không ghi kết quả; câu đó như AI lỗi; lần sau kiểm lại |

### 16.6 Hệ thống (SR2, SR8, SR9, SR10, SR13, SR14)

| # | When | Then |
|---|---|---|
| B7E105 | Mã thao tác, id yêu cầu, id lý do | UUID mờ hoặc mã cố định không chứa thông tin người dùng (SR2); mã tra nghĩa là băm của `Idempotency-Key`, không lộ key |
| B7E106 | Lan gọi `prepare` / `next` / báo lỗi trên phiên, lần hỏi của người khác | `404 not-found` (SR9) |
| B7E107 | Log của mọi luồng Bước 7 | Chỉ id, trạng thái, lý do; không câu AI, đáp án, nghĩa từ riêng, câu ngữ cảnh, chữ Lan gõ (SR10) |
| B7E108 | Lan gọi `prepare` liên tục | Rate limit `practice.answer` → `429` kèm `retry-after` (SR14) |
| B7E109 | Lan đổi múi giờ giữa phiên | Ngày của phiên và ngày của lượt như Bước 4–5 (SR13); chu kỳ lượt AI theo mốc UTC của Bước 5 |
| B7E110 | Handler tra AI chạy lâu hơn thời hạn giữ khóa (60 giây), hoặc máy chủ chết sau `confirm`, trước khi ghi kết quả chống trùng | Theo D12: lần gửi lại trong thời hạn → `409` `Retry-After: 2`; quá thời hạn → `409 idempotency-key-abandoned`; app dùng key mới → mã mới → **có thể trừ thêm 1 lượt** (khe đã chấp nhận của D12; rủi ro mục 20, sau review R12) |

### 16.7 Thêm sau review độc lập (M1–M20 của review)

| # | When | Then |
|---|---|---|
| B7E111 | Hai tab cùng gọi `next` ở vòng ≥ 2, một tab đang chờ AI | Tab sau đọc chỗ đang chờ → `preparing` cho **cùng** chỗ; không lập kế hoạch lại, không có lần hỏi thứ hai |
| B7E112 | Lần `next` đang tạo câu và một lần gọi lại cùng tới lúc gắn câu (G) | G có điều kiện (cờ còn trỏ đúng yêu cầu): đúng một lần hỏi; lần kia trả lại lần hỏi đó |
| B7E113 | `prepare` tạo câu cho từ #3 bị lỗi, rồi Lan bấm Tiếp tới từ #3 | Phiên trộn: đổi dạng ngay, không gọi AI lại; phiên chỉ AI: `ai_unavailable` |
| B7E114 | Máy chủ chết khi đang tạo `mcq_sentence`; lần sau chạy lại | Dùng `ai_input` đã lưu (cùng ứng viên, cùng dạng đáp án); không `input-mismatch`; không kẹt |
| B7E115 | Lan xóa từ riêng trong lúc câu AI của nó đang tạo | Cổng xóa khóa rồi xóa yêu cầu trước; H không còn dòng yêu cầu → không ghi câu, `release`; không còn câu nào chứa từ đó |
| B7E116 | Hai lần chạy lại cùng một yêu cầu cùng tới H | `FOR UPDATE` trên dòng yêu cầu: lần đầu ghi câu và đổi `ready`; lần sau thấy không còn `generating` → không ghi |
| B7E117 | Thao tác mới chưa chọn model; Lan mở phiên có dạng đó | `503 ai-unavailable`, `reason: model-not-set`; chưa tạo phiên |
| B7E118 | Staff xác nhận câu đã giao miễn phí | `ai_charged = false` → không gọi `refund`, `refunded = false` |
| B7E119 | Tra AI: máy chủ chết sau `confirm`, trước khi ghi kết quả chống trùng; app dùng key mới | Trừ thêm 1 lượt; rủi ro đã chấp nhận |
| B7E120 | Câu AI có từ đang hỏi ở ngoài chỗ trống | Loại, viết lại `#2` |
| B7E121 | Câu tạo sẵn có nhiễu (hoặc nghĩa sai) là từ riêng Lan đã xóa | Không dùng lại câu đó |
| B7E122 | Nhóm bị xóa giữa phiên khi có 2 câu tạo sẵn | Phiên `finished` (`group-not-found`) như Bước 4; hai câu thành câu chưa từng hiện (đã trừ lượt), dùng ở lần sau nếu đủ điều kiện |
| B7E123 | Gói hết giữa phiên có bài từ câu đã lưu | Như Bước 4 §12: quyền kiểm lúc tạo **mỗi** câu → câu từ câu đã lưu kế tiếp không được tạo (dạng khác nếu Lan có chọn, không thì bỏ qua); câu đã tạo vẫn nộp được (ER4) |
| B7E124 | Lan mở Lịch sử có câu AI | Hiện câu, các lựa chọn, đáp án đúng (đúng lựa chọn với dạng chọn), bản dịch với người học `vi` |
| B7E125 | Người học `en`, `meaning_in_sentence`, nhóm có từ riêng không có nghĩa tiếng Việt | Từ riêng đó không làm nghĩa sai |
| B7E126 | Phiên bị đóng (Dừng, quá giờ) khi `prepare` đang chạy | Câu ghi xong thành câu chưa từng hiện; không lỗi |
| B7E127 | Phiên chỉ AI, câu 1 `ai_unavailable`, Lan bấm [Dừng, để sau] | Phiên vẫn mở; chưa có câu nào có kết quả nên chưa tính là một phiên của ngày (Bước 5 §7.4) |
| B7E128 | Admin tắt AI trong lúc `prepare` chạy | Yêu cầu chưa gọi AI: `isReady` trả `ai-disabled` → `ai_stopped = ai-unavailable`; câu đã ghi xong vẫn làm được |
| B7E129 | Staff xác nhận báo cáo của chính mình | Được (D33); dòng đó ở danh sách trả lượt của `admin` có `self_resolved = true` |
| B7E130 | Tài khoản bị xóa (Bước 8) khi đang tạo câu | Bước 8 xóa yêu cầu trước câu hỏi (như B7E115); H không ghi gì |

## 17. Acceptance criteria (When → Then)

| # | When | Then |
|---|---|---|
| AC1 | Lan (Pro, 87 lượt) mở phiên "gõ từ + điền từ AI", 10 câu, gọi `prepare` ngay sau khi mở phiên và sau mỗi câu | 5 câu AI (vị trí 2, 4, 6, 8, 10), 5 câu gõ từ; còn 82 lượt; mỗi câu AI đã có sẵn khi Lan bấm tiếp (AI giả trả ngay) |
| AC2 | Như AC1 nhưng Lan dừng ở câu 4 rồi bỏ phiên | Các câu AI đã tạo mà chưa hiện được giữ; phiên sau dùng lại, 0 lượt |
| AC3 | Lan còn 3 lượt, phiên cần 5 | `403 ai-quota-insufficient` |
| AC4 | AI giả lỗi ở một câu của phiên trộn | Câu đó là gõ từ; một `notice: ai-fallback`; không trừ lượt |
| AC5 | Phiên chỉ dạng AI, AI giả lỗi | `ai_unavailable`; [Thử lại] với AI giả đã hết lỗi → câu AI |
| AC6 | Câu AI có đáp án không phải dạng của từ (AI giả) | `#2`; ghi `practice_unknown_forms`; staff nhận dạng → câu sau qua |
| AC7 | Lan làm ba dạng AI và bài từ câu đã lưu | Chấm, gợi ý, bản dịch sau khi nộp đúng mục 5, 8 |
| AC8 | Lan báo câu AI, `editor` xác nhận | `refunded = true`; còn lại tăng 1; `admin` thấy dòng đó ở danh sách trả lượt |
| AC9 | Lan tra AI `rizz`, lưu gợi ý kèm 2 câu ví dụ | Từ riêng có `draft_source = ai_suggestion`, 2 câu ví dụ; trừ 1 lượt tra nghĩa |
| AC10 | Lan tra AI chữ có lemma trong catalog | `catalog_senses` không rỗng |
| AC11 | Free mở phiên có `cloze`, tra AI | Cả hai `403 entitlement-required` |
| AC12 | Admin thêm, sửa, tắt lý do báo lỗi | Lan thấy danh sách mới ở `report-reasons` |

## 18. Kiểm thử và "Xong khi" (D3)

- **Unit test** cho mọi luật mới (chọn dạng, `ai_planned`, kiểm luật 7.2–7.5, gợi ý 3 nấc, lý do báo lỗi, trả lượt, job dọn), như Bước 4–6; không có e2e backend (D38 Bước 4).
- **`pnpm smoke:buoc-7`** chạy qua API và worker thật, AI giả (`AI_FAKE_ENABLED=true`, không key thật), DB mới, đi qua AC1–AC12 và các ca B7E có đánh dấu "smoke" trong plan;
  output lưu `docs/deliveries/buoc-7-smoke-output.txt`. Bộ nối giả cần các ca ở mục 15. Smoke phải **chọn model giả** cho ba thao tác mới (và `generate_cloze`, `lookup_word`)
  qua API admin của Bước 6 trước khi chạy, vì thao tác mới seed với `model_ref NULL` (sau review R6).
- **Xong khi** = CI xanh trên mọi PR + `pnpm smoke:buoc-7` qua trên DB mới (cùng `smoke:buoc-4`, `smoke:buoc-5`, `smoke:buoc-6` vẫn qua, vì Bước 7 sửa phiên luyện, báo lỗi
  và quick-add).
- **Không gọi AI thật** trong "Xong khi" (D3): chủ dự án tự chạy thật sau.

## 19. Ảnh hưởng tới các bước sau

- **Đợt giao diện:** màn mở phiên (dạng AI gắn nhãn Pro, nguồn câu điền từ, "Phiên này dùng 5 lượt AI"), màn "đang tạo câu", "Phiên đang dở", màn AI tạm chưa dùng được, gợi ý
  3 nấc, bản dịch sau khi nộp, báo lỗi theo lý do + dòng đồng ý cho từ riêng, "Báo lỗi của tôi"; "Thêm nhanh" với nút "Tra bằng AI", ô tick gửi câu, gợi ý AI cạnh nghĩa catalog,
  form sửa trước khi lưu; màn admin: lý do báo lỗi, danh sách báo lỗi có lọc, danh sách trả lượt, dạng chia chưa biết; cài đặt `ai_prefetch_count`. **Chữ màn gói và landing**:
  "tối đa 300 câu AI mới mỗi tháng" kèm điều kiện trần toàn hệ thống và công tắc AI (research 21/10).
- **Bước 8 (xóa tài khoản):** xóa `practice_ai_requests`, `practice_word_checks`, câu AI của người đó; báo cáo ẩn danh như Bước 4 §15; `practice_unknown_forms` không có người
  nên giữ.
- **Trước ra mắt:** chủ dự án chạy thật (D3); xem lại `ai.daily_provider_calls_cap`, `ai_daily_cap` theo số người dùng; chính sách riêng tư (mục 20); luật sư xem chữ màn gói.

## 20. Rủi ro và việc còn mở

- **Chất lượng câu AI và tỉ lệ bị luật loại chưa đo** (D3: không gọi thật). Research: lời dặn "chỉ một đáp án" vẫn để ~4,9% câu nhiều đáp án (GPT-4); tự rà trong cùng
  lời gọi yếu hơn lời gọi kiểm riêng (GPT-3.5 tự chấm vẫn lọt 13,5% nhiễu đúng). Lưới chính là "Làm lại", gợi ý, báo lỗi + trả lượt (D13, D14). Đo khi chủ dự án chạy thật.
- **D6 Bước 4 không đạt tuyệt đối** (mục 0): ghi rõ để không ai hiểu "không bao giờ" là đã được bảo đảm.
- **Chữ màn gói**: "300" mà không kèm điều kiện có thể bị coi là không đúng cam kết (Luật 19/2023 Điều 10; Apple 5.6), vì trần 1.000 lượt/ngày toàn hệ thống và công tắc AI
  có thể làm Lan không lấy đủ (research 21/10). Không đổi Bước 5; việc của đợt giao diện và lần xem của luật sư (Bước 5 §19).
- **Hai kho AI dùng chung `ai_daily_cap`**: nâng lượt tra nghĩa (D29) mà không nâng trần thì tra nghĩa có thể ăn phần của bài AI trong ngày.
- **Riêng tư:** câu AI về từ riêng được báo lỗi thì staff thấy từ đó (D26); danh sách dạng chưa biết có thể hiện chữ của từ riêng (D15); câu Lan gặp gửi cho nhà cung cấp AI
  khi Lan tick (D20). Chính sách riêng tư phải ghi cả ba trước ra mắt (SR15).
- **Câu tạo sẵn vẫn có thể mất lượt** (sửa sau review R11; câu "không bao giờ mất lượt" ở vòng 1 của nhật ký là nói quá): (a) nội dung của từ đổi (B7E57, B7E58); (b) Lan không
  bao giờ được hỏi lại từ đó bằng dạng AI đó; (c) câu cũ hơn `history_months` (job xóa); (d) Lan xóa từ riêng đó; (e) một nhiễu hay nghĩa sai trong câu không còn thấy được
  (B7E121). Bỏ từ khỏi việc học (không xóa) **không** xóa câu: Lan thêm lại từ thì câu vẫn dùng được (nhật ký vòng 1 câu 7 ghi ngược lại; code chỉ xóa câu khi xóa từ riêng).
- **Câu miễn phí khi máy chủ chết giữa ghi câu và `confirm`** (B7E33): giảm bằng xác nhận muộn ở G; chỉ còn miễn phí khi Lan hết lượt lúc đó. Hiếm, chấp nhận.
- **Tra AI có thể trừ 2 lượt** ở khe đã chấp nhận của D12 (B7E110, B7E119): hiếm, 1 lượt.
- **Dấu vết trả lượt không giữ lâu** (sau review R21): danh sách trả lượt của `admin` đọc từ báo cáo; báo cáo đã xử lý bị job xóa sau `history_months`, và bị xóa ngay khi Lan xóa
  từ riêng (CR23). Dòng `credit` ở sổ lượt Bước 5 vẫn còn (`note` = id báo cáo). Báo cáo `confirmed`, `refunded = null` cũ quá mốc bị xóa trước khi job kịp thử lại (rất hiếm).
- **Vòng ≥ 2 không tạo trước**: Lan chờ ở câu AI của vòng sau; chỉ khi nhóm ít từ hơn số câu.
- **`generate_cloze` cũ vẫn tự liệt kê đáp án**: luật 7.2 chỉ nhận dạng của chính từ, nên đáp án là từ khác bị loại; nhưng AI có thể **bỏ sót** một dạng đúng (ví dụ chỉ ghi
  `deployed` khi `has deployed` cũng hợp) → Lan gõ đúng mà bị "Chưa đúng"; giảm bằng "Làm lại" và báo lỗi `graded_wrong`.
- **Bảng dạng chia bổ sung theo chữ** áp cho mọi entry cùng chữ, kể cả khác loại từ (đồng tự): staff chịu trách nhiệm khi nhận.
- **Mọi con số mặc định là `ASSUMPTION`** trừ chỗ ghi Chốt.
- **Code `dev` còn đổi**: M5 của bản sửa Bước 0–3 (PR #102) chưa merge lúc viết; plan đọc lại code trên `dev`.

## 21. Tài liệu cần cập nhật sau khi duyệt

Một PR docs nhỏ riêng sau khi Bước 7 xong: `CLAUDE.md` (trỏ tới design Bước 7; mục "Việc phải phân tích khi tới bước tương ứng": dòng "Bước 7 — danh sách dạng bất quy tắc" đã
rõ bằng D15) và `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 (dòng Bước 7). `docs/specs/` không sửa.

## 22. Đề xuất kỹ thuật duyệt cùng design

| # | Đề xuất | Chọn | Bỏ | Vì sao |
|---|---|---|---|---|
| T1 | Tách AI khỏi transaction | Yêu cầu tạo câu (`practice_ai_requests`) + hai transaction ngắn quanh `ai.run` | Giữ `advance` trong một transaction | Bước 5 R6, Bước 6 §4.4; pool database 20 kết nối (`DATABASE_POOL_MAX`) cạn nhanh nếu giữ transaction 10–20 giây |
| T1b | Giữ "chỗ đang chờ" (sau review R1) | Cột `pending_ai_request_id` trên phiên; G có điều kiện | Tạo lần hỏi trước với `question_id` null (cách của Bước 6 §4.4 bước 0) | Không phải đổi `question_id` thành null được và sửa mọi chỗ đọc lần hỏi (`itemView`, chấm, gợi ý, lịch sử); câu tạo trước vẫn là câu, không phải lần hỏi |
| T1c | Chạy lại sau sự cố (sau review R3, R4) | Lưu `ai_input`; giành quyền bằng một `UPDATE` có điều kiện; H khóa dòng yêu cầu | Dựng lại dữ liệu mỗi lần | Dựng lại làm `input-mismatch` ở cổng AI và kẹt yêu cầu |
| T1d | Biết câu đã bị trừ chưa (sau review R2) | `ai_charged` trên câu, đặt theo kết quả `confirm` | Dựa vào `refund` của Bước 5 | `refund` không tìm dòng `use` của mã; sửa Bước 5 là đổi quyết định cũ |
| T2 | Ai chạy tạo trước | App gọi `POST /prepare` | Server tự chạy nền sau khi trả `next`; hàng đợi BullMQ | Luật dự án: luồng người học gọi AI trong request; app không gọi thì `next` vẫn tự tạo |
| T3 | Biết trước từ nào là câu AI | Đánh dấu `ai_sense_ids` lúc mở phiên (vòng 1, từ vị trí 2, ưu tiên từ có câu tạo sẵn); vòng ≥ 2 theo xác suất, ghi cùng chỗ đang chờ | Tính toàn bộ kế hoạch phiên lúc mở; lưu thứ tự vòng ≥ 2 (`round_order`) để tạo trước cả vòng ≥ 2 (review gợi ý như một cách đơn giản hóa) | Ít đổi thuật toán vòng của Bước 4 nhất; vòng ≥ 2 hiếm; đổi sau được nếu cần |
| T4 | Câu chưa từng hiện | Câu `source = ai` không có lần hỏi; khớp bản nội dung | Bảng "hàng chờ" riêng | Bước 4 đã tách câu hỏi và lần hỏi để dùng lại câu (Bước 4 §5.1) |
| T5 | Dạng chọn | Hai thao tác mới nhận sẵn nhiễu / nghĩa sai | Sửa khuôn `generate_cloze`; lời gọi kiểm riêng | D14; không đổi thao tác cũ của Bước 6 |
| T6 | Điền từ AI | Giữ `generate_cloze`, thêm revision prompt | Thao tác mới có ô "từ khác cũng vừa" | Không đổi Bước 6; phần tự rà nằm trong prompt (D14) |
| T7 | Kiểm từ riêng | Thao tác `check_private_word`, nhớ theo mã nội dung | Gộp vào `generate_cloze` | Gộp thì phải đổi khuôn ra của thao tác Bước 6; tách ra thì chỉ tốn một lời gọi mỗi từ riêng |
| T8 | Lý do báo lỗi | Bảng dữ liệu, mã cố định, chụp tên lúc gửi | CHECK + sửa code mỗi lần đổi | D25 |
| T9 | Trả lượt lỗi | Job mỗi giờ thử lại `refund` cho `refunded = null` | Một transaction gộp trạng thái và refund | `refund` chạy transaction riêng (Bước 5 R6) |
| T10 | Tra AI | `@Idempotent({ timeoutSeconds: 60 })`, mã thao tác băm từ key | Mã do app gửi trong body | Dùng cơ chế chống trùng có sẵn (D12 đã lên `dev`) |
| T11 | Dạng chia bổ sung | Bảng theo chữ ở Content | Sửa `entry_inflections` của từng entry | Không phải mở từ riêng; một chỗ cho mọi entry cùng chữ |
| T12 | Job dọn | Giữ câu AI chưa từng hiện tới `history_months` | Giữ nguyên luật xóa mọi câu không có lần hỏi | D8, D12 |
