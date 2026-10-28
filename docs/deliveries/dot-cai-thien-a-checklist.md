# Checklist test lại đợt cải thiện nhóm A (26/10/2026)

Bản gọn để chủ dự án tự bấm thử. Chi tiết từng bước, dữ liệu mẫu và kiểm tự động: các mục "Đợt cải thiện A — …" cuối
[`giao-dien-nguoi-hoc-test-flow.md`](giao-dien-nguoi-hoc-test-flow.md). Design: [`../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md`](../superpowers/specs/2026-10-26-dot-cai-thien-a-design.md).

Cột **Đã chạy thật** = phiên làm PR đã bấm thử trên máy này ngày 26/10/2026; trống = mới có unit / e2e kiểm, chưa ai bấm tay.

## 0. Chuẩn bị

- [ ] Code `dev` mới nhất có đủ 5 PR (#133–#137, đến commit `fae324d`): `git switch dev`, `git pull`, rồi `pnpm build` ở `apps/api`.
- [ ] API + worker chạy lại từ bản build đó (API cũ đang chạy là bản `0a075ea`, **chưa có PR #137** xác nhận email). Nếu mã không tới Mailpit (log `mail_send_failed`
  `ESOCKET`): đặt `SMTP_HOST=127.0.0.1` trong `apps/api/.env`.
- [ ] App người học `pnpm dev:app` ở `apps/web` (http://localhost:3001/vi/app), Mailpit http://localhost:8025.
- [ ] Dữ liệu: `pnpm learner:setup -- --admin <email> --learner <email>` ở `apps/api` (thêm `--plan pro` khi cần gói Pro).

## 1. Xác nhận email (C13, PR #137)

| # | Làm | Thấy | Đã chạy thật |
|---|---|---|---|
| [ ] 1 | Đăng ký email mới | Sang trang nhập mã, đường dẫn không có email, không hỏi mật khẩu; mở `/vi/app` ở tab khác → về đăng nhập | ✓ |
| [ ] 2 | Lấy mã ở Mailpit, nhập | Sang chọn ngôn ngữ → Hôm nay | ✓ |
| [ ] 3 | Đăng ký email thứ hai, đóng tab ở trang nhập mã; mở tab mới, đăng nhập đúng mật khẩu | Sang trang nhập mã với dòng "Bạn cần xác nhận email…"; có mã mới | ✓ |
| [ ] 4 | Nhập mã mới nhất | Vào app | ✓ |
| [ ] 5 | Đăng nhập email chưa xác nhận **sai** mật khẩu | "Email hoặc mật khẩu chưa đúng.", không sang trang nhập mã | ✓ |
| [ ] 6 | Ở trang nhập mã, F5 | Có thêm ô Mật khẩu | ✓ |
| [ ] 7 | Mở `/vi/app/verify-email` ở tab mới | Ô Email + ô Mật khẩu cạnh ô mã | |
| [ ] 8 | Nhập mã sai | "Mã hoặc mật khẩu không đúng, hoặc mã đã hết hạn…" | |
| [ ] 9 | "Gõ nhầm email? Đăng ký bằng email khác" | Sang trang đăng ký | |
| [ ] 10 | Đăng ký lại bằng email **đã xác nhận** | "Email này đã có tài khoản. Nếu là email của bạn, dùng Quên mật khẩu." | |
| [ ] 11 | Đăng ký lại bằng email **chưa xác nhận**, mật khẩu khác | Sang trang nhập mã như email mới; nhập mã mới → vào app bằng mật khẩu mới | |
| [ ] 12 | Cài đặt | Dòng Email không còn "Chưa xác minh" / nút xác minh | |

## 2. Thêm từ từ trang nhóm (C14, PR #135)

| # | Làm | Thấy | Đã chạy thật |
|---|---|---|---|
| [ ] 1 | Mở một nhóm (ví dụ IT) | Có nút [+ Thêm từ]; điện thoại (390px) có nút + nổi | ✓ |
| [ ] 2 | [+ Thêm từ], chọn một nghĩa của `deploy`, lưu | Chỉ có dòng "Lưu vào nhóm: IT"; toast; tấm đóng; từ hiện trong nhóm | ✓ |
| [ ] 3 | Nhấn N trên trang nhóm | Tấm mở khoá vào IT | ✓ |
| [ ] 4 | Gõ một từ đã có một nghĩa trong nhóm (ví dụ `train`) | Nghĩa đó hiện "Đã có trong nhóm" | ✓ |
| [ ] 5 | "Thêm nhiều từ theo chủ đề" → chủ đề, trình độ → [Xem từ] → [Thêm cả N từ] | Trang chủ đề chọn sẵn IT; thêm vào IT, không tạo nhóm mới | ✓ |
| [ ] 6 | Từ chưa có → Tra bằng AI (Pro) hoặc Tự nhập nghĩa | Vẫn lưu vào IT | |
| [ ] 7 | Về Hôm nay, nhấn N | Tấm thường, có ô chọn nhóm, chọn sẵn IT | |

## 3. Luyện tập (C15, C16 + C2, C3, sửa "Xem đáp án"; PR #133, #134)

Dữ liệu: nhóm IT có `deploy` kèm câu "We deploy the app every Friday." và một từ không kèm câu; tài khoản gói Miễn phí.

| # | Làm | Thấy | Đã chạy thật |
|---|---|---|---|
| [ ] 1 | Tùy chỉnh phiên → Thêm tùy chọn → Thứ tự | Không còn chữ "trước" ở 5 lựa chọn | |
| [ ] 2 | Cùng hộp, gói Miễn phí | Công tắc "Điền từ vào câu bạn đã lưu" bấm được | ✓ |
| [ ] 3 | Bật công tắc, Bắt đầu | Có câu "We ___ the app every Friday."; không nút Báo lỗi, không bản dịch | ✓ |
| [ ] 4 | Ở câu điền từ, "Xem đáp án" **trước** khi gõ | Hiện "Chưa đúng" + đáp án (trước đây báo lỗi) | ✓ |
| [ ] 5 | Trả lời đúng từ đến hạn | [Cần ôn lại] · **[Đã biết, Enter]**; Enter → lên một ngăn | ✓ |
| [ ] 6 | Trả lời đúng từ chưa đến hạn | [Cần ôn lại] · **[Câu tiếp, Enter]**; lịch giữ | ✓ |
| [ ] 7 | Dùng gợi ý rồi trả lời đúng | **[Câu tiếp, Enter]** | |
| [ ] 8 | Trả lời sai | **[Cần ôn lại, Enter]** · [Câu tiếp]; Enter → về ngăn 1 | ✓ |
| [ ] 9 | Giữ Enter lâu ở màn kết quả | Chỉ một lần chấm, một lần sang câu | |
| [ ] 10 | Gói Pro: bật "Kiểu câu có AI" và công tắc mới | Ô "Điền từ" của AI tắt, mờ, có dòng giải thích | |

## 4. Nút loa (C1, PR #136)

| # | Làm | Thấy | Đã chạy thật |
|---|---|---|---|
| [ ] 1 | Trang từ `deploy` | Nút **US** (và **UK** nếu máy có giọng `en-GB`); bấm → nghe | ✓ (chỉ US) |
| [ ] 2 | Câu ví dụ, câu bạn đã lưu | Có nút loa, bấm → nghe câu | ✓ |
| [ ] 3 | Ôn thẻ: bấm loa ở mặt trước, rồi Space | Đọc; thẻ **không** lật | ✓ |
| [ ] 4 | Luyện tập: câu hỏi / sau khi trả lời | Câu hỏi không có loa; sau khi chấm có UK · US | |
| [ ] 5 | Mở bằng **Chrome thật** và **Edge thật** | Có nút **UK** không (giọng Google / "Online (Natural)" qua mạng) | |
| [ ] 6 | Điện thoại Android, iPhone | Có loa, nghe được | |

**Chưa ai kiểm:** giọng UK (máy này chỉ có David, Mark, Zira `en-US`), Chrome và Edge thật, điện thoại.

## 5. Ghi lỗi

Lỗi thấy khi bấm thử: ghi số mục ở trên + điều thấy được; mỗi lỗi sửa bằng PR `fix/` (test lỗi trước). Phiên review nhóm A đang soát code cùng lúc; báo cáo
sẽ ở `docs/superpowers/reviews/2026-10-26-dot-cai-thien-a-code-review.md`.
