# Decisions — Bước 4: Practice (bài luyện không AI, chỉ API)

Ngày: 17–18/10/2026. Đi kèm design doc [`../specs/2026-10-18-buoc-4-practice-design.md`](../specs/2026-10-18-buoc-4-practice-design.md).
File này gom mọi quyết định trong lúc brainstorm Bước 4, mỗi quyết định kèm các phương án **đã thật sự đưa ra trong chat**, trade-off
và lựa chọn. Design doc mô tả *cách làm*; file này trả lời *tại sao chọn vậy và đã bỏ gì*. Nhật ký từng vòng hỏi đáp (nguồn của file
này): [`../reviews/2026-10-17-buoc-4-readiness.md`](../reviews/2026-10-17-buoc-4-readiness.md) mục 8.

> **Trạng thái 18/10/2026: đã chốt toàn bộ** (chủ dự án xác nhận các chỗ cuối bằng "ok").
>
> **Sau review độc lập 18/10/2026** ([`../reviews/2026-10-18-buoc-4-design-review.md`](../reviews/2026-10-18-buoc-4-design-review.md)):
> design đã sửa theo review. R3, R4, R5 đã chốt thành **D34, D35, D36**. Các đề xuất kỹ thuật mới (design mục 0) chủ dự án duyệt hết
> ("ok duyệt"), ghi ở mục "Đề xuất kỹ thuật được duyệt cùng design", phần "Chọn thêm sau review độc lập". Không còn gì chờ.

**Nhãn:** ✅ = phương án được chọn. **Ai chốt:** "Chủ dự án" = chọn trong chat; "Đề xuất của Claude" = Claude đề xuất sau khi chủ dự án
trả lời hoặc khi chủ dự án nhờ đề xuất, chủ dự án đồng ý; "Duyệt cùng design" = Claude đề xuất khi trình một phần design, chủ dự án
duyệt cả phần.

**Cách hỏi ở Bước 4:** luật "chủ dự án trả lời trước, Claude đề xuất sau" (CLAUDE.md). Chủ dự án giữ luật này cho Bước 4 (D27). Mục cuối
ghi những chỗ Claude đề xuất trước khi chủ dự án trả lời.

## Tóm tắt

| # | Quyết định | Phương án chọn | Ai chốt |
|---|---|---|---|
| D1 | Brainstorm Bước 4 khi Bước 3 chưa xong | Brainstorm ngay; plan viết sau khi đọc lại code `dev` | Chủ dự án |
| D2 | Phạm vi Bước 4 | Trắc nghiệm, đúng/sai, gõ từ, "từ hay sai"; bài điền từ và dạng "câu chứa từ rồi chọn" sang Bước 7 (AI) | Chủ dự án |
| D3 | Ngân hàng câu dùng chung (K17) | Bỏ; câu lưu theo từng người học, xem lại và làm lại được; dùng lại câu AI tính ở Bước 7 | Chủ dự án |
| D4 | Bài điền từ cho gói Free (K23) | Không; bài điền từ AI là tính năng gói trả phí | Chủ dự án |
| D5 | Đáp án nhiễu | Lấy trong các nhóm chứa từ đang hỏi; bỏ lọc loại từ, level, cột đồng nghĩa; loại cùng chữ, dạng chia, chung nghĩa con (4 vòng) | Chủ dự án |
| D6 | Một câu chỉ một đáp án đúng | Không bao giờ có câu hơn một đáp án đúng; chặn lúc tạo câu | Chủ dự án |
| D7 | Gợi ý | Nấc 1 định nghĩa ≤ 200 ký tự (hoặc câu ví dụ che từ), nấc 2 chữ cái đầu và số chữ; chấm như thường, ghi lại | Chủ dự án (thang nấc: đề xuất của Claude) |
| D8 | Làm lại câu, lưu câu | Trong phiên mỗi câu một lần; mọi câu được lưu; làm lại = chọn từ ở phiên sau | Chủ dự án (tách "xem lại" và "làm lại": đề xuất của Claude) |
| D9 | Gõ từ sai | Không hiện đáp án ngay; "Làm lại" (admin chỉnh N lần, trống = không giới hạn) và "Bỏ qua"; làm lại mới đúng tính đúng | Chủ dự án (3 vòng) |
| D10 | Câu sai có tự "Cần ôn tập" | Không; giữ D16 của Bước 3, nút nổi bật để người học tự bấm | Chủ dự án |
| D11 | Nguồn phiên luyện | 5 loại: Hôm nay, Ôn tất cả, Theo nhóm, Từ hay sai, Đang ưu tiên | Chủ dự án (danh sách: đề xuất của Claude) |
| D12 | Sắp xếp từ trong phiên | Người học chọn; bảng mặc định theo nguồn | Chủ dự án (bảng mặc định: đề xuất của Claude) |
| D13 | Số câu mỗi phiên | Người học chọn; admin đặt tối đa, không đặt tối thiểu | Chủ dự án |
| D14 | Nguồn ít hoặc nhiều từ hơn số câu | Đủ từ thì không lặp; thiếu từ thì ôn theo vòng, hỏi "Ôn lại thêm không?" một lần; bỏ luyện riêng một từ | Chủ dự án (ôn theo vòng: đề xuất của Claude) |
| D15 | Dạng bài trong phiên | Người học chọn một hoặc nhiều dạng | Chủ dự án |
| D16 | Kiểu đề | Hai kiểu: theo nghĩa và câu ví dụ catalog bỏ trống (không AI); chọn "theo nghĩa / theo câu / trộn" khi mở phiên | Chủ dự án |
| D17 | Loại từ trong đề | Không hiện, ở mọi dạng (đổi lần chốt trước) | Chủ dự án |
| D18 | Nút sau mỗi câu | "Cần ôn tập" luôn có (nổi bật khi sai); "Đã biết" khi đúng | Chủ dự án (nhiều vòng) |
| D19 | "Đã biết" trước hạn | Giữ D19 của Bước 3 (tạm thời): chưa tới hạn thì không hiện "Đã biết" | Chủ dự án |
| D20 | Trang tổng kết | Một danh sách "Cần ôn tập", không phân loại | Chủ dự án |
| D21 | "Từ hay sai" | 2 trong 5 lượt; tính cả trắc nghiệm, đúng/sai; lượt đúng nhờ gợi ý không tính; dùng gợi ý không lên mức | Chủ dự án |
| D22 | Báo lỗi | Có nút báo lỗi, lưu cho staff (`content.edit`) xem | Chủ dự án (chi tiết: duyệt cùng design) |
| D23 | Lịch sử | Lọc theo ngày; giữ 6 tháng (admin chỉnh); người học không xóa | Chủ dự án |
| D24 | Nền tảng | Chỉ API; giao diện làm sau khi hệ thống ổn định | Chủ dự án |
| D25 | Quyền `practice.basic` | Chỗ kiểm tạm luôn "được phép"; Bước 5 thay | Chủ dự án |
| D26 | Phiên luyện lưu ở đâu | Server giữ phiên | Chủ dự án |
| D27 | Cách làm việc | Không có phần lõi chủ dự án tự viết; chỉ review; giữ "chủ dự án trả lời trước" | Chủ dự án |
| D28 | "Xong khi" | Xong mọi task của plan và test thành công (CI xanh + script qua API thật) | Chủ dự án (định nghĩa "test thành công": đề xuất của Claude) |
| D29 | Ai implement | Các phiên khác implement, cùng một phiên điều phối | Chủ dự án |
| D30 | Con số admin chỉnh | Toàn bộ, trừ giới hạn 100 và 300 ký tự | Chủ dự án |
| D31 | Nội dung đổi giữa phiên | Như Quizlet: đang làm vẫn chấm; tải lại thì báo "không tìm thấy" | Chủ dự án |
| D32 | Hai máy cùng nộp | Cái tới trước được ghi, còn lại bị chặn | Chủ dự án |
| D33 | Luật soạn nội dung | Thuộc Bước 4: định nghĩa ≤ 200 ký tự; nghĩa tiếng Việt tách nghĩa con bằng dấu phẩy | Chủ dự án |
| D34 | Trắc nghiệm theo câu ví dụ (kiểu B) và D6 (sau review) | Bỏ ở Bước 4, giữ kiểu B cho gõ từ; trắc nghiệm theo câu để Bước 7 (AI kiểm đáp án nhiễu) | Chủ dự án theo đề xuất của Claude (chủ dự án "chưa có idea cụ thể") |
| D35 | Bấm từ bài luyện và trần mỗi ngày (sau review) | Không tính vào trần; trần từ ôn mỗi nhóm cho phép để trống = không giới hạn (mặc định 100); trần từ mới bắt buộc | Chủ dự án (để trống: ý của chủ dự án; không tính trần và giữ trần từ mới: đề xuất của Claude) |
| D36 | Báo lỗi câu có từ riêng (sau review) | Câu hỏi chính là từ riêng: không có nút báo lỗi; câu từ catalog có từ riêng: vẫn báo được, bản sao che từ riêng | Đề xuất của Claude (chủ dự án nhờ: "bạn recommend đi") |

## D1 — Brainstorm Bước 4 khi Bước 3 chưa xong

Lúc hỏi (17/10), Bước 3 mới merge task 1–21; task 22 và giao diện chưa làm. Phân tích ở file readiness mục 1–7.

| Phương án | Trade-off |
|---|---|
| ✅ Brainstorm ngay | Tận dụng thời gian chờ; rủi ro Learning, Content còn đổi → đọc lại code trước khi viết plan |
| Đợi Bước 3 xong | Không có rủi ro trên, nhưng mất thời gian |

Chủ dự án: "Bắt đầu brainstorm Bước 4". Trong lúc brainstorm (18/10) chủ dự án báo **Bước 3 xong phần hệ thống**; giao diện làm riêng.
Deploy dời về "khi toàn bộ app hoàn chỉnh, trước ra mắt" (D3 vòng 3 của Bước 3), nên Bước 4 không còn chờ Deploy.

## D2 — Phạm vi Bước 4

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Làm đủ 5 phần (trắc nghiệm, đúng/sai, gõ từ, bài từ câu người học, "từ hay sai") / chia hai đợt / bỏ hẳn một số phần | Chủ dự án: thêm một dạng mới "đưa một câu chứa từ, người học chọn" (AI); bài điền từ cũng do AI tạo; "từ hay sai" ok |
| 2 | Claude ghi lại: hai dạng AI sang Bước 7 | ✅ Chủ dự án "ok" |
| 2b | Bài điền từ: (a) AI viết câu mới, (b) AI dùng câu người học đã lưu, (c) cả bài không AI từ câu người học lẫn bài AI | Không chọn; để Bước 7 (chủ dự án chuyển bài điền từ sang AI và gói trả phí, D4) |

✅ Bước 4: trắc nghiệm, đúng/sai, gõ từ, "từ hay sai", cộng lưu câu và lịch sử. Còn mở cho Bước 7: (a)/(b), "câu chứa từ rồi chọn" chọn gì.

## D3 — Ngân hàng câu dùng chung (K17)

Chủ dự án: ban đầu nghĩ sẽ lưu câu đã tạo để tiết kiệm lượt AI, "nhưng mình không muốn như vậy nữa". Claude giải thích: câu vẫn phải
lưu cho chính lượt làm bài (đáp án không gửi xuống máy; chấm; chặn nộp trùng); thứ bỏ được là dùng lại cho người khác. Hệ quả nêu ra:
mỗi câu AI tốn một lần gọi.

Chủ dự án: câu đã tạo nên lưu vào **danh sách câu của người học**, có lịch sử để xem lại, làm lại được, không xóa câu vừa làm vì như vậy
phải tốn thêm lượt AI. ✅ Bỏ ngân hàng chung giữa người học; lưu theo từng người. Dùng lại câu AI đã lưu: "khi tới Bước 7 thì tính tiếp".

## D4 — Bài điền từ cho gói Free (K23)

Hệ quả Claude nêu: Free không có AI (F31) nên mất bài điền từ mà K23 từng cho Free. ✅ Chủ dự án: "vẫn có các bài tập thay thế khác, do
đây là feature AI đặc trưng của app, đưa lên subscription thì hay hơn".

## D5 — Đáp án nhiễu

| Vòng | Phương án đưa ra | Trade-off | Kết quả |
|---|---|---|---|
| 1 | Chủ dự án nhờ đề xuất. Claude: (1) lọc tự động theo nghĩa con tiếng Việt; (2) hiện định nghĩa tiếng Anh trong đề; (3) nút "Có hơn một đáp án đúng" chặn cặp ngay | Rẻ, nhưng không chặn hết từ đồng nghĩa khác chữ | Chủ dự án: "không bao giờ có câu có hơn 1 đáp án" (D6); prompt LLM tránh đồng nghĩa (Claude ghi: trắc nghiệm Bước 4 không gọi AI); định nghĩa đưa vào gợi ý (D7) |
| 2 | A: đáp án nhiễu là nội dung được duyệt (3+ mỗi nghĩa) / A': cột đồng nghĩa, hệ thống tự chọn / B: tự chọn + lọc nghĩa con | A: chắc nhất, tốn công soạn, 3 từ cố định dễ thuộc. A': đa dạng, dùng lại được, sót là lọt. B: không đạt "không bao giờ" | Chủ dự án hỏi thêm cột synonym được không; Claude đồng ý A' (đa dạng hơn khi làm lại); chủ dự án: "khả năng sẽ làm theo cách này" |
| 2b | Thuật toán phác (bộ lọc, level ±1 → ±2 → bất kỳ, từ chức năng chỉ gõ từ) | — | Chủ dự án "ok" |
| 3 | Khi đọc lại design: Claude đề xuất từ riêng chỉ có gõ từ, và "cột đồng nghĩa null = chưa rà thì chưa có trắc nghiệm" | Giữ "không bao giờ", nhưng lúc đầu chỉ có gõ từ | Chủ dự án: **đáp án chỉ lấy trong phạm vi nhóm**, không cần catalog; từ riêng lấy trong nhóm |
| 4a | Phạm vi cho nguồn không theo nhóm: từ trong chính phiên / các nhóm chứa từ đang hỏi / toàn bộ từ đang học | Trong phiên: trộn chủ đề, dễ loại trừ. Nhóm chứa từ: cùng chủ đề | ✅ Các nhóm chứa từ đang hỏi |
| 4b | Lọc "cùng loại từ", "level gần": giữ / bỏ | Giữ: nhóm nhỏ ít trắc nghiệm. Bỏ: có thể đoán nhờ loại từ | ✅ Bỏ ("thêm bộ lọc thì phức tạp hơn mà không tối ưu được") |
| 4c | Cột đồng nghĩa: giữ / bỏ | Giữ: chặn `big`/`large`, tốn công soạn, từ riêng không có. Bỏ: chỉ dựa vào nghĩa tiếng Việt | ✅ Bỏ (chủ dự án: "với mình thì không"; Claude kiểm lại và đồng ý, rủi ro còn lại ghi ở design ⚠2) |

✅ Kết quả: ứng viên là mọi từ trong các nhóm của người học có chứa từ đang hỏi (catalog và từ riêng); loại cùng chữ, dạng chia của nhau,
chung nghĩa con tiếng Việt; dưới 3 ứng viên thì không có trắc nghiệm. Từ chức năng chỉ có gõ từ (vòng 2b, không bị đổi).

## D6 — Một câu chỉ một đáp án đúng

Chủ dự án (vòng 1 của D5): "không bao giờ có câu có hơn 1 đáp án, nên xem lại chỗ này". Nút báo "có hơn một đáp án" bị bỏ làm cách xử lý
chính. ✅ Chặn lúc tạo câu; rủi ro còn lại (đồng nghĩa khác chữ trong cùng nhóm) đi qua nút báo lỗi chung (D22).

## D7 — Gợi ý

| Vòng | Nội dung | Kết quả |
|---|---|---|
| 1 | Chủ dự án: gợi ý là một định nghĩa ngắn, hoặc Claude đề xuất cách hay hơn. Claude: thang nấc (định nghĩa ~120 ký tự; câu ví dụ che từ nếu không có định nghĩa; chữ cái đầu và số chữ cho gõ từ); dùng gợi ý vẫn chấm như thường, ghi lại | ✅ 200 ký tự (thay 120); ✅ câu ví dụ che từ; ✅ chữ cái đầu; ✅ ghi lại |
| 2 | Khi trình design: gọn thành 2 nấc; khi đề là câu ví dụ thì nấc 1 là định nghĩa, không có thì nghĩa tiếng Việt | Duyệt cùng design |

Độ dài 200 thành cài đặt admin chỉnh được (D30).

## D8 — Làm lại câu, lưu câu

Chủ dự án nhờ đánh giá spec (PRC14, F40: một câu một lần) với ý của mình (lưu, làm lại). Claude tách hai việc: **xem lại** (luôn có lợi)
và **làm lại** (làm lại ngay sau khi thấy đáp án không có lợi; làm lại ở phiên sau có lợi).

| Phương án làm lại | Trade-off |
|---|---|
| (a) Làm lại đúng câu cũ | Dễ thuộc đáp án của câu; "từ hay sai" lệch |
| (b) Cùng từ, câu mới; câu cũ để xem lại | Bài không AI tạo câu mới miễn phí |
| (c) Bài không AI một cách, bài AI một cách | — |

Chủ dự án: trong phiên chấm một lần (ok); lịch sử phải lọc được theo ngày; **làm lại đúng hơn là chọn từ**. ✅ Mọi câu được lưu; làm lại
là chọn từ ở phiên sau, bài không AI tạo câu mới. Câu hỏi và lượt làm bài được giải thích lại (lượt làm bài không tốn AI). Phần "trong
phiên một lần" của gõ từ bị đổi ở D9.

## D9 — Gõ từ sai

| Vòng | Nội dung | Kết quả |
|---|---|---|
| 1 | Claude: gõ từ sai thì "Cần ôn tập" nổi bật; đúng thì "Đã biết" | Chủ dự án: làm đúng vẫn giữ "Cần ôn tập" |
| 2 | — | Chủ dự án: gõ sai có hai nút "Làm lại" và "Cần ôn tập"; gõ đúng có "Đã biết" và "Cần ôn tập". Claude chỉ ra khác F40 và hỏi có hiện đáp án ngay không |
| 3 | — | Chủ dự án: gõ sai **không hiện đáp án ngay** (có thể chỉ gõ nhầm); thêm "Bỏ qua" để khi bí thì hiện đáp án |
| 3a | Số lần làm lại: không giới hạn / tối đa N (admin chỉnh), hết thì hiện đáp án | ✅ Admin chỉnh N; để trống là không giới hạn |
| 3b | Làm lại mới đúng: tính đúng / tính sai / như "đúng nhờ gợi ý" | ✅ Tính đúng (Claude đồng ý: thường chỉ là gõ nhầm) |
| 3c | "Bỏ qua … lưu vào danh sách": tự động "Cần ôn tập" / chỉ tính một lần sai / hiện đáp án kèm nút "Cần ôn tập" | ✅ Hiện đáp án kèm nút để người học tự bấm |
| 3d | Trắc nghiệm, đúng/sai có làm lại không | ✅ Không: sai thì báo sai, hiện đáp án ngay (làm lại thành đoán) |

## D10 — Câu sai có tự "Cần ôn tập"

Chủ dự án viết "trắc nghiệm sai … đưa vào từ đang sai hoặc cần ôn tập". "Từ hay sai" vốn tự tính; "Cần ôn tập" đổi mức nên dính D16 của
Bước 3 (chỉ người học đổi mức).

| Phương án | Kết quả |
|---|---|
| ✅ (a) Giữ D16: nút "Cần ôn tập" nổi bật để người học tự bấm | Chủ dự án "ok" |
| (b) Đổi D16 riêng cho bài luyện: sai ở trắc nghiệm, đúng/sai thì tự động | — |
| (c) Đổi D16 cho mọi dạng sai | — |

## D11 — Nguồn phiên luyện

| Vòng | Nội dung | Kết quả |
|---|---|---|
| 1 | Một nhóm (có lọc) / "Từ hay sai" / chọn từ / mọi nhóm gộp | Chủ dự án: "chia ra từng category luôn … ôn tất cả, hôm nay, từ hay sai …", làm hết |
| 2 | Claude đề xuất 6 loại: Hôm nay, Ôn tất cả, Theo nhóm, Từ hay sai, Đang ưu tiên, Chọn từ | ✅ "ok" |
| 3 | (D14) bỏ luyện riêng một từ → Claude hiểu bỏ hẳn "Chọn từ" | ✅ Còn 5 loại |

"Cần ôn tập" từ bài làm không cần biết nhóm (cờ ưu tiên gắn với từ; nhật ký cho phép trống nhóm): duyệt cùng vòng 2.

## D12 — Sắp xếp từ trong phiên

Chủ dự án: người học chọn cách sắp xếp, không cố định; "từ hay sai thì xét theo mức, ưu tiên cũng vậy". Claude kiểm `schedule.ts`: mọi từ
đang ưu tiên đều ở mức 1, nên với "Đang ưu tiên" đề xuất "bấm Cần ôn tập lâu nhất trước". ✅ Sáu cách sắp xếp (mức thấp trước, quá hạn
lâu nhất, mới trước, lâu chưa luyện, sai nhiều, ngẫu nhiên; thêm thứ tự như flashcard) và bảng mặc định theo nguồn (chốt khi đọc lại).
Cộng "bấm Cần ôn tập lâu nhất trước" ở trên, design mục 7.1 có tám cách (ghi chú khi sửa theo review 18/10; không đổi quyết định).

## D13 — Số câu mỗi phiên

Spec: 5–20, mặc định 10 (`ASSUMPTION`). Phương án: cố định / admin chỉnh. ✅ Chủ dự án: người học chọn, tối đa do admin đặt; "chỉ cần chỉnh
tối đa, không cần chỉnh tối thiểu".

## D14 — Nguồn ít hoặc nhiều từ hơn số câu

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Luyện một từ mà phiên 10 câu: hỏi một từ nhiều lần / phiên ngắn lại / mỗi từ tối đa vài lần | Chủ dự án: luyện riêng một từ thì tạo đủ N câu; mỗi từ ít nhất 1 câu, không ràng buộc số câu mỗi từ (ràng buộc làm người học thấy "xong từ đó") |
| 2 | Claude: từ câu thứ hai người học đã biết đáp án | Chủ dự án: **bỏ luyện riêng một từ**, chỉ học theo nhóm từ |
| 3 | Nguồn chỉ 1–2 từ: (a) cần tối thiểu vài từ / (b) phiên tự ngắn lại / (c) vẫn đủ số câu / (d) kết hợp | Chủ dự án: không ràng buộc, chỉ hỏi kiểu "Bạn đã học từ này, có muốn ôn lại không?" |
| 4 | Claude: ôn theo vòng (vòng 1 mỗi từ một câu; hết vòng hỏi một lần; vòng sau xáo, đổi dạng bài; luôn có nút Dừng) | ✅ "ok"; "tạm thời theo hướng này" |
| 5 | Đủ từ thì có lặp không (Claude mô phỏng: lặp làm tụt số từ khác nhau) | ✅ Không lặp |

Cách "chèn câu lặp ngẫu nhiên, cách nhau ít nhất 2 câu" (đề xuất trước vòng 4) bị thay bằng ôn theo vòng.

## D15 — Dạng bài trong phiên

Phương án: người học tự chọn một hoặc nhiều dạng / hệ thống tự trộn / mỗi loại phiên có bộ mặc định. ✅ Người học chọn. Đề xuất đi kèm
(nhớ lựa chọn trên thiết bị; từ không làm được dạng nào đã chọn thì bỏ qua): duyệt cùng design.

## D16 — Kiểu đề

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 | Claude (⚠13): đề trắc nghiệm không hiện loại từ | Chủ dự án: "đề không ghi loại từ luôn, chỉ cần hiện câu bỏ trống cái từ cần điền" |
| 2 | (i) Đề theo nghĩa, bỏ loại từ / (ii) câu ví dụ catalog bỏ trống (đáp án nhiễu chia cùng dạng; từ riêng không có câu; gợi ý phải đổi; 1–3 câu mỗi nghĩa) / (iii) có câu thì (ii), không thì (i) | ✅ Thiết kế cả hai kiểu |
| 3 | Cách đưa cho người học (Claude mô phỏng): (1) mỗi kiểu một dạng bài riêng / (2) ba dạng, hệ thống tự bốc / (3) ba dạng, thêm lựa chọn "Kiểu đề: theo nghĩa / theo câu / trộn" | ✅ Cách 3 |
| 4 | Claude hiểu: gõ từ cũng theo kiểu đề; đúng/sai luôn theo nghĩa; mặc định "trộn" (50/50 khi có câu) | ✅ "ok" |

## D17 — Loại từ trong đề

| Vòng | Nội dung | Kết quả |
|---|---|---|
| 1 | Claude: đề gõ từ hiện loại từ, để không bị chấm sai oan khi gõ `deployment` | ✅ Chủ dự án: "phải đúng ngữ pháp nữa chứ không phải đúng từ rồi thôi" |
| 2 | Sau khi bỏ lọc loại từ (D5), Claude đề xuất đề trắc nghiệm không hiện loại từ | ✅ Chủ dự án: không hiện loại từ ở mọi dạng (thay vòng 1) |

## D18 — Nút sau mỗi câu

| Vòng | Phương án | Kết quả |
|---|---|---|
| 1 (6a) | Gợi ý "Cần ôn tập" khi: chỉ gõ từ sai / mọi dạng sai / câu nào cũng có nút, nổi bật khi sai | Chủ dự án: khi gõ từ sai; dạng bài vẫn do người học chọn |
| 1 (6b) | Làm đúng: không gì / nút "Đã biết" (người học tự bấm) / trang tổng kết có "Đưa tất cả vào ưu tiên" | Chủ dự án: kết hợp hai cách sau |
| 2 | Claude gọn lại: chỉ "Cần ôn tập" khi gõ sai, "Đã biết" khi đúng; còn lại dồn về tổng kết | Chủ dự án: làm đúng vẫn giữ "Cần ôn tập" |
| 3 | (D9, D10) | ✅ "Cần ôn tập" luôn có sau kết quả cuối, nổi bật khi sai; "Đã biết" khi đúng, không dùng gợi ý, từ tới hạn hoặc ưu tiên |

## D19 — "Đã biết" trước hạn

Bước 3 (D19 của Bước 3): "Đã biết" khi chưa tới hạn không đổi gì. Chủ dự án hỏi trường hợp người học muốn học sớm hơn lịch.

| Phương án | Trade-off |
|---|---|
| ✅ (a) Giữ D19: chưa tới hạn thì không hiện "Đã biết" | Giữ đúng ý lịch giãn dần; người học học sớm không lên mức |
| (b) Đổi riêng trong bài luyện: "Đã biết" trước hạn vẫn lên một mức | Lệch giữa flashcard và bài luyện |
| (c) Đổi D19 cho cả flashcard và bài luyện | Phải sửa code Bước 3 |
| (d) "Đã biết" trước hạn = "Bỏ khỏi việc học" | — |

Chủ dự án: "tạm thời giữ nguyên, khi demo có vấn đề gì thì mình sẽ sửa lại".

## D20 — Trang tổng kết

Claude đề xuất hai danh sách ("từ sai" mọi dạng, "đúng nhờ gợi ý"), mỗi từ có nút, thêm "Đưa tất cả từ sai vào ưu tiên". ✅ Chủ dự án:
"chỉ cần tổng kết theo kiểu: cần ôn tập: từ A, từ B, từ C … không cần phân loại". Mỗi từ có nút "Cần ôn tập" và có nút "Đưa tất cả vào
ưu tiên": chủ dự án "ok".

## D21 — "Từ hay sai"

| Câu | Phương án | Kết quả |
|---|---|---|
| Tính lượt luyện lại ở phiên sau không | Claude: tính mọi lượt (không còn làm lại ngay) | ✅ "ok" |
| 10a Lượt trắc nghiệm, đúng/sai | Tính cả đúng lẫn sai / chỉ tính sai / bỏ hai dạng này | ✅ Tính cả hai |
| 10b Con số 2 trong 5 | Giữ / đổi / admin chỉnh | ✅ Giữ |
| 10c Lượt đúng nhờ gợi ý | (a) tính như đúng / (b) không tính / (c) tính như sai | ✅ (b); chủ dự án thêm: dùng gợi ý thì không lên mức |
| Chi tiết mục 8 | Chỉ gồm từ còn đang học; sai gần nhất trước; lý do "sai 3 trong 5 lần" và mức hiện tại | ✅ Duyệt khi đọc lại |

## D22 — Báo lỗi

Bối cảnh: sau D6, nút "có hơn một đáp án" bị bỏ; nội dung vẫn có thể sai (nghĩa sai, chấm sai vì thiếu cách viết, gợi ý sai).

| Phương án | Kết quả |
|---|---|
| (a) Không có nút báo lỗi | — |
| ✅ (b) Nút "Báo lỗi" (lý do + ghi chú), lưu cho staff, lượt bị báo không tính vào "từ hay sai"; cần quyền và màn admin | Chủ dự án "có nhé … theo hướng b" |
| (c) Như (b), chưa có màn admin, xem bằng xuất file | — |

Đề xuất của Claude được duyệt: lý do theo lỗi nội dung; staff có `content.edit` xử lý (không tạo quyền mới); báo được cả trước khi trả lời;
20 lần mỗi giờ; staff không thấy danh tính người báo; "không lỗi" thì lượt tính lại, "đã sửa" thì không; báo cáo chưa xử lý được giữ kèm
bản sao câu hỏi dù lần hỏi đã bị dọn. Màn admin dời sang đợt giao diện (D24).

## D23 — Lịch sử

| Câu | Phương án | Kết quả |
|---|---|---|
| 11a Giữ bao lâu | Giữ mãi / giữ N tháng rồi xóa / giữ mãi nhưng chỉ xem N tháng | Chủ dự án: 6 tháng ("chưa chắc phù hợp"); Claude đề xuất xóa tự động, số tháng admin chỉnh (3–24) |
| 11b Người học xóa được không | Không / từng lượt / toàn bộ | ✅ Không |
| Lọc | — | ✅ Lọc theo một ngày (chủ dự án); thêm lọc theo từ (đề xuất, duyệt cùng design) |

## D24 — Nền tảng

Phương án: (a) chỉ web như Bước 3 / (b) web và Flutter / (c) chỉ API, giao diện để sau. ✅ (c): "giao diện mình sẽ làm sau khi hệ thống ổn
định". Claude ghi hệ quả: API phải trả sẵn cờ cho giao diện; màn admin báo lỗi dời theo.

## D25 — Quyền `practice.basic`

| Phương án | Trade-off |
|---|---|
| (A) Bước 4 không kiểm; Bước 5 thêm | Ít code; Bước 5 phải sửa Practice |
| ✅ (B) Chỗ kiểm tạm, luôn "được phép"; Bước 5 thay phần bên trong | Thêm một lớp nhỏ, chưa có gì thật để test |
| (C) Phần tối thiểu của Entitlements ngay Bước 4 | Kéo một phần Bước 5 lên trước khi K18 chốt |

Mục 12 (kiểm khi bắt đầu phiên và khi tạo mỗi câu, không kiểm lúc chấm; điều kiện như Learning): giải thích lại, chủ dự án "ok".

## D26 — Phiên luyện lưu ở đâu

| Phương án | Trade-off |
|---|---|
| ✅ (1) Server giữ phiên | Tải lại vẫn làm tiếp; tổng kết lấy từ server; web và Flutter dùng chung logic; thêm bảng và API |
| (2) App giữ phiên (spec PRC20) | Ít bảng; tải lại mất phiên; mỗi app tự làm phần chia vòng |
| (3) Server tạo sẵn cả N câu | App đơn giản; Dừng giữa chừng để lại câu thừa; "Ôn lại" phải tạo thêm |

## D27 — Cách làm việc

Phương án: (a) giữ cả "chủ dự án trả lời trước" và một phần lõi tự viết / (b) như Bước 3 / (c) bỏ cả hai. Chủ dự án: "Mình không viết
code, mình chỉ review". Khi đọc lại (⚠8): "nếu mình cần bạn đề xuất thì mình sẽ nói với bạn trong câu đó" → ✅ (b): giữ cách hỏi, duyệt hành
vi qua bảng ví dụ, không có phần lõi tự viết.

## D28 — "Xong khi"

Phương án: (a) danh sách điều kiện đặt trước / (b) chủ dự án tự báo như Bước 3 / (c) kết hợp. Chủ dự án: "Nếu đã làm toàn bộ task trong
plan của bước 4, test thành công thì đã xong bước 4". Claude đề xuất "test thành công" = CI xanh trên PR + `pnpm smoke:buoc-4` qua API thật
trên DB mới, task cuối ghi as-built. ✅ "theo đề xuất".

## D29 — Ai implement

Phương án: (a) một phiên Claude khác, không Codex (như D41 của Bước 3) / (b) Codex implement, Claude review và chạy test / (c) chính phiên
brainstorm. ✅ Chủ dự án: các phiên khác implement cùng một phiên điều phối; tổng hợp context cho phiên điều phối (Claude đề xuất: design +
decision record, và mục "Brief cho phiên điều phối" trong plan).

## D30 — Con số admin chỉnh

Claude: chỉnh được hết về kỹ thuật, mỗi số cần khoảng hợp lệ, một ô admin, test; giữ cố định 100 và 300 ký tự. ✅ Chủ dự án "ok",
"configure được toàn bộ thì càng tốt". Kết quả: 8 cài đặt nhóm `practice` (design mục 5.4).

## D31 — Nội dung đổi giữa phiên

Claude: câu đang hiện chấm theo bản lưu, câu sau bỏ qua từ đó, tải lại vẫn làm tiếp. Chủ dự án kể Quizlet: vẫn học tiếp, tải lại mới báo
không tìm thấy; hỏi làm như Quizlet được không. ✅ Như Quizlet: tải lại hoặc xin câu tiếp thì báo "Không tìm thấy từ này" (câu không tính,
sang câu sau), nhóm bị xóa thì "Không tìm thấy nhóm này" và kết thúc phiên.

## D32 — Hai máy cùng nộp

Claude: chỉ một kết quả được ghi. ✅ Chủ dự án: "cái nào tới trước thì confirm trước, còn lại thì chặn".

## D33 — Luật soạn nội dung

Chủ dự án: nếu thuộc Bước 7 thì lưu lại, không thì đi sâu. Claude: thuộc Bước 4 (gợi ý và bộ lọc nghĩa con dùng chúng). ✅ "ok": prompt soạn
nội dung (D5 của Bước 3) thêm định nghĩa ≤ 200 ký tự và nghĩa tiếng Việt tách nghĩa con bằng dấu phẩy; nên có trước đợt soạn thử 20 từ.

## D34 — Trắc nghiệm theo câu ví dụ (kiểu B) và D6 (sau review độc lập, 18/10)

Review độc lập (phát hiện #3, design R3) chỉ ra: D6 chốt "không bao giờ có câu có hơn một đáp án đúng", nhưng trắc nghiệm kiểu B (D16) chỉ
lọc đáp án nhiễu theo nghĩa, không kiểm đáp án nhiễu có điền vừa câu không, và Bước 4 không có AI để kiểm. Ví dụ "We ___ the app to the
server yesterday": `delivered` cũng vừa câu. Kiểu A và gõ từ kiểu B không có vấn đề hai đáp án đúng; gõ từ kiểu B có mặt ngược lại (gõ một
từ khác cũng vừa câu thì bị chấm sai).

| Phương án đưa ra trong chat | Trade-off |
|---|---|
| Giữ trắc nghiệm kiểu B, chấp nhận rủi ro, phát hiện qua nút báo lỗi | Giữ đủ ba dạng ở kiểu đề "theo câu"; trái D6 |
| ✅ Bỏ trắc nghiệm kiểu B, chỉ giữ kiểu B cho gõ từ | Giữ D6; mất dạng dễ có ngữ cảnh câu (chỉ còn gõ từ, khó hơn); bớt việc build (không chia đáp án nhiễu theo dạng) |
| Cách khác chủ dự án nghĩ ra | — |

Chủ dự án trích phương án 2 và viết "tạm thời bỏ qua đi, mình chưa có idea cụ thể", hỏi Claude sẽ thiết kế thế nào. Claude đề xuất (kèm
mô phỏng bấm thử): theo phương án 2, coi là tạm thời; trắc nghiệm và đúng/sai luôn theo nghĩa, "Kiểu đề" chỉ còn tác dụng với gõ từ; rủi ro
gõ từ kiểu B giảm bằng làm lại không hiện đáp án ngay, gợi ý nấc 1 và báo lỗi `graded_wrong`; trắc nghiệm theo câu quay lại ở Bước 7 khi AI
kiểm được đáp án nhiễu. ✅ Chủ dự án: "Ok, chốt R3 theo đề xuất". Đổi một phần D16 (vòng 3–4: kiểu đề áp cho trắc nghiệm).

## D35 — Bấm từ bài luyện và trần mỗi ngày (sau review độc lập, 18/10)

Review (phát hiện #5, design R4): trần của Bước 3 (20 từ mới, 100 từ ôn mỗi nhóm mỗi ngày) chỉ đếm lượt ôn có nhóm; bài luyện không gắn
nhóm, nên bấm "Đã biết" từ bài luyện không trừ trần nào. Ví dụ Claude đưa: nhóm IT có 150 từ đến hạn, flashcard chỉ đưa 100; luyện "Ôn tất
cả" rồi bấm "Đã biết" 50 từ còn lại thì hôm nay ôn 150.

| Phương án đưa ra trong chat (câu hỏi R4) | Trade-off |
|---|---|
| ✅ Không tính: bài luyện là đường ôn thêm, nằm ngoài trần | Đơn giản, đúng như code đang chạy; người học chăm có thể lên mức nhiều từ hơn trần |
| Có tính, vào một nhóm nào đó | Giữ trần chặt; phải chọn nhóm khi từ ở nhiều nhóm |
| Khi nhóm đã hết trần thì không cho bấm "Đã biết" trong bài luyện | Giữ trần; người học khó hiểu vì sao nút lúc có lúc không |
| Cách khác | — |

Chủ dự án nhờ research xem các app có giới hạn số từ ôn trong một nhóm không; "nếu không thì để cho admin configure không giới hạn bằng
cách để trống". Claude research (Anki manual, Mochi forum và docs, RemNote help, Quizlet help, diễn đàn WaniKani): mọi app giới hạn từ mới;
giới hạn từ ôn thì chỗ có chỗ không (Anki có; Mochi không, tác giả nói "không thấy nó hợp với lịch ôn giãn cách"; RemNote cho người học
chọn); Anki cho tự học vượt trần và câu trả lời ở đó vẫn đổi lịch. Claude đề xuất: trần từ ôn cho phép để trống (theo ý chủ dự án), trần từ
mới giữ bắt buộc, bấm từ bài luyện không tính trần. Phương án khác kèm theo: cho cả trần từ mới để trống. ✅ Chủ dự án: "Ok, chốt R4 theo
đề xuất". Đổi một phần D21 của Bước 3 (trần 100 từ ôn không còn bắt buộc).

## D36 — Báo lỗi câu có từ riêng (sau review độc lập, 18/10)

Review (phát hiện #13 và phần báo cáo của #24, design R5): bản sao câu hỏi trong báo cáo cho staff có chữ và nghĩa của từ đang hỏi, chữ của
đáp án nhiễu và nghĩa của cặp sai ở đúng/sai. Đáp án nhiễu lấy trong nhóm (D5) nên có thể là từ riêng. Bước 3 chốt từ riêng "chỉ chủ
thấy", và công cụ soạn của staff chỉ sửa được catalog.

| Phương án đưa ra trong chat (câu hỏi R5) | Trade-off |
|---|---|
| Thấy hết như từ catalog (ghi thành ngoại lệ có chủ đích của "chỉ chủ thấy") | Đơn giản; staff thấy nội dung người học tự gõ, có thể là bất cứ thứ gì |
| Che phần từ riêng trong bản sao | Giữ luật; câu hỏi chính là từ riêng thì bản sao gần như trống |
| Không cho báo lỗi câu hỏi chính là từ riêng (câu có đáp án nhiễu là từ riêng vẫn báo được) | Giữ luật cho câu hỏi chính; đáp án nhiễu riêng trong câu catalog vẫn lộ nếu chỉ dùng cách này |
| ✅ Kết hợp hai cách trên (đề xuất của Claude) | Giữ luật, không cần ngoại lệ; xóa từ riêng không để lại chữ nào trong báo cáo; staff không thấy lỗi do từ riêng gây ra; câu hỏi chính là từ riêng mất nút báo lỗi nên lượt sai vẫn tính vào "từ hay sai" |
| Cách khác | — |

Trước khi trả lời, chủ dự án hỏi ba câu, Claude trả lời đã kiểm: (1) design đã chốt có xử lý chưa: chưa, D22 chỉ che danh tính người báo;
(2) khi luyện có tách từ riêng với từ catalog không: không, trộn chung theo D5; (3) có phải lỗi không: có, build theo design khi đó sẽ trái
luật "chỉ chủ thấy" của Bước 3 (design Bước 3 mục 7.2, spec C8), trừ khi ghi một ngoại lệ có chủ đích. Claude ghi thêm: luật đó viết khi
nghĩ tới người học khác, chưa văn bản nào nói riêng về staff. Chủ dự án: "bạn recommend đi". Claude đề xuất phương án kết hợp, kèm hướng
khác là "thấy hết + ngoại lệ". ✅ Chủ dự án: "Ok, chốt R5 theo đề xuất". Cách làm: cờ `reportable = false` cho câu hỏi chính là từ riêng;
bản sao che chữ bằng "[từ riêng của người học]" và che nghĩa bằng "[nghĩa của từ riêng]" lúc tạo báo cáo.

## Đề xuất kỹ thuật được duyệt cùng design

**Chọn:**
- Module `Practice` mới, chỉ gọi module khác qua service export (D3 của Bước 0–3); Learning mở hàm đọc danh sách từ theo nguồn và hàm ghi
  "Cần ôn tập", "Đã biết" không cần nhóm (`learning_log.origin = practice`, khóa là ID lần hỏi).
- 4 bảng: `practice_sessions`, `practice_questions` (nội dung câu, lưu nguyên), `practice_session_items` (một lần hỏi + câu trả lời),
  `practice_reports`. Tách "câu hỏi" và "lần hỏi" để Bước 7 dùng lại câu AI. Không có bảng lượt làm bài riêng.
- Mỗi người tối đa một phiên đang mở; câu tạo từng câu khi app xin; phiên bỏ ngang tự đóng (24 giờ, admin chỉnh).
- Chống nộp trùng: chỉ ghi khi lần hỏi còn trống, khóa dòng; `Idempotency-Key` cho mỗi lần gõ.
- Làm lại khi gõ sai: lưu các lần gõ trước, số lần, `max_retries` chụp lúc tạo câu; API `skip` cho "Bỏ qua".
- Kiểu B: chọn câu ví dụ có từ (khớp cả dạng chia AGID), che, chia đáp án nhiễu về cùng dạng; thiếu dạng thì loại ứng viên. Sau D34
  kiểu B chỉ cho gõ từ, nên phần chia đáp án nhiễu không còn ở Bước 4.
- Dọn qua `MaintenanceScheduler` có sẵn (chạy mỗi giờ; bản trước ghi "hằng ngày", sửa theo review 18/10); xóa từ riêng thì xóa dữ liệu
  Practice cùng transaction.
- Module `entitlements` tạm; quyền staff `content.edit` cho báo lỗi.
- Không chặn độ dài định nghĩa lúc import; định nghĩa dài chỉ không dùng làm gợi ý.

**Chọn thêm sau review độc lập** (Claude đề xuất khi sửa design theo review; chủ dự án đọc bản tóm tắt từng dòng và trả lời "ok duyệt",
18/10; chi tiết ở design mục 0, R1–R15):
- R1: giới hạn tần suất riêng `practice.answer` (120 lần/phút, `ASSUMPTION`) cho các API trong lúc làm câu, vì `user.write` chỉ 30 lần/phút
  và dùng chung mọi thao tác ghi.
- R2: xóa từ riêng qua một cổng do Learning khai báo, Practice cung cấp phần xóa, để không có vòng phụ thuộc; hàm ghi "Cần ôn tập"/"Đã
  biết" của Learning nhận transaction của Practice.
- R7: đề kiểu B (gõ từ) chỉ dùng câu mà mọi chỗ khớp cùng một chữ; khớp phân biệt hoa thường trừ chữ đầu câu; chỗ trống là chính từ thì
  nhận cả cách viết khác, chỗ trống là dạng chia thì chỉ nhận đúng chữ đó.
- R8: lần hỏi đang làm lại chưa có kết quả cuối (`answered_at`, `result` vẫn null); payload có `state`, `tries`; bấm nút khi chưa có kết
  quả cuối → 409.
- R9: từ không còn dùng được giữa phiên: câu đang hiện thành `void` kèm thông báo; từ chưa hiện thì bỏ qua; hết từ thì phiên kết thúc;
  phiên Theo nhóm mà từ rời nhóm thì như không tìm thấy.
- R10: tổng kết: một từ có nhiều lần hỏi thì dùng lần hỏi cuối làm khóa; "Đưa tất cả" bỏ qua từ đã bấm (phần áp cho cả danh sách là sửa
  theo D20).
- R11: phiên `finished` vẫn bấm nút tổng kết và báo lỗi được; phiên `abandoned` thì không.
- R12: Practice tự đếm báo cáo trong 60 phút gần nhất theo `reports_per_hour`.
- R13: lọc nghĩa con trên nghĩa tiếng Anh khi một bên không có nghĩa tiếng Việt; bỏ câu "cặp sai chắc chắn sai".
- R14: "để trống" lưu là null; luật chéo mặc định ≤ tối đa; liệt kê các con số cố định.
- R15: bảng mã lỗi; "tới hạn" theo `wasDue` của `applyAnswer`; "Đang ưu tiên" không gồm từ đã vào danh sách cân nhắc (D48 của Bước 3);
  sắp xếp trước rồi lọc dạng bài; khóa theo người khi mở phiên; "Bỏ qua" chỉ sau một lần gõ sai; edge case B4E29–B4E43.

**Bỏ (và vì sao):**
- Ngân hàng câu dùng chung (D3); bài từ câu người học không AI cho Free (D4).
- Đáp án nhiễu duyệt sẵn (A) và cột đồng nghĩa (A'), cả luật "null = chưa rà": thay bằng lấy trong nhóm (D5).
- Tập ứng viên là toàn catalog, lọc loại từ, level: thay bằng lấy trong nhóm, bỏ lọc (D5).
- "Từ riêng chỉ có gõ từ": bị thay khi đáp án lấy trong nhóm (D5 vòng 3).
- Định nghĩa tiếng Anh trong đề; loại từ trong đề (D7, D17).
- Nút "có hơn một đáp án đúng" làm cách chặn chính (D6).
- Nguồn "Chọn từ" và luyện riêng một từ; lặp khi đủ từ; chèn câu lặp ngẫu nhiên (D11, D14).
- Gửi `remembered`/`forgotten` sang Learning và tự đổi lịch (PRC16, PRC17): trái D16 của Bước 3.
- Xóa câu chưa trả lời sau 30 ngày (PRC24): thay bằng giữ theo số tháng lịch sử (D23).
- App giữ phiên; tạo sẵn cả phiên (D26).
- Trắc nghiệm theo câu ví dụ ở Bước 4: trái D6 khi không có AI kiểm đáp án nhiễu; dời sang Bước 7 (D34).

## Chỗ Claude đề xuất trước khi chủ dự án trả lời

- Lượt đầu (17/10, trước khi hỏi): Claude đề xuất "chốt design ngay, viết plan sau khi Bước 3 xong" khi trả lời câu "có brainstorm sớm
  được không". Đây là cách làm, không phải quyết định sản phẩm; chủ dự án sau đó chọn brainstorm ngay (D1).
- Phần còn lại: các đề xuất đưa ra sau câu trả lời của chủ dự án, hoặc khi chủ dự án nhờ ("phân tích và đưa ra đề xuất", "hoặc có cách
  gợi ý khác hay hơn thì đề xuất", "đánh giá giúp mình"), hoặc khi trình design từng phần.
