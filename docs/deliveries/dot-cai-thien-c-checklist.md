# Checklist tự kiểm đợt cải thiện C (07/11/2026)

Bản gọn để chủ dự án tự kiểm lại những gì đợt C đã làm: **M1** Học / Ôn và chuỗi ngày, **M2** phiên âm và giọng đọc. Chi tiết kỹ thuật: [`dot-cai-thien-c.md`](dot-cai-thien-c.md)
(plan tóm tắt và as-built), output smoke: [`dot-cai-thien-c-smoke-output.txt`](dot-cai-thien-c-smoke-output.txt). Design:
[`../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md`](../superpowers/specs/2026-11-06-dot-cai-thien-c-design.md).

Mỗi dòng có ba phần: **Thấy** (điều cần thấy), **Kiểm** (trang mở, nút bấm, lệnh) và **Đúng là** (kết quả đúng). Nhãn cuối dòng:

- **[local]** kiểm được trên máy bạn với `pnpm bootstrap` (TTS giả và kho file giả bật sẵn trong Docker);
- **[lệnh]** kiểm bằng một lệnh;
- **[sau deploy]** cần Google Cloud, R2 và tên miền thật; các mục này cũng nằm trong [`deploy-checklist.md`](deploy-checklist.md) mục "Đợt C".

Ví dụ dùng **Lan**, người học có nhóm "Kinh doanh". "Ngăn" là chữ app dùng cho nấc của lịch ôn (Mới · 1 ngày · 3 ngày · 7 ngày · 14 ngày · 30 ngày).

## 0. Chuẩn bị (một lần)

- [ ] **Thấy:** máy chạy `dev` mới nhất (có PR #236–#246).
  **Kiểm:** `git switch dev`, `git pull`, rồi ở thư mục gốc `pnpm bootstrap`, sau đó `pnpm bootstrap seed`.
  **Đúng là:** admin http://localhost:5173, web học http://localhost:3001/vi/app, API http://localhost:3000/v1/health chạy; seed in email admin và email người học Pro. **[local]**
- [ ] **Thấy:** API dùng TTS giả và kho file giả.
  **Kiểm:** `docker exec english-learning-api-1 sh -c 'env | grep -E "TTS_FAKE|AUDIO_"'`.
  **Đúng là:** `TTS_FAKE_ENABLED=true`, `AUDIO_STORAGE_FAKE_ENABLED=true`, `AUDIO_PUBLIC_BASE_URL=http://localhost:3000/v1/dev/audio` (mặc định của `docker-compose.yml`). **[lệnh]**
- [ ] **Thấy:** kho có sẵn có file giọng đọc.
  **Kiểm:** `docker exec english-learning-api-1 node dist/cli/tts-backfill.js`, chờ vài giây, rồi
  `docker exec english-learning-postgres-1 psql -U dev -d english_learning -c "select status, count(*) from speech_audio group by 1"`.
  **Đúng là:** các dòng chuyển thành `ready` (khoảng hai dòng cho mỗi nghĩa đã đăng). Nghĩa đăng trước đợt C chỉ có file sau bước này. **[lệnh]**
- [ ] **Lưu ý:** admin và web học dùng chung cookie trên `localhost`. Đăng nhập admin rồi mở web học là đang học bằng tài khoản admin. Muốn học bằng tài khoản người học thì đăng xuất ở web học trước.

## 1. M1 — Học và Ôn

- [ ] **C-1 · Hai nút, không số.** **Thấy:** thẻ nhóm, trang nhóm và ô đầu trang Hôm nay có **Học** và **Ôn** thay cho "Ôn N thẻ".
  **Kiểm:** trang Hôm nay, trang Nhóm, trang một nhóm.
  **Đúng là:** nút có việc chờ thì tô vàng. Nhóm có từ đến hạn: Học · **Ôn**. Nhóm chỉ có từ mới: **Học** (thêm "Ôn tập" khi nhóm đã có từ đã học). Nhóm xong hôm nay: chip "Xong hôm nay" và một nút "Ôn tập". Nút không có số. **[local]**
- [ ] **C-2 · "Đã thuộc".** **Thấy:** thẻ nhóm ghi "N từ · M đã thuộc", trang nhóm ghi "N từ · M đã thuộc · tạo ngày …" khi có từ ở ngăn 14 hoặc 30 ngày.
  **Kiểm:** một nhóm có từ đã thuộc (nhóm mới thì chưa có; smoke kiểm phần lịch).
  **Đúng là:** M = số từ ở hai ngăn cuối; nhóm chưa có thì không ghi phần "đã thuộc". **[local]**
- [ ] **C-3 · Học chỉ lật từ mới.** **Thấy:** bấm Học ở nhóm còn từ mới thì chỉ ra từ mới.
  **Kiểm:** bấm Học, lật thẻ (Space), bấm "Đã biết" (2).
  **Đúng là:** địa chỉ có `mode=new`; mỗi lần "Đã biết" thì "còn N thẻ" giảm 1; từ đó lên ngăn 1 ngày (trang nhóm, bộ lọc "Ngăn 1 ngày"). Hết từ mới hôm nay thì nút Học lật mọi từ (`mode=all`). **[local]**
- [ ] **C-4 · Lật lại từ đã học không đổi lịch.** **Thấy:** ở `mode=all`, "Đã biết" cho một từ đã học không làm nó lên ngăn.
  **Kiểm:** ghi lại ngăn của một từ ở trang nhóm, lật nó ở Học `mode=all`, bấm "Đã biết", xem lại.
  **Đúng là:** ngăn và ngày đến hạn giữ nguyên. Đây là chỗ khác hẳn trước đợt C: muốn lên ngăn phải vào Ôn. **[local]**
- [ ] **C-5 · Phiên Ôn.** **Thấy:** bấm Ôn mở thẳng câu hỏi, không có bước tùy chỉnh; tiêu đề "Ôn · <tên nhóm>"; tối đa 10 câu, kiểu "chọn từ theo nghĩa" hoặc "gõ từ theo nghĩa".
  **Kiểm:** bấm Ôn ở một nhóm có từ đã học.
  **Đúng là:** trả lời đúng một từ đến hạn hiện "<từ> lên ngăn …"; đúng một từ chưa đến hạn hiện "<từ> giữ ngăn …"; sai thì nút chính là "Cần ôn lại". Không bao giờ có nút "Đã biết". **[local]**
- [ ] **C-6 · Màn xong phiên Ôn.** **Thấy:** "Xong N từ." và các ô: Đúng, lên ngăn · Sai, giữ ngăn · Cần ôn lại; thêm ô "Đúng, giữ ngăn" khi có từ chưa đến hạn.
  **Kiểm:** làm hết phiên, hoặc Esc để dừng sớm.
  **Đúng là:** nhóm còn từ mới thì có "Còn N từ mới trong nhóm này" kèm **Học** và "Về trang chủ"; còn từ đến hạn thì có **Ôn tiếp**. Dừng sớm bằng Esc thì góc trên vẫn ghi "Xong 8/8" (lỗi có từ trang Luyện tập, chưa sửa). **[local]**
- [ ] **C-7 · Ôn không trừ lượt và không đóng phiên Luyện tập.** **Thấy:** người học Miễn phí làm phiên Ôn mà số phiên luyện còn lại không đổi; phiên Luyện tập đang dở vẫn tiếp được.
  **Kiểm:** mở một phiên Luyện tập, trả lời một câu, thoát ra; vào Ôn một nhóm; quay lại Luyện tập.
  **Đúng là:** phiên Luyện tập đang dở vẫn tiếp được; số phiên luyện còn lại trong ngày không giảm vì phiên Ôn. **[local]**
- [ ] **C-8 · Từ hay sai, lịch sử.** **Thấy:** câu sai trong Ôn vào "Từ hay sai"; lịch sử Luyện tập không có câu của phiên Ôn.
  **Kiểm:** sai cùng một từ vài lần trong Ôn, rồi mở Luyện tập → Từ hay sai và Lịch sử.
  **Đúng là:** từ đó có trong "Từ hay sai"; Lịch sử chỉ có phiên Luyện tập. **[local]**
- [ ] **C-9 · Nhóm chưa học từ nào.** **Thấy:** mở `/vi/app/recall?group=<id>` của nhóm chỉ có từ mới.
  **Đúng là:** "Nhóm này chưa có từ nào đã học." kèm nút Học. **[local]**

## 2. M1 — Chuỗi ngày

- [ ] **C-10 · Toast lần học đầu tiên trong ngày.** **Thấy:** lần lật thẻ hoặc trả lời câu đầu tiên của ngày hiện toast nền xanh than ở giữa đáy: ngọn lửa và "N ngày liên tiếp", tắt sau 3 giây.
  **Kiểm:** một tài khoản chưa học hôm nay, Học một thẻ. (Đã học rồi thì xoá dòng hôm nay:
  `delete from learning_activity_days d using users u where u.id=d.user_id and u.email='<email>' and d.local_date=current_date;`)
  **Đúng là:** toast hiện một lần; lần sau trong ngày không hiện; toast không che nút trả lời và không chặn bấm. **[local]**
- [ ] **C-11 · Ngày chỉ thêm từ không tính.** **Thấy:** hôm nay chỉ thêm từ, không lật thẻ nào, thì chuỗi không tăng.
  **Kiểm:** `select local_date, studied from learning_activity_days where user_id = '<id>' order by 1 desc limit 3;` sau khi chỉ thêm từ.
  **Đúng là:** dòng hôm nay có `studied = false`. **[lệnh]**
- [ ] **C-12 · Dòng chuỗi trong email nhắc.** **Thấy:** email nhắc có dòng đầu "Bạn đang có chuỗi N ngày. Học hôm nay để giữ chuỗi." khi chuỗi từ 2 ngày và hôm nay chưa học.
  **Kiểm:** Mailpit http://localhost:8025 vào giờ nhắc (mặc định 20:00), với một tài khoản có chuỗi ≥ 2 và còn thẻ chờ.
  **Đúng là:** có dòng đó trên câu cũ; chuỗi 1 ngày hoặc đã học hôm nay thì không có. Email nhắc vẫn cách nhau ít nhất 2 ngày như cũ (DC29). **Chưa ai thử qua Mailpit.** **[local]**

## 3. M2 — Phiên âm ở admin

- [ ] **C-13 · Hai ô phiên âm.** **Thấy:** trang một nghĩa ở admin có "Phiên âm UK", "Phiên âm US" dưới nghĩa tiếng Việt, và dòng nguồn.
  **Kiểm:** admin → Nghĩa → mở `schedule`; gõ `/ˈʃedʒ.uːl/` vào UK, `ˈskedʒ.uːl` vào US; "Lưu và publish".
  **Đúng là:** lưu không còn dấu `/`; dòng nguồn ghi "Nguồn: Wordmet" (sửa tay); khung "Giọng đọc" chuyển UK, US thành "Có giọng" sau vài giây. **[local]**
- [ ] **C-14 · Ký hiệu lạ.** **Kiểm:** gõ `ˈʃedʒ1` vào UK, lưu nháp.
  **Đúng là:** dưới ô UK: "Ký hiệu “1” không có trong bảng phiên âm."; không lưu. **[local]**
- [ ] **C-15 · Trần ký tự TTS.** **Kiểm:** admin → Cài đặt → tab "Giọng đọc".
  **Đúng là:** "Trần ký tự TTS mỗi ngày", 0–1.000.000 ký tự, mặc định 120.000. **[local]**
- [ ] **C-16 · CSV có cột phiên âm.** **Kiểm:** Xuất CSV một nhóm nghĩa; mở file.
  **Đúng là:** có cột `ipa_uk`, `ipa_us`, `ipa_source_id`. Nhập lại một file chỉ có cột định danh và hai cột phiên âm thì bản nháp mới giữ mọi trường khác. **[local]**

## 4. M2 — Phiên âm và giọng đọc ở app học

- [ ] **C-17 · Trang một từ.** **Thấy:** dưới từ là `UK 🔊 /…/   US 🔊 /…/` cho mỗi khối loại từ; không còn nút loa chung ở đầu trang.
  **Kiểm:** `/vi/app/word?w=schedule` (sau C-13). Bấm loa UK, rồi loa US; mở DevTools → Network, lọc `dev/audio`.
  **Đúng là:** hai request mp3 khác nhau, mỗi cái `200`; Console không có lỗi CSP. Nghĩa nào đọc khác cả khối (ví dụ `lead` nghĩa là chì) thì có dòng riêng dưới nghĩa đó (smoke kiểm `lead`; kho mẫu không có từ này). **[local]**
- [ ] **C-18 · Thẻ ôn.** **Thấy:** cả hai mặt thẻ có dòng UK, US; bấm loa không lật thẻ; Space, 1, 2 khi đang focus vào loa không trả lời thẻ.
  **Đúng là:** từ chưa có phiên âm chỉ có hai nút loa (đọc nguyên chữ hoặc cụm). **[local]**
- [ ] **C-19 · Chưa có file và máy không có giọng Anh-Anh.** **Thấy:** nút loa UK mờ đi; rê chuột hoặc Tab tới thì thấy "Đang tạo giọng đọc"; bấm không ra tiếng.
  **Kiểm:** một từ chưa có file (trước khi chạy `tts:backfill`), trên máy không cài giọng en-GB.
  **Đúng là:** loa US vẫn đọc bằng giọng máy. **[local]**
- [ ] **C-20 · Tra từ.** **Thấy:** trong tấm Thêm từ, mỗi kết quả tra có dòng phiên âm và hai nút loa, nằm dưới lựa chọn.
  **Đúng là:** bấm vào chữ nghĩa chỉ chọn nghĩa, không phát tiếng. Kết quả "Tra bằng AI" chưa có phiên âm (chưa làm). **[local]**
- [ ] **C-21 · Từ riêng.** **Thấy:** form "Tự nhập nghĩa" và form sửa từ AI có ô "Phiên âm" ghi "Không bắt buộc."; trang của từ riêng có **một** nút loa kèm phiên âm Lan ghi, không chia UK / US.
  **Kiểm:** thêm từ `rizz` với phiên âm `/rɪz/`; mở trang từ; bấm [Sửa], đổi phiên âm, lưu.
  **Đúng là:** trang hiện `🔊 /rɪz/`; sửa xong hiện phiên âm mới; để trống thì không còn dòng phiên âm, chỉ còn nút loa. **[local]**
- [ ] **C-22 · Điện thoại.** **Kiểm:** DevTools, khổ 375 px: trang Hôm nay, trang một từ, phiên Ôn, màn xong phiên, toast.
  **Đúng là:** không có cuộn ngang; hai nút Học · Ôn chia đều; dòng phiên âm xuống dòng gọn. **Chưa thử trên điện thoại thật.** **[local]**

## 5. Sau deploy

- [ ] **C-23 · Giọng thật.** Tạo Google Cloud, R2, đặt biến (mục "Đợt C" của `deploy-checklist.md`); nghe ~10 từ (design §7: `lead` hai nghĩa, `record` hai loại từ, `read`, `live`, `a`, `the`, `look after`) rồi chọn giọng. **[sau deploy]**
- [ ] **C-24 · Nạp phiên âm cho cả kho.** `ipa:build-csv` trên bản Wiktionary thật → nhập CSV → đăng hàng loạt → `tts:backfill`; xem số "readings disagree" để điền tay. **[sau deploy]**
- [ ] **C-25 · CSP thật.** Mở một từ có file: Network có request tới `audio.wordmet.com`, Console không có lỗi CSP. **[sau deploy]**
- [ ] **C-26 · Chính sách bảo mật.** Thêm Google Cloud Text-to-Speech; sửa câu "không gửi từ vựng của bạn cho Google"; đăng qua `/legal`. **[sau deploy]**
