# Xử lý kết quả kiểm chứng — v1-specs

**Ngày:** 2026-10-05 · Báo cáo gốc: [verification-opus.md](verification-opus.md) (agent model Opus, 58 phát hiện: 0 blocker, 19 major, 31 minor, 8 nit).
Mức đọc báo cáo: mình đọc toàn bộ phần tóm tắt, bảng phát hiện và phụ lục A–C; các phần "Checks that passed" chỉ đọc lướt.
Dữ liệu (R1–R8) mình **tự chạy lại** (`evidence/verify_data_2026-10-04.py`) và khớp với reviewer; chưa tải lại các nguồn ngoài, chỉ tin phần reviewer đã ghi nguồn chi tiết.

**Nhãn xử lý:** **Sửa** = đã sửa trong spec. **Sửa + nêu** = đã sửa và ghi vào `DECISIONS` mục 9 để chủ dự án xác nhận. **Chấp nhận** = giữ nguyên và ghi là rủi ro đã biết. **Chưa làm** = còn lại.

## Major

| ID | Xử lý | Ở đâu |
|---|---|---|
| F01 browse ẩn từ chức năng | Sửa (theo K11 và DECISIONS §5) | Content CR12, C4 |
| F02 từ chức năng thêm tay có được học không | **Sửa + nêu** (chọn: thêm tay thì học; chỉ chọn tự động loại chúng) | CR10, LR3, PRC20; DECISIONS §9 |
| F03 LR6 trái D20 | Sửa (Practice là bên duy nhất ánh xạ kết quả) | LR6, L23 |
| F04 thứ tự phiên luyện trái K24 | Sửa | PRC20, Q23 |
| F05 giới hạn 5.000 dòng chặn file CEFJ-J | Sửa (tách file soạn và file nguồn) | PR1, PR14, P1, P20, PE1 |
| F06 khóa dòng làm hỏng nghĩa thứ hai | Sửa (xác định sense theo `sense_id` hoặc `context_label`) | PR5, PR9, P24, P25 |
| F07 hoàn tác lô để lại khóa, xóa entry dùng chung | Sửa | PR16, P18, P26 |
| F08 UI không thêm được sense cho entry đã nhập | Sửa | PR6, P15 |
| F09 Octanove có 58 khóa lặp, 21 khác level | Sửa (R46, giữ cả hai level, đánh dấu) | R46, PR3, P27 |
| F10 không ai điều phối `ai.lookup` | Sửa (Content điều phối; tính đơn vị lúc AI trả kết quả) | CR15, ER6, ER17, LR9, L24, E23 |
| F11 retry sau lỗi tạm không bao giờ chạy lại | Sửa (lỗi tạm không lưu làm kết quả cuối) | SR8, AR5, ER5, E10, S15, A21 |
| F12 tạo lại câu dùng chính kết quả cũ | Sửa (ID dẫn xuất `#1`, `#2`) | AR5, PRC5, A22 |
| F13 bài từ câu của người học chấp nhận lemma sai | Sửa (chỉ nhận dạng trong câu; câu không khớp vẫn lưu nhưng đánh dấu) | CR14, C17, PRC4, Q19 |
| F14 ghi dữ liệu sau khi "xóa ngay" | Sửa (trạng thái "đang xóa" chặn mọi request) | IR18, SR11, S17, I25, SE1 |
| F15 OTP không có trần cộng dồn | Sửa (20 lần sai mỗi 24 giờ, R47) | IR4, I28, DA Identity |
| F16 chống dò email ở đăng ký không đứng vững | **Sửa + nêu** (chấp nhận lộ ở đăng ký, vì K7) | IR2, I2, DA; DECISIONS §9 |
| F17 thiếu kiểm chữ ký ID token | Sửa (và sửa R24) | Identity constraint, IR8, I13, R24 |
| F18 hết ngân sách thư | Sửa (ngân sách toàn hệ thống và theo IP, từ chối rõ ràng) | IR19, I27, DA |
| F19 nhãn quyết định bị nâng lên quá mức | Sửa (chân trang mọi spec ghi rõ N7–N13 và F# là gì) + nêu | 8 spec; DECISIONS §9 |

## Minor và nit

| ID | Xử lý | Ở đâu hoặc ghi chú |
|---|---|---|
| F20 bản đồ ghi dữ liệu thiếu và sai | Sửa | system-spec |
| F21 hai nơi giữ công tắc và trần chi | Sửa (Entitlements quyết định lúc giữ chỗ, kể cả câu từ ngân hàng) | ER14, AR10, E22, Q35 |
| F22 ân hạn 10 giây lệch RFC 9700 §4.14.2 | Sửa (giữ như ngoại lệ riêng, mã hóa, hết khi chuỗi bị thu hồi, có log) | IR11, IE14, N2, D13 |
| F23 đổi mật khẩu không đổi chuỗi phiên hiện tại | Sửa | IR14, I20 |
| F24 thiếu thư thông báo | Sửa | IR22, I26 |
| F25 `iat` không chứng minh xác thực lại | Sửa (yêu cầu `prompt` hoặc `max_age`, kiểm `auth_time`) | IR18 |
| F26 vòng đời giữ chỗ và xác nhận muộn | Sửa | ER5, EE3, E21 |
| F27 trần ngày không ràng buộc được | Sửa (tính số đã ôn hôm nay) | LR7, L11, LE11 |
| F28 "thử lại cho đến khi xong" cần cơ chế bền | Sửa (cùng giao dịch DB; "đang xóa" là trạng thái bền) | PRC16, IR18 |
| F29 key trùng khi đang chạy, phạm vi key, tổng thời gian | Sửa; **chưa kiểm** timeout thường gặp của client và proxy | SR8, S16, PRC5 (trần 60 giây) |
| F30 số học thời gian, AE6, AE7 | Sửa | AR3, AE4, AE6, AE7 |
| F31 dịch lỗi, dịch trùng | Sửa | PRC9, Q26 |
| F32 hai yêu cầu nhận cùng một câu (SUSPECTED) | Sửa phòng ngừa | PRC5, Q33 |
| F33 báo lỗi tính lượt của ai | Sửa | PRC18, PRC19, Q20, Q22 |
| F34 xóa từ riêng tư không lan sang Practice | Sửa | PRC28, Q32, Content notes |
| F35 hoa thường, đồng nghĩa, từ riêng tư thiếu POS | Sửa | PRC3, CR13, PR6 |
| F36 quy tắc chia thiếu và thừa | Sửa (nêu khoảng trống đã biết) | PRC7, QE5 |
| F37 biến thể gạch chéo không toàn là chính tả | Sửa (cờ "chấp nhận làm đáp án" theo biến thể) | CR1, CR22, R6 |
| F38 R4=10, D10=154, 97 cặp | Sửa | R2, R4, D10, CE5, P2 |
| F39 không lưu lệnh chạy | Sửa | `evidence/` cạnh research.md |
| F40 R22, R24, R29 sai hoặc quá mạnh | Sửa | research.md |
| F41 RFC 9700 không ràng buộc phiên của app | Sửa (chuyển sang lý do) | Identity constraint |
| F42 chuỗi hiển thị cuối cho tiếng mẹ đẻ khác | **Nêu** | DECISIONS §9; C21 cite ASSUMPTION |
| F43 catalog có từ nhưng sai nghĩa | **Sửa + nêu** ("không phải nghĩa này") | CR15, C13 |
| F44 sửa sense đã publish | **Sửa + nêu** (mọi sửa qua revision) | CR17, C11, PR8 |
| F45 F43 bị ghi đè nhầm | Sửa (F43 gốc và F43b) + nêu | DECISIONS §5, AR2, A23 |
| F46 job zombie, `revision` tùy chọn, tiền tố vô hiệu | Sửa | PR12, PR15, PR5, PE5, P28 |
| F47 nhiều địa chỉ từ một hộp thư | **Chấp nhận** ở pilot, ghi rõ | IR1, ER3, DA Entitlements |
| F48 Defense Analysis thiếu hạng mục | Sửa (05/10): ngoài đường đi bình thường và bất biến, mỗi vùng có thêm nhóm tiến hóa, năng lực và chi phí, đánh đổi, bảng so sánh phương án, runbook, câu hỏi còn mở; Identity bổ sung timeout Google và SMTP | Mục "Bổ sung theo mẫu Defense Analysis" của năm spec |
| F49 thiếu survey đợt 2–3 và bảng kiểm kê | Sửa | survey.md, `citation-sweep.md` |
| F50 trích nhầm nguồn | Sửa các dòng được nêu; còn vài ô có ghi chú trong ngoặc, không tách thành hai nguồn | I11, I13, C18, CE5, C21, L14, Q1, Q14, Q26, A9, A15, SE6 |
| F51 S14 không kiểm thử được; P9 chứa cơ chế | Sửa; ô trích có chú thích trong ngoặc (SE2, I2, A4, C10, EE5) **chấp nhận** | S14, P9 |
| F52 trích nhầm số mục | Sửa | Identity, Entitlements, system-spec |
| F53 ví dụ B2 và 274 | Sửa | P2, CR10 |
| F54 mở rộng nhỏ không nêu | **Nêu** | DECISIONS §9 |
| F55 đổi múi giờ nhảy cửa sổ ngày; trần 2.000 từ mỗi nhóm | **Chấp nhận**, ghi nhận | SE3, LR1 |
| F56 "1 trên 4" là minh họa | Sửa | PRC17 |
| F57 N6 chỉ áp dụng cho catalog | Sửa | AR2, PRC13 |
| F58 nguồn chọn từ chối thay vì gắn Google | Sửa (ghi vào D14) + nêu | decision D14; DECISIONS §9 |

## Cập nhật 05/10/2026
- Chủ dự án chốt hết theo đề xuất (nhóm A và B của `DECISIONS` mục 9). Trần thời gian tạo câu AI hạ từ 60 xuống 45 giây (R48).
- Defense Analysis bổ sung theo mẫu cho năm vùng (F48).

## Còn lại
- Nhiều thay đổi ở trên **chưa được kiểm chứng lần hai**: spec đã sửa chưa được đọc lại độc lập. Mình chỉ chạy lại kiểm tra máy (không trùng ID, mọi tham chiếu trỏ đúng, bảng không lệch cột) trên cả 8 spec.
- Các lựa chọn chủ dự án cần xác nhận nằm ở `DECISIONS_2026-10-04.md` mục 9.

## Tự kiểm chứng sau khi sửa (05/10/2026, không dùng agent)

Đọc lại các quy tắc ở chỗ nối giữa module (SR8, AR3, AR5, ER5, ER6, ER14, ER17, LR6, LR7, LR9, PRC5, PRC9, PRC16, PRC17, PRC20, PR5, PR15, PE6, IR19, CR15) và năm đoạn Defense Analysis mới; tính lại mọi con số trong đó (đều khớp). Tìm thấy và đã sửa:

| # | Loại | Vấn đề | Sửa ở |
|---|---|---|---|
| S1 | Lỗi logic | Practice không nói "chưa tạo được" là thất bại tạm thời hay vĩnh viễn theo SR8, nên gửi lại cùng khóa có thể nhận lại lỗi cũ mãi | PRC5, Q36 |
| S2 | Lỗi logic | Xóa tài khoản lần hai: Defense Analysis nói "trả kết quả như lần một", trái IR18 (mọi request của tài khoản đang xóa bị từ chối) | Identity DA |
| S3 | Lỗi logic | Defense Analysis nói gửi thư "ghi nhận rồi gửi" (bất đồng bộ), nhưng không có hàng đợi cho thư vì worker chỉ dành cho nhập nội dung | Identity DA (gửi đồng bộ, timeout ngắn) |
| S4 | Lỗi logic | Entitlements cần "tiến trình quét giữ chỗ hết hạn mỗi phút", cũng trái quyết định worker | Entitlements DA (tính hết hạn lúc đọc) |
| S5 | Khoảng trống | Dòng CSV không có `sense_id` vẫn ghi đè được bản nháp owner đang sửa; PE6 hứa phát hiện xung đột nhưng PR15 chỉ phủ dòng có `sense_id` | PR5, PE6 |
| S6 | Mơ hồ | Trả lời đúng trắc nghiệm "không đẩy lịch" nhưng không nói Practice có gửi gì sang Learning; ảnh hưởng cách đếm trần ngày | PRC17 |
| S7 | Thiếu | ID của lời gọi dịch câu không được đặt tên | PRC9 (`operation_id#t`) |
| S8 | Rủi ro chưa nêu | Ngân sách thư 1.500 có thể vượt trần thật nếu dùng Gmail cá nhân (500, nguồn thứ cấp); kẻ dùng nhiều IP vẫn làm cạn được ngân sách | IR19, Identity DA |
| S9 | Diễn đạt sai | Đáp án nhiễu lấy từ "9,8 nghìn entry", thực ra chỉ từ sense đã publish (300–500 ở pilot), có thể thiếu ứng viên với loại từ ít gặp | Practice DA |
| S10 | Diễn đạt sai | "tối đa 0,25 lời gọi mỗi giây" là thông lượng **thấp nhất** khi mọi lời gọi chậm | AI DA |

Sau khi sửa: 283 dòng tiêu chí và trường hợp biên, 0 ID trùng, 0 tham chiếu hỏng, 0 bảng lệch cột (script `sweep`).

**Giới hạn của lượt này:** người viết tự đọc lại nên có thể bỏ sót cùng kiểu lỗi đã tạo ra; không đọc lại toàn văn mọi quy tắc không bị đụng tới; tiêu chí mới chưa được đối chiếu với từng tiêu chí cũ.
