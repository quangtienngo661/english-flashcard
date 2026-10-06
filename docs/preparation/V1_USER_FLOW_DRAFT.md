# User flow V1 — bản nháp để rà phạm vi

> **Cập nhật cuối ngày 02/10:** bước 4–5 chỉ còn bài **điền từ** (kết quả đúng/sai kèm giải thích và
> bản dịch nguyên câu); bài tự viết câu tạm thời chưa ở V1.

Ngày: 02/10/2026. Đây là **tình huống giả định**, không phải hành vi đã quan sát hay spec được chốt. Next.js web và Flutter mobile đã được người dùng chọn; mục đích là rà một vòng sử dụng chung trước khi làm UI.

**Người dùng giả định:** một sinh viên muốn ôn vài từ tiếng Anh dùng trong chủ đề mình đang học; có ít phút rảnh. Chủ đề cụ thể chỉ để minh họa, chưa quyết định nội dung V1.

1. **Bắt đầu:** lần đầu vào app thì đăng nhập; các lần sau giữ trạng thái đến logout theo trải nghiệm đã chọn. Cơ chế/ngoại lệ session còn cần auth spec. Chọn chủ đề và level A1–C2 để xem từ có nội dung đã publish; có thể tự nhập thêm từ. Nguồn và độ phủ release còn mở.
2. **Tạo nhóm học:** chọn vài từ rồi lưu vào nhóm của mình. App hiển thị nghĩa và ví dụ ngắn để người học hiểu trước khi luyện.
3. **Ôn flashcard:** lật thẻ và tự đánh dấu từng từ là “chưa học”, “cần ôn tập” hoặc “đã biết”. Trạng thái là đánh giá của người học.
4. **Thực hành AI:** backend kiểm tra quyền/hạn mức; Free không có AI, từ trial 14 ngày (người dùng tự kích hoạt khi cần) trở lên có AI, Pro hạn mức cao hơn trial (chốt 02/10). Kết quả bài điền từ trả đúng/sai kèm giải thích và bản dịch nguyên câu. Từ nhóm ấy tạo bài **điền từ** hoặc **tự viết câu dùng từ**, ưu tiên từ cần ôn. Đề xuất hiển thị nghĩa mục tiêu cho câu tự viết; không ép cùng một từ đúng mọi nghĩa.
5. **Nhập và kiểm tra:** nhập đáp án rồi chấm **đúng/sai**; không có nhận xét/sửa câu dài hoặc retry tutor flow. So sánh lowercase, chấp nhận contraction phù hợp, không coi TY/GTG tương đương cụm đầy đủ. Rubric câu mở đang [đề xuất](V1_GRADING_RULES_DRAFT.md), chưa chốt.
6. **Quay lại:** giữ đăng nhập và thấy nhóm/trạng thái do mình chọn; đề xuất cùng tài khoản web/mobile đọc cùng dữ liệu. Hết trial không xóa dữ liệu học; quyền AI được kiểm tra riêng trước tác vụ mới.

**Nếu AI tạo/chấm lỗi hoặc quá lâu:** báo chưa tạo/chấm được và cho xử lý lại phù hợp, không tính đáp án sai hoặc mất dữ liệu. Nếu phiên bị thu hồi/hết hạn phải login lại, đề xuất giữ câu đang nhập nếu phù hợp. Các hành vi này còn cần spec/verification; không hứa token vô hạn.

**Điều kiện để coi luồng này đủ cho V1:** người mới có thể hoàn tất các bước mà không cần hướng dẫn trực tiếp; app cho biết đáp án đúng hay sai theo quy tắc có thể giải thích; dữ liệu nhóm/trạng thái vẫn còn khi quay lại. Khi pilot, ghi nhận bước nào bị bỏ dở và so trải nghiệm với cách họ dùng AI chat/flashcard hiện tại.

## Cần chốt trước khi biến thành spec

- Nguồn và tập nội dung release cho A1–C2/nhiều chủ đề; rà [schema custom/DB](V1_DATA_MODEL_DRAFT.md) và việc chọn nghĩa trước luyện AI.
- Rubric câu tự viết, biến thể chia từ ở bài điền từ, dung sai lỗi nhỏ và xử lý chấm nhầm; lowercase/contraction đã được chọn.
- Auth provider, ngoại lệ session/logout qua thiết bị; thứ tự implementation Next.js/Flutter và Android/iOS.
- Quota/số lượt AI của trial và Pro, trial một lần mỗi tài khoản hay không, và giá (Free không AI và trial do người dùng tự kích hoạt đã chốt 02/10); tạo một bài có bao gồm quyền chấm sau khi trial hết hay không.
- Theo yêu cầu tiến hóa ngày 02/10: so sánh [schema theo ngôn ngữ](V1_DATA_MODEL_DRAFT.md) và [options toàn hệ thống](SYSTEM_EVOLUTION_OPTIONS_2026-10-02.md); không coi tên cột tiếng Việt ở proposal cũ là schema được chọn. Nghĩa học có ID độc lập với bản giải thích/locale; policy thiếu bản dịch còn mở, chưa thêm ngôn ngữ học mới vào V1.

**Decision này cần Defense Analysis trước khi chốt spec.** Với flow tạo bài và chấm đáp án, hãy bắt đầu bằng các câu hỏi: Nếu bài điền từ có nhiều đáp án hợp lý hoặc một câu tự viết đúng nhưng AI báo sai thì xử lý thế nào? Nếu bấm gửi hai lần thì có tạo hai kết quả không? Nếu mất kết nối khi gửi đáp án thì app hiển thị kết quả nào? Khi quyết định hành vi, dùng [mẫu phân tích](DECISION_ANALYSIS_TEMPLATE.md) để kiểm tra các case còn thiếu.
