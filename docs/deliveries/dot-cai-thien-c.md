# Đợt cải thiện C — plan tóm tắt (07/11/2026)

Plan đầy đủ: [`../superpowers/plans/2026-11-07-dot-cai-thien-c.md`](../superpowers/plans/2026-11-07-dot-cai-thien-c.md). Design:
[`../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md`](../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md). Decision record:
[`../superpowers/decisions/2026-11-06-dot-cai-thien-c-decisions.md`](../superpowers/decisions/2026-11-06-dot-cai-thien-c-decisions.md).

Phiên BE (Sonnet 5.5, xhigh) làm Task 1–23; phiên UI làm Task 24–31 khi API nó cần đã vào `dev`.

**BE1 — Học và Ôn (API)**
1. Thêm hai luật lịch: Học (chỉ từ mới lên nấc 1) và Ôn (đúng + đến hạn thì lên nấc; đúng một từ ưu tiên chỉ bỏ cờ).
2. Lật thẻ dùng luật Học; hàng thẻ có thêm chế độ "chỉ từ mới"; phát lại lần lật thẻ trả đúng cờ ưu tiên.
3. Migration: loại phiên `practice` / `recall`, kết quả lịch của từng câu, một phiên mở cho mỗi loại.
4. Learning: danh sách "từ đã học" của nhóm (trong trần ôn) và ghi kết quả Ôn vào lịch.
5. Mở phiên Ôn: không trừ lượt, không đóng phiên Luyện tập đang dở, tối đa 10 câu.
6. Câu trả lời cuối của phiên Ôn đổi lịch và trả kết quả lịch về app.
7. Tổng kết phiên Ôn (lên nấc, đúng giữ nấc); lịch sử Luyện tập bỏ phiên Ôn.

**BE2 — Chuỗi ngày**
8. Đánh dấu ngày học riêng với ngày chỉ thêm / xoá từ; biết lần học đầu tiên trong ngày.
9. Tính chuỗi ngày; trả số chuỗi ở lần học đầu tiên trong ngày.
10. Thêm dòng "Bạn đang có chuỗi N ngày" vào email nhắc khi chưa học hôm nay.

**BE3 — Phiên âm**
11. Thêm cột phiên âm UK / US (và ô của từ riêng) vào bản sửa của nghĩa, kiểm ký hiệu, giữ hash cũ.
12. Admin sửa phiên âm qua API; CSV nhập / xuất có cột phiên âm.
13. Người học ghi phiên âm cho từ riêng, mỗi nghĩa một ô.
14. Trả phiên âm cùng mọi nghĩa (thẻ, trang từ, tra từ).

**BE4 — Giọng đọc**
15. Cấu hình Google TTS và kho file R2, bản giả để chạy local.
16. Tính khoá file và đổi ký hiệu IPA sang bảng của Google.
17. Bảng file giọng đọc; tạo việc sau khi đăng nghĩa hoặc lưu từ riêng; trả URL file cùng nghĩa.
18. Gọi Google trong hàng việc nền: thử lại, lỗi không thử lại, trần ký tự mỗi ngày.
19. Vòng quét việc bị bỏ dở, dọn file không dùng, trạng thái giọng và nút "Tạo lại" cho admin.

**BE5 — Nạp dữ liệu và kiểm cuối**
20. Lệnh dựng CSV phiên âm từ dữ liệu Wiktionary (kiểm dữ liệu thật trước).
21. Lệnh tạo giọng đọc cho cả kho.
22. Trang nguồn dữ liệu hiện Wiktionary.
23. Smoke cho cả đợt, chạy lại smoke cũ; ghi việc trước launch và chính sách bảo mật.

**FE1 — Học / Ôn và chuỗi ngày trên web**
24. Cặp nút Học · Ôn ở thẻ nhóm, trang nhóm, trang Hôm nay; số "đã thuộc".
25. Trang Học mở theo chế độ "chỉ từ mới" hoặc "mọi từ".
26. Trang Ôn và màn xong phiên Ôn.
27. Toast chuỗi ngày.

**FE2 — Phiên âm và giọng đọc trên web và admin**
28. Admin: ô phiên âm, trạng thái giọng, ô trần ký tự TTS.
29. Nút loa phát file có sẵn, rơi về giọng máy; CSP cho phép file âm thanh.
30. Dòng phiên âm ở thẻ, trang một từ, tra từ, form từ riêng.
31. Review giao diện bằng các skill UI, kiểm trên bản build; viết checklist cho chủ dự án.

---

# Đợt cải thiện C — as-built, phần backend (07/11/2026)

Phiên BE xong Task 1–23. Mọi PR vào `dev`, CI xanh trước khi merge. Hợp đồng API (H1–H16 trong plan) **không đổi**; các chỗ khác plan ghi ở "Quyết định ngoài plan".

| PR | Task | Merge vào `dev` |
|---|---|---|
| [#236](https://github.com/quangtienngo661/english-flashcard/pull/236) BE1 Học / Ôn | 1–7 | `0e172f50` |
| [#237](https://github.com/quangtienngo661/english-flashcard/pull/237) BE2 chuỗi ngày | 8–10 | `58d568fa` |
| [#239](https://github.com/quangtienngo661/english-flashcard/pull/239) BE3 phiên âm | 11–14 | `be0c27b9` |
| [#242](https://github.com/quangtienngo661/english-flashcard/pull/242) BE4 giọng đọc | 15–19 | `ff10ee91` |
| [#244](https://github.com/quangtienngo661/english-flashcard/pull/244) fix: `origin = 'recall'` | (lỗi của BE1) | `efac5cf4` |
| BE5 nạp dữ liệu và smoke | 20–23 | PR của nhánh `feat/dot-c-be5-backfill` |

**Lỗi smoke tìm ra (đã sửa ở #244).** Câu trả lời cuối của phiên Ôn trả 500 trên DB thật: `learning_log_origin_check` chỉ cho `'practice'`, còn `RecallAnswerService`
ghi `origin = 'recall'`. Mọi unit test mock DB nên không thấy. Test mới `src/learning/log-origin-constraint.spec.ts` đọc các migration và fail khi lần định nghĩa
cuối của constraint không cho mọi origin mà code ghi.

## Đã dựng (khớp plan, trừ chỗ ghi riêng)

- **Lịch.** `applyLearn`, `applyRecall` là hàm thuần cạnh `applyAnswer` (không đổi). Học: chỉ nấc 0 + "Đã biết" lên nấc 1; nấc ≥ 1 + "Đã biết" không đổi gì nhưng vẫn ghi một dòng
  `learning_log` để trần mỗi ngày đếm. Ôn: đúng (không gợi ý) + đến hạn → lên nấc; đúng trên từ ưu tiên → chỉ bỏ cờ, hạn = hôm nay + khoảng của nấc đó (DC26).
- **Phiên Ôn.** `practice_sessions.kind`, `practice_session_items.recall_outcome`, index mở theo `(user_id, kind)`. `start({ kind: 'recall' })`: nhóm, 2 loại câu cố định
  (`mcq_definition`, `type_word`), kiểu `meaning`, thứ tự `queue`, số câu = `min(default, số từ dùng được)`, không `checkQuota`, không AI, không đóng phiên Luyện tập.
  `writeFinal` gọi `LearningService.recallAnswer` trong cùng transaction (khoá `learning_items FOR UPDATE`).
- **Chuỗi ngày.** `learning_activity_days.studied`; `recordActivityIn(..., { studied })` trả `firstStudied` (hai yêu cầu đua nhau cho cùng một ngày: đúng một cái nhận `true`, đã chạy thật với 2 và 3 lời gọi
  song song). `streakDays` đếm lùi từ hôm nay (hoặc hôm qua nếu hôm nay chưa học), bỏ ngày trùng và ngày sau hôm nay, đọc tối đa 4000 ngày. Email nhắc thêm dòng chuỗi khi chuỗi ≥ 2 và hôm nay chưa học.
- **Phiên âm.** 4 cột trên `sense_revisions`; `normalizeIpa` / `checkIpa`; hash cũ không đổi; admin/CSV/quick-add/PATCH như H10–H12, H15; `WordSense.pronunciation`.
- **Giọng đọc.** `speech_audio` (khoá `sha256(voice|text|phonemes)`), queue `content-tts` (3 lần, backoff mũ 5 s, `concurrency 4`), `TtsAdapter` Google + fake, `AudioStorage` R2 + thư mục local,
  trần ký tự mỗi ngày (setting `tts.daily_char_cap`), vòng quét 5 phút, dọn file mỗi tuần (chỉ dòng cũ hơn 7 ngày; xoá file trước, dòng sau).
- **Nạp dữ liệu.** `pnpm ipa:build-csv`, `pnpm tts:backfill`; trang Nguồn dữ liệu hiện nguồn phiên âm; `THIRD_PARTY_NOTICES.md` có mục Wiktionary.

## Dữ liệu Wiktextract thật (Task 20 bước 1) — khác giả định của plan

Đọc bằng 5 file nhỏ theo từng từ của kaikki.org (`lead`, `record`, `read`, `live`, `luggage`, tổng 650 KB), **không** tải bản raw 2,9 GB. Cấu trúc thật:

- Một dòng cho mỗi **(etymology, loại từ)**, không phải mỗi loại từ: `lead` có 6 mục tiếng Anh, `lead` danh từ có hai mục (`/lɛd/` và `/ˈliːd/`). Catalog không biết nghĩa nào thuộc etymology nào,
  nên nếu các mục của cùng (từ, loại từ) cho phiên âm **khác nhau** thì giọng đó bị bỏ trống và đếm là "readings disagree" (người biên tập điền tay), không đoán.
- `sounds[].ipa` luôn có dấu `/…/` hoặc `[…]`; chỉ nhận `/…/`. `etymology_number` là **chuỗi** (`"1"`).
- Thẻ: `Received-Pronunciation`, `UK`, `General-American`, `US`; thẻ vùng (`Australia`, `Canada`, `Southern-US`, `Wales`, …) bị bỏ. Không thẻ = dùng cho cả hai giọng. Thứ tự: RP > UK, General-American > US.
- Có mảnh như `/ɹə-/` (bị `checkIpa` từ chối vì dấu `-`) và `d͡ʒ` (có dấu nối, được nhận).
- Fixture `apps/api/scripts/fixtures/wiktextract-sample.jsonl` là phần cắt từ dữ liệu thật đó (chỉ các trường `pickIpa` đọc) cộng một dòng tiếng Đức để kiểm bộ lọc.

## Quyết định ngoài plan

1. **Index mở phiên là `(user_id, kind)`** (plan Task 3) nên một người học chỉ có **một** phiên Ôn mở. Kịch bản "Review Focus 1" (hai phiên Ôn của hai nhóm cùng chứa một từ) vì thế không xảy ra; mở phiên Ôn
   thứ hai đóng phiên thứ nhất. Smoke thay bằng "hai yêu cầu y hệt gửi cùng lúc": một cái 200, một cái 409, nấc tăng đúng một lần. `FOR UPDATE` trong `recallAnswer` vẫn giữ (nó còn chặn đua với "Cần ôn lại").
2. `last_needs_review_at` (thứ tự "ưu tiên lâu nhất") bỏ qua dòng `origin = 'recall'`, vì câu sai trong Ôn ghi `answer = 'review'` nhưng không phải lần bấm "Cần ôn tập".
3. `RecallAnswerService` ghi câu sai là `answer = 'review'`, `rating = 'Again'` (theo plan); câu đúng nhưng chưa đến hạn ghi `answer = 'known'`, `section = 'early'`.
4. `LocalAudioStorage.publicUrl` = `<AUDIO_PUBLIC_BASE_URL>/<key>.mp3` (không có `tts/v1/`), vì H16 chỉ phục vụ `GET /v1/dev/audio/:file`; file vẫn nằm ở `<dir>/tts/v1/<key>.mp3`.
   Với R2 URL là `<base>/tts/v1/<key>.mp3`. Tên file sai → 404 (không 400).
5. Âm thanh chỉ bật khi có **cả** provider **và** storage (`AudioService.enabled`); thiếu một trong hai thì mọi thứ im lặng, app dùng giọng trình duyệt.
6. Mở rộng ngoài "đăng": `unpublish` và `retire` cũng gọi `ensureForSenses` (ẩn một nghĩa của `lead` đổi số cách đọc, các nghĩa còn lại cần khoá mới); PATCH từ riêng gọi lại cho mọi nghĩa của từ (đổi chính tả đổi khoá).
7. `mergeContent`: sửa tay `ipa_uk`/`ipa_us` (giá trị khác giá trị cũ) mà patch không có `ipa_source_id` thì `ipa_source_id` về `null`; `ipa_source_id` có trong `contentHash`.
8. CSV: `ipa_source_id` không phải uuid → lỗi dòng `invalid-ipa-source`; uuid không có trong `data_sources` → cùng mã (trước khi vào `importContent`, để khỏi vi phạm khoá ngoại); phiên âm > 100 ký tự → `cell-too-long`;
   ký tự lạ → `ipa-invalid`. File upload vẫn bắt buộc cột `headword` và `pos` (như mọi CSV khác), nên "CSV chỉ cột phiên âm" nghĩa là chỉ các cột nội dung phiên âm, kèm cột định danh.
9. `GET /v1/admin/content/senses/:id` gắn `audio` ở controller (không ở `AdminCatalogQueries`); nghĩa không hiện → `{ uk: null, us: null }`.
10. `tts:backfill` chỉ làm nghĩa **catalog**; từ riêng của người học có file khi được tạo hoặc sửa.
11. Setting mới nằm ở mục riêng `tts` của `GET/PATCH /v1/admin/settings` (`tts.daily_char_cap`); web admin cần thêm mục này ở trang Cài đặt.
12. Giá trị mặc định `TTS_VOICE_UK=en-GB-Wavenet-B`, `TTS_VOICE_US=en-US-Wavenet-D`: chỉ là ví dụ để chạy; chủ dự án nghe thử 10 từ rồi chọn (checklist deploy).

## Smoke

`pnpm smoke:dot-cai-thien-c` (14 bước: Học, Ôn, chuỗi, phiên âm, giọng đọc) chạy hai lần, mỗi lần trên DB mới, cộng `smoke:buoc-4` và `smoke:buoc-5` (`fetchState` bật và tắt).
Kết quả cuối mỗi lần chạy: `docs/deliveries/dot-cai-thien-c-smoke-output.txt`. Cách chạy: đầu file `apps/api/scripts/smoke-dot-cai-thien-c.mjs`.

## Chưa kiểm

- Google Cloud TTS và R2 **thật** chưa được gọi lần nào (chưa có tài khoản): `GoogleTtsAdapter` và `R2AudioStorage` chỉ có test với client giả; kiểu của hai SDK được đọc trong package đã cài vì context7 không có tài liệu Node cho TTS.
  Bảng ký hiệu IPA của `toGooglePhonemes` theo danh sách trong plan; Google có nhận từng chuỗi phoneme cụ thể hay không chưa thử.
- `ipa:build-csv` chạy thật trên file raw 2,9 GB và catalog thật chưa thử (chạy trên fixture và DB rỗng); số lượng "readings disagree" trên dữ liệu thật chưa biết.
- Dòng chuỗi trong email nhắc kiểm bằng unit test, chưa gửi qua Mailpit.
- Khoá `speech_audio.text` chứa chữ của từ riêng cho tới lần dọn tuần sau khi từ bị xoá (≥ 7 ngày).
