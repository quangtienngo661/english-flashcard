# Improvement plan tổng hợp (ghi 28/10/2026, trừ Bước 8)

**Chú thích trạng thái:** ✅ đã xong (có PR hoặc commit đã merge vào `dev`, ghi ngay trong dòng) · 🟡 làm một phần (ghi phần đã xong và phần còn lại) · ⬜ chưa làm. **Cập nhật trạng thái:** 28/10/2026, sau khi [#164](https://github.com/quangtienngo661/english-flashcard/pull/164) merge vào `dev` (commit `b44f372`); đã đối chiếu từng PR #158–#164 và `git log origin/dev`. Các dòng §1 (đợt giao diện admin), A2, A5, B1 và B8 cập nhật tiếp sau [#169](https://github.com/quangtienngo661/english-flashcard/pull/169) (commit `01d66dc`); các dòng khác giữ theo mốc #164.

Bản hệ thống hóa mọi việc còn lại và mọi hướng cải thiện của dự án, gom từ các tài liệu đã có và từ tiến độ đến 28/10/2026. **Chưa có quyết định mới nào
trong file này**: mục nào là "đề xuất" thì chủ dự án chưa chốt. Bản này thay vai trò tổng quan của [`IMPROVEMENT_IDEAS_2026-10-23.md`](IMPROVEMENT_IDEAS_2026-10-23.md)
(giữ nguyên làm nguồn chi tiết cho C1–C17).

**Không nằm trong bản này:** Bước 8 (đăng nhập Google, xóa tài khoản). Nó vẫn nằm trong thứ tự xây cố định, trước Deploy (§9).

**Đọc nhanh cho người chưa biết dự án.** Wordmet là app học từ vựng tiếng Anh (web `apps/web`, admin `apps/admin`, API `apps/api`, chưa có app điện thoại).
Admin là nơi `admin` và `editor` soạn nội dung, quản lý AI, người học, gói. "Chủ dự án" là người duyệt mọi quyết định. "Nhóm A / nhóm B" là hai nhóm trong
đợt cải thiện 26/10/2026: A là giao diện người học (đã làm), B là chất lượng AI (chưa làm).

## 1. Hiện trạng (28/10/2026, đã kiểm trên GitHub và code)

| Phần | Trạng thái |
|---|---|
| Backend Bước 0–7 (+ đợt sửa Bước 0–3) | Xong, đã merge vào `dev`. Chỉ có API cho Bước 4–7 |
| Web người học (`/vi/app`, `/en/app`) | Xong cho Bước 3–7 (M1–M5b) |
| 🟡 Đợt cải thiện nhóm A | Code đã merge: C13 (#137), C14 (#135), C2 + C3 + C15 chữ + C16 (#134), C1 nút loa (#136). Sửa lỗi "Xem đáp án" (PR 3 của plan): [#133](https://github.com/quangtienngo661/english-flashcard/pull/133). Link "Gõ nhầm email" ở màn xác nhận email đã bỏ ([#158](https://github.com/quangtienngo661/english-flashcard/pull/158), 28/10). **Chưa đóng đợt** (§3, A4) |
| 🟡 Đợt giao diện admin | M0, 9 task API, M1a, M2, M3, M4, M5 đã merge (#144–#156); **M1b đã merge** ([#161](https://github.com/quangtienngo661/english-flashcard/pull/161), 28/10: Bộ ví dụ, Chi phí, Các lần gọi). Thêm tạo/sửa người dùng (#157, AD18). Dashboard AI cho `admin` và `editor`, quyền mới `ai.view`, 6 phần ([#163](https://github.com/quangtienngo661/english-flashcard/pull/163)), chữ viết lại ([#164](https://github.com/quangtienngo661/english-flashcard/pull/164)), 28/10. Sửa lượt `ai.test` bị trừ khi chạy bị từ chối ([#162](https://github.com/quangtienngo661/english-flashcard/pull/162)). Nhập ví dụ hàng loạt ([#165](https://github.com/quangtienngo661/english-flashcard/pull/165)); sửa và xóa ở các trang trước chỉ tạo và đọc ([#169](https://github.com/quangtienngo661/english-flashcard/pull/169)). **Task 43 đóng ở PR docs đang mở** (§3, A2) |
| ✅ Docker | `pnpm bootstrap` chạy cả stack từ root ([#159](https://github.com/quangtienngo661/english-flashcard/pull/159), 28/10). Chạy thử thành công bằng `.env` thật, 6 container healthy |
| ✅ AI thật (lần gọi đầu) | **Lần gọi thật đầu tiên 28/10/2026:** `claude-haiku-5-5` (Anthropic) cho cả 6 thao tác, thử `lookup_word` với `rhythm`, kết quả đúng; 3 lời gọi, 0 lỗi, khoảng 0,00044 USD. OpenAI chưa thử. *Căn cứ: số liệu do chủ dự án ghi ở bản [#160](https://github.com/quangtienngo661/english-flashcard/pull/160); trong repo chưa có file as-built riêng cho lần gọi này. Có dấu vết gián tiếp: mô tả [#163](https://github.com/quangtienngo661/english-flashcard/pull/163) ghi chạy thật trên DB `english_learning` thấy 14 lời gọi, 82 ₫.* |
| Eval hiện có (Bước 6, D18) | Soạn ví dụ, bấm chạy, worker gọi AI thật từng ví dụ. Máy chỉ kiểm khuôn JSON, thời gian, chi phí. **Không có đáp án mong đợi, ngưỡng, judge** |
| Chưa có | Bước 8, app Flutter, deploy, cổng thanh toán thật, SDK quảng cáo, nhóm B của AI, người học thật |

## 2. Nguyên tắc xếp thứ tự (đề xuất)

1. **Đo trước khi mở rộng** (C10): chất lượng câu AI và độ giữ chân đều chưa biết; mọi thứ AI phía sau dựa vào số đo này.
2. **Việc rẻ, không tốn AI, tăng giá trị hằng ngày đi trước.** Nhóm A đã làm phần lớn.
3. **Phân phối quyết định thành bại, không phải thêm tính năng** (đánh giá ở `IMPROVEMENT_IDEAS` §1.4): chọn và thử một kênh trước khi launch.
4. **Việc cần quyết định sản phẩm hoặc chi phí thì hỏi chủ dự án trước** (C4, C5 và các mục ở §8).

## 3. Nhóm 1 — Hoàn tất đợt hiện tại

| # | Việc | Trạng thái và chi tiết |
|---|---|---|
| ✅ A1 | **M1b: Bộ ví dụ, Chi phí, Các lần gọi (admin)** | **Đã merge vào `dev` 28/10/2026** ([#161](https://github.com/quangtienngo661/english-flashcard/pull/161)), gồm Task 20: e2e chạy thật 26/26 với model giả, test flow, as-built ở `docs/deliveries/giao-dien-admin.md`. Còn chưa kiểm (as-built ghi rõ): bước gọi AI thật trong test flow M1b. Đã thêm ngoài design theo quyết định của chủ dự án (AD16): bảng kết quả từng ví dụ (đầu vào, trạng thái, lý do, đầu ra) |
| ✅ A2 | **Task 43, chốt đợt admin** | **Đã làm, PR docs đang mở** (nhánh `docs/admin-round-close-out`, chưa có số PR; phần kiểm của Task 43 đã nằm trong as-built M5). `CLAUDE.md`: bỏ ghi chú "admin UI provisional" và dòng B25E30, bỏ các câu "Sắp có" về admin, thêm mục "Đợt giao diện admin" và một dòng trỏ `pnpm bootstrap`; `docs/deliveries/buoc-2-5.md`; bản chữ `ban-chu-giao-dien.md` §8 (bỏ nhãn A/74, sửa luật mã A/75b, thêm mục 8.10 các câu lỗi mới); as-built toàn đợt ở cuối `docs/deliveries/giao-dien-admin.md`. **Chưa làm:** thêm "Giao dịch" vào thanh bên Figma page 04 (design §9: vẽ bù, không chặn code); memory `project_admin_ui_refactor.md` nằm ngoài repo |
| ✅ A3 | **As-built của M3 còn thiếu** | **Đã có** ở mục "Sau khi viết mục này" của M3 trong `docs/deliveries/giao-dien-admin.md` (thêm bằng commit `232f934`, 27/10/2026): helper đăng nhập của test thật chờ hết giới hạn 429 (commit `2b40fd5`). Mô tả cũ ở đây đã lỗi thời |
| ⬜ A4 | **Đóng đợt nhóm A** | `docs/deliveries/dot-cai-thien-a.md` mới có plan tóm tắt. Còn: chạy smoke trên `dev`, viết as-built, cập nhật `CLAUDE.md` và danh sách cải thiện (Task 20 của plan nhóm A) |
| 🟡 A5 | **`CLAUDE.md` lỗi thời** | **Phần lớn đã sửa trong PR docs đang mở** (cùng PR với A2): admin không còn "Sắp có", đã có dòng trỏ `pnpm bootstrap`, mục Next ghi UI người học và admin đã xong (Bước 8 vẫn là bước kế tiếp trong thứ tự xây). Về thay đổi chưa commit của chủ dự án: lúc sửa (28/10/2026) `CLAUDE.md` ở checkout chính giống hệt bản trên `dev` (đã so bằng `diff`). **Còn lại:** hai câu "chưa gọi AI thật" ở mục Bước 6 và Bước 7 mới được gắn mốc ngày (20/10, 21/10), chưa sửa nội dung, vì trong repo chưa có file as-built của lần gọi thật đầu tiên (xem §1) |
| 🟡 A6 | **Điểm nhỏ của admin (đã ghi, chưa làm)** | Ô tìm kiếm ở màn Người dùng chưa chặn ký tự NUL trong URL; khóa tài khoản bị giới hạn tốc độ chỉ hiện câu chung, chưa có đồng hồ đếm ngược; ô ngày hiện `mm/dd/yyyy` theo trình duyệt. **Đã xong:** màn Dashboard không còn "Sắp có", đã thay bằng dashboard AI ([#163](https://github.com/quangtienngo661/english-flashcard/pull/163), [#164](https://github.com/quangtienngo661/english-flashcard/pull/164), 28/10). Ba điểm đầu chưa thấy PR nào làm |
| ⬜ A7 | **Docker, việc phụ** | Chưa kiểm: đường tạo `.env` mới từ `.env.example`; xem các trang bằng mắt trong trình duyệt; lệnh `pnpm bootstrap` báo lỗi thoát dù container đã lên (chưa rõ nguyên nhân). `apps/api/.env` cũ thiếu `TERMS_VERSION` (compose đã có giá trị dự phòng). Form waitlist của landing cần Cloudflare D1, không chạy dưới `next start` |
| ✅ A8 | **Checkout chính tụt xa** | **Đã xong 28/10/2026:** `dev` cục bộ đã fast-forward lên `origin/dev` (`b44f372`). 94 file chưa theo dõi giống hệt bản trên `dev` đã xóa, 7 file khác bản trên `dev` dời sang `.sync-backup-2026-10-28/` (cần đối chiếu, nhất là `metrics.jsonl`); 3 file bạn đang sửa giữ nguyên |

## 4. Nhóm 2 — Chất lượng AI (nhóm B; C10, C11, C12)

**Trạng thái:** có tài liệu nghiên cứu ([`AI_EVAL_DASHBOARD_2026-10-24.md`](AI_EVAL_DASHBOARD_2026-10-24.md), [`AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md`](AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md))
và câu trả lời ở [`2026-10-26-dot-cai-thien-questions.md`](../superpowers/reviews/2026-10-26-dot-cai-thien-questions.md); **chưa có design hay plan, chưa có code
cho judge hay grader.** Theo kế hoạch, design nhóm B viết sau lần gọi AI thật đầu tiên, và lần đó đã xong (28/10). Chủ dự án muốn test prompt, eval và judge ngay trong admin.

Thứ tự phụ thuộc (đề xuất, từ file câu hỏi): E1 gọi thật → E2 golden set → E3 chấm bằng luật → judge + bộ nhãn người → so lần chạy và cảnh báo → vòng đời prompt
tối thiểu → dashboard → màn admin.

| # | Hạng mục | Nội dung |
|---|---|---|
| ⬜ B1 | **E1 — Đo nền** | Soạn 10–20 ví dụ cho mỗi thao tác (6 thao tác: `generate_cloze`, `lookup_word`, `translate_sentence`, `generate_meaning_question`, `generate_sentence_mcq`, `check_private_word`), chạy với 1–2 model (đề xuất một model rẻ và một mạnh hơn, hai nhà cung cấp), đọc tay đầu ra, ghi **danh sách lỗi** (error analysis). Ngân sách đề xuất khoảng 10 USD, đặt trần lời gọi trong ngày chạy. Dùng Bộ ví dụ của M1b (màn đã merge, [#161](https://github.com/quangtienngo661/english-flashcard/pull/161); chưa có bộ ví dụ hay danh sách lỗi nào trong repo; nhập ví dụ hàng loạt: [#165](https://github.com/quangtienngo661/english-flashcard/pull/165), đã merge 28/10/2026, trần 1000 ví dụ mỗi thao tác). Không cần sửa code |
| ⬜ B2 | **E2 — Golden set** | Thêm trường `expected` (JSON) cạnh `input`. Máy kiểm được: lemma và từ loại (`lookup_word`); đáp án bằng từ mục tiêu, đúng một chỗ trống (`generate_cloze`); đúng một phương án đúng, nhiễu khác nhau (`generate_sentence_mcq`); `verdict` khớp nhãn (`check_private_word`); đáp án trỏ đúng nghĩa (`generate_meaning_question`). Cần người hoặc judge chấm: tự nhiên, đúng level CEFR, nghĩa tiếng Việt, ngữ cảnh chỉ ra một đáp án. Tách `split` = `dev` / `heldout` (held-out chỉ hiện số tổng, bị mở ra xem thì chuyển sang dev) và `version` cho cả bộ, để biết hai lần chạy có so được không. Golden set cố định trong một lần so sánh, lớn dần theo phiên bản |
| ⬜ B3 | **Nguồn bổ sung cho golden set (E6)** | Câu bị người học báo lỗi và đã được nhân viên xác nhận, câu bị luật loại, dạng chia lạ (`practice_unknown_forms`) → nút "đưa vào bộ ví dụ" kèm tiêu chí. **Ngoại lệ riêng tư:** câu về từ riêng của người học không được tự chép sang (design Bước 7 §20, D26) |
| ⬜ B4 | **E3 — Grader ba tầng** | (1) Luật: dùng lại luật Practice đang loại câu AI (`ai-question-generator.service.ts`) cộng tiêu chí máy kiểm ở B2; cho ra "tỉ lệ bị luật loại" ngay trong eval. (2) Judge: model **khác** model sinh câu, khác nhà cung cấp, chấm thang cố định (vd. 1–5 cho tự nhiên, đúng level, chỉ một đáp án). (3) Người: màn đọc nhanh, gắn nhãn đạt/không đạt + lý do |
| ⬜ B5 | **Judge như một thao tác AI** | Mỗi judge là một thao tác qua cùng gateway Bước 6 (vd. `judge_single_answer`, `judge_natural`): model riêng, prompt riêng, sổ chi phí riêng, có thể thêm `purpose = judge`. Bộ nhãn người (bảng mới, vd. `ai_judge_labels`) + một lần "chạy hiệu chỉnh" tính tỉ lệ cho qua đúng và bắt đúng lỗi. Cổng của prompt judge là độ khớp với nhãn người. Judge ăn vào trần lời gọi mỗi ngày (hiện 3000, theo `GET /v1/admin/ai/status`) |
| ⬜ B6 | **E4 — So sánh lần chạy và cổng hồi quy** | Màn so hai lần chạy cùng bộ ví dụ (model A và B, prompt rev 3 và 4): tỉ lệ đạt từng tiêu chí, chi phí, thời gian, danh sách ví dụ đổi kết quả. Đề xuất: **cảnh báo, không chặn**, khi một tiêu chí giảm quá 5 điểm % (`ASSUMPTION`) hoặc có ví dụ trước đạt nay trượt; áp dụng cả khi đổi model. Publish prompt mới **bắt buộc có ít nhất một lần eval** của chính bản đó. Đổi D18 Bước 6 ("không chặn gì, eval không bắt buộc") |
| ⬜ B7 | **C12 — Vòng đời prompt** | Bản nháp tách khỏi bản đang chạy → chạy eval (dev, held-out) → publish → rollback một cú bấm. Hiện lưu prompt là có hiệu lực ngay, quay lại phải gõ lại chữ cũ (D15 Bước 6). Đổi D15 |
| 🟡 B8 | **C11 — Dashboard AI** | Trả lời 5 câu hỏi: AI có chạy không, câu có tốt không, người học có bị ảnh hưởng không, tốn bao nhiêu, hạn mức có hợp lý không. Đợt đầu đề xuất phần sức khỏe, chi phí và tỉ lệ bị luật loại. Cần quyết định dữ liệu còn thiếu trước khi vẽ (§3.3 của tài liệu nguồn). **Đã làm (28/10/2026):** đợt đầu trong `apps/admin` cho `admin` và `editor` (quyền `ai.view`), 6 phần (5 câu hỏi cộng "Hôm nay"), chọn 7/30/90 ngày, không ngưỡng, không cảnh báo email ([#163](https://github.com/quangtienngo661/english-flashcard/pull/163), chữ ở [#164](https://github.com/quangtienngo661/english-flashcard/pull/164)). **Còn lại:** tỉ lệ bị luật loại lần đầu (chỉ có trong log, xem B11; dashboard mới hiện lần bị loại cả hai lần), "người Pro dùng bao nhiêu % lượt" (cần tính theo từng người và chu kỳ), và số ngày chạm trần đang so với trần hiện tại vì trần cũ không được lưu. **Hai số đầu (tỉ lệ bị luật loại lần đầu; người Pro dùng bao nhiêu % lượt) đang được làm ở một PR khác (28/10/2026).** |
| 🟡 B9 | **Màn admin cho tất cả phần trên (E5)** | Soạn ví dụ, chạy, xem từng ví dụ, so lần chạy, chấm tay, publish/rollback prompt, dashboard. Theo AD16, nền của phần này (bảng kết quả từng ví dụ) đã có ở M1b. **Đã có:** soạn ví dụ, chạy, xem từng ví dụ ([#161](https://github.com/quangtienngo661/english-flashcard/pull/161)) và dashboard ([#163](https://github.com/quangtienngo661/english-flashcard/pull/163)). **Còn lại:** so lần chạy, chấm tay, publish/rollback prompt |
| ⬜ B10 | **Để sau launch** | Canary (một phần người học dùng prompt mới), online eval (chấm mẫu câu đã phục vụ), judge trong `prepare`, cảnh báo qua email. Lý do: cần người học thật mới có ý nghĩa |
| ⬜ B11 | **C10 — phần đo còn lại** | Tỉ lệ câu AI bị luật loại lần đầu (hiện chỉ có trong log), giữ chân D7/D30 (cần telemetry) |

**Rủi ro của nhóm này:** tốn tiền thật khi chạy eval và judge; judge tự ưu ái model cùng nhà (nên tách nhà cung cấp); judge chưa hiệu chỉnh thì điểm của nó chưa đủ tin để chặn;
người chấm tiếng Việt tự nhiên chỉ có chủ dự án (ước 1–2 giờ cho lần đọc đầu); cả 6 thao tác đang dùng model thật nên người học bấm AI cũng tốn tiền (rủi ro thấp: tối đa khoảng 0,45 USD mỗi ngày với giá hiện tại và trần 3000 lời gọi).

## 5. Nhóm 3 — Sản phẩm người học

| # | Hạng mục | Vì sao | Chi phí và quyết định cần chốt |
|---|---|---|---|
| ⬜ C4 | **Gói Free nếm câu AI** (vd. 3 câu AI mỗi ngày) | Người dùng cần thấy điểm khác biệt trước khi trả tiền | Đổi F31 (Free không có AI); kho lượt theo ngày (sổ lượt Bước 5 có kiểu kho này); giữ trần `ai_daily_cap`. Cần chốt: bao nhiêu lượt, kho riêng hay chung với Dùng thử. **Dời lại, chưa quyết** |
| ⬜ C5 | **Bài "Đặt câu với từ này", AI chấm và nhận xét ngắn** | Tự viết câu nhớ lâu hơn nhận diện | Đổi quyết định 02/10/2026 (tạm bỏ góp ý câu); tốn AI nên dành cho Pro; một thao tác AI mới, luật chấm, báo lỗi. Cần chốt tiêu chí chấm và cách khiếu nại. **Dời lại ("brainstorm sau")** |
| ⬜ C6 | **Động lực nhẹ**: chuỗi ngày, mục tiêu tuần, "đã thuộc N từ", email tóm tắt tuần | Giữ người dùng quay lại, khảo sát ghi người học "khó duy trì" | Nhỏ; số liệu có sẵn trong `learning_log`; email dùng hạ tầng nhắc học Bước 3. Không vào đợt A |
| ⬜ C7 | **Bắt đầu theo mục tiêu**: bài kiểm tra trình độ 2 phút, gợi ý bộ từ theo mục tiêu (IELTS, TOEIC, đi làm) | Tránh màn trống, có giá trị ngay ngày đầu | Dùng kho từ có sẵn; cần soạn vài "lộ trình" (bộ lọc trình độ + chủ đề). Cũng là một kênh phân phối (nội dung theo kỳ thi) |
| ⬜ C15 | **Dòng chữ còn lại ở Tùy chỉnh phiên** | Chủ dự án chưa hiểu "Bấm Cần ôn lại lâu nhất trước" (`priority_oldest`) | Chỉ bản chữ, cả thẻ "Đang ưu tiên". Chủ dự án "xử lý sau". (Phần bỏ chữ "trước" ở các dòng thứ tự đã xong ở [#134](https://github.com/quangtienngo661/english-flashcard/pull/134).) |
| ⬜ C8 | **PWA cài được + nút chia sẻ để thêm từ** trên điện thoại, trước Flutter | Thêm từ ngay lúc đọc trên điện thoại | Manifest, service worker, Web Share Target; không đổi API; kiểm với CSP và OpenNext (D20, D21) |
| ⬜ C9 | **Lớp học tối giản cho giáo viên** (mã lớp, bộ từ chia sẻ, bảng "từ cả lớp hay sai") | Mở kênh B2B2C | Lớn: module mới, quyền mới, quyền riêng tư học sinh (dưới 13 tuổi thì sao). **Sau V1** |
| C17 | `baseURL` của AI adapter lấy từ biến môi trường | — | **Archived:** địa chỉ viết cứng có chủ ý, vì shell của Claude Code trên máy này đặt `ANTHROPIC_BASE_URL`; đọc biến đó sẽ gửi khóa thật tới địa chỉ khác (cùng nhóm D29). Đổi là đổi plan review #6 |

## 6. Nhóm 4 — Đưa ra người dùng

Theo quyết định của chủ dự án (D3 vòng 3 Bước 3), deploy làm **khi app hoàn chỉnh, trước launch**; cho đến lúc đó `/app/*` trên production vẫn bị chặn.

| # | Hạng mục | Chi tiết |
|---|---|---|
| ⬜ D1 | **Deploy API + admin** | Hosting, Postgres và Redis chạy lâu dài, SMTP thật, quản lý secrets, backup (design 2.5 §14). Danh sách việc cụ thể: [`docs/deliveries/deploy-checklist.md`](../deliveries/deploy-checklist.md): `TRUST_PROXY` đúng với proxy thật; gom IPv6 theo dải; `DATABASE_POOL_MAX` theo DB thật; `TERMS_VERSION` thật; chạy `pnpm db:normalize-timezones` một lần; luật sư xem mốc 13 tuổi; chạy `pnpm test:scale` trên máy giống bản deploy; security header cho admin tĩnh và API; kích thước Worker của `apps/web` so với gói Free Cloudflare; kiểm CSP ngay sau lần đầu lên `main`; `NEXT_PUBLIC_API_BASE_URL` với host `api.` ở production; dọn tài khoản chưa xác nhận email sau N ngày |
| ⬜ D2 | **Thanh toán thật** | Hiện chỉ có provider giả; cổng thanh toán trung lập, chỉ gói tự gia hạn (D35). Cần chọn provider thật |
| ⬜ D3 | **Quảng cáo** | API đã trả cài đặt quảng cáo, chưa gắn SDK nào |
| ⬜ D4 | **App điện thoại (Flutter)** | Chưa bắt đầu. Làm C8 (PWA) trước nếu cần có đường thêm từ trên điện thoại sớm. Hướng nâng cấp của C1: file âm thanh UK/US làm sẵn trên máy chủ để mọi nền tảng nghe cùng một giọng (tốn tiền tạo và lưu cho khoảng 8.812 từ × 2, cần xem giấy phép nguồn) |
| ⬜ D5 | **Người học thật và kênh phân phối** | Đề xuất P1: trước deploy, cho 5–10 người học thật dùng bản hiện tại; thử một kênh (giáo viên, nhóm luyện thi, cộng đồng tự học). Chốt "bản cắt cho launch" (P4): danh sách phải có / để sau V1 |
| ⬜ D6 | **Pháp lý** | Luật sư xem lại mốc 13 tuổi không hỏi cha mẹ và trang Điều khoản ghi "dưới 16 tuổi cần cha mẹ đồng ý"; chính sách bảo mật nhắc Cloudflare Web Analytics |

## 7. Nhóm 5 — Cách làm và tài liệu (đánh giá 23/10/2026, đề xuất)

- **P2:** giữ một cơ chế hiểu biết nhẹ: mỗi milestone chủ dự án tự đọc và giải thích lại một luồng, hoặc tự sửa một lỗi nhỏ không nhờ AI (khoảng 30 phút).
- **P3:** quy trình theo mức rủi ro: tiền, dữ liệu, bảo mật giữ đủ; giao diện và nội dung nhẹ hơn.
- **P5:** dọn tài liệu định kỳ: `CLAUDE.md` chỉ giữ trạng thái hiện tại và con trỏ; chi tiết sang `docs/deliveries/`.
- Quan sát: phạm vi chỉ tăng, chưa có mốc "đủ để cho người khác dùng thử" (xem D5).

## 8. Quyết định đang chờ chủ dự án

| # | Câu hỏi | Đề xuất của Claude (chưa chốt) |
|---|---|---|
| Q1 | Khi điểm eval giảm: **chặn** hay chỉ **cảnh báo**? (đổi D18) | Cảnh báo, ngưỡng tạm 5 điểm %, vì judge chưa hiệu chỉnh |
| Q2 | Publish prompt có **bắt buộc** một lần eval? | Có, kèm kết quả cạnh nút Publish |
| Q3 | Judge dùng model nào, nhà cung cấp nào, trần chi phí bao nhiêu? | Khác nhà cung cấp với model sinh câu; một model rẻ và một mạnh để so |
| Q4 | C4: bao nhiêu lượt AI mỗi ngày cho Free, kho riêng hay chung? | Chưa đề xuất; cần số liệu chi phí từ B1 |
| Q5 | C5: tiêu chí chấm "Đặt câu" và cách khiếu nại? | Brainstorm sau B1 |
| Q6 | Bản chạy Docker dùng DB nào: `english_learning` (DB chính) hay DB test? | Đang dùng DB test `english_learning_admin_preview`; chuyển DB chính khi sẵn sàng (migration sẽ chạy lên DB đó) |
| Q7 | Thử OpenAI không, hay chỉ Anthropic? | Thử cả hai ở B1 để so |
| Q8 | Kênh phân phối thử đầu tiên? | Chọn một trước deploy |
| Q9 | Bật "Allow auto-merge" trong cài đặt GitHub (kèm yêu cầu check CI xanh)? | Chỉ bật cùng branch protection, vì repo chưa có protection nên auto-merge có thể merge không chờ CI |

## 9. Thứ tự đề xuất

1. **Ngay (đóng việc đang dở):** đóng đợt nhóm A (A4). *Đã xong, bỏ khỏi danh sách: Task 43 và `CLAUDE.md` (A2, A5; PR docs đang mở), checkout chính (A8, 28/10), M1b (A1, [#161](https://github.com/quangtienngo661/english-flashcard/pull/161)), as-built M3 (A3), dashboard AI đợt đầu (B8 một phần, [#163](https://github.com/quangtienngo661/english-flashcard/pull/163), [#164](https://github.com/quangtienngo661/english-flashcard/pull/164)).*
2. **Đo nền AI:** (lần gọi thật đầu tiên đã xong 28/10) chạy Bộ ví dụ thật (B1; màn đã có, dashboard AI đã có để theo dõi chi phí và lỗi), đọc kết quả, ghi danh sách lỗi → từ đó chốt Q1–Q3, Q7 → brainstorm design nhóm B (golden set, judge, vòng đời prompt, phần còn lại của dashboard, màn admin) rồi mới làm B2–B9.
3. **Trước khi tìm người dùng thật:** B11 (đo), C6, C7; C4 và C5 sau khi có số đo chi phí; D5 (5–10 người học thật).
4. **Bước 8 (ngoài bản này)**, rồi **Deploy** (D1, D2, D3, D6); **C8** trước hoặc cùng lúc với **Flutter** (D4).
5. **Sau V1:** C9, B10.

## 10. Nguồn

[`IMPROVEMENT_IDEAS_2026-10-23.md`](IMPROVEMENT_IDEAS_2026-10-23.md) (C1–C17, P1–P5, nhận định); [`AI_EVAL_DASHBOARD_2026-10-24.md`](AI_EVAL_DASHBOARD_2026-10-24.md) (E1–E6, dashboard);
[`AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md`](AI_PROMPT_LIFECYCLE_AND_JUDGE_2026-10-24.md) (vòng đời prompt, judge);
[`2026-10-26-dot-cai-thien-questions.md`](../superpowers/reviews/2026-10-26-dot-cai-thien-questions.md) (câu trả lời của chủ dự án);
[`2026-10-26-dot-cai-thien-a-design.md`](../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md) (nhóm A);
[`2026-10-27-giao-dien-admin-design.md`](../superpowers/specs/2026-10-27-giao-dien-admin-design.md) §9 và plan `2026-10-27-giao-dien-admin.md` (đợt admin, Task 43);
[`deploy-checklist.md`](../deliveries/deploy-checklist.md); [`docker-bootstrap.md`](../deliveries/docker-bootstrap.md).
Con số ở §1 đo ngày 28/10/2026: PR từ GitHub, trạng thái nhánh M1b từ worktree, chi phí AI từ API `GET /v1/admin/ai/status`.
