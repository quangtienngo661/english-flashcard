# Đánh giá workflow và độ khả thi của dự án (15/10/2026)

Người viết: Claude, theo yêu cầu của chủ dự án. Mục đích: trả lời hai câu hỏi — (1) workflow đã dùng từ đầu dự án đến
nay tốt ở đâu, yếu ở đâu; (2) dự án có khả thi không, tức là app có "work" với người dùng thật không. Tài liệu viết cho
người đọc không có bối cảnh trước; mọi con số có nguồn ở mục 7.

**Lưu ý về người đánh giá:** Claude là AI đã làm phần lớn code của dự án, nên đang tự đánh giá một phần công việc của
chính mình. Đọc phần "điểm mạnh" với con mắt hoài nghi.

## 1. Kết luận ngắn

- **Workflow xây đúng (build it right): rất tốt**, ở mức một team chuyên nghiệp: design → decision record → plan → TDD →
  review → chạy thử trên stack thật → PR có CI chặn. Bug thật được bắt trước khi merge.
- **Workflow kiểm xem có đang xây đúng thứ không (build the right thing): gần như không có.** Chính tài liệu khảo sát
  ngày 30/09 khuyên phỏng vấn 5–8 người và thử một luồng nhỏ 7–14 ngày trước khi chốt MVP. Repo không có ghi nhận nào cho
  thấy việc đó đã làm; 4 ngày sau đã viết spec, 6 ngày sau bắt đầu code.
- **App có work với người dùng không: chưa ai biết, kể cả Claude.** Sau 10 ngày code (213 commit, 19 PR) chưa có người
  dùng nào chạm vào vòng học (thêm từ → ôn). Catalog có 7.799 từ nhưng chỉ 4 từ có nghĩa.
- **Khả thi về kỹ thuật: cao.** Rủi ro nằm ở nhu cầu, nội dung và giữ chân người dùng, không nằm ở code.

## 2. Dòng thời gian

| Ngày | Việc |
|---|---|
| 30/09 | Khảo sát (13 phản hồi có nội dung), phân tích đối thủ, 1 phản hồi định tính |
| 01–02/10 | Nghiên cứu dữ liệu từ vựng, chi phí, license, kiến trúc |
| 04/10 | Chốt quyết định K1–K25, viết 8 spec V1 |
| 05–07/10 | Bước 0 (nền backend), đổi Drizzle → Prisma, Bước 1 (identity) |
| 08–09/10 | Landing page + deploy Cloudflare |
| 12–13/10 | Bước 2 (content + pipeline) |
| 14–15/10 | Bước 2.5 (admin web), rồi thiết kế làm lại UI (hướng B) cho landing + admin |

Bước 3 (Learning — phần người học thực sự dùng) chưa bắt đầu.

## 3. Đánh giá workflow

### Điểm mạnh (có bằng chứng)

| Điểm | Bằng chứng |
|---|---|
| Quy trình kỹ thuật chặt, giống team chuyên nghiệp | 19 PR merge qua CI; real-stack e2e cho admin; mỗi Bước có "Xong khi" chạy tay trên DB mới (`docs/deliveries/buoc-2-5-test-flow.md`) |
| Lỗi được bắt trước khi tới `main` | 29 commit `fix` trên 213, chỉ 2 revert; lần chạy tay Bước 2.5 phát hiện lỗi thật (luồng xuất `unpublishable` rỗng với file CEFR-J) |
| Quyết định thuộc về chủ dự án và có lưu vết | 6 decision record; ở Bước 2.5 chủ dự án chọn khác đề xuất 6 lần và tự nêu yêu cầu khoảng 6 lần trên 28 quyết định |
| Discovery trung thực | Phân tích khảo sát và đối thủ ghi rõ giới hạn mẫu, so app với baseline ChatGPT/Gemini thay vì tự khen ý tưởng — hiếm gặp ở dự án cá nhân |
| Có luật làm việc chống "AI nói bừa" | CLAUDE.md: verify before assert, có đối chứng, nhãn `ASSUMPTION`, edge case When → Then |

### Điểm yếu

1. **Bỏ qua bước kiểm chứng nhu cầu mà chính tài liệu đã đề ra.** `SURVEY_ANALYSIS_2026-09-30.md` kết luận "chưa có cơ sở
   để chuyển sang Product Spec" và đề xuất phỏng vấn + thử 7–14 ngày. Quyết định mở rộng V1 ngày 04/10 dựa trên khảo sát
   13 phản hồi và 1 đoạn chat. Đây là phát hiện quan trọng nhất của bản đánh giá này.
2. **Thứ tự làm ưu tiên hạ tầng trước giả thuyết rủi ro nhất.** Identity, pipeline nội dung, admin web, landing, rồi
   thiết kế làm lại UI — đều đi trước vòng học. Về kỹ thuật thì hợp lý (phụ thuộc), về sản phẩm thì giả thuyết "người học
   có quay lại ôn không" được kiểm cuối cùng.
3. **Đầu tư vào phần sẽ làm lại trước khi có người dùng.** Admin UI vừa xong đã ghi "sẽ refactor toàn bộ"; riêng ngày
   15/10 có 20 commit làm lại landing theo hướng B (font, hero, motion, design tokens) và đã có nhánh `feat/ui-b-admin` cho
   admin, trong khi vòng học chưa bắt đầu. Bước 0 viết hai lần (Drizzle rồi Prisma — có lý do chính đáng, nhưng vẫn là làm
   lại).
4. **Tỉ lệ tài liệu/code rất cao cho giai đoạn chưa có người dùng.** Khoảng 25.300 dòng markdown, 30.600 dòng code nguồn,
   21.600 dòng test (đếm thô, xem mục 7). Tài liệu tốt cho AI làm việc, nhưng cũng là thứ phải đọc và giữ đồng bộ.
5. **Nhiều luật trong spec là phỏng đoán của AI.** Spec có 258 nhãn `ASSUMPTION`. Demo ngày 15/10 cho thấy một ví dụ: luật
   "ôn sai thì về đâu" (N8) do AI đặt, chủ dự án chưa từng chốt, và khi tự nghĩ thì chủ dự án thấy ngay điểm luật đó bỏ sót
   (nhầm khác quên).

### Nhận định

Thời AI, viết code gần như miễn phí; thứ đắt là **thời gian tới phản hồi thật của người dùng** và **phán đoán**. Workflow
hiện tại chi tiêu cẩn thận cho thứ rẻ (chất lượng code, test, tài liệu) và chi tiêu lỏng cho thứ đắt (kiểm chứng nhu cầu).
Đây không phải lỗi kỹ năng — quy trình kỹ thuật cho thấy năng lực thật — mà là lệch trọng tâm.

## 4. Độ khả thi

| Mặt | Đánh giá | Lý do |
|---|---|---|
| Kỹ thuật | **Cao** | Nền đã chạy; các phần còn lại (lịch ôn, flashcard, bài điền từ) không có rủi ro kỹ thuật lớn |
| Nhu cầu | **Chưa rõ, tín hiệu yếu** | 8/12 nói "khó duy trì học đều" nhưng nguyên nhân chưa rõ; 5/6 câu mở nói AI phổ thông đã đủ; chưa có dữ liệu sẵn sàng trả tiền; mẫu nhỏ, chủ yếu sinh viên |
| Nội dung | **Rủi ro cao, ít được nhắc** | Pilot cần 300–500 từ có nghĩa Việt, định nghĩa, ví dụ, chủ đề; hiện có 4. AI soạn nháp trong app đã bỏ khỏi V1 (F26) |
| Giữ chân | **Rủi ro cao** | Nỗi đau số 1 là khó duy trì, nhưng V1 không có nhắc học (K25): lịch ôn chỉ có tác dụng khi người học tự nhớ mở app. Nếu pilot cho tỉ lệ quay lại thấp, sẽ khó biết do sản phẩm hay do thiếu nhắc |
| Cạnh tranh | **Trung bình** | ChatGPT/Gemini miễn phí làm được quiz, giải thích; Anki/Quizlet làm được lịch ôn. Điểm khác biệt hợp lý: lưu từ gặp thật + câu ngữ cảnh của chính mình → bài điền từ (K19, K23). Nhưng phần tra từ nhanh và đúng (K20, nhà cung cấp từ điển) chưa chọn, mà phản hồi định tính nói tra chậm/sai là "mất khách" |
| Nguồn lực | **Trung bình** | Một người, 4–6 giờ/ngày; V1 có 7 module, web + Flutter + AI + gói dịch vụ. AI làm code nhanh, nhưng tuyển và chăm pilot, soạn nội dung không nhanh lên nhờ AI |

**Trả lời thẳng "app có work không":** cơ chế (gom từ của chính mình → ôn đúng lúc → luyện bằng câu của mình) là một giả
thuyết có lý, không phải ý tưởng tồi. Nhưng hiện chưa có bằng chứng nào từ hành vi người dùng, và hai rủi ro lớn nhất
(nội dung, giữ chân) chưa có phương án. Cách duy nhất để biết là đưa vòng học tới tay người thật càng sớm càng tốt.

## 5. Đề xuất và các quyết định cần chủ dự án

### Q-A. Đi tiếp theo thứ tự nào

| Phương án | Trade-off |
|---|---|
| A. Làm Bước 3 đầy đủ như kế hoạch → Deploy → pilot | Đúng kế hoạch đã chốt; nhưng Bước 3 gồm cả chuỗi tra từ (nhà cung cấp chưa chọn), câu ngữ cảnh, từ riêng tư — người dùng đầu tiên còn xa |
| **B. (đề xuất) Lát mỏng:** Bước 3 tối thiểu (nhóm từ, thêm từ có sẵn trong catalog, flashcard, danh sách "hôm nay") + Deploy + 300 từ nội dung → pilot 5–10 người; tạm dừng làm lại UI | Phải cắt phạm vi Bước 3 và chấp nhận UI thô; đổi lại có dữ liệu hành vi thật sớm nhất, và dữ liệu đó quyết định phần còn lại có đáng làm không |
| C. Thử không cần code: 5–8 người dùng Anki/Quizlet + quy trình tay 7–14 ngày | Rẻ và nhanh nhất; nhưng không kiểm được trải nghiệm của chính app, và hạ tầng đã có nên lợi thế của C giảm |

### Q-B. Ai soạn nội dung pilot

| Phương án | Trade-off |
|---|---|
| Tự soạn tay 300–500 từ | Chất lượng kiểm soát được; tốn khoảng 15–40 giờ (`ASSUMPTION`: 3–5 phút/từ, chưa đo) |
| **(đề xuất) AI soạn nháp ngoài app** (ChatGPT/Claude ra file CSV đúng cột import) → chủ dự án duyệt → import bằng luồng CSV đã có | Nhanh hơn nhiều, không cần code mới (F26 chỉ bỏ AI soạn *trong app*); vẫn phải duyệt kỹ vì AI có thể sai nghĩa |

### Q-C. Nhắc học trong pilot (K25)

Giữ "không nhắc" thì phải ghi trước: nếu tỉ lệ quay lại thấp, kết luận là gì. Phương án rẻ nhất để tách hai nguyên nhân:
nhắc tay (tin nhắn nhóm) cho pilot, không cần code. Cần chủ dự án chốt trước khi pilot.

### Q-D. Ngưỡng thành công của pilot

`DECISIONS_2026-10-04.md` mục 8 đã có chỉ số đo (từ thêm mỗi tuần, tỉ lệ ôn trong 48 giờ, quay lại sau 7 và 14 ngày) nhưng
chưa có ngưỡng. Nên chốt ngưỡng **trước** pilot, để không đọc kết quả theo ý muốn.

### Điều chỉnh workflow

- **Giữ:** design, decision record, TDD, CI, chạy thử thật — cho phần lõi (lịch ôn, dữ liệu người học, tiền/AI).
- **Làm nhẹ:** phần thăm dò trước pilot (UI, admin) dùng chế độ spike (làm nhanh để thử, ít test, không làm lại cho đẹp).
- **Thêm:** trước mỗi Bước, hỏi "Bước này cần hoặc tạo ra bằng chứng gì từ người dùng?". Nếu câu trả lời là "không", cân
  nhắc dời Bước đó ra sau pilot.

## 6. Chưa kiểm được

- Có thể đã có phỏng vấn hoặc trao đổi ngoài repo mà không ghi lại; bản đánh giá chỉ dựa trên những gì có trong repo.
- Số người đăng ký waitlist trên landing (D1 trên Cloudflare) — không truy cập được từ máy này. Đây là tín hiệu nhu cầu nên xem.
- Số dòng code/tài liệu là đếm thô (lọc file theo tên), sai số vài phần trăm.
- Thời gian soạn nội dung là ước tính, chưa đo.
- Không có dữ liệu người dùng nào về vòng học, nên mọi nhận định về "work với người dùng" là suy luận, không phải đo đạc.

## 7. Nguồn bằng chứng

- Git (chạy 15/10/2026, mọi nhánh): `git log --all` → 213 commit từ 06/10 đến 15/10; theo loại: feat 91, docs 44, fix 29,
  test 26, ci 8; 19 PR merge; 2 revert; 73 commit ngày 15/10, trong đó 20 commit scope `web`/`tokens`/`ui-b` (làm lại
  landing hướng B).
- Dòng: `git ls-files` + `wc -l` — markdown ~25.285; `.ts/.tsx/.prisma/.sql` trong `apps/` trừ generated và test ~30.559;
  test ~21.550.
- `grep -o ASSUMPTION docs/specs/*.md | wc -l` → 258.
- Khảo sát: `docs/preparation/SURVEY_ANALYSIS_2026-09-30.md`; phản hồi định tính: `QUALITATIVE_FEEDBACK_2026-09-30.md`;
  đối thủ: `COMPETITOR_ANALYSIS_AI_ENGLISH_APPS_2026-09-30.md`.
- Phỏng vấn: `grep -rl "phỏng vấn" docs` chỉ ra các file kế hoạch/discovery (đối chứng: file khảo sát có xuất hiện), không có
  file nào ghi kết quả phỏng vấn sau 30/09.
- Nội dung: `docs/deliveries/buoc-2-5-test-flow.md` bước 7–11 — import CEFR-J 7.799 entry, `senses_created 0`; 4 từ tự soạn.
- Quyết định: `docs/specs/DECISIONS_2026-10-04.md` (K19–K25, mục 8), `docs/preparation/PROJECT_CONTEXT.md` (nguồn lực, pilot
  10–30 người, gói 300–500 từ).
- Decision record: `docs/superpowers/decisions/*.md` (đếm cột "ai chốt").
