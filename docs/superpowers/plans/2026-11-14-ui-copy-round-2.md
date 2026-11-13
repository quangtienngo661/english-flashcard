# Plan: sửa chữ giao diện vòng 2 (14/11/2026)

**Nguồn:** `docs/audit/2026-11-14-ui-copy/vong-1.md` (mục 2.1–2.16, quyết định Q1–Q14 ở mục 4 và 5), `faq-de-xuat.md` (bản 2),
`danh-gia-gemini.md`. Chủ dự án duyệt toàn bộ đề xuất ngày 14/11/2026 ("Đề xuất hết", rồi `/goal`: lập plan và làm vòng 2).
**Nhánh:** `fix/ui-copy-round-2` từ `origin/dev` (`2d858021`).

## Ràng buộc

- Ở `apps/web/messages/vi.json` và `en.json` chỉ đổi value. Không đổi key, thứ tự hay cấu trúc lồng. Tên và số placeholder, tag giữ nguyên.
  Ngoại lệ là T5: xóa key của các dòng thừa đã duyệt ở Q14.
- `Landing.*` của bản EN đang là bản sao chữ Việt (vì `/en` chuyển về `/vi`). Sửa landing VI thì chép y nguyên sang EN để hai bản vẫn giống nhau.
- Không thêm tính năng hay lời hứa mà app không có. Câu nào nói về hành vi thì đối chiếu với code.

## Task

1. **Script kiểm.** So hai file sau khi sửa với bản `origin/dev`: cùng tập key (trừ các key Q14 được phép xóa), cùng placeholder và tag
   trong từng value. Lệch là báo lỗi.
2. **Sửa chữ trong hai file JSON** theo mục 2.1–2.15:
   - nút "Needs review" / "Known" (Q2);
   - "deck" ở mọi chỗ trong EN (Q1);
   - "CEFR level" cho trình độ trong EN (Q3);
   - "câu đã gặp" / "saved sentence" (Q4);
   - tên văn bản pháp lý viết hoa trong EN (Q6);
   - dịch `Metadata` sang EN (Q7);
   - giọng trung tính (Q8);
   - bỏ "hãy" (Q9);
   - viết lại các câu nghĩa mơ hồ (Q10);
   - câu báo lỗi theo một mẫu, số nhiều trong EN, dấu câu, bỏ chữ về thanh toán trên landing (Q13).
3. **Chạy test web và sửa test** đang ghi cứng chữ cũ. Test phải pin giá trị mới, không được nới lỏng.
4. **FAQ landing (Q12).** Viết 6 câu mới vào bản dự phòng `landing-data.fallback.ts` và sửa test của nó. Nội dung cho trang FAQ của admin
   ghi trong report để chủ dự án nhập, vì DB chưa deploy.
5. **Bỏ dòng thừa (Q14).** Xóa 10 dòng hiển thị trong code và key của chúng. Bỏ phần thừa ở 7 dòng (chỉ sửa value). Sửa test.
6. **Kiểm cuối.** `messages.test`, `check-message-keys`, typecheck, lint, toàn bộ test web, build container web và xem chữ trên app thật.
7. **Report vòng 2.** Bảng thay đổi key | cũ | mới sinh từ diff, xác nhận key và placeholder, những gì chưa làm. Ghi kèm delivery record.
