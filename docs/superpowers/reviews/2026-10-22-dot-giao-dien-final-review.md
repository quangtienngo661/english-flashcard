# Review cuối của đợt giao diện (22/10/2026)

Người review: một phiên mới, chỉ đọc (model Fable), trên gói `54757a9..3faf49c` (21 commit). Báo cáo giữ nguyên văn bên dưới (tiếng Anh). Cách xử lý từng
điểm: mục "Xử lý" ở cuối file.

## Review: đợt giao diện (UI round), 54757a9..3faf49c

Method: read the diff (21 commits), plan, design, decisions, ledger, copy doc, frame list, coverage check, both scripts; viewed 40 gate screenshots; inspected the Figma file **read-only** (page list, frame census of pages 08/09/04/00, a visible-text search on each page, the reaction graph of the nine frames in the three "Web Bước 7" flows, and an independent run of the stored check script on 6 frames incl. the K/15 control); cross-checked copy against `apps/api` (`settings.definitions.ts`, the Bước 7 migration seed, `reports.service.ts`, `quick-add.controller.ts`, `staff.schemas.ts`, controllers' `@RequirePermission`) and against design Bước 4 D36, Bước 5 D32/D33/D38, Bước 6 §12.1, Bước 7 §5–§9. No file written, nothing changed in git or Figma (two Figma screenshots were downloaded to the scratchpad only).

### Strengths
- **Claims reproduce.** My own run of the stored check script: M/78d 6.27:1 / 0 overflow / 1 yellow; M/41b 4.69; K/70b 6.2; K/52·Dark 5.45; A/74 4.69; control K/15 → `yellowButtonCount 2` as the as-built says. Frame census matches the as-built (page 08: 97 `K/` frames incl. K/00; 09: 96; 04: 55). Every `K/7x–K/8x` has an `M/` twin (33 → 34 with M/78d). Pages 08/09/04 are first, the three "(cũ, không dùng)" pages last; the 4 Dark samples carry an explicit variable mode.
- **Prototype wiring is real**: K/70 →[Bắt đầu 10 câu]→ K/73 →[AFTER_TIMEOUT 1.5 s]→ K/78a →[Nộp]→ K/79a; K/74a →[Thử lại]→ K/73; K/85 → K/86 → K/87 →[Lưu từ]→ K/88, all present as reactions; the as-built correctly says Present mode was not clicked.
- **Copy agrees with the API where it matters**: the 7 seeded report reasons appear in seed order with the one seeded hint "Từ nào khác cũng đúng?"; every range/default in copy §8.2 matches `settings.definitions.ts`; K/87's fields (Từ, Loại từ, Nghĩa, Trình độ, Chủ đề, Dạng chia của, ≤ 2 câu ví dụ) map 1:1 to the quick-add body (`pos, meaning, level, topics, form_of, examples ≤ PRIVATE_EXAMPLES_MAX, ai_suggestion`); admin/editor split in copy §8.0 matches the guards (`settings.manage` on reasons, refunds and all AI screens; `content.edit` on reports and unknown forms; `roles.manage` on users); A/79b matches D32, A/78d matches D38, A/79e matches `grant-not-allowed`.
- **Review Focus 3 and 5 verified on screen**: K/79b has no Báo lỗi button and no Bản dịch; K/81 has the consent tick with the send button dimmed until ticked; A/74 keeps the shared word and masks the other private options; K/71, K/72, K/93, K/01b/K/92, K/44b each exist with the Task 1 copy.
- The as-built states its unverified items plainly (Present mode, K/15, unbound dialog/danger shadows, faint Dark scrim), and the coverage check documents its rubric and the later resolution of each non-"Có" row.

### Issues

#### Critical (must fix)
None.

#### Important (should fix)
1. **The two "Đọc trước" frames and their section names are stale and now mislead the coding session.** Figma `K/00` (261:521) still reads "Đề xuất 20/10/2026 · chưa duyệt", "Khác G1 hiện tại: cần chủ dự án quyết", "1. Bỏ sidebar trái", "Đủ bộ web 21/10/2026: 42 màn…", "Chưa có: bản tối"; `M/00` (294:2339) reads "Đề xuất 21/10/2026 · chưa duyệt", chip "Gói Free", "Luyện tập: Vẫn là màn 'Đang phát triển' như N/61", "Chưa vẽ: màn Luyện tập và phiên luyện đầy đủ …, Gói học khi Pro do đội cấp, bản tối". Sections are still named "0 · Đọc trước (bố cục kết hợp, đề xuất 20–21/10)". These are the first frames on each page; a coder reading them gets the opposite of the current state. `ban-chu-giao-dien.md:733` promised "Task 12 cập nhật" for K/00, M/00 — it did not happen and the as-built does not list it. Fix: rewrite both notes as "bản chính thức, duyệt 22/10", drop the G1/page-05 comparison, and rename section 0.
2. **D17 ("'Lượt' … luôn có chữ đi kèm") is broken by 5 strings per learner page, and the documents claim the check passed.** Visible texts on page 08 and 09: "Lượt mới có vào 15/11." (K/71, K/74b, K/75b, K/85c and the M twins) and "Lượt này không trả lại được" (K/82, M/82). Same in the copy: `ban-chu-giao-dien.md:27, 185, 350, 381, 393, 469, 501`. Yet §11.3 (`:868`) says "'lượt' trên màn người học: mọi chỗ là 'lượt câu AI' hoặc 'lượt tra AI'", and the ledger (`progress.md:35`) records Task 5's "leftover-term search pages 08/09 → 0". Fix the strings ("Lượt câu AI mới có vào 15/11.", "Lượt tra AI mới có vào 15/11.", "Lượt câu AI này không trả lại được") or record an explicit owner exception; correct §11.3.
3. **A/74b depicts a state the API cannot produce.** Frame "A/74b Chi tiết báo lỗi · câu thường về từ riêng (đã che)" shows Từ = "[từ riêng của người học]", "Câu thường · Trắc nghiệm". A non-AI question whose asked word is private cannot be reported: Bước 4 D36 (`2026-10-18-buoc-4-practice-design.md:64, 320`, 409 `report-not-available`) and `reports.service.ts:85–86, 100` ("a non-AI one about a private word … cannot be reported"). The valid masked case for a rule question is a *catalog* target with private-word *distractors* (D36: "câu từ catalog có đáp án nhiễu là từ riêng thì vẫn báo được, bản sao che từ riêng"). A/74b has no entry in the copy (§8.4 covers only A/73, A/73e, A/74), yet `kiem-du-man.md:172` and `dot-giao-dien.md:119` cite it as the Review Focus 3 masked example. Fix: retitle and redraw as "câu thường về từ catalog, lựa chọn nhiễu là từ riêng (đã che)" with the asked word unmasked, and add its row to §8.4.
4. **Review Focus 1 is only half-evidenced.** RF1 says long copy must not push "the main button off-screen". M/78d is 393 × 1164 (M/71 1807, M/72 1785, M/70 1681, M/L54 1231, M/81 1057, M/80 1015, …): on an 852 device [Nộp] sits below the fold. The script cannot see this by design (`figma-checks.js:87–94`: "Nội dung dưới mép dưới khung màn là phần cuộn, không tính") and the frames were made taller, so "overflowCount 0" (`dot-giao-dien.md:92`, `kiem-du-man.md:28`) proves wrapping, not button visibility. The ruling (`progress.md:36`) defers "sticky footers" to the code round but neither the as-built nor UI-CONTEXT §10 says so. Fix: one line in UI-CONTEXT §10 / as-built: phone frames taller than 852 scroll; the primary button (Nộp, Bắt đầu, Gửi báo lỗi) is a fixed footer — or decide now and draw one example.
5. **Gate approvals were on a sample of frames; the as-built reads as if every frame was approved.** Never in any `duyet/` screenshot (nor its twin): K/70t, K/74b, K/74c, K/74d, K/74e, K/75b, K/79b, K/80b, K/85t, K/86, M/74b–e, M/75b, M/79b, M/80b, M/85t, M/86, A/70b, A/70e, A/75, A/77b, A/78b, A/78c, A/80. That includes three of the five RF5 error frames and RF3's K/79b. Fix: either a short owner pass over these frames or a sentence in "Mốc và duyệt" naming the frames that were not shown.

#### Minor (nice to have)
6. Prototype hops that will confuse the owner's Present run: on K/78a (362:4386) "Báo lỗi" navigates to `K/66` (Bước 4's 4-reason dialog) instead of `K/80`; "Bỏ qua, xem đáp án" → `K/64`; K/79a's three buttons → `K/63`. Also page 08 has 22 flow starting points with duplicate names (five "Web 2: học hằng ngày", two "Web 1", two "Web 4", five "Web 7") inherited by duplicated frames — remove the copies so "Web Bước 7: 1/2/3" is easy to find.
7. Mixed plan state inside the Pro/Dùng thử frames: K/70, K/70t, K/71, K/72 show chip "Pro" but the side card reads "Phiên luyện hôm nay · Gói Miễn phí · còn 2/3 phiên" and the dialog says "Dùng 1 trong 2 phiên còn lại hôm nay." (`ban-chu-giao-dien.md:336`) for a 30-sessions plan. RF2 asks that plan states read consistently.
8. K/81's sheet says "Câu AI · Chọn nghĩa trong câu · rizz (Từ của tôi)" while the background is K/79a's deploy cloze with "Bản dịch".
9. K/74c copy "Gói Pro của bạn đã hết hạn nên phiên này dừng ở đây." sits above a yellow [Thử lại] — contradictory; for `plan-required` a retry only succeeds after a new grant. Reword ("… nên các câu AI còn lại không tạo được.") or make [Dừng, để sau] primary there.
10. "Báo lỗi của tôi" has no string for `refunded: null` (confirmed, refund pending — design Bước 7 §9.2 `:498`, `reports.service.ts:39, 202`); the K/82 example row 5 pairs a refundable reason (`ai_wrong_meaning`) with "Lượt này không trả lại được", which only happens when `ai_charged=false`. Add the pending string and a note on when each line appears.
11. Copy doc internal drift: §4.7 (`:179–185`) still lists the usage block ("Phiên luyện hôm nay", "Lượt câu AI: còn 287/300") that §12 removed from Gói học (verified gone in K/53); §11.1 row F names `K/50` for the Dark add-word sample (it is K/40). Mark §4.7 superseded by §12 and fix row F.
12. "[Xem Gói học]" (§3.2, K/70b, K/85b) vs "[Xem gói học]" (§12 K/50 row) — pick one casing.
13. `figma-checks.js:69`: any text under a layer named "disabled", "(mờ)" or "tắt tới khi…" is exempt from contrast; `exemptedTexts` is only a count. List the exempted node ids in `worst` so a reviewer can see what was waived (K/52·Dark waived 2).
14. `dot-giao-dien.md:48` and `progress.md:66` cite blob `bf04239` for the UI-CONTEXT merge; `git cat-file -t bf04239` fails in the repo, so the provenance is uncheckable — cite the commit (`3faf49c`) instead.

### Declined to judge
- Visual polish, spacing and table layouts of admin frames — D11 fixes them at wireframe level and the owner plans an admin refactor.
- English copy of every screen — D14 defers it to the code round.
- Trial/paid Gói học states, Google login, account deletion, Flutter — outside design §3/§5.
- K/15's second yellow button, hard-coded dialog/danger shadows, faint Dark scrim — pre-existing or outside Task 2's two named shadows; all listed in the as-built.
- Present-mode click-through — the as-built states it was not done and hands it to the owner.
- Keeping old pages 03/05/06 — D2.
- The three API additions in design §10 and the `PATCH /v1/me` birth-date change — owner-approved, explicitly out of round.
- The glossary choices themselves (e.g. "Trình độ", "kiểu câu") — approved by the owner at gate 0.
- Touch-target size, keyboard focus and other accessibility beyond the contrast/overflow checks the plan defines.

### Assessment
**Ready to merge? With fixes.** The round delivers what the plan asked, the counts and check results reproduce, and the copy is well grounded in the API; but the two "Đọc trước" frames and five learner strings contradict the round's own rules and its stated checks, and one Review-Focus-3 frame shows a state the API forbids — all cheap text/frame edits that should land before this becomes the coding session's source of truth.

## Xử lý

Claude chấm lại theo tác động tới người dùng tài liệu (phiên code, chủ dự án), không theo nhãn của người review. Mỗi chỗ sửa có phép kiểm trước và sau.

| # | Mức chấm lại | Xử lý | Kiểm |
|---|---|---|---|
| 1 | Quan trọng | Viết lại chữ của K/00, M/00 (bản chính thức, duyệt 22/10; bỏ "chưa duyệt", "cần chủ dự án quyết", "Gói Free", "Đang phát triển", "Chưa vẽ…"); đổi tên section 0 của page 08, 09 | Script kiểm K/00, M/00: chữ 7,29:1, không tràn; ảnh `docs/mockups/2026-10-21/duyet/sua-sau-review/K-00-…`, `M-00-…` |
| 2 | Quan trọng | "Lượt mới có vào 15/11." → "Lượt câu AI …" (K/71, K/74b, K/75b và bản M) hoặc "Lượt tra AI …" (K/85c, M/85c); "Lượt này không trả lại được" → "Lượt câu AI này không trả lại được" (K/82, M/82); sửa cùng chỗ trong bản chữ, thêm ghi chú ở §11.3 | Tìm chữ "lượt" không kèm "câu AI"/"tra AI"/"AI" trên page 08, 09: trước 5 + 5, sau 0 + 0 |
| 3 | Quan trọng | A/74b vẽ lại: câu thường về từ catalog "server", hai lựa chọn nhiễu là từ riêng (đã che); dòng tương ứng ở A/73 đổi thành "server · Nghĩa sai"; thêm dòng A/74b vào bản chữ §8.4 | Tìm "[từ riêng của người học]" làm từ đang hỏi ở A/73, A/74b: 0; script kiểm 4,69:1, không tràn |
| 4 | Quan trọng | UI-CONTEXT §10 và as-built ghi: màn điện thoại cao hơn 852 vẽ đủ nội dung, khi code nút chính là chân trang dính; phép kiểm tràn chỉ chứng minh chữ xuống dòng | Đọc lại hai đoạn đã thêm |
| 5 | Quan trọng | As-built liệt kê các khung chưa từng có trong ảnh gửi duyệt | Soát tên file trong `duyet/`: không có K/74b, K/74d, K/74e, K/75b… (khớp danh sách của review) |
| 6 | Nâng lên quan trọng (chủ dự án sẽ bấm thử) | K/78a [Báo lỗi] → K/80; bỏ link của [Bỏ qua]; ba nút của K/79a → K/78b; gộp flow trùng tên (22 → 10) | Đọc lại liên kết: đúng đích mới; danh sách flow còn Web 1–7 và Web Bước 7: 1/2/3 |
| 7 | Nâng lên quan trọng (trái Review Focus 2) | K/70, K/70t, K/71, K/72 và bản M: thẻ "Gói Pro" / "Gói Dùng thử", "còn 28/30 phiên", "Dùng 1 trong 28 phiên còn lại hôm nay."; bản chữ ghi cả hai biến thể | Script kiểm 8 khung: đạt; ảnh `K-70-nhan-goi-pro.png` |
| 8 | Nhỏ, để sau | Nền K/81 khác câu của tấm báo lỗi | — |
| 9 | Nâng lên quan trọng (nút sai việc) | K/74c, M/74c: "… nên các câu AI còn lại không tạo được.", bỏ [Thử lại], [Dừng, để sau] thành nút vàng, bỏ dòng "Dừng thì phiên vẫn đang dở…" | Script kiểm: 1 nút vàng, không tràn; ảnh `K-74c-het-goi-pro.png` |
| 10 | Nâng lên quan trọng (thiếu trạng thái cho phiên code) | Bản chữ §7.14 thêm ba dòng phụ theo `refunded` (true / null / false) gồm "Đang trả lại 1 lượt câu AI"; dòng 5 của K/82, M/82 đổi lý do thành "Khác" (lý do không có trả lượt) | Đọc lại bản chữ; ảnh `K-82-dong-5-khac.png` |
| 11 | Nâng lên quan trọng (bản chữ tự mâu thuẫn) | §4.7 ghi khối mức sử dụng đã bỏ khỏi Gói học (mục 12); §11.1 dòng F K/50 → K/40 | Đọc lại hai chỗ |
| 12 | Nhỏ, để sau | Chữ hoa "[Xem Gói học]" / "[Xem gói học]" | — |
| 13 | Nhỏ, để sau | Script liệt kê id chữ được miễn kiểm tương phản | — |
| 14 | Nhỏ | Mã `bf04239` chỉ nằm trong ledger (không commit), không có trong as-built; ledger ghi thêm commit `3faf49c` | — |
