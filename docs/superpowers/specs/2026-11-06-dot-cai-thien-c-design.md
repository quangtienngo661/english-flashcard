# Đợt cải thiện C (Học / Ôn và chuỗi ngày; phiên âm và giọng đọc) — Design (07/11/2026)

> **Trạng thái 07/11/2026:** bản nháp, **chờ chủ dự án trả lời 10 câu ở §2.2** rồi đọc lại. Chưa có code, chưa có plan, chưa có decision record
> (decision record viết sau khi chốt hết các câu, theo `~/.claude/rules/decision-records.md`).
> **Nguồn quyết định:** chat brainstorm 06/11/2026 (hai session, transcript `f88b58c8…` và `a7482d05…`); danh sách gốc
> [`../../preparation/IMPROVEMENT_IDEAS_2026-10-23.md`](../../preparation/IMPROVEMENT_IDEAS_2026-10-23.md) (C6, C18; C7 để sau).
> **Mockup:** [`../../mockups/2026-11-06-dot-cai-thien-c/index.html`](../../mockups/2026-11-06-dot-cai-thien-c/index.html) (M1, bản `fd0ef1d0`),
> [`ipa.html`](../../mockups/2026-11-06-dot-cai-thien-c/ipa.html) (M2, bản `641bd16c`).
> **Code đọc trên:** `docs/dot-cai-thien-c` @ `0bd3eac6` (chưa có ba commit sửa bộ thẻ trống của `fix/web-empty-group-add-word`). Mọi `path:line` ở
> [`DOT_CAI_THIEN_C_CODE_FACTS_M1_2026-11-06.md`](../../preparation/DOT_CAI_THIEN_C_CODE_FACTS_M1_2026-11-06.md) và
> [`DOT_CAI_THIEN_C_CODE_FACTS_M2_2026-11-06.md`](../../preparation/DOT_CAI_THIEN_C_CODE_FACTS_M2_2026-11-06.md).
> **Research đi kèm:** [`TTS_PROVIDERS_RESEARCH_2026-11-06.md`](../../preparation/TTS_PROVIDERS_RESEARCH_2026-11-06.md),
> [`APP_PRONUNCIATION_AUDIO_SURVEY_2026-11-06.md`](../../preparation/APP_PRONUNCIATION_AUDIO_SURVEY_2026-11-06.md),
> [`LOCAL_TTS_MODELS_RESEARCH_2026-11-06.md`](../../preparation/LOCAL_TTS_MODELS_RESEARCH_2026-11-06.md).

Ví dụ xuyên suốt: **Lan**, người học tiếng Việt, nhóm "Du lịch" có 40 từ: 5 từ mới, 8 từ đến hạn hôm nay (3 trong đó đang ưu tiên vì Lan vừa bấm
"Cần ôn lại"), 12 từ đã thuộc.

## 1. Mục tiêu và phạm vi

Trước khi có người học thật: giúp Lan quay lại mỗi ngày (M1) và biết cách đọc đúng của từ (M2).

| Milestone | Việc | Chạm |
|---|---|---|
| **M1** (C6 + tách Học / Ôn) | Nhóm có hai việc: **Học** (lật thẻ) và **Ôn** (trắc nghiệm hoặc gõ từ, không AI). Chỉ Ôn làm đổi lịch ôn. Toast chuỗi ngày, số "đã thuộc", dòng giữ chuỗi trong email nhắc | API Learning, Practice, Notifications; web |
| **M2** (C18) | Phiên âm IPA UK và US theo từng nghĩa, hiện kiểu Cambridge; giọng đọc UK và US bằng Google Cloud TTS (WaveNet), file tạo sẵn và lưu trên kho file | API Content, job nền mới, kho file mới; web; admin |

**Không làm trong đợt này:** C7 bắt đầu theo mục tiêu (để sau, chủ dự án 06/11/2026; ghi ở dòng C7 của `IMPROVEMENT_IDEAS`, kèm mockup
`muc-tieu.html` và 6 câu còn mở); bài kiểm tra trình độ (bỏ); mục tiêu tuần (Claude đề xuất bỏ, chủ dự án không phản đối); email tóm tắt tuần
(chủ dự án: "tí bàn", dời); giọng đọc cho câu ví dụ và câu riêng của người học; trang Luyện tập (giữ nguyên, kể cả hai nút "Đã biết" / "Cần ôn lại"
sau mỗi câu, chủ dự án: "giữ trang luyện tập y nguyên").

## 2. Quyết định

### 2.1 Đã chốt

"Chủ dự án" = chủ dự án chọn; "Claude" = Claude đề xuất, chủ dự án không phản đối (decision record sẽ ghi rõ).

| # | Quyết định | Chọn | Ai |
|---|---|---|---|
| DC1 | Chia việc | Một design "đợt cải thiện", mỗi phần một milestone | Chủ dự án |
| DC2 | Thứ tự | M1 (C6) → M2 (C18); M3 (C7) để sau | Claude (thứ tự); chủ dự án (dời C7) |
| DC3 | Học và Ôn | Nhóm có hai nút **Học** (lật thẻ) và **Ôn** (chọn từ theo nghĩa hoặc gõ từ theo nghĩa, không AI). Hai nút bằng nhau, Ôn tô vàng; nút không có số | Chủ dự án |
| DC4 | Lịch ôn khi Học | Từ mới học xong vào nấc 1. Sau đó lật thẻ không đổi lịch; chỉ nút "Cần ôn lại" đưa từ về nấc 1 | Chủ dự án |
| DC5 | Lịch ôn khi Ôn | Đúng và từ đã đến hạn: lên nấc. Đúng mà chưa đến hạn: giữ nấc. Sai: giữ nấc; Lan muốn về nấc 1 thì bấm "Cần ôn lại" | Chủ dự án |
| DC6 | Ôn gồm từ nào | Chỉ từ đã học (nấc ≥ 1). Ôn xong mà nhóm còn từ mới thì gợi ý học tiếp | Chủ dự án |
| DC7 | Hạn mức | Phiên Ôn không tính vào số phiên luyện mỗi ngày (admin chỉnh được, Free 1–50). Trang Luyện tập giữ nguyên | Chủ dự án |
| DC8 | Chuỗi ngày | Ngày có học thì tính; bỏ một ngày thì về 0 | Chủ dự án |
| DC9 | Hiện chuỗi | Toast nhỏ kiểu chess.com: ngọn lửa nảy nhẹ + "N ngày liên tiếp", tự tắt sau 3 giây; hiện một lần mỗi ngày, sau lần học đầu tiên của ngày | Chủ dự án (toast); Claude (lúc hiện) |
| DC10 | Nhắc giữ chuỗi | Email nhắc có thêm "sắp mất chuỗi N ngày" | Chủ dự án (cách làm: QC5) |
| DC11 | "Đã thuộc" | Từ đang ở nấc ≥ 4 (đã đúng ở lần ôn mốc 7 ngày). Rơi về nấc 1 thì bị trừ. Hiện ở dòng tóm tắt của trang nhóm và thẻ nhóm | Chủ dự án (mốc 7 ngày); Claude (trừ, chỗ hiện) |
| DC12 | Mục tiêu tuần, email tuần | Không làm đợt này | Claude (mục tiêu tuần); chủ dự án (email tuần dời) |
| DC13 | Phiên âm gắn ở đâu | Theo từng nghĩa, UK và US. Hiện kiểu Cambridge: phiên âm dưới từ + loại từ, dùng chung cho các nghĩa đọc giống nhau; nghĩa đọc khác thì có phiên âm riêng ở nghĩa đó | Chủ dự án (theo nghĩa, Cambridge); Claude (gộp hiển thị) |
| DC14 | Ai thấy | Mọi gói | Chủ dự án |
| DC15 | Từ riêng | Một ô "Phiên âm" không bắt buộc, không chia UK / US; bỏ trống thì không hiện | Chủ dự án |
| DC16 | Admin | Sửa được phiên âm từng nghĩa | Chủ dự án |
| DC17 | Hiện ở đâu | Thẻ flashcard, kết quả tra từ, trang một từ | Chủ dự án |
| DC18 | Nghĩa chưa có phiên âm | Chỉ còn nút loa, đọc nguyên chữ hoặc cụm (ví dụ `look after`) | Chủ dự án |
| DC19 | Giọng đọc | Hai giọng UK, US bằng dịch vụ bên thứ ba: **Google Cloud TTS, giọng WaveNet** | Chủ dự án |
| DC20 | Tạo file | Tạo sẵn cho cả kho; admin đăng nghĩa mới thì hệ thống tự tạo trong nền | Chủ dự án |
| DC21 | Đọc gì | Chỉ từ, không đọc câu ví dụ bằng Google | Chủ dự án |
| DC22 | Từ riêng có giọng không | Gửi Google, chỉ gửi chữ, không gửi phiên âm Lan gõ; chữ giống nhau dùng chung một file; không thêm giới hạn độ dài (`LEMMA_MAX` = 100 đã chặn) | Chủ dự án (gửi Google); Claude (chỉ chữ, dùng chung file) |
| DC23 | Gửi IPA cho Google | Mặc định chỉ gửi chữ. Từ nào có các nghĩa mang phiên âm khác nhau (`lead` /liːd/ và /led/) thì tự gửi kèm IPA bằng thẻ SSML `<phoneme>` cho từng cách đọc | Claude, chủ dự án đồng ý |
| DC24 | Khi chưa có file | Đang tạo hoặc tạo lỗi thì dùng tạm giọng của trình duyệt | Claude (luồng §5.5) |

### 2.2 Còn mở — chủ dự án trả lời trước, Claude đề xuất sau

Các câu này xuất hiện khi đọc code (facts M1 §"Surprises", facts M2 §"Surprises"): code hiện tại khác với giả định lúc brainstorm, hoặc quyết
định đã chốt chưa nói tới trường hợp này. Không phương án nào được ưu tiên.

**M1**

- **QC1. Học lật những thẻ nào?** Lan bấm "Học" ở nhóm Du lịch:
  - (a) chỉ 5 từ mới; nhóm hết từ mới thì nút Học lật lại mọi từ đã học, không đổi lịch;
  - (b) 5 từ mới trước, rồi tới mọi từ đã học;
  - (c) cách khác.
- **QC2. "Cần ôn lại" đưa từ về nấc 1 thì ôn lại lúc nào?** Hiện tại: về nấc 1, **đến hạn ngay hôm nay** và gắn cờ ưu tiên (`schedule.ts:40`).
  Với luật DC5, Lan bấm "Cần ôn lại" cho `luggage` rồi vào Ôn trả lời đúng ngay thì `luggage` lên nấc 2 luôn trong ngày. Có thể:
  - (a) giữ như hiện tại (đến hạn hôm nay, ưu tiên);
  - (b) về nấc 1, đến hạn ngày mai;
  - (c) đến hạn hôm nay, nhưng lần Ôn đúng đầu tiên trong ngày đó chỉ bỏ cờ ưu tiên, không lên nấc.
- **QC3. Một phiên Ôn dài bao nhiêu?** Lan có 8 từ đến hạn. Có thể: (a) mọi từ đến hạn của nhóm trong một phiên (trần hiện tại 100 từ một nhóm
  một ngày); (b) phiên 10 câu như Luyện tập, bấm "Ôn tiếp" để làm phiên sau; (c) con số khác.
- **QC4. Ngày nào tính vào chuỗi?** Lúc brainstorm, Claude nói app ghi "ngày có học" khi ôn thẻ hoặc trả lời câu luyện, và bạn chọn "chỉ cần như
  vậy". Code thật còn ghi ngày đó khi **thêm từ, xoá từ, xoá nhóm, bấm "Học lại"** (`items.service.ts:247,262`, `groups.service.ts:122`,
  `backlog.service.ts:94`). Lan chỉ thêm 3 từ vào nhóm hôm nay, không lật thẻ nào: có giữ chuỗi không?
- **QC5. Dòng "sắp mất chuỗi" gửi thế nào?** Email nhắc hiện tại chỉ gửi khi còn thẻ chờ, cách nhau ít nhất 2 ngày (`minGapDays`), không xem
  hôm nay Lan đã học chưa, và chữ cố định không có số liệu (`reminder-message.ts:16-33`). Nên tối mà chuỗi sắp mất có thể không có email nào. Có thể:
  - (a) chỉ thêm dòng chuỗi vào email nhắc khi email đó được gửi như bây giờ;
  - (b) thêm một email riêng "sắp mất chuỗi": tối nào Lan có chuỗi từ N ngày trở lên mà chưa học thì gửi, dùng chung công tắc email nhắc;
  - (c) sửa email nhắc: không gửi khi hôm nay đã học, và ngày chuỗi sắp mất thì gửi dù chưa đủ 2 ngày.
- **QC6. Câu trả lời trong Ôn có vào trang Luyện tập không?** Trang Luyện tập có "Từ hay sai" và lịch sử phiên, tính từ các câu đã trả lời. Câu
  trả lời ở Ôn: (a) tính vào "Từ hay sai" và lịch sử; (b) tính vào "Từ hay sai", không vào lịch sử; (c) không tính vào đâu.

**M2**

- **QC7. Lấy phiên âm từ nguồn nào?** Hai nguồn đã đọc giấy phép ngày 26/10 (`IMPROVEMENT_IDEAS` §"Nguồn IPA cho C18"):
  - **Wiktionary:** có cả UK và US. CC BY-SA 4.0: dùng thương mại được, phải ghi công, và phần IPA lấy về phải cho người khác dùng lại theo cùng
    giấy phép (code của app không bị ảnh hưởng).
  - **CMUdict:** chỉ US, ký hiệu ARPAbet phải đổi sang IPA; giấy phép kiểu BSD, chỉ cần giữ dòng bản quyền.

  Có thể: (a) chỉ Wiktionary; (b) Wiktionary, thiếu US thì lấy CMUdict; (c) tìm thêm nguồn khác trước khi chốt. Mockup admin đang ghi
  "Nguồn: Wiktionary" chỉ để minh họa.
- **QC8. Nút loa của câu ví dụ.** Hiện thẻ flashcard và trang một từ có nút đọc câu ví dụ bằng giọng của máy (`Flashcard.tsx:97`,
  `SenseBlock.tsx:85`); câu riêng của Lan chỉ đọc bằng giọng cài trên máy để chữ không rời máy (`SpeakButtons.tsx:49`). DC21 nói Google không
  đọc câu. Các nút đọc câu: (a) giữ như hiện tại; (b) bỏ.
- **QC9. Phiên âm của từ riêng gắn theo từ hay theo nghĩa?** Một từ riêng có thể có nhiều nghĩa (sửa ở `PATCH /v1/my-words/:id`). Lan thêm
  `bass` với hai nghĩa "cá vược" /bæs/ và "giọng trầm" /beɪs/: (a) một ô phiên âm cho cả từ; (b) mỗi nghĩa một ô.
- **QC10. File UK đang tạo mà máy không có giọng UK thì nút loa UK làm gì?** Nhiều máy không có giọng Anh-Anh (`speech.ts:47`). Trong vài phút
  đầu sau khi admin đăng nghĩa mới (hoặc khi Google lỗi): (a) ẩn nút loa UK; (b) hiện nút mờ, rê vào thấy "Đang tạo giọng đọc"; (c) đọc bằng
  giọng US của máy.

## 3. Chia việc và thứ tự

Mỗi PR một nhánh từ `origin/dev`, PR vào `dev`. PR sửa lỗi gồm hai commit (test đỏ trước). Thứ tự gợi ý (Claude đề xuất):

| PR | Việc | File chính |
|---|---|---|
| **C-M1a** | API: luật Học và Ôn, phiên Ôn | `apps/api/src/learning/schedule/**`, `learning/reviews/**`, `learning/practice/**`, `apps/api/src/practice/**`, migration Practice |
| **C-M1b** | Web: nút Học / Ôn, phiên Ôn, màn xong phiên, "đã thuộc" | `features/learner/{today,groups,review}/**`, `features/learner/practice/**` (dùng lại câu hỏi) |
| **C-M1c** | Chuỗi ngày: API, toast, email | `learning/activity/**`, `apps/api/src/notifications/**`, `app-ui/StreakToast.tsx` |
| **C-M2a** | Phiên âm: DB, admin, CSV, hiển thị | `content.prisma`, `content/senses/**`, `content/private/**`, `content/words/**`, `content-pipeline/upload/**`, `apps/admin/src/features/senses/**`, `features/learner/{review,word,add-word}/**` |
| **C-M2b** | Giọng đọc: TTS, kho file, hàng việc, phát file | `content/audio/**` (mới), `common/config/app-config.ts`, `apps/web/src/lib/csp.ts`, `app-ui/SpeakButtons.tsx` |
| **C-M2c** | Nạp dữ liệu: phiên âm cho kho, tạo file cho kho, trang nguồn, chính sách bảo mật | script `apps/api/scripts/**`, `content/sources/**`, `docs/deliveries/deploy-checklist.md` |

- M1a → M1b → M1c nối tiếp (M1c đọc kết quả của M1a). M2a → M2b → M2c nối tiếp.
- M1 và M2 không đụng chung file API. Ở web, cả hai đụng `Flashcard.tsx` và `apps/web/messages/{vi,en}.json`: phiên làm sau rebase lên `dev` mới.
- Hai milestone có thể chạy song song ở hai phiên nếu chủ dự án muốn; mặc định làm M1 xong rồi M2.

## 4. M1 — Học, Ôn và chuỗi ngày

### 4.1 Luồng người học

```
Trang Hôm nay (thẻ to = nhóm đứng đầu)  /  thẻ nhóm  /  trang nhóm
        │
        ├── [Học]  → lật thẻ (ReviewSession hiện có)
        │            từ mới: Đã biết → nấc 1, ngày mai
        │            từ đã học: Đã biết → không đổi;  Cần ôn lại → nấc 1 (QC2)
        │
        └── [Ôn]   → phiên Ôn: câu "chọn từ theo nghĩa" hoặc "gõ từ theo nghĩa"
                     đúng + đến hạn → lên nấc;  đúng + chưa đến hạn → giữ;  sai → giữ
                     sau mỗi câu có nút "Cần ôn lại"
                     xong → màn xong phiên Ôn → (nhóm còn từ mới) gợi ý [Học]
```

Trạng thái thẻ nhóm (mockup `index.html`, đã duyệt):

| Nhóm | Nút |
|---|---|
| Có từ đến hạn hoặc ưu tiên, có từ mới | Học · Ôn |
| Chỉ có từ mới (chưa học từ nào) | Học |
| Không còn gì đến hạn hôm nay, đã có từ đã học | chip "Xong hôm nay" · nút "Ôn tập" (Ôn mọi từ đã học, không đổi lịch vì chưa đến hạn) |
| Có từ đến hạn, không có từ mới | Học · Ôn (Học theo QC1) |

Dòng tóm tắt trang nhóm: `40 từ · 8 từ đến hạn · 5 từ mới · 12 từ đã thuộc`. Thẻ nhóm ghi `120 từ · 47 đã thuộc`. Thẻ to trang Hôm nay giữ ba ô
"ưu tiên / đến hạn / mới" như hiện tại, nút đổi thành Học · Ôn.

### 4.2 Luật lịch ôn (API, hàm thuần)

`applyAnswer` (`schedule.ts:35-50`) **giữ nguyên** cho hai nút sau câu ở trang Luyện tập (DC7, trang Luyện tập không đổi). Thêm hai hàm thuần cạnh nó:

| Hàm | Gọi từ | Luật |
|---|---|---|
| `applyLearn(state, answer, today)` | `POST /v1/reviews` (Học) | nấc 0 + `known` → nấc 1, hạn `today+1`; nấc ≥ 1 + `known` → không đổi; `review` → theo QC2 |
| `applyRecall(state, correct, today)` | câu trả lời cuối của phiên Ôn | `correct` và `isDueNow` (ưu tiên hoặc `dueDate ≤ today`) → nấc +1 (tối đa 5), hạn theo `LEVEL_INTERVALS`, bỏ cờ ưu tiên; còn lại → không đổi |

- "Cần ôn lại" trong phiên Ôn dùng lại `POST /v1/practice/items/:id/review { action: 'needs_review' }` (đã có), luật theo QC2.
- Đúng nghĩa là trả lời đúng ở lần cuối, **không dùng gợi ý** (giống điều kiện `show_known` hiện tại, `answers.service.ts:164`). Đúng sau khi đã
  xem gợi ý → giữ nấc. (Claude đề xuất, theo luật trang Luyện tập đang dùng.)
- `ReviewsService.answer` đang giả định `priority = answer === 'review'` khi phát lại một `review_id` (`reviews.service.ts:99`): sửa theo luật mới.
- Trần mỗi nhóm mỗi ngày giữ nguyên: Học dùng trần từ mới (`newPerGroupPerDay` 20), Ôn dùng trần ôn (`reviewsPerGroupPerDay` 100). Để vậy, lần lên
  nấc trong Ôn ghi `learning_log` có `group_id` và `section` như flashcard (`queue.queries.ts:46-53`).
- Ôn không gồm từ đang ở danh sách tồn đọng (quá hạn hơn 60 ngày): những từ đó đi qua trang "Học lại" như hiện tại. (Claude đề xuất.)

**When → Then** (nấc theo `LEVEL_INTERVALS = [1,3,7,14,30]`):

| When | Then |
|---|---|
| Học: `deploy` nấc 0, Lan bấm Đã biết | nấc 1, hạn ngày mai, không ưu tiên |
| Học: `luggage` nấc 3, đến hạn hôm nay, Lan bấm Đã biết | không đổi (vẫn đến hạn, vẫn hiện ở Ôn) |
| Học: `luggage` nấc 3, Lan bấm Cần ôn lại | nấc 1, hạn theo QC2 |
| Ôn: `luggage` nấc 3, đến hạn, trả lời đúng không gợi ý | nấc 4, hạn +14 ngày; số "đã thuộc" +1 |
| Ôn: `luggage` nấc 3, đến hạn, đúng sau khi xem gợi ý | không đổi |
| Ôn: `delay` nấc 2, hạn ngày mai, trả lời đúng | không đổi |
| Ôn: `delay` nấc 2, đến hạn, trả lời sai | không đổi; câu hiện nút "Cần ôn lại" |
| Ôn: `itinerary` nấc 5, đến hạn, đúng | vẫn nấc 5, hạn +30 ngày |
| Ôn: hai tab cùng gửi câu trả lời đúng cho một từ đến hạn | lên nấc **một lần** (khoá dòng `learning_items` `FOR UPDATE` như `reviews.service.ts:40-41`; lần sau thấy chưa đến hạn) |
| Ôn: đã đạt trần ôn 100 của nhóm trong ngày | từ đến hạn còn lại không vào phiên; phiên chỉ gồm từ chưa đến hạn (giữ nấc) hoặc báo hết |
| Nhóm có 0 từ đã học | không có nút Ôn (chỉ Học) |
| Nhóm có dưới 4 từ có thể làm phương án nhiễu | phiên Ôn chỉ có câu gõ từ (`question-types.ts:33`) |

### 4.3 Phiên Ôn (API)

Dùng lại máy câu hỏi của Practice (dựng câu `mcq_definition` và `type_word` kiểu `meaning`, chấm điểm, gợi ý, phương án nhiễu), thêm một loại phiên.
(Claude đề xuất; phương án khác là viết phiên riêng trong Learning, phải chép lại phần dựng câu và chấm điểm.)

- **Cột mới** `practice_sessions.kind`: `'practice' | 'recall'`, mặc định `'practice'` (migration chỉ thêm cột, hàng cũ thành `practice`).
- **Mở phiên:** `POST /v1/practice/sessions` nhận thêm `kind: 'recall'`, chỉ đi cùng `source: 'group'` + `group_id`; khi đó API tự đặt `types:
  ['mcq_definition','type_word']`, `prompt_style: 'meaning'`, bỏ qua `types`, `sort`, `cloze_source` gửi lên. Phạm vi mới trong Learning:
  `{ kind: 'learned', groupId }` = từ nấc ≥ 1 của nhóm, không tồn đọng, xếp ưu tiên → đến hạn (theo `due_date, level`) → chưa đến hạn; phần đến hạn
  bị cắt theo trần ôn còn lại. "Xong hôm nay" (không còn gì đến hạn) thì phiên gồm từ chưa đến hạn.
- **Độ dài:** theo QC3.
- **Hạn mức:** phiên `recall` bỏ cả hai lần `checkQuota` trong `start` (`sessions.service.ts:101,148`) và không gọi `recordPracticeSession` ở
  `writeFinal` (`answers.service.ts:143`).
- **Không đụng phiên Luyện tập:** "một phiên mở mỗi người" tính riêng theo `kind` (`sessions.service.ts:143-145` lọc thêm `kind`); `GET
  /v1/practice/sessions/current` chỉ trả phiên `practice`. Lịch sử và "Từ hay sai" theo QC6.
- **Ghi lịch ôn:** `writeFinal` của phiên `recall` gọi `LearningService.recallAnswer(tx, userId, { senseId, groupId, correct, hintUsed })` trong cùng
  transaction; Learning khoá dòng, chạy `applyRecall`, ghi `learning_log` (`kind: 'review'`, `origin: 'recall'`, có `group_id`, `section`) và ngày
  học. Câu trả lời trả thêm `schedule: { level, due_date, changed }` để màn xong phiên đếm "lên nấc".
- **Màn xong phiên Ôn** (`GET` phiên đã xong, thêm số đếm): `leveled_up`, `correct_kept` (đúng mà chưa đến hạn), `wrong`, `needs_review`,
  `new_left` (số từ mới còn trong nhóm, cho gợi ý "Học").

### 4.4 Web

- `GroupCard.tsx`, `GroupPage.tsx`, `TodayPage.tsx`: thay một nút "Ôn N thẻ" bằng cặp nút **Học** (`review?group=…`) · **Ôn**
  (`recall?group=…`), không có số; trạng thái theo bảng §4.1. Nút Ôn: nền vàng `--accent`, cùng cỡ với Học.
- Trang mới `/app/recall?group=…`: dùng lại khung phiên Luyện tập (câu hỏi, `AnswerFeedback` với nút "Cần ôn lại" và nút chính), không có màn Tùy
  chỉnh phiên.
- Màn xong phiên Ôn (mockup "Xong phiên Ôn"): "Xong 8 từ." Ô số: **Đúng, lên nấc** · **Sai, giữ nấc** · **Cần ôn lại**; thêm ô **Đúng, giữ nấc**
  khi có từ chưa đến hạn (khác mockup một chỗ: phiên "Ôn tập" toàn từ chưa đến hạn sẽ không có ô "lên nấc" nào). Còn từ mới: "Còn 5 từ mới trong
  nhóm này" + nút **Học** · **Về trang chủ**.
- "Đã thuộc" tính ở web từ `cells[4].total + cells[5].total` của `GET /v1/groups` (không đổi API).

### 4.5 Chuỗi ngày

- **Nguồn:** theo QC4. Nếu chuỗi chỉ tính lật thẻ và trả lời câu: thêm cột `studied boolean` vào `learning_activity_days`, chỉ các lần lật thẻ,
  câu trả lời Ôn và câu trả lời Luyện tập đặt `true`; các chỗ ghi khác giữ nguyên (vẫn phục vụ báo cáo giữ chân D7/D30). Nếu mọi ngày có hoạt động
  đều tính: dùng bảng như hiện tại.
- **Tính:** hàm thuần `streakDays(dates, today)`: đếm ngược từ hôm nay (hoặc từ hôm qua nếu hôm nay chưa học) qua các ngày liền nhau. Ngày theo múi
  giờ của Lan (`localDate(profile.timezone)`).
- **Toast:** `POST /v1/reviews`, câu trả lời Ôn và câu trả lời Luyện tập trả thêm `streak: { days }` **chỉ ở lần ghi đầu tiên của ngày** (lần
  `createMany(skipDuplicates)` trả `count = 1`). Web thấy trường này thì hiện `StreakToast` (component mới trong `app-ui/`, không dùng hàng toast
  chung vì toast chung là chữ thuần, 5 giây): ngọn lửa + "13 ngày liên tiếp", 3 giây, tắt chuyển động khi máy bật giảm chuyển động.
- **Email:** theo QC5. Phần chung: Learning xuất `streakAsOf(userId, localDate)`; Notifications truyền số vào `ReminderSendData` và chữ email.
  Chữ (vi): "Bạn đang có chuỗi 12 ngày. Học hôm nay để giữ chuỗi." Chỉ thêm khi chuỗi ≥ 2 ngày và hôm nay chưa học.

**When → Then:**

| When | Then |
|---|---|
| Lan học 12 ngày liền, hôm nay (ngày 13) lật thẻ đầu tiên | toast "13 ngày liên tiếp"; lần lật sau trong ngày không hiện |
| Hôm qua không học, hôm nay học | toast "1 ngày liên tiếp" |
| Lan học lúc 23:50 và 00:10 theo giờ Việt Nam | hai ngày liền (ngày tính theo múi giờ của Lan) |
| Lan đổi múi giờ giữa chuỗi | ngày đã ghi giữ nguyên; ngày mới theo múi giờ mới (có thể lệch một ngày ở ranh giới, chấp nhận) |
| Gửi lại cùng `review_id` (phát lại) | không có `streak` lần hai |
| Toast hiện khi đang ở phiên Luyện tập | toast nằm đáy giữa, không che nút trả lời (đặt trên vùng nút ở điện thoại) |

## 5. M2 — Phiên âm và giọng đọc

### 5.1 Dữ liệu

- **Phiên âm nằm trên `SenseRevision`** (Claude đề xuất): hai cột `ipa_uk`, `ipa_us` (VarChar 100, có thể trống) và `ipa_source_id` (→
  `data_sources`, trống khi admin tự gõ). Nằm trên bản sửa nên phiên âm đi qua nháp → duyệt → đăng → hoàn tác như mọi nội dung khác. Đặt trên
  `Sense` thì sửa phiên âm sẽ hiện ngay, bỏ qua bước duyệt.
- Từ riêng: cột `ipa_custom` (VarChar 100) trên bản sửa; gắn theo từ hay theo nghĩa theo QC9.
- Phải sửa cùng lúc (facts M2 §A1): `RevisionContent`, `normalizeContent`, `mergeContent`, `revisionData`, ba bản `readContent`
  (`senses.service.ts:29`, `import-content.ts:27`, `private-words.service.ts:68`), `contentSchema` / `toContent`. **`contentHash` chỉ thêm phiên
  âm khi có giá trị**, như `formOf` (`revision-content.ts:79`), để hash của mọi bản sửa cũ giữ nguyên.
- Kiểm khi lưu: bỏ dấu `/` hai đầu nếu admin gõ kèm; chỉ nhận ký tự trong bảng IPA mà Google hỗ trợ (danh sách lấy từ tài liệu Google lúc làm plan;
  ký tự lạ → lỗi `ipa-invalid` chỉ rõ ký tự). Từ riêng không kiểm ký hiệu (không gửi Google, DC22).

### 5.2 Admin và CSV

- `SenseDetail.tsx`: hai ô "Phiên âm UK", "Phiên âm US" dưới nghĩa; dòng nguồn "Nguồn: <tên nguồn>", sửa tay thì nguồn thành "Wordmet" (mockup).
- Trạng thái giọng đọc của nghĩa: "Có giọng" / "Đang tạo" / "Lỗi" kèm nút "Tạo lại" (§5.4).
- CSV: thêm hai cột nội dung `ipa_uk`, `ipa_us` (`columns.ts`, `row-normalizer.ts`, xuất CSV). Nhập CSV vẫn chỉ tạo nháp.

### 5.3 Hiển thị (web)

`WordSense` (`words.service.ts:14-21`) là kiểu chung của thẻ flashcard, trang một từ, tra từ và tra từ bằng AI: thêm
`pronunciation: { uk: string|null, us: string|null, custom: string|null, audio: { uk: string|null, us: string|null } }`. Thêm trường là thay đổi
cộng thêm trong `/v1`.

- **Trang một từ** (mockup "Trang một từ"): mỗi khối = từ + loại từ + nhãn trình độ, rồi dòng `UK 🔊 /…/  US 🔊 /…/`; nghĩa có phiên âm khác
  phiên âm chung của khối thì hiện phiên âm riêng dưới nghĩa đó. Phiên âm chung của khối = phiên âm của nghĩa đầu tiên. Bỏ nút loa chung của trang
  (`WordPage.tsx:72`).
- **Thẻ flashcard:** dòng `UK 🔊 /…/  US 🔊 /…/` dưới từ, cả hai mặt (mockup "Thẻ khi Học").
- **Tra từ** (tấm Thêm từ, `GET /v1/lookup`): mỗi kết quả có dòng phiên âm và hai nút loa. Hiện chưa có nút loa nào ở đây.
- **Từ riêng:** một dòng `🔊 /…/` (không chia UK, US) khi có `custom`; trống thì chỉ có nút loa.
- **Chưa có phiên âm** (DC18): chỉ có nút loa (UK và US), đọc nguyên chữ hoặc cụm.
- Form thêm / sửa từ riêng (`EditSuggestionForm.tsx`): ô "Phiên âm", gợi ý "Không bắt buộc." (mockup ghi thêm "Gõ theo cách bạn muốn đọc.", bỏ theo
  `vietnamese-writing.md`).

### 5.4 Tạo file giọng đọc

```
Admin đăng nghĩa (publish / quick-publish / job đăng hàng loạt) hoặc Lan lưu từ riêng
        │   (sau khi transaction commit)
        ▼
Content tính khoá cho từng giọng (uk, us):
   text = chữ của từ;  ipa = (từ có nhiều cách đọc cho giọng này) ? ipa của nghĩa : null
   khoá = sha256(voice_name | text | ipa)
        │
        ├─ đã có dòng `speech_audio` với khoá này (ready / pending) → dùng chung
        └─ chưa có → tạo dòng `pending`, đẩy việc vào hàng `content-tts`
                              │
                              ▼
               Worker: gọi Google `text:synthesize` (SSML `<phoneme alphabet="ipa">` khi có ipa)
               → mp3 → upload lên kho file `tts/v1/<khoá>.mp3` → dòng thành `ready` + URL
               lỗi tạm thời → thử lại (3 lần, chờ tăng dần); hết lượt → `failed`
```

- **Bảng mới** `speech_audio` (Content sở hữu, `content.prisma`): `key` (PK), `voice`, `text`, `ipa`, `status` `pending|ready|failed`, `attempts`,
  `last_error`, `object_key`, `created_at`, `ready_at`. Nghĩa không lưu URL; lúc đọc, Content tính khoá từ bản đang đăng và tra bảng này.
- **Hàng việc:** hàng BullMQ riêng `content-tts` theo mẫu `ai-eval` / reminders (không ghi `background_jobs`: bảng đó cần `created_by` và
  `operation_id` cho mỗi việc, hợp với lô CSV hơn là 15.600 việc nhỏ). Trạng thái nằm ở chính `speech_audio`. Một vòng quét mỗi 5 phút đẩy lại dòng
  `pending` cũ hơn 10 phút (máy tắt giữa chừng). Worker chạy song song 4 việc. (Claude đề xuất.)
- **Nhiều cách đọc (DC23):** "từ có nhiều cách đọc cho giọng X" = các nghĩa đang hiện của cùng chữ (mọi loại từ) có hơn một giá trị `ipa_X` khác
  nhau. Khi một nghĩa đổi phiên âm, Content tính lại khoá cho mọi nghĩa cùng chữ; file cũ giữ lại tới khi bị dọn.
- **Giọng:** tên giọng WaveNet UK và US cố định trong cấu hình (`TTS_VOICE_UK`, `TTS_VOICE_US`), chọn sau khi nghe thử (§7). Đổi tên giọng → khoá
  đổi → chạy lại lệnh tạo cả kho.
- **Dọn file:** việc chạy mỗi tuần xoá dòng và file không còn nghĩa đang hiện nào dùng (gồm file của từ riêng khi Lan xoá từ hoặc xoá tài khoản; vì
  file dùng chung theo chữ nên không xoá theo người).
- **Trần chi phí:** cài đặt admin `tts.daily_char_cap` (mặc định 120.000 ký tự, tức tối đa khoảng 3,6 triệu một tháng); quá trần thì việc chờ
  sang ngày sau. Hạn mức miễn phí WaveNet là 4 triệu ký tự mỗi tháng.

**Cấu hình** (`app-config.ts`, theo mẫu AI): `GOOGLE_TTS_CREDENTIALS` (khoá service account, base64), `TTS_VOICE_UK`, `TTS_VOICE_US`,
`TTS_FAKE_ENABLED` (từ chối ở production như `AI_FAKE_ENABLED`); kho file `AUDIO_STORAGE_*` (endpoint S3 của R2, bucket, khoá) và
`AUDIO_PUBLIC_BASE_URL`; `AUDIO_STORAGE_FAKE_ENABLED` ghi file vào thư mục local, API phát qua một route chỉ bật khi fake (không có ở production).
Cả hai fake cho máy local, CI và smoke.

**Kho file:** Cloudflare R2 qua API S3, bucket công khai qua tên miền riêng (ví dụ `audio.wordmet.com`). Lưu trữ 10 GB đầu miễn phí, tải về không
tính băng thông (bảng giá Cloudflare đọc 06/11/2026). Thư viện: SDK S3 chính thức của AWS và SDK TTS chính thức của Google; kiểm phiên bản bằng
context7 lúc làm plan.

### 5.5 Phát file (web)

- `SpeakButtons.tsx`: `SpeakWord` thay bằng `Pronounce` nhận `{ text, ipa, audio }`: có URL thì phát `<audio>` (một đối tượng `Audio` dùng chung,
  bấm nút khác thì dừng file đang phát); chưa có URL hoặc phát lỗi thì đọc bằng giọng trình duyệt tương ứng (`uk`, `us` của `speech.ts`); máy không
  có giọng đó thì theo QC10.
- CSP `/app` (`buildAppCsp`, `csp.ts:54-71`): thêm `media-src 'self' <AUDIO_PUBLIC_BASE_URL>`. CSP chỉ chạy ở bản build production
  (`app-csp.ts:28`), nên kiểm bằng `pnpm cf:docker` / e2e chứ không bằng `next dev`. Sửa `csp.test.ts`, `app-csp.test.ts`.
- Phím tắt của phiên Học (space, 1, 2) không bị nút loa nuốt, giữ như hiện tại (`SpeakButtons.tsx:8-10`).

**When → Then:**

| When | Then |
|---|---|
| Admin đăng `record` (danh từ) /ˈrekɔːd/, các nghĩa khác của `record` cùng phiên âm UK | không có từ nhiều cách đọc; khoá UK = chữ `record`; một file UK dùng chung |
| Admin đăng `record` (động từ) /rɪˈkɔːd/ | `record` thành từ nhiều cách đọc; mọi nghĩa của `record` tính lại khoá theo IPA; tạo 2 file UK mới (danh từ, động từ) và 2 file US |
| `lead` nghĩa "chì" /led/, nghĩa "dẫn đầu" /liːd/ | hai khoá, hai file mỗi giọng; bấm loa ở nghĩa "chì" nghe /led/ |
| Nghĩa không có phiên âm | khoá theo chữ; Google tự đọc |
| Lan lưu từ riêng `phobia` | khoá theo chữ `phobia`; nếu kho đã có file `phobia` (nghĩa trong kho không nhiều cách đọc) thì dùng chung, không gọi Google |
| Google trả lỗi 5xx hai lần rồi thành công | file `ready` ở lần thứ 3 |
| Google trả 400 vì ký hiệu IPA lạ | `failed` ngay (không thử lại), admin thấy "Lỗi" + nội dung lỗi, sửa phiên âm thì tạo khoá mới |
| Hết trần ký tự trong ngày | dòng giữ `pending`, chạy tiếp sau 0:00 |
| Hai admin đăng hai nghĩa cùng khoá cùng lúc | một dòng (PK `key`, `INSERT … ON CONFLICT DO NOTHING`), một lần gọi Google |
| Đẩy việc lỗi vì Redis tắt ngay sau khi đăng | dòng `pending` vẫn có; vòng quét 5 phút đẩy lại |
| Lan bấm loa UK khi file còn `pending` | giọng UK của trình duyệt; không có thì theo QC10 |
| Admin đổi tên giọng UK trong cấu hình | khoá mới cho mọi nghĩa; lệnh tạo cả kho tạo lại file UK; file cũ bị dọn sau một tuần |

### 5.6 Nạp dữ liệu cho kho có sẵn (khoảng 7.849 từ)

1. **Phiên âm:** script đọc file nguồn (theo QC7), khớp theo (chữ, loại từ), xuất CSV gồm cột định danh + `ipa_uk`, `ipa_us`; admin nhập CSV (tạo
   nháp) rồi đăng hàng loạt bằng trang có sẵn. Dùng lại đường nhập và đăng hiện có thay vì viết đường ghi mới. `ASSUMPTION`: một CSV chỉ có cột định
   danh và hai cột phiên âm thì các cột nội dung khác giữ nguyên (`mergeContent` giữ trường không có trong bản vá); plan phải kiểm điều này với
   `row-normalizer.ts` trước. Chỗ nguồn ghi phiên âm theo (chữ, loại từ) thì mọi nghĩa nhận cùng phiên âm; các trường hợp như `lead` admin sửa tay.
2. **Giọng đọc:** lệnh `pnpm tts:backfill` tạo dòng `pending` cho mọi nghĩa đang hiện chưa có file; chạy lại an toàn (khoá đã có thì bỏ qua). Ước
   lượng (chưa chạy): khoảng 15.600 file, dưới 125.000 ký tự nếu chỉ gửi chữ, nằm trong hạn mức miễn phí.
3. **Trang nguồn dữ liệu:** `sourceShownCondition` (`sources.service.ts:62-69`) thêm nhánh thứ ba: nguồn được dùng làm `ipa_source_id` của một bản
   đang đăng. Thêm dòng ghi công theo giấy phép của nguồn đã chọn (QC7).
4. **Chính sách bảo mật:** thêm Google Cloud Text-to-Speech vào danh sách bên xử lý, ghi rõ chỉ gửi chữ của từ (kể cả từ riêng của người học), không
   gửi câu. Sửa câu "không gửi từ vựng của bạn cho Google" ở đoạn AdSense (bản nháp `docs/launch-b-legal-drafts`, dòng 188). Ghi vào
   `deploy-checklist.md`; văn bản đăng qua trang `/legal` của admin.

## 6. Kiểm thử

Theo `~/.claude/rules/testing-boundaries.md`: lệnh test mặc định không cần Docker.

- **Hàm thuần, viết biên trước:** `applyLearn`, `applyRecall` (mọi nấc 0–5 × đến hạn / chưa / ưu tiên × đúng / sai / gợi ý; bất biến: không bao giờ
  giảm nấc khi sai), `streakDays` (rỗng, một ngày, đứt quãng, hôm nay chưa học, ranh giới múi giờ), khoá giọng đọc và luật "nhiều cách đọc", kiểm
  ký hiệu IPA.
- **Service (unit, mock DB như các spec hiện có):** phiên `recall` không gọi `checkQuota` / `recordPracticeSession`; không đóng phiên `practice`;
  `writeFinal` ghi lịch ôn đúng một lần khi hai yêu cầu song song; `streak` chỉ ở lần ghi đầu ngày; hàng `content-tts`: thử lại, lỗi 400 không thử
  lại, trần ký tự, dùng chung khoá.
- **Web (behavioural, theo role và chữ hiển thị):** thẻ nhóm ở 4 trạng thái §4.1; phiên Ôn và màn xong phiên; toast hiện một lần; dòng phiên âm và
  phiên âm riêng của nghĩa khác; nút loa phát URL và rơi về giọng trình duyệt.
- **CSP:** test `media-src` có origin âm thanh.
- **Smoke** `pnpm smoke:dot-cai-thien-c` (API + worker thật, `TTS_FAKE_ENABLED`, `AUDIO_STORAGE_FAKE_ENABLED`, DB mới): Học / Ôn đổi nấc đúng bảng
  §4.2, phiên Ôn không trừ hạn mức, chuỗi ngày, đăng một nghĩa → file `ready`, `lead` hai khoá.
- Pin lời hứa của tài liệu: mặc định `tts.daily_char_cap`, chữ toast, chữ dòng chuỗi trong email có test giữ.

## 7. Xong khi

- CI xanh ở mọi PR; `smoke:dot-cai-thien-c` qua hai lần, mỗi lần trên DB mới; `smoke:buoc-4`, `smoke:buoc-5` (hai chế độ) chạy lại vì đụng Practice
  và hạn mức.
- Chủ dự án tự chạy luồng Học / Ôn trên máy (checklist viết ở `docs/deliveries/dot-cai-thien-c-checklist.md`).
- **Việc của chủ dự án:** tạo project Google Cloud, bật thanh toán và cảnh báo ngân sách, tạo khoá service account; tạo bucket R2. Rồi một lần gọi
  thật: tạo khoảng 10 từ (`lead` hai nghĩa, `record` hai loại từ, `read`, `live`, `a`, `the`, `look after`) bằng 2–3 giọng WaveNet mỗi vùng, nghe và chọn
  `TTS_VOICE_UK`, `TTS_VOICE_US`, rồi mới chạy `tts:backfill`.

## 8. Rủi ro và chỗ chưa kiểm

- **Chưa ai nghe giọng WaveNet thật.** Chất lượng một từ đứng riêng, và Google có đọc đúng theo IPA không, chỉ biết sau lần gọi thật ở §7.
- **WaveNet nằm trong nhóm "Legacy TTS models"** trên bảng giá Google (đọc 06/11/2026). Chưa thấy thông báo ngừng. Google từng thay giọng cụ thể bằng
  giọng "tương tự" (đợt 04/2023 có `en-GB-Wavenet-*`): nếu giọng đã chọn bị thay, từ mới nghe khác file cũ; cách xử lý là đổi tên giọng và tạo lại
  cả kho (rẻ, vài giờ).
- **Giới hạn số yêu cầu mỗi phút của WaveNet chưa kiểm** (đã kiểm Neural2 1.000, Chirp 3 HD 200). Worker 4 việc song song cần con số này; kiểm lúc làm plan.
- **Ký hiệu IPA của nguồn có thể có ký tự Google không nhận.** Bảng ký tự được nhận lấy từ tài liệu Google lúc làm plan; từ lỗi hiện "Lỗi" ở admin.
- **Cách lấy phiên âm từ Wiktionary chưa kiểm** (`ASSUMPTION`: có bản trích sẵn dạng JSON). Wiktionary có tách cách đọc theo nguồn gốc của từ không
  cũng chưa kiểm. Nếu chọn Wiktionary: phần IPA lấy về phải công bố lại theo CC BY-SA (ví dụ một file tải về được), và ghi công trên trang nguồn.
- **Chữ của từ riêng đi ra Google.** Theo tài liệu Google, chữ gửi đi không được lưu; chính sách bảo mật phải ghi tên Google (§5.6). Câu riêng vẫn
  không rời máy.
- **Đổi lịch ôn với người đang dùng app:** sau khi M1 lên, "Đã biết" ở Học không còn làm lên nấc. Người học quen luồng cũ (lật thẻ để lên nấc) sẽ
  thấy từ đến hạn không giảm cho tới khi vào Ôn. Hiện chưa có người học thật nên ảnh hưởng nhỏ; checklist của chủ dự án kiểm điều này.
- **Chuỗi ngày dựa vào múi giờ hồ sơ.** Người đổi múi giờ có thể mất hoặc được thêm một ngày ở ranh giới.
- **Toast và email chưa đo trên điện thoại thật.**
- **Hai mockup vẽ trước khi đọc code:** màn xong phiên Ôn thêm ô "Đúng, giữ nấc" (§4.4) là chỗ khác duy nhất đã biết.
